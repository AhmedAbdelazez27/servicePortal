import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { ContactInformationService } from '../../../core/services/UserSetting/contact-information.service';
import { CreateContactInformationDto } from '../../../core/dtos/UserSetting/contact-information.dto';

@Component({
  selector: 'app-contact-us',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule],
  templateUrl: './contact-us.component.html',
  styleUrls: ['./contact-us.component.scss']
})
export class ContactUsComponent implements OnInit {
  contactForm!: FormGroup;
  submittingContact = false;

  constructor(
    private fb: FormBuilder,
    private contactInformationService: ContactInformationService,
    private toastr: ToastrService,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    this.initializeContactForm();
  }

  // Custom validator for UAE mobile number format (9 digits starting with 5)
  private uaeMobileValidator(control: AbstractControl): ValidationErrors | null {
    if (!control.value) {
      return null; // Let required validator handle empty values
    }
    
    // Validate 9 digits starting with 5
    const uaeMobileRegex = /^5[0-9]{8}$/;
    return uaeMobileRegex.test(control.value) ? null : { invalidUaeMobile: true };
  }

  // Restrict mobile input to only numbers (no + needed since +971 is fixed)
  restrictMobileInput(event: KeyboardEvent): void {
    const allowedChars = /[0-9]/;
    const key = event.key;
    
    // Allow backspace, delete, tab, escape, enter, and arrow keys
    if (event.key === 'Backspace' || event.key === 'Delete' || event.key === 'Tab' || 
        event.key === 'Escape' || event.key === 'Enter' || 
        event.key === 'ArrowLeft' || event.key === 'ArrowRight' || 
        event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      return;
    }
    
    if (!allowedChars.test(key)) {
      event.preventDefault();
    }
  }

  private initializeContactForm(): void {
    this.contactForm = this.fb.group({
      name: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      mobileNumber: ['', [Validators.required, this.uaeMobileValidator.bind(this)]],
      title: [''],
      message: ['', [Validators.required]]
    });
  }

  onSubmitContactForm(): void {
    if (this.contactForm.invalid) {
      this.markFormGroupTouched(this.contactForm);
      return;
    }

    this.submittingContact = true;

    const contactInfo: CreateContactInformationDto = {
      name: this.contactForm.value.name,
      email: this.contactForm.value.email,
      mobileNumber: `971${this.contactForm.value.mobileNumber}`, // Add 971 prefix
      title: this.contactForm.value.title,
      message: this.contactForm.value.message,
    };

    this.contactInformationService.createContactInformation(contactInfo).subscribe({
      next: () => {
        this.toastr.success(
          this.translate.instant('CONTACT.SUCCESS_MESSAGE'),
          this.translate.instant('TOAST.TITLE.SUCCESS')
        );
        this.contactForm.reset();
        this.initializeContactForm();
      },
      error: (error: any) => {
        this.toastr.error(
          this.translate.instant('CONTACT.ERROR_MESSAGE'),
          this.translate.instant('TOAST.TITLE.ERROR')
        );
      },
      complete: () => {
        this.submittingContact = false;
      }
    });
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();

      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  // Handle mobile number blur event to trigger validation
  onMobileNumberBlur(): void {
    const mobileControl = this.contactForm.get('mobileNumber');
    if (mobileControl && mobileControl.value) {
      // Trigger validation on blur
      mobileControl.markAsTouched();
    }
  }

  // Handle mobile number input event for real-time validation
  onMobileNumberInput(): void {
    const mobileControl = this.contactForm.get('mobileNumber');
    if (mobileControl && mobileControl.value) {
      // Trigger validation as user types
      mobileControl.markAsTouched();
    }
  }
}
