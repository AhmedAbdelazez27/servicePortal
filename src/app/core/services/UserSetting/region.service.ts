import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiEndpoints } from '../../constants/api-endpoints';
import {
  RegionDto,
  CreateRegionsDto,
  UpdateRegionDto,
  GetAllRegionParmeters,
  PagedResultDto,
  Select2RequestDto,
  Select2Result,
} from '../../dtos/UserSetting/regions/region.dto';

@Injectable({
  providedIn: 'root',
})
export class RegionService {
  private readonly BASE_URL = `${environment.apiBaseUrl}${ApiEndpoints.Regions.Base}`;

  constructor(private http: HttpClient) {}

  // Create new region
  createAsync(dto: CreateRegionsDto): Observable<RegionDto> {
    return this.http.post<RegionDto>(
      `${this.BASE_URL}${ApiEndpoints.Regions.Create}`,
      dto
    );
  }

  // Get all regions with pagination and filtering
  getAllAsync(
    parameters: GetAllRegionParmeters
  ): Observable<PagedResultDto<RegionDto>> {
    return this.http.post<PagedResultDto<RegionDto>>(
      `${this.BASE_URL}${ApiEndpoints.Regions.GetAll}`,
      parameters
    );
  }

  // Get region by ID
  getAsync(id: number): Observable<RegionDto> {
    return this.http.get<RegionDto>(
      `${this.BASE_URL}${ApiEndpoints.Regions.GetById(id)}`
    );
  }

  // Update region
  updateAsync(dto: UpdateRegionDto): Observable<RegionDto> {
    return this.http.post<RegionDto>(
      `${this.BASE_URL}${ApiEndpoints.Regions.Update}`,
      dto
    );
  }

  // Delete region
  // url will be
  deleteAsync(id: number): Observable<void> {
    return this.http.post<void>(
      `${this.BASE_URL}${ApiEndpoints.Regions.Delete(id)}`,
      {}
    );
  }

  // Get regions for Select2 dropdown
  getRegionsSelect2ListAsync(
    request: Select2RequestDto
  ): Observable<Select2Result> {
    return this.http.get<Select2Result>(
      `${this.BASE_URL}${ApiEndpoints.Regions.Select2}`,
      {
        params: request as any,
      }
    );
  }
}
