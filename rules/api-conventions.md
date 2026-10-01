# API & Data Conventions — Cá Cơm Workspace

## 1. Kiến Trúc Dữ Liệu Hai Chiều (Bidirectional Hybrid Architecture)
Hệ thống sử dụng mô hình kết hợp song song:
1. **Supabase PostgreSQL (Cloud Database & Realtime)**:
   - Dùng cho Client Web SPA trên tên miền `concavachencom.site`.
   - Kết nối trực tiếp qua `supabase-js` v2 sử dụng `SUPABASE_ANON_KEY` và Row-Level Security (RLS).
2. **Google Apps Script Backend (Serverless)**:
   - Dùng cho Google Sheets backend, Google Calendar Sync, Gemini API.
   - Giao tiếp qua `google.script.run` (RPC) hoặc REST Webhook `doPost(e)`.

## 2. Quy Chuẩn Schema Dữ Liệu Bảng (Database Contracts)

### Bảng `tasks` (Công việc)
| Cột | Kiểu | Mô tả |
|---|---|---|
| `id` | `TEXT` / `UUID` | Khóa chính duy nhất của công việc |
| `owner_email` | `TEXT` | Email chủ sở hữu (bắt buộc, lowercase) |
| `title` | `TEXT` | Tiêu đề công việc |
| `description` | `TEXT` | Nội dung mô tả / ghi chú chi tiết |
| `quadrant` | `TEXT` | Ô ma trận Eisenhower (`Q1_URGENT_IMPORTANT`, `Q2_NOT_URGENT_IMPORTANT`, `Q3_URGENT_NOT_IMPORTANT`, `Q4_NOT_URGENT_NOT_IMPORTANT`) |
| `status` | `TEXT` | Trạng thái (`pending`, `completed`, `in_progress`, `cancelled`) |
| `due_date` | `TEXT` / `TIMESTAMPTZ` | Hạn chót (ISO-8601 hoặc `YYYY-MM-DD`) |
| `priority` | `TEXT` | Mức ưu tiên (`high`, `medium`, `low`) |
| `tags` | `TEXT` / `JSON` | Thẻ phân loại môn học / dự án |
| `source` | `TEXT` | Nguồn tạo (`manual`, `fap_sync`, `calendar_sync`) |
| `created_at` | `TIMESTAMPTZ` | Thời gian tạo |
| `updated_at` | `TIMESTAMPTZ` | Thời gian cập nhật gần nhất |

### Bảng `users` (Thông tin người dùng)
| Cột | Kiểu | Mô tả |
|---|---|---|
| `email` | `TEXT` (PK) | Email tài khoản (lowercase) |
| `full_name` | `TEXT` | Họ và tên sinh viên |
| `student_id` | `TEXT` | Mã số sinh viên (VD: SE123456) |
| `major` | `TEXT` | Chuyên ngành |
| `avatar_url` | `TEXT` | Ảnh đại diện |
| `last_sign_in_at` | `TIMESTAMPTZ` | Lần đăng nhập cuối |

## 3. Quy Ước Phản Hồi (Response Standards)
Mọi phản hồi từ backend RPC/API phải tuân theo cấu trúc JSON chuẩn:
```json
{
  "success": true,
  "data": { ... },
  "message": "Thông báo thân thiện bằng Tiếng Việt",
  "errorCode": null
}
```
Khi có lỗi:
```json
{
  "success": false,
  "data": null,
  "message": "Mô tả lỗi chi tiết cho người dùng",
  "errorCode": "UNAUTHORIZED | VALIDATION_ERROR | NOT_FOUND | SERVER_ERROR"
}
```
- Luôn bọc xử lý lỗi bằng `try ... catch` kèm log chi tiết.
- Tuyệt đối không để crash giao diện hoặc làm treo luồng người dùng khi API gián đoạn.
