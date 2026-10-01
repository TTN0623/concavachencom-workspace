# Feature Spec / SRS: Xác Thực Google Identity Services & Auth Gate

## 1. Thông Tin Chung
- **Mã tính năng**: `FEAT-AUTH-GIS`
- **Tên chức năng**: Xác thực Người dùng qua Google Identity Services (GIS Pop-up) & Auth Gate
- **Phiên bản tài liệu**: `v1.0.0`
- **Trạng thái**: Chờ phê duyệt (Pending Approval)

---

## 2. Đối Tượng Người Dùng (Actors)
- **Actor chính**: Học sinh, sinh viên, người dùng cá nhân (truy cập ứng dụng trên web/mobile).
- **Actor phụ**: Sinh viên Đại học FPT (sử dụng email `@fpt.edu.vn` để liên kết tính năng FAP & Google Calendar).
- **Admin**: Tài khoản quản trị viên (`trtainguyen2306@gmail.com`) có quyền truy cập tab phản hồi và quản trị.

---

## 3. Mục Tiêu Nghiệp Vụ (Business Goals)
1. **Trải nghiệm 1-Click bảo mật**: Cho phép người dùng đăng nhập bằng tài khoản Google chỉ trong 1 thao tác qua cửa sổ Pop-up Google chính hãng.
2. **Nhận diện thương hiệu độc lập**: Cửa sổ ủy quyền của Google hiển thị tên miền chính thức **`concavachencom.site`** và thương hiệu **`Cá Cơm và Chén Cơm`**, loại bỏ hoàn toàn tên miền kỹ thuật trung gian `supabase.co`.
3. **Triệt tiêu lỗi chuyển hướng**: Bỏ qua luồng redirect server-side code exchange truyền thống, phòng ngừa 100% lỗi `Unable to exchange external code: 4/0A`.
4. **Bảo vệ dữ liệu (Auth Gate)**: Khóa toàn bộ dữ liệu công việc và thời khóa biểu khi chưa đăng nhập; chỉ mở khóa khi danh tính người dùng được xác thực.

---

## 4. User Stories & Acceptance Criteria

### US-01: Đăng nhập bằng Google Pop-up
- **User Story**: Là người dùng, tôi muốn bấm "Tiếp tục với Google" để cửa sổ Google hiện lên cho tôi chọn tài khoản, sau đó vào thẳng hệ thống mà không phải rời khỏi trang hiện tại.
- **Tiêu chí nghiệm thu (AC)**:
  - Nút "Tiếp tục với Google" trên Auth Gate khi bấm sẽ kích hoạt `googleTokenClient.requestAccessToken()`.
  - Pop-up Google mở ra trên miền `concavachencom.site`.
  - Không tải lại toàn trang (no full-page reload), không chuyển hướng sang trang trắng.

### US-02: Cơ chế Auth Gate bảo mật
- **User Story**: Là người dùng mới chưa đăng nhập, tôi chỉ nhìn thấy màn hình giới thiệu tính năng Cá Cơm và Chén Cơm cùng nút đăng nhập, không xem được dữ liệu người khác.
- **Tiêu chí nghiệm thu (AC)**:
  - Khi chưa có phiên đăng nhập hợp lệ: `#authGateModal` hiển thị ở dạng overlay cố định (`fixed inset-0 z-[9999]`), che toàn bộ không gian làm việc.
  - Khi đã đăng nhập thành công: `#authGateModal` tự động ẩn ngay lập tức (inline `style.display = 'none'`), giải phóng giao diện chính.

### US-03: Duy trì phiên làm việc (Offline-first & Persistence)
- **User Story**: Sau khi đã đăng nhập, khi tôi tải lại trang hoặc mở lại trình duyệt vào ngày hôm sau, tôi không phải bấm đăng nhập lại.
- **Tiêu chí nghiệm thu (AC)**:
  - Phiên làm việc được lưu trong `localStorage` (`csg_current_user`, `csg_user_profile`).
  - Khi tải trang, hệ thống kiểm tra và phục hồi phiên trong < 50ms, không gây chớp giật màn hình (anti-flicker).

