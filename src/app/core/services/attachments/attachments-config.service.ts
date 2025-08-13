import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiEndpoints } from '../../constants/api-endpoints';
import {
  AttachmentsConfigDto,
  CreateAttachmentsConfigDto,
  UpdateAttachmentsConfigDto,
  GetAllAttachmentsConfigParamters,
  AttachmentsConfigPagedResponse,
} from '../../dtos/attachments/attachments-config.dto';

@Injectable({
  providedIn: 'root',
})
export class AttachmentsConfigService {
  private readonly BASE_URL = `${environment.apiBaseUrl}${ApiEndpoints.AttachmentsConfig.Base}`;

  constructor(private http: HttpClient) {}

  // Create new attachment config
  createAsync(
    dto: CreateAttachmentsConfigDto
  ): Observable<AttachmentsConfigDto> {
    return this.http.post<AttachmentsConfigDto>(
      `${this.BASE_URL}${ApiEndpoints.AttachmentsConfig.Create}`,
      dto
    );
  }

  // Get attachment config by ID
  get(id: number): Observable<AttachmentsConfigDto> {
    return this.http.get<AttachmentsConfigDto>(
      `${this.BASE_URL}${ApiEndpoints.AttachmentsConfig.GetById(id)}`
    );
  }

  // Update attachment config
  updateAsync(
    dto: UpdateAttachmentsConfigDto
  ): Observable<AttachmentsConfigDto> {
    return this.http.post<AttachmentsConfigDto>(
      `${this.BASE_URL}${ApiEndpoints.AttachmentsConfig.Update}`,
      dto
    );
  }

  // Delete attachment config
  deleteAsync(id: number): Observable<void> {
    return this.http.post<void>(
      `${this.BASE_URL}${ApiEndpoints.AttachmentsConfig.Delete(id)}`,
      null
    );
  }

  // Get all attachment configs with pagination and filtering
  getAll(
    parameters: GetAllAttachmentsConfigParamters
  ): Observable<AttachmentsConfigPagedResponse> {
    return this.http.post<AttachmentsConfigPagedResponse>(
      `${this.BASE_URL}${ApiEndpoints.AttachmentsConfig.GetAll}`,
      parameters
    );
  }
}
