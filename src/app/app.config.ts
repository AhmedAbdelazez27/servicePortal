import { ApplicationConfig, provideZoneChangeDetection, importProvidersFrom, inject, provideAppInitializer } from '@angular/core';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';

import { NgxSpinnerModule } from 'ngx-spinner';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { provideToastr } from 'ngx-toastr';

import { routes } from './app.routes';
import { apiKeyInterceptor } from './core/interceptors/api-key.interceptor';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { BundledJsonTranslateLoader } from './i18n/bundled-json-translate-loader';
import { refreshInterceptor } from './core/interceptors/refresh.interceptors';
import { AuthService } from './core/services/auth.service';

function hydrateAuth() {
  const auth = inject(AuthService);
  // ارجع الـ Promise مباشرة (مش function ترجع Promise)
  return auth.hydrateFromIndexedDb();
}
export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(
      withFetch(),
      withInterceptors([apiKeyInterceptor, refreshInterceptor])
    ),
    provideAnimations(),

    importProvidersFrom(
      TranslateModule.forRoot({
        defaultLanguage: 'en',
        loader: { provide: TranslateLoader, useClass: BundledJsonTranslateLoader }
      }),
      NgxSpinnerModule.forRoot({ type: 'ball-spin-clockwise-fade-rotating' })
    ),

    provideToastr({
      positionClass: 'toast-top-right',
      timeOut: 3000,
      progressBar: true,
      progressAnimation: 'increasing',
      closeButton: true,
      enableHtml: true,
      preventDuplicates: true
    }),
      // to check if user login if true >> update value for the behavior subject
    provideAppInitializer(hydrateAuth),]
};
