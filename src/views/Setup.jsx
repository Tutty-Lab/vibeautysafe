import { useState } from "react";
import { useStore } from "../store.jsx";
import { SHOP_FIELDS } from "../lib/constants.js";
import { cn } from "../lib/utils.js";
import { Check, Muted, Button, Grid } from "../components/ui.jsx";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { ShopField, PinSettings, pinPatch } from "./Shop.jsx";

const TITLES = ["Tiệm của bạn", "Chủ tiệm và liên hệ", "Mã số doanh nghiệp", "Máy ở quầy"];

export default function Setup() {
  const { D, saveSettings, toast } = useStore();
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
    <div className="flex min-h-screen justify-center bg-muted/40 px-4 py-10">
      <Card className="h-fit w-full max-w-2xl">
        <CardHeader>
          <div className="mb-3 font-semibold">ViBeautySAFE</div>
          <div className="mb-3 grid grid-cols-4 gap-1">{TITLES.map((t, i) => <span key={t} className={cn("h-1 rounded-full", i <= step ? "bg-foreground" : "bg-muted")} />)}</div>
          <CardDescription>Thiết lập lần đầu · Bước {step + 1}/4</CardDescription>
          <CardTitle className="text-xl">{TITLES[step]}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {step < 3 ? (
            <>
              <Grid>{SHOP_FIELDS[step][1].map((f) => <ShopField key={f[0]} f={f} value={d[f[0]]} onChange={on} />)}</Grid>
              {step === 0 && <><Check checked={d.hasSteri} onChange={(x) => on("hasSteri", x)}>Tiệm tự tiệt trùng dụng cụ</Check><Muted>Bang quyết định các yêu cầu vệ sinh áp dụng cho tiệm (ví dụ Hygieneplan bắt buộc ở Baden-Württemberg).</Muted></>}
              {step === 2 && <Muted>Có thể bỏ trống và điền sau. Betriebsnummer cần khi tiệm có nhân viên; Steuerberater thường có số này.</Muted>}
            </>
          ) : (
            <>
              <p className="text-sm">Nếu tiệm dùng máy tính bảng ở quầy để chấm công, hãy đặt mã PIN 6 số của chủ tiệm. Máy quầy sẽ tự khóa, nhân viên chỉ chấm công và đánh dấu checklist.</p>
              <PinSettings v={pin} setV={setPin} />
              <Muted>Có thể bỏ qua và đặt sau trong Thông tin tiệm.</Muted>
            </>
          )}
        </CardContent>
        <CardFooter className="flex gap-2">
          <Button variant="ghost" onClick={() => saveSettings({ ...d, setupDone: true })}>Để sau</Button>
          <span className="flex-1" />
          {step > 0 && <Button variant="outline" onClick={() => setStep(step - 1)}>Quay lại</Button>}
          <Button onClick={next}>{step === 3 ? "Hoàn tất" : "Tiếp tục"}</Button>
        </CardFooter>
      </Card>
    </div>
  );
}
