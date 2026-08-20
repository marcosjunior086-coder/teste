/* eslint-env browser */
// ============================================================
//  DMaior Agency — Custom Element: <dmaior-tickets>
//  Autocontido, mesmo padrão de dmaior-impulso.js: lê dm_uid/dm_token/
//  dm_refresh do localStorage sozinho, recebe worker-url (aponta pro
//  dashboard.agencydmaior.com.br, mesmo worker que já serve /api/carteira).
//  Exclusivo do painel do streamer logado (dmaior-app.js).
//
//  Visual e comportamento portados do protótipo aprovado em conversa
//  (_mockup-tickets-streamer.html) — mesma estrutura de cards de nível,
//  galeria e histórico, agora consumindo dados reais em vez de mock.
// ============================================================
class DmaiorTickets extends HTMLElement {
  static get observedAttributes() { return ['worker-url']; }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._workerUrl = '';
    this._uid = '';
    this._token = '';
    this._refreshToken = '';
    this._iniciado = false;
    this._carregando = true;
    this._erro = null;

    this._saldo = 0;
    this._movimentacoes = [];
    this._resgates = [];
    this._presentes = [];
    this._regrasAtivas = [];
    this._metricasMes = { dias: 0, horas: 0, diamantes: 0 };
    this._iconeDiamanteUrl = '';

