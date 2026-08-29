// content/ 폴더 각 컬렉션(작품, 전시, 텍스트, 블로그, CV)을 읽어
// 페이지 생성에 쓸 수 있는 데이터 배열로 만든다.

const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const {
  listDirs,
  listFiles,
  findMainMdFile,
  findImagesRecursive,
  parseMeta,
  pick,
  extractYear,
  slugify,
} = require('./lib');

const CONTENT_DIR = path.join(__dirname, '..', 'content');

function warn(msg) {
  console.warn('  ⚠ ' + msg);
}

// ---------- 작품 (엑셀 표 + 번호 폴더 이미지) ----------
function loadArtworks() {
  const dir = path.join(CONTENT_DIR, '작품');
  const xlsxFiles = listFiles(dir, '.xlsx');
  if (xlsxFiles.length === 0) {
    warn('작품/ 안에 xlsx 파일이 없습니다. 작품 없이 진행합니다.');
    return new Map();
  }
  if (xlsxFiles.length > 1) {
    warn(`작품/ 안에 xlsx가 ${xlsxFiles.length}개 있습니다. "${xlsxFiles[0]}"만 사용합니다.`);
  }
  const wb = XLSX.readFile(path.join(dir, xlsxFiles[0]));
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' });

  const byCode = new Map();
  for (const row of rows) {
    const code = parseInt(pick(row, ['참조 코드', '번호', '참조코드'], ''), 10);
    if (Number.isNaN(code)) {
      warn(`작품 표에 참조 코드가 없는 행이 있습니다: ${JSON.stringify(row)}`);
      continue;
    }
    byCode.set(code, {
      code,
      title: pick(row, ['제목(국문)', '제목'], `작품 ${code}`),
      titleEn: pick(row, ['제목(영문)'], ''),
      year: pick(row, ['제작연도', '제작년도'], ''),
      material: pick(row, ['재료(국문)', '재료'], ''),
      materialEn: pick(row, ['재료(영문)'], ''),
      size: pick(row, ['사이즈', '크기'], ''),
      images: [],
    });
  }

  // 폴더명(참조 코드 숫자, 001/002...)과 표의 참조 코드를 매칭
  for (const folderName of listDirs(dir)) {
    const code = parseInt(folderName, 10);
    if (Number.isNaN(code)) {
      warn(`작품/${folderName} 폴더 이름이 숫자가 아니라 건너뜁니다.`);
      continue;
    }
    const images = findImagesRecursive(path.join(dir, folderName)).map((abs) => ({
      abs,
      rel: `작품/${folderName}/${path.basename(abs)}`,
    }));
    if (!byCode.has(code)) {
      warn(`작품/${folderName} 폴더는 있는데 표에는 ${code}번 행이 없습니다.`);
      byCode.set(code, {
        code,
        title: `(표에 정보 없음: ${code}번)`,
        titleEn: '',
        year: '',
        material: '',
        materialEn: '',
        size: '',
        images,
      });
    } else {
      byCode.get(code).images = images;
    }
  }

  for (const art of byCode.values()) {
    if (art.images.length === 0) warn(`${art.code}번 "${art.title}" 작품에 이미지가 없습니다.`);
  }

  return byCode;
}

