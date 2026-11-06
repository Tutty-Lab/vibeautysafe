import { useState } from "react";
import { useStore } from "../store.jsx";
import { DAILY, LAENDER, SRC, USES, EFF } from "../lib/constants.js";
import { staffList, hygPct, setting, isBW, disinfCheck } from "../lib/logic.js";
import { dateKey, todayKey, deDate, hm, uid } from "../lib/utils.js";
import { PageHead, Tabs, Section, Empty, Status, Row, ModalHead, Field, Check, ConfirmButton, SrcLinks } from "../components/ui.jsx";
import { CourseSection, DocsSection, WhoTable } from "./safety.jsx";

export default function Hygiene() {
  const { D } = useStore();
  const [t, setT] = useState("khoa-hoc");
  return (
    <>
      <PageHead title="An toàn vệ sinh">
        Khóa học Hygiene, checklist hằng ngày, hồ sơ và chất khử trùng mà Gesundheitsamt thường kiểm tra. Bang: <b>{setting(D, "land") || "chưa chọn"}</b> · Dịch vụ: <b>{D.settings.serviceType === "invasive" ? "PMU, Tattoo (xâm lấn)" : "Nails, Kosmetik (không xâm lấn)"}</b>.
      </PageHead>
      <Tabs value={t} onChange={setT} tabs={[["khoa-hoc", "Khóa học"], ["hom-nay", "Checklist hôm nay"], ["ho-so", "Hồ sơ"], ["khu-trung", "Chất khử trùng"], ["ap-dung", "Áp dụng & nguồn"]]} />
      {t === "khoa-hoc" && <CourseSection area="hyg" />}
      {t === "hom-nay" && <HygChecklist />}
      {t === "ho-so" && <DocsSection area="hyg" />}
      {t === "khu-trung" && <Disinfectants />}
      {t === "ap-dung" && <WhoHyg />}
    </>
  );
}

export function HygChecklist() {
  const { D, put } = useStore();
  const [who, setWho] = useState("");
  const today = todayKey(); const h = D.hygiene[today] || { items: {} }; const st = staffList(D);
  const days = []; for (let i = 13; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); days.push(dateKey(d)); }
  const done = DAILY.filter(([k]) => h.items && h.items[k]).length;
  const toggle = (k, on) => {
    const items = JSON.parse(JSON.stringify(h.items || {}));
    if (on) items[k] = { at: Date.now(), by: who }; else delete items[k];
    put("hygiene", today, { date: today, items, example: false });
  };
  return (
    <>
      <div className="row">
        <Field label="Người thực hiện"><select value={who} onChange={(e) => setWho(e.target.value)}><option value="">Chọn tên…</option>{st.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
        <span className="grow" />
        <Status level={done === DAILY.length ? "ok" : "warn"}>{done} / {DAILY.length} việc</Status>
      </div>
      <div className="checklist">
        {DAILY.map(([k, t]) => {
          const it = h.items && h.items[k];
          return (
            <label key={k} className={it ? "done" : ""}>
              <input type="checkbox" checked={!!it} onChange={(e) => toggle(k, e.target.checked)} />
              <span>{t}</span>
              <span className="who mono">{it ? hm(it.at) : ""}{it && it.by && D.staff[it.by] ? <><br />{D.staff[it.by].name}</> : null}</span>
            </label>
          );
        })}
      </div>
      <Section title="14 ngày gần nhất">
        <div className="hist">
          {days.map((d) => { const p = hygPct(D, d); return (
            <div key={d} title={deDate(d) + ": " + Math.round(p * 100) + "%"}><i className={p < 1 ? "low" : ""} style={{ height: Math.max(2, p * 48) }} /><small>{d.slice(8)}</small></div>
          ); })}
        </div>
        <p className="muted small">Cột màu cam: ngày chưa làm đủ. Đây là ghi chép nội bộ theo khuyến nghị của cơ quan y tế, giúp chứng minh tiệm làm vệ sinh đều đặn.</p>
      </Section>
    </>
  );
}

