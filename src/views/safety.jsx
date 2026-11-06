import { useState } from "react";
import { useStore } from "../store.jsx";
import { SAFETY, SRC, COURSE, SUP_STATUS, DEV } from "../lib/constants.js";
import { areaOf, itemState, applies, people, courseState, courseRec, hygHours, setting } from "../lib/logic.js";
import { cn, uid, copyText } from "../lib/utils.js";
import { Row, List, Status, ModalHead, Field, Select, ContactBox, SrcLinks, Section, ConfirmButton, Muted, TableBox, Actions, Button, Grid } from "../components/ui.jsx";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";

/* ---------- courses ---------- */
export function CourseSection({ area, intro }) {
  const { D, openModal, saveSettings, toast } = useStore();
  const ps = people(D); const missing = ps.filter((p) => courseState(D, p.key, area).level !== "ok");
  const title = COURSE[area].title + (area === "hyg" ? " " + hygHours(D) + " giờ" : "");
  const reg = (list) => openModal(<SupportForm o={{ area, kind: "course", topic: title, want: "Đăng ký khóa học", people: list.map((p) => p.name), need: "Đăng ký " + title.toLowerCase() + " cho " + list.map((p) => p.name).join(", ") + "." }} />);
  const adv = (p) => openModal(<SupportForm o={{ area, kind: "course", topic: title, want: "Tư vấn", people: [p.name], need: "Cần tư vấn về " + title.toLowerCase() + " cho " + p.name + "." }} />);

  let introNode = intro;
  if (area === "hyg") {
    const inv = D.settings.serviceType === "invasive";
    introNode = (
      <div className="flex flex-col gap-2">
        <div className="grid gap-3 sm:grid-cols-2">
          {[[false, "8 giờ", "Nails, Kosmetik, không xâm lấn", "Làm móng, chăm sóc da, nối mi… không xuyên qua da."], [true, "40 giờ", "PMU, Tattoo, xâm lấn", "Phun xăm thẩm mỹ, xăm, xỏ khuyên… có xuyên qua da."]].map(([v, h, t, d]) => (
            <button key={h} aria-pressed={inv === v} onClick={() => { saveSettings({ serviceType: v ? "invasive" : "nonInvasive" }); toast("Đã chọn loại dịch vụ"); }}
              className={cn("flex flex-col gap-0.5 rounded-lg border bg-card p-4 text-left text-sm transition-colors hover:bg-muted/50", inv === v && "border-foreground ring-1 ring-foreground")}>
              <span className="text-lg font-semibold">{h}</span><span className="font-medium">{t}</span><span className="text-muted-foreground">{d}</span>
            </button>
          ))}
        </div>
        <Muted>Chọn loại dịch vụ của tiệm. Yêu cầu chứng nhận Hygiene khác nhau theo bang; hỏi Gesundheitsamt nơi tiệm đặt.</Muted>
      </div>
    );
  }

  return (
    <>
      {introNode}
      <Section title={title} aside={missing.length ? <div className="flex flex-wrap items-center gap-2"><Status level="crit">{missing.length} người chưa học</Status><Button size="sm" onClick={() => reg(missing)}>Đăng ký cho người chưa học</Button></div> : <Status level="ok">Mọi người đã học</Status>}>
        <TableBox>
          <TableHeader><TableRow><TableHead>Người</TableHead><TableHead>Vai trò</TableHead><TableHead>Đã học chưa?</TableHead><TableHead /></TableRow></TableHeader>
          <TableBody>{ps.map((p) => {
            const st = courseState(D, p.key, area); const r = courseRec(D, p.key, area);
            return (
              <TableRow key={p.key}>
                <TableCell><div className="font-medium">{p.name}</div>{r && r.provider && <div className="text-xs text-muted-foreground">{r.provider}</div>}</TableCell>
                <TableCell>{p.role}</TableCell>
                <TableCell><Status level={st.level}>{st.text}</Status></TableCell>
                <TableCell><div className="flex justify-end gap-1">
                  {st.level === "ok" ? <Button variant="ghost" size="sm" onClick={() => openModal(<CourseForm k={p.key} area={area} />)}>Sửa</Button> : <>
                    <Button variant="outline" size="sm" onClick={() => openModal(<CourseForm k={p.key} area={area} />)}>Đã học</Button>
                    <Button size="sm" onClick={() => reg([p])}>Đăng ký</Button>
                    <Button variant="ghost" size="sm" onClick={() => adv(p)}>Tư vấn</Button></>}
                </div></TableCell>
              </TableRow>);
          })}</TableBody>
        </TableBox>
      </Section>
      <SupportList area={area} kind="course" />
    </>
  );
}

