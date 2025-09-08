import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { LoginDto } from '../dtos/login.dto';
import { environment } from '../../../environments/environment';
import { jwtDecode } from "jwt-decode";
import { Router } from '@angular/router';
import { ApiEndpoints } from '../constants/api-endpoints';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly BASE_URL = `${environment.apiBaseUrl}/Login`;

  constructor(private http: HttpClient, private router: Router) { }

  login(payload: LoginDto): Observable<any> {
    return this.http.post(this.BASE_URL, payload);
  }

  saveToken(token: string): void {
    localStorage.setItem('access_token', token);
  }

  getToken(): string | null {
    return localStorage.getItem('access_token');
  }

  logout(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('permissions');
    localStorage.removeItem('pages');
    localStorage.removeItem('userId');
    this.router.navigate(['/login']);
  }

  // isLoggedIn(): boolean {
  //   const token = localStorage.getItem('access_token');
  //   return token ? true : false;
  // }
  getAccessToken(): string | null {
    return localStorage.getItem('access_token');
  }

  isLoggedIn(): boolean {
    const token = this.getAccessToken();
    if (!token) return false;

    const expMs = this.getTokenExpiryMs(token);
    if (!expMs) return false;

    return Date.now() < expMs;
  }

  private getTokenExpiryMs(token: string): number | null {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload?.exp ? payload.exp * 1000 : null;
    } catch {
      return null;
    }
  }

  decodeToken(): any {
    const token = localStorage.getItem('access_token');
    if (!token) return null;

    try {
      const decodedToken = jwtDecode(token);
      return decodedToken;
    } catch (error) {
      return null;
    }
  }

  getUserId(): string | null {
    // First try to get from localStorage
    const storedUserId = localStorage.getItem('userId');
    if (storedUserId) {
      return storedUserId;
    }

    // If not in localStorage, try to extract from token
    const decodedData = this.decodeToken();
    if (decodedData) {
      return this.extractUserIdFromToken(decodedData);
    }

    return null;
  }

  getCurrentUser(): { id: string; name?: string } | null {
    const userId = this.getUserId();
    if (!userId) {
      return null;
    }

    const decodedData = this.decodeToken();
    let name = '';

    if (decodedData) {
      // Try to extract name from token
      const possibleNameClaims = [
        'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name',
        'name',
        'username',
        'user_name',
        'given_name',
        'family_name'
      ];

      for (const claim of possibleNameClaims) {
        if (decodedData[claim]) {
          name = decodedData[claim].toString();
          break;
        }
      }
    }

    return {
      id: userId,
      name: name || 'User'
    };
  }

  private extractUserIdFromToken(decodedData: any): string | null {
    // Try multiple possible claim names for user ID
    const possibleUserIdClaims = [
      'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier',
      'nameidentifier',
      'sub',
      'user_id',
      'userId',
      'id',
      'uid',
      'userid'
    ];

    for (const claim of possibleUserIdClaims) {
      if (decodedData[claim]) {
        return decodedData[claim].toString();
      }
    }

    // If no standard claims found, try to find any claim that looks like a user ID
    for (const [key, value] of Object.entries(decodedData)) {
      if (typeof value === 'string' && value.length > 0 && value.length < 50) {
        // Check if it looks like a user ID (alphanumeric, no special chars except - and _)
        if (/^[a-zA-Z0-9_-]+$/.test(value)) {
          return value;
        }
      }
    }

    return null;
  }

  sendOtpToEmail(payload: any): Observable<any> {
    return this.http.post(`${environment.apiBaseUrl}${ApiEndpoints.User.Base}${ApiEndpoints.User.ForgotPassword}`, payload);
  }

  verifyOtp(payload: any): Observable<any> {
    return this.http.post(`${environment.apiBaseUrl}${ApiEndpoints.User.verifyOtp}`, payload);
  }

  otpSendViaEmail(payload: any): Observable<any> {
    return this.http.post(`${environment.apiBaseUrl}${ApiEndpoints.User.OtpSendViaEmail}`, payload);
  }

  resetPassword(payload: any): Observable<any> {
    return this.http.post(`${environment.apiBaseUrl}${ApiEndpoints.User.Base}${ApiEndpoints.User.ResetPassword}`, payload);
  }
}