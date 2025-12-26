import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, ChangeDetectorRef } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AttachmentService } from '../../../../core/services/attachments/attachment.service';
import { AuthService } from '../../../../core/services/auth.service';
import { TranslationService } from '../../../../core/services/translation.service';
import { ToastrService } from 'ngx-toastr';
import { Router, ActivatedRoute } from '@angular/router';
import {
  AttachmentsConfigDto,
  AttachmentsConfigType,
} from '../../../../core/dtos/attachments/attachments-config.dto';
import { forkJoin, map, Subscription } from 'rxjs';
import {
  PlaintReasonsDto,
  RequestPlaintAttachmentDto,
  RequestPlaintEvidenceDto,
  RequestPlaintJustificationDto,
  RequestPlaintReasonDto,
  Select2Item,
  UserEntityDto,
} from '../../../../core/dtos/RequestPlaint/request-plaint.dto';
import { CharityEventPermitRequestService } from '../../../../core/services/charity-event-permit-request.service';
import {
  arrayMinLength,
  dateRangeValidator,
} from '../../../../shared/customValidators';
import { RequestAdvertisement } from '../../../../core/dtos/charity-event-permit/charity-event-permit.dto';
import {
  phoneRules,
  rfc3339OrEmpty,
  rfc3339Required,
  timeRangesOk,
} from '../../../../shared/customValidators/requestevent.validators';
import { PartnerType } from '../../../../core/dtos/FastingTentRequest/fasting-tent-request.dto';
import { IdentityCardReaderDto } from '../../../../core/dtos/identity-card/identity-card-reader.dto';
import { ServiceStatus } from '../../../../core/dtos/appEnum.dto';
import { notBeforeTodayFor } from '../../../../shared/customValidators/date.validators';
import { MainApplyService } from '../../../../core/services/mainApplyService/mainApplyService.service';
import { SpinnerService } from '../../../../core/services/spinner.service';
import { PartnerService } from '../../../../core/services/partner.service';
import {
  FiltermainApplyServiceByIdDto,
  mainApplyServiceDto,
} from '../../../../core/dtos/mainApplyService/mainApplyService.dto';
import {
  AttachmentDto,
  UpdateAttachmentBase64Dto,
  AttachmentBase64Dto,
} from '../../../../core/dtos/attachments/attachment.dto';
import { environment } from '../../../../../environments/environment';

type AttachmentState = {
  configs: AttachmentsConfigDto[];
  items: RequestPlaintAttachmentDto[];
  selected: Record<number, File>;
  previews: Record<number, string>;
  sub?: Subscription;
};

@Component({
  selector: 'app-request-event-permits',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    TranslateModule,
    NgSelectModule,
  ],
  templateUrl: './request-event-permits.component.html',
  styleUrl: './request-event-permits.component.scss',
})
export class RequestEventPermitsComponent implements OnInit, OnDestroy {
  len = (a: readonly unknown[] | null | undefined) => a?.length ?? 0;
  private attachmentStates = new Map<AttachmentsConfigType, AttachmentState>();

  get isRtl(): boolean {
    return this.translationService.currentLang === 'ar';
  }

