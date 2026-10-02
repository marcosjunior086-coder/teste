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
 * Teste no PC: adicionar ?canvasvideo=1 na URL.
 */
(function () {
  'use strict';

  var UA_SEQUESTRA = /XiaoMi|MiuiBrowser|MIUI|HyperOS|UCBrowser|UCWEB|MQQBrowser|QQBrowser|Quark|HuaweiBrowser|HeyTapBrowser|VivoBrowser/i;

  function precisaCanvas() {
    try {
      if (/[?&]canvasvideo=1\b/.test(location.search)) return true;
      return UA_SEQUESTRA.test(navigator.userAgent || '');
    } catch (_) { return false; }
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
  }

  function apply(raiz) {
    var base = raiz && raiz.querySelectorAll ? raiz : document;
    var canvas = precisaCanvas();
    var lista = base.querySelectorAll('video:not([data-vc-ok])');
    for (var i = 0; i < lista.length; i++) {
      var v = lista[i];
      v.setAttribute('data-vc-ok', '1');
      endurecer(v);
      if (canvas) virarCanvas(v);
    }
  }

  window.DmaiorVideoCompat = { apply: apply, precisaCanvas: precisaCanvas };
})();
