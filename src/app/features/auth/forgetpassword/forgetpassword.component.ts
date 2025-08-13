import { Component } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { Router } from '@angular/router';
import { SpinnerService } from '../../../core/services/spinner.service';
import { ToastrService } from 'ngx-toastr';
import { TranslateService, TranslateModule } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-forgetpassword',
  imports: [CommonModule,FormsModule,ReactiveFormsModule, TranslateModule],
  templateUrl: './forgetpassword.component.html',
  styleUrl: './forgetpassword.component.scss'
})
export class ForgetpasswordComponent {
  form: FormGroup;
  submitted: boolean = false;

  constructor(private fb: FormBuilder, private authService: AuthService, private router: Router, private spinnerService: SpinnerService, private toastr: ToastrService, private translate: TranslateService) {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]], 
    });
  }
  
    submit() {
    this.submitted = true;
    if (this.form.invalid) return;
      this.spinnerService.show();
    const email = this.form.get('email')?.value;
    this.authService.sendOtpToEmail({email}).subscribe({
      next: (res) => {
        localStorage.setItem('forgetpasswordData',JSON.stringify({email:email,sharedSecret:res?.token}))
        this.router.navigate(['/verify-otp']);
        this.spinnerService.hide();

      },
      error: (error) => {
         this.toastr.error(
           this.translate.instant('AUTH.MESSAGES.CORRECT_EMAIL'),
           this.translate.instant('TOAST.TITLE.ERROR')
         ); 
        this.spinnerService.hide();

      },
      complete: ()=>{
        this.spinnerService.hide();
      }
    });
  }

}