  // ============== helpers ==============
  private ensureState(type: AttachmentsConfigType): AttachmentState {
    if (!this.attachmentStates.has(type)) {
      this.attachmentStates.set(type, {
        configs: [],
        items: [],
        selected: {},
        previews: {},
        sub: undefined,
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
    if (type === AttachmentsConfigType.RequestAnEventOrDonationCampaignPermit) {
      return !!state.selected[id] || !!this.existingAttachments[id];
    }
    // For advertisement attachments, check if there's an existing attachment for current advertisement
    // Note: This will be handled separately in advertisement attachment display
    return !!state.selected[id];
  }

  public selectedFileName(
    type: AttachmentsConfigType,
    id: number
  ): string | null {
    const state = this.ensureState(type);
    // If file is selected, return its name
    if (state.selected[id]) {
      return state.selected[id]?.name ?? null;
    }
    // If there's an existing attachment, return its file name from path
    if (type === AttachmentsConfigType.RequestAnEventOrDonationCampaignPermit && this.existingAttachments[id]) {
      return this.getFileNameFromPath(this.existingAttachments[id].imgPath);
    }
    return null;
  }

  currentStep: number = 1;
  totalSteps: number = 4;
  visitedSteps: Set<number> = new Set([1]);

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
    return this.translationService.currentLang === 'ar'
      ? 'entityName'
      : 'entityNameEn';
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

  requestTypes: any[] = [];
  permitsTypes: any[] = [];
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

  // Identity Card Reader
  identityCardData: IdentityCardReaderDto | null = null;
  isLoadingIdentityCard = false;
  showIdentityCardData = false;
  isIdentityCardReadSuccessfully = false;

  // Update mode properties
  requestEventPermitId: number | null = null;
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
  advertisementsToUpdate: RequestAdvertisement[] = []; // Advertisements to update (have id)
  
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
    this.subscriptions.forEach((sub) => sub.unsubscribe());
    this.attachmentStates.forEach((s) => s.sub?.unsubscribe());
  }

  initializeForm(): void {
    this.firstStepForm = this.fb.group(
      {
        requestDate: this.fb.control<string>(
          new Date().toISOString(), // RFC 3339 format
          {
            validators: [Validators.required, rfc3339Required],
            nonNullable: true,
          }
        ),

        lkpRequestTypeId: this.fb.control<number>(1, {
          validators: [Validators.required],
          nonNullable: true,
        }),

        //userId: this.fb.control<string>('', {
        //  validators: [Validators.required, Validators.maxLength(450)],
        //  nonNullable: true,
        //}),

        requestSide: this.fb.control(null, {
          validators: [Validators.maxLength(200)]
        }),

        supervisingSide: this.fb.control(null, {
          validators: [Validators.maxLength(200)]
        }),

        eventName: this.fb.control<string>('', {
          validators: [Validators.required, Validators.maxLength(200)],
          nonNullable: true,
        }),

        startDate: this.fb.control<string>('', {
          validators: [Validators.required, rfc3339Required],
          nonNullable: true,
        }),

        endDate: this.fb.control<string>('', {
          validators: [Validators.required, rfc3339Required],
          nonNullable: true,
        }),

        lkpPermitTypeId: this.fb.control(null),

        eventLocation: this.fb.control(null, {
          validators: [Validators.maxLength(500)]
        }),

        // amStartTime: this.fb.control<string>('', {
        //   validators: [rfc3339Required],
        //   nonNullable: true,
        // }),
        // amEndTime: this.fb.control<string>('', {
        //   validators: [rfc3339Required],
        //   nonNullable: true,
        // }),
        // pmStartTime: this.fb.control<string>('', {
        //   validators: [rfc3339Required],
        //   nonNullable: true,
        // }),
        // pmEndTime: this.fb.control<string>('', {
        //   validators: [rfc3339Required],
        //   nonNullable: true,
        // }),

        amStartTime: this.fb.control(null),
        amEndTime: this.fb.control(null),
        pmStartTime: this.fb.control(null),
        pmEndTime: this.fb.control(null),

        admin: this.fb.control<string>('', {
          validators: [Validators.required, Validators.maxLength(200)],
          nonNullable: true,
        }),

        delegateName: this.fb.control(null, {
          validators: [Validators.maxLength(200)]
        }),

        alternateName: this.fb.control(null, {
          validators: [Validators.maxLength(100)]
        }),

        adminTel: this.fb.control<string>('', {
          validators: [Validators.required, this.uaeMobileValidator.bind(this)],
          nonNullable: true,
        }),
        telephone: this.fb.control(null, {validators: [this.uaeMobileValidator.bind(this)]}),

        email: this.fb.control<string | null>(null, {
          validators: [Validators.maxLength(50), Validators.email],
        }),

        notes: this.fb.control<string | null>(null, {
          validators: [Validators.maxLength(4000)],
        }),

        targetedAmount: this.fb.control<number | null>(null, {
          validators: [Validators.required, Validators.min(0)],
        }),

        beneficiaryIdNumber: this.fb.control<string | null>(null, {
          validators: [this.emiratesIdValidator.bind(this)],
        }),

        donationCollectionChannelIds: this.fb.control<number[]>([], {
          // validators: [arrayMinLength(1)],
          nonNullable: true,
        }),
      },
      {
        validators: [
          timeRangesOk,
          notBeforeTodayFor('startDate')
          // this.timeRangeValidator('amStartTime', 'amEndTime'),
          // this.timeRangeValidator('pmStartTime', 'pmEndTime')
        ],
      }
    );

    // Subscribe to beneficiaryIdNumber changes to reset identity card read flag
    const beneficiaryControl = this.firstStepForm.get('beneficiaryIdNumber');
    if (beneficiaryControl) {
      const beneficiarySub = beneficiaryControl.valueChanges.subscribe(() => {
        // Reset the flag when beneficiary ID number changes
        this.isIdentityCardReadSuccessfully = false;
        this.identityCardData = null;
        this.showIdentityCardData = false;
      });
      this.subscriptions.push(beneficiarySub);
    }
  }
  initAdvertisementForm(): void {
    const currentUser = this.authService.getCurrentUser();
    this.advertForm = this.fb.group(
      {
        parentId: this.fb.control<number | null>(0),
        mainApplyServiceId: this.fb.control<number | null>(0),
        requestNo: this.fb.control<number | null>(0),

        serviceType: this.fb.control<number | null>(1, {
          validators: [Validators.required],
        }),
        workFlowServiceType: this.fb.control<number | null>(1, {
          validators: [Validators.required],
        }),

        requestDate: this.fb.control(new Date().toISOString(), {
          validators: [Validators.required],
          nonNullable: true,
        }),
        //userId: this.fb.control(currentUser?.id ?? '', {
        //  validators: [Validators.required],
        //  nonNullable: true,
        //}),

        // provider: this.fb.control<string | null>(null),

        adTitle: this.fb.control('', {
          validators: [Validators.required],
          nonNullable: true,
        }),
        // adLang: this.fb.control<'ar' | 'en'>('ar', { validators: [Validators.required], nonNullable: true }),

        startDate: this.fb.control('', {
          validators: [Validators.required],
          nonNullable: true,
        }),
        endDate: this.fb.control('', {
          validators: [Validators.required],
          nonNullable: true,
        }),

        // mobile: this.fb.control<string | null>(null),
        // supervisorName: this.fb.control<string | null>(null),
        // fax: this.fb.control<string | null>(null),
        // eMail: this.fb.control<string | null>(null, [Validators.email]),

        // targetedAmount: this.fb.control<number | null>(null),

        // newAd: this.fb.control<boolean | null>(true),
        // reNewAd: this.fb.control<boolean | null>(false),
        // oldPermNumber: this.fb.control<string | null>(null),

        requestEventPermitId: this.fb.control<number | null>(null),
        notes: this.fb.control<string | null>(null),
        targetTypeIds: this.fb.control<number[]>([], {
          validators: [arrayMinLength(1)],
          nonNullable: true,
        }),
        adMethodIds: this.fb.control<number[]>([], {
          validators: [arrayMinLength(1)],
          nonNullable: true,
        }),
      },
      {
        validators: [dateRangeValidator, this.renewRequiresOldPermValidator,
          notBeforeTodayFor('startDate')],
      }
    );
  }

  loadInitialData(): void {
    this.isLoading = true;

    const currentUser = this.authService.getCurrentUser();
    if (currentUser?.id) {
      //this.firstStepForm.patchValue({
      //  userId: currentUser.id,
      //});

      // Load essential data first (user entity and main service options)
      const essentialOperations = [
        this._CharityEventPermitRequestService.getAdvertisementMethodType,
      ];

      forkJoin({
        advertisementMethodType:
          this._CharityEventPermitRequestService.getAdvertisementMethodType({}),
        advertisementTargetType:
          this._CharityEventPermitRequestService.getAdvertisementTargetType({}),
        advertisementType:
          this._CharityEventPermitRequestService.getAdvertisementType(),
        donationChannelsLookup:
          this._CharityEventPermitRequestService.getDonationCollectionChannel(
            {}
          ),
        // partnerTypes: this._CharityEventPermitRequestService.getPartners(),
        requestTypes:
          this._CharityEventPermitRequestService.getPermitRequestTypeSelect2(
            {}
          ),
        permitsTypes:
          this._CharityEventPermitRequestService.getPermitTypeSelect2({}),
      }).subscribe({
        next: (res: any) => {
          this.advertisementType = res.advertisementType;
          this.advertisementMethodType = res.advertisementMethodType?.results;
          this.advertisementTargetType = res.advertisementTargetType?.results;
          // this.partnerTypes = res.partnerTypes?.data;

          this.requestTypes = res.requestTypes?.results;
          this.permitsTypes = res.permitsTypes?.results;

          this.donationChannelsLookup = res.donationChannelsLookup.results
            ?.length
            ? res.donationChannelsLookup.results
            : [
              { id: 1, text: 'SMS' },
              { id: 2, text: 'Bank Transfer' },
              { id: 3, text: 'POS' },
            ];

          this.isLoading = false;
          this.isFormInitialized = true; // Mark form as fully initialized

          // this.loadAttachmentConfigs();
          this.loadAttachmentConfigs(
            AttachmentsConfigType.RequestAnEventOrDonationCampaignPermit
          );
          this.loadAttachmentConfigs(
            AttachmentsConfigType.RequestAnEventAnnouncementOrDonationCampaign
          );
          this.loadAttachmentConfigs(AttachmentsConfigType.Partner);
        },
        error: (error: any) => {
          this.toastr.error(this.translate.instant('ERRORS.FAILED_LOAD_DATA'));
          this.isLoading = false;
          this.isFormInitialized = true;
        },
      });
    } else {
      this.toastr.error(this.translate.instant('ERRORS.USER_NOT_FOUND'));
      this.router.navigate(['/login']);
    }
  }

  /**
   * Load initial data for update mode (without resetting form)
   */
  private loadInitialDataForUpdate(): void {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser?.id) {
      return;
    }

    forkJoin({
      advertisementMethodType:
        this._CharityEventPermitRequestService.getAdvertisementMethodType({}),
      advertisementTargetType:
        this._CharityEventPermitRequestService.getAdvertisementTargetType({}),
      advertisementType:
        this._CharityEventPermitRequestService.getAdvertisementType(),
      donationChannelsLookup:
        this._CharityEventPermitRequestService.getDonationCollectionChannel(
          {}
        ),
      requestTypes:
        this._CharityEventPermitRequestService.getPermitRequestTypeSelect2(
          {}
        ),
      permitsTypes:
        this._CharityEventPermitRequestService.getPermitTypeSelect2({}),
    }).subscribe({
      next: (res: any) => {
        this.advertisementType = res.advertisementType;
        this.advertisementMethodType = res.advertisementMethodType?.results;
        this.advertisementTargetType = res.advertisementTargetType?.results;

        this.requestTypes = res.requestTypes?.results;
        this.permitsTypes = res.permitsTypes?.results;

        this.donationChannelsLookup = res.donationChannelsLookup.results
          ?.length
          ? res.donationChannelsLookup.results
          : [
            { id: 1, text: 'SMS' },
            { id: 2, text: 'Bank Transfer' },
            { id: 3, text: 'POS' },
          ];

        // Patch form data after dropdowns are loaded (for update mode)
        if (this.pendingFormData) {
          setTimeout(() => {
            // Convert select2 options to proper format if needed
            const lkpRequestTypeId = this.pendingFormData.lkpRequestTypeId;
            if (lkpRequestTypeId && this.requestTypes) {
              // Ensure the value exists in options - convert id to string for comparison
              const requestTypeOption = this.requestTypes.find((opt: any) => {
                const optId = String(opt.id);
                const searchId = String(lkpRequestTypeId);
                return optId === searchId;
              });
              if (!requestTypeOption && lkpRequestTypeId) {
                // If not found, add it (might be a new option)
                this.requestTypes.push({ id: String(lkpRequestTypeId), text: String(lkpRequestTypeId) });
              }
            }
            
            const lkpPermitTypeId = this.pendingFormData.lkpPermitTypeId;
            if (lkpPermitTypeId && this.permitsTypes && lkpPermitTypeId !== 0 && lkpPermitTypeId !== null) {
              // Ensure the value exists in options (skip if 0 or null)
              const permitTypeOption = this.permitsTypes.find((opt: any) => {
                const optId = String(opt.id);
                const searchId = String(lkpPermitTypeId);
                return optId === searchId;
              });
              if (!permitTypeOption && lkpPermitTypeId) {
                this.permitsTypes.push({ id: String(lkpPermitTypeId), text: String(lkpPermitTypeId) });
              }
            }
            
            // Handle donationCollectionChannelIds - ensure all IDs exist in options
            const donationChannelIds = this.pendingFormData.donationCollectionChannelIds || [];
            if (donationChannelIds.length > 0 && this.donationChannelsLookup) {
              donationChannelIds.forEach((channelId: number) => {
                const channelOption = this.donationChannelsLookup.find((opt: any) => {
                  const optId = String(opt.id);
                  const searchId = String(channelId);
                  return optId === searchId;
                });
                if (!channelOption) {
                  // If not found, try to find it in the response data
                  // For now, we'll skip adding it - it should exist in the API response
                  console.warn(`Donation channel with id ${channelId} not found in options`);
                }
              });
            }
            
            // Patch form values - convert IDs to strings if needed for ng-select compatibility
            const formDataToPatch = { ...this.pendingFormData };
            
            // Convert lkpRequestTypeId to string if requestTypes use string IDs
            if (formDataToPatch.lkpRequestTypeId && this.requestTypes.length > 0) {
              const firstOption = this.requestTypes[0];
              if (typeof firstOption.id === 'string') {
                formDataToPatch.lkpRequestTypeId = String(formDataToPatch.lkpRequestTypeId);
              }
            }
            
            // Convert lkpPermitTypeId to string if permitsTypes use string IDs (and not 0/null)
            if (formDataToPatch.lkpPermitTypeId && formDataToPatch.lkpPermitTypeId !== 0 && this.permitsTypes.length > 0) {
              const firstOption = this.permitsTypes[0];
              if (typeof firstOption.id === 'string') {
                formDataToPatch.lkpPermitTypeId = String(formDataToPatch.lkpPermitTypeId);
              }
            }
            
            // Convert donationCollectionChannelIds to strings if needed
            if (formDataToPatch.donationCollectionChannelIds && formDataToPatch.donationCollectionChannelIds.length > 0 && this.donationChannelsLookup.length > 0) {
              const firstOption = this.donationChannelsLookup[0];
              if (typeof firstOption.id === 'string') {
                formDataToPatch.donationCollectionChannelIds = formDataToPatch.donationCollectionChannelIds.map((id: number) => String(id));
              }
            }
            
            // Patch form values
            this.firstStepForm.patchValue(formDataToPatch, { emitEvent: false });
            this.cdr.detectChanges();
            
            // Clear pending data
            this.pendingFormData = null;
          }, 150);
        }

        this.isFormInitialized = true;

        // Load attachment configs - use forkJoin to wait for all configs to load
        forkJoin({
          mainPermitConfigs: this.attachmentService.getAttachmentsConfigByType(
            AttachmentsConfigType.RequestAnEventOrDonationCampaignPermit,
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
          next: (configs) => {
            // Initialize attachment states with configs
            const mainState = this.ensureState(AttachmentsConfigType.RequestAnEventOrDonationCampaignPermit);
            mainState.configs = configs.mainPermitConfigs || [];
            mainState.items = mainState.configs.map((cfg) => ({
              fileBase64: '',
              fileName: '',
              masterId: 0,
              attConfigID: cfg.id!,
            }));

            const adState = this.ensureState(AttachmentsConfigType.RequestAnEventAnnouncementOrDonationCampaign);
            adState.configs = configs.advertisementConfigs || [];
            adState.items = adState.configs.map((cfg) => ({
              fileBase64: '',
              fileName: '',
              masterId: 0,
              attConfigID: cfg.id!,
            }));

            const partnerState = this.ensureState(AttachmentsConfigType.Partner);
            partnerState.configs = configs.partnerConfigs || [];
            partnerState.items = partnerState.configs.map((cfg) => ({
              fileBase64: '',
              fileName: '',
              masterId: 0,
              attConfigID: cfg.id!,
            }));

            // Load attachments after configs are loaded (for update mode)
            if (this.pendingAttachmentsData && this.pendingAttachmentsData.length > 0) {
              setTimeout(() => {
                this.loadExistingAttachments(this.pendingAttachmentsData);
                this.pendingAttachmentsData = [];
                this.cdr.detectChanges();
              }, 100);
            } else if (this.pendingAttachmentsMasterId) {
              setTimeout(() => {
                this.loadAttachmentsFromAPI(this.pendingAttachmentsMasterId);
                this.pendingAttachmentsMasterId = null;
                this.cdr.detectChanges();
              }, 100);
            }
          },
          error: (error) => {
            console.error('Error loading attachment configs:', error);
            // Still try to load attachments even if configs fail
            if (this.pendingAttachmentsData && this.pendingAttachmentsData.length > 0) {
              setTimeout(() => {
                this.loadExistingAttachments(this.pendingAttachmentsData);
                this.pendingAttachmentsData = [];
              }, 100);
            } else if (this.pendingAttachmentsMasterId) {
              setTimeout(() => {
                this.loadAttachmentsFromAPI(this.pendingAttachmentsMasterId);
                this.pendingAttachmentsMasterId = null;
              }, 100);
            }
          },
        });

        this.isLoading = false;
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

        // Extract request event permit data
        const requestEventPermit = response.requestEventPermit;
        if (requestEventPermit) {
          this.requestEventPermitId = requestEventPermit.id || null;
          this.mainApplyServiceId = response.id || null;

          // Populate main form
          const toDateString = (date: any) => {
            if (!date) return '';
            if (date instanceof Date) {
              return date.toISOString();
            }
            return new Date(date).toISOString();
          };

          // Store form data to patch after dropdowns are loaded
          const formDataToPatch = {
            requestDate: toDateString(requestEventPermit.requestDate) || new Date().toISOString(),
            lkpRequestTypeId: requestEventPermit.lkpRequestTypeId || null,
            requestSide: requestEventPermit.requestSide || '',
            supervisingSide: requestEventPermit.supervisingSide || null,
            eventName: requestEventPermit.eventName || '',
            startDate: toDateString(requestEventPermit.startDate) || '',
            endDate: toDateString(requestEventPermit.endDate) || '',
            lkpPermitTypeId: requestEventPermit.lkpPermitTypeId || null,
            eventLocation: requestEventPermit.eventLocation || null,
            amStartTime: requestEventPermit.amStartTime ? toDateString(requestEventPermit.amStartTime) : null,
            amEndTime: requestEventPermit.amEndTime ? toDateString(requestEventPermit.amEndTime) : null,
            pmStartTime: requestEventPermit.pmStartTime ? toDateString(requestEventPermit.pmStartTime) : null,
            pmEndTime: requestEventPermit.pmEndTime ? toDateString(requestEventPermit.pmEndTime) : null,
            admin: requestEventPermit.admin || '',
            delegateName: requestEventPermit.delegateName || null,
            alternateName: requestEventPermit.alternateName || null,
            adminTel: requestEventPermit.adminTel?.replace('971', '') || '',
            telephone: requestEventPermit.telephone?.replace('971', '') || null,
            email: requestEventPermit.email || null,
            notes: requestEventPermit.notes || null,
            targetedAmount: requestEventPermit.targetedAmount || null,
            beneficiaryIdNumber: requestEventPermit.beneficiaryIdNumber || null,
            donationCollectionChannelIds: requestEventPermit.donationCollectionChannels?.map((c: any) => c.id) || [],
          };
          
          // Store form data for later patching after dropdowns are loaded
          this.pendingFormData = formDataToPatch;

          // Load Identity Card Data if available
          if (requestEventPermit.scIdentityCardReaderId) {
            this._CharityEventPermitRequestService.getIdentityCardById(requestEventPermit.scIdentityCardReaderId)
              .subscribe({
                next: (identityCard) => {
                  this.identityCardData = identityCard;
                  this.showIdentityCardData = true;
                  this.isIdentityCardReadSuccessfully = true;
                },
                error: () => {
                  // Ignore errors for identity card
                  this.isIdentityCardReadSuccessfully = false;
                }
              });
          }

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
              contactDetails: p.contactDetails?.replace('971', '') || '',
              jobRequirementsDetails: p.jobRequirementsDetails || '',
              mainApplyServiceId: p.mainApplyServiceId || this.mainApplyServiceId || 0,
              attachments: p.attachments || [],
            }));
            // Also add to partners array for display
            this.partners = [...this.existingPartners];
          }

          // Load existing advertisements
          if (requestEventPermit.requestAdvertisements && requestEventPermit.requestAdvertisements.length > 0) {
            this.existingAdvertisements = requestEventPermit.requestAdvertisements.map((ad: any, index: number) => {
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
                // Preserve requestNo as is (even if 0) - it might be a valid value from API
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
                requestEventPermitId: ad.requestEventPermitId || this.requestEventPermitId || null,
                notes: ad.notes || null,
                attachments: ad.attachments || [],
                requestAdvertisementTargets: ad.requestAdvertisementTargets || [],
                requestAdvertisementAdLocations: ad.requestAdvertisementAdLocations || [],
                requestAdvertisementAdMethods: ad.requestAdvertisementAdMethods || [],
              };
            });
            // Also add to requestAdvertisements array for display
            this.requestAdvertisements = [...this.existingAdvertisements];
          }

          // Store attachments data to load after configs are loaded (main request)
          if (response.attachments && response.attachments.length > 0) {
            this.pendingAttachmentsData = response.attachments.map((att: any) => ({
              id: att.id,
              imgPath: att.imgPath,
              masterId: att.masterId,
              attConfigID: att.attConfigID,
              lastModified: att.lastModified,
            }));
          } else if (this.mainApplyServiceId) {
            // If attachments not available, store masterId to load from API after configs
            this.pendingAttachmentsMasterId = this.mainApplyServiceId;
          }
        }

        // Load initial data (dropdowns, etc.) - this will also load attachment configs
        // In update mode, we need to load dropdowns without resetting form data
        this.loadInitialDataForUpdate();
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

  /**
   * Load attachments from API using masterId and masterType
   */
  private loadAttachmentsFromAPI(masterId: number | null): void {
    // Check if masterId is valid - must be a number
    if (masterId === null || masterId === undefined || typeof masterId !== 'number') {
      console.warn('Cannot load attachments: invalid masterId', masterId);
      return;
    }
    
    // At this point, TypeScript knows masterId is a number
    const validMasterId: number = masterId;
    const masterType = AttachmentsConfigType.RequestAnEventOrDonationCampaignPermit;
    
    const sub = this.attachmentService.getListByMasterId(validMasterId, masterType).subscribe({
      next: (attachments: AttachmentDto[]) => {
        
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
        this.existingAttachments[attachment.attConfigID] = {
          id: attachment.id,
          imgPath: attachment.imgPath,
          masterId: attachment.masterId || this.mainApplyServiceId || 0,
          attConfigID: attachment.attConfigID,
          lastModified: attachment.lastModified ? new Date(attachment.lastModified) : undefined,
        };
        
        // Set preview for existing attachments
        if (attachment.imgPath) {
          const isImage = this.isImageFile(attachment.imgPath);
          const imageUrl = isImage 
            ? this.constructImageUrl(attachment.imgPath)
            : undefined;
          
          // Set preview in the appropriate attachment state
          const mainAttachType = AttachmentsConfigType.RequestAnEventOrDonationCampaignPermit;
          const state = this.ensureState(mainAttachType);
          if (imageUrl) {
            state.previews[attachment.attConfigID] = imageUrl;
          }
        }
      }
    });
    
    this.cdr.detectChanges();
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

  // start partners
  initPartnerForm(): void {
    this.partnerForm = this.fb.group({
      type: this.fb.control<number | null>(null, { validators: [Validators.required] }),

      // required
      licenseIssuer: this.fb.control('', { validators: [Validators.required, Validators.maxLength(200)], nonNullable: true }),
      licenseExpiryDate: this.fb.control(null, [Validators.maxLength(100)]),
      licenseNumber: this.fb.control('', { validators: [Validators.required], nonNullable: true }),

      // optional
      contactDetails: this.fb.control<string>('', {
        validators: [Validators.required, this.uaeMobileValidator.bind(this)],
        nonNullable: true,
      }),
      mainApplyServiceId: this.fb.control<number | null>(null),


      name: ['', [Validators.required, Validators.maxLength(200)]],
      nameEn: ['', [Validators.required, Validators.maxLength(200)]],
      jobRequirementsDetails: [''],
    });
  }

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

  //   const partnerAttachments = this.getValidAttachments(partnerAttachType).map(
  //     (a) => ({
  //       ...a,
  //       masterId: a.masterId || Number(v.mainApplyServiceId ?? 0),
  //     })
  //   );

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
    const nameEn = (this.partnerForm.get('nameEn')?.value ?? '').toString().trim();
    const licenseIssuer = (this.partnerForm.get('licenseIssuer')?.value ?? '').toString().trim();
    const licenseExpiry = (this.partnerForm.get('licenseExpiryDate')?.value ?? '').toString().trim();
    const licenseNumber = (this.partnerForm.get('licenseNumber')?.value ?? '').toString().trim();
    const contactDetails = (this.partnerForm.get('contactDetails')?.value ?? '').toString().trim();

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
    
    // Validate UAE mobile format
    const uaeMobilePattern = /^5[0-9]{8}$/;
    if (!uaeMobilePattern.test(contactDetails)) {
      this.toastr.error(this.translate.instant('VALIDATION.INVALID_PHONE_FORMAT'));
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
      contactDetails: v.contactDetails ?? null,
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
    if (partner?.id) {
      this.partnersToDelete.push(partner.id);
    }
    
    // Remove from display array
    this.partners.splice(i, 1);
    this.toastr.success(this.translate.instant('SUCCESS.PARTNER_REMOVED'));
  }

  getPartnerTypeLabel(id: number): string {
    return this.partnerTypes.find(t => t.id === id)?.label ?? '';
  }

  truncateText(text: string | null | undefined, maxLength: number = 30): string {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }

  /**
   * Check if partner form has any data filled in
   */
  private hasPartnerFormData(): boolean {
    if (!this.partnerForm) return false;
    
    const values = this.partnerForm.getRawValue();
    
    // Check if any field has a value (not null, undefined, or empty string)
    return (
      !!values.type ||
      (values.name?.toString().trim() || '').length > 0 ||
      (values.nameEn?.toString().trim() || '').length > 0 ||
      (values.licenseIssuer?.toString().trim() || '').length > 0 ||
      (values.licenseExpiryDate?.toString().trim() || '').length > 0 ||
      (values.licenseNumber?.toString().trim() || '').length > 0 ||
      (values.contactDetails?.toString().trim() || '').length > 0 ||
      (values.jobRequirementsDetails?.toString().trim() || '').length > 0
    );
  }

  /**
   * Validate partner form data
   */
  private validatePartnerForm(): boolean {
    const partnerType: PartnerType | null = this.partnerForm.get('type')?.value ?? null;

    // Prepare field values
    const name = (this.partnerForm.get('name')?.value ?? '').toString().trim();
    const nameEn = (this.partnerForm.get('nameEn')?.value ?? '').toString().trim();
    const licenseIssuer = (this.partnerForm.get('licenseIssuer')?.value ?? '').toString().trim();
    const licenseExpiry = (this.partnerForm.get('licenseExpiryDate')?.value ?? '').toString().trim();
    const licenseNumber = (this.partnerForm.get('licenseNumber')?.value ?? '').toString().trim();
    const contactDetails = (this.partnerForm.get('contactDetails')?.value ?? '').toString().trim();

    // Backend rules: Name required + max 200
    if (!name) {
      return false;
    }
    if (!nameEn) {
      return false;
    }
    if (name.length > 200) {
      return false;
    }

    if (!contactDetails) {
      return false;
    }
    
    // Validate UAE mobile format
    const uaeMobilePattern = /^5[0-9]{8}$/;
    if (!uaeMobilePattern.test(contactDetails)) {
      return false;
    }

    // Type: must be valid from enum
    const validTypes = [PartnerType.Person, PartnerType.Supplier, PartnerType.Company, PartnerType.Government];
    if (partnerType === null || !validTypes.includes(partnerType)) {
      return false;
    }

    // LicenseIssuer: max 200
    if (licenseIssuer && licenseIssuer.length > 200) {
      return false;
    }

    // LicenseNumber: max 100
    if (licenseNumber && licenseNumber.length > 100) {
      return false;
    }

    // Business rules: Supplier/Company requires license data + license attachment
    if (partnerType === PartnerType.Supplier || partnerType === PartnerType.Company) {
      if (!licenseIssuer || !licenseExpiry || !licenseNumber) {
        return false;
      }
    }

    // Check required attachments
    const partnerAttachType = AttachmentsConfigType.Partner;
    if (this.hasMissingRequiredAttachments(partnerAttachType)) {
      return false;
    }

    const v = this.partnerForm.getRawValue();
    const partnerAttachments = this.getValidAttachments(partnerAttachType).map(a => ({
      ...a,
      masterId: a.masterId || Number(v.mainApplyServiceId ?? 0)
    }));

    if (partnerType === PartnerType.Person || partnerType === PartnerType.Supplier || partnerType === PartnerType.Company) {
      if (!partnerAttachments.length) {
        return false;
      }
    }

    return true;
  }

  /**
   * Auto-add partner if form has data before navigating away from partners step
   */
  private tryAutoAddPartner(): void {
    // Only try to add if we have data in the form
    if (!this.hasPartnerFormData()) {
      return;
    }

    // Validate the partner form
    if (!this.validatePartnerForm()) {
      const message = this.translate.instant('VALIDATION.PARTNER_DATA_INCOMPLETE') || 
                      'Please complete or correct the partner information, or clear the form to continue.';
      this.toastr.warning(message, this.translate.instant('COMMON.WARNING') || 'Warning');
      return;
    }

    // If valid, add the partner automatically
    const partnerAttachType = AttachmentsConfigType.Partner;
    const v = this.partnerForm.getRawValue();

    const partnerAttachments = this.getValidAttachments(partnerAttachType).map(a => ({
      ...a,
      masterId: a.masterId || Number(v.mainApplyServiceId ?? 0)
    }));

    this.partners.push({
      name: v.name!,
      nameEn: v.nameEn!,
      type: v.type!,
      licenseIssuer: v.licenseIssuer!,
      licenseExpiryDate: v.licenseExpiryDate!,
      licenseNumber: v.licenseNumber!,
      contactDetails: v.contactDetails ?? null,
      jobRequirementsDetails: v.jobRequirementsDetails ?? null,
      mainApplyServiceId: v.mainApplyServiceId ?? null,
      attachments: partnerAttachments,
    });
    
    this.resetAttachments(partnerAttachType);
    this.partnerForm.reset();
    this.showPartnerAttachments = false;
    
    const successMessage = this.translate.instant('SUCCESS.PARTNER_ADDED_AUTOMATICALLY') || 
                           'Partner added automatically.';
    this.toastr.success(successMessage);
  }


  ////////////////////////////////////////////// start attachment functions

  loadManyAttachmentConfigs(types: AttachmentsConfigType[]): void {
    const calls = types.map((t) =>
      this.attachmentService
        .getAttachmentsConfigByType(t)
        .pipe(map((cfgs) => ({ type: t, cfgs: cfgs || [] })))
    );

    forkJoin(calls).subscribe({
      next: (results) => {
        results.forEach(({ type, cfgs }) => {
          const s = this.ensureState(type);
          s.configs = cfgs;
          s.items = cfgs.map((cfg) => ({
            fileBase64: '',
            fileName: '',
            masterId: 0,
            attConfigID: cfg.id!,
          }));
          s.selected = {};
          s.previews = {};
        });
      },
      error: () => {},
    });
  }

  // ==============
  onFileSelected(
    event: Event,
    type: AttachmentsConfigType,
    configId: number
  ): void {
    const input = event.target as HTMLInputElement;
    const file = input?.files?.[0];
    if (file) this.handleFileUpload(type, configId, file);
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver = true;
  }
  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver = false;
  }
  onDrop(
    event: DragEvent,
    type: AttachmentsConfigType,
    configId: number
  ): void {
    event.preventDefault();
    this.isDragOver = false;
    const file = event.dataTransfer?.files?.[0];
    if (file) this.handleFileUpload(type, configId, file);
  }

  handleFileUpload(
    type: AttachmentsConfigType,
    configId: number,
    file: File
  ): void {
    if (!this.validateFile(file)) return;
    this.selectedFiles[configId] = file;
    const s = this.ensureState(type);
    s.selected[configId] = file;

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      s.previews[configId] = dataUrl;

      const i = s.items.findIndex((a) => a.attConfigID === configId);
      if (i !== -1) {
        s.items[i] = {
          ...s.items[i],
          fileBase64: dataUrl.split(',')[1] ?? '',
          fileName: file.name,
        };
      }
    };
    reader.readAsDataURL(file);
  }

