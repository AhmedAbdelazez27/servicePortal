import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ApiEndpoints } from '../constants/api-endpoints';
import {
  DistributionSiteRequestDto,
  CreateDistributionSiteRequestDto,
  UpdateDistributionSiteRequestDto,
  GetAllDistributionSiteRequestParameter,
  PagedResultDto,
  DistributionLocationTypeDto,
  RegionDto,
  LocationMapDto,
  LocationDetailsDto,
  CheckLocationAvailabilityDto,
  Select2RequestDto,
  Select2Result,
  Select2Item,
} from '../dtos/DistributionSiteRequest/distribution-site-request.dto';

@Injectable({
  providedIn: 'root',
})
export class DistributionSiteRequestService {
  private readonly BASE_URL = `${environment.apiBaseUrl}/FastingTentRequest`;
  private readonly LOCATION_URL = `${environment.apiBaseUrl}${ApiEndpoints.Location.Base}`;
  private readonly LOOKUP_URL = `${environment.apiBaseUrl}`;

  constructor(private http: HttpClient) {}

  // DistributionSiteRequest CRUD operations
  create(dto: CreateDistributionSiteRequestDto): Observable<DistributionSiteRequestDto> {
    return this.http.post<DistributionSiteRequestDto>(
      `${this.BASE_URL}`,
      dto
    );
  }

  getByMainApplyServiceId(mainApplyServiceId: number): Observable<DistributionSiteRequestDto> {
    return this.http.get<DistributionSiteRequestDto>(
      `${this.BASE_URL}/GetByMainApplyServiceId/${mainApplyServiceId}`
    );
  }

  getAll(parameters: GetAllDistributionSiteRequestParameter): Observable<PagedResultDto<DistributionSiteRequestDto>> {
    return this.http.post<PagedResultDto<DistributionSiteRequestDto>>(
      `${this.BASE_URL}/GetAll`,
      parameters
    );
  }

  update(dto: UpdateDistributionSiteRequestDto): Observable<DistributionSiteRequestDto> {
    return this.http.post<DistributionSiteRequestDto>(
      `${this.BASE_URL}/Update`,
      dto
    );
  }

  delete(id: number): Observable<void> {
    return this.http.post<void>(
      `${this.BASE_URL}/Delete/${id}`,
      {}
    );
  }

  // Location related operations
  getLocationSelect2(request: Select2RequestDto): Observable<Select2Result> {
    const headers = new HttpHeaders({ 
      'Content-Type': 'application/json',
      'Apikey': 'Apikeytest' 
    });
    console.log('Making API call to Location Select2:', `${this.LOCATION_URL}${ApiEndpoints.Location.Select2}`);
    
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
    console.log('Making API call to CheckAvailable:', `${this.LOCATION_URL}${ApiEndpoints.Location.CheckAvailable}`);
    
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
    console.log('Making API call to GetLocationById:', `${this.LOCATION_URL}${ApiEndpoints.Location.GetById(id)}`);
    
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
    console.log('Making API call to GetInteractiveMap:', url);
    
    return this.http.post<LocationMapDto[]>(
      url,
      {},
      { headers }
    );
  }

  // Lookup operations
  getDistributionLocationTypes(): Observable<DistributionLocationTypeDto[]> {
    const headers = new HttpHeaders({ Apikey: 'Apikeytest' });
    const url = `${this.LOOKUP_URL}${ApiEndpoints.Lookup.DistributionLocationType}`;
    console.log('Making API call to getDistributionLocationTypes:', url);
    console.log('Request headers:', headers);
    
    return this.http.post<DistributionLocationTypeDto[]>(
      url,
      {},
      { headers }
    ).pipe(
      tap(response => {
        console.log('getDistributionLocationTypes API response:', response);
        console.log('Response type:', typeof response);
        console.log('Is response array?', Array.isArray(response));
      })
    );
  }

  // Get regions for dropdown (GET with query parameters)
  getRegionsSelect2(): Observable<Select2Result> {
    const headers = new HttpHeaders({ 
      'Apikey': 'Apikeytest'
    });
    const params = {
      skip: 0,
      take: 10000
    };
    const url = `${environment.apiBaseUrl}${ApiEndpoints.Regions.Base}${ApiEndpoints.Regions.Select2}`;
    return this.http.get<Select2Result>(url, { headers, params });
  }

  // Helper method to get partner types as dropdown options
  getPartnerTypes(): Select2Item[] {
    return [
      { id: 1, text: 'Person' },
      { id: 2, text: 'Government' },
      { id: 3, text: 'Supplier' },
      { id: 4, text: 'Company' }
    ];
  }
}
