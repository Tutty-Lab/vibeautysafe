import { useState } from "react";
import { useStore } from "../store.jsx";
import { INSP, INSP_SRC, SRC } from "../lib/constants.js";
import { inspectionDocs, staffList, monthStats, exportMonthCsv } from "../lib/logic.js";
import { monthKey, monthLabel, deDate, hours } from "../lib/utils.js";
import { PageHead, Tabs, Section, Empty, Status, Row, ExpStatus, SrcLinks } from "../components/ui.jsx";

export default function Inspect() {
  const { D, toast } = useStore();
  const [key, setKey] = useState("zoll");
  const I = INSP[key]; const rows = inspectionDocs(D, key); const bad = rows.filter((r) => r.lv === "crit").length;
  const m = monthKey(new Date()); const st = staffList(D);
  const S = D.settings;
  const contacts = [["Chủ tiệm", S.ownerName], ["Điện thoại tiệm", S.phone], ["Người thay mặt khi chủ vắng", S.deputy], ["Steuerberater", S.taxName], ["Luật sư", S.lawyer], ["Betriebsnummer", S.betriebsnummer]];

  return (
    <>
      <PageHead title="Khi bị kiểm tra">
        Chọn đúng cơ quan đang đến tiệm. Mỗi phần gồm: giấy tờ cần đưa (trạng thái lấy từ dữ liệu của tiệm), việc chủ tiệm và nhân viên cần làm, quyền theo luật, câu tiếng Đức.
      </PageHead>
      <Tabs value={key} onChange={setKey} tabs={Object.keys(INSP).map((k) => [k, INSP[k].tab])} />

      <div className="card prose"><h2 className="h-plain">{I.title}</h2><p>{I.who}</p></div>

      <Section title="Giấy tờ cần đưa" aside={bad ? <Status level="crit">{bad} mục còn thiếu</Status> : <Status level="ok">Sẵn sàng</Status>}>
        <div className="lines">{rows.map((r, i) => <Row key={i} level={r.lv} title={r.t} de={r.de} right={<Status level={r.lv}>{r.txt}</Status>} />)}</div>
      </Section>

      {key === "zoll" && (
        <Section title={<span lang="de">Übersicht Beschäftigte – {monthLabel(m)}</span>} aside={<button className="btn primary sm" onClick={() => toast("Đã lưu " + exportMonthCsv(D, m))}>Xuất bảng giờ tháng này</button>}>
          {st.length ? (
            <div className="table-wrap"><table lang="de">
              <thead><tr><th>Name</th><th>Vertrag</th><th>Beginn</th><th>Ausweis gültig bis</th><th>Aufenthaltstitel</th><th>Arbeitsvertrag</th><th>SV-Anmeldung</th><th className="num">Std.</th></tr></thead>
              <tbody>{st.map((s) => (
                <tr key={s.id}>
                  <td><b>{s.name}</b></td><td>{s.contract || "—"}</td><td className="mono">{deDate(s.start)}</td>
                  <td><ExpStatus value={s.idExp} /></td><td>{s.permitNA ? <Status level="na">EU</Status> : <ExpStatus value={s.permitExp} />}</td>
                  <td>{s.hasContract ? <Status level="ok">liegt vor</Status> : <Status level="crit">fehlt</Status>}</td>
                  <td>{s.registered ? <Status level="ok">ja</Status> : <Status level="crit">nein</Status>}</td>
                  <td className="num">{hours(monthStats(D, s.id, m).min)}</td>
                </tr>))}</tbody>
            </table></div>
          ) : <Empty>Chưa có nhân viên.</Empty>}
        </Section>
      )}

      <div className="grid2 top">
        <Section title="Chủ tiệm cần làm"><ol className="steps">{I.owner.map((x, i) => <li key={i}>{x}</li>)}</ol></Section>
        <Section title="Nhân viên cần làm"><ol className="steps">{I.staff.map((x, i) => <li key={i}>{x}</li>)}</ol></Section>
      </div>

      <Section title="Quyền của cán bộ và của tiệm theo luật"><ul className="steps">{I.rights.map((x, i) => <li key={i}>{x}</li>)}</ul></Section>

      <Section title="Câu tiếng Đức">
        <dl className="phrases">{I.phrases.map((p, i) => <div key={i}><dt lang="de">{p[0]}</dt><dd>{p[1]}</dd></div>)}</dl>
        <p className="muted small">Thay tên, ngày, giờ, con số trong câu cho đúng với tiệm của bạn.</p>
      </Section>

      <Section title="Người liên hệ khi kiểm tra" aside={<a className="btn sm" href="#tiem">Sửa</a>}>
        <dl className="kv">{contacts.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v || <Status level="warn">Chưa điền</Status>}</dd></div>)}</dl>
        <p className="muted small">Mọi nhân viên nên biết những người này là ai.</p>
      </Section>

      <Section title="Nguồn">
        <SrcLinks keys={I.src} map={{ ...SRC, ...INSP_SRC }} />
        <p className="muted small">Tóm tắt từ văn bản luật và tài liệu của cơ quan, không phải tư vấn pháp lý. Khi bị điều tra vi phạm, hãy liên hệ luật sư.</p>
      </Section>
    </>
  );
}
