// Con Cá và Chén Cơm - Landing Page Scripts
document.addEventListener('DOMContentLoaded', () => {
  // Mobile Nav Toggle
  const mobileToggle = document.getElementById('mobileToggle');
  const navMenu = document.getElementById('navMenu');

  if (mobileToggle && navMenu) {
    mobileToggle.addEventListener('click', () => {
      navMenu.classList.toggle('active');
      mobileToggle.classList.toggle('open');
    });

    // Close mobile menu when clicking any nav link hoặc CTA bên trong menu
    const navLinks = navMenu.querySelectorAll('.nav-link, .nav-menu-ctas a, .nav-menu-ctas button');
    navLinks.forEach(link => {
      link.addEventListener('click', () => {
        navMenu.classList.remove('active');
        mobileToggle.classList.remove('open');
      });
    });
  }

  // Active Nav Link on Scroll
  const sections = document.querySelectorAll('section[id]');
  window.addEventListener('scroll', () => {
    const scrollY = window.pageYOffset;

    sections.forEach(current => {
      const sectionHeight = current.offsetHeight;
      const sectionTop = current.offsetTop - 120;
      const sectionId = current.getAttribute('id');
      const targetNavLink = document.querySelector(`.nav-menu a[href*="${sectionId}"]`);

      if (targetNavLink) {
        if (scrollY > sectionTop && scrollY <= sectionTop + sectionHeight) {
          targetNavLink.classList.add('active');
        } else {
          targetNavLink.classList.remove('active');
        }
      }
    });
  });

  // Smooth appearance for cards
  const cards = document.querySelectorAll('.benefit-card, .real-benefit-card, .problem-card, .step-card, .feature-box, .testimonial-card');
  
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'translateY(0)';
          observer.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.1,
      rootMargin: '0px 0px -30px 0px'
    });

    cards.forEach(card => {
      card.style.opacity = '0';
      card.style.transform = 'translateY(16px)';
      card.style.transition = 'opacity 0.5s ease-out, transform 0.5s ease-out';
      observer.observe(card);
    });
  }

  // Keyboard shortcut: Escape to close modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeRegisterModal();
    }
  });
});

/**
 * Mở modal Đăng ký dùng thử sớm
 */
function openRegisterModal() {
  const modal = document.getElementById('registerModal');
  if (!modal) return;

  // Reset form & state view
  const formBox = document.getElementById('modalFormContent');
  const successBox = document.getElementById('modalSuccessContent');
  const form = document.getElementById('leadRegisterForm');

  if (formBox) formBox.style.display = 'block';
  if (successBox) successBox.style.display = 'none';
  if (form) form.reset();

  modal.classList.add('active');
  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';

  // Focus on first input
  setTimeout(() => {
    const firstInput = document.getElementById('leadFullName');
    if (firstInput) firstInput.focus();
  }, 100);
}

/**
 * Đóng modal Đăng ký dùng thử sớm
 */
function closeRegisterModal() {
  const modal = document.getElementById('registerModal');
  if (!modal) return;

  modal.classList.remove('active');
  modal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

// Endpoint Google Apps Script (Web App) nhận đăng ký dùng thử sớm từ Landing Page
// và lưu vào Google Sheet "Leads" + gửi email thông báo cho Admin
const LEAD_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbyS6HtN40EiOxfMGGHNsqN1ZeigSn3nkRJzbsIc1EJoAX3emgBxHXGxYiVGBAtD4sUEag/exec';

/**
 * Xử lý submit Form Đăng Ký
 * Gửi thông tin thật sang Google Apps Script (Sheet "Leads" + email báo cho Admin)
 * Đồng thời lưu thêm vào localStorage làm bản sao dự phòng phía máy khách
 */
function handleRegisterSubmit(event) {
  event.preventDefault();

  const fullnameInput = document.getElementById('leadFullName');
  const emailInput = document.getElementById('leadEmail');
  const studentIdInput = document.getElementById('leadStudentId');
  const submitBtn = document.getElementById('btnSubmitLead');

  const fullname = fullnameInput ? fullnameInput.value.trim() : '';
  const email = emailInput ? emailInput.value.trim() : '';
  const studentId = studentIdInput ? studentIdInput.value.trim() : '';

  if (!fullname || !email) {
    alert('Vui lòng nhập Họ tên và Email.');
    return;
  }

  // Disable button while processing
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span>Đang lưu thông tin...</span>';
  }

  // Payload lead
  const leadData = {
    fullname: fullname,
    email: email,
    studentId: studentId || 'Không cung cấp',
    createdAt: new Date().toISOString(),
    sourceUrl: window.location.href,
    userAgent: navigator.userAgent
  };

  // Lưu bản sao dự phòng phía máy khách (không phải nguồn dữ liệu chính)
  try {
    const STORAGE_KEY = 'concavachencom_leads';
    const rawExisting = localStorage.getItem(STORAGE_KEY);
    const leadsList = rawExisting ? JSON.parse(rawExisting) : [];
    leadsList.push(leadData);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(leadsList));
  } catch (err) {
    console.warn('Lỗi khi lưu bản sao dự phòng vào localStorage:', err);
  }

  // Gửi thật sang Google Apps Script -> Lưu Google Sheet "Leads" + Email báo Admin
  // Dùng mode:'no-cors' vì Apps Script Web App không trả CORS header cho domain khác;
  // request vẫn được Google xử lý và ghi dữ liệu dù trình duyệt không đọc được response.
  // Chạy kiểu "bắn rồi quên" (fire-and-forget): GAS có độ trễ redirect ẩn ~5-10s,
  // không chờ promise này mới cho khách thấy màn hình thành công, tránh cảm giác bị treo.
  fetch(LEAD_WEB_APP_URL, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action: 'registerLead', ...leadData })
  }).catch(err => {
    console.warn('Gửi lead tới Google Apps Script thất bại (có thể do mất mạng):', err);
  });

  setTimeout(() => {
    // Reset button
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = `<span>Gửi đăng ký ngay</span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>`;
    }

    // Hiển thị màn hình thành công
    const formBox = document.getElementById('modalFormContent');
    const successBox = document.getElementById('modalSuccessContent');
    const nameHolder = document.getElementById('successUserName');

    if (nameHolder) nameHolder.textContent = fullname;
    if (formBox) formBox.style.display = 'none';
    if (successBox) successBox.style.display = 'block';
  }, 500);
}
