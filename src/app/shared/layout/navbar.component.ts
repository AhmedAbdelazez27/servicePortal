import { Component } from '@angular/core';
import { TranslationService } from '../../core/services/translation.service';
import { TranslateService, TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-navbar',
  imports: [TranslateModule],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss'
})
export class NavbarComponent {
  currentLang: string = 'en';

  constructor(public translation: TranslationService, private translate: TranslateService) {
    this.currentLang = this.translate.currentLang || this.translate.getDefaultLang() || 'ar';

    this.translate.onLangChange.subscribe(lang => {
      this.currentLang = lang.lang;
    });

  }

  toggleLang() {
    this.translation.toggleLanguage();  
  } 


}
