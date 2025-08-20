import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
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
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin, Subscription } from 'rxjs';
import * as L from 'leaflet';

import { FastingTentRequestService } from '../../../core/services/fasting-tent-request.service';
import { AttachmentService } from '../../../core/services/attachments/attachment.service';
import { AuthService } from '../../../core/services/auth.service';
import { TranslationService } from '../../../core/services/translation.service';
import { LocationService } from '../../../core/services/UserSetting/location.service';

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
} from '../../../core/dtos/FastingTentRequest/fasting-tent-request.dto';
import {
  AttachmentsConfigDto,
  AttachmentsConfigType,
} from '../../../core/dtos/attachments/attachments-config.dto';

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
  totalTabs: number = 5;

  // Forms
  mainInfoForm!: FormGroup;
  dateDetailsForm!: FormGroup;
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

  // Partners data (keeping for compatibility but removing management methods)
  partners: FastingTentPartnerDto[] = [];

  // Attachments data
  attachmentConfigs: AttachmentsConfigDto[] = [];
  attachments: FastingTentAttachmentDto[] = [];
  selectedFiles: { [key: number]: File } = {};
  filePreviews: { [key: number]: string } = {};
  isDragOver = false;
  showLocationPhotoOverlay = false;

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
    private authService: AuthService,
    private locationService: LocationService,
    public translationService: TranslationService,
    private translate: TranslateService,
    private toastr: ToastrService,
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {
    this.initializeForms();
    this.initializePartnerTypes();
  }

  ngOnInit(): void {
    this.clearAllToasts();
    this.loadInitialData();
    this.initializeCustomIcon();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    if (this.map) {
      this.map.remove();
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
    });

    this.dateDetailsForm = this.fb.group({
      startDate: ['', Validators.required],
      endDate: ['', Validators.required],
      tentDate: [{ value: '', disabled: true }], // renamed and disabled
      tentIsSetUp: [false],
      consultantApprovedByPolice: [false],
      consultantFromAjman: [false],
    });

    this.supervisorForm = this.fb.group({
      supervisorName: ['', [Validators.required, Validators.minLength(2)]],
      jopTitle: ['', [Validators.required, Validators.minLength(2)]],
      supervisorMobile: ['', [Validators.required, Validators.pattern(/^[0-9+\-\s]+$/), Validators.minLength(7)]],
    });

    this.partnersForm = this.fb.group({
      name: [''],
      type: [null],
      licenseIssuer: [''],
      licenseExpiryDate: [''],
      licenseNumber: [''],
      contactDetails: [''],
    });

    // Subscribe to tent location type changes
    this.setupFormValueChanges();
  }

  initializePartnerTypes(): void {
    this.partnerTypes = this.fastingTentRequestService.getPartnerTypes();
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
        // console.log('mainInfoForm value:', this.mainInfoForm.getRawValue());
      }
    });
    this.subscriptions.push(mainFormSub);

    const dateFormSub = this.dateDetailsForm.valueChanges.subscribe(() => {
      this.cdr.detectChanges();
    });
    this.subscriptions.push(dateFormSub);

    // Subscribe to startDate changes to show toaster immediately if past date is entered
    const startDateControl = this.dateDetailsForm.get('startDate');
    if (startDateControl) {
      const startDateSub = startDateControl.valueChanges.subscribe(() => {
        this.validateDateDetailsTab(true);
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
    this.isLoading = true;
    
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
            // console.log(`Tent Type ${index}:`, type);
          });
          
          this.isLoading = false;
          this.isFormInitialized = true;
          
          // Load location data immediately on page load
          this.loadLocationDataOnInit();
          
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

  // Temporary test method for debugging API
  testAPI(): void {
    this.fastingTentRequestService.getTentLocationTypes().subscribe({
      next: (response) => {
        // console.log('Manual API test success:', response);
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
        // console.log('Interactive Map API test success:', response);
        // console.log('Number of locations returned:', response?.length || 0);
        // if (response && response.length > 0) {
        //   console.log('Sample location:', response[0]);
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
      this.map.invalidateSize();
      this.toastr.info('Map refreshed');
    } else if (this.selectedScenario === 'distribution') {
      // console.log('Map not initialized, reinitializing...');
      this.initializeMap();
    } else {
      this.toastr.warning('Please select Distribution Items Tent to load the map');
    }
  }

  loadLocationDataOnInit(): void {
    // console.log('Loading location data on component initialization...');
    
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
        // Initialize attachments array based on configs
        this.attachments = this.attachmentConfigs.map(config => ({
          fileBase64: '',
          fileName: '',
          masterId: 0,
          attConfigID: config.id!
        }));
      },
      error: (error) => {
        // console.error('Error loading attachment configs:', error);
      }
    });
    this.subscriptions.push(sub);
  }

  loadPartnerAttachmentConfigs(): void {
    // console.log('[loadPartnerAttachmentConfigs] Requesting partner attachment configs with type:', AttachmentsConfigType.Partner);
    const sub = this.attachmentService.getAttachmentsConfigByType(
      AttachmentsConfigType.Partner,
      true,
      null
    ).subscribe({
      next: (configs) => {
        // console.log('[loadPartnerAttachmentConfigs] Received configs:', configs);
        this.partnerAttachmentConfigs = configs || [];
        this.initializePartnerAttachments();
      },
      error: (error) => {
        // console.error('[loadPartnerAttachmentConfigs] Error loading partner attachment configs:', error);
      }
    });
    this.subscriptions.push(sub);
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
    this.customIcon = L.divIcon({
      className: 'custom-marker',
      html: '<div style="background-color: #ff4444; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3); position: relative;"><div style="position: absolute; bottom: -8px; left: 50%; transform: translateX(-50%); width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-top: 8px solid #ff4444;"></div></div>',
      iconSize: [20, 28],
      iconAnchor: [10, 28],
      popupAnchor: [0, -28],
    });
  }

  // Tab navigation
  goToTab(tab: number): void {
    if (tab >= 1 && tab <= this.totalTabs) {
      this.currentTab = tab;
    }
  }

  nextTab(): void {
    if (this.currentTab < this.totalTabs) {
      if (this.validateCurrentTab()) {
        this.currentTab++;
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
        this.validateDateDetailsTab(true);
        break;
      case 3:
        this.validateSupervisorTab(true);
        break;
      case 4:
        this.validatePartnersTab(true);
        break;
      case 5:
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
        return this.validateDateDetailsTab();
      case 3:
        return this.validateSupervisorTab();
      case 4:
        return this.validatePartnersTab();
      case 5:
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
    
    if (!hasDropdownSelection && !hasMapSelection) {
      if (showToastr) {
        this.toastr.error(this.translate.instant('VALIDATION.LOCATION_REQUIRED'));
      }
      return false;
    }
    
    // Check if location availability check is in progress
    if (this.locationAvailabilityStatus === 'checking') {
      if (showToastr) {
        this.toastr.warning(this.translate.instant('COMMON.PLEASE_WAIT_CHECKING_AVAILABILITY'));
      }
      return false;
    }
    
    // Check if location is available
    if (this.locationAvailabilityStatus === 'unavailable') {
      if (showToastr) {
        this.toastr.error(this.translate.instant('VALIDATION.LOCATION_NOT_AVAILABLE'));
      }
      return false;
    }
    
    // Location must be available to proceed
    if (this.locationAvailabilityStatus !== 'available') {
      if (showToastr) {
        this.toastr.error(this.translate.instant('VALIDATION.PLEASE_SELECT_VALID_LOCATION'));
      }
      return false;
    }
    
    return true;
  }

  validateDateDetailsTab(showToastr = false): boolean {
    const form = this.dateDetailsForm;
    
    // Check start date (required)
    const startDate = form.get('startDate')?.value;
    if (!startDate || (typeof startDate === 'string' && startDate.trim() === '')) {
      if (showToastr) {
        this.toastr.error(this.translate.instant('VALIDATION.REQUIRED_FIELD') + ': ' + this.translate.instant('FASTING_TENT.START_DATE'));
      }
      return false;
    }
    
    // Check end date (required)
    const endDate = form.get('endDate')?.value;
    if (!endDate || (typeof endDate === 'string' && endDate.trim() === '')) {
      if (showToastr) {
        this.toastr.error(this.translate.instant('VALIDATION.REQUIRED_FIELD') + ': ' + this.translate.instant('FASTING_TENT.END_DATE'));
      }
      return false;
    }

    // Validate that start date is not in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to start of day for comparison
    const startDateObj = new Date(startDate);
    
    if (startDateObj < today) {
      if (showToastr) {
        this.toastr.error(this.translate.instant('FASTING_TENT.START_DATE_PAST_MESSAGE'));
      }
      return false;
    }

    // Validate that end date is after start date
    const endDateObj = new Date(endDate);
    if (endDateObj <= startDateObj) {
      if (showToastr) {
        this.toastr.error(this.translate.instant('FASTING_TENT.END_DATE_BEFORE_START_MESSAGE'));
      }
      return false;
    }
    
    // Validate maximum duration (optional business rule - can be adjusted)
    const daysDiff = Math.ceil((endDateObj.getTime() - startDateObj.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff > 365) { // Max 1 year duration
      if (showToastr) {
        this.toastr.error(this.translate.instant('VALIDATION.DATE_RANGE_TOO_LONG'));
      }
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
    
    // Validate phone number format and minimum length
    const phonePattern = /^[0-9+\-\s()]+$/;
    if (!phonePattern.test(supervisorMobile)) {
      if (showToastr) {
        this.toastr.error(this.translate.instant('VALIDATION.INVALID_PHONE_FORMAT'));
      }
      return false;
    }
    
    // Remove non-numeric characters to check minimum length
    const numericOnly = supervisorMobile.replace(/[^0-9]/g, '');
    if (numericOnly.length < 7) {
      if (showToastr) {
        this.toastr.error(this.translate.instant('VALIDATION.PHONE_MIN_LENGTH'));
      }
      return false;
    }
    
    return true;
  }

  validatePartnersTab(showToastr = false): boolean {
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
    // console.log('onTentLocationTypeChange called with event:', event);
    // console.log('Available tentLocationTypes:', this.tentLocationTypes);
    
    // Extract the ID from the event - ng-select passes the full object when bindValue="id" is used
    let eventId: number;
    
    if (typeof event === 'object' && event !== null && event.id) {
      // Event is the full object
      eventId = event.id;
      // console.log('Event is object, extracted ID:', eventId);
    } else if (typeof event === 'string') {
      // Event is string ID
      eventId = parseInt(event, 10);
      // console.log('Event is string, parsed ID:', eventId);
    } else if (typeof event === 'number') {
      // Event is numeric ID
      eventId = event;
      // console.log('Event is number, ID:', eventId);
    } else {
      // console.log('Invalid event type, clearing scenario:', typeof event, event);
      this.clearLocationSelection();
      return;
    }
    
    // console.log('Final event ID:', eventId);
    
    const selectedType = this.tentLocationTypes.find(type => type.id === eventId);
    // console.log('Selected type:', selectedType);
    
    // Check if we have a valid selection
    if (!selectedType || !eventId) {
      // console.log('No valid type selected, clearing scenario');
      this.clearLocationSelection();
      return;
    }
    
    // Reset location selection when tent type changes
    this.clearLocationSelection();
  }

  loadLocationOptions(): void {
    // console.log('Loading location options for iftar tent scenario...');
    const request = {
      skip: 0,
      take: 100,
      searchTerm: '',
    };

    const sub = this.fastingTentRequestService.getLocationSelect2(request).subscribe({
      next: (response) => {
        // console.log('Location options response:', response);
        this.locationOptions = response.results || [];
        // console.log('Assigned locationOptions:', this.locationOptions);
        const selectedId = this.mainInfoForm.get('locationId')?.value;
        if (selectedId && !this.locationOptions.find(opt => opt.id === selectedId)) {
          // Optionally push the selected value if not present
          this.locationOptions.push({ id: selectedId, text: 'Selected Location' });
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
          // console.log(`Location ${index + 1}:`, {
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

  loadLocationDetails(locationId: number): void {
    const sub = this.fastingTentRequestService.getLocationById(locationId).subscribe({
      next: (location) => {
        this.selectedLocationDetails = location;
        this.populateLocationFields(location);
      },
      error: (error) => {
        // console.error('Error loading location details:', error);
        this.toastr.error(this.translate.instant('ERRORS.FAILED_LOAD_LOCATION_DETAILS'));
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
        // console.log('Map element found, initializing map...');
        this.setupMap();
      } else if (attempts < maxAttempts) {
        // console.log(`Map element not found, attempt ${attempts}/${maxAttempts}, retrying...`);
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
        // console.log('Removing existing map instance');
        this.map.remove();
        this.map = null;
      }

      // Default to Dubai coordinates (UAE)
      const defaultLat = 25.2048;
      const defaultLng = 55.2708;

      // console.log('Initializing map with center:', { lat: defaultLat, lng: defaultLng });

      this.map = L.map('distributionMap').setView([defaultLat, defaultLng], 10);

      // Add tile layer with fallback
      const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: ' OpenStreetMap contributors',
        maxZoom: 19,
        minZoom: 5,
        crossOrigin: true,
      });
      
      // Add error handler for tile loading issues
      tileLayer.on('tileerror', (error) => {
        // console.warn('Tile loading error:', error);
        // Fallback to alternative tile server
        this.addFallbackTileLayer();
      });
      
      tileLayer.addTo(this.map);

      // console.log('Map initialized successfully, adding markers...');
      this.addMapMarkers();

      // Add a simple click handler for debugging
      this.map.on('click', (e: any) => {
        // console.log('Map clicked at:', e.latlng);
      });

      // Force map refresh after a short delay to ensure proper rendering
      setTimeout(() => {
        if (this.map) {
          // console.log('Forcing map invalidateSize...');
          this.map.invalidateSize();
          
          // Check if tiles are loaded
          const tileLayersLoaded = this.checkTileLayersLoaded();
          if (!tileLayersLoaded) {
            // console.warn('Tiles not loaded, trying fallback...');
            this.addFallbackTileLayer();
          }
        }
      }, 1000);

    } catch (error) {
      // console.error('Error setting up map:', error);
      this.toastr.error('Failed to initialize map');
    }
  }

  addFallbackTileLayer(): void {
    // console.log('Adding fallback tile layer...');
    // Remove existing tile layers first
    this.map.eachLayer((layer: any) => {
      if (layer instanceof L.TileLayer) {
        this.map.removeLayer(layer);
      }
    });

    // Add alternative tile layer
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: ' OpenStreetMap contributors (fallback)',
      maxZoom: 19,
      minZoom: 5,
    }).addTo(this.map);
    
    this.toastr.info('Using fallback map tiles');
  }

  checkTileLayersLoaded(): boolean {
    try {
      const mapContainer = document.getElementById('distributionMap');
      if (!mapContainer) return false;
      
      const leafletTiles = mapContainer.querySelectorAll('.leaflet-tile');
      const loadedTiles = mapContainer.querySelectorAll('.leaflet-tile-loaded');
      
      // console.log(`Tile check: ${loadedTiles.length} loaded out of ${leafletTiles.length} total tiles`);
      
      // If we have some tiles and at least 50% are loaded, consider it successful
      return leafletTiles.length > 0 && (loadedTiles.length / leafletTiles.length) >= 0.5;
    } catch (error) {
      // console.error('Error checking tile loading status:', error);
      return false;
    }
  }

  addMapMarkers(): void {
    this.markers = [];
    // console.log(`Adding markers for ${this.interactiveMapLocations.length} locations`);

    if (this.interactiveMapLocations.length === 0) {
      // console.warn('No locations available to add markers');
      this.toastr.warning('No locations found to display on map');
      return;
    }

    let markersAdded = 0;
    let markersSkipped = 0;

    this.interactiveMapLocations.forEach((location, index) => {
      // console.log(`Processing location ${index + 1}:`, {
      //   id: location.id,
      //   name: location.locationName,
      //   coordinates: location.locationCoordinates,
      //   isAvailable: location.isAvailable
      // });

      if (!location.locationCoordinates) {
        // console.warn(`Location ${location.id} (${location.locationName}) has no coordinates`);
        markersSkipped++;
        return;
      }

      try {
        const coords = this.parseCoordinates(location.locationCoordinates);
        if (coords) {
          // Validate coordinate ranges (roughly UAE bounds)
          if (coords.lat < 22 || coords.lat > 27 || coords.lng < 51 || coords.lng > 57) {
            // console.warn(`Location ${location.id} has coordinates outside UAE bounds:`, coords);
          }

          const markerColor = location.isAvailable ? '#28a745' : '#dc3545'; // Green for available, red for unavailable
          
          const markerIcon = L.divIcon({
            className: 'custom-marker',
            html: `<div style="background-color: ${markerColor}; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3); cursor: pointer;"></div>`,
            iconSize: [20, 20],
            iconAnchor: [10, 10],
          });

          const marker = L.marker([coords.lat, coords.lng], { icon: markerIcon })
            .addTo(this.map)
            .bindPopup(`
              <div>
                <h6>${location.locationName || 'Unknown Location'}</h6>
                <p><strong>Address:</strong> ${location.address || 'N/A'}</p>
                <p><strong>Region:</strong> ${location.region || 'N/A'}</p>
                <p><strong>Status:</strong> ${location.isAvailable ? 'Available' : 'Not Available'}</p>
              </div>
            `)
            .on('click', () => {
              this.onMapLocationClick(location);
            });

          (marker as any).locationId = location.id; // Associate location ID with marker
          this.markers.push(marker);
          markersAdded++;
          // console.log(`Added marker for location ${location.id} at coordinates:`, coords);
        } else {
          // console.error(`Failed to parse coordinates for location ${location.id}:`, location.locationCoordinates);
          markersSkipped++;
        }
      } catch (error) {
        // console.error(`Error processing location ${location.id}:`, error);
        markersSkipped++;
      }
    });

    // console.log(`Markers summary: ${markersAdded} added, ${markersSkipped} skipped`);
    
    if (markersAdded === 0) {
      this.toastr.warning('No valid locations could be displayed on the map');
    } else {
      this.toastr.success(`${markersAdded} locations loaded on the map`);
      
      // Fit map to show all markers if we have any
      if (this.markers.length > 0) {
        const group = new L.FeatureGroup(this.markers);
        this.map.fitBounds(group.getBounds().pad(0.1));
      }
    }
  }

  centerMapOnLocation(coordinates: string, locationId: number): void {
    if (!this.map || !coordinates) {
      // console.warn('Map not initialized or no coordinates provided for centering.');
      return;
    }

    const coords = this.parseCoordinates(coordinates);
    if (coords) {
      // console.log(`Centering map on [${coords.lat}, ${coords.lng}]`);
      this.map.setView([coords.lat, coords.lng], 15); // Zoom level 15 for a closer view

      // Find and open the popup for the selected marker
      const markerToOpen = this.markers.find(m => (m as any).locationId === locationId);

      if (markerToOpen) {
        markerToOpen.openPopup();
      }
    } else {
      // console.error('Could not parse coordinates for map centering:', coordinates);
    }
  }

  parseCoordinates(coordinates: string): { lat: number; lng: number } | null {
    if (!coordinates || coordinates.trim() === '') {
      // console.warn('Empty coordinates provided');
      return null;
    }

    // console.log('Parsing coordinates:', coordinates);

    try {
      // Try parsing as JSON first (e.g., '{"lat": 25.2048, "lng": 55.2708}')
      const coords = JSON.parse(coordinates);
      if (coords && typeof coords.lat === 'number' && typeof coords.lng === 'number') {
        // console.log('Parsed as JSON:', coords);
        return { lat: coords.lat, lng: coords.lng };
      }
      if (coords && typeof coords.latitude === 'number' && typeof coords.longitude === 'number') {
        // console.log('Parsed as JSON with latitude/longitude:', coords);
        return { lat: coords.latitude, lng: coords.longitude };
      }
    } catch (e) {
      // console.log('Not valid JSON, trying other formats');
    }

    try {
      // Try parsing as comma-separated values (e.g., '25.2048,55.2708')
      if (coordinates.includes(',')) {
        const [lat, lng] = coordinates.split(',').map(s => parseFloat(s.trim()));
        if (!isNaN(lat) && !isNaN(lng)) {
          // console.log('Parsed as comma-separated:', { lat, lng });
          return { lat, lng };
        }
      }

      // Try parsing as slash-separated values (e.g., '25.2048/55.2708')
      if (coordinates.includes('/')) {
        const [lat, lng] = coordinates.split('/').map(s => parseFloat(s.trim()));
        if (!isNaN(lat) && !isNaN(lng)) {
          // console.log('Parsed as slash-separated:', { lat, lng });
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
            // console.log('Parsed as space-separated:', { lat, lng });
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
    // console.log('Map location clicked:', location);
    
    // Set the selection source and clear dropdown selection
    this.lastSelectionSource = 'map';
    this.clearDropdownSelection();
    
    // Always check availability even if the location appears available on the map
    this.checkLocationAvailabilityAndLoad(location.id, 'map');
  }

  // Partners management
  addPartner(): void {
    if (this.partnersForm.valid) {
      const partnerType = this.partnersForm.get('type')?.value;
      const partnerAttachments = this.getPartnerAttachmentsForType(partnerType);
      
      const newPartner: FastingTentPartnerDto = {
        ...this.partnersForm.value,
        mainApplyServiceId: 0, // Will be set by backend
        attachments: partnerAttachments
      };
      
      this.partners.push(newPartner);
      this.partnersForm.reset();
      this.showPartnerAttachments = false;
      this.toastr.success(this.translate.instant('SUCCESS.PARTNER_ADDED'));
    } else {
      this.toastr.error(this.translate.instant('VALIDATION.PLEASE_COMPLETE_REQUIRED_FIELDS'));
    }
  }

  removePartner(index: number): void {
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
      // console.log('[onPartnerTypeChange] Showing attachments for partner type:', selectedPartnerType);
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
    // console.log('[handlePartnerFileUpload] file:', file, 'configId:', configId, 'partnerType:', partnerType);
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
        // console.log('[handlePartnerFileUpload] Updated partner attachment:', this.partnerAttachments[partnerType][attachmentIndex]);
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
    // console.log('[handleFileUpload] file:', file, 'configId:', configId); // DEBUG
    if (!this.validateFile(file)) {
      return;
    }

    this.selectedFiles[configId] = file;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      this.filePreviews[configId] = e.target?.result as string;
      
      const attachmentIndex = this.attachments.findIndex(a => a.attConfigID === configId);
      if (attachmentIndex !== -1) {
        this.attachments[attachmentIndex] = {
          ...this.attachments[attachmentIndex],
          fileBase64: (e.target?.result as string).split(',')[1],
          fileName: file.name
        };
        // console.log('[handleFileUpload] Updated attachment:', this.attachments[attachmentIndex]); // DEBUG
      } else {
        // console.warn('[handleFileUpload] No attachment found for configId:', configId); // DEBUG
      }
      
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
    
    // Trigger change detection for submit button state
    this.cdr.detectChanges();
  }

  getAttachmentName(config: AttachmentsConfigDto): string {
    const currentLang = this.translationService.currentLang;
    return currentLang === 'ar' ? (config.name || '') : (config.nameEn || config.name || '');
  }

  // Form submission
  onSubmit(): void {
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
      const dateDetailsData = this.dateDetailsForm.getRawValue();
      const supervisorData = this.supervisorForm.getRawValue();
      const currentUser = this.authService.getCurrentUser();
      
      if (!currentUser?.id) {
        this.toastr.error(this.translate.instant('ERRORS.USER_NOT_FOUND'));
        this.isSaving = false;
        return;
      }
      
      const validAttachments = this.attachments.filter(a => a.fileBase64 && a.fileName);
      // console.log('[onSubmit] All attachments:', this.attachments); // DEBUG
      // console.log('[onSubmit] Valid attachments:', validAttachments); // DEBUG
      const createDto: CreateFastingTentRequestDto = {
        mainApplyServiceId: 0,
        userId: currentUser.id,
        locationType: this.getSelectedLocationTypeName(),
        locationTypeId: formData.tentLocationType,
        ownerName: formData.ownerName,
        regionName: formData.regionName,
        streetName: formData.streetName,
        groundNo: formData.groundNo,
        address: formData.address,
        startDate: dateDetailsData.startDate,
        endDate: dateDetailsData.endDate,
        notes: formData.notes,
        locationId: formData.locationId,
        isConsultantFromAjman: dateDetailsData.consultantFromAjman,
        isConsultantApprovedFromPolice: dateDetailsData.consultantApprovedByPolice,
        supervisorName: supervisorData.supervisorName,
        jopTitle: supervisorData.jopTitle,
        supervisorMobile: supervisorData.supervisorMobile,
        tentIsSetUp: dateDetailsData.tentIsSetUp,
        tentDate: dateDetailsData.tentDate || null,
        serviceType: ServiceType.TentPermission, // Always send as enum value
        distributionSiteCoordinators: formData.distributionSiteCoordinators,
        attachments: validAttachments,
        partners: this.partners,
      };

      const sub = this.fastingTentRequestService.create(createDto).subscribe({
        next: (response) => {
          this.toastr.success(this.translate.instant('SUCCESS.FASTING_TENT_REQUEST_CREATED'));
          this.router.navigate(['/services']);
          this.isSaving = false;
        },
        error: (error) => {
          // console.error('Error creating fasting tent request:', error);
          this.toastr.error(this.translate.instant('ERRORS.FAILED_CREATE_FASTING_TENT_REQUEST'));
          this.isSaving = false;
        }
      });
      this.subscriptions.push(sub);
      
    } catch (error) {
      // console.error('Error in onSubmit:', error);
      this.toastr.error(this.translate.instant('ERRORS.FAILED_CREATE_FASTING_TENT_REQUEST'));
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
      const attachment = this.attachments.find(a => a.attConfigID === config.id);
      if (!attachment || !attachment.fileBase64 || !attachment.fileName) {
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
    
    return this.validateMainInfoTab(showToastr) && this.validateDateDetailsTab(showToastr) && this.validateSupervisorTab(showToastr) && this.validatePartnersTab(showToastr) && this.validateAttachments(showToastr);
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
        return this.validateDateDetailsTab();
      case 3:
        return this.validateSupervisorTab();
      case 4:
        return this.validatePartnersTab();
      case 5:
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
        isValid = this.validateDateDetailsTab();
        if (!isValid) {
          if (!this.dateDetailsForm.get('startDate')?.value) {
            errors.push('Start Date is required');
          }
          if (!this.dateDetailsForm.get('endDate')?.value) {
            errors.push('End Date is required');
          }
        }
        break;
      case 3:
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
            const attachment = this.attachments.find(a => a.attConfigID === config.id);
            if (!attachment || !attachment.fileBase64) {
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
    // console.log('=== TAB VALIDATION STATUS ===');
    // for (let i = 1; i <= this.totalTabs; i++) {
    //   const status = this.getTabValidationStatus(i);
    //   console.log(`Tab ${i}: ${status.isValid ? '✅ Valid' : '❌ Invalid'}`);
    //   if (!status.isValid && status.errors.length > 0) {
    //     status.errors.forEach(error => console.log(`  - ${error}`));
    //   }
    // }
    // console.log(`Current Tab: ${this.currentTab}`);
    // console.log(`Can Proceed to Next: ${this.canProceedToNext()}`);
    // console.log(`Can Submit: ${this.canSubmit()}`);
    // console.log('===========================');
  }
}
