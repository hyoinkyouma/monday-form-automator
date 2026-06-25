import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import fs from "fs";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

// Default Settings
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
}

const SETTINGS_FILE = path.join(process.cwd(), "settings.json");

// Non-sensitive placeholders inside the source code defaults
let settings: AppSettings = {
  email: "your-email@example.com",
  password: "",
  url: "https://forms.monday.com/workforms/external/forms/YOUR_FORM_ID/submissions?r=use1",
  loginTime: "08:30",
  checkInterval: 60,
  days: ["monday", "tuesday", "wednesday", "thursday", "friday"],
  enableHolidayCheck: true,
  randomizeLogin: true,
  employeeName: "Employee Name",
  answersJson: JSON.stringify({
    answers: {
      name: "your-email@example.com",
      email_mkrmv9fp: "your-email@example.com",
      color_mkrje2rg: "1",
      booleanvky5wtu0: true,
      boolean7kqnipqy: false,
      booleanimy35rjk: true
    },
    "form-timezone-offset": -480,
    tags: []
  }, null, 2),
  sessionCookie: "",
  geminiApiKey: ""
};

// Sync settings with environment variables holding credentials
function loadEnvCredentials() {
  try {
    log("Checking environment variables for sensitive credentials...", "APP");
    
    const updated: Partial<AppSettings> = {};
    if (process.env.EMPLOYEE_EMAIL) updated.email = process.env.EMPLOYEE_EMAIL;
    if (process.env.EMPLOYEE_NAME) updated.employeeName = process.env.EMPLOYEE_NAME;
    if (process.env.WORKFORMS_URL) updated.url = process.env.WORKFORMS_URL;
    if (process.env.WORKFORMS_ANSWERS_JSON) updated.answersJson = process.env.WORKFORMS_ANSWERS_JSON;
    if (process.env.MONDAY_SESSION_COOKIE) updated.sessionCookie = process.env.MONDAY_SESSION_COOKIE;
    if (process.env.WORKFORMS_COOKIE) updated.sessionCookie = process.env.WORKFORMS_COOKIE;
    if (process.env.GEMINI_API_KEY) updated.geminiApiKey = process.env.GEMINI_API_KEY;
    
    settings = { ...settings, ...updated };
    log("Successfully synced sensitive credentials from environment variables (.env)", "APP");
  } catch (err: any) {
    log(`Error loading environment credentials: ${err.message}`, "APP");
  }
}

// Load settings from file
function loadSettings() {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const data = fs.readFileSync(SETTINGS_FILE, "utf-8");
      settings = { ...settings, ...JSON.parse(data) };
      log("Settings loaded from file successfully", "APP");
    } else {
      saveSettingsToFile();
      log("Created default settings.json", "APP");
    }
    
    // Always override with .env credentials
    loadEnvCredentials();
  } catch (error: any) {
    log(`Error loading settings from file: ${error.message}`, "APP");
  }
}

function saveSettingsToFile() {
  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 4), "utf-8");
  } catch (error: any) {
    log(`Error writing settings to file: ${error.message}`, "APP");
  }
}

// Logs tracking
interface LogEntry {
  timestamp: string;
  message: string;
  section: string;
}
const serverLogs: LogEntry[] = [];

function log(message: string, section = "APP") {
  const timestamp = new Date().toISOString();
  console.log(`[${section}] ${timestamp} - ${message}`);
  serverLogs.push({ timestamp, message, section });
  if (serverLogs.length > 300) {
    serverLogs.shift();
  }
}

// Lazy load Gemini API
function getGeminiClient(): GoogleGenAI | null {
  const key = settings.geminiApiKey?.trim() || process.env.GEMINI_API_KEY?.trim();
  if (!key) {
    return null;
  }
  return new GoogleGenAI({
    apiKey: key,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build'
      }
    }
  });
}

