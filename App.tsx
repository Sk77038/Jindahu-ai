
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { UserProfile, Language, SafetyStatus } from './types';
import { TRANSLATIONS, ICONS } from './constants';
import { firebaseService } from './services/firebaseService';
import { getSafetyInsight, getSoulAnalysis } from './services/geminiService';

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

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [language, setLanguage] = useState<Language>(Language.EN);
  const [status, setStatus] = useState<SafetyStatus>(SafetyStatus.SAFE);
  const [isSyncing, setIsSyncing] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<string>('--:--');
  const [aiInsight, setAiInsight] = useState<string>('');
  const [showPanicConfirm, setShowPanicConfirm] = useState(false);
  const [isAppLoaded, setIsAppLoaded] = useState(false);
  const [showMorningForce, setShowMorningForce] = useState(false);

  // Setup/Registration State
  const [regStep, setRegStep] = useState(1);
  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [scanProgress, setScanProgress] = useState(0);
  const [isScanning, setIsScanning] = useState(false);
  const scanTimerRef = useRef<NodeJS.Timeout | null>(null);

  const batteryLevel = useBattery();
  const t = TRANSLATIONS[language];

  // Effect to update time remaining until next check-in window starts
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      const now = new Date();
      const nextCheckIn = new Date();
      nextCheckIn.setHours(user.checkInHour, 0, 0, 0);
      
      if (now > nextCheckIn) {
        nextCheckIn.setDate(nextCheckIn.getDate() + 1);
      }
      
      const diff = nextCheckIn.getTime() - now.getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      setTimeRemaining(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    const profile = firebaseService.getLocalProfile();
    if (profile) {
      setUser(profile);
      setLanguage(profile.language);
      const lastCheckInDate = new Date(profile.lastCheckIn).toDateString();
      const todayDate = new Date().toDateString();
      const currentHour = new Date().getHours();
      if (lastCheckInDate !== todayDate && currentHour >= 6 && currentHour < 12) {
        setShowMorningForce(true);
      }
    }
    setIsAppLoaded(true);
  }, []);

  // Life Clock Calculations
  const getLifeStats = () => {
    if (!user) return { elapsed: 0, remaining: 0, percent: 0 };
    const diffMs = Date.now() - user.registrationDate;
    const elapsedDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const remaining = Math.max(0, user.predictedDays - elapsedDays);
    const percent = Math.min(100, (elapsedDays / user.predictedDays) * 100);
    return { elapsed: elapsedDays, remaining, percent };
  };

  const handleCheckIn = async () => {
    if (!user) return;
    setIsSyncing(true);
    const now = Date.now();
    const updatedUser = { ...user, lastCheckIn: now };
    setUser(updatedUser);
    firebaseService.saveLocalProfile(updatedUser);
    await firebaseService.syncToCloud(user.phone, {
      status: SafetyStatus.SAFE,
      lastCheckIn: now,
      battery: batteryLevel
    });
    
    // Get safety insight from Gemini
    const insight = await getSafetyInsight(updatedUser);
    setAiInsight(insight);
    
    setIsSyncing(false);
    setStatus(SafetyStatus.SAFE);
    setShowMorningForce(false);
  };

  // Fix: Implemented handlePanic to resolve the missing syncEmergencyToFirebase reference
  const handlePanic = async () => {
    if (!user) return;
    setStatus(SafetyStatus.EMERGENCY);
    await firebaseService.syncToCloud(user.phone, {
      status: SafetyStatus.EMERGENCY,
      lastCheckIn: Date.now(),
      battery: batteryLevel
    });
    setShowPanicConfirm(false);
  };

  const startScan = () => {
    setIsScanning(true);
    setScanProgress(0);
    if ('vibrate' in navigator) navigator.vibrate([100, 50, 100]);
    scanTimerRef.current = setInterval(() => {
      setScanProgress(p => {
        if (p >= 100) {
          clearInterval(scanTimerRef.current!);
          completeRegistration();
          return 100;
        }
        return p + 2;
      });
    }, 40);
  };

  const cancelScan = () => {
    if (scanProgress < 100) {
      setIsScanning(false);
      setScanProgress(0);
      if (scanTimerRef.current) clearInterval(scanTimerRef.current);
    }
  };

  const completeRegistration = async () => {
    const analysis = await getSoulAnalysis(regName, language);
    const newUser: UserProfile = {
      name: regName,
      phone: regPhone,
      checkInHour: 9,
      lastCheckIn: Date.now(),
      contacts: [],
      language: language,
      registrationDate: Date.now(),
      initialSoulAge: analysis.soulAge,
      predictedDays: analysis.predictedDays
    };
    setUser(newUser);
    firebaseService.saveLocalProfile(newUser);
    setIsScanning(false);
    if ('vibrate' in navigator) navigator.vibrate([500]);
  };

  if (!isAppLoaded) return <div className="h-screen bg-slate-900 flex items-center justify-center text-white font-bold">ZINDAHU AI...</div>;

  // --- Registration / Setup Screen ---
  if (!user) return (
    <div className="max-w-md mx-auto h-screen bg-slate-900 text-white p-8 flex flex-col justify-center overflow-hidden">
      <div className="mb-12">
        <h1 className="text-4xl font-black mb-2">{t.setupTitle}</h1>
        <p className="text-slate-400 font-medium">{t.setupSubtitle}</p>
      </div>

      {regStep === 1 ? (
        <div className="space-y-4 animate-fade-in">
          <input 
            value={regName} 
            onChange={(e) => setRegName(e.target.value)}
            type="text" placeholder={t.nameLabel} className="w-full p-5 bg-white/10 rounded-3xl outline-none focus:ring-2 ring-purple-500" 
          />
          <input 
            value={regPhone}
            onChange={(e) => setRegPhone(e.target.value)}
            type="tel" placeholder={t.phoneLabel} className="w-full p-5 bg-white/10 rounded-3xl outline-none" 
          />
          <button 
            disabled={!regName || !regPhone}
            onClick={() => setRegStep(2)}
            className="w-full bg-purple-600 p-5 rounded-3xl font-black text-xl disabled:opacity-30"
          >CONTINUE TO BIO-SCAN</button>
        </div>
      ) : (
        <div className="flex flex-col items-center animate-slide-up">
           <div 
             onMouseDown={startScan} onMouseUp={cancelScan}
             onTouchStart={startScan} onTouchEnd={cancelScan}
             className={`w-64 h-64 rounded-full border-4 flex items-center justify-center transition-all relative overflow-hidden
               ${isScanning ? 'border-purple-500 bg-purple-500/20 shadow-[0_0_60px_rgba(168,85,247,0.4)] scale-110' : 'border-white/20 bg-white/5'}
             `}
           >
              <ICONS.Fingerprint />
              {isScanning && (
                <div className="absolute left-0 right-0 h-1 bg-purple-400 shadow-xl" style={{ top: `${scanProgress}%` }}></div>
              )}
           </div>
           <p className="mt-8 font-black tracking-widest text-purple-400 uppercase">
             {isScanning ? t.scanning : t.holdToScan}
           </p>
        </div>
      )}
    </div>
  );

  const life = getLifeStats();

  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 flex flex-col relative overflow-hidden">
      {/* Morning Force Overlay with Memento Mori Message */}
      {showMorningForce && (
        <div className="fixed inset-0 bg-slate-900 z-[1000] flex flex-col items-center justify-center p-8 text-center animate-fade-in">
           <h1 className="text-3xl font-black text-white mb-2">{t.goodMorning}</h1>
           <p className="text-purple-400 font-bold mb-8">{language === Language.HI ? t.mementoMoriHi : t.mementoMori}</p>
           
           <div className="bg-white/5 border border-white/10 rounded-[3rem] p-8 mb-12 w-full">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Life Update</p>
              <p className="text-2xl font-black text-white">Day {life.elapsed + 1} of your legacy</p>
           </div>

           <button onClick={handleCheckIn} className="w-64 h-64 rounded-full bg-white text-green-600 shadow-2xl flex flex-col items-center justify-center p-8 border-[12px] border-green-100">
              <span className="text-3xl font-black">{t.imAlive}</span>
           </button>
        </div>
      )}

      <header className="bg-white p-5 flex justify-between items-center border-b sticky top-0 z-50">
        <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
          {status === SafetyStatus.SAFE ? <span className="text-green-600"><ICONS.ShieldCheck /></span> : <span className="text-red-600"><ICONS.Alert /></span>}
          {t.appName}
        </h2>
        <div className="flex gap-2">
           <button onClick={() => setLanguage(l => l === Language.EN ? Language.HI : Language.EN)} className="text-[10px] font-black bg-slate-100 px-3 py-1.5 rounded-full uppercase">
             {language}
           </button>
        </div>
      </header>

      <main className="flex-grow p-6 space-y-6">
        {/* The Life Clock - Depleting Bar */}
        <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100">
          <div className="flex justify-between items-center mb-4">
             <div className="flex items-center gap-2">
                <ICONS.Clock />
                <span className="font-black text-slate-800 uppercase text-xs tracking-widest">{t.lifeClock}</span>
             </div>
             <span className="text-[10px] font-black text-slate-400">SOUL AGE: {user.initialSoulAge}</span>
          </div>
          
          <div className="space-y-4">
             <div className="flex justify-between text-[11px] font-bold text-slate-500 uppercase">
                <span>{t.daysElapsed}: {life.elapsed}</span>
                <span>{t.daysRemaining}: {life.remaining}</span>
             </div>
             <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-purple-500 to-indigo-600 transition-all duration-1000" style={{ width: `${100 - life.percent}%` }}></div>
             </div>
             <p className="text-[10px] italic text-slate-400 text-center">"Every breath is a gift. Make it count."</p>
          </div>
        </div>

        {/* Safety Status */}
        <div className={`p-8 rounded-[3rem] shadow-xl border-b-8 transition-all ${
          status === SafetyStatus.SAFE ? 'bg-green-600 border-green-800 text-white' : 'bg-red-600 border-red-800 text-white animate-pulse'
        }`}>
          <p className="text-xs font-black uppercase opacity-80 mb-1">{t.status}</p>
          <h3 className="text-4xl font-black mb-6">{status === SafetyStatus.SAFE ? t.safe : t.emergency}</h3>
          <div className="bg-white/10 rounded-2xl p-4 backdrop-blur-md">
            <p className="text-[10px] font-bold uppercase opacity-70 mb-1">Protection Window</p>
            <p className="text-2xl font-black">{timeRemaining}</p>
          </div>
        </div>

        <div className="flex justify-center">
          <button 
            onClick={handleCheckIn}
            disabled={isSyncing}
            className="w-64 h-64 rounded-full bg-white shadow-2xl transition-all active:scale-90 flex flex-col items-center justify-center p-8 border-[12px] border-slate-50"
          >
            <span className={`text-3xl font-black leading-tight text-center ${status === SafetyStatus.SAFE ? 'text-green-600' : 'text-red-600'}`}>{t.imAlive}</span>
            <div className={`mt-4 w-3 h-3 rounded-full ${isSyncing ? 'bg-blue-500 animate-bounce' : 'bg-slate-200'}`}></div>
          </button>
        </div>

        {aiInsight && (
          <div className="bg-white p-6 rounded-[2.5rem] border shadow-sm flex gap-4 animate-fade-in">
             <div className="text-4xl">🛡️</div>
             <div>
                <p className="text-[10px] font-black text-green-600 uppercase mb-1">Legacy Guard</p>
                <p className="text-sm font-semibold text-slate-700 leading-relaxed italic">"{aiInsight}"</p>
             </div>
          </div>
        )}
      </main>

      <div className="p-6 pb-12 bg-white border-t sticky bottom-0">
        <button onClick={() => setShowPanicConfirm(true)} className="w-full bg-red-600 text-white py-6 rounded-[2rem] font-black text-2xl shadow-xl shadow-red-200 active:scale-95 transition-all">
          {t.panic}
        </button>
      </div>

      {showPanicConfirm && (
        <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-md z-[2000] flex items-end p-4">
          <div className="bg-white w-full rounded-[3.5rem] p-10 space-y-8 animate-slide-up">
            <div className="text-center">
              <h2 className="text-3xl font-black text-slate-900">Broadcast SOS?</h2>
              <p className="text-slate-500 font-medium text-lg mt-3">{t.confirmPanic}</p>
            </div>
            <div className="space-y-4">
              <button onClick={handlePanic} className="w-full bg-red-600 text-white py-6 rounded-[2rem] font-black text-2xl">YES, ALERT CONTACTS</button>
              <button onClick={() => setShowPanicConfirm(false)} className="w-full bg-slate-100 text-slate-500 py-6 rounded-[2rem] font-bold text-xl">CANCEL</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
