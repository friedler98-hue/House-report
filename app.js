// =====================
// CONFIG - לשנות רק פה
// =====================
const API_URL = "https://script.google.com/macros/s/AKfycbw8Yj6LoyYW7Po_WvQUlFHmfDZoEkpltQHoufKs0HzWBORLQBKbsa0OzwPFsPIiVl4Tcg/exec";
const REPORTS_PASSWORD = "1234";

// רשימת הדירות שמופיעות במסך הבית
const SITES = [
  "דירת 50", "דירת 55", "דירת 56", "דירת 51", "דירת 95",
  "דירת 45", "דירת 42", "דירת 500", "דירת 800", "דירת 900",
];

// =====================================
// Helpers
// =====================================
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

// =====================================
// API wrappers
// =====================================
async function apiGetList(site = "") {
  // בגלל מגבלות CORS, נשתמש ב-POST גם לקבלת רשימה
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
  if (!select) return;
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

function formatTs(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  if (isNaN(d.getTime())) return ts;
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}, ${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
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
    const hasImg = !!(r.imageUrl && String(r.imageUrl).trim().startsWith("http"));
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
  const imgHidden = el("imageUrl");
  const imgPreview = el("imgPreview");
  const imgInfo = el("imgInfo");
  const btnCamera = el("btnCamera");
  const btnGallery = el("btnGallery");
  const fileCamera = el("fileCamera");
  const fileGallery = el("fileGallery");
  const btnRemoveImg = el("btnRemoveImg");
  const btn = el("submitBtn");
  const statusMsg = el("statusMsg");

  fillSelectOptions(areaSel, ["מטבח", "סלון", "חדר שינה", "שירותים", "מקלחת", "מרפסת", "אחר"]);
  fillSelectOptions(typeSel, ["תקלה", "חוסר"]);
  fillSelectOptions(urgencySel, ["נמוך", "בינוני", "גבוה"]);

  async function refreshTable() {
    try {
      const res = await apiGetList(siteName);
      if (res.ok) renderSiteTable(res.rows);
    } catch (e) { console.error("Refresh table error:", e); }
  }

  async function handlePickedFile(file) {
    try {
      if (!file) return;
      if (file.size / (1024 * 1024) > 4) { alert("קובץ גדול מדי (מקסימום 4MB)"); return; }

      if (imgPreview) {
        imgPreview.src = URL.createObjectURL(file);
        imgPreview.style.display = "block";
      }
      if (imgInfo) imgInfo.textContent = "מעלה תמונה...";

      const base64 = await fileToBase64(file);
      const res = await apiUploadImage({
        base64: base64,
        mimeType: file.type || "image/jpeg",
        fileName: file.name || "image.jpg"
      });

      if (!res.ok) throw new Error(res.error || "Upload failed");

      if (imgHidden) imgHidden.value = res.url;
      if (imgInfo) imgInfo.textContent = "✓ תמונה עלתה";
      if (btnRemoveImg) btnRemoveImg.style.display = "inline-flex";
    } catch (e) {
      alert("שגיאה בהעלאה: " + e.message);
      if (imgInfo) imgInfo.textContent = "שגיאה";
    }
  }

  if (btnCamera) btnCamera.onclick = () => fileCamera.click();
  if (btnGallery) btnGallery.onclick = () => fileGallery.click();
  if (fileCamera) fileCamera.onchange = () => handlePickedFile(fileCamera.files[0]);
  if (fileGallery) fileGallery.onchange = () => handlePickedFile(fileGallery.files[0]);

  if (btnRemoveImg) {
    btnRemoveImg.onclick = () => {
      if (imgHidden) imgHidden.value = "";
      if (imgPreview) { imgPreview.src = ""; imgPreview.style.display = "none"; }
      if (imgInfo) imgInfo.textContent = "";
      btnRemoveImg.style.display = "none";
    };
  }

  if (btn) {
    btn.onclick = async () => {
      btn.disabled = true;
      if (statusMsg) statusMsg.textContent = "שולח...";
      try {
        const payload = {
          site: siteName,
          area: areaSel.value,
          type: typeSel.value,
          item: itemInp.value,
          desc: descInp.value,
          urgency: urgencySel.value,
          imageUrl: imgHidden.value
        };
        const res = await apiCreate(payload);
        if (res.ok) {
          if (statusMsg) statusMsg.textContent = "✓ נשלח בהצלחה";
          [areaSel, typeSel, urgencySel, itemInp, descInp, imgHidden].forEach(f => { if (f) f.value = ""; });
          if (imgPreview) imgPreview.style.display = "none";
          if (imgInfo) imgInfo.textContent = "";
          await refreshTable();
        } else {
          throw new Error(res.error);
        }
      } catch (e) {
        alert("שגיאה בשליחה: " + e.message);
      } finally {
        btn.disabled = false;
      }
    };
  }
  refreshTable();
}

// =====================================
// UI: All reports page
// =====================================
function renderAllReportsTable(rows) {
  const tbody = document.querySelector("#allTable tbody");
  if (!tbody) return;
  tbody.innerHTML = "";

  if (!rows || rows.length === 0) {
    tbody.innerHTML = `<tr><td colspan="10" style="text-align:center;">אין נתונים</td></tr>`;
    return;
  }

  for (const r of rows) {
    const tr = document.createElement("tr");
    const hasImg = !!(r.imageUrl && String(r.imageUrl).trim().startsWith("http"));
    const statusSelect = `
      <select class="statusSelect" data-id="${r.id}">
        ${["חדש", "בטיפול", "טופל"].map(s => `<option value="${s}" ${r.status === s ? "selected" : ""}>${s}</option>`).join("")}
      </select>
    `;

    tr.innerHTML = `
      <td>${formatTs(r.timestamp)}</td>
      <td>${normalizeSite(r.site)}</td>
      <td>${r.area || ""}</td>
      <td>${r.type || ""}</td>
      <td>${r.desc || ""}</td>
      <td>${r.urgency || ""}</td>
      <td>${hasImg ? `<button class="imgBtn" data-url="${String(r.imageUrl)}">פתח</button>` : `<span class="muted">—</span>`}</td>
      <td>${statusSelect}</td>
      <td><button class="saveBtn" data-id="${r.id}">שמור</button></td>
      <td><button class="delBtn" data-id="${r.id}" style="background:red; color:white;">מחק</button></td>
    `;
    tbody.appendChild(tr);
  }

  tbody.querySelectorAll(".imgBtn").forEach(b => b.onclick = () => openImage(b.getAttribute("data-url")));
  
  tbody.querySelectorAll(".saveBtn").forEach(b => {
    b.onclick = async () => {
      const id = b.dataset.id;
      const status = tbody.querySelector(`.statusSelect[data-id="${id}"]`).value;
      b.disabled = true;
      const res = await apiUpdateStatus(id, status);
      if (res.ok) { b.textContent = "✓"; setTimeout(() => b.textContent = "שמור", 1000); }
      b.disabled = false;
    };
  });

  tbody.querySelectorAll(".delBtn").forEach(b => {
    b.onclick = async () => {
      if (!confirm("למחוק דיווח?")) return;
      const res = await apiDeleteReport(b.dataset.id);
      if (res.ok) location.reload();
    };
  });
}

async function initAllReportsPage() {
  if (!isAuthed() && !promptPasswordOrFail()) { location.href = "index.html"; return; }

  const fSite = el("filterSite");
  const fStatus = el("filterStatus");
  const runBtn = el("runFilter");

  fillSelectOptions(fSite, ["הכל", ...SITES]);
  fillSelectOptions(fStatus, ["הכל", "חדש", "בטיפול", "טופל"]);

  async function refresh() {
    const res = await apiGetList("");
    if (res.ok) {
      let rows = res.rows;
      if (fSite && fSite.value !== "הכל") rows = rows.filter(r => normalizeSite(r.site) === normalizeSite(fSite.value));
      if (fStatus && fStatus.value !== "הכל") rows = rows.filter(r => r.status === fStatus.value);
      renderAllReportsTable(rows);
    }
  }

  if (runBtn) runBtn.onclick = refresh;
  refresh();
}

// =====================================
// Auto-init
// =====================================
document.addEventListener("DOMContentLoaded", () => {
  const page = document.body.dataset.page;
  if (page === "index") initIndexPage();
  else if (page === "site") initSitePage();
  else if (page === "all") initAllReportsPage();
});
