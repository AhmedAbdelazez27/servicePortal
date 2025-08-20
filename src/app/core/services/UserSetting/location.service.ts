import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiEndpoints } from '../../constants/api-endpoints';
import {
  LocationDto,
  CreateLocationDto,
  UpdateLocationDto,
  GetAllLocationParameter,
  PagedResultDto,
  Select2RequestDto,
  Select2Result,
} from '../../dtos/UserSetting/locations/location.dto';

@Injectable({
  providedIn: 'root',
})
export class LocationService {
  private readonly BASE_URL = `${environment.apiBaseUrl}${ApiEndpoints.Location.Base}`;

  constructor(private http: HttpClient) {}

  // Create new location
  createAsync(dto: CreateLocationDto): Observable<LocationDto> {
    return this.http.post<LocationDto>(
      `${this.BASE_URL}${ApiEndpoints.Location.Create}`,
      dto
    );
  }

  // Get all locations with pagination and filtering
  getAllAsync(
    parameters: GetAllLocationParameter
  ): Observable<PagedResultDto<LocationDto>> {
    return this.http.post<PagedResultDto<LocationDto>>(
      `${this.BASE_URL}${ApiEndpoints.Location.GetAll}`,
      parameters
    );
  }

  // Get location by ID
  getById(id: number): Observable<LocationDto> {
    return this.http.get<LocationDto>(
      `${this.BASE_URL}${ApiEndpoints.Location.GetById(id)}`
    );
  }

  // Update location
  updateAsync(dto: UpdateLocationDto): Observable<LocationDto> {
    return this.http.post<LocationDto>(
      `${this.BASE_URL}${ApiEndpoints.Location.Update}`,
      dto
    );
  }

  // Delete location
  deleteAsync(id: number): Observable<void> {
    return this.http.post<void>(
      `${this.BASE_URL}${ApiEndpoints.Location.Delete(id)}`,
      {}
    );
  }

  // Get locations for Select2 dropdown
  getLocationSelect2Async(
    request: Select2RequestDto
  ): Observable<Select2Result> {
    return this.http.post<Select2Result>(
      `${this.BASE_URL}${ApiEndpoints.Location.Select2}`,
      request
    );
  }

  // Check if location is available
  checkIfLocationAvailableAsync(
    locationId: number,
    userId: string
  ): Observable<boolean> {
    return this.http.post<boolean>(
      `${this.BASE_URL}${ApiEndpoints.Location.CheckAvailable}`,
      {
        locationId,
        userId,
      }
    );
  }
}
