
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
    setupTitle: "Bio-Sync Registration",
    setupSubtitle: "Hold to register your soul pattern",
    nameLabel: "Your Name",
    phoneLabel: "Mobile Number",
    finish: "Activate Shield",
    panic: "PANIC",
    confirmPanic: "Alert your contacts immediately?",
    goodMorning: "Good Morning!",
    morningPrompt: "Please confirm you are safe for today.",
    soulScanner: "Soul Scanner",
    holdToScan: "Hold finger to scan",
    scanning: "Analyzing Soul Pattern...",
    soulResult: "Bio-Sync Complete",
    soulAge: "Soul Age",
    lifeClock: "Life Clock",
    daysElapsed: "Days of Life Lived",
    daysRemaining: "Days of Legacy Left",
    mementoMori: "One more day passed. Make today count!",
    mementoMoriHi: "जीवन का एक दिन और कम हो गया। आज को खुल कर जीयें!"
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
    setupTitle: "बायो-सिंक पंजीकरण",
    setupSubtitle: "अपनी आत्मा का पैटर्न रजिस्टर करें",
    nameLabel: "आपका नाम",
    phoneLabel: "मोबाइल नंबर",
    finish: "कवच सक्रिय करें",
    panic: "आपातकाल",
    confirmPanic: "तुरंत संपर्कों को सूचित करें?",
    goodMorning: "शुभ प्रभात!",
    morningPrompt: "कृपया पुष्टि करें कि आप आज सुरक्षित हैं।",
    soulScanner: "आत्मा स्कैनर",
    holdToScan: "उंगली से स्कैन करें",
    scanning: "आत्मा पैटर्न का विश्लेषण...",
    soulResult: "बायो-सिंक पूर्ण",
    soulAge: "आत्मा की आयु",
    lifeClock: "जीवन चक्र",
    daysElapsed: "जीये गए दिन",
    daysRemaining: "शेष दिन (अनुमानित)",
    mementoMori: "जिंदगी का एक दिन और कम। आज को खास बनाएं!",
    mementoMoriHi: "जीवन का एक दिन और कम हो गया। आज को खुल कर जीयें!"
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
  Fingerprint: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-20 h-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A10.003 10.003 0 0012 3c1.288 0 2.514.242 3.643.682m.504 1.314a10 10 0 013.651 3.529m0 0A10.018 10.018 0 0122 12.011m-.071 1.15a10.09 10.09 0 01-.834 2.823m-2.408-7.043A2 2 0 0014 11v1M9 9a3 3 0 013 3m-3-6a3 3 0 013 3m1 6.17a2 2 0 01.441 2.385m1.44-3.117a5 5 0 11-8.372-5.492" />
    </svg>
  ),
  Clock: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
};
