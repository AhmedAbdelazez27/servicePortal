import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { filter, take, finalize } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ApiEndpoints } from '../constants/api-endpoints';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class RefreshTokenService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);

  private isRefreshing = false;
  private refreshed$ = new BehaviorSubject<boolean | null>(null);

  // 👇 Anti-loop memory (لو آخر محاولة فشلت قريب، امنع الضرب)
  private lastOutcome: boolean | null = null; // true/false/null
  private lastAttemptAt = 0;                  // timestamp ms
  private readonly SUPPRESS_MS = 4000;        // امنع إعادة المحاولة خلال 4 ثوانٍ بعد فشل

  refresh(): Observable<boolean> {
    const now = Date.now();

    // لو آخر محاولة فشلت من قريب → رجّع false فورًا
    if (this.lastOutcome === false && (now - this.lastAttemptAt) < this.SUPPRESS_MS) {
      return of(false);
    }

    // لو فيه محاولة جارية → استنى نفس النتيجة
    if (this.isRefreshing) {
      return this.refreshed$.pipe(
        filter((v): v is boolean => v !== null),
        take(1)
      );
    }

    this.isRefreshing = true;
    this.refreshed$.next(null);
    this.lastAttemptAt = now;

    const url = `${environment.apiBaseUrl}${ApiEndpoints.User.RefreshToken}`;

    // ✅ لو السيرفر محتاج body = "" و Content-Type text/plain (زي curl)، استخدم ده:
    // const req$ = this.http.post<any>(url, '', {
    //   withCredentials: true,
    //   headers: new HttpHeaders({ 'Content-Type': 'text/plain' })
    // });

    // وإلا JSON فاضي كفاية:
    const req$ = this.http.post<any>(url, {}, { withCredentials: true });

    return new Observable<boolean>(subscriber => {
      req$
        .pipe(finalize(() => { this.isRefreshing = false; }))
        .subscribe({
          next: (res) => {
            // لو Bearer جديد
            if (res?.access_token) {
              this.auth.saveToken(res.access_token);
            }
            this.lastOutcome = true;
            this.refreshed$.next(true);
            subscriber.next(true);
            subscriber.complete();
          },
          error: () => {
            // فشل: انضف أي Bearer محلي
            try { localStorage.removeItem('access_token'); } catch {}
            this.lastOutcome = false;
            this.refreshed$.next(false);
            subscriber.next(false);
            subscriber.complete();
          }
        });
    });
  }
}
