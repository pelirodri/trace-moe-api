import { createTraceMoeAPIWrapper, baseURL, } from "../src/trace-moe-api-wrapper";
import { Endpoint, SearchError, MediaSize, type TraceMoeAPIWrapper } from "../src/types/types";

import {
	buildRawSearchResponseMock,
	buildSearchResponseMock,
	buildRawAPILimitsResponseMock,
	buildAPILimitsResponseMock
} from "./utils/response-mock-builders";

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
		traceMoeAPIWrapperWithKey = createTraceMoeAPIWrapper(apiKey);
		traceMoeAPIWrapperWithRetry = createTraceMoeAPIWrapper(null, true);
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
				axiosMockAdapter.onGet(searchGetMatcher).replyOnce(200, buildRawSearchResponseMock());
				await traceMoeAPIWrapper.searchForAnimeSceneWithMediaURL(mediaURL);

				expect((new URL(axiosMockAdapter.history.get[0].url!).search)).toContain(`url=${mediaURL}`);
			});

			test("Filter by AniList ID", async () => {
				const rawSearchResponseMock = buildRawSearchResponseMock();
				const anilistID = rawSearchResponseMock.result![0].anilist as number;

				axiosMockAdapter.onGet(searchGetMatcher).replyOnce(200, rawSearchResponseMock);
				await traceMoeAPIWrapper.searchForAnimeSceneWithMediaURL(mediaURL, { anilistID });

				expect((new URL(axiosMockAdapter.history.get[0].url!).search)).toContain(`anilistID=${anilistID}`);
			});

			test("Cut black borders", async () => {
				axiosMockAdapter.onGet(searchGetMatcher).replyOnce(200, buildRawSearchResponseMock());
				await traceMoeAPIWrapper.searchForAnimeSceneWithMediaURL(mediaURL, { shouldCutBlackBorders: true });

				expect((new URL(axiosMockAdapter.history.get[0].url!).search)).toContain("cutBorders");
			});

			test("Don't include extra AniList info", async () => {
				const searchResponseMock = buildSearchResponseMock();

				axiosMockAdapter.onGet(searchGetMatcher).replyOnce(200, buildRawSearchResponseMock());
				const response = await traceMoeAPIWrapper.searchForAnimeSceneWithMediaURL(mediaURL);

				expect(response).toEqual(searchResponseMock);
			});

			test("Include extra AniList info", async () => {
				const searchResponseMock = buildSearchResponseMock(true);

				axiosMockAdapter.onGet(searchGetMatcher).replyOnce(200, buildRawSearchResponseMock(true));

				const response = await traceMoeAPIWrapper.searchForAnimeSceneWithMediaURL(
					mediaURL,
					{ shouldIncludeExtraAnilistInfo: true }
				);

				expect(response).toEqual(searchResponseMock);
			});

			test("Pass API key in header", async () => {
				axiosMockAdapter.onGet(searchGetMatcher).replyOnce(200, buildRawSearchResponseMock());
				await traceMoeAPIWrapperWithKey.searchForAnimeSceneWithMediaURL(mediaURL);

				const headers = axiosMockAdapter.history.get[0].headers;
				expect(headers).toMatchObject({ "X-Trace-Key": apiKey });
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
				const searchResponseMock = buildSearchResponseMock();
				const xRateLimitResetHeader = { "x-ratelimit-reset": (Date.now() / 1000) + 1 };

				axiosMockAdapter.onGet(searchGetMatcher).replyOnce(429, undefined, xRateLimitResetHeader);
				axiosMockAdapter.onGet(searchGetMatcher).replyOnce(200, buildRawSearchResponseMock());

				const response = await traceMoeAPIWrapperWithRetry.searchForAnimeSceneWithMediaURL(mediaURL);

				expect(response).toEqual(searchResponseMock);
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
				axiosMockAdapter.onPost(searchPostMatcher).replyOnce(200, buildRawSearchResponseMock());
				await traceMoeAPIWrapper.searchForAnimeSceneWithMediaAtPath(mediaPath);

				expect(axiosMockAdapter.history.post[0].data).toEqual(fs.readFileSync(mediaPath));
			});

			test("Filter by AniList ID", async () => {
				const rawSearchResponseMock = buildRawSearchResponseMock();
				const anilistID = rawSearchResponseMock.result![0].anilist as number;

				axiosMockAdapter.onPost(searchPostMatcher).replyOnce(200, rawSearchResponseMock);
				await traceMoeAPIWrapper.searchForAnimeSceneWithMediaAtPath(mediaPath, { anilistID });

				expect((new URL(axiosMockAdapter.history.post[0].url!).search)).toContain(`anilistID=${anilistID}`);
			});

			test("Cut black borders", async () => {
				axiosMockAdapter.onPost(searchPostMatcher).replyOnce(200, buildRawSearchResponseMock());
				await traceMoeAPIWrapper.searchForAnimeSceneWithMediaAtPath(mediaPath, { shouldCutBlackBorders: true });

				expect((new URL(axiosMockAdapter.history.post[0].url!).search)).toContain("cutBorders");
			});

			test("Without extra AniList info", async () => {
				const searchResponseMock = buildSearchResponseMock();

				axiosMockAdapter.onPost(searchPostMatcher).replyOnce(200, buildRawSearchResponseMock());
				const response = await traceMoeAPIWrapper.searchForAnimeSceneWithMediaAtPath(mediaPath)

				expect(response).toEqual(searchResponseMock);
			});

			test("With extra AniList info", async () => {
				const searchResponseMock = buildSearchResponseMock(true);

				axiosMockAdapter.onPost(searchPostMatcher).replyOnce(200, buildRawSearchResponseMock(true));

				const response = await traceMoeAPIWrapper.searchForAnimeSceneWithMediaAtPath(
					mediaPath,
					{ shouldIncludeExtraAnilistInfo: true }
				);

				expect(response).toEqual(searchResponseMock);
			});

			test("Pass correct content type", async () => {
				axiosMockAdapter.onPost(searchPostMatcher).replyOnce(200, buildRawSearchResponseMock());
				await traceMoeAPIWrapper.searchForAnimeSceneWithMediaAtPath(mediaPath);

				const headers = axiosMockAdapter.history.post[0].headers;
				expect(headers).toMatchObject({ "Content-Type": "application/x-www-form-urlencoded" });
			});

			test("Pass API key in header", async () => {
				axiosMockAdapter.onPost(searchPostMatcher).replyOnce(200, buildRawSearchResponseMock());
				await traceMoeAPIWrapperWithKey.searchForAnimeSceneWithMediaAtPath(mediaPath);

				const headers = axiosMockAdapter.history.post[0].headers;
				expect(headers).toMatchObject({ "X-Trace-Key": apiKey });
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
				const searchResponseMock = buildSearchResponseMock();
				const xRateLimitResetHeader = { "x-ratelimit-reset": (Date.now() / 1000) + 1 };

				axiosMockAdapter.onPost(searchPostMatcher).replyOnce(429, undefined, xRateLimitResetHeader);
				axiosMockAdapter.onPost(searchPostMatcher).replyOnce(200, buildRawSearchResponseMock());

				const response = await traceMoeAPIWrapperWithRetry.searchForAnimeSceneWithMediaAtPath(mediaPath);

				expect(response).toEqual(searchResponseMock);
			});
		});
	});

	describe("Fetch API limits", () => {
		test("Without API key", async () => {
			const apiLimitsResponseMock = buildAPILimitsResponseMock();

			axiosMockAdapter.onGet(meEndpoint).replyOnce(200, buildRawAPILimitsResponseMock());
			const response = await traceMoeAPIWrapper.fetchAPILimits();

			expect(response).toEqual(apiLimitsResponseMock);
		});

		test("With API key", async () => {
			const apiLimitsResponseMock = buildAPILimitsResponseMock(traceMoeAPIWrapper.apiKey);

			axiosMockAdapter.onGet(meEndpoint).replyOnce(200, buildRawAPILimitsResponseMock(traceMoeAPIWrapper.apiKey));
			const response = await traceMoeAPIWrapperWithKey.fetchAPILimits();

			expect(response).toEqual(apiLimitsResponseMock);
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
				const resultMock = buildSearchResponseMock().results[0];
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
				const resultMock = buildSearchResponseMock().results[0];
	
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
						buildSearchResponseMock().results[0],
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
				const resultMock = buildSearchResponseMock().results[0];
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
						buildSearchResponseMock().results[0],
						{ size: MediaSize.medium, directory: destinationDirectory, name: destinationName + extension },
					);
		
					expect(response).toBe(destinationPath);
				}
			});
		});
	});
});
