// ============================================================================
// TASKSERVICE.JS - NGHIỆP VỤ QUẢN LÝ CÔNG VIỆC, MA TRẬN & ĐỒNG BỘ LỊCH HỌC FAP
// ============================================================================

/**
 * Chuẩn hóa phân loại công việc vào 3 danh mục tiêu chuẩn: Học tập, Công việc, Cá nhân
 * @param {string} category
 * @param {string} taskTitle
 * @returns {string}
 */
function normalizeCategory(category, taskTitle) {
  const cat = String(category || '').trim().toLowerCase();
  if (cat.includes('học') || cat.includes('hoc') || cat.includes('study')) return 'Học tập';
  if (cat.includes('việc') || cat.includes('viec') || cat.includes('work') || cat.includes('job')) return 'Công việc';
  if (cat.includes('nhân') || cat.includes('nhan') || cat.includes('personal')) return 'Cá nhân';
  if (/^[a-z]{2,4}\d{2,4}/i.test(cat)) return 'Học tập';

  const title = String(taskTitle || '').toLowerCase();
  if (title.startsWith('[') || title.includes('lab') || title.includes('ôn tập') || title.includes('thi') || title.includes('học') || title.includes('bài tập') || title.includes('fap')) {
    return 'Học tập';
  }
  if (title.includes('hợp đồng') || title.includes('dự án') || title.includes('báo cáo') || title.includes('khách hàng') || title.includes('công ty') || title.includes('studio') || title.includes('code') || title.includes('fix')) {
    return 'Công việc';
  }
  return 'Cá nhân';
}

/**
 * Lấy danh sách task từ Sheet (Chuẩn hóa dữ liệu, an toàn serialization & phân quyền người dùng)
 * @param {string} clientEmail
 * @returns {Array<Object>}
 */
function getTasks(clientEmail) {
  const currentUserEmail = getEffectiveUserEmail(clientEmail);
  if (!currentUserEmail) return [];
  const sheet = setupSheet();
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return []; 

  const headers = data[0];
  const tasks = [];
  
  for (let i = 1; i < data.length; i++) {
    let row = data[i];
    let taskObj = {};
    for (let j = 0; j < headers.length; j++) {
      let val = row[j];
      if (val instanceof Date) {
        val = val.toISOString();
      }
      taskObj[headers[j]] = val;
    }

    // Xác định người sở hữu task
    taskObj.ownerEmail = String(row[12] || APP_CONFIG.ADMIN_EMAIL).trim().toLowerCase();
    taskObj.sharedWith = String(row[13] || '').trim().toLowerCase();

    // Cô lập dữ liệu: Người dùng chỉ thấy task của chính mình hoặc task được chia sẻ
    const isOwner = (taskObj.ownerEmail === currentUserEmail);
    const isShared = (taskObj.sharedWith && taskObj.sharedWith.includes(currentUserEmail));
    if (!isOwner && !isShared) {
      continue;
    }

    // Chuẩn hóa kiểu dữ liệu
    taskObj.id = String(taskObj.id || '');
    taskObj.task = String(taskObj.task || '');
    taskObj.quadrant = String(taskObj.quadrant || 'inbox');
    taskObj.done = !!taskObj.done;

    // Tự động khôi phục và sửa lỗi nếu quadrant chứa chuỗi Map do truyền nhầm object
    if (typeof taskObj.quadrant === 'string' && taskObj.quadrant.startsWith('{')) {
      const qMatch = taskObj.quadrant.match(/quadrant=([^,\}]+)/);
      const dMatch = taskObj.quadrant.match(/day=([0-9\.]+)/);
      if (dMatch && (taskObj.day === '' || taskObj.day === undefined)) {
        taskObj.day = Math.round(parseFloat(dMatch[1]));
        try { sheet.getRange(i + 1, 7).setValue(taskObj.day); } catch(e) {}
      }
      if (qMatch) {
        taskObj.quadrant = qMatch[1].trim();
        try { sheet.getRange(i + 1, 3).setValue(taskObj.quadrant); } catch(e) {}
      } else {
        taskObj.quadrant = 'donow';
        try { sheet.getRange(i + 1, 3).setValue('donow'); } catch(e) {}
      }
    }

    if (taskObj.day !== undefined && taskObj.day !== null && taskObj.day !== '') {
      taskObj.day = parseInt(taskObj.day, 10);
    } else {
      taskObj.day = '';
    }

    if (!taskObj.time && taskObj.task) {
      const timeMatch = String(taskObj.task).match(/\((\d{1,2}:\d{2}\s*[-–—]\s*\d{1,2}:\d{2})\)/);
      if (timeMatch) taskObj.time = timeMatch[1].replace(/\s+/g, ' ');
    }
    taskObj.time = taskObj.time ? String(taskObj.time) : '';
    taskObj.duration = taskObj.duration ? parseInt(taskObj.duration, 10) : 0;

    // Chuẩn hóa deadline & priority & status
    taskObj.deadline = taskObj.deadline ? String(taskObj.deadline) : '';
    taskObj.priority = taskObj.priority ? String(taskObj.priority) : 'medium';
    taskObj.status = (taskObj.status === 'cancelled') ? 'cancelled' : 'active';

    // Chuẩn hóa category & subtasks
    taskObj.category = normalizeCategory(row[14], taskObj.task);
    let rawSubtasks = row[15];
    if (rawSubtasks) {
      if (typeof rawSubtasks === 'string') {
        try {
          taskObj.subtasks = JSON.parse(rawSubtasks);
        } catch(e) {
          taskObj.subtasks = [];
        }
      } else if (Array.isArray(rawSubtasks)) {
        taskObj.subtasks = rawSubtasks;
      } else {
        taskObj.subtasks = [];
      }
    } else {
      taskObj.subtasks = [];
    }

    // Xác định nguồn gốc công việc
    taskObj.source = (taskObj.id.startsWith('fap_') || (taskObj.task && taskObj.task.includes('['))) ? 'fap' : 'manual';

    tasks.push(taskObj);
  }
  return tasks;
}

