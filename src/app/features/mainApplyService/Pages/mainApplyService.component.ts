import { Component, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, NgForm, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { forkJoin, Observable, of, Subject } from 'rxjs';
import { debounceTime, map, takeUntil } from 'rxjs/operators';
import { NgSelectComponent } from '@ng-select/ng-select';
import { ColDef, GridOptions } from 'ag-grid-community';
import { GenericDataTableComponent } from '../../../../shared/generic-data-table/generic-data-table.component';
import { FiltermainApplyServiceDto, FiltermainApplyServiceByIdDto, mainApplyServiceDto } from '../../../core/dtos/mainApplyService/mainApplyService.dto';
import { SpinnerService } from '../../../core/services/spinner.service';
import { Select2Service } from '../../../core/services/Select2.service';
import { openStandardReportService } from '../../../core/services/openStandardReportService.service';
import { Pagination, FndLookUpValuesSelect2RequestDto, SelectdropdownResultResults, Select2RequestDto, SelectdropdownResult, reportPrintConfig } from '../../../core/dtos/FndLookUpValuesdtos/FndLookUpValues.dto';
import { MainApplyService } from '../../../core/services/mainApplyService/mainApplyService.service';
import { Router } from '@angular/router';
import { AppEnum } from '../../../core/dtos/appEnum.dto';
import { MainApplyServiceReportService } from '../../../core/services/mainApplyService/mainApplyService.reports';
import { AuthService } from '../../../core/services/auth.service';
import { EntityService } from '../../../core/services/entit.service';
import { GenericNgSelectComponent } from '../../../../shared/generic-ng-select/generic-ng-select.component';
import { Select2APIEndpoint } from '../../../core/constants/select2api-endpoints';
import { CharityEventPermitRequestService } from '../../../core/services/charity-event-permit-request.service';

enum ServiceStatus {
  Accept = 1,
  Reject = 2,
  New = 3,
  Wait = 4,
  Draft = 5,
  ReturnForModifications = 7
}
declare var bootstrap: any;

@Component({
  selector: 'app-mainApplyService',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, GenericDataTableComponent, GenericNgSelectComponent, ReactiveFormsModule],
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
  summaryRequests: any[] = [];
  loadformData: mainApplyServiceDto = {} as mainApplyServiceDto;
  currecntDept: string | null = null;
  loadexcelData: mainApplyServiceDto[] = [];
  lang: any;


  getServiceSelect2?: string
  getStatusSelect2?: string
  getUserNameeSelect2?: string
  getServiceTypeSelect2?: string

  constructor(
    private mainApplyService: MainApplyService,
    private toastr: ToastrService,
    private translate: TranslateService,
    private openStandardReportService: openStandardReportService,
    private spinnerService: SpinnerService,
    private Select2Service: Select2Service,
    private fb: FormBuilder,
    private router: Router,
    private mainApplyServiceReportService: MainApplyServiceReportService,
    private authService: AuthService,
    private charityEventPermitRequestService: CharityEventPermitRequestService,
    private entityService: EntityService,
  ) {

    this.userserviceForm = this.fb.group({
      serviceIds: [[], Validators.required]
    });
  }

  ngOnInit(): void {
    this.GetHomeTotalRequestSummaryPortal();
    this.buildColumnDefs();
    this.rowActions = [
      { label: this.translate.instant('COMMON.ViewInfo'), icon: 'icon-frame-view', action: 'onViewInfo' },
      { label: this.translate.instant('Common.Print'), icon: 'fa fa-print', action: 'onPrintPDF' },

      // { label: this.translate.instant('Common.requestComplaint'), icon: 'icon-frame-view', action: 'onRequestComplaint' },
    ];

    this.getLoadDataGrid({ pageNumber: 1, pageSize: this.pagination.take });

    let profile = this.authService.snapshot;
    let storeddepartmentId = profile?.departmentId ?? '';

    const storedDeptIds = storeddepartmentId
      .replace(/"/g, '')
      .split(',')
      .map(x => x.trim())
      .filter(x => x !== '');
    this.currecntDept = storeddepartmentId.replace(/"/g, '').trim();

    this.getSelect2Endpoint();
    this.lang = this.translate.currentLang;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  getSelect2Endpoint() {
    this.getServiceSelect2 = Select2APIEndpoint.Select2.GetServiceSelect2;
    this.getStatusSelect2 = Select2APIEndpoint.Select2.GetMainServiceStatusSelect2;
    this.getUserNameeSelect2 = Select2APIEndpoint.Select2.GetUsersSelect2;
    this.getServiceTypeSelect2 = Select2APIEndpoint.Select2.GetServiceTypeSelect2;
  }



  GetHomeTotalRequestSummaryPortal() {
    this.mainApplyService.GetHomeTotalRequestSummaryPortal().subscribe({
      next: (res) => {
        this.summaryRequests = res.requestSummary;
      }
    })
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
    this.searchParams.serviceId = null;
    this.searchParams.serviceIdstr = null;

    this.searchParams.serviceStatusIds = [];
    this.searchParams.serviceStatusstr = [];

    this.searchParams.userId = null;
    this.searchParams.userIdstr = null;

    this.searchParams.serviceTypes = null;
    this.searchParams.serviceTypestr = null;

    this.searchParams.applyNo = null;
    this.searchParams.fromDate = null;
    this.searchParams.toDate = null;
    this.searchParams = new FiltermainApplyServiceDto();
    this.getLoadDataGrid({ pageNumber: 1, pageSize: this.pagination.take });
  }


  getLoadDataGrid(event: { pageNumber: number; pageSize: number }): void {
    this.pagination.currentPage = event.pageNumber;
    this.pagination.take = event.pageSize;
    const skip = (event.pageNumber - 1) * event.pageSize;
    this.searchParams.skip = skip;
    this.searchParams.userId = localStorage.getItem('userId');
    this.searchParams.excludeAdverisment = true;


    if (this.searchParams.serviceTypes == null) {
      this.searchParams.serviceTypes = null
    }
    else {
      this.searchParams.serviceType = Number(this.searchParams.serviceTypes);
    }

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

  getFormDatabyId(id: string, serviceId: string): void {
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

  public buildColumnDefs(): void {
    this.columnDefs = [
      { headerName: this.translate.instant('mainApplyServiceResourceName.RequestNo'), field: 'applyNo', width: 200 },
      {
        headerName: this.translate.instant('mainApplyServiceResourceName.applydate'), field: 'applyDate', width: 200,
        valueFormatter: (p: any) => this.formatDateTimeDisplay(p?.value)
      },
      { headerName: this.translate.instant('mainApplyServiceResourceName.sevicet'), field: this.lang == 'ar' ? 'service.serviceName' : 'service.serviceNameEn', width: 200 },
      { headerName: this.translate.instant('mainApplyServiceResourceName.username'), field: this.lang == 'ar' ? 'user.nameEn' : 'user.name', width: 200 },
      { headerName: this.translate.instant('mainApplyServiceResourceName.userName'), field: 'entityName', width: 200 },
      {
        headerName: this.translate.instant('mainApplyServiceResourceName.statues'),
        field: 'serviceStatusName',
        width: 200,
        cellRenderer: (params: any) => {
          const statusClass = this.getStatusClassForGrid(params.data.serviceStatus);
          return `<div class="${statusClass}">${params.data.serviceStatusName || ''}</div>`;
        }
      },
      { headerName: this.translate.instant('mainApplyServiceResourceName.desc'), field: 'description', width: 200 },
    ];
  }

  public formatDateTimeDisplay(value: any): string {
    if (!value) return '';
    try {
      // Handle numeric ticks, Date, or ISO strings
      const candidate = typeof value === 'number' ? new Date(value)
        : (value instanceof Date ? value : new Date(value));
      if (!isNaN(candidate.getTime())) {
        return candidate.toLocaleString();
      }
      // If already a formatted string (e.g., dd/MM/yyyy), return as is
      return String(value);
    } catch (e) {
      return String(value);
    }
  }


  getStatusClassForGrid(serviceStatus: any): string {
    switch (serviceStatus) {
      case ServiceStatus.Accept:
        return 'status-approved';
      case ServiceStatus.Reject:
        return 'status-rejected';
      case ServiceStatus.New:
        return 'status-new';
      case ServiceStatus.Wait:
        return 'status-waiting';
      case ServiceStatus.Draft:
        return 'status-draft';
      case ServiceStatus.ReturnForModifications:
        return 'status-return-for-modification';
      default:
        return 'status-inactive';
    }
  }



  onTableAction(event: { action: string, row: any }) {
    if (event.action === 'onUpdate') {
      // Handle update action - route to edit page for draft requests
      if (event.row.serviceId == this.appEnum.serviceId7) {
        // Route to request-plaint with id as param for draft update
        this.router.navigate(['/request-plaint', event.row.id]);
      } else if (event.row.serviceId === 1) {
        // Route to fasting-tent-request with id as param for draft update
        this.router.navigate(['/fasting-tent-request', event.row.id]);
      } else if (event.row.serviceId == this.appEnum.serviceId2 || event.row.serviceId === 2) {
        // Route to charity-event-permit-request with id as param for draft update
        this.router.navigate(['/services-requests/charity-event-permit-request', event.row.id]);
      } else if (event.row.serviceId === 1001) {
        // Route to distribution-site-permit with id as param for draft update
        this.router.navigate(['/distribution-site-permit', event.row.id]);
      } else if (event.row.serviceId == this.appEnum.serviceId6) {
        // Route to request-event-permits with id as param for draft update
        this.router.navigate(['/services-requests/request-event-permits', event.row.id]);
      } else {
        this.translate
          .get(['mainApplyServiceResourceName.NoPermission', 'Common.Required'])
          .subscribe(translations => {
            this.toastr.error(
              `${translations['mainApplyServiceResourceName.NoPermission']}`,
            );
          });
      }
      return;
    }

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
      else if (event.row.serviceId == this.appEnum.serviceId2) {

        this.router.navigate([`/view-services-requests/charity-event-permit/${event.row.id}`], {
          state: { loadformData: this.loadformData }
        });
      } else if (event.row.serviceId == this.appEnum.serviceId6) {

        this.router.navigate([`/view-services-requests/request-event-permit/${event.row.id}`], {
          state: { loadformData: this.loadformData }
        });
      } else if (event.row.serviceId == this.appEnum.serviceId7) {

        this.router.navigate([`/view-services-requests/plaint-request/${event.row.id}`], {
          state: { loadformData: this.loadformData }
        });
      }
      else if (event.row.serviceId == this.appEnum.serviceId1002) {

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

    else if (event.action === 'onPrintPDF') {
      if (!event?.row) return;

      const serviceName = event.row.service?.serviceName ?? '';
      const serviceStatusName = event.row.serviceStatusName ?? '';
      const lastStatus = event.row.lastStatus ?? '';
      const serviceId = event.row.serviceId ?? '';
      const id = event.row.id ?? '';
      if (this.translate?.currentLang === 'ar') {
        if (serviceId === 1) {
          if (serviceStatusName.includes("معتمد")) {
            this.mainApplyServiceReportService.printDatabyId(id, serviceId, 'final');
          }
          else {
            this.mainApplyServiceReportService.printDatabyId(id, serviceId, 'initial');
          }
        }
        else if (serviceId != 1) {
          if (serviceStatusName.includes("معتمد")) {
            this.mainApplyServiceReportService.printDatabyId(id, serviceId, 'final');
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
      else {
        if (serviceId === 1) {
          if (serviceStatusName.includes("Approved")) {
            this.mainApplyServiceReportService.printDatabyId(id, serviceId, 'final');
          }
          else {
            this.mainApplyServiceReportService.printDatabyId(id, serviceId, 'initial');
          }
        }
        else if (serviceId != 1) {
          if (serviceStatusName.includes("Approved")) {
            this.mainApplyServiceReportService.printDatabyId(id, serviceId, 'final');
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

    if (event.action === 'onDelete') {
      // Handle delete action - only for RequestEventPermits (serviceId = 6) for now
      if (event.row.serviceId == this.appEnum.serviceId6 || event.row.serviceId === 6) {
        // Check if id exists and is a number
        const requestId = event.row.id;
        if (!requestId || typeof requestId !== 'number') {
          this.toastr.error(this.translate.instant('ERRORS.INVALID_REQUEST_ID') || 'Invalid request ID');
          return;
        }

        // Show confirmation dialog
        if (confirm(this.translate.instant('COMMON.CONFIRM_DELETE') || 'Are you sure you want to delete this request?')) {
          this.spinnerService.show();
          this.charityEventPermitRequestService.deleteRequestEvent(requestId).subscribe({
            next: () => {
              this.toastr.success(this.translate.instant('SUCCESS.REQUEST_DELETED') || 'Request deleted successfully');
              this.spinnerService.hide();
              // Refresh the grid data
              this.getLoadDataGrid({ pageNumber: this.pagination.currentPage, pageSize: this.pagination.take });
            },
            error: (error: any) => {
              this.spinnerService.hide();
              if (error.error && error.error.reason) {
                this.toastr.error(error.error.reason);
              } else {
                this.toastr.error(this.translate.instant('ERRORS.FAILED_DELETE_REQUEST') || 'Failed to delete request');
              }
            }
          });
        }
      } else if (event.row.serviceId == this.appEnum.serviceId2 || event.row.serviceId === 2) {
        // Handle delete action for CharityEventPermit (serviceId = 2)
        // Check if id exists and is a number
        const mainApplyServiceId = event.row.id;
        if (!mainApplyServiceId || typeof mainApplyServiceId !== 'number') {
          this.toastr.error(this.translate.instant('ERRORS.INVALID_REQUEST_ID') || 'Invalid request ID');
          return;
        }

        // Show confirmation dialog
        if (confirm(this.translate.instant('COMMON.CONFIRM_DELETE') || 'Are you sure you want to delete this request?')) {
          this.spinnerService.show();
          // Convert id to string as API expects string
          this.charityEventPermitRequestService.delete(mainApplyServiceId.toString()).subscribe({
            next: () => {
              this.toastr.success(this.translate.instant('SUCCESS.REQUEST_DELETED') || 'Request deleted successfully');
              this.spinnerService.hide();
              // Refresh the grid data
              this.getLoadDataGrid({ pageNumber: this.pagination.currentPage, pageSize: this.pagination.take });
            },
            error: (error: any) => {
              this.spinnerService.hide();
              if (error.error && error.error.reason) {
                this.toastr.error(error.error.reason);
              } else {
                this.toastr.error(this.translate.instant('ERRORS.FAILED_DELETE_REQUEST') || 'Failed to delete request');
              }
            }
          });
        }
      } else {
        this.translate
          .get(['mainApplyServiceResourceName.NoPermission', 'Common.Required'])
          .subscribe(translations => {
            this.toastr.error(
              `${translations['mainApplyServiceResourceName.NoPermission']}`,
            );
          });
      }
      return;
    }
  }

  getStatusClass(serviceStatus: any): string {
    switch (serviceStatus) {
      case ServiceStatus.Accept: // 1
        return 'status-approved';
      case ServiceStatus.Reject: // 2
        return 'status-rejected';
      case ServiceStatus.New: // 3
        return 'status-new';
      case ServiceStatus.Wait: // 4
        return 'status-waiting';
      case ServiceStatus.Draft: // 5
        return 'status-draft';
      case ServiceStatus.ReturnForModifications: // 7
        return 'status-return-for-modification';
      default:
        return 'status-inactive';
    }
  }


  entityName(id: any): Observable<string> {
    return this.entityService.getEntityById(id ?? "0").pipe(
      takeUntil(this.destroy$),
      map((entityResp: any) => {
        return this.lang == 'ar' ? entityResp.entitY_NAME : entityResp.entitY_NAME_EN;
      })
    );
  }


  printExcel(): void {
    this.spinnerService.show();
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
                console.log("data", data);

                const entityRequests = data.map((c: any) => {
                  c.applyDate = this.openStandardReportService.formatDate(c.applyDate);
                  c.serviceName = this.lang == 'ar' ? c.service?.serviceName : c.service?.serviceNameEn ?? '';
                  c.userName = this.lang == 'ar' ? c.service?.name : c.service?.nameEn ?? '';

                  if (c.user?.entityId != null) {
                    return this.entityName(c.user.entityId).pipe(
                      map((name) => {
                        c.entityName = name;
                        return c;
                      })
                    );
                  } else {
                    c.entityName = "";
                    return of(c);
                  }
                });

                forkJoin(entityRequests)
                  .pipe(takeUntil(this.destroy$))
                  .subscribe({
                    next: (resolvedRows) => {
                      this.loadexcelData = resolvedRows as any[];

                      const reportConfig: reportPrintConfig = {
                        title: this.translate.instant('mainApplyServiceResourceName.title'),
                        reportTitle: this.translate.instant('mainApplyServiceResourceName.title'),
                        fileName: `${this.translate.instant('mainApplyServiceResourceName.title')}_${new Date().toISOString().slice(0, 10)}.xlsx`,
                        columns: [
                          { label: '#', key: 'rowNo', title: '#' },
                          { label: this.translate.instant('mainApplyServiceResourceName.RequestNo'), key: 'applyNo' },
                          { label: this.translate.instant('mainApplyServiceResourceName.applydate'), key: 'applyDate' },
                          { label: this.translate.instant('mainApplyServiceResourceName.sevicet'), key: 'serviceName' },
                          { label: this.translate.instant('mainApplyServiceResourceName.username'), key: 'userName' },
                          { label: this.translate.instant('mainApplyServiceResourceName.username'), key: 'entityName' },
                          { label: this.translate.instant('mainApplyServiceResourceName.statues'), key: this.lang == 'ar' ? 'lastStatus' : 'lastStatusEN' },
                          { label: this.translate.instant('COMMON.DESCRIPTION'), key: 'description' },
                        ],
                        data: this.loadexcelData.map((item: any, index: number) => ({
                          ...item,
                          rowNo: index + 1,
                        })),
                        totalLabel: this.translate.instant('Common.Total'),
                        totalKeys: []
                      };

                      this.openStandardReportService.openStandardReportExcel(reportConfig);
                      this.spinnerService.hide();
                    },
                    error: () => this.spinnerService.hide()
                  });
              },
              error: () => this.spinnerService.hide()
            });
        },
        error: () => this.spinnerService.hide()
      });
  }


  trackById(index: number, item: any): string {
    return item?.id ?? index;
  }

  get totalPages(): number {
    const size = this.pagination?.take || 10;
    const total = this.pagination?.totalCount || 0;
    return Math.max(1, Math.ceil(total / size));
  }

  // Generate visible page numbers for pagination
  getVisiblePages(): number[] {
    const current = this.pagination.currentPage;
    const total = this.totalPages;
    const delta = 2; // Number of pages to show on each side of current page
    const pages: number[] = [];

    // Always show first page
    pages.push(1);

    // Calculate range around current page
    const rangeStart = Math.max(2, current - delta);
    const rangeEnd = Math.min(total - 1, current + delta);

    // Add ellipsis if needed after first page
    if (rangeStart > 2) {
      pages.push(-1); // -1 represents ellipsis
    }

    // Add pages in range
    for (let i = rangeStart; i <= rangeEnd; i++) {
      pages.push(i);
    }

    // Add ellipsis if needed before last page
    if (rangeEnd < total - 1) {
      pages.push(-1); // -1 represents ellipsis
    }

    // Always show last page (if more than 1 page)
    if (total > 1) {
      pages.push(total);
    }

    return pages;
  }

  isEllipsis(page: number): boolean {
    return page === -1;
  }


  // helpers for status -> key normalization + label by UI language
  statusAliases: Record<string, string[]> = {
    new: ['new', 'جديد'],
    under_process: ['under process', 'قيد المعالجة', 'under-process', 'under_process'],
    rejected: ['rejected', 'مرفوض'],
    draft: ['draft', 'مسودة'],
    approved: ['approved', 'معتمد'],
  };

  private aliasToKey = new Map<string, string>(
    Object.entries(this.statusAliases).flatMap(([key, arr]) =>
      arr.map(a => [a.trim().toLowerCase(), key] as [string, string])
    )
  );

  normalizeStatus(status: string | null | undefined): string {
    if (!status) return 'other';
    const s = status.trim().toLowerCase();
    return this.aliasToKey.get(s) ?? 'other';
  }

  statusLabelByKey(key: string): { ar: string; en: string } {
    switch (key) {
      case 'new': return { ar: 'جديد', en: 'New' };
      case 'under_process': return { ar: 'قيد المعالجة', en: 'Under Process' };
      case 'rejected': return { ar: 'مرفوض', en: 'Rejected' };
      case 'draft': return { ar: 'مسودة', en: 'Draft' };
      case 'approved': return { ar: 'معتمد', en: 'Approved' };
      default: return { ar: 'أخرى', en: 'Other' };
    }
  }

  displayStatusLabel(rawStatus: string): string {
    const key = this.normalizeStatus(rawStatus);
    const lbl = this.statusLabelByKey(key);
    return this.translate?.currentLang === 'ar' ? lbl.ar : lbl.en;
  }


}

