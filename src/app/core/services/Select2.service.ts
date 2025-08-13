import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';
import { FndLookUpValuesSelect2RequestDto, FndLookUpValuesSelect2RequestbyIdDto, SelectdropdownResult } from '../dtos/FndLookUpValuesdtos/FndLookUpValues.dto';
import { Select2APIEndpoint } from '../constants/select2api-endpoints';
import { loadVendorNameDto } from '../dtos/FinancialDtos/OperationDtos/vendor.models';
import { loadBeneficentNameDto } from '../dtos/sponsorship/operations/beneficent.dto';

@Injectable({
  providedIn: 'root'
})
export class Select2Service {

  private readonly BASE_URL = `${environment.apiBaseUrl}`;
  constructor(private http: HttpClient) { }

  getEntitySelect2(params: FndLookUpValuesSelect2RequestDto): Observable<any> {
    const apiUrl = `${this.BASE_URL}${Select2APIEndpoint.Select2.GetEntitySelect2List}`
    return this.http.post<SelectdropdownResult>(apiUrl, params);
  }

  getPaymentTypeSelect2(params: FndLookUpValuesSelect2RequestDto): Observable<SelectdropdownResult> {
    const apiUrl = `${this.BASE_URL}${Select2APIEndpoint.Select2.GetApPymentTypeSelect2List}`
    return this.http.post<SelectdropdownResult>(apiUrl, params);
  }

  getApVendorSelect2(params: FndLookUpValuesSelect2RequestDto): Observable<SelectdropdownResult> {
    const apiUrl = `${this.BASE_URL}${Select2APIEndpoint.Select2.GetApVendorSelect2List}`
    return this.http.post<SelectdropdownResult>(apiUrl, params);
  }

  getArMiscStatusSelect2(params: FndLookUpValuesSelect2RequestDto): Observable<SelectdropdownResult> {
    const apiUrl = `${this.BASE_URL}${Select2APIEndpoint.Select2.GetArMiscStatusSelect2List}`
    return this.http.post<SelectdropdownResult>(apiUrl, params);
  }

  getBenNameSelect2(params: FndLookUpValuesSelect2RequestDto): Observable<SelectdropdownResult> {
    const apiUrl = `${this.BASE_URL}${Select2APIEndpoint.Select2.GetSpBenSelect2List}`
    return this.http.post<SelectdropdownResult>(apiUrl, params);
  }

  getProjectNameSelect2(params: FndLookUpValuesSelect2RequestDto): Observable<SelectdropdownResult> {
    const apiUrl = `${this.BASE_URL}${Select2APIEndpoint.Select2.GetProjectNameSelect2List}`
    return this.http.post<SelectdropdownResult>(apiUrl, params);
  }

  getCollectorSelect2(params: FndLookUpValuesSelect2RequestDto): Observable<SelectdropdownResult> {
    const apiUrl = `${this.BASE_URL}${Select2APIEndpoint.Select2.GetCollectorsSelect2List}`
    return this.http.post<SelectdropdownResult>(apiUrl, params);
  }

  getCategorySelect2(params: FndLookUpValuesSelect2RequestDto): Observable<SelectdropdownResult> {
    const apiUrl = `${this.BASE_URL}${Select2APIEndpoint.Select2.ReceiptIdentifierSelect2List}`
    return this.http.post<SelectdropdownResult>(apiUrl, params);
  }

  getCountrySelect2(params: FndLookUpValuesSelect2RequestDto): Observable<SelectdropdownResult> {
    const apiUrl = `${this.BASE_URL}${Select2APIEndpoint.Select2.GetFndCountrySelect2List}`
    return this.http.post<SelectdropdownResult>(apiUrl, params);
  }

  getBranchSelect2(params: FndLookUpValuesSelect2RequestDto): Observable<SelectdropdownResult> {
    const apiUrl = `${this.BASE_URL}${Select2APIEndpoint.Select2.GetBranchSelect2List}`
    return this.http.post<SelectdropdownResult>(apiUrl, params);
  }

