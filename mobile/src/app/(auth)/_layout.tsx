import { Redirect, Stack } from "expo-router";
import { ActivityIndicator, Text, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuthSession } from "@/features/auth/auth-session";

export default function AuthLayout() {
  const { isLoading, isAuthenticated } = useAuthSession();

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color="#3478F6" size="large" />
        <Text style={styles.loadingText}>Restoring your session…</Text>
      </View>
    );
  }

  if (isAuthenticated) return <Redirect href="/(blank)/conversations" />;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Stack
          screenOptions={{
            headerShown: false,
            animation: "slide_from_right",
          }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loading: {
    alignItems: "center",
    backgroundColor: "#F5F7FB",
    flex: 1,
    gap: 12,
    justifyContent: "center",
  },
  loadingText: { color: "#78859A", fontSize: 14 },
  container: {
    flex: 1,
    backgroundColor: "#F5F8FC",
  },
  content: {
    flex: 1,
  }
});
