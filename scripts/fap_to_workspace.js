// ============================================================================
// FAP MỚI (Weekly Timetable) to Cá Cơm Workspace & Google Calendar
// Dán toàn bộ mã này vào Console (F12) trên trang Thời khóa biểu FAP:
// Link FAP: https://fap.fpt.edu.vn (Vào mục Thời khóa biểu tuần / Weekly Timetable)
// ============================================================================

(async function () {
    const TOTAL_WEEKS = 6; // Số tuần cào liên tiếp (mặc định: 6 tuần)

    console.log('%c🚀 BẮT ĐẦU CÀO LỊCH FAP MỚI -> CÁ CƠM WORKSPACE', 'background:#0054a6;color:white;font-weight:bold;font-size:14px;padding:5px 10px;border-radius:6px;');

    // Hiển thị thông báo nổi trực quan ngay trên giao diện FAP
    function showFapBanner(msg, isSuccess = true, isProgress = false) {
        let banner = document.getElementById('fapSyncToast');
        if (!banner) {
            banner = document.createElement('div');
            banner.id = 'fapSyncToast';
            banner.style.cssText = 'position:fixed;top:20px;right:20px;z-index:999999;padding:14px 20px;border-radius:12px;font-size:13px;font-family:system-ui,-apple-system,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,0.35);display:flex;align-items:center;gap:12px;transition:all 0.3s ease;max-width:460px;line-height:1.5;';
            document.body.appendChild(banner);
        }
        banner.style.background = isProgress ? '#0054a6' : (isSuccess ? '#059669' : '#dc2626');
        banner.style.color = '#ffffff';
        banner.innerHTML = `<span style="font-size:20px;">${isProgress ? '⏳' : (isSuccess ? '✅' : '⚠️')}</span> <span style="font-weight:500;">${msg}</span>`;
        if (!isProgress) {
            setTimeout(() => {
                banner.style.opacity = '0';
                banner.style.transform = 'translateY(-10px)';
                setTimeout(() => banner.remove(), 400);
            }, 8000);
        }
    }

    const currentYear = new Date().getFullYear();
    let allEvents = [];

    function extractCurrentWeek() {
        let events = [];
        const allElements = Array.from(document.querySelectorAll("div, h5, p, span"));
        const dayHeaders = allElements.filter(el => {
            const txt = (el.innerText || "").trim();
            return /^(Thứ\s+[2-7]|Chủ\s+nhật)\s*\(\d{1,2}\/\d{1,2}\)$/i.test(txt) && el.children.length === 0;
        });

        if (dayHeaders.length === 0) return [];

        dayHeaders.forEach((header, index) => {
            const dateMatch = header.innerText.trim().match(/(\d{1,2})\/(\d{1,2})/);
            if (!dateMatch) return;

            const day = dateMatch[1].padStart(2, '0');
            const month = dateMatch[2].padStart(2, '0');
            
            let eventYear = currentYear;
            const currentMonth = new Date().getMonth() + 1;
            if (currentMonth >= 10 && parseInt(month, 10) <= 3) {
                eventYear = currentYear + 1;
            } else if (currentMonth <= 3 && parseInt(month, 10) >= 10) {
                eventYear = currentYear - 1;
            }

            const nextHeader = dayHeaders[index + 1];
            let walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
            let start = false;
            let candidateNodes = [];

            while (walker.nextNode()) {
                const node = walker.currentNode;
                if (node === header) { start = true; continue; }
                if (nextHeader && node === nextHeader) break;
                if (start) {
                    const text = (node.innerText || "").trim();
                    if (/\d{1,2}h\d{2}\s*-\s*\d{1,2}h\d{2}/.test(text) && node.children.length <= 1) {
                        let card = node.closest("li, div[class*='item'], div[class*='slot'], div[class*='card-body'], .border, div") || node.parentElement;
                        if (card && !candidateNodes.includes(card) && card.querySelectorAll("*").length < 20) {
                            candidateNodes.push(card);
                        }
                    }
                }
            }

            candidateNodes.forEach(card => {
                const lines = (card.innerText || "").split('\n').map(s => s.trim()).filter(Boolean);
                const timeLine = lines.find(l => /\d{1,2}h\d{2}\s*-\s*\d{1,2}h\d{2}/.test(l));
                if (!timeLine) return;
                const timeMatch = timeLine.match(/(\d{1,2})h(\d{2})\s*-\s*(\d{1,2})h(\d{2})/);
                if (!timeMatch) return;

                let subject = lines.find(l => /[A-Z]{3}\d{3}/i.test(l) && !l.includes('h'));
                if (!subject) return;

                const room = lines.find(l => /^(DE|AL|BE|NV|B\d|A\d)-/i.test(l) || /(Phòng|Room|Meet)/i.test(l)) || "";
                const lecturer = lines.find(l => /^[A-Za-z0-9_]{3,15}$/.test(l) && l !== subject && !l.includes('-') && !/Offline|Online/i.test(l)) || "";

                const startFormatted = `${eventYear}${month}${day}T${timeMatch[1].padStart(2, '0')}${timeMatch[2]}00`;
                const endFormatted = `${eventYear}${month}${day}T${timeMatch[3].padStart(2, '0')}${timeMatch[4]}00`;

                events.push({
                    start: startFormatted,
                    end: endFormatted,
                    summary: subject,
                    location: room,
                    description: lecturer ? `Giảng viên: ${lecturer}` : "",
                    subjectCode: subject,
                    roomNo: room,
                    lecturer: lecturer,
                    date: `${month}/${day}/${eventYear}`,
                    slotTime: `(${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}-${timeMatch[3].padStart(2, '0')}:${timeMatch[4]})`
                });
            });
        });
        return events;
    }

    showFapBanner(`Đang quét lịch học ${TOTAL_WEEKS} tuần trên FAP mới...`, true, true);

    for (let w = 0; w < TOTAL_WEEKS; w++) {
        window.scrollTo(0, document.body.scrollHeight);
        await new Promise(r => setTimeout(r, 600));

        const weekData = extractCurrentWeek();
        allEvents.push(...weekData);
        console.log(`Đã lấy xong tuần ${w + 1}/${TOTAL_WEEKS} (${weekData.length} buổi học)`);
        showFapBanner(`Đang quét tuần ${w + 1}/${TOTAL_WEEKS} (Tìm thấy ${allEvents.length} buổi học)...`, true, true);

        if (w < TOTAL_WEEKS - 1) {
            const nextArrow = Array.from(document.querySelectorAll("button, a, i, span, svg"))
                .find(el => el.classList.value.includes("right") || el.getAttribute("aria-label")?.includes("next") || el.innerText === ">");

            if (nextArrow) {
                (nextArrow.closest("button, a") || nextArrow).click();
                await new Promise(r => setTimeout(r, 1800));
            } else {
                break;
            }
        }
    }

    allEvents = allEvents.filter((v, i, a) => a.findIndex(t => t.start === v.start && t.summary === v.summary) === i);

    if (allEvents.length === 0) {
        showFapBanner('Không tìm thấy buổi học nào! Hãy đảm bảo bạn đang ở trang Thời khóa biểu.', false);
        return;
    }

    // =========================================================================
    // 1. TỰ ĐỘNG SAO CHÉP DỮ LIỆU VÀO CLIPBOARD (TRÁNH HOÀN TOÀN LỖI CSP CỦA FAP)
    // =========================================================================
    try {
        if (typeof copy === 'function') {
            copy(JSON.stringify(allEvents));
        } else if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(JSON.stringify(allEvents));
        }
    } catch (e) {
        console.warn('Clipboard write fallback:', e);
    }

    // =========================================================================
    // 2. TỰ ĐỘNG TẢI TỆP .ICS VỀ MÁY LÀM BẢN DỰ PHÒNG HOẶC KÉO THẢ
    // =========================================================================
    try {
        const header = [
            "BEGIN:VCALENDAR",
            "VERSION:2.0",
            "PRODID:-//FPT University//Multi-Week Schedule//VN",
            "CALSCALE:GREGORIAN",
            "METHOD:PUBLISH",
            "X-WR-TIMEZONE:Asia/Ho_Chi_Minh"
        ].join("\r\n");

        const body = allEvents.map(e => [
            "BEGIN:VEVENT",
            `UID:${Math.random().toString(36).substring(2)}_${e.start}@fpt.edu.vn`,
            `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").split(".")[0]}Z`,
            `DTSTART;TZID=Asia/Ho_Chi_Minh:${e.start}`,
            `DTEND;TZID=Asia/Ho_Chi_Minh:${e.end}`,
            `SUMMARY:${e.summary}`,
            `LOCATION:${e.location}`,
            `DESCRIPTION:${e.description}`,
            "STATUS:CONFIRMED",
            "END:VEVENT"
        ].join("\r\n")).join("\r\n");

        const blob = new Blob([`${header}\r\n${body}\r\nEND:VCALENDAR`], { type: "text/calendar;charset=utf-8" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `LichHoc_FAP_Moi.ics`;
        link.click();
    } catch(e) {}

    console.log(`%c🎉 ĐÃ CÀO XONG ${allEvents.length} BUỔI HỌC!`, 'color:#059669;font-weight:bold;font-size:15px;');
    console.log('%c👉 Dữ liệu đã được copy vào Clipboard và lưu vào file LichHoc_FAP_Moi.ics!', 'color:#0054a6;font-weight:bold;');
    showFapBanner(`🎉 Đã cào xong ${allEvents.length} buổi học! Dữ liệu đã được copy vào Clipboard và tải về file LichHoc_FAP_Moi.ics. Hãy quay lại Cá Cơm Workspace bấm "Dán & Đồng bộ"!`, true, false);
})();
