
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
  checkInHour: number; // 0-23
  lastCheckIn: number; // timestamp
  contacts: EmergencyContact[];
  language: Language;
}

export interface LocationData {
  lat: number;
  lng: number;
  timestamp: number;
  battery: number;
}
