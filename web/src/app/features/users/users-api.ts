import { inject, Service } from '@angular/core';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';
import { DirectoryUser } from './user';
import { HttpClient } from '@angular/common/http';
import { AuthenticatorSetup, UserProfile } from './user';

@Service()
export class UsersApi {
  private readonly httpClient = inject(HttpClient);
  private readonly BASE_URL = `${environment.apiUrl}/api/users`;

  getUsers(): Observable<DirectoryUser[]> {
    return this.httpClient.get<DirectoryUser[]>(this.BASE_URL);
  }

  getMyProfile(): Observable<UserProfile> {
    return this.httpClient.get<UserProfile>(`${this.BASE_URL}/me`);
  }

  updateMyProfile(request: {
    displayName: string;
    userName: string | null;
    profilePictureUrl: string | null;
  }): Observable<UserProfile> {
    return this.httpClient.put<UserProfile>(`${this.BASE_URL}/me`, request);
  }

  changePassword(request: {
    currentPassword: string;
    newPassword: string;
    twoFactorCode: string | null;
  }): Observable<void> {
    return this.httpClient.post<void>(`${this.BASE_URL}/me/password`, request);
  }

  deleteAccount(request: { password: string; twoFactorCode: string | null }): Observable<void> {
    return this.httpClient.post<void>(`${this.BASE_URL}/me/delete-account`, request);
  }

  getAuthenticatorSetup(password: string): Observable<AuthenticatorSetup> {
    return this.httpClient.post<AuthenticatorSetup>(
      `${this.BASE_URL}/me/two-factor/authenticator`,
      {
        password,
      },
    );
  }

  enableTwoFactor(code: string): Observable<string[]> {
    return this.httpClient.post<string[]>(`${this.BASE_URL}/me/two-factor/enable`, { code });
  }

  disableTwoFactor(request: { password: string; code: string }): Observable<void> {
    return this.httpClient.post<void>(`${this.BASE_URL}/me/two-factor/disable`, request);
  }

  regenerateRecoveryCodes(password: string): Observable<string[]> {
    return this.httpClient.post<string[]>(`${this.BASE_URL}/me/two-factor/recovery-codes`, {
      password,
    });
  }
}
