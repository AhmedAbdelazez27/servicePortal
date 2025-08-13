import { HttpInterceptorFn } from '@angular/common/http';

export const apiKeyInterceptor: HttpInterceptorFn = (req, next) => {
  const clonedReq = req.clone({
    setHeaders: {
      ApiKey: 'Apikeytest'
    }
  });

  return next(clonedReq); 
};
