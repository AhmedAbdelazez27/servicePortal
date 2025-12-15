import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { NgSelectModule } from '@ng-select/ng-select';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { RequestComplaintService } from '../../../core/services/request-complaint.service';
import { AuthService } from '../../../core/services/auth.service';
import { TranslationService } from '../../../core/services/translation.service';
import {
  CreateRequestComplaintDto,
  ComplaintTypeDto,
} from '../../../core/dtos/RequestComplaint/request-complaint.dto';
import { enhancedEmailValidator } from '../../../shared/customValidators/registration-validators';
import { mainApplyServiceDto } from '../../../core/dtos/mainApplyService/mainApplyService.dto';

@Component({
  selector: 'app-request-complaint',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    TranslateModule,
    NgSelectModule,
  ],
  templateUrl: './request-complaint.component.html',
  styleUrl: './request-complaint.component.scss',
})
export class RequestComplaintComponent implements OnInit, OnDestroy {
  // Forms
  requestComplaintForm!: FormGroup;
  submitted = false;
  isLoading = false;
  isSaving = false;
  isFormInitialized = false;

  // Data
  complaintTypes: ComplaintTypeDto[] = [];
  serviceId: string | null = null;

  get isRtl(): boolean {
    return this.translationService.currentLang === 'ar';
  }

  private subscriptions: Subscription[] = [];
  loadformData: mainApplyServiceDto = {} as mainApplyServiceDto;