  getDeptSelect2(params: FndLookUpValuesSelect2RequestDto): Observable<SelectdropdownResult> {
    const apiUrl = `${this.BASE_URL}${Select2APIEndpoint.Select2.GetDepartmentSelect2List}`
    return this.http.post<SelectdropdownResult>(apiUrl, params);
  }

  getAccountSelect2(params: FndLookUpValuesSelect2RequestDto): Observable<SelectdropdownResult> {
    const apiUrl = `${this.BASE_URL}${Select2APIEndpoint.Select2.GetGlAccountSelect2List}`
    return this.http.post<SelectdropdownResult>(apiUrl, params);
  }

  getBeneficentIdSelect2(params: FndLookUpValuesSelect2RequestDto): Observable<SelectdropdownResult> {
    const apiUrl = `${this.BASE_URL}${Select2APIEndpoint.Select2.GetSpBeneficentsSelect2List}`
    return this.http.post<SelectdropdownResult>(apiUrl, params);
  }

  getGlPeriodSelect2(params: FndLookUpValuesSelect2RequestDto): Observable<SelectdropdownResult> {
    const apiUrl = `${this.BASE_URL}${Select2APIEndpoint.Select2.GetGlPeriodDetailSelect2List}`
    return this.http.post<SelectdropdownResult>(apiUrl, params);
  }

  getVendorSelect2(params: FndLookUpValuesSelect2RequestDto): Observable<SelectdropdownResult> {
    const apiUrl = `${this.BASE_URL}${Select2APIEndpoint.Select2.GetApVendorSelect2List}`
    return this.http.post<SelectdropdownResult>(apiUrl, params);
  }

  getInvoiceTypeSelect2(params: FndLookUpValuesSelect2RequestDto): Observable<SelectdropdownResult> {
    const apiUrl = `${this.BASE_URL}${Select2APIEndpoint.Select2.GetInvoiceTypeSelect2List}`
    return this.http.post<SelectdropdownResult>(apiUrl, params);
  }

  getMiscPaymentStatusSelect2(params: FndLookUpValuesSelect2RequestDto): Observable<SelectdropdownResult> {
    const apiUrl = `${this.BASE_URL}${Select2APIEndpoint.Select2.GetMiscPaymentStatusSelect2List}`
    return this.http.post<SelectdropdownResult>(apiUrl, params);
  }

  getVendorStatusSelect2(params: FndLookUpValuesSelect2RequestDto): Observable<SelectdropdownResult> {
    const apiUrl = `${this.BASE_URL}${Select2APIEndpoint.Select2.GetApVendorStatusSelect2List}`
    return this.http.post<SelectdropdownResult>(apiUrl, params);
  }

  getVendorIDSelect2(loadVendorNameDto: loadVendorNameDto): Observable<SelectdropdownResult> {
    const apiUrl = `${this.BASE_URL}${Select2APIEndpoint.Select2.GetvendorSelect2List}`
    return this.http.post<SelectdropdownResult>(apiUrl, loadVendorNameDto);
  }

  getJe_SourceSelect2(params: FndLookUpValuesSelect2RequestDto): Observable<SelectdropdownResult> {
    const apiUrl = `${this.BASE_URL}${Select2APIEndpoint.Select2.GetJvSourceSelect2List}`
    return this.http.post<SelectdropdownResult>(apiUrl, params);
  }

  getGljeStatusSelect2(params: FndLookUpValuesSelect2RequestDto): Observable<SelectdropdownResult> {
    const apiUrl = `${this.BASE_URL}${Select2APIEndpoint.Select2.GetJeStatusSelect2List}`
    return this.http.post<SelectdropdownResult>(apiUrl, params);
  }