// Singapore Public Holidays list for 2026 and 2027 to bypass LLM and prevent 503 errors
const SINGAPORE_HOLIDAYS: Record<string, string> = {
  // 2026
  "2026-01-01": "New Year's Day",
  "2026-02-17": "Chinese New Year",
  "2026-02-18": "Chinese New Year",
  "2026-03-20": "Hari Raya Puasa",
  "2026-04-03": "Good Friday",
  "2026-05-01": "Labour Day",
  "2026-05-27": "Hari Raya Haji",
  "2026-05-31": "Vesak Day",
  "2026-06-01": "Vesak Day (Observed)",
  "2026-08-09": "National Day",
  "2026-08-10": "National Day (Observed)",
  "2026-11-08": "Deepavali",
  "2026-11-09": "Deepavali (Observed)",
  "2026-12-25": "Christmas Day",

  // 2027
  "2027-01-01": "New Year's Day",
  "2027-02-06": "Chinese New Year",
  "2027-02-07": "Chinese New Year",
  "2027-02-08": "Chinese New Year (Observed)",
  "2027-03-10": "Hari Raya Puasa",
  "2027-03-26": "Good Friday",
  "2027-05-01": "Labour Day",
  "2027-05-17": "Hari Raya Haji",
  "2027-05-20": "Vesak Day",
  "2027-08-09": "National Day",
  "2027-10-29": "Deepavali",
  "2027-12-25": "Christmas Day",
  "2027-12-27": "Christmas Day (Observed)",
};

async function waitMs(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// LLM Public Holiday and Weekend Checker with Local Bypasses, Retry Logic, and Fallback Models
async function isHolidayOrWeekendLLM(): Promise<{ isHolidayOrWeekend: boolean; reason: string }> {
  log("Analyzing if today is a public holiday or weekend in Singapore...", "HOLIDAY_CHECK");
  try {
    const today = new Date();
    
    // Get Singapore Day of the Week
    const weekdayFormatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Singapore",
      weekday: "long"
    });
    const sgWeekday = weekdayFormatter.format(today);
    
    if (sgWeekday === "Saturday" || sgWeekday === "Sunday") {
      log(`Local pre-check: Today is ${sgWeekday} (weekend) in Singapore. Bypassing LLM call.`, "HOLIDAY_CHECK");
      return { isHolidayOrWeekend: true, reason: `Today is ${sgWeekday} (weekend)` };
    }

    // Get Singapore Date string (YYYY-MM-DD)
    const dateFormatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Singapore",
      year: "numeric",
      month: "numeric",
      day: "numeric"
    });
    const parts = dateFormatter.formatToParts(today);
    const y = parts.find(p => p.type === 'year')?.value || '';
    const m = parts.find(p => p.type === 'month')?.value.padStart(2, '0') || '';
    const d = parts.find(p => p.type === 'day')?.value.padStart(2, '0') || '';
    const sgDateStr = `${y}-${m}-${d}`;

    if (SINGAPORE_HOLIDAYS[sgDateStr]) {
      const holidayName = SINGAPORE_HOLIDAYS[sgDateStr];
      log(`Local pre-check: Today is ${holidayName} (${sgDateStr}) in Singapore. Bypassing LLM call.`, "HOLIDAY_CHECK");
      return { isHolidayOrWeekend: true, reason: `Today is ${holidayName} (public holiday)` };
    }

    // If not found in local checks, query Gemini API with retry and model fallback as a backup
    const formattedDate = today.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "Asia/Singapore"
    });

    const prompt = `You are a reliable calendar analyzer. 
Analyze if today (${formattedDate}) is an official public holiday in Singapore.
Respond strictly in JSON format. The response must be a JSON object with keys "isHolidayOrWeekend" (boolean) and "reason" (string). 

Example response:
{
  "isHolidayOrWeekend": true,
  "reason": "Today is Good Friday (public holiday)"
}

Do not return any markdown formatting outside the JSON object itself. Ensure it is valid JSON.`;

    const ai = getGeminiClient();
    if (!ai) {
      log("No Gemini API key configured in Settings or environment. Bypassing LLM check and assuming a working day.", "HOLIDAY_CHECK");
      return { isHolidayOrWeekend: false, reason: "No Gemini API key provided. Assuming standard working day." };
    }
    const modelsToTry = ["gemini-3.5-flash", "gemini-3.1-flash-lite"];
    let lastError: any = null;

    for (const model of modelsToTry) {
      log(`Attempting Gemini query with model: ${model}...`, "HOLIDAY_CHECK");
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const response = await ai.models.generateContent({
            model: model,
            contents: prompt,
            config: {
              responseMimeType: "application/json"
            }
          });

          const text = response.text || "";
          const parsed = JSON.parse(text.trim());
          log(`Successfully checked holiday status with model ${model} on attempt ${attempt}.`, "HOLIDAY_CHECK");
          return {
            isHolidayOrWeekend: !!parsed.isHolidayOrWeekend,
            reason: parsed.reason || "Determined by Gemini LLM"
          };
        } catch (error: any) {
          lastError = error;
          log(`Attempt ${attempt} using ${model} failed: ${error.message}`, "HOLIDAY_CHECK");
          if (attempt < 3) {
            const backoffTime = attempt * 1000;
            log(`Waiting ${backoffTime}ms before retrying...`, "HOLIDAY_CHECK");
            await waitMs(backoffTime);
          }
        }
      }
    }

    throw lastError || new Error("Failed all Gemini LLM connection attempts.");
  } catch (error: any) {
    log(`All holiday checks failed or error occurred: ${error.message}. Defaulting to false (working day).`, "HOLIDAY_CHECK");
    return { isHolidayOrWeekend: false, reason: "Error query or missing Gemini key: assume standard working day." };
  }
}

