import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck,
  LayoutDashboard,
  Smartphone,
  Users,
  Plug,
  Bot,
  Webhook,
  ClipboardList,
  Settings,
  RefreshCw,
  KeyRound,
  Copy,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Ban,
  MessagesSquare,
  LogOut,
  Sparkles,
  SlidersHorizontal,
  Activity,
  Check,
  AlertCircle,
  Plus,
  Trash2,
  X
} from 'lucide-react';

interface DashboardData {
  connection: {
    online: boolean;
    status: string;
    conflict?: boolean;
    user?: { id?: string; name?: string };
  };
  overview: {
    messagesChecked: number;
    warnings: number;
    blockedWords: number;
    groups: number;
  };
  settings: Record<string, boolean>;
  config?: {
    botName?: string;
    botGender?: 'female' | 'male';
    aiPrompt?: string;
    geminiApiKey?: string;
    geminiModel?: string;
    waToken?: string;
    phoneId?: string;
    wabaId?: string;
    graphVersion?: string;
    customBadWords?: string[];
  };
}

interface GroupItem {
  id: string;
  name: string;
  participants: number;
  status: string;
}

interface LogItem {
  id: string;
  action: string;
  message: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'success';
}

export default function App() {
  const [activePage, setActivePage] = useState<string>('home');
  const [phone, setPhone] = useState<string>('');
  const [pairingCode, setPairingCode] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isDisconnecting, setIsDisconnecting] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number>(0);
  const [toastMsg, setToastMsg] = useState<string>('');
  
  const [dashboard, setDashboard] = useState<DashboardData>({
    connection: { online: false, status: 'disconnected' },
    overview: { messagesChecked: 0, warnings: 0, blockedWords: 0, groups: 0 },
    settings: {
      aiModeration: true,
      toxicityDetection: true,
      aiSpamDetection: true,
      aiSummary: false,
      antiBadWords: true,
      autoWarning: true,
      autoDelete: true,
      adminProtection: true,
      autoKickSlurs: true,
      antiSticker: true,
      antiGif: true,
      antiVideo: true,
      mediaReview: true,
      personalityEnabled: true,
      globalBotPower: true
    },
    config: {
      botName: 'মায়া',
      aiPrompt: '',
      geminiApiKey: '',
      geminiModel: 'gemini-3.8-flash',
      waToken: '',
      phoneId: '',
      wabaId: '',
      graphVersion: 'v23.0'
    }
  });

  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [kicks, setKicks] = useState<Array<{ id: string; remoteJid: string; groupName: string; userJid: string; phone: string; timestamp: string; reason: string }>>([]);
  const [customBaileysUrl, setCustomBaileysUrl] = useState<string>(() => localStorage.getItem('wg_server') || '');
  const [geminiKey, setGeminiKey] = useState<string>('');
  const [geminiModel, setGeminiModel] = useState<string>('gemini-3.8-flash');
  const [aiPrompt, setAiPrompt] = useState<string>('You are an intelligent group moderator. Filter spam, abusive slurs, scam links, and unwanted promotions.');
  const [newBadWordInput, setNewBadWordInput] = useState<string>('');

  const fetchKicks = async () => {
    try {
      const res = await apiCall('/api/kicks');
      if (res.success && Array.isArray(res.kicks)) {
        setKicks(res.kicks);
      }
    } catch (e) {}
  };

  const handleUnkick = async (remoteJid: string, userJid: string) => {
    try {
      const res = await apiCall('/api/kicks/add', 'POST', { remoteJid, userJid });
      if (res.success) {
        setKicks(res.kicks || []);
        showToast('সদস্যকে সফলভাবে গ্রুপে ফিরিয়ে আনা হয়েছে!');
      }
    } catch (err: any) {
      showToast('আনকিক ব্যর্থ: ' + err.message);
    }
  };

  const handleReconnect = async () => {
    try {
      showToast('পুনরায় কানেক্ট করার চেষ্টা করা হচ্ছে...');
      await apiCall('/api/whatsapp/reconnect', 'POST');
    } catch (err: any) {
      showToast('কানেক্ট করতে সমস্যা: ' + err.message);
    }
  };

  const countdownIntervalRef = useRef<any>(null);
  const pollIntervalRef = useRef<any>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg((prev) => (prev === msg ? '' : prev));
    }, 3200);
  };

  const handleGenderSwitch = async (gender: 'female' | 'male') => {
    const name = gender === 'male' ? 'মায়ান' : 'মায়া';
    setDashboard(prev => ({
      ...prev,
      config: {
        ...prev.config,
        botGender: gender,
        botName: name
      }
    }));
    try {
      await apiCall('/api/config/ai', 'PUT', { botGender: gender, botName: name, aiPrompt: dashboard.config?.aiPrompt });
      showToast(gender === 'male' ? 'ছেলে AI (মায়ান) মোড চালু হয়েছে!' : 'মেয়ে AI (মায়া) মোড চালু হয়েছে!');
    } catch (err: any) {
      showToast('মোড পরিবর্তন ব্যর্থ: ' + err.message);
    }
  };

  const handleAddCustomBadWord = async () => {
    const word = newBadWordInput.trim();
    if (!word) {
      showToast('দয়া করে একটি শব্দ বা বাক্য লিখুন');
      return;
    }
    try {
      const res = await apiCall('/api/custom-bad-words', 'POST', { word });
      if (res.success) {
        setDashboard(prev => ({
          ...prev,
          config: {
            ...prev.config,
            customBadWords: res.customBadWords
          }
        }));
        setNewBadWordInput('');
        showToast(`"${word}" শব্দটিকে সফলভাবে যোগ করা হয়েছে!`);
      }
    } catch (err: any) {
      showToast('শব্দ যোগ করতে সমস্যা: ' + err.message);
    }
  };

  const handleRemoveCustomBadWord = async (word: string) => {
    try {
      const res = await apiCall('/api/custom-bad-words', 'DELETE', { word });
      if (res.success) {
        setDashboard(prev => ({
          ...prev,
          config: {
            ...prev.config,
            customBadWords: res.customBadWords
          }
        }));
        showToast(`"${word}" শব্দটিকে তালিকা থেকে মোছা হয়েছে`);
      }
    } catch (err: any) {
      showToast('শব্দ মুছতে সমস্যা: ' + err.message);
    }
  };

  const handleClearAllCustomBadWords = async () => {
    if (!window.confirm('আপনি কি নিশ্চিত যে সব কাস্টম শব্দ মুছে ফেলতে চান?')) return;
    try {
      const res = await apiCall('/api/custom-bad-words', 'DELETE', { clearAll: true });
      if (res.success) {
        setDashboard(prev => ({
          ...prev,
          config: {
            ...prev.config,
            customBadWords: []
          }
        }));
        showToast('সকল কাস্টম শব্দ মুছে ফেলা হয়েছে');
      }
    } catch (err: any) {
      showToast('শব্দ তালিকা সাফ করতে সমস্যা: ' + err.message);
    }
  };

  const getBaseApi = () => (customBaileysUrl ? customBaileysUrl.replace(/\/+$/, '') : '');

  const apiCall = async (path: string, method = 'GET', body?: any) => {
    const base = getBaseApi();
    const opts: RequestInit = {
      method,
      headers: { 'Content-Type': 'application/json' }
    };
    if (body !== undefined) opts.body = JSON.stringify(body);

    const res = await fetch(base + path, opts);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.message || `Server error ${res.status}`);
    }
    return data;
  };

  const fetchDashboard = async () => {
    try {
      const data = await apiCall('/api/dashboard');
      setDashboard(data);
    } catch (err: any) {
      console.warn('Dashboard fetch issue:', err.message);
    }
  };

  const fetchGroups = async () => {
    try {
      const data = await apiCall('/api/groups');
      setGroups(data.groups || []);
    } catch (err: any) {
      showToast('গ্রুপ লোড ব্যর্থ: ' + err.message);
    }
  };

  const fetchLogs = async () => {
    try {
      const data = await apiCall('/api/logs');
      setLogs(data.logs || []);
    } catch (err: any) {
      console.warn('Logs error:', err.message);
    }
  };

  useEffect(() => {
    fetchDashboard();
    fetchLogs();
    fetchKicks();
    const timer = setInterval(() => {
      fetchDashboard();
    }, 8000);
    return () => clearInterval(timer);
  }, [customBaileysUrl]);

  useEffect(() => {
    if (activePage === 'groups') fetchGroups();
    if (activePage === 'logs') fetchLogs();
    if (activePage === 'kicks') fetchKicks();
  }, [activePage]);

  // Real WhatsApp Pairing Code Generation
  const handleGeneratePairing = async () => {
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 9) {
      showToast('সঠিক হোয়াটসঅ্যাপ নম্বর দিন (কমপক্ষে ৯-১৫ ডিজিট)');
      return;
    }

    setIsGenerating(true);
    try {
      const res = await apiCall('/api/whatsapp/pair', 'POST', { phoneNumber: cleanPhone });
      if (res.alreadyConnected) {
        showToast(res.message || 'হোয়াটসঅ্যাপ ইতোমধ্যে কানেক্টেড!');
        fetchDashboard();
        return;
      }

      const code = res.pairingCode || res.rawCode;
      setPairingCode(code);
      setPhone(cleanPhone); // Sync formatted phone
      showToast('রিয়েল হোয়াটসঅ্যাপ পেয়ারিং কোড তৈরি হয়েছে!');

      // Countdown
      setCountdown(60);
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = setInterval(() => {
        setCountdown((c) => {
          if (c <= 1) {
            clearInterval(countdownIntervalRef.current);
            return 0;
          }
          return c - 1;
        });
      }, 1000);

      // Start polling for pairing success
      clearInterval(pollIntervalRef.current);
      let attempts = 0;
      pollIntervalRef.current = setInterval(async () => {
        attempts++;
        if (attempts > 25) {
          clearInterval(pollIntervalRef.current);
          return;
        }
        try {
          const d = await apiCall('/api/dashboard');
          if (d.connection?.online) {
            clearInterval(pollIntervalRef.current);
            clearInterval(countdownIntervalRef.current);
            setDashboard(d);
            showToast('হোয়াটসঅ্যাপ সফলভাবে সংযুক্ত হয়েছে!');
            setActivePage('home');
          }
        } catch (_) {}
      }, 3000);
    } catch (err: any) {
      showToast('কোড জেনারেট ত্রুটি: ' + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const copyCode = () => {
    if (!pairingCode) return;
    const clean = pairingCode.replace('-', '');
    navigator.clipboard?.writeText(clean);
    showToast(`কোড ${pairingCode} কপি হয়েছে!`);
  };

  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    showToast('হোয়াটসঅ্যাপ ডিসকানেক্ট করা হচ্ছে...');
    try {
      await apiCall('/api/whatsapp/disconnect', 'POST', {});
      showToast('হোয়াটসঅ্যাপ সফলভাবে ডিসকানেক্ট হয়েছে!');
      setPairingCode('');
      fetchDashboard();
    } catch (err: any) {
      showToast('ডিসকানেক্ট ব্যর্থ: ' + err.message);
    } finally {
      setIsDisconnecting(false);
    }
  };

  const toggleSetting = async (key: string) => {
    const current = dashboard.settings?.[key] ?? false;
    const updated = !current;
    setDashboard((prev) => ({
      ...prev,
      settings: { ...prev.settings, [key]: updated }
    }));

    try {
      await apiCall('/api/settings', 'PUT', { [key]: updated });
      showToast('সেটিংস আপডেট হয়েছে');
    } catch (err: any) {
      // Revert on error
      setDashboard((prev) => ({
        ...prev,
        settings: { ...prev.settings, [key]: current }
      }));
      showToast('আপডেট ব্যর্থ: ' + err.message);
    }
  };

  const saveConfig = async (section: string) => {
    let body: any = {};
    if (section === 'ai') {
      body = {
        aiPrompt: dashboard.config?.aiPrompt,
        botName: dashboard.config?.botName,
        botGender: dashboard.config?.botGender || 'female'
      };
    } else if (section === 'whatsapp') {
      body = {
        accessToken: dashboard.config?.waToken,
        phoneNumberId: dashboard.config?.phoneId,
        wabaId: dashboard.config?.wabaId,
        graphVersion: dashboard.config?.graphVersion || 'v23.0'
      };
    } else if (section === 'gemini') {
      body = {
        geminiApiKey: dashboard.config?.geminiApiKey,
        geminiModel: dashboard.config?.geminiModel || 'gemini-3.8-flash'
      };
    } else if (section === 'baileys') {
      body = { baseUrl: customBaileysUrl };
    }
    
    try {
      await apiCall(`/api/config/${section}`, 'PUT', body);
      showToast(`${section.toUpperCase()} সেটিংস সফলভাবে সেভ হয়েছে!`);
      fetchDashboard();
    } catch (err: any) {
      showToast('সেভ ব্যর্থ: ' + err.message);
    }
  };

  const testConfig = async (section: string) => {
    showToast(`${section.toUpperCase()} টেস্ট করা হচ্ছে...`);
    try {
      const res = await apiCall(`/api/config/${section}/test`, 'POST');
      showToast(res.message || 'টেস্ট সফল হয়েছে!');
    } catch (err: any) {
      showToast('টেস্ট ব্যর্থ: ' + err.message);
    }
  };

  const isOnline = dashboard.connection?.online;

  return (
    <div className="min-h-screen bg-[#f5f7f6] text-[#1c3027] font-sans">
      {/* Toast */}
      {toastMsg && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#173023] text-white px-5 py-3 rounded-xl shadow-2xl text-xs font-semibold animate-bounce max-w-sm text-center">
          {toastMsg}
        </div>
      )}

      {/* Top Header */}
      <header className="h-[70px] bg-white border-b border-[#e9efeb] sticky top-0 z-30 px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#10b981] to-[#047857] flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="font-extrabold text-xl tracking-tight leading-none">
              WA<span className="text-[#087f55]">Guard</span>
            </div>
            <div className="text-[10px] text-emerald-700 font-bold tracking-wider mt-0.5 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              REAL BAILEYS ENGINE
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Quick Gender Switch Buttons */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
            <button
              onClick={() => handleGenderSwitch('female')}
              className={`px-2.5 py-1 rounded-lg transition flex items-center gap-1 ${
                (dashboard.config?.botGender || 'female') === 'female'
                  ? 'bg-white text-pink-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="মেয়ে AI (মায়া) মোড"
            >
              <span>👧</span> <span className="hidden md:inline">মায়া</span>
            </button>
            <button
              onClick={() => handleGenderSwitch('male')}
              className={`px-2.5 py-1 rounded-lg transition flex items-center gap-1 ${
                dashboard.config?.botGender === 'male'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="ছেলে AI (মায়ান) মোড"
            >
              <span>👦</span> <span className="hidden md:inline">মায়ান</span>
            </button>
          </div>

          <button
            onClick={() => toggleSetting('globalBotPower')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-bold transition ${
              dashboard.settings?.globalBotPower ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${dashboard.settings?.globalBotPower ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></span>
            {dashboard.settings?.globalBotPower ? 'BOT ON' : 'BOT OFF'}
          </button>
          <div className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#f0f7f3] border border-[#e1eee6] text-xs font-medium text-emerald-900">
            <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 shadow-sm shadow-emerald-400' : 'bg-red-400'}`}></span>
            {isOnline ? `WhatsApp: ${dashboard.connection?.user?.id || 'Connected'}` : 'Built-in Server Active'}
          </div>
          <button
            onClick={() => {
              fetchDashboard();
              fetchLogs();
              showToast('রিসোর্স রিফ্রেশ হয়েছে');
            }}
            title="Refresh Data"
            className="w-9 h-9 rounded-xl border border-[#e2eae5] bg-white text-[#64766b] flex items-center justify-center hover:text-emerald-700 hover:border-emerald-300 transition"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-xs">
            W
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <div className="max-w-[1500px] mx-auto flex">
        {/* Sidebar */}
        <aside className="w-60 shrink-0 bg-white border-r border-[#e9efeb] p-4 hidden md:flex flex-col sticky top-[70px] h-[calc(100vh-70px)]">
          <div className="text-[10px] font-bold tracking-wider text-slate-400 px-3 py-2">MAIN MENU</div>
          <button
            onClick={() => setActivePage('home')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition mb-1 ${
              activePage === 'home' ? 'bg-[#e9f7ef] text-[#087f55]' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" /> Overview
          </button>
          <button
            onClick={() => setActivePage('pairing')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition mb-1 ${
              activePage === 'pairing' ? 'bg-[#e9f7ef] text-[#087f55]' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <span className="flex items-center gap-3">
              <Smartphone className="w-4 h-4" /> WhatsApp Connect
            </span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${isOnline ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'}`}>
              {isOnline ? 'Active' : 'Offline'}
            </span>
          </button>
          <button
            onClick={() => setActivePage('groups')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition mb-1 ${
              activePage === 'groups' ? 'bg-[#e9f7ef] text-[#087f55]' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Users className="w-4 h-4" /> Group Management
          </button>
          <button
            onClick={() => setActivePage('kicks')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition mb-1 ${
              activePage === 'kicks' ? 'bg-[#e9f7ef] text-[#087f55]' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <span className="flex items-center gap-3">
              <Ban className="w-4 h-4" /> Kick History & Un-kick
            </span>
            {kicks.length > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-bold">
                {kicks.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActivePage('integrations')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition mb-1 ${
              activePage === 'integrations' ? 'bg-[#e9f7ef] text-[#087f55]' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Plug className="w-4 h-4" /> API & Integrations
          </button>

          <div className="text-[10px] font-bold tracking-wider text-slate-400 px-3 py-2 mt-4">BOT CONTROL</div>
          <button
            onClick={() => setActivePage('ai')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition mb-1 ${
              activePage === 'ai' ? 'bg-[#e9f7ef] text-[#087f55]' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Bot className="w-4 h-4" /> AI Moderation
          </button>
          <button
            onClick={() => setActivePage('security')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition mb-1 ${
              activePage === 'security' ? 'bg-[#e9f7ef] text-[#087f55]' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <ShieldCheck className="w-4 h-4" /> Security Settings
          </button>
          <button
            onClick={() => setActivePage('logs')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition mb-1 ${
              activePage === 'logs' ? 'bg-[#e9f7ef] text-[#087f55]' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <ClipboardList className="w-4 h-4" /> Activity Logs
          </button>

          <div className="mt-auto bg-[#f1f8f4] p-3.5 rounded-2xl border border-emerald-100">
            <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs">
              <ShieldCheck className="w-4 h-4" /> Real WhatsApp Engine
            </div>
            <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
              No local simulation. Direct WhatsApp Web socket pairing code generator.
            </p>
          </div>
        </aside>

        {/* Content Area */}
        <main className="flex-1 p-5 md:p-8 max-w-5xl" style={{ paddingBottom: '250px' }}>
          {/* PAGE: HOME */}
          {activePage === 'home' && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-black tracking-tight text-slate-800">Overview Dashboard</h1>
                  <p className="text-xs text-slate-500 mt-1">Real-time stats and bot session monitoring.</p>
                </div>
                <button
                  onClick={fetchDashboard}
                  className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-2 shadow-sm"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Refresh
                </button>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="flex justify-between items-center text-slate-400 text-xs font-semibold">
                    <span>Messages Checked</span>
                    <span className="p-2 bg-emerald-50 text-emerald-600 rounded-xl"><MessagesSquare className="w-4 h-4" /></span>
                  </div>
                  <div className="text-3xl font-extrabold text-slate-800 mt-3">{dashboard.overview.messagesChecked}</div>
                  <div className="text-[10px] text-slate-400 mt-1">Live incoming messages</div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="flex justify-between items-center text-slate-400 text-xs font-semibold">
                    <span>Warnings Issued</span>
                    <span className="p-2 bg-amber-50 text-amber-600 rounded-xl"><AlertTriangle className="w-4 h-4" /></span>
                  </div>
                  <div className="text-3xl font-extrabold text-slate-800 mt-3">{dashboard.overview.warnings}</div>
                  <div className="text-[10px] text-slate-400 mt-1">Security rule infractions</div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="flex justify-between items-center text-slate-400 text-xs font-semibold">
                    <span>Blocked Words</span>
                    <span className="p-2 bg-red-50 text-red-600 rounded-xl"><Ban className="w-4 h-4" /></span>
                  </div>
                  <div className="text-3xl font-extrabold text-slate-800 mt-3">{dashboard.overview.blockedWords}</div>
                  <div className="text-[10px] text-slate-400 mt-1">Abusive words prevented</div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="flex justify-between items-center text-slate-400 text-xs font-semibold">
                    <span>Connected Groups</span>
                    <span className="p-2 bg-blue-50 text-blue-600 rounded-xl"><Users className="w-4 h-4" /></span>
                  </div>
                  <div className="text-3xl font-extrabold text-slate-800 mt-3">{dashboard.overview.groups}</div>
                  <div className="text-[10px] text-slate-400 mt-1">Participating chats</div>
                </div>
              </div>

              {/* Conflict Alert Banner */}
              {dashboard.connection?.conflict && (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 shadow-sm flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-200/70 text-amber-800 rounded-xl">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-bold text-sm">হোয়াটসঅ্যাপ সেশন কনফ্লিক্ট (Session Conflict: Replaced)</div>
                      <div className="text-xs text-amber-700 mt-0.5">
                        আপনার সেশনটি অন্য কোনো ডিভাইস বা হোয়াটসঅ্যাপ ব্রাউজারে চালু হয়েছে। পুনরায় বটের সাথে কানেক্ট করতে Reconnect বাটনে চাপুন।
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleReconnect}
                      className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow transition"
                    >
                      <RefreshCw className="w-4 h-4" /> Reconnect Now
                    </button>
                    <button
                      onClick={() => setActivePage('pairing')}
                      className="px-3 py-2 bg-white border border-amber-300 text-amber-800 font-bold rounded-xl text-xs hover:bg-amber-100 transition"
                    >
                      New Pairing
                    </button>
                  </div>
                </div>
              )}

              {/* Hero & Quick Info */}
              <div className="grid md:grid-cols-3 gap-5">
                <div className="md:col-span-2 bg-gradient-to-br from-[#0c3f2c] via-[#0d6e47] to-[#109861] p-6 rounded-3xl text-white shadow-xl relative overflow-hidden">
                  <div className="relative z-10">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 backdrop-blur rounded-full text-xs font-semibold mb-3">
                      <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-300' : 'bg-amber-300'}`}></span>
                      {isOnline ? 'WhatsApp Connected & Active' : 'Waiting for Device Link'}
                    </div>
                    <h3 className="text-xl font-extrabold">WhatsApp Bot Engine (Baileys)</h3>
                    <p className="text-xs text-emerald-100 mt-2 leading-relaxed max-w-md">
                      সরাসরি হোয়াটসঅ্যাপ ৮-ডিজিটের পেয়ারিং কোড তৈরি করে আপনার গ্রুপ বট সংযুক্ত করুন। কোনো এক্সটার্নাল Baileys URL ছাড়াই বিল্ট-ইন কাজ করবে।
                    </p>
                    <div className="flex flex-wrap gap-3 mt-5">
                      <button
                        onClick={() => setActivePage('pairing')}
                        className="px-4 py-2.5 bg-white text-emerald-800 hover:bg-emerald-50 rounded-xl text-xs font-bold flex items-center gap-2 shadow"
                      >
                        <Smartphone className="w-4 h-4" /> {isOnline ? 'Manage WhatsApp Link' : 'Connect WhatsApp Now'}
                      </button>
                      {isOnline && (
                        <button
                          onClick={handleDisconnect}
                          className="px-4 py-2.5 bg-red-500/20 hover:bg-red-500/30 border border-red-300/40 text-white rounded-xl text-xs font-bold flex items-center gap-2"
                        >
                          <LogOut className="w-4 h-4" /> Disconnect
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
                  <div>
                    <h4 className="font-extrabold text-sm text-slate-800">Direct Server Integration</h4>
                    <p className="text-xs text-slate-500 mt-1">
                      বাইরের কোনো সার্ভার বা পেইড সার্ভিস ছাড়াই রিয়েল Baileys সকেটে হোয়াটসঅ্যাপ লিঙ্ক হবে।
                    </p>
                    <div className="mt-4 p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-[11px] text-emerald-900 leading-relaxed">
                      <strong>১০০% রিয়েল পেয়ারিং:</strong> লিংক ডিভাইসে গিয়ে এই কোডটি দিলেই সাথে সাথে বট এক্টিভ হয়ে যাবে।
                    </div>
                  </div>
                  <button
                    onClick={() => setActivePage('pairing')}
                    className="mt-4 w-full py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold rounded-xl text-xs flex items-center justify-center gap-2"
                  >
                    Open Pairing Screen
                  </button>
                </div>
              </div>

              {/* Recent Logs Preview */}
              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-bold text-sm text-slate-800">Recent Activity Logs</h4>
                  <button onClick={() => setActivePage('logs')} className="text-xs text-emerald-700 font-bold hover:underline">
                    View all logs
                  </button>
                </div>
                <div className="divide-y divide-slate-100">
                  {logs.slice(0, 4).map((log) => (
                    <div key={log.id} className="py-2.5 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                          <Activity className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-800">{log.action}</div>
                          <div className="text-[11px] text-slate-500">{log.message}</div>
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">{log.timestamp}</span>
                    </div>
                  ))}
                  {logs.length === 0 && <div className="text-center py-6 text-xs text-slate-400">No logs yet.</div>}
                </div>
              </div>
            </div>
          )}

          {/* PAGE: WHATSAPP CONNECT (PAIRING) */}
          {activePage === 'pairing' && (
            <div className="max-w-xl mx-auto space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-3 shadow-inner">
                  <Smartphone className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-black text-slate-800">রিয়েল হোয়াটসঅ্যাপ পেয়ারিং কোড</h2>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  ফোন নম্বর লিখুন এবং রিয়েল হোয়াটসঅ্যাপ সার্ভার থেকে পাওয়া ৮-সংখ্যার পেয়ারিং কোড দিয়ে আপনার ডিভাইস কানেক্ট করুন।
                </p>
              </div>

              {/* Already Connected Alert */}
              {isOnline ? (
                <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 shadow-sm">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                      <div className="flex items-center gap-2 font-bold text-sm">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" /> হোয়াটসঅ্যাপ ইতোমধ্যে সংযুক্ত আছে!
                      </div>
                      <div className="text-xs text-emerald-700 mt-1">
                        সংযুক্ত নাম্বার: <b>{dashboard.connection?.user?.id || 'Connected User'}</b>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleReconnect}
                        className="px-4 py-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 font-bold rounded-xl text-xs flex items-center gap-1.5 transition"
                      >
                        <RefreshCw className="w-4 h-4" />
                        Reconnect
                      </button>
                      <button
                        disabled={isDisconnecting}
                        onClick={handleDisconnect}
                        className="px-4 py-2 bg-red-100 hover:bg-red-200 disabled:opacity-50 text-red-700 font-bold rounded-xl text-xs flex items-center gap-1.5 transition"
                      >
                        {isDisconnecting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
                        {isDisconnecting ? 'Disconnecting...' : 'Logout'}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {dashboard.connection?.conflict && (
                    <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 shadow-sm flex items-center justify-between flex-wrap gap-3">
                      <div className="flex items-center gap-3">
                        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                        <div>
                          <div className="font-bold text-xs">পূর্ববর্তী সেশন অন্য ডিভাইসে চালু হয়েছে (Session Conflict)</div>
                          <div className="text-[11px] text-amber-700 mt-0.5">
                            আগের সেশনটি চালু করতে Reconnect চাপুন অথবা নিচে আপনার নম্বর লিখে নতুন পেয়ারিং কোড নিন।
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={handleReconnect}
                        className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow transition"
                      >
                        <RefreshCw className="w-3.5 h-3.5" /> Reconnect
                      </button>
                    </div>
                  )}

                  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      হোয়াটসঅ্যাপ মোবাইল নম্বর (Country code সহ)
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="যেমন: 88017XXXXXXXX বা 88018XXXXXXXX"
                      className="w-full h-12 px-4 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-sm font-medium outline-none transition"
                    />
                    <p className="text-[11px] text-slate-400 mt-1.5">
                      বাংলাদেশের জন্য: <strong>8801XXXXXXXXX</strong> (কোনো স্পেস বা প্লাস চিহ্ন ছাড়া)
                    </p>
                  </div>

                  <button
                    disabled={isGenerating}
                    onClick={handleGeneratePairing}
                    className="w-full h-12 bg-[#087f55] hover:bg-[#066c49] disabled:opacity-60 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-700/20 transition"
                  >
                    {isGenerating ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" /> WhatsApp সার্ভার থেকে কোড আনা হচ্ছে...
                      </>
                    ) : (
                      <>
                        <KeyRound className="w-4 h-4" /> Generate Real Pairing Code
                      </>
                    )}
                  </button>

                  {/* Real Code Display Box */}
                  {pairingCode && (
                    <div className="mt-5 p-6 rounded-2xl bg-gradient-to-b from-emerald-50/60 to-emerald-100/40 border-2 border-dashed border-emerald-300 text-center space-y-4">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                        <Check className="w-3.5 h-3.5" /> Official WhatsApp Pairing Code
                      </div>
                      
                      <div className="text-xs font-bold text-slate-700">আপনার ৮-সংখ্যার রিয়েল পেয়ারিং কোড</div>

                      <div className="font-mono text-3xl md:text-4xl font-extrabold tracking-[8px] text-[#087f55] bg-white px-6 py-3 rounded-2xl border border-emerald-200 inline-block shadow-sm">
                        {pairingCode}
                      </div>

                      <div className="flex items-center justify-center gap-2 text-xs font-semibold text-slate-600">
                        <Clock className="w-4 h-4 text-emerald-600" />
                        {countdown > 0 ? (
                          <span>মেয়াদ বাকি: <b className="text-emerald-700">{countdown}</b> সেকেন্ড</span>
                        ) : (
                          <span className="text-red-500 font-bold">মেয়াদ শেষ। অনুগ্রহ করে নতুন কোড নিন।</span>
                        )}
                      </div>

                      <div className="flex justify-center gap-3">
                        <button
                          onClick={copyCode}
                          className="px-4 py-2 bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
                        >
                          <Copy className="w-3.5 h-3.5" /> Copy Code
                        </button>
                        <button
                          onClick={handleGeneratePairing}
                          className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
                        >
                          <RefreshCw className="w-3.5 h-3.5" /> New Code
                        </button>
                      </div>

                      {/* Instructions */}
                      <div className="mt-4 p-4 bg-white rounded-xl border border-slate-200 text-left text-xs space-y-2 text-slate-700">
                        <div className="font-extrabold text-slate-800 flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" /> কীভাবে ফোনে প্রবেশ করাবেন:
                        </div>
                        <ol className="list-decimal list-inside space-y-1 text-slate-600 text-[11px] leading-relaxed">
                          <li>ফোনে <b>WhatsApp</b> অ্যাপ খুলুন।</li>
                          <li>ওপরের ডানদিকের ৩টি ডট চাপুন &gt; <b>Linked devices</b> (সংযুক্ত ডিভাইস) এ যান।</li>
                          <li><b>Link a device</b> বোতামে চাপুন।</li>
                          <li>নিচে থাকা <b>"Link with phone number instead"</b> নির্বাচন করুন।</li>
                          <li>ওপরে দেখানো কোডটি (<b>{pairingCode}</b>) WhatsApp-এ লিখুন।</li>
                        </ol>
                      </div>
                    </div>
                  )}

                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-[11px] text-slate-600 leading-relaxed">
                    <strong>নোট:</strong> এটি লোকাল ফেক জেনারেটর নয়। কোডটি হোয়াটসঅ্যাপ সার্ভার থেকে লাইভ আনা হয় এবং এটি ৬০ সেকেন্ড পর্যন্ত কার্যকর থাকে।
                  </div>
                </div>
                </>
              )}
            </div>
          )}
          {activePage === 'ai' && (
            <div className="max-w-2xl mx-auto space-y-6">
              <div>
                <h1 className="text-2xl font-black text-slate-800">AI Personality & Moderation</h1>
                <p className="text-xs text-slate-500 mt-1">Configure automated intelligence and bot character.</p>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-pink-50 text-pink-600 flex items-center justify-center">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-800">Bot Identity ({dashboard.config?.botName || 'মায়া'})</h3>
                    <p className="text-[11px] text-slate-400">Manage bot character and AI behavior</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="py-3 flex items-center justify-between border-b border-slate-50">
                    <div>
                      <strong className="text-xs text-slate-800 block">Enable Bot Personality</strong>
                      <span className="text-[11px] text-slate-400">বট নিজের ইচ্ছা মত মজার মজার রিপ্লাই দিবে</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={dashboard.settings?.personalityEnabled ?? true}
                      onChange={() => toggleSetting('personalityEnabled')}
                      className="w-5 h-5 accent-emerald-600 cursor-pointer"
                    />
                  </div>

                  <div className="py-3 flex items-center justify-between border-b border-slate-50">
                    <div>
                      <strong className="text-xs text-slate-800 block">Enable AI Moderation</strong>
                      <span className="text-[11px] text-slate-400">Gemini AI দিয়ে মেসেজ বিশ্লেষণ করবে</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={dashboard.settings?.aiModeration ?? true}
                      onChange={() => toggleSetting('aiModeration')}
                      className="w-5 h-5 accent-emerald-600 cursor-pointer"
                    />
                  </div>
                </div>

                <div className="space-y-4 pt-2">
                  {/* AI GENDER / PERSONA SELECTION BUTTONS */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-2">AI Persona & Gender (বটের মোড ও লিঙ্গ)</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setDashboard(prev => ({
                          ...prev,
                          config: {
                            ...prev.config,
                            botGender: 'female',
                            botName: (prev.config?.botName === 'মায়ান' || !prev.config?.botName) ? 'মায়া' : prev.config.botName
                          }
                        }))}
                        className={`p-4 rounded-2xl border text-left transition flex items-center gap-3 ${
                          (dashboard.config?.botGender || 'female') === 'female'
                            ? 'bg-pink-50/80 border-pink-500 text-pink-900 ring-2 ring-pink-500/20 shadow-sm font-bold'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100/80'
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 ${
                          (dashboard.config?.botGender || 'female') === 'female' ? 'bg-pink-200/80 text-pink-700' : 'bg-slate-200 text-slate-500'
                        }`}>
                          👧
                        </div>
                        <div>
                          <strong className="block text-xs">মেয়ে AI (মায়া)</strong>
                          <span className="text-[10px] text-slate-500 font-normal leading-snug block">মিষ্টি ও বুদ্ধিমতী মেয়ে ভয়েস/টোন</span>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setDashboard(prev => ({
                          ...prev,
                          config: {
                            ...prev.config,
                            botGender: 'male',
                            botName: (prev.config?.botName === 'মায়া' || !prev.config?.botName) ? 'মায়ান' : prev.config.botName
                          }
                        }))}
                        className={`p-4 rounded-2xl border text-left transition flex items-center gap-3 ${
                          dashboard.config?.botGender === 'male'
                            ? 'bg-blue-50/80 border-blue-500 text-blue-900 ring-2 ring-blue-500/20 shadow-sm font-bold'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100/80'
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 ${
                          dashboard.config?.botGender === 'male' ? 'bg-blue-200/80 text-blue-700' : 'bg-slate-200 text-slate-500'
                        }`}>
                          👦
                        </div>
                        <div>
                          <strong className="block text-xs">ছেলে AI (মায়ান)</strong>
                          <span className="text-[10px] text-slate-500 font-normal leading-snug block">স্মার্ট ও হ্যান্ডসাম ভাই/বয়ের টোন</span>
                        </div>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Bot Name (বটের নাম)</label>
                    <input
                      type="text"
                      value={dashboard.config?.botName || (dashboard.config?.botGender === 'male' ? 'মায়ান' : 'মায়া')}
                      onChange={(e) => setDashboard(prev => ({ ...prev, config: { ...prev.config, botName: e.target.value } }))}
                      className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm font-medium outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Custom AI Instructions</label>
                    <textarea
                      value={dashboard.config?.aiPrompt || ''}
                      onChange={(e) => setDashboard(prev => ({ ...prev, config: { ...prev.config, aiPrompt: e.target.value } }))}
                      className="w-full h-24 p-4 rounded-xl border border-slate-200 text-xs outline-none focus:border-emerald-500 resize-none"
                    />
                  </div>
                </div>

                <button
                  onClick={() => saveConfig('ai')}
                  className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs transition"
                >
                  Save Identity & AI Settings
                </button>
              </div>
            </div>
          )}

          {/* PAGE: GROUPS */}
          {activePage === 'groups' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-black text-slate-800">Connected Groups</h1>
                  <p className="text-xs text-slate-500 mt-1">All WhatsApp groups the bot is participating in.</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={async () => {
                      try {
                        await apiCall('/api/cache/clear', 'POST');
                        showToast('অ্যাডমিন ক্যাশ ক্লিয়ার হয়েছে');
                        fetchGroups();
                      } catch (e) {}
                    }}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Clear Admin Cache
                  </button>
                  <button
                    onClick={fetchGroups}
                    className="px-4 py-2 bg-[#087f55] hover:bg-[#066c49] text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow shadow-emerald-700/20 transition"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Refresh Groups
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="p-4">Group Name</th>
                      <th className="p-4">Group ID</th>
                      <th className="p-4">Members</th>
                      <th className="p-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {groups.map((g) => (
                      <tr key={g.id} className="hover:bg-slate-50/70 transition">
                        <td className="p-4 font-bold text-slate-800">{g.name}</td>
                        <td className="p-4 font-mono text-[11px] text-slate-400">{g.id}</td>
                        <td className="p-4 font-semibold text-slate-600">{g.participants} members</td>
                        <td className="p-4">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                            <Check className="w-3 h-3" /> Connected
                          </span>
                        </td>
                      </tr>
                    ))}
                    {groups.length === 0 && (
                      <tr>
                        <td colSpan={4} className="text-center py-12 text-slate-400 text-xs">
                          {isOnline ? 'কোনো গ্রুপ পাওয়া যায়নি বা লোড হচ্ছে...' : 'হোয়াটসঅ্যাপ সংযুক্ত নেই। আগে Connect পেজে যান।'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* PAGE: SECURITY */}
          {activePage === 'security' && (
            <div className="max-w-2xl mx-auto space-y-6">
              <div>
                <h1 className="text-2xl font-black text-slate-800">Security & Group Protection</h1>
                <p className="text-xs text-slate-500 mt-1">Configure automated real-time defense rules.</p>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm divide-y divide-slate-100">
                <div className="py-4 flex items-center justify-between">
                  <div>
                    <strong className="text-xs text-slate-800 block">Anti Bad Words</strong>
                    <span className="text-[11px] text-slate-400">গালি শনাক্ত করবে</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={dashboard.settings?.antiBadWords ?? true}
                    onChange={() => toggleSetting('antiBadWords')}
                    className="w-5 h-5 accent-emerald-600 cursor-pointer"
                  />
                </div>

                <div className="py-4 flex items-center justify-between">
                  <div>
                    <strong className="text-xs text-slate-800 block">Auto Kick Slurs (গালি দিলে রিমুভ)</strong>
                    <span className="text-[11px] text-slate-400">কাউকে গালি দিলে সরাসরি গ্রুপ থেকে বের করে দিবে</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={dashboard.settings?.autoKickSlurs ?? true}
                    onChange={() => toggleSetting('autoKickSlurs')}
                    className="w-5 h-5 accent-emerald-600 cursor-pointer"
                  />
                </div>

                <div className="py-4 flex items-center justify-between">
                  <div>
                    <strong className="text-xs text-slate-800 block">Anti Sticker (স্টিকার রিমুভ)</strong>
                    <span className="text-[11px] text-slate-400">গ্রুপে স্টিকার দিলে স্বয়ংক্রিয়ভাবে ডিলিট করবে</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={dashboard.settings?.antiSticker ?? true}
                    onChange={() => toggleSetting('antiSticker')}
                    className="w-5 h-5 accent-emerald-600 cursor-pointer"
                  />
                </div>

                <div className="py-4 flex items-center justify-between">
                  <div>
                    <strong className="text-xs text-slate-800 block">Anti GIF (জিআইএফ রিমুভ)</strong>
                    <span className="text-[11px] text-slate-400">গ্রুপে জিআইএফ (GIF) বা অ্যানিমেশন ভিডিও দিলে দ্রুত ডিলিট করবে</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={dashboard.settings?.antiGif ?? true}
                    onChange={() => toggleSetting('antiGif')}
                    className="w-5 h-5 accent-emerald-600 cursor-pointer"
                  />
                </div>

                <div className="py-4 flex items-center justify-between">
                  <div>
                    <strong className="text-xs text-slate-800 block">Anti Video (ভিডিও রিমুভ)</strong>
                    <span className="text-[11px] text-slate-400">গ্রুপে ভিডিও পাঠালে সাথে সাথে ডিলিট করবে</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={dashboard.settings?.antiVideo ?? true}
                    onChange={() => toggleSetting('antiVideo')}
                    className="w-5 h-5 accent-emerald-600 cursor-pointer"
                  />
                </div>

                <div className="py-4 flex items-center justify-between">
                  <div>
                    <strong className="text-xs text-slate-800 block">Anti Image (ছবি রিমুভ)</strong>
                    <span className="text-[11px] text-slate-400">গ্রুপে যেকোনো ছবি শেয়ার করলে দ্রুত ডিলিট করবে</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={dashboard.settings?.mediaReview ?? true}
                    onChange={() => toggleSetting('mediaReview')}
                    className="w-5 h-5 accent-emerald-600 cursor-pointer"
                  />
                </div>

                <div className="py-4 flex items-center justify-between">
                  <div>
                    <strong className="text-xs text-slate-800 block">Anti Link</strong>
                    <span className="text-[11px] text-slate-400">স্ক্যাম বা অন্য হোয়াটসঅ্যাপ গ্রুপের লিঙ্ক শেয়ার আটকাবে</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={dashboard.settings?.antiLink ?? true}
                    onChange={() => toggleSetting('antiLink')}
                    className="w-5 h-5 accent-emerald-600 cursor-pointer"
                  />
                </div>

                <div className="py-4 flex items-center justify-between">
                  <div>
                    <strong className="text-xs text-slate-800 block">Auto Warning</strong>
                    <span className="text-[11px] text-slate-400">নিয়ম ভঙ্গকারীকে স্বয়ংক্রিয়ভাবে সতর্কবার্তা পাঠাবে</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={dashboard.settings?.autoWarning ?? true}
                    onChange={() => toggleSetting('autoWarning')}
                    className="w-5 h-5 accent-emerald-600 cursor-pointer"
                  />
                </div>

                <div className="py-4 flex items-center justify-between">
                  <div>
                    <strong className="text-xs text-slate-800 block">Anti Flood (অতিরিক্ত মিডিয়া আটকানো)</strong>
                    <span className="text-[11px] text-slate-400">কেউ খুব দ্রুত অতিরিক্ত স্টিকার বা GIF দিলে তাকে কিক করা হবে</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={dashboard.settings?.antiFlood ?? true}
                    onChange={() => toggleSetting('antiFlood')}
                    className="w-5 h-5 accent-emerald-600 cursor-pointer"
                  />
                </div>

                <div className="py-4 flex items-center justify-between">
                  <div>
                    <strong className="text-xs text-slate-800 block">Admin Protection</strong>
                    <span className="text-[11px] text-slate-400">গ্রুপ অ্যাডমিনদের নিয়ম পরীক্ষা থেকে অব্যাহতি দিবে</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={dashboard.settings?.adminProtection ?? true}
                    onChange={() => toggleSetting('adminProtection')}
                    className="w-5 h-5 accent-emerald-600 cursor-pointer"
                  />
                </div>
              </div>

              {/* CUSTOM BAD WORDS & SLURS BOX */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center font-black">
                      <Ban className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-sm text-slate-800">Custom Slurs Box (কাস্টম গালি যুক্ত করুন)</h3>
                      <p className="text-[11px] text-slate-400">নিজের তৈরি খারাপ শব্দ বা নিষিদ্ধ বাক্য যোগ করুন, মায়া ডিলিট করে দিবে</p>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-red-50 text-red-700 text-xs font-bold border border-red-200">
                    {dashboard.config?.customBadWords?.length || 0}টি শব্দ
                  </span>
                </div>

                <div className="flex gap-2 pt-1">
                  <input
                    type="text"
                    value={newBadWordInput}
                    onChange={(e) => setNewBadWordInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCustomBadWord();
                      }
                    }}
                    placeholder="এখানে খারাপ শব্দ লিখুন (যেমন: খারাপশব্দ)..."
                    className="flex-1 h-11 px-4 rounded-xl border border-slate-200 text-xs font-medium outline-none focus:border-red-500"
                  />
                  <button
                    onClick={handleAddCustomBadWord}
                    className="px-5 h-11 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition shadow-sm"
                  >
                    <Plus className="w-4 h-4" /> শব্দ যুক্ত করুন
                  </button>
                </div>

                {/* Custom Words Chip List */}
                <div className="pt-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-700">বর্তমানে তালিকায় থাকা কাস্টম শব্দসমূহ:</span>
                    {(dashboard.config?.customBadWords?.length || 0) > 0 && (
                      <button
                        onClick={handleClearAllCustomBadWords}
                        className="text-[11px] font-bold text-red-600 hover:text-red-800 flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> সব ক্লিয়ার করুন
                      </button>
                    )}
                  </div>

                  {(!dashboard.config?.customBadWords || dashboard.config.customBadWords.length === 0) ? (
                    <div className="p-4 bg-slate-50 rounded-2xl text-center text-xs text-slate-400 border border-dashed border-slate-200">
                      এখনো কোনো কাস্টম গালি যোগ করা হয়নি। ওপরের বক্সে লিখে "শব্দ যুক্ত করুন" চাপুন অথবা হোয়াটসঅ্যাপে লিখুন <b>.addbadword &lt;শব্দ&gt;</b>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-100 max-h-48 overflow-y-auto">
                      {dashboard.config.customBadWords.map((word, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-red-700 text-xs font-semibold rounded-xl border border-red-200 shadow-2xs group"
                        >
                          <span>{word}</span>
                          <button
                            onClick={() => handleRemoveCustomBadWord(word)}
                            className="w-4 h-4 rounded-full hover:bg-red-100 flex items-center justify-center text-red-500 hover:text-red-700 transition"
                            title="শব্দটি মুছুন"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-800 leading-relaxed flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <b>হোয়াটসঅ্যাপ চ্যাট কমান্ড:</b> মেসেজে লিখুন <code className="bg-amber-100 px-1 py-0.5 rounded font-mono text-[10px]">.addbadword &lt;শব্দ&gt;</code> (শব্দ যোগ করতে), <code className="bg-amber-100 px-1 py-0.5 rounded font-mono text-[10px]">.delbadword &lt;শব্দ&gt;</code> (শব্দ মুছতে), অথবা <code className="bg-amber-100 px-1 py-0.5 rounded font-mono text-[10px]">.badwords</code> (তালিকা দেখতে)।
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* PAGE: INTEGRATIONS */}
          {activePage === 'integrations' && (
            <div className="max-w-2xl mx-auto space-y-6">
              <div>
                <h1 className="text-2xl font-black text-slate-800">API & Integrations</h1>
                <p className="text-xs text-slate-500 mt-1">Configure server endpoints and external credentials.</p>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-800">Google Gemini AI (জেডমিনি এপিআই)</h3>
                    <p className="text-[11px] text-slate-400">AI-powered moderation and personality</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Gemini API Key (এপিআই কি)</label>
                    <input
                      type="password"
                      value={dashboard.config?.geminiApiKey || ''}
                      onChange={(e) => setDashboard(prev => ({ ...prev, config: { ...prev.config, geminiApiKey: e.target.value } }))}
                      placeholder="এখানে আপনার Gemini API Key দিন"
                      className="w-full h-10 px-4 rounded-xl border border-slate-200 text-sm outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Gemini Model</label>
                    <select
                      value={dashboard.config?.geminiModel || 'gemini-3.8-flash'}
                      onChange={(e) => setDashboard(prev => ({ ...prev, config: { ...prev.config, geminiModel: e.target.value } }))}
                      className="w-full h-10 px-4 rounded-xl border border-slate-200 text-sm outline-none focus:border-emerald-500"
                    >
                      <option value="gemini-3.8-flash">Gemini 3.8 Flash (Recommended - Fastest & Latest)</option>
                      <option value="gemini-3.1-flash-lite">Gemini 3.1 Flash Lite (Lightweight)</option>
                      <option value="gemini-4-argon">Gemini 4 Argon (Advanced)</option>
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => saveConfig('gemini')}
                      className="flex-1 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition"
                    >
                      Save Gemini Config
                    </button>
                    <button
                      onClick={() => testConfig('gemini')}
                      className="px-4 py-2 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-xl text-xs font-bold transition"
                    >
                      Test AI
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Webhook className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-800">WhatsApp Cloud API (Meta)</h3>
                    <p className="text-[11px] text-slate-400">মেটা অফিসিয়াল এপিআই ক্রেডেনশিয়াল (ঐচ্ছিক)</p>
                    <p className="text-[9px] text-blue-600 mt-1">ID কোথায় পাবেন? developers.facebook.com &gt; WhatsApp &gt; Getting Started</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Access Token (অ্যাক্সেস টোকেন)</label>
                    <input
                      type="password"
                      value={dashboard.config?.waToken || ''}
                      onChange={(e) => setDashboard(prev => ({ ...prev, config: { ...prev.config, waToken: e.target.value } }))}
                      placeholder="EAAB..."
                      className="w-full h-10 px-4 rounded-xl border border-slate-200 text-sm outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Phone ID (ফোন আইডি)</label>
                      <input
                        type="text"
                        value={dashboard.config?.phoneId || ''}
                        onChange={(e) => setDashboard(prev => ({ ...prev, config: { ...prev.config, phoneId: e.target.value } }))}
                        className="w-full h-10 px-4 rounded-xl border border-slate-200 text-sm outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">WABA ID (ওয়াবা আইডি)</label>
                      <input
                        type="text"
                        value={dashboard.config?.wabaId || ''}
                        onChange={(e) => setDashboard(prev => ({ ...prev, config: { ...prev.config, wabaId: e.target.value } }))}
                        className="w-full h-10 px-4 rounded-xl border border-slate-200 text-sm outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => saveConfig('whatsapp')}
                    className="w-full py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition"
                  >
                    Save Meta Config
                  </button>
                </div>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 text-slate-600 flex items-center justify-center">
                    <Plug className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-800">Baileys Socket Server URL</h3>
                    <p className="text-[11px] text-slate-400">ফাঁকা রাখলে বিল্ট-ইন রিয়েল সার্ভার ব্যবহৃত হবে</p>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Custom Baileys Server URL (Optional)</label>
                  <input
                    type="text"
                    value={customBaileysUrl}
                    onChange={(e) => setCustomBaileysUrl(e.target.value)}
                    placeholder="https://your-server.com"
                    className="w-full h-11 px-4 rounded-xl border border-slate-200 text-xs font-mono outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => saveConfig('baileys')}
                    className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition"
                  >
                    Save URL
                  </button>
                  <button
                    onClick={() => {
                      setCustomBaileysUrl('');
                      localStorage.removeItem('wg_server');
                      showToast('Default Internal Server restored!');
                    }}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
                  >
                    Reset to Default
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* PAGE: LOGS */}
          {activePage === 'logs' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-black text-slate-800">Activity Logs</h1>
                  <p className="text-xs text-slate-500 mt-1">Live audit log from Baileys engine and security triggers.</p>
                </div>
                <button
                  onClick={fetchLogs}
                  className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Refresh Logs
                </button>
              </div>

              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-4 divide-y divide-slate-100">
                {logs.map((log) => (
                  <div key={log.id} className="py-3 flex items-start justify-between text-xs gap-3">
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                        log.level === 'error' ? 'bg-red-50 text-red-600' :
                        log.level === 'warn' ? 'bg-amber-50 text-amber-600' :
                        log.level === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-600'
                      }`}>
                        <Activity className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-slate-800">{log.action}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{log.message}</div>
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono shrink-0">{log.timestamp}</span>
                  </div>
                ))}
                {logs.length === 0 && <div className="text-center py-10 text-slate-400 text-xs">No logs recorded yet.</div>}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 py-2 px-3 flex justify-around z-40">
        <button
          onClick={() => setActivePage('home')}
          className={`flex flex-col items-center gap-1 text-[10px] ${activePage === 'home' ? 'text-emerald-700 font-bold' : 'text-slate-400'}`}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span>Home</span>
        </button>
        <button
          onClick={() => setActivePage('pairing')}
          className={`flex flex-col items-center gap-1 text-[10px] ${activePage === 'pairing' ? 'text-emerald-700 font-bold' : 'text-slate-400'}`}
        >
          <Smartphone className="w-5 h-5" />
          <span>Connect</span>
        </button>
        <button
          onClick={() => setActivePage('groups')}
          className={`flex flex-col items-center gap-1 text-[10px] ${activePage === 'groups' ? 'text-emerald-700 font-bold' : 'text-slate-400'}`}
        >
          <Users className="w-5 h-5" />
          <span>Groups</span>
        </button>
        <button
          onClick={() => setActivePage('security')}
          className={`flex flex-col items-center gap-1 text-[10px] ${activePage === 'security' ? 'text-emerald-700 font-bold' : 'text-slate-400'}`}
        >
          <ShieldCheck className="w-5 h-5" />
          <span>Security</span>
        </button>
        <button
          onClick={() => setActivePage('logs')}
          className={`flex flex-col items-center gap-1 text-[10px] ${activePage === 'logs' ? 'text-emerald-700 font-bold' : 'text-slate-400'}`}
        >
          <ClipboardList className="w-5 h-5" />
          <span>Logs</span>
        </button>
        <button
          onClick={() => setActivePage('integrations')}
          className={`flex flex-col items-center gap-1 text-[10px] ${activePage === 'integrations' ? 'text-emerald-700 font-bold' : 'text-slate-400'}`}
        >
          <Plug className="w-5 h-5" />
          <span>API Keys</span>
        </button>
      </nav>
    </div>
  );
}
