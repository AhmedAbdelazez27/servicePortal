import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { NgSelectModule } from '@ng-select/ng-select';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
// import * as L from 'leaflet';
import { GoogleMapsLoaderService } from '../../../core/services/google-maps-loader.service';
import { ColDef } from 'ag-grid-community';
import { environment } from '../../../../environments/environment';

import { MainApplyService } from '../../../core/services/mainApplyService/mainApplyService.service';
import { WorkFlowCommentsService } from '../../../core/services/workFlowComments/workFlowComments.service';
import { AttachmentService } from '../../../core/services/attachments/attachment.service';
import { AuthService } from '../../../core/services/auth.service';

import { 
  mainApplyServiceDto, 
  FastingTentServiceDto,
  WorkFlowStepDto,
  WorkFlowCommentDto,
  PartnerDto,
  LocationDto,
  AttachmentDto as PartnerAttachmentDto
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
  selector: 'app-view-fasting-tent-request',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    TranslateModule,
    NgSelectModule,
    RouterLink
    
  ],
  templateUrl: './view-fasting-tent-request.component.html',
  styleUrl: './view-fasting-tent-request.component.scss',
})
export class ViewFastingTentRequestComponent implements OnInit, OnDestroy {
  // Tab management
  currentTab: number = 1; 
  totalTabs: number = 7; // Added workflow steps tab and workflow comments tab

  // Data properties
  mainApplyService: mainApplyServiceDto | null = null;
  fastingTentService: FastingTentServiceDto | null = null;
  workFlowSteps: WorkFlowStepDto[] = [];
  partners: PartnerDto[] = [];
  attachments: any[] = []; // Keep as any[] for main service attachments
  targetWorkFlowStep: WorkFlowStepDto | null = null;
  workFlowComments: WorkFlowCommentDto[] = [];
  
  // Generic table properties for workflow comments
  allWorkFlowComments: any[] = [];
  commentsColumnDefs: ColDef[] = [];
  commentsColumnHeaderMap: { [key: string]: string } = {};
  
  // Comment attachments loaded from API
  allCommentAttachments: AttachmentDto[] = [];
  isCommentAttachmentsLoaded = false;
  isLoadingCommentAttachments = false;
  
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
  currentUserName = '';

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
  commentAttachments: { [key: number]: { fileBase64: string; fileName: string; attConfigID: number }[] } = {};
  commentSelectedFiles: { [key: number]: File[] } = {};
  commentFilePreviews: { [key: number]: string[] } = {};
  isCommentDragOver = false;
  commentValidationSubmitted = false;

  // Subscriptions
  private subscriptions: Subscription[] = [];
  lastMatchingWorkFlowStep: any = null;



