import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { AuthApi } from '../../services/auth-api';

@Component({
  imports: [ReactiveFormsModule, RouterLink, TranslatePipe],
  selector: 'app-reset-password',
  styleUrl: './reset-password.css',
  templateUrl: './reset-password.html',
})
export class ResetPassword {
  private readonly _fb = inject(NonNullableFormBuilder);
  private readonly _authApi = inject(AuthApi);
  private readonly _destroyRef = inject(DestroyRef);
  private readonly _route = inject(ActivatedRoute);

  readonly isLoading = signal(false);
  readonly isComplete = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly email = this._route.snapshot.queryParamMap.get('email') ?? '';
  readonly token = this._route.snapshot.queryParamMap.get('token') ?? '';
  readonly hasValidLink = signal(Boolean(this.email && this.token));

  readonly resetPasswordForm = this._fb.group({
    newPassword: [
      '',
      [
        Validators.required,
        Validators.pattern('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^a-zA-Z0-9]).{8,}$'),
      ],
    ],
    confirmPassword: ['', [Validators.required]],
  });

  onSubmit(): void {
    if (this.resetPasswordForm.invalid) {
      this.resetPasswordForm.markAllAsTouched();
      return;
    }

    const { newPassword, confirmPassword } = this.resetPasswordForm.getRawValue();
    if (newPassword !== confirmPassword) {
      this.resetPasswordForm.controls.confirmPassword.setErrors({ mismatch: true });
      this.resetPasswordForm.controls.confirmPassword.markAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);
    this._authApi
      .resetPassword({ email: this.email, token: this.token, newPassword })
      .pipe(takeUntilDestroyed(this._destroyRef))
      .subscribe({
        next: () => {
          this.isComplete.set(true);
          this.isLoading.set(false);
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(
            error.error?.detail || 'The password reset link is invalid or expired.',
          );
          this.isLoading.set(false);
        },
      });
  }
}
