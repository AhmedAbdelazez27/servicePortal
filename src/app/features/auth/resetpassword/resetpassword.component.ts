import { Component } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { SpinnerService } from '../../../core/services/spinner.service';
import { CommonModule } from '@angular/common';
import { confirmPasswordValidator } from '../../../shared/customValidators/confirmPasswordValidator';

@Component({
  selector: 'app-resetpassword',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, TranslateModule],
  templateUrl: './resetpassword.component.html',
  styleUrl: './resetpassword.component.scss'
})
export class ResetpasswordComponent {
  resetPasswordForm: FormGroup;
  submitted = false;
  showPassword: boolean = false;
  showCPassword: boolean = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private toastr: ToastrService,
    private translate: TranslateService,
    private spinnerService: SpinnerService

  ) {
    this.resetPasswordForm = this.fb.group({
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required],
    }, {
      validators: confirmPasswordValidator('password', 'confirmPassword')
    });
  }

  // Validator to check if newPassword and confirmPassword match

  showPasswordMatch(): boolean {
    const pass = this.resetPasswordForm.get('password')?.value;
    const confirm = this.resetPasswordForm.get('confirmPassword')?.value;

    return pass && confirm && pass === confirm && !this.resetPasswordForm.get('confirmPassword')?.errors?.['mismatch'];
  }

  submit(): void {
    this.submitted = true;

    if (this.resetPasswordForm.invalid) {
      return;
    }

    // Retrieve the email and sharedSecret from localStorage
    const email = JSON.parse(localStorage.getItem('forgetpasswordData') || '{}').email;
    const sharedSecret = JSON.parse(localStorage.getItem('forgetpasswordData') || '{}').sharedSecret;

    if (!email || !sharedSecret) {
      this.toastr.error(this.translate.instant('AUTH.MESSAGES.NO_DATA'), this.translate.instant('TOAST.TITLE.ERROR'));
      return;
    }
    this.spinnerService.show();
    // Prepare request data
    const data = {
      email: email,
      token: sharedSecret,
      newPassword: this.resetPasswordForm.value.password,
      confirmPassword: this.resetPasswordForm.value.confirmPassword
    };


    this.authService.resetPassword(data).subscribe({
      next: (res) => {
        this.toastr.success(this.translate.instant('AUTH.MESSAGES.PASSWORD_RESET_SUCCESS'), this.translate.instant('TOAST.TITLE.SUCCESS'));
        this.router.navigate(['/login']);
        this.spinnerService.hide();
      },
      error: (error) => {
        this.toastr.error(this.translate.instant('AUTH.MESSAGES.PASSWORD_RESET_FAILED'), this.translate.instant('TOAST.TITLE.ERROR'));
        this.spinnerService.hide();
      }
    });
  }

}
