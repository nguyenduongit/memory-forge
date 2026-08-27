# Memory Forge — Cấu trúc ứng dụng

Ứng dụng sử dụng các tính năng React ở `client/src`, backend tRPC ở `server` và schema Drizzle ở `drizzle`. Module Nhớ số sẽ được tách thành catalog, luật chấm/mở khóa và màn hình trình bày để có thể thêm module mới mà không lặp lại logic tiến độ.

```text
client/src/
  app/                  providers, router và PWA
  core/                 primitives giao diện, format và hằng số dùng chung
  modules/number-memory/
    domain/             catalog, scoring, progression
    presentation/       screens và state phiên luyện
server/
  routers/              contracts tRPC cho tiến độ và phiên
  db.ts                 persistence helpers
drizzle/
  schema.ts             dữ liệu tiến độ và thành tích
```

Giao diện chỉ gọi backend qua tRPC. Các thao tác ảnh cá nhân dùng lưu trữ riêng, metadata nằm trong database. Dữ liệu trả lời từng câu chỉ ở bộ nhớ của phiên; chỉ summary được ghi khi phiên kết thúc.
