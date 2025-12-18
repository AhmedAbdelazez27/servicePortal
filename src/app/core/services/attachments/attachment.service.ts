import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiEndpoints } from '../../constants/api-endpoints';
import {
  AttachmentDto,
  AttachmentBase64Dto,
  CreateAttachmentDto,
  UpdateAttachmentBase64Dto,
  GetAllAttachmentsParamters,
} from '../../dtos/attachments/attachment.dto';
import {
  AttachmentsConfigDto,
  GetAllAttachmentsConfigParamters,
  AttachmentsConfigType,
  AttachmentsConfigPagedResponse,
  GetAllWithMultipleTypesParamters,
} from '../../dtos/attachments/attachments-config.dto';
import { PagedResultDto } from '../../dtos/Authentication/Entity/entity.dto';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class AttachmentService {
  private readonly BASE_URL = `${environment.apiBaseUrl}${ApiEndpoints.Attachments.Base}`;
  private readonly CONFIG_BASE_URL = `${environment.apiBaseUrl}${ApiEndpoints.AttachmentsConfig.Base}`;

  constructor(private http: HttpClient) { }

  // Create new attachment
  createAsync(dto: CreateAttachmentDto): Observable<AttachmentDto> {
    return this.http.post<AttachmentDto>(`${this.BASE_URL}`, dto);
  }

  // Get attachment by ID
  getAsync(id: number): Observable<AttachmentDto> {
    return this.http.get<AttachmentDto>(
      `${this.BASE_URL}${ApiEndpoints.Attachments.GetById(id)}`
    );
  }

  // Update attachment
  updateAsync(dto: UpdateAttachmentBase64Dto): Observable<AttachmentDto> {
    return this.http.post<AttachmentDto>(
      `${this.BASE_URL}${ApiEndpoints.Attachments.Update}`,
      dto
    );
  }

  // Delete attachment
  deleteAsync(id: number): Observable<void> {
    return this.http.post<void>(
      `${this.BASE_URL}${ApiEndpoints.Attachments.Delete(id)}`,
      {}
    );
  }

  // Delete attachment file (deletes file and record)
  deleteAttachmentFile(id: number): Observable<void> {
    return this.http.delete<void>(
      `${this.BASE_URL}${ApiEndpoints.Attachments.DeleteFile(id)}`
    );
  }

  // Save attachment file with base64
  saveAttachmentFileBase64(
    dto: AttachmentBase64Dto
  ): Observable<AttachmentDto> {
    return this.http.post<AttachmentDto>(
      `${this.BASE_URL}${ApiEndpoints.Attachments.SaveFile}`,
      dto
    );
  }

  // Save multiple attachment files with base64
  saveAttachmentFileBase64Multiple(
    list: AttachmentBase64Dto[],
    masterId: number
  ): Observable<AttachmentDto[]> {
    // Update masterId for all items in the list
    const updatedList = list.map((item) => ({ ...item, masterId }));

    return this.http.post<AttachmentDto[]>(
      `${this.BASE_URL}${ApiEndpoints.Attachments.SaveFiles}`,
      updatedList
    );
  }

  // Get attachment by master ID and type
  getByMasterId(
    masterId: number,
    masterType: number
  ): Observable<AttachmentDto> {
    return this.http.get<AttachmentDto>(
      `${this.BASE_URL}${ApiEndpoints.Attachments.GetByMasterId(
        masterId,
        masterType
      )}`
    );
  }

  // Get attachments list by master ID and type
  getListByMasterId(
    masterId: number,
    masterType: number
  ): Observable<AttachmentDto[]> {
    return this.http.get<AttachmentDto[]>(
      `${this.BASE_URL}${ApiEndpoints.Attachments.GetListByMasterId(
        masterId,
        masterType
      )}`
    );
  }

  // Get attachments list by multiple master IDs and type
  getListByMasterIds(
    masterIds: number[],
    masterType: number
  ): Observable<AttachmentDto[]> {
    return this.http.post<AttachmentDto[]>(
      `${this.BASE_URL}${ApiEndpoints.Attachments.GetListByMasterIds}`,
      { masterIds, masterType }
    );
  }

  // Get attachments list
  getList(
    parameters: GetAllAttachmentsParamters
  ): Observable<PagedResultDto<AttachmentDto>> {
    return this.http.post<PagedResultDto<AttachmentDto>>(
      `${this.BASE_URL}${ApiEndpoints.Attachments.GetAll}`,
      parameters
    );
  }

  // Get attachments config by type
  getAttachmentsConfigByType(
    configType: AttachmentsConfigType,
    active?: boolean | null,
    mandatory?: boolean | null
  ): Observable<AttachmentsConfigDto[]> {
    const parameters: GetAllAttachmentsConfigParamters = {
      skip: 0,
      take: 100,
      attachmentConfigType: configType,
      active: active,
      mendatory: mandatory,
    };
    return this.http
      .post<AttachmentsConfigPagedResponse>(
        `${this.CONFIG_BASE_URL}${ApiEndpoints.AttachmentsConfig.GetAll}`,
        parameters
      )
      .pipe(map((result) => result.data || []));
  }

  // Get attachment config by ID
  getAttachmentConfig(id: number): Observable<AttachmentsConfigDto> {
    return this.http.get<AttachmentsConfigDto>(
      `${this.CONFIG_BASE_URL}${ApiEndpoints.AttachmentsConfig.GetById(id)}`
    );
  }

  getAttachmentsConfigByTypes(
    configTypes: (AttachmentsConfigType | number)[],
    options?: {
      active?: boolean | null;
      mandatory?: boolean | null;
      skip?: number;
      take?: number;
    }
  ): Observable<AttachmentsConfigDto[]> {
    const parameters: GetAllWithMultipleTypesParamters = {
      skip: options?.skip ?? 0,
      take: options?.take ?? 100,
      attachmentConfigTypes: configTypes,
      active: options?.active ?? null,
      mandatory: options?.mandatory ?? null,
    };

    return this.http
      .post<AttachmentsConfigPagedResponse>(
        `${this.CONFIG_BASE_URL}${ApiEndpoints.AttachmentsConfig.GetAllWithMultipleTypes}`,
        parameters
      )
      .pipe(map(res => res.data ?? []));
  }   

  getAttachmentsMultiTypes(parameters:any): Observable<any[]> {
    
    return this.http
      .post<AttachmentsConfigPagedResponse>(
        `${this.CONFIG_BASE_URL}${ApiEndpoints.AttachmentsConfig.GetAllWithMultipleTypes}`,
        parameters
      )
      .pipe(map(res => res.data ?? []));
  }   

}
