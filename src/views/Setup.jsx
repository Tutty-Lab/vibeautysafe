import { useState } from "react";
import { useStore } from "../store.jsx";
import { SHOP_FIELDS } from "../lib/constants.js";
import { Check } from "../components/ui.jsx";
import { ShopField, PinSettings, pinPatch } from "./Shop.jsx";

const TITLES = ["Tiệm của bạn", "Chủ tiệm và liên hệ", "Mã số doanh nghiệp", "Máy ở quầy"];

export default function Setup() {
  const { D, saveSettings, loadDemo, toast } = useStore();
  const [step, setStep] = useState(0);
  const [d, setD] = useState(() => ({ ...D.settings }));
  const [pin, setPin] = useState({ p1: "", p2: "", lm: 5, ctr: false });
  const on = (k, v) => setD((o) => ({ ...o, [k]: v }));

  const next = async () => {
    if (step === 0 && !(d.salonName || "").trim()) { toast("Hãy nhập tên tiệm"); return; }
    if (step === 0 && !d.land) { toast("Hãy chọn bang"); return; }
    if (step === 1 && !(d.ownerName || "").trim()) { toast("Hãy nhập họ tên chủ tiệm"); return; }
    if (step === 2 && d.betriebsnummer && !/^\d{8}$/.test(d.betriebsnummer)) { toast("Betriebsnummer gồm 8 chữ số"); return; }
    if (step < 3) { setStep(step + 1); return; }
    const p = await pinPatch(pin, D.settings, toast); if (!p) return;
    saveSettings({ ...d, ...p, setupDone: true }); location.hash = "#tong-quan";
    toast("Thiết lập xong. Chào mừng đến ViBeautySAFE!");
  };

  return (
    <div className="setup">
      <main className="setup-main">
        <div className="setup-top">
          <div className="brand-name">ViBeauty<b>SAFE</b></div>
          <button className="btn sm" onClick={() => { loadDemo(); location.hash = "#tong-quan"; }}>Xem bản demo</button>
        </div>
        <div className="setup-progress">{TITLES.map((t, i) => <span key={t} className={i <= step ? "on" : ""} />)}</div>
        <div className="kicker">Thiết lập lần đầu · Bước {step + 1}/4</div>
        <h2 className="h-display">{TITLES[step]}</h2>
        {step < 3 ? (
          <>
            <div className="grid2">{SHOP_FIELDS[step][1].map((f) => <ShopField key={f[0]} f={f} value={d[f[0]]} onChange={on} />)}</div>
            {step === 0 && <><Check checked={d.hasSteri} onChange={(x) => on("hasSteri", x)}>Tiệm tự tiệt trùng dụng cụ</Check><p className="muted small">Bang quyết định các yêu cầu vệ sinh áp dụng cho tiệm (ví dụ Hygieneplan bắt buộc ở Baden-Württemberg).</p></>}
            {step === 2 && <p className="muted small">Có thể bỏ trống và điền sau. Betriebsnummer cần khi tiệm có nhân viên; Steuerberater thường có số này.</p>}
          </>
        ) : (
          <>
            <p>Nếu tiệm dùng máy tính bảng ở quầy để chấm công, hãy đặt mã PIN 6 số của chủ tiệm. Máy quầy sẽ tự khóa, nhân viên chỉ chấm công và đánh dấu checklist.</p>
            <PinSettings v={pin} setV={setPin} />
            <p className="muted small">Có thể bỏ qua và đặt sau trong Thông tin tiệm.</p>
          </>
        )}
        <div className="actions">
          <button className="btn ghost" onClick={() => saveSettings({ ...d, setupDone: true })}>Để sau</button>
          <span className="grow" />
          {step > 0 && <button className="btn" onClick={() => setStep(step - 1)}>Quay lại</button>}
          <button className="btn primary" onClick={next}>{step === 3 ? "Hoàn tất" : "Tiếp tục"}</button>
        </div>
      </main>
    </div>
  );
}
