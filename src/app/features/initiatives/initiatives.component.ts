import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { InitiativeService } from '../../core/services/initiative.service';
import { InitiativeDto, GetAllInitiativeParameter } from '../../core/dtos/UserSetting/initiatives/initiative.dto';

@Component({
  selector: 'app-initiatives',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './initiatives.component.html',
  styleUrls: ['./initiatives.component.scss']
})
export class InitiativesComponent implements OnInit {
  initiatives: InitiativeDto[] = [];
  loading = false;
  error = '';

  constructor(
    private initiativeService: InitiativeService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadInitiatives();
  }

  loadInitiatives(): void {
    this.loading = true;
    this.error = '';

    const parameters: GetAllInitiativeParameter = {
      skip: 0,
      take: 100, // Load all initiatives
    };

    this.initiativeService.getAllAsync(parameters).subscribe({
      next: (response: any) => {
        this.initiatives = response.data || [];
        this.loading = false;
      },
      error: (error: any) => {
        this.error = 'ERRORS.FAILED_LOAD_INITIATIVES';
        this.loading = false;
      }
    });
  }

  retryLoad(): void {
    this.loadInitiatives();
  }

  onInitiativeClick(initiative: InitiativeDto): void {
    this.router.navigate(['/initiative-details', initiative.id]);
  }

  getInitiativeName(initiative: InitiativeDto): string {
    const currentLanguage = localStorage.getItem('language') || 'en';
    return currentLanguage === 'ar' ? (initiative.nameAr || '') : (initiative.nameEn || initiative.nameAr || '');
  }

  getInitiativeDescription(initiative: InitiativeDto): string {
    const currentLanguage = localStorage.getItem('language') || 'en';
    return currentLanguage === 'ar' ? (initiative.descriptionAr || '') : (initiative.descriptionEn || initiative.descriptionAr || '').replace(/&nbsp;/g, ' ');
  }

  getInitiativeImage(initiative: InitiativeDto): string {
    return initiative.attachment?.imgPath || 'assets/images/initiative-1.png';
  }

  onImageError(event: any): void {
    event.target.src = 'assets/images/initiative-1.png';
  }
}
