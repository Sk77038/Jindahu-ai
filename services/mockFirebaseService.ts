
import { UserProfile, SafetyStatus, EmergencyContact } from '../types';

const STORAGE_KEY = 'zindahu_user_data';

export const mockFirebase = {
  saveUser: (user: UserProfile) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  },
  
  getUser: (): UserProfile | null => {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : null;
  },

  updateLastCheckIn: (timestamp: number) => {
    const user = mockFirebase.getUser();
    if (user) {
      user.lastCheckIn = timestamp;
      mockFirebase.saveUser(user);
    }
  },

  triggerEmergencyMode: async (user: UserProfile) => {
    console.log("FIREBASE CLOUD FUNCTION SIMULATION: EMERGENCY TRIGGERED");
    // In a real app, this calls a Node.js Cloud Function that:
    // 1. Fetches current location via FCM background trigger
    // 2. Sends SMS via Twilio/Msg91
    // 3. Sends Push Notifications to EmergencyContact list
    return true;
  }
};
