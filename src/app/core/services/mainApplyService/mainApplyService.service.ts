import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiEndpoints } from '../../constants/api-endpoints';
import { PagedResult } from '../../dtos/FndLookUpValuesdtos/FndLookUpValues.dto';
import { FiltermainApplyServiceDto, mainApplyServiceDto, FiltermainApplyServiceByIdDto } from '../../dtos/mainApplyService/mainApplyService.dto';

@Injectable({
  providedIn: 'root'
})
export class MainApplyService {
  private readonly BASE_URL = `${environment.apiBaseUrl}${ApiEndpoints.MainApplyService.Base}`;

  constructor(private http: HttpClient) { }

  getAll(params: FiltermainApplyServiceDto): Observable<PagedResult<mainApplyServiceDto>> {
    const apiUrl = `${this.BASE_URL}${ApiEndpoints.MainApplyService.GetAll}`;
    return this.http.post<PagedResult<mainApplyServiceDto>>(apiUrl, params);
  }

  getDetailById(params: FiltermainApplyServiceByIdDto): Observable<mainApplyServiceDto> {
    if (!params.id) {
      throw new Error('id must not be null');
    }
    const apiUrl = `${this.BASE_URL}${ApiEndpoints.MainApplyService.GetById(params.id)}`;
    return this.http.get<mainApplyServiceDto>(apiUrl);
  }

  update(params: mainApplyServiceDto): Observable<PagedResult<mainApplyServiceDto>> {
    const apiUrl = `${this.BASE_URL}${ApiEndpoints.MainApplyService.Update}`;
    return this.http.post<PagedResult<mainApplyServiceDto>>(apiUrl, params);
  }
}
