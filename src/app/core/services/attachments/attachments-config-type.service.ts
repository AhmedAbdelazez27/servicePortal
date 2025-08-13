import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiEndpoints } from '../../constants/api-endpoints';
import { FndLookUpValuesSelect2RequestDto } from '../../dtos/FndLookUpValuesdtos/FndLookUpValues.dto';
import { Select2Result } from '../../dtos/Authentication/Entity/entity.dto';

@Injectable({
  providedIn: 'root',
})
export class AttachmentsConfigTypeService {
  private readonly BASE_URL = `${environment.apiBaseUrl}${ApiEndpoints.AttachmentsConfigType.Base}`;

  constructor(private http: HttpClient) {}

  // Get attachments config type lookup values
  getAttachmentsConfigTypeLookup(
    request: FndLookUpValuesSelect2RequestDto
  ): Observable<Select2Result> {
    return this.http.post<Select2Result>(`${this.BASE_URL}`, request);
  }
}
