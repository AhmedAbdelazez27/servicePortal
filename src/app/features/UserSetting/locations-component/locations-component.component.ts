import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { ColDef } from 'ag-grid-community';
import { NgSelectModule } from '@ng-select/ng-select';
import { GenericDataTableComponent } from '../../../../shared/generic-data-table/generic-data-table.component';
import { LocationService } from '../../../core/services/UserSetting/location.service';
import { RegionService } from '../../../core/services/UserSetting/region.service';
import { LocationTypeService } from '../../../core/services/location-type.service';
import { AttachmentService } from '../../../core/services/attachments/attachment.service';
import { SpinnerService } from '../../../core/services/spinner.service';
import { environment } from '../../../../environments/environment';
import {
  LocationDto,
  CreateLocationDto,
  UpdateLocationDto,
  GetAllLocationParameter,
  AttachmentBase64Dto,
  AttachmentDto,
} from '../../../core/dtos/UserSetting/locations/location.dto';
import {
  AttachmentsConfigType,
  AttachmentsConfigDto,
} from '../../../core/dtos/attachments/attachments-config.dto';
import { UpdateAttachmentBase64Dto } from '../../../core/dtos/attachments/attachment.dto';
import { forkJoin } from 'rxjs';
import * as L from 'leaflet'; 

@Component({
  selector: 'app-locations-component',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    TranslateModule,
    NgSelectModule,
    GenericDataTableComponent,
  ],
  templateUrl: './locations-component.component.html',
  styleUrl: './locations-component.component.scss',
})
export class LocationsComponentComponent implements OnInit, OnDestroy {
  locations: LocationDto[] = [];
  totalCount: number = 0;
  currentPage: number = 0;
  pageSize: number = 10;
  searchValue: string = '';
  locationForm: FormGroup;
  submitted: boolean = false;
  mode: 'add' | 'edit' | 'view' = 'add';
  editingLocationId: number | null = null;
  selectedLocationToDelete: LocationDto | null = null;
  currentViewLocation: LocationDto | null = null;
  isLoading: boolean = false;
  selectedAttachmentToDelete: AttachmentDto | null = null;

  // Dropdown data
  regions: any[] = [];
  locationTypes: any[] = [];
  attachmentConfigs: AttachmentsConfigDto[] = [];
  isLoadingDropdowns: boolean = false;

  // Map variables
  map: any;
  marker: any;
  selectedCoordinates: { lat: number; lng: number } | null = null;
  customIcon: any;

  // File upload
  selectedFile: File | null = null;
  filePreview: string | null = null;
  existingAttachment: AttachmentDto | null = null;
  existingImageUrl: string | null = null;
  isDragOver: boolean = false;
  uploadProgress: number = 0;
  fileValidationErrors: string[] = [];
  fileValidationSuccess: boolean = false;

  // AG Grid column definitions
  columnDefs: ColDef[] = [
    {
      headerName: '#',
      width: 80,
      sortable: false,
      valueGetter: (params: any) => {
        return this.currentPage * this.pageSize + params.node.rowIndex + 1;
      },
    },
    {
      field: 'locationName',
      headerName: 'Location Name',
      sortable: true,
      filter: true,
      width: 150,
    },
    {
      field: 'locationType',
      headerName: 'Location Type',
      sortable: true,
      filter: true,
      width: 120,
    },
    {
      field: 'regionName',
      headerName: 'Region',
      sortable: true,
      filter: true,
      width: 120,
    },
    {
      field: 'street',
      headerName: 'Street',
      sortable: true,
      filter: true,
      width: 150,
    },
    {
      field: 'isActive',
      headerName: 'Status',
      width: 100,
      sortable: true,
      cellRenderer: (params: any) => {
        return params.value
          ? '<span class="status-active">Active</span>'
          : '<span class="status-inactive">Inactive</span>';
      },
    },
  ];

  rowActions = [
    { label: 'View', action: 'view', icon: 'icon-frame-view' },
    { label: 'Edit', action: 'edit', icon: 'icon-frame-edit' },
    { label: 'Delete', action: 'delete', icon: 'icon-frame-delete' },
  ];

