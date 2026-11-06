import { useState } from "react";
import { useStore } from "../store.jsx";
import { staffList } from "../lib/logic.js";
import { ROLES, CONTRACTS } from "../lib/constants.js";
import { eur, uid } from "../lib/utils.js";
import { PageHead, Empty, Status, ExpStatus, ModalHead, Field, Select, Check, ConfirmButton, Muted, TableBox, Actions, Button, Grid } from "../components/ui.jsx";
import { Input } from "@/components/ui/input";
import { TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";

export default function Staff() {
  const { D, openModal } = useStore();
  const st = staffList(D, true);
  const open = (sid) => openModal(<StaffForm sid={sid} />);
  return (
    <>
      <PageHead title="Nhân viên" actions={<Button onClick={() => open(null)}>Thêm nhân viên</Button>}>
        Hồ sơ mà Zoll thường hỏi: giấy tờ tùy thân, giấy phép cư trú, hợp đồng, đăng ký bảo hiểm, mức lương.
      </PageHead>
      {st.length ? (
        <TableBox>
          <TableHeader><TableRow><TableHead>Tên</TableHead><TableHead>Hợp đồng</TableHead><TableHead className="text-right">Lương</TableHead><TableHead>Ausweis</TableHead><TableHead>Aufenthaltstitel</TableHead><TableHead>HĐ ký</TableHead><TableHead>Bảo hiểm</TableHead></TableRow></TableHeader>
          <TableBody>{st.map((s) => (
            <TableRow key={s.id} className="cursor-pointer" onClick={() => open(s.id)}>
              <TableCell><div className="font-medium">{s.name}{s.active === false && <Status level="na">Đã nghỉ</Status>}</div><div className="text-xs text-muted-foreground">{s.role}</div></TableCell>
              <TableCell>{s.contract || "—"}</TableCell>
              <TableCell className="text-right tabular-nums">{eur(Number(s.rate))}{s.payType === "hour" ? "/giờ" : "/tháng"}</TableCell>
              <TableCell><ExpStatus value={s.idExp} /></TableCell>
              <TableCell>{s.permitNA ? <Status level="na">Không cần (EU)</Status> : <ExpStatus value={s.permitExp} />}</TableCell>
              <TableCell>{s.hasContract ? <Status level="ok">Có</Status> : <Status level="crit">Thiếu</Status>}</TableCell>
              <TableCell>{s.registered ? <Status level="ok">Đã đăng ký</Status> : <Status level="crit">Chưa</Status>}</TableCell>
            </TableRow>))}</TableBody>
        </TableBox>
      ) : <Empty>Chưa có nhân viên nào. Bấm “Thêm nhân viên” để bắt đầu.</Empty>}
    </>
  );
}

export function StaffForm({ sid }) {
  const { D, put, remove, toast, closeModal } = useStore();
  const [s, setS] = useState(() => (sid ? { ...D.staff[sid] } : { id: uid(), name: "", role: ROLES[0], contract: "Minijob", payType: "hour", rate: 13.9, pin: String(Math.floor(1000 + Math.random() * 9000)), active: true, feucht: "lt2" }));
  const f = (k) => (v) => setS((o) => ({ ...o, [k]: v }));
  const inp = (k, type = "text", extra = {}) => <Input type={type} value={s[k] ?? ""} onChange={(e) => f(k)(e.target.value)} {...extra} />;

  const save = () => {
    const name = (s.name || "").trim(); const pin = String(s.pin || "").trim();
    if (!name) { toast("Hãy nhập họ tên"); return; }
    if (!/^\d{4}$/.test(pin)) { toast("Mã PIN cần đúng 4 chữ số"); return; }
    if (Object.values(D.staff).some((o) => o.id !== s.id && o.active !== false && String(o.pin) === pin)) { toast("Mã PIN này đã có người dùng"); return; }
    put("staff", s.id, { ...s, name, pin, rate: Number(s.rate) || 0, updatedAt: Date.now() });
    closeModal(); toast("Đã lưu hồ sơ " + name);
  };

  return (
    <>
      <ModalHead title={sid ? "Sửa hồ sơ" : "Thêm nhân viên"} />
      <Grid>
        <Field label="Họ tên">{inp("name")}</Field>
        <Field label="Vai trò"><Select value={s.role} onChange={f("role")}>{ROLES.map((x) => <option key={x}>{x}</option>)}</Select></Field>
        <Field label="Loại hợp đồng"><Select value={s.contract} onChange={f("contract")}>{CONTRACTS.map((x) => <option key={x}>{x}</option>)}</Select></Field>
        <Field label="Ngày bắt đầu làm">{inp("start", "date")}</Field>
        <Field label="Trả lương theo"><Select value={s.payType} onChange={f("payType")}><option value="hour">Giờ (€/giờ)</option><option value="month">Tháng (€/tháng)</option></Select></Field>
        <Field label="Mức lương (€)">{inp("rate", "number", { step: "0.01", min: "0" })}</Field>
        <Field label="Mã PIN chấm công (4 số)">{inp("pin", "text", { inputMode: "numeric", maxLength: 4 })}</Field>
        <Field label="Ausweis / Pass hết hạn">{inp("idExp", "date")}</Field>
        <Field label="Aufenthaltstitel hết hạn">{inp("permitExp", "date")}</Field>
        <Field label="Hợp đồng có thời hạn đến (nếu có)">{inp("contractExp", "date")}</Field>
        <Field label="Huấn luyện an toàn gần nhất (Unterweisung)">{inp("unterweisung", "date")}</Field>
        <Field label="Làm việc ẩm mỗi ngày"><Select value={s.feucht || "lt2"} onChange={f("feucht")}><option value="lt2">Dưới 2 giờ</option><option value="2to4">Trên 2 đến dưới 4 giờ</option><option value="ge4">Từ 4 giờ trở lên</option></Select></Field>
        <Field label="Khám sức khỏe lao động (Vorsorge)">{inp("vorsorge", "date")}</Field>
      </Grid>
      <div className="flex flex-col gap-2.5">
        <Check checked={s.permitNA} onChange={f("permitNA")}>Công dân EU / không cần giấy phép cư trú</Check>
        <Check checked={s.hasContract} onChange={f("hasContract")}>Đã có hợp đồng lao động ký bằng văn bản</Check>
        <Check checked={s.registered} onChange={f("registered")}>Đã đăng ký bảo hiểm (Minijob-Zentrale / Krankenkasse)</Check>
        <Check checked={s.active !== false} onChange={f("active")}>Đang làm việc tại tiệm</Check>
      </div>
      <Field label="Ghi chú nội bộ">{inp("note", "text", { maxLength: 200 })}</Field>
      <Muted>Mã PIN chỉ để phân biệt người chấm công trên máy ở quầy, không phải mật khẩu bảo mật.</Muted>
      <Actions>
        {sid && <ConfirmButton confirmText="Bấm lần nữa để xóa" onConfirm={() => { remove("staff", sid); closeModal(); toast("Đã xóa hồ sơ"); }}>Xóa hồ sơ</ConfirmButton>}
        <span className="flex-1" />
        <Button variant="outline" onClick={closeModal}>Hủy</Button><Button onClick={save}>Lưu</Button>
      </Actions>
    </>
  );
}
