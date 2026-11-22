/* Poenote — phần dùng chung: cấu hình, thư viện trên Netlify, nhạc, ảnh, cuốn sổ. */
(function () {
  'use strict';
  var P = window.Poenote = {};

  /* ---------- tiện ích ---------- */
  P.$ = function (s, r) { return (r || document).querySelector(s); };
  P.$$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  P.esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  P.ls = function (k, v) {
    try {
      if (v === undefined) { var r = localStorage.getItem(k); return r == null ? null : JSON.parse(r); }
      if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v));
      return true;
    } catch (e) { return v === undefined ? null : false; }
  };
  P.toast = function (m, ms) {
    var t = P.$('#toast');
    if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.textContent = m; t.classList.add('on'); clearTimeout(P.toast._t);
    P.toast._t = setTimeout(function () { t.classList.remove('on'); }, ms || 2600);
  };
  P.copy = function (text) {
    if (navigator.share && /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)) {
      return navigator.share({ url: text, title: P.cfg().libraryName }).catch(function () {});
    }
    return navigator.clipboard.writeText(text).then(function () { P.toast('Đã chép link: ' + text); }, function () { window.prompt('Chép link này:', text); });
  };
  P.newId = function () {
    var d = new Date(), p = function (n) { return String(n).padStart(2, '0'); };
    return d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + '-' + p(d.getHours()) + p(d.getMinutes()) + p(d.getSeconds()) + '-' + Math.random().toString(36).slice(2, 6);
  };
  P.fmtDate = function (iso) { var d = new Date(iso || Date.now()); return String(d.getDate()).padStart(2, '0') + '.' + String(d.getMonth() + 1).padStart(2, '0') + '.' + d.getFullYear(); };
  P.monthLabel = function (iso) { var d = new Date(iso || Date.now()); return 'Tháng ' + (d.getMonth() + 1) + ' · ' + d.getFullYear(); };
  P.COLORS = [['lime', 'Chanh'], ['mint', 'Bạc hà'], ['beige', 'Giấy dó'], ['blush', 'Hồng phấn'], ['sky', 'Trời']];

  /* ---------- cấu hình ---------- */
  var HOME = 'https://poenote.netlify.app/';
  var DEFAULT = { owner: 'laint9', repo: 'Poetry', branch: 'main', libraryName: "Laint's Poem" };
  P.cfg = function (patch) {
    var c = Object.assign({}, DEFAULT, P.ls('poenote.cfg') || {});
    if (patch) { c = Object.assign(c, patch); P.ls('poenote.cfg', c); }
    return c;
  };
  /** Mã chủ sổ: chỉ nằm trên máy này, gửi kèm mỗi lần lưu hoặc xoá bài. */
  P.token = function (v) { if (v !== undefined) P.ls('poenote.code', v || null); return P.ls('poenote.code'); };
  P.isOwner = function () { return !!P.token() || !!P.ls('poenote.owner'); };
  var LOCAL = /^https?:$/.test(location.protocol) && !/^(localhost|127\.|\[::1\]|0\.0\.0\.0)/.test(location.hostname);
  P.siteUrl = function () {
    // trang đang chạy trên mạng: chia sẻ đúng địa chỉ đang dùng
    if (LOCAL) return location.origin + location.pathname.replace(/[^/]*$/, '');
    return HOME;
  };
  /** Thư viện nằm trên Netlify. Trang ở nơi khác (GitHub Pages) gọi sang poenote.netlify.app. */
  P.apiBase = function () {
    if (/github\.io$/.test(location.hostname) || !/^https?:$/.test(location.protocol)) return HOME + 'api/';
    return location.origin + '/api/';
  };
  P.rawUrl = function (path) { var c = P.cfg(); return 'https://raw.githubusercontent.com/' + c.owner + '/' + c.repo + '/' + c.branch + '/' + path; };

  /* ---------- API thư viện (Netlify) ---------- */
  function api(path, opts) {
    opts = opts || {};
    var h = {};
    if (opts.body) h['Content-Type'] = 'application/json';
    if (opts.auth) h['X-Owner-Code'] = P.token() || '';
    return fetch(P.apiBase() + path, { method: opts.method || 'GET', headers: h, body: opts.body ? JSON.stringify(opts.body) : undefined, cache: 'no-store' })
      .then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (j) {
          if (!r.ok) { var e = new Error(j.error || ('Máy chủ lỗi ' + r.status)); e.status = r.status; throw e; }
          return j;
        });
      }, function () { var e = new Error('Không có mạng hoặc máy chủ chưa trả lời'); e.status = 0; throw e; });
  }
  P.server = {
    status: function () { return api('status'); },
    claim: function (code) { return api('claim', { method: 'POST', body: { code: code } }); },
    login: function (code) { return api('login', { method: 'POST', body: { code: code } }); }
  };

  /* ---------- Thư viện ---------- */
  var LIB = 'library/poems.json';
  P.loadLibrary = function () {
    return api('library').catch(function () {
      // mất mạng: dùng bản đã lưu trên máy; chưa có thì đọc bản tĩnh cũ
      var c = P.ls('poenote.libcache');
      if (c && c.poems) { c.poems = c.poems.filter(function (q) { return !q._pending; }); return c; }
      return fetch(LIB + '?t=' + Date.now(), { cache: 'no-store' }).then(function (r) { if (!r.ok) throw 0; return r.json(); });
    }).catch(function () { return null; }).then(function (lib) {
      lib = lib || { title: P.cfg().libraryName, poems: [] };
      lib.poems = lib.poems || [];
      var pend = P.ls('poenote.pending') || [];
      pend.forEach(function (p) {
        lib.poems = lib.poems.filter(function (q) { return q.id !== p.id; });
        lib.poems.unshift(Object.assign({}, p, { _pending: true }));
      });
      var deleted = P.ls('poenote.deleted') || [];
      lib.poems = lib.poems.filter(function (q) { return deleted.indexOf(q.id) < 0; });
      lib.poems.sort(function (a, b) { return String(b.createdAt).localeCompare(String(a.createdAt)); });
      P.ls('poenote.libcache', lib);
      return lib;
    });
  };

  /** Lưu một bài (kèm ảnh/nhạc dạng data URL) lên thư viện. Trả về bài đã lưu. */
  P.publishPoem = function (poem, onStep) {
    onStep = onStep || function () {};
    var p = JSON.parse(JSON.stringify(poem)); delete p._pending;
    var heavy = /^data:/.test(p.image || '') || (p.music && /^data:/.test(p.music.src || ''));
    onStep(heavy ? 'Đang tải ảnh, nhạc và lưu bài…' : 'Đang lưu vào ' + P.cfg().libraryName + '…');
    return api('poems/' + encodeURIComponent(p.id), { method: 'PUT', body: { poem: p }, auth: true }).then(function (r) {
      var pend = (P.ls('poenote.pending') || []).filter(function (q) { return q.id !== p.id; });
      P.ls('poenote.pending', pend);
      return r.poem;
    });
  };
  /** Lưu bài vào hàng chờ trên máy (khi chưa mở khoá sổ hoặc mất mạng). */
  P.queuePoem = function (poem) {
    var pend = (P.ls('poenote.pending') || []).filter(function (q) { return q.id !== poem.id; });
    pend.unshift(poem);
    var ok = P.ls('poenote.pending', pend);
    if (!ok) { // ảnh/nhạc quá lớn cho bộ nhớ trình duyệt: giữ phần chữ
      var slim = Object.assign({}, poem); if (slim.music && slim.music.type === 'file') slim.music = null;
      pend[0] = slim; ok = P.ls('poenote.pending', pend);
      if (!ok) { slim.image = ''; pend[0] = slim; ok = P.ls('poenote.pending', pend); }
    }
    return ok;
  };
  P.syncPending = function (onStep) {
    var pend = P.ls('poenote.pending') || [], done = 0;
    return pend.reduce(function (ch, p) { return ch.then(function () { return P.publishPoem(p, onStep).then(function () { done++; }); }); }, Promise.resolve())
      .then(function () {
        var del = P.ls('poenote.deleted') || [];
        return del.reduce(function (ch, id) { return ch.then(function () { return P.deletePoem(id); }); }, Promise.resolve());
      }).then(function () { return done; });
  };
  P.deletePoem = function (id) {
    var pend = (P.ls('poenote.pending') || []).filter(function (q) { return q.id !== id; });
    P.ls('poenote.pending', pend);
    if (!P.token()) { var d = P.ls('poenote.deleted') || []; if (d.indexOf(id) < 0) d.push(id); P.ls('poenote.deleted', d); return Promise.resolve(); }
    return api('poems/' + encodeURIComponent(id), { method: 'DELETE', auth: true })
      .then(function () { var d = (P.ls('poenote.deleted') || []).filter(function (x) { return x !== id; }); P.ls('poenote.deleted', d); });
  };

  /* ---------- Ảnh ---------- */
  P.shrinkImage = function (file, max, q) {
    max = max || 1400; q = q || 0.84;
    return new Promise(function (res, rej) {
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () {
        var s = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement('canvas');
        c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url); res(c.toDataURL('image/jpeg', q));
      };
      img.onerror = function () { URL.revokeObjectURL(url); rej(new Error('Không đọc được ảnh này.')); };
      img.src = url;
    });
  };
  /** Đường dẫn hiển thị cho ảnh/nhạc đã lưu: api/media/… nằm trên Netlify; library/media/… là bản cũ trên GitHub. */
  P.mediaSrc = function (path) { if (!path) return ''; if (/^(data:|https?:|blob:)/.test(path)) return path; if (/^api\//.test(path)) return P.apiBase().replace(/api\/$/, '') + path; return path; };
  P.imgFallback = function (img) {
    var p = img.getAttribute('data-path');
    if (p && /^library\//.test(p) && !img.dataset.tried) { img.dataset.tried = '1'; img.src = P.rawUrl(p); }
  };

  /* ---------- Nhạc ---------- */
  /** Nhận link Spotify / YouTube / Apple Music / SoundCloud và trả về thông tin nhúng. */
  P.parseMusic = function (url) {
    url = String(url || '').trim();
    var m;
    if ((m = url.match(/open\.spotify\.com\/(?:intl-[a-z-]+\/)?(?:embed\/)?(track|album|playlist|episode|artist|show)\/([A-Za-z0-9]+)/)))
      return { type: 'spotify', url: url, embed: 'https://open.spotify.com/embed/' + m[1] + '/' + m[2] + '?utm_source=generator', height: m[1] === 'track' || m[1] === 'episode' ? 152 : 352, label: 'Spotify' };
    if ((m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/)|music\.youtube\.com\/watch\?(?:.*&)?v=)([A-Za-z0-9_-]{11})/)))
      return { type: 'youtube', url: url, embed: 'https://www.youtube-nocookie.com/embed/' + m[1], height: 200, label: /music\.youtube/.test(url) ? 'YouTube Music' : 'YouTube' };
    if ((m = url.match(/^https:\/\/music\.apple\.com\/(.+)$/)))
      return { type: 'apple', url: url, embed: 'https://embed.music.apple.com/' + m[1], height: /[?&]i=/.test(url) ? 175 : 450, label: 'Apple Music' };
    if (/^https:\/\/(on\.|m\.)?soundcloud\.com\//.test(url))
      return { type: 'soundcloud', url: url, embed: 'https://w.soundcloud.com/player/?url=' + encodeURIComponent(url) + '&color=%23ff4b12&visual=false', height: 166, label: 'SoundCloud' };
    if (/^https?:\/\//.test(url)) return { type: 'link', url: url, label: 'Link nhạc' };
    return null;
  };
  P.musicPlayer = function (music) {
    if (!music) return '';
    var t = P.esc(music.title || '');
    if (music.type === 'file') {
      var src = P.esc(P.mediaSrc(music.src));
      return '<div class="mplay">' + (t ? '<div class="small" style="margin-bottom:6px">♪ ' + t + '</div>' : '') + '<audio controls preload="none" src="' + src + '" data-path="' + P.esc(music.src) + '" onerror="Poenote.imgFallback(this)"></audio></div>';
    }
    if (music.embed) return (t ? '<div class="small" style="margin-bottom:6px">♪ ' + t + '</div>' : '') + '<iframe class="embed" src="' + P.esc(music.embed) + '" height="' + (music.height || 152) + '" loading="lazy" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" title="Trình phát nhạc"></iframe>';
    return '<a class="btn sm" href="' + P.esc(music.url) + '" target="_blank" rel="noopener">♪ ' + (t || 'Mở bài hát') + '</a>';
  };

  /* ---------- Cuốn sổ ---------- */
  var DOODLE = '<svg viewBox="0 0 200 150" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M40 30h100a12 12 0 0 1 0 24H40a12 12 0 0 1 0-24z"/><circle cx="140" cy="42" r="6"/><path d="M134 42a6 6 0 0 1 6-6"/>' +
    '<path d="M44 54v66q0 8 8 10l60 0q10 0 14-8l10-68"/><path d="M58 70q8-6 16 0t16 0 16 0"/><path d="M58 88q8-6 16 0t16 0 16 0"/><path d="M58 106q8-6 16 0t16 0"/></svg>';
  P.ICONS = {
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
    book: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5"/></svg>',
    gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
    note: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>',
    share: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7"/><path d="M16 6l-4-4-4 4M12 2v13"/></svg>',
    pen: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4z"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    photo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-8 8"/></svg>',
    spark: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6"/></svg>'
  };

  P.formName = function (k) { return (window.ThiBut && window.ThiBut.FORMS[k] && window.ThiBut.FORMS[k].name) || ''; };
  /** HTML một cuốn sổ. opts: {editable, compact} */
  P.notebook = function (p, opts) {
    opts = opts || {};
    var color = p.color || 'lime';
    var lines = String(p.text || '').split('\n').filter(function (l) { return l.trim(); });
    var img = p.image ? '<img alt="" src="' + P.esc(P.mediaSrc(p.image)) + '" data-path="' + P.esc(p.image) + '" onerror="Poenote.imgFallback(this)" loading="lazy">' : '<div class="ph">' + DOODLE + '</div>';
    var music = p.music ? '<span class="music-chip" ' + (opts.editable ? 'data-act="music"' : '') + '>' + P.ICONS.note + '<span>' + P.esc(p.music.title || p.music.label || 'Nhạc') + '</span></span>' : (opts.editable ? '<button type="button" class="music-chip" data-act="music">' + P.ICONS.note + '<span>Thêm nhạc</span></button>' : '');
    var label = (P.cfg().libraryName) + ' · ' + P.monthLabel(p.createdAt);
    return '<article class="nb c-' + P.esc(color) + '">' +
      '<div class="nb-top"><span class="w">Poenote</span><span class="rings"><i></i><i></i><i></i><i></i><i></i></span></div>' +
      '<div class="nb-label">' + P.esc(label) + '</div>' +
      '<div class="nb-img"' + (opts.editable ? ' data-act="image" role="button" tabindex="0" aria-label="Thêm ảnh"' : '') + '>' + img + music + '</div>' +
      '<div class="nb-blk"><div class="k">' + P.esc([P.formName(p.form), P.fmtDate(p.createdAt)].filter(Boolean).join(' · ')) + (p._pending ? ' · chưa đồng bộ' : '') + '</div>' +
      '<h3>' + P.esc(p.title || 'Chưa đặt tên') + '</h3>' + (opts.compact ? '' : '<p>' + P.esc(lines.slice(0, 2).join('\n') || 'Bắt đầu viết bên dưới…') + '</p>') + '</div>' +
      '</article>';
  };

  /** Tờ note dán trong sổ: giấy màu, góc gập, dòng kẻ, nhãn thể thơ và nhạc ở chân. */
  P.noteCard = function (p, opts) {
    opts = opts || {};
    var color = p.color || 'lime';
    var lines = String(p.text || '').split('\n').filter(function (l) { return l.trim(); });
    var n = opts.compact ? 3 : 5;
    var form = P.formName(p.form);
    var tags = (form ? '<span class="nt-tag">' + P.esc(form) + '</span>' : '') +
      (p.music ? '<span class="nt-tag">' + P.ICONS.note + '<span>' + P.esc(p.music.title || p.music.label || 'Nhạc') + '</span></span>' : '') +
      (p._pending ? '<span class="nt-tag nt-wait">chưa đồng bộ</span>' : '');
    return '<article class="sticky c-' + P.esc(color) + (opts.compact ? ' sm' : '') + '">' +
      '<div class="nt-date">' + P.esc(P.fmtDate(p.createdAt)) + '</div>' +
      '<h3 class="nt-title">' + P.esc(p.title || 'Chưa đặt tên') + '</h3>' +
      (p.image ? '<div class="nt-img"><img alt="" src="' + P.esc(P.mediaSrc(p.image)) + '" data-path="' + P.esc(p.image) + '" onerror="Poenote.imgFallback(this)" loading="lazy"></div>' : '') +
      '<p class="nt-text" style="-webkit-line-clamp:' + n + '">' + P.esc(lines.slice(0, n + 1).join('\n') || '…') + '</p>' +
      (tags ? '<div class="nt-tags">' + tags + '</div>' : '') +
      '</article>';
  };

  /* ---------- Bảng trượt ---------- */
  P.sheet = function (title, bodyHtml, onClose) {
    P.closeSheet();
    var scrim = document.createElement('div'); scrim.className = 'scrim';
    var sh = document.createElement('section'); sh.className = 'sheet'; sh.setAttribute('role', 'dialog'); sh.setAttribute('aria-label', title);
    sh.innerHTML = '<div class="grab"></div><div class="sheet-h"><h2>' + P.esc(title) + '</h2><button type="button" class="btn sm ghost" data-close aria-label="Đóng">' + P.ICONS.close.replace('<svg', '<svg width="18" height="18"') + '</button></div><div class="sheet-b">' + bodyHtml + '</div>';
    document.body.appendChild(scrim); document.body.appendChild(sh);
    function close() { P.closeSheet(); }
    scrim.addEventListener('click', close); sh.querySelector('[data-close]').addEventListener('click', close);
    P._sheet = { scrim: scrim, el: sh, onClose: onClose };
    document.body.style.overflow = 'hidden';
    return sh;
  };
  P.closeSheet = function () {
    if (!P._sheet) return;
    var s = P._sheet; P._sheet = null;
    s.scrim.remove(); s.el.remove(); document.body.style.overflow = '';
    if (s.onClose) s.onClose();
  };
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') P.closeSheet(); });
})();

/* Cài như ứng dụng: service worker cho phép mở Poenote khi mất mạng */
if ('serviceWorker' in navigator && /^https:$/.test(location.protocol)) {
  window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () {}); });
}
