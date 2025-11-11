import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { NgxSpinnerModule } from 'ngx-spinner';
import { ToastrService } from 'ngx-toastr';
import { TranslateService, TranslateModule } from '@ngx-translate/core';
import { Subject, takeUntil } from 'rxjs';

import { AuthService } from '../../../core/services/auth.service';
import { SpinnerService } from '../../../core/services/spinner.service';
import { NotificationService } from '../../../core/services/notification.service';
import { TranslationService } from '../../../core/services/translation.service copy';
import { LoginUAEPassDto } from '../../../core/dtos/uaepass.dto';
import { ApiEndpoints } from '../../../core/constants/api-endpoints';
import { ProfileDbService } from '../../../core/services/profile-db.service';
import { UserProfile } from '../../../core/dtos/user-profile';

type ModalMode = 'login' | 'signUpInstitution' | 'signUpIndividual';
declare var bootstrap: any;

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, NgxSpinnerModule, TranslateModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent implements OnInit, OnDestroy {
  form!: FormGroup;
  submitted = false;
  uaePassParams = new LoginUAEPassDto();
  lang: string | null = null;
  destroy$ = new Subject<boolean>();
  modalMode: ModalMode = 'login';
  isLoading: boolean = false;

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router,
    private spinnerService: SpinnerService,
    private toastr: ToastrService,
    private translate: TranslateService,
    private notificationService: NotificationService,
    private route: ActivatedRoute,
    private profileDb: ProfileDbService,
  ) {
    this.form = this.fb.group({
      userName: ['', Validators.required],
      password: ['', Validators.required],
    });
  }



  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      const code = params['code'];
      const state = params['state'];
      this.uaePassParams = { code, state, lang: this.lang };
      if (code != undefined || state != undefined) {
        if (this.isValidCodeState(this.uaePassParams)) {
          this.spinnerService.show();
          this.getUAEPassInfo(this.uaePassParams);
        } else {
          const redirectUri = window.location.origin + '/login';
          const logoutURL =
            'https://stg-id.uaepass.ae/idshub/logout?redirect_uri=' +
            encodeURIComponent(redirectUri);

          this.translate
            .get(['COMMON.UAEPassCancelRequest'])
            .subscribe(translations => {
              this.toastr.error(translations['COMMON.UAEPassCancelRequest']);
            });

          setTimeout(() => {
            window.location.href = logoutURL;
            this.spinnerService.hide();
          }, 2000);
        }
      }
    });
  }

  /** Normal username/password login */
  // submit(): void {
  //   this.submitted = true;
  //   if (this.form.invalid) return;

  //   this.spinnerService.show();
  //   this.auth.login(this.form.value).subscribe({
  //     next: res => {
  //       this.handleLoginSuccess(res);
      
  //     },
  //     error: () => {
  //       this.toastr.error(this.translate.instant('AUTH.MESSAGES.LOGIN_FAILED'), this.translate.instant('TOAST.TITLE.ERROR'));
  //       this.spinnerService.hide();
  //     }
  //   });
  // }
  /** Normal username/password login */
