import { Routes } from '@angular/router';
import { PageNotFoundComponent } from './shared/components/page-not-found/page-not-found.component';
import { MainLayoutComponent } from './shared/layout/main-layout.component';

import { ForgetpasswordComponent } from './features/auth/forgetpassword/forgetpassword.component';
import { VerifyotpComponent } from './features/auth/verifyotp/verifyotp.component';
import { ResetpasswordComponent } from './features/auth/resetpassword/resetpassword.component';
import { authGuard, loginGuard } from './core/guards/auth/auth-guars';
import { LoginComponent } from './features/auth/login/login.component';



export const routes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' },

  // All routes as children of MainLayoutComponent (navbar/footer on all pages)
  {
    path: '',
    component: MainLayoutComponent,
    children: [
      {
        path: '',
        redirectTo: 'home',
        pathMatch: 'full'
      },

      // Home page - accessible without authentication
      {
        path: 'home',
        loadComponent: () =>
          import('./features/home/home/home.component').then((m) => m.HomeComponent)
      },

      // Services routes - accessible without authentication
      {
        path: 'services',
        loadComponent: () =>
          import('./features/home/services-list/services-list.component').then((m) => m.ServicesListComponent)
      },
      {
        path: 'service-details/:id',
        loadComponent: () =>
          import('./features/home/service-details/service-details.component').then((m) => m.ServiceDetailsComponent)
      },
      {
        path: 'request-plaint',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/home/request-plaint/request-plaint.component').then((m) => m.RequestPlaintComponent)
      },

      // Contact Us route - accessible without authentication
      {
        path: 'contact-us',
        loadComponent: () =>
          import('./features/home/contact-us/contact-us.component').then((m) => m.ContactUsComponent)
      },

      // Authentication routes
      {
        path: 'login', canActivate: [loginGuard], loadComponent: () =>
          import('./features/auth/login/login.component').then((m) => m.LoginComponent)
      },
      {
        path: 'forgot-password', canActivate: [loginGuard], loadComponent: () =>
          import('./features/auth/forgetpassword/forgetpassword.component').then((m) => m.ForgetpasswordComponent)
      },
      {
        path: 'verify-otp', canActivate: [loginGuard], loadComponent: () =>
          import('./features/auth/verifyotp/verifyotp.component').then((m) => m.VerifyotpComponent)
      },
      {
        path: 'reset-password', canActivate: [loginGuard], loadComponent: () =>
          import('./features/auth/resetpassword/resetpassword.component').then((m) => m.ResetpasswordComponent)
      },
      {
        path: 'register/individual', /* canActivate: [loginGuard], */ loadComponent: () =>
          import('./features/auth/registration/individualregistration/individualregistration.component').then((m) => m.IndividualregistrationComponent)
      },
      {
        path: 'register/institution', /* canActivate: [loginGuard], */ loadComponent: () =>
          import('./features/auth/registration/institutionregistration/institutionregistration.component').then((m) => m.InstitutionregistrationComponent)
      },
      {
        path: 'register/pending', /* canActivate: [loginGuard], */ loadComponent: () =>
          import('./features/auth/registration/registration-pending/registration-pending.component').then((m) => m.RegistrationPendingComponent)
      },

      // // Users routes - require authentication
      // {
      //   path: 'users',
      //   canActivate: [authGuard],
      //   loadChildren: () => import('./features/users/users.routes').then((m) => m.usersRoutes)
      // },

      // Edit Profile routes - require authentication
      {
        path: 'edit-profile',
        canActivate: [authGuard],
        loadChildren: () => import('./features/auth/EditProfile/edit-profile.routes').then((m) => m.editProfileRoutes)
      },
      {
        path: 'services-requests',
        //  canActivate: [authGuard],
        loadChildren: () => import('./features/services/servicesRequests/servicesRequests.routes').then((m) => m.servicesRequestsRoutes)
      }
      // Add other authenticated routes here as children with authGuard
      // Example:
      // { path: 'dashboard', canActivate: [authGuard], loadComponent: () =>
      //   import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent) },
    ]
  },
  { path: '**', component: PageNotFoundComponent }
];
