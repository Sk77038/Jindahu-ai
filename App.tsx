
import React, { useState, useEffect, useRef } from 'react';
import { UserProfile, Language, SafetyStatus, EmergencyContact, BloodGroup, SafetyConfig } from './types';
import { TRANSLATIONS, ICONS, GOVT_HELPLINES, LANGUAGES_SUPPORTED, BLOOD_GROUPS } from './constants';
import { firebaseService } from './services/firebaseService';
import { 
  getSafetyInsight, 
  getSoulAnalysis, 
  getNearbyHospitals, 
  getDostAiResponse,
  getMotivationalVoice,
} from './services/geminiService';

// --- Helpers ---
function decodeBase64(base64: string) {
  try {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
    return bytes;
  } catch (e) { return new Uint8Array(0); }
}

async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
  }
  return buffer;
}

const DEFAULT_CONFIG: SafetyConfig = {
  autoPanicOnLowBattery: true,
  shakeToEmergency: false,
  silentSiren: false,
  checkInIntervalHours: 24
};

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [language, setLanguage] = useState<Language>(Language.EN);
  const [status, setStatus] = useState<SafetyStatus>(SafetyStatus.SAFE);
  const [timeRemaining, setTimeRemaining] = useState<string>('24:00:00');
  const [aiInsight, setAiInsight] = useState<string>('');
  
  // Registration States
  const [regStep, setRegStep] = useState(1);
  const [regName, setRegName] = useState('');
  const [regAge, setRegAge] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regBlood, setRegBlood] = useState<BloodGroup>('Unknown');
  const [regMedical, setRegMedical] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);

  // Nav
  const [showSettings, setShowSettings] = useState(false);
  const [showDostAi, setShowDostAi] = useState(false);
  const [chatMessages, setChatMessages] = useState<{role: 'user' | 'ai', text: string}[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isAiTyping, setIsAiTyping] = useState(false);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const scanTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
      const freq = user.config?.checkInIntervalHours || 24;
      const diff = (user.lastCheckIn + (freq * 3600000)) - Date.now();
      if (diff <= 0) { 
        setStatus(SafetyStatus.ATTENTION); 
        setTimeRemaining('00:00:00'); 
      } else {
        const h = Math.floor(diff / 3600000).toString().padStart(2, '0');
        const m = Math.floor((diff % 3600000) / 60000).toString().padStart(2, '0');
        const s = Math.floor((diff % 60000) / 1000).toString().padStart(2, '0');
        setTimeRemaining(`${h}:${m}:${s}`);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [user]);

  const vibrate = (p: number | number[]) => { if ('vibrate' in navigator) navigator.vibrate(p); };

  const playVoice = async (base64: string) => {
    try {
      if (!audioContextRef.current) audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const bytes = decodeBase64(base64);
      if (bytes.length === 0) return;
      const buffer = await decodeAudioData(bytes, audioContextRef.current, 24000, 1);
      const source = audioContextRef.current.createBufferSource();
      source.buffer = buffer;
      source.connect(audioContextRef.current.destination);
      source.start();
    } catch (e) { console.error("Audio playback error", e); }
  };

  const startScan = (isDaily: boolean) => {
    setIsScanning(true);
    setScanProgress(0);
    vibrate(50);
    scanTimerRef.current = setInterval(() => {
      setScanProgress(p => {
        if (p >= 100) {
          if (scanTimerRef.current) clearInterval(scanTimerRef.current);
          isDaily ? finishCheckIn() : finishRegistration();
          return 100;
        }
        if (p % 25 === 0) vibrate(15);
        return p + 5;
      });
    }, 50);
  };

  const finishRegistration = async () => {
    setIsAiTyping(true);
    const analysis = await getSoulAnalysis(regName, language, regAge, regMedical);
    const newUser: UserProfile = {
      name: regName, age: regAge, phone: regPhone, bloodGroup: regBlood,
      medicalConditions: regMedical, hobbies: [], checkInHour: 9,
      lastCheckIn: Date.now(), contacts: [], language,
      registrationDate: Date.now(), initialSoulAge: analysis.soulAge,
      predictedDays: analysis.predictedDays,
      config: DEFAULT_CONFIG
    };
    setUser(newUser);
    firebaseService.saveLocalProfile(newUser);
    setIsScanning(false);
    setIsAiTyping(false);
    vibrate([100, 50, 100]);
  };

  const finishCheckIn = async () => {
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
    const voiceData = await getMotivationalVoice(insight, language);
    if (voiceData) playVoice(voiceData);
    setIsAiTyping(false);
  };

  const handleDostChat = async () => {
    if (!chatInput.trim() || !user) return;
    const userMsg = chatInput;
    setChatMessages(p => [...p, { role: 'user', text: userMsg }]);
    setChatInput('');
    setIsAiTyping(true);
    vibrate(20);
    const aiRes = await getDostAiResponse(userMsg, null, user);
    setChatMessages(p => [...p, { role: 'ai', text: aiRes }]);
    setIsAiTyping(false);
  };

  if (!user) return (
    <div className="max-w-md mx-auto h-screen bg-slate-950 text-white p-8 flex flex-col justify-center animate-fade-in">
      <div className="flex items-center gap-3 mb-10"><div className="text-purple-500 scale-125"><ICONS.ShieldCheck /></div><h1 className="text-4xl font-black">ZindaHu AI</h1></div>
      
      {regStep === 1 ? (
        <div className="space-y-4 animate-slide-up">
          <input value={regName} onChange={e => setRegName(e.target.value)} placeholder={t.nameLabel} className="w-full p-5 bg-white/5 border border-white/10 rounded-3xl font-bold outline-none" />
          <div className="grid grid-cols-2 gap-4">
            <input value={regAge} onChange={e => setRegAge(e.target.value)} placeholder={t.ageLabel} type="number" className="p-5 bg-white/5 border border-white/10 rounded-3xl font-bold" />
            <select value={regBlood} onChange={e => setRegBlood(e.target.value as BloodGroup)} className="p-5 bg-white/5 border border-white/10 rounded-3xl font-bold">
              {BLOOD_GROUPS.map(bg => <option key={bg} value={bg}>{bg}</option>)}
            </select>
          </div>
          <input value={regPhone} onChange={e => setRegPhone(e.target.value)} placeholder={t.phoneLabel} className="w-full p-5 bg-white/5 border border-white/10 rounded-3xl font-bold" />
          <textarea value={regMedical} onChange={e => setRegMedical(e.target.value)} placeholder={t.medicalLabel} className="w-full p-5 bg-white/5 border border-white/10 rounded-3xl font-bold h-24" />
          
          <div className="flex flex-wrap gap-2 pt-2">
             {LANGUAGES_SUPPORTED.map(l => (
               <button key={l.code} onClick={() => setLanguage(l.code as Language)} className={`px-4 py-2 rounded-full text-[10px] font-black uppercase ${language === l.code ? 'bg-purple-600' : 'bg-white/5'}`}>{l.label}</button>
             ))}
          </div>

          <button onClick={() => setRegStep(2)} className="w-full bg-purple-600 py-6 mt-4 rounded-3xl font-black text-xl shadow-2xl active:scale-95 transition-all">NEXT</button>
        </div>
      ) : (
        <div className="flex flex-col items-center">
          <div 
            onMouseDown={() => startScan(false)} onMouseUp={() => {setIsScanning(false); clearInterval(scanTimerRef.current!)}}
            onTouchStart={() => startScan(false)} onTouchEnd={() => {setIsScanning(false); clearInterval(scanTimerRef.current!)}}
            className={`w-64 h-64 rounded-full border-4 flex flex-col items-center justify-center transition-all ${isScanning ? 'border-purple-500 bg-purple-500/10 scale-105 alive-btn-pulse' : 'border-white/10 text-white/20'}`}
          >
            <ICONS.Fingerprint />
            <p className="mt-4 text-[10px] font-black uppercase">{isScanning ? `${scanProgress}%` : t.holdToScan}</p>
          </div>
          <button onClick={() => setRegStep(1)} className="mt-12 text-slate-500 font-bold uppercase text-xs">Back</button>
        </div>
      )}
    </div>
  );

  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 flex flex-col relative overflow-hidden">
      {/* Header */}
      <header className="p-6 bg-white flex justify-between items-center border-b sticky top-0 z-[100] shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-900 text-white rounded-xl"><ICONS.Heart /></div>
          <h2 className="text-xl font-black italic">{t.appName}</h2>
        </div>
        <button onClick={() => setShowSettings(true)} className="p-3 bg-slate-100 rounded-2xl"><ICONS.Settings /></button>
      </header>

      <main className="flex-grow p-6 space-y-6 overflow-y-auto">
        {/* Shayari Card */}
        <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden">
           <span className="text-[10px] font-black text-purple-400 uppercase tracking-widest block mb-2">{t.morningCourage}</span>
           <p className="text-xl font-bold italic leading-relaxed">
             "{aiInsight || "Dost, sync karo aur apna din shuru karo."}"
           </p>
           {isAiTyping && <div className="absolute top-4 right-4 animate-pulse w-2 h-2 rounded-full bg-purple-500"></div>}
        </div>

        {/* Action Grid */}
        <div className="grid grid-cols-2 gap-4">
           <button onClick={() => setShowDostAi(true)} className="bg-purple-600 text-white p-6 rounded-[2rem] flex flex-col items-center gap-2 shadow-lg">
              <ICONS.Robot /><span className="text-[11px] font-black uppercase">{t.dostAi}</span>
           </button>
           <button onClick={() => { setShowDostAi(true); setChatMessages([{role:'ai', text: t.findingHospitals}]); }} className="bg-white p-6 rounded-[2rem] border flex flex-col items-center gap-2 shadow-sm">
              <ICONS.Map /><span className="text-[11px] font-black uppercase text-slate-500">Hospitals</span>
           </button>
        </div>

        {/* Status */}
        <div className={`p-8 rounded-[3rem] text-white shadow-xl ${status === SafetyStatus.SAFE ? 'bg-slate-900' : 'bg-red-600 status-alert-pulse'}`}>
           <h3 className="text-4xl font-black italic mb-6">{status === SafetyStatus.SAFE ? t.safe : t.attention}</h3>
           <div className="bg-white/5 p-6 rounded-3xl border border-white/10 text-center">
              <p className="text-5xl font-black tabular-nums tracking-tighter text-purple-400">{timeRemaining}</p>
           </div>
        </div>

        {/* Sync Button */}
        <div className="flex flex-col items-center py-10">
           <button 
             onMouseDown={() => startScan(true)} onMouseUp={() => {setIsScanning(false); clearInterval(scanTimerRef.current!)}}
             onTouchStart={() => startScan(true)} onTouchEnd={() => {setIsScanning(false); clearInterval(scanTimerRef.current!)}}
             className={`w-64 h-64 rounded-full bg-white border-[16px] shadow-2xl flex items-center justify-center p-8 transition-all duration-300 ${isScanning ? 'border-purple-600 alive-btn-pulse scale-105' : 'border-slate-100'}`}
           >
              <span className={`text-2xl font-black text-center uppercase ${isScanning ? 'text-purple-600' : 'text-green-600'}`}>
                {isScanning ? `${scanProgress}%` : t.imAlive}
              </span>
           </button>
           <p className="mt-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.holdToScan}</p>
        </div>
      </main>

      <footer className="p-6 pb-10 bg-white border-t sticky bottom-0 z-[100]">
         <button onClick={() => setStatus(SafetyStatus.EMERGENCY)} className="w-full bg-red-600 text-white py-6 rounded-[2.5rem] font-black text-3xl shadow-2xl active:scale-95 uppercase">{t.panic}</button>
      </footer>

      {/* Settings Dashboard */}
      {showSettings && (
        <div className="fixed inset-0 z-[15000] bg-white flex flex-col animate-slide-up">
          <header className="p-6 border-b flex justify-between items-center">
            <h2 className="text-2xl font-black italic">{t.settings}</h2>
            <button onClick={() => setShowSettings(false)} className="p-3 bg-slate-100 rounded-full"><ICONS.Close /></button>
          </header>
          <div className="p-6 space-y-4">
             <div className="bg-slate-900 text-white p-6 rounded-3xl">
                <p className="text-xs font-bold text-purple-400 uppercase">{user.initialSoulAge}</p>
                <h3 className="text-2xl font-black">{user.name}</h3>
                <p className="text-xs opacity-50 mt-2">Days Remaining: ~{user.predictedDays}</p>
             </div>
             <button onClick={() => { localStorage.clear(); window.location.reload(); }} className="w-full p-6 bg-red-50 text-red-600 rounded-3xl font-black uppercase text-xs">{t.signOut}</button>
          </div>
        </div>
      )}

      {/* Dost AI Chat Window */}
      {showDostAi && (
        <div className="fixed inset-0 z-[10000] bg-slate-950 flex flex-col animate-fade-in">
           <header className="p-6 bg-slate-900 text-white flex justify-between items-center border-b border-white/5 shadow-xl">
              <div className="flex items-center gap-3">
                <div className="text-purple-500 scale-110"><ICONS.Robot /></div>
                <h2 className="text-xl font-black uppercase tracking-tighter">{t.dostAi}</h2>
              </div>
              <button onClick={() => setShowDostAi(false)} className="p-3 bg-white/5 rounded-full"><ICONS.Close /></button>
           </header>
           <div className="flex-grow overflow-y-auto p-6 space-y-4">
              {chatMessages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                   <div className={`max-w-[85%] p-5 rounded-[2rem] font-bold text-sm ${m.role === 'user' ? 'bg-purple-600 text-white rounded-tr-none' : 'bg-slate-900 text-slate-200 border border-white/5 rounded-tl-none'}`}>
                      {m.text}
                   </div>
                </div>
              ))}
              {isAiTyping && <div className="flex gap-2 p-4"><div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"></div><div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce delay-100"></div><div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce delay-200"></div></div>}
           </div>
           <div className="p-6 bg-slate-900 border-t border-white/5 flex gap-2 pb-10">
              <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleDostChat()} placeholder="Apne dost se baat karein..." className="flex-grow bg-white/5 p-5 rounded-3xl text-white font-bold outline-none text-sm" />
              <button onClick={handleDostChat} className="p-5 bg-purple-600 text-white rounded-3xl shadow-xl"><ICONS.Send /></button>
           </div>
        </div>
      )}

      {/* Emergency Overlays (Same as previous, omitted for brevity but conceptually part of the bridge) */}
      {status === SafetyStatus.EMERGENCY && (
        <div className="fixed inset-0 z-[20000] sos-bg-strobe flex flex-col p-8 text-white">
           <div className="flex-grow flex flex-col items-center justify-center text-center space-y-8">
              <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center text-red-600 shadow-2xl animate-pulse"><ICONS.Alert /></div>
              <h1 className="text-6xl font-black uppercase">SOS</h1>
              <div className="bg-black/40 backdrop-blur-xl rounded-3xl p-6 w-full text-left space-y-2">
                 <p className="text-xs font-black uppercase opacity-60">Medical Profile</p>
                 <p className="text-2xl font-black">{user.name}</p>
                 <p className="text-xl font-bold text-red-400">Blood: {user.bloodGroup}</p>
              </div>
           </div>
           <button onClick={() => setStatus(SafetyStatus.SAFE)} className="w-full py-6 text-white/50 font-black uppercase text-xs">Dismiss Alert</button>
        </div>
      )}
    </div>
  );
}