/**
 * Thêm task mới gắn liền với ownerEmail của người dùng hiện tại
 * @returns {Object}
 */
function addTask(taskName, optQuadrant, optDay, optDeadline, optPriority, clientEmail) {
  const emailFromOpt = (typeof optQuadrant === 'object' && optQuadrant !== null) ? optQuadrant.userEmail : null;
  const currentUserEmail = getEffectiveUserEmail(emailFromOpt || clientEmail);
  const db = setupDatabase();
  const sheet = db.tasksSheet;
  const id = Utilities.getUuid();
  const now = new Date();
  
  let quad = "inbox";
  let day = "";
  let deadline = "";
  let priority = "medium";
  let time = "";
  let duration = 0;
  let category = "";
  let subtasks = [];
  
  if (typeof optQuadrant === 'object' && optQuadrant !== null) {
    quad = optQuadrant.quadrant || "inbox";
    day = optQuadrant.day !== undefined ? optQuadrant.day : "";
    deadline = optQuadrant.deadline || "";
    priority = optQuadrant.priority || "medium";
    time = optQuadrant.time || "";
    duration = optQuadrant.duration ? parseInt(optQuadrant.duration, 10) : 0;
    category = normalizeCategory(optQuadrant.category, taskName);
    subtasks = Array.isArray(optQuadrant.subtasks) ? optQuadrant.subtasks : [];
  } else {
    quad = optQuadrant || "inbox";
    day = optDay !== undefined ? optDay : "";
    deadline = optDeadline || "";
    priority = optPriority || "medium";
    category = normalizeCategory("", taskName);
  }
  
  sheet.appendRow([
    id, taskName, quad, now, now, false, day, 
    deadline, priority, 'active', time, duration, 
    currentUserEmail, '', category, JSON.stringify(subtasks)
  ]);

  // Cập nhật số lượng task trong tab Users
  try {
    const uData = db.usersSheet.getDataRange().getValues();
    for (let u = 1; u < uData.length; u++) {
      if (String(uData[u][0]).toLowerCase() === currentUserEmail) {
        const count = parseInt(uData[u][6] || 0, 10) + 1;
        db.usersSheet.getRange(u + 1, 7).setValue(count);
        break;
      }
    }
  } catch(e) {}
  
  return { 
    id: id, 
    task: taskName, 
    quadrant: quad, 
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    done: false, 
    day: day, 
    deadline: deadline, 
    priority: priority, 
    status: 'active', 
    time: time, 
    duration: duration,
    ownerEmail: currentUserEmail,
    category: category,
    subtasks: subtasks
  };
}

/**
 * Cập nhật thông tin task với kiểm tra quyền sở hữu
 * @returns {boolean}
 */
