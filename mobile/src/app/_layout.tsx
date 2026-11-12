import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";

import { AuthSessionProvider } from "@/features/auth/auth-session";

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <AuthSessionProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(blank)" />
      </Stack>
    </AuthSessionProvider>
  );
}