  // ==============
  validateFile(file: File): boolean {
    const MAX = 5 * 1024 * 1024;
    const ALLOWED = new Set<string>([
      'image/jpeg',
      'image/png',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ]);

    if (file.size > MAX) {
      this.toastr.error(this.translate.instant('VALIDATION.FILE_TOO_LARGE'));
      return false;
    }

    const typeOk = ALLOWED.has(file.type);
    const extOk = /\.(jpe?g|png|pdf|docx?|DOCX?)$/i.test(file.name);
    if (!typeOk && !extOk) {
      this.toastr.error(this.translate.instant('VALIDATION.INVALID_FILE_TYPE'));
      return false;
    }

    return true;
  }

  removeFile(type: AttachmentsConfigType, configId: number): void {
    const s = this.ensureState(type);
    // If there's an existing attachment, mark it for deletion instead of just removing from UI
    if (type === AttachmentsConfigType.RequestAnEventOrDonationCampaignPermit && this.existingAttachments[configId]) {
      this.removeExistingFile(configId);
      return;
    }
    
    // Otherwise, just remove the selected file
    delete s.selected[configId];
    delete s.previews[configId];
    delete this.selectedFiles[configId];
    const i = s.items.findIndex((a) => a.attConfigID === configId);
    if (i !== -1) {
      s.items[i] = { ...s.items[i], fileBase64: '', fileName: '' };
    }
  }

