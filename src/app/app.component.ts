import { Component, TemplateRef, ViewChild } from '@angular/core';
import { RouterModule, RouterOutlet } from '@angular/router';
import { TranslationService } from './core/services/translation.service';
import { TranslateModule } from '@ngx-translate/core';
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

   constructor(public translation: TranslationService,private spinner: NgxSpinnerService, private toastr: ToastrService) {
    this.showLoader()
   }

showLoader() {
  this.spinner.show();
  setTimeout(() => this.spinner.hide(), 4000); // مؤقت فقط للتجربة
}

  toggleLang() {
    this.translation.toggleLanguage();
  }
  showSuccess() {
  this.toastr.success('تمت العملية بنجاح', 'نجاح');
}

showError() {
  this.toastr.error('حدث خطأ أثناء العملية', 'خطأ');
}
}