function CourseForm({ k, area }) {
  const { D, put, toast, closeModal } = useStore();
  const p = people(D).find((x) => x.key === k);
  const existing = courseRec(D, k, area);
  const [r, setR] = useState(existing || { date: "", hours: area === "hyg" ? hygHours(D) : "", provider: "", note: "" });
  const f = (kk) => (e) => setR({ ...r, [kk]: e.target.value });
  const save = (rec) => {
    const cur = JSON.parse(JSON.stringify(D.courses[k] || {})); delete cur.id;
    if (rec) cur[area] = rec; else delete cur[area]; cur.updatedAt = Date.now();
    put("courses", k, cur); closeModal(); toast(rec ? "Đã lưu khóa học" : "Đã xóa ghi nhận");
  };
  return (
    <>
      <ModalHead title={COURSE[area].title} sub={p.name} />
      <Grid>
        <Field label="Ngày hoàn thành"><Input type="date" value={r.date} onChange={f("date")} /></Field>
        {area === "hyg" && <Field label="Số giờ học"><Input type="number" min="1" value={r.hours} onChange={f("hours")} /></Field>}
        <Field label="Nơi tổ chức khóa học"><Input value={r.provider} onChange={f("provider")} /></Field>
        <Field label="Ghi chú (nơi lưu chứng nhận…)"><Input maxLength={200} value={r.note} onChange={f("note")} /></Field>
      </Grid>
      <Actions>
        {existing && <ConfirmButton onConfirm={() => save(null)}>Xóa ghi nhận</ConfirmButton>}
        <span className="flex-1" />
        <Button variant="outline" onClick={closeModal}>Hủy</Button>
        <Button onClick={() => { if (!r.date) { toast("Hãy nhập ngày hoàn thành"); return; } save({ date: r.date, hours: area === "hyg" ? Number(r.hours) || "" : "", provider: r.provider.trim(), note: r.note.trim() }); }}>Lưu</Button>
      </Actions>
    </>
  );
}

/* ---------- document checklist ---------- */
export function DocsSection({ area }) {
  const { D, openModal } = useStore();
  const items = SAFETY.filter((i) => areaOf(i) === area); const groups = [...new Set(items.map((i) => i.g))];
  const states = items.map((i) => itemState(D, i)); const c = (l) => states.filter((s) => s.level === l).length;
  const helpAll = () => {
    const miss = items.filter((i) => ["crit", "warn"].includes(itemState(D, i).level));
    openModal(<SupportForm o={{ area, kind: "docs", topic: "Hoàn thiện hồ sơ " + (area === "hyg" ? "vệ sinh" : "BGW"), want: "Tư vấn và báo chi phí", need: "Hồ sơ còn thiếu:\n" + miss.map((i) => "- " + i.t + " (" + i.de + ")").join("\n") }} />);
  };
  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Status level="ok">{c("ok")} đã có</Status><Status level="crit">{c("crit")} thiếu, bắt buộc</Status><Status level="warn">{c("warn")} cần xem</Status><Status level="na">{c("na")} không áp dụng</Status>
        {c("crit") + c("warn") > 0 && <><span className="flex-1" /><Button size="sm" onClick={helpAll}>Cần hỗ trợ hoàn thiện hồ sơ</Button></>}
      </div>
      {groups.map((g) => (
        <Section key={g} title={g}>
          <List>
            {items.filter((i) => i.g === g).map((it) => {
              const st = itemState(D, it); const open = Object.values(D.support).some((r) => r.ref === it.id && r.status !== "Hoàn thành");
              return (
                <Row key={it.id} level={st.level} title={it.t} de={it.de} detail={it.d} onClick={() => openModal(<ItemForm id={it.id} />)}
                  right={<><Status level={st.level}>{st.text}</Status>{(st.level === "crit" || st.level === "warn") && open && <Status level="live">Đã yêu cầu hỗ trợ</Status>}</>} />
              );
            })}
          </List>
        </Section>
      ))}
      <SupportList area={area} kind="docs" />
    </>
  );
}

