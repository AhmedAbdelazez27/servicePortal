import { Component } from '@angular/core';
import { TranslationService } from '../../../core/services/translation.service';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-aboutcouncile',
  imports: [CommonModule,TranslateModule],
  templateUrl: './aboutcouncile.component.html',
  styleUrl: './aboutcouncile.component.scss'
})
export class AboutcouncileComponent {
 
constructor(    private translationService: TranslationService
)
{}
}
