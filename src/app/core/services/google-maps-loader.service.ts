import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

declare global {
  interface Window { google?: any; }
}

@Injectable({ providedIn: 'root' })
export class GoogleMapsLoaderService {
  private loadingPromise: Promise<any> | null = null;

  load(): Promise<any> {
    if (window.google && window.google.maps) {
      return Promise.resolve(window.google);
    }

    if (this.loadingPromise) {
      return this.loadingPromise;
    }

    const apiKey = (environment as any).googleMapsApiKey;
    const scriptId = 'google-maps-script';

    if (document.getElementById(scriptId)) {
      this.loadingPromise = new Promise((resolve) => {
        const check = () => {
          if (window.google && window.google.maps) {
            resolve(window.google);
          } else {
            setTimeout(check, 100);
          }
        };
        check();
      });
      return this.loadingPromise;
    }

    this.loadingPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.id = scriptId;
      const base = 'https://maps.googleapis.com/maps/api/js';
      const params = new URLSearchParams({
        key: apiKey || '',
        libraries: 'places'
      });
      script.src = `${base}?${params.toString()}`;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve(window.google);
      script.onerror = (e) => reject(new Error('Failed to load Google Maps JS API'));
      document.head.appendChild(script);
    });

    return this.loadingPromise;
  }
}


