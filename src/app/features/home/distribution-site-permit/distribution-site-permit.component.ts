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
import * as L from 'leaflet';

import { DistributionSiteRequestService } from '../../../core/services/distribution-site-request.service';
import { AttachmentService } from '../../../core/services/attachments/attachment.service';
import { AuthService } from '../../../core/services/auth.service';
import { TranslationService } from '../../../core/services/translation.service';

import {
  CreateDistributionSiteRequestDto,
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
  totalTabs: number = 5;
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

  // Partners data
  partners: DistributionSitePartnerDto[] = [];

  // Attachments data
  attachmentConfigs: AttachmentsConfigDto[] = [];
  attachments: DistributionSiteAttachmentDto[] = [];
  selectedFiles: { [key: number]: File } = {};
  filePreviews: { [key: number]: string } = {};
  isDragOver = false;

  // Partner attachments data
  partnerAttachmentConfigs: AttachmentsConfigDto[] = [];
  partnerAttachments: { [partnerType: number]: DistributionSiteAttachmentDto[] } = {};
  partnerSelectedFiles: { [partnerType: number]: { [configId: number]: File } } = {};
  partnerFilePreviews: { [partnerType: number]: { [configId: number]: string } } = {};
  showPartnerAttachments = false;

  private subscriptions: Subscription[] = [];

  constructor(
    private fb: FormBuilder,
    private distributionSiteRequestService: DistributionSiteRequestService,
    private attachmentService: AttachmentService,
    private authService: AuthService,
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
    this.initializeMap();
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
      locationType: ['', Validators.required],
      locationTypeId: [null, Validators.required],
      ownerName: [''],
      regionName: ['', Validators.required],
      streetName: ['', ],
      groundNo: [''],
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
      name: [''],
      type: [null],
      licenseIssuer: [''],
      licenseExpiryDate: [''],
      licenseNumber: [''],
      contactDetails: [''],
    });

    // Subscribe to form changes
    this.setupFormValueChanges();
  }

  initializePartnerTypes(): void {
    this.partnerTypes = this.distributionSiteRequestService.getPartnerTypes();
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
          this.toastr.error(this.translate.instant('FASTING_TENT.END_DATE_BEFORE_START_MESSAGE'));
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
            
            // Log each item to see the structure
            this.distributionLocationTypes.forEach((item, index) => {
            });
          } else if (Array.isArray(locationTypes) && locationTypes.length === 0) {
            this.distributionLocationTypes = [];
          } else {
            this.distributionLocationTypes = [];
          }
          
          this.regionOptions = (regions && 'results' in regions) ? regions.results : [];
          
          this.isLoading = false;
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

  loadAttachmentConfigs(): void {
    this.attachmentService.getAttachmentsConfigByType(
      AttachmentsConfigType.RequestADistributionSitePermit,
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
      }
    });
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
      this.visitedTabs.add(tab);
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
        this.validateDateDetailsTab(true);
        break;
      case 3:
        this.validateSupervisorInfoTab(true);
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
        return this.validateSupervisorInfoTab();
      case 4:
        return this.validatePartnersTab(); // Validate partners and their attachments
      case 5:
        return this.validateAttachmentsTab(); // Updated to use specific attachment validation
      default:
        return true;
    }
  }

  validateMainInfoTab(showToastr = false): boolean {
    // Check specific fields for tab 1 - only fields that belong to this tab
    const requiredFieldsForTab1 = ['locationTypeId', 'regionName', 'streetName'];
    
    let isValid = true;
    
    for (const fieldName of requiredFieldsForTab1) {
      const control = this.mainInfoForm.get(fieldName);
      if (!control?.value || (control.value === null || control.value === '')) {
        if (showToastr) {
          this.toastr.error(this.translate.instant('VALIDATION.REQUIRED_FIELD') + `: ${fieldName}`);
        }
        isValid = false;
      }
    }
    
    // Check if location coordinates are selected
    if (!this.selectedCoordinates) {
      if (showToastr) {
        this.toastr.error(this.translate.instant('VALIDATION.LOCATION_REQUIRED'));
      }
      isValid = false;
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
    // Only consider the Partners tab completed if the user has actually visited it
    // or if there are actual partners added
    if (!this.visitedTabs.has(4) && this.partners.length === 0) {
      return false;
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
      if (!this.selectedFiles[config.id!]) {
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
        this.map.remove();
        this.map = null;
      }

      // Default to Dubai coordinates (UAE)
      const defaultLat = 25.2048;
      const defaultLng = 55.2708;

      this.map = L.map('distributionMap').setView([defaultLat, defaultLng], 10);

      // Add tile layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
        minZoom: 5,
      }).addTo(this.map);

      // Add click handler for map
      this.map.on('click', (e: any) => {
        this.onMapClick(e);
      });

      // Force map refresh after a short delay
      setTimeout(() => {
        if (this.map) {
          this.map.invalidateSize();
        }
      }, 1000);

    } catch (error) {
    }
  }

  onMapClick(e: any): void {
    const lat = e.latlng.lat;
    const lng = e.latlng.lng;
    
    // Clear existing markers
    this.markers.forEach(marker => {
      if (marker && marker.remove) {
        marker.remove();
      }
    });
    this.markers = [];

    // Add new marker
    const marker = L.marker([lat, lng], { icon: this.customIcon })
      .addTo(this.map)
      .bindPopup(`Selected Location<br>Lat: ${lat.toFixed(6)}<br>Lng: ${lng.toFixed(6)}`)
      .openPopup();

    this.markers.push(marker);

    // Update coordinates in form
    this.selectedCoordinates = `${lat}/${lng}`;
    this.mainInfoForm.patchValue({
      distributionSiteCoordinators: this.selectedCoordinates,
    });

    this.toastr.success(this.translate.instant('SUCCESS.LOCATION_SELECTED'));
  }

  // Partners management
  addPartner(): void {
    if (this.partnersForm.valid) {
      const partnerType = this.partnersForm.get('type')?.value;
      const partnerAttachments = this.getPartnerAttachmentsForType(partnerType);
      
      const newPartner: DistributionSitePartnerDto = {
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
      } else {
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
      
      const validAttachments = this.attachments.filter(a => a.fileBase64 && a.fileName);
      
      const createDto: CreateDistributionSiteRequestDto = {
        mainApplyServiceId: 0,
        userId: currentUser.id,
        locationType: this.getSelectedLocationTypeName(),
        locationTypeId: formData.locationTypeId,
        ownerName: formData.ownerName,
        regionName: formData.regionName,
        streetName: formData.streetName,
        groundNo: formData.groundNo,
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
      };

      const sub = this.distributionSiteRequestService.create(createDto).subscribe({
        next: (response) => {
          this.toastr.success(this.translate.instant('SUCCESS.DISTRIBUTION_SITE_REQUEST_CREATED'));
          this.router.navigate(['/services']);
          this.isSaving = false;
        },
        error: (error) => {
          console.error('Error creating distribution site request:', error);
          
          // Check if it's a business error with a specific reason
          if (error.error && error.error.reason) {
            // Show the specific reason from the API response
            this.toastr.error(error.error.reason);
          } else {
            // Fallback to generic error message
            this.toastr.error(this.translate.instant('ERRORS.FAILED_CREATE_DISTRIBUTION_SITE_REQUEST'));
          }
          
          this.isSaving = false;
        }
      });
      this.subscriptions.push(sub);
      
    } catch (error: any) {
      console.error('Error in onSubmit:', error);
      
      // Check if it's a business error with a specific reason
      if (error.error && error.error.reason) {
        // Show the specific reason from the API response
        this.toastr.error(error.error.reason);
      } else {
        // Fallback to generic error message
        this.toastr.error(this.translate.instant('ERRORS.FAILED_CREATE_DISTRIBUTION_SITE_REQUEST'));
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
      this.validateDateDetailsTab(showToastr) &&
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
    
    // Handle both direct ID and event object
    let id: number;
    if (typeof selectedId === 'object' && selectedId?.id) {
      id = selectedId.id;
    } else if (typeof selectedId === 'number') {
      id = selectedId;
    } else {
      return;
    }
    
    const selected = this.distributionLocationTypes.find(item => item.id === id);
    
    if (selected) {
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
      
      this.mainInfoForm.patchValue({
        locationType: locationTypeText,
        locationTypeId: id
      });
      
      // Force change detection
      this.cdr.detectChanges();
      
    } else {
      this.mainInfoForm.patchValue({
        locationType: '',
        locationTypeId: null
      });
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
        return this.validateDateDetailsTab();
      case 3:
        return this.validateSupervisorInfoTab();
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
