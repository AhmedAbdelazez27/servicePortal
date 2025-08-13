import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';
import { ApiEndpoints } from '../constants/api-endpoints';
import {
  ServiceDto,
  CreateServiceDto,
  UpdateServiceDto,
  GetAllServicesParameters,
  PagedResultDto,
} from '../dtos/serviceSetting/serviceSetting.dto';

@Injectable({
  providedIn: 'root',
})
export class ServiceSettingService {
  private readonly BASE_URL = `${environment.apiBaseUrl}${ApiEndpoints.Services.Base}`;

  constructor(private http: HttpClient) {}

  // Get all services with pagination and filtering
  getAll(
    parameters: GetAllServicesParameters
  ): Observable<PagedResultDto<ServiceDto>> {
    return this.http.post<PagedResultDto<ServiceDto>>(
      `${this.BASE_URL}${ApiEndpoints.Services.GetAll}`,
      parameters
    );
  }

  // Get service by ID
  getById(id: number): Observable<ServiceDto> {
    return this.http.post<ServiceDto>(
      `${this.BASE_URL}${ApiEndpoints.Services.GetById(id)}`,
      {}
    );
  }

  // Create new service
  createAsync(service: CreateServiceDto): Observable<ServiceDto> {
    return this.http.post<ServiceDto>(`${this.BASE_URL}`, service);
  }

  // Update service
  updateAsync(service: UpdateServiceDto): Observable<ServiceDto> {
    return this.http.post<ServiceDto>(
      `${this.BASE_URL}${ApiEndpoints.Services.Update}`,
      service
    );
  }

  // Delete service
  deleteAsync(id: number): Observable<void> {
    return this.http.delete<void>(
      `${this.BASE_URL}${ApiEndpoints.Services.Delete(id)}`
    );
  }
}
