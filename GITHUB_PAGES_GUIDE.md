# GITHUB_PAGES_GUIDE.md

## Hướng dẫn để AI cập nhật đúng Trang thông tin điện tử

Repository hiện tại: truongthlevantampongdrang
Branch chính: main
Nền tảng deploy: Trang thông tin điện tử thông qua GitHub Actions

## Không được xóa
- .github/workflows/main.yml
- package.json
- vite.config.ts
- index.html
- public/
- src/
- robots.txt
- sitemap.xml
- manifest.webmanifest
- google*.html

## Mỗi lần cập nhật website
1. Sửa code hoặc nội dung cần thiết.
2. Chạy:
   npm install
   npm run build
3. Nếu build thành công, commit lên branch main.
4. Đợi GitHub Actions chạy xong.
5. Mở website Trang thông tin điện tử để kiểm tra.

## Nếu website trên máy tính đúng nhưng điện thoại sai
AI cần kiểm tra:
- Responsive CSS
- localStorage/cache
- Service worker nếu có
- manifest/PWA cache nếu có
- Dữ liệu hard-code trùng lặp trong nhiều file
- Nội dung trong public/ hoặc metadata khác với nội dung trong src/

## Nếu Trang thông tin điện tử không cập nhật
Kiểm tra:
- Tab Actions có lỗi không
- File main.yml còn đúng không
- vite.config.ts có base đúng không
- Branch deploy có được tạo không
