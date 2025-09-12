import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { NgSelectModule } from '@ng-select/ng-select';
import { Router, RouterModule } from '@angular/router';
import { forkJoin } from 'rxjs';

// Services
import { UserService } from '../../../../core/services/user.service';
import { SpinnerService } from '../../../../core/services/spinner.service';
import { AttachmentService } from '../../../../core/services/attachments/attachment.service';
import { Select2Service } from '../../../../core/services/Select2.service';

// DTOs
import { CreateUserDto, AttachmentBase64Dto } from '../../../../core/dtos/create-user.dto';
import { AttachmentsConfigDto, AttachmentsConfigType } from '../../../../core/dtos/attachments/attachments-config.dto';
import { FndLookUpValuesSelect2RequestDto } from '../../../../core/dtos/FndLookUpValuesdtos/FndLookUpValues.dto';

// Validators
import { confirmPasswordValidator } from '../../../../shared/customValidators/confirmPasswordValidator';

@Component({
  selector: 'app-institutionregistration',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    TranslateModule,
    NgSelectModule,
    RouterModule,
  ],
  templateUrl: './institutionregistration.component.html',
  styleUrl: './institutionregistration.component.scss'
})
export class InstitutionregistrationComponent implements OnInit {
  registrationForm!: FormGroup;
  submitted: boolean = false;
  isLoading: boolean = false;
  
  // Dropdown data
  countries: any[] = [];
  cities: any[] = [];
  entities: any[] = [];
  
  // Pagination for dropdowns
  countriesLoading: boolean = false;
  citiesLoading: boolean = false;
  entitiesLoading: boolean = false;
  countriesHasMore: boolean = true;
  citiesHasMore: boolean = true;
  entitiesHasMore: boolean = true;
  
  // Attachment data
  attachmentConfigs: AttachmentsConfigDto[] = [];
  selectedFiles: { [key: number]: File } = {};
  filePreviews: { [key: number]: string } = {};
  
  // Search parameters
  searchSelect2Params = new FndLookUpValuesSelect2RequestDto();
  
