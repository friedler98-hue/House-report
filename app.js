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
async function apiGetList(site = "") {
  return await apiCall("list", { site });
}

async function apiCreate(payload) {
  return await apiCall("createreport", payload);
}

async function apiUpdateStatus(id, status) {
  return await apiCall("updatestatus", { id, status });
}

// ✅ חדש: העלאת תמונה ל-Drive דרך Apps Script
async function apiUploadImage({ base64, mimeType, fileName }) {
  return await apiCall("uploadimage", { base64, mimeType, fileName });
}

// =====================================
// Utils: time formatting
// =====================================
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

function el(id) { return document.getElementById(id); }

// =====================================
// Image helpers (client)
// =====================================

// קורא קובץ לתוך base64 (בלי prefix)
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => {
      const res = String(fr.result || "");
      // res נראה כך: data:image/jpeg;base64,AAAA
      const comma = res.indexOf(",");
      resolve(comma >= 0 ? res.slice(comma + 1) : res);
    };
    fr.onerror = reject;
    fr.readAsDataURL(file);
  });
}

// מקטין תמונה לפני העלאה (כדי שלא יהיה כבד)
async function resizeImageFile(file, maxSize = 1280, quality = 0.75) {
  // אם זה לא תמונה - נחזיר כמו שזה
  if (!file.type.startsWith("image/")) return file;

  const img = document.createElement("img");
  const url = URL.createObjectURL(file);

  await new Promise((res, rej) => {
    img.onload = res;
    img.onerror = rej;
    img.src = url;
  });

  let { width, height } = img;
  const scale = Math.min(1, maxSize / Math.max(width, height));
  const newW = Math.round(width * scale);
  const newH = Math.round(height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = newW;
  canvas.height = newH;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, newW, newH);

  URL.revokeObjectURL(url);

  const outMime = "image/jpeg"; // תמיד JPEG כדי להקטין
  const dataUrl = canvas.toDataURL(outMime, quality);

  // convert dataURL -> File
  const b64 = dataUrl.split(",")[1];
  const byteStr = atob(b64);
  const arr = new Uint8Array(byteStr.length);
  for (let i = 0; i < byteStr.length; i++) arr[i] = byteStr.charCodeAt(i);

  return new File([arr], (file.name || "photo") + ".jpg", { type: outMime });
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
// UI: Site page (דירה ספציפית)
// =====================================
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

function viewImage(url) {
  if (!url) return;
  window.open(url, "_blank", "noopener,noreferrer");
}

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
    const imgCell = r.imageUrl
      ? `<button class="viewImgBtn" type="button" data-url="${r.imageUrl}">צפייה</button>`
      : `<span class="muted">—</span>`;

    tr.innerHTML = `
      <td>${r.area || ""}</td>
      <td>${r.type || ""}</td>
      <td>${r.desc || ""}</td>
      <td>${r.urgency || ""}</td>
      <td><span class="badge-status">${r.status || ""}</span></td>
      <td>${imgCell}</td>
      <td>${formatTs(r.timestamp)}</td>
    `;
    tbody.appendChild(tr);
  }

  tbody.querySelectorAll(".viewImgBtn").forEach(btn => {
    btn.addEventListener("click", () => viewImage(btn.getAttribute("data-url")));
  });
}

/**
 * מביאים את כל הדיווחים ומסננים פה לפי נרמול
 */
async function loadSiteReports(siteName) {
  const fixedSite = normalizeSite(siteName);

  const res = await apiGetList(""); // כל הדיווחים
  if (!res.ok) throw new Error(res.error || "Failed to load");

  const rows = res.rows || res.data || [];
  return rows.filter(r => normalizeSite(r.site || "") === fixedSite);
}