function updateTask(id, fields, clientEmail) {
  const emailFromFields = (typeof fields === 'object' && fields !== null) ? fields.userEmail : null;
  const currentUserEmail = getEffectiveUserEmail(emailFromFields || clientEmail);
  const sheet = setupSheet();
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) { 
      let rowNum = i + 1;
      const ownerEmail = String(data[i][12] || APP_CONFIG.ADMIN_EMAIL).trim().toLowerCase();
      const sharedWith = String(data[i][13] || '').trim().toLowerCase();

      // Kiểm tra quyền sửa task (chủ sở hữu, người được chia sẻ, hoặc Admin)
      const canEdit = (ownerEmail === currentUserEmail || sharedWith.includes(currentUserEmail) || currentUserEmail === APP_CONFIG.ADMIN_EMAIL.toLowerCase());
      if (!canEdit) {
        throw new Error("Bạn không có quyền chỉnh sửa công việc này!");
      }
      
      if (fields.task !== undefined) sheet.getRange(rowNum, 2).setValue(fields.task);
      if (fields.quadrant !== undefined) sheet.getRange(rowNum, 3).setValue(fields.quadrant);
      sheet.getRange(rowNum, 5).setValue(new Date()); 
      if (fields.done !== undefined) sheet.getRange(rowNum, 6).setValue(fields.done);
      if (fields.day !== undefined) sheet.getRange(rowNum, 7).setValue(fields.day);
      if (fields.deadline !== undefined) sheet.getRange(rowNum, 8).setValue(fields.deadline);
      if (fields.priority !== undefined) sheet.getRange(rowNum, 9).setValue(fields.priority);
      if (fields.status !== undefined) sheet.getRange(rowNum, 10).setValue(fields.status);
      if (fields.time !== undefined) sheet.getRange(rowNum, 11).setValue(fields.time);
      if (fields.duration !== undefined) sheet.getRange(rowNum, 12).setValue(fields.duration);
      if (fields.category !== undefined) sheet.getRange(rowNum, 15).setValue(normalizeCategory(fields.category, fields.task || data[i][1]));
      if (fields.subtasks !== undefined) {
        const subtasksStr = typeof fields.subtasks === 'string' ? fields.subtasks : JSON.stringify(fields.subtasks);
        sheet.getRange(rowNum, 16).setValue(subtasksStr);
      }
      
      return true;
    }
  }
  return false;
}

/**
 * Cập nhật hàng loạt công việc (Batch update) giúp tối ưu hiệu năng
 * @returns {boolean}
 */
function batchUpdateTasks(updates, clientEmail) {
  if (!Array.isArray(updates) || updates.length === 0) return true;
  const sheet = setupSheet();
  const data = sheet.getDataRange().getValues();
  const currentUserEmail = getEffectiveUserEmail(clientEmail);
  const now = new Date();

  const updateMap = {};
  updates.forEach(u => {
    if (u && u.id) updateMap[String(u.id)] = u.fields || u;
  });

  for (let i = 1; i < data.length; i++) {
    const id = String(data[i][0]);
    if (updateMap[id]) {
      const rowNum = i + 1;
      const ownerEmail = String(data[i][12] || APP_CONFIG.ADMIN_EMAIL).trim().toLowerCase();
      const sharedWith = String(data[i][13] || '').trim().toLowerCase();
      const canEdit = (ownerEmail === currentUserEmail || sharedWith.includes(currentUserEmail) || currentUserEmail === APP_CONFIG.ADMIN_EMAIL.toLowerCase());
      
      if (canEdit) {
        const fields = updateMap[id];
        if (fields.task !== undefined) sheet.getRange(rowNum, 2).setValue(fields.task);
        if (fields.quadrant !== undefined) sheet.getRange(rowNum, 3).setValue(fields.quadrant);
        sheet.getRange(rowNum, 5).setValue(now); 
        if (fields.done !== undefined) sheet.getRange(rowNum, 6).setValue(fields.done);
        if (fields.day !== undefined) sheet.getRange(rowNum, 7).setValue(fields.day);
        if (fields.deadline !== undefined) sheet.getRange(rowNum, 8).setValue(fields.deadline);
        if (fields.priority !== undefined) sheet.getRange(rowNum, 9).setValue(fields.priority);
        if (fields.status !== undefined) sheet.getRange(rowNum, 10).setValue(fields.status);
        if (fields.time !== undefined) sheet.getRange(rowNum, 11).setValue(fields.time);
        if (fields.duration !== undefined) sheet.getRange(rowNum, 12).setValue(fields.duration);
        if (fields.category !== undefined) sheet.getRange(rowNum, 15).setValue(normalizeCategory(fields.category, fields.task || data[i][1]));
        if (fields.subtasks !== undefined) {
          const subtasksStr = typeof fields.subtasks === 'string' ? fields.subtasks : JSON.stringify(fields.subtasks);
          sheet.getRange(rowNum, 16).setValue(subtasksStr);
        }
      }
    }
  }
  return true;
}

