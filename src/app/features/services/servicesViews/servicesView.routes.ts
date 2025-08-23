import { Routes } from '@angular/router';
import { authGuard } from '../../../core/guards/auth/auth-guars';

export const servicesViewsRoutes: Routes = [
  {
    path: '',
    children: [
      {
        path: 'request-event-permit/:id',
         canActivate: [authGuard],
        loadComponent: () =>
          import('./view-requesteventpermit/view-requesteventpermit.component')
            .then(m => m.ViewRequesteventpermitComponent),
      },
      {
        path: 'charity-event-permit/:id',
         canActivate: [authGuard],
        loadComponent: () =>
          import('./view-charityrequest/view-charityrequest.component')
            .then(m => m.ViewCharityEventPermitComponent),
      },
    ],
  },
]; 