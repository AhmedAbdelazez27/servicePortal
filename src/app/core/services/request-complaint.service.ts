import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiEndpoints } from '../constants/api-endpoints';
import {
  RequestComplaintDto,
  CreateRequestComplaintDto,
  ComplaintTypeDto,
} from '../dtos/RequestComplaint/request-complaint.dto';

@Injectable({
  providedIn: 'root',
})
export class RequestComplaintService {
  private readonly BASE_URL = `${environment.apiBaseUrl}${ApiEndpoints.RequestComplaint.Base}`;

  constructor(private http: HttpClient) {}

  // Create RequestComplaint
  create(dto: CreateRequestComplaintDto): Observable<RequestComplaintDto> {
    return this.http.post<RequestComplaintDto>(
      `${this.BASE_URL}${ApiEndpoints.RequestComplaint.Create}`,
      dto
    );
  }

  // Get RequestComplaint by MainApplyServiceId
  getByMainApplyServiceId(
    mainApplyServiceId: number
  ): Observable<RequestComplaintDto> {
    return this.http.get<RequestComplaintDto>(
      `${this.BASE_URL}${ApiEndpoints.RequestComplaint.GetByMainApplyServiceId(
        mainApplyServiceId
      )}`
    );
  }

  // Get ComplaintTypes for dropdown
  getComplaintTypes(): Observable<ComplaintTypeDto[]> {
    const url = `${environment.apiBaseUrl}${ApiEndpoints.Lookup.ComplaintType}`;
    return this.http.get<ComplaintTypeDto[]>(url);
  }

  // Test method to directly test the ComplaintType endpoint
  testComplaintTypesEndpoint(): Observable<any> {
    const url = `${environment.apiBaseUrl}${ApiEndpoints.Lookup.ComplaintType}`;
    return this.http.get(url);
  }
}
