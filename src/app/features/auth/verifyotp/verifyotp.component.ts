import { Component } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { TranslateService, TranslateModule } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { SpinnerService } from '../../../core/services/spinner.service';

@Component({
  selector: 'app-verifyotp',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, TranslateModule],
  templateUrl: './verifyotp.component.html',
  styleUrl: './verifyotp.component.scss'
})
export class VerifyotpComponent {
  otpForm: FormGroup;
  submitted = false;
  objectKeys: any[] = [];
  timer: number = 120;
  forgetpasswordData :any;
  tokenVerify:string='';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private toastr: ToastrService,
    private translate: TranslateService,
    private spinnerService: SpinnerService
  ) {
    this.otpForm = this.fb.group({
      otp1: ['', Validators.required],
      otp2: ['', Validators.required],
      otp3: ['', Validators.required],
      otp4: ['', Validators.required],
      otp5: ['', Validators.required]
    });

    if (localStorage.getItem("forgetpasswordData")) {
      const data = localStorage.getItem("forgetpasswordData") || "{}" ;
      this.forgetpasswordData = JSON.parse(data);
      this.tokenVerify = this.forgetpasswordData?.sharedSecret;

    }
  }

  ngOnInit(): void {

    this.objectKeys = Object.keys(this.otpForm.controls);

    this.startTimer();
  }

  startTimer() {
    setInterval(() => {
      if (this.timer > 0) {
        this.timer--;
      }
    }, 1000);
  }

  submitOtp(): void {
    this.submitted = true;
    if (this.otpForm.invalid) return;

    const otpCode = Object.values(this.otpForm.value).join('');
    const sharedSecret = localStorage.getItem('sharedSecret') || '';

    this.authService.verifyOtp({ sharedSecret: this.tokenVerify, otpCode }).subscribe({
      next: (res) => {

        if (res) {
          this.toastr.success(
            this.translate.instant('AUTH.MESSAGES.OTP_VERIFY_SUCCESS'),
            this.translate.instant('TOAST.TITLE.SUCCESS')
          );
          this.router.navigate(['/reset-password']);
        } else {
          this.toastr.error(
            this.translate.instant('AUTH.MESSAGES.OTP_VERIFY_FAILED'),
            this.translate.instant('TOAST.TITLE.ERROR')
          );
        }
      },
      error: (error: any) => {
        this.toastr.error(
          this.translate.instant('AUTH.MESSAGES.OTP_VERIFY_FAILED'),
          this.translate.instant('TOAST.TITLE.ERROR')
        );
      },
    });
  }

  resendOtp(): void {
    if (!this.forgetpasswordData?.email) {
      this.toastr.error(
        this.translate.instant('AUTH.MESSAGES.CORRECT_EMAIL'),
        this.translate.instant('TOAST.TITLE.ERROR')
      );
      return;
    }
    this.spinnerService.show();
    this.authService.otpSendViaEmail({email:this.forgetpasswordData?.email}).subscribe({
      next: (res)=>{
        this.tokenVerify = res;
        this.spinnerService.hide();
        this.timer = 120
      },
      error: (err)=>{
        this.spinnerService.hide();
        
      },
      complete: ()=>{
        this.spinnerService.hide();

      }
    })
  }
}
