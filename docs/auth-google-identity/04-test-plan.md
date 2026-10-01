# Testing Plan (QA): Xác Thực Google Identity Services & Auth Gate

## 1. Mục Tiêu Kiểm Thử
Đảm bảo tính năng Xác thực Google Identity Services và Auth Gate vận hành ổn định 100%, bảo mật danh tính người dùng, không gián đoạn giao diện, và xử lý mượt mà mọi trường hợp ngoại lệ trên cả Desktop lẫn Mobile.

---

## 2. Tiêu Chí Nghiệm Thu Chung (Pass/Fail Criteria)
- **PASS**: 100% test case chức năng và ngoại lệ pass; 0 lỗi cú pháp JavaScript; URL sạch; giao diện đồng bộ chính xác.
- **FAIL**: Xuất hiện màn hình trắng, Auth Gate không ẩn được sau khi đăng nhập, URL còn sót query lỗi, hoặc crash JavaScript trên console.

---

## 3. Ma Trận Test Cases Chi Tiết (Detailed Test Cases)

### Nhóm 1: Kiểm Thử Chức Năng Chính (Functional Tests)

| ID | Tên Test Case | Các bước thực hiện | Kết quả kỳ vọng (Expected Behavior) | Trạng thái |
|---|---|---|---|---|
| **TC-AUTH-01** | Trạng thái Khách chưa đăng nhập | 1. Mở trình duyệt ẩn danh (Incognito).<br>2. Truy cập `https://concavachencom.site`. | - Modal `#authGateModal` hiển thị che toàn màn hình.<br>- Header hiển thị icon Khách 👤.<br>- Không lộ dữ liệu công việc của người khác. | ✅ PASS |
| **TC-AUTH-02** | Bật cửa sổ Google Pop-up | 1. Tại Auth Gate, bấm **"Tiếp tục với Google"**. | - Nút chuyển trạng thái xoay loading `Đang mở Google...`.<br>- Cửa sổ Pop-up Google hiện lên trên miền `concavachencom.site`.<br>- Không tải lại toàn trang. | ✅ PASS |
| **TC-AUTH-03** | Đăng nhập thành công | 1. Chọn tài khoản Google trong pop-up.<br>2. Xác nhận quyền truy cập. | - Pop-up tự động đóng.<br>- Auth Gate ẩn tức thì.<br>- Toast hiển thị: `Chào mừng bạn quay trở lại, [email]!`.<br>- Dữ liệu task được tải về. | ✅ PASS |
| **TC-AUTH-04** | Hiển thị hồ sơ người dùng | 1. Quan sát Header góc trên bên phải.<br>2. Bấm vào Avatar để mở Dropdown Menu. | - Header hiển thị Avatar ảnh đại diện Google (hoặc Initials 2 chữ cái).<br>- Tên và email hiển thị đúng thông tin tài khoản.<br>- Phân quyền (Admin/Sinh viên) hiển thị đúng badge màu. | ✅ PASS |
| **TC-AUTH-05** | Duy trì phiên làm việc (Persistence) | 1. Đang ở trạng thái đã đăng nhập.<br>2. Nhấn `F5` hoặc `Cmd + Shift + R` tải lại trang. | - Ứng dụng mở thẳng vào màn hình làm việc (< 50ms).<br>- Auth Gate KHÔNG hiện lên giật chớp (Anti-FOUC).<br>- Dữ liệu task hiển thị ngay từ `localStorage`. | ✅ PASS |
| **TC-AUTH-06** | Đăng xuất tài khoản (Logout) | 1. Mở Dropdown Profile.<br>2. Bấm **"Đăng xuất tài khoản"**.<br>3. Xác nhận trên hộp thoại confirm. | - Xóa sạch `csg_current_user`, `csg_tasks` khỏi cache.<br>- Đóng kết nối Realtime Channel Supabase.<br>- Auth Gate Modal hiện lại ngay lập tức. | ✅ PASS |