async function initSitePage() {
  const rawSiteName = qs("site") || "";
  const siteName = normalizeSite(rawSiteName);

  const title = document.getElementById("siteTitle");
  if (title) title.textContent = `מתקן: ${siteName}`;

  // טופס
  const areaSel = el("area");
  const typeSel = el("type");
  const urgencySel = el("urgency");
  const itemInp = el("item");
  const descInp = el("desc");

  // ✅ זה hidden שמחזיק את ה-URL אחרי העלאה
  const imageUrlHidden = el("imageUrl");

  const btn = el("submitBtn");
  const statusMsg = el("statusMsg");

  if (areaSel) fillSelectOptions(areaSel, ["מטבח", "סלון", "חדר שינה", "שירותים", "מקלחת", "מרפסת", "אחר"]);
  if (typeSel) fillSelectOptions(typeSel, ["תקלה", "חוסר"]);
  if (urgencySel) fillSelectOptions(urgencySel, ["נמוך", "בינוני", "גבוה"]);

  // ✅ Image UI elements
  const btnTakePhoto = el("btnTakePhoto");
  const btnChoosePhoto = el("btnChoosePhoto");
  const btnRemovePhoto = el("btnRemovePhoto");
  const fileCamera = el("fileCamera");
  const fileGallery = el("fileGallery");
  const previewWrap = document.querySelector(".img-preview-wrap");
  const imgPreview = el("imgPreview");
  const imgUploadStatus = el("imgUploadStatus");

  function resetImageUI() {
    if (imageUrlHidden) imageUrlHidden.value = "";
    if (imgPreview) imgPreview.src = "";
    if (previewWrap) previewWrap.style.display = "none";
    if (btnRemovePhoto) btnRemovePhoto.style.display = "none";
    if (imgUploadStatus) imgUploadStatus.textContent = "";
    if (fileCamera) fileCamera.value = "";
    if (fileGallery) fileGallery.value = "";
  }

  async function handlePickedFile(file) {
    if (!file) return;

    // תצוגה מקדימה מיד
    if (previewWrap) previewWrap.style.display = "flex";
    if (btnRemovePhoto) btnRemovePhoto.style.display = "inline-block";
    if (imgUploadStatus) imgUploadStatus.textContent = "מעלה תמונה...";

    const localUrl = URL.createObjectURL(file);
    if (imgPreview) imgPreview.src = localUrl;

    try {
      // הקטנה לפני העלאה
      const resized = await resizeImageFile(file);

      const base64 = await fileToBase64(resized);
      const mimeType = resized.type || "image/jpeg";
      const fileName = resized.name || `photo_${Date.now()}.jpg`;

      const res = await apiUploadImage({ base64, mimeType, fileName });
      if (!res.ok) throw new Error(res.error || "העלאה נכשלה");

      // נשמור את ה-URL כדי שייכנס לשיטס
      if (imageUrlHidden) imageUrlHidden.value = res.url || "";

      if (imgUploadStatus) imgUploadStatus.textContent = "✓ התמונה עלתה";
    } catch (e) {
      if (imgUploadStatus) imgUploadStatus.textContent = "";
      alert("שגיאה בהעלאת תמונה: " + e.message);
      resetImageUI();
    } finally {
      URL.revokeObjectURL(localUrl);
    }
  }

  if (btnTakePhoto && fileCamera) {
    btnTakePhoto.addEventListener("click", () => fileCamera.click());
    fileCamera.addEventListener("change", () => handlePickedFile(fileCamera.files?.[0]));
  }
  if (btnChoosePhoto && fileGallery) {
    btnChoosePhoto.addEventListener("click", () => fileGallery.click());
    fileGallery.addEventListener("change", () => handlePickedFile(fileGallery.files?.[0]));
  }
  if (btnRemovePhoto) {
    btnRemovePhoto.addEventListener("click", () => resetImageUI());
  }

  async function refreshTable() {
    const rows = await loadSiteReports(siteName);
    renderSiteTable(rows);
  }

  if (btn) {
    btn.addEventListener("click", async () => {
      try {
        btn.disabled = true;
        if (statusMsg) statusMsg.textContent = "שולח...";

        // אם המשתמש בחר תמונה ועדיין כתוב "מעלה..." אז לא ניתן לשלוח
        if (imgUploadStatus && imgUploadStatus.textContent.includes("מעלה")) {
          throw new Error("התמונה עדיין עולה, חכה רגע ואז שלח שוב");
        }

        const payload = {
          site: siteName,
          area: areaSel?.value || "",
          type: typeSel?.value || "",
          item: itemInp?.value || "",
          desc: descInp?.value || "",
          urgency: urgencySel?.value || "",
          imageUrl: imageUrlHidden?.value || "",
        };

        const res = await apiCreate(payload);
        if (!res.ok) throw new Error(res.error || "שליחה נכשלה");

        // ניקוי
        if (areaSel) areaSel.value = "";
        if (typeSel) typeSel.value = "";
        if (urgencySel) urgencySel.value = "";
        if (itemInp) itemInp.value = "";
        if (descInp) descInp.value = "";
        resetImageUI();

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
    tr.innerHTML = `<td colspan="9" style="text-align:center;color:#6c757d;padding:14px;">אין נתונים להצגה</td>`;
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

    const imgCell = r.imageUrl
      ? `<button class="viewImgBtn" type="button" data-url="${r.imageUrl}">צפייה</button>`
      : `<span class="muted">—</span>`;

    tr.innerHTML = `
      <td>${formatTs(r.timestamp)}</td>
      <td>${normalizeSite(r.site || "")}</td>
      <td>${r.area || ""}</td>
      <td>${r.type || ""}</td>
      <td>${r.desc || ""}</td>
      <td>${r.urgency || ""}</td>
      <td>${imgCell}</td>
      <td>${statusSelect}</td>
      <td><button class="saveBtn" data-id="${r.id}">שמור</button></td>
    `;
    tbody.appendChild(tr);
  }

  tbody.querySelectorAll(".viewImgBtn").forEach(btn => {
    btn.addEventListener("click", () => viewImage(btn.getAttribute("data-url")));
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
