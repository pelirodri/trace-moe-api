import type { SearchResponse, AnilistInfo, APILimitsResponse } from "../../src";
import type { RawSearchResponse, RawAnilistInfo, RawAPILimitsResponse } from "../../src/types/raw-types";

const baseMediaURL = "https://media.trace.moe";

const mediaFilename = "%5BLeopard-Raws%5D%20Gochuumon%20wa%20Usagi%20Desu%20ka%202nd%20-%2001%20RAW%20" +
	"(KBS%201280x720%20x264%20AAC).mp4";

const videoURL = `${baseMediaURL}/video/21034/${mediaFilename}` +
	"?t=290.625&now=1682020800&token=uiNol9dajDX5mzlqnANJQKPBgY";

const imageURL = `${baseMediaURL}/image/21034/${mediaFilename}.jpg` +
	"?t=290.625&now=1682020800&token=HyeNAbd2qC9kx2QgTJfMY5fJ7Y";

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
		frameCount: 5890247,
		error: "",
		result: [
			{
				anilist,
				filename: "[Leopard-Raws] Gochuumon wa Usagi Desu ka 2nd - 01 RAW (KBS 1280x720 x264 AAC).mp4",
				episode: 1,
				from: 288.58,
				to: 292.67,
				similarity: 0.99,
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
		checkedFramesCount: 5890247,
		results: [
			{
				anilistInfo,
				filename: "[Leopard-Raws] Gochuumon wa Usagi Desu ka 2nd - 01 RAW (KBS 1280x720 x264 AAC).mp4",
				episode: 1,
				fromTimestamp: 288.58,
				toTimestamp: 292.67,
				similarityPercentage: 99,
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
	}
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
