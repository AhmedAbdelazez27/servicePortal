import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  HeroSectionSettingDto,
  CreateHeroSectionSettingDto,
  UpdateHeroSectionSettingDto,
  GetAllHeroSectionSettingRequestDto,
} from '../../dtos/UserSetting/hero-section-setting.dto';
import { PagedResultDto } from '../../dtos/serviceSetting/serviceSetting.dto';

@Injectable({
  providedIn: 'root',
})
export class HeroSectionSettingService {
  private readonly BASE_URL = `${environment.apiBaseUrl}/HeroSectionSetting`;

  constructor(private http: HttpClient) {}

  // Get all hero section settings with pagination and filtering
  getAll(request: GetAllHeroSectionSettingRequestDto): Observable<PagedResultDto<HeroSectionSettingDto>> {
    return this.http.post<PagedResultDto<HeroSectionSettingDto>>(
      `${this.BASE_URL}/GetAll`,
      request
    );
  }

  // Get hero section setting by ID
  getById(id: number): Observable<HeroSectionSettingDto> {
    return this.http.get<HeroSectionSettingDto>(`${this.BASE_URL}/Get/${id}`);
  }

  // Create new hero section setting
  create(request: CreateHeroSectionSettingDto): Observable<HeroSectionSettingDto> {
    return this.http.post<HeroSectionSettingDto>(`${this.BASE_URL}/Create`, request);
  }

  // Update hero section setting
  update(request: UpdateHeroSectionSettingDto): Observable<HeroSectionSettingDto> {
    return this.http.post<HeroSectionSettingDto>(`${this.BASE_URL}/Update`, request);
  }

  // Delete hero section setting
  delete(id: number): Observable<void> {
    return this.http.post<void>(`${this.BASE_URL}/Delete/${id}`, {});
  }
}
