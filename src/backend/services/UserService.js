// ============================================================================
// USERSERVICE.JS - QUẢN LÝ NGƯỜI DÙNG, PHÂN QUYỀN VÀ THỐNG KÊ HỆ THỐNG
// ============================================================================

/**
 * Xác định chính xác Email người dùng hiện tại (qua Google Session hoặc Client gửi lên)
 * @param {string} clientEmail
 * @returns {string}
 */
function getEffectiveUserEmail(clientEmail) {
  if (clientEmail === 'logout' || clientEmail === 'guest') {
    return '';
  }
  let email = '';
  try {
    const active = Session.getActiveUser();
    if (active) email = active.getEmail();
  } catch (e) {}

  if (!email && clientEmail && typeof clientEmail === 'string' && clientEmail.includes('@')) {
    email = clientEmail.trim();
  }
  return email ? email.toLowerCase() : '';
}

/**
 * Lấy hoặc tự động khởi tạo thông tin người dùng (Onboarding)
 * @param {string} clientEmail
 * @returns {Object}
 */
function getCurrentUser(clientEmail) {
  const email = getEffectiveUserEmail(clientEmail);
  if (!email) {
    return {
      email: '',
      fullName: 'Khách',
      role: 'guest',
      status: 'anonymous',
      createdAt: '',
      lastLoginAt: '',
      tasksCount: 0,
      isAdmin: false,
      newFeedbackCount: 0
    };
  }
  const db = setupDatabase();
  const usersSheet = db.usersSheet;
  const data = usersSheet.getDataRange().getValues();

  let userRowIndex = -1;
  let userData = null;

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).toLowerCase() === email) {
      userRowIndex = i + 1;
      userData = {
        email: data[i][0],
        fullName: data[i][1],
        role: data[i][2],
        status: data[i][3],
        createdAt: data[i][4],
        lastLoginAt: data[i][5],
        tasksCount: data[i][6] || 0
      };
      break;
    }
  }

  const nowIso = new Date().toISOString();

  if (userData) {
    // Cập nhật lần đăng nhập gần nhất
    try {
      usersSheet.getRange(userRowIndex, 6).setValue(nowIso);
    } catch (e) {}
  } else {
    // Tạo mới tài khoản (Tự động mở cửa cho mọi người dùng Google Mail theo yêu cầu)
    const isAdmin = (email === APP_CONFIG.ADMIN_EMAIL.toLowerCase());
    const role = isAdmin ? 'admin' : 'user';
    const initialName = email.split('@')[0];
    userData = {
      email: email,
      fullName: initialName,
      role: role,
      status: 'active',
      createdAt: nowIso,
      lastLoginAt: nowIso,
      tasksCount: 0
    };
    usersSheet.appendRow([
      userData.email, userData.fullName, userData.role, userData.status,
      userData.createdAt, userData.lastLoginAt, userData.tasksCount
    ]);
  }

  // Đếm số lượng Feedback mới chưa xử lý nếu là Admin
  let newFeedbackCount = 0;
  const isAdmin = (email === APP_CONFIG.ADMIN_EMAIL.toLowerCase() || userData.role === 'admin');
  if (isAdmin) {
    try {
      const fbData = db.feedbackSheet.getDataRange().getValues();
      for (let f = 1; f < fbData.length; f++) {
        if (String(fbData[f][5]).toLowerCase() === 'new') {
          newFeedbackCount++;
        }
      }
    } catch (e) {}
  }

  return {
    ...userData,
    isAdmin: isAdmin,
    newFeedbackCount: newFeedbackCount
  };
}

/**
 * Lấy số liệu thống kê dành riêng cho trang Admin Portal
 * @param {string} clientEmail
 * @returns {Object}
 */
function getAdminStats(clientEmail) {
  const email = getEffectiveUserEmail(clientEmail);
  const isAdmin = (email === APP_CONFIG.ADMIN_EMAIL.toLowerCase());
  if (!isAdmin) {
    throw new Error("Từ chối truy cập: Bạn không có quyền xem thông tin quản trị hệ thống!");
  }

  const db = setupDatabase();
  const users = [];
  const uData = db.usersSheet.getDataRange().getValues();
  for (let i = 1; i < uData.length; i++) {
    users.push({
      email: uData[i][0],
      fullName: uData[i][1],
      role: uData[i][2],
      status: uData[i][3],
      createdAt: uData[i][4],
      lastLoginAt: uData[i][5],
      tasksCount: uData[i][6] || 0
    });
  }

  const feedbacks = [];
  let newFeedbackCount = 0;
  const fbData = db.feedbackSheet.getDataRange().getValues();
  for (let f = 1; f < fbData.length; f++) {
    const status = String(fbData[f][5] || 'new').toLowerCase();
    if (status === 'new') newFeedbackCount++;
    feedbacks.unshift({
      id: fbData[f][0],
      userEmail: fbData[f][1],
      category: fbData[f][2],
      content: fbData[f][3],
      createdAt: fbData[f][4],
      status: status
    });
  }

  const tasksCount = Math.max(0, db.tasksSheet.getLastRow() - 1);

  return {
    totalUsers: users.length,
    activeUsers: users.filter(u => u.status === 'active').length,
    totalTasks: tasksCount,
    newFeedbackCount: newFeedbackCount,
    users: users,
    feedbacks: feedbacks
  };
}

