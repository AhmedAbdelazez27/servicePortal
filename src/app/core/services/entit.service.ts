import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';
import { ApiEndpoints } from '../constants/api-endpoints';
import {
  EntityDto,
  CreateEntityDto,
  UpdateEntityDto,
  EntityParameter,
  PagedResultDto,
  Select2RequestDto,
  Select2Result,
} from '../dtos/Authentication/Entity/entity.dto';

@Injectable({
  providedIn: 'root',
})
export class EntityService {
  private readonly BASE_URL = `${environment.apiBaseUrl}${ApiEndpoints.Entity.Base}`;

  constructor(private http: HttpClient) {}

  // Legacy method for backward compatibility
  getEntities(skip: number, take: number): Observable<any> {
    const params = new HttpParams()
      .set('skip', skip.toString())
      .set('take', take.toString());
    return this.http.get(`${this.BASE_URL}`, {
      params,
    });
  }

  // Create new entity
  createEntity(entity: CreateEntityDto): Observable<EntityDto> {
    return this.http.post<EntityDto>(`${this.BASE_URL}`, entity);
  }

  // Get all entities with pagination and filtering
  getAllEntities(
    params: EntityParameter
  ): Observable<PagedResultDto<EntityDto>> {
    return this.http.post<PagedResultDto<EntityDto>>(
      `${this.BASE_URL}/GetAll`,
      params
    );
  }

  // Get entity by ID
  getEntityById(id: string): Observable<EntityDto> {
    return this.http.get<EntityDto>(`${this.BASE_URL}/${id}`);
  }

  // Update entity
  updateEntity(entity: UpdateEntityDto): Observable<EntityDto> {
    return this.http.put<EntityDto>(`${this.BASE_URL}`, entity);
  }

  // Delete entity
  deleteEntity(id: string): Observable<void> {
    return this.http.delete<void>(`${this.BASE_URL}/${id}`);
  }

  GetSelect2List(skip: number = 0, take: number = 2000): Observable<any> {
    return this.http.post(
      `${this.BASE_URL}${ApiEndpoints.Entity.GetSelect2List}`,
      { take, skip }
    );
  }
}
