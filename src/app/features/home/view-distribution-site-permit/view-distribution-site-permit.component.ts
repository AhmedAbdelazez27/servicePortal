import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { NgSelectModule } from '@ng-select/ng-select';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
// import * as L from 'leaflet';
import { GoogleMapsLoaderService } from '../../../core/services/google-maps-loader.service';
import { ColDef } from 'ag-grid-community';
import { GenericDataTableComponent } from '../../../../shared/generic-data-table/generic-data-table.component';
import { environment } from '../../../../environments/environment';

import { MainApplyService } from '../../../core/services/mainApplyService/mainApplyService.service';
import { WorkFlowCommentsService } from '../../../core/services/workFlowComments/workFlowComments.service';
import { AttachmentService } from '../../../core/services/attachments/attachment.service';
import { AuthService } from '../../../core/services/auth.service';

import { 
  mainApplyServiceDto, 
  WorkFlowStepDto,
  WorkFlowCommentDto,
  PartnerDto,
  LocationDto,
  AttachmentDto as PartnerAttachmentDto,
  FastingTentServiceDto
} from '../../../core/dtos/mainApplyService/mainApplyService.dto';
import { AttachmentDto, GetAllAttachmentsParamters } from '../../../core/dtos/attachments/attachment.dto';
import { 
  CreateWorkFlowCommentDto, 
  GetAllWorkFlowCommentParameter, 
  WorkflowCommentsType,
  AttachmentBase64Dto,
  PagedResultDto
} from '../../../core/dtos/workFlowComments/workFlowComments.dto';
import {
  AttachmentsConfigDto,
  AttachmentsConfigType,
} from '../../../core/dtos/attachments/attachments-config.dto';
import { MainApplyServiceReportService } from '../../../core/services/mainApplyService/mainApplyService.reports';

// Service Status Enum (matching backend enum)
export enum ServiceStatus {
  Accept = 1,
  Reject = 2,
  New = 3,
  Wait = 4,
  Received = 5,
  ReturnForModifications = 7,
  RejectForReason = 1222
}

@Component({
  selector: 'app-view-distribution-site-permit',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    TranslateModule,
    NgSelectModule,
    GenericDataTableComponent,
    RouterModule
  ],
  templateUrl: './view-distribution-site-permit.component.html',
  styleUrl: './view-distribution-site-permit.component.scss',
})
export class ViewDistributionSitePermitComponent implements OnInit, OnDestroy {
  // Tab management
  currentTab: number = 1;
  totalTabs: number = 7; // Added workflow steps tab and workflow comments tab

  // Data properties
  mainApplyService: mainApplyServiceDto | null = null;
  distributionSiteService: FastingTentServiceDto | null = null;
  workFlowSteps: WorkFlowStepDto[] = [];
  partners: PartnerDto[] = [];
  attachments: any[] = []; // Keep as any[] for main service attachments
  targetWorkFlowStep: WorkFlowStepDto | null = null;
  workFlowComments: WorkFlowCommentDto[] = [];
  
  // Generic table properties for workflow comments
  allWorkFlowComments: any[] = [];
  commentsColumnDefs: ColDef[] = [];
  commentsColumnHeaderMap: { [key: string]: string } = {};
  
  // Modal properties (using Bootstrap modals now)
  selectedCommentAttachments: AttachmentDto[] = [];
  isLoadingAttachments: boolean = false;

  // Partner attachment properties
  selectedPartner: PartnerDto | null = null;
  selectedPartnerAttachments: PartnerAttachmentDto[] = [];
  isLoadingPartnerAttachments: boolean = false;

  // Loading states
  isLoading = false;
  isLoadingComments = false;
  isSavingComment = false;

  // Error handling states
  hasError = false;
  errorMessage = '';
  currentUserName = '';
  errorDetails = '';

  // Map variables
  map: any;
  markers: any[] = [];
  customIcon: any;
  mapLoadError: boolean = false;

  // Comment form
  commentForm!: FormGroup;
  newCommentText: string = '';
  selectedFiles: File[] = [];

  // Comment attachment properties
  commentAttachmentConfigs: AttachmentsConfigDto[] = [];
  commentAttachments: { [key: number]: AttachmentBase64Dto[] } = {};
  commentSelectedFiles: { [key: number]: File[] } = {};
  commentFilePreviews: { [key: number]: string[] } = {};
  isCommentDragOver = false;
  commentValidationSubmitted = false;

  get isRtl(): boolean {
    return this.translate.currentLang === 'ar';
  }

