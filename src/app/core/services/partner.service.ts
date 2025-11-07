import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiEndpoints } from '../constants/api-endpoints';
import { FastingTentPartnerDto } from '../dtos/FastingTentRequest/fasting-tent-request.dto';

@Injectable({
  providedIn: 'root',
})
export class PartnerService {
  private readonly BASE_URL = `${environment.apiBaseUrl}${ApiEndpoints.Partner.Base}`;

  constructor(private http: HttpClient) {}

  /**
   * Create a new partner
   */
  create(dto: FastingTentPartnerDto): Observable<FastingTentPartnerDto> {
    return this.http.post<FastingTentPartnerDto>(
      `${this.BASE_URL}${ApiEndpoints.Partner.Create}`,
      dto
    );
  }

  /**
   * Delete a partner by ID
   */
  delete(id: number): Observable<void> {
    return this.http.post<void>(
      `${this.BASE_URL}${ApiEndpoints.Partner.Delete(id)}`,
      {}
    );
  }
}

