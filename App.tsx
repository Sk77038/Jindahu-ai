
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { UserProfile, Language, SafetyStatus, EmergencyContact } from './types';
import { TRANSLATIONS, ICONS } from './constants';
import { firebaseService } from './services/firebaseService';
import { getSafetyInsight } from './services/geminiService';

// --- Custom Hooks for Real-time Hardware Access ---

const useBattery = () => {
  const [battery, setBattery] = useState<number | null>(null);
  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'getBattery' in navigator) {
      // @ts-ignore
      navigator.getBattery().then((bat) => {
        setBattery(Math.round(bat.level * 100));
        bat.onlevelchange = () => setBattery(Math.round(bat.level * 100));
      });
    }
  }, []);
  return battery;
};

// --- Core Application ---

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [language, setLanguage] = useState<Language>(Language.EN);
  const [status, setStatus] = useState<SafetyStatus>(SafetyStatus.SAFE);
  const [isSyncing, setIsSyncing] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<string>('--:--');
  const [aiInsight, setAiInsight] = useState<string>('');
  const [showPanicConfirm, setShowPanicConfirm] = useState(false);
  const [isAppLoaded, setIsAppLoaded] = useState(false);
  
  const batteryLevel = useBattery();
  const t = TRANSLATIONS[language];
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load User from Local/Cloud
  useEffect(() => {
    const profile = firebaseService.getLocalProfile();
    if (profile) {
      setUser(profile);
      setLanguage(profile.language);
    }
    setIsAppLoaded(true);
  }, []);

  // REAL-TIME CLOUD SYNC LOGIC
  const syncEmergencyToFirebase = useCallback(async (manual: boolean = false) => {
    if (!user) return;
    setIsSyncing(true);

    // 1. Get Real-time Location
    let locationData = { lat: 0, lng: 0 };
    try {
      const pos = await new Promise<GeolocationPosition>((res, rej) => 
        navigator.geolocation.getCurrentPosition(res, rej, { enableHighAccuracy: true })
      );
      locationData = { lat: pos.coords.latitude, lng: pos.coords.longitude };
    } catch (e) {
      console.warn("Location access denied or unavailable");
    }

    // 2. Write to Firebase Realtime Database
    await firebaseService.syncToCloud(user.phone, {
      status: SafetyStatus.EMERGENCY,
      location: locationData,
      battery: batteryLevel,
      triggerType: manual ? 'MANUAL_PANIC' : 'AUTO_TIMEOUT',
      timestamp: Date.now()
    });

    setIsSyncing(false);
    setStatus(SafetyStatus.EMERGENCY);
  }, [user, batteryLevel]);

  const handleCheckIn = async () => {
    if (!user) return;
    setIsSyncing(true);
    const now = Date.now();
    
    // Update local state
    const updatedUser = { ...user, lastCheckIn: now };
    setUser(updatedUser);
    firebaseService.saveLocalProfile(updatedUser);

    // Update Firebase RTDB
    await firebaseService.syncToCloud(user.phone, {
      status: SafetyStatus.SAFE,
      lastCheckIn: now,
      battery: batteryLevel
    });

    setIsSyncing(false);
    setStatus(SafetyStatus.SAFE);
  };

  // Timer & Auto-Emergency Logic
  const updateStatus = useCallback(() => {
    if (!user) return;
    
    const now = new Date();
    const nextCheckIn = new Date();
    nextCheckIn.setHours(user.checkInHour, 0, 0, 0);
    
    if (now > nextCheckIn) nextCheckIn.setDate(nextCheckIn.getDate() + 1);

    const diff = nextCheckIn.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    setTimeRemaining(`${hours}h ${mins}m`);

    const hoursSinceLast = (now.getTime() - user.lastCheckIn) / (1000 * 60 * 60);

    // Auto-trigger logic
    if (hoursSinceLast > 25 && status !== SafetyStatus.EMERGENCY) {
      syncEmergencyToFirebase(false);
    } else if (hoursSinceLast > 24) {
      setStatus(SafetyStatus.ATTENTION);
    }
  }, [user, status, syncEmergencyToFirebase]);

  useEffect(() => {
    const timer = setInterval(updateStatus, 10000);
    return () => clearInterval(timer);
  }, [updateStatus]);

  useEffect(() => {
    if (user && status === SafetyStatus.SAFE) {
      getSafetyInsight(user).then(setAiInsight);
    }
  }, [user, status]);

  if (!isAppLoaded) return <div className="h-screen bg-slate-900 flex items-center justify-center text-white font-bold">ZindaHu AI Initializing...</div>;

  if (!user) return (
    <div className="max-w-md mx-auto h-screen bg-white">
      <div className="p-8 space-y-6">
        <h1 className="text-3xl font-black text-slate-900">Setup Real-time Shield</h1>
        <p className="text-slate-500">Your phone becomes a survival beacon.</p>
        <input 
          id="setup-name"
          type="text" 
          placeholder="Your Full Name" 
          className="w-full p-4 bg-slate-100 rounded-2xl outline-none focus:ring-2 ring-green-500"
        />
        <input 
          id="setup-phone"
          type="tel" 
          placeholder="Phone Number (for Firebase ID)" 
          className="w-full p-4 bg-slate-100 rounded-2xl outline-none"
        />
        <button 
          onClick={() => {
            const name = (document.getElementById('setup-name') as HTMLInputElement).value;
            const phone = (document.getElementById('setup-phone') as HTMLInputElement).value;
            if (name && phone) {
              const u: UserProfile = {
                name, phone, checkInHour: 9, lastCheckIn: Date.now(), contacts: [], language: Language.EN
              };
              setUser(u);
              firebaseService.saveLocalProfile(u);
            }
          }}
          className="w-full bg-slate-900 text-white p-4 rounded-2xl font-bold"
        >
          Activate Cloud Sync
        </button>
      </div>
    </div>
  );

  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 flex flex-col relative overflow-hidden">
      {/* Real-time Status Header */}
      <header className="bg-white p-5 flex justify-between items-center border-b shadow-sm sticky top-0 z-50">
        <div>
          <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <span className={status === SafetyStatus.SAFE ? 'text-green-600' : 'text-red-600'}>
               {status === SafetyStatus.SAFE ? <ICONS.ShieldCheck /> : <ICONS.Alert />}
            </span>
            {t.appName}
          </h2>
          <div className="flex items-center gap-2 mt-1">
            <div className={`w-2 h-2 rounded-full ${isSyncing ? 'bg-blue-500 animate-ping' : 'bg-green-500'}`}></div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
              {isSyncing ? 'Syncing with Firebase...' : 'Cloud Connected'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {batteryLevel !== null && (
            <span className={`text-[10px] font-bold px-2 py-1 rounded ${batteryLevel < 20 ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-500'}`}>
              ⚡ {batteryLevel}%
            </span>
          )}
        </div>
      </header>

      <main className="flex-grow p-6 space-y-6">
        {/* Status Card */}
        <div className={`p-6 rounded-[2.5rem] shadow-xl border-b-8 transition-all ${
          status === SafetyStatus.SAFE ? 'bg-green-600 border-green-800 text-white' : 'bg-red-600 border-red-800 text-white animate-pulse'
        }`}>
          <p className="text-xs font-black uppercase tracking-widest opacity-80 mb-1">{t.status}</p>
          <h3 className="text-3xl font-black mb-4">
            {status === SafetyStatus.SAFE ? t.safe : t.emergency}
          </h3>
          <div className="bg-white/10 rounded-2xl p-4 backdrop-blur-md">
            <p className="text-[10px] font-bold uppercase opacity-70">Next Check-in Window</p>
            <p className="text-2xl font-black">{timeRemaining}</p>
          </div>
        </div>

        {/* The Alive Button */}
        <div className="flex justify-center py-6">
          <button 
            onClick={handleCheckIn}
            disabled={isSyncing}
            className={`w-64 h-64 rounded-full shadow-2xl transition-all active:scale-90 flex flex-col items-center justify-center p-8 border-8 
              ${status === SafetyStatus.SAFE ? 'bg-white border-green-100 text-green-600' : 'bg-white border-red-100 text-red-600'}
              ${isSyncing ? 'opacity-50' : ''}
            `}
          >
            <span className="text-3xl font-black leading-tight text-center">{t.imAlive}</span>
            <div className={`mt-4 w-2 h-2 rounded-full ${isSyncing ? 'bg-blue-500 animate-bounce' : 'bg-slate-200'}`}></div>
          </button>
        </div>

        {aiInsight && status === SafetyStatus.SAFE && (
          <div className="bg-white p-5 rounded-3xl border shadow-sm flex gap-4 animate-fade-in">
             <div className="text-3xl">🛡️</div>
             <div>
                <p className="text-[10px] font-black text-green-600 uppercase">AI Safety Guardian</p>
                <p className="text-sm font-medium text-slate-700 leading-relaxed italic">"{aiInsight}"</p>
             </div>
          </div>
        )}
      </main>

      {/* Emergency Footer */}
      <div className="p-6 pb-10 bg-white border-t sticky bottom-0">
        <button 
          onClick={() => setShowPanicConfirm(true)}
          className="w-full bg-red-600 hover:bg-red-700 text-white py-5 rounded-3xl font-black text-xl shadow-lg shadow-red-200 active:scale-95 transition-all flex items-center justify-center gap-3"
        >
          <div className="w-3 h-3 bg-white rounded-full animate-ping"></div>
          {t.panic}
        </button>
      </div>

      {/* Emergency Transmission Overlay */}
      {status === SafetyStatus.EMERGENCY && (
        <div className="fixed inset-0 bg-red-700 text-white z-[100] flex flex-col items-center justify-center p-8 text-center animate-fade-in">
           <div className="w-32 h-32 border-8 border-white rounded-full animate-ping mb-8 flex items-center justify-center">
              <ICONS.Alert />
           </div>
           <h1 className="text-4xl font-black mb-2 uppercase tracking-tighter">Transmitting Beacon...</h1>
           <p className="text-xl font-bold opacity-80 mb-12">Firebase is broadcasting your GPS location to emergency contacts.</p>
           <div className="space-y-4 w-full">
              <button onClick={() => window.open('tel:112')} className="w-full bg-white text-red-700 py-5 rounded-3xl font-black text-xl">CALL EMERGENCY (112)</button>
              <button onClick={handleCheckIn} className="w-full bg-transparent border-2 border-white/30 text-white py-5 rounded-3xl font-bold">I AM SAFE NOW (STOP BEACON)</button>
           </div>
        </div>
      )}

      {/* Panic Dialog */}
      {showPanicConfirm && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-[200] flex items-end p-4">
          <div className="bg-white w-full rounded-[3rem] p-8 space-y-6 animate-slide-up">
            <div className="text-center">
              <h2 className="text-3xl font-black text-slate-900">Broadcast Alert?</h2>
              <p className="text-slate-500 font-medium mt-2">{t.confirmPanic}</p>
            </div>
            <div className="space-y-3">
               <button onClick={() => { syncEmergencyToFirebase(true); setShowPanicConfirm(false); }} className="w-full bg-red-600 text-white py-5 rounded-3xl font-black text-xl">YES, ALERT CLOUD</button>
               <button onClick={() => setShowPanicConfirm(false)} className="w-full bg-slate-100 text-slate-500 py-5 rounded-3xl font-bold">CANCEL</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
