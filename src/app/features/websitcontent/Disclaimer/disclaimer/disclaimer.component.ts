import { Component } from '@angular/core';
 
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { TranslationService } from '../../../../core/services/translation.service';
@Component({
  selector: 'app-disclaimer',
  imports: [CommonModule,TranslateModule],
  templateUrl: './disclaimer.component.html',
  styleUrl: './disclaimer.component.scss',
  standalone:true,
})


export class DisclaimerComponent {
constructor( private translationService: TranslationService
)
{}
}

 

 