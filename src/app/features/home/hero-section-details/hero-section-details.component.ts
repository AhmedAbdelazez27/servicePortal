import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { HeroSectionSettingService } from '../../../core/services/UserSetting/hero-section-setting.service';
import { HeroSectionSettingDto } from '../../../core/dtos/UserSetting/hero-section-setting.dto';
import { TranslationService } from '../../../core/services/translation.service';

@Component({
  selector: 'app-hero-section-details',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './hero-section-details.component.html',
  styleUrls: ['./hero-section-details.component.scss']
})
export class HeroSectionDetailsComponent implements OnInit {
  heroSection: HeroSectionSettingDto | null = null;
  loading = false;
  error = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private heroSectionService: HeroSectionSettingService,
    private translationService: TranslationService,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    this.loadHeroSectionDetails();
  }

  loadHeroSectionDetails(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error = 'ERRORS.INVALID_ID';
      return;
    }

    this.loading = true;
    this.error = '';

    this.heroSectionService.getById(+id).subscribe({
      next: (response: HeroSectionSettingDto) => {
        this.heroSection = response;
        this.loading = false;
      },
      error: (error: any) => {
        this.error = 'ERRORS.FAILED_LOAD_HERO_SECTION';
        this.loading = false;
      }
    });
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
    event.target.alt = this.translate.instant('HOME.HERO_SECTION.NO_IMAGE');
  }

  onBackToHome(): void {
    this.router.navigate(['/home']);
  }

  onExternalLink(link: string): void {
    if (link) {
      window.open(link, '_blank');
    }
  }
}
