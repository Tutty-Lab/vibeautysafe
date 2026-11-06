import { useStore } from "../store.jsx";
import { staffList, segsFor, status, monthStats, checkInci } from "../lib/logic.js";
import { cn, todayKey, monthKey, monthLabel, hours } from "../lib/utils.js";
import { PageHead, Row, List, Status, Empty, Section } from "../components/ui.jsx";
import { Card, CardContent } from "@/components/ui/card";

export default function Overview({ alerts }) {
  const { D } = useStore();
  const today = todayKey(); const month = monthKey(new Date());
  const st = staffList(D);
  const working = st.filter((s) => status(segsFor(D, s.id, today)) === "working").length;
  const mins = st.reduce((a, s) => a + monthStats(D, s.id, month).min, 0);
  const crit = alerts.filter((a) => a.level === "crit").length;
  const prods = Object.values(D.products);
  const checked = prods.filter((p) => checkInci(p.inci).checked).length;

  const stats = [
    ["Đang làm", working, "/ " + st.length + " người"],
    ["Giờ làm " + monthLabel(month).toLowerCase(), hours(mins), "giờ"],
    ["Việc khẩn", crit, "+ " + (alerts.length - crit) + " lưu ý", crit > 0],
    ["Sản phẩm đã kiểm tra", checked, "/ " + prods.length],
  ];

  return (
    <>
      <PageHead title="Tổng quan">Những việc cần xử lý để tiệm luôn sẵn sàng khi Zoll hoặc cơ quan kiểm tra đến.</PageHead>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map(([k, v, s, bad]) => (
          <Card key={k} size="sm"><CardContent>
            <div className="text-sm text-muted-foreground">{k}</div>
            <div className="mt-1 flex items-baseline gap-1.5"><span className={cn("text-2xl font-semibold tabular-nums", bad && "text-destructive")}>{v}</span><span className="text-sm text-muted-foreground">{s}</span></div>
          </CardContent></Card>
        ))}
      </div>
      <Section title="Việc cần làm" aside={<span className="text-sm text-muted-foreground">{alerts.length} mục</span>}>
        {alerts.length ? (
          <List>
            {alerts.map((a, i) => (
              <Row key={i} level={a.level} title={a.title} detail={a.detail}
                right={<Status level={a.level}>{a.level === "crit" ? "Khẩn" : "Lưu ý"}</Status>}
                onClick={() => { location.hash = "#" + a.go; }} />
            ))}
          </List>
        ) : <Empty>Không có cảnh báo nào. Hồ sơ của tiệm đang ổn.</Empty>}
      </Section>
    </>
  );
}
