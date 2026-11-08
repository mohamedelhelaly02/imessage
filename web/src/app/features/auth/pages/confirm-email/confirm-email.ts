import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { LanguageService } from '../../../../core/services/language';
import { AuthStore } from '../../services/store';

type ConfirmationState = 'verifying' | 'success' | 'error' | 'invalid';

@Component({
  imports: [RouterLink, TranslatePipe],
  selector: 'app-confirm-email',
  styleUrl: './confirm-email.css',
  templateUrl: './confirm-email.html',
})
export class ConfirmEmail implements OnInit {
  private readonly _activatedRoute = inject(ActivatedRoute);
  private readonly _authStore = inject(AuthStore);
  private readonly _destroyRef = inject(DestroyRef);

  readonly state = signal<ConfirmationState>('verifying');
  readonly errorMessage = this._authStore.error;
  readonly isRtl = inject(LanguageService).isRtl;

  ngOnInit(): void {
    const email = this._activatedRoute.snapshot.queryParamMap.get('email');
    const token = this._activatedRoute.snapshot.queryParamMap.get('token');

    console.log(email, token);

    if (!email || !token) {
      this.state.set('invalid');
      return;
    }

    this._authStore
      .confirmEmail({ email, token })
      .pipe(takeUntilDestroyed(this._destroyRef))
      .subscribe({
        next: (response) => this.state.set(response === null ? 'error' : 'success'),
        error: () => this.state.set('error'),
      });
  }
}