  serviceName: string | null = null;
  serviceStatusName: string | null = null;
  lastStatus: string | null = null;
  serviceId: string | null = null;
  id: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private mainApplyServiceService: MainApplyService,
    private workFlowCommentsService: WorkFlowCommentsService,
    private attachmentService: AttachmentService,
    private toastr: ToastrService,
    private translate: TranslateService,
    private cdr: ChangeDetectorRef,
    private authService: AuthService,
    private googleMapsLoader: GoogleMapsLoaderService,
    private mainApplyServiceReportService:MainApplyServiceReportService
  ) {
    this.initializeCommentForm();

    // Initialize current user name
    const currentUser = this.authService.getCurrentUser();
    this.currentUserName = currentUser?.name || 'User';
  }

  private accordionEventListener: (() => void) | null = null;

  ngOnInit(): void {
    this.loadMainApplyServiceData();
    this.loadCommentAttachmentConfigs();
    this.setupAccordionEventListener();
    
    // Add window resize listener for map responsiveness
    window.addEventListener('resize', this.onWindowResize.bind(this));
    
    // Add window focus listener to refresh map when tab becomes active
    window.addEventListener('focus', this.onWindowFocus.bind(this));
  }

  /**
   * Setup event listener for comments accordion
   */
  private setupAccordionEventListener(): void {
    // Wait for DOM to be ready
    setTimeout(() => {
      const accordionElement = document.getElementById('wfComments');
      if (accordionElement) {
        this.accordionEventListener = () => {
          this.loadCommentAttachments();
        };
        accordionElement.addEventListener('shown.bs.collapse', this.accordionEventListener);
      }
    }, 500);
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
        if (this.map) {
          // Trigger resize event for Google Maps
          const google = (window as any).google;
          if (google && google.maps && google.maps.event) {
            google.maps.event.trigger(this.map, 'resize');
          }
        }
      }, 100);
    }
  }

  private onWindowFocus(): void {
    // Refresh map when window gains focus (e.g., when switching back to tab)
    if (this.fastingTentService?.location?.locationCoordinates) {
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
    if (this.fastingTentService?.location?.locationCoordinates) {
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
      this.toastr.error(this.translate.instant('COMMON.INVALID_ID'));
      this.router.navigate(['/']);
      return;
    }

    this.isLoading = true;
    const subscription = this.mainApplyServiceService.getDetailById({ id }).subscribe({
      next: (response) => {
        this.mainApplyService = response;
        this.fastingTentService = response.fastingTentService;
        this.workFlowSteps = response.workFlowSteps || [];
        this.partners = response.partners || [];
        this.attachments = response.attachments || [];
        const validStatuses = [1, 2, 7];

        const lastStep = this.workFlowSteps[this.workFlowSteps.length - 1];

        const matchingSteps = this.workFlowSteps.filter(step =>
          validStatuses.includes(step.serviceStatus ?? -1)
        );

        this.lastMatchingWorkFlowStep = null;

        if (lastStep && !validStatuses.includes(lastStep.serviceStatus ?? -1)) {
          const hasApprovedBefore = this.workFlowSteps.some(step => step.serviceStatus === 1);
          if (hasApprovedBefore) {
            this.lastMatchingWorkFlowStep = null;
          } else {
            this.lastMatchingWorkFlowStep = matchingSteps.length
              ? matchingSteps[matchingSteps.length - 1]
              : null;
          }
        } else {
          this.lastMatchingWorkFlowStep = matchingSteps.length
            ? matchingSteps[matchingSteps.length - 1]
            : null;
        }

        this.findTargetWorkFlowStep();
        // if (this.targetWorkFlowStep) {
          
          this.loadWorkFlowComments();
        // }else{
          
        // }
        
        // Initialize map when data is loaded and coordinates are available
        if (this.fastingTentService?.location?.locationCoordinates) {
          setTimeout(() => this.initializeMap(), 500);
        }
        
        this.isLoading = false;
      },
      error: (error) => {
        this.toastr.error(this.translate.instant('COMMON.ERROR_LOADING_DATA'));
        this.isLoading = false;
        this.router.navigate(['/']);
      }
    });
    this.subscriptions.push(subscription);
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
    
    if (!this.fastingTentService?.location?.locationCoordinates) {
      this.toastr.warning('No location coordinates available to display on map');
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
      
      if (!mapElement) {
        this.toastr.error('Map container not found');
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

      if (!this.fastingTentService?.location?.locationCoordinates) {
        this.toastr.error('No location coordinates available');
        this.mapLoadError = true;
        return;
      }

      // Enhanced coordinate parsing with multiple format support
      let coordinates: string[] = [];
      const coordString = this.fastingTentService.location.locationCoordinates;
      
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
          this.toastr.error(this.translate.instant('FASTING_TENT.INVALID_COORDINATES_SEPARATOR', { 0: coordString }));
          this.mapLoadError = true;
          return;
        }
      }
      
      if (coordinates.length !== 2) {
        this.toastr.error(this.translate.instant('FASTING_TENT.INVALID_COORDINATES_COUNT', { 0: coordinates.length }));
        this.mapLoadError = true;
        return;
      }

      const lat = parseFloat(coordinates[0].trim());
      const lng = parseFloat(coordinates[1].trim());
      


      // Check if coordinates are valid numbers
      if (isNaN(lat) || isNaN(lng)) {

        this.toastr.error(this.translate.instant('FASTING_TENT.INVALID_COORDINATES_NUMBERS'));
        this.mapLoadError = true;
        return;
      }

      // Check if coordinates are reasonable (not 0,0 which is usually invalid)
      if (lat === 0 && lng === 0) {

        this.toastr.warning(this.translate.instant('FASTING_TENT.INVALID_COORDINATES_ZERO'));
      }

      // Check if coordinates are within reasonable ranges
      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {

        this.toastr.error(this.translate.instant('FASTING_TENT.INVALID_COORDINATES_RANGE'));
        this.mapLoadError = true;
        return;
      }

      // Validate coordinate ranges (roughly UAE bounds)
      if (lat < 22 || lat > 27 || lng < 51 || lng > 57) {
        // Removed UAE bounds validation toast to prevent unwanted error messages
        // Coordinates outside UAE bounds will still be validated for basic validity above
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
          this.toastr.error(this.translate.instant('FASTING_TENT.MAP_CREATION_FAILED'));
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
      // this.toastr.error('Failed to initialize map');
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
    Object.values(this.commentAttachments).forEach(attachmentArray => {
      if (Array.isArray(attachmentArray)) {
        attachmentArray.forEach(attachment => {
          if (attachment.fileBase64 && attachment.fileName) {
            attachments.push({
              fileName: attachment.fileName,
              fileBase64: attachment.fileBase64,
              attConfigID: attachment.attConfigID
            });
          }
        });
      }
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
    return config.nameEn || config.name || 'Attachment';
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

    if (!this.commentSelectedFiles[configId]) {
      this.commentSelectedFiles[configId] = [];
    }
    this.commentSelectedFiles[configId].push(file);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      if (!this.commentFilePreviews[configId]) {
        this.commentFilePreviews[configId] = [];
      }
      this.commentFilePreviews[configId].push(e.target?.result as string);
      
      // Ensure the attachment array exists
      if (!this.commentAttachments[configId]) {
        this.commentAttachments[configId] = [];
      }
      
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

  /**
   * Load all comment attachments when comments accordion is opened
   */
  loadCommentAttachments(): void {
    // If already loaded, skip
    if (this.isCommentAttachmentsLoaded || this.isLoadingCommentAttachments) {
      return;
    }

    // Get all comment IDs
    const commentIds = this.allWorkFlowComments.map(comment => comment.id).filter(id => id != null);
    
    if (commentIds.length === 0) {
      this.isCommentAttachmentsLoaded = true;
      return;
    }

    this.isLoadingCommentAttachments = true;

    // Use getList to get attachments for all comments at once
    const parameters: GetAllAttachmentsParamters = {
      skip: 0,
      take: 1000, // Get enough to cover all comments
      masterIds: commentIds,
      masterType: 1003 // Comment master type
    };

    const sub = this.attachmentService.getList(parameters).subscribe({
      next: (result: any) => {
        const attachments = result.data || result.items || [];
        this.allCommentAttachments = attachments.map((x: any) => ({
          id: x.id,
          masterId: x.masterId,
          imgPath: x.imgPath,
          masterType: x.masterType,
          attachmentTitle: x.attachmentTitle,
          lastModified: x.lastModified,
          attConfigID: x.attConfigID
        }));
        this.isCommentAttachmentsLoaded = true;
        this.isLoadingCommentAttachments = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading comment attachments:', error);
        this.isLoadingCommentAttachments = false;
        // Don't show error to user, just log it
      }
    });
    this.subscriptions.push(sub);
  }

  /**
   * Check if a comment has attachments
   */
  hasCommentAttachments(commentId: number): boolean {
    if (!this.isCommentAttachmentsLoaded) {
      return false;
    }
    return this.allCommentAttachments.some(att => att.masterId === commentId);
  }

  /**
   * Get attachments for a specific comment
   */
  getCommentAttachments(commentId: number): AttachmentDto[] {
    if (!this.isCommentAttachmentsLoaded) {
      return [];
    }
    return this.allCommentAttachments.filter(att => att.masterId === commentId);
  }

  viewCommentAttachments(comment: any): void {
    // Use cached attachments if available
    if (this.isCommentAttachmentsLoaded && comment.id) {
      const attachments = this.getCommentAttachments(comment.id);
      if (attachments.length > 0) {
        this.selectedCommentAttachments = attachments;
        this.openAttachmentModal();
        return;
      }
    }
    
    // Fallback to old method if attachments property exists
    if (comment.attachments && comment.attachments.length > 0) {
      this.selectedCommentAttachments = comment.attachments;
      this.openAttachmentModal();
    }
  }

  fetchAndViewCommentAttachments(commentId: number): void {
    this.isLoadingAttachments = true;
    this.selectedCommentAttachments = [];
    this.openAttachmentModal();

    // Use cached attachments if available
    if (this.isCommentAttachmentsLoaded) {
      this.selectedCommentAttachments = this.getCommentAttachments(commentId);
      this.isLoadingAttachments = false;
      if (this.selectedCommentAttachments.length === 0) {
        this.toastr.info(this.translate.instant('COMMON.NO_ATTACHMENTS_FOUND'));
      }
      return;
    }

    // Otherwise fetch from API
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

  // Handle table cell clicks for attachment viewing
  onTableCellClick(event: any,id:any) {
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
      1: 'Individual',
      2: 'Organization',
      3: 'Government'
    };
    return types[type] || 'Unknown';
  }

  // Helper to get location photo URL safely
  getLocationPhotoUrl(): string | null {
    const rawPath = this.fastingTentService?.location?.locationPhotoPath
      || this.fastingTentService?.distributionSitePhotoPath
      || null;
    return rawPath ? this.getAttachmentUrl(rawPath) : null;
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
    this.router.navigate(['/mainApplyService']);
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

  // Check if there is at least one approved step in workflow
  get hasApprovedStep(): boolean {
    if (!this.workFlowSteps || this.workFlowSteps.length === 0) {
      return false;
    }
    return this.workFlowSteps.some(step => step.serviceStatus === ServiceStatus.Accept);
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
