import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiEndpoints } from '../constants/api-endpoints';
import {
  FastingTentRequestDto,
  CreateFastingTentRequestDto,
  UpdateFastingTentRequestDto,
  GetAllFastingTentRequestParameter,
  PagedResultDto,
  TentLocationTypeDto,
  LocationMapDto,
  LocationDetailsDto,
  CheckLocationAvailabilityDto,
  Select2RequestDto,
  Select2Result,
  Select2Item,
} from '../dtos/FastingTentRequest/fasting-tent-request.dto';

@Injectable({
  providedIn: 'root',
})
export class FastingTentRequestService {
  private readonly BASE_URL = `${environment.apiBaseUrl}${ApiEndpoints.FastingTentRequest.Base}`;
  private readonly LOCATION_URL = `${environment.apiBaseUrl}${ApiEndpoints.Location.Base}`;
  private readonly LOOKUP_URL = `${environment.apiBaseUrl}`;
  lang ?: string ;

  constructor(private http: HttpClient) {
    this.lang =localStorage.getItem('lang') || "en";
  }

  // FastingTentRequest CRUD operations
  create(dto: CreateFastingTentRequestDto): Observable<FastingTentRequestDto> {
    return this.http.post<FastingTentRequestDto>(
      `${this.BASE_URL}${ApiEndpoints.FastingTentRequest.Create}`,
      dto
    );
  }

  getByMainApplyServiceId(mainApplyServiceId: number): Observable<FastingTentRequestDto> {
    return this.http.get<FastingTentRequestDto>(
      `${this.BASE_URL}${ApiEndpoints.FastingTentRequest.GetByMainApplyServiceId(mainApplyServiceId)}`
    );
  }

  getAll(parameters: GetAllFastingTentRequestParameter): Observable<PagedResultDto<FastingTentRequestDto>> {
    return this.http.post<PagedResultDto<FastingTentRequestDto>>(
      `${this.BASE_URL}${ApiEndpoints.FastingTentRequest.GetAll}`,
      parameters
    );
  }

  update(dto: UpdateFastingTentRequestDto): Observable<FastingTentRequestDto> {
    return this.http.post<FastingTentRequestDto>(
      `${this.BASE_URL}${ApiEndpoints.FastingTentRequest.Update}`,
      dto
    );
  }

  delete(id: any): Observable<void> {
    return this.http.post<void>(
      `${this.BASE_URL}${ApiEndpoints.FastingTentRequest.Delete(id)}`,
      {}
    );
  }

  // Location related operations
  getLocationSelect2(request: Select2RequestDto): Observable<Select2Result> {
    const headers = new HttpHeaders({ 
      'Content-Type': 'application/json',
      'Apikey': 'Apikeytest' 
    });
    
    return this.http.post<Select2Result>(
      `${this.LOCATION_URL}${ApiEndpoints.Location.Select2}`,
      request,
      { headers }
    );
  }

  checkLocationAvailability(dto: CheckLocationAvailabilityDto): Observable<boolean> {
    const headers = new HttpHeaders({ 
      'Content-Type': 'application/json',
      'Apikey': 'Apikeytest' 
    });
    
    return this.http.post<boolean>(
      `${this.LOCATION_URL}${ApiEndpoints.Location.CheckAvailable}`,
      dto,
      { headers }
    );
  }

  getLocationById(id: number): Observable<LocationDetailsDto> {
    const headers = new HttpHeaders({ 
      'Content-Type': 'application/json',
      'Apikey': 'Apikeytest' 
    });
    
    return this.http.get<LocationDetailsDto>(
      `${this.LOCATION_URL}${ApiEndpoints.Location.GetById(id)}`,
      { headers }
    );
  }

  getInteractiveMap(): Observable<LocationMapDto[]> {
    const headers = new HttpHeaders({ 
      'Content-Type': 'application/json',
      'Apikey': 'Apikeytest' 
    });
    const url = `${this.LOCATION_URL}${ApiEndpoints.Location.GetInteractiveMap}`;
    
    return this.http.post<LocationMapDto[]>(
      url,
      {},
      { headers }
    );
  }

  // Lookup operations
  getTentLocationTypes(): Observable<TentLocationTypeDto[]> {
    const headers = new HttpHeaders({ Apikey: 'Apikeytest' });
    const url = `${this.LOOKUP_URL}${ApiEndpoints.Lookup.TentLocationType}`;
    
    return this.http.post<TentLocationTypeDto[]>(
      url,
      {},
      { headers }
    );
  }

  // Test endpoints for development/debugging
  testTentLocationTypesEndpoint(): Observable<any> {
    return this.http.get<any>(
      `${this.LOOKUP_URL}${ApiEndpoints.Lookup.TentLocationType}`
    );
  }

  testLocationSelect2Endpoint(request: Select2RequestDto): Observable<any> {
    return this.http.post<any>(
      `${this.LOCATION_URL}${ApiEndpoints.Location.Select2}`,
      request
    );
  }

  testCheckAvailabilityEndpoint(dto: CheckLocationAvailabilityDto): Observable<any> {
    return this.http.post<any>(
      `${this.LOCATION_URL}${ApiEndpoints.Location.CheckAvailable}`,
      dto
    );
  }

  testGetInteractiveMapEndpoint(): Observable<any> {
    return this.http.get<any>(
      `${this.LOCATION_URL}${ApiEndpoints.Location.GetInteractiveMap}`
    );
  }

  // Helper method to get partner types as dropdown options
  getPartnerTypes(): Select2Item[] {
      const isAr = this.lang === 'ar'; 

    return [
      { id: 1, text: 'Person', label: isAr ? 'شخص'         : 'Person'  },
      { id: 2, text: 'Government', label: isAr ? 'جهة حكومية'  : 'Government' },
      { id: 3, text: 'Supplier', label: isAr ? 'مورد'        : 'Supplier'  },
      { id: 4, text: 'Company' , label: isAr ? 'شركة'        : 'Company' }
    ];
  }
}
