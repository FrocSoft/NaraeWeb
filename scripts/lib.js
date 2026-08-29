// 콘텐츠 폴더를 읽어 구조화된 데이터로 바꾸는 함수들.
// 원칙: 형식이 살짝 어긋나도 빌드가 죽지 않는다. 모자란 값은 그럴듯한 기본값으로 채운다.

const fs = require('fs');
const path = require('path');

const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp']);

function isHidden(name) {
  return name.startsWith('_') || name.startsWith('.') || name.startsWith('~$');
}

function listDirs(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !isHidden(e.name))
    .map((e) => e.name)
    .sort();
}

function listFiles(dir, ext) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isFile() && !isHidden(e.name))
    .map((e) => e.name)
    .filter((n) => !ext || path.extname(n).toLowerCase() === ext)
    .sort();
}

// 폴더 바로 아래(하위 폴더는 안 봄)에 있는 .md 파일 하나를 찾는다.
// 파일 이름은 무엇이든 상관없음 (info.md, 전시.md, 아무이름.md 다 됨).
function findMainMdFile(dir) {
  const mds = listFiles(dir, '.md');
  return mds.length ? path.join(dir, mds[0]) : null;
}

// 폴더 안(하위 폴더 포함)의 이미지를 전부 찾아 이름순으로 반환.
function findImagesRecursive(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  function walk(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (isHidden(e.name)) continue;
      const full = path.join(d, e.name);
      if (e.isDirectory()) {
        walk(full);
      } else if (IMAGE_EXT.has(path.extname(e.name).toLowerCase())) {
        out.push(full);
      }
    }
  }
  walk(dir);
  out.sort();
  return out;
}

// 메타데이터(제목: 값 형태)와 본문을 분리한다.
// 1) --- 로 감싼 블록 (옵시디언 속성 형식)
// 2) 파일 맨 위에 그냥 "키: 값" 줄이 이어지는 형식 (--- 없이)
// 둘 다 지원. 어느 쪽도 아니면 전체를 본문으로 취급.
function parseMeta(raw) {
  const text = raw.replace(/\r\n/g, '\n');
  const lines = text.split('\n');
  const meta = {};

  // --- 블록 형식
  if (lines[0] !== undefined && lines[0].trim() === '---') {
    let i = 1;
    for (; i < lines.length; i++) {
      if (lines[i].trim() === '---') { i++; break; }
      const m = lines[i].match(/^([^:：]{1,40})[:：]\s*(.*)$/);
      if (m) meta[m[1].trim()] = m[2].trim();
    }
    const body = lines.slice(i).join('\n');
    return { meta, body: stripLeadingNoise(body) };
  }

  // 느슨한 "키: 값" 줄 형식
  let i = 0;
  for (; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === '') break;
    const m = line.match(/^([^:：]{1,40})[:：]\s*(.*)$/);
    if (!m) break;
    meta[m[1].trim()] = m[2].trim();
  }
  const body = lines.slice(i).join('\n');
  return { meta, body: stripLeadingNoise(body) };
}

// 본문 시작 부분에 남는 자잘한 잡음 제거:
// 빈 줄, "내용"/"본문" 같은 라벨만 있는 줄, ---/=== 구분선.
function stripLeadingNoise(body) {
  let lines = body.split('\n');
  let changed = true;
  while (changed) {
    changed = false;
    while (lines.length && lines[0].trim() === '') { lines.shift(); changed = true; }
    if (lines.length && /^(내용|본문)$/.test(lines[0].trim())) { lines.shift(); changed = true; }
    while (lines.length && lines[0].trim() === '') { lines.shift(); changed = true; }
    if (lines.length && /^-{3,}$|^={3,}$/.test(lines[0].trim())) { lines.shift(); changed = true; }
  }
  return lines.join('\n').trim();
}

// 본문 안의 헤더를 한 단계씩 내린다 (# -> ##).
// 페이지 제목은 메타데이터에서 오는 <h1> 하나뿐이어야 하므로.
function demoteHeadings(markdown) {
  return markdown.replace(/^(#{1,5})(\s)/gm, '#$1$2');
}

function pick(meta, keys, fallback) {
  for (const k of keys) {
    if (meta[k] !== undefined && meta[k] !== '') return meta[k];
  }
  return fallback;
}

// 문자열에서 4자리 연도를 찾아 정렬용 숫자로 반환. 없으면 0.
function extractYear(str) {
  const m = String(str || '').match(/(19|20)\d{2}/);
  return m ? parseInt(m[0], 10) : 0;
}

function slugify(name) {
  return name.trim().replace(/\s+/g, '-');
}

module.exports = {
  listDirs,
  listFiles,
  findMainMdFile,
  findImagesRecursive,
  parseMeta,
  demoteHeadings,
  pick,
  extractYear,
  slugify,
  isHidden,
};
