import { Component, inject } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { RegisterRequest } from '../../models/register-request';
import { AuthStore } from '../../services/store';
import { RouterLink } from '@angular/router';
import { LanguageService } from '../../../../core/services/language';

@Component({
  imports: [TranslatePipe, ReactiveFormsModule, RouterLink],
  selector: 'app-register',
  styleUrl: './register.css',
  templateUrl: './register.html',
})
export class Register {
  private readonly _fb = inject(NonNullableFormBuilder);
  private readonly _authStore = inject(AuthStore);

  readonly isLoading = this._authStore.isLoading;
  readonly errorMessage = this._authStore.error;
  readonly isRtl = inject(LanguageService).isRtl;

  readonly registerForm = this._fb.group({
    displayName: ['', [Validators.required, Validators.maxLength(100)]],
    email: ['', [Validators.required, Validators.email]],
    password: [
      '',
      [
        Validators.required,
        Validators.pattern('^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).{8,}$'),
      ],
    ],
  });

  onSubmit(): void {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    const registerData = this.registerForm.getRawValue() as RegisterRequest;

    this._authStore.register(registerData).subscribe();
  }
}
