import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { AttachmentsConfigService } from '../../../core/services/attachments/attachments-config.service';
import { AttachmentsConfigTypeService } from '../../../core/services/attachments/attachments-config-type.service';
import { SpinnerService } from '../../../core/services/spinner.service';
import { ToastrService } from 'ngx-toastr';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgSelectModule } from '@ng-select/ng-select';
import { forkJoin } from 'rxjs';
import { FndLookUpValuesSelect2RequestDto } from '../../../core/dtos/FndLookUpValuesdtos/FndLookUpValues.dto';
import { Select2Service } from '../../../core/services/Select2.service';
import {
  AttachmentsConfigDto,
  CreateAttachmentsConfigDto,
  UpdateAttachmentsConfigDto,
  GetAllAttachmentsConfigParamters,
} from '../../../core/dtos/attachments/attachments-config.dto';
import { GenericDataTableComponent } from '../../../../shared/generic-data-table/generic-data-table.component';
import { ColDef } from 'ag-grid-community';

@Component({
  selector: 'app-attachments-config',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    TranslateModule,
    NgSelectModule,
    GenericDataTableComponent,
  ],
  templateUrl: './attachments-config.component.html',
  styleUrl: './attachments-config.component.scss',
})
export class AttachmentsConfigComponent implements OnInit, OnDestroy {
  attachmentsConfigs: AttachmentsConfigDto[] = [];
  totalCount: number = 0;
  currentPage: number = 1;
  itemsPerPage: number = 10;
  searchValue: string = '';
  attachmentsConfigForm: FormGroup;
  submitted: boolean = false;
  mode: 'add' | 'edit' | 'view' = 'add';
  editingConfigId: number | null = null;
  selectedConfigToDelete: AttachmentsConfigDto | null = null;

  attachmentsConfigTypeOptions: any[] = [];
  searchSelect2Params = new FndLookUpValuesSelect2RequestDto();
  filterCriteria: GetAllAttachmentsConfigParamters = {
    skip: 0,
    take: 10,
    // Send null to get all data (both active/inactive and mandatory/optional)
    active: null,
    mendatory: null,
  };

  // Modal instances
  private attachmentsConfigModal: any = null;
  private deleteModal: any = null;

  // Generic Data Table properties
  columnDefs: ColDef[] = [];
  rowActions: Array<{ label: string; icon?: string; action: string }> = [];
  columnHeaderMap: { [key: string]: string } = {};

