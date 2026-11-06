import { DEFAULTS, BANNED, SAFETY, DAILY } from "./constants.js";
import { dateKey, monthKey, todayKey, deDate, monthLabel, daysUntil, eur, hours, monthsSince, norm } from "./utils.js";

/* D = { staff, days, products, safety, disinf, hygiene, courses, support, settings } */

export const setting = (D, k) => { const v = D.settings[k]; return v == null || v === "" ? DEFAULTS[k] : v; };
export const staffList = (D, all) => Object.values(D.staff).filter((s) => all || s.active !== false).sort((a, b) => (a.name || "").localeCompare(b.name || "", "vi"));

/* ---------- time maths ---------- */
export const segsFor = (D, sid, date) => (D.days[date] && D.days[date].entries && D.days[date].entries[sid]) || [];
/* now: undefined = open segment counts until this moment; null = open segment on a past day counts 0 */
export const workMin = (segs, now) => segs.reduce((a, s) => a + ((s.out != null ? s.out : now === null ? s.in : now ?? Date.now()) - s.in) / 60000, 0);
export function pauseMin(segs) { let p = 0; for (let i = 1; i < segs.length; i++) if (segs[i - 1].out) p += (segs[i].in - segs[i - 1].out) / 60000; return p; }
export function status(segs) { if (!segs.length) return "none"; const l = segs[segs.length - 1]; if (l.out == null) return "working"; return l.end === "pause" ? "pause" : "out"; }
export function dayFlags(segs, now) {
  const w = workMin(segs, now), p = pauseMin(segs), f = [];
  if (segs.some((s) => s.out == null)) f.push({ level: "warn", t: "Chưa ra ca" });
  if (w > 600) f.push({ level: "crit", t: "Quá 10 giờ/ngày" });
  else if (w > 540 && p < 45) f.push({ level: "warn", t: "Trên 9 giờ cần nghỉ ≥ 45 phút" });
  else if (w > 360 && p < 30) f.push({ level: "warn", t: "Trên 6 giờ cần nghỉ ≥ 30 phút" });
  return f;
}
export function monthStats(D, sid, month) {
  const rows = []; let min = 0, open = 0; const today = todayKey();
  Object.keys(D.days).filter((k) => k.startsWith(month)).sort().forEach((k) => {
    const segs = segsFor(D, sid, k); if (!segs.length) return;
    const isToday = k === today; const w = workMin(segs, isToday ? Date.now() : null); min += w;
    const fl = dayFlags(segs, isToday ? undefined : null).filter((f) => !(isToday && f.t === "Chưa ra ca"));
    if (!isToday && segs.some((s) => s.out == null)) open++;
    rows.push({ date: k, first: segs[0].in, last: segs[segs.length - 1].out, pause: pauseMin(segs), work: w, flags: fl, segs });
  });
  return { rows, min, open, days: rows.length };
}
export const payFor = (s, min) => (s.payType === "hour" ? (Number(s.rate) || 0) * (min / 60) : Number(s.rate) || 0);
export function wageChecks(D, s, month, st) {
  const out = []; const h = st.min / 60; const minW = Number(setting(D, "minWage")); const lim = Number(setting(D, "minijobLimit"));
  const pay = payFor(s, st.min);
  if (s.payType === "hour" && Number(s.rate) > 0 && Number(s.rate) < minW) out.push({ level: "crit", t: "Lương giờ " + eur(Number(s.rate)) + " thấp hơn mức tối thiểu " + eur(minW) });
  if (s.payType !== "hour" && h > 0 && Number(s.rate) > 0 && pay / h < minW) out.push({ level: "crit", t: "Lương thực tế " + eur(pay / h) + "/giờ, dưới mức tối thiểu " + eur(minW) + " (đã làm " + hours(st.min) + " giờ)" });
  if (s.contract === "Minijob") {
    if (pay > lim) out.push({ level: "crit", t: "Thu nhập " + eur(pay) + " vượt giới hạn Minijob " + eur(lim) });
    else if (s.payType === "hour" && month === monthKey(new Date())) {
      const d = new Date(); const dim = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(); const proj = (pay / d.getDate()) * dim;
      if (proj > lim) out.push({ level: "warn", t: "Dự báo cuối tháng " + eur(proj) + ", có thể vượt giới hạn Minijob " + eur(lim) });
    }
  }
  return out;
}

