
export enum SafetyStatus {
  SAFE = 'SAFE',
  ATTENTION = 'ATTENTION',
  EMERGENCY = 'EMERGENCY'
}

export enum Language {
  EN = 'en',
  HI = 'hi'
}

export interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  relation: string;
}

export interface UserProfile {
  name: string;
  age?: string;
  phone: string;
  hobbies: string[];
  checkInHour: number; 
  lastCheckIn: number; 
  contacts: EmergencyContact[];
  language: Language;
  // Life Clock Features
  registrationDate: number;
  initialSoulAge: string;
  predictedDays: number; // Total fun "predicted" days
}

export interface LocationData {
  lat: number;
  lng: number;
  timestamp: number;
  battery: number;
}
