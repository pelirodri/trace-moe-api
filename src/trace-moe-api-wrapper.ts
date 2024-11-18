import {
	Endpoint,
	MediaSize,
	type TraceMoeAPIWrapper,
	type TraceMoeAPIWrapperOptions,
	type SearchOptions,
	type SearchResponse,
	type SearchResult,
	type APILimitsResponse,
	type MediaDownloadOptions
} from "./types/types";

import type { RawSearchResponse, RawAPILimitsResponse } from "./types/raw-types";
import { configTraceMoeAPI, baseURL } from "./axios.config";
import * as utils from "./utils";

import fs, { promises as fsPromises } from "fs";
import path from "path";

const searchEndpoint = baseURL + Endpoint.search;
const meEndpoint = baseURL + Endpoint.me;

/**
 * Creates a wrapper for the trace.moe API with an optional API key.
 * @param options - trace.moe API wrapper options.
 * @returns trace.moe API wrapper.
 */
export function createTraceMoeAPIWrapper(options?: TraceMoeAPIWrapperOptions): TraceMoeAPIWrapper {
	const traceMoeAPI = configTraceMoeAPI(options?.apiKey);
	const shouldRetry = options?.shouldRetry;

	async function searchForAnimeSceneWithMediaURL(
		mediaURL: string | URL,
		options?: SearchOptions
	): Promise<SearchResponse> {
		if (mediaURL instanceof URL) {
			mediaURL = mediaURL.href;
		}

		const endpoint = searchEndpoint + utils.buildQueryStringFromSearchOptions({ ...options }, mediaURL);
		const apiCall = () => traceMoeAPI.get(endpoint);
		const rawResponse: RawSearchResponse = await utils.makeAPICall(apiCall, shouldRetry);

		return Object.freeze(utils.buildSearchResponseFromRawResponse(rawResponse));
	}

	async function searchForAnimeSceneWithMediaAtPath(
		mediaPath: string,
		options?: SearchOptions
	): Promise<SearchResponse> {
		const endpoint = searchEndpoint + utils.buildQueryStringFromSearchOptions({ ...options });
		const mediaBuffer = await fsPromises.readFile(mediaPath);
		const apiCall = () => traceMoeAPI.post(endpoint, mediaBuffer);
		const rawResponse: RawSearchResponse = await utils.makeAPICall(apiCall, shouldRetry);

		return Object.freeze(utils.buildSearchResponseFromRawResponse(rawResponse));
	}

	async function fetchAPILimits(): Promise<APILimitsResponse> {
		const apiCall = () => traceMoeAPI.get(meEndpoint);
		const rawResponse: RawAPILimitsResponse = await utils.makeAPICall(apiCall, shouldRetry);

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

	return Object.freeze({
		apiKey: options?.apiKey ?? null,
		searchForAnimeSceneWithMediaURL,
		searchForAnimeSceneWithMediaAtPath,
		fetchAPILimits,
		downloadVideoFromResult,
		downloadImageFromResult
	});
}
