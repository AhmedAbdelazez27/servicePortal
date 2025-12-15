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

import { DistributionSiteRequestService } from '../../../core/services/distribution-site-request.service';
import { AttachmentService } from '../../../core/services/attachments/attachment.service';
import { PartnerService } from '../../../core/services/partner.service';
import { AuthService } from '../../../core/services/auth.service';
import { TranslationService } from '../../../core/services/translation.service';
import { MainApplyService } from '../../../core/services/mainApplyService/mainApplyService.service';
import { SpinnerService } from '../../../core/services/spinner.service';

import {
  CreateDistributionSiteRequestDto,
  UpdateDistributionSiteRequestDto,
  DistributionSiteRequestDto,
  DistributionSiteAttachmentDto,
  DistributionSitePartnerDto,
  PartnerType,
  DistributionLocationTypeDto,
  LocationMapDto,
  LocationDetailsDto,
  Select2Item,
  ServiceType,
} from '../../../core/dtos/DistributionSiteRequest/distribution-site-request.dto';
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
  selector: 'app-distribution-site-permit',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    TranslateModule,
    NgSelectModule,
  ],
  templateUrl: './distribution-site-permit.component.html',
  styleUrl: './distribution-site-permit.component.scss',
})
export class DistributionSitePermitComponent implements OnInit, OnDestroy {
  // Tab management
  currentTab: number = 1;
  totalTabs: number = 4;
  visitedTabs: Set<number> = new Set([1]); // Track visited tabs, start with tab 1

  // Forms
  mainInfoForm!: FormGroup;
  partnersForm!: FormGroup;
  submitted = false;
  isLoading = false;
  isSaving = false;
  isFormInitialized = false;

  // Dropdown data
  distributionLocationTypes: DistributionLocationTypeDto[] = [];
  regionOptions: Select2Item[] = [];
  partnerTypes: Select2Item[] = [];

  // Map variables
  map: any;
  markers: any[] = [];
  customIcon: any;
  selectedCoordinates: string = '';

  // Location data
  selectedLocationDetails: LocationDetailsDto | null = null;
  locationAvailabilityStatus: 'checking' | 'available' | 'unavailable' | null = null;
  lastSelectionSource: 'dropdown' | 'map' | null = null;
  isCheckingAvailability = false;

  // Partners data
  partners: DistributionSitePartnerDto[] = [];
  existingPartners: DistributionSitePartnerDto[] = []; // Partners loaded from API
  partnersToDelete: number[] = []; // Partner IDs to delete

  // Attachments data
  attachmentConfigs: AttachmentsConfigDto[] = [];
  attachments: DistributionSiteAttachmentDto[] = [];
  selectedFiles: { [key: number]: File } = {};
  filePreviews: { [key: number]: string } = {};
  existingAttachments: { [key: number]: AttachmentDto } = {}; // Existing attachments from API
  attachmentsToDelete: { [key: number]: number } = {}; // Track attachments marked for deletion
  isDragOver = false;

  // Update mode properties
  distributionSiteRequestId: number | null = null;
  mainApplyServiceId: number | null = null;
  loadformData: mainApplyServiceDto | null = null;

  // Partner attachments data
  partnerAttachmentConfigs: AttachmentsConfigDto[] = [];
  partnerAttachments: { [partnerType: number]: DistributionSiteAttachmentDto[] } = {};
  partnerSelectedFiles: { [partnerType: number]: { [configId: number]: File } } = {};
  partnerFilePreviews: { [partnerType: number]: { [configId: number]: string } } = {};
  showPartnerAttachments = false;

  get isRtl(): boolean {
    return this.translationService.currentLang === 'ar';
  }

  private subscriptions: Subscription[] = [];
  invalidEndDate: boolean = false;
  private isUpdatingLocationType: boolean = false; // Flag to prevent infinite loop

  constructor(
    private fb: FormBuilder,
    private distributionSiteRequestService: DistributionSiteRequestService,
    private attachmentService: AttachmentService,
    private partnerService: PartnerService,
    private authService: AuthService,
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
      this.initializeMap();
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
      locationType: ['', Validators.required],
      locationTypeId: [null, Validators.required],
      // ownerName: [''],
      regionName: ['', Validators.required],
      streetName: ['', ],
      // groundNo: [''],
      address: [''],
      startDate: ['', [Validators.required, this.startDateNotPastValidator()]],
      endDate: ['', [Validators.required, this.endDateAfterStartDateValidator()]],
      notes: [''],
      locationId: [null],

      supervisorName: ['', [Validators.required, Validators.minLength(2)]],
      jopTitle: [''],
              supervisorMobile: ['', [Validators.required, this.uaeMobileValidator.bind(this)]],

      serviceType: [ServiceType.DistributionSitePermitApplication],
      distributionSiteCoordinators: ['', Validators.required], // renamed and only this field
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

    // Subscribe to form changes
    this.setupFormValueChanges();
  }

  initializePartnerTypes(): void {
    this.partnerTypes = this.distributionSiteRequestService.getPartnerTypes();
  }

    isSupplierOrCompany(type: PartnerType | null | undefined): boolean {
      return type === PartnerType.Supplier || type === PartnerType.Company;
    }
  

