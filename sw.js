const CACHE_VERSION = 'dmaior-pwa-20260809-1';
const IMG_CACHE = 'dmaior-imgs-v1';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith('dmaior-pwa-') && key !== CACHE_VERSION)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

// Fotos de perfil e banners (votação, PK) sempre passam pelo proxy
// images.weserv.nl (ver _proxyFoto/_imgUrl nos componentes). Cache-first só
// pra esse host: baixa uma vez, fica salvo no aparelho, só busca de novo se
// a URL mudar (o link do Drive some da URL do proxy assim que o admin troca
// o banner_url — cache antigo nunca é servido pra um link novo). Se o admin
// só trocar o CONTEÚDO do mesmo arquivo do Drive sem mudar o link, o cache
// local não percebe sozinho — nesse caso preciso trocar o link mesmo (mesma
// lógica do ?v= manual usado pros arquivos JS/CSS).
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.hostname === 'images.weserv.nl') {
    event.respondWith(
      caches.open(IMG_CACHE).then(async (cache) => {
        const cached = await cache.match(event.request);
        if (cached) return cached;
        const resposta = await fetch(event.request);
        if (resposta.ok) cache.put(event.request, resposta.clone());
        return resposta;
      })
    );
    return;
  }
  event.respondWith(fetch(event.request));
});
