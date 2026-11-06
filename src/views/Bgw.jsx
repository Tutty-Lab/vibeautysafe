import { useState } from "react";
import { useStore } from "../store.jsx";
import { SRC } from "../lib/constants.js";
import { staffList, staffSafety } from "../lib/logic.js";
import { deDate } from "../lib/utils.js";
import { PageHead, Tabs, Section, Empty, Status, SrcLinks, Muted, TableBox, Panel } from "../components/ui.jsx";
import { TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { CourseSection, DocsSection, WhoTable } from "./safety.jsx";
import { StaffForm } from "./Staff.jsx";

export default function Bgw() {
  const { D } = useStore();
  const [t, setT] = useState("khoa-hoc");
  return (
    <>
      <PageHead title="An toàn lao động BGW">
        Khóa học an toàn lao động, hồ sơ BGW, huấn luyện và khám sức khỏe mà cơ quan an toàn lao động và BGW thường kiểm tra. Tiệm hiện có {staffList(D).length} nhân viên.
      </PageHead>
      <Tabs value={t} onChange={setT} tabs={[["khoa-hoc", "Khóa học BGW"], ["ho-so", "Hồ sơ BGW"], ["nv", "Huấn luyện & khám"], ["ap-dung", "Áp dụng & nguồn"]]} />
      {t === "khoa-hoc" && <CourseSection area="bgw" intro={<Panel className="text-muted-foreground">Dành cho chủ tiệm và người quản lý: học cách tự tổ chức an toàn lao động trong tiệm (mô hình chủ doanh nghiệp theo DGUV Vorschrift 2), lập đánh giá rủi ro, huấn luyện nhân viên. Nhân viên cũng nên học để hiểu nguy cơ từ hóa chất, bụi mài và làm việc ẩm.</Panel>} />}
      {t === "ho-so" && <DocsSection area="bgw" />}
      {t === "nv" && <StaffTraining />}
      {t === "ap-dung" && <>
        <WhoTable rows={[
          ["Mọi tiệm, kể cả chủ làm một mình", "Đăng ký Berufsgenossenschaft", "Trong 1 tuần sau khi thành lập; khi chưa có nhân viên thường chưa phát sinh phí."],
          ["Tiệm có nhân viên (cả Minijob, bán thời gian)", "Toàn bộ hồ sơ BGW, sơ cứu, hóa chất và bảo vệ da; huấn luyện cho từng người", "Đánh giá rủi ro, bác sĩ lao động và chuyên viên an toàn (DGUV V2), Ersthelfer, Betriebsanweisungen, Gefahrstoffverzeichnis."],
          ["Chủ tiệm, người quản lý", "Khóa học An toàn lao động BGW", "Cần khi chọn mô hình chủ doanh nghiệp (DGUV Vorschrift 2, Anlage 3)."],
          ["Nhân viên làm việc ẩm", "> 2 giờ/ngày: mời khám; ≥ 4 giờ/ngày: khám bắt buộc", "Làm việc ẩm gồm đeo găng chống thấm, rửa tay nhiều, lau ướt."]]} />
        <Section title="Nguồn chính thức">
          <SrcLinks keys={["rp", "gefstoffv", "arbmedvv", "dguv", "bgwvb", "gp"]} map={SRC} />
          <Muted>Hỏi BGW và cơ quan an toàn lao động của bang khi cần. ViBeautySAFE giúp lưu và nhắc hồ sơ, không thay thế tư vấn pháp lý hay của cơ quan chức năng.</Muted>
        </Section>
      </>}
    </>
  );
}

function StaffTraining() {
  const { D, openModal } = useStore();
  const st = staffList(D);
  if (!st.length) return <Empty>Chưa có nhân viên. Tiệm không có nhân viên thì các nghĩa vụ huấn luyện và khám sức khỏe lao động không áp dụng.</Empty>;
  const fl = { lt2: "Dưới 2 giờ", "2to4": "2–4 giờ", ge4: "≥ 4 giờ" };
  return (
    <>
      <Muted className="max-w-3xl">Huấn luyện an toàn trước khi bắt đầu làm và ít nhất mỗi năm một lần, bằng lời, bằng ngôn ngữ nhân viên hiểu, ghi nội dung và ngày, có chữ ký người được huấn luyện (§ 14 Abs. 2 GefStoffV). Làm việc ẩm trên 2 giờ/ngày: phải mời khám; từ 4 giờ/ngày: khám bắt buộc (ArbMedVV).</Muted>
      <TableBox>
        <TableHeader><TableRow><TableHead>Nhân viên</TableHead><TableHead>Unterweisung</TableHead><TableHead>Làm việc ẩm</TableHead><TableHead>Vorsorge</TableHead><TableHead>Trạng thái</TableHead></TableRow></TableHeader>
        <TableBody>{st.map((s) => {
          const x = staffSafety(s); const lv = x.some((a) => a.level === "crit") ? "crit" : x.length ? "warn" : "ok";
          return (
            <TableRow key={s.id} className="cursor-pointer" onClick={() => openModal(<StaffForm sid={s.id} />)}>
              <TableCell className="font-medium">{s.name}</TableCell>
              <TableCell>{s.unterweisung ? deDate(s.unterweisung) : <Status level="crit">Chưa có</Status>}</TableCell>
              <TableCell>{fl[s.feucht || "lt2"]}</TableCell>
              <TableCell>{s.vorsorge ? deDate(s.vorsorge) : "—"}</TableCell>
              <TableCell><Status level={lv} title={x.map((a) => a.t).join("; ")}>{lv === "ok" ? "Ổn" : x.length + " việc"}</Status></TableCell>
            </TableRow>);
        })}</TableBody>
      </TableBox>
      <Muted>Bấm vào tên để cập nhật ngày huấn luyện và khám trong hồ sơ nhân viên.</Muted>
    </>
  );
}
