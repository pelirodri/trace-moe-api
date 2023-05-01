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

## Available methods

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
    directory?: string;
    name?: string;
}
```

## Example

```typescript
import TraceMoeAPI, { MediaSize, APIError as TraceMoeAPIError } from "trace-moe-api";

const traceMoeAPI = new TraceMoeAPI();
// const traceMoeAPI = new TraceMoeAPI(apiKey);

try {
    const apiLimits = await traceMoeAPI.fetchAPILimits();
	
    if (apiLimits.remainingQuota > 0) {
        const mediaURL = "https://images.plurk.com/32B15UXxymfSMwKGTObY5e.jpg";
	
        const response = await traceMoeAPI.searchForAnimeSceneWithMediaURL(mediaURL);
        // const response = await traceMoeAPI.searchForAnimeSceneWithMediaAtPath(mediaPath);

        if (response.results.length > 0) {
            const result = response.results[0];

            console.log(result.anilistInfo.id);

            const downloadPath = await traceMoeAPI.downloadVideoFromResult(result, MediaSize.large);
            // const downloadPath = await traceMoeAPI.downloadImageFromResult(result, MediaSize.large);

            // Do something with `downloadPath`...		
        }
    }
} catch (error) {
    if (error instanceof TraceMoeAPIError) {
        // Do something with `error`...
    }
}
```

## Sample responses

### `SearchResponse` object

```typescript
{
    checkedFramesCount: 5890247,
    results: [] // Array of `SearchResult` objects
}
```

### `SearchResult` object without `shouldIncludeExtraAnilistInfo`

```typescript
{
    anilistInfo: { id: 21034 },
    filename: "[Leopard-Raws] Gochuumon wa Usagi Desu ka 2nd - 01 RAW (KBS 1280x720 x264 AAC).mp4",
    episode: 1,
    fromTimestamp: 288.58,
    toTimestamp: 292.67,
    similarityPercentage: 99,
    videoURL: "Video preview URL",
    imageURL: "Image preview URL"
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
    totalQuota: 1000,
    remainingQuota: 900
}
```

## Links

- [trace.moe API](https://soruly.github.io/trace.moe-api)
- [trace.moe repository](https://github.com/soruly/trace.moe)
- [trace.moe’s creator’s Patreon page](https://www.patreon.com/soruly)
