export interface AuthResponse {
  id: string;
  displayName: string;
  email: string;
  userName: string;
  token: string;
}

export interface LoginResponse {
  id: string | null;
  displayName: string | null;
  email: string | null;
  userName: string | null;
  token: string | null;
  requiresTwoFactor: boolean;
}
