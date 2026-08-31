// Service worker for Turmanator Shop Tools.
// Bump CACHE when redeploying so phones pick up the new version.
var CACHE = 'shop-tools-v2';
var SHELL = [
  './',
  './index.html',
  './axle/',
  './axle/index.html',
  './manifest.webmanifest',
  './apple-touch-icon.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE)
      .then(function (c) { return c.addAll(SHELL); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (k !== CACHE) return caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

// Stale-while-revalidate: answer instantly from cache so the page opens with no
// signal, and refresh the copy in the background so a redeploy is picked up on
// the next launch.
self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  if (new URL(req.url).origin !== self.location.origin) return;

  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then(function (cached) {
      var network = fetch(req).then(function (res) {
        if (res && res.ok && res.type === 'basic') {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copy); });
        }
        return res;
      }).catch(function () {
        return cached || caches.match(
          req.mode === 'navigate' && new URL(req.url).pathname.indexOf('/axle') === 0
            ? './axle/index.html' : './index.html');
      });
      return cached || network;
    })
  );
});
