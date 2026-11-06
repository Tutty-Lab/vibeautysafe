import { useState } from "react";
import { useStore } from "../store.jsx";
import { staffList, monthStats, payFor, wageChecks, segsFor, exportMonthCsv } from "../lib/logic.js";
import { monthKey, monthLabel, monthOptions, hours, eur, deDate, hm, durTxt, initials, todayKey } from "../lib/utils.js";
import { PageHead, Empty, Status, Row, ModalHead, Field } from "../components/ui.jsx";
import { dayDoc } from "./Kiosk.jsx";

export default function Timesheet() {
  const { D, toast, openModal } = useStore();
  const [m, setM] = useState(monthKey(new Date()));
  const [detail, setDetail] = useState(null);
  const st = staffList(D, true).filter((s) => s.active !== false || monthStats(D, s.id, m).days);

  const head = (
    <PageHead title="Bảng giờ" actions={<>
      <select value={m} onChange={(e) => setM(e.target.value)} aria-label="Chọn tháng">{monthOptions().map((x) => <option key={x} value={x}>{monthLabel(x)}</option>)}</select>
      <button className="btn primary" onClick={() => toast("Đã lưu " + exportMonthCsv(D, m))}>Xuất CSV</button>
    </>}>Arbeitszeitnachweis theo § 17 MiLoG. Mỗi lần sửa giờ đều ghi lý do.</PageHead>
  );

  if (detail && D.staff[detail]) {
    const s = D.staff[detail]; const x = monthStats(D, detail, m); const w = wageChecks(D, s, m, x);
    const edit = (date) => openModal(<EditDay sid={detail} date={date} />);
    return (
      <>
        {head}
        <button className="btn ghost back" onClick={() => setDetail(null)}>← Tất cả nhân viên</button>
        <div className="card person-head">
          <span className="avatar">{initials(s.name)}</span>
          <div className="grow"><h2 className="h-plain">{s.name}</h2><div className="muted small">{s.contract} · {hours(x.min)} giờ · {eur(payFor(s, x.min))}</div></div>
          <button className="btn" onClick={() => edit(m === monthKey(new Date()) ? todayKey() : m + "-01")}>Thêm ngày làm</button>
        </div>
        {w.length > 0 && <div className="lines">{w.map((q, i) => <Row key={i} level={q.level} title={q.t} />)}</div>}
        {x.rows.length ? (
          <div className="table-wrap"><table>
            <thead><tr><th>Ngày</th><th className="num">Beginn</th><th className="num">Ende</th><th className="num">Pause</th><th className="num">Dauer</th><th>Ghi chú</th><th /></tr></thead>
            <tbody>{x.rows.map((r) => (
              <tr key={r.date}>
                <td className="mono">{deDate(r.date)}</td><td className="num">{hm(r.first)}</td><td className="num">{hm(r.last)}</td>
                <td className="num">{Math.round(r.pause)} min</td><td className="num">{durTxt(r.work)}</td>
                <td className="wrap">{r.flags.length ? r.flags.map((f, i) => <Status key={i} level={f.level}>{f.t}</Status>) : <Status level="ok">Ổn</Status>}</td>
                <td><button className="btn ghost sm" onClick={() => edit(r.date)}>Sửa</button></td>
              </tr>))}</tbody>
          </table></div>
        ) : <Empty>Không có giờ làm trong {monthLabel(m).toLowerCase()}.</Empty>}
      </>
    );
  }

  return (
    <>
      {head}
      {!st.length ? <Empty>Chưa có nhân viên.</Empty> : (
        <div className="table-wrap"><table>
          <thead><tr><th>Nhân viên</th><th>Hợp đồng</th><th className="num">Ngày</th><th className="num">Giờ</th><th className="num">Lương dự tính</th><th className="num">€/giờ thực tế</th><th>Trạng thái</th></tr></thead>
          <tbody>{st.map((s) => {
            const x = monthStats(D, s.id, m); const pay = payFor(s, x.min); const eff = x.min ? pay / (x.min / 60) : null; const w = wageChecks(D, s, m, x);
            const fl = x.rows.reduce((a, r) => a + r.flags.length, 0) + x.open;
            const lv = w.some((q) => q.level === "crit") ? "crit" : w.length || fl ? "warn" : "ok";
            return (
              <tr key={s.id} className="click" onClick={() => setDetail(s.id)}>
                <td><b>{s.name}</b>{s.example && <span className="tag">Ví dụ</span>}</td><td>{s.contract || "—"}</td>
                <td className="num">{x.days}</td><td className="num">{hours(x.min)}</td><td className="num">{eur(pay)}</td><td className="num">{eff ? eur(eff) : "—"}</td>
                <td><Status level={lv}>{lv === "ok" ? "Ổn" : lv === "crit" ? "Cần xử lý" : w.length + fl + " lưu ý"}</Status></td>
              </tr>);
          })}</tbody>
        </table></div>
      )}
      <p className="muted small">Lương dự tính dựa trên mức lương trong hồ sơ, chỉ để kiểm tra mức tối thiểu; không thay thế bảng lương của Steuerberater.</p>
    </>
  );
}

