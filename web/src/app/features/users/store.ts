import { DestroyRef, inject, Service, signal } from '@angular/core';
import { DirectoryUser } from './user';
import { catchError, finalize, Observable, of, tap } from 'rxjs';
import { UsersApi } from './users-api';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { toast } from 'ngx-sonner';

@Service()
export class UsersStore {
  private readonly _api = inject(UsersApi);
  private readonly _destroyRef = inject(DestroyRef);

  readonly users = signal<DirectoryUser[]>([]);
  readonly isLoading = signal<boolean>(false);
  readonly error = signal<string | null>(null);

  loadUsers(): Observable<DirectoryUser[] | null> {
    this.isLoading.set(true);
    this.error.set(null);
    return this._api.getUsers().pipe(
      takeUntilDestroyed(this._destroyRef),
      tap((users) => this.users.set(users)),
      catchError((err) => {
        const message = err.error.detail || 'unable to load users.';
        this.error.set(message);
        toast.error(message);
        return of(null);
      }),
      finalize(() => this.isLoading.set(false)),
    );
  }
}
