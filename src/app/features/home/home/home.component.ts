import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, OnInit } from '@angular/core';
import { CarouselModule, OwlOptions } from 'ngx-owl-carousel-o';
import { Router } from '@angular/router';
import { LangChangeEvent, TranslateModule, TranslateService } from '@ngx-translate/core';
import { ServiceSettingService } from '../../../core/services/serviceSetting.service';
import { ServiceDto, GetAllServicesParameters } from '../../../core/dtos/serviceSetting/serviceSetting.dto';
import { InitiativeService } from '../../../core/services/initiative.service';
import { InitiativeDto, GetAllInitiativeParameter } from '../../../core/dtos/UserSetting/initiatives/initiative.dto';
import { HeroSectionSettingService } from '../../../core/services/UserSetting/hero-section-setting.service';
import { HeroSectionSettingDto, GetAllHeroSectionSettingRequestDto } from '../../../core/dtos/UserSetting/hero-section-setting.dto';
import { TranslationService } from '../../../core/services/translation.service';
import { TextProcessingService } from '../../../core/services/text-processing.service';
import { CleanHtmlPipe } from '../../../shared/pipes/clean-html.pipe';

declare var bootstrap: any;
declare var $: any;

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CarouselModule, CommonModule, TranslateModule, CleanHtmlPipe],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  providers: [CleanHtmlPipe]
})
export class HomeComponent implements OnInit, AfterViewInit {
  customOptions?: OwlOptions;
  initiativesOptions?: OwlOptions;
  services: ServiceDto[] = [];
  initiatives: InitiativeDto[] = [];
  heroSections: HeroSectionSettingDto[] = [];
  loading = false;
  initiativesLoading = false;
  heroSectionsLoading = false;
  error = '';
  initiativesError = '';
  heroSectionsError = '';
  lang: string = "";

  // Array to track which icon should be used (this creates a cycle through available icons)
  serviceIcons = [
    'icon1', // Settings/Gear icon
    'icon2', // Chart/Analytics icon
    'icon3', // Users/Team icon
    'icon4', // Rocket/Innovation icon
    'icon5',  // Lightbulb/Ideas icon
    'icon6'  // Lightbulb/Ideas icon
  ];

  constructor(
    private serviceSettingService: ServiceSettingService,
    private initiativeService: InitiativeService,
    private heroSectionService: HeroSectionSettingService,
    private translationService: TranslationService,
    private translateService: TranslateService,
    private router: Router,
    public textService: TextProcessingService
  ) {
    this.lang = localStorage.getItem("lang") || "";
    this.setCarouselOptions(this.translationService.currentLang);
    this.translateService.onLangChange.subscribe((event: LangChangeEvent) => {
      this.lang = event.lang
      this.setCarouselOptions(event.lang);
    });


  }

  ngOnInit(): void {
    this.loadServices();
    this.loadInitiatives();
    this.loadHeroSections();
  }

  ngAfterViewInit(): void {
    const el = document.querySelector('#carouselExampleCaptions');
    if (el) {
      new bootstrap.Carousel(el, {
        interval: 4000,
        ride: 'carousel'
      });
    }
  }

  loadHeroSections(): void {
    this.heroSectionsLoading = true;
    this.heroSectionsError = '';

    const request: GetAllHeroSectionSettingRequestDto = {
      skip: 0,
      take: 100,
      isActive: true // Only get active hero sections
    };

    this.heroSectionService.getAll(request).subscribe({
      next: (response: any) => {
        // Sort by viewOrder and filter active items
        this.heroSections = (response.data || [])
          .filter((item: HeroSectionSettingDto) => item.isActive)
          .sort((a: HeroSectionSettingDto, b: HeroSectionSettingDto) => a.viewOrder - b.viewOrder);
        this.heroSectionsLoading = false;
      },
      error: (error: any) => {
        this.heroSectionsError = 'ERRORS.FAILED_LOAD_HERO_SECTIONS';
        this.heroSectionsLoading = false;
      }
    });
  }

  loadServices(): void {
    this.loading = true;
    this.error = '';

    const parameters: GetAllServicesParameters = {
      skip: 0,
      take: 100,
      isActive: true
    };

    this.serviceSettingService.getAll(parameters).subscribe({
      next: (response: any) => {
        this.services = response.data || [];
        this.loading = false;
      },
      error: (error: any) => {
        this.error = 'ERRORS.FAILED_LOAD_SERVICES';
        this.loading = false;
      }
    });
  }

  loadInitiatives(): void {
    this.initiativesLoading = true;
    this.initiativesError = '';

    const parameters: GetAllInitiativeParameter = {
      skip: 0,
      take: 50 // Load first 50 initiatives for the carousel
    };

    this.initiativeService.getAllAsync(parameters).subscribe({
      next: (response: any) => {
        this.initiatives = response.data || [];
        this.initiativesLoading = false;
      },
      error: (error: any) => {
        this.initiativesError = 'ERRORS.FAILED_LOAD_INITIATIVES';
        this.initiativesLoading = false;
      }
    });
  }

  onShowAllServices(): void {
    this.router.navigate(['/services']);
  }

  onServiceDetails(service: ServiceDto): void {
    this.router.navigate(['/service-details', service.serviceId]);
  }

  onShowAllInitiatives(): void {
    this.router.navigate(['/initiatives']);
  }

  onInitiativeDetails(initiative: InitiativeDto): void {
    this.router.navigate(['/initiative-details', initiative.id]);
  }

