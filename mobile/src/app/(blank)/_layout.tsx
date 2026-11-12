import { Redirect, Stack } from "expo-router";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuthSession } from "@/features/auth/auth-session";

export default function BlankLayout() {
  const { isLoading, isAuthenticated } = useAuthSession();

  if (isLoading) return <SessionLoading />;
  if (!isAuthenticated) return <Redirect href="/(auth)/login" />;

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.container}>
      <Stack screenOptions={{ headerShown: false, animation: "slide_from_right" }}>
        <Stack.Screen name="conversations" />
        <Stack.Screen name="conversation/[publicId]" />
        <Stack.Screen name="profile" />
      </Stack>
    </SafeAreaView>
  );
}

function SessionLoading() {
  return (
    <View style={styles.loading}>
      <ActivityIndicator color="#3478F6" size="large" />
      <Text style={styles.loadingText}>Restoring your session…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: "#F5F7FB", flex: 1 },
  loading: {
    alignItems: "center",
    backgroundColor: "#F5F7FB",
    flex: 1,
    gap: 12,
    justifyContent: "center",
  },
  loadingText: { color: "#78859A", fontSize: 14 },
});
