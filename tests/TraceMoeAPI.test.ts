import { createTraceMoeAPIWrapper, baseURL, } from "../src/trace-moe-api-wrapper";
import { Endpoint, SearchError, MediaSize, type TraceMoeAPIWrapper } from "../src/types/types";

import {
	buildRawSearchResponseSample,
	buildSearchResponseSample,
	buildRawAPILimitsResponseSample,
	buildAPILimitsResponseSample
} from "./utils/response-sample-builders";

import axios from "axios";
import AxiosMockAdapter from "axios-mock-adapter";
import fs from "fs";
import mockFS from "mock-fs";
import path from "path";

const axiosMockAdapter = new AxiosMockAdapter(axios);

describe("TraceMoeAPI", () => {
	const searchEndpoint = baseURL + Endpoint.search;
	const meEndpoint = baseURL + Endpoint.me;

	const apiKey = "xxxxxxxxxxxxxxxxxxxxxxx";

	let traceMoeAPIWrapper: TraceMoeAPIWrapper;
	let traceMoeAPIWrapperWithKey: TraceMoeAPIWrapper;
	let traceMoeAPIWrapperWithRetry: TraceMoeAPIWrapper;

	beforeAll(() => {
		traceMoeAPIWrapper = createTraceMoeAPIWrapper();
		traceMoeAPIWrapperWithKey = createTraceMoeAPIWrapper({ apiKey });
		traceMoeAPIWrapperWithRetry = createTraceMoeAPIWrapper({ shouldRetry: true });
	});

	afterEach(() => {
		axiosMockAdapter.reset();
	});

	describe("Search for anime scene", () => {
		describe("Search for anime scene with media URL", () => {
			const mediaURL = "https://images.plurk.com/32B15UXxymfSMwKGTObY5e.jpg";

			let searchGetMatcher: RegExp;

			beforeAll(() => {
				searchGetMatcher = new RegExp(`${searchEndpoint}\\?.+`);
			});

			test("Pass media URL in query parameters", async () => {
				axiosMockAdapter.onGet(searchGetMatcher).replyOnce(200, buildRawSearchResponseSample());
				await traceMoeAPIWrapper.searchForAnimeSceneWithMediaURL(mediaURL);

				expect((new URL(axiosMockAdapter.history.get[0].url!).search)).toContain(`url=${mediaURL}`);
			});

			test("Filter by AniList ID", async () => {
				const rawSearchResponseSample = buildRawSearchResponseSample();
				const anilistID = rawSearchResponseSample.result![0].anilist as number;

				axiosMockAdapter.onGet(searchGetMatcher).replyOnce(200, rawSearchResponseSample);
				await traceMoeAPIWrapper.searchForAnimeSceneWithMediaURL(mediaURL, { anilistID });

				expect((new URL(axiosMockAdapter.history.get[0].url!).search)).toContain(`anilistID=${anilistID}`);
			});

			test("Cut black borders", async () => {
				axiosMockAdapter.onGet(searchGetMatcher).replyOnce(200, buildRawSearchResponseSample());
				await traceMoeAPIWrapper.searchForAnimeSceneWithMediaURL(mediaURL, { shouldCutBlackBorders: true });

				expect((new URL(axiosMockAdapter.history.get[0].url!).search)).toContain("cutBorders");
			});

			test("Don't include extra AniList info", async () => {
				const expectedSearchResponse = buildSearchResponseSample();

				axiosMockAdapter.onGet(searchGetMatcher).replyOnce(200, buildRawSearchResponseSample());
				const response = await traceMoeAPIWrapper.searchForAnimeSceneWithMediaURL(mediaURL);

				expect(response).toEqual(expectedSearchResponse);
			});

			test("Include extra AniList info", async () => {
				const expectedSearchResponse = buildSearchResponseSample(true);

				axiosMockAdapter.onGet(searchGetMatcher).replyOnce(200, buildRawSearchResponseSample(true));

				const response = await traceMoeAPIWrapper.searchForAnimeSceneWithMediaURL(
					mediaURL,
					{ shouldIncludeExtraAnilistInfo: true }
				);

				expect(response).toEqual(expectedSearchResponse);
			});

			test("Pass API key in header", async () => {
				axiosMockAdapter.onGet(searchGetMatcher).replyOnce(200, buildRawSearchResponseSample());
				await traceMoeAPIWrapperWithKey.searchForAnimeSceneWithMediaURL(mediaURL);

				const headers = axiosMockAdapter.history.get[0].headers;
				expect(headers).toMatchObject({ "x-trace-key": apiKey });
			});

			test("Search error", async () => {
				const errorMessage = "Concurrency limit exceeded";
				const expectedError = new SearchError(errorMessage, 402);

				axiosMockAdapter.onGet(searchGetMatcher).replyOnce(402, { error: errorMessage });
				const promise = traceMoeAPIWrapper.searchForAnimeSceneWithMediaURL(mediaURL);

				await expect(promise).rejects.toThrow(expectedError);
			});

			test("Rate limit without retry", async () => {
				axiosMockAdapter.onGet(searchGetMatcher).replyOnce(429);
				const promise = traceMoeAPIWrapper.searchForAnimeSceneWithMediaURL(mediaURL);

				await expect(promise).rejects.toThrow();
			});

			test("Rate limit with retry", async () => {
				const expectedSearchResponse = buildSearchResponseSample();
				const xRateLimitResetHeader = { "x-ratelimit-reset": (Date.now() / 1000) + 1 };

				axiosMockAdapter.onGet(searchGetMatcher).replyOnce(429, undefined, xRateLimitResetHeader);
				axiosMockAdapter.onGet(searchGetMatcher).replyOnce(200, buildRawSearchResponseSample());

				const response = await traceMoeAPIWrapperWithRetry.searchForAnimeSceneWithMediaURL(mediaURL);

				expect(response).toEqual(expectedSearchResponse);
			});
		});

		describe("Search for anime scene with media path", () => {
			const mediaPath = "test.jpg";

			let searchPostMatcher: RegExp;

			beforeAll(() => {
				searchPostMatcher = new RegExp(`${searchEndpoint}(?:\\?.+)?`);
				mockFS({ [mediaPath]: Buffer.from([8, 6, 7, 5, 3, 0, 9]) });
			});

			afterAll(() => {
				mockFS.restore();
			});

			test("Pass image data in body", async () => {
				axiosMockAdapter.onPost(searchPostMatcher).replyOnce(200, buildRawSearchResponseSample());
				await traceMoeAPIWrapper.searchForAnimeSceneWithMediaAtPath(mediaPath);

				expect(axiosMockAdapter.history.post[0].data).toEqual(fs.readFileSync(mediaPath));
			});

			test("Filter by AniList ID", async () => {
				const rawSearchResponseSample = buildRawSearchResponseSample();
				const anilistID = rawSearchResponseSample.result![0].anilist as number;

				axiosMockAdapter.onPost(searchPostMatcher).replyOnce(200, rawSearchResponseSample);
				await traceMoeAPIWrapper.searchForAnimeSceneWithMediaAtPath(mediaPath, { anilistID });

				expect((new URL(axiosMockAdapter.history.post[0].url!).search)).toContain(`anilistID=${anilistID}`);
			});

			test("Cut black borders", async () => {
				axiosMockAdapter.onPost(searchPostMatcher).replyOnce(200, buildRawSearchResponseSample());
				await traceMoeAPIWrapper.searchForAnimeSceneWithMediaAtPath(mediaPath, { shouldCutBlackBorders: true });

				expect((new URL(axiosMockAdapter.history.post[0].url!).search)).toContain("cutBorders");
			});

			test("Without extra AniList info", async () => {
				const expectedSearchResponse = buildSearchResponseSample();

				axiosMockAdapter.onPost(searchPostMatcher).replyOnce(200, buildRawSearchResponseSample());
				const response = await traceMoeAPIWrapper.searchForAnimeSceneWithMediaAtPath(mediaPath)

				expect(response).toEqual(expectedSearchResponse);
			});

			test("With extra AniList info", async () => {
				const expectedSearchResponse = buildSearchResponseSample(true);

				axiosMockAdapter.onPost(searchPostMatcher).replyOnce(200, buildRawSearchResponseSample(true));

				const response = await traceMoeAPIWrapper.searchForAnimeSceneWithMediaAtPath(
					mediaPath,
					{ shouldIncludeExtraAnilistInfo: true }
				);

				expect(response).toEqual(expectedSearchResponse);
			});

			test("Pass correct content type", async () => {
				axiosMockAdapter.onPost(searchPostMatcher).replyOnce(200, buildRawSearchResponseSample());
				await traceMoeAPIWrapper.searchForAnimeSceneWithMediaAtPath(mediaPath);

				const headers = axiosMockAdapter.history.post[0].headers;
				expect(headers).toMatchObject({ "Content-Type": "application/x-www-form-urlencoded" });
			});

			test("Pass API key in header", async () => {
				axiosMockAdapter.onPost(searchPostMatcher).replyOnce(200, buildRawSearchResponseSample());
				await traceMoeAPIWrapperWithKey.searchForAnimeSceneWithMediaAtPath(mediaPath);

				const headers = axiosMockAdapter.history.post[0].headers;
				expect(headers).toMatchObject({ "x-trace-key": apiKey });
			});

			test("Search error", async () => {
				const errorMessage = "Concurrency limit exceeded";
				const expectedError = new SearchError(errorMessage, 402);

				axiosMockAdapter.onPost(searchPostMatcher).replyOnce(402, { error: errorMessage });
				const promise = traceMoeAPIWrapper.searchForAnimeSceneWithMediaAtPath(mediaPath);
				
				await expect(promise).rejects.toThrow(expectedError);
			});

			test("Rate limit without retry", async () => {
				axiosMockAdapter.onPost(searchPostMatcher).replyOnce(429);
				const promise = traceMoeAPIWrapper.searchForAnimeSceneWithMediaAtPath(mediaPath);

				await expect(promise).rejects.toThrow();
			});

			test("Rate limit with retry", async () => {
				const expectedSearchResponse = buildSearchResponseSample();
				const xRateLimitResetHeader = { "x-ratelimit-reset": (Date.now() / 1000) + 1 };

				axiosMockAdapter.onPost(searchPostMatcher).replyOnce(429, undefined, xRateLimitResetHeader);
				axiosMockAdapter.onPost(searchPostMatcher).replyOnce(200, buildRawSearchResponseSample());

				const response = await traceMoeAPIWrapperWithRetry.searchForAnimeSceneWithMediaAtPath(mediaPath);

				expect(response).toEqual(expectedSearchResponse);
			});
		});
	});

	describe("Fetch API limits", () => {
		test("Without API key", async () => {
			const expectedAPILimitsResponse = buildAPILimitsResponseSample();

			axiosMockAdapter.onGet(meEndpoint).replyOnce(200, buildRawAPILimitsResponseSample());
			const response = await traceMoeAPIWrapper.fetchAPILimits();

			expect(response).toEqual(expectedAPILimitsResponse);
		});

		test("With API key", async () => {
			const expectedAPILimitsResponse = buildAPILimitsResponseSample(traceMoeAPIWrapper.apiKey);

			const rawSearchResponseSample = buildRawAPILimitsResponseSample(traceMoeAPIWrapper.apiKey);
			axiosMockAdapter.onGet(meEndpoint).replyOnce(200, rawSearchResponseSample);
			
			const response = await traceMoeAPIWrapperWithKey.fetchAPILimits();

			expect(response).toEqual(expectedAPILimitsResponse);
		});
	});

	describe("Download media previews", () => {
		const mediaBaseURL = "https://media.trace.moe";

		const destinationDirectory = path.join(__dirname, "media");
		const destinationName = "test";

		let imageGetMatcher: RegExp;
		let videoGetMatcher: RegExp;

		beforeAll(() => {
			imageGetMatcher = new RegExp(`${mediaBaseURL}/image/.+`);
			videoGetMatcher = new RegExp(`${mediaBaseURL}/video/.+`);

			mockFS({ [destinationDirectory]: {} });
		});

		afterAll(() => {
			mockFS.restore();
		});
		
		describe("Videos", () => {
			test("Download", async () => {
				const videoBuffer = Buffer.from([8, 6, 7, 5, 3, 0, 9]);
				const resultMock = buildSearchResponseSample().results[0];
				const mediaSize = MediaSize.medium;
				const destinationPath = path.join(destinationDirectory, destinationName + ".mp4");
	
				axiosMockAdapter.onGet(videoGetMatcher).replyOnce(200, videoBuffer);
	
				const response = await traceMoeAPIWrapper.downloadVideoFromResult(
					resultMock,
					{ size: mediaSize, shouldMute: false, directory: destinationDirectory, name: destinationName }
				);
	
				expect(response).toBe(destinationPath);
				expect(fs.existsSync(destinationPath)).toBeTruthy();
				expect(fs.readFileSync(destinationPath)).toEqual(videoBuffer);
				expect(axiosMockAdapter.history.get[0].url).toEqual(`${resultMock.videoURL}&size=${mediaSize}`);
			});

			test("Request muted", async () => {
				const resultMock = buildSearchResponseSample().results[0];
	
				axiosMockAdapter.onGet(videoGetMatcher).replyOnce(200, Buffer.from([8, 6, 7, 5, 3, 0, 9]));
				await traceMoeAPIWrapper.downloadVideoFromResult(resultMock, { shouldMute: true });
	
				expect((new URL(axiosMockAdapter.history.get[0].url!).search)).toContain("mute");
			});

			describe("Extensions", () => {
				test("Pass a destination name with the '.MP4' extension", async () => {
					await testVideoExtension(".MP4");
				});
	
				test("Pass a destination name with the '.m4a' extension", async () => {
					await testVideoExtension(".m4a");
				});
	
				test("Pass a destination name with the '.M4A' extension", async () => {
					await testVideoExtension(".M4A");
				});
	
				async function testVideoExtension(extension: string): Promise<void> {
					const destinationPath = path.join(destinationDirectory, destinationName + extension);
		
					axiosMockAdapter.onGet(videoGetMatcher).replyOnce(200, Buffer.from([8, 6, 7, 5, 3, 0, 9]));
		
					const response = await traceMoeAPIWrapper.downloadVideoFromResult(
						buildSearchResponseSample().results[0],
						{
							size: MediaSize.medium,
							shouldMute: false,
							directory: destinationDirectory,
							name: destinationName + extension
						}
					);
		
					expect(response).toBe(destinationPath);
				}
			});
		});

		describe("Images", () => {
			test("Download", async () => {
				const imageBuffer = Buffer.from([8, 6, 7, 5, 3, 0, 9]);
				const resultMock = buildSearchResponseSample().results[0];
				const mediaSize = MediaSize.medium;
				const destinationPath = path.join(destinationDirectory, destinationName + ".jpg");
	
				axiosMockAdapter.onGet(imageGetMatcher).replyOnce(200, imageBuffer);
	
				const response = await traceMoeAPIWrapper.downloadImageFromResult(
					resultMock,
					{ size: mediaSize, directory: destinationDirectory, name: destinationName },
				);
	
				expect(response).toBe(destinationPath);
				expect(fs.existsSync(destinationPath)).toBeTruthy();
				expect(fs.readFileSync(destinationPath)).toEqual(imageBuffer);
				expect(axiosMockAdapter.history.get[0].url).toEqual(`${resultMock.imageURL}&size=${mediaSize}`);
			});

			describe("Extensions", () => {
				test("Pass a destination name with the '.JPG' extension", async () => {
					await testImageExtension(".JPG");
				});
	
				test("Pass a destination name with the '.jpeg' extension", async () => {
					await testImageExtension(".jpeg");
				});
	
				test("Pass a destination name with the '.JPEG' extension", async () => {
					await testImageExtension(".JPEG");
				});
	
				async function testImageExtension(extension: string): Promise<void> {
					const destinationPath = path.join(destinationDirectory, destinationName + extension);
		
					axiosMockAdapter.onGet(imageGetMatcher).replyOnce(200, Buffer.from([8, 6, 7, 5, 3, 0, 9]));
		
					const response = await traceMoeAPIWrapper.downloadImageFromResult(
						buildSearchResponseSample().results[0],
						{ size: MediaSize.medium, directory: destinationDirectory, name: destinationName + extension },
					);
		
					expect(response).toBe(destinationPath);
				}
			});
		});
	});
});
