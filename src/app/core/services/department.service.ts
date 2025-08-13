import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';
import { ApiEndpoints } from '../constants/api-endpoints';
import {
  DepartmentDto,
  CreateDepartmentDto,
  UpdateDepartmentDto,
  DepartmentParameter,
  PagedResultDto,
} from '../dtos/Authentication/Department/department.dto';

@Injectable({
  providedIn: 'root',
})
export class DepartmentService {
  private readonly BASE_URL = `${environment.apiBaseUrl}${ApiEndpoints.Departments.Base}`;

  constructor(private http: HttpClient) {}

  // Create a new department
  createDepartment(department: CreateDepartmentDto): Observable<DepartmentDto> {
    return this.http.post<DepartmentDto>(
      `${this.BASE_URL}${ApiEndpoints.Departments.Create}`,
      department
    );
  }

  // Update an existing department
  updateDepartment(department: UpdateDepartmentDto): Observable<DepartmentDto> {
    return this.http.post<DepartmentDto>(
      `${this.BASE_URL}${ApiEndpoints.Departments.Update}`,
      department
    );
  }

  // Get department by ID
  getDepartment(id: number): Observable<DepartmentDto> {
    return this.http.get<DepartmentDto>(
      `${this.BASE_URL}${ApiEndpoints.Departments.Get(id)}`
    );
  }

  // Get all departments with pagination and filtering
  getAllDepartments(parameters: DepartmentParameter): Observable<any> {
    const url = `${this.BASE_URL}${ApiEndpoints.Departments.GetAll}`;

    // Try with pagination parameters first
    const requestBody = {
      skip: parameters.skip || 0,
      take: parameters.take || 10,
      searchValue: parameters.searchValue || '',
      isActive: parameters.isActive,
    };

    console.log('API URL:', url);
    console.log('Request body:', requestBody);

    return this.http.post<any>(url, requestBody);
  }

  // Delete department by ID
  deleteDepartment(id: number): Observable<void> {
    return this.http.post<void>(
      `${this.BASE_URL}${ApiEndpoints.Departments.Delete(id)}`,
      {}
    );
  }

  // Get departments for Select2 dropdown
  // Legacy method for backward compatibility
  getDepartments(skip: number, take: number): Observable<any> {
    return this.http.post(
      `${this.BASE_URL}${ApiEndpoints.Departments.Select2}`,
      { take, skip }
    );
  }
}
