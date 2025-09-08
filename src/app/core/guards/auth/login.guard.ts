import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { inject } from '@angular/core';

export const loginGuard: CanActivateFn = () : boolean | UrlTree => {
  const router = inject(Router);
  const token = localStorage.getItem('access_token');
  if (!token) return true;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const expMs = (payload?.exp ?? 0) * 1000;
    return Date.now() < expMs ? router.createUrlTree(['/home']) : true;
  } catch { return true; }
};
