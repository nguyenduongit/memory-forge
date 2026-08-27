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

Deployment production của commit `f2645f9` tạo request trực tiếp đến ba endpoint Supabase REST `app_progress`, `memory_item_overrides` và `race_records`; không có request nào đến `/api/trpc`. Đây là luồng đọc dữ liệu chung không đăng nhập.

Trong deployment production, luồng chọn module hiển thị đủ ba mode và `localStorage` không có khóa nào thuộc Memory Forge. Kiểm chứng ghi sẽ diễn ra tự nhiên ở lượt Luyện tập hoặc Thi đấu đầu tiên của chủ ứng dụng để không tạo thành tích kiểm thử vào dữ liệu thật.

Luồng Học tập trên deployment production đi từ module qua chọn cụm đến thẻ `00`; thẻ hiển thị thao tác `Đổi liên tưởng` trực tiếp, không có bước đăng nhập.

Sheet `Đổi liên tưởng` trên production mở đúng cho mã `00`. Không gửi biểu mẫu kiểm thử để tránh thêm dữ liệu giả vào bộ dữ liệu chung của chủ ứng dụng.

Sau khi có xác nhận của chủ ứng dụng, đã lưu giá trị nhãn mặc định `Quả trứng` cho mã `00` trên deployment production. Sheet đóng lại bình thường sau thao tác, không thay đổi nội dung hiển thị.

Truy vấn read-only vào Supabase xác nhận hàng `memory_item_overrides` của mã `00` có `custom_label = Quả trứng`. Do đó thao tác UI production đã ghi trực tiếp vào cơ sở dữ liệu chung, không qua đăng nhập, localStorage hay route tRPC.

Với xác nhận của chủ ứng dụng, phiên Luyện tập cụm `00–09` đã bắt đầu trên production và đã trả lời câu đầu tiên. Khi hoàn tất 10 câu, ứng dụng sẽ ghi tiến độ phiên vào Supabase.

Phiên Luyện tập production đang tiếp tục bình thường qua các câu hỏi hai chiều số–hình; sau khi hoàn tất sẽ đối chiếu hàng tiến độ thật trong Supabase.

Đã hoàn thành thêm các bước trả lời trong phiên Luyện tập được phê duyệt; luồng vẫn ở màn câu hỏi và không có lỗi hiển thị.

Phiên Luyện tập tiếp tục ổn định sau hai câu trả lời bổ sung; khi kết thúc, dữ liệu phiên sẽ được đối chiếu trong Supabase.

Đã đến câu cuối của phiên Luyện tập production; lượt trả lời kế tiếp sẽ kích hoạt lưu `practice_sessions` và `app_progress` trực tiếp vào Supabase.

Phiên Luyện tập production đã hoàn tất với 10/10. Đối chiếu read-only trên Supabase xác nhận một hàng `practice_sessions` hoàn thành có `scope_size = 10`, `correct_count = 10`, `question_count = 10`; hàng `app_progress` chung có `total_xp = 100` và `current_streak = 1`. Đây là kiểm chứng ghi tiến độ game end-to-end từ UI Vercel trực tiếp vào Supabase.
