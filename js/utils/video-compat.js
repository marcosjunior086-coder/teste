/**
 * video-compat.js — vídeo de banner/aviso que funciona no navegador da Xiaomi.
 *
 * O Mi Browser (e UC, Quark, QQ, Huawei, Heytap, Vivo) troca o <video> por um
 * player NATIVO fora da página: ignora border-radius/z-index/transform, mostra
 * controles próprios e fica POR CIMA de menus e painéis. Skill do projeto:
 * .claude/skills/compat-navegador-xiaomi.
 *
 * Nesses navegadores o <video> continua tocando (escondido, 2px), mas quem
 * aparece é um <canvas> comum que recebe os quadros — o canvas obedece CSS,
 * z-index e camadas normais. Nos demais navegadores só entram atributos
 * inofensivos; o vídeo fica como sempre foi.
 *
 * Uso: window.DmaiorVideoCompat.apply(raizDoDOM)  (depois de inserir o HTML)
 *
 * 2026-10-06: o canvas ficou vazio no Mi Browser real, então nesses navegadores
 * o vídeo vira uma IMAGEM (a capa do vídeo) — sem player, sem controles, sem
 * ficar por cima de menus. Capa = `#poster=<url>` no fim da URL do vídeo (o admin
 * grava ao subir) ou, nos vídeos antigos, assets/banners/<nome-do-arquivo>-capa.webp.
 * Sem capa nenhuma: um cartão neutro com o título.
 * Testes no PC: ?semvideo=1 (força a imagem) · ?canvasvideo=1 (canvas experimental).
 */
