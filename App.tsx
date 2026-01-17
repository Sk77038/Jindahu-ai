
import React, { useState, useEffect, useCallback } from 'react';
import { UserProfile, Language, SafetyStatus, EmergencyContact } from './types';
import { TRANSLATIONS, ICONS } from './constants';
import { mockFirebase } from './services/mockFirebaseService';
import { getSafetyInsight } from './services/geminiService';

// --- Sub-components ---

const LanguageToggle: React.FC<{ lang: Language, setLang: (l: Language) => void }> = ({ lang, setLang }) => (
  <div className="flex bg-slate-200 rounded-lg p-1">
    <button 
      onClick={() => setLang(Language.EN)}
      className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${lang === Language.EN ? 'bg-white shadow-sm' : 'text-slate-500'}`}
    >
      ENG
    </button>
    <button 
      onClick={() => setLang(Language.HI)}
      className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${lang === Language.HI ? 'bg-white shadow-sm' : 'text-slate-500'}`}
    >
      हिन्दी
    </button>
  </div>
);

const SetupWizard: React.FC<{ onComplete: (profile: UserProfile) => void, language: Language }> = ({ onComplete, language }) => {
  const t = TRANSLATIONS[language];
  const [step, setStep] = useState(1);
  const [profile, setProfile] = useState<Partial<UserProfile>>({
    name: '',
    age: '',
    phone: '',
    checkInHour: 9,
    contacts: [],
    language: language
  });

  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');

  const handleAddContact = () => {
    if (contactName && contactPhone) {
      const newContact: EmergencyContact = {
        id: Math.random().toString(36).substr(2, 9),
        name: contactName,
        phone: contactPhone,
        relation: 'Family'
      };
      setProfile(prev => ({ ...prev, contacts: [...(prev.contacts || []), newContact] }));
      setContactName('');
      setContactPhone('');
    }
  };

  const handleFinish = () => {
    if (profile.contacts && profile.contacts.length >= 2) {
      onComplete({
        ...profile,
        lastCheckIn: Date.now(),
        language
      } as UserProfile);
    } else {
      alert("Please add at least 2 emergency contacts.");
    }
  };

  return (
    <div className="min-h-screen bg-white p-6 flex flex-col">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-slate-900">{t.setupTitle}</h1>
        <p className="text-slate-500">{t.setupSubtitle}</p>
      </div>

      {step === 1 && (
        <div className="space-y-4 flex-grow">
          <label className="block">
            <span className="text-sm font-semibold text-slate-700">{t.nameLabel}</span>
            <input 
              type="text" 
              className="mt-1 block w-full rounded-xl border-slate-200 bg-slate-50 p-4 border focus:border-green-500 outline-none" 
              placeholder="e.g. Rahul Kumar"
              value={profile.name}
              onChange={e => setProfile({...profile, name: e.target.value})}
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-slate-700">{t.ageLabel}</span>
            <input 
              type="number" 
              className="mt-1 block w-full rounded-xl border-slate-200 bg-slate-50 p-4 border outline-none" 
              placeholder="65"
              value={profile.age}
              onChange={e => setProfile({...profile, age: e.target.value})}
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-slate-700">{t.checkInTimeLabel}</span>
            <select 
              className="mt-1 block w-full rounded-xl border-slate-200 bg-slate-50 p-4 border outline-none"
              value={profile.checkInHour}
              onChange={e => setProfile({...profile, checkInHour: parseInt(e.target.value)})}
            >
              {[...Array(24)].map((_, i) => (
                <option key={i} value={i}>{i}:00 {i < 12 ? 'AM' : 'PM'}</option>
              ))}
            </select>
          </label>
          <button 
            onClick={() => setStep(2)}
            disabled={!profile.name}
            className="w-full bg-slate-900 text-white rounded-xl p-4 font-bold mt-8 disabled:opacity-50"
          >
            Next Step
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4 flex-grow">
          <h2 className="text-xl font-bold text-slate-800">{t.emergencyContacts}</h2>
          <div className="bg-slate-50 p-4 rounded-xl space-y-3">
            <input 
              type="text" 
              placeholder="Contact Name"
              className="block w-full rounded-lg border-slate-200 p-3 border outline-none"
              value={contactName}
              onChange={e => setContactName(e.target.value)}
            />
            <input 
              type="tel" 
              placeholder="Phone Number"
              className="block w-full rounded-lg border-slate-200 p-3 border outline-none"
              value={contactPhone}
              onChange={e => setContactPhone(e.target.value)}
            />
            <button 
              onClick={handleAddContact}
              className="w-full bg-slate-200 text-slate-800 rounded-lg p-2 text-sm font-bold"
            >
              + {t.addContact}
            </button>
          </div>

          <div className="space-y-2 mt-4 max-h-48 overflow-y-auto">
            {profile.contacts?.map(c => (
              <div key={c.id} className="flex justify-between items-center p-3 bg-white border border-slate-100 rounded-lg shadow-sm">
                <div>
                  <p className="font-bold text-sm">{c.name}</p>
                  <p className="text-xs text-slate-500">{c.phone}</p>
                </div>
                <button 
                  onClick={() => setProfile(prev => ({ ...prev, contacts: prev.contacts?.filter(x => x.id !== c.id) }))}
                  className="text-red-500 text-xs font-bold"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          <button 
            onClick={handleFinish}
            className="w-full bg-green-600 text-white rounded-xl p-4 font-bold mt-8 shadow-lg shadow-green-100"
          >
            {t.finish}
          </button>
          <button 
            onClick={() => setStep(1)}
            className="w-full text-slate-400 font-bold p-2 text-sm"
          >
            Back
          </button>
        </div>
      )}
    </div>
  );
};

// --- Main App Component ---

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [language, setLanguage] = useState<Language>(Language.EN);
  const [status, setStatus] = useState<SafetyStatus>(SafetyStatus.SAFE);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [aiInsight, setAiInsight] = useState<string>('');
  const [showPanicConfirm, setShowPanicConfirm] = useState(false);

  const t = TRANSLATIONS[language];

  // Load user data on mount
  useEffect(() => {
    const savedUser = mockFirebase.getUser();
    if (savedUser) {
      setUser(savedUser);
      setLanguage(savedUser.language);
    }
  }, []);

  // Update Countdown and Check for Safety
  const updateStatusLogic = useCallback(() => {
    if (!user) return;
    
    const now = new Date();
    const nextCheckIn = new Date();
    nextCheckIn.setHours(user.checkInHour, 0, 0, 0);
    
    // If today's check-in hour already passed, set for tomorrow
    if (now > nextCheckIn && now.getTime() - user.lastCheckIn < 24 * 60 * 60 * 1000) {
      nextCheckIn.setDate(nextCheckIn.getDate() + 1);
    }

    const diff = nextCheckIn.getTime() - now.getTime();
    
    if (diff > 0) {
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      setTimeRemaining(`${hours}h ${mins}m`);
    } else {
      setTimeRemaining('DUE NOW');
    }

    // Determine status based on last check-in
    const timeSinceLastCheck = now.getTime() - user.lastCheckIn;
    const hoursSinceLastCheck = timeSinceLastCheck / (1000 * 60 * 60);

    if (hoursSinceLastCheck > 30) {
      setStatus(SafetyStatus.EMERGENCY);
    } else if (hoursSinceLastCheck > 24) {
      setStatus(SafetyStatus.ATTENTION);
    } else {
      setStatus(SafetyStatus.SAFE);
    }
  }, [user]);

  useEffect(() => {
    updateStatusLogic();
    const timer = setInterval(updateStatusLogic, 30000); // Update every 30s
    return () => clearInterval(timer);
  }, [updateStatusLogic]);

  // Fetch AI Safety Insight
  useEffect(() => {
    if (user && status === SafetyStatus.SAFE) {
      getSafetyInsight(user).then(setAiInsight);
    }
  }, [user, status]);

  const handleAliveConfirmation = () => {
    setIsCheckingIn(true);
    setTimeout(() => {
      const now = Date.now();
      mockFirebase.updateLastCheckIn(now);
      setUser(prev => prev ? { ...prev, lastCheckIn: now } : null);
      setIsCheckingIn(false);
      setStatus(SafetyStatus.SAFE);
    }, 1500);
  };

  const handlePanic = () => {
    setStatus(SafetyStatus.EMERGENCY);
    setShowPanicConfirm(false);
    mockFirebase.triggerEmergencyMode(user!);
    alert("Emergency contacts have been notified with your last location!");
  };

  if (!user) {
    return (
      <div className="max-w-md mx-auto h-full">
        <SetupWizard 
          language={language}
          onComplete={(profile) => {
            mockFirebase.saveUser(profile);
            setUser(profile);
          }} 
        />
        <div className="fixed bottom-6 right-6">
          <LanguageToggle lang={language} setLang={setLanguage} />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 flex flex-col font-sans relative">
      {/* Header */}
      <header className="bg-white p-6 shadow-sm border-b border-slate-100 flex justify-between items-center sticky top-0 z-10">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <span className="text-green-600"><ICONS.ShieldCheck /></span>
            {t.appName}
          </h1>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{t.tagline}</p>
        </div>
        <LanguageToggle lang={language} setLang={(l) => { setLanguage(l); setUser({...user, language: l}); mockFirebase.saveUser({...user, language: l})}} />
      </header>

      {/* Main Content */}
      <main className="flex-grow p-6 flex flex-col gap-6 safe-area-inset-bottom mb-24">
        
        {/* Status Card */}
        <div className={`p-5 rounded-3xl shadow-lg border-2 flex items-center justify-between ${
          status === SafetyStatus.SAFE ? 'bg-green-50 border-green-200 text-green-800' :
          status === SafetyStatus.ATTENTION ? 'bg-amber-50 border-amber-200 text-amber-800' :
          'bg-red-50 border-red-200 text-red-800'
        }`}>
          <div>
            <p className="text-xs font-bold opacity-70 uppercase mb-1">{t.status}</p>
            <p className="text-2xl font-black">
              {status === SafetyStatus.SAFE ? t.safe :
               status === SafetyStatus.ATTENTION ? t.attention : t.emergency}
            </p>
          </div>
          <div className={`p-3 rounded-full ${status === SafetyStatus.SAFE ? 'bg-green-500 text-white' : 'bg-red-500 text-white animate-pulse'}`}>
             {status === SafetyStatus.SAFE ? <ICONS.ShieldCheck /> : <ICONS.Alert />}
          </div>
        </div>

        {/* Big Button Area */}
        <div className="flex-grow flex flex-col items-center justify-center py-8">
          <button 
            disabled={isCheckingIn}
            onClick={handleAliveConfirmation}
            className={`w-64 h-64 rounded-full flex flex-col items-center justify-center text-center p-8 transition-all active:scale-95 shadow-2xl relative
              ${status === SafetyStatus.SAFE ? 'bg-green-600 text-white alive-btn-pulse' : 
                status === SafetyStatus.ATTENTION ? 'bg-amber-500 text-white' : 'bg-red-600 text-white'}
              ${isCheckingIn ? 'opacity-70 grayscale' : ''}
            `}
          >
            {isCheckingIn ? (
              <span className="text-xl font-bold animate-bounce">{t.checkingIn}</span>
            ) : (
              <>
                <span className="text-2xl font-black leading-tight mb-2">{t.imAlive}</span>
                <div className="w-12 h-1 w-full bg-white/30 rounded-full mb-4"></div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold opacity-80 uppercase tracking-tighter">{t.nextCheckIn}</span>
                  <span className="text-xl font-bold">{timeRemaining}</span>
                </div>
              </>
            )}
          </button>
        </div>

        {/* AI Insight Section */}
        {aiInsight && status === SafetyStatus.SAFE && (
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex gap-3 items-start animate-fade-in">
            <div className="text-2xl">🤖</div>
            <div>
              <p className="text-[10px] font-black text-indigo-500 uppercase">Zinda AI Intelligence</p>
              <p className="text-sm italic text-slate-600">"{aiInsight}"</p>
            </div>
          </div>
        )}

        {/* Info Area */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-100">
            <p className="text-[10px] font-bold text-slate-400 uppercase">{t.lastCheckIn}</p>
            <p className="font-bold text-slate-800">{new Date(user.lastCheckIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-100">
            <p className="text-[10px] font-bold text-slate-400 uppercase">Guardian Contacts</p>
            <p className="font-bold text-slate-800">{user.contacts.length} Active</p>
          </div>
        </div>
      </main>

      {/* Floating Panic Button & Confirmation */}
      <div className="fixed bottom-6 left-0 right-0 px-6 z-50 flex items-center justify-center pointer-events-none">
        <div className="bg-white rounded-full shadow-2xl p-2 flex gap-4 pointer-events-auto border border-slate-200">
          <button 
            onClick={() => setShowPanicConfirm(true)}
            className="bg-red-600 hover:bg-red-700 text-white h-14 w-32 rounded-full font-black text-sm transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
          >
            <div className="w-2 h-2 bg-white rounded-full animate-ping"></div>
            {t.panic}
          </button>
        </div>
      </div>

      {/* Panic Modal */}
      {showPanicConfirm && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl p-8 space-y-6 animate-slide-up">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
              <ICONS.Alert />
            </div>
            <div className="text-center">
              <h2 className="text-2xl font-black text-slate-900">Confirm Emergency?</h2>
              <p className="text-slate-500 mt-2 font-medium">{t.confirmPanic}</p>
            </div>
            <div className="space-y-3">
              <button 
                onClick={handlePanic}
                className="w-full bg-red-600 text-white rounded-2xl p-4 font-bold text-lg shadow-xl shadow-red-200"
              >
                YES, ALERT FAMILY
              </button>
              <button 
                onClick={() => setShowPanicConfirm(false)}
                className="w-full bg-slate-100 text-slate-600 rounded-2xl p-4 font-bold"
              >
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Emergency Overlay */}
      {status === SafetyStatus.EMERGENCY && !showPanicConfirm && (
        <div className="fixed inset-0 bg-red-600 text-white z-[60] flex flex-col items-center justify-center p-8 text-center animate-pulse">
           <div className="mb-8 scale-[2.5]"><ICONS.Alert /></div>
           <h1 className="text-4xl font-black mb-4">EMERGENCY MODE ACTIVE</h1>
           <p className="text-xl font-bold opacity-90 max-w-xs">Family and emergency services have been notified with your current GPS location.</p>
           <button 
            onClick={() => handleAliveConfirmation()}
            className="mt-12 bg-white text-red-600 px-8 py-4 rounded-2xl font-black shadow-2xl"
           >
             I AM SAFE NOW
           </button>
        </div>
      )}
    </div>
  );
}
