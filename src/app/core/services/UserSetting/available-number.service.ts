import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { Observable } from 'rxjs';
import { ApiEndpoints } from '../../constants/api-endpoints';
import {
  AvailableNumberDto,
  CreateAvailableNumberDto,
  UpdateAvailableNumberDto,
  GetAllAvailableNumberParameters,
  PagedResultDto,
  Select2RequestDto,
  Select2Result,
} from '../../dtos/UserSetting/available-number.dto';

@Injectable({
  providedIn: 'root',
})
export class AvailableNumberService {
  private readonly BASE_URL = `${environment.apiBaseUrl}${ApiEndpoints.AvailableNumber.Base}`;

  constructor(private http: HttpClient) {}

  // Create new available number
  createAvailableNumber(
    availableNumber: CreateAvailableNumberDto
  ): Observable<AvailableNumberDto> {
    return this.http.post<AvailableNumberDto>(
      `${this.BASE_URL}${ApiEndpoints.AvailableNumber.Create}`,
      availableNumber
    );
  }

  // Get all available numbers with pagination and filtering
  getAllAvailableNumbers(
    params: GetAllAvailableNumberParameters
  ): Observable<PagedResultDto<AvailableNumberDto>> {
    return this.http.post<PagedResultDto<AvailableNumberDto>>(
      `${this.BASE_URL}${ApiEndpoints.AvailableNumber.GetAll}`,
      params
    );
  }

  // Get available number by ID
  getAvailableNumberById(id: number): Observable<AvailableNumberDto> {
    return this.http.get<AvailableNumberDto>(
      `${this.BASE_URL}${ApiEndpoints.AvailableNumber.GetById(id)}`
    );
  }

  // Update available number
  updateAvailableNumber(
    availableNumber: UpdateAvailableNumberDto
  ): Observable<AvailableNumberDto> {
    return this.http.post<AvailableNumberDto>(
      `${this.BASE_URL}${ApiEndpoints.AvailableNumber.Update}`,
      availableNumber
    );
  }

  // Delete available number
  deleteAvailableNumber(id: number): Observable<void> {
    return this.http.post<void>(
      `${this.BASE_URL}${ApiEndpoints.AvailableNumber.Delete(id)}`,
      null
    );
  }
}
