import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-registration-pending',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
  ],
  templateUrl: './registration-pending.component.html',
  styleUrl: './registration-pending.component.scss'
})
export class RegistrationPendingComponent {
  
  constructor(
    private router: Router,
    public translate: TranslateService
  ) {}

  goToLogin(): void {
    this.router.navigate(['/login']);
  }

  goToHome(): void {
    this.router.navigate(['/home']);
  }
}
