const API_URL = "https://script.google.com/macros/s/AKfycbypP83RAgg54-TB0JJDsPpzbduQsH1SnYvbCXS8IZSrDQpm2l2k-xJyPW40w0Bg_BPKbSw/exec";

const SITES = [
  "אדמין",
  "חלקות קומה 1",
  "חלקות קומה 2",
  "חלקות קומה 3",
  "חצר",
  "מרתף",
  "מחסן",
  "חניה"
];

// שולף פרמטר מה-URL
function qs(name) { 
  return new URLSearchParams(location.search).get(name); 
}

// פונקציה לפורמט זמן
function formatTime(iso) {
  const d = new Date(iso);
  if (isNaN(d)) return "";
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  const ymd = d.toISOString().slice(0, 10);
  return `${hh}:${mm}:${ss} (${ymd})`;
}

async function apiList(site) {
  const url = `${API_URL}?action=list&site=${encodeURIComponent(site || "")}`;
  const res = await fetch(url);
  return await res.json();
}

async function apiCreate(payload) {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "createreport", ...payload })
  });
  return await res.json();
}

async function apiSetStatus(id, status) {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "setstatus", id, status })
  });
  return await res.json();
}
