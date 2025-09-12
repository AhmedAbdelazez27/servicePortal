import { Routes } from '@angular/router';
import { DisclaimerComponent } from './Disclaimer/disclaimer/disclaimer.component';
import { TermsandConditionsComponent } from './TermsandConditions/termsand-conditions/termsand-conditions.component';
import { PrivacyComponent } from './Privacy/privacy/privacy.component';

export const websitcontentRoutes: Routes = [
  {
    path: 'disclaimer',
    component:DisclaimerComponent
     
  },
  {
    path: 'Privacy',
    component:PrivacyComponent
     
  },
  {
    path: 'TermsandConditions',
    component:TermsandConditionsComponent
     
  },
];