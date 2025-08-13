import { Routes } from '@angular/router';
import { CharityEventPermitRequestComponent } from './charity-event-permit-request/charity-event-permit-request.component';
import { authGuard } from '../../../core/guards/auth/auth-guars';

export const servicesRequestsRoutes: Routes = [
   {
    path: '',
    children: [
      {
        path: 'charity-event-permit-request',
        loadComponent: () =>
          import('./charity-event-permit-request/charity-event-permit-request.component')
            .then(m => m.CharityEventPermitRequestComponent),
      },
    ],
  },
]; 