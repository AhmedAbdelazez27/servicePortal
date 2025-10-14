import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { map, take } from 'rxjs';

export const loginGuard: CanActivateFn = ():any => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return auth.user$.pipe(
    take(1),
    map(user => {
      if (user?.userId) {
        return router.createUrlTree(['/home']);
      }

      if (auth.isLoggedIn()) {
        return router.createUrlTree(['/home']);
      }

      return true;
    })
  );
};
