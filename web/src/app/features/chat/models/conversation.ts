import { IParticipant } from './participant';

export interface IConversation {
  title: string | null;
  conversationType: string;
  createdAtUtc: string;
  createdByUserId: string;
  publicId: string;
  id: string;
  lastMessageAtUtc: string | null;
  participants: IParticipant[];
}
