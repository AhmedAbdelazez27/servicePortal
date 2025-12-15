import { Component, OnInit, OnDestroy, HostListener, ViewChild, ElementRef } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { UserService } from '../../../core/services/user.service';
import { AttachmentService } from '../../../core/services/attachments/attachment.service';
import { ToastrService } from 'ngx-toastr';
import { TranslateService, TranslateModule } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TranslationService } from '../../../core/services/translation.service';
import { NotificationService } from '../../../core/services/notification.service';
import { NotificationDto, CreateNotificationDto, CreateDepartmentNotificationDto, SendNotificationToDepartmentDto } from '../../../core/dtos/notifications/notification.dto';
import { AttachmentsConfigType } from '../../../core/dtos/attachments/attachments-config.dto';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { ApiEndpoints } from '../../../core/constants/api-endpoints';

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
  currentUserName: string = '';
  profilePhotoUrl: string = 'assets/images/profile-img.png'; // Default profile image
  private userData: any = null;
  private destroy$ = new Subject<void>();
  private isSubscribed = false; // Prevent duplicate subscriptions



  constructor(
    private authService: AuthService,
    private userService: UserService,
    private attachmentService: AttachmentService,
    private toastr: ToastrService,
    private translate: TranslateService,
    private router: Router,
    private notificationService: NotificationService,
    public translation: TranslationService
  ) {
    this.currentLang = this.translate.currentLang || this.translate.getDefaultLang() || 'ar';

    this.translate.onLangChange.subscribe(lang => {
      this.currentLang = lang.lang;
      // Reload user name when language changes
      if (this.isLoggedIn()) {
        this.loadCurrentUserName();
      }
    });
  }

  isLoggedIn(): boolean {
    // snapshot بيتحدّث من الـ AuthService بعد hydrate + أي setProfile
    return !!this.authService.snapshot?.userId || this.authService.isLoggedIn();
  }

  loadCurrentUserName(): void {
    const currentUser = this.authService.getCurrentUser();
    if (currentUser?.id) {
      if (this.userData) {
        this.updateUserNameBasedOnLanguage(this.userData);
        this.loadProfilePhoto(this.userData);
        return;
      }
      this.userService.getUserProfileById().subscribe({
        next: (userData) => {
          if (userData) {
            this.userData = userData;
            this.updateUserNameBasedOnLanguage(userData);
            this.loadProfilePhoto(userData);
          } else {
            this.currentUserName = currentUser.name || 'User';
          }
        },
        error: () => {
          this.currentUserName = currentUser.name || 'User';
        }
      });
    } else {
      this.currentUserName = 'User';
    }
  }


  /**
   * Public method to refresh user data (useful after profile updates)
   */
  refreshUserData(): void {
    this.userData = null; // Clear cache to force refresh
    this.loadCurrentUserName();
  }

  /**
   * Public method to refresh only the profile photo (lighter than full refresh)
   */
  refreshProfilePhoto(): void {
    // Clear user data cache to force reload from server
    this.userData = null;
    // Reload user data which will update the profile photo
    this.loadCurrentUserName();
  }

  private updateUserNameBasedOnLanguage(userData: any): void {
    const currentLang = this.currentLang || 'en';
    if (currentLang === 'ar' && userData.name) {
      this.currentUserName = userData.name; // Arabic name
    } else if (currentLang === 'en' && userData.nameEn) {
      this.currentUserName = userData.nameEn; // English name
    } else {
      // Fallback to available name
      this.currentUserName = userData.nameEn || userData.name || 'User';
    }
  }

  private loadProfilePhoto(userData: any): void {

    // First check if attachments are in user data
    if (userData.attachments && userData.attachments.length > 0) {
      this.findProfilePhotoInAttachments(userData.attachments, userData.userType || userData.lkpUserTypeId);
    } else if (userData.masterId) {
      this.loadProfilePhotoFromService(userData);
    } else {
    }
  }

  private findProfilePhotoInAttachments(attachments: any[], userType: number): void {
    
    let profilePhotoAttachment;

    // if (userType === 1 || userType === 3) {
    //   // Individual user
    //   profilePhotoAttachment = attachments.find((att: any) => att.attConfigID === 7);
    // } else if (userType === 2) {
    //   // Institution user
    //   profilePhotoAttachment = attachments.find((att: any) => att.attConfigID === 2014);
    // }
profilePhotoAttachment = attachments.find((att: any) => att.masterType == 1009);
    // If found, construct the image URL
    if (profilePhotoAttachment && profilePhotoAttachment.imgPath) {
      this.profilePhotoUrl = this.constructImageUrl(profilePhotoAttachment.imgPath);
    } else {
    }
  }

  private loadProfilePhotoFromService(userData: any): void {
    const userType = userData.userType || userData.lkpUserTypeId;
    const masterId = userData.masterId;

    if (!masterId) {
      return;
    }

    const masterType = userType === 2
      ? AttachmentsConfigType.FillInstitutionRegistrationData
      : AttachmentsConfigType.FillOutPublicLoginData;

    this.attachmentService.getListByMasterId(masterId, masterType).subscribe({
      next: (attachments) => {
        if (attachments && attachments.length > 0) {
          this.findProfilePhotoInAttachments(attachments, userType);
        } else {
        }
      },
      error: (error) => {
        error: () => {}
      }
    });
  }

  private constructImageUrl(imgPath: string): string {
    if (!imgPath) return 'assets/images/profile-img.png';

    // If it's already a full URL, return it directly
    if (imgPath.startsWith('http://') || imgPath.startsWith('https://')) {
      return `${imgPath}?t=${Date.now()}`;
    }

    // Handle relative paths
    const cleanPath = imgPath.startsWith('/') ? imgPath.substring(1) : imgPath;

    // Import environment at runtime
    const baseUrl = this.getBaseUrl(cleanPath);
    return `${baseUrl}/${cleanPath}?t=${Date.now()}`;
  }

  private getBaseUrl(path: string): string {
    const apiBaseUrl = environment.apiBaseUrl;

    if (path.startsWith('Uploads/')) {
      return apiBaseUrl.replace('/api', '');
    }
    return apiBaseUrl;
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

  // onLogout(): void {
  //   // Clear notifications when logging out
  //   this.notificationService.clearNotifications();
  //   this.isNotificationDropdownOpen = false;
  //   this.isSubscribed = false; // Reset subscription flag

  //   // Clear cached user data
  //   this.userData = null;
  //   this.currentUserName = '';

  //   this.authService.logout();
  //   this.toastr.success(
  //     this.translate.instant('AUTH.MESSAGES.LOGOUT_SUCCESS'),
  //     this.translate.instant('TOAST.TITLE.SUCCESS')
  //   );
  // }
  onLogout(): void {

    this.notificationService.clearNotifications();
    this.isNotificationDropdownOpen = false;
    this.isSubscribed = false;
    this.userData = null;
    this.currentUserName = '';

    this.authService.logout().subscribe({
      next: (res) => {
        this.toastr.success(res);
        this.redirectToLogout();
      },
      error: () => {
        this.redirectToLogout();
      },
      complete: () => {
        this.toastr.success(
          this.translate.instant('AUTH.MESSAGES.LOGOUT_SUCCESS'),
          this.translate.instant('TOAST.TITLE.SUCCESS')
        );
        this.redirectToLogout();
        this.router.navigate(['/login']);
      }
    });
  }
  private redirectToLogout(): void {
    const redirectUri = window.location.origin + '/login';
    const logoutURL = `${ApiEndpoints.UAE_PASS_CONFIG.baseUrl}/logout?redirect_uri=${encodeURIComponent(redirectUri)}`;
    setTimeout(() => (window.location.href = logoutURL), 2000);
  }


  onLogin(): void {
    this.router.navigate(['/login']);
  }

  // ngOnInit(): void {
  //   if (this.isLoggedIn()) {
  //     // Get current user's name and photo
  //     this.loadCurrentUserName();

  //     // Only subscribe to notifications if not already subscribed
  //     if (!this.isSubscribed) {
  //       this.subscribeToNotifications();
  //       this.isSubscribed = true;
  //     }

  //     // ✅ NEW OPTIMIZED APPROACH: Session-based initialization
  //     // This will only initialize once per user session, not on every page navigation
  //     this.ensureUserSessionInitialized();

  //     // ✅ Setup page focus listener for smart refreshing (only when cache is stale)
  //     this.setupPageFocusListener();

  //     // ✅ Listen for router events to refresh profile photo after edit
  //     this.router.events.pipe(takeUntil(this.destroy$)).subscribe((event) => {
  //       if (event.constructor.name === 'NavigationEnd') {
  //         // Refresh user data when navigating away from edit profile
  //         const url = this.router.url;
  //         if (this.userData && !url.includes('/edit-profile') && !url.includes('/login')) {
  //           // Refresh to get latest profile photo
  //           this.refreshUserData();
  //         }
  //       }
  //     });
  //   }
  // }
  ngOnInit(): void {
    // متابعة حالة الأوث
    this.authService.user$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        if (user?.userId) {
          // لوجين
          this.loadCurrentUserName();
          if (!this.isSubscribed) {
            this.subscribeToNotifications();
            this.isSubscribed = true;
          }
          this.ensureUserSessionInitialized();
          this.setupPageFocusListener();
        } else {
          // لاوج‌آوت
          this.notifications = [];
          this.unseenCount = 0;
          this.isNotificationDropdownOpen = false;
          this.isSubscribed = false;
          this.userData = null;
          this.currentUserName = '';
        }
      });

    // لو عايز تحافظ على لغة الواجهة نفس القديم:
    if (this.isLoggedIn()) {
      this.loadCurrentUserName();
    }

    // لغة الواجهة (نفس منطقك)
    this.translate.onLangChange
      .pipe(takeUntil(this.destroy$))
      .subscribe(lang => {
        this.currentLang = lang.lang;
        if (this.isLoggedIn()) {
          this.loadCurrentUserName();
        }
      });

    // Listen for profile photo updates
    this.userService.profilePhotoUpdated$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        // Refresh profile photo when updated from edit profile page
        this.refreshProfilePhoto();
      });
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
   * Handle notification click with smart navigation and detailed toast message
   */
  private handleNotificationClick(notification: NotificationDto): void {
    
    // Close the dropdown
    this.closeNotificationDropdown();

    const currentLang = localStorage.getItem('lang') || 'en';
    const title = this.getNotificationTitle(notification);
    const message = this.getNotificationMessage(notification);
    
    // Build detailed toast message
    let toastMessage = message || title;
    
    // Add service status if available
    if (notification.serviceStatusName) {
      const statusLabel = currentLang === 'ar' ? 'الحالة: ' : 'Status: ';
      toastMessage += `\n${statusLabel}${notification.serviceStatusName}`;
    }
    
    // Add formatted date
    if (notification.notificationDate) {
      const dateLabel = currentLang === 'ar' ? 'التاريخ: ' : 'Date: ';
      const formattedDate = this.formatDate(notification.notificationDate);
      toastMessage += `\n${dateLabel}${formattedDate}`;
    }

    // Show toast with title and detailed message
    this.toastr.info(
      toastMessage,
      title || (currentLang === 'ar' ? 'إشعار جديد' : 'New Notification'),
      {
        timeOut: 5000,
        enableHtml: false,
        closeButton: true
      }
    );

    // Smart navigation based on available data
    this.navigateToNotificationTarget(notification);
  }

  /**
   * Navigate to the appropriate page based on notification data
   */
  private navigateToNotificationTarget(notification: NotificationDto): void {
    // Priority 1: Use direct link if available
    if (notification.link) {
      if (notification.link.startsWith('http://') || notification.link.startsWith('https://')) {
        window.open(notification.link, '_blank');
      } else {
        this.router.navigate([notification.link]);
      }
      return;
    }

    // Priority 2: Navigate to request page if registerId is available
    if (notification.registerId) {
      // Navigate to the main requests page where user can see their requests
      this.router.navigate(['/request']);
      return;
    }

    // Priority 3: Navigate based on workflow step if available
    if (notification.workFlowStepsId) {
      // You can add specific navigation logic here based on workflow step
      // For now, navigate to requests page
      this.router.navigate(['/request']);
      return;
    }

    // If no navigation data available, user stays on current page
    // The toast message already provides the information
  }

