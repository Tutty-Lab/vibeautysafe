import { useState } from "react";
import { useStore } from "../store.jsx";
import { SAFETY, SRC, COURSE, SUP_STATUS, DEV } from "../lib/constants.js";
import { areaOf, itemState, applies, people, courseState, courseRec, hygHours, setting } from "../lib/logic.js";
import { uid, deDate, copyText } from "../lib/utils.js";
import { Row, Status, ModalHead, Field, ContactBox, SrcLinks, Section, ConfirmButton } from "../components/ui.jsx";

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
      <>
        <div className="choice">
          {[[false, "8 giờ", "Nails, Kosmetik, không xâm lấn", "Làm móng, chăm sóc da, nối mi… không xuyên qua da."], [true, "40 giờ", "PMU, Tattoo, xâm lấn", "Phun xăm thẩm mỹ, xăm, xỏ khuyên… có xuyên qua da."]].map(([v, h, t, d]) => (
            <button key={h} className={"choice-item" + (inv === v ? " on" : "")} aria-pressed={inv === v}
              onClick={() => { saveSettings({ serviceType: v ? "invasive" : "nonInvasive" }); toast("Đã chọn loại dịch vụ"); }}>
              <span className="choice-h">{h}</span><b>{t}</b><span className="muted small">{d}</span>
            </button>
          ))}
        </div>
        <p className="muted small">Chọn loại dịch vụ của tiệm. Yêu cầu chứng nhận Hygiene khác nhau theo bang; hỏi Gesundheitsamt nơi tiệm đặt.</p>
      </>
    );
  }

  return (
    <>
      {introNode}
      <Section title={title} aside={missing.length ? <div className="row"><Status level="crit">{missing.length} người chưa học</Status><button className="btn primary sm" onClick={() => reg(missing)}>Đăng ký cho người chưa học</button></div> : <Status level="ok">Mọi người đã học</Status>}>
        <div className="table-wrap"><table>
          <thead><tr><th>Người</th><th>Vai trò</th><th>Đã học chưa?</th><th /></tr></thead>
          <tbody>{ps.map((p) => {
            const st = courseState(D, p.key, area); const r = courseRec(D, p.key, area);
            return (
              <tr key={p.key}>
                <td><b>{p.name}</b>{r && r.provider && <div className="muted small">{r.provider}</div>}</td>
                <td>{p.role}</td>
                <td><Status level={st.level}>{st.text}</Status></td>
                <td><div className="row nowrap">
                  {st.level === "ok" ? <button className="btn ghost sm" onClick={() => openModal(<CourseForm k={p.key} area={area} />)}>Sửa</button> : <>
                    <button className="btn sm" onClick={() => openModal(<CourseForm k={p.key} area={area} />)}>Đã học</button>
                    <button className="btn primary sm" onClick={() => reg([p])}>Đăng ký</button>
                    <button className="btn ghost sm" onClick={() => adv(p)}>Tư vấn</button></>}
                </div></td>
              </tr>);
          })}</tbody>
        </table></div>
      </Section>
      <SupportList area={area} kind="course" />
      <ContactBox />
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
      <div className="grid2">
        <Field label="Ngày hoàn thành"><input type="date" value={r.date} onChange={f("date")} /></Field>
        {area === "hyg" && <Field label="Số giờ học"><input type="number" min="1" value={r.hours} onChange={f("hours")} /></Field>}
        <Field label="Nơi tổ chức khóa học"><input value={r.provider} onChange={f("provider")} /></Field>
        <Field label="Ghi chú (nơi lưu chứng nhận…)"><input maxLength={200} value={r.note} onChange={f("note")} /></Field>
      </div>
      <div className="actions">
        {existing && <ConfirmButton onConfirm={() => save(null)}>Xóa ghi nhận</ConfirmButton>}
        <span className="grow" />
        <button className="btn" onClick={closeModal}>Hủy</button>
        <button className="btn primary" onClick={() => { if (!r.date) { toast("Hãy nhập ngày hoàn thành"); return; } save({ date: r.date, hours: area === "hyg" ? Number(r.hours) || "" : "", provider: r.provider.trim(), note: r.note.trim() }); }}>Lưu</button>
      </div>
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
      <div className="tally">
        <Status level="ok">{c("ok")} đã có</Status><Status level="crit">{c("crit")} thiếu, bắt buộc</Status><Status level="warn">{c("warn")} cần xem</Status><Status level="na">{c("na")} không áp dụng</Status>
        {c("crit") + c("warn") > 0 && <><span className="grow" /><button className="btn primary sm" onClick={helpAll}>Cần hỗ trợ hoàn thiện hồ sơ</button></>}
      </div>
      {groups.map((g) => (
        <Section key={g} title={g}>
          <div className="lines">
            {items.filter((i) => i.g === g).map((it) => {
              const st = itemState(D, it); const open = Object.values(D.support).some((r) => r.ref === it.id && r.status !== "Hoàn thành");
              return (
                <Row key={it.id} level={st.level} title={it.t} de={it.de} detail={it.d} onClick={() => openModal(<ItemForm id={it.id} />)}
                  right={<><Status level={st.level}>{st.text}</Status>{(st.level === "crit" || st.level === "warn") && open && <Status level="live">Đã yêu cầu hỗ trợ</Status>}</>} />
              );
            })}
          </div>
        </Section>
      ))}
      <SupportList area={area} kind="docs" />
      <ContactBox />
    </>
  );
}