### US-04: Đăng xuất an toàn (Logout)
- **User Story**: Khi dùng máy chung, tôi muốn đăng xuất để xóa bỏ toàn bộ dữ liệu cá nhân khỏi máy này.
- **Tiêu chí nghiệm thu (AC)**:
  - Bấm "Đăng xuất" trong dropdown menu sẽ yêu cầu xác nhận.
  - Sau khi xác nhận: xóa sạch `localStorage`, `sessionStorage`, hủy realtime channel Supabase, reset biến trong bộ nhớ RAM và kích hoạt lại `#authGateModal`.

---

## 5. Yêu Cầu Kỹ Thuật & Luồng Xử Lý (Technical Requirements)

### 5.1. Tích Hợp Google Identity Services SDK
- Nhúng script chính thức của Google:
  ```html
  <script src="https://accounts.google.com/gsi/client" async defer onload="if(window.onGoogleGsiLoaded) window.onGoogleGsiLoaded();"></script>
  ```
- Khởi tạo `googleTokenClient`:
  - `client_id`: `868007254558-mg1mav2ucm3e911eoi951gc3al9v1vb6.apps.googleusercontent.com`
  - `scope`: `email profile openid`
  - `callback`: Tiếp nhận `access_token`, gọi Google UserInfo API (`https://www.googleapis.com/oauth2/v3/userinfo`) để trích xuất email, họ tên, avatar.

### 5.2. Đồng Bộ Hóa Người Dùng Lên Supabase
- Sau khi có thông tin người dùng từ Google:
  - Tự động thực hiện `upsert` vào bảng `users` trên Supabase:
    - `email`: Email Google (viết thường, duy nhất)
    - `full_name`: Họ tên người dùng
    - `avatar_url`: Đường dẫn ảnh đại diện
    - `last_sign_in_at`: Thời điểm đăng nhập hiện tại
  - Khởi tạo kênh Realtime Channel để đồng bộ danh sách `tasks` của người dùng.

### 5.3. Làm Sạch URL (URL Sanitization)
- Khi phát hiện tham số lỗi từ redirect cũ (`?error=...` hoặc `#error=...`):
  - Lập tức thực hiện `window.history.replaceState({}, document.title, window.location.pathname)`.
  - Ngăn chặn triệt để tình trạng URL bị rác và lỗi lặp lại khi người dùng F5.

### 5.4. Xử Lý Ngoại Lệ & Báo Lỗi Thân Thiện
- Bắt lỗi `error_callback` của Google Token Client:
  - Nếu gặp `origin_mismatch`: Hiển thị thông báo hướng dẫn thêm domain vào Google Cloud Console.
  - Nếu người dùng đóng cửa sổ Pop-up trước khi đăng nhập: Khôi phục lại trạng thái nút bấm bình thường, không làm treo ứng dụng.

---

## 6. Dữ Liệu Lưu Trữ (Data Tracking)
- **Local Storage**:
  - `csg_current_user`: Lưu email người dùng hiện tại
  - `csg_user_profile`: Đối tượng JSON `{ fullName, studentId, major, avatarInitials, avatarUrl }`
  - `csg_logged_out`: Cờ đánh dấu người dùng chủ động đăng xuất
- **Supabase Cloud**: Bảng `users` (quản lý phiên và thông tin tài khoản)

---

## 7. Tiêu Chí Nghiệm Thu UX (UX Validation)
1. **Tốc độ phản hồi**: Nút bấm phản hồi ngay (< 100ms), chuyển sang trạng thái loading xoay tròn khi đang chờ Google.
2. **Giao diện đồng bộ**: Avatar và tên người dùng hiển thị chuẩn xác ở cả thanh Header, Dropdown menu và Modal Profile.
3. **Thân thiện trên Mobile**: Cửa sổ Google Pop-up mở mượt mà trên trình duyệt di động (iOS Safari, Android Chrome).
