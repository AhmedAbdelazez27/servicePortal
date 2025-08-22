import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiEndpoints } from '../../constants/api-endpoints';
import { 
  CreateWorkFlowCommentDto, 
  UpdateWorkFlowCommentDto, 
  GetAllWorkFlowCommentParameter,
  PagedResultDto
} from '../../dtos/workFlowComments/workFlowComments.dto';
import { WorkFlowCommentDto } from '../../dtos/mainApplyService/mainApplyService.dto';

@Injectable({
  providedIn: 'root'
})
export class WorkFlowCommentsService {
  private readonly BASE_URL = `${environment.apiBaseUrl}/WorkFlowComments`;

  constructor(private http: HttpClient) { }

  create(params: CreateWorkFlowCommentDto): Observable<WorkFlowCommentDto> {
    const apiUrl = `${this.BASE_URL}/Create`;
    return this.http.post<WorkFlowCommentDto>(apiUrl, params);
  }

  update(params: UpdateWorkFlowCommentDto): Observable<WorkFlowCommentDto> {
    const apiUrl = `${this.BASE_URL}/Update`;
    return this.http.put<WorkFlowCommentDto>(apiUrl, params);
  }

  delete(id: number): Observable<void> {
    const apiUrl = `${this.BASE_URL}/Delete/${id}`;
    return this.http.delete<void>(apiUrl);
  }

  getById(id: number): Observable<WorkFlowCommentDto> {
    const apiUrl = `${this.BASE_URL}/GetById/${id}`;
    return this.http.get<WorkFlowCommentDto>(apiUrl);
  }

  getAll(params: GetAllWorkFlowCommentParameter): Observable<PagedResultDto<WorkFlowCommentDto>> {
    const apiUrl = `${this.BASE_URL}/GetAll`;
    return this.http.post<PagedResultDto<WorkFlowCommentDto>>(apiUrl, params);
  }
}
