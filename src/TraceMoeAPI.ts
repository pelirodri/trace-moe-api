import {
	Endpoint,
	APIError,
	MediaSize,
	type SearchOptions,
	type SearchResponse,
	type SearchResult,
	type AnilistInfo,
	type AnilistTitle,
	type APILimitsResponse,
	type MediaDownloadOptions
} from "./types/types";

import axios, { type AxiosInstance, type AxiosError } from "axios";
import fs, { promises as fsPromises } from "fs";
import path from "path";
import omitBy from "lodash.omitby";
import isUndefined from "lodash.isundefined";

import type { RawSearchResponse, RawSearchResult, RawAnilistInfo, RawAPILimitsResponse } from "./types/raw-types";

export const baseURL = "https://api.trace.moe";

/** trace.moe API wrapper. */
export default class TraceMoeAPI {
	private static readonly searchEndpoint = baseURL + Endpoint.search;
	private static readonly meEndpoint = baseURL + Endpoint.me;

	/** Optional API key you can get from https://www.patreon.com/soruly. */
	public apiKey?: string;

	private readonly traceMoeRequest: AxiosInstance;

	/** @param apiKey - Optional API key you can get from https://www.patreon.com/soruly. */
	constructor(apiKey?: string) {
		this.apiKey = apiKey;

		this.traceMoeRequest = axios.create({
			baseURL: "https://api.trace.moe",
			headers: { "Content-Type": "application/x-www-form-urlencoded" }
		});

		this.setUpInterceptors();
	}

	/**
	 * Fetches info about the detected anime scene from a URL.
	 * @param mediaURL - URL of a media file containing the anime scene.
	 * @param options - Search options.
	 * @returns Search response.
	 */
	async searchForAnimeSceneWithMediaURL(mediaURL: string | URL, options?: SearchOptions): Promise<SearchResponse> {
		if (mediaURL instanceof URL) {
			mediaURL = mediaURL.href;
		}
	
		const endpoint = TraceMoeAPI.searchEndpoint + this.buildQueryStringFromSearchOptions({ ...options }, mediaURL);
		const rawResponse: RawSearchResponse = (await this.traceMoeRequest.get(endpoint)).data;
	
		return this.buildSearchResponseFromRawResponse(rawResponse);
	}
	
	/**
	 * Fetches info about the detected anime scene from a local file path.
	 * @param mediaPath - Path to a local media file containing the anime scene.
	 * @param options - Search options.
	 * @returns Search response.
	 */
	async searchForAnimeSceneWithMediaAtPath(mediaPath: string, options?: SearchOptions): Promise<SearchResponse> {
		const endpoint = TraceMoeAPI.searchEndpoint + this.buildQueryStringFromSearchOptions({ ...options });
		const mediaBuffer = await fsPromises.readFile(mediaPath);
		const rawResponse: RawSearchResponse = (await this.traceMoeRequest.post(endpoint, mediaBuffer)).data;

		return this.buildSearchResponseFromRawResponse(rawResponse);
	}

	/**
	 * Fetches the API limits and quotas related to either your IP or API key.
	 * @returns API limits response.
	 */
	async fetchAPILimits(): Promise<APILimitsResponse> {
		const rawResponse: RawAPILimitsResponse = (await this.traceMoeRequest.get(TraceMoeAPI.meEndpoint)).data;

		return {
			id: rawResponse.id,
			priority: rawResponse.priority,
			concurrency: rawResponse.concurrency,
			totalQuota: rawResponse.quota,
			remainingQuota: rawResponse.quota - rawResponse.quotaUsed
		};
	}

	/**
	 * Saves video preview of the found scene in a result.
	 * @param result - Result obtained from a call to one of the search methods.
	 * @param options - Media download options.
	 * @returns Path to saved file.
	 */
	async downloadVideoFromResult(result: SearchResult, options?: MediaDownloadOptions): Promise<string> {
		const mediaSize = options?.size ?? MediaSize.medium;
		const mediaURL = `${result.videoURL}&size=${mediaSize}${options?.shouldMute ? "&mute" : ""}`;

		return this.downloadMediaFromURL(mediaURL, result, true, options?.directory, options?.name);
	}

	/**
	 * Saves image preview of the found scene in a result.
	 * @param result - Result obtained from a call to one of the search methods.
	 * @param options - Media download options.
	 * @returns Path to saved file.
	 */
	async downloadImageFromResult(result: SearchResult, options?: MediaDownloadOptions): Promise<string> {
		const mediaSize = options?.size ?? MediaSize.medium;
		const mediaURL = `${result.imageURL}&size=${mediaSize}`;

		return this.downloadMediaFromURL(mediaURL, result, false, options?.directory, options?.name);
	}
	
