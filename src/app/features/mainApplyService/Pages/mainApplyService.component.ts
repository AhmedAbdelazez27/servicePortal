import { Component, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, NgForm, Validators } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { forkJoin, Observable, Subject } from 'rxjs';
import { debounceTime, takeUntil } from 'rxjs/operators';
import { NgSelectComponent } from '@ng-select/ng-select';
import { ColDef, GridOptions } from 'ag-grid-community';
import { GenericDataTableComponent } from '../../../../shared/generic-data-table/generic-data-table.component';
import { FiltermainApplyServiceDto, FiltermainApplyServiceByIdDto, mainApplyServiceDto} from '../../../core/dtos/mainApplyService/mainApplyService.dto';
import { SpinnerService } from '../../../core/services/spinner.service';
import { Select2Service } from '../../../core/services/Select2.service';
import { openStandardReportService } from '../../../core/services/openStandardReportService.service';
import { Pagination, FndLookUpValuesSelect2RequestDto, SelectdropdownResultResults, Select2RequestDto, SelectdropdownResult, reportPrintConfig } from '../../../core/dtos/FndLookUpValuesdtos/FndLookUpValues.dto';
import { MainApplyService } from '../../../core/services/mainApplyService/mainApplyService.service';
import { Router } from '@angular/router';
import { AppEnum } from '../../../core/dtos/appEnum.dto';
 

declare var bootstrap: any;

@Component({
  selector: 'app-mainApplyService',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, GenericDataTableComponent],
  templateUrl: './mainApplyService.component.html',
  styleUrls: ['./mainApplyService.component.scss']
})

export class MainApplyServiceComponent {
  @ViewChild('filterForm') filterForm!: NgForm;
  @ViewChild(GenericDataTableComponent) genericTable!: GenericDataTableComponent;

  private destroy$ = new Subject<void>();
  userserviceForm!: FormGroup;
  searchInput$ = new Subject<string>();
  translatedHeaders: string[] = [];
  pagination = new Pagination();

  columnDefs: ColDef[] = [];
  gridOptions: GridOptions = { pagination: false };
  searchText: string = '';
  columnHeaderMap: { [key: string]: string } = {};
  rowActions: Array<{ label: string, icon?: string, action: string }> = [];


  searchParams = new FiltermainApplyServiceDto();
  appEnum = new AppEnum();
  searchSelect2Params = new FndLookUpValuesSelect2RequestDto();
  searchParamsById = new FiltermainApplyServiceByIdDto();

  loadgridData: mainApplyServiceDto[] = [];
  loadformData: mainApplyServiceDto = {} as mainApplyServiceDto;


  constructor(
    private mainApplyService: MainApplyService,
    private toastr: ToastrService,
    private translate: TranslateService,
    private openStandardReportService: openStandardReportService,
    private spinnerService: SpinnerService,
    private Select2Service: Select2Service,
    private fb: FormBuilder,
    private router: Router
  )
  {
    
    this.userserviceForm = this.fb.group({
      serviceIds: [[], Validators.required]
    });
  }

