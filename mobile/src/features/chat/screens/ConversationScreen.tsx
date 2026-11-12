import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  getConversations,
  getMessages,
  getProfile,
  sendTextMessage,
} from "@/features/chat/chat.service";
import type { IConversation, IMessage, IProfile } from "@/features/chat/types";

export default function ConversationScreen() {
  const { publicId } = useLocalSearchParams<{ publicId: string }>();
  const listRef = useRef<FlatList<IMessage>>(null);
  const [conversation, setConversation] = useState<IConversation | null>(null);
  const [profile, setProfile] = useState<IProfile | null>(null);
  const [messages, setMessages] = useState<IMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const load = useCallback(async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    setErrorMessage("");
    try {
      const [conversations, currentProfile] = await Promise.all([
        getConversations(),
        getProfile(),
      ]);
      const selected = conversations.find((item) => item.publicId === publicId);
      if (!selected) throw new Error("This conversation could not be found.");
      const nextMessages = await getMessages(selected.id);
      setConversation(selected);
      setProfile(currentProfile);
      setMessages(nextMessages);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to load this conversation.",
      );
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [publicId]);

  useEffect(() => {
    void Promise.resolve().then(() => load());
  }, [load]);

  useEffect(() => {
    if (messages.length > 0) {
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: false }));
    }
  }, [messages.length]);

  const otherParticipant = conversation?.participants.find(
    (participant) => participant.userId !== profile?.id,
  );
  const title =
    conversation?.conversationType === "Group"
      ? conversation.title || "Group chat"
      : otherParticipant?.displayName || "Conversation";

  async function handleSend() {
    const text = draft.trim();
    if (!text || !conversation || isSending) return;

    setIsSending(true);
    setErrorMessage("");
    try {
      const message = await sendTextMessage(conversation.id, text);
      setMessages((current) => [...current, message]);
      setDraft("");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to send this message.",
      );
    } finally {
      setIsSending(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 6 : 0}
    >
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to conversations"
          onPress={() => router.replace("/(blank)/conversations")}
          style={styles.backButton}
        >
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        {otherParticipant?.pictureUrl ? (
          <Image source={{ uri: otherParticipant.pictureUrl }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Text style={styles.avatarInitial}>{initials(title)}</Text>
          </View>
        )}
        <View style={styles.headerInfo}>
          <Text numberOfLines={1} style={styles.headerTitle}>{title}</Text>
          <Text style={styles.headerSubtitle}>
            {conversation?.conversationType === "Group"
              ? `${conversation.participants.length} participants`
              : "iMessage conversation"}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Refresh messages"
          onPress={() => {
            setRefreshing(true);
            void load(false);
          }}
          style={styles.refreshButton}
        >
          <Text style={styles.refreshText}>↻</Text>
        </Pressable>
      </View>

      {errorMessage ? (
        <View style={styles.errorBanner}>
          <Text accessibilityRole="alert" style={styles.errorText}>{errorMessage}</Text>
          <Pressable onPress={() => void load()}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : null}

      {isLoading ? (
        <View style={styles.stateContainer}>
          <ActivityIndicator color="#3478F6" size="large" />
          <Text style={styles.stateText}>Loading messages…</Text>
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(message) => message.id}
          contentContainerStyle={[
            styles.messagesContent,
            messages.length === 0 ? styles.emptyMessagesContent : null,
          ]}
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
          ListEmptyComponent={
            <View style={styles.emptyMessages}>
              <View style={styles.emptyBubble}><Text style={styles.emptyBubbleText}>•••</Text></View>
              <Text style={styles.emptyTitle}>Say hello to {title}</Text>
              <Text style={styles.emptyHint}>Your messages are private to this conversation.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const isOwnMessage = item.senderUserId === profile?.id;
            const isDeleted = Boolean(item.deletedAtUtc);
            return (
              <View style={[styles.messageLine, isOwnMessage ? styles.ownLine : null]}>
                <View
                  style={[
                    styles.messageBubble,
                    isOwnMessage ? styles.ownBubble : styles.otherBubble,
                  ]}
                >
                  {!isOwnMessage ? (
                    <Text style={styles.senderName}>{item.senderDisplayName}</Text>
                  ) : null}
                  <Text
                    style={[
                      styles.messageText,
                      isOwnMessage ? styles.ownMessageText : null,
                      isDeleted ? styles.deletedMessageText : null,
                    ]}
                  >
                    {isDeleted ? "This message was deleted" : item.text || "Unsupported message"}
                  </Text>
                  <Text style={[styles.messageTime, isOwnMessage ? styles.ownMessageTime : null]}>
                    {formatTime(item.createdAtUtc)}
                    {item.editedAtUtc && !isDeleted ? " · edited" : ""}
                  </Text>
                </View>
              </View>
            );
          }}
        />
      )}

      <View style={styles.composer}>
        <TextInput
          accessibilityLabel="Write a message"
          editable={!isSending && Boolean(conversation)}
          multiline
          onChangeText={setDraft}
          onSubmitEditing={handleSend}
          placeholder="Message"
          placeholderTextColor="#929DB0"
          style={styles.composerInput}
          value={draft}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Send message"
          disabled={!draft.trim() || isSending || !conversation}
          onPress={handleSend}
          style={({ pressed }) => [
            styles.sendButton,
            !draft.trim() || isSending ? styles.sendButtonDisabled : null,
            pressed ? styles.sendButtonPressed : null,
          ]}
        >
          {isSending ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.sendIcon}>↑</Text>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
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
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

const styles = StyleSheet.create({
  screen: { backgroundColor: "#F8FAFF", flex: 1 },
  header: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderBottomColor: "#E8EDF4",
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 10,
    minHeight: 62,
    paddingHorizontal: 12,
  },
  backButton: { alignItems: "center", height: 42, justifyContent: "center", width: 32 },
  backText: { color: "#3478F6", fontSize: 36, lineHeight: 40 },
  avatar: { backgroundColor: "#EEF4FF", borderRadius: 21, height: 42, width: 42 },
  avatarFallback: { alignItems: "center", justifyContent: "center" },
  avatarInitial: { color: "#3478F6", fontSize: 15, fontWeight: "700" },
  headerInfo: { flex: 1, minWidth: 0 },
  headerTitle: { color: "#1C1C1E", fontSize: 15, fontWeight: "700" },
  headerSubtitle: { color: "#8E8E93", fontSize: 11, marginTop: 3 },
  refreshButton: { alignItems: "center", height: 38, justifyContent: "center", width: 38 },
  refreshText: { color: "#3478F6", fontSize: 25 },
  stateContainer: { alignItems: "center", flex: 1, gap: 12, justifyContent: "center" },
  stateText: { color: "#77859A", fontSize: 14 },
  errorBanner: {
    alignItems: "center",
    backgroundColor: "#FFF5F4",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  errorText: { color: "#B42318", flex: 1, fontSize: 12, marginRight: 8 },
  retryText: { color: "#3478F6", fontSize: 12, fontWeight: "700" },
  messagesContent: { paddingHorizontal: 14, paddingVertical: 18 },
  emptyMessagesContent: { flexGrow: 1, justifyContent: "center" },
  emptyMessages: { alignItems: "center", padding: 22 },
  emptyBubble: {
    alignItems: "center",
    backgroundColor: "#EAF2FF",
    borderRadius: 36,
    height: 72,
    justifyContent: "center",
    marginBottom: 14,
    width: 72,
  },
  emptyBubbleText: { color: "#3478F6", fontSize: 17, fontWeight: "800" },
  emptyTitle: { color: "#1C2B42", fontSize: 17, fontWeight: "700", textAlign: "center" },
  emptyHint: { color: "#77859A", fontSize: 13, lineHeight: 19, marginTop: 7, textAlign: "center" },
  messageLine: { alignItems: "flex-start", marginBottom: 10 },
  ownLine: { alignItems: "flex-end" },
  messageBubble: { borderRadius: 18, maxWidth: "82%", minWidth: 84, paddingHorizontal: 13, paddingTop: 9, paddingBottom: 7 },
  otherBubble: { backgroundColor: "#FFFFFF", borderBottomLeftRadius: 5 },
  ownBubble: { backgroundColor: "#3478F6", borderBottomRightRadius: 5 },
  senderName: { color: "#3478F6", fontSize: 11, fontWeight: "700", marginBottom: 4 },
  messageText: { color: "#23334B", fontSize: 15, lineHeight: 21 },
  ownMessageText: { color: "#FFFFFF" },
  deletedMessageText: { fontStyle: "italic", opacity: 0.7 },
  messageTime: { alignSelf: "flex-end", color: "#929DB0", fontSize: 10, marginTop: 3 },
  ownMessageTime: { color: "#DDE9FF" },
  composer: {
    alignItems: "flex-end",
    backgroundColor: "#FFFFFF",
    borderTopColor: "#E8EDF4",
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 9,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: Platform.OS === "ios" ? 10 : 8,
  },
  composerInput: {
    backgroundColor: "#F1F4F8",
    borderRadius: 20,
    color: "#23334B",
    flex: 1,
    fontSize: 15,
    maxHeight: 110,
    minHeight: 42,
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  sendButton: {
    alignItems: "center",
    backgroundColor: "#3478F6",
    borderRadius: 21,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  sendButtonDisabled: { opacity: 0.45 },
  sendButtonPressed: { opacity: 0.8 },
  sendIcon: { color: "#FFFFFF", fontSize: 25, fontWeight: "700", marginTop: -3 },
});