/* ---------- ingredient check ---------- */
export function checkInci(text) {
  const n = norm(text); const checked = n.trim().length > 3; const found = [];
  BANNED.forEach((b) => {
    const hit = b.aliases.some((a) => {
      const na = norm(a);
      if (na.trim().split(" ").length === 1) return new RegExp(" " + na.trim() + " (?!l )", "g").test(n);
      return n.includes(na);
    });
    if (hit) found.push(b);
  });
  return { checked, found };
}

/* ---------- hygiene & safety ---------- */
export const hasEmp = (D) => staffList(D).length > 0;
export const isBW = (D) => setting(D, "land") === "Baden-Württemberg";
export const applies = (D, it) => it.who === "all" || (it.who === "emp" && hasEmp(D)) || (it.who === "steri" && !!D.settings.hasSteri);
export const required = (D, it) => it.req === true || (it.req === "bw" && isBW(D));
export function itemState(D, it) {
  const r = D.safety[it.id] || {};
  if (!applies(D, it) || r.status === "na") return { level: "na", text: applies(D, it) ? "Không áp dụng" : "Không áp dụng cho tiệm của bạn" };
  if (r.status === "yes") {
    if (it.interval) {
      if (!r.date) return { level: "warn", text: "Có, nhưng chưa nhập ngày" };
      const m = monthsSince(r.date);
      if (m >= it.interval) return { level: required(D, it) ? "crit" : "warn", text: "Quá hạn (lần cuối " + deDate(r.date) + ")" };
      if (m >= it.interval - 1) return { level: "warn", text: "Sắp đến hạn (lần cuối " + deDate(r.date) + ")" };
    }
    return { level: "ok", text: r.date ? "Có · " + deDate(r.date) : "Có" };
  }
  return { level: required(D, it) ? "crit" : "warn", text: required(D, it) ? "Chưa có · bắt buộc" : "Chưa có · khuyến nghị" };
}
export function staffSafety(s) {
  const out = [];
  if (!s.unterweisung) out.push({ level: "crit", t: "Chưa có huấn luyện an toàn (Unterweisung)" });
  else if (monthsSince(s.unterweisung) >= 12) out.push({ level: "crit", t: "Huấn luyện an toàn quá 12 tháng (lần cuối " + deDate(s.unterweisung) + ")" });
  else if (monthsSince(s.unterweisung) >= 11) out.push({ level: "warn", t: "Huấn luyện an toàn sắp đến hạn" });
  if (s.feucht === "ge4" && !s.vorsorge) out.push({ level: "crit", t: "Làm việc ẩm ≥ 4 giờ/ngày: khám bắt buộc (Pflichtvorsorge) chưa có" });
  if (s.feucht === "2to4" && !s.vorsorge) out.push({ level: "warn", t: "Làm việc ẩm > 2 giờ/ngày: phải mời khám bằng văn bản (Angebotsvorsorge)" });
  return out;
}
export function disinfCheck(D, d) {
  const out = []; const e = d.eff || {}; const use = d.use || ""; const virB = e.bviruzid || e.viruzid; const fung = e.fungizid; const yeast = e.levurozid || e.fungizid;
  if (d.listed !== "VAH" && d.listed !== "RKI") out.push({ level: "crit", t: "Không có trong danh sách VAH hoặc RKI" });
  if (use.startsWith("Instrumente")) {
    if (!e.bakterizid) out.push({ level: "crit", t: "Dụng cụ: cần bakterizid" });
    if (isBW(D)) {
      if (!e.viruzid) out.push({ level: "crit", t: "Baden-Württemberg: dụng cụ cần viruzid (đầy đủ)" });
      if (!fung) out.push({ level: "crit", t: "Baden-Württemberg: dụng cụ cần fungizid" });
    } else {
      if (!virB) out.push({ level: "crit", t: "Dụng cụ: cần ít nhất begrenzt viruzid (HBV, HCV, HIV)" });
      if (!yeast) out.push({ level: "warn", t: "Dụng cụ: nên có levurozid hoặc fungizid" });
    }
  } else if (use.startsWith("Flächen") || use.startsWith("Hände")) {
    if (!e.bakterizid) out.push({ level: "warn", t: "Nên có bakterizid" });
    if (!virB) out.push({ level: "warn", t: "Nên có ít nhất begrenzt viruzid" });
  }
  const today = todayKey();
  if (d.expiry && d.expiry < today) out.push({ level: "crit", t: "Đã hết hạn sử dụng (" + deDate(d.expiry) + ")" });
  if (d.opened && Number(d.useMonths) > 0 && monthsSince(d.opened) >= Number(d.useMonths)) out.push({ level: "crit", t: "Quá thời gian dùng sau khi mở (mở ngày " + deDate(d.opened) + ")" });
  if (!d.contact) out.push({ level: "warn", t: "Chưa ghi thời gian tác dụng (Einwirkzeit)" });
  if ((use.startsWith("Hände") || use.startsWith("Haut")) && !d.opened) out.push({ level: "warn", t: "Ghi ngày mở chai lên sản phẩm" });
  return out;
}
export function hygPct(D, date) { const h = D.hygiene[date]; if (!h || !h.items) return 0; return DAILY.filter(([k]) => h.items[k]).length / DAILY.length; }
export const areaOf = (it) => (it.g === "Vệ sinh" ? "hyg" : "bgw");
export const hygHours = (D) => (D.settings.serviceType === "invasive" ? 40 : 8);
export const people = (D) => [{ key: "owner", name: D.settings.ownerName || "Chủ tiệm", role: "Chủ tiệm" }].concat(staffList(D).map((s) => ({ key: s.id, name: s.name, role: s.role || "Nhân viên" })));
export function courseRec(D, key, area) { const c = D.courses[key]; return c && c[area] && c[area].date ? c[area] : null; }
export function courseState(D, key, area) {
  const r = courseRec(D, key, area);
  if (!r) return { level: "crit", text: "Chưa học" };
  if (area === "hyg" && Number(r.hours) && Number(r.hours) < hygHours(D)) return { level: "warn", text: "Đã học " + r.hours + " giờ, cần " + hygHours(D) + " giờ" };
  return { level: "ok", text: "Đã học · " + deDate(r.date) + (area === "hyg" && r.hours ? " · " + r.hours + " giờ" : "") };
}

