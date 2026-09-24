const CACHE_VERSION = 'dmaior-pwa-20260924-sem-fetch-1';
const PUSH_CACHE = 'dmaior-push-v1';   // guarda a chave VAPID + subscription pendente

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          // 'dmaior-imgs-*' = cache antigo de fotos do weserv (removido, ver abaixo)
          .filter((key) => (key.startsWith('dmaior-pwa-') && key !== CACHE_VERSION) || key.startsWith('dmaior-imgs-'))
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

// SEM handler de 'fetch' de propósito. Antes o SW interceptava as fotos do
// images.weserv.nl (e repassava todo o resto com fetch()), mas:
//  1) o sw.js recebe a mesma CSP do site (Transform Rule da Cloudflare), e
//     fetch() dentro do SW é checado contra connect-src — que não lista
//     weserv/flaticon. O Safari do iPhone aplica isso à risca: toda foto de
//     perfil (ranking, PK, lives) virava ícone "?" quebrado.
//  2) <img> de outro domínio volta como resposta opaca (ok === false), então
//     o cache "cache-first" nunca chegou a salvar nada.
// O cache HTTP do navegador já guarda as fotos do weserv (max-age de 1 ano).
// Não recolocar um 'fetch' que chame respondWith() pra recurso de outro
// domínio sem liberar o host também no connect-src da CSP.

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
