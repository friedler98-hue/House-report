// ======================
// CONFIG
// ======================

// ⚠️ שים פה את ה-URL של ה-Web App שלך (מסתיים ב- /exec)
const API_URL = "https://script.google.com/macros/s/AKfycbxdJAq5l6Hym-50CBfBFVXgjgXm9gWe6mtqVXijE0nlnlt7hvIIXBgYoUfP25eVdjtY2A/exec";

// השמות שיופיעו באתר (כרטיסים במסך הראשי)
// לדוגמה לפי מה שכתבת:
const SITES = ["דירת 50", "דירת 56", "דירת 500", "דירת 800", "דירת 900"];

// מיפוי: שם שמופיע באתר -> ערך שנשלח לשרת (site)
// כאן אני שולח את המספר בלבד כדי שיהיה נקי בגיליון (50/56/500/800/900)
const SITE_MAP = {
  "דירת 50": "50",
  "דירת 55": "55",
  "דירת 56": "56",
  "דירת 51": "51",
  "דירת 95": "95",
  "דירת 45": "45",
  "דירת 500": "500",
  "דירת 42": "42",
  "דירת 800": "800",
  "דירת 900": "900",
};

// ======================
// HELPERS
// ======================

function qs(name) {
  return new URLSearchParams(location.search).get(name);
}

function buildUrl(action) {
  // מוסיף action גם ל-URL (טוב ל-doGet) וגם אנחנו שולחים action בתוך ה-body (טוב ל-doPost)
  return `${API_URL}?action=${encodeURIComponent(action)}`;
}

async function apiGetList(site = "") {
  const url = `${buildUrl("list")}&site=${encodeURIComponent(site)}`;
  const r = await fetch(url);
  return await r.json();
}

// ✅ פה התיקון הקריטי: action בתוך ה-body
async function apiCreate(payload) {
  const r = await fetch(buildUrl("createreport"), {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action: "createreport", ...payload }),
  });
  return await r.json();
}

// ✅ גם פה: action בתוך ה-body
async function apiSetStatus(payload) {
  const r = await fetch(buildUrl("setstatus"), {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action: "setstatus", ...payload }),
  });
  return await r.json();
}

// ======================
// EXPORTED FOR PAGES
// ======================

// מחזיר רשימת כרטיסים למסך הראשי
function getSitesForHome() {
  return SITES.map((label) => ({
    label,
    value: SITE_MAP[label] ?? label, // אם לא קיים במפה, ישלח את השם עצמו
  }));
}

// מתרגם site שמגיע מה-URL (מספר/שם) לערך שנרצה לעבוד איתו
function normalizeSiteFromUrl() {
  const raw = qs("site") || "";
  // אם קיבלנו "דירת 50" וכו' — נהפוך למספר
  if (SITE_MAP[raw]) return SITE_MAP[raw];
  // אם קיבלנו "50" כבר — נשאיר
  return raw;
}

// לשימוש ב-site.html
window.HouseReportApi = {
  apiGetList,
  apiCreate,
  apiSetStatus,
  getSitesForHome,
  normalizeSiteFromUrl,
};
