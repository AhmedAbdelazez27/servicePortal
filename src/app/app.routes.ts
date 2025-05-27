import { Routes } from '@angular/router';
import { LoginComponent } from './features/auth/login/login.component';
import { HomeComponent } from './features/home/home/home.component';
import { authGuard } from './core/guards/auth/auth-guars';
import { PageNotFoundComponent } from './shared/components/page-not-found/page-not-found.component';
export const routes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'home', component: HomeComponent }, //canActivate: [authGuard] 
  { path: '**', component: PageNotFoundComponent }
];
