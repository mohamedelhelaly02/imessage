import { Routes } from '@angular/router';
import { authGuard } from './core/guard/auth-guard';
import { guestGuard } from './core/guard/guest-guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./core/layouts/blank/blank').then((c) => c.Blank),
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'conversations', pathMatch: 'full' },
      {
        path: 'conversations',
        loadComponent: () => import('./features/chat/pages/empty/empty').then((c) => c.Empty),
        title: 'conversations',
      },
      {
        path: 'conversations/:id',
        loadComponent: () =>
          import('./features/chat/pages/conversation/conversation').then((c) => c.Conversation),
        title: 'Details',
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./features/users/pages/profile/profile').then((component) => component.Profile),
        title: 'My profile',
      },
    ],
  },
  {
    path: 'auth',
    loadComponent: () => import('./core/layouts/auth/auth').then((c) => c.Auth),
    canActivate: [guestGuard],
    children: [
      { path: '', redirectTo: 'login', pathMatch: 'full' },
      {
        path: 'login',
        loadComponent: () => import('./features/auth/pages/login/login').then((c) => c.Login),
        title: 'Login',
      },
      {
        path: 'register',
        loadComponent: () =>
          import('./features/auth/pages/register/register').then((c) => c.Register),
        title: 'Register',
      },
      {
        path: 'confirm-email',
        loadComponent: () =>
          import('./features/auth/pages/confirm-email/confirm-email').then((c) => c.ConfirmEmail),
        title: 'Confirm email',
      },
      {
        path: 'forgot-password',
        loadComponent: () =>
          import('./features/auth/pages/forgot-password/forgot-password').then(
            (component) => component.ForgotPassword,
          ),
        title: 'Forgot password',
      },
      {
        path: 'reset-password',
        loadComponent: () =>
          import('./features/auth/pages/reset-password/reset-password').then(
            (component) => component.ResetPassword,
          ),
        title: 'Reset password',
      },
    ],
  },
  {
    path: '**',
    loadComponent: () => import('./shared/not-fount/not-fount').then((c) => c.NotFount),
    title: '404 not-found',
  },
];
