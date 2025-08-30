
import { Component, OnDestroy, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin, Subscription } from 'rxjs';
import { GenericDataTableComponent } from '../../../../../shared/generic-data-table/generic-data-table.component';

import { ColDef } from 'ag-grid-community';
import { environment } from '../../../../../environments/environment';


import { MainApplyService } from '../../../../core/services/mainApplyService/mainApplyService.service';
import { WorkFlowCommentsService } from '../../../../core/services/workFlowComments/workFlowComments.service';
import { AttachmentService } from '../../../../core/services/attachments/attachment.service';
import { AttachmentsConfigDto } from '../../../../core/dtos/mainApplyService/mainApplyService.dto';
import { AttachmentBase64Dto, CreateWorkFlowCommentDto, WorkflowCommentsType } from '../../../../core/dtos/workFlowComments/workFlowComments.dto';
import { AttachmentsConfigType } from '../../../../core/dtos/attachments/attachments-config.dto';
import { RequestPlaintAttachmentDto } from '../../../../core/dtos/RequestPlaint/request-plaint.dto';
import { arrayMinLength, dateRangeValidator } from '../../../../shared/customValidators';
import { AuthService } from '../../../../core/services/auth.service';
import { TranslationService } from '../../../../core/services/translation.service';
import { NgSelectModule } from '@ng-select/ng-select';
import { CharityEventPermitRequestService } from '../../../../core/services/charity-event-permit-request.service';
import { AdvertisementsService } from '../../../../core/services/advertisement.service';

type AttachmentState = {
  configs: AttachmentsConfigDto[];
  items: RequestPlaintAttachmentDto[];
  selected: Record<number, File>;
  previews: Record<number, string>;
  sub?: Subscription;
};


type AttachmentDto = {
  id?: number;
  masterId?: number;
  imgPath: string;
  masterType?: number;
  attachmentTitle?: string;
  lastModified?: string | Date;
  attConfigID?: number;
};

type WorkFlowCommentDto = {
  id: number;
  comment: string;
  lastModified?: string | Date;
  attachments?: AttachmentDto[];
  employeeDepartmentName?: string;
};

type WorkFlowStepDto = {
  id: number;
  departmentName: string;
  serviceStatus: number | null;
  serviceStatusName?: string;
  stepOrder?: number | null;
  lastModified?: string | Date;
  workFlowComments?: WorkFlowCommentDto[] | null;
};

type PartnerDto = {
  id?: number;
  name?: string;
  type?: number | null;
  typeName?: string | null;
  licenseIssuer?: string | null;
  licenseExpiryDate?: string | Date | null;
  licenseNumber?: string | null;
  contactDetails?: string | null;
  attachments?: AttachmentDto[];
};

type CharityEventDonationChannel = {
  id: number;
  nameAr?: string | null;
  nameEn?: string | null;
  descriptionAr?: string | null;
  descriptionEn?: string | null;
  isActive?: boolean | null;
};

type RequestAdvertisementTarget = {
  id: number;
  mainApplyServiceId: number;
  lkpTargetTypeId: number;
  othertxt?: string | null;
};

type RequestAdvertisementLocation = {
  id: number;
  mainApplyServiceId: number;
  location: string;
};

type RequestAdvertisementMethod = {
  id: number;
  mainApplyServiceId: number;
  lkpAdMethodId: number;
  othertxt?: string | null;
};

type RequestAdvertisement = {
  id: number;
  mainApplyServiceId: number;
  requestNo: number;
  requestDate: string;
  provider: string;
  adTitle: string;
  adLang: string;
  startDate: string;
  endDate: string;
  mobile: string;
  supervisorName: string;
  fax: string;
  eMail: string;
  targetedAmount: number;
  newAd: boolean;
  reNewAd: boolean;
  oldPermNumber: string | null;
  parentId: number;
  requestEventPermitId: number;
  attachments: AttachmentDto[] | null;
  requestAdvertisementTargets: RequestAdvertisementTarget[];
  requestAdvertisementAdLocations: RequestAdvertisementLocation[];
  requestAdvertisementAdMethods: RequestAdvertisementMethod[];
};

