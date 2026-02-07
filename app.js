// =====================
// CONFIG - לשנות רק פה
// =====================
const API_URL = "https://script.google.com/macros/s/AKfycby1RmWWgXc24smhU6BH7a8lC2QYrY2hBJXpM50EzkSZ5TObOrrXiMCwdKdpKFXUXNC4fQ/exec";
const REPORTS_PASSWORD = "1234";

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

// מנרמל כל וריאציה של שם דירה לפורמט אחיד: "דירת <מספר>"
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
  try { return JSON.parse(txt); } catch { return { ok:false, error:"Bad JSON", raw: txt }; }
}

/**
 * פונקציה אחידה שמנסה לדבר עם ה-API גם ב-GET וגם ב-POST
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
  } catch (e) {}

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
  return await apiCall("list", { site });
}

async function apiCreate(payload) {
  return await apiCall("createreport", payload);
}

async function apiUpdateStatus(id, status) {
  return await apiCall("updatestatus", { id, status });
}

async function apiDeleteReport(id) {
  return await apiCall("deletereport", { id });
}

async function apiUploadImage({ base64, mimeType, fileName }) {
  return await apiCall("uploadimage", { base64, mimeType, fileName });
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
      if (!isAuthed()) {
        const ok = promptPasswordOrFail();
        if (!ok) e.preventDefault();
      }
    });
  }
}

// =====================================
// UI helpers
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

// מסדר timestamps אם מגיעים ב-ISO או טקסט
function formatTs(ts) {
  if (!ts) return "";
  const s = ts.toString();
  if (s.includes("T")) {
    const d = new Date(s);
    if (!isNaN(d.getTime())) {
      const pad = (n) => String(n).padStart(2, "0");
      return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}, ${pad(d.getDate())}.${pad(d.getMonth()+1)}.${d.getFullYear()}`;
    }
  }
  return s;
}

function openImage(url) {
  if (!url) return;
  window.open(url, "_blank", "noopener,noreferrer");
}

async function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result || ""));
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

// =====================================
// UI: Site page
// =====================================
function renderSiteTable(rows) {
  const tbody = document.querySelector("#siteTable tbody");
  if (!tbody) return;
  tbody.innerHTML = "";

  if (!rows || rows.length === 0) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td colspan="7" style="text-align:center;color:#6c757d;padding:14px;">אין דיווחים עדיין</td>`;
    tbody.appendChild(tr);
    return;
  }

  for (const r of rows) {
    const tr = document.createElement("tr");
    const hasImg = !!(r.imageUrl && String(r.imageUrl).trim());
    tr.innerHTML = `
      <td>${r.area || ""}</td>
      <td>${r.type || ""}</td>
      <td>${r.desc || ""}</td>
      <td>${r.urgency || ""}</td>
      <td><span class="badge-status">${r.status || ""}</span></td>
      <td>${formatTs(r.timestamp)}</td>
      <td>
        ${hasImg ? `<button class="imgBtn" data-url="${String(r.imageUrl)}">פתח</button>` : `<span class="muted">—</span>`}
      </td>
    `;
    tbody.appendChild(tr);
  }

  tbody.querySelectorAll(".imgBtn").forEach(b => {
    b.addEventListener("click", () => openImage(b.getAttribute("data-url")));
  });
}

/**
 * טוענים את כל הדיווחים ומסננים בצד לקוח לפי נרמול דירה
 */
async function loadSiteReports(siteName) {
  const fixedSite = normalizeSite(siteName);

  const res = await apiGetList("");
  if (!res.ok) throw new Error(res.error || "Failed to load");

  const rows = res.rows || res.data || [];
  return rows.filter(r => normalizeSite(r.site || "") === fixedSite);
}

