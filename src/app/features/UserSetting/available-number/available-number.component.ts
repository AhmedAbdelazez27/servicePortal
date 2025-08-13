import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { AvailableNumberService } from '../../../core/services/UserSetting/available-number.service';
import { EntityService } from '../../../core/services/entit.service';
import { SpinnerService } from '../../../core/services/spinner.service';
import { ToastrService } from 'ngx-toastr';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgSelectModule } from '@ng-select/ng-select';
import { environment } from '../../../../environments/environment';
import { ApiEndpoints } from '../../../core/constants/api-endpoints';
import {
  AvailableNumberDto,
  CreateAvailableNumberDto,
  UpdateAvailableNumberDto,
  GetAllAvailableNumberParameters,
  PagedResultDto,
} from '../../../core/dtos/UserSetting/available-number.dto';
import { GenericDataTableComponent } from '../../../../shared/generic-data-table/generic-data-table.component';
import { ColDef } from 'ag-grid-community';

// Filter criteria class (similar to FilterUserDto)
class FilterAvailableNumberDto {
  entityId: string | null = null;
  skip: number = 0;
  take: number = 10;
  orderByValue: string | null = null;
}

@Component({
  selector: 'app-available-number',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    TranslateModule,
    NgSelectModule,
    GenericDataTableComponent,
  ],
  templateUrl: './available-number.component.html',
  styleUrl: './available-number.component.scss',
})
export class AvailableNumberComponent implements OnInit, OnDestroy {
  availableNumbers: AvailableNumberDto[] = [];
  totalCount: number = 0;
  currentPage: number = 1;
  itemsPerPage: number = 10;
  availableNumberForm: FormGroup;
  submitted: boolean = false;
  mode: 'add' | 'edit' | 'view' = 'add';
  editingAvailableNumberId: number | null = null;
  selectedAvailableNumberToDelete: AvailableNumberDto | null = null;
  isLoading: boolean = false;

  // Entity dropdown options
  entityOptions: any[] = [];

  // Filter criteria object (similar to users-list component)
  filterCriteria = new FilterAvailableNumberDto();

  // Modal instances
  private availableNumberModal: any = null;
  private deleteModal: any = null;

  // Generic table properties
  columnDefs: ColDef[] = [];
  rowActions: Array<{ label: string; icon?: string; action: string }> = [];
  columnHeaderMap: { [key: string]: string } = {};

  constructor(
    private availableNumberService: AvailableNumberService,
    private entityService: EntityService,
    private spinnerService: SpinnerService,
    private toastr: ToastrService,
    public translate: TranslateService,
    private fb: FormBuilder
  ) {
    this.availableNumberForm = this.fb.group(
      {
        fromDate: ['', [Validators.required]],
        toDate: ['', [Validators.required]],
        entityId: ['', [Validators.required]],
        allowedNo: [
          '',
          [
            Validators.required,
            Validators.min(1),
            this.numberValidator.bind(this),
          ],
        ],
      },
      { validators: this.dateValidator.bind(this) }
    );
  }

  ngOnInit(): void {
    this.initializeTableConfiguration();
    this.loadEntities();
    // Remove the immediate call to getAvailableNumbers - it will be called after entities are loaded
    // Initialize modals after a short delay to ensure DOM is ready
    setTimeout(() => {
      this.initializeModals();
    }, 100);
  }

  ngOnDestroy(): void {
    this.cleanupModals();
  }

  initializeModals(): void {
    // Initialize the main modal
    const modalElement = document.getElementById('AvailableNumber');
    if (modalElement) {
      this.availableNumberModal = new (window as any).bootstrap.Modal(
        modalElement,
        {
          backdrop: true,
          keyboard: true,
        }
      );

      // Add event listeners for modal events
      modalElement.addEventListener('hidden.bs.modal', () => {
        this.onModalHidden();
      });

      // Add event listener for when modal is shown
      modalElement.addEventListener('shown.bs.modal', () => {
        this.onModalShown();
      });
    }

    // Initialize the delete modal
    const deleteModalElement = document.getElementById(
      'deleteAvailableNumberModal'
    );
    if (deleteModalElement) {
      this.deleteModal = new (window as any).bootstrap.Modal(
        deleteModalElement,
        {
          backdrop: true,
          keyboard: true,
        }
      );
    }
  }

  cleanupModals(): void {
    if (this.availableNumberModal) {
      this.availableNumberModal.dispose();
      this.availableNumberModal = null;
    }
    if (this.deleteModal) {
      this.deleteModal.dispose();
      this.deleteModal = null;
    }
  }

