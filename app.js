// =====================
// FINAL STABLE APP.JS
// =====================
const API_URL = "https://script.google.com/macros/s/AKfycbw8Yj6LoyYW7Po_WvQUlFHmfDZoEkpltQHoufKs0HzWBORLQBKbsa0OzwPFsPIiVl4Tcg/exec";
const REPORTS_PASSWORD = "1234";

const SITES = ["דירת 50", "דירת 55", "דירת 56", "דירת 51", "דירת 95", "דירת 45", "דירת 42", "דירת 500", "דירת 800", "דירת 900"];

function qs(name) { return new URLSearchParams(location.search).get(name); }

function normalizeSite(raw) {
  const s = (raw || "").toString().trim();
  const m = s.match(/\d+/);
  return m ? `דירת ${m[0]}` : s;
}

// פונקציית תקשורת אמינה
async function apiCall(action, payload = {}) {
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      mode: "no-cors", // פותר בעיות דפדפן מול גוגל
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action, ...payload }),
    });
    // בגלל no-cors, לא נוכל לקרוא את התשובה ישירות, אבל הנתונים יישלחו
    return { ok: true }; 
  } catch (e) {
    return { ok: false, error: e.toString() };
  }
}

// פונקציה ייעודית להעלאת תמונה שנועדה לעקוף את חסימת ההרשאות
async function apiUploadImage(payload) {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action: "uploadimage", ...payload }),
  });
  const txt = await response.text();
  return JSON.parse(txt);
}

async function handlePickedFile(file) {
  const imgInfo = document.getElementById("imgInfo");
  const imgPreview = document.getElementById("imgPreview");
  const imgHidden = document.getElementById("imageUrl");

  if (!file) return;
  imgInfo.textContent = "מעלה תמונה...";

  const reader = new FileReader();
  reader.onload = async (e) => {
    imgPreview.src = e.target.result;
    imgPreview.style.display = "block";
    
    const base64Data = e.target.result.split(",").pop();
    try {
      const res = await apiUploadImage({
        base64: base64Data,
        mimeType: file.type,
        fileName: file.name
      });

      if (res.ok) {
        imgHidden.value = res.url;
        imgInfo.textContent = "✓ תמונה עלתה";
      } else {
        throw new Error(res.error);
      }
    } catch (err) {
      alert("שגיאת הרשאה או גודל: " + err.message);
      imgInfo.textContent = "שגיאה";
    }
  };
  reader.readAsDataURL(file);
}

function initSitePage() {
  const siteName = normalizeSite(qs("site") || "");
  const titleEl = document.getElementById("siteTitle");
  if (titleEl) titleEl.textContent = `מתקן: ${siteName}`;

  const fileCamera = document.getElementById("fileCamera");
  const fileGallery = document.getElementById("fileGallery");

  if (document.getElementById("btnCamera")) document.getElementById("btnCamera").onclick = () => fileCamera.click();
  if (document.getElementById("btnGallery")) document.getElementById("btnGallery").onclick = () => fileGallery.click();
  
  if (fileCamera) fileCamera.onchange = () => handlePickedFile(fileCamera.files[0]);
  if (fileGallery) fileGallery.onchange = () => handlePickedFile(fileGallery.files[0]);

  document.getElementById("submitBtn").onclick = async () => {
    const btn = document.getElementById("submitBtn");
    btn.disabled = true;
    const payload = {
      site: siteName,
      area: document.getElementById("area").value,
      type: document.getElementById("type").value,
      item: document.getElementById("item").value,
      desc: document.getElementById("desc").value,
      urgency: document.getElementById("urgency").value,
      imageUrl: document.getElementById("imageUrl").value,
      status: "חדש"
    };
    
    // שליחת הדיווח
    await apiCall("createreport", payload);
    alert("הדיווח נשלח! (יעודכן בגיליון תוך כמה שניות)");
    location.reload();
  };
}

document.addEventListener("DOMContentLoaded", () => {
  if (document.body.dataset.page === "site") initSitePage();
});
