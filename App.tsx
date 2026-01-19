
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
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
  return bytes;
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

  // Settings & Navigation
  const [showSettings, setShowSettings] = useState(false);
  const [showLegal, setShowLegal] = useState<'none' | 'terms' | 'privacy' | 'about'>('none');
  const [showGuardians, setShowGuardians] = useState(false);
  const [showGovt, setShowGovt] = useState(false);

  // Contact States
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [newContactRelation, setNewContactRelation] = useState('');

  // Audio Ref
  const audioContextRef = useRef<AudioContext | null>(null);

  // Dost AI
  const [showDostAi, setShowDostAi] = useState(false);
  const [chatMessages, setChatMessages] = useState<{role: 'user' | 'ai', text: string}[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isAiTyping, setIsAiTyping] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const scanTimerRef = useRef<NodeJS.Timeout | null>(null);
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
      if (!audioContextRef.current) audioContextRef.current = new AudioContext({ sampleRate: 24000 });
      const bytes = decodeBase64(base64);
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
          clearInterval(scanTimerRef.current!);
          isDaily ? finishCheckIn() : finishRegistration();
          return 100;
        }
        if (p % 25 === 0) vibrate(15);
        return p + 5;
      });
    }, 50);
  };

  const finishRegistration = async () => {
    vibrate([100, 50, 100]);
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
  };

  const finishCheckIn = async () => {
    if (!user) return;
    const updated = { ...user, lastCheckIn: Date.now() };
    setUser(updated);
    firebaseService.saveLocalProfile(updated);
    setStatus(SafetyStatus.SAFE);
    setIsScanning(false);
    
    const insight = await getSafetyInsight(updated);
    setAiInsight(insight);
    localStorage.setItem('last_insight', insight);

    const voiceData = await getMotivationalVoice(insight, language);
    if (voiceData) playVoice(voiceData);
  };

  const replayShayari = async () => {
    if (!aiInsight) return;
    vibrate(20);
    const voiceData = await getMotivationalVoice(aiInsight, language);
    if (voiceData) playVoice(voiceData);
  };

  const updateConfig = (key: keyof SafetyConfig, val: any) => {
    if (!user) return;
    const updated = { ...user, config: { ...user.config, [key]: val } };
    setUser(updated);
    firebaseService.saveLocalProfile(updated);
  };

  const addContact = () => {
    if (!user || !newContactName || !newContactPhone) return;
    const contact: EmergencyContact = {
      id: Date.now().toString(),
      name: newContactName,
      phone: newContactPhone,
      relation: newContactRelation
    };
    const updated = { ...user, contacts: [...user.contacts, contact] };
    setUser(updated);
    firebaseService.saveLocalProfile(updated);
    setNewContactName('');
    setNewContactPhone('');
    setNewContactRelation('');
    vibrate(30);
  };

  const removeContact = (id: string) => {
    if (!user) return;
    const updated = { ...user, contacts: user.contacts.filter(c => c.id !== id) };
    setUser(updated);
    firebaseService.saveLocalProfile(updated);
    vibrate(10);
  };

  const handleDostChat = async () => {
    if (!chatInput.trim() && !canvasRef.current || !user) return;
    const userMsg = chatInput;
    setChatMessages(p => [...p, { role: 'user', text: userMsg }]);
    setChatInput('');
    setIsAiTyping(true);
    vibrate(20);

    let frame = null;
    if (showDostAi && videoRef.current && canvasRef.current) {
       const ctx = canvasRef.current.getContext('2d');
       canvasRef.current.width = videoRef.current.videoWidth;
       canvasRef.current.height = videoRef.current.videoHeight;
       ctx?.drawImage(videoRef.current, 0, 0);
       frame = canvasRef.current.toDataURL('image/jpeg', 0.5).split(',')[1];
    }

    const aiRes = await getDostAiResponse(userMsg, frame, user);
    setChatMessages(p => [...p, { role: 'ai', text: aiRes }]);
    setIsAiTyping(false);
    vibrate([30, 30]);
  };

  const findHospitals = () => {
    if (!navigator.geolocation) return;
    setShowDostAi(true);
    setChatMessages([{ role: 'ai', text: t.findingHospitals }]);
    setIsAiTyping(true);
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const results = await getNearbyHospitals(pos.coords.latitude, pos.coords.longitude, language);
      setChatMessages(p => [...p, { role: 'ai', text: results }]);
      setIsAiTyping(false);
    });
  };

  if (!user) return (
    <div className="max-w-md mx-auto h-screen bg-slate-950 text-white p-8 flex flex-col justify-center animate-fade-in overflow-y-auto">
      <div className="flex items-center gap-3 mb-12"><div className="text-purple-500 scale-125"><ICONS.ShieldCheck /></div><h1 className="text-4xl font-black tracking-tighter">ZindaHu AI</h1></div>
      
      {regStep === 1 ? (
        <div className="space-y-4 animate-slide-up">
          <p className="text-xs font-black text-slate-500 uppercase tracking-widest">{t.setupTitle}</p>
          <input value={regName} onChange={e => setRegName(e.target.value)} placeholder={t.nameLabel} className="w-full p-5 bg-white/5 border border-white/10 rounded-3xl font-bold outline-none" />
          <div className="grid grid-cols-2 gap-4">
            <input value={regAge} onChange={e => setRegAge(e.target.value)} placeholder={t.ageLabel} type="number" className="p-5 bg-white/5 border border-white/10 rounded-3xl font-bold outline-none" />
            <select value={regBlood} onChange={e => setRegBlood(e.target.value as BloodGroup)} className="p-5 bg-white/5 border border-white/10 rounded-3xl font-bold outline-none">
              {BLOOD_GROUPS.map(bg => <option key={bg} value={bg}>{bg}</option>)}
            </select>
          </div>
          <input value={regPhone} onChange={e => setRegPhone(e.target.value)} placeholder={t.phoneLabel} className="w-full p-5 bg-white/5 border border-white/10 rounded-3xl font-bold outline-none" />
          <textarea value={regMedical} onChange={e => setRegMedical(e.target.value)} placeholder={t.medicalLabel} className="w-full p-5 bg-white/5 border border-white/10 rounded-3xl font-bold outline-none h-24 resize-none" />
          
          <div className="pt-4 flex flex-wrap gap-2">
             {LANGUAGES_SUPPORTED.map(l => (
               <button key={l.code} onClick={() => setLanguage(l.code as Language)} className={`px-4 py-2 rounded-full text-[10px] font-black uppercase ${language === l.code ? 'bg-purple-600 text-white' : 'bg-white/5 text-slate-400'}`}>{l.label}</button>
             ))}
          </div>

          <button onClick={() => setRegStep(2)} className="w-full bg-purple-600 py-6 rounded-3xl font-black text-xl shadow-2xl active:scale-95 transition-all mt-6">NEXT</button>
        </div>
      ) : (
        <div className="flex flex-col items-center animate-fade-in">
          <div 
            onMouseDown={() => startScan(false)} onMouseUp={() => {setIsScanning(false); clearInterval(scanTimerRef.current!)}}
            onTouchStart={() => startScan(false)} onTouchEnd={() => {setIsScanning(false); clearInterval(scanTimerRef.current!)}}
            className={`w-64 h-64 rounded-full border-4 flex flex-col items-center justify-center transition-all ${isScanning ? 'border-purple-500 bg-purple-500/20 scale-105 shadow-2xl' : 'border-white/10 text-white/20'}`}
          >
            <ICONS.Fingerprint />
            <p className="mt-4 text-[10px] font-black uppercase">{isScanning ? `${scanProgress}%` : t.holdToScan}</p>
          </div>
          <button onClick={() => setRegStep(1)} className="mt-20 text-slate-500 font-black uppercase text-[10px]">Back to Registration</button>
        </div>
      )}
    </div>
  );

  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 flex flex-col relative overflow-hidden">
      
      {/* Header */}
      <header className="p-6 bg-white flex justify-between items-center border-b sticky top-0 z-[100] backdrop-blur-md bg-white/80">
        <div className="flex items-center gap-4">
          <div className="p-2 bg-slate-900 text-white rounded-xl"><ICONS.Heart /></div>
          <h2 className="text-xl font-black tracking-tighter">{t.appName}</h2>
        </div>
        <button onClick={() => setShowSettings(true)} className="p-3 bg-slate-100 rounded-2xl active:scale-90 transition-all">
          <ICONS.Settings />
        </button>
      </header>

      <main className="flex-grow p-6 space-y-6 overflow-y-auto custom-scrollbar">
        {/* Desi Shayari Ticker with Replay Voice Button */}
        <div className="bg-slate-900 p-8 rounded-[3rem] text-white shadow-2xl relative overflow-hidden group">
           <div className="flex justify-between items-center mb-4 relative z-10">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-purple-400 uppercase tracking-widest">{t.morningCourage}</span>
                <span className="bg-white/10 text-[8px] px-2 py-0.5 rounded-full font-black uppercase">{LANGUAGES_SUPPORTED.find(l => l.code === language)?.label}</span>
              </div>
              <button 
                onClick={replayShayari} 
                className="bg-purple-600/30 p-3 rounded-full hover:bg-purple-600/50 transition-all flex items-center justify-center active:scale-90 shadow-lg"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                </svg>
              </button>
           </div>
           <p className="text-xl font-bold italic leading-relaxed pr-2 relative z-10">
             "{aiInsight || (language === 'hi' ? "Bhai, kaise ho? Ek baar sync karo, fir mast shayari sunata hoon." : "Friend, sync now to hear a fresh courage shayari.")}"
           </p>
           <div className="absolute top-0 right-0 w-32 h-32 bg-purple-600/10 blur-[60px] rounded-full -mr-16 -mt-16"></div>
        </div>

        {/* Action Grid */}
        <div className="grid grid-cols-2 gap-4">
           <button onClick={() => { setShowDostAi(true); setChatMessages([]); }} className="bg-purple-600 text-white p-6 rounded-[3rem] flex flex-col items-center gap-2 shadow-xl active:scale-95 transition-all">
              <ICONS.Robot /><span className="text-[11px] font-black uppercase">{t.dostAi}</span>
           </button>
           <button onClick={findHospitals} className="bg-white p-6 rounded-[3rem] border flex flex-col items-center gap-2 shadow-sm active:scale-95 transition-all">
              <ICONS.Map /><span className="text-[11px] font-black uppercase text-slate-400">Hospitals</span>
           </button>
        </div>

        {/* Main Status Display */}
        <div className={`p-10 rounded-[4rem] shadow-2xl transition-all duration-500 ${status === SafetyStatus.SAFE ? 'bg-slate-900 text-white' : 'bg-orange-600 text-white'}`}>
           <p className="text-[10px] font-black opacity-40 uppercase tracking-widest mb-1">{t.status}</p>
           <h3 className="text-5xl font-black italic tracking-tighter mb-8">{status === SafetyStatus.SAFE ? t.safe : t.attention}</h3>
           <div className="bg-white/5 p-8 rounded-[3rem] border border-white/10 flex flex-col items-center backdrop-blur-sm">
              <p className="text-6xl font-black tracking-tighter tabular-nums text-purple-400">{timeRemaining}</p>
           </div>
        </div>

        {/* Sync Button */}
        <div className="flex flex-col items-center py-8">
           <button 
             onMouseDown={() => startScan(true)} onMouseUp={() => {setIsScanning(false); clearInterval(scanTimerRef.current!)}}
             onTouchStart={() => startScan(true)} onTouchEnd={() => {setIsScanning(false); clearInterval(scanTimerRef.current!)}}
             className={`w-64 h-64 rounded-full bg-white border-[20px] shadow-2xl flex flex-col items-center justify-center p-8 active:scale-90 transition-all duration-300 ${isScanning ? 'border-purple-500 alive-btn-pulse' : 'border-slate-100'}`}
           >
              <span className={`text-2xl font-black tracking-tighter text-center leading-tight uppercase transition-colors ${isScanning ? 'text-purple-600' : 'text-green-600'}`}>
                {isScanning ? `${scanProgress}%` : t.imAlive}
              </span>
           </button>
           <p className="mt-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.holdToScan}</p>
        </div>
      </main>

      {/* Footer Panic */}
      <footer className="p-6 pb-12 bg-white border-t sticky bottom-0 z-[100] backdrop-blur-md bg-white/80">
         <button onClick={() => setStatus(SafetyStatus.EMERGENCY)} className="w-full bg-red-600 text-white py-8 rounded-[3.5rem] font-black text-4xl shadow-2xl active:scale-95 uppercase tracking-tighter hover:bg-red-700 transition-colors">{t.panic}</button>
      </footer>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-[15000] bg-white flex flex-col animate-slide-up overflow-y-auto custom-scrollbar pb-24">
          <header className="p-6 border-b flex justify-between items-center sticky top-0 bg-white z-10">
            <h2 className="text-2xl font-black tracking-tighter uppercase">{t.settings}</h2>
            <button onClick={() => setShowSettings(false)} className="p-3 bg-slate-100 rounded-full"><ICONS.Close /></button>
          </header>

          <div className="p-6 space-y-8">
            {/* Profile Summary Card */}
            <div className="bg-slate-900 text-white p-8 rounded-[3rem] shadow-xl">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center font-black text-2xl uppercase">
                  {user.name[0]}
                </div>
                <div className="flex-grow">
                  <h3 className="text-xl font-bold">{user.name}</h3>
                  <p className="text-xs opacity-50 uppercase tracking-widest">{user.initialSoulAge}</p>
                </div>
                <button onClick={() => setShowLegal('about')} className="text-purple-400 font-black text-xs uppercase underline">About</button>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => setShowGuardians(true)} className="bg-purple-50 p-6 rounded-[2.5rem] border border-purple-100 flex flex-col items-center gap-2">
                <ICONS.User /><span className="text-[10px] font-black uppercase text-purple-700">{t.myGuardians}</span>
              </button>
              <button onClick={() => setShowGovt(true)} className="bg-slate-50 p-6 rounded-[2.5rem] border border-slate-100 flex flex-col items-center gap-2">
                <ICONS.ShieldCheck /><span className="text-[10px] font-black uppercase text-slate-700">{t.govtHelp}</span>
              </button>
            </div>

            {/* Safety Toggles */}
            <section className="space-y-4">
              <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-2">{t.advSafety}</h4>
              <div className="space-y-2">
                {[
                  { label: t.lowBatteryPanic, key: 'autoPanicOnLowBattery' },
                  { label: t.shakeToSOS, key: 'shakeToEmergency' },
                  { label: t.silentSiren, key: 'silentSiren' }
                ].map((item) => (
                  <div key={item.key} className="flex justify-between items-center bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                    <span className="font-bold text-sm text-slate-700">{item.label}</span>
                    <button 
                      onClick={() => updateConfig(item.key as keyof SafetyConfig, !user.config[item.key as keyof SafetyConfig])}
                      className={`w-14 h-8 rounded-full transition-all flex items-center p-1 ${user.config[item.key as keyof SafetyConfig] ? 'bg-purple-600' : 'bg-slate-300'}`}
                    >
                      <div className={`w-6 h-6 bg-white rounded-full shadow-md transition-all ${user.config[item.key as keyof SafetyConfig] ? 'translate-x-6' : 'translate-x-0'}`}></div>
                    </button>
                  </div>
                ))}
              </div>
            </section>

            {/* Legal Links */}
            <section className="space-y-2">
              <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-2">{t.legalHeading}</h4>
              <button onClick={() => setShowLegal('terms')} className="w-full text-left bg-white p-6 rounded-[2rem] border border-slate-100 font-bold text-sm shadow-sm">{t.termsConditions}</button>
              <button onClick={() => setShowLegal('privacy')} className="w-full text-left bg-white p-6 rounded-[2rem] border border-slate-100 font-bold text-sm shadow-sm">{t.privacyPolicy}</button>
            </section>

            <button onClick={() => { localStorage.clear(); window.location.reload(); }} className="w-full p-6 text-red-600 font-black uppercase text-[10px] tracking-widest">{t.signOut}</button>
          </div>
        </div>
      )}

      {/* Guardians Modal */}
      {showGuardians && (
        <div className="fixed inset-0 z-[16000] bg-white flex flex-col animate-slide-up p-8">
           <header className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-black uppercase tracking-tighter">{t.myGuardians}</h3>
              <button onClick={() => setShowGuardians(false)} className="p-3 bg-slate-100 rounded-full"><ICONS.Close /></button>
           </header>
           
           <div className="space-y-4 mb-8">
              <input value={newContactName} onChange={e => setNewContactName(e.target.value)} placeholder={t.nameLabel} className="w-full p-4 bg-slate-50 border rounded-2xl outline-none font-bold" />
              <input value={newContactPhone} onChange={e => setNewContactPhone(e.target.value)} placeholder={t.phoneLabel} className="w-full p-4 bg-slate-50 border rounded-2xl outline-none font-bold" />
              <input value={newContactRelation} onChange={e => setNewContactRelation(e.target.value)} placeholder={t.relationLabel} className="w-full p-4 bg-slate-50 border rounded-2xl outline-none font-bold" />
              <button onClick={addContact} className="w-full bg-purple-600 text-white p-4 rounded-2xl font-black uppercase flex items-center justify-center gap-2"><ICONS.Plus /> {t.saveContact}</button>
           </div>

           <div className="flex-grow overflow-y-auto space-y-3 custom-scrollbar">
              {user.contacts.map(c => (
                <div key={c.id} className="bg-slate-50 p-6 rounded-3xl flex justify-between items-center border">
                   <div>
                      <p className="font-black text-lg">{c.name}</p>
                      <p className="text-xs text-slate-400 font-bold uppercase">{c.relation} • {c.phone}</p>
                   </div>
                   <button onClick={() => removeContact(c.id)} className="p-3 text-red-500 bg-red-50 rounded-2xl"><ICONS.Trash /></button>
                </div>
              ))}
           </div>
        </div>
      )}

      {/* Govt Help Modal */}
      {showGovt && (
        <div className="fixed inset-0 z-[16000] bg-white flex flex-col animate-slide-up p-8">
           <header className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-black uppercase tracking-tighter">{t.govtHelp}</h3>
              <button onClick={() => setShowGovt(false)} className="p-3 bg-slate-100 rounded-full"><ICONS.Close /></button>
           </header>
           <div className="flex-grow overflow-y-auto space-y-3 custom-scrollbar">
              {GOVT_HELPLINES.map(h => (
                <button key={h.number} onClick={() => window.location.href=`tel:${h.number}`} className="w-full bg-slate-50 p-6 rounded-3xl flex items-center gap-5 border active:bg-slate-100">
                   <span className="text-3xl">{h.icon}</span>
                   <div className="text-left">
                      <p className="font-black text-lg">{h.name}</p>
                      <p className="text-purple-600 font-black text-xl">{h.number}</p>
                   </div>
                </button>
              ))}
           </div>
        </div>
      )}

      {/* Legal/About Modal */}
      {showLegal !== 'none' && (
        <div className="fixed inset-0 z-[20000] bg-white flex flex-col animate-slide-right p-8 overflow-y-auto custom-scrollbar">
           <header className="flex justify-between items-center mb-10 sticky top-0 bg-white py-2">
              <h3 className="text-2xl font-black uppercase tracking-tighter">
                {showLegal === 'terms' ? t.termsConditions : showLegal === 'privacy' ? t.privacyPolicy : t.aboutApp}
              </h3>
              <button onClick={() => setShowLegal('none')} className="p-3 bg-slate-100 rounded-full"><ICONS.Close /></button>
           </header>
           <div className="prose prose-slate">
              <p className="leading-relaxed text-lg font-bold text-slate-800 mb-6">
                {showLegal === 'terms' ? t.termsBody : showLegal === 'privacy' ? t.privacyBody : t.aboutBody}
              </p>
              <div className="bg-slate-50 p-6 rounded-3xl text-sm text-slate-600">
                <p>{t.legalBody}</p>
              </div>
           </div>
        </div>
      )}

      {/* SOS & Dost AI Modals (Maintain existing behavior) */}
      {showDostAi && (
        <div className="fixed inset-0 z-[10000] bg-slate-950 flex flex-col animate-fade-in">
           <header className="p-6 bg-slate-900 text-white flex justify-between items-center border-b border-white/5">
              <div className="flex items-center gap-3">
                <div className="text-purple-500"><ICONS.Robot /></div>
                <h2 className="text-xl font-black uppercase tracking-tighter">{t.dostAi}</h2>
              </div>
              <button onClick={() => setShowDostAi(false)} className="p-3 bg-white/5 rounded-full"><ICONS.Close /></button>
           </header>
           <div className="flex-grow overflow-y-auto p-6 space-y-4 custom-scrollbar">
              {chatMessages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                   <div className={`max-w-[85%] p-5 rounded-[2.5rem] font-bold text-sm shadow-xl ${m.role === 'user' ? 'bg-purple-600 text-white rounded-tr-none' : 'bg-slate-900 text-slate-200 border border-white/5 rounded-tl-none'}`}>
                      {m.text}
                   </div>
                </div>
              ))}
              {isAiTyping && <div className="flex gap-2 p-2"><div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"></div><div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce delay-100"></div><div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce delay-200"></div></div>}
           </div>
           <div className="p-6 bg-slate-900 border-t border-white/5 flex gap-2">
              <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleDostChat()} placeholder={language === 'hi' ? "Dost se poocho..." : "Ask your friend..."} className="flex-grow bg-white/5 p-4 rounded-3xl text-white font-bold outline-none" />
              <button onClick={handleDostChat} className="p-4 bg-purple-600 text-white rounded-3xl"><ICONS.Send /></button>
           </div>
        </div>
      )}

      {status === SafetyStatus.EMERGENCY && (
        <div className="fixed inset-0 z-[11000] sos-bg-strobe flex flex-col p-8 text-white animate-fade-in">
           <div className="flex-grow flex flex-col items-center justify-center text-center space-y-10">
              <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center text-red-600 shadow-2xl animate-pulse"><ICONS.Alert /></div>
              <h1 className="text-5xl font-black uppercase tracking-tighter">SOS ACTIVE</h1>
              <div className="w-full bg-black/40 backdrop-blur-xl rounded-[3rem] p-8 border border-white/20 text-left space-y-4 shadow-2xl animate-slide-up">
                 <p className="text-[10px] font-black uppercase tracking-widest text-red-400">{t.medicalBrief}</p>
                 <div className="grid grid-cols-2 gap-4">
                    <div><p className="text-xs opacity-50 uppercase">Name</p><p className="font-black text-xl uppercase">{user.name}</p></div>
                    <div><p className="text-xs opacity-50 uppercase">Blood Group</p><p className="font-black text-xl text-red-400">{user.bloodGroup}</p></div>
                 </div>
                 <p className="font-bold text-sm leading-tight mt-1">{user.medicalConditions || "No known issues"}</p>
              </div>
           </div>
           <div className="space-y-4 pt-10">
              {user.contacts.length > 0 && (
                <button onClick={() => window.location.href=`tel:${user.contacts[0].phone}`} className="w-full bg-white text-red-600 py-8 rounded-[3rem] font-black text-2xl shadow-2xl active:scale-95 transition-all">CALL {user.contacts[0].name.toUpperCase()}</button>
              )}
              <button onClick={() => window.location.href=`tel:112`} className="w-full bg-slate-900 text-white py-6 rounded-[3rem] font-black text-xl border border-white/20">CALL 112</button>
              <button onClick={() => setStatus(SafetyStatus.SAFE)} className="w-full py-4 text-white/50 font-black uppercase text-xs tracking-widest">I AM SAFE NOW</button>
           </div>
        </div>
      )}
    </div>
  );
}
