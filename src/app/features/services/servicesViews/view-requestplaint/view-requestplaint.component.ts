import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MainApplyService } from '../../../../core/services/mainApplyService/mainApplyService.service';
import { WorkFlowCommentsService } from '../../../../core/services/workFlowComments/workFlowComments.service';
import { AttachmentService } from '../../../../core/services/attachments/attachment.service';
import { ToastrService } from 'ngx-toastr';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { environment } from '../../../../../environments/environment';
import { AttachmentDto, AttachmentsConfigDto, CharityEventPermitDto, PartnerDto, WorkFlowStepDto } from '../../../../core/dtos/mainApplyService/mainApplyService.dto';
import { ServiceStatus } from '../view-requesteventpermit/view-requesteventpermit.component';
import { ColDef } from 'ag-grid-community';
import { FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { GenericDataTableComponent } from '../../../../../shared/generic-data-table/generic-data-table.component';
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
@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, TranslateModule,RouterLink],
  selector: 'app-view-requestplaint',
  templateUrl: './view-requestplaint.component.html',
  styleUrls: ['./view-requestplaint.component.scss']
})
export class ViewRequestplaintComponent implements OnInit {

// Tabs: 1 Basic, 2 Event, 3 Dates, 4 Contacts, 5 Advertisements, 6 Partners, 7 Attachments, 8 Workflow
  currentTab = 1;
  totalTabs = 8;

  // Data
  mainApplyService: any | null = null;
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

  constructor(
     private route: ActivatedRoute,
    private router: Router,
    private mainApplyServiceService: MainApplyService,
    private workFlowCommentsService: WorkFlowCommentsService,
    private attachmentService: AttachmentService,
    private toastr: ToastrService,
    private translate: TranslateService
  ) {}


  ngOnInit(): void {
    this.loadMainApplyServiceData();
    // this.loadCommentAttachmentConfigs()
  }
  // ngOnDestroy(): void {
  //   this.subscriptions.forEach(s => s.unsubscribe());
  // }

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
        // if (this.targetWorkFlowStep) {
          this.loadWorkFlowComments();
        // } else {
        //   this.initializeCommentsTable([]);
        // }
      },
      error: () => {
        this.toastr.error(this.translate.instant('COMMON.ERROR_LOADING_DATA'));
        this.router.navigate(['/']);
      }
    });
    // this.subscriptions.push(sub);
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
        if (c?.commentTypeId == 2) {
          rows.push({
            ...c,
            stepDepartmentName: step.departmentName,
            stepServiceStatus: step.serviceStatusName
          });
        }
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
  channelName(ch: any): string {
    const isAr = (this.translate.currentLang || '').toLowerCase().startsWith('ar');
    return (isAr ? (ch.nameAr || ch.nameEn) : (ch.nameEn || ch.nameAr)) || '-';
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
      // this.subscriptions.push(sub);
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
  
}