  constructor(
    private locationService: LocationService,
    private regionService: RegionService,
    private locationTypeService: LocationTypeService,
    private attachmentService: AttachmentService,
    private spinnerService: SpinnerService,
    private toastr: ToastrService,
    public translate: TranslateService,
    private fb: FormBuilder
  ) {
    this.locationForm = this.fb.group({
      locationName: ['', [Validators.required, Validators.minLength(2)]],
      address: ['', [Validators.required]],
      street: [''],
      regionId: [null, [Validators.required]],
      locationTypeId: [null, [Validators.required]],
      isActive: [true],
      notes: [''],
      locationCoordinates: [''],
    });
  }

  ngOnInit(): void {
    this.loadLocations();
    this.loadRegionsAndLocationTypes();
    this.loadAttachmentsConfig();
    this.initializeCustomIcon();
  }

  ngOnDestroy(): void {
    if (this.map) {
      this.map.remove();
    }
  }

  initializeCustomIcon(): void {
    this.customIcon = L.divIcon({
      className: 'custom-marker',
      html: '<div style="background-color: #ff4444; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3); position: relative;"><div style="position: absolute; bottom: -8px; left: 50%; transform: translateX(-50%); width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-top: 8px solid #ff4444;"></div></div>',
      iconSize: [20, 28],
      iconAnchor: [10, 28],
      popupAnchor: [0, -28],
    });
  }

  loadLocations(): void {
    this.isLoading = true;
    this.spinnerService.show();

    const params: GetAllLocationParameter = {
      skip: this.currentPage * this.pageSize,
      take: this.pageSize,
      searchValue: this.searchValue,
    };

    this.locationService.getAllAsync(params).subscribe({
      next: (data: any) => {
        const { items, totalCount } = this.normalizeResponse(data);

        this.locations = items.map((location) => ({
          ...location,
          locationType:
            this.getLocationTypeDisplayText(location.locationTypeId) ||
            location.locationType ||
            '',
          regionName:
            this.getRegionDisplayText(location.regionId) ||
            location.regionName ||
            '',
        }));

        this.totalCount = totalCount;
        this.isLoading = false;
        this.spinnerService.hide();
      },
      error: (error: any) => {
        this.toastr.error('Error loading locations');
        this.isLoading = false;
        this.spinnerService.hide();
      },
    });
  }

  // Load only regions and location types (for both add and edit modes)
  private loadRegionsAndLocationTypes(): void {
    this.isLoadingDropdowns = true;

    forkJoin({
      regions: this.regionService.getRegionsSelect2ListAsync({
        skip: 0,
        take: 1000,
      }),
      locationTypes: this.locationTypeService.getLocationTypesSelect2(0, 1000),
    }).subscribe({
      next: (result) => {
        this.regions = this.normalizeDropdownData(result.regions);
        this.locationTypes = this.normalizeDropdownData(result.locationTypes);
        this.isLoadingDropdowns = false;
      },
      error: (error) => {
        this.toastr.error('Error loading dropdown data');
        this.isLoadingDropdowns = false;
        this.regions = [];
        this.locationTypes = [];
      },
    });
  }

  // Load only attachment configs (for add mode only)
  private loadAttachmentsConfig(): void {
    this.attachmentService
      .getAttachmentsConfigByType(AttachmentsConfigType.LocationImage)
      .subscribe({
        next: (result: AttachmentsConfigDto[]) => {
          this.attachmentConfigs = result || [];

          if (this.attachmentConfigs.length === 0) {
            // No attachment configurations found for LocationImage type
          }
        },

        error: (error) => {
          this.toastr.error('Error loading attachment configuration');
          this.attachmentConfigs = [];
        },
      });
  }