  setupFormValueChanges(): void {
    // Subscribe to all form changes to trigger validation updates
    const formSub = this.mainInfoForm.valueChanges.subscribe(() => {
      // Trigger change detection for submit button state
      this.cdr.detectChanges();
    });
    this.subscriptions.push(formSub);

    // Subscribe specifically to locationTypeId changes
    const locationTypeIdSub = this.mainInfoForm.get('locationTypeId')?.valueChanges.subscribe((value) => {
    });
    if (locationTypeIdSub) {
      this.subscriptions.push(locationTypeIdSub);
    }

    // Subscribe to endDate changes to show toaster immediately if invalid
    const endDateControl = this.mainInfoForm.get('endDate');
    if (endDateControl) {
      const endDateSub = endDateControl.valueChanges.subscribe(() => {
        // Only show toaster if endDate is before or equal to startDate
        const startDate = this.mainInfoForm.get('startDate')?.value;
        const endDate = endDateControl.value;
        if (startDate && endDate && new Date(endDate) <= new Date(startDate)) {
          this.invalidEndDate = true ;
          this.toastr.error(this.translate.instant('VALIDATION.END_DATE_BEFORE_START'));
          this.cdr.detectChanges();
    
        }else{
          this.invalidEndDate = false;
        }
      });
      this.subscriptions.push(endDateSub);
    }
  }

