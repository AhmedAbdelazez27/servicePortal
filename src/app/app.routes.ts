import { Routes } from '@angular/router';
import { PageNotFoundComponent } from './shared/components/page-not-found/page-not-found.component';
import { MainLayoutComponent } from './shared/layout/main-layout.component';

import { authChildGuard } from './core/guards/auth/auth-child.guard';
import { authMatchGuard } from './core/guards/auth/auth-match.guard';
import { loginGuard } from './core/guards/auth/login.guard';

export const routes: Routes = [
{
  path: '',
  component: MainLayoutComponent,
  children: [
    // --- Public routes ---
    { path: '', redirectTo: 'home', pathMatch: 'full' },
    { path: 'home', loadComponent: () => import('./features/home/home/home.component').then(m => m.HomeComponent) },
    { path: 'services', loadComponent: () => import('./features/home/services-list/services-list.component').then(m => m.ServicesListComponent) },
    { path: 'service-details/:id', loadComponent: () => import('./features/home/service-details/service-details.component').then(m => m.ServiceDetailsComponent) },
    { path: 'contact-us', loadComponent: () => import('./features/home/contact-us/contact-us.component').then(m => m.ContactUsComponent) },
    { path: 'about', loadChildren: () => import('./features/about/about.routes').then(m => m.aboutRoutes) },
    { path: 'charity-organizations', loadComponent: () => import('./features/charity-organizations/charity-organizations.component').then(m => m.CharityOrganizationsComponent) },
    { path: 'polls', loadComponent: () => import('./features/polls/polls.component').then(m => m.PollsComponent) },
    { path: 'initiatives', loadComponent: () => import('./features/initiatives/initiatives.component').then(m => m.InitiativesComponent) },
    { path: 'initiative-details/:id', loadComponent: () => import('./features/initiatives/initiative-details/initiative-details.component').then(m => m.InitiativeDetailsComponent) },
    { path: 'hero-section-details/:id', loadComponent: () => import('./features/home/hero-section-details/hero-section-details.component').then(m => m.HeroSectionDetailsComponent) },

    // --- Auth routes  ---
    { path: 'login',canActivate:[loginGuard], loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent) },
    { path: 'forgot-password', loadComponent: () => import('./features/auth/forgetpassword/forgetpassword.component').then(m => m.ForgetpasswordComponent) },
    { path: 'verify-otp', loadComponent: () => import('./features/auth/verifyotp/verifyotp.component').then(m => m.VerifyotpComponent) },
    { path: 'reset-password', loadComponent: () => import('./features/auth/resetpassword/resetpassword.component').then(m => m.ResetpasswordComponent) },
    { path: 'register/individual', loadComponent: () => import('./features/auth/registration/individualregistration/individualregistration.component').then(m => m.IndividualregistrationComponent) },
    { path: 'register/institution', loadComponent: () => import('./features/auth/registration/institutionregistration/institutionregistration.component').then(m => m.InstitutionregistrationComponent) },
    { path: 'register/pending', loadComponent: () => import('./features/auth/registration/registration-pending/registration-pending.component').then(m => m.RegistrationPendingComponent) },

    // --- Protected group ---
    {
      path: '',
      canActivateChild: [authChildGuard], 
      children: [
        { path: 'request', loadComponent: () => import('./features/mainApplyService/Pages/mainApplyService.component').then(m => m.MainApplyServiceComponent) },
        { path: 'request-plaint', loadComponent: () => import('./features/home/request-plaint/request-plaint.component').then(m => m.RequestPlaintComponent) },
        { path: 'request-complaint', loadComponent: () => import('./features/home/RequestComplaint/request-complaint.component').then(m => m.RequestComplaintComponent) },
        { path: 'fasting-tent-request', loadComponent: () => import('./features/home/fasting-tent-request/fasting-tent-request.component').then(m => m.FastingTentRequestComponent) },
        { path: 'view-fasting-tent-request/:id', loadComponent: () => import('./features/home/view-fasting-tent-request/view-fasting-tent-request.component').then(m => m.ViewFastingTentRequestComponent) },
        { path: 'distribution-site-permit', loadComponent: () => import('./features/home/distribution-site-permit/distribution-site-permit.component').then(m => m.DistributionSitePermitComponent) },
        { path: 'view-distribution-site-permit/:id', loadComponent: () => import('./features/home/view-distribution-site-permit/view-distribution-site-permit.component').then(m => m.ViewDistributionSitePermitComponent) },

        // lazy modules
        { path: 'notifications', canMatch: [authMatchGuard], loadChildren: () => import('./features/notifications/notification-management/notification-management.routes').then(m => m.notificationManagementRoutes) },
        { path: 'edit-profile', canMatch: [authMatchGuard], loadChildren: () => import('./features/auth/EditProfile/edit-profile.routes').then(m => m.editProfileRoutes) },
        { path: 'services-requests', canMatch: [authMatchGuard], loadChildren: () => import('./features/services/servicesRequests/servicesRequests.routes').then(m => m.servicesRequestsRoutes) },
        { path: 'view-services-requests', canMatch: [authMatchGuard], loadChildren: () => import('./features/services/servicesViews/servicesView.routes').then(m => m.servicesViewsRoutes) },
      ]
    },
  ],
},
{ path: 'forbidden', loadComponent: () => import('./shared/components/forbidden/forbidden.component').then(m => m.ForbiddenComponent) },
{ path: '**', component: PageNotFoundComponent },
];
