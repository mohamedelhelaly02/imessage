export type ClientType = "Mobile" | "Web";

export interface IRegisterRequest {
    displayName: string;
    email: string;
    password: string;
    clientType: ClientType
}

export interface ILoginRequest {
    email: string;
    password: string;
}

export interface ILoginResponse {
    id: string;
    displayName: string | null;
    email: string | null;
    userName: string | null;
    token: string;
    requiresTwoFactor: boolean;
}

export interface IProblemDetails {
    title?: string;
    detail?: string;
    errors?: Record<string, string[] | string>;
}
