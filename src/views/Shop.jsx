import { useRef, useState } from "react";
import { useStore } from "../store.jsx";
import { SHOP_FIELDS, ALLF, LAENDER, DEFAULTS } from "../lib/constants.js";
import { setting } from "../lib/logic.js";
import { uid, hashPin, todayKey } from "../lib/utils.js";
import { PageHead, Section, Field, Check, Status, ConfirmButton } from "../components/ui.jsx";
import { isCounter, setCounter } from "../App.jsx";

export function ShopField({ f, value, onChange }) {
  const [k, l, t, req] = f; const label = l + (req ? " *" : "");
  if (t === "service") return <Field label={label}><select value={value === "invasive" ? "invasive" : "nonInvasive"} onChange={(e) => onChange(k, e.target.value)}><option value="nonInvasive">Nails, Kosmetik (không xâm lấn) · Hygiene 8 giờ</option><option value="invasive">PMU, Tattoo (xâm lấn) · Hygiene 40 giờ</option></select></Field>;
  if (t === "land") return <Field label={label}><select value={value || ""} onChange={(e) => onChange(k, e.target.value)}><option value="">Chọn bang…</option>{LAENDER.map((x) => <option key={x}>{x}</option>)}</select></Field>;
  return <Field label={label}><input type={t} min={t === "number" ? 0 : undefined} value={value ?? ""} onChange={(e) => onChange(k, t === "number" ? (e.target.value === "" ? "" : Number(e.target.value)) : e.target.value)} /></Field>;
}

export function PinSettings({ v, setV }) {
  return (
    <div className="grid2">
      <Field label="Mã PIN chủ tiệm mới (6 số)"><input type="password" inputMode="numeric" maxLength={6} autoComplete="new-password" value={v.p1} onChange={(e) => setV({ ...v, p1: e.target.value })} /></Field>
      <Field label="Nhập lại mã PIN"><input type="password" inputMode="numeric" maxLength={6} autoComplete="new-password" value={v.p2} onChange={(e) => setV({ ...v, p2: e.target.value })} /></Field>
      <Field label="Tự khóa sau khi không dùng"><select value={v.lm} onChange={(e) => setV({ ...v, lm: Number(e.target.value) })}>{[2, 5, 10, 15, 30].map((n) => <option key={n} value={n}>{n} phút</option>)}</select></Field>
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
  const { D, raw, saveSettings, toast, loadDemo, wipe, importAll } = useStore();
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
      <PageHead title="Thông tin tiệm">Dùng cho bảng giờ xuất ra và phần Khi bị kiểm tra. Dấu * là mục cần điền.</PageHead>
      {SHOP_FIELDS.map(([g, fs]) => (
        <Section key={g} title={g}><div className="grid2">{fs.map((f) => <ShopField key={f[0]} f={f} value={vals[f[0]]} onChange={on} />)}</div></Section>
      ))}
      <Section title="Quy định">
        <div className="grid2">
          <Field label="Lương tối thiểu (€/giờ)"><input type="number" step="0.01" value={vals.minWage ?? setting(D, "minWage")} onChange={(e) => on("minWage", e.target.value)} /></Field>
          <Field label="Giới hạn Minijob (€/tháng)"><input type="number" step="1" value={vals.minijobLimit ?? setting(D, "minijobLimit")} onChange={(e) => on("minijobLimit", e.target.value)} /></Field>
        </div>
        <Check checked={vals.hasSteri} onChange={(x) => on("hasSteri", x)}>Tiệm tự tiệt trùng dụng cụ (có máy tiệt trùng)</Check>
        <p className="muted small">Mặc định năm 2026: 13,90 €/giờ và 603 €/tháng. Cập nhật khi luật thay đổi.</p>
      </Section>
      <div className="actions"><span className="grow" /><button className="btn primary" onClick={saveShop}>Lưu thông tin tiệm</button></div>

      <Section title="Máy ở quầy và mã PIN chủ tiệm">
        <p className="muted small">Khi khóa, máy ở quầy chỉ còn chấm công và checklist vệ sinh; mở khóa cần mã PIN 6 số của chủ tiệm. Máy tự khóa khi không ai dùng.</p>
        <div className="tally">
          {D.settings.adminPinHash ? <Status level="ok">Đã đặt mã PIN chủ tiệm</Status> : <Status level="warn">Chưa đặt mã PIN chủ tiệm</Status>}
          {isCounter() ? <Status level="live">Máy này là máy ở quầy</Status> : <Status level="na">Máy này không phải máy quầy</Status>}
        </div>
        <PinSettings v={pin} setV={setPin} />
        <div className="actions"><span className="muted small grow">Mã PIN để chặn người đứng ở quầy, không phải bảo mật tuyệt đối. Đừng dùng trùng mã ngân hàng.</span><button className="btn" onClick={savePin}>Lưu cài đặt máy quầy</button></div>
      </Section>

      <Section title="Dữ liệu">
        <p className="muted small">Dữ liệu chỉ lưu trong trình duyệt của máy này, không tự đồng bộ sang máy khác. Hãy dùng một máy cố định cho tiệm, sao lưu thường xuyên và xuất bảng giờ (CSV) hằng tháng.</p>
        <div className="row">
          <button className="btn" onClick={backup}>Tải bản sao lưu (.json)</button>
          <button className="btn" onClick={() => fileRef.current.click()}>Khôi phục từ tệp</button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => restore(e.target.files[0])} />
          <span className="grow" />
          <ConfirmButton className="btn" confirmText="Bấm lần nữa: thay toàn bộ bằng demo" onConfirm={() => { loadDemo(); toast("Đã nạp dữ liệu demo"); }}>Nạp dữ liệu demo</ConfirmButton>
          <ConfirmButton confirmText="Bấm lần nữa: xóa hết dữ liệu" onConfirm={() => { wipe(); setCounter(false); }}>Xóa toàn bộ dữ liệu</ConfirmButton>
        </div>
      </Section>
    </>
  );
}