type CharityEventPermitDto = {
  id: number;
  mainApplyServiceId: number;
  requestNo?: number | null;
  requestDate?: string | null;
  eventName?: string | null;
  eventLocation?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  supervisorName?: string | null;
  jopTitle?: string | null;
  telephone1?: string | null;
  telephone2?: string | null;
  email?: string | null;
  advertisementType?: number | null;
  advertisementTypeName?: string | null;
  notes?: string | null;
  requestAdvertisements?: RequestAdvertisement[] | null;
  donationCollectionChannels?: CharityEventDonationChannel[] | null;
};

type MainApplyServiceView = {
  id: number;
  userId: string;
  serviceId: number;
  applyDate: string;
  applyNo: string;
  lastStatus: string;
  lastStatusEN?: string;
  lastModified: string;
  permitNumber?: string;
  service?: { serviceId: number; serviceName: string; serviceNameEn?: string; descriptionAr?: string | null; descriptionEn?: string | null; serviceType?: number };
  workFlowSteps: WorkFlowStepDto[];
  attachments: AttachmentDto[];
  partners: PartnerDto[];
  charityEventPermit: CharityEventPermitDto | null;
};

export enum ServiceStatus {
  Accept = 1,
  Reject = 2,
  RejectForReason = 3,
  Wait = 4,
  Received = 5,
  ReturnForModifications = 7
}

@Component({
  selector: 'app-view-charityrequest',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, TranslateModule, GenericDataTableComponent, NgSelectModule],
  templateUrl: './view-charityrequest.component.html',
  styleUrl: './view-charityrequest.component.scss'
})
export class ViewCharityEventPermitComponent implements OnInit, OnDestroy {
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

  // Tabs: 1 Basic, 2 Event, 3 Dates, 4 Contacts, 5 Advertisements, 6 Partners, 7 Attachments, 8 Workflow
  currentTab = 1;
  totalTabs = 8;

  // Data
  mainApplyService: MainApplyServiceView | null = null;
  charityEventPermit: CharityEventPermitDto | null = null;
  workFlowSteps: WorkFlowStepDto[] = [];
  partners: PartnerDto[] = [];
  attachments: AttachmentDto[] = [];

  // Workflow comments (view)
  targetWorkFlowStep: WorkFlowStepDto | null = null;
  allWorkFlowComments: any[] = [];
  commentsColumnDefs: ColDef[] = [];
  commentsColumnHeaderMap: { [k: string]: string } = {};
  isLoadingComments = false;

  // Modals: attachments (comments / partners)
  showAttachmentModal = false;
  selectedCommentAttachments: AttachmentDto[] = [];
  isLoadingAttachments = false;

  showPartnerAttachmentModal = false;
  selectedPartner: PartnerDto | null = null;
  selectedPartnerAttachments: AttachmentDto[] = [];
  isLoadingPartnerAttachments = false;

  // Optional add comment form (disabled by default visually)
  commentForm!: FormGroup;
  newCommentText = '';
  isSavingComment = false;

  // Comment attachment properties
  commentAttachmentConfigs: AttachmentsConfigDto[] = [];
  commentAttachments: { [key: number]: { fileBase64: string; fileName: string; attConfigID: number } } = {};
  commentSelectedFiles: { [key: number]: File } = {};
  commentFilePreviews: { [key: number]: string } = {};
  isCommentDragOver = false;
  commentValidationSubmitted = false;
  selectedFiles: File[] = [];

  private subscriptions: Subscription[] = [];

