import {
	Endpoint,
	MediaSize,
	SearchError,
	type TraceMoeAPIWrapper,
	type TraceMoeAPIWrapperOptions,
	type SearchOptions,
	type SearchResponse,
	type SearchResult,
	type APILimitsResponse,
	type MediaDownloadOptions,
} from "./types/types";

import type { RawSearchResponse, RawAPILimitsResponse } from "./types/raw-types";

import * as utils from "./utils";

import axios, { AxiosError, type AxiosResponse } from "axios";
import fs, { promises as fsPromises } from "fs";
import path from "path";

export const baseURL = "https://api.trace.moe";

const searchEndpoint = baseURL + Endpoint.search;
const meEndpoint = baseURL + Endpoint.me;

/**
 * Creates a wrapper for the trace.moe API with an optional API key.
 * @param options - trace.moe API wrapper options.
 * @returns trace.moe API wrapper.
 */
export function createTraceMoeAPIWrapper(options?: TraceMoeAPIWrapperOptions): TraceMoeAPIWrapper {
	type RawResponse = RawSearchResponse | RawAPILimitsResponse;

	const traceMoeAPI = axios.create({ baseURL, headers: { "Content-Type": "application/x-www-form-urlencoded" } });

	setUpAPIInterceptors(options?.apiKey);

	async function searchForAnimeSceneWithMediaURL(
		mediaURL: string | URL,
		options?: SearchOptions
	): Promise<SearchResponse> {
		if (mediaURL instanceof URL) {
			mediaURL = mediaURL.href;
		}
	
		const endpoint = searchEndpoint + utils.buildQueryStringFromSearchOptions({ ...options }, mediaURL);
		const rawResponse: RawSearchResponse = await makeAPICall(() => traceMoeAPI.get(endpoint));
			
		return Object.freeze(utils.buildSearchResponseFromRawResponse(rawResponse));
	}
	
	async function searchForAnimeSceneWithMediaAtPath(
		mediaPath: string,
		options?: SearchOptions
	): Promise<SearchResponse> {
		const endpoint = searchEndpoint + utils.buildQueryStringFromSearchOptions({ ...options });
		const mediaBuffer = await fsPromises.readFile(mediaPath);
		const rawResponse: RawSearchResponse = await makeAPICall(() => traceMoeAPI.post(endpoint, mediaBuffer));
	
		return Object.freeze(utils.buildSearchResponseFromRawResponse(rawResponse));
	}
	
	async function fetchAPILimits(): Promise<APILimitsResponse> {
		const rawResponse: RawAPILimitsResponse = await makeAPICall(() => traceMoeAPI.get(meEndpoint));

		return Object.freeze({
			id: rawResponse.id,
			priority: rawResponse.priority,
			concurrency: rawResponse.concurrency,
			totalQuota: rawResponse.quota,
			remainingQuota: rawResponse.quota - rawResponse.quotaUsed
		});
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
	
		destinationName = utils.buildFilenameFromResult(result, isVideo, destinationName);
	
		const destinationPath = path.join(destinationDirectory, destinationName);
		const mediaBuffer = Buffer.from((await traceMoeAPI.get(mediaURL, { responseType: "arraybuffer" })).data);
	
		await fsPromises.writeFile(destinationPath, mediaBuffer);
	
		return destinationPath;
	}

	function makeAPICall<R extends RawResponse>(apiCall: () => Promise<AxiosResponse>): Promise<R> {
		return new Promise(async (resolve, reject) => {
			async function makeAPICall() {
				try {
					const response = await apiCall();
					resolve(response.data);
				} catch (error) {	
					if (!(error instanceof AxiosError)) {
						reject(error);
						return;
					}
	
					if (!options?.shouldRetry || error.response?.status !== 429) {
						reject(new Error(error.message));
						return;
					}
	
					setTimeout(async () => {
						makeAPICall();
					}, (error.response!.headers["x-ratelimit-reset"] * 1000) - Date.now());
				}
			}

			makeAPICall();
		});
	}

	function setUpAPIInterceptors(apiKey?: string): void {
		traceMoeAPI.interceptors.request.use(request => {
			if (apiKey) {
				request.headers["x-trace-key"] = apiKey;
			}
	
			return request;
		});
	
		traceMoeAPI.interceptors.response.use(response => response, (error: AxiosError) => {
			if ((error.response?.data as RawSearchResponse)?.error) {
				throw new SearchError((error.response!.data as RawSearchResponse).error, error.response!.status);
			}
	
			if (error.response?.status == 429) {
				throw error;
			}

			throw new Error(error.message);
		});
	}

	return Object.freeze({
		apiKey: options?.apiKey ?? null,
		searchForAnimeSceneWithMediaURL,
		searchForAnimeSceneWithMediaAtPath,
		fetchAPILimits,
		downloadVideoFromResult,
		downloadImageFromResult
	});
}