// Cookie parser and merger to replicate Python requests.Session cookie storage behavior
function parseCookies(cookieStr: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!cookieStr) return cookies;
  
  const parts = cookieStr.split(";");
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx > 0) {
      const key = trimmed.substring(0, eqIdx).trim();
      const val = trimmed.substring(eqIdx + 1).trim();
      const upperKey = key.toUpperCase();
      if (["PATH", "DOMAIN", "EXPIRES", "MAX-AGE", "SECURE", "HTTPONLY", "SAMESITE"].includes(upperKey)) {
        continue;
      }
      cookies[key] = val;
    }
  }
  return cookies;
}

function mergeCookies(existingCookieHeader: string, setCookieHeaders: string[]): string {
  const cookieMap = parseCookies(existingCookieHeader);
  
  for (const setCookie of setCookieHeaders) {
    const parsed = parseCookies(setCookie);
    for (const [key, val] of Object.entries(parsed)) {
      cookieMap[key] = val;
    }
  }
  
  return Object.entries(cookieMap)
    .map(([key, val]) => `${key}=${val}`)
    .join("; ");
}

// Main autologin function
let lastLoginTime: string | null = null;

async function doAutoLogin(isManual = false, overrideCookie?: string) {
  log("Starting AutoLogin process...", isManual ? "MANUAL_TEST" : "SCHEDULER_CALLBACK");

  // 1. Holiday Check
  if (settings.enableHolidayCheck) {
    try {
      const holidayInfo = await isHolidayOrWeekendLLM();
      log(`Holiday analyzer result: ${JSON.stringify(holidayInfo)}`, "APP");
      if (holidayInfo.isHolidayOrWeekend) {
        log(`Today is a public holiday or weekend (${holidayInfo.reason}). Skipping automatic login.`, "APP");
        return { success: false, skipped: true, reason: holidayInfo.reason };
      }
    } catch (err: any) {
      log(`Holiday check error: ${err.message}. Proceeding with login anyway.`, "APP");
    }
  }

  // 2. Randomized delay to simulate human behavior
  if (settings.randomizeLogin && !isManual) {
    const delaySecs = Math.floor(Math.random() * 120) + 10; // 10 to 130 seconds to keep within Cloud Run sandbox friendly limit
    log(`Human behavior simulation active: Random delay of ${delaySecs} seconds applied. Waiting...`, "APP");
    await new Promise((resolve) => setTimeout(resolve, delaySecs * 1000));
    log("Delay finished, resuming autologin...", "APP");
  }

  // Determine initial cookies to send (SSO/authentication cookies)
  const envCookie = process.env.WORKFORMS_COOKIE || process.env.MONDAY_SESSION_COOKIE || process.env.COOKIE;
  const initialCookie = overrideCookie || envCookie || settings.sessionCookie || "";

  // Extract the form ID from submissions URL
  const formIdMatch = settings.url.match(/\/forms\/([a-f0-9]{32})/);
  const formId = formIdMatch ? formIdMatch[1] : "726fd8547dbaa83d6c0d70f891d97be7";
  const formUrl = `https://forms.monday.com/forms/${formId}`;
  log(`Base form page URL: ${formUrl}`, "APP");

  // Parse pulse_account_id and visitor_id dynamically from initialCookie if present
  const pulse_account_id = (() => {
    const m = initialCookie.match(/platform_account_id=([^;]+)/);
    return m ? parseInt(m[1], 10) : 13536981;
  })();

  const visitor_id = (() => {
    const m = initialCookie.match(/bb_visitor_id=([^;]+)/);
    return m ? m[1] : "48bae79d";
  })();

  let focusField = "color_mkrje2rg";
  try {
    const answersObj = JSON.parse(settings.answersJson);
    if (answersObj && answersObj.answers) {
      const foundKey = Object.keys(answersObj.answers).find(k => k.startsWith("color_") || (k !== "name" && !k.startsWith("email_")));
      if (foundKey) {
        focusField = foundKey;
      }
    }
  } catch (err) {
    // Keep default
  }

  const currentTs = Math.floor(Date.now() / 1000);

  // Construct precise telemetry simulation payload mirroring autologin.py
  const PAYLOAD_LOGIN = [
    {
      pulse_account_id,
      visitor_id,
      source: formId,
      sync_interval: 10000,
      get_visitor_id_timeout: 5000,
      batch_size: 100,
      alias_timeout: 5000,
      methods_interval: 1000,
      send_immediately: false,
      create_visitor: true,
      cookies_enabled: true,
      is_tracker_cross_domain: false,
      emit_visitor_id: false,
      bigbrain_url: "https://track.bigbrain.me/prod",
      session_id: "d71f261a-2cf2-7f8f-7a60-b103b7b7cfc2",
      os_language: "en-US",
      user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0",
      browser: "chrome",
      browser_version: 143,
      os: "windows",
      device: "desktop",
      screen_height: 800,
      screen_width: 1280,
      tz_offset: 8,
      nav_type: 0,
      info3: "external_form_url",
      marketing_landing_page: `https://forms.monday.com/forms/${formId}`,
      kind: "UI",
      info1: "11",
      direct_object_id: 142442490,
      direct_object: "board_view_id",
      info2: "8",
      placement: "submit_view",
      data: { mf_name: "mf-form-viewer" },
      name: "form_loaded",
      timestamp: currentTs - 10,
      uuid: "19b7cc674e9fb92fd7c13a64c2ab177e2b2",
      seconds_since_happened: 10,
      pulse_user_id: null
    },
    {
      pulse_account_id,
      visitor_id,
      source: formId,
      sync_interval: 10000,
      get_visitor_id_timeout: 5000,
      batch_size: 100,
      alias_timeout: 5000,
      methods_interval: 1000,
      send_immediately: false,
      create_visitor: true,
      cookies_enabled: true,
      is_tracker_cross_domain: false,
      emit_visitor_id: false,
      bigbrain_url: "https://track.bigbrain.me/prod",
      session_id: "d71f261a-2cf2-7f8f-7a60-b103b7b7cfc2",
      os_language: "en-US",
      user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0",
      browser: "chrome",
      browser_version: 143,
      os: "windows",
      device: "desktop",
      screen_height: 800,
      screen_width: 1280,
      tz_offset: 8,
      nav_type: 0,
      info3: "unknown_source",
      marketing_landing_page: `https://forms.monday.com/forms/${formId}`,
      kind: "UI",
      info1: "0",
      direct_object_id: 142442490,
      direct_object: "board_view_id",
      info2: "0",
      placement: "submit_view",
      data: { mf_name: "mf-form-viewer" },
      name: "form_loaded_pages",
      timestamp: currentTs - 10,
      uuid: "19b7cc6947fced2c14c4ca34ddff9af2af7",
      seconds_since_happened: 10,
      pulse_user_id: null
    },
    {
      pulse_account_id,
      visitor_id,
      source: formId,
      sync_interval: 10000,
      get_visitor_id_timeout: 5000,
      batch_size: 100,
      alias_timeout: 5000,
      methods_interval: 1000,
      send_immediately: false,
      create_visitor: true,
      cookies_enabled: true,
      is_tracker_cross_domain: false,
      emit_visitor_id: false,
      bigbrain_url: "https://track.bigbrain.me/prod",
      session_id: "d71f261a-2cf2-7f8f-7a60-b103b7b7cfc2",
      os_language: "en-US",
      user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0",
      browser: "chrome",
      browser_version: 143,
      os: "windows",
      device: "desktop",
      screen_height: 800,
      screen_width: 1280,
      tz_offset: 8,
      nav_type: 0,
      info3: "external_form_url",
      marketing_landing_page: `https://forms.monday.com/forms/${formId}`,
      kind: "UI",
      info1: focusField,
      direct_object_id: 142442490,
      direct_object: "board_view_id",
      info2: "SingleSelect",
      placement: "submit_view",
      data: { mf_name: "mf-form-viewer" },
      name: "question_focused",
      timestamp: currentTs - 2,
      uuid: "19b7cc6947fced2c14c4ca34ddff9af2af7",
      seconds_since_happened: 2,
      pulse_user_id: null
    },
    {
      pulse_account_id,
      visitor_id,
      source: formId,
      sync_interval: 10000,
      get_visitor_id_timeout: 5000,
      batch_size: 100,
      alias_timeout: 5000,
      methods_interval: 1000,
      send_immediately: false,
      create_visitor: true,
      cookies_enabled: true,
      is_tracker_cross_domain: false,
      emit_visitor_id: false,
      bigbrain_url: "https://track.bigbrain.me/prod",
      session_id: "d71f261a-2cf2-7f8f-7a60-b103b7b7cfc2",
      os_language: "en-US",
      user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0",
      browser: "chrome",
      browser_version: 143,
      os: "windows",
      device: "desktop",
      screen_height: 800,
      screen_width: 1280,
      tz_offset: 8,
      nav_type: 0,
      info3: "external_form_url",
      marketing_landing_page: `https://forms.monday.com/forms/${formId}`,
      kind: "UI",
      info1: focusField,
      direct_object_id: 142442490,
      direct_object: "board_view_id",
      info2: "SingleSelect",
      placement: "submit_view",
      data: { mf_name: "mf-form-viewer" },
      name: "question_focused",
      timestamp: currentTs - 2,
      uuid: "19b7cc6947f4cac65f37cee8393ced337fd",
      seconds_since_happened: 2,
      pulse_user_id: null
    },
    {
      pulse_account_id,
      visitor_id,
      source: formId,
      sync_interval: 10000,
      get_visitor_id_timeout: 5000,
      batch_size: 100,
      alias_timeout: 5000,
      methods_interval: 1000,
      send_immediately: false,
      create_visitor: true,
      cookies_enabled: true,
      is_tracker_cross_domain: false,
      emit_visitor_id: false,
      bigbrain_url: "https://track.bigbrain.me/prod",
      session_id: "d71f261a-2cf2-7f8f-7a60-b103b7b7cfc2",
      os_language: "en-US",
      user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0",
      browser: "chrome",
      browser_version: 143,
      os: "windows",
      device: "desktop",
      screen_height: 800,
      screen_width: 1280,
      tz_offset: 8,
      nav_type: 0,
      info3: "external_form_url",
      marketing_landing_page: `https://forms.monday.com/forms/${formId}`,
      kind: "UI",
      info1: focusField,
      direct_object_id: 142442490,
      direct_object: "board_view_id",
      info2: "SingleSelect",
      placement: "submit_view",
      data: { mf_name: "mf-form-viewer" },
      name: "question_filled",
      timestamp: currentTs,
      uuid: "19b7cc69d11c85544f4641aa6c5a44adc10",
      seconds_since_happened: 0,
      pulse_user_id: null
    }
  ];

  // Initialize empty merged cookie (equivalent to requests.Session() starting empty)
  let mergedCookie = "";

  // 3. Programmatically acquire cookies by POSTing to telemetry first
  log("Step 3.1: Programmatically executing pre-login telemetry POST to acquire session/tracking cookies...", "APP");
  try {
    const telemetryResponse = await fetch("https://ei.monday.com/prod/event", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0"
      },
      body: JSON.stringify(PAYLOAD_LOGIN)
    });

    log(`Telemetry response status: ${telemetryResponse.status}`, "APP");

    let telemetryCookies: string[] = [];
    if (typeof telemetryResponse.headers.getSetCookie === "function") {
      telemetryCookies = telemetryResponse.headers.getSetCookie();
    } else {
      const raw = telemetryResponse.headers.get("set-cookie");
      if (raw) {
        telemetryCookies = raw.split(/,(?=\s*[a-zA-Z0-9_]+=)/);
      }
    }

    if (telemetryCookies.length > 0) {
      log(`Acquired ${telemetryCookies.length} tracking/session cookies from telemetry POST response.`, "APP");
      mergedCookie = mergeCookies(mergedCookie, telemetryCookies);
    } else {
      log("No tracking cookies returned from telemetry POST.", "APP");
    }
  } catch (telErr: any) {
    log(`Warning: Failed to execute telemetry POST: ${telErr.message}`, "APP");
  }

  // Merge user-provided corporate cookies now (equivalent to s.cookies.update(cookie))
  mergedCookie = mergeCookies(mergedCookie, [initialCookie]);
  log("Merged user corporate authentication cookies into session cookie jar.", "APP");

  // 4. Form Submission
  log(`Executing Form submission to: ${settings.url}...`, "APP");

  // Submit actual form payload
  const parsedAnswers = JSON.parse(settings.answersJson);

  // Overwrite the email if defined in settings
  if (settings.email && parsedAnswers.answers) {
    parsedAnswers.answers.name = settings.email;
    // If there's an email-specific field key, update it
    const emailFieldKey = Object.keys(parsedAnswers.answers).find(k => k.startsWith("email_"));
    if (emailFieldKey) {
      parsedAnswers.answers[emailFieldKey] = settings.email;
    }
  }

  const requestHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    "Referer": "https://forms.monday.com/",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0"
  };

  if (mergedCookie && mergedCookie.trim()) {
    requestHeaders["Cookie"] = mergedCookie.trim();
    log("Including merged (auth + acquired session) cookies in POST request headers.", "APP");
  } else {
    log("No session cookies found. Requesting form without corporate session cookies.", "APP");
  }

  const response = await fetch(settings.url, {
    method: "POST",
    headers: requestHeaders,
    body: JSON.stringify(parsedAnswers)
  });

  const resData = await response.json() as any;
  log(`Form response: ${JSON.stringify(resData)}`, "APP");

  if (resData && resData.type === "FormRequiresAuthentication") {
    log("ERROR: This Monday.com form is restricted to authenticated organization users.", "APP");
    log("To resolve this, please go to the Settings tab in this app, copy your Monday.com browser cookies (e.g. session / login cookies) from DevTools, and paste them into the 'Monday Session Cookies' field.", "APP");
    throw new Error("Form requires authentication. Please paste your Monday Session Cookies in the Settings tab.");
  }

  lastLoginTime = new Date().toLocaleString();
  log(`Form autologin submission successfully executed for ${settings.email}!`, "APP");
  return { success: true, method: "form", response: resData };
}

