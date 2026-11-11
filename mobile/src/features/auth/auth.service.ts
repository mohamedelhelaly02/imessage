import type {
  IRegisterRequest,
  ILoginRequest,
  ILoginResponse,
} from "@/features/auth/types/auth.types";

import { api } from "@/shared/api";

export async function register(request: IRegisterRequest): Promise<string> {
  try {
    const { data } = await api.post<string>('/auth/register', request);
    return data;
  } catch (error) {
    throw new Error('Registration failed. Please try again.');
  }
}

export async function login(request: ILoginRequest): Promise<ILoginResponse> {
  try {
    const { data } = await api.post<ILoginResponse>('/auth/register', request);
    return data;
  } catch (error) {
    throw new Error('Login failed. Please try again.');
  }
}