export function safetyAlerts(D) {
  const A = [];
  SAFETY.forEach((it) => { const st = itemState(D, it); if (st.level === "crit" || st.level === "warn") A.push({ level: st.level, title: "Hồ sơ: " + it.t, detail: it.de + " · " + st.text, go: areaOf(it) === "hyg" ? "ve-sinh" : "bgw" }); });
  staffList(D).forEach((s) => staffSafety(s).forEach((x) => A.push({ level: x.level, title: s.name + ": " + x.t, detail: "An toàn lao động", go: "bgw" })));
  people(D).forEach((p) => { const st = courseState(D, p.key, "hyg"); if (st.level !== "ok") A.push({ level: "warn", title: p.name + ": khóa học Hygiene " + st.text.toLowerCase(), detail: "Khóa " + hygHours(D) + " giờ", go: "ve-sinh" }); });
  if (hasEmp(D) && courseState(D, "owner", "bgw").level !== "ok") A.push({ level: "warn", title: "Chủ tiệm chưa học khóa An toàn lao động BGW", detail: "Cần cho mô hình chủ doanh nghiệp (DGUV Vorschrift 2)", go: "bgw" });
  const ds = Object.values(D.disinf);
  if (!ds.length) A.push({ level: "warn", title: "Chưa ghi chất khử trùng nào", detail: "Thêm chất khử trùng tay, bề mặt và dụng cụ đang dùng.", go: "ve-sinh" });
  ds.forEach((d) => disinfCheck(D, d).filter((x) => x.level === "crit").forEach((x) => A.push({ level: "crit", title: "Chất khử trùng " + d.name + ": " + x.t, detail: d.use || "", go: "ve-sinh" })));
  const y = new Date(); y.setDate(y.getDate() - 1); const yk = dateKey(y);
  const worked = D.days[yk] && Object.keys(D.days[yk].entries || {}).length;
  if (worked && hygPct(D, yk) < 1) A.push({ level: "warn", title: "Checklist vệ sinh hôm qua chưa hoàn thành", detail: Math.round(hygPct(D, yk) * 100) + "% · " + deDate(yk), go: "ve-sinh" });
  return A;
}

