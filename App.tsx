
import React, { useState, useEffect, useCallback } from 'react';
import { UserProfile, Language, SafetyStatus, EmergencyContact } from './types';
import { TRANSLATIONS, ICONS } from './constants';
import { mockFirebase } from './services/mockFirebaseService';
import { getSafetyInsight } from './services/geminiService';

// --- Additional Browser API Integration ---

const useBattery = () => {
  const [battery, setBattery] = useState<number | null>(null);
  useEffect(() => {
    // Check if navigator and getBattery exists
    if (typeof navigator !== 'undefined' && 'getBattery' in navigator) {
      // @ts-ignore
      navigator.getBattery().then((bat) => {
        setBattery(Math.round(bat.level * 100));
        const updateLevel = () => setBattery(Math.round(bat.level * 100));
        bat.addEventListener('levelchange', updateLevel);
        return () => bat.removeEventListener('levelchange', updateLevel);
      }).catch(() => {});
    }
  }, []);
  return battery;
};

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

const SourceViewer: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [activeFile, setActiveFile] = useState('MainActivity.kt');
  const files = {
    'MainActivity.kt': `package com.zindahu.ai.ui.dashboard\n\nimport android.os.Bundle\nimport androidx.activity.viewModels\nimport androidx.appcompat.app.AppCompatActivity\n...\n\n    private fun setupObservers() {\n        viewModel.safetyStatus.observe(this) { ... }\n        viewModel.timeRemaining.observe(this) { ... }\n        viewModel.lastCheckInTime.observe(this) { timeString ->\n            binding.lastCheckInText.text = timeString\n        }\n    }`,
    'SafetyViewModel.kt': `package com.zindahu.ai.ui.dashboard\n\nclass SafetyViewModel @Inject constructor(...) : ViewModel() {\n    ...\n    private val _lastCheckInTime = MutableLiveData<String>()\n    val lastCheckInTime: LiveData<String> = _lastCheckInTime\n\n    fun confirmAlive() {\n        viewModelScope.launch {\n            ...\n            _lastCheckInTime.value = "Last confirmed: " + timeFormatter.format(Date(now))\n        }\n    }\n}`,
    'activity_main.xml': `<?xml version="1.0" encoding="utf-8"?>\n<androidx.constraintlayout.widget.ConstraintLayout ...>\n    <!-- Status Header -->\n    <androidx.cardview.widget.CardView android:id="@+id/statusCard" ... />\n\n    <TextView\n        android:id="@+id/lastCheckInText"\n        android:layout_width="wrap_content"\n        android:layout_height="wrap_content"\n        android:text="Last confirmed: --:--"\n        app:layout_constraintTop_toBottomOf="@id/statusCard" ... />\n\n    <com.google.android.material.button.MaterialButton android:id="@+id/btnImAlive" ... />\n</androidx.constraintlayout.widget.ConstraintLayout>`
  };

  return (
    <div className="fixed inset-0 bg-slate-900 text-white z-[200] flex flex-col p-4 animate-fade-in">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Android Source Code</h2>
        <button onClick={onClose} className="p-2 bg-white/10 rounded-full text-2xl leading-none">&times;</button>
      </div>
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2 scrollbar-hide">
        {Object.keys(files).map(f => (
          <button 
            key={f}
            onClick={() => setActiveFile(f)}
            className={`px-3 py-1 rounded-md text-xs font-bold whitespace-nowrap transition-colors ${activeFile === f ? 'bg-blue-600' : 'bg-white/10'}`}
          >
            {f}
          </button>
        ))}
      </div>
      <pre className="bg-black/50 p-4 rounded-xl overflow-auto text-[11px] flex-grow font-mono text-blue-300 border border-white/10">
        {files[activeFile as keyof typeof files]}
      </pre>
      <p className="mt-4 text-xs opacity-50 italic">Note: These are standard Android Studio files following MVVM architecture.</p>
    </div>
  );
};

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
    <div className="min-h-screen bg-white p-6 flex flex-col overflow-y-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-slate-900">{t.setupTitle}</h1>
        <p className="text-slate-500">{t.setupSubtitle}</p>
      </div>

      {step === 1 && (
        <div className="space-y-4 flex-grow animate-fade-in">
          <label className="block">
            <span className="text-sm font-semibold text-slate-700">{t.nameLabel}</span>
            <input 
              type="text" 
              className="mt-1 block w-full rounded-xl border-slate-200 bg-slate-50 p-4 border focus:border-green-500 outline-none transition-all" 
              placeholder="e.g. Rahul Kumar"
              value={profile.name}
              onChange={e => setProfile({...profile, name: e.target.value})}
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-slate-700">{t.ageLabel}</span>
            <input 
              type="number" 
              className="mt-1 block w-full rounded-xl border-slate-200 bg-slate-50 p-4 border focus:border-green-500 outline-none" 
              placeholder="65"
              value={profile.age}
              onChange={e => setProfile({...profile, age: e.target.value})}
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-slate-700">{t.checkInTimeLabel}</span>
            <select 
              className="mt-1 block w-full rounded-xl border-slate-200 bg-slate-50 p-4 border focus:border-green-500 outline-none bg-white"
              value={profile.checkInHour}
              onChange={e => setProfile({...profile, checkInHour: parseInt(e.target.value)})}
            >
              {[...Array(24)].map((_, i) => (
                <option key={i} value={i}>{i === 0 ? '12' : i > 12 ? i - 12 : i}:00 {i < 12 ? 'AM' : 'PM'}</option>
              ))}
            </select>
          </label>
          <button 
            onClick={() => setStep(2)}
            disabled={!profile.name}
            className="w-full bg-slate-900 text-white rounded-xl p-4 font-bold mt-8 disabled:opacity-50 active:scale-95 transition-transform"
          >
            Next Step
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4 flex-grow animate-fade-in">
          <h2 className="text-xl font-bold text-slate-800">{t.emergencyContacts}</h2>
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <input 
              type="text" 
              placeholder="Contact Name"
              className="block w-full rounded-lg border-slate-200 p-3 border outline-none focus:border-green-500"
              value={contactName}
              onChange={e => setContactName(e.target.value)}
            />
            <input 
              type="tel" 
              placeholder="Phone Number"
              className="block w-full rounded-lg border-slate-200 p-3 border outline-none focus:border-green-500"
              value={contactPhone}
              onChange={e => setContactPhone(e.target.value)}
            />
            <button 
              onClick={handleAddContact}
              className="w-full bg-slate-200 text-slate-800 rounded-lg p-2 text-sm font-bold active:bg-slate-300 transition-colors"
            >
              + {t.addContact}
            </button>
          </div>

          <div className="space-y-2 mt-4 max-h-48 overflow-y-auto">
            {profile.contacts?.map(c => (
              <div key={c.id} className="flex justify-between items-center p-3 bg-white border border-slate-100 rounded-lg shadow-sm">
                <div>
                  <p className="font-bold text-sm text-slate-900">{c.name}</p>
                  <p className="text-xs text-slate-500">{c.phone}</p>
                </div>
                <button 
                  onClick={() => setProfile(prev => ({ ...prev, contacts: prev.contacts?.filter(x => x.id !== c.id) }))}
                  className="text-red-500 text-xs font-bold p-1"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          <button 
            onClick={handleFinish}
            className="w-full bg-green-600 text-white rounded-xl p-4 font-bold mt-8 shadow-lg shadow-green-100 active:scale-95 transition-transform"
          >
            {t.finish}
          </button>
          <button 
            onClick={() => setStep(1)}
            className="w-full text-slate-400 font-bold p-2 text-sm active:text-slate-600"
          >
            Back
          </button>
        </div>
      )}
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [language, setLanguage] = useState<Language>(Language.EN);
  const [status, setStatus] = useState<SafetyStatus>(SafetyStatus.SAFE);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<string>('--:--');
  const [aiInsight, setAiInsight] = useState<string>('');
  const [showPanicConfirm, setShowPanicConfirm] = useState(false);
  const [showSource, setShowSource] = useState(false);
  const [isAppLoaded, setIsAppLoaded] = useState(false);
  
  const batteryLevel = useBattery();
  const t = TRANSLATIONS[language];

  // Initial Load with safe checks
  useEffect(() => {
    const savedUser = mockFirebase.getUser();
    if (savedUser) {
      setUser(savedUser);
      setLanguage(savedUser.language || Language.EN);
    }
    setIsAppLoaded(true);
  }, []);

  const updateStatusLogic = useCallback(() => {
    if (!user) return;
    
    const now = new Date();
    const nextCheckIn = new Date();
    nextCheckIn.setHours(user.checkInHour, 0, 0, 0);
    
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
    if (user) {
      updateStatusLogic();
      const timer = setInterval(updateStatusLogic, 30000);
      return () => clearInterval(timer);
    }
  }, [user, updateStatusLogic]);

  useEffect(() => {
    if (user && status === SafetyStatus.SAFE) {
      getSafetyInsight(user).then(setAiInsight).catch(() => setAiInsight('You are protected.'));
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
    if (user) mockFirebase.triggerEmergencyMode(user);
  };

  // Prevent flash by waiting for initial load check
  if (!isAppLoaded) {
    return (
      <div className="flex-grow flex items-center justify-center bg-slate-50">
        <div className="w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto w-full flex-grow">
        <SetupWizard 
          language={language}
          onComplete={(profile) => {
            mockFirebase.saveUser(profile);
            setUser(profile);
          }} 
        />
        <div className="fixed bottom-6 right-6 flex flex-col gap-2 z-50">
           <button 
             onClick={() => setShowSource(true)} 
             className="bg-slate-800 text-white text-[10px] p-2 rounded-lg font-bold shadow-lg active:scale-95 transition-transform"
           >
             VIEW SOURCE
           </button>
           <LanguageToggle lang={language} setLang={setLanguage} />
        </div>
        {showSource && <SourceViewer onClose={() => setShowSource(false)} />}
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto w-full min-h-screen bg-slate-50 flex flex-col font-sans relative">
      <header className="bg-white p-6 shadow-sm border-b border-slate-100 flex justify-between items-center sticky top-0 z-10">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <span className="text-green-600"><ICONS.ShieldCheck /></span>
            {t.appName}
          </h1>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{t.tagline}</p>
        </div>
        <div className="flex items-center gap-2">
          {batteryLevel !== null && (
            <div className={`text-[10px] font-bold px-2 py-1 rounded flex items-center gap-1 shadow-sm ${batteryLevel < 20 ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-500'}`}>
              ⚡ {batteryLevel}%
            </div>
          )}
          <LanguageToggle lang={language} setLang={(l) => { setLanguage(l); if (user) { const u = {...user, language: l}; setUser(u); mockFirebase.saveUser(u); } }} />
        </div>
      </header>

      <main className="flex-grow p-6 flex flex-col gap-6 safe-area-inset-bottom mb-24 animate-fade-in">
        
        <div className={`p-5 rounded-3xl shadow-lg border-2 flex items-center justify-between transition-colors ${
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
          <div className={`p-3 rounded-full shadow-inner ${status === SafetyStatus.SAFE ? 'bg-green-500 text-white' : 'bg-red-500 text-white animate-pulse'}`}>
             {status === SafetyStatus.SAFE ? <ICONS.ShieldCheck /> : <ICONS.Alert />}
          </div>
        </div>

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

        {aiInsight && status === SafetyStatus.SAFE && (
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex gap-3 items-start animate-fade-in">
            <div className="text-2xl">🤖</div>
            <div>
              <p className="text-[10px] font-black text-indigo-500 uppercase">Zinda AI Intelligence</p>
              <p className="text-sm italic text-slate-600">"{aiInsight}"</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
            <p className="text-[10px] font-bold text-slate-400 uppercase">{t.lastCheckIn}</p>
            <p className="font-bold text-slate-800">{new Date(user.lastCheckIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm cursor-pointer active:bg-slate-50 transition-colors" onClick={() => setShowSource(true)}>
            <p className="text-[10px] font-bold text-indigo-400 uppercase">Dev Mode</p>
            <p className="font-bold text-slate-800">Source Code</p>
          </div>
        </div>
      </main>

      <div className="fixed bottom-6 left-0 right-0 px-6 z-40 flex items-center justify-center pointer-events-none">
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
              <button onClick={handlePanic} className="w-full bg-red-600 text-white rounded-2xl p-4 font-bold text-lg shadow-xl shadow-red-200 active:scale-95 transition-transform">YES, ALERT FAMILY</button>
              <button onClick={() => setShowPanicConfirm(false)} className="w-full bg-slate-100 text-slate-600 rounded-2xl p-4 font-bold active:bg-slate-200 transition-colors">CANCEL</button>
            </div>
          </div>
        </div>
      )}

      {status === SafetyStatus.EMERGENCY && !showPanicConfirm && (
        <div className="fixed inset-0 bg-red-600 text-white z-[60] flex flex-col items-center justify-center p-8 text-center animate-pulse">
           <div className="mb-8 scale-[2.5]"><ICONS.Alert /></div>
           <h1 className="text-4xl font-black mb-4">EMERGENCY ACTIVE</h1>
           <p className="text-xl font-bold opacity-90 max-w-xs">Family notified with your GPS location.</p>
           <button onClick={handleAliveConfirmation} className="mt-12 bg-white text-red-600 px-8 py-4 rounded-2xl font-black shadow-2xl active:scale-95 transition-transform">I AM SAFE NOW</button>
        </div>
      )}

      {showSource && <SourceViewer onClose={() => setShowSource(false)} />}
    </div>
  );
}
