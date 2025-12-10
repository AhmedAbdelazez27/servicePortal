import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgxSpinnerModule } from 'ngx-spinner';
import { GenericDataTableComponent } from '../../../../shared/generic-data-table/generic-data-table.component';
import { NotificationDto, GetAllNotificationRequestDto } from '../../../core/dtos/notifications/notification.dto';
import { ColDef } from 'ag-grid-community';
import { NotificationService } from '../../../core/services/notification.service';
import { NotificationApiService } from '../../../core/services/notification-api.service';
import { AuthService } from '../../../core/services/auth.service';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-notification-management',
  templateUrl: './notification-management.component.html',
  styleUrls: ['./notification-management.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    NgxSpinnerModule,
    GenericDataTableComponent,
    DatePipe,
    DecimalPipe
  ]
})
export class NotificationManagementComponent implements OnInit, OnDestroy {
  loading = false;
  notifications: NotificationDto[] = [];
  totalCount = 0;
  totalUnseenCount = 0; // Total unseen count from backend
  totalSeenCount = 0; // Calculated as (totalCount - totalUnseenCount)
  pageSize = 10;
  currentPage = 0;
  selectedNotification: NotificationDto | null = null;
  showDetailsModal = false;
  private destroy$ = new Subject<void>();
  Math = Math; // For template access

  columnDefs: ColDef[] = [];
  columnHeaderMap: { [key: string]: string } = {};
  rowActions = [
    { labelKey: 'Common.ViewInfo', icon: 'fas fa-eye', action: 'view' },
    { labelKey: 'NOTIFICATIONS.ACTIONS.MARK_AS_SEEN', icon: 'fas fa-check', action: 'markSeen' }
  ];

  constructor(
    private translate: TranslateService,
    private notificationService: NotificationService,
    private notificationApiService: NotificationApiService,
    private authService: AuthService
  ) {}

  getCurrentUserId(): string | null {
    return this.authService.getUserId();
  }