    // ad add
  advertForm!: FormGroup;
  isDragOver = false;
  advertisementType: any[] = [];
  advertisementTargetType: any[] = [];
  advertisementMethodType: any[] = [];
  submitted = false;
  isLoading = false;
  isSaving = false;
  isFormInitialized = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private mainApplyServiceService: MainApplyService,
    private workFlowCommentsService: WorkFlowCommentsService,
    private attachmentService: AttachmentService,
    private toastr: ToastrService,
    private translate: TranslateService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
    private authService: AuthService,
    public translationService: TranslationService,
    private _CharityEventPermitRequestService: CharityEventPermitRequestService,
    private _AdvertisementsService: AdvertisementsService
  ) {
    this.commentForm = this.fb.group({ comment: [''] });
    this.initAdvertisementForm();
  }

  ngOnInit(): void {
    this.loadMainApplyServiceData();
    this.loadCommentAttachmentConfigs();
    this.loadInitialData();
  }
  ngOnDestroy(): void {
    this.subscriptions.forEach(s => s.unsubscribe());
  }

  // ===== Load =====
  private loadMainApplyServiceData(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.toastr.error(this.translate.instant('COMMON.INVALID_ID'));
      this.router.navigate(['/']);
      return;
    }

    const sub = this.mainApplyServiceService.getDetailById({ id }).subscribe({
      next: (resp: any) => {

        this.mainApplyService = resp;
        this.charityEventPermit = resp.charityEventPermit || null;
        this.workFlowSteps = resp.workFlowSteps || [];
        this.partners = resp.partners || [];
        this.attachments = resp.attachments || [];

        this.findTargetWorkFlowStep();
        if (this.targetWorkFlowStep) {
          this.loadWorkFlowComments();
        } else {
          this.initializeCommentsTable([]);
        }
      },
      error: () => {
        this.toastr.error(this.translate.instant('COMMON.ERROR_LOADING_DATA'));
        this.router.navigate(['/']);
      }
    });
    this.subscriptions.push(sub);
  }

  private findTargetWorkFlowStep(): void {
    if (this.workFlowSteps?.length) {
      const sorted = this.workFlowSteps
        .filter(s => s.stepOrder !== null && s.stepOrder !== undefined)
        .sort((a, b) => (a.stepOrder || 0) - (b.stepOrder || 0));
      this.targetWorkFlowStep = sorted.find(s => s.serviceStatus === ServiceStatus.Wait) || null;
    }
  }

  private loadWorkFlowComments(): void {
    const rows: any[] = [];
    (this.workFlowSteps || []).forEach(step => {
      const comments = step.workFlowComments || [];
      comments.forEach(c => {
        rows.push({
          ...c,
          stepDepartmentName: step.departmentName,
          stepServiceStatus: step.serviceStatusName
        });
      });
    });

    rows.sort((a, b) => {
      const A = new Date(a.lastModified || 0).getTime();
      const B = new Date(b.lastModified || 0).getTime();
      return B - A;
    });

    this.allWorkFlowComments = rows;
    this.initializeCommentsTable(rows);
    this.isLoadingComments = false;
  }

  private initializeCommentsTable(_: any[]): void {
    this.commentsColumnDefs = [
      {
        headerName: this.translate.instant('COMMON.COMMENT'),
        field: 'comment',
        flex: 2,
        minWidth: 200,
        cellRenderer: (params: any) => {
          const txt = params.value || '-';
          const meta = `
            <small class="text-muted">
              <i class="fas fa-user me-1"></i>${params.data.employeeDepartmentName || 'N/A'}
              <span class="ms-2">
                <i class="fas fa-calendar me-1"></i>${this.formatDateTime(params.data.lastModified)}
              </span>
            </small>`;
          return `<div class="comment-cell"><div class="comment-text">${txt}</div><div class="comment-meta">${meta}</div></div>`;
        }
      },
      { headerName: this.translate.instant('COMMON.DEPARTMENT'), field: 'stepDepartmentName', flex: 1.2, minWidth: 150 },
      { headerName: this.translate.instant('COMMON.STATUS'), field: 'stepServiceStatus', flex: 1, minWidth: 120 },
      {
        headerName: this.translate.instant('COMMON.FILES'),
        field: 'id',
        flex: 0.8,
        minWidth: 100,
        cellRenderer: (p: any) => {
          const id = p.value;
          return id
            ? `<button class="btn btn-next-style attachment-btn" data-comment-id="${id}" data-row-index="${p.node.rowIndex}">
                 <i class="fas fa-eye me-1"></i><span>${this.translate.instant('COMMON.VIEW')}</span>
               </button>`
            : '-';
        },
        cellClass: 'text-center'
      }
    ];

    this.commentsColumnHeaderMap = {
      comment: this.translate.instant('COMMON.COMMENT'),
      stepDepartmentName: this.translate.instant('COMMON.DEPARTMENT'),
      stepServiceStatus: this.translate.instant('COMMON.STATUS'),
      attachments: this.translate.instant('COMMON.FILES')
    };
  }

  // ===== Tabs =====
  goToTab(n: number) { if (n >= 1 && n <= this.totalTabs) this.currentTab = n; }
  nextTab() { if (this.currentTab < this.totalTabs) this.currentTab++; }
  previousTab() { if (this.currentTab > 1) this.currentTab--; }
  isTabActive(n: number) { return this.currentTab === n; }

  // ===== Helpers =====
  formatDate(d: string | Date | null | undefined): string {
    if (!d) return '-';
    return new Date(d).toLocaleDateString();
  }
  formatDateTime(d: string | Date | null | undefined): string {
    if (!d) return '-';
    return new Date(d).toLocaleString();
  }

  getAttachmentUrl(imgPath: string): string {
    if (!imgPath) return '';
    if (imgPath.startsWith('http://') || imgPath.startsWith('https://')) return imgPath;
    const clean = imgPath.startsWith('/') ? imgPath.slice(1) : imgPath;
    return `${environment.apiBaseUrl}/files/${clean}`;
  }
  viewAttachment(a: AttachmentDto) {
    if (!a?.imgPath) return;
    window.open(this.getAttachmentUrl(a.imgPath), '_blank');
  }
  downloadAttachment(a: AttachmentDto) {
    if (!a?.imgPath) return;
    const url = this.getAttachmentUrl(a.imgPath);
    const link = document.createElement('a');
    link.href = url;
    link.download = a.attachmentTitle || a.imgPath;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Advertisements helpers
  adLangLabel(code?: string | null): string {
    if (!code) return '-';
    const map: Record<string, string> = { ar: this.translate.instant('COMMON.ARABIC') || 'Arabic', en: this.translate.instant('COMMON.ENGLISH') || 'English' };
    return map[code.toLowerCase()] || code;
  }

  // Donation channel display (AR/EN بحسب لغة الواجهة)
  channelName(ch: CharityEventDonationChannel): string {
    const isAr = (this.translate.currentLang || '').toLowerCase().startsWith('ar');
    return (isAr ? (ch.nameAr || ch.nameEn) : (ch.nameEn || ch.nameAr)) || '-';
  }

  // Partners
  viewPartnerAttachments(partner: PartnerDto) {
    if (partner.attachments?.length) {
      this.selectedPartner = partner;
      this.selectedPartnerAttachments = partner.attachments;
      this.showPartnerAttachmentModal = true;
    } else {
      this.fetchPartnerAttachments(partner);
    }
  }
  fetchPartnerAttachments(partner: PartnerDto) {
    if (!partner?.id) {
      this.toastr.warning(this.translate.instant('COMMON.INVALID_PARTNER_ID'));
      return;
    }
    this.selectedPartner = partner;
    this.isLoadingPartnerAttachments = true;
    this.selectedPartnerAttachments = [];
    this.showPartnerAttachmentModal = true;

    const parameters = { skip: 0, take: 100, masterIds: [partner.id], masterType: 1004 };
    const sub = this.attachmentService.getList(parameters).subscribe({
      next: (res: any) => {
        const items = res.data || res.items || [];
        this.selectedPartnerAttachments = items.map((x: any) => ({
          id: x.id,
          masterId: x.masterId,
          imgPath: x.imgPath,
          masterType: x.masterType,
          attachmentTitle: x.attachmentTitle,
          lastModified: x.lastModified,
          attConfigID: x.attConfigID
        }));
        this.isLoadingPartnerAttachments = false;
        if (this.selectedPartnerAttachments.length === 0) {
          this.toastr.info(this.translate.instant('COMMON.NO_ATTACHMENTS_FOUND'));
        }
      },
      error: () => {
        this.toastr.error(this.translate.instant('COMMON.ERROR_LOADING_ATTACHMENTS'));
        this.isLoadingPartnerAttachments = false;
      }
    });
    this.subscriptions.push(sub);
  }
  closePartnerAttachmentModal() {
    this.showPartnerAttachmentModal = false;
    this.selectedPartner = null;
    this.selectedPartnerAttachments = [];
    this.isLoadingPartnerAttachments = false;
  }

  // Workflow comment attachments
  onTableCellClick(event: any) {
    const btn = event.event?.target?.closest?.('.attachment-btn');
    if (btn) {
      const id = parseInt(btn.getAttribute('data-comment-id'), 10);
      if (id) this.fetchAndViewCommentAttachments(id);
    }
  }
  onCommentsTableAction(_: { action: string; row: any }) { /* hook جاهز */ }

  fetchAndViewCommentAttachments(commentId: number) {
    this.isLoadingAttachments = true;
    this.selectedCommentAttachments = [];
    this.showAttachmentModal = true;

    const parameters = { skip: 0, take: 100, masterIds: [commentId], masterType: 1003 };
    const sub = this.attachmentService.getList(parameters).subscribe({
      next: (res: any) => {
        this.selectedCommentAttachments = res.data || res.items || [];
        this.isLoadingAttachments = false;
        if (this.selectedCommentAttachments.length === 0) {
          this.toastr.info(this.translate.instant('COMMON.NO_ATTACHMENTS_FOUND'));
        }
      },
      error: () => {
        this.toastr.error(this.translate.instant('COMMON.ERROR_LOADING_ATTACHMENTS'));
        this.isLoadingAttachments = false;
      }
    });
    this.subscriptions.push(sub);
  }
  closeAttachmentModal() {
    this.showAttachmentModal = false;
    this.selectedCommentAttachments = [];
    this.isLoadingAttachments = false;
  }

  // Workflow visuals
  getStatusColor(statusId: number | null): string {
    if (statusId === null) return '#6c757d';
    switch (statusId) {
      case ServiceStatus.Accept: return '#28a745';
      case ServiceStatus.Reject: return '#dc3545';
      case ServiceStatus.RejectForReason: return '#fd7e14';
      case ServiceStatus.Wait: return '#ffc107';
      case ServiceStatus.Received: return '#17a2b8';
      case ServiceStatus.ReturnForModifications: return '#6f42c1';
      default: return '#6c757d';
    }
  }
  getStatusIcon(statusId: number | null): string {
    if (statusId === null) return 'fas fa-question-circle';
    switch (statusId) {
      case ServiceStatus.Accept: return 'fas fa-check-circle';
      case ServiceStatus.Reject: return 'fas fa-times-circle';
      case ServiceStatus.RejectForReason: return 'fas fa-exclamation-triangle';
      case ServiceStatus.Wait: return 'fas fa-clock';
      case ServiceStatus.Received: return 'fas fa-inbox';
      case ServiceStatus.ReturnForModifications: return 'fas fa-edit';
      default: return 'fas fa-question-circle';
    }
  }
  getStatusLabel(statusId: number | null): string {
    if (statusId === null) return 'WORKFLOW.STATUS_UNKNOWN';
    switch (statusId) {
      case ServiceStatus.Accept: return 'WORKFLOW.STATUS_ACCEPT';
      case ServiceStatus.Reject: return 'WORKFLOW.STATUS_REJECT';
      case ServiceStatus.RejectForReason: return 'WORKFLOW.STATUS_REJECT_FOR_REASON';
      case ServiceStatus.Wait: return 'WORKFLOW.STATUS_WAITING';
      case ServiceStatus.Received: return 'WORKFLOW.STATUS_RECEIVED';
      case ServiceStatus.ReturnForModifications: return 'WORKFLOW.STATUS_RETURN_FOR_MODIFICATIONS';
      default: return 'WORKFLOW.STATUS_UNKNOWN';
    }
  }
  isStepCompleted(s: number | null) { return s === ServiceStatus.Accept || s === ServiceStatus.Received; }
  isStepRejected(s: number | null) { return s === ServiceStatus.Reject || s === ServiceStatus.RejectForReason; }
  isStepPending(s: number | null) { return s === ServiceStatus.Wait; }
  trackByStepId(i: number, step: WorkFlowStepDto) { return step.id ?? i; }

  // Navigation
  goBack() { this.router.navigate(['/mainApplyService']); }




  // start comment attachment
    loadCommentAttachmentConfigs(): void {
      const sub = this.attachmentService.getAttachmentsConfigByType(
        AttachmentsConfigType.Comment,
        true,
        null
      ).subscribe({
        next: (configs: any) => {
          this.commentAttachmentConfigs = configs || [];
          this.initializeCommentAttachments();
        },
        error: (error) => {
          // Handle error silently
        }
      });
      this.subscriptions.push(sub);
    }

  // Comment management methods
  addWorkFlowComment(): void {
    if (!this.newCommentText.trim() || !this.targetWorkFlowStep?.id) {
      this.toastr.warning(this.translate.instant('COMMENTS.ENTER_COMMENT'));
      return;
    }

    // Set validation flag to show validation errors
    this.commentValidationSubmitted = true;

    // Check if required attachments are uploaded
    const requiredAttachments = this.commentAttachmentConfigs.filter(config => config.mendatory);
    const missingRequiredAttachments = requiredAttachments.filter(config =>
      !this.commentSelectedFiles[config.id!] && !this.commentFilePreviews[config.id!]
    );

    if (missingRequiredAttachments.length > 0) {
      this.toastr.warning(this.translate.instant('VALIDATION.PLEASE_UPLOAD_REQUIRED_ATTACHMENTS'));
      return;
    }

    this.isSavingComment = true;

    // Prepare attachments for the comment
    const attachments: AttachmentBase64Dto[] = [];

    // Process attachments from attachment configs
    Object.values(this.commentAttachments).forEach(attachment => {
      if (attachment.fileBase64 && attachment.fileName) {
        attachments.push({
          fileName: attachment.fileName,
          fileBase64: attachment.fileBase64,
          attConfigID: attachment.attConfigID
        });
      }
    });

    const createDto: CreateWorkFlowCommentDto = {
      empId: null,
      workFlowStepsId: this.targetWorkFlowStep.id,
      comment: this.newCommentText.trim(),
      lastModified: new Date(),
      commentTypeId: WorkflowCommentsType.External,
      attachments: attachments
    };

    const subscription = this.workFlowCommentsService.create(createDto).subscribe({
      next: (response) => {
        this.toastr.success(this.translate.instant('COMMENTS.COMMENT_ADDED'));
        this.newCommentText = '';
        this.selectedFiles = [];
        // Clear comment attachments
        this.clearCommentAttachments();
        this.closeCommentModal(); // Close the modal
        // Reload main data to get updated comments
        this.loadMainApplyServiceData();
        this.isSavingComment = false;
      },
      error: (error) => {
        this.toastr.error(this.translate.instant('COMMENTS.ERROR_ADDING_COMMENT'));
        this.isSavingComment = false;
      }
    });
    this.subscriptions.push(subscription);
  }

  clearCommentAttachments(): void {
    this.commentSelectedFiles = {};
    this.commentFilePreviews = {};
    this.commentAttachments = {};
    this.commentValidationSubmitted = false;
    // Reinitialize comment attachments structure
    this.initializeCommentAttachments();
  }

  getCommentAttachmentName(config: AttachmentsConfigDto): string {
    return config.nameEn || config.name || this.translate.instant('COMMON.ATTACHMENT');
  }

  isCommentAttachmentMandatory(configId: number): boolean {
    const config = this.commentAttachmentConfigs.find(c => c.id === configId);
    return config?.mendatory || false;
  }

  // File handling methods for comment attachments
  onCommentFileSelected(event: Event, configId: number): void {
    const target = event.target as HTMLInputElement;
    if (target?.files?.[0]) {
      this.handleCommentFileUpload(target.files[0], configId);
    }
  }

  onCommentDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isCommentDragOver = true;
  }

  onCommentDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isCommentDragOver = false;
  }

  onCommentDrop(event: DragEvent, configId: number): void {
    event.preventDefault();
    this.isCommentDragOver = false;

    const files = event.dataTransfer?.files;
    if (files?.[0]) {
      this.handleCommentFileUpload(files[0], configId);
    }
  }

  handleCommentFileUpload(file: File, configId: number): void {
    if (!this.validateCommentFile(file)) {
      return;
    }

    this.commentSelectedFiles[configId] = file;

    const reader = new FileReader();
    reader.onload = (e) => {
      this.commentFilePreviews[configId] = e.target?.result as string;

      // Ensure the attachment object exists
      if (!this.commentAttachments[configId]) {
        this.commentAttachments[configId] = {
          fileBase64: '',
          fileName: '',
          attConfigID: configId
        };
      }

      const base64String = (e.target?.result as string).split(',')[1];
      this.commentAttachments[configId] = {
        ...this.commentAttachments[configId],
        fileBase64: base64String,
        fileName: file.name
      };

      this.cdr.detectChanges();
    };
    reader.readAsDataURL(file);
  }

  validateCommentFile(file: File): boolean {
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

  removeCommentFile(configId: number): void {
    delete this.commentSelectedFiles[configId];
    delete this.commentFilePreviews[configId];

    if (this.commentAttachments[configId]) {
      this.commentAttachments[configId] = {
        ...this.commentAttachments[configId],
        fileBase64: '',
        fileName: ''
      };
    }

    this.cdr.detectChanges();
  }

  closeCommentModal(): void {
    const modal = document.getElementById('commentModal');
    if (modal) {
      const bootstrapModal = (window as any).bootstrap.Modal.getInstance(modal);
      if (bootstrapModal) {
        bootstrapModal.hide();
      }
    }
  }

    initializeCommentAttachments(): void {
    this.commentAttachments = {};
    this.commentSelectedFiles = {};
    this.commentFilePreviews = {};
    
    this.commentAttachmentConfigs.forEach(config => {
      if (config.id) {
        this.commentAttachments[config.id] = {
          fileBase64: '',
          fileName: '',
          attConfigID: config.id
        };
      }
    });
  }
  
    // Legacy file handling methods (keeping for backward compatibility)
  onFileSelected(event: any): void {
    const files = event.target.files;
    if (files && files.length > 0) {
      this.selectedFiles = Array.from(files);
    }
  }

  removeSelectedFile(index: number): void {
    this.selectedFiles.splice(index, 1);
  }

  ////////////////////////////// new attachment //////////////////////////////
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

        // targetedAmount: this.fb.control<number | null>(null),


        // newAd: this.fb.control<boolean | null>(true),
        // reNewAd: this.fb.control<boolean | null>(false),
        // oldPermNumber: this.fb.control<string | null>(null),

        requestEventPermitId: this.fb.control<number | null>(null),


        targetTypeIds: this.fb.control<number[]>([], { validators: [arrayMinLength(1)], nonNullable: true }),
        adMethodIds: this.fb.control<number[]>([], { validators: [arrayMinLength(1)], nonNullable: true }),
      },
      {
        validators: [dateRangeValidator]
      }
    );
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
  onFileSelectednew(event: Event, type: AttachmentsConfigType, configId: number): void {
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
  getPreview(type: AttachmentsConfigType, configId: number): string | undefined {
    return this.ensureState(type).previews[configId];
  }
  //=================

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

  addAdvertisement(): void {
    this.advertForm.markAllAsTouched();
    if (
      !this.advertForm.valid ||
      this.advertForm.hasError('dateRange')
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
      parentId: Number(this.mainApplyService?.id),
      mainApplyServiceId: 0,
      requestNo: 0,

      serviceType: Number(this.mainApplyService?.serviceId) as any,
      workFlowServiceType: Number(this.mainApplyService?.serviceId) as any,

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

      requestEventPermitId: null,
      CharityEventPermitId: this.mainApplyService?.charityEventPermit?.id,

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


    };


    console.log('requestAdvertisements', ad);
    this._AdvertisementsService.createDepartment(ad).subscribe({
      next: (res) => {
        console.log(res);
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
          adMethodIds: []
        });

        this.toastr.success(this.translate.instant('SUCCESS.AD_ADDED'));
        const modalEl = document.getElementById('addAdvertisementModal');
        if (modalEl) {
          const modalInstance = (window as any).bootstrap.Modal.getInstance(modalEl);
          if (modalInstance) {
            modalInstance.hide();
          }
        }

      },
      error: (err) => {
        console.log(err);

      }
    })

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
      next: (configs: any) => {
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

  loadInitialData(): void {
    this.isLoading = true;

    const currentUser = this.authService.getCurrentUser();
    if (currentUser?.id) {

      forkJoin({
        advertisementMethodType: this._CharityEventPermitRequestService.getAdvertisementMethodType({}),
        advertisementTargetType: this._CharityEventPermitRequestService.getAdvertisementTargetType({}),
        advertisementType: this._CharityEventPermitRequestService.getAdvertisementType()
      }).subscribe({
        next: (res: any) => {
          this.advertisementType = res.advertisementType;
          this.advertisementMethodType = res.advertisementMethodType?.results;
          this.advertisementTargetType = res.advertisementTargetType?.results;

          this.isLoading = false;
          this.isFormInitialized = true; // Mark form as fully initialized


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
}