(function () {
  'use strict';

  // O modo canvas é EXPERIMENTAL e fica DESLIGADO por padrão: no Mi Browser real
  // (2026-10-02) o canvas ficou vazio e o banner sumiu — o vídeo vem do R2 sem
  // CORS e não dá pra conferir os pixels. Só liga com ?canvasvideo=1 na URL.
  // ?vcdebug=1 mostra um painel com o estado do vídeo (pra print de diagnóstico).
  // Navegadores que trocam o <video> pelo player nativo do sistema
  function sequestraVideo() {
    try {
      if (/[?&]semvideo=1\b/.test(location.search)) return true;
      return /XiaoMi|MiuiBrowser|MIUI|HyperOS|UCBrowser|Quark|MQQBrowser|HuaweiBrowser|HeyTapBrowser|VivoBrowser/i.test(navigator.userAgent || '');
    } catch (_) { return false; }
  }

  function capaDe(src) {
    var m = /#(?:.*&)?poster=([^&]+)/.exec(src || '');
    if (m) { try { return decodeURIComponent(m[1]); } catch (_) {} }
    var n = /\/([^\/?#]+)\.(?:mp4|webm)(?:[?#]|$)/i.exec(src || '');
    return n ? 'assets/banners/' + n[1] + '-capa.webp' : '';
  }

  function cartaoSvg(titulo) {
    var t = String(titulo || '').replace(/[<>&"']/g, '').slice(0, 60);
    var svg = "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1280 360'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='#1a1a2e'/><stop offset='1' stop-color='#0d0d1a'/></linearGradient></defs><rect width='1280' height='360' fill='url(#g)'/><rect y='0' width='1280' height='4' fill='#00d4d4'/><text x='60' y='200' fill='#e2e8f0' font-family='Arial,sans-serif' font-size='54' font-weight='700'>" + t + "</text></svg>";
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  // Troca o <video> por <img> com a mesma classe (o CSS do banner vale pra img)
  function virarImagem(v) {
    var img = document.createElement('img');
    if (v.className) img.className = v.className;
    var titulo = v.getAttribute('aria-label') || 'Banner';
    img.alt = titulo;
    img.width = v.getAttribute('width') || 1280;
    img.height = v.getAttribute('height') || 360;
    img.decoding = 'async';
    img.setAttribute('data-vc', 'img');
    var capa = capaDe(v.getAttribute('src') || v.currentSrc || '');
    img.onerror = function () { img.onerror = null; img.src = cartaoSvg(titulo); };
    img.src = capa || cartaoSvg(titulo);
    try { v.pause(); } catch (_) {}
    v.removeAttribute('autoplay');
    v.replaceWith(img);
    return img;
  }

  function precisaCanvas() {
    try { return /[?&]canvasvideo=1\b/.test(location.search); } catch (_) { return false; }
  }
  function debugLigado() {
    try { return /[?&]vcdebug=1\b/.test(location.search); } catch (_) { return false; }
  }

  function painelDebug(v, c) {
    var d = document.getElementById('vc-debug');
    if (!d) {
      d = document.createElement('pre');
      d.id = 'vc-debug';
      d.style.cssText = 'position:fixed;left:4px;bottom:4px;z-index:2147483647;margin:0;padding:6px;background:#000c;color:#0f0;font:11px/1.3 monospace;max-width:96vw;white-space:pre-wrap;pointer-events:none';
      document.body.appendChild(d);
    }
    setInterval(function () {
      d.textContent = 'canvas=' + (c ? 'sim' : 'nao') + ' paused=' + v.paused + ' t=' + v.currentTime.toFixed(2) +
        ' ready=' + v.readyState + ' vw=' + v.videoWidth + ' err=' + (v.error ? v.error.code : '-') +
        '\nUA=' + navigator.userAgent.slice(-70);
    }, 500);
  }

  // Atributos que reduzem o "sequestro" mesmo sem canvas. Nunca deixa `controls`.
  function endurecer(v) {
    v.removeAttribute('controls');
    v.setAttribute('playsinline', '');
    v.setAttribute('webkit-playsinline', '');
    v.setAttribute('x5-playsinline', '');
    v.setAttribute('x5-video-player-type', 'h5-page');
    v.setAttribute('x5-video-player-fullscreen', 'false');
    v.setAttribute('disablepictureinpicture', '');
    v.setAttribute('disableremoteplayback', '');
    v.setAttribute('controlslist', 'nodownload nofullscreen noremoteplayback noplaybackrate');
    v.disablePictureInPicture = true;
    v.disableRemotePlayback = true;
  }

  function virarCanvas(v) {
    var c = document.createElement('canvas');
    c.className = v.className;                 // pega o CSS do vídeo (por classe)
    c.setAttribute('role', 'img');
    c.setAttribute('aria-label', v.getAttribute('aria-label') || '');
    c.width = 320; c.height = 180;             // troca pro tamanho real em loadedmetadata
    c.style.display = 'block';
    c.style.objectFit = 'cover';
    c.style.background = 'var(--dm-bg-2, #0b1220)';
    c.setAttribute('data-vc', '1');
    var ctx = c.getContext('2d');
    var raf = 0;

    function desenhar() {
      if (!v.videoWidth || !v.videoHeight) return;
      if (c.width !== v.videoWidth || c.height !== v.videoHeight) { c.width = v.videoWidth; c.height = v.videoHeight; }
      try { ctx.drawImage(v, 0, 0, c.width, c.height); } catch (_) {}
    }
    function loop() {
      raf = 0;
      if (!c.isConnected) return;              // saiu da página: para de gastar bateria
      if (!v.paused && !v.ended) { desenhar(); raf = requestAnimationFrame(loop); }
    }
    function iniciar() { if (!raf) raf = requestAnimationFrame(loop); }

    v.addEventListener('play', iniciar);
    v.addEventListener('playing', iniciar);
    ['loadeddata', 'seeked', 'pause', 'ended'].forEach(function (ev) { v.addEventListener(ev, desenhar); });

    // O vídeo continua no DOM (o código do carrossel usa play/pause/currentTime/
    // onended nele), só some da tela: sem tamanho visível o navegador não o
    // sequestra.
    var s = v.style;
    s.setProperty('position', 'absolute', 'important');
    s.setProperty('top', '0', 'important');
    s.setProperty('left', '0', 'important');
    s.setProperty('width', '2px', 'important');
    s.setProperty('height', '2px', 'important');
    s.setProperty('opacity', '0', 'important');
    s.setProperty('pointer-events', 'none', 'important');
    s.setProperty('aspect-ratio', 'auto', 'important');
    v.insertAdjacentElement('afterend', c);
    if (!v.paused) iniciar();
    var p = v.play(); if (p && p.catch) p.catch(function () {});
    return c;
  }

  function apply(raiz) {
    var base = raiz && raiz.querySelectorAll ? raiz : document;
    var canvas = precisaCanvas();
    var semVideo = !canvas && sequestraVideo();
    var lista = base.querySelectorAll('video:not([data-vc-ok])');
    for (var i = 0; i < lista.length; i++) {
      var v = lista[i];
      v.setAttribute('data-vc-ok', '1');
      if (semVideo && !v.hasAttribute('data-vc-manter')) { virarImagem(v); continue; }
      endurecer(v);
      var c = canvas ? virarCanvas(v) : null;
      if (debugLigado() && i === 0) painelDebug(v, c);
    }
  }

  window.DmaiorVideoCompat = { apply: apply, precisaCanvas: precisaCanvas, sequestraVideo: sequestraVideo, capaDe: capaDe };
})();