// async markAllAsSeen(): Promise<void> {
//     if (!this.notifications) {
//       return;
//     }

//     const unseenNotifications = this.notifications.filter(n => !n.isSeen);

//     for (const notification of unseenNotifications) {
//       try {
//         const notificationId = notification.notificationId || notification.id;
//         if (notificationId) {
//           await this.notificationService.markAsSeen(notificationId);
//         }
//       } catch (error) {
//         // Error marking notification as seen
//       }
//     }
//   }
  async markAllAsSeen() { 
    const isAr = (localStorage.getItem('lang') ?? 'en') === 'ar';
  try {
    await this.notificationService.markAllAsSeen();
    this.toastr.success(
  isAr ? 'تم تعليم جميع الإشعارات كمقروءة' : 'All notifications marked as seen'
);
  } catch (err) {
    this.toastr.error(
  isAr ? 'فشل في تعليم جميع الإشعارات' : 'Failed to mark all notifications'
);

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
    const currentLang = localStorage.getItem('lang') || 'en';
    return currentLang === 'ar' ? notification.titleAr : notification.titleEn;
  }

  getNotificationMessage(notification: NotificationDto): string {
    // Return Arabic or English message based on current language
    const currentLang = localStorage.getItem('lang') || 'en';
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

    const currentLang = localStorage.getItem('lang') || 'en';

    if (diffInMinutes < 1) {
      return currentLang === 'ar' ? 'الآن' : 'Just now';
    } else if (diffInMinutes < 60) {
      return currentLang === 'ar'
        ? `منذ ${diffInMinutes} دقيقة`
        : `${diffInMinutes} minutes ago`;
    } else if (diffInHours < 24) {
      return currentLang === 'ar'
        ? `منذ ${diffInHours} ساعة`
        : `${diffInHours} hours ago`;
    } else if (diffInDays < 7) {
      return currentLang === 'ar'
        ? `منذ ${diffInDays} يوم`
        : `${diffInDays} days ago`;
    } else {
      return notificationDate.toLocaleDateString(
        currentLang === 'ar' ? 'ar-EG' : 'en-US'
      );
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

  /**
   * Get truncated user name (first 5 characters) for navbar display
   */
  get truncatedUserName(): string {
    if (!this.currentUserName) return 'User';
    return this.currentUserName.length > 5 
      ? this.currentUserName.substring(0, 5) + '...' 
      : this.currentUserName;
  }

  @ViewChild('navbarCollapse') navbarCollapse!: ElementRef<HTMLDivElement>;

  closeNavbar() {
    if (window.innerWidth < 992 && this.navbarCollapse) {
      const el = this.navbarCollapse.nativeElement;
      if (!el.classList.contains('show')) return;


      const startHeight = el.scrollHeight;
      el.style.height = startHeight + 'px';
      el.style.overflow = 'hidden';
      el.style.transition = 'height 300ms ease';

      void el.offsetHeight;

      el.style.height = '0px';

      const onEnd = () => {
        el.style.removeProperty('height');
        el.style.removeProperty('overflow');
        el.style.removeProperty('transition');
        el.classList.remove('show');
        el.removeEventListener('transitionend', onEnd);
      };
      el.addEventListener('transitionend', onEnd);

      const toggler = document.querySelector<HTMLButtonElement>('.navbar-toggler[aria-controls="navbarSupportedContent"]');
      if (toggler) toggler.setAttribute('aria-expanded', 'false');
    }
  }


}
