/**
 * menu-mobile.js — Sidebar hambúrguer mobile da DMaior Agency
 *
 * Custom Element: <menu-mobile-dmaior>
 * Lê autenticação do localStorage.
 * Sidebar desliza da direita com overlay escuro.
 * Submenus animados com max-height.
 *
 * Preserva 100% o design original — nenhum estilo foi alterado.
 */

/* eslint-env browser */
class MenuMobileDMaior extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    // Restaura tema de cor salvo antes de renderizar (evita flash)
    try {
      let temasSalvo = localStorage.getItem('dm_tema') || 'original';
      if (temasSalvo === 'teste-clean') {
        temasSalvo = 'original';
        localStorage.setItem('dm_tema', 'original');
        document.documentElement.removeAttribute('data-theme');
      }
      if (temasSalvo !== 'original') {
        document.documentElement.setAttribute('data-theme', temasSalvo);
      }
    } catch (_) {}

    this.render();
    this.bindEvents();
    this.checkAuth();
    // Guarda referências para poder remover corretamente no disconnectedCallback
    this._storageHandler = (e) => {
      if (['dm_token', 'dm_foto', 'dm_nome'].includes(e.key)) this.checkAuth();
    };
    this._authHandler = (e) => this.updateAuthUI(e.detail);
    window.addEventListener('storage', this._storageHandler);
    window.addEventListener('dmaior:auth', this._authHandler);
  }

  disconnectedCallback() {
    window.removeEventListener('storage',     this._storageHandler);
    window.removeEventListener('dmaior:auth', this._authHandler);
  }

  checkAuth() {
    if (typeof window === 'undefined') return;
    try {
      const token = localStorage.getItem('dm_token') || '';
      const foto  = localStorage.getItem('dm_foto')  || '';
      const nome  = localStorage.getItem('dm_nome')  || '';
      this.updateAuthUI({ logado: !!token, foto, nome });
    } catch {}
  }

  render() {
    const URL_LOGO   = `https://static.wixstatic.com/media/ac74b3_a9a577806ac34acbb663f4cd05e8c70f~mv2.png`;
    // Todos os ícones usam stroke="currentColor" — a cor é controlada por CSS via var(--dm-*)
    const SVG_MENU   = `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>`;
    const SVG_CLOSE  = `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
    const SVG_CHEV   = `<svg class="chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>`;
    const SVG_HOME   = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>`;
    const SVG_RANK   = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>`;
    const SVG_FOLDER = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>`;
    const SVG_BOOK   = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>`;
    const SVG_EVENT  = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>`;
    const SVG_TOOL   = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg>`;
    const SVG_INFO   = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
    const SVG_PAINEL = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>`;
    const SVG_LOGOUT = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>`;
    const SVG_ACCESS = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path><polyline points="10 17 15 12 10 7"></polyline><line x1="15" y1="12" x2="3" y2="12"></line></svg>`;
    const SVG_USER   = `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`;
    const SVG_BELL   = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>`;

    // Itens com disabled:true são exibidos mas não navegam — páginas ainda não criadas
    const menuData = [
      { label: 'Início',      link: 'index.html',             icon: SVG_HOME   },
      { label: 'Rank',        link: 'ranking.html',           icon: SVG_RANK   },
      { label: 'Material',    icon: SVG_FOLDER, subItems: [
          { label: 'Políticas Host',     link: 'politicas-host.html' },
          { label: 'Políticas Premium',  link: 'politicas-premium.html' },
      ]},
      { label: 'Cursos',      disabled: true,                 icon: SVG_BOOK   },
      { label: 'Eventos',     icon: SVG_EVENT, subItems: [
          { label: 'PK Interno', link: 'pk-interno.html' },
      ]},
      { label: 'Ferramentas', disabled: true,                 icon: SVG_TOOL   },
      { label: 'Portfólio',   icon: SVG_INFO, subItems: [
          { label: 'Quem Somos?', link: 'quem-somos.html' },
      ]},
    ];

    let menuHTML = '';
    menuData.forEach((item, i) => {
      if (item.subItems) {
        const subs = item.subItems.map(s => `<a href="${s.link}" class="sub-link">${s.label}</a>`).join('');
        menuHTML += `
          <div class="menu-item has-sub">
            <button class="menu-acc" data-index="${i}">
              <div class="menu-content">${item.icon}<span>${item.label}</span></div>
              ${SVG_CHEV}
            </button>
            <div class="sub-wrap" id="sub-${i}"><div class="sub-inner">${subs}</div></div>
          </div>`;
      } else if (item.disabled) {
        // Página ainda não criada — exibe como "em breve" sem link clicável
        menuHTML += `
          <div class="menu-item direct disabled-item">
            <div class="menu-content">${item.icon}<span>${item.label}</span></div>
            <span class="em-breve-tag">Em breve</span>
          </div>`;
      } else {
        menuHTML += `
          <a href="${item.link}" class="menu-item direct">
            <div class="menu-content">${item.icon}<span>${item.label}</span></div>
          </a>`;
      }
    });

    this.shadowRoot.innerHTML = `
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@600;700&family=Exo+2:wght@400;600&display=swap');
      *{ box-sizing:border-box; margin:0; padding:0; -webkit-tap-highlight-color:transparent; }
      :host{ display:block; font-family:'Exo 2',sans-serif; width:100%; }
      .topbar{ display:flex; align-items:center; justify-content:space-between; width:100%; padding:12px 20px; background:var(--dm-grad-card); border-bottom:1px solid var(--dm-border); box-shadow:0 4px 15px var(--dm-shadow-md); }
      .logo{ height:38px; width:auto; max-width:150px; object-fit:contain; display:block; flex-shrink:1; min-width:0; transition:filter .3s; }
      .hamburger{ background:transparent; border:none; padding:8px; display:inline-flex; align-items:center; justify-content:center; cursor:pointer; transition:transform .2s,opacity .2s; margin-right:-8px; flex-shrink:0; }
      .hamburger:active{ transform:scale(.9); opacity:.7; }
      /* ── Cor dos ícones do menu: via variável de tema ── */
      .menu-content svg { color: var(--dm-cyan); }
      .chevron { color: var(--dm-text-sub); }
      /* Hambúrguer e fechar: brancos em temas escuros (padrão) */
      .hamburger svg, .close-btn svg { color: #ffffff; }
      /* Ícone de usuário não logado */
      .auth-area svg { color: var(--dm-text-sub); }
      /* Ícones dentro da área autenticada (painel, logout) */
      .auth-link svg { color: var(--dm-text-sub); }
      .auth-link.danger svg { color: var(--dm-red, #f87171); }
      /* ── Temas claros: logo preta, hambúrguer e X escuros ── */
      :host-context([data-theme="branco"]) .logo,
      :host-context([data-theme="rosa"]) .logo,
      :host-context([data-theme="laranja"]) .logo { filter: brightness(0); }
      :host-context([data-theme="branco"]) .hamburger svg,
      :host-context([data-theme="rosa"]) .hamburger svg,
      :host-context([data-theme="laranja"]) .hamburger svg { color: #1a1a1a; }
      :host-context([data-theme="branco"]) .close-btn svg,
      :host-context([data-theme="rosa"]) .close-btn svg,
      :host-context([data-theme="laranja"]) .close-btn svg { color: #1a1a1a; }
      /* ── Engrenagem de layout ── */
      .topbar-right{ display:flex; align-items:center; gap:4px; flex-shrink:0; }
      .gear-btn{ background:transparent; border:none; padding:8px; display:inline-flex; align-items:center; justify-content:center; cursor:pointer; color:var(--dm-text-sub); transition:color .2s; position:relative; }
      .gear-btn:hover{ color:var(--dm-cyan); }
      .gear-btn svg{ transition:transform .4s; }
      .gear-btn.open svg{ transform:rotate(60deg); color:var(--dm-cyan); }
      /* ── Sino de avisos ── */
      .bell-btn{ position:relative; background:transparent; border:none; padding:8px; display:inline-flex; align-items:center; justify-content:center; cursor:pointer; color:var(--dm-text-sub); transition:color .2s; }
      .bell-btn:hover{ color:var(--dm-cyan); }
      .bell-btn:active{ opacity:.7; }
      .bell-dot{ position:absolute; top:7px; right:7px; width:8px; height:8px; border-radius:50%; background:#f87171; border:1.5px solid var(--dm-bg-1,#0a0e27); pointer-events:none; }
      .layout-dropdown{ position:absolute; top:calc(100% + 6px); right:0; background:var(--dm-bg-2); border:1px solid var(--dm-cyan-25); border-radius:12px; padding:6px; min-width:185px; box-shadow:0 10px 30px var(--dm-shadow-lg); display:none; flex-direction:column; gap:2px; z-index:10001; }
      .layout-dropdown.open{ display:flex; animation:ddFadeIn .15s ease; }
      @keyframes ddFadeIn{ from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:translateY(0)} }
      .dd-label{ font-size:.6rem; color:var(--dm-text-sub); text-transform:uppercase; letter-spacing:1.5px; padding:6px 12px 4px; font-family:'Rajdhani',sans-serif; }
      .dd-divider{ height:1px; background:linear-gradient(90deg,transparent,var(--dm-cyan-20),transparent); margin:3px 0; }
      .dd-option{ display:flex; align-items:center; gap:10px; padding:10px 14px; border-radius:8px; cursor:pointer; font-family:'Rajdhani',sans-serif; font-size:.9rem; font-weight:700; color:var(--dm-text); letter-spacing:.5px; text-transform:uppercase; border:none; background:none; width:100%; text-align:left; transition:background .15s; }
      .dd-option:hover{ background:var(--dm-cyan-08); }
      .dd-option.active{ background:var(--dm-cyan-12); color:var(--dm-cyan); }
      .dd-dot{ width:8px; height:8px; border-radius:50%; flex-shrink:0; }
      .overlay{ position:fixed; top:0; left:0; width:100vw; height:100vh; background:var(--dm-overlay); backdrop-filter:blur(3px); opacity:0; pointer-events:none; transition:opacity .3s; z-index:9998; }
      .overlay.on{ opacity:1; pointer-events:auto; }
      .sidebar{ position:fixed; top:0; right:-100%; width:280px; max-width:85vw; height:100vh; background:var(--dm-grad-sidebar); border-left:1px solid var(--dm-cyan-20); box-shadow:-5px 0 30px var(--dm-shadow-lg); transition:right .3s cubic-bezier(.25,.8,.25,1); z-index:9999; display:flex; flex-direction:column; overflow-y:auto; scrollbar-width:none; }
      .sidebar::-webkit-scrollbar{ display:none; }
      .sidebar.on{ right:0; }
      .sb-header{ display:flex; align-items:center; justify-content:space-between; padding:20px 24px; border-bottom:1px solid var(--dm-border); position:sticky; top:0; background:var(--dm-bg-panel); backdrop-filter:blur(5px); z-index:10; }
      .sb-title{ font-family:'Rajdhani',sans-serif; font-size:1.4rem; font-weight:700; color:var(--dm-text); letter-spacing:1px; text-transform:uppercase; text-shadow:0 0 10px var(--dm-cyan-40); }
      .close-btn{ background:transparent; border:none; padding:5px; cursor:pointer; display:flex; align-items:center; transition:transform .2s; }
      .close-btn:active{ transform:scale(.8); }
      .auth-area{ padding:16px 20px; border-bottom:1px solid var(--dm-cyan-10); background:var(--dm-bg-tint); }
      .btn-access{ display:flex; align-items:center; justify-content:center; gap:8px; background:var(--dm-grad-cyan, linear-gradient(135deg,var(--dm-cyan,#00d4d4) 0%,var(--dm-gold,#f0c040) 100%)); color:#fff; border:none; padding:12px 20px; border-radius:10px; font-family:'Rajdhani',sans-serif; font-weight:700; font-size:1rem; text-transform:uppercase; cursor:pointer; text-decoration:none; width:100%; letter-spacing:.05em; transition:box-shadow .25s,opacity .2s; box-shadow:0 0 14px var(--dm-cyan-20,rgba(0,212,212,.35)); }
      .btn-access:active{ opacity:.85; }
      .btn-access:hover{ box-shadow:0 0 22px rgba(0,229,229,.5); }
      .user-card{ display:flex; align-items:center; gap:12px; }
      .avatar-wrap{ width:46px; height:46px; border-radius:50%; border:2px solid var(--dm-cyan); overflow:hidden; flex-shrink:0; background:var(--dm-bg-1); display:flex; align-items:center; justify-content:center; }
      .avatar-wrap img{ width:100%; height:100%; object-fit:cover; }
      .user-info{ display:flex; flex-direction:column; gap:2px; }
      .user-name{ font-family:'Rajdhani',sans-serif; font-weight:700; font-size:1rem; color:var(--dm-text); text-transform:uppercase; letter-spacing:.05em; }
      .user-tag{ font-size:.7rem; color:var(--dm-cyan); font-family:'Rajdhani'; }
      .auth-actions{ display:flex; flex-direction:column; gap:6px; margin-top:12px; }
      .auth-link{ display:flex; align-items:center; gap:10px; padding:10px 14px; border-radius:8px; text-decoration:none; font-size:.9rem; font-weight:600; color:var(--dm-text-sub); transition:background .2s,color .2s; border:none; background:none; cursor:pointer; font-family:'Exo 2',sans-serif; width:100%; }
      .auth-link:hover{ background:var(--dm-cyan-08); color:var(--dm-text); }
      .auth-link.danger{ color:var(--dm-red, #f87171); }
      .auth-link.danger:hover{ background:rgba(248,113,113,.08); }
      .hidden{ display:none !important; }
      .menu-list{ padding:15px 0; display:flex; flex-direction:column; }
      .menu-item{ border-bottom:1px solid var(--dm-bw03); }
      .direct,.menu-acc{ width:100%; background:transparent; border:none; padding:16px 24px; display:flex; align-items:center; justify-content:space-between; cursor:pointer; text-decoration:none; transition:background .2s; }
      .direct:hover,.menu-acc:hover{ background:var(--dm-cyan-05); }
      .direct:active,.menu-acc:active{ background:var(--dm-cyan-10); }
      .menu-content{ display:flex; align-items:center; gap:14px; font-family:'Rajdhani',sans-serif; font-size:1.15rem; font-weight:700; color:var(--dm-text); text-transform:uppercase; letter-spacing:.5px; }
      .chevron{ transition:transform .3s; }
      .has-sub.open .chevron{ transform:rotate(180deg); color:var(--dm-cyan); }
      .has-sub.open .menu-content{ color:var(--dm-cyan); }
      .sub-wrap{ max-height:0; overflow:hidden; transition:max-height .3s ease; background:var(--dm-bg-tint); }
      .sub-inner{ display:flex; flex-direction:column; padding:5px 0 10px 52px; }
      .sub-link{ text-decoration:none; color:var(--dm-text-sub); font-size:.95rem; font-weight:600; padding:12px 24px 12px 0; border-bottom:1px solid var(--dm-bw03); transition:color .2s; }
      .sub-link:last-child{ border-bottom:none; }
      .sub-link:active,.sub-link:hover{ color:var(--dm-cyan); }
      /* ── Itens "em breve": desabilitados visualmente ── */
      .disabled-item{ opacity:.45; cursor:default; pointer-events:none; padding:16px 24px; display:flex; align-items:center; justify-content:space-between; }
      .em-breve-tag{ font-family:'Rajdhani',sans-serif; font-size:.65rem; font-weight:700; text-transform:uppercase; letter-spacing:.8px; color:var(--dm-gold); background:var(--dm-gold-10,rgba(240,192,64,.12)); border:1px solid var(--dm-gold-20,rgba(240,192,64,.25)); border-radius:20px; padding:2px 8px; }
    </style>

    <div class="topbar">
      <img src="${URL_LOGO}" alt="DMaior Agency" class="logo">
      <div class="topbar-right">

        <!-- Engrenagem: alterna entre layout Original e Dinâmico Pro -->
        <div style="position:relative;">
          <button class="gear-btn" id="gearBtn" title="Configurar layout">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          </button>
          <div class="layout-dropdown" id="layoutDropdown">
            <div class="dd-label">Layout</div>
            <div class="dd-divider"></div>
            <button class="dd-option" id="ddOriginal" data-layout="original">
              <span class="dd-dot" style="background:#00d4d4;"></span> Original
            </button>
            <button class="dd-option" id="ddDinamico" data-layout="dinamico">
              <span class="dd-dot" style="background:#f0c040;"></span> Dinâmico Pro
            </button>
            <div class="dd-divider"></div>
            <div class="dd-label">Cor</div>
            <button class="dd-option" id="ddThemeOriginal" data-theme-id="original">
              <span class="dd-dot" style="background:#0a0e27;border:1.5px solid rgba(0,212,212,.5);"></span> Original
            </button>
            <button class="dd-option" id="ddThemeDark" data-theme-id="dark">
              <span class="dd-dot" style="background:#0d0f14;border:1.5px solid rgba(180,180,200,.3);"></span> Dark
            </button>
            <button class="dd-option" id="ddThemeBranco" data-theme-id="branco">
              <span class="dd-dot" style="background:#f0f4f8;border:1.5px solid rgba(0,0,0,.25);"></span> Branco
            </button>
            <button class="dd-option" id="ddThemeRosa" data-theme-id="rosa">
              <span class="dd-dot" style="background:#fce4ec;border:1.5px solid #e91e8c;"></span> Rosa
            </button>
            <button class="dd-option" id="ddThemeLaranja" data-theme-id="laranja">
              <span class="dd-dot" style="background:#fff3e0;border:1.5px solid #f97316;"></span> Laranja
            </button>
          </div>
        </div>

        <!-- Sino de avisos — visível somente quando logado -->
        <button class="bell-btn hidden" id="bellBtn" title="Avisos">
          ${SVG_BELL}
          <span class="bell-dot hidden" id="bellDot"></span>
        </button>

        <button class="hamburger" id="openSb">${SVG_MENU}</button>
      </div>
    </div>

    <div class="overlay" id="overlay"></div>

    <div class="sidebar" id="sidebar">
      <div class="sb-header">
        <div class="sb-title">Menu</div>
        <button class="close-btn" id="closeSb">${SVG_CLOSE}</button>
      </div>

      <div class="auth-area">
        <!-- Botão de acesso ao painel — visível quando não logado -->
        <a href="painel/index.html" class="btn-access" id="btnAccess">
          ${SVG_ACCESS} ACESSAR PAINEL
        </a>
        <div class="hidden" id="userCard">
          <div class="user-card">
            <div class="avatar-wrap" id="avatarWrap">${SVG_USER}</div>
            <div class="user-info">
              <span class="user-name" id="userName">Streamer</span>
              <span class="user-tag">DMaior Agency</span>
            </div>
          </div>
          <div class="auth-actions">
            <a href="painel/index.html" class="auth-link">${SVG_PAINEL} Painel do Host</a>
            <button class="auth-link danger" id="btnLogout">${SVG_LOGOUT} Sair</button>
          </div>
        </div>
      </div>

      <div class="menu-list">${menuHTML}</div>
    </div>`;
  }

  updateAuthUI(detail) {
    const root       = this.shadowRoot;
    const btnAccess  = root.getElementById('btnAccess');
    const userCard   = root.getElementById('userCard');
    const avatarWrap = root.getElementById('avatarWrap');
    const userName   = root.getElementById('userName');
    const bellBtn    = root.getElementById('bellBtn');
    if (!btnAccess || !userCard) return;
    if (detail.logado) {
      btnAccess.classList.add('hidden');
      userCard.classList.remove('hidden');
      // Exibe o sino e verifica avisos não lidos (com retry até DmaiorAPI estar pronta)
      if (bellBtn) {
        bellBtn.classList.remove('hidden');
        this._scheduleCheckUnread();
      }
      // Cria <img> via DOM para evitar XSS — valida esquema antes de atribuir src
      if (detail.foto) {
        let fotoSrc = 'https://cdn-icons-png.flaticon.com/512/149/149071.png';
        try {
          const u = new URL(String(detail.foto));
          if (u.protocol === 'http:' || u.protocol === 'https:') fotoSrc = detail.foto;
        } catch {}
        const imgEl = document.createElement('img');
        imgEl.src = fotoSrc;
        imgEl.alt = 'Avatar';
        imgEl.style.cssText = 'width:100%;height:100%;object-fit:cover;';
        imgEl.onerror = () => { imgEl.src = 'https://cdn-icons-png.flaticon.com/512/149/149071.png'; };
        avatarWrap.innerHTML = '';
        avatarWrap.appendChild(imgEl);
      }
      if (detail.nome) userName.textContent = detail.nome.split(' ')[0];
    } else {
      btnAccess.classList.remove('hidden');
      userCard.classList.add('hidden');
      // Esconde sino quando não logado
      if (bellBtn) bellBtn.classList.add('hidden');
    }
  }

  bindEvents() {
    const root    = this.shadowRoot;
    const openBtn = root.getElementById('openSb');
    const closeBtn= root.getElementById('closeSb');
    const overlay = root.getElementById('overlay');
    const sidebar = root.getElementById('sidebar');

    const toggle = (force = null) => {
      const isOpen    = sidebar.classList.contains('on');
      const shouldClose = force === false || (force === null && isOpen);
      sidebar.classList.toggle('on', !shouldClose);
      overlay.classList.toggle('on', !shouldClose);
    };

    openBtn.addEventListener('click',  () => toggle());
    closeBtn.addEventListener('click', () => toggle(false));
    overlay.addEventListener('click',  () => toggle(false));

    // ── Engrenagem: dropdown de layout ────────────────────────────
    const gearBtn        = root.getElementById('gearBtn');
    const layoutDropdown = root.getElementById('layoutDropdown');
    const ddOriginal     = root.getElementById('ddOriginal');
    const ddDinamico     = root.getElementById('ddDinamico');

    // Lê layout salvo e marca opção ativa
    const updateGearActive = () => {
      let saved = 'original';
      try { saved = localStorage.getItem('dm_layout') || 'original'; } catch (_) {}
      ddOriginal.classList.toggle('active', saved === 'original');
      ddDinamico.classList.toggle('active', saved === 'dinamico');
    };
    updateGearActive();

    // Abre/fecha dropdown
    gearBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = layoutDropdown.classList.toggle('open');
      gearBtn.classList.toggle('open', isOpen);
    });

    // Fecha ao clicar fora (escuta no document via host element)
    document.addEventListener('click', () => {
      layoutDropdown.classList.remove('open');
      gearBtn.classList.remove('open');
    });

    // Seleciona layout e notifica o services-menu via evento customizado
    [ddOriginal, ddDinamico].forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const layout = btn.dataset.layout;
        try { localStorage.setItem('dm_layout', layout); } catch (_) {}
        updateGearActive();
        layoutDropdown.classList.remove('open');
        gearBtn.classList.remove('open');
        // Dispara evento global para services-menu reagir sem reload
        window.dispatchEvent(new CustomEvent('dmaior:layout', { detail: { layout } }));
      });
    });

    // ── Seletor de cor de tema ────────────────────────────────────────
    const themeButtons = [
      root.getElementById('ddThemeOriginal'),
      root.getElementById('ddThemeDark'),
      root.getElementById('ddThemeBranco'),
      root.getElementById('ddThemeRosa'),
      root.getElementById('ddThemeLaranja'),
    ];

    // Marca opção de cor ativa
    const updateThemeActive = () => {
      let saved = 'original';
      try { saved = localStorage.getItem('dm_tema') || 'original'; } catch (_) {}
      themeButtons.forEach(b => b && b.classList.toggle('active', b.dataset.themeId === saved));
    };
    updateThemeActive();

    themeButtons.forEach(btn => {
      if (!btn) return;
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const tema = btn.dataset.themeId;
        // Salva no localStorage
        try { localStorage.setItem('dm_tema', tema); } catch (_) {}
        // Aplica data-theme no <html> (Original não precisa de atributo)
        if (tema === 'original') {
          document.documentElement.removeAttribute('data-theme');
        } else {
          document.documentElement.setAttribute('data-theme', tema);
        }
        updateThemeActive();
        layoutDropdown.classList.remove('open');
        gearBtn.classList.remove('open');
        // Notifica outros componentes
        window.dispatchEvent(new CustomEvent('dmaior:tema', { detail: { tema } }));
      });
    });

    // Submenus com accordion
    root.querySelectorAll('.menu-acc').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx    = btn.getAttribute('data-index');
        const wrap   = root.getElementById(`sub-${idx}`);
        const parent = btn.parentElement;
        const open   = parent.classList.contains('open');
        // Fecha todos os submenus abertos
        root.querySelectorAll('.has-sub').forEach(el => {
          el.classList.remove('open');
          const w = root.getElementById(`sub-${el.querySelector('.menu-acc').getAttribute('data-index')}`);
          if (w) w.style.maxHeight = null;
        });
        if (!open) {
          parent.classList.add('open');
          wrap.style.maxHeight = wrap.scrollHeight + 'px';
        }
      });
    });

    // Fecha sidebar ao clicar em qualquer link
    root.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => {
        setTimeout(() => toggle(false), 200);
      });
    });

    // Logout
    const btnLogout = root.getElementById('btnLogout');
    if (btnLogout) {
      btnLogout.addEventListener('click', () => {
        toggle(false);
        window.dispatchEvent(new CustomEvent('dmaior:logout'));
      });
    }

    // Sino de avisos
    const bellBtn = root.getElementById('bellBtn');
    if (bellBtn) {
      bellBtn.addEventListener('click', () => {
        this.markAvisosRead();
        if (document.querySelector('dmaior-app')) {
          // Dentro do painel — navega inline via evento
          window.dispatchEvent(new CustomEvent('dmaior:avisos'));
        } else {
          // Site público — redireciona para o painel com deeplink #avisos
          window.location.href = 'painel/index.html#avisos';
        }
      });
    }
  }

  // Agenda checkUnread com retry enquanto DmaiorAPI não estiver disponível
  // (evita falha silenciosa quando o menu carrega antes da API)
  _scheduleCheckUnread(attempts = 0) {
    if (window.DmaiorAPI?.rank?.getComunicados) {
      this.checkUnread();
      return;
    }
    // Tenta até 6 vezes (~5 s total): 300 ms → 600 → 900 → 1500 → 2000 → 2000
    if (attempts < 6) {
      const delay = attempts < 3 ? 300 + attempts * 300 : 2000;
      setTimeout(() => this._scheduleCheckUnread(attempts + 1), delay);
    }
    // Após 6 tentativas desiste silenciosamente — comunicados são opcionais
  }

  // Verifica se há comunicados não lidos e acende o ponto vermelho
  async checkUnread() {
    try {
      const uid     = localStorage.getItem('dm_uid') || 'anon';
      const seenRaw = localStorage.getItem(`dm_avisos_ids_${uid}`);
      const seen    = seenRaw ? JSON.parse(seenRaw) : [];
      const data    = await window.DmaiorAPI.rank.getComunicados('painel');
      const lista   = data.comunicados || [];
      const hasNew  = lista.some(c => !seen.includes(String(c.id)));
      const dot     = this.shadowRoot?.getElementById('bellDot');
      if (dot) dot.classList.toggle('hidden', !hasNew);
    } catch { /* silencia — sino é opcional */ }
  }

  // Marca todos os comunicados atuais como lidos e apaga o ponto
  markAvisosRead() {
    try {
      if (!window.DmaiorAPI?.rank?.getComunicados) return;
      const uid = localStorage.getItem('dm_uid') || 'anon';
      window.DmaiorAPI.rank.getComunicados('painel')
        .then(data => {
          const ids = (data.comunicados || []).map(c => String(c.id));
          localStorage.setItem(`dm_avisos_ids_${uid}`, JSON.stringify(ids));
          const dot = this.shadowRoot?.getElementById('bellDot');
          if (dot) dot.classList.add('hidden');
        })
        .catch(() => {});
    } catch { /* silencia */ }
  }
}

customElements.define('menu-mobile-dmaior', MenuMobileDMaior);