export function allAlerts(D) {
  const A = []; const month = monthKey(new Date()); const today = todayKey();
  staffList(D).forEach((s) => {
    [["idExp", "Ausweis / Pass"], ["permitExp", "Aufenthaltstitel"], ["contractExp", "Hợp đồng có thời hạn"]].forEach(([f, lab]) => {
      if (f === "permitExp" && s.permitNA) return; const v = s[f];
      if (!v) { if (f !== "contractExp") A.push({ level: f === "permitExp" ? "crit" : "warn", title: s.name + ": thiếu ngày hết hạn " + lab, detail: "Nhập vào hồ sơ nhân viên.", go: "nhan-vien" }); return; }
      const d = daysUntil(v);
      if (d < 0) A.push({ level: "crit", title: s.name + ": " + lab + " đã hết hạn", detail: "Hết hạn ngày " + deDate(v) + ".", go: "nhan-vien" });
      else if (d <= 60) A.push({ level: d <= 14 ? "crit" : "warn", title: s.name + ": " + lab + " hết hạn sau " + d + " ngày", detail: "Ngày " + deDate(v) + ".", go: "nhan-vien" });
    });
    if (!s.hasContract) A.push({ level: "crit", title: s.name + ": chưa có hợp đồng lao động bằng văn bản", detail: "Đánh dấu khi đã có bản ký.", go: "nhan-vien" });
    if (!s.registered) A.push({ level: "crit", title: s.name + ": chưa xác nhận đăng ký bảo hiểm", detail: "Minijob-Zentrale hoặc Krankenkasse.", go: "nhan-vien" });
    const st = monthStats(D, s.id, month);
    wageChecks(D, s, month, st).forEach((w) => A.push({ level: w.level, title: s.name + ": " + w.t, detail: monthLabel(month), go: "bang-gio" }));
    st.rows.forEach((r) => r.flags.forEach((f) => A.push({ level: f.level, title: s.name + ": " + f.t, detail: "Ngày " + deDate(r.date), go: "bang-gio" })));
  });
  Object.keys(D.days).filter((k) => k < today && !k.startsWith(month)).forEach((k) => {
    const e = D.days[k].entries || {};
    Object.keys(e).forEach((sid) => { if (e[sid].some((x) => x.out == null) && D.staff[sid]) A.push({ level: "warn", title: D.staff[sid].name + ": chưa ra ca", detail: "Ngày " + deDate(k), go: "bang-gio" }); });
  });
  Object.values(D.products).forEach((p) => {
    const r = checkInci(p.inci);
    if (r.found.length) A.push({ level: "crit", title: "Sản phẩm bị cấm: " + p.name, detail: "Chứa " + r.found.map((b) => b.key).join(", ") + ". Ngừng dùng, tách riêng và xử lý như rác thải đặc biệt.", go: "san-pham" });
    else if (!r.checked) A.push({ level: "warn", title: "Chưa kiểm tra thành phần: " + p.name, detail: "Dán danh sách INCI từ nhãn sản phẩm.", go: "san-pham" });
  });
  safetyAlerts(D).forEach((a) => A.push(a));
  return A.sort((a, b) => (a.level === "crit" ? 0 : 1) - (b.level === "crit" ? 0 : 1));
}

