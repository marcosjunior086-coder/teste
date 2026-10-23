/* eslint-env browser */
// ============================================================
//  DMaior Agency — Custom Element: <dmaior-recarga>
//  Chat de recarga de diamantes do Kwai. Fala SÓ com o Worker
//  recarga.agencydmaior.com.br (que conversa com o RocketBunny); nenhum
//  segredo passa pelo navegador.
//
//  Fluxo (máquina de estados):
//    AGUARDANDO_ID → VALIDANDO → CONFIRMANDO_PERFIL → ESCOLHENDO_DIAMANTES
//    → CRIANDO_ORDEM → GERANDO_PAGAMENTO → AGUARDANDO_PAGAMENTO → CONCLUIDO | FALHOU
//
//  O chat não pede nome, CPF nem WhatsApp: quem pede é o provedor, na página dele. Aqui o cliente
//  só informa o ID do Kwai e a quantidade.
//
//  Atributos:
//    data-worker-url   URL do Worker (padrão https://recarga.agencydmaior.com.br)
//    data-logo-parceiro logo do parceiro no cabeçalho (padrão assets/icons/rocketbunny.png)
//    data-mock         presença = modo simulado, sem rede (painel de teste)
//    data-suporte-url  link do botão "Falar com o suporte" (opcional)
//
//  Eventos: "dmaior-recarga:req" { rota, status, ms, ok, mock, corpo } — corpo já mascarado.
//  Métodos: reiniciar(), simularStatus('AGUARDANDO'|'PAGO'|'FALHOU') (só modo simulado).
//
//  Visual: herda os tokens --dm-* do css/global.css (4 temas do site), igual ao <dmaior-afiliado>.
//  Privacidade: o site não coleta nome, CPF nem WhatsApp em momento nenhum.
// ============================================================
(function () {
  'use strict';

  const MIN = 100;
  const MAX = 400000;   // maior faixa que o parceiro oferece (igual ao Worker)
  const RAPIDOS = [100, 500, 1000, 5000, 10000];
  const WORKER_PADRAO = 'https://recarga.agencydmaior.com.br';
  const PRECO_MOCK = 0.0692;

  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pausa = ms => new Promise(r => setTimeout(r, ms));
  const brl = n => Number(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const num = n => Number(n).toLocaleString('pt-BR');
  // Host do link de pagamento: o cliente precisa saber ONDE vai digitar o CPF.
  const hostDe = u => { try { return new URL(u).hostname; } catch { return 'site do parceiro'; } };


  // IDs do Kwai já usados, guardados SÓ neste aparelho (não há conta no sistema, então isso evita
  // digitar tudo de novo). O ID do Kwai é público — é o @ do perfil —, e some com a limpeza do
  // navegador ou pelo botão de remover.
  const CHAVE_IDS = 'dmaior_recarga_ids';
  function idsSalvos() {
    try {
      const v = JSON.parse(localStorage.getItem(CHAVE_IDS) || '[]');
      return Array.isArray(v) ? v.filter(x => typeof x === 'string' && /^[A-Za-z0-9_.\-]{2,40}$/.test(x)).slice(0, 5) : [];
    } catch (_) { return []; }
  }
  function guardarId(id) {
    try {
      const lista = [id, ...idsSalvos().filter(x => x.toLowerCase() !== id.toLowerCase())].slice(0, 5);
      localStorage.setItem(CHAVE_IDS, JSON.stringify(lista));
    } catch (_) { /* navegador sem storage (anônimo, bloqueado): segue sem salvar */ }
  }
  function esquecerId(id) {
    try {
      const lista = idsSalvos().filter(x => x.toLowerCase() !== id.toLowerCase());
      if (lista.length) localStorage.setItem(CHAVE_IDS, JSON.stringify(lista));
      else localStorage.removeItem(CHAVE_IDS);
    } catch (_) { /* idem */ }
  }

  const ICONES = {
    gem: '<path d="M6 3h12l4 6-10 13L2 9Z"/><path d="M11 3 8 9l4 13 4-13-3-6"/><path d="M2 9h20"/>',
    send: '<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
    lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
    check: '<polyline points="20 6 9 17 4 12"/>',
    ext: '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
    refresh: '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
    alert: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
    lixo: '<path d="M3 6h18"/><path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>',
    help: '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>',
  };
  const ico = n => `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true">${ICONES[n] || ''}</svg>`;

  // Mascote do atendimento: olhos piscam sozinhos e a boca muda conforme o passo
  // (pensando enquanto espera a rede, feliz no sucesso, chateado no erro).
  const BOCAS = {
    neutro: 'M42 64 Q50 70 58 64',
    feliz: 'M41 62 Q50 74 59 62',
    triste: 'M41 69 Q50 59 59 69',
    pensando: 'M44 66 Q50 64 56 66',
  };
  let nMascote = 0;
  const MASCOTE = `
    <svg class="mascote" viewBox="0 0 100 100" aria-hidden="true">
      <defs>
        <linearGradient id="mcorpo__ID__" x1="0" y1="0" x2="1" y2="1">
          <stop stop-color="var(--c-m1)"/><stop offset="1" stop-color="var(--c-m2)"/>
        </linearGradient>
        <linearGradient id="mrosto__ID__" x1="0" y1="0" x2="0" y2="1">
          <stop stop-color="#fff"/><stop offset="1" stop-color="#dceaff"/>
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="49" fill="url(#mcorpo__ID__)"/>
      <g stroke="#e7f3ff" stroke-width="5" stroke-linecap="round">
        <path d="M31 31 23 22M69 31 77 22"/>
        <circle cx="21" cy="20" r="5" fill="#fff" stroke="none"/>
        <circle cx="79" cy="20" r="5" fill="#fff" stroke="none"/>
      </g>
      <path d="M17 53C17 34 29 27 50 27s33 7 33 26-13 29-33 29H49v8l-13-8C25 78 17 67 17 53Z" fill="url(#mrosto__ID__)"/>
      <ellipse class="olho" cx="38" cy="52" rx="5.7" ry="6.2" fill="#101827"/>
      <ellipse class="olho" cx="62" cy="52" rx="5.7" ry="6.2" fill="#101827"/>
      <circle class="brilho" cx="36.2" cy="49.7" r="1.45" fill="#fff"/>
      <circle class="brilho" cx="60.2" cy="49.7" r="1.45" fill="#fff"/>
      <path class="boca" d="${BOCAS.neutro}" fill="none" stroke="#7b9bc7" stroke-width="2.5" stroke-linecap="round"/>
    </svg>`;

  class DmaiorRecarga extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      this._gen = 0;           // sobe a cada reinício: respostas atrasadas de fluxos antigos são ignoradas
      this._step = 'AGUARDANDO_ID';
      this._perfil = null;
      this._diamantes = 0;
      this._valor = null;
      this._orderNo = null;
      this._ticket = '';       // assinatura do pedido, vem do Worker; sem ela pagar/consultar/trocar é recusado
      this._pedidoSeq = 0;     // sobe a cada troca/encerramento: invalida consulta em voo do pedido antigo
      this._pollTimer = null;
      this._pollN = 0;
      this._falhasPoll = 0;
      this._inicioTimer = null;
      this._mockStatus = 'AGUARDANDO';
    }

    get _mock() { return this.hasAttribute('data-mock'); }
    get _workerUrl() { return (this.getAttribute('data-worker-url') || WORKER_PADRAO).replace(/\/+$/, ''); }

    connectedCallback() {
      this._syncTema();
      this._render();
      this._onTema = () => this._syncTema();
      this._onStorage = e => { if (e.key === 'dm_tema') this._syncTema(); };
      window.addEventListener('dmaior:tema', this._onTema);
      window.addEventListener('storage', this._onStorage);
      this._inicioTimer = setTimeout(() => this._boasVindas(), 250);
    }

    disconnectedCallback() {
      window.removeEventListener('dmaior:tema', this._onTema);
      window.removeEventListener('storage', this._onStorage);
      clearTimeout(this._inicioTimer);
      this._pararPoll();
      this._gen++;
    }

    _syncTema() {
      let t = 'original';
      try { t = localStorage.getItem('dm_tema') || 'original'; } catch (_) { /* sem storage: tema padrão */ }
      if (t === 'original') this.removeAttribute('data-theme'); else this.setAttribute('data-theme', t);
    }

    // ── API pública ──────────────────────────────────────────────
    reiniciar() {
      this._gen++;
      this._pararPoll();
      this._perfil = null; this._diamantes = 0; this._valor = null; this._orderNo = null; this._ticket = '';
      this._pedidoSeq++; this._wPag = null; this._acoes = null; this._humor('neutro');
      this._mockStatus = 'AGUARDANDO';
      if (this._log) this._log.innerHTML = '';
      this._boasVindas(true);
    }
    simularStatus(s) { if (['AGUARDANDO', 'PAGO', 'FALHOU'].includes(s)) this._mockStatus = s; }

    // ── render base ──────────────────────────────────────────────
    _render() {
      this.shadowRoot.innerHTML = `
      <style>
        /* Tokens: herdam os --dm-* do css/global.css; fallback = tema escuro oficial. */
        :host{ display:block; width:100%;
          --c-cyan:var(--dm-cyan,#00d4d4); --c-green:var(--dm-green,#4ade80); --c-red:var(--dm-red,#f87171); --c-gold:var(--dm-gold,#f0c040);
          --c-text:var(--dm-text,#e2e8f0); --c-sub:var(--dm-text-sub,#a0b8c8); --c-muted:var(--dm-text-muted,#7a9ab4);
          --c-border:var(--dm-border,rgba(0,212,212,.15));
          --c-card:var(--dm-grad-card,linear-gradient(160deg,#1a1a2e 0%,#12121f 100%));
          --c-solid:var(--dm-bg-2,#1a1a2e);
          --c-tint:var(--dm-cyan-10,rgba(0,212,212,.10));
          --c-row:var(--dm-bg-tint,rgba(0,0,0,.20));
          --c-bot:var(--dm-bw05,rgba(255,255,255,.07)); --c-bot-b:var(--dm-bw06,rgba(255,255,255,.09));
          --c-grad:var(--dm-grad-effect,linear-gradient(135deg,#3b82f6,#00d4d4));
          --c-glow:var(--dm-effect-glow,rgba(59,130,246,.28));
          font-family:var(--dm-font-body,'Exo 2',sans-serif); color:var(--c-text); font-size:calc(16px * var(--dm-font-scale,1)); }
        *{ box-sizing:border-box; margin:0; padding:0; }
        .ico{ width:1em; height:1em; display:inline-block; vertical-align:-.15em; flex-shrink:0; stroke:currentColor; stroke-width:2; fill:none; stroke-linecap:round; stroke-linejoin:round; }
        .raaj{ font-family:var(--dm-font-title,'Rajdhani',sans-serif); text-transform:uppercase; letter-spacing:.04em; }

        /* min() no min-height: com teclado aberto ou em paisagem, a altura mínima não pode estourar a tela. */
        .wrap{ width:100%; max-width:480px; margin:0 auto; height:min(700px,calc(100dvh - 120px)); min-height:min(520px,calc(100dvh - 24px)); display:flex; flex-direction:column; overflow:hidden;
          background:var(--c-card); border:1px solid var(--c-border); border-radius:20px; box-shadow:0 8px 32px rgba(0,0,0,.3); }
        .top{ display:flex; align-items:center; justify-content:space-between; gap:10px; padding:13px 16px; border-bottom:1px solid var(--c-border); background:var(--c-row); flex-shrink:0; }
        /* Só as marcas, sem texto: a logo de cada empresa fala por si */
        .brand{ display:flex; align-items:center; gap:9px; min-width:0; flex:1; }
        .marca{ display:grid; place-items:center; min-width:0; }
        .marca .lg{ height:30px; width:auto; max-width:100%; object-fit:contain; display:block; }
        @media (max-width:430px){ .marca .lg{ height:24px; } .on span{ display:none; } }
        .on{ display:flex; align-items:center; gap:6px; font-size:.72rem; color:var(--c-muted); flex-shrink:0; }
        .on i{ width:8px; height:8px; border-radius:50%; background:var(--c-green); box-shadow:0 0 6px var(--c-green); }

        .log{ flex:1; overflow-y:auto; overflow-x:hidden; padding:16px 14px; display:flex; flex-direction:column; gap:10px; overscroll-behavior:contain; scrollbar-width:thin; scrollbar-color:var(--c-border) transparent; }
        /* O mascote é o atendente: aparece ao lado de cada fala dele, como foto de perfil */
        .fala{ display:flex; align-items:flex-end; gap:8px; align-self:flex-start; max-width:92%; animation:in .25s ease both; }
        .fala .msg{ animation:none; }
        .mascote{ width:34px; height:34px; flex-shrink:0; display:block; border-radius:50%;
          --c-m1:#86c4ff; --c-m2:var(--dm-effect-blue,#3b82f6); transition:transform .25s; }
        :host([data-theme="rosa"]) .mascote{ --c-m1:#ffa6d2; --c-m2:#e91e8c; }
        :host([data-theme="laranja"]) .mascote{ --c-m1:#ffc08a; --c-m2:#ea580c; }
        :host([data-theme="branco"]) .mascote{ --c-m1:#7fb6ff; --c-m2:#0369a1; }
        .mascote .olho{ transform-box:fill-box; transform-origin:center; animation:piscar 4.2s ease-in-out infinite; }
        .mascote .olho:nth-of-type(2){ animation-delay:.12s; }
        .fala[data-humor="feliz"] .mascote{ animation:pulo .55s ease; }
        .fala[data-humor="triste"] .mascote{ transform:translateY(2px) rotate(-4deg); }
        .fala[data-humor="pensando"] .mascote{ animation:pensa 1s ease-in-out infinite alternate; }
        @keyframes piscar{ 0%,40%,44%,78%,82%,100%{ transform:scaleY(1); } 42%,80%{ transform:scaleY(.12); } }
        @keyframes pulo{ 0%,100%{ transform:translateY(0) rotate(0); } 35%{ transform:translateY(-5px) rotate(-5deg); } 70%{ transform:translateY(1px) rotate(5deg); } }
        @keyframes pensa{ from{ transform:rotate(-4deg); } to{ transform:rotate(4deg); } }

        .msg{ padding:10px 14px; border-radius:16px; font-size:.92rem; line-height:1.45; max-width:88%; overflow-wrap:anywhere; animation:in .25s ease both; }
        .msg.bot{ align-self:flex-start; background:var(--c-bot); border:1px solid var(--c-bot-b); border-bottom-left-radius:4px; }
        .msg.bot strong{ color:var(--c-cyan); font-weight:700; }
        .msg.user{ align-self:flex-end; background:var(--c-grad); color:#000; font-weight:600; border-bottom-right-radius:4px; box-shadow:0 3px 10px var(--c-glow); }
        .msg.erro{ align-self:flex-start; background:rgba(248,113,113,.12); border:1px solid rgba(248,113,113,.4); color:var(--c-red); border-bottom-left-radius:4px; }
        .msg.ok{ align-self:flex-start; background:rgba(74,222,128,.12); border:1px solid rgba(74,222,128,.4); border-bottom-left-radius:4px; }
        .msg.ok strong{ color:var(--c-green); }
        .typing{ display:flex; gap:5px; padding:13px 16px; background:var(--c-bot); border:1px solid var(--c-bot-b); border-radius:16px; border-bottom-left-radius:4px; }
        .typing i{ width:6px; height:6px; border-radius:50%; background:var(--c-muted); animation:blink 1.1s infinite ease-in-out; }
        .typing i:nth-child(2){ animation-delay:.18s; } .typing i:nth-child(3){ animation-delay:.36s; }
        @keyframes in{ from{ opacity:0; transform:translateY(6px); } to{ opacity:1; transform:none; } }
        @keyframes blink{ 0%,80%,100%{ opacity:.25; } 40%{ opacity:1; } }
        @keyframes giro{ to{ transform:rotate(360deg); } }

        .blk{ align-self:flex-start; width:100%; max-width:92%; background:var(--c-row); border:1px solid var(--c-border); border-radius:16px; padding:14px; display:flex; flex-direction:column; gap:11px; animation:in .25s ease both; }
        .perfil{ display:flex; align-items:center; gap:13px; }
        .av{ position:relative; width:52px; height:52px; border-radius:50%; border:2px solid var(--c-border); background:var(--c-solid); overflow:hidden; flex-shrink:0; display:flex; align-items:center; justify-content:center; }
        .av b{ font-family:var(--dm-font-title,'Rajdhani',sans-serif); font-size:1.3rem; color:var(--c-cyan); }
        .av img{ position:absolute; inset:0; width:100%; height:100%; object-fit:cover; }
        .pn{ font-family:var(--dm-font-title,'Rajdhani',sans-serif); font-weight:700; font-size:1.02rem; line-height:1.15; overflow-wrap:anywhere; }
        .pid{ font-size:.78rem; color:var(--c-muted); margin-top:2px; overflow-wrap:anywhere; }

        .btns{ align-self:flex-start; display:flex; flex-wrap:wrap; gap:8px; max-width:100%; animation:in .25s ease both; }
        .btn{ display:inline-flex; align-items:center; justify-content:center; gap:7px; min-height:44px; padding:10px 18px; border-radius:999px; border:1px solid var(--c-border); background:var(--c-grad); color:#000;
          font-family:var(--dm-font-title,'Rajdhani',sans-serif); font-weight:700; font-size:.92rem; letter-spacing:.03em; text-transform:uppercase; cursor:pointer; text-decoration:none; text-align:center;
          box-shadow:inset 0 3px 5px rgba(255,255,255,.35),0 3px 10px var(--c-glow); transition:transform .2s, opacity .2s; }
        .btn:hover{ transform:translateY(-1px); }
        .btn:focus-visible,.chip:focus-visible,input:focus-visible{ outline:2px solid var(--c-cyan); outline-offset:2px; }
        .btn[disabled]{ background:var(--c-row); color:var(--c-muted); box-shadow:none; cursor:not-allowed; transform:none; opacity:.7; }
        .btn.sec{ background:transparent; color:var(--c-cyan); box-shadow:none; }
        .btn.sec:hover{ background:var(--c-tint); }
        .btn.full{ width:100%; }

        .lbl{ font-size:.72rem; color:var(--c-muted); letter-spacing:.06em; text-transform:uppercase; }
        .chips{ display:flex; flex-wrap:wrap; gap:6px; }
        .chip{ min-height:36px; padding:6px 14px; border-radius:999px; border:1px solid var(--c-border); background:transparent; color:var(--c-sub); font:inherit; font-size:.8rem; cursor:pointer; }
        .chip.on{ border-color:var(--c-cyan); color:var(--c-cyan); background:var(--c-tint); }
        .chip-id{ display:inline-flex; align-items:center; }
        .chip-id .chip{ border-top-right-radius:0; border-bottom-right-radius:0; border-right:none; max-width:170px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .chip-id .esq{ display:grid; place-items:center; width:32px; min-height:36px; border:1px solid var(--c-border); border-left:none; border-radius:0 999px 999px 0; background:transparent; color:var(--c-muted); cursor:pointer; font-size:.8rem; }
        .chip-id .esq:hover{ color:var(--c-red); background:var(--c-row); }
        .field{ display:flex; flex-direction:column; gap:5px; }
        .field span{ font-size:.72rem; color:var(--c-muted); letter-spacing:.06em; text-transform:uppercase; }
        input{ width:100%; min-height:44px; padding:10px 13px; border-radius:12px; border:1px solid var(--c-border); background:var(--c-solid); color:var(--c-text); font:inherit; font-size:16px; }
        input::placeholder{ color:var(--c-muted); opacity:.8; }
        input:disabled{ opacity:.55; }
        .preco{ display:flex; align-items:baseline; justify-content:space-between; gap:10px; padding:10px 12px; border-radius:12px; background:var(--c-tint); }
        .preco strong{ font-family:var(--dm-font-title,'Rajdhani',sans-serif); font-size:1.35rem; color:var(--c-cyan); }
        .small{ font-size:.75rem; color:var(--c-muted); line-height:1.4; }
        .small .ico{ margin-right:3px; }
        .inline-erro{ font-size:.8rem; color:var(--c-red); line-height:1.35; }
        .inline-erro[hidden]{ display:none; }

        .qr{ align-self:center; width:min(210px,70%); aspect-ratio:1; background:#fff; padding:8px; border-radius:12px; }
        .qr img{ display:block; width:100%; height:100%; image-rendering:pixelated; }
        .code{ padding:10px 12px; border-radius:12px; border:1px dashed var(--c-border); background:var(--c-solid); font-family:ui-monospace,SFMono-Regular,Consolas,monospace; font-size:.72rem; line-height:1.4; word-break:break-all; max-height:86px; overflow:auto; user-select:all; }
        .stt{ display:flex; align-items:center; gap:9px; font-size:.85rem; color:var(--c-sub); }
        .spin{ width:16px; height:16px; border-radius:50%; border:2px solid var(--c-border); border-top-color:var(--c-cyan); animation:giro .9s linear infinite; flex-shrink:0; }

        .bar{ display:flex; gap:8px; align-items:center; padding:11px 12px; border-top:1px solid var(--c-border); background:var(--c-row); flex-shrink:0; }
        .bar input{ flex:1; border-radius:999px; padding-left:16px; }
        .send{ width:44px; height:44px; border-radius:50%; border:none; background:var(--c-grad); color:#000; font-size:1.1rem; display:flex; align-items:center; justify-content:center; cursor:pointer; flex-shrink:0; box-shadow:inset 0 3px 5px rgba(255,255,255,.35),0 3px 10px var(--c-glow); }
        .send[disabled]{ background:var(--c-solid); color:var(--c-muted); box-shadow:none; cursor:not-allowed; }
        .foot{ text-align:center; font-size:.68rem; color:var(--c-muted); padding:0 12px 9px; background:var(--c-row); flex-shrink:0; }
        .foot .ico{ margin-right:3px; }

        @media (max-width:480px){ .wrap{ border-radius:16px; height:min(700px,calc(100dvh - 96px)); } .msg{ max-width:94%; } .blk{ max-width:100%; } }
        @media (prefers-reduced-motion:reduce){ *{ animation:none !important; transition:none !important; } .spin{ border-top-color:var(--c-border); border-right-color:var(--c-cyan); } }
      </style>
      <div class="wrap">
        <header class="top">
          <div class="brand">
            <span class="marca parceiro"><img class="lg" alt="Rocket Bunny"></span>
          </div>
          <div class="on" role="status"><i></i><span>Atendimento digital</span></div>
        </header>
        <div class="log" role="log" aria-live="polite" aria-label="Conversa de recarga"></div>
        <form class="bar" novalidate>
          <input type="text" enterkeyhint="send" autocomplete="off" autocapitalize="off" spellcheck="false" maxlength="40" aria-label="ID do Kwai" placeholder="Aguarde…" disabled>
          <button class="send" type="submit" aria-label="Enviar" disabled>${ico('send')}</button>
        </form>
        <p class="foot">${ico('lock')}Conexão segura · Seus dados não ficam salvos no site</p>
      </div>`;
      // Só a marca do parceiro: o site em volta já é da DMaior.
      const marca = this.shadowRoot.querySelector('.marca.parceiro');
      const img = marca.querySelector('.lg');
      img.addEventListener('error', () => {
        // Sem a logo, entra o nome escrito pra não ficar um buraco no cabeçalho.
        marca.remove();
        const t = document.createElement('b');
        t.className = 'raaj';
        t.textContent = 'Recarga de diamantes';
        this.shadowRoot.querySelector('.brand')?.appendChild(t);
      });
      img.src = this.getAttribute('data-logo-parceiro') || 'assets/icons/rocketbunny.png';
      this._log = this.shadowRoot.querySelector('.log');
      this._bar = this.shadowRoot.querySelector('.bar');
      this._in = this._bar.querySelector('input');
      this._send = this._bar.querySelector('.send');
      this._bar.addEventListener('submit', e => { e.preventDefault(); this._onEnviarId(); });
    }

    // Humor do atendente: "pensando" enquanto espera a rede, "feliz" no sucesso, "triste" no erro.
    // Vale para a próxima fala dele; as anteriores guardam a expressão do momento em que falaram.
    _humor(humor) { this._humorAtual = BOCAS[humor] ? humor : 'neutro'; }

    // Fala do atendente = mascote + balão, igual a uma conversa de suporte.
    _comMascote(msg) {
      const humor = this._humorAtual || 'neutro';
      const linha = document.createElement('div');
      linha.className = 'fala';
      linha.dataset.humor = humor;
      // ids únicos por cópia: dois <linearGradient id="..."> iguais no mesmo root colidem
      linha.innerHTML = MASCOTE.replace(/__ID__/g, `-${++nMascote}`);
      linha.querySelector('.boca')?.setAttribute('d', BOCAS[humor] || BOCAS.neutro);
      linha.appendChild(msg);
      return linha;
    }

    // ── helpers de conversa ──────────────────────────────────────
    _rolar() { requestAnimationFrame(() => { if (this._log) this._log.scrollTop = this._log.scrollHeight; }); }
    _add(tipo, html) {
      const d = document.createElement('div');
      d.className = `msg ${tipo}`;
      if (tipo.includes('erro')) { d.setAttribute('role', 'alert'); this._humor('triste'); }
      else if (tipo.includes('ok')) this._humor('feliz');
      d.innerHTML = html;
      // Tudo que o atendente diz (inclusive erro e sucesso) sai ao lado do mascote; só o que o
      // cliente responde fica solto do outro lado.
      this._log.appendChild(tipo.includes('user') ? d : this._comMascote(d));
      this._rolar();
      return d;
    }
    _bloco(html, cls = '', tag = 'div') {
      const d = document.createElement(tag);
      d.className = `blk ${cls}`.trim();
      d.innerHTML = html;
      this._log.appendChild(d);
      this._rolar();
      return d;
    }
    _digitando() {
      this._humor('pensando');
      const d = document.createElement('div');
      d.className = 'typing'; d.setAttribute('aria-label', 'Digitando');
      d.innerHTML = '<i></i><i></i><i></i>';
      const linha = this._comMascote(d);
      this._log.appendChild(linha); this._rolar();
      return linha;              // remover a linha tira o mascote junto
    }
    _botoes(itens) {
      const row = document.createElement('div');
      row.className = 'btns';
      for (const it of itens) {
        const b = document.createElement(it.href ? 'a' : 'button');
        b.className = `btn ${it.cls || ''}`.trim();
        b.innerHTML = it.html;
        if (it.href) { b.href = it.href; b.target = '_blank'; b.rel = 'noopener noreferrer'; }
        else { b.type = 'button'; b.addEventListener('click', () => { row.remove(); it.fn(); }); }
        row.appendChild(b);
      }
      this._log.appendChild(row); this._rolar();
      // Quem navega por teclado perde o foco quando o botão clicado some; leva o foco pro próximo passo.
      if (this._focarProx) { this._focarProx = false; row.querySelector('.btn')?.focus({ preventScroll: true }); }
      return row;
    }
    _entrada(ativa, placeholder = '') {
      this._in.disabled = !ativa; this._send.disabled = !ativa;
      this._in.placeholder = placeholder || (ativa ? '' : 'Use as opções da conversa');
      if (!ativa) this._in.value = '';
    }
    _ok(g) { return g === this._gen && this.isConnected; }

    // ── rede (Worker) ────────────────────────────────────────────
    // O evento é público (qualquer script da página ouve). Leva o que o painel de teste precisa —
    // ID do Kwai (que o cliente digitou e já está na tela), quantidade e forma de pagamento — e,
    // dos dados do pagador, só QUAIS campos foram enviados: nunca nome, CPF, WhatsApp nem o ticket.
    _resumo(corpo) {
      const c = {};
      if (corpo.kwai_id) c.kwai_id = corpo.kwai_id;
      if (corpo.diamantes) c.diamantes = corpo.diamantes;
      if (corpo.pay_way) c.pay_way = corpo.pay_way;
      const pessoais = ['nome', 'cpf', 'whatsapp'].filter(k => corpo[k]);
      if (pessoais.length) c.campos_enviados = pessoais;
      return c;
    }
    async _chamar(rota, corpo) {
      const t0 = performance.now();
      let status = 0, json = null;
      try {
        if (this._mock) {
          ({ status, json } = await this._mockApi(rota, corpo));
        } else {
          const ctrl = new AbortController();
          const to = setTimeout(() => ctrl.abort(), 20000);
          try {
            const r = await fetch(this._workerUrl + rota, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo), signal: ctrl.signal, credentials: 'omit', cache: 'no-store' });
            status = r.status;
            json = await r.json().catch(() => null);
          } finally { clearTimeout(to); }
        }
      } catch (_) { json = null; }
      const res = { ok: !!(json && json.ok), status, json: json || {}, rede: !json };
      this.dispatchEvent(new CustomEvent('dmaior-recarga:req', { detail: { rota, status, ms: Math.round(performance.now() - t0), ok: res.ok, mock: this._mock, corpo: this._resumo(corpo), resposta: res.ok ? undefined : (json && json.erro) || 'sem resposta' } }));
      return res;
    }
    _msgErro(r, padrao) {
      if (r.rede) return 'Não consegui conectar agora. Verifique sua internet e tente de novo.';
      return (r.json && r.json.erro) || padrao;
    }

    // ── simulação (modo de teste, sem rede) ──────────────────────
    async _mockApi(rota, c) {
      await pausa(350 + Math.random() * 350);
      const R = (status, json) => ({ status, json });
      if (rota === '/validate-id') {
        if (/nao.?existe|invalido/i.test(c.kwai_id)) return R(404, { ok: false, erro: 'ID do Kwai não encontrado. Confira e tente de novo.' });
        return R(200, { ok: true, perfil: { nome: `Perfil de teste ${c.kwai_id}`, kwai_id: c.kwai_id, foto_url: null } });
      }
      if (rota === '/get-price') return R(200, { ok: true, diamantes: c.diamantes, valor: Math.round(c.diamantes * PRECO_MOCK * 100) / 100, estimado: true });
      // O ticket de mentira imita o do Worker: vale só pro pedido que o assinou.
      const tk = ordem => `mock:${ordem}`;
      if (rota === '/create-order') {
        this._mockStatus = 'AGUARDANDO';
        const ordem = `MOCK-${Date.now()}-OK`;
        return R(200, { ok: true, order_no: ordem, ticket: tk(ordem) });
      }
      if (c.ticket !== tk(c.order_no)) return R(403, { ok: false, erro: 'Pedido inválido ou expirado. Comece uma nova recarga.' });
      // Na vida real o pagamento é sempre uma página do provedor (verificado em 2026-10-22).
      if (rota === '/pay-link') return R(200, { ok: true, order_no: c.order_no, pay_url: 'https://cashier-hub.enjoypayment.com/pix-p01/reference/MOCK/teste' });
      if (rota === '/check-status') return R(200, { ok: true, status: this._mockStatus });
      return R(404, { ok: false, erro: 'Rota inexistente' });
    }

    // ── passo 1: ID do Kwai ──────────────────────────────────────
    _boasVindas(novo = false) {
      const g = this._gen;
      this._add('bot', novo ? 'Vamos de outra recarga! 💎' : 'Olá! Eu faço a sua <strong>recarga de diamantes</strong> do Kwai, rápido e seguro.');
      setTimeout(() => { if (this._ok(g)) this._pedirId(); }, 350);
    }
    _pedirId(msg) {
      this._step = 'AGUARDANDO_ID';
      this._add('bot', msg || 'Primeiro, me informe o <strong>ID do Kwai</strong> que vai receber os diamantes.');
      this._entrada(true, 'Digite o ID do Kwai…');
      this._mostrarIdsSalvos();
    }

    // Atalho para quem já recarregou neste aparelho.
    _mostrarIdsSalvos() {
      const g = this._gen;
      const ids = idsSalvos();
      if (!ids.length) return;
      const w = this._bloco(`
        <div class="lbl">Usar de novo, neste aparelho</div>
        <div class="chips" data-ids>${ids.map(id => `
          <span class="chip-id"><button type="button" class="chip" data-usar="${esc(id)}">${esc(id)}</button><button type="button" class="esq" data-esquecer="${esc(id)}" aria-label="Esquecer ${esc(id)}" title="Esquecer este ID">${ico('lixo')}</button></span>`).join('')}
        </div>
        <p class="small">Fica salvo só neste aparelho. Toque na lixeira para esquecer.</p>`);
      w.addEventListener('click', e => {
        const usar = e.target.closest('[data-usar]');
        if (usar && this._ok(g) && this._step === 'AGUARDANDO_ID') {
          w.remove();
          this._in.value = usar.dataset.usar;
          this._onEnviarId();
          return;
        }
        const esquecer = e.target.closest('[data-esquecer]');
        if (esquecer) {
          esquecerId(esquecer.dataset.esquecer);
          esquecer.closest('.chip-id')?.remove();
          if (!w.querySelector('.chip-id')) w.remove();
        }
      });
      this._idsBloco = w;
    }
    async _onEnviarId() {
      if (this._step !== 'AGUARDANDO_ID') return;
      const id = this._in.value.trim().replace(/^@+/, '').replace(/\s+/g, '');
      if (!/^[A-Za-z0-9_.\-]{2,40}$/.test(id)) {
        this._add('erro', `${ico('alert')} ID inválido. Use só letras, números, ponto, traço ou _ (sem espaços).`);
        return;
      }
      const g = this._gen;
      if (this._idsBloco?.isConnected) { this._idsBloco.remove(); this._idsBloco = null; }
      this._add('user', esc(id));
      this._entrada(false);
      this._step = 'VALIDANDO';
      const dig = this._digitando();
      const r = await this._chamar('/validate-id', { kwai_id: id });
      dig.remove();
      if (!this._ok(g)) return;
      if (!r.ok || !r.json.perfil) {
        this._add('erro', `${ico('alert')} ${esc(this._msgErro(r, 'ID do Kwai não encontrado.'))}`);
        this._pedirId('Tente de novo com o seu <strong>ID do Kwai</strong>.');
        return;
      }
      this._perfil = r.json.perfil;
      this._humor('feliz');
      this._mostrarPerfil();
    }

    _mostrarPerfil() {
      const g = this._gen;
      const p = this._perfil;
      this._step = 'CONFIRMANDO_PERFIL';
      this._add('bot', 'Encontrei este perfil. <strong>É você?</strong>');
      const foto = typeof p.foto_url === 'string' && /^https:\/\//i.test(p.foto_url) ? p.foto_url : '';
      const inicial = esc(String(p.nome || p.kwai_id || '?').trim().charAt(0).toUpperCase() || '?');
      const card = this._bloco(`<div class="perfil"><div class="av"><b>${inicial}</b>${foto ? '<img alt="" referrerpolicy="no-referrer" loading="lazy">' : ''}</div>
        <div style="min-width:0"><div class="pn">${esc(p.nome || p.kwai_id)}</div><div class="pid">ID: ${esc(p.kwai_id)}</div></div></div>`);
      const img = card.querySelector('img');
      if (img) { img.addEventListener('error', () => img.remove()); img.src = foto; }
      this._botoes([
        { html: `${ico('check')} Sim, sou eu`, fn: () => { if (!this._ok(g)) return; guardarId(p.kwai_id); this._add('user', 'Sim, sou eu'); this._calculadora(); } },
        { html: 'Não sou eu', cls: 'sec', fn: () => { if (!this._ok(g)) return; this._add('user', 'Não sou eu'); this._perfil = null; this._pedirId('Sem problema! Digite o <strong>ID do Kwai</strong> de novo.'); } },
      ]);
    }

    // ── passo 2: quantidade de diamantes ─────────────────────────
    _calculadora(inicial = '') {
      const g = this._gen;
      this._step = 'ESCOLHENDO_DIAMANTES';
      this._add('bot', `Quantos <strong>diamantes</strong> você quer? O mínimo é <strong>${MIN}</strong>.`);
      const w = this._bloco(`
        <div class="lbl">Escolha ou digite</div>
        <div class="chips">${RAPIDOS.map(n => `<button type="button" class="chip" data-q="${n}">${num(n)}</button>`).join('')}</div>
        <label class="field"><span>Quantidade de diamantes</span><input data-qtd inputmode="numeric" autocomplete="off" maxlength="6" placeholder="Ex.: 1000"></label>
        <div class="preco"><span class="small">Total a pagar</span><strong data-preco>—</strong></div>
        <div class="inline-erro" data-erro role="alert" hidden></div>
        <p class="small">Esse é o valor do PIX. Mínimo de 100 diamantes.</p>
        <button type="button" class="btn full" data-ir disabled>Continuar</button>`);
      const qtd = w.querySelector('[data-qtd]');
      const preco = w.querySelector('[data-preco]');
      const erroEl = w.querySelector('[data-erro]');
      const ir = w.querySelector('[data-ir]');
      let timer = null, seq = 0, valido = null;

      const marcarChips = n => w.querySelectorAll('.chip').forEach(c => c.classList.toggle('on', Number(c.dataset.q) === n));
      const atualizar = () => {
        // A sequência sobe JÁ: se o valor mudar (ou o campo esvaziar), a resposta em voo não vale mais.
        const meu = ++seq;
        clearTimeout(timer); ir.disabled = true; valido = null;
        const n = parseInt(qtd.value, 10) || 0;
        marcarChips(n);
        erroEl.hidden = true;
        if (!n) { preco.textContent = '—'; return; }
        if (n < MIN) { preco.textContent = '—'; erroEl.textContent = `O mínimo é ${MIN} diamantes.`; erroEl.hidden = false; return; }
        if (n > MAX) { preco.textContent = '—'; erroEl.textContent = `O máximo por pedido é ${num(MAX)} diamantes.`; erroEl.hidden = false; return; }
        preco.textContent = '…';
        timer = setTimeout(async () => {
          const r = await this._chamar('/get-price', { diamantes: n });
          if (!this._ok(g) || meu !== seq) return;
          if (!r.ok || !(r.json.valor > 0)) { preco.textContent = '—'; erroEl.textContent = this._msgErro(r, 'Não consegui calcular o valor agora.'); erroEl.hidden = false; return; }
          preco.textContent = brl(r.json.valor);
          valido = { n, valor: r.json.valor };
          ir.disabled = false;
        }, 350);
      };
      qtd.addEventListener('input', () => { qtd.value = qtd.value.replace(/\D/g, '').slice(0, 6); atualizar(); });
      qtd.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); if (!ir.disabled) ir.click(); } });
      w.querySelectorAll('.chip').forEach(c => c.addEventListener('click', () => { qtd.value = c.dataset.q; atualizar(); }));
      ir.addEventListener('click', () => {
        if (!valido || !this._ok(g)) return;
        this._diamantes = valido.n; this._valor = valido.valor;
        w.querySelectorAll('input,button').forEach(el => { el.disabled = true; });
        this._add('user', `${num(valido.n)} diamantes`);
        this._criarOrdem();
      });
      if (inicial) { qtd.value = String(inicial); atualizar(); }
      qtd.focus({ preventScroll: true });
    }

    // ── passo 3: cria o pedido ───────────────────────────────────
    async _criarOrdem() {
      const g = this._gen;
      this._step = 'CRIANDO_ORDEM';
      const dig = this._digitando();
      const r = await this._chamar('/create-order', { kwai_id: this._perfil.kwai_id, diamantes: this._diamantes });
      dig.remove();
      if (!this._ok(g)) return;
      if (!r.ok || !r.json.order_no) {
        this._add('erro', `${ico('alert')} ${esc(this._msgErro(r, 'Não foi possível criar o pedido agora.'))}`);
        this._botoes([
          { html: `${ico('refresh')} Tentar de novo`, fn: () => { if (this._ok(g)) this._calculadora(this._diamantes); } },
          { html: 'Recomeçar', cls: 'sec', fn: () => this.reiniciar() },
        ]);
        return;
      }
      this._orderNo = r.json.order_no;
      this._ticket = String(r.json.ticket || '');
      this._pedirPagamento();
    }

    // ── passo 4: link do pagamento ───────────────────────────────
    // Nome e CPF são pedidos pelo provedor, na página dele. Aqui não coletamos nada disso.
    async _pedirPagamento() {
      const g = this._gen;
      this._step = 'GERANDO_PAGAMENTO';
      this._add('bot', `Pedido <strong>#${esc(this._orderNo)}</strong> criado: ${num(this._diamantes)} diamantes${this._valor ? ` · ${brl(this._valor)}` : ''}.`);
      const dig = this._digitando();
      const r = await this._chamar('/pay-link', { order_no: this._orderNo, ticket: this._ticket });
      dig.remove();
      if (!this._ok(g)) return;
      if (!r.ok || !r.json.pay_url) {
        this._add('erro', `${ico('alert')} ${esc(this._msgErro(r, 'Não foi possível abrir o pagamento agora.'))}`);
        this._botoes([
          { html: `${ico('refresh')} Tentar de novo`, fn: () => { if (this._ok(g)) this._pedirPagamento(); } },
          { html: 'Recomeçar', cls: 'sec', fn: () => this.reiniciar() },
        ]);
        return;
      }
      this._mostrarPagamento(r.json);
    }

    // ── passo 5: acompanhamento do pagamento ─────────────────────
    _mostrarPagamento(d) {
      const g = this._gen;
      this._step = 'AGUARDANDO_PAGAMENTO';
      this._humor('neutro');
      const url = typeof d.pay_url === 'string' && /^https:\/\//i.test(d.pay_url) ? d.pay_url : '';
      // Endereço que não serve (veio vazio ou fora de https): sem ele não há o que pagar, então em
      // vez de deixar o cliente num "aguardando" que nunca sai, devolvemos o pedido de novo.
      if (!url) {
        this._step = 'FALHOU';
        this._add('erro', `${ico('alert')} Não recebemos o endereço de pagamento.`);
        this._botoes([
          { html: `${ico('refresh')} Tentar de novo`, fn: () => { if (this._ok(g)) this._pedirPagamento(); } },
          { html: 'Recomeçar', cls: 'sec', fn: () => this.reiniciar() },
        ]);
        return;
      }
      this._add('bot', 'Tudo pronto. Para pagar, abra a página segura do provedor:');
      // O pagamento NÃO abre numa moldura aqui dentro, e isso é de propósito: a página do parceiro
      // manda o cliente pra outro domínio (pay.dlocal.com) depois do nome e do CPF, e de fora do
      // frame não dá pra acompanhar essa troca — a barra que mostrasse o endereço continuaria
      // dizendo o host antigo justo na hora de digitar o CPF. Em outra aba quem mostra o endereço
      // é o navegador, que não mente. O chat continua consultando o status e avisa aqui quando cair.
      const w = this._bloco(`
        <a class="btn" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${ico('ext')} Abrir pagamento</a>
        <p class="small">${ico('lock')}Abre em outra aba, no site do provedor de pagamento (<strong>${esc(hostDe(url))}</strong>). Lá você confirma o pedido, informa <strong>nome e CPF</strong> e paga o PIX. Confira o endereço e o valor antes de pagar — o resultado aparece aqui.</p>
        <div class="stt" data-stt role="status"><span class="spin"></span><span data-stt-t>Aguardando o pagamento…</span></div>`);
      this._wPag = w;
      this._focarProx = true;           // o formulário sumiu: foco vai pro "Já paguei"
      this._acoesPagamento(g);
      this._pollN = 0; this._falhasPoll = 0;
      this._agendarPoll(g);
    }
    _acoesPagamento(g) {
      this._acoes = this._botoes([
        { html: `${ico('refresh')} Já paguei`, fn: () => { this._acoesPagamento(g); this._checar(g, true); } },
        { html: 'Parar de acompanhar', cls: 'sec', fn: () => {
          this._pararPoll();
          this._pedidoSeq++;                 // invalida qualquer consulta em voo
          this._step = 'ENCERRADO';
          this._encerrarPagamento('Acompanhamento encerrado');
          // Não há como cancelar o pedido no parceiro: ser honesto sobre isso.
          this._add('bot', `Acompanhamento encerrado. O pedido <strong>#${esc(this._orderNo)}</strong> continua em aberto no parceiro até expirar — se você pagar depois, fale com o suporte com esse número.`);
          this._fim();
        } },
      ]);
    }
    // Durante a troca o pedido antigo ainda pode ser aceito pelo parceiro, então o código sai de alcance
    // ANTES de pedir a troca — e volta se a troca falhar.
    _congelarPagamento(congelar) {
      const w = this._wPag;
      if (!w || !w.isConnected) return;
      w.querySelectorAll('.qr, .code, [data-copiar], a.btn').forEach(el => {
        el.style.opacity = congelar ? '.35' : '';
        el.style.pointerEvents = congelar ? 'none' : '';
        if (el.tagName === 'BUTTON') el.disabled = congelar;
        if (el.tagName === 'A') {
          // pointer-events não impede Enter com o link focado: tirar o href é o que bloqueia de fato
          if (congelar) { el.dataset.href = el.href; el.removeAttribute('href'); }
          else if (el.dataset.href) { el.href = el.dataset.href; delete el.dataset.href; }
          el.setAttribute('aria-disabled', String(congelar));
        }
        // o código copiável sai da ordem de tabulação enquanto está congelado
        if (el.classList.contains('code')) { if (congelar) el.setAttribute('tabindex', '-1'); else el.setAttribute('tabindex', '0'); }
      });
    }
    // Tira do ar as instruções de pagamento de um pedido que não vale mais (trocado/encerrado),
    // pra ninguém pagar um PIX que o chat parou de acompanhar.
    _encerrarPagamento(texto) {
      const w = this._wPag;
      if (!w || !w.isConnected) return;
      this._setStt(texto, true);
      // Sai tudo que só servia pra pagar: link, código e o aviso de como pagar no provedor.
      w.querySelectorAll('.qr, .code, [data-copiar], a.btn, .lbl, .small').forEach(el => el.remove());
      this._acoes?.remove();
      this._wPag = null;
    }
    _setStt(texto, parado = false) {
      if (!this._wPag || !this._wPag.isConnected) return;
      const t = this._wPag.querySelector('[data-stt-t]'); if (t) t.textContent = texto;
      const sp = this._wPag.querySelector('.spin'); if (sp) sp.style.display = parado ? 'none' : '';
    }
    _pararPoll() { clearTimeout(this._pollTimer); this._pollTimer = null; }
    _agendarPoll(g) {
      this._pararPoll();
      const n = this._pollN;
      if (n >= 240) { this._setStt('Ainda aguardando. Clique em "Já paguei" para verificar de novo.', true); return; }
      const espera = n < 36 ? 5000 : n < 120 ? 10000 : 20000;
      this._pollTimer = setTimeout(() => this._checar(g, false), espera);
    }
    async _checar(g, manual) {
      if (!this._ok(g) || this._step !== 'AGUARDANDO_PAGAMENTO') return;
      this._pararPoll();
      if (manual) this._setStt('Verificando…');
      this._pollN++;
      // Guarda qual pedido está sendo consultado: se trocar de pedido no meio, a resposta velha não vale
      // (senão um "PAGO" do pedido antigo concluiria o novo).
      const seqPedido = this._pedidoSeq, pedido = this._orderNo;
      const r = await this._chamar('/check-status', { order_no: pedido, ticket: this._ticket });
      if (!this._ok(g) || this._step !== 'AGUARDANDO_PAGAMENTO' || seqPedido !== this._pedidoSeq || pedido !== this._orderNo) return;
      if (!r.ok) {
        this._falhasPoll++;
        if (this._falhasPoll >= 3 || manual) this._setStt(r.rede ? 'Sem conexão. Tentando de novo…' : 'Não consegui consultar agora. Tentando de novo…');
        this._agendarPoll(g); return;
      }
      this._falhasPoll = 0;
      const s = r.json.status;
      if (s === 'PAGO') return this._concluir();
      if (s === 'FALHOU') return this._falhou();
      if (s === 'DESCONHECIDO') this._setStt('Seu pedido está em processamento. Se já pagou, aguarde alguns minutos.');
      else this._setStt('Aguardando o pagamento…');
      this._agendarPoll(g);
    }
    // ── final ────────────────────────────────────────────────────
    _concluir() {
      this._pararPoll();
      this._step = 'CONCLUIDO';
      this._pedidoSeq++;
      this._encerrarPagamento('Pagamento confirmado');
      this._add('ok', `${ico('check')} <strong>Pagamento confirmado!</strong> Estamos creditando <strong>${num(this._diamantes)} diamantes</strong> em <strong>${esc(this._perfil?.nome || this._perfil?.kwai_id || 'sua conta')}</strong>. Costuma levar poucos minutos.`);
      this._fim();
    }
    _falhou() {
      this._pararPoll();
      this._step = 'FALHOU';
      this._pedidoSeq++;
      this._encerrarPagamento('Pedido não concluído');
      this._add('erro', `${ico('alert')} O pedido <strong>#${esc(this._orderNo)}</strong> não foi concluído. Se você pagou, fale com o suporte informando esse número.`);
      this._fim();
    }
    _fim() {
      const g = this._gen;
      this._entrada(false, 'Recarga finalizada');
      this._focarProx = true;
      const suporte = this.getAttribute('data-suporte-url') || '';
      const itens = [{ html: `${ico('refresh')} Nova recarga`, fn: () => { if (this._ok(g)) this.reiniciar(); } }];
      if (/^https:\/\//i.test(suporte)) itens.push({ html: `${ico('help')} Falar com o suporte`, cls: 'sec', href: suporte });
      this._botoes(itens);
    }
  }

  if (!customElements.get('dmaior-recarga')) customElements.define('dmaior-recarga', DmaiorRecarga);
})();
