import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CreateUserDto } from '../dtos/create-user.dto';
import { ApiEndpoints } from '../constants/api-endpoints';


@Injectable({
  providedIn: 'root'
})
export class UserService {

  private readonly BASE_URL = `${environment.apiBaseUrl}`;

  constructor(private http: HttpClient) { }

  createUser(payload: CreateUserDto): Observable<any> {
    return this.http.post(`${this.BASE_URL}${ApiEndpoints.User.Base}`, payload);
  }

  getUsers(payload: any): Observable<any> {
    // const params = new HttpParams().set('skip', skip).set('take', take).set('searchValue', searchValue);
    return this.http.post<any>(`${this.BASE_URL}${ApiEndpoints.User.Base}${ApiEndpoints.User.GetAll}`, { ...payload });
  }

  updateUser(payload: any): Observable<any> {
    return this.http.post(`${this.BASE_URL}${ApiEndpoints.User.Base}/Update`, payload);
  }

  getUserById(id: string): Observable<any> {
    return this.http.get(`${this.BASE_URL}${ApiEndpoints.User.GetById(id)}`);
  }

  getUserTypes(): Observable<any> {
    return this.http.get(`${this.BASE_URL}${ApiEndpoints.User.Base}${ApiEndpoints.User.UserType}`);
  }

  deleteUser(id: string): Observable<any> {
    return this.http.post(`${this.BASE_URL}${ApiEndpoints.User.Delete(id)}`, {});
  }

  getUsersForSelect2(payload: {
    searchValue: string | null,
    skip: number,
    take: number,
    orderByValue: string | null
  }): Observable<any> {
    return this.http.post(`${this.BASE_URL}${ApiEndpoints.User.GetUsersSelect2List}`, payload);
  }

  assignDepartments(payload: { userId: string; departmentIds: number[] }) {
    return this.http.post(`${this.BASE_URL}${ApiEndpoints.UsersDepartments.Base}${ApiEndpoints.UsersDepartments.Assign}`, payload);
  }

  assignEntities(payload: { userId: string; entityIds: number[] }) {
    return this.http.post(`${this.BASE_URL}${ApiEndpoints.UsersEntities.Base}${ApiEndpoints.UsersEntities.AssignUserEntities}`, payload);
  }
  AssignRoleEntities(payload: { roleId: string; entityIds: number[] }) {
    return this.http.post(`${this.BASE_URL}${ApiEndpoints.UsersEntities.Base}${ApiEndpoints.UsersEntities.AssignRoleEntities}`, payload);
  }

  getUserDepartments(payload: { userId: string }) {
    return this.http.post(`${this.BASE_URL}${ApiEndpoints.UsersDepartments.Base}`, payload);
  }

  getUserIntities(payload: { userId?: any, roleId?: any }) {
    return this.http.post(`${this.BASE_URL}${ApiEndpoints.UsersEntities.Base}${ApiEndpoints.UsersEntities.GetUsersEntitiesSelect2List}`, payload);
  }

  getUserPermission(userId: string) {
    return this.http.get(`${this.BASE_URL}${ApiEndpoints.User.GetUserPermissionList(userId)}`);
  }
  deleteUserPermission(payload: any): Observable<any> {
    return this.http.post(`${this.BASE_URL}${ApiEndpoints.User.DeleteActionPermission}`, payload);
  }
  createUserPermission(payload: any) {
    return this.http.post(`${this.BASE_URL}${ApiEndpoints.User.AssignActionPermission}`, payload);

  }

  getUserStatusSelect2(skip: number = 0, take: number = 10000): Observable<any> {

    return this.http.post(`${this.BASE_URL}${ApiEndpoints.UserStatus.Base}`, { skip, take });
  }

  changeUserPassword(payload: any): Observable<any> {

    return this.http.post(`${this.BASE_URL}${ApiEndpoints.User.Base}${ApiEndpoints.User.ChangePassword}`, payload);
  }

  updateUserStatus(payload: any): Observable<any> {

    return this.http.post(`${this.BASE_URL}${ApiEndpoints.User.Base}${ApiEndpoints.User.UpdateUserStatus}`, payload);
  }
}