  constructor(
    private attachmentsConfigService: AttachmentsConfigService,
    private attachmentsConfigTypeService: AttachmentsConfigTypeService,
    private spinnerService: SpinnerService,
    private toastr: ToastrService,
    private translate: TranslateService,
    private fb: FormBuilder,
    private select2Service: Select2Service
  ) {
    this.attachmentsConfigForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(200)]],
      nameEn: ['', [Validators.maxLength(200)]],
      attachmentsConfigType: ['', [Validators.required]],
      active: [true],
      mendatory: [false],
    });

    this.initializeColumnDefs();
  }

  ngOnInit(): void {
    // Initialize row actions with translations
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

    // Initialize column header map with translations
    this.columnHeaderMap = {
      name: this.translate.instant('ATTACHMENTS_CONFIG.ARABIC_NAME'),
      nameEn: this.translate.instant('ATTACHMENTS_CONFIG.ENGLISH_NAME'),
      attachmentsConfigType: this.translate.instant(
        'ATTACHMENTS_CONFIG.ATTACHMENTS_CONFIG_TYPE'
      ),
      active: this.translate.instant('ATTACHMENTS_CONFIG.ACTIVE'),
      mendatory: this.translate.instant('ATTACHMENTS_CONFIG.MANDATORY'),
    };

    // Load attachments config types and then load all data (active/inactive, mandatory/optional)
    // Sends active: null, mendatory: null to get all records
    this.loadAttachmentsConfigTypes().catch((error) => {
      // Error handling for loading attachments config types
    });
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
    const modalElement = document.getElementById('AttachmentsConfigModal');
    if (modalElement) {
      this.attachmentsConfigModal = new (window as any).bootstrap.Modal(
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
      'deleteAttachmentsConfigModal'
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
    if (this.attachmentsConfigModal) {
      this.attachmentsConfigModal.dispose();
      this.attachmentsConfigModal = null;
    }
    if (this.deleteModal) {
      this.deleteModal.dispose();
      this.deleteModal = null;
    }
  }

  onModalHidden(): void {
    // Reset form when modal is hidden
    this.attachmentsConfigForm.reset();
    this.attachmentsConfigForm.enable();
    this.submitted = false;
    this.mode = 'add';
    this.editingConfigId = null;
  }

  onModalShown(): void {
    // Force refresh of dropdown when modal is shown
    setTimeout(() => {
      this.attachmentsConfigForm
        .get('attachmentsConfigType')
        ?.updateValueAndValidity();
    }, 100);
  }

  initializeColumnDefs(): void {
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
        field: 'name',
        headerName: this.translate.instant('ATTACHMENTS_CONFIG.ARABIC_NAME'),
        width: 200,
        sortable: true,
        filter: true,
      },
      {
        field: 'nameEn',
        headerName: this.translate.instant('ATTACHMENTS_CONFIG.ENGLISH_NAME'),
        width: 200,
        sortable: true,
        filter: true,
      },
      {
        field: 'attachmentsConfigType',
        headerName: this.translate.instant(
          'ATTACHMENTS_CONFIG.ATTACHMENTS_CONFIG_TYPE'
        ),
        width: 150,
        sortable: true,
        filter: true,
        cellRenderer: (params: any) => {
          return this.getConfigTypeName(params.value);
        },
      },
      {
        field: 'active',
        headerName: this.translate.instant('ATTACHMENTS_CONFIG.ACTIVE'),
        width: 100,
        sortable: true,
        filter: true,
        cellRenderer: (params: any) => {
          const isActive = params.value;
          return `<span class="badge ${
            isActive ? 'status-approved' : 'status-rejected'
          }">${isActive ? 'Active' : 'Inactive'}</span>`;
        },
      },
      {
        field: 'mendatory',
        headerName: this.translate.instant('ATTACHMENTS_CONFIG.MANDATORY'),
        width: 120,
        sortable: true,
        filter: true,
        cellRenderer: (params: any) => {
          const isMandatory = params.value;
          return `<span class="badge ${
            isMandatory ? 'status-waiting' : 'status-rejected'
          }">${isMandatory ? 'Mandatory' : 'Optional'}</span>`;
        },
      },
    ];
  }

  loadAttachmentsConfigTypes(): Promise<void> {
    this.spinnerService.show();
    this.searchSelect2Params.searchValue = null;
    this.searchSelect2Params.skip = 0;
    this.searchSelect2Params.take = 100;
    this.searchSelect2Params.orderByValue = null;

    return new Promise((resolve, reject) => {
      this.attachmentsConfigTypeService
        .getAttachmentsConfigTypeLookup(this.searchSelect2Params)
        .subscribe({
          next: (response) => {
            this.attachmentsConfigTypeOptions = response.results;
            this.spinnerService.hide();
            // Load data after options are loaded
            this.loadData();
            // Force change detection for dropdown
            this.refreshDropdownDisplay();
            resolve();
          },
          error: (error) => {
            this.toastr.error(
              'Error loading attachments config types: ' +
                (error.error?.message || error.message || 'Unknown error')
            );
            this.spinnerService.hide();
            // Still try to load data even if options fail
            this.loadData();
            reject(error);
          },
        });
    });
  }

  loadData(): void {
    // Load all attachments config data (both active/inactive and mandatory/optional)
    // Sends active: null, mendatory: null to get all records
    this.getAttachmentsConfigs(this.currentPage);
  }

  getAttachmentsConfigs(page: number): void {
    this.spinnerService.show();
    this.currentPage = page;

    // Use current filter criteria (which includes active and mandatory filters)
    // When active/mendatory are null, API returns all records
    const parameters: GetAllAttachmentsConfigParamters = {
      ...this.filterCriteria,
      skip: (page - 1) * this.itemsPerPage,
      take: this.itemsPerPage,
    };

    this.attachmentsConfigService.getAll(parameters).subscribe({
      next: (response) => {
        this.attachmentsConfigs = response.data;
        this.totalCount = response.totalCount;
        this.spinnerService.hide();
      },
      error: (error) => {
        this.toastr.error(
          'Error loading attachments configs: ' +
            (error.error?.message || error.message || 'Unknown error')
        );
        this.spinnerService.hide();
      },
    });
  }

  onPageChange(event: { pageNumber: number; pageSize: number }): void {
    this.currentPage = event.pageNumber;
    this.itemsPerPage = event.pageSize;
    this.getAttachmentsConfigs(this.currentPage);
  }

  onSearch(searchText: string): void {
    this.searchValue = searchText;
    this.currentPage = 1;
    this.getAttachmentsConfigs(this.currentPage);
  }

  onActionClick(event: { action: string; row: any }): void {
    const { action, row } = event;

    switch (action) {
      case 'view':
        this.openViewModal(row);
        break;
      case 'edit':
        this.openEditModal(row);
        break;
      case 'delete':
        this.selectConfigToDelete(row);
        break;
    }
  }

  /*************  ✨ Windsurf Command ⭐  *************/
  /**
   * Resets the filter form and loads the first page of data again.
   */
  /*******  b62708e1-a96e-4d27-92e9-4a42c65a1fe6  *******/
  clear(): void {
    this.filterCriteria = {
      skip: 0,
      take: 10,
      // Reset to show all data (both active/inactive and mandatory/optional)
      active: null,
      mendatory: null,
      attachmentConfigType: undefined,
    };
    this.currentPage = 1;
    this.getAttachmentsConfigs(this.currentPage);
  }

  submit(): void {
    this.submitted = true;

    if (this.attachmentsConfigForm.valid) {
      this.spinnerService.show();
      const formValue = this.attachmentsConfigForm.value;

      if (this.mode === 'add') {
        const createDto: CreateAttachmentsConfigDto = {
          name: formValue.name,
          nameEn: formValue.nameEn,
          attachmentsConfigType: formValue.attachmentsConfigType,
          active: formValue.active,
          mendatory: formValue.mendatory,
        };

        this.attachmentsConfigService.createAsync(createDto).subscribe({
          next: (response) => {
            this.toastr.success('Attachment config created successfully');
            this.closeModal();
            this.loadData();
            this.spinnerService.hide();
          },
          error: (error) => {
            this.toastr.error(
              'Error creating attachment config: ' +
                (error.error?.message || error.message || 'Unknown error')
            );
            this.spinnerService.hide();
          },
        });
      } else {
        const updateDto: UpdateAttachmentsConfigDto = {
          id: this.editingConfigId!,
          name: formValue.name,
          nameEn: formValue.nameEn,
          attachmentsConfigType: formValue.attachmentsConfigType,
          active: formValue.active,
          mendatory: formValue.mendatory,
        };

        this.attachmentsConfigService.updateAsync(updateDto).subscribe({
          next: (response) => {
            this.toastr.success('Attachment config updated successfully');
            this.closeModal();
            this.loadData();
            this.spinnerService.hide();
          },
          error: (error) => {
            this.toastr.error(
              'Error updating attachment config: ' +
                (error.error?.message || error.message || 'Unknown error')
            );
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
    this.editingConfigId = null;
    this.attachmentsConfigForm.reset({
      active: true,
      mendatory: false,
    });
    this.submitted = false;
    // Ensure form is enabled for add mode
    this.attachmentsConfigForm.enable();
    this.attachmentsConfigModal?.show();
  }

  openEditModal(config: AttachmentsConfigDto): void {
    this.mode = 'edit';
    this.editingConfigId = config.id;
    this.submitted = false;

    // Ensure options are loaded before setting form values
    if (this.attachmentsConfigTypeOptions.length === 0) {
      this.loadAttachmentsConfigTypes()
        .then(() => {
          this.setFormValues(config);
          // Ensure form is enabled for edit mode
          this.attachmentsConfigForm.enable();
          this.attachmentsConfigModal?.show();
        })
        .catch((error) => {
          this.toastr.error('Failed to load configuration options');
        });
    } else {
      this.setFormValues(config);
      // Ensure form is enabled for edit mode
      this.attachmentsConfigForm.enable();
      this.attachmentsConfigModal?.show();
    }

    // Force refresh of dropdown after modal is shown
    setTimeout(() => {
      this.attachmentsConfigForm
        .get('attachmentsConfigType')
        ?.updateValueAndValidity();
    }, 200);
  }

  openViewModal(config: AttachmentsConfigDto): void {
    this.mode = 'view';
    this.submitted = false;

    // Ensure options are loaded before setting form values
    if (this.attachmentsConfigTypeOptions.length === 0) {
      this.loadAttachmentsConfigTypes()
        .then(() => {
          this.setFormValues(config);
          // Keep form disabled for view mode
          this.attachmentsConfigForm.disable();
          this.attachmentsConfigModal?.show();
        })
        .catch((error) => {
          this.toastr.error('Failed to load configuration options');
        });
    } else {
      this.setFormValues(config);
      // Keep form disabled for view mode
      this.attachmentsConfigForm.disable();
      this.attachmentsConfigModal?.show();
    }

    // Force refresh of dropdown after modal is shown
    setTimeout(() => {
      this.attachmentsConfigForm
        .get('attachmentsConfigType')
        ?.updateValueAndValidity();
    }, 200);
  }

  private setFormValues(config: AttachmentsConfigDto): void {
    // Convert configType to string if it's a number to match the dropdown options
    const configTypeValue =
      typeof config.attachmentsConfigType === 'number'
        ? config.attachmentsConfigType.toString()
        : config.attachmentsConfigType;

    this.attachmentsConfigForm.patchValue({
      name: config.name,
      nameEn: config.nameEn,
      attachmentsConfigType: configTypeValue,
      active: config.active,
      mendatory: config.mendatory,
    });

    // Force change detection for the dropdown
    setTimeout(() => {
      this.attachmentsConfigForm
        .get('attachmentsConfigType')
        ?.updateValueAndValidity();
    }, 100);
  }

  closeModal(): void {
    this.attachmentsConfigModal?.hide();
    // Re-enable form when closing modal to prepare for next operation
    this.attachmentsConfigForm.enable();
  }

  selectConfigToDelete(config: AttachmentsConfigDto): void {
    this.selectedConfigToDelete = config;
    // Show delete confirmation modal
    this.deleteModal?.show();
  }

  deleteConfig(): void {
    if (this.selectedConfigToDelete) {
      this.spinnerService.show();
      this.attachmentsConfigService
        .deleteAsync(this.selectedConfigToDelete.id)
        .subscribe({
          next: () => {
            this.toastr.success('Attachment config deleted successfully');
            this.selectedConfigToDelete = null;
            this.deleteModal?.hide();
            this.loadData();
            this.spinnerService.hide();
          },
          error: (error) => {
            this.toastr.error(
              'Error deleting attachment config: ' +
                (error.error?.message || error.message || 'Unknown error')
            );
            this.spinnerService.hide();
          },
        });
    }
  }

  cancelDelete(): void {
    this.selectedConfigToDelete = null;
    this.deleteModal?.hide();
  }

  applyFilter(): void {
    this.currentPage = 0;
    this.getAttachmentsConfigs(this.currentPage);
  }

  getConfigTypeName(configType: number | string | undefined): string {
    if (!configType) return '-';

    // Convert configType to string for comparison
    const configTypeStr = configType.toString();

    const configTypeOption = this.attachmentsConfigTypeOptions.find(
      (option) => option.id.toString() === configTypeStr
    );

    return configTypeOption ? configTypeOption.text : configTypeStr;
  }

  refreshDropdownDisplay(): void {
    // Force change detection for the dropdown
    setTimeout(() => {
      this.attachmentsConfigForm
        .get('attachmentsConfigType')
        ?.updateValueAndValidity();
    }, 100);
  }

  onConfigTypeChange(event: any): void {
    // Force update of the form control
    this.attachmentsConfigForm
      .get('attachmentsConfigType')
      ?.updateValueAndValidity();
  }

  getFieldError(fieldName: string): string {
    const control = this.attachmentsConfigForm.get(fieldName);
    if (control && control.errors && control.touched) {
      if (control.errors['required']) {
        return this.translate.instant('VALIDATION.REQUIRED');
      }
      if (control.errors['maxlength']) {
        return this.translate.instant('VALIDATION.MAX_LENGTH', {
          max: control.errors['maxlength'].requiredLength,
        });
      }
    }
    return '';
  }

  onFieldBlur(fieldName: string): void {
    const control = this.attachmentsConfigForm.get(fieldName);
    if (control) {
      control.markAsTouched();
    }
  }

  hasFormErrors(): boolean {
    return this.attachmentsConfigForm.invalid;
  }

  getTotalErrors(): number {
    let errorCount = 0;
    Object.keys(this.attachmentsConfigForm.controls).forEach((key) => {
      const control = this.attachmentsConfigForm.get(key);
      if (control && control.errors) {
        errorCount++;
      }
    });
    return errorCount;
  }

  isFieldInvalid(fieldName: string): boolean {
    const control = this.attachmentsConfigForm.get(fieldName);
    return !!(control && control.invalid && control.touched);
  }

  isFieldValid(fieldName: string): boolean {
    const control = this.attachmentsConfigForm.get(fieldName);
    return !!(control && control.valid && control.touched);
  }
}
