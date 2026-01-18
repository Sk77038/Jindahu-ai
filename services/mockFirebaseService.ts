
import { UserProfile, SafetyStatus, EmergencyContact } from '../types';

const STORAGE_KEY = 'zindahu_user_data';

export const mockFirebase = {
  saveUser: (user: UserProfile) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    } catch (e) {
      console.error("Failed to save to localStorage", e);
    }
  },
  
  getUser: (): UserProfile | null => {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) return null;
      return JSON.parse(data);
    } catch (e) {
      console.error("Failed to parse user data, clearing storage", e);
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
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
    // Implementation for production: Twilio/FCM logic
    return true;
  }
};
