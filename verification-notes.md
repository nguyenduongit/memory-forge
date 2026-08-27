# Ghi nhận kiểm chứng — 27/08/2026

- Preview đang phục vụ đúng `Home.tsx` hiện tại: trang chính bắt đầu tại **chọn module**, sau đó đến **Học tập / Luyện tập / Thi đấu**.
- Nút trạng thái đồng bộ hiển thị **Lưu trên máy** khi chưa có phiên Supabase; đây là fallback không chặn gameplay.
- DOM của màn chọn chế độ có đủ ba mode, bao gồm **Thi đấu**, và màn Thi đấu cho phép chọn độ dài 20–200.
- Ảnh kiểm tra từ công cụ preview có thể giữ thumbnail lịch sử; kiểm chứng trực tiếp qua DOM của preview xác nhận bundle hiện tại là bản mobile mới.
