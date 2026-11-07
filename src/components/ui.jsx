import { useLayoutEffect, useRef, useState } from "react";
import { cn, daysUntil, deDate } from "@/lib/utils.js";
import { DEV } from "@/lib/constants.js";
import { useStore } from "@/store.jsx";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { NativeSelect } from "@/components/ui/native-select";
import { Tabs as TabsRoot, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table } from "@/components/ui/table";
import { DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export { Button };

const LV_CLASS = {
  ok: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  warn: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  crit: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  live: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
  na: "bg-muted text-muted-foreground",
};
const LV_TEXT = { ok: "Ổn", warn: "Lưu ý", crit: "Khẩn" };

export function Status({ level, children, title }) {
  return <Badge variant="secondary" title={title} className={cn("rounded-md font-medium", LV_CLASS[level] || LV_CLASS.na)}>{children ?? LV_TEXT[level] ?? ""}</Badge>;
}

export function ExpStatus({ value }) {
  if (!value) return <Status level="crit">Chưa nhập</Status>;
  const d = daysUntil(value);
  return <Status level={d <= 14 ? "crit" : d <= 60 ? "warn" : "ok"}>{deDate(value)}</Status>;
}

export function PageHead({ title, children, actions }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {children && <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{children}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Empty({ children }) {
  return <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">{children}</div>;
}

export function Section({ title, aside, children }) {
  return (
    <section className="flex flex-col gap-3">
      {(title || aside) && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold">{title}</h2>
          {aside}
        </div>
      )}
      {children}
    </section>
  );
}

export function Panel({ className, children }) {
  return <div className={cn("rounded-lg border bg-card p-4 text-sm", className)}>{children}</div>;
}

export function Tabs({ tabs, value, onChange }) {
  return (
    <TabsRoot value={value} onValueChange={onChange}>
      <div className="-mx-1 overflow-x-auto px-1 pb-1">
        <TabsList variant="line">
          {tabs.map(([k, l]) => <TabsTrigger key={k} value={k} className="px-3">{l}</TabsTrigger>)}
        </TabsList>
      </div>
    </TabsRoot>
  );
}

const BAR = { crit: "bg-red-500", warn: "bg-amber-500", ok: "bg-emerald-500" };

export function List({ children }) {
  return <div className="divide-y overflow-hidden rounded-lg border bg-card">{children}</div>;
}

export function Row({ level, title, de, detail, right, onClick }) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag type={onClick ? "button" : undefined} onClick={onClick}
      className={cn("flex w-full items-start gap-3 py-3 pr-4 text-left text-sm", onClick && "cursor-pointer hover:bg-muted/50")}>
      <span className={cn("w-1 self-stretch rounded-r", BAR[level] || "bg-transparent")} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <div className="font-medium">{title}</div>
        {de && <div className="text-xs italic text-muted-foreground" lang="de">{de}</div>}
        {detail && <div className="mt-1 text-muted-foreground">{detail}</div>}
      </div>
      {right && <div className="flex shrink-0 flex-col items-end gap-1.5">{right}</div>}
    </Tag>
  );
}

/* On phones each row becomes a card; cells get their column name from the header via data-label. */
export function TableBox({ children }) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const el = ref.current; if (!el) return;
    const heads = [...el.querySelectorAll("thead th")].map((th) => th.textContent.trim());
    el.querySelectorAll("tbody tr").forEach((tr) => [...tr.children].forEach((td, i) => { if (heads[i]) td.setAttribute("data-label", heads[i]); else td.removeAttribute("data-label"); }));
  });
  return <div ref={ref} className="rtable rounded-lg border bg-card max-md:border-0 max-md:bg-transparent"><Table>{children}</Table></div>;
}

export function Field({ label, children, className }) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <Label className="text-muted-foreground font-normal leading-snug">{label}</Label>
      {children}
    </div>
  );
}

