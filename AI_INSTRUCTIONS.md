# AI_INSTRUCTIONS.md

## Thông tin dự án
Website: Trường TH Lê Văn Tám - Pơng Drang
Repository: truongthlevantampongdrang
Nền tảng chạy: Trang thông tin điện tử
Công nghệ: Vite + TypeScript

## Mục tiêu
AI chỉ được chỉnh sửa website theo yêu cầu của người dùng, không tự ý thay đổi cấu trúc quan trọng, không làm hỏng Trang thông tin điện tử.

## Quy tắc bắt buộc khi sửa website
1. Giữ nguyên tên trường: Trường TH Lê Văn Tám - Pơng Drang.
2. Không đổi tên repository, không đổi cấu hình Trang thông tin điện tử nếu không được yêu cầu.
3. Không xóa các file SEO quan trọng: index.html, sitemap.xml, robots.txt, manifest.webmanifest, google*.html.
4. Không xóa thư mục .github/workflows.
5. Không xóa public, src, assets.
6. Luôn kiểm tra giao diện trên điện thoại và máy tính.
7. Sau khi sửa nội dung, nếu có thay đổi trang/đường dẫn, phải cập nhật sitemap.xml.
8. Nếu sửa SEO, phải kiểm tra title, description, og:title, og:description, canonical.
9. Nếu sửa dữ liệu trường học, ưu tiên sửa ở file dữ liệu dùng chung, không sửa lặp lại ở nhiều nơi.
10. Không đưa API key thật vào mã nguồn công khai.

## Quy trình AI phải làm mỗi lần cập nhật
1. Đọc yêu cầu người dùng.
2. Tìm đúng file cần sửa.
3. Sửa ít file nhất có thể.
4. Không xóa code đang hoạt động nếu không cần thiết.
5. Chạy kiểm tra build nếu môi trường hỗ trợ:
   npm install
   npm run build
6. Nếu build lỗi, sửa lỗi trước khi kết thúc.
7. Tóm tắt rõ đã sửa file nào.

## Cấu trúc nên giữ
- src/: mã nguồn chính
- public/: file tĩnh, ảnh, robots, sitemap, manifest
- assets/: tài nguyên hình ảnh hoặc dữ liệu phụ
- .github/workflows/main.yml: tự động đưa website lên Trang thông tin điện tử
- AI_INSTRUCTIONS.md: quy tắc làm việc cho AI
- PROMPT_FOR_AI_STUDIO.md: prompt dùng khi yêu cầu Google AI Studio sửa website

## Khi người dùng nói “Thêm tính năng X”
AI cần:
- Tìm vị trí phù hợp trong giao diện.
- Thêm tính năng nhưng giữ giao diện cũ ổn định.
- Bảo đảm responsive.
- Không phá navigation/menu.
- Không xóa nội dung cũ.

## Khi người dùng nói “Sửa nội dung B”
AI cần:
- Tìm toàn bộ vị trí đang hiển thị nội dung B.
- Sửa thống nhất trên cả máy tính và điện thoại.
- Kiểm tra dữ liệu cache/localStorage nếu có.

## Khi sửa tên, địa chỉ, thông tin nhà trường
Phải kiểm tra cả:
- Nội dung hiển thị trên trang
- Metadata SEO
- Open Graph
- JSON-LD nếu có
- manifest.webmanifest
- sitemap.xml nếu có URL liên quan
