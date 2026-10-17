/**
 * video-abertura.js — janela com um vídeo (9:16, até 1min30) de uma streamer,
 * promoção ou anúncio ao abrir a home. Cadastro e liga/desliga no admin (aba "Vídeos de abertura").
 *
 * - Aparece depois que a página termina de carregar (não pesa no carregamento).
 * - Link do anúncio (opcional, por vídeo): cartão flutuante tipo Instagram no pé do vídeo.
 * - "Pular" libera depois de `pular_apos_seg` (por vídeo: 0, 3, 5 ou 10; padrão 3);
 *   fecha sozinha quando o vídeo acaba.
 * - Tenta começar COM som; se o navegador barrar (regra do Chrome/Safari antes
 *   do primeiro toque), começa mudo e o botão de som pisca.
 * - Frequência por visitante no localStorage: no máximo 1 vídeo a cada
 *   `frequencia_horas` (admin), sorteando entre os que ele ainda não viu.
 * - Se a streamer do vídeo estiver ao vivo, card da live no canto (lista
 *   pública de lives, casada pelo UID); tocar leva pra live.
 * - Botões e textos ficam FORA do vídeo: o navegador da Xiaomi troca o <video>
 *   por um player nativo que cobre o que estiver por cima. Lá, o card da live
 *   vira um botão "AO VIVO" na barra de cima (skill compat-navegador-xiaomi).
 *
 * Teste: ?videoabertura=1 na URL ignora a frequência (mostra sempre).
 */
