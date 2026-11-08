import { computed, DestroyRef, inject, Service, signal } from '@angular/core';
import { AuthApi } from './auth-api';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, finalize, Observable, of, tap } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { User } from '../models/user';
import { RegisterRequest } from '../models/register-request';
import { LoginCredentails } from '../models/credentails';
import { AuthResponse, LoginResponse } from '../models/auth-response';
import { IOnlineUser } from '../models/online-user';
import { toast } from 'ngx-sonner';
import { ConfirmEmailRequest } from '../models/confirm-email';

@Service()
export class AuthStore {
  private readonly _auth = inject(AuthApi);
  private readonly _router = inject(Router);
  private readonly _destroyRef = inject(DestroyRef);

  private readonly _user = signal<User | null>(null);
  private readonly _accessToken = signal<string | null>(null);
  private readonly _isLoading = signal<boolean>(false);
  private readonly _error = signal<string | null>(null);
  private readonly _requiresTwoFactor = signal<boolean>(false);
  private readonly _onlineUsers = signal<Set<User>>(new Set());
  private readonly _typingUsers = signal<Map<string, Set<string>>>(new Map());

  readonly user = this._user.asReadonly();
  readonly accessToken = this._accessToken.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly requiresTwoFactor = this._requiresTwoFactor.asReadonly();
  readonly onlineUsers = this._onlineUsers.asReadonly();
  readonly typingUsers = this._typingUsers.asReadonly();

  readonly isAuthenticated = computed(() => this._user() !== null && this._accessToken() !== null);

  login(credentials: LoginCredentails): Observable<LoginResponse | null> {
    this._isLoading.set(true);
    this._error.set(null);
    if (!credentials.twoFactorCode && !credentials.recoveryCode) {
      this._requiresTwoFactor.set(false);
    }

    return this._auth.login(credentials).pipe(
      takeUntilDestroyed(this._destroyRef),
      tap((response: LoginResponse) => {
        if (response.requiresTwoFactor) {
          this._requiresTwoFactor.set(true);
          return;
        }
        if (!response.id || !response.token || !response.displayName) {
          this._error.set('The server returned an incomplete login response.');
          return;
        }

        this._requiresTwoFactor.set(false);
        this._accessToken.set(response.token);
        this._user.set({
          id: response.id,
          email: response.email,
          userName: response.userName,
          displayName: response.displayName,
        });
        this._router.navigate(['/conversations']);
      }),
      catchError((e: HttpErrorResponse) => {
        const message =
          e.error?.detail || e.error?.message || 'Login failed. Please check your credentials.';
        this._error.set(message);
        toast.error(message);
        return of(null);
      }),
      finalize(() => this._isLoading.set(false)),
    );
  }

  register(request: RegisterRequest): Observable<string | null> {
    this._isLoading.set(true);
    this._error.set(null);

    return this._auth.register(request).pipe(
      takeUntilDestroyed(this._destroyRef),
      tap((response) => {
        toast.success(response);
      }),
      catchError((e: HttpErrorResponse) => {
        console.log('Error during registration:', e);

        if (e.status === 400 && e.error?.errors) {
          const errorMessages = Object.values(e.error.errors)
            .flat()
            .join(' ');
          this._error.set(errorMessages);
          toast.error(errorMessages);
        } else {
          const message =
            e.error?.detail || 'Registration failed. Please try again later.';
          this._error.set(message);
          toast.error(message);
        }
        return of(null);
      }),
      finalize(() => this._isLoading.set(false)),
    );
  }

  confirmEmail(request: ConfirmEmailRequest): Observable<string | null> {
    this._isLoading.set(true);
    this._error.set(null);

    return this._auth.confirmEmail(request).pipe(
      takeUntilDestroyed(this._destroyRef),
      catchError((e: HttpErrorResponse) => {
        const message =
          e.error?.detail || 'Email confirmation failed. The link may be invalid or expired.';
        this._error.set(message);
        return of(null);
      }),
      finalize(() => this._isLoading.set(false)),
    );
  }

