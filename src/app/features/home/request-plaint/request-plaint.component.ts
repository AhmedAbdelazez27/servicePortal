import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
  FormArray,
} from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { NgSelectModule } from '@ng-select/ng-select';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin, Subscription, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { RequestPlaintService } from '../../../core/services/request-plaint.service';
import { AttachmentService } from '../../../core/services/attachments/attachment.service';
import { AuthService } from '../../../core/services/auth.service';
import { TranslationService } from '../../../core/services/translation.service';
import {
  CreateRequestPlaintDto,
  RequestPlaintEvidenceDto,
  RequestPlaintJustificationDto,
  RequestPlaintReasonDto,
  RequestPlaintAttachmentDto,
  Select2Item,
  PlaintReasonsDto,
  UserEntityDto
} from '../../../core/dtos/RequestPlaint/request-plaint.dto';
import {
  AttachmentsConfigDto,
  AttachmentsConfigType,
} from '../../../core/dtos/attachments/attachments-config.dto';

@Component({
  selector: 'app-request-plaint',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    TranslateModule,
    NgSelectModule,
  ],
  templateUrl: './request-plaint.component.html',
  styleUrls: ['./request-plaint.component.scss']
})
export class RequestPlaintComponent implements OnInit, OnDestroy {
  currentStep: number = 1;
  totalSteps: number = 5;
  
  // Forms
  requestPlaintForm!: FormGroup;
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

  constructor(
    private fb: FormBuilder,
    private requestPlaintService: RequestPlaintService,
    private attachmentService: AttachmentService,
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
    
    this.requestPlaintForm = this.fb.group({
      userId: [currentUser?.id || '', Validators.required],
      requestMainApplyServiceId: [null, Validators.required],
      requestingEntityId: [null, Validators.required],
      requestNo: [0], // Will be auto-generated
      requestDate: [new Date().toISOString().split('T')[0], Validators.required],
      details: ['', Validators.required],
      notes: [''],
      // Add form controls for the fields that were using ngModel
      selectedReason: [null],
      newEvidence: [''],
      newJustification: ['']
    });

    // Keep request date enabled for validation but set as readonly in template
    
    // Add form value change subscription for debugging
    this.requestPlaintForm.valueChanges.subscribe(value => {
      
      // Don't trigger validation during form initialization
      // Validation will only happen when user actively interacts with the form
    });
    
    
  }

