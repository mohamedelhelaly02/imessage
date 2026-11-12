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
import { register } from "../auth.service";
import { router } from "expo-router";

type FieldErrors = Partial<
  Record<"displayName" | "email" | "password", string>
>;

const PASSWORD_RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).{8,}$/;
const EMAIL_RULE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RegisterScreen() {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [requestError, setRequestError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleRegister() {
    const errors: FieldErrors = {};
    const trimmedName = displayName.trim();
    const normalizedEmail = email.trim();

    if (!trimmedName) errors.displayName = "Enter your name.";
    else if (trimmedName.length > 100)
      errors.displayName = "Name must be 100 characters or fewer.";
    if (!EMAIL_RULE.test(normalizedEmail))
      errors.email = "Enter a valid email address.";
    if (!PASSWORD_RULE.test(password)) {
      errors.password =
        "Use 8+ characters with uppercase, lowercase, a number, and a symbol.";
    }

    setFieldErrors(errors);
    setRequestError("");
    if (Object.keys(errors).length > 0) return;

    setIsSubmitting(true);
    try {
      await register({
        displayName: trimmedName,
        email: normalizedEmail,
        password,
        clientType: "Mobile",
      });
      router.replace({
        pathname: "/(auth)/verifyOtp",
        params: { email: normalizedEmail },
      });
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
            <Text style={styles.brandMarkText}>•••</Text>
          </View>
          <Text style={styles.eyebrow}>IMESSAGE</Text>
          <Text style={styles.title}>Create your account</Text>
          <Text style={styles.subtitle}>
            A few details, then you can start chatting.
          </Text>

          {requestError ? (
            <Text accessibilityRole="alert" style={styles.requestError}>
              {requestError}
            </Text>
          ) : null}

          <Text style={styles.label}>FullName</Text>
          <TextInput
            accessibilityLabel="Email address"
            autoCapitalize="none"
            autoComplete="name"
            placeholder="Enter a display name"
            value={displayName}
            onChangeText={setDisplayName}
            style={[
              styles.input,
              fieldErrors.displayName ? styles.inputError : null,
            ]}
          />

          <Text style={styles.label}>Email address</Text>
          <TextInput
            accessibilityLabel="Email address"
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor="#8B98AA"
            returnKeyType="next"
            style={[styles.input, fieldErrors.email ? styles.inputError : null]}
            value={email}
          />
          {fieldErrors.email ? (
            <FieldError message={fieldErrors.email} />
          ) : null}

          <Text style={styles.label}>Password</Text>
          <View
            style={[
              styles.passwordRow,
              fieldErrors.password ? styles.inputError : null,
            ]}
          >
            <TextInput
              accessibilityLabel="Password"
              autoCapitalize="none"
              autoComplete="new-password"
              onChangeText={setPassword}
              onSubmitEditing={handleRegister}
              placeholder="Create a strong password"
              placeholderTextColor="#8B98AA"
              returnKeyType="done"
              secureTextEntry={!showPassword}
              style={styles.input}
              value={password}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                showPassword ? "Hide password" : "Show password"
              }
              onPress={() => setShowPassword((visible) => !visible)}
              style={styles.showButton}
            >
              <Text style={styles.showButtonText}>
                {showPassword ? "Hide" : "Show"}
              </Text>
            </Pressable>
          </View>
          {fieldErrors.password ? (
            <FieldError message={fieldErrors.password} />
          ) : null}

          <Pressable
            accessibilityRole="button"
            disabled={isSubmitting}
            onPress={handleRegister}
            style={({ pressed }) => [
              styles.submitButton,
              pressed ? styles.buttonPressed : null,
            ]}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitButtonText}>Create account</Text>
            )}
          </Pressable>

          <View style={styles.footer}>
            <Text style={styles.footnote}>Have an account? </Text>
            <Pressable onPress={() => router.replace("/(auth)/login")}>
              <Text style={styles.footerLink}>Sign in</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function FieldError({ message }: { message: string }) {
  return <Text style={styles.fieldError}>{message}</Text>;
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
