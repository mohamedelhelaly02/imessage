import { Stack } from "expo-router";
import { Text, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

function AuthHeader() {
  return (
    <View style={styles.header}>
      <Text style={styles.logo}>iMessage</Text>
      <Text style={styles.subtitle}>Connect with everyone</Text>
    </View>
  );
}

function AuthFooter() {
  return (
    <View style={styles.footer}>
      <Text style={styles.footerText}>
        © 2026 iMessage. All rights reserved.
      </Text>
    </View>
  );
}

export default function AuthLayout() {
  return (
    <SafeAreaView style={styles.container}>
      <AuthHeader />

      <View style={styles.content}>
        <Stack
          screenOptions={{
            headerShown: false,
            animation: "slide_from_right",
          }}
        />
      </View>

      <AuthFooter />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F8FC",
  },
  backButton: {
    paddingVertical: 10,
    paddingRight: 15,
  },
  backText: {
    color: "#147EFB",
    fontSize: 16,
    fontWeight: "600",
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 20,
    alignItems: "center",
  },
  logo: {
    fontSize: 26,
    fontWeight: "700",
    color: "#2563EB",
  },
  subtitle: {
    marginTop: 4,
    fontSize: 13,
    color: "#64748B",
  },
  content: {
    flex: 1,
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    alignItems: "center",
  },
  footerText: {
    fontSize: 12,
    color: "#94A3B8",
  },
});