function helpFor(it) { return { area: areaOf(it), kind: "docs", ref: it.id, topic: it.t + " (" + it.de + ")", need: "Tiệm chưa có " + it.t.toLowerCase() + " (" + it.de + "). Cần làm " + it.t.toLowerCase() + "." }; }

function ItemForm({ id }) {
  const { D, put, toast, closeModal, openModal } = useStore();
  const it = SAFETY.find((x) => x.id === id); const st = itemState(D, it);
  const [r, setR] = useState(() => ({ status: "no", date: "", note: "", ...(D.safety[id] || {}) }));
  return (
    <>
      <ModalHead title={it.t} sub={<i lang="de">{it.de}</i>} />
      <p className="text-sm">{it.d}</p>
      {!applies(D, it) && <div className="rounded-md bg-amber-100 p-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200">Theo thông tin hiện tại (số nhân viên, máy tiệt trùng), mục này không áp dụng cho tiệm của bạn.</div>}
      <Field label="Tình trạng"><Select value={r.status === "yes" || r.status === "na" ? r.status : "no"} onChange={(v) => setR({ ...r, status: v })}><option value="yes">Đã có / đã làm</option><option value="no">Chưa có</option><option value="na">Không áp dụng</option></Select></Field>
      <Field label={it.dateLabel || "Ngày lập hoặc cập nhật"}><Input type="date" value={r.date || ""} onChange={(e) => setR({ ...r, date: e.target.value })} /></Field>
      <Field label="Ghi chú (nơi lưu bản giấy, người phụ trách…)"><Input maxLength={200} value={r.note || ""} onChange={(e) => setR({ ...r, note: e.target.value })} /></Field>
      <div><div className="mb-1 text-sm text-muted-foreground">Nguồn</div><SrcLinks keys={it.src} map={SRC} /></div>
      <Actions>
        {(st.level === "crit" || st.level === "warn") && <Button variant="outline" onClick={() => { closeModal(); setTimeout(() => openModal(<SupportForm o={helpFor(it)} />), 0); }}>Cần hỗ trợ</Button>}
        <span className="flex-1" />
        <Button variant="outline" onClick={closeModal}>Hủy</Button>
        <Button onClick={() => { put("safety", id, { status: r.status, date: r.date || "", note: (r.note || "").trim(), updatedAt: Date.now() }); closeModal(); toast("Đã lưu"); }}>Lưu</Button>
      </Actions>
    </>
  );
}

/* ---------- support requests ---------- */
function supportText(D, r) {
  return "Yêu cầu hỗ trợ ViBeautySAFE\nTiệm: " + setting(D, "salonName") + (D.settings.city ? " (" + D.settings.city + ")" : "") + "\nChủ đề: " + r.topic + "\nCần: " + r.want + (r.people && r.people.length ? "\nNgười: " + r.people.join(", ") : "") + "\nNội dung: " + r.need + "\nLiên hệ: " + [r.contact.name, r.contact.phone, r.contact.email].filter(Boolean).join(" · ") + (r.pref ? "\nThời gian thuận tiện: " + r.pref : "");
}

