import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { logout } from "@/features/auth/auth.service";
import { useAuthSession } from "@/features/auth/auth-session";
import {
  createPrivateConversation,
  getConversations,
  getProfile,
  getUsers,
} from "../chat.service";
import type { IConversation, IProfile, IUserSummary } from "../types";

export default function ConversationsScreen() {
  const { clearAuthState } = useAuthSession();
  const [conversations, setConversations] = useState<IConversation[]>([]);
  const [profile, setProfile] = useState<IProfile | null>(null);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isPeopleOpen, setIsPeopleOpen] = useState(false);
  const [users, setUsers] = useState<IUserSummary[]>([]);
  const [peopleSearch, setPeopleSearch] = useState("");
  const [isLoadingPeople, setIsLoadingPeople] = useState(false);
  const [startingUserId, setStartingUserId] = useState<string | null>(null);
  const [peopleError, setPeopleError] = useState("");

  const load = useCallback(async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    setErrorMessage("");
    try {
      const [nextConversations, nextProfile] = await Promise.all([
        getConversations(),
        getProfile(),
      ]);
      setConversations(
        nextConversations.sort(
          (left, right) =>
            new Date(right.lastMessageAtUtc ?? right.createdAtUtc).getTime() -
            new Date(left.lastMessageAtUtc ?? left.createdAtUtc).getTime(),
        ),
      );
      setProfile(nextProfile);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to load your conversations.",
      );
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(() => load());
  }, [load]);

  const filteredConversations = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    if (!query) return conversations;

    return conversations.filter((conversation) =>
      conversationName(conversation, profile?.id)
        .toLocaleLowerCase()
        .includes(query),
    );
  }, [conversations, profile?.id, search]);

  const filteredUsers = useMemo(() => {
    const query = peopleSearch.trim().toLocaleLowerCase();
    return users
      .filter((user) => user.id !== profile?.id)
      .filter((user) =>
        `${user.displayName} ${user.userName ?? ""} ${user.email ?? ""}`
          .toLocaleLowerCase()
          .includes(query),
      );
  }, [peopleSearch, profile?.id, users]);

  async function openPeople() {
    setIsPeopleOpen(true);
    setPeopleSearch("");
    setPeopleError("");
    setIsLoadingPeople(true);
    try {
      setUsers(await getUsers());
    } catch (error) {
      setPeopleError(
        error instanceof Error ? error.message : "Unable to load people.",
      );
    } finally {
      setIsLoadingPeople(false);
    }
  }

  async function startConversation(user: IUserSummary) {
    setStartingUserId(user.id);
    setPeopleError("");
    try {
      const conversationId = await createPrivateConversation(user.id);
      const updatedConversations = await getConversations();
      setConversations(updatedConversations);
      const conversation = updatedConversations.find(
        (item) => item.id === conversationId,
      );
      if (!conversation) throw new Error("Could not open the new conversation.");
      setIsPeopleOpen(false);
      router.push({
        pathname: "/(blank)/conversation/[publicId]",
        params: { publicId: conversation.publicId },
      });
    } catch (error) {
      setPeopleError(
        error instanceof Error
          ? error.message
          : "Unable to start this conversation.",
      );
    } finally {
      setStartingUserId(null);
    }
  }

  async function handleLogout() {
    await logout();
    clearAuthState();
  }

  return (
    <View style={styles.screen}>
      <View style={styles.topBar}>
        <View style={styles.brand}>
          <View style={styles.brandMark}>
            <Text style={styles.brandMarkText}>•••</Text>
          </View>
          <Text style={styles.brandName}>iMessage</Text>
        </View>
        <View style={styles.topActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open profile"
            onPress={() => router.push("/(blank)/profile")}
            style={styles.profileButton}
          >
            <Avatar
              name={profile?.displayName ?? "You"}
              pictureUrl={profile?.profilePictureUrl ?? null}
              size={34}
            />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={handleLogout}
            style={styles.logoutButton}
          >
            <Text style={styles.logoutText}>Sign out</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.headingRow}>
          <View>
            <Text style={styles.greeting}>
              {profile?.displayName ? `Hi, ${profile.displayName}` : "Your inbox"}
            </Text>
            <Text style={styles.title}>Messages</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={openPeople}
            style={({ pressed }) => [
              styles.newChatButton,
              pressed ? styles.pressed : null,
            ]}
          >
            <Text style={styles.newChatPlus}>＋</Text>
            <Text style={styles.newChatText}>New chat</Text>
          </Pressable>
        </View>

        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>⌕</Text>
          <TextInput
            accessibilityLabel="Search conversations"
            autoCapitalize="none"
            onChangeText={setSearch}
            placeholder="Search conversations"
            placeholderTextColor="#929DB0"
            returnKeyType="search"
            style={styles.searchInput}
            value={search}
          />
          {search ? (
            <Pressable onPress={() => setSearch("")}>
              <Text style={styles.clearSearch}>×</Text>
            </Pressable>
          ) : null}
        </View>

        {errorMessage ? (
          <View style={styles.errorCard}>
            <Text accessibilityRole="alert" style={styles.errorText}>
              {errorMessage}
            </Text>
            <Pressable onPress={() => void load()} style={styles.retryButton}>
              <Text style={styles.retryText}>Try again</Text>
            </Pressable>
          </View>
        ) : isLoading ? (
          <View style={styles.stateContainer}>
            <ActivityIndicator color="#3478F6" size="large" />
            <Text style={styles.stateText}>Loading your conversations…</Text>
          </View>
        ) : filteredConversations.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Text style={styles.emptyIconText}>•••</Text>
            </View>
            <Text style={styles.emptyKicker}>MESSAGES</Text>
            <Text style={styles.emptyTitle}>
              {search ? "No matching conversations" : "Your conversations start here"}
            </Text>
            <Text style={styles.emptyMessage}>
              {search
                ? "Try another name or clear your search."
                : "Start a conversation and your messages will appear here."}
            </Text>
            {!search ? (
              <Pressable onPress={openPeople} style={styles.emptyAction}>
                <Text style={styles.emptyActionText}>Start a conversation</Text>
              </Pressable>
            ) : null}
          </View>
        ) : (
          <FlatList
            data={filteredConversations}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  setRefreshing(true);
                  void load(false);
                }}
                tintColor="#3478F6"
              />
            }
            renderItem={({ item }) => {
              const participant = item.participants.find(
                (person) => person.userId !== profile?.id,
              );
              const name = conversationName(item, profile?.id);
              return (
                <Pressable
                  accessibilityRole="button"
                  onPress={() =>
                    router.push({
                      pathname: "/(blank)/conversation/[publicId]",
                      params: { publicId: item.publicId },
                    })
                  }
                  style={({ pressed }) => [
                    styles.conversationRow,
                    pressed ? styles.rowPressed : null,
                  ]}
                >
                  <Avatar
                    name={name}
                    pictureUrl={participant?.pictureUrl ?? null}
                    size={54}
                    isGroup={item.conversationType === "Group"}
                  />
                  <View style={styles.conversationInfo}>
                    <View style={styles.conversationTopLine}>
                      <Text numberOfLines={1} style={styles.conversationName}>
                        {name}
                      </Text>
                      <Text style={styles.conversationTime}>
                        {formatTime(item.lastMessageAtUtc ?? item.createdAtUtc)}
                      </Text>
                    </View>
                    <Text numberOfLines={1} style={styles.conversationPreview}>
                      {item.lastMessageAtUtc
                        ? "Open your conversation"
                        : "Say hello to start chatting"}
                    </Text>
                  </View>
                </Pressable>
              );
            }}
          />
        )}
      </View>

      <Modal
        animationType="slide"
        onRequestClose={() => setIsPeopleOpen(false)}
        visible={isPeopleOpen}
      >
        <SafeAreaView edges={["top", "bottom"]} style={styles.modalScreen}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalKicker}>NEW CONVERSATION</Text>
              <Text style={styles.modalTitle}>Choose someone</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close"
              onPress={() => setIsPeopleOpen(false)}
              style={styles.closeButton}
            >
              <Text style={styles.closeText}>×</Text>
            </Pressable>
          </View>
          <View style={styles.searchBox}>
            <Text style={styles.searchIcon}>⌕</Text>
            <TextInput
              accessibilityLabel="Search people"
              autoCapitalize="none"
              onChangeText={setPeopleSearch}
              placeholder="Search name or email"
              placeholderTextColor="#929DB0"
              style={styles.searchInput}
              value={peopleSearch}
            />
          </View>
          {peopleError ? (
            <Text accessibilityRole="alert" style={styles.errorText}>
              {peopleError}
            </Text>
          ) : null}
          {isLoadingPeople ? (
            <View style={styles.stateContainer}>
              <ActivityIndicator color="#3478F6" size="large" />
              <Text style={styles.stateText}>Loading people…</Text>
            </View>
          ) : (
            <FlatList
              data={filteredUsers}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.peopleList}
              ListEmptyComponent={
                <Text style={styles.stateText}>No people match your search.</Text>
              }
              renderItem={({ item }) => (
                <Pressable
                  disabled={startingUserId !== null}
                  onPress={() => void startConversation(item)}
                  style={styles.personRow}
                >
                  <Avatar
                    name={item.displayName}
                    pictureUrl={item.pictureUrl}
                    size={48}
                  />
                  <View style={styles.personInfo}>
                    <Text style={styles.personName}>{item.displayName}</Text>
                    <Text style={styles.personHandle}>
                      {item.userName ? `@${item.userName}` : item.email}
                    </Text>
                  </View>
                  {startingUserId === item.id ? (
                    <ActivityIndicator color="#3478F6" />
                  ) : (
                    <Text style={styles.personAction}>Message</Text>
                  )}
                </Pressable>
              )}
            />
          )}
        </SafeAreaView>
      </Modal>
    </View>
  );
}

