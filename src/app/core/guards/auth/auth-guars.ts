import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { map, take } from 'rxjs';


export const authGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return auth.user$.pipe(
    take(1), 
    map(user => {
      console.log("user 1 ",user);
      console.log("isloggedin ",auth.isLoggedIn());
      
      
      if (user?.userId || auth.isLoggedIn()) {
        return true;
      }

      console.warn('[AuthGuard] Unauthorized access to:', state.url);
      return router.createUrlTree(['/login'], {
        queryParams: { returnUrl: state.url }
      });
    })
  );
};