/**
 * Chuyển đổi trạng thái hoàn thành của 1 subtask
 * @returns {Object}
 */
function toggleSubTask(taskId, subTaskId, clientEmail) {
  const currentUserEmail = getEffectiveUserEmail(clientEmail);
  const sheet = setupSheet();
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(taskId)) {
      const rowNum = i + 1;
      const ownerEmail = String(data[i][12] || APP_CONFIG.ADMIN_EMAIL).trim().toLowerCase();
      const sharedWith = String(data[i][13] || '').trim().toLowerCase();
      const canEdit = (ownerEmail === currentUserEmail || sharedWith.includes(currentUserEmail) || currentUserEmail === APP_CONFIG.ADMIN_EMAIL.toLowerCase());
      if (!canEdit) throw new Error("Bạn không có quyền chỉnh sửa công việc này!");

      let rawSubtasks = data[i][15];
      let subtasks = [];
      try {
        subtasks = typeof rawSubtasks === 'string' ? JSON.parse(rawSubtasks || '[]') : (rawSubtasks || []);
      } catch(e) { subtasks = []; }

      let found = false;
      for (let s of subtasks) {
        if (String(s.id) === String(subTaskId)) {
          s.done = !s.done;
          found = true;
          break;
        }
      }

      if (found) {
        sheet.getRange(rowNum, 16).setValue(JSON.stringify(subtasks));
        sheet.getRange(rowNum, 5).setValue(new Date());
        return { success: true, subtasks: subtasks };
      }
      return { success: false, message: "Không tìm thấy việc con" };
    }
  }
  return { success: false, message: "Không tìm thấy công việc" };
}

/**
 * Xóa task với kiểm tra quyền sở hữu và cập nhật bộ đếm
 * @returns {boolean}
 */
function deleteTask(id, clientEmail) {
  const currentUserEmail = getEffectiveUserEmail(clientEmail);
  const db = setupDatabase();
  const sheet = db.tasksSheet;
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) {
      const ownerEmail = String(data[i][12] || APP_CONFIG.ADMIN_EMAIL).trim().toLowerCase();
      const canDelete = (ownerEmail === currentUserEmail || currentUserEmail === APP_CONFIG.ADMIN_EMAIL.toLowerCase());
      if (!canDelete) {
        throw new Error("Bạn không có quyền xóa công việc này!");
      }

      sheet.deleteRow(i + 1);

      // Giảm số lượng task trong tab Users
      try {
        const uData = db.usersSheet.getDataRange().getValues();
        for (let u = 1; u < uData.length; u++) {
          if (String(uData[u][0]).toLowerCase() === ownerEmail) {
            const count = Math.max(0, parseInt(uData[u][6] || 0, 10) - 1);
            db.usersSheet.getRange(u + 1, 7).setValue(count);
            break;
          }
        }
      } catch(e) {}

      return true;
    }
  }
  return false;
}

/**
 * Xử lý lưu mảng các buổi học FAP vào Google Sheet & Google Calendar (Chống trùng lặp tuyệt đối)
 * @param {Array<Object>} events
 * @returns {Object}
 */
