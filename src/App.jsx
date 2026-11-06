import { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "./store.jsx";
import { allAlerts, setting } from "./lib/logic.js";
import { hm, hashPin } from "./lib/utils.js";
import { PinPad } from "./components/ui.jsx";
import Overview from "./views/Overview.jsx";
import Kiosk from "./views/Kiosk.jsx";
import Timesheet from "./views/Timesheet.jsx";
import Staff from "./views/Staff.jsx";
import Products from "./views/Products.jsx";
import Hygiene from "./views/Hygiene.jsx";
import Bgw from "./views/Bgw.jsx";
import Inspect from "./views/Inspect.jsx";
import Shop from "./views/Shop.jsx";
import Setup from "./views/Setup.jsx";
import { HygChecklist } from "./views/Hygiene.jsx";

const NAV = [
  ["tong-quan", "Tổng quan", Overview],
  ["cham-cong", "Chấm công", Kiosk],
  ["bang-gio", "Bảng giờ", Timesheet],
  ["nhan-vien", "Nhân viên", Staff],
  ["ve-sinh", "An toàn vệ sinh", Hygiene],
  ["bgw", "An toàn lao động BGW", Bgw],
  ["san-pham", "Sản phẩm", Products],
  ["kiem-tra", "Khi bị kiểm tra", Inspect],
  ["tiem", "Thông tin tiệm", Shop],
];
const GROUPS = [["Hằng ngày", ["tong-quan", "cham-cong", "bang-gio"]], ["Hồ sơ", ["nhan-vien", "ve-sinh", "bgw", "san-pham"]], ["Khác", ["kiem-tra", "tiem"]]];

function readHash() { let h = location.hash.slice(1); if (h === "an-toan") h = "ve-sinh"; return NAV.some((n) => n[0] === h) ? h : "tong-quan"; }

export const isCounter = () => { try { return localStorage.getItem("ns_counter") === "1"; } catch { return false; } };
export const setCounter = (v) => { try { v ? localStorage.setItem("ns_counter", "1") : localStorage.removeItem("ns_counter"); } catch { /* ignore */ } };

function useNow(ms) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), ms); return () => clearInterval(t); }, [ms]);
  return now;
}

export default function App() {
  const { D, openModal, closeModal } = useStore();
  const [view, setView] = useState(readHash);
  const [locked, setLocked] = useState(true);
  const lastAct = useRef(Date.now());
  const now = useNow(30000);

  useEffect(() => {
    const f = () => { setView(readHash()); closeModal(); window.scrollTo(0, 0); };
    window.addEventListener("hashchange", f);
    return () => window.removeEventListener("hashchange", f);
  }, [closeModal]);

  const lockable = isCounter() && !!D.settings.adminPinHash;
  const lockActive = lockable && locked;

  useEffect(() => {
    const mark = () => { lastAct.current = Date.now(); };
    ["pointerdown", "keydown"].forEach((ev) => document.addEventListener(ev, mark, true));
    const t = setInterval(() => {
      if (lockable && !locked) {
        const mins = Number(D.settings.lockMinutes) || 5;
        if (Date.now() - lastAct.current > mins * 60000) { setLocked(true); closeModal(); }
      }
    }, 15000);
    return () => { ["pointerdown", "keydown"].forEach((ev) => document.removeEventListener(ev, mark, true)); clearInterval(t); };
  }, [lockable, locked, D.settings.lockMinutes, closeModal]);

  const alerts = useMemo(() => allAlerts(D), [D, now]); // eslint-disable-line react-hooks/exhaustive-deps
  const crit = alerts.filter((a) => a.level === "crit").length;
  const salon = setting(D, "salonName");
  const d = new Date(now);
  const clock = d.toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit" }) + " · " + hm(now);

  const unlock = () => openModal(
    <PinPad title="Mở khóa chủ tiệm" hint="Nhập mã PIN chủ tiệm (6 số)" length={6} onCancel={closeModal}
      onComplete={async (pin) => {
        const h = await hashPin(pin, D.settings.adminPinSalt || "");
        if (h === D.settings.adminPinHash) { closeModal(); setLocked(false); lastAct.current = Date.now(); location.hash = "#tong-quan"; return true; }
        return false;
      }} />
  );

  if (!D.settings.setupDone) return <Setup />;

  if (lockActive) return <LockedScreen salon={salon} clock={clock} onUnlock={unlock} />;

  const Current = NAV.find((n) => n[0] === view)[2];
  return (
    <div className="shell">
      <aside className="rail">
        <div className="brand">
          <span className="logo" aria-hidden="true">V</span>
          <div>
            <div className="brand-name">ViBeauty<b>SAFE</b></div>
            <div className="brand-salon">{salon}</div>
          </div>
        </div>
        <nav aria-label="Màn hình">
          {GROUPS.map(([g, keys]) => (
            <div className="nav-group" key={g}>
              <div className="nav-label">{g}</div>
              {keys.map((k) => {
                const n = NAV.find((x) => x[0] === k);
                return (
                  <a key={k} href={"#" + k} aria-current={view === k ? "page" : undefined}>
                    <span>{n[1]}</span>
                    {k === "tong-quan" && crit > 0 && <span className="count">{crit}</span>}
                  </a>
                );
              })}
            </div>
          ))}
        </nav>
        <div className="rail-foot">
          <div className="mono small">{clock}</div>
          {lockable && <button className="btn sm" onClick={() => setLocked(true)}>Khóa máy</button>}
        </div>
      </aside>
      <main className="main">
        <Current alerts={alerts} now={now} />
        <Footer />
      </main>
    </div>
  );
}

function LockedScreen({ salon, clock, onUnlock }) {
  const [kv, setKv] = useState("cham-cong");
  return (
    <div className="locked">
      <header className="locked-top">
        <div className="brand"><span className="logo" aria-hidden="true">V</span><div><div className="brand-name">{salon}</div><div className="brand-salon mono">{clock}</div></div></div>
        <div className="seg" role="tablist">
          <button role="tab" aria-selected={kv === "cham-cong"} onClick={() => setKv("cham-cong")}>Chấm công</button>
          <button role="tab" aria-selected={kv === "ve-sinh"} onClick={() => setKv("ve-sinh")}>Checklist vệ sinh</button>
        </div>
        <button className="btn" onClick={onUnlock}>Mở khóa chủ tiệm</button>
      </header>
      <main className="main narrow">
        {kv === "cham-cong" ? <Kiosk /> : <><h1 className="h-plain">Checklist vệ sinh hôm nay</h1><HygChecklist /></>}
        <p className="muted small">Máy đang khóa: chỉ chấm công và checklist vệ sinh. Dữ liệu khác chỉ chủ tiệm mở được.</p>
      </main>
    </div>
  );
}

function Footer() {
  return (
    <footer className="foot">
      <div><b>ViBeautySAFE</b> · Phần mềm được phát triển bởi <b>Lee Nhung Nguyen</b>. © 2026 Lee Nhung Nguyen. Bảo lưu mọi quyền; không sao chép, phân phối hoặc dùng lại nội dung và ý tưởng khi chưa có sự đồng ý bằng văn bản.</div>
      <div>Cần tư vấn/hỗ trợ? Email <a href="mailto:info@one4allvn.de">info@one4allvn.de</a> · Tel <a href="tel:+4917616789999">0176 1678 9999</a></div>
    </footer>
  );
}
