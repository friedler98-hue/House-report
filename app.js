// ======================
// CONFIG
// ======================

// ⚠️ לשים כאן את ה-URL של ה-Web App (מסתיים ב- /exec)
const API_URL = "https://script.google.com/macros/s/AKfycbxdJAq5l6Hym-50CBfBFVXgjgXm9gWe6mtqVXijE0nlnlt7hvIIXBgYoUfP25eVdjtY2A/exec";

// רשימת הדירות (חדשה לפי מה שביקשת)
const SITES = [
  "דירת 50",
  "דירת 55",
  "דירת 56",
  "דירת 51",
  "דירת 95",
  "דירת 45",
  "דירת 42",
  "דירת 500",
  "דירת 800",
  "דירת 900"
];

// ======================
// HELPERS
// ======================

function qs(name) {
  return new URLSearchParams(location.search).get(name);
}

function buildUrl(action, extra = {}) {
  const u = new URL(API_URL);
  u.searchParams.set("action", action);
  for (const [k, v] of Object.entries(extra)) {
    if (v !== undefined && v !== null && String(v) !== "") {
      u.searchParams.set(k, v);
    }
  }
  return u.toString();
}

async function apiGetList(site = "") {
  const url = buildUrl("list", { site: site || "" });
  const r = await fetch(url, { method: "GET" });
  return await r.json();
}

async function apiCreate(payload) {
  const url = buildUrl("createreport");
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action: "createreport", ...payload }),
  });
  return await r.json();
}

async function apiSetStatus(payload) {
  const url = buildUrl("setstatus");
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action: "setstatus", ...payload }),
  });
  return await r.json();
}

// ======================
// EXPORTED (optional)
// ======================

window.HouseReportApi = {
  apiGetList,
  apiCreate,
  apiSetStatus,
  SITES
};
