// =====================================
// CONFIG & CONSTANTS
// =====================================
const API_URL = "https://script.google.com/macros/s/AKfycbykC-hz-QrtHBTf5J55o1eAXXzxQA-z6DcRS3DCMCqam22uaP2vq-viorV6u52TRHEyag/exec";
const REPORTS_PASSWORD = "1234";

const SITES = [
  "דירת 50", "דירת 55", "דירת 56", "דירת 51", "דירת 95",
  "דירת 45", "דירת 42", "דירת 500", "דירת 800", "דירת 900"
];

// =====================================
// UTILS & AUTH
// =====================================
function qs(name) { return new URLSearchParams(location.search).get(name); }

function normalizeSite(raw) {
  const s = (raw || "").toString().trim();
  const m = s.match(/\d+/);
  return m ? `דירת ${m[0]}` : s;
}

function isAuthed() { return sessionStorage.getItem("reports_auth") === "1"; }
function setAuth(ok) { if (ok) sessionStorage.setItem("reports_auth", "1"); else sessionStorage.removeItem("reports_auth"); }

function promptPasswordOrFail() {
  const p = prompt("הזן סיסמה לצפייה בכל הדיווחים:");
  if (p === REPORTS_PASSWORD) { setAuth(true); return true; }
  alert("סיסמה שגויה");
  return false;
}

// פונקציית תקשורת שמתאימה גם ל-GET (לקריאת נתונים) וגם ל-POST (לשליחה)
async function apiCall(action, payload = {}) {
  try {
    const url = new URL(API_URL);
    url.searchParams.set("action", action);
    
    // אם זו פעולת רשימה, נשתמש ב-GET פשוט כדי לעקוף בעיות תצוגה
    if (action === "list") {
      if (payload.site) url.searchParams.set("site", payload.site);
      const res = await fetch(url.toString());
      return await res.json();
    }

    // לשאר הפעולות (יצירה/העלאה) נשתמש ב-POST
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action, ...payload }),
    });
    const txt = await response.text();
    return JSON.parse(txt);
  } catch (e) {
    console.error("API Error:", e);
    return { ok: false, error: "בעיית תקשורת עם הגיליון" };
  }
}

// =====================================
// PAGE: INDEX (Home)
// =====================================
function initIndexPage() {
  const grid = document.querySelector(".sites-grid");
  if (grid) {
    grid.innerHTML = "";
    SITES.forEach(s => {
      const a = document.createElement("a");
      a.className = "site-card";
      a.href = `site.html?site=${encodeURIComponent(s)}`;
      a.innerHTML = `<span>${s.replace("דירת ", "")} דירה</span><small>כניסה לדיווח</small>`;
      grid.appendChild(a);
    });
  }

  const allReportsLink = document.getElementById("allReportsLink");
  if (allReportsLink) {
    allReportsLink.addEventListener("click", (e) => {
      if (!isAuthed() && !promptPasswordOrFail()) e.preventDefault();
    });
  }
}

// =====================================
// PAGE: SITE (Reporting form)
// =====================================
async function initSitePage() {
  const rawSiteName = qs("site") || "";
  const siteName = normalizeSite(rawSiteName);
  const title = document.getElementById("siteTitle");
  if (title) title.textContent = `מתקן: ${siteName}`;

  const tbody = document.querySelector("#siteTable tbody");
  
  // טעינת הדיווחים הקיימים לדירה הספציפית
  const loadSiteReports = async () => {
    const res = await apiCall("list", { site: siteName });
    if (res.ok && tbody) {
      tbody.innerHTML = "";
      res.rows.forEach(r => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${r.area || ""}</td>
          <td>${r.type || ""}</td>
          <td>${r.desc || ""}</td>
          <td>${r.urgency || ""}</td>
          <td><span class="badge-status">${r.status || ""}</span></td>
          <td>${new Date(r.timestamp).toLocaleDateString('he-IL')}</td>
          <td>${r.imageUrl ? `<a href="${r.imageUrl}" target="_blank" class="imgBtn">פתח</a>` : "-"}</td>
        `;
        tbody.appendChild(tr);
      });
    }
  };

  const imgInfo = document.getElementById("imgInfo");
  const imgPreview = document.getElementById("imgPreview");
  const imgHidden = document.getElementById("imageUrl");
  const submitBtn = document.getElementById("submitBtn");

  const handleFile = async (file) => {
    if (!file) return;
    submitBtn.disabled = true;
    imgInfo.textContent = "מעלה תמונה...";
    const reader = new FileReader();
    reader.onload = async (e) => {
      if (imgPreview) { imgPreview.src = e.target.result; imgPreview.style.display = "block"; }
      const res = await apiCall("uploadimage", {
        base64: e.target.result.split(",").pop(),
        mimeType: file.type,
        fileName: file.name
      });
      if (res.ok) {
        if (imgHidden) imgHidden.value = res.url;
        imgInfo.textContent = "✓ תמונה עלתה";
      }
      submitBtn.disabled = false;
    };
    reader.readAsDataURL(file);
  };

  if (document.getElementById("btnCamera")) document.getElementById("btnCamera").onclick = () => document.getElementById("fileCamera").click();
  if (document.getElementById("btnGallery")) document.getElementById("btnGallery").onclick = () => document.getElementById("fileGallery").click();
  if (document.getElementById("fileCamera")) document.getElementById("fileCamera").onchange = (e) => handleFile(e.target.files[0]);
  if (document.getElementById("fileGallery")) document.getElementById("fileGallery").onchange = (e) => handleFile(e.target.files[0]);

  if (submitBtn) {
    submitBtn.onclick = async () => {
      submitBtn.disabled = true;
      const payload = {
        site: siteName,
        area: document.getElementById("area").value,
        type: document.getElementById("type").value,
        item: document.getElementById("item").value,
        desc: document.getElementById("desc").value,
        urgency: document.getElementById("urgency").value,
        imageUrl: imgHidden ? imgHidden.value : "",
        status: "חדש"
      };
      const res = await apiCall("createreport", payload);
      if (res.ok) { alert("נשלח בהצלחה!"); location.reload(); }
      else { alert("שגיאה"); submitBtn.disabled = false; }
    };
  }

  loadSiteReports();
}

// =====================================
// PAGE: ALL REPORTS (Admin)
// =====================================
async function initAllReportsPage() {
  if (!isAuthed() && !promptPasswordOrFail()) { location.href = "index.html"; return; }

  const tbody = document.querySelector("#allTable tbody");
  const res = await apiCall("list");
  
  if (res.ok && tbody) {
    tbody.innerHTML = "";
    res.rows.forEach(r => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${new Date(r.timestamp).toLocaleDateString('he-IL')}</td>
        <td>${r.site}</td>
        <td>${r.area}</td>
        <td>${r.type}</td>
        <td>${r.desc}</td>
        <td>${r.urgency}</td>
        <td>${r.imageUrl ? `<a href="${r.imageUrl}" target="_blank">פתח</a>` : "-"}</td>
        <td>${r.status}</td>
      `;
      tbody.appendChild(tr);
    });
  }
}

// =====================================
// INITIALIZATION
// =====================================
document.addEventListener("DOMContentLoaded", () => {
  const page = document.body.dataset.page;
  if (page === "index") initIndexPage();
  else if (page === "site") initSitePage();
  else if (page === "all") initAllReportsPage();
});
