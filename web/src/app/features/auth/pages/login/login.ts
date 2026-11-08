import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { AuthStore } from '../../services/store';
import { LoginCredentails } from '../../models/credentails';
import { RouterLink } from '@angular/router';

@Component({
  imports: [TranslatePipe, ReactiveFormsModule, RouterLink],
  selector: 'app-login',
  styleUrl: './login.css',
  templateUrl: './login.html',
})
export class Login {
  private readonly _fb = inject(NonNullableFormBuilder);
  private readonly _authStore = inject(AuthStore);

  readonly isLoading = this._authStore.isLoading;
  readonly errorMessage = this._authStore.error;
  readonly requiresTwoFactor = this._authStore.requiresTwoFactor;
  readonly isUsingRecoveryCode = signal(false);

  readonly loginForm = this._fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    twoFactorCode: ['', [Validators.pattern(/^\d{6}$/)]],
    recoveryCode: ['', [Validators.pattern(/^[A-Za-z0-9-]{6,20}$/)]],
  });

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    const { email, password, twoFactorCode, recoveryCode } = this.loginForm.getRawValue();
    if (
      this.requiresTwoFactor() &&
      ((this.isUsingRecoveryCode() && !recoveryCode) ||
        (!this.isUsingRecoveryCode() && !twoFactorCode))
    ) {
      this.loginForm.markAllAsTouched();
      return;
    }

    const credentials: LoginCredentails = this.requiresTwoFactor()
      ? this.isUsingRecoveryCode()
        ? { email, password, recoveryCode }
        : { email, password, twoFactorCode }
      : { email, password };

    this._authStore.login(credentials).subscribe();
  }

  toggleRecoveryCode(): void {
    this.isUsingRecoveryCode.update((usingRecoveryCode) => !usingRecoveryCode);
  }
}
