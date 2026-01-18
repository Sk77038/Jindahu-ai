
import { UserProfile, SafetyStatus } from '../types';

/**
 * PRODUCTION NOTE: 
 * In a real environment, you would use:
 * import { initializeApp } from "firebase/app";
 * import { getDatabase, ref, set, onValue } from "firebase/database";
 */

// Simulated production service that mirrors the Firebase SDK behavior
// but works instantly in this environment for your preview.
const STORAGE_KEY = 'zindahu_cloud_db';

export const firebaseService = {
  // Sync status to the "Cloud" (Realtime Database)
  syncToCloud: async (userId: string, data: any) => {
    console.log(`[FIREBASE RTDB] Syncing to /users/${userId}:`, data);
    
    // Simulate network latency
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const db = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    db[userId] = {
      ...db[userId],
      ...data,
      serverTimestamp: Date.now()
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    
    // In production, this would trigger a Firebase Cloud Function:
    // exports.onStatusChange = functions.database.ref('/users/{uid}/status')
    //    .onUpdate((change) => { if(change.after.val() === 'EMERGENCY') sendSMS(); });
    
    return true;
  },

  // Get current cloud state
  getCloudStatus: (userId: string) => {
    const db = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return db[userId] || null;
  },

  saveLocalProfile: (user: UserProfile) => {
    localStorage.setItem('zindahu_user', JSON.stringify(user));
  },

  getLocalProfile: (): UserProfile | null => {
    const data = localStorage.getItem('zindahu_user');
    return data ? JSON.parse(data) : null;
  }
};
