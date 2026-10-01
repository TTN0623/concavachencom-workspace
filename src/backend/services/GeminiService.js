// ============================================================================
// GEMINISERVICE.JS - TÍCH HỢP TRÍ TUỆ NHÂN TẠO GEMINI AI
// ============================================================================

/**
 * Lấy Gemini API Key hoàn toàn từ Script Properties (Bảo mật 100%, không lưu trong code):
 * - Quản lý tại: Cài đặt dự án (Project Settings) > Thuộc tính tập lệnh (Script Properties)
 * @returns {string|null}
 */
function getGeminiApiKey() {
  try {
    const scriptProp = PropertiesService.getScriptProperties().getProperty("GEMINI_API_KEY");
    if (scriptProp && scriptProp.trim() !== "") return scriptProp.trim();
  } catch (e) {
    Logger.log("Không thể đọc Script Properties: " + e.message);
  }

  try {
    const userProp = PropertiesService.getUserProperties().getProperty("GEMINI_API_KEY");
    if (userProp && userProp.trim() !== "") return userProp.trim();
  } catch (e) {}

  return null;
}

/**
 * Hàm phân tích và gợi ý sắp xếp công việc bằng Gemini AI
 * @param {string} clientEmail
 * @returns {string} Nội dung phản hồi dạng Markdown
 */
function suggest(clientEmail) {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    return "### ⚠️ Chưa cấu hình GEMINI_API_KEY\n\n" +
      "Hệ thống chưa tìm thấy khóa API Gemini để phân tích nhiệm vụ.\n\n" +
      "**👉 Hướng dẫn cấu hình an toàn (Bảo mật 100%):**\n" +
      "1. Truy cập trang chỉnh sửa Google Apps Script của dự án.\n" +
      "2. Nhấn vào biểu tượng bánh răng **⚙️ Cài đặt dự án (Project Settings)** ở menu bên trái.\n" +
      "3. Cuộn xuống mục **Thuộc tính tập lệnh (Script Properties)** &rarr; Nhấn **Thêm thuộc tính tập lệnh**.\n" +
      "4. Nhập thông tin:\n" +
      "   - **Thuộc tính (Property)**: `GEMINI_API_KEY`\n" +
      "   - **Giá trị (Value)**: *(Dán API Key Google AI Studio của bạn vào đây)*\n" +
      "5. Nhấn **Lưu thuộc tính tập lệnh**, sau đó quay lại trang này và nhấn lại nút **'✨ Gợi ý thông minh (AI)'**.";
  }

  const tasks = getTasks(clientEmail);
  if (tasks.length === 0) {
    return "### ℹ️ Thông báo\n\nHiện không có công việc nào trong danh sách để phân tích. Hãy thêm một vài công việc vào ô **Inbox** trước nhé!";
  }

  const inboxTasks = tasks.filter(t => t.quadrant === 'inbox').map(t => t.task);
  const sortedTasks = tasks.filter(t => t.quadrant !== 'inbox').map(t => `[${t.quadrant.toUpperCase()}] ${t.task}`);
  
  let prompt = "";
  if (inboxTasks.length > 0) {
    prompt = `Bạn là chuyên gia tư vấn quản lý thời gian và năng suất làm việc theo phương pháp Ma trận Eisenhower.\n` +
      `Hãy phân tích các công việc đang chờ xử lý trong ô Inbox dưới đây và đưa ra gợi ý phân loại cụ thể vào 4 ô:\n` +
      `1. DO NOW (Khẩn cấp & Quan trọng - Cần làm ngay lập tức)\n` +
      `2. PLAN (Quan trọng nhưng Không khẩn cấp - Cần lên lịch chủ động)\n` +
      `3. DELEGATE (Khẩn cấp nhưng Không quan trọng - Giao việc/Ủy quyền)\n` +
      `4. DROP (Không khẩn cấp & Không quan trọng - Cân nhắc loại bỏ hoặc hoãn lại)\n\n` +
      `Danh sách việc trong Inbox:\n- ${inboxTasks.join('\n- ')}\n\n` +
      (sortedTasks.length > 0 ? `Các việc đã được phân loại trước đó (tham khảo bối cảnh):\n- ${sortedTasks.join('\n- ')}\n\n` : '') +
      `Yêu cầu định dạng:\n` +
      `- Trình bày bằng Markdown đẹp mắt, có tiêu đề và biểu tượng icon rõ ràng.\n` +
      `- Mỗi công việc hãy nêu lý do gợi ý ngắn gọn (1-2 câu).`;
  } else {
    prompt = `Bạn là chuyên gia tư vấn quản lý thời gian theo Ma trận Eisenhower.\n` +
      `Dưới đây là các công việc hiện đã được phân loại trong bảng:\n\n` +
      `- ${sortedTasks.join('\n- ')}\n\n` +
      `Hãy nhận xét, đánh giá xem cách phân bổ công việc như trên đã tối ưu chưa. Nếu có việc nào nên chuyển ô, hãy chỉ rõ và giải thích ngắn gọn bằng Markdown.`;
  }

  const models = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
  let lastError = null;

  for (let i = 0; i < models.length; i++) {
    const model = models[i];
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const payload = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.4
      }
    };
    const options = {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    try {
      const response = UrlFetchApp.fetch(url, options);
      const statusCode = response.getResponseCode();
      const content = response.getContentText();
      const json = JSON.parse(content);

      if (statusCode === 200 && json.candidates && json.candidates.length > 0 && json.candidates[0].content?.parts?.[0]?.text) {
        return json.candidates[0].content.parts[0].text;
      }

      if (json.error) {
        lastError = json.error.message || `Mã HTTP ${statusCode}`;
        if (statusCode === 404) {
          continue;
        }
        return `### ❌ Lỗi gọi Gemini API (${model})\n\n` +
          `**Mã lỗi:** HTTP ${statusCode}\n\n` +
          `**Thông điệp từ Google:**\n> ${lastError}\n\n` +
          `*Gợi ý: Vui lòng kiểm tra lại API Key trên Google AI Studio xem key còn hiệu lực hoặc đã cấp đúng quyền chưa.*`;
      }
    } catch (e) {
      lastError = e.toString();
    }
  }

  return `### ❌ Lỗi kết nối AI\n\nKhông thể kết nối đến máy chủ Gemini: ${lastError || "Lỗi không xác định."}`;
}

