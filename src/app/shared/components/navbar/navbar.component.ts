import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ToastrService } from 'ngx-toastr';
import { TranslateService, TranslateModule } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TranslationService } from '../../../core/services/translation.service';
import { NotificationService } from '../../../core/services/notification.service';
import { NotificationDto, CreateNotificationDto, CreateDepartmentNotificationDto, SendNotificationToDepartmentDto } from '../../../core/dtos/notifications/notification.dto';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-navbar',
  imports: [CommonModule, TranslateModule, RouterModule],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss'
})
export class NavbarComponent implements OnInit, OnDestroy {

    currentLang: string = 'en';
  notifications: NotificationDto[] = [];
  unseenCount = 0;
  loading = false;
  isNotificationDropdownOpen = false;
  private destroy$ = new Subject<void>();
    private isSubscribed = false; // Prevent duplicate subscriptions



  constructor(
    private authService: AuthService,
    private toastr: ToastrService,
    private translate: TranslateService,
    private router: Router,
    private notificationService: NotificationService,
    public translation: TranslationService
  ) {
    this.currentLang = this.translate.currentLang || this.translate.getDefaultLang() || 'ar';

    this.translate.onLangChange.subscribe(lang => {
      this.currentLang = lang.lang;
    });
  }

  isLoggedIn(): boolean {
    return this.authService.isLoggedIn();
  }

  isLoginPage(): boolean {
    return this.router.url === '/login';
  }

  shouldShowLoginButton(): boolean {
    return !this.isLoggedIn() && !this.isLoginPage();
  }

  onChangePassword(): void {
    // TODO: Implement change password functionality check this with doc 
  }

  onProfile(): void {
    this.router.navigate(['/edit-profile']);
  }

  onLogout(): void {
    // Clear notifications when logging out
    this.notificationService.clearNotifications();
    this.isNotificationDropdownOpen = false;
    this.isSubscribed = false; // Reset subscription flag
    
    this.authService.logout();
    this.toastr.success(
      this.translate.instant('AUTH.MESSAGES.LOGOUT_SUCCESS'),
      this.translate.instant('TOAST.TITLE.SUCCESS')
    );
  }

  onLogin(): void {
    this.router.navigate(['/login']);
  }

  ngOnInit(): void {
    if (this.isLoggedIn()) {
      // Only subscribe to notifications if not already subscribed
      if (!this.isSubscribed) {
        this.subscribeToNotifications();
        this.isSubscribed = true;
      }
      
      // ✅ NEW OPTIMIZED APPROACH: Session-based initialization
      // This will only initialize once per user session, not on every page navigation
      this.ensureUserSessionInitialized();
      
      // ✅ Setup page focus listener for smart refreshing (only when cache is stale)
      this.setupPageFocusListener();
    }
  }

  /**
   * ✅ NEW: Ensure user session is initialized (called once per login session)
   * This replaces the old startNotificationPolling approach
   */
  private async ensureUserSessionInitialized(): Promise<void> {
    try {
      // Check if session is already initialized for current user
      const isSessionInitialized = this.notificationService.isSessionInitialized();
      const currentUserId = this.authService.getUserId();
      const serviceUserId = this.notificationService.getCurrentUserId();
      
      // Only initialize if not already initialized for this user
      if (!isSessionInitialized || currentUserId !== serviceUserId) {
        await this.notificationService.initializeUserSession();
      }
    } catch (error) {
      // Error ensuring user session initialized
    }
  }

  /**
   * ✅ OPTIMIZED: Refresh notifications only when user returns to the page AND cache is stale
   * This ensures users see new notifications without constant API calls
   */
  @HostListener('window:focus', [])
  onPageFocus(): void {
    if (this.isLoggedIn()) {
      // This will only refresh if cache is stale (older than 5 minutes)
      this.notificationService.refreshOnEvent('focus');
    }
  }

  /**
   * Setup smart page focus handling
   */
  private setupPageFocusListener(): void {
    // Additional focus handling can be added here if needed
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.isSubscribed = false; // Reset subscription flag
  }

  private subscribeToNotifications(): void {
    // Subscribe to notifications
    this.notificationService.notifications$
      .pipe(takeUntil(this.destroy$))
      .subscribe(notifications => {
        this.notifications = notifications || [];
      });

    // Subscribe to unseen count
    this.notificationService.unseenCount$
      .pipe(takeUntil(this.destroy$))
      .subscribe(count => {
        const previousCount = this.unseenCount;
        this.unseenCount = count || 0;
      });

    // Subscribe to loading state
    this.notificationService.loading$
      .pipe(takeUntil(this.destroy$))
      .subscribe(loading => {
        this.loading = loading || false;
      });
  }