function EditDay({ sid, date }) {
  const { D, put, toast, closeModal } = useStore();
  const s = D.staff[sid];
  const [segs, setSegs] = useState(() => segsFor(D, sid, date).map((g) => ({ in: g.in ? hm(g.in) : "", out: g.out ? hm(g.out) : "" })));
  const [nd, setNd] = useState(date);
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const upd = (i, k, v) => setSegs(segs.map((g, j) => (j === i ? { ...g, [k]: v } : g)));

  const save = () => {
    if (!reason) { toast("Hãy chọn lý do sửa"); return; }
    const day = nd || date; const base = new Date(day + "T00:00:00");
    const parse = (t) => { if (!t) return null; const [h, mi] = t.split(":").map(Number); const d = new Date(base); d.setHours(h, mi, 0, 0); return d.getTime(); };
    const next = [];
    for (const g of segs) {
      const i = parse(g.in), o = parse(g.out);
      if (i == null) { toast("Mỗi đoạn cần có giờ vào"); return; }
      if (o != null && o <= i) { toast("Giờ ra phải sau giờ vào"); return; }
      next.push({ in: i, out: o, end: "pause" });
    }
    next.sort((a, b) => a.in - b.in); if (next.length) next[next.length - 1].end = "out";
    const before = segsFor(D, sid, date).map((g) => hm(g.in) + "-" + hm(g.out)).join(", ");
    const logEntry = { at: Date.now(), staff: sid, reason, note: note.slice(0, 140), before, after: next.map((g) => hm(g.in) + "-" + hm(g.out)).join(", ") };
    if (day !== date) { const od = dayDoc(D, date); delete od.entries[sid]; od.log.push(logEntry); put("days", date, od); }
    const d2 = dayDoc(D, day); if (next.length) d2.entries[sid] = next; else delete d2.entries[sid]; d2.log.push(logEntry);
    put("days", day, d2); closeModal(); toast("Đã lưu giờ làm và lý do sửa");
  };

  return (
    <>
      <ModalHead title={"Sửa giờ: " + s.name} />
      <Field label="Ngày"><input type="date" value={nd} onChange={(e) => setNd(e.target.value)} /></Field>
      <div className="stack-s">
        {segs.length ? segs.map((g, i) => (
          <div className="seg-row" key={i}>
            <Field label="Vào"><input type="time" value={g.in} onChange={(e) => upd(i, "in", e.target.value)} /></Field>
            <Field label="Ra"><input type="time" value={g.out} onChange={(e) => upd(i, "out", e.target.value)} /></Field>
            <button className="btn ghost danger sm" onClick={() => setSegs(segs.filter((_, j) => j !== i))}>Xóa</button>
          </div>
        )) : <p className="muted small">Không có đoạn nào; lưu sẽ xóa giờ làm của ngày này.</p>}
      </div>
      <button className="btn" onClick={() => setSegs([...segs, { in: "", out: "" }])}>Thêm đoạn làm việc</button>
      <p className="muted small">Khoảng trống giữa các đoạn được tính là giờ nghỉ.</p>
      <Field label="Lý do sửa (bắt buộc)"><select value={reason} onChange={(e) => setReason(e.target.value)}><option value="">Chọn lý do…</option><option>Quên chấm công</option><option>Chấm nhầm giờ</option><option>Máy hỏng / mất mạng</option><option>Khác</option></select></Field>
      <Field label="Ghi chú"><input maxLength={140} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ví dụ: quên chấm ra ca, đã xác nhận với nhân viên" /></Field>
      <div className="actions"><button className="btn" onClick={closeModal}>Hủy</button><button className="btn primary" onClick={save}>Lưu</button></div>
    </>
  );
}
