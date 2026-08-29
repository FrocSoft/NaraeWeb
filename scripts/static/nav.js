(function () {
  var toggle = document.getElementById('menu-toggle');
  var sidebar = document.getElementById('site-sidebar');
  var backdrop = document.getElementById('nav-backdrop');
  var topbar = document.getElementById('mobile-topbar');
  if (!toggle || !sidebar || !backdrop || !topbar) return;

  function setOpen(open) {
    sidebar.classList.toggle('nav-open', open);
    backdrop.classList.toggle('show', open);
    toggle.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    toggle.setAttribute('aria-label', open ? '메뉴 닫기' : '메뉴 열기');
    document.body.style.overflow = open ? 'hidden' : '';
  }

  toggle.addEventListener('click', function () {
    setOpen(!sidebar.classList.contains('nav-open'));
  });
  backdrop.addEventListener('click', function () { setOpen(false); });

  // 모바일에서 아래로 스크롤하면 상단 바를 숨기고, 위로 스크롤하면 다시 보이게.
  var lastY = window.scrollY;
  var THRESHOLD = 10; // 자잘한 흔들림 무시
  window.addEventListener('scroll', function () {
    if (sidebar.classList.contains('nav-open')) return; // 메뉴 열려있을 땐 그대로 둠

    var y = window.scrollY;
    var diff = y - lastY;
    if (Math.abs(diff) < THRESHOLD) return;

    if (diff > 0 && y > 60) {
      topbar.classList.add('nav-hidden');
    } else {
      topbar.classList.remove('nav-hidden');
    }
    lastY = y;
  }, { passive: true });
})();
