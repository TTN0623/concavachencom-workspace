// ============================================================================
// FEEDBACKSERVICE.JS - TIẾP NHẬN VÀ QUẢN TRỊ PHẢN HỒI GÓP Ý NGƯỜI DÙNG
// ============================================================================

/**
 * Gửi ý kiến phản hồi / góp ý từ người dùng (Lưu vào tab Feedback)
 * @param {Object} feedbackData
 * @param {string} clientEmail
 * @returns {Object}
 */
function submitFeedback(feedbackData, clientEmail) {
  if (!feedbackData || !feedbackData.content) {
    return { success: false, message: "Nội dung góp ý không được để trống!" };
  }

  const email = getEffectiveUserEmail(clientEmail || feedbackData.userEmail);
  const db = setupDatabase();
  const id = 'fb_' + Utilities.getUuid().slice(0, 8);
  const nowIso = new Date().toISOString();
  const category = feedbackData.category || 'Góp ý tính năng';
  const content = String(feedbackData.content).trim();

  db.feedbackSheet.appendRow([
    id, email, category, content, nowIso, 'new'
  ]);

  return {
    success: true,
    message: "Cảm ơn bạn! Góp ý đã được chuyển trực tiếp đến Admin trtainguyen2306@gmail.com."
  };
}

/**
 * Cập nhật trạng thái phản hồi (Admin only)
 * @param {string} feedbackId
 * @param {string} newStatus
 * @param {string} clientEmail
 * @returns {Object}
 */
function updateFeedbackStatus(feedbackId, newStatus, clientEmail) {
  const email = getEffectiveUserEmail(clientEmail);
  if (email !== APP_CONFIG.ADMIN_EMAIL.toLowerCase()) {
    throw new Error("Từ chối truy cập: Chỉ Admin mới có quyền cập nhật trạng thái góp ý!");
  }

  const db = setupDatabase();
  const data = db.feedbackSheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(feedbackId)) {
      db.feedbackSheet.getRange(i + 1, 6).setValue(newStatus);
      return { success: true, message: "Đã cập nhật trạng thái phản hồi" };
    }
  }
  return { success: false, message: "Không tìm thấy phản hồi này" };
}