  refresh(): Observable<AuthResponse | null> {
    this._isLoading.set(true);
    this._error.set(null);

    return this._auth.refresh().pipe(
      takeUntilDestroyed(this._destroyRef),
      tap((res: AuthResponse) => {
        this._accessToken.set(res.token);
        this._user.set({
          id: res.id,
          email: res.email,
          userName: res.userName,
          displayName: res.displayName,
        });
      }),
      catchError((e) => {
        const message = e?.error?.detail || 'Session expired. Please log in again.';
        this._error.set(message);
        return of(null);
      }),
      finalize(() => this._isLoading.set(false)),
    );
  }

  logout() {
    this._isLoading.set(true);
    this._error.set(null);
    return this._auth.logout().pipe(
      takeUntilDestroyed(this._destroyRef),
      tap(() => this._clearLocalSession()),
      catchError((e: HttpErrorResponse) => {
        this._clearLocalSession();
        const message = e?.error?.detail || 'session was cleared.';
        this._error.set(message);
        return of(null);
      }),
      finalize(() => this._isLoading.set(false)),
    );
  }

  clearMessage() {
    setTimeout(() => {
      this._error.set('');
    }, 3000);
  }

  userOnline(user: User) {
    this._onlineUsers.update(
      (users) => new Set([...[...users].filter((onlineUser) => onlineUser.id !== user.id), user]),
    );
  }

  isOnline(userId: string) {
    return [...this._onlineUsers()].some((u) => u.id === userId);
  }

  userOffline(user: User) {
    this._onlineUsers.update(
      (users) => new Set([...users].filter((onlineUser) => onlineUser.id !== user.id)),
    );
  }

  onlineStatus(onlineStatus: IOnlineUser[]) {
    this._onlineUsers.update((users) => {
      const requestedUserIds = new Set(onlineStatus.map((status) => status.user.id));

      const updated = new Set([...users].filter((user) => !requestedUserIds.has(user.id)));

      onlineStatus
        .filter((status) => status.isOnline)
        .forEach((status) => updated.add(status.user));

      return updated;
    });
  }

  userTyping(conversationId: string, userId: string) {
    if (!conversationId || !userId || userId === this.user()?.id) {
      return;
    }

    const wasTyping = this.isUserTyping(conversationId, userId);

    if (!wasTyping) {
      const typingPulse = new Audio('/assets/sounds/typing-sound.mp3');
      typingPulse.play().catch(() => {});
    }

    this._typingUsers.update((typingUsers) => {
      const updatedTypingUsers = new Map(typingUsers);
      const typingUserIds = new Set(updatedTypingUsers.get(conversationId) ?? []);

      typingUserIds.add(userId);
      updatedTypingUsers.set(conversationId, typingUserIds);

      return updatedTypingUsers;
    });
  }

  userStopedTyping(conversationId: string, userId: string) {
    if (!conversationId || !userId || userId === this.user()?.id) {
      return;
    }

    this._typingUsers.update((typingUsers) => {
      const updatedTypingUsers = new Map(typingUsers);
      const typingUserIds = new Set(updatedTypingUsers.get(conversationId) ?? []);

      typingUserIds.delete(userId);

      if (typingUserIds.size === 0) {
        updatedTypingUsers.delete(conversationId);
      } else {
        updatedTypingUsers.set(conversationId, typingUserIds);
      }

      return updatedTypingUsers;
    });
  }

  private _clearLocalSession() {
    this._user.set(null);
    this._accessToken.set(null);
    this._router.navigate(['/auth/login']);
  }

  clearLocalSession(): void {
    this._clearLocalSession();
  }

  updateUserProfile(profile: Pick<User, 'displayName' | 'userName'>): void {
    this._user.update((user) => (user ? { ...user, ...profile } : user));
  }

  isUserTyping(conversationId: string, userId: string): boolean {
    return this._typingUsers().get(conversationId)?.has(userId) ?? false;
  }
}
