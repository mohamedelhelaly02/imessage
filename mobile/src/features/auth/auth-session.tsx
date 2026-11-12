import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import { tokenStorage } from "@/shared/token-storage";
import { AuthResponse, User } from "./types";
import { refresh } from "./auth.service";

interface AuthSessionValue {
  accessToken: string;
  user: User;
}

interface AuthState {
  isLoading: boolean;
  isAuthenticated: boolean;
  authSession: AuthSessionValue | null;
  updateAuthState: (authResponse: AuthResponse) => void;
  clearAuthState: () => void;
}

const AuthSessionContext = createContext<AuthState | null>(null);

export function AuthSessionProvider({ children }: any) {
  const [isLoading, setIsLoading] = useState(true);
  const [session, setSession] = useState<AuthSessionValue | null>(null);

  useEffect(() => {
    async function restoreSession() {
      try {
        const response: AuthResponse = await refresh();
        tokenStorage.setToken(response.token);
        setSession({
          accessToken: response.token,
          user: {
            id: response.id,
            displayName: response.displayName,
            email: response.email,
            userName: response.userName,
          },
        });
      } catch {
        setSession(null);
      } finally {
        setIsLoading(false);
      }
    }

    restoreSession();
  }, []);

  async function updateAuthState(data: AuthResponse) {
    await tokenStorage.setToken(data.token);
    setSession({
      accessToken: data.token,
      user: {
        id: data.id,
        displayName: data.displayName,
        email: data.email,
        userName: data.userName,
      },
    });
  }

  async function clearAuthState() {
    await tokenStorage.removeToken();
    setSession(null);
  }

  return (
    <AuthSessionContext.Provider
      value={{
        isLoading,
        authSession: session,
        isAuthenticated: session !== null,
        updateAuthState,
        clearAuthState,
      }}
    >
      {children}
    </AuthSessionContext.Provider>
  );
}

export function useAuthSession() {
  const session = useContext(AuthSessionContext);
  if (!session) {
    throw new Error("useAuthSession must be used inside AuthSessionProvider.");
  }
  return session;
}