  onHeroSectionDetails(heroSection: HeroSectionSettingDto): void {
    // Navigate to hero section details page
    this.router.navigate(['/hero-section-details', heroSection.id]);
  }

  getServiceName(service: ServiceDto): string {
    const currentLanguage = this.translationService.currentLang;
    return currentLanguage === 'ar' ? (service.serviceName || '') : (service.serviceNameEn || service.serviceName || '');
  }

  getServiceDescription(service: ServiceDto): string {
    const currentLanguage = this.translationService.currentLang;
    return currentLanguage === 'ar' ? (service.descriptionAr || '') : (service.descriptionEn || service.descriptionAr || '');
  }
  getServiceType(service: ServiceDto): string {
    const currentLanguage = this.translationService.currentLang;

    switch (service.serviceType) {
      case 1:
        return currentLanguage === 'ar' ? 'خدمات أفراد' : ' Individual Services ';
      case 2:
        return currentLanguage === 'ar' ? 'خدمات مؤسسات' : ' Corporate Services ';
      case 3:
        return currentLanguage === 'ar' ? '  خدمات أفراد/مؤسسات   ' : ' Individual/Corporate Services ';
      default:
        return '';
    }
  }
  getInitiativeName(initiative: InitiativeDto): string {
    const currentLanguage = this.translationService.currentLang;
    return currentLanguage === 'ar' ? (initiative.nameAr || '') : (initiative.nameEn || initiative.nameAr || '');
  }


  getInitiativeImage(initiative: InitiativeDto): string {
    return initiative.attachment?.imgPath || 'assets/images/initiative-1.png';
  }

  getHeroSectionTitle(heroSection: HeroSectionSettingDto): string {
    const currentLanguage = this.translationService.currentLang;
    return currentLanguage === 'ar' ? heroSection.titleAr : heroSection.titleEn;
  }

  getHeroSectionDescription(heroSection: HeroSectionSettingDto): string {
    const currentLanguage = this.translationService.currentLang;
    return currentLanguage === 'ar' ? heroSection.descriptionAr : heroSection.descriptionEn;
  }

  getHeroSectionImage(heroSection: HeroSectionSettingDto): string {
    return heroSection.attachment?.imgPath || 'assets/images/slider-1.png';
  }

  onImageError(event: any): void {
    event.target.src = 'assets/images/slider-1.png';
  }

  // Helper method to get icon index for cycling
  getIconIndex(index: number): number {
    return index % this.serviceIcons.length;
  }

  // Contact form handled by ContactUsComponent
  setCarouselOptions(lang: string) {
    if (lang == 'ar') {
      this.customOptions = {
        rtl: true, // Enable RTL for Owl Carousel
        loop: true, // Carousel will loop after last item
        margin: 10, // Margin between items
        nav: true, // Enable navigation arrows
        dots: true, // Enable dots for navigation
        autoplay: false, // Disable autoplay
        responsive: {
          0: { items: 1 }, // 1 item for small screens
          600: { items: 2 }, // 2 items for medium screens
          1000: { items: 3 }, // 3 items for large screens
        },
        navText: ['<span class="custom-prev" style="visibility: hidden;">&lt;</span>', // Add custom class for "Previous"
          '<span class="custom-next" style="visibility: hidden;">&gt;</span>'  // Add custom class for "Next"
        ], // Custom navigation text
      };

      this.initiativesOptions = {
        rtl: true, // Enable RTL for Owl Carousel
        loop: true, // Carousel will loop after last item
        margin: 10, // Margin between items
        nav: true, // Enable navigation arrows
        dots: true, // Enable dots for navigation
        autoplay: false, // Disable autoplay
        responsive: {
          0: { items: 1 }, // 1 item for small screens
          600: { items: 1 }, // 2 items for medium screens
          1000: { items: 2 }, // 3 items for large screens
        },
        navText: ['<span class="custom-prev" style="visibility: hidden;">&lt;</span>', // Add custom class for "Previous"
          '<span class="custom-next" style="visibility: hidden;">&gt;</span>'  // Add custom class for "Next"
        ], // Custom navigation text
      };
    } else {
      this.customOptions = {
        loop: true, // Carousel will loop after last item
        margin: 10, // Margin between items
        nav: true, // Enable navigation arrows
        dots: true, // Enable dots for navigation
        autoplay: false, // Disable autoplay
        responsive: {
          0: { items: 1 }, // 1 item for small screens
          600: { items: 2 }, // 2 items for medium screens
          1000: { items: 3 }, // 3 items for large screens
        },
        navText: ['<span class="custom-prev" style="visibility: hidden;">&lt;</span>', // Add custom class for "Previous"
          '<span class="custom-next" style="visibility: hidden;">&gt;</span>'  // Add custom class for "Next"
        ], // Custom navigation text
      };

      this.initiativesOptions = {
        loop: true, // Carousel will loop after last item
        margin: 10, // Margin between items
        nav: true, // Enable navigation arrows
        dots: true, // Enable dots for navigation
        autoplay: false, // Disable autoplay
        responsive: {
          0: { items: 1 }, // 1 item for small screens
          600: { items: 1 }, // 2 items for medium screens
          1000: { items: 2 }, // 3 items for large screens
        },
        navText: ['<span class="custom-prev" style="visibility: hidden;">&lt;</span>', // Add custom class for "Previous"
          '<span class="custom-next" style="visibility: hidden;">&gt;</span>'  // Add custom class for "Next"
        ], // Custom navigation text
      };
    }
  }
}
