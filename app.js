// =====================
// CONFIG - לשנות רק פה
// =====================
const API_URL = "https://script.google.com/macros/s/AKfycbxdJAq5l6Hym-50CBfBFVXgjgXm9gWe6mtqVXijE0nlnlt7hvIIXBgYoUfP25eVdjtY2A/exec";
const REPORTS_PASSWORD = "1234"; // סיסמה ל"כל הדיווחים"

// רשימת הדירות שמופיעות במסך הבית
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
  "דירת 900",
];

// =====================================
// Helpers
// =====================================
function qs(name) {
  return new URLSearchParams(location.search).get(name);
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
  try { return JSON.parse(txt); } catch { return { ok:false, error:"Bad JSON", raw: txt }; }
}

/**
 * פונקציה אחידה שמנסה לדבר עם ה-API גם ב-GET וגם ב-POST
 * כי לפעמים ה-Apps Script מוגדר אחרת.
 */
async function apiCall(action, payload = {}) {
  // ניסיון 1: GET ?action=...
  try {
    const u = new URL(API_URL);
    u.searchParams.set("action", action);
    for (const [k, v] of Object.entries(payload)) {
      if (v !== undefined && v !== null && v !== "") u.searchParams.set(k, v);
    }
    const r1 = await fetch(u.toString(), { method: "GET" });
    const j1 = await safeJson(r1);
    if (j1 && j1.ok) return j1;
    // אם קיבלנו Unknown action / או ok:false – ננסה POST
  } catch (e) {
    // ממשיכים ל-POST
  }

  // ניסיון 2: POST JSON
  const r2 = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action, ...payload }),
  });
  return await safeJson(r2);
}

// =====================================
// API wrappers
// =====================================
async function apiPing() {
  return await apiCall("ping", {});
}

async function apiGetList(site = "") {
  // אם site ריק → כל הדיווחים
  return await apiCall("list", { site });
}

async function apiCreate(payload) {
  // יצירת דיווח
  return await apiCall("createreport", payload);
}

async function apiUpdateStatus(id, status) {
  // עדכון סטטוס
  // (אם אצלך בסקריפט זה נקרא אחרת, זו הנקודה היחידה לשנות: "updatestatus")
  return await apiCall("updatestatus", { id, status });
}

// =====================================
// UI: Index page
// =====================================
function renderSitesGrid(container) {
  container.innerHTML = "";
  for (const s of SITES) {
    const a = document.createElement("a");
    a.className = "site-card";
    a.href = `site.html?site=${encodeURIComponent(s)}`;
    a.innerHTML = `
      <span>${s.replace("דירת ", "")} דירה</span>
      <small>כניסה לדיווח</small>
    `;
    container.appendChild(a);
  }
}

function initIndexPage() {
  const grid = document.querySelector(".sites-grid");
  if (grid) renderSitesGrid(grid);

  const allReportsLink = document.getElementById("allReportsLink");
  if (allReportsLink) {
    allReportsLink.addEventListener("click", (e) => {
      // יבקש סיסמה לפני מעבר
      if (!isAuthed()) {
        const ok = promptPasswordOrFail();
        if (!ok) e.preventDefault();
      }
    });
  }
}

// =====================================
// UI: Site page (דירה ספציפית)
// =====================================
function el(id) { return document.getElementById(id); }

function fillSelectOptions(select, options) {
  select.innerHTML = "";
  const opt0 = document.createElement("option");
  opt0.value = "";
  opt0.textContent = "בחר...";
  select.appendChild(opt0);
  for (const o of options) {
    const opt = document.createElement("option");
    opt.value = o;
    opt.textContent = o;
    select.appendChild(opt);
  }
}

function renderSiteTable(rows) {
  const tbody = document.querySelector("#siteTable tbody");
  if (!tbody) return;
  tbody.innerHTML = "";

  if (!rows || rows.length === 0) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td colspan="6" style="text-align:center;color:#6c757d;padding:14px;">אין דיווחים עדיין</td>`;
    tbody.appendChild(tr);
    return;
  }

  for (const r of rows) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${r.area || ""}</td>
      <td>${r.type || ""}</td>
      <td>${r.desc || ""}</td>
      <td>${r.urgency || ""}</td>
      <td><span class="badge-status">${r.status || ""}</span></td>
      <td>${r.timestamp || ""}</td>
    `;
    tbody.appendChild(tr);
  }
}

async function loadSiteReports(siteName) {
  const res = await apiGetList(siteName);
  if (!res.ok) throw new Error(res.error || "Failed to load");
  return res.rows || res.data || []; // תומך בשמות שונים של שדות
}

