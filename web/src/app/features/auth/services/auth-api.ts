import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { RegisterRequest } from '../models/register-request';
import { AuthResponse, LoginResponse } from '../models/auth-response';
import { LoginCredentails } from '../models/credentails';
import { ConfirmEmailRequest } from '../models/confirm-email';

@Service()
export class AuthApi {
  private readonly BASE_URL: string = `${environment.apiUrl}/api/auth`;
  private readonly httpClient = inject(HttpClient);

  register(registerData: RegisterRequest): Observable<string> {
    return this.httpClient.post<string>(`${this.BASE_URL}/register`, registerData);
  }

  login(loginData: LoginCredentails): Observable<LoginResponse> {
    return this.httpClient.post<LoginResponse>(`${this.BASE_URL}/login`, loginData);
  }

  logout(): Observable<void> {
    return this.httpClient.post<void>(`${this.BASE_URL}/logout`, {});
  }

  refresh(): Observable<AuthResponse> {
    return this.httpClient.post<AuthResponse>(`${this.BASE_URL}/refresh`, {});
  }

  confirmEmail(request: ConfirmEmailRequest): Observable<string> {
    return this.httpClient.post<string>(`${this.BASE_URL}/confirm-email`, request);
  }

  forgotPassword(email: string): Observable<string> {
    return this.httpClient.post<string>(`${this.BASE_URL}/forgot-password`, { email });
  }

  resetPassword(request: { email: string; token: string; newPassword: string }): Observable<void> {
    return this.httpClient.post<void>(`${this.BASE_URL}/reset-password`, request);
  }
}
