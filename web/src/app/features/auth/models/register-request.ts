export type ClientType = "Mobile" | "Web";
export interface RegisterRequest {
  displayName: string;
  email: string;
  password: string;
  clientType: ClientType
}
