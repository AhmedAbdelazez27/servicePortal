import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

@Injectable({ providedIn: 'root' })
export class TranslationService {
  constructor(private translate: TranslateService) {
    this.translate.addLangs(['en', 'ar']);
    const savedLang = localStorage.getItem('lang') as 'en' | 'ar' || 'en';
    this.setLanguage(savedLang);
  }

  setLanguage(lang: 'en' | 'ar') {
    this.translate.use(lang);
    localStorage.setItem('lang', lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.body.classList.toggle('rtl', lang === 'ar');
    document.body.classList.toggle('ltr', lang === 'en');
  }

  get currentLang(): string {
    return this.translate.currentLang;
  }

  toggleLanguage() {
    const newLang = this.currentLang === 'en' ? 'ar' : 'en';
    this.setLanguage(newLang);
  }
}