function helpFor(it) { return { area: areaOf(it), kind: "docs", ref: it.id, topic: it.t + " (" + it.de + ")", need: "Tiệm chưa có " + it.t.toLowerCase() + " (" + it.de + "). Cần làm " + it.t.toLowerCase() + "." }; }

function ItemForm({ id }) {
  const { D, put, toast, closeModal, openModal } = useStore();
  const it = SAFETY.find((x) => x.id === id); const st = itemState(D, it);
  const [r, setR] = useState(() => ({ status: "no", date: "", note: "", ...(D.safety[id] || {}) }));
  const f = (k) => (e) => setR({ ...r, [k]: e.target.value });
  return (
    <>
      <ModalHead title={it.t} sub={<i lang="de">{it.de}</i>} />
      <p>{it.d}</p>
      {!applies(D, it) && <div className="note">Theo thông tin hiện tại (số nhân viên, máy tiệt trùng), mục này không áp dụng cho tiệm của bạn.</div>}
      <Field label="Tình trạng"><select value={r.status === "yes" || r.status === "na" ? r.status : "no"} onChange={f("status")}><option value="yes">Đã có / đã làm</option><option value="no">Chưa có</option><option value="na">Không áp dụng</option></select></Field>
      <Field label={it.dateLabel || "Ngày lập hoặc cập nhật"}><input type="date" value={r.date || ""} onChange={f("date")} /></Field>
      <Field label="Ghi chú (nơi lưu bản giấy, người phụ trách…)"><input maxLength={200} value={r.note || ""} onChange={f("note")} /></Field>
      <div><div className="muted small">Nguồn</div><SrcLinks keys={it.src} map={SRC} /></div>
      <div className="actions">
        {(st.level === "crit" || st.level === "warn") && <button className="btn" onClick={() => { closeModal(); setTimeout(() => openModal(<SupportForm o={helpFor(it)} />), 0); }}>Cần hỗ trợ</button>}
        <span className="grow" />
        <button className="btn" onClick={closeModal}>Hủy</button>
        <button className="btn primary" onClick={() => { put("safety", id, { status: r.status, date: r.date || "", note: (r.note || "").trim(), updatedAt: Date.now() }); closeModal(); toast("Đã lưu"); }}>Lưu</button>
      </div>
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
      <ModalHead title="Cần hỗ trợ" sub={<b>{o.topic}</b>} />
      {o.people && o.people.length > 0 && <p className="small">Người: {o.people.join(", ")}</p>}
      <Field label="Bạn cần hỗ trợ gì?"><textarea className="plain" value={v.need} onChange={f("need")} /></Field>
      <div><div className="muted small">Bạn muốn</div><div className="row">{wants.map((w) => <label key={w} className="check"><input type="radio" name="sw" checked={v.want === w} onChange={() => setV({ ...v, want: w })} /> {w}</label>)}</div></div>
      <div className="grid2">
        <Field label="Người liên hệ"><input value={v.name} onChange={f("name")} /></Field>
        <Field label="Điện thoại"><input type="tel" value={v.phone} onChange={f("phone")} /></Field>
        <Field label="Email"><input type="email" value={v.email} onChange={f("email")} /></Field>
        <Field label="Thời gian thuận tiện để gọi"><input placeholder="ví dụ: thứ Hai sáng" value={v.pref} onChange={f("pref")} /></Field>
      </div>
      <div className="actions"><span className="grow" /><button className="btn" onClick={closeModal}>Hủy</button><button className="btn primary" onClick={send}>Lưu yêu cầu</button></div>
    </>
  );
}

