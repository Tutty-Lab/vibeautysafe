import { useState } from "react";
import { useStore } from "../store.jsx";
import { staffList } from "../lib/logic.js";
import { ROLES, CONTRACTS } from "../lib/constants.js";
import { eur, uid } from "../lib/utils.js";
import { PageHead, Empty, Status, ExpStatus, ModalHead, Field, Check, ConfirmButton } from "../components/ui.jsx";

export default function Staff() {
  const { D, openModal } = useStore();
  const st = staffList(D, true);
  const open = (sid) => openModal(<StaffForm sid={sid} />);
  return (
    <>
      <PageHead title="Nhân viên" actions={<button className="btn primary" onClick={() => open(null)}>Thêm nhân viên</button>}>
        Hồ sơ mà Zoll thường hỏi: giấy tờ tùy thân, giấy phép cư trú, hợp đồng, đăng ký bảo hiểm, mức lương.
      </PageHead>
      {st.length ? (
        <div className="table-wrap"><table>
          <thead><tr><th>Tên</th><th>Hợp đồng</th><th className="num">Lương</th><th>Ausweis</th><th>Aufenthaltstitel</th><th>HĐ ký</th><th>Bảo hiểm</th></tr></thead>
          <tbody>{st.map((s) => (
            <tr key={s.id} className="click" onClick={() => open(s.id)}>
              <td><b>{s.name}</b>{s.example && <span className="tag">Ví dụ</span>}{s.active === false && <span className="tag">Đã nghỉ</span>}<div className="muted small">{s.role}</div></td>
              <td>{s.contract || "—"}</td>
              <td className="num">{eur(Number(s.rate))}{s.payType === "hour" ? "/giờ" : "/tháng"}</td>
              <td><ExpStatus value={s.idExp} /></td>
              <td>{s.permitNA ? <Status level="na">Không cần (EU)</Status> : <ExpStatus value={s.permitExp} />}</td>
              <td>{s.hasContract ? <Status level="ok">Có</Status> : <Status level="crit">Thiếu</Status>}</td>
              <td>{s.registered ? <Status level="ok">Đã đăng ký</Status> : <Status level="crit">Chưa</Status>}</td>
            </tr>))}</tbody>
        </table></div>
      ) : <Empty>Chưa có nhân viên nào. Bấm “Thêm nhân viên” để bắt đầu.</Empty>}
    </>
  );
}

export function StaffForm({ sid }) {
  const { D, put, remove, toast, closeModal } = useStore();
  const [s, setS] = useState(() => (sid ? { ...D.staff[sid] } : { id: uid(), name: "", role: ROLES[0], contract: "Minijob", payType: "hour", rate: 13.9, pin: String(Math.floor(1000 + Math.random() * 9000)), active: true, feucht: "lt2" }));
  const f = (k) => (v) => setS((o) => ({ ...o, [k]: v }));
  const inp = (k, type = "text", extra = {}) => <input type={type} value={s[k] ?? ""} onChange={(e) => f(k)(e.target.value)} {...extra} />;

  const save = () => {
    const name = (s.name || "").trim(); const pin = String(s.pin || "").trim();
    if (!name) { toast("Hãy nhập họ tên"); return; }
    if (!/^\d{4}$/.test(pin)) { toast("Mã PIN cần đúng 4 chữ số"); return; }
    if (Object.values(D.staff).some((o) => o.id !== s.id && o.active !== false && String(o.pin) === pin)) { toast("Mã PIN này đã có người dùng"); return; }
    put("staff", s.id, { ...s, name, pin, rate: Number(s.rate) || 0, example: s.example || false, updatedAt: Date.now() });
    closeModal(); toast("Đã lưu hồ sơ " + name);
  };

  return (
    <>
      <ModalHead title={sid ? "Sửa hồ sơ" : "Thêm nhân viên"} />
      <div className="grid2">
        <Field label="Họ tên">{inp("name")}</Field>
        <Field label="Vai trò"><select value={s.role} onChange={(e) => f("role")(e.target.value)}>{ROLES.map((x) => <option key={x}>{x}</option>)}</select></Field>
        <Field label="Loại hợp đồng"><select value={s.contract} onChange={(e) => f("contract")(e.target.value)}>{CONTRACTS.map((x) => <option key={x}>{x}</option>)}</select></Field>
        <Field label="Ngày bắt đầu làm">{inp("start", "date")}</Field>
        <Field label="Trả lương theo"><select value={s.payType} onChange={(e) => f("payType")(e.target.value)}><option value="hour">Giờ (€/giờ)</option><option value="month">Tháng (€/tháng)</option></select></Field>
        <Field label="Mức lương (€)">{inp("rate", "number", { step: "0.01", min: "0" })}</Field>
        <Field label="Mã PIN chấm công (4 số)">{inp("pin", "text", { inputMode: "numeric", maxLength: 4 })}</Field>
        <Field label="Ausweis / Pass hết hạn">{inp("idExp", "date")}</Field>
        <Field label="Aufenthaltstitel hết hạn">{inp("permitExp", "date")}</Field>
        <Field label="Hợp đồng có thời hạn đến (nếu có)">{inp("contractExp", "date")}</Field>
        <Field label="Huấn luyện an toàn gần nhất (Unterweisung)">{inp("unterweisung", "date")}</Field>
        <Field label="Làm việc ẩm mỗi ngày"><select value={s.feucht || "lt2"} onChange={(e) => f("feucht")(e.target.value)}><option value="lt2">Dưới 2 giờ</option><option value="2to4">Trên 2 đến dưới 4 giờ</option><option value="ge4">Từ 4 giờ trở lên</option></select></Field>
        <Field label="Khám sức khỏe lao động (Vorsorge)">{inp("vorsorge", "date")}</Field>
      </div>
      <div className="checks">
        <Check checked={s.permitNA} onChange={f("permitNA")}>Công dân EU / không cần giấy phép cư trú</Check>
        <Check checked={s.hasContract} onChange={f("hasContract")}>Đã có hợp đồng lao động ký bằng văn bản</Check>
        <Check checked={s.registered} onChange={f("registered")}>Đã đăng ký bảo hiểm (Minijob-Zentrale / Krankenkasse)</Check>
        <Check checked={s.active !== false} onChange={f("active")}>Đang làm việc tại tiệm</Check>
      </div>
      <Field label="Ghi chú nội bộ">{inp("note", "text", { maxLength: 200 })}</Field>
      <p className="muted small">Mã PIN chỉ để phân biệt người chấm công trên máy ở quầy, không phải mật khẩu bảo mật.</p>
      <div className="actions">
        {sid && <ConfirmButton confirmText="Bấm lần nữa để xóa" onConfirm={() => { remove("staff", sid); closeModal(); toast("Đã xóa hồ sơ"); }}>Xóa hồ sơ</ConfirmButton>}
        <span className="grow" />
        <button className="btn" onClick={closeModal}>Hủy</button><button className="btn primary" onClick={save}>Lưu</button>
      </div>
    </>
  );
}