/* ---------- inspection document lists ---------- */
function itemDoc(D, id) { const it = SAFETY.find((x) => x.id === id); const st = itemState(D, it); return { t: it.t, de: it.de, lv: st.level, txt: st.text }; }
export function inspectionDocs(D, key) {
  const st = staffList(D); const m = monthKey(new Date());
  if (key === "zoll") {
    const open = st.some((s) => monthStats(D, s.id, m).open);
    const wage = st.some((s) => wageChecks(D, s, m, monthStats(D, s.id, m)).some((w) => w.level === "crit"));
    const permitBad = st.filter((s) => !s.permitNA && (!s.permitExp || daysUntil(s.permitExp) < 0)).length;
    const ta = (D.settings.taxName || "").trim();
    return [
      { t: "Bảng ghi giờ làm: bắt đầu, kết thúc, thời lượng mỗi ngày", de: "Arbeitszeitnachweise (§ 17 MiLoG), auf Deutsch", lv: !st.length ? "na" : open ? "warn" : "ok", txt: !st.length ? "Chưa có nhân viên" : open ? "Có ca chưa ra" : "Có trong ViBeautySAFE" },
      { t: "Hợp đồng lao động hoặc giấy ghi điều kiện làm việc chính", de: "Arbeitsverträge", lv: !st.length ? "na" : st.every((s) => s.hasContract) ? "ok" : "crit", txt: !st.length ? "—" : st.filter((s) => s.hasContract).length + "/" + st.length + " người" },
      { t: "Bảng lương và chứng từ trả lương (chuyển khoản)", de: "Lohnabrechnungen, Nachweise über Lohnzahlung", lv: ta ? "ok" : "warn", txt: ta ? "Ở Steuerberater: " + ta : "Ghi nơi lưu ở dưới" },
      { t: "Đăng ký bảo hiểm xã hội của từng người", de: "Meldungen zur Sozialversicherung", lv: !st.length ? "na" : st.every((s) => s.registered) ? "ok" : "crit", txt: !st.length ? "—" : st.filter((s) => s.registered).length + "/" + st.length + " người" },
      { t: "Hộ chiếu và giấy phép cư trú của nhân viên nước ngoài", de: "Pass, Aufenthaltstitel (§ 5 Abs. 3 SchwarzArbG)", lv: !st.length ? "na" : permitBad ? "crit" : "ok", txt: permitBad ? permitBad + " người thiếu/hết hạn" : "Hợp lệ" },
      { t: "Lương không thấp hơn mức tối thiểu", de: "Mindestlohn " + eur(Number(setting(D, "minWage"))) + "/Std.", lv: !st.length ? "na" : wage ? "crit" : "ok", txt: wage ? "Có người dưới mức" : "Đạt" },
    ];
  }
  if (key === "health") {
    const ds = Object.values(D.disinf); const bad = ds.filter((d) => disinfCheck(D, d).some((x) => x.level === "crit")).length;
    let sum = 0; for (let i = 1; i <= 14; i++) { const d = new Date(); d.setDate(d.getDate() - i); sum += hygPct(D, dateKey(d)); }
    const out = [itemDoc(D, "hygieneplan"), itemDoc(D, "rdplan"),
      { t: "Danh sách chất khử trùng: VAH/RKI, nồng độ, thời gian tác dụng", de: "Desinfektionsmittel-Übersicht", lv: !ds.length ? "crit" : bad ? "crit" : "ok", txt: !ds.length ? "Chưa ghi" : bad ? bad + " sản phẩm không đạt" : ds.length + " sản phẩm đạt" },
      itemDoc(D, "handhyg"), itemDoc(D, "instrument"), itemDoc(D, "sharps"), itemDoc(D, "waesche"),
      { t: "Checklist vệ sinh hằng ngày (14 ngày qua)", de: "Reinigungsnachweise", lv: sum / 14 >= 0.9 ? "ok" : "warn", txt: Math.round((sum / 14) * 100) + "% hoàn thành" }];
    if (D.settings.hasSteri) out.push(itemDoc(D, "steri"));
    if (isBW(D)) out.push({ t: "Ghi nhận đã hướng dẫn nhân viên về Hygieneplan (BW)", de: "Dokumentierte Unterweisung zum Hygieneplan", lv: itemState(D, SAFETY.find((x) => x.id === "hygieneplan")).level === "ok" ? "ok" : "crit", txt: "Lưu cùng Hygieneplan" });
    return out;
  }
  const uwBad = st.filter((s) => !s.unterweisung || monthsSince(s.unterweisung) >= 12).length;
  const vsBad = st.filter((s) => (s.feucht === "ge4" || s.feucht === "2to4") && !s.vorsorge).length;
  return [itemDoc(D, "gb"), itemDoc(D, "verzeichnis"), itemDoc(D, "sdb"), itemDoc(D, "anweisung"),
    { t: "Biên bản huấn luyện an toàn có chữ ký (hằng năm)", de: "Unterweisungsnachweise (§ 14 GefStoffV)", lv: !st.length ? "na" : uwBad ? "crit" : "ok", txt: !st.length ? "—" : uwBad ? uwBad + " người thiếu/quá hạn" : "Đủ" },
    itemDoc(D, "hautschutz"),
    { t: "Giấy mời khám và hồ sơ khám sức khỏe lao động", de: "Vorsorgekartei, Angebote zur Vorsorge (ArbMedVV)", lv: !st.length ? "na" : vsBad ? "crit" : "ok", txt: !st.length ? "—" : vsBad ? vsBad + " người còn thiếu" : "Đủ" },
    itemDoc(D, "betreuung"), itemDoc(D, "ersthelfer"), itemDoc(D, "verbandbuch"), itemDoc(D, "kasten"), itemDoc(D, "absaugung"), itemDoc(D, "mutterschutz"),
    { t: "Bảng ghi giờ làm (giờ vượt 8 tiếng/ngày phải ghi lại)", de: "Arbeitszeitnachweise nach ArbZG", lv: st.length ? "ok" : "na", txt: st.length ? "Có trong ViBeautySAFE" : "—" }];
}

