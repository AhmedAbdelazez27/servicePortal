import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, combineLatest, interval, of } from 'rxjs';
import { switchMap, filter, catchError, startWith, distinctUntilChanged } from 'rxjs/operators';
import { FirebaseNotificationService } from './firebase/firebase-notification.service';
import { NotificationApiService } from './notification-api.service';
import { AuthService } from './auth.service';
import { ToastrService } from 'ngx-toastr';
import { ApiEndpoints } from '../constants/api-endpoints';
import { 
  NotificationDto, 
  UpdateFCMTokenDto, 
  GetAllNotificationRequestDto,
  PagedResultDto,
  CreateNotificationDto,
  CreateDepartmentNotificationDto,
  SendNotificationToDepartmentDto
} from '../dtos/notifications/notification.dto';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private notificationsSubject = new BehaviorSubject<NotificationDto[]>([]);
  private unseenCountSubject = new BehaviorSubject<number>(0);
  private loadingSubject = new BehaviorSubject<boolean>(false);
  private initializationCompleteSubject = new BehaviorSubject<boolean>(false);
  private sessionInitializedSubject = new BehaviorSubject<boolean>(false);
  private lastRefreshTime = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private currentUserId: string | null = null;
  private isSystemInitialized = false;
  private isFirstLoad = true; // Track if this is the first load of the session

  public notifications$ = this.notificationsSubject.asObservable();
  public unseenCount$ = this.unseenCountSubject.asObservable();
  public loading$ = this.loadingSubject.asObservable();
  public initialized$ = this.initializationCompleteSubject.asObservable();
  public sessionInitialized$ = this.sessionInitializedSubject.asObservable();

  constructor(
    private firebaseNotificationService: FirebaseNotificationService,
    private notificationApiService: NotificationApiService,
    private authService: AuthService,
    private toastr: ToastrService
  ) {
    // Initialize Firebase and setup listeners, but don't load user-specific data yet
    this.initializeFirebaseOnly();
  }

  /**
   * Initialize Firebase-only components (called once in constructor)
   */
  private async initializeFirebaseOnly(): Promise<void> {
    try {
      // Validate Firebase configuration first
      const configService = this.firebaseNotificationService['firebaseConfig'] as any;
      if (configService && typeof configService.validateConfig === 'function') {
        const isConfigValid = configService.validateConfig();
        if (!isConfigValid) {
          return;
        }
      }
      
      // Wait for Firebase initialization
      await this.firebaseNotificationService.initializeNotifications();
      
      // Setup Firebase message listener for real-time updates
      this.setupFirebaseMessageListener();
      
      this.initializationCompleteSubject.next(true);
      this.isSystemInitialized = true;
    } catch (error) {
      // Firebase initialization error
    }
  }

  /**
   * Initialize user session (called once per login session)
   */
  public async initializeUserSession(): Promise<void> {
    const userId = this.authService.getUserId();
    
    if (!userId) {
      return;
    }

    // Check if already initialized for this user
    if (this.sessionInitializedSubject.value && this.currentUserId === userId) {
      return;
    }

    try {
      this.currentUserId = userId;
      
      // Setup FCM token synchronization for this user
      this.setupFCMTokenSync();
      
      // Load initial notifications for this user
      await this.loadInitialNotifications();
      
      this.sessionInitializedSubject.next(true);
    } catch (error) {
      // User session initialization error
    }
  }

  /**
   * Setup FCM token synchronization with backend
   */
  private setupFCMTokenSync(): void {
    // Check if user is logged in first
    if (!this.authService.isLoggedIn()) {
      return;
    }

    const userId = this.authService.getUserId();
    
    if (!userId) {
      return;
    }

    // Subscribe to FCM token changes with enhanced validation
    this.firebaseNotificationService.getFCMTokenObservable().subscribe(token => {
      if (token) {
        this.syncFCMTokenWithBackend(userId, token);
      } else {
        // Token is null - might need renewal
        this.handleTokenRenewal(userId);
      }
    });

    // Setup periodic token validation
    this.setupPeriodicTokenValidation(userId);
  }

  /**
   * Handle token renewal when needed
   */
  private async handleTokenRenewal(userId: string): Promise<void> {
    try {
      const newToken = await this.firebaseNotificationService.refreshToken();
      
      if (newToken) {
        await this.syncFCMTokenWithBackend(userId, newToken);
      }
    } catch (error) {
      // Token renewal error
    }
  }

  /**
   * Setup periodic token validation for long-running sessions
   */
  private setupPeriodicTokenValidation(userId: string): void {
    // Check token validity every 6 hours
    setInterval(async () => {
      try {
        const tokenInfo = this.firebaseNotificationService.getTokenLifecycleInfo();
        
        if (tokenInfo.isStale || tokenInfo.isExpired) {
          await this.handleTokenRenewal(userId);
        } else if (!tokenInfo.currentToken) {
          await this.handleTokenRenewal(userId);
        }
      } catch (error) {
        // Periodic token validation error
      }
    }, 6 * 60 * 60 * 1000); // 6 hours
  }

  /**
   * Setup Firebase message listener for real-time notification updates
   */
  private setupFirebaseMessageListener(): void {
    this.firebaseNotificationService.getNotificationObservable().subscribe(payload => {
      if (payload) {
        this.handleNewFirebaseMessage(payload);
      }
    });
  }

  /**
   * Handle new Firebase message and update notifications
   */
  private handleNewFirebaseMessage(payload: any): void {
    // Extract notification data from Firebase payload
    const notificationData = payload.data || payload.notification;
    if (notificationData) {
      // Create a notification object from Firebase data
      const newNotification: NotificationDto = {
        notificationId: notificationData.notificationId || notificationData.id || Date.now().toString(),
        titleAr: notificationData.titleAr || payload.notification?.title || 'إشعار جديد',
        titleEn: notificationData.titleEn || payload.notification?.title || 'New Notification',
        messageAr: notificationData.messageAr || payload.notification?.body || '',
        messageEn: notificationData.messageEn || payload.notification?.body || '',
        isSeen: false,
        notificationDate: new Date().toISOString(),
        lastModify: new Date().toISOString(),
        // Add other required fields as needed
        id: notificationData.notificationId || notificationData.id || Date.now().toString(),
        workFlowStepsId: notificationData.workFlowStepsId || null
      };

      // Add to current notifications
      this.addNewNotification(newNotification);
      
      // Update unseen count
      this.incrementUnseenCount();
      
      // Always show toast notification for real-time Firebase messages
      // (regardless of first load status)
      this.showNotificationToast(newNotification);
    }
  }

  /**
   * Add new notification to the list
   */
  private addNewNotification(notification: NotificationDto): void {
    const currentNotifications = this.notificationsSubject.value || [];
    const updatedNotifications = [notification, ...currentNotifications];
    
    // Keep only the latest 30 notifications for navbar
    const limitedNotifications = updatedNotifications.slice(0, 30);
    
    this.notificationsSubject.next(limitedNotifications);
  }

  /**
   * Increment unseen count
   */
  private incrementUnseenCount(): void {
    const currentCount = this.unseenCountSubject.value || 0;
    this.unseenCountSubject.next(currentCount + 1);
  }

  /**
   * Show toast notification for new messages
   */
  private showNotificationToast(notification: NotificationDto): void {
    const title = this.getNotificationTitle(notification);
    const message = this.getNotificationMessage(notification);
    
    this.toastr.info(message, title, {
      timeOut: 5000,
      closeButton: true,
      progressBar: true,
      positionClass: 'toast-top-right'
    });
  }

  /**
   * Load initial notifications for user session
   */
  private async loadInitialNotifications(): Promise<void> {
    const userId = this.authService.getUserId();
    if (!userId) {
      return;
    }

    try {
      // Load navbar notifications (limited to 30) and unseen count in parallel
      await Promise.all([
        this.loadNavbarNotifications(userId).toPromise(),
        this.loadUnseenCount(userId).toPromise()
      ]);

      this.lastRefreshTime = Date.now();
      this.isFirstLoad = false; // Mark that initial load is complete
    } catch (error) {
      // Initial notifications loading error
    }
  }

  /**
   * DEPRECATED: Use initializeUserSession instead
   * This method is kept for backward compatibility but now delegates to session initialization
   */
  public startNotificationPolling(): void {
    this.initializeUserSession();
  }

  /**
   * Clear notifications (called when user logs out)
   */
  public clearNotifications(): void {
    this.notificationsSubject.next([]);
    this.unseenCountSubject.next(0);
    this.loadingSubject.next(false);
    this.sessionInitializedSubject.next(false);
    this.currentUserId = null;
    this.lastRefreshTime = 0;
    this.isFirstLoad = true; // Reset first load flag for next session
    // Note: Keep initializationCompleteSubject as true since Firebase is still initialized
  }

  /**
   * Refresh notifications on specific events (page focus, user action, etc.)
   * Now uses cache-first approach to avoid unnecessary API calls
   */
  public refreshOnEvent(eventType: 'focus' | 'userAction' | 'newMessage' = 'userAction'): void {
    const now = Date.now();
    const timeSinceLastRefresh = now - this.lastRefreshTime;
    
    // Only refresh if cache is stale (older than 5 minutes) or it's a new message
    if (eventType === 'newMessage' || timeSinceLastRefresh > this.CACHE_DURATION) {
      this.refreshNotifications();
      this.lastRefreshTime = now;
    }
  }

  /**
   * Ensure notifications are loaded with caching strategy
   * Only fetches if cache is empty or stale
   */
  async ensureNotificationsLoaded(): Promise<void> {
    const userId = this.authService.getUserId();
    if (!userId) {
      return;
    }

    const currentNotifications = this.notificationsSubject.value;
    const timeSinceLastRefresh = Date.now() - this.lastRefreshTime;
    const isStale = timeSinceLastRefresh > this.CACHE_DURATION;

    // Only fetch if cache is empty or stale
    if (!currentNotifications || currentNotifications.length === 0 || isStale) {
      await this.refreshNotifications();
      this.lastRefreshTime = Date.now();
    }
  }

  /**
   * Manual refresh of notifications
   */
  async refreshNotifications(): Promise<void> {
    const userId = this.authService.getUserId();
    if (userId) {
      this.loadingSubject.next(true);
      
      try {
        // Temporarily disable toast notifications for refresh
        const wasFirstLoad = this.isFirstLoad;
        this.isFirstLoad = true;
        
        await Promise.all([
          this.loadNavbarNotifications(userId).toPromise(),
          this.loadUnseenCount(userId).toPromise()
        ]);
        
        // Restore the original first load status
        this.isFirstLoad = wasFirstLoad;
        this.lastRefreshTime = Date.now();
      } catch (error) {
        // Refresh notifications error
      } finally {
        this.loadingSubject.next(false);
      }
    }
  }

  /**
   * Check for new notifications and show toast if any
   * Only shows toast for truly new notifications, not on page refresh
   */
  private checkForNewNotifications(currentNotifications: NotificationDto[]): void {
    // Don't show toast notifications on first load (page refresh/initial load)
    if (this.isFirstLoad) {
      return;
    }
    
    const previousNotifications = this.notificationsSubject.value || [];
    
    // Find new notifications (not in previous list)
    const newNotifications = currentNotifications.filter(current => 
      !previousNotifications.some(prev => 
        prev.notificationId === current.notificationId || prev.id === current.id
      )
    );
    
    // Show toast for each new notification
    if (newNotifications.length > 0) {
      // Play notification sound for new notifications
      this.playNotificationSound();
      
      newNotifications.forEach(notification => {
        const title = this.getNotificationTitle(notification);
        const message = this.getNotificationMessage(notification);
        
        this.toastr.info(message, title, {
          timeOut: 5000,
          closeButton: true,
          progressBar: true,
          positionClass: 'toast-top-right'
        });
      });
    }
  }

  /**
   * Get notification title based on current language
   */
  private getNotificationTitle(notification: NotificationDto): string {
    const currentLang = localStorage.getItem('lang') || 'en';
    return currentLang === 'ar' ? notification.titleAr : notification.titleEn;
  }

  /**
   * Get notification message based on current language
   */
  private getNotificationMessage(notification: NotificationDto): string {
    const currentLang = localStorage.getItem('lang') || 'en';
    const message = currentLang === 'ar' ? notification.messageAr : notification.messageEn;
    return message || '';
  }

  /**
   * Play notification sound
   */
  private playNotificationSound(): void {
    try {
      // Create audio element for notification sound
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT');
      audio.volume = 0.3;
      audio.play().catch(error => {
        // Could not play notification sound
      });
    } catch (error) {
      // Error playing notification sound
    }
  }

  /**
   * Load notifications from API
   */
  private loadNotifications(userId: string, skip: number = 0, take: number = 30): Observable<PagedResultDto<NotificationDto>> {
    this.loadingSubject.next(true);
    
    const request: GetAllNotificationRequestDto = {
      skip: skip,
      take: take
    };

    // Also try with registerId if userId doesn't work
    const requestWithRegisterId = {
      registerId: userId,
      skip: skip,
      take: take
    };

    // Try the original request first, if it fails, try with registerId
    return this.notificationApiService.getAllNotifications(request).pipe(
      switchMap(result => {
        // Handle both 'items' and 'data' properties from API response
        const notificationsArray = result?.data || (result as any)?.items || [];
        
        // Process notifications to ensure they have the correct structure
        const processedNotifications = notificationsArray.map((notification: any) => {
          // Ensure the notification has both notificationId and id for compatibility
          const notificationId = notification.notificationId || notification.id || '';
          return {
            ...notification,
            id: notificationId,
            notificationId: notificationId,
            // Ensure all required fields are present
            titleAr: notification.titleAr || '',
            titleEn: notification.titleEn || '',
            messageAr: notification.messageAr ?? null,
            messageEn: notification.messageEn ?? null,
            isSeen: notification.isSeen ?? false
          };
        });
        
        // Sort notifications by date (newest first) and take only the requested amount
        const sortedNotifications = processedNotifications
          .sort((a: any, b: any) => new Date(b.notificationDate).getTime() - new Date(a.notificationDate).getTime())
          .slice(0, take);
        
        // Check for new notifications and show toast (only for navbar notifications)
        if (take <= 30) {
          this.checkForNewNotifications(sortedNotifications);
        }
        
        // Emit notifications to subscribers
        this.notificationsSubject.next(sortedNotifications);
        
        this.loadingSubject.next(false);
        return [result];
      }),
      catchError(error => {
        // Try with registerId as fallback
        return this.notificationApiService.getAllNotifications({...requestWithRegisterId}).pipe(
          switchMap(result => {
            // Handle both 'items' and 'data' properties from API response
            const notificationsArray = result?.data || (result as any)?.items || [];
            const processedNotifications = notificationsArray.map((notification: any) => {
              const notificationId = notification.notificationId || notification.id || '';
              return {
                ...notification,
                id: notificationId,
                notificationId: notificationId,
                // Ensure all required fields are present
                titleAr: notification.titleAr || '',
                titleEn: notification.titleEn || '',
                messageAr: notification.messageAr ?? null,
                messageEn: notification.messageEn ?? null,
                isSeen: notification.isSeen ?? false
              };
            });
            
            const sortedNotifications = processedNotifications
              .sort((a: any, b: any) => new Date(b.notificationDate).getTime() - new Date(a.notificationDate).getTime())
              .slice(0, take);
            
            this.notificationsSubject.next(sortedNotifications);
            this.loadingSubject.next(false);
            return [result];
          }),
          catchError(secondError => {
            this.loadingSubject.next(false);
            this.notificationsSubject.next([]);
            return [];
          })
        );
      })
    );
  }

  /**
   * Load navbar notifications (limited to 30 for dropdown)
   */
  private loadNavbarNotifications(userId: string): Observable<PagedResultDto<NotificationDto>> {
    return this.loadNotifications(userId, 0, 30);
  }

  /**
   * Load paginated notifications for management table
   */
  private loadPaginatedNotifications(userId: string, skip: number, take: number, isSeen?: boolean): Observable<PagedResultDto<NotificationDto>> {
    this.loadingSubject.next(true);
    
    const request: GetAllNotificationRequestDto = {
      isSeen: isSeen,
      skip: skip,
      take: take
    };

    return this.notificationApiService.getAllNotifications(request).pipe(
      switchMap(result => {
        // Process notifications to ensure they have the correct structure
        const processedNotifications = (result.data || []).map((notification: any) => {
          const notificationId = notification.notificationId || notification.id || '';
          return {
            ...notification,
            id: notificationId,
            notificationId: notificationId,
            // Ensure all required fields are present
            titleAr: notification.titleAr || '',
            titleEn: notification.titleEn || '',
            messageAr: notification.messageAr ?? null,
            messageEn: notification.messageEn ?? null,
            isSeen: notification.isSeen ?? false
          };
        });

        const paginatedResult: PagedResultDto<NotificationDto> = {
          totalCount: result.totalCount || 0,
          data: processedNotifications
        };

        this.loadingSubject.next(false);
        return [paginatedResult];
      }),
      catchError(error => {
        this.loadingSubject.next(false);
        const emptyResult: PagedResultDto<NotificationDto> = {
          totalCount: 0,
          data: []
        };
        return [emptyResult];
      })
    );
  }

  /**
   * Load unseen notifications count
   */
  private loadUnseenCount(userId: string): Observable<number> {
    return this.notificationApiService.getUnseenNotificationsCount().pipe(
      switchMap(count => {
        this.unseenCountSubject.next(count || 0);
        return [count || 0];
      }),
      catchError(error => {
        this.unseenCountSubject.next(0);
        return [0];
      })
    );
  }

  /**
   * Mark notification as seen
   */
  async markAsSeen(notificationId: string): Promise<void> {
    try {
      await this.notificationApiService.markNotificationAsSeen(notificationId).toPromise();
      
      // Update local state
      const currentNotifications = this.notificationsSubject.value || [];
      const updatedNotifications = currentNotifications.map(notification => 
        (notification.id === notificationId || notification.notificationId === notificationId)
          ? { ...notification, isSeen: true }
          : notification
      );
      this.notificationsSubject.next(updatedNotifications);
      
      // Update unseen count
      const userId = this.authService.getUserId();
      if (userId) {
        this.loadUnseenCount(userId).subscribe({
          next: (count) => {
            // Unseen count updated
          },
          error: (error) => {
            // Error updating unseen count
          }
        });
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get current notifications (last 30) - with debugging
   */
  getCurrentNotifications(): NotificationDto[] {
    const current = this.notificationsSubject.value;
    return current;
  }

  /**
   * Load navbar notifications (public method for components)
   */
  loadNavbarNotificationsForComponent(): Observable<PagedResultDto<NotificationDto>> {
    const userId = this.authService.getUserId();
    if (!userId) {
      const emptyResult: PagedResultDto<NotificationDto> = {
        totalCount: 0,
        data: []
      };
      return of(emptyResult);
    }
    return this.loadNavbarNotifications(userId);
  }

  /**
   * Get all notifications (for view all page)
   */
  async getAllNotifications(userId?: string): Promise<NotificationDto[]> {
    const targetUserId = userId || this.authService.getUserId();
    if (!targetUserId) {
      return [];
    }

    const request: GetAllNotificationRequestDto = {
      skip: 0,
      take: 100 // Get more notifications for the view all page
    };

    try {
      const result = await this.notificationApiService.getAllNotifications(request).toPromise();
      // Handle both 'items' and 'data' properties from API response
      const notificationsArray = result?.data || (result as any)?.data || [];
      return notificationsArray
        .sort((a: any, b: any) => new Date(b.notificationDate).getTime() - new Date(a.notificationDate).getTime());
    } catch (error) {
      return [];
    }
  }

  /**
   * Get paginated notifications for management table
   */
  getPaginatedNotifications(userId: string, skip: number, take: number, isSeen?: boolean): Observable<PagedResultDto<NotificationDto>> {
    return this.loadPaginatedNotifications(userId, skip, take, isSeen);
  }

  /**
   * Get current unseen count
   */
  getCurrentUnseenCount(): number {
    return this.unseenCountSubject.value;
  }

  /**
   * Sync FCM token with backend
   */
  private async syncFCMTokenWithBackend(userId: string, token: string): Promise<void> {
    try {
      const updateData: UpdateFCMTokenDto = {
        fcmToken: token,
        userId: userId
      };
      await this.notificationApiService.updateFCMToken(updateData).toPromise();
    } catch (error) {
      // Error syncing FCM token with backend
    }
  }

  /**
   * Request notification permission
   */
  async requestPermission(): Promise<boolean> {
    return await this.firebaseNotificationService.requestPermission();
  }

  /**
   * Check if notifications are enabled
   */
  isNotificationEnabled(): boolean {
    return this.firebaseNotificationService.isPermissionGranted();
  }

  /**
   * Get FCM token
   */
  getFCMToken(): string | null {
    return this.firebaseNotificationService.getCurrentFCMToken();
  }

  /**
   * Check if Firebase components are initialized
   */
  isInitialized(): boolean {
    return this.initializationCompleteSubject.value;
  }

  /**
   * Check if user session is initialized
   */
  isSessionInitialized(): boolean {
    return this.sessionInitializedSubject.value;
  }

  /**
   * Get current user session status
   */
  getCurrentUserId(): string | null {
    return this.currentUserId;
  }

  /**
   * Manually trigger FCM token sync (for debugging)
   */
  async manuallyTriggerFCMTokenSync(): Promise<void> {
    const userId = this.authService.getUserId();
    if (!userId) {
      return;
    }

    const fcmToken = this.firebaseNotificationService.getCurrentFCMToken();
    if (!fcmToken) {
      const newToken = await this.firebaseNotificationService.refreshToken();
      if (!newToken) {
        return;
      }
    }

    const tokenToUse = fcmToken || await this.firebaseNotificationService.refreshToken();
    if (!tokenToUse) {
      return;
    }

    try {
      const updateData: UpdateFCMTokenDto = {
        fcmToken: tokenToUse,
        userId: userId
      };
      
      await this.notificationApiService.updateFCMToken(updateData).toPromise();
    } catch (error) {
      // Manual FCM token sync failed
    }
  }

  /**
   * Force refresh FCM token (bypasses frequency limits)
   */
  async forceRefreshFCMToken(): Promise<void> {
    const userId = this.authService.getUserId();
    if (!userId) {
      return;
    }

    try {
      const newToken = await this.firebaseNotificationService.forceRefreshToken();
      
      if (newToken) {
        await this.syncFCMTokenWithBackend(userId, newToken);
      }
    } catch (error) {
      // Error during force token refresh
    }
  }

  /**
   * Get token lifecycle information for debugging
   */
  getTokenLifecycleInfo(): any {
    return this.firebaseNotificationService.getTokenLifecycleInfo();
  }

  /**
   * Create a new notification
   */
  async createNotification(notification: CreateNotificationDto): Promise<NotificationDto> {
    try {
      const result = await this.notificationApiService.createNotification(notification).toPromise();
      // Refresh notifications after creating
      await this.refreshNotifications();
      return result!;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Send notification to department
   */
  async sendNotificationToDepartment(notification: CreateDepartmentNotificationDto): Promise<NotificationDto[]> {
    try {
      const result = await this.notificationApiService.sendNotificationToDepartment(notification).toPromise();
      return result!;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Send service notification to department
   */
  async sendServiceNotificationToDepartment(notification: SendNotificationToDepartmentDto): Promise<NotificationDto[]> {
    try {
      const result = await this.notificationApiService.sendServiceNotificationToDepartment(notification).toPromise();
      return result!;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get notification by ID
   */
  async getNotificationById(id: string): Promise<NotificationDto> {
    try {
      const result = await this.notificationApiService.getNotificationById(id).toPromise();
      return result!;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Enable toast notifications for testing purposes
   * This method can be called to re-enable toast notifications after first load
   */
  enableToastNotifications(): void {
    this.isFirstLoad = false;
  }

  /**
   * Disable toast notifications (for testing purposes)
   */
  disableToastNotifications(): void {
    this.isFirstLoad = true;
  }

  /**
   * Check if toast notifications are currently enabled
   */
  areToastNotificationsEnabled(): boolean {
    return !this.isFirstLoad;
  }
}