    this._ordemGaleria = 'asc';
    this._histAba = 'mov';
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (name === 'worker-url' && newVal && newVal !== oldVal) this._workerUrl = newVal.replace(/\/+$/, '');
  }

  connectedCallback() {
    this._workerUrl = (this.getAttribute('worker-url') || '').replace(/\/+$/, '');
    this._uid = localStorage.getItem('dm_uid') || '';
    this._token = localStorage.getItem('dm_token') || '';
    this._refreshToken = localStorage.getItem('dm_refresh') || '';
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
  }

  // Mesmo mecanismo de tema de painel-pk.js/dmaior-votacao.js — lê dm_tema
  // do localStorage e espelha no atributo data-theme do próprio host, pra
  // CSS :host([data-theme]) reagir.
  _syncThemeHost() {
    let tema = 'original';
    try { tema = localStorage.getItem('dm_tema') || 'original'; } catch (_) {}
    if (tema === 'original') this.removeAttribute('data-theme');
    else this.setAttribute('data-theme', tema);
  }

  // Chamado por dmaior-app.js ao abrir a aba — cobre o caso do elemento já
  // existir no DOM desde antes do login terminar (mesmo padrão de painel-pk).
  verificarSessao() {
    if (!this._iniciado && this._isLoggedIn()) this._iniciar();
  }

  _isLoggedIn() { return !!(this._uid && this._token); }

  async _renovarToken() {
    if (!this._refreshToken) return false;
    try {
      const res = await fetch(`${this._workerUrl}/api/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: this._refreshToken }),
      });
      if (!res.ok) return false;
      const data = await res.json();
      if (data.token) { this._token = data.token; localStorage.setItem('dm_token', data.token); }
      if (data.refresh_token) { this._refreshToken = data.refresh_token; localStorage.setItem('dm_refresh', data.refresh_token); }
      return true;
    } catch (_) { return false; }
  }

  async _fetchAuth(path, opts = {}) {
    const doFetch = () => fetch(`${this._workerUrl}${path}`, {
      ...opts,
      headers: { ...(opts.headers || {}), 'Authorization': `Bearer ${this._token}` },
    });
    let res = await doFetch();
    if (res.status === 401) {
      const renovou = await this._renovarToken();
      if (renovou) res = await doFetch();
    }
    return res;
  }

  async _iniciar() {
    this._iniciado = true;
    this._carregando = true;
    this._erro = null;
    this._renderConteudo();
    try {
      const [resTickets, resPresentes] = await Promise.all([
        this._fetchAuth(`/api/tickets?uid=${encodeURIComponent(this._uid)}`),
        this._fetchAuth(`/api/tickets/presentes?uid=${encodeURIComponent(this._uid)}`),
      ]);
      if (!resTickets.ok) throw new Error('Erro ao carregar tickets');
      const dados = await resTickets.json();
      this._saldo          = Number(dados.saldo || 0);
      this._movimentacoes  = Array.isArray(dados.movimentacoes) ? dados.movimentacoes : [];
      this._metricasMes    = dados.metricas_mes || { dias: 0, horas: 0, diamantes: 0 };
      this._regrasAtivas   = (Array.isArray(dados.regras_ativas) ? dados.regras_ativas : [])
        .slice().sort((a, b) => Number(a.tickets_fixos || 0) - Number(b.tickets_fixos || 0));
      this._iconeDiamanteUrl = dados.icone_diamante_url || '';

      const dp = await resPresentes.json().catch(() => ({ presentes: [] }));
      this._presentes = Array.isArray(dp.presentes) ? dp.presentes : [];
    } catch (e) {
      this._erro = 'Não foi possível carregar seus tickets agora. Tente novamente mais tarde.';
    } finally {
      this._carregando = false;
      this._renderConteudo();
    }
  }

  async _recarregarSaldo() {
    try {
      const res = await this._fetchAuth(`/api/tickets?uid=${encodeURIComponent(this._uid)}`);
      if (!res.ok) return;
      const dados = await res.json();
      this._saldo         = Number(dados.saldo || 0);
      this._movimentacoes = Array.isArray(dados.movimentacoes) ? dados.movimentacoes : [];
      this._metricasMes   = dados.metricas_mes || this._metricasMes;
    } catch (_) {}
  }

  // Mesmo proxy/cache do weserv.nl usado no admin — imagem do Drive não é
  // buscada de novo a cada visita, o weserv já entrega com CDN/cache próprio.
  _proxyImg(url) {
    if (!url) return null;
    try {
      const u = new URL(url);
      if (u.hostname.includes('weserv.nl')) return url;
    } catch (_) { return null; }
    return `https://images.weserv.nl/?url=${encodeURIComponent(url)}&w=300&h=300&fit=contain&output=webp`;
  }

  _esc(s) { return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  _num(n) { return Number(n || 0).toLocaleString('pt-BR'); }
  _fdt(v) { if (!v) return '—'; const d = new Date(v); return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); }

  _icoTicket() { return `<svg class="ico" viewBox="0 0 24 24"><path d="M4 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4V8Z"/></svg>`; }
  // Ícone de diamante configurável pelo admin (Tickets → Regras → link do
  // Drive); sem link cadastrado, cai no mesmo SVG já usado no resto do painel
  // (dmaior-app.js svgDiamond) — nunca usa emoji, pedido explícito do usuário.
  _icoDiamante() {
    const img = this._proxyImg(this._iconeDiamanteUrl);
    if (img) return `<img class="ico" src="${this._esc(img)}" alt="" style="object-fit:contain">`;
    return `<svg class="ico" viewBox="0 0 24 24"><path d="M19 3H5L2 9l10 12L22 9l-3-6zm-7 14.5L4.5 9.5l2-4h11l2 4L12 17.5zm0-6.5a2 2 0 100-4 2 2 0 000 4z"/></svg>`;
  }

  _render() {
    this.shadowRoot.innerHTML = `
    <style>
      :host{ display:block; --dm-bg:#060B16; --dm-card:#0e1525; --dm-border:rgba(var(--dm-cyan-rgb),.15);
        --dm-text:#e2e8f0; --dm-text-muted:#8aa3ba; --dm-cyan:#00d4d4; --dm-cyan-rgb:0,212,212; --dm-gold:#f0c040;
        --verde:#4ade80; --verm:#f87171; font-family:'Exo 2',sans-serif; color:var(--dm-text); }
      *{box-sizing:border-box}

      /* Temas claros — mesmo padrão de painel-pk.js/dmaior-votacao.js/ranking.js:
         data-theme espelhado no host via _syncThemeHost(), lê dm_tema do
         localStorage. Só troca as variáveis — todo o resto do CSS já usa
         var(--dm-*), então reage sozinho. */
      :host([data-theme="branco"]){ --dm-card:#eaeff6; --dm-border:rgba(0,0,0,.08); --dm-text:#0d1117; --dm-text-muted:#5b6472; --dm-cyan:#0095a8; --dm-cyan-rgb:0,149,168; }
      :host([data-theme="rosa"]){ --dm-card:#fce4ec; --dm-border:rgba(0,0,0,.06); --dm-text:#1a0010; --dm-text-muted:#7a4060; --dm-cyan:#e91e8c; --dm-cyan-rgb:233,30,140; }
      :host([data-theme="laranja"]){ --dm-card:#fff3e0; --dm-border:rgba(0,0,0,.06); --dm-text:#1a0a00; --dm-text-muted:#7c5b3a; --dm-cyan:#f97316; --dm-cyan-rgb:249,115,22; }
      .wrap{max-width:720px;margin:0 auto;padding:6px 4px 40px}
      .ico{width:1em;height:1em;display:inline-block;vertical-align:-.15em;flex-shrink:0;stroke:currentColor;stroke-width:2;fill:none;stroke-linecap:round;stroke-linejoin:round}

      .sec-title{font-family:'Rajdhani',sans-serif;font-size:1.05rem;color:var(--dm-text);text-transform:uppercase;letter-spacing:.06em;margin:0 0 12px;display:flex;align-items:center;gap:9px}
      .sec-title .ico{width:19px;height:19px;color:var(--dm-cyan)}

      .loading,.erro-box{display:flex;align-items:center;justify-content:center;gap:10px;padding:40px 0;color:var(--dm-text-muted);font-size:.9rem}
      .erro-box{color:var(--verm)}
      .spin{width:22px;height:22px;border:2px solid rgba(var(--dm-cyan-rgb),.2);border-top-color:var(--dm-cyan);border-radius:50%;animation:sp .7s linear infinite}
      @keyframes sp{to{transform:rotate(360deg)}}

      .saldo-card{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:20px 22px;background:linear-gradient(135deg,rgba(240,192,64,.1),rgba(var(--dm-cyan-rgb),.05));border:1px solid rgba(240,192,64,.25);border-radius:16px;margin-bottom:20px;flex-wrap:wrap}
      .saldo-left{display:flex;align-items:center;gap:14px}
      .saldo-icon{width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,#f0c040,#f0a020);display:flex;align-items:center;justify-content:center;box-shadow:0 0 22px rgba(240,192,64,.35)}
      .saldo-icon .ico{width:26px;height:26px;color:#1a1200}
      .saldo-num{font-family:'Rajdhani',sans-serif;font-size:2.1rem;font-weight:700;color:var(--dm-gold);line-height:1}
      .saldo-lbl{font-size:.72rem;color:var(--dm-text-muted);text-transform:uppercase;letter-spacing:.08em;margin-top:2px}
      .btn-como{display:inline-flex;align-items:center;gap:7px;padding:9px 16px;border:1px solid rgba(var(--dm-cyan-rgb),.3);border-radius:8px;background:rgba(var(--dm-cyan-rgb),.06);color:var(--dm-cyan);font-family:'Rajdhani',sans-serif;font-weight:700;font-size:.82rem;text-transform:uppercase;letter-spacing:.04em;cursor:pointer}
      .btn-como .ico{width:16px;height:16px}

      .jornada-card{padding:18px 20px;background:var(--dm-card);border:1px solid var(--dm-border);border-radius:14px;margin-bottom:24px}
      .niveis-nota{font-size:.72rem;color:var(--dm-text-muted);text-align:center;margin-bottom:14px;line-height:1.4}
      .niveis-strip{display:grid;grid-template-columns:repeat(auto-fit,minmax(90px,1fr));gap:10px;margin-bottom:20px}
      .nivel-card{display:flex;flex-direction:column;border-radius:16px;overflow:hidden;border:2px solid var(--dm-border);background:var(--dm-card)}
      .nivel-topo{display:flex;flex-direction:column;align-items:center;gap:10px;padding:14px 6px 16px;flex:1}
      .nivel-nome{font-family:'Rajdhani',sans-serif;font-weight:700;font-size:.78rem;color:var(--dm-text);text-transform:uppercase;letter-spacing:.03em;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}
      .nivel-selo{width:42px;height:42px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid var(--dm-border);color:var(--dm-text-muted);flex-shrink:0}
      .nivel-selo .ico{width:22px;height:22px}
      .nivel-rodape{padding:9px 6px;text-align:center;font-family:'Rajdhani',sans-serif;font-weight:700;font-size:.92rem;display:flex;align-items:center;justify-content:center;gap:5px;border-top:1px solid var(--dm-border);color:var(--dm-text-muted)}
      .nivel-rodape .ico{width:14px;height:14px}
      .nivel-card.completo{border-color:rgba(34,197,94,.55)}
      .nivel-card.completo .nivel-selo{background:linear-gradient(135deg,#22c55e,#16a34a);border-color:#22c55e;color:#04150a}
      .nivel-card.completo .nivel-rodape{background:rgba(34,197,94,.14);border-top-color:rgba(34,197,94,.35);color:#4ade80}
      .nivel-card.atual{border-color:var(--dm-cyan);box-shadow:0 0 0 3px rgba(var(--dm-cyan-rgb),.12)}
      .nivel-card.atual .nivel-nome{color:var(--dm-cyan)}
      .nivel-card.atual .nivel-selo{background:rgba(var(--dm-cyan-rgb),.18);border-color:var(--dm-cyan);color:var(--dm-cyan)}
      .nivel-card.atual .nivel-rodape{background:rgba(var(--dm-cyan-rgb),.14);border-top-color:rgba(var(--dm-cyan-rgb),.35);color:var(--dm-cyan)}
      .nivel-card.futuro .nivel-selo{background:rgba(255,255,255,.03);color:var(--dm-text-muted)}
      .nivel-card.futuro .nivel-rodape{background:rgba(255,255,255,.02);color:var(--dm-text-muted)}

      .jornada-head{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:14px;flex-wrap:wrap;gap:6px}
      .jornada-nome{font-family:'Rajdhani',sans-serif;font-size:1rem;font-weight:700;color:var(--dm-text)}
      .jornada-premio{font-size:.78rem;color:var(--dm-gold);font-weight:700}
      .metas-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
      @media(max-width:520px){.metas-grid{grid-template-columns:1fr}}
      .meta-item{display:flex;flex-direction:column;gap:6px}
      .meta-lbl{display:flex;align-items:center;justify-content:space-between;font-size:.74rem;color:var(--dm-text-muted)}
      .meta-lbl .meta-lbl-txt{display:flex;align-items:center;gap:5px}
      .meta-lbl .ico{width:13px;height:13px}
      .meta-lbl b{color:var(--dm-text);font-weight:600}
      .meta-bar-track{height:7px;border-radius:4px;background:rgba(255,255,255,.06);overflow:hidden}
      .meta-bar-fill{height:100%;border-radius:4px;background:linear-gradient(90deg,var(--dm-cyan),#5eead4)}
      .meta-bar-fill.completo{background:linear-gradient(90deg,var(--verde),#22c55e)}
      .niveis-legenda{font-size:.7rem;color:var(--dm-text-muted);margin-top:14px;line-height:1.5}
      .diam-ico{width:14px;height:14px;object-fit:contain;flex-shrink:0}
      .tudo-batido{text-align:center;padding:10px 0;color:var(--verde);font-weight:700;font-family:'Rajdhani',sans-serif}

      .galeria-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:10px}
      .ordenar{display:flex;align-items:center;gap:8px;font-size:.78rem;color:var(--dm-text-muted)}
      .ordenar select{background:rgba(0,0,0,.5);border:1px solid var(--dm-border);border-radius:7px;color:var(--dm-text);padding:6px 10px;font-family:'Exo 2',sans-serif;font-size:.78rem;outline:none}
      .galeria-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:14px;margin-bottom:30px}
      .presente-card{background:var(--dm-card);border:1px solid var(--dm-border);border-radius:14px;overflow:hidden;display:flex;flex-direction:column;transition:.2s}
      .presente-card:hover{border-color:rgba(var(--dm-cyan-rgb),.4)}
      .presente-img{aspect-ratio:1;display:flex;align-items:center;justify-content:center;background:radial-gradient(circle,rgba(var(--dm-cyan-rgb),.07),transparent 70%);padding:12px}
      .presente-img img{max-width:100%;max-height:100%;object-fit:contain}
      .presente-info{padding:10px 12px 12px;display:flex;flex-direction:column;gap:4px}
      .presente-nome{font-family:'Rajdhani',sans-serif;font-weight:700;font-size:.88rem;color:var(--dm-text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .presente-diam{font-size:.72rem;color:var(--dm-text-muted);display:flex;align-items:center;gap:4px}
      .presente-custo{font-size:.86rem;color:var(--dm-gold);font-weight:700;display:flex;align-items:center;gap:5px}
      .presente-custo .ico{width:14px;height:14px}
      .btn-resgatar{margin-top:6px;padding:8px;border-radius:8px;border:none;font-family:'Rajdhani',sans-serif;font-weight:700;font-size:.76rem;text-transform:uppercase;letter-spacing:.03em;cursor:pointer;text-align:center}
      .btn-resgatar.ok{background:var(--dm-cyan);color:#04101c}
      .btn-resgatar.ok:hover{opacity:.9}
      .btn-resgatar.bloq{background:rgba(255,255,255,.04);border:1px solid var(--dm-border);color:var(--dm-text-muted);cursor:not-allowed}
      .btn-resgatar[disabled]{opacity:.6;pointer-events:none}

      .hist-tabs{display:flex;gap:6px;margin-bottom:12px}
      .hist-tab{padding:7px 14px;border-radius:8px;border:1px solid var(--dm-border);background:transparent;color:var(--dm-text-muted);font-family:'Rajdhani',sans-serif;font-size:.78rem;font-weight:700;text-transform:uppercase;letter-spacing:.03em;cursor:pointer}
      .hist-tab.on{background:rgba(var(--dm-cyan-rgb),.1);border-color:rgba(var(--dm-cyan-rgb),.35);color:var(--dm-cyan)}
      .hist-list{background:var(--dm-card);border:1px solid var(--dm-border);border-radius:14px;overflow:hidden}
      .hist-row{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:12px 16px;border-bottom:1px solid var(--dm-border);font-size:.82rem}
      .hist-row:last-child{border-bottom:none}
      .hist-desc{color:var(--dm-text)}
      .hist-data{color:var(--dm-text-muted);font-size:.72rem;margin-top:2px}
      .hist-val.pos{color:var(--verde);font-weight:700;flex-shrink:0}
      .hist-val.neg{color:var(--verm);font-weight:700;flex-shrink:0}
      .hist-vertudo{display:flex;align-items:center;justify-content:center;gap:7px;padding:11px;color:var(--dm-cyan);font-family:'Rajdhani',sans-serif;font-weight:700;font-size:.8rem;text-transform:uppercase;letter-spacing:.03em;cursor:pointer;border-top:1px solid var(--dm-border)}
      .hist-vertudo .ico{width:14px;height:14px}
      .hist-vertudo:hover{background:rgba(var(--dm-cyan-rgb),.05)}
      .empty-box{padding:22px;text-align:center;color:var(--dm-text-muted);font-size:.85rem}

      .hist-overlay{position:fixed;inset:0;background:rgba(4,5,8,.86);backdrop-filter:blur(5px);display:flex;align-items:flex-end;justify-content:center;z-index:200;opacity:0;pointer-events:none;transition:opacity .22s}
      .hist-overlay.on{opacity:1;pointer-events:auto}
      .hist-panel{width:100%;max-width:720px;max-height:82vh;background:var(--dm-card);border:1px solid var(--dm-border);border-radius:18px 18px 0 0;display:flex;flex-direction:column;transform:translateY(16px);transition:transform .22s}
      .hist-overlay.on .hist-panel{transform:translateY(0)}
      .hist-panel-head{display:flex;align-items:center;justify-content:space-between;padding:16px 18px;border-bottom:1px solid var(--dm-border)}
      .hist-panel-head span{font-family:'Rajdhani',sans-serif;font-size:1.05rem;text-transform:uppercase;letter-spacing:.04em;color:var(--dm-text)}
      .hist-panel-close{width:32px;height:32px;border-radius:50%;border:1px solid var(--dm-border);background:transparent;color:var(--dm-text-muted);cursor:pointer;display:flex;align-items:center;justify-content:center}
      .hist-panel-body{overflow-y:auto;padding:6px 0}

      .modal-resg{position:fixed;inset:0;background:rgba(4,5,8,.86);backdrop-filter:blur(5px);display:flex;align-items:center;justify-content:center;z-index:210;padding:16px}
      .modal-resg-box{width:100%;max-width:340px;background:var(--dm-card);border:1px solid var(--dm-border);border-radius:16px;padding:22px;text-align:center}
      .modal-resg-box img{width:96px;height:96px;object-fit:contain;margin:0 auto 12px}
      .modal-resg-nome{font-family:'Rajdhani',sans-serif;font-weight:700;font-size:1.1rem;margin-bottom:12px}
      .modal-resg-linha{display:flex;justify-content:space-between;font-size:.85rem;padding:6px 0;border-bottom:1px solid var(--dm-border)}
      .modal-resg-btns{display:flex;gap:8px;margin-top:16px}
      .modal-resg-btns button{flex:1;padding:10px;border-radius:8px;font-family:'Rajdhani',sans-serif;font-weight:700;text-transform:uppercase;font-size:.78rem;cursor:pointer;border:none}
      .btn-cancelar{background:rgba(255,255,255,.05);border:1px solid var(--dm-border) !important;color:var(--dm-text-muted)}
      .btn-confirmar{background:var(--dm-cyan);color:#04101c}
    </style>
    <div class="wrap" id="root"></div>
    `;
    this._renderConteudo();
  }

  _renderConteudo() {
    const root = this.shadowRoot.getElementById('root');
    if (!root) return;

    if (!this._isLoggedIn()) { root.innerHTML = `<div class="empty-box">Faça login pra ver seus tickets.</div>`; return; }
    if (this._carregando) { root.innerHTML = `<div class="loading"><div class="spin"></div><span>Carregando seus tickets...</span></div>`; return; }
    if (this._erro) { root.innerHTML = `<div class="erro-box">${this._esc(this._erro)}</div>`; return; }

    root.innerHTML = `
      <div class="saldo-card">
        <div class="saldo-left">
          <div class="saldo-icon">${this._icoTicket()}</div>
          <div><div class="saldo-num" id="ticSaldoNum">${this._num(this._saldo)}</div><div class="saldo-lbl">tickets disponíveis</div></div>
        </div>
        <button class="btn-como" id="ticBtnComo"><svg class="ico" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 16v-5"/><path d="M12 8h.01"/></svg> Como ganhar tickets</button>
      </div>

      <div class="sec-title"><svg class="ico" viewBox="0 0 24 24"><path d="M3 3v18h18"/><path d="M18.5 9 13 14.5l-3-3L4 18"/></svg> Jornada do mês</div>
      <div class="jornada-card" id="ticJornada"></div>

      <div class="galeria-head">
        <div class="sec-title" style="margin:0"><svg class="ico" viewBox="0 0 24 24"><rect x="3" y="8" width="18" height="13" rx="1"/><path d="M3 8h18M12 8v13M7.5 8a2.5 2.5 0 0 1 0-5C10 3 12 8 12 8s2-5 4.5-5a2.5 2.5 0 0 1 0 5"/></svg> Galeria de Presentes</div>
        <div class="ordenar">Ordenar por diamantes:
          <select id="ticOrdenar"><option value="asc">Menor → Maior</option><option value="desc">Maior → Menor</option></select>
        </div>
      </div>
      <div class="galeria-grid" id="ticGaleria"></div>

      <div class="sec-title"><svg class="ico" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/></svg> Histórico</div>
      <div class="hist-tabs">
        <button class="hist-tab on" data-h="mov">Movimentações</button>
        <button class="hist-tab" data-h="resg">Resgates</button>
      </div>
      <div class="hist-list" id="ticHistMov"></div>
      <div class="hist-list" id="ticHistResg" style="display:none"></div>

      <div class="hist-overlay" id="ticHistOverlay">
        <div class="hist-panel">
          <div class="hist-panel-head"><span id="ticHistOverlayTitulo">Histórico</span><button class="hist-panel-close" id="ticHistOverlayClose">✕</button></div>
          <div class="hist-panel-body" id="ticHistOverlayBody"></div>
        </div>
      </div>
    `;

    this._renderJornada();
    this._renderGaleria();
    this._renderHistInline();
    this._bindConteudo();
  }

  // ── Jornada / níveis ──────────────────────────────────────────────────────
  _renderJornada() {
    const el = this.shadowRoot.getElementById('ticJornada');
    if (!el) return;
    const regras = this._regrasAtivas;
    if (!regras.length) {
      el.innerHTML = `<div class="empty-box">Nenhuma meta configurada ainda — fale com a agência.</div>`;
      return;
    }

    const m = this._metricasMes;
    const bate = (r) => r.criterio_modo === 'independente'
      ? (m.dias >= Number(r.dias_minimos || 0) || m.horas >= Number(r.horas_minimas || 0) || m.diamantes >= Number(r.diamantes_minimos || 0))
      : (m.dias >= Number(r.dias_minimos || 0) && m.horas >= Number(r.horas_minimas || 0) && m.diamantes >= Number(r.diamantes_minimos || 0));

    let idxAtual = regras.findIndex(r => !bate(r));
    const todasBatidas = idxAtual === -1;

    const cardsHtml = regras.map((r, i) => {
      const estado = todasBatidas ? 'completo' : (i < idxAtual ? 'completo' : (i === idxAtual ? 'atual' : 'futuro'));
      const selo = estado === 'completo'
        ? `<svg class="ico" viewBox="0 0 24 24"><path d="m8 12 2.7 2.7L16.5 9"/></svg>`
        : estado === 'atual'
        ? `<svg class="ico" viewBox="0 0 24 24"><path d="M5 21V4"/><path d="M5 5h13l-2.5 4L18 13H5"/></svg>`
        : `<svg class="ico" viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="9" rx="1.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>`;
      return `<div class="nivel-card ${estado}">
        <div class="nivel-topo"><div class="nivel-nome">${this._esc(r.nome)}</div><div class="nivel-selo">${selo}</div></div>
        <div class="nivel-rodape">${this._num(r.tickets_fixos)} ${this._icoTicket()}</div>
      </div>`;
    }).join('');

    let detalheHtml;
    if (todasBatidas) {
      detalheHtml = `<div class="tudo-batido"><svg class="ico" viewBox="0 0 24 24"><path d="m8 12 2.7 2.7L16.5 9"/><circle cx="12" cy="12" r="9"/></svg> Todas as metas do mês já foram batidas!</div>`;
    } else {
      const alvo = regras[idxAtual];
      const pct = (atual, meta) => meta > 0 ? Math.min(100, Math.round((atual / meta) * 100)) : 100;
      const diasMeta = Number(alvo.dias_minimos || 0), horasMeta = Number(alvo.horas_minimas || 0), diamMeta = Number(alvo.diamantes_minimos || 0);
      const diasOk = m.dias >= diasMeta, horasOk = m.horas >= horasMeta, diamOk = m.diamantes >= diamMeta;
      detalheHtml = `
        <div class="jornada-head">
          <span class="jornada-nome">Faltando pro ${this._esc(alvo.nome)} (${diasMeta} dias · ${horasMeta}h · ${this._num(diamMeta)} ${this._icoDiamante()})</span>
          <span class="jornada-premio">Vale ${this._num(alvo.tickets_fixos)} tickets no total</span>
        </div>
        <div class="metas-grid">
          <div class="meta-item">
            <div class="meta-lbl"><span class="meta-lbl-txt"><svg class="ico" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg> Dias</span><b>${m.dias} / ${diasMeta}</b></div>
            <div class="meta-bar-track"><div class="meta-bar-fill ${diasOk ? 'completo' : ''}" style="width:${pct(m.dias, diasMeta)}%"></div></div>
          </div>
          <div class="meta-item">
            <div class="meta-lbl"><span class="meta-lbl-txt"><svg class="ico" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg> Horas ao vivo</span><b>${m.horas} / ${horasMeta}</b></div>
            <div class="meta-bar-track"><div class="meta-bar-fill ${horasOk ? 'completo' : ''}" style="width:${pct(m.horas, horasMeta)}%"></div></div>
          </div>
          <div class="meta-item">
            <div class="meta-lbl"><span class="meta-lbl-txt">${this._icoDiamante()} Diamantes</span><b>${this._num(m.diamantes)} / ${this._num(diamMeta)}</b></div>
            <div class="meta-bar-track"><div class="meta-bar-fill ${diamOk ? 'completo' : ''}" style="width:${pct(m.diamantes, diamMeta)}%"></div></div>
          </div>
        </div>`;
    }

    el.innerHTML = `
      <div class="niveis-nota">Os níveis não se somam — ao completar o próximo, você recebe só a diferença até o valor total dele.</div>
      <div class="niveis-strip">${cardsHtml}</div>
      ${detalheHtml}
    `;
  }

  // ── Galeria ────────────────────────────────────────────────────────────────
  _renderGaleria() {
    const el = this.shadowRoot.getElementById('ticGaleria');
    if (!el) return;
    if (!this._presentes.length) { el.innerHTML = `<div class="empty-box" style="grid-column:1/-1">Nenhum presente disponível ainda.</div>`; return; }
    const lista = this._presentes.slice().sort((a, b) => this._ordemGaleria === 'desc'
      ? Number(b.valor_diamantes || 0) - Number(a.valor_diamantes || 0)
      : Number(a.valor_diamantes || 0) - Number(b.valor_diamantes || 0));
    el.innerHTML = lista.map(p => {
      const custo = Number(p.custo_tickets || 0);
      const da = this._saldo >= custo;
      const img = this._proxyImg(p.imagem_url);
      return `<div class="presente-card">
        <div class="presente-img">${img ? `<img src="${this._esc(img)}" alt="${this._esc(p.nome)}" onerror="this.style.display='none'">` : ''}</div>
        <div class="presente-info">
          <div class="presente-nome">${this._esc(p.nome)}</div>
          <div class="presente-diam">${this._icoDiamante()} ${this._num(p.valor_diamantes)}</div>
          <div class="presente-custo">${this._icoTicket()} ${this._num(custo)} tickets</div>
          <button class="btn-resgatar ${da ? 'ok' : 'bloq'}" data-resgatar="${this._esc(p.id)}" ${da ? '' : 'disabled'}>${da ? 'Resgatar' : 'Faltam ' + this._num(custo - this._saldo)}</button>
        </div>
      </div>`;
    }).join('');
    el.querySelectorAll('[data-resgatar]').forEach(b => b.addEventListener('click', () => {
      const presente = this._presentes.find(p => String(p.id) === b.dataset.resgatar);
      if (presente) this._abrirConfirmarResgate(presente);
    }));
  }

  _abrirConfirmarResgate(presente) {
    const el = document.createElement('div');
    el.className = 'modal-resg';
    const img = this._proxyImg(presente.imagem_url);
    const restante = this._saldo - Number(presente.custo_tickets || 0);
    el.innerHTML = `<div class="modal-resg-box">
      ${img ? `<img src="${this._esc(img)}" alt="">` : ''}
      <div class="modal-resg-nome">${this._esc(presente.nome)}</div>
      <div class="modal-resg-linha"><span>Custo</span><b>${this._num(presente.custo_tickets)} tickets</b></div>
      <div class="modal-resg-linha"><span>Seu saldo agora</span><span>${this._num(this._saldo)}</span></div>
      <div class="modal-resg-linha" style="border-bottom:none"><span>Saldo depois</span><b>${this._num(restante)}</b></div>
      <div class="modal-resg-btns">
        <button class="btn-cancelar" id="ticResgCancelar">Cancelar</button>
        <button class="btn-confirmar" id="ticResgConfirmar">Confirmar resgate</button>
      </div>
    </div>`;
    this.shadowRoot.appendChild(el);
    el.querySelector('#ticResgCancelar').addEventListener('click', () => el.remove());
    el.addEventListener('click', (e) => { if (e.target === el) el.remove(); });
    el.querySelector('#ticResgConfirmar').addEventListener('click', async () => {
      const btn = el.querySelector('#ticResgConfirmar');
      btn.disabled = true; btn.textContent = 'Resgatando...';
      try {
        const res = await this._fetchAuth('/api/tickets/resgatar', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uid: this._uid, presente_id: presente.id }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.erro || 'Não foi possível resgatar.');
        el.remove();
        await this._recarregarSaldo();
        this._renderJornada();
        this._renderGaleria();
        this._renderHistInline();
      } catch (e) {
        btn.disabled = false; btn.textContent = 'Confirmar resgate';
        const erroEl = document.createElement('div');
        erroEl.style.cssText = 'color:#f87171;font-size:.78rem;margin-top:10px';
        erroEl.textContent = e.message;
        el.querySelector('.modal-resg-box').appendChild(erroEl);
      }
    });
  }

  // ── Histórico ──────────────────────────────────────────────────────────────
  _linhaMov(m) {
    const v = Number(m.quantidade || 0);
    return `<div class="hist-row"><div><div class="hist-desc">${this._esc(m.motivo || '—')}</div><div class="hist-data">${this._fdt(m.criado_em)}</div></div><div class="hist-val ${v >= 0 ? 'pos' : 'neg'}">${v >= 0 ? '+' : ''}${this._num(v)}</div></div>`;
  }
  _linhaResg(r) {
    const BADGE = { pendente: 'Pendente', aprovado: 'Aprovado', enviado: 'Enviado', cancelado: 'Cancelado' };
    const COR   = { pendente: 'var(--dm-gold)', aprovado: 'var(--dm-cyan)', enviado: 'var(--verde)', cancelado: 'var(--verm)' };
    return `<div class="hist-row"><div><div class="hist-desc">${this._esc(r.presente_nome_no_momento || '—')}</div><div class="hist-data">${this._fdt(r.solicitado_em)} · ${this._num(r.custo_tickets_no_momento)} tickets</div></div><div class="hist-val" style="color:${COR[r.status] || 'var(--dm-text-muted)'}">${BADGE[r.status] || r.status}</div></div>`;
  }

  _renderHistInline() {
    const LIMITE = 3;
    const movEl = this.shadowRoot.getElementById('ticHistMov');
    const resgEl = this.shadowRoot.getElementById('ticHistResg');
    if (movEl) {
      movEl.innerHTML = !this._movimentacoes.length
        ? `<div class="empty-box">Nenhuma movimentação ainda.</div>`
        : this._movimentacoes.slice(0, LIMITE).map(m => this._linhaMov(m)).join('') +
          (this._movimentacoes.length > LIMITE ? `<div class="hist-vertudo" data-ver="mov">Ver histórico completo <svg class="ico" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg></div>` : '');
    }
    if (resgEl) {
      resgEl.innerHTML = !this._resgates.length
        ? `<div class="empty-box">Nenhum resgate ainda.</div>`
        : this._resgates.slice(0, LIMITE).map(r => this._linhaResg(r)).join('') +
          (this._resgates.length > LIMITE ? `<div class="hist-vertudo" data-ver="resg">Ver histórico completo <svg class="ico" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg></div>` : '');
    }
    this.shadowRoot.querySelectorAll('[data-ver]').forEach(b => b.addEventListener('click', () => this._abrirHistCompleto(b.dataset.ver)));
  }

  async _carregarResgatesCompleto() {
    if (this._resgatesCarregados) return;
    try {
      const res = await this._fetchAuth(`/api/tickets/resgates?uid=${encodeURIComponent(this._uid)}`);
      if (res.ok) { const d = await res.json(); this._resgates = Array.isArray(d.resgates) ? d.resgates : []; this._resgatesCarregados = true; this._renderHistInline(); }
    } catch (_) {}
  }

  _abrirHistCompleto(tipo) {
    const overlay = this.shadowRoot.getElementById('ticHistOverlay');
    this.shadowRoot.getElementById('ticHistOverlayTitulo').textContent = tipo === 'mov' ? 'Movimentações — histórico completo' : 'Resgates — histórico completo';
    this.shadowRoot.getElementById('ticHistOverlayBody').innerHTML = tipo === 'mov'
      ? this._movimentacoes.map(m => this._linhaMov(m)).join('')
      : this._resgates.map(r => this._linhaResg(r)).join('');
    overlay.classList.add('on');
  }

  _bindConteudo() {
    const s = this.shadowRoot;
    s.getElementById('ticOrdenar')?.addEventListener('change', (e) => { this._ordemGaleria = e.target.value; this._renderGaleria(); });
    s.getElementById('ticBtnComo')?.addEventListener('click', () => {
      const el = s.getElementById('ticJornada');
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    s.querySelectorAll('.hist-tab').forEach(t => t.addEventListener('click', () => {
      s.querySelectorAll('.hist-tab').forEach(x => x.classList.remove('on'));
      t.classList.add('on');
      s.getElementById('ticHistMov').style.display = t.dataset.h === 'mov' ? '' : 'none';
      s.getElementById('ticHistResg').style.display = t.dataset.h === 'resg' ? '' : 'none';
      if (t.dataset.h === 'resg') this._carregarResgatesCompleto();
    }));
    s.getElementById('ticHistOverlayClose')?.addEventListener('click', () => s.getElementById('ticHistOverlay').classList.remove('on'));
    s.getElementById('ticHistOverlay')?.addEventListener('click', (e) => { if (e.target.id === 'ticHistOverlay') e.currentTarget.classList.remove('on'); });
  }
}
customElements.define('dmaior-tickets', DmaiorTickets);
