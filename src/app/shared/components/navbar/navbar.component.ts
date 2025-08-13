import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ToastrService } from 'ngx-toastr';
import { TranslateService, TranslateModule } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-navbar',
  imports: [CommonModule, TranslateModule, RouterModule],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss'
})
export class NavbarComponent {

  constructor(
    private authService: AuthService,
    private toastr: ToastrService,
    private translate: TranslateService,
    private router: Router
  ) {}

  isLoggedIn(): boolean {
    return this.authService.isLoggedIn();
  }

  isLoginPage(): boolean {
    return this.router.url === '/login';
  }

  shouldShowLoginButton(): boolean {
    return !this.isLoggedIn() && !this.isLoginPage();
  }

  onChangePassword(): void {
    // TODO: Implement change password functionality
    console.log('Change Password clicked');
  }

  onProfile(): void {
    this.router.navigate(['/edit-profile']);
  }

  onLogout(): void {
    this.authService.logout();
    this.toastr.success(
      this.translate.instant('AUTH.MESSAGES.LOGOUT_SUCCESS'), 
      this.translate.instant('TOAST.TITLE.SUCCESS')
    );
  }

  onLogin(): void {
    this.router.navigate(['/login']);
  }

}
