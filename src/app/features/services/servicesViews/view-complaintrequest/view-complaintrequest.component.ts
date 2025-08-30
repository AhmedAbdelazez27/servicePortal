import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MainApplyService } from '../../../../core/services/mainApplyService/mainApplyService.service';
import { ToastrService } from 'ngx-toastr';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-view-complaintrequest',
  imports: [CommonModule, FormsModule, ReactiveFormsModule,TranslateModule,RouterLink],
  templateUrl: './view-complaintrequest.component.html',
  styleUrls: ['./view-complaintrequest.component.scss']
})
export class ViewComplaintrequestComponent implements OnInit {

  // البيانات الخاصة بالطلب
  mainApplyService: any = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private mainApplyServiceService: MainApplyService,
    private toastr: ToastrService,
    private translate: TranslateService
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
        console.log(resp);
      },
      error: () => {
        this.toastr.error(this.translate.instant('COMMON.ERROR_LOADING_DATA'));
        this.router.navigate(['/']);
      }
    });
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
}
