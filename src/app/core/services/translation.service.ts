import { Injectable } from '@angular/core';
import { TranslateService, LangChangeEvent } from '@ngx-translate/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class TranslationService {
  private langChangeSubject = new BehaviorSubject<'en' | 'ar'>(this.getSavedLang());
  langChange$: Observable<'en' | 'ar'> = this.langChangeSubject.asObservable();

  constructor(private translate: TranslateService) {
    this.translate.addLangs(['en', 'ar']);
    const savedLang = this.getSavedLang();
    this.setLanguage(savedLang);
    this.translate.onLangChange.subscribe((event: LangChangeEvent) => {
      this.langChangeSubject.next(event.lang as 'en' | 'ar');
      this.setDocumentDirection(event.lang as 'en' | 'ar');
    });
  }

  private getSavedLang(): 'en' | 'ar' {
    return (localStorage.getItem('lang') as 'en' | 'ar') || 'en';
  }

  setLanguage(lang: 'en' | 'ar') {
    this.translate.use(lang);
    localStorage.setItem('lang', lang);
    this.setDocumentDirection(lang);
  }

  private setDocumentDirection(lang: 'en' | 'ar') {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.body.classList.remove('rtl', 'ltr');
    document.body.classList.add(lang === 'ar' ? 'rtl' : 'ltr');
  }

  get currentLang(): string {
    return this.translate.currentLang || this.getSavedLang();
  }

  toggleLanguage() {
    const newLang = this.currentLang === 'en' ? 'ar' : 'en';
    this.setLanguage(newLang);
  }
}