/**
 * Xóa vĩnh viễn toàn bộ dữ liệu của người dùng (Admin only):
 * - Xóa tất cả tasks thuộc về người dùng trong tasksSheet
 * - Xóa dòng người dùng trong usersSheet
 * - Xóa tất cả feedbacks của người dùng trong feedbackSheet
 * Khi người dùng đăng nhập lại, họ sẽ bắt đầu như một người dùng mới hoàn toàn.
 * @param {string} targetEmail
 * @param {string} clientEmail
 * @returns {Object}
 */
function deleteUserData(targetEmail, clientEmail) {
  const email = getEffectiveUserEmail(clientEmail);
  if (email !== APP_CONFIG.ADMIN_EMAIL.toLowerCase()) {
    throw new Error("Từ chối truy cập: Chỉ Super Admin mới có quyền xóa tài khoản người dùng!");
  }

  if (!targetEmail) {
    throw new Error("Vui lòng cung cấp email người dùng cần xóa!");
  }

  const cleanTarget = targetEmail.trim().toLowerCase();
  if (cleanTarget === APP_CONFIG.ADMIN_EMAIL.toLowerCase()) {
    throw new Error("Không thể xóa tài khoản của Super Admin chính!");
  }

  const db = setupDatabase();

  // 1. Xóa toàn bộ tasks của người dùng trong tasksSheet (Duyệt ngược từ dưới lên)
  let deletedTasksCount = 0;
  const tasksSheet = db.tasksSheet;
  const tasksData = tasksSheet.getDataRange().getValues();
  for (let i = tasksData.length - 1; i >= 1; i--) {
    const rowOwner = String(tasksData[i][12] || '').trim().toLowerCase();
    if (rowOwner === cleanTarget) {
      tasksSheet.deleteRow(i + 1);
      deletedTasksCount++;
    }
  }

  // 2. Xóa dòng người dùng trong usersSheet
  let userDeleted = false;
  const usersSheet = db.usersSheet;
  const usersData = usersSheet.getDataRange().getValues();
  for (let i = usersData.length - 1; i >= 1; i--) {
    const rowEmail = String(usersData[i][0] || '').trim().toLowerCase();
    if (rowEmail === cleanTarget) {
      usersSheet.deleteRow(i + 1);
      userDeleted = true;
    }
  }

  // 3. Xóa feedbacks của người dùng trong feedbackSheet
  let deletedFbCount = 0;
  if (db.feedbackSheet) {
    const fbData = db.feedbackSheet.getDataRange().getValues();
    for (let i = fbData.length - 1; i >= 1; i--) {
      const fbEmail = String(fbData[i][1] || '').trim().toLowerCase();
      if (fbEmail === cleanTarget) {
        db.feedbackSheet.deleteRow(i + 1);
        deletedFbCount++;
      }
    }
  }

  return { 
    success: true, 
    message: `Đã xóa vĩnh viễn tài khoản ${targetEmail} (gồm ${deletedTasksCount} công việc). Khi đăng nhập lại sẽ là người dùng mới.`,
    deletedTasksCount: deletedTasksCount,
    userDeleted: userDeleted,
    deletedFbCount: deletedFbCount
  };
}

/**
 * Khóa / Mở khóa tài khoản người dùng (Admin only - Fallback cũ)
 * @param {string} targetEmail
 * @param {string} newStatus
 * @param {string} clientEmail
 * @returns {Object}
 */
function toggleUserStatus(targetEmail, newStatus, clientEmail) {
  const email = getEffectiveUserEmail(clientEmail);
  if (email !== APP_CONFIG.ADMIN_EMAIL.toLowerCase()) {
    throw new Error("Từ chối truy cập: Chỉ Admin mới có quyền quản lý tài khoản!");
  }

  if (targetEmail.toLowerCase() === APP_CONFIG.ADMIN_EMAIL.toLowerCase()) {
    throw new Error("Không thể thay đổi trạng thái của tài khoản Admin chính!");
  }

  const db = setupDatabase();
  const data = db.usersSheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).toLowerCase() === targetEmail.toLowerCase()) {
      db.usersSheet.getRange(i + 1, 4).setValue(newStatus);
      return { success: true, message: `Đã chuyển trạng thái người dùng thành: ${newStatus}` };
    }
  }
  return { success: false, message: "Không tìm thấy người dùng này" };
}
