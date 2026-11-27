// Kro service worker: offline play. App shell is precached (bypassing the HTTP cache). The game page itself is network-first
// (3.5 s timeout, then the cached copy) so a new build shows up on the very next launch when online; everything else is
// cache-first and refreshed in the background (stale-while-revalidate). Bump VERSION with each release.
const VERSION = 'kro-v7t-1';
const CORE = [
  './', './index.html', './manifest.webmanifest',
  './icons/icon-192.png', './icons/icon-512.png', './icons/maskable-512.png', './icons/apple-touch-icon.png',
  './vendor/three/build/three.module.min.js',
  './vendor/three/examples/jsm/utils/BufferGeometryUtils.js',
  './vendor/three/examples/jsm/loaders/GLTFLoader.js', './vendor/three/examples/jsm/loaders/DRACOLoader.js',
  './vendor/three/examples/jsm/libs/draco/gltf/draco_wasm_wrapper.js', './vendor/three/examples/jsm/libs/draco/gltf/draco_decoder.wasm',
  './models/kro-raven-draco.glb',
  './vendor/three/examples/jsm/postprocessing/EffectComposer.js', './vendor/three/examples/jsm/postprocessing/RenderPass.js',
  './vendor/three/examples/jsm/postprocessing/ShaderPass.js', './vendor/three/examples/jsm/postprocessing/UnrealBloomPass.js',
  './vendor/three/examples/jsm/postprocessing/OutputPass.js', './vendor/three/examples/jsm/postprocessing/MaskPass.js',
  './vendor/three/examples/jsm/postprocessing/Pass.js', './vendor/three/examples/jsm/shaders/CopyShader.js',
  './vendor/three/examples/jsm/shaders/LuminosityHighPassShader.js', './vendor/three/examples/jsm/shaders/OutputShader.js',
];
self.addEventListener('install', e => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(CORE.map(u => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const r = e.request; if (r.method !== 'GET') return; const u = new URL(r.url); if (u.origin !== location.origin) return;
  e.respondWith(caches.open(VERSION).then(async c => {
    const app = r.mode === 'navigate' && /\/(index\.html)?$/.test(u.pathname); // only the game page maps to the cached shell
    const key = app ? './index.html' : r;
    const hit = await c.match(key, { ignoreSearch: app });
    if (r.mode === 'navigate') { // v7q: network-first for the game page
      const live = fetch(r.url, { cache: 'no-cache', credentials: 'same-origin' }).then(res => { if (res && res.ok && res.type === 'basic') c.put(key, res.clone()); return res; }).catch(() => null);
      const res = await Promise.race([live, new Promise(ok => setTimeout(() => ok(undefined), 3500))]);
      if (res) return res; if (hit) { e.waitUntil(live); return hit; } return (await live) || new Response('Offline', { status: 503, statusText: 'Offline' });
    }
    const net = fetch(r).then(res => { if (res && res.ok && res.type === 'basic') c.put(key, res.clone()); return res; }).catch(() => null);
    if (hit) { e.waitUntil(net); return hit; }
    return (await net) || new Response('Offline', { status: 503, statusText: 'Offline' });
  }));
});
