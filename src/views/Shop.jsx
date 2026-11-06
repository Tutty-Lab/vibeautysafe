import { useRef, useState } from "react";
import { useStore } from "../store.jsx";
import { SHOP_FIELDS, ALLF, LAENDER, DEFAULTS } from "../lib/constants.js";
import { setting } from "../lib/logic.js";
import { uid, hashPin, todayKey } from "../lib/utils.js";
import { PageHead, Section, Field, Select, Check, Status, ConfirmButton, Muted, Button, Grid, Panel } from "../components/ui.jsx";
import { Input } from "@/components/ui/input";
import { isCounter, setCounter } from "../App.jsx";

export function ShopField({ f, value, onChange }) {
  const [k, l, t, req] = f; const label = l + (req ? " *" : "");
  if (t === "service") return <Field label={label}><Select value={value === "invasive" ? "invasive" : "nonInvasive"} onChange={(v) => onChange(k, v)}><option value="nonInvasive">Nails, Kosmetik (không xâm lấn) · Hygiene 8 giờ</option><option value="invasive">PMU, Tattoo (xâm lấn) · Hygiene 40 giờ</option></Select></Field>;
  if (t === "land") return <Field label={label}><Select value={value || ""} onChange={(v) => onChange(k, v)}><option value="">Chọn bang…</option>{LAENDER.map((x) => <option key={x}>{x}</option>)}</Select></Field>;
  return <Field label={label}><Input type={t} min={t === "number" ? 0 : undefined} value={value ?? ""} onChange={(e) => onChange(k, t === "number" ? (e.target.value === "" ? "" : Number(e.target.value)) : e.target.value)} /></Field>;
}

export function PinSettings({ v, setV }) {
  return (
    <div className="flex flex-col gap-4">
      <Grid>
        <Field label="Mã PIN chủ tiệm mới (6 số)"><Input type="password" inputMode="numeric" maxLength={6} autoComplete="new-password" value={v.p1} onChange={(e) => setV({ ...v, p1: e.target.value })} /></Field>
        <Field label="Nhập lại mã PIN"><Input type="password" inputMode="numeric" maxLength={6} autoComplete="new-password" value={v.p2} onChange={(e) => setV({ ...v, p2: e.target.value })} /></Field>
        <Field label="Tự khóa sau khi không dùng"><Select value={String(v.lm)} onChange={(x) => setV({ ...v, lm: Number(x) })}>{[2, 5, 10, 15, 30].map((n) => <option key={n} value={n}>{n} phút</option>)}</Select></Field>
      </Grid>
      <Check checked={v.ctr} onChange={(x) => setV({ ...v, ctr: x })}>Máy này là máy ở quầy (chỉ áp dụng cho trình duyệt này)</Check>
    </div>
  );
}

/* returns patch object or null (on validation error) */
export async function pinPatch(v, current, toast) {
  const patch = { lockMinutes: v.lm };
  const p1 = v.p1.trim(), p2 = v.p2.trim();
  if (p1 || p2) {
    if (!/^\d{6}$/.test(p1)) { toast("Mã PIN cần đúng 6 chữ số"); return null; }
    if (p1 !== p2) { toast("Hai mã PIN không khớp"); return null; }
    const salt = uid(); patch.adminPinSalt = salt; patch.adminPinHash = await hashPin(p1, salt);
  }
  if (v.ctr && !(patch.adminPinHash || current.adminPinHash)) { toast("Hãy đặt mã PIN chủ tiệm trước khi bật chế độ máy quầy"); return null; }
  setCounter(v.ctr);
  return patch;
}

