import { Routes } from '@angular/router';

export const aboutRoutes: Routes = [
  {
    path: '',
    children: [
      {
        path: 'councile',
        loadComponent: () =>
          import('./aboutcouncile/aboutcouncile.component')
            .then(m => m.AboutcouncileComponent),
      },
      {
        path: 'manager-message',
        loadComponent: () =>
          import('./aboutmanagermessage/aboutmanagermessage.component')
            .then(m => m.AboutmanagermessageComponent),
      }
    ],
  },
]; 
