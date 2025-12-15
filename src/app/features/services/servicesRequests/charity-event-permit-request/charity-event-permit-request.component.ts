import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AttachmentService } from '../../../../core/services/attachments/attachment.service';
import { AuthService } from '../../../../core/services/auth.service';
import { TranslationService } from '../../../../core/services/translation.service';
import { ToastrService } from 'ngx-toastr';
import { Router, ActivatedRoute } from '@angular/router';
import { AttachmentsConfigDto, AttachmentsConfigType } from '../../../../core/dtos/attachments/attachments-config.dto';
import { forkJoin, map, Observable, Subscription } from 'rxjs';
import { PlaintReasonsDto, RequestPlaintAttachmentDto, RequestPlaintEvidenceDto, RequestPlaintJustificationDto, RequestPlaintReasonDto, Select2Item, UserEntityDto } from '../../../../core/dtos/RequestPlaint/request-plaint.dto';
import { CharityEventPermitRequestService } from '../../../../core/services/charity-event-permit-request.service';
import { arrayMinLength, dateRangeValidator } from '../../../../shared/customValidators';
import { RequestAdvertisement } from '../../../../core/dtos/charity-event-permit/charity-event-permit.dto';
import { FastingTentAttachmentDto, FastingTentPartnerDto, PartnerType } from '../../../../core/dtos/FastingTentRequest/fasting-tent-request.dto';
import { notBeforeTodayFor } from '../../../../shared/customValidators/date.validators';
import { MainApplyService } from '../../../../core/services/mainApplyService/mainApplyService.service';
import { SpinnerService } from '../../../../core/services/spinner.service';
import { PartnerService } from '../../../../core/services/partner.service';
import { FiltermainApplyServiceByIdDto, mainApplyServiceDto } from '../../../../core/dtos/mainApplyService/mainApplyService.dto';
import { AttachmentDto, UpdateAttachmentBase64Dto, AttachmentBase64Dto } from '../../../../core/dtos/attachments/attachment.dto';
import { environment } from '../../../../../environments/environment';

