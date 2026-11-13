'use strict';
// Increase VERSION whenever any app file changes. Each version installs atomically.
const VERSION = '2026-11-13-sync-2';
const BASE = new URL('./', self.location.href);
const PREFIX = 'teacher-offline-' + encodeURIComponent(BASE.pathname) + '-';
const CACHE = PREFIX + VERSION;
const SHELL = ['index.html','style.css','app.js','merge.js','cloud-config.js','sync.js','offline.js','manifest.webmanifest','icon-192.png','icon-512.png'];
const urls = SHELL.map(file => new URL(file, BASE).href);
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(urls.map(url => new Request(url, {cache:'reload'})));
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) if(key.startsWith(PREFIX) && key!==CACHE) await caches.delete(key);
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const request=event.request, url=new URL(request.url);
  if(request.method!=='GET'||url.origin!==BASE.origin||!url.pathname.startsWith(BASE.pathname))return;
  const isHome=request.mode==='navigate' && [BASE.pathname,BASE.pathname+'index.html'].includes(url.pathname);
  const asset=urls.find(value=>new URL(value).pathname===url.pathname);
  if(!isHome&&!asset)return;
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE);
    const hit=await cache.match(isHome?new URL('index.html',BASE).href:asset);
    return hit || fetch(request);
  })());
});
self.addEventListener('message', event => {
  if(event.data?.type==='ACTIVATE_UPDATE')event.waitUntil(self.skipWaiting());
  if(event.data?.type==='CHECK_READY')event.waitUntil((async()=>{
    const cache=await caches.open(CACHE);
    const ready=(await Promise.all(urls.map(url=>cache.match(url)))).every(Boolean);
    event.ports[0]?.postMessage({ready,version:VERSION});
  })());
});
