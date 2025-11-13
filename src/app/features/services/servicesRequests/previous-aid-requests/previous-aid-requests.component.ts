import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin, Observable, of, Subject } from 'rxjs';
import { map, takeUntil } from 'rxjs/operators';
import { ColDef } from 'ag-grid-community';
import { GenericDataTableComponent } from '../../../../../shared/generic-data-table/generic-data-table.component';
import { Pagination, reportPrintConfig } from '../../../../core/dtos/FndLookUpValuesdtos/FndLookUpValues.dto';
import { AidRequestService } from '../../../../core/services/aid-request.service';
import { SpinnerService } from '../../../../core/services/spinner.service';
import { MainApplyServiceReportService } from '../../../../core/services/mainApplyService/mainApplyService.reports';
import { 
  filteraidRequestsDto, 
  aidRequestsDto, 
  filteraidRequestsByIdDto, 
  aidRequestsShowDetailsDto, 
  aidRequestsStudyDetailsDto,
  aidRequestsZakatDto,
  quotationHeaderDto
} from '../../../../core/dtos/aidRequests/aidRequests.dto';
import { PagedResult } from '../../../../core/dtos/FndLookUpValuesdtos/FndLookUpValues.dto';
import { openStandardReportService } from '../../../../core/services/openStandardReportService.service';

declare var bootstrap: any;

