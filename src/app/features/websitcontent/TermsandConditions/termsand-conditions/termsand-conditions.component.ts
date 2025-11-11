import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { LangChangeEvent, TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-termsand-conditions',
  imports: [CommonModule, TranslateModule],
  templateUrl: './termsand-conditions.component.html',
  styleUrl: './termsand-conditions.component.scss'
})
export class TermsandConditionsComponent implements OnInit, OnDestroy {
  currentLang = 'en';
  private langSub?: Subscription;

  constructor(private translate: TranslateService) {}

  ngOnInit(): void {
    this.currentLang =
      this.translate.currentLang ||
      this.translate.getDefaultLang() ||
      this.translate.getBrowserLang() ||
      'en';

    this.langSub = this.translate.onLangChange
      .subscribe((e: LangChangeEvent) => (this.currentLang = e.lang));
  }

  ngOnDestroy(): void {
    this.langSub?.unsubscribe();
  }
}
