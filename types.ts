
export enum SafetyStatus {
  SAFE = 'SAFE',
  ATTENTION = 'ATTENTION',
  EMERGENCY = 'EMERGENCY'
}

export enum Language {
  EN = 'en',
  HI = 'hi',
  PN = 'pn', 
  BN = 'bn',
  MR = 'mr',
  TE = 'te',
  TA = 'ta',
  GU = 'gu',
  KN = 'kn',
  ML = 'ml',
  UR = 'ur'
}

export type BloodGroup = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-' | 'Unknown';

export interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  relation: string;
}

export interface SafetyConfig {
  autoPanicOnLowBattery: boolean;
  shakeToEmergency: boolean;
  silentSiren: boolean;
  checkInIntervalHours: number;
}

export interface UserProfile {
  name: string;
  age: string;
  phone: string;
  bloodGroup: BloodGroup;
  medicalConditions: string;
  hobbies: string[];
  checkInHour: number; 
  lastCheckIn: number; 
  contacts: EmergencyContact[];
  language: Language;
  registrationDate: number;
  initialSoulAge: string;
  predictedDays: number;
  config: SafetyConfig;
}

export interface LocationData {
  lat: number;
  lng: number;
  timestamp: number;
  battery: number;
}
