# LiQiDB

Cẩm nang Liên Quân Mobile bằng **tiếng Việt**, gồm tướng, kỹ năng, trang bị,
ngọc, phép bổ trợ và bảng xếp hạng cá nhân.

**[Mở cẩm nang LiQiDB](https://knn-07.github.io/LiQiDB/)**

## Nguồn dữ liệu và ghi công

LiQiDB được xây dựng từ **[MLuc24/lien-quan-data](https://github.com/MLuc24/lien-quan-data)**.
Cảm ơn MLuc24 và các cộng tác viên đã thu thập, duy trì nguồn dữ liệu mở cho
cộng đồng. Đây là giao diện tra cứu độc lập, không phải kho dữ liệu gốc hay
trang chính thức của trò chơi.

Dữ liệu và hình ảnh thuộc Garena / TiMi Studios. Nội dung từ cộng đồng
Arena of Valor Fandom và bản dịch tiểu sử được chia sẻ theo giấy phép
**CC BY-SA 3.0**. Xem [DATA_SOURCES.md](DATA_SOURCES.md) để đối chiếu phiên bản
dữ liệu, nguồn tham khảo và giấy phép. Liên kết kho dữ liệu gốc luôn có ở
chân trang và phần nguồn của mỗi tướng.

## Tính năng

- Tra cứu 129 tướng: vai trò, chỉ số, kỹ năng, trang bị gợi ý và tiểu sử.
- Tìm kiếm không dấu, lọc vai trò và sắp xếp tên theo tiếng Việt.
- 112 trang bị, 88 ngọc và 11 phép bổ trợ với thông tin chi tiết.
- Tạo bảng xếp hạng S–D, tự động lưu trong trình duyệt, đặt lại và tải tệp JSON.
- Giao diện sáng, tối hoặc theo hệ thống; dùng được trên điện thoại và máy tính.
- Phím `/` để tìm nhanh; phím `Escape` để đóng thông tin chi tiết.

Bảng xếp hạng phản ánh đánh giá cá nhân, **không phải** xếp hạng thi đấu hay
tỷ lệ thắng thực tế. Bảng được lưu trên thiết bị của bạn; hãy tải tệp JSON để
giữ một bản sao. Thông tin tham khảo có thể khác phiên bản trò chơi đang dùng.

## Chạy tại máy

```sh
bun install
bun run dev
```

Mở địa chỉ mà Vite hiển thị. Kiểm tra trước khi xuất bản:

```sh
bun test
bun run build
bun run preview
```

## Xuất bản trên GitHub Pages

Trang chạy hoàn toàn bằng tệp tĩnh và JSON đi kèm. Không cần máy chủ API,
dịch vụ cơ sở dữ liệu hay khóa truy cập.

1. Đẩy dự án lên nhánh `main` của kho GitHub.
2. Trong **Settings > Pages**, chọn **GitHub Actions** làm nguồn xuất bản.
3. Chạy quy trình **Deploy WebUI to GitHub Pages** trong thẻ **Actions**,
   hoặc đẩy một thay đổi mới lên `main`.
4. Mở địa chỉ được hiển thị trong môi trường `github-pages` sau khi triển khai.

Quy trình tự cài đặt phụ thuộc đã khóa phiên bản, chạy kiểm thử, tạo thư mục
`dist` và triển khai trang. Đường dẫn tương đối hỗ trợ cả địa chỉ kho như
`/LiQiDB/` lẫn tên miền riêng. Điều hướng bằng phần sau dấu `#` nên các liên
kết như `/LiQiDB/#tier-list` không cần cấu hình chuyển hướng máy chủ.

## Cập nhật dữ liệu

`public/data` chứa bản chụp dữ liệu được cố định theo một mã phiên bản của
kho gốc. Hình ảnh tải từ máy chủ Garena nên cần kết nối mạng.

```sh
bun scripts/sync-data.mjs --patch > snapshot.patch
apply_patch < snapshot.patch
bun test
bun run build
```

Hãy đọc thay đổi trước khi áp dụng bản vá. Nếu nguồn tiểu sử thay đổi, cần
cập nhật bản dịch tiếng Việt tương ứng trước khi xuất bản.