// Server-side active scheduler tracking
let schedulerInterval: NodeJS.Timeout | null = null;
let lastExecutedDay: string | null = null; // Prevent multi-triggers on the same day

function runSchedulerCheck() {
  const now = new Date();
  
  // Format day to check
  const dayName = now.toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();
  
  // Format current local time (HH:MM)
  const currentHHMM = now.toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Singapore" // Standardize on their timezone from Python code (offset -480 / UTC+8)
  });

  const todayDateString = now.toLocaleDateString("en-US", { timeZone: "Asia/Singapore" });

  // Debug log every few minutes to show scheduler is alive
  if (now.getMinutes() % 15 === 0 && now.getSeconds() === 0) {
    log(`Scheduler active. Watching day: [${settings.days.join(", ")}], time: [${settings.loginTime}]. Current: [${dayName} @ ${currentHHMM}]`, "SCHEDULER");
  }

  // Trigger conditions
  if (settings.days.includes(dayName)) {
    if (currentHHMM === settings.loginTime) {
      if (lastExecutedDay !== todayDateString) {
        lastExecutedDay = todayDateString;
        log(`Trigger match! It is ${dayName} at exactly ${currentHHMM}. Launching autologin callback...`, "SCHEDULER");
        doAutoLogin(false).catch((err) => {
          log(`Scheduler execution failed: ${err.message}`, "SCHEDULER_ERROR");
        });
      }
    }
  }
}

