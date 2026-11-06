import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { toast as sonner } from "sonner";
import { DEFAULTS } from "./lib/constants.js";
import { Toaster } from "@/components/ui/sonner";
import { Dialog, DialogContent } from "@/components/ui/dialog";

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
  const [modal, setModal] = useState(null);
  const toast = useCallback((m) => sonner(m), []);

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(store)); }
    catch { sonner("Bộ nhớ trình duyệt đầy hoặc bị chặn; dữ liệu có thể không được lưu."); }
  }, [store]);

  useEffect(() => {
    const f = (e) => { if (e.key === KEY) { const s = load(); if (s) setStore(s); } };
    window.addEventListener("storage", f);
    return () => window.removeEventListener("storage", f);
  }, []);

  const put = useCallback((col, id, doc) => setStore((s) => ({ ...s, [col]: { ...(s[col] || {}), [id]: JSON.parse(JSON.stringify(doc)) } })), []);
  const remove = useCallback((col, id) => setStore((s) => { const c = { ...(s[col] || {}) }; delete c[id]; return { ...s, [col]: c }; }), []);
  const saveSettings = useCallback((patch) => setStore((s) => ({ ...s, settings: { ...s.settings, main: { ...((s.settings || {}).main || {}), ...patch } } })), []);
  const wipe = useCallback(() => setStore(empty()), []);
  const importAll = useCallback((obj) => setStore({ ...empty(), ...obj }), []);

  const D = useMemo(() => {
    const g = (c) => { const o = {}; Object.entries(store[c] || {}).forEach(([id, v]) => (o[id] = { ...v, id: v.id || id })); return o; };
    const byDate = (c) => { const o = {}; Object.entries(store[c] || {}).forEach(([id, v]) => (o[id] = { ...v, date: id })); return o; };
    return {
      settings: { ...DEFAULTS, ...((store.settings || {}).main || {}) },
      staff: g("staff"), days: byDate("days"), products: g("products"), safety: g("safety"), disinf: g("disinfectants"),
      hygiene: byDate("hygiene"), courses: g("courses"), support: g("support"),
    };
  }, [store]);

  const openModal = useCallback((node) => setModal(() => node), []);
  const closeModal = useCallback(() => setModal(null), []);

  const value = { D, raw: store, put, remove, saveSettings, wipe, importAll, toast, openModal, closeModal };
  return (
    <Ctx.Provider value={value}>
      {children}
      <Dialog open={!!modal} onOpenChange={(o) => { if (!o) closeModal(); }}>
        <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-xl">{modal}</DialogContent>
      </Dialog>
      <Toaster position="bottom-center" />
    </Ctx.Provider>
  );
}

export const useStore = () => useContext(Ctx);