  getJe_CurrSelect2(params: FndLookUpValuesSelect2RequestDto): Observable<SelectdropdownResult> {
    const apiUrl = `${this.BASE_URL}${Select2APIEndpoint.Select2.GetCurrencySelect2List}`
    return this.http.post<SelectdropdownResult>(apiUrl, params);
  }
  getBeneficentNamebyEntityID(loadBeneficentNameDto: loadBeneficentNameDto): Observable<SelectdropdownResult> {
    const apiUrl = `${this.BASE_URL}${Select2APIEndpoint.Select2.GetSpBenSelect2ListBYEntityID}`
    return this.http.post<SelectdropdownResult>(apiUrl, loadBeneficentNameDto);
  }

  getSpOfficesSelect2(params: FndLookUpValuesSelect2RequestDto): Observable<SelectdropdownResult> {
    const apiUrl = `${this.BASE_URL}${Select2APIEndpoint.Select2.SpOfficesSelect2List}`;
    return this.http.post<SelectdropdownResult>(apiUrl, params);
  }

  getSpCasesPaymentSelect2(params: FndLookUpValuesSelect2RequestDto): Observable<SelectdropdownResult> {
    const apiUrl = `${this.BASE_URL}${Select2APIEndpoint.Select2.SpCasesPaymentSelect2List}`;
    return this.http.post<SelectdropdownResult>(apiUrl, params);
  }

  getPaymentStatusSelect2(params: FndLookUpValuesSelect2RequestDto): Observable<SelectdropdownResult> {
    const apiUrl = `${this.BASE_URL}${Select2APIEndpoint.Select2.PaymentStatusSelect2List}`;
    return this.http.post<SelectdropdownResult>(apiUrl, params);
  }

  SpContractsNoSelect2(loadBeneficentNameDto: FndLookUpValuesSelect2RequestDto): Observable<SelectdropdownResult> {
    const apiUrl = `${this.BASE_URL}${Select2APIEndpoint.Select2.GetSpContractsNoSelect2List}`
    return this.http.post<SelectdropdownResult>(apiUrl, loadBeneficentNameDto);
  }

  getContractStatusSelect2(params: FndLookUpValuesSelect2RequestDto): Observable<SelectdropdownResult> {
    const apiUrl = `${this.BASE_URL}${Select2APIEndpoint.Select2.GetContractStatusSelect2List}`
    return this.http.post<SelectdropdownResult>(apiUrl, params);
  }

  getBenefPaymentTypeSelect2(params: FndLookUpValuesSelect2RequestDto): Observable<SelectdropdownResult> {
    const apiUrl = `${this.BASE_URL}${Select2APIEndpoint.Select2.GetBenefPaymentTypeSelect2List}`
    return this.http.post<SelectdropdownResult>(apiUrl, params);
  }
  
    getGlPeriodYearsSelect2List(): Observable<SelectdropdownResult> {
    const apiUrl = `${this.BASE_URL}${Select2APIEndpoint.Select2.GetGlPeriodYearsSelect2List}`
    return this.http.post<SelectdropdownResult>(apiUrl, { skip: 0, take: 300 });
  }
  getChartTypeRevenueAndExpenses(): Observable<any> {
    const apiUrl = `${this.BASE_URL}${Select2APIEndpoint.Select2.ChartTypeRevenueAndExpenses}`
    return this.http.get<SelectdropdownResult>(apiUrl);
  }
  getSponcerCategorySelect2(params: FndLookUpValuesSelect2RequestDto): Observable<SelectdropdownResult> {
    const apiUrl = `${this.BASE_URL}${Select2APIEndpoint.Select2.GetSponcerCategorySelect2List}`
    return this.http.post<SelectdropdownResult>(apiUrl, params);
  }

  getNationalitySelect2(params: FndLookUpValuesSelect2RequestDto): Observable<SelectdropdownResult> {
    const apiUrl = `${this.BASE_URL}${Select2APIEndpoint.Select2.GetNationalitySelect2List}`
    return this.http.post<SelectdropdownResult>(apiUrl, params);
  }

