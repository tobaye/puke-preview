/* Tobpage · 普客网主题脚本（vanilla JS，零依赖） */
(function () {
  'use strict';

  /* ---------- 深浅色切换（引导脚本在 baseof <head> 里先行定调，防闪烁） ---------- */
  var toggle = document.getElementById('theme-toggle');
  if (toggle) {
    toggle.addEventListener('click', function () {
      var html = document.documentElement;
      var next = html.dataset.theme === 'dark' ? 'light' : 'dark';
      html.dataset.theme = next;
      try { localStorage.setItem('tobpage-theme', next); } catch (e) {}
    });
  }

  /* ---------- 移动端菜单 ---------- */
  var navToggle = document.getElementById('nav-toggle');
  var nav = document.getElementById('site-nav');
  if (navToggle && nav) {
    navToggle.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  /* ---------- 栏目下拉：移动端手风琴（桌面端走 CSS hover/focus） ----------
     窄屏下第一次点父栏目只展开子菜单（并收起其他已展开的），已展开时再点才跳转到分类索引分组。 */
  var dropParents = document.querySelectorAll('.has-drop > .nav-parent');
  Array.prototype.forEach.call(dropParents, function (link) {
    link.addEventListener('click', function (e) {
      if (!window.matchMedia('(max-width: 720px)').matches) return;
      var li = link.parentElement;
      if (li.classList.contains('open')) return;
      e.preventDefault();
      Array.prototype.forEach.call(document.querySelectorAll('.has-drop.open'), function (o) {
        if (o !== li) o.classList.remove('open');
      });
      li.classList.add('open');
    });
  });

  /* ---------- 本站已运行天数（起算日默认 2026-10-29，上线当天记为第 1 天；口径与现站一致） ---------- */
  var up = document.getElementById('site-uptime-days');
  if (up) {
    var parts = String(up.dataset.start || '2026-10-29').split('-');
    var start = new Date(+parts[0], (+parts[1] || 1) - 1, +parts[2] || 1);
    var now = new Date();
    var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var days = Math.floor((today - start) / 86400000) + 1;
    if (days > 0) up.textContent = days;
  }

  /* ---------- 阅读进度条 + 回到顶部 ---------- */
  var bar = document.getElementById('reading-progress');
  var toTop = document.getElementById('back-to-top');
  var ticking = false;
  function onScroll() {
    var h = document.documentElement;
    var max = h.scrollHeight - h.clientHeight;
    var y = h.scrollTop || document.body.scrollTop;
    if (bar) bar.style.width = (max > 0 ? (y / max) * 100 : 0) + '%';
    if (toTop) toTop.classList.toggle('show', y > h.clientHeight * 0.6);
    ticking = false;
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  onScroll();
  if (toTop) {
    toTop.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* ---------- TOC 滚动高亮（scrollspy） ---------- */
  var tocLinks = Array.prototype.slice.call(document.querySelectorAll('.toc-body a[href^="#"]'));
  if (tocLinks.length) {
    var headingOf = tocLinks.map(function (a) {
      var id = decodeURIComponent(a.getAttribute('href').slice(1));
      return document.getElementById(id);
    });
    var spyTick = false;
    function spy() {
      var pos = window.scrollY + 120;
      var current = -1;
      headingOf.forEach(function (el, i) {
        if (el && el.offsetTop <= pos) current = i;
      });
      tocLinks.forEach(function (a, i) {
        a.classList.toggle('toc-active', i === current);
      });
      spyTick = false;
    }
    window.addEventListener('scroll', function () {
      if (!spyTick) { spyTick = true; requestAnimationFrame(spy); }
    }, { passive: true });
    spy();
  }

  /* ---------- 正文图片点击看大图（新窗口打开原图，沿用现站习惯） ---------- */
  document.addEventListener('click', function (e) {
    var t = e.target;
    if (t && t.tagName === 'IMG' && t.closest && t.closest('.post-content')) {
      window.open(t.currentSrc || t.src, '_blank');
    }
  });

  /* ---------- 本地搜索（/search/ 页：拉取 /index.json 全量索引，前端过滤） ---------- */
  var input = document.getElementById('search-input');
  var resultsEl = document.getElementById('search-results');
  var hintEl = document.getElementById('search-hint');
  if (input && resultsEl) {
    var indexData = null;
    var loading = false;

    function loadIndex() {
      if (indexData || loading) return;
      loading = true;
      fetch('/index.json')
        .then(function (r) { return r.json(); })
        .then(function (data) { indexData = data; loading = false; runSearch(); })
        .catch(function () {
          loading = false;
          if (hintEl) hintEl.textContent = '搜索索引加载失败，请稍后重试。';
        });
    }

    function esc(s) {
      return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
      });
    }

    function snippet(text, q) {
      if (!text) return '';
      var i = text.toLowerCase().indexOf(q);
      if (i < 0) return esc(text.slice(0, 110)) + '…';
      var from = Math.max(0, i - 42);
      return (from > 0 ? '…' : '') + esc(text.slice(from, i + q.length + 68)) + '…';
    }

    function runSearch() {
      var q = input.value.trim().toLowerCase();
      if (!q) {
        resultsEl.innerHTML = '';
        if (hintEl) hintEl.textContent = '在全部文章的标题、正文、分类与标签里搜索。';
        return;
      }
      if (!indexData) { loadIndex(); return; }
      var hits = indexData.filter(function (p) {
        var bag = (p.title + ' ' + (p.summary || '') + ' ' + (p.content || '') + ' ' +
          (p.categories || []).join(' ') + ' ' + (p.tags || []).join(' ')).toLowerCase();
        return bag.indexOf(q) >= 0;
      });
      if (hintEl) hintEl.textContent = '共找到 ' + hits.length + ' 篇相关文章。';
      resultsEl.innerHTML = hits.map(function (p) {
        return '<a class="search-result" href="' + esc(p.permalink) + '">' +
          '<time>' + esc(p.date) + '</time>' +
          '<h3>' + esc(p.title) + '</h3>' +
          '<p>' + snippet(p.content || p.summary || '', q) + '</p></a>';
      }).join('');
    }

    input.addEventListener('input', runSearch);
    input.addEventListener('focus', loadIndex);
    // 支持 /search/?q=关键词 直达
    var q0 = new URLSearchParams(window.location.search).get('q');
    if (q0) { input.value = q0; loadIndex(); }
  }
})();
