(function () {
  var box = document.getElementById('lightbox');
  if (!box) return;
  var imgEl = box.querySelector('.lb-img');
  var capEl = box.querySelector('.lb-caption');
  var list = [];
  var index = 0;

  function esc(s) {
    return String(s || '').replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // 표준 도판 캡션: 제목, 연도, 재료, 크기 (쉼표로 연결). 영문 제목만 이텔릭.
  function tombstoneLine(title, year, material, size, italic) {
    if (!title) return '';
    var rest = [year, material, size].filter(Boolean).map(esc).join(', ');
    var titleHtml = esc(title);
    if (italic) titleHtml = '<em>' + titleHtml + '</em>';
    return titleHtml + (rest ? ', ' + rest : '');
  }

  function captionFor(img) {
    // 전경 사진은 페이지에 이미 완성된 캡션(국문/영문/사진크레딧)이 있으니 그걸 그대로 씀.
    if (img.dataset.caption) {
      return '<div class="lb-line">' + img.dataset.caption + '</div>';
    }
    var ko = tombstoneLine(img.dataset.title, img.dataset.year, img.dataset.material, img.dataset.size, false);
    var en = tombstoneLine(img.dataset.titleEn, img.dataset.year, img.dataset.materialEn, img.dataset.size, true);
    var html = '';
    if (ko) html += '<div class="lb-line">' + ko + '</div>';
    if (en) html += '<div class="lb-line lb-line-en">' + en + '</div>';
    return html;
  }

  function show(i) {
    index = (i + list.length) % list.length;
    var img = list[index];
    imgEl.src = img.dataset.full || img.src;
    imgEl.alt = img.alt || '';
    // 작품 폴더의 첫 번째 사진은 작품 전체(대표) 사진, 그 뒤는 디테일 사진.
    // 디테일 사진은 화면 너비를 꽉 채워서 크게 보여준다.
    var isDetail = img.classList.contains('art-img') && Number(img.dataset.index || 0) > 0;
    imgEl.classList.toggle('lb-wide', isDetail);
    capEl.innerHTML = captionFor(img);
  }

  function open(imgs, startIndex) {
    list = imgs;
    box.hidden = false;
    document.body.style.overflow = 'hidden';
    show(startIndex);
  }

  function close() {
    box.hidden = true;
    document.body.style.overflow = '';
  }

  function bindGroup(selector) {
    var imgs = Array.prototype.slice.call(document.querySelectorAll(selector));
    imgs.forEach(function (img, i) {
      img.addEventListener('click', function () { open(imgs, i); });
    });
  }

  bindGroup('.hero-img');
  bindGroup('.art-img');
  bindGroup('.post-img');

  box.querySelector('.lb-close').addEventListener('click', close);
  box.querySelector('.lb-prev').addEventListener('click', function () { show(index - 1); });
  box.querySelector('.lb-next').addEventListener('click', function () { show(index + 1); });
  box.addEventListener('click', function (e) { if (e.target === box) close(); });
  document.addEventListener('keydown', function (e) {
    if (box.hidden) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowLeft') show(index - 1);
    if (e.key === 'ArrowRight') show(index + 1);
  });
})();
