# Ghi nhận kiểm chứng — 27/08/2026

- Preview đang phục vụ đúng `Home.tsx` hiện tại: trang chính bắt đầu tại **chọn module**, sau đó đến **Học tập / Luyện tập / Thi đấu**.
- Nút trạng thái đồng bộ hiển thị **Lưu trên máy** khi chưa có phiên Supabase; đây là fallback không chặn gameplay.
- DOM của màn chọn chế độ có đủ ba mode, bao gồm **Thi đấu**, và màn Thi đấu cho phép chọn độ dài 20–200.
- Ảnh kiểm tra từ công cụ preview có thể giữ thumbnail lịch sử; kiểm chứng trực tiếp qua DOM của preview xác nhận bundle hiện tại là bản mobile mới.

## Kiểm chứng kiến trúc một người dùng — 27/08/2026

Preview sau khi chỉnh UI không còn hiển thị nút, email hay trạng thái đăng nhập/ghi cục bộ. URL `/sw.js?v=sync-v4` trả về JavaScript service worker đúng nội dung; lỗi đăng ký chỉ xuất hiện trong preview phát triển và cần được kiểm tra lại trước phát hành.

Endpoint `memory.snapshot` trả về HTTP 200 trong trình duyệt không có phiên đăng nhập, với cấu trúc tiến độ chung `{ totalXp, completedGroups, currentStreak, overrides }`. Điều này xác nhận tRPC không còn yêu cầu access token cho mô hình một người dùng.

Sau khi sửa handler fallback của service worker, `navigator.serviceWorker.getRegistration()` xác nhận worker đang active trên preview; UI trang chính không có form, nút hoặc thông báo đăng nhập.

Commit `28b28e4` đã được đẩy lên GitHub. Deployment Vercel từ chính SHA này ở trạng thái `READY`; cả URL deployment và alias nhánh main đều trả về giao diện module mobile không còn thông tin đăng nhập.

Preview sau khi chuyển lớp active sang Supabase browser client tải giao diện không đăng nhập và không phát sinh lỗi trong console trình duyệt.
