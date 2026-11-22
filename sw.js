/* Poenote service worker: mở được khi mất mạng.
   Giao diện: dùng bản đã lưu, cập nhật ngầm. Thư viện và GitHub API: luôn lấy mới. */
var CACHE = 'poenote-v1';
var SHELL = ['write.html', 'index.html', 'manifest.webmanifest',
  'assets/poenote.css', 'assets/common.js', 'assets/engine.js', 'assets/seed.js',
  'assets/fonts/Labrada-VariableFont_wght.ttf', 'assets/fonts/Labrada-Italic-VariableFont_wght.ttf',
  'assets/icons/icon-192.png', 'assets/icons/apple-touch-icon.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(SHELL); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  var req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  if (/\/library\//.test(url.pathname)) return; // dữ liệu thơ: luôn đi mạng
  var key = url.pathname.endsWith('/') ? url.pathname + 'index.html' : url.pathname;
  e.respondWith(caches.open(CACHE).then(function (c) {
    return c.match(key, { ignoreSearch: true }).then(function (hit) {
      var net = fetch(req).then(function (r) { if (r.ok) c.put(key, r.clone()); return r; });
      return hit ? (net.catch(function () {}), hit) : net;
    });
  }));
});
