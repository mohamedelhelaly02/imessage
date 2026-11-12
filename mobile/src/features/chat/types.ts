export interface IParticipant {
  userId: string;
  displayName: string;
  role: string;
  pictureUrl: string | null;
  lastSeenAtUtc: string | null;
}

export interface IConversation {
  id: string;
  publicId: string;
  conversationType: "Private" | "Group" | string;
  title: string | null;
  createdByUserId: string;
  createdAtUtc: string;
  lastMessageAtUtc: string | null;
  participants: IParticipant[];
}

export interface IUserSummary {
  id: string;
  displayName: string;
  userName: string | null;
  email: string | null;
  pictureUrl: string | null;
  lastSeenAtUtc: string | null;
}

export interface IProfile {
  id: string;
  displayName: string;
  userName: string | null;
  email: string | null;
  profilePictureUrl: string | null;
  lastSeenAtUtc: string | null;
  twoFactorEnabled: boolean;
  recoveryCodesLeft: number;
}

export interface IMessage {
  id: string;
  conversationId: string;
  senderUserId: string;
  senderDisplayName: string;
  type: string;
  text: string | null;
  contentJson: string | null;
  replyToMessageId: string | null;
  isPinned: boolean;
  isForwarded: boolean;
  createdAtUtc: string;
  editedAtUtc: string | null;
  deletedAtUtc: string | null;
  attachments: unknown[];
  reactions: unknown[];
  receipts: unknown[];
}
