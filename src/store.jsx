import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { DEFAULTS } from "./lib/constants.js";
import { buildDemoSeed } from "./lib/seed.js";

const KEY = "vbs_db";
const COLS = ["settings", "staff", "days", "products", "safety", "disinfectants", "hygiene", "courses", "support"];

function load() {
  try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && typeof s === "object") return s; } catch { /* empty */ }
  return null;
}
function empty() { const o = {}; COLS.forEach((c) => (o[c] = {})); return o; }

const Ctx = createContext(null);

export function StoreProvider({ children }) {
  const [store, setStore] = useState(() => load() || empty());
  const [toastMsg, setToastMsg] = useState(null);
  const [modal, setModal] = useState(null);
  const toastTimer = useRef(null);

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(store)); }
    catch { setToastMsg("Bộ nhớ trình duyệt đầy hoặc bị chặn; dữ liệu có thể không được lưu."); }
  }, [store]);

  // Sync between tabs on the same device
  useEffect(() => {
    const f = (e) => { if (e.key === KEY) { const s = load(); if (s) setStore(s); } };
    window.addEventListener("storage", f);
    return () => window.removeEventListener("storage", f);
  }, []);

  const toast = useCallback((m) => {
    setToastMsg(m); clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(null), 2600);
  }, []);

  const put = useCallback((col, id, doc) => setStore((s) => ({ ...s, [col]: { ...(s[col] || {}), [id]: JSON.parse(JSON.stringify(doc)) } })), []);
  const remove = useCallback((col, id) => setStore((s) => { const c = { ...(s[col] || {}) }; delete c[id]; return { ...s, [col]: c }; }), []);
  const removeMany = useCallback((pairs) => setStore((s) => {
    const n = { ...s }; pairs.forEach(([col, id]) => { n[col] = { ...(n[col] || {}) }; delete n[col][id]; }); return n;
  }), []);
  const saveSettings = useCallback((patch) => setStore((s) => ({ ...s, settings: { ...s.settings, main: { ...((s.settings || {}).main || {}), ...patch } } })), []);
  const loadDemo = useCallback(() => setStore({ ...empty(), ...buildDemoSeed() }), []);
  const wipe = useCallback(() => setStore(empty()), []);
  const importAll = useCallback((obj) => setStore({ ...empty(), ...obj }), []);

  const D = useMemo(() => {
    const g = (c) => { const o = {}; Object.entries(store[c] || {}).forEach(([id, v]) => (o[id] = { ...v, id: v.id || id })); return o; };
    const days = {}; Object.entries(store.days || {}).forEach(([id, v]) => (days[id] = { ...v, date: id }));
    const hygiene = {}; Object.entries(store.hygiene || {}).forEach(([id, v]) => (hygiene[id] = { ...v, date: id }));
    return {
      settings: { ...DEFAULTS, ...((store.settings || {}).main || {}) },
      staff: g("staff"), days, products: g("products"), safety: g("safety"), disinf: g("disinfectants"),
      hygiene, courses: g("courses"), support: g("support"),
    };
  }, [store]);

  const openModal = useCallback((node) => setModal(() => node), []);
  const closeModal = useCallback(() => setModal(null), []);

  const value = { D, raw: store, put, remove, removeMany, saveSettings, loadDemo, wipe, importAll, toast, openModal, closeModal };
  return (
    <Ctx.Provider value={value}>
      {children}
      {modal && <ModalShell onClose={closeModal}>{modal}</ModalShell>}
      {toastMsg && <div className="toast" role="status">{toastMsg}</div>}
    </Ctx.Provider>
  );
}

function ModalShell({ children, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    const k = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", k);
    const f = ref.current && ref.current.querySelector("input,select,textarea,button");
    f && f.focus();
    return () => document.removeEventListener("keydown", k);
  }, [onClose]);
  return (
    <div className="overlay" role="dialog" aria-modal="true" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" ref={ref}>{children}</div>
    </div>
  );
}

export const useStore = () => useContext(Ctx);
