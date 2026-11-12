import * as SecureStore from "expo-secure-store";

const ACCESS_TOKEN_KEY = "access_token";

export const tokenStorage = {
    async getAccessToken(): Promise<string | null> {
        return await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
    },

    async setToken(token: string): Promise<void> {
        await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, token);
    },

    async removeToken(): Promise<void> {
        await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
    },
}
