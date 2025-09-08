import { inject } from '@angular/core';
import { CanActivateChildFn, Router, UrlTree } from '@angular/router';

function isLoggedIn(): boolean {
  const token = localStorage.getItem('access_token');
  if (!token) return false;

  try {
    const payloadPart = token.split('.')[1];
    if (!payloadPart) return false;

    // Base64URL → Base64
    const base64 = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(base64);
    const payload = JSON.parse(json);

    const expMs = (payload?.exp ?? 0) * 1000;
    if (!expMs) return false;               
    return Date.now() < expMs;              
  } catch {
    return false;
  }
}

export const authChildGuard: CanActivateChildFn = (_route, state): boolean | UrlTree => {
  const router = inject(Router);
  return isLoggedIn()
    ? true
    : router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};
