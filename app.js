// ---- API URL ----
const API_URL = "https://script.google.com/macros/s/AKfycbxdJAq5l6Hym-50CBfBFVXgjgXm9gWe6mtqVXijE0nlnlt7hvIIXBgYoUfP25eVdjtY2A/exec
";

// ---- סיסמה לדף "כל הדיווחים" ----
const ALL_REPORTS_PASSWORD = "1234"; // ← תשנה לסיסמה שלך

// פונקציית בדיקת סיסמה
function checkAllReportsPassword() {
    const saved = sessionStorage.getItem("allReportsAuth");
    if (saved === "ok") return true;

    const pass = prompt("הזן סיסמה לצפייה בכל הדיווחים:");
    if (pass === null) return false;

    if (pass === ALL_REPORTS_PASSWORD) {
        sessionStorage.setItem("allReportsAuth", "ok");
        return true;
    }

    alert("סיסמה שגויה");
    return false;
}

// ---- רשימת הדירות ----
const SITES = [
    "דירת 50", "דירת 55", "דירת 56", "דירת 51",
    "דירת 95", "דירת 45", "דירת 42",
    "דירת 500", "דירת 800", "דירת 900"
];

function qs(name) {
    return new URLSearchParams(location.search).get(name);
}

async function apiGetList(site = "") {
    const url = `${API_URL}?action=list&site=${encodeURIComponent(site)}`;
    const r = await fetch(url);
    return await r.json();
}

async function apiCreate(payload) {
    const r = await fetch(API_URL, {
        method: "POST",
        headers: {"Content-Type": "text/plain;charset=utf-8"},
        body: JSON.stringify({ action: "createreport", ...payload })
    });
    return await r.json();
}

async function apiSetStatus(id, status) {
    const r = await fetch(API_URL, {
        method: "POST",
        headers: {"Content-Type": "text/plain;charset=utf-8"},
        body: JSON.stringify({ action: "setstatus", id, status })
    });
    return await r.json();
}