function saveFapEventsToSheet(events) {
  if (!Array.isArray(events) || events.length === 0) {
    return { success: false, message: 'Danh sách sự kiện rỗng' };
  }

  const sheet = setupSheet();
  const existingData = sheet.getDataRange().getValues();
  const existingIds = new Set();
  for (let i = 1; i < existingData.length; i++) {
    existingIds.add(String(existingData[i][0]));
  }

  let addedCount = 0;
  let updatedCount = 0;
  const nowStr = new Date().toISOString();

  // Mở Calendar mặc định nếu có quyền
  let cal = null;
  try {
    cal = CalendarApp.getDefaultCalendar();
  } catch(e) {}

  events.forEach(function(item) {
    const subjectCode = item.summary || item.subjectCode || 'Học tập';
    const roomNo = item.location || item.roomNo || '';
    const lecturer = item.description || item.lecturer || '';
    
    let d = null;
    let startHour = '07', startMin = '30', endHour = '09', endMin = '50';
    let slotTime = item.slotTime ? item.slotTime.replace(/[()]/g, '') : '';

    // Trường hợp 1: Định dạng mới của FAP (start: YYYYMMDDTHHmmss)
    if (item.start && typeof item.start === 'string') {
      const sMatch = item.start.match(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})/);
      if (sMatch) {
        const yr = parseInt(sMatch[1], 10);
        const mo = parseInt(sMatch[2], 10) - 1;
        const da = parseInt(sMatch[3], 10);
        startHour = sMatch[4];
        startMin = sMatch[5];
        d = new Date(yr, mo, da, parseInt(startHour, 10), parseInt(startMin, 10));

        if (item.end && typeof item.end === 'string') {
          const eMatch = item.end.match(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})/);
          if (eMatch) {
            endHour = eMatch[4];
            endMin = eMatch[5];
          }
        }
        slotTime = startHour + ':' + startMin + ' - ' + endHour + ':' + endMin;
      }
    }

    // Trường hợp 2: Định dạng date truyền thống (MM/DD/YYYY hoặc YYYY-MM-DD)
    if (!d && item.date) {
      const parts = String(item.date).split('/');
      if (parts.length === 3) {
        d = new Date(parseInt(parts[2]), parseInt(parts[0]) - 1, parseInt(parts[1]));
      } else {
        d = new Date(item.date);
      }
    }

    if (!d || isNaN(d.getTime())) {
      d = new Date();
    }

    const dayOfWeek = d.getDay(); // 0: CN, 1: T2, ...
    const dayIndex = (dayOfWeek === 0 ? 6 : dayOfWeek - 1); // 0=T2, ..., 6=CN

    // Tạo ID định danh duy nhất chống trùng lặp: fap_[MãMôn]_[YYYYMMDD]_[HHmm]
    const dateFormatted = d.getFullYear() + ('0' + (d.getMonth() + 1)).slice(-2) + ('0' + d.getDate()).slice(-2);
    const timeFormatted = startHour + startMin;
    const uniqueId = 'fap_' + subjectCode.replace(/\s+/g, '_') + '_' + dateFormatted + '_' + timeFormatted;

    const taskTitle = '[' + subjectCode + '] ' + (roomNo ? 'P.' + roomNo : '') + (slotTime ? ' (' + slotTime + ')' : '') + (lecturer ? ' - ' + lecturer : '');

    // Nếu đã tồn tại thì cập nhật, nếu chưa thì thêm mới
    if (existingIds.has(uniqueId)) {
      for (let i = 1; i < existingData.length; i++) {
        if (String(existingData[i][0]) === uniqueId) {
          sheet.getRange(i + 1, 2).setValue(taskTitle);
          sheet.getRange(i + 1, 5).setValue(nowStr);
          sheet.getRange(i + 1, 7).setValue(dayIndex);
          updatedCount++;
          break;
        }
      }
    } else {
      sheet.appendRow([uniqueId, taskTitle, 'donow', nowStr, nowStr, false, dayIndex, '', 'medium', 'active', slotTime, 0, APP_CONFIG.ADMIN_EMAIL, '', 'Học tập', '[]']);
      existingIds.add(uniqueId);
      addedCount++;
    }

    // Tự động tạo sự kiện vào Google Calendar nếu có
    if (cal && d) {
      try {
        const startDate = new Date(d);
        startDate.setHours(parseInt(startHour, 10), parseInt(startMin, 10), 0, 0);
        const endDate = new Date(d);
        endDate.setHours(parseInt(endHour, 10), parseInt(endMin, 10), 0, 0);

        const existingCalEvents = cal.getEvents(startDate, endDate);
        const alreadyInCal = existingCalEvents.some(function(ev) {
          return ev.getTitle().includes(subjectCode);
        });

        if (!alreadyInCal) {
          cal.createEvent('[' + subjectCode + '] Học tại ' + (roomNo || 'FPT'), startDate, endDate, {
            location: roomNo || 'Trường Đại học FPT',
            description: (lecturer ? lecturer : ('Môn ' + subjectCode)) + (slotTime ? ' (' + slotTime + ')' : '')
          });
        }
      } catch (calErr) {
        Logger.log("Calendar sync error for item: " + calErr.message);
      }
    }
  });

  return {
    success: true,
    added: addedCount,
    updated: updatedCount,
    total: events.length,
    message: 'Đã đồng bộ ' + events.length + ' buổi học từ FAP mới (Thêm mới: ' + addedCount + ', Cập nhật: ' + updatedCount + ')!'
  };
}

/**
 * Hàm frontend gọi trực tiếp qua google.script.run để đồng bộ FAP
 */
function syncFapEvents(events) {
  return saveFapEventsToSheet(events);
}
