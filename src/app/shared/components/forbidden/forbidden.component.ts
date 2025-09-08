import { Component, OnDestroy } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService, LangChangeEvent } from '@ngx-translate/core';
import { Subscription } from 'rxjs';

@Component({
  standalone: true,
  selector: 'app-forbidden',
  imports: [CommonModule, RouterLink, TranslateModule],
  template: `
    <section class="forbidden" [attr.dir]="dir">
      <div class="card">
        <div class="icon" aria-hidden="true">
         
          <svg viewBox="0 0 24 24" width="56" height="56" role="img" focusable="false">
            <path d="M6 10V8a6 6 0 1 1 12 0v2h1a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1h1zm2 0h8V8a4 4 0 0 0-8 0v2zm4 5a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"/>
          </svg>
        </div>

        <h1 class="title">{{ 'forbidden.title' | translate }}</h1>
        <p class="message bg-transparent" style="back">
          {{ 'forbidden.message' | translate }}
        </p>

        <div class="actions">
          <a class="btn primary" routerLink="/home">
            {{ 'forbidden.go_home' | translate }}
          </a>
         
          <a class="btn link" routerLink="/contact-us">
            {{ 'forbidden.contact' | translate }}
          </a>
        </div>

        <p class="hint">
          {{ 'forbidden.hint' | translate }}
        </p>
      </div>
    </section>
  `,
  styles: [`
    :host { display:block; }
    .forbidden {
      min-height: calc(100dvh - 120px);
      display:flex; align-items:center; justify-content:center;
      padding: 32px;
      background:
        radial-gradient(1000px 400px at 0% 0%, rgba(0,0,0,0.03), transparent),
        radial-gradient(1000px 400px at 100% 100%, rgba(0,0,0,0.03), transparent);
    }
    .card {
      width: min(640px, 100%);
      background: #fff;
      border-radius: 20px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.08);
      padding: 32px 28px;
      text-align: center;
    }
    .icon {
      width: 72px; height:72px;
      margin: 0 auto 12px;
      border-radius: 50%;
      display:grid; place-items:center;
      background: #f4f6ff;
    }
    .icon svg { fill: #4f46e5; }
    .title {
      margin: 12px 0 6px;
      font-size: clamp(22px, 2.4vw, 28px);
      font-weight: 700; color: #111827;
    }
    .message {
      margin: 0 auto 18px;
      color: #4b5563;
      line-height: 1.7;
      max-width: 46ch;
    }
    .actions {
      display:flex; gap:12px; flex-wrap:wrap;
      justify-content:center; margin: 8px 0 10px;
    }
    .btn {
      appearance: none; border: 1px solid #e5e7eb; background: #fff; color:#111827;
      padding: 10px 16px; border-radius: 12px; cursor: pointer; font-weight: 600;
      transition: transform .05s ease, box-shadow .2s ease, background .2s ease, border-color .2s ease;
      text-decoration: none; display:inline-flex; align-items:center; justify-content:center;
    }
    .btn:hover { box-shadow: 0 6px 18px rgba(0,0,0,0.08); }
    .btn:active { transform: translateY(1px); }
    .btn.primary {
      background: #4f46e5; border-color: #4f46e5; color: #fff;
    }
    .btn.link {
      background: transparent; border-color: transparent; color: #4f46e5;
    }
    .hint {
      margin-top: 16px; font-size: 0.925rem; color:#6b7280;
    }

    [dir="rtl"] .btn { direction: rtl; }
    .message{
    background-color: transparent !important;
}
  `]
})
export class ForbiddenComponent implements OnDestroy {
  dir: 'ltr' | 'rtl' = 'ltr';
  private sub?: Subscription;

  constructor(private router: Router, private translate: TranslateService) {
    this.dir = this.translate.currentLang?.startsWith('ar') ? 'rtl' : 'ltr';
    this.sub = this.translate.onLangChange.subscribe((e: LangChangeEvent) => {
      this.dir = e.lang.startsWith('ar') ? 'rtl' : 'ltr';
    });
  }

  goBack() {
    if (window.history.length > 1) window.history.back();
    else this.router.navigateByUrl('/home');
  }

  ngOnDestroy(): void { this.sub?.unsubscribe(); }
}
