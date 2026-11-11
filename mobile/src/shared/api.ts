import axios from "axios";
import { tokenStorage } from "./token-storage";
import { router } from "expo-router";

let isRedirecting = false;

const baseURL = process.env.EXPO_PUBLIC_API_URL;

if (!baseURL) {
    throw new Error(
        "Missing EXPO_PUBLIC_API_URL in .env.local"
    );
}

export const api = axios.create({
    baseURL,
    timeout: 15000,
    headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
    },
});

api.interceptors.request.use((config) => {
    const token = tokenStorage.getAccessToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

api.interceptors.response.use(
    (response) => response,

    async (error) => {
        const status = error.response?.status;
        const url = error.config?.url ?? "";

        const isAuthRequest =
            url.includes("/auth/login") ||
            url.includes("/auth/register");

        if (status === 401 && !isAuthRequest && !isRedirecting) {
            isRedirecting = true;

            try {
                await tokenStorage.removeToken();

                router.replace("/(auth)/login");
            } catch (storageError) {
                console.error("Failed to clear authentication:", storageError);
                isRedirecting = false;
            }
        }

        return Promise.reject(error);
    }
);

export function resetAuthRedirect() {
    isRedirecting = false;
}