import { Component } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { SpinnerService } from '../../../core/services/spinner.service';
import { NgxSpinnerModule } from 'ngx-spinner';
import { ToastrService } from 'ngx-toastr';
import { TranslateService, TranslateModule } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-login',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, NgxSpinnerModule, TranslateModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  form !: FormGroup;
  submitted: boolean = false;

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router,
    private spinnerService: SpinnerService,
    private toastr: ToastrService,
    private translate: TranslateService,
    private notificationService: NotificationService
  ) {
    this.form = this.fb.group({
      userName: ['', Validators.required],
      password: ['', Validators.required],
    });
  }

  submit(): void {
    this.submitted = true;
    if (this.form.invalid) return;
    this.spinnerService.show();

    this.auth.login(this.form.value).subscribe({
      next: (res) => {
        this.auth.saveToken(res?.token);
        const decodedData = this.auth.decodeToken();
        
        
        if (decodedData) {
          // Store permissions if they exist (optional)
          if (decodedData.Permissions) {
            const permissions = decodedData.Permissions;
            localStorage.setItem('permissions', JSON.stringify(permissions));
          }
          
          // Store pages/roles if they exist (optional)
          if (decodedData['http://schemas.microsoft.com/ws/2008/06/identity/claims/role']) {
            localStorage.setItem('pages', JSON.stringify(decodedData['http://schemas.microsoft.com/ws/2008/06/identity/claims/role']));
          }
          
          // Extract and store user ID (required)
          let userId = this.extractUserIdFromToken(decodedData);
          
          if (userId) {
            localStorage.setItem('userId', userId);
            console.log('User ID stored:', userId);
          } else {
            console.error('Could not extract user ID from token. Available claims:', Object.keys(decodedData));
            this.toastr.error(this.translate.instant('AUTH.MESSAGES.TOKEN_EXTRACTION_ERROR'), this.translate.instant('TOAST.TITLE.ERROR'));
            this.spinnerService.hide();
            return;
          }
        } else {
          console.error('Failed to decode token');
          this.toastr.error(this.translate.instant('AUTH.MESSAGES.INVALID_TOKEN_ERROR'), this.translate.instant('TOAST.TITLE.ERROR'));
          this.spinnerService.hide();
          return;
        }

        this.toastr.success(this.translate.instant('AUTH.MESSAGES.LOGIN_SUCCESS'), this.translate.instant('TOAST.TITLE.SUCCESS'));
        this.spinnerService.hide();
        
        // 🔔 Initialize notification session after successful login
        this.initializeNotificationSession();
        
        this.router.navigate(['/home']);
      },
      error: () => {
        this.toastr.error(this.translate.instant('AUTH.MESSAGES.LOGIN_FAILED'), this.translate.instant('TOAST.TITLE.ERROR'));
        this.spinnerService.hide();
      },
      complete: () => {
        this.spinnerService.hide();
      }
    });
  }

  /**
   * Initialize notification session after successful login
   */
  private async initializeNotificationSession(): Promise<void> {
    try {
      console.log('🔔 Login: Initializing notification session after login...');
      
      // Initialize user notification session (this will only run once per session)
      await this.notificationService.initializeUserSession();
      
      console.log('🔔 Login: Notification session initialized successfully');
    } catch (error) {
      console.error('🔔 Login: Error initializing notification session:', error);
      // Don't show error to user as this shouldn't block the login flow
    }
  }

  private extractUserIdFromToken(decodedData: any): string | null {
    // Try multiple possible claim names for user ID
    const possibleUserIdClaims = [
      'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier',
      'nameidentifier',
      'sub',
      'user_id',
      'userId',
      'id',
      'uid',
      'userid'
    ];

    for (const claim of possibleUserIdClaims) {
      if (decodedData[claim]) {
        console.log(`Found user ID in claim: ${claim} = ${decodedData[claim]}`);
        return decodedData[claim].toString();
      }
    }

    // If no standard claims found, try to find any claim that looks like a user ID
    for (const [key, value] of Object.entries(decodedData)) {
      if (typeof value === 'string' && value.length > 0 && value.length < 50) {
        // Check if it looks like a user ID (alphanumeric, no special chars except - and _)
        if (/^[a-zA-Z0-9_-]+$/.test(value)) {
          console.log(`Potential user ID found in claim: ${key} = ${value}`);
          return value;
        }
      }
    }

    return null;
  }

  routeToForgetPassword(){
    this.router.navigate(['/forgot-password']);
  }

  routeToInstitutionRegistration(){
    this.router.navigate(['/register/institution']);
  }

  routeToIndividualRegistration(){
    this.router.navigate(['/register/individual']);
  }
}

