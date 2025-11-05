import { Component, Injectable } from '@angular/core';
import { MainApplyServiceReportService } from '../../core/services/mainApplyService/mainApplyService.reports';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-report-viewer',
  imports: [CommonModule, FormsModule],
  templateUrl: './report-viewer.component.html',
  styleUrl: './report-viewer.component.scss'
})

  @Injectable({
    providedIn: 'root',
  })
export class ReportViewerComponent {
  constructor(
    private mainApplyServiceReportService: MainApplyServiceReportService,
    private route: ActivatedRoute
      
    ) { }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    const status = this.route.snapshot.paramMap.get('status');
    const serviceId = Number(this.route.snapshot.paramMap.get('serviceId'));

    if (id && status && serviceId) {
      this.printDatabyId(id, serviceId, status);
    } else {
      console.error('Missing required route parameters (id, serviceId, status)');
    }
  }



  printDatabyId(id: string, serviceId: number, status: string): void {
   
    this.mainApplyServiceReportService.printData(id.toString(), serviceId, status)
  }
}
