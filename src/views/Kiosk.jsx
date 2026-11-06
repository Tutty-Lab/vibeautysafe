import { useStore } from "../store.jsx";
import { staffList, segsFor, status, workMin } from "../lib/logic.js";
import { todayKey, hm, durTxt, initials, firstName } from "../lib/utils.js";
import { PageHead, Empty, Status, PinPad, ModalHead } from "../components/ui.jsx";

const STATE = { none: ["na", "Chưa vào ca"], working: ["live", "Đang làm"], pause: ["warn", "Đang nghỉ"], out: ["ok", "Đã ra ca"] };

export function dayDoc(D, date) {
  const d = D.days[date] || {};
  return { date, month: date.slice(0, 7), entries: JSON.parse(JSON.stringify(d.entries || {})), log: (d.log || []).slice(-49), example: d.example || false };
}

export default function Kiosk() {
  const { D, put, toast, openModal, closeModal } = useStore();
  const today = todayKey(); const st = staffList(D);

  const actionFlow = (sid) => {
    const s = D.staff[sid]; const segs = segsFor(D, sid, today); const stt = status(segs);
    const opts = { none: [["in", "Vào ca", "primary"]], out: [["in", "Vào ca lại", "primary"]], pause: [["resume", "Hết giờ nghỉ", "primary"], ["outp", "Ra ca luôn", ""]], working: [["pause", "Bắt đầu nghỉ", ""], ["out", "Ra ca", "primary"]] }[stt];
    const act = (a) => {
      const doc = dayDoc(D, today); const arr = doc.entries[sid] || []; const now = Date.now();
      if (a === "in" || a === "resume") arr.push({ in: now, out: null });
      else if (a === "outp") { if (arr.length) arr[arr.length - 1].end = "out"; }
      else { const l = arr[arr.length - 1]; if (l) { l.out = now; l.end = a === "pause" ? "pause" : "out"; } }
      doc.entries[sid] = arr; closeModal(); put("days", today, doc);
      toast({ in: "Đã vào ca lúc ", resume: "Đã hết giờ nghỉ lúc ", pause: "Bắt đầu nghỉ lúc ", out: "Đã ra ca lúc ", outp: "Đã ra ca lúc " }[a] + hm(now));
    };
    openModal(
      <>
        <ModalHead title={"Chào " + firstName(s.name)} sub={segs.length ? "Hôm nay: " + segs.map((x) => hm(x.in) + "–" + (x.out ? hm(x.out) : "…")).join(", ") : "Chưa chấm công hôm nay."} />
        <div className="big-clock mono">{hm(Date.now())}</div>
        <div className="row">{opts.map((o) => <button key={o[0]} className={"btn big " + o[2]} onClick={() => act(o[0])}>{o[1]}</button>)}</div>
        <button className="btn" onClick={closeModal}>Đóng</button>
      </>
    );
  };

  const clockFlow = (sid) => {
    const s = D.staff[sid];
    openModal(<PinPad title={s.name} hint="Nhập mã PIN 4 số" length={4} onCancel={closeModal}
      onComplete={(pin) => { if (String(s.pin || "") === pin) { closeModal(); setTimeout(() => actionFlow(sid), 0); return true; } return false; }} />);
  };

  if (!st.length) return (<><PageHead title="Chấm công" /><Empty>Chưa có nhân viên. Thêm nhân viên ở mục <a href="#nhan-vien">Nhân viên</a> và đặt mã PIN 4 số cho từng người.</Empty></>);

  return (
    <>
      <PageHead title="Chấm công hôm nay">
        Đặt máy tính bảng ở quầy. Nhân viên chạm vào tên mình, nhập mã PIN rồi chọn vào ca, nghỉ hoặc ra ca. Giờ lấy theo đồng hồ của máy.
      </PageHead>
      <div className="roster">
        {st.map((s) => {
          const segs = segsFor(D, s.id, today); const stt = status(segs); const [lv, txt] = STATE[stt];
          return (
            <button key={s.id} className={"person is-" + stt} onClick={() => clockFlow(s.id)}>
              <span className="avatar">{initials(s.name)}</span>
              <span className="person-name">{s.name}</span>
              <Status level={lv}>{txt}</Status>
              <span className="mono small muted">{segs.length ? "Vào " + hm(segs[0].in) + " · " + durTxt(workMin(segs)) : "—"}</span>
            </button>
          );
        })}
      </div>
    </>
  );
}
