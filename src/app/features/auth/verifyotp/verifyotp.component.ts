import { AuthService } from '../../../core/services/auth.service';
import { SpinnerService } from '../../../core/services/spinner.service';
import { Component, ElementRef, QueryList, ViewChildren, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ProfileDbService } from '../../../core/services/profile-db.service';
import { UserProfile } from '../../../core/dtos/user-profile';

@Component({
  selector: 'app-verifyotp',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, TranslateModule],
  templateUrl: './verifyotp.component.html',
  styleUrl: './verifyotp.component.scss'
})
export class VerifyotpComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly TIMER_DURATION = 120;
  private readonly TIMER_KEY = 'otpResendExpiry';

  otpForm: FormGroup;
  submitted = false;

  objectKeys: string[] = ['otp1', 'otp2', 'otp3', 'otp4', 'otp5'];

  timer: number = this.TIMER_DURATION;
  private timerId: any;

  forgetpasswordData: any;
  tokenVerify: string = '';

  @ViewChildren('otpInput') inputs!: QueryList<ElementRef<HTMLInputElement>>;
  isTwoFactorEnabled: boolean = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private toastr: ToastrService,
    private translate: TranslateService,
    private spinnerService: SpinnerService,
    private profileDb: ProfileDbService,
  ) {
    this.otpForm = this.fb.group({
      otp1: ['', Validators.required],
      otp2: ['', Validators.required],
      otp3: ['', Validators.required],
      otp4: ['', Validators.required],
      otp5: ['', Validators.required]
    });

    if (localStorage.getItem('forgetpasswordData')) {
      const data = localStorage.getItem('forgetpasswordData') || '{}';
      this.forgetpasswordData = JSON.parse(data);
      this.tokenVerify = this.forgetpasswordData?.sharedSecret;
    }
    if (JSON.parse(localStorage.getItem('comeFromisTwoFactorEnabled') || '{}')?.isTwoFactorEnabled) {
      this.isTwoFactorEnabled = true;
    } else {
      this.isTwoFactorEnabled = false;
    }
  }

  ngOnInit(): void {
    this.initTimerFromStorage();
    this.startTimer();
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.focusIndex(0), 0);
  }

  ngOnDestroy(): void {
    if (this.timerId) clearInterval(this.timerId);
    localStorage.removeItem("comeFromisTwoFactorEnabled");
    this.clearTimerStorage();
  }

  // ====== Auto-Tab Helpers ======
  private normalizeDigits(value: string): string {
    const eastern = '٠١٢٣٤٥٦٧٨٩';
    return value
      .split('')
      .map(ch => {
        const idx = eastern.indexOf(ch);
        return idx > -1 ? String(idx) : ch;
      })
      .join('')
      .replace(/\D/g, '');
  }

  private focusIndex(i: number) {
    const el = this.inputs?.get(i)?.nativeElement;
    if (el) {
      setTimeout(() => {
        el.focus();
        el.select();
      });
    }
  }

  onInput(e: Event, i: number) {
    const input = e.target as HTMLInputElement;
    let v = this.normalizeDigits(input.value);

    if (!v) {
      this.otpForm.get(this.objectKeys[i])?.setValue('');
      return;
    }

    if (v.length > 1) {
      const remaining = this.objectKeys.length - i;
      const digits = v.slice(0, remaining).split('');
      digits.forEach((d, offset) => {
        this.otpForm.get(this.objectKeys[i + offset])?.setValue(d, { emitEvent: false });
      });
      const nextIndex = Math.min(i + digits.length, this.objectKeys.length - 1);
      this.focusIndex(nextIndex);
      return;
    }

    this.otpForm.get(this.objectKeys[i])?.setValue(v, { emitEvent: false });
    if (i < this.objectKeys.length - 1) this.focusIndex(i + 1);
  }

  onKeyDown(e: KeyboardEvent, i: number) {
    const ctrl = this.otpForm.get(this.objectKeys[i]);
    const val = (ctrl?.value ?? '') as string;

    const allowed = [
      'Tab', 'Enter', 'ArrowLeft', 'ArrowRight', 'Home', 'End',
      'Backspace', 'Delete'
    ];
    if (allowed.includes(e.key) || (e.ctrlKey || e.metaKey)) {
      // Backspace 
      if (e.key === 'Backspace' && !val && i > 0) {
        e.preventDefault();
        this.otpForm.get(this.objectKeys[i - 1])?.setValue('', { emitEvent: false });
        this.focusIndex(i - 1);
      } else if (e.key === 'ArrowLeft' && i > 0) {
        e.preventDefault();
        this.focusIndex(i - 1);
      } else if (e.key === 'ArrowRight' && i < this.objectKeys.length - 1) {
        e.preventDefault();
        this.focusIndex(i + 1);
      }
      return;
    }


    if (e.key.length === 1 && !/[0-9٠-٩]/.test(e.key)) {
      e.preventDefault();
    }
  }

  onPaste(e: ClipboardEvent, i: number) {
    e.preventDefault();
    const text = e.clipboardData?.getData('text') ?? '';
    const digits = this.normalizeDigits(text)
      .slice(0, this.objectKeys.length - i)
      .split('');

    if (!digits.length) return;

    digits.forEach((d, offset) => {
      this.otpForm.get(this.objectKeys[i + offset])?.setValue(d, { emitEvent: false });
    });

    const nextIndex = Math.min(i + digits.length, this.objectKeys.length - 1);
    this.focusIndex(nextIndex);
  }
  // ====== /Auto-Tab Helpers ======

  startTimer() {
    if (this.timerId) clearInterval(this.timerId);
    this.timerId = setInterval(() => {
      const expiry = Number(localStorage.getItem(this.TIMER_KEY) || '0');
      const now = Date.now();
      const remaining = Math.max(0, Math.ceil((expiry - now) / 1000));
      this.timer = remaining;

      if (remaining <= 0) {
        clearInterval(this.timerId);
        localStorage.removeItem(this.TIMER_KEY);
      }
    }, 1000);
  }

  private initTimerFromStorage() {
    const expiry = Number(localStorage.getItem(this.TIMER_KEY) || '0');
    const now = Date.now();
    if (expiry > now) {
      this.timer = Math.max(0, Math.ceil((expiry - now) / 1000));
    } else {
      this.resetTimer(this.TIMER_DURATION);
    }
  }

  private resetTimer(seconds: number) {
    const expiry = Date.now() + seconds * 1000;
    localStorage.setItem(this.TIMER_KEY, expiry.toString());
    this.timer = seconds;
  }

  private clearTimerStorage() {
    localStorage.removeItem(this.TIMER_KEY);
  }

  submitOtp(): void {
    this.submitted = true;
    if (this.otpForm.invalid) return;
    this.spinnerService.show();
    const otpCode = this.objectKeys.map(k => this.otpForm.get(k)?.value ?? '').join('');

    if (this.isTwoFactorEnabled) {
      this.authService.VerifyTwoFactor({ otpCode }).subscribe({
        next: (res) => {


          // if (res) {
          //   this.toastr.success(
          //     this.translate.instant('OTP.VERIFY_SUCCESS'),
          //     this.translate.instant('TOAST.TITLE.SUCCESS')
          //   );
          // //   this.spinnerService.hide();
          // // this.router.navigate(['/home']);
          // } else {
          //   this.toastr.error(
          //     this.translate.instant('OTP.VERIFY_FAILED'),
          //     this.translate.instant('TOAST.TITLE.ERROR')
          //   );
          // }
        if (!res) {
          this.spinnerService.hide();
          this.toastr.error(this.translate.instant('OTP.VERIFY_FAILED'), this.translate.instant('TOAST.TITLE.ERROR'));
          return;
        }

        this.authService.GetMyProfile().subscribe({
          next: async (profile: UserProfile) => {
           await this.profileDb.saveProfile(profile);  
           this.authService.setProfile(profile);

            this.toastr.success(
              this.translate.instant('OTP.VERIFY_SUCCESS'),
              this.translate.instant('TOAST.TITLE.SUCCESS')
            );
            this.spinnerService.hide();
            this.router.navigate(['/home']);
          },
          error: (err) => {
            this.spinnerService.hide();
            this.toastr.error(this.translate.instant('OTP.VERIFY_FAILED'), this.translate.instant('TOAST.TITLE.ERROR'));
          }
        });


        },
        error: (err) => {
          this.spinnerService.hide();
          this.toastr.error(
            this.translate.instant('OTP.VERIFY_FAILED'),
            this.translate.instant('TOAST.TITLE.ERROR')
          );
        },
      });
    } else {
      this.authService.verifyOtp({ sharedSecret: this.tokenVerify, otpCode }).subscribe({
        next: (res) => {
          if (res) {
            this.toastr.success(
              this.translate.instant('OTP.VERIFY_SUCCESS'),
              this.translate.instant('TOAST.TITLE.SUCCESS')
            );
            this.spinnerService.hide();
            this.clearTimerStorage();
            this.router.navigate(['/reset-password']);
          } else {
            this.spinnerService.hide();
            this.toastr.error(
              this.translate.instant('OTP.VERIFY_FAILED'),
              this.translate.instant('TOAST.TITLE.ERROR')
            );
          }
        },
        error: () => {
          this.spinnerService.hide();
          this.toastr.error(
            this.translate.instant('OTP.VERIFY_FAILED'),
            this.translate.instant('TOAST.TITLE.ERROR')
          );
        },
      });
    }
  }

  resendOtp(): void {
    if (this.timer > 0) return;

    if (this.isTwoFactorEnabled) {
      this.spinnerService.show();
      this.authService.ResendVerifyTwoFactorOtp({}).subscribe({
        next: (res) => {

          this.spinnerService.hide();
          this.clearTimerStorage();
          this.resetTimer(this.TIMER_DURATION);
          this.startTimer();
        },
        error: () => {
          this.spinnerService.hide();
        },
        complete: () => {
          this.spinnerService.hide();
        }
      });
    } else {
      if (!this.forgetpasswordData?.email) {
        this.toastr.error(this.translate.instant('CORECT_EMAIL'));
        return;
      }
      this.spinnerService.show();
      this.authService.otpSendViaEmail({ email: this.forgetpasswordData?.email }).subscribe({
        next: (res) => {
          this.tokenVerify = res;
          this.spinnerService.hide();
          this.resetTimer(this.TIMER_DURATION);
          this.startTimer();
        },
        error: () => {
          this.spinnerService.hide();
        },
        complete: () => {
          this.spinnerService.hide();
        }
      });
    }
  }


}
