// 원본 이미지를 웹에 맞게 줄이고 압축해서 dist에 내보냄.
// - full: 라이트박스/전경 사진용, 최대 2000px
// - thumb: 목록 그리드용 작은 썸네일, 최대 480px
// 원본보다 작은 이미지는 확대하지 않음. 형식(jpg/png/webp)은 그대로 유지, gif는 그냥 복사(움짤 깨짐 방지).

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const FULL_MAX_WIDTH = 2000;
const THUMB_MAX_WIDTH = 480;

function ensureDir(p) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
}

async function resizeTo(srcPath, destPath, maxWidth, quality) {
  ensureDir(destPath);
  const ext = path.extname(srcPath).toLowerCase();
  if (ext === '.gif') {
    fs.copyFileSync(srcPath, destPath);
    return;
  }
  let img = sharp(srcPath).rotate().resize({ width: maxWidth, withoutEnlargement: true });
  if (ext === '.png') {
    img = img.png({ compressionLevel: 9 });
  } else if (ext === '.webp') {
    img = img.webp({ quality });
  } else {
    img = img.jpeg({ quality, mozjpeg: true });
  }
  await img.toFile(destPath);
}

function fullImage(srcPath, destPath) {
  return resizeTo(srcPath, destPath, FULL_MAX_WIDTH, 82);
}

function thumbImage(srcPath, destPath) {
  return resizeTo(srcPath, destPath, THUMB_MAX_WIDTH, 78);
}

module.exports = { fullImage, thumbImage };
