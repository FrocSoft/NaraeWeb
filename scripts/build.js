const fs = require('fs');
const path = require('path');
const { loadAll } = require('./content');
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

function copyImage(rel) {
  const src = path.join(ROOT, 'content', rel);
  const dest = path.join(DIST, rel);
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
}

function build() {
  console.log('빌드 시작…');
  rmrf(DIST);
  ensureDir(DIST);
  copyStatic();

  const { artworkByCode, exhibitions, texts, blogPosts, cv } = loadAll();
  T.setNavExhibitions(exhibitions);

  writePage('/', T.homePage({ texts, blogPosts }));

  const artworks = [...artworkByCode.values()].sort((a, b) => (parseInt(b.year, 10) || 0) - (parseInt(a.year, 10) || 0));
  writePage('/works/', T.worksPage(artworks));
  for (const art of artworks) for (const img of art.images) copyImage(img.rel);

  for (const ex of exhibitions) {
    writePage(`/전시/${ex.slug}/`, T.exhibitionDetailPage(ex));
    for (const img of ex.heroImages) copyImage(img.rel);
  }

  writePage('/텍스트/', T.textListPage(texts));
  for (const t of texts) writePage(`/텍스트/${t.slug}/`, T.textDetailPage(t));

  writePage('/블로그/', T.blogListPage(blogPosts));
  for (const p of blogPosts) writePage(`/블로그/${p.slug}/`, T.blogDetailPage(p));

  writePage('/cv/', T.cvPage(cv));

  console.log(`빌드 완료 → ${path.relative(ROOT, DIST)}/`);
  console.log(`  전시 ${exhibitions.length} · 텍스트 ${texts.length} · 블로그 ${blogPosts.length}`);
}

build();
