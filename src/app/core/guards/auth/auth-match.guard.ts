// core/guards/auth/auth-match.guard.ts
import { inject } from '@angular/core';
import { CanMatchFn, Router, Route, UrlSegment } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { map, take } from 'rxjs';

export const authMatchGuard: CanMatchFn = (_route: Route, _segments: UrlSegment[]) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return auth.user$.pipe(
    take(1),
    map(user => {
      if (user?.userId || auth.isLoggedIn()) {
        return true;
      }
      // ممرر returnUrl مفيد لو عايز ترجع المستخدم لنفس المكان بعد اللوجين
      return router.createUrlTree(['/login'], { queryParams: { returnUrl: router.url || '/' } });
    })
  );
};
