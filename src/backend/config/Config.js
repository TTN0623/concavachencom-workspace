// ============================================================================
// CONFIG.JS - CẤU HÌNH TOÀN CỤC HỆ THỐNG CÁ CƠM WORKSPACE
// ============================================================================

const APP_CONFIG = {
  VERSION: 'v1.7.0',
  SPREADSHEET_ID: '19kIoDPMrrdQCc1y9ZdG7bSU9kCn9MY3eoDzGNQOOek8',
  SPREADSHEET_URL: 'https://docs.google.com/spreadsheets/d/19kIoDPMrrdQCc1y9ZdG7bSU9kCn9MY3eoDzGNQOOek8/edit',
  WEB_APP_URL: 'https://script.google.com/macros/s/AKfycbyS6HtN40EiOxfMGGHNsqN1ZeigSn3nkRJzbsIc1EJoAX3emgBxHXGxYiVGBAtD4sUEag/exec',
  SHEET_NAME_TASKS: 'Tasks',
  SHEET_NAME_USERS: 'Users',
  SHEET_NAME_FEEDBACK: 'Feedback',
  SHEET_NAME_ANNOUNCEMENTS: 'Announcements',
  ADMIN_EMAIL: 'trtainguyen2306@gmail.com',
  SUPABASE_URL: 'https://kqkvsucqkhqsuxrimhez.supabase.co',
  SUPABASE_KEY: 'sb_publishable_UxRex145DBNTSgTOyjjObA_6-ioFEz2'
};

/**
 * Trả về phiên bản hiện tại của ứng dụng
 * @returns {string}
 */
function getAppVersion() {
  return APP_CONFIG.VERSION;
}

/**
 * Lấy cấu hình công khai của ứng dụng (không chứa thông tin nhạy cảm)
 * @returns {Object}
 */
function getAppConfig() {
  return {
    version: APP_CONFIG.VERSION,
    spreadsheetUrl: APP_CONFIG.SPREADSHEET_URL,
    webAppUrl: APP_CONFIG.WEB_APP_URL,
    adminEmail: APP_CONFIG.ADMIN_EMAIL
  };
}