export function SupportForm({ o }) {
  const { D, put, toast, openModal, closeModal } = useStore();
  const wants = o.kind === "course" ? ["Đăng ký khóa học", "Tư vấn"] : ["Tư vấn", "Báo chi phí", "Tư vấn và báo chi phí"];
  const [v, setV] = useState({ need: o.need || "", want: o.want || wants[0], name: D.settings.ownerName || "", phone: D.settings.phone || "", email: D.settings.email || "", pref: "" });
  const f = (k) => (e) => setV({ ...v, [k]: e.target.value });
  const send = () => {
    const need = v.need.trim(); if (!need) { toast("Hãy ghi nội dung cần hỗ trợ"); return; }
    const r = { id: uid(), area: o.area, kind: o.kind, topic: o.topic, ref: o.ref || "", need, want: v.want, people: o.people || [], contact: { name: v.name.trim(), phone: v.phone.trim(), email: v.email.trim() }, pref: v.pref.trim(), status: "Mới", at: Date.now() };
    put("support", r.id, r); closeModal(); setTimeout(() => openModal(<SupportDone r={r} />), 0);
  };
  return (
    <>
      <ModalHead title="Cần hỗ trợ" sub={o.topic} />
      {o.people && o.people.length > 0 && <p className="text-sm">Người: {o.people.join(", ")}</p>}
      <Field label="Bạn cần hỗ trợ gì?"><Textarea value={v.need} onChange={f("need")} /></Field>
      <div className="flex flex-col gap-2"><div className="text-sm text-muted-foreground">Bạn muốn</div>
        <div className="flex flex-wrap gap-4">{wants.map((w) => <Label key={w} className="cursor-pointer font-normal"><input type="radio" className="accent-foreground" name="sw" checked={v.want === w} onChange={() => setV({ ...v, want: w })} /> {w}</Label>)}</div>
      </div>
      <Grid>
        <Field label="Người liên hệ"><Input value={v.name} onChange={f("name")} /></Field>
        <Field label="Điện thoại"><Input type="tel" value={v.phone} onChange={f("phone")} /></Field>
        <Field label="Email"><Input type="email" value={v.email} onChange={f("email")} /></Field>
        <Field label="Thời gian thuận tiện để gọi"><Input placeholder="ví dụ: thứ Hai sáng" value={v.pref} onChange={f("pref")} /></Field>
      </Grid>
      <Actions><span className="flex-1" /><Button variant="outline" onClick={closeModal}>Hủy</Button><Button onClick={send}>Lưu yêu cầu</Button></Actions>
    </>
  );
}

function SupportDone({ r }) {
  const { D, toast, closeModal } = useStore();
  const txt = supportText(D, r);
  const mail = "mailto:" + DEV.email + "?subject=" + encodeURIComponent("Yêu cầu hỗ trợ ViBeautySAFE: " + r.topic) + "&body=" + encodeURIComponent(txt);
  return (
    <>
      <ModalHead title="Đã ghi nhận yêu cầu" sub={"Yêu cầu đã lưu trong ViBeautySAFE. Gửi nội dung dưới đây cho " + DEV.name + " qua email hoặc gọi điện."} />
      <Textarea readOnly value={txt} className="min-h-40" />
      <ContactBox />
      <Actions><span className="flex-1" />
        <Button variant="outline" onClick={() => copyText(txt).then(() => toast("Đã sao chép"), () => toast("Không sao chép được, hãy chọn và nhấn Ctrl+C"))}>Sao chép</Button>
        <Button variant="outline" render={<a href={mail} />}>Mở email</Button>
        <Button onClick={closeModal}>Xong</Button>
      </Actions>
    </>
  );
}

export function SupportList({ area, kind }) {
  const { D, put, openModal } = useStore();
  const rs = Object.values(D.support).filter((r) => r.area === area && (!kind || r.kind === kind)).sort((a, b) => b.at - a.at);
  if (!rs.length) return null;
  return (
    <Section title="Yêu cầu hỗ trợ đã gửi">
      <List>
        {rs.map((r) => (
          <Row key={r.id} level={r.status === "Hoàn thành" ? "ok" : r.status === "Mới" ? "warn" : "na"} title={r.topic + " · " + r.want}
            detail={<>{r.need}<div className="text-xs">{new Date(r.at).toLocaleString("de-DE")}{r.people && r.people.length ? " · " + r.people.join(", ") : ""}</div></>}
            right={<>
              <Select value={r.status} onChange={(v) => put("support", r.id, { ...r, status: v })} className="w-36">{SUP_STATUS.map((s) => <option key={s}>{s}</option>)}</Select>
              <Button variant="ghost" size="sm" onClick={() => openModal(<SupportDone r={r} />)}>Gửi lại</Button>
            </>} />
        ))}
      </List>
    </Section>
  );
}

export function WhoTable({ rows }) {
  return (
    <TableBox>
      <TableHeader><TableRow><TableHead>Đối tượng</TableHead><TableHead>Áp dụng</TableHead><TableHead>Ghi chú</TableHead></TableRow></TableHeader>
      <TableBody>{rows.map((r, i) => <TableRow key={i}><TableCell className="min-w-40 whitespace-normal align-top font-medium">{r[0]}</TableCell><TableCell className="min-w-48 whitespace-normal align-top">{r[1]}</TableCell><TableCell className="min-w-56 whitespace-normal align-top text-muted-foreground">{r[2]}</TableCell></TableRow>)}</TableBody>
    </TableBox>
  );
}
