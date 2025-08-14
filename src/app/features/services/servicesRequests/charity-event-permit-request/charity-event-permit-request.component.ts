import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { RequestPlaintService } from '../../../../core/services/request-plaint.service';
import { AttachmentService } from '../../../../core/services/attachments/attachment.service';
import { AuthService } from '../../../../core/services/auth.service';
import { TranslationService } from '../../../../core/services/translation.service';
import { ToastrService } from 'ngx-toastr';
import { Router } from '@angular/router';
import { AttachmentsConfigDto, AttachmentsConfigType } from '../../../../core/dtos/attachments/attachments-config.dto';
import { forkJoin, map, Observable, Subscription } from 'rxjs';
import { CreateRequestPlaintDto, PlaintReasonsDto, RequestPlaintAttachmentDto, RequestPlaintEvidenceDto, RequestPlaintJustificationDto, RequestPlaintReasonDto, Select2Item, UserEntityDto } from '../../../../core/dtos/RequestPlaint/request-plaint.dto';
import { CharityEventPermitRequestService } from '../../../../core/services/charity-event-permit-request.service';
import { arrayMinLength, dateRangeValidator } from '../../../../shared/customValidators';

@Component({
  selector: 'app-charity-event-permit-request',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    TranslateModule,
    NgSelectModule,
  ],
  templateUrl: './charity-event-permit-request.component.html',
  styleUrl: './charity-event-permit-request.component.scss'
})
export class CharityEventPermitRequestComponent implements OnInit, OnDestroy {
  currentStep: number = 1;
  totalSteps: number = 5;

  // Forms
  firstStepForm!: FormGroup;
  submitted = false;
  isLoading = false;
  isSaving = false;
  isFormInitialized = false; // Flag to track if form is fully initialized

  // Data
  mainApplyServiceOptions: Select2Item[] = [];
  plaintReasonsOptions: PlaintReasonsDto[] = [];
  userEntity: UserEntityDto | null = null;
  userEntities: UserEntityDto[] = [];
  attachmentConfigs: AttachmentsConfigDto[] = [];

  // Computed property for entity display name
  get entityDisplayField(): string {
    return this.translationService.currentLang === 'ar' ? 'entityName' : 'entityNameEn';
  }

  // Tables data
  evidences: RequestPlaintEvidenceDto[] = [];
  justifications: RequestPlaintJustificationDto[] = [];
  reasons: RequestPlaintReasonDto[] = [];
  attachments: RequestPlaintAttachmentDto[] = [];

  // Form inputs for adding items
  // Remove these separate variables as they're now part of the form
  // newEvidence = '';
  // newJustification = '';
  // selectedReason: number | null = null;

  // File upload
  selectedFiles: { [key: number]: File } = {};
  filePreviews: { [key: number]: string } = {};
  isDragOver = false;
  uploadProgress = 0;

  private subscriptions: Subscription[] = [];
  // new probs
  advertisementType: any;
  advertisementTargetType: any;
  advertisementMethodType: any;
  donationChannelsLookup: any;


  constructor(
    private fb: FormBuilder,
    private requestPlaintService: RequestPlaintService,
    private attachmentService: AttachmentService,
    private authService: AuthService,
    public translationService: TranslationService,
    private translate: TranslateService,
    private toastr: ToastrService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private _CharityEventPermitRequestService: CharityEventPermitRequestService
  ) {
    this.initializeForm();
  }

  ngOnInit(): void {
    // Clear any existing toasts to ensure clean start
    this.clearAllToasts();
    this.loadInitialData();
  }

  // Method to clear all existing toasts
  private clearAllToasts(): void {
    // Clear all toasts when component initializes
    this.toastr.clear();
  }