type AttachmentState = {
  configs: AttachmentsConfigDto[];
  items: RequestPlaintAttachmentDto[];
  selected: Record<number, File>;
  previews: Record<number, string>;
  sub?: Subscription;
};




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
  len = (a: readonly unknown[] | null | undefined) => a?.length ?? 0;
  private attachmentStates = new Map<AttachmentsConfigType, AttachmentState>();

  // ============== helpers ==============
  private ensureState(type: AttachmentsConfigType): AttachmentState {
    if (!this.attachmentStates.has(type)) {
      this.attachmentStates.set(type, {
        configs: [],
        items: [],
        selected: {},
        previews: {},
        sub: undefined
      });
    }
    return this.attachmentStates.get(type)!;
  }

  public AttachmentsConfigType = AttachmentsConfigType;

  public state(type: AttachmentsConfigType): AttachmentState {
    return this.ensureState(type);
  }

  public hasSelected(type: AttachmentsConfigType, id: number): boolean {
    const state = this.ensureState(type);
    // Check if file is selected OR if there's an existing attachment
    if (type === AttachmentsConfigType.DeclarationOfCharityEffectiveness) {
      return !!state.selected[id] || !!this.existingAttachments[id];
    }
    // For advertisement attachments, check if there's an existing attachment for current advertisement
    return !!state.selected[id];
  }

  public selectedFileName(type: AttachmentsConfigType, id: number): string | null {
    const state = this.ensureState(type);
    // If file is selected, return its name
    if (state.selected[id]) {
      return state.selected[id]?.name ?? null;
    }
    // If there's an existing attachment, return its file name from path
    if (type === AttachmentsConfigType.DeclarationOfCharityEffectiveness && this.existingAttachments[id]) {
      return this.getFileNameFromPath(this.existingAttachments[id].imgPath);
    }
    return null;
  }

  public getPreview(type: AttachmentsConfigType, id: number): string | undefined {
    const state = this.ensureState(type);
    // If there's a selected file preview, return it
    if (state.previews[id]) {
      return state.previews[id];
    }
    // If there's an existing attachment, return its preview URL
    if (type === AttachmentsConfigType.DeclarationOfCharityEffectiveness && this.existingAttachments[id]) {
      const attachment = this.existingAttachments[id];
      if (attachment.imgPath) {
        const isImage = this.isImageFile(attachment.imgPath);
        return isImage 
          ? this.constructImageUrl(attachment.imgPath)
          : undefined;
      }
    }
    return undefined;
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
   * Construct full image URL from path
   */
  private constructImageUrl(path: string): string {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }
    const baseUrl = environment.apiBaseUrl.replace('/api', '');
    return `${baseUrl}${path}`;
  }



  currentStep: number = 1;
  totalSteps: number = 4;

  // Forms
  firstStepForm!: FormGroup;
  submitted = false;
  isLoading = false;
  isSaving = false;
  isFormInitialized = false;

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


  // File upload
  selectedFiles: { [key: number]: File } = {};
  filePreviews: { [key: number]: string } = {};
  isDragOver = false;
  uploadProgress = 0;

  private subscriptions: Subscription[] = [];
  // new probs
  advertisementType: any[] = [];
  advertisementTargetType: any[] = [];
  advertisementMethodType: any[] = [];
  donationChannelsLookup: any[] = [];
  partnerTypes: Array<{ id: PartnerType; label: string }> = [];

  partners: any[] = [];
  partnerForm!: FormGroup;
  adsStepIndex = 3;
  advertForm!: FormGroup;
  requestAdvertisements: RequestAdvertisement[] = [];
  adLocations: string[] = [];
  newLocationInput = '';
  languages = [
    { id: 'ar', text: 'العربية' },
    { id: 'en', text: 'English' },
  ];
  service: any;
  showPartnerAttachments = false;

  // Update mode properties
  mainApplyServiceId: number | null = null;
  loadformData: mainApplyServiceDto | null = null;
  
  // Existing data for update mode
  existingAttachments: { [key: number]: AttachmentDto } = {}; // Existing attachments from API (main request)
  existingAdvertisementAttachments: { [adIndex: number]: { [key: number]: AttachmentDto } } = {}; // Existing attachments for each advertisement
  attachmentsToDelete: { [key: number]: number } = {}; // Track attachments marked for deletion (main request)
  advertisementAttachmentsToDelete: { [adIndex: number]: { [key: number]: number } } = {}; // Track attachments marked for deletion for each advertisement
  
  existingPartners: any[] = []; // Partners loaded from API
  partnersToDelete: number[] = []; // Partner IDs to delete
  
  existingAdvertisements: RequestAdvertisement[] = []; // Advertisements loaded from API
  advertisementsToDelete: number[] = []; // Advertisement IDs to delete
  
  pendingFormData: any = null; // Store form data to patch after dropdowns are loaded
  pendingAttachmentsData: any[] = []; // Store attachments data to load after configs are loaded
  pendingAttachmentsMasterId: number | null = null; // Store masterId to load attachments from API after configs are loaded


  constructor(
    private fb: FormBuilder,
    private attachmentService: AttachmentService,
    private authService: AuthService,
    public translationService: TranslationService,
    private translate: TranslateService,
    private toastr: ToastrService,
    private router: Router,
    private route: ActivatedRoute,
    private _CharityEventPermitRequestService: CharityEventPermitRequestService,
    private cdr: ChangeDetectorRef,
    private mainApplyService: MainApplyService,
    private spinnerService: SpinnerService,
    private partnerService: PartnerService
  ) {
    this.initializeForm();
    this.initPartnerForm();
    this.initAdvertisementForm();
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
    }

    // أول تحميل
    this.setPartnerTypes();

    // تحديث عند تغيير اللغة
    const langSub = this.translate.onLangChange.subscribe(() => {
      this.setPartnerTypes();
    });
    this.subscriptions.push(langSub);
  }


  private setPartnerTypes(): void {
    const lang = this.translate.currentLang || localStorage.getItem('currentLang') || 'en';
    const isArabic = lang === 'ar';

    this.partnerTypes = [
      { id: PartnerType.Person, label: isArabic ? 'فرد' : 'Person' },
      { id: PartnerType.Government, label: isArabic ? 'جهة حكومية' : 'Government' },
      { id: PartnerType.Supplier, label: isArabic ? 'مورد' : 'Supplier' },
      { id: PartnerType.Company, label: isArabic ? 'شركة' : 'Company' },
    ];
  }



  private clearAllToasts(): void {
    this.toastr.clear();
  }

  private showValidationToast(message: string): void {
    if (this.isFormInitialized && (this.submitted || this.currentStep > 1)) {
      this.toastr.error(message);
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.attachmentStates.forEach(s => s.sub?.unsubscribe());
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
        telephone1: this.fb.control('', { validators: [Validators.required, this.uaeMobileValidator.bind(this)], nonNullable: true }),
        telephone2: this.fb.control('', { validators: [this.uaeMobileValidator.bind(this)] }),
        email: this.fb.control<string | null>(null, { validators: [Validators.email] }),
        advertisementType: this.fb.control<1 | 2>(1, { validators: [Validators.required], nonNullable: true }),
        notes: this.fb.control<string | null>(null),
        donationCollectionChannelIds: this.fb.control<number[]>([], {
          validators: [arrayMinLength(1)],
          nonNullable: true,
        }),
      },
      { validators: [dateRangeValidator, notBeforeTodayFor('startDate')] }
    );

  }

  initAdvertisementForm(): void {
    const currentUser = this.authService.getCurrentUser();
    this.advertForm = this.fb.group(
      {

        parentId: this.fb.control<number | null>(0),
        mainApplyServiceId: this.fb.control<number | null>(0),
        requestNo: this.fb.control<number | null>(0),

        serviceType: this.fb.control<number | null>(1, { validators: [Validators.required] }),
        workFlowServiceType: this.fb.control<number | null>(1, { validators: [Validators.required] }),

        requestDate: this.fb.control(new Date().toISOString(), { validators: [Validators.required], nonNullable: true }),
        userId: this.fb.control(currentUser?.id ?? '', { validators: [Validators.required], nonNullable: true }),

        // provider: this.fb.control<string | null>(null),

        adTitle: this.fb.control('', { validators: [Validators.required], nonNullable: true }),
        // adLang: this.fb.control<'ar' | 'en'>('ar', { validators: [Validators.required], nonNullable: true }),

        startDate: this.fb.control('', { validators: [Validators.required], nonNullable: true }),
        endDate: this.fb.control('', { validators: [Validators.required], nonNullable: true }),

        // mobile: this.fb.control<string | null>(null),
        // supervisorName: this.fb.control<string | null>(null),
        // fax: this.fb.control<string | null>(null),
        // eMail: this.fb.control<string | null>(null, [Validators.email]),

        targetedAmount: this.fb.control<number | null>(null),


        // newAd: this.fb.control<boolean | null>(true),
        // reNewAd: this.fb.control<boolean | null>(false),
        // oldPermNumber: this.fb.control<string | null>(null),

        requestEventPermitId: this.fb.control<number | null>(null),


        targetTypeIds: this.fb.control<number[]>([], { validators: [arrayMinLength(1)], nonNullable: true }),
        adMethodIds: this.fb.control<number[]>([], { validators: [arrayMinLength(1)], nonNullable: true }),
        notes: this.fb.control<string | null>(null),
      },
      {
        validators: [dateRangeValidator, this.renewRequiresOldPermValidator,
          notBeforeTodayFor('startDate')]
      }
    );
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
        // partnerTypes: this._CharityEventPermitRequestService.getPartners(),
      }).subscribe({
        next: (res: any) => {
          this.advertisementType = res.advertisementType;
          // this.partnerTypes = res.partnerTypes?.data;

          // Transform select2 options to use 'text' property for ng-select
          const isArabic = this.translationService.currentLang === 'ar';
          
          this.advertisementMethodType = res.advertisementMethodType?.results?.map((item: any) => ({
            id: item.id,
            text: isArabic ? (item.nameAr || item.text) : (item.nameEn || item.text)
          })) || [];
          
          this.advertisementTargetType = res.advertisementTargetType?.results?.map((item: any) => ({
            id: item.id,
            text: isArabic ? (item.nameAr || item.text) : (item.nameEn || item.text)
          })) || [];
          
          this.donationChannelsLookup = res.donationChannelsLookup.results?.length 
            ? res.donationChannelsLookup.results.map((item: any) => ({
                id: Number(item.id), // Convert string ID to number
                text: item.text || (isArabic ? item.nameAr : item.nameEn)
              }))
            : [
                { id: 1, text: 'SMS' },
                { id: 2, text: this.translate.instant('CHARITY_EVENT.BANK_TRANSFER') || 'Bank Transfer' },
                { id: 3, text: 'POS' },
              ];

          this.isLoading = false;
          this.isFormInitialized = true; // Mark form as fully initialized

          // this.loadAttachmentConfigs();
          this.loadAttachmentConfigs(AttachmentsConfigType.DeclarationOfCharityEffectiveness);
          this.loadAttachmentConfigs(AttachmentsConfigType.RequestAnEventAnnouncementOrDonationCampaign);
          this.loadAttachmentConfigs(AttachmentsConfigType.Partner);

        },
        error: () => {
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
   * Load initial data for update mode (without resetting form data)
   */
  private loadInitialDataForUpdate(): void {
    // Note: isLoading and spinner are already set in loadRequestDetails
    // Don't set them again here to avoid double-showing spinner
    
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser?.id) {
      this.toastr.error(this.translate.instant('ERRORS.USER_NOT_FOUND'));
      this.isLoading = false;
      this.spinnerService.hide();
      this.router.navigate(['/login']);
      return;
    }

    forkJoin({
      advertisementMethodType: this._CharityEventPermitRequestService.getAdvertisementMethodType({}),
      advertisementTargetType: this._CharityEventPermitRequestService.getAdvertisementTargetType({}),
      advertisementType: this._CharityEventPermitRequestService.getAdvertisementType(),
      donationChannelsLookup: this._CharityEventPermitRequestService.getDonationCollectionChannel({}),
      mainPermitConfigs: this.attachmentService.getAttachmentsConfigByType(
        AttachmentsConfigType.DeclarationOfCharityEffectiveness,
        true
      ),
      advertisementConfigs: this.attachmentService.getAttachmentsConfigByType(
        AttachmentsConfigType.RequestAnEventAnnouncementOrDonationCampaign,
        true
      ),
      partnerConfigs: this.attachmentService.getAttachmentsConfigByType(
        AttachmentsConfigType.Partner,
        true
      ),
    }).subscribe({
      next: (res: any) => {
        this.advertisementType = res.advertisementType;
        
        // Transform select2 options to use 'text' property for ng-select
        const isArabic = this.translationService.currentLang === 'ar';
        
        this.advertisementMethodType = res.advertisementMethodType?.results?.map((item: any) => ({
          id: item.id,
          text: isArabic ? (item.nameAr || item.text) : (item.nameEn || item.text)
        })) || [];
        
        this.advertisementTargetType = res.advertisementTargetType?.results?.map((item: any) => ({
          id: item.id,
          text: isArabic ? (item.nameAr || item.text) : (item.nameEn || item.text)
        })) || [];
        
        this.donationChannelsLookup = res.donationChannelsLookup.results?.length 
          ? res.donationChannelsLookup.results.map((item: any) => ({
              id: Number(item.id), // Convert string ID to number
              text: item.text || (isArabic ? item.nameAr : item.nameEn)
            }))
          : [
              { id: 1, text: 'SMS' },
              { id: 2, text: this.translate.instant('CHARITY_EVENT.BANK_TRANSFER') || 'Bank Transfer' },
              { id: 3, text: 'POS' },
            ];

        // Initialize attachment states with configs
        const mainState = this.ensureState(AttachmentsConfigType.DeclarationOfCharityEffectiveness);
        mainState.configs = res.mainPermitConfigs || [];
        mainState.items = mainState.configs.map((cfg: any) => ({
          fileBase64: '',
          fileName: '',
          masterId: 0,
          attConfigID: cfg.id!,
        }));

        const adState = this.ensureState(AttachmentsConfigType.RequestAnEventAnnouncementOrDonationCampaign);
        adState.configs = res.advertisementConfigs || [];
        adState.items = adState.configs.map((cfg: any) => ({
          fileBase64: '',
          fileName: '',
          masterId: 0,
          attConfigID: cfg.id!,
        }));

        const partnerState = this.ensureState(AttachmentsConfigType.Partner);
        partnerState.configs = res.partnerConfigs || [];
        partnerState.items = partnerState.configs.map((cfg: any) => ({
          fileBase64: '',
          fileName: '',
          masterId: 0,
          attConfigID: cfg.id!,
        }));

        // Patch form data after dropdowns are loaded
        if (this.pendingFormData) {
          setTimeout(() => {
            this.firstStepForm.patchValue(this.pendingFormData, { emitEvent: false });
            this.pendingFormData = null;
            this.cdr.detectChanges();
          }, 100);
        }

        // Load attachments after configs are loaded
        if (this.pendingAttachmentsData && this.pendingAttachmentsData.length > 0) {
          setTimeout(() => {
            this.loadExistingAttachments(this.pendingAttachmentsData);
            this.pendingAttachmentsData = [];
            this.cdr.detectChanges();
          }, 200);
        } else if (this.pendingAttachmentsMasterId) {
          setTimeout(() => {
            this.loadAttachmentsFromAPI(this.pendingAttachmentsMasterId);
            this.pendingAttachmentsMasterId = null;
            this.cdr.detectChanges();
          }, 200);
        }

        this.isLoading = false;
        this.isFormInitialized = true;
        this.spinnerService.hide();
      },
      error: (error: any) => {
        this.toastr.error(this.translate.instant('ERRORS.FAILED_LOAD_DATA'));
        this.isLoading = false;
        this.isFormInitialized = true;
        this.spinnerService.hide();
      },
    });
  }

  /**
   * Load request details from API for update mode
   */
  private loadRequestDetails(id: string): void {
    this.isLoading = true;
    this.spinnerService.show();

    const params: FiltermainApplyServiceByIdDto = { id };
    const sub = this.mainApplyService.getDetailById(params).subscribe({
      next: (response: any) => {
        this.loadformData = response;

        // Extract charity event permit data
        const charityEventPermit = response.charityEventPermit;
        if (charityEventPermit) {
          this.mainApplyServiceId = response.id || null;
          const charityEventPermitId = charityEventPermit.id || null; // Store charityEventPermit.id

          // Populate main form
          const toDateString = (date: any) => {
            if (!date) return '';
            let dateObj: Date;
            if (date instanceof Date) {
              dateObj = date;
            } else {
              dateObj = new Date(date);
            }
            // Format as YYYY-MM-DDTHH:mm for datetime-local input
            const year = dateObj.getFullYear();
            const month = String(dateObj.getMonth() + 1).padStart(2, '0');
            const day = String(dateObj.getDate()).padStart(2, '0');
            const hours = String(dateObj.getHours()).padStart(2, '0');
            const minutes = String(dateObj.getMinutes()).padStart(2, '0');
            return `${year}-${month}-${day}T${hours}:${minutes}`;
          };

          // Store form data to patch after dropdowns are loaded
          const formDataToPatch = {
            userId: response.userId || '',
            requestDate: toDateString(charityEventPermit.requestDate) || new Date().toISOString(),
            eventName: charityEventPermit.eventName || '',
            eventLocation: charityEventPermit.eventLocation || '',
            startDate: toDateString(charityEventPermit.startDate) || '',
            endDate: toDateString(charityEventPermit.endDate) || '',
            supervisorName: charityEventPermit.supervisorName || '',
            jopTitle: charityEventPermit.jopTitle || '',
            telephone1: charityEventPermit.telephone1?.replace('971', '') || '',
            telephone2: charityEventPermit.telephone2?.replace('971', '') || null,
            email: charityEventPermit.email || null,
            advertisementType: charityEventPermit.advertisementType || 1,
            notes: charityEventPermit.notes || null,
            donationCollectionChannelIds: charityEventPermit.donationCollectionChannels?.map((c: any) => c.id) || [],
          };
          
          // Store form data for later patching after dropdowns are loaded
          this.pendingFormData = formDataToPatch;

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

          // Load existing advertisements
          if (charityEventPermit.requestAdvertisements && charityEventPermit.requestAdvertisements.length > 0) {
            this.existingAdvertisements = charityEventPermit.requestAdvertisements.map((ad: any, index: number) => {
              // Store existing attachments for this advertisement
              if (ad.attachments && ad.attachments.length > 0) {
                this.existingAdvertisementAttachments[index] = {};
                ad.attachments.forEach((att: any) => {
                  if (att.attConfigID && att.id) {
                    this.existingAdvertisementAttachments[index][att.attConfigID] = {
                      id: att.id,
                      imgPath: att.imgPath,
                      masterId: att.masterId || this.mainApplyServiceId || 0,
                      attConfigID: att.attConfigID,
                      lastModified: att.lastModified ? new Date(att.lastModified) : undefined,
                    };
                  }
                });
              }

              return {
                id: ad.id,
                parentId: ad.parentId || null,
                mainApplyServiceId: ad.mainApplyServiceId || this.mainApplyServiceId || null,
                requestNo: ad.requestNo !== null && ad.requestNo !== undefined ? Number(ad.requestNo) : null,
                serviceType: ad.serviceType || 1,
                workFlowServiceType: ad.workFlowServiceType || 1,
                requestDate: ad.requestDate || new Date().toISOString(),
                provider: ad.provider || null,
                adTitle: ad.adTitle || '',
                adLang: ad.adLang || 'ar',
                startDate: toDateString(ad.startDate) || '',
                endDate: toDateString(ad.endDate) || '',
                mobile: ad.mobile || null,
                supervisorName: ad.supervisorName || null,
                fax: ad.fax || null,
                eMail: ad.eMail || null,
                targetedAmount: ad.targetedAmount || null,
                newAd: ad.newAd || null,
                reNewAd: ad.reNewAd || null,
                oldPermNumber: ad.oldPermNumber || null,
                charityEventPermitId: ad.charityEventPermitId || charityEventPermitId || null, // Add charityEventPermitId
                notes: ad.notes || null,
                attachments: ad.attachments || [],
                requestAdvertisementTargets: ad.requestAdvertisementTargets || [],
                requestAdvertisementAdLocations: ad.requestAdvertisementAdLocations || [],
                requestAdvertisementAdMethods: ad.requestAdvertisementAdMethods || [],
              };
            });
            // Also add to requestAdvertisements array for display
            this.requestAdvertisements = [...this.existingAdvertisements];
            
            // Load advertisement locations
            if (this.requestAdvertisements.length > 0) {
              this.requestAdvertisements.forEach((ad: any) => {
                if (ad.requestAdvertisementAdLocations && ad.requestAdvertisementAdLocations.length > 0) {
                  ad.requestAdvertisementAdLocations.forEach((loc: any) => {
                    if (loc.location && !this.adLocations.includes(loc.location)) {
                      this.adLocations.push(loc.location);
                    }
                  });
                }
              });
            }
          }

          // Store attachments data to load after configs are loaded
          if (response.attachments && response.attachments.length > 0) {
            this.pendingAttachmentsData = response.attachments;
          } else {
            // If no attachments in response, try to load from API using masterId
            this.pendingAttachmentsMasterId = this.mainApplyServiceId;
          }
        }

        // Load initial data for update mode (dropdowns and attachment configs)
        this.loadInitialDataForUpdate();
      },
      error: (error: any) => {
        console.error('Error loading request details:', error);
        this.toastr.error(this.translate.instant('ERRORS.FAILED_LOAD_DATA'));
        this.isLoading = false;
        this.spinnerService.hide();
        this.router.navigate(['/request']);
      },
    });
    this.subscriptions.push(sub);
  }

  /**
   * Load existing attachments from API
   */
  private loadAttachmentsFromAPI(masterId: number | null): void {
    if (!masterId || typeof masterId !== 'number') {
      console.warn('Invalid masterId for loading attachments:', masterId);
      return;
    }

    const masterType = 1; // Main request attachments
    const sub = this.attachmentService.getListByMasterId(masterId, masterType).subscribe({
      next: (attachments: AttachmentDto[]) => {
        this.loadExistingAttachments(attachments);
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading attachments from API:', error);
      },
    });
    this.subscriptions.push(sub);
  }

  /**
   * Load existing attachments into the component state
   */
  private loadExistingAttachments(attachments: AttachmentDto[]): void {
    const mainAttachType = AttachmentsConfigType.DeclarationOfCharityEffectiveness;
    const state = this.ensureState(mainAttachType);

    attachments.forEach((attachment) => {
      if (attachment.attConfigID) {
        this.existingAttachments[attachment.attConfigID] = attachment;

        // Set preview if it's an image
        if (attachment.imgPath && this.isImageFile(attachment.imgPath)) {
          const imageUrl = this.constructImageUrl(attachment.imgPath);
          state.previews[attachment.attConfigID] = imageUrl;
        }
      }
    });

    this.cdr.detectChanges();
  }

  /**
   * Convert file to base64
   */
  private async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove data URL prefix if present
        const base64 = result.includes(',') ? result.split(',')[1] : result;
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /**
   * Remove existing file (mark for deletion)
   */
  removeExistingFile(configId: number): void {
    const attachment = this.existingAttachments[configId];
    if (attachment && attachment.id) {
      // Mark for deletion
      this.attachmentsToDelete[configId] = attachment.id;
      // Remove from existing attachments
      delete this.existingAttachments[configId];
      // Clear preview
      const state = this.ensureState(AttachmentsConfigType.DeclarationOfCharityEffectiveness);
      delete state.previews[configId];
      this.cdr.detectChanges();
    }
  }

  /**
   * Trigger file input click
   */
  triggerFileInput(type: AttachmentsConfigType, configId: number): void {
    const inputId = `file-${type}-${configId}`;
    const input = document.getElementById(inputId) as HTMLInputElement;
    if (input) {
      input.click();
    }
  }

  // start partners
  initPartnerForm(): void {
    this.partnerForm = this.fb.group({
      type: this.fb.control<number | null>(null, { validators: [Validators.required] }),

      // required
      licenseIssuer: this.fb.control('', { validators: [Validators.required, Validators.maxLength(200)], nonNullable: true }),
      licenseExpiryDate: this.fb.control(null, [Validators.maxLength(100)]),
      licenseNumber: this.fb.control('', { validators: [Validators.required], nonNullable: true }),

      // optional
      contactDetails: this.fb.control(null, { validators: [Validators.required] }),
      mainApplyServiceId: this.fb.control<number | null>(null),

      nameEn: ['', [Validators.required, Validators.maxLength(200)]],

      name: ['', [Validators.required, Validators.maxLength(200)]],
      jobRequirementsDetails: [''],
    });
  }


  // addPartner(): void {
  //   this.partnerForm.markAllAsTouched();
  //   if (this.partnerForm.invalid) return;

  //   const v = this.partnerForm.getRawValue();
  //   this.partners.push({
  //     name: v.name!,
  //     type: v.type!,
  //     licenseIssuer: v.licenseIssuer!,
  //     licenseExpiryDate: v.licenseExpiryDate!,
  //     licenseNumber: v.licenseNumber!,
  //     contactDetails: v.contactDetails ?? null,
  //     mainApplyServiceId: v.mainApplyServiceId ?? null,
  //   });

  //   this.partnerForm.reset();
  // } 
  isSupplierOrCompany(type: PartnerType | null | undefined): boolean {
    return type === PartnerType.Supplier || type === PartnerType.Company;
  }

  // addPartner(): void {
  //   this.partnerForm.markAllAsTouched();
  //   if (this.partnerForm.invalid) return;
  //   const partnerAttachType = AttachmentsConfigType.Partner;
  //   if (this.hasMissingRequiredAttachments(partnerAttachType)) {
  //     this.toastr.error(this.translate.instant('VALIDATION.REQUIRED_FIELD'));
  //     return;
  //   }

  //   const v = this.partnerForm.getRawValue();

  //   const partnerAttachments = this.getValidAttachments(partnerAttachType).map(a => ({
  //     ...a,
  //     masterId: a.masterId || Number(v.mainApplyServiceId ?? 0)
  //   }));

  //   this.partners.push({
  //     name: v.name!,
  //     type: v.type!,
  //     licenseIssuer: v.licenseIssuer!,
  //     licenseExpiryDate: v.licenseExpiryDate!,
  //     licenseNumber: v.licenseNumber!,
  //     contactDetails: v.contactDetails ?? null,
  //     mainApplyServiceId: v.mainApplyServiceId ?? null,
  //     attachments: partnerAttachments,
  //   });
  //   this.resetAttachments(partnerAttachType);
  //   this.partnerForm.reset();
  // }


  addPartner(): void {
    this.partnerForm.markAllAsTouched();   // <-- علشان تظهر رسائل الأخطاء
    this.cdr.detectChanges();

    const partnerType: PartnerType | null = this.partnerForm.get('type')?.value ?? null;

    // ====== تحضير قيم الحقول ======
    const name = (this.partnerForm.get('name')?.value ?? '').toString().trim();
    const licenseIssuer = (this.partnerForm.get('licenseIssuer')?.value ?? '').toString().trim();
    const licenseExpiry = (this.partnerForm.get('licenseExpiryDate')?.value ?? '').toString().trim();
    const licenseNumber = (this.partnerForm.get('licenseNumber')?.value ?? '').toString().trim();
    const contactDetails = (this.partnerForm.get('contactDetails')?.value ?? '').toString().trim();
    const nameEn = (this.partnerForm.get('nameEn')?.value ?? '').toString().trim();


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
    if (name.length > 200) {
      this.toastr.error(this.translate.instant('VALIDATION.MAX_LENGTH_EXCEEDED') + `: ${this.translate.instant('FASTING_TENT_REQ.PARTNER_NAME')} (<= 200)`);
      return;
    }

    if (!contactDetails) {
      this.toastr.error(this.translate.instant('VALIDATION.REQUIRED_FIELD') + ': ' + this.translate.instant('PARTNERS.CONTACT_DETAILS'));
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
      // const hasLicenseAttachment =
      //   !!this.partnerSelectedFiles[partnerType]?.[2057] ||
      //   (this.partnerAttachments[partnerType]?.some(a => a.attConfigID === 2057 && a.fileBase64 && a.fileName) ?? false);

      // if (!hasLicenseAttachment) {
      //   const cfg = this.partnerAttachmentConfigs.find(c => c.id === 2057);
      //   const name = cfg ? this.getAttachmentName(cfg) : 'License';
      //   this.toastr.error(this.translate.instant('VALIDATION.ATTACHMENT_REQUIRED') + ': ' + name);
      //   return;
      // }
    }

    // Person ⇒ مرفق الهوية (2056) required
    // if (partnerType === PartnerType.Person) {
    //   const hasIdAttachment =
    //     !!this.partnerSelectedFiles[partnerType]?.[2056] ||
    //     (this.partnerAttachments[partnerType]?.some(a => a.attConfigID === 2056 && a.fileBase64 && a.fileName) ?? false);

    //   if (!hasIdAttachment) {
    //     const cfg = this.partnerAttachmentConfigs.find(c => c.id === 2056);
    //     const name = cfg ? this.getAttachmentName(cfg) : 'ID';
    //     this.toastr.error(this.translate.instant('VALIDATION.ATTACHMENT_REQUIRED') + ': ' + name);
    //     return;
    //   }
    // }


    // ====== submit action 
    const partnerAttachType = AttachmentsConfigType.Partner;
    if (this.hasMissingRequiredAttachments(partnerAttachType)) {
      this.toastr.error(this.translate.instant('VALIDATION.REQUIRED_FIELD'));
      return;
    }
    const v = this.partnerForm.getRawValue();

    const partnerAttachments = this.getValidAttachments(partnerAttachType).map(a => ({
      ...a,
      masterId: a.masterId || Number(v.mainApplyServiceId ?? 0)
    }));

    if (partnerType === PartnerType.Person || partnerType === PartnerType.Supplier || partnerType === PartnerType.Company) {

      if (!partnerAttachments.length) {
        this.toastr.error(this.translate.instant('VALIDATION.ATTACHMENT_REQUIRED'));
        return;
      }
    }


    this.partners.push({
      name: v.name!,
      nameEn: v.nameEn!,

      type: v.type!,
      licenseIssuer: v.licenseIssuer!,
      licenseExpiryDate: v.licenseExpiryDate!,
      licenseNumber: v.licenseNumber!,
      contactDetails: v.contactDetails.toString() ?? null,
      jobRequirementsDetails: v.jobRequirementsDetails ?? null,
      mainApplyServiceId: v.mainApplyServiceId ?? null,
      attachments: partnerAttachments,
    });
    this.resetAttachments(partnerAttachType);
    this.partnerForm.reset();


    this.showPartnerAttachments = false;
    this.toastr.success(this.translate.instant('SUCCESS.PARTNER_ADDED'));

  }

  onPartnerTypeChange(): void {
    const selectedPartnerType = this.partnerForm.get('type')?.value;
    if (selectedPartnerType && (selectedPartnerType === PartnerType.Person || selectedPartnerType === PartnerType.Supplier || selectedPartnerType === PartnerType.Company)) {
      this.showPartnerAttachments = true;
    } else {
      this.showPartnerAttachments = false;
    }

  }
  isPartnerAttachmentAllowed(cfgId: number): boolean {
    const type = this.partnerForm.get('type')?.value;
    return (cfgId === 2056 && type === 1) || (cfgId === 2057 && (type === 3 || type === 4));
  }

  removePartner(i: number): void {
    const partner = this.partners[i];
    // If partner has an id, it's an existing partner - mark for deletion
    if (partner && partner.id) {
      this.partnersToDelete.push(partner.id);
    }
    // Remove from partners array
    this.partners.splice(i, 1);
  }

  getPartnerTypeLabel(id: number): string {
    return this.partnerTypes.find(t => t.id === id)?.label ?? '';
  }


  ////////////////////////////////////////////// start attachment functions

  loadManyAttachmentConfigs(types: AttachmentsConfigType[]): void {
    const calls = types.map(t => this.attachmentService.getAttachmentsConfigByType(t)
      .pipe(map(cfgs => ({ type: t, cfgs: cfgs || [] }))));

    forkJoin(calls).subscribe({
      next: results => {
        results.forEach(({ type, cfgs }) => {
          const s = this.ensureState(type);
          s.configs = cfgs;
          s.items = cfgs.map(cfg => ({
            fileBase64: '',
            fileName: '',
            masterId: 0,
            attConfigID: cfg.id!
          }));
          s.selected = {};
          s.previews = {};
        });
      },
      error: () => {}
    });
  }

  // ============== 
  onFileSelected(event: Event, type: AttachmentsConfigType, configId: number): void {
    const input = event.target as HTMLInputElement;
    const file = input?.files?.[0];
    if (file) this.handleFileUpload(type, configId, file);
  }

  onDragOver(event: DragEvent): void { event.preventDefault(); this.isDragOver = true; }
  onDragLeave(event: DragEvent): void { event.preventDefault(); this.isDragOver = false; }
  onDrop(event: DragEvent, type: AttachmentsConfigType, configId: number): void {
    event.preventDefault();
    this.isDragOver = false;
    const file = event.dataTransfer?.files?.[0];
    if (file) this.handleFileUpload(type, configId, file);
  }


  handleFileUpload(type: AttachmentsConfigType, configId: number, file: File): void {
    if (!this.validateFile(file)) return;

    this.selectedFiles[configId] = file;

    const s = this.ensureState(type);
    s.selected[configId] = file;

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      s.previews[configId] = dataUrl;

      const i = s.items.findIndex(a => a.attConfigID === configId);
      if (i !== -1) {
        s.items[i] = {
          ...s.items[i],
          fileBase64: (dataUrl.split(',')[1] ?? ''),
          fileName: file.name
        };
      }
    };
    reader.readAsDataURL(file);
  }

  // ============== 
  validateFile(file: File): boolean {
    const MAX = 5 * 1024 * 1024;
    const ALLOWED = new Set<string>([
      'image/jpeg', 'image/png', 'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]);

    if (file.size > MAX) { this.toastr.error(this.translate.instant('VALIDATION.FILE_TOO_LARGE')); return false; }

    const typeOk = ALLOWED.has(file.type);
    const extOk = /\.(jpe?g|png|pdf|docx?|DOCX?)$/i.test(file.name);
    if (!typeOk && !extOk) { this.toastr.error(this.translate.instant('VALIDATION.INVALID_FILE_TYPE')); return false; }

    return true;
  }

  removeFile(type: AttachmentsConfigType, configId: number): void {
    const s = this.ensureState(type);
    
    // Check if this is an existing attachment (update mode)
    if (type === AttachmentsConfigType.DeclarationOfCharityEffectiveness && this.existingAttachments[configId]) {
      // Mark existing attachment for deletion
      this.removeExistingFile(configId);
      return;
    }
    
    // Otherwise, remove newly selected file
    delete s.selected[configId];
    delete s.previews[configId];
    delete this.selectedFiles[configId];

    const i = s.items.findIndex(a => a.attConfigID === configId);
    if (i !== -1) {
      s.items[i] = { ...s.items[i], fileBase64: '', fileName: '' };
    }
  }

  // ============== 
  getAttachmentName(type: AttachmentsConfigType, configId: number): string {
    const s = this.ensureState(type);
    const cfg = s.configs.find(c => c.id === configId);
    if (!cfg) return '';
    return this.translationService.currentLang === 'ar'
      ? (cfg.name || '')
      : (cfg.nameEn || cfg.name || '');
  }


  // ============== 
  getValidAttachments(type: AttachmentsConfigType): RequestPlaintAttachmentDto[] {
    const s = this.ensureState(type);
    return s.items.filter(a => a.fileBase64 && a.fileName);
  }


  getAllValidAttachments(types: AttachmentsConfigType[]): Record<AttachmentsConfigType, RequestPlaintAttachmentDto[]> {
    const result = {} as Record<AttachmentsConfigType, RequestPlaintAttachmentDto[]>;
    types.forEach(t => result[t] = this.getValidAttachments(t));
    return result;
  }


  hasMissingRequiredAttachments(type: AttachmentsConfigType): boolean {
    const s = this.ensureState(type);
    return (s.configs || [])
      .filter(c => (c as any).required === true)
      .some(c => {
        const a = s.items.find(x => x.attConfigID === c.id);
        return !a || !a.fileBase64 || !a.fileName;
      });
  }


  validateRequiredForAll(types: AttachmentsConfigType[]): boolean {
    return types.every(t => !this.hasMissingRequiredAttachments(t));
  }

  // ============== reset/clear ==============
  resetAttachments(type: AttachmentsConfigType): void {
    const s = this.ensureState(type);
    s.items.forEach(it => { it.fileBase64 = ''; it.fileName = ''; });
    s.selected = {};
    s.previews = {};
  }
  loadAttachmentConfigs(type: AttachmentsConfigType): void {
    const s = this.ensureState(type);
    s.sub?.unsubscribe();

    s.sub = this.attachmentService.getAttachmentsConfigByType(type).subscribe({
      next: (configs) => {
        s.configs = configs || [];
        s.items = s.configs.map(cfg => ({
          fileBase64: '',
          fileName: '',
          masterId: 0,
          attConfigID: cfg.id!
        }));
        s.selected = {};
        s.previews = {};
      },
      error: () => {}
    });
  }
  ////////////////////////////////////////////// end attachment functions

  // Navigation methods
  nextStep(): void {

    if (this.currentStep < this.totalSteps) {
      // Only validate if we're not in loading state and form is ready
      if (!this.isLoading && this.firstStepForm && this.isFormInitialized) {
        if (this.validateCurrentStep()) {
          this.currentStep++;
        }
      } else {
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
      this.currentStep = step;
    }
  }

  validateCurrentStep(): boolean {
    if (this.isLoading || !this.firstStepForm || !this.isFormInitialized) {
      return true;
    }

    switch (this.currentStep) {
      case 1:
        return this.validateStep1();
      case 2:
        return true;
      case 3:
        return true;
      case 4:
        return true;
      case 5:
        return true;
      default:
        return true;
    }
  }

  validateStep1(): boolean {
    const form = this.firstStepForm;
    if (form.hasError('dateRange')) return false;

    const required = [
      'eventName',
      'eventLocation',
      'startDate',
      'endDate',
      'supervisorName',
      'jopTitle',
      'telephone1',
      // 'telephone2',
      'advertisementType'
    ];

    const allOk = required.every(k => {
      const c = form.get(k);
      return !!(c && c.value !== null && c.value !== undefined && `${c.value}`.trim() !== '');
    });

    const channels: number[] = form.get('donationCollectionChannelIds')?.value || [];
    return allOk && channels.length > 0;
  }
  // Navigation methods end

  // Table management methods

  canSubmit(): boolean {
    if (this.currentStep !== this.totalSteps) return false;

    if (this.isSaving || !this.firstStepForm || !this.isFormInitialized) return false;

    if (!this.firstStepForm.valid || this.firstStepForm.hasError('dateRange')) return false;

    const mustHave = [
      'eventName',
      'eventLocation',
      'startDate',
      'endDate',
      'supervisorName',
      'jopTitle',
      'telephone1',
      // 'telephone2',
      'advertisementType'
    ];
    const allHaveValues = mustHave.every(k => {
      const c = this.firstStepForm.get(k);
      return !!(c && c.value !== null && c.value !== undefined && `${c.value}`.trim() !== '');
    });
    if (!allHaveValues) return false;

    const channels: number[] = this.firstStepForm.get('donationCollectionChannelIds')?.value || [];
    if (!channels.length) return false;

    const mainAttachType = AttachmentsConfigType.DeclarationOfCharityEffectiveness;
    if (this.hasMissingRequiredAttachments(mainAttachType)) return false;

    // const withAd = Number(this.firstStepForm.get('advertisementType')?.value ?? 0) === 1;
    // if (withAd && this.requestAdvertisements.length === 0) return false;

    return true;
  }

  /**
   * Delete attachments marked for deletion
   */
  private async deleteAttachments(attachmentsToDelete: { [key: number]: number }): Promise<void> {
    const deletePromises = Object.values(attachmentsToDelete).map(attachmentId => {
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
   * Handle main request attachment operations (create, update, delete)
   */
  private async handleMainAttachmentOperations(): Promise<void> {
    const mainAttachType = AttachmentsConfigType.DeclarationOfCharityEffectiveness;
    const state = this.state(mainAttachType);

    // First, delete attachments marked for deletion
    if (Object.keys(this.attachmentsToDelete).length > 0) {
      await this.deleteAttachments(this.attachmentsToDelete);
      this.attachmentsToDelete = {};
    }

    // Then, upload new attachments
    if (state.configs) {
      for (const cfg of state.configs) {
        const selectedFile = state.selected[cfg.id!];
        if (selectedFile) {
          try {
            const base64 = await this.fileToBase64(selectedFile);
            const attachmentDto: AttachmentBase64Dto = {
              fileBase64: base64,
              fileName: selectedFile.name,
              masterId: this.mainApplyServiceId || 0,
              attConfigID: cfg.id!,
            };

            // If there's an existing attachment for this config, update it
            if (this.existingAttachments[cfg.id!] && this.existingAttachments[cfg.id!].id) {
              const updateDto: UpdateAttachmentBase64Dto = {
                id: this.existingAttachments[cfg.id!].id!,
                ...attachmentDto,
              };
              await this.attachmentService.updateAsync(updateDto).toPromise();
            } else {
              // Otherwise, create new attachment using saveAttachmentFileBase64
              await this.attachmentService.saveAttachmentFileBase64(attachmentDto).toPromise();
            }
          } catch (error) {
            console.error('Error uploading attachment:', error);
            throw error;
          }
        }
      }
    }
  }

  /**
   * Handle partner operations (create new, delete) in update mode
   */
  private async handlePartnerOperations(): Promise<void> {
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
        const toISO = (input: string | Date) => {
          if (!input) return '';
          const s = typeof input === 'string' && input.length === 16 ? input + ':00' : input;
          const d = new Date(s as any);
          return d.toISOString().replace(/\.\d{3}Z$/, 'Z');
        };

        const partnerDto: FastingTentPartnerDto = {
          name: partner.name,
          nameEn: partner.nameEn || undefined,
          type: partner.type,
          licenseIssuer: partner.licenseIssuer === null ? undefined : partner.licenseIssuer,
          licenseExpiryDate: partner.licenseExpiryDate === null ? undefined : (partner.licenseExpiryDate ? toISO(partner.licenseExpiryDate) : undefined),
          licenseNumber: partner.licenseNumber === null ? undefined : partner.licenseNumber,
          contactDetails: partner.contactDetails === null ? undefined : partner.contactDetails,
          jobRequirementsDetails: partner.jobRequirementsDetails === null ? undefined : partner.jobRequirementsDetails,
          mainApplyServiceId: this.mainApplyServiceId || undefined,
          attachments: partner.attachments || [],
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
   * Handle advertisement operations (create, update, delete) in update mode
   */
  async handleAdvertisementOperations(isDraft: boolean = false): Promise<void> {
    // Helper function to convert date to ISO string
    const toISO = (input: string | Date) => {
      if (!input) return '';
      const s =
        typeof input === 'string' && input.length === 16
          ? input + ':00'
          : input;
      const d = new Date(s as any);
      return d.toISOString().replace(/\.\d{3}Z$/, 'Z');
    };

    // Helper function to get advertisement attachments for update
    const getAdvertisementAttachmentsForUpdate = async (adIndex: number): Promise<any[]> => {
      const attachments: any[] = [];
      const adAttachType = AttachmentsConfigType.RequestAnEventAnnouncementOrDonationCampaign;
      const state = this.state(adAttachType);

      if (state.configs) {
        for (const cfg of state.configs) {
          const selectedFile = state.selected[cfg.id!];
          if (selectedFile) {
            try {
              const base64 = await this.fileToBase64(selectedFile);
              attachments.push({
                fileBase64: base64,
                fileName: selectedFile.name,
                masterId: this.mainApplyServiceId || 0,
                attConfigID: cfg.id!,
              });
            } catch (error) {
              console.error('Error converting file to base64:', error);
            }
          }
        }
      }
      return attachments;
    };

    // First handle deletions
    if (this.advertisementsToDelete.length > 0) {
      const deletePromises = this.advertisementsToDelete.map(adId => {
        return this._CharityEventPermitRequestService.deleteAdvertisement(adId).toPromise();
      });

      try {
        await Promise.all(deletePromises);
      } catch (error) {
        console.error('Error deleting advertisements:', error);
        throw error;
      }
    }

    // Then handle updates and creates
    for (let i = 0; i < this.requestAdvertisements.length; i++) {
      const advertisement = this.requestAdvertisements[i];
      
      if (advertisement.id) {
        // Update existing advertisement
        try {
          const advertisementIsDraft = isDraft ? true : false;
          const adAttachments = await getAdvertisementAttachmentsForUpdate(i);

          const updateDto: any = {
            id: advertisement.id,
            parentId: this.mainApplyServiceId || null,
            mainApplyServiceId: advertisement.mainApplyServiceId || this.mainApplyServiceId || null,
            ...(advertisement.requestNo !== null && advertisement.requestNo !== undefined && advertisement.requestNo !== 0
              ? { requestNo: Number(advertisement.requestNo) }
              : {}),
            serviceType: advertisement.serviceType || 1,
            workFlowServiceType: advertisement.workFlowServiceType || 1,
            requestDate: toISO(advertisement.requestDate || new Date()),
            provider: advertisement.provider || null,
            adTitle: advertisement.adTitle || '',
            adLang: advertisement.adLang || 'ar',
            startDate: toISO(advertisement.startDate),
            endDate: toISO(advertisement.endDate),
            mobile: advertisement.mobile || null,
            supervisorName: advertisement.supervisorName || null,
            fax: advertisement.fax || null,
            eMail: advertisement.eMail || null,
            targetedAmount: advertisement.targetedAmount || null,
            newAd: advertisement.newAd || null,
            reNewAd: advertisement.reNewAd || null,
            oldPermNumber: advertisement.oldPermNumber || null,
            charityEventPermitId: advertisement.charityEventPermitId || this.loadformData?.charityEventPermit?.id || null,
            notes: advertisement.notes || null,
            isDraft: advertisementIsDraft,
            ...(adAttachments.length > 0 ? { attachments: adAttachments } : {}),
            requestAdvertisementTargets: advertisement.requestAdvertisementTargets?.map((t: any) => ({
              id: t.id || undefined,
              mainApplyServiceId: t.mainApplyServiceId || this.mainApplyServiceId || null,
              lkpTargetTypeId: t.lkpTargetTypeId || t.id,
              lkpTargetTypeText: t.lkpTargetTypeText || null,
              othertxt: t.othertxt || null,
            })) || [],
            requestAdvertisementAdLocations: advertisement.requestAdvertisementAdLocations?.map((l: any) => ({
              id: l.id || undefined,
              mainApplyServiceId: l.mainApplyServiceId || this.mainApplyServiceId || null,
              location: l.location || null,
            })) || [],
            requestAdvertisementAdMethods: advertisement.requestAdvertisementAdMethods?.map((m: any) => ({
              id: m.id || undefined,
              mainApplyServiceId: m.mainApplyServiceId || this.mainApplyServiceId || null,
              lkpAdMethodId: m.lkpAdMethodId || m.id,
              lkpAdMethodText: m.lkpAdMethodText || null,
              othertxt: m.othertxt || null,
            })) || [],
          };
          
          await this._CharityEventPermitRequestService.updateAdvertisement(updateDto).toPromise();
        } catch (error) {
          console.error('Error updating advertisement:', error);
          throw error;
        }
      } else {
        // Create new advertisement using Create API
        try {
          const adAttachType = AttachmentsConfigType.RequestAnEventAnnouncementOrDonationCampaign;
          const state = this.state(adAttachType);
          const attachments: any[] = [];

          if (advertisement.attachments && advertisement.attachments.length > 0) {
            for (const att of advertisement.attachments) {
              if (att.fileBase64 && att.fileName) {
                attachments.push({
                  fileBase64: att.fileBase64,
                  fileName: att.fileName,
                  masterId: this.mainApplyServiceId || 0,
                  attConfigID: att.attConfigID,
                });
              }
            }
          }

          const createDto: any = {
            parentId: this.mainApplyServiceId || null,
            mainApplyServiceId: this.mainApplyServiceId || null,
            ...(advertisement.requestNo !== null && advertisement.requestNo !== undefined && advertisement.requestNo !== 0
              ? { requestNo: Number(advertisement.requestNo) }
              : {}),
            serviceType: advertisement.serviceType || 1,
            workFlowServiceType: advertisement.workFlowServiceType || 1,
            requestDate: toISO(advertisement.requestDate || new Date()),
            provider: advertisement.provider || null,
            adTitle: advertisement.adTitle || '',
            adLang: advertisement.adLang || 'ar',
            startDate: toISO(advertisement.startDate),
            endDate: toISO(advertisement.endDate),
            mobile: advertisement.mobile || null,
            supervisorName: advertisement.supervisorName || null,
            fax: advertisement.fax || null,
            eMail: advertisement.eMail || null,
            targetedAmount: advertisement.targetedAmount || null,
            newAd: advertisement.newAd || null,
            reNewAd: advertisement.reNewAd || null,
            oldPermNumber: advertisement.oldPermNumber || null,
            charityEventPermitId: this.loadformData?.charityEventPermit?.id || null,
            notes: advertisement.notes || null,
            isDraft: isDraft,
            attachments: attachments,
            requestAdvertisementTargets: advertisement.requestAdvertisementTargets?.map((t: any) => ({
              mainApplyServiceId: this.mainApplyServiceId || null,
              lkpTargetTypeId: t.lkpTargetTypeId || t.id,
              othertxt: t.othertxt || null,
            })) || [],
            requestAdvertisementAdLocations: advertisement.requestAdvertisementAdLocations?.map((l: any) => ({
              mainApplyServiceId: this.mainApplyServiceId || null,
              location: l.location || '',
            })) || [],
            requestAdvertisementAdMethods: advertisement.requestAdvertisementAdMethods?.map((m: any) => ({
              mainApplyServiceId: this.mainApplyServiceId || null,
              lkpAdMethodId: m.lkpAdMethodId || m.id,
              othertxt: m.othertxt || null,
            })) || [],
          };
          
          await this._CharityEventPermitRequestService.createAdvertisement(createDto).toPromise();
        } catch (error) {
          console.error('Error creating advertisement:', error);
          throw error;
        }
      }
    }

    // Clear deletion tracking after successful operations
    this.advertisementsToDelete = [];
  }

  // Submit form
  onSubmit(isDraft: boolean = false): void {
    if (this.isSaving) return;

    this.submitted = true;
    // Allow saving draft without full validation
    if (!isDraft && !this.canSubmit()) {
      this.toastr.error(this.translate.instant('VALIDATION.REQUIRED_FIELD'));
      return;
    }

    this.isSaving = true;

    try {
      const currentUser = this.authService.getCurrentUser();
      if (!currentUser?.id) {
        this.toastr.error(this.translate.instant('ERRORS.USER_NOT_FOUND'));
        this.isSaving = false;
        return;
      }

      // helpers
      const toISO = (input: string | Date) => {
        const s = typeof input === 'string' && input.length === 16 ? input + ':00' : input;
        const d = new Date(s as any);
        return d.toISOString().replace(/\.\d{3}Z$/, 'Z');
      }

      const mainAttachType = AttachmentsConfigType.DeclarationOfCharityEffectiveness;
      const mainAttachments = this.getValidAttachments(mainAttachType).map(a => ({
        ...a,
        masterId: a.masterId || 0
      }));

      const formData = this.firstStepForm.value;

      // Check if we're in update mode
      if (this.mainApplyServiceId) {
        // Update mode
        const updatePayload: any = {
          id: this.loadformData?.charityEventPermit?.id || null,
          mainApplyServiceId: this.mainApplyServiceId,
          requestNo: this.loadformData?.charityEventPermit?.requestNo || null,
          requestDate: toISO(formData.requestDate ?? new Date()),
          eventName: formData.eventName || '',
          eventLocation: formData.eventLocation || '',
          startDate: toISO(formData.startDate),
          endDate: toISO(formData.endDate),
          supervisorName: formData.supervisorName || '',
          jopTitle: formData.jopTitle || '',
          telephone1: `971${formData.telephone1}`,
          telephone2: formData.telephone2 ? `971${formData.telephone2}` : null,
          email: formData.email || null,
          advertisementType: formData.advertisementType || 1,
          notes: formData.notes || null,
          isDraft: isDraft,
          donationCollectionChannelIds: formData.donationCollectionChannelIds || [],
        };

        const sub = this._CharityEventPermitRequestService.update(updatePayload).subscribe({
          next: async (res) => {
            try {
              // Handle attachments, partners, and advertisements
              await this.handleMainAttachmentOperations();
              await this.handlePartnerOperations();
              await this.handleAdvertisementOperations(isDraft);

              this.toastr.success(this.translate.instant('SUCCESS.REQUEST_UPDATED') || 'Request updated successfully');
              this.router.navigate(['/request']);
              this.isSaving = false;
            } catch (error: any) {
              console.error('Error handling attachments/partners/advertisements:', error);
              this.toastr.error(this.translate.instant('ERRORS.FAILED_UPDATE_REQUEST') || 'Failed to update request');
              this.isSaving = false;
            }
          },
          error: (error: any) => {
            if (error.error && error.error.reason) {
              this.toastr.error(error.error.reason);
            } else {
              this.toastr.error(this.translate.instant('ERRORS.FAILED_UPDATE_REQUEST') || 'Failed to update request');
            }
            this.isSaving = false;
          }
        });
        this.subscriptions.push(sub);
      } else {
        // Create mode - send everything together in one payload
        const payload: any = {
          ...formData,
          requestDate: toISO(formData.requestDate ?? new Date()),
          startDate: toISO(formData.startDate),
          endDate: toISO(formData.endDate),
          telephone1: `971${formData.telephone1}`,
          telephone2: formData.telephone2 ? `971${formData.telephone2}` : null,
          // Include advertisements with their attachments in the main create payload
          requestAdvertisements: (this.requestAdvertisements || []).map(ad => ({
            parentId: ad.parentId || 0,
            mainApplyServiceId: ad.mainApplyServiceId || 0,
            ...(ad.requestNo !== null && ad.requestNo !== undefined && ad.requestNo !== 0
              ? { requestNo: Number(ad.requestNo) }
              : {}),
            serviceType: ad.serviceType || 1,
            workFlowServiceType: ad.workFlowServiceType || 1,
            requestDate: toISO(ad.requestDate || new Date()),
            provider: ad.provider || null,
            adTitle: ad.adTitle || '',
            adLang: ad.adLang || 'ar',
            startDate: toISO(ad.startDate),
            endDate: toISO(ad.endDate),
            mobile: ad.mobile || null,
            supervisorName: ad.supervisorName || null,
            fax: ad.fax || null,
            eMail: ad.eMail || null,
            targetedAmount: ad.targetedAmount || null,
            newAd: ad.newAd || null,
            reNewAd: ad.reNewAd || null,
            oldPermNumber: ad.oldPermNumber || null,
            charityEventPermitId: ad.charityEventPermitId || null,
            notes: ad.notes || null,
            isDraft: isDraft,
            attachments: ad.attachments || [],
            requestAdvertisementTargets: ad.requestAdvertisementTargets?.map((t: any) => ({
              mainApplyServiceId: t.mainApplyServiceId || 0,
              lkpTargetTypeId: t.lkpTargetTypeId || t.id,
              othertxt: t.othertxt || null,
            })) || [],
            requestAdvertisementAdLocations: ad.requestAdvertisementAdLocations?.map((l: any) => ({
              mainApplyServiceId: l.mainApplyServiceId || 0,
              location: l.location || '',
            })) || [],
            requestAdvertisementAdMethods: ad.requestAdvertisementAdMethods?.map((m: any) => ({
              mainApplyServiceId: m.mainApplyServiceId || 0,
              lkpAdMethodId: m.lkpAdMethodId || m.id,
              othertxt: m.othertxt || null,
            })) || [],
          })),
          attachments: mainAttachments,
          partners: (this.partners || []).map(p => ({
            name: p.name,
            type: Number(p.type),
            licenseIssuer: p.licenseIssuer ?? null,
            licenseExpiryDate: p.licenseExpiryDate ? toISO(p.licenseExpiryDate) : null,
            licenseNumber: p.licenseNumber ?? null,
            contactDetails: p.contactDetails.toString() ?? null,
            mainApplyServiceId: p.mainApplyServiceId ?? null,
            attachments: p.attachments
          })),
          isDraft: isDraft,
        };

        const sub = this._CharityEventPermitRequestService.create(payload).subscribe({
          next: async (res) => {
            this.toastr.success(this.translate.instant('SUCCESS.REQUEST_PLAINT_CREATED'));
            this.router.navigate(['/request']);
            this.isSaving = false;
          },
          error: (error: any) => {
            if (error.error && error.error.reason) {
              this.toastr.error(error.error.reason);
            } else {
              this.toastr.error(this.translate.instant('ERRORS.FAILED_CREATE_REQUEST_PLAINT'));
            }
            this.isSaving = false;
          }
        });
        this.subscriptions.push(sub);
      }

    } catch (error: any) {
      if (error.error && error.error.reason) {
        this.toastr.error(error.error.reason);
      } else {
        this.toastr.error(this.translate.instant('ERRORS.FAILED_CREATE_REQUEST_PLAINT'));
      }
      this.isSaving = false;
    }
  }



  isStepActive(step: number): boolean {
    return this.currentStep === step;
  }

  canProceedToNext(): boolean {
    // Only validate if user is actively trying to proceed, not during initial load
    if (this.isLoading || !this.firstStepForm || !this.isFormInitialized) {

      return this.currentStep < this.totalSteps;
    }
    return this.currentStep < this.totalSteps && this.validateCurrentStep();
  }


  public handleNextClick(): void {
    this.submitted = true;
    this.firstStepForm.markAllAsTouched();

    const isValidStep1 = this.firstStepForm.valid && !this.firstStepForm.hasError('dateRange');

    if (this.currentStep === 1) {
      if (isValidStep1) {
        this.currentStep++;
      } else {
        this.toastr.error(this.translate.instant('VALIDATION.FORM_INVALID'));
      }
    } else {
      this.currentStep++;
    }
  };


  private renewRequiresOldPermValidator = (group: FormGroup) => {
    const reNewAd = group.get('reNewAd')?.value as boolean;
    const oldPermNumber = (group.get('oldPermNumber')?.value ?? '').toString().trim();
    if (reNewAd && !oldPermNumber) {
      return { oldPermRequired: true };
    }
    return null;
  };

  onAdModeChange(mode: 'new' | 'renew') {
    this.advertForm.patchValue({
      newAd: mode === 'new',
      reNewAd: mode === 'renew',
    });
    this.advertForm.updateValueAndValidity({ onlySelf: false, emitEvent: false });
  };


  addLocation(): void {
    const v = (this.newLocationInput || '').trim();
    if (!v) return;
    if (!this.adLocations.includes(v)) this.adLocations.push(v);
    this.newLocationInput = '';
  }


  removeLocation(i: number): void {
    this.adLocations.splice(i, 1);
  }

  addAdvertisement(): void {
    this.submitted = true;
    this.advertForm.markAllAsTouched();

    const hasLocations = this.adLocations.length > 0;
    if (
      !this.advertForm.valid ||
      this.advertForm.hasError('dateRange') ||
      this.advertForm.hasError('oldPermRequired') ||
      !hasLocations
    ) {
      this.toastr.error(this.translate.instant('VALIDATION.FORM_INVALID'));
      return;
    }

    const adAttachType = AttachmentsConfigType.RequestAnEventAnnouncementOrDonationCampaign;
    if (this.hasMissingRequiredAttachments(adAttachType)) {
      this.toastr.error(this.translate.instant('VALIDATION.REQUIRED_FIELD'));
      return;
    }

    const v = this.advertForm.getRawValue();
    const toRFC3339 = (x: string) => (x ? new Date(x).toISOString() : x);

    const mainId = Number(v.mainApplyServiceId ?? 0);

    const adAttachments = this.getValidAttachments(adAttachType).map(a => ({
      ...a,
      masterId: a.masterId || mainId
    }));

    const ad: any = {
      parentId: this.mainApplyServiceId || mainId || null, // Use mainApplyServiceId if available
      mainApplyServiceId: mainId,
      // In create mode, requestNo is not set - it will be set by the backend
      // Only set requestNo if it's a valid number (not 0 or null)
      requestNo: (v.requestNo && v.requestNo !== 0) ? Number(v.requestNo) : null,

      serviceType: Number(v.serviceType) as any,
      workFlowServiceType: Number(v.workFlowServiceType) as any,

      requestDate: toRFC3339(v.requestDate)!,
      // userId: v.userId,

      provider: v.provider ?? null,
      adTitle: v.adTitle,
      adLang: 'ar', // Default to Arabic since adLang is not in the form

      startDate: toRFC3339(v.startDate)!,
      endDate: toRFC3339(v.endDate)!,

      mobile: v.mobile ?? null,
      supervisorName: v.supervisorName ?? null,
      fax: v.fax ?? null,
      eMail: v.eMail ?? null,

      targetedAmount: v.targetedAmount != null ? Number(v.targetedAmount) : null,

      newAd: v.newAd === true ? true : (v.reNewAd ? false : true),
      reNewAd: v.reNewAd === true ? true : false,
      oldPermNumber: v.oldPermNumber ?? null,
      charityEventPermitId: this.loadformData?.charityEventPermit?.id || null, // Use charityEventPermit.id if available in update mode
      notes: v.notes ?? null,

      attachments: adAttachments,

      requestAdvertisementTargets: (v.targetTypeIds || []).map((id: any) => ({
        mainApplyServiceId: mainId,
        lkpTargetTypeId: Number(id),
        othertxt: null
      })),

      requestAdvertisementAdMethods: (v.adMethodIds || []).map((id: any) => ({
        mainApplyServiceId: mainId,
        lkpAdMethodId: Number(id),
        othertxt: null
      })),

      requestAdvertisementAdLocations: this.adLocations.map(loc => ({
        mainApplyServiceId: mainId,
        location: loc
      })),
    };

    this.requestAdvertisements.push(ad);

    this.resetAttachments(adAttachType);

    this.advertForm.reset({
      serviceType: 1,
      workFlowServiceType: 1,
      requestDate: new Date().toISOString(),
      targetTypeIds: [],
      adMethodIds: []
    });
    this.adLocations = [];
    this.submitted = false;
    this.toastr.success(this.translate.instant('SUCCESS.AD_ADDED'));
  }


  removeAdvertisement(i: number): void {
    const advertisement = this.requestAdvertisements[i];
    // If advertisement has an id, it's an existing advertisement - mark for deletion
    if (advertisement && advertisement.id) {
      this.advertisementsToDelete.push(advertisement.id);
      // Also remove existing attachments tracking for this advertisement
      delete this.existingAdvertisementAttachments[i];
    }
    // Remove from requestAdvertisements array
    this.requestAdvertisements.splice(i, 1);
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

  onTelephone1Input(): void {
    const mobileControl = this.firstStepForm.get('telephone1');
    if (mobileControl) {
      let value = mobileControl.value;
      if (value && value.length > 9) {
        value = value.substring(0, 9);
        mobileControl.setValue(value);
      }
    }
  }

  onTelephone1Blur(): void {
    const mobileControl = this.firstStepForm.get('telephone1');
    if (mobileControl) {
      mobileControl.updateValueAndValidity();
      this.cdr.detectChanges();
    }
  }

  onTelephone2Input(): void {
    const mobileControl = this.firstStepForm.get('telephone2');
    if (mobileControl) {
      let value = mobileControl.value;
      if (value && value.length > 9) {
        value = value.substring(0, 9);
        mobileControl.setValue(value);
      }
    }
  }

  onTelephone2Blur(): void {
    const mobileControl = this.firstStepForm.get('telephone2');
    if (mobileControl) {
      mobileControl.updateValueAndValidity();
      this.cdr.detectChanges();
    }
  }

  isAttachmentMandatory(configId: number): boolean {
    const config = this.attachmentConfigs.find(c => c.id === configId);
    return config?.mendatory || false;
  }

  isMandatory(config: any): boolean {
    return !!config?.mendatory;  // مش mandatory
  }

}
