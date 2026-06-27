import React, { useState, useEffect, useRef } from "react";
import { 
  Clock, 
  Settings as SettingsIcon, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Loader2, 
  RefreshCw, 
  FileCode, 
  Trash2, 
  History, 
  User, 
  MapPin, 
  ChevronRight,
  Info,
  Sliders,
  Play,
  Square,
  Terminal,
  Calendar,
  Layers,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Plus,
  Eye,
  EyeOff,
  Check,
  SlidersHorizontal,
  Upload,
  Download,
  FileSpreadsheet
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

// Types
interface LogEntry {
  timestamp: string;
  message: string;
  section: string;
}

interface AppSettings {
  email: string;
  password?: string;
  url: string;
  loginTime: string;
  checkInterval: number;
  days: string[];
  enableHolidayCheck: boolean;
  randomizeLogin: boolean;
  employeeName: string;
  answersJson: string;
  sessionCookie?: string;
  geminiApiKey?: string;
  useDaySpecificJson?: boolean;
  daySpecificAnswersJson?: Record<string, string>;
}

export default function App() {
  // Navigation tabs: 'dashboard' | 'logs' | 'settings'
  const [activeTab, setActiveTab] = useState<"dashboard" | "logs" | "settings">("dashboard");

  // User Authentication state
  const [currentUser, setCurrentUser] = useState<{ email: string; employeeName: string; settings: AppSettings; lastLoginTime: string | null } | null>(null);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authEmployeeName, setAuthEmployeeName] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isMeLoaded, setIsMeLoaded] = useState(false);

  // State loaded from server
  const [settings, setSettings] = useState<AppSettings>({
    email: "your@email.com",
    password: "",
    url: "https://forms.monday.com/workforms/external/forms/726fd8547dbaa83d6c0d70f891d97be7/submissions?r=use1",
    loginTime: "08:30",
    checkInterval: 60,
    days: ["monday", "tuesday", "wednesday", "thursday", "friday"],
    enableHolidayCheck: true,
    randomizeLogin: true,
    employeeName: "Your Name",
    answersJson: "{}",
    sessionCookie: "",
    geminiApiKey: "",
    useDaySpecificJson: false,
    daySpecificAnswersJson: {
      monday: "",
      tuesday: "",
      wednesday: "",
      thursday: "",
      friday: "",
      saturday: "",
      sunday: ""
    }
  });

  const [isSchedulerRunning, setIsSchedulerRunning] = useState<boolean>(true);
  const [lastLoginTime, setLastLoginTime] = useState<string | null>(null);
  const [backendLogs, setBackendLogs] = useState<LogEntry[]>([]);

  // Local/UI editing states
  const [pythonCode, setPythonCode] = useState<string>("");
  const [importFeedback, setImportFeedback] = useState<{ success: boolean; message: string } | null>(null);

  // Check session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await fetch("/api/auth/me");
        const result = await res.json();
        if (result.status === "ok" && result.user) {
          setCurrentUser(result.user);
          setSettings(result.user.settings);
          setLastLoginTime(result.user.lastLoginTime);
        }
      } catch (err) {
        console.error("Session check error:", err);
      } finally {
        setIsMeLoaded(true);
      }
    };
    checkSession();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authEmail.trim() || !authPassword) {
      setAuthError("Please fill in all fields.");
      return;
    }
    try {
      setAuthLoading(true);
      setAuthError(null);
      const res = await fetch("/api/auth/login", {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({ email: authEmail, password: authPassword })
      });
      const result = await res.json();
      if (result.status === "ok") {
        setCurrentUser(result.user);
        setSettings(result.user.settings);
        setLastLoginTime(result.user.lastLoginTime);
        setAuthPassword("");
        setFeedbackMsg({ type: "success", text: "Logged in successfully!" });
        setTimeout(() => setFeedbackMsg(null), 3500);
      } else {
        setAuthError(result.message || "Invalid credentials");
      }
    } catch (err: any) {
      setAuthError("Failed to connect to server");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authEmail.trim() || !authPassword || !authEmployeeName.trim()) {
      setAuthError("Please fill in all fields.");
      return;
    }
    try {
      setAuthLoading(true);
      setAuthError(null);
      const res = await fetch("/api/auth/register", {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({ email: authEmail, password: authPassword, employeeName: authEmployeeName })
      });
      const result = await res.json();
      if (result.status === "ok") {
        setCurrentUser(result.user);
        setSettings(result.user.settings);
        setLastLoginTime(result.user.lastLoginTime);
        setAuthPassword("");
        setFeedbackMsg({ type: "success", text: "Account registered successfully!" });
        setTimeout(() => setFeedbackMsg(null), 3500);
      } else {
        setAuthError(result.message || "Registration failed");
      }
    } catch (err: any) {
      setAuthError("Failed to connect to server");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setCurrentUser(null);
      setSettings({
        email: "",
        password: "",
        url: "",
        loginTime: "08:30",
        checkInterval: 60,
        days: ["monday", "tuesday", "wednesday", "thursday", "friday"],
        enableHolidayCheck: true,
        randomizeLogin: true,
        employeeName: "",
        answersJson: "{}",
        sessionCookie: "",
        geminiApiKey: "",
        useDaySpecificJson: false,
        daySpecificAnswersJson: {
          monday: "",
          tuesday: "",
          wednesday: "",
          thursday: "",
          friday: "",
          saturday: "",
          sunday: ""
        }
      });
      setFeedbackMsg({ type: "success", text: "Logged out successfully" });
      setTimeout(() => setFeedbackMsg(null), 3500);
    } catch (err) {
      console.error("Logout error:", err);
    }
  };
  


  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [selectedConfigDay, setSelectedConfigDay] = useState<string>("monday");
  const [fieldLabels, setFieldLabels] = useState<Record<string, string>>({});

  // Interactive Mobile Form States & Helpers
  const [isJsonViewActive, setIsJsonViewActive] = useState<boolean>(false);
  const [newFieldName, setNewFieldName] = useState<string>("");
  const [newFieldType, setNewFieldType] = useState<"text" | "boolean" | "number">("text");

  const commonTimezones = [
    { label: "Singapore / Manila / Taipei (UTC+8)", offset: -480 },
    { label: "Tokyo / Seoul (UTC+9)", offset: -540 },
    { label: "London / GMT (UTC+0)", offset: 0 },
    { label: "New York / EST (UTC-5)", offset: 300 },
    { label: "Los Angeles / PST (UTC-8)", offset: 480 },
    { label: "Sydney / Melbourne (UTC+10)", offset: -600 },
    { label: "Western Europe (UTC+1)", offset: -60 },
  ];

  const getParsedPayload = () => {
    try {
      const parsed = JSON.parse(settings.answersJson || "{}");
      return {
        answers: parsed.answers || {},
        timezone: parsed["form-timezone-offset"] !== undefined ? parsed["form-timezone-offset"] : -480,
        tags: parsed.tags || []
      };
    } catch (e) {
      return { answers: {}, timezone: -480, tags: [] };
    }
  };

  const updatePayloadField = (key: string, value: any) => {
    const payload = getParsedPayload();
    payload.answers[key] = value;
    
    // Auto-sync top-level email settings if updating the email field key
    let updatedEmail = settings.email;
    if (key === "name" || key.startsWith("email_")) {
      updatedEmail = String(value);
    }

    setSettings(prev => ({
      ...prev,
      email: updatedEmail,
      answersJson: JSON.stringify({
        answers: payload.answers,
        "form-timezone-offset": payload.timezone,
        tags: payload.tags
      }, null, 2)
    }));
  };

  const deletePayloadField = (key: string) => {
    const payload = getParsedPayload();
    delete payload.answers[key];
    setSettings(prev => ({
      ...prev,
      answersJson: JSON.stringify({
        answers: payload.answers,
        "form-timezone-offset": payload.timezone,
        tags: payload.tags
      }, null, 2)
    }));
  };

  const addPayloadField = () => {
    if (!newFieldName.trim()) return;
    const payload = getParsedPayload();
    
    // Default values by type
    let defaultValue: any = "";
    if (newFieldType === "boolean") defaultValue = false;
    if (newFieldType === "number") defaultValue = 0;

    payload.answers[newFieldName.trim()] = defaultValue;
    setSettings(prev => ({
      ...prev,
      answersJson: JSON.stringify({
        answers: payload.answers,
        "form-timezone-offset": payload.timezone,
        tags: payload.tags
      }, null, 2)
    }));
    setNewFieldName("");
  };

  const updateTimezoneOffset = (offset: number) => {
    const payload = getParsedPayload();
    setSettings(prev => ({
      ...prev,
      answersJson: JSON.stringify({
        answers: payload.answers,
        "form-timezone-offset": offset,
        tags: payload.tags
      }, null, 2)
    }));
  };

  const getFriendlyLabel = (key: string) => {
    if (fieldLabels && fieldLabels[key]) {
      return fieldLabels[key];
    }
    return key;
  };

  const logsEndRef = useRef<HTMLDivElement>(null);

  // Sync clock
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch initial configuration on mount
  const refreshStatus = async (isPoll: boolean = false) => {
    try {
      const res = await fetch("/api/scheduler/status");
      if (res.status === 401) {
        setCurrentUser(null);
        return;
      }
      const result = await res.json();
      if (result.status === "ok") {
        setIsSchedulerRunning(result.running);
        if (!isPoll) {
          setSettings(result.settings);
        }
        setLastLoginTime(result.lastLoginTime);
      }
    } catch (err) {
      console.error("Error loading status:", err);
    }
  };

  const refreshLogs = async () => {
    try {
      const res = await fetch("/api/logs");
      if (res.status === 401) {
        setCurrentUser(null);
        return;
      }
      const result = await res.json();
      if (result.status === "ok") {
        setBackendLogs(result.logs);
      }
    } catch (err) {
      console.error("Error loading logs:", err);
    }
  };

  const fetchFieldLabels = async () => {
    try {
      const res = await fetch("/api/field-labels");
      const result = await res.json();
      if (result.status === "ok" && result.labels) {
        setFieldLabels(result.labels);
      }
    } catch (err) {
      console.error("Error loading field labels:", err);
    }
  };

  useEffect(() => {
    refreshStatus(false);
    refreshLogs();
    fetchFieldLabels();

    // Poll logs and status periodically
    const statusTimer = setInterval(() => refreshStatus(true), 6000);
    const logsTimer = setInterval(refreshLogs, 3000);

    return () => {
      clearInterval(statusTimer);
      clearInterval(logsTimer);
    };
  }, []);

  // Auto scroll logs console to bottom
  useEffect(() => {
    if (activeTab === "logs") {
      logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [backendLogs, activeTab]);

  // Handle saving configurations to server
  const handleSaveSettings = async (updatedSettings: AppSettings) => {
    try {
      setActionLoading(true);
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedSettings)
      });
      const result = await response.json();
      if (result.status === "ok") {
        setFeedbackMsg({ type: "success", text: "Configurations saved to server!" });
        setSettings(updatedSettings);
        setTimeout(() => setFeedbackMsg(null), 3500);
        setActiveTab("dashboard");
      } else {
        throw new Error(result.message || "Failed to save settings");
      }
    } catch (error: any) {
      setFeedbackMsg({ type: "error", text: `Error: ${error.message}` });
      setTimeout(() => setFeedbackMsg(null), 5000);
    } finally {
      setActionLoading(false);
    }
  };

  // Toggle backend scheduler state
  const handleToggleScheduler = async () => {
    setActionLoading(true);
    const endpoint = isSchedulerRunning ? "/api/scheduler/stop" : "/api/scheduler/start";
    try {
      const res = await fetch(endpoint, { method: "POST" });
      const result = await res.json();
      if (result.status === "ok") {
        setIsSchedulerRunning(!isSchedulerRunning);
        setFeedbackMsg({
          type: "success",
          text: isSchedulerRunning ? "Scheduler stopped successfully." : "Scheduler daemon started."
        });
        setTimeout(() => setFeedbackMsg(null), 3500);
      }
    } catch (err: any) {
      setFeedbackMsg({ type: "error", text: `Failed toggling scheduler: ${err.message}` });
      setTimeout(() => setFeedbackMsg(null), 5000);
    } finally {
      setActionLoading(false);
    }
  };

  // Test Manual AutoLogin
  const handleManualTestLogin = async () => {
    setActionLoading(true);
    setFeedbackMsg(null);
    try {
      const res = await fetch("/api/login/test", { method: "POST" });
      const result = await res.json();
      if (result.status === "ok") {
        setFeedbackMsg({
          type: "success",
          text: "AutoLogin manual execution finished successfully!"
        });
        setTimeout(() => setFeedbackMsg(null), 5000);
        refreshStatus(false);
        refreshLogs();
      } else {
        throw new Error(result.message || "Execution error");
      }
    } catch (err: any) {
      setFeedbackMsg({ type: "error", text: `Manual Login Test Failed: ${err.message}` });
      setTimeout(() => setFeedbackMsg(null), 6000);
    } finally {
      setActionLoading(false);
    }
  };



  // Extract from Python Script
  const handleParsePython = () => {
    if (!pythonCode.trim()) {
      setImportFeedback({ success: false, message: "Please paste your Python code first." });
      return;
    }

    // RegEx patterns
    const emailRegex = /(?:email|email_mkrmv9fp|username)\s*[:=]\s*["']([^"'\s]+@[^"'\s]+\.[^"'\s]+)["']/i;
    const formUrlRegex = /(https:\/\/forms\.monday\.com\/workforms\/external\/forms\/[a-f0-9]{32}\/submissions\?r=[a-z0-9]+)/i;
    const loginTimeRegex = /(?:loginTime|login_time|time_string)\s*[:=]\s*["'](\d{2}:\d{2})["']/i;

    const emailMatch = pythonCode.match(emailRegex);
    const formUrlMatch = pythonCode.match(formUrlRegex);
    const loginTimeMatch = pythonCode.match(loginTimeRegex);

    let count = 0;
    const updated = { ...settings };

    if (emailMatch && emailMatch[1]) {
      updated.email = emailMatch[1];
      count++;
    }
    if (formUrlMatch && formUrlMatch[1]) {
      updated.url = formUrlMatch[1];
      count++;
    }
    if (loginTimeMatch && loginTimeMatch[1]) {
      updated.loginTime = loginTimeMatch[1];
      count++;
    }

    if (count > 0) {
      setSettings(updated);
      setImportFeedback({
        success: true,
        message: `Extracted ${count} variables successfully! Review configurations below and click "Save Configuration".`
      });
    } else {
      setImportFeedback({
        success: false,
        message: "Could not find any obvious Monday Form variables (email, URL, or time). Make sure your Python file is correctly copied."
      });
    }
    setTimeout(() => setImportFeedback(null), 7000);
  };

  // Preset week toggle
  const toggleDay = (day: string) => {
    const isSelected = settings.days.includes(day);
    const nextDays = isSelected
      ? settings.days.filter((d) => d !== day)
      : [...settings.days, day];
    setSettings({ ...settings, days: nextDays });
  };

  const isAndroidWebView = window.location.pathname === "/android" || window.location.search.includes("view=android");

  const [viewMode, setViewMode] = useState<"desktop" | "mobile">(() => {
    if (isAndroidWebView) return "mobile";
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("viewMode");
      if (saved === "desktop" || saved === "mobile") return saved;
    }
    return "desktop";
  });

  const toggleViewMode = () => {
    const next = viewMode === "desktop" ? "mobile" : "desktop";
    setViewMode(next);
    localStorage.setItem("viewMode", next);
  };

  const viewportClass = isAndroidWebView
    ? "w-full min-h-screen bg-[#12141C] flex flex-col font-sans text-slate-100 antialiased"
    : viewMode === "desktop"
      ? "min-h-screen bg-[#0A0C10] flex flex-col items-center justify-center font-sans text-slate-100 selection:bg-indigo-500/20 antialiased p-4 md:p-8"
      : "min-h-screen bg-[#0A0C10] flex flex-col items-center justify-center font-sans text-slate-100 selection:bg-indigo-500/20 antialiased p-0 md:py-8";

  const containerClass = isAndroidWebView
    ? "w-full min-h-screen bg-[#12141C] flex flex-col overflow-hidden relative"
    : viewMode === "desktop"
      ? "w-full max-w-md bg-[#12141C] rounded-[42px] border-8 border-[#222632] shadow-[0_0_80px_rgba(0,0,0,0.6)] flex flex-col overflow-hidden relative p-2"
      : "w-full max-w-md min-h-screen md:min-h-[820px] md:max-h-[850px] bg-[#12141C] md:rounded-[40px] md:border-8 md:border-[#222632] md:shadow-[0_0_80px_rgba(0,0,0,0.6)] flex flex-col overflow-hidden relative";

  if (!isMeLoaded) {
    return (
      <div className="min-h-screen bg-[#0A0C10] flex flex-col items-center justify-center font-sans text-slate-100">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
          <span className="text-xs font-semibold text-slate-400">Loading Portal Engine...</span>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className={viewportClass}>
        <div className={containerClass}>
          {/* Header */}
          <header className="sticky top-0 z-40 bg-[#12141C]/90 backdrop-blur-md border-b border-[#2D3348] py-5 px-6 text-center">
            <span className="font-extrabold tracking-tight text-base text-[#F8FAFC]">AutoLogin Portal</span>
            <p className="text-[10px] text-slate-400 mt-0.5 font-medium">Enterprise Submission Daemon</p>
          </header>

          <main className="flex-1 flex flex-col justify-center px-6 py-8 space-y-6">
            <div className="text-center space-y-2">
              <div className="mx-auto h-12 w-12 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <User className="h-6 w-6" />
              </div>
              <h2 className="text-xl font-extrabold text-white tracking-tight">
                {authMode === "login" ? "Welcome Back" : "Create Account"}
              </h2>
              <p className="text-xs text-slate-400 font-medium">
                {authMode === "login"
                  ? "Access your automated submission rules"
                  : "Register a secure agent profile"}
              </p>
            </div>

            <form onSubmit={authMode === "login" ? handleLogin : handleRegister} className="space-y-4">
              {authMode === "register" && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">Full Name</label>
                  <input
                    type="text"
                    required
                    value={authEmployeeName}
                    onChange={(e) => setAuthEmployeeName(e.target.value)}
                    placeholder="e.g. Your Name"
                    className="w-full bg-[#0F111A] border border-[#2D3348] rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-semibold"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">Work Email</label>
                <input
                  type="email"
                  required
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder="e.g. name@domain.com"
                  className="w-full bg-[#0F111A] border border-[#2D3348] rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-semibold"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">Password</label>
                <input
                  type="password"
                  required
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#0F111A] border border-[#2D3348] rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              {authError && (
                <div className="p-3 bg-rose-950/40 text-rose-400 border border-rose-500/25 rounded-xl text-xs font-semibold leading-relaxed">
                  {authError}
                </div>
              )}

              <button
                type="submit"
                disabled={authLoading}
                className="w-full bg-indigo-600 hover:bg-indigo-500 active:scale-98 text-white font-extrabold py-3.5 rounded-2xl text-xs tracking-wider transition-all shadow-lg shadow-indigo-600/10 cursor-pointer uppercase flex items-center justify-center gap-2"
              >
                {authLoading ? (
                  <Loader2 className="h-4.5 w-4.5 animate-spin" />
                ) : (
                  <span>{authMode === "login" ? "Sign In" : "Sign Up"}</span>
                )}
              </button>
            </form>

            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setAuthMode(authMode === "login" ? "register" : "login");
                  setAuthError(null);
                }}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-bold transition-colors cursor-pointer"
              >
                {authMode === "login"
                  ? "Don't have an account? Sign up"
                  : "Already have an account? Sign in"}
              </button>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (viewMode === "desktop" && !isAndroidWebView) {
    return (
      <div id="desktop_viewport" className="min-h-screen bg-[#0A0C10] flex text-slate-100 antialiased font-sans">
        
        {/* Left Sidebar */}
        <aside className="w-72 bg-[#12141C] border-r border-[#2D3348] flex flex-col shrink-0">
          
          {/* Brand Header */}
          <div className="p-6 border-b border-[#2D3348] flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-inner">
              <Clock className="h-5.5 w-5.5" />
            </div>
            <div>
              <span className="font-extrabold text-sm text-[#F8FAFC] tracking-tight block">AutoLogin Portal</span>
              <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider block">Enterprise Agent</span>
            </div>
          </div>

          {/* User profile */}
          <div className="p-6 border-b border-[#2D3348] bg-[#161924]/30 space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-slate-800 border border-[#2D3348] flex items-center justify-center text-slate-300 font-bold shrink-0">
                {currentUser.employeeName ? currentUser.employeeName.charAt(0) : "U"}
              </div>
              <div className="overflow-hidden">
                <span className="font-extrabold text-xs text-[#F8FAFC] block leading-tight truncate">{currentUser.employeeName}</span>
                <span className="text-[10px] text-[#64748B] block font-mono truncate">{currentUser.email}</span>
              </div>
            </div>
            
            <div className="flex items-center gap-2 bg-[#0F111A] p-2.5 rounded-xl border border-[#1E2230]">
              <div className={`h-2 w-2 rounded-full ${isSchedulerRunning ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">
                Scheduler: {isSchedulerRunning ? "ACTIVE" : "PAUSED"}
              </span>
            </div>
          </div>

          {/* Navigation vertical list */}
          <nav className="flex-1 p-4 space-y-1.5">
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold tracking-wide transition-all uppercase cursor-pointer ${
                activeTab === "dashboard"
                  ? "bg-indigo-600/15 text-indigo-400 border border-indigo-500/20 shadow-md"
                  : "text-[#64748B] hover:text-slate-200 hover:bg-[#1C1F2A]/50 border border-transparent"
              }`}
            >
              <Clock className="h-4.5 w-4.5" />
              <span>Control Panel</span>
            </button>

            <button
              onClick={() => setActiveTab("logs")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold tracking-wide transition-all uppercase cursor-pointer ${
                activeTab === "logs"
                  ? "bg-indigo-600/15 text-indigo-400 border border-indigo-500/20 shadow-md"
                  : "text-[#64748B] hover:text-slate-200 hover:bg-[#1C1F2A]/50 border border-transparent"
              }`}
            >
              <Terminal className="h-4.5 w-4.5" />
              <span>Console Logs</span>
            </button>

            <button
              onClick={() => setActiveTab("settings")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold tracking-wide transition-all uppercase cursor-pointer ${
                activeTab === "settings"
                  ? "bg-indigo-600/15 text-indigo-400 border border-indigo-500/20 shadow-md"
                  : "text-[#64748B] hover:text-slate-200 hover:bg-[#1C1F2A]/50 border border-transparent"
              }`}
            >
              <SettingsIcon className="h-4.5 w-4.5" />
              <span>Setup Config</span>
            </button>
          </nav>

          {/* Footer of Sidebar */}
          <div className="p-4 border-t border-[#2D3348] space-y-3 bg-[#12141C]">
            <div className="bg-[#1C1F2A] p-3 rounded-xl border border-[#2D3348] flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-[#64748B] font-bold uppercase tracking-wider">Device Shell</span>
                <span className="text-[9px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-1.5 py-0.5 rounded font-mono font-bold">DESKTOP</span>
              </div>
              <button
                onClick={toggleViewMode}
                className="w-full text-center text-[10px] bg-indigo-600/20 hover:bg-indigo-600/35 text-indigo-300 border border-indigo-500/25 py-2 rounded-lg font-bold transition-all cursor-pointer"
              >
                📱 Switch to Mobile Phone
              </button>
            </div>

            <button
              onClick={handleLogout}
              className="w-full py-2.5 bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 border border-rose-500/20 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              Log Out
            </button>
          </div>
        </aside>

        {/* Right Side Workspace */}
        <div className="flex-1 flex flex-col min-h-screen overflow-hidden bg-[#0A0C10]">
          
          {/* Header Bar */}
          <header className="px-8 py-5 border-b border-[#1C1F2A] flex justify-between items-center bg-[#12141C]/30 shrink-0">
            <div>
              <h1 className="text-lg font-extrabold tracking-tight text-white capitalize">
                {activeTab === "settings" ? "Configuration & Setup" : activeTab === "logs" ? "Console Logs" : "Control Dashboard"}
              </h1>
              <p className="text-[11px] text-slate-400">Manage, trigger, and inspect work attendance reporting automation</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs bg-[#1C1F2A] px-3.5 py-2 rounded-xl border border-[#2D3348] text-slate-400 font-medium">
                Daemon Link: <span className="text-emerald-400 font-bold">CONNECTED</span>
              </span>
            </div>
          </header>

          {/* Main Content Area */}
          <main className="flex-1 overflow-y-auto p-8 max-w-7xl w-full mx-auto space-y-6">
            
            {/* Dynamic feedback messages */}
            <AnimatePresence>
              {feedbackMsg && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={`p-4 rounded-2xl text-xs flex items-start gap-3 shadow-md ${
                    feedbackMsg.type === "success" 
                      ? "bg-emerald-600 text-white border border-emerald-500/30" 
                      : "bg-rose-600 text-white border border-rose-500/30"
                  }`}
                >
                  {feedbackMsg.type === "success" ? (
                    <CheckCircle2 className="h-4.5 w-4.5 shrink-0 text-emerald-100" />
                  ) : (
                    <XCircle className="h-4.5 w-4.5 shrink-0 text-rose-100" />
                  )}
                  <span className="font-semibold leading-normal">{feedbackMsg.text}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* TAB 1: DASHBOARD */}
            {activeTab === "dashboard" && (
              <div id="desktop_dashboard" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Left Side (Columns 1 & 2): Main operations */}
                <div className="lg:col-span-2 space-y-6">
                  
                  {/* Automated execution triggers card */}
                  <div className="bg-[#1C1F2A] border border-[#2D3348] rounded-3xl p-6 space-y-4 shadow-sm">
                    <div className="flex items-center justify-between border-b border-[#2D3348] pb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-600/10 border border-indigo-500/20 rounded-xl text-indigo-400">
                          <Sliders className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="font-extrabold text-sm text-white">Manual Executions</h3>
                          <p className="text-[11px] text-slate-400">Directly execute automation tasks outside scheduled hours</p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <button
                        onClick={handleManualTestLogin}
                        disabled={actionLoading}
                        className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-extrabold p-4 rounded-2xl text-xs tracking-wider transition-all shadow-md flex items-center justify-center gap-2.5 cursor-pointer"
                      >
                        {actionLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Play className="h-4 w-4 fill-white text-white" />
                        )}
                        <span>RUN AUTO-LOGIN NOW</span>
                      </button>

                      <div className="bg-[#0F111A] border border-[#2D3348]/50 p-4 rounded-2xl flex flex-col justify-center">
                        <span className="text-[10px] text-[#64748B] font-bold uppercase tracking-wider">Form URL Status</span>
                        <span className="text-xs text-slate-200 truncate mt-1 max-w-xs">{settings.url}</span>
                      </div>
                    </div>

                    <div className="bg-[#0F111A] border border-[#2D3348]/50 p-4 rounded-2xl flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <Info className="h-4 w-4 text-[#64748B]" />
                        <span className="text-[11px] text-slate-400 font-medium">Last automated check-in recorded:</span>
                      </div>
                      <span className="text-xs font-mono font-bold text-indigo-400 bg-indigo-950/30 border border-indigo-500/15 px-2.5 py-1 rounded-lg">
                        {lastLoginTime || "Never during this session"}
                      </span>
                    </div>
                  </div>

                  {/* Console Preview Card */}
                  <div className="bg-[#1C1F2A] border border-[#2D3348] rounded-3xl p-6 space-y-4 shadow-sm flex-1 flex flex-col">
                    <div className="flex items-center justify-between border-b border-[#2D3348] pb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-[#2D3348] border border-[#3B425C] rounded-xl text-slate-300">
                          <Terminal className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="font-extrabold text-sm text-white">Live Activity Stream</h3>
                          <p className="text-[11px] text-slate-400">Real-time status tracking from the scheduler thread</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setActiveTab("logs")}
                        className="text-[10px] text-indigo-400 font-bold hover:text-indigo-300 transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <span>Go to Full Console</span>
                        <ChevronRight className="h-3 w-3" />
                      </button>
                    </div>

                    <div className="bg-[#0F111A] rounded-2xl border border-[#2D3348] p-4 h-[300px] overflow-y-auto font-mono text-[11px] text-emerald-400 space-y-2.5">
                      {backendLogs.length === 0 ? (
                        <div className="text-slate-600 italic text-center py-20">No console log events registered yet.</div>
                      ) : (
                        backendLogs.slice(-15).map((log, i) => (
                          <div key={i} className="flex items-start gap-2.5 hover:bg-[#161924]/40 p-1 rounded transition-colors">
                            <span className="text-[#64748B] text-[10px] shrink-0">
                              {new Date(log.timestamp).toLocaleTimeString([], { hour12: false })}
                            </span>
                            <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase shrink-0 ${
                              log.section === "SCHEDULER" 
                                ? "bg-blue-950 text-blue-400 border border-blue-800/30"
                                : log.section === "API"
                                  ? "bg-indigo-950 text-indigo-400 border border-indigo-800/30"
                                  : log.section === "HOLIDAY_CHECK"
                                    ? "bg-amber-950/60 text-amber-400 border border-amber-500/20"
                                    : "bg-zinc-900 text-slate-300"
                            }`}>
                              {log.section}
                            </span>
                            <span className="leading-relaxed break-all text-slate-200">{log.message}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                </div>

                {/* Right Side (Column 3): Dashboard status panels */}
                <div className="space-y-6">
                  
                  {/* Large Clock Card */}
                  <div className="bg-gradient-to-br from-[#1E2230] to-[#161924] rounded-3xl p-6 shadow-lg border border-[#2D3348] flex flex-col items-center justify-center text-center">
                    <span className="text-indigo-400 font-bold tracking-wider text-[10px] uppercase mb-1.5 flex items-center gap-1.5">
                      <Clock className="h-3 w-3" />
                      <span>Singapore (SG Proxy) Time</span>
                    </span>
                    <div className="font-mono text-4xl font-extrabold tracking-tight flex items-center text-[#F8FAFC]">
                      {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }).split(" ")[0]}
                      <span className="animate-pulse mx-0.5 text-indigo-500">:</span>
                      {currentTime.toLocaleTimeString([], { second: '2-digit' }).slice(-2)}
                      <span className="text-[10px] font-sans font-extrabold text-[#64748B] ml-2 bg-[#1C1F2A] px-2 py-1 rounded-lg border border-[#2D3348] uppercase">
                        {currentTime.toLocaleTimeString([], { hour12: true }).slice(-2)}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 font-semibold mt-2.5 flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-slate-500" />
                      <span>{currentTime.toLocaleDateString("en-US", { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </div>
                  </div>

                  {/* Scheduler Status panel */}
                  <div className="bg-[#1C1F2A] border border-[#2D3348] rounded-3xl p-6 space-y-4 shadow-sm">
                    <div className="flex items-center justify-between border-b border-[#2D3348] pb-3">
                      <h4 className="font-extrabold text-sm text-white">Automated Daemon</h4>
                      <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full border ${
                        isSchedulerRunning 
                          ? "bg-emerald-950/40 text-emerald-400 border-emerald-500/20" 
                          : "bg-amber-950/40 text-amber-400 border-amber-500/20"
                      }`}>
                        {isSchedulerRunning ? "RUNNING" : "STOPPED"}
                      </span>
                    </div>

                    <div className="space-y-3 text-xs text-slate-300">
                      <div className="flex justify-between items-center bg-[#0F111A] p-2.5 rounded-xl border border-[#2D3348]/40">
                        <span className="text-[#64748B] font-bold uppercase tracking-wider text-[10px]">Expected Submission</span>
                        <span className="font-mono text-[#F8FAFC] font-extrabold">{settings.loginTime}</span>
                      </div>

                      <div className="flex justify-between items-center bg-[#0F111A] p-2.5 rounded-xl border border-[#2D3348]/40">
                        <span className="text-[#64748B] font-bold uppercase tracking-wider text-[10px]">Interval (Secs)</span>
                        <span className="font-mono text-[#F8FAFC] font-extrabold">{settings.checkInterval}s</span>
                      </div>

                      <div className="flex justify-between items-center bg-[#0F111A] p-2.5 rounded-xl border border-[#2D3348]/40">
                        <span className="text-[#64748B] font-bold uppercase tracking-wider text-[10px]">Randomized Delay</span>
                        <span className="font-mono text-[#F8FAFC] font-extrabold">{settings.randomizeLogin ? "±15 mins active" : "Disabled"}</span>
                      </div>

                      <div className="bg-[#0F111A] p-3 rounded-2xl border border-[#2D3348]/40 space-y-2">
                        <span className="text-[#64748B] font-bold uppercase tracking-wider text-[10px] block">Active Workdays</span>
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"].map((day) => {
                            const isSel = settings.days.includes(day);
                            return (
                              <span key={day} className={`text-[9px] font-extrabold uppercase px-2 rounded-full border ${
                                isSel 
                                  ? "bg-indigo-950/40 text-indigo-400 border-indigo-500/30" 
                                  : "bg-slate-900/50 text-[#434B66] border-[#2D3348]/30"
                              }`}>
                                {day.slice(0, 3)}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    <div className="pt-2">
                      <button
                        onClick={handleToggleScheduler}
                        className={`w-full py-3 rounded-2xl text-xs font-extrabold uppercase tracking-wider cursor-pointer border transition-all flex items-center justify-center gap-2 ${
                          isSchedulerRunning
                            ? "bg-amber-650/15 hover:bg-amber-600/25 text-amber-400 border-amber-500/20"
                            : "bg-emerald-650/15 hover:bg-emerald-600/25 text-emerald-400 border-emerald-500/20"
                        }`}
                      >
                        {isSchedulerRunning ? (
                          <>
                            <Square className="h-4 w-4 fill-amber-400 text-amber-400" />
                            <span>Stop Scheduler Daemon</span>
                          </>
                        ) : (
                          <>
                            <Play className="h-4 w-4 fill-emerald-400 text-emerald-400" />
                            <span>Start Scheduler Daemon</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                </div>

              </div>
            )}

            {/* TAB 2: LOG SYSTEM */}
            {activeTab === "logs" && (
              <div id="desktop_logs" className="bg-[#1C1F2A] border border-[#2D3348] rounded-3xl p-6 space-y-4 shadow-sm flex flex-col min-h-[600px]">
                <div className="flex items-center justify-between border-b border-[#2D3348] pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-600/10 border border-indigo-500/20 rounded-xl text-indigo-400">
                      <Terminal className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-sm text-white">System Console Terminal</h3>
                      <p className="text-[11px] text-slate-400">Full telemetry standard output logs directly from the backend worker thread</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={refreshLogs}
                      className="bg-[#2D3348] hover:bg-[#3B425C] text-slate-300 border border-[#434B66]/30 font-bold px-3 py-2 rounded-xl text-xs transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      <span>Refresh</span>
                    </button>

                    <button
                      onClick={() => setBackendLogs([])}
                      className="bg-rose-950/30 hover:bg-rose-900/40 text-rose-400 border border-rose-500/20 font-bold px-3 py-2 rounded-xl text-xs transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Clear</span>
                    </button>
                  </div>
                </div>

                <div className="flex-1 bg-[#0F111A] rounded-2xl border border-[#2D3348] p-5 h-[500px] overflow-y-auto font-mono text-xs text-slate-300 space-y-2">
                  {backendLogs.length === 0 ? (
                    <div className="text-slate-600 italic text-center py-24">No console events registered. Try triggering AutoLogin manually first.</div>
                  ) : (
                    backendLogs.map((log, i) => (
                      <div key={i} className="flex items-start gap-3 hover:bg-[#161924]/40 p-1.5 rounded-lg transition-colors">
                        <span className="text-[#64748B] text-[10px] shrink-0">
                          {new Date(log.timestamp).toLocaleTimeString([], { hour12: false })}
                        </span>
                        <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase shrink-0 ${
                          log.section === "SCHEDULER" 
                            ? "bg-blue-950 text-blue-400 border border-blue-800/30"
                            : log.section === "API"
                              ? "bg-indigo-950 text-indigo-400 border border-indigo-800/30"
                              : log.section === "HOLIDAY_CHECK"
                                ? "bg-amber-950/60 text-amber-400 border border-amber-500/20"
                                : "bg-zinc-900 text-slate-300"
                        }`}>
                          {log.section}
                        </span>
                        <span className="leading-relaxed break-all text-slate-200">{log.message}</span>
                      </div>
                    ))
                  )}
                  <div ref={logsEndRef} />
                </div>
              </div>
            )}

            {/* TAB 3: SETTINGS CONFIG */}
            {activeTab === "settings" && (
              <div id="desktop_settings" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Column 1 & 2: Form Configurations */}
                <div className="lg:col-span-2 space-y-6">
                  
                  {/* Settings section */}
                  <div className="bg-[#1C1F2A] rounded-3xl p-6 border border-[#2D3348] space-y-6">
                    <div className="flex items-center gap-3 border-b border-[#2D3348] pb-4">
                      <div className="p-2 bg-indigo-600/10 border border-indigo-500/20 rounded-xl text-indigo-400">
                        <Layers className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-extrabold text-sm text-white">WorkForms Form Target Options</h3>
                        <p className="text-[11px] text-slate-400">Manage API form endpoint credentials and SSO authentication settings</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">WorkForms Submission URL</label>
                        <input
                          type="text"
                          value={settings.url}
                          onChange={(e) => setSettings({ ...settings, url: e.target.value })}
                          placeholder="https://forms.monday.com/workforms/external/forms/..."
                          className="w-full bg-[#0F111A] border border-[#2D3348] rounded-xl px-4 py-3 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-semibold"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">Reporting Email</label>
                        <input
                          type="email"
                          value={settings.email}
                          onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                          placeholder="e.g. your@email.com
                          className="w-full bg-[#0F111A] border border-[#2D3348] rounded-xl px-4 py-3 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-semibold"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] flex items-center justify-between">
                        <span>Monday Session Cookies (For Corporate/SSO Authenticated Forms)</span>
                        <span className="text-[9px] text-indigo-400 font-mono font-normal normal-case">Optional</span>
                      </label>
                      <textarea
                        value={settings.sessionCookie || ""}
                        onChange={(e) => setSettings({ ...settings, sessionCookie: e.target.value })}
                        placeholder="Paste your Monday.com Cookie header here if your WorkForm requires corporate/SSO authentication..."
                        className="w-full h-24 bg-[#0F111A] border border-[#2D3348] rounded-xl px-4 py-3 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono text-[11px] resize-none"
                      />
                      <p className="text-[10px] text-slate-500 leading-normal">
                        Required only if the Monday Form restricts submission to organization members. Extract the Cookie header from browser DevTools (F12 &rarr; Network tab) and paste it here.
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] flex items-center justify-between">
                        <span>Gemini API Key (For Holiday Checks)</span>
                        <span className="text-[9px] text-indigo-400 font-mono font-normal normal-case">Optional</span>
                      </label>
                      <input
                        type="password"
                        value={settings.geminiApiKey || ""}
                        onChange={(e) => setSettings({ ...settings, geminiApiKey: e.target.value })}
                        placeholder="Paste your Gemini API Key here..."
                        className="w-full bg-[#0F111A] border border-[#2D3348] rounded-xl px-4 py-3 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                      />
                      <p className="text-[10px] text-slate-500 leading-normal">
                        Used to determine Singapore public holidays. If neither this field nor the system environment contains an API key, the holiday check defaults to standard working days.
                      </p>
                    </div>

                    {/* Advanced JSON View and Day-Specific fields */}
                    <div className="space-y-4 pt-4 border-t border-[#2D3348]">
                      <div className="flex items-center justify-between pb-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">WorkForms Answers Configuration</label>
                        <button
                          type="button"
                          onClick={() => setIsJsonViewActive(!isJsonViewActive)}
                          className="text-[10px] text-indigo-400 font-bold hover:text-indigo-300 flex items-center gap-1.5 cursor-pointer transition-colors"
                        >
                          {isJsonViewActive ? (
                            <>
                              <SlidersHorizontal className="h-3.5 w-3.5" />
                              <span>Switch to Interactive Form UI</span>
                            </>
                          ) : (
                            <>
                              <FileCode className="h-3.5 w-3.5" />
                              <span>Switch to Raw JSON Editor</span>
                            </>
                          )}
                        </button>
                      </div>

                      {isJsonViewActive ? (
                        <div className="space-y-1.5 animate-fadeIn">
                          <textarea
                            value={settings.answersJson}
                            onChange={(e) => setSettings({ ...settings, answersJson: e.target.value })}
                            placeholder="{ ... }"
                            className="w-full h-56 bg-[#0F111A] border border-[#2D3348] rounded-xl p-4 font-mono text-[11px] text-slate-300 focus:outline-none focus:border-indigo-500 resize-none leading-relaxed"
                          />
                        </div>
                      ) : (
                        /* Standard Form labels view inside grid */
                        <div className="bg-[#0F111A] border border-[#2D3348] rounded-2xl p-4 space-y-4">
                          <div className="flex items-center justify-between border-b border-[#2D3348]/60 pb-2.5">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                              <Clock className="h-3 w-3 text-indigo-400" />
                              Interactive Form Preview
                            </span>
                            <span className="text-[9px] text-[#64748B] font-mono">Simulates submission payload</span>
                          </div>

                          <div className="space-y-3">
                            {Object.entries(getParsedPayload().answers).length === 0 ? (
                              <div className="text-center text-slate-500 italic text-xs py-2">
                                No fields configured. Add one below to start.
                              </div>
                            ) : (
                              Object.entries(getParsedPayload().answers).map(([key, value]) => {
                                const isBool = typeof value === "boolean";
                                const isNum = typeof value === "number";

                                return (
                                  <div key={key} className="bg-[#12141C]/50 border border-[#2D3348]/30 rounded-xl p-3.5 space-y-2 relative group transition-all hover:border-[#2D3348]">
                                    <div className="flex items-start justify-between">
                                      <div>
                                        <span className="text-[11px] font-bold text-slate-200 block">
                                          {getFriendlyLabel(key)}
                                        </span>
                                        <code className="text-[9px] text-slate-500 font-mono block mt-0.5">
                                          Key: {key}
                                        </code>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => deletePayloadField(key)}
                                        className="text-slate-600 hover:text-rose-400 p-1 rounded-lg transition-colors cursor-pointer"
                                        title="Delete Field"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    </div>

                                    <div className="pt-1.5">
                                      {isBool ? (
                                        <div className="flex items-center justify-between bg-[#0F111A] px-3 py-2 rounded-xl border border-[#2D3348]/40">
                                          <span className="text-xs text-slate-300">Option state: {value ? "Checked / Yes" : "Unchecked / No"}</span>
                                          <button
                                            type="button"
                                            onClick={() => updatePayloadField(key, !value)}
                                            className="transition-colors cursor-pointer"
                                          >
                                            {value ? (
                                              <ToggleRight className="h-7 w-7 text-indigo-400 fill-indigo-400/20" />
                                            ) : (
                                              <ToggleLeft className="h-7 w-7 text-slate-600" />
                                            )}
                                          </button>
                                        </div>
                                      ) : isNum ? (
                                        <input
                                          type="number"
                                          value={value as number}
                                          onChange={(e) => updatePayloadField(key, Number(e.target.value))}
                                          className="w-full bg-[#0F111A] border border-[#2D3348]/60 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                                        />
                                      ) : (
                                        <input
                                          type="text"
                                          value={value as string}
                                          onChange={(e) => updatePayloadField(key, e.target.value)}
                                          className="w-full bg-[#0F111A] border border-[#2D3348]/60 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-semibold"
                                        />
                                      )}
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>

                          <div className="pt-2 border-t border-[#2D3348]/40 space-y-2">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-sans">
                              Form Timezone Offset
                            </span>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <select
                                value={getParsedPayload().timezone}
                                onChange={(e) => updateTimezoneOffset(Number(e.target.value))}
                                className="w-full bg-[#12141C] border border-[#2D3348] rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer font-semibold"
                              >
                                {commonTimezones.map((tz) => (
                                  <option key={tz.offset} value={tz.offset}>
                                    {tz.label}
                                  </option>
                                ))}
                                {!commonTimezones.some(t => t.offset === getParsedPayload().timezone) && (
                                  <option value={getParsedPayload().timezone}>
                                    Custom Offset ({getParsedPayload().timezone}m)
                                  </option>
                                )}
                              </select>
                              
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-slate-500 font-mono shrink-0">Minutes:</span>
                                <input
                                  type="number"
                                  value={getParsedPayload().timezone}
                                  onChange={(e) => updateTimezoneOffset(Number(e.target.value))}
                                  className="w-full bg-[#12141C] border border-[#2D3348] rounded-xl px-3 py-2 text-xs text-center font-mono text-slate-200 focus:outline-none focus:border-indigo-500"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Interactive Field Insert Area for Non-JSON mode */}
                    {!isJsonViewActive && (
                      <div className="bg-[#0F111A]/40 border border-[#2D3348]/40 rounded-2xl p-4.5 space-y-3">
                        <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block font-sans">
                          Add New Field to Form Template
                        </span>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <input
                            type="text"
                            value={newFieldName}
                            onChange={(e) => setNewFieldName(e.target.value)}
                            placeholder="Unique Field Key (e.g. status_col)"
                            className="bg-[#12141C] border border-[#2D3348] rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                          />
                          <select
                            value={newFieldType}
                            onChange={(e) => setNewFieldType(e.target.value as any)}
                            className="bg-[#12141C] border border-[#2D3348] rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 cursor-pointer font-bold"
                          >
                            <option value="text">Text / Input</option>
                            <option value="boolean">Toggle / Checkbox</option>
                            <option value="number">Numeric</option>
                          </select>
                          <button
                            type="button"
                            onClick={addPayloadField}
                            disabled={!newFieldName.trim()}
                            className="bg-indigo-600/20 hover:bg-indigo-600 text-indigo-400 hover:text-white border border-indigo-500/25 rounded-xl text-xs font-bold py-2.5 transition-all cursor-pointer disabled:opacity-40 disabled:hover:bg-indigo-600/20 disabled:hover:text-indigo-400"
                          >
                            + Insert Field
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Day-specific settings */}
                    <div className="pt-4 border-t border-[#2D3348] space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] block">Day-Specific Form Answers Override</span>
                          <span className="text-[10px] text-slate-500 block mt-0.5">Define unique JSON payloads for specific days of the week</span>
                        </div>
                        <button
                          onClick={() => setSettings({ ...settings, useDaySpecificJson: !settings.useDaySpecificJson })}
                          className={`text-xs px-3.5 py-2 rounded-xl font-bold cursor-pointer transition-colors border ${
                            settings.useDaySpecificJson 
                              ? "bg-indigo-600/10 text-indigo-400 border-indigo-500/25 font-extrabold" 
                              : "bg-slate-900 text-slate-400 border-[#2D3348]"
                          }`}
                        >
                          {settings.useDaySpecificJson ? "✓ Custom Day Override Active" : "Enable Day Override"}
                        </button>
                      </div>

                      {settings.useDaySpecificJson && (
                        <div className="space-y-4 pt-2 animate-fadeIn">
                          {/* Horizontal Day Tabs */}
                          <div className="flex gap-1.5 overflow-x-auto pb-1">
                            {["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"].map((day) => (
                              <button
                                key={day}
                                type="button"
                                onClick={() => setSelectedConfigDay(day)}
                                className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase whitespace-nowrap cursor-pointer transition-all ${
                                  selectedConfigDay === day
                                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/15"
                                    : "bg-[#12141C] text-[#64748B] hover:text-slate-200 border border-[#2D3348]/50"
                                }`}
                              >
                                {day.substring(0, 3)}
                              </button>
                            ))}
                          </div>

                          {/* Textarea for selected day */}
                          <div className="space-y-1.5">
                            <div className="flex justify-between items-center">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                                {selectedConfigDay} Payload (Raw JSON overrides):
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  const updatedSpecific = { ...settings.daySpecificAnswersJson };
                                  updatedSpecific[selectedConfigDay] = settings.answersJson;
                                  setSettings({
                                    ...settings,
                                    daySpecificAnswersJson: updatedSpecific
                                  });
                                }}
                                className="text-[10px] text-indigo-400 font-bold hover:text-indigo-300 transition-colors cursor-pointer"
                              >
                                Copy Default Payload JSON
                              </button>
                            </div>
                            <textarea
                              value={settings.daySpecificAnswersJson?.[selectedConfigDay] || ""}
                              onChange={(e) => {
                                const updatedSpecific = { ...settings.daySpecificAnswersJson };
                                updatedSpecific[selectedConfigDay] = e.target.value;
                                setSettings({
                                  ...settings,
                                  daySpecificAnswersJson: updatedSpecific
                                });
                              }}
                              placeholder={`{"answers": { ... }}`}
                              className="w-full h-32 bg-[#0F111A] border border-[#2D3348] rounded-xl p-3 font-mono text-[11px] text-slate-300 focus:outline-none focus:border-indigo-500 resize-none leading-relaxed"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Form submit/save area */}
                    <div className="pt-4 border-t border-[#2D3348] flex justify-end">
                      <button
                        onClick={() => handleSaveSettings(settings)}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs px-8 py-3.5 rounded-2xl tracking-wider transition-colors shadow-lg cursor-pointer uppercase flex items-center gap-2"
                      >
                        <Check className="h-4.5 w-4.5" />
                        <span>Save Workspace Settings</span>
                      </button>
                    </div>

                  </div>

                </div>

                {/* Column 3: Utility Importer and Schedule config */}
                <div className="space-y-6">
                  
                  {/* Importer Banner */}
                  <div className="bg-gradient-to-br from-[#1E2230] to-[#161924] rounded-3xl p-6 border border-[#2D3348] space-y-4 shadow-lg">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-emerald-600/10 border border-emerald-500/20 rounded-xl text-emerald-400">
                        <FileCode className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-sm text-white">Extract Python Script</h4>
                        <p className="text-[11px] text-slate-400">Import settings, fields, and session keys seamlessly</p>
                      </div>
                    </div>

                    <textarea
                      value={pythonCode}
                      onChange={(e) => setPythonCode(e.target.value)}
                      placeholder="Paste Python Tkinter or PyQt autologin script here..."
                      className="w-full h-32 bg-[#0F111A] border border-[#2D3348] rounded-2xl p-3 font-mono text-xs text-slate-200 focus:outline-none focus:border-indigo-500 placeholder:text-slate-700 leading-relaxed resize-none"
                    />

                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-[#64748B] font-mono">App.py and autologin.py formats</span>
                      <button
                        onClick={handleParsePython}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm shadow-indigo-600/10"
                      >
                        <RefreshCw className="h-3.5 w-3.5 animate-spin-slow" />
                        <span>Extract Settings</span>
                      </button>
                    </div>

                    {importFeedback && (
                      <div className={`p-3.5 rounded-2xl text-xs font-semibold border ${
                        importFeedback.success 
                          ? "bg-emerald-950/40 text-emerald-400 border-emerald-500/20" 
                          : "bg-rose-950/40 text-rose-400 border-rose-500/20"
                      }`}>
                        {importFeedback.message}
                      </div>
                    )}
                  </div>

                  {/* Schedule Card */}
                  <div className="bg-[#1C1F2A] border border-[#2D3348] rounded-3xl p-6 space-y-5 shadow-sm">
                    <div className="flex items-center gap-3 border-b border-[#2D3348] pb-3">
                      <Clock className="h-5 w-5 text-indigo-400" />
                      <h4 className="font-extrabold text-sm text-white font-sans uppercase">Trigger Parameters</h4>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">Scheduled Trigger Time</label>
                        <input
                          type="time"
                          value={settings.loginTime}
                          onChange={(e) => setSettings({ ...settings, loginTime: e.target.value })}
                          className="w-full bg-[#0F111A] border border-[#2D3348] rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono font-semibold"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">Daemon Sleep Interval (secs)</label>
                        <input
                          type="number"
                          value={settings.checkInterval}
                          onChange={(e) => setSettings({ ...settings, checkInterval: parseInt(e.target.value) || 60 })}
                          placeholder="60"
                          className="w-full bg-[#0F111A] border border-[#2D3348] rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono font-semibold"
                        />
                      </div>

                      <div className="pt-2 space-y-3.5">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-[11px] font-bold text-white block">Singapore Public Holiday Checks</span>
                            <span className="text-[10px] text-slate-500 block">Skip automated trigger during official holidays</span>
                          </div>
                          <button
                            onClick={() => setSettings({ ...settings, enableHolidayCheck: !settings.enableHolidayCheck })}
                            className="cursor-pointer transition-transform animate-fadeIn"
                          >
                            {settings.enableHolidayCheck ? (
                              <ToggleRight className="h-8 w-8 text-indigo-500" />
                            ) : (
                              <ToggleLeft className="h-8 w-8 text-slate-600" />
                            )}
                          </button>
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          <div>
                            <span className="text-[11px] font-bold text-white block">Randomize Submission Trigger</span>
                            <span className="text-[10px] text-slate-500 block">Introduce ±15 mins offset for human-like behavior</span>
                          </div>
                          <button
                            onClick={() => setSettings({ ...settings, randomizeLogin: !settings.randomizeLogin })}
                            className="cursor-pointer transition-transform animate-fadeIn"
                          >
                            {settings.randomizeLogin ? (
                              <ToggleRight className="h-8 w-8 text-indigo-500" />
                            ) : (
                              <ToggleLeft className="h-8 w-8 text-slate-600" />
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2 pt-2 border-t border-[#2D3348]">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">Active Working Days</label>
                        <div className="grid grid-cols-4 gap-1.5 pt-1">
                          {["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"].map((day) => {
                            const isSelected = settings.days.includes(day);
                            return (
                              <button
                                key={day}
                                type="button"
                                onClick={() => toggleDay(day)}
                                className={`text-[10px] font-bold uppercase py-2 rounded-xl border transition-all cursor-pointer ${
                                  isSelected 
                                    ? "bg-indigo-600/15 text-indigo-400 border-indigo-500/25 font-extrabold" 
                                    : "bg-[#0F111A] text-slate-500 border-transparent hover:border-[#2D3348]"
                                }`}
                              >
                                {day.slice(0, 3)}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>

                </div>

              </div>
            )}

          </main>
        </div>

      </div>
    );
  }

  return (
    <div id="main_viewport" className={viewportClass}>
      
      {/* Dynamic Device Mockup Shell */}
      <div className={containerClass}>
        
        {/* Brand Header bar */}
        <header id="app_header" className="sticky top-0 z-40 bg-[#12141C]/90 backdrop-blur-md border-b border-[#2D3348] py-4 px-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className={`h-2.5 w-2.5 rounded-full ${isSchedulerRunning ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
            <div>
              <span className="font-extrabold tracking-tight text-sm text-[#F8FAFC] block leading-tight">{currentUser.employeeName}</span>
              <span className="text-[10px] text-[#64748B] block leading-none truncate max-w-[150px] font-mono">{currentUser.email}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isAndroidWebView && (
              <button
                onClick={toggleViewMode}
                className="text-[9px] bg-indigo-950/40 hover:bg-indigo-900/60 text-indigo-400 border border-indigo-500/20 px-2.5 py-1 rounded-full font-extrabold uppercase tracking-wide cursor-pointer transition-colors mr-1"
                title="Switch to Desktop Mode"
              >
                💻 Desktop
              </button>
            )}
            <button
              onClick={handleLogout}
              className="text-[9px] bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 border border-rose-500/20 px-2.5 py-1 rounded-full font-extrabold uppercase tracking-wide cursor-pointer transition-colors"
            >
              Log Out
            </button>
          </div>
        </header>

        {/* Scrollable Main Area */}
        <main id="app_main" className="flex-1 overflow-y-auto px-5 py-5 flex flex-col justify-start">
          
          {/* Dynamic feedback messages */}
          <AnimatePresence>
            {feedbackMsg && (
              <motion.div
                id="global_feedback"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={`mb-4 p-4 rounded-2xl text-xs flex items-start gap-3 shadow-md ${
                  feedbackMsg.type === "success" 
                    ? "bg-emerald-600 text-white border border-emerald-500/30" 
                    : "bg-rose-600 text-white border border-rose-500/30"
                }`}
              >
                {feedbackMsg.type === "success" ? (
                  <CheckCircle2 className="h-4.5 w-4.5 shrink-0 text-emerald-100" />
                ) : (
                  <XCircle className="h-4.5 w-4.5 shrink-0 text-rose-100" />
                )}
                <span className="font-semibold leading-normal">{feedbackMsg.text}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Tab Switcher Area */}
          <div className="flex-1 flex flex-col">
            
            {/* TAB 1: DASHBOARD */}
            {activeTab === "dashboard" && (
              <div id="tab_dashboard" className="space-y-5 flex-1 flex flex-col justify-between">
                
                <div className="space-y-4">
                  {/* Elegant Real-Time Clock Display */}
                  <div className="bg-gradient-to-br from-[#1E2230] to-[#161924] rounded-3xl p-5 border border-[#2D3348] shadow-lg flex flex-col items-center justify-center text-center">
                    <span className="text-[#64748B] font-bold tracking-wider text-[10px] uppercase mb-1">Local Time (SG Proxy)</span>
                    <div className="font-mono text-3xl font-extrabold tracking-tight flex items-center text-[#F8FAFC]">
                      {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }).split(" ")[0]}
                      <span className="animate-pulse mx-0.5 text-indigo-500/75">:</span>
                      {currentTime.toLocaleTimeString([], { second: '2-digit' }).slice(-2)}
                      <span className="text-[10px] font-sans font-bold text-[#64748B] ml-2 bg-[#1C1F2A] px-1.5 py-0.5 rounded border border-[#2D3348] uppercase">
                        {currentTime.toLocaleTimeString([], { hour12: true }).slice(-2)}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 font-medium mt-1">
                      {currentTime.toLocaleDateString("en-US", { weekday: 'long', month: 'short', day: 'numeric' })}
                    </div>
                  </div>

                  {/* Daemon Scheduler Card */}
                  <div className="bg-[#1C1F2A] border border-[#2D3348] rounded-3xl p-5 space-y-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="h-5 w-5 text-indigo-400" />
                        <div>
                          <h4 className="font-extrabold text-sm text-white">Automated Scheduler</h4>
                          <span className="text-[11px] text-slate-400">Time trigger-based daemon</span>
                        </div>
                      </div>
                      <button
                        onClick={handleToggleScheduler}
                        disabled={actionLoading}
                        className={`p-1.5 rounded-xl border transition-all cursor-pointer ${
                          isSchedulerRunning
                            ? "bg-emerald-950/40 text-emerald-400 border-emerald-500/30 hover:bg-emerald-950"
                            : "bg-amber-950/40 text-amber-400 border-amber-500/20 hover:bg-amber-950"
                        }`}
                      >
                        {isSchedulerRunning ? <Square className="h-4 w-4 fill-emerald-400" /> : <Play className="h-4 w-4 fill-amber-400" />}
                      </button>
                    </div>

                    <div className="border-t border-[#2D3348] pt-3 flex flex-col gap-2 text-xs">
                      <div className="flex items-center justify-between text-slate-300">
                        <span>Trigger Time:</span>
                        <span className="font-mono font-bold text-white bg-[#12141C] border border-[#2D3348] px-2.5 py-0.5 rounded-lg">
                          {settings.loginTime} (GMT+8)
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-slate-300">
                        <span>Active Days:</span>
                        <span className="font-semibold text-indigo-400 text-right uppercase text-[10px]">
                          {settings.days.length > 0 ? settings.days.slice(0, 3).join(", ") + (settings.days.length > 3 ? "..." : "") : "None"}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-slate-300">
                        <span>Holiday Filter:</span>
                        <span className="flex items-center gap-1 text-[11px]">
                          <span className={`h-1.5 w-1.5 rounded-full ${settings.enableHolidayCheck ? "bg-emerald-400" : "bg-slate-500"}`} />
                          {settings.enableHolidayCheck ? "LLM Public Holidays" : "None"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Connection overview / active profile */}
                  <div className="bg-[#1C1F2A] border border-[#2D3348] rounded-3xl p-5 space-y-3">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-400">
                      <span>MONITORING TARGETS</span>
                      <span className="text-[10px] text-indigo-400 bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-800/20">
                        Form Submission
                      </span>
                    </div>

                    <div className="flex items-start gap-3">
                      <User className="h-5 w-5 text-indigo-400 shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1 text-xs">
                        <span className="font-bold text-white block">Email Profile</span>
                        <span className="text-slate-400 block truncate">{settings.email}</span>
                        <span className="text-slate-500 text-[10px] block mt-1 truncate" title={settings.url}>
                          {settings.url}
                        </span>
                      </div>
                    </div>

                    {lastLoginTime && (
                      <div className="pt-2 border-t border-[#2D3348] flex items-center justify-between text-[11px] text-slate-400">
                        <span>Last Execution:</span>
                        <span className="font-mono text-emerald-400 font-bold">{lastLoginTime}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* manual override controls */}
                <div className="space-y-3 pt-4">
                  <button
                    id="btn_test_login"
                    disabled={actionLoading}
                    onClick={handleManualTestLogin}
                    className="w-full py-4.5 bg-indigo-600 hover:bg-indigo-500 active:scale-98 text-white rounded-2xl font-bold text-sm tracking-wide transition-all shadow-lg shadow-indigo-600/10 flex items-center justify-center gap-2 cursor-pointer uppercase"
                  >
                    {actionLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin text-white" />
                    ) : (
                      <>
                        <Sparkles className="h-4.5 w-4.5" />
                        <span>Trigger Manual Test Login</span>
                      </>
                    )}
                  </button>

                  <p className="text-[10px] text-center text-slate-500">
                    * Simulates login events, handles automated delay and holiday filters immediately
                  </p>
                </div>

              </div>
            )}

            {/* TAB 2: SYSTEM LOG TERMINAL */}
            {activeTab === "logs" && (
              <div id="tab_logs" className="space-y-4 flex-1 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Terminal className="h-4.5 w-4.5 text-indigo-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-[#64748B]">
                      Server Console Stdout
                    </span>
                  </div>
                  <button
                    onClick={() => setBackendLogs([])}
                    className="text-rose-400 hover:text-rose-300 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Clear Logs
                  </button>
                </div>

                {/* Live Console Terminal */}
                <div className="flex-1 bg-[#0A0C10] border border-[#2D3348] rounded-3xl p-4 font-mono text-[11px] text-emerald-400 overflow-y-auto min-h-[380px] max-h-[440px] flex flex-col gap-1.5 scrollbar-thin scrollbar-thumb-slate-800">
                  {backendLogs.length === 0 ? (
                    <div className="text-slate-600 italic text-center my-auto">
                      Console idle. Awaiting scheduler signals or manual tests...
                    </div>
                  ) : (
                    backendLogs.map((log, index) => (
                      <div key={index} className="leading-relaxed hover:bg-slate-900/40 p-0.5 rounded transition-colors">
                        <span className="text-[#64748B] text-[10px] mr-1.5">
                          {new Date(log.timestamp).toLocaleTimeString([], { hour12: false })}
                        </span>
                        <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase mr-2 ${
                          log.section === "SCHEDULER" 
                            ? "bg-blue-950 text-blue-400 border border-blue-800/30"
                            : log.section === "API"
                              ? "bg-indigo-950 text-indigo-400 border border-indigo-800/30"
                              : log.section === "HOLIDAY_CHECK"
                                ? "bg-amber-950/60 text-amber-400 border border-amber-500/20"
                                : "bg-zinc-900 text-slate-300"
                        }`}>
                          {log.section}
                        </span>
                        <span className="text-slate-100">{log.message}</span>
                      </div>
                    ))
                  )}
                  <div ref={logsEndRef} />
                </div>

                <div className="bg-[#1C1F2A] border border-[#2D3348] rounded-2xl p-4.5 text-xs text-slate-400 leading-normal flex items-start gap-2.5">
                  <Info className="h-4.5 w-4.5 text-indigo-400 shrink-0 mt-0.5" />
                  <p className="text-[11px]">
                    This console displays real-time execution flows directly from our backend scheduler daemon, simulating your custom Python desktop agent.
                  </p>
                </div>
              </div>
            )}

            {/* TAB 3: SETTINGS CONFIG */}
            {activeTab === "settings" && (
              <div id="tab_settings" className="space-y-5">
                
                {/* Python desktop importer banner */}
                <div className="bg-gradient-to-br from-[#1E2230] to-[#161924] rounded-3xl p-5 shadow-lg border border-[#2D3348] space-y-3.5">
                  <div className="flex items-center gap-2.5">
                    <FileCode className="h-5 w-5 text-emerald-400" />
                    <div>
                      <h4 className="font-bold text-sm text-white">Import Python Script</h4>
                      <p className="text-[11px] text-slate-400">Extracts Monday API keys, Forms, and timezone variables automatically</p>
                    </div>
                  </div>

                  <textarea
                    value={pythonCode}
                    onChange={(e) => setPythonCode(e.target.value)}
                    placeholder="Paste Python Tkinter or PyQt autologin script here..."
                    className="w-full h-24 bg-[#0F111A] border border-[#2D3348] rounded-2xl p-3 font-mono text-xs text-slate-200 focus:outline-none focus:border-indigo-500 placeholder:text-slate-700 leading-relaxed resize-none"
                  />

                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-slate-500 font-mono">Accepts App.py & autologin.py formats</span>
                    <button
                      onClick={handleParsePython}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-4 py-2 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm shadow-indigo-600/10"
                    >
                      <RefreshCw className="h-3 w-3 animate-spin-slow" />
                      <span>Extract & Populate</span>
                    </button>
                  </div>

                  {importFeedback && (
                    <div className={`p-3 rounded-2xl text-xs font-semibold ${
                      importFeedback.success 
                        ? "bg-emerald-950/40 text-emerald-400 border border-emerald-500/20" 
                        : "bg-rose-950/40 text-rose-400 border border-rose-500/20"
                    }`}>
                      {importFeedback.message}
                    </div>
                  )}
                </div>
                {/* Configuration details */}
                <div className="bg-[#1C1F2A] rounded-3xl p-5 border border-[#2D3348] space-y-4">
                  <div className="flex items-center gap-2 border-b border-[#2D3348] pb-3">
                    <Layers className="h-4.5 w-4.5 text-indigo-400" />
                    <h3 className="font-extrabold text-sm text-white">WorkForms Form Configuration</h3>
                  </div>

                  <div className="space-y-4 animate-fadeIn">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">WorkForms Submission URL</label>
                        <input
                          type="text"
                          value={settings.url}
                          onChange={(e) => setSettings({ ...settings, url: e.target.value })}
                          placeholder="https://forms.monday.com/workforms/external/forms/..."
                          className="w-full bg-[#0F111A] border border-[#2D3348] rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">Reporting Email</label>
                        <input
                          type="email"
                          value={settings.email}
                          onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                          placeholder="e.g. your@email.com
                          className="w-full bg-[#0F111A] border border-[#2D3348] rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-semibold"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] flex items-center justify-between">
                          <span>Monday Session Cookies (For Authenticated Forms)</span>
                          <span className="text-[9px] text-indigo-400 font-mono font-normal normal-case">Optional</span>
                        </label>
                        <textarea
                          value={settings.sessionCookie || ""}
                          onChange={(e) => setSettings({ ...settings, sessionCookie: e.target.value })}
                          placeholder="Paste your Monday.com Cookie header here if your WorkForm requires corporate/SSO authentication..."
                          className="w-full h-16 bg-[#0F111A] border border-[#2D3348] rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 resize-none font-mono text-[10px]"
                        />
                        <p className="text-[9px] text-slate-500 leading-normal">
                          Required only if the Monday Form restricts submission to organization members. Extract the Cookie header from browser DevTools (F12 &rarr; Network tab) and paste it here.
                        </p>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] flex items-center justify-between">
                          <span>Gemini API Key (For Holiday Checks)</span>
                          <span className="text-[9px] text-indigo-400 font-mono font-normal normal-case">Optional</span>
                        </label>
                        <input
                          type="password"
                          value={settings.geminiApiKey || ""}
                          onChange={(e) => setSettings({ ...settings, geminiApiKey: e.target.value })}
                          placeholder="Paste your Gemini API Key here..."
                          className="w-full bg-[#0F111A] border border-[#2D3348] rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                        />
                        <p className="text-[9px] text-slate-500 leading-normal">
                          Used to determine Singapore public holidays. If neither this field nor the system environment contains an API key, the holiday check defaults to standard working days.
                        </p>
                      </div>

                      {/* Advanced View Toggle Header */}
                      <div className="flex items-center justify-between pt-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">WorkForms Payload Config</label>
                        <button
                          type="button"
                          onClick={() => setIsJsonViewActive(!isJsonViewActive)}
                          className="text-[10px] text-indigo-400 font-bold hover:text-indigo-300 flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          {isJsonViewActive ? (
                            <>
                              <SlidersHorizontal className="h-3 w-3" />
                              <span>Switch to Interactive Form</span>
                            </>
                          ) : (
                            <>
                              <FileCode className="h-3 w-3" />
                              <span>Switch to Raw JSON Editor</span>
                            </>
                          )}
                        </button>
                      </div>

                      {isJsonViewActive ? (
                        /* Advanced JSON Textarea View */
                        <div className="space-y-1.5 animate-fadeIn">
                          <textarea
                            value={settings.answersJson}
                            onChange={(e) => setSettings({ ...settings, answersJson: e.target.value })}
                            placeholder="{ ... }"
                            className="w-full h-48 bg-[#0F111A] border border-[#2D3348] rounded-xl p-3 font-mono text-[11px] text-slate-300 focus:outline-none focus:border-indigo-500 resize-none leading-relaxed"
                          />
                        </div>
                      ) : (
                        /* Mobile Form Interactive Simulation View */
                        <div className="space-y-3.5 animate-fadeIn">
                          
                          {/* Inner Mobile-Style Form Wrapper */}
                          <div className="bg-[#0F111A] border border-[#2D3348] rounded-2xl p-4 space-y-4">
                            <div className="flex items-center justify-between border-b border-[#2D3348]/60 pb-2.5">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                <Clock className="h-3 w-3 text-indigo-400" />
                                Interactive Form Preview
                              </span>
                              <span className="text-[9px] text-[#64748B] font-mono">Simulates submission payload</span>
                            </div>

                            {/* Dynamic parsed fields */}
                            <div className="space-y-3">
                              {Object.entries(getParsedPayload().answers).length === 0 ? (
                                <div className="text-center text-slate-500 italic text-xs py-2">
                                  No fields configured. Add one below to start.
                                </div>
                              ) : (
                                Object.entries(getParsedPayload().answers).map(([key, value]) => {
                                  const isBool = typeof value === "boolean";
                                  const isNum = typeof value === "number";

                                  return (
                                    <div key={key} className="bg-[#12141C]/50 border border-[#2D3348]/30 rounded-xl p-3.5 space-y-2 relative group transition-all hover:border-[#2D3348]">
                                      
                                      {/* Header with name and delete action */}
                                      <div className="flex items-start justify-between">
                                        <div>
                                          <span className="text-[11px] font-bold text-slate-200 block">
                                            {getFriendlyLabel(key)}
                                          </span>
                                          <code className="text-[9px] text-slate-500 font-mono block mt-0.5">
                                            Key: {key}
                                          </code>
                                        </div>
                                        <button
                                          type="button"
                                          onClick={() => deletePayloadField(key)}
                                          className="text-slate-600 hover:text-rose-400 p-1 rounded-lg transition-colors cursor-pointer"
                                          title="Delete Field"
                                        >
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                      </div>

                                      {/* Specific Controls */}
                                      <div className="pt-1.5">
                                        {isBool ? (
                                          <div className="flex items-center justify-between bg-[#0F111A] px-3 py-2 rounded-xl border border-[#2D3348]/40">
                                            <span className="text-xs text-slate-300">Option state: {value ? "Checked / Yes" : "Unchecked / No"}</span>
                                            <button
                                              type="button"
                                              onClick={() => updatePayloadField(key, !value)}
                                              className="transition-colors cursor-pointer"
                                            >
                                              {value ? (
                                                <ToggleRight className="h-7 w-7 text-indigo-400 fill-indigo-400/20" />
                                              ) : (
                                                <ToggleLeft className="h-7 w-7 text-slate-600" />
                                              )}
                                            </button>
                                          </div>
                                        ) : isNum ? (
                                          <input
                                            type="number"
                                            value={value as number}
                                            onChange={(e) => updatePayloadField(key, Number(e.target.value))}
                                            className="w-full bg-[#0F111A] border border-[#2D3348]/60 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                                          />
                                        ) : (
                                          <input
                                            type="text"
                                            value={value as string}
                                            onChange={(e) => updatePayloadField(key, e.target.value)}
                                            className="w-full bg-[#0F111A] border border-[#2D3348]/60 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                                          />
                                        )}
                                      </div>

                                    </div>
                                  );
                                })
                              )}
                            </div>

                            {/* Timezone settings block */}
                            <div className="pt-2 border-t border-[#2D3348]/40 space-y-2">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                Form Timezone Offset
                              </span>
                              <div className="grid grid-cols-1 gap-2">
                                <select
                                  value={getParsedPayload().timezone}
                                  onChange={(e) => updateTimezoneOffset(Number(e.target.value))}
                                  className="w-full bg-[#12141C] border border-[#2D3348] rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
                                >
                                  {commonTimezones.map((tz) => (
                                    <option key={tz.offset} value={tz.offset}>
                                      {tz.label}
                                    </option>
                                  ))}
                                  {/* Fallback option if timezone isn't in presets */}
                                  {!commonTimezones.some(t => t.offset === getParsedPayload().timezone) && (
                                    <option value={getParsedPayload().timezone}>
                                      Custom Offset ({getParsedPayload().timezone}m)
                                    </option>
                                  )}
                                </select>
                                
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] text-slate-500 font-mono shrink-0">Custom offset (minutes):</span>
                                  <input
                                    type="number"
                                    value={getParsedPayload().timezone}
                                    onChange={(e) => updateTimezoneOffset(Number(e.target.value))}
                                    className="w-20 bg-[#12141C] border border-[#2D3348] rounded-lg px-2 py-1 text-xs text-center font-mono text-slate-200 focus:outline-none focus:border-indigo-500"
                                  />
                                </div>
                              </div>
                            </div>

                          </div>

                          {/* Dynamic Add Field Box */}
                          <div className="bg-[#0F111A]/40 border border-[#2D3348]/40 rounded-2xl p-4.5 space-y-3">
                            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block">
                              Add New Field to Form
                            </span>
                            <div className="flex flex-col gap-2">
                              <input
                                type="text"
                                value={newFieldName}
                                onChange={(e) => setNewFieldName(e.target.value)}
                                placeholder="Unique Field Key (e.g. status_col)"
                                className="w-full bg-[#12141C] border border-[#2D3348] rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                              />
                              <div className="grid grid-cols-2 gap-2">
                                <select
                                  value={newFieldType}
                                  onChange={(e) => setNewFieldType(e.target.value as any)}
                                  className="bg-[#12141C] border border-[#2D3348] rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 cursor-pointer"
                                >
                                  <option value="text">Text / Input</option>
                                  <option value="boolean">Toggle / Checkbox</option>
                                  <option value="number">Numeric</option>
                                </select>
                                <button
                                  type="button"
                                  onClick={addPayloadField}
                                  disabled={!newFieldName.trim()}
                                  className="bg-indigo-600/20 hover:bg-indigo-600 text-indigo-400 hover:text-white border border-indigo-500/25 rounded-xl text-xs font-bold py-2 transition-all cursor-pointer disabled:opacity-40 disabled:hover:bg-indigo-600/20 disabled:hover:text-indigo-400"
                                >
                                  + Insert Field
                                </button>
                              </div>
                            </div>
                          </div>

                        </div>
                      )}
                    </div>

                    {/* Day-Specific Payload Configuration Toggle */}
                    <div className="bg-[#0F111A]/40 border border-[#2D3348]/40 rounded-2xl p-4.5 space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block">
                            Day-Specific Payloads
                          </span>
                          <span className="text-[9px] text-[#64748B] block mt-0.5">
                            Use different JSON payloads depending on the day of the week
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSettings({ ...settings, useDaySpecificJson: !settings.useDaySpecificJson })}
                          className="transition-colors cursor-pointer"
                        >
                          {settings.useDaySpecificJson ? (
                            <ToggleRight className="h-7 w-7 text-indigo-400 fill-indigo-400/20" />
                          ) : (
                            <ToggleLeft className="h-7 w-7 text-slate-600" />
                          )}
                        </button>
                      </div>

                      {settings.useDaySpecificJson && (
                        <div className="space-y-3 animate-fadeIn">
                          {/* Horizontal Day Tabs */}
                          <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-slate-800">
                            {["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"].map((day) => (
                              <button
                                key={day}
                                type="button"
                                onClick={() => setSelectedConfigDay(day)}
                                className={`px-3 py-1.5 rounded-lg text-[10px] font-semibold capitalize whitespace-nowrap cursor-pointer transition-all ${
                                  selectedConfigDay === day
                                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/10"
                                    : "bg-[#12141C] text-slate-400 hover:text-slate-200 border border-[#2D3348]/50"
                                }`}
                              >
                                {day.substring(0, 3)}
                              </button>
                            ))}
                          </div>

                          {/* Textarea for selected day */}
                          <div className="space-y-1.5">
                            <div className="flex justify-between items-center">
                              <span className="text-[9px] font-semibold text-slate-400 capitalize">
                                {selectedConfigDay} Payload (Raw JSON):
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  const updatedSpecific = { ...settings.daySpecificAnswersJson };
                                  updatedSpecific[selectedConfigDay] = settings.answersJson;
                                  setSettings({
                                    ...settings,
                                    daySpecificAnswersJson: updatedSpecific
                                  });
                                }}
                                className="text-[9px] text-indigo-400 font-semibold hover:text-indigo-300 transition-colors cursor-pointer"
                              >
                                Copy Default Payload
                              </button>
                            </div>
                            <textarea
                              value={settings.daySpecificAnswersJson?.[selectedConfigDay] || ""}
                              onChange={(e) => {
                                const updatedSpecific = { ...settings.daySpecificAnswersJson };
                                updatedSpecific[selectedConfigDay] = e.target.value;
                                setSettings({
                                  ...settings,
                                  daySpecificAnswersJson: updatedSpecific
                                });
                              }}
                              placeholder={`{"answers": { ... }}`}
                              className="w-full h-32 bg-[#0F111A] border border-[#2D3348] rounded-xl p-3 font-mono text-[11px] text-slate-300 focus:outline-none focus:border-indigo-500 resize-none leading-relaxed"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                  {/* Scheduler Settings details */}
                  <div className="border-t border-[#2D3348] pt-4.5 space-y-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4.5 w-4.5 text-indigo-400" />
                      <h4 className="font-extrabold text-xs text-white uppercase tracking-wider">Scheduler Rules</h4>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">Daily Login Time (GMT+8)</label>
                      <input
                        type="time"
                        value={settings.loginTime}
                        onChange={(e) => setSettings({ ...settings, loginTime: e.target.value })}
                        className="w-full bg-[#0F111A] border border-[#2D3348] rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-semibold font-mono"
                      />
                    </div>

                    {/* Weekdays pickers */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] block">Active Scheduler Days</label>
                      <div className="flex flex-wrap gap-1.5">
                        {["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"].map((day) => {
                          const isSelected = settings.days.includes(day);
                          return (
                            <button
                              key={day}
                              onClick={() => toggleDay(day)}
                              className={`px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wide border transition-all cursor-pointer ${
                                isSelected
                                  ? "bg-indigo-600 border-indigo-500 text-white"
                                  : "bg-[#0F111A] border-[#2D3348] text-slate-400 hover:text-slate-200"
                              }`}
                            >
                              {day.slice(0, 3)}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Toggles */}
                    <div className="space-y-3 pt-2">
                      {/* Holiday Check */}
                      <div className="flex items-center justify-between">
                        <div className="text-xs">
                          <span className="font-bold text-white block">LLM Holiday & Weekend Filter</span>
                          <span className="text-[10px] text-slate-500">Skips login automatically using Gemini AI</span>
                        </div>
                        <button
                          onClick={() => setSettings({ ...settings, enableHolidayCheck: !settings.enableHolidayCheck })}
                          className="text-slate-300 hover:text-white transition-colors cursor-pointer"
                        >
                          {settings.enableHolidayCheck ? (
                            <ToggleRight className="h-8 w-8 text-indigo-400 fill-indigo-400/20" />
                          ) : (
                            <ToggleLeft className="h-8 w-8 text-slate-600" />
                          )}
                        </button>
                      </div>

                      {/* Randomize delay */}
                      <div className="flex items-center justify-between">
                        <div className="text-xs">
                          <span className="font-bold text-white block">Simulate Human Behavior</span>
                          <span className="text-[10px] text-slate-500">Adds randomized delay before logging in</span>
                        </div>
                        <button
                          onClick={() => setSettings({ ...settings, randomizeLogin: !settings.randomizeLogin })}
                          className="text-slate-300 hover:text-white transition-colors cursor-pointer"
                        >
                          {settings.randomizeLogin ? (
                            <ToggleRight className="h-8 w-8 text-indigo-400 fill-indigo-400/20" />
                          ) : (
                            <ToggleLeft className="h-8 w-8 text-slate-600" />
                          )}
                        </button>
                      </div>
                    </div>

                  </div>

                  {/* Save config button */}
                  <button
                    onClick={() => handleSaveSettings(settings)}
                    disabled={actionLoading}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 active:scale-98 text-white font-extrabold py-3.5 rounded-2xl text-xs transition-colors shadow-lg shadow-indigo-600/10 cursor-pointer uppercase tracking-wider block"
                  >
                    {actionLoading ? <Loader2 className="h-4.5 w-4.5 animate-spin mx-auto" /> : "Save Configuration"}
                  </button>

                </div>

              </div>
            )}

          </div>

        </main>

        {/* Persistent Bottom Tab Navigation Bar */}
        <footer id="app_footer" className="sticky bottom-0 z-40 bg-[#12141C] border-t border-[#2D3348] py-4 px-6 flex justify-around items-center shadow-lg">
          
          {/* Dashboard Tab */}
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`flex flex-col items-center gap-1.5 text-[11px] transition-colors cursor-pointer ${
              activeTab === "dashboard" ? "text-indigo-400 font-bold" : "text-[#64748B] font-medium hover:text-slate-300"
            }`}
          >
            <Clock className="h-5 w-5" />
            <span>Control Panel</span>
          </button>

          {/* Console stdout Tab */}
          <button
            onClick={() => setActiveTab("logs")}
            className={`flex flex-col items-center gap-1.5 text-[11px] transition-colors cursor-pointer ${
              activeTab === "logs" ? "text-indigo-400 font-bold" : "text-[#64748B] font-medium hover:text-slate-300"
            }`}
          >
            <Terminal className="h-5 w-5" />
            <span>Console</span>
          </button>

          {/* Settings Tab */}
          <button
            onClick={() => setActiveTab("settings")}
            className={`flex flex-col items-center gap-1.5 text-[11px] transition-colors cursor-pointer ${
              activeTab === "settings" ? "text-indigo-400 font-bold" : "text-[#64748B] font-medium hover:text-slate-300"
            }`}
          >
            <SettingsIcon className="h-5 w-5" />
            <span>Setup</span>
          </button>

        </footer>

      </div>

    </div>
  );
}
