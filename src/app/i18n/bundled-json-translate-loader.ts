import { Injectable } from '@angular/core';
import { TranslateLoader } from '@ngx-translate/core';
import { Observable, of } from 'rxjs';

import en from './en.json';
import ar from './ar.json';

@Injectable({ providedIn: 'root' })
export class BundledJsonTranslateLoader implements TranslateLoader {
  private readonly dict: Record<string, any> = { en, ar };

  getTranslation(lang: string): Observable<any> {
    return of(this.dict[lang] ?? {}); 
  }
}
