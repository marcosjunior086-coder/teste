const CACHE_VERSION = 'dmaior-pwa-20260902-push-1';
const IMG_CACHE = 'dmaior-imgs-v1';
const PUSH_CACHE = 'dmaior-push-v1';   // guarda a chave VAPID + subscription pendente

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

// ═══════════════════════════════════════════════════════════════════════════
// NOTIFICAÇÕES PUSH (Fase 1) — aditivo, não mexe no cache/scope acima.
//
// O corpo da mensagem chega do worker push.agencydmaior.com.br já pronto e
// GENÉRICO (sem valor/PIX/saldo): { title, body, url, icon, tag, eventId, data }.
// O detalhe de verdade fica só no painel autenticado.
// ═══════════════════════════════════════════════════════════════════════════

function _pushIcon() {
  try { return new URL('assets/icons/dmaior-192.png', self.registration.scope).href; }
  catch (_) { return undefined; }
}

self.addEventListener('push', (event) => {
  // parsing defensivo — nunca deixa uma exceção escapar do handler
  let d = {};
  try { d = event.data ? event.data.json() : {}; }
  catch (_) { try { d = { title: 'DMaior', body: (event.data && event.data.text()) || '' }; } catch (__) { d = {}; } }
  if (!d || typeof d !== 'object') d = {};

  const title = (typeof d.title === 'string' && d.title.trim()) ? d.title.slice(0, 120) : 'DMaior';
  const icon  = _pushIcon();
  const options = {
    body: typeof d.body === 'string' ? d.body.slice(0, 400) : '',
    tag: typeof d.tag === 'string' ? d.tag.slice(0, 60) : 'dmaior',
    renotify: true,
    icon: (typeof d.icon === 'string' && /^https:\/\//.test(d.icon)) ? d.icon : icon,
    badge: icon,
    data: { url: typeof d.url === 'string' ? d.url : '/painel/', eventId: d.eventId || null },
  };
  event.waitUntil(self.registration.showNotification(title, options).catch(() => {}));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const raw = (event.notification.data && event.notification.data.url) || '/painel/';
  // resolve contra o escopo do SW (funciona em / e em /teste/); SÓ mesma origem
  let dest;
  try {
    const u = new URL(String(raw).replace(/^\/+/, ''), self.registration.scope);
    dest = (u.origin === self.location.origin) ? u.href : self.registration.scope;
  } catch (_) { dest = self.registration.scope; }

  event.waitUntil((async () => {
    try {
      const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const c of wins) {
        if ('focus' in c) { try { await c.navigate(dest); } catch (_) {} return c.focus(); }
      }
      return self.clients.openWindow(dest);
    } catch (_) {}
  })());
});

// Navegador rotacionou o endpoint: re-inscreve com a MESMA chave VAPID (o
// js/push.js guardou os bytes em PUSH_CACHE) e deixa a nova subscription
// pendente — o registro autenticado no worker é refeito pelo js/push.js na
// próxima vez que o painel abrir (o SW não tem o token do streamer).
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil((async () => {
    try {
      const cache = await caches.open(PUSH_CACHE);
      const keyResp = await cache.match('vapid-key');
      if (!keyResp) return;
      const appKey = new Uint8Array(await keyResp.arrayBuffer());
      if (!appKey.length) return;
      const nova = await self.registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: appKey });
      await cache.put('pending-subscription', new Response(JSON.stringify(nova.toJSON()), { headers: { 'Content-Type': 'application/json' } }));
    } catch (_) {}
  })());
});
