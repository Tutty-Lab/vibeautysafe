import { useState } from "react";
import { useStore } from "../store.jsx";
import { checkInci } from "../lib/logic.js";
import { BANNED, CATS } from "../lib/constants.js";
import { uid } from "../lib/utils.js";
import { PageHead, Empty, Status, Row, ModalHead, Field, Check, ConfirmButton, Section } from "../components/ui.jsx";

export default function Products() {
  const { D, openModal } = useStore();
  const rank = (p) => { const r = checkInci(p.inci); return r.found.length ? 0 : r.checked ? 2 : 1; };
  const ps = Object.values(D.products).sort((a, b) => rank(a) - rank(b) || (a.name || "").localeCompare(b.name || "", "vi"));
  const open = (id) => openModal(<ProductForm pid={id} />);
  return (
    <>
      <PageHead title="Sản phẩm" actions={<button className="btn primary" onClick={() => open(null)}>Thêm sản phẩm</button>}>
        Kiểm tra gel và sơn trong kho với danh sách chất bị cấm trong mỹ phẩm tại EU.
      </PageHead>
      <Section title="Chất đang kiểm tra">
        <div className="banned">
          {BANNED.map((b) => (
            <div key={b.key}><b className="mono">{b.key}</b><span>{b.name}</span><span className="mono muted small">CAS {b.cas} · cấm từ {b.since}</span></div>
          ))}
        </div>
        <p className="muted small">Kết quả chỉ mang tính tham khảo, dựa trên danh sách thành phần bạn cung cấp. Luôn xin nhà cung cấp xác nhận bằng văn bản.</p>
      </Section>
      {ps.length ? (
        <div className="table-wrap"><table>
          <thead><tr><th>Sản phẩm</th><th>Loại</th><th>Kết quả</th><th>Xác nhận NCC</th></tr></thead>
          <tbody>{ps.map((p) => {
            const r = checkInci(p.inci);
            return (
              <tr key={p.id} className="click" onClick={() => open(p.id)}>
                <td><b>{p.name}</b>{p.example && <span className="tag">Ví dụ</span>}<div className="muted small">{p.brand}</div></td>
                <td>{p.cat || "—"}</td>
                <td>{r.found.length ? <Status level="crit">Chứa {r.found.map((b) => b.key).join(", ")}</Status> : r.checked ? <Status level="ok">Không thấy chất cấm</Status> : <Status level="warn">Chưa có thành phần</Status>}</td>
                <td>{p.supplierOk ? <Status level="ok">Có</Status> : <Status level="na">Chưa</Status>}</td>
              </tr>);
          })}</tbody>
        </table></div>
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
    put("products", p.id, { ...p, name, brand: (p.brand || "").trim(), inci: (p.inci || "").trim(), example: p.example || false, checkedAt: Date.now() });
    closeModal(); toast("Đã lưu " + name);
  };
  return (
    <>
      <ModalHead title={pid ? p.name || "Sản phẩm" : "Thêm sản phẩm"} />
      <div className="grid2">
        <Field label="Tên sản phẩm"><input value={p.name} onChange={(e) => f("name")(e.target.value)} /></Field>
        <Field label="Hãng"><input value={p.brand || ""} onChange={(e) => f("brand")(e.target.value)} /></Field>
      </div>
      <Field label="Loại"><select value={p.cat} onChange={(e) => f("cat")(e.target.value)}>{CATS.map((c) => <option key={c}>{c}</option>)}</select></Field>
      <Field label="Thành phần (INCI)"><textarea value={p.inci || ""} onChange={(e) => f("inci")(e.target.value)} placeholder="Ví dụ: Di-HEMA Trimethylhexyl Dicarbamate, HEMA, Hydroxypropyl Methacrylate, …" /></Field>
      {r.found.length > 0 && <Row level="crit" title={"Phát hiện " + r.found.map((b) => b.name).join(", ")} detail="Không được bán, dùng hay lưu kho. Tách riêng và xử lý như rác thải đặc biệt." />}
      {!r.found.length && r.checked && <Row level="ok" title="Không thấy chất bị cấm trong danh sách này" />}
      <Check checked={p.supplierOk} onChange={f("supplierOk")}>Có giấy xác nhận của nhà cung cấp rằng sản phẩm không chứa TPO/DMTA</Check>
      <div className="actions">
        {pid && <ConfirmButton confirmText="Bấm lần nữa để xóa" onConfirm={() => { remove("products", pid); closeModal(); toast("Đã xóa sản phẩm"); }}>Xóa</ConfirmButton>}
        <span className="grow" />
        <button className="btn" onClick={closeModal}>Hủy</button><button className="btn primary" onClick={save}>Lưu</button>
      </div>
    </>
  );
}
