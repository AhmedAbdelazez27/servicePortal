import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
  AbstractControl,
  ValidatorFn,
  ValidationErrors,
} from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { NgSelectModule } from '@ng-select/ng-select';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin, Subscription } from 'rxjs';
// import * as L from 'leaflet';
import { GoogleMapsLoaderService } from '../../../core/services/google-maps-loader.service';

import { FastingTentRequestService } from '../../../core/services/fasting-tent-request.service';
import { AttachmentService } from '../../../core/services/attachments/attachment.service';
import { PartnerService } from '../../../core/services/partner.service';
import { AuthService } from '../../../core/services/auth.service';
import { TranslationService } from '../../../core/services/translation.service';
import { LocationService } from '../../../core/services/UserSetting/location.service';
import { MainApplyService } from '../../../core/services/mainApplyService/mainApplyService.service';
import { SpinnerService } from '../../../core/services/spinner.service';

import {
  CreateFastingTentRequestDto,
  FastingTentRequestDto,
  FastingTentAttachmentDto,
  FastingTentPartnerDto,
  PartnerType,
  TentLocationTypeDto,
  LocationMapDto,
  LocationDetailsDto,
  Select2Item,
  ServiceType,
  UpdateFastingTentRequestDto,
} from '../../../core/dtos/FastingTentRequest/fasting-tent-request.dto';
import {
  AttachmentsConfigDto,
  AttachmentsConfigType,
} from '../../../core/dtos/attachments/attachments-config.dto';
import {
  AttachmentDto,
  UpdateAttachmentBase64Dto,
  AttachmentBase64Dto,
} from '../../../core/dtos/attachments/attachment.dto';
import {
  FiltermainApplyServiceByIdDto,
  mainApplyServiceDto,
} from '../../../core/dtos/mainApplyService/mainApplyService.dto';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-fasting-tent-request',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    TranslateModule,
    NgSelectModule,
  ],
  templateUrl: './fasting-tent-request.component.html',
  styleUrl: './fasting-tent-request.component.scss',
})
export class FastingTentRequestComponent implements OnInit, OnDestroy {
  // Tab management
  currentTab: number = 1;
  totalTabs: number = 4;
  visitedTabs: Set<number> = new Set([1]);

  // Forms
  mainInfoForm!: FormGroup;
  supervisorForm!: FormGroup;
  partnersForm!: FormGroup;
  submitted = false;
  isLoading = false;
  isSaving = false;
  isFormInitialized = false;

  // Dropdown data
  tentLocationTypes: TentLocationTypeDto[] = [];
  locationOptions: Select2Item[] = [];
  partnerTypes: Select2Item[] = [];

  // Selected scenario
  selectedScenario: 'iftar' | 'distribution' | null = null;

  // Location selection method tracking
  lastSelectionSource: 'dropdown' | 'map' | null = null;
  locationAvailabilityStatus: 'checking' | 'available' | 'unavailable' | null = null;
  isCheckingAvailability = false;

  // Location data
  selectedLocationDetails: LocationDetailsDto | null = null;
  interactiveMapLocations: LocationMapDto[] = [];

  // Map variables
  map: any;
  markers: any[] = [];
  customIcon: any;

  // Partners data
  partners: FastingTentPartnerDto[] = [];
  existingPartners: FastingTentPartnerDto[] = []; // Partners loaded from API
  partnersToDelete: number[] = []; // Partner IDs to delete

  // Attachments data
  attachmentConfigs: AttachmentsConfigDto[] = [];
  attachments: FastingTentAttachmentDto[] = [];
  selectedFiles: { [key: number]: File } = {};
  filePreviews: { [key: number]: string } = {};
  existingAttachments: { [key: number]: AttachmentDto } = {}; // Existing attachments from API
  attachmentsToDelete: { [key: number]: number } = {}; // Track attachments marked for deletion
  isDragOver = false;
  showLocationPhotoOverlay = false;

  // Update mode properties
  fastingTentRequestId: number | null = null;
  mainApplyServiceId: number | null = null;
  loadformData: mainApplyServiceDto | null = null;

  // Partner attachments data
  partnerAttachmentConfigs: AttachmentsConfigDto[] = [];
  partnerAttachments: { [partnerType: number]: FastingTentAttachmentDto[] } = {};
  partnerSelectedFiles: { [partnerType: number]: { [configId: number]: File } } = {};
  partnerFilePreviews: { [partnerType: number]: { [configId: number]: string } } = {};
  showPartnerAttachments = false;

  // Supported attachment formats for file input (used in template)
  supportedAttachmentFormats: string = '.pdf,.doc,.docx,.jpg,.jpeg,.png';

  private subscriptions: Subscription[] = [];

  constructor(
    private fb: FormBuilder,
    private fastingTentRequestService: FastingTentRequestService,
    private attachmentService: AttachmentService,
    private partnerService: PartnerService,
    private authService: AuthService,
    private locationService: LocationService,
    public translationService: TranslationService,
    private translate: TranslateService,
    private toastr: ToastrService,
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private googleMapsLoader: GoogleMapsLoaderService,
    private mainApplyService: MainApplyService,
    private spinnerService: SpinnerService
  ) {
    this.initializeForms();
    this.initializePartnerTypes();
  }

  ngOnInit(): void {
    this.clearAllToasts();
    
    // Check if we have an id in route params (update mode)
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      // Load request details for update mode
      this.loadRequestDetails(id);
    } else {
      // Create mode - load initial data normally
      this.loadInitialData();
      this.initializeCustomIcon();
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    if (this.map) {
      this.map = null;
    }
  }

  private clearAllToasts(): void {
    this.toastr.clear();
  }

