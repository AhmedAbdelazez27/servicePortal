
import { Component } from '@angular/core';
 
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { TranslationService } from '../../../../core/services/translation.service';
@Component({
  selector: 'app-privacy',
  imports: [CommonModule,TranslateModule],
  templateUrl: './privacy.component.html',
  styleUrl: './privacy.component.scss'
})
export class PrivacyComponent {
constructor( private translationService: TranslationService
)
{}
}

 

 

 