function Disinfectants() {
  const { D, openModal } = useStore();
  const ds = Object.values(D.disinf).sort((a, b) => (a.use || "").localeCompare(b.use || "") || (a.name || "").localeCompare(b.name || ""));
  const rule = isBW(D) ? "Baden-Württemberg: dụng cụ dùng lại cần chất khử trùng bakterizid, fungizid và viruzid." : "Dụng cụ dùng lại cần chất có hiệu lực với virus, ít nhất begrenzt viruzid (HBV, HCV, HIV). Ở Baden-Württemberg yêu cầu viruzid đầy đủ.";
  return (
    <>
      <div className="row top">
        <p className="muted small grow">Chỉ dùng sản phẩm có trong danh sách VAH hoặc RKI, đúng nồng độ và thời gian tác dụng của nhà sản xuất. {rule} Tra sản phẩm tại <a href={SRC.vah[1]} target="_blank" rel="noopener noreferrer">vah-liste.de</a>.</p>
        <button className="btn primary" onClick={() => openModal(<DisForm id={null} />)}>Thêm chất khử trùng</button>
      </div>
      {ds.length ? (
        <div className="table-wrap"><table>
          <thead><tr><th>Sản phẩm</th><th>Dùng cho</th><th>Danh sách</th><th>Hiệu lực</th><th>Einwirkzeit</th><th>Kết quả</th></tr></thead>
          <tbody>{ds.map((d) => {
            const iss = disinfCheck(D, d); const lv = iss.some((x) => x.level === "crit") ? "crit" : iss.length ? "warn" : "ok"; const e = d.eff || {};
            return (
              <tr key={d.id} className="click" onClick={() => openModal(<DisForm id={d.id} />)}>
                <td><b>{d.name}</b>{d.example && <span className="tag">Ví dụ</span>}<div className="muted small">{d.maker}</div></td>
                <td>{(d.use || "").split(" (")[0]}</td>
                <td>{d.listed === "VAH" || d.listed === "RKI" ? <Status level="ok">{d.listed}</Status> : <Status level="crit">Không</Status>}</td>
                <td className="small wrap">{EFF.filter(([k]) => e[k]).map(([, l]) => l).join(", ")}</td>
                <td className="mono">{d.contact || "—"}</td>
                <td><Status level={lv} title={iss.map((x) => x.t).join("; ")}>{lv === "ok" ? "Đạt" : iss.length + (lv === "crit" ? " lỗi" : " lưu ý")}</Status></td>
              </tr>);
          })}</tbody>
        </table></div>
      ) : <Empty>Chưa có chất khử trùng nào. Thêm ít nhất: khử trùng tay, bề mặt và dụng cụ.</Empty>}
    </>
  );
}

function DisForm({ id }) {
  const { D, put, remove, toast, closeModal } = useStore();
  const [d, setD] = useState(() => (id ? JSON.parse(JSON.stringify(D.disinf[id])) : { id: uid(), name: "", maker: "", use: USES[0], listed: "VAH", eff: {}, conc: "", contact: "", opened: "", useMonths: "", expiry: "" }));
  const f = (k) => (e) => setD({ ...d, [k]: e.target.value });
  const collect = () => { const eff = { ...(d.eff || {}) }; if (eff.viruzid) eff.bviruzid = true; if (eff.fungizid) eff.levurozid = true; return { ...d, eff, name: d.name.trim(), maker: (d.maker || "").trim(), example: d.example || false, updatedAt: Date.now() }; };
  const iss = disinfCheck(D, collect());
  return (
    <>
      <ModalHead title={id ? d.name || "Chất khử trùng" : "Thêm chất khử trùng"} />
      <div className="grid2">
        <Field label="Tên sản phẩm"><input value={d.name} onChange={f("name")} /></Field>
        <Field label="Hãng"><input value={d.maker || ""} onChange={f("maker")} /></Field>
        <Field label="Dùng cho"><select value={d.use} onChange={f("use")}>{USES.map((u) => <option key={u}>{u}</option>)}</select></Field>
        <Field label="Có trong danh sách"><select value={d.listed === "VAH" || d.listed === "RKI" ? d.listed : "no"} onChange={f("listed")}><option>VAH</option><option>RKI</option><option value="no">Không / không rõ</option></select></Field>
        <Field label="Nồng độ dùng"><input placeholder="ví dụ 2 % hoặc dùng nguyên chất" value={d.conc || ""} onChange={f("conc")} /></Field>
        <Field label="Thời gian tác dụng (Einwirkzeit)"><input placeholder="ví dụ 15 Min." value={d.contact || ""} onChange={f("contact")} /></Field>
        <Field label="Ngày mở chai"><input type="date" value={d.opened || ""} onChange={f("opened")} /></Field>
        <Field label="Dùng được bao lâu sau khi mở (tháng)"><input type="number" min="0" value={d.useMonths || ""} onChange={f("useMonths")} /></Field>
        <Field label="Hạn sử dụng"><input type="date" value={d.expiry || ""} onChange={f("expiry")} /></Field>
      </div>
      <div><div className="muted small">Hiệu lực ghi trên nhãn hoặc trong danh sách VAH</div>
        <div className="row">{EFF.map(([k, l]) => <Check key={k} checked={(d.eff || {})[k]} onChange={(v) => setD({ ...d, eff: { ...(d.eff || {}), [k]: v } })}>{l}</Check>)}</div>
      </div>
      <div className="lines">{iss.length ? iss.map((x, i) => <Row key={i} level={x.level} title={x.t} />) : <Row level="ok" title="Đạt các yêu cầu đã kiểm tra" />}</div>
      <div className="actions">
        {id && <ConfirmButton confirmText="Bấm lần nữa để xóa" onConfirm={() => { remove("disinfectants", id); closeModal(); toast("Đã xóa"); }}>Xóa</ConfirmButton>}
        <span className="grow" />
        <button className="btn" onClick={closeModal}>Hủy</button>
        <button className="btn primary" onClick={() => { const doc = collect(); if (!doc.name) { toast("Hãy nhập tên sản phẩm"); return; } put("disinfectants", doc.id, doc); closeModal(); toast("Đã lưu " + doc.name); }}>Lưu</button>
      </div>
    </>
  );
}

