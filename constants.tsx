
import React from 'react';

export const TRANSLATIONS = {
  en: {
    appName: 'ZindaHu AI',
    tagline: 'Stay Safe, Stay Connected',
    imAlive: "I'M ALIVE / SAFE",
    checkingIn: "Checking in...",
    nextCheckIn: "Next check-in in",
    lastCheckIn: "Last confirmed at",
    status: "Current Status",
    safe: "Safe",
    attention: "Needs Attention",
    emergency: "Emergency Triggered",
    setupTitle: "Setup ZindaHu",
    setupSubtitle: "Configure your daily safety shield",
    nameLabel: "Your Name",
    ageLabel: "Age (Optional)",
    checkInTimeLabel: "Daily Check-in Time",
    emergencyContacts: "Emergency Contacts (Min 2)",
    addContact: "Add Contact",
    finish: "Activate Shield",
    panic: "PANIC",
    confirmPanic: "Are you sure? This will alert your contacts immediately.",
    otpTitle: "Verify Number",
    otpSubtitle: "We sent a code to your mobile",
    verify: "Verify OTP",
    locationAccess: "ZindaHu needs location access to share with family in emergencies.",
    batteryAlert: "Battery is critically low! Sending auto-update to contacts."
  },
  hi: {
    appName: 'ZindaHu AI',
    tagline: 'सुरक्षित रहें, जुड़े रहें',
    imAlive: "मैं ठीक हूँ / सुरक्षित हूँ",
    checkingIn: "चेक-इन हो रहा है...",
    nextCheckIn: "अगला चेक-इन",
    lastCheckIn: "पिछला चेक-इन",
    status: "वर्तमान स्थिति",
    safe: "सुरक्षित",
    attention: "ध्यान दें",
    emergency: "आपातकालीन अलर्ट",
    setupTitle: "सेटअप करें",
    setupSubtitle: "अपना सुरक्षा कवच तैयार करें",
    nameLabel: "आपका नाम",
    ageLabel: "आयु (वैकल्पिक)",
    checkInTimeLabel: "दैनिक चेक-इन समय",
    emergencyContacts: "आपातकालीन संपर्क (न्यूनतम 2)",
    addContact: "संपर्क जोड़ें",
    finish: "कवच सक्रिय करें",
    panic: "आपातकाल",
    confirmPanic: "क्या आप निश्चित हैं? यह तुरंत आपके संपर्कों को अलर्ट कर देगा।",
    otpTitle: "नंबर सत्यापित करें",
    otpSubtitle: "हमने आपके मोबाइल पर एक कोड भेजा है",
    verify: "ओटीपी सत्यापित करें",
    locationAccess: "आपात स्थिति में परिवार के साथ साझा करने के लिए ZindaHu को स्थान पहुंच की आवश्यकता है।",
    batteryAlert: "बैटरी बहुत कम है! संपर्कों को ऑटो-अपडेट भेजा जा रहा है।"
  }
};

export const ICONS = {
  ShieldCheck: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
  User: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
  Alert: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  )
};
