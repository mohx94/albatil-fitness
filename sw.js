const CACHE='albatil-fitness-v3-smart-coach';
const ASSETS=['./','./index.html','./manifest.webmanifest','./icon.svg'];
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)))});
self.addEventListener('activate',e=>{e.waitUntil(Promise.all([caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))),self.clients.claim()]))});
self.addEventListener('fetch',e=>{const r=e.request;if(r.mode==='navigate'||r.destination==='document'){e.respondWith(fetch(r).then(x=>{caches.open(CACHE).then(c=>c.put(r,x.clone()));return x}).catch(()=>caches.match('./index.html')));return}e.respondWith(caches.match(r).then(x=>x||fetch(r).then(y=>{caches.open(CACHE).then(c=>c.put(r,y.clone()));return y}))) });