async function initSitePage() {
  const siteName = qs("site") || "";
  const title = document.getElementById("siteTitle");
  if (title) title.textContent = `מתקן: ${siteName}`;

  // טופס
  const areaSel = el("area");
  const typeSel = el("type");
  const urgencySel = el("urgency");
  const itemInp = el("item");
  const descInp = el("desc");
  const imgInp = el("imageUrl");
  const btn = el("submitBtn");
  const statusMsg = el("statusMsg");

  if (areaSel) fillSelectOptions(areaSel, ["מטבח", "סלון", "חדר שינה", "שירותים", "מקלחת", "מרפסת", "אחר"]);
  if (typeSel) fillSelectOptions(typeSel, ["תקלה", "חוסר"]);
  if (urgencySel) fillSelectOptions(urgencySel, ["נמוך", "בינוני", "גבוה"]);

  async function refreshTable() {
    const rows = await loadSiteReports(siteName);
    renderSiteTable(rows);
  }

  if (btn) {
    btn.addEventListener("click", async () => {
      try {
        btn.disabled = true;
        if (statusMsg) statusMsg.textContent = "שולח...";

        const payload = {
          site: siteName,
          area: areaSel?.value || "",
          type: typeSel?.value || "",
          item: itemInp?.value || "",
          desc: descInp?.value || "",
          urgency: urgencySel?.value || "",
          imageUrl: imgInp?.value || "",
        };

        const res = await apiCreate(payload);
        if (!res.ok) throw new Error(res.error || "שליחה נכשלה");

        // ניקוי
        if (areaSel) areaSel.value = "";
        if (typeSel) typeSel.value = "";
        if (urgencySel) urgencySel.value = "";
        if (itemInp) itemInp.value = "";
        if (descInp) descInp.value = "";
        if (imgInp) imgInp.value = "";

        if (statusMsg) statusMsg.textContent = "✓ נשלח";
        await refreshTable();
      } catch (e) {
        if (statusMsg) statusMsg.textContent = "";
        alert(`שגיאה: ${e.message}`);
      } finally {
        btn.disabled = false;
      }
    });
  }

  await refreshTable();
}

// =====================================
// UI: All reports page (כל הדיווחים)
// =====================================
function renderAllReportsTable(rows) {
  const tbody = document.querySelector("#allTable tbody");
  if (!tbody) return;
  tbody.innerHTML = "";

  if (!rows || rows.length === 0) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td colspan="8" style="text-align:center;color:#6c757d;padding:14px;">אין נתונים להצגה</td>`;
    tbody.appendChild(tr);
    return;
  }

  for (const r of rows) {
    const tr = document.createElement("tr");

    const statusSelect = `
      <select class="statusSelect" data-id="${r.id}">
        ${["חדש", "בטיפול", "טופל"].map(s => `<option value="${s}" ${r.status===s?"selected":""}>${s}</option>`).join("")}
      </select>
    `;

    tr.innerHTML = `
      <td>${r.timestamp || ""}</td>
      <td>${r.site || ""}</td>
      <td>${r.area || ""}</td>
      <td>${r.type || ""}</td>
      <td>${r.desc || ""}</td>
      <td>${r.urgency || ""}</td>
      <td>${statusSelect}</td>
      <td><button class="saveBtn" data-id="${r.id}">שמור</button></td>
    `;
    tbody.appendChild(tr);
  }

  // מאזינים לכפתורי שמירה
  document.querySelectorAll(".saveBtn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-id");
      const sel = document.querySelector(`.statusSelect[data-id="${id}"]`);
      const newStatus = sel ? sel.value : "";

      btn.disabled = true;
      btn.textContent = "שומר...";
      try {
        const res = await apiUpdateStatus(id, newStatus);
        if (!res.ok) throw new Error(res.error || "עדכון נכשל");
        btn.textContent = "נשמר";
        setTimeout(() => (btn.textContent = "שמור"), 800);
      } catch (e) {
        alert(`עדכון נכשל: ${e.message}`);
        btn.textContent = "שמור";
      } finally {
        btn.disabled = false;
      }
    });
  });
}

async function initAllReportsPage() {
  // סיסמה: אם לא מאומת → נחזיר לדף הבית
  if (!isAuthed()) {
    const ok = promptPasswordOrFail();
    if (!ok) {
      location.href = "index.html";
      return;
    }
  }

  const filterSite = document.getElementById("filterSite");
  const filterStatus = document.getElementById("filterStatus");
  const runBtn = document.getElementById("runFilter");

  if (filterSite) {
    fillSelectOptions(filterSite, ["הכל", ...SITES]);
    filterSite.value = "הכל";
  }
  if (filterStatus) {
    fillSelectOptions(filterStatus, ["הכל", "חדש", "בטיפול", "טופל"]);
    filterStatus.value = "הכל";
  }

  async function refresh() {
    const res = await apiGetList(""); // כל הדיווחים
    if (!res.ok) throw new Error(res.error || "Failed to load all");
    let rows = res.rows || res.data || [];

    const siteVal = filterSite?.value || "הכל";
    const statusVal = filterStatus?.value || "הכל";

    if (siteVal !== "הכל") rows = rows.filter(r => (r.site || "") === siteVal);
    if (statusVal !== "הכל") rows = rows.filter(r => (r.status || "") === statusVal);

    renderAllReportsTable(rows);
  }

  if (runBtn) {
    runBtn.addEventListener("click", async () => {
      try { await refresh(); } catch (e) { alert(e.message); }
    });
  }

  await refresh();
}

// =====================================
// Auto-init by page
// =====================================
document.addEventListener("DOMContentLoaded", () => {
  const page = document.body.getAttribute("data-page");
  if (page === "index") initIndexPage();
  if (page === "site") initSitePage();
  if (page === "all") initAllReportsPage();
});
