import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, tap, map, distinctUntilChanged, catchError, of, shareReplay } from 'rxjs';
import { LoginDto } from '../dtos/login.dto';
import { environment } from '../../../environments/environment';
import { jwtDecode } from "jwt-decode";
import { Router } from '@angular/router';
import { ApiEndpoints } from '../constants/api-endpoints';
import { LoginUAEPassDto, UAEPassDto } from '../dtos/uaepass.dto';
import { ProfileDbService } from './profile-db.service';
import { UserProfile } from '../dtos/user-profile';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly BASE_URL = `${environment.apiBaseUrl}/Login`;
  private readonly UAEPassBASE_URL = `${environment.apiBaseUrl}${ApiEndpoints.User.UAEPassBaseURL}`;

  constructor(private http: HttpClient, private router: Router, private profileDb: ProfileDbService) {}

  // ========== LOGIN ==========
  login(payload: LoginDto): Observable<any> {
    return this.http.post(this.BASE_URL, payload, { withCredentials: true });
  }

  // ========== TOKEN MANAGEMENT ==========
  saveToken(token: string): void {
    localStorage.setItem('access_token', token);
  }

  getToken(): string | null {
    return localStorage.getItem('access_token');
  }

  private clearToken(): void {
    try { localStorage.removeItem('access_token'); } catch {}
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
    const token = this.getToken();
    if (!token) return null;
    try {
      return jwtDecode(token);
    } catch {
      return null;
    }
  }

  // ========== IN-MEMORY STATE ==========
  private userSubject = new BehaviorSubject<UserProfile | null>(null);
  public user$ = this.userSubject.asObservable();
  get snapshot(): UserProfile | null { return this.userSubject.value; }

  async hydrateFromIndexedDb(): Promise<void> {
    const cached = await this.profileDb.getProfile();
    this.userSubject.next(cached);
  }

  setProfile(profile: UserProfile | null) {
    this.userSubject.next(profile);
  }

  public isLoggedIn$ = this.user$.pipe(
    map(p => !!p?.userId),
    distinctUntilChanged()
  );

  get isAuthenticated(): boolean {
    return !!this.snapshot?.userId;
  }

  // ========== LOGOUT ==========
  logout(): Observable<any> {
    return this.LogoutNew().pipe(
      tap(async () => {
        this.clearToken();
        this.setProfile(null);
        await this.profileDb.clearProfile();
      })
    );
  }

  // ========== AUTH STATE ==========
  isLoggedIn(): boolean {
    // 1️⃣ من الـ in-memory snapshot
    if (this.snapshot?.userId) return true;

    // 2️⃣ fallback لو لسه ما تعملش hydrate
    const token = this.getToken();
    if (!token) return false;

    const expMs = this.getTokenExpiryMs(token);
    if (!expMs) return false;

    return Date.now() < expMs;
  }

  getUserId(): string | null {
    // 1️⃣ من الذاكرة
    const id = this.snapshot?.userId;
    if (id) return id;

    // 2️⃣ من التوكن (UAEPASS)
    const decoded = this.decodeToken();
    if (decoded) return this.extractUserIdFromToken(decoded);

    // 3️⃣ legacy
    const legacy = localStorage.getItem('userId');
    return legacy ?? null;
  }

  private extractUserIdFromToken(decodedData: any): string | null {
    const possibleClaims = [
      'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier',
      'nameidentifier','sub','user_id','userId','id','uid','userid'
    ];

    for (const claim of possibleClaims) {
      if (decodedData[claim]) {
        return decodedData[claim].toString();
      }
    }

    for (const [_, value] of Object.entries(decodedData)) {
      if (typeof value === 'string' && value.length > 0 && value.length < 50 && /^[a-zA-Z0-9_-]+$/.test(value)) {
        return value;
      }
    }
    return null;
  }

  getCurrentUser(): { id: string; name?: string } | null {
    const userId = this.getUserId();
    if (!userId) return null;

    const decodedData = this.decodeToken();
    let name = '';

    if (decodedData) {
      const possibleNameClaims = [
        'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name',
        'name','username','user_name','given_name','family_name'
      ];

      for (const claim of possibleNameClaims) {
        if (decodedData[claim]) {
          name = decodedData[claim].toString();
          break;
        }
      }
    }

    return { id: userId, name: name || 'User' };
  }

  // ========== AUTH API CALLS ==========
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

  // ========== UAE PASS ==========
  UAEPasslogin(params: LoginUAEPassDto): Observable<any> {
    const apiUrl = `${this.UAEPassBASE_URL}${ApiEndpoints.User.GetLoginInfo}`;
    return this.http.post<any>(apiUrl, params);
  }

  GetUAEPassInfo(params: LoginUAEPassDto): Observable<UAEPassDto> {
    const apiUrl = `${this.UAEPassBASE_URL}${ApiEndpoints.User.GetUAEPAssInfo}`;
    return this.http.post<UAEPassDto>(apiUrl, params);
  }

  // ========== TWO FACTOR ==========
  VerifyTwoFactor(payload: any): Observable<any> {
    return this.http.post(`${environment.apiBaseUrl}${ApiEndpoints.User.VerifyTwoFactor}`, payload, { withCredentials: true });
  }

  ResendVerifyTwoFactorOtp(payload: any = {}): Observable<any> {
    return this.http.post(`${environment.apiBaseUrl}${ApiEndpoints.User.ResendVerifyTwoFactorOtp}`, payload, { withCredentials: true });
  }

  // ========== LOGOUT API ==========
  LogoutNew(payload: any = {}): Observable<any> {
    return this.http.post(`${environment.apiBaseUrl}${ApiEndpoints.User.Logout}`, payload, { withCredentials: true });
  }

  // ========== PROFILE ==========
  GetMyProfile(): Observable<UserProfile> {
    return this.http.get<UserProfile>(`${environment.apiBaseUrl}/Authenticate`, { withCredentials: true });
  }

  fetchAndCacheProfile(): Observable<UserProfile | null> {
    return this.http.get<UserProfile>(`${environment.apiBaseUrl}/Authenticate`, { withCredentials: true }).pipe(
      tap(async (profile) => {
        await this.profileDb.saveProfile(profile);
        this.setProfile(profile);
      }),
      catchError(() => of(null)),
      shareReplay(1)
    );
  }
}