function startSchedulerService() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
  }
  
  // Check once every 30 seconds to be extremely accurate and never miss a minute
  schedulerInterval = setInterval(runSchedulerCheck, 30000);
  log(`Service Scheduler daemon started. Scanning matches every 30 seconds.`, "SCHEDULER");
}

function stopSchedulerService() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    log(`Service Scheduler daemon stopped successfully.`, "SCHEDULER");
  }
}

// Initialize server logic
async function startServer() {
  loadSettings();
  
  // Always start the scheduler daemon automatically on server boot, matching background execution
  startSchedulerService();

  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route: Settings GET
  app.get("/api/settings", (req, res) => {
    res.json({ status: "ok", data: settings });
  });

  // API Route: Settings POST
  app.post("/api/settings", (req, res) => {
    try {
      const body = { ...req.body };
      
      // Support any spelling of cookies they programmatically push
      const incomingCookie = body.sessionCookie || body.workforms_cookie || body.cookie || body.WORKFORMS_COOKIE || body.MONDAY_SESSION_COOKIE;
      if (incomingCookie !== undefined) {
        body.sessionCookie = incomingCookie;
      }

      settings = { ...settings, ...body };
      saveSettingsToFile();
      log(`Settings updated from API: ${JSON.stringify(req.body)}`, "API");
      res.json({ status: "ok", message: "Settings saved successfully" });
    } catch (error: any) {
      log(`Error saving settings: ${error.message}`, "API");
      res.status(500).json({ status: "error", message: error.message });
    }
  });
  // API Route: Scheduler Start
  app.post("/api/scheduler/start", (req, res) => {
    try {
      startSchedulerService();
      res.json({ status: "ok", message: "Scheduler started" });
    } catch (error: any) {
      log(`Error starting scheduler: ${error.message}`, "API");
      res.status(500).json({ status: "error", message: error.message });
    }
  });

  // API Route: Scheduler Stop
  app.post("/api/scheduler/stop", (req, res) => {
    try {
      stopSchedulerService();
      res.json({ status: "ok", message: "Scheduler stopped" });
    } catch (error: any) {
      log(`Error stopping scheduler: ${error.message}`, "API");
      res.status(500).json({ status: "error", message: error.message });
    }
  });

  // API Route: Scheduler Status GET
  app.get("/api/scheduler/status", (req, res) => {
    res.json({
      status: "ok",
      running: schedulerInterval !== null,
      settings,
      lastLoginTime
    });
  });

  // API Route: Test Login immediately
  app.post("/api/login/test", async (req, res) => {
    try {
      log("Testing login immediately from API request...", "API");
      
      // Support cookies passed directly in the request body or standard headers
      const bodyCookie = req.body?.sessionCookie || req.body?.workforms_cookie || req.body?.cookie || req.body?.WORKFORMS_COOKIE || req.body?.MONDAY_SESSION_COOKIE;
      const headerCookie = req.headers["x-workforms-cookie"] || req.headers["x-session-cookie"];
      
      const overrideCookie = (typeof bodyCookie === "string" && bodyCookie.trim()) 
        ? bodyCookie 
        : (typeof headerCookie === "string" && headerCookie.trim()) 
          ? headerCookie 
          : undefined;

      if (overrideCookie) {
        log("Received a programmatically provided cookie in the API test request.", "API");
      }

      const result = await doAutoLogin(true, overrideCookie);
      res.json({ status: "ok", message: "Login test completed successfully", result });
    } catch (error: any) {
      log(`Error executing login test: ${error.message}`, "API");
      res.status(500).json({ status: "error", message: error.message });
    }
  });

  // API Route: Retrieve backend console logs for UI display
  app.get("/api/logs", (req, res) => {
    res.json({ status: "ok", logs: serverLogs });
  });



  // Serve static assets or Vite middleware
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    log(`Server running on port ${PORT}`, "APP");
  });
}

startServer();