  onModalHidden(): void {
    // Reset form when modal is hidden
    this.availableNumberForm.reset();
    this.availableNumberForm.enable();
    this.submitted = false;
    this.mode = 'add';
    this.editingAvailableNumberId = null;

    // Clear any validation states
    Object.keys(this.availableNumberForm.controls).forEach((key) => {
      const control = this.availableNumberForm.get(key);
      if (control) {
        control.markAsUntouched();
        control.markAsPristine();
      }
    });
  }

  onModalShown(): void {
    // Force refresh of dropdown when modal is shown
    setTimeout(() => {
      this.availableNumberForm.get('entityId')?.updateValueAndValidity();
    }, 100);
  }

  dateValidator(control: AbstractControl): ValidationErrors | null {
    const fromDate = control.get('fromDate')?.value;
    const toDate = control.get('toDate')?.value;

    if (fromDate && toDate && new Date(fromDate) >= new Date(toDate)) {
      return { invalidDateRange: true };
    }

    return null;
  }

  numberValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    if (value && (isNaN(value) || value <= 0)) {
      return { invalidNumber: true };
    }
    return null;
  }

  getFieldError(fieldName: string): string {
    const control = this.availableNumberForm.get(fieldName);
    if (control && control.errors && control.touched) {
      if (control.errors['required']) {
        return this.translate.instant('VALIDATION.REQUIRED');
      }
      if (control.errors['min']) {
        return this.translate.instant('VALIDATION.MIN_VALUE', {
          min: control.errors['min'].min,
        });
      }
      if (control.errors['invalidNumber']) {
        return this.translate.instant('VALIDATION.INVALID_NUMBER');
      }
      if (control.errors['invalidDateRange']) {
        return this.translate.instant('VALIDATION.INVALID_DATE_RANGE');
      }
    }
    return '';
  }

  onFieldBlur(fieldName: string): void {
    const control = this.availableNumberForm.get(fieldName);
    if (control) {
      control.markAsTouched();
    }
  }

  hasFormErrors(): boolean {
    return this.availableNumberForm.invalid;
  }

  getTotalErrors(): number {
    let errorCount = 0;
    Object.keys(this.availableNumberForm.controls).forEach((key) => {
      const control = this.availableNumberForm.get(key);
      if (control && control.errors) {
        errorCount++;
      }
    });
    return errorCount;
  }

  isFieldInvalid(fieldName: string): boolean {
    const control = this.availableNumberForm.get(fieldName);
    return !!(control && control.invalid && control.touched);
  }

  isFieldValid(fieldName: string): boolean {
    const control = this.availableNumberForm.get(fieldName);
    return !!(control && control.valid && control.touched);
  }

  areMandatoryFieldsValid(): boolean {
    const form = this.availableNumberForm;
    return (
      form.get('fromDate')?.valid &&
      form.get('toDate')?.valid &&
      form.get('entityId')?.valid &&
      form.get('allowedNo')?.valid &&
      form.get('allowedNo')?.value
    );
  }

  loadEntities(): void {
    this.spinnerService.show();
    this.entityService.GetSelect2List(0, 2000).subscribe({
      next: (response: any) => {
        if (response && response.results) {
          this.entityOptions = response.results;
        } else if (response && Array.isArray(response)) {
          this.entityOptions = response.map((entity: any) => ({
            id: entity.id,
            text: entity.name || entity.text,
          }));
        }

        this.spinnerService.hide();

        // Load available numbers after entities are loaded
        this.getAvailableNumbers(1);

        // Also refresh entity names for any existing data
        this.refreshEntityNames();
      },
      error: (error) => {
        // Error loading entities
        this.toastr.error('Error loading entities');
        this.spinnerService.hide();

        // Still try to load available numbers even if entities fail
        this.getAvailableNumbers(1);
      },
    });
  }

  getAvailableNumbers(page: number): void {
    this.spinnerService.show();

    const params: GetAllAvailableNumberParameters = {
      skip: (page - 1) * this.itemsPerPage,
      take: this.itemsPerPage,
      orderByValue: null,
      entityId: this.filterCriteria.entityId || null,
    };

    this.availableNumberService.getAllAvailableNumbers(params).subscribe({
      next: (response: PagedResultDto<AvailableNumberDto>) => {
        // Map the data to use allowedNo consistently
        this.availableNumbers = response.data.map((item: any) => ({
          id: item.id,
          fromDate: item.fromDate,
          toDate: item.toDate,
          entityId: item.entityId,
          allowedNo: item.allowedNo || 0,
          entityName: this.getEntityName(item.entityId),
        }));

        this.totalCount = response.totalCount;
        this.currentPage = page;

        // If entities are loaded after the data, refresh the entity names
        if (this.entityOptions.length > 0) {
          this.refreshAvailableNumbersData();
        }

        this.spinnerService.hide();
      },
      error: (error) => {
        this.toastr.error('Error loading available numbers');
        this.spinnerService.hide();
      },
    });
  }

  onSearch(): void {
    this.getAvailableNumbers(1);
  }

  clear(): void {
    this.filterCriteria = new FilterAvailableNumberDto();
    this.onSearch();
  }

  submit(): void {
    this.submitted = true;

    if (this.availableNumberForm.valid) {
      this.spinnerService.show();
      const formData = this.availableNumberForm.value;

      if (this.mode === 'add') {
        const createDto: CreateAvailableNumberDto = {
          fromDate: this.formatDateForInput(formData.fromDate),
          toDate: this.formatDateForInput(formData.toDate),
          entityId: formData.entityId,
          allowedNo: formData.allowedNo,
        };

        this.availableNumberService.createAvailableNumber(createDto).subscribe({
          next: (response) => {
            this.toastr.success('Available number created successfully');
            this.closeModal();
            this.getAvailableNumbers(this.currentPage);
            this.spinnerService.hide();
          },
          error: (error) => {
            this.toastr.error('Error creating available number');
            this.spinnerService.hide();
          },
        });
      } else if (this.mode === 'edit' && this.editingAvailableNumberId) {
        const updateDto: UpdateAvailableNumberDto = {
          id: this.editingAvailableNumberId,
          fromDate: this.formatDateForInput(formData.fromDate),
          toDate: this.formatDateForInput(formData.toDate),
          entityId: formData.entityId,
          allowedNo: formData.allowedNo,
        };

        this.availableNumberService.updateAvailableNumber(updateDto).subscribe({
          next: (response) => {
            this.toastr.success('Available number updated successfully');
            this.closeModal();
            this.getAvailableNumbers(this.currentPage);
            this.spinnerService.hide();
          },
          error: (error) => {
            this.toastr.error('Error updating available number');
            this.spinnerService.hide();
          },
        });
      }
    } else {
      this.toastr.error('Please fill all required fields correctly');
    }
  }

  openAddModal(): void {
    this.mode = 'add';
    this.editingAvailableNumberId = null;
    this.submitted = false;
    this.availableNumberForm.reset();
    this.availableNumberForm.patchValue({
      fromDate: '',
      toDate: '',
      entityId: '',
      allowedNo: '',
    });

    // Show modal
    this.availableNumberModal?.show();
  }

  openEditModal(availableNumber: AvailableNumberDto): void {
    this.mode = 'edit';
    this.editingAvailableNumberId = availableNumber.id;
    this.submitted = false;

    this.setFormValues(availableNumber);

    // Show modal
    this.availableNumberModal?.show();
  }

  openViewModal(availableNumber: AvailableNumberDto): void {
    this.mode = 'view';
    this.submitted = false;

    // Ensure entities are loaded before setting form values
    if (this.entityOptions.length === 0) {
      this.loadEntities();
      // Wait for entities to load, then set form values
      setTimeout(() => {
        this.setFormValues(availableNumber);
        // Keep form disabled for view mode
        this.availableNumberForm.disable();
        this.availableNumberModal?.show();
      }, 500);
    } else {
      this.setFormValues(availableNumber);
      // Keep form disabled for view mode
      this.availableNumberForm.disable();
      this.availableNumberModal?.show();
    }

    // Force refresh of dropdown after modal is shown
    setTimeout(() => {
      this.availableNumberForm.get('entityId')?.updateValueAndValidity();
    }, 200);
  }

  private setFormValues(availableNumber: AvailableNumberDto): void {
    this.availableNumberForm.patchValue({
      fromDate: this.formatDateForInput(availableNumber.fromDate),
      toDate: this.formatDateForInput(availableNumber.toDate),
      entityId: availableNumber.entityId,
      allowedNo: availableNumber.allowedNo,
    });

    // Force change detection for the dropdown
    setTimeout(() => {
      this.availableNumberForm.get('entityId')?.updateValueAndValidity();
    }, 100);
  }

  closeModal(): void {
    this.availableNumberModal?.hide();
    // Re-enable form when closing modal to prepare for next operation
    this.availableNumberForm.enable();
  }

  selectAvailableNumberToDelete(availableNumber: AvailableNumberDto): void {
    this.selectedAvailableNumberToDelete = availableNumber;
    // Show delete confirmation modal
    this.deleteModal?.show();
  }

  deleteAvailableNumber(): void {
    if (this.selectedAvailableNumberToDelete) {
      this.spinnerService.show();
      this.availableNumberService
        .deleteAvailableNumber(this.selectedAvailableNumberToDelete.id)
        .subscribe({
          next: () => {
            this.toastr.success('Available number deleted successfully');
            this.selectedAvailableNumberToDelete = null;
            this.deleteModal?.hide();
            this.getAvailableNumbers(this.currentPage);
            this.spinnerService.hide();
          },
          error: (error) => {
            this.toastr.error('Error deleting available number');
            this.spinnerService.hide();
          },
        });
    }
  }

  cancelDelete(): void {
    this.selectedAvailableNumberToDelete = null;
    this.deleteModal?.hide();
  }

  formatDate(date: Date | string): string {
    return new Date(date).toLocaleDateString();
  }

  formatDateForInput(date: Date | string): string {
    return new Date(date).toISOString().split('T')[0];
  }

  getEntityName(entityId: string | number): string {
    if (!entityId) return '-';

    // Convert entityId to string for comparison
    const entityIdStr = entityId.toString();

    // If entities are not loaded yet, return entityId as fallback
    if (this.entityOptions.length === 0) {
      return entityIdStr;
    }

    const entity = this.entityOptions.find(
      (e) => e.id.toString() === entityIdStr
    );
    return entity ? entity.text : entityIdStr; // Return entityId if not found in options
  }

  // Method to refresh available numbers data with proper entity names
  refreshAvailableNumbersData(): void {
    if (this.availableNumbers.length > 0) {
      this.availableNumbers = this.availableNumbers.map((item: any) => ({
        ...item,
        entityName: this.getEntityName(item.entityId),
      }));
    }
  }

  // Method to refresh entity names when entities are loaded
  refreshEntityNames(): void {
    if (this.availableNumbers.length > 0 && this.entityOptions.length > 0) {
      this.refreshAvailableNumbersData();
    }
  }

  initializeTableConfiguration(): void {
    // Define column definitions for the generic table
    this.columnDefs = [
      {
        headerName: '#',
        field: 'index',
        width: 80,
        cellRenderer: (params: any) => {
          return (
            (this.currentPage - 1) * this.itemsPerPage +
            params.node.rowIndex +
            1
          );
        },
        sortable: false,
        filter: false,
      },
      {
        headerName: this.translate.instant('AVAILABLE_NUMBER.FROM_DATE'),
        field: 'fromDate',
        cellRenderer: (params: any) => this.formatDate(params.value),
        width: 150,
      },
      {
        headerName: this.translate.instant('AVAILABLE_NUMBER.TO_DATE'),
        field: 'toDate',
        cellRenderer: (params: any) => this.formatDate(params.value),
        width: 150,
      },
      {
        headerName: this.translate.instant('AVAILABLE_NUMBER.ENTITY'),
        field: 'entityName',
        width: 200,
      },
      {
        headerName: this.translate.instant('AVAILABLE_NUMBER.ALLOWED_NUMBER'),
        field: 'allowedNo',
        width: 150,
      },
    ];

    // Define row actions
    this.rowActions = [
      {
        label: this.translate.instant('COMMON.VIEW'),
        icon: 'icon-frame-view',
        action: 'view',
      },
      {
        label: this.translate.instant('COMMON.EDIT'),
        icon: 'icon-frame-edit',
        action: 'edit',
      },
      {
        label: this.translate.instant('COMMON.DELETE'),
        icon: 'icon-frame-delete',
        action: 'delete',
      },
    ];

    // Define column header mapping for the info modal
    this.columnHeaderMap = {
      fromDate: this.translate.instant('AVAILABLE_NUMBER.FROM_DATE'),
      toDate: this.translate.instant('AVAILABLE_NUMBER.TO_DATE'),
      entityName: this.translate.instant('AVAILABLE_NUMBER.ENTITY'),
      allowedNo: this.translate.instant('AVAILABLE_NUMBER.ALLOWED_NUMBER'),
    };
  }

  onTableAction(event: { action: string; row: any }): void {
    const availableNumber = event.row as AvailableNumberDto;

    switch (event.action) {
      case 'view':
        this.openViewModal(availableNumber);
        break;
      case 'edit':
        this.openEditModal(availableNumber);
        break;
      case 'delete':
        this.selectAvailableNumberToDelete(availableNumber);
        break;
    }
  }

  onPageChange(event: { pageNumber: number; pageSize: number }): void {
    this.currentPage = event.pageNumber;
    this.itemsPerPage = event.pageSize;
    this.getAvailableNumbers(this.currentPage);
  }

  onTableSearch(searchText: string): void {
    // Implement search functionality if needed
    // You can add search logic here
  }
}
