import { useStore } from "../store.jsx";
import { staffList, segsFor, status, monthStats, checkInci } from "../lib/logic.js";
import { todayKey, monthKey, monthLabel, hours } from "../lib/utils.js";
import { PageHead, Row, Status, Empty, ConfirmButton, Section } from "../components/ui.jsx";

export default function Overview({ alerts }) {
  const { D, removeMany, toast } = useStore();
  const today = todayKey(); const month = monthKey(new Date());
  const st = staffList(D);
  const working = st.filter((s) => status(segsFor(D, s.id, today)) === "working").length;
  const mins = st.reduce((a, s) => a + monthStats(D, s.id, month).min, 0);
  const crit = alerts.filter((a) => a.level === "crit").length;
  const warn = alerts.length - crit;
  const prods = Object.values(D.products);
  const checked = prods.filter((p) => checkInci(p.inci).checked).length;
  const hasEx = Object.values(D.staff).some((s) => s.example) || prods.some((p) => p.example) || Object.values(D.disinf).some((p) => p.example);

  const clearEx = () => {
    const pairs = [];
    Object.values(D.staff).filter((s) => s.example).forEach((s) => pairs.push(["staff", s.id]));
    prods.filter((p) => p.example).forEach((p) => pairs.push(["products", p.id]));
    Object.values(D.days).filter((d) => d.example).forEach((d) => pairs.push(["days", d.date]));
    Object.values(D.hygiene).filter((d) => d.example).forEach((d) => pairs.push(["hygiene", d.date]));
    Object.values(D.disinf).filter((d) => d.example).forEach((d) => pairs.push(["disinfectants", d.id]));
    Object.values(D.support).filter((d) => d.id.startsWith("ex")).forEach((d) => pairs.push(["support", d.id]));
    removeMany(pairs); toast("Đã xóa dữ liệu ví dụ");
  };

  return (
    <>
      <PageHead title="Tổng quan">
        Những việc cần xử lý để tiệm luôn sẵn sàng khi Zoll hoặc cơ quan kiểm tra đến.
      </PageHead>

      {hasEx && (
        <div className="note">
          <span>Đang có dữ liệu ví dụ (ghi “Ví dụ”). Xóa đi khi bắt đầu nhập dữ liệu thật.</span>
          <ConfirmButton className="btn sm" confirmText="Bấm lần nữa để xóa" onConfirm={clearEx}>Xóa dữ liệu ví dụ</ConfirmButton>
        </div>
      )}

      <dl className="figures">
        <div><dt>Đang làm</dt><dd><span className="num">{working}</span><small>/ {st.length} người</small></dd></div>
        <div><dt>Giờ làm {monthLabel(month).toLowerCase()}</dt><dd><span className="num">{hours(mins)}</span><small>giờ</small></dd></div>
        <div className={crit ? "is-crit" : ""}><dt>Việc khẩn</dt><dd><span className="num">{crit}</span><small>+ {warn} lưu ý</small></dd></div>
        <div><dt>Sản phẩm đã kiểm tra</dt><dd><span className="num">{checked}</span><small>/ {prods.length}</small></dd></div>
      </dl>

      <Section title="Việc cần làm" aside={<span className="muted small">{alerts.length} mục</span>}>
        {alerts.length ? (
          <div className="lines">
            {alerts.map((a, i) => (
              <Row key={i} level={a.level} title={a.title} detail={a.detail}
                right={<Status level={a.level}>{a.level === "crit" ? "Khẩn" : "Lưu ý"}</Status>}
                onClick={() => { location.hash = "#" + a.go; }} />
            ))}
          </div>
        ) : <Empty>Không có cảnh báo nào. Hồ sơ của tiệm đang ổn.</Empty>}
      </Section>
    </>
  );
}
