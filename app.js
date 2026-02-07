const API_URL = "https://script.google.com/macros/s/AKfycbw8Yj6LoyYW7Po_WvQUlFHmfDZoEkpltQHoufKs0HzWBORLQBKbsa0OzwPFsPIiVl4Tcg/exec";
const REPORTS_PASSWORD = "1234";

const SITES = ["דירת 50", "דירת 55", "דירת 56", "דירת 51", "דירת 95", "דירת 45", "דירת 42", "דירת 500", "דירת 800", "דירת 900"];

// Helpers
function qs(name) { return new URLSearchParams(location.search).get(name); }
function normalizeSite(raw) {
  const s = (raw || "").toString().trim();
  const m = s.match(/\d+/);
  return m ? `דירת ${m[0]}` : s;
}

// פונקציית תקשורת עוקפת חסימות דפדפן (CORS)
async function apiCall(action, payload = {}) {
  const url = new URL(API_URL);
  url.searchParams.set("action", action);
  for (const [k, v] of Object.entries(payload)) {
    if (v) url.searchParams.set(k, v);
  }

  // שימוש ב-mode: 'cors' וטיפול בשגיאות
  try {
    const response = await fetch(url.toString());
    const data = await response.json();
    return data;
  } catch (e) {
    console.error("API Error:", e);
    return { ok: false, error: "בעיית תקשורת עם השרת" };
  }
}

// העלאת תמונה - שליחה ב-POST בגלל גודל הקובץ
async function apiUploadImage(payload) {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action: "uploadimage", ...payload }),
  });
  return await response.json();
}

// דף הבית - הצגת הדירות
function initIndexPage() {
  const grid = document.querySelector(".sites-grid");
  if (!grid) return;
  grid.innerHTML = "";
  SITES.forEach(s => {
    const a = document.createElement("a");
    a.className = "site-card";
    a.href = `site.html?site=${encodeURIComponent(s)}`;
    a.innerHTML = `<span>${s.replace("דירת ", "")} דירה</span><small>כניסה לדיווח</small>`;
    grid.appendChild(a);
  });
}

// דף דירה - העלאת תמונה ושליחה
async function initSitePage() {
  const siteName = normalizeSite(qs("site") || "");
  const title = document.getElementById("siteTitle");
  if (title) title.textContent = `מתקן: ${siteName}`;

  const imgInfo = document.getElementById("imgInfo");
  const imgPreview = document.getElementById("imgPreview");
  const imgHidden = document.getElementById("imageUrl");

  const handleFile = async (file) => {
    if (!file) return;
    imgInfo.textContent = "מעלה תמונה...";
    const reader = new FileReader();
    reader.onload = async (e) => {
      imgPreview.src = e.target.result;
      imgPreview.style.display = "block";
      const res = await apiUploadImage({
        base64: e.target.result.split(",").pop(),
        mimeType: file.type,
        fileName: file.name
      });
      if (res.ok) {
        imgHidden.value = res.url;
        imgInfo.textContent = "✓ תמונה עלתה";
      } else {
        alert("שגיאה: " + res.error);
        imgInfo.textContent = "שגיאה";
      }
    };
    reader.readAsDataURL(file);
  };

  document.getElementById("btnCamera").onclick = () => document.getElementById("fileCamera").click();
  document.getElementById("btnGallery").onclick = () => document.getElementById("fileGallery").click();
  document.getElementById("fileCamera").onchange = (e) => handleFile(e.target.files[0]);
  document.getElementById("fileGallery").onchange = (e) => handleFile(e.target.files[0]);

  document.getElementById("submitBtn").onclick = async () => {
    const payload = {
      site: siteName,
      area: document.getElementById("area").value,
      type: document.getElementById("type").value,
      item: document.getElementById("item").value,
      desc: document.getElementById("desc").value,
      urgency: document.getElementById("urgency").value,
      imageUrl: imgHidden.value
    };
    const res = await apiCall("createreport", payload);
    if (res.ok) { alert("דיווח נשלח!"); location.href = "index.html"; }
  };

  // הצגת טבלה בדירה
  const resList = await apiCall("list", { site: siteName });
  if (resList.ok) {
    const tbody = document.querySelector("#siteTable tbody");
    resList.rows.forEach(r => {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${r.area}</td><td>${r.type}</td><td>${r.desc}</td><td>${r.urgency}</td><td>${r.status}</td><td>${new Date(r.timestamp).toLocaleDateString()}</td><td>${r.imageUrl ? `<a href="${r.imageUrl}" target="_blank">פתח</a>` : "-"}</td>`;
      tbody.appendChild(tr);
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const page = document.body.dataset.page;
  if (page === "index") initIndexPage();
  if (page === "site") initSitePage();
});
