// =====================
// FINAL CONSOLIDATED APP.JS
// =====================
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

// פונקציה אחידה לשליחה (מונעת בעיות CORS)
async function apiCall(action, payload = {}) {
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action, ...payload }),
    });
    const txt = await response.text();
    return JSON.parse(txt);
  } catch (e) {
    console.error("API Error:", e);
    return { ok: false, error: e.toString() };
  }
}

// דף הבית - תמיד מרנדר את הדירות מהקוד
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

// דף דירה - טיפול בתמונות ושליחה בטוחה
async function initSitePage() {
  const siteName = normalizeSite(qs("site") || "");
  const title = document.getElementById("siteTitle");
  if (title) title.textContent = `מתקן: ${siteName}`;

  const imgInfo = document.getElementById("imgInfo");
  const imgPreview = document.getElementById("imgPreview");
  const imgHidden = document.getElementById("imageUrl");
  const submitBtn = document.getElementById("submitBtn");

  // העלאת תמונה
  const handleFile = async (file) => {
    if (!file) return;
    submitBtn.disabled = true; // נועל כפתור עד סיום העלאה
    imgInfo.textContent = "מעלה תמונה...";
    
    const reader = new FileReader();
    reader.onload = async (e) => {
      imgPreview.src = e.target.result;
      imgPreview.style.display = "block";
      
      const res = await apiCall("uploadimage", {
        base64: e.target.result.split(",").pop(),
        mimeType: file.type,
        fileName: file.name
      });

      if (res.ok) {
        imgHidden.value = res.url;
        imgInfo.textContent = "✓ תמונה עלתה";
      } else {
        alert("שגיאה בהעלאת תמונה: " + res.error);
        imgInfo.textContent = "שגיאה";
      }
      submitBtn.disabled = false; // משחרר כפתור
    };
    reader.readAsDataURL(file);
  };

  document.getElementById("btnCamera").onclick = () => document.getElementById("fileCamera").click();
  document.getElementById("btnGallery").onclick = () => document.getElementById("fileGallery").click();
  document.getElementById("fileCamera").onchange = (e) => handleFile(e.target.files[0]);
  document.getElementById("fileGallery").onchange = (e) => handleFile(e.target.files[0]);

  // שליחת הדיווח הסופי
  submitBtn.onclick = async () => {
    if (imgInfo.textContent === "מעלה תמונה...") return alert("אנא המתן לסיום העלאת התמונה");
    
    submitBtn.disabled = true;
    const payload = {
      site: siteName,
      area: document.getElementById("area").value,
      type: document.getElementById("type").value,
      item: document.getElementById("item").value,
      desc: document.getElementById("desc").value,
      urgency: document.getElementById("urgency").value,
      imageUrl: imgHidden.value, // כאן הקישור עובר לגיליון
      status: "חדש"
    };

    const res = await apiCall("createreport", payload);
    if (res.ok) {
      alert("הדיווח נשלח בהצלחה!");
      location.reload();
    } else {
      alert("שגיאה בשליחה: " + res.error);
      submitBtn.disabled = false;
    }
  };
}

document.addEventListener("DOMContentLoaded", () => {
  const page = document.body.dataset.page;
  if (page === "index") initIndexPage();
  if (page === "site") initSitePage();
});
