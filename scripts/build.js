const fs = require('fs');
const path = require('path');
const { loadAll } = require('./content');
const { thumbRelPath } = require('./lib');
const { fullImage, thumbImage } = require('./images');
const T = require('./templates');

const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const STATIC = path.join(__dirname, 'static');

function rmrf(p) {
  if (fs.existsSync(p)) fs.rmSync(p, { recursive: true, force: true });
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function writePage(routePath, html) {
  const outDir = routePath === '/' ? DIST : path.join(DIST, routePath);
  ensureDir(outDir);
  fs.writeFileSync(path.join(outDir, 'index.html'), html, 'utf8');
}

function copyStatic() {
  for (const name of fs.readdirSync(STATIC)) {
    fs.copyFileSync(path.join(STATIC, name), path.join(DIST, name));
  }
}

// 원본을 그대로 복사하는 대신, 웹에 맞게 줄이고 압축한 버전을 내보냄.
function queueFull(rel, tasks) {
  const src = path.join(ROOT, 'content', rel);
  const dest = path.join(DIST, rel);
  tasks.push(fullImage(src, dest));
}

function queueThumb(rel, tasks) {
  const src = path.join(ROOT, 'content', rel);
  const dest = path.join(DIST, thumbRelPath(rel));
  tasks.push(thumbImage(src, dest));
}

async function build() {
  console.log('빌드 시작…');
  rmrf(DIST);
  ensureDir(DIST);
  copyStatic();

  const { artworkByCode, exhibitions, texts, blogPosts, cv } = loadAll();
  T.setNavExhibitions(exhibitions);

  const imageTasks = [];

  // 홈에는 블로그 사진 중 아무거나 한 장 (어느 걸 띄울지는 새로고침할 때마다 브라우저가 고름).
  const blogImages = [...new Set(blogPosts.flatMap((p) => p.images.map((img) => img.rel)))];
  writePage('/', T.homePage({ photos: blogImages }));

  // 엑셀에서 가장 아래에 있는 행(= 최근에 추가한 작품)이 Works 페이지 맨 앞에 오도록.
  const artworks = [...artworkByCode.values()].sort((a, b) => b.rowIndex - a.rowIndex);
  writePage('/works/', T.worksPage(artworks));
  for (const art of artworks) {
    art.images.forEach((img, i) => {
      queueFull(img.rel, imageTasks);
      if (i === 0) queueThumb(img.rel, imageTasks); // 목록에서 보이는 대표 사진만 썸네일도 필요
    });
  }

  for (const ex of exhibitions) {
    writePage(`/전시/${ex.slug}/`, T.exhibitionDetailPage(ex));
    for (const img of ex.heroImages) queueFull(img.rel, imageTasks);
  }

  writePage('/텍스트/', T.textListPage(texts));
  for (const t of texts) writePage(`/텍스트/${t.slug}/`, T.textDetailPage(t));

  writePage('/블로그/', T.blogListPage(blogPosts));
  for (const p of blogPosts) writePage(`/블로그/${p.slug}/`, T.blogDetailPage(p));
  // 같은 사진을 두 번 처리하면 같은 파일에 동시에 쓰게 되니 중복은 걸러서 한 번만.
  for (const rel of blogImages) queueFull(rel, imageTasks);

  writePage('/cv/', T.cvPage(cv));

  console.log(`이미지 ${imageTasks.length}개 처리 중…`);
  await Promise.all(imageTasks);

  console.log(`빌드 완료 → ${path.relative(ROOT, DIST)}/`);
  console.log(`  전시 ${exhibitions.length} · 텍스트 ${texts.length} · 블로그 ${blogPosts.length}`);
}

build().catch((err) => {
  console.error('빌드 실패:', err);
  process.exit(1);
});
