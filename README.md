# trace-moe-api

API wrapper for the trace.moe API written in TypeScript.

## Installing

Using yarn:

```bash
$ yarn add trace-moe-api
```

Using npm:

```bash
$ npm i trace-moe-api
```

## TraceMoeAPIWrapper

```typescript
searchForAnimeSceneWithMediaURL(mediaURL: string | URL, options?: SearchOptions): Promise<SearchResponse>;
searchForAnimeSceneWithMediaAtPath(mediaPath: string, options?: SearchOptions): Promise<SearchResponse>;

fetchAPILimits(): Promise<APILimitsResponse>;

downloadVideoFromResult(result: SearchResult, options?: MediaDownloadOptions): Promise<string>;
downloadImageFromResult(result: SearchResult, options?: MediaDownloadOptions): Promise<string>;
```

## Search options

```typescript
interface SearchOptions {
	shouldCutBlackBorders?: boolean;
	anilistID?: number | string;
	shouldIncludeExtraAnilistInfo?: boolean;
}
```

## Media download options

```typescript
interface MediaDownloadOptions {
	size?: MediaSize;
	shouldMute?: boolean;
	minDuration?: number;
	maxDuration?: number;
	directory?: string;
	name?: string;
}
```

## Example

```typescript
import { createTraceMoeAPIWrapper, MediaSize, SearchError } from "trace-moe-api";

const traceMoeAPIWrapper = createTraceMoeAPIWrapper();
// const traceMoeAPIWrapper = createTraceMoeAPIWrapper({ apiKey });

try {
	const apiLimits = await traceMoeAPI.fetchAPILimits();

	if (apiLimits.remainingQuota > 0) {
		const mediaURL = "https://images.plurk.com/32B15UXxymfSMwKGTObY5e.jpg";

		const response = await traceMoeAPIWrapper.searchForAnimeSceneWithMediaURL(mediaURL);
		// const response = await traceMoeAPIWrapper.searchForAnimeSceneWithMediaAtPath(mediaPath);

		if (response.results.length > 0) {
			const result = response.results[0];

			console.log(result.anilistInfo.id);

			const downloadPath = await traceMoeAPIWrapper.downloadVideoFromResult(result, MediaSize.large);
			// const downloadPath = await traceMoeAPIWrapper.downloadImageFromResult(result, MediaSize.large);

			// Do something with `downloadPath`...
		}
	}
} catch (error) {
	if (error instanceof SearchError) {
		// Do something with `error`...
	}
}
```

## Sample responses

### `SearchResponse` object

```typescript
{
    checkedFramesCount: 173362743,
    totalQuota: 100,
    remainingQuota: 90,
    results: [] // Array of `SearchResult` objects
}
```

### `SearchResult` object without `shouldIncludeExtraAnilistInfo`

```typescript
{
    anilistInfo: { id: 21034 },
    filename: "Gochuumon wa Usagi Desuka2 - 01 (BD 1280x720 x264 AAC).mp4",
    episode: 1,
    episodeStart: 1,
    episodeEnd: 1,
    duration: 1418.0834,
    fromTimestamp: 272.1886,
    atTimestamp: 279.7795,
    toTimestamp: 282.6574,
    similarityPercentage: 99.22,
    videoURL: "Preview video URL",
    imageURL: "Preview image URL"
}
```

### `AnilistInfo` object with `shouldIncludeExtraAnilistInfo`

```typescript
{
    id: 21034,
    malID: 29787,
    synonyms: ["Gochiusa"],
    title: {
        nativeTitle: "ご注文はうさぎですか？？",
        romajiTitle: "Gochuumon wa Usagi desu ka??",
        englishTitle: "Is the Order a Rabbit?? Season 2"
    },
    isNSFWAnime: false
}
```

### `APILimitsResponse` object

```typescript
{
    id: "Either your API key or your IP address",
    priority: 0,
    concurrency: 1,
    totalQuota: 100,
    remainingQuota: 90
}
```

## Links

- [trace.moe API](https://soruly.github.io/trace.moe-api)
- [trace.moe repository](https://github.com/soruly/trace.moe)
- [trace.moe’s creator’s Patreon page](https://www.patreon.com/soruly)
