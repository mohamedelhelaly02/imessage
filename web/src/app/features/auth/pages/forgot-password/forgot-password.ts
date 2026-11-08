import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { AuthApi } from '../../services/auth-api';

@Component({
  imports: [ReactiveFormsModule, RouterLink, TranslatePipe],
  selector: 'app-forgot-password',
  styleUrl: './forgot-password.css',
  templateUrl: './forgot-password.html',
})
export class ForgotPassword {
  private readonly _fb = inject(NonNullableFormBuilder);
  private readonly _authApi = inject(AuthApi);
  private readonly _destroyRef = inject(DestroyRef);

  readonly isLoading = signal(false);
  readonly hasSubmitted = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly forgotPasswordForm = this._fb.group({
    email: ['', [Validators.required, Validators.email]],
  });

  onSubmit(): void {
    if (this.forgotPasswordForm.invalid) {
      this.forgotPasswordForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);
    this._authApi
      .forgotPassword(this.forgotPasswordForm.controls.email.value)
      .pipe(takeUntilDestroyed(this._destroyRef))
      .subscribe({
        next: () => {
          this.hasSubmitted.set(true);
          this.isLoading.set(false);
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(
            error.error?.detail || 'Unable to send the password reset email. Please try again.',
          );
          this.isLoading.set(false);
        },
      });
  }
}
