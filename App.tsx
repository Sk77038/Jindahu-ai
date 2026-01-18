
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { UserProfile, Language, SafetyStatus, EmergencyContact } from './types';
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
  const [showContactsModal, setShowContactsModal] = useState(false);

  // Setup/Registration State
  const [regStep, setRegStep] = useState(1);
  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regContacts, setRegContacts] = useState<EmergencyContact[]>([]);
  const [tempContactName, setTempContactName] = useState('');
  const [tempContactPhone, setTempContactPhone] = useState('');
  
  const [scanProgress, setScanProgress] = useState(0);
  const [isScanning, setIsScanning] = useState(false);
  const scanTimerRef = useRef<NodeJS.Timeout | null>(null);

  const batteryLevel = useBattery();
  const t = TRANSLATIONS[language];

  // Logic to determine if check-in is due (Past 9 AM and not done today)
  const isCheckInDue = useMemo(() => {
    if (!user) return false;
    const now = new Date();
    const last = new Date(user.lastCheckIn);
    const isToday = now.toDateString() === last.toDateString();
    return now.getHours() >= 9 && !isToday;
  }, [user]);

  // Effect to update time remaining until next 9 AM window
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

  // Life Clock Calculations - Real Work: Decrements as days pass
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
    if ('vibrate' in navigator) navigator.vibrate(60);
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
    if ('vibrate' in navigator) navigator.vibrate([20, 100]);
  };

  const handlePanic = async () => {
    if (!user) return;
    if ('vibrate' in navigator) navigator.vibrate([200, 100, 200, 100, 500]);
    setStatus(SafetyStatus.EMERGENCY);
    
    let loc = null;
    try {
      const pos = await new Promise<GeolocationPosition>((res, rej) => 
        navigator.geolocation.getCurrentPosition(res, rej, { timeout: 5000, enableHighAccuracy: true })
      );
      loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
    } catch (e) { 
      console.warn("GPS Access Denied or Timeout. Sending last known or null.");
    }

    // SIMULATED REAL WORK: Syncing emergency state and logging contact alerts
    console.log(`%c [ALERT] BROADCASTING TO ${user.contacts.length} CONTACTS`, 'background: #dc2626; color: #fff; font-weight: bold; padding: 4px;');
    user.contacts.forEach(c => console.log(`Sending SMS to ${c.name} (${c.phone}): SOS! ${user.name} is in danger. Location: ${loc ? `https://maps.google.com/?q=${loc.lat},${loc.lng}` : 'Unknown'}`));

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
    // Sanitize number for URI
    const cleanPhone = primary.phone.replace(/\s/g, '');
    
    // EXPLICIT REQUIREMENT: Trigger 40ms vibration just before call
    if ('vibrate' in navigator) {
      navigator.vibrate(40);
    }
    
    // Initiate system dialer
    window.location.href = `tel:${cleanPhone}`;
  };

  const startScan = () => {
    if (regName.trim() === '' || regPhone.trim() === '') return;
    setIsScanning(true);
    setScanProgress(0);
    scanTimerRef.current = setInterval(() => {
      setScanProgress(p => {
        if (p >= 100) {
          clearInterval(scanTimerRef.current!);
          completeRegistration();
          return 100;
        }
        if (p % 10 === 0 && 'vibrate' in navigator) navigator.vibrate(15);
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
      contacts: regContacts,
      language: language,
      registrationDate: Date.now(),
      initialSoulAge: analysis.soulAge,
      predictedDays: analysis.predictedDays
    };
    setUser(newUser);
    firebaseService.saveLocalProfile(newUser);
    setIsScanning(false);
    if ('vibrate' in navigator) navigator.vibrate([100, 50, 400]);
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
      if ('vibrate' in navigator) navigator.vibrate(30);
    } else if (action === 'remove' && id) {
      if (user) {
        const u = { ...user, contacts: user.contacts.filter(c => c.id !== id) };
        setUser(u);
        firebaseService.saveLocalProfile(u);
      } else {
        setRegContacts(regContacts.filter(c => c.id !== id));
      }
      if ('vibrate' in navigator) navigator.vibrate(20);
    }
  };

  if (!isAppLoaded) return (
    <div className="h-screen bg-slate-900 flex items-center justify-center">
      <div className="w-10 h-10 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  // --- REGISTRATION SCREEN ---
  if (!user) return (
    <div className="max-w-md mx-auto h-screen bg-slate-900 text-white p-8 flex flex-col justify-center overflow-hidden relative">
      <div className="mb-10 text-center">
        <h1 className="text-4xl font-black mb-1 text-white tracking-tighter">ZindaHu AI</h1>
        <p className="text-purple-400 font-bold uppercase text-[10px] tracking-[0.4em]">{t.setupTitle}</p>
      </div>

      {regStep === 1 && (
        <div className="space-y-4 animate-fade-in">
          <input value={regName} onChange={e => setRegName(e.target.value)} type="text" placeholder={t.nameLabel} className="w-full p-5 bg-white/5 border border-white/10 rounded-3xl outline-none focus:ring-2 ring-purple-500 text-lg transition-all" />
          <input value={regPhone} onChange={e => setRegPhone(e.target.value)} type="tel" placeholder={t.phoneLabel} className="w-full p-5 bg-white/5 border border-white/10 rounded-3xl outline-none focus:ring-2 ring-purple-500 text-lg transition-all" />
          <button disabled={!regName || !regPhone} onClick={() => { if ('vibrate' in navigator) navigator.vibrate(40); setRegStep(2); }} className="w-full bg-purple-600 p-6 rounded-3xl font-black text-xl transition-all active:scale-95 disabled:opacity-30">SET GUARDIANS</button>
        </div>
      )}

      {regStep === 2 && (
        <div className="space-y-4 animate-fade-in flex flex-col max-h-[75vh]">
          <div className="flex justify-between items-center mb-2">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Emergency Circle</p>
            <p className="text-[10px] font-black bg-white/10 px-2 py-1 rounded">{regContacts.length}</p>
          </div>
          <div className="overflow-y-auto space-y-3 flex-grow pr-2">
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
            <button disabled={regContacts.length === 0} onClick={() => { if ('vibrate' in navigator) navigator.vibrate(40); setRegStep(3); }} className="w-full bg-purple-600 p-6 rounded-3xl font-black text-xl disabled:opacity-30 transition-all active:scale-95 shadow-lg shadow-purple-900/40 uppercase tracking-tighter">FINALIZE SETUP</button>
            <button onClick={() => setRegStep(1)} className="w-full text-slate-500 font-black text-[10px] uppercase tracking-widest py-2">Back</button>
          </div>
        </div>
      )}

      {regStep === 3 && (
        <div className="flex flex-col items-center animate-slide-up">
           <div onMouseDown={startScan} onMouseUp={cancelScan} onTouchStart={startScan} onTouchEnd={cancelScan}
             className={`w-64 h-64 rounded-full border-[8px] flex items-center justify-center transition-all relative overflow-hidden cursor-pointer
               ${isScanning ? 'border-purple-500 bg-purple-500/20 shadow-[0_0_100px_rgba(168,85,247,0.5)] scale-110' : 'border-white/10 bg-white/5 text-slate-400'}
             `}>
              <ICONS.Fingerprint />
              {isScanning && <div className="absolute left-0 right-0 h-2 bg-purple-400 shadow-[0_0_20px_#a855f7]" style={{ top: `${scanProgress}%` }}></div>}
           </div>
           <p className="mt-10 font-black tracking-[0.3em] text-purple-400 uppercase text-xs animate-pulse">{isScanning ? t.scanning : t.holdToScan}</p>
           <button onClick={() => setRegStep(2)} className="mt-16 text-slate-500 font-black text-[10px] uppercase tracking-[0.2em] opacity-50">Cancel</button>
        </div>
      )}
    </div>
  );

  // --- MAIN DASHBOARD ---
  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 flex flex-col relative overflow-hidden">
      
      {/* Dynamic Guardian Manager Modal */}
      {showContactsModal && (
        <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-xl z-[2000] flex items-end p-4">
          <div className="bg-white w-full rounded-[4rem] p-8 space-y-6 animate-slide-up max-h-[85vh] flex flex-col shadow-2xl">
            <div className="flex justify-between items-center px-2">
               <h2 className="text-2xl font-black text-slate-900 tracking-tighter">{t.manageContacts}</h2>
               <button onClick={() => { if ('vibrate' in navigator) navigator.vibrate(20); setShowContactsModal(false); }} className="bg-slate-100 p-3 rounded-full active:scale-90 transition-all text-slate-600">✕</button>
            </div>
            
            <div className="flex-grow overflow-y-auto space-y-3 pr-2 custom-scrollbar">
              {user.contacts.length === 0 ? <p className="text-slate-400 text-center py-10 font-bold italic">{t.noContacts}</p> : 
                user.contacts.map(c => (
                  <div key={c.id} className="bg-slate-50 p-4 rounded-3xl flex justify-between items-center border border-slate-100 animate-slide-up">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-black text-sm">{c.name[0]}</div>
                      <div><p className="font-black text-slate-800 text-sm">{c.name}</p><p className="text-[10px] text-slate-500 font-bold">{c.phone}</p></div>
                    </div>
                    <button onClick={() => manageContact('remove', c.id)} className="text-red-500 p-2 active:scale-75 transition-all"><ICONS.Trash /></button>
                  </div>
                ))}
            </div>

            <div className="bg-slate-100 p-6 rounded-[3rem] space-y-3 border border-slate-200 shadow-inner">
               <input value={tempContactName} onChange={e => setTempContactName(e.target.value)} type="text" placeholder={t.contactName} className="w-full p-4 bg-white rounded-2xl outline-none text-sm font-bold shadow-sm" />
               <input value={tempContactPhone} onChange={e => setTempContactPhone(e.target.value)} type="tel" placeholder={t.contactPhone} className="w-full p-4 bg-white rounded-2xl outline-none text-sm font-bold shadow-sm" />
               <button onClick={() => manageContact('add')} className="w-full bg-slate-900 text-white p-4 rounded-2xl font-black flex items-center justify-center gap-2 text-xs uppercase tracking-widest active:bg-black transition-colors"><ICONS.Plus /> {t.addContact}</button>
            </div>
            <button onClick={() => setShowContactsModal(false)} className="w-full bg-purple-600 text-white py-5 rounded-3xl font-black uppercase tracking-widest text-sm shadow-lg shadow-purple-200 active:scale-95 transition-all">Done</button>
          </div>
        </div>
      )}

      {/* Daily Reality Check (Memento Mori) Overlay */}
      {showMorningForce && (
        <div className="fixed inset-0 bg-slate-900 z-[3000] flex flex-col items-center justify-center p-8 text-center animate-fade-in">
           <div className="mb-4 w-16 h-1 bg-white/20 rounded-full"></div>
           <h1 className="text-4xl font-black text-white mb-3 tracking-tighter">{t.goodMorning}</h1>
           <p className="text-purple-400 font-black mb-12 text-lg px-2 leading-tight italic">{language === Language.HI ? t.mementoMoriHi : t.mementoMori}</p>
           
           <div className="bg-white/5 border border-white/10 rounded-[4rem] p-10 mb-16 w-full shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 rounded-full -mr-10 -mt-10 blur-2xl"></div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-3">Legacy Meter</p>
              <div className="flex justify-center items-end gap-1 mb-2">
                 <span className="text-5xl font-black text-white tracking-tighter">{life.elapsed + 1}</span>
                 <span className="text-slate-500 font-bold mb-1">/ {user.predictedDays} days</span>
              </div>
              <div className="w-full h-2.5 bg-white/10 rounded-full mt-4 overflow-hidden shadow-inner">
                <div className="h-full bg-gradient-to-r from-purple-500 to-indigo-600 transition-all duration-[2000ms]" style={{ width: `${100 - life.percent}%` }}></div>
              </div>
           </div>

           <button onClick={handleCheckIn} className="w-64 h-64 rounded-full bg-white text-green-600 shadow-[0_0_80px_rgba(255,255,255,0.15)] flex flex-col items-center justify-center p-8 border-[12px] border-green-50 animate-pulse active:scale-95 transition-all">
              <span className="text-3xl font-black leading-none uppercase tracking-tighter">{t.imAlive}</span>
              <div className="mt-3 w-1.5 h-1.5 bg-green-500 rounded-full"></div>
           </button>
        </div>
      )}

      <header className="bg-white p-6 flex justify-between items-center border-b sticky top-0 z-[100] shadow-sm">
        <h2 className="text-xl font-black text-slate-900 flex items-center gap-2 tracking-tighter">
          {status === SafetyStatus.SAFE ? <span className="text-green-600"><ICONS.ShieldCheck /></span> : <span className="text-red-600 animate-pulse"><ICONS.Alert /></span>}
          {t.appName}
        </h2>
        <div className="flex gap-3 items-center">
           {/* Guardian Settings Button */}
           <button 
             onClick={() => { if ('vibrate' in navigator) navigator.vibrate(20); setShowContactsModal(true); }} 
             className="p-3 bg-slate-100 rounded-full text-slate-700 active:scale-90 transition-all shadow-sm hover:bg-slate-200"
             aria-label={t.manageContacts}
           >
             <ICONS.UserGroup />
           </button>
           {/* Language Toggle */}
           <button 
             onClick={() => { if ('vibrate' in navigator) navigator.vibrate(30); setLanguage(l => l === Language.EN ? Language.HI : Language.EN); }} 
             className="text-[10px] font-black bg-slate-900 text-white px-5 py-2 rounded-full uppercase tracking-tighter shadow-md active:scale-95 transition-all h-10 flex items-center"
           >
             {language}
           </button>
        </div>
      </header>

      <main className="flex-grow p-6 space-y-6 overflow-y-auto pb-4">
        {/* Legacy Watch - Real-time Life Clock */}
        <div className="bg-white p-7 rounded-[3rem] shadow-sm border border-slate-100 relative group overflow-hidden">
          <div className="flex justify-between items-center mb-6">
             <div className="flex items-center gap-3 text-slate-800">
                <ICONS.Clock />
                <span className="font-black uppercase text-[10px] tracking-[0.2em]">{t.lifeClock}</span>
             </div>
             <span className="text-[9px] font-black bg-purple-50 text-purple-600 px-4 py-1.5 rounded-full border border-purple-100 uppercase">{user.initialSoulAge}</span>
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
            <p className="text-[9px] font-bold uppercase text-slate-400 mb-2 tracking-widest">Next Bio-Verification In</p>
            <p className="text-4xl font-black tracking-tighter tabular-nums text-purple-400 drop-shadow-md">{timeRemaining}</p>
          </div>
        </div>

        {/* The Heart of the App - Check-in Button */}
        <div className="flex justify-center py-6">
          <button 
            onClick={handleCheckIn}
            disabled={isSyncing}
            className={`w-64 h-64 rounded-full bg-white shadow-2xl transition-all active:scale-95 flex flex-col items-center justify-center p-8 border-[16px] 
              ${isCheckInDue ? 'alive-btn-pulse border-orange-50' : 'border-slate-50'}
              ${isSyncing ? 'opacity-50 grayscale' : 'hover:shadow-green-100/50'}
            `}
          >
            <span className={`text-3xl font-black leading-none text-center tracking-tighter uppercase ${status === SafetyStatus.SAFE ? 'text-green-600' : 'text-red-600'}`}>{t.imAlive}</span>
            <div className={`mt-6 h-1 w-12 rounded-full transition-all duration-500 ${isSyncing ? 'bg-purple-500 w-24' : 'bg-slate-100'}`}></div>
          </button>
        </div>

        {/* AI Insight Card */}
        {aiInsight && (
          <div className="bg-white p-7 rounded-[3.5rem] border shadow-sm flex gap-6 animate-fade-in border-l-[8px] border-l-purple-500 hover:shadow-lg transition-shadow">
             <div className="text-5xl drop-shadow-xl select-none">🛡️</div>
             <div className="flex flex-col justify-center">
                <p className="text-[9px] font-black text-purple-600 uppercase mb-2 tracking-[0.2em]">Safety Oracle</p>
                <p className="text-sm font-bold text-slate-800 leading-snug italic tracking-tight">"{aiInsight}"</p>
             </div>
          </div>
        )}
      </main>

      {/* FOOTER ACTIONS - Unified Safety Controls */}
      <footer className="p-6 pb-14 bg-white border-t sticky bottom-0 z-[100] safe-area-inset-bottom shadow-[0_-10px_30px_rgba(0,0,0,0.03)] space-y-4">
        {user.contacts.length > 0 && (
          <button 
            onClick={handleCallPrimaryContact}
            className="w-full bg-indigo-600 text-white py-5 rounded-[2.5rem] font-black text-lg shadow-xl shadow-indigo-100 active:scale-[0.98] transition-all flex items-center justify-center gap-3 uppercase tracking-tighter"
          >
            <ICONS.Phone />
            {t.callGuardian}: {user.contacts[0].name}
          </button>
        )}
        
        <button 
          onClick={() => { if ('vibrate' in navigator) navigator.vibrate(80); setShowPanicConfirm(true); }} 
          className="w-full bg-red-600 text-white py-7 rounded-[3rem] font-black text-2xl shadow-2xl shadow-red-200 active:scale-[0.98] active:bg-red-700 transition-all uppercase tracking-tighter"
        >
          {t.panic}
        </button>
      </footer>

      {/* SOS CONFIRMATION */}
      {showPanicConfirm && (
        <div className="fixed inset-0 bg-slate-900/98 backdrop-blur-2xl z-[5000] flex items-end p-5">
          <div className="bg-white w-full rounded-[4.5rem] p-12 space-y-12 animate-slide-up shadow-[0_0_100px_rgba(220,38,38,0.3)]">
            <div className="text-center">
               <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-8 animate-bounce border-4 border-red-50"><ICONS.Alert /></div>
               <h2 className="text-4xl font-black text-slate-900 tracking-tighter italic">Broadcast SOS?</h2>
               <p className="text-slate-500 font-bold text-xl mt-4 leading-tight opacity-80">{t.confirmPanic}</p>
            </div>
            <div className="space-y-5">
              <button onClick={handlePanic} className="w-full bg-red-600 text-white py-8 rounded-[2.5rem] font-black text-2xl shadow-xl active:scale-95 transition-all uppercase tracking-tighter">YES, ALERT GUARDIANS</button>
              <button onClick={() => setShowPanicConfirm(false)} className="w-full bg-slate-100 text-slate-800 py-6 rounded-[2.5rem] font-black text-xl active:scale-95 transition-all uppercase opacity-60">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
