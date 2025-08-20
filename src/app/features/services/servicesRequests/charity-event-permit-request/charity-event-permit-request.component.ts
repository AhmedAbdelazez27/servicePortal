import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AttachmentService } from '../../../../core/services/attachments/attachment.service';
import { AuthService } from '../../../../core/services/auth.service';
import { TranslationService } from '../../../../core/services/translation.service';
import { ToastrService } from 'ngx-toastr';
import { Router } from '@angular/router';
import { AttachmentsConfigDto, AttachmentsConfigType } from '../../../../core/dtos/attachments/attachments-config.dto';
import { forkJoin, map, Observable, Subscription } from 'rxjs';
import { PlaintReasonsDto, RequestPlaintAttachmentDto, RequestPlaintEvidenceDto, RequestPlaintJustificationDto, RequestPlaintReasonDto, Select2Item, UserEntityDto } from '../../../../core/dtos/RequestPlaint/request-plaint.dto';
import { CharityEventPermitRequestService } from '../../../../core/services/charity-event-permit-request.service';
import { arrayMinLength, dateRangeValidator } from '../../../../shared/customValidators';
import { RequestAdvertisement } from '../../../../core/dtos/charity-event-permit/charity-event-permit.dto';

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
    return !!this.ensureState(type).selected[id];
  }

  public selectedFileName(type: AttachmentsConfigType, id: number): string | null {
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
  partnerTypes: any[] = [];
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


  constructor(
    private fb: FormBuilder,
    private attachmentService: AttachmentService,
    private authService: AuthService,
    public translationService: TranslationService,
    private translate: TranslateService,
    private toastr: ToastrService,
    private router: Router,
    private _CharityEventPermitRequestService: CharityEventPermitRequestService
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
        telephone1: this.fb.control('', { validators: [Validators.required], nonNullable: true }),
        telephone2: this.fb.control('', { validators: [Validators.required], nonNullable: true }),
        email: this.fb.control<string | null>(null, { validators: [Validators.email] }),
        advertisementType: this.fb.control<1 | 2>(1, { validators: [Validators.required], nonNullable: true }),
        notes: this.fb.control<string | null>(null),
        donationCollectionChannelIds: this.fb.control<number[]>([], {
          validators: [arrayMinLength(1)],
          nonNullable: true,
        }),
      },
      { validators: [dateRangeValidator] }
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

        provider: this.fb.control<string | null>(null),

        adTitle: this.fb.control('', { validators: [Validators.required], nonNullable: true }),
        adLang: this.fb.control<'ar' | 'en'>('ar', { validators: [Validators.required], nonNullable: true }),

        startDate: this.fb.control('', { validators: [Validators.required], nonNullable: true }),
        endDate: this.fb.control('', { validators: [Validators.required], nonNullable: true }),

        mobile: this.fb.control<string | null>(null),
        supervisorName: this.fb.control<string | null>(null),
        fax: this.fb.control<string | null>(null),
        eMail: this.fb.control<string | null>(null, [Validators.email]),

        targetedAmount: this.fb.control<number | null>(null),


        newAd: this.fb.control<boolean | null>(true),
        reNewAd: this.fb.control<boolean | null>(false),
        oldPermNumber: this.fb.control<string | null>(null),

        requestEventPermitId: this.fb.control<number | null>(null),


        targetTypeIds: this.fb.control<number[]>([], { validators: [arrayMinLength(1)], nonNullable: true }),
        adMethodIds: this.fb.control<number[]>([], { validators: [arrayMinLength(1)], nonNullable: true }),
      },
      {
        validators: [dateRangeValidator, this.renewRequiresOldPermValidator]
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
        partnerTypes: this._CharityEventPermitRequestService.getPartners(),
      }).subscribe({
        next: (res: any) => {
          this.advertisementType = res.advertisementType;
          this.advertisementMethodType = res.advertisementMethodType?.results;
          this.advertisementTargetType = res.advertisementTargetType?.results;
          this.partnerTypes = res.partnerTypes?.data;
          console.log(res.donationChannelsLookup, "ddddddd");

          this.donationChannelsLookup = res.donationChannelsLookup.results?.length ? res.donationChannelsLookup.results : [

            { id: 1, text: 'SMS' },
            { id: 2, text: 'Bank Transfer' },
            { id: 3, text: 'POS' },
          ];

          this.isLoading = false;
          this.isFormInitialized = true; // Mark form as fully initialized

          // this.loadAttachmentConfigs();
          this.loadAttachmentConfigs(AttachmentsConfigType.DeclarationOfCharityEffectiveness);
          this.loadAttachmentConfigs(AttachmentsConfigType.RequestAnEventAnnouncementOrDonationCampaign);

        },
        error: (error: any) => {
          console.error('Error loading essential data:', error);
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
  // start partners
  initPartnerForm(): void {
    this.partnerForm = this.fb.group({
      name: this.fb.control('', { validators: [Validators.required], nonNullable: true }),
      type: this.fb.control<number | null>(null, { validators: [Validators.required] }),

      // required
      licenseIssuer: this.fb.control('', { validators: [Validators.required], nonNullable: true }),
      licenseExpiryDate: this.fb.control('', { validators: [Validators.required], nonNullable: true }),
      licenseNumber: this.fb.control('', { validators: [Validators.required], nonNullable: true }),

      // optional
      contactDetails: this.fb.control<string | null>(null),
      mainApplyServiceId: this.fb.control<number | null>(null),
    });
  }


  addPartner(): void {
    this.partnerForm.markAllAsTouched();
    if (this.partnerForm.invalid) return;

    const v = this.partnerForm.getRawValue();
    this.partners.push({
      name: v.name!,
      type: v.type!,
      licenseIssuer: v.licenseIssuer!,
      licenseExpiryDate: v.licenseExpiryDate!,
      licenseNumber: v.licenseNumber!,
      contactDetails: v.contactDetails ?? null,
      mainApplyServiceId: v.mainApplyServiceId ?? null,
    });

    this.partnerForm.reset();
  }

  removePartner(i: number): void {
    this.partners.splice(i, 1);
  }

  getPartnerTypeLabel(id: number): string {
    return this.partnerTypes.find((t: any) => t.id === id)?.text ?? '';
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
      error: e => console.error('Error loading multi attachment configs', e)
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
    delete s.selected[configId];
    delete s.previews[configId];

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

  getPreview(type: AttachmentsConfigType, configId: number): string | undefined {
    return this.ensureState(type).previews[configId];
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
      error: (e) => console.error('Error loading attachment configs for type', type, e)
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
    if (form.hasError('dateRange')) return false;

    const required = [
      'eventName',
      'eventLocation',
      'startDate',
      'endDate',
      'supervisorName',
      'jopTitle',
      'telephone1',
      'telephone2',
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
      'telephone2',
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

    const withAd = Number(this.firstStepForm.get('advertisementType')?.value ?? 0) === 1;
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
        const s = typeof input === 'string' && input.length === 16 ? input + ':00' : input;
        const d = new Date(s as any);
        return d.toISOString().replace(/\.\d{3}Z$/, 'Z');
      }

      const mainAttachType = AttachmentsConfigType.DeclarationOfCharityEffectiveness;
      const mainAttachments = this.getValidAttachments(mainAttachType).map(a => ({
        ...a,
        masterId: a.masterId || 0
      }));

      const payload: any = {
        ...this.firstStepForm.value,
        requestDate: toISO(this.firstStepForm.value.requestDate ?? new Date()),
        startDate: toISO(this.firstStepForm.value.startDate),
        endDate: toISO(this.firstStepForm.value.endDate),
        requestAdvertisements: this.requestAdvertisements,
        attachments: mainAttachments,
        partners: (this.partners || []).map(p => ({
          name: p.name,
          type: Number(p.type),
          licenseIssuer: p.licenseIssuer ?? null,
          licenseExpiryDate: p.licenseExpiryDate ? toISO(p.licenseExpiryDate) : null,
          licenseNumber: p.licenseNumber ?? null,
          contactDetails: p.contactDetails ?? null,
          mainApplyServiceId: p.mainApplyServiceId ?? null
        })),
      };
      console.log("payload = ", payload);

      const sub = this._CharityEventPermitRequestService.create(payload).subscribe({
        next: (res) => {
          console.log(res);

          this.toastr.success(this.translate.instant('SUCCESS.REQUEST_PLAINT_CREATED'));
          this.router.navigate(['/services']);
          this.isSaving = false;
        },
        error: (error: any) => {
          console.error('Error creating charity event permit request:', error);
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

    const isValidStep1 = this.firstStepForm.valid && !this.firstStepForm.hasError('dateRange');
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

    const ad: RequestAdvertisement = {
      parentId: Number(v.parentId ?? 0),
      mainApplyServiceId: mainId,
      requestNo: Number(v.requestNo ?? 0),

      serviceType: Number(v.serviceType) as any,
      workFlowServiceType: Number(v.workFlowServiceType) as any,

      requestDate: toRFC3339(v.requestDate)!,
      userId: v.userId,

      provider: v.provider ?? null,
      adTitle: v.adTitle,
      adLang: v.adLang,

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

      requestEventPermitId: v.requestEventPermitId != null ? Number(v.requestEventPermitId) : null,

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
    console.log('requestAdvertisements', this.requestAdvertisements);

    this.resetAttachments(adAttachType);

    this.advertForm.reset({
      serviceType: 1,
      workFlowServiceType: 1,
      requestDate: new Date().toISOString(),
      userId: v.userId,
      adLang: 'ar',
      newAd: true,
      reNewAd: false,
      targetTypeIds: [],
      adMethodIds: []
    });
    this.adLocations = [];
    this.submitted = false;
    this.toastr.success(this.translate.instant('SUCCESS.AD_ADDED'));
  }


  removeAdvertisement(i: number): void {
    this.requestAdvertisements.splice(i, 1);
  }

}
