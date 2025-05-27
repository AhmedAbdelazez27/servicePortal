// src/app/app.config.ts
import { ApplicationConfig, provideZoneChangeDetection, importProvidersFrom } from '@angular/core';
import { HttpClient, provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { ToastrModule } from 'ngx-toastr';
import { provideAnimations } from '@angular/platform-browser/animations'; // ✅ هذا هو المهم لتفعيل animation
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { NgxSpinnerModule } from 'ngx-spinner';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';

import { routes } from './app.routes';

// 👇️ Factory لتحميل ملفات الترجمة
export function HttpLoaderFactory(http: HttpClient) {
  return new TranslateHttpLoader(http, './assets/i18n/', '.json');
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(),
    provideAnimations(), // ✅ مضاف لتفعيل animation بشكل صحيح
    importProvidersFrom(
      BrowserAnimationsModule, // ⛔️ ممكن يكون غير ضروري، لكن تركناه بناءً على طلبك
      TranslateModule.forRoot({
        defaultLanguage: 'en',
        loader: {
          provide: TranslateLoader,
          useFactory: HttpLoaderFactory,
          deps: [HttpClient]
        }
      }),
      NgxSpinnerModule.forRoot({
        type: 'ball-spin-clockwise-fade-rotating'
      }),
      ToastrModule.forRoot({
        positionClass: 'toast-top-right', // أو toast-bottom-left للغة العربية
        timeOut: 3000,
        progressBar: true,
        progressAnimation: 'increasing',
        closeButton: true,
        enableHtml: true,
        preventDuplicates: true
      })
    )
  ]
};
