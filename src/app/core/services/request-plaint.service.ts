import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ApiEndpoints } from '../constants/api-endpoints';
import { Select2Service } from './Select2.service';
import { FndLookUpValuesSelect2RequestDto } from '../dtos/FndLookUpValuesdtos/FndLookUpValues.dto';
import {
  RequestPlaintDto,
  CreateRequestPlaintDto,
  UpdateRequestPlaintDto,
  MainApplyServiceSelect2RequestDto,
  Select2Result,
  PlaintReasonsDto,
  UserEntityDto
} from '../dtos/RequestPlaint/request-plaint.dto';

@Injectable({
  providedIn: 'root',
})
export class RequestPlaintService {
  private readonly BASE_URL = `${environment.apiBaseUrl}${ApiEndpoints.RequestPlaint.Base}`;
  private readonly MAIN_APPLY_SERVICE_URL = `${environment.apiBaseUrl}${ApiEndpoints.MainApplyRequestService.Base}`;

  constructor(
    private http: HttpClient,
    private select2Service: Select2Service
  ) {}

  // Create RequestPlaint
  create(dto: CreateRequestPlaintDto): Observable<RequestPlaintDto> {
    return this.http.post<RequestPlaintDto>(
      `${this.BASE_URL}${ApiEndpoints.RequestPlaint.Create}`,
      dto
    );
  }
  // Delete RequestPlaint
    delete(id: any): Observable<void> {
    return this.http.post<void>(
      `${this.BASE_URL}${ApiEndpoints.RequestPlaint.Delete(id)}`,
      {}
    );
  }

  // Update RequestPlaint
  update(dto: UpdateRequestPlaintDto): Observable<RequestPlaintDto> {
    return this.http.post<RequestPlaintDto>(
      `${this.BASE_URL}${ApiEndpoints.RequestPlaint.Update}`,
      dto
    );
  }

  // Get RequestPlaint by MainApplyServiceId
  getByMainApplyServiceId(mainApplyServiceId: number): Observable<RequestPlaintDto> {
    return this.http.get<RequestPlaintDto>(
      `${this.BASE_URL}${ApiEndpoints.RequestPlaint.GetByMainApplyServiceId(mainApplyServiceId)}`
    );
  }

  // Get MainApplyService Select2 for dropdown
  getMainApplyServiceSelect2(
    request: MainApplyServiceSelect2RequestDto
  ): Observable<Select2Result> {
    return this.http.post<Select2Result>(
      `${this.MAIN_APPLY_SERVICE_URL}${ApiEndpoints.MainApplyRequestService.GetSelect2}`,
      request
    );
  }

  // Test method to directly test the API endpoint
  testPlaintReasonsEndpoint(): Observable<any> {
    const url = `${environment.apiBaseUrl}${ApiEndpoints.Lookup.PlaintReasons}`;
    const testBody = {
      searchValue: null,
      skip: 0,
      take: 10,
      orderByValue: null
    };
    
    return this.http.post(url, testBody);
  }

  // Get PlaintReasons for dropdown
  getPlaintReasons(): Observable<PlaintReasonsDto[]> {
    const params = new FndLookUpValuesSelect2RequestDto();
    params.searchValue = null;
    params.skip = 0;
    params.take = 1000;
    params.orderByValue = null;
    
    return this.select2Service.getPlaintReasonsSelect2(params).pipe(
      map(response => {
        if (response && response.results) {
          // Convert Select2Result to PlaintReasonsDto format
          return response.results.map(item => ({
            id: Number(item.id) || 0,
            reasonText: item.text || '',
            reasonTextEn: item.text || '',
            isActive: true
          }));
        } else {
          return [];
        }
      })
    );
  }

  // Get User Entities
  getUserEntities(userId: string): Observable<UserEntityDto[]> {
    const requestBody = {
      userId: userId,
      roleId: null
    };
    return this.http.post<UserEntityDto[]>(
      `${environment.apiBaseUrl}${ApiEndpoints.UsersEntities.Base}${ApiEndpoints.UsersEntities.GetUsersEntitiesSelect2List}`,
      requestBody
    );
  }
}
