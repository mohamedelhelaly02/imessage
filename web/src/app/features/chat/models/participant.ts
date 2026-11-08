export interface IParticipant {
  displayName: string;
  lastSeenAtUtc?: string | null;
  pictureUrl?: string | null;
  role: string;
  userId: string;
}