@Component({
  selector: 'app-previous-aid-requests',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, GenericDataTableComponent],
  templateUrl: './previous-aid-requests.component.html',
  styleUrls: ['./previous-aid-requests.component.scss']
})
export class PreviousAidRequestsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  idNumber: string = '';
  searchIdNumber: string = ''; // For search input
  pagination = new Pagination();
  
  columnDefs: ColDef[] = [];
  searchText: string = '';
  columnHeaderMap: { [key: string]: string } = {};
  rowActions: Array<{ label: string, icon?: string, action: string }> = [];

  loadgridData: aidRequestsDto[] = [];
  loadformData: aidRequestsShowDetailsDto = {} as aidRequestsShowDetailsDto;
  loadstudydetailformData: aidRequestsStudyDetailsDto = {} as aidRequestsStudyDetailsDto;
  loadQuotationDetailFormData: quotationHeaderDto = {} as quotationHeaderDto;
  loadZakatdetailformData: aidRequestsZakatDto = {} as aidRequestsZakatDto;

  loadexcelData: any[] = [];
  lang: any;


  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private aidRequestService: AidRequestService,
    private toastr: ToastrService,
    private translate: TranslateService,
    private spinnerService: SpinnerService,
    private mainApplyServiceReportService: MainApplyServiceReportService,
    private openStandardReportService: openStandardReportService,
  ) {}

  ngOnInit(): void {
    // Build column definitions and row actions
    this.buildColumnDefs();
    this.rowActions = [
      { label: this.translate.instant('Common.ViewInfo'), icon: 'icon-frame-view', action: 'onViewInfo' },
      { label: this.translate.instant('Common.StudyDetails'), icon: 'icon-frame-view', action: 'onViewStudyDetailsInfo' },
    ];

    // Get ID number from route parameter (optional)
    this.route.params.subscribe(params => {
      const encodedIdNumber = params['idNumber'] || '';
      if (encodedIdNumber) {
        try {
          // Decode the ID number from URL
          this.idNumber = atob(encodedIdNumber);
          this.searchIdNumber = this.idNumber;
          this.getLoadDataGrid({ pageNumber: 1, pageSize: this.pagination.take });
        } catch (error) {
          this.toastr.error(this.translate.instant('ERRORS.INVALID_ID_NUMBER'));
        }
      }
      // If no idNumber, page will show search form without data
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onPageChange(event: { pageNumber: number; pageSize: number }): void {
    this.pagination.currentPage = event.pageNumber;
    this.pagination.take = event.pageSize;
    this.getLoadDataGrid({ pageNumber: event.pageNumber, pageSize: event.pageSize });
  }

  onTableSearch(text: string): void {
    this.searchText = text;
    this.getLoadDataGrid({ pageNumber: 1, pageSize: this.pagination.take });
  }

  getLoadDataGrid(event: { pageNumber: number; pageSize: number }): void {
    if (!this.idNumber) {
      this.toastr.error(this.translate.instant('ERRORS.INVALID_ID_NUMBER'));
      return;
    }

    this.pagination.currentPage = event.pageNumber;
    this.pagination.take = event.pageSize;
    const skip = (event.pageNumber - 1) * event.pageSize;
    
    // idNumber is required parameter (no entityId)
    const searchParams = new filteraidRequestsDto();
    searchParams.skip = skip;
    searchParams.take = event.pageSize;
    searchParams.caseIdNo = this.idNumber; // Required parameter
    searchParams.searchValue = this.searchText || null;
    searchParams.orderByValue = 'details1.CASE_CODE asc'; // Required parameter

    this.spinnerService.show();
    this.aidRequestService.getAll(searchParams)
      .pipe(takeUntil(this.destroy$)).subscribe({
        next: (response: any) => {
          // Data comes in response.data array
          this.loadgridData = response.data || [];
          this.loadgridData.forEach((c: any) => {
            c.comitY_DATEstr = c.comityDatestr || this.mainApplyServiceReportService.formatDate(c.comityDate ?? null);
          });
          this.pagination.totalCount = response.totalCount || (response.data?.[0]?.rowsCount ? parseInt(response.data[0].rowsCount) : 0);
          this.spinnerService.hide();
        },
        error: () => {
          this.toastr.error(this.translate.instant('ERRORS.FAILED_LOAD_DATA'));
          this.spinnerService.hide();
        }
      });
  }

  getFormDatabyId(caseCode: string, entityId: string, caseid: string): void {
    this.spinnerService.show();
    const params: filteraidRequestsByIdDto = {
      caseCode: caseCode,
      entityId: entityId,
      caseId: caseid,
      headerId: null,
      studyId: null
    };
    
    forkJoin({
      showdetailheaderdata: this.aidRequestService.getShowDetailById(params) as Observable<aidRequestsShowDetailsDto>,
    })
      .pipe(takeUntil(this.destroy$)).subscribe({
        next: (result) => {
          this.loadformData = result.showdetailheaderdata;
          this.loadformData.aidRequestDateStr = this.mainApplyServiceReportService.formatDate(this.loadformData.aidRequestDate ?? null);
          this.loadformData.caseBirthDateStr = this.mainApplyServiceReportService.formatDate(this.loadformData.caseBirthDate ?? null);
          this.loadformData.idEndDateStr = this.mainApplyServiceReportService.formatDate(this.loadformData.idEndDate ?? null);
          this.loadformData.wifeIdEndDateStr = this.mainApplyServiceReportService.formatDate(this.loadformData.wifeIdEndDate ?? null);
          
          const modalElement = document.getElementById('viewdetails');
          if (modalElement) {
            const modal = new bootstrap.Modal(modalElement);
            modal.show();
          }

          this.spinnerService.hide();
        },
        error: () => {
          this.spinnerService.hide();
        }
      });
  }

  getStudyDetailsFormDatabyId(source: string, entityId: string, studyId: string, headerId: string): void {
    const params: filteraidRequestsByIdDto = {
      entityId: entityId,
      studyId: studyId,
      headerId: headerId,
      caseCode: null,
      caseId: null
    };

    this.spinnerService.show();
    if (source == '1') {
      forkJoin({
        showstudydetaildata: this.aidRequestService.getAidRequestsStudyById(params) as Observable<aidRequestsStudyDetailsDto | aidRequestsStudyDetailsDto[]>,
      })
        .pipe(takeUntil(this.destroy$)).subscribe({
          next: (result) => {
            this.loadstudydetailformData = Array.isArray(result.showstudydetaildata)
              ? result.showstudydetaildata[0] ?? ({} as aidRequestsStudyDetailsDto)
              : result.showstudydetaildata;

            const modalElement = document.getElementById('viewstudydetails');
            if (modalElement) {
              const modal = new bootstrap.Modal(modalElement);
              modal.show();
            }

            this.spinnerService.hide();
          },
          error: (err) => {
            this.toastr.info(this.translate.instant(err.error?.reason || 'ERRORS.FAILED_LOAD_DATA'));
            this.spinnerService.hide();
          }
        });
    } else if (source == '5') {
      forkJoin({
        showquotationDetailData: this.aidRequestService.getQuotationHeaderDetailById(params) as Observable<quotationHeaderDto | quotationHeaderDto[]>,
      })
        .pipe(takeUntil(this.destroy$)).subscribe({
          next: (result) => {
            this.loadQuotationDetailFormData = Array.isArray(result.showquotationDetailData)
              ? result.showquotationDetailData[0] ?? ({} as quotationHeaderDto)
              : result.showquotationDetailData;

            const modalElement = document.getElementById('viewquotationdetails');
            if (modalElement) {
              const modal = new bootstrap.Modal(modalElement);
              modal.show();
            }

            this.spinnerService.hide();
          },
          error: (err) => {
            this.toastr.info(this.translate.instant(err.error?.reason || 'ERRORS.FAILED_LOAD_DATA'));
            this.spinnerService.hide();
          }
        });
    } else if (source == '6') {
      forkJoin({
        showZakatdetaildata: this.aidRequestService.getZakatStudyDetailById(params) as Observable<aidRequestsZakatDto | aidRequestsZakatDto[]>,
      })
        .pipe(takeUntil(this.destroy$)).subscribe({
          next: (result) => {
            this.loadZakatdetailformData = Array.isArray(result.showZakatdetaildata)
              ? result.showZakatdetaildata[0] ?? ({} as aidRequestsZakatDto)
              : result.showZakatdetaildata;

            const modalElement = document.getElementById('viewzakatdetails');
            if (modalElement) {
              const modal = new bootstrap.Modal(modalElement);
              modal.show();
            }

            this.spinnerService.hide();
          },
          error: (err) => {
            this.spinnerService.hide();
          }
        });
    } else {
      this.translate
        .get(['InvalidSourceError', 'Common.Required'])
        .subscribe(translations => {
          this.toastr.warning(`${translations['InvalidSourceError']}`);
        });
      this.spinnerService.hide();
      return;
    }
    this.spinnerService.hide();
  }

  public buildColumnDefs(): void {
    this.translate.get([
      'AidRequestsResourceName.entitY_NAME',
      'AidRequestsResourceName.namE_AR',
      'AidRequestsResourceName.source',
      'AidRequestsResourceName.aiD_TYPE',
      'AidRequestsResourceName.comitY_DATE',
      'AidRequestsResourceName.requesT_TYPE_DESC',
      'AidRequestsResourceName.status',
      'AidRequestsResourceName.caseNo',
      'AidRequestsResourceName.amount'
    ]).subscribe(translations => {
      this.columnDefs = [
        { headerName: translations['AidRequestsResourceName.entitY_NAME'], field: 'entityName', width: 200 },
        { headerName: translations['AidRequestsResourceName.namE_AR'], field: 'nameAr', width: 200 },
        { headerName: translations['AidRequestsResourceName.source'], field: 'sourceDesc', width: 200 },
        { headerName: translations['AidRequestsResourceName.aiD_TYPE'], field: 'aidType', width: 200 },
        { headerName: translations['AidRequestsResourceName.comitY_DATE'], field: 'comityDatestr', width: 200 },
        { headerName: translations['AidRequestsResourceName.requesT_TYPE_DESC'], field: 'reqTypeDesc', width: 200 },
        { headerName: translations['AidRequestsResourceName.status'], field: 'statDesc', width: 200 },
        { headerName: translations['AidRequestsResourceName.caseNo'], field: 'caseNo', width: 200 },
        { headerName: translations['AidRequestsResourceName.amount'], field: 'amountstr', width: 200 },
      ];
    });
  }

  onTableAction(event: { action: string, row: any }) {
    const data = event.row.composeKey?.split(',') || [];
    const source = data[0];
    const studyId = data[1];
    const caseCode = event.row.casE_CODE || data[2];
    const entityId = event.row.entity_ID || data[3];
    const caseid = event.row.casE_ID || data[4];
    const headerId = event.row.headeR_ID;

    if (event.action === 'onViewInfo') {
      this.getFormDatabyId(caseCode, entityId, caseid);
    }
    if (event.action === 'onViewStudyDetailsInfo') {
      this.getStudyDetailsFormDatabyId(source, entityId, studyId, headerId);
    }
  }

  goBack(): void {
    this.router.navigate(['/services-requests/request-event-permits']);
  }

  // Search by ID number
  onSearchByIdNumber(): void {
    if (!this.searchIdNumber || this.searchIdNumber.trim() === '') {
      this.toastr.error(this.translate.instant('VALIDATION.REQUIRED_FIELD'));
      return;
    }
    
    const cleanIdNumber = this.searchIdNumber.toString().trim().replace(/[-\s]/g, '');
    this.idNumber = cleanIdNumber;
    this.pagination.currentPage = 1;
    this.getLoadDataGrid({ pageNumber: 1, pageSize: this.pagination.take });
  }

  // Clear search
  onClearSearch(): void {
    this.searchIdNumber = '';
    this.idNumber = '';
    this.loadgridData = [];
    this.pagination.totalCount = 0;
  }

  private cleanFilterObject(obj: any): any {
    const cleaned = { ...obj };
    Object.keys(cleaned).forEach((key) => {
      if (cleaned[key] === '') {
        cleaned[key] = null;
      }
    });
    return cleaned;
  }


  printExcel(): void {
    this.spinnerService.show();
    if (!this.idNumber) {
      this.toastr.error(this.translate.instant('ERRORS.INVALID_ID_NUMBER'));
      this.spinnerService.hide();
      return;
    }

    const searchParams = new filteraidRequestsDto();
    searchParams.caseIdNo = this.idNumber;
    searchParams.searchValue = this.searchText || null;
    searchParams.orderByValue = 'details1.CASE_CODE asc';

    const cleanedFilters = this.cleanFilterObject(searchParams);
    this.aidRequestService.getAll({ ...cleanedFilters })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (initialResponse: any) => {
          const totalCount = initialResponse?.totalCount || initialResponse?.data?.length || 0;

          this.aidRequestService.getAll({ ...cleanedFilters, skip: 0, take: totalCount })
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: (response: any) => {
                const data = response?.data || response || [];

                const reportConfig: reportPrintConfig = {
                  title: this.translate.instant('mainApplyServiceResourceName.title'),
                  reportTitle: this.translate.instant('mainApplyServiceResourceName.title'),
                  fileName: `${this.translate.instant('mainApplyServiceResourceName.title')}_${new Date().toISOString().slice(0, 10)}.xlsx`,
                  columns: [
                    { label: '#', key: 'rowNo', title: '#' },
                    { label: this.translate.instant('AidRequestsResourceName.entitY_NAME'), key: 'entityName' },
                    { label: this.translate.instant('AidRequestsResourceName.namE_AR'), key: 'nameAr' },
                    { label: this.translate.instant('AidRequestsResourceName.source'), key: 'sourceDesc' },
                    { label: this.translate.instant('AidRequestsResourceName.aiD_TYPE'), key: 'aidType' },
                    { label: this.translate.instant('AidRequestsResourceName.comitY_DATE'), key: 'comityDatestr' },
                    { label: this.translate.instant('AidRequestsResourceName.requesT_TYPE_DESC'), key: 'reqTypeDesc' },
                    { label: this.translate.instant('AidRequestsResourceName.status'), key: 'statDesc' },
                    { label: this.translate.instant('AidRequestsResourceName.caseNo'), key: 'caseNo' },
                    { label: this.translate.instant('AidRequestsResourceName.amount'), key: 'amountstr' },
                  ],
                  data: data.map((item: any, index: number) => ({
                    ...item,
                    rowNo: index + 1
                  })),
                  totalLabel: this.translate.instant('Common.Total'),
                  totalKeys: ['amountstr']
                };
                this.openStandardReportService.openStandardReportExcel(reportConfig);
                this.spinnerService.hide();
              },
              error: () => {
                this.spinnerService.hide();
              }
            });
        },
        error: () => {
          this.spinnerService.hide();
        },

      });
  }


  
}