  // Subscriptions
  private subscriptions: Subscription[] = [];
  lastMatchingWorkFlowStep: any = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private mainApplyServiceService: MainApplyService,
    private workFlowCommentsService: WorkFlowCommentsService,
    private attachmentService: AttachmentService,
    private toastr: ToastrService,
    public translate: TranslateService,
    private cdr: ChangeDetectorRef,
    private authService: AuthService,
    private googleMapsLoader: GoogleMapsLoaderService,
    private mainApplyServiceReportService: MainApplyServiceReportService
  ) {
    this.initializeCommentForm();

    // Initialize current user name
    const currentUser = this.authService.getCurrentUser();
    this.currentUserName = currentUser?.name || 'User';
  }

  ngOnInit(): void {
    this.loadMainApplyServiceData();
    this.loadCommentAttachmentConfigs();
    
    // Add window resize listener for map responsiveness
    window.addEventListener('resize', this.onWindowResize.bind(this));
    
    // Add window focus listener to refresh map when tab becomes active
    window.addEventListener('focus', this.onWindowFocus.bind(this));
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    if (this.map) {
      this.map = null;
    }
    
    // Remove window resize listener
    window.removeEventListener('resize', this.onWindowResize.bind(this));
    
    // Remove window focus listener
    window.removeEventListener('focus', this.onWindowFocus.bind(this));
  }

  private onWindowResize(): void {
    if (this.map) {
      // Small delay to ensure DOM has updated
      setTimeout(() => {
        try {
          const center = this.map.getCenter ? this.map.getCenter() : null;
          if (center) { this.map.setCenter(center); }
        } catch {}
      }, 100);
    }
  }

  private onWindowFocus(): void {
    // Refresh map when window gains focus (e.g., when switching back to tab)
    if (this.distributionSiteService?.distributionSiteCoordinators) {
      setTimeout(() => {
        if (this.map) {
          try {
            const center = this.map.getCenter ? this.map.getCenter() : null;
            if (center) { this.map.setCenter(center); }
          } catch {}
        } else {
          this.initializeMap();
        }
      }, 200);
    }
  }

  // Public method to manually refresh the map (can be called from template if needed)
  refreshMap(): void {
    if (this.distributionSiteService?.distributionSiteCoordinators) {
      this.cleanupMap();
      setTimeout(() => this.initializeMap(), 100);
    }
  }

  private initializeCommentForm(): void {
    this.commentForm = this.fb.group({
      comment: ['']
    });
  }

  // Removed initializeMapIcon - was using Leaflet API instead of Google Maps
  // Custom icons can be added later if needed using Google Maps API

  private initializeCommentsTable(): void {
    
    this.commentsColumnDefs = [
      {
        headerName: this.translate.instant('COMMON.COMMENT'),
        field: 'comment',
        flex: 2,
        minWidth: 200,
        cellRenderer: (params: any) => {
          const comment = params.value;
          if (comment) {
            return `<div class="comment-cell">
                      <div class="comment-text">${comment}</div>
                      <div class="comment-meta">
                        <small class="text-muted">
                          <i class="fas fa-user me-1"></i>${params.data.employeeDepartmentName || 'N/A'}
                          <span class="ms-2">
                            <i class="fas fa-calendar me-1"></i>${this.formatDateTime(params.data.lastModified)}
                          </span>
                        </small>
                      </div>
                    </div>`;
          }
          return '-';
        }
      },
      {
        headerName: this.translate.instant('COMMON.DEPARTMENT'),
        field: 'stepDepartmentName',
        flex: 1.2,
        minWidth: 150
      },
      {
        headerName: this.translate.instant('COMMON.STATUS'),
        field: 'stepServiceStatus',
        flex: 1,
        minWidth: 120
      },
      {
        headerName: this.translate.instant('COMMON.FILES'),
        field: 'id',
        flex: 0.8,
        minWidth: 100,
        cellRenderer: (params: any) => {
          const commentId = params.value;
          const attachments = params.data.attachments;
          const hasAttachments = attachments && Array.isArray(attachments) && attachments.length > 0;
          
          if (commentId && hasAttachments) {
            return `<button class="btn btn-next-style attachment-btn" data-comment-id="${commentId}" data-row-index="${params.node.rowIndex}">
                      <i class="fas fa-eye me-1"></i>
                      <span>${this.translate.instant('COMMON.VIEW')}</span>
                    </button>`;
          }
          return '-';
        },
        cellClass: 'text-center'
      }
    ];
    
    this.commentsColumnHeaderMap = {
      'comment': this.translate.instant('COMMON.COMMENT'),
      'stepDepartmentName': this.translate.instant('COMMON.DEPARTMENT'),
      'stepServiceStatus': this.translate.instant('COMMON.STATUS'),
      'attachments': this.translate.instant('COMMON.FILES')
    };
  }

  private loadMainApplyServiceData(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.hasError = true;
      this.errorMessage = this.translate.instant('COMMON.INVALID_ID');
      this.errorDetails = this.translate.instant('COMMON.NO_VALID_ID_URL');
      return;
    }

    this.isLoading = true;
    const subscription = this.mainApplyServiceService.getDetailById({ id }).subscribe({
      next: (response) => {
        this.mainApplyService = response;
        this.distributionSiteService = response.fastingTentService;
        this.workFlowSteps = response.workFlowSteps || [];
        this.partners = response.partners || [];
        this.attachments = response.attachments || [];

        const matchingSteps = this.workFlowSteps.filter(
          step => [1, 2, 7].includes(step.serviceStatus ?? -1)
        );
        this.lastMatchingWorkFlowStep = matchingSteps.length
          ? matchingSteps[matchingSteps.length - 1]
          : null;

        this.findTargetWorkFlowStep();
        this.loadWorkFlowComments();

        if (this.distributionSiteService?.distributionSiteCoordinators) {
          setTimeout(() => this.initializeMap(), 500);
        }

        this.isLoading = false;
      },
      error: (error) => {
        this.hasError = true;
        this.errorMessage = this.getErrorMessage(error);
        if (this.isAuthenticationError(error)) {
          this.errorDetails = this.getErrorGuidance(error);
        } else if (this.isErrorRecoverable(error)) {
          this.errorDetails = this.getErrorGuidance(error);
        } else {
          this.errorDetails = this.getErrorGuidance(error);
        }

        this.isLoading = false;
      }
    });

    this.subscriptions.push(subscription);
  }

  // Retry loading data when there's an error
  retryLoadingData(): void {
    this.hasError = false;
    this.errorMessage = '';
    this.errorDetails = '';
    this.loadMainApplyServiceData();
  }

  // Refresh the entire page as a last resort
  refreshPage(): void {
    window.location.reload();
  }

  // Contact support for persistent errors
  contactSupport(): void {
    // Navigate to contact us page or open support modal
    this.router.navigate(['/contact-us']);
  }

  // Check if the service is available (alternative to retry)
  checkServiceAvailability(): void {
    // This could be used to ping the service or check status
    // For now, we'll just show a message and then retry
    this.toastr.info('Checking service availability...');
    setTimeout(() => {
      this.retryLoadingData();
    }, 1000);
  }

  // Copy error details to clipboard for support
  copyErrorDetails(): void {
    const errorInfo = `Error: ${this.errorMessage}\nDetails: ${this.errorDetails}\nURL: ${window.location.href}\nTime: ${new Date().toISOString()}`;
    
          if (navigator.clipboard) {
        navigator.clipboard.writeText(errorInfo).then(() => {
          this.toastr.success(this.translate.instant('COMMON.ERROR_DETAILS_COPIED'));
        }).catch(() => {
          this.toastr.error(this.translate.instant('COMMON.FAILED_COPY_ERROR'));
        });
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = errorInfo;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        this.toastr.success(this.translate.instant('COMMON.ERROR_DETAILS_COPIED'));
      } catch (err) {
        this.toastr.error(this.translate.instant('COMMON.FAILED_COPY_ERROR'));
      }
      document.body.removeChild(textArea);
    }
  }

  // Get additional error context and suggestions
  getErrorContext(): string {
    if (this.isAuthenticationError({ status: 401 })) {
      return this.translate.instant('COMMON.LOGIN_AGAIN_SESSION_EXPIRED');
    } else if (this.isErrorRecoverable({ status: 500 })) {
      return this.translate.instant('COMMON.TEMPORARY_ISSUE_TRY_AGAIN');
    } else if (this.isErrorRecoverable({ status: 0 })) {
      return this.translate.instant('COMMON.CHECK_INTERNET_CONNECTION');
    } else {
      return this.translate.instant('COMMON.CONTACT_SUPPORT_IF_PERSISTS');
    }
  }

  // Helper method to determine error type and provide appropriate message
  private getErrorMessage(error: any): string {
    if (error?.status === 0 || error?.status === 500) {
      return this.translate.instant('COMMON.NETWORK_ERROR');
    } else if (error?.status === 404) {
      return this.translate.instant('COMMON.DATA_NOT_FOUND');
    } else if (error?.status === 401 || error?.status === 403) {
      return this.translate.instant('COMMON.UNAUTHORIZED_ACCESS');
    } else {
      return this.translate.instant('COMMON.ERROR_LOADING_DATA');
    }
  }

  // Check if error is recoverable (can be retried)
  private isErrorRecoverable(error: any): boolean {
    // Network errors and server errors are usually recoverable
    return error?.status === 0 || error?.status >= 500;
  }

  // Check if error requires authentication
  private isAuthenticationError(error: any): boolean {
    return error?.status === 401 || error?.status === 403;
  }

  // Get specific error guidance based on error type
  private getErrorGuidance(error: any): string {
    if (this.isAuthenticationError(error)) {
      return this.translate.instant('COMMON.LOGIN_AGAIN_ACCESS_SERVICE');
    } else if (error?.status === 404) {
      return this.translate.instant('COMMON.PERMIT_NOT_FOUND_VERIFY_ID');
    } else if (error?.status === 0) {
      return this.translate.instant('COMMON.UNABLE_CONNECT_SERVER');
    } else if (error?.status >= 500) {
      return this.translate.instant('COMMON.SERVER_ISSUES_TRY_LATER');
    } else {
      return this.translate.instant('COMMON.UNEXPECTED_ERROR_TRY_AGAIN');
    }
  }

  private findTargetWorkFlowStep(): void {
    if (this.workFlowSteps && this.workFlowSteps.length > 0) {

      // Sort by stepOrder ascending and find last with serviceStatus = 7
      const sortedSteps = this.workFlowSteps
        .filter(step => step.stepOrder !== null)
        .sort((a, b) => (a.stepOrder || 0) - (b.stepOrder || 0));
    
      this.targetWorkFlowStep =
        sortedSteps.slice().reverse().find(step => step.serviceStatus === 7) || null;
    }
  }

  private loadWorkFlowComments(): void {
    // Collect all comments from all workflow steps
    this.allWorkFlowComments = [];
    
    if (this.workFlowSteps && Array.isArray(this.workFlowSteps)) {
      this.workFlowSteps.forEach(step => {
        if (step.workFlowComments && Array.isArray(step.workFlowComments)) {
          step.workFlowComments.forEach(comment => {
            if (comment?.commentTypeId == 2) {
              
              this.allWorkFlowComments.push({
                ...comment,
                stepDepartmentName: step.departmentName, // Include step department info
                stepServiceStatus: step.serviceStatusName
              });
            }
          });
        }
      });
    }
    
    // Sort comments by lastModified date (newest first)
    this.allWorkFlowComments.sort((a, b) => {
      const dateA = new Date(a.lastModified || 0);
      const dateB = new Date(b.lastModified || 0);
      return dateB.getTime() - dateA.getTime();
    });
    

    
    // Legacy: Use comments from targetWorkFlowStep for add comment functionality
    if (this.targetWorkFlowStep && Array.isArray(this.targetWorkFlowStep.workFlowComments)) {
      this.workFlowComments = this.targetWorkFlowStep.workFlowComments;
    } else {
      this.workFlowComments = [];
    }
    
    this.initializeCommentsTable(); // Initialize table after data is loaded
    this.isLoadingComments = false;
  }
  // View attachment in new tab or modal
  viewAttachment(attachment: AttachmentDto | PartnerAttachmentDto | any): void {
    if (attachment.imgPath) {
      // Construct the full URL for the file
      const fileUrl = this.getAttachmentUrl(attachment.imgPath);
      window.open(fileUrl, '_blank');
    }
  }
