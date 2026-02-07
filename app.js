const API_URL = "https://script.google.com/macros/s/AKfycbykC-hz-QrtHBTf5J55o1eAXXzxQA-z6DcRS3DCMCqam22uaP2vq-viorV6u52TRHEyag/exec";
const REPORTS_PASSWORD = "1234";

const SITES = [
  "דירת 50", "דירת 55", "דירת 56", "דירת 51", "דירת 95",
  "דירת 45", "דירת 42", "דירת 500", "דירת 800", "דירת 900",
];

function qs(name) {
  return new URLSearchParams(location.search).get(name);
}

function normalizeSite(raw) {
  const s = (raw || "").toString().trim();
  if (!s) return "";
  const m = s.match(/\d+/);
  if (!m) return s;
  return `דירת ${m[0]}`;
}

function setAuth(ok) {
  if (ok) sessionStorage.setItem("reports_auth", "1");
  else sessionStorage.removeItem("reports_auth");
}

function isAuthed() {
  return sessionStorage.getItem("reports_auth") === "1";
}

function promptPasswordOrFail() {
  const p = prompt("הזן סיסמה לצפייה בכל הדיווחים:");
  if (p === null) return false;
  if (p === REPORTS_PASSWORD) {
    setAuth(true);
    return true;
  }
  alert("סיסמה שגויה");
  setAuth(false);
  return false;
}

async function safeJson(res) {
  const txt = await res.text();
  try { return JSON.parse(txt); } catch { return { ok: false, error: "Bad JSON", raw: txt }; }
}

async function apiCall(action, payload = {}) {
  const body = JSON.stringify({ action, ...payload });
  const response = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: body,
  });
  return await safeJson(response);
}

async function apiGetList(site = "") {
  const url = `${API_URL}?action=list&site=${encodeURIComponent(site)}`;
  const response = await fetch(url);
  return await safeJson(response);
}

// שאר הפונקציות המקוריות של האתר כפי שהיו...
