import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MainApplyService } from '../../../../core/services/mainApplyService/mainApplyService.service';
import { ToastrService } from 'ngx-toastr';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ServiceStatus } from '../../../../core/dtos/appEnum.dto';
import { WorkFlowStepDto } from '../../../../core/dtos/mainApplyService/mainApplyService.dto';
import { MainApplyServiceReportService } from '../../../../core/services/mainApplyService/mainApplyService.reports';

@Component({
  selector: 'app-view-complaintrequest',
  imports: [CommonModule, FormsModule, ReactiveFormsModule,TranslateModule,RouterLink],
  templateUrl: './view-complaintrequest.component.html',
  styleUrls: ['./view-complaintrequest.component.scss']
})
export class ViewComplaintrequestComponent implements OnInit {

  // البيانات الخاصة بالطلب
  mainApplyService: any = null;
  workFlowSteps: any[] = [];
  workFlowQuery: any;
  targetWorkFlowStep: WorkFlowStepDto | null = null;
  lastMatchingWorkFlowStep: any = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private mainApplyServiceService: MainApplyService,
    private toastr: ToastrService,
    private translate: TranslateService,
    private mainApplyServiceReportService: MainApplyServiceReportService
  ) { }

  ngOnInit(): void {
    this.loadMainApplyServiceData();
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
        this.mainApplyService = resp;  // تخزين البيانات القادمة من الـ API في mainApplyService
        this.workFlowSteps = this.mainApplyService?.workFlowSteps ?? [];
        const matchingSteps = this.workFlowSteps.filter(
          step => [1, 2, 7].includes(step.serviceStatus ?? -1)
        );
        this.lastMatchingWorkFlowStep = matchingSteps.length
          ? matchingSteps[matchingSteps.length - 1]
          : null;
        this.findTargetWorkFlowStep();

      },
      error: () => {
        this.toastr.error(this.translate.instant('COMMON.ERROR_LOADING_DATA'));
        this.router.navigate(['/']);
      }
    });
  }

  private findTargetWorkFlowStep(): void {
    if (this.workFlowSteps && this.workFlowSteps.length > 0) {

      // Sort by stepOrder ascending and find last with serviceStatus = 7
      const sortedSteps = this.workFlowSteps
        .filter(step => step.stepOrder !== null)
        .sort((a, b) => (a.stepOrder || 0) - (b.stepOrder || 0));

      this.targetWorkFlowStep =
        sortedSteps.slice().reverse().find(step => step.serviceStatus === 7) || null;
    }
  }

  // دالة لتنسيق التاريخ (على سبيل المثال)
  formatDate(date: string | Date): string {
    if (!date) return '-';
    return new Date(date).toLocaleDateString();  // تحويل التاريخ إلى صيغة أكثر قابلية للعرض
  }

  // دالة لتنسيق التاريخ والوقت
  formatDateTime(date: string | Date): string {
    if (!date) return '-';
    return new Date(date).toLocaleString();  // تحويل التاريخ والوقت إلى صيغة أكثر قابلية للعرض
  }

  // Navigation
  goBack() { this.router.navigate(['/mainApplyService']); }


  trackByStepId(index: number, step: WorkFlowStepDto): number {
    return step.id || index;
  }

  isStepCompleted(statusId: number | null): boolean {
    if (statusId === null) return false;
    return statusId === ServiceStatus.Accept || statusId === ServiceStatus.Received;
  }

  isStepRejected(statusId: number | null): boolean {
    if (statusId === null) return false;
    return statusId === ServiceStatus.Reject || statusId === ServiceStatus.RejectForReason;
  }

  isStepPending(statusId: number | null): boolean {
    if (statusId === null) return false;
    return statusId === ServiceStatus.Wait;
  }


  getStatusColor(statusId: number | null): string {
    if (statusId === null) return '#6c757d';

    switch (statusId) {
      case ServiceStatus.Accept:
        return '#28a745'; // Green
      case ServiceStatus.Reject:
        return '#dc3545'; // Red
      case ServiceStatus.RejectForReason:
        return '#fd7e14'; // Orange
      case ServiceStatus.Wait:
        return '#ffc107'; // Yellow/Amber
      case ServiceStatus.Received:
        return '#17a2b8'; // Cyan/Teal
      case ServiceStatus.ReturnForModifications:
        return '#6f42c1'; // Purple
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
      case ServiceStatus.RejectForReason:
        return 'fas fa-exclamation-triangle';
      case ServiceStatus.Wait:
        return 'fas fa-clock';
      case ServiceStatus.Received:
        return 'fas fa-inbox';
      case ServiceStatus.ReturnForModifications:
        return 'fas fa-edit';
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
      case ServiceStatus.RejectForReason:
        return 'WORKFLOW.STATUS_REJECT_FOR_REASON';
      case ServiceStatus.Wait:
        return 'WORKFLOW.STATUS_WAITING';
      case ServiceStatus.Received:
        return 'WORKFLOW.STATUS_RECEIVED';
      case ServiceStatus.ReturnForModifications:
        return 'WORKFLOW.STATUS_RETURN_FOR_MODIFICATIONS';
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

  get isApproved(): boolean {
    const lang = (this.translate?.currentLang || localStorage.getItem('lang') || 'ar').toLowerCase();

    if (lang.startsWith('ar')) {
      return this.mainApplyService?.serviceStatusName?.includes('معتمد') ?? false;
    }
    else {
      return this.mainApplyService?.serviceStatusName?.includes('Approved') ?? false;
    }
  }


  printReport(): void {
    const serviceId = this.mainApplyService?.serviceId ?? 0;
    const id = this.mainApplyService?.id ?? '';
    var serviceStatusName = null
    const lang = (this.translate?.currentLang || localStorage.getItem('lang') || 'ar').toLowerCase();
    if (lang.startsWith('ar')) {
      serviceStatusName =
        (this.mainApplyService?.serviceStatusName?.includes("معتمد") ?? false)
          ? 'final'
          : 'initial';
    }
    else {
      serviceStatusName =
        (this.mainApplyService?.serviceStatusName?.includes("Approved") ?? false)
          ? 'final'
          : 'initial';
    }

    this.mainApplyServiceReportService.printDatabyId(id.toString(), serviceId, serviceStatusName)
  }
}
