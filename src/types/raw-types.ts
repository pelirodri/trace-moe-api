export interface RawSearchResponse {
	frameCount?: number;
	error: string;
	result?: RawSearchResult[];
}

export interface RawSearchResult {
    anilist: number | RawAnilistInfo;
    filename: string;
    episode: number | string | number[] | null;
    from: number;
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
    priority: 0 | 2 | 5 | 6;
    concurrency: 1 | 2 | 3 | 4;
    quota: 1000 | 5000 | 10000 | 20000 | 50000 | 100000;
    quotaUsed: number;
}
