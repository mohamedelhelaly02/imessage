import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideTranslateService } from '@ngx-translate/core';
import { provideTranslateHttpLoader } from '@ngx-translate/http-loader';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { cookiesInterceptor } from './core/interceptor/cookies-interceptor';
import { credentialsInterceptor } from './core/interceptor/credentials-interceptor';
import { AuthStore } from './features/auth/services/store';
import { firstValueFrom } from 'rxjs';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([cookiesInterceptor, credentialsInterceptor])),
    provideTranslateService({
      loader: provideTranslateHttpLoader({
        prefix: './assets/i18n/',
        suffix: '.json',
      }),
    }),
    provideAppInitializer(() => {
      const authStore = inject(AuthStore);
      return firstValueFrom(authStore.refresh());
    }),
  ],
};
