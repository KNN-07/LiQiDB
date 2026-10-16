# LiQiDB

Cẩm nang Liên Quân Mobile bằng **tiếng Việt**, gồm tướng, kỹ năng, trang bị,
ngọc, phép bổ trợ, meta theo mùa, cặp khắc chế và bảng xếp hạng cá nhân.

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

Thiết kế và dữ liệu mùa tham khảo **[TierLQ](https://tierlq.github.io/)**,
từ [mã nguồn TierLQ](https://github.com/tierlq/tierlq.github.io) tại commit
`6a37d2310fdaf22c37d98389736a63cad253857e`. Giao diện LiQiDB được triển khai
riêng theo màu sắc, kiểu chữ, bố cục spotlight và bảng tier của nguồn; không
nhập mã ứng dụng hay mã theo dõi của nguồn.

Biểu tượng **Font Awesome Free** thuộc Fonticons, Inc. (CC BY 4.0 cho SVG;
MIT cho mã thư viện). **Anime.js** của Julian Garnier dùng giấy phép MIT.
Bản ghi công và giấy phép được xuất bản cùng trang trong
[`THIRD_PARTY_NOTICES.txt`](public/THIRD_PARTY_NOTICES.txt).

## Tính năng

- Tra cứu 130 tướng: vai trò, chỉ số, kỹ năng, trang bị gợi ý và tiểu sử.
- Thông tin wiki tiếng Việt theo phiên bản trang: 122 trang cho 130 tướng /
  dạng, gồm kỹ năng chi tiết, hồ sơ, quan hệ cốt truyện và giải thích lối lên đồ.
  Tám tướng chưa có trang phù hợp được ghi rõ; không tự ghép thông tin.
- Meta **S4 2026 — Vết Nứt Thời Không**: 146 bản ghi theo đường cho 129
  tướng / dạng, giữ nguyên tier và điểm tổng hợp từ mẫu TierLQ ngày 11/10/2026.
- 113 cặp đối phó có hướng, chấm điểm biên tập 1–5 theo cơ chế và tình huống;
  19 giả thuyết thiếu chứng cứ được tách riêng, không chấm điểm.
  Hồ sơ tướng có hai hướng: ai khắc chế tướng này và tướng này khắc chế ai,
  kèm điều kiện, nhịp thực hiện, cách phản ứng và nguồn cho cả hai bộ kỹ năng.
- 148 build theo tướng và đường từ TierLQ: trang bị, ngọc và phép bổ trợ.
- Tìm kiếm không dấu, lọc vai trò và sắp xếp tên theo tiếng Việt.
- 112 trang bị, 88 ngọc và 9 phép bổ trợ với thông tin chi tiết.
  Có thể chuyển sang danh mục TierLQ gồm 64 trang bị, 21 ngọc và 9 phép.
- Tạo bảng xếp hạng S–D, tự động lưu trong trình duyệt, đặt lại và tải tệp JSON.
- Giao diện sáng, tối hoặc theo hệ thống; dùng được trên điện thoại và máy tính.
- Hiệu ứng xuất hiện khi chuyển trang, thẻ tướng phản hồi khi rê/bấm và cửa sổ
  chi tiết đóng mở mượt; tự giảm chuyển động theo thiết lập của thiết bị.
- Biểu tượng Font Awesome Free và hiệu ứng xuất hiện bằng Anime.js được
  đóng gói cùng trang, không phụ thuộc CDN.
- Phím `/` để tìm nhanh; phím `Escape` để đóng thông tin chi tiết.

Mẫu tier ngày **11/10/2026** có trước cân bằng chính thức **15/10/2026**.
Trang hiển thị riêng các thay đổi mới, không giả lập tier đã tính lại.
Evita chưa có tier từ nguồn. Số liệu giải đấu là mẫu do nguồn công bố,
không phải tỷ lệ thắng xếp hạng toàn máy chủ. Các cặp khắc chế là suy luận
biên tập có điều kiện, không phải kết quả đo tỷ lệ thắng.

Bảng xếp hạng cá nhân phản ánh đánh giá của bạn, **không phải** xếp hạng thi đấu hay
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

`public/data` chứa bản thu thập lại ngày **16/10/2026**, bằng mã crawler gốc
`c92526a134b434ca3f40936e393deb86f90dffc2`. Bản mới có Evita, cập nhật 8
tướng và bỏ hai phép theo mùa không còn trong danh sách nguồn. Hình ảnh tải
từ máy chủ Garena và kho TierLQ nên cần kết nối mạng. Kiểu chữ Lexend Exa và
Be Vietnam Pro tải qua Google Fonts, có phông hệ thống dự phòng. Ngày thu thập không bảo đảm các trang
nguồn đã cập nhật đủ mọi thay đổi cân bằng trong trò chơi.

Lệnh dưới đây **chỉ nhập bản JSON đã xuất bản của kho gốc**, không chạy crawler.
Kiểm tra ngày trong bản vá: kho gốc có thể cũ hơn lần thu thập tại LiQiDB.

```sh
bun scripts/sync-data.mjs --patch > snapshot.patch
apply_patch < snapshot.patch
bun test
bun run build
```

Hãy đọc thay đổi trước khi áp dụng bản vá. Nếu nguồn tiểu sử thay đổi, cần
cập nhật bản dịch tiếng Việt tương ứng trước khi xuất bản.

Để thu thập mới, dùng bản checkout riêng của kho gốc tại mã crawler nói trên,
chạy `npm run data`, kiểm tra thay đổi rồi nhập các bộ dữ liệu vào `public/data`.
Ghi ngày thực tế và nguồn trong `meta.json`; không đổi ngày để giả lập dữ liệu mới.
Cặp khắc chế là nội dung biên tập riêng trong `counters.json`, không bị ghi đè
khi thu thập nguồn. Các cặp có đối chiếu cân bằng 15/10/2026; không so sát thương
bằng chỉ số CMS thiếu hoặc bất thường. Không suy điểm từ số cặp hoặc tier và
không thêm cặp để đủ số lượng. `season-meta.json` và `reference-builds.json` lưu riêng commit,
hàm băm và ngày mẫu của TierLQ; không đổi ngày mẫu theo ngày tải dữ liệu.