  // ==============
  getAttachmentName(type: AttachmentsConfigType, configId: number): string {
    const s = this.ensureState(type);
    const cfg = s.configs.find((c) => c.id === configId);
    if (!cfg) return '';
    return this.translationService.currentLang === 'ar'
      ? cfg.name || ''
      : cfg.nameEn || cfg.name || '';
  }

  getPreview(
    type: AttachmentsConfigType,
    configId: number
  ): string | undefined {
    const state = this.ensureState(type);
    // If there's a selected file preview, return it
    if (state.previews[configId]) {
      return state.previews[configId];
    }
    // If there's an existing attachment, return its preview URL
    if (type === AttachmentsConfigType.RequestAnEventOrDonationCampaignPermit && this.existingAttachments[configId]) {
      const attachment = this.existingAttachments[configId];
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
   * Trigger file input click programmatically
   */
  triggerFileInput(configId: number, type?: AttachmentsConfigType): void {
    const typeStr = type === AttachmentsConfigType.RequestAnEventOrDonationCampaignPermit 
      ? 'permit' 
      : type === AttachmentsConfigType.RequestAnEventAnnouncementOrDonationCampaign
      ? 'reqAd'
      : '';
    const fileInput = document.getElementById(`file-${typeStr}-${configId}`) as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    }
  }

  /**
   * Remove existing attachment (mark for deletion)
   */
  removeExistingFile(configId: number): void {
    const existingAttachment = this.existingAttachments[configId];
    if (!existingAttachment) return;
    
    // Show confirmation dialog
    const confirmMessage = this.translate.instant('EDIT_PROFILE.CONFIRM_DELETE_ATTACHMENT') || 'Are you sure you want to delete this attachment?';
    if (confirm(confirmMessage)) {
      // Mark for deletion (will be processed during form submission)
      this.attachmentsToDelete[configId] = existingAttachment.id;
      
      // Remove from UI - this will show the upload area
      delete this.existingAttachments[configId];
      
      // Remove from state previews
      const mainAttachType = AttachmentsConfigType.RequestAnEventOrDonationCampaignPermit;
      const state = this.ensureState(mainAttachType);
      delete state.previews[configId];
      
      this.toastr.success(
        this.translate.instant('EDIT_PROFILE.ATTACHMENT_MARKED_FOR_DELETION') || 'Attachment marked for deletion'
      );
    }
  }

  // ==============
  getValidAttachments(
    type: AttachmentsConfigType
  ): RequestPlaintAttachmentDto[] {
    const s = this.ensureState(type);
    return s.items.filter((a) => a.fileBase64 && a.fileName);
  }

  getAllValidAttachments(
    types: AttachmentsConfigType[]
  ): Record<AttachmentsConfigType, RequestPlaintAttachmentDto[]> {
    const result = {} as Record<
      AttachmentsConfigType,
      RequestPlaintAttachmentDto[]
    >;
    types.forEach((t) => (result[t] = this.getValidAttachments(t)));
    return result;
  }

  hasMissingRequiredAttachments(type: AttachmentsConfigType): boolean {
    const s = this.ensureState(type);
    return (s.configs || [])
      .filter((c) => (c as any).required === true)
      .some((c) => {
        const a = s.items.find((x) => x.attConfigID === c.id);
        return !a || !a.fileBase64 || !a.fileName;
      });
  }

  validateRequiredForAll(types: AttachmentsConfigType[]): boolean {
    return types.every((t) => !this.hasMissingRequiredAttachments(t));
  }

  // ============== reset/clear ==============
  resetAttachments(type: AttachmentsConfigType): void {
    const s = this.ensureState(type);
    s.items.forEach((it) => {
      it.fileBase64 = '';
      it.fileName = '';
    });
    s.selected = {};
    s.previews = {};
  }
  loadAttachmentConfigs(type: AttachmentsConfigType): void {
    const s = this.ensureState(type);
    s.sub?.unsubscribe();

    s.sub = this.attachmentService
      .getAttachmentsConfigByType(type, true)
      .subscribe({
        next: (configs) => {
          s.configs = configs || [];
          s.items = s.configs.map((cfg) => ({
            fileBase64: '',
            fileName: '',
            masterId: 0,
            attConfigID: cfg.id!,
          }));
          s.selected = {};
          s.previews = {};
        },
        error: (e) =>{}
        });
  }
  ////////////////////////////////////////////// end attachment functions

  // Navigation methods
  nextStep(): void {
    // Auto-add partner if leaving partners step (step 2)
    if (this.currentStep === 2) {
      this.tryAutoAddPartner();
    }

    // Auto-add advertisement if leaving advertisements step (step 3)
    if (this.currentStep === 3) {
      this.tryAutoAddAdvertisement();
    }

    if (this.currentStep < this.totalSteps) {
      // Only validate if we're not in loading state and form is ready
      if (!this.isLoading && this.firstStepForm && this.isFormInitialized) {
        if (this.validateCurrentStep()) {
          this.currentStep++;
          this.visitedSteps.add(this.currentStep);
        }
      } else {
        this.currentStep++;
        this.visitedSteps.add(this.currentStep);
      }
    }
  }

  previousStep(): void {
    // Auto-add partner if leaving partners step (step 2)
    if (this.currentStep === 2) {
      this.tryAutoAddPartner();
    }

    // Auto-add advertisement if leaving advertisements step (step 3)
    if (this.currentStep === 3) {
      this.tryAutoAddAdvertisement();
    }

    if (this.currentStep > 1) {
      this.currentStep--;
      this.visitedSteps.add(this.currentStep);
    }
  }

  goToStep(step: number): void {
    // Auto-add partner if leaving partners step (step 2) and going to different step
    if (this.currentStep === 2 && step !== 2) {
      this.tryAutoAddPartner();
    }

    // Auto-add advertisement if leaving advertisements step (step 3) and going to different step
    if (this.currentStep === 3 && step !== 3) {
      this.tryAutoAddAdvertisement();
    }

    if (step >= 1 && step <= this.totalSteps) {
      this.currentStep = step;
      this.visitedSteps.add(step);
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

    if (form.hasError('dateRange') || form.errors?.['dateRange']) return false;

    const get = (k: string) => form.get(k);
    const val = (k: string) => get(k)?.value;

    const addErr = (k: string, key: string) => {
      const c = get(k);
      if (!c) return;
      const curr = c.errors || {};
      curr[key] = true;
      c.setErrors(curr);
      c.markAsTouched();
    };

    const isNonEmptyString = (v: unknown) =>
      typeof v === 'string' && v.trim().length > 0;
    const maxLen = (v: unknown, n: number) =>
      typeof v === 'string' && v.trim().length <= n;
    const withinLen = (v: unknown, min: number, max: number) =>
      typeof v === 'string' && v.trim().length >= min && v.trim().length <= max;

    // RFC3339: 2025-08-21T02:21:57Z
    const rfc3339 =
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,9})?(Z|[+\-]\d{2}:\d{2})$/;
    const isRfc3339 = (s: unknown) =>
      typeof s === 'string' && rfc3339.test(s) && !Number.isNaN(Date.parse(s));

    const phoneRe = /^[\d\s\-\+\(\)]+$/;
    const isPhone = (s: unknown) =>
      typeof s === 'string' && withinLen(s, 7, 20) && phoneRe.test(s.trim());

    const isEnum123 = (v: unknown) => {
      const n = typeof v === 'string' ? Number(v) : v;
      return Number.isInteger(n) && (n as number) >= 1 && (n as number) <= 3;
    };

    let ok = true;

    // 1)required
    (
      [
        // ['userId', 450],
        // ['requestSide', 200],
        // ['supervisingSide', 200],
        ['eventName', 200],
        // ['eventLocation', 500],
        ['admin', 200],
        // ['delegateName', 200],
        // ['alternateName', 100],
      ] as const
    ).forEach(([k, max]) => {
      const v = val(k);
      if (!isNonEmptyString(v)) {
        addErr(k, 'required');
        ok = false;
        return;
      }
      if (!maxLen(v, max)) {
        addErr(k, 'maxlength');
        ok = false;
      }
    });

    (['adminTel'] as const).forEach((k) => {
      const v = val(k);
      if (!isNonEmptyString(v)) {
        addErr(k, 'required');
        ok = false;
        return;
      }
      if (!isPhone(v)) {
        addErr(k, 'phone');
        ok = false;
      }
    });

    // 3) startDate / endDate
    (['startDate', 'endDate'] as const).forEach((k) => {
      const v = val(k);
      if (!isNonEmptyString(v)) {
        addErr(k, 'required');
        ok = false;
        return;
      }
      if (!isRfc3339(v)) {
        addErr(k, 'dateTime');
        ok = false;
      }
    });

    const startStr = val('startDate');
    const endStr = val('endDate');
    if (isRfc3339(startStr) && isRfc3339(endStr)) {
      const start = new Date(startStr);
      const end = new Date(endStr);
      if (start > end) {
        addErr('startDate', 'range');
        addErr('endDate', 'range');
        ok = false;
      }
    }

    // requestDate
    const reqDate = val('requestDate');
    if (reqDate != null && reqDate !== '' && !isRfc3339(reqDate)) {
      addErr('requestDate', 'dateTime');
      ok = false;
    }

    // AM/PM
    (['amStartTime', 'amEndTime', 'pmStartTime', 'pmEndTime'] as const).forEach(
      (k) => {
        const v = val(k);
        if (v != null && v !== '' && !isRfc3339(v)) {
          addErr(k, 'dateTime');
          ok = false;
        }
      }
    );

    // 4) Enums: lkpRequestTypeId / lkpPermitTypeId
    (['lkpRequestTypeId'] as const).forEach((k) => {
      const v = val(k);
      if (v === null || v === undefined || `${v}`.trim() === '') {
        addErr(k, 'required');
        ok = false;
      } else if (!isEnum123(v)) {
        addErr(k, 'enum');
        ok = false;
      }
    });

    const email = val('email');
    if (email != null && `${email}`.trim() !== '') {
      const emailStr = String(email).trim();
      const basicEmailRe = /^[^@]+@[^@]+$/;
      if (emailStr.length > 50) {
        addErr('email', 'maxlength');
        ok = false;
      }
      if (!basicEmailRe.test(emailStr)) {
        addErr('email', 'email');
        ok = false;
      }
    }

    // 6) notes
    const notes = val('notes');
    if (typeof notes === 'string' && notes.trim().length > 4000) {
      addErr('notes', 'maxlength');
      ok = false;
    }

    // 7) targetedAmount - required field
    const targetedAmount = val('targetedAmount');
    if (targetedAmount === null || targetedAmount === undefined || `${targetedAmount}`.trim() === '') {
      addErr('targetedAmount', 'required');
      ok = false;
    } else {
      const n = Number(targetedAmount);
      if (!Number.isFinite(n) || n < 0) {
        addErr('targetedAmount', 'min');
        ok = false;
      }
    }
    const channels = val('donationCollectionChannelIds');
    if (channels !== null && channels !== undefined && `${channels}` !== '') {
      if (
        !Array.isArray(channels) ||
        !channels.every((x) =>
          Number.isInteger(typeof x === 'string' ? Number(x) : x)
        )
      ) {
        addErr('donationCollectionChannelIds', 'arrayOfIntegers');
        ok = false;
      }
    }

    // 8) Identity Card Reading Validation - Required for individual request type
    if (this.isIndividualRequestType()) {
      const beneficiaryIdNumber = val('beneficiaryIdNumber');
      if (beneficiaryIdNumber && isNonEmptyString(beneficiaryIdNumber)) {
        if (!this.isIdentityCardReadSuccessfully) {
          addErr('beneficiaryIdNumber', 'identityCardNotRead');
          ok = false;
        }
      }
    }

    return ok;
  }

