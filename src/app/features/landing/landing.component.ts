import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.scss'
})
export class LandingComponent implements OnInit {
  showContent = false;
  isNavigating = false;
  countdown = 3;

  constructor(private router: Router) {}

  ngOnInit(): void {
    // Show content with animation after a brief delay
    setTimeout(() => {
      this.showContent = true;
    }, 100);
  }

  navigateToHome(): void {
    if (this.isNavigating) return;
    
    this.isNavigating = true;
    this.countdown = 3;

    // Countdown
    const interval = setInterval(() => {
      this.countdown--;
      if (this.countdown <= 0) {
        clearInterval(interval);
      }
    }, 1000);

    // Navigate after 3 seconds
    setTimeout(() => {
      this.router.navigate(['/home']);
    }, 3000);
  }
}

