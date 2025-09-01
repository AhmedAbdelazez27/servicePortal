import { Component } from '@angular/core';
import { TranslationService } from '../../../core/services/translation.service';

@Component({
  selector: 'app-aboutmanagermessage',
  imports: [],
  templateUrl: './aboutmanagermessage.component.html',
  styleUrl: './aboutmanagermessage.component.scss'
})
export class AboutmanagermessageComponent {
constructor(    private translationService: TranslationService
)
{}
}