  private normalizeResponse(data: any): { items: any[]; totalCount: number } {
    if (data?.data) {
      return {
        items: data.data,
        totalCount: data.totalCount || data.total || data.data.length,
      };
    }
    if (data?.items) {
      return { items: data.items, totalCount: data.totalCount || 0 };
    }
    if (Array.isArray(data)) {
      return { items: data, totalCount: data.length };
    }
    if (data?.results) {
      return {
        items: data.results,
        totalCount: data.total || data.results.length,
      };
    }
    return { items: [], totalCount: 0 };
  }

  private normalizeDropdownData(data: any): any[] {
    if (data?.results) {
      return data.results.map((item: any) => ({
        ...item,
        id: item.id.toString(),
      }));
    }
    if (Array.isArray(data)) {
      return data.map((item: any) => ({ ...item, id: item.id.toString() }));
    }
    if (data?.data) {
      return data.data.map((item: any) => ({
        ...item,
        id: item.id.toString(),
      }));
    }
    return [];
  }

  onPageChange(event: { pageNumber: number; pageSize: number }): void {
    this.currentPage = event.pageNumber - 1;
    this.pageSize = event.pageSize;
    this.loadLocations();
  }

  onSearch(searchText?: string): void {
    if (searchText !== undefined) {
      this.searchValue = searchText;
    }
    this.currentPage = 0;
    this.loadLocations();
  }

  clear(): void {
    this.searchValue = '';
    this.currentPage = 0;
    this.loadLocations();
  }

  onActionClick(event: { action: string; row: any }): void {
    const location = event.row as LocationDto;

    switch (event.action) {
      case 'view':
        this.openViewModal(location);
        break;
      case 'edit':
        this.openEditModal(location);
        break;
      case 'delete':
        this.selectLocationToDelete(location);
        break;
    }
  }

  openAddModal(): void {
    this.resetModalState('add').then(() => {
      this.locationForm.enable();
      this.showModal();
    });
  }

  openEditModal(location: LocationDto): void {
    // Fetch full location details including attachments
    this.locationService.getById(location.id).subscribe({
      next: async (fullLocation: LocationDto) => {
        await this.resetModalState('edit', fullLocation);

        // If no attachment data, try to fetch it separately
        if (!fullLocation.attachment && location.id) {
          this.fetchAttachmentData(location.id);
        }

        this.populateForm(fullLocation);
        this.locationForm.enable();
        this.showModal();
      },
      error: async (error) => {
        this.toastr.error('Error loading location details');
        // Fallback to using the location from the list
        await this.resetModalState('edit', location);

        // If no attachment data, try to fetch it separately
        if (!location.attachment && location.id) {
          this.fetchAttachmentData(location.id);
        }

        this.populateForm(location);
        this.locationForm.enable();
        this.showModal();
      },
    });
  }

  /**
   * Clears browser cache for images by creating a new Image object
   */
  private clearImageCache(imageUrl: string): void {
    if ('caches' in window) {
      // Clear cache for the specific image URL
      caches.keys().then((cacheNames) => {
        cacheNames.forEach((cacheName) => {
          caches.open(cacheName).then((cache) => {
            cache.delete(imageUrl);
          });
        });
      });
    }
  }

  /**
   * Forces a refresh of the image by clearing and rebuilding the URL
   */
  private forceRefreshImage(): void {
    if (this.existingAttachment?.imgPath) {
      // Clear the current URL first
      const oldUrl = this.existingImageUrl;
      this.existingImageUrl = null;

      // Clear browser cache for the old URL
      if (oldUrl) {
        this.clearImageCache(oldUrl);
      }

      // Force a small delay to ensure the DOM updates
      setTimeout(() => {
        const imageUrl = this.constructImageUrl(
          this.existingAttachment!.imgPath!
        );
        this.existingImageUrl = imageUrl;
      }, 200);
    }
  }

