
import React, { useState, useEffect, useRef } from 'react';
import { UserProfile, Language, SafetyStatus, EmergencyContact, BloodGroup, SafetyConfig } from './types';
import { TRANSLATIONS, ICONS, LANGUAGES_SUPPORTED, BLOOD_GROUPS } from './constants';
import { firebaseService } from './services/firebaseService';
import { 
  getSafetyInsight, 
  getSoulAnalysis, 
  getNearbyHospitals, 
  getDostAiResponse,
  getMotivationalVoice,
} from './services/geminiService';

const DEFAULT_CONFIG: SafetyConfig = {
  autoPanicOnLowBattery: true,
  shakeToEmergency: false,
  silentSiren: false,
  checkInIntervalHours: 24
};

async function playAudioBase64(base64: string) {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    const binary = atob(base64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
    const dataInt16 = new Int16Array(bytes.buffer);
    const buffer = ctx.createBuffer(1, dataInt16.length, 24000);
    const channelData = buffer.getChannelData(0);
    for (let i = 0; i < dataInt16.length; i++) {
      channelData[i] = dataInt16[i] / 32768.0;
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start();
  } catch (e) {
    console.error("Audio playback error:", e);
  }
}

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [language, setLanguage] = useState<Language>(Language.EN);
  const [status, setStatus] = useState<SafetyStatus>(SafetyStatus.SAFE);
  const [timeRemaining, setTimeRemaining] = useState<string>('24:00:00');
  const [aiInsight, setAiInsight] = useState<string>('');
  const [regStep, setRegStep] = useState(1);
  const [regName, setRegName] = useState('');
  const [regAge, setRegAge] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regBlood, setRegBlood] = useState<BloodGroup>('Unknown');
  const [regMedical, setRegMedical] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [showDostAi, setShowDostAi] = useState(false);
  const [chatMessages, setChatMessages] = useState<{role: 'user' | 'ai', text: string}[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [sosCallError, setSosCallError] = useState<string | null>(null);
  
  const scanTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const t = TRANSLATIONS[language] || TRANSLATIONS.en;

  useEffect(() => {
    const profile = firebaseService.getLocalProfile();
    if (profile) {
      setUser(profile);
      setLanguage(profile.language);
      setAiInsight(localStorage.getItem('last_insight') || '');
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      const deadline = (user.lastCheckIn + (user.config.checkInIntervalHours * 3600000));
      const diff = deadline - Date.now();
      if (diff <= 0) { 
        setStatus(SafetyStatus.ATTENTION); 
        setTimeRemaining('00:00:00'); 
      }
      else {
        const h = Math.floor(diff / 3600000).toString().padStart(2, '0');
        const m = Math.floor((diff % 3600000) / 60000).toString().padStart(2, '0');
        const s = Math.floor((diff % 60000) / 1000).toString().padStart(2, '0');
        setTimeRemaining(`${h}:${m}:${s}`);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const triggerSOS = () => {
    setStatus(SafetyStatus.EMERGENCY);
    setSosCallError(null);
    if ('vibrate' in navigator) navigator.vibrate([500, 200, 500, 200, 500]);
    
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          firebaseService.syncToCloud(user?.phone || 'unknown', {
            status: SafetyStatus.EMERGENCY,
            location: { lat: pos.coords.latitude, lng: pos.coords.longitude },
            timestamp: Date.now()
          });
        },
        (err) => {
          firebaseService.syncToCloud(user?.phone || 'unknown', {
            status: SafetyStatus.EMERGENCY,
            timestamp: Date.now()
          });
        }
      );
    }
  };

  const callGuardian = () => {
    if (!user?.contacts || user.contacts.length === 0) {
      setSosCallError("No Guardian added. Please set one in settings!");
      return;
    }
    const phone = user.contacts[0].phone.replace(/[^0-9+]/g, '');
    window.location.href = `tel:${phone}`;
  };

  const startScan = (isCheckIn: boolean) => {
    setIsScanning(true);
    setScanProgress(0);
    if ('vibrate' in navigator) navigator.vibrate(50);
    scanTimerRef.current = setInterval(() => {
      setScanProgress(p => {
        if (p >= 100) { 
          clearInterval(scanTimerRef.current!); 
          isCheckIn ? completeCheckIn() : completeRegistration(); 
          return 100; 
        }
        if (p % 10 === 0 && 'vibrate' in navigator) navigator.vibrate(10);
        return p + 2;
      });
    }, 20);
  };

  const completeRegistration = async () => {
    setIsAiTyping(true);
    const soul = await getSoulAnalysis(regName, language, regAge, regMedical);
    const newUser: UserProfile = {
      name: regName, age: regAge, phone: regPhone, bloodGroup: regBlood,
      medicalConditions: regMedical, hobbies: [], checkInHour: 9,
      lastCheckIn: Date.now(), contacts: [], language,
      registrationDate: Date.now(), initialSoulAge: soul.soulAge || "Radiant Soul",
      predictedDays: soul.predictedDays || 34000,
      config: DEFAULT_CONFIG
    };
    setUser(newUser);
    firebaseService.saveLocalProfile(newUser);
    setIsScanning(false);
    setIsAiTyping(false);
  };

  const completeCheckIn = async () => {
    if (!user) return;
    const updated = { ...user, lastCheckIn: Date.now() };
    setUser(updated);
    firebaseService.saveLocalProfile(updated);
    setStatus(SafetyStatus.SAFE);
    setIsScanning(false);
    setIsAiTyping(true);
    const insight = await getSafetyInsight(updated);
    setAiInsight(insight);
    localStorage.setItem('last_insight', insight);
    const voice = await getMotivationalVoice(insight, language);
    if (voice) playAudioBase64(voice);
    setIsAiTyping(false);
  };

  const handleChat = async () => {
    if (!chatInput.trim() || !user) return;
    const msg = chatInput;
    setChatMessages(p => [...p, { role: 'user', text: msg }]);
    setChatInput('');
    setIsAiTyping(true);
    const reply = await getDostAiResponse(msg, user);
    setChatMessages(p => [...p, { role: 'ai', text: reply }]);
    setIsAiTyping(false);
  };

  const handleHospitalSearch = async () => {
    setShowDostAi(true);
    setChatMessages([{ role: 'ai', text: t.findingHospitals }]);
    setIsAiTyping(true);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(async (pos) => {
        const results = await getNearbyHospitals(pos.coords.latitude, pos.coords.longitude, language);
        setChatMessages(p => [...p, { role: 'ai', text: results }]);
        setIsAiTyping(false);
      }, () => {
        setChatMessages(p => [...p, { role: 'ai', text: "Please enable GPS to find hospitals." }]);
        setIsAiTyping(false);
      });
    }
  };

  const addTestGuardian = () => {
    if (!user) return;
    const contact: EmergencyContact = {
      id: Date.now().toString(),
      name: "Emergency Guardian",
      phone: "112",
      relation: "Security"
    };
    const updated = { ...user, contacts: [contact] };
    setUser(updated);
    firebaseService.saveLocalProfile(updated);
    alert("Guardian Added!");
  };

  if (!user) return (
    <div className="max-w-md mx-auto h-screen bg-slate-950 text-white p-8 flex flex-col justify-center animate-fade-in">
      <div className="flex items-center gap-3 mb-10">
        <div className="text-purple-500 scale-125"><ICONS.ShieldCheck /></div>
        <h1 className="text-4xl font-black italic tracking-tighter">ZindaHu AI</h1>
      </div>
      
      {regStep === 1 ? (
        <div className="space-y-4 animate-slide-up">
          <input value={regName} onChange={e => setRegName(e.target.value)} placeholder={t.nameLabel} className="w-full p-5 bg-white/5 border border-white/10 rounded-3xl font-bold" />
          <div className="grid grid-cols-2 gap-4">
            <input value={regAge} onChange={e => setRegAge(e.target.value)} placeholder={t.ageLabel} type="number" className="p-5 bg-white/5 border border-white/10 rounded-3xl font-bold" />
            <select value={regBlood} onChange={e => setRegBlood(e.target.value as BloodGroup)} className="p-5 bg-white/5 border border-white/10 rounded-3xl font-bold appearance-none">
              {BLOOD_GROUPS.map(bg => <option key={bg} value={bg}>{bg}</option>)}
            </select>
          </div>
          <input value={regPhone} onChange={e => setRegPhone(e.target.value)} placeholder={t.phoneLabel} className="w-full p-5 bg-white/5 border border-white/10 rounded-3xl font-bold" />
          <textarea value={regMedical} onChange={e => setRegMedical(e.target.value)} placeholder={t.medicalLabel} className="w-full p-5 bg-white/5 border border-white/10 rounded-3xl font-bold h-24" />
          
          <div className="flex flex-wrap gap-2 py-2">
            {LANGUAGES_SUPPORTED.map(l => (
              <button key={l.code} onClick={() => setLanguage(l.code as Language)} className={`px-4 py-2 rounded-full text-[10px] font-black uppercase transition-all ${language === l.code ? 'bg-purple-600 text-white shadow-lg' : 'bg-white/5 text-white/50'}`}>
                {l.label}
              </button>
            ))}
          </div>
          
          <button onClick={() => setRegStep(2)} className="w-full bg-purple-600 py-6 mt-4 rounded-[2rem] font-black text-xl shadow-2xl active:scale-95 transition-transform">INITIALIZE SHIELD</button>
        </div>
      ) : (
        <div className="flex flex-col items-center">
          <div onMouseDown={() => startScan(false)} onMouseUp={() => {setIsScanning(false); clearInterval(scanTimerRef.current!)}} onTouchStart={() => startScan(false)} onTouchEnd={() => {setIsScanning(false); clearInterval(scanTimerRef.current!)}} className={`w-72 h-72 rounded-full border-4 flex flex-col items-center justify-center transition-all ${isScanning ? 'border-purple-500 bg-purple-500/10 alive-btn-pulse' : 'border-white/10'}`}>
            <ICONS.Fingerprint />
            <p className="mt-4 text-[10px] font-black uppercase tracking-widest">{isScanning ? `${scanProgress}% SYNCING` : 'HOLD TO SYNC'}</p>
          </div>
          <button onClick={() => setRegStep(1)} className="mt-16 text-slate-500 font-bold uppercase text-xs">Edit Information</button>
        </div>
      )}
    </div>
  );

  return (
    <div className={`max-w-md mx-auto min-h-screen bg-slate-50 flex flex-col relative overflow-hidden ${status === SafetyStatus.EMERGENCY ? 'sos-active-bg' : ''}`}>
      <header className="p-6 bg-white flex justify-between items-center border-b sticky top-0 z-[100] shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-900 text-white rounded-xl shadow-lg"><ICONS.Heart /></div>
          <h2 className="text-xl font-black italic tracking-tighter uppercase">{t.appName}</h2>
        </div>
        <button onClick={() => setShowSettings(true)} className="p-3 bg-slate-100 rounded-2xl active:scale-90 transition-transform"><ICONS.Settings /></button>
      </header>

      <main className="flex-grow p-6 space-y-6 overflow-y-auto custom-scrollbar">
        <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden">
           <span className="text-[10px] font-black text-purple-400 uppercase tracking-widest block mb-2">{t.morningCourage}</span>
           <p className="text-xl font-bold italic leading-relaxed relative z-10 animate-fade-in">"{aiInsight || "Dost, aaj zinda rehne ki wajah dhoondo."}"</p>
           {isAiTyping && <div className="absolute top-4 right-4 animate-pulse w-3 h-3 rounded-full bg-purple-500 shadow-lg"></div>}
           <div className="absolute bottom-[-20%] right-[-10%] opacity-10 scale-150 rotate-12"><ICONS.ShieldCheck /></div>
        </div>

        <div className={`p-10 rounded-[3rem] text-white shadow-2xl transition-all duration-500 ${status === SafetyStatus.SAFE ? 'bg-slate-900' : status === SafetyStatus.ATTENTION ? 'bg-orange-500' : 'bg-red-600'}`}>
           <h3 className="text-5xl font-black italic tracking-tighter mb-8">{status === SafetyStatus.SAFE ? t.safe : t.attention}</h3>
           <div className="bg-white/5 p-8 rounded-[2.5rem] border border-white/10 text-center backdrop-blur-sm">
              <p className="text-6xl font-black tabular-nums tracking-tighter text-purple-400">{timeRemaining}</p>
              <p className="text-[10px] font-bold uppercase opacity-40 mt-2 tracking-widest">Next Check-In Protocol</p>
           </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
           <button onClick={() => { setShowDostAi(true); setChatMessages([]); }} className="bg-purple-600 text-white p-6 rounded-[2.5rem] flex flex-col items-center gap-2 shadow-xl active:scale-95 transition-transform">
              <ICONS.Robot /><span className="text-[11px] font-black uppercase tracking-widest">{t.dostAi}</span>
           </button>
           <button onClick={handleHospitalSearch} className="bg-white p-6 rounded-[2.5rem] border flex flex-col items-center gap-2 shadow-sm active:scale-95 transition-transform">
              <ICONS.Map /><span className="text-[11px] font-black uppercase text-slate-400 tracking-widest">Help Search</span>
           </button>
        </div>

        <div className="flex flex-col items-center py-10">
           <button 
             onMouseDown={() => startScan(true)} 
             onMouseUp={() => {setIsScanning(false); clearInterval(scanTimerRef.current!)}} 
             onTouchStart={() => startScan(true)} 
             onTouchEnd={() => {setIsScanning(false); clearInterval(scanTimerRef.current!)}} 
             className={`w-64 h-64 rounded-full bg-white border-[18px] shadow-2xl flex items-center justify-center transition-all duration-300 ${isScanning ? 'border-purple-600 alive-btn-pulse scale-110' : 'border-slate-100 hover:scale-105'}`}
           >
              <span className={`text-2xl font-black uppercase tracking-tighter ${isScanning ? 'text-purple-600' : 'text-green-600'}`}>
                {isScanning ? `${scanProgress}%` : t.imAlive}
              </span>
           </button>
           <p className="mt-8 text-[11px] font-black text-slate-400 uppercase tracking-widest animate-pulse">{t.holdToScan}</p>
        </div>
      </main>

      <footer className="p-6 pb-12 bg-white border-t sticky bottom-0 z-[100] shadow-2xl">
         <button onClick={triggerSOS} className="w-full bg-red-600 text-white py-8 rounded-[3rem] font-black text-4xl shadow-2xl active:scale-95 transition-transform uppercase tracking-tighter">SOS PANIC</button>
      </footer>

      {/* Dost AI Modal */}
      {showDostAi && (
        <div className="fixed inset-0 z-[10000] bg-slate-950 flex flex-col animate-fade-in">
           <header className="p-6 bg-slate-900 text-white flex justify-between items-center border-b border-white/5">
              <div className="flex items-center gap-3"><ICONS.Robot /><h2 className="text-xl font-black uppercase tracking-tighter">{t.dostAi}</h2></div>
              <button onClick={() => setShowDostAi(false)} className="p-3 bg-white/5 rounded-full"><ICONS.Close /></button>
           </header>
           <div className="flex-grow overflow-y-auto p-6 space-y-4 custom-scrollbar">
              {chatMessages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-slide-up`}>
                   <div className={`max-w-[85%] p-5 rounded-[2.5rem] font-bold text-sm shadow-xl whitespace-pre-wrap ${m.role === 'user' ? 'bg-purple-600 text-white rounded-tr-none' : 'bg-slate-900 text-slate-200 border border-white/5 rounded-tl-none'}`}>{m.text}</div>
                </div>
              ))}
              <div ref={chatEndRef} />
              {isAiTyping && <div className="p-4 flex gap-2"><div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"></div><div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce delay-100"></div><div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce delay-200"></div></div>}
           </div>
           <div className="p-6 bg-slate-900 border-t border-white/5 flex gap-2 pb-12 shadow-2xl">
              <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleChat()} placeholder="Ask me anything..." className="flex-grow bg-white/5 p-5 rounded-3xl text-white font-bold outline-none text-sm focus:bg-white/10 transition-all" />
              <button onClick={handleChat} className="p-5 bg-purple-600 text-white rounded-3xl shadow-xl active:scale-90 transition-all"><ICONS.Send /></button>
           </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-[15000] bg-white flex flex-col animate-slide-up overflow-y-auto">
          <header className="p-6 border-b flex justify-between items-center bg-slate-50 sticky top-0 z-10">
            <h2 className="text-2xl font-black tracking-tighter italic uppercase">{t.settings}</h2>
            <button onClick={() => setShowSettings(false)} className="p-3 bg-white border rounded-full shadow-sm"><ICONS.Close /></button>
          </header>
          <div className="p-8 space-y-6">
             <div className="bg-slate-900 text-white p-8 rounded-[3rem] shadow-xl relative overflow-hidden">
                <span className="text-[10px] font-black text-purple-400 uppercase tracking-widest">{user.initialSoulAge}</span>
                <h3 className="text-3xl font-black tracking-tighter">{user.name}</h3>
                <p className="text-xl font-bold mt-4">~{user.predictedDays} Days Left</p>
                <div className="absolute top-[-10%] right-[-10%] opacity-10 scale-150"><ICONS.Fingerprint /></div>
             </div>
             
             <div className="space-y-4">
                <p className="font-black text-xs uppercase tracking-widest text-slate-400 px-4">Emergency Protocol</p>
                <button onClick={addTestGuardian} className="w-full p-6 bg-purple-50 text-purple-600 rounded-[2rem] font-black uppercase text-xs flex items-center justify-between shadow-sm active:bg-purple-100 transition-colors">
                  Setup Test Guardian <ICONS.Plus />
                </button>
                <button onClick={() => { localStorage.clear(); window.location.reload(); }} className="w-full p-6 bg-red-50 text-red-600 rounded-[2rem] font-black uppercase text-xs tracking-widest active:bg-red-100 transition-colors">Reset Entire Profile</button>
             </div>
             
             <div className="bg-slate-50 p-6 rounded-[2rem] border">
                <p className="text-[10px] font-black text-slate-400 uppercase mb-4 tracking-widest">Current Guardians</p>
                {user.contacts.length === 0 ? (
                  <p className="text-xs font-bold text-slate-300 italic text-center py-4 uppercase">No contacts saved</p>
                ) : (
                  user.contacts.map(c => (
                    <div key={c.id} className="flex justify-between items-center p-4 bg-white rounded-2xl mb-2 shadow-sm">
                      <div><p className="font-black text-sm uppercase">{c.name}</p><p className="text-[10px] font-bold text-slate-400 uppercase">{c.relation}</p></div>
                      <p className="font-bold text-xs">{c.phone}</p>
                    </div>
                  ))
                )}
             </div>
          </div>
        </div>
      )}

      {/* SOS EMERGENCY SCREEN */}
      {status === SafetyStatus.EMERGENCY && (
        <div className="fixed inset-0 z-[20000] flex flex-col p-8 text-white animate-fade-in">
           <div className="flex-grow flex flex-col items-center justify-center text-center space-y-10">
              <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center text-red-600 shadow-2xl animate-pulse"><ICONS.Alert /></div>
              <h1 className="text-8xl font-black uppercase tracking-tighter italic">SOS</h1>
              <div className="bg-black/80 backdrop-blur-3xl rounded-[4rem] p-10 w-full text-left space-y-8 border border-white/20 shadow-2xl animate-slide-up">
                 <div>
                    <p className="text-xs font-black uppercase opacity-60 tracking-widest text-red-400 mb-2">Emergency Rescue Context</p>
                    <p className="text-5xl font-black tracking-tighter">{user.name}</p>
                 </div>
                 <div className="flex justify-between items-center border-t border-white/10 pt-8">
                    <div><p className="text-xs opacity-40 uppercase font-black tracking-widest mb-1">Blood</p><p className="text-4xl font-black text-red-400">{user.bloodGroup}</p></div>
                    <div className="text-right"><p className="text-xs opacity-40 uppercase font-black tracking-widest mb-1">Status</p><p className="text-sm font-bold bg-red-600 px-3 py-1 rounded-full uppercase">Transmitting</p></div>
                 </div>
                 <div className="pt-2">
                   <button 
                     onClick={callGuardian}
                     className="w-full bg-green-500 hover:bg-green-600 text-white py-8 rounded-[3rem] flex items-center justify-center gap-4 font-black text-2xl shadow-xl active:scale-95 transition-all"
                   >
                     <ICONS.Heart /> CALL GUARDIAN
                   </button>
                   {sosCallError && <div className="mt-4 p-4 bg-red-900/50 border border-red-500/50 rounded-2xl text-[10px] font-black text-center text-red-100 animate-pulse">⚠️ {sosCallError}</div>}
                 </div>
              </div>
           </div>
           <div className="space-y-4 pt-10 pb-12">
             <button onClick={() => window.location.href="tel:112"} className="w-full bg-white text-red-600 py-8 rounded-[3rem] font-black text-3xl shadow-2xl active:bg-slate-100 transition-colors uppercase italic">POLICE 112</button>
             <button onClick={() => setStatus(SafetyStatus.SAFE)} className="w-full py-6 text-white/50 font-black uppercase text-xs tracking-[0.3em] active:text-white transition-colors">Cancel Protocol</button>
           </div>
        </div>
      )}
    </div>
  );
}