  // Method to show validation toast only when appropriate
  private showValidationToast(message: string): void {
    // Only show validation toasts if form is initialized and user is actively interacting
    if (this.isFormInitialized && (this.submitted || this.currentStep > 1)) {
      this.toastr.error(message);
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  initializeForm(): void {
    const currentUser = this.authService.getCurrentUser();

    this.firstStepForm = this.fb.group(
      {
        userId: this.fb.control('', { validators: [Validators.required], nonNullable: true }),
        requestDate: this.fb.control(new Date().toISOString(), { validators: [Validators.required], nonNullable: true }),
        eventName: this.fb.control('', { validators: [Validators.required], nonNullable: true }),
        eventLocation: this.fb.control('', { validators: [Validators.required], nonNullable: true }),
        startDate: this.fb.control('', { validators: [Validators.required], nonNullable: true }),
        endDate: this.fb.control('', { validators: [Validators.required], nonNullable: true }),
        supervisorName: this.fb.control('', { validators: [Validators.required], nonNullable: true }),
        jopTitle: this.fb.control('', { validators: [Validators.required], nonNullable: true }),
        telephone1: this.fb.control('', { validators: [Validators.required], nonNullable: true }),
        telephone2: this.fb.control('', { validators: [Validators.required], nonNullable: true }),
        email: this.fb.control<string | null>(null, { validators: [Validators.email] }),
        advertisementType: this.fb.control<1 | 2>(1, { validators: [Validators.required], nonNullable: true }),
        notes: this.fb.control<string | null>(null),
        donationChannelsLookupIds: this.fb.control<number[]>([], {
          validators: [arrayMinLength(1)],
          nonNullable: true,
        }),
      },
      { validators: [dateRangeValidator] }
    );


    // Keep request date enabled for validation but set as readonly in template

    // Add form value change subscription for debugging
    this.firstStepForm.valueChanges.subscribe((value: any) => {

      // Don't trigger validation during form initialization
      // Validation will only happen when user actively interacts with the form
    });


  }

  loadInitialData(): void {
    this.isLoading = true;

    const currentUser = this.authService.getCurrentUser();
    if (currentUser?.id) {
      this.firstStepForm.patchValue({
        userId: currentUser.id
      });

      // Load essential data first (user entity and main service options)
      const essentialOperations = [
        this._CharityEventPermitRequestService.getAdvertisementMethodType
      ];

      forkJoin({
        advertisementMethodType: this._CharityEventPermitRequestService.getAdvertisementMethodType({}),
        advertisementTargetType: this._CharityEventPermitRequestService.getAdvertisementTargetType({}),
        advertisementType: this._CharityEventPermitRequestService.getAdvertisementType(),
        donationChannelsLookup: this._CharityEventPermitRequestService.getDonationCollectionChannel({}),
      }).subscribe({
        next: (res: any) => {
          this.advertisementType = res.advertisementType;
          this.advertisementMethodType = res.advertisementMethodType;
          this.advertisementTargetType = res.advertisementTargetType;
          console.log(res.donationChannelsLookup,"ddddddd");
          
          this.donationChannelsLookup = res.donationChannelsLookup.results?.length ? res.donationChannelsLookup.results : [

            { id: 1, text: 'SMS' },
            { id: 2, text: 'Bank Transfer' },
            { id: 3, text: 'POS' },
          ];

          this.isLoading = false;
          this.isFormInitialized = true; // Mark form as fully initialized

          // Load optional data (these can fail without blocking form initialization)

          this.loadAttachmentConfigs();
        },
        error: (error: any) => {
          console.error('Error loading essential data:', error);
          this.toastr.error(this.translate.instant('ERRORS.FAILED_LOAD_DATA'));
          this.isLoading = false;
          // Still initialize form even if some data fails to load
          this.isFormInitialized = true;
        }
      });
    } else {
      this.toastr.error(this.translate.instant('ERRORS.USER_NOT_FOUND'));
      this.router.navigate(['/login']);
    }
  }


  loadAttachmentConfigs(): void {
    const sub = this.attachmentService.getAttachmentsConfigByType(
      AttachmentsConfigType.RequestAGrievance
    ).subscribe({
      next: (configs) => {
        this.attachmentConfigs = configs || [];
        // Initialize attachments array based on configs
        this.attachments = this.attachmentConfigs.map(config => ({
          fileBase64: '',
          fileName: '',
          masterId: 0,
          attConfigID: config.id!
        }));
      },
      error: (error) => {
        console.error('Error loading attachment configs:', error);
      }
    });
    this.subscriptions.push(sub);
  }

  // Navigation methods
  nextStep(): void {
    console.log(this.firstStepForm.value);
    
    if (this.currentStep < this.totalSteps) {
      // Only validate if we're not in loading state and form is ready
      if (!this.isLoading && this.firstStepForm && this.isFormInitialized) {
        if (this.validateCurrentStep()) {
          this.currentStep++;
        }
      } else {
        // If still loading, just proceed without validation
        this.currentStep++;
      }
    }
  }

  previousStep(): void {
    if (this.currentStep > 1) {
      this.currentStep--;
    }
  }

  goToStep(step: number): void {
    if (step >= 1 && step <= this.totalSteps) {
      // Allow navigation without validation - user can navigate freely between steps
      this.currentStep = step;
    }
  }

  validateCurrentStep(): boolean {
    // Only validate if user is actively trying to proceed, not during initial load
    if (this.isLoading || !this.firstStepForm || !this.isFormInitialized) {
      return true;
    }

    switch (this.currentStep) {
      case 1:
        return this.validateStep1();
      case 2:
        return true; // Reasons are optional initially
      case 3:
        return true; // Evidence is optional
      case 4:
        return true; // Justifications are optional
      case 5:
        return true; // Attachments validation in upload
      default:
        return true;
    }
  }

  validateStep1(): boolean {
    const form = this.firstStepForm;
    const requiredFields = ['requestMainApplyServiceId', 'requestingEntityId', 'details'];

    for (const field of requiredFields) {
      if (!form.get(field)?.value) {
        // Use helper method to show validation toast only when appropriate
        this.showValidationToast(this.translate.instant(`VALIDATION.REQUIRED_FIELD`));
        return false;
      }
    }
    return true;
  }

  // Table management methods
  addEvidence(): void {
    if (this.firstStepForm.get('newEvidence')?.value.trim()) {
      this.evidences.push({
        mainApplyServiceId: 0,
        evidence: this.firstStepForm.get('newEvidence')?.value.trim()
      });
      this.firstStepForm.get('newEvidence')?.setValue('');
    }
  }

  onReasonSelectionChange(event: any): void {
    // Check if the selected reason exists in the options
    if (this.firstStepForm.get('selectedReason')?.value) {
      const selectedOption = this.plaintReasonsOptions.find(r => r.id === this.firstStepForm.get('selectedReason')?.value);
    }
  }



  removeEvidence(index: number): void {
    this.evidences.splice(index, 1);
  }

  addJustification(): void {
    if (this.firstStepForm.get('newJustification')?.value.trim()) {
      this.justifications.push({
        mainApplyServiceId: 0,
        justification: this.firstStepForm.get('newJustification')?.value.trim()
      });
      this.firstStepForm.get('newJustification')?.setValue('');
    }
  }

  removeJustification(index: number): void {
    this.justifications.splice(index, 1);
  }

  addReason(): void {
    if (this.firstStepForm.get('selectedReason')?.value) {
      // Check if reason already exists
      const existingReason = this.reasons.find(r => r.lkpPlaintReasonsId === this.firstStepForm.get('selectedReason')?.value);
      if (!existingReason) {
        this.reasons.push({
          mainApplyServiceId: 0,
          lkpPlaintReasonsId: this.firstStepForm.get('selectedReason')?.value
        });
        this.firstStepForm.get('selectedReason')?.setValue(null);
      } else {
        this.toastr.warning(this.translate.instant('WARNINGS.REASON_ALREADY_ADDED'));
      }
    }
  }

  removeReason(index: number): void {
    this.reasons.splice(index, 1);
  }

  getReasonText(reasonId: number): string {
    const reason = this.plaintReasonsOptions.find(r => r.id === reasonId);
    if (reason) {
      const currentLang = this.translationService.currentLang;
      return currentLang === 'ar' ? reason.reasonText : reason.reasonTextEn;
    }
    return '';
  }

  // File upload methods
  onFileSelected(event: Event, configId: number): void {
    const target = event.target as HTMLInputElement;
    if (target?.files?.[0]) {
      this.handleFileUpload(target.files[0], configId);
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver = false;
  }

  onDrop(event: DragEvent, configId: number): void {
    event.preventDefault();
    this.isDragOver = false;

    const files = event.dataTransfer?.files;
    if (files?.[0]) {
      this.handleFileUpload(files[0], configId);
    }
  }

  handleFileUpload(file: File, configId: number): void {
    // Validate file type and size
    if (!this.validateFile(file)) {
      return;
    }

    this.selectedFiles[configId] = file;

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      this.filePreviews[configId] = e.target?.result as string;

      // Update attachment data
      const attachmentIndex = this.attachments.findIndex(a => a.attConfigID === configId);
      if (attachmentIndex !== -1) {
        this.attachments[attachmentIndex] = {
          ...this.attachments[attachmentIndex],
          fileBase64: (e.target?.result as string).split(',')[1], // Remove data:image/... prefix
          fileName: file.name
        };
      }
    };
    reader.readAsDataURL(file);
  }

  validateFile(file: File): boolean {
    const maxSize = 5 * 1024 * 1024; // 5MB
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

    if (file.size > maxSize) {
      this.toastr.error(this.translate.instant('VALIDATION.FILE_TOO_LARGE'));
      return false;
    }

    if (!allowedTypes.includes(file.type)) {
      this.toastr.error(this.translate.instant('VALIDATION.INVALID_FILE_TYPE'));
      return false;
    }

    return true;
  }

  removeFile(configId: number): void {
    delete this.selectedFiles[configId];
    delete this.filePreviews[configId];

    const attachmentIndex = this.attachments.findIndex(a => a.attConfigID === configId);
    if (attachmentIndex !== -1) {
      this.attachments[attachmentIndex] = {
        ...this.attachments[attachmentIndex],
        fileBase64: '',
        fileName: ''
      };
    }
  }

  getAttachmentName(config: AttachmentsConfigDto): string {
    const currentLang = this.translationService.currentLang;
    return currentLang === 'ar' ? (config.name || '') : (config.nameEn || config.name || '');
  }


  getSelectedEntityDisplayName(): string {
    const selectedEntityId = this.firstStepForm.get('requestingEntityId')?.value;
    if (selectedEntityId) {
      const selectedEntity = this.userEntities.find(entity => entity.id === selectedEntityId);
      if (selectedEntity) {
        return selectedEntity[this.entityDisplayField as keyof UserEntityDto] as string;
      }
    }
    return '';
  }

  selectEntity(entityId: string): void {
    this.firstStepForm.patchValue({ requestingEntityId: entityId });

    const selectedEntity = this.userEntities.find(entity => entity.id === entityId);
    if (selectedEntity) {
      this.userEntity = selectedEntity;

    }
  }

  // Method to refresh entity display (useful when language changes)
  refreshEntityDisplay(): void {

    // Force form update to refresh the display
    const currentValue = this.firstStepForm.get('requestingEntityId')?.value;
    if (currentValue) {
      this.firstStepForm.patchValue({ requestingEntityId: currentValue });
    }
  }

  // Submit form
  onSubmit(): void {

    // Prevent multiple submissions
    if (this.isSaving) {
      return;
    }

    this.submitted = true;

    // Basic validation first
    if (!this.canSubmit()) {
      this.toastr.error(this.translate.instant('VALIDATION.PLEASE_COMPLETE_REQUIRED_FIELDS'));
      return;
    }

    this.isSaving = true;

    try {
      const formData = this.firstStepForm.getRawValue();

      // Get current user info
      const currentUser = this.authService.getCurrentUser();
      if (!currentUser?.id) {
        this.toastr.error(this.translate.instant('ERRORS.USER_NOT_FOUND'));
        this.isSaving = false;
        return;
      }

      // Filter out empty attachments
      const validAttachments = this.attachments.filter(a => a.fileBase64 && a.fileName);

      const createDto: CreateRequestPlaintDto = {
        userId: currentUser.id,
        requestMainApplyServiceId: formData.requestMainApplyServiceId,
        requestNo: 0, // Auto-generated in backend
        requestDate: new Date().toISOString(),
        details: formData.details,
        notes: formData.notes || null,
        attachments: validAttachments,
        requestPlaintEvidences: this.evidences,
        requestPlaintJustifications: this.justifications,
        requestPlaintReasons: this.reasons,
        // Note: requestingEntityId is not included as it's only for display purposes
      };



      const sub = this.requestPlaintService.create(createDto).subscribe({
        next: (response) => {

          this.toastr.success(this.translate.instant('SUCCESS.REQUEST_PLAINT_CREATED'));
          this.router.navigate(['/services']);
          this.isSaving = false;
        },
        error: (error) => {
          console.error('Error creating request plaint:', error);
          this.toastr.error(this.translate.instant('ERRORS.FAILED_CREATE_REQUEST_PLAINT'));
          this.isSaving = false;
        }
      });
      this.subscriptions.push(sub);

    } catch (error) {
      console.error('Error in onSubmit:', error);
      this.toastr.error(this.translate.instant('ERRORS.FAILED_CREATE_REQUEST_PLAINT'));
      this.isSaving = false;
    }
  }

  // Utility methods
  isStepCompleted(step: number): boolean {
    switch (step) {
      case 1:
        const step1Valid = !!(this.firstStepForm.get('requestMainApplyServiceId')?.valid &&
          this.firstStepForm.get('requestingEntityId')?.valid &&
          this.firstStepForm.get('details')?.valid);

        return step1Valid;
      case 2:
        const step2Valid = this.reasons.length > 0;

        return step2Valid;
      case 3:
        const step3Valid = this.evidences.length > 0;

        return step3Valid;
      case 4:
        const step4Valid = this.justifications.length > 0;

        return step4Valid;
      case 5:
        const step5Valid = this.attachments.some(a => a.fileBase64 && a.fileName);

        return step5Valid;
      default:
        return false;
    }
  }

  isStepActive(step: number): boolean {
    return this.currentStep === step;
  }

  canProceedToNext(): boolean {
    // Only validate if user is actively trying to proceed, not during initial load
    console.log();
    if (this.isLoading || !this.firstStepForm || !this.isFormInitialized) {
      
      return this.currentStep < this.totalSteps;
    }
    return this.currentStep < this.totalSteps && this.validateCurrentStep();
  }

  canSubmit(): boolean {

    // Basic checks first
    if (this.currentStep !== this.totalSteps) {
      return false;
    }

    if (this.isSaving) {
      return false;
    }

    if (!this.firstStepForm) {
      return false;
    }

    // Wait for form to be properly initialized
    if (!this.isFormInitialized) {
      return false;
    }

    // Check only the most essential required fields
    const requiredFields = ['requestMainApplyServiceId', 'requestingEntityId', 'details'];
    const fieldResults = requiredFields.map(field => {
      const control = this.firstStepForm.get(field);
      const hasValue = control && control.value && control.value.toString().trim();
      return hasValue;
    });

    const allFieldsValid = fieldResults.every(result => result);

    return allFieldsValid;
  }


}
