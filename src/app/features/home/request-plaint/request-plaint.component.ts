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
import { forkJoin, Subscription, Observable, Subject } from 'rxjs';
import { map, takeUntil } from 'rxjs/operators';
import { RequestPlaintService } from '../../../core/services/request-plaint.service';
import { AttachmentService } from '../../../core/services/attachments/attachment.service';
import { AuthService } from '../../../core/services/auth.service';
import { TranslationService } from '../../../core/services/translation.service';
import {
  CreateRequestPlaintDto,
  UpdateRequestPlaintDto,
  RequestPlaintEvidenceDto,
  RequestPlaintJustificationDto,
  RequestPlaintReasonDto,
  RequestPlaintAttachmentDto,
  Select2Item,
  PlaintReasonsDto,
  UserEntityDto,
} from '../../../core/dtos/RequestPlaint/request-plaint.dto';
import {
  AttachmentsConfigDto,
  AttachmentsConfigType,
} from '../../../core/dtos/attachments/attachments-config.dto';
import {
  AttachmentDto,
  UpdateAttachmentBase64Dto,
  AttachmentBase64Dto,
} from '../../../core/dtos/attachments/attachment.dto';
import { environment } from '../../../../environments/environment';
import {
  FiltermainApplyServiceByIdDto,
  mainApplyServiceDto,
} from '../../../core/dtos/mainApplyService/mainApplyService.dto';
import { MainApplyService } from '../../../core/services/mainApplyService/mainApplyService.service';
import { SpinnerService } from '../../../core/services/spinner.service';

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
  styleUrls: ['./request-plaint.component.scss'],
})
export class RequestPlaintComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  currentStep: number = 1;
  totalSteps: number = 2;
  
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
  loadformData: mainApplyServiceDto = {} as mainApplyServiceDto;

  // Computed property for entity display name
  get entityDisplayField(): string {
    return this.translationService.currentLang === 'ar'
      ? 'entityName'
      : 'entityNameEn';
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

  // Update mode properties
  requestPlaintId: number | null = null;
  mainApplyServiceId: number | null = null;
  requestPlaintMasterId: number | null = null;
  existingAttachments: { [key: number]: AttachmentDto } = {};
  attachmentsToDelete: { [key: number]: number } = {};

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
    private mainApplyService: MainApplyService,
    private spinnerService: SpinnerService,
    private cdr: ChangeDetectorRef
  ) {
    this.initializeForm();
    const nav = this.router.getCurrentNavigation();
    this.loadformData = nav?.extras?.state?.['loadformData'];
  }

  ngOnInit(): void {
    // Clear any existing toasts to ensure clean start
    this.clearAllToasts();
    
    // Check if we have an id in route params (update mode)
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      // Load request details for update mode
      this.loadRequestDetails(id);
    } else {
      // Create mode - load initial data normally
      this.loadInitialData();
    }
  }

  /**
   * Load request details from API for update mode
   */


  private replaceNullStrings(obj: any): any {
    if (obj === 'NULL') return '';
    if (Array.isArray(obj)) return obj.map(item => this.replaceNullStrings(item));
    if (obj && typeof obj === 'object') {
      const newObj: any = {};
      Object.keys(obj).forEach(key => {
        newObj[key] = this.replaceNullStrings(obj[key]);
      });
      return newObj;
    }
    return obj;
  }

  private loadRequestDetails(id: string): void {
    this.isLoading = true;
    this.spinnerService.show();

    const params: FiltermainApplyServiceByIdDto = { id };
    const sub = this.mainApplyService.getDetailById(params).subscribe({
      next: (response: mainApplyServiceDto) => {
        response = this.replaceNullStrings(response);
        this.loadformData = response;
        
        // Extract request plaint data
        const requestPlaint = response.requestPlaint;
        if (requestPlaint) {
          this.requestPlaintId = requestPlaint.id || null;
          this.mainApplyServiceId = response.id || null;
          this.requestPlaintMasterId = requestPlaint.id || null;

          // Populate form
          this.requestPlaintForm.patchValue({
            requestDate: requestPlaint.requestDate 
              ? (requestPlaint.requestDate instanceof Date 
                  ? requestPlaint.requestDate.toISOString().split('T')[0] 
                  : new Date(requestPlaint.requestDate).toISOString().split('T')[0])
              : new Date().toISOString().split('T')[0],
            details: requestPlaint.details || '',
            notes: requestPlaint.notes || '',
          });

          // Load related data (from mainApplyServiceDto, not requestPlaint)
          this.evidences = (response.requestPlaintEvidences as unknown as RequestPlaintEvidenceDto[]) || [];
          this.justifications = (response.requestPlaintJustifications as unknown as RequestPlaintJustificationDto[]) || [];
          this.reasons = (response.requestPlaintReasons as unknown as RequestPlaintReasonDto[]) || [];

          // Load existing attachments
          if (requestPlaint.attachmentsConfigs && requestPlaint.attachmentsConfigs.length > 0) {
            this.loadExistingAttachments(requestPlaint.attachmentsConfigs);
          } else if (response.attachments && response.attachments.length > 0) {
            // Load from response.attachments
            const attachmentsData = response.attachments.map((att: any) => ({
              id: att.id,
              imgPath: att.imgPath,
              masterId: att.masterId,
              attConfigID: att.attConfigID,
              lastModified: att.lastModified,
            }));
            this.loadExistingAttachments(attachmentsData);
          } else if (this.mainApplyServiceId) {
            // If attachmentsConfigs not available, load from API
            // Use mainApplyServiceId as masterId for attachments
            this.loadAttachmentsFromAPI(this.mainApplyServiceId);
          }
        }

        // Load initial data (dropdowns, etc.) - this will also load attachment configs
        this.loadInitialData();
        this.isLoading = false;
        this.spinnerService.hide();
      },
      error: (error) => {
        console.error('Error loading request details:', error);
        this.toastr.error(this.translate.instant('COMMON.ERROR_LOADING_DATA'));
        this.router.navigate(['/request']);
        this.isLoading = false;
        this.spinnerService.hide();
      }
    });
    this.subscriptions.push(sub);
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
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  initializeForm(): void {
    const currentUser = this.authService.getCurrentUser();

    this.requestPlaintForm = this.fb.group({
      userId: [currentUser?.id || '', Validators.required],
      requestMainApplyServiceId: [null, Validators.required],
      requestingEntityId: [null],
      requestNo: [0], // Will be auto-generated
      requestDate: [
        new Date().toISOString().split('T')[0],
        Validators.required,
      ],
      details: ['', Validators.required],
      notes: [''],
      // Add form controls for the fields that were using ngModel
      selectedReason: [null],
      newEvidence: [''],
      newJustification: [''],
    });

    // Keep request date enabled for validation but set as readonly in template

    // Add form value change subscription for debugging
    this.requestPlaintForm.valueChanges.subscribe((value) => {
      // Don't trigger validation during form initialization
      // Validation will only happen when user actively interacts with the form
    });
  }

  loadInitialData(): void {
    // Don't set isLoading to true if we're already loading (update mode)
    if (!this.requestPlaintId) {
      this.isLoading = true;
    }

    const currentUser = this.authService.getCurrentUser();
    if (currentUser?.id) {
      this.requestPlaintForm.patchValue({
        userId: currentUser.id,
      });

      // Load essential data first (user entity and main service options)
      const essentialOperations = [
        this.loadMainApplyServiceOptionsObservable(currentUser.id),
        this.loadUserEntityObservable(currentUser.id),
      ];

      forkJoin(essentialOperations).subscribe({
        next: () => {
          // In update mode, ensure requestMainApplyServiceId is set after options are loaded
          if (this.requestPlaintId && this.loadformData?.requestPlaint?.requestMainApplyServiceId) {
            const serviceId = this.loadformData.requestPlaint.requestMainApplyServiceId;
            // Use setTimeout to ensure ng-select is ready to receive the value
            setTimeout(() => {
              this.requestPlaintForm.patchValue({
                requestMainApplyServiceId: serviceId.toString(),
              });
              // Trigger change detection to ensure ng-select updates
              this.cdr.detectChanges();
            }, 0);
          }
          
          if (!this.requestPlaintId) {
            this.isLoading = false;
          }
          this.isFormInitialized = true; // Mark form as fully initialized

          // Load optional data (these can fail without blocking form initialization)
          // Always load attachment configs - important for update mode to show optional attachments
          this.loadPlaintReasons();
          this.loadAttachmentConfigs();
        },
        error: (error) => {
          console.error('Error loading essential data:', error);
          this.toastr.error(this.translate.instant('ERRORS.FAILED_LOAD_DATA'));
          this.isLoading = false;
          // Still initialize form even if some data fails to load
          this.isFormInitialized = true;
        },
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
      userId: userId,
      isForRequestPlaint: true,
    };

    return this.requestPlaintService.getMainApplyServiceSelect2(request).pipe(
      map((response) => {
        
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
      userId: userId,
      isForRequestPlaint: true,
    };

    const sub = this.requestPlaintService
      .getMainApplyServiceSelect2(request)
      .subscribe({
        next: (response) => {
          this.mainApplyServiceOptions = response.results || [];
        },
        error: (error) => {
          console.error('Error loading main apply service options:', error);
        },
      });
    this.subscriptions.push(sub);
  }

  // Observable version for forkJoin
  loadUserEntityObservable(userId: string): Observable<any> {
    return this.requestPlaintService.getUserEntities(userId).pipe(
      map((entities) => {
        if (entities && entities.length > 0) {
          this.userEntities = entities;
          this.userEntity = entities[0];

          // Set the default selected entity in the form
          // this.requestPlaintForm.patchValue({
          //   requestingEntityId: entities[0].id
          // });

          // Trigger change detection
          this.cdr.detectChanges();
        }
        // else {
        //   console.warn('No user entities found for userId:', userId);
        //   // Disable the form if no entities are available
        //   this.requestPlaintForm.disable();
        // }
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
          // this.requestPlaintForm.patchValue({
          //   requestingEntityId: entities[0].id
          // });

          // Also try setting the value directly to ensure it's updated
          // this.requestPlaintForm.get('requestingEntityId')?.setValue(entities[0].id);

          // Trigger change detection to ensure UI updates
          this.cdr.detectChanges();
        } else {
          console.warn('No user entities found for userId:', userId);
          // Only show warning toast if form is initialized and not in loading state
          if (this.isFormInitialized && !this.isLoading) {
            this.toastr.warning(
              this.translate.instant('REQUEST_PLAINT.NO_ENTITIES_AVAILABLE')
            );
          }
          // Disable the form if no entities are available
          // this.requestPlaintForm.disable();
        }
      },
      error: (error) => {
        console.error('Error loading user entity:', error);
        // Only show error toast if form is initialized and not in loading state
        if (this.isFormInitialized && !this.isLoading) {
          this.toastr.error(this.translate.instant('ERRORS.FAILED_LOAD_DATA'));
        }
        // Disable the form on error
        // this.requestPlaintForm.disable();
      },
    });
    this.subscriptions.push(sub);
  }

  loadPlaintReasons(): void {
    // First test the direct API endpoint
    this.requestPlaintService.testPlaintReasonsEndpoint().subscribe({
      next: (response) => {},
      error: (error) => {
        console.error('Direct API test error:', error);

        // If API fails, add sample data for testing
        this.plaintReasonsOptions = [
          {
            id: 1,
            reasonText: 'مصادرة حصيلة جمع تبرعات',
            reasonTextEn: 'Confiscation of fundraising proceeds',
            isActive: true,
          },
          {
            id: 2,
            reasonText: 'سوء إدارة الأموال',
            reasonTextEn: 'Poor money management',
            isActive: true,
          },
          {
            id: 3,
            reasonText: 'عدم الالتزام باللوائح',
            reasonTextEn: 'Non-compliance with regulations',
            isActive: true,
          },
        ];
      },
    });

    const sub = this.requestPlaintService.getPlaintReasons().subscribe({
      next: (reasons) => {
        this.plaintReasonsOptions = reasons || [];

        if (this.plaintReasonsOptions.length === 0) {
          console.warn('No plaint reasons returned from API');
          // Only show warning toast if form is initialized and not in loading state
          if (this.isFormInitialized && !this.isLoading) {
            this.toastr.warning(
              this.translate.instant('REQUEST_PLAINT.NO_REASONS_AVAILABLE')
            );
          }
        }
      },
      error: (error) => {
        console.error('Error loading plaint reasons:', error);
        console.error('Error details:', {
          status: error.status,
          statusText: error.statusText,
          message: error.message,
          url: error.url,
        });
        // Only show error toast if form is initialized and not in loading state
        if (this.isFormInitialized && !this.isLoading) {
          this.toastr.error(
            this.translate.instant('ERRORS.FAILED_LOAD_PLAINT_REASONS')
          );
        }

        // Set empty array to prevent undefined errors
        this.plaintReasonsOptions = [];
      },
    });
    this.subscriptions.push(sub);
  }

  loadAttachmentConfigs(): void {
    const sub = this.attachmentService
      .getAttachmentsConfigByType(AttachmentsConfigType.RequestAGrievance)
      .subscribe({
        next: (configs) => {
          this.attachmentConfigs = configs || [];
          
          // In update mode, ensure we have all configs even if some attachments weren't uploaded initially
          // This allows users to upload optional attachments that were missed
          if (this.requestPlaintId) {
            // Merge existing attachments with configs to ensure all configs are available
            // This is important for optional attachments that weren't uploaded initially
            configs.forEach((config) => {
              if (!this.existingAttachments[config.id!]) {
                // This config doesn't have an attachment yet - user can upload it now
                // We don't need to add it to attachments array, just ensure config is available
              }
            });
          } else {
            // Initialize attachments array based on configs (only for new attachments)
            this.attachments = this.attachmentConfigs.map((config) => ({
              fileBase64: '',
              fileName: '',
              masterId: 0,
              attConfigID: config.id!,
            }));
          }
        },
        error: (error) => {
          console.error('Error loading attachment configs:', error);
        },
      });
    this.subscriptions.push(sub);
  }

  /**
   * Load attachments from API using masterId and masterType
   */
  private loadAttachmentsFromAPI(masterId: number): void {
    // Master type for RequestPlaint - use AttachmentsConfigType.RequestAGrievance (9)
    // Master ID should be the mainApplyServiceId (not requestPlaint.id)
    const masterType = AttachmentsConfigType.RequestAGrievance;
    
    const sub = this.attachmentService.getListByMasterId(masterId, masterType).subscribe({
      next: (attachments: AttachmentDto[]) => {
        
        // Convert API attachments to the format expected by loadExistingAttachments
        const attachmentsData = attachments.map(att => ({
          id: att.id,
          imgPath: att.imgPath,
          masterId: att.masterId,
          attConfigID: att.attConfigID,
          lastModified: att.lastModified,
        }));
        
        if (attachmentsData.length > 0) {
          this.loadExistingAttachments(attachmentsData);
        }
      },
      error: (error) => {
        console.error('Error loading attachments from API:', error);
        // Don't show error to user, just log it - attachments might not exist yet
      }
    });
    this.subscriptions.push(sub);
  }

  /**
   * Load existing attachments from request data
   */
  private loadExistingAttachments(attachmentsData: any[]): void {
    
    attachmentsData.forEach((attachment: any) => {
      if (attachment.attConfigID && attachment.id) {
        // Store existing attachment info - only if id exists
        this.existingAttachments[attachment.attConfigID] = {
          id: attachment.id,
          imgPath: attachment.imgPath,
          masterId: attachment.masterId || this.mainApplyServiceId || 0,
          attConfigID: attachment.attConfigID,
          lastModified: attachment.lastModified ? new Date(attachment.lastModified) : undefined,
        };
        
        // Set preview for existing attachments
        if (attachment.imgPath) {
          const isImage = attachment.imgPath.match(/\.(jpg|jpeg|png|gif)$/i);
          const imageUrl = isImage 
            ? this.constructImageUrl(attachment.imgPath)
            : 'assets/images/file.png';
          
          this.filePreviews[attachment.attConfigID] = imageUrl;
        }
      }
    });
    
  }

  /**
   * Construct full image URL from path
   */
  private constructImageUrl(path: string): string {
    if (!path) return '';
    // If path already contains http/https, return as is
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }
    // Otherwise, construct URL with base URL
    const baseUrl = environment.apiBaseUrl.replace('/api', '');
    return `${baseUrl}${path}`;
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
        return true; // Attachments validation in upload
      default:
        return true;
    }
  }

  validateStep1(): boolean {
    const form = this.requestPlaintForm;
    const requiredFields = ['requestMainApplyServiceId', 'details'];

    for (const field of requiredFields) {
      if (!form.get(field)?.value) {
        // Use helper method to show validation toast only when appropriate
        this.showValidationToast(
          this.translate.instant(`VALIDATION.REQUIRED_FIELD`)
        );
        return false;
      }else{
        
      }
    }
    return true;
  }

  // Table management methods
  addEvidence(): void {
    if (this.requestPlaintForm.get('newEvidence')?.value.trim()) {
      this.evidences.push({
        mainApplyServiceId: 0,
        evidence: this.requestPlaintForm.get('newEvidence')?.value.trim(),
      });
      this.requestPlaintForm.get('newEvidence')?.setValue('');
    }
  }

  onReasonSelectionChange(event: any): void {
    // Check if the selected reason exists in the options
    if (this.requestPlaintForm.get('selectedReason')?.value) {
      const selectedOption = this.plaintReasonsOptions.find(
        (r) => r.id === this.requestPlaintForm.get('selectedReason')?.value
      );
    }
  }

  removeEvidence(index: number): void {
    this.evidences.splice(index, 1);
  }

  addJustification(): void {
    if (this.requestPlaintForm.get('newJustification')?.value.trim()) {
      this.justifications.push({
        mainApplyServiceId: 0,
        justification: this.requestPlaintForm
          .get('newJustification')
          ?.value.trim(),
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
      const existingReason = this.reasons.find(
        (r) =>
          r.lkpPlaintReasonsId ===
          this.requestPlaintForm.get('selectedReason')?.value
      );
      if (!existingReason) {
        this.reasons.push({
          mainApplyServiceId: 0,
          lkpPlaintReasonsId:
            this.requestPlaintForm.get('selectedReason')?.value,
        });
        this.requestPlaintForm.get('selectedReason')?.setValue(null);
      } else {
        this.toastr.warning(
          this.translate.instant('WARNINGS.REASON_ALREADY_ADDED')
        );
      }
    }
  }

  removeReason(index: number): void {
    this.reasons.splice(index, 1);
  }

  getReasonText(reasonId: number): string {
    const reason = this.plaintReasonsOptions.find((r) => r.id === reasonId);
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

    // IMPORTANT: In update mode, if there's an existing attachment, we keep it in existingAttachments
    // so we can call update (not create) when saving. We don't delete it here.
    // The existing attachment will be updated when saving via handleAttachmentOperations
    this.selectedFiles[configId] = file;

    // Create preview for the new file
    const reader = new FileReader();
    reader.onload = (e) => {
      this.filePreviews[configId] = e.target?.result as string;

      // Update attachment data (only for create mode)
      if (!this.requestPlaintId) {
        const attachmentIndex = this.attachments.findIndex(
          (a) => a.attConfigID === configId
        );
        if (attachmentIndex !== -1) {
          this.attachments[attachmentIndex] = {
            ...this.attachments[attachmentIndex],
            fileBase64: (e.target?.result as string).split(',')[1], // Remove data:image/... prefix
            fileName: file.name,
          };
        }
      }
      // Note: In update mode, we don't update the attachments array here
      // because attachments are handled separately via handleAttachmentOperations
    };
    reader.readAsDataURL(file);
  }

  validateFile(file: File): boolean {
    const maxSize = 5 * 1024 * 1024; // 5MB
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];

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

  /**
   * Remove new file selection (before upload) - only for new files, not existing attachments
   */
  removeFile(configId: number): void {
    // Only remove new file selection, not existing attachments
    // For existing attachments, use removeExistingFile() instead
    delete this.selectedFiles[configId];
    
    // Remove preview for new file
    const existingAttachment = this.existingAttachments[configId];
    if (!existingAttachment) {
      // No existing attachment, so remove preview completely
      delete this.filePreviews[configId];
    } else {
      // Restore existing attachment preview
      if (existingAttachment.imgPath) {
        const isImage = existingAttachment.imgPath.match(/\.(jpg|jpeg|png|gif)$/i);
        this.filePreviews[configId] = isImage 
          ? this.constructImageUrl(existingAttachment.imgPath)
          : 'assets/images/file.png';
      } else {
        this.filePreviews[configId] = 'assets/images/file.png';
      }
    }

    // Update attachments array (only for create mode)
    if (!this.requestPlaintId) {
      const attachmentIndex = this.attachments.findIndex(
        (a) => a.attConfigID === configId
      );
      if (attachmentIndex !== -1) {
        this.attachments[attachmentIndex] = {
          ...this.attachments[attachmentIndex],
          fileBase64: '',
          fileName: '',
        };
      }
    }
  }

  /**
   * Convert file to base64 string
   */
  private async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1]; // Remove data:image/... prefix
        resolve(base64);
      };
      reader.onerror = error => reject(error);
    });
  }

  /**
   * Delete attachments marked for deletion
   */
  private async deleteAttachments(): Promise<void> {
    const deletePromises: Promise<void>[] = [];
    
    for (const [configId, attachmentId] of Object.entries(this.attachmentsToDelete)) {
      deletePromises.push(
        this.attachmentService.deleteAsync(attachmentId).toPromise() as Promise<void>
      );
    }
    
    if (deletePromises.length > 0) {
      try {
        await Promise.all(deletePromises);
      } catch (error) {
        console.error('Error deleting attachments:', error);
        throw error;
      }
    }
  }

  /**
   * Handle all attachment operations (create, update, delete) for update mode
   */
  async handleAttachmentOperations(): Promise<void> {
    const attachmentPromises: Promise<any>[] = [];
    
    // First handle deletions
    if (Object.keys(this.attachmentsToDelete).length > 0) {
      try {
        await this.deleteAttachments();
      } catch (error) {
        console.error('Error deleting attachments:', error);
        throw error;
      }
    }
    
    // Then handle new file uploads and updates
    for (const [configId, file] of Object.entries(this.selectedFiles)) {
      const configIdNum = parseInt(configId);
      // Check if there was an existing attachment (even if user selected a new file)
      // We need to check BEFORE the file was selected, so we look in the original data
      // But since we keep existingAttachments when selecting new file, we can check it directly
      const existingAttachment = this.existingAttachments[configIdNum];
      
      if (existingAttachment) {
        // Update existing attachment - use existing masterId (should be mainApplyServiceId)
        const updateAttachmentDto: UpdateAttachmentBase64Dto = {
          id: existingAttachment.id,
          fileBase64: await this.fileToBase64(file as File),
          fileName: (file as File).name,
          masterId: existingAttachment.masterId || this.mainApplyServiceId || 0,
          attConfigID: configIdNum
        };
        
        attachmentPromises.push(
          this.attachmentService.updateAsync(updateAttachmentDto).toPromise()
        );
      } else {
        // Create new attachment - use mainApplyServiceId as masterId
        const newAttachmentDto: AttachmentBase64Dto = {
          fileBase64: await this.fileToBase64(file as File),
          fileName: (file as File).name,
          masterId: this.mainApplyServiceId || 0,
          attConfigID: configIdNum
        };
        
        attachmentPromises.push(
          this.attachmentService.saveAttachmentFileBase64(newAttachmentDto).toPromise()
        );
      }
    }

    // Execute all attachment operations
    if (attachmentPromises.length > 0) {
      try {
        await Promise.all(attachmentPromises);
      } catch (attachmentError) {
        console.error('Error handling attachments:', attachmentError);
        throw attachmentError;
      }
    }
    
    // Clear deletion tracking after successful operations
    this.attachmentsToDelete = {};
  }

  getAttachmentName(config: AttachmentsConfigDto): string {
    const currentLang = this.translationService.currentLang;
    return currentLang === 'ar'
      ? config.name || ''
      : config.nameEn || config.name || '';
  }

  /**
   * Check if file path is an image
   */
  isImageFile(imgPath: string | undefined | null): boolean {
    if (!imgPath) return false;
    return /\.(jpg|jpeg|png|gif)$/i.test(imgPath);
  }

  /**
   * Get file name from path
   */
  getFileNameFromPath(imgPath: string | undefined | null): string {
    if (!imgPath) return this.translate.instant('FILE') || 'FILE';
    const fileName = imgPath.split('/').pop();
    return fileName || this.translate.instant('FILE') || 'FILE';
  }

  /**
   * Trigger file input click programmatically for existing attachments
   */
  triggerFileInput(configId: number): void {
    const fileInput = document.getElementById(`file-${configId}`) as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    }
  }

  /**
   * View attachment in new window/tab
   */
  viewAttachment(configId: number): void {
    const attachment = this.existingAttachments[configId];
    if (attachment && attachment.imgPath) {
      const imageUrl = this.constructImageUrl(attachment.imgPath);
      window.open(imageUrl, '_blank');
    }
  }

  /**
   * Remove existing file with confirmation
   */
  removeExistingFile(configId: number): void {
    const existingAttachment = this.existingAttachments[configId];
    const config = this.attachmentConfigs.find(c => c.id === configId);
    
    if (!existingAttachment || !config) return;
    
    // Show confirmation dialog
    const confirmMessage = this.translate.instant('EDIT_PROFILE.CONFIRM_DELETE_ATTACHMENT') || 'Are you sure you want to delete this attachment?';
    if (confirm(confirmMessage)) {
      // Mark for deletion (will be processed during form submission)
      this.attachmentsToDelete[configId] = existingAttachment.id;
      
      // Remove from UI - this will show the upload area
      delete this.existingAttachments[configId];
      delete this.filePreviews[configId];
      
      // Reset file input
      const fileInput = document.getElementById(`file-${configId}`) as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
      }
      
      this.toastr.success(
        this.translate.instant('EDIT_PROFILE.ATTACHMENT_MARKED_FOR_DELETION') || 'Attachment marked for deletion',
        this.translate.instant('TOAST.TITLE.SUCCESS') || 'Success'
      );
    }
  }

  getUserEntityName(): string {
    if (this.userEntity) {
      const currentLang = this.translationService.currentLang;
      return currentLang === 'ar'
        ? this.userEntity.entityName
        : this.userEntity.entityNameEn;
    }
    return '';
  }

  getSelectedEntityDisplayName(): string {
    const selectedEntityId =
      this.requestPlaintForm.get('requestingEntityId')?.value;
    if (selectedEntityId) {
      const selectedEntity = this.userEntities.find(
        (entity) => entity.id === selectedEntityId
      );
      if (selectedEntity) {
        return selectedEntity[
          this.entityDisplayField as keyof UserEntityDto
        ] as string;
      }
    }
    return '';
  }

  selectEntity(entityId: string): void {
    this.requestPlaintForm.patchValue({ requestingEntityId: entityId });

    const selectedEntity = this.userEntities.find(
      (entity) => entity.id === entityId
    );
    if (selectedEntity) {
      this.userEntity = selectedEntity;
    }
  }

  // Method to refresh entity display (useful when language changes)
  refreshEntityDisplay(): void {
    // Force form update to refresh the display
    const currentValue =
      this.requestPlaintForm.get('requestingEntityId')?.value;
    if (currentValue) {
      this.requestPlaintForm.patchValue({ requestingEntityId: currentValue });
    }
  }

  // Submit form
  async onSubmit(isDraft: boolean = false): Promise<void> {
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
      const formData = this.requestPlaintForm.getRawValue();

      // Get current user info
      const currentUser = this.authService.getCurrentUser();
      if (!currentUser?.id) {
        this.toastr.error(this.translate.instant('ERRORS.USER_NOT_FOUND'));
        this.isSaving = false;
        return;
      }

      // Determine if this is update or create
      const isUpdateMode = !!this.requestPlaintId && !!this.mainApplyServiceId;

      if (isUpdateMode) {
        // Handle attachments separately (update/create/delete)
        // Use mainApplyServiceId as masterId for attachments
        if (this.mainApplyServiceId) {
          try {
            await this.handleAttachmentOperations();
          } catch (attachmentError) {
            console.error('Error handling attachments:', attachmentError);
            this.toastr.warning(
              this.translate.instant('EDIT_PROFILE.ATTACHMENT_SAVE_WARNING')
            );
          }
        }

        // Update mode
        // Format requestDate properly
        let requestDateValue: string;
        if (formData.requestDate) {
          requestDateValue = new Date(formData.requestDate).toISOString();
        } else if (this.loadformData?.requestPlaint?.requestDate) {
          const dateValue = this.loadformData.requestPlaint.requestDate;
          requestDateValue = dateValue instanceof Date 
            ? dateValue.toISOString() 
            : new Date(dateValue).toISOString();
        } else {
          requestDateValue = new Date().toISOString();
        }

        const updateDto: UpdateRequestPlaintDto = {
          id: this.requestPlaintId!,
          mainApplyServiceId: this.mainApplyServiceId!,
          requestMainApplyServiceId: formData.requestMainApplyServiceId,
          requestNo: this.loadformData?.requestPlaint?.requestNo || 0,
          requestDate: requestDateValue,
          details: formData.details,
          notes: formData.notes || null,
          isDraft: isDraft,
          requestPlaintEvidences: this.evidences.length > 0 ? this.evidences : null,
          requestPlaintJustifications: this.justifications.length > 0 ? this.justifications : null,
          requestPlaintReasons: this.reasons.length > 0 ? this.reasons : null,
        };

        const sub = this.requestPlaintService.update(updateDto).subscribe({
          next: (response) => {
            if (isDraft) {
              this.toastr.success(
                this.translate.instant('SUCCESS.REQUEST_PLAINT_SAVED_AS_DRAFT')
              );
            } else {
              this.toastr.success(
                this.translate.instant('SUCCESS.REQUEST_PLAINT_CREATED')
              );
            }
            this.router.navigate(['/request']);
            this.isSaving = false;
          },
          error: (error) => {
            console.error(`Error ${isDraft ? 'saving draft' : 'updating'} request plaint:`, error);

            if (error.error && error.error.reason) {
              this.toastr.error(error.error.reason);
            } else {
              if (isDraft) {
                this.toastr.error(
                  this.translate.instant('ERRORS.FAILED_SAVE_DRAFT')
                );
              } else {
                this.toastr.error(
                  this.translate.instant('ERRORS.FAILED_CREATE_REQUEST_PLAINT')
                );
              }
            }

            this.isSaving = false;
          },
        });
        this.subscriptions.push(sub);
      } else {
        // Create mode
        // Filter out empty attachments
        const validAttachments = this.attachments.filter(
          (a) => a.fileBase64 && a.fileName
        );

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
          isDraft: isDraft, // Set draft flag based on parameter
          // Note: requestingEntityId is not included as it's only for display purposes
        };

        const sub = this.requestPlaintService.create(createDto).subscribe({
          next: (response) => {
            if (isDraft) {
              this.toastr.success(
                this.translate.instant('SUCCESS.REQUEST_PLAINT_SAVED_AS_DRAFT')
              );
            } else {
              this.toastr.success(
                this.translate.instant('SUCCESS.REQUEST_PLAINT_CREATED')
              );
            }
            this.router.navigate(['/request']);
            this.isSaving = false;
          },
          error: (error) => {
            console.error(`Error ${isDraft ? 'saving draft' : 'creating'} request plaint:`, error);

            // Check if it's a business error with a specific reason
            if (error.error && error.error.reason) {
              // Show the specific reason from the API response
              this.toastr.error(error.error.reason);
            } else {
              // Fallback to generic error message
              if (isDraft) {
                this.toastr.error(
                  this.translate.instant('ERRORS.FAILED_SAVE_DRAFT')
                );
              } else {
                this.toastr.error(
                  this.translate.instant('ERRORS.FAILED_CREATE_REQUEST_PLAINT')
                );
              }
            }

            this.isSaving = false;
          },
        });
        this.subscriptions.push(sub);
      }
    } catch (error: any) {
      console.error(`Error in onSubmit (isDraft: ${isDraft}):`, error);

      // Check if it's a business error with a specific reason
      if (error.error && error.error.reason) {
        // Show the specific reason from the API response
        this.toastr.error(error.error.reason);
      } else {
        // Fallback to generic error message
        if (isDraft) {
          this.toastr.error(
            this.translate.instant('ERRORS.FAILED_SAVE_DRAFT')
          );
        } else {
          this.toastr.error(
            this.translate.instant('ERRORS.FAILED_CREATE_REQUEST_PLAINT')
          );
        }
      }

      this.isSaving = false;
    }
  }

  // Save as Draft
  //async onSaveDraft(): Promise<void> {
  //  await this.onSubmit(true);
  //}


  private normalizeEmptyStrings(obj: any, excludeKeys: string[] = []): any {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj !== 'object') return obj;

    if (Array.isArray(obj)) {
      return obj.map(item => this.normalizeEmptyStrings(item, excludeKeys));
    }

    const copy: any = {};
    for (const key of Object.keys(obj)) {
      const value = obj[key];
      if (excludeKeys.includes(key)) {
        copy[key] = value;
        continue;
      }
      if (typeof value === 'string') {
        copy[key] = value.trim() === '' ? 'NULL' : value;
      } else if (Array.isArray(value)) {
        copy[key] = value.map(v => this.normalizeEmptyStrings(v, excludeKeys));
      } else if (typeof value === 'object' && value !== null) {
        copy[key] = this.normalizeEmptyStrings(value, excludeKeys);
      } else {
        copy[key] = value;
      }
    }
    return copy;
  }

  async onSaveDraft(isDraft: boolean = true): Promise<void> {
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
      const formData = this.requestPlaintForm.getRawValue();

      // Get current user info
      const currentUser = this.authService.getCurrentUser();
      if (!currentUser?.id) {
        this.toastr.error(this.translate.instant('ERRORS.USER_NOT_FOUND'));
        this.isSaving = false;
        return;
      }
      const normalizedFormData = this.normalizeEmptyStrings(formData);

      // Determine if this is update or create
      const isUpdateMode = !!this.requestPlaintId && !!this.mainApplyServiceId;

      if (isUpdateMode) {
        // Handle attachments separately (update/create/delete)
        // Use mainApplyServiceId as masterId for attachments
        if (this.mainApplyServiceId) {
          try {
            await this.handleAttachmentOperations();
          } catch (attachmentError) {
            console.error('Error handling attachments:', attachmentError);
            this.toastr.warning(
              this.translate.instant('EDIT_PROFILE.ATTACHMENT_SAVE_WARNING')
            );
          }
        }

        // Update mode
        // Format requestDate properly
        let requestDateValue: string;
        if (normalizedFormData.requestDate) {
          requestDateValue = new Date(normalizedFormData.requestDate).toISOString();
        } else if (this.loadformData?.requestPlaint?.requestDate) {
          const dateValue = this.loadformData.requestPlaint.requestDate;
          requestDateValue = dateValue instanceof Date
            ? dateValue.toISOString()
            : new Date(dateValue).toISOString();
        } else {
          requestDateValue = new Date().toISOString();
        }

        const updateDto: UpdateRequestPlaintDto = {
          id: this.requestPlaintId!,
          mainApplyServiceId: this.mainApplyServiceId!,
          requestMainApplyServiceId: normalizedFormData.requestMainApplyServiceId,
          requestNo: this.loadformData?.requestPlaint?.requestNo || 0,
          requestDate: requestDateValue,
          details: normalizedFormData.details,
          notes: normalizedFormData.notes || null,
          isDraft: isDraft,
          requestPlaintEvidences: this.evidences.length > 0 ? this.evidences : null,
          requestPlaintJustifications: this.justifications.length > 0 ? this.justifications : null,
          requestPlaintReasons: this.reasons.length > 0 ? this.reasons : null,
        };

        const sub = this.requestPlaintService.update(updateDto).subscribe({
          next: (response) => {
            if (isDraft) {
              this.toastr.success(
                this.translate.instant('SUCCESS.REQUEST_PLAINT_SAVED_AS_DRAFT')
              );
            } else {
              this.toastr.success(
                this.translate.instant('SUCCESS.REQUEST_PLAINT_CREATED')
              );
            }
            this.router.navigate(['/request']);
            this.isSaving = false;
          },
          error: (error) => {
            console.error(`Error ${isDraft ? 'saving draft' : 'updating'} request plaint:`, error);

            if (error.error && error.error.reason) {
              this.toastr.error(error.error.reason);
            } else {
              if (isDraft) {
                this.toastr.error(
                  this.translate.instant('ERRORS.FAILED_SAVE_DRAFT')
                );
              } else {
                this.toastr.error(
                  this.translate.instant('ERRORS.FAILED_CREATE_REQUEST_PLAINT')
                );
              }
            }

            this.isSaving = false;
          },
        });
        this.subscriptions.push(sub);
      } else {
        // Create mode
        // Filter out empty attachments
        const validAttachments = this.attachments.filter(
          (a) => a.fileBase64 && a.fileName
        );

        const createDto: CreateRequestPlaintDto = {
          userId: currentUser.id,
          requestMainApplyServiceId: normalizedFormData.requestMainApplyServiceId,
          requestNo: 0, // Auto-generated in backend
          requestDate: new Date().toISOString(),
          details: normalizedFormData.details,
          notes: normalizedFormData.notes || null,
          attachments: validAttachments,
          requestPlaintEvidences: this.evidences,
          requestPlaintJustifications: this.justifications,
          requestPlaintReasons: this.reasons,
          isDraft: isDraft, // Set draft flag based on parameter
          // Note: requestingEntityId is not included as it's only for display purposes
        };

        const sub = this.requestPlaintService.create(createDto).subscribe({
          next: (response) => {
            if (isDraft) {
              this.toastr.success(
                this.translate.instant('SUCCESS.REQUEST_PLAINT_SAVED_AS_DRAFT')
              );
            } else {
              this.toastr.success(
                this.translate.instant('SUCCESS.REQUEST_PLAINT_CREATED')
              );
            }
            this.router.navigate(['/request']);
            this.isSaving = false;
          },
          error: (error) => {
            console.error(`Error ${isDraft ? 'saving draft' : 'creating'} request plaint:`, error);

            // Check if it's a business error with a specific reason
            if (error.error && error.error.reason) {
              // Show the specific reason from the API response
              this.toastr.error(error.error.reason);
            } else {
              // Fallback to generic error message
              if (isDraft) {
                this.toastr.error(
                  this.translate.instant('ERRORS.FAILED_SAVE_DRAFT')
                );
              } else {
                this.toastr.error(
                  this.translate.instant('ERRORS.FAILED_CREATE_REQUEST_PLAINT')
                );
              }
            }

            this.isSaving = false;
          },
        });
        this.subscriptions.push(sub);
      }
    } catch (error: any) {
      console.error(`Error in onSubmit (isDraft: ${isDraft}):`, error);

      // Check if it's a business error with a specific reason
      if (error.error && error.error.reason) {
        // Show the specific reason from the API response
        this.toastr.error(error.error.reason);
      } else {
        // Fallback to generic error message
        if (isDraft) {
          this.toastr.error(
            this.translate.instant('ERRORS.FAILED_SAVE_DRAFT')
          );
        } else {
          this.toastr.error(
            this.translate.instant('ERRORS.FAILED_CREATE_REQUEST_PLAINT')
          );
        }
      }

      this.isSaving = false;
    }
  }

  // Utility methods
  isStepCompleted(step: number): boolean {
    switch (step) {
      case 1:
        const step1Valid = !!(
          this.requestPlaintForm.get('requestMainApplyServiceId')?.valid &&
          this.requestPlaintForm.get('details')?.valid
        );

        return step1Valid;
      case 2:
        const step2Valid = this.attachments.some(a => a.fileBase64 && a.fileName);

        return step2Valid;
      // case 3:
      //   const step3Valid = this.evidences.length > 0;

      //   return step3Valid;
      // case 4:
      //   const step4Valid = this.justifications.length > 0;

        // return step4Valid;
      case 3:
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
    const requiredFields = ['requestMainApplyServiceId', 'details'];
    const fieldResults = requiredFields.map((field) => {
      const control = this.requestPlaintForm.get(field);
      const hasValue =
        control && control.value && control.value.toString().trim();
      return hasValue;
    });

    const allFieldsValid = fieldResults.every((result) => result);

    return allFieldsValid;
  }

  isMandatory(config: any): boolean {
    return !!config?.mendatory;
  }
}
