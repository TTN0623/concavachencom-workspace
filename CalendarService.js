// ============================================================================
// CALENDARSERVICE.JS - TÍCH HỢP VÀ ĐỒNG BỘ GOOGLE CALENDAR
// ============================================================================

/**
 * HÀM CẤP QUYỀN TRUY CẬP GOOGLE CALENDAR (Xếp đầu danh sách hàm để dễ bấm)
 */
function aaa_CapQuyen_Calendar() {
  return grantCalendarPermissions();
}

/**
 * Xin quyền và kiểm tra danh sách bộ lịch của tài khoản
 * @returns {string}
 */
function grantCalendarPermissions() {
  const email = Session.getEffectiveUser().getEmail() || Session.getActiveUser().getEmail();
  const cals = CalendarApp.getAllCalendars();
  const calNames = cals.map(c => c.getName()).join(', ');
  Logger.log("✅ ĐÃ CẤP QUYỀN THÀNH CÔNG cho tài khoản: " + email);
  Logger.log("Tìm thấy " + cals.length + " bộ lịch: " + calNames);
  return "OK: " + email + " (" + cals.length + " lịch)";
}

/**
 * Lấy danh sách sự kiện từ TẤT CẢ các bộ lịch Google Calendar của tài khoản trong tuần
 * @param {string} startIso
 * @returns {Object}
 */
function getCalendarEvents(startIso) {
  let userEmail = '';
  try {
    userEmail = Session.getEffectiveUser().getEmail() || Session.getActiveUser().getEmail() || 'Chưa định danh';
  } catch (e) {
    userEmail = 'Không thể lấy email: ' + e.message;
  }

  try {
    const start = startIso ? new Date(startIso) : new Date();
    const currentDay = start.getDay();
    const distanceToMonday = (currentDay === 0 ? -6 : 1) - currentDay;
    const monday = new Date(start);
    monday.setDate(start.getDate() + distanceToMonday);
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    const dateRangeStr = ('0' + monday.getDate()).slice(-2) + '/' + ('0' + (monday.getMonth() + 1)).slice(-2) + '/' + monday.getFullYear() +
      ' - ' + ('0' + sunday.getDate()).slice(-2) + '/' + ('0' + (sunday.getMonth() + 1)).slice(-2) + '/' + sunday.getFullYear();

    let calendars = [];
    try {
      calendars = CalendarApp.getAllCalendars();
    } catch(e) {
      Logger.log("getAllCalendars error: " + e.message);
    }
    if (!calendars || calendars.length === 0) {
      const defCal = CalendarApp.getDefaultCalendar();
      if (defCal) calendars = [defCal];
    }
    if (!calendars || calendars.length === 0) {
      return {
        success: false,
        email: userEmail,
        calendarCount: 0,
        calendars: [],
        dateRange: dateRangeStr,
        events: [],
        error: 'Không tìm thấy bộ lịch nào trong tài khoản hoặc chưa được cấp quyền truy cập CalendarApp.'
      };
    }

    const dayNames = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
    const allEvents = [];
    const seenEventKeys = new Set();
    const calendarNames = [];

    calendars.forEach(function(cal) {
      try {
        const calName = cal.getName();
        calendarNames.push(calName);
        const events = cal.getEvents(monday, sunday);

        events.forEach(function(e) {
          const isAllDay = e.isAllDayEvent();
          const s = e.getStartTime();
          const end = e.getEndTime();

          if (isAllDay) {
            // Xử lý sự kiện cả ngày (hỗ trợ cả sự kiện 1 ngày và sự kiện kéo dài nhiều ngày)
            const allDayStart = (typeof e.getAllDayStartDate === 'function') ? e.getAllDayStartDate() : s;
            const allDayEnd = (typeof e.getAllDayEndDate === 'function') ? e.getAllDayEndDate() : end;

            for (let cur = new Date(monday); cur <= sunday; cur.setDate(cur.getDate() + 1)) {
              const curDayTime = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate()).getTime();
              const startDayTime = new Date(allDayStart.getFullYear(), allDayStart.getMonth(), allDayStart.getDate()).getTime();
              const endDayTime = new Date(allDayEnd.getFullYear(), allDayEnd.getMonth(), allDayEnd.getDate()).getTime();

              if (curDayTime >= startDayTime && curDayTime < endDayTime) {
                const dayOfWeek = cur.getDay();
                const dayIndex = (dayOfWeek === 0 ? 6 : dayOfWeek - 1);
                const eventDateStr = ('0' + cur.getDate()).slice(-2) + '/' + ('0' + (cur.getMonth() + 1)).slice(-2);
                const uniqueKey = e.getId() + '_' + curDayTime;

                if (!seenEventKeys.has(uniqueKey)) {
                  seenEventKeys.add(uniqueKey);
                  allEvents.push({
                    id: 'cal_' + e.getId() + '_' + curDayTime,
                    title: e.getTitle() || '(Không có tiêu đề)',
                    calendarName: calName,
                    dayIndex: dayIndex,
                    dayName: dayNames[dayOfWeek],
                    dateStr: eventDateStr,
                    time: 'Cả ngày',
                    startTime: cur.toISOString(),
                    endTime: cur.toISOString(),
                    location: e.getLocation() || '',
                    isAllDay: true
                  });
                }
              }
            }
          } else {
            // Sự kiện có khung giờ cụ thể
            const dayOfWeek = s.getDay();
            const dayIndex = (dayOfWeek === 0 ? 6 : dayOfWeek - 1);
            const formatTime = function(d) {
              return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
            };
            const timeStr = formatTime(s) + ' - ' + formatTime(end);
            const eventDateStr = ('0' + s.getDate()).slice(-2) + '/' + ('0' + (s.getMonth() + 1)).slice(-2);
            const uniqueKey = e.getId() + '_' + s.getTime();

            if (!seenEventKeys.has(uniqueKey)) {
              seenEventKeys.add(uniqueKey);
              allEvents.push({
                id: 'cal_' + e.getId(),
                title: e.getTitle() || '(Không có tiêu đề)',
                calendarName: calName,
                dayIndex: dayIndex,
                dayName: dayNames[dayOfWeek],
                dateStr: eventDateStr,
                time: timeStr,
                startTime: s.toISOString(),
                endTime: end.toISOString(),
                location: e.getLocation() || '',
                isAllDay: false
              });
            }
          }
        });
      } catch (calErr) {
        Logger.log("Error querying calendar " + cal.getName() + ": " + calErr.message);
      }
    });

    // Sắp xếp sự kiện theo ngày và giờ
    allEvents.sort(function(a, b) {
      if (a.dayIndex !== b.dayIndex) return a.dayIndex - b.dayIndex;
      return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
    });

    return {
      success: true,
      email: userEmail,
      calendarCount: calendars.length,
      calendars: calendarNames,
      dateRange: dateRangeStr,
      events: allEvents,
      error: null
    };
  } catch (err) {
    Logger.log("getCalendarEvents error: " + err.message);
    return {
      success: false,
      email: userEmail,
      calendarCount: 0,
      calendars: [],
      dateRange: '',
      events: [],
      error: err.message
    };
  }
}
