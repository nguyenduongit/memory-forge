# Memory Forge — Kế hoạch triển khai

## Mục tiêu

Xây dựng game PWA tiếng Việt giúp ghi nhớ mã số `00`–`99` bằng liên tưởng hình ảnh, với lộ trình `10 → 50 → 100`, phản xạ hai chiều, cá nhân hóa và hồ sơ thành tích riêng.

## Các lát cắt rủi ro và tiêu chí xác minh

| Lát cắt | Rủi ro chính | Tiêu chí hoàn thành có thể quan sát |
|---|---|---|
| Luật ghi nhớ | Mất số 0 đứng đầu hoặc cho phép luyện mã chưa mở | Mọi mã hiển thị hai ký tự; thẻ khóa không xuất hiện trong phiên luyện |
| Luyện phản xạ | Đo thời gian/đáp án sai hoặc phản hồi chậm | Người học thấy phản hồi đúng/sai ngay sau lựa chọn và kết quả có thời gian trung bình |
| Tiến độ | Thay đổi dữ liệu không đồng bộ khi người học quay lại | Dashboard phản ánh cùng accuracy, XP và scope sau phiên kết thúc |
| Cá nhân hóa | Lệch catalog mặc định hoặc mất ảnh | Người học đổi nhãn/hình riêng, khôi phục mặc định, catalog nền vẫn nguyên vẹn |
| PWA | Offline bị hiểu là đã đồng bộ dữ liệu | App shell và màn hình luyện cốt lõi dùng được khi mất mạng, có trạng thái rõ khi không thể lưu |

## Phạm vi xây dựng chính

Game dùng gameplay thẻ học và câu hỏi phản xạ thay vì một canvas 3D, bởi tương tác trọng tâm là nhận diện và gợi nhớ nhanh. UI sẽ có lộ trình, bộ sưu tập thẻ, phiên luyện có timer đơn điệu, tổng kết và khung cá nhân hóa. Hình định hướng tại `/manus-storage/memory-forge-visual-reference_393ca62d.png` neo palette xanh than chì, giấy ngà, hổ phách và xanh ngọc.

| Hệ thống | Nội dung cần có | Tiêu chí kiểm tra |
|---|---|---|
| Lộ trình | Mốc 10/50/100, trạng thái mở khóa, XP và chuỗi | Scope 10 sẵn sàng, 50/100 hiển thị điều kiện mở khóa rõ |
| Thẻ học | Mã hai ký tự, hình, nhãn, tiến độ từng thẻ | Mã `00` không bị rút thành `0`; thẻ chưa mở bị khóa |
| Luyện phản xạ | Hai chiều, bốn lựa chọn, timer bằng `performance.now()` | Đáp án đổi trạng thái tức thời, lượt kế tiếp chỉ sau phản hồi |
| Cá nhân hóa | Chỉnh nhãn và ảnh thay thế riêng | Thay đổi chỉ tác động góc nhìn người học; có hoàn nguyên |
| PWA | Manifest, app shell cache và thông báo offline | Có thể cài đặt khi trình duyệt hỗ trợ; không hứa đồng bộ offline |
| Dữ liệu | Lưu summary phiên, hiệu năng và achievement | Refresh giao diện không làm mất tiến độ đã lưu |

## Tiêu chí bàn giao

Game phải có bố cục tinh tế, hoạt động trên điện thoại và desktop, hỗ trợ bàn phím/chạm, kiểm thử nghiệp vụ qua Vitest, không có bí mật trong repository và được chuẩn bị để xuất bản.
