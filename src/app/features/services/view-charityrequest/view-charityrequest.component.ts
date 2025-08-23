// import { Component } from '@angular/core';

// @Component({
//   selector: 'app-view-charityrequest',
//   imports: [],
//   templateUrl: './view-charityrequest.component.html',
//   styleUrl: './view-charityrequest.component.scss'
// })
// export class ViewCharityrequestComponent {

// }
import { Component, OnDestroy, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { GenericDataTableComponent } from '../../../../shared/generic-data-table/generic-data-table.component';

import { ColDef } from 'ag-grid-community';
import { environment } from '../../../../environments/environment';

// === خدماتك الموجودة بالفعل ===

import { MainApplyService } from '../../../core/services/mainApplyService/mainApplyService.service';
import { WorkFlowCommentsService } from '../../../core/services/workFlowComments/workFlowComments.service';
import { AttachmentService } from '../../../core/services/attachments/attachment.service';

// ====== Types مختصرة لسهولة الدمج ======
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
  imports: [CommonModule, FormsModule, ReactiveFormsModule, TranslateModule, GenericDataTableComponent],
  templateUrl: './view-charityrequest.component.html',
  styleUrl: './view-charityrequest.component.scss'
})
export class ViewCharityEventPermitComponent implements OnInit, OnDestroy {
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

  private subscriptions: Subscription[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private mainApplyServiceService: MainApplyService,
    private workFlowCommentsService: WorkFlowCommentsService,
    private attachmentService: AttachmentService,
    private toastr: ToastrService,
    private translate: TranslateService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef
  ) {
    this.commentForm = this.fb.group({ comment: [''] });
  }

  ngOnInit(): void {
    this.loadMainApplyServiceData();
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
}