  // Date properties
  today = new Date().toISOString().split('T')[0];

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private spinnerService: SpinnerService,
    private toastr: ToastrService,
    public translate: TranslateService,
    private router: Router,
    private attachmentService: AttachmentService,
    private select2Service: Select2Service,
  ) {
    this.initializeForm();
  }

  ngOnInit(): void {
    this.loadDropdownData();
    this.loadAttachmentConfigs();
  }

  private initializeForm(): void {
    this.registrationForm = this.fb.group({
      // Basic Information
      
       nameEn: ['', [Validators.required, Validators.minLength(2)]],
      name: ['', [Validators.required, Validators.minLength(2)]],
      userName: ['', [Validators.required, , Validators.email]],
      civilId: ['', [Validators.required, Validators.minLength(10)]],
      entityId: [null, Validators.required],
      
      // Contact Information
      email: ['', [Validators.required, Validators.email]],
      phoneNumber: ['', [Validators.required, Validators.minLength(8)]],
      telNumber: ['', [Validators.minLength(8)]], // Optional
      
      // Address Information
      countryId: [null], // Optional
      cityId: [null, Validators.required],
      address: ['', [Validators.required, Validators.minLength(10)]],
      poBox: ['', [Validators.minLength(3)]], // Optional
      
      // Password
      password: ['', [
        Validators.required, 
        Validators.minLength(6),
        Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{6,}$/)
      ]],
      confirmPassword: ['', [Validators.required]],
      
      // Hidden fields for API
      userType: [2], // Organization
      serviceType: [2], // Institution
      userStatus: [1], // New
      applyDate: [new Date()],
      acceptTerms: [false, Validators.requiredTrue],
    }, {
      validators: confirmPasswordValidator('password', 'confirmPassword')
    });
  }

  private loadDropdownData(): void {
    this.fetchCountries();
    this.fetchCities();
    this.fetchEntities();
  }

  private fetchCountries(): void {
    if (this.countriesLoading || !this.countriesHasMore) return;
    
    this.countriesLoading = true;
    const params = new FndLookUpValuesSelect2RequestDto();
    params.searchValue = '';
    params.skip = this.countries.length;
    params.take = 20;
    
    this.select2Service.getCountrySelect2(params).subscribe({
      next: (response: any) => {
        const newCountries = response?.results || [];
        this.countries = [...this.countries, ...newCountries];
        this.countriesHasMore = newCountries.length === params.take;
        this.countriesLoading = false;
      },
      error: (err: any) => {
        this.toastr.error(this.translate.instant('REGISTRATION.TOASTR.COUNTRIES_LOAD_ERROR'), this.translate.instant('TOAST.TITLE.ERROR'));
        this.countriesLoading = false;
      }
    });
  }

  private fetchEntities(): void {
    if (this.entitiesLoading || !this.entitiesHasMore) return;
    
    this.entitiesLoading = true;
    const params = new FndLookUpValuesSelect2RequestDto();
    params.searchValue = '';
    params.skip = this.entities.length;
    params.take = 20;
    
    this.select2Service.getEntitySelect2(params).subscribe({
      next: (response: any) => {
        const newEntities = response?.results || [];
        this.entities = [...this.entities, ...newEntities];
        this.entitiesHasMore = newEntities.length === params.take;
        this.entitiesLoading = false;
      },
      error: (err: any) => {
        this.toastr.error(this.translate.instant('REGISTRATION.TOASTR.ENTITIES_LOAD_ERROR'), this.translate.instant('TOAST.TITLE.ERROR'));
        this.entitiesLoading = false;
      }
    });
  }

  private fetchCities(): void {
    // Load all cities independently
    this.cities = [];
    this.citiesHasMore = true;
    this.loadMoreCities();
  }

  private loadMoreCities(): void {
    if (this.citiesLoading || !this.citiesHasMore) return;
    
    this.citiesLoading = true;
    const cityParams = new FndLookUpValuesSelect2RequestDto();
    cityParams.searchValue = '';
    cityParams.skip = this.cities.length;
    cityParams.take = 20;
    
    this.select2Service.getCitySelect2(cityParams).subscribe({
      next: (response: any) => {
        const newCities = response?.results || [];
        this.cities = [...this.cities, ...newCities];
        this.citiesHasMore = newCities.length === cityParams.take;
        this.citiesLoading = false;
      },
      error: (err: any) => {
        this.toastr.error(this.translate.instant('REGISTRATION.TOASTR.CITIES_LOAD_ERROR'), this.translate.instant('TOAST.TITLE.ERROR'));
        this.citiesLoading = false;
      }
    });
  }

  private loadAttachmentConfigs(): void {
    this.attachmentService.getAttachmentsConfigByType(AttachmentsConfigType.FillInstitutionRegistrationData).subscribe({
      next: (configs: AttachmentsConfigDto[]) => {
        this.attachmentConfigs = configs;
      },
      error: (err) => {
        this.toastr.error(this.translate.instant('REGISTRATION.TOASTR.ATTACHMENT_CONFIG_ERROR'), this.translate.instant('TOAST.TITLE.ERROR'));
      }
    });
  }

  onFileSelected(event: any, configId: number): void {
    const file = event.target.files[0];
    if (file) {
      this.validateAndSetFile(file, configId);
    }
  }

  private validateAndSetFile(file: File, configId: number): void {
    // File size validation (5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
              this.toastr.error(this.translate.instant('REGISTRATION.TOASTR.FILE_SIZE_ERROR'), this.translate.instant('TOAST.TITLE.ERROR'));
      return;
    }

    // File type validation
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
              this.toastr.error(this.translate.instant('REGISTRATION.TOASTR.FILE_TYPE_ERROR'), this.translate.instant('TOAST.TITLE.ERROR'));
      return;
    }

    this.selectedFiles[configId] = file;
    
    // Create preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.filePreviews[configId] = e.target.result;
      };
      reader.readAsDataURL(file);
    } else {
      this.filePreviews[configId] = 'assets/images/file.png'; // Default file icon
    }
  }

  removeFile(configId: number): void {
    delete this.selectedFiles[configId];
    delete this.filePreviews[configId];
  }

  private async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = error => reject(error);
    });
  }

  async onSubmit(): Promise<void> {
    this.submitted = true;

    if (this.registrationForm.invalid) {
      this.registrationForm.markAllAsTouched();
      this.toastr.error(this.translate.instant('REGISTRATION.TOASTR.VALIDATION_ERROR'), this.translate.instant('TOAST.TITLE.ERROR'));
      return;
    }

    this.isLoading = true;
    this.spinnerService.show();

    try {
      const formData = this.registrationForm.value;
      
      // Convert numeric fields to numbers if they exist
      const numericFields = ['userType', 'serviceType', 'userStatus'];
      numericFields.forEach(field => {
        if (formData[field] !== null && formData[field] !== undefined) {
          formData[field] = Number(formData[field]);
        }
      });
      
      // Prepare attachments
      const attachments: AttachmentBase64Dto[] = [];
      
      for (const [configId, file] of Object.entries(this.selectedFiles)) {
        const base64 = await this.fileToBase64(file as File);
        attachments.push({
          fileBase64: base64,
          fileName: (file as File).name,
          masterId: 0, // Will be set by backend
          attConfigID: parseInt(configId)
        });
      }
            const { acceptTerms, poBox, ...rest } = formData;

      const createUserDto: CreateUserDto = {
         ...rest,
        boxNo: poBox, // Map poBox form field to boxNo DTO field
        attachments: attachments.length > 0 ? attachments : undefined
      };

      this.userService.createUser(createUserDto).subscribe({
        next: (response) => {
          this.toastr.success(this.translate.instant('REGISTRATION.TOASTR.REGISTRATION_SUCCESS'), this.translate.instant('TOAST.TITLE.SUCCESS'));
          this.router.navigate(['/register/pending']);
        },
        error: (error) => {
          this.toastr.error(this.translate.instant('REGISTRATION.TOASTR.REGISTRATION_ERROR'), this.translate.instant('TOAST.TITLE.ERROR'));
        },
        complete: () => {
          this.isLoading = false;
          this.spinnerService.hide();
        }
      });

    } catch (error) {
      this.toastr.error(this.translate.instant('REGISTRATION.TOASTR.GENERAL_ERROR'), this.translate.instant('TOAST.TITLE.ERROR'));
      this.isLoading = false;
      this.spinnerService.hide();
    }
  }

  // Form validation helpers
  isFieldInvalid(fieldName: string): boolean {
    const field = this.registrationForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched || this.submitted));
  }

  getFieldError(fieldName: string): string {
    const field = this.registrationForm.get(fieldName);
    if (field && field.errors) {
      if (field.errors['required']) return 'This field is required';
      if (field.errors['email']) return 'Please enter a valid email address';
      if (field.errors['minlength']) return `Minimum length is ${field.errors['minlength'].requiredLength} characters`;
      if (field.errors['pattern']) return 'Please enter a valid format';
      if (field.errors['mismatch']) return 'Passwords do not match';
    }
    return '';
  }

  showPasswordMatch(): boolean {
    const pass = this.registrationForm.get('password')?.value;
    const confirm = this.registrationForm.get('confirmPassword')?.value;
    return pass && confirm && pass === confirm && 
           !this.registrationForm.get('confirmPassword')?.errors?.['mismatch'];
  }

  getAttachmentDisplayName(config: AttachmentsConfigDto): string {
    return this.translate.currentLang === 'ar' ? config.name : (config.nameEn || config.name);
  }

  isAttachmentRequired(config: AttachmentsConfigDto): boolean {
    return config.mendatory || false;
  }

  // Date validation
  isLicenseDateValid(): boolean {
    const licenseEndDate = this.registrationForm.get('licenseEndDate')?.value;
    if (!licenseEndDate) return true;
    
    const today = new Date();
    const licenseDate = new Date(licenseEndDate);
    return licenseDate > today;
  }

  // Infinite scroll handlers for ng-select
  onCountriesScrollToEnd(): void {
    this.fetchCountries();
  }

  onCitiesScrollToEnd(): void {
    this.loadMoreCities();
  }

  onEntitiesScrollToEnd(): void {
    this.fetchEntities();
  }
}
