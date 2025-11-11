import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiEndpoints } from '../constants/api-endpoints';
import { PagedResult } from '../dtos/FndLookUpValuesdtos/FndLookUpValues.dto';
import { 
  filteraidRequestsDto, 
  aidRequestsDto, 
  filteraidRequestsByIdDto, 
  aidRequestsShowDetailsDto, 
  aidRequestsStudyDetailsDto 
} from '../dtos/aidRequests/aidRequests.dto';

@Injectable({
  providedIn: 'root',
})
export class AidRequestService {
  private readonly BASE_URL = `${environment.apiBaseUrl}${ApiEndpoints.AidRequest.Base}`;
  private readonly AidRequestsStudiesBASE_URL = `${environment.apiBaseUrl}${ApiEndpoints.AidRequest.AidRequestsStudiesBase}`;
  private readonly AidRequestsZakatBASE_URL = `${environment.apiBaseUrl}${ApiEndpoints.AidRequest.AidRequestsZakatBase}`;
  private readonly QuotationHeaderBASE_URL = `${environment.apiBaseUrl}${ApiEndpoints.AidRequest.QuotationHeaderBase}`;

  constructor(private http: HttpClient) {}

  // Get Aid Request by ID Number
  getAidRequestByIdNumber(idNumber: string): Observable<any> {
    return this.http.get<any>(
      `${this.BASE_URL}${ApiEndpoints.AidRequest.GetAidRequestByIdNumber(idNumber)}`
    );
  }

  // Get All Aid Requests - POST with params (only idNumber required)
  getAll(params: filteraidRequestsDto): Observable<PagedResult<aidRequestsDto>> {
    // idNumber is required
    if (!params?.caseIdNo) {
      return throwError(() => 'idNumber (caseIdNo) is required');
    }
    
    // Only send idNumber and orderByValue
    const requestParams = new filteraidRequestsDto();
    requestParams.caseIdNo = params.caseIdNo;
    requestParams.orderByValue = 'details1.CASE_CODE asc';
    requestParams.skip = params.skip;
    requestParams.take = params.take;
    requestParams.searchValue = params.searchValue;
    
    const apiUrl = `${this.BASE_URL}${ApiEndpoints.AidRequest.GetAll}`;
    return this.http.post<PagedResult<aidRequestsDto>>(apiUrl, requestParams);
  }

  // Get Show Detail By Id - POST with params
  getShowDetailById(params: filteraidRequestsByIdDto): Observable<aidRequestsShowDetailsDto> {
    if (!params.caseCode || !params.entityId || !params.caseId) {
      return throwError(() => 'caseCode, entityId and caseId must not be null');
    }
    const apiUrl = `${this.BASE_URL}${ApiEndpoints.AidRequest.GetShowDetailById}`;
    return this.http.post<aidRequestsShowDetailsDto>(apiUrl, params);
  }

  // Get Aid Requests Study By Id - POST with params
  getAidRequestsStudyById(params: filteraidRequestsByIdDto): Observable<aidRequestsStudyDetailsDto> {
    if (!params.studyId || !params.entityId) {
      return throwError(() => 'studyId and entityId must not be null');
    }
    const apiUrl = `${this.AidRequestsStudiesBASE_URL}${ApiEndpoints.AidRequest.GetAidRequestsStudyDetailById}`;
    return this.http.post<aidRequestsStudyDetailsDto>(apiUrl, params);
  }

  // Get Zakat Study Detail By Id - POST with params
  getZakatStudyDetailById(params: filteraidRequestsByIdDto): Observable<aidRequestsStudyDetailsDto> {
    if (!params.headerId || !params.entityId) {
      return throwError(() => 'headerId and entityId must not be null');
    }
    const apiUrl = `${this.AidRequestsZakatBASE_URL}${ApiEndpoints.AidRequest.GetZakatStudyDetailById}`;
    return this.http.post<aidRequestsStudyDetailsDto>(apiUrl, params);
  }

  // Get Quotation Header Detail By Id - POST with params
  getQuotationHeaderDetailById(params: filteraidRequestsByIdDto): Observable<aidRequestsStudyDetailsDto> {
    if (!params.headerId || !params.entityId) {
      return throwError(() => 'headerId and entityId must not be null');
    }
    const apiUrl = `${this.QuotationHeaderBASE_URL}${ApiEndpoints.AidRequest.GetQuotationHeaderDetailById}`;
    return this.http.post<aidRequestsStudyDetailsDto>(apiUrl, params);
  }
}
