import { Injectable } from '@angular/core';
import { initializeApp, FirebaseApp } from 'firebase/app';
import { getMessaging, Messaging } from 'firebase/messaging';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class FirebaseConfigService {
  private app: FirebaseApp;
  private messaging: Messaging;

  constructor() {
    try {
      this.app = this.initializeFirebase();
      this.messaging = getMessaging(this.app);
    } catch (error) {
      throw error;
    }
  }

  private initializeFirebase(): FirebaseApp {
    return initializeApp(environment.firebase);
  }

  getMessaging(): Messaging {
    return this.messaging;
  }

  getApp(): FirebaseApp {
    return this.app;
  }

  /**
   * Validate Firebase configuration
   */
  validateConfig(): boolean {
    const config = environment.firebase;
    const requiredFields = ['apiKey', 'authDomain', 'projectId', 'messagingSenderId', 'appId'];
    
    for (const field of requiredFields) {
      if (!config[field as keyof typeof config]) {
        return false;
      }
    }
    
    // Check VAPID key separately since it's optional for basic Firebase setup
    if (!config.vapidKey) {
      return false;
    }
    
    return true;
  }
}
