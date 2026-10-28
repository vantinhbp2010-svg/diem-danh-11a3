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

## Di chuyển dữ liệu Firestore sang cấu trúc mới

Trước khi cập nhật ứng dụng, hãy tạo backup Firestore. Tài khoản dịch vụ cần quyền đọc/ghi Firestore; thiết lập một trong hai biến môi trường:

- `GOOGLE_APPLICATION_CREDENTIALS` trỏ đến file service account JSON.
- `FIREBASE_SERVICE_ACCOUNT` chứa JSON service account và tùy chọn `FIREBASE_PROJECT_ID`.

Chạy lệnh sau một lần trước khi triển khai phiên bản mới:

```bash
npm run migrate:firebase
```

Script giữ nguyên dữ liệu cũ, không ghi đè tài liệu đích đã tồn tại và chuyển điểm danh cũ sang `diemdanh/diemdanh_thang_YYYY-MM`, khuôn mặt/TKB sang tài liệu con theo lớp. Không xóa tài liệu nguồn cho đến khi đã xác nhận dữ liệu mới hoạt động và có backup.

## Bật xác thực giáo viên và Firestore Rules

Đăng nhập giáo viên dùng Firebase Authentication email/password; không còn tài khoản/mật khẩu mặc định lưu trong mã nguồn. Trước khi phát hành bản mới:

1. Trong Firebase Console, bật **Authentication → Sign-in method → Email/Password**, rồi tạo tài khoản giáo viên.
2. Lấy UID của tài khoản đó. Thiết lập `FIREBASE_TEACHER_UID` và một trong hai biến thông tin service account như hướng dẫn ở trên, sau đó chạy:

   ```powershell
   $env:FIREBASE_TEACHER_UID = "UID_TAI_KHOAN"
   npm run firebase:grant-teacher
   ```

3. Trong Firebase Console → Firestore Database → Rules, thay Rules hiện tại bằng nội dung trong [`firestore.rules`](./firestore.rules) và publish.
4. Triển khai ứng dụng. Giáo viên cần đăng nhập lại sau khi được cấp claim.

Claim `teacher: true` chỉ cấp qua Admin SDK; không cấp quyền từ dữ liệu client hoặc mã lớp. Rules cho phép khách đọc danh sách lớp/điểm danh tháng và đọc/tạo tin chờ duyệt để giữ trang học sinh hoạt động; dữ liệu khuôn mặt và TKB chỉ giáo viên đọc/ghi. Nếu điểm danh/lớp không nên công khai, cần đổi luồng truy cập khách trước khi mở Rules.

### Sao lưu Firestore tự động trên Vercel

Vercel Cron gọi `GET /api/cron-backup` hàng ngày lúc **23:00 giờ Việt Nam (16:00 UTC)**. Endpoint yêu cầu `Authorization: Bearer <CRON_SECRET>` do Vercel Cron gửi và lưu JSON snapshot vào một Google Cloud Storage bucket riêng tư trong cùng project.

1. Tạo bucket backup trong Google Cloud/Firebase project và giữ quyền truy cập công khai tắt.
2. Cấp service account đang dùng bởi `FIREBASE_SERVICE_ACCOUNT` quyền **Storage Object Creator** chỉ trên bucket backup. Giữ quyền Firestore cần thiết cho Admin SDK.
3. Trong Vercel → Project Settings → Environment Variables, cấu hình:
   - `CRON_SECRET`: chuỗi ngẫu nhiên tối thiểu 32 ký tự; chỉ dùng ở Production.
   - `FIREBASE_BACKUP_BUCKET`: tên bucket, không gồm `gs://`.
   - `FIREBASE_SERVICE_ACCOUNT` và `FIREBASE_PROJECT_ID` hiện có.
4. Deploy Production. Cron của Vercel chạy trên Production deployment; kiểm tra **Vercel → Logs/Functions → `/api/cron-backup`** và xác nhận phản hồi có `ok: true`.
5. Kiểm tra bucket có object mới dưới `firestore-backups/`. Thiết lập lifecycle/retention của bucket theo chính sách lưu trữ trường học và kiểm tra định kỳ khả năng khôi phục.

Backup chứa dữ liệu học sinh và khuôn mặt; bucket không được công khai. Không ghi service account JSON, `CRON_SECRET` hoặc URL/token truy cập bucket vào Git. Khóa service account từng bị lộ cần được thu hồi và thay mới trước khi triển khai.

Firestore Rules không đo chính xác số byte đã serialize của document bằng `data.size()`; giới hạn 1 MiB được Firestore áp dụng ở tầng dịch vụ. Chia theo tháng giúp tránh document tăng mãi nhưng vẫn cần theo dõi nếu một tháng/lớp có dữ liệu bất thường lớn.

## Quản lý tài khoản giáo viên (Vercel)

Các API quản lý tài khoản nằm trong `api/admin/` và dùng Firebase Admin SDK phía máy chủ. Chúng yêu cầu bearer ID token hợp lệ với custom claim `admin: true`; không dùng cờ LocalStorage để phân quyền. Trên Vercel, cấu hình `FIREBASE_SERVICE_ACCOUNT` bằng toàn bộ JSON service account và `FIREBASE_PROJECT_ID` trong Project Settings → Environment Variables. Không commit service account vào Git.

Để chạy các API này ở local, dùng `vercel dev` thay cho `npm run dev`; cần đăng nhập Vercel CLI và cấu hình các biến môi trường local. `npm run dev` chỉ chạy Vite frontend, không khởi động các endpoint trong `api/`.

Để cấp quyền quản trị ban đầu cho một tài khoản Firebase Authentication đã tạo, dùng cùng service account có quyền Firebase Admin:

```powershell
$env:FIREBASE_ADMIN_UID = "UID_TAI_KHOAN_QUAN_TRI"
npm run firebase:grant-admin
```

Sau đó đăng nhập lại bằng tài khoản quản trị. Admin có thể tạo giáo viên với mật khẩu từ 8 đến 128 ký tự và xóa tài khoản giáo viên; API từ chối các yêu cầu chưa xác thực, không có claim admin, hoặc cố xóa tài khoản quản trị. Các API này chạy trên Vercel Functions; khi deploy frontend chỉ lên Cloudflare Pages, cần triển khai các API trên Vercel cùng domain/proxy `/api/admin/*` thì chức năng mới khả dụng.

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

Mã nguồn không dùng Gemini SDK hoặc `GEMINI_API_KEY`; SDK không dùng đã được gỡ khỏi dependencies. Nếu biến `GEMINI_API_KEY` còn trong Vercel, xóa nó thủ công tại **Project Settings → Environment Variables** cho mọi môi trường, rồi redeploy nếu cần.

## Cấu trúc quan trọng
- `src/App.jsx` — giao diện chính và các tab.
- `public/_redirects` — route SPA cho Cloudflare Pages.
- `wrangler.toml` — cấu hình Pages.
- `.github/workflows/deploy.yml` — tự động deploy.
