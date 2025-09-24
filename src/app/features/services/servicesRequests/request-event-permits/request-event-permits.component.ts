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
import { Router } from '@angular/router';
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
    return !!this.ensureState(type).selected[id];
  }

  public selectedFileName(
    type: AttachmentsConfigType,
    id: number
  ): string | null {
    return this.ensureState(type).selected[id]?.name ?? null;
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
  partnerTypes: any[] = [
    { id: PartnerType.Person, label: 'Person' },
    { id: PartnerType.Government, label: 'Government' },
    { id: PartnerType.Supplier, label: 'Supplier' },
    { id: PartnerType.Company, label: 'Company' },
  ];
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


  constructor(
    private fb: FormBuilder,
    private attachmentService: AttachmentService,
    private authService: AuthService,
    public translationService: TranslationService,
    private translate: TranslateService,
    private toastr: ToastrService,
    private router: Router,
    private _CharityEventPermitRequestService: CharityEventPermitRequestService,
    private cdr: ChangeDetectorRef
  ) {
    this.initializeForm();
    this.initPartnerForm();
    this.initAdvertisementForm();
  }

  ngOnInit(): void {
    this.clearAllToasts();
    this.loadInitialData();
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

        userId: this.fb.control<string>('', {
          validators: [Validators.required, Validators.maxLength(450)],
          nonNullable: true,
        }),

        requestSide: this.fb.control<string>('', {
          validators: [Validators.required, Validators.maxLength(200)],
          nonNullable: true,
        }),

        supervisingSide: this.fb.control<string>('', {
          validators: [Validators.required, Validators.maxLength(200)],
          nonNullable: true,
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

        lkpPermitTypeId: this.fb.control<number>(1, {
          validators: [Validators.required],
          nonNullable: true,
        }),

        eventLocation: this.fb.control<string>('', {
          validators: [Validators.required, Validators.maxLength(500)],
          nonNullable: true,
        }),

        amStartTime: this.fb.control<string>('', {
          validators: [rfc3339Required],
          nonNullable: true,
        }),
        amEndTime: this.fb.control<string>('', {
          validators: [rfc3339Required],
          nonNullable: true,
        }),
        pmStartTime: this.fb.control<string>('', {
          validators: [rfc3339Required],
          nonNullable: true,
        }),
        pmEndTime: this.fb.control<string>('', {
          validators: [rfc3339Required],
          nonNullable: true,
        }),

        // amStartTime: this.fb.control('', [Validators.required]),
        // amEndTime: this.fb.control('', [Validators.required]),
        // pmStartTime: this.fb.control('', [Validators.required]),
        // pmEndTime: this.fb.control('', [Validators.required]),

        admin: this.fb.control<string>('', {
          validators: [Validators.required, Validators.maxLength(200)],
          nonNullable: true,
        }),

        delegateName: this.fb.control<string>('', {
          validators: [Validators.required, Validators.maxLength(200)],
          nonNullable: true,
        }),

        alternateName: this.fb.control<string>('', {
          validators: [Validators.required, Validators.maxLength(100)],
          nonNullable: true,
        }),

        adminTel: this.fb.control<string>('', {
          validators: [Validators.required, this.uaeMobileValidator.bind(this)],
          nonNullable: true,
        }),

        telephone: this.fb.control<string>('', {
          validators: [Validators.required, this.uaeMobileValidator.bind(this)],
          nonNullable: true,
        }),

        email: this.fb.control<string | null>(null, {
          validators: [Validators.maxLength(50), Validators.email],
        }),

        notes: this.fb.control<string | null>(null, {
          validators: [Validators.maxLength(4000)],
        }),

        targetedAmount: this.fb.control<number | null>(null, {
          validators: [Validators.min(0)],
        }),

        beneficiaryIdNumber: this.fb.control<string | null>(null),

        donationCollectionChannelIds: this.fb.control<number[]>([1], {
          validators: [arrayMinLength(1)],
          nonNullable: true,
        }),
      },
      {
        validators: [
          timeRangesOk,
          // this.timeRangeValidator('amStartTime', 'amEndTime'),
          // this.timeRangeValidator('pmStartTime', 'pmEndTime')
        ],
      }
    );
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
        userId: this.fb.control(currentUser?.id ?? '', {
          validators: [Validators.required],
          nonNullable: true,
        }),

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
        validators: [dateRangeValidator, this.renewRequiresOldPermValidator],
      }
    );
  }

  loadInitialData(): void {
    this.isLoading = true;

    const currentUser = this.authService.getCurrentUser();
    if (currentUser?.id) {
      this.firstStepForm.patchValue({
        userId: currentUser.id,
      });

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
          console.log, 'testttst' + this.partnerTypes;

          this.requestTypes = res.requestTypes?.results;
          this.permitsTypes = res.permitsTypes?.results;
          console.log(res.donationChannelsLookup, 'ddddddd');

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
          console.error('Error loading essential data:', error);
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
  // start partners
  initPartnerForm(): void {
    this.partnerForm = this.fb.group({
      type: this.fb.control<number | null>(null, { validators: [Validators.required] }),

      // required
      licenseIssuer: this.fb.control('', { validators: [Validators.required, Validators.maxLength(200)], nonNullable: true }),
      licenseExpiryDate: this.fb.control(null, [Validators.maxLength(100)]),
      licenseNumber: this.fb.control('', { validators: [Validators.required], nonNullable: true }),

      // optional
      contactDetails: this.fb.control<string | null>(null, [Validators.maxLength(1000)]),
      mainApplyServiceId: this.fb.control<number | null>(null),


      name: ['', [Validators.required, Validators.maxLength(200)]],
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
  //   console.log(this.partners);
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

    // ====== قواعد الـ backend (lengths + required لاسم ونوع) ======
    // Name: required + max 200
    if (!name) {
      this.toastr.error(this.translate.instant('VALIDATION.REQUIRED_FIELD') + ': ' + this.translate.instant('FASTING_TENT_REQ.PARTNER_NAME'));
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
    if (contactDetails && contactDetails.length > 1000) {
      this.toastr.error(this.translate.instant('VALIDATION.MAX_LENGTH_EXCEEDED') + `: ${this.translate.instant('FASTING_TENT_REQ.CONTACT_DETAILS')} (<= 1000)`);
      return;
    }

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
    console.log("partnerAttachments = ", partnerAttachments);

    if (partnerType === PartnerType.Person || partnerType === PartnerType.Supplier || partnerType === PartnerType.Company) {

      if (!partnerAttachments.length) {
        this.toastr.error(this.translate.instant('VALIDATION.ATTACHMENT_REQUIRED'));
        return;
      }
    }


    this.partners.push({
      name: v.name!,
      type: v.type!,
      licenseIssuer: v.licenseIssuer!,
      licenseExpiryDate: v.licenseExpiryDate!,
      licenseNumber: v.licenseNumber!,
      contactDetails: v.contactDetails ?? null,
      jobRequirementsDetails: v.jobRequirementsDetails ?? null,
      mainApplyServiceId: v.mainApplyServiceId ?? null,
      attachments: partnerAttachments,
    });
    console.log(this.partners);
    this.resetAttachments(partnerAttachType);
    this.partnerForm.reset();


    this.showPartnerAttachments = false;
    this.toastr.success(this.translate.instant('SUCCESS.PARTNER_ADDED'));
    console.log("partners ", this.partners);

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
    this.partners.splice(i, 1);
  }

  getPartnerTypeLabel(id: number): string {
    return this.partnerTypes.find((t: any) => t.id === id)?.text ?? '';
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
      error: (e) => console.error('Error loading multi attachment configs', e),
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
    delete s.selected[configId];
    delete s.previews[configId];

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
    return this.ensureState(type).previews[configId];
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
        error: (e) =>
          console.error('Error loading attachment configs for type', type, e),
      });
  }
  ////////////////////////////////////////////// end attachment functions

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
        ['userId', 450],
        ['requestSide', 200],
        ['supervisingSide', 200],
        ['eventName', 200],
        ['eventLocation', 500],
        ['admin', 200],
        ['delegateName', 200],
        ['alternateName', 100],
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

    (['adminTel', 'telephone'] as const).forEach((k) => {
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
    (['lkpRequestTypeId', 'lkpPermitTypeId'] as const).forEach((k) => {
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

    // 7) targetedAmount
    const targetedAmount = val('targetedAmount');
    if (
      targetedAmount !== null &&
      targetedAmount !== undefined &&
      `${targetedAmount}`.trim() !== ''
    ) {
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
      'userId',
      'requestSide',
      'supervisingSide',
      'eventName',
      'eventLocation',
      'admin',
      'delegateName',
      'alternateName',
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

    const channels: number[] =
      this.firstStepForm.get('donationCollectionChannelIds')?.value || [];
    if (!channels.length) return false;

    const mainAttachType =
      AttachmentsConfigType.DeclarationOfCharityEffectiveness;
    if (this.hasMissingRequiredAttachments(mainAttachType)) return false;

    const withAd =
      Number(this.firstStepForm.get('advertisementType')?.value ?? 0) === 1;
    if (withAd && this.requestAdvertisements.length === 0) return false;

    return true;
  }

  // Submit form
  onSubmit(): void {
    if (this.isSaving) return;

    this.submitted = true;
    if (!this.canSubmit()) {
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
        const s =
          typeof input === 'string' && input.length === 16
            ? input + ':00'
            : input;
        const d = new Date(s as any);
        return d.toISOString().replace(/\.\d{3}Z$/, 'Z');
      };

      const mainAttachType =
        AttachmentsConfigType.DeclarationOfCharityEffectiveness;
      const mainAttachments = this.getValidAttachments(mainAttachType).map(
        (a) => ({
          ...a,
          masterId: a.masterId || 0,
        })
      );

      const formData = this.firstStepForm.value;
      const payload: any = {
        ...formData,
        lkpPermitTypeId: +formData.lkpPermitTypeId,
        lkpRequestTypeId: +formData.lkpRequestTypeId,

        requestDate: toISO(formData.requestDate ?? new Date()),
        startDate: toISO(formData.startDate),
        endDate: toISO(formData.endDate),
        adminTel: `971${formData.adminTel}`, // Add 971 prefix
        telephone: `971${formData.telephone}`, // Add 971 prefix
        requestAdvertisements: this.requestAdvertisements,
        attachments: mainAttachments,
        partners: (this.partners || []).map((p) => ({
          name: p.name,
          type: Number(p.type),
          licenseIssuer: p.licenseIssuer ?? null,
          licenseExpiryDate: p.licenseExpiryDate
            ? toISO(p.licenseExpiryDate)
            : null,
          licenseNumber: p.licenseNumber ?? null,
          contactDetails: p.contactDetails ?? null,
          mainApplyServiceId: p.mainApplyServiceId ?? null,
          attachments: p.attachments,
        })),
      };
      console.log('payload = ', payload);

      const sub = this._CharityEventPermitRequestService
        .createRequestEvent(payload)
        .subscribe({
          next: (res) => {
            console.log(res);

            this.toastr.success(
              this.translate.instant('SUCCESS.REQUEST_PLAINT_CREATED')
            );
            this.router.navigate(['/services']);
            this.isSaving = false;
          },
          error: (error: any) => {
            console.error('Error creating request event permit:', error);

            // Check if it's a business error with a specific reason
            if (error.error && error.error.reason) {
              // Show the specific reason from the API response
              this.toastr.error(error.error.reason);
            } else {
              // Fallback to generic error message
              this.toastr.error(
                this.translate.instant('ERRORS.FAILED_CREATE_REQUEST_PLAINT')
              );
            }

            this.isSaving = false;
          },
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
        this.toastr.error(
          this.translate.instant('ERRORS.FAILED_CREATE_REQUEST_PLAINT')
        );
      }

      this.isSaving = false;
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

  public handleNextClick(): void {
    this.submitted = true;
    this.firstStepForm.markAllAsTouched();

    const isValidStep1 =
      this.firstStepForm.valid && !this.firstStepForm.hasError('dateRange');
    console.log(this.firstStepForm.value);

    if (this.currentStep === 1) {
      if (isValidStep1) {
        this.currentStep++;
      } else {
        this.toastr.error(this.translate.instant('VALIDATION.FORM_INVALID'));
      }
    } else {
      this.currentStep++;
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
      parentId: Number(v.parentId ?? 0),
      mainApplyServiceId: mainId,
      requestNo: Number(v.requestNo ?? 0),

      serviceType: Number(v.serviceType) as any,
      workFlowServiceType: Number(v.workFlowServiceType) as any,

      requestDate: toRFC3339(v.requestDate)!,
      userId: v.userId,

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
    console.log('requestAdvertisements', this.requestAdvertisements);

    this.resetAttachments(adAttachType);

    this.advertForm.reset({
      serviceType: 1,
      workFlowServiceType: 1,
      requestDate: new Date().toISOString(),
      userId: v.userId,
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
    this.requestAdvertisements.splice(i, 1);
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

  //     console.log('start:', startDate, 'end:', endDate);
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

  restrictMobileInput(event: KeyboardEvent): void {
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
}
