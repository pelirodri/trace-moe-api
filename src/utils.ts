import type { SearchOptions, SearchResponse, SearchResult, AnilistInfo, AnilistTitle } from "./types/types";
import type { RawSearchResponse, RawAPILimitsResponse, RawSearchResult, RawAnilistInfo } from "./types/raw-types";

import omitBy from "lodash.omitby";
import isUndefined from "lodash.isundefined";
import { AxiosError, type AxiosResponse } from "axios";

export async function makeAPICall<R extends RawSearchResponse | RawAPILimitsResponse>(
	apiCall: () => Promise<AxiosResponse<R>>,
	shouldRetry?: boolean
): Promise<R> {
	try {
		return (await apiCall()).data;
	} catch (error) {
		if (!(error instanceof AxiosError)) {
			throw error;
		}

		if (!shouldRetry || error.response?.status !== 429) {
			throw new Error(error.message);
		}

		const resetTimestamp = error.response!.headers["x-ratelimit-reset"] * 1_000;
		const retryDelay = resetTimestamp - Date.now();

		await new Promise(resolve => setTimeout(resolve, retryDelay));

		return makeAPICall(apiCall, shouldRetry);
	}
}

export function buildQueryStringFromSearchOptions(options: SearchOptions, mediaURL?: string): string {
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
			(query, [key, value], idx) => query + (idx > 0 ? "&" : "") + key + (value !== null ? "=" + value : ""),
			"?"
		);
}

export function buildSearchResponseFromRawResponse(rawResponse: RawSearchResponse): SearchResponse {
	const results: SearchResult[] = rawResponse.result!.map(buildSearchResultFromRawResult);
	return { checkedFramesCount: rawResponse.frameCount!, results };
}

export function buildSearchResultFromRawResult(rawResult: RawSearchResult): SearchResult {
	const anilistTitle: AnilistTitle | undefined = (rawResult.anilist as RawAnilistInfo).title
		? {
				nativeTitle: (rawResult.anilist as RawAnilistInfo).title?.native ?? undefined,
				romajiTitle: (rawResult.anilist as RawAnilistInfo).title?.romaji,
				englishTitle: (rawResult.anilist as RawAnilistInfo).title?.english ?? undefined
		  }
		: undefined;

	const anilistInfo: AnilistInfo = {
		id: typeof rawResult.anilist === "number" ? rawResult.anilist : rawResult.anilist.id,
		malID: (rawResult.anilist as RawAnilistInfo).idMal,
		title: anilistTitle ? (omitBy(anilistTitle, isUndefined) as AnilistTitle) : undefined,
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

export function buildFilenameFromResult(result: SearchResult, isVideo: boolean, filename: string | undefined): string {
	const supportedVideoExtensions = [".mp4"];
	const supportedImageExtensions = [".jpg", ".jpeg"];

	if (!filename) {
		const baseName = result.filename.substring(0, result.filename.lastIndexOf("."));
		const extension = isVideo ? supportedVideoExtensions[0] : supportedImageExtensions[0];

		filename = `${baseName}@${new URL(result.imageURL).searchParams.get("t")}${extension}`;
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
