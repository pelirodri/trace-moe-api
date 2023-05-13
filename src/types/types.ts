/** API wrapper for trace.moe. */
export interface TraceMoeAPIWrapper {
	/** Optional API key you can get from https://www.patreon.com/soruly. */
	readonly apiKey: string | null;

	/**
	 * Fetches info about the detected anime scene from a URL.
	 * @param mediaURL - URL of a media file containing the anime scene.
	 * @param options - Search options.
	 * @returns Search response.
	 */
	readonly searchForAnimeSceneWithMediaURL: (
        mediaURL: string | URL,
        options?: SearchOptions
    ) => Promise<SearchResponse>;

	/**
	 * Fetches info about the detected anime scene from a local file path.
	 * @param mediaPath - Path to a local media file containing the anime scene.
	 * @param options - Search options.
	 * @returns Search response.
	 */
	readonly searchForAnimeSceneWithMediaAtPath: (
        mediaPath: string,
        options?: SearchOptions
    ) => Promise<SearchResponse>;

	readonly fetchAPILimits: () => Promise<APILimitsResponse>;

	/**
	 * Saves video preview of the found scene in a result.
	 * @param result - Result obtained from a call to one of the search methods.
	 * @param options - Media download options.
	 * @returns Path to saved file.
	 */
	readonly downloadVideoFromResult: (result: SearchResult, options?: MediaDownloadOptions) => Promise<string>;

	/**
	 * Saves image preview of the found scene in a result.
	 * @param result - Result obtained from a call to one of the search methods.
	 * @param options - Media download options.
	 * @returns Path to saved file.
	 */
	readonly downloadImageFromResult: (result: SearchResult, options?: MediaDownloadOptions) => Promise<string>;	
}

/** Options for searching anime scenes. */
export interface SearchOptions {
    /** Whether the API should attempt to remove black borders before searching for a matching scene. */
    shouldCutBlackBorders?: boolean;
    /** To restrict the search to a specified anime. */
    anilistID?: number | string;
    /** Whether the AnilistInfo object in the SearchResult object should include more than just the ID. */
    shouldIncludeExtraAnilistInfo?: boolean;
}

/** Response returned by one of the search methods. */
export interface SearchResponse {
    /** How many frames were checked. */
    readonly checkedFramesCount: number;
    /** Array with the found results sorted from most similar to least similar. */
    readonly results: SearchResult[];
}

/** Result contained in a SearchResponse object. */
export interface SearchResult {
    /** Only contains `id` if not passing the `shouldIncludeExtraAnilistInfo` option to the search method. */
    readonly anilistInfo: AnilistInfo;
    /** Filename of the video with the detected scene. */
    readonly filename: string;
    /** Episode of the detected scene, if applicable (see https://github.com/soruly/aniep). */
    readonly episode?: number | string | number[];
    /** Starting timestamp in seconds of the video preview for the detected scene. */
    readonly fromTimestamp: number;
    /** Ending timestamp in seconds of the video preview for the detected scene. */
    readonly toTimestamp: number;
    /** How similar the detected scene is to the passed media (0–100). */
    readonly similarityPercentage: number;
    /** Video preview of the detected scene. */
    readonly videoURL: string;
    /** Image preview of the detected scene. */
    readonly imageURL: string;
}

/** AniList info when passing the `shouldIncludeExtraAnilistInfo` option. */
export interface AnilistInfo {
    /** AniList ID. */
    readonly id: number;
    /** MyAnimeList ID. */
    readonly malID?: number;
    /** AniList titles. */
    readonly title?: AnilistTitle;
    /** Other names the anime might be known by. */
    readonly synonyms?: string[];
    /** Whether the anime is "NSFW". */
    readonly isNSFWAnime?: boolean;
}

/** Titles of an anime on AniList when passing the `shouldIncludeExtraAnilistInfo` option. */
export interface AnilistTitle {
    /** Original title. */
    readonly nativeTitle?: string;
    /** Romanized title. */
    readonly romajiTitle: string;
    /** Official English title. */
    readonly englishTitle?: string;
}

/** API limits and quotas related to either your IP address or API key. */
export interface APILimitsResponse {
    /** Your IP address, when not using an API key. */
    readonly id: string;
    /** Defaults to 0; see https://soruly.github.io/trace.moe-api/#/limits. */
    readonly priority: 0 | 2 | 5 | 6;
    /** Defaults to 1 (no parallelism); see https://soruly.github.io/trace.moe-api/#/limits. */
    readonly concurrency: 1 | 2 | 3 | 4;
    /** Defaults to 1,000 requests per month; see https://soruly.github.io/trace.moe-api/#/limits. */
    readonly totalQuota: 1000 | 5000 | 10000 | 20000 | 50000 | 100000;
    /** Total monthly quota minus used quota. */
    readonly remainingQuota: number;
}

/** Options for downloading media previews. */
export interface MediaDownloadOptions {
    /** Size of the preview (image and video). */
    size?: MediaSize;
    /** Muting (video). */
    shouldMute?: boolean;
    /** Destination directory. */
    directory?: string;
    /** Destination name (no extension needed). */
    name?: string;
}

/** Media sizes (defaults to `medium`). */
export enum MediaSize {
    /** Small size. */
    small = "s",
    /** Medium size (default). */
    medium = "m",
    /** Large size. */
    large = "l"
}

/** Error returned by the /search API endpoint. */
export class SearchError extends Error {
    /** HTTP status code of the error. */
	readonly statusCode: number;

    /**
     * @param message - Error message.
     * @param statusCode - HTTP status code of the error.
     */
	constructor(message: string, statusCode: number) {
		super(message);

		this.statusCode = statusCode;
		this.name = this.constructor.name;

		Object.setPrototypeOf(this, new.target.prototype);
	}
}

export enum Endpoint {
	search = "/search",
	me = "/me"
}