// NOTE: For map to display, ensure Leaflet CSS is loaded in angular.json or styles.scss:
// In angular.json: "styles": [ "node_modules/leaflet/dist/leaflet.css", ... ]
// Or in styles.scss: @import '~leaflet/dist/leaflet.css';

  // Tab navigation methods
  goToTab(tabNumber: number): void {
    if (tabNumber >= 1 && tabNumber <= this.totalTabs) {
      this.currentTab = tabNumber;
    }
  }

  isCurrentTabVisible(): boolean {
    return this.currentTab >= 1 && this.currentTab <= this.totalTabs;
  }

  private cleanupMap(): void {
    if (this.map) {
      // Remove all markers
      this.markers.forEach(marker => {
        if (marker && marker.setMap) {
          marker.setMap(null);
        }
      });
      this.markers = [];
      
      // Clear map (Google Maps doesn't have remove method)
      this.map = null;
    }
    
    // Reset error flag
    this.mapLoadError = false;
  }

  isTabActive(tabNumber: number): boolean {
    return this.currentTab === tabNumber;
  }

  // Map initialization for location display
  private initializeMap(): void {
    
    if (!this.distributionSiteService?.distributionSiteCoordinators) {
      this.toastr.warning(this.translate.instant('COMMON.NO_COORDINATES_AVAILABLE'));
      return;
    }

    // Use a longer timeout and multiple checks to ensure DOM is ready
    let attempts = 0;
    const maxAttempts = 20; // Increased max attempts
    
    const checkAndInitialize = () => {
      const mapElement = document.getElementById('viewMap');
      attempts++;
      
      if (mapElement) {
        // Check if map container has proper dimensions
        if (mapElement.offsetWidth === 0 || mapElement.offsetHeight === 0) {
          if (attempts < maxAttempts) {
            setTimeout(checkAndInitialize, 500);
          } else {
            this.toastr.error('Map container has no dimensions after multiple attempts');
          }
          return;
        }
        
        this.setupViewMap();
      } else if (attempts < maxAttempts) {
        setTimeout(checkAndInitialize, 200);
      } else {
        // this.toastr.error('Failed to initialize map: map container not found');
      }
    };
    
    setTimeout(checkAndInitialize, 100);
  }

  private setupViewMap(): void {
    try {
      // Double-check that the map container exists and has dimensions
      const mapElement = document.getElementById('viewMap');
      if (mapElement) {
        const computedStyle = window.getComputedStyle(mapElement);
        //   display: computedStyle.display,
        //   visibility: computedStyle.visibility,
        //   height: computedStyle.height,
        //   width: computedStyle.width,
        //   position: computedStyle.position
        // });
      }
      if (!mapElement) {
        // this.toastr.error(this.translate.instant('COMMON.MAP_CONTAINER_NOT_FOUND'));
        this.mapLoadError = true;
        return;
      }
      
            if (mapElement.offsetWidth === 0 || mapElement.offsetHeight === 0) {
        
        // Check if element is actually in the document
        if (!document.contains(mapElement)) {
          setTimeout(() => this.setupViewMap(), 1000);
          return;
        }
        
        // Check if element is visible
        const computedStyle = window.getComputedStyle(mapElement);
        if (computedStyle.display === 'none' || computedStyle.visibility === 'hidden') {
          setTimeout(() => this.setupViewMap(), 1000);
          return;
        }
        
        // Check if element is in viewport
        const rect = mapElement.getBoundingClientRect();
        if (rect.bottom < 0 || rect.top > window.innerHeight || rect.right < 0 || rect.left > window.innerWidth) {
          setTimeout(() => this.setupViewMap(), 1000);
          return;
        }
        
        // Check if element has content or is empty
        if (mapElement.children.length === 0 && mapElement.innerHTML.trim() === '') {
        } else {
          mapElement.innerHTML = '';
        }
        
        // Ensure the map container has proper CSS properties
        mapElement.style.height = '400px';
        mapElement.style.width = '100%';
        mapElement.style.display = 'block';
        mapElement.style.visibility = 'visible';
        mapElement.style.position = 'relative';
        
        // Force layout recalculation
        mapElement.offsetHeight; // Force reflow
        
        // Check again after ensuring proper CSS
        if (mapElement.offsetWidth === 0 || mapElement.offsetHeight === 0) {
          
          // Check if element is in viewport
          const rect = mapElement.getBoundingClientRect();
          
          if (rect.width === 0 || rect.height === 0) {
            setTimeout(() => this.setupViewMap(), 1000);
            return;
          }
        }
      }
      
      if (this.map) {
        this.map = null;
      }

      if (!this.distributionSiteService?.distributionSiteCoordinators) {
        this.toastr.error(this.translate.instant('COMMON.NO_LOCATION_COORDINATES'));
        this.mapLoadError = true;
        return;
      }

      // Enhanced coordinate parsing with multiple format support
      let coordinates: string[] = [];
      const coordString = this.distributionSiteService.distributionSiteCoordinators;
      
      
      // Try to parse as JSON first (most common format)
      try {
        const jsonCoords = JSON.parse(coordString);
        if (jsonCoords && typeof jsonCoords === 'object') {
          if (jsonCoords.lat !== undefined && jsonCoords.lng !== undefined) {
            coordinates = [jsonCoords.lat.toString(), jsonCoords.lng.toString()];
          } else if (jsonCoords.latitude !== undefined && jsonCoords.longitude !== undefined) {
            coordinates = [jsonCoords.latitude.toString(), jsonCoords.longitude.toString()];
          } else if (jsonCoords.x !== undefined && jsonCoords.y !== undefined) {
            coordinates = [jsonCoords.x.toString(), jsonCoords.y.toString()];
          }
        }
      } catch (jsonError) {
        // Continue with other parsing methods
      }
      
      // If JSON parsing failed, try different separators
      if (coordinates.length === 0) {
        if (coordString.includes(',')) {
          coordinates = coordString.split(',');
        } else if (coordString.includes(';')) {
          coordinates = coordString.split(';');
        } else if (coordString.includes(' ')) {
          coordinates = coordString.split(' ');
        } else if (coordString.includes('/')) {
          coordinates = coordString.split('/');
        } else if (coordString.includes('|')) {
          coordinates = coordString.split('|');
        } else if (coordString.includes('\t')) {
          coordinates = coordString.split('\t');
        } else {
          // Try fallback parsing as last resort
          this.toastr.error(this.translate.instant('DISTRIBUTION_SITE.INVALID_COORDINATES_SEPARATOR', { 0: coordString }));
          this.mapLoadError = true;
          return;
        }
      }
      
      if (coordinates.length !== 2) {
        this.toastr.error(this.translate.instant('DISTRIBUTION_SITE.INVALID_COORDINATES_COUNT', { 0: coordinates.length }));
        this.mapLoadError = true;
        return;
      }

      const lat = parseFloat(coordinates[0].trim());
      const lng = parseFloat(coordinates[1].trim());
      // ('Parsed coordinates:', { lat, lng });
      
      // Check if coordinates are valid numbers
      if (isNaN(lat) || isNaN(lng)) {
        this.toastr.error(this.translate.instant('DISTRIBUTION_SITE.INVALID_COORDINATES_NUMBERS'));
        this.mapLoadError = true;
        return;
      }

      // Check if coordinates are reasonable (not 0,0 which is usually invalid)
      if (lat === 0 && lng === 0) {
        this.toastr.warning(this.translate.instant('DISTRIBUTION_SITE.INVALID_COORDINATES_ZERO'));
      }

      // Check if coordinates are within reasonable ranges
      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        this.toastr.error(this.translate.instant('DISTRIBUTION_SITE.INVALID_COORDINATES_RANGE'));
        this.mapLoadError = true;
        return;
      }

      // Validate coordinate ranges (roughly UAE bounds)
      if (lat < 22 || lat > 27 || lng < 51 || lng > 57) {
        this.toastr.warning(this.translate.instant('DISTRIBUTION_SITE.INVALID_COORDINATES_UAE'));
      }

      this.googleMapsLoader.load().then((google) => {
        try {
          const el = document.getElementById('viewMap') as HTMLElement;
          this.map = new google.maps.Map(el, {
            center: { lat, lng },
            zoom: 15,
            fullscreenControl: false,
            streetViewControl: false,
            mapTypeControl: false,
            styles: [
              {
                featureType: 'poi',
                elementType: 'labels',
                stylers: [{ visibility: 'off' }]
              },
              {
                featureType: 'poi',
                elementType: 'geometry',
                stylers: [{ visibility: 'off' }]
              },
              {
                featureType: 'transit',
                elementType: 'labels',
                stylers: [{ visibility: 'off' }]
              },
              {
                featureType: 'transit',
                elementType: 'geometry',
                stylers: [{ visibility: 'off' }]
              }
            ]
          });
          const marker = new google.maps.Marker({ position: { lat, lng }, map: this.map });
          this.markers = [marker];
        } catch (e) {
          this.toastr.error(this.translate.instant('DISTRIBUTION_SITE.MAP_CREATION_FAILED'));
          this.mapLoadError = true;
          return;
        }
      }).catch(() => {
        this.toastr.error(this.translate.instant('SHARED.MAP.LOADING_ERROR'));
        this.mapLoadError = true;
        return;
      });

      this.mapLoadError = false;

    } catch (error) {
      this.toastr.error(this.translate.instant('COMMON.FAILED_INITIALIZE_MAP'));
      this.mapLoadError = true;
    }
  }

  private addFallbackTileLayer(): void { }

  private checkTileLayersLoaded(): boolean { return true; }

  // Comment attachment configuration loading
  loadCommentAttachmentConfigs(): void {
    const sub = this.attachmentService.getAttachmentsConfigByType(
      AttachmentsConfigType.Comment,
      true,
      null
    ).subscribe({
      next: (configs) => {
        this.commentAttachmentConfigs = configs || [];
        this.initializeCommentAttachments();
      },
      error: (error) => {
        // Handle error silently
      }
    });
    this.subscriptions.push(sub);
  }

  initializeCommentAttachments(): void {
    this.commentAttachments = {};
    this.commentSelectedFiles = {};
    this.commentFilePreviews = {};
    
    this.commentAttachmentConfigs.forEach(config => {
      if (config.id) {
        this.commentAttachments[config.id] = [];
      }
    });
  }

  // Comment management methods
  addWorkFlowComment(): void {
    if (!this.newCommentText.trim() || !this.targetWorkFlowStep?.id) {
      this.toastr.warning(this.translate.instant('COMMENTS.ENTER_COMMENT'));
      return;
    }

    // Set validation flag to show validation errors
    this.commentValidationSubmitted = true;

    // Check if required attachments are uploaded
    const requiredAttachments = this.commentAttachmentConfigs.filter(config => config.mendatory);
    const missingRequiredAttachments = requiredAttachments.filter(config => 
      !this.commentSelectedFiles[config.id!] || this.commentSelectedFiles[config.id!].length === 0
    );

    if (missingRequiredAttachments.length > 0) {
      this.toastr.warning(this.translate.instant('VALIDATION.PLEASE_UPLOAD_REQUIRED_ATTACHMENTS'));
      return;
    }

    this.isSavingComment = true;
    
    // Prepare attachments for the comment
    const attachments: AttachmentBase64Dto[] = [];
    
    // Process attachments from attachment configs
    Object.values(this.commentAttachments).forEach(attachment => {
      attachment.forEach(att => {
        attachments.push(att);
      });
    });
    
    const createDto: CreateWorkFlowCommentDto = {
      empId: null,
      workFlowStepsId: this.targetWorkFlowStep.id,
      comment: this.newCommentText.trim(),
      lastModified: new Date(),
      commentTypeId: WorkflowCommentsType.External,
      attachments: attachments
    };

    const subscription = this.workFlowCommentsService.create(createDto).subscribe({
      next: (response) => {
        this.toastr.success(this.translate.instant('COMMENTS.COMMENT_ADDED'));
        this.newCommentText = '';
        this.selectedFiles = [];
        // Clear comment attachments
        this.clearCommentAttachments();
        this.closeCommentModal(); // Close the modal
        // Reload main data to get updated comments
        this.loadMainApplyServiceData();
        this.isSavingComment = false;
      },
      error: (error) => {
        this.toastr.error(this.translate.instant('COMMENTS.ERROR_ADDING_COMMENT'));
        this.isSavingComment = false;
      }
    });
    this.subscriptions.push(subscription);
  }

  clearCommentAttachments(): void {
    this.commentSelectedFiles = {};
    this.commentFilePreviews = {};
    this.commentAttachments = {};
    this.commentValidationSubmitted = false;
    // Reinitialize comment attachments structure
    this.initializeCommentAttachments();
  }

  getCommentAttachmentName(config: AttachmentsConfigDto): string {
    return config.nameEn || config.name || this.translate.instant('COMMON.ATTACHMENT');
  }

  isCommentAttachmentMandatory(configId: number): boolean {
    const config = this.commentAttachmentConfigs.find(c => c.id === configId);
    return config?.mendatory || false;
  }

  // File handling methods for comment attachments
  onCommentFileSelected(event: Event, configId: number): void {
    const target = event.target as HTMLInputElement;
    if (target?.files) {
      // Handle multiple files
      for (let i = 0; i < target.files.length; i++) {
        this.handleCommentFileUpload(target.files[i], configId);
      }
    }
  }

  onCommentDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isCommentDragOver = true;
  }

  onCommentDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isCommentDragOver = false;
  }

  onCommentDrop(event: DragEvent, configId: number): void {
    event.preventDefault();
    this.isCommentDragOver = false;
    
    const files = event.dataTransfer?.files;
    if (files) {
      // Handle multiple files from drag and drop
      for (let i = 0; i < files.length; i++) {
        this.handleCommentFileUpload(files[i], configId);
      }
    }
  }

  handleCommentFileUpload(file: File, configId: number): void {
    if (!this.validateCommentFile(file)) {
      return;
    }

    // Initialize arrays if they don't exist
    if (!this.commentSelectedFiles[configId]) {
      this.commentSelectedFiles[configId] = [];
    }
    if (!this.commentFilePreviews[configId]) {
      this.commentFilePreviews[configId] = [];
    }
    if (!this.commentAttachments[configId]) {
      this.commentAttachments[configId] = [];
    }

    // Add file to arrays
    this.commentSelectedFiles[configId].push(file);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      this.commentFilePreviews[configId].push(e.target?.result as string);
      
      const base64String = (e.target?.result as string).split(',')[1];
      this.commentAttachments[configId].push({
        fileBase64: base64String,
        fileName: file.name,
        attConfigID: configId
      });
      
      this.cdr.detectChanges();
    };
    reader.readAsDataURL(file);
  }

  validateCommentFile(file: File): boolean {
    const maxSize = 5 * 1024 * 1024; // 5MB
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    
    if (file.size > maxSize) {
      this.toastr.error(this.translate.instant('VALIDATION.FILE_TOO_LARGE'));
      return false;
    }
    
    if (!allowedTypes.includes(file.type)) {
      this.toastr.error(this.translate.instant('VALIDATION.INVALID_FILE_TYPE'));
      return false;
    }
    
    return true;
  }

  removeCommentFile(configId: number, fileIndex: number = 0): void {
    if (this.commentSelectedFiles[configId] && this.commentSelectedFiles[configId].length > fileIndex) {
      this.commentSelectedFiles[configId].splice(fileIndex, 1);
      this.commentFilePreviews[configId].splice(fileIndex, 1);
      
      if (this.commentAttachments[configId] && this.commentAttachments[configId].length > fileIndex) {
        this.commentAttachments[configId].splice(fileIndex, 1);
      }
    }
    
    this.cdr.detectChanges();
  }

  addMoreFiles(configId: number): void {
    // Use setTimeout to ensure DOM is fully rendered
    setTimeout(() => {
      // Try to find the file input for adding more files first
      let fileInput = document.getElementById(`comment-file-more-${configId}`) as HTMLInputElement;
      
      // If not found, try the original file input (for when no files are selected yet)
      if (!fileInput) {
        fileInput = document.getElementById(`comment-file-${configId}`) as HTMLInputElement;
      }
      
      if (fileInput) {
        fileInput.click();
      } else {
        this.toastr.error(this.translate.instant('COMMON.ERROR_OCCURRED') + ': File input not found');
      }
    }, 100);
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Comments table event handlers
  onCommentsTableAction(event: { action: string, row: any }): void {
    if (event.action === 'view-attachments') {
      this.viewCommentAttachments(event.row);
    }
  }

  viewCommentAttachments(comment: any): void {
    if (comment.attachments && comment.attachments.length > 0) {
      this.selectedCommentAttachments = comment.attachments;
      this.openAttachmentModal();
    }
  }

  fetchAndViewCommentAttachments(commentId: number): void {
    this.isLoadingAttachments = true;
    this.selectedCommentAttachments = [];
    this.openAttachmentModal();
    
    // Master type for comments is 1003
    const masterType = 1003;
    
    // Prepare parameters for getList method
    const parameters: GetAllAttachmentsParamters = {
      skip: 0,
      take: 100, // Get up to 100 attachments
      masterIds: [commentId], // Array of master IDs
      masterType: masterType
    };
    
    const subscription = this.attachmentService.getList(parameters).subscribe({
      next: (result: any) => {
        // Handle different response structures
        this.selectedCommentAttachments = result.data || result.items || [];
        this.isLoadingAttachments = false;
        
        if (this.selectedCommentAttachments.length === 0) {
          this.toastr.info(this.translate.instant('COMMON.NO_ATTACHMENTS_FOUND'));
        }
      },
      error: (error) => {
        this.toastr.error(this.translate.instant('COMMON.ERROR_LOADING_ATTACHMENTS'));
        this.isLoadingAttachments = false;
        this.selectedCommentAttachments = [];
      }
    });
    
    this.subscriptions.push(subscription);
  }

  openAttachmentModal(): void {
    const modal = document.getElementById('attachmentModal');
    if (modal) {
      const bootstrapModal = new (window as any).bootstrap.Modal(modal);
      bootstrapModal.show();
    }
  }

  closeAttachmentModal(): void {
    this.selectedCommentAttachments = [];
    this.isLoadingAttachments = false;
    const modal = document.getElementById('attachmentModal');
    if (modal) {
      const bootstrapModal = (window as any).bootstrap.Modal.getInstance(modal);
      if (bootstrapModal) {
        bootstrapModal.hide();
      }
    }
  }

  openCommentModal(): void {
    // Ensure comment attachments are properly initialized when modal opens
    this.initializeCommentAttachments();
    const modal = document.getElementById('commentModal');
    if (modal) {
      const bootstrapModal = new (window as any).bootstrap.Modal(modal);
      bootstrapModal.show();
    }
  }

  closeCommentModal(): void {
    const modal = document.getElementById('commentModal');
    if (modal) {
      const bootstrapModal = (window as any).bootstrap.Modal.getInstance(modal);
      if (bootstrapModal) {
        bootstrapModal.hide();
      }
    }
  }

  onTableCellClick(event: any,id:any) {
    // const btn = event.event?.target?.closest?.('.attachment-btn');
    // if (btn) {
    //   const id = parseInt(btn.getAttribute('data-comment-id'), 10);
    //   if (id) this.fetchAndViewCommentAttachments(id);
    // }
     if (id) this.fetchAndViewCommentAttachments(id);
  }

  // Legacy file handling methods (keeping for backward compatibility)
  onFileSelected(event: any): void {
    const files = event.target.files;
    if (files && files.length > 0) {
      this.selectedFiles = Array.from(files);
    }
  }

  removeSelectedFile(index: number): void {
    this.selectedFiles.splice(index, 1);
  }

  // Utility methods
  getAttachmentUrl(imgPath: string): string {
    // If imgPath is already a full URL, return it as is
    if (imgPath.startsWith('http://') || imgPath.startsWith('https://')) {
      return imgPath;
    }
    
    // If imgPath is a relative path, construct the full URL
    // Remove leading slash if present
    const cleanPath = imgPath.startsWith('/') ? imgPath.substring(1) : imgPath;
    
    // Try different URL patterns - uncomment the one that works for your API:
    
    // For regular file paths, use the files endpoint
    return `${environment.apiBaseUrl}/files/${cleanPath}`;
  }

  formatDate(date: Date | string | null): string {
    if (!date) return '';
    const d = typeof date === 'string' ? new Date(date) : date;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }

  formatDateTime(date: Date | string | null): string {
    if (!date) return '';
    const d = typeof date === 'string' ? new Date(date) : date;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  }

  getPartnerTypeName(type: number | null): string {
    if (type === null) return '';
    // Add your partner type mapping here
    const types: { [key: number]: string } = {
      1: this.translate.instant('COMMON.INDIVIDUAL'),
      2: this.translate.instant('COMMON.ORGANIZATION'),
      3: this.translate.instant('COMMON.GOVERNMENT')
    };
    return types[type] || this.translate.instant('COMMON.UNKNOWN');
  }

  downloadAttachment(attachment: AttachmentDto | PartnerAttachmentDto | any): void {
    if (attachment.imgPath) {
      // Construct the full URL for the file
      const fileUrl = this.getAttachmentUrl(attachment.imgPath);
      
      // Create a temporary link to download the file
      const link = document.createElement('a');
      link.href = fileUrl;
      link.download = attachment.attachmentTitle || attachment.imgPath;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }

  // Partner attachment methods
  viewPartnerAttachments(partner: PartnerDto): void {
    if (partner.attachments && partner.attachments.length > 0) {
      this.selectedPartner = partner;
      this.selectedPartnerAttachments = partner.attachments;
      // Modal will be opened by Bootstrap data-bs-* attributes
    } else {
      this.fetchPartnerAttachments(partner);
    }
  }

  fetchPartnerAttachments(partner: PartnerDto): void {
    if (!partner.id) {
      this.toastr.warning(this.translate.instant('COMMON.INVALID_PARTNER_ID'));
      return;
    }

    this.selectedPartner = partner;
    this.isLoadingPartnerAttachments = true;
    this.selectedPartnerAttachments = [];
    // Modal will be opened by Bootstrap data-bs-* attributes
    
    // Master type for partners - need to determine the correct master type
    // This might be different, check with your API documentation
    const masterType = 1004; // Assuming 1004 is for partners, adjust as needed
    
    // Prepare parameters for getList method
    const parameters: GetAllAttachmentsParamters = {
      skip: 0,
      take: 100, // Get up to 100 attachments
      masterIds: [partner.id], // Array of master IDs
      masterType: masterType
    };
    
    const subscription = this.attachmentService.getList(parameters).subscribe({
      next: (result: any) => {

        
        // Handle different response structures and convert to PartnerAttachmentDto
        const attachments = result.data || result.items || [];
        this.selectedPartnerAttachments = attachments.map((attachment: any) => ({
          id: attachment.id,
          masterId: attachment.masterId,
          imgPath: attachment.imgPath,
          masterType: attachment.masterType,
          attachmentTitle: attachment.attachmentTitle,
          lastModified: attachment.lastModified,
          attConfigID: attachment.attConfigID
        } as PartnerAttachmentDto));
        
        this.isLoadingPartnerAttachments = false;
        
        
        
        if (this.selectedPartnerAttachments.length === 0) {
          this.toastr.info(this.translate.instant('COMMON.NO_ATTACHMENTS_FOUND'));
        }
      },
      error: (error) => {
       
        this.toastr.error(this.translate.instant('COMMON.ERROR_LOADING_ATTACHMENTS'));
        this.isLoadingPartnerAttachments = false;
        this.selectedPartnerAttachments = [];
      }
    });
    
    this.subscriptions.push(subscription);
  }

  closePartnerAttachmentModal(): void {
    this.selectedPartner = null;
    this.selectedPartnerAttachments = [];
    this.isLoadingPartnerAttachments = false;
  }

  // Navigation methods
  goBack(): void {
    // If there's an error, go back to the main request page
    // If no error, go back to the previous page
    if (this.hasError) {
      this.router.navigate(['/request']);
    } else {
      // Use browser history to go back
      window.history.back();
    }
  }

  nextTab(): void {
    if (this.currentTab < this.totalTabs) {
      this.goToTab(this.currentTab + 1);
    }
  }

  previousTab(): void {
    if (this.currentTab > 1) {
      this.goToTab(this.currentTab - 1);
    }
  }

  // Workflow Steps Helper Methods
  getStatusColor(statusId: number | null): string {
    if (statusId === null) return '#6c757d';
    
    switch (statusId) {
      case ServiceStatus.Accept:
        return '#28a745'; // Green
      case ServiceStatus.Reject:
        return '#dc3545'; // Red
      case ServiceStatus.New:
        return '#E6E6E6'; // Light Gray
      case ServiceStatus.Wait:
        return '#ffc107'; // Yellow/Amber
      case ServiceStatus.Received:
        return '#17a2b8'; // Cyan/Teal
      case ServiceStatus.ReturnForModifications:
        return '#6f42c1'; // Purple
      case ServiceStatus.RejectForReason:
        return '#fd7e14'; // Orange
      default:
        return '#6c757d'; // Gray
    }
  }

  getStatusIcon(statusId: number | null): string {
    if (statusId === null) return 'fas fa-question-circle';
    
    switch (statusId) {
      case ServiceStatus.Accept:
        return 'fas fa-check-circle';
      case ServiceStatus.Reject:
        return 'fas fa-times-circle';
      case ServiceStatus.New:
        return 'fas fa-clock'; // Same icon as Wait
      case ServiceStatus.Wait:
        return 'fas fa-clock';
      case ServiceStatus.Received:
        return 'fas fa-inbox';
      case ServiceStatus.ReturnForModifications:
        return 'fas fa-edit';
      case ServiceStatus.RejectForReason:
        return 'fas fa-exclamation-triangle';
      default:
        return 'fas fa-question-circle';
    }
  }

  getStatusLabel(statusId: number | null): string {
    if (statusId === null) return 'WORKFLOW.STATUS_UNKNOWN';
    
    switch (statusId) {
      case ServiceStatus.Accept:
        return 'WORKFLOW.STATUS_ACCEPT';
      case ServiceStatus.Reject:
        return 'WORKFLOW.STATUS_REJECT';
      case ServiceStatus.New:
        return 'WORKFLOW.STATUS_NEW';
      case ServiceStatus.Wait:
        return 'WORKFLOW.STATUS_WAITING';
      case ServiceStatus.Received:
        return 'WORKFLOW.STATUS_RECEIVED';
      case ServiceStatus.ReturnForModifications:
        return 'WORKFLOW.STATUS_RETURN_FOR_MODIFICATIONS';
      case ServiceStatus.RejectForReason:
        return 'WORKFLOW.STATUS_REJECT_FOR_REASON';
      default:
        return 'WORKFLOW.STATUS_UNKNOWN';
    }
  }

  isStepCompleted(statusId: number | null): boolean {
    if (statusId === null) return false;
    return statusId === ServiceStatus.Accept || statusId === ServiceStatus.Received;
  }

  isStepRejected(statusId: number | null): boolean {
    if (statusId === null) return false;
    return statusId === ServiceStatus.Reject || statusId === ServiceStatus.RejectForReason;
  }

  isStepPending(statusId: number | null): boolean {
    if (statusId === null) return false;
    return statusId === ServiceStatus.Wait;
  }

  // TrackBy function for workflow steps
  trackByStepId(index: number, step: WorkFlowStepDto): number {
    return step.id || index;
  }


  historyForModal: any[] = [];
  private historyModalInstance: any = null;
  openHistoryModal(history: any[] = []): void {
    this.historyForModal = (history || []).slice().sort((a, b) =>
      new Date(b.historyDate).getTime() - new Date(a.historyDate).getTime()
    );

    const el = document.getElementById('historyModal');
    if (el) {
      if (this.historyModalInstance) {
        this.historyModalInstance.dispose();
      }
      this.historyModalInstance = new (window as any).bootstrap.Modal(el, {
        backdrop: 'static',
        keyboard: false
      });
      this.historyModalInstance.show();
    }
  }

  closeHistoryModal(): void {
    if (this.historyModalInstance) {
      this.historyModalInstance.hide();
    }
  }

  getHistoryNote(h: any): string {
    const lang = (this.translate?.currentLang || localStorage.getItem('lang') || 'ar').toLowerCase();
    if (lang.startsWith('ar')) {
      return h?.noteAr || h?.serviceStatusName || '';
    }
    return h?.noteEn || h?.serviceStatusName || '';
  }

  get isApproved(): boolean {
    const lang = (this.translate?.currentLang || localStorage.getItem('lang') || 'ar').toLowerCase();

    if (lang.startsWith('ar')) {
      return this.mainApplyService?.serviceStatusName?.includes('معتمد') ?? false;
    }
    else {
      return this.mainApplyService?.serviceStatusName?.includes('Approved') ?? false;
    }
  }


  printReport(): void {
    const serviceId = this.mainApplyService?.serviceId ?? 0;
    const id = this.mainApplyService?.id ?? '';
    var serviceStatusName = null
    const lang = (this.translate?.currentLang || localStorage.getItem('lang') || 'ar').toLowerCase();
    if (lang.startsWith('ar')) {
      serviceStatusName =
        (this.mainApplyService?.serviceStatusName?.includes("معتمد") ?? false)
          ? 'final'
          : 'initial';
    }
    else {
      serviceStatusName =
        (this.mainApplyService?.serviceStatusName?.includes("Approved") ?? false)
          ? 'final'
          : 'initial';
    }

    this.mainApplyServiceReportService.printDatabyId(id.toString(), serviceId, serviceStatusName)
  }
}
