# Thiết lập deploy lên Cloudflare Pages

1. Đăng ký tài khoản Cloudflare và vào dashboard.
2. Vào `Workers & Pages` > `Create` > `Pages` để tạo project `diem-danh-11a3`.
3. Mở `Account Settings` > `API Tokens` và tạo token theo template `Edit Cloudflare Workers`.
4. Lấy `Account ID` từ dashboard và lưu lại.
5. Trên GitHub, vào `Settings` > `Secrets and variables` > `Actions`, thêm:
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`
   - `GITHUB_TOKEN` (hệ thống tự tạo khi dùng GitHub Actions)
6. Push code lên branch `main`, rồi kiểm tra workflow `Deploy to Cloudflare Pages`.
7. Nếu cần, thêm custom domain ở phần `Custom domains` của Cloudflare Pages.

Lưu ý: project sẽ build từ thư mục `dist` và chạy route `/index.html 200` qua `public/_redirects`.