  // Navigation methods end

  // Table management methods

  canSubmit(): boolean {
    if (this.currentStep !== this.totalSteps) return false;

    if (this.isSaving || !this.firstStepForm || !this.isFormInitialized)
      return false;

    if (!this.firstStepForm.valid || this.firstStepForm.hasError('dateRange'))
      return false;

    const mustHave = [
      // 'userId',
      // 'requestSide',
      // 'supervisingSide',
      'eventName',
      // 'eventLocation',
      'admin',
      // 'delegateName',
      // 'alternateName',
      'targetedAmount',
    ];
    const allHaveValues = mustHave.every((k) => {
      const c = this.firstStepForm.get(k);
      return !!(
        c &&
        c.value !== null &&
        c.value !== undefined &&
        `${c.value}`.trim() !== ''
      );
    });
    if (!allHaveValues) return false;

    // const channels: number[] =
    //   this.firstStepForm.get('donationCollectionChannelIds')?.value || [];
    // if (!channels.length) return false;

    const mainAttachType =
      AttachmentsConfigType.RequestAnEventAnnouncementOrDonationCampaign;
    if (this.hasMissingRequiredAttachments(mainAttachType)) return false;

    // Identity Card Reading Validation - Required for individual request type
    if (this.isIndividualRequestType()) {
      const beneficiaryIdNumber = this.firstStepForm.get('beneficiaryIdNumber')?.value;
      if (beneficiaryIdNumber && `${beneficiaryIdNumber}`.trim() !== '') {
        if (!this.isIdentityCardReadSuccessfully) {
          return false;
        }
      }
    }

    // const withAd =
    //   Number(this.firstStepForm.get('advertisementType')?.value ?? 0) === 1;
    // if (withAd && this.requestAdvertisements.length === 0) return false;

    return true;
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
   * Handle attachment operations (create, update, delete) for main request in update mode
   */
  async handleMainAttachmentOperations(): Promise<void> {
    const attachmentPromises: Promise<any>[] = [];
    
    // First handle deletions
    if (Object.keys(this.attachmentsToDelete).length > 0) {
      try {
        await this.deleteAttachments(this.attachmentsToDelete);
      } catch (error) {
        console.error('Error deleting attachments:', error);
        throw error;
      }
    }
    
    // Then handle new file uploads and updates
    const mainAttachType = AttachmentsConfigType.RequestAnEventOrDonationCampaignPermit;
    const state = this.ensureState(mainAttachType);
    
    for (const [configId, file] of Object.entries(state.selected)) {
      const configIdNum = parseInt(configId);
      const existingAttachment = this.existingAttachments[configIdNum];
      
      if (existingAttachment) {
        // Update existing attachment
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
        // Create new attachment
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
        const toISO = (input: string | Date) => {
          const s =
            typeof input === 'string' && input.length === 16
              ? input + ':00'
              : input;
          const d = new Date(s as any);
          return d.toISOString().replace(/\.\d{3}Z$/, 'Z');
        };

        const partnerDto: any = {
          name: partner.name,
          nameEn: partner.nameEn,
          type: partner.type,
          licenseIssuer: partner.licenseIssuer || undefined,
          licenseExpiryDate: partner.licenseExpiryDate
            ? toISO(partner.licenseExpiryDate)
            : undefined,
          licenseNumber: partner.licenseNumber || undefined,
          contactDetails: partner.contactDetails ? `971${partner.contactDetails}` : undefined,
          jobRequirementsDetails: partner.jobRequirementsDetails || undefined,
          mainApplyServiceId: this.mainApplyServiceId || 0,
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
    // Note: For update, we only send new attachments (files that were selected)
    // Existing attachments are handled separately via attachment service
    const getAdvertisementAttachmentsForUpdate = async (adIndex: number): Promise<any[]> => {
      const attachments: any[] = [];

      // Get newly selected files from state and convert to base64
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

      // Note: Existing attachments are not included in update DTO
      // They are handled separately via attachment service if needed
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
          // For existing advertisements, if we're submitting (not draft), set isDraft = false
          // If we're saving as draft, keep the existing isDraft value or set to true
          const advertisementIsDraft = isDraft ? true : false;

          // Get new attachments if any (files that were selected but not yet uploaded)
          const adAttachments = await getAdvertisementAttachmentsForUpdate(i);

          const updateDto: any = {
            id: advertisement.id,
            parentId: this.mainApplyServiceId || null, // parentId like partner - use mainApplyServiceId
            mainApplyServiceId: advertisement.mainApplyServiceId || this.mainApplyServiceId || null,
            // Only include requestNo if it's a valid number (not null/undefined/0)
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
            requestEventPermitId: advertisement.requestEventPermitId || this.requestEventPermitId || null,
            notes: advertisement.notes || null,
            isDraft: advertisementIsDraft,
            // Only include attachments if there are new files to upload
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

          // Note: Existing attachments deletion is handled separately via attachment service
          // New attachments are included in the updateDto above
        } catch (error) {
          console.error('Error updating advertisement:', error);
          throw error;
        }
      } else {
        // Create new advertisement using Create API
        try {
          // Get attachments for this advertisement - need to convert files to base64
          const adAttachType = AttachmentsConfigType.RequestAnEventAnnouncementOrDonationCampaign;
          const state = this.state(adAttachType);
          const attachments: any[] = [];

          // Get newly selected files and convert to base64
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

          const createDto: any = {
            parentId: this.mainApplyServiceId || null, // parentId like partner - use mainApplyServiceId
            mainApplyServiceId: this.mainApplyServiceId || null,
            // Only include requestNo if it's a valid number (not null/undefined/0)
            // In create mode, requestNo is typically set by the backend
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
            requestEventPermitId: this.requestEventPermitId || null,
            notes: advertisement.notes || null,
            isDraft: isDraft, // Use isDraft parameter - true for draft, false for submit
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

  /**
   * Handle advertisement creation in create mode (after main request is created)
   */
  async handleAdvertisementOperationsCreate(isDraft: boolean = false): Promise<void> {
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

    // Create all advertisements using the Create API
    for (let i = 0; i < this.requestAdvertisements.length; i++) {
      const advertisement = this.requestAdvertisements[i];
      
      try {
        // Get attachments for this advertisement - need to convert files to base64
        const adAttachType = AttachmentsConfigType.RequestAnEventAnnouncementOrDonationCampaign;
        const state = this.state(adAttachType);
        const attachments: any[] = [];

        // Get attachments from advertisement.attachments (stored when addAdvertisement was called)
        // These attachments are already in the correct format from getValidAttachments
        // RequestAdvertisementAttachment contains: fileBase64, fileName, masterId, attConfigID
        if (advertisement.attachments && advertisement.attachments.length > 0) {
          // Attachments are already in the correct format - just use them directly
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
          parentId: this.mainApplyServiceId || null, // parentId like partner - use mainApplyServiceId
          mainApplyServiceId: this.mainApplyServiceId || null,
          // Only include requestNo if it's a valid number (not null/undefined/0)
          // In create mode, requestNo is typically set by the backend
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
          requestEventPermitId: this.requestEventPermitId || null,
          notes: advertisement.notes || null,
          isDraft: isDraft, // Use isDraft parameter - true for draft, false for submit
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

  // Submit form
  async onSubmit(isDraft: boolean = false): Promise<void> {
    if (this.isSaving) return;

    this.submitted = true;
    // For draft, we don't need strict validation - allow saving even if form is incomplete
    // For final submit, we need all validations to pass
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

      // Check if we're in update mode
      const isUpdateMode = !!this.requestEventPermitId && !!this.mainApplyServiceId;

      if (isUpdateMode) {
        // Update mode - handle attachments, partners, and advertisements separately
        try {
          await this.handleMainAttachmentOperations();
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

        try {
          await this.handleAdvertisementOperations(isDraft);
        } catch (advertisementError) {
          console.error('Error handling advertisements:', advertisementError);
          this.toastr.warning(
            this.translate.instant('ERRORS.FAILED_SAVE_ADVERTISEMENTS') || 'Warning saving advertisements'
          );
        }

        // helpers
        const toISO = (input: string | Date) => {
          const s =
            typeof input === 'string' && input.length === 16
              ? input + ':00'
              : input;
          const d = new Date(s as any);
          return d.toISOString().replace(/\.\d{3}Z$/, 'Z');
        };

        const formData = this.firstStepForm.value;
        const updatePayload: any = {
          id: this.requestEventPermitId!,
          mainApplyServiceId: this.mainApplyServiceId!,
          requestDate: toISO(formData.requestDate ?? new Date()),
          lkpRequestTypeId: +formData.lkpRequestTypeId,
          requestSide: formData.requestSide || '',
          supervisingSide: formData.supervisingSide || null,
          eventName: formData.eventName || '',
          startDate: toISO(formData.startDate),
          endDate: toISO(formData.endDate),
          lkpPermitTypeId: formData.lkpPermitTypeId,
          eventLocation: formData.eventLocation || null,
          admin: formData.admin || '',
          delegateName: formData.delegateName || null,
          alternateName: formData.alternateName || null,
          adminTel: formData.adminTel ? `971${formData.adminTel}` : null,
          telephone: formData.telephone ? `971${formData.telephone}` : null,
          email: formData.email || null,
          notes: formData.notes || null,
          targetedAmount: formData.targetedAmount || null,
          beneficiaryIdNumber: formData.beneficiaryIdNumber || null,
          isDraft: isDraft,
          donationCollectionChannelIds: formData.donationCollectionChannelIds || [],
        };

        const sub = this._CharityEventPermitRequestService
          .updateRequestEvent(updatePayload)
          .subscribe({
            next: (res) => {
              if (isDraft) {
                this.toastr.success(
                  this.translate.instant('SUCCESS.REQUEST_SAVED_AS_DRAFT') || 'Request saved as draft'
                );
              } else {
                // If the original request was a draft (serviceStatus === 5) and now being submitted, show "created" message instead of "updated"
                const wasDraft = this.loadformData?.serviceStatus === 5;
                if (wasDraft) {
                  this.toastr.success(
                    this.translate.instant('SUCCESS.REQUEST_Project_Campaign') || 'Request created successfully'
                  );
                } else {
                  this.toastr.success(
                    this.translate.instant('SUCCESS.REQUEST_UPDATED') || 'Request updated successfully'
                  );
                }
              }
              this.router.navigate(['/request']);
              this.isSaving = false;
            },
            error: (error: any) => {
              if (error.error && error.error.reason) {
                this.toastr.error(error.error.reason);
              } else {
                if (isDraft) {
                  this.toastr.error(
                    this.translate.instant('ERRORS.FAILED_SAVE_DRAFT') || 'Failed to save draft'
                  );
                } else {
                  // If the original request was a draft (serviceStatus === 5) and now being submitted, show "create" error message instead of "update"
                  const wasDraft = this.loadformData?.serviceStatus === 5;
                  if (wasDraft) {
                    this.toastr.error(
                      this.translate.instant('ERRORS.FAILED_CREATE_REQUEST_EVENT_PERMIT') || 'Failed to create request'
                    );
                  } else {
                    this.toastr.error(
                      this.translate.instant('ERRORS.FAILED_UPDATE_REQUEST_EVENT_PERMIT') || 'Failed to update request'
                    );
                  }
                }
              }
              this.isSaving = false;
            },
          });
        this.subscriptions.push(sub);
      } else {
        // Create mode
        // helpers
        const toISO = (input: string | Date) => {
          const s =
            typeof input === 'string' && input.length === 16
              ? input + ':00'
              : input;
          const d = new Date(s as any);
          return d.toISOString().replace(/\.\d{3}Z$/, 'Z');
        };

        const mainAttachType =
          AttachmentsConfigType.RequestAnEventOrDonationCampaignPermit;
        const mainAttachments = this.getValidAttachments(mainAttachType).map(
          (a) => ({
            ...a,
            masterId: a.masterId || 0,
          })
        );

        const formData = this.firstStepForm.value;

        // Don't include advertisements in the main create payload - they will be created separately
        const payload: any = {
          ...formData,
          lkpPermitTypeId: formData.lkpPermitTypeId,
          lkpRequestTypeId: +formData.lkpRequestTypeId,

          requestDate: toISO(formData.requestDate ?? new Date()),
          startDate: toISO(formData.startDate),
          endDate: toISO(formData.endDate),
          adminTel: `971${formData.adminTel}`, // Add 971 prefix
          telephone: formData.telephone ? `971${formData.telephone}` : null, // Add 971 prefix

          scIdentityCardReaderId: this.identityCardData?.id || null, // Add identity card reader ID
          requestAdvertisements: [], // Don't include advertisements - they will be created separately
          attachments: mainAttachments,
          partners: (this.partners || []).map((p) => ({
            name: p.name,
            nameEn: p.nameEn,
            type: Number(p.type),
            licenseIssuer: p.licenseIssuer ?? null,
            licenseExpiryDate: p.licenseExpiryDate
              ? toISO(p.licenseExpiryDate)
              : null,
            licenseNumber: p.licenseNumber ?? null,
            contactDetails: p.contactDetails ? `971${p.contactDetails}` : null,
            jobRequirementsDetails: p.jobRequirementsDetails ?? null,
            mainApplyServiceId: null, // Will be set by backend
            attachments: p.attachments || [],
          })),
          isDraft: isDraft,
        };

        const sub = this._CharityEventPermitRequestService
          .createRequestEvent(payload)
          .subscribe({
            next: async (res) => {
              // After creating the main request, get the mainApplyServiceId and requestEventPermitId
              const createdMainApplyServiceId = res?.id || res?.mainApplyServiceId || null;
              const createdRequestEventPermitId = res?.requestEventPermit?.id || res?.requestEventPermitId || null;

              // Update the component's IDs for advertisement creation
              if (createdMainApplyServiceId) {
                this.mainApplyServiceId = createdMainApplyServiceId;
              }
              if (createdRequestEventPermitId) {
                this.requestEventPermitId = createdRequestEventPermitId;
              }

              // Now create advertisements separately using the Create API
              if (this.requestAdvertisements.length > 0) {
                try {
                  await this.handleAdvertisementOperationsCreate(isDraft);
                } catch (advertisementError) {
                  console.error('Error creating advertisements:', advertisementError);
                  this.toastr.warning(
                    this.translate.instant('ERRORS.FAILED_SAVE_ADVERTISEMENTS') || 'Warning saving advertisements'
                  );
                }
              }

              if (isDraft) {
                this.toastr.success(
                  this.translate.instant('SUCCESS.REQUEST_SAVED_AS_DRAFT') || 'Request saved as draft'
                );
              } else {
                this.toastr.success(
                  this.translate.instant('SUCCESS.REQUEST_Project_Campaign')
                );
              }
              this.router.navigate(['/request']);
              this.isSaving = false;
            },
            error: (error: any) => {
              if (error.error && error.error.reason) {
                this.toastr.error(error.error.reason);
              } else {
                if (isDraft) {
                  this.toastr.error(
                    this.translate.instant('ERRORS.FAILED_SAVE_DRAFT') || 'Failed to save draft'
                  );
                } else {
                  this.toastr.error(
                    this.translate.instant('ERRORS.FAILED_CREATE_REQUEST_EVENT_PERMIT') || 'Failed to create request'
                  );
                }
              }
              this.isSaving = false;
            },
          });
        this.subscriptions.push(sub);
      }
    } catch (error: any) {
      if (error.error && error.error.reason) {
        this.toastr.error(error.error.reason);
      } else {
        if (isDraft) {
          this.toastr.error(
            this.translate.instant('ERRORS.FAILED_SAVE_DRAFT') || 'Failed to save draft'
          );
        } else {
          this.toastr.error(
            this.translate.instant('ERRORS.FAILED_CREATE_REQUEST_EVENT_PERMIT') || 'Failed to create request'
          );
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
    if (this.isSaving) return;

    this.submitted = true;
    // For draft, we don't need strict validation - allow saving even if form is incomplete
    // For final submit, we need all validations to pass
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

      // Check if we're in update mode
      const isUpdateMode = !!this.requestEventPermitId && !!this.mainApplyServiceId;

      if (isUpdateMode) {
        // Update mode - handle attachments, partners, and advertisements separately
        try {
          await this.handleMainAttachmentOperations();
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

        try {
          await this.handleAdvertisementOperations(isDraft);
        } catch (advertisementError) {
          console.error('Error handling advertisements:', advertisementError);
          this.toastr.warning(
            this.translate.instant('ERRORS.FAILED_SAVE_ADVERTISEMENTS') || 'Warning saving advertisements'
          );
        }

        // helpers
        const toISO = (input: string | Date) => {
          const s =
            typeof input === 'string' && input.length === 16
              ? input + ':00'
              : input;
          const d = new Date(s as any);
          return d.toISOString().replace(/\.\d{3}Z$/, 'Z');
        };

        const formData = this.firstStepForm.value;
        const normalizedFormData = this.normalizeEmptyStrings(formData);

        const updatePayload: any = {
          id: this.requestEventPermitId!,
          mainApplyServiceId: this.mainApplyServiceId!,
          requestDate: toISO(normalizedFormData.requestDate ?? new Date()),
          lkpRequestTypeId: +normalizedFormData.lkpRequestTypeId,
          requestSide: normalizedFormData.requestSide || '',
          supervisingSide: normalizedFormData.supervisingSide || null,
          eventName: normalizedFormData.eventName || '',
          startDate: toISO(normalizedFormData.startDate),
          endDate: toISO(normalizedFormData.endDate),
          lkpPermitTypeId: normalizedFormData.lkpPermitTypeId,
          eventLocation: normalizedFormData.eventLocation || null,
          admin: normalizedFormData.admin || '',
          delegateName: normalizedFormData.delegateName || null,
          alternateName: normalizedFormData.alternateName || null,
          adminTel: normalizedFormData.adminTel ? `971${normalizedFormData.adminTel}` : null,
          telephone: normalizedFormData.telephone ? `971${normalizedFormData.telephone}` : null,
          email: normalizedFormData.email || null,
          notes: normalizedFormData.notes || null,
          targetedAmount: normalizedFormData.targetedAmount || null,
          beneficiaryIdNumber: normalizedFormData.beneficiaryIdNumber || null,
          isDraft: isDraft,
          donationCollectionChannelIds: normalizedFormData.donationCollectionChannelIds || [],
        };

        const sub = this._CharityEventPermitRequestService
          .updateRequestEvent(updatePayload)
          .subscribe({
            next: (res) => {
              if (isDraft) {
                this.toastr.success(
                  this.translate.instant('SUCCESS.REQUEST_SAVED_AS_DRAFT') || 'Request saved as draft'
                );
              } else {
                // If the original request was a draft (serviceStatus === 5) and now being submitted, show "created" message instead of "updated"
                const wasDraft = this.loadformData?.serviceStatus === 5;
                if (wasDraft) {
                  this.toastr.success(
                    this.translate.instant('SUCCESS.REQUEST_Project_Campaign') || 'Request created successfully'
                  );
                } else {
                  this.toastr.success(
                    this.translate.instant('SUCCESS.REQUEST_UPDATED') || 'Request updated successfully'
                  );
                }
              }
              this.router.navigate(['/request']);
              this.isSaving = false;
            },
            error: (error: any) => {
              if (error.error && error.error.reason) {
                this.toastr.error(error.error.reason);
              } else {
                if (isDraft) {
                  this.toastr.error(
                    this.translate.instant('ERRORS.FAILED_SAVE_DRAFT') || 'Failed to save draft'
                  );
                } else {
                  // If the original request was a draft (serviceStatus === 5) and now being submitted, show "create" error message instead of "update"
                  const wasDraft = this.loadformData?.serviceStatus === 5;
                  if (wasDraft) {
                    this.toastr.error(
                      this.translate.instant('ERRORS.FAILED_CREATE_REQUEST_EVENT_PERMIT') || 'Failed to create request'
                    );
                  } else {
                    this.toastr.error(
                      this.translate.instant('ERRORS.FAILED_UPDATE_REQUEST_EVENT_PERMIT') || 'Failed to update request'
                    );
                  }
                }
              }
              this.isSaving = false;
            },
          });
        this.subscriptions.push(sub);
      } else {
        // Create mode
        // helpers
        const toISO = (input: string | Date) => {
          const s =
            typeof input === 'string' && input.length === 16
              ? input + ':00'
              : input;
          const d = new Date(s as any);
          return d.toISOString().replace(/\.\d{3}Z$/, 'Z');
        };

        const mainAttachType =
          AttachmentsConfigType.RequestAnEventOrDonationCampaignPermit;
        const mainAttachments = this.getValidAttachments(mainAttachType).map(
          (a) => ({
            ...a,
            masterId: a.masterId || 0,
          })
        );

        const formData = this.firstStepForm.value;
        const normalizedFormData = this.normalizeEmptyStrings(formData);

        // Don't include advertisements in the main create payload - they will be created separately
        const payload: any = {
          ...normalizedFormData,
          lkpPermitTypeId: normalizedFormData.lkpPermitTypeId,
          lkpRequestTypeId: +normalizedFormData.lkpRequestTypeId,

          requestDate: toISO(normalizedFormData.requestDate ?? new Date()),
          startDate: toISO(normalizedFormData.startDate),
          endDate: toISO(normalizedFormData.endDate),
          adminTel: `971${normalizedFormData.adminTel}`, // Add 971 prefix
          telephone: normalizedFormData.telephone ? `971${normalizedFormData.telephone}` : null, // Add 971 prefix

          scIdentityCardReaderId: this.identityCardData?.id || null, // Add identity card reader ID
          requestAdvertisements: [], // Don't include advertisements - they will be created separately
          attachments: mainAttachments,
          partners: (this.partners || []).map((p) => ({
            name: p.name,
            nameEn: p.nameEn,
            type: Number(p.type),
            licenseIssuer: p.licenseIssuer ?? null,
            licenseExpiryDate: p.licenseExpiryDate
              ? toISO(p.licenseExpiryDate)
              : null,
            licenseNumber: p.licenseNumber ?? null,
            contactDetails: p.contactDetails ? `971${p.contactDetails}` : null,
            jobRequirementsDetails: p.jobRequirementsDetails ?? null,
            mainApplyServiceId: null, // Will be set by backend
            attachments: p.attachments || [],
          })),
          isDraft: isDraft,
        };

        const sub = this._CharityEventPermitRequestService
          .createRequestEvent(payload)
          .subscribe({
            next: async (res) => {
              // After creating the main request, get the mainApplyServiceId and requestEventPermitId
              const createdMainApplyServiceId = res?.id || res?.mainApplyServiceId || null;
              const createdRequestEventPermitId = res?.requestEventPermit?.id || res?.requestEventPermitId || null;

              // Update the component's IDs for advertisement creation
              if (createdMainApplyServiceId) {
                this.mainApplyServiceId = createdMainApplyServiceId;
              }
              if (createdRequestEventPermitId) {
                this.requestEventPermitId = createdRequestEventPermitId;
              }

              // Now create advertisements separately using the Create API
              if (this.requestAdvertisements.length > 0) {
                try {
                  await this.handleAdvertisementOperationsCreate(isDraft);
                } catch (advertisementError) {
                  console.error('Error creating advertisements:', advertisementError);
                  this.toastr.warning(
                    this.translate.instant('ERRORS.FAILED_SAVE_ADVERTISEMENTS') || 'Warning saving advertisements'
                  );
                }
              }

              if (isDraft) {
                this.toastr.success(
                  this.translate.instant('SUCCESS.REQUEST_SAVED_AS_DRAFT') || 'Request saved as draft'
                );
              } else {
                this.toastr.success(
                  this.translate.instant('SUCCESS.REQUEST_Project_Campaign')
                );
              }
              this.router.navigate(['/request']);
              this.isSaving = false;
            },
            error: (error: any) => {
              if (error.error && error.error.reason) {
                this.toastr.error(error.error.reason);
              } else {
                if (isDraft) {
                  this.toastr.error(
                    this.translate.instant('ERRORS.FAILED_SAVE_DRAFT') || 'Failed to save draft'
                  );
                } else {
                  this.toastr.error(
                    this.translate.instant('ERRORS.FAILED_CREATE_REQUEST_EVENT_PERMIT') || 'Failed to create request'
                  );
                }
              }
              this.isSaving = false;
            },
          });
        this.subscriptions.push(sub);
      }
    } catch (error: any) {
      if (error.error && error.error.reason) {
        this.toastr.error(error.error.reason);
      } else {
        if (isDraft) {
          this.toastr.error(
            this.translate.instant('ERRORS.FAILED_SAVE_DRAFT') || 'Failed to save draft'
          );
        } else {
          this.toastr.error(
            this.translate.instant('ERRORS.FAILED_CREATE_REQUEST_EVENT_PERMIT') || 'Failed to create request'
          );
        }
      }
      this.isSaving = false;
    }
  }

  isStepActive(step: number): boolean {
    return this.currentStep === step;
  }

  isStepCompleted(step: number): boolean {
    switch (step) {
      case 1:
        return this.validateStep1();
      case 2:
        // Partners step is optional - only completed if at least one partner is added
        return this.partners && this.partners.length > 0;
      case 3:
        // Advertisement step is optional - only completed if at least one advertisement is added
        return this.requestAdvertisements && this.requestAdvertisements.length > 0;
      case 4:
        // Attachments step - check if all mandatory attachments are uploaded
        // Only consider completed if configs are loaded and all mandatory attachments are present
        const mainAttachType = AttachmentsConfigType.RequestAnEventOrDonationCampaignPermit;
        const state = this.ensureState(mainAttachType);
        
        // If configs are not loaded yet, don't consider it completed
        if (!state.configs || state.configs.length === 0) {
          return false;
        }
        
        // Check each mandatory config
        const mandatoryConfigs = state.configs.filter(c => c.mendatory === true);
        
        // If no mandatory configs, consider it completed if visited
        if (mandatoryConfigs.length === 0) {
          return this.visitedSteps.has(4);
        }
        
        // Check if all mandatory attachments are present (either new file, existing attachment, or in items)
        return mandatoryConfigs.every(config => {
          const configId = config.id!;
          // Check if there's a selected file
          if (state.selected[configId]) {
            return true;
          }
          // Check if there's an existing attachment
          if (this.existingAttachments[configId]) {
            return true;
          }
          // Check if there's a file in items with base64
          const item = state.items.find(x => x.attConfigID === configId);
          if (item && item.fileBase64 && item.fileName) {
            return true;
          }
          return false;
        });
      default:
        return false;
    }
  }

  canProceedToNext(): boolean {
    // Only validate if user is actively trying to proceed, not during initial load
    if (this.isLoading || !this.firstStepForm || !this.isFormInitialized) {
      return this.currentStep < this.totalSteps;
    }
    return this.currentStep < this.totalSteps && this.validateCurrentStep();
  }

  public handleNextClick(): void {
    // Auto-add partner if leaving partners step (step 2)
    if (this.currentStep === 2) {
      this.tryAutoAddPartner();
    }

    // Auto-add advertisement if leaving advertisements step (step 3)
    if (this.currentStep === 3) {
      this.tryAutoAddAdvertisement();
    }

    this.submitted = true;
    this.firstStepForm.markAllAsTouched();

    const isValidStep1 =
      this.firstStepForm.valid && !this.firstStepForm.hasError('dateRange');

    if (this.currentStep === 1) {
      if (isValidStep1) {
        this.currentStep++;
        this.visitedSteps.add(this.currentStep);
      } else {
        this.toastr.error(this.translate.instant('VALIDATION.FORM_INVALID'));
      }
    } else {
      this.currentStep++;
      this.visitedSteps.add(this.currentStep);
    }
  }

  private renewRequiresOldPermValidator = (group: FormGroup) => {
    const reNewAd = group.get('reNewAd')?.value as boolean;
    const oldPermNumber = (group.get('oldPermNumber')?.value ?? '')
      .toString()
      .trim();
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
    this.advertForm.updateValueAndValidity({
      onlySelf: false,
      emitEvent: false,
    });
  }

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

    const adAttachType =
      AttachmentsConfigType.RequestAnEventAnnouncementOrDonationCampaign;
    if (this.hasMissingRequiredAttachments(adAttachType)) {
      this.toastr.error(this.translate.instant('VALIDATION.REQUIRED_FIELD'));
      return;
    }

    const v = this.advertForm.getRawValue();
    const toRFC3339 = (x: string) => (x ? new Date(x).toISOString() : x);

    const mainId = Number(v.mainApplyServiceId ?? 0);

    const adAttachments = this.getValidAttachments(adAttachType).map((a) => ({
      ...a,
      masterId: a.masterId || mainId,
    }));

    const ad: any = {
      parentId: this.mainApplyServiceId || mainId || null, // parentId like partner - use mainApplyServiceId
      mainApplyServiceId: mainId,
      // In create mode, requestNo is not set - it will be set by the backend
      // Only set requestNo if it's a valid number (not 0 or null)
      requestNo: (v.requestNo && v.requestNo !== 0) ? Number(v.requestNo) : null,

      serviceType: Number(v.serviceType) as any,
      workFlowServiceType: Number(v.workFlowServiceType) as any,

      requestDate: toRFC3339(v.requestDate)!,
      //  userId: v.userId,

      // provider: v.provider ?? null,
      adTitle: v.adTitle,
      // adLang: v.adLang,

      startDate: toRFC3339(v.startDate)!,
      endDate: toRFC3339(v.endDate)!,

      // mobile: v.mobile ?? null,
      // supervisorName: v.supervisorName ?? null,
      // fax: v.fax ?? null,
      // eMail: v.eMail ?? null,

      // targetedAmount: v.targetedAmount != null ? Number(v.targetedAmount) : null,

      // newAd: v.newAd === true ? true : (v.reNewAd ? false : true),
      // reNewAd: v.reNewAd === true ? true : false,
      // oldPermNumber: v.oldPermNumber ?? null,
      notes: v.notes ?? null,
      requestEventPermitId:
        v.requestEventPermitId != null ? Number(v.requestEventPermitId) : null,

      attachments: adAttachments,

      requestAdvertisementTargets: (v.targetTypeIds || []).map((id: any) => ({
        mainApplyServiceId: mainId,
        lkpTargetTypeId: Number(id),
        othertxt: null,
      })),

      requestAdvertisementAdMethods: (v.adMethodIds || []).map((id: any) => ({
        mainApplyServiceId: mainId,
        lkpAdMethodId: Number(id),
        othertxt: null,
      })),

      requestAdvertisementAdLocations: this.adLocations.map((loc) => ({
        mainApplyServiceId: mainId,
        location: loc,
      })),
    };

    this.requestAdvertisements.push(ad);

    this.resetAttachments(adAttachType);

    this.advertForm.reset({
      serviceType: 1,
      workFlowServiceType: 1,
      requestDate: new Date().toISOString(),
      // userId: v.userId,
      // adLang: 'ar',
      // newAd: true,
      // reNewAd: false,
      targetTypeIds: [],
      adMethodIds: [],
    });
    this.adLocations = [];
    this.submitted = false;
    this.toastr.success(this.translate.instant('SUCCESS.AD_ADDED'));
  }

  removeAdvertisement(i: number): void {
    const advertisement = this.requestAdvertisements[i];
    
    // If advertisement has an id, it's an existing advertisement - mark for deletion
    if (advertisement?.id) {
      this.advertisementsToDelete.push(advertisement.id);
      // Also remove from existingAdvertisements if it's there
      const existingIndex = this.existingAdvertisements.findIndex(ad => ad.id === advertisement.id);
      if (existingIndex !== -1) {
        this.existingAdvertisements.splice(existingIndex, 1);
      }
    }
    
    // Remove from display array
    this.requestAdvertisements.splice(i, 1);
    this.toastr.success(this.translate.instant('SUCCESS.AD_REMOVED') || 'Advertisement removed');
  }

  /**
   * Check if advertisement form has any data filled in
   */
  private hasAdvertisementFormData(): boolean {
    if (!this.advertForm) return false;
    
    const values = this.advertForm.getRawValue();
    const hasLocations = this.adLocations && this.adLocations.length > 0;
    
    // Check if any field has a value (not null, undefined, or empty string)
    return (
      (values.adTitle?.toString().trim() || '').length > 0 ||
      (values.startDate?.toString().trim() || '').length > 0 ||
      (values.endDate?.toString().trim() || '').length > 0 ||
      (values.targetTypeIds?.length || 0) > 0 ||
      (values.adMethodIds?.length || 0) > 0 ||
      hasLocations ||
      (values.targetedAmount !== null && values.targetedAmount !== undefined) ||
      (values.notes?.toString().trim() || '').length > 0 ||
      this.hasAdvertisementAttachments()
    );
  }

  /**
   * Check if there are any attachments selected for advertisement
   */
  private hasAdvertisementAttachments(): boolean {
    const adAttachType = AttachmentsConfigType.RequestAnEventAnnouncementOrDonationCampaign;
    const state = this.ensureState(adAttachType);
    return Object.keys(state.selected).length > 0 || 
           state.items.some(item => item.fileBase64 && item.fileName);
  }

  /**
   * Validate advertisement form data
   */
  private validateAdvertisementForm(): boolean {
    if (!this.advertForm) return false;

    const hasLocations = this.adLocations && this.adLocations.length > 0;
    
    // Check form validity
    if (!this.advertForm.valid) {
      return false;
    }

    // Check for date range errors
    if (this.advertForm.hasError('dateRange')) {
      return false;
    }

    // Check for oldPermRequired error
    if (this.advertForm.hasError('oldPermRequired')) {
      return false;
    }

    // Check locations
    if (!hasLocations) {
      return false;
    }

    // Check required attachments
    const adAttachType = AttachmentsConfigType.RequestAnEventAnnouncementOrDonationCampaign;
    if (this.hasMissingRequiredAttachments(adAttachType)) {
      return false;
    }

    return true;
  }

  /**
   * Auto-add advertisement if form has data before navigating away from advertisements step
   */
  private tryAutoAddAdvertisement(): void {
    // Only try to add if we have data in the form
    if (!this.hasAdvertisementFormData()) {
      return;
    }

    // Validate the advertisement form
    if (!this.validateAdvertisementForm()) {
      const message = this.translate.instant('VALIDATION.ADVERTISEMENT_DATA_INCOMPLETE') || 
                      'Please complete or correct the advertisement information, or clear the form to continue.';
      this.toastr.warning(message, this.translate.instant('COMMON.WARNING') || 'Warning');
      return;
    }

    // If valid, add the advertisement automatically
    const adAttachType = AttachmentsConfigType.RequestAnEventAnnouncementOrDonationCampaign;
    const v = this.advertForm.getRawValue();
    const toRFC3339 = (x: string) => (x ? new Date(x).toISOString() : x);
    const mainId = Number(v.mainApplyServiceId ?? 0);

    const adAttachments = this.getValidAttachments(adAttachType).map((a) => ({
      ...a,
      masterId: a.masterId || mainId,
    }));

    const ad: any = {
      parentId: this.mainApplyServiceId || mainId || null,
      mainApplyServiceId: mainId,
      requestNo: (v.requestNo && v.requestNo !== 0) ? Number(v.requestNo) : null,
      serviceType: Number(v.serviceType) as any,
      workFlowServiceType: Number(v.workFlowServiceType) as any,
      requestDate: toRFC3339(v.requestDate)!,
      adTitle: v.adTitle,
      startDate: toRFC3339(v.startDate)!,
      endDate: toRFC3339(v.endDate)!,
      notes: v.notes ?? null,
      requestEventPermitId: v.requestEventPermitId != null ? Number(v.requestEventPermitId) : null,
      attachments: adAttachments,
      requestAdvertisementTargets: (v.targetTypeIds || []).map((id: any) => ({
        mainApplyServiceId: mainId,
        lkpTargetTypeId: Number(id),
        othertxt: null,
      })),
      requestAdvertisementAdMethods: (v.adMethodIds || []).map((id: any) => ({
        mainApplyServiceId: mainId,
        lkpAdMethodId: Number(id),
        othertxt: null,
      })),
      requestAdvertisementAdLocations: this.adLocations.map((loc) => ({
        mainApplyServiceId: mainId,
        location: loc,
      })),
    };

    this.requestAdvertisements.push(ad);
    
    this.resetAttachments(adAttachType);
    this.advertForm.reset({
      serviceType: 1,
      workFlowServiceType: 1,
      requestDate: new Date().toISOString(),
      targetTypeIds: [],
      adMethodIds: [],
    });
    this.adLocations = [];
    
    const successMessage = this.translate.instant('SUCCESS.ADVERTISEMENT_ADDED_AUTOMATICALLY') || 
                           'Advertisement added automatically.';
    this.toastr.success(successMessage);
  }

  // new helper
  // onLocalDateChange(localValue: string | null, controlName: string): void {
  //   const control = this.firstStepForm.get(controlName);
  //   if (!control) return;

  //   if (!localValue) {
  //     control.setValue('');
  //     control.markAsDirty();
  //     return;
  //   }

  //   // لو القيمة جاية بصيغة yyyy-MM-ddTHH:mm كمّل ثواني
  //   const withSeconds = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(localValue)
  //     ? `${localValue}:00`
  //     : localValue;

  //   const date = new Date(withSeconds);
  //   if (isNaN(date.getTime())) {
  //     control.setErrors({ rfc3339: true });
  //     return;
  //   }

  //   const iso = date.toISOString();
  //   control.setValue(iso);
  //   control.markAsDirty();
  // }

  onLocalDateChange(event: Event, controlName: string): void {
    const control = this.firstStepForm.get(controlName);
    if (!control) return;

    const input = event.target as HTMLInputElement;
    const localValue = input.value;

    if (!localValue) {
      control.setValue('');
      control.markAsDirty();
      return;
    }

    const withSeconds = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(localValue)
      ? `${localValue}:00`
      : localValue;

    const date = new Date(withSeconds);

    if (isNaN(date.getTime())) {
      control.setErrors({ rfc3339: true });
      return;
    }

    const iso = date.toISOString(); // بصيغة RFC3339 مع التوقيت العالمي
    control.setValue(iso);
    control.markAsDirty();
  }
  // onLocalDateChange(event: Event, controlName: string): void {
  //   const control = this.firstStepForm.get(controlName);
  //   if (!control) return;

  //   const input = event.target as HTMLInputElement;
  //   const localValue = input.value;

  //   if (!localValue) {
  //     control.setValue('');
  //     control.markAsDirty();
  //     return;
  //   }

  //   const withSeconds = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(localValue)
  //     ? `${localValue}:00`
  //     : localValue;

  //   const date = new Date(withSeconds);

  //   if (isNaN(date.getTime())) {
  //     control.setErrors({ rfc3339: true });
  //     return;
  //   }

  //   const iso = date.toISOString();
  //   control.setValue(iso);
  //   control.markAsDirty();
  // }
  onTimeChange(event: Event, controlName: string) {
    const input = event.target as HTMLInputElement;
    const timeValue = input.value;

    const control = this.firstStepForm.get(controlName);
    if (!control) return;

    if (!timeValue) {
      control.setValue('');
      control.markAsDirty();
      return;
    }

    const startDateValue = this.firstStepForm.get('startDate')?.value;
    if (!startDateValue) return;

    const baseDate = new Date(startDateValue);
    const [hours, minutes] = timeValue.split(':').map(Number);

    baseDate.setHours(hours, minutes, 0, 0);

    const iso = baseDate.toISOString();
    control.setValue(iso);
    control.markAsDirty();
  }

  getLocalTimeValue(controlName: string): string | null {
    const value = this.firstStepForm.get(controlName)?.value;
    if (!value) return null;

    const date = new Date(value);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  getTimeOnly(value: string): string {
    if (!value) return '';
    const date = new Date(value);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  // timeRangeValidator(startKey: string, endKey: string): ValidatorFn {
  //   return (formGroup: AbstractControl): ValidationErrors | null => {
  //     const start = formGroup.get(startKey)?.value;
  //     const end = formGroup.get(endKey)?.value;

  //     if (!start || !end) return null;

  //     const startDate = new Date(start);
  //     const endDate = new Date(end);

  //     return endDate >= startDate ? null : { timeRangeInvalid: true };
  //   };

  // }

  // UAE Mobile validation methods
  uaeMobileValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    if (!value) return null;

    const uaeMobilePattern = /^5[0-9]{8}$/;
    return uaeMobilePattern.test(value) ? null : { pattern: true };
  }

  // Emirates ID validation
  emiratesIdValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value;

    // If not individual request type, no validation needed
    if (!this.isIndividualRequestType()) {
      return null;
    }

    // If individual request type and field is empty, it's required
    if (!value || value.toString().trim() === '') {
      return { required: true };
    }

    // Check if exactly 15 digits (only numbers) - Emirates ID format
    const cleanValue = value.toString().trim();
    const emiratesIdPattern = /^\d{15}$/;

    if (!emiratesIdPattern.test(cleanValue)) {
      return { pattern: true };
    }

    return null;
  }

  // Check if request type is individual (حالة فردية)
  isIndividualRequestType(): boolean {
    const requestTypeId = this.firstStepForm?.get('lkpRequestTypeId')?.value;

    // Find the selected request type
    const selectedType = this.requestTypes.find(type => type.id === requestTypeId);

    // Check if the text contains "فردية" or "individual" (case insensitive)
    if (selectedType && selectedType.text) {
      const text = selectedType.text.toLowerCase();
      return text.includes('فردية') || text.includes('individual') || text.includes('فردي');
    }

    return false;
  }

  // Method to handle request type change
  onRequestTypeChange(): void {
    // Re-validate beneficiary ID field when request type changes
    const beneficiaryControl = this.firstStepForm.get('beneficiaryIdNumber');
    if (beneficiaryControl) {
      beneficiaryControl.updateValueAndValidity();
    }
    
    // Reset identity card read flag if switching away from individual type
    if (!this.isIndividualRequestType()) {
      this.isIdentityCardReadSuccessfully = false;
      this.identityCardData = null;
      this.showIdentityCardData = false;
    }
  }

  restrictMobileInput(event: KeyboardEvent): void {
    const char = String.fromCharCode(event.which);
    if (!/[0-9]/.test(char)) {
      event.preventDefault();
    }
  }

  restrictToNumbers(event: KeyboardEvent): void {
    const char = String.fromCharCode(event.which);
    if (!/[0-9]/.test(char)) {
      event.preventDefault();
    }
  }

  onAdminTelInput(): void {
    const mobileControl = this.firstStepForm.get('adminTel');
    if (mobileControl) {
      let value = mobileControl.value;
      if (value && value.length > 9) {
        value = value.substring(0, 9);
        mobileControl.setValue(value);
      }
    }
  }

  onAdminTelBlur(): void {
    const mobileControl = this.firstStepForm.get('adminTel');
    if (mobileControl) {
      mobileControl.updateValueAndValidity();
      this.cdr.detectChanges();
    }
  }

  onTelephoneInput(): void {
    const mobileControl = this.firstStepForm.get('telephone');
    if (mobileControl) {
      let value = mobileControl.value;
      if (value && value.length > 9) {
        value = value.substring(0, 9);
        mobileControl.setValue(value);
      }
    }
  }

  onTelephoneBlur(): void {
    const mobileControl = this.firstStepForm.get('telephone');
    if (mobileControl) {
      mobileControl.updateValueAndValidity();
      this.cdr.detectChanges();
    }
  }

  onContactDetailsInput(): void {
    const contactControl = this.partnerForm.get('contactDetails');
    if (contactControl) {
      let value = contactControl.value;
      if (value && value.length > 9) {
        value = value.substring(0, 9);
        contactControl.setValue(value);
      }
    }
  }

  onContactDetailsBlur(): void {
    const contactControl = this.partnerForm.get('contactDetails');
    if (contactControl) {
      contactControl.updateValueAndValidity();
      this.cdr.detectChanges();
    }
  }

  // Read Identity Card Data
  readIdentityCardData(): void {
    const idNumber = this.firstStepForm.get('beneficiaryIdNumber')?.value;

    if (!idNumber || idNumber.toString().trim() === '') {
      this.toastr.error(this.translate.instant('VALIDATION.REQUIRED_FIELD'));
      return;
    }

    // Validate Emirates ID format (15 digits)
    const cleanValue = idNumber.toString().trim();
    const emiratesIdPattern = /^\d{15}$/;

    if (!emiratesIdPattern.test(cleanValue)) {
      this.toastr.error(this.translate.instant('VALIDATION.INVALID_EMIRATES_ID'));
      return;
    }

    this.isLoadingIdentityCard = true;
    this.identityCardData = null;
    this.showIdentityCardData = false;
    this.isIdentityCardReadSuccessfully = false;

    this._CharityEventPermitRequestService.readIdentityCard(cleanValue).subscribe({
      next: (response) => {
        this.identityCardData = response;
        this.showIdentityCardData = true;
        this.isLoadingIdentityCard = false;
        this.isIdentityCardReadSuccessfully = true;
        this.toastr.success(this.translate.instant('SUCCESS.IDENTITY_CARD_READ'));
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.isLoadingIdentityCard = false;
        this.isIdentityCardReadSuccessfully = false;

        if (error.error && error.error.reason) {
          this.toastr.error(error.error.reason);
        } else if (error.status === 404) {
          this.toastr.error(this.translate.instant('ERRORS.IDENTITY_CARD_NOT_FOUND'));
        } else {
          this.toastr.error(this.translate.instant('ERRORS.FAILED_TO_READ_IDENTITY_CARD'));
        }
      }
    });
  }

  // Navigate to Previous Aid Requests
  navigateToPreviousAidRequests(): void {
    const idNumber = this.firstStepForm.get('beneficiaryIdNumber')?.value;

    if (!idNumber || idNumber.toString().trim() === '') {
      this.toastr.error(this.translate.instant('VALIDATION.REQUIRED_FIELD'));
      return;
    }

    // Clean the ID number (remove dashes and spaces)
    const cleanIdNumber = idNumber.toString().trim().replace(/[-\s]/g, '');
    
    // Encode the ID number for URL
    const encodedIdNumber = btoa(cleanIdNumber);

    // Navigate to previous aid requests page with encoded ID number as parameter
    this.router.navigate(['/services-requests/previous-aid-requests', encodedIdNumber]);
  }

  getStatusColor(statusId: number | null): string {
    if (statusId === null) return '#6c757d';

    switch (statusId) {
      case ServiceStatus.Accept:
        return '#28a745'; // Green
      case ServiceStatus.Reject:
        return '#dc3545'; // Red
      case ServiceStatus.New:
        return '#E6E6E6'; // Light Gray
      case ServiceStatus.Wait:
        return '#ffc107'; // Yellow/Amber
      case ServiceStatus.Received:
        return '#17a2b8'; // Cyan/Teal
      case ServiceStatus.ReturnForModifications:
        return '#6f42c1'; // Purple
      case ServiceStatus.RejectForReason:
        return '#fd7e14'; // Orange
      default:
        return '#6c757d'; // Gray
    }
  }

  getStatusIcon(statusId: number | null): string {
    if (statusId === null) return 'fas fa-question-circle';

    switch (statusId) {
      case ServiceStatus.Accept:
        return 'fas fa-check-circle';
      case ServiceStatus.Reject:
        return 'fas fa-times-circle';
      case ServiceStatus.New:
        return 'fas fa-clock'; // Same icon as Wait
      case ServiceStatus.Wait:
        return 'fas fa-clock';
      case ServiceStatus.Received:
        return 'fas fa-inbox';
      case ServiceStatus.ReturnForModifications:
        return 'fas fa-edit';
      case ServiceStatus.RejectForReason:
        return 'fas fa-exclamation-triangle';
      default:
        return 'fas fa-question-circle';
    }
  }

  getStatusLabel(statusId: number | null): string {
    if (statusId === null) return 'WORKFLOW.STATUS_UNKNOWN';

    switch (statusId) {
      case ServiceStatus.Accept:
        return 'WORKFLOW.STATUS_ACCEPT';
      case ServiceStatus.Reject:
        return 'WORKFLOW.STATUS_REJECT';
      case ServiceStatus.New:
        return 'WORKFLOW.STATUS_NEW';
      case ServiceStatus.Wait:
        return 'WORKFLOW.STATUS_WAITING';
      case ServiceStatus.Received:
        return 'WORKFLOW.STATUS_RECEIVED';
      case ServiceStatus.ReturnForModifications:
        return 'WORKFLOW.STATUS_RETURN_FOR_MODIFICATIONS';
      case ServiceStatus.RejectForReason:
        return 'WORKFLOW.STATUS_REJECT_FOR_REASON';
      default:
        return 'WORKFLOW.STATUS_UNKNOWN';
    }
  }

  historyForModal: any[] = [];
  private historyModalInstance: any = null;
  openHistoryModal(history: any[] = []): void {
    this.historyForModal = (history || []).slice().sort((a, b) =>
      new Date(b.historyDate).getTime() - new Date(a.historyDate).getTime()
    );

    const el = document.getElementById('historyModal');
    if (el) {
      if (this.historyModalInstance) {
        this.historyModalInstance.dispose();
      }
      this.historyModalInstance = new (window as any).bootstrap.Modal(el, {
        backdrop: 'static',
        keyboard: false
      });
      this.historyModalInstance.show();
    }
  }

  closeHistoryModal(): void {
    if (this.historyModalInstance) {
      this.historyModalInstance.hide();
    }
  }

  getHistoryNote(h: any): string {
    const lang = (this.translate?.currentLang || localStorage.getItem('lang') || 'ar').toLowerCase();
    if (lang.startsWith('ar')) {
      return h?.noteAr || h?.serviceStatusName || '';
    }
    return h?.noteEn || h?.serviceStatusName || '';
  }

  isAttachmentMandatory(configId: number): boolean {
    const config = this.attachmentConfigs.find(c => c.id === configId);
    return config?.mendatory || false;
  }

  isMandatory(config: any): boolean {
    return !!config?.mendatory;  
  }

}