  openViewModal(location: LocationDto): void {
    // Fetch full location details including attachments
    this.locationService.getById(location.id).subscribe({
      next: async (fullLocation: LocationDto) => {
        await this.resetModalState('view', fullLocation);

        // Always fetch fresh attachment data to ensure we get the latest image
        if (location.id) {
          this.fetchAttachmentData(location.id);
        }

        this.populateForm(fullLocation);
        this.locationForm.disable();
        this.showModal();
      },
      error: async (error) => {
        this.toastr.error('Error loading location details');
        // Fallback to using the location from the list
        await this.resetModalState('view', location);

        // Always fetch fresh attachment data even in fallback
        if (location.id) {
          this.fetchAttachmentData(location.id);
        }

        this.populateForm(location);
        this.locationForm.disable();
        this.showModal();
      },
    });
  }

  private async resetModalState(
    mode: 'add' | 'edit' | 'view',
    location?: LocationDto
  ): Promise<void> {
    this.mode = mode;
    this.editingLocationId = location?.id || null;
    this.currentViewLocation = location || null;
    this.submitted = false;
    this.selectedFile = null;
    this.filePreview = null;
    this.existingAttachment = location?.attachment || null;
    this.existingImageUrl = null;
    this.selectedCoordinates = null;
    this.selectedAttachmentToDelete = null;
    this.isDragOver = false;
    this.uploadProgress = 0;
    this.fileValidationErrors = [];
    this.fileValidationSuccess = false;

    if (mode === 'add') {
      this.locationForm.reset({ isActive: true });
    }

    if (this.existingAttachment?.imgPath) {
      // Improved image URL construction with validation
      const imageUrl = this.constructImageUrl(this.existingAttachment.imgPath);

      // Validate the image URL before setting it
      const isValid = await this.validateImageUrl(imageUrl);
      if (isValid) {
        this.existingImageUrl = imageUrl;
      } else {
        this.existingImageUrl = null;
      }
    }
  }

  /**
   * Constructs the full image URL from the imgPath
   * Handles different possible path formats and adds cache-busting
   */
  private constructImageUrl(imgPath: string): string {
    if (!imgPath) return '';

    // Remove leading slash if present to avoid double slashes
    const cleanPath = imgPath.startsWith('/') ? imgPath.substring(1) : imgPath;

    // If the path already contains http/https, return as is
    if (imgPath.startsWith('http://') || imgPath.startsWith('https://')) {
      return imgPath;
    }

    let fullUrl: string;

    // Check if the path starts with 'Uploads' - if so, construct URL without /api
    if (cleanPath.startsWith('Uploads/')) {
      const baseUrl = environment.apiBaseUrl.replace('/api', '');
      fullUrl = `${baseUrl}/${cleanPath}`;
    } else {
      // For other paths, use the full API base URL
      fullUrl = `${environment.apiBaseUrl}/${cleanPath}`;
    }

    // Add cache-busting parameter to prevent browser caching
    const cacheBuster = `?t=${Date.now()}`;
    const urlWithCacheBuster = `${fullUrl}${cacheBuster}`;

    return urlWithCacheBuster;
  }

  /**
   * Handles image load success
   */
  onImageLoad(event: any): void {
    // Image loaded successfully
  }

  /**
   * Handles image load error
   */
  onImageError(event: any): void {
    // Set a fallback image or clear the URL
    const imgElement = event.target;
    if (imgElement) {
      // Option 1: Set a placeholder image
      // imgElement.src = 'assets/images/placeholder-image.png';

      // Option 2: Hide the image and show a message
      imgElement.style.display = 'none';

      // Option 3: Clear the URL to prevent further attempts
      this.existingImageUrl = null;
    }

    // Show error message to user
    this.toastr.error(
      'Failed to load image. The image file may not exist or the server may be unavailable.',
      'Image Load Error'
    );
  }

  /**
   * Validates if an image URL is accessible
   */
  private validateImageUrl(url: string): Promise<boolean> {
    return new Promise((resolve) => {
      if (!url) {
        resolve(false);
        return;
      }

      const img = new Image();
      img.onload = () => {
        resolve(true);
      };
      img.onerror = () => {
        resolve(false);
      };
      img.src = url;
    });
  }