  /**
   * ✅ OPTIMIZED: Smart dropdown toggle with session-aware loading
   */
  async toggleNotificationDropdown(): Promise<void> {
    this.isNotificationDropdownOpen = !this.isNotificationDropdownOpen;
    
    // ✅ Only ensure notifications are loaded when opening dropdown
    if (this.isNotificationDropdownOpen) {
      try {
        // First ensure session is initialized
        await this.ensureUserSessionInitialized();
        
        // Uses cache-first approach - only fetches if cache is empty or stale (5+ minutes old)
        await this.notificationService.ensureNotificationsLoaded();
      } catch (error) {
        // Error ensuring notifications are loaded
      }
    }
  }

  closeNotificationDropdown(): void {
    this.isNotificationDropdownOpen = false;
  }

  async markAsSeen(notification: NotificationDto): Promise<void> {
    if (!notification.isSeen) {
      try {
        const notificationId = notification.notificationId || notification.id;
        if (notificationId) {
          await this.notificationService.markAsSeen(notificationId);
        }
      } catch (error) {
        // Error marking notification as seen
      }
    }
    
    // Handle notification click - you can add navigation logic here
    this.handleNotificationClick(notification);
  }

  /**
   * Handle notification click
   */
  private handleNotificationClick(notification: NotificationDto): void {
    // Close the dropdown
    this.closeNotificationDropdown();
    
    // You can add navigation logic based on notification type
    // For example, navigate to specific pages based on workFlowStepsId
    if (notification.workFlowStepsId) {
      // Navigate based on workflow step
      // this.router.navigate(['/service-details', notification.workFlowStepsId]);
    }
    
    // Show a toast message for now
    this.toastr.info(
      `Notification: ${this.getNotificationTitle(notification)}`,
      'Notification Clicked'
    );
  }

  async markAllAsSeen(): Promise<void> {
    if (!this.notifications) {
      return;
    }
    
    const unseenNotifications = this.notifications.filter(n => !n.isSeen);
    
    for (const notification of unseenNotifications) {
      try {
        const notificationId = notification.notificationId || notification.id;
        if (notificationId) {
          await this.notificationService.markAsSeen(notificationId);
        }
      } catch (error) {
        // Error marking notification as seen
      }
    }
  }

  /**
   * ✅ OPTIMIZED: Manual refresh triggered by user action (bypasses cache)
   */
  async refreshNotifications(): Promise<void> {
    try {
      // Force refresh regardless of cache status
      await this.notificationService.refreshNotifications();
    } catch (error) {
      // Error refreshing notifications
    }
  }

  getNotificationTitle(notification: NotificationDto): string {
    // Return Arabic or English title based on current language
    const currentLang = localStorage.getItem('currentLang') || 'en';
    return currentLang === 'ar' ? notification.titleAr : notification.titleEn;
  }

  getNotificationMessage(notification: NotificationDto): string {
    // Return Arabic or English message based on current language
    const currentLang = localStorage.getItem('currentLang') || 'en';
    const message = currentLang === 'ar' ? notification.messageAr : notification.messageEn;
    return message || '';
  }

  formatDate(date: Date | string): string {
    const now = new Date();
    const notificationDate = new Date(date);
    const diffInMs = now.getTime() - notificationDate.getTime();
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInMinutes < 1) {
      return 'Just now';
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes} minutes ago`;
    } else if (diffInHours < 24) {
      return `${diffInHours} hours ago`;
    } else if (diffInDays < 7) {
      return `${diffInDays} days ago`;
    } else {
      return notificationDate.toLocaleDateString();
    }
  }

  trackByNotificationId(index: number, notification: NotificationDto): string {
    return notification.notificationId || notification.id || `notification-${index}`;
  }

  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    const notificationContainer = target.closest('.notification-container');
    
    // Close dropdown if clicking outside the notification container
    if (!notificationContainer && this.isNotificationDropdownOpen) {
      this.closeNotificationDropdown();
    }
  }

  /**
   * Handle "View All" notifications button click
   */
  onViewAllNotifications(): void {
    // Close the dropdown
    this.closeNotificationDropdown();
    
    // Navigate to a notifications page or show all notifications
    // You can implement this based on your routing structure
    this.router.navigate(['/notifications']);
    
    // Alternative: Show a toast message if no dedicated page exists
    // this.toastr.info('Viewing all notifications', 'Notifications');
  }

  toggleLang() {
    this.translation.toggleLanguage();
  }

}
