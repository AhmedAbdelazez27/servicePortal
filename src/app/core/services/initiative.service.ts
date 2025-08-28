import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  InitiativeDto,
  CreateInitiativeDto,
  UpdateInitiativeDto,
  GetAllInitiativeParameter,
  InitiativePagedResponse,
  InitiativeDetailsDto,
  CreateInitiativeDetailsDto,
  UpdateInitiativeDetailsDto,
} from '../dtos/UserSetting/initiatives/initiative.dto';

@Injectable({
  providedIn: 'root',
})
export class InitiativeService {
  private readonly apiUrl = `${environment.apiBaseUrl}/Initiative`;

  constructor(private http: HttpClient) {}

  // Initiative CRUD Operations
  getAllAsync(parameters: GetAllInitiativeParameter): Observable<InitiativePagedResponse> {
    return this.http.post<InitiativePagedResponse>(`${this.apiUrl}/GetAll`, parameters);
  }

  getById(id: number): Observable<InitiativeDto> {
    return this.http.get<InitiativeDto>(`${this.apiUrl}/Get/${id}`);
  }

  createAsync(initiative: CreateInitiativeDto): Observable<InitiativeDto> {
    return this.http.post<InitiativeDto>(`${this.apiUrl}/Create`, initiative);
  }

  updateAsync(initiative: UpdateInitiativeDto): Observable<InitiativeDto> {
    return this.http.post<InitiativeDto>(`${this.apiUrl}/Update`, initiative);
  }

  deleteAsync(id: number): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/Delete/${id}`, {});
  }

  // Initiative Details CRUD Operations
  getAllInitiativeDetails(initiativeId: number): Observable<InitiativeDetailsDto[]> {
    return this.http.get<InitiativeDetailsDto[]>(`${this.apiUrl}/${initiativeId}/details`);
  }

  getInitiativeDetailById(initiativeId: number, detailId: number): Observable<InitiativeDetailsDto> {
    return this.http.get<InitiativeDetailsDto>(`${this.apiUrl}/${initiativeId}/details/${detailId}`);
  }

  createInitiativeDetail(detail: CreateInitiativeDetailsDto): Observable<InitiativeDetailsDto> {
    return this.http.post<InitiativeDetailsDto>(`${this.apiUrl}/${detail.initiativeId}/details`, detail);
  }

  updateInitiativeDetail(detail: UpdateInitiativeDetailsDto): Observable<InitiativeDetailsDto> {
    return this.http.put<InitiativeDetailsDto>(`${this.apiUrl}/${detail.initiativeId}/details`, detail);
  }

  deleteInitiativeDetail(initiativeId: number, detailId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${initiativeId}/details/${detailId}`);
  }
}
