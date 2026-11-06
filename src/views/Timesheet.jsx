import { useState } from "react";
import { useStore } from "../store.jsx";
import { staffList, monthStats, payFor, wageChecks, segsFor, exportMonthCsv } from "../lib/logic.js";
import { monthKey, monthLabel, monthOptions, hours, eur, deDate, hm, durTxt, initials, todayKey } from "../lib/utils.js";
import { PageHead, Empty, Status, Row, List, ModalHead, Field, Select, Muted, TableBox, Actions, Button, Panel } from "../components/ui.jsx";
import { Input } from "@/components/ui/input";
import { TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { dayDoc } from "./Kiosk.jsx";

export default function Timesheet() {
  const { D, toast, openModal } = useStore();
  const [m, setM] = useState(monthKey(new Date()));
  const [detail, setDetail] = useState(null);
  const st = staffList(D, true).filter((s) => s.active !== false || monthStats(D, s.id, m).days);

  const head = (
    <PageHead title="Bảng giờ" actions={<>
      <Select value={m} onChange={setM} aria-label="Chọn tháng" className="w-40">{monthOptions().map((x) => <option key={x} value={x}>{monthLabel(x)}</option>)}</Select>
      <Button onClick={() => toast("Đã lưu " + exportMonthCsv(D, m))}>Xuất CSV</Button>
    </>}>Arbeitszeitnachweis theo § 17 MiLoG. Mỗi lần sửa giờ đều ghi lý do.</PageHead>
  );

  if (detail && D.staff[detail]) {
    const s = D.staff[detail]; const x = monthStats(D, detail, m); const w = wageChecks(D, s, m, x);
    const edit = (date) => openModal(<EditDay sid={detail} date={date} />);
    return (
      <>
        {head}
        <Button variant="ghost" className="self-start" onClick={() => setDetail(null)}>← Tất cả nhân viên</Button>
        <Panel className="flex flex-wrap items-center gap-3">
          <span className="grid size-10 place-items-center rounded-full bg-muted text-sm font-semibold text-muted-foreground">{initials(s.name)}</span>
          <div className="flex-1"><div className="text-base font-semibold">{s.name}</div><div className="text-muted-foreground">{s.contract} · {hours(x.min)} giờ · {eur(payFor(s, x.min))}</div></div>
          <Button variant="outline" onClick={() => edit(m === monthKey(new Date()) ? todayKey() : m + "-01")}>Thêm ngày làm</Button>
        </Panel>
        {w.length > 0 && <List>{w.map((q, i) => <Row key={i} level={q.level} title={q.t} />)}</List>}
        {x.rows.length ? (
          <TableBox>
            <TableHeader><TableRow><TableHead>Ngày</TableHead><TableHead className="text-right">Beginn</TableHead><TableHead className="text-right">Ende</TableHead><TableHead className="text-right">Pause</TableHead><TableHead className="text-right">Dauer</TableHead><TableHead>Ghi chú</TableHead><TableHead /></TableRow></TableHeader>
            <TableBody>{x.rows.map((r) => (
              <TableRow key={r.date}>
                <TableCell className="tabular-nums">{deDate(r.date)}</TableCell><TableCell className="text-right tabular-nums">{hm(r.first)}</TableCell><TableCell className="text-right tabular-nums">{hm(r.last)}</TableCell>
                <TableCell className="text-right tabular-nums">{Math.round(r.pause)} min</TableCell><TableCell className="text-right tabular-nums">{durTxt(r.work)}</TableCell>
                <TableCell className="whitespace-normal"><div className="flex flex-wrap gap-1">{r.flags.length ? r.flags.map((f, i) => <Status key={i} level={f.level}>{f.t}</Status>) : <Status level="ok">Ổn</Status>}</div></TableCell>
                <TableCell><Button variant="ghost" size="sm" onClick={() => edit(r.date)}>Sửa</Button></TableCell>
              </TableRow>))}</TableBody>
          </TableBox>
        ) : <Empty>Không có giờ làm trong {monthLabel(m).toLowerCase()}.</Empty>}
      </>
    );
  }

  return (
    <>
      {head}
      {!st.length ? <Empty>Chưa có nhân viên.</Empty> : (
        <TableBox>
          <TableHeader><TableRow><TableHead>Nhân viên</TableHead><TableHead>Hợp đồng</TableHead><TableHead className="text-right">Ngày</TableHead><TableHead className="text-right">Giờ</TableHead><TableHead className="text-right">Lương dự tính</TableHead><TableHead className="text-right">€/giờ thực tế</TableHead><TableHead>Trạng thái</TableHead></TableRow></TableHeader>
          <TableBody>{st.map((s) => {
            const x = monthStats(D, s.id, m); const pay = payFor(s, x.min); const eff = x.min ? pay / (x.min / 60) : null; const w = wageChecks(D, s, m, x);
            const fl = x.rows.reduce((a, r) => a + r.flags.length, 0) + x.open;
            const lv = w.some((q) => q.level === "crit") ? "crit" : w.length || fl ? "warn" : "ok";
            return (
              <TableRow key={s.id} className="cursor-pointer" onClick={() => setDetail(s.id)}>
                <TableCell className="font-medium">{s.name}</TableCell><TableCell>{s.contract || "—"}</TableCell>
                <TableCell className="text-right tabular-nums">{x.days}</TableCell><TableCell className="text-right tabular-nums">{hours(x.min)}</TableCell><TableCell className="text-right tabular-nums">{eur(pay)}</TableCell><TableCell className="text-right tabular-nums">{eff ? eur(eff) : "—"}</TableCell>
                <TableCell><Status level={lv}>{lv === "ok" ? "Ổn" : lv === "crit" ? "Cần xử lý" : w.length + fl + " lưu ý"}</Status></TableCell>
              </TableRow>);
          })}</TableBody>
        </TableBox>
      )}
      <Muted>Lương dự tính dựa trên mức lương trong hồ sơ, chỉ để kiểm tra mức tối thiểu; không thay thế bảng lương của Steuerberater.</Muted>
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
      <ModalHead title={"Sửa giờ: " + s.name} sub="Khoảng trống giữa các đoạn được tính là giờ nghỉ." />
      <Field label="Ngày"><Input type="date" value={nd} onChange={(e) => setNd(e.target.value)} /></Field>
      <div className="flex flex-col gap-2">
        {segs.length ? segs.map((g, i) => (
          <div className="grid grid-cols-[1fr_1fr_auto] items-end gap-2" key={i}>
            <Field label="Vào"><Input type="time" value={g.in} onChange={(e) => upd(i, "in", e.target.value)} /></Field>
            <Field label="Ra"><Input type="time" value={g.out} onChange={(e) => upd(i, "out", e.target.value)} /></Field>
            <Button variant="ghost" className="text-destructive" onClick={() => setSegs(segs.filter((_, j) => j !== i))}>Xóa</Button>
          </div>
        )) : <Muted>Không có đoạn nào; lưu sẽ xóa giờ làm của ngày này.</Muted>}
      </div>
      <Button variant="outline" className="self-start" onClick={() => setSegs([...segs, { in: "", out: "" }])}>Thêm đoạn làm việc</Button>
      <Field label="Lý do sửa (bắt buộc)"><Select value={reason} onChange={setReason}><option value="">Chọn lý do…</option><option>Quên chấm công</option><option>Chấm nhầm giờ</option><option>Máy hỏng / mất mạng</option><option>Khác</option></Select></Field>
      <Field label="Ghi chú"><Input maxLength={140} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ví dụ: quên chấm ra ca, đã xác nhận với nhân viên" /></Field>
      <Actions><span className="flex-1" /><Button variant="outline" onClick={closeModal}>Hủy</Button><Button onClick={save}>Lưu</Button></Actions>
    </>
  );
}