  ngOnInit(): void {
    this.buildColumnDefs();
    this.rowActions = [
      { label: this.translate.instant('Common.ViewInfo'), icon: 'icon-frame-view', action: 'onViewInfo' },
      // { label: this.translate.instant('Common.requestComplaint'), icon: 'icon-frame-view', action: 'onRequestComplaint' },
    ];
   
    this.getLoadDataGrid({ pageNumber: 1, pageSize: this.pagination.take });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSearch(): void {
    this.getLoadDataGrid({ pageNumber: 1, pageSize: this.pagination.take });
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

  private cleanFilterObject(obj: any): any {
    const cleaned = { ...obj };
    Object.keys(cleaned).forEach((key) => {
      if (cleaned[key] === '') {
        cleaned[key] = null;
      }
    });
    return cleaned;
  }

  clear(): void {
    this.searchParams = new FiltermainApplyServiceDto();
    this.getLoadDataGrid({ pageNumber: 1, pageSize: this.pagination.take });  
  }


  getLoadDataGrid(event: { pageNumber: number; pageSize: number }): void {
    this.pagination.currentPage = event.pageNumber;
    this.pagination.take = event.pageSize;
    const skip = (event.pageNumber - 1) * event.pageSize;
    this.searchParams.skip = skip;
    this.searchParams.userId = localStorage.getItem('userId');

    const cleanedFilters = this.cleanFilterObject(this.searchParams);
    this.spinnerService.show();

    this.mainApplyService.getAll(cleanedFilters)
      .pipe(takeUntil(this.destroy$)).subscribe({
        next: (response: any) => {
          this.loadgridData = response.data || [];
          this.pagination.totalCount = response.totalCount || 0;
          this.spinnerService.hide();
      },
        error: (error) => {
          this.spinnerService.hide();;
      }
    });
  }

  getFormDatabyId(id: string, serviceId:string): void {
    const params: FiltermainApplyServiceByIdDto = {
      id: id
    };
    this.spinnerService.show();
    forkJoin({
      mischeaderdata: this.mainApplyService.getDetailById(params) as Observable<mainApplyServiceDto | mainApplyServiceDto[]>,
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (result) => {
       
        this.loadformData = Array.isArray(result.mischeaderdata)
          ? result.mischeaderdata[0] ?? ({} as mainApplyServiceDto)
          : result.mischeaderdata;

        this.spinnerService.hide();
        if (serviceId == this.appEnum.serviceId7) {
          this.router.navigate(['/request-plaint'], {
            state: { loadformData: this.loadformData }
          });
        }
        if (serviceId == this.appEnum.serviceId1002) { 
          this.router.navigate([`/view-services-requests/complaint-request/${params.id}`], {
            state: { loadformData: this.loadformData }
          });
        }   
         if (serviceId == this.appEnum.serviceId2) {
          this.router.navigate([`/view-services-requests/charity-event-permit/${params.id}`], {
            state: { loadformData: this.loadformData }
          });
        } if (serviceId == this.appEnum.serviceId6) {
          this.router.navigate([`/view-services-requests/request-event-permit/${params.id}`], {
            state: { loadformData: this.loadformData }
          });
        }
        this.spinnerService.hide();
      },
      error: (err) => {
        this.spinnerService.hide();;
     }
    });
  }

  private buildColumnDefs(): void {
    this.columnDefs = [
      // {
      //   headerName: '#',
      //   valueGetter: (params) =>
      //     (params?.node?.rowIndex ?? 0) + 1 + ((this.pagination.currentPage - 1) * this.pagination.take),
      //   width: 60,
      //   colId: 'serialNumber'
      // },
      { headerName: this.translate.instant('mainApplyServiceResourceName.Servicename'), field: 'service.serviceName', width: 200 },
      { headerName: this.translate.instant('mainApplyServiceResourceName.RefNo'), field: 'applyNo', width: 200 },
      { headerName: this.translate.instant('mainApplyServiceResourceName.EventNameAdv'), field: 'requestEventPermit.eventName', width: 200 },
      { 
  headerName: this.translate.instant('mainApplyServiceResourceName.applydate'), 
  field: 'applyDate', 
  width: 200,
  valueFormatter: (params) => {
    if (!params.value) return '';
    const date = new Date(params.value);
    return `${date.getDate()}/${date.getMonth()+1}/${date.getFullYear()}`;
  }
}
,
       { headerName: this.translate.instant('mainApplyServiceResourceName.permitNumber'), field: 'permitNumber', width: 200 },
      { 
        headerName: this.translate.instant('mainApplyServiceResourceName.statues'), 
        field: 'lastStatusEN', 
        width: 200,
        cellRenderer: (params: any) => {
          const statusClass = this.getStatusClass(params.data.serviceStatus);
          return `<div class="${statusClass}">${params.value || ''}</div>`;
        }
      },
    ];
  }

  onTableAction(event: { action: string, row: any }) {
    if (event.action === 'onViewInfo') {



      // Check if serviceId is 1 (Fasting Tent Request)
      if (event.row.serviceId === 1) {
        // Route to the new view component
        this.router.navigate(['/view-fasting-tent-request', event.row.id]);
      }
      // Check if serviceId is 1001 (Distribution Site Permit Application)
      else if (event.row.serviceId === 1001) {
        // Route to the new view distribution site permit component
        this.router.navigate(['/view-distribution-site-permit', event.row.id]);
      }
      // else if (event.row.serviceId == this.appEnum.serviceId7) {
      //   this.getFormDatabyId(event.row.id, event.row.serviceId);
      // }
      else if (event.row.serviceId  == this.appEnum.serviceId2) {
          
          this.router.navigate([`/view-services-requests/charity-event-permit/${event.row.id}`], {
            state: { loadformData: this.loadformData }
          });
        }else if (event.row.serviceId  == this.appEnum.serviceId6) {
          
          this.router.navigate([`/view-services-requests/request-event-permit/${event.row.id}`], {
            state: { loadformData: this.loadformData }
          });
        }else if (event.row.serviceId  == this.appEnum.serviceId7) {
          
          this.router.navigate([`/view-services-requests/plaint-request/${event.row.id}`], {
            state: { loadformData: this.loadformData }
          });
        }
        else if (event.row.serviceId  == this.appEnum.serviceId1002) {
          
          this.router.navigate([`/view-services-requests/complaint-request/${event.row.id}`], {
            state: { loadformData: this.loadformData }
          });
        }
      else {
        this.translate
          .get(['mainApplyServiceResourceName.NoPermission', 'Common.Required'])
          .subscribe(translations => {
            this.toastr.error(
              `${translations['mainApplyServiceResourceName.NoPermission']}`,
            );
          });
        return;
      }
    }
    if (event.action === 'onRequestComplaint') {
      if (event.row.serviceId == this.appEnum.serviceId1002) {
        this.getFormDatabyId(event.row.id, event.row.serviceId);
      }
      else {
        this.translate
          .get(['mainApplyServiceResourceName.NoPermission', 'Common.Required'])
          .subscribe(translations => {
            this.toastr.error(
              `${translations['mainApplyServiceResourceName.NoPermission']}`,
            );
          });
        return;
      }
    }
  }

  private getStatusClass(serviceStatus: number): string {
    switch (serviceStatus) {
      case 1: // Accept
        return 'status-approved';
      case 2: // Reject
        return 'status-rejected';
      case 3: // Reject For Reason
        return 'status-reject-for-reason';
      case 4: // Waiting
        return 'status-waiting';
      case 5: // Received
        return 'status-received';
      case 7: // Return For Modifications
        return 'status-return-for-modification';
      default:
        return 'status-waiting';
    }
  }


  printExcel(): void {
    this.spinnerService.show();;
    const cleanedFilters = this.cleanFilterObject(this.searchParams);
   
    this.mainApplyService.getAll({ ...cleanedFilters, skip: 0, take: 1 })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (initialResponse: any) => {
          const totalCount = initialResponse.totalCount || 0;

          this.mainApplyService.getAll({ ...cleanedFilters, skip: 0, take: totalCount })
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: (response: any) => {
                const data = response?.data || [];

                const reportConfig: reportPrintConfig = {
                  title: this.translate.instant('mainApplyServiceResourceName.mainApplyService_Title'),
                  reportTitle: this.translate.instant('mainApplyServiceResourceName.mainApplyService_Title'),
                  fileName: `${this.translate.instant('mainApplyServiceResourceName.mainApplyService_Title')}_${new Date().toISOString().slice(0, 10)}.xlsx`,
                  fields: [
                    { label: this.translate.instant('mainApplyServiceResourceName.serviceId'), value: this.searchParams.serviceIdstr },
                    { label: this.translate.instant('mainApplyServiceResourceName.userId'), value: this.searchParams.userIdstr },
                    { label: this.translate.instant('mainApplyServiceResourceName.serviceType'), value: this.searchParams.serviceTypestr },
                    { label: this.translate.instant('mainApplyServiceResourceName.serviceStatus'), value: this.searchParams.serviceStatusstr },
                    { label: this.translate.instant('mainApplyServiceResourceName.applyDate'), value: this.searchParams.applyDatestr },
                    { label: this.translate.instant('mainApplyServiceResourceName.applyNo'), value: this.searchParams.applyNo },
                  ],

                  columns: [
                    { label: '#', key: 'rowNo', title: '#' },
                    { label: this.translate.instant('mainApplyServiceResourceName.Servicename'), key: 'serviceNameAr' },
                    { label: this.translate.instant('mainApplyServiceResourceName.RefNo'), key: 'applyNo' },
                    { label: this.translate.instant('mainApplyServiceResourceName.EventNameAdv'), key: 'eventName' },
                    { label: this.translate.instant('mainApplyServiceResourceName.applydate'), key: 'applyDatestr' },
                    { label: this.translate.instant('mainApplyServiceResourceName.permitNumber'), key: 'permitNumber' },
                    { label: this.translate.instant('mainApplyServiceResourceName.statues'), key: 'lastStatusEN' },
                  ],
                  data: data.map((item: any, index: number) => ({
                    ...item,
                    rowNo: index + 1
                  })),
                  totalLabel: this.translate.instant('Common.Total'),
                  totalKeys: ['amounTstr']
                };

                this.openStandardReportService.openStandardReportExcel(reportConfig);
                this.spinnerService.hide();;
              },
              error: () => {
                this.spinnerService.hide();
              }
            });
        },
        error: () => {
          this.spinnerService.hide();
        }
      });
  }
}

