import { api } from "@/shared/api";
import { toApiRequestError } from "@/shared/api-error";
import type { IConversation, IMessage, IProfile, IUserSummary } from "./types";

export async function getConversations(): Promise<IConversation[]> {
  try {
    const { data } = await api.get<IConversation[]>("/conversations");
    return data;
  } catch (error: unknown) {
    throw toApiRequestError(error, "Unable to load your conversations.");
  }
}

export async function getProfile(): Promise<IProfile> {
  try {
    const { data } = await api.get<IProfile>("/users/me");
    return data;
  } catch (error: unknown) {
    throw toApiRequestError(error, "Unable to load your profile.");
  }
}

export async function getUsers(): Promise<IUserSummary[]> {
  try {
    const { data } = await api.get<IUserSummary[]>("/users");
    return data;
  } catch (error: unknown) {
    throw toApiRequestError(error, "Unable to load people right now.");
  }
}

export async function createPrivateConversation(userId: string): Promise<string> {
  try {
    const { data } = await api.post<string>("/conversations/private", { userId });
    return data;
  } catch (error: unknown) {
    throw toApiRequestError(error, "Unable to start this conversation.");
  }
}

export async function getMessages(conversationId: string): Promise<IMessage[]> {
  try {
    const { data } = await api.get<IMessage[]>(
      `/conversations/${encodeURIComponent(conversationId)}/messages`,
    );
    return data;
  } catch (error: unknown) {
    throw toApiRequestError(error, "Unable to load messages.");
  }
}

export async function sendTextMessage(
  conversationId: string,
  text: string,
): Promise<IMessage> {
  try {
    const { data } = await api.post<IMessage>(
      `/conversations/${encodeURIComponent(conversationId)}/messages`,
      {
        clientMessageId: createClientMessageId(),
        type: "Text",
        text,
        contentJson: null,
        replyToMessageId: null,
        attachmentUploadIds: [],
      },
    );
    return data;
  } catch (error: unknown) {
    throw toApiRequestError(error, "Unable to send this message.");
  }
}

function createClientMessageId(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    const value = character === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}
