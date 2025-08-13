import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
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

  private initializeContactForm(): void {
    this.contactForm = this.fb.group({
      name: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
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
}
