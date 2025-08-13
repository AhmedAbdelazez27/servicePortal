import { Routes } from '@angular/router';
import { EditProfileComponent } from './edit-profile.component.js';
import { authGuard } from '../../../core/guards/auth/auth-guars';

export const editProfileRoutes: Routes = [
  {
    path: '',
    component: EditProfileComponent,
    canActivate: [authGuard]
  }
];
