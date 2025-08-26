import { Component, Input, OnChanges, OnInit, SimpleChanges, Output, EventEmitter, ElementRef, ViewChild, HostListener, OnDestroy } from '@angular/core';
import { ColDef, GridReadyEvent, GridApi, GridOptions } from 'ag-grid-community';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AgGridModule } from 'ag-grid-angular';
import { TranslationService } from '../../app/core/services/translation.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-generic-data-table',
  templateUrl: './generic-data-table.component.html',
  styleUrls: ['./generic-data-table.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, AgGridModule]
})
export class GenericDataTableComponent implements OnChanges, OnInit, OnDestroy {
  @Input() columnDefs: ColDef[] = [];
  @Input() rowData: any[] = [];
  @Input() totalCount: number = 0;
  @Input() pageSize: number = 10;
  @Input() currentPage: number = 0;  
  @Input() showActionColumn: boolean = false;
  @Input() columnHeaderMap: { [key: string]: string } = {};
  @Input() rowActions: Array<{ label: string, icon?: string, action: string }> = [];
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

  constructor(private translationService: TranslationService) {}

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
    this.languageChanged.emit();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['rowData'] || changes['totalCount'] || changes['pageSize']) {
      this.totalPages = Math.ceil(this.totalCount / this.pageSize);
    }
    this.inputPage = this.currentPage + 1;
    
    if (this.showActionColumn && this.columnDefs && !this.columnDefs.some(col => col.colId === 'action')) {
      const newColumnDefs = [...this.columnDefs];
      newColumnDefs.push({
        headerName: 'Actions',
        colId: 'action',
        cellRenderer: this.actionCellRenderer,
        width: 100,
        pinned: 'right',
        suppressMenu: true,
        suppressMovable: true,
        filter: false,
        sortable: false
      });
      this.columnDefs = newColumnDefs;
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

  onGridReady(params: any) {
    params.api.addEventListener('cellClicked', (event: any) => {
      if (event.colDef.colId === 'action' && event.event.target) {
        const action = event.event.target.getAttribute('data-action');
        if (action) {
          this.actionClick.emit({ action, row: event.data });
        }
      }
    });
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
}