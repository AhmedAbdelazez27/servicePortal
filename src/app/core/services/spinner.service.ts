import { Injectable } from '@angular/core';
import { NgxSpinnerService } from 'ngx-spinner';

@Injectable({
  providedIn: 'root',
})
export class SpinnerService {
  private spinnerCount = 0;

  constructor(private spinner: NgxSpinnerService) {}

  show(): void {
    this.spinnerCount++;
    if (this.spinnerCount === 1) {
      this.spinner.show();
    }
  }

  hide(): void {
    if (this.spinnerCount > 0) {
      this.spinnerCount--;
      if (this.spinnerCount === 0) {
        this.spinner.hide();
      }
    }
  }

  forceHide(): void {
    this.spinnerCount = 0;
    this.spinner.hide();
  }

  isVisible(): boolean {
    return this.spinnerCount > 0;
  }
}
