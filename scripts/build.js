// ============================================================================
// BUILD.JS - TẠO BẢN STANDALONE PRODUCTION CHO VERCEL & TÊN MIỀN CONCAVACHENCOM.SITE
// ============================================================================

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');
const FRONTEND_DIR = path.join(ROOT_DIR, 'src', 'frontend');
const INDEX_PATH = path.join(FRONTEND_DIR, 'entry', 'Index.html');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');

const SUPABASE_CONFIG = {
  URL: 'https://kqkvsucqkhqsuxrimhez.supabase.co',
  KEY: 'sb_publishable_UxRex145DBNTSgTOyjjObA_6-ioFEz2'
};

/**
 * Tìm kiếm đệ quy file template component trong thư mục frontend
 * @param {string} dir Thư mục tìm kiếm
 * @param {string} filename Tên file cần tìm (không có đuôi .html)
 * @returns {string|null} Đường dẫn tuyệt đối đến file nếu tìm thấy
 */
function findComponentPath(dir, filename) {
  const target = `${filename}.html`;
  if (!fs.existsSync(dir)) return null;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const found = findComponentPath(fullPath, filename);
      if (found) return found;
    } else if (entry.isFile() && entry.name.toLowerCase() === target.toLowerCase()) {
      return fullPath;
    }
  }
  return null;
}

function build() {
  console.log('🚀 Bắt đầu build phiên bản Web Production từ kiến trúc src/...');

  if (!fs.existsSync(INDEX_PATH)) {
    console.error(`❌ Không tìm thấy file Index.html tại: ${INDEX_PATH}`);
    process.exit(1);
  }

  let indexHtml = fs.readFileSync(INDEX_PATH, 'utf8');

  // 1. Nhúng các file con HTML/CSS/JS (Styles, Modals, MobileNav, Scripts_*)
  indexHtml = indexHtml.replace(/<\?!=\s*include\('([^']+)'\);\s*\?>/g, (match, filename) => {
    // Trích xuất tên file nếu người dùng gọi dạng 'frontend/styles/Styles' hoặc 'Styles'
    const baseName = path.basename(filename);
    const componentPath = findComponentPath(FRONTEND_DIR, baseName);
    
    if (componentPath && fs.existsSync(componentPath)) {
      return fs.readFileSync(componentPath, 'utf8');
    }
    console.warn(`⚠️ Không tìm thấy component: ${filename} (đã tìm kiếm trong ${FRONTEND_DIR})`);
    return match;
  });

  // 2. Chuyển đổi khối Server Preload của GAS sang Client Supabase
  const gasPreloadPattern = /<!-- SERVER PRELOAD DATA \(Gas Template Evaluation\) -->[\s\S]*?<\/script>/;
  const standalonePreloadBlock = `<!-- SUPABASE SDK & CLIENT CONFIGURATION -->
    <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
    <script>
        window.SUPABASE_URL = '${SUPABASE_CONFIG.URL}';
        window.SUPABASE_ANON_KEY = '${SUPABASE_CONFIG.KEY}';
        window.GOOGLE_CLIENT_ID = '868007254558-mg1mav2ucm3e911eoi951gc3al9v1vb6.apps.googleusercontent.com';
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

  // 3. Đảm bảo thư mục public và public/app tồn tại
  if (!fs.existsSync(PUBLIC_DIR)) {
    fs.mkdirSync(PUBLIC_DIR, { recursive: true });
  }
  const APP_DIR = path.join(PUBLIC_DIR, 'app');
  if (!fs.existsSync(APP_DIR)) {
    fs.mkdirSync(APP_DIR, { recursive: true });
  }

  // 4. Ghi file public/app/index.html & public/app.html (Ứng dụng Con Cá và Chén Cơm)
  const appDistPath = path.join(APP_DIR, 'index.html');
  fs.writeFileSync(appDistPath, indexHtml, 'utf8');
  fs.writeFileSync(path.join(PUBLIC_DIR, 'app.html'), indexHtml, 'utf8');
  console.log(`✅ Build App thành công: ${appDistPath} (${(indexHtml.length / 1024).toFixed(1)} KB)`);

  // 5. Build Landing Page từ src/landing/ vào public/
  const LANDING_DIR = path.join(ROOT_DIR, 'src', 'landing');
  if (fs.existsSync(LANDING_DIR)) {
    const landingHtmlPath = path.join(LANDING_DIR, 'index.html');
    const landingCssPath = path.join(LANDING_DIR, 'styles.css');
    const landingJsPath = path.join(LANDING_DIR, 'script.js');

    if (fs.existsSync(landingHtmlPath)) {
      fs.copyFileSync(landingHtmlPath, path.join(PUBLIC_DIR, 'index.html'));
      console.log('✅ Đã xuất Landing Page: public/index.html (Đường dẫn /)');
    }
    if (fs.existsSync(landingCssPath)) {
      fs.copyFileSync(landingCssPath, path.join(PUBLIC_DIR, 'styles.css'));
      console.log('✅ Đã xuất Landing CSS: public/styles.css');
    }
    if (fs.existsSync(landingJsPath)) {
      fs.copyFileSync(landingJsPath, path.join(PUBLIC_DIR, 'script.js'));
      console.log('✅ Đã xuất Landing JS: public/script.js');
    }

    const landingAssets = path.join(LANDING_DIR, 'assets');
    if (fs.existsSync(landingAssets)) {
      const publicAssets = path.join(PUBLIC_DIR, 'assets');
      if (!fs.existsSync(publicAssets)) fs.mkdirSync(publicAssets, { recursive: true });
      fs.cpSync(landingAssets, publicAssets, { recursive: true });
      console.log('✅ Đã đồng bộ Landing assets: public/assets');
    }
  }

  // 6. Tự động sinh public/robots.txt cho Googlebot & Search Engines
  const robotsContent = `User-agent: *
Allow: /
Allow: /app

Sitemap: https://concavachencom.site/sitemap.xml
`;
  fs.writeFileSync(path.join(PUBLIC_DIR, 'robots.txt'), robotsContent, 'utf8');
  console.log('✅ Đã tạo: public/robots.txt');

  // 7. Tự động sinh public/sitemap.xml cho Google Search Console
  const sitemapContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://concavachencom.site/</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://concavachencom.site/app</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
</urlset>
`;
  fs.writeFileSync(path.join(PUBLIC_DIR, 'sitemap.xml'), sitemapContent, 'utf8');
  console.log('✅ Đã tạo: public/sitemap.xml');
}

build();
