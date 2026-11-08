export interface LoginCredentails {
  email: string;
  password: string;
  twoFactorCode?: string;
  recoveryCode?: string;
}
