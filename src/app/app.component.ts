import { Component, TemplateRef, ViewChild, OnInit, OnDestroy } from '@angular/core';
import { RouterModule, RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { TranslationService } from './core/services/translation.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgxSpinnerModule, NgxSpinnerService } from 'ngx-spinner';
import { ToastrService } from 'ngx-toastr';
import { NotificationService } from './core/services/notification.service';
import { AuthService } from './core/services/auth.service';
import { Subject } from 'rxjs';
import { takeUntil, filter } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  imports: [TranslateModule,RouterModule,NgxSpinnerModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit, OnDestroy {
    @ViewChild('customSpinner', { static: true }) customSpinnerTemplate!: TemplateRef<any>;
    private destroy$ = new Subject<void>();
    private lastLoggedInUserId: string | null = null;

   constructor(
    public translation: TranslationService, 
    private spinner: NgxSpinnerService, 
    private toastr: ToastrService, 
    private translate: TranslateService,
    private notificationService: NotificationService,
    private authService: AuthService,
    private router: Router
  ) {
    //this.showLoader();
   }

  ngOnInit(): void {
    // Setup authentication state monitoring for session-based initialization
    this.setupAuthStateMonitoring();
    
    // Initialize notifications for current session if user is already logged in
    if (this.authService.isLoggedIn()) {
      this.initializeUserNotificationSession();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Setup monitoring of authentication state and route changes
   * This ensures notifications are initialized when user logs in
   */
  private setupAuthStateMonitoring(): void {
    // Monitor route changes to detect login/logout
    this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe((event: NavigationEnd) => {
        this.checkAndInitializeNotificationSession();
      });
  }

  /**
   * Check current auth state and initialize notification session if needed
   */
  private checkAndInitializeNotificationSession(): void {
    const currentUserId = this.authService.getUserId();
    const isLoggedIn = this.authService.isLoggedIn();
    
    // Check if user logged in (new session or different user)
    if (isLoggedIn && currentUserId && currentUserId !== this.lastLoggedInUserId) {
      this.initializeUserNotificationSession();
      this.lastLoggedInUserId = currentUserId;
    }
    // Check if user logged out
    else if (!isLoggedIn && this.lastLoggedInUserId) {
      this.lastLoggedInUserId = null;
      // Notification service will be cleared by navbar component on logout
    }
  }

  /**
   * Initialize user notification session (called once per login session)
   */
  private async initializeUserNotificationSession(): Promise<void> {
    try {
      // Request notification permission if needed
      const permissionGranted = await this.notificationService.requestPermission();
      
      if (permissionGranted) {
        // Initialize the user session (this will only run once per session)
        await this.notificationService.initializeUserSession();
        
        // Setup global notification listeners (once per session)
        this.setupGlobalNotificationListeners();
      }
    } catch (error) {
      // Error handled silently
    }
  }

  /**
   * Setup global notification listeners (called once per session)
   */
  private setupGlobalNotificationListeners(): void {
    // Only setup if not already listening for this session
    if (this.lastLoggedInUserId === this.authService.getUserId()) {
      // Subscribe to notification updates for global app behavior
        this.notificationService.notifications$
        .pipe(takeUntil(this.destroy$))
        .subscribe(notifications => {
          // You can add global notification handling here (e.g., update window title badge)
        });

      // Subscribe to unseen count updates for global app behavior
      this.notificationService.unseenCount$
        .pipe(takeUntil(this.destroy$))
        .subscribe(count => {
          // You can update global UI elements here (e.g., page title, favicon badge)
          this.updatePageTitle(count);
        });
    }
  }

  /**
   * Update page title with notification count
   */
  private updatePageTitle(unseenCount: number): void {
    const baseTitle = 'CCC Services Portal';
    if (unseenCount > 0) {
      document.title = `(${unseenCount}) ${baseTitle}`;
    } else {
      document.title = baseTitle;
    }
  }

  showLoader() {
    this.spinner.show();
    setTimeout(() => this.spinner.hide(), 4000);
  }

  toggleLang() {
    this.translation.toggleLanguage();
  }
  
  showSuccess() {
    this.toastr.success(
      this.translate.instant('APP.MESSAGES.OPERATION_SUCCESS'), 
      this.translate.instant('TOAST.TITLE.SUCCESS')
    );
  }

  showError() {
    this.toastr.error(
      this.translate.instant('APP.MESSAGES.OPERATION_ERROR'), 
      this.translate.instant('TOAST.TITLE.ERROR')
    );
  }
}