export function Select({ value, onChange, children, className, ...rest }) {
  return <NativeSelect className={cn("w-full", className)} value={value} onChange={(e) => onChange(e.target.value)} {...rest}>{children}</NativeSelect>;
}

export function Check({ checked, onChange, children }) {
  return (
    <Label className="cursor-pointer items-start font-normal leading-snug">
      <Checkbox checked={!!checked} onCheckedChange={(v) => onChange(!!v)} className="mt-px" />
      <span>{children}</span>
    </Label>
  );
}

export function ConfirmButton({ children, confirmText = "Bấm lần nữa để xác nhận", onConfirm, variant = "destructive", size }) {
  const [armed, setArmed] = useState(false);
  return <Button type="button" variant={variant} size={size} onClick={() => (armed ? onConfirm() : setArmed(true))} onBlur={() => setArmed(false)}>{armed ? confirmText : children}</Button>;
}

export function ModalHead({ title, sub }) {
  return (
    <DialogHeader>
      <DialogTitle>{title}</DialogTitle>
      {sub && <DialogDescription>{sub}</DialogDescription>}
    </DialogHeader>
  );
}

export function Actions({ children }) {
  return <div className="flex flex-wrap items-center gap-2 pt-2">{children}</div>;
}

export function PinPad({ title, hint, length, onComplete, onCancel }) {
  const [pin, setPin] = useState("");
  const { toast } = useStore();
  const press = async (k) => {
    let next = pin;
    if (k === "⌫") next = pin.slice(0, -1); else if (pin.length < length) next = pin + k;
    setPin(next);
    if (next.length === length) { const ok = await onComplete(next); if (!ok) { setPin(""); toast("Sai mã PIN"); } }
  };
  return (
    <>
      <ModalHead title={title} sub={hint} />
      <div className="flex justify-center gap-3 py-2" aria-live="polite">
        {Array.from({ length }, (_, i) => <span key={i} className={cn("size-3.5 rounded-full border-2", pin[i] ? "border-foreground bg-foreground" : "border-muted-foreground/40")} />)}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, "", 0, "⌫"].map((k, i) => (k === "" ? <span key={i} /> :
          <Button key={i} variant="outline" className="h-14 text-xl" onClick={() => press(String(k))} aria-label={k === "⌫" ? "Xóa" : String(k)}>{k}</Button>))}
      </div>
      <Button variant="ghost" onClick={onCancel}>Hủy</Button>
    </>
  );
}

export function ContactBox() {
  const { toast } = useStore();
  const cp = (v) => navigator.clipboard?.writeText(v).then(() => toast("Đã sao chép " + v), () => toast(v));
  return (
    <Panel className="flex flex-wrap items-center justify-between gap-3">
      <div><div className="font-medium">Cần tư vấn hoặc hỗ trợ?</div><div className="text-muted-foreground">{DEV.name}</div></div>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        <span className="flex items-center gap-1">Email <a className="underline" href={"mailto:" + DEV.email}>{DEV.email}</a><Button variant="ghost" size="xs" onClick={() => cp(DEV.email)}>Sao chép</Button></span>
        <span className="flex items-center gap-1">Tel <a className="underline" href="tel:+4917616789999">{DEV.tel}</a><Button variant="ghost" size="xs" onClick={() => cp(DEV.tel)}>Sao chép</Button></span>
      </div>
    </Panel>
  );
}

export function SrcLinks({ keys, map }) {
  return <ul className="list-disc space-y-1 pl-5 text-sm">{keys.map((k) => <li key={k}><a className="underline underline-offset-2" href={map[k][1]} target="_blank" rel="noopener noreferrer">{map[k][0]}</a></li>)}</ul>;
}

export const Muted = ({ children, className }) => <p className={cn("text-sm text-muted-foreground", className)}>{children}</p>;
export const Grid = ({ children, className }) => <div className={cn("grid gap-4 sm:grid-cols-2", className)}>{children}</div>;
