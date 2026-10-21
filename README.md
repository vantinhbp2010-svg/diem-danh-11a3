# Điểm danh 11A3

Ứng dụng quản lý điểm danh, lịch trình, thi đua và báo cáo học sinh lớp 11A3.

## Tính năng chính
- Điểm danh theo buổi, tiết, có tính ngày, giờ và điểm trừ.
- Dashboard chuyên cần 7 ngày gần nhất với biểu đồ báo cáo.
- Tab thông báo phụ huynh với mẫu tin nhắn và lưu lịch sử gửi.
- QR Code để in cho học sinh và quét điểm danh nhanh.
- PWA offline và hỗ trợ cài đặt lên màn hình chính.
- Hỗ trợ deploy lên Cloudflare Pages.

## Cài đặt

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Deploy

```bash
npm run deploy
```

Đảm bảo Git remote đã được cấu hình và các secrets Cloudflare đã được thêm vào GitHub Actions.

## Chatbot Groq

Chatbot gọi Groq API qua endpoint máy chủ `/api/chat`. Không đặt API key trong mã frontend hoặc biến `VITE_*`.

- **Cloudflare Pages:** thêm `GROQ_API_KEY` trong Settings → Variables and Secrets của Pages project (Production; thêm Preview nếu cần), sau đó deploy lại.
- **Vercel:** thêm `GROQ_API_KEY` trong Project Settings → Environment Variables cho các môi trường cần dùng, sau đó redeploy.
- **Chạy Cloudflare Function local:** tạo `.dev.vars` ở thư mục gốc với `GROQ_API_KEY=...`, chạy `npm run build`, sau đó `npx wrangler pages dev dist`. Không dùng `npm run dev` để kiểm tra endpoint serverless.

Tạo API key tại [Groq Console](https://console.groq.com/keys). Giới hạn tốc độ và mức sử dụng tùy model/tài khoản; chuyển nhà cung cấp không đảm bảo bỏ hoàn toàn rate limit.

## Cấu trúc quan trọng
- `src/App.jsx` — giao diện chính và các tab.
- `src/TabDashboard.jsx` — dashboard chuyên cần.
- `src/TabThongBao.jsx` — thông báo phụ huynh.
- `src/TabQRCode.jsx` — QR code và quét điểm danh.
- `public/_redirects` — route SPA cho Cloudflare Pages.
- `wrangler.toml` — cấu hình Pages.
- `.github/workflows/deploy.yml` — tự động deploy.
