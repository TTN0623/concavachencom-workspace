# Coding Conventions — Cá Cơm và Chén Cơm (ALWAYS ON)

## 1. Cấu Trúc Dự Án Chuẩn Doanh Nghiệp (Directory Structure)
```
/
├── docs/                        # Tài liệu dự án theo chuẩn 5 file (SRS, Schema, API, Test, Overview)
├── rules/                       # ALWAYS-ON AI Rules & Guidelines
│   ├── designsystem.md
│   ├── coding-conventions.md
│   └── api-conventions.md
├── scripts/                     # Build tools, automation & local servers
│   ├── build.js                 # Production bundle compiler cho Vercel / PWA
│   ├── server.js                # Local development server (Port 3000)
│   └── fap_to_workspace.js      # Console scraper utility cho sinh viên FPT
├── src/                         # Toàn bộ mã nguồn ứng dụng (Source Code)
│   ├── appsscript.json          # GAS manifest
│   ├── backend/                 # Tầng xử lý nghiệp vụ Cloud & Serverless
│   │   ├── config/              # Cấu hình hằng số & môi trường (Config.js)
│   │   ├── controllers/         # Điều hướng HTTP & RPC (Code.js)
│   │   ├── database/            # Tầng thao tác Google Sheets & Supabase ORM (Database.js)
│   │   └── services/            # Tầng Domain Services
│   │       ├── TaskService.js
│   │       ├── UserService.js
│   │       ├── CalendarService.js
│   │       ├── GeminiService.js
│   │       ├── AnnouncementService.js
│   │       └── FeedbackService.js
│   └── frontend/                # Tầng giao diện người dùng (Client SPA)
│       ├── entry/               # Shell chính của Web SPA (Index.html)
│       ├── styles/              # Design System tokens & CSS (Styles.html)
│       ├── components/          # Thành phần UI dùng chung
│       │   ├── Modals.html      # Hệ thống hộp thoại (Auth, Task, Profile...)
│       │   └── MobileNav.html   # Thanh điều hướng di động
│       └── modules/             # Các module tính năng độc lập (Feature Scripts)
│           ├── core/            # Scripts_Core.html, Scripts_Init.html
│           ├── auth/            # Scripts_Auth.html
│           ├── task-matrix/     # Scripts_TaskMatrix.html
│           ├── calendar-fap/    # Scripts_Calendar_FAP.html
│           ├── dashboard/       # Scripts_Dashboard.html
│           ├── freetime/        # Scripts_FreeTime.html
│           ├── notifications/   # Scripts_Notifications_PWA.html
│           └── admin/           # Scripts_Admin.html
├── public/                      # Bản phân phối tĩnh cho Vercel CDN (public/index.html)
├── .clasp.json                  # Cấu hình Clasp (rootDir: "src")
├── .claspignore                 # Lọc file deploy sạch sẽ
├── package.json                 # Quản lý script khởi động và dependencies
└── vercel.json                  # Cấu hình định tuyến Vercel
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