  ngOnInit() {
    // Initialize table with language-aware columns
    this.initializeTable();
    this.initializeRowActions();
    
    // Load notifications and statistics
    this.loadNotifications();
    this.loadNotificationStatistics();
    
    // Listen for language changes to refresh table columns
    this.translate.onLangChange
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.refreshTableColumns();
        this.initializeRowActions();
      });
  }

  initializeRowActions() {
    this.rowActions = [
      { labelKey: 'Common.ViewInfo', icon: 'fas fa-eye', action: 'view' },
      { labelKey: 'NOTIFICATIONS.ACTIONS.MARK_AS_SEEN', icon: 'fas fa-check', action: 'markSeen' }
    ];
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  initializeTable() {
    const currentLang = this.translate.currentLang || 'en';
    const isArabic = currentLang === 'ar';
    
    this.columnDefs = [
      { 
        field: isArabic ? 'titleAr' : 'titleEn', 
        headerName: this.translate.instant('NOTIFICATIONS.FIELDS.TITLE'),
        flex: 2,
        cellRenderer: (params: any) => {
          if (!params.data) {
            return '<span class="text-muted">No data</span>';
          }
          
          // Get title based on current language
          const title = isArabic ? 
            (params.data.titleAr || params.data.titleEn || 'No Title') : 
            (params.data.titleEn || params.data.titleAr || 'No Title');
          
          const isSeen = params.data.isSeen;
          const marginStyle = isArabic ? 'margin-left: 12px; margin-right: 0;' : 'margin-right: 12px; margin-left: 0;';
          const result = `
            <div class="d-flex align-items-center">
              <i class="fas ${isSeen ? 'fa-envelope-open text-muted' : 'fa-envelope text-primary'}" style="${marginStyle}"></i>
              <span class="${isSeen ? '' : 'fw-bold'}">${title}</span>
            </div>
          `;
          return result;
        }
      },
      { 
        field: isArabic ? 'messageAr' : 'messageEn', 
        headerName: this.translate.instant('NOTIFICATIONS.FIELDS.MESSAGE'),
        flex: 3,
        cellRenderer: (params: any) => {
          if (!params.data) {
            return '<span class="text-muted">No data</span>';
          }
          
          // Get message based on current language
          const message = isArabic ? 
            (params.data.messageAr || params.data.messageEn || '') : 
            (params.data.messageEn || params.data.messageAr || '');
          
          if (!message) {
            return '<span class="text-muted">-</span>';
          }
          
          // Truncate long messages for table display
          const truncatedMessage = message.length > 100 ? 
            message.substring(0, 100) + '...' : message;
          
          return `
            <div class="message-cell">
              <span class="text-muted small">${truncatedMessage}</span>
            </div>
          `;
        }
      },
      { 
        field: 'notificationDate', 
        headerName: this.translate.instant('NOTIFICATIONS.FIELDS.DATE'),
        flex: 1,
        cellRenderer: (params: any) => {
          if (!params.value) {
            return '<span class="text-muted">No Date</span>';
          }
          const date = new Date(params.value);
          const iconMargin = isArabic ? 'margin-left: 8px; margin-right: 0;' : 'margin-right: 8px; margin-left: 0;';
          return `
            <div class="text-muted small">
              <div style="display: flex; align-items: center; margin-bottom: 4px;">
                <i class="fas fa-calendar" style="${iconMargin}"></i>
                <span>${date.toLocaleDateString()}</span>
              </div>
              <div style="display: flex; align-items: center;">
                <i class="fas fa-clock" style="${iconMargin}"></i>
                <span>${date.toLocaleTimeString()}</span>
              </div>
            </div>
          `;
        }
      },
      { 
        field: 'isSeen', 
        headerName: this.translate.instant('NOTIFICATIONS.FIELDS.STATUS'),
        width: 120,
        cellRenderer: (params: any) => {
          const isSeen = params.value;
          const statusText = isSeen ? 
            this.translate.instant('NOTIFICATIONS.STATUS.SEEN') : 
            this.translate.instant('NOTIFICATIONS.STATUS.UNSEEN');
          return `
            <span class="badge ${isSeen ? 'bg-success' : 'bg-warning text-dark'} fs-6">
              <i class="fas ${isSeen ? 'fa-check-circle' : 'fa-exclamation-circle'} me-1"></i>
              ${statusText}
            </span>
          `;
        }
      },

    ];

    // Set up column header translations
    this.columnHeaderMap = {
      [isArabic ? 'titleAr' : 'titleEn']: this.translate.instant('NOTIFICATIONS.FIELDS.TITLE'),
      [isArabic ? 'messageAr' : 'messageEn']: this.translate.instant('NOTIFICATIONS.FIELDS.MESSAGE'),
      'notificationDate': this.translate.instant('NOTIFICATIONS.FIELDS.DATE'),
      'isSeen': this.translate.instant('NOTIFICATIONS.FIELDS.STATUS')
    };
  }

  // Method to refresh table columns when language changes
  refreshTableColumns() {
    this.initializeTable();
  }

  // Method to get current language
  getCurrentLanguage(): string {
    return this.translate.currentLang || 'en';
  }

  // Method to check if current language is Arabic
  isArabicLanguage(): boolean {
    return this.getCurrentLanguage() === 'ar';
  }

  loadNotifications() {
    const userId = this.authService.getUserId();
    if (!userId) {
      return;
    }

    this.loading = true;
    
    // Calculate correct skip value for pagination
    const skip = this.currentPage * this.pageSize;
    
    const request: GetAllNotificationRequestDto = {
      skip: skip,
      take: this.pageSize
    };

    // Use direct API call for management page to avoid conflicts with navbar notifications
    this.notificationApiService.getAllNotifications(request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          this.notifications = result.data || [];
          this.totalCount = result.totalCount || 0;
          this.loading = false;
          
          // Load statistics after getting the total count
          this.loadNotificationStatistics();
        },
        error: (error) => {
          this.loading = false;
          this.notifications = [];
          this.totalCount = 0;
          this.totalUnseenCount = 0;
          this.totalSeenCount = 0;
        }
      });
  }

  testApiCall(userId: string) {
    const request: GetAllNotificationRequestDto = {
      skip: this.currentPage * this.pageSize,
      take: this.pageSize
    };

    this.notificationApiService.getAllNotifications(request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          // API test completed
        },
        error: (error) => {
          // API test failed
        }
      });
  }

  refreshNotifications() {
    this.currentPage = 0; // Reset to first page
    this.loadNotifications();
    this.loadNotificationStatistics(); // Also refresh statistics
  }

  // Debug method to check table data binding
  debugTableData() {
    return true;
  }

  // Handle when table data changes
  onTableDataChanged() {
    // Table data changed
  }

  getUnseenCount(): number {
    // Return the total unseen count from backend, not just current page
    return this.totalUnseenCount;
  }

  getSeenCount(): number {
    // Return the total seen count calculated as (total - unseen)
    return this.totalSeenCount;
  }

  getNotificationTitle(notification: NotificationDto): string {
    return this.translate.currentLang === 'ar' ? notification.titleAr : notification.titleEn;
  }

  getNotificationMessage(notification: NotificationDto): string {
    return this.translate.currentLang === 'ar' ? (notification.messageAr || '') : (notification.messageEn || '');
  }

  onActionClick(event: { action: string, row: NotificationDto }) {
    switch (event.action) {
      case 'view':
        this.viewNotificationDetails(event.row);
        break;
      case 'markSeen':
        this.markNotificationAsSeen(event.row);
        break;
    }
  }

  onPageChange(event: { pageNumber: number; pageSize: number }) {
    this.currentPage = event.pageNumber - 1; // Convert to 0-based index
    this.pageSize = event.pageSize;
    this.loadNotifications();
  }

  viewNotificationDetails(notification: NotificationDto) {
    this.selectedNotification = notification;
    this.showDetailsModal = true;
  }

  closeDetailsModal() {
    this.showDetailsModal = false;
    this.selectedNotification = null;
  }

  async markNotificationAsSeen(notification: NotificationDto) {
    if (!notification.isSeen) {
      try {
        // Use the shared notification service instead of direct API call
        // This ensures the navbar gets updated properly
        await this.notificationService.markAsSeen(notification.notificationId);
        
        // Update the local notification object
        notification.isSeen = true;
        this.closeDetailsModal();
        
        // Refresh the current page data and statistics
        this.loadNotifications();
        this.loadNotificationStatistics();
      } catch (error: any) {
        // Error marking notification as seen
      }
    }
  }

  /**
   * Load notification statistics (total counts) from backend
   */
  loadNotificationStatistics() {
    const userId = this.authService.getUserId();
    if (!userId) {
      return;
    }
    
    // Get total unseen count from backend
    this.notificationApiService.getUnseenNotificationsCount()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (unseenCount) => {
          this.totalUnseenCount = unseenCount;
          
          // Calculate seen count as (total - unseen)
          this.totalSeenCount = Math.max(0, this.totalCount - this.totalUnseenCount);
        },
        error: (error) => {
          // Fallback to 0 if API fails
          this.totalUnseenCount = 0;
          this.totalSeenCount = this.totalCount;
        }
      });
  }
}
