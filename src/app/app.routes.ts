import { Routes } from '@angular/router';
import { PageNotFoundComponent } from './shared/components/page-not-found/page-not-found.component';
import { MainLayoutComponent } from './shared/layout/main-layout.component';
export const routes: Routes = [
  {
    path: '',
    component: MainLayoutComponent,
    children: [
      {
        path: '',
        redirectTo: 'home',
        pathMatch: 'full'
      },
      {
        path: 'home',
        loadComponent: () =>
          import('./features/home/home/home.component').then((m) => m.HomeComponent)
      },
      {
        path: 'login',
        loadComponent: () =>
          import('./features/auth/login/login.component').then((m) => m.LoginComponent)
      },
    ]
  },
  { path: '**', component: PageNotFoundComponent }
];