  loadInitialData(): void {
    this.isLoading = true;
    
    const currentUser = this.authService.getCurrentUser();
    if (currentUser?.id) {
      this.requestPlaintForm.patchValue({
        userId: currentUser.id
      });

      // Load essential data first (user entity and main service options)
      const essentialOperations = [
        this.loadMainApplyServiceOptionsObservable(currentUser.id),
        this.loadUserEntityObservable(currentUser.id)
      ];

      forkJoin(essentialOperations).subscribe({
        next: () => {
    
          this.isLoading = false;
          this.isFormInitialized = true; // Mark form as fully initialized
          
          // Load optional data (these can fail without blocking form initialization)
          this.loadPlaintReasons();
          this.loadAttachmentConfigs();
        },
        error: (error) => {
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

  // Observable version for forkJoin
  loadMainApplyServiceOptionsObservable(userId: string): Observable<any> {
    const request = {
      skip: 0,
      take: 100,
      searchTerm: '',
      userId: userId
    };

    return this.requestPlaintService.getMainApplyServiceSelect2(request).pipe(
      map(response => {
        this.mainApplyServiceOptions = response.results || [];
        return response;
      })
    );
  }

  loadMainApplyServiceOptions(userId: string): void {
    const request = {
      skip: 0,
      take: 100,
      searchTerm: '',
      userId: userId
    };

    const sub = this.requestPlaintService.getMainApplyServiceSelect2(request).subscribe({
      next: (response) => {
        this.mainApplyServiceOptions = response.results || [];
      },
      error: (error) => {
        console.error('Error loading main apply service options:', error);
      }
    });
    this.subscriptions.push(sub);
  }

  // Observable version for forkJoin
  loadUserEntityObservable(userId: string): Observable<any> {
    return this.requestPlaintService.getUserEntities(userId).pipe(
      map(entities => {
        
        if (entities && entities.length > 0) {
          this.userEntities = entities;
          this.userEntity = entities[0];
          
          // Set the default selected entity in the form
          this.requestPlaintForm.patchValue({
            requestingEntityId: entities[0].id
          });
          
          // Trigger change detection
          this.cdr.detectChanges();
        } else {
          console.warn('No user entities found for userId:', userId);
          // Disable the form if no entities are available
          this.requestPlaintForm.disable();
        }
        return entities;
      })
    );
  }

  loadUserEntity(userId: string): void {
    const sub = this.requestPlaintService.getUserEntities(userId).subscribe({
      next: (entities) => {
        
        if (entities && entities.length > 0) {
          this.userEntities = entities;
          this.userEntity = entities[0]; // Take the first entity for the user
          

          
          // Set the default selected entity in the form
          this.requestPlaintForm.patchValue({
            requestingEntityId: entities[0].id
          });
          
          // Also try setting the value directly to ensure it's updated
          this.requestPlaintForm.get('requestingEntityId')?.setValue(entities[0].id);
          
          // Trigger change detection to ensure UI updates
          this.cdr.detectChanges();
        } else {
          console.warn('No user entities found for userId:', userId);
          // Only show warning toast if form is initialized and not in loading state
          if (this.isFormInitialized && !this.isLoading) {
            this.toastr.warning(this.translate.instant('REQUEST_PLAINT.NO_ENTITIES_AVAILABLE'));
          }
          // Disable the form if no entities are available
          this.requestPlaintForm.disable();
        }
      },
      error: (error) => {
        console.error('Error loading user entity:', error);
        // Only show error toast if form is initialized and not in loading state
        if (this.isFormInitialized && !this.isLoading) {
          this.toastr.error(this.translate.instant('ERRORS.FAILED_LOAD_DATA'));
        }
        // Disable the form on error
        this.requestPlaintForm.disable();
      }
    });
    this.subscriptions.push(sub);
  }

  loadPlaintReasons(): void {
    
    // First test the direct API endpoint
    this.requestPlaintService.testPlaintReasonsEndpoint().subscribe({
      next: (response) => {

      },
      error: (error) => {
        console.error('Direct API test error:', error);
        
        // If API fails, add sample data for testing
        this.plaintReasonsOptions = [
          {
            id: 1,
            reasonText: 'مصادرة حصيلة جمع تبرعات',
            reasonTextEn: 'Confiscation of fundraising proceeds',
            isActive: true
          },
          {
            id: 2,
            reasonText: 'سوء إدارة الأموال',
            reasonTextEn: 'Poor money management',
            isActive: true
          },
          {
            id: 3,
            reasonText: 'عدم الالتزام باللوائح',
            reasonTextEn: 'Non-compliance with regulations',
            isActive: true
          }
        ];

      }
    });
    
    const sub = this.requestPlaintService.getPlaintReasons().subscribe({
      next: (reasons) => {
        this.plaintReasonsOptions = reasons || [];
        
        if (this.plaintReasonsOptions.length === 0) {
          console.warn('No plaint reasons returned from API');
          // Only show warning toast if form is initialized and not in loading state
          if (this.isFormInitialized && !this.isLoading) {
            this.toastr.warning(this.translate.instant('REQUEST_PLAINT.NO_REASONS_AVAILABLE'));
          }
        }
      },
      error: (error) => {
        console.error('Error loading plaint reasons:', error);
        console.error('Error details:', {
          status: error.status,
          statusText: error.statusText,
          message: error.message,
          url: error.url
        });
        // Only show error toast if form is initialized and not in loading state
        if (this.isFormInitialized && !this.isLoading) {
          this.toastr.error(this.translate.instant('ERRORS.FAILED_LOAD_PLAINT_REASONS'));
        }
        
        // Set empty array to prevent undefined errors
        this.plaintReasonsOptions = [];
      }
    });
    this.subscriptions.push(sub);
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
    if (this.currentStep < this.totalSteps) {
      // Only validate if we're not in loading state and form is ready
      if (!this.isLoading && this.requestPlaintForm && this.isFormInitialized) {
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
    if (this.isLoading || !this.requestPlaintForm || !this.isFormInitialized) {
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
    const form = this.requestPlaintForm;
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
    if (this.requestPlaintForm.get('newEvidence')?.value.trim()) {
      this.evidences.push({
        mainApplyServiceId: 0,
        evidence: this.requestPlaintForm.get('newEvidence')?.value.trim()
      });
      this.requestPlaintForm.get('newEvidence')?.setValue('');
    }
  }

  onReasonSelectionChange(event: any): void {
    // Check if the selected reason exists in the options
    if (this.requestPlaintForm.get('selectedReason')?.value) {
      const selectedOption = this.plaintReasonsOptions.find(r => r.id === this.requestPlaintForm.get('selectedReason')?.value);
    }
  }



  removeEvidence(index: number): void {
    this.evidences.splice(index, 1);
  }

  addJustification(): void {
    if (this.requestPlaintForm.get('newJustification')?.value.trim()) {
      this.justifications.push({
        mainApplyServiceId: 0,
        justification: this.requestPlaintForm.get('newJustification')?.value.trim()
      });
      this.requestPlaintForm.get('newJustification')?.setValue('');
    }
  }

  removeJustification(index: number): void {
    this.justifications.splice(index, 1);
  }

  addReason(): void {
    if (this.requestPlaintForm.get('selectedReason')?.value) {
      // Check if reason already exists
      const existingReason = this.reasons.find(r => r.lkpPlaintReasonsId === this.requestPlaintForm.get('selectedReason')?.value);
      if (!existingReason) {
        this.reasons.push({
          mainApplyServiceId: 0,
          lkpPlaintReasonsId: this.requestPlaintForm.get('selectedReason')?.value
        });
        this.requestPlaintForm.get('selectedReason')?.setValue(null);
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

  getUserEntityName(): string {
    if (this.userEntity) {
      const currentLang = this.translationService.currentLang;
      return currentLang === 'ar' ? this.userEntity.entityName : this.userEntity.entityNameEn;
    }
    return '';
  }

  getSelectedEntityDisplayName(): string {
    const selectedEntityId = this.requestPlaintForm.get('requestingEntityId')?.value;
    if (selectedEntityId) {
      const selectedEntity = this.userEntities.find(entity => entity.id === selectedEntityId);
      if (selectedEntity) {
        return selectedEntity[this.entityDisplayField as keyof UserEntityDto] as string;
      }
    }
    return '';
  }

  selectEntity(entityId: string): void {
    this.requestPlaintForm.patchValue({ requestingEntityId: entityId });
    
    const selectedEntity = this.userEntities.find(entity => entity.id === entityId);
    if (selectedEntity) {
      this.userEntity = selectedEntity;

    }
  }

  // Method to refresh entity display (useful when language changes)
  refreshEntityDisplay(): void {
    
    // Force form update to refresh the display
    const currentValue = this.requestPlaintForm.get('requestingEntityId')?.value;
    if (currentValue) {
      this.requestPlaintForm.patchValue({ requestingEntityId: currentValue });
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
      const formData = this.requestPlaintForm.getRawValue();
      
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
        const step1Valid = !!(this.requestPlaintForm.get('requestMainApplyServiceId')?.valid && 
               this.requestPlaintForm.get('requestingEntityId')?.valid &&
               this.requestPlaintForm.get('details')?.valid);

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
    if (this.isLoading || !this.requestPlaintForm || !this.isFormInitialized) {
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
    
    if (!this.requestPlaintForm) {
      return false;
    }
    
    // Wait for form to be properly initialized
    if (!this.isFormInitialized) {
      return false;
    }
    
    // Check only the most essential required fields
    const requiredFields = ['requestMainApplyServiceId', 'requestingEntityId', 'details'];
    const fieldResults = requiredFields.map(field => {
      const control = this.requestPlaintForm.get(field);
      const hasValue = control && control.value && control.value.toString().trim();
      return hasValue;
    });
    
    const allFieldsValid = fieldResults.every(result => result);
    
    return allFieldsValid;
  }

  
}