/* ---------- CSV export ---------- */
export function exportMonthCsv(D, m) {
  const st0 = D.settings; const addr = [st0.street, [st0.zip, st0.city].filter(Boolean).join(" ")].filter(Boolean).join(", ");
  const hm2 = (ms) => { const d = new Date(ms); return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0"); };
  const lines = [["Arbeitszeitnachweis", monthLabel(m).replace("Tháng ", "")], ["Betrieb", st0.legalName || setting(D, "salonName")], ["Anschrift", addr], ["Inhaber/in", st0.ownerName || ""], ["Betriebsnummer", st0.betriebsnummer || ""], [], ["Mitarbeiter", "Vertrag", "Datum", "Beginn", "Ende", "Pause (Min.)", "Arbeitszeit (Std.)", "Bemerkung"]];
  staffList(D, true).forEach((s) => {
    const x = monthStats(D, s.id, m);
    x.rows.forEach((r) => lines.push([s.name, s.contract || "", deDate(r.date), hm2(r.first), r.last ? hm2(r.last) : "", String(Math.round(r.pause)), hours(r.work), r.flags.map((f) => f.t).join(" / ")]));
    if (x.rows.length) lines.push([s.name, "", "Summe", "", "", "", hours(x.min), ""]);
  });
  const csv = "﻿" + lines.map((l) => l.map((c) => '"' + String(c).replace(/"/g, '""') + '"').join(";")).join("\r\n");
  const fname = "Arbeitszeiten_" + String(setting(D, "salonName")).replace(/[^\w-]+/g, "_") + "_" + m + ".csv";
  const u = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a"); a.href = u; a.download = fname; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(u), 3000);
  return fname;
}
