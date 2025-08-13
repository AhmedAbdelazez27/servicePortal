import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { ColDef } from 'ag-grid-community';
import { NgSelectModule } from '@ng-select/ng-select';
import { GenericDataTableComponent } from '../../../../shared/generic-data-table/generic-data-table.component';
import { RegionService } from '../../../core/services/UserSetting/region.service';
import { SpinnerService } from '../../../core/services/spinner.service';
import { environment } from '../../../../environments/environment';
import {
  RegionDto,
  CreateRegionsDto,
  UpdateRegionDto,
  GetAllRegionParmeters,
  PagedResultDto,
} from '../../../core/dtos/UserSetting/regions/region.dto';

@Component({
  selector: 'app-regions-component',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    TranslateModule,
    NgSelectModule,
    GenericDataTableComponent,
  ],
  templateUrl: './regions-component.component.html',
  styleUrl: './regions-component.component.scss',
})
export class RegionsComponentComponent implements OnInit {
  regions: RegionDto[] = [];
  totalCount: number = 0;
  currentPage: number = 0;
  pageSize: number = 10;
  searchValue: string = '';
  regionForm: FormGroup;
  submitted: boolean = false;
  mode: 'add' | 'edit' | 'view' = 'add';
  editingRegionId: number | null = null;
  selectedRegionToDelete: RegionDto | null = null;
  isLoading: boolean = false;

  // Filter properties
  selectedStatusFilter: boolean | null = null;

  // Enhanced dropdown properties for pagination
  statusOptions = [
    { value: null, label: 'All', icon: 'fas fa-list' },
    { value: true, label: 'Active', icon: 'fas fa-check-circle' },
    { value: false, label: 'Inactive', icon: 'fas fa-times-circle' },
  ];

  // AG Grid column definitions
  columnDefs: ColDef[] = [
    {
      headerName: '#',
      width: 80,
      sortable: false,
      valueGetter: (params: any) => {
        return this.currentPage * this.pageSize + params.node.rowIndex + 1;
      },
    },
    {
      field: 'regionArabicName',
      headerName: 'Arabic Name',
      sortable: true,
      filter: true,
    },
    {
      field: 'regionEnglishName',
      headerName: 'English Name',
      sortable: true,
      filter: true,
    },
    {
      field: 'maxCountOfLocations',
      headerName: 'Max Locations',
      width: 120,
      sortable: true,
    },
    {
      field: 'isActive',
      headerName: 'Status',
      width: 100,
      sortable: true,
      cellRenderer: (params: any) => {
        return params.value
          ? '<span class="badge status-approved">Active</span>'
          : '<span class="badge status-rejected">Inactive</span>';
      },
    },
  ];

  rowActions = [
    { label: 'View', action: 'view', icon: 'icon-frame-view' },
    { label: 'Edit', action: 'edit', icon: 'icon-frame-edit' },
    { label: 'Delete', action: 'delete', icon: 'icon-frame-delete' },
  ];

  constructor(
    private regionService: RegionService,
    private spinnerService: SpinnerService,
    private toastr: ToastrService,
    public translate: TranslateService,
    private fb: FormBuilder
  ) {
    this.regionForm = this.fb.group({
      regionArabicName: ['', [Validators.required, Validators.minLength(2)]],
      regionEnglishName: ['', [Validators.minLength(2)]],
      maxCountOfLocations: [null, [Validators.min(1)]],
      isActive: [true],
    });
  }

  ngOnInit(): void {
    this.loadRegions();
  }

  loadRegions(): void {
    this.isLoading = true;
    this.spinnerService.show();

    const parameters: GetAllRegionParmeters = {
      skip: this.currentPage * this.pageSize,
      take: this.pageSize,
      searchValue: this.searchValue,
      isActive:
        this.selectedStatusFilter !== null
          ? this.selectedStatusFilter
          : undefined,
    };

    this.regionService.getAllAsync(parameters).subscribe({
      next: (data: any) => {
        // Handle different response formats
        let allData: RegionDto[] = [];
        let totalCount: number = 0;

        if (data && data.data) {
          // API response with data property
          allData = data.data;
          totalCount = data.totalCount || data.total || data.data.length || 0;
        } else if (data && data.items) {
          // Standard PagedResultDto format
          allData = data.items;
          totalCount = data.totalCount || 0;
        } else if (data && Array.isArray(data)) {
          // Direct array response
          allData = data;
          totalCount = data.length;
        } else if (data && data.results) {
          // Select2 format
          allData = data.results;
          totalCount = data.total || data.results.length;
        } else {
          // Empty or unexpected format
          allData = [];
          totalCount = 0;
        }

        // Update component properties
        this.regions = allData;
        this.totalCount = totalCount;
        this.isLoading = false;
        this.spinnerService.hide();
      },
      error: (error) => {
        this.toastr.error(
          this.translate.instant('ERROR.FETCH_REGIONS') ||
            'Error loading regions',
          this.translate.instant('TOAST.TITLE.ERROR') || 'Error'
        );
        this.isLoading = false;
        this.spinnerService.hide();
      },
    });
  }

  onPageChange(event: { pageNumber: number; pageSize: number }): void {
    this.currentPage = event.pageNumber - 1;
    this.pageSize = event.pageSize;
    this.loadRegions();
  }

  onSearch(searchText?: string): void {
    if (searchText !== undefined) {
      this.searchValue = searchText;
    }
    this.currentPage = 0;
    this.loadRegions();
  }

  clear(): void {
    this.searchValue = '';
    this.selectedStatusFilter = null;
    this.currentPage = 0;
    this.loadRegions();
  }

