import { SearchError } from "./types/types";
import type { RawSearchResponse } from "./types/raw-types";

import axios, { type AxiosInstance, type AxiosError } from "axios";

export const baseURL = "https://api.trace.moe";

export function configTraceMoeAPI(apiKey?: string): AxiosInstance {
	const traceMoeAPI = axios.create({ baseURL, headers: { "Content-Type": "application/x-www-form-urlencoded" } });

	traceMoeAPI.interceptors.request.use(request => {
		if (apiKey) {
			request.headers["x-trace-key"] = apiKey;
		}

		return request;
	});

	traceMoeAPI.interceptors.response.use(response => response, (error: AxiosError) => {
		if ((error.response?.data as RawSearchResponse)?.error) {
			throw new SearchError((error.response!.data as RawSearchResponse).error, error.response!.status);
		}

		if (error.response?.status == 429) {
			throw error;
		}

		throw new Error(error.message);
	});

	return traceMoeAPI;
}
