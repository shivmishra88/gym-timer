// Offline support: serve from cache immediately, refresh the cache in the background
const CACHE="gym-timer-v8";
const ASSETS=["./","index.html","manifest.json","icons/icon-192.png","icons/icon-512.png","icons/apple-touch-icon.png"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()))});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener("fetch",e=>{
 const req=e.request;if(req.method!=="GET"||new URL(req.url).origin!==location.origin)return;
 e.respondWith(caches.open(CACHE).then(async c=>{
  const hit=await c.match(req,{ignoreSearch:true})||(req.mode==="navigate"?await c.match("index.html"):null);
  const net=fetch(req).then(res=>{if(res.ok)c.put(req,res.clone());return res}).catch(()=>null);
  if(hit){e.waitUntil(net);return hit}
  return await net||Response.error();
 }));
});
