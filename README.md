# ViBeautySAFE

React + Vite. Dữ liệu lưu trong `localStorage` của trình duyệt (không có backend).

## Chạy local

```bash
npm install
npm run dev
```

## Deploy lên Vercel

1. Đẩy thư mục này lên GitHub.
2. Trên vercel.com → **Add New Project** → chọn repo. Vercel tự nhận Vite (Build: `npm run build`, Output: `dist`).
3. Hoặc dùng CLI: `npx vercel` rồi `npx vercel --prod`.

App dùng hash routing (`#tong-quan`, `#bgw`…) nên không cần cấu hình rewrite.
