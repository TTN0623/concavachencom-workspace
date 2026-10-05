// ============================================================================
// LEADSERVICE.JS - TIẾP NHẬN ĐĂNG KÝ DÙNG THỬ SỚM TỪ LANDING PAGE
// ============================================================================

/**
 * Lưu lead đăng ký dùng thử sớm từ Landing Page (concavachencom.site) vào tab Leads
 * và gửi email thông báo ngay cho Admin
 * @param {Object} leadData { fullname, email, studentId, sourceUrl, userAgent }
 * @returns {Object}
 */
function saveLead(leadData) {
  if (!leadData || !leadData.fullname || !leadData.email) {
    return { success: false, message: "Thiếu Họ tên hoặc Email!" };
  }

  const fullname = String(leadData.fullname).trim();
  const email = String(leadData.email).trim();
  const studentId = leadData.studentId ? String(leadData.studentId).trim() : "Không cung cấp";
  const sourceUrl = leadData.sourceUrl || "";
  const userAgent = leadData.userAgent || "";
  const nowIso = new Date().toISOString();

  const db = setupDatabase();
  const id = 'lead_' + Utilities.getUuid().slice(0, 8);

  db.leadsSheet.appendRow([
    id, fullname, email, studentId, nowIso, sourceUrl, userAgent
  ]);

  try {
    MailApp.sendEmail({
      to: APP_CONFIG.ADMIN_EMAIL,
      subject: '🎉 Lead mới đăng ký dùng thử sớm - Con Cá và Chén Cơm',
      body:
        'Có một lượt đăng ký dùng thử sớm mới từ Landing Page:\n\n' +
        'Họ tên: ' + fullname + '\n' +
        'Email: ' + email + '\n' +
        'MSSV: ' + studentId + '\n' +
        'Thời gian: ' + nowIso + '\n' +
        'Nguồn: ' + sourceUrl + '\n\n' +
        'Xem đầy đủ tại Sheet: ' + APP_CONFIG.SPREADSHEET_URL
    });
  } catch (e) {
    Logger.log("saveLead: gửi email thông báo thất bại - " + e.message);
  }

  return { success: true, message: "Đã lưu đăng ký thành công", id: id };
}
