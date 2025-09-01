import { Component } from '@angular/core';
import { TranslationService } from '../../../core/services/translation.service';

@Component({
  selector: 'app-aboutcouncile',
  imports: [],
  templateUrl: './aboutcouncile.component.html',
  styleUrl: './aboutcouncile.component.scss'
})
export class AboutcouncileComponent {
 
constructor(    private translationService: TranslationService
)
{}
}
