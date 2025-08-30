import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';
import { ApiEndpoints } from '../constants/api-endpoints';

@Injectable({
  providedIn: 'root',
})
export class AdvertisementsService {
  private readonly BASE_URL = `${environment.apiBaseUrl}`;

  constructor(private http: HttpClient) {}

  // Create a new department
  createDepartment(item: any): Observable<any> {
    return this.http.post<any>(
      `${this.BASE_URL}${ApiEndpoints.Advertisement.Create}`,
      item
    );
  }
}
