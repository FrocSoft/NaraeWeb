const { marked } = require('marked');
const { demoteHeadings, thumbRelPath } = require('./lib');

function md(source) {
  return source ? marked.parse(demoteHeadings(source)) : '';
}

// 파일명에 공백이 섞여 있어도 주소로 안전하게 (한글은 그대로 둬서 주소가 읽히게).
function urlPath(rel) {
  return rel.split('/').map((seg) => seg.replace(/ /g, '%20')).join('/');
}

function esc(s) {
  return String(s || '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

// 빌드가 시작할 때 전시 목록을 한 번 넣어두면, 모든 페이지의 사이드바가 그걸 그대로 씀.
let NAV_EXHIBITIONS = [];
function setNavExhibitions(exhibitions) {
  NAV_EXHIBITIONS = exhibitions;
}

function layout({ title, active, content }) {
  const isActive = (href) => (href === '/' ? active === '/' : active === href || active.startsWith(href));
  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} — 나래</title>
<link rel="stylesheet" href="/style.css">
</head>
<body>
<aside class="sidebar">
  <nav>
    <a href="/" class="nav-home" ${isActive('/') ? 'aria-current="page"' : ''}>Home</a>
    <hr>
    <div class="nav-exhibitions">
      ${NAV_EXHIBITIONS.map((ex) => `<a href="/전시/${ex.slug}/" ${isActive(`/전시/${ex.slug}/`) ? 'aria-current="page"' : ''}>${esc(ex.title)}</a>`).join('\n      ')}
    </div>
    <hr>
    <a href="/works/" ${isActive('/works/') ? 'aria-current="page"' : ''}>Works</a>
    <a href="/텍스트/" ${isActive('/텍스트/') ? 'aria-current="page"' : ''}>Text</a>
    <a href="/블로그/" ${isActive('/블로그/') ? 'aria-current="page"' : ''}>Blog</a>
    <a href="/cv/" ${isActive('/cv/') ? 'aria-current="page"' : ''}>CV</a>
  </nav>
</aside>
<main>
${content}
</main>
<div id="lightbox" class="lightbox" hidden>
  <button class="lb-close" aria-label="닫기">✕</button>
  <button class="lb-prev" aria-label="이전">‹</button>
  <img class="lb-img" src="" alt="">
  <div class="lb-caption"></div>
  <button class="lb-next" aria-label="다음">›</button>
</div>
<script src="/lightbox.js"></script>
</body>
</html>`;
}

// 썸네일(순서상 첫 번째 이미지) + 국문/영문 제목. 나머지 이미지는 라이트박스 넘기기용으로 숨겨서 같이 넣음.
// 표준 도판 캡션(제목 이텔릭, 연도·재료·크기를 쉼표로 연결)에 필요한 정보는
// data-* 속성에 실어 보내고, 실제 조합은 라이트박스에서(lightbox.js) 함.
function artworkFigure(art) {
  if (!art.images.length) return '';
  const data = `data-title="${esc(art.title)}" data-title-en="${esc(art.titleEn)}" data-year="${esc(art.year)}" data-material="${esc(art.material)}" data-material-en="${esc(art.materialEn)}" data-size="${esc(art.size)}"`;
  return `<figure class="artwork" data-artwork="${art.code}">
  ${art.images.map((img, i) => {
    // 그리드에 보이는 대표 사진(0번)만 작은 썸네일을 쓰고, 원본은 라이트박스용으로 data-full에 실어둠.
    const gridSrc = i === 0 ? urlPath(thumbRelPath(img.rel)) : urlPath(img.rel);
    const fullAttr = i === 0 ? ` data-full="/${urlPath(img.rel)}"` : '';
    return `<img src="/${gridSrc}" alt="${esc(art.title)}" loading="lazy" class="art-img" data-code="${art.code}" data-index="${i}" ${data}${fullAttr} ${i > 0 ? 'hidden' : ''}>`;
  }).join('\n  ')}
  <figcaption>
    <span class="cap-title">${esc(art.title)}</span>
    ${art.titleEn ? `<span class="cap-title-en">${esc(art.titleEn)}</span>` : ''}
  </figcaption>
</figure>`;
}

function homePage({ texts, blogPosts }) {
  return layout({
    title: '홈',
    active: '/',
    content: `
<section class="hero">
  <h1>나래</h1>
</section>
<section class="index-grid">
  <a class="index-card" href="/works/"><h2>Works</h2></a>
  <a class="index-card" href="/텍스트/"><h2>Text</h2><p>${texts.length}개</p></a>
  <a class="index-card" href="/블로그/"><h2>Blog</h2><p>${blogPosts.length}개</p></a>
  <a class="index-card" href="/cv/"><h2>CV</h2></a>
</section>`,
  });
}

function worksPage(artworks) {
  return layout({
    title: 'Works',
    active: '/works/',
    content: `
<h1>Works</h1>
${artworks.length ? `<div class="artwork-grid">
  ${artworks.map((a) => artworkFigure(a)).join('\n  ')}
</div>` : `<p class="empty">아직 작품이 없습니다.</p>`}`,
  });
}

function exhibitionDetailPage(ex) {
  return layout({
    title: ex.title,
    active: `/전시/${ex.slug}/`,
    content: `
<article class="exhibition">
  <h1>${esc(ex.title)}${ex.titleEn ? ` <small>${esc(ex.titleEn)}</small>` : ''}</h1>
  <p class="meta">${esc(ex.period)} · ${esc(ex.place)}</p>
  ${ex.heroImages.length ? `<div class="hero-gallery">
    ${ex.heroImages.map((img, i) => `<img src="/${urlPath(img.rel)}" alt="" loading="lazy" class="hero-img" data-hero-index="${i}">`).join('\n    ')}
  </div>` : ''}
  <div class="prose">${md(ex.body)}</div>
  ${ex.artworks.length ? `<h2>출품작</h2>
  <div class="artwork-grid">
    ${ex.artworks.map((a) => artworkFigure(a)).join('\n    ')}
  </div>` : ''}
</article>`,
  });
}

function textListPage(texts) {
  return layout({
    title: '텍스트',
    active: '/텍스트/',
    content: `
<h1>Text</h1>
${texts.length ? `<ul class="list list-plain">
  ${texts.map((t) => `<li><a href="/텍스트/${t.slug}/">
    <span class="li-title">${esc(t.title)}</span>
    <span class="li-meta">${esc(t.author)} ${t.date ? '· ' + esc(t.date) : ''}</span>
  </a></li>`).join('\n  ')}
</ul>` : `<p class="empty">아직 글이 없습니다.</p>`}`,
  });
}

function textDetailPage(t) {
  return layout({
    title: t.title,
    active: '/텍스트/',
    content: `
<article class="prose-page">
  <h1>${esc(t.title)}</h1>
  <p class="meta">${esc(t.author)} ${t.date ? '· ' + esc(t.date) : ''}</p>
  <div class="prose">${md(t.body)}</div>
</article>`,
  });
}

function blogListPage(posts) {
  return layout({
    title: '블로그',
    active: '/블로그/',
    content: `
<h1>Blog</h1>
${posts.length ? `<ul class="list list-plain">
  ${posts.map((p) => `<li><a href="/블로그/${p.slug}/">
    <span class="li-title">${esc(p.title)}</span>
    <span class="li-meta">${esc(p.date)}</span>
  </a></li>`).join('\n  ')}
</ul>` : `<p class="empty">아직 게시물이 없습니다.</p>`}`,
  });
}

function blogDetailPage(p) {
  return layout({
    title: p.title,
    active: '/블로그/',
    content: `
<article class="prose-page">
  <h1>${esc(p.title)}</h1>
  <p class="meta">${esc(p.date)}</p>
  <div class="prose">${md(p.body)}</div>
</article>`,
  });
}

function cvPage(cv) {
  if (!cv) return layout({ title: 'CV', active: '/cv/', content: '<h1>CV</h1><p class="empty">아직 내용이 없습니다.</p>' });
  return layout({
    title: 'CV',
    active: '/cv/',
    content: `
<article class="prose-page">
  <h1>${esc(cv.name) || 'CV'}${cv.nameEn ? ` <small>${esc(cv.nameEn)}</small>` : ''}</h1>
  ${cv.email ? `<p class="meta">${esc(cv.email)}</p>` : ''}
  <div class="prose">${md(cv.body)}</div>
</article>`,
  });
}

module.exports = {
  setNavExhibitions,
  homePage,
  worksPage,
  exhibitionDetailPage,
  textListPage,
  textDetailPage,
  blogListPage,
  blogDetailPage,
  cvPage,
};
