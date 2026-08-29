(function () {
  var toggle = document.getElementById('menu-toggle');
  var sidebar = document.getElementById('site-sidebar');
  var backdrop = document.getElementById('nav-backdrop');
  if (!toggle || !sidebar || !backdrop) return;

  function setOpen(open) {
    sidebar.classList.toggle('nav-open', open);
    backdrop.classList.toggle('show', open);
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    toggle.setAttribute('aria-label', open ? '메뉴 닫기' : '메뉴 열기');
    document.body.style.overflow = open ? 'hidden' : '';
  }

  toggle.addEventListener('click', function () {
    setOpen(!sidebar.classList.contains('nav-open'));
  });
  backdrop.addEventListener('click', function () { setOpen(false); });
})();
