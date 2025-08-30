import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { NgSelectModule } from '@ng-select/ng-select';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import * as L from 'leaflet';
import { ColDef } from 'ag-grid-community';
import { GenericDataTableComponent } from '../../../../shared/generic-data-table/generic-data-table.component';
import { environment } from '../../../../environments/environment';

import { MainApplyService } from '../../../core/services/mainApplyService/mainApplyService.service';
import { WorkFlowCommentsService } from '../../../core/services/workFlowComments/workFlowComments.service';
import { AttachmentService } from '../../../core/services/attachments/attachment.service';

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

// Service Status Enum (matching backend enum)
export enum ServiceStatus {
  Accept = 1,
  Reject = 2,
  RejectForReason = 3,
  Wait = 4,
  Received = 5,
  ReturnForModifications = 7
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
    GenericDataTableComponent,
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
  commentAttachments: { [key: number]: { fileBase64: string; fileName: string; attConfigID: number } } = {};
  commentSelectedFiles: { [key: number]: File } = {};
  commentFilePreviews: { [key: number]: string } = {};
  isCommentDragOver = false;
  commentValidationSubmitted = false;

  // Subscriptions
  private subscriptions: Subscription[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private mainApplyServiceService: MainApplyService,
    private workFlowCommentsService: WorkFlowCommentsService,
    private attachmentService: AttachmentService,
    private toastr: ToastrService,
    private translate: TranslateService,
    private cdr: ChangeDetectorRef
  ) {
    this.initializeCommentForm();
    this.initializeMapIcon();
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
      this.map.remove();
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
          this.map.invalidateSize();
        }
      }, 100);
    }
  }

  private onWindowFocus(): void {
    // Refresh map when window gains focus (e.g., when switching back to tab)
    if (this.fastingTentService?.location?.locationCoordinates) {
      setTimeout(() => {
        if (this.map) {
          this.map.invalidateSize();
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

  private initializeMapIcon(): void {
    this.customIcon = L.divIcon({
      className: 'custom-marker',
      html: '<div style="background-color: #ff4444; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3); position: relative;"><div style="position: absolute; bottom: -8px; left: 50%; transform: translateX(-50%); width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-top: 8px solid #ff4444;"></div></div>',
      iconSize: [20, 28],
      iconAnchor: [10, 28],
      popupAnchor: [0, -28],
    });
  }

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
          
          if (commentId) {
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
        
        this.findTargetWorkFlowStep();
        if (this.targetWorkFlowStep) {
          this.loadWorkFlowComments();
        }
        
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
      // Sort by stepOrder ascending and find first with serviceStatus = 4
      const sortedSteps = this.workFlowSteps
        .filter(step => step.stepOrder !== null)
        .sort((a, b) => (a.stepOrder || 0) - (b.stepOrder || 0));
      
      this.targetWorkFlowStep = sortedSteps.find(step => step.serviceStatus === 4) || null;
    }
  }

  private loadWorkFlowComments(): void {
    // Collect all comments from all workflow steps
    this.allWorkFlowComments = [];
    
    if (this.workFlowSteps && Array.isArray(this.workFlowSteps)) {
      this.workFlowSteps.forEach(step => {
        if (step.workFlowComments && Array.isArray(step.workFlowComments)) {
          step.workFlowComments.forEach(comment => {
            this.allWorkFlowComments.push({
              ...comment,
              stepDepartmentName: step.departmentName, // Include step department info
              stepServiceStatus: step.serviceStatusName
            });
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
        if (marker && marker.remove) {
          marker.remove();
        }
      });
      this.markers = [];
      
      // Remove map
      this.map.remove();
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
    console.log('Initializing map...');
    console.log('Fasting tent service:', this.fastingTentService);
    console.log('Location coordinates:', this.fastingTentService?.location?.locationCoordinates);
    
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
      console.log(`Attempt ${attempts}: Map element found:`, !!mapElement);
      
      if (mapElement) {
        console.log(`Map element dimensions: ${mapElement.offsetWidth}x${mapElement.offsetHeight}`);
        // Check if map container has proper dimensions
        if (mapElement.offsetWidth === 0 || mapElement.offsetHeight === 0) {
          console.log('Map container has zero dimensions, retrying...');
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
        this.toastr.error('Failed to initialize map: map container not found');
      }
    };
    
    setTimeout(checkAndInitialize, 100);
  }

  private setupViewMap(): void {
    try {
      console.log('Setting up view map...');
      // Double-check that the map container exists and has dimensions
      const mapElement = document.getElementById('viewMap');
      console.log('Map element:', mapElement);
      console.log('Map element dimensions:', mapElement?.offsetWidth, 'x', mapElement?.offsetHeight);
      console.log('Map element style:', mapElement?.style.display, mapElement?.style.visibility);
      if (mapElement) {
        const computedStyle = window.getComputedStyle(mapElement);
        console.log('Map element computed style:', {
          display: computedStyle.display,
          visibility: computedStyle.visibility,
          height: computedStyle.height,
          width: computedStyle.width,
          position: computedStyle.position
        });
      }
      if (!mapElement) {
        this.toastr.error('Map container not found');
        this.mapLoadError = true;
        return;
      }
      
      if (mapElement.offsetWidth === 0 || mapElement.offsetHeight === 0) {
        console.log('Map container has zero dimensions, ensuring proper CSS...');
        
        // Check if element is actually in the document
        if (!document.contains(mapElement)) {
          console.log('Map element is not in document, retrying...');
          setTimeout(() => this.setupViewMap(), 1000);
          return;
        }
        
        // Check if element is visible
        const computedStyle = window.getComputedStyle(mapElement);
        if (computedStyle.display === 'none' || computedStyle.visibility === 'hidden') {
          console.log('Map element is hidden by CSS, retrying...');
          setTimeout(() => this.setupViewMap(), 1000);
          return;
        }
        
        // Check if element is in viewport
        const rect = mapElement.getBoundingClientRect();
        if (rect.bottom < 0 || rect.top > window.innerHeight || rect.right < 0 || rect.left > window.innerWidth) {
          console.log('Map element is not in viewport, retrying...');
          setTimeout(() => this.setupViewMap(), 1000);
          return;
        }
        
        // Check if element has content or is empty
        if (mapElement.children.length === 0 && mapElement.innerHTML.trim() === '') {
          console.log('Map element is empty, this is good for initialization');
        } else {
          console.log('Map element has content, clearing it for initialization');
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
          console.log('Map container still has zero dimensions after CSS fix, checking if element is in viewport...');
          
          // Check if element is in viewport
          const rect = mapElement.getBoundingClientRect();
          console.log('Map element bounding rect:', rect);
          
          if (rect.width === 0 || rect.height === 0) {
            console.log('Map element has zero bounding rect, retrying...');
            setTimeout(() => this.setupViewMap(), 1000);
            return;
          }
        }
      }
      
      if (this.map) {
        this.map.remove();
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
      console.log('Coordinate string:', coordString);
      
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
      console.log('Parsed coordinates:', { lat, lng });
      


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
       
        this.toastr.warning(this.translate.instant('FASTING_TENT.INVALID_COORDINATES_UAE'));
      }

      try {
        console.log('Creating map with coordinates:', [lat, lng]);
        console.log('Leaflet available:', typeof L);
        console.log('Leaflet map function:', typeof L.map);
        this.map = L.map('viewMap').setView([lat, lng], 15);
        console.log('Map created successfully:', this.map);
      } catch (mapError) {
        this.toastr.error(this.translate.instant('FASTING_TENT.MAP_CREATION_FAILED'));
        this.mapLoadError = true;
        return;
      }

      // Add tile layer with fallback
      try {
        const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
          maxZoom: 19,
          minZoom: 5,
          crossOrigin: true,
        });
        
        // Add error handler for tile loading issues
        tileLayer.on('tileerror', (error) => {
          // Fallback to alternative tile server
          this.addFallbackTileLayer();
        });
        
        tileLayer.addTo(this.map);
      } catch (tileError) {
        this.toastr.error(this.translate.instant('FASTING_TENT.MAP_TILES_FAILED'));
        this.mapLoadError = true;
        return;
      }

      // Add marker for the location
      try {
        const marker = L.marker([lat, lng], { icon: this.customIcon })
          .addTo(this.map)
          .bindPopup(this.fastingTentService.location.locationName || this.translate.instant('FASTING_TENT.SELECTED_LOCATION'))
          .openPopup();

        this.markers = [marker];
      } catch (markerError) {
        this.toastr.error('Failed to add location marker');
        this.mapLoadError = true;
        return;
      }

      // Force map refresh after a short delay to ensure proper rendering
      setTimeout(() => {
        if (this.map) {
          this.map.invalidateSize();
          
          // Check if tiles are loaded
          const tileLayersLoaded = this.checkTileLayersLoaded();
          if (!tileLayersLoaded) {
            this.addFallbackTileLayer();
          }
        }
      }, 1000);

      this.mapLoadError = false;

    } catch (error) {
      this.toastr.error('Failed to initialize map');
      this.mapLoadError = true;
    }
  }

  private addFallbackTileLayer(): void {
    // Remove existing tile layers first
    this.map.eachLayer((layer: any) => {
      if (layer instanceof L.TileLayer) {
        this.map.removeLayer(layer);
      }
    });

    // Add alternative tile layer
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors (fallback)',
      maxZoom: 19,
      minZoom: 5,
    }).addTo(this.map);
    
    this.toastr.info('Using fallback map tiles');
  }

  private checkTileLayersLoaded(): boolean {
    try {
      const mapContainer = document.getElementById('viewMap');
      if (!mapContainer) return false;
      
      const leafletTiles = mapContainer.querySelectorAll('.leaflet-tile');
      const loadedTiles = mapContainer.querySelectorAll('.leaflet-tile-loaded');
      
    
      // If we have some tiles and at least 50% are loaded, consider it successful
      return leafletTiles.length > 0 && (loadedTiles.length / leafletTiles.length) >= 0.5;
    } catch (error) {
      return false;
    }
  }

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
        this.commentAttachments[config.id] = {
          fileBase64: '',
          fileName: '',
          attConfigID: config.id
        };
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
      !this.commentSelectedFiles[config.id!] && !this.commentFilePreviews[config.id!]
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
      if (attachment.fileBase64 && attachment.fileName) {
        attachments.push({
          fileName: attachment.fileName,
          fileBase64: attachment.fileBase64,
          attConfigID: attachment.attConfigID
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
    if (target?.files?.[0]) {
      this.handleCommentFileUpload(target.files[0], configId);
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
    if (files?.[0]) {
      this.handleCommentFileUpload(files[0], configId);
    }
  }

  handleCommentFileUpload(file: File, configId: number): void {
    if (!this.validateCommentFile(file)) {
      return;
    }

    this.commentSelectedFiles[configId] = file;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      this.commentFilePreviews[configId] = e.target?.result as string;
      
      // Ensure the attachment object exists
      if (!this.commentAttachments[configId]) {
        this.commentAttachments[configId] = {
          fileBase64: '',
          fileName: '',
          attConfigID: configId
        };
      }
      
      const base64String = (e.target?.result as string).split(',')[1];
      this.commentAttachments[configId] = {
        ...this.commentAttachments[configId],
        fileBase64: base64String,
        fileName: file.name
      };
      
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

  removeCommentFile(configId: number): void {
    delete this.commentSelectedFiles[configId];
    delete this.commentFilePreviews[configId];
    
    if (this.commentAttachments[configId]) {
      this.commentAttachments[configId] = {
        ...this.commentAttachments[configId],
        fileBase64: '',
        fileName: ''
      };
    }
    
    this.cdr.detectChanges();
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

  // Handle table cell clicks for attachment viewing
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
    return d.toLocaleDateString();
  }

  formatDateTime(date: Date | string | null): string {
    if (!date) return '';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleString();
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
      case ServiceStatus.RejectForReason:
        return '#fd7e14'; // Orange
      case ServiceStatus.Wait:
        return '#ffc107'; // Yellow/Amber
      case ServiceStatus.Received:
        return '#17a2b8'; // Cyan/Teal
      case ServiceStatus.ReturnForModifications:
        return '#6f42c1'; // Purple
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
      case ServiceStatus.RejectForReason:
        return 'fas fa-exclamation-triangle';
      case ServiceStatus.Wait:
        return 'fas fa-clock';
      case ServiceStatus.Received:
        return 'fas fa-inbox';
      case ServiceStatus.ReturnForModifications:
        return 'fas fa-edit';
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
      case ServiceStatus.RejectForReason:
        return 'WORKFLOW.STATUS_REJECT_FOR_REASON';
      case ServiceStatus.Wait:
        return 'WORKFLOW.STATUS_WAITING';
      case ServiceStatus.Received:
        return 'WORKFLOW.STATUS_RECEIVED';
      case ServiceStatus.ReturnForModifications:
        return 'WORKFLOW.STATUS_RETURN_FOR_MODIFICATIONS';
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


}
