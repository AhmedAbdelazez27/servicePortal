import {
  Component,
  Input,
  OnChanges,
  OnInit,
  SimpleChanges,
  Output,
  EventEmitter,
  ElementRef,
  ViewChild,
  HostListener,
  OnDestroy
} from '@angular/core';
import { ColDef, GridReadyEvent, GridApi, GridOptions } from 'ag-grid-community';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AgGridModule } from 'ag-grid-angular';
import { TranslationService } from '../../app/core/services/translation.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-generic-data-table',
  templateUrl: './generic-data-table.component.html',
  styleUrls: ['./generic-data-table.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, AgGridModule, TranslateModule]
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
  @Input() rowActions: Array<{ 
    label?: string; 
    labelKey?: string; 
    icon?: string; 
    action: string;
    variant?: 'default' | 'success' | 'danger';
    disabled?: boolean;
    separator?: boolean;
  }> = [];
  @Input() showSearchText: boolean = true;

  @Input() set actions(value: Array<{ 
    label?: string; 
    labelKey?: string; 
    icon?: string; 
    action: string;
    variant?: 'default' | 'success' | 'danger';
    disabled?: boolean;
    separator?: boolean;
  }>) {
    this.rowActions = value || [];
    this.translateActionLabels();
  }

  @Output() actionClick = new EventEmitter<{ action: string; row: any }>();
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
  mainColumns = this.columnDefs.slice(0, 4); 
  showGrid: boolean = true;

  // context menu state
  openMenuRowId: string | null = null;
  menuX: number = 0;
  menuY: number = 0;

  inputPage: number = 1;

  @ViewChild('actionMenu', { static: false }) actionMenu!: ElementRef;

  defaultColDef: ColDef = {
    sortable: true,
    resizable: true,
    filter: false,
    wrapText: true,
    autoHeight: true,
    minWidth: 80
  };


  private destroy$ = new Subject<void>();
  public api!: GridApi;
  public isRtl = false;

  // فريد لكل instance
  public uniqueId: string = 'gdt-' + Math.random().toString(36).slice(2, 9) + '-' + Date.now().toString(36);

  constructor(
    private translationService: TranslationService,
    private translate: TranslateService,
    private el: ElementRef<HTMLElement>
  ) {
    const lang = (localStorage.getItem('lang') as string) || this.translationService?.currentLang || 'en';
    this.isRtl = lang.startsWith('ar');
  }

  ngOnInit() {
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

  // helper لو محتاج تقفل المينو برمجياً من الأب (مثلاً عند فتح مودال)
  public closeActionMenu(): void {
    this.openMenuRowId = null;
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
    this.columnDefs.forEach((col) => {
      if (col.colId === 'action') {
        col.headerName = this.translate.instant('COMMON.ACTIONS');
      }
    });
  }

  private translateActionLabels() {
    if (!this.rowActions) return;
    this.rowActions.forEach((a) => {
      const key = a.labelKey || a.label;
      a.label = this.translate.instant(key as string);
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (this.columnDefs && this.columnDefs.length) {
      this.columnDefs.forEach((col) => {
        if (col.colId === 'action') {
          col.pinned = this.isRtl ? 'left' : 'right';
        }
      });
    }
    if (changes['rowData'] || changes['totalCount'] || changes['pageSize']) {
      this.totalPages = Math.ceil(this.totalCount / this.pageSize);
    }
    this.inputPage = this.currentPage + 1;

    if (this.showActionColumn && this.columnDefs && !this.columnDefs.some((col) => col.colId === 'action')) {
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
    const actionCol = this.columnDefs.find((col) => col.colId === 'action');
    if (actionCol) {
      actionCol.pinned = this.isRtl ? 'left' : 'right';
    }
    if (this.api && (changes['rowData'] || changes['columnDefs'])) {
      const columnApi = (this.api as any).columnApi || (this.api as any).getColumnApi?.();
      setTimeout(() => this.adjustColumnSizing(columnApi, this.api), 80);
    }
    //if (this.api) {
    //  this.api.applyColumnState({
    //    state: [{ colId: 'action', pinned: this.isRtl ? 'left' : 'right' }],
    //    applyOrder: true
    //  });
    //}
  }

  actionCellRenderer = (params: any) => {
    const rowId = (params.data?.id ?? params.node.rowIndex).toString();
    return `
      <button class='btn btn-link p-0 action-kebab-btn'
              aria-label='Actions'
              data-row-id='${rowId}'
              data-table-id='${this.uniqueId}'
              title='More actions'>
        <svg width='20' height='20' viewBox='0 0 20 20' fill='black' xmlns='http://www.w3.org/2000/svg'>
          <circle cx='10' cy='4' r='2' fill='black'/>
          <circle cx='10' cy='10' r='2' fill='black'/>
          <circle cx='10' cy='16' r='2' fill='black'/>
        </svg>
      </button>
    `;
  };

  private getDisplayedCols(columnApi: any) {
    if (typeof columnApi.getAllDisplayedColumns === 'function') {
      return columnApi.getAllDisplayedColumns();
    }
    if (typeof columnApi.getAllGridColumns === 'function') {
      return columnApi.getAllGridColumns();
    }
    const state = columnApi.getColumnState ? columnApi.getColumnState() : [];
    return state.map((s: any) => ({ getColId: () => s.colId, getActualWidth: () => s.width || 100 }));
  }

 
  private adjustColumnSizing(columnApi: any, api: any) {
    if (!columnApi || !api) return;

    const displayedCols = this.getDisplayedCols(columnApi);
    const colIds = displayedCols.map((c: any) => c.getColId());

    const gridHost = this.el.nativeElement.querySelector('.ag-theme-alpine') as HTMLElement;
    const gridWidth = (gridHost && gridHost.clientWidth) || window.innerWidth;

    if (displayedCols.length <= 8) {
      // 👉 Few columns → stretch to fill grid
      try {
        api.sizeColumnsToFit();
      } catch (e) {
        console.warn('sizeColumnsToFit error', e);
      }
    } else {
      // 👉 Many columns → cap width and allow wrapping
      const maxWidth = 200;
      displayedCols.forEach((col: any) => {
        try {
          columnApi.setColumnWidth(col.getColId(), maxWidth, false);
        } catch (e) {
          try { columnApi.setColumnWidth(col, maxWidth, false); } catch { }
        }
      });
    }

    // Always recalc row heights so wrapped text shows correctly
    setTimeout(() => {
      api.resetRowHeights();
    }, 50);
  }

  onGridReady(event: GridReadyEvent) {
    this.api = event.api;

    // ensure rtl/pins and defs as you already have
    this.applyRtl();
    this.ensureActionPin();
    this.api.setColumnDefs([...this.columnDefs]);

    // run sizing once grid & columns are ready
    setTimeout(() => {
      this.adjustColumnSizing(event.columnApi, event.api);
    }, 50);

    // run on resize
    window.addEventListener('resize', () => {
      // throttle lightly if you want
      if (this.api) {
        this.adjustColumnSizing((this.api as any).columnApi || (event as any).columnApi, this.api);
      }
    });

    // preserve your existing listeners
    this.api.addEventListener('cellClicked', (agEvt: any) => {
      if (agEvt.colDef.colId === 'action' && agEvt.event?.target) {
        const action = agEvt.event.target.getAttribute('data-action');
        if (action) {
          this.actionClick.emit({ action, row: agEvt.data });
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
    if (this.currentPage + 1 < this.totalPages) {
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
    const key = this.openMenuRowId;
    const row = this.rowData.find((r, idx) => (r?.id ?? idx).toString() === key);
    this.actionClick.emit({ action, row });
    this.openMenuRowId = null;
  }

  /** بديل document.addEventListener — آمن ومختصر */
  @HostListener('document:click', ['$event'])
  onDocumentClick(ev: MouseEvent) {
    const target = ev.target as HTMLElement;

    // لو كليك على زر الأكشن
    const btn = target.closest('.action-kebab-btn') as HTMLElement | null;
    if (btn) {
      const btnTableId = btn.getAttribute('data-table-id');
      if (btnTableId !== this.uniqueId) {
        this.openMenuRowId = null;
        return;
      }
              
      this.calculateMenuPosition(btn);
      this.openMenuRowId = btn.getAttribute('data-row-id');
      
      setTimeout(() => {
        const firstMenuItem = this.el.nativeElement.querySelector('.context-menu-item') as HTMLButtonElement;
        firstMenuItem?.focus();
      }, 50);
      return;
    }

    // اقفل القائمة لو الكليك داخل نفس الـ host لكن خارج المينو
    const clickedInsideHost = this.el.nativeElement.contains(target);
    const clickedInsideMenu = !!target.closest('.context-menu');

    if (clickedInsideHost && !clickedInsideMenu) {
      this.openMenuRowId = null;
      return;
    }

    // لو كليك برا الـ host خالص برضه اقفل
    if (!clickedInsideHost) {
      this.openMenuRowId = null;
    }
  }

  private calculateMenuPosition(btn: HTMLElement): void {
    const btnRect = btn.getBoundingClientRect();
    const hostRect = this.el.nativeElement.getBoundingClientRect();
    const tableContainer = this.el.nativeElement.querySelector('.table-responsive');
    const containerRect = tableContainer ? tableContainer.getBoundingClientRect() : hostRect;
    
    const menuWidth = 180;
    const menuItemHeight = 48;
    const menuHeight = menuItemHeight * (this.rowActions.length || 1) + 16; // +16 for padding
    const menuPadding = 8;
    
    const spaceBelow = window.innerHeight - btnRect.bottom;
    const spaceAbove = btnRect.top;
    const spaceRight = window.innerWidth - btnRect.right;
    const spaceLeft = btnRect.left;
    
    let menuY: number;
    menuY = btnRect.top - containerRect.top;
    
    if (menuY < menuPadding) {
      menuY = menuPadding;
    }
    
    const maxY = containerRect.height - menuHeight - menuPadding;
    if (menuY > maxY) {
      menuY = maxY;
    }
    
    let menuX: number;
    if (this.isRtl) {
      if (spaceRight >= menuWidth + menuPadding) {
        menuX = btnRect.right - containerRect.left + menuPadding;
      } else {
        menuX = btnRect.left - containerRect.left - menuWidth - menuPadding;
      }
    } else {
      if (spaceLeft >= menuWidth + menuPadding) {
        menuX = btnRect.left - containerRect.left - menuWidth - menuPadding;
      } else {
        menuX = btnRect.right - containerRect.left + menuPadding;
      }
    }
    
    menuX = Math.max(menuPadding, menuX);
    menuX = Math.min(containerRect.width - menuWidth - menuPadding, menuX);
    
    this.menuX = menuX;
    this.menuY = menuY;
  }

  private ensureActionPin() {
    if (!this._columnDefs) return;
    this._columnDefs.forEach((col) => {
      if (col.colId === 'action') {
        col.pinned = this.isRtl ? 'left' : 'right';
      }
    });
  }

  trackByAction(index: number, action: any): string {
    return action.action || index.toString();
  }

  getActionClasses(action: any): string {
    let classes = 'context-menu-item';
    
    if (action.variant) {
      classes += ` ${action.variant}`;
    }
    
    if (action.disabled) {
      classes += ' disabled';
    }
    
    if (action.separator) {
      classes += ' separator';
    }
    
    return classes;
  }

  isActionDisabled(action: any): boolean {
    return action.disabled === true;
  }

  @HostListener('document:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    if (!this.openMenuRowId) return;

    switch (event.key) {
      case 'Escape':
        this.openMenuRowId = null;
        event.preventDefault();
        break;
      case 'ArrowDown':
        this.focusNextMenuItem();
        event.preventDefault();
        break;
      case 'ArrowUp':
        this.focusPreviousMenuItem();
        event.preventDefault();
        break;
      case 'Enter':
      case ' ':
        const focusedButton = document.activeElement as HTMLButtonElement;
        if (focusedButton && focusedButton.classList.contains('context-menu-item')) {
          focusedButton.click();
          event.preventDefault();
        }
        break;
    }
  }

  private focusNextMenuItem(): void {
    const menuItems = this.getMenuItems();
    const currentIndex = this.getCurrentMenuItemIndex(menuItems);
    const nextIndex = currentIndex < menuItems.length - 1 ? currentIndex + 1 : 0;
    menuItems[nextIndex]?.focus();
  }

  private focusPreviousMenuItem(): void {
    const menuItems = this.getMenuItems();
    const currentIndex = this.getCurrentMenuItemIndex(menuItems);
    const prevIndex = currentIndex > 0 ? currentIndex - 1 : menuItems.length - 1;
    menuItems[prevIndex]?.focus();
  }

  private getMenuItems(): HTMLButtonElement[] {
    const menu = this.el.nativeElement.querySelector('.context-menu');
    return menu ? Array.from(menu.querySelectorAll('.context-menu-item')) : [];
  }

  private getCurrentMenuItemIndex(menuItems: HTMLButtonElement[]): number {
    const activeElement = document.activeElement as HTMLButtonElement;
    return menuItems.findIndex(item => item === activeElement);
  }
}