---

### Nhóm 2: Kiểm Thử Ngoại Lệ & Xử Lý Lỗi (Edge Cases & Resilience)

| ID | Tên Test Case | Các bước thực hiện | Kết quả kỳ vọng (Expected Behavior) | Trạng thái |
|---|---|---|---|---|
| **TC-EDGE-01** | Người dùng đóng Pop-up giữa chừng | 1. Bấm "Tiếp tục với Google".<br>2. Bấm dấu `X` đóng cửa sổ Pop-up khi chưa đăng nhập. | - Nút bấm trên Auth Gate tự động hồi phục về trạng thái bình thường.<br>- Ứng dụng không bị đơ hoặc treo trạng thái loading. | ✅ PASS |
| **TC-EDGE-02** | Xử lý lỗi `origin_mismatch` (400) | 1. Gọi Google OAuth từ một tên miền chưa khai báo trên Google Cloud. | - Bắt qua `error_callback`.<br>- Hiển thị Toast hướng dẫn: *"Vui lòng thêm domain vào Authorized JavaScript origins"*. | ✅ PASS |
| **TC-EDGE-03** | Tự động làm sạch URL rác | 1. Truy cập URL có chứa chuỗi lỗi:<br>`https://concavachencom.site/?error=server_error...` | - `window.history.replaceState` kích hoạt ngay.<br>- Thanh địa chỉ trở về sạch sẽ: `https://concavachencom.site/`. | ✅ PASS |
| **TC-EDGE-04** | Hoạt động Ngoại tuyến (Offline-First) | 1. Ngắt kết nối mạng Internet.<br>2. Mở lại trang web đã đăng nhập từ trước. | - Giao diện vẫn render đầy đủ danh sách task từ bộ nhớ đệm `localStorage`.<br>- Không bị crash hoặc hiện trang trắng. | ✅ PASS |

---

### Nhóm 3: Kiểm Thử Tương Thích & Đa Nền Tảng (Cross-Device & Responsive)

| ID | Tên Thiết Bị / Trình Duyệt | Độ Phân Giải | Hành Vi Kỳ Vọng | Trạng thái |
|---|---|---|---|---|
| **TC-UI-01** | Mobile Safari (iPhone 13/14/15) | 390 x 844 | Pop-up Google mở gọn trong tab hoặc sheet; Modal Auth Gate canh giữa hoàn hảo; Nút bấm đạt chuẩn cảm ứng (chiều cao >= 48px). | ✅ PASS |
| **TC-UI-02** | Mobile Chrome (Android) | 412 x 915 | Tương thích Dark Mode mượt mà; hỗ trợ cài đặt PWA (Add to Home Screen); hiển thị font Inter sắc nét. | ✅ PASS |
| **TC-UI-03** | Desktop 24" / 27" Full HD & 2K | 1920x1080, 2560x1440 | Hộp thoại Auth Gate nổi bật ở giữa với lớp phủ nền làm mờ (`backdrop-blur-md`); không vỡ layout khi phóng to (Zoom 125%, 150%). | ✅ PASS |

---

## 4. Kịch Bản Tự Động Kiểm Tra Cú Pháp (Automated QA Script)
Chạy script kiểm tra 100% cú pháp JavaScript trong toàn bộ file build `public/index.html` bằng Node runtime:

```bash
node -e '
const fs = require("fs");
const html = fs.readFileSync("public/index.html", "utf8");
const scripts = html.match(/<script[\s\S]*?<\/script>/gi) || [];
scripts.forEach((s, i) => {
  if (s.includes("src=")) return;
  const code = s.replace(/<script[^>]*>/i, "").replace(/<\/script>/i, "");
  try {
    new Function(code);
  } catch (err) {
    console.error("Lỗi cú pháp tại thẻ script " + i + ":", err.message);
    process.exit(1);
  }
});
console.log("✅ QA Passed: Toàn bộ thẻ script hợp lệ 100%.");
'
```
