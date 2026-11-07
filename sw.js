const V='noor-v2',SHELL=['./','index.html','styles.css','app.js','icon.svg','manifest.webmanifest'];
self.addEventListener('install',e=>e.waitUntil(caches.open(V).then(c=>c.addAll(SHELL))));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==V).map(x=>caches.delete(x))))));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;
 if(/\.mp3$/.test(e.request.url))return;
 e.respondWith(caches.open(V).then(async c=>{const hit=await c.match(e.request);
  const net=fetch(e.request).then(r=>{if(r.ok)c.put(e.request,r.clone());return r}).catch(()=>hit);
  return hit||net}))});
