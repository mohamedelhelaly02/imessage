export interface DirectoryUser {
  id: string;
  displayName: string;
  userName: string | null;
  email: string | null;
  pictureUrl: string | null;
  lastSeenAtUtc: string | null;
}

export interface UserProfile {
  id: string;
  displayName: string;
  userName: string | null;
  email: string | null;
  profilePictureUrl: string | null;
  lastSeenAtUtc: string | null;
  twoFactorEnabled: boolean;
  recoveryCodesLeft: number;
}

export interface AuthenticatorSetup {
  sharedKey: string;
  authenticatorUri: string;
}
