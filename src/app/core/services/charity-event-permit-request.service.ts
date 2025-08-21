import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';
import { ApiEndpoints } from '../constants/api-endpoints';
import { Select2APIEndpoint } from '../constants/select2api-endpoints';
import { FndLookUpValuesSelect2RequestDto } from '../dtos/FndLookUpValues.dto';

@Injectable({
    providedIn: 'root',
})
export class CharityEventPermitRequestService {
    private readonly BASE_URL = `${environment.apiBaseUrl}`;

    constructor(private http: HttpClient) { }


    getAdvertisementType(): Observable<any> {
        return this.http.get(`${this.BASE_URL}${Select2APIEndpoint.Select2.GetAdvertisementTypeSelect2List}`);
    }

    getAdvertisementMethodType(body: any): Observable<any> {
        const url = `${this.BASE_URL}${Select2APIEndpoint.Select2.GetAdvertisementMethodTypeSelect2List}`;
        const requestBody = {
            skip: body.skip || 0,
            take: body.take || 600,
            searchValue: body.searchValue || '',
            lookupType: body.lookupType || null,
            orderByValue: body.orderByValue || null,
        };
        return this.http.post<any>(url, requestBody);
    }

    getAdvertisementTargetType(body: any): Observable<any> {
        const url = `${this.BASE_URL}${Select2APIEndpoint.Select2.GetAdvertisementTargetTypeSelect2List}`;
        const requestBody = {
            skip: body.skip || 0,
            take: body.take || 600,
            searchValue: body.searchValue || '',
            lookupType: body.lookupType || null,
            orderByValue: body.orderByValue || null,
        };
        return this.http.post<any>(url, requestBody);
    }

    getDonationCollectionChannel(body: any): Observable<any> {
        const url = `${this.BASE_URL}${Select2APIEndpoint.Select2.GetDonationCollectionChannel}`;
        const requestBody = {
            skip: body.skip || 0,
            take: body.take || 600,
            searchValue: body.searchValue || '',
            orderByValue: body.orderByValue || null,
        };
        return this.http.post<any>(url, requestBody);
    }

    getPartners(skip: any = 0, take: any = 600): Observable<any> {
        const params = new HttpParams()
            .set('skip', skip.toString())
            .set('take', take.toString());
        return this.http.get(`${this.BASE_URL}${Select2APIEndpoint.Select2.GetPartner}`, {
            params,
        });
    };

    create(dto: any): Observable<any> {
        return this.http.post<any>(
            `${this.BASE_URL}${ApiEndpoints.CharityEventPermit.Base}${ApiEndpoints.CharityEventPermit.Create}`,
            dto
        );
    }

    getPermitTypeSelect2(body: any): Observable<any> {
        const url = `${this.BASE_URL}${Select2APIEndpoint.Select2.GetPermitTypeSelect2}`;
        const requestBody = {
            skip: body.skip || 0,
            take: body.take || 600,
            searchValue: body.searchValue || '',
            orderByValue: body.orderByValue || null,
        };
        return this.http.post<any>(url, requestBody);
    }
    getPermitRequestTypeSelect2(body: any): Observable<any> {
        const url = `${this.BASE_URL}${Select2APIEndpoint.Select2.GetPermitRequestTypeSelect2}`;
        const requestBody = {
            skip: body.skip || 0,
            take: body.take || 600,
            searchValue: body.searchValue || '',
            orderByValue: body.orderByValue || null,
        };
        return this.http.post<any>(url, requestBody);
    }
}
