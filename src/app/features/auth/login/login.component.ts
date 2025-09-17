import { Component } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { SpinnerService } from '../../../core/services/spinner.service';
import { NgxSpinnerModule } from 'ngx-spinner';
import { ToastrService } from 'ngx-toastr';
import { TranslateService, TranslateModule } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import { NotificationService } from '../../../core/services/notification.service';
import { TranslationService } from '../../../core/services/translation.service copy';
import { LoginUAEPassDto } from '../../../core/dtos/uaepass.dto';
import { Subject, takeUntil } from 'rxjs';
import { ApiEndpoints } from '../../../core/constants/api-endpoints';
type ModalMode = 'login' | 'signUpInstitution' | 'signUpIndividual';

@Component({
  selector: 'app-login',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, NgxSpinnerModule, TranslateModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  form !: FormGroup;
  submitted: boolean = false;
  uaePassParams = new LoginUAEPassDto();
  lang: string | null = null;
  destroy$ = new Subject<boolean>();
  modalMode: ModalMode = 'login';

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router,
    private spinnerService: SpinnerService,
    private toastr: ToastrService,
    private translate: TranslateService,
    private notificationService: NotificationService,
    private route: ActivatedRoute,
    private translation: TranslationService
  ) {
    this.form = this.fb.group({
      userName: ['', Validators.required],
      password: ['', Validators.required],
    });
  }


  ngOnInit() {
    this.lang = localStorage.getItem('lang');

    this.route.queryParams.subscribe(params => {
      this.uaePassParams = {
        code: params['code'],
        state: params['state'],
        lang: this.lang
      };

    
      if (this.isValidCodeState(this.uaePassParams)) {
        this.getUAEPassInfo(this.uaePassParams);
      } else {
        console.log('Code or state is invalid. API call not made.');
      }
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


  loginByUAEPass(): void {
    this.modalMode = 'login';
    this.redirectToUAEPass();
  }

  routeToForgetPassword(){
    this.router.navigate(['/forgot-password']);
  }

  routeToInstitutionRegistration() {
    this.modalMode = 'signUpInstitution';
    this.redirectToUAEPass();
  }

  routeToIndividualRegistration() {
    this.modalMode = 'signUpIndividual';
    this.redirectToUAEPass();
  }

  isValidCodeState(params: any): boolean {
    return !!(params.code && params.state && params.code.trim() !== '' && params.state.trim() !== '');
  }

  private generateRandomState(): string {
    return Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15);
  }

  private redirectToUAEPass(): void {
    const config = ApiEndpoints.UAE_PASS_CONFIG.getURLCredention; // Change to production when needed
    const baseUrl = ApiEndpoints.UAE_PASS_CONFIG.baseUrl; // Change to production when needed
    const state = this.generateRandomState();
    const uaePassURL =
      `${baseUrl}/authorize` +
      `?response_type=code` +
      `&client_id=${config.clientId}` +
      `&scope=urn:uae:digitalid:profile:general` +
      `&state=${config.clientsecret}` +
      `&redirect_uri=${encodeURIComponent(config.redirectUri)}` +
      `&acr_values=urn:safelayer:tws:policies:authentication:level:low` +
      `&ui_locales=${this.lang}`;

    sessionStorage.setItem('uae_pass_mode', this.modalMode);
    sessionStorage.setItem('uae_pass_state', config.clientsecret);

    window.location.href = uaePassURL;
  }

  getUAEPassInfo(params: LoginUAEPassDto) {
   
    this.spinnerService.show();
    const storedState = sessionStorage.getItem('uae_pass_state');
    if (storedState && storedState !== params.state) {
      this.toastr.error('Security validation failed', 'Error');
      this.spinnerService.hide();
      return;
    }
    const storedMode = sessionStorage.getItem('uae_pass_mode') as ModalMode;
    if (storedMode) {
      this.modalMode = storedMode;
    }
    switch (this.modalMode) {
      case 'login':
        this.handleUAEPassLogin(params);
        break;
      case 'signUpInstitution':
        this.handleUAEPassInstitutionSignup(params);
        break;
      case 'signUpIndividual':
        this.handleUAEPassIndividualSignup(params);
        break;
      default:
        console.error('Invalid modal mode:', this.modalMode);
        this.spinnerService.hide();
    }
    sessionStorage.removeItem('uae_pass_mode');
    sessionStorage.removeItem('uae_pass_state');
  }

  private handleUAEPassLogin(params: LoginUAEPassDto): void {
    this.auth.UAEPasslogin(params)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.handleLoginSuccess(res);
        },
        error: (err) => {
          this.handleUAEPassError(err);
        },
        complete: () => {
          this.spinnerService.hide();
        }
      });
  }

  private handleLoginSuccess(res: any): void {
    this.auth.saveToken(res?.token);
    const decodedData = this.auth.decodeToken();

    if (decodedData) {
      if (decodedData.Permissions) {
        localStorage.setItem('permissions', JSON.stringify(decodedData.Permissions));
      }

      if (decodedData['http://schemas.microsoft.com/ws/2008/06/identity/claims/role']) {
        localStorage.setItem('pages', JSON.stringify(decodedData['http://schemas.microsoft.com/ws/2008/06/identity/claims/role']));
      }

      const userId = this.extractUserIdFromToken(decodedData);
      if (userId) {
        localStorage.setItem('userId', userId);
      } else {
        this.toastr.error(this.translate.instant('AUTH.MESSAGES.TOKEN_EXTRACTION_ERROR'), this.translate.instant('TOAST.TITLE.ERROR'));
        this.spinnerService.hide();
        return;
      }
    } else {
      this.toastr.error(this.translate.instant('AUTH.MESSAGES.INVALID_TOKEN_ERROR'), this.translate.instant('TOAST.TITLE.ERROR'));
      this.spinnerService.hide();
      return;
    }

    this.toastr.success(this.translate.instant('AUTH.MESSAGES.LOGIN_SUCCESS'), this.translate.instant('TOAST.TITLE.SUCCESS'));
    this.spinnerService.hide();
    this.initializeNotificationSession();

    this.router.navigate(['/home']);
  }


  private handleUAEPassInstitutionSignup(params: LoginUAEPassDto): void {
    this.auth.GetUAEPassInfo(params)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          localStorage.setItem('UAEPassInfo', JSON.stringify(res));
          this.spinnerService.hide();
          this.router.navigate(['/register/institution']);
        },
        error: (err) => {
          this.handleUAEPassError(err);
        },
        complete: () => {
          this.spinnerService.hide();
        }
      });
  }

  /**
   * Handle UAE Pass individual signup
   */
  private handleUAEPassIndividualSignup(params: LoginUAEPassDto): void {
    this.auth.GetUAEPassInfo(params)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          localStorage.setItem('UAEPassInfo', JSON.stringify(res));
          this.spinnerService.hide();
          this.router.navigate(['/register/individual']);
        },
        error: (err) => {
          this.handleUAEPassError(err);
        },
        complete: () => {
          this.spinnerService.hide();
        }
      });
  }

  private handleUAEPassError(err: any): void {
    const message = err.error?.message || err.error?.reason || 'UAE Pass authentication failed';
    this.toastr.error(this.translate.instant(message), this.translate.instant('TOAST.TITLE.ERROR'));

    // Redirect to UAE Pass logout
    const redirectUri = window.location.origin + '/login';
    const logoutURL = `${ApiEndpoints.UAE_PASS_CONFIG.baseUrl}/logout?redirect_uri=${encodeURIComponent(redirectUri)}`;

    setTimeout(() => {
      window.location.href = logoutURL;
    }, 2000); // Give user time to read the error message

    this.spinnerService.hide();
  }

  ngOnDestroy() {
    this.destroy$.next(true);
    this.destroy$.complete();
  }
}