  constructor(
    private fb: FormBuilder,
    private requestComplaintService: RequestComplaintService,
    private authService: AuthService,
    public translationService: TranslationService,
    private translate: TranslateService,
    private toastr: ToastrService,
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {
    this.initializeForm();
  }

  ngOnInit(): void {
    this.clearAllToasts();
    this.loadInitialData();
    this.getServiceIdFromRoute();

    this.loadformData = history.state?.loadformData;
    if (this.loadformData) {
      this.requestComplaintForm.patchValue({
        requestDate: this.loadformData.requestComplaint?.requestDate,
        complaintType: this.loadformData.requestComplaint?.complaintType,
        contactNumber: this.loadformData.requestComplaint?.contactNumber,
        applicantName: this.loadformData.requestComplaint?.applicantName,
        email: this.loadformData.requestComplaint?.email,
        details: this.loadformData.requestComplaint?.details,
        notes: this.loadformData.requestComplaint?.notes,
      });
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  private clearAllToasts(): void {
    this.toastr.clear();
  }

  private getServiceIdFromRoute(): void {
    this.serviceId = this.route.snapshot.paramMap.get('id');
  }

  initializeForm(): void {
    const currentUser = this.authService.getCurrentUser();

    this.requestComplaintForm = this.fb.group({
      userId: [currentUser?.id || ''],
      complaintType: [null, Validators.required],
      contactNumber: [
        '',
        [Validators.required, this.uaeMobileValidator.bind(this)],
      ],
      applicantName: ['', Validators.required],
      details: ['', Validators.required],
      email: ['', [enhancedEmailValidator()]],
      notes: [''],
      requestDate: [
        new Date().toISOString().split('T')[0],
        Validators.required,
      ],
    });

    // Set applicant name from current user if available
    if (currentUser?.name) {
      this.requestComplaintForm.patchValue({
        applicantName: currentUser.name,
      });
    }
  }

  loadInitialData(): void {
    this.isLoading = true;

    const currentUser = this.authService.getCurrentUser();
    if (currentUser?.id) {
      this.requestComplaintForm.patchValue({
        userId: currentUser.id,
      });

      this.loadComplaintTypes();
    } else {
      this.toastr.error(this.translate.instant('ERRORS.USER_NOT_FOUND'));
      this.router.navigate(['/login']);
    }
  }

  loadComplaintTypes(): void {
    // Check authentication status
    const token = localStorage.getItem('access_token');
    if (token) {
      // Token exists, proceed with API call
    }

    const currentUser = this.authService.getCurrentUser();

    // First test the direct API endpoint
    this.requestComplaintService.testComplaintTypesEndpoint().subscribe({
      next: (response) => {
        // API test successful
      },
      error: (error) => {
        // API test error - continue with main call
      },
    });

    const sub = this.requestComplaintService.getComplaintTypes().subscribe({
      next: (types) => {
        this.complaintTypes = types || [];
        this.isLoading = false;
        this.isFormInitialized = true;

        if (this.complaintTypes.length === 0) {
          this.toastr.warning(
            this.translate.instant('REQUEST_COMPLAINT.NO_TYPES_AVAILABLE')
          );
        }
      },
      error: (error) => {
        // If it's an auth error, show appropriate message
        if (error.status === 401) {
          this.toastr.error(this.translate.instant('ERRORS.AUTHENTICATION_REQUIRED'));
          this.router.navigate(['/login']);
          return;
        }

        // For testing purposes, add some mock data when API fails
        this.complaintTypes = [
          { id: 1, text: this.translate.instant('REQUEST_COMPLAINT.MOCK_COMPLAINT'), value: 'Complaint' },
          { id: 2, text: this.translate.instant('REQUEST_COMPLAINT.MOCK_SUGGESTION'), value: 'Suggestion' },
          { id: 3, text: this.translate.instant('REQUEST_COMPLAINT.MOCK_THANKS'), value: 'Thanks' },
        ];

        this.toastr.error(
          this.translate.instant('ERRORS.FAILED_LOAD_COMPLAINT_TYPES')
        );
        this.isLoading = false;
        this.isFormInitialized = true;
      },
    });
    this.subscriptions.push(sub);
  }

  getComplaintTypeName(type: ComplaintTypeDto): string {
    // Since the backend returns both text and value as the same content,
    // we can use either. Using text for display purposes.
    return type.text;
  }

  onSubmit(): void {
    // Prevent multiple submissions
    if (this.isSaving) {
      return;
    }

    this.submitted = true;

    // Basic validation first
    if (!this.canSubmit()) {
      this.toastr.error(
        this.translate.instant('VALIDATION.PLEASE_COMPLETE_REQUIRED_FIELDS')
      );
      return;
    }

    this.isSaving = true;

    try {
      const formData = this.requestComplaintForm.getRawValue();

      // Get current user info
      const currentUser = this.authService.getCurrentUser();
      if (!currentUser?.id) {
        this.toastr.error(this.translate.instant('ERRORS.USER_NOT_FOUND'));
        this.isSaving = false;
        return;
      }

      const createDto: CreateRequestComplaintDto = {
        complaintType: formData.complaintType,
        contactNumber: `971${formData.contactNumber}`, // Add 971 prefix
        applicantName: formData.applicantName,
        details: formData.details,
        email: formData.email || null,
        notes: formData.notes || null,
        requestDate: new Date().toISOString(),
      };

      const sub = this.requestComplaintService.create(createDto).subscribe({
        next: (response) => {
          this.toastr.success(
            this.translate.instant('SUCCESS.REQUEST_COMPLAINT_CREATED')
          );
          this.router.navigate(['/request']);
          this.isSaving = false;
        },
        error: (error) => {
          // Check if it's a business error with a specific reason
          if (error.error && error.error.reason) {
            // Show the specific reason from the API response
            this.toastr.error(error.error.reason);
          } else {
            // Fallback to generic error message
            this.toastr.error(
              this.translate.instant('ERRORS.FAILED_CREATE_REQUEST_COMPLAINT')
            );
          }
          
          this.isSaving = false;
        },
      });
      this.subscriptions.push(sub);
    } catch (error: any) {
      // Check if it's a business error with a specific reason
      if (error.error && error.error.reason) {
        // Show the specific reason from the API response
        this.toastr.error(error.error.reason);
      } else {
        // Fallback to generic error message
        this.toastr.error(
          this.translate.instant('ERRORS.FAILED_CREATE_REQUEST_COMPLAINT')
        );
      }
      
      this.isSaving = false;
    }
  }

  canSubmit(): boolean {
    if (this.isSaving) {
      return false;
    }

    if (!this.requestComplaintForm) {
      return false;
    }

    // Wait for form to be properly initialized
    if (!this.isFormInitialized) {
      return false;
    }

    // Check required fields
    const requiredFields = [
      'complaintType',
      'contactNumber',
      'applicantName',
      'details',
    ];
    const allFieldsValid = requiredFields.every((field) => {
      const control = this.requestComplaintForm.get(field);
      return control && control.value && control.value.toString().trim();
    });

    return allFieldsValid && this.requestComplaintForm.valid;
  }

  // Helper method to check if field has error
  hasFieldError(fieldName: string): boolean {
    const field = this.requestComplaintForm.get(fieldName);
    return !!(
      field &&
      field.invalid &&
      (field.dirty || field.touched || this.submitted)
    );
  }

  // Helper method to check if email field has specific validation errors
  hasEmailError(): boolean {
    const emailField = this.requestComplaintForm.get('email');
    if (!emailField) return false;
    
    return !!(
      emailField.errors &&
      (emailField.dirty || emailField.touched || this.submitted) &&
      (emailField.errors['invalidEmail'] || 
       emailField.errors['consecutiveDots'] || 
       emailField.errors['leadingTrailingDots'] || 
       emailField.errors['invalidDomain'])
    );
  }

  // Helper method to get field error message
  getFieldErrorMessage(fieldName: string): string {
    const field = this.requestComplaintForm.get(fieldName);
    if (
      field &&
      field.errors &&
      (field.dirty || field.touched || this.submitted)
    ) {
      if (field.errors['required']) {
        return this.translate.instant('VALIDATION.REQUIRED_FIELD');
      }
      if (field.errors['email'] || field.errors['invalidEmail']) {
        return this.translate.instant('VALIDATION.INVALID_EMAIL');
      }
      if (field.errors['consecutiveDots']) {
        return this.translate.instant('VALIDATION.CONSECUTIVE_DOTS');
      }
      if (field.errors['leadingTrailingDots']) {
        return this.translate.instant('VALIDATION.LEADING_TRAILING_DOTS');
      }
      if (field.errors['invalidDomain']) {
        return this.translate.instant('VALIDATION.INVALID_DOMAIN');
      }
      if (field.errors['pattern']) {
        return this.translate.instant('VALIDATION.INVALID_PHONE');
      }
    }
    return '';
  }

  // Navigation helper method
  navigateToServices(): void {
    this.router.navigate(['/services']);
  }

  // UAE Mobile validation methods
  uaeMobileValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    if (!value) return null;
    
    const uaeMobilePattern = /^5[0-9]{8}$/;
    return uaeMobilePattern.test(value) ? null : { pattern: true };
  }

  restrictMobileInput(event: KeyboardEvent): void {
    const char = String.fromCharCode(event.which);
    if (!/[0-9]/.test(char)) {
      event.preventDefault();
    }
  }

  onContactNumberInput(): void {
    const mobileControl = this.requestComplaintForm.get('contactNumber');
    if (mobileControl) {
      let value = mobileControl.value;
      if (value && value.length > 9) {
        value = value.substring(0, 9);
        mobileControl.setValue(value);
      }
    }
  }

  onContactNumberBlur(): void {
    const mobileControl = this.requestComplaintForm.get('contactNumber');
    if (mobileControl) {
      mobileControl.updateValueAndValidity();
      this.cdr.detectChanges();
    }
  }
}