function Avatar({
  name,
  pictureUrl,
  size,
  isGroup = false,
}: {
  name: string;
  pictureUrl: string | null;
  size: number;
  isGroup?: boolean;
}) {
  if (pictureUrl) {
    return (
      <Image
        source={{ uri: pictureUrl }}
        style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}
      />
    );
  }

  return (
    <View
      style={[
        styles.avatar,
        styles.avatarFallback,
        isGroup ? styles.groupAvatar : null,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
    >
      <Text style={[styles.avatarInitial, isGroup ? styles.groupInitial : null]}>
        {isGroup ? "•••" : initials(name)}
      </Text>
    </View>
  );
}

function conversationName(conversation: IConversation, currentUserId?: string) {
  if (conversation.conversationType === "Group") return conversation.title || "Group chat";
  return (
    conversation.participants.find((person) => person.userId !== currentUserId)
      ?.displayName || "Conversation"
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

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const now = new Date();
  return date.toDateString() === now.toDateString()
    ? date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
    : date.toLocaleDateString([], { month: "short", day: "numeric" });
}

const styles = StyleSheet.create({
  screen: { backgroundColor: "#F5F7FB", flex: 1 },
  topBar: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderBottomColor: "#E8EDF4",
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 58,
    paddingHorizontal: 18,
  },
  brand: { alignItems: "center", flexDirection: "row", gap: 9 },
  brandMark: {
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    borderRadius: 11,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  brandMarkText: { color: "#0A84FF", fontSize: 11, fontWeight: "800" },
  brandName: { color: "#1C1C1E", fontSize: 17, fontWeight: "700" },
  topActions: { alignItems: "center", flexDirection: "row", gap: 12 },
  profileButton: { borderRadius: 20 },
  logoutButton: { paddingHorizontal: 7, paddingVertical: 8 },
  logoutText: { color: "#6E6E73", fontSize: 13, fontWeight: "600" },
  content: { flex: 1, paddingHorizontal: 16, paddingTop: 23 },
  headingRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 17,
  },
  greeting: { color: "#77859A", fontSize: 12, marginBottom: 3 },
  title: { color: "#19283E", fontSize: 26, fontWeight: "700", letterSpacing: -0.4 },
  newChatButton: {
    alignItems: "center",
    backgroundColor: "#3478F6",
    borderRadius: 12,
    flexDirection: "row",
    gap: 5,
    minHeight: 42,
    paddingHorizontal: 12,
  },
  newChatPlus: { color: "#FFFFFF", fontSize: 20, lineHeight: 22 },
  newChatText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
  pressed: { opacity: 0.82 },
  searchBox: {
    alignItems: "center",
    backgroundColor: "#F1F4F8",
    borderColor: "#E7ECF3",
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    minHeight: 44,
    paddingHorizontal: 12,
  },
  searchIcon: { color: "#8E8E93", fontSize: 23, marginRight: 8 },
  searchInput: { color: "#23334B", flex: 1, fontSize: 14, paddingVertical: 9 },
  clearSearch: { color: "#8E8E93", fontSize: 23, paddingLeft: 8 },
  listContent: { paddingBottom: 20, paddingTop: 12 },
  conversationRow: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 15,
    flexDirection: "row",
    gap: 12,
    marginBottom: 5,
    minHeight: 78,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  rowPressed: { backgroundColor: "#F0F4FA" },
  avatar: { backgroundColor: "#EEF4FF" },
  avatarFallback: { alignItems: "center", justifyContent: "center" },
  avatarInitial: { color: "#3478F6", fontSize: 18, fontWeight: "700" },
  groupAvatar: { backgroundColor: "#E5E5EA" },
  groupInitial: { color: "#8E8E93", fontSize: 14, letterSpacing: 1 },
  conversationInfo: { flex: 1, minWidth: 0 },
  conversationTopLine: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
  },
  conversationName: { color: "#1C1C1E", flex: 1, fontSize: 15, fontWeight: "600" },
  conversationTime: { color: "#8E8E93", fontSize: 11, marginLeft: 8 },
  conversationPreview: { color: "#8E8E93", fontSize: 13 },
  stateContainer: { alignItems: "center", flex: 1, gap: 12, justifyContent: "center" },
  stateText: { color: "#77859A", fontSize: 14, padding: 18, textAlign: "center" },
  errorCard: {
    alignItems: "center",
    backgroundColor: "#FFF5F4",
    borderColor: "#FFD9D5",
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 20,
    padding: 16,
  },
  errorText: { color: "#B42318", fontSize: 13, lineHeight: 19, textAlign: "center" },
  retryButton: { marginTop: 12, padding: 8 },
  retryText: { color: "#3478F6", fontSize: 14, fontWeight: "700" },
  emptyState: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    paddingBottom: 45,
    paddingHorizontal: 20,
  },
  emptyIcon: {
    alignItems: "center",
    backgroundColor: "#EAF2FF",
    borderColor: "#DCE8FC",
    borderRadius: 45,
    borderWidth: 1,
    height: 82,
    justifyContent: "center",
    marginBottom: 18,
    width: 82,
  },
  emptyIconText: { color: "#3478F6", fontSize: 17, fontWeight: "800" },
  emptyKicker: { color: "#3478F6", fontSize: 10, fontWeight: "800", letterSpacing: 2 },
  emptyTitle: {
    color: "#1C2B42",
    fontSize: 21,
    fontWeight: "700",
    marginTop: 9,
    textAlign: "center",
  },
  emptyMessage: { color: "#77859A", fontSize: 14, lineHeight: 21, marginTop: 8, textAlign: "center" },
  emptyAction: {
    backgroundColor: "#3478F6",
    borderRadius: 12,
    marginTop: 22,
    paddingHorizontal: 18,
    paddingVertical: 13,
  },
  emptyActionText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  modalScreen: { backgroundColor: "#F5F7FB", flex: 1, paddingHorizontal: 18, paddingTop: 20 },
  modalHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: 18 },
  modalKicker: { color: "#3478F6", fontSize: 10, fontWeight: "800", letterSpacing: 1.8 },
  modalTitle: { color: "#19283E", fontSize: 24, fontWeight: "700", marginTop: 4 },
  closeButton: { alignItems: "center", backgroundColor: "#E9EEF5", borderRadius: 18, height: 36, justifyContent: "center", width: 36 },
  closeText: { color: "#526176", fontSize: 25, lineHeight: 28 },
  peopleList: { paddingBottom: 24, paddingTop: 12 },
  personRow: { alignItems: "center", backgroundColor: "#FFFFFF", borderRadius: 14, flexDirection: "row", gap: 12, marginBottom: 7, minHeight: 70, padding: 11 },
  personInfo: { flex: 1 },
  personName: { color: "#1C1C1E", fontSize: 14, fontWeight: "700" },
  personHandle: { color: "#8E8E93", fontSize: 12, marginTop: 4 },
  personAction: { color: "#3478F6", fontSize: 12, fontWeight: "700" },
});
