import { Component, OnInit, OnDestroy, ChangeDetectorRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { LangChangeEvent, TranslateModule, TranslateService } from '@ngx-translate/core';
import { map, Observable, startWith, Subscription } from 'rxjs';
import * as L from 'leaflet';
import { InitiativeService } from '../../../core/services/initiative.service';
import { InitiativeDto, InitiativeDetailsDto } from '../../../core/dtos/UserSetting/initiatives/initiative.dto';
import { TranslationService } from '../../../core/services/translation.service';
import { CleanHtmlPipe } from '../../../shared/pipes/clean-html.pipe';

// Fix for Leaflet marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

@Component({
  selector: 'app-initiative-details',
  standalone: true,
  imports: [CommonModule, TranslateModule, RouterLink, CleanHtmlPipe],
  templateUrl: './initiative-details.component.html',
  styleUrls: ['./initiative-details.component.scss']
})
export class InitiativeDetailsComponent implements OnInit, OnDestroy, AfterViewInit {
  initiative: InitiativeDto | null = null;
  loading = false;
  error: string | null = null;
  initiativeId: string | null = null;

  // Map properties
  private map: L.Map | null = null;
  private markers: L.Marker[] = [];
  private mapInitialized = false;
  lang$: Observable<any>;
  private subscriptions = new Subscription();
  lang:string = "";

  constructor(
    private initiativeService: InitiativeService,
    private route: ActivatedRoute,
    private router: Router,
    private translateService: TranslateService,
    private translationService: TranslationService,
    private cdr: ChangeDetectorRef
  ) {
    this.lang$ = this.translateService.onLangChange.pipe(
      startWith({ lang: this.translateService.currentLang || this.translateService.defaultLang || 'ar' } as LangChangeEvent),
      map(e => (e.lang || 'ar').split('-')[0])
    );

    this.lang = localStorage.getItem("lang") || "";
    this.translateService.onLangChange.subscribe((event: LangChangeEvent) => {
      this.lang = event.lang;
    });


  }

  // 'ar', 'en'

  ngOnInit(): void {
    this.initiativeId = this.route.snapshot.paramMap.get('id');
    if (this.initiativeId) {
      this.loadInitiativeDetails();
    } else {
      this.error = 'ERRORS.INITIATIVE_ID_NOT_FOUND';
    }

    // Add global function for map popup
    (window as any).openInGoogleMaps = (coordinates: string) => {
      this.openInGoogleMaps(coordinates);
    };

    // Initialize translation service and ensure translations are loaded
    this.initializeTranslationService();

    // Subscribe to language changes to refresh map markers
    this.subscriptions.add(
      this.translateService.onLangChange.subscribe(() => {
        if (this.map && this.initiative?.initiativeDetails) {
          this.refreshMapMarkers();
        }
        // Force change detection after language change
        this.cdr.detectChanges();
      })
    );
  }

  ngAfterViewInit(): void {
    // Initialize map after view is ready
    setTimeout(() => {
      this.initializeMap();
    }, 100);
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    if (this.map) {
      this.map.remove();
    }

    // Clean up global function
    delete (window as any).openInGoogleMaps;
  }

  loadInitiativeDetails(): void {
    if (!this.initiativeId) return;

    this.loading = true;
    this.error = null;

    this.initiativeService.getById(Number(this.initiativeId)).subscribe({
      next: (response: any) => {
        this.initiative = response || null;
        this.loading = false;

        // Initialize map after data is loaded
        setTimeout(() => {
          this.initializeMap();
          if (this.map) {
            this.addMarkersToMap();
          }
        }, 500); // Increased timeout to ensure DOM is ready
      },
      error: (error: any) => {
        this.error = 'ERRORS.FAILED_LOAD_INITIATIVE_DETAILS';
        this.loading = false;
      },
    });
  }

  initializeMap(): void {
    if (this.mapInitialized) return;

    // Only initialize if we have initiative data and it has locations
    if (!this.initiative || !this.initiative.initiativeDetails || this.initiative.initiativeDetails.length === 0) {
      return;
    }

    const mapContainer = document.getElementById('initiative-map');
    if (!mapContainer) {
      return;
    }

    // Clear any existing map
    if (this.map) {
      this.map.remove();
    }

    // Initialize map with default center (UAE coordinates)
    this.map = L.map('initiative-map', {
      center: [25.2048, 55.2708], // Dubai coordinates
      zoom: 10,
      zoomControl: true,
      attributionControl: true
    });

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(this.map);

    this.mapInitialized = true;
  }

  addMarkersToMap(): void {
    if (!this.map || !this.initiative?.initiativeDetails) return;

    // Clear existing markers
    this.markers.forEach(marker => marker.remove());
    this.markers = [];

    const locations = this.initiative.initiativeDetails.filter(detail => detail.isActive);

    if (locations.length === 0) return;

    const bounds = L.latLngBounds([]);

    // Ensure translations are loaded before creating markers
    this.translateService.get(['INITIATIVES.LOCATION', 'COMMON.OPEN_IN_GOOGLE_MAPS']).subscribe(() => {
      locations.forEach((location, index) => {
        try {
          const coordinates = this.parseCoordinates(location.locationCoordinates);

          if (coordinates) {
            const marker = L.marker([coordinates.lat, coordinates.lng])
              .addTo(this.map!)
              .bindPopup(this.createPopupContent(location, index + 1));

            this.markers.push(marker);
            bounds.extend([coordinates.lat, coordinates.lng]);
          }
        } catch (error) {
          // Handle error silently
        }
      });

      // Fit map to show all markers
      if (bounds.isValid()) {
        this.map!.fitBounds(bounds, { padding: [20, 20] });
      }
    });
  }

  parseCoordinates(coordinatesString: string): { lat: number; lng: number } | null {
    try {
      // Handle forward slash format (e.g., "25.206049/55.248212")
      if (coordinatesString.includes('/')) {
        const [lat, lng] = coordinatesString.split('/').map(coord => parseFloat(coord.trim()));
        if (!isNaN(lat) && !isNaN(lng)) {
          return { lat, lng };
        }
      }

      // Handle comma-separated format (e.g., "25.206049,55.248212")
      if (coordinatesString.includes(',')) {
        const [lat, lng] = coordinatesString.split(',').map(coord => parseFloat(coord.trim()));
        if (!isNaN(lat) && !isNaN(lng)) {
          return { lat, lng };
        }
      }

      // Handle JSON format (e.g., '{"lat": 25.206049, "lng": 55.248212}')
      try {
        const parsed = JSON.parse(coordinatesString);
        if (parsed.lat && parsed.lng) {
          return { lat: parseFloat(parsed.lat), lng: parseFloat(parsed.lng) };
        }
      } catch (jsonError) {
        // Not a JSON format, continue to next check
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  createPopupContent(location: InitiativeDetailsDto, index: number): string {
    const currentLanguage = this.translationService.currentLang;
    const locationName = currentLanguage === 'ar' ? location.locationNameAr : location.locationNameEn;

    // Get translations with fallback - ensure we have the actual translated text
    let locationText = this.translateService.instant('INITIATIVES.LOCATION');
    let openInMapsText = this.translateService.instant('COMMON.OPEN_IN_GOOGLE_MAPS');



    // If translation service returns the key itself or undefined, use fallback
    if (!locationText || locationText === 'INITIATIVES.LOCATION') {
      locationText = currentLanguage === 'ar' ? 'الموقع' : 'Location';
    }
    if (!openInMapsText || openInMapsText === 'COMMON.OPEN_IN_GOOGLE_MAPS') {
      openInMapsText = currentLanguage === 'ar' ? 'فتح في خرائط جوجل' : 'Open in Google Maps';
    }

    return `
      <div class="map-popup">
        <h6>${locationName}</h6>
        <p>${locationText} #${index}</p>
        <button class="btn btn-sm btn-primary" onclick="openInGoogleMaps('${location.locationCoordinates}')">
          ${openInMapsText}
        </button>
      </div>
    `;
  }

  openInGoogleMaps(coordinates: string): void {
    try {
      const coords = this.parseCoordinates(coordinates);
      if (coords) {
        const url = `https://www.google.com/maps?q=${coords.lat},${coords.lng}`;
        window.open(url, '_blank');
      }
    } catch (error) {
      // Handle error silently
    }
  }

  // Make this method public for template access
  public openLocationInGoogleMaps(coordinates: string): void {
    this.openInGoogleMaps(coordinates);
  }

  getInitiativeName(initiative: InitiativeDto): string {
    const currentLanguage = this.translationService.currentLang;
    return currentLanguage === 'ar' ? (initiative.nameAr || '') : (initiative.nameEn || initiative.nameAr || '');
  }


  // getInitiativeDescription(initiative: InitiativeDto): string {
  //   const currentLanguage = this.translationService.currentLang;
  //   return currentLanguage === 'ar' ? (initiative.descriptionAr || '') : (initiative.descriptionEn || initiative.descriptionAr || '');
  // }
  getInitiativeDescription(initiative: InitiativeDto): string {
    const currentLanguage = this.translationService.currentLang;

    return currentLanguage === 'ar'
      ? (initiative.descriptionAr || '').replace(/&nbsp;/g, ' ')
      : (initiative.descriptionEn || '').replace(/&nbsp;/g, ' ');
  }

  getInitiativeImage(initiative: InitiativeDto): string {
    return initiative.attachment?.imgPath || 'assets/images/initiative-1.png';
  }

  getInitiativeDate(initiative: InitiativeDto): string {
    if (!initiative.initiativeDate) return '';

    const date = new Date(initiative.initiativeDate);
    return date.toLocaleDateString(
      this.translationService.currentLang === 'ar'
        ? 'ar-EG-u-ca-gregory'  // عربي ميلادي
        : 'en-US-u-ca-gregory', // إنجليزي ميلادي
      {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }
    );
  }


  getTargetGroup(initiative: InitiativeDto): string {
    return initiative.targetGroup || '';
  }

  getLocationName(location: InitiativeDetailsDto): string {
    const currentLanguage = this.translationService.currentLang;
    return currentLanguage === 'ar' ? location.locationNameAr : location.locationNameEn;
  }

  onImageError(event: any): void {
    event.target.src = 'assets/images/initiative-1.png';
  }

  onBackToInitiatives(): void {
    this.router.navigate(['/initiatives']);
  }

  onBackToHome(): void {
    this.router.navigate(['/']);
  }

  onRequestService(): void {
    // Navigate to service request page or show modal
    this.router.navigate(['/services']);
  }

  retryLoad(): void {
    this.loadInitiativeDetails();
  }

  private refreshMapMarkers(): void {
    if (!this.map || !this.initiative?.initiativeDetails) return;

    // Clear existing markers
    this.markers.forEach(marker => marker.remove());
    this.markers = [];

    const locations = this.initiative.initiativeDetails.filter(detail => detail.isActive);

    if (locations.length === 0) return;

    const bounds = L.latLngBounds([]);

    locations.forEach((location, index) => {
      try {
        const coordinates = this.parseCoordinates(location.locationCoordinates);

        if (coordinates) {
          const marker = L.marker([coordinates.lat, coordinates.lng])
            .addTo(this.map!)
            .bindPopup(this.createPopupContent(location, index + 1));

          this.markers.push(marker);
          bounds.extend([coordinates.lat, coordinates.lng]);
        }
      } catch (error) {
        // Handle error silently
      }
    });

    // Fit map to show all markers
    if (bounds.isValid()) {
      this.map.fitBounds(bounds, { padding: [20, 20] });
    }
  }

  private initializeTranslationService(): void {
    // Set default language if not set
    if (!this.translateService.currentLang) {
      this.translateService.setDefaultLang('en');
      this.translateService.use('en');
    }



    // Ensure translations are loaded
    this.ensureTranslationsLoaded();
  }

  private ensureTranslationsLoaded(): void {
    // Ensure all required translations are loaded
    const requiredTranslations = [
      'COMMON.OPEN_IN_GOOGLE_MAPS',
      'COMMON.BACK_TO_INITIATIVES',
      'COMMON.BACK_TO_HOME',
      'INITIATIVES.LOCATION',
      'INITIATIVES.LOCATION_DETAILS',
      'INITIATIVES.REQUEST_SERVICE',
      'INITIATIVES.REQUEST_SERVICE_DESCRIPTION'
    ];

    // Check if translation service is ready
    if (this.translateService.currentLoader) {
      this.translateService.get(requiredTranslations).subscribe((translations) => {
        // Test individual translations
        this.testTranslations();

        // Force change detection after translations are loaded
        this.cdr.detectChanges();
      }, (error) => {
        // Fallback: force change detection even if translations fail
        this.cdr.detectChanges();
      });
    } else {
      // Force change detection to ensure UI updates
      this.cdr.detectChanges();
    }
  }

  private testTranslations(): void {
    // Test individual translation keys
    const testKeys = [
      'COMMON.OPEN_IN_GOOGLE_MAPS',
      'COMMON.BACK_TO_INITIATIVES',
      'COMMON.BACK_TO_HOME',
      'INITIATIVES.LOCATION'
    ];

    testKeys.forEach(key => {
      const translation = this.translateService.instant(key);
    });
  }
}
