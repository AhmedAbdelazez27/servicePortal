import { Component } from '@angular/core';
import { TranslationService } from '../../../core/services/translation.service';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-aboutmanagermessage',
  imports: [TranslateModule],
  templateUrl: './aboutmanagermessage.component.html',
  styleUrl: './aboutmanagermessage.component.scss'
})
export class AboutmanagermessageComponent {
constructor(    private translationService: TranslationService
)
{}
}
