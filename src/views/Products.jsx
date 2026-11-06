import { useState } from "react";
import { useStore } from "../store.jsx";
import { checkInci } from "../lib/logic.js";
import { BANNED, CATS } from "../lib/constants.js";
import { uid } from "../lib/utils.js";
import { PageHead, Empty, Status, Row, List, ModalHead, Field, Select, Check, ConfirmButton, Section, Muted, TableBox, Actions, Button, Grid } from "../components/ui.jsx";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";

export default function Products() {
  const { D, openModal } = useStore();
  const rank = (p) => { const r = checkInci(p.inci); return r.found.length ? 0 : r.checked ? 2 : 1; };
  const ps = Object.values(D.products).sort((a, b) => rank(a) - rank(b) || (a.name || "").localeCompare(b.name || "", "vi"));
  const open = (id) => openModal(<ProductForm pid={id} />);
  return (
    <>
      <PageHead title="Sản phẩm" actions={<Button onClick={() => open(null)}>Thêm sản phẩm</Button>}>Kiểm tra gel và sơn trong kho với danh sách chất bị cấm trong mỹ phẩm tại EU.</PageHead>
      <Section title="Chất đang kiểm tra">
        <List>
          {BANNED.map((b) => (
            <div key={b.key} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 px-4 py-3 text-sm">
              <span className="w-12 font-semibold text-destructive">{b.key}</span><span className="flex-1">{b.name}</span><span className="text-xs text-muted-foreground">CAS {b.cas} · cấm từ {b.since}</span>
            </div>
          ))}
        </List>
        <Muted>Kết quả chỉ mang tính tham khảo, dựa trên danh sách thành phần bạn cung cấp. Luôn xin nhà cung cấp xác nhận bằng văn bản.</Muted>
      </Section>
      {ps.length ? (
        <TableBox>
          <TableHeader><TableRow><TableHead>Sản phẩm</TableHead><TableHead>Loại</TableHead><TableHead>Kết quả</TableHead><TableHead>Xác nhận NCC</TableHead></TableRow></TableHeader>
          <TableBody>{ps.map((p) => {
            const r = checkInci(p.inci);
            return (
              <TableRow key={p.id} className="cursor-pointer" onClick={() => open(p.id)}>
                <TableCell><div className="font-medium">{p.name}</div><div className="text-xs text-muted-foreground">{p.brand}</div></TableCell>
                <TableCell>{p.cat || "—"}</TableCell>
                <TableCell>{r.found.length ? <Status level="crit">Chứa {r.found.map((b) => b.key).join(", ")}</Status> : r.checked ? <Status level="ok">Không thấy chất cấm</Status> : <Status level="warn">Chưa có thành phần</Status>}</TableCell>
                <TableCell>{p.supplierOk ? <Status level="ok">Có</Status> : <Status level="na">Chưa</Status>}</TableCell>
              </TableRow>);
          })}</TableBody>
        </TableBox>
      ) : <Empty>Chưa có sản phẩm. Bấm “Thêm sản phẩm” rồi dán danh sách INCI từ nhãn.</Empty>}
    </>
  );
}

function ProductForm({ pid }) {
  const { D, put, remove, toast, closeModal } = useStore();
  const [p, setP] = useState(() => (pid ? { ...D.products[pid] } : { id: uid(), name: "", brand: "", cat: CATS[0], inci: "", supplierOk: false }));
  const f = (k) => (v) => setP((o) => ({ ...o, [k]: v }));
  const r = checkInci(p.inci);
  const save = () => {
    const name = (p.name || "").trim(); if (!name) { toast("Hãy nhập tên sản phẩm"); return; }
    put("products", p.id, { ...p, name, brand: (p.brand || "").trim(), inci: (p.inci || "").trim(), checkedAt: Date.now() });
    closeModal(); toast("Đã lưu " + name);
  };
  return (
    <>
      <ModalHead title={pid ? p.name || "Sản phẩm" : "Thêm sản phẩm"} />
      <Grid>
        <Field label="Tên sản phẩm"><Input value={p.name} onChange={(e) => f("name")(e.target.value)} /></Field>
        <Field label="Hãng"><Input value={p.brand || ""} onChange={(e) => f("brand")(e.target.value)} /></Field>
      </Grid>
      <Field label="Loại"><Select value={p.cat} onChange={f("cat")}>{CATS.map((c) => <option key={c}>{c}</option>)}</Select></Field>
      <Field label="Thành phần (INCI)"><Textarea className="min-h-28 font-mono text-xs" value={p.inci || ""} onChange={(e) => f("inci")(e.target.value)} placeholder="Ví dụ: Di-HEMA Trimethylhexyl Dicarbamate, HEMA, Hydroxypropyl Methacrylate, …" /></Field>
      {r.found.length > 0 && <List><Row level="crit" title={"Phát hiện " + r.found.map((b) => b.name).join(", ")} detail="Không được bán, dùng hay lưu kho. Tách riêng và xử lý như rác thải đặc biệt." /></List>}
      {!r.found.length && r.checked && <List><Row level="ok" title="Không thấy chất bị cấm trong danh sách này" /></List>}
      <Check checked={p.supplierOk} onChange={f("supplierOk")}>Có giấy xác nhận của nhà cung cấp rằng sản phẩm không chứa TPO/DMTA</Check>
      <Actions>
        {pid && <ConfirmButton confirmText="Bấm lần nữa để xóa" onConfirm={() => { remove("products", pid); closeModal(); toast("Đã xóa sản phẩm"); }}>Xóa</ConfirmButton>}
        <span className="flex-1" />
        <Button variant="outline" onClick={closeModal}>Hủy</Button><Button onClick={save}>Lưu</Button>
      </Actions>
    </>
  );
}
