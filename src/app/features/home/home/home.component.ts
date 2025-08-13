import { CommonModule } from '@angular/common';
import { AfterViewInit, Component } from '@angular/core';
import { CarouselModule, OwlOptions } from 'ngx-owl-carousel-o';

declare var bootstrap: any;

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CarouselModule, CommonModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements AfterViewInit {
  customOptions?: OwlOptions;
  campaigns1 = [
  {
    id: 1,
    filePath: 'assets/img/campaign1.jpg',
    projectCampainName: 'حملة توفير الغذاء',
    projectCampainNameEn: 'Food Aid Campaign',
    requiredAmount: '10,000 AED',
    collectedAmount: '6,500 AED',
    progress: 65,
  },
  {
    id: 2,
    filePath: 'assets/img/campaign2.jpg',
    projectCampainName: 'دعم الأيتام',
    projectCampainNameEn: 'Orphan Support Campaign',
    requiredAmount: '8,000 AED',
    collectedAmount: '5,200 AED',
    progress: 65,
  },
  {
    id: 3,
    filePath: 'assets/img/campaign3.jpg',
    projectCampainName: 'رعاية صحية عاجلة',
    projectCampainNameEn: 'Emergency Healthcare',
    requiredAmount: '15,000 AED',
    collectedAmount: '9,000 AED',
    progress: 60,
  },
  {
    id: 4,
    filePath: '../../../../assets/imgs/initiative-1.png',
    projectCampainName: 'توفير مأوى',
    projectCampainNameEn: 'Shelter Support',
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
          title: 'Initiative 1',
          description: 'Lorem Ipsum is simply dummy text of the printing and typesetting industry.',
        },
      ]
    },
    {
      boxes: [
        {
          title: 'Initiative 2',
          description: 'Box without image.',
        },
        {
          image: 'assets/img/initiative-2.png',
          title: 'Initiative 3',
          description: 'Another example with image and content.',
        },
      ]
    }
  ];


  constructor() {
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
          1000: { items: 2 }, // 3 items for large screens
        },
        navText: ['<span class="custom-prev" style="visibility: hidden;">&lt;</span>', // Add custom class for "Previous"
          '<span class="custom-next" style="visibility: hidden;">&gt;</span>'  // Add custom class for "Next"
        ], // Custom navigation text
      };
    }


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
}
