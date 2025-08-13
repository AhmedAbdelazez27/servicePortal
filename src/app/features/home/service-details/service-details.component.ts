import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { ServiceSettingService } from '../../../core/services/serviceSetting.service';
import { ServiceDto, AttributeDto, ServiceDepartmentDto, AttributeValueDto } from '../../../core/dtos/serviceSetting/serviceSetting.dto';
import { AttachmentsConfigDto } from '../../../core/dtos/attachments/attachments-config.dto';
import { TranslationService } from '../../../core/services/translation.service';

@Component({
  selector: 'app-service-details',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './service-details.component.html',
  styleUrls: ['./service-details.component.scss']
})
export class ServiceDetailsComponent implements OnInit {
  service: ServiceDto | null = null;
  loading = false;
  error: string | null = null;
  serviceId: string | null = null;

  constructor(
    private serviceSettingService: ServiceSettingService,
    private route: ActivatedRoute,
    private router: Router,
    private translationService: TranslationService
  ) {}

  ngOnInit(): void {
    this.serviceId = this.route.snapshot.paramMap.get('id');
    if (this.serviceId) {
      this.loadServiceDetails();
    } else {
      this.error = 'ERRORS.SERVICE_ID_NOT_FOUND';
    }
  }

  loadServiceDetails(): void {
    if (!this.serviceId) return;

    this.loading = true;
    this.error = null;

    this.serviceSettingService.getById(Number(this.serviceId)).subscribe({
      next: (response: any) => {
        this.service = response || null;
        this.loading = false;
      },
      error: (error: any) => {
        this.error = 'ERRORS.FAILED_LOAD_SERVICE_DETAILS';
        this.loading = false;
      }
    });
  }

  getServiceName(service: ServiceDto): string {
    const currentLanguage = this.translationService.currentLang;
    return currentLanguage === 'ar' ? (service.serviceName || '') : (service.serviceNameEn || service.serviceName || '');
  }

  getServiceDescription(service: ServiceDto): string {
    const currentLanguage = this.translationService.currentLang;
    return currentLanguage === 'ar' ? (service.descriptionAr || '') : (service.descriptionEn || service.descriptionAr || '');
  }

  getAttributeName(attribute: AttributeDto): string {
    const currentLanguage = this.translationService.currentLang;
    return currentLanguage === 'ar' ? (attribute.nameAr || '') : (attribute.nameEn || attribute.nameAr || '');
  }

  getAttributeValues(attribute: AttributeDto): AttributeValueDto[] {
    if (attribute.attributeValues && attribute.attributeValues.length > 0) {
      // Sort by viewOrder if available
      return [...attribute.attributeValues].sort((a, b) => (a.viewOrder || 0) - (b.viewOrder || 0));
    }
    return [];
  }

  getAttributeValueText(value: AttributeValueDto): string {
    const currentLanguage = this.translationService.currentLang;
    return currentLanguage === 'ar' ? (value.valueAr || '') : (value.valueEn || value.valueAr || '');
  }

  hasAttributeValues(attribute: AttributeDto): boolean {
    return !!(attribute.attributeValues && attribute.attributeValues.length > 0);
  }

  getDepartmentName(dept: ServiceDepartmentDto): string {
    if (dept.department) {
      const currentLanguage = this.translationService.currentLang;
      return currentLanguage === 'ar' ? (dept.department.aname || '') : (dept.department.ename || dept.department.aname || '');
    }
    return 'ERRORS.UNKNOWN_DEPARTMENT';
  }

  getAttachmentName(attachment: AttachmentsConfigDto): string {
    const currentLanguage = this.translationService.currentLang;
    return currentLanguage === 'ar' ? (attachment.name || '') : (attachment.nameEn || attachment.name || '');
  }

  onBackToServices(): void {
    this.router.navigate(['/services']);
  }

  onBackToHome(): void {
    this.router.navigate(['/']);
  }

  onRequestService(): void {
    if (this.service) {
      // Navigate to service request page or show request form
      this.router.navigate(['/service-request', this.service.serviceId]);
    }
  }
}