function SupportDone({ r }) {
  const { D, toast, closeModal } = useStore();
  const txt = supportText(D, r);
  const mail = "mailto:" + DEV.email + "?subject=" + encodeURIComponent("Yêu cầu hỗ trợ ViBeautySAFE: " + r.topic) + "&body=" + encodeURIComponent(txt);
  return (
    <>
      <ModalHead title="Đã ghi nhận yêu cầu" />
      <p>Yêu cầu đã lưu trong ViBeautySAFE. Để được hỗ trợ, gửi nội dung dưới đây cho {DEV.name} qua email hoặc gọi điện.</p>
      <textarea className="plain" readOnly value={txt} style={{ minHeight: 150 }} />
      <ContactBox />
      <div className="actions"><span className="grow" />
        <button className="btn" onClick={() => copyText(txt).then(() => toast("Đã sao chép"), () => toast("Không sao chép được, hãy chọn và nhấn Ctrl+C"))}>Sao chép</button>
        <a className="btn" href={mail}>Mở email</a>
        <button className="btn primary" onClick={closeModal}>Xong</button>
      </div>
    </>
  );
}

export function SupportList({ area, kind }) {
  const { D, put, openModal } = useStore();
  const rs = Object.values(D.support).filter((r) => r.area === area && (!kind || r.kind === kind)).sort((a, b) => b.at - a.at);
  if (!rs.length) return null;
  return (
    <Section title="Yêu cầu hỗ trợ đã gửi">
      <div className="lines">
        {rs.map((r) => (
          <Row key={r.id} level={r.status === "Hoàn thành" ? "ok" : r.status === "Mới" ? "warn" : "na"} title={r.topic + " · " + r.want}
            detail={<>{r.need}<div className="muted small">{new Date(r.at).toLocaleString("de-DE")}{r.people && r.people.length ? " · " + r.people.join(", ") : ""}</div></>}
            right={<div className="stack-s end">
              <select value={r.status} onChange={(e) => put("support", r.id, { ...r, status: e.target.value })}>{SUP_STATUS.map((s) => <option key={s}>{s}</option>)}</select>
              <button className="btn ghost sm" onClick={() => openModal(<SupportDone r={r} />)}>Gửi lại</button>
            </div>} />
        ))}
      </div>
    </Section>
  );
}

export function WhoTable({ rows }) {
  return (
    <div className="table-wrap"><table>
      <thead><tr><th>Đối tượng</th><th>Áp dụng</th><th>Ghi chú</th></tr></thead>
      <tbody>{rows.map((r, i) => <tr key={i}><td className="wrap"><b>{r[0]}</b></td><td className="wrap">{r[1]}</td><td className="wrap muted small">{r[2]}</td></tr>)}</tbody>
    </table></div>
  );
}

export { deDate };
