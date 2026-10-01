# Coding Conventions — Cá Cơm Workspace (ALWAYS ON)

## 1. Cấu Trúc Dự Án (Directory Structure)
```
/
├── Index.html                  # Shell chính của ứng dụng
├── Styles.html                 # Tokens và tùy biến CSS toàn cục
├── Modals.html                 # Toàn bộ modal hộp thoại (Auth, Task, Calendar, FAP, Feedback, Profile...)
├── MobileNav.html              # Thanh điều hướng mobile
├── Scripts_Core.html           # Khởi tạo trạng thái toàn cục, biến môi trường, tiện ích lõi
├── Scripts_Auth.html           # Xác thực người dùng, Google Identity Services, Supabase Auth
├── Scripts_TaskMatrix.html     # Logic ma trận Eisenhower 4 ô, kéo thả SortableJS, CRUD task
├── Scripts_Dashboard.html      # Thống kê, biểu đồ tiến độ công việc
├── Scripts_Calendar_FAP.html   # Bộ phân tích và đồng bộ lịch học FAP FPT, Google Calendar
├── Scripts_Notifications_PWA.html # Web push notification, Service Worker, PWA
├── Scripts_FreeTime.html       # Tính toán và gợi ý thời gian rảnh rỗi
├── Scripts_Admin.html          # Quản trị viên, xem feedback, nhật ký
├── Scripts_Init.html           # DOMContentLoaded bootstrap
├── Code.js                     # Controller tiếp nhận HTTP doGet/doPost trên Google Apps Script
├── Database.js                 # ORM / Google Sheets API wrapper
├── TaskService.js              # Nghiệp vụ xử lý công việc backend
├── UserService.js              # Nghiệp vụ tài khoản & phân quyền
├── CalendarService.js          # Google Calendar integration backend
├── GeminiService.js            # Trợ lý AI tích hợp Gemini API
├── build.js                    # Script đóng gói SPA standalone cho Vercel / PWA
├── public/index.html           # File build production tự sinh
└── rules/                      # Quy tắc chuẩn hệ thống
```

## 2. Nguyên Tắc Lập Trình Bắt Buộc
- **DRY, KISS, YAGNI**: Tuyệt đối không copy-paste logic lặp lại, giữ code trực quan, súc tích, chỉ triển khai đúng nhu cầu.
- **SOLID / Single Responsibility**: Mỗi file `Scripts_*.html` và `*Service.js` chỉ chịu một trách nhiệm duy nhất.
- **Tách biệt Client / Server**:
  - Không gọi trực tiếp `google.script.run` trong các đoạn code dùng chung mà không bọc kiểm tra môi trường: `if (window.google && google.script && google.script.run)`.
  - Môi trường Standalone (Vercel) tương tác dữ liệu qua Supabase Client SDK (`window.supabaseClient`), môi trường GAS tương tác qua `google.script.run`.

## 3. Quy Ước Đặt Tên (Naming Conventions)
- **Biến và Hàm**: `camelCase` (Ví dụ: `currentUserEmail`, `fetchTasksFromSupabase()`, `renderTaskList()`).
- **Hằng số toàn cục**: `UPPER_SNAKE_CASE` (Ví dụ: `STORAGE_KEY_CURRENT_USER`, `DEFAULT_PROFILE`).
- **Tên Component / ID phần tử**: `camelCase` hoặc tiền tố rõ ràng (Ví dụ: `btnAuthGateSignIn`, `taskModal`, `headerAvatar`).
- **Tên file**:
  - Frontend template: `Scripts_[Feature].html`, `[Feature].html`
  - Backend GAS: `[Domain]Service.js`

## 4. Chuẩn Quy Trình Git & Build
- Không commit trực tiếp secret/token nhạy cảm (Google Client Secret, Service Role Key).
- Trước khi push lên main: luôn chạy `node build.js` để cập nhật `public/index.html` cho Vercel.
- Đẩy song song lên GitHub (`git push origin main`) và Google Apps Script (`npx @google/clasp push -f`).
- Commit message rõ ràng theo Conventional Commits: `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`.
