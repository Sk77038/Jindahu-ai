
import React from 'react';

export const BLOOD_GROUPS: any[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'];

export const GOVT_HELPLINES = [
  { name: 'National Emergency', number: '112', icon: '🚨' },
  { name: 'Police', number: '100', icon: '👮' },
  { name: 'Women Helpline', number: '1091', icon: '👩' },
  { name: 'Ambulance', number: '102', icon: '🚑' },
  { name: 'Fire Station', number: '101', icon: '🔥' },
  { name: 'Child Help', number: '1098', icon: '👶' },
  { name: 'Senior Citizen', number: '14567', icon: '👴' },
  { name: 'Cyber Crime', number: '1930', icon: '💻' },
  { name: 'Railway Security', number: '182', icon: '🚆' }
];

export const LANGUAGES_SUPPORTED = [
  { code: 'en', name: 'English', label: 'English' },
  { code: 'hi', name: 'Hindi', label: 'हिन्दी (Desi)' },
  { code: 'pn', name: 'Punjabi', label: 'ਪੰਜਾਬੀ' },
  { code: 'bn', name: 'Bengali', label: 'বাংলা' },
  { code: 'mr', name: 'Marathi', label: 'मਰਾठी' },
  { code: 'gu', name: 'Gujarati', label: 'ગુજરાતી' },
  { code: 'ta', name: 'Tamil', label: 'தமிழ்' },
  { code: 'te', name: 'Telugu', label: 'తెలుగు' },
  { code: 'kn', name: 'Kannada', label: 'ಕನ್ನಡ' },
  { code: 'ml', name: 'Malayalam', label: 'മലയാളം' },
  { code: 'ur', name: 'Urdu', label: 'اردو' }
];

export const TRANSLATIONS: Record<string, any> = {
  en: {
    appName: 'ZindaHu AI',
    setupTitle: "Registration",
    nameLabel: "Name",
    ageLabel: "Age",
    phoneLabel: "Mobile",
    bloodLabel: "Blood Group",
    medicalLabel: "Medical Conditions",
    holdToScan: "Hold to Sync Soul",
    imAlive: "I'M ALIVE / SAFE",
    panic: "PANIC",
    medicalBrief: "Medical Vital Card",
    status: "Status",
    safe: "Safe",
    attention: "Check-in!",
    morningCourage: "Desi AI Vibe",
    saveChanges: "Save Settings",
    addGuardian: "Add Guardian",
    findingHospitals: "Finding help...",
    legalHeading: "Legal & Privacy",
    signOut: "Reset Account",
    settings: "Settings",
    advSafety: "Advanced Safety",
    lowBatteryPanic: "Auto-Panic on Low Battery",
    shakeToSOS: "Shake to SOS",
    silentSiren: "Silent Siren (Stealth)",
    checkInFreq: "Check-in Frequency (Hours)",
    privacyPolicy: "Privacy Policy",
    termsConditions: "Terms of Service",
    aboutApp: "About ZindaHu AI",
    myGuardians: "My Guardians",
    govtHelp: "Govt Helplines",
    relationLabel: "Relation (e.g. Papa, Friend)",
    saveContact: "Save Contact",
    dostAi: "Dost AI",
    legalBody: "ZindaHu AI prioritizes your survival. Your location is shared only with your chosen guardians. We comply with Indian Data Protection laws. Use responsibly.",
    aboutBody: "ZindaHu AI is a revolutionary safety shield designed for the Indian context. It uses AI to ensure you are safe every morning and provides one-tap rescue protocols.",
    privacyBody: "We do not sell your data. Your medical and contact information is stored securely. Real-time tracking is only activated during an SOS event or low-battery panic. Data is encrypted using AES-256.",
    termsBody: "By using this app, you agree to provide accurate medical data. ZindaHu AI is an assistive tool and does not guarantee emergency response times of state services. Abuse of the PANIC button may lead to account suspension."
  },
  hi: {
    appName: 'ZindaHu AI',
    setupTitle: "पंजीकरण",
    nameLabel: "नाम",
    ageLabel: "उम्र",
    phoneLabel: "मोबाइल नंबर",
    bloodLabel: "ब्लड ग्रुप",
    medicalLabel: "बीमारी",
    holdToScan: "उंगली दबाकर सिंक करें",
    imAlive: "मैं सलामत हूँ",
    panic: "बचाओ!",
    medicalBrief: "मेडिकल जानकारी",
    status: "स्थिति",
    safe: "एकदम चकाचक",
    attention: "हाजिरी लगाओ!",
    morningCourage: "देसी दोस्त की बातें",
    saveChanges: "सेटिंग्स सेव करें",
    addGuardian: "रक्षक जोड़ें",
    findingHospitals: "अस्पताल ढूंढ रहा हूँ...",
    legalHeading: "कानूनी जानकारी",
    signOut: "सब मिटाओ",
    settings: "सेटिंग्स",
    advSafety: "एडवांस सुरक्षा",
    lowBatteryPanic: "बैटरी कम होने पर अलर्ट",
    shakeToSOS: "फोन हिलाने पर अलर्ट",
    silentSiren: "खामोश अलार्म (चुपके से)",
    checkInFreq: "कितनी देर में हाजिरी (घंटे)",
    privacyPolicy: "गोपनीयता नीति",
    termsConditions: "नियम और शर्तें",
    aboutApp: "ऐप के बारे में",
    myGuardians: "मेरे रक्षक",
    govtHelp: "सरकारी हेल्पलाइन",
    relationLabel: "रिश्ता (जैसे: पापा, दोस्त)",
    saveContact: "संपर्क सेव करें",
    dostAi: "दोस्त AI",
    legalBody: "ZindaHu AI आपकी सुरक्षा के लिए है। आपकी लोकेशन सिर्फ आपके रक्षकों के साथ शेयर की जाती है। हम भारतीय डेटा कानूनों का पालन करते हैं।",
    aboutBody: "ZindaHu AI एक क्रांतिकारी सुरक्षा कवच है। यह AI का उपयोग यह सुनिश्चित करने के लिए करता है कि आप सुरक्षित हैं और तुरंत मदद पहुंचाता है।",
    privacyBody: "हम आपका डेटा नहीं बेचते हैं। आपकी मेडिकल जानकारी सुरक्षित है। लाइव ट्रैकिंग केवल इमरजेंसी के समय ही चालू होती है। सारा डेटा एनक्रिप्टेड है।",
    termsBody: "इस ऐप का उपयोग करके, आप सही मेडिकल डेटा देने के लिए सहमत हैं। यह एक सहायक उपकरण है और सरकारी सेवाओं की गारंटी नहीं देता है।"
  }
};

export const LANGUAGE_NAME_MAP: Record<string, string> = {
  en: 'English', hi: 'Desi Hindi', pn: 'Punjabi', 
  bn: 'Bengali', mr: 'Marathi', gu: 'Gujarati', ta: 'Tamil', te: 'Telugu', 
  kn: 'Kannada', ml: 'Malayalam', ur: 'Urdu'
};

export const ICONS = {
  ShieldCheck: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
  Alert: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  Fingerprint: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-20 h-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A10.003 10.003 0 0012 3c1.288 0 2.514.242 3.643.682m.504 1.314a10 10 0 013.651 3.529m0 0A10.018 10.018 0 0122 12.011m-.071 1.15a10.09 10.09 0 01-.834 2.823m-2.408-7.043A2 2 0 0014 11v1M9 9a3 3 0 013 3m-3-6a3 3 0 013 3m1 6.17a2 2 0 01.441 2.385m1.44-3.117a5 5 0 11-8.372-5.492" />
    </svg>
  ),
  Close: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  Settings: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
  ),
  Trash: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  ),
  Plus: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  ),
  Heart: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
    </svg>
  ),
  Map: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
    </svg>
  ),
  User: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
  Send: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
    </svg>
  ),
  Robot: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h2m-2 6h2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2-2V7a2 2 0 002 2zM9 9h6v6H9V9z" />
    </svg>
  )
};
