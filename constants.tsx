
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
    goodMorning: "Good Morning!",
    morningPrompt: "Please confirm you are safe for today.",
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
    goodMorning: "शुभ प्रभात!",
    morningPrompt: "कृपया पुष्टि करें कि आप आज सुरक्षित हैं।",
    batteryAlert: "बैटरी बहुत कम है! संपर्कों को ऑटो-अपडेट भेजा जा रहा है।"
  }
};

export const ICONS = {
  ShieldCheck: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
  Alert: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  Sun: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
    </svg>
  )
};
