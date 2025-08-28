import { Component, Input, OnChanges, OnInit, SimpleChanges, Output, EventEmitter, ElementRef, ViewChild, HostListener, OnDestroy } from '@angular/core';
import { ColDef, GridReadyEvent, GridApi, GridOptions } from 'ag-grid-community';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AgGridModule } from 'ag-grid-angular';
import { TranslationService } from '../../app/core/services/translation.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { TranslateModule ,TranslateService} from '@ngx-translate/core';

@Component({
  selector: 'app-generic-data-table',
  templateUrl: './generic-data-table.component.html',
  styleUrls: ['./generic-data-table.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, AgGridModule ,TranslateModule]
})
export class GenericDataTableComponent implements OnChanges, OnInit, OnDestroy {
  private _columnDefs: ColDef[] = [];
  @Input() set columnDefs(value: ColDef[]) {
    this._columnDefs = value || [];
    this.ensureActionPin();
  }
  get columnDefs(): ColDef[] {
    return this._columnDefs;
  }
  @Input() rowData: any[] = [];
  @Input() totalCount: number = 0;
  @Input() pageSize: number = 10;
  @Input() currentPage: number = 0;  
  @Input() showActionColumn: boolean = false;
  @Input() columnHeaderMap: { [key: string]: string } = {};
  @Input() rowActions: Array<{ label?: string; labelKey?: string; icon?: string; action: string }> = [];

  @Input() set actions(value: Array<{ label?: string; labelKey?: string; icon?: string; action: string }>) {
    this.rowActions = value || [];
    this.translateActionLabels();
  }
  @Output() actionClick = new EventEmitter<{ action: string, row: any }>();
  @Input() gridOptions: GridOptions = {};
  @Output() pageChange = new EventEmitter<{ pageNumber: number; pageSize: number }>();
  @Output() search = new EventEmitter<string>();
  @Output() languageChanged = new EventEmitter<void>();

  searchText: string = '';
  totalPages: number = 0;
  Math = Math;

  showInfoModal: boolean = false;
  selectedRowData: any = null;
  public selectedRowKeysArr: string[] = [];

  showGrid: boolean = true;

  openMenuRowId: string | null = null;
  menuX: number = 0;
  menuY: number = 0;

  inputPage: number = 1;

  @ViewChild('actionMenu', { static: false }) actionMenu!: ElementRef;

  defaultColDef: ColDef = {
    sortable: true,
    resizable: true,
    filter: true,
    flex: 1,
    minWidth: 10
  };

  private destroy$ = new Subject<void>();
  public api!: GridApi;
  public isRtl = false;

  constructor(private translationService: TranslationService ,private translate: TranslateService) {
    const lang = (localStorage.getItem('lang') as string) || this.translationService?.currentLang || 'en';
    this.isRtl = lang.startsWith('ar');
  }

  ngOnInit() {
   
    document.addEventListener('click', (event: any) => {
      const btn = event.target.closest('.action-kebab-btn');
      if (btn && btn.dataset.rowId !== undefined) {
        const rect = btn.getBoundingClientRect();
        const gridContainer = document.querySelector('.ag-theme-alpine') as HTMLElement;
        const gridRect = gridContainer.getBoundingClientRect();
        this.menuX = rect.right - gridRect.left - 180;
        this.menuY = rect.bottom - gridRect.top - 30;
        this.openMenuRowId = btn.dataset.rowId;
      } else {
        this.openMenuRowId = null;
      }
    });

    this.translationService.langChange$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.onLanguageChange();
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onLanguageChange() {
    this.applyRtl();
    this.updateHeaderTranslations();
    this.translateActionLabels();
    this.showGrid = false;
    setTimeout(() => {
      this.showGrid = true;
    });
    this.languageChanged.emit();
  }

  private updateHeaderTranslations() {
    if (!this.columnDefs) return;
    this.columnDefs.forEach(col => {
      if (col.colId === 'action') {
        col.headerName = this.translate.instant('COMMON.ACTIONS');
      }
    });
  }

  private translateActionLabels() {
    if (!this.rowActions) return;
    this.rowActions.forEach(a => {
      const key = a.labelKey || a.label;
      a.label = this.translate.instant(key as string);
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (this.columnDefs && this.columnDefs.length) {
      this.columnDefs.forEach(col => {
        if (col.colId === 'action') {
          col.pinned = this.isRtl ? 'left' : 'right';
        }
      });
    }
    if (changes['rowData'] || changes['totalCount'] || changes['pageSize']) {
      this.totalPages = Math.ceil(this.totalCount / this.pageSize);
    }
    this.inputPage = this.currentPage + 1;
    
    if (this.showActionColumn && this.columnDefs && !this.columnDefs.some(col => col.colId === 'action')) {
      const newColumnDefs = [...this.columnDefs];
      newColumnDefs.push({
        headerName: this.translate.instant('COMMON.ACTIONS'),
        colId: 'action',
        cellRenderer: this.actionCellRenderer,
        width: 100,
        pinned: this.isRtl ? 'left' : 'right',
        suppressMenu: true,
        suppressMovable: true,
        filter: false,
        sortable: false
      });
      this.columnDefs = newColumnDefs;
    }
    const actionCol = this.columnDefs.find(col => col.colId === 'action');
    if (actionCol) {
      actionCol.pinned = this.isRtl ? 'left' : 'right';
    }
    if (this.api) {
      this.api.applyColumnState({ state: [{ colId: 'action', pinned: this.isRtl ? 'left' : 'right' }], applyOrder: true });
    }
  }

  actionCellRenderer = (params: any) => {
    const rowId = params.node.rowIndex.toString();
    return `
      <button class='btn btn-link p-0 action-kebab-btn' aria-label='Actions' data-row-id='${rowId}'>
        <svg width='20' height='20' viewBox='0 0 20 20' fill='none' xmlns='http://www.w3.org/2000/svg'>
          <circle cx='10' cy='4' r='1.5' fill='#495057'/>
          <circle cx='10' cy='10' r='1.5' fill='#495057'/>
          <circle cx='10' cy='16' r='1.5' fill='#495057'/>
        </svg>
      </button>
    `;
  };

  onGridReady(event: GridReadyEvent) {
    this.api = event.api;
    this.applyRtl();
    if (this.api) {
      const pinSide = this.isRtl ? 'left' : 'right';
      this.api.setColumnPinned('action', pinSide as any);
      if ((this.api as any).setEnableRtl) {
        (this.api as any).setEnableRtl(this.isRtl);
      }
      this.ensureActionPin();
      this.api.setColumnDefs([...this.columnDefs]);
      this.api.refreshHeader();
    }
    this.api.addEventListener('cellClicked', (event: any) => {
      if (event.colDef.colId === 'action' && event.event.target) {
        const action = event.event.target.getAttribute('data-action');
        if (action) {
          this.actionClick.emit({ action, row: event.data });
        }
      }
    });
  }

  private applyRtl() {
    const lang = this.translationService?.currentLang || 'en';
    this.isRtl = lang.startsWith('ar');
    if (this.api) {
      const pinSide = this.isRtl ? 'left' : 'right';
      this.api.setColumnPinned('action', pinSide as any);
      if ((this.api as any).setEnableRtl) {
        (this.api as any).setEnableRtl(this.isRtl);
      }
      this.api.refreshHeader();
    }
    
  }

  onViewInfo(row: any) {
    this.selectedRowData = row;
    this.selectedRowKeysArr = Object.keys(row);
    this.showInfoModal = true;
  }

  closeInfoModal() {
    this.showInfoModal = false;
    this.selectedRowData = null;
    this.selectedRowKeysArr = [];
  }

  nextPage() {
    if ((this.currentPage + 1) < this.totalPages) {
      this.currentPage++;
      this.emitPageChange();
    }
  }

  prevPage() {
    if (this.currentPage > 0) {
      this.currentPage--;
      this.emitPageChange();
    }
  }

  goToPage(page: number) {
    if (page >= 0 && page < this.totalPages) {
      this.currentPage = page;
      this.inputPage = page + 1;
      this.emitPageChange();
    }
  }

  onPageSizeChanged(size: string) {
    this.pageSize = +size;
    this.currentPage = 0;
    this.inputPage = 1;
    this.emitPageChange();
  }

  emitPageChange() {
    this.pageChange.emit({ pageNumber: this.currentPage + 1, pageSize: this.pageSize });
  }

  onSearchInput() {
    this.search.emit(this.searchText);
  }

  onMenuAction(action: string) {
    const row = this.rowData.find((r, idx) => idx.toString() === this.openMenuRowId);
    this.actionClick.emit({ action, row });
    this.openMenuRowId = null;
  }

  @HostListener('document:click', ['$event'])
  handleClickOutside(event: Event) {
    if (!(event.target as HTMLElement).closest('.action-kebab-btn') && 
        !(event.target as HTMLElement).closest('.context-menu')) {
      this.openMenuRowId = null;
    }
  }

  private ensureActionPin() {
    if (!this._columnDefs) return;
    this._columnDefs.forEach(col => {
      if (col.colId === 'action') {
        col.pinned = this.isRtl ? 'left' : 'right';
      }
    });
  }
}