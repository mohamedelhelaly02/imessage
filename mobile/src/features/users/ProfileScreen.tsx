import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { logout } from "@/features/auth/auth.service";
import { useAuthSession } from "@/features/auth/auth-session";
import { getProfile } from "@/features/chat/chat.service";
import type { IProfile } from "@/features/chat/types";

export default function ProfileScreen() {
  const { clearAuthState } = useAuthSession();
  const [profile, setProfile] = useState<IProfile | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getProfile()
      .then(setProfile)
      .catch((error: unknown) => {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Unable to load your profile.",
        );
      })
      .finally(() => setIsLoading(false));
  }, []);

  async function handleLogout() {
    await logout();
    clearAuthState();
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to conversations"
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={styles.headerSpacer} />
      </View>

      {isLoading ? (
        <View style={styles.stateContainer}>
          <ActivityIndicator color="#3478F6" size="large" />
        </View>
      ) : errorMessage ? (
        <View style={styles.stateContainer}>
          <Text accessibilityRole="alert" style={styles.errorText}>
            {errorMessage}
          </Text>
          <Pressable onPress={() => router.replace("/(blank)/conversations")}>
            <Text style={styles.link}>Back to conversations</Text>
          </Pressable>
        </View>
      ) : profile ? (
        <View style={styles.content}>
          {profile.profilePictureUrl ? (
            <Image
              source={{ uri: profile.profilePictureUrl }}
              style={styles.avatar}
            />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Text style={styles.avatarInitial}>
                {initials(profile.displayName)}
              </Text>
            </View>
          )}
          <Text style={styles.name}>{profile.displayName}</Text>
          {profile.userName ? (
            <Text style={styles.username}>@{profile.userName}</Text>
          ) : null}

          <View style={styles.detailsCard}>
            <ProfileDetail
              label="Email address"
              value={profile.email || "Not set"}
            />
            <View style={styles.separator} />
            <ProfileDetail
              label="Two-step verification"
              value={profile.twoFactorEnabled ? "Enabled" : "Not enabled"}
            />
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={handleLogout}
            style={({ pressed }) => [
              styles.logoutButton,
              pressed ? styles.pressed : null,
            ]}
          >
            <Text style={styles.logoutText}>Sign out</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

function ProfileDetail({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function initials(value: string) {
  return value
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

const styles = StyleSheet.create({
  screen: { backgroundColor: "#F5F7FB", flex: 1 },
  header: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderBottomColor: "#E8EDF4",
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    minHeight: 58,
    paddingHorizontal: 14,
  },
  backButton: {
    alignItems: "center",
    height: 42,
    justifyContent: "center",
    width: 36,
  },
  backText: { color: "#3478F6", fontSize: 36, lineHeight: 40 },
  headerTitle: {
    color: "#19283E",
    flex: 1,
    fontSize: 17,
    fontWeight: "700",
    textAlign: "center",
  },
  headerSpacer: { width: 36 },
  stateContainer: {
    alignItems: "center",
    flex: 1,
    gap: 14,
    justifyContent: "center",
    padding: 24,
  },
  errorText: { color: "#B42318", fontSize: 14, textAlign: "center" },
  link: { color: "#3478F6", fontSize: 14, fontWeight: "700" },
  content: { alignItems: "center", flex: 1, padding: 24, paddingTop: 42 },
  avatar: {
    backgroundColor: "#EEF4FF",
    borderRadius: 44,
    height: 88,
    width: 88,
  },
  avatarFallback: { alignItems: "center", justifyContent: "center" },
  avatarInitial: { color: "#3478F6", fontSize: 29, fontWeight: "700" },
  name: { color: "#19283E", fontSize: 23, fontWeight: "700", marginTop: 15 },
  username: { color: "#77859A", fontSize: 14, marginTop: 5 },
  detailsCard: {
    alignSelf: "stretch",
    backgroundColor: "#FFFFFF",
    borderColor: "#E6ECF4",
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 32,
    paddingHorizontal: 16,
  },
  detailRow: { gap: 6, paddingVertical: 15 },
  detailLabel: { color: "#77859A", fontSize: 12 },
  detailValue: { color: "#23334B", fontSize: 15, fontWeight: "600" },
  separator: { backgroundColor: "#EDF0F5", height: StyleSheet.hairlineWidth },
  logoutButton: {
    alignItems: "center",
    alignSelf: "stretch",
    backgroundColor: "#FFF5F4",
    borderColor: "#FFD9D5",
    borderRadius: 13,
    borderWidth: 1,
    marginTop: 22,
    paddingVertical: 14,
  },
  logoutText: { color: "#C4332B", fontSize: 14, fontWeight: "700" },
  pressed: { opacity: 0.8 },
});
