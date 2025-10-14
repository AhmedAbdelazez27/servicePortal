import { Injectable } from '@angular/core';
import { openDB, IDBPDatabase } from 'idb';
import { UserProfile } from '../dtos/user-profile';

type SessionSchema = {
  session: {
    key: string; //"profile"
    value: (UserProfile & { updatedAt: number });
  };
};

@Injectable({ providedIn: 'root' })
export class ProfileDbService {
  // first time store
  private dbPromise = openDB<SessionSchema>('app-db', 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('session')) {
        db.createObjectStore('session');
      }
    }
  });

  async saveProfile(profile: UserProfile): Promise<void> {
    const db = await this.dbPromise;
    await db.put('session', { ...profile, updatedAt: Date.now() }, 'profile');
  }

  async getProfile(): Promise<(UserProfile & { updatedAt: number }) | null> {
    const db = await this.dbPromise;
    return (await db.get('session', 'profile')) ?? null;
  }

  async updateProfile(patch: Partial<UserProfile>): Promise<void> {
    const current = await this.getProfile();
    const next = { ...(current ?? {
      userId: '', userName: '', departmentId: '', pages: [], permissions: []
    }), ...patch, updatedAt: Date.now() };
    await this.saveProfile(next as UserProfile);
  }

  async clearProfile(): Promise<void> {
    const db = await this.dbPromise;
    await db.delete('session', 'profile');
  }
}
