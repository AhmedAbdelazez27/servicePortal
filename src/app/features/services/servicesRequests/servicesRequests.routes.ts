import { Routes } from '@angular/router';
import { authGuard } from '../../../core/guards/auth/auth-guars';

export const servicesRequestsRoutes: Routes = [
  {
    path: '',
    children: [
      {
        path: 'charity-event-permit-request',
         canActivate: [authGuard],
        loadComponent: () =>
          import('./charity-event-permit-request/charity-event-permit-request.component')
            .then(m => m.CharityEventPermitRequestComponent),
      },
      {
        path: 'request-event-permits',
         canActivate: [authGuard],
        loadComponent: () =>
          import('./request-event-permits/request-event-permits.component')
            .then(m => m.RequestEventPermitsComponent),
      },
      {
        path: 'previous-aid-requests/:idNumber',
         canActivate: [authGuard],
        loadComponent: () =>
          import('./previous-aid-requests/previous-aid-requests.component')
            .then(m => m.PreviousAidRequestsComponent),
      },
      {
        path: 'previous-aid-requests',
         canActivate: [authGuard],
        loadComponent: () =>
          import('./previous-aid-requests/previous-aid-requests.component')
            .then(m => m.PreviousAidRequestsComponent),
      },
    ],
  },
]; 