  getSpCaseSelect2(params: FndLookUpValuesSelect2RequestDto): Observable<SelectdropdownResult> {
    const apiUrl = `${this.BASE_URL}${Select2APIEndpoint.Select2.GetSpCaseSelect2List}`
    return this.http.post<SelectdropdownResult>(apiUrl, params);
  }
   
  getNameSelect2(params: FndLookUpValuesSelect2RequestDto): Observable<SelectdropdownResult> {
    const apiUrl = `${this.BASE_URL}${Select2APIEndpoint.Select2.GetNameSelect2List}`;
    return this.http.post<SelectdropdownResult>(apiUrl, params);
  }

  getCasesBranchSelect2(params: FndLookUpValuesSelect2RequestDto): Observable<SelectdropdownResult> {
    const apiUrl = `${this.BASE_URL}${Select2APIEndpoint.Select2.GetCasesBranchSelect2List}`;
    return this.http.post<SelectdropdownResult>(apiUrl, params);
  }

  getRequestTypeSelect2(params: FndLookUpValuesSelect2RequestDto): Observable<SelectdropdownResult> {
    const apiUrl = `${this.BASE_URL}${Select2APIEndpoint.Select2.GetRequestTypeSelect2List}`;
    return this.http.post<SelectdropdownResult>(apiUrl, params);
  }

  getCitySelect2(params: FndLookUpValuesSelect2RequestDto): Observable<SelectdropdownResult> {
    const apiUrl = `${this.BASE_URL}${Select2APIEndpoint.Select2.GetCitySelect2List}`;
    return this.http.post<SelectdropdownResult>(apiUrl, params);
  }

  getGenderSelect2(params: FndLookUpValuesSelect2RequestDto): Observable<SelectdropdownResult> {
    const apiUrl = `${this.BASE_URL}${Select2APIEndpoint.Select2.GetGenderSelect2List}`;
    return this.http.post<SelectdropdownResult>(apiUrl, params);
  }

  getAidRequestSourceSelect2(params: FndLookUpValuesSelect2RequestDto): Observable<SelectdropdownResult> {
    const apiUrl = `${this.BASE_URL}${Select2APIEndpoint.Select2.GetAidRequestSourceSelect2List}`;
    return this.http.post<SelectdropdownResult>(apiUrl, params);
  }

  getSPCasesEntitySelect2(params: FndLookUpValuesSelect2RequestbyIdDto): Observable<SelectdropdownResult> {
    const apiUrl = `${this.BASE_URL}${Select2APIEndpoint.Select2.GetSPCasesEntitySelect2List}`
    return this.http.post<SelectdropdownResult>(apiUrl, params);
  }

  getRequestTypeReportSelect2(params: FndLookUpValuesSelect2RequestDto): Observable<SelectdropdownResult> {
    const apiUrl = `${this.BASE_URL}${Select2APIEndpoint.Select2.GetRequestTypeReportSelect2List}`
    return this.http.post<SelectdropdownResult>(apiUrl, params);
  }

  getCaseStatusSelect2(params: FndLookUpValuesSelect2RequestDto): Observable<SelectdropdownResult> {
    const apiUrl = `${this.BASE_URL}${Select2APIEndpoint.Select2.CaseStatusSelect2List}`
    return this.http.post<SelectdropdownResult>(apiUrl, params);
  }

  getScProjectStatusSelect2(params: FndLookUpValuesSelect2RequestDto): Observable<SelectdropdownResult> {
    const apiUrl = `${this.BASE_URL}${Select2APIEndpoint.Select2.GetScProjectStatusSelect2List}`
    return this.http.post<SelectdropdownResult>(apiUrl, params);
  }

  getScProjectTypeSelect2(params: FndLookUpValuesSelect2RequestDto): Observable<SelectdropdownResult> {
    const apiUrl = `${this.BASE_URL}${Select2APIEndpoint.Select2.GetScProjectTypeSelect2List}`
    return this.http.post<SelectdropdownResult>(apiUrl, params);
  }
}
