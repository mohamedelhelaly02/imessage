import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslatePipe } from '@ngx-translate/core';
import { AuthStore } from '../../../auth/services/store';
import { AuthenticatorSetup, UserProfile } from '../../user';
import { UsersApi } from '../../users-api';

@Component({
  imports: [ReactiveFormsModule, TranslatePipe],
  selector: 'app-profile',
  styleUrl: './profile.css',
  templateUrl: './profile.html',
})
export class Profile {
  private readonly _fb = inject(NonNullableFormBuilder);
  private readonly _api = inject(UsersApi);
  private readonly _authStore = inject(AuthStore);
  private readonly _destroyRef = inject(DestroyRef);

  readonly profile = signal<UserProfile | null>(null);
  readonly authenticatorSetup = signal<AuthenticatorSetup | null>(null);
  readonly recoveryCodes = signal<string[] | null>(null);
  readonly isLoading = signal(false);
  readonly isSavingProfile = signal(false);
  readonly isChangingPassword = signal(false);
  readonly isManagingTwoFactor = signal(false);
  readonly isDeletingAccount = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  readonly profileForm = this._fb.group({
    displayName: ['', [Validators.required, Validators.maxLength(100)]],
    userName: ['', [Validators.maxLength(50)]],
    profilePictureUrl: ['', [Validators.pattern(/^$|^https:\/\/.+/i)]],
  });

  readonly passwordForm = this._fb.group({
    currentPassword: ['', [Validators.required]],
    newPassword: [
      '',
      [
        Validators.required,
        Validators.pattern('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^a-zA-Z0-9]).{8,}$'),
      ],
    ],
    twoFactorCode: [''],
  });

  readonly authenticatorForm = this._fb.group({
    code: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
  });

  readonly disableTwoFactorForm = this._fb.group({
    password: ['', [Validators.required]],
    code: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
  });

  readonly recoveryCodesForm = this._fb.group({
    password: ['', [Validators.required]],
  });

  readonly setupTwoFactorForm = this._fb.group({
    password: ['', [Validators.required]],
  });

  readonly deleteAccountForm = this._fb.group({
    password: ['', [Validators.required]],
    twoFactorCode: [''],
    confirm: [false, [Validators.requiredTrue]],
  });

  constructor() {
    this.loadProfile();
  }

  loadProfile(): void {
    this.isLoading.set(true);
    this._api
      .getMyProfile()
      .pipe(takeUntilDestroyed(this._destroyRef))
      .subscribe({
        next: (profile) => {
          this.profile.set(profile);
          this.profileForm.patchValue({
            displayName: profile.displayName,
            userName: profile.userName ?? '',
            profilePictureUrl: profile.profilePictureUrl ?? '',
          });
          if (profile.twoFactorEnabled) {
            this.passwordForm.controls.twoFactorCode.addValidators([
              Validators.required,
              Validators.pattern(/^\d{6}$/),
            ]);
            this.deleteAccountForm.controls.twoFactorCode.addValidators([
              Validators.required,
              Validators.pattern(/^\d{6}$/),
            ]);
          } else {
            this.passwordForm.controls.twoFactorCode.clearValidators();
            this.deleteAccountForm.controls.twoFactorCode.clearValidators();
          }
          this.passwordForm.controls.twoFactorCode.updateValueAndValidity({ emitEvent: false });
          this.deleteAccountForm.controls.twoFactorCode.updateValueAndValidity({
            emitEvent: false,
          });
          this.isLoading.set(false);
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(this.getErrorMessage(error, 'Unable to load your profile.'));
          this.isLoading.set(false);
        },
      });
  }

  updateProfile(): void {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }

