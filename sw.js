// Service worker for Turmanator Shop Tools.
// Bump CACHE when redeploying so phones pick up the new version.
var CACHE = 'shop-tools-v6';
var SHELL = [
  './',
  './index.html',
  './fab/',
  './fab/index.html',
  './axle/',
  './axle/index.html',
  './cut/',
  './cut/index.html',
  './volts/',
  './volts/index.html',
  './convert/',
  './convert/index.html',
  './job/',
  './job/index.html',
  './job.js',
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
// Offline navigations land on the page the viewer actually asked for.
function navigationFallback(req) {
  if (req.mode !== 'navigate') return './index.html';
  var path = new URL(req.url).pathname;
  var dirs = ['fab', 'axle', 'cut', 'volts', 'convert', 'job'];
  for (var i = 0; i < dirs.length; i++) {
    if (path.indexOf('/' + dirs[i]) === 0) return './' + dirs[i] + '/index.html';
  }
  return './index.html';
}

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
          navigationFallback(req));
      });
      return cached || network;
    })
  );
});
