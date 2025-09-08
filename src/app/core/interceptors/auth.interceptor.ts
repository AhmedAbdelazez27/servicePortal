import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

function getPathname(url: string): string {
  try {
    const u = new URL(url, window.location.origin);
    return u.pathname.toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}

function isAuthUrl(url: string): boolean {
  const path = getPathname(url);

  const apiAuth = [
    '/auth/login',
    '/auth/register',
    '/auth/refresh',
    '/auth/forgot-password',
    '/auth/reset-password',
  ];

  const feAuth = [
    '/login',
    '/forgot-password',
    '/verify-otp',
    '/reset-password',
    '/register',                 // >>  /register/individual & /register/institution & /register/pending
  ];

  return apiAuth.some(p => path.startsWith(p))
      || feAuth.some(p => path === p || path.startsWith(p + '/'));
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const token = localStorage.getItem('access_token');

  const skipAuthHandling = isAuthUrl(req.url);

  const authReq = token && !skipAuthHandling
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authReq).pipe(
    catchError((err: unknown) => {
      const error = err as HttpErrorResponse;

      if (skipAuthHandling) return throwError(() => error);

      if (error.status === 401) {
        localStorage.removeItem('access_token');
        const returnUrl = router.url;
        if (!router.url.startsWith('/login')) {
          router.navigate(['/login'], {
            queryParams: { reason: 'session_expired', returnUrl }
          });
        }
      } else if (error.status === 403) {
        if (!router.url.startsWith('/forbidden')) {
          router.navigate(['/forbidden'], {
            queryParams: { reason: 'not_authorized' }
          });
        }
      }

      return throwError(() => error);
    })
  );
};
