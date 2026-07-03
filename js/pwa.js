(function () {
  if (!('serviceWorker' in navigator)) return;
  if (!window.isSecureContext && location.hostname !== 'localhost') return;

  window.addEventListener('load', function () {
    var baseEl = document.querySelector('base');
    var baseHref = baseEl && baseEl.href ? baseEl.href : new URL('./', location.href).href;
    var swUrl = new URL('sw.js', baseHref);
    var scopePath = new URL('.', baseHref).pathname;

    navigator.serviceWorker.register(swUrl.href, { scope: scopePath }).catch(function () {
      // Registro opcional: o site continua funcionando normalmente sem PWA.
    });
  });
})();