export default function Shop() {
  const { D, raw, saveSettings, toast, wipe, importAll } = useStore();
  const [vals, setVals] = useState(() => ({ ...D.settings }));
  const [pin, setPin] = useState({ p1: "", p2: "", lm: Number(D.settings.lockMinutes) || 5, ctr: isCounter() });
  const fileRef = useRef(null);
  const on = (k, v) => setVals((o) => ({ ...o, [k]: v }));

  const saveShop = () => {
    const out = {}; ALLF.forEach(([k, , t]) => { const v = vals[k]; out[k] = typeof v === "string" && t !== "number" ? v.trim() : v ?? ""; });
    if (!out.salonName) { toast("Hãy nhập tên tiệm"); return; }
    if (out.betriebsnummer && !/^\d{8}$/.test(out.betriebsnummer)) { toast("Betriebsnummer gồm 8 chữ số"); return; }
    saveSettings({ ...out, minWage: Number(vals.minWage) || DEFAULTS.minWage, minijobLimit: Number(vals.minijobLimit) || DEFAULTS.minijobLimit, hasSteri: !!vals.hasSteri, setupDone: true });
    toast("Đã lưu thông tin tiệm");
  };
  const savePin = async () => { const p = await pinPatch(pin, D.settings, toast); if (p) { saveSettings(p); setPin({ ...pin, p1: "", p2: "" }); toast("Đã lưu cài đặt máy quầy"); } };

  const backup = () => {
    const u = URL.createObjectURL(new Blob([JSON.stringify(raw, null, 1)], { type: "application/json" }));
    const a = document.createElement("a"); a.href = u; a.download = "ViBeautySAFE_sao-luu_" + todayKey() + ".json"; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(u), 3000);
  };
  const restore = (file) => {
    if (!file) return;
    file.text().then((t) => { const o = JSON.parse(t); if (!o || typeof o !== "object" || !o.settings) throw new Error(); importAll(o); toast("Đã khôi phục dữ liệu"); setTimeout(() => location.reload(), 400); })
      .catch(() => toast("Tệp sao lưu không hợp lệ"));
  };

  return (
    <>
      <PageHead title="Thông tin tiệm" actions={<Button onClick={saveShop}>Lưu thông tin tiệm</Button>}>Dùng cho bảng giờ xuất ra và phần Khi bị kiểm tra. Dấu * là mục cần điền.</PageHead>
      {SHOP_FIELDS.map(([g, fs]) => (
        <Section key={g} title={g}><Panel><Grid>{fs.map((f) => <ShopField key={f[0]} f={f} value={vals[f[0]]} onChange={on} />)}</Grid></Panel></Section>
      ))}
      <Section title="Quy định">
        <Panel className="flex flex-col gap-4">
          <Grid>
            <Field label="Lương tối thiểu (€/giờ)"><Input type="number" step="0.01" value={vals.minWage ?? setting(D, "minWage")} onChange={(e) => on("minWage", e.target.value)} /></Field>
            <Field label="Giới hạn Minijob (€/tháng)"><Input type="number" step="1" value={vals.minijobLimit ?? setting(D, "minijobLimit")} onChange={(e) => on("minijobLimit", e.target.value)} /></Field>
          </Grid>
          <Check checked={vals.hasSteri} onChange={(x) => on("hasSteri", x)}>Tiệm tự tiệt trùng dụng cụ (có máy tiệt trùng)</Check>
          <Muted>Mặc định năm 2026: 13,90 €/giờ và 603 €/tháng. Cập nhật khi luật thay đổi.</Muted>
        </Panel>
      </Section>
      <div className="flex justify-end"><Button onClick={saveShop}>Lưu thông tin tiệm</Button></div>

      <Section title="Máy ở quầy và mã PIN chủ tiệm">
        <Panel className="flex flex-col gap-4">
          <Muted>Khi khóa, máy ở quầy chỉ còn chấm công và checklist vệ sinh; mở khóa cần mã PIN 6 số của chủ tiệm. Máy tự khóa khi không ai dùng.</Muted>
          <div className="flex flex-wrap gap-2">
            {D.settings.adminPinHash ? <Status level="ok">Đã đặt mã PIN chủ tiệm</Status> : <Status level="warn">Chưa đặt mã PIN chủ tiệm</Status>}
            {isCounter() ? <Status level="live">Máy này là máy ở quầy</Status> : <Status level="na">Máy này không phải máy quầy</Status>}
          </div>
          <PinSettings v={pin} setV={setPin} />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Muted>Mã PIN để chặn người đứng ở quầy, không phải bảo mật tuyệt đối. Đừng dùng trùng mã ngân hàng.</Muted>
            <Button variant="outline" onClick={savePin}>Lưu cài đặt máy quầy</Button>
          </div>
        </Panel>
      </Section>

      <Section title="Dữ liệu">
        <Panel className="flex flex-col gap-4">
          <Muted>Dữ liệu chỉ lưu trong trình duyệt của máy này, không tự đồng bộ sang máy khác. Hãy dùng một máy cố định cho tiệm, sao lưu thường xuyên và xuất bảng giờ (CSV) hằng tháng.</Muted>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={backup}>Tải bản sao lưu (.json)</Button>
            <Button variant="outline" onClick={() => fileRef.current.click()}>Khôi phục từ tệp</Button>
            <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => restore(e.target.files[0])} />
            <span className="flex-1" />
            <ConfirmButton confirmText="Bấm lần nữa: xóa hết dữ liệu" onConfirm={() => { wipe(); setCounter(false); }}>Xóa toàn bộ dữ liệu</ConfirmButton>
          </div>
        </Panel>
      </Section>
    </>
  );
}
