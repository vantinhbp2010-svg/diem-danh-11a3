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

## Cấu trúc quan trọng
- `src/App.jsx` — giao diện chính và các tab.
- `src/TabDashboard.jsx` — dashboard chuyên cần.
- `src/TabThongBao.jsx` — thông báo phụ huynh.
- `src/TabQRCode.jsx` — QR code và quét điểm danh.
- `public/_redirects` — route SPA cho Cloudflare Pages.
- `wrangler.toml` — cấu hình Pages.
- `.github/workflows/deploy.yml` — tự động deploy.

