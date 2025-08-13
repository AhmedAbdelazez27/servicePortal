import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, OnInit } from '@angular/core';
import { CarouselModule, OwlOptions } from 'ngx-owl-carousel-o';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { ServiceSettingService } from '../../../core/services/serviceSetting.service';
import { ServiceDto, GetAllServicesParameters } from '../../../core/dtos/serviceSetting/serviceSetting.dto';
import { ContactUsComponent } from '../contact-us/contact-us.component';

declare var bootstrap: any;
declare var $: any;

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CarouselModule, CommonModule, TranslateModule, ContactUsComponent],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit, AfterViewInit {
  customOptions?: OwlOptions;
  services: ServiceDto[] = [];
  loading = false;
  error = '';

  // Array to track which icon should be used (this creates a cycle through available icons)
  serviceIcons = [
    'icon1', // Settings/Gear icon
    'icon2', // Chart/Analytics icon
    'icon3', // Users/Team icon
    'icon4', // Rocket/Innovation icon
    'icon5'  // Lightbulb/Ideas icon
  ];

  campaigns1 = [
  {
    id: 1,
    filePath: 'assets/img/campaign1.jpg',
    projectCampainName: 'HOME.CAMPAIGNS.FOOD_AID',
    projectCampainNameEn: 'HOME.CAMPAIGNS.FOOD_AID',
    requiredAmount: '10,000 AED',
    collectedAmount: '6,500 AED',
    progress: 65,
  },
  {
    id: 2,
    filePath: 'assets/img/campaign2.jpg',
    projectCampainName: 'HOME.CAMPAIGNS.ORPHAN_SUPPORT',
    projectCampainNameEn: 'HOME.CAMPAIGNS.ORPHAN_SUPPORT',
    requiredAmount: '8,000 AED',
    collectedAmount: '5,200 AED',
    progress: 65,
  },
  {
    id: 3,
    filePath: 'assets/img/campaign3.jpg',
    projectCampainName: 'HOME.CAMPAIGNS.EMERGENCY_HEALTHCARE',
    projectCampainNameEn: 'HOME.CAMPAIGNS.EMERGENCY_HEALTHCARE',
    requiredAmount: '15,000 AED',
    collectedAmount: '9,000 AED',
    progress: 60,
  },
  {
    id: 4,
    filePath: '../../../../assets/images/initiative-1.png',
    projectCampainName: 'HOME.CAMPAIGNS.SHELTER_SUPPORT',
    projectCampainNameEn: 'HOME.CAMPAIGNS.SHELTER_SUPPORT',
    requiredAmount: '12,000 AED',
    collectedAmount: '8,500 AED',
    progress: 70,
  }
];

  initiatives = [
    {
      boxes: [
        {
          image: 'assets/img/initiative-1.png',
          title: 'HOME.INITIATIVES.INITIATIVE_1',
          description: 'HOME.INITIATIVES.DESCRIPTION_1',
        },
      ]
    },
    {
      boxes: [
        {
          title: 'HOME.INITIATIVES.INITIATIVE_2',
          description: 'HOME.INITIATIVES.DESCRIPTION_2',
        },
        {
          image: 'assets/img/initiative-2.png',
          title: 'HOME.INITIATIVES.INITIATIVE_3',
          description: 'HOME.INITIATIVES.DESCRIPTION_3',
        },
      ]
    }
  ];

  constructor(
    private serviceSettingService: ServiceSettingService,
    private router: Router
  ) {
    const currentLanguage = localStorage.getItem('language') || 'en';
    if (currentLanguage == 'ar') {
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
    }

  }

  ngOnInit(): void {
    this.loadServices();
  }

  ngAfterViewInit(): void {
    const el = document.querySelector('#carouselExampleCaptions');
    if (el) {
      new bootstrap.Carousel(el, {
        interval: 4000,
        ride: 'carousel'
      });
    }

    // Initialize jQuery Owl Carousel for the initiatives section (uses .owl-carousel class)
    // The .owl-carousel CSS hides content until initialized, so ensure this runs after view init
    const currentLanguage = localStorage.getItem('language') || 'en';
    setTimeout(() => {
      try {
        if ($ && typeof $('.owl-carousel-initiatives')?.owlCarousel === 'function') {
          $('.owl-carousel-initiatives').owlCarousel({
            rtl: currentLanguage === 'ar',
            loop: true,
            margin: 10,
            nav: true,
            dots: true,
            autoplay: false,
            responsive: {
              0: { items: 1 },
              600: { items: 2 },
              1000: { items: 3 }
            }
          });
        }
      } catch {
        // No-op if jQuery/owl is not available
      }
    });
  }

  loadServices(): void {
    this.loading = true;
    this.error = '';

    const parameters: GetAllServicesParameters = {
      skip: 0,
      take: 100, // Load first 100 services for the carousel
      active: true
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

  onShowAllServices(): void {
    this.router.navigate(['/services']);
  }

  onServiceDetails(service: ServiceDto): void {
    this.router.navigate(['/service-details', service.serviceId]);
  }

  getServiceName(service: ServiceDto): string {
    const currentLanguage = localStorage.getItem('language') || 'en';
    return currentLanguage === 'ar' ? (service.serviceName || '') : (service.serviceNameEn || service.serviceName || '');
  }

  getServiceDescription(service: ServiceDto): string {
    const currentLanguage = localStorage.getItem('language') || 'en';
    return currentLanguage === 'ar' ? (service.descriptionAr || '') : (service.descriptionEn || service.descriptionAr || '');
  }

  // Helper method to get icon index for cycling
  getIconIndex(index: number): number {
    return index % this.serviceIcons.length;
  }

  // Contact form handled by ContactUsComponent
}
