import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { ServiceSettingService } from '../../../core/services/serviceSetting.service';
import { ServiceDto, GetAllServicesParameters, ServiceType } from '../../../core/dtos/serviceSetting/serviceSetting.dto';

@Component({
  selector: 'app-services-list',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  templateUrl: './services-list.component.html',
  styleUrls: ['./services-list.component.scss']
})
export class ServicesListComponent implements OnInit {
  services: ServiceDto[] = [];
  loading = false;
  error: string | null = null;
  filteredServices: ServiceDto[] = [];
  searchTerm = '';

  // Array to track which icon should be used (this creates a cycle through available icons)
  serviceIcons = [
    'icon1', // Settings/Gear icon
    'icon2', // Chart/Analytics icon
    'icon3', // Users/Team icon
    'icon4', // Rocket/Innovation icon
    'icon5'  // Lightbulb/Ideas icon
  ];

  constructor(
    private serviceSettingService: ServiceSettingService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadServices();
  }

  loadServices(): void {
    this.loading = true;
    this.error = null;

    const params: GetAllServicesParameters = {
      skip: 0,
      take: 100,
       isActive: true,
      searchValue: this.searchTerm
    };

    this.serviceSettingService.getAll(params).subscribe({
      next: (response: any) => {
        this.services = response.data || [];
        this.filteredServices = [...this.services];
        this.loading = false;
      },
      error: (error: any) => {
        this.error = 'ERRORS.FAILED_LOAD_SERVICES';
        this.loading = false;
      }
    });
  }

  onSearch(): void {
    if (this.searchTerm.trim()) {
      this.filteredServices = this.services.filter(service =>
        this.getServiceName(service).toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        this.getServiceDescription(service)?.toLowerCase().includes(this.searchTerm.toLowerCase())
      );
    } else {
      this.filteredServices = [...this.services];
    }
  }

  onServiceDetails(service: ServiceDto): void {
    this.router.navigate(['/service-details', service.serviceId]);
  }

  getServiceName(service: ServiceDto): string {
    const currentLanguage = localStorage.getItem('lang') || 'en';
    return currentLanguage === 'ar' ? (service.serviceName || '') : (service.serviceNameEn || service.serviceName || '');
  }

  getServiceDescription(service: ServiceDto): string {
    const currentLanguage = localStorage.getItem('lang') || 'en';
    return currentLanguage === 'ar' ? (service.descriptionAr || '') : (service.descriptionEn || service.descriptionAr || '');
  }

  onBackToHome(): void {
    this.router.navigate(['/']);
  }

  // Helper method to get icon index for cycling
  getIconIndex(index: number): number {
    return index % this.serviceIcons.length;
  }
}