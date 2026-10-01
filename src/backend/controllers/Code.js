// ============================================================================
// CODE.JS - ROOT CONTROLLER & WEB APP ROUTER
// CÁ CƠM WORKSPACE
// ============================================================================

/**
 * Helper hàm nhúng các file HTML con vào template chính
 * Tuân thủ mô hình Modular Web App của Google Apps Script
 * Hỗ trợ tra cứu thông minh trên cấu trúc thư mục phân cấp
 * @param {string} filename Tên file HTML con (không bao gồm đuôi .html)
 * @returns {string} Nội dung HTML được include
 */
function include(filename) {
  var candidatePaths = [
    filename,
    'frontend/entry/' + filename,
    'frontend/styles/' + filename,
    'frontend/components/' + filename,
    'frontend/modules/core/' + filename,
    'frontend/modules/auth/' + filename,
    'frontend/modules/task-matrix/' + filename,
    'frontend/modules/calendar-fap/' + filename,
    'frontend/modules/dashboard/' + filename,
    'frontend/modules/freetime/' + filename,
    'frontend/modules/notifications/' + filename,
    'frontend/modules/admin/' + filename
  ];
  for (var i = 0; i < candidatePaths.length; i++) {
    try {
      return HtmlService.createHtmlOutputFromFile(candidatePaths[i]).getContent();
    } catch(e) {}
  }
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * Controller xử lý HTTP GET:
 * - Hỗ trợ các REST-like endpoints nhẹ (?action=getSheetData, ?action=testCalendar)
 * - Tải dữ liệu server-side preload để giao diện hiển thị ngay lập tức (zero blank flicker)
 * - Render Index.html template
 * @param {Object} e Event parameter của Google Apps Script
 * @returns {GoogleAppsScript.HTML.HtmlOutput|GoogleAppsScript.Content.TextOutput}
 */
function doGet(e) {
  // 1. Endpoint kiểm tra dữ liệu Sheet dạng JSON
  if (e && e.parameter && e.parameter.action === 'getSheetData') {
    try {
      const sheet = setupSheet();
      const values = sheet.getDataRange().getValues();
      return ContentService.createTextOutput(JSON.stringify({ 
        rowCount: values.length, 
        headers: values[0], 
        allRows: values.slice(1) 
      })).setMimeType(ContentService.MimeType.JSON);
    } catch (err) {
      return ContentService.createTextOutput(JSON.stringify({ error: err.message }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }

  // Endpoint kích hoạt đồng bộ toàn bộ Sheet sang Supabase
  if (e && e.parameter && e.parameter.action === 'syncAllToSupabase') {
    try {
      const syncRes = syncAllSheetTasksToSupabase();
      return ContentService.createTextOutput(JSON.stringify(syncRes))
        .setMimeType(ContentService.MimeType.JSON);
    } catch (err) {
      return ContentService.createTextOutput(JSON.stringify({ error: err.message }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }

  // 2. Endpoint kiểm tra kết nối Google Calendar
  if (e && e.parameter && e.parameter.action === 'testCalendar') {
    try {
      const calRes = getCalendarEvents();
      return ContentService.createTextOutput(JSON.stringify(calRes))
        .setMimeType(ContentService.MimeType.JSON);
    } catch (err) {
      return ContentService.createTextOutput(JSON.stringify({ error: err.message }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }

  // 3. Preload dữ liệu người dùng & tác vụ từ Server
  let serverTasks = [];
  let currentUser = null;
  const clientEmailParam = (e && e.parameter) ? e.parameter.user : '';
  const currentEmail = getEffectiveUserEmail(clientEmailParam);

  try {
    setupDatabase();
    currentUser = getCurrentUser(currentEmail);
    serverTasks = getTasks(currentEmail);
  } catch (err) {
    Logger.log("doGet setupDatabase/preload error: " + err.message);
  }

  // 4. Render Index template cùng dữ liệu preload
  var template;
  try {
    template = HtmlService.createTemplateFromFile('frontend/entry/Index');
  } catch(e) {
    template = HtmlService.createTemplateFromFile('Index');
  }
  template.serverTasks = serverTasks;
  template.serverVersion = APP_CONFIG.VERSION;
  template.serverUserEmail = currentEmail;
  template.isAdmin = (!!currentEmail && currentEmail === APP_CONFIG.ADMIN_EMAIL.toLowerCase());
  template.newFeedbackCount = (currentUser && currentUser.newFeedbackCount) ? currentUser.newFeedbackCount : 0;

  return template.evaluate()
    .setTitle('Cá Cơm và Chén Cơm - Quản lý công việc & Thời khóa biểu')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Controller xử lý HTTP POST:
 * - Tiếp nhận webhook từ FAP extension hoặc API bên ngoài
 * - Đồng bộ lịch học vào Google Sheet
 * @param {Object} e Event parameter của Google Apps Script
 * @returns {GoogleAppsScript.Content.TextOutput}
 */
function doPost(e) {
  try {
    let payload = null;
    if (e && e.postData && e.postData.contents) {
      try {
        payload = JSON.parse(e.postData.contents);
      } catch (ex) {
        if (e.parameter && e.parameter.data) {
          payload = JSON.parse(e.parameter.data);
        }
      }
    } else if (e && e.parameter) {
      payload = e.parameter;
    }

    if (!payload) {
      return ContentService.createTextOutput(JSON.stringify({ 
        success: false, 
        message: 'Dữ liệu POST rỗng' 
      })).setMimeType(ContentService.MimeType.JSON);
    }

    if (payload.action === 'syncFAP' || payload.events) {
      const events = payload.events || [];
      const result = saveFapEventsToSheet(events);
      return ContentService.createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Nhận webhook đồng bộ công việc từ concavachencom.site sang Google Sheet
    if (payload.action === 'syncFromWeb' && payload.task) {
      const t = payload.task;
      const res = updateTask(t.id, t, t.ownerEmail || APP_CONFIG.ADMIN_EMAIL);
      return ContentService.createTextOutput(JSON.stringify(res))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Nhận webhook xóa công việc từ concavachencom.site sang Google Sheet
    if (payload.action === 'deleteFromWeb' && payload.taskId) {
      const res = deleteTask(payload.taskId, payload.ownerEmail || APP_CONFIG.ADMIN_EMAIL);
      return ContentService.createTextOutput(JSON.stringify(res))
        .setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({ 
      success: true, 
      message: 'Received' 
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    Logger.log("doPost error: " + err.message);
    return ContentService.createTextOutput(JSON.stringify({ 
      success: false, 
      error: err.message 
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Tự động tạo Menu trên Google Sheet khi mở file để đồng bộ 1-click
 */
function onOpen() {
  try {
    SpreadsheetApp.getUi()
      .createMenu('🐟 Cá Cơm Workspace')
      .addItem('🔄 Đồng bộ tất cả Sheet sang Web (Supabase)', 'syncAllSheetTasksToSupabase')
      .addItem('📅 Cấp quyền Google Calendar', 'aaa_CapQuyen_Calendar')
      .addToUi();
  } catch(e) {}
}