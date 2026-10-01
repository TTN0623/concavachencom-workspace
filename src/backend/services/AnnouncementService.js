// ============================================================================
// ANNOUNCEMENTSERVICE.JS - QUẢN LÝ THÔNG BÁO VÀ BÁO CÁO HỆ THỐNG
// ============================================================================

/**
 * Lấy danh sách thông báo hệ thống / Admin (Dành cho Trung tâm thông báo)
 * @returns {Array<Object>}
 */
function getAnnouncements() {
  const db = setupDatabase();
  const sheet = db.announcementsSheet;
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  const list = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (String(row[6] || '').toLowerCase() === 'inactive') continue;
    let createdAt = row[3];
    if (createdAt instanceof Date) createdAt = createdAt.toISOString();
    list.push({
      id: String(row[0] || ''),
      title: String(row[1] || ''),
      content: String(row[2] || ''),
      createdAt: String(createdAt || ''),
      author: String(row[4] || 'Admin'),
      type: String(row[5] || 'admin')
    });
  }
  // Sắp xếp mới nhất lên đầu
  list.sort(function(a, b) {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
  return list;
}

/**
 * Thêm thông báo mới từ Admin (Admin only)
 * @param {string} title
 * @param {string} content
 * @param {string} type
 * @param {string} clientEmail
 * @returns {Object}
 */
function addAnnouncement(title, content, type, clientEmail) {
  const email = getEffectiveUserEmail(clientEmail);
  if (email !== APP_CONFIG.ADMIN_EMAIL.toLowerCase()) {
    throw new Error("Từ chối truy cập: Chỉ Admin mới có quyền tạo thông báo chung!");
  }
  const db = setupDatabase();
  const sheet = db.announcementsSheet;
  const id = 'ann_' + Date.now();
  const nowIso = new Date().toISOString();
  sheet.appendRow([
    id,
    String(title || '').trim(),
    String(content || '').trim(),
    nowIso,
    "Nguyễn Trọng Tài (Admin)",
    type || 'admin',
    'active'
  ]);
  return { success: true, id: id, message: "Đã tạo thông báo mới thành công!" };
}