function WhoHyg() {
  const { D, saveSettings, toast } = useStore();
  const [v, setV] = useState({ land: setting(D, "land") || "", serviceType: D.settings.serviceType || "nonInvasive", hasSteri: !!D.settings.hasSteri });
  return (
    <>
      <Section title="Thông tin tiệm">
        <div className="grid2">
          <Field label="Bang (Bundesland)"><select value={v.land} onChange={(e) => setV({ ...v, land: e.target.value })}><option value="">Chọn bang…</option>{LAENDER.map((l) => <option key={l}>{l}</option>)}</select></Field>
          <Field label="Loại dịch vụ"><select value={v.serviceType} onChange={(e) => setV({ ...v, serviceType: e.target.value })}><option value="nonInvasive">Nails, Kosmetik (không xâm lấn)</option><option value="invasive">PMU, Tattoo (xâm lấn)</option></select></Field>
          <Check checked={v.hasSteri} onChange={(x) => setV({ ...v, hasSteri: x })}>Tiệm tự tiệt trùng dụng cụ</Check>
        </div>
        <div className="actions"><span className="grow" /><button className="btn" onClick={() => { saveSettings(v); toast("Đã lưu thông tin tiệm"); }}>Lưu</button></div>
      </Section>
      <WhoTable rows={[
        ["Mọi tiệm, kể cả chủ làm một mình", "Toàn bộ phần An toàn vệ sinh", "Theo Infektionsschutzgesetz và Hygieneverordnung của bang; Gesundheitsamt kiểm tra."],
        ["Nails, Kosmetik (không xâm lấn)", "Khóa học Hygiene 8 giờ", "Cho chủ tiệm và từng nhân viên."],
        ["PMU, Tattoo (xâm lấn)", "Khóa học Hygiene 40 giờ", "Yêu cầu vệ sinh cao hơn vì dịch vụ xuyên qua da."],
        ["Tiệm ở Baden-Württemberg", "Hygieneplan bắt buộc, có hướng dẫn nhân viên được ghi lại; dụng cụ khử trùng bakterizid, fungizid, viruzid", "Các bang khác: khuyến nghị Hygieneplan; dụng cụ cần ít nhất begrenzt viruzid (ví dụ Bayern)."],
        ["Tiệm tự tiệt trùng dụng cụ", "Thêm kiểm tra máy tiệt trùng", "Quy trình đã thẩm định, nhật ký bảo trì, chỉ thị sinh học ít nhất 6 tháng/lần."]]} />
      <Section title="Nguồn chính thức">
        <SrcLinks keys={["bw", "aoe", "hb", "vah"]} map={SRC} />
        <p className="muted small">Quy định vệ sinh khác nhau theo bang và có thể thay đổi. Hãy hỏi Gesundheitsamt địa phương. ViBeautySAFE giúp lưu và nhắc hồ sơ, không thay thế tư vấn pháp lý hay của cơ quan chức năng.</p>
      </Section>
    </>
  );
}
