import { useState } from "react";
import { useStore } from "../store.jsx";
import { INSP, INSP_SRC, SRC } from "../lib/constants.js";
import { inspectionDocs, staffList, monthStats, exportMonthCsv } from "../lib/logic.js";
import { monthKey, monthLabel, deDate, hours } from "../lib/utils.js";
import { PageHead, Tabs, Section, Empty, Status, Row, List, ExpStatus, SrcLinks, Muted, TableBox, Button, Panel } from "../components/ui.jsx";
import { TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";

export default function Inspect() {
  const { D, toast } = useStore();
  const [key, setKey] = useState("zoll");
  const I = INSP[key]; const rows = inspectionDocs(D, key); const bad = rows.filter((r) => r.lv === "crit").length;
  const m = monthKey(new Date()); const st = staffList(D); const S = D.settings;
  const contacts = [["Chủ tiệm", S.ownerName], ["Điện thoại tiệm", S.phone], ["Người thay mặt khi chủ vắng", S.deputy], ["Steuerberater", S.taxName], ["Luật sư", S.lawyer], ["Betriebsnummer", S.betriebsnummer]];
  const Steps = ({ items, ordered = true }) => { const T = ordered ? "ol" : "ul"; return <Panel><T className={(ordered ? "list-decimal" : "list-disc") + " space-y-2 pl-5"}>{items.map((x, i) => <li key={i}>{x}</li>)}</T></Panel>; };

  return (
    <>
      <PageHead title="Khi bị kiểm tra">Chọn đúng cơ quan đang đến tiệm. Mỗi phần gồm: giấy tờ cần đưa (trạng thái lấy từ dữ liệu của tiệm), việc chủ tiệm và nhân viên cần làm, quyền theo luật, câu tiếng Đức.</PageHead>
      <Tabs value={key} onChange={setKey} tabs={Object.keys(INSP).map((k) => [k, INSP[k].tab])} />
      <Panel><div className="text-base font-semibold">{I.title}</div><p className="mt-1 text-muted-foreground">{I.who}</p></Panel>

      <Section title="Giấy tờ cần đưa" aside={bad ? <Status level="crit">{bad} mục còn thiếu</Status> : <Status level="ok">Sẵn sàng</Status>}>
        <List>{rows.map((r, i) => <Row key={i} level={r.lv} title={r.t} de={r.de} right={<Status level={r.lv}>{r.txt}</Status>} />)}</List>
      </Section>

      {key === "zoll" && (
        <Section title={<span lang="de">Übersicht Beschäftigte – {monthLabel(m)}</span>} aside={<Button size="sm" onClick={() => toast("Đã lưu " + exportMonthCsv(D, m))}>Xuất bảng giờ tháng này</Button>}>
          {st.length ? (
            <TableBox>
              <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Vertrag</TableHead><TableHead>Beginn</TableHead><TableHead>Ausweis gültig bis</TableHead><TableHead>Aufenthaltstitel</TableHead><TableHead>Arbeitsvertrag</TableHead><TableHead>SV-Anmeldung</TableHead><TableHead className="text-right">Std.</TableHead></TableRow></TableHeader>
              <TableBody>{st.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.name}</TableCell><TableCell>{s.contract || "—"}</TableCell><TableCell>{deDate(s.start)}</TableCell>
                  <TableCell><ExpStatus value={s.idExp} /></TableCell><TableCell>{s.permitNA ? <Status level="na">EU</Status> : <ExpStatus value={s.permitExp} />}</TableCell>
                  <TableCell>{s.hasContract ? <Status level="ok">liegt vor</Status> : <Status level="crit">fehlt</Status>}</TableCell>
                  <TableCell>{s.registered ? <Status level="ok">ja</Status> : <Status level="crit">nein</Status>}</TableCell>
                  <TableCell className="text-right tabular-nums">{hours(monthStats(D, s.id, m).min)}</TableCell>
                </TableRow>))}</TableBody>
            </TableBox>
          ) : <Empty>Chưa có nhân viên.</Empty>}
        </Section>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Chủ tiệm cần làm"><Steps items={I.owner} /></Section>
        <Section title="Nhân viên cần làm"><Steps items={I.staff} /></Section>
      </div>

      <Section title="Quyền của cán bộ và của tiệm theo luật"><Steps items={I.rights} ordered={false} /></Section>

      <Section title="Câu tiếng Đức">
        <div className="grid gap-2 md:grid-cols-2">
          {I.phrases.map((p, i) => <Panel key={i} className="py-3"><div className="font-medium" lang="de">{p[0]}</div><div className="mt-0.5 text-muted-foreground">{p[1]}</div></Panel>)}
        </div>
        <Muted>Thay tên, ngày, giờ, con số trong câu cho đúng với tiệm của bạn.</Muted>
      </Section>

      <Section title="Người liên hệ khi kiểm tra" aside={<Button variant="outline" size="sm" render={<a href="#tiem" />}>Sửa</Button>}>
        <TableBox><TableBody>{contacts.map(([k, v]) => <TableRow key={k}><TableCell className="w-60 text-muted-foreground">{k}</TableCell><TableCell className="whitespace-normal">{v || <Status level="warn">Chưa điền</Status>}</TableCell></TableRow>)}</TableBody></TableBox>
        <Muted>Mọi nhân viên nên biết những người này là ai.</Muted>
      </Section>

      <Section title="Nguồn">
        <SrcLinks keys={I.src} map={{ ...SRC, ...INSP_SRC }} />
        <Muted>Tóm tắt từ văn bản luật và tài liệu của cơ quan, không phải tư vấn pháp lý. Khi bị điều tra vi phạm, hãy liên hệ luật sư.</Muted>
      </Section>
    </>
  );
}
