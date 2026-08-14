// 食帖 Service Worker — 网络优先策略
// 页面(HTML)：网络优先，失败(离线)回退缓存 → 部署新内容无需改版本号
// 静态资源(图标/manifest)：缓存优先 + 后台刷新
const CACHE='recipebox-v1';
const ASSETS=['./','./index.html','./manifest.json','./icon-192.png','./icon-512.png','./apple-touch-icon.png'];

self.addEventListener('install',e=>{
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));
});

self.addEventListener('fetch',e=>{
  const req=e.request;
  if(req.method!=='GET')return;
  const url=new URL(req.url);
  if(url.origin!==location.origin)return; // 跨域(字体等)直接走网络

  // 打开页面：网络优先，成功则回写缓存；失败(离线)回退缓存
  if(req.mode==='navigate'){
    e.respondWith(
      fetch(req).then(res=>{
        const copy=res.clone();
        caches.open(CACHE).then(c=>c.put(req,copy));
        return res;
      }).catch(()=>caches.match(req).then(r=>r||caches.match('./')))
    );
    return;
  }

  // 静态资源：缓存优先，同时后台拉最新(s-w-r)
  e.respondWith(
    caches.match(req).then(cached=>{
      const fresh=fetch(req).then(res=>{
        if(res&&res.ok){const copy=res.clone();caches.open(CACHE).then(c=>c.put(req,copy));}
        return res;
      }).catch(()=>cached);
      return cached||fresh;
    })
  );
});

self.addEventListener('activate',e=>{
  e.waitUntil(Promise.all([
    clients.claim(),
    caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k))))
  ]));
});
