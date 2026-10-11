export type Quota = 100 | 1_000 | 5_000 | 10_000 | 20_000 | 50_000 | 100_000;
export type Concurrency = 1 | 2 | 3 | 4;
export type Priority = 0 | 2 | 5 | 6;

export interface RawSearchResponse {
	frameCount?: number;
	quota: Quota;
	quotaUsed: number;
	error: string;
	result?: RawSearchResult[];
}

export interface RawSearchResult {
	anilist: number | RawAnilistInfo;
	filename: string;
	episode: number | string | number[] | null;
	episode_start: number | null;
	episode_end: number | null;
	duration: number;
	from: number;
	at: number;
	to: number;
	similarity: number;
	video: string;
	image: string;
}

export interface RawAnilistInfo {
	id: number;
	idMal: number;
	title: RawAnilistTitle;
	synonyms: string[];
	isAdult: boolean;
}

export interface RawAnilistTitle {
	native: string | null;
	romaji: string;
	english: string | null;
}

export interface RawAPILimitsResponse {
	id: string;
	priority: Priority;
	concurrency: Concurrency;
	quota: Quota;
	quotaUsed: number;
}
