import {
	Endpoint,
	MediaSize,
	APIError,
	type TraceMoeAPIWrapper,
	type SearchOptions,
	type SearchResponse,
	type SearchResult,
	type AnilistInfo,
	type AnilistTitle,
	type APILimitsResponse,
	type MediaDownloadOptions
} from "./types/types";

import type { RawSearchResponse, RawSearchResult, RawAnilistInfo, RawAPILimitsResponse } from "./types/raw-types";

import axios, { type AxiosError } from "axios";
import fs, { promises as fsPromises } from "fs";
import path from "path";
import omitBy from "lodash.omitby";
import isUndefined from "lodash.isundefined";

export const baseURL = "https://api.trace.moe";

const searchEndpoint = baseURL + Endpoint.search;
const meEndpoint = baseURL + Endpoint.me;

/**
 * Creates an API wrapper for trace.moe with an optional API key.
 * @param apiKey - Optional API key you can get from https://www.patreon.com/soruly.
 * @returns trace.moe API wrapper.
 */
export function createTraceMoeAPIWrapper(apiKey: string | null = null): TraceMoeAPIWrapper {
	const traceMoeAPI = axios.create({
		baseURL,
		headers: { "Content-Type": "application/x-www-form-urlencoded" }
	});

	setUpAPIInterceptors(apiKey);

	async function searchForAnimeSceneWithMediaURL(
		mediaURL: string | URL,
		options?: SearchOptions
	): Promise<SearchResponse> {
		if (mediaURL instanceof URL) {
			mediaURL = mediaURL.href;
		}
	
		const endpoint = searchEndpoint + buildQueryStringFromSearchOptions({ ...options }, mediaURL);
		const rawResponse: RawSearchResponse = (await traceMoeAPI!.get(endpoint)).data;
	
		return buildSearchResponseFromRawResponse(rawResponse);
	}
	
	async function searchForAnimeSceneWithMediaAtPath(
		mediaPath: string,
		options?: SearchOptions
	): Promise<SearchResponse> {
		const endpoint = searchEndpoint + buildQueryStringFromSearchOptions({ ...options });
		const mediaBuffer = await fsPromises.readFile(mediaPath);
		const rawResponse: RawSearchResponse = (await traceMoeAPI!.post(endpoint, mediaBuffer)).data;
	
		return buildSearchResponseFromRawResponse(rawResponse);
	}
	
	async function fetchAPILimits(): Promise<APILimitsResponse> {
		const rawResponse: RawAPILimitsResponse = (await traceMoeAPI!.get(meEndpoint)).data;
	
		return {
			id: rawResponse.id,
			priority: rawResponse.priority,
			concurrency: rawResponse.concurrency,
			totalQuota: rawResponse.quota,
			remainingQuota: rawResponse.quota - rawResponse.quotaUsed
		};
	}
	
	async function downloadVideoFromResult(result: SearchResult, options?: MediaDownloadOptions): Promise<string> {
		const mediaSize = options?.size ?? MediaSize.medium;
		const mediaURL = `${result.videoURL}&size=${mediaSize}${options?.shouldMute ? "&mute" : ""}`;
	
		return downloadMediaFromURL(mediaURL, result, true, options?.directory, options?.name);
	}
	
	async function downloadImageFromResult(result: SearchResult, options?: MediaDownloadOptions): Promise<string> {
		const mediaSize = options?.size ?? MediaSize.medium;
		const mediaURL = `${result.imageURL}&size=${mediaSize}`;
	
		return downloadMediaFromURL(mediaURL, result, false, options?.directory, options?.name);
	}

	async function downloadMediaFromURL(
		mediaURL: string,
		result: SearchResult,
		isVideo: boolean,
		destinationDirectory = ".",
		destinationName: string | undefined
	): Promise<string> {
		if (!fs.existsSync(destinationDirectory)) {
			await fsPromises.mkdir(destinationDirectory, { recursive: true });
		}
	
		destinationName = buildFilenameFromResult(result, isVideo, destinationName);
	
		const destinationPath = path.join(destinationDirectory, destinationName);
		const mediaBuffer = Buffer.from((await traceMoeAPI.get(mediaURL, { responseType: "arraybuffer" })).data);
	
		await fsPromises.writeFile(destinationPath, mediaBuffer);
	
		return destinationPath;
	}

	function setUpAPIInterceptors(apiKey: string | null = null): void {
		traceMoeAPI!.interceptors.request.use(request => {
			if (apiKey) {
				console.log("Okay…");
				request.headers["X-Trace-Key"] = apiKey;
			}
	
			return request;
		});
	
		traceMoeAPI!.interceptors.response.use(response => response, (error: AxiosError) => {
			if ((error.response?.data as RawSearchResponse)?.error) {
				throw new APIError((error.response!.data as RawSearchResponse).error, error.response!.status);
			}
	
			throw new Error(error.message);
		});
	}

	return Object.freeze({
		apiKey,
		searchForAnimeSceneWithMediaURL,
		searchForAnimeSceneWithMediaAtPath,
		fetchAPILimits,
		downloadVideoFromResult,
		downloadImageFromResult
	});
}

function buildQueryStringFromSearchOptions(options: SearchOptions, mediaURL?: string): string {
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

function buildSearchResponseFromRawResponse(rawResponse: RawSearchResponse): SearchResponse {
	const results: SearchResult[] = rawResponse.result!.map(buildSearchResultFromRawResult);
	return { checkedFramesCount: rawResponse.frameCount!, results };
}

function buildSearchResultFromRawResult(rawResult: RawSearchResult): SearchResult {
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

function buildFilenameFromResult(result: SearchResult, isVideo: boolean, filename: string | undefined): string {
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

function roundNumberToPrecision(number: number, precision: number): number {
	const exponentiatedPrecision = Math.pow(10, precision);
	return Math.round((number + Number.EPSILON) * exponentiatedPrecision) / exponentiatedPrecision;
}
