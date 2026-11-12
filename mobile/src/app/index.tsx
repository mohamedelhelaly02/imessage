import { Redirect } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";

import { useAuthSession } from "@/features/auth/auth-session";

export default function Index() {
  const { isLoading, isAuthenticated } = useAuthSession();

  useEffect(() => {
    if (!isLoading) void SplashScreen.hideAsync();
  }, [isLoading]);

  if (isLoading) return null;

  return (
    <Redirect
      href={isAuthenticated ? "/(blank)/conversations" : "/(auth)/welcome"}
    />
  );
}
