import { router } from "expo-router";
import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  TextInput,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { login } from "../auth.service";
import { tokenStorage } from "@/shared/token-storage";
import { resetAuthRedirect } from "@/shared/api";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requestError, setRequestError] = useState("");

  async function handleLogin() {
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    try {
      setIsSubmitting(true);
      const { token, requiresTwoFactor } = await login({
        email: trimmedEmail,
        password: trimmedPassword,
      });

      if (requiresTwoFactor) {
        router.replace("/(auth)/requiresTwoFactor");
        return;
      }

      if (token && !requiresTwoFactor) {
        await tokenStorage.setToken(token);
        resetAuthRedirect();
        router.replace("/(blank)/conversations");
      }
    } catch (error) {
      setRequestError(
        error instanceof Error
          ? error.message
          : "Registration failed. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.keyboardView}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          <View style={styles.brandMark} accessibilityLabel="iMessage">
            <Text style={styles.brandMarkText}>i</Text>
          </View>
          <Text style={styles.eyebrow}>IMESSAGE</Text>
          <Text style={styles.title}>Login in</Text>
          <Text style={styles.subtitle}>
            A few details, then you can start chatting.
          </Text>

          {requestError ? (
            <Text accessibilityRole="alert" style={styles.requestError}>
              {requestError}
            </Text>
          ) : null}

          <Text style={styles.label}>Email</Text>
          <TextInput
            placeholder="mohamed@example.com"
            value={email}
            onChangeText={setEmail}
            style={[styles.input]}
          />

          <Text style={styles.label}>Password</Text>

          <View style={styles.passwordRow}>
            <TextInput
              accessibilityLabel="Password"
              autoCapitalize="none"
              autoComplete="current-password"
              autoCorrect={false}
              placeholder="Enter your password"
              secureTextEntry={!showPassword}
              style={styles.passwordInput}
              value={password}
              onChangeText={setPassword}
              onSubmitEditing={handleLogin}
              returnKeyType="go"
            />

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                showPassword ? "Hide password" : "Show password"
              }
              onPress={() => setShowPassword((value) => !value)}
              style={styles.showButton}
            >
              <Text style={styles.showButtonText}>
                {showPassword ? "Hide" : "Show"}
              </Text>
            </Pressable>
          </View>
          <Pressable
            accessibilityRole="button"
            disabled={isSubmitting}
            onPress={handleLogin}
            style={({ pressed }) => [
              styles.submitButton,
              pressed ? styles.buttonPressed : null,
            ]}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitButtonText}>Login</Text>
            )}
          </Pressable>

          <View style={styles.footer}>
            <Text style={styles.footnote}>Not have account yet? </Text>
            <Pressable onPress={() => router.replace("/(auth)/register")}>
              <Text style={styles.footerLink}>Sign up</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardView: { flex: 1, backgroundColor: "#F5F8FC" },
  scrollContent: { flexGrow: 1, justifyContent: "center", padding: 22 },
  card: {
    alignSelf: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#E6ECF4",
    borderRadius: 28,
    borderWidth: 1,
    maxWidth: 480,
    padding: 26,
    width: "100%",
  },
  brandMark: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: "#147EFB",
    borderRadius: 20,
    height: 48,
    justifyContent: "center",
    marginBottom: 14,
    width: 48,
  },
  brandMarkText: {
    color: "#FFFFFF",
    fontSize: 30,
    fontWeight: "700",
    marginTop: -3,
  },
  eyebrow: {
    color: "#147EFB",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 2,
    textAlign: "center",
  },
  title: {
    color: "#14233B",
    fontSize: 27,
    fontWeight: "700",
    marginTop: 8,
    textAlign: "center",
  },
  subtitle: {
    color: "#69788E",
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 20,
    marginTop: 8,
    textAlign: "center",
  },
  label: {
    color: "#28374E",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
    marginTop: 15,
  },
  input: {
    backgroundColor: "#FBFCFE",
    borderColor: "#DCE4EF",
    borderRadius: 13,
    borderWidth: 1,
    color: "#14233B",
    fontSize: 16,
    height: 54,
    paddingHorizontal: 15,
  },
  passwordRow: {
    alignItems: "center",
    backgroundColor: "#FBFCFE",
    borderColor: "#DCE4EF",
    borderRadius: 13,
    borderWidth: 1,
    flexDirection: "row",
    height: 54,
  },
  passwordInput: {
    color: "#14233B",
    flex: 1,
    fontSize: 16,
    height: "100%",
    paddingHorizontal: 15,
  },
  showButton: { paddingHorizontal: 14, paddingVertical: 10 },
  showButtonText: { color: "#147EFB", fontSize: 13, fontWeight: "700" },
  inputError: { borderColor: "#D14343" },
  fieldError: { color: "#B42318", fontSize: 12, lineHeight: 18, marginTop: 6 },
  requestError: {
    backgroundColor: "#FFF1F0",
    borderRadius: 10,
    color: "#B42318",
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 4,
    padding: 12,
  },
  submitButton: {
    alignItems: "center",
    backgroundColor: "#147EFB",
    borderRadius: 14,
    height: 54,
    justifyContent: "center",
    marginTop: 26,
  },
  buttonPressed: { opacity: 0.82 },
  submitButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  footnote: {
    color: "#7A879A",
    fontSize: 14,
    lineHeight: 18,
    textAlign: "center",
  },
  footerLink: {
    color: "#2563EB",
    fontSize: 14,
    fontWeight: 600,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: "20",
  },
});
