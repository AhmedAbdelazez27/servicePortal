import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

// Register service worker for Firebase messaging
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/firebase-messaging-sw.js')
    .then((registration) => {
      // console.log('Service Worker registered successfully:', registration);
    })
    .catch((error) => {
      // console.error('Service Worker registration failed:', error);
    });
}

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));
