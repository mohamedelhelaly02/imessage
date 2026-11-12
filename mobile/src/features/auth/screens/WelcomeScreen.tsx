import { router } from "expo-router";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function WelcomeScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.hero}>
          <View style={styles.logoTile}>
            <Image
              accessibilityLabel="iMessage logo"
              resizeMode="contain"
              source={require("@/assets/images/imessage-mark.png")}
              style={styles.logo}
            />
          </View>
          <Text style={styles.brand}>iMessage</Text>
          <Text style={styles.title}>Stay close to every conversation.</Text>
          <Text style={styles.description}>
            Message the people who matter, all in one place.
          </Text>
        </View>

        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push("/(auth)/login")}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.buttonPressed,
            ]}
          >
            <Text style={styles.primaryButtonText}>Log in</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push("/(auth)/register")}
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed && styles.buttonPressed,
            ]}
          >
            <Text style={styles.secondaryButtonText}>Create account</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: "#F5F8FC", flex: 1 },
  container: {
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: 28,
    paddingTop: 60,
    paddingBottom: 28,
  },
  hero: { alignItems: "center", flex: 1, justifyContent: "center" },
  logoTile: {
    alignItems: "center",
    backgroundColor: "#3478F6",
    borderRadius: 30,
    height: 112,
    justifyContent: "center",
    marginBottom: 26,
    width: 112,
  },
  logo: { height: 88, width: 88 },
  brand: {
    color: "#3478F6",
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 0.4,
    marginBottom: 18,
  },
  title: {
    color: "#17243A",
    fontSize: 32,
    fontWeight: "700",
    letterSpacing: -0.7,
    lineHeight: 39,
    maxWidth: 340,
    textAlign: "center",
  },
  description: {
    color: "#718098",
    fontSize: 16,
    lineHeight: 24,
    marginTop: 14,
    maxWidth: 300,
    textAlign: "center",
  },
  actions: { gap: 12, width: "100%" },
  primaryButton: {
    alignItems: "center",
    backgroundColor: "#3478F6",
    borderRadius: 16,
    justifyContent: "center",
    minHeight: 58,
  },
  primaryButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  secondaryButton: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#DFE7F2",
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 58,
  },
  secondaryButtonText: { color: "#24344C", fontSize: 16, fontWeight: "700" },
  buttonPressed: { opacity: 0.82 },
});
