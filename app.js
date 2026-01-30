// ⚠️ שים פה את ה-URL מה-Deploy של Apps Script, שמסתיים ב- /exec
const API_URL = "https://script.google.com/macros/s/AKfycbxdJAq5l6Hym-50CBfBFVXgjgXm9gWe6mtqVXijE0nlnlt7hvIIXBgYoUfP25eVdjtY2A/exec";

// שמות הדירות (כמו שביקשת)
const SITES = ["דירת 50", "דירת 56", "דירת 500", "דירת 800", "דירת 900"];

function qs(name) { return new URLSearchParams(location.search).get(name); }

// --- API helpers ---
// אצלך ב-Apps Script יש doGet שמנתב לפי action, אז:
// list = GET עם action=list
// createreport = POST עם action=createreport + body
// setstatus = POST עם action=setstatus + body

async function apiGetList(site = "") {
  const url = `${API_URL}?action=list&site=${encodeURIComponent(site || "")}`;
  const r = await fetch(url, { method: "GET" });
  return await r.json();
}

async function apiCreate(payload) {
  const url = `${API_URL}?action=createreport`;
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" }, // בלי preflight
    body: JSON.stringify(payload),
  });
  return await r.json();
}

async function apiSetStatus(payload) {
  const url = `${API_URL}?action=setstatus`;
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(payload),
  });
  return await r.json();
}