async function initSitePage() {
  const rawSiteName = qs("site") || "";
  const siteName = normalizeSite(rawSiteName);

  const title = document.getElementById("siteTitle");
  if (title) title.textContent = `מתקן: ${siteName}`;

  const areaSel = el("area");
  const typeSel = el("type");
  const urgencySel = el("urgency");
  const itemInp = el("item");
  const descInp = el("desc");

  // שדות תמונה חדשים
  const imgHidden = el("imageUrl");        // input hidden
  const imgPreview = el("imgPreview");     // img
  const imgInfo = el("imgInfo");           // span
  const btnCamera = el("btnCamera");
  const btnGallery = el("btnGallery");
  const fileCamera = el("fileCamera");
  const fileGallery = el("fileGallery");
  const btnRemoveImg = el("btnRemoveImg");

  const btn = el("submitBtn");
  const statusMsg = el("statusMsg");

  if (areaSel) fillSelectOptions(areaSel, ["מטבח", "סלון", "חדר שינה", "שירותים", "מקלחת", "מרפסת", "אחר"]);
  if (typeSel) fillSelectOptions(typeSel, ["תקלה", "חוסר"]);
  if (urgencySel) fillSelectOptions(urgencySel, ["נמוך", "בינוני", "גבוה"]);

  async function refreshTable() {
    const rows = await loadSiteReports(siteName);
    renderSiteTable(rows);
  }

  async function handlePickedFile(file) {
    try {
      if (!file) return;

      // הגבלת גודל כדי לא להפיל Apps Script (base64 מגדיל את זה)
      const maxMb = 4;
      const sizeMb = file.size / (1024 * 1024);
      if (sizeMb > maxMb) {
        alert(`הקובץ גדול מדי (${sizeMb.toFixed(1)}MB). מקסימום ${maxMb}MB.`);
        return;
      }

      // תצוגה מקדימה
      const localUrl = URL.createObjectURL(file);
      if (imgPreview) {
        imgPreview.src = localUrl;
        imgPreview.style.display = "block";
      }
      if (imgInfo) imgInfo.textContent = "מעלה תמונה לשרת...";

      const base64 = await fileToBase64(file);
      const res = await apiUploadImage({
        base64,
        mimeType: file.type || "image/jpeg",
        fileName: file.name || ("image_" + Date.now())
      });

      if (!res.ok) throw new Error(res.error || "Upload failed");

      // שומרים URL בגיליון דרך imageUrl
      if (imgHidden) imgHidden.value = res.url || res.downloadUrl || "";

      if (imgInfo) imgInfo.textContent = "✓ תמונה עלתה";
      if (btnRemoveImg) btnRemoveImg.style.display = "inline-flex";
    } catch (e) {
      if (imgHidden) imgHidden.value = "";
      if (imgInfo) imgInfo.textContent = "";
      if (imgPreview) {
        imgPreview.src = "";
        imgPreview.style.display = "none";
      }
      if (btnRemoveImg) btnRemoveImg.style.display = "none";
      alert("שגיאה בהעלאת תמונה: " + e.message);
    }
  }

  if (btnCamera && fileCamera) {
    btnCamera.addEventListener("click", () => fileCamera.click());
    fileCamera.addEventListener("change", () => handlePickedFile(fileCamera.files?.[0]));
  }
  if (btnGallery && fileGallery) {
    btnGallery.addEventListener("click", () => fileGallery.click());
    fileGallery.addEventListener("change", () => handlePickedFile(fileGallery.files?.[0]));
  }

  if (btnRemoveImg) {
    btnRemoveImg.addEventListener("click", () => {
      if (imgHidden) imgHidden.value = "";
      if (imgInfo) imgInfo.textContent = "";
      if (imgPreview) {
        imgPreview.src = "";
        imgPreview.style.display = "none";
      }
      btnRemoveImg.style.display = "none";
    });
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
          imageUrl: imgHidden?.value || "",
        };

        const res = await apiCreate(payload);
        if (!res.ok) throw new Error(res.error || "שליחה נכשלה");

        if (areaSel) areaSel.value = "";
        if (typeSel) typeSel.value = "";
        if (urgencySel) urgencySel.value = "";
        if (itemInp) itemInp.value = "";
        if (descInp) descInp.value = "";

        // איפוס תמונה
        if (imgHidden) imgHidden.value = "";
        if (imgInfo) imgInfo.textContent = "";
        if (imgPreview) { imgPreview.src = ""; imgPreview.style.display = "none"; }
        if (btnRemoveImg) btnRemoveImg.style.display = "none";

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
// UI: All reports page
// =====================================
function renderAllReportsTable(rows) {
  const tbody = document.querySelector("#allTable tbody");
  if (!tbody) return;
  tbody.innerHTML = "";

  if (!rows || rows.length === 0) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td colspan="10" style="text-align:center;color:#6c757d;padding:14px;">אין נתונים להצגה</td>`;
    tbody.appendChild(tr);
    return;
  }

  for (const r of rows) {
    const tr = document.createElement("tr");
    const hasImg = !!(r.imageUrl && String(r.imageUrl).trim());

    const statusSelect = `
      <select class="statusSelect" data-id="${r.id}">
        ${["חדש", "בטיפול", "טופל"].map(s => `<option value="${s}" ${r.status===s?"selected":""}>${s}</option>`).join("")}
      </select>
    `;

    tr.innerHTML = `
      <td>${formatTs(r.timestamp)}</td>
      <td>${normalizeSite(r.site || "")}</td>
      <td>${r.area || ""}</td>
      <td>${r.type || ""}</td>
      <td>${r.desc || ""}</td>
      <td>${r.urgency || ""}</td>
      <td>${hasImg ? `<button class="imgBtn" data-url="${String(r.imageUrl)}">פתח</button>` : `<span class="muted">—</span>`}</td>
      <td>${statusSelect}</td>
      <td><button class="saveBtn" data-id="${r.id}">שמור</button></td>
      <td><button class="delBtn" data-id="${r.id}">מחק</button></td>
    `;
    tbody.appendChild(tr);
  }

  tbody.querySelectorAll(".imgBtn").forEach(b => {
    b.addEventListener("click", () => openImage(b.getAttribute("data-url")));
  });

  tbody.querySelectorAll(".saveBtn").forEach(btn => {
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
        alert(`שגיאה: ${e.message}`);
        btn.textContent = "שמור";
      } finally {
        btn.disabled = false;
      }
    });
  });

  tbody.querySelectorAll(".delBtn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-id");
      if (!confirm("למחוק את הדיווח הזה?")) return;

      btn.disabled = true;
      btn.textContent = "מוחק...";
      try {
        const res = await apiDeleteReport(id);
        if (!res.ok) throw new Error(res.error || "מחיקה נכשלה");
        btn.textContent = "נמחק";
        // רענון מסך
        location.reload();
      } catch (e) {
        alert(`שגיאה: ${e.message}`);
        btn.textContent = "מחק";
      } finally {
        btn.disabled = false;
      }
    });
  });
}

async function initAllReportsPage() {
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
    fillSelectOptions(filterSite, ["הכל", ...SITES.map(normalizeSite)]);
    filterSite.value = "הכל";
  }
  if (filterStatus) {
    fillSelectOptions(filterStatus, ["הכל", "חדש", "בטיפול", "טופל"]);
    filterStatus.value = "הכל";
  }

  async function refresh() {
    const res = await apiGetList("");
    if (!res.ok) throw new Error(res.error || "Failed to load all");
    let rows = res.rows || res.data || [];

    rows = rows.map(r => ({ ...r, site: normalizeSite(r.site || "") }));

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
