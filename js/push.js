/**
 * push.js — Notificações Web Push do painel do streamer (DMaior, Fase 1)
 *
 * Aditivo: não mexe no sino de comunicados nem no localStorage existente.
 * Só roda no /painel/ (onde existe <dmaior-app> e o login Supabase Auth).
 *
 * Fluxo:
 *   - se o navegador suporta e o streamer está logado, mostra um convite
 *     discreto ("Ativar notificações") + um controle no Perfil (#dmPushMount).
 *   - "Ativar" → pede permissão → PushManager.subscribe() → registra no
 *     worker push.agencydmaior.com.br (que descobre a identidade pelo token).
 *   - a cada abertura do painel, re-registra a subscription atual (idempotente)
 *     — cobre endpoint rotacionado e o "last_seen".
 *
 * API pública: window.DmaiorPush = { estado, ativar, desativar, enviarTeste, reconciliar }
 */
(function () {
  'use strict';

  var PUSH_CACHE   = 'dmaior-push-v1';
  var LS_DISMISS   = 'dm_push_convite_dispensado';   // timestamp do "agora não"
  var DISMISS_DIAS = 7;

  /* ───────────────────────── helpers ───────────────────────── */

  function token() { try { return localStorage.getItem('dm_token') || ''; } catch (_) { return ''; } }
  function logado() { return !!token(); }
  function noPainel() { return !!document.querySelector('dmaior-app'); }

  function suportado() {
    return ('serviceWorker' in navigator) && ('PushManager' in window) &&
           ('Notification' in window) && typeof Notification.requestPermission === 'function';
  }
  function ehIOS() { return /iPad|iPhone|iPod/.test(navigator.userAgent || ''); }
  function standalone() {
    return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
           window.navigator.standalone === true;
  }
  // iOS 16.4+ só expõe Web Push dentro do app instalado na tela inicial
  function iosPrecisaInstalar() { return ehIOS() && !standalone(); }

  function b64urlToU8(s) {
    var pad = '='.repeat((4 - (s.length % 4)) % 4);
    var b = (s + pad).replace(/-/g, '+').replace(/_/g, '/');
    var raw = atob(b);
    var out = new Uint8Array(raw.length);
    for (var i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
    return out;
  }

  function apiPronta() { return !!(window.DmaiorAPI && window.DmaiorAPI.push); }

  var _reg = null;
  function swReg() {
    if (_reg) return Promise.resolve(_reg);
    return navigator.serviceWorker.ready.then(function (r) { _reg = r; return r; });
  }

  var _vapid = null;
  function vapidKey() {
    if (_vapid) return Promise.resolve(_vapid);
    return window.DmaiorAPI.push.vapidPublicKey().then(function (r) {
      _vapid = (r && r.key) || null;
      if (_vapid) {
        // guarda os bytes pro SW usar no pushsubscriptionchange
        try {
          caches.open(PUSH_CACHE).then(function (c) {
            c.put('vapid-key', new Response(b64urlToU8(_vapid)));
          });
        } catch (_) {}
      }
      return _vapid;
    });
  }

  /* ───────────────────────── núcleo ───────────────────────── */

  // 'nao-suportado' | 'ios-instalar' | 'bloqueado' | 'desativado' | 'ativado'
  function estado() {
    if (!suportado()) return Promise.resolve('nao-suportado');
    if (iosPrecisaInstalar()) return Promise.resolve('ios-instalar');
    if (Notification.permission === 'denied') return Promise.resolve('bloqueado');
    if (Notification.permission === 'default') return Promise.resolve('desativado');
    return swReg()
      .then(function (reg) { return reg.pushManager.getSubscription(); })
      .then(function (sub) { return sub ? 'ativado' : 'desativado'; })
      .catch(function () { return 'desativado'; });
  }

  function ativar() {
    if (!suportado()) return Promise.reject(new Error('Este navegador não suporta notificações.'));
    if (iosPrecisaInstalar()) {
      return Promise.reject(new Error('No iPhone: toque em Compartilhar → "Adicionar à Tela de Início" e abra pelo ícone. Só assim o iOS libera as notificações.'));
    }
    if (!logado()) return Promise.reject(new Error('Faça login no painel primeiro.'));

    var permInicial = Notification.permission;
    var pedir = (permInicial === 'default')
      ? Notification.requestPermission()
      : Promise.resolve(permInicial);

    return pedir.then(function (perm) {
      if (perm !== 'granted') {
        throw new Error('Permissão não concedida. Você pode liberar depois nas configurações do navegador.');
      }
      return vapidKey();
    }).then(function (key) {
      if (!key) throw new Error('Configuração de notificações indisponível. Tente de novo em instantes.');
      return swReg().then(function (reg) {
        return reg.pushManager.getSubscription().then(function (sub) {
          if (sub) return sub;
          return reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: b64urlToU8(key),
          });
        });
      });
    }).then(function (sub) {
      return window.DmaiorAPI.push.subscribe(token(), sub.toJSON());
    }).then(function () {
      return true;
    });
  }

  function desativar() {
    return swReg().then(function (reg) {
      return reg.pushManager.getSubscription();
    }).then(function (sub) {
      if (!sub) return true;
      var avisaWorker = window.DmaiorAPI.push
        .unsubscribe(token(), { endpoint: sub.endpoint })
        .catch(function () {});
      return avisaWorker.then(function () { return sub.unsubscribe(); }).then(function () { return true; });
    }).catch(function () { return true; });
  }

  // re-registra a subscription atual no worker (idempotente). Roda a cada
  // abertura do painel: cobre endpoint rotacionado + atualiza o "last_seen".
  function reconciliar() {
    if (!suportado() || iosPrecisaInstalar() || !logado()) return Promise.resolve();
    if (Notification.permission !== 'granted') return Promise.resolve();
    return swReg().then(function (reg) {
      // 1) subscription que o SW deixou pendente (pushsubscriptionchange)
      return caches.open(PUSH_CACHE).then(function (cache) {
        return cache.match('pending-subscription').then(function (pend) {
          if (pend) {
            return pend.json().then(function (pj) {
              return window.DmaiorAPI.push.subscribe(token(), pj)
                .then(function () { return cache.delete('pending-subscription'); })
                .then(function () { return true; });
            });
          }
          return false;
        });
      }).then(function (feito) {
        if (feito) return;
        // 2) subscription atual
        return reg.pushManager.getSubscription().then(function (sub) {
          if (sub) return window.DmaiorAPI.push.subscribe(token(), sub.toJSON());
        });
      });
    }).catch(function () { /* silencioso — não atrapalha o painel */ });
  }

  function enviarTeste() {
    if (!logado()) return Promise.reject(new Error('Faça login primeiro.'));
    return window.DmaiorAPI.push.test(token());
  }

  /* ───────────────────────── UI ───────────────────────── */

  function jaDispensou() {
    try {
      var t = parseInt(localStorage.getItem(LS_DISMISS) || '0', 10);
      return t && (Date.now() - t) < DISMISS_DIAS * 864e5;
    } catch (_) { return false; }
  }
  function marcarDispensado() {
    try { localStorage.setItem(LS_DISMISS, String(Date.now())); } catch (_) {}
  }

  // ícones SVG (traço, mesma linguagem do sino do menu) — nada de emoji
  var IC_BELL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>';
  var IC_SEND = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>';
  var IC_X    = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
  var IC_INFO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>';

  var _cssInjetado = false;
  function injetarCss() {
    if (_cssInjetado) return;
    _cssInjetado = true;
    var s = document.createElement('style');
    s.id = 'dm-push-css';
    s.textContent = [
      // Usa os tokens --dm-* do design system (css/global.css), que mudam
      // sozinhos com o seletor de tema do menu (original/dark/branco/rosa/
      // laranja) — nada de cor fixa aqui, senão a faixa não acompanha o tema.
      // ── faixa (convite curto) ──
      '#dmPushConvite{position:sticky;top:0;z-index:900;display:flex;gap:10px;align-items:center;',
      'padding:9px 14px;background:var(--dm-bg-panel,rgba(26,26,46,.97));',
      'border-bottom:1px solid var(--dm-border,rgba(0,212,212,.15));color:var(--dm-text,#e2e8f0);',
      'font:14px/1.35 var(--dm-font-body,"Exo 2"),system-ui,-apple-system,sans-serif}',
      '#dmPushConvite .dm-ic{width:18px;height:18px;flex-shrink:0;color:var(--dm-effect-accent,#00d4d4);display:inline-flex}',
      '#dmPushConvite .dm-ic svg{width:100%;height:100%;display:block}',
      '#dmPushConvite .dm-msg{flex:1;min-width:120px}',
      '#dmPushConvite .dm-yes{font:inherit;font-weight:700;padding:7px 16px;border-radius:8px;border:0;',
      'cursor:pointer;white-space:nowrap;color:#04121b;background:var(--dm-grad-effect,linear-gradient(135deg,#3b82f6,#00d4d4))}',
      '#dmPushConvite .dm-yes:disabled{opacity:.6;cursor:default}',
      '#dmPushConvite .dm-x{width:30px;height:30px;flex-shrink:0;display:inline-flex;align-items:center;',
      'justify-content:center;border:0;background:transparent;color:var(--dm-text-sub,#a0b8c8);cursor:pointer;border-radius:8px}',
      '#dmPushConvite .dm-x:hover{background:var(--dm-bw06,rgba(255,255,255,.07));color:var(--dm-text,#e2e8f0)}',
      '#dmPushConvite .dm-x svg{width:16px;height:16px}',
      // ── controle no Perfil (já dentro do .card com fundo por tema) ──
      '#dmPushMount .dm-push-box{margin:6px 0 4px}',
      '#dmPushMount .dm-h{display:flex;align-items:center;gap:8px}',
      '#dmPushMount .dm-h .dm-ic{width:16px;height:16px;color:var(--dm-effect-accent,#00d4d4);display:inline-flex}',
      '#dmPushMount .dm-h .dm-ic svg{width:100%;height:100%;display:block}',
      '#dmPushMount .dm-row{display:flex;align-items:center;gap:12px;margin:2px 0 6px}',
      '#dmPushMount .dm-txt{display:flex;flex-direction:column;gap:2px;min-width:0}',
      '#dmPushMount .dm-txt b{font-size:.85rem;color:var(--dm-text,#e2e8f0);font-weight:600}',
      '#dmPushMount .dm-txt .dm-hint{font-size:.72rem;color:var(--dm-text-sub,#a0b8c8)}',
      '#dmPushMount .dm-push-status{font-size:.78rem;margin:6px 0 2px;display:flex;gap:6px;align-items:flex-start;color:var(--dm-text-sub,#a0b8c8)}',
      '#dmPushMount .dm-push-status .dm-ic{width:15px;height:15px;flex-shrink:0;margin-top:1px;display:inline-flex}',
      '#dmPushMount .dm-push-status .dm-ic svg{width:100%;height:100%;display:block}',
      '#dmPushMount .dm-push-status.warn{color:var(--dm-gold,#f0c040)}',
      '#dmPushMount .dm-test{margin-top:8px;background:none;border:1px solid var(--dm-border,#2a3350);',
      'color:var(--dm-effect-accent,#00d4d4);padding:7px 12px;border-radius:10px;font-family:var(--dm-font-title,"Rajdhani",sans-serif);',
      'font-weight:700;font-size:.72rem;text-transform:uppercase;letter-spacing:.04em;cursor:pointer;',
      'display:inline-flex;align-items:center;gap:6px}',
      '#dmPushMount .dm-test:hover{background:var(--dm-cyan-12,rgba(0,212,212,.12))}',
      '#dmPushMount .dm-test:disabled{opacity:.5;cursor:default}',
      '#dmPushMount .dm-test svg{width:13px;height:13px}',
      // ── toggle switch (acompanha a cor de acento do tema quando ativo) ──
      '.dm-switch{position:relative;display:inline-block;width:46px;height:26px;flex-shrink:0}',
      '.dm-switch input{position:absolute;opacity:0;width:0;height:0}',
      '.dm-switch .dm-sl{position:absolute;inset:0;cursor:pointer;background:#7d8698;border-radius:26px;transition:.25s}',
      '.dm-switch .dm-sl::before{content:"";position:absolute;height:20px;width:20px;left:3px;top:3px;',
      'background:#fff;border-radius:50%;transition:.25s;box-shadow:0 1px 3px rgba(0,0,0,.45)}',
      '.dm-switch input:checked + .dm-sl{background:var(--dm-grad-effect,linear-gradient(135deg,#3b82f6,#00d4d4))}',
      '.dm-switch input:checked + .dm-sl::before{transform:translateX(20px)}',
      '.dm-switch input:disabled + .dm-sl{opacity:.45;cursor:default}',
    ].join('');
    document.head.appendChild(s);
  }

  // ── convite (banner) ──
  function removerConvite() {
    var el = document.getElementById('dmPushConvite');
    if (el) el.remove();
  }

  function montarConvite() {
    if (!noPainel() || !logado()) { removerConvite(); return; }
    estado().then(function (st) {
      var existente = document.getElementById('dmPushConvite');
      var querMostrar = (st === 'desativado' || st === 'ios-instalar') && !jaDispensou();
      if (!querMostrar) { if (existente) existente.remove(); return; }
      if (existente) return;

      injetarCss();
      var bar = document.createElement('div');
      bar.id = 'dmPushConvite';

      var ic = document.createElement('span');
      ic.className = 'dm-ic';
      ic.innerHTML = IC_BELL;
      bar.appendChild(ic);

      var msg = document.createElement('span');
      msg.className = 'dm-msg';
      msg.textContent = (st === 'ios-instalar')
        ? 'Ative as notificações — adicione o painel à Tela de Início'
        : 'Ative as notificações da DMaior';
      bar.appendChild(msg);

      if (st !== 'ios-instalar') {
        var yes = document.createElement('button');
        yes.className = 'dm-yes';
        yes.textContent = 'Ativar';
        yes.addEventListener('click', function () {
          yes.disabled = true; yes.textContent = 'Ativando…';
          ativar().then(function () {
            removerConvite();
            atualizarMount();
            toast('Notificações ativadas neste aparelho.');
          }).catch(function (e) {
            yes.disabled = false; yes.textContent = 'Ativar';
            toast(e.message || 'Não foi possível ativar.', true);
          });
        });
        bar.appendChild(yes);
      }

      var x = document.createElement('button');
      x.className = 'dm-x';
      x.setAttribute('aria-label', 'Fechar');
      x.innerHTML = IC_X;
      x.addEventListener('click', function () { marcarDispensado(); removerConvite(); });
      bar.appendChild(x);

      // logo acima do painel (depois do menu do topo)
      var app = document.querySelector('dmaior-app');
      if (app && app.parentNode) app.parentNode.insertBefore(bar, app);
      else document.body.insertBefore(bar, document.body.firstChild);
    });
  }

  // ── controle no Perfil (#dmPushMount, injetado no dmaior-app.js) ──
  function atualizarMount() {
    var mount = null;
    var app = document.querySelector('dmaior-app');
    if (app) mount = app.querySelector('#dmPushMount');
    if (!mount) return;
    if (!logado()) { mount.innerHTML = ''; return; }

    estado().then(function (st) {
      injetarCss();
      mount.innerHTML = '';

      var podeAlternar = (st === 'ativado' || st === 'desativado');
      var ligado = (st === 'ativado');

      var box = document.createElement('div');
      box.className = 'dm-push-box';

      var h = document.createElement('h2');
      h.className = 'raaj dm-h';
      h.setAttribute('style', 'font-size:.9rem;margin:20px 0 10px;color:var(--cyan);border-bottom:1px solid var(--border);padding-bottom:8px;');
      h.innerHTML = '<span class="dm-ic">' + IC_BELL + '</span> NOTIFICAÇÕES';
      box.appendChild(h);

      // linha do switch
      var row = document.createElement('div');
      row.className = 'dm-row';

      var sw = document.createElement('label');
      sw.className = 'dm-switch';
      var chk = document.createElement('input');
      chk.type = 'checkbox';
      chk.checked = ligado;
      chk.disabled = !podeAlternar;
      var sl = document.createElement('span');
      sl.className = 'dm-sl';
      sw.appendChild(chk);
      sw.appendChild(sl);
      row.appendChild(sw);

      var txt = document.createElement('div');
      txt.className = 'dm-txt';
      var b = document.createElement('b');
      b.textContent = ligado ? 'Ativadas neste aparelho' : 'Desativadas neste aparelho';
      var hint = document.createElement('span');
      hint.className = 'dm-hint';
      hint.textContent = 'Avisos importantes da agência.';
      txt.appendChild(b);
      txt.appendChild(hint);
      row.appendChild(txt);
      box.appendChild(row);

      // mensagem quando não dá pra alternar
      var avisos = {
        'nao-suportado': 'Este navegador não suporta notificações push.',
        'ios-instalar':  'No iPhone, adicione o painel à Tela de Início (Compartilhar → "Adicionar à Tela de Início") e abra pelo ícone.',
        'bloqueado':     'As notificações estão bloqueadas para este site nas configurações do navegador.',
      };
      if (avisos[st]) {
        var p = document.createElement('p');
        p.className = 'dm-push-status warn';
        p.innerHTML = '<span class="dm-ic">' + IC_INFO + '</span><span></span>';
        p.lastChild.textContent = avisos[st];
        box.appendChild(p);
      }

      // botão de teste (só quando ativo)
      if (ligado) {
        var teste = document.createElement('button');
        teste.className = 'dm-test';
        teste.innerHTML = IC_SEND + '<span>Enviar teste</span>';
        var tLabel = teste.querySelector('span');
        teste.addEventListener('click', function () {
          teste.disabled = true; tLabel.textContent = 'Enviando…';
          enviarTeste().then(function (r) {
            teste.disabled = false; tLabel.textContent = 'Enviar teste';
            var n = (r && (r.aparelhos != null ? r.aparelhos : r.enqueued)) || 0;
            toast(n > 0 ? 'Teste enviado. Deve chegar em alguns segundos.' : 'Nenhum aparelho ativo para receber.');
          }).catch(function (e) {
            teste.disabled = false; tLabel.textContent = 'Enviar teste';
            toast(e.message || 'Falha ao enviar o teste.', true);
          });
        });
        box.appendChild(teste);
      }

      // ação do switch
      chk.addEventListener('change', function () {
        var querLigar = chk.checked;
        chk.disabled = true;
        var acao = querLigar ? ativar() : desativar();
        acao.then(function () {
          removerConvite();
          atualizarMount();
          toast(querLigar ? 'Notificações ativadas neste aparelho.' : 'Notificações desativadas.');
        }).catch(function (e) {
          chk.checked = !querLigar;   // reverte o switch
          chk.disabled = false;
          toast(e.message || 'Não foi possível concluir.', true);
        });
      });

      mount.appendChild(box);
    });
  }

  function montarUI() {
    if (!noPainel()) return;
    // o #dmPushMount pode ainda não estar no DOM (o painel renderiza async)
    var tentativas = 0;
    var tick = function () {
      atualizarMount();
      montarConvite();
      tentativas++;
      var app = document.querySelector('dmaior-app');
      if ((!app || !app.querySelector('#dmPushMount')) && tentativas < 20) {
        setTimeout(tick, 400);
      }
    };
    tick();
  }
  function removerUI() { removerConvite(); }

  // toast simples (sem dependência) — reaproveita o visual escuro do painel
  function toast(txt, erro) {
    var t = document.createElement('div');
    t.textContent = txt;
    t.setAttribute('style', [
      'position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:9999',
      'max-width:90%;padding:12px 18px;border-radius:10px;font:14px/1.4 system-ui,sans-serif',
      'color:#fff;box-shadow:0 8px 30px rgba(0,0,0,.4)',
      'background:' + (erro ? '#8a2330' : '#1c2450'),
    ].join(';'));
    document.body.appendChild(t);
    setTimeout(function () { t.style.transition = 'opacity .4s'; t.style.opacity = '0'; }, 3200);
    setTimeout(function () { t.remove(); }, 3700);
  }

  /* ───────────────────────── init ───────────────────────── */

  function init() {
    if (!('serviceWorker' in navigator)) return;
    if (!noPainel()) return;

    var n = 0;
    var esperarApi = function () {
      if (apiPronta()) {
        reconciliar();
        montarUI();
        return;
      }
      if (n++ < 25) setTimeout(esperarApi, 300);
    };
    esperarApi();

    window.addEventListener('dmaior:auth', function (e) {
      if (e && e.detail && e.detail.logado) { reconciliar(); montarUI(); }
      else { removerUI(); }
    });

    // volta do bfcache / troca de aba → revalida o estado do controle
    window.addEventListener('pageshow', function () { if (apiPronta()) montarUI(); });
  }

  window.DmaiorPush = {
    estado: estado,
    ativar: ativar,
    desativar: desativar,
    enviarTeste: enviarTeste,
    reconciliar: reconciliar,
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
