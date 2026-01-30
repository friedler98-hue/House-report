const API_URL = "https://script.google.com/macros/s/AKfycbyP83RAgg54-TB0JJDsPpzbudQsH1SnYvbCXS8lZsDrQpm2IzK-xJyPW40wObG_BPKbSw/exec";

// פה אתה שם את השמות כמו “רותם, דפנה, סביון…”
// תשאיר כמו שזה ותערוך ידנית:
const SITES = ["דירת 50","דירת 56","דירת 51","דירת 500","דירת 900","דירת 800"];

function qs(name){ return new URLSearchParams(location.search).get(name); }

async function apiGetList(site=""){
  const url = `${API_URL}?action=list&site=${encodeURIComponent(site)}`;
  const r = await fetch(url);
  return await r.json();
}

async function apiCreate(payload){
  const r = await fetch(API_URL,{
    method:"POST",
    headers:{"Content-Type":"text/plain;charset=utf-8"},
    body: JSON.stringify({action:"createreport", ...payload})
  });
  return await r.json();
}

async function apiSetStatus(id,status){
  const r = await fetch(API_URL,{
    method:"POST",
    headers:{"Content-Type":"text/plain;charset=utf-8"},
    body: JSON.stringify({action:"setstatus", id, status})
  });
  return await r.json();
}

function el(html){
  const t=document.createElement("template");
  t.innerHTML=html.trim();
  return t.content.firstChild;
}

function fmt(iso){
  const d=new Date(iso);
  if(isNaN(d)) return "";
  const dd=String(d.getDate()).padStart(2,"0");
  const mm=String(d.getMonth()+1).padStart(2,"0");
  const hh=String(d.getHours()).padStart(2,"0");
  const mi=String(d.getMinutes()).padStart(2,"0");
  return `${dd}/${mm} ${hh}:${mi}`;
}
