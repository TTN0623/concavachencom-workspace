// ============================================================================
// BUILD.JS - TẠO BẢN STANDALONE PRODUCTION CHO VERCEL & TÊN MIỀN CONCAVACHENCOM.SITE
// ============================================================================

const fs = require('fs');
const path = require('path');

const SUPABASE_CONFIG = {
  URL: 'https://kqkvsucqkhqsuxrimhez.supabase.co',
  KEY: 'sb_publishable_UxRex145DBNTSgTOyjjObA_6-ioFEz2'
};

function build() {
  console.log('🚀 Bắt đầu build phiên bản Web Production...');

  const indexPath = path.join(__dirname, 'Index.html');
  let indexHtml = fs.readFileSync(indexPath, 'utf8');

  // 1. Nhúng các file con HTML/CSS/JS (Styles, Modals, MobileNav, Scripts_*)
  indexHtml = indexHtml.replace(/<\?!=\s*include\('([^']+)'\);\s*\?>/g, (match, filename) => {
    const componentPath = path.join(__dirname, `${filename}.html`);
    if (fs.existsSync(componentPath)) {
      return fs.readFileSync(componentPath, 'utf8');
    }
    console.warn(`⚠️ Không tìm thấy component: ${componentPath}`);
    return match;
  });

  // 2. Chuyển đổi khối Server Preload của GAS sang Client Supabase
  const gasPreloadPattern = /<!-- SERVER PRELOAD DATA \(Gas Template Evaluation\) -->[\s\S]*?<\/script>/;
  const standalonePreloadBlock = `<!-- SUPABASE SDK & CLIENT CONFIGURATION -->
    <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
    <script>
        window.SUPABASE_URL = '${SUPABASE_CONFIG.URL}';
        window.SUPABASE_ANON_KEY = '${SUPABASE_CONFIG.KEY}';
        window.supabaseClient = (window.supabase && typeof window.supabase.createClient === 'function')
            ? window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY)
            : null;

        var PRELOADED_SERVER_TASKS = [];
        var SERVER_USER_EMAIL = '';
        var SERVER_IS_ADMIN = false;
        var SERVER_NEW_FEEDBACK_COUNT = 0;
        var SERVER_VERSION = 'v1.7.0';
    </script>`;

  indexHtml = indexHtml.replace(gasPreloadPattern, standalonePreloadBlock);

  // 3. Đảm bảo thư mục public tồn tại
  const publicDir = path.join(__dirname, 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  // 4. Ghi file public/index.html
  const distPath = path.join(publicDir, 'index.html');
  fs.writeFileSync(distPath, indexHtml, 'utf8');

  console.log(`✅ Build thành công: ${distPath} (${(indexHtml.length / 1024).toFixed(1)} KB)`);
}

build();
