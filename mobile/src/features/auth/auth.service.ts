import type {
  IRegisterRequest,
  ILoginRequest,
  ILoginResponse,
  IVerifyEmailOtpRequest,
  AuthResponse,
} from "@/features/auth/types";

import { api } from "@/shared/api";
import { toApiRequestError } from "@/shared/api-error";

export async function register(request: IRegisterRequest): Promise<string> {
  try {
    const { data } = await api.post<string>('/auth/register', request);
    return data;
  } catch (error: unknown) {
    console.log(error);
    throw toApiRequestError(error, "Registration failed. Please try again.");
  }
}

export async function login(request: ILoginRequest): Promise<ILoginResponse> {
  try {
    const { data } = await api.post<ILoginResponse>('/auth/login', request);
    return data;
  } catch (error: unknown) {
    console.log(error);
    throw toApiRequestError(error, "Login failed. Please try again.");
  }
}

export async function verifyEmailOtp(
  request: IVerifyEmailOtpRequest,
): Promise<string> {
  try {
    const { data } = await api.post<string>("/auth/verify-otp", request);
    return data;
  } catch (error: unknown) {
    throw toApiRequestError(error, "Email verification failed. Please try again.");
  }
}

export async function logout(): Promise<void> {
  try {
    await api.post("/auth/logout", {});
  } catch {
  }
}

export async function refresh(): Promise<AuthResponse> {
  try {
    const { data } = await api.post<AuthResponse>("/auth/refresh", {});
    return data;
  } catch (error) {
    throw toApiRequestError(error, "Restore Session Failed. Please try again.");
  }
}