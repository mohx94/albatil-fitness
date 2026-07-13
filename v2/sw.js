const CACHE='albatil-fitness-v2-app';
const ASSETS=[
  './','./index.html','./manifest.webmanifest','./icon.svg',
  './App.jsx',
  './utils/data.js','./utils/helpers.js',
  './services/storage.js','./services/firebase.js','./services/ai.js',
  './hooks/useAppState.js',
  './components/Charts.jsx','./components/UI.jsx',
  './pages/Home.jsx','./pages/Workouts.jsx','./pages/Library.jsx','./pages/ScheduleEditor.jsx',
  './pages/Session.jsx','./pages/Progress.jsx','./pages/Nutrition.jsx','./pages/Settings.jsx'
];
self.addEventListener('install',e=>{
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));
});
self.addEventListener('activate',e=>{
  e.waitUntil(Promise.all([
    caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))),
    self.clients.claim()
  ]));
});
self.addEventListener('fetch',e=>{
  const req=e.request;
  if(req.mode==='navigate'||req.destination==='document'){
    e.respondWith(
      fetch(req).then(res=>{ caches.open(CACHE).then(c=>c.put(req,res.clone())); return res; })
        .catch(()=>caches.match(req).then(r=>r||caches.match('./index.html')))
    );
    return;
  }
  e.respondWith(caches.match(req).then(r=>r||fetch(req).then(res=>{
    caches.open(CACHE).then(c=>c.put(req,res.clone())); return res;
  }).catch(()=>r)));
});