// ---------- 전시 ----------
//
// 두 가지 작성 방식을 다 받아준다.
// 1) 양식대로 "제목: / 기간: / 장소: / 출품작:" 헤더를 쓴 경우 -> parseMeta가 그대로 처리.
// 2) 라벨 없이 자유롭게 쓴 경우(예: 《국문 제목》, *English Title*, 출품작: 이 본문 아무 데나) ->
//    본문 전체에서 그 패턴들을 찾아 뽑아내고, 뽑아낸 줄은 화면에 중복으로 안 보이게 본문에서 지움.
function loadExhibitions(artworkByCode) {
  const dir = path.join(CONTENT_DIR, '전시');
  return listDirs(dir).map((folderName) => {
    const folder = path.join(dir, folderName);
    const mdPath = findMainMdFile(folder);
    let meta = {}, body = '';
    if (mdPath) {
      ({ meta, body } = parseMeta(fs.readFileSync(mdPath, 'utf8')));
    } else {
      warn(`전시/${folderName} 폴더에 설명 md 파일이 없습니다.`);
    }

    // 출품작: 헤더에 없으면 본문 아무 줄에서나 찾는다.
    let artworkField = meta['출품작'];
    if (artworkField === undefined) {
      const m = body.match(/^[ \t]*출품작\s*[:：]\s*(.+)$/m);
      if (m) {
        artworkField = m[1];
        body = body.replace(m[0], '').trim();
      }
    }
    const codes = String(artworkField || '')
      .split(/[,\s]+/)
      .map((s) => parseInt(s, 10))
      .filter((n) => !Number.isNaN(n));

    const artworks = [];
    for (const code of codes) {
      const art = artworkByCode.get(code);
      if (art) artworks.push(art);
      else warn(`전시/${folderName}: 출품작 ${code}번을 작품 목록에서 찾을 수 없습니다.`);
    }

    // 《제목》 형식의 국문 제목 줄이 본문에 단독으로 있으면 제목으로 쓴다 (본문에서는 뺌).
    let titleFromBody;
    const koTitleMatch = body.match(/^[ \t]*《([^》]+)》[ \t]*$/m);
    if (koTitleMatch) {
      titleFromBody = koTitleMatch[1].trim();
      body = body.replace(koTitleMatch[0], '').trim();
    }
    // 국문 제목을 찾았을 때만, 그 짝인 *영문 제목* 단독 줄도 찾는다 (오탐 방지).
    let titleEnFromBody;
    if (titleFromBody) {
      const enTitleMatch = body.match(/^[ \t]*\*([^*\n]+)\*[ \t]*$/m);
      if (enTitleMatch) {
        titleEnFromBody = enTitleMatch[1].trim();
        body = body.replace(enTitleMatch[0], '').trim();
      }
    }
    body = body.replace(/\n{3,}/g, '\n\n').trim();

    // md 파일을 제외한 이미지들 = 전경/설치 이미지
    const heroImages = findImagesRecursive(folder).map((abs) => ({
      abs,
      rel: `전시/${folderName}/${path.relative(folder, abs).replace(/\\/g, '/')}`,
    }));

    const title = pick(meta, ['제목(국문)', '제목', '전시명', '이름'], titleFromBody || folderName);
    const period = pick(meta, ['기간(국문)', '기간'], '');
    const start = pick(meta, ['시작일'], '');

    return {
      slug: slugify(folderName),
      folderName,
      title,
      titleEn: pick(meta, ['제목(영문)'], titleEnFromBody || ''),
      period,
      place: pick(meta, ['장소'], ''),
      sortYear: extractYear(start || period || folderName),
      heroImages,
      artworks,
      body,
    };
  }).sort((a, b) => b.sortYear - a.sortYear);
}

// ---------- 텍스트 / 블로그 (파일 하나 = 글 하나) ----------
function loadFlatCollection(collectionName, fields) {
  const dir = path.join(CONTENT_DIR, collectionName);
  return listFiles(dir, '.md').map((fileName) => {
    const fullPath = path.join(dir, fileName);
    const { meta, body } = parseMeta(fs.readFileSync(fullPath, 'utf8'));
    const stem = fileName.replace(/\.md$/, '');
    const entry = { slug: slugify(stem), body };
    for (const [key, aliases, fallback] of fields) {
      entry[key] = pick(meta, aliases, typeof fallback === 'function' ? fallback(stem) : fallback);
    }
    return entry;
  });
}

function loadTexts() {
  return loadFlatCollection('텍스트', [
    ['title', ['제목'], (stem) => stem],
    ['author', ['필자', '저자'], ''],
    ['date', ['발표일', '날짜'], ''],
  ]).sort((a, b) => extractYear(b.date) - extractYear(a.date));
}

function loadBlogPosts() {
  return loadFlatCollection('블로그', [
    ['title', ['제목'], (stem) => stem],
    ['date', ['날짜'], ''],
  ]).sort((a, b) => extractYear(b.date) - extractYear(a.date));
}

// ---------- CV ----------
function loadCV() {
  const file = path.join(CONTENT_DIR, 'CV.md');
  if (!fs.existsSync(file)) return null;
  const { meta, body } = parseMeta(fs.readFileSync(file, 'utf8'));
  return {
    name: pick(meta, ['이름'], ''),
    nameEn: pick(meta, ['이름(영문)'], ''),
    email: pick(meta, ['이메일'], ''),
    body,
  };
}

function loadAll() {
  const artworkByCode = loadArtworks();
  return {
    artworkByCode,
    exhibitions: loadExhibitions(artworkByCode),
    texts: loadTexts(),
    blogPosts: loadBlogPosts(),
    cv: loadCV(),
  };
}

module.exports = { loadAll };
