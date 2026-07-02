# Website Trường Tiểu học Lê Văn Tám

Chào mừng bạn đến với mã nguồn của Website Trường Tiểu học Lê Văn Tám (xã Pơng Drang, huyện Krông Búk, tỉnh Đắk Lắk). Dự án được viết bằng **React (Vite) + TypeScript** kết hợp với backend **Express** và tích hợp mô hình **Gemini AI**.

---

## ⚠️ Khắc phục lỗi: Trợ lý AI không hoạt động sau khi chia sẻ qua GitHub

Khi bạn xuất dự án này ra GitHub hoặc tải mã nguồn về máy cá nhân, **chức năng Trợ lý AI sẽ mặc định không hoạt động**.

### Nguyên nhân:
Vì lý do bảo mật, **mã khóa bí mật (Gemini API Key)** không bao giờ được lưu trực tiếp vào mã nguồn hay đưa lên kho chứa Git (GitHub). Khi chạy trên hệ thống AI Studio của Google, hệ thống tự động cung cấp khóa này cho dự án. Nhưng khi xuất ra ngoài, bạn cần tự cấu hình khóa API của riêng mình.

---

## 🛠️ Hướng dẫn cấu hình Trợ lý AI hoạt động trở lại

### Bước 1: Lấy mã khóa Gemini API Key miễn phí
1. Truy cập vào cổng phát triển [Google AI Studio](https://aistudio.google.com/).
2. Đăng nhập bằng tài khoản Google của bạn.
3. Nhấp vào nút **"Get API key"** (Lấy khóa API).
4. Tạo một API Key mới (miễn phí) và sao chép mã khóa đó (dạng chuỗi ký tự dài bắt đầu bằng `AIzaSy...`).

### Bước 2: Cấu hình trên máy tính cá nhân (Chạy Local)
1. Tại thư mục gốc của dự án, bạn sẽ thấy file `.env.example`.
2. Hãy sao chép file này và đổi tên thành `.env`:
   ```bash
   cp .env.example .env
   ```
3. Mở file `.env` vừa tạo và điền API Key bạn vừa lấy được vào dòng:
   ```env
   GEMINI_API_KEY="Mã_API_Key_Của_Bạn_Ở_Đây"
   ```
4. Lưu file lại. Chạy lệnh cài đặt và khởi động:
   ```bash
   npm install
   npm run dev
   ```

### Bước 3: Cấu hình khi triển khai lên các dịch vụ Cloud (Vercel, Render, Railway, VPS...)
Nếu bạn đưa dự án này lên các dịch vụ hosting như **Vercel**, **Render**, **Railway**, hoặc **Fly.io**:
1. Hãy truy cập vào trang quản trị (Dashboard) của dịch vụ đó.
2. Tìm phần **Environment Variables** (Biến môi trường) trong phần cài đặt (Settings) của dự án.
3. Thêm một biến mới với các thông tin sau:
   - **Key**: `GEMINI_API_KEY`
   - **Value**: *(Dán mã API Key của bạn vào đây)*
4. Lưu cấu hình và tiến hành Re-deploy (triển khai lại) ứng dụng.

---

## 🚀 Hướng dẫn khởi chạy dự án nhanh chóng

1. **Cài đặt thư viện:**
   ```bash
   npm install
   ```

2. **Khởi động chế độ nhà phát triển (Development Mode):**
   ```bash
   npm run dev
   ```
   Ứng dụng sẽ chạy ở địa chỉ mặc định: [http://localhost:3000](http://localhost:3000)

3. **Xây dựng bản chạy thử chính thức (Build Production):**
   ```bash
   npm run build
   ```

4. **Chạy Production Server:**
   ```bash
   npm start
   ```

---

## ✉️ Cấu hình gửi Mail khôi phục mật khẩu (Tùy chọn)
Nếu bạn muốn tính năng "Quên mật khẩu" gửi email thực tế thay vì chạy mô phỏng, hãy điền đầy đủ thông tin SMTP của bạn vào file `.env`:
```env
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="465"
SMTP_USER="email_cua_ban@gmail.com"
SMTP_PASS="mat_khau_ung_dung_gmail"
```
*(Nếu dùng Gmail, bạn cần tạo "Mật khẩu ứng dụng" trong cài đặt tài khoản Google chứ không dùng mật khẩu Gmail thông thường).*
