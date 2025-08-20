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

declare var bootstrap: any;

@Component({
  selector: 'app-mainApplyService',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, NgSelectComponent, GenericDataTableComponent],
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
  paginationDetailData = new Pagination();
  paginationLineData = new Pagination();

  columnDefs: ColDef[] = [];
  columnDefsDetailData: ColDef[] = [];
  columnDefsLineData: ColDef[] = [];
  gridOptions: GridOptions = { pagination: false };
  searchText: string = '';
  columnHeaderMap: { [key: string]: string } = {};
  rowActions: Array<{ label: string, icon?: string, action: string }> = [];


  searchParams = new FiltermainApplyServiceDto();
  searchSelect2Params = new FndLookUpValuesSelect2RequestDto();
  searchParamsById = new FiltermainApplyServiceByIdDto();

  loadgridData: mainApplyServiceDto[] = [];
  loadformData: mainApplyServiceDto = {} as mainApplyServiceDto;

  serviceSelect2: SelectdropdownResultResults[] = [];
  loadingservice = false;
  servicesearchParams = new Select2RequestDto();
  selectedserviceSelect2Obj: any = null;
  serviceSearchInput$ = new Subject<string>();

  statusSelect2: SelectdropdownResultResults[] = [];
  loadingstatus = false;
  statussearchParams = new Select2RequestDto();
  selectedstatusSelect2Obj: any = null;
  statusSearchInput$ = new Subject<string>();

  serviceTypeSelect2: SelectdropdownResultResults[] = [];
  loadingserviceType = false;
  serviceTypesearchParams = new Select2RequestDto();
  selectedserviceTypeSelect2Obj: any = null;
  serviceTypeSearchInput$ = new Subject<string>();

  userNameSelect2: SelectdropdownResultResults[] = [];
  loadinguserName = false;
  userNamesearchParams = new Select2RequestDto();
  selecteduserNameSelect2Obj: any = null;
  userNameSearchInput$ = new Subject<string>();

  constructor(
    private mainApplyService: MainApplyService,
    private toastr: ToastrService,
    private translate: TranslateService,
    private openStandardReportService: openStandardReportService,
    private spinnerService: SpinnerService,
    private Select2Service: Select2Service,
    private fb: FormBuilder
  )
  {
    this.translate.setDefaultLang('en');
    this.translate.use('en');
    this.userserviceForm = this.fb.group({
      serviceIds: [[], Validators.required]
    });
  }

  ngOnInit(): void {
    this.buildColumnDefs();
    this.rowActions = [
      { label: this.translate.instant('Common.ViewInfo'), icon: 'icon-frame-view', action: 'onViewInfo' },
    ];
    this.serviceSearchInput$
      .pipe(debounceTime(300), takeUntil(this.destroy$))
      .subscribe(() => this.fetchserviceSelect2());

    this.statusSearchInput$
      .pipe(debounceTime(300), takeUntil(this.destroy$))
      .subscribe(() => this.fetchstatusSelect2());

    this.serviceTypeSearchInput$
      .pipe(debounceTime(300), takeUntil(this.destroy$))
      .subscribe(() => this.fetchserviceTypeSelect2());

    this.userNameSearchInput$
      .pipe(debounceTime(300), takeUntil(this.destroy$))
      .subscribe(() => this.fetchuserNameSelect2());

    this.fetchserviceSelect2();
    this.fetchstatusSelect2();
    this.fetchuserNameSelect2();
    this.fetchserviceTypeSelect2();
    this.getLoadDataGrid({ pageNumber: 1, pageSize: this.pagination.take });
  }


  onserviceSearch(event: { term: string; items: any[] }): void {
    const search = event.term;
    const searchVal = event.term?.trim() || null;

    this.servicesearchParams.skip = 0;
    this.servicesearchParams.searchValue = searchVal;
    this.serviceSelect2 = [];
    this.serviceSearchInput$.next(search);
  }

  loadMoreservice(): void {
    this.servicesearchParams.skip++;
    this.fetchserviceSelect2();
  }

  fetchserviceSelect2(): void {
    this.loadingservice = true;
    this.searchSelect2Params.searchValue = this.servicesearchParams.searchValue;
    this.searchSelect2Params.skip = this.servicesearchParams.skip;
    this.searchSelect2Params.take = this.servicesearchParams.take;

    this.Select2Service.getServiceSelect2(this.searchSelect2Params)
      .pipe(takeUntil(this.destroy$)).subscribe({
        next: (response: SelectdropdownResult) => {
          const newItems = response?.results || [];
          this.serviceSelect2 = [...this.serviceSelect2, ...newItems];
          this.loadingservice = false;
        },
        error: () => this.loadingservice = false
      });
  }

  onserviceSelect2Change(slelectedservice: any): void {
    if (slelectedservice) {
      this.searchParams.serviceId = slelectedservice.id;
      this.searchParams.serviceIdstr = slelectedservice.text;
    } else {
      this.searchParams.serviceId = null;
      this.searchParams.serviceIdstr = null;
    }
  }


  onstatusSearch(event: { term: string; items: any[] }): void {
    const search = event.term;
    const searchVal = event.term?.trim() || null;
    this.statussearchParams.skip = 0;
    this.statussearchParams.searchValue = searchVal;
    this.statusSelect2 = [];
    this.statusSearchInput$.next(search);
  }

  loadMorestatus(): void {
    this.statussearchParams.skip++;
    this.fetchstatusSelect2();
  }

  fetchstatusSelect2(): void {
    this.loadingstatus = true;
    this.searchSelect2Params.searchValue = this.statussearchParams.searchValue;
    this.searchSelect2Params.skip = this.statussearchParams.skip;
    this.searchSelect2Params.take = this.statussearchParams.take;

    this.Select2Service.getArMiscStatusSelect2(this.searchSelect2Params)
      .pipe(takeUntil(this.destroy$)).subscribe({
        next: (response: SelectdropdownResult) => {
          this.statusSelect2 = response?.results || [];
          this.loadingstatus = false;
        },
        error: () => this.loadingstatus = false
      });
  }

  onstatusSelect2Change(selectedstatus: any): void {
    if (selectedstatus) {
      this.searchParams.serviceStatus = selectedstatus.id;
      this.searchParams.serviceStatusstr = selectedstatus.text;
    } else {
      this.searchParams.serviceStatus = null;
      this.searchParams.serviceStatusstr = null;
    }
  }

  onserviceTypeSearch(event: { term: string; items: any[] }): void {
    const search = event.term;
    const searchVal = event.term?.trim() || null;
    this.searchSelect2Params.searchValue = searchVal;
    this.serviceTypesearchParams.skip = 0;
    this.serviceTypesearchParams.searchValue = search;
    this.serviceTypeSelect2 = [];
    this.serviceTypeSearchInput$.next(search);
  }

  loadMoreserviceType(): void {
    this.serviceTypesearchParams.skip++;
    this.fetchserviceTypeSelect2();
  }

  fetchserviceTypeSelect2(): void {
    this.loadingserviceType = true;
    this.searchSelect2Params.searchValue = this.serviceTypesearchParams.searchValue;
    this.searchSelect2Params.skip = this.serviceTypesearchParams.skip;
    this.searchSelect2Params.take = this.serviceTypesearchParams.take;
    this.Select2Service.getServiceTypeSelect2(this.searchSelect2Params)
      .pipe(takeUntil(this.destroy$)).subscribe({
        next: (response: SelectdropdownResult) => {
          this.serviceTypeSelect2 = response?.results || [];
          this.loadingserviceType = false;
        },
        error: () => this.loadingserviceType = false
      });
  }

  onserviceTypeSelect2Change(selectedserviceType: any): void {
    if (selectedserviceType) {
      this.searchParams.serviceType = selectedserviceType.id;
      this.searchParams.serviceTypestr = selectedserviceType.text;
    } else {
      this.searchParams.serviceType = null;
      this.searchParams.serviceTypestr = null;
    }
  }

  onuserNameSearch(event: { term: string; items: any[] }): void {
    const search = event.term;
    const searchVal = event.term?.trim() || null;
    this.searchSelect2Params.searchValue = searchVal;
    this.userNamesearchParams.skip = 0;
    this.userNamesearchParams.searchValue = search;
    this.userNameSelect2 = [];
    this.userNameSearchInput$.next(search);
  }

  loadMoreuserName(): void {
    this.userNamesearchParams.skip++;
    this.fetchuserNameSelect2();
  }

  fetchuserNameSelect2(): void {
    this.loadinguserName = true;
    this.searchSelect2Params.searchValue = this.userNamesearchParams.searchValue;
    this.searchSelect2Params.skip = this.userNamesearchParams.skip;
    this.searchSelect2Params.take = this.userNamesearchParams.take;

    this.Select2Service.getUsersSelect2(this.searchSelect2Params)
      .pipe(takeUntil(this.destroy$)).subscribe({
        next: (response: SelectdropdownResult) => {
          this.userNameSelect2 = response?.results || [];
          this.loadinguserName = false;
        },
        error: () => this.loadinguserName = false
      });
  }

  onuserNameSelect2Change(selectuserName: any): void {
    if (selectuserName) {
      this.searchParams.userId = selectuserName.id;
      this.searchParams.userIdstr = selectuserName.text;
    } else {
      this.searchParams.userId = null;
      this.searchParams.userIdstr = null;
    }
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

  onPageChangeDetailData(event: { pageNumber: number; pageSize: number }): void {
    this.paginationDetailData.currentPage = event.pageNumber;
    this.paginationDetailData.take = event.pageSize;
    const id = this.searchParamsById.id || '';
    this.getFormDatabyId({ pageNumber: 1, pageSize: this.paginationDetailData.take }, id);
  }

  onTableSearchDetailData(text: string): void {
    this.searchText = text;
    const id = this.searchParamsById.id || '';
    this.getFormDatabyId({ pageNumber: 1, pageSize: this.paginationDetailData.take }, id);
  }



  onPageChangeLineData(event: { pageNumber: number; pageSize: number }): void {
    this.paginationLineData.currentPage = event.pageNumber;
    this.paginationLineData.take = event.pageSize;
    const id = this.searchParamsById.id || '';
    this.getFormDatabyId({ pageNumber: 1, pageSize: this.paginationLineData.take }, id);
  }

  onTableSearchLineData(text: string): void {
    this.searchText = text;
    const id = this.searchParamsById.id || '';
    this.getFormDatabyId({ pageNumber: 1, pageSize: this.paginationLineData.take }, id);
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
   
    const cleanedFilters = this.cleanFilterObject(this.searchParams);
    this.spinnerService.show();

    this.mainApplyService.getAll(cleanedFilters)
      .pipe(takeUntil(this.destroy$)).subscribe({
        next: (response: any) => {
          console.log("responseData", response);
          this.loadgridData = response.data || [];
          this.pagination.totalCount = response.totalCount || 0;
          this.spinnerService.hide();
      },
        error: (error) => {
          this.spinnerService.hide();;
      }
    });
  }

  getFormDatabyId(event: { pageNumber: number; pageSize: number }, id: string): void {
    const params: FiltermainApplyServiceByIdDto = {
      id: id
    };
    this.spinnerService.show();;
    forkJoin({
      mischeaderdata: this.mainApplyService.getDetailById(params) as Observable<mainApplyServiceDto | mainApplyServiceDto[]>,
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (result) => {
       
        this.loadformData = Array.isArray(result.mischeaderdata)
          ? result.mischeaderdata[0] ?? ({} as mainApplyServiceDto)
          : result.mischeaderdata;

        const modalElement = document.getElementById('viewdetails');
        if (modalElement) {
          const modal = new bootstrap.Modal(modalElement);
          modal.show();
        };
        this.spinnerService.hide();
      },
      error: (err) => {
        this.spinnerService.hide();;
     }
    });
  }

  private buildColumnDefs(): void {
    this.columnDefs = [
      {
        headerName: '#',
        valueGetter: (params) =>
          (params?.node?.rowIndex ?? 0) + 1 + ((this.pagination.currentPage - 1) * this.pagination.take),
        width: 60,
        colId: 'serialNumber'
      },
      { headerName: this.translate.instant('mainApplyServiceResourceName.Servicename'), field: 'service.serviceName', width: 200 },
      { headerName: this.translate.instant('mainApplyServiceResourceName.RefNo'), field: 'applyNo', width: 200 },
      { headerName: this.translate.instant('mainApplyServiceResourceName.EventNameAdv'), field: 'requestEventPermit.eventName', width: 200 },
      { headerName: this.translate.instant('mainApplyServiceResourceName.applydate'), field: 'applyDate', width: 200 },
      { headerName: this.translate.instant('mainApplyServiceResourceName.permitNumber'), field: 'permitNumber', width: 200 },
      { headerName: this.translate.instant('mainApplyServiceResourceName.statues'), field: 'lastStatusEN', width: 200 },
    ];
  }

  onTableAction(event: { action: string, row: any }) {
    if (event.action === 'onViewInfo') {
      this.getFormDatabyId({ pageNumber: 1, pageSize: this.paginationDetailData.take || this.paginationLineData.take }, event.row.id);
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