submit(): void {
  this.submitted = true;
  if (this.form.invalid) return;

  this.spinnerService.show();

  this.auth.login(this.form.value).subscribe({
    next: (res) => {
      // لو السيرفر رجع توكين (سيناريو UAEPASS)، خزّنه
      if (res?.token) {
        this.auth.saveToken(res.token);
      }

      // Two-Factor؟
      if (res?.isTwoFactorEnabled) {
        localStorage.setItem(
          'comeFromisTwoFactorEnabled',
          JSON.stringify({ isTwoFactorEnabled: true })
        );
        this.router.navigate(['/verify-otp']);
        this.spinnerService.hide();
        return;
      }

      // غير كده: هات البروفايل وخزّنه في IndexedDB + الميموري
      this.auth.GetMyProfile().subscribe({
        next: async (profile: UserProfile) => {
          await this.profileDb.saveProfile(profile);
          this.auth.setProfile(profile);

          this.toastr.success(
            this.translate.instant('LOGIN.SUCCESS'),
            this.translate.instant('TOAST.TITLE.SUCCESS')
          );

          // (اختياري) لو عندك جلسة Notifications
          try { await this.notificationService.initializeUserSession(); } catch {}

          this.router.navigate(['/home']);
        },
        error: () => {
          this.toastr.error(
            this.translate.instant('AUTH.MESSAGES.LOGIN_FAILED'),
            this.translate.instant('TOAST.TITLE.ERROR')
          );
        },
        complete: () => this.spinnerService.hide()
      });
    },
    error: (error) => {
      this.toastr.error(
        error?.error?.reason ? error?.error?.reason:this.translate.instant('AUTH.MESSAGES.LOGIN_FAILED'),
        this.translate.instant('TOAST.TITLE.ERROR')
      );
      this.spinnerService.hide();
    }
  });
}


  private handleLoginSuccess(res: any): void {
    if (res?.token) {
      this.auth.saveToken(res.token);
    }

    if (res?.isTwoFactorEnabled) {
      localStorage.setItem(
        'comeFromisTwoFactorEnabled',
        JSON.stringify({ isTwoFactorEnabled: true })
      );
      this.router.navigate(['/verify-otp']);
      this.spinnerService.hide();
      return;
    }

    this.auth.GetMyProfile().subscribe({
      next: async (profile: UserProfile) => {
        await this.profileDb.saveProfile(profile);
        this.auth.setProfile(profile);

        this.toastr.success(
          this.translate.instant('LOGIN.SUCCESS'),
          this.translate.instant('TOAST.TITLE.SUCCESS')
        );

        try { await this.notificationService.initializeUserSession(); } catch { }

        this.router.navigate(['/home']);
      },
      error: (err) => {
        this.toastr.error(
          this.translate.instant('AUTH.MESSAGES.LOGIN_FAILED'),
          this.translate.instant('TOAST.TITLE.ERROR')
        );
      },
      complete: () => this.spinnerService.hide()
    });
    this.initializeNotificationSession();
     this.spinnerService.hide(); 
    this.router.navigate(['/home']);
  }

  private handleUAEPassLogin(params: LoginUAEPassDto): void {
    this.auth.UAEPasslogin(params)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.handleLoginSuccess(res);
          this.spinnerService.hide();
        },
        error: (err) => {
          this.handleUAEPassError(err);
          this.spinnerService.hide();
        }
      });
  }

    getUAEPassInfo(params: LoginUAEPassDto): void {
    const storedState = sessionStorage.getItem('uae_pass_state');
    if (storedState && storedState !== params.state) {
      this.toastr.error('Security validation failed', 'Error');
      this.spinnerService.hide();
      return;
    }

    const storedMode = sessionStorage.getItem('uae_pass_mode') as ModalMode;
    if (storedMode) this.modalMode = storedMode;

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
    }

    sessionStorage.removeItem('uae_pass_mode');
    sessionStorage.removeItem('uae_pass_state');
  }

  

  loginByUAEPass(): void {
    this.modalMode = 'login';
    this.redirectToUAEPass();
  }

  routeToForgetPassword(): void {
    this.router.navigate(['/forgot-password']);
  }

  routeToInstitutionRegistration(): void {
    this.modalMode = 'signUpInstitution';
    this.redirectToUAEPass();
  }

  routeToIndividualRegistration(): void {
    this.modalMode = 'signUpIndividual';
    this.redirectToUAEPass();
  }

  private redirectToUAEPass(): void {
    this.spinnerService.show();

    const config = ApiEndpoints.UAE_PASS_CONFIG.getURLCredention;
    const baseUrl = ApiEndpoints.UAE_PASS_CONFIG.baseUrl;

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




  
  private handleUAEPassInstitutionSignup(params: LoginUAEPassDto): void {
    this.auth.GetUAEPassInfo(params)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: res => {
          this.handleUAEPassInstitutionSignupSuccess(res);
        },
        error: err => {
          this.handleUAEPassError(err);
          this.spinnerService.hide();
        }
      });
  }

  private handleUAEPassInstitutionSignupSuccess(res: any): void {
    if (res.isExists) {
      this.toastr.error(res.message);
      this.redirectToLogout();
      return;
    }
    localStorage.setItem('UAEPassInfo', JSON.stringify(res?.user));
    this.router.navigate(['/register/institution']);
    this.spinnerService.hide();
  }

  private handleUAEPassIndividualSignup(params: LoginUAEPassDto): void {
    this.auth.GetUAEPassInfo(params)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: res => {
          this.handleUAEPassIndividualSignupSuccess(res);
        },
        error: err => {
          this.handleUAEPassError(err);
          this.spinnerService.hide();
        }
      });
  }

  private handleUAEPassIndividualSignupSuccess(res: any): void {
    if (res.isExists) {
      this.toastr.error(res.message);
      this.redirectToLogout();
      return;
    }
    localStorage.setItem('UAEPassInfo', JSON.stringify(res?.user));
    this.router.navigate(['/register/individual']);
    this.spinnerService.hide();
  }

  private handleUAEPassError(err: any): void {
    const errormessage = err.error.reason;
    const notVerifiedText = this.translate.instant('COMMON.notVerifiedUser');
    const message = err.error.message || err.error.reason || 'UAE Pass authentication failed';

    if (message === notVerifiedText) {
      const modalElement = document.getElementById('notVerifiedUser');
      if (modalElement) {
        const modal = new bootstrap.Modal(modalElement);
        modal.show();
      }
    } else {
      this.toastr.error(this.translate.instant(message), this.translate.instant('TOAST.TITLE.ERROR'));
      this.redirectToLogout();
    }
    this.spinnerService.hide();
  }

  private redirectToLogout(): void {
    const redirectUri = window.location.origin + '/login';
    const logoutURL = `${ApiEndpoints.UAE_PASS_CONFIG.baseUrl}/logout?redirect_uri=${encodeURIComponent(redirectUri)}`;
    setTimeout(() => (window.location.href = logoutURL), 2000);
  }

  private async initializeNotificationSession(): Promise<void> {
    try {
      await this.notificationService.initializeUserSession();
    } catch (error) {
      // Error handled silently
    }
  }

  private extractUserIdFromToken(decodedData: any): string | null {
    const possibleClaims = [
      'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier',
      'nameidentifier',
      'sub',
      'user_id',
      'userId',
      'id',
      'uid',
      'userid'
    ];
    for (const claim of possibleClaims) {
      if (decodedData[claim]) return decodedData[claim].toString();
    }
    return null;
  }

  private generateRandomState(): string {
    return Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15);
  }

  isValidCodeState(params: any): boolean {
    return !!(params.code && params.state && params.code.trim() !== '' && params.state.trim() !== '');
  }

  ngOnDestroy(): void {
    this.destroy$.next(true);
    this.destroy$.complete();
  }

  logout(): void {
    this.redirectToLogout();
  }
}
