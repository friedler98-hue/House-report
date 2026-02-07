// הוספת גרסה ל-URL כדי למנוע בעיות זיכרון דפדפן
const API_URL = "https://script.google.com/macros/s/AKfycbykC-hz-QrtHBTf5J55o1eAXXzxQA-z6DcRS3DCMCqam22uaP2vq-viorV6u52TRHEyag/exec?v=" + Date.now();

async function apiCall(action, payload = {}) {
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action, ...payload }),
    });
    return await response.json();
  } catch (e) {
    console.error("Error:", e);
    return { ok: false, error: "תקלה בתקשורת: " + e.message };
  }
}

async function handlePickedFile(file) {
  const imgInfo = document.getElementById("imgInfo");
  const imgPreview = document.getElementById("imgPreview");
  const imgHidden = document.getElementById("imageUrl");
  const submitBtn = document.getElementById("submitBtn");

  if (!file) return;
  
  // נעילת הכפתור עד סיום ההעלאה
  if (submitBtn) submitBtn.disabled = true;
  imgInfo.textContent = "מעלה תמונה...";

  const reader = new FileReader();
  reader.onload = async (e) => {
    if (imgPreview) { 
      imgPreview.src = e.target.result; 
      imgPreview.style.display = "block"; 
    }
    
    const base64Data = e.target.result.split(",").pop();
    const res = await apiCall("uploadimage", {
      base64: base64Data,
      mimeType: file.type,
      fileName: file.name
    });

    if (res.ok) {
      if (imgHidden) imgHidden.value = res.url;
      imgInfo.textContent = "✓ תמונה עלתה";
      if (submitBtn) submitBtn.disabled = false;
    } else {
      imgInfo.textContent = "שגיאה בהעלאה";
      alert("גוגל חוסם את הקובץ: " + res.error);
      if (submitBtn) submitBtn.disabled = false;
    }
  };
  reader.readAsDataURL(file);
}

// שאר הלוגיקה של הדפים (initSitePage וכו') נשארת אותו דבר