  onActionClick(event: { action: string; row: any }): void {
    const region = event.row as RegionDto;

    switch (event.action) {
      case 'view':
        this.openViewModal(region);
        break;
      case 'edit':
        this.openEditModal(region);
        break;
      case 'delete':
        this.selectRegionToDelete(region);
        break;
    }
  }

  openAddModal(): void {
    this.mode = 'add';
    this.regionForm.reset({ isActive: true });
    this.submitted = false;
    this.editingRegionId = null;
  }

  openEditModal(region: RegionDto): void {
    this.mode = 'edit';
    this.editingRegionId = region.id;
    this.regionForm.patchValue({
      regionArabicName: region.regionArabicName,
      regionEnglishName: region.regionEnglishName,
      maxCountOfLocations: region.maxCountOfLocations,
      isActive: region.isActive,
    });
    this.submitted = false;
    this.regionForm.enable();

    // Trigger the modal
    const modal = document.getElementById('regionModal');
    if (modal) {
      const bootstrapModal = new (window as any).bootstrap.Modal(modal);
      bootstrapModal.show();
    }
  }

  openViewModal(region: RegionDto): void {
    this.mode = 'view';
    this.editingRegionId = region.id;
    this.regionForm.patchValue({
      regionArabicName: region.regionArabicName,
      regionEnglishName: region.regionEnglishName,
      maxCountOfLocations: region.maxCountOfLocations,
      isActive: region.isActive,
    });
    this.regionForm.disable();

    // Trigger the modal
    const modal = document.getElementById('regionModal');
    if (modal) {
      const bootstrapModal = new (window as any).bootstrap.Modal(modal);
      bootstrapModal.show();
    }
  }

  closeModal(): void {
    this.mode = 'add';
    this.regionForm.reset({ isActive: true });
    this.regionForm.enable();
    this.submitted = false;
    this.editingRegionId = null;
    this.selectedRegionToDelete = null;
  }

  submit(): void {
    this.submitted = true;

    if (this.regionForm.invalid) {
      this.regionForm.markAllAsTouched();
      this.toastr.error(this.translate.instant('TOAST.VALIDATION_ERROR'));
      return;
    }

    this.spinnerService.show();

    if (this.mode === 'add') {
      const createDto: CreateRegionsDto = this.regionForm.value;
      this.regionService.createAsync(createDto).subscribe({
        next: () => {
          this.toastr.success(
            this.translate.instant('TOAST.REGION_CREATED') ||
              'Region created successfully'
          );
          this.closeModal();
          this.loadRegions();
          this.spinnerService.hide();
        },
        error: (error) => {
          this.toastr.error(
            this.translate.instant('TOAST.REGION_CREATE_FAILED') ||
              'Error creating region'
          );
          this.spinnerService.hide();
        },
      });
    } else if (this.mode === 'edit' && this.editingRegionId) {
      const updateDto: UpdateRegionDto = {
        id: this.editingRegionId,
        ...this.regionForm.value,
      };
      this.regionService.updateAsync(updateDto).subscribe({
        next: () => {
          this.toastr.success(
            this.translate.instant('TOAST.REGION_UPDATED') ||
              'Region updated successfully'
          );
          this.closeModal();
          this.loadRegions();
          this.spinnerService.hide();
        },
        error: (error) => {
          this.toastr.error(
            this.translate.instant('TOAST.REGION_UPDATE_FAILED') ||
              'Error updating region'
          );
          this.spinnerService.hide();
        },
      });
    }
  }

  selectRegionToDelete(region: RegionDto): void {
    this.selectedRegionToDelete = region;
    // Trigger the delete modal
    const deleteModal = document.getElementById('deleteRegionModal');
    if (deleteModal) {
      const modal = new (window as any).bootstrap.Modal(deleteModal);
      modal.show();
    }
  }

  deleteRegion(): void {
    if (!this.selectedRegionToDelete) return;

    this.spinnerService.show();
    this.regionService.deleteAsync(this.selectedRegionToDelete.id).subscribe({
      next: () => {
        this.toastr.success(
          this.translate.instant('TOAST.REGION_DELETED') ||
            'Region deleted successfully'
        );
        this.closeModal();
        this.loadRegions();
        this.spinnerService.hide();
      },
      error: (error) => {
        this.toastr.error(
          this.translate.instant('TOAST.REGION_DELETE_FAILED') ||
            'Error deleting region'
        );
        this.spinnerService.hide();
      },
    });
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.regionForm.get(fieldName);
    return field
      ? field.invalid && (field.dirty || field.touched || this.submitted)
      : false;
  }

  getFieldError(fieldName: string): string {
    const field = this.regionForm.get(fieldName);
    if (field && field.errors) {
      if (field.errors['required']) return 'This field is required';
      if (field.errors['minlength'])
        return `Minimum length is ${field.errors['minlength'].requiredLength}`;
      if (field.errors['min'])
        return `Minimum value is ${field.errors['min'].min}`;
    }
    return '';
  }

  // Enhanced validation methods
  hasFormErrors(): boolean {
    return this.regionForm.invalid && this.submitted;
  }

  getTotalErrors(): number {
    let errorCount = 0;
    Object.keys(this.regionForm.controls).forEach((key) => {
      const control = this.regionForm.get(key);
      if (control && control.errors) {
        errorCount++;
      }
    });
    return errorCount;
  }

  isFieldValid(fieldName: string): boolean {
    const field = this.regionForm.get(fieldName);
    return field ? field.valid && field.touched && !field.pristine : false;
  }

  onFieldBlur(fieldName: string): void {
    const field = this.regionForm.get(fieldName);
    if (field) {
      field.markAsTouched();
    }
  }
}
