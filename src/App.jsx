import { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "./store.jsx";
import { allAlerts, setting } from "./lib/logic.js";
import { cn, hm, hashPin } from "./lib/utils.js";
import { Button, PinPad, Tabs } from "./components/ui.jsx";
import { Separator } from "@/components/ui/separator";
import Overview from "./views/Overview.jsx";
import Kiosk from "./views/Kiosk.jsx";
import Timesheet from "./views/Timesheet.jsx";
import Staff from "./views/Staff.jsx";
import Products from "./views/Products.jsx";
import Hygiene, { HygChecklist } from "./views/Hygiene.jsx";
import Bgw from "./views/Bgw.jsx";
import Inspect from "./views/Inspect.jsx";
import Shop from "./views/Shop.jsx";
import Setup from "./views/Setup.jsx";

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

  useEffect(() => {
    const mark = () => { lastAct.current = Date.now(); };
    ["pointerdown", "keydown"].forEach((ev) => document.addEventListener(ev, mark, true));
    const t = setInterval(() => {
      if (lockable && !locked && Date.now() - lastAct.current > (Number(D.settings.lockMinutes) || 5) * 60000) { setLocked(true); closeModal(); }
    }, 15000);
    return () => { ["pointerdown", "keydown"].forEach((ev) => document.removeEventListener(ev, mark, true)); clearInterval(t); };
  }, [lockable, locked, D.settings.lockMinutes, closeModal]);

  const alerts = useMemo(() => allAlerts(D), [D, now]); // eslint-disable-line react-hooks/exhaustive-deps
  const crit = alerts.filter((a) => a.level === "crit").length;
  const salon = setting(D, "salonName");
  const clock = new Date(now).toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit" }) + " · " + hm(now);

  const unlock = () => openModal(
    <PinPad title="Mở khóa chủ tiệm" hint="Nhập mã PIN chủ tiệm (6 số)" length={6} onCancel={closeModal}
      onComplete={async (pin) => {
        const h = await hashPin(pin, D.settings.adminPinSalt || "");
        if (h === D.settings.adminPinHash) { closeModal(); setLocked(false); lastAct.current = Date.now(); location.hash = "#tong-quan"; return true; }
        return false;
      }} />
  );

  if (!D.settings.setupDone) return <Setup />;
  if (lockable && locked) return <LockedScreen salon={salon} clock={clock} onUnlock={unlock} />;

  const Current = NAV.find((n) => n[0] === view)[2];
  return (
    <div className="min-h-screen bg-muted/40 md:grid md:grid-cols-[232px_1fr]">
      <aside className="sticky top-0 z-10 border-b bg-background md:h-screen md:border-r md:border-b-0">
        <div className="flex h-full flex-col gap-4 px-3 pt-3 md:pt-5 md:pb-3">
          <div className="flex items-center justify-between gap-2 px-2">
            <div className="min-w-0">
              <div className="font-semibold">ViBeautySAFE</div>
              <div className="truncate text-xs text-muted-foreground">{salon}</div>
            </div>
            <span className="text-xs tabular-nums text-muted-foreground md:hidden">{clock}</span>
          </div>
          <nav aria-label="Màn hình" className="-mx-3 flex overflow-x-auto px-3 md:mx-0 md:flex-col md:gap-4 md:overflow-visible md:px-0">
            {GROUPS.map(([g, keys]) => (
              <div key={g} className="flex md:flex-col md:gap-0.5">
                <div className="hidden px-2 pb-1 text-xs text-muted-foreground md:block">{g}</div>
                {keys.map((k) => {
                  const active = view === k;
                  return (
                    <a key={k} href={"#" + k} aria-current={active ? "page" : undefined}
                      className={cn("flex items-center justify-between gap-2 whitespace-nowrap px-2 py-2 text-sm md:rounded-md md:py-1.5",
                        active ? "border-b-2 border-foreground font-medium md:border-b-0 md:bg-muted" : "border-b-2 border-transparent text-muted-foreground hover:text-foreground md:border-b-0 md:hover:bg-muted/60")}>
                      <span>{NAV.find((x) => x[0] === k)[1]}</span>
                      {k === "tong-quan" && crit > 0 && <span className="rounded-full bg-destructive px-1.5 text-[11px] leading-[18px] font-semibold text-white">{crit}</span>}
                    </a>
                  );
                })}
              </div>
            ))}
          </nav>
          <div className="mt-auto hidden items-center justify-between gap-2 border-t px-2 pt-3 text-xs text-muted-foreground tabular-nums md:flex">
            <span>{clock}</span>
            {lockable && <Button variant="outline" size="xs" onClick={() => setLocked(true)}>Khóa máy</Button>}
          </div>
        </div>
      </aside>
      <main className="mx-auto flex w-full max-w-6xl min-w-0 flex-col gap-6 px-4 pt-6 md:px-8 md:pt-8">
        <Current alerts={alerts} now={now} />
        <Footer />
      </main>
    </div>
  );
}

function LockedScreen({ salon, clock, onUnlock }) {
  const [kv, setKv] = useState("cham-cong");
  return (
    <div className="min-h-screen bg-muted/40">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b bg-background px-4 py-3 md:px-8">
        <div><div className="font-semibold">{salon}</div><div className="text-xs text-muted-foreground tabular-nums">{clock}</div></div>
        <Tabs value={kv} onChange={setKv} tabs={[["cham-cong", "Chấm công"], ["ve-sinh", "Checklist vệ sinh"]]} />
        <Button variant="outline" onClick={onUnlock}>Mở khóa chủ tiệm</Button>
      </header>
      <main className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-6 md:px-8">
        {kv === "cham-cong" ? <Kiosk /> : <><h1 className="text-2xl font-semibold">Checklist vệ sinh hôm nay</h1><HygChecklist /></>}
        <p className="text-sm text-muted-foreground">Máy đang khóa: chỉ chấm công và checklist vệ sinh. Dữ liệu khác chỉ chủ tiệm mở được.</p>
      </main>
    </div>
  );
}

function Footer() {
  return (
    <footer className="mt-4 pb-8 text-xs text-muted-foreground">
      <Separator className="mb-4" />
      <p><b className="text-foreground">ViBeautySAFE</b> · Phần mềm được phát triển bởi <b>Lee Nhung Nguyen</b>. © 2026 Lee Nhung Nguyen. Bảo lưu mọi quyền; không sao chép, phân phối hoặc dùng lại nội dung và ý tưởng khi chưa có sự đồng ý bằng văn bản.</p>
      <p className="mt-1">Cần tư vấn/hỗ trợ? Email <a className="underline" href="mailto:info@one4allvn.de">info@one4allvn.de</a> · Tel <a className="underline" href="tel:+4917616789999">0176 1678 9999</a></p>
    </footer>
  );
}