  initializeForms(): void {
    const currentUser = this.authService.getCurrentUser();

    this.mainInfoForm = this.fb.group({
      userId: [currentUser?.id || '', Validators.required],
      tentLocationType: [null, Validators.required],
      locationId: [null, Validators.required],
      ownerName: [{ value: '', disabled: false }],
      regionName: [{ value: '', disabled: false }],
      streetName: [{ value: '', disabled: false }],
      address: [{ value: '', disabled: false }],
      groundNo: [{ value: '', disabled: false }],
      notes: [{ value: '', disabled: false }],
      locationTypeId: [null],
      distributionSiteCoordinators: [''],
      councilApprovalDate: ['', Validators.required],
      serviceType: [ServiceType.TentPermission],
      // Date fields moved from dateDetailsForm
      startDate: ['', [Validators.required, this.startDateNotPastValidator()]],
      endDate: ['', [Validators.required, this.endDateAfterStartDateValidator()]],
    });

    this.supervisorForm = this.fb.group({
      supervisorName: ['', [Validators.required, Validators.minLength(2)]],
      jopTitle: ['', [Validators.required, Validators.minLength(2)]],
      supervisorMobile: ['', [Validators.required, this.uaeMobileValidator.bind(this)]],
    });

    this.partnersForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(200)]],
      type: [null, [Validators.required]],
      licenseIssuer: ['', [Validators.maxLength(200)]],
      licenseExpiryDate: [null],
      licenseNumber: ['', [Validators.maxLength(100)]],
      contactDetails: this.fb.control(null, { validators: [Validators.required] }),
      nameEn: ['', [Validators.required, Validators.maxLength(200)]],
      jobRequirementsDetails: [''],
    });


    // Subscribe to tent location type changes
    this.setupFormValueChanges();
  }

  initializePartnerTypes(): void {
    this.partnerTypes = this.fastingTentRequestService.getPartnerTypes();
  }

  isSupplierOrCompany(type: PartnerType | null | undefined): boolean {
    return type === PartnerType.Supplier || type === PartnerType.Company;
  }

  setupFormValueChanges(): void {
    // Subscribe to tent location type changes using reactive forms
    const tentLocationTypeControl = this.mainInfoForm.get('tentLocationType');
    if (tentLocationTypeControl) {
      const sub = tentLocationTypeControl.valueChanges.subscribe(value => {
        this.onTentLocationTypeChange(value);
      });
      this.subscriptions.push(sub);
    }

    // Subscribe to all form changes to trigger validation updates
    const mainFormSub = this.mainInfoForm.valueChanges.subscribe(() => {
      // Trigger change detection for submit button state
      this.cdr.detectChanges();
      // Debug log for the first tab (information)
      if (this.currentTab === 1) {
      }
    });
    this.subscriptions.push(mainFormSub);

    // Subscribe to startDate changes for validation without showing toasts immediately
    const startDateControl = this.mainInfoForm.get('startDate');
    if (startDateControl) {
      const startDateSub = startDateControl.valueChanges.subscribe(() => {
        // Only validate without showing toasts - toasts will show when user tries to proceed
        this.validateMainInfoTab(false);
      });
      this.subscriptions.push(startDateSub);
    }

    const supervisorFormSub = this.supervisorForm.valueChanges.subscribe(() => {
      this.cdr.detectChanges();
    });
    this.subscriptions.push(supervisorFormSub);

    const partnersFormSub = this.partnersForm.valueChanges.subscribe(() => {
      this.cdr.detectChanges();
    });
    this.subscriptions.push(partnersFormSub);
  }

  loadInitialData(): void {
    if (!this.fastingTentRequestId) { // Only set isLoading to true if not in update mode
      this.isLoading = true;
    }

    const currentUser = this.authService.getCurrentUser();
    if (currentUser?.id) {
      this.mainInfoForm.patchValue({
        userId: currentUser.id
      });

      // Load essential data
      const essentialOperations = [
        this.fastingTentRequestService.getTentLocationTypes()
      ];

      forkJoin(essentialOperations).subscribe({
        next: ([tentTypes]) => {
          this.tentLocationTypes = tentTypes || [];

          // Log the structure of each tent type for debugging
          this.tentLocationTypes.forEach((type, index) => {
          });

          // In update mode, patch locationTypeId after tentTypes are loaded
          // Use location.locationTypeId if available, otherwise use fastingTentService.locationTypeId
          if (this.fastingTentRequestId) {
            const locationTypeId = this.loadformData?.fastingTentService?.location?.locationTypeId 
              || this.loadformData?.fastingTentService?.locationTypeId;
            if (locationTypeId) {
              setTimeout(() => {
                this.mainInfoForm.patchValue({
                  tentLocationType: locationTypeId,
                });
                this.cdr.detectChanges();
              }, 0);
            }
          }

          if (!this.fastingTentRequestId) {
            this.isLoading = false;
          }
          this.isFormInitialized = true;

          // Load location data immediately on page load
          if (!this.fastingTentRequestId) {
            this.loadLocationDataOnInit();
          } else {
            // In update mode, load location data after form is populated
            setTimeout(() => {
              this.loadLocationDataOnInit();
            }, 100);
          }

          // Load attachment configs
          this.loadAttachmentConfigs();

          // Load partner attachment configs
          this.loadPartnerAttachmentConfigs();
        },
        error: (error) => {
          this.toastr.error(this.translate.instant('ERRORS.FAILED_LOAD_DATA'));
          this.isLoading = false;
          this.isFormInitialized = true;
        }
      });
    } else {
      this.toastr.error(this.translate.instant('ERRORS.USER_NOT_FOUND'));
      this.router.navigate(['/login']);
    }
  }

  /**
   * Load request details from API for update mode
   */

  private replaceNullString(value: any): any {
    return value === 'NULL' ? '' : value;
  }

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
      next: (response: any) => {
        response = this.replaceNullStrings(response);
        this.loadformData = response;
        const locationTypeId = response?.fastingTentService?.location?.locationTypeId;

        // Extract fasting tent service data
        const fastingTentService = response.fastingTentService;
        if (fastingTentService) {
          this.fastingTentRequestId = fastingTentService.id || null;
          this.mainApplyServiceId = response.id || null;

          // Populate main info form
          // Use location.locationTypeId for tentLocationType (not fastingTentService.locationTypeId)
          // Use fastingTentService.locationId for locationId (convert to string for select2)
          this.mainInfoForm.patchValue({
            tentLocationType: locationTypeId || fastingTentService.locationTypeId || null,
            locationId: fastingTentService.locationId ? fastingTentService.locationId.toString() : null,
            ownerName: fastingTentService.ownerName || '',
            regionName: fastingTentService.regionName || '',
            streetName: fastingTentService.streetName || '',
            groundNo: fastingTentService.groundNo || '',
            address: fastingTentService.address || '',
            notes: fastingTentService.notes || '',
            distributionSiteCoordinators: fastingTentService.distributionSiteCoordinators || '',
            startDate: fastingTentService.startDate
              ? (fastingTentService.startDate instanceof Date
                ? fastingTentService.startDate.toISOString().split('T')[0]
                : new Date(fastingTentService.startDate).toISOString().split('T')[0])
              : '',
            endDate: fastingTentService.endDate
              ? (fastingTentService.endDate instanceof Date
                ? fastingTentService.endDate.toISOString().split('T')[0]
                : new Date(fastingTentService.endDate).toISOString().split('T')[0])
              : '',
          });

          // Populate supervisor form
          this.supervisorForm.patchValue({
            supervisorName: fastingTentService.supervisorName || '',
            jopTitle: fastingTentService.jopTitle || '',
            supervisorMobile: fastingTentService.supervisorMobile?.replace('971', '') || '',
          });

          // Load existing partners
          if (response.partners && response.partners.length > 0) {
            this.existingPartners = response.partners.map((p: any) => ({
              id: p.id,
              name: p.name || '',
              nameEn: p.nameEn || '',
              type: p.type,
              licenseIssuer: p.licenseIssuer || '',
              licenseExpiryDate: p.licenseExpiryDate
                ? (p.licenseExpiryDate instanceof Date
                  ? p.licenseExpiryDate.toISOString().split('T')[0]
                  : new Date(p.licenseExpiryDate).toISOString().split('T')[0])
                : '',
              licenseNumber: p.licenseNumber || '',
              contactDetails: p.contactDetails || '',
              jobRequirementsDetails: p.jobRequirementsDetails || '',
              mainApplyServiceId: p.mainApplyServiceId || this.mainApplyServiceId || 0,
              attachments: p.attachments || [],
            }));
            // Also add to partners array for display
            this.partners = [...this.existingPartners];
          }

          // Load existing attachments
          if (response.attachments && response.attachments.length > 0) {
            const attachmentsData = response.attachments.map((att: any) => ({
              id: att.id,
              imgPath: att.imgPath,
              masterId: att.masterId,
              attConfigID: att.attConfigID,
              lastModified: att.lastModified,
            }));
            this.loadExistingAttachments(attachmentsData);
          } else if (this.mainApplyServiceId) {
            // If attachments not available, load from API
            this.loadAttachmentsFromAPI(this.mainApplyServiceId);
          }

          // Load location details if locationId exists
          // Skip availability check in update mode since location is already saved
          if (fastingTentService.locationId) {
            this.loadLocationDetails(fastingTentService.locationId, true);
          }
        }

        // Load initial data (dropdowns, etc.) - this will also load attachment configs
        this.loadInitialData();
        this.initializeCustomIcon();
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

  // Temporary test method for debugging API
  testAPI(): void {
    this.fastingTentRequestService.getTentLocationTypes().subscribe({
      next: (response) => {
        this.toastr.success('API test successful!');
      },
      error: (error) => {
        // console.error('Manual API test failed:', error);
        this.toastr.error('API test failed!');
      }
    });
  }

  // Test method specifically for interactive map API
  testInteractiveMapAPI(): void {
    this.fastingTentRequestService.getInteractiveMap().subscribe({
      next: (response) => {
        // if (response && response.length > 0) {
        //   this.toastr.success(`Interactive Map API returned ${response.length} locations!`);
        // } else {
        //   this.toastr.warning('Interactive Map API returned empty data');
        // }
      },
      error: (error) => {
        // console.error('Interactive Map API test failed:', error);
        this.toastr.error('Interactive Map API test failed!');
      }
    });
  }

  // Method to manually refresh the map
  refreshMap(): void {
    if (this.map) {
      try {
        const center = this.map.getCenter ? this.map.getCenter() : null;
        if (center) {
          this.map.setCenter(center);
        }
      } catch {}
      this.toastr.info('Map refreshed');
    } else if (this.selectedScenario === 'distribution') {
      this.initializeMap();
    } else {
      this.toastr.warning('Please select Distribution Items Tent to load the map');
    }
  }

  loadLocationDataOnInit(): void {

    // Load both dropdown options and map data immediately
    this.loadLocationOptions();
    this.loadInteractiveMap();

    // Initialize map after data is loaded
    setTimeout(() => {
      this.initializeMap();
    }, 1000);
  }

  loadAttachmentConfigs(): void {
    const sub = this.attachmentService.getAttachmentsConfigByType(
      AttachmentsConfigType.PermissionForFastingPerson,
      true,
      null
    ).subscribe({
      next: (configs) => {
        this.attachmentConfigs = configs || [];
        
        // In update mode, ensure we have all configs even if some attachments weren't uploaded initially
        if (this.fastingTentRequestId) {
          configs.forEach((config) => {
            if (!this.existingAttachments[config.id!]) {
              // This config doesn't have an attachment yet - user can upload it now
            }
          });
        } else {
          // Initialize attachments array based on configs (only for new attachments)
          this.attachments = this.attachmentConfigs.map(config => ({
            fileBase64: '',
            fileName: '',
            masterId: 0,
            attConfigID: config.id!
          }));
        }
      },
      error: (error) => {
        // console.error('Error loading attachment configs:', error);
      }
    });
    this.subscriptions.push(sub);
  }

  loadPartnerAttachmentConfigs(): void {
    const sub = this.attachmentService.getAttachmentsConfigByType(
      AttachmentsConfigType.Partner,
      true,
      null
    ).subscribe({
      next: (configs) => {
        this.partnerAttachmentConfigs = configs || [];
        this.initializePartnerAttachments();
      },
      error: (error) => {
        // console.error('[loadPartnerAttachmentConfigs] Error loading partner attachment configs:', error);
      }
    });
    this.subscriptions.push(sub);
  }

  /**
   * Load attachments from API using masterId and masterType
   */
  private loadAttachmentsFromAPI(masterId: number): void {
    // Master type for FastingTentRequest - use AttachmentsConfigType.PermissionForFastingPerson
    // Master ID should be the mainApplyServiceId
    const masterType = AttachmentsConfigType.PermissionForFastingPerson;
    
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

  /**
   * Convert file to base64 string
   */
  private async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64String = (reader.result as string).split(',')[1];
        resolve(base64String);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /**
   * Delete attachments marked for deletion
   */
  private async deleteAttachments(): Promise<void> {
    const deletePromises = Object.values(this.attachmentsToDelete).map(attachmentId => {
      return this.attachmentService.deleteAsync(attachmentId).toPromise();
    });

    try {
      await Promise.all(deletePromises);
    } catch (error) {
      console.error('Error deleting attachments:', error);
      throw error;
    }
  }  

  /**
   * Handle attachment operations (create, update, delete) in update mode
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
      const existingAttachment = this.existingAttachments[configIdNum];
      
      if (existingAttachment) {
        // Update existing attachment - use existing masterId
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

  /**
   * Handle partner operations (create new, delete) in update mode
   */
  async handlePartnerOperations(): Promise<void> {
    // First handle deletions
    if (this.partnersToDelete.length > 0) {
      const deletePromises = this.partnersToDelete.map(partnerId => {
        return this.partnerService.delete(partnerId).toPromise();
      });

      try {
        await Promise.all(deletePromises);
      } catch (error) {
        console.error('Error deleting partners:', error);
        throw error;
      }
    }

    // Then handle new partners (only partners without id are new)
    const newPartners = this.partners.filter(p => !p.id);
    for (const partner of newPartners) {
      try {
        const partnerDto: FastingTentPartnerDto = {
          name: partner.name,
          nameEn: partner.nameEn,
          type: partner.type,
          licenseIssuer: partner.licenseIssuer ,
          licenseExpiryDate: partner.licenseExpiryDate ,
          licenseNumber: partner.licenseNumber ,
          contactDetails: partner.contactDetails ,
          jobRequirementsDetails: partner.jobRequirementsDetails ,
          mainApplyServiceId: this.mainApplyServiceId || 0,
          attachments: partner.attachments ,
        };
        
        await this.partnerService.create(partnerDto).toPromise();
      } catch (error) {
        console.error('Error creating partner:', error);
        throw error;
      }
    }

    // Clear deletion tracking after successful operations
    this.partnersToDelete = [];
  }

  /**
   * Trigger file input click programmatically
   */
  triggerFileInput(configId: number): void {
    const fileInput = document.getElementById(`file-${configId}`) as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    }
  }

  /**
   * View attachment in new tab
   */
  viewAttachment(configId: number): void {
    const attachment = this.existingAttachments[configId];
    if (attachment && attachment.imgPath) {
      const imageUrl = this.constructImageUrl(attachment.imgPath);
      window.open(imageUrl, '_blank');
    }
  }

  /**
   * Remove existing attachment (mark for deletion)
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
    if (!imgPath) return this.translate.instant('EDIT_PROFILE.FILE') || 'File';
    const fileName = imgPath.split('/').pop() || imgPath.split('\\').pop() || '';
    return fileName || this.translate.instant('EDIT_PROFILE.FILE') || 'File';
  }

  initializePartnerAttachments(): void {
    // Initialize attachment arrays for each partner type
    [PartnerType.Person, PartnerType.Supplier, PartnerType.Company].forEach(partnerType => {
      this.partnerAttachments[partnerType] = this.partnerAttachmentConfigs.map(config => ({
        fileBase64: '',
        fileName: '',
        masterId: 0,
        attConfigID: config.id!
      }));
      this.partnerSelectedFiles[partnerType] = {};
      this.partnerFilePreviews[partnerType] = {};
    });
  }

  initializeCustomIcon(): void {
    this.customIcon = null;
  }

  // Tab navigation
  goToTab(tab: number): void {
    if (tab >= 1 && tab <= this.totalTabs) {
      this.currentTab = tab;
      this.visitedTabs.add(tab);
    }
  }

  nextTab(): void {
    if (this.currentTab < this.totalTabs) {
      if (this.validateCurrentTab()) {
        this.currentTab++;
        this.visitedTabs.add(this.currentTab);
      } else {
        // Show specific validation errors when user tries to proceed
        this.showCurrentTabValidationErrors();
      }
    }
  }

  showCurrentTabValidationErrors(): void {
    switch (this.currentTab) {
      case 1:
        this.validateMainInfoTab(true);
        break;
      case 2:
        this.validateSupervisorTab(true);
        break;
      case 3:
        this.validatePartnersTab(true);
        break;
      case 4:
        this.validateAttachmentsTab(true);
        break;
    }
  }

  previousTab(): void {
    if (this.currentTab > 1) {
      this.currentTab--;
    }
  }

  validateCurrentTab(): boolean {
    switch (this.currentTab) {
      case 1:
        return this.validateMainInfoTab();
      case 2:
        return this.validateSupervisorTab();
      case 3:
        return this.validatePartnersTab();
      case 4:
        return this.validateAttachmentsTab();
      default:
        return true;
    }
  }
  validateMainInfoTab(showToastr = false): boolean {
    const form = this.mainInfoForm;
    
    // Check tent location type (required)
    const tentLocationType = form.get('tentLocationType')?.value;
    if (!tentLocationType) {
      if (showToastr) {
        this.toastr.error(this.translate.instant('VALIDATION.REQUIRED_FIELD') + ': ' + this.translate.instant('FASTING_TENT.REQUEST_TYPE'));
      }
      return false;
    }

    // Check location selection - either dropdown or map must have a valid selection
    const hasDropdownSelection = form.get('locationId')?.value;
    const hasMapSelection = this.selectedLocationDetails && this.lastSelectionSource === 'map';
    const hasExistingLocation = this.fastingTentRequestId && hasDropdownSelection; // In update mode, if locationId exists, consider it valid

    if (!hasDropdownSelection && !hasMapSelection && !hasExistingLocation) {
      if (showToastr) {
        this.toastr.error(this.translate.instant('VALIDATION.LOCATION_REQUIRED'));
      }
      return false;
    }

    // In update mode, if location exists and is marked as available, skip availability checks
    if (hasExistingLocation && this.locationAvailabilityStatus === 'available') {
      // Location was loaded from saved data and is available, proceed to date validation
      // Continue to date validation below
    } else if (hasExistingLocation && this.locationAvailabilityStatus !== 'available') {
      // Location exists but status is not set, this shouldn't happen but handle it gracefully
      // Continue to availability checks below
    }

    // Check if location availability check is in progress (only for new selections)
    if (this.locationAvailabilityStatus === 'checking') {
      if (showToastr) {
        this.toastr.warning(this.translate.instant('COMMON.PLEASE_WAIT_CHECKING_AVAILABILITY'));
      }
      return false;
    }

    // Check if location is available (only for new selections)
    if (this.locationAvailabilityStatus === 'unavailable') {
      if (showToastr) {
        this.toastr.error(this.translate.instant('VALIDATION.LOCATION_NOT_AVAILABLE'));
      }
      return false;
    }

    // Location must be available to proceed (only for new selections)
    // In update mode, if locationId exists and selectedLocationDetails is set, consider it valid
    if (this.locationAvailabilityStatus !== 'available' && !hasExistingLocation) {
      if (showToastr) {
        this.toastr.error(this.translate.instant('VALIDATION.PLEASE_SELECT_VALID_LOCATION'));
      }
      return false;
    }

    // Validate dates moved here from Date tab
    const startDate = this.mainInfoForm.get('startDate')?.value;
    const endDate = this.mainInfoForm.get('endDate')?.value;

    if (!startDate) {
      if (showToastr) this.toastr.error(this.translate.instant('VALIDATION.REQUIRED_FIELD') + ': ' + this.translate.instant('FASTING_TENT_REQ.START_DATE'));
      return false;
    }
    if (!endDate) {
      if (showToastr) this.toastr.error(this.translate.instant('VALIDATION.REQUIRED_FIELD') + ': ' + this.translate.instant('FASTING_TENT_REQ.END_DATE'));
      return false;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);
    if (startDateObj < today) {
      if (showToastr) this.toastr.error(this.translate.instant('FASTING_TENT.START_DATE_PAST_MESSAGE'));
      return false;
    }
    if (endDateObj <= startDateObj) {
      if (showToastr) this.toastr.error(this.translate.instant('FASTING_TENT.END_DATE_BEFORE_START_MESSAGE'));
      return false;
    }

    return true;
  }

  validateSupervisorTab(showToastr = false): boolean {
    const form = this.supervisorForm;

    // Check supervisor name (required, minimum 2 characters)
    const supervisorName = form.get('supervisorName')?.value;
    if (!supervisorName || (typeof supervisorName === 'string' && supervisorName.trim() === '')) {
      if (showToastr) {
       this.toastr.error(this.translate.instant('VALIDATION.REQUIRED_FIELD') + ': ' + this.translate.instant('FASTING_TENT.SUPERVISOR_NAME'));
      }
      return false;
    }
    if (supervisorName.trim().length < 2) {
      if (showToastr) {
        this.toastr.error(this.translate.instant('VALIDATION.MIN_LENGTH_2') + ': ' + this.translate.instant('FASTING_TENT.SUPERVISOR_NAME'));
      }
      return false;
    }

    // Check job title (required, minimum 2 characters)
    const jopTitle = form.get('jopTitle')?.value;
    if (!jopTitle || (typeof jopTitle === 'string' && jopTitle.trim() === '')) {
      if (showToastr) {
        this.toastr.error(this.translate.instant('VALIDATION.REQUIRED_FIELD') + ': ' + this.translate.instant('FASTING_TENT.JOB_TITLE'));
      }
      return false;
    }
    if (jopTitle.trim().length < 2) {
      if (showToastr) {
        this.toastr.error(this.translate.instant('VALIDATION.MIN_LENGTH_2') + ': ' + this.translate.instant('FASTING_TENT.JOB_TITLE'));
      }
      return false;
    }

    // Check supervisor mobile (required, minimum 7 characters, valid phone format)
    const supervisorMobile = form.get('supervisorMobile')?.value;
    if (!supervisorMobile || (typeof supervisorMobile === 'string' && supervisorMobile.trim() === '')) {
      if (showToastr) {
        this.toastr.error(this.translate.instant('VALIDATION.REQUIRED_FIELD') + ': ' + this.translate.instant('FASTING_TENT.SUPERVISOR_MOBILE'));
      }
      return false;
    }

    // Validate UAE mobile number format (9 digits starting with 5)
    const uaeMobilePattern = /^5[0-9]{8}$/;
    if (!uaeMobilePattern.test(supervisorMobile)) {
      if (showToastr) {
        this.toastr.error(this.translate.instant('VALIDATION.INVALID_PHONE_FORMAT'));
      }
      return false;
    }

    return true;
  }

  validatePartnersTab(showToastr = false): boolean {
    // Partners tab is optional and should be considered completed when visited
    // This allows users to proceed without adding partners (since it's not mandatory)

    // if (!this.visitedTabs.has(4)) {
    //   return false;
    // }

    // If user has visited the tab, consider it completed (optional tab)
    // User can choose not to add partners, which is valid
    if (this.partners.length === 0) {
      return true;
    }

    // Validate partner attachments if there are mandatory ones for the selected partner type
    if (this.showPartnerAttachments) {
      const selectedPartnerType = this.partnersForm.get('type')?.value;
      if (selectedPartnerType) {
        const mandatoryConfigs = this.getPartnerAttachmentConfigsForType(selectedPartnerType).filter(config => config.mendatory);

        for (const config of mandatoryConfigs) {
          const hasFile = this.partnerSelectedFiles[selectedPartnerType]?.[config.id!];
          if (!hasFile) {
            if (showToastr) {
              const attachmentName = this.getAttachmentName(config);
              this.toastr.error(this.translate.instant('VALIDATION.ATTACHMENT_REQUIRED') + `: ${attachmentName}`);
            }
            return false;
          }
        }
      }
    }
    return true;
  }

  // Tent location type change handler
  onTentLocationTypeChange(event: any): void {

    // Extract the ID from the event - ng-select passes the full object when bindValue="id" is used
    let eventId: number;

    if (typeof event === 'object' && event !== null && event.id) {
      // Event is the full object
      eventId = event.id;
    } else if (typeof event === 'string') {
      // Event is string ID
      eventId = parseInt(event, 10);
    } else if (typeof event === 'number') {
      // Event is numeric ID
      eventId = event;
    } else {
      this.clearLocationSelection();
      return;
    }


    const selectedType = this.tentLocationTypes.find(type => type.id === eventId);

    // Check if we have a valid selection
    if (!selectedType || !eventId) {
      this.clearLocationSelection();
      return;
    }

    // Reset location selection when tent type changes
    this.clearLocationSelection();
  }

  loadLocationOptions(): void {
    const request = {
      skip: 0,
      take: 100,
      searchTerm: '',
      isAvailable: true,
      orderByValue: null
    };

    const sub = this.fastingTentRequestService.getLocationSelect2(request).subscribe({
      next: (response) => {
        this.locationOptions = response.results || [];
        
        // In update mode, ensure locationId is patched after options are loaded
        if (this.fastingTentRequestId && this.loadformData?.fastingTentService?.locationId) {
          const savedLocationId = this.loadformData.fastingTentService.locationId.toString();
          const selectedId = this.mainInfoForm.get('locationId')?.value;
          
          // Check if the saved locationId exists in the options
          const locationExists = this.locationOptions.find(opt => opt.id === savedLocationId || opt.id === Number(savedLocationId));
          
          if (!locationExists) {
            // If location not found in options, add it
            const locationName = this.loadformData.fastingTentService.location?.locationName 
              || this.loadformData.fastingTentService.location?.address
              || 'Selected Location';
            this.locationOptions.push({ id: savedLocationId, text: locationName });
          }
          
          // Patch the locationId after options are loaded
          setTimeout(() => {
            this.mainInfoForm.patchValue({
              locationId: savedLocationId
            });
            this.cdr.detectChanges();
          }, 0);
        } else {
          // In create mode, check if there's a selected value that's not in options
          const selectedId = this.mainInfoForm.get('locationId')?.value;
          if (selectedId && !this.locationOptions.find(opt => opt.id === selectedId || opt.id === Number(selectedId))) {
            // Optionally push the selected value if not present
            this.locationOptions.push({ id: selectedId, text: 'Selected Location' });
          }
        }
      },
      error: (error) => {
        // console.error('Error loading location options:', error);
        this.toastr.error(this.translate.instant('ERRORS.FAILED_LOAD_LOCATIONS'));
      }
    });
    this.subscriptions.push(sub);
  }

  loadInteractiveMap(): void {
    const sub = this.fastingTentRequestService.getInteractiveMap().subscribe({
      next: (locations) => {
        this.interactiveMapLocations = locations || [];

        // Log each location for debugging
        this.interactiveMapLocations.forEach((location, index) => {
          //   id: location.id,
          //   name: location.locationName,
          //   coordinates: location.locationCoordinates,
          //   isAvailable: location.isAvailable,
          //   address: location.address
          // });
        });

        this.initializeMap();
      },
      error: (error) => {
        // console.error('Error loading interactive map:', error);
        // console.error('Error details:', error.error);
        // console.error('Error status:', error.status);
        this.toastr.error(this.translate.instant('ERRORS.FAILED_LOAD_MAP'));
      }
    });
    this.subscriptions.push(sub);
  }

  onDropdownLocationSelect(location: any): void {
    // Accepts either a number (id) or an object {id, text}
    let locationId: number;
    if (typeof location === 'object' && location !== null && location.id) {
      locationId = Number(location.id);
    } else {
      locationId = Number(location);
    }

    if (!locationId) {
      this.clearLocationFields();
      this.locationAvailabilityStatus = null;
      this.lastSelectionSource = null;
      return;
    }

    // Set the selection source and clear map-specific selection
    this.lastSelectionSource = 'dropdown';

    this.checkLocationAvailabilityAndLoad(locationId, 'dropdown');
  }

  checkLocationAvailabilityAndLoad(locationId: number, source: 'dropdown' | 'map'): void {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser?.id) {
      this.toastr.error(this.translate.instant('ERRORS.USER_NOT_FOUND'));
      return;
    }

    // Set checking status
    this.isCheckingAvailability = true;
    this.locationAvailabilityStatus = 'checking';

    // Check availability first
    const availabilityDto = {
      locationId: locationId,
      userId: currentUser.id
    };

    const sub = this.fastingTentRequestService.checkLocationAvailability(availabilityDto).subscribe({
      next: (isAvailable) => {
        this.isCheckingAvailability = false;

        if (isAvailable) {
          this.locationAvailabilityStatus = 'available';
          this.loadLocationDetails(locationId);
        } else {
          this.locationAvailabilityStatus = 'unavailable';
          this.clearLocationFields();

          // Clear the form control if location is not available
          if (source === 'dropdown') {
            this.mainInfoForm.patchValue({ locationId: null });
          }
        }
      },
      error: (error) => {
        // console.error('Error checking location availability:', error);
        this.isCheckingAvailability = false;
        this.locationAvailabilityStatus = null;
        this.toastr.error(this.translate.instant('ERRORS.FAILED_CHECK_AVAILABILITY'));
      }
    });
    this.subscriptions.push(sub);
  }

  loadLocationDetails(locationId: number, skipAvailabilityCheck: boolean = false): void {
    const sub = this.fastingTentRequestService.getLocationById(locationId).subscribe({
      next: (location) => {
        this.selectedLocationDetails = location;
        this.populateLocationFields(location);
        
        // In update mode or when loading existing location, set status to available
        // Skip availability check if this is called from loadRequestDetails (update mode)
        if (skipAvailabilityCheck || this.fastingTentRequestId) {
          this.locationAvailabilityStatus = 'available';
          // Only set lastSelectionSource if it's not already set (to distinguish between saved and newly selected)
          if (!this.lastSelectionSource) {
            this.lastSelectionSource = 'dropdown'; // Set source to dropdown for existing locations
          }
        }
      },
      error: (error) => {
        // console.error('Error loading location details:', error);
        this.toastr.error(this.translate.instant('ERRORS.FAILED_LOAD_LOCATION_DETAILS'));
        if (skipAvailabilityCheck || this.fastingTentRequestId) {
          this.locationAvailabilityStatus = null;
        }
      }
    });
    this.subscriptions.push(sub);
  }

  populateLocationFields(location: LocationDetailsDto): void {
    this.mainInfoForm.patchValue({
      locationId: location.id,
      ownerName: location.locationOwner,
      regionName: location.region,
      streetName: location.street,
      address: location.address,
      groundNo: location.locationNo,
      locationTypeId: location.locationTypeId,
      distributionSiteCoordinators: location.locationCoordinates,
    });

    // Ensure the dropdown retains and displays the selected option
    if (!this.locationOptions.find(opt => opt.id === location.id)) {
      const label =
        location.locationName ||
        location.address ||
        location.locationOwner ||
        (this.translationService.currentLang === 'ar' ? 'الموقع المحدد' : 'Selected Location');
      this.locationOptions = [...this.locationOptions, { id: location.id, text: label }];
    }

    // Center map on the selected location
    if (location.locationCoordinates) {
      this.centerMapOnLocation(location.locationCoordinates, location.id);
    }
  }

  clearLocationSelection(): void {
    this.selectedLocationDetails = null;
    this.locationAvailabilityStatus = null;
    this.lastSelectionSource = null;
    this.resetLocationFields();
  }

  clearDropdownSelection(): void {
    this.mainInfoForm.patchValue({ locationId: null });
  }

  clearMapSelection(): void {
    // Clear any map-specific selections if needed
    // The map selection is handled by selectedLocationDetails
  }

  clearLocationFields(): void {
    this.selectedLocationDetails = null;
    this.mainInfoForm.patchValue({
      ownerName: '',
      regionName: '',
      streetName: '',
      address: '',
      groundNo: '',
      locationTypeId: null,
      distributionSiteCoordinators: '',
    });
  }

  resetLocationFields(): void {
    this.mainInfoForm.patchValue({
      locationId: null,
      ownerName: '',
      regionName: '',
      streetName: '',
      address: '',
      groundNo: '',
      locationTypeId: null,
      distributionSiteCoordinators: '',
    });
  }

  clearDistributionMap(): void {
    // Clear map markers and data when switching away from distribution scenario
    this.interactiveMapLocations = [];
    if (this.map) {
      this.markers.forEach(marker => {
        if (marker && marker.remove) {
          marker.remove();
        }
      });
      this.markers = [];
    }
  }

  // Map functionality
  initializeMap(): void {
    // Use a longer timeout and multiple checks to ensure DOM is ready
    let attempts = 0;
    const maxAttempts = 10;

    const checkAndInitialize = () => {
      const mapElement = document.getElementById('distributionMap');
      attempts++;

      if (mapElement) {
        this.setupMap();
      } else if (attempts < maxAttempts) {
        setTimeout(checkAndInitialize, 200);
      } else {
        // console.error('Map element not found after maximum attempts');
        this.toastr.error('Failed to initialize map: map container not found');
      }
    };

    setTimeout(checkAndInitialize, 100);
  }

  setupMap(): void {
    try {
      if (this.map) {
        this.map = null;
      }

      const defaultLat = 25.2048;
      const defaultLng = 55.2708;

      this.googleMapsLoader.load().then((google) => {
        const el = document.getElementById('distributionMap') as HTMLElement;
        if (!el) { return; }

        this.map = new google.maps.Map(el, {
          center: { lat: defaultLat, lng: defaultLng },
          zoom: 10,
          fullscreenControl: false,
          streetViewControl: false,
          mapTypeControl: false,
        });

        this.addMapMarkers();
      }).catch(() => {
        this.toastr.error(this.translate.instant('SHARED.MAP.LOADING_ERROR'));
      });
    } catch (error) {
      this.toastr.error('Failed to initialize map');
    }
  }

  addFallbackTileLayer(): void { }

  checkTileLayersLoaded(): boolean { return true; }

  addMapMarkers(): void {
    this.markers = [];
    if (!this.map) return;
    const google = (window as any).google;
    if (!google || !google.maps) return;
    
    const bounds = new google.maps.LatLngBounds();
    const t = (k: string) => this.translate.instant(k);
    this.interactiveMapLocations.forEach((location) => {
      if (!location.locationCoordinates) return;
      const coords = this.parseCoordinates(location.locationCoordinates);
      if (!coords) return;
      
      // Get icon based on availability
      const icon = this.getMarkerIcon(location.isAvailable, google);
      
      const marker = new google.maps.Marker({
        position: { lat: coords.lat, lng: coords.lng },
        map: this.map,
        title: location.locationName || t('COMMON.UNKNOWN_LOCATION'),
        icon: icon,
      });
      (marker as any).locationId = location.id;
      marker.addListener('click', () => this.onMapLocationClick(location));
      this.markers.push(marker);
      bounds.extend(marker.getPosition());
    });
    if (!bounds.isEmpty()) {
      this.map.fitBounds(bounds, 50);
    }
  }

  getMarkerIcon(isAvailable: boolean, google: any): any {
    if (isAvailable === false) {
      // Red marker for unavailable locations
      return {
        url: 'http://maps.google.com/mapfiles/ms/icons/red.png',
      };
    } else {
      // Yellow marker for available locations
      return {
        url: 'http://maps.google.com/mapfiles/ms/icons/yellow.png',
      };
    }
  }

  centerMapOnLocation(coordinates: string, locationId: number): void {
    if (!this.map || !coordinates) { return; }
    const coords = this.parseCoordinates(coordinates);
    if (coords) {
      this.map.setCenter({ lat: coords.lat, lng: coords.lng });
      this.map.setZoom(15);
    }
  }

  parseCoordinates(coordinates: string): { lat: number; lng: number } | null {
    if (!coordinates || coordinates.trim() === '') {
      // console.warn('Empty coordinates provided');
      return null;
    }


    try {
      // Try parsing as JSON first (e.g., '{"lat": 25.2048, "lng": 55.2708}')
      const coords = JSON.parse(coordinates);
      if (coords && typeof coords.lat === 'number' && typeof coords.lng === 'number') {
        return { lat: coords.lat, lng: coords.lng };
      }
      if (coords && typeof coords.latitude === 'number' && typeof coords.longitude === 'number') {
        return { lat: coords.latitude, lng: coords.longitude };
      }
    } catch (e) {
    }

    try {
      // Try parsing as comma-separated values (e.g., '25.2048,55.2708')
      if (coordinates.includes(',')) {
        const [lat, lng] = coordinates.split(',').map(s => parseFloat(s.trim()));
        if (!isNaN(lat) && !isNaN(lng)) {
          return { lat, lng };
        }
      }

      // Try parsing as slash-separated values (e.g., '25.2048/55.2708')
      if (coordinates.includes('/')) {
        const [lat, lng] = coordinates.split('/').map(s => parseFloat(s.trim()));
        if (!isNaN(lat) && !isNaN(lng)) {
          return { lat, lng };
        }
      }

      // Try parsing as space-separated values (e.g., '25.2048 55.2708')
      if (coordinates.includes(' ')) {
        const parts = coordinates.trim().split(/\s+/);
        if (parts.length >= 2) {
          const lat = parseFloat(parts[0]);
          const lng = parseFloat(parts[1]);
          if (!isNaN(lat) && !isNaN(lng)) {
            return { lat, lng };
          }
        }
      }
    } catch (error) {
      // console.error('Error parsing coordinates:', error);
    }

    // console.error('Failed to parse coordinates:', coordinates);
    return null;
  }

  onMapLocationClick(location: LocationMapDto): void {

    // Set the selection source and clear dropdown selection
    this.lastSelectionSource = 'map';
    this.clearDropdownSelection();

    // Always check availability even if the location appears available on the map
    this.checkLocationAvailabilityAndLoad(location.id, 'map');
  }

  // Partners management
  // Partners management
  addPartner(): void {
    this.partnersForm.markAllAsTouched();   // <-- علشان تظهر رسائل الأخطاء
    this.cdr.detectChanges();

    const partnerType: PartnerType | null = this.partnersForm.get('type')?.value ?? null;

    // ====== تحضير قيم الحقول ======
    const name = (this.partnersForm.get('name')?.value ?? '').toString().trim();
    const licenseIssuer = (this.partnersForm.get('licenseIssuer')?.value ?? '').toString().trim();
    const licenseExpiry = (this.partnersForm.get('licenseExpiryDate')?.value ?? '').toString().trim();
    const licenseNumber = (this.partnersForm.get('licenseNumber')?.value ?? '').toString().trim();
    const contactDetails = +(this.partnersForm.get('contactDetails')?.value ?? null);
    const nameEn = (this.partnersForm.get('nameEn')?.value ?? '').toString().trim();

    // ====== قواعد الـ backend (lengths + required لاسم ونوع) ======
    // Name: required + max 200
    if (!name) {
      this.toastr.error(this.translate.instant('VALIDATION.REQUIRED_FIELD') + ': ' + this.translate.instant('FASTING_TENT_REQ.PARTNER_NAME'));
      return;
    }
    if (!nameEn) {
      this.toastr.error(this.translate.instant('VALIDATION.REQUIRED_FIELD') + ': ' + this.translate.instant('PARTNERS.NAME_EN'));
      return;
    }
      if (!contactDetails) {
      this.toastr.error(this.translate.instant('VALIDATION.REQUIRED_FIELD') + ': ' + this.translate.instant('PARTNERS.CONTACT_DETAILS'));
      return;
    }
    if (name.length > 200) {
      this.toastr.error(this.translate.instant('VALIDATION.MAX_LENGTH_EXCEEDED') + `: ${this.translate.instant('FASTING_TENT_REQ.PARTNER_NAME')} (<= 200)`);
      return;
    }

    // Type: لازم قيمة صحيحة من enum (IsInEnum)
    const validTypes = [PartnerType.Person, PartnerType.Supplier, PartnerType.Company, PartnerType.Government];
    if (partnerType === null || !validTypes.includes(partnerType)) {
      this.toastr.error(this.translate.instant('VALIDATION.REQUIRED_FIELD') + ': ' + this.translate.instant('FASTING_TENT_REQ.PARTNER_TYPE'));
      return;
    }

    // LicenseIssuer: max 200 (لو متعبّي)
    if (licenseIssuer && licenseIssuer.length > 200) {
      this.toastr.error(this.translate.instant('VALIDATION.MAX_LENGTH_EXCEEDED') + `: ${this.translate.instant('FASTING_TENT_REQ.LICENSE_ISSUER')} (<= 200)`);
      return;
    }

    // LicenseNumber: max 100 (لو متعبّي)
    if (licenseNumber && licenseNumber.length > 100) {
      this.toastr.error(this.translate.instant('VALIDATION.MAX_LENGTH_EXCEEDED') + `: ${this.translate.instant('FASTING_TENT_REQ.LICENSE_NUMBER')} (<= 100)`);
      return;
    }

    // ContactDetails: max 1000 (لو متعبّي)
    // if (contactDetails && contactDetails.length > 1000) {
    //   this.toastr.error(this.translate.instant('VALIDATION.MAX_LENGTH_EXCEEDED') + `: ${this.translate.instant('FASTING_TENT_REQ.CONTACT_DETAILS')} (<= 1000)`);
    //   return;
    // }

    // ====== البيزنيس (الأولوية ليه) ======
    // Supplier/Company ⇒ بيانات الرخصة required + مرفق الرخصة (2057) required
    if (partnerType === PartnerType.Supplier || partnerType === PartnerType.Company) {
      const missingFields: string[] = [];
      if (!licenseIssuer) missingFields.push(this.translate.instant('FASTING_TENT_REQ.LICENSE_ISSUER'));
      if (!licenseExpiry) missingFields.push(this.translate.instant('FASTING_TENT_REQ.LICENSE_EXPIRY_DATE'));
      if (!licenseNumber) missingFields.push(this.translate.instant('FASTING_TENT_REQ.LICENSE_NUMBER'));

      if (missingFields.length > 0) {
        this.toastr.error(this.translate.instant('VALIDATION.PLEASE_COMPLETE_REQUIRED_FIELDS') + ': ' + missingFields.join(', '));
        return;
      }

      // مرفق الرخصة 2057
      const hasLicenseAttachment =
        !!this.partnerSelectedFiles[partnerType]?.[2057] ||
        (this.partnerAttachments[partnerType]?.some(a => a.attConfigID === 2057 && a.fileBase64 && a.fileName) ?? false);

      if (!hasLicenseAttachment) {
        const cfg = this.partnerAttachmentConfigs.find(c => c.id === 2057);
        const name = cfg ? this.getAttachmentName(cfg) : 'License';
        this.toastr.error(this.translate.instant('VALIDATION.ATTACHMENT_REQUIRED') + ': ' + name);
        return;
      }
    }

    // Person ⇒ مرفق الهوية (2056) required
    if (partnerType === PartnerType.Person) {
      const hasIdAttachment =
        !!this.partnerSelectedFiles[partnerType]?.[2056] ||
        (this.partnerAttachments[partnerType]?.some(a => a.attConfigID === 2056 && a.fileBase64 && a.fileName) ?? false);

      if (!hasIdAttachment) {
        const cfg = this.partnerAttachmentConfigs.find(c => c.id === 2056);
        const name = cfg ? this.getAttachmentName(cfg) : 'ID';
        this.toastr.error(this.translate.instant('VALIDATION.ATTACHMENT_REQUIRED') + ': ' + name);
        return;
      }
    }

    // ====== تمّر، ابني الـ Partner ======
    const partnerAttachments = this.getPartnerAttachmentsForType(partnerType);

    const newPartner: FastingTentPartnerDto = {
      ...this.partnersForm.value,
      name, // ناخد النسخة الـ trimmed
      licenseIssuer,
      licenseExpiryDate: licenseExpiry || null,
      licenseNumber,
      contactDetails:contactDetails.toString(),
      mainApplyServiceId: this.mainApplyServiceId || 0, // Use mainApplyServiceId in update mode, 0 in create mode
      attachments: partnerAttachments
    };

    this.partners.push(newPartner);
    
    this.partnersForm.reset();
    this.showPartnerAttachments = false;
    this.toastr.success(this.translate.instant('SUCCESS.PARTNER_ADDED'));

  }


  removePartner(index: number): void {
    const partner = this.partners[index];
    
    // If partner has an id, it's an existing partner - mark for deletion
    if (partner.id) {
      this.partnersToDelete.push(partner.id);
    }
    
    // Remove from display array
    this.partners.splice(index, 1);
    
    // Also remove from existingPartners if it was there
    if (partner.id) {
      const existingIndex = this.existingPartners.findIndex(p => p.id === partner.id);
      if (existingIndex !== -1) {
        this.existingPartners.splice(existingIndex, 1);
      }
    }
    
    this.toastr.success(this.translate.instant('SUCCESS.PARTNER_REMOVED'));
  }

  getPartnerTypeName(type: PartnerType): string {
    const partnerType = this.partnerTypes.find(pt => pt.id === type);
    return partnerType?.text || '';
  }

  onPartnerTypeChange(): void {
    const selectedPartnerType = this.partnersForm.get('type')?.value;
    if (selectedPartnerType && (selectedPartnerType === PartnerType.Person || selectedPartnerType === PartnerType.Supplier || selectedPartnerType === PartnerType.Company)) {
      this.showPartnerAttachments = true;
    } else {
      this.showPartnerAttachments = false;
    }
  }

  getPartnerAttachmentsForType(partnerType: PartnerType): FastingTentAttachmentDto[] {
    if (partnerType === PartnerType.Person) {
      // Return attachments with ID 2056 for Person
      return this.partnerAttachments[partnerType]?.filter(att => {
        const config = this.partnerAttachmentConfigs.find(c => c.id === att.attConfigID);
        return config?.id === 2056;
      }) || [];
    } else if (partnerType === PartnerType.Supplier || partnerType === PartnerType.Company) {
      // Return attachments with ID 2057 for Supplier/Company
      return this.partnerAttachments[partnerType]?.filter(att => {
        const config = this.partnerAttachmentConfigs.find(c => c.id === att.attConfigID);
        return config?.id === 2057;
      }) || [];
    }
    return [];
  }

  getPartnerAttachmentConfigsForType(partnerType: PartnerType): AttachmentsConfigDto[] {
    if (partnerType === PartnerType.Person) {
      // Return config with ID 2056 for Person
      return this.partnerAttachmentConfigs.filter(config => config.id === 2056);
    } else if (partnerType === PartnerType.Supplier || partnerType === PartnerType.Company) {
      // Return config with ID 2057 for Supplier/Company  
      return this.partnerAttachmentConfigs.filter(config => config.id === 2057);
    }
    return [];
  }

  // File handling for attachments
  onFileSelected(event: Event, configId: number): void {
    const target = event.target as HTMLInputElement;
    if (target?.files?.[0]) {
      this.handleFileUpload(target.files[0], configId);
    }
  }

  // Partner file handling methods
  onPartnerFileSelected(event: Event, configId: number, partnerType: PartnerType): void {
    const target = event.target as HTMLInputElement;
    if (target?.files?.[0]) {
      this.handlePartnerFileUpload(target.files[0], configId, partnerType);
    }
  }

  onPartnerDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver = true;
  }

  onPartnerDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver = false;
  }

  onPartnerDrop(event: DragEvent, configId: number, partnerType: PartnerType): void {
    event.preventDefault();
    this.isDragOver = false;

    const files = event.dataTransfer?.files;
    if (files?.[0]) {
      this.handlePartnerFileUpload(files[0], configId, partnerType);
    }
  }

  handlePartnerFileUpload(file: File, configId: number, partnerType: PartnerType): void {
    if (!this.validateFile(file)) {
      return;
    }

    if (!this.partnerSelectedFiles[partnerType]) {
      this.partnerSelectedFiles[partnerType] = {};
    }
    if (!this.partnerFilePreviews[partnerType]) {
      this.partnerFilePreviews[partnerType] = {};
    }

    this.partnerSelectedFiles[partnerType][configId] = file;

    const reader = new FileReader();
    reader.onload = (e) => {
      this.partnerFilePreviews[partnerType][configId] = e.target?.result as string;

      const attachmentIndex = this.partnerAttachments[partnerType]?.findIndex(a => a.attConfigID === configId);
      if (attachmentIndex !== -1 && this.partnerAttachments[partnerType]) {
        this.partnerAttachments[partnerType][attachmentIndex] = {
          ...this.partnerAttachments[partnerType][attachmentIndex],
          fileBase64: (e.target?.result as string).split(',')[1],
          fileName: file.name
        };
      } else {
        // console.warn('[handlePartnerFileUpload] No partner attachment found for configId:', configId, 'partnerType:', partnerType);
      }

      this.cdr.detectChanges();
    };
    reader.readAsDataURL(file);
  }

  removePartnerFile(configId: number, partnerType: PartnerType): void {
    if (this.partnerSelectedFiles[partnerType]) {
      delete this.partnerSelectedFiles[partnerType][configId];
    }
    if (this.partnerFilePreviews[partnerType]) {
      delete this.partnerFilePreviews[partnerType][configId];
    }

    const attachmentIndex = this.partnerAttachments[partnerType]?.findIndex(a => a.attConfigID === configId);
    if (attachmentIndex !== -1 && this.partnerAttachments[partnerType]) {
      this.partnerAttachments[partnerType][attachmentIndex] = {
        ...this.partnerAttachments[partnerType][attachmentIndex],
        fileBase64: '',
        fileName: ''
      };
    }

    this.cdr.detectChanges();
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
      if (!this.fastingTentRequestId) {
        const attachmentIndex = this.attachments.findIndex(a => a.attConfigID === configId);
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

      // Trigger change detection for submit button state
      this.cdr.detectChanges();
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
    if (!this.fastingTentRequestId) {
      const attachmentIndex = this.attachments.findIndex(a => a.attConfigID === configId);
      if (attachmentIndex !== -1) {
        this.attachments[attachmentIndex] = {
          ...this.attachments[attachmentIndex],
          fileBase64: '',
          fileName: '',
        };
      }
    }

    // Trigger change detection for submit button state
    this.cdr.detectChanges();
  }

  getAttachmentName(config: AttachmentsConfigDto): string {
    const currentLang = this.translationService.currentLang;
    return currentLang === 'ar' ? (config.name || '') : (config.nameEn || config.name || '');
  }

  // Form submission
  async onSubmit(isDraft: boolean = false): Promise<void> {
    if (this.isSaving) {
      return;
    }

    this.submitted = true;

    if (!this.canSubmit(true)) {
      // Toastr will show only here
      return;
    }

    this.isSaving = true;

    try {
      const formData = this.mainInfoForm.getRawValue();
      const supervisorData = this.supervisorForm.getRawValue();
      const currentUser = this.authService.getCurrentUser();

      if (!currentUser?.id) {
        this.toastr.error(this.translate.instant('ERRORS.USER_NOT_FOUND'));
        this.isSaving = false;
        return;
      }

      // Determine if this is update or create
      const isUpdateMode = !!this.fastingTentRequestId && !!this.mainApplyServiceId;

      if (isUpdateMode) {
        // Handle attachments separately (update/create/delete)
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

        // Handle partners separately (create new, delete)
        try {
          await this.handlePartnerOperations();
        } catch (partnerError) {
          console.error('Error handling partners:', partnerError);
          this.toastr.warning(
            this.translate.instant('ERRORS.FAILED_SAVE_PARTNERS') || 'Warning saving partners'
          );
        }

        // Format dates properly
        let startDateValue: string = formData.startDate || '';
        let endDateValue: string = formData.endDate || '';

        if (startDateValue && !startDateValue.includes('T')) {
          startDateValue = new Date(startDateValue).toISOString();
        }
        if (endDateValue && !endDateValue.includes('T')) {
          endDateValue = new Date(endDateValue).toISOString();
        }

        const updateDto: UpdateFastingTentRequestDto = {
          id: this.fastingTentRequestId!,
          mainApplyServiceId: this.mainApplyServiceId!,
          userId: currentUser.id,
          locationType: this.getSelectedLocationTypeName(),
          locationTypeId: formData.tentLocationType,
          ownerName: formData.ownerName || null,
          regionName: formData.regionName || null,
          streetName: formData.streetName || null,
          groundNo: formData.groundNo || null,
          address: formData.address || null,
          startDate: startDateValue,
          endDate: endDateValue,
          notes: formData.notes || null,
          locationId: formData.locationId || null,
          isConsultantFromAjman: this.loadformData?.fastingTentService?.isConsultantFromAjman ?? true,
          isConsultantApprovedFromPolice: this.loadformData?.fastingTentService?.isConsultantApprovedFromPolice ?? true,
          supervisorName: supervisorData.supervisorName || null,
          jopTitle: supervisorData.jopTitle || null,
          supervisorMobile: `971${supervisorData.supervisorMobile}`,
          tentIsSetUp: this.loadformData?.fastingTentService?.tentIsSetUp ?? true,
          // tentDate: this.loadformData?.fastingTentService?.tentDate 
          //   ? (this.loadformData.fastingTentService.tentDate instanceof Date
          //       ? this.loadformData.fastingTentService.tentDate.toISOString()
          //       : new Date(this.loadformData.fastingTentService.tentDate).toISOString())
          //   : null,
          serviceType: ServiceType.TentPermission,
          // distributionSitePhotoPath: this.loadformData?.fastingTentService?.distributionSitePhotoPath || null,
          distributionSiteCoordinators: formData.distributionSiteCoordinators || null,
          isDraft: isDraft,
        };

        const sub = this.fastingTentRequestService.update(updateDto).subscribe({
          next: (response) => {
            if (isDraft) {
              this.toastr.success(this.translate.instant('SUCCESS.FASTING_TENT_REQUEST_SAVED_AS_DRAFT'));
            } else {
              this.toastr.success(this.translate.instant('SUCCESS.FASTING_TENT_REQUEST_CREATED'));
            }
            this.router.navigate(['/request']);
            this.isSaving = false;
          },
          error: (error) => {
            console.error(`Error ${isDraft ? 'saving draft' : 'updating'} fasting tent request:`, error);

            if (error.error && error.error.reason) {
              this.toastr.error(error.error.reason);
            } else {
              if (isDraft) {
                this.toastr.error(this.translate.instant('ERRORS.FAILED_SAVE_DRAFT'));
              } else {
                this.toastr.error(this.translate.instant('ERRORS.FAILED_CREATE_FASTING_TENT_REQUEST'));
              }
            }

            this.isSaving = false;
          }
        });
        this.subscriptions.push(sub);
      } else {
        // Create mode
        const validAttachments = this.attachments.filter(a => a.fileBase64 && a.fileName);
        const createDto: CreateFastingTentRequestDto = {
          mainApplyServiceId: 0,
          locationType: this.getSelectedLocationTypeName(),
          locationTypeId: formData.tentLocationType,
          ownerName: formData.ownerName,
          regionName: formData.regionName,
          streetName: formData.streetName,
          groundNo: formData.groundNo,
          address: formData.address,
          startDate: formData.startDate,
          endDate: formData.endDate,
          notes: formData.notes,
          locationId: formData.locationId,
          supervisorName: supervisorData.supervisorName,
          jopTitle: supervisorData.jopTitle,
          supervisorMobile: `971${supervisorData.supervisorMobile}`, // Add 971 prefix
          serviceType: ServiceType.TentPermission, // Always send as enum value
          distributionSiteCoordinators: formData.distributionSiteCoordinators,
          attachments: validAttachments,
          partners: this.partners,
          isDraft: isDraft, // Set draft flag based on parameter
        };

        const sub = this.fastingTentRequestService.create(createDto).subscribe({
          next: (response) => {
            if (isDraft) {
              this.toastr.success(this.translate.instant('SUCCESS.FASTING_TENT_REQUEST_SAVED_AS_DRAFT'));
            } else {
              this.toastr.success(this.translate.instant('SUCCESS.FASTING_TENT_REQUEST_CREATED'));
            }
            this.router.navigate(['/request']);
            this.isSaving = false;
          },
          error: (error) => {
            console.error(`Error ${isDraft ? 'saving draft' : 'creating'} fasting tent request:`, error);

            // Check if it's a business error with a specific reason
            if (error.error && error.error.reason) {
              // Show the specific reason from the API response
              this.toastr.error(error.error.reason);
            } else {
              // Fallback to generic error message
              if (isDraft) {
                this.toastr.error(this.translate.instant('ERRORS.FAILED_SAVE_DRAFT'));
              } else {
                this.toastr.error(this.translate.instant('ERRORS.FAILED_CREATE_FASTING_TENT_REQUEST'));
              }
            }

            this.isSaving = false;
          }
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
          this.toastr.error(this.translate.instant('ERRORS.FAILED_SAVE_DRAFT'));
        } else {
          this.toastr.error(this.translate.instant('ERRORS.FAILED_CREATE_FASTING_TENT_REQUEST'));
        }
      }

      this.isSaving = false;
    }
  }

  //onSaveDraft(): void {
  //  this.onSubmit(true);
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
    if (this.isSaving) {
      return;
    }

    this.submitted = true;



    this.isSaving = true;

    try {
      const formData = this.mainInfoForm.getRawValue();
      const supervisorData = this.supervisorForm.getRawValue();
      const currentUser = this.authService.getCurrentUser();

      if (!currentUser?.id) {
        this.toastr.error(this.translate.instant('ERRORS.USER_NOT_FOUND'));
        this.isSaving = false;
        return;
      }

      // Normalize empty string fields to 'NULL' for submission.
      // Exclude supervisorMobile from normalization so phone validation remains numeric.
      const normalizedFormData = this.normalizeEmptyStrings(formData);
      const normalizedSupervisorData = this.normalizeEmptyStrings(supervisorData, ['supervisorMobile']);

      // Normalize partners array (convert empty strings to 'NULL')
      const normalizedPartners: FastingTentPartnerDto[] = this.partners.map(p => this.normalizeEmptyStrings(p, ['contactDetails']));

      // Determine if this is update or create
      const isUpdateMode = !!this.fastingTentRequestId && !!this.mainApplyServiceId;

      if (isUpdateMode) {
        // Handle attachments separately (update/create/delete)
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

        // Handle partners separately (create new, delete)
        try {
          await this.handlePartnerOperations();
        } catch (partnerError) {
          console.error('Error handling partners:', partnerError);
          this.toastr.warning(
            this.translate.instant('ERRORS.FAILED_SAVE_PARTNERS') || 'Warning saving partners'
          );
        }

        // Format dates properly
        let startDateValue: string = normalizedFormData.startDate || '';
        let endDateValue: string = normalizedFormData.endDate || '';

        if (startDateValue && !startDateValue.includes('T')) {
          startDateValue = new Date(startDateValue).toISOString();
        }
        if (endDateValue && !endDateValue.includes('T')) {
          endDateValue = new Date(endDateValue).toISOString();
        }

        const updateDto: UpdateFastingTentRequestDto = {
          id: this.fastingTentRequestId!,
          mainApplyServiceId: this.mainApplyServiceId!,
          userId: currentUser.id,
          locationType: this.getSelectedLocationTypeName(),
          locationTypeId: normalizedFormData.tentLocationType,
          ownerName: normalizedFormData.ownerName || null,
          regionName: normalizedFormData.regionName || null,
          streetName: normalizedFormData.streetName || null,
          groundNo: normalizedFormData.groundNo || null,
          address: normalizedFormData.address || null,
          startDate: startDateValue,
          endDate: endDateValue,
          notes: normalizedFormData.notes || null,
          locationId: normalizedFormData.locationId || null,
          isConsultantFromAjman: this.loadformData?.fastingTentService?.isConsultantFromAjman ?? true,
          isConsultantApprovedFromPolice: this.loadformData?.fastingTentService?.isConsultantApprovedFromPolice ?? true,
          supervisorName: normalizedSupervisorData.supervisorName || null,
          jopTitle: normalizedSupervisorData.jopTitle || null,
          supervisorMobile: `971${normalizedSupervisorData.supervisorMobile}`,
          tentIsSetUp: this.loadformData?.fastingTentService?.tentIsSetUp ?? true,
          serviceType: ServiceType.TentPermission,
          distributionSiteCoordinators: normalizedFormData.distributionSiteCoordinators || null,
          isDraft: isDraft,
        };

        const sub = this.fastingTentRequestService.update(updateDto).subscribe({
          next: (response) => {
            if (isDraft) {
              this.toastr.success(this.translate.instant('SUCCESS.FASTING_TENT_REQUEST_SAVED_AS_DRAFT'));
            } else {
              this.toastr.success(this.translate.instant('SUCCESS.FASTING_TENT_REQUEST_CREATED'));
            }
            this.router.navigate(['/request']);
            this.isSaving = false;
          },
          error: (error) => {
            console.error(`Error ${isDraft ? 'saving draft' : 'updating'} fasting tent request:`, error);

            if (error.error && error.error.reason) {
              this.toastr.error(error.error.reason);
            } else {
              if (isDraft) {
                this.toastr.error(this.translate.instant('ERRORS.FAILED_SAVE_DRAFT'));
              } else {
                this.toastr.error(this.translate.instant('ERRORS.FAILED_CREATE_FASTING_TENT_REQUEST'));
              }
            }

            this.isSaving = false;
          }
        });
        this.subscriptions.push(sub);
      } else {
        // Create mode
        const validAttachments = this.attachments.filter(a => a.fileBase64 && a.fileName);
        const createDto: CreateFastingTentRequestDto = {
          mainApplyServiceId: 0,
          locationType: this.getSelectedLocationTypeName(),
          locationTypeId: normalizedFormData.tentLocationType,
          ownerName: normalizedFormData.ownerName,
          regionName: normalizedFormData.regionName,
          streetName: normalizedFormData.streetName,
          groundNo: normalizedFormData.groundNo,
          address: normalizedFormData.address,
          startDate: normalizedFormData.startDate,
          endDate: normalizedFormData.endDate,
          notes: normalizedFormData.notes,
          locationId: normalizedFormData.locationId,
          supervisorName: normalizedSupervisorData.supervisorName,
          jopTitle: normalizedSupervisorData.jopTitle,
          supervisorMobile: `971${normalizedSupervisorData.supervisorMobile}`, // Add 971 prefix
          serviceType: ServiceType.TentPermission, // Always send as enum value
          distributionSiteCoordinators: normalizedFormData.distributionSiteCoordinators,
          attachments: validAttachments,
          partners: normalizedPartners,
          isDraft: isDraft, // Set draft flag based on parameter
        };

        const sub = this.fastingTentRequestService.create(createDto).subscribe({
          next: (response) => {
            if (isDraft) {
              this.toastr.success(this.translate.instant('SUCCESS.FASTING_TENT_REQUEST_SAVED_AS_DRAFT'));
            } else {
              this.toastr.success(this.translate.instant('SUCCESS.FASTING_TENT_REQUEST_CREATED'));
            }
            this.router.navigate(['/request']);
            this.isSaving = false;
          },
          error: (error) => {
            console.error(`Error ${isDraft ? 'saving draft' : 'creating'} fasting tent request:`, error);

            // Check if it's a business error with a specific reason
            if (error.error && error.error.reason) {
              // Show the specific reason from the API response
              this.toastr.error(error.error.reason);
            } else {
              // Fallback to generic error message
              if (isDraft) {
                this.toastr.error(this.translate.instant('ERRORS.FAILED_SAVE_DRAFT'));
              } else {
                this.toastr.error(this.translate.instant('ERRORS.FAILED_CREATE_FASTING_TENT_REQUEST'));
              }
            }

            this.isSaving = false;
          }
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
          this.toastr.error(this.translate.instant('ERRORS.FAILED_SAVE_DRAFT'));
        } else {
          this.toastr.error(this.translate.instant('ERRORS.FAILED_CREATE_FASTING_TENT_REQUEST'));
        }
      }

      this.isSaving = false;
    }
  }

  validateAttachmentsTab(showToastr = false): boolean {
    // If no attachment configs are loaded yet, consider valid (loading state)
    if (!this.attachmentConfigs || this.attachmentConfigs.length === 0) {
      return true;
    }

    const mandatoryAttachments = this.attachmentConfigs.filter(config => config.mendatory);

    // If no mandatory attachments, tab is valid
    if (mandatoryAttachments.length === 0) {
      return true;
    }

    for (const config of mandatoryAttachments) {
      // Check if attachment exists in either new attachments or existing attachments
      const newAttachment = this.attachments.find(a => a.attConfigID === config.id);
      const existingAttachment = this.existingAttachments[config.id!];
      const selectedFile = this.selectedFiles[config.id!];
      
      // Attachment is valid if:
      // 1. There's a new attachment with fileBase64 and fileName (create mode)
      // 2. There's an existing attachment (update mode)
      // 3. There's a selected file (update mode - will be saved)
      const hasValidAttachment = 
        (newAttachment && newAttachment.fileBase64 && newAttachment.fileName) ||
        existingAttachment ||
        selectedFile;
      
      if (!hasValidAttachment) {
        if (showToastr) {
          const attachmentName = this.getAttachmentName(config);
         this.toastr.error(this.translate.instant('VALIDATION.ATTACHMENT_REQUIRED') + ': ' + attachmentName);
        }
        return false;
      }
    }
    return true;
  }

  // Legacy method for backward compatibility
  validateAttachments(showToastr = false): boolean {
    return this.validateAttachmentsTab(showToastr);
  }

  isFieldMandatory(fieldName: string): boolean {
    const mandatoryFields = ['tentLocationType', 'startDate', 'endDate', 'supervisorName', 'jopTitle', 'supervisorMobile'];
    return mandatoryFields.includes(fieldName);
  }

  isAttachmentMandatory(configId: number): boolean {
    const config = this.attachmentConfigs.find(c => c.id === configId);
    return config?.mendatory || false;
  }

  canSubmit(showToastr = false): boolean {
    if (this.currentTab !== this.totalTabs || this.isSaving || !this.isFormInitialized) {
      return false;
    }

    return this.validateMainInfoTab(showToastr) && this.validateSupervisorTab(showToastr) && this.validatePartnersTab(showToastr) && this.validateAttachments(showToastr);
  }

  getSelectedLocationTypeName(): string {
    const selectedType = this.tentLocationTypes.find(type => type.id === this.mainInfoForm.get('tentLocationType')?.value);
    return selectedType?.text || '';
  }

  // Utility methods
  isTabActive(tab: number): boolean {
    return this.currentTab === tab;
  }

  isTabCompleted(tab: number): boolean {
    switch (tab) {
      case 1:
        return this.validateMainInfoTab();
      case 2:
        return this.validateSupervisorTab();
      case 3:
        return this.validatePartnersTab();
      case 4:
        return this.validateAttachmentsTab();
      default:
        return false;
    }
  }

  canProceedToNext(): boolean {
    return this.currentTab < this.totalTabs && this.validateCurrentTab();
  }

  // Method to get validation status for debugging
  getTabValidationStatus(tab: number): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    let isValid = false;

    switch (tab) {
      case 1:
        isValid = this.validateMainInfoTab();
        if (!isValid) {
          if (!this.mainInfoForm.get('tentLocationType')?.value) {
            errors.push('Request Type is required');
          }
          if (!this.mainInfoForm.get('locationId')?.value && !this.selectedLocationDetails) {
            errors.push('Location selection is required');
          }
          if (this.locationAvailabilityStatus === 'unavailable') {
            errors.push('Selected location is not available');
          }
        }
        break;
      case 2:
        isValid = this.validateSupervisorTab();
        if (!isValid) {
          if (!this.supervisorForm.get('supervisorName')?.value) {
            errors.push('Supervisor Name is required');
          }
          if (!this.supervisorForm.get('jopTitle')?.value) {
            errors.push('Job Title is required');
          }
          if (!this.supervisorForm.get('supervisorMobile')?.value) {
            errors.push('Supervisor Mobile is required');
          }
        }
        break;
      case 4:
        isValid = this.validatePartnersTab();
        break;
      case 5:
        isValid = this.validateAttachmentsTab();
        if (!isValid) {
          const mandatoryConfigs = this.attachmentConfigs.filter(c => c.mendatory);
          mandatoryConfigs.forEach(config => {
            const newAttachment = this.attachments.find(a => a.attConfigID === config.id);
            const existingAttachment = this.existingAttachments[config.id!];
            const selectedFile = this.selectedFiles[config.id!];
            const hasValidAttachment = 
              (newAttachment && newAttachment.fileBase64) ||
              existingAttachment ||
              selectedFile;
            if (!hasValidAttachment) {
              errors.push(`${this.getAttachmentName(config)} is required`);
            }
          });
        }
        break;
    }

    return { isValid, errors };
  }

  // Development helper method - can be called from browser console for debugging
  logValidationStatus(): void {
  }

  // Custom Validators (match distribution-site-permit)
  startDateNotPastValidator(): ValidatorFn {
    return (control: AbstractControl) => {
      if (!control.value) return null;
      const inputDate = new Date(control.value);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (inputDate < today) {
        return { startDatePast: true };
      }
      return null;
    };
  }

  endDateAfterStartDateValidator(): ValidatorFn {
    return (control: AbstractControl) => {
      if (!control.parent) return null;
      const startDate = new Date(control.parent.get('startDate')?.value);
      const endDate = new Date(control.value);
      if (control.value && startDate && endDate < startDate) {
        return { endDateBeforeStart: true };
      }
      return null;
    };
  }

  // Helper methods for template error display (match distribution-site-permit)
  isStartDatePast(): boolean {
    const control = this.mainInfoForm.get('startDate');
    return control && control.touched && control.errors && control.errors['startDatePast'];
  }
  isEndDateBeforeStart(): boolean {
    const control = this.mainInfoForm.get('endDate');
    return control && control.touched && control.errors && control.errors['endDateBeforeStart'];
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

  // Handle mobile number input event for real-time validation
  onSupervisorMobileInput(): void {
    const mobileControl = this.supervisorForm.get('supervisorMobile');
    if (mobileControl && mobileControl.value) {
      // Trigger validation as user types
      mobileControl.markAsTouched();
    }
  }

  // Handle mobile number blur event to trigger validation
  onSupervisorMobileBlur(): void {
    const mobileControl = this.supervisorForm.get('supervisorMobile');
    if (mobileControl && mobileControl.value) {
      // Trigger validation on blur
      mobileControl.markAsTouched();
      this.cdr.detectChanges();
    }
  }
}
