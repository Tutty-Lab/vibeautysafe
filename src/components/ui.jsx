import { useState } from "react";
import { daysUntil, deDate } from "../lib/utils.js";
import { DEV } from "../lib/constants.js";
import { useStore } from "../store.jsx";

const LV_TEXT = { ok: "Ổn", warn: "Lưu ý", crit: "Khẩn" };

/* Status marker: small square + label. level: ok | warn | crit | na | live */
export function Status({ level, children, title }) {
  return <span className={"st st-" + (level || "na")} title={title}>{children ?? LV_TEXT[level] ?? ""}</span>;
}

export function ExpStatus({ value }) {
  if (!value) return <Status level="crit">Chưa nhập</Status>;
  const d = daysUntil(value);
  const lv = d < 0 || d <= 14 ? "crit" : d <= 60 ? "warn" : "ok";
  return <Status level={lv}><span className="mono">{deDate(value)}</span></Status>;
}

export function PageHead({ kicker, title, children, actions }) {
  return (
    <header className="page-head">
      <div>
        {kicker && <div className="kicker">{kicker}</div>}
        <h1>{title}</h1>
        {children && <p className="lede">{children}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </header>
  );
}

export function Empty({ children }) { return <div className="empty">{children}</div>; }

export function Section({ title, aside, children, className }) {
  return (
    <section className={"section " + (className || "")}>
      {(title || aside) && <div className="section-head"><h2>{title}</h2>{aside}</div>}
      {children}
    </section>
  );
}

export function Tabs({ tabs, value, onChange }) {
  return (
    <div className="seg" role="tablist">
      {tabs.map(([k, l]) => (
        <button key={k} role="tab" aria-selected={value === k} onClick={() => onChange(k)}>{l}</button>
      ))}
    </div>
  );
}

export function Row({ level, title, de, detail, right, onClick, as }) {
  const Tag = as || (onClick ? "button" : "div");
  return (
    <Tag className={"line lv-" + (level || "na") + (onClick ? " clickable" : "")} onClick={onClick} type={Tag === "button" ? "button" : undefined}>
      <span className="bar" aria-hidden="true" />
      <div className="line-main">
        <div className="line-t">{title}</div>
        {de && <div className="line-de" lang="de">{de}</div>}
        {detail && <div className="line-d">{detail}</div>}
      </div>
      {right && <div className="line-r">{right}</div>}
    </Tag>
  );
}

export function Field({ label, children, wide }) {
  return <label className={"f" + (wide ? " wide" : "")}><span>{label}</span>{children}</label>;
}

export function Check({ checked, onChange, children }) {
  return <label className="check"><input type="checkbox" checked={!!checked} onChange={(e) => onChange(e.target.checked)} /> <span>{children}</span></label>;
}

export function ConfirmButton({ children, confirmText = "Bấm lần nữa để xác nhận", onConfirm, className = "btn danger" }) {
  const [armed, setArmed] = useState(false);
  return <button type="button" className={className} onClick={() => (armed ? onConfirm() : setArmed(true))} onBlur={() => setArmed(false)}>{armed ? confirmText : children}</button>;
}

export function ModalHead({ title, sub }) {
  return <div className="modal-head"><h3>{title}</h3>{sub && <div className="muted small">{sub}</div>}</div>;
}

export function PinPad({ title, hint, length, onComplete, onCancel }) {
  const [pin, setPin] = useState("");
  const { toast } = useStore();
  const press = async (k) => {
    let next = pin;
    if (k === "⌫") next = pin.slice(0, -1); else if (pin.length < length) next = pin + k;
    setPin(next);
    if (next.length === length) {
      const ok = await onComplete(next);
      if (!ok) { setPin(""); toast("Sai mã PIN"); }
    }
  };
  return (
    <>
      <ModalHead title={title} sub={hint} />
      <div className="pin" aria-live="polite">{Array.from({ length }, (_, i) => <span key={i} className={pin[i] ? "on" : ""} />)}</div>
      <div className="pad">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, "", 0, "⌫"].map((k, i) => (k === "" ? <span key={i} /> : <button type="button" key={i} className="btn" onClick={() => press(String(k))} aria-label={k === "⌫" ? "Xóa" : String(k)}>{k}</button>))}
      </div>
      <button type="button" className="btn" onClick={onCancel}>Hủy</button>
    </>
  );
}

export function ContactBox() {
  const { toast } = useStore();
  const cp = (v) => navigator.clipboard?.writeText(v).then(() => toast("Đã sao chép " + v), () => toast(v));
  return (
    <div className="contact">
      <div><b>Cần tư vấn hoặc hỗ trợ?</b><div className="muted small">{DEV.name}</div></div>
      <div className="contact-links">
        <span>Email <a href={"mailto:" + DEV.email}>{DEV.email}</a> <button className="btn ghost sm" onClick={() => cp(DEV.email)}>Sao chép</button></span>
        <span>Tel <a href="tel:+4917616789999">{DEV.tel}</a> <button className="btn ghost sm" onClick={() => cp(DEV.tel)}>Sao chép</button></span>
      </div>
    </div>
  );
}

export function SrcLinks({ keys, map }) {
  return <ul className="src">{keys.map((k) => <li key={k}><a href={map[k][1]} target="_blank" rel="noopener noreferrer">{map[k][0]}</a></li>)}</ul>;
}
