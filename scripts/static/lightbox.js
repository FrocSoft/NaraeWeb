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
    imgEl.src = img.src;
    imgEl.alt = img.alt || '';
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
