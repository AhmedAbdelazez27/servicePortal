
import { Component } from '@angular/core';
 
import { CommonModule } from '@angular/common';
import { LangChangeEvent, TranslateModule, TranslateService } from '@ngx-translate/core';
import { TranslationService } from '../../../../core/services/translation.service';
import { Subscription } from 'rxjs';
@Component({
  selector: 'app-privacy',
  imports: [CommonModule,TranslateModule],
  templateUrl: './privacy.component.html',
  styleUrl: './privacy.component.scss'
})
export class PrivacyComponent {
  currentLang = 'en';
  private langSub?: Subscription;

 constructor(private translate: TranslateService) {}

  ngOnInit(): void {
    this.currentLang = this.translate.currentLang || this.translate.getDefaultLang();
    this.langSub = this.translate.onLangChange
      .subscribe((e: LangChangeEvent) => this.currentLang = e.lang);
  }

  ngOnDestroy(): void {
    this.langSub?.unsubscribe();
  }
}

 

 

 