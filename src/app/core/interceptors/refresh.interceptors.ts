import { HttpInterceptorFn, HttpErrorResponse, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';
import { catchError, switchMap, take, throwError, of } from 'rxjs';
import { RefreshTokenService } from '../services/refresh-token.service';

const AUTH_SKIP_LIST = [
  '/login', '/uaepass', '/VerifyTwoFactor', '/Authenticate', '/Auth/RefreshToken', '/Logout'
];


let LOGGING_OUT = false;

export const refreshInterceptor: HttpInterceptorFn = (req, next) => {
  const refreshSvc = inject(RefreshTokenService);
  const auth = inject(AuthService);
  const router = inject(Router);

  const isAsset = req.url.includes('/assets/');
  const isAuthRelated = AUTH_SKIP_LIST.some(u => req.url.includes(u));
  const skipHeader = req.headers.has('X-Skip-Refresh'); 


  if (isAsset || isAuthRelated || skipHeader) {
    return next(req);
  }

  return next(req).pipe(
    catchError((rawErr: any) => {

      const status: number = rawErr?.status ?? rawErr?.httpStatus ?? 0;
      const url = rawErr?.url ?? req.url;

      // console.log('[REFRESH] caught:', status, url, rawErr);

      //passing any another errors 401 to errorInterceptor
      if (![401, 419, 440].includes(status)) {
        return throwError(() => rawErr);
      }

      // to prevent repeate the logout operation
      if (LOGGING_OUT) {
        return throwError(() => rawErr);
      }

      
      return refreshSvc.refresh().pipe(
        take(1),
        switchMap((ok) => {
          // console.log('[REFRESH] result:', ok);

          if (!ok) {
            
            if (!LOGGING_OUT) {
              LOGGING_OUT = true;
              auth.logout().subscribe({
                complete: () => {
                  LOGGING_OUT = false;
                  router.navigate(['/login']);
                }
              });
            }
            return throwError(() => rawErr);
          }

          // 
          const token = auth.getToken();
          const retried: HttpRequest<any> = token
            ? req.clone({
                setHeaders: { Authorization: `Bearer ${token}` },
                withCredentials: true
              })
            : req.clone({ withCredentials: true });

          return next(retried);
        })
      );
    })
  );
};
