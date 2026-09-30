// ============================================================================
// DATABASE.JS - QUẢN LÝ KẾT NỐI VÀ CẤU TRÚC DỮ LIỆU GOOGLE SPREADSHEET
// ============================================================================

/**
 * Lấy đối tượng Spreadsheet liên kết (Ưu tiên mở theo ID cấu hình, fallback getActiveSpreadsheet)
 * @returns {GoogleAppsScript.Spreadsheet.Spreadsheet}
 */
function getSpreadsheet() {
  if (APP_CONFIG.SPREADSHEET_ID) {
    try {
      return SpreadsheetApp.openById(APP_CONFIG.SPREADSHEET_ID);
    } catch (e) {
      Logger.log("Không thể mở Sheet theo ID: " + e.message);
    }
  }
  return SpreadsheetApp.getActiveSpreadsheet();
}

/**
 * Khởi tạo toàn bộ các tab dữ liệu chuẩn (Tasks, Users, Feedback, Announcements) nếu chưa tồn tại
 * Đảm bảo kiến trúc CSDL đa người dùng và bảo mật phân quyền
 */
function setupDatabase() {
  const ss = getSpreadsheet();
  if (!ss) {
    throw new Error("Không thể kết nối đến Google Spreadsheet. Vui lòng kiểm tra lại quyền truy cập hoặc ID!");
  }

  // 1. Tab Tasks (Lưu trữ toàn bộ công việc với định danh người sở hữu ownerEmail)
  let tasksSheet = ss.getSheetByName(APP_CONFIG.SHEET_NAME_TASKS);
  if (!tasksSheet) {
    tasksSheet = ss.insertSheet(APP_CONFIG.SHEET_NAME_TASKS);
    tasksSheet.appendRow([
      "id", "task", "quadrant", "createdAt", "updatedAt", 
      "done", "day", "deadline", "priority", "status", 
      "time", "duration", "ownerEmail", "sharedWith",
      "category", "subtasks"
    ]);
    tasksSheet.getRange("A1:P1").setFontWeight("bold");
    tasksSheet.setFrozenRows(1);
  } else {
    const cols = tasksSheet.getLastColumn();
    if (cols < 6) tasksSheet.getRange(1, 6).setValue("done").setFontWeight("bold");
    if (cols < 7) tasksSheet.getRange(1, 7).setValue("day").setFontWeight("bold");
    if (cols < 8) tasksSheet.getRange(1, 8).setValue("deadline").setFontWeight("bold");
    if (cols < 9) tasksSheet.getRange(1, 9).setValue("priority").setFontWeight("bold");
    if (cols < 10) tasksSheet.getRange(1, 10).setValue("status").setFontWeight("bold");
    if (cols < 11) tasksSheet.getRange(1, 11).setValue("time").setFontWeight("bold");
    if (cols < 12) tasksSheet.getRange(1, 12).setValue("duration").setFontWeight("bold");
    if (cols < 13) tasksSheet.getRange(1, 13).setValue("ownerEmail").setFontWeight("bold");
    if (cols < 14) tasksSheet.getRange(1, 14).setValue("sharedWith").setFontWeight("bold");
    if (cols < 15) tasksSheet.getRange(1, 15).setValue("category").setFontWeight("bold");
    if (cols < 16) tasksSheet.getRange(1, 16).setValue("subtasks").setFontWeight("bold");

    // Tự động gán ownerEmail cho các hàng cũ nếu chưa có
    const lastRow = tasksSheet.getLastRow();
    if (lastRow > 1) {
      const emailCol = tasksSheet.getRange(2, 13, lastRow - 1, 1).getValues();
      for (let r = 0; r < emailCol.length; r++) {
        if (!emailCol[r][0]) {
          tasksSheet.getRange(r + 2, 13).setValue(APP_CONFIG.ADMIN_EMAIL);
        }
      }
    }
  }

  // 2. Tab Users (Quản lý tài khoản, phân quyền Admin/User, trạng thái hoạt động)
  let usersSheet = ss.getSheetByName(APP_CONFIG.SHEET_NAME_USERS);
  if (!usersSheet) {
    usersSheet = ss.insertSheet(APP_CONFIG.SHEET_NAME_USERS);
    usersSheet.appendRow([
      "email", "fullName", "role", "status", "createdAt", "lastLoginAt", "tasksCount"
    ]);
    usersSheet.getRange("A1:G1").setFontWeight("bold");
    usersSheet.setFrozenRows(1);

    // Tạo sẵn tài khoản Admin đầu tiên
    const nowIso = new Date().toISOString();
    usersSheet.appendRow([
      APP_CONFIG.ADMIN_EMAIL, "Nguyễn Trọng Tài (Admin)", "admin", "active", nowIso, nowIso, 0
    ]);
  }

  // 3. Tab Feedback (Lưu trữ ý kiến đóng góp & báo lỗi từ người dùng)
  let feedbackSheet = ss.getSheetByName(APP_CONFIG.SHEET_NAME_FEEDBACK);
  if (!feedbackSheet) {
    feedbackSheet = ss.insertSheet(APP_CONFIG.SHEET_NAME_FEEDBACK);
    feedbackSheet.appendRow([
      "id", "userEmail", "category", "content", "createdAt", "status"
    ]);
    feedbackSheet.getRange("A1:F1").setFontWeight("bold");
    feedbackSheet.setFrozenRows(1);
  }

  // 4. Tab Announcements (Lưu trữ thông báo chung từ Admin / Hệ thống)
  let announcementsSheet = ss.getSheetByName(APP_CONFIG.SHEET_NAME_ANNOUNCEMENTS);
  if (!announcementsSheet) {
    announcementsSheet = ss.insertSheet(APP_CONFIG.SHEET_NAME_ANNOUNCEMENTS);
    announcementsSheet.appendRow([
      "id", "title", "content", "createdAt", "author", "type", "status"
    ]);
    announcementsSheet.getRange("A1:G1").setFontWeight("bold");
    announcementsSheet.setFrozenRows(1);

    const nowIso = new Date().toISOString();
    announcementsSheet.appendRow([
      "ann_welcome",
      "Chào mừng đến với Cá Cơm Workspace v1.6.5",
      "Hệ thống đã nâng cấp toàn diện: Cài đặt PWA di động, Ma trận Eisenhower chuẩn, phân loại 3 danh mục Học tập - Công việc - Cá nhân và Trung tâm thông báo thông minh!",
      nowIso,
      "Nguyễn Trọng Tài (Admin)",
      "system",
      "active"
    ]);
  }

  return { tasksSheet, usersSheet, feedbackSheet, announcementsSheet };
}

/**
 * Backward compatibility: Gọi setupDatabase và trả về sheet Tasks
 * @returns {GoogleAppsScript.Spreadsheet.Sheet}
 */
function setupSheet() {
  const db = setupDatabase();
  return db.tasksSheet;
}
