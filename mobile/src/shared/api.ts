import { create } from "axios";
import type { InternalAxiosRequestConfig } from "axios";
import { tokenStorage } from "./token-storage";

let refreshPromise: Promise<string | null> | null = null;

const PUBLIC_AUTH_PATHS = [
    "/auth/login",
    "/auth/register",
    "/auth/verify-otp",
    "/auth/refresh",
];

const baseURL = process.env.EXPO_PUBLIC_API_URL;

if (!baseURL) {
    throw new Error(
        "Missing EXPO_PUBLIC_API_URL in .env.local"
    );
}

export const api = create({
    baseURL,
    withCredentials: true,
    headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
    },
});

api.interceptors.request.use(async (config) => {
    const token = await tokenStorage.getAccessToken();
    const isPublicAuthRequest = PUBLIC_AUTH_PATHS.some((path) => config.url?.includes(path));
    if (token && !isPublicAuthRequest) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

api.interceptors.response.use(
    (response) => response,

    async (error: unknown) => {
        if (!error || typeof error !== "object" || !("response" in error)) {
            return Promise.reject(error);
        }

        const axiosError = error as {
            response?: { status?: number };
            config?: InternalAxiosRequestConfig & { _retry?: boolean };
        };
        const config = axiosError.config;
        const isPublicAuthRequest = PUBLIC_AUTH_PATHS.some((path) => config?.url?.includes(path));

        if (axiosError.response?.status !== 401 || !config || isPublicAuthRequest) {
            return Promise.reject(error);
        }

        if (config._retry) {
            await tokenStorage.removeToken();
            return Promise.reject(error);
        }

        config._retry = true;
        refreshPromise ??= api
            .post<{ token: string }>("/auth/refresh", {})
            .then(async ({ data }) => {
                await tokenStorage.setToken(data.token);
                return data.token;
            })
            .catch(async () => {
                await tokenStorage.removeToken();
                return null;
            })
            .finally(() => {
                refreshPromise = null;
            });

        const token = await refreshPromise;
        if (!token) return Promise.reject(error);

        config.headers.Authorization = `Bearer ${token}`;
        return api(config);
    }
);
