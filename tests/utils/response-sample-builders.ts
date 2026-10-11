import type { SearchResponse, AnilistInfo, APILimitsResponse } from "../../src";
import type { RawSearchResponse, RawAnilistInfo, RawAPILimitsResponse } from "../../src/types/raw-types";

const baseMediaURL = "https://api.trace.moe";
const mediaFilename = "shfaJjdCPu17Khf1gdzTts4";

const videoURL = `${baseMediaURL}/video/${mediaFilename}`;
const imageURL = `${baseMediaURL}/image/${mediaFilename}`;

export function buildRawSearchResponseSample(shouldIncludeAnilistInfo = false): RawSearchResponse {
	let anilist: number | RawAnilistInfo = 21034;

	if (shouldIncludeAnilistInfo) {
		anilist = {
			id: 21034,
			idMal: 29787,
			synonyms: ["Gochiusa"],
			title: {
				native: "ご注文はうさぎですか？？",
				romaji: "Gochuumon wa Usagi desu ka??",
				english: "Is the Order a Rabbit?? Season 2"
			},
			isAdult: false
		};
	}

	return {
		frameCount: 173362743,
		error: "",
		quota: 100,
		quotaUsed: 0,
		result: [
			{
				anilist,
				filename: "Gochuumon wa Usagi Desuka2 - 01 (BD 1280x720 x264 AAC).mp4",
				episode: 1,
				episode_start: 1,
				episode_end: 1,
				duration: 1418.0834,
				from: 272.1886,
				at: 279.7795,
				to: 282.6574,
				similarity: 0.9922267343483719,
				video: videoURL,
				image: imageURL
			}
		]
	};
}

export function buildSearchResponseSample(shouldIncludeAnilistInfo = false): SearchResponse {
	let anilistInfo: AnilistInfo = { id: 21034 };

	if (shouldIncludeAnilistInfo) {
		anilistInfo = {
			...anilistInfo,
			malID: 29787,
			synonyms: ["Gochiusa"],
			title: {
				nativeTitle: "ご注文はうさぎですか？？",
				romajiTitle: "Gochuumon wa Usagi desu ka??",
				englishTitle: "Is the Order a Rabbit?? Season 2"
			},
			isNSFWAnime: false
		};
	}

	return {
		checkedFramesCount: 173362743,
		totalQuota: 100,
		remainingQuota: 100,
		results: [
			{
				anilistInfo,
				filename: "Gochuumon wa Usagi Desuka2 - 01 (BD 1280x720 x264 AAC).mp4",
				episode: 1,
				episodeStart: 1,
				episodeEnd: 1,
				duration: 1418.0834,
				fromTimestamp: 272.1886,
				atTimestamp: 279.7795,
				toTimestamp: 282.6574,
				similarityPercentage: 99.223,
				videoURL: videoURL,
				imageURL: imageURL
			}
		]
	};
}

export function buildRawAPILimitsResponseSample(apiKey: string | null = null): RawAPILimitsResponse {
	return {
		id: apiKey ?? "127.0.0.1",
		priority: 0,
		concurrency: 1,
		quota: 1000,
		quotaUsed: 100
	};
}

export function buildAPILimitsResponseSample(apiKey: string | null = null): APILimitsResponse {
	return {
		id: apiKey ?? "127.0.0.1",
		priority: 0,
		concurrency: 1,
		totalQuota: 1000,
		remainingQuota: 900
	};
}