  loadInitialData(): void {
    this.isLoading = true;
    
    const currentUser = this.authService.getCurrentUser();
    if (currentUser?.id) {
      this.mainInfoForm.patchValue({
        userId: currentUser.id
      });

      // Load distribution location types directly first
      this.distributionSiteRequestService.getDistributionLocationTypes().subscribe({
        next: (locationTypes) => {
          
          if (Array.isArray(locationTypes)) {
            this.distributionLocationTypes = [...locationTypes];
            this.cdr.detectChanges();
          }
        },
        error: (error) => {
        }
      });
      
      // Load essential data with forkJoin
      const essentialOperations = [
        this.distributionSiteRequestService.getDistributionLocationTypes(),
        this.distributionSiteRequestService.getRegionsSelect2()
      ];

      forkJoin(essentialOperations).subscribe({
        next: ([locationTypes, regions]) => {
          
          if (Array.isArray(locationTypes) && locationTypes.length > 0) {
            this.distributionLocationTypes = [...locationTypes]; // Create a new array
            
            // In update mode, patch locationTypeId after locationTypes are loaded
            if (this.distributionSiteRequestId) {
              // Check both distributionSiteRequest and fastingTentService (API may return either)
              const distributionSiteRequest = this.loadformData?.distributionSiteRequest || this.loadformData?.fastingTentService;
              // For fastingTentService, locationTypeId may be in location object, for distributionSiteRequest it's directly on the object
              const locationTypeId = (distributionSiteRequest as any)?.location?.locationTypeId || distributionSiteRequest?.locationTypeId;
              
              if (locationTypeId) {
                // Convert to number to ensure type matching
                const locationTypeIdNum = Number(locationTypeId);
                // Use a longer timeout to ensure select2 is ready and options are available
                setTimeout(() => {
                  // Verify the locationTypeId exists in the options
                  const locationTypeExists = this.distributionLocationTypes.some(lt => lt.id === locationTypeIdNum);
                  if (locationTypeExists) {
                    // Set flag to prevent onLocationTypeChange from being triggered
                    this.isUpdatingLocationType = true;
                    try {
                      const selectedType = this.distributionLocationTypes.find(lt => lt.id === locationTypeIdNum);
                      const currentLang = this.translationService.currentLang;
                      const locationTypeText = selectedType 
                        ? (currentLang === 'ar' ? selectedType.text : selectedType.value)
                        : '';
                      
                      this.mainInfoForm.patchValue({
                        locationType: locationTypeText,
                        locationTypeId: locationTypeIdNum,
                      }, { emitEvent: false }); // Prevent triggering change events
                      
                      // Force change detection and trigger select2 update
                      this.cdr.detectChanges();
                      // Additional timeout to ensure select2 renders the value
                      setTimeout(() => {
                        this.cdr.detectChanges();
                      }, 50);
                    } finally {
                      setTimeout(() => {
                        this.isUpdatingLocationType = false;
                      }, 100);
                    }
                  } else {
                    console.warn(`LocationTypeId ${locationTypeIdNum} not found in distributionLocationTypes`, {
                      locationTypeId: locationTypeIdNum,
                      availableTypes: this.distributionLocationTypes.map(lt => lt.id)
                    });
                  }
                }, 150);
              }
            }
          } else if (Array.isArray(locationTypes) && locationTypes.length === 0) {
            this.distributionLocationTypes = [];
          } else {
            this.distributionLocationTypes = [];
          }
          
          this.regionOptions = (regions && 'results' in regions) ? regions.results : [];
          
          // In update mode, patch regionName after options are loaded
          if (this.distributionSiteRequestId) {
            // Check both distributionSiteRequest and fastingTentService (API may return either)
            const distributionSiteRequest = this.loadformData?.distributionSiteRequest || this.loadformData?.fastingTentService;
            const regionName = distributionSiteRequest?.regionName;
            if (regionName) {
              setTimeout(() => {
                if (!this.regionOptions.find(opt => opt.text === regionName)) {
                  // If region not found in options, add it
                  this.regionOptions.push({ id: regionName, text: regionName });
                }
                this.mainInfoForm.patchValue({
                  regionName: regionName
                });
                this.cdr.detectChanges();
              }, 0);
            }
          }
          
          if (!this.distributionSiteRequestId) {
            this.isLoading = false;
          }
          this.isFormInitialized = true;
          
          // Force change detection
          this.cdr.detectChanges();
          
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

        // Extract distribution site request data
        // Note: API may return fastingTentService instead of distributionSiteRequest for serviceId = 1001
        const distributionSiteRequest = response.distributionSiteRequest || response.fastingTentService;
        if (distributionSiteRequest) {
          this.distributionSiteRequestId = distributionSiteRequest.id || null;
          this.mainApplyServiceId = response.id || null;

          // Populate main info form
          // Note: locationTypeId will be patched in loadInitialData after options are loaded
          this.mainInfoForm.patchValue({
            regionName: distributionSiteRequest.regionName || '',
            streetName: distributionSiteRequest.streetName || '',
            address: distributionSiteRequest.address || '',
            notes: distributionSiteRequest.notes || '',
            distributionSiteCoordinators: distributionSiteRequest.distributionSiteCoordinators || '',
            startDate: distributionSiteRequest.startDate
              ? (distributionSiteRequest.startDate instanceof Date
                  ? distributionSiteRequest.startDate.toISOString().split('T')[0]
                  : new Date(distributionSiteRequest.startDate).toISOString().split('T')[0])
              : '',
            endDate: distributionSiteRequest.endDate
              ? (distributionSiteRequest.endDate instanceof Date
                  ? distributionSiteRequest.endDate.toISOString().split('T')[0]
                  : new Date(distributionSiteRequest.endDate).toISOString().split('T')[0])
              : '',
            supervisorName: distributionSiteRequest.supervisorName || '',
            jopTitle: distributionSiteRequest.jopTitle || '',
            supervisorMobile: distributionSiteRequest.supervisorMobile?.replace('971', '') || '',
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

          // Note: distribution-site-permit uses map coordinates, not locationId dropdown
          // So we don't need to load location details here
        }

        // Load initial data (dropdowns, etc.) - this will also load attachment configs
        this.loadInitialData();
        this.initializeCustomIcon();
        this.initializeMap();
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

  loadAttachmentConfigs(): void {
    const sub = this.attachmentService.getAttachmentsConfigByType(
      AttachmentsConfigType.RequestADistributionSitePermit,
      true,
      null
    ).subscribe({
      next: (configs) => {
        this.attachmentConfigs = configs || [];
        
        // In update mode, ensure we have all configs even if some attachments weren't uploaded initially
        if (this.distributionSiteRequestId) {
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
        console.error('Error loading attachment configs:', error);
      }
    });
    this.subscriptions.push(sub);
  }

  loadPartnerAttachmentConfigs(): void {
    this.attachmentService.getAttachmentsConfigByType(
      AttachmentsConfigType.Partner,
      true,
      null
    ).subscribe({
      next: (configs) => {
        this.partnerAttachmentConfigs = configs || [];
        this.initializePartnerAttachments();
      },
      error: (error) => {
      }
    });
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

  /**
   * Load attachments from API using masterId and masterType
   */
  private loadAttachmentsFromAPI(masterId: number): void {
    // Master type for DistributionSiteRequest - use AttachmentsConfigType.RequestADistributionSitePermit
    // Master ID should be the mainApplyServiceId
    const masterType = AttachmentsConfigType.RequestADistributionSitePermit;
    
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
        const partnerDto: DistributionSitePartnerDto = {
          name: partner.name,
          nameEn: partner.nameEn,
          type: partner.type,
          licenseIssuer: partner.licenseIssuer,
          licenseExpiryDate: partner.licenseExpiryDate,
          licenseNumber: partner.licenseNumber,
          contactDetails: partner.contactDetails,
          jobRequirementsDetails: partner.jobRequirementsDetails,
          mainApplyServiceId: this.mainApplyServiceId || 0,
          attachments: partner.attachments,
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
    
    // Mark for deletion
    if (existingAttachment.id) {
      this.attachmentsToDelete[configId] = existingAttachment.id;
    }
    
    // Remove from existing attachments
    delete this.existingAttachments[configId];
    delete this.filePreviews[configId];
    
    // Clear selected file if any
    delete this.selectedFiles[configId];
    
    this.cdr.detectChanges();
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
    if (!imgPath) return this.translate.instant('FILE') || 'File';
    const fileName = imgPath.split('/').pop() || '';
    return fileName || this.translate.instant('FILE') || 'File';
  }

  /**
   * Load location details by ID
   */
  loadLocationDetails(locationId: number, skipAvailabilityCheck: boolean = false): void {
    const sub = this.distributionSiteRequestService.getLocationById(locationId).subscribe({
      next: (location) => {
        this.selectedLocationDetails = location;
        this.populateLocationFields(location);
        
        // In update mode or when loading existing location, set status to available
        // Skip availability check if this is called from loadRequestDetails (update mode)
        if (skipAvailabilityCheck || this.distributionSiteRequestId) {
          this.locationAvailabilityStatus = 'available';
          // Only set lastSelectionSource if it's not already set (to distinguish between saved and newly selected)
          if (!this.lastSelectionSource) {
            this.lastSelectionSource = 'dropdown'; // Set source to dropdown for existing locations
          }
        }
      },
      error: (error) => {
        console.error('Error loading location details:', error);
        this.toastr.error(this.translate.instant('ERRORS.FAILED_LOAD_LOCATION_DETAILS') || 'Failed to load location details');
        if (skipAvailabilityCheck || this.distributionSiteRequestId) {
          this.locationAvailabilityStatus = null;
        }
      }
    });
    this.subscriptions.push(sub);
  }

  /**
   * Populate location fields in form
   */
  populateLocationFields(location: LocationDetailsDto): void {
    this.mainInfoForm.patchValue({
      locationId: location.id ? location.id.toString() : null,
      regionName: location.region || '',
      streetName: location.street || '',
      address: location.address || '',
      locationTypeId: location.locationTypeId || null,
      distributionSiteCoordinators: location.locationCoordinates || '',
    });

    // Ensure the dropdown retains and displays the selected option
    if (location.id && !this.regionOptions.find(opt => opt.id === location.id)) {
      const label =
        location.address ||
        location.locationOwner ||
        location.locationNo ||
        (this.translationService.currentLang === 'ar' ? 'الموقع المحدد' : 'Selected Location');
      this.regionOptions = [...this.regionOptions, { id: location.id.toString(), text: label }];
    }

    // Center map on the selected location
    if (location.locationCoordinates) {
      this.centerMapOnLocation(location.locationCoordinates, location.id);
    }
  }

  /**
   * Center map on location coordinates
   */
  centerMapOnLocation(coordinates: string, locationId: number): void {
    if (!this.map || !coordinates) { return; }
    const coords = this.parseCoordinates(coordinates);
    if (coords) {
      this.map.setCenter({ lat: coords.lat, lng: coords.lng });
      this.map.setZoom(15);
    }
  }

  /**
   * Parse coordinates string to lat/lng object
   */
  parseCoordinates(coordinates: string): { lat: number; lng: number } | null {
    if (!coordinates || coordinates.trim() === '') {
      return null;
    }

    try {
      const parts = coordinates.split('/');
      if (parts.length === 2) {
        const lat = parseFloat(parts[0].trim());
        const lng = parseFloat(parts[1].trim());
        if (!isNaN(lat) && !isNaN(lng)) {
          return { lat, lng };
        }
      }
    } catch (error) {
      console.error('Error parsing coordinates:', error);
    }
    return null;
  }

  initializeCustomIcon(): void {
    // Not used in Google Maps (we will use default marker). Keeping method for compatibility.
    this.customIcon = null;
  }

  // Tab navigation
  goToTab(tab: number): void {
    if (tab >= 1 && tab <= this.totalTabs) {
      this.currentTab = tab;
      this.visitedTabs.add(tab);

      // Re-initialize map when returning to the first tab (where the map lives)
      if (this.currentTab === 1) {
        setTimeout(() => {
          this.initializeMap();
        }, 300);
      }
    }
  }

  nextTab(): void {
    if (this.currentTab < this.totalTabs) {
      // Validate current tab and show error messages if validation fails
      if (this.validateCurrentTab()) {
        this.currentTab++;
        this.visitedTabs.add(this.currentTab);
      } else {
        // Show validation errors for the current tab
        this.validateCurrentTabWithMessages();
      }
    }
  }

  validateCurrentTabWithMessages(): void {
    switch (this.currentTab) {
      case 1:
        this.validateMainInfoTab(true);
        break;
      case 2:
        this.validateSupervisorInfoTab(true);
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

      // Re-initialize map when navigating back to the first tab
      if (this.currentTab === 1) {
        setTimeout(() => {
          this.initializeMap();
        }, 300);
      }
    }
  }

  validateCurrentTab(): boolean {
    switch (this.currentTab) {
      case 1:
        return this.validateMainInfoTab();
      case 2:
        return this.validateSupervisorInfoTab();
      case 3:
        return this.validatePartnersTab(); // Validate partners and their attachments
      case 4:
        return this.validateAttachmentsTab(); // Updated to use specific attachment validation
      default:
        return true;
    }
  }

  validateMainInfoTab(showToastr = false): boolean {
    const form = this.mainInfoForm;
    
    // Check location type (required)
    const locationTypeId = form.get('locationTypeId')?.value;
    if (!locationTypeId) {
      if (showToastr) {
        this.toastr.error(this.translate.instant('VALIDATION.REQUIRED_FIELD') + ': ' + this.translate.instant('DIST_SITE.REQUEST_TYPE'));
      }
      return false;
    }

    // Check specific fields for tab 1
    const requiredFieldsForTab1 = ['regionName', 'streetName'];
    
    let isValid = true;
    
    for (const fieldName of requiredFieldsForTab1) {
      const control = form.get(fieldName);
      if (!control?.value || (control.value === null || control.value === '')) {
        if (showToastr) {
          this.toastr.error(this.translate.instant('VALIDATION.REQUIRED_FIELD') + `: ${fieldName}`);
        }
        isValid = false;
      }
    }
    
    // Check if location coordinates are selected
    const hasCoordinates = this.selectedCoordinates || form.get('distributionSiteCoordinators')?.value;
    const hasExistingLocation = this.distributionSiteRequestId && hasCoordinates; // In update mode, if coordinates exist, consider it valid

    if (!hasCoordinates && !hasExistingLocation) {
      if (showToastr) {
        this.toastr.error(this.translate.instant('VALIDATION.LOCATION_REQUIRED'));
      }
      isValid = false;
    }

    // Validate dates moved here from Date tab
    const startDate = form.get('startDate')?.value;
    const endDate = form.get('endDate')?.value;
    if (!startDate) {
      if (showToastr) this.toastr.error(this.translate.instant('VALIDATION.REQUIRED_FIELD') + ': ' + this.translate.instant('DIST_SITE.START_DATE'));
      return false;
    }
    if (!endDate) {
      if (showToastr) this.toastr.error(this.translate.instant('VALIDATION.REQUIRED_FIELD') + ': ' + this.translate.instant('DIST_SITE.END_DATE'));
      return false;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);
    if (startDateObj < today) {
      if (showToastr) this.toastr.error(this.translate.instant('VALIDATION.START_DATE_PAST'));
      return false;
    }
    if (endDateObj <= startDateObj) {
      if (showToastr) this.toastr.error(this.translate.instant('VALIDATION.END_DATE_BEFORE_START'));
      return false;
    }
    
    return isValid;
  }

  validateDateDetailsTab(showToastr = false): boolean {
    // Check date fields for tab 2
    const requiredDateFields = ['startDate', 'endDate'];
    
    let isValid = true;
    
    for (const fieldName of requiredDateFields) {
      const control = this.mainInfoForm.get(fieldName);
      if (!control?.value || control.value === '') {
        if (showToastr) {
          this.toastr.error(this.translate.instant('VALIDATION.REQUIRED_FIELD') + `: ${fieldName}`);
        }
        isValid = false;
      }
    }
    
    // Additional validation: End date should be after start date
    const startDate = this.mainInfoForm.get('startDate')?.value;
    const endDate = this.mainInfoForm.get('endDate')?.value;
    
    if (startDate && endDate && new Date(endDate) <= new Date(startDate)) {
      if (showToastr) {
        this.toastr.error(this.translate.instant('FASTING_TENT.END_DATE_BEFORE_START_MESSAGE'));
      }
      isValid = false;
    }
    
    return isValid;
  }

  validateSupervisorInfoTab(showToastr = false): boolean {
    // Check supervisor fields for tab 3
    const requiredFields = ['supervisorName', 'supervisorMobile'];
    
    let isValid = true;
    
    for (const fieldName of requiredFields) {
      const control = this.mainInfoForm.get(fieldName);
      if (!control?.value || control.value === '') {
        if (showToastr) {
          this.toastr.error(this.translate.instant('VALIDATION.REQUIRED_FIELD') + `: ${fieldName}`);
        }
        isValid = false;
      }
    }
    
    // Validate supervisor mobile format (9 digits starting with 5)
    const supervisorMobile = this.mainInfoForm.get('supervisorMobile')?.value;
    if (supervisorMobile) {
      const uaeMobilePattern = /^5[0-9]{8}$/;
      if (!uaeMobilePattern.test(supervisorMobile)) {
        if (showToastr) {
          this.toastr.error(this.translate.instant('VALIDATION.INVALID_PHONE_FORMAT'));
        }
        isValid = false;
      }
    }
    
    return isValid;
  }

  validatePartnersTab(showToastr = false): boolean {
    // Partners tab is optional and should be considered completed when visited
    // This allows users to proceed without adding partners (since it's not mandatory)

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

  validateAttachmentsTab(showToastr = false): boolean {
    // Check mandatory attachments for tab 5
    const mandatoryAttachments = this.attachmentConfigs.filter(config => config.mendatory);
    
    let isValid = true;
    
    for (const config of mandatoryAttachments) {
      // In update mode, check for existing attachments or newly selected files
      const hasAttachment = this.distributionSiteRequestId
        ? (this.selectedFiles[config.id!] || this.existingAttachments[config.id!])
        : (this.selectedFiles[config.id!] || this.attachments.find(a => a.attConfigID === config.id && a.fileBase64 && a.fileName));
      
      if (!hasAttachment) {
        if (showToastr) {
          const attachmentName = this.getAttachmentName(config);
          this.toastr.error(this.translate.instant('VALIDATION.ATTACHMENT_REQUIRED') + `: ${attachmentName}`);
        }
        isValid = false;
      }
    }
    
    return isValid;
  }

  // Map functionality
  initializeMap(): void {
    // Use a longer timeout to ensure DOM is ready
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
      }
    };
    
    setTimeout(checkAndInitialize, 100);
  }

  setupMap(): void {
    try {
      if (this.map) {
        this.map = null;
      }

      // In update mode, use saved coordinates if available
      let defaultLat = 25.2048;
      let defaultLng = 55.2708;
      let defaultZoom = 10;

      if (this.distributionSiteRequestId) {
        // Check both distributionSiteRequest and fastingTentService (API may return either)
        const distributionSiteRequest = this.loadformData?.distributionSiteRequest || this.loadformData?.fastingTentService;
        if (distributionSiteRequest?.distributionSiteCoordinators) {
          const coords = this.parseCoordinates(distributionSiteRequest.distributionSiteCoordinators);
          if (coords) {
            defaultLat = coords.lat;
            defaultLng = coords.lng;
            defaultZoom = 15;
            this.selectedCoordinates = distributionSiteRequest.distributionSiteCoordinators;
          }
        }
      }

      this.googleMapsLoader.load().then((google) => {
        const el = document.getElementById('distributionMap') as HTMLElement;
        if (!el) { return; }

        this.map = new google.maps.Map(el, {
          center: { lat: defaultLat, lng: defaultLng },
          zoom: defaultZoom,
          fullscreenControl: false,
          streetViewControl: false,
          mapTypeControl: false,
        });

        // In update mode, add marker for saved location
        if (this.distributionSiteRequestId && this.selectedCoordinates) {
          const coords = this.parseCoordinates(this.selectedCoordinates);
          if (coords) {
            const marker = new google.maps.Marker({
              position: { lat: coords.lat, lng: coords.lng },
              map: this.map,
            });
            this.markers.push(marker);

            // Ensure zoom is focused on the selected coordinates
            this.map.setCenter({ lat: coords.lat, lng: coords.lng });
            this.map.setZoom(18);
          }
        }

        this.map.addListener('click', (e: any) => {
          this.onMapClick({ latlng: { lat: e.latLng.lat(), lng: e.latLng.lng() } });
        });
      }).catch(() => {
        this.toastr.error(this.translate.instant('SHARED.MAP.LOADING_ERROR'));
      });
    } catch (error) {
    }
  }

  onMapClick(e: any): void {
    const lat = e.latlng.lat;
    const lng = e.latlng.lng;

    this.markers.forEach(marker => {
      if (marker && marker.setMap) {
        marker.setMap(null);
      }
    });
    this.markers = [];

    if (this.map && (window as any).google) {
      const google = (window as any).google;
      const marker = new google.maps.Marker({
        position: { lat, lng },
        map: this.map,
      });
      this.markers.push(marker);
    }

    this.selectedCoordinates = `${lat}/${lng}`;
    this.mainInfoForm.patchValue({
      distributionSiteCoordinators: this.selectedCoordinates,
    });

    this.toastr.success(this.translate.instant('SUCCESS.LOCATION_SELECTED'));
  }

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

    const newPartner: DistributionSitePartnerDto = {
      ...this.partnersForm.value,
      name, // ناخد النسخة الـ trimmed
      licenseIssuer,
      licenseExpiryDate: licenseExpiry || undefined,
      licenseNumber,
      contactDetails: contactDetails.toString(),
      mainApplyServiceId: 0,
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

  getPartnerAttachmentsForType(partnerType: PartnerType): DistributionSiteAttachmentDto[] {
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
      if (!this.distributionSiteRequestId) {
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
    if (!this.distributionSiteRequestId) {
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
      return;
    }

    this.isSaving = true;
    
    try {
      const formData = this.mainInfoForm.getRawValue();
      const currentUser = this.authService.getCurrentUser();
      
      if (!currentUser?.id) {
        this.toastr.error(this.translate.instant('ERRORS.USER_NOT_FOUND'));
        this.isSaving = false;
        return;
      }

      // Check if we're in update mode
      const isUpdateMode = !!this.distributionSiteRequestId && !!this.mainApplyServiceId;

      if (isUpdateMode) {
        // Update mode - handle attachments and partners separately
        try {
          await this.handleAttachmentOperations();
        } catch (attachmentError) {
          console.error('Error handling attachments:', attachmentError);
          this.toastr.warning(
            this.translate.instant('ERRORS.FAILED_SAVE_ATTACHMENTS') || 'Warning saving attachments'
          );
        }

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

        const updateDto: UpdateDistributionSiteRequestDto = {
          id: this.distributionSiteRequestId!,
          mainApplyServiceId: this.mainApplyServiceId!,
          userId: currentUser.id,
          locationType: this.getSelectedLocationTypeName(),
          locationTypeId: formData.locationTypeId,
          regionName: formData.regionName,
          streetName: formData.streetName,
          address: formData.address,
          startDate: startDateValue,
          endDate: endDateValue,
          notes: formData.notes,
          locationId: formData.locationId ? Number(formData.locationId) : undefined,
          supervisorName: formData.supervisorName,
          jopTitle: formData.jopTitle,
          supervisorMobile: formData.supervisorMobile ? `971${formData.supervisorMobile}` : undefined,
          serviceType: ServiceType.DistributionSitePermitApplication,
          distributionSiteCoordinators: formData.distributionSiteCoordinators,
          isDraft: isDraft,
        };

        const sub = this.distributionSiteRequestService.update(updateDto).subscribe({
          next: (response) => {
            if (isDraft) {
              this.toastr.success(this.translate.instant('SUCCESS.DISTRIBUTION_SITE_REQUEST_SAVED_AS_DRAFT'));
            } else {
              this.toastr.success(this.translate.instant('SUCCESS.DISTRIBUTION_SITE_REQUEST_CREATED'));
            }
            this.router.navigate(['/request']);
            this.isSaving = false;
          },
          error: (error) => {
            console.error(`Error ${isDraft ? 'saving draft' : 'updating'} distribution site request:`, error);

            // Check if it's a business error with a specific reason
            if (error.error && error.error.reason) {
              // Show the specific reason from the API response
              this.toastr.error(error.error.reason);
            } else {
              // Fallback to generic error message
              if (isDraft) {
                this.toastr.error(this.translate.instant('ERRORS.FAILED_SAVE_DRAFT'));
              } else {
                this.toastr.error(this.translate.instant('ERRORS.FAILED_UPDATE_DISTRIBUTION_SITE_REQUEST') || 'Failed to update distribution site request');
              }
            }

            this.isSaving = false;
          }
        });
        this.subscriptions.push(sub);
      } else {
        // Create mode
        const validAttachments = this.attachments.filter(a => a.fileBase64 && a.fileName);
        
        const createDto: CreateDistributionSiteRequestDto = {
          mainApplyServiceId: 0,
          userId: currentUser.id,
          locationType: this.getSelectedLocationTypeName(),
          locationTypeId: formData.locationTypeId,
          regionName: formData.regionName,
          streetName: formData.streetName,
          address: formData.address,
          startDate: formData.startDate,
          endDate: formData.endDate,
          notes: formData.notes,
          locationId: formData.locationId,

          supervisorName: formData.supervisorName,
          jopTitle: formData.jopTitle,
          supervisorMobile: `971${formData.supervisorMobile}`, // Add 971 prefix

          serviceType: ServiceType.DistributionSitePermitApplication,
          distributionSiteCoordinators: formData.distributionSiteCoordinators,
          attachments: validAttachments,
          partners: this.partners,
          isDraft: isDraft, // Set draft flag based on parameter
        };

        const sub = this.distributionSiteRequestService.create(createDto).subscribe({
          next: (response) => {
            if (isDraft) {
              this.toastr.success(this.translate.instant('SUCCESS.DISTRIBUTION_SITE_REQUEST_SAVED_AS_DRAFT'));
            } else {
              this.toastr.success(this.translate.instant('SUCCESS.DISTRIBUTION_SITE_REQUEST_CREATED'));
            }
             this.router.navigate(['/request']);
            this.isSaving = false;
          },
          error: (error) => {
            console.error(`Error ${isDraft ? 'saving draft' : 'creating'} distribution site request:`, error);
            
            // Check if it's a business error with a specific reason
            if (error.error && error.error.reason) {
              // Show the specific reason from the API response
              this.toastr.error(error.error.reason);
            } else {
              // Fallback to generic error message
              if (isDraft) {
                this.toastr.error(this.translate.instant('ERRORS.FAILED_SAVE_DRAFT'));
              } else {
                this.toastr.error(this.translate.instant('ERRORS.FAILED_CREATE_DISTRIBUTION_SITE_REQUEST'));
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
          this.toastr.error(this.translate.instant('ERRORS.FAILED_CREATE_DISTRIBUTION_SITE_REQUEST'));
        }
      }
      
      this.isSaving = false;
    }
  }

  // Save as Draft
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

    //if (!this.canSubmit(true)) {
    //  return;
    //}

    this.isSaving = true;

    try {
      const formData = this.mainInfoForm.getRawValue();
      const currentUser = this.authService.getCurrentUser();

      if (!currentUser?.id) {
        this.toastr.error(this.translate.instant('ERRORS.USER_NOT_FOUND'));
        this.isSaving = false;
        return;
      }
      const normalizedFormData = this.normalizeEmptyStrings(formData);

      // Check if we're in update mode
      const isUpdateMode = !!this.distributionSiteRequestId && !!this.mainApplyServiceId;

      if (isUpdateMode) {
        // Update mode - handle attachments and partners separately
        try {
          await this.handleAttachmentOperations();
        } catch (attachmentError) {
          console.error('Error handling attachments:', attachmentError);
          this.toastr.warning(
            this.translate.instant('ERRORS.FAILED_SAVE_ATTACHMENTS') || 'Warning saving attachments'
          );
        }

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

        const updateDto: UpdateDistributionSiteRequestDto = {
          id: this.distributionSiteRequestId!,
          mainApplyServiceId: this.mainApplyServiceId!,
          userId: currentUser.id,
          locationType: this.getSelectedLocationTypeName(),
          locationTypeId: normalizedFormData.locationTypeId,
          regionName: normalizedFormData.regionName,
          streetName: normalizedFormData.streetName,
          address: normalizedFormData.address,
          startDate: startDateValue,
          endDate: endDateValue,
          notes: normalizedFormData.notes,
          locationId: normalizedFormData.locationId ? Number(normalizedFormData.locationId) : undefined,
          supervisorName: normalizedFormData.supervisorName,
          jopTitle: normalizedFormData.jopTitle,
          supervisorMobile: normalizedFormData.supervisorMobile ? `971${normalizedFormData.supervisorMobile}` : undefined,
          serviceType: ServiceType.DistributionSitePermitApplication,
          distributionSiteCoordinators: normalizedFormData.distributionSiteCoordinators,
          isDraft: isDraft,
        };

        const sub = this.distributionSiteRequestService.update(updateDto).subscribe({
          next: (response) => {
            if (isDraft) {
              this.toastr.success(this.translate.instant('SUCCESS.DISTRIBUTION_SITE_REQUEST_SAVED_AS_DRAFT'));
            } else {
              this.toastr.success(this.translate.instant('SUCCESS.DISTRIBUTION_SITE_REQUEST_CREATED'));
            }
            this.router.navigate(['/request']);
            this.isSaving = false;
          },
          error: (error) => {
            console.error(`Error ${isDraft ? 'saving draft' : 'updating'} distribution site request:`, error);

            // Check if it's a business error with a specific reason
            if (error.error && error.error.reason) {
              // Show the specific reason from the API response
              this.toastr.error(error.error.reason);
            } else {
              // Fallback to generic error message
              if (isDraft) {
                this.toastr.error(this.translate.instant('ERRORS.FAILED_SAVE_DRAFT'));
              } else {
                this.toastr.error(this.translate.instant('ERRORS.FAILED_UPDATE_DISTRIBUTION_SITE_REQUEST') || 'Failed to update distribution site request');
              }
            }

            this.isSaving = false;
          }
        });
        this.subscriptions.push(sub);
      } else {
        // Create mode
        const validAttachments = this.attachments.filter(a => a.fileBase64 && a.fileName);

        const createDto: CreateDistributionSiteRequestDto = {
          mainApplyServiceId: 0,
          userId: currentUser.id,
          locationType: this.getSelectedLocationTypeName(),
          locationTypeId: normalizedFormData.locationTypeId,
          regionName: normalizedFormData.regionName,
          streetName: normalizedFormData.streetName,
          address: normalizedFormData.address,
          startDate: normalizedFormData.startDate,
          endDate: normalizedFormData.endDate,
          notes: normalizedFormData.notes,
          locationId: normalizedFormData.locationId,

          supervisorName: normalizedFormData.supervisorName,
          jopTitle: normalizedFormData.jopTitle,
          supervisorMobile: `971${normalizedFormData.supervisorMobile}`, // Add 971 prefix

          serviceType: ServiceType.DistributionSitePermitApplication,
          distributionSiteCoordinators: normalizedFormData.distributionSiteCoordinators,
          attachments: validAttachments,
          partners: this.partners,
          isDraft: isDraft, // Set draft flag based on parameter
        };

        const sub = this.distributionSiteRequestService.create(createDto).subscribe({
          next: (response) => {
            if (isDraft) {
              this.toastr.success(this.translate.instant('SUCCESS.DISTRIBUTION_SITE_REQUEST_SAVED_AS_DRAFT'));
            } else {
              this.toastr.success(this.translate.instant('SUCCESS.DISTRIBUTION_SITE_REQUEST_CREATED'));
            }
            this.router.navigate(['/request']);
            this.isSaving = false;
          },
          error: (error) => {
            console.error(`Error ${isDraft ? 'saving draft' : 'creating'} distribution site request:`, error);

            // Check if it's a business error with a specific reason
            if (error.error && error.error.reason) {
              // Show the specific reason from the API response
              this.toastr.error(error.error.reason);
            } else {
              // Fallback to generic error message
              if (isDraft) {
                this.toastr.error(this.translate.instant('ERRORS.FAILED_SAVE_DRAFT'));
              } else {
                this.toastr.error(this.translate.instant('ERRORS.FAILED_CREATE_DISTRIBUTION_SITE_REQUEST'));
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
          this.toastr.error(this.translate.instant('ERRORS.FAILED_CREATE_DISTRIBUTION_SITE_REQUEST'));
        }
      }

      this.isSaving = false;
    }
  }

  isFieldMandatory(fieldName: string): boolean {
    const mandatoryFields = ['locationType', 'locationTypeId', 'regionName', 'streetName', 'startDate', 'endDate', 'supervisorName', 'supervisorMobile', 'distributionSiteCoordinators'];
    return mandatoryFields.includes(fieldName);
  }

  isAttachmentMandatory(configId: number): boolean {
    const config = this.attachmentConfigs.find(c => c.id === configId);
    return config?.mendatory || false;
  }

  isAttachmentMissing(configId: number): boolean {
    return this.submitted && this.isAttachmentMandatory(configId) && !this.attachments.find(a => a.attConfigID === configId && a.fileBase64);
  }

  canSubmit(showToastr = false): boolean {
    if (this.currentTab !== this.totalTabs || this.isSaving || !this.isFormInitialized) {
      return false;
    }
    return (
      this.validateMainInfoTab(showToastr) &&
      this.validateSupervisorInfoTab(showToastr) &&
      this.validatePartnersTab(showToastr) &&
      this.validateAttachmentsTab(showToastr)
    );
  }

  getSelectedLocationTypeName(): string {
    const selectedType = this.distributionLocationTypes.find(type => type.id === this.mainInfoForm.get('locationTypeId')?.value);
    if (!selectedType) {
      return '';
    }
    
    // Use current language to determine which text to return
    const currentLang = this.translationService.currentLang;
    return currentLang === 'ar' ? selectedType.text : selectedType.value;
  }

  getBindLabelField(): string {
    // Return the field name to bind for the dropdown label based on current language
    return this.translationService.currentLang === 'ar' ? 'text' : 'value';
  }

  onLocationTypeChange(selectedId: number | any) {
    // Prevent infinite loop
    if (this.isUpdatingLocationType) {
      return;
    }
    
    // Handle both direct ID and event object
    let id: number;
    if (typeof selectedId === 'object' && selectedId?.id) {
      id = selectedId.id;
    } else if (typeof selectedId === 'number') {
      id = selectedId;
    } else {
      return;
    }
    
    // Check if the value is already set to prevent unnecessary updates
    const currentValue = this.mainInfoForm.get('locationTypeId')?.value;
    if (currentValue === id) {
      return; // Value already set, no need to update
    }
    
    const selected = this.distributionLocationTypes.find(item => item.id === id);
    
    if (selected) {
      // Set flag to prevent recursive calls
      this.isUpdatingLocationType = true;
      
      try {
        // Use current language to determine which text to use
        const currentLang = this.translationService.currentLang;
        let locationTypeText: string;
        
        if (currentLang === 'ar') {
          // For Arabic, use the 'text' field (Arabic text)
          locationTypeText = selected.text;
        } else {
          // For English, use the 'value' field (English value)
          locationTypeText = selected.value;
        }
        
        // Use setValue with emitEvent: false to prevent triggering change events
        this.mainInfoForm.patchValue({
          locationType: locationTypeText,
          locationTypeId: id
        }, { emitEvent: false });
        
        // Force change detection
        this.cdr.detectChanges();
      } finally {
        // Reset flag after a short delay to allow the update to complete
        setTimeout(() => {
          this.isUpdatingLocationType = false;
        }, 0);
      }
    } else {
      // Set flag to prevent recursive calls
      this.isUpdatingLocationType = true;
      
      try {
        this.mainInfoForm.patchValue({
          locationType: '',
          locationTypeId: null
        }, { emitEvent: false });
      } finally {
        setTimeout(() => {
          this.isUpdatingLocationType = false;
        }, 0);
      }
    }
  }

  // Test method for dropdown functionality (can be removed after testing)
  testRequestTypeDropdown(): void {
    // Simulate the backend data structure
    const testData: DistributionLocationTypeDto[] = [
      {
        id: 11,
        text: "مواقع توزيع",
        value: "DistributionSites"
      },
      {
        id: 12,
        text: "تقاطعات مرورية", 
        value: "TrafficIntersections"
      }
    ];
    
    this.distributionLocationTypes = testData;
    this.cdr.detectChanges();
    
    // Test selection for each language
    this.translationService.setLanguage('ar');
    this.onLocationTypeChange(11);
    
    this.translationService.setLanguage('en');
    this.onLocationTypeChange(12);
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
        return this.validateSupervisorInfoTab();
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

  // Helper methods for template to check field validation status
  isFieldValid(fieldName: string): boolean {
    const control = this.mainInfoForm.get(fieldName);
    return control ? control.valid && (control.dirty || control.touched) : false;
  }

  isFieldInvalid(fieldName: string): boolean {
    const control = this.mainInfoForm.get(fieldName);
    return control ? control.invalid && (control.dirty || control.touched) : false;
  }

  isCurrentTabValid(): boolean {
    return this.validateCurrentTab();
  }

  // Get tab validation status for UI indicators
  getTabValidationClass(tabNumber: number): string {
    if (this.isTabCompleted(tabNumber)) {
      return 'completed';
    } else if (this.currentTab === tabNumber) {
      return 'active';
    } else {
      return '';
    }
  }

  // Custom Validators
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

  // Helper methods for template error display
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
    const mobileControl = this.mainInfoForm.get('supervisorMobile');
    if (mobileControl && mobileControl.value) {
      // Trigger validation as user types
      mobileControl.markAsTouched();
    }
  }

  // Handle mobile number blur event to trigger validation
  onSupervisorMobileBlur(): void {
    const mobileControl = this.mainInfoForm.get('supervisorMobile');
    if (mobileControl && mobileControl.value) {
      // Trigger validation on blur
      mobileControl.markAsTouched();
      this.cdr.detectChanges();
    }
  }
}