	private buildQueryStringFromSearchOptions(options: SearchOptions, mediaURL?: string): string {
		if (Object.values(options).length === 0 && !mediaURL) {
			return "";
		}

		const queryParams = {
			url: mediaURL,
			cutBorders: options.shouldCutBlackBorders ? null : undefined,
			anilistID: options.anilistID !== undefined ? String(options.anilistID) : undefined,
			anilistInfo: options.shouldIncludeExtraAnilistInfo ? null : undefined
		};
	
		return Object.entries(queryParams)
			.filter(([_, value]) => value !== undefined)
			.reduce(
				(query, [key, value], idx) => query + (idx > 0 ? "&" : "") + key + (value !== null ? '=' + value : ''),
				"?"
		);
	}

	private buildSearchResponseFromRawResponse(rawResponse: RawSearchResponse): SearchResponse {
		const results: SearchResult[] = rawResponse.result!.map(this.buildSearchResultFromRawResult);
		return { checkedFramesCount: rawResponse.frameCount!, results };
	}
	
	private buildSearchResultFromRawResult(rawResult: RawSearchResult): SearchResult {
		const anilistTitle: AnilistTitle | undefined = (rawResult.anilist as RawAnilistInfo).title ? {
			nativeTitle: (rawResult.anilist as RawAnilistInfo).title?.native ?? undefined,
			romajiTitle: (rawResult.anilist as RawAnilistInfo).title?.romaji,
			englishTitle: (rawResult.anilist as RawAnilistInfo).title?.english ?? undefined
		} : undefined;

		const anilistInfo: AnilistInfo = {
			id: typeof rawResult.anilist === "number" ? rawResult.anilist : rawResult.anilist.id,
			malID: (rawResult.anilist as RawAnilistInfo).idMal,
			title: anilistTitle ? omitBy(anilistTitle, isUndefined) as AnilistTitle : undefined,
			synonyms: (rawResult.anilist as RawAnilistInfo).synonyms,
			isNSFWAnime: (rawResult.anilist as RawAnilistInfo).isAdult
		};

		const searchResult: SearchResult = {
			anilistInfo: omitBy(anilistInfo, isUndefined) as AnilistInfo,
			filename: rawResult.filename,
			episode: rawResult.episode ?? undefined,
			fromTimestamp: rawResult.from,
			toTimestamp: rawResult.to,
			similarityPercentage: roundNumberToPrecision(rawResult.similarity * 100, 3),
			videoURL: rawResult.video,
			imageURL: rawResult.image
		};

		return omitBy(searchResult, isUndefined) as SearchResult;
	}

	private async downloadMediaFromURL(
		mediaURL: string,
		result: SearchResult,
		isVideo: boolean,
		destinationDirectory = ".",
		destinationName: string | undefined
	): Promise<string> {
		if (!fs.existsSync(destinationDirectory)) {
			await fsPromises.mkdir(destinationDirectory, { recursive: true });
		}

		destinationName = this.buildFilenameFromResult(result, isVideo, destinationName);

		const destinationPath = path.join(destinationDirectory, destinationName);
		const mediaBuffer = Buffer.from((await axios.get(mediaURL, { responseType: "arraybuffer" })).data);

		await fsPromises.writeFile(destinationPath, mediaBuffer);

		return destinationPath;
	}

	private buildFilenameFromResult(result: SearchResult, isVideo: boolean, filename: string | undefined): string {
		const supportedVideoExtensions = [".mp4", ".m4a"];
		const supportedImageExtensions = [".jpg", ".jpeg"];

		if (!filename) {
			const baseName = result.filename.substring(0, result.filename.lastIndexOf("."));
			const extension = isVideo ? supportedVideoExtensions[0] : supportedImageExtensions[0];

			filename = `${baseName}@${(new URL(result.imageURL).searchParams.get("t"))}${extension}`;
		} else {
			const filenameExtension = filename.substring(filename.lastIndexOf(".")).toLowerCase();

			if (isVideo && !supportedVideoExtensions.includes(filenameExtension)) {
				filename += supportedVideoExtensions[0];
			} else if (!isVideo && !supportedImageExtensions.includes(filenameExtension)) {
				filename += supportedImageExtensions[0];
			}
		}

		return filename;
	}

	private setUpInterceptors(): void {
		this.traceMoeRequest.interceptors.request.use(request => {
			if (this.apiKey) {
				request.headers["x-trace-key"] = this.apiKey;
			}

			return request;
		});

		this.traceMoeRequest.interceptors.response.use(response => response, (error: AxiosError) => {
			if ((error.response?.data as RawSearchResponse)?.error) {
				throw new APIError((error.response!.data as RawSearchResponse).error, error.response!.status);
			}

			throw new Error(error.message);
		});
	}
}

function roundNumberToPrecision(number: number, precision: number): number {
	const exponentiatedPrecision = Math.pow(10, precision);
	return Math.round((number + Number.EPSILON) * exponentiatedPrecision) / exponentiatedPrecision;
}
