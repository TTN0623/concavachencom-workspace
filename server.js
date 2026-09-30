const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const INDEX_PATH = path.join(__dirname, 'Index.html');

const MOCK_SCRIPT = `
<script id="gas-local-mock">
  (function() {
    const STORAGE_KEY_TASKS = 'csg_eisenhower_tasks';
    const STORAGE_KEY_FEEDBACK = 'csg_feedbacks';
    const STORAGE_KEY_USERS = 'csg_users';
    const ADMIN_EMAIL = 'trtainguyen2306@gmail.com';

    const DEFAULT_TASKS = [
      { id: 'task-1', task: 'Khắc phục lỗi phân quyền truy cập form dữ liệu', category: 'Công việc', subtasks: [{ id: 'sub-1', text: 'Kiểm tra token session', done: true }, { id: 'sub-2', text: 'Cập nhật middleware Auth', done: false }], quadrant: 'donow', ownerEmail: ADMIN_EMAIL },
      { id: 'task-2', task: 'Gửi hợp đồng dự án CSG Studio trước 17h', category: 'Công việc', subtasks: [{ id: 'sub-3', text: 'Ký điện tử file PDF', done: false }], quadrant: 'donow', ownerEmail: ADMIN_EMAIL },
      { id: 'task-3', task: 'Lên kế hoạch phát triển tính năng Export Excel', category: 'Học tập', subtasks: [], quadrant: 'plan', ownerEmail: ADMIN_EMAIL },
      { id: 'task-4', task: 'Thiết kế wireframe cho phiên bản mobile', category: 'Học tập', subtasks: [{ id: 'sub-4', text: 'Vẽ màn Dashboard', done: true }, { id: 'sub-5', text: 'Vẽ màn Matrix', done: true }], quadrant: 'plan', ownerEmail: ADMIN_EMAIL },
      { id: 'task-5', task: 'Kiểm tra lại danh sách email thành viên mới', category: 'Cá nhân', subtasks: [], quadrant: 'delegate', ownerEmail: ADMIN_EMAIL },
      { id: 'task-6', task: 'Tìm hiểu công cụ chat nội bộ đã ngừng hỗ trợ', category: 'Cá nhân', subtasks: [], quadrant: 'drop', ownerEmail: ADMIN_EMAIL },
      { id: 'task-7', task: 'Chuẩn bị slide báo cáo tuần cho ban giám đốc', category: 'Công việc', subtasks: [], quadrant: 'inbox', ownerEmail: ADMIN_EMAIL },
      { id: 'task-8', task: 'Nghiên cứu áp dụng Supabase vào hệ thống CSG', category: 'Công việc', subtasks: [], quadrant: 'inbox', ownerEmail: ADMIN_EMAIL }
    ];

    function getStoredTasks() {
      const data = localStorage.getItem(STORAGE_KEY_TASKS);
      if (!data) {
        localStorage.setItem(STORAGE_KEY_TASKS, JSON.stringify(DEFAULT_TASKS));
        return [...DEFAULT_TASKS];
      }
      try {
        return JSON.parse(data);
      } catch (e) {
        return [...DEFAULT_TASKS];
      }
    }

    function saveStoredTasks(tasks) {
      localStorage.setItem(STORAGE_KEY_TASKS, JSON.stringify(tasks));
    }

    function getStoredUsers() {
      const data = localStorage.getItem(STORAGE_KEY_USERS);
      if (!data) {
        const defaultUsers = [
          { email: ADMIN_EMAIL, fullName: 'Nguyễn Trọng Tài (Admin)', role: 'admin', status: 'active', lastLoginAt: new Date().toISOString(), tasksCount: 8 },
          { email: 'student1@fpt.edu.vn', fullName: 'Lê Văn An', role: 'user', status: 'active', lastLoginAt: new Date().toISOString(), tasksCount: 3 }
        ];
        localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(defaultUsers));
        return defaultUsers;
      }
      try { return JSON.parse(data); } catch(e) { return []; }
    }

    function getStoredFeedback() {
      const data = localStorage.getItem(STORAGE_KEY_FEEDBACK);
      if (!data) {
        const defaultFb = [
          { id: 'fb_1', userEmail: 'student1@fpt.edu.vn', category: 'Góp ý tính năng', content: 'Thêm thông báo âm thanh khi đến giờ slot học nhé Admin ơi!', createdAt: new Date().toISOString(), status: 'new' }
        ];
        localStorage.setItem(STORAGE_KEY_FEEDBACK, JSON.stringify(defaultFb));
        return defaultFb;
      }
      try { return JSON.parse(data); } catch(e) { return []; }
    }

    function saveStoredFeedback(list) {
      localStorage.setItem(STORAGE_KEY_FEEDBACK, JSON.stringify(list));
    }

    const STORAGE_KEY_ANNOUNCEMENTS = 'fap_announcements_db';
    function getStoredAnnouncements() {
      const data = localStorage.getItem(STORAGE_KEY_ANNOUNCEMENTS);
      if (!data) {
        const defaultAnn = [
          {
            id: 'ann_welcome',
            title: 'Chào mừng đến với Cá Cơm Workspace v1.6.2',
            content: 'Cá Cơm Workspace đã được nâng cấp toàn diện:\n• Hỗ trợ cài đặt PWA lên điện thoại (Add to Home Screen)\n• Phân loại chuẩn 3 danh mục: Học tập, Công việc, Cá nhân\n• Quản lý checklist việc con (Sub-tasks)\n• Trung tâm thông báo & Báo cáo ngày thông minh\n\nChúc bạn có một ngày làm việc và học tập thật hiệu quả!',
            createdAt: new Date().toISOString(),
            author: 'Nguyễn Trọng Tài (Admin)',
            type: 'system'
          }
        ];
        localStorage.setItem(STORAGE_KEY_ANNOUNCEMENTS, JSON.stringify(defaultAnn));
        return defaultAnn;
      }
      try { return JSON.parse(data); } catch(e) { return []; }
    }

    function createRunner() {
      return {
        _successHandler: null,
        _failureHandler: null,
        withSuccessHandler: function(fn) {
          this._successHandler = fn;
          return this;
        },
        withFailureHandler: function(fn) {
          this._failureHandler = fn;
          return this;
        },
        getCurrentUser: function(clientEmail) {
          const success = this._successHandler;
          const email = (clientEmail || ADMIN_EMAIL).toLowerCase();
          const users = getStoredUsers();
          let user = users.find(u => u.email.toLowerCase() === email);
          if (!user) {
            user = {
              email: email,
              fullName: email.split('@')[0],
              role: email === ADMIN_EMAIL ? 'admin' : 'user',
              status: 'active',
              createdAt: new Date().toISOString(),
              lastLoginAt: new Date().toISOString(),
              tasksCount: 0
            };
            users.push(user);
            localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
          }
          const fbs = getStoredFeedback();
          const newFeedbackCount = fbs.filter(f => f.status === 'new').length;
          setTimeout(() => {
            if (success) success({
              ...user,
              isAdmin: (email === ADMIN_EMAIL || user.role === 'admin'),
              newFeedbackCount: newFeedbackCount
            });
          }, 80);
        },
        getAdminStats: function(clientEmail) {
          const success = this._successHandler;
          const users = getStoredUsers();
          const feedbacks = getStoredFeedback();
          const tasks = getStoredTasks();
          setTimeout(() => {
            if (success) success({
              totalUsers: users.length,
              activeUsers: users.filter(u => u.status === 'active').length,
              totalTasks: tasks.length,
              newFeedbackCount: feedbacks.filter(f => f.status === 'new').length,
              users: users,
              feedbacks: feedbacks
            });
          }, 120);
        },
        submitFeedback: function(feedbackData, clientEmail) {
          const success = this._successHandler;
          const list = getStoredFeedback();
          const email = clientEmail || feedbackData.userEmail || ADMIN_EMAIL;
          list.unshift({
            id: 'fb_' + Date.now(),
            userEmail: email,
            category: feedbackData.category || 'Góp ý tính năng',
            content: feedbackData.content || '',
            createdAt: new Date().toISOString(),
            status: 'new'
          });
          saveStoredFeedback(list);
          setTimeout(() => {
            if (success) success({ success: true, message: 'Đã gửi góp ý thành công đến Admin!' });
          }, 100);
        },
        updateFeedbackStatus: function(feedbackId, newStatus) {
          const success = this._successHandler;
          const list = getStoredFeedback();
          const item = list.find(f => f.id === feedbackId);
          if (item) {
            item.status = newStatus;
            saveStoredFeedback(list);
          }
          setTimeout(() => {
            if (success) success({ success: true, message: 'Đã cập nhật trạng thái phản hồi' });
          }, 80);
        },
        toggleUserStatus: function(targetEmail, newStatus) {
          const success = this._successHandler;
          const users = getStoredUsers();
          const item = users.find(u => u.email.toLowerCase() === targetEmail.toLowerCase());
          if (item) {
            item.status = newStatus;
            localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
          }
          setTimeout(() => {
            if (success) success({ success: true, message: 'Đã đổi trạng thái tài khoản' });
          }, 80);
        },
        getAnnouncements: function() {
          const success = this._successHandler;
          const list = getStoredAnnouncements();
          setTimeout(() => {
            if (success) success(list);
          }, 80);
        },
        addAnnouncement: function(title, content, type) {
          const success = this._successHandler;
          const list = getStoredAnnouncements();
          const item = {
            id: 'ann_' + Date.now(),
            title: title || '',
            content: content || '',
            createdAt: new Date().toISOString(),
            author: 'Nguyễn Trọng Tài (Admin)',
            type: type || 'admin'
          };
          list.unshift(item);
          localStorage.setItem(STORAGE_KEY_ANNOUNCEMENTS, JSON.stringify(list));
          setTimeout(() => {
            if (success) success({ success: true, id: item.id });
          }, 80);
        },
        getTasks: function(clientEmail) {
          const success = this._successHandler;
          setTimeout(() => {
            if (success) success(getStoredTasks());
          }, 150);
        },
        addTask: function(taskName, optQuadrant, optDay, optDeadline, optPriority, clientEmail) {
          const success = this._successHandler;
          const tasks = getStoredTasks();
          let quad = 'inbox';
          let day = '';
          let deadline = '';
          let priority = 'medium';
          let time = '';
          let duration = 0;
          let category = '';
          let subtasks = [];
          if (typeof optQuadrant === 'object' && optQuadrant !== null) {
            quad = optQuadrant.quadrant || 'inbox';
            day = optQuadrant.day !== undefined ? optQuadrant.day : '';
            deadline = optQuadrant.deadline || '';
            priority = optQuadrant.priority || 'medium';
            time = optQuadrant.time || '';
            duration = optQuadrant.duration ? parseInt(optQuadrant.duration, 10) : 0;
            category = optQuadrant.category || '';
            if (optQuadrant.subtasks) {
              try {
                subtasks = typeof optQuadrant.subtasks === 'string' ? JSON.parse(optQuadrant.subtasks) : optQuadrant.subtasks;
              } catch(e) { subtasks = []; }
            }
          } else {
            quad = optQuadrant || 'inbox';
            day = optDay !== undefined ? optDay : '';
            deadline = optDeadline || '';
            priority = optPriority || 'medium';
          }
          const email = (clientEmail || ADMIN_EMAIL).toLowerCase();
          const newTask = {
            id: 'task-' + Date.now(),
            task: taskName,
            category: category,
            subtasks: Array.isArray(subtasks) ? subtasks : [],
            quadrant: quad,
            done: false,
            day: day,
            deadline: deadline,
            priority: priority,
            time: time,
            duration: duration,
            ownerEmail: email,
            createdAt: new Date().toISOString()
          };
          tasks.unshift(newTask);
          saveStoredTasks(tasks);
          setTimeout(() => {
            if (success) success(newTask);
          }, 100);
        },
        updateTask: function(id, fields) {
          const success = this._successHandler;
          const tasks = getStoredTasks();
          const index = tasks.findIndex(t => String(t.id) === String(id));
          if (index !== -1) {
            let updatedFields = { ...fields };
            if (typeof updatedFields.subtasks === 'string') {
              try { updatedFields.subtasks = JSON.parse(updatedFields.subtasks); } catch(e) {}
            }
            tasks[index] = { ...tasks[index], ...updatedFields, updatedAt: new Date().toISOString() };
            saveStoredTasks(tasks);
          }
          setTimeout(() => {
            if (success) success(true);
          }, 80);
        },
        toggleSubTask: function(taskId, subTaskId, clientEmail) {
          const success = this._successHandler;
          const tasks = getStoredTasks();
          const task = tasks.find(t => String(t.id) === String(taskId));
          if (task && Array.isArray(task.subtasks)) {
            const sub = task.subtasks.find(s => String(s.id) === String(subTaskId));
            if (sub) {
              sub.done = !sub.done;
              saveStoredTasks(tasks);
            }
          }
          setTimeout(() => {
            if (success) success({ success: true, message: 'Toggled subtask' });
          }, 60);
        },
        getCalendarEvents: function(startIso, endIso) {
          const success = this._successHandler;
          const now = new Date();
          const monday = new Date(now);
          const day = monday.getDay();
          const diff = monday.getDate() - day + (day === 0 ? -6 : 1);
          monday.setDate(diff);
          
          function makeDate(dOffset, hour, minute) {
            const d = new Date(monday);
            d.setDate(d.getDate() + dOffset);
            d.setHours(hour, minute, 0, 0);
            return d.toISOString();
          }

          const mockEvents = [
            { id: 'cal-1', title: 'SWT301 - Software Testing (Lý thuyết & Thực hành)', dayIndex: 0, dayName: 'Thứ 2', time: '07:30 - 09:50', startTime: makeDate(0, 7, 30), endTime: makeDate(0, 9, 50), location: 'P.205' },
            { id: 'cal-2', title: 'PRN211 - Basic Cross-Platform Application', dayIndex: 1, dayName: 'Thứ 3', time: '10:00 - 12:20', startTime: makeDate(1, 10, 0), endTime: makeDate(1, 12, 20), location: 'P.302' },
            { id: 'cal-3', title: 'SWP391 - Software Development Project Lab', dayIndex: 2, dayName: 'Thứ 4', time: '13:00 - 15:20', startTime: makeDate(2, 13, 0), endTime: makeDate(2, 15, 20), location: 'Lab 4 - Tòa Innovation' },
            { id: 'cal-4', title: 'MLN122 - Triết học Mác - Lênin', dayIndex: 3, dayName: 'Thứ 5', time: '07:30 - 09:50', startTime: makeDate(3, 7, 30), endTime: makeDate(3, 9, 50), location: 'P.108' },
            { id: 'cal-5', title: 'EXE101 - Khởi nghiệp (Workshop cố vấn đồ án)', dayIndex: 4, dayName: 'Thứ 6', time: '15:30 - 17:50', startTime: makeDate(4, 15, 30), endTime: makeDate(4, 17, 50), location: 'Hội trường A' }
          ];

          setTimeout(() => {
            if (success) success(mockEvents);
          }, 200);
        },
        deleteTask: function(id) {
          const success = this._successHandler;
          let tasks = getStoredTasks();
          tasks = tasks.filter(t => t.id !== id);
          saveStoredTasks(tasks);
          setTimeout(() => {
            if (success) success(true);
          }, 80);
        },
        syncFapEvents: function(events) {
          const success = this._successHandler;
          let tasks = getStoredTasks();
          let added = 0;
          events.forEach(item => {
            const subjectCode = item.summary || item.subjectCode || 'Học tập';
            const roomNo = item.location || item.roomNo || '';
            const lecturer = item.description || item.lecturer || '';
            let slotTime = item.slotTime ? item.slotTime.replace(/[()]/g, '') : '';
            let d = null;

            if (item.start && typeof item.start === 'string') {
              const sMatch = item.start.match(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})/);
              if (sMatch) {
                d = new Date(parseInt(sMatch[1]), parseInt(sMatch[2]) - 1, parseInt(sMatch[3]), parseInt(sMatch[4]), parseInt(sMatch[5]));
                let endHour = '09', endMin = '50';
                if (item.end && typeof item.end === 'string') {
                  const eMatch = item.end.match(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})/);
                  if (eMatch) { endHour = eMatch[4]; endMin = eMatch[5]; }
                }
                slotTime = sMatch[4] + ':' + sMatch[5] + ' - ' + endHour + ':' + endMin;
              }
            } else if (item.date) {
              d = new Date(item.date);
            }

            if (!d || isNaN(d.getTime())) d = new Date();
            let dayOfWeek = d.getDay();
            let dayIndex = (dayOfWeek === 0 ? 6 : dayOfWeek - 1);
            const title = '[' + subjectCode + '] ' + (roomNo ? 'P.' + roomNo : '') + (slotTime ? ' (' + slotTime + ')' : '') + (lecturer ? ' - ' + lecturer : '');

            tasks.push({
              id: 'fap_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
              task: title,
              quadrant: 'donow',
              day: dayIndex,
              time: slotTime,
              done: false,
              source: 'fap'
            });
            added++;
          });
          saveStoredTasks(tasks);
          setTimeout(() => {
            if (success) success({ success: true, count: added, message: 'Đã nạp ' + added + ' buổi học từ FAP thành công!' });
          }, 150);
        },
        getAppVersion: function() {
          const success = this._successHandler;
          setTimeout(() => {
            if (success) success('v1.6.0');
          }, 60);
        },
        suggest: function() {
          const success = this._successHandler;
          const tasks = getStoredTasks();
          setTimeout(() => {
            const aiMarkdown = '### 🤖 Phân tích Ma trận Eisenhower (Mô phỏng Gemini 2.5 Flash)\\n\\n' +
              'Dựa trên danh sách **' + tasks.length + ' nhiệm vụ** hiện có trong không gian làm việc CSG, hệ thống đề xuất:\\n\\n' +
              '1. **Khắc phục lỗi phân quyền truy cập form dữ liệu** &rarr; **[DO NOW]**: Ảnh hưởng nghiêm trọng đến vận hành, cần xử lý ngay lập tức.\\n' +
              '2. **Gửi hợp đồng dự án CSG Studio trước 17h** &rarr; **[DO NOW]**: Có hạn chót trong ngày hôm nay.\\n' +
              '3. **Lên kế hoạch phát triển tính năng Export Excel** &rarr; **[PLAN]**: Nhiệm vụ mang tính chất định hướng trung hạn.\\n' +
              '4. **Kiểm tra danh sách email thành viên mới** &rarr; **[DELEGATE]**: Công việc thủ tục, có thể ủy quyền cho trợ lý.\\n' +
              '5. **Nhiệm vụ trong Inbox** &rarr; Bạn còn ' + tasks.filter(t => t.quadrant === 'inbox').length + ' task chưa phân loại, hãy kéo thả vào các ô thích hợp!';
            if (success) success(aiMarkdown);
          }, 600);
        }
      };
    }

    window.google = window.google || {};
    window.google.script = {
      get run() {
        return createRunner();
      }
    };

    console.info('🚀 [Preview Mock] Google Apps Script environment mock initialized successfully.');
  })();
</script>
`;

const server = http.createServer((req, res) => {
  if (req.url === '/' || req.url === '/index.html') {
    fs.readFile(INDEX_PATH, 'utf8', (err, html) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Lỗi nạp file Index.html: ' + err.message);
        return;
      }

      // Clean GAS template tags for local browser environment and inject mock script
      const processedHtml = html.replace(/<\?!=?[\s\S]*?\?>/g, '[]');
      const injectedHtml = processedHtml.replace('<script>', MOCK_SCRIPT + '\n    <script>');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(injectedHtml);
    });
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log('CSG Eisenhower Preview Server running at http://localhost:' + PORT);
});
