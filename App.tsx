
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { UserProfile, Language, SafetyStatus, EmergencyContact } from './types';
import { TRANSLATIONS, ICONS } from './constants';
import { firebaseService } from './services/firebaseService';
import { getSafetyInsight, getSoulAnalysis, getEmergencyReassurance } from './services/geminiService';

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
  const [aiReassurance, setAiReassurance] = useState<string>('');
  const [showPanicConfirm, setShowPanicConfirm] = useState(false);
  const [isAppLoaded, setIsAppLoaded] = useState(false);
  const [showMorningForce, setShowMorningForce] = useState(false);
  const [showContactsModal, setShowContactsModal] = useState(false);
  
  // Navigation & Preferences States
  const [showMenu, setShowMenu] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [hapticsEnabled, setHapticsEnabled] = useState(true);

  // Setup/Registration State
  const [regStep, setRegStep] = useState(1);
  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regHobbies, setRegHobbies] = useState('');
  const [regContacts, setRegContacts] = useState<EmergencyContact[]>([]);
  const [tempContactName, setTempContactName] = useState('');
  const [tempContactPhone, setTempContactPhone] = useState('');
  
  // Scanning State (Dual-use: Reg & Daily)
  const [scanProgress, setScanProgress] = useState(0);
  const [isScanning, setIsScanning] = useState(false);
  const [isDailyScanOverlay, setIsDailyScanOverlay] = useState(false);
  const scanTimerRef = useRef<NodeJS.Timeout | null>(null);

  const batteryLevel = useBattery();
  const t = TRANSLATIONS[language];

  // Helper for vibrations with toggle check
  const vibrate = (pattern: number | number[]) => {
    if (hapticsEnabled && 'vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  };

  const isCheckInDue = useMemo(() => {
    if (!user) return false;
    const now = new Date();
    const last = new Date(user.lastCheckIn);
    const isToday = now.toDateString() === last.toDateString();
    return now.getHours() >= 9 && !isToday;
  }, [user]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const target = new Date();
      target.setHours(9, 0, 0, 0);
      if (now >= target) target.setDate(target.getDate() + 1);
      
      const diff = target.getTime() - now.getTime();
      const h = Math.floor(diff / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeRemaining(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const profile = firebaseService.getLocalProfile();
    if (profile) {
      setUser(profile);
      setLanguage(profile.language);
      if (isCheckInDue) setShowMorningForce(true);
    }
    setIsAppLoaded(true);
  }, [isCheckInDue]);

  const life = useMemo(() => {
    if (!user) return { elapsed: 0, remaining: 0, percent: 0 };
    const dayMs = 1000 * 60 * 60 * 24;
    const elapsedMs = Date.now() - user.registrationDate;
    const elapsedDays = Math.floor(elapsedMs / dayMs);
    const remaining = Math.max(0, user.predictedDays - elapsedDays);
    const percent = Math.min(100, (elapsedDays / user.predictedDays) * 100);
    return { elapsed: elapsedDays, remaining, percent };
  }, [user]);

  const handleCheckIn = async () => {
    if (!user) return;
    vibrate(60);
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
    
    const insight = await getSafetyInsight(updatedUser);
    setAiInsight(insight);
    
    setIsSyncing(false);
    setStatus(SafetyStatus.SAFE);
    setShowMorningForce(false);
    setIsDailyScanOverlay(false);
    vibrate([20, 100]);
  };

  const handlePanicInitiation = async () => {
    vibrate(80);
    setAiReassurance(""); 
    setShowPanicConfirm(true);
    
    try {
      const message = await getEmergencyReassurance(language);
      setAiReassurance(message);
    } catch (e) {
      setAiReassurance(language === 'hi' ? 'मदद के लिए तैयारी शुरू हो गई है। शांत रहें।' : 'Help is starting to mobilize. Please stay calm.');
    }
  };

  const handlePanicConfirm = async () => {
    if (!user) return;
    vibrate([200, 100, 200, 100, 500]);
    setStatus(SafetyStatus.EMERGENCY);
    
    let loc = null;
    try {
      const pos = await new Promise<GeolocationPosition>((res, rej) => 
        navigator.geolocation.getCurrentPosition(res, rej, { timeout: 5000, enableHighAccuracy: true })
      );
      loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
    } catch (e) { 
      console.warn("GPS Access Denied or Timeout.");
    }

    await firebaseService.syncToCloud(user.phone, {
      status: SafetyStatus.EMERGENCY,
      location: loc,
      battery: batteryLevel,
      panicTime: Date.now()
    });
    
    setShowPanicConfirm(false);
  };

  const handleCallPrimaryContact = () => {
    if (!user || user.contacts.length === 0) {
      alert(t.callNoContact);
      return;
    }
    const primary = user.contacts[0];
    const cleanPhone = primary.phone.replace(/\s/g, '');
    vibrate(40);
    window.location.href = `tel:${cleanPhone}`;
  };

  const startScan = (isDaily: boolean = false) => {
    if (!isDaily && (regName.trim() === '' || regPhone.trim() === '')) return;
    setIsScanning(true);
    setScanProgress(0);
    scanTimerRef.current = setInterval(() => {
      setScanProgress(p => {
        if (p >= 100) {
          clearInterval(scanTimerRef.current!);
          if (isDaily) {
            handleCheckIn();
          } else {
            completeRegistration();
          }
          return 100;
        }
        if (p % 10 === 0) vibrate(15);
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
    const hobbies = regHobbies.split(',').map(h => h.trim()).filter(h => h !== '');
    const analysis = await getSoulAnalysis(regName, language, hobbies);
    const newUser: UserProfile = {
      name: regName,
      phone: regPhone,
      hobbies: hobbies,
      checkInHour: 9,
      lastCheckIn: Date.now(),
      contacts: regContacts,
      language: language,
      registrationDate: Date.now(),
      initialSoulAge: analysis.soulAge,
      predictedDays: analysis.predictedDays
    };
    setUser(newUser);
    firebaseService.saveLocalProfile(newUser);
    setIsScanning(false);
    vibrate([100, 50, 400]);
  };

  const manageContact = (action: 'add' | 'remove', id?: string) => {
    if (action === 'add' && tempContactName && tempContactPhone) {
      const newC: EmergencyContact = { id: Date.now().toString(), name: tempContactName, phone: tempContactPhone, relation: 'Guardian' };
      if (user) {
        const u = { ...user, contacts: [...user.contacts, newC] };
        setUser(u);
        firebaseService.saveLocalProfile(u);
      } else {
        setRegContacts([...regContacts, newC]);
      }
      setTempContactName('');
      setTempContactPhone('');
      vibrate(30);
    } else if (action === 'remove' && id) {
      if (user) {
        const u = { ...user, contacts: user.contacts.filter(c => c.id !== id) };
        setUser(u);
        firebaseService.saveLocalProfile(u);
      } else {
        setRegContacts(regContacts.filter(c => c.id !== id));
      }
      vibrate(20);
    }
  };

  const handleReset = () => {
    if (confirm("Resetting will wipe all biometric patterns and legacy data. Proceed?")) {
      vibrate(100);
      localStorage.clear();
      window.location.reload();
    }
  };

  if (!isAppLoaded) return (
    <div className="h-screen bg-slate-900 flex items-center justify-center">
      <div className="w-10 h-10 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  if (!user) return (
    <div className="max-w-md mx-auto h-screen bg-slate-900 text-white p-8 flex flex-col justify-center overflow-hidden relative">
      <div className="mb-10 text-center">
        <h1 className="text-4xl font-black mb-1 text-white tracking-tighter" style={{ textShadow: '0 0 20px rgba(168,85,247,0.3)' }}>ZindaHu AI</h1>
        <p className="text-purple-400 font-bold uppercase text-[10px] tracking-[0.4em]">{t.setupTitle}</p>
      </div>

      {regStep === 1 && (
        <div className="space-y-4 animate-fade-in">
          <input value={regName} onChange={e => setRegName(e.target.value)} type="text" placeholder={t.nameLabel} className="w-full p-5 bg-white/5 border border-white/10 rounded-3xl outline-none focus:ring-2 ring-purple-500 text-lg transition-all" />
          <input value={regPhone} onChange={e => setRegPhone(e.target.value)} type="tel" placeholder={t.phoneLabel} className="w-full p-5 bg-white/5 border border-white/10 rounded-3xl outline-none focus:ring-2 ring-purple-500 text-lg transition-all" />
          <input value={regHobbies} onChange={e => setRegHobbies(e.target.value)} type="text" placeholder={t.hobbiesLabel} className="w-full p-5 bg-white/5 border border-white/10 rounded-3xl outline-none focus:ring-2 ring-purple-500 text-lg transition-all" />
          <button disabled={!regName || !regPhone} onClick={() => { vibrate(40); setRegStep(2); }} className="w-full bg-purple-600 p-6 rounded-3xl font-black text-xl transition-all active:scale-95 disabled:opacity-30 shadow-lg shadow-purple-900/20">SET GUARDIANS</button>
        </div>
      )}

      {regStep === 2 && (
        <div className="space-y-4 animate-fade-in flex flex-col max-h-[75vh]">
          <div className="flex justify-between items-center mb-2">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Emergency Circle</p>
            <p className="text-[10px] font-black bg-white/10 px-2 py-1 rounded">{regContacts.length}</p>
          </div>
          <div className="overflow-y-auto space-y-3 flex-grow pr-2 custom-scrollbar">
            {regContacts.length === 0 && <p className="text-center py-10 text-slate-500 font-bold text-sm italic">{t.noContacts}</p>}
            {regContacts.map(c => (
              <div key={c.id} className="bg-white/5 p-4 rounded-2xl flex justify-between items-center border border-white/10 animate-slide-up">
                <div><p className="font-bold text-sm">{c.name}</p><p className="text-xs text-slate-400">{c.phone}</p></div>
                <button onClick={() => manageContact('remove', c.id)} className="text-red-400 p-2 active:scale-90"><ICONS.Trash /></button>
              </div>
            ))}
          </div>
          <div className="bg-white/10 p-5 rounded-[2.5rem] space-y-3 border border-white/10">
            <input value={tempContactName} onChange={e => setTempContactName(e.target.value)} type="text" placeholder={t.contactName} className="w-full p-3 bg-white/5 rounded-2xl outline-none text-sm border border-white/5 focus:border-purple-500/50" />
            <input value={tempContactPhone} onChange={e => setTempContactPhone(e.target.value)} type="tel" placeholder={t.contactPhone} className="w-full p-3 bg-white/5 rounded-2xl outline-none text-sm border border-white/5 focus:border-purple-500/50" />
            <button onClick={() => manageContact('add')} className="w-full bg-slate-700 p-3 rounded-2xl font-bold flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest transition-all active:bg-slate-600"><ICONS.Plus /> {t.addContact}</button>
          </div>
          <div className="pt-2 space-y-3">
            <button disabled={regContacts.length === 0} onClick={() => { vibrate(40); setRegStep(3); }} className="w-full bg-purple-600 p-6 rounded-3xl font-black text-xl disabled:opacity-30 transition-all active:scale-95 shadow-lg shadow-purple-900/40 uppercase tracking-tighter">FINALIZE SETUP</button>
            <button onClick={() => setRegStep(1)} className="w-full text-slate-500 font-black text-[10px] uppercase tracking-widest py-2">Back</button>
          </div>
        </div>
      )}

      {regStep === 3 && (
        <div className="flex flex-col items-center animate-slide-up">
           <div onMouseDown={() => startScan(false)} onMouseUp={cancelScan} onTouchStart={() => startScan(false)} onTouchEnd={cancelScan}
             className={`w-64 h-64 rounded-full border-[8px] flex items-center justify-center transition-all relative overflow-hidden cursor-pointer
               ${isScanning ? 'border-purple-500 bg-purple-500/20 shadow-[0_0_100px_rgba(168,85,247,0.5)] scale-110' : 'border-white/10 bg-white/5 text-slate-400'}
             `}>
              <ICONS.Fingerprint />
              {isScanning && <div className="absolute left-0 right-0 h-2 bg-purple-400 shadow-[0_0_20px_#a855f7] z-20" style={{ top: `${scanProgress}%` }}></div>}
              {isScanning && <div className="absolute inset-0 bg-purple-600/10 backdrop-blur-[2px] z-10"></div>}
           </div>
           <p className="mt-10 font-black tracking-[0.3em] text-purple-400 uppercase text-xs animate-pulse">{isScanning ? t.scanning : t.holdToScan}</p>
           <button onClick={() => setRegStep(2)} className="mt-16 text-slate-500 font-black text-[10px] uppercase tracking-[0.2em] opacity-50">Cancel</button>
        </div>
      )}
    </div>
  );

  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 flex flex-col relative overflow-hidden">
      
      {/* Daily Check-in Scan Overlay */}
      {isDailyScanOverlay && (
        <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-2xl z-[6000] flex flex-col items-center justify-center p-8 animate-fade-in">
           <div className="mb-10 text-center">
              <h2 className="text-2xl font-black text-white tracking-tighter mb-2">{t.soulScanner}</h2>
              <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.4em]">{t.scanToCheckIn}</p>
           </div>
           
           <div onMouseDown={() => startScan(true)} onMouseUp={cancelScan} onTouchStart={() => startScan(true)} onTouchEnd={cancelScan}
             className={`w-64 h-64 rounded-full border-[8px] flex items-center justify-center transition-all relative overflow-hidden cursor-pointer
               ${isScanning ? 'border-purple-500 bg-purple-500/20 shadow-[0_0_100px_rgba(168,85,247,0.5)] scale-110' : 'border-white/10 bg-white/5 text-slate-400'}
             `}>
              <ICONS.Fingerprint />
              {isScanning && <div className="absolute left-0 right-0 h-2 bg-purple-400 shadow-[0_0_20px_#a855f7] z-20" style={{ top: `${scanProgress}%` }}></div>}
              {isScanning && <div className="absolute inset-0 bg-purple-600/10 backdrop-blur-[2px] z-10"></div>}
           </div>

           <p className="mt-10 font-black tracking-[0.3em] text-purple-400 uppercase text-xs animate-pulse">
             {isScanning ? t.scanning : t.holdToScan}
           </p>

           <button onClick={() => setIsDailyScanOverlay(false)} className="mt-20 text-slate-500 font-black text-[10px] uppercase tracking-[0.2em] opacity-50">Cancel</button>
        </div>
      )}

      {/* Side Menu Drawer */}
      {showMenu && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[4000] animate-fade-in" onClick={() => setShowMenu(false)}>
          <div 
            className="bg-white w-4/5 h-full max-w-[300px] shadow-2xl p-8 flex flex-col justify-between animate-slide-right"
            onClick={e => e.stopPropagation()}
          >
            <div>
              <div className="mb-12 flex items-center gap-4">
                <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-xl">
                  <ICONS.ShieldCheck />
                </div>
                <div>
                  <h3 className="font-black text-xl tracking-tighter text-slate-900">{t.appName}</h3>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Enterprise Edition</p>
                </div>
              </div>

              <nav className="space-y-2">
                <button onClick={() => { setShowMenu(false); setShowSettings(true); }} className="w-full flex items-center gap-4 p-5 rounded-3xl hover:bg-slate-50 active:bg-slate-100 transition-all text-slate-700 font-black text-sm uppercase tracking-tight">
                  <span className="text-slate-400"><ICONS.Settings /></span>
                  <span>{t.settings}</span>
                </button>
                <button onClick={() => { setShowMenu(false); setShowContactsModal(true); }} className="w-full flex items-center gap-4 p-5 rounded-3xl hover:bg-slate-50 active:bg-slate-100 transition-all text-slate-700 font-black text-sm uppercase tracking-tight">
                  <span className="text-slate-400"><ICONS.UserGroup /></span>
                  <span>{t.manageContacts}</span>
                </button>
                <button onClick={() => { setShowMenu(false); setShowPrivacy(true); }} className="w-full flex items-center gap-4 p-5 rounded-3xl hover:bg-slate-50 active:bg-slate-100 transition-all text-slate-700 font-black text-sm uppercase tracking-tight">
                  <span className="text-slate-400"><ICONS.Privacy /></span>
                  <span>{t.privacyPolicy}</span>
                </button>
                <button onClick={() => { setShowMenu(false); setShowAbout(true); }} className="w-full flex items-center gap-4 p-5 rounded-3xl hover:bg-slate-50 active:bg-slate-100 transition-all text-slate-700 font-black text-sm uppercase tracking-tight">
                  <span className="text-slate-400"><ICONS.Info /></span>
                  <span>{t.about}</span>
                </button>
              </nav>
            </div>

            <div className="space-y-4">
              <div className="p-5 bg-slate-50 rounded-[2rem] border border-slate-100">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Authenticated Account</p>
                 <p className="text-xs font-bold text-slate-600 truncate">{user?.name}</p>
              </div>
              <button 
                onClick={handleReset}
                className="w-full p-5 rounded-[2rem] text-red-500 font-black text-xs uppercase tracking-widest border border-red-50 bg-red-50/30 hover:bg-red-50 active:scale-95 transition-all"
              >
                {t.signOut}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-xl z-[5000] flex items-center justify-center p-6 animate-fade-in">
           <div className="bg-white w-full rounded-[4rem] p-10 space-y-10 animate-slide-up shadow-2xl relative overflow-hidden">
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-slate-50 rounded-full blur-3xl opacity-50"></div>
              <div className="flex justify-between items-center relative z-10">
                <h2 className="text-2xl font-black text-slate-900 tracking-tighter">{t.settingsTitle}</h2>
                <button onClick={() => setShowSettings(false)} className="p-3 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors text-slate-500 font-black">✕</button>
              </div>
              <div className="space-y-8 relative z-10">
                <div className="flex justify-between items-center group cursor-pointer" onClick={() => setNotificationsEnabled(!notificationsEnabled)}>
                  <div>
                    <p className="font-black text-slate-800 tracking-tight">{t.notifications}</p>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Firebase Push Sync</p>
                  </div>
                  <div className={`w-14 h-8 rounded-full transition-all flex items-center px-1 shadow-inner ${notificationsEnabled ? 'bg-green-500' : 'bg-slate-200'}`}>
                    <div className={`w-6 h-6 bg-white rounded-full shadow-lg transition-all ${notificationsEnabled ? 'ml-6' : 'ml-0'}`}></div>
                  </div>
                </div>
                <div className="flex justify-between items-center group cursor-pointer" onClick={() => setHapticsEnabled(!hapticsEnabled)}>
                  <div>
                    <p className="font-black text-slate-800 tracking-tight">{t.haptics}</p>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Taptic System Engine</p>
                  </div>
                  <div className={`w-14 h-8 rounded-full transition-all flex items-center px-1 shadow-inner ${hapticsEnabled ? 'bg-green-500' : 'bg-slate-200'}`}>
                    <div className={`w-6 h-6 bg-white rounded-full shadow-lg transition-all ${hapticsEnabled ? 'ml-6' : 'ml-0'}`}></div>
                  </div>
                </div>
                <div className="p-6 bg-slate-50 rounded-[2.5rem] flex justify-between items-center border border-slate-100 shadow-inner">
                  <p className="font-black text-slate-800 tracking-tight">{t.checkInWindow}</p>
                  <p className="text-purple-600 font-black text-xl tracking-tighter">09:00 AM</p>
                </div>
              </div>
              <button onClick={() => setShowSettings(false)} className="w-full bg-slate-900 text-white py-6 rounded-[2.5rem] font-black uppercase tracking-widest shadow-2xl active:scale-95 transition-all text-sm">Save Preferences</button>
           </div>
        </div>
      )}

      {/* About Modal */}
      {showAbout && (
        <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-2xl z-[5000] flex items-center justify-center p-6 animate-fade-in">
           <div className="bg-white w-full rounded-[4rem] p-10 space-y-8 animate-slide-up shadow-2xl overflow-hidden relative">
              <div className="absolute top-0 right-0 p-8 text-5xl opacity-5 grayscale pointer-events-none">✨</div>
              <div className="flex flex-col items-center text-center">
                 <div className="p-4 bg-indigo-50 text-indigo-600 rounded-3xl mb-4 shadow-sm">
                   <ICONS.Info />
                 </div>
                 <h2 className="text-2xl font-black text-slate-900 tracking-tighter">{t.aboutTitle}</h2>
              </div>
              <div className="space-y-6">
                 <p className="text-slate-600 leading-relaxed font-bold text-sm text-center">
                   {t.aboutDescription}
                 </p>
                 <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 text-center">{t.developerWebsite}</p>
                    <a href={t.devWebsiteLink} target="_blank" rel="noopener noreferrer" className="block text-center text-purple-600 font-black text-base hover:underline break-all">
                       {t.devWebsiteLink.replace('https://', '')}
                    </a>
                 </div>
              </div>
              <button onClick={() => setShowAbout(false)} className="w-full bg-slate-900 text-white py-6 rounded-[2.5rem] font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all text-sm">Close</button>
           </div>
        </div>
      )}

      {/* Privacy Policy Modal */}
      {showPrivacy && (
        <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-3xl z-[5000] flex items-center justify-center p-6 animate-fade-in">
           <div className="bg-white w-full rounded-[4rem] p-10 space-y-8 animate-slide-up shadow-2xl overflow-hidden relative border border-white/20">
              <div className="absolute top-0 right-0 p-8 text-5xl opacity-5 grayscale pointer-events-none">🛡️</div>
              <div className="flex flex-col items-center text-center">
                 <div className="p-4 bg-purple-50 text-purple-600 rounded-3xl mb-4"><ICONS.Privacy /></div>
                 <h2 className="text-2xl font-black text-slate-900 tracking-tighter">{t.privacyTitle}</h2>
              </div>
              <div className="max-h-[350px] overflow-y-auto pr-3 custom-scrollbar">
                <p className="text-slate-600 leading-relaxed font-bold text-sm mb-6">
                  {t.privacyText}
                </p>
                <div className="space-y-6">
                  <div className="flex gap-4 items-start p-4 bg-green-50/50 rounded-2xl border border-green-100">
                    <div className="mt-1 text-green-500"><ICONS.ShieldCheck /></div>
                    <div>
                      <p className="text-xs font-black text-green-800 uppercase tracking-widest mb-1">Secure Sync</p>
                      <p className="text-[11px] font-bold text-slate-500">All biometric data and soul patterns are hashed locally before Firebase synchronization.</p>
                    </div>
                  </div>
                  <div className="flex gap-4 items-start p-4 bg-blue-50/50 rounded-2xl border border-blue-100">
                    <div className="mt-1 text-blue-500"><ICONS.ShieldCheck /></div>
                    <div>
                       <p className="text-xs font-black text-blue-800 uppercase tracking-widest mb-1">Zero Visibility</p>
                       <p className="text-[11px] font-bold text-slate-500">Location is ONLY broadcast to your guardians when the SOS Panic trigger is active.</p>
                    </div>
                  </div>
                  <div className="flex gap-4 items-start p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="mt-1 text-slate-400"><ICONS.Clock /></div>
                    <div>
                       <p className="text-xs font-black text-slate-700 uppercase tracking-widest mb-1">Data Retention</p>
                       <p className="text-[11px] font-bold text-slate-500">History older than 30 days is automatically purged from the safety ledger.</p>
                    </div>
                  </div>
                </div>
              </div>
              <button onClick={() => setShowPrivacy(false)} className="w-full bg-purple-600 text-white py-6 rounded-[2.5rem] font-black uppercase tracking-widest shadow-xl shadow-purple-200 active:scale-95 transition-all text-sm">Dismiss Shield</button>
           </div>
        </div>
      )}

      {/* SOS Confirmation Dialog */}
      {showPanicConfirm && (
        <div className="fixed inset-0 bg-slate-900/98 backdrop-blur-2xl z-[5000] flex items-end p-5">
          <div className="bg-white w-full rounded-[4.5rem] p-12 space-y-12 animate-slide-up shadow-[0_0_100px_rgba(220,38,38,0.3)] border-t-[8px] border-red-500">
            <div className="text-center">
               <div className="w-24 h-24 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-10 animate-pulse border-8 border-red-50">
                 <ICONS.Alert />
               </div>
               <h2 className="text-2xl font-black text-slate-900 tracking-tighter mb-4">Emergency Alert</h2>
               
               <div className="mb-10 min-h-[100px]">
                 {aiReassurance ? (
                   <div className="p-8 bg-indigo-50/50 rounded-[2.5rem] border border-indigo-100 italic text-indigo-700 text-lg font-bold animate-fade-in shadow-inner leading-tight">
                     <div className="flex items-center justify-center gap-2 mb-3">
                       <span className="text-purple-500 animate-pulse"><ICONS.Sparkles /></span>
                       <span className="text-[11px] font-black uppercase tracking-[0.3em] text-indigo-400">{t.aiSOSPrompt}</span>
                     </div>
                     "{aiReassurance}"
                   </div>
                 ) : (
                   <div className="flex flex-col items-center gap-4 py-6">
                     <div className="flex gap-2">
                        <div className="w-3 h-3 bg-purple-400 rounded-full animate-bounce"></div>
                        <div className="w-3 h-3 bg-purple-500 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                        <div className="w-3 h-3 bg-purple-600 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                     </div>
                     <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 animate-pulse">{t.aiThinking}</span>
                   </div>
                 )}
               </div>

               <p className="text-slate-600 font-bold text-xl leading-tight opacity-90 px-4">
                 {t.confirmPanic}
               </p>
            </div>
            <div className="space-y-5">
              <button onClick={handlePanicConfirm} className="w-full bg-red-600 text-white py-8 rounded-[2.5rem] font-black text-2xl shadow-2xl shadow-red-200 active:scale-95 transition-all uppercase tracking-tighter">YES, ALERT GUARDIANS</button>
              <button onClick={() => { vibrate(20); setShowPanicConfirm(false); }} className="w-full bg-slate-100 text-slate-800 py-6 rounded-[2.5rem] font-black text-xl active:scale-95 transition-all uppercase opacity-60">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Daily Reality Check */}
      {showMorningForce && (
        <div className="fixed inset-0 bg-slate-900 z-[3000] flex flex-col items-center justify-center p-8 text-center animate-fade-in">
           <div className="mb-4 w-16 h-1 bg-white/20 rounded-full"></div>
           <h1 className="text-4xl font-black text-white mb-3 tracking-tighter">{t.goodMorning}</h1>
           <p className="text-purple-400 font-black mb-12 text-lg px-2 leading-tight italic">{language === Language.HI ? t.mementoMoriHi : t.mementoMori}</p>
           
           <div className="bg-white/5 border border-white/10 rounded-[4rem] p-10 mb-16 w-full shadow-2xl relative overflow-hidden">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-3">Legacy Meter</p>
              <div className="flex justify-center items-end gap-1 mb-2 text-white">
                 <span className="text-5xl font-black tracking-tighter">{life.elapsed + 1}</span>
                 <span className="text-slate-500 font-bold mb-1">/ {user?.predictedDays} days</span>
              </div>
              <div className="w-full h-2.5 bg-white/10 rounded-full mt-4 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-purple-500 to-indigo-600 transition-all duration-[2000ms]" style={{ width: `${100 - life.percent}%` }}></div>
              </div>
           </div>

           <button onClick={() => setIsDailyScanOverlay(true)} className="w-64 h-64 rounded-full bg-white text-green-600 shadow-2xl flex flex-col items-center justify-center p-8 border-[12px] border-green-50 animate-pulse active:scale-95 transition-all">
              <span className="text-3xl font-black leading-none uppercase tracking-tighter">{t.imAlive}</span>
              <div className="mt-3 w-1.5 h-1.5 bg-green-500 rounded-full"></div>
           </button>
        </div>
      )}

      {/* Dashboard Header */}
      <header className="bg-white p-6 flex justify-between items-center border-b sticky top-0 z-[100] shadow-sm">
        <div className="flex items-center gap-4">
           {/* Hamburger Menu Button */}
           <button 
             onClick={() => { vibrate(20); setShowMenu(true); }}
             className="p-3 bg-slate-50 rounded-full text-slate-700 active:scale-90 transition-all hover:bg-slate-100 border border-slate-100"
             aria-label={t.menu}
           >
             <ICONS.Menu />
           </button>
           <h2 className="text-xl font-black text-slate-900 flex items-center gap-2 tracking-tighter">
             {status === SafetyStatus.SAFE ? <span className="text-green-600"><ICONS.ShieldCheck /></span> : <span className="text-red-600 animate-pulse"><ICONS.Alert /></span>}
             {t.appName}
           </h2>
        </div>
        <div className="flex gap-2 items-center">
           <button 
             onClick={() => { vibrate(20); setLanguage(l => l === Language.EN ? Language.HI : Language.EN); }} 
             className="text-[10px] font-black bg-slate-900 text-white px-5 py-2 rounded-full uppercase tracking-tighter shadow-md hover:bg-black transition-colors"
           >
             {language.toUpperCase()}
           </button>
        </div>
      </header>

      <main className="flex-grow p-6 space-y-6 overflow-y-auto pb-4 custom-scrollbar">
        {/* Gemini AI Dashboard Insight - Hobby Motivation */}
        <div className="bg-gradient-to-br from-indigo-50 to-white p-7 rounded-[3.5rem] border shadow-md flex gap-6 animate-fade-in relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-200/20 rounded-full blur-3xl -mr-10 -mt-10"></div>
          <div className="text-5xl drop-shadow-xl select-none">✨</div>
          <div className="flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-purple-600"><ICONS.Sparkles /></span>
              <p className="text-[9px] font-black text-purple-600 uppercase tracking-[0.2em]">{t.hobbyMotivation}</p>
            </div>
            <p className="text-sm font-bold text-slate-800 leading-snug italic">
              {aiInsight || t.aiThinking}
            </p>
          </div>
        </div>

        {/* Legacy Watch */}
        <div className="bg-white p-7 rounded-[3rem] shadow-sm border border-slate-100">
          <div className="flex justify-between items-center mb-6">
             <div className="flex items-center gap-3 text-slate-800">
                <ICONS.Clock />
                <span className="font-black uppercase text-[10px] tracking-[0.2em]">{t.lifeClock}</span>
             </div>
             <div className="flex flex-col items-end">
               <span className="text-[9px] font-black bg-purple-50 text-purple-600 px-4 py-1.5 rounded-full border border-purple-100 uppercase">{user?.initialSoulAge}</span>
             </div>
          </div>
          <div className="space-y-5">
             <div className="flex justify-between text-[11px] font-bold text-slate-500 uppercase tracking-tight">
                <span>Lived: <b className="text-slate-900 text-sm ml-1">{life.elapsed}</b> days</span>
                <span>Gifted: <b className="text-purple-600 text-sm ml-1">{life.remaining}</b> days</span>
             </div>
             <div className="w-full h-5 bg-slate-50 rounded-full overflow-hidden shadow-inner border border-slate-100 p-1">
                <div className="h-full bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full transition-all duration-1000 ease-out shadow-lg" style={{ width: `${100 - life.percent}%` }}></div>
             </div>
          </div>
        </div>

        {/* Global Safety State */}
        <div className={`p-8 rounded-[4rem] shadow-2xl border-b-[12px] transition-all duration-700 ${
          status === SafetyStatus.SAFE ? 'bg-zinc-900 border-zinc-950 text-white' : 'bg-red-600 border-red-800 text-white animate-pulse'
        }`}>
          <p className="text-[10px] font-black uppercase opacity-50 mb-3 tracking-[0.3em]">{t.status}</p>
          <h3 className="text-5xl font-black mb-10 italic tracking-tighter">{status === SafetyStatus.SAFE ? t.safe : t.emergency}</h3>
          <div className="bg-white/5 rounded-[2.5rem] p-6 border border-white/10 backdrop-blur-sm shadow-inner">
            <p className="text-[9px] font-bold uppercase text-slate-400 mb-2 tracking-widest">Verification Checkpoint</p>
            <p className="text-4xl font-black tracking-tighter tabular-nums text-purple-400 drop-shadow-md">{timeRemaining}</p>
          </div>
        </div>

        {/* Main Interaction Button - Triggers Fingerprint Scan Overlay */}
        <div className="flex justify-center py-6">
          <button 
            onClick={() => setIsDailyScanOverlay(true)}
            disabled={isSyncing}
            className={`w-64 h-64 rounded-full bg-white shadow-2xl transition-all active:scale-95 flex flex-col items-center justify-center p-8 border-[16px] 
              ${isCheckInDue ? 'alive-btn-pulse border-orange-50 shadow-orange-100/50' : 'border-slate-50 shadow-slate-200/50'}
              ${isSyncing ? 'opacity-50 grayscale' : 'hover:scale-105'}
            `}
          >
            <span className={`text-3xl font-black leading-none text-center tracking-tighter uppercase ${status === SafetyStatus.SAFE ? 'text-green-600' : 'text-red-600'}`}>
              {t.imAlive}
            </span>
            <div className={`mt-6 h-1 w-12 rounded-full transition-all duration-500 ${isSyncing ? 'bg-purple-500 w-24' : 'bg-slate-100'}`}></div>
          </button>
        </div>
      </main>

      {/* Footer Safety Actions */}
      <footer className="p-6 pb-14 bg-white border-t sticky bottom-0 z-[100] safe-area-inset-bottom shadow-[0_-10px_30px_rgba(0,0,0,0.03)] space-y-4">
        {user && user.contacts.length > 0 && (
          <button 
            onClick={handleCallPrimaryContact}
            className="w-full bg-indigo-600 text-white py-5 rounded-[2.5rem] font-black text-lg shadow-xl shadow-indigo-100 active:scale-[0.98] transition-all flex items-center justify-center gap-3 uppercase tracking-tighter"
          >
            <ICONS.Phone />
            {t.callGuardian}: {user.contacts[0].name}
          </button>
        )}
        <button 
          onClick={handlePanicInitiation}
          className="w-full bg-red-600 text-white py-7 rounded-[3rem] font-black text-2xl shadow-2xl shadow-red-200 active:scale-[0.98] active:bg-red-700 transition-all uppercase tracking-tighter animate-pulse"
        >
          {t.panic}
        </button>
      </footer>

      {/* Contacts Management Modal */}
      {showContactsModal && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-[2000] flex items-end sm:items-center justify-center p-0 sm:p-6 animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-t-[3rem] sm:rounded-[4rem] p-8 space-y-6 animate-slide-up max-h-[92vh] flex flex-col shadow-2xl border-t border-slate-100 overflow-hidden">
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto -mt-2 mb-2 sm:hidden"></div>
            <div className="flex justify-between items-center pb-2">
               <div className="flex items-center gap-3">
                 <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl">
                   <ICONS.UserGroup />
                 </div>
                 <div>
                   <h2 className="text-2xl font-black text-slate-900 tracking-tighter">{t.manageContacts}</h2>
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Emergency Circle</p>
                 </div>
               </div>
               <button onClick={() => setShowContactsModal(false)} className="bg-slate-50 p-3 rounded-full hover:bg-slate-100 active:scale-90 transition-all text-slate-400 border border-slate-100">✕</button>
            </div>
            <div className="flex-grow overflow-y-auto space-y-3 pr-1 custom-scrollbar min-h-[120px]">
              {!user || user.contacts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 opacity-40">
                  <div className="scale-150 mb-6 text-slate-300"><ICONS.UserGroup /></div>
                  <p className="text-slate-500 font-bold italic text-sm">{t.noContacts}</p>
                </div>
              ) : (
                user.contacts.map((c, idx) => (
                  <div key={c.id} className="bg-slate-50 p-5 rounded-[2.5rem] flex justify-between items-center border border-slate-100 hover:border-purple-200 hover:bg-white transition-all animate-fade-in" style={{ animationDelay: `${idx * 50}ms` }}>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-full flex items-center justify-center text-purple-600 font-black text-lg border-2 border-white shadow-sm">
                        {c.name[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="font-black text-slate-900 text-base tracking-tight">{c.name}</p>
                        <p className="text-[11px] text-slate-500 font-bold tracking-tight bg-white px-2 py-0.5 rounded-full inline-block mt-1 shadow-sm border border-slate-100">{c.phone}</p>
                      </div>
                    </div>
                    <button onClick={() => manageContact('remove', c.id)} className="text-slate-300 hover:text-red-500 p-3 hover:bg-red-50 rounded-full active:scale-75 transition-all">
                      <ICONS.Trash />
                    </button>
                  </div>
                ))
              )}
            </div>
            <div className="bg-slate-50 p-6 rounded-[3.5rem] space-y-4 border border-slate-100 shadow-inner mt-2">
               <div className="space-y-3">
                 <input value={tempContactName} onChange={e => setTempContactName(e.target.value)} type="text" placeholder={t.contactName} className="w-full p-4 pl-6 bg-white rounded-3xl outline-none text-sm font-bold shadow-sm border focus:border-purple-300 transition-all" />
                 <input value={tempContactPhone} onChange={e => setTempContactPhone(e.target.value)} type="tel" placeholder={t.contactPhone} className="w-full p-4 pl-6 bg-white rounded-3xl outline-none text-sm font-bold shadow-sm border focus:border-purple-300 transition-all" />
               </div>
               <button onClick={() => { if(tempContactName && tempContactPhone) manageContact('add'); }} disabled={!tempContactName || !tempContactPhone} className="w-full bg-slate-900 text-white p-5 rounded-3xl font-black flex items-center justify-center gap-2 text-xs active:bg-black transition-all uppercase tracking-[0.2em] shadow-lg shadow-slate-200 disabled:opacity-30">
                 <ICONS.Plus /> {t.addContact}
               </button>
            </div>
            <button onClick={() => setShowContactsModal(false)} className="w-full bg-purple-600 text-white py-6 rounded-[2.5rem] font-black uppercase tracking-widest text-base shadow-xl shadow-purple-200 active:scale-[0.98] transition-all mt-2">Done</button>
          </div>
        </div>
      )}
    </div>
  );
}
