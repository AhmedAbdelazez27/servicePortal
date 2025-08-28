import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, fromEvent, merge, interval } from 'rxjs';
import { getToken, onMessage, MessagePayload } from 'firebase/messaging';
import { FirebaseConfigService } from './firebase-config.service';
import { NotificationDto } from '../../dtos/notifications/notification.dto';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class FirebaseNotificationService {
  private fcmTokenSubject = new BehaviorSubject<string | null>(null);
  private notificationSubject = new BehaviorSubject<MessagePayload | null>(null);
  private permissionGranted = false;
  private lastTokenRefreshTime = 0;
  private tokenCreationTime = 0;
  private isTokenRefreshInProgress = false;

  // Token lifecycle constants based on Firebase documentation
  private readonly TOKEN_REFRESH_INTERVAL = 30 * 24 * 60 * 60 * 1000; // 30 days (monthly)
  private readonly STALE_TOKEN_THRESHOLD = 30 * 24 * 60 * 60 * 1000; // 30 days (stale threshold)
  private readonly EXPIRED_TOKEN_THRESHOLD = 270 * 24 * 60 * 60 * 1000; // 270 days (expired threshold)
  private readonly MIN_REFRESH_INTERVAL = 60 * 1000; // 1 minute minimum between refreshes
  private readonly PERMISSION_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes
  private readonly SERVICE_WORKER_CHECK_INTERVAL = 10 * 60 * 1000; // 10 minutes

  constructor(private firebaseConfig: FirebaseConfigService) {
    this.initializeNotifications();
  }

  /**
   * Initialize Firebase notifications and request permission
   */
  async initializeNotifications(): Promise<void> {
    try {
      // Check if we're in a secure context (HTTPS or localhost)
      if (!window.isSecureContext) {
        return;
      }
      
      // Check if service worker is supported
      if (!('serviceWorker' in navigator)) {
        return;
      }
      
      await this.requestPermission();
      
      if (this.permissionGranted) {
        await this.getFCMToken();
        this.setupMessageListener();
        this.setupTokenRefreshListeners();
      }
    } catch (error) {
      // Firebase initialization error
    }
  }

  /**
   * Setup comprehensive token refresh listeners according to Firebase documentation
   */
  private setupTokenRefreshListeners(): void {
    // 1. Monthly periodic token refresh (Firebase recommendation)
    this.setupPeriodicTokenRefresh();
    
    // 2. Listen for permission changes
    this.setupPermissionChangeListener();
    
    // 3. Listen for service worker updates
    this.setupServiceWorkerUpdateListener();
    
    // 4. Listen for app focus/visibility changes
    this.setupAppFocusListener();
    
    // 5. Listen for network reconnection
    this.setupNetworkReconnectionListener();
    
    // 6. Listen for Firebase token refresh events
    this.setupFirebaseTokenRefreshListener();
    
    // 7. Setup stale token detection
    this.setupStaleTokenDetection();
  }

  /**
   * Setup monthly periodic token refresh (Firebase recommendation)
   */
  private setupPeriodicTokenRefresh(): void {
    interval(this.TOKEN_REFRESH_INTERVAL).subscribe(() => {
      this.refreshToken();
    });
  }

  /**
   * Listen for notification permission changes
   */
  private setupPermissionChangeListener(): void {
    interval(this.PERMISSION_CHECK_INTERVAL).subscribe(() => {
      const currentPermission = Notification.permission === 'granted';
      if (currentPermission !== this.permissionGranted) {
        this.permissionGranted = currentPermission;
        if (currentPermission) {
          this.refreshToken();
        } else {
          // Clear token if permission revoked
          this.fcmTokenSubject.next(null);
        }
      }
    });
  }

  /**
   * Listen for service worker updates
   */
  private setupServiceWorkerUpdateListener(): void {
    if ('serviceWorker' in navigator) {
      // Listen for controller change
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        this.refreshToken();
      });

      // Check for waiting service worker updates
      interval(this.SERVICE_WORKER_CHECK_INTERVAL).subscribe(async () => {
        try {
          const registration = await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js');
          if (registration && registration.waiting) {
            this.refreshToken();
          }
        } catch (error) {
          // Error checking service worker updates
        }
      });
    }
  }

  /**
   * Listen for app focus/visibility changes
   */
  private setupAppFocusListener(): void {
    // Listen for page focus
    fromEvent(window, 'focus').subscribe(() => {
      this.checkTokenValidity();
    });

    // Listen for visibility changes
    fromEvent(document, 'visibilitychange').subscribe(() => {
      if (!document.hidden) {
        this.checkTokenValidity();
      }
    });
  }

  /**
   * Listen for network reconnection
   */
  private setupNetworkReconnectionListener(): void {
    // Listen for online/offline events
    merge(
      fromEvent(window, 'online'),
      fromEvent(window, 'offline')
    ).subscribe((event) => {
      if (event.type === 'online') {
        this.refreshToken();
      }
    });
  }

  /**
   * Listen for Firebase token refresh events
   * Note: onTokenRefresh is not available in current Firebase SDK
   * Token refresh is handled through other mechanisms
   */
  private setupFirebaseTokenRefreshListener(): void {
    // Firebase SDK doesn't provide onTokenRefresh for web
    // Token refresh is handled through periodic checks and other events
  }

  /**
   * Setup stale token detection according to Firebase documentation
   */
  private setupStaleTokenDetection(): void {
    // Check for stale tokens every day
    interval(24 * 60 * 60 * 1000).subscribe(() => {
      this.checkForStaleToken();
    });
  }

  /**
   * Check if current token is stale (inactive for over a month)
   */
  private checkForStaleToken(): void {
    const currentTime = Date.now();
    const timeSinceTokenCreation = currentTime - this.tokenCreationTime;
    
    if (timeSinceTokenCreation > this.STALE_TOKEN_THRESHOLD) {
      this.refreshToken();
    } else if (timeSinceTokenCreation > this.EXPIRED_TOKEN_THRESHOLD) {
      this.refreshToken();
    }
  }

  /**
   * Check token validity and refresh if needed
   */
  private async checkTokenValidity(): Promise<void> {
    const currentTime = Date.now();
    const timeSinceLastRefresh = currentTime - this.lastTokenRefreshTime;
    
    // Don't refresh too frequently
    if (timeSinceLastRefresh < this.MIN_REFRESH_INTERVAL) {
      return;
    }
    
    // Check if token exists and is not stale
    const currentToken = this.fcmTokenSubject.value;
    if (!currentToken) {
      await this.refreshToken();
      return;
    }
    
    // Check if token is stale
    const timeSinceTokenCreation = currentTime - this.tokenCreationTime;
    if (timeSinceTokenCreation > this.STALE_TOKEN_THRESHOLD) {
      await this.refreshToken();
    }
  }

  /**
   * Request notification permission from user
   */
  async requestPermission(): Promise<boolean> {
    try {
      // Check if notifications are supported
      if (!('Notification' in window)) {
        return false;
      }

      // Check current permission status
      if (Notification.permission === 'granted') {
        this.permissionGranted = true;
        return true;
      }

      // Request permission if not already decided
      if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        this.permissionGranted = permission === 'granted';
      } else {
        this.permissionGranted = false;
      }
      
      return this.permissionGranted;
    } catch (error) {
      this.permissionGranted = false;
      return false;
    }
  }

  /**
   * Get FCM token for this device
   */
  async getFCMToken(): Promise<string | null> {
    try {
      if (!this.permissionGranted) {
        return null;
      }

      const messaging = this.firebaseConfig.getMessaging();
      
      // Check if VAPID key is configured
      if (!environment.firebase.vapidKey) {
        return null;
      }
      
      // Check if service worker is registered
      const registration = await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js');
      if (!registration) {
        try {
          await navigator.serviceWorker.register('/firebase-messaging-sw.js');
        } catch (swError) {
          // Continue without service worker for foreground messages
        }
      }
      
      const token = await getToken(messaging, {
        vapidKey: environment.firebase.vapidKey,
        serviceWorkerRegistration: registration || undefined
      });

      if (token) {
        // Update token creation time and refresh time
        this.tokenCreationTime = Date.now();
        this.lastTokenRefreshTime = Date.now();
        
        this.fcmTokenSubject.next(token);
        return token;
      } else {
        return null;
      }
    } catch (error) {
      return null;
    }
  }

  /**
   * Setup listener for foreground messages
   */
  private setupMessageListener(): void {
    const messaging = this.firebaseConfig.getMessaging();
    
    onMessage(messaging, (payload) => {
      this.notificationSubject.next(payload);
      
      // Show notification if permission is granted
      if (this.permissionGranted && payload.notification) {
        this.showNotification(payload.notification.title || 'Notification', 
                             payload.notification.body || '', 
                             payload.notification.icon);
      }
    });
  }

  /**
   * Show browser notification
   */
  private showNotification(title: string, body: string, icon?: string): void {
    if (this.permissionGranted) {
      new Notification(title, {
        body: body,
        icon: icon || '/assets/images/logo.png',
        badge: '/assets/images/logo.png',
        tag: 'ccc-notification'
      });
    }
  }

  /**
   * Get FCM token observable
   */
  getFCMTokenObservable(): Observable<string | null> {
    return this.fcmTokenSubject.asObservable();
  }

  /**
   * Get current FCM token
   */
  getCurrentFCMToken(): string | null {
    return this.fcmTokenSubject.value;
  }

  /**
   * Get notification messages observable
   */
  getNotificationObservable(): Observable<MessagePayload | null> {
    return this.notificationSubject.asObservable();
  }

  /**
   * Check if notification permission is granted
   */
  isPermissionGranted(): boolean {
    return this.permissionGranted;
  }

  /**
   * Enhanced refresh FCM token with proper lifecycle management
   */
  async refreshToken(): Promise<string | null> {
    // Prevent multiple simultaneous refresh attempts
    if (this.isTokenRefreshInProgress) {
      return this.fcmTokenSubject.value;
    }

    const currentTime = Date.now();
    const timeSinceLastRefresh = currentTime - this.lastTokenRefreshTime;
    
    // Don't refresh too frequently
    if (timeSinceLastRefresh < this.MIN_REFRESH_INTERVAL) {
      return this.fcmTokenSubject.value;
    }

    this.isTokenRefreshInProgress = true;
    
    try {
      // Clear current token
      this.fcmTokenSubject.next(null);
      
      // Get new token
      const newToken = await this.getFCMToken();
      
      if (newToken) {
        this.lastTokenRefreshTime = Date.now();
      }
      
      return newToken;
    } catch (error) {
      return null;
    } finally {
      this.isTokenRefreshInProgress = false;
    }
  }

  /**
   * Get token lifecycle information for debugging
   */
  getTokenLifecycleInfo(): {
    currentToken: string | null;
    tokenCreationTime: number;
    lastRefreshTime: number;
    timeSinceCreation: number;
    timeSinceLastRefresh: number;
    isStale: boolean;
    isExpired: boolean;
  } {
    const currentTime = Date.now();
    const timeSinceCreation = currentTime - this.tokenCreationTime;
    const timeSinceLastRefresh = currentTime - this.lastTokenRefreshTime;
    
    return {
      currentToken: this.fcmTokenSubject.value,
      tokenCreationTime: this.tokenCreationTime,
      lastRefreshTime: this.lastTokenRefreshTime,
      timeSinceCreation,
      timeSinceLastRefresh,
      isStale: timeSinceCreation > this.STALE_TOKEN_THRESHOLD,
      isExpired: timeSinceCreation > this.EXPIRED_TOKEN_THRESHOLD
    };
  }

  /**
   * Force token refresh (bypasses frequency limits)
   */
  async forceRefreshToken(): Promise<string | null> {
    this.lastTokenRefreshTime = 0; // Reset to allow immediate refresh
    return await this.refreshToken();
  }
}
