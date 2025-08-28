 
import { HttpInterceptorFn } from '@angular/common/http';

export const apiKeyInterceptor: HttpInterceptorFn = (req, next) => {
  const uiLang = localStorage.getItem('lang') || 'en';
  const language = uiLang.startsWith('ar') ? 'ar-EG' : 'en-US';

  const clonedReq = req.clone({
    setHeaders: {
      ApiKey: 'Apikeytest' ,
      'Accept-Language':language
    }
  });

  return next(clonedReq); 
};