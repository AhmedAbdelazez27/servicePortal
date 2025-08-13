import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';
import { ApiEndpoints } from '../constants/api-endpoints';

@Injectable({
    providedIn: 'root'
})
export class EntityInfoService {
    private readonly BASE_URL = `${environment.apiBaseUrl}`;

    constructor(private http: HttpClient) { }


    getEntitiesInfoSelect2(skip: number =0, take: number=10000): Observable<any> {
        
        return this.http.post(`${this.BASE_URL}${ApiEndpoints.EntityInfo.Base}`, { skip , take });
    }

}