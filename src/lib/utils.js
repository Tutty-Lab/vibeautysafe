export const pad = (n) => String(n).padStart(2, "0");
export const dateKey = (d) => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
export const monthKey = (d) => d.getFullYear() + "-" + pad(d.getMonth() + 1);
export const todayKey = () => dateKey(new Date());
export function hm(ms) { if (ms == null) return "—"; const d = new Date(ms); return pad(d.getHours()) + ":" + pad(d.getMinutes()); }
export function durTxt(min) { min = Math.max(0, Math.round(min)); return Math.floor(min / 60) + "h " + pad(min % 60); }
export const hours = (min) => (min / 60).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const eur = (v) => (v == null || isNaN(v) ? "—" : v.toLocaleString("de-DE", { style: "currency", currency: "EUR" }));
export function deDate(key) { if (!key) return "—"; const [y, m, d] = key.split("-"); return d + "." + m + "." + y; }
export function monthLabel(m) { const [y, mm] = m.split("-"); return "Tháng " + Number(mm) + "/" + y; }
export function daysUntil(key) { if (!key) return null; const t = new Date(key + "T00:00:00"); const n = new Date(); n.setHours(0, 0, 0, 0); return Math.round((t - n) / 86400000); }
export const initials = (n) => (n || "?").trim().split(/\s+/).slice(-1)[0].slice(0, 2).toUpperCase();
export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
export const norm = (t) => " " + String(t || "").toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim() + " ";
export function monthsSince(key) { if (!key) return null; const a = new Date(key + "T00:00:00"), b = new Date(); return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth()) - (b.getDate() < a.getDate() ? 1 : 0); }
export function prevMonthKey() { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - 1); return monthKey(d); }
export function monthOptions() { const out = []; const d = new Date(); d.setDate(1); for (let i = 0; i < 13; i++) { out.push(monthKey(d)); d.setMonth(d.getMonth() - 1); } return out; }
export const firstName = (n) => (n || "").split(" ").slice(-1)[0];
export async function hashPin(pin, salt) {
  try {
    const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(salt + ":" + pin));
    return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
  } catch {
    let h = 2166136261; for (const c of salt + ":" + pin) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return "f" + (h >>> 0).toString(16);
  }
}
export function copyText(t) { return navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject(); }