    this.clearMessages();
    this.isSavingProfile.set(true);
    const value = this.profileForm.getRawValue();
    this._api
      .updateMyProfile({
        displayName: value.displayName,
        userName: value.userName.trim() || null,
        profilePictureUrl: value.profilePictureUrl.trim() || null,
      })
      .pipe(takeUntilDestroyed(this._destroyRef))
      .subscribe({
        next: (profile) => {
          this.profile.set(profile);
          this._authStore.updateUserProfile({
            displayName: profile.displayName,
            userName: profile.userName,
          });
          this.successMessage.set('PROFILE.FEEDBACK.PROFILE_SAVED');
          this.isSavingProfile.set(false);
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(this.getErrorMessage(error, 'Unable to save your profile.'));
          this.isSavingProfile.set(false);
        },
      });
  }

  changePassword(): void {
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    this.clearMessages();
    this.isChangingPassword.set(true);
    this._api
      .changePassword({
        ...this.passwordForm.getRawValue(),
        twoFactorCode: this.profile()?.twoFactorEnabled
          ? this.passwordForm.controls.twoFactorCode.value
          : null,
      })
      .pipe(takeUntilDestroyed(this._destroyRef))
      .subscribe({
        next: () => {
          this.passwordForm.reset();
          this.successMessage.set('PROFILE.FEEDBACK.PASSWORD_CHANGED');
          this.isChangingPassword.set(false);
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(this.getErrorMessage(error, 'Unable to change your password.'));
          this.isChangingPassword.set(false);
        },
      });
  }

  dismissRecoveryCodes(): void {
    this.recoveryCodes.set(null);
  }

  beginTwoFactorSetup(): void {
    if (this.setupTwoFactorForm.invalid) {
      this.setupTwoFactorForm.markAllAsTouched();
      return;
    }

    this.clearMessages();
    this.isManagingTwoFactor.set(true);
    this._api
      .getAuthenticatorSetup(this.setupTwoFactorForm.controls.password.value)
      .pipe(takeUntilDestroyed(this._destroyRef))
      .subscribe({
        next: (setup) => {
          this.authenticatorSetup.set(setup);
          this.setupTwoFactorForm.reset();
          this.isManagingTwoFactor.set(false);
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(
            this.getErrorMessage(error, 'Unable to start authenticator setup.'),
          );
          this.isManagingTwoFactor.set(false);
        },
      });
  }

  enableTwoFactor(): void {
    if (this.authenticatorForm.invalid) {
      this.authenticatorForm.markAllAsTouched();
      return;
    }

    this.clearMessages();
    this.isManagingTwoFactor.set(true);
    this._api
      .enableTwoFactor(this.authenticatorForm.controls.code.value)
      .pipe(takeUntilDestroyed(this._destroyRef))
      .subscribe({
        next: (codes) => {
          this.recoveryCodes.set(codes);
          this.authenticatorSetup.set(null);
          this.authenticatorForm.reset();
          this.isManagingTwoFactor.set(false);
          this.loadProfile();
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(
            this.getErrorMessage(error, 'Unable to enable two-factor authentication.'),
          );
          this.isManagingTwoFactor.set(false);
        },
      });
  }

  disableTwoFactor(): void {
    if (this.disableTwoFactorForm.invalid) {
      this.disableTwoFactorForm.markAllAsTouched();
      return;
    }

    this.clearMessages();
    this.isManagingTwoFactor.set(true);
    this._api
      .disableTwoFactor(this.disableTwoFactorForm.getRawValue())
      .pipe(takeUntilDestroyed(this._destroyRef))
      .subscribe({
        next: () => {
          this.disableTwoFactorForm.reset();
          this.successMessage.set('PROFILE.FEEDBACK.TWO_FACTOR_DISABLED');
          this.isManagingTwoFactor.set(false);
          this.loadProfile();
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(
            this.getErrorMessage(error, 'Unable to disable two-factor authentication.'),
          );
          this.isManagingTwoFactor.set(false);
        },
      });
  }

  regenerateRecoveryCodes(): void {
    if (this.recoveryCodesForm.invalid) {
      this.recoveryCodesForm.markAllAsTouched();
      return;
    }

    this.clearMessages();
    this.isManagingTwoFactor.set(true);
    this._api
      .regenerateRecoveryCodes(this.recoveryCodesForm.controls.password.value)
      .pipe(takeUntilDestroyed(this._destroyRef))
      .subscribe({
        next: (codes) => {
          this.recoveryCodes.set(codes);
          this.recoveryCodesForm.reset();
          this.isManagingTwoFactor.set(false);
          this.loadProfile();
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(
            this.getErrorMessage(error, 'Unable to create new recovery codes.'),
          );
          this.isManagingTwoFactor.set(false);
        },
      });
  }

  deleteAccount(): void {
    if (this.deleteAccountForm.invalid) {
      this.deleteAccountForm.markAllAsTouched();
      return;
    }

    this.clearMessages();
    this.isDeletingAccount.set(true);
    this._api
      .deleteAccount({
        password: this.deleteAccountForm.controls.password.value,
        twoFactorCode: this.profile()?.twoFactorEnabled
          ? this.deleteAccountForm.controls.twoFactorCode.value
          : null,
      })
      .pipe(takeUntilDestroyed(this._destroyRef))
      .subscribe({
        next: () => this._authStore.clearLocalSession(),
        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(this.getErrorMessage(error, 'Unable to delete your account.'));
          this.isDeletingAccount.set(false);
        },
      });
  }

  private clearMessages(): void {
    this.errorMessage.set(null);
    this.successMessage.set(null);
  }

  private getErrorMessage(error: HttpErrorResponse, fallback: string): string {
    return error.error?.detail || error.error?.message || fallback;
  }
}
