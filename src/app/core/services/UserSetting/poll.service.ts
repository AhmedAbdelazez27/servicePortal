import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { Observable } from 'rxjs';
import {
  PollDto,
  CreatePollDto,
  UpdatePollDto,
  GetAllPollRequestDto,
  PagedResultDto,
} from '../../dtos/polls/poll.dto';

@Injectable({
  providedIn: 'root',
})
export class PollService {
  private readonly BASE_URL = `${environment.apiBaseUrl}/Polls`;

  constructor(private http: HttpClient) {}

  // Get all polls with pagination and filtering
  getAllAsync(parameters: GetAllPollRequestDto): Observable<PagedResultDto<PollDto>> {
    return this.http.post<PagedResultDto<PollDto>>(
      `${this.BASE_URL}/GetAll`,
      parameters
    );
  }

  // Get poll by ID
  getAsync(id: number): Observable<PollDto> {
    return this.http.get<PollDto>(`${this.BASE_URL}/Get/${id}`);
  }

  // Create new poll
  createAsync(poll: CreatePollDto): Observable<PollDto> {
    return this.http.post<PollDto>(`${this.BASE_URL}/Create`, poll);
  }

  // Update poll
  updateAsync(poll: UpdatePollDto): Observable<PollDto> {
    return this.http.post<PollDto>(`${this.BASE_URL}/Update`, poll);
  }

  // Delete poll
  deleteAsync(id: number): Observable<void> {
    return this.http.post<void>(`${this.BASE_URL}/Delete/${id}`, {});
  }
}
