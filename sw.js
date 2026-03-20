const CACHE = "linkpad-v4";
const ASSETS = [
  "/linkpad/",
  "/linkpad/index.html",
  "/linkpad/manifest.json",
  "/linkpad/icon-192.png",
  "/linkpad/icon-512.png",
  "/linkpad/favicon.ico",
  "/linkpad/favicon-32.png",
  "/linkpad/favicon-16.png"
];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  // Only intercept mobile share-sheet requests (?url=), NOT bookmarklet (?bm-url=)
  if(url.pathname === "/linkpad/" && url.searchParams.has("url") && !url.searchParams.has("bm-url")) {
    const sharedUrl = url.searchParams.get("url") || "";
    const sharedTitle = url.searchParams.get("title") || "";
    e.respondWith(
      caches.open("linkpad-share").then(cache => {
        return cache.put("pending", new Response(JSON.stringify({
          url: sharedUrl, title: sharedTitle, ts: Date.now()
        }))).then(() => {
          return self.clients.matchAll({type:"window",includeUncontrolled:true}).then(clients => {
            clients.forEach(c => c.postMessage({type:"SHARE_TARGET",url:sharedUrl,title:sharedTitle}));
            return Response.redirect("/linkpad/", 303);
          });
        });
      })
    );
    return;
  }
  e.respondWith(
    fetch(e.request)
      .then(res => { const clone=res.clone(); caches.open(CACHE).then(c=>c.put(e.request,clone)); return res; })
      .catch(() => caches.match(e.request))
  );
});
