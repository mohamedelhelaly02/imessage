import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthStore } from '../../features/auth/services/store';
import { BehaviorSubject, catchError, filter, switchMap, take, throwError } from 'rxjs';

let isRefreshing = false;
const refreshTokenSubject = new BehaviorSubject<string | null>(null);
const PUBLIC_ENDPOINTS = ['/auth/login', '/auth/register', '/auth/refresh'];

export const credentialsInterceptor: HttpInterceptorFn = (req, next) => {
  const authStore = inject(AuthStore);
  const isPublic = PUBLIC_ENDPOINTS.some((endpoint) => req.url.includes(endpoint));

  if (req.method === 'OPTIONS') {
    return next(req);
  }

  if (isPublic) {
    return next(req);
  }

  const accessToken = authStore.accessToken();
  let authRequest = req;

  if (accessToken) {
    authRequest = addTokenHeader(req, accessToken);
  }

  return next(authRequest).pipe(
    catchError((e: HttpErrorResponse) => {
      if (e.status === 401 && !isPublic) {
        if (!isRefreshing) {
          isRefreshing = true;
          refreshTokenSubject.next(null);

          return authStore.refresh().pipe(
            switchMap((response) => {
              isRefreshing = false;

              const newAccessToken = response?.token;
              if (newAccessToken) {
                refreshTokenSubject.next(newAccessToken);
                return next(addTokenHeader(authRequest, newAccessToken));
              }

              authStore.logout();
              return throwError(() => new Error('Session expired'));
            }),
            catchError((err) => {
              isRefreshing = false;
              authStore.logout();
              return throwError(() => err);
            }),
          );
        } else {
          return refreshTokenSubject.pipe(
            filter((token): token is string => token !== null),
            take(1),
            switchMap((token) => next(addTokenHeader(authRequest, token))),
          );
        }
      }

      return throwError(() => e);
    }),
  );
};

function addTokenHeader(request: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
  return request.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`,
    },
  });
}