/**
 * Hàm kiểm tra nhanh trạng thái hoạt động của Gemini API
 * @returns {Object} { success: boolean, message: string, model: string }
 */
function testGeminiConnection() {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    return {
      success: false,
      message: "Chưa cấu hình GEMINI_API_KEY trong Script Properties."
    };
  }

  const maskedKey = apiKey.length > 8 ? (apiKey.slice(0, 4) + '...' + apiKey.slice(-4)) : '***';
  const models = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];

  for (let i = 0; i < models.length; i++) {
    const model = models[i];
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const payload = {
      contents: [{ parts: [{ text: "Trả lời đúng 1 từ duy nhất: OK" }] }]
    };
    const options = {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    try {
      const response = UrlFetchApp.fetch(url, options);
      const code = response.getResponseCode();
      const json = JSON.parse(response.getContentText());

      if (code === 200 && json.candidates && json.candidates.length > 0) {
        return {
          success: true,
          model: model,
          apiKeyMasked: maskedKey,
          response: json.candidates[0].content.parts[0].text.trim()
        };
      }
      if (code !== 404) {
        return {
          success: false,
          model: model,
          apiKeyMasked: maskedKey,
          statusCode: code,
          message: json.error ? json.error.message : response.getContentText()
        };
      }
    } catch (e) {
      return {
        success: false,
        apiKeyMasked: maskedKey,
        message: e.toString()
      };
    }
  }

  return {
    success: false,
    apiKeyMasked: maskedKey,
    message: "Không thể kết nối đến bất kỳ model Gemini nào."
  };
}