(function () {
  'use strict';

  var LS = 'dm_video_abertura';
  var PULAR_PADRAO = 3;      // segundos até liberar o "Pular" quando o vídeo não define
  var FREQ_MIN_MIN = 1;      // menor frequência que o admin aceita (1 minuto) — antes disso nem consulta a API
  var forcar = /[?&]videoabertura=1\b/.test(location.search);

  function ler() {
    try { return JSON.parse(localStorage.getItem(LS) || '{}') || {}; } catch (_) { return null; }
  }
  function gravar(o) {
    try { localStorage.setItem(LS, JSON.stringify(o)); return true; } catch (_) { return false; }
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function urlOk(u) { return /^https:\/\//.test(String(u || '')) ? u : ''; }

  // Sorteia um vídeo que o visitante ainda não viu; viu todos = recomeça (sem repetir o último)
  function escolher(videos, st) {
    var vistos = Array.isArray(st.vistos) ? st.vistos : [];
    var cand = videos.filter(function (v) { return vistos.indexOf(v.id) < 0; });
    if (!cand.length) {
      vistos = [];
      cand = videos.filter(function (v) { return v.id !== st.ultimo; });
      if (!cand.length) cand = videos;
    }
    var v = cand[Math.floor(Math.random() * cand.length)];
    return { video: v, vistos: vistos.concat(v.id).slice(-50) };
  }

  async function iniciar() {
    var st = ler();
    if (!st) return; // armazenamento bloqueado: não mostra (senão apareceria em toda visita)
    var agora = Date.now();
    if (!forcar && st.t && agora - st.t < FREQ_MIN_MIN * 60e3) return;
    if (!window.DmaiorAPI || !window.DmaiorAPI.rank || !window.DmaiorAPI.rank.getVideosAbertura) return;

    var d;
    try { d = await window.DmaiorAPI.rank.getVideosAbertura(); } catch (_) { return; }
    var lista = (d && d.ativo && Array.isArray(d.videos)) ? d.videos.filter(function (v) { return urlOk(v.video_url); }) : [];
    if (!lista.length) return;
    var freqMin = Number(d.frequencia_min) || (Number(d.frequencia_horas) || 24) * 60;
    var freq = Math.max(1, freqMin) * 60e3;
    if (!forcar && st.t && agora - st.t < freq) return;

    // Relê antes de abrir: outra aba do site pode ter mostrado um vídeo enquanto esta consultava a API
    var st2 = ler();
    if (!st2 || (!forcar && st2.t && Date.now() - st2.t < freq)) return;
    var e = escolher(lista, st2);
    if (!gravar({ t: Date.now(), ultimo: e.video.id, vistos: e.vistos })) return;
    abrir(e.video);
  }

  var ICO = {
    som: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.4 5.6a9 9 0 0 1 0 12.8"/></svg>',
    mudo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H3v6h3l5 4z"/><path d="m22 9-6 6"/><path d="m16 9 6 6"/></svg>',
    perfil: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>',
    prox: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 6 8 6-8 6z"/><path d="M18 6v12"/></svg>',
    sacola: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>',
    tag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"/><circle cx="7.5" cy="7.5" r=".5" fill="currentColor"/></svg>',
    agenda: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/><path d="m9 16 2 2 4-4"/></svg>',
    voto: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 12 2 2 4-4"/><path d="M5 7c0-1.1.9-2 2-2h10a2 2 0 0 1 2 2v12H5z"/><path d="M22 19H2"/></svg>',
    trofeu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>',
    link: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>',
  };

  // Link sobre o vídeo (cartão flutuante, igual aos anúncios do Instagram). O admin escolhe o tipo;
  // o tipo define o texto do botão, o ícone e a linha de baixo padrão.
  var CTA = {
    oferta:    { botao: 'Ver oferta',    sub: 'Toque para ver',     ico: 'sacola' },
    promocao:  { botao: 'Ver promoção',  sub: 'Toque para ver',     ico: 'tag' },
    inscricao: { botao: 'Inscrever-se',  sub: 'Inscrições abertas', ico: 'agenda' },
    votacao:   { botao: 'Votar',         sub: 'Vote agora',         ico: 'voto' },
    premio:    { botao: 'Ver prêmio',    sub: 'Toque para ver',     ico: 'trofeu' },
    kwai:      { botao: 'Abrir no Kwai', sub: 'Abre no Kwai',       ico: 'link' },
    link:      { botao: 'Acessar link',  sub: 'Toque para abrir',   ico: 'link' }
  };
  // Cor do botão e do ícone: [sólida, degradê]. Igual ao _VA_CORES do admin (prévia).
  var CORES = {
    azul:     ['#1f6feb','linear-gradient(135deg,#3b82f6 0%,#00e5e5 100%)'],
    verde:    ['#16a34a','linear-gradient(135deg,#059669 0%,#4ade80 100%)'],
    vermelho: ['#dc2626','linear-gradient(135deg,#dc2626 0%,#fb7185 100%)'],
    rosa:     ['#db2777','linear-gradient(135deg,#db2777 0%,#f472b6 100%)'],
    laranja:  ['#ea580c','linear-gradient(135deg,#ea580c 0%,#fbbf24 100%)']
  };

  // Paleta fixa (escura) de propósito: a janela fica sobre um fundo escurecido
  // em qualquer tema do site; só o destaque segue o ciano da marca.
  var CSS = '\
:host{all:initial}\
*{box-sizing:border-box}\
.bg{position:fixed;inset:0;z-index:100000;background:rgba(2,4,10,.8);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:16px;opacity:0;transition:opacity .25s ease;font-family:"Exo 2",system-ui,sans-serif;color:#e2e8f0}\
.bg.on{opacity:1}\
.vi{width:min(400px,100%);max-height:100%;display:flex;flex-direction:column;gap:10px;outline:none;transform:translateY(8px) scale(.98);transition:transform .3s cubic-bezier(.2,.8,.2,1)}\
.bg.on .vi{transform:none}\
.top{display:flex;align-items:center;gap:10px;min-height:40px}\
.quem{flex:1;min-width:0;display:flex;align-items:center;gap:8px}\
.av{width:36px;height:36px;border-radius:50%;object-fit:cover;flex:none;border:2px solid #00d4d4;background:#0b1220}\
.txt{min-width:0;display:flex;flex-direction:column;line-height:1.15}\
.nome{font-weight:700;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\
.sub{font-weight:600;font-size:11px;color:#7a9ab4}\
.pill{display:inline-flex;align-items:center;gap:6px;text-decoration:none;border-radius:999px;padding:8px 14px;font:700 12.5px "Exo 2",system-ui,sans-serif;white-space:nowrap;transition:transform .15s ease;-webkit-tap-highlight-color:transparent}\
.pill:active{transform:scale(.96)}\
.pill svg{width:15px;height:15px}\
.perfil{color:#06121a;background:#00d4d4}\
.aovivo{color:#fff;background:#e5484d}\
.dot{width:6px;height:6px;border-radius:50%;background:#fff;animation:pisca 1.2s ease-in-out infinite}\
.video{position:relative;aspect-ratio:9/16;max-height:calc(100vh - 150px);max-height:calc(100dvh - 150px);margin:0 auto;width:100%;border-radius:16px;overflow:hidden;background:#000;border:1px solid rgba(0,212,212,.15)}\
.video>video{width:100%;height:100%;object-fit:cover;display:block}\
.mini{position:absolute;top:10px;right:10px;width:31%;aspect-ratio:9/16;border-radius:12px;overflow:hidden;background:#1a1a2e center/cover no-repeat;border:2px solid #e5484d;box-shadow:0 8px 24px rgba(0,0,0,.5);text-decoration:none;color:#fff;display:block;opacity:0;transform:translateY(-6px) scale(.96);transition:opacity .35s ease,transform .35s cubic-bezier(.2,.8,.2,1);-webkit-tap-highlight-color:transparent}\
.mini.on{opacity:1;transform:none}\
.mini video{width:100%;height:100%;object-fit:cover;display:block;opacity:0;transition:opacity .3s ease}\
.mini.tocando video{opacity:1}\
.tag{position:absolute;top:6px;left:6px;display:flex;align-items:center;gap:4px;background:#e5484d;border-radius:5px;padding:2px 6px;font-weight:700;font-size:9.5px;letter-spacing:.06em}\
.tag i{width:5px;height:5px;border-radius:50%;background:#fff;animation:pisca 1.2s ease-in-out infinite}\
.pe{position:absolute;left:0;right:0;bottom:0;padding:16px 6px 6px;background:linear-gradient(transparent,rgba(0,0,0,.8));font-weight:700;font-size:10.5px;text-align:center}\
.pe span{display:block;font-weight:600;font-size:9.5px;color:#cfe;opacity:.85}\
@keyframes pisca{50%{opacity:.3}}\
.cta{position:absolute;left:10px;right:10px;bottom:10px;display:flex;align-items:center;gap:9px;background:rgba(255,255,255,.97);color:#0b1220;border-radius:14px;padding:8px 8px 8px 10px;text-decoration:none;opacity:0;transform:translateY(26px);transition:opacity .35s ease,transform .45s cubic-bezier(.2,.8,.2,1);-webkit-tap-highlight-color:transparent}\
.cta.on{opacity:1;transform:none}\
.cta.fora{position:static;box-shadow:0 0 0 1px rgba(0,212,212,.25)}\
.cta:active{transform:scale(.98)}\
.cta .ci{width:36px;height:36px;border-radius:10px;background:#00d4d4;color:#06121a;display:flex;align-items:center;justify-content:center;flex:none}\
.cta .ci svg{width:19px;height:19px}\
.cta .ct{flex:1;min-width:0;display:flex;flex-direction:column;line-height:1.25}\
.cta .ct b{font-weight:700;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\
.cta .ct span{font-weight:600;font-size:11.5px;color:#4a5a73;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\
.cta .go{background:#1f6feb;color:#fff;border-radius:999px;padding:9px 13px;font:700 12.5px "Exo 2",system-ui,sans-serif;white-space:nowrap}\
.cta:focus-visible{outline:2px solid #00d4d4;outline-offset:2px}\
.vi.tem-cta .video{max-height:calc(100vh - 220px);max-height:calc(100dvh - 220px)}\
.bot{display:flex;align-items:center;gap:10px}\
.prog{flex:1;height:4px;border-radius:4px;background:rgba(255,255,255,.12);overflow:hidden}\
.prog i{display:block;height:100%;width:0;background:linear-gradient(90deg,#3b82f6,#00d4d4)}\
.tempo{font-weight:600;font-size:12px;color:#7a9ab4;min-width:34px;text-align:right;font-variant-numeric:tabular-nums}\
.btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;height:40px;border-radius:999px;border:1px solid rgba(0,212,212,.18);background:rgba(255,255,255,.06);color:#e2e8f0;font:600 13px "Exo 2",system-ui,sans-serif;padding:0 14px;cursor:pointer;transition:transform .15s ease;-webkit-tap-highlight-color:transparent}\
.btn:active{transform:scale(.96)}\
.btn svg{width:17px;height:17px}\
.btn:focus-visible,.pill:focus-visible,.mini:focus-visible{outline:2px solid #00d4d4;outline-offset:2px}\
.som{width:40px;padding:0}\
.som.chama{border-color:#00d4d4;color:#00d4d4;animation:pulsa 1.6s ease-in-out infinite}\
@keyframes pulsa{50%{box-shadow:0 0 0 6px rgba(0,212,212,.14)}}\
.pular{min-width:112px}\
.pular[disabled]{color:#7a9ab4;cursor:default}\
.pular:not([disabled]){border-color:rgba(255,255,255,.35)}\
@media (max-width:480px){.bg{padding:12px}.video{max-height:calc(100dvh - 130px)}}\
@media (prefers-reduced-motion:reduce){.bg,.vi,.mini,.mini video,.cta{transition:none}.som.chama,.dot,.tag i{animation:none}}';

  function abrir(v) {
    var pularEm = v.pular_apos_seg == null ? NaN : Number(v.pular_apos_seg);
    pularEm = (pularEm >= 0 && pularEm <= 30) ? pularEm : PULAR_PADRAO;
    var xiaomi = !!(window.DmaiorVideoCompat && window.DmaiorVideoCompat.sequestraVideo && window.DmaiorVideoCompat.sequestraVideo());
    var host = document.createElement('dmaior-video-abertura');
    var root = host.attachShadow ? host.attachShadow({ mode: 'open' }) : host;
    var foto = urlOk(v.foto) || urlOk(v.foto_raw);
    var perfil = urlOk(v.perfil_url);
    root.innerHTML = '<style>' + CSS + '</style>' +
      '<div class="bg"><div class="vi" role="dialog" aria-modal="true" aria-label="Vídeo de ' + esc(v.nome) + '" tabindex="-1">' +
        '<div class="top">' +
          '<div class="quem">' + (foto ? '<img class="av" alt="" src="' + esc(foto) + '">' : '') +
            '<div class="txt"><span class="nome">' + esc(v.nome) + '</span><span class="sub">Streamer DMaior</span></div></div>' +
          '<span class="slot-live"></span>' +
          (perfil ? '<a class="pill perfil" href="' + esc(perfil) + '" target="_blank" rel="noopener noreferrer">' + ICO.perfil + ' Ver perfil</a>' : '') +
        '</div>' +
        '<div class="video"><video playsinline webkit-playsinline x5-playsinline x5-video-player-type="h5-page" x5-video-player-fullscreen="false" disablepictureinpicture disableremoteplayback controlslist="nodownload nofullscreen noremoteplayback noplaybackrate" preload="auto"' +
          (urlOk(v.poster_url) ? ' poster="' + esc(v.poster_url) + '"' : '') + ' src="' + esc(v.video_url) + '"></video></div>' +
        '<div class="bot"><button type="button" class="btn som"></button><div class="prog"><i></i></div><span class="tempo"></span>' +
          '<button type="button" class="btn pular" disabled></button></div>' +
      '</div></div>';
    document.body.appendChild(host);

    var $ = function (s) { return root.querySelector(s); };
    var bg = $('.bg'), caixa = $('.vi'), vid = $('.video>video'), som = $('.som'), pular = $('.pular'),
        barra = $('.prog i'), tempo = $('.tempo'), av = $('.av');
    var fechado = false, liberado = false, t0 = Date.now(), timer = 0, limpaLive = null, focoAntes = document.activeElement;
    var overflowAntes = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    var mostrarVideos = xiaomi ? esconderVideosDaPagina() : null;

    if (av && v.foto_raw && av.src !== v.foto_raw) av.addEventListener('error', function () { av.src = v.foto_raw; }, { once: true });

    function pintaSom() {
      som.innerHTML = vid.muted ? ICO.mudo : ICO.som;
      som.setAttribute('aria-label', vid.muted ? 'Ativar som' : 'Desativar som');
    }
    function liberar() {
      if (liberado) return;
      liberado = true;
      pular.disabled = false;
      pular.innerHTML = 'Pular ' + ICO.prox;
    }
    function relogio() {
      var falta = Math.ceil(pularEm - (Date.now() - t0) / 1000);
      if (falta > 0) pular.textContent = 'Pular em ' + falta; else liberar();
    }
    function fechar() {
      if (fechado) return;
      fechado = true;
      clearInterval(timer);
      document.removeEventListener('keydown', tecla);
      document.removeEventListener('visibilitychange', visivel);
      try { vid.pause(); } catch (_) {}
      if (limpaLive) { try { limpaLive(); } catch (_) {} }
      if (mostrarVideos) mostrarVideos();
      document.documentElement.style.overflow = overflowAntes;
      bg.classList.remove('on');
      setTimeout(function () {
        try { vid.removeAttribute('src'); vid.load(); } catch (_) {}
        host.remove();
        if (focoAntes && focoAntes.focus) { try { focoAntes.focus(); } catch (_) {} }
      }, 260);
    }
    function tecla(e) { if (e.key === 'Escape' && liberado) fechar(); }
    function visivel() {
      if (document.hidden) { try { vid.pause(); } catch (_) {} }
      else if (!fechado && vid.paused && !vid.ended) vid.play().catch(function () {});
    }

    som.addEventListener('click', function () {
      vid.muted = !vid.muted;
      som.classList.remove('chama');
      if (vid.paused) vid.play().catch(function () {});
      pintaSom();
    });
    pular.addEventListener('click', function () { if (liberado) fechar(); });
    vid.addEventListener('ended', fechar);
    vid.addEventListener('error', fechar);        // vídeo não carregou: não deixa a janela vazia na tela
    vid.addEventListener('timeupdate', function () {
      var dur = vid.duration, t = vid.currentTime;
      if (!(dur > 0) || !isFinite(dur)) return;
      barra.style.width = Math.min(100, t / dur * 100) + '%';
      var r = Math.max(0, Math.ceil(dur - t));
      tempo.textContent = Math.floor(r / 60) + ':' + String(r % 60).padStart(2, '0');
    });
    document.addEventListener('keydown', tecla);
    document.addEventListener('visibilitychange', visivel);

    if (pularEm > 0) pular.textContent = 'Pular em ' + pularEm; else liberar();
    timer = setInterval(relogio, 250);

    // Começa COM som; se o navegador barrar, começa mudo e o botão de som pisca
    vid.muted = false;
    pintaSom();
    var p = vid.play();
    if (p && p.catch) p.catch(function () {
      if (fechado) return;
      vid.muted = true;
      pintaSom();
      som.classList.add('chama');
      vid.play().catch(function () { liberar(); }); // nem mudo (ex.: economia de bateria): libera o Pular
    });

    requestAnimationFrame(function () { bg.classList.add('on'); try { caixa.focus({ preventScroll: true }); } catch (_) {} });

    montarCta(root, v, xiaomi, vid, fechar);

    if (v.mostrar_live !== false && v.kwai_uid) {
      acharLive(v.kwai_uid).then(function (live) {
        if (!live || fechado) return;
        limpaLive = montarLive(root, v, live, xiaomi, fechar);
      });
    }
  }

  // Cartão com o link do anúncio: flutua no pé do vídeo e aparece depois de `aparece_seg` de reprodução.
  // Xiaomi: o player nativo cobre tudo que está sobre o vídeo, então o cartão fica logo abaixo dele.
  function montarCta(root, v, xiaomi, vid, fechar) {
    var c = v.cta;
    if (!c || !CTA[c.tipo] || !urlOk(c.url) || !c.titulo) return;
    var t = CTA[c.tipo];
    var a = document.createElement('a');
    a.className = 'cta' + (xiaomi ? ' fora' : '');
    a.href = c.url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.setAttribute('aria-label', t.botao + ': ' + c.titulo);
    a.innerHTML = '<span class="ci">' + ICO[t.ico] + '</span>' +
      '<span class="ct"><b>' + esc(c.titulo) + '</b><span>' + esc(c.subtitulo || t.sub) + '</span></span>' +
      '<span class="go">' + esc(t.botao) + '</span>';
    var cor = CORES[c.cor] || CORES.azul, fundo = cor[c.estilo === 'gradiente' ? 1 : 0];
    a.querySelector('.go').style.background = fundo;
    var ci = a.querySelector('.ci');
    ci.style.background = fundo;
    ci.style.color = '#fff';
    a.addEventListener('click', function () { setTimeout(fechar, 300); });
    if (xiaomi) {
      var bot = root.querySelector('.bot');
      root.querySelector('.vi').classList.add('tem-cta');
      bot.parentNode.insertBefore(a, bot);
    } else {
      root.querySelector('.video').appendChild(a);
    }
    var quando = Number(c.aparece_seg);
    if (!(quando >= 0)) quando = 3;
    var mostrou = false;
    function checa() {
      if (mostrou) return;
      if (quando > 0 && !(vid.currentTime >= quando)) return;
      mostrou = true;
      requestAnimationFrame(function () { a.classList.add('on'); });
    }
    vid.addEventListener('timeupdate', checa);
    checa();
  }

  // Xiaomi: os outros vídeos da home (live em destaque, bolinhas do "ao vivo") viram
  // player nativo POR CIMA de tudo, inclusive desta janela — esconde enquanto ela está
  // aberta e devolve como estavam ao fechar. Devolve a função que restaura.
  // Repete a varredura enquanto a janela está aberta: o widget pode criar vídeo novo nesse meio-tempo.
  function esconderVideosDaPagina() {
    var guardados = new Map();
    function varrer() {
      var raizes = [document];
      ['dmaior-home-webpro', 'kwai-live-widget', 'dmaior-services-menu'].forEach(function (t) {
        var h = document.querySelector(t);
        if (h && h.shadowRoot) raizes.push(h.shadowRoot);
      });
      raizes.forEach(function (r) {
        var vs = r.querySelectorAll('video');
        for (var i = 0; i < vs.length; i++) {
          if (!guardados.has(vs[i])) guardados.set(vs[i], vs[i].style.visibility);
          vs[i].style.visibility = 'hidden';
        }
      });
    }
    varrer();
    var t = setInterval(varrer, 600);
    return function () {
      clearInterval(t);
      guardados.forEach(function (vis, v) { v.style.visibility = vis; });
    };
  }

  // Live da streamer agora (lista pública do Worker live, casada pelo UID)
  async function acharLive(uid) {
    try {
      var lista = await window.DmaiorAPI.live.getLivesHome();
      if (!Array.isArray(lista)) return null;
      for (var i = 0; i < lista.length; i++) {
        if (String(lista[i].userId) === String(uid) && urlOk(lista[i].link)) return lista[i];
      }
    } catch (_) {}
    return null;
  }

  function montarLive(root, v, live, xiaomi, fechar) {
    var vistos = typeof live.espectadores === 'number' ? live.espectadores.toLocaleString('pt-BR') + ' assistindo' : 'agora';
    var href = esc(live.link);

    // Xiaomi: nada por cima do vídeo (o player nativo cobre) — vira botão na barra de cima
    if (xiaomi) {
      var slot = root.querySelector('.slot-live');
      slot.outerHTML = '<a class="pill aovivo" href="' + href + '" target="_blank" rel="noopener noreferrer"><span class="dot"></span> AO VIVO</a>';
      root.querySelector('.aovivo').addEventListener('click', function () { setTimeout(fechar, 300); });
      return null;
    }

    var box = root.querySelector('.video');
    var a = document.createElement('a');
    a.className = 'mini';
    a.href = live.link;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.setAttribute('aria-label', 'Assistir a live de ' + (v.nome || 'streamer'));
    var capa = urlOk(live.foto) || urlOk(v.foto_raw);
    if (capa) a.style.backgroundImage = 'url("' + capa.replace(/["\\]/g, '') + '")';
    a.innerHTML = '<video muted playsinline webkit-playsinline autoplay disablepictureinpicture></video>' +
      '<span class="tag"><i></i>AO VIVO</span><span class="pe">Assistir live<span>' + esc(vistos) + '</span></span>';
    a.addEventListener('click', function () { setTimeout(fechar, 300); });
    box.appendChild(a);
    requestAnimationFrame(function () { a.classList.add('on'); });

    // Mesmo player da live em destaque da home (hls.js + proxy de reserva)
    var mv = a.querySelector('video');
    var lw = document.querySelector('kwai-live-widget');
    var limpa = null;
    if (lw && typeof lw.playFeaturedInto === 'function') {
      try { limpa = lw.playFeaturedInto(mv, live.link); } catch (_) { limpa = null; }
    }
    if (limpa) mv.addEventListener('playing', function () { a.classList.add('tocando'); }, { once: true });
    else mv.remove(); // sem stream pronto: fica a foto com "AO VIVO"
    return limpa;
  }

  // Só depois que a página carregou e ficou ociosa (não disputa com o carregamento)
  function agendar() {
    var vai = function () {
      if (document.hidden) {
        document.addEventListener('visibilitychange', function f() {
          if (document.hidden) return;
          document.removeEventListener('visibilitychange', f);
          setTimeout(iniciar, 600);
        });
        return;
      }
      iniciar();
    };
    var depois = function () {
      setTimeout(function () {
        if ('requestIdleCallback' in window) requestIdleCallback(vai, { timeout: 2500 }); else vai();
      }, 1500);
    };
    if (document.readyState === 'complete') depois(); else window.addEventListener('load', depois, { once: true });
  }

  agendar();
})();
