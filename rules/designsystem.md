# Design System — Cá Cơm và Chén Cơm (ALWAYS ON)

## 1. Bản Sắc Thiết Kế (Design Identity)
- **Tên sản phẩm**: Cá Cơm và Chén Cơm
- **Đối tượng**: Học sinh, sinh viên, người dùng cá nhân; đối tượng phụ: Sinh viên Đại học FPT.
- **Phong cách chủ đạo**: Modern, Clean, Minimalist, Năng động, Không rườm rà. Tránh hiệu ứng chuyển màu (gradient) hoặc hoạt ảnh (animation) quá lố gây nặng máy.
- **Hỗ trợ giao diện**: Hỗ trợ 100% Dark Mode (`.dark`) và Light Mode đồng bộ mượt mà qua class Tailwind.

## 2. Bảng Màu Chuẩn (Color Palette)
- **Primary Brand (Màu chủ đạo FPT)**: `#0054a6` (Hover: `#004285`, Active: `#00366d`)
- **Accent Blue**: `#2563eb` (Blue-600)
- **Success / Hoàn thành**: Emerald/Green (`#10b981`, Green-600)
- **Warning / Khẩn cấp**: Amber/Orange (`#f59e0b`, Amber-500, Orange-500)
- **Danger / Hủy / Quá hạn**: Rose/Red (`#ef4444`, Red-500)
- **Neutral Light**:
  - Background Body: `#f8fafc` (Slate-50)
  - Card / Surface: `#ffffff`
  - Border: `#e2e8f0` (Slate-200)
  - Text Primary: `#0f172a` (Slate-900)
  - Text Secondary: `#64748b` (Slate-500)
- **Neutral Dark**:
  - Background Body: `#0f172a` (Slate-900)
  - Card / Surface: `#1e293b` (Slate-800)
  - Border: `#334155` (Slate-700)
  - Text Primary: `#f8fafc` (Slate-50)
  - Text Secondary: `#94a3b8` (Slate-400)

## 3. Typography
- **Font chữ chính**: `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`
- **Cỡ chữ tiêu chuẩn**:
  - Heading 1 / Screen Title: `text-xl` hoặc `text-2xl` font-black
  - Section Header / Modal Title: `text-sm` hoặc `text-base` font-bold
  - Body / Item Title: `text-xs` hoặc `text-sm` font-medium
  - Subtext / Badge / Metadata: `text-[10px]` hoặc `text-[11px]` font-semibold / regular
- **Line-height**: `leading-relaxed` cho văn bản, `leading-tight` cho tiêu đề.

## 4. Spacing & Radius
- **Border Radius**:
  - Nút bấm / Tag / Input: `rounded-xl` (12px) hoặc `rounded-lg` (8px)
  - Modal / Card lớn: `rounded-2xl` (16px) hoặc `rounded-3xl` (24px)
  - Avatar: `rounded-full`
- **Padding & Gap**:
  - Khoảng cách thẻ (card padding): `p-4` đến `p-6`
  - Khoảng cách giữa các phần tử: `gap-2`, `gap-3`, `gap-4`

## 5. Quy Chuẩn Thành Phần (Component Guidelines)
- **Nút bấm (Buttons)**:
  - Nút chính (Primary): Nền `#0054a6`, chữ trắng, shadow nhẹ, transition `transition-all duration-150`, trạng thái hover sẫm hơn, trạng thái `disabled:opacity-50 disabled:cursor-not-allowed`.
  - Nút phụ (Secondary / Ghost): Nền `bg-slate-100` (dark: `bg-slate-800`), viền nhẹ `border border-slate-200` (dark: `border-slate-700`), chữ màu `slate-700` (dark: `slate-300`).
  - Nút xóa / Cảnh báo: Chữ đỏ, nền đỏ nhạt hover.
- **Form & Input**:
  - Viền rõ ràng `border border-slate-300 dark:border-slate-600`, focus có `focus:ring-2 focus:ring-[#0054a6] focus:border-transparent outline-none`.
- **Responsive Requirement**:
  - 100% Mobile First: Phải hiển thị chuẩn trên màn hình từ 360px đến desktop 4K (24", 27").
  - Thanh điều hướng Mobile (Bottom Nav) trên di động, Sidebar mở rộng trên Desktop. Không để tràn chiều ngang (`overflow-x-hidden`).
