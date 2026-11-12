import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { verifyEmailOtp } from "../auth.service";

export default function VerifyOtpScreen() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const [code, setCode] = useState("");
  const [requestError, setRequestError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerified, setIsVerified] = useState(false);

  async function handleVerify() {
    const normalizedCode = code.replace(/\D/g, "").slice(0, 6);
    setRequestError("");

    if (!email) {
      setRequestError("We couldn’t find the email address for this account.");
      return;
    }

    if (!/^\d{6}$/.test(normalizedCode)) {
      setRequestError("Enter the 6-digit code sent to your email.");
      return;
    }

    setIsSubmitting(true);
    try {
      await verifyEmailOtp({ email, code: normalizedCode });
      setIsVerified(true);
    } catch (error) {
      setRequestError(
        error instanceof Error
          ? error.message
          : "Email verification failed. Please try again.",
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
            <Text style={styles.brandMarkText}>•••</Text>
          </View>
          <Text style={styles.eyebrow}>EMAIL VERIFICATION</Text>
          <Text style={styles.title}>
            {isVerified ? "Email confirmed" : "Check your inbox"}
          </Text>
          <Text style={styles.subtitle}>
            {isVerified
              ? "Your email is verified. You can now sign in to your account."
              : `Enter the 6-digit code we sent to ${email || "your email"}.`}
          </Text>

          {requestError ? (
            <Text accessibilityRole="alert" style={styles.requestError}>
              {requestError}
            </Text>
          ) : null}

          {!isVerified ? (
            <>
              <Text style={styles.label}>Verification code</Text>
              <TextInput
                accessibilityLabel="6-digit verification code"
                autoComplete="one-time-code"
                autoFocus
                autoCapitalize="none"
                keyboardType="number-pad"
                maxLength={6}
                onChangeText={(value) => {
                  setCode(value.replace(/\D/g, "").slice(0, 6));
                  setRequestError("");
                }}
                onSubmitEditing={handleVerify}
                placeholder="000000"
                placeholderTextColor="#8B98AA"
                returnKeyType="done"
                style={styles.codeInput}
                value={code}
              />

              <Pressable
                accessibilityRole="button"
                disabled={isSubmitting}
                onPress={handleVerify}
                style={({ pressed }) => [
                  styles.submitButton,
                  pressed ? styles.buttonPressed : null,
                  isSubmitting ? styles.buttonDisabled : null,
                ]}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitButtonText}>Verify email</Text>
                )}
              </Pressable>

              <Pressable
                accessibilityRole="button"
                disabled={isSubmitting}
                onPress={() => router.replace("/(auth)/register")}
                style={styles.backButton}
              >
                <Text style={styles.backButtonText}>Back to registration</Text>
              </Pressable>
            </>
          ) : (
            <Pressable
              accessibilityRole="button"
              onPress={() => router.replace("/(auth)/login")}
              style={styles.submitButton}
            >
              <Text style={styles.submitButtonText}>Continue to sign in</Text>
            </Pressable>
          )}
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
    elevation: 5,
    maxWidth: 480,
    padding: 26,
    shadowColor: "#27426A",
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.09,
    shadowRadius: 28,
    width: "100%",
  },
  brandMark: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: "#3478F6",
    borderBottomLeftRadius: 7,
    borderBottomRightRadius: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: 48,
    justifyContent: "center",
    marginBottom: 14,
    width: 48,
  },
  brandMarkText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
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
  },
  codeInput: {
    backgroundColor: "#FBFCFE",
    borderColor: "#DCE4EF",
    borderRadius: 13,
    borderWidth: 1,
    color: "#14233B",
    fontSize: 24,
    fontWeight: "700",
    height: 60,
    letterSpacing: 10,
    paddingHorizontal: 15,
    textAlign: "center",
  },
  requestError: {
    backgroundColor: "#FFF1F0",
    borderRadius: 10,
    color: "#B42318",
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 16,
    padding: 12,
  },
  submitButton: {
    alignItems: "center",
    backgroundColor: "#147EFB",
    borderRadius: 14,
    height: 54,
    justifyContent: "center",
    marginTop: 24,
  },
  buttonPressed: { opacity: 0.82 },
  buttonDisabled: { opacity: 0.65 },
  submitButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  backButton: { alignItems: "center", marginTop: 20, padding: 8 },
  backButtonText: { color: "#2563EB", fontSize: 14, fontWeight: "600" },
});
