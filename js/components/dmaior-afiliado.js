/* eslint-env browser */
// ============================================================
//  DMaior Agency — Custom Element: <dmaior-afiliado>
//  Programa de indicações DENTRO do painel do streamer (aba "Indicações"):
//  o próprio streamer ativa a participação, divulga o link, convida pessoas,
//  acompanha os indicados (diamantes e horas de vídeo/áudio), vê o ranking dos
//  SEUS indicados e o bônus calculado pelo servidor.
//
//  Visual: segue o padrão oficial do painel/site (tokens --dm-* herdados do
//  css/global.css, cards de 20px, Rajdhani/Exo 2, 4 temas) e a estrutura do layout
//  de referência (banner, faixa de aviso, abas em pílula, busca + cartão do perfil,
//  pódio 2-1-3 + lista numerada, selo de período/contagem/regras).
//
//  Dados: lê dm_uid/dm_token/dm_refresh do localStorage e fala com o Worker admin
//  (rotas /afiliado/*). Só estatística (diamantes/horas) — nada de acompanhar lives.
// ============================================================
class DmaiorAfiliado extends HTMLElement {
  static get observedAttributes() { return ['worker-url']; }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._workerUrl = '';
    this._refreshUrl = 'https://dashboard.agencydmaior.com.br';
    this._uid = '';
    this._token = '';
    this._refreshToken = '';
    this._iniciado = false;
    this._carregando = true;
    this._erro = null;
    this._d = null;              // resposta de /afiliado/resumo
    this._st = null;             // resposta de /afiliado/status (já sou afiliado? posso ativar?)
    this._aceiteAtivar = false;
    this._msgAtivar = null;
    this._aba = 'convidar';      // convidar | ranking | indicados | bonus
    this._periodo = 'atual';     // atual | anterior | historico
    this._rankCat = 'diamantes'; // diamantes | horas_total | horas_video | horas_audio
    this._regrasAberto = false;
    this._perfilConvite = null;  // resultado da verificação
    this._msgConvite = null;     // { tipo, texto }
    this._msgGeral = null;       // aviso de falha em ações da tela principal (pausar/reativar)
    this._cdTimer = null;
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (name === 'worker-url' && newVal && newVal !== oldVal) this._workerUrl = newVal.replace(/\/+$/, '');
  }

  connectedCallback() {
    this._workerUrl = (this.getAttribute('worker-url') || '').replace(/\/+$/, '');
    this._lerSessao();
    this._syncThemeHost();
    this._render();
    if (this._isLoggedIn()) this._iniciar();
    this._storageThemeHandler = (e) => { if (e.key === 'dm_tema') this._syncThemeHost(); };
    this._themeHandler = () => this._syncThemeHost();
    window.addEventListener('storage', this._storageThemeHandler);
    window.addEventListener('dmaior:tema', this._themeHandler);
  }

  disconnectedCallback() {
    window.removeEventListener('storage', this._storageThemeHandler);
    window.removeEventListener('dmaior:tema', this._themeHandler);
    this._pararContagem();
  }

  _lerSessao() {
    const antes = this._uid;
    this._uid = localStorage.getItem('dm_uid') || '';
    // Trocou de conta (logout/login de outro streamer): nada da conta anterior pode aparecer.
    if (antes && antes !== this._uid) {
      this._d = null; this._st = null; this._iniciado = false; this._carregando = true; this._erro = null;
      this._perfilConvite = null; this._msgConvite = null; this._msgAtivar = null; this._msgGeral = null;
      this._aceiteAtivar = false; this._aba = 'convidar'; this._periodo = 'atual'; this._regrasAberto = false;
    }
    this._token = localStorage.getItem('dm_token') || '';
    this._refreshToken = localStorage.getItem('dm_refresh') || '';
  }

  _syncThemeHost() {
    let tema = 'original';
    try { tema = localStorage.getItem('dm_tema') || 'original'; } catch (_) {}
    if (tema === 'original') this.removeAttribute('data-theme');
    else this.setAttribute('data-theme', tema);
  }

  // Chamado por dmaior-app.js ao abrir a aba.
  verificarSessao() {
    this._lerSessao();
    if (!this._isLoggedIn()) return;
    if (!this._iniciado) this._iniciar();
    else this._carregar(); // reabrir a aba atualiza os números
  }

  _isLoggedIn() { return !!(this._uid && this._token); }

  // ── rede ─────────────────────────────────────────────────────
  async _renovarToken() {
    if (!this._refreshToken) return false;
    try {
      const res = await fetch(`${this._refreshUrl}/api/refresh`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: this._refreshToken }),
      });
      if (!res.ok) return false;
      const data = await res.json();
      if (data.token) { this._token = data.token; localStorage.setItem('dm_token', data.token); }
      if (data.refresh_token) { this._refreshToken = data.refresh_token; localStorage.setItem('dm_refresh', data.refresh_token); }
      return true;
    } catch (_) { return false; }
  }

  async _api(path, opts = {}) {
    const fazer = () => fetch(`${this._workerUrl}${path}`, {
      ...opts, headers: { 'Content-Type': 'application/json', ...(opts.headers || {}), Authorization: `Bearer ${this._token}` },
    });
    let res = await fazer();
    if (res.status === 401 && await this._renovarToken()) res = await fazer();
    const json = await res.json().catch(() => ({}));
    return { status: res.status, ok: res.ok, json };
  }

  _mesParam() {
    if (this._periodo === 'historico') return 'historico';
    if (this._periodo === 'atual') return '';
    const d = new Date(Date.now() - 3 * 3600000); // Fortaleza
    d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth() - 1);
    return d.toISOString().slice(0, 7);
  }

  async _iniciar() {
    this._iniciado = true;
    await this._carregar();
  }

  async _carregar() {
    this._carregando = !this._d;
    this._erro = null;
    this._renderConteudo();
    try {
      const st = await this._api(`/afiliado/status?uid=${encodeURIComponent(this._uid)}`);
      if (!st.ok) throw new Error(st.json?.erro || 'erro');
      this._st = st.json;
      if (!this._st.afiliado) { this._d = null; return; }   // ainda não ativou: mostra a tela "Seja um afiliado"
      const mes = this._mesParam();
      const r = await this._api(`/afiliado/resumo?uid=${encodeURIComponent(this._uid)}${mes ? `&mes=${encodeURIComponent(mes)}` : ''}`);
      if (!r.ok) throw new Error(r.json?.erro || 'erro');
      this._d = r.json;
    } catch (_) {
      this._erro = 'Não foi possível carregar suas indicações agora. Tente novamente em instantes.';
    } finally {
      this._carregando = false;
      this._renderConteudo();
    }
  }

  // ── utilitários ──────────────────────────────────────────────
  _esc(v) { return String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  _num(n) { return Number(n || 0).toLocaleString('pt-BR'); }
  _dec(n) { return Number(n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  _brl(n) { return Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }
  _data(iso) { if (!iso) return '—'; try { return new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'America/Fortaleza' }); } catch (_) { return '—'; } }
  _foto(url, w = 120) { return url ? `https://images.weserv.nl/?url=${encodeURIComponent(url)}&w=${w}&h=${w}&fit=cover&output=webp` : ''; }
  _avatar(nome, foto, cls = 'avatar') {
    const ini = this._esc(String(nome || '?').trim().charAt(0).toUpperCase() || '?');
    const src = this._foto(foto);
    return `<span class="${cls}"><b>${ini}</b>${src ? `<img src="${this._esc(src)}" alt="" loading="lazy" onerror="this.remove()">` : ''}</span>`;
  }
  _ico(n) {
    const p = {
      copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
      link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
      users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
      userplus: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6"/><path d="M22 11h-6"/>',
      trophy: '<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>',
      gem: '<path d="M6 3h12l4 6-10 13L2 9Z"/><path d="M11 3 8 9l4 13 4-13-3-6"/><path d="M2 9h20"/>',
      clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
      cal: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/>',
      check: '<polyline points="20 6 9 17 4 12"/>',
      send: '<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
      refresh: '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
      alert: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
      search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
      ext: '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
      coin: '<circle cx="12" cy="12" r="10"/><path d="M12 6v12"/><path d="M15 9.5a3 3 0 0 0-3-1.5c-1.7 0-3 .9-3 2.2s1.3 1.8 3 2.1 3 .9 3 2.2-1.3 2.2-3 2.2a3 3 0 0 1-3-1.5"/>',
      video: '<path d="m22 8-6 4 6 4V8Z"/><rect x="2" y="6" width="14" height="12" rx="2"/>',
      mic: '<path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><path d="M12 19v3"/>',
      book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"/>',
    }[n] || '';
    return `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true">${p}</svg>`;
  }

  // ── contagem regressiva até o fim do mês (selo do ranking, como no layout de referência) ──
  _pararContagem() { if (this._cdTimer) { clearInterval(this._cdTimer); this._cdTimer = null; } }
  _textoContagem() {
    const f = Date.now() - 3 * 3600000;                 // relógio de Fortaleza (UTC-3, sem horário de verão)
    const d = new Date(f);
    const fim = Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1);
    let s = Math.max(0, Math.floor((fim - f) / 1000));
    const dias = Math.floor(s / 86400); s %= 86400;
    const p = n => String(n).padStart(2, '0');
    return `${p(dias)}d ${p(Math.floor(s / 3600))}:${p(Math.floor((s % 3600) / 60))}:${p(s % 60)}`;
  }
  _iniciarContagem() {
    this._pararContagem();
    const el = this.shadowRoot.getElementById('cdTxt');
    if (!el) return;
    el.textContent = this._textoContagem();
    this._cdTimer = setInterval(() => {
      const e = this.shadowRoot.getElementById('cdTxt');
      if (!e) { this._pararContagem(); return; }
      e.textContent = this._textoContagem();
    }, 1000);
  }

  // ── render ───────────────────────────────────────────────────
  _render() {
    this.shadowRoot.innerHTML = `
    <style>
      /* Tokens: herdam os --dm-* do css/global.css (4 temas do site); o fallback é o tema escuro oficial. */
      :host{ display:block; width:100%;
        --c-cyan:var(--dm-cyan,#00d4d4); --c-gold:var(--dm-gold,#f0c040); --c-green:var(--dm-green,#4ade80); --c-red:var(--dm-red,#f87171);
        --c-text:var(--dm-text,#e2e8f0); --c-sub:var(--dm-text-sub,#a0b8c8); --c-muted:var(--dm-text-muted,#7a9ab4);
        --c-border:var(--dm-border,rgba(0,212,212,.15));
        --c-card:var(--dm-grad-card,linear-gradient(160deg,#1a1a2e 0%,#12121f 100%));
        --c-solid:var(--dm-bg-2,#1a1a2e);
        --c-tint:var(--dm-cyan-10,rgba(0,212,212,.10));
        --c-row:var(--dm-bg-tint,rgba(0,0,0,.20));
        --c-grad:var(--dm-grad-effect,linear-gradient(135deg,#3b82f6,#00d4d4));
        --c-glow:var(--dm-effect-glow,rgba(59,130,246,.28));
        --pd1:#f0c040; --pd2:#3b82f6; --pd3:#a86c31;
        font-family:var(--dm-font-body,'Exo 2',sans-serif); color:var(--c-text); font-size:calc(16px * var(--dm-font-scale,1)); }
      :host([data-theme="branco"]){ --pd1:#b8860b; --pd2:#0369a1; --pd3:#7c5000; }
      :host([data-theme="rosa"]){ --pd1:#c2185b; --pd2:#e91e8c; --pd3:#880040; }
      :host([data-theme="laranja"]){ --pd1:#ea580c; --pd2:#f97316; --pd3:#92400e; }
      *{ box-sizing:border-box; margin:0; padding:0; }
      .wrap{ max-width:640px; margin:0 auto; padding:2px 0 40px; }
      .ico{ width:1em; height:1em; display:inline-block; vertical-align:-.15em; flex-shrink:0; stroke:currentColor; stroke-width:2; fill:none; stroke-linecap:round; stroke-linejoin:round; }
      .raaj{ font-family:var(--dm-font-title,'Rajdhani',sans-serif); text-transform:uppercase; letter-spacing:.04em; }

      /* Banner */
      .hero{ position:relative; overflow:hidden; border-radius:20px; padding:20px 22px; margin-bottom:12px; background:var(--c-grad); color:#fff; min-height:112px; display:flex; flex-direction:column; justify-content:center; gap:4px; box-shadow:0 8px 28px var(--c-glow); }
      .hero::before{ content:''; position:absolute; width:220px; height:220px; right:-60px; top:-90px; border-radius:50%; background:radial-gradient(circle,rgba(255,255,255,.28),transparent 65%); }
      .hero::after{ content:''; position:absolute; width:160px; height:160px; left:-50px; bottom:-90px; border-radius:50%; background:radial-gradient(circle,rgba(255,255,255,.18),transparent 65%); }
      .hero h2{ position:relative; z-index:1; font-family:var(--dm-font-title,'Rajdhani',sans-serif); font-weight:700; font-size:1.7rem; line-height:1.05; text-transform:uppercase; letter-spacing:.04em; text-shadow:0 2px 8px rgba(0,0,0,.28); max-width:80%; }
      .hero p{ position:relative; z-index:1; font-size:.86rem; line-height:1.4; text-shadow:0 1px 4px rgba(0,0,0,.25); max-width:82%; }
      .hero .hero-ico{ position:absolute; z-index:1; right:18px; top:50%; transform:translateY(-50%); width:76px; height:76px; opacity:.35; stroke-width:1.6; }

      /* Faixa de aviso rolando (como no layout de referência) */
      .marquee{ overflow:hidden; white-space:nowrap; border-radius:999px; padding:7px 0; margin-bottom:12px; background:var(--c-tint); border:1px solid var(--c-border); }
      .marquee-content{ display:inline-block; padding-left:100%; animation:marq 22s linear infinite; animation-delay:-7s; font-size:.78rem; font-weight:600; color:var(--c-cyan); }
      @keyframes marq{ 0%{transform:translateX(0)} 100%{transform:translateX(-100%)} }
      @media (prefers-reduced-motion:reduce){ .marquee-content{ animation:none; padding-left:12px; display:block; overflow:hidden; text-overflow:ellipsis; } }

      /* Abas em pílula */
      .tabs{ display:flex; gap:2px; background:var(--c-card); border:2px solid var(--c-border); border-radius:999px; padding:4px; margin-bottom:14px; overflow-x:auto; scrollbar-width:none; }
      .tabs::-webkit-scrollbar{ display:none; }
      .tab{ flex:1; min-width:max-content; display:flex; align-items:center; justify-content:center; gap:6px; padding:10px 12px; border:none; border-radius:999px; background:transparent; color:var(--c-cyan); font-family:var(--dm-font-title,'Rajdhani',sans-serif); font-weight:700; font-size:.9rem; letter-spacing:.03em; text-transform:uppercase; cursor:pointer; transition:.25s; }
      .tab.on{ background:var(--c-grad); color:#000; box-shadow:inset 0 3px 5px rgba(255,255,255,.4), 0 3px 8px var(--c-glow); }
      @media(max-width:520px){ .tab .ico{ display:none; } .tab{ padding:9px 6px; font-size:.82rem; } .tab .lg{ display:none; } }
      @media(min-width:521px){ .tab .sm{ display:none; } }

      /* Cartões — mesmo padrão do .card do painel */
      .card{ width:100%; background:var(--c-card); border:1px solid var(--c-border); border-radius:20px; padding:18px; margin-bottom:14px; box-shadow:0 8px 32px rgba(0,0,0,.3); min-width:0; }
      .card-h{ font-family:var(--dm-font-title,'Rajdhani',sans-serif); font-weight:700; font-size:.95rem; text-transform:uppercase; letter-spacing:.04em; color:var(--c-text); margin-bottom:12px; display:flex; align-items:center; gap:8px; }
      .card-h .ico{ color:var(--c-cyan); width:18px; height:18px; }
      .nota{ font-size:.74rem; color:var(--c-sub); line-height:1.55; margin-top:10px; }
      .lbl{ font-size:.68rem; color:var(--c-muted); text-transform:uppercase; letter-spacing:.08em; font-weight:700; }
      .loading,.erro-box{ display:flex; align-items:center; justify-content:center; gap:10px; padding:40px 0; color:var(--c-sub); font-size:.9rem; }
      .erro-box{ color:var(--c-red); }
      .spin{ width:22px; height:22px; border:2px solid var(--c-tint); border-top-color:var(--c-cyan); border-radius:50%; animation:sp .7s linear infinite; }
      @keyframes sp{ to{ transform:rotate(360deg); } }
      .vazio{ text-align:center; color:var(--c-sub); padding:26px 10px; font-size:.88rem; line-height:1.5; }
      .aviso{ display:flex; gap:10px; align-items:flex-start; padding:12px 14px; border-radius:14px; border:1px solid var(--c-gold); background:var(--dm-gold-10,rgba(240,192,64,.10)); color:var(--c-text); font-size:.84rem; line-height:1.45; margin-bottom:12px; }
      .aviso .ico{ color:var(--c-gold); width:18px; height:18px; margin-top:1px; }
      .msg{ padding:10px 13px; border-radius:12px; font-size:.84rem; line-height:1.45; margin-top:12px; border:1px solid; }
      .msg.ok{ color:var(--c-green); border-color:var(--c-green); background:rgba(74,222,128,.08); }
      .msg.err{ color:var(--c-red); border-color:var(--c-red); background:rgba(248,113,113,.08); }
      .msg.warn{ color:var(--c-gold); border-color:var(--c-gold); background:rgba(240,192,64,.08); }

      /* Botões — mesmo padrão do painel (.btn / .btn-sm) */
      .btn{ display:inline-flex; align-items:center; justify-content:center; gap:7px; padding:11px 18px; border-radius:999px; border:1px solid var(--c-border); background:var(--c-grad); color:#000; font-family:var(--dm-font-title,'Rajdhani',sans-serif); font-weight:700; font-size:.9rem; letter-spacing:.03em; text-transform:uppercase; cursor:pointer; text-decoration:none; white-space:nowrap; box-shadow:inset 0 3px 5px rgba(255,255,255,.35), 0 3px 10px var(--c-glow); transition:.2s; }
      .btn:hover{ transform:translateY(-1px); }
      .btn[disabled]{ background:var(--c-row); color:var(--c-muted); box-shadow:none; cursor:not-allowed; transform:none; opacity:.7; }
      .btn.ghost{ background:none; color:var(--c-cyan); box-shadow:none; }
      .btn.ghost:hover{ background:var(--c-tint); }
      .btn.kwai{ background:linear-gradient(to bottom,#ff8a00,#e65c00); color:#fff; border-color:rgba(255,138,0,.5); box-shadow:inset 0 3px 5px rgba(255,255,255,.4), 0 3px 8px rgba(230,92,0,.3); }
      .btn.mini{ padding:4px 12px; font-size:.7rem; }
      .btn.ok{ color:var(--c-green); border-color:var(--c-green); background:rgba(74,222,128,.12); box-shadow:none; }
      .chip{ padding:7px 14px; border-radius:999px; border:1px solid var(--c-border); background:transparent; color:var(--c-sub); font-size:.78rem; font-family:inherit; cursor:pointer; display:inline-flex; align-items:center; gap:6px; }
      .chip.on{ border-color:var(--c-cyan); color:var(--c-cyan); background:var(--c-tint); }
      .chips{ display:flex; gap:6px; flex-wrap:wrap; margin-bottom:14px; }

      /* Linha de selos (período / contagem / regras) */
      .info-row{ display:flex; justify-content:space-between; align-items:center; gap:8px; flex-wrap:wrap; margin-bottom:14px; }
      .time-group{ display:flex; gap:8px; flex-wrap:wrap; }
      .badge-time{ display:inline-flex; align-items:center; gap:6px; padding:7px 13px; border-radius:999px; background:var(--c-card); border:1px solid var(--c-border); color:var(--c-text); font-size:.74rem; font-weight:700; font-family:inherit; }
      .badge-time .ico{ color:var(--c-cyan); width:14px; height:14px; }
      select.badge-time{ appearance:none; cursor:pointer; padding-right:14px; }
      select.badge-time option{ background:var(--c-solid); color:var(--c-text); }
      .btn-regras{ padding:7px 16px; font-size:.78rem; }

      /* Link do afiliado */
      .link-row{ display:flex; gap:8px; align-items:center; margin-top:6px; }
      .link-row input{ flex:1; min-width:0; background:var(--c-row); border:1px solid var(--c-border); border-radius:999px; color:var(--c-text); padding:10px 14px; font-size:.82rem; font-family:inherit; outline:none; }

      /* Busca + cartão do perfil (layout de referência) */
      .search-box{ display:flex; align-items:center; gap:8px; background:var(--c-card); border:2px solid var(--c-border); border-radius:999px; padding:5px 5px 5px 18px; margin-bottom:14px; }
      .search-box input{ flex:1; min-width:0; border:none; background:transparent; outline:none; color:var(--c-text); font-size:.92rem; font-family:inherit; }
      .search-box input::placeholder{ color:var(--c-muted); }
      .perfil{ display:flex; flex-direction:column; gap:14px; align-items:stretch; }
      .perfil-top{ display:flex; gap:14px; align-items:center; }
      .perfil-nome{ font-family:var(--dm-font-title,'Rajdhani',sans-serif); font-weight:700; font-size:1.05rem; text-transform:uppercase; letter-spacing:.03em; line-height:1.2; }
      .idrow{ display:flex; align-items:center; gap:8px; font-size:.8rem; color:var(--c-sub); margin-top:5px; flex-wrap:wrap; }
      .idrow strong{ color:var(--c-text); }
      .action-row{ display:flex; gap:10px; flex-wrap:wrap; align-items:center; }
      .action-row .btn{ flex:1; min-width:140px; }
      select.sel{ appearance:none; background:var(--c-row); border:1px solid var(--c-border); border-radius:999px; color:var(--c-text); padding:11px 18px; font-family:inherit; font-size:.84rem; cursor:pointer; flex:1; min-width:140px; }
      select.sel option{ background:var(--c-solid); color:var(--c-text); }

      /* Avatares */
      .avatar{ position:relative; width:64px; height:64px; border-radius:50%; overflow:hidden; background:var(--c-tint); border:3px solid var(--c-border); display:inline-flex; align-items:center; justify-content:center; flex-shrink:0; }
      .avatar b{ font-family:var(--dm-font-title,'Rajdhani',sans-serif); color:var(--c-cyan); font-size:1.3rem; }
      .avatar img{ position:absolute; inset:0; width:100%; height:100%; object-fit:cover; }
      .avatar.sm{ width:50px; height:50px; border-width:2px; }

      /* Pódio 2-1-3 (layout de referência; cores do ranking do site) */
      .podium{ display:flex; align-items:flex-end; justify-content:center; padding:0 4px; height:200px; margin:52px 0 12px; }
      .pod-col{ flex:1; max-width:168px; display:flex; flex-direction:column; align-items:center; position:relative; }
      .avatar-wrap{ position:relative; width:100%; display:flex; justify-content:center; margin-bottom:-26px; z-index:10; }
      .pod-col .avatar{ width:66px; height:66px; border:4px solid var(--c-solid); }
      .col-1 .avatar{ width:86px; height:86px; }
      .base{ width:100%; border-radius:15px 15px 0 0; display:flex; flex-direction:column; align-items:center; gap:4px; padding:32px 4px 10px; z-index:1; }
      .col-2 .base{ height:112px; background:linear-gradient(to bottom,var(--pd2) 0%,transparent 100%); }
      .col-1 .base{ height:146px; background:linear-gradient(to bottom,var(--pd1) 0%,transparent 100%); }
      .col-3 .base{ height:96px; background:linear-gradient(to bottom,var(--pd3) 0%,transparent 100%); }
      .pod-nome{ font-family:var(--dm-font-title,'Rajdhani',sans-serif); font-weight:700; font-size:.86rem; text-transform:uppercase; max-width:96%; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; color:var(--c-text); }
      .chip-w{ display:inline-flex; align-items:center; gap:4px; padding:2px 9px; border-radius:10px; background:var(--c-solid); border:1px solid var(--c-border); font-size:.72rem; font-weight:700; color:var(--c-text); box-shadow:0 2px 5px rgba(0,0,0,.18); white-space:nowrap; }
      .chip-w .ico{ color:var(--c-cyan); width:12px; height:12px; }

      /* Lista numerada / indicados */
      .item{ display:flex; align-items:center; gap:12px; padding:10px 14px; border-radius:15px; background:var(--c-row); border:1px solid var(--c-border); margin-bottom:6px; }
      .item-num{ width:24px; text-align:center; font-family:'Courier New',monospace; font-weight:900; font-size:1rem; color:var(--c-cyan); }
      .item-info{ flex:1; min-width:0; }
      .item-nome{ font-weight:700; font-size:.9rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
      .item-sub{ font-size:.72rem; color:var(--c-sub); margin-top:2px; display:flex; gap:10px; flex-wrap:wrap; align-items:center; }
      .item-sub .ico{ width:12px; height:12px; color:var(--c-cyan); }
      .item-right{ font-family:var(--dm-font-title,'Rajdhani',sans-serif); font-weight:700; font-size:1rem; color:var(--c-cyan); white-space:nowrap; text-align:right; }
      .badge{ display:inline-block; padding:2px 9px; border-radius:999px; font-size:.64rem; font-weight:700; text-transform:uppercase; letter-spacing:.05em; border:1px solid currentColor; white-space:nowrap; }
      .b-ok{ color:var(--c-green); } .b-wait{ color:var(--c-gold); } .b-off{ color:var(--c-red); } .b-mut{ color:var(--c-muted); }

      /* Resumo (cartões de número) */
      .kpis{ display:grid; grid-template-columns:repeat(2,1fr); gap:10px; margin-bottom:14px; }
      .kpi{ background:var(--c-card); border:1px solid var(--c-border); border-radius:16px; padding:12px 14px; }
      .kpi .v{ font-family:var(--dm-font-title,'Rajdhani',sans-serif); font-weight:700; font-size:1.45rem; line-height:1.1; margin-top:3px; }
      .kpi .v.gold{ color:var(--c-gold); }
      .kpi .s{ font-size:.68rem; color:var(--c-sub); margin-top:2px; }
      @media(min-width:480px){ .kpis{ grid-template-columns:repeat(3,1fr); } }

      /* Passos (tela "Seja um afiliado") */
      .passo{ display:flex; gap:12px; align-items:flex-start; padding:12px 0; border-top:1px solid var(--c-border); }
      .passo:first-of-type{ border-top:none; }
      .passo-n{ width:34px; height:34px; border-radius:50%; background:var(--c-grad); color:#000; font-family:var(--dm-font-title,'Rajdhani',sans-serif); font-weight:700; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
      .passo-t{ font-weight:700; font-size:.92rem; }
      .passo-d{ font-size:.78rem; color:var(--c-sub); line-height:1.45; margin-top:2px; }
      .aceite{ display:flex; gap:10px; align-items:flex-start; font-size:.86rem; line-height:1.45; cursor:pointer; }
      .aceite input{ margin-top:3px; accent-color:var(--c-cyan); }

      table{ width:100%; border-collapse:collapse; font-size:.8rem; }
      th{ font-weight:700; color:var(--c-muted); text-align:left; padding:6px; font-size:.68rem; text-transform:uppercase; letter-spacing:.06em; }
      td{ padding:8px 6px; border-top:1px solid var(--c-border); }
      .pausar{ text-align:center; margin-top:18px; }
    </style>
    <div class="wrap" id="raiz"></div>`;
    this._renderConteudo();
  }

  _hero(titulo, sub) {
    return `<div class="hero"><svg class="ico hero-ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg><h2>${titulo}</h2><p>${sub}</p></div>`;
  }

  _faixa(texto) {
    return `<div class="marquee" role="note"><div class="marquee-content">${this._esc(texto)}</div></div>`;
  }

  _renderConteudo() {
    const raiz = this.shadowRoot.getElementById('raiz');
    this._pararContagem();
    if (!raiz) return;
    if (!this._isLoggedIn()) { raiz.innerHTML = `<div class="vazio">Entre na sua conta para ver o programa de indicações.</div>`; return; }
    if (this._carregando) { raiz.innerHTML = `<div class="loading"><span class="spin"></span> Carregando…</div>`; return; }
    if (this._st && !this._st.afiliado && !this._erro) { raiz.innerHTML = this._telaAtivar(); this._ligarAtivar(); return; }
    if (this._erro || !this._d) { raiz.innerHTML = `<div class="erro-box">${this._esc(this._erro || 'Sem dados.')}</div>`; return; }
    const d = this._d;
    const aviso = !d.programa_ativo
      ? `<div class="aviso">${this._ico('alert')}<div><b>Programa de indicações temporariamente indisponível.</b><br>Novos convites e novas indicações por link estão pausados. Seus indicados, resultados, ranking e bônus continuam aqui normalmente.</div></div>`
      : (!d.afiliado_ativo ? (this._st?.pausado_por_voce
          ? `<div class="aviso">${this._ico('alert')}<div style="flex:1"><b>Sua participação está pausada.</b><br>Seu link não registra novas indicações e você não envia convites, mas o histórico continua aqui.<div style="margin-top:8px"><button class="btn mini" id="btnReativar">${this._ico('check')} Reativar participação</button></div></div></div>`
          : `<div class="aviso">${this._ico('alert')}<div>Sua participação foi desativada pela agência. Você ainda consegue consultar o histórico; para voltar, fale com a agência.</div></div>`) : '');
    const abas = [['convidar', '<span class="lg">Enviar convite</span><span class="sm">Convidar</span>', 'send'], ['ranking', 'Ranking', 'trophy'], ['indicados', 'Indicados', 'users'], ['bonus', 'Bônus', 'coin']];
    raiz.innerHTML = `
      ${this._hero('Programa de indicações', 'Convide streamers para a DMAIOR e acompanhe os resultados de quem entrar por você.')}
      ${this._faixa('Quem entrar na agência pelo seu link ou pelo seu convite fica vinculado a você. Acompanhe diamantes, horas de vídeo e de áudio e o bônus calculado pela agência.')}
      ${aviso}
      ${this._msgGeral ? `<div class="msg ${this._msgGeral.tipo}" style="margin:0 0 12px">${this._esc(this._msgGeral.texto)}</div>` : ''}
      <div class="tabs">${abas.map(([k, n, i]) => `<button class="tab ${this._aba === k ? 'on' : ''}" data-aba="${k}">${this._ico(i)} ${n}</button>`).join('')}</div>
      <div id="corpo">${this._corpo()}</div>
      ${d.afiliado_ativo ? `<div class="pausar"><button class="btn ghost mini" id="btnPausar">Pausar minha participação</button></div>` : ''}`;
    this._ligarEventos();
    if (this._aba === 'ranking' && this._periodo === 'atual') this._iniciarContagem();
  }

  _seletorPeriodo() {
    const ops = [['atual', 'Mês atual'], ['anterior', 'Mês anterior'], ['historico', 'Histórico']];
    return `<div class="chips">${ops.map(([k, n]) => `<button class="chip ${this._periodo === k ? 'on' : ''}" data-periodo="${k}">${n}</button>`).join('')}</div>`;
  }

  _corpo() {
    if (this._aba === 'ranking') return this._abaRanking();
    if (this._aba === 'indicados') return this._abaIndicados();
    if (this._aba === 'bonus') return this._abaBonus();
    return this._abaConvidar();
  }

  _kpi(lbl, v, sub = '', cls = '') { return `<div class="kpi"><div class="lbl">${lbl}</div><div class="v ${cls}">${v}</div>${sub ? `<div class="s">${sub}</div>` : ''}</div>`; }

  _situacao(i) {
    if (i.status === 'convidado') return `<span class="badge b-wait">Convite enviado</span>`;
    if (i.status === 'cancelado') return `<span class="badge b-mut" title="${this._esc(i.cancelado_motivo || '')}">Cancelada</span>`;
    if (i.vinculo === 'desligado') return `<span class="badge b-off">Desligado</span>`;
    return `<span class="badge b-ok">Na agência</span>`;
  }

  // ── aba: Enviar convite (busca + cartão + link) ──────────────
  _abaConvidar() {
    const d = this._d;
    const off = !d.programa_ativo || !d.afiliado_ativo;
    const p = this._perfilConvite;
    let card = '';
    if (p && p.perfil) {
      const pf = p.perfil;
      card = `<div class="card perfil">
        <div class="perfil-top">${this._avatar(pf.nome || pf.kwaiId, pf.foto, 'avatar')}
          <div style="min-width:0"><div class="perfil-nome">${this._esc(pf.nome || pf.kwaiId)}</div>
            <div class="idrow"><span>UID: <strong>${this._esc(pf.memberId)}</strong></span><button class="btn mini" data-copiar="${this._esc(pf.memberId)}">${this._ico('copy')} Copiar</button></div>
            <div class="idrow"><span>ID: <strong>${this._esc(pf.kwaiId || '—')}</strong></span><button class="btn mini" data-copiar="${this._esc(pf.kwaiId || '')}">${this._ico('copy')} Copiar</button></div>
          </div></div>
        <div class="action-row">
          ${p.pode_enviar ? `<select class="sel" id="cat"><option value="entretenimento">Entretenimento</option><option value="games">Games</option></select>` : ''}
          ${p.pode_enviar ? `<button class="btn" id="btnEnviar">${this._ico('send')} Enviar convite</button>` : ''}
          ${p.pode_reenviar ? `<button class="btn" id="btnReenviar">${this._ico('refresh')} Reenviar convite</button>` : ''}
          ${pf.kwaiId ? `<a class="btn kwai" target="_blank" rel="noopener noreferrer" href="https://www.kwai.com/@${encodeURIComponent(pf.kwaiId)}">${this._ico('ext')} Ver no Kwai</a>` : ''}
        </div></div>`;
    }
    const msg = p && p.mensagem ? `<div class="msg ${p.pode_enviar || p.pode_reenviar ? 'ok' : 'warn'}" style="margin:0 0 14px">${this._esc(p.mensagem)}</div>` : '';
    const msg2 = this._msgConvite ? `<div class="msg ${this._msgConvite.tipo}" style="margin:0 0 14px">${this._esc(this._msgConvite.texto)}</div>` : '';
    const busca = off
      ? `<div class="card"><div class="vazio" style="padding:8px 0">O envio de convites está indisponível enquanto o programa estiver pausado.</div></div>`
      : `<div class="search-box"><input id="busca" placeholder="Adicionar ID do Kwai ou UID…" autocomplete="off" autocapitalize="off" spellcheck="false"><button class="btn" id="btnVerificar">${this._ico('search')} Verificar</button></div>`;
    return `${busca}${msg}${msg2}${off ? '' : card}
      <div class="card">
        <div class="card-h">${this._ico('link')} Seu link de indicação</div>
        <div class="lbl">Link completo</div>
        <div class="link-row"><input readonly value="${this._esc(d.links?.completo)}"><button class="btn mini" data-copiar="${this._esc(d.links?.completo)}">${this._ico('copy')} Copiar</button></div>
        <div class="lbl" style="margin-top:10px">Link curto</div>
        <div class="link-row"><input readonly value="${this._esc(d.links?.curto)}"><button class="btn mini" data-copiar="${this._esc(d.links?.curto)}">${this._ico('copy')} Copiar</button></div>
        <div class="nota">Compartilhe na bio, no WhatsApp ou nas redes. Quem entrar na agência por esse link fica vinculado a você. O link vale enquanto o programa estiver ativo.</div>
      </div>`;
  }

  // ── aba: Ranking (selos + pódio + lista) ─────────────────────
  _abaRanking() {
    const d = this._d;
    const cats = [['diamantes', 'Diamantes', 'gem'], ['horas_total', 'Horas totais', 'clock'], ['horas_video', 'Vídeo', 'video'], ['horas_audio', 'Áudio', 'mic']];
    const prim = (i) => this._rankCat === 'diamantes' ? this._num(i.diamantes) : `${this._dec(i[this._rankCat])} h`;
    const secIco = this._rankCat === 'diamantes' ? 'clock' : 'gem';
    const sec = (i) => this._rankCat === 'diamantes' ? `${this._dec(i.horas_total)} h` : this._num(i.diamantes);
    const lista = (d.indicados || []).filter(i => i.status === 'confirmado').slice().sort((a, b) => Number(b[this._rankCat] || 0) - Number(a[this._rankCat] || 0));
    const periodoSel = `<select class="badge-time" id="selPeriodo" aria-label="Período">${[['atual', 'Mês atual'], ['anterior', 'Mês anterior'], ['historico', 'Histórico']].map(([k, n]) => `<option value="${k}" ${this._periodo === k ? 'selected' : ''}>${n}</option>`).join('')}</select>`;
    const info = `<div class="info-row"><div class="time-group">${periodoSel}${this._periodo === 'atual' ? `<span class="badge-time">${this._ico('clock')} <span id="cdTxt">--d --:--:--</span></span>` : ''}</div><button class="btn btn-regras" id="btnRegras">${this._ico('book')} Regras</button></div>`;
    const chips = `<div class="chips">${cats.map(([k, n, ic]) => `<button class="chip ${this._rankCat === k ? 'on' : ''}" data-rank="${k}">${this._ico(ic)} ${n}</button>`).join('')}</div>`;
    const regras = this._regrasAberto ? this._cardRegras() : '';
    if (!lista.length) return `${info}${regras}${chips}<div class="card"><div class="vazio">O ranking aparece quando você tiver indicados dentro da agência.</div></div>`;
    const pod = (i, pos) => i ? `<div class="pod-col col-${pos}"><div class="avatar-wrap">${this._avatar(i.nome || i.kwai_id, i.foto, 'avatar')}</div>
        <div class="base"><div class="pod-nome">${this._esc(i.nome || i.kwai_id)}</div><span class="chip-w">${this._ico(this._rankCat === 'diamantes' ? 'gem' : 'clock')} ${prim(i)}</span><span class="chip-w">${this._ico(secIco)} ${sec(i)}</span></div></div>` : '';
    const top = [lista[1], lista[0], lista[2]];
    const resto = lista.slice(3).map((i, k) => `<div class="item"><div class="item-num">${k + 4}</div>${this._avatar(i.nome || i.kwai_id, i.foto, 'avatar sm')}<div class="item-info"><div class="item-nome">${this._esc(i.nome || i.kwai_id)}</div><div class="item-sub"><span>${this._ico(secIco)} ${sec(i)}</span></div></div><div class="item-right">${prim(i)}</div></div>`).join('');
    return `${info}${regras}${chips}
      <div class="podium">${pod(top[0], 2)}${pod(top[1], 1)}${pod(top[2], 3)}</div>
      ${resto ? `<div>${resto}</div>` : ''}
      <div class="nota" style="text-align:center">Ranking só com os streamers que você indicou. Nenhum dado de outros grupos aparece aqui.</div>`;
  }

  _cardRegras() {
    const regras = this._d.regras || [];
    const man = this._d.percentual_manual;
    return `<div class="card">
      <div class="card-h">${this._ico('book')} Como funciona</div>
      <p style="font-size:.84rem;line-height:1.55;color:var(--c-sub)">Você indica streamers por link ou convite. A indicação vira concluída quando a pessoa entra na agência. O bônus é calculado pelo sistema sobre os diamantes que ela gerar, conforme ${man !== null && man !== undefined ? `o percentual de <b>${this._dec(man)}%</b> definido pela agência para a sua conta` : 'as metas abaixo'}, e só é pago depois de aprovado.</p>
      ${regras.length ? `<div style="margin-top:10px;overflow-x:auto"><table><thead><tr><th>Meta</th><th>Dias</th><th>Horas</th><th>%</th></tr></thead><tbody>${regras.map(r => `<tr><td>${this._esc(r.nome)}</td><td>${this._num(r.dias_minimos)}</td><td>${this._dec(r.horas_minimas)} h</td><td><b>${this._dec(r.percentual)}%</b></td></tr>`).join('')}</tbody></table></div>` : `<div class="nota">A agência ainda não definiu metas de bonificação.</div>`}
    </div>`;
  }

  // ── aba: Indicados (números + lista) ─────────────────────────
  _abaIndicados() {
    const d = this._d, t = d.totais || {};
    const lista = (d.indicados || []);
    const hist = this._periodo === 'historico';
    const itens = lista.length ? lista.map(i => `
      <div class="item">
        ${this._avatar(i.nome || i.kwai_id, i.foto, 'avatar sm')}
        <div class="item-info">
          <div class="item-nome">${this._esc(i.nome || i.kwai_id || i.uid)}</div>
          <div class="item-sub"><span>@${this._esc(i.kwai_id || '—')}</span><span>${i.status === 'confirmado' ? `entrou em ${this._data(i.confirmado_em)}` : `convidado em ${this._data(i.convidado_em)}`}</span></div>
          ${i.status === 'confirmado' ? `<div class="item-sub"><span>${this._ico('gem')} <b>${this._num(i.diamantes)}</b></span><span>${this._ico('clock')} <b>${this._esc(i.hhmm_total)}</b></span><span>${this._ico('video')} <b>${this._esc(i.hhmm_video)}</b></span><span>${this._ico('mic')} <b>${this._esc(i.hhmm_audio)}</b></span></div>` : ''}
        </div>
        ${this._situacao(i)}
      </div>`).join('') : `<div class="vazio">Você ainda não tem indicados. Compartilhe seu link ou envie um convite na aba <b>Enviar convite</b>.</div>`;
    return `${this._seletorPeriodo()}
      <div class="kpis">
        ${this._kpi('Pessoas indicadas', this._num(t.total_indicados), `${this._num(t.convidados_pendentes)} aguardando entrada`)}
        ${this._kpi('Indicações concluídas', this._num(t.concluidas))}
        ${this._kpi('Ainda na agência', this._num(t.vinculados))}
        ${this._kpi('Diamantes', this._num(t.diamantes), 'dos seus indicados')}
        ${this._kpi('Horas totais', this._dec(t.horas_total) + ' h')}
        ${this._kpi('Horas de vídeo', this._dec(t.horas_video) + ' h')}
        ${this._kpi('Horas de áudio', this._dec(t.horas_audio) + ' h')}
        ${hist ? this._kpi('Bônus fechados', this._brl((d.bonus_fechados || []).filter(b => b.status !== 'cancelado').reduce((a, b) => a + Number(b.brl || 0), 0)), 'soma dos meses já fechados', 'gold')
               : this._kpi('Bônus do período', this._brl(t.bonus_brl), `${this._dec(t.bonus_koin)} Koin`, 'gold')}
      </div>
      <div class="card"><div class="card-h">${this._ico('users')} Seus indicados</div>${itens}</div>`;
  }

  // ── aba: Bônus ───────────────────────────────────────────────
  _statusBonus(s) {
    return ({ em_apuracao: ['Em apuração', 'b-wait'], calculado: ['Calculado', 'b-wait'], aprovado: ['Aprovado', 'b-ok'], pago: ['Pago', 'b-ok'], cancelado: ['Cancelado', 'b-off'] }[s]) || ['—', 'b-mut'];
  }

  _abaBonus() {
    const d = this._d, t = d.totais || {};
    const regras = d.regras || [];
    const apl = d.percentual_manual !== null && d.percentual_manual !== undefined
      ? `<b>${this._dec(d.percentual_manual)}%</b> (percentual definido pela agência para a sua conta)`
      : (regras.length ? 'conforme as metas abaixo (cada indicado é avaliado pelos próprios dias e horas)' : 'a agência ainda não definiu os percentuais — enquanto isso o bônus fica em 0%');
    const tabRegras = regras.length ? `<div style="overflow-x:auto;margin-top:6px"><table><thead><tr><th>Meta</th><th>Dias</th><th>Horas</th><th>%</th></tr></thead><tbody>${regras.map(r => `<tr><td>${this._esc(r.nome)}</td><td>${this._num(r.dias_minimos)}</td><td>${this._dec(r.horas_minimas)} h</td><td><b>${this._dec(r.percentual)}%</b></td></tr>`).join('')}</tbody></table></div>` : '';
    const periodoLinhas = this._periodo === 'historico' ? '' : (d.indicados || []).filter(i => i.status === 'confirmado').map(i => {
      const [rot, cls] = this._statusBonus(i.bonus_status);
      return `<tr><td>${this._esc(i.nome || i.kwai_id)}</td><td>${this._num(i.diamantes)}</td><td>${this._num(i.dias)} d / ${this._esc(i.hhmm_total)}</td><td>${this._dec(i.percentual)}%</td><td>${this._dec(i.koin)}</td><td>${this._brl(i.brl)}</td><td><span class="badge ${cls}">${rot}</span></td></tr>`;
    }).join('');
    const fechados = (d.bonus_fechados || []).map(b => { const [rot, cls] = this._statusBonus(b.status); return `<tr><td>${this._esc(b.mes)}</td><td>${this._esc(b.indicado_nome || b.indicado_uid)}</td><td>${this._num(b.diamantes)}</td><td>${this._dec(b.percentual)}%</td><td>${this._brl(b.brl)}</td><td><span class="badge ${cls}">${rot}</span></td></tr>`; }).join('');
    return `${this._seletorPeriodo()}
      <div class="card"><div class="card-h">${this._ico('coin')} Percentual aplicável</div>
        <p style="font-size:.86rem;line-height:1.55;color:var(--c-sub)">Seu bônus é calculado sobre os diamantes elegíveis dos indicados que estão na agência: ${apl}.</p>${tabRegras}</div>
      ${this._periodo === 'historico' ? '' : `<div class="card"><div class="card-h">${this._ico('gem')} De onde vem o bônus</div>
        ${periodoLinhas ? `<div style="overflow-x:auto"><table><thead><tr><th>Indicado</th><th>Diamantes</th><th>Dias / horas</th><th>%</th><th>Koin</th><th>Valor</th><th>Situação</th></tr></thead><tbody>${periodoLinhas}</tbody></table></div>
        <div class="kpis" style="margin:14px 0 0">${this._kpi('Total do período', this._brl(t.bonus_brl), `${this._dec(t.bonus_koin)} Koin`, 'gold')}</div>` : `<div class="vazio">Sem indicados confirmados neste período.</div>`}</div>`}
      <div class="card"><div class="card-h">${this._ico('clock')} Histórico de bônus</div>
        ${fechados ? `<div style="overflow-x:auto"><table><thead><tr><th>Mês</th><th>Indicado</th><th>Diamantes</th><th>%</th><th>Valor</th><th>Situação</th></tr></thead><tbody>${fechados}</tbody></table></div>` : `<div class="vazio">Os meses fechados pela agência aparecem aqui, com a situação de cada bônus.</div>`}
        <div class="nota">Valores calculados pelo sistema a partir dos resultados oficiais. “Em apuração” é provisório até a agência fechar o mês; o bônus só é pago depois de aprovado.</div></div>`;
  }

  // ── tela "Seja um afiliado" (quem ainda não ativou) ───────────
  _telaAtivar() {
    const st = this._st || {};
    const off = !st.programa_ativo;
    const passos = [
      ['Ative sua participação', 'Você ganha um link só seu, com o seu @ do Kwai no final.'],
      ['Divulgue e convide', 'Compartilhe o link na bio, no WhatsApp ou nas redes, ou envie convites direto pelo painel.'],
      ['Acompanhe seus indicados', 'Veja diamantes, horas de vídeo e de áudio, ranking e o bônus calculado sobre os resultados deles.'],
    ].map(([t, d], n) => `<div class="passo"><span class="passo-n">${n + 1}</span><div><div class="passo-t">${t}</div><div class="passo-d">${d}</div></div></div>`).join('');
    return `
      ${this._hero('Seja um afiliado', 'Indique novos streamers para a DMAIOR e seja bonificado pelos resultados de quem entrar por você.')}
      ${this._faixa('Ative sua participação, divulgue seu link e acompanhe tudo aqui no seu painel. O bônus segue as metas definidas pela agência.')}
      ${off ? `<div class="aviso">${this._ico('alert')}<div><b>Programa de indicações temporariamente indisponível.</b><br>A agência abre o programa em períodos e campanhas. Quando reabrir, você ativa aqui mesmo.</div></div>` : ''}
      ${st.bloqueado_pela_agencia ? `<div class="aviso">${this._ico('alert')}<div>Sua participação foi desativada pela agência. Fale com a agência para voltar.</div></div>` : ''}
      <div class="card">
        <div class="card-h">${this._ico('userplus')} Como funciona</div>
        ${passos}
        <div class="nota">O bônus é calculado pelo sistema conforme as metas e os percentuais definidos pela agência, sobre os resultados oficiais dos seus indicados, e só é pago depois de aprovado. Você pode pausar sua participação quando quiser.</div>
      </div>
      <div class="card">
        <label class="aceite"><input type="checkbox" id="aceiteAtivar" ${this._aceiteAtivar ? 'checked' : ''} ${(!st.pode_ativar) ? 'disabled' : ''}> <span>Entendi como o programa funciona e quero participar como afiliado.</span></label>
        <div style="margin-top:14px"><button class="btn" id="btnAtivar" style="width:100%" ${(!st.pode_ativar || !this._aceiteAtivar) ? 'disabled' : ''}>${this._ico('check')} Ativar minha participação</button></div>
        ${this._msgAtivar ? `<div class="msg ${this._msgAtivar.tipo}">${this._esc(this._msgAtivar.texto)}</div>` : ''}
      </div>`;
  }

  _ligarAtivar() {
    const s = this.shadowRoot;
    const chk = s.getElementById('aceiteAtivar'), btn = s.getElementById('btnAtivar');
    chk?.addEventListener('change', () => { this._aceiteAtivar = chk.checked; if (btn) btn.disabled = !chk.checked || !this._st?.pode_ativar; });
    btn?.addEventListener('click', () => this._ativar(false));
  }

  async _ativar(reativar) {
    const btn = this.shadowRoot.getElementById(reativar ? 'btnReativar' : 'btnAtivar'); if (btn) btn.disabled = true;
    try {
      const r = await this._api('/afiliado/ativar', { method: 'POST', body: JSON.stringify({ uid: this._uid, aceite: true }) });
      if (r.json?.ok) { this._msgAtivar = null; this._msgGeral = null; this._periodo = 'atual'; await this._carregar(); return; }
      const m = { tipo: 'err', texto: r.json?.mensagem || r.json?.erro || 'Não foi possível ativar agora.' };
      this._msgAtivar = m; if (reativar) this._msgGeral = m;
    } catch (_) { const m = { tipo: 'err', texto: 'Sem conexão. Tente novamente.' }; this._msgAtivar = m; if (reativar) this._msgGeral = m; }
    if (btn) btn.disabled = false;
    this._renderConteudo();
  }

  async _pausar() {
    if (!window.confirm('Pausar sua participação? Seu link para de registrar novas indicações e você deixa de enviar convites. O histórico, os indicados e os bônus continuam aqui.')) return;
    try {
      const r = await this._api('/afiliado/desativar', { method: 'POST', body: JSON.stringify({ uid: this._uid }) });
      if (r.json?.ok) { this._msgGeral = null; await this._carregar(); return; }
      this._msgGeral = { tipo: 'err', texto: r.json?.mensagem || r.json?.erro || 'Não foi possível pausar agora.' };
    } catch (_) { this._msgGeral = { tipo: 'err', texto: 'Sem conexão. Tente novamente.' }; }
    this._renderConteudo();
  }

  // ── eventos ──────────────────────────────────────────────────
  _ligarEventos() {
    const s = this.shadowRoot;
    s.querySelectorAll('[data-aba]').forEach(b => b.addEventListener('click', () => { this._aba = b.dataset.aba; this._msgConvite = null; this._renderConteudo(); }));
    s.querySelectorAll('[data-periodo]').forEach(b => b.addEventListener('click', () => { this._periodo = b.dataset.periodo; this._carregar(); }));
    s.getElementById('selPeriodo')?.addEventListener('change', e => { this._periodo = e.target.value; this._carregar(); });
    s.getElementById('btnRegras')?.addEventListener('click', () => { this._regrasAberto = !this._regrasAberto; this._renderConteudo(); });
    s.querySelectorAll('[data-rank]').forEach(b => b.addEventListener('click', () => { this._rankCat = b.dataset.rank; this._renderConteudo(); }));
    s.querySelectorAll('[data-copiar]').forEach(b => b.addEventListener('click', () => this._copiar(b.dataset.copiar, b)));
    s.getElementById('btnPausar')?.addEventListener('click', () => this._pausar());
    s.getElementById('btnReativar')?.addEventListener('click', () => this._ativar(true));
    s.getElementById('btnVerificar')?.addEventListener('click', () => this._verificar());
    s.getElementById('busca')?.addEventListener('keydown', e => { if (e.key === 'Enter') this._verificar(); });
    s.getElementById('btnEnviar')?.addEventListener('click', () => this._enviar());
    s.getElementById('btnReenviar')?.addEventListener('click', () => this._reenviar());
  }

  async _copiar(texto, btn) {
    if (!texto) return;
    try { await navigator.clipboard.writeText(texto); }
    catch (_) {
      const ta = document.createElement('textarea'); ta.value = texto; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); } catch (__) {} ta.remove();
    }
    const antes = btn.innerHTML; btn.classList.add('ok'); btn.innerHTML = `${this._ico('check')} Copiado`;
    setTimeout(() => { btn.classList.remove('ok'); btn.innerHTML = antes; }, 1800);
  }

  async _verificar() {
    const s = this.shadowRoot, busca = (s.getElementById('busca')?.value || '').trim();
    if (!busca) return;
    this._msgConvite = null; this._perfilConvite = null;
    const btn = s.getElementById('btnVerificar'); if (btn) btn.disabled = true;
    try {
      const r = await this._api('/afiliado/convite/verificar', { method: 'POST', body: JSON.stringify({ uid: this._uid, busca }) });
      if (r.status === 429) this._msgConvite = { tipo: 'warn', texto: 'Muitas consultas seguidas. Aguarde alguns minutos.' };
      else if (!r.ok) this._msgConvite = { tipo: 'err', texto: r.json?.mensagem || r.json?.erro || 'Não foi possível consultar agora.' };
      else this._perfilConvite = r.json;
    } catch (_) { this._msgConvite = { tipo: 'err', texto: 'Sem conexão. Tente novamente.' }; }
    this._renderConteudo();
    const campo = this.shadowRoot.getElementById('busca'); if (campo) campo.value = busca;
  }

  async _enviar() {
    const s = this.shadowRoot, p = this._perfilConvite?.perfil; if (!p) return;
    const btn = s.getElementById('btnEnviar'); if (btn) btn.disabled = true;
    try {
      const r = await this._api('/afiliado/convite/enviar', { method: 'POST', body: JSON.stringify({ uid: this._uid, busca: p.memberId, categoria: s.getElementById('cat')?.value || 'entretenimento' }) });
      if (r.json?.ok) { this._msgConvite = { tipo: 'ok', texto: 'Convite enviado! A indicação fica registrada no seu nome assim que a pessoa entrar na agência.' }; this._perfilConvite = null; this._carregar(); return; }
      this._msgConvite = { tipo: 'err', texto: r.json?.mensagem || r.json?.erro || 'Não foi possível enviar o convite.' };
    } catch (_) { this._msgConvite = { tipo: 'err', texto: 'Sem conexão. Tente novamente.' }; }
    this._renderConteudo();
  }

  async _reenviar() {
    const s = this.shadowRoot, v = this._perfilConvite; if (!v?.invite_id) return;
    const btn = s.getElementById('btnReenviar'); if (btn) btn.disabled = true;
    try {
      const r = await this._api('/afiliado/convite/reenviar', { method: 'POST', body: JSON.stringify({ uid: this._uid, invite_id: v.invite_id, member_id: v.perfil?.memberId }) });
      if (r.json?.ok) { this._msgConvite = { tipo: 'ok', texto: 'Convite reenviado!' }; this._perfilConvite = null; this._carregar(); return; }
      this._msgConvite = { tipo: 'err', texto: r.json?.mensagem || r.json?.erro || 'A Kwai não aceitou o reenvio.' };
    } catch (_) { this._msgConvite = { tipo: 'err', texto: 'Sem conexão. Tente novamente.' }; }
    this._renderConteudo();
  }
}
customElements.define('dmaior-afiliado', DmaiorAfiliado);
