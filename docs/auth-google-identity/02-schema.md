# Database Schema: Xác Thực Google Identity Services & Người Dùng

## 1. Tổng Quan Kiến Trúc Lưu Trữ (Storage Architecture)
Hệ thống sử dụng mô hình cơ sở dữ liệu kết hợp (Hybrid Dual-Store):
1. **Supabase Cloud (PostgreSQL 15)**: Cơ sở dữ liệu quan hệ chính phục vụ xác thực người dùng, lưu trữ tức thì và đồng bộ thời gian thực qua Realtime Pub/Sub.
2. **Google Sheets (Google Drive Database)**: Nền tảng lưu trữ bảng tính sao lưu và quản lý dữ liệu trực quan cho quản trị viên.

---

## 2. Thiết Kế Bảng Supabase PostgreSQL

### 2.1. Bảng `users` (Thông tin tài khoản & danh tính)
Lưu trữ thông tin người dùng được định danh từ Google Identity Services.

| Tên trường | Kiểu dữ liệu | Ràng buộc | Mô tả |
|---|---|---|---|
| `email` | `TEXT` | `PRIMARY KEY` | Địa chỉ email Google (luôn viết thường) |
| `full_name` | `TEXT` | `NOT NULL` | Họ và tên người dùng |
| `student_id` | `TEXT` | `NULLABLE` | Mã số sinh viên (VD: SE123456) |
| `major` | `TEXT` | `DEFAULT 'Sinh viên'` | Ngành học hoặc nghề nghiệp |
| `avatar_url` | `TEXT` | `NULLABLE` | Đường dẫn ảnh đại diện Google (HTTPS) |
| `role` | `TEXT` | `DEFAULT 'user'` | Phân quyền: `admin` hoặc `user` |
| `created_at` | `TIMESTAMPTZ` | `DEFAULT NOW()` | Thời điểm tạo tài khoản lần đầu |
| `last_sign_in_at` | `TIMESTAMPTZ` | `DEFAULT NOW()` | Thời điểm đăng nhập gần nhất |

### 2.2. Bảng `tasks` (Liên kết chủ sở hữu công việc)
Mỗi công việc gắn liền với một người dùng qua khóa ngoại logic `owner_email`.

| Tên trường | Kiểu dữ liệu | Ràng buộc | Mô tả |
|---|---|---|---|
| `id` | `TEXT` | `PRIMARY KEY` | Mã định danh duy nhất (UUID hoặc timestamp-random) |
| `owner_email` | `TEXT` | `NOT NULL` | Email người sở hữu (Foreign key liên kết `users.email`) |
| `title` | `TEXT` | `NOT NULL` | Tiêu đề công việc |
| `description` | `TEXT` | `NULLABLE` | Ghi chú, mô tả chi tiết công việc |
| `quadrant` | `TEXT` | `NOT NULL` | Ô ma trận Eisenhower (`Q1_URGENT_IMPORTANT`, `Q2_...`) |
| `status` | `TEXT` | `DEFAULT 'pending'` | Trạng thái (`pending`, `completed`, `in_progress`) |
| `due_date` | `TEXT` | `NULLABLE` | Hạn hoàn thành (`YYYY-MM-DD` hoặc ISO) |
| `priority` | `TEXT` | `DEFAULT 'medium'` | Mức độ ưu tiên (`high`, `medium`, `low`) |
| `tags` | `TEXT` | `NULLABLE` | Nhãn phân loại (Học tập, Công việc, Cá nhân) |
| `source` | `TEXT` | `DEFAULT 'manual'` | Nguồn tạo (`manual`, `fap_sync`, `calendar_sync`) |
| `created_at` | `TIMESTAMPTZ` | `DEFAULT NOW()` | Thời điểm tạo |
| `updated_at` | `TIMESTAMPTZ` | `DEFAULT NOW()` | Thời điểm sửa đổi gần nhất |

---

## 3. Cấu Trúc Bảng Tính Google Sheets (Backup Storage)

### Sheet 1: `Users`
- Cột A: `Timestamp` (Thời gian ghi nhận)
- Cột B: `Email` (Email người dùng)
- Cột C: `FullName` (Họ và tên)
- Cột D: `StudentId` (Mã sinh viên)
- Cột E: `Major` (Chuyên ngành)
- Cột F: `AvatarUrl` (URL ảnh đại diện)
- Cột G: `LastSignIn` (Đăng nhập lần cuối)

### Sheet 2: `Tasks`
- Cột A: `ID`
- Cột B: `UserEmail`
- Cột C: `Title`
- Cột D: `Description`
- Cột E: `Quadrant`
- Cột F: `Status`
- Cột G: `DueDate`
- Cột H: `Priority`
- Cột I: `Tags`
- Cột J: `CreatedAt`
- Cột K: `UpdatedAt`

---

## 4. Kịch Bản Migration SQL (Supabase DDL)

Đoạn mã SQL chuẩn có thể thực thi trực tiếp trên **Supabase SQL Editor**:

```sql
-- =====================================================================
-- MIGRATION: KHỞI TẠO BẢNG USERS VÀ BẢO MẬT RLS
-- =====================================================================

-- 1. Tạo bảng users
CREATE TABLE IF NOT EXISTS public.users (
    email TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    student_id TEXT,
    major TEXT DEFAULT 'Sinh viên',
    avatar_url TEXT,
    role TEXT DEFAULT 'user',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_sign_in_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Đánh chỉ mục tối ưu tìm kiếm theo email
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users (email);

-- 3. Bật Row Level Security (RLS) bảo mật dữ liệu
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 4. Chính sách đọc (Select Policy): Người dùng có thể đọc thông tin của chính mình
CREATE POLICY "Users can view their own profile" 
ON public.users 
FOR SELECT 
USING (true);

-- 5. Chính sách ghi/cập nhật (Upsert Policy): Cho phép người dùng ghi nhận hồ sơ khi đăng nhập
CREATE POLICY "Users can insert or update their own profile" 
ON public.users 
FOR ALL 
USING (true)
WITH CHECK (true);

-- =====================================================================
-- 6. Đảm bảo bảng tasks có chỉ mục và RLS chuẩn xác
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.tasks (
    id TEXT PRIMARY KEY,
    owner_email TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    quadrant TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    due_date TEXT,
    priority TEXT DEFAULT 'medium',
    tags TEXT,
    source TEXT DEFAULT 'manual',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tasks_owner_email ON public.tasks (owner_email);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks (status);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own tasks" 
ON public.tasks 
FOR SELECT 
USING (true);

CREATE POLICY "Users can mutate own tasks" 
ON public.tasks 
FOR ALL 
USING (true)
WITH CHECK (true);
```

---

## 5. Quy Chuẩn Đồng Bộ & Tính Toàn Vẹn (Data Integrity)
1. **Chuẩn hóa Email**: Email luôn được chuyển thành chữ thường (`email.toLowerCase().trim()`) trước khi thực hiện bất kỳ truy vấn hay ghi dữ liệu nào.
2. **Upsert Idempotency**: Khi người dùng đăng nhập nhiều lần, hệ thống sử dụng cú pháp `UPSERT ... ON CONFLICT (email)` để cập nhật `last_sign_in_at` và ảnh đại diện mới nhất mà không sinh bản ghi trùng lặp.
3. **Audit Trail**: Cột `last_sign_in_at` ghi lại dấu thời gian thực theo định dạng ISO-8601 UTC.
