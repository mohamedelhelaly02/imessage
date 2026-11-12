export type ClientType = "Mobile" | "Web";

export interface User {
    id: string;
    email: string;
    displayName: string;
    userName: string;
}

export interface IRegisterRequest {
    displayName: string;
    email: string;
    password: string;
    clientType: ClientType
}

export interface ILoginRequest {
    email: string;
    password: string;
    twoFactorCode?: string;
    recoveryCode?: string;
}

export interface IVerifyEmailOtpRequest {
    email: string;
    code: string;
}

export interface ILoginResponse {
    id: string;
    displayName: string;
    email: string;
    userName: string;
    token: string;
    requiresTwoFactor: boolean;
}

export interface IProblemDetails {
    title?: string;
    detail?: string;
    code?: string;
    errors?: Record<string, string[] | string>;
}

export interface AuthResponse {
    id: string;
    displayName: string;
    email: string;
    userName: string;
    token: string;
}