  /**
   * Fetches attachment data for a location if it's missing
   */
  private fetchAttachmentData(locationId: number): void {
    if (!locationId) return;

    // Try to fetch attachment data using the attachment service
    // Using getListByMasterId to get all attachments for the location
    this.attachmentService
      .getListByMasterId(locationId, AttachmentsConfigType.LocationImage)
      .subscribe({
        // Using AttachmentsConfigType.LocationImage (1002) instead of hardcoded 1
        next: async (attachments: AttachmentDto[]) => {
          if (attachments && attachments.length > 0) {
            this.existingAttachment = attachments[0];

            if (this.existingAttachment?.imgPath) {
              // Use force refresh to ensure we get the latest image
              this.forceRefreshImage();
            }
          } else {
            this.existingAttachment = null;
            this.existingImageUrl = null;
          }
        },
        error: (error) => {
          // Handle error silently or add error handling as needed
        },
      });
  }

  private populateForm(location: LocationDto): void {
    this.locationForm.patchValue({
      locationName: location.locationName,
      address: location.address,
      street: location.street,
      regionId: location.regionId?.toString(),
      locationTypeId: location.locationTypeId?.toString(),
      isActive: location.isActive,
      notes: location.notes,
      locationCoordinates: location.locationCoordinates,
    });

    if (location.locationCoordinates) {
      this.parseCoordinates(location.locationCoordinates);
    }
  }

  private parseCoordinates(coordinates: string): void {
    if (!coordinates) return;

    try {
      const coords = JSON.parse(coordinates);
      this.selectedCoordinates = coords;
    } catch {
      try {
        const [lat, lng] = coordinates.split('/').map(Number);
        if (!isNaN(lat) && !isNaN(lng)) {
          this.selectedCoordinates = { lat, lng };
        }
      } catch {
        // Invalid coordinates format
      }
    }
  }

  private showModal(): void {
    const modal = document.getElementById('locationModal');
    if (modal) {
      const bootstrapModal = new (window as any).bootstrap.Modal(modal);
      bootstrapModal.show();
    }
    setTimeout(() => this.initMap(), 500);
  }

  closeModal(): void {
    this.resetModalState('add').then(() => {
      this.locationForm.enable();
      if (this.map) {
        this.map.remove();
        this.map = null;
      }
    });

    // Close attachment deletion modal if it's open
    const deleteAttachmentModal = document.getElementById(
      'deleteAttachmentModal'
    );
    if (deleteAttachmentModal) {
      const modal = new (window as any).bootstrap.Modal(deleteAttachmentModal);
      modal.hide();
    }
  }

  initMap(): void {
    try {
      if (!L || !document.getElementById('locationMap')) return;

      if (this.map) {
        this.map.remove();
        this.map = null;
      }

      setTimeout(() => {
        const defaultLat = 25.2048;
        const defaultLng = 55.2708;

        this.map = L.map('locationMap').setView([defaultLat, defaultLng], 13);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
          maxZoom: 19,
        }).addTo(this.map);

        if (this.selectedCoordinates) {
          this.marker = L.marker(
            [this.selectedCoordinates.lat, this.selectedCoordinates.lng],
            {
              icon: this.customIcon,
            }
          ).addTo(this.map);
          this.map.setView(
            [this.selectedCoordinates.lat, this.selectedCoordinates.lng],
            15
          );
        }

        this.map.on('click', (e: any) => {
          if (this.mode !== 'view') {
            const lat = e.latlng.lat;
            const lng = e.latlng.lng;

            if (this.marker) {
              this.map.removeLayer(this.marker);
            }

            this.marker = L.marker([lat, lng], { icon: this.customIcon }).addTo(
              this.map
            );
            this.selectedCoordinates = { lat, lng };
            this.locationForm.patchValue({
              locationCoordinates: `${lat}/${lng}`,
            });
          }
        });

        setTimeout(() => {
          if (this.map) {
            this.map.invalidateSize();
          }
        }, 200);
      }, 100);
    } catch (error) {
      // Handle map initialization error
    }
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (!file) return;

    this.validateAndSetFile(file);
  }

  removeFile(): void {
    this.selectedFile = null;
    this.filePreview = null;
    this.fileValidationErrors = [];
    this.fileValidationSuccess = false;
    this.uploadProgress = 0;
    const fileInput = document.getElementById(
      'locationImage'
    ) as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  removeExistingImage(): void {
    this.selectedAttachmentToDelete = this.existingAttachment;
    const deleteModal = document.getElementById('deleteAttachmentModal');
    if (deleteModal) {
      const modal = new (window as any).bootstrap.Modal(deleteModal);
      modal.show();
    }
  }

  confirmDeleteAttachment(): void {
    if (!this.selectedAttachmentToDelete) return;

    this.spinnerService.show();
    this.attachmentService
      .deleteAsync(this.selectedAttachmentToDelete.id)
      .subscribe({
        next: () => {
          this.toastr.success('Attachment deleted successfully');
          this.existingAttachment = null;
          this.existingImageUrl = null;
          this.selectedAttachmentToDelete = null;
          this.closeModal();
          this.loadLocations();
          this.spinnerService.hide();
        },
        error: (error) => {
          this.toastr.error('Error deleting attachment');
          this.spinnerService.hide();
        },
      });
  }

  cancelDeleteAttachment(): void {
    this.selectedAttachmentToDelete = null;
  }

  clearCoordinates(): void {
    this.selectedCoordinates = null;
    this.locationForm.patchValue({ locationCoordinates: '' });
    if (this.marker && this.map) {
      this.map.removeLayer(this.marker);
      this.marker = null;
    }
  }

  getCoordinatesFromAddress(): void {
    const address = this.locationForm.get('address')?.value;
    if (!address) {
      this.toastr.warning('Please enter an address first');
      return;
    }

    this.spinnerService.show();

    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
      address
    )}&limit=1`;

    fetch(url)
      .then((response) => response.json())
      .then((data) => {
        this.spinnerService.hide();
        if (data?.length > 0) {
          const result = data[0];
          const lat = parseFloat(result.lat);
          const lng = parseFloat(result.lon);

          this.selectedCoordinates = { lat, lng };
          this.locationForm.patchValue({
            locationCoordinates: `${lat}/${lng}`,
          });

          if (this.map) {
            if (this.marker) {
              this.map.removeLayer(this.marker);
            }
            this.marker = L.marker([lat, lng], { icon: this.customIcon }).addTo(
              this.map
            );
            this.map.setView([lat, lng], 15);
          }

          this.toastr.success('Coordinates found and set on map');
        } else {
          this.toastr.warning('No coordinates found for this address');
        }
      })
      .catch((error) => {
        this.spinnerService.hide();
        this.toastr.error('Error getting coordinates from address');
      });
  }

  /**
   * Updates an existing attachment separately from the location update
   */
  private updateAttachmentSeparately(attachmentDto: AttachmentBase64Dto): void {
    if (!this.existingAttachment?.id) {
      this.spinnerService.hide();
      return;
    }

    const updateAttachmentDto: UpdateAttachmentBase64Dto = {
      id: this.existingAttachment.id,
      fileBase64: attachmentDto.fileBase64,
      fileName: attachmentDto.fileName,
      masterId: attachmentDto.masterId,
      attConfigID: attachmentDto.attConfigID,
    };

    this.attachmentService.updateAsync(updateAttachmentDto).subscribe({
      next: (response) => {
        this.toastr.success('Image updated successfully');
        this.refreshImageAfterUpdate();
        this.closeModal();
        this.loadLocations();
        this.spinnerService.hide();
      },
      error: (error) => {
        this.toastr.error('Error updating image');
        this.spinnerService.hide();
      },
    });
  }

  /**
   * Creates a new attachment separately from the location update
   */
  private createAttachmentSeparately(attachmentDto: AttachmentBase64Dto): void {
    this.attachmentService.saveAttachmentFileBase64(attachmentDto).subscribe({
      next: (response) => {
        this.toastr.success('Image uploaded successfully');
        this.refreshImageAfterUpdate();
        this.closeModal();
        this.loadLocations();
        this.spinnerService.hide();
      },
      error: (error) => {
        this.toastr.error('Error uploading image');
        this.spinnerService.hide();
      },
    });
  }

  /**
   * Manually refreshes the image display after updates
   */
  private refreshImageAfterUpdate(): void {
    if (this.editingLocationId) {
      // Clear current image
      this.existingImageUrl = null;

      // Fetch fresh attachment data
      this.attachmentService
        .getListByMasterId(
          this.editingLocationId,
          AttachmentsConfigType.LocationImage
        )
        .subscribe({
          next: (attachments: AttachmentDto[]) => {
            if (attachments && attachments.length > 0) {
              this.existingAttachment = attachments[0];
              if (this.existingAttachment?.imgPath) {
                // Force refresh with new timestamp
                this.forceRefreshImage();
              }
            }
          },
          error: (error) => {
            // Error refreshing image after update
          },
        });
    }
  }

  async submit(): Promise<void> {
    this.submitted = true;

    if (this.locationForm.invalid) return;

    const locationImageConfig = this.getLocationImageConfig(); // that get form array configration for get id
    const hasExistingAttachment = !!this.existingAttachment;
    const hasNewFile = this.selectedFile;

    if (locationImageConfig) {
      if (this.mode === 'add' && !hasNewFile) {
        this.toastr.error('Location image is required');
        return;
      }
      if (this.mode === 'edit' && !hasExistingAttachment && !hasNewFile) {
        this.toastr.error('Location image is required');
        return;
      }
    }

    this.spinnerService.show();

    try {
      let attachmentDto: AttachmentBase64Dto | null = null;

      if (this.selectedFile && locationImageConfig) {
        const fileBase64 = await this.fileToBase64(this.selectedFile);
        attachmentDto = {
          fileBase64,
          fileName: this.selectedFile.name,
          masterId:
            this.mode === 'edit' && this.editingLocationId
              ? this.editingLocationId
              : 0,
          attConfigID: locationImageConfig.id,
        };
      }
      // Note: If no new file is selected, attachmentDto remains null,
      // which means "don't change the existing attachment" for edit mode

      if (this.mode === 'add') {
        const createDto: CreateLocationDto = {
          ...this.locationForm.value,
          attachment: attachmentDto,
        };

        this.locationService.createAsync(createDto).subscribe({
          next: () => {
            this.toastr.success('Location created successfully');
            this.closeModal();
            this.loadLocations();
            this.spinnerService.hide();
          },
          error: (error) => {
            this.toastr.error('Error creating location');
            this.spinnerService.hide();
          },
        });
      } else if (this.mode === 'edit' && this.editingLocationId) {
        const updateDto: UpdateLocationDto = {
          id: this.editingLocationId,
          ...this.locationForm.value,
          // Don't send attachment in location update since backend doesn't handle it
          attachment: undefined,
        };

        this.locationService.updateAsync(updateDto).subscribe({
          next: () => {
            this.toastr.success('Location updated successfully');

            // Handle attachment update separately
            if (attachmentDto && this.existingAttachment) {
              this.updateAttachmentSeparately(attachmentDto);
            } else if (attachmentDto) {
              // Create new attachment
              this.createAttachmentSeparately(attachmentDto);
            } else {
              // No attachment change, just refresh the image
              this.refreshImageAfterUpdate();
              this.closeModal();
              this.loadLocations();
              this.spinnerService.hide();
            }
          },
          error: (error) => {
            this.toastr.error('Error updating location');
            this.spinnerService.hide();
          },
        });
      }
    } catch (error) {
      this.toastr.error('Error processing file');
      this.spinnerService.hide();
    }
  }

  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = (error) => reject(error);
    });
  }

  private getLocationImageConfig(): any {
    return this.attachmentConfigs.find(
      (config) =>
        config.attachmentsConfigType === AttachmentsConfigType.LocationImage
    );
  }

  selectLocationToDelete(location: LocationDto): void {
    this.selectedLocationToDelete = location;
    const deleteModal = document.getElementById('deleteLocationModal');
    if (deleteModal) {
      const modal = new (window as any).bootstrap.Modal(deleteModal);
      modal.show();
    }
  }

  deleteLocation(): void {
    if (!this.selectedLocationToDelete) return;

    this.spinnerService.show();
    this.locationService
      .deleteAsync(this.selectedLocationToDelete.id)
      .subscribe({
        next: () => {
          this.toastr.success('Location deleted successfully');
          this.closeModal();
          this.loadLocations();
          this.spinnerService.hide();
        },
        error: (error) => {
          this.toastr.error('Error deleting location');
          this.spinnerService.hide();
        },
      });
  }

  // Validation helpers
  isFieldInvalid(fieldName: string): boolean {
    const field = this.locationForm.get(fieldName);
    return field
      ? field.invalid && (field.dirty || field.touched || this.submitted)
      : false;
  }

  getFieldError(fieldName: string): string {
    const field = this.locationForm.get(fieldName);
    if (field?.errors) {
      if (field.errors['required']) return 'This field is required';
      if (field.errors['minlength'])
        return `Minimum length is ${field.errors['minlength'].requiredLength}`;
    }
    return '';
  }

  hasFormErrors(): boolean {
    return this.locationForm.invalid && this.submitted;
  }

  getTotalErrors(): number {
    let errorCount = 0;
    Object.keys(this.locationForm.controls).forEach((key) => {
      const control = this.locationForm.get(key);
      if (control?.errors) {
        errorCount++;
      }
    });
    return errorCount;
  }

  isFieldValid(fieldName: string): boolean {
    const field = this.locationForm.get(fieldName);
    return field ? field.valid && field.touched && !field.pristine : false;
  }

  onFieldBlur(fieldName: string): void {
    const field = this.locationForm.get(fieldName);
    if (field) {
      field.markAsTouched();
    }
  }

  // Enhanced file handling methods

  openImageInNewTab(): void {
    if (this.existingImageUrl) {
      window.open(this.existingImageUrl, '_blank');
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      const file = files[0];
      this.validateAndSetFile(file);
    }
  }

  confirmFileSelection(): void {
    if (this.selectedFile) {
      this.fileValidationSuccess = true;
      this.toastr.success('File confirmed and ready for upload');
    }
  }

  private validateAndSetFile(file: File): void {
    this.fileValidationErrors = [];
    this.fileValidationSuccess = false;

    const allowedTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'application/pdf',
    ];
    const maxSize = 2 * 1024 * 1024; // 2MB

    if (!allowedTypes.includes(file.type)) {
      this.fileValidationErrors.push(
        'Invalid file type. Only PDF, JPG, and PNG files are allowed.'
      );
      return;
    }

    if (file.size > maxSize) {
      this.fileValidationErrors.push('File size must be less than 2MB.');
      return;
    }

    this.selectedFile = file;
    this.fileValidationSuccess = true;

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.filePreview = e.target.result;
      };
      reader.readAsDataURL(file);
    } else {
      this.filePreview = null;
    }

    if (this.mode === 'edit' && this.existingImageUrl) {
      this.toastr.info(
        'New image selected. This will replace the current image when you save.'
      );
    }
  }

  // Display helpers
  getRegionDisplayText(regionId: number | string | null): string | null {
    if (!regionId) return null;
    const regionIdStr = regionId.toString();
    const region = this.regions.find((r) => r.id.toString() === regionIdStr);
    return region?.text || this.currentViewLocation?.regionName || null;
  }

  getLocationTypeDisplayText(
    locationTypeId: number | string | null
  ): string | null {
    if (!locationTypeId) return null;
    const locationTypeIdStr = locationTypeId.toString();
    const locationType = this.locationTypes.find(
      (lt) => lt.id.toString() === locationTypeIdStr
    );
    return locationType?.text || this.currentViewLocation?.locationType || null;
  }
}
