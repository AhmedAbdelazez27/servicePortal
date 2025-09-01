import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { Subject, takeUntil } from 'rxjs';
import { EntityService } from '../../core/services/entit.service';
import { EntityDto, EntityParameter } from '../../core/dtos/Authentication/Entity/entity.dto';
import { TranslationService } from '../../core/services/translation.service';

@Component({
  selector: 'app-charity-organizations',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './charity-organizations.component.html',
  styleUrls: ['./charity-organizations.component.scss']
})
export class CharityOrganizationsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  entities: EntityDto[] = [];
  loading = false;
  error: string | false = false;
  currentLanguage: 'en' | 'ar' = 'en';

  constructor(
    private entityService: EntityService,
    private translationService: TranslationService
  ) {}

  ngOnInit(): void {
    this.loadEntities();
    
    // Subscribe to language changes
    this.translationService.langChange$
      .pipe(takeUntil(this.destroy$))
      .subscribe(lang => {
        this.currentLanguage = lang;
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadEntities(): void {
    this.loading = true;
    this.error = false;

    const params: EntityParameter = {
      skip: 0,
      take: 10000, // Load first 50 entities
      searchValue: ''
    };

    this.entityService.getAllEntities(params)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          // Handle both possible response structures
          if (response && typeof response === 'object') {
            let entitiesArray: EntityDto[] = [];
            
            if (response.items && Array.isArray(response.items)) {
              entitiesArray = response.items;
            } else if (response.data && Array.isArray(response.data)) {
              entitiesArray = response.data;
            } else {
              entitiesArray = [];
            }
            
            // Filter entities to only show those with isShowInPortal = true
            this.entities = entitiesArray.filter(entity => entity.isShowInPortal === true);
          } else {
            this.entities = [];
          }
          
          this.loading = false;
        },
        error: (error) => {
          this.error = 'ERRORS.FAILED_LOAD_CHARITY_ORGANIZATIONS';
          this.loading = false;
        }
      });
  }

  getEntityName(entity: EntityDto): string {
    return this.currentLanguage === 'ar' ? entity.entitY_NAME : entity.entitY_NAME_EN;
  }

  getEntityDescription(entity: EntityDto): string {
    return this.currentLanguage === 'ar' ? entity.descriptionAr : entity.descriptionEn;
  }

  getEntitymobile(entity: EntityDto): string {
    return this.currentLanguage === 'ar' ? entity.entitY_PHONE : entity.entitY_PHONE;
  }
getEntityweb(entity: EntityDto): string {
    return this.currentLanguage === 'ar' ? entity.entitY_WEBSITE : entity.entitY_WEBSITE;
  }
getEntityloc(entity: EntityDto): string {
    return this.currentLanguage === 'ar' ? entity.entitY_LOCALTION : entity.entitY_LOCALTION;
  }



  getEntityImage(entity: EntityDto): string {
    if (entity.attachment && entity.attachment.imgPath) {
      return entity.attachment.imgPath;
    }
    // Return default image if no attachment
    return 'assets/images/initiative-1.png';
  }

  onEntityClick(entity: EntityDto): void {
    // Handle entity click - you can navigate to details page or show modal
  }

  retryLoad(): void {
    this.loadEntities();
  }

  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    if (img) {
      img.src = 'assets/images/initiative-1.png';
    }
  };
  normalizeUrl(u?: string | null): string {
  if (!u) return '';
  const s = u.trim();
  return /^(https?:)?\/\//i.test(s) ? s : `https://${s}`;
}

}
