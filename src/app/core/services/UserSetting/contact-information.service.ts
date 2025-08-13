import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiEndpoints } from '../../constants/api-endpoints';
import {
  ContactInformationDto,
  CreateContactInformationDto,
  UpdateContactInformationDto,
  GetAllContactInformationParameters,
  PagedResultDto,
} from '../../dtos/UserSetting/contact-information.dto';

@Injectable({
  providedIn: 'root',
})
export class ContactInformationService {
  private readonly BASE_URL = `${environment.apiBaseUrl}${ApiEndpoints.ContactInformation.Base}`;

  constructor(private http: HttpClient) {}

  // Create new contact information
  createContactInformation(
    contactInformation: CreateContactInformationDto
  ): Observable<ContactInformationDto> {
    return this.http.post<ContactInformationDto>(
      `${this.BASE_URL}${ApiEndpoints.ContactInformation.Create}`,
      contactInformation
    ).pipe(
      map(response => ({
        ...response,
        creationDate: new Date(response.creationDate)
      }))
    );
  }

  // Get all contact information with pagination and filtering
  getAllContactInformation(
    params: GetAllContactInformationParameters
  ): Observable<PagedResultDto<ContactInformationDto>> {
    return this.http.post<PagedResultDto<ContactInformationDto>>(
      `${this.BASE_URL}${ApiEndpoints.ContactInformation.GetAll}`,
      params
    ).pipe(
      map(response => ({
        ...response,
        data: response.data.map(item => ({
          ...item,
          creationDate: new Date(item.creationDate)
        }))
      }))
    );
  }

  // Get contact information by ID
  getContactInformationById(id: number): Observable<ContactInformationDto> {
    return this.http.get<ContactInformationDto>(
      `${this.BASE_URL}${ApiEndpoints.ContactInformation.GetById(id)}`
    ).pipe(
      map(response => ({
        ...response,
        creationDate: new Date(response.creationDate)
      }))
    );
  }

  // Update contact information
  updateContactInformation(
    contactInformation: UpdateContactInformationDto
  ): Observable<ContactInformationDto> {
    return this.http.post<ContactInformationDto>(
      `${this.BASE_URL}${ApiEndpoints.ContactInformation.Update}`,
      contactInformation
    ).pipe(
      map(response => ({
        ...response,
        creationDate: new Date(response.creationDate)
      }))
    );
  }

  // Delete contact information
  deleteContactInformation(id: number): Observable<void> {
    return this.http.delete<void>(
      `${this.BASE_URL}${ApiEndpoints.ContactInformation.Delete(id)}`
    );
  }
}
