import { Component, TemplateRef, ViewChild } from '@angular/core';
import { RouterModule, RouterOutlet } from '@angular/router';
import { TranslationService } from './core/services/translation.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgxSpinnerModule, NgxSpinnerService } from 'ngx-spinner';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-root',
  imports: [TranslateModule,RouterModule,NgxSpinnerModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
    @ViewChild('customSpinner', { static: true }) customSpinnerTemplate!: TemplateRef<any>;

   constructor(public translation: TranslationService, private spinner: NgxSpinnerService, private toastr: ToastrService, private translate: TranslateService) {
    this.showLoader()
   }

showLoader() {
  this.spinner.show();
  setTimeout(() => this.spinner.hide(), 4000);
}

  toggleLang() {
    this.translation.toggleLanguage();
  }
  showSuccess() {
    this.toastr.success(
      this.translate.instant('APP.MESSAGES.OPERATION_SUCCESS'), 
      this.translate.instant('TOAST.TITLE.SUCCESS')
    );
  }

  showError() {
    this.toastr.error(
      this.translate.instant('APP.MESSAGES.OPERATION_ERROR'), 
      this.translate.instant('TOAST.TITLE.ERROR')
    );
  }
}
