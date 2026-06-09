/**
 * ranking.js — Ranking público interativo da DMaior Agency
 *
 * Custom Element: <ranking-dmaior>
 * Pódio top 3, lista paginada, abas Diamantes/Horas, histórico por mês.
 *
 * ALTERAÇÕES em relação ao original Wix:
 *   - Removida constante CLOUDFLARE_API hardcoded
 *   - Todos os fetch() substituídos por window.DmaiorAPI.rank.*
 *   - localStorage protegido com verificação de window
 *
 * Design 100% preservado.
 */

class RankingDmaior extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });

    // Configuração das abas — mês atual via Supabase, histórico via Google Sheets
    this.ABAS_CONFIG = [
      { nome: 'Mês Atual', tipo: 'supabase_mes',  compararCom: null },
      { nome: 'Maio',      tipo: 'sheets', gid: '291423187',  compararCom: 'Abril' },
      { nome: 'Abril',     tipo: 'sheets', gid: '1754974993', compararCom: 'Março' },
      { nome: 'Março',     tipo: 'sheets', gid: '1675182517', compararCom: 'Fevereiro' },
      { nome: 'Fevereiro', tipo: 'sheets', gid: '0',          compararCom: 'Janeiro' },
      { nome: 'Janeiro',   tipo: 'sheets', gid: '1749572638', compararCom: null },
    ];

    this.currentTab    = 'diamonds';
    this.currentPage   = 1;
    this.PAGE_SIZE     = 50;
    this.allRows       = [];
    this.prevRows      = [];
    this.prizesD       = [];
    this.prizesH       = [];
    this.cache         = {};
    this.timerInterval = null;
    this.liveSet       = new Set();
    this._menuObserver     = null;
    this._menuPollInterval = null;

    this.DSVG      = `<svg viewBox="0 0 24 24" width="16" fill="currentColor"><path d="M6 2L2 8l10 14L22 8l-4-6H6zm1.5 2h9l2.5 4H5L6.5 4zM12 18L5.5 9h13L12 18z"/></svg>`;
    this.HSVG      = `<svg viewBox="0 0 24 24" width="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`;
    this.CLOCK_SVG = `<svg viewBox="0 0 24 24" width="15" fill="currentColor" style="flex-shrink:0"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>`;
    this.STAR_SVG  = `<svg viewBox="0 0 24 24" width="12" fill="currentColor" style="margin-right:3px"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>`;
  }

  // Lê token do ranking do localStorage de forma segura
  _getToken() {
    if (typeof window === 'undefined') return '';
    try { return localStorage.getItem('dmaior_token') || this._sessionToken || ''; } catch { return ''; }
  }

  _isLoggedIn() {
    if (typeof window === 'undefined') return false;
    try { return !!this._getToken() || localStorage.getItem('agencia_auth') === 'true'; } catch { return false; }
  }

  connectedCallback() {
    this.loadFonts();
    this.render();
    this.bindEvents();
    if (this._isLoggedIn()) this.initDashboard();
    this._setupMenuDetection();
    // Re-renderiza a lista quando o tema muda para atualizar cores inline
    this._temaHandler = () => { if (this.allRows.length) this.renderList(); };
    window.addEventListener('dmaior:tema', this._temaHandler);
  }

  disconnectedCallback() {
    if (this._menuObserver)     { this._menuObserver.disconnect(); this._menuObserver = null; }
    window.removeEventListener('dmaior:tema', this._temaHandler);
    if (this._menuPollInterval) { clearInterval(this._menuPollInterval); }
    clearInterval(this.timerInterval);
  }

  // Esconde o botão lateral de regras quando o menu mobile está aberto
  _setupMenuDetection() {
    const check = () => {
      const tabBtn = this.shadowRoot.getElementById('info-tab-btn');
      const panel  = this.shadowRoot.getElementById('info-panel');
      const ovrl   = this.shadowRoot.getElementById('panel-overlay');
      if (!tabBtn) return;
      const open = this._isExternalMenuOpen();
      tabBtn.style.opacity       = open ? '0'      : '1';
      tabBtn.style.visibility    = open ? 'hidden' : 'visible';
      tabBtn.style.pointerEvents = open ? 'none'   : 'auto';
      if (open) { panel?.classList.remove('open'); ovrl?.classList.remove('show'); }
    };
    this._menuObserver = new MutationObserver(check);
    this._menuObserver.observe(document.documentElement, {
      attributes: true, attributeFilter: ['class', 'style'], childList: true, subtree: true,
    });
    this._menuPollInterval = setInterval(check, 300);
  }

  _isExternalMenuOpen() {
    const menuEl = document.querySelector('menu-mobile-dmaior');
    if (menuEl && menuEl.shadowRoot) {
      const sidebar = menuEl.shadowRoot.getElementById('sidebar');
      if (sidebar && sidebar.classList.contains('on')) return true;
    }
    return false;
  }

  loadFonts() {
    if (!document.getElementById('google-fonts-ranking')) {
      const link = document.createElement('link');
      link.id  = 'google-fonts-ranking';
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=Exo+2:wght@400;600&family=Rajdhani:wght@700&display=swap';
      document.head.appendChild(link);
    }
  }

  render() {
    this.shadowRoot.innerHTML = `
    <style>
      :host{display:block;width:100%;
        --roxo:#3b82f6;--azul:#00e5e5;
        --bloom-grad:linear-gradient(135deg,var(--roxo) 0%,var(--azul) 100%);
        --text:#ffffff;--text-sub:#d0d8e8;--text-muted:#a0b8c8;
        --bg-app:#0C0E1E;--bg-app2:#040404;
        --bg-card:rgba(18,18,31,0.85);--bg-card2:rgba(12,14,30,0.9);
        --border:rgba(59,130,246,0.4);--border-dim:rgba(59,130,246,0.1);
        --gold:#f0c040;--bronze:#a86c31;--red:#f87171;--green2:#4ade80;--yellow:#fbbf24;
        --podium-1:rgba(240,192,64,0.15);--podium-2:rgba(59,130,246,0.15);--podium-3:rgba(168,108,49,0.15);
        --t-title-lg:clamp(1.1rem,4.5vw,1.6rem);--t-title-md:clamp(1rem,4vw,1.3rem);
        --t-val:clamp(0.78rem,2vw,0.9rem);--t-info:clamp(0.72rem,1.9vw,0.82rem);
        --font-title:'Rajdhani',sans-serif;--font-body:'Exo 2',sans-serif;}
      /* ── Tema escuro ── */
      :host-context([data-theme="dark"]){
        --bg-app:#0d0f14;--bg-app2:#08090e;
        --bg-card:rgba(19,22,31,0.9);--bg-card2:rgba(13,15,20,0.95);
        --text:#e8edf5;--text-sub:#b0bec8;--text-muted:#8898b0;
        --border:rgba(0,196,196,0.35);--border-dim:rgba(0,196,196,0.1);
        --roxo:#2563eb;--azul:#00c4c4;}
      /* ── Tema branco ── */
      :host-context([data-theme="branco"]){
        --bg-app:#eaeff6;--bg-app2:#f0f4f8;
        --bg-card:rgba(255,255,255,0.95);--bg-card2:rgba(240,244,248,0.98);
        --text:#0d1117;--text-sub:#2d3748;--text-muted:#4a5568;
        --border:rgba(0,149,168,0.35);--border-dim:rgba(0,149,168,0.12);
        --roxo:#0369a1;--azul:#0095a8;
        --bloom-grad:linear-gradient(135deg,#0369a1 0%,#0095a8 100%);
        --gold:#b8860b;--bronze:#7c5000;--red:#dc2626;--green2:#15803d;
        --podium-1:rgba(184,134,11,0.12);--podium-2:rgba(3,105,161,0.12);--podium-3:rgba(124,80,0,0.12);}
      /* ── Tema Rosa ── */
      :host-context([data-theme="rosa"]){
        --bg-app:#fff5f8;--bg-app2:#fce4ec;
        --bg-card:rgba(255,255,255,0.95);--bg-card2:rgba(252,228,236,0.98);
        --text:#1a0010;--text-sub:#4a0028;--text-muted:#80004a;
        --border:rgba(233,30,140,0.35);--border-dim:rgba(233,30,140,0.15);
        --roxo:#e91e8c;--azul:#c2185b;
        --bloom-grad:linear-gradient(135deg,#e91e8c 0%,#ff6090 100%);
        --gold:#c2185b;--bronze:#880040;--red:#b71c1c;--green2:#2e7d32;
        --podium-1:rgba(194,24,91,0.15);--podium-2:rgba(233,30,140,0.12);--podium-3:rgba(136,0,64,0.12);}
      /* ── Tema Laranja ── */
      :host-context([data-theme="laranja"]){
        --bg-app:#fff8f0;--bg-app2:#fff3e0;
        --bg-card:rgba(255,255,255,0.95);--bg-card2:rgba(255,243,224,0.98);
        --text:#1a0a00;--text-sub:#4a2000;--text-muted:#7c3a00;
        --border:rgba(249,115,22,0.35);--border-dim:rgba(249,115,22,0.15);
        --roxo:#f97316;--azul:#ea580c;
        --bloom-grad:linear-gradient(135deg,#f97316 0%,#fbbf24 100%);
        --gold:#ea580c;--bronze:#92400e;--red:#dc2626;--green2:#15803d;
        --podium-1:rgba(234,88,12,0.15);--podium-2:rgba(249,115,22,0.12);--podium-3:rgba(146,64,14,0.12);}
      *{margin:0;padding:0;box-sizing:border-box}
      .app-container{background:linear-gradient(180deg,var(--bg-app) 0%,var(--bg-app2) 100%);background-attachment:fixed;color:var(--text);font-family:var(--font-body);min-height:100vh;display:flex;flex-direction:column;align-items:center;padding:20px;padding-bottom:50px;overflow-x:hidden;width:100%}
      h1,h2,h3,.rajdhani,.name{font-family:var(--font-title);letter-spacing:1px;text-transform:uppercase}
      /* ── Botões de faixa (1-20, 21-40…) — reage ao tema (ativo = bloom-grad, inativo = bg-card) ── */
      .page-btn{padding:8px 15px;border-radius:8px;cursor:pointer;font-family:var(--font-title);font-weight:700;background:var(--bg-card);color:var(--text-muted);border:1px solid var(--border-dim);transition:all .2s}
      .page-btn:hover{background:var(--border-dim);color:var(--text-sub);border-color:var(--border);}
      .page-btn.active{background:var(--bloom-grad);color:#fff;border:1px solid transparent;box-shadow:0 0 15px var(--border)}
      .glass-card{background:linear-gradient(160deg,var(--bg-card2) 0%,var(--bg-card) 100%);border:1px solid var(--border);border-radius:20px;position:relative;overflow:hidden;transition:all 0.3s ease;backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px)}
      .glass-card::after{content:'';position:absolute;bottom:0;left:0;right:0;background:linear-gradient(90deg,transparent,var(--roxo),var(--azul),transparent);height:2px}
      #login-screen{position:fixed;inset:0;background:rgba(4,4,4,0.98);display:flex;align-items:flex-start;justify-content:center;padding-top:20px;z-index:1000}
      .login-box{padding:40px;width:90%;max-width:400px;text-align:center}
      .login-box h2{font-size:var(--t-title-lg);background:var(--bloom-grad);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:20px}
      .input-group{position:relative;margin-bottom:20px}
      .input-group input{width:100%;padding:15px;border-radius:8px;border:1px solid var(--border);background:rgba(0,0,0,0.6);color:var(--text);font-family:'Exo 2';font-size:var(--t-info);outline:none;text-align:center;letter-spacing:2px}
      .input-group input:focus{border-color:var(--roxo);box-shadow:0 0 10px var(--border)}
      #toggle-pw{position:absolute;right:15px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:var(--text-muted)}
      #toggle-pw svg{width:22px;height:22px;fill:currentColor}
      .remember-me{display:flex;align-items:center;justify-content:center;gap:8px;font-size:var(--t-info);color:var(--text-sub);margin-bottom:20px;cursor:pointer}
      .btn-submit{width:100%;padding:15px;background:var(--bloom-grad);border:none;border-radius:10px;color:#fff;font-family:'Rajdhani';font-size:var(--t-title-md);font-weight:700;cursor:pointer}
      .btn-submit:hover{box-shadow:0 0 20px var(--border);transform:translateY(-1px)}
      #login-error{color:var(--red);font-size:var(--t-info);margin-top:15px;display:none}
      #dashboard{display:none;width:100%;max-width:600px;margin:0 auto}
      .header{text-align:center;margin-bottom:20px}
      .header h1{font-size:var(--t-title-lg);color:var(--text);margin-bottom:10px;text-shadow:0 0 15px var(--border)}
      .time-counter{font-size:var(--t-info);color:var(--gold);font-family:'Rajdhani';letter-spacing:1px;margin-bottom:12px;text-transform:uppercase;font-weight:700;display:flex;align-items:center;justify-content:center;gap:6px;min-height:20px}
      .period-wrapper{position:relative;width:100%;max-width:300px;margin:0 auto}
      .period-wrapper::after{content:"▼";position:absolute;right:15px;top:50%;transform:translateY(-50%);color:var(--roxo);pointer-events:none;font-size:0.8rem}
      /* MÊS ATUAL — fundo usa var(--bg-card) para ficar claro nos temas claros */
      .period-select{width:100%;padding:12px 35px 12px 15px;background:var(--bg-card);color:var(--text);border:1px solid var(--border);border-radius:10px;font-family:'Rajdhani';font-size:var(--t-title-md);outline:none;cursor:pointer;appearance:none;text-align:center;text-transform:uppercase;box-shadow:0 2px 8px var(--border-dim);transition:border-color .2s,box-shadow .2s}
      .period-select:focus{border-color:var(--roxo);box-shadow:0 0 0 3px var(--border-dim)}
      /* Barra DIAMANTES/HORAS — fundo usa var(--bg-card2) para adaptar ao tema */
      .tabs{display:flex;gap:10px;margin-bottom:15px;margin-top:15px;background:var(--bg-card2);padding:5px;border-radius:12px;border:1px solid var(--border-dim)}
      .tab-btn{flex:1;padding:12px;border:none;background:transparent;color:var(--text-muted);font-family:'Rajdhani';font-size:var(--t-info);border-radius:8px;cursor:pointer;transition:0.3s;display:flex;align-items:center;justify-content:center;gap:8px}
      .tab-btn:hover{background:var(--border-dim);color:var(--text-sub);}
      .tab-btn.active{background:var(--bloom-grad);color:#fff;box-shadow:0 0 15px var(--border)}
      .tab-btn svg{width:16px;height:16px}
      .growth{font-size:0.68rem;padding:2px 6px;border-radius:4px;display:inline-flex;align-items:center;font-family:var(--font-title);font-weight:700;margin-top:4px}
      .growth.up{background:rgba(74,222,128,0.15);color:var(--green2);border:1px solid rgba(74,222,128,0.3)}
      .growth.down{background:rgba(248,113,113,0.15);color:var(--red);border:1px solid rgba(248,113,113,0.3)}
      .growth.neutral{background:var(--border-dim);color:var(--text-muted);border:1px solid var(--border-dim)}
      .growth.new{background:var(--bloom-grad);color:#fff;border:none;padding:3px 7px}
      .badges-container{display:flex;gap:6px;align-items:center;flex-wrap:wrap}
      /* ── Pódio ── */
      .podium{display:flex;justify-content:center;align-items:flex-end;height:320px;margin-bottom:40px;margin-top:70px;gap:14px;animation:fadeUp 0.6s ease both}
      /* Cards totalmente arredondados e com borda completa nos 4 lados */
      .podium-item{display:flex;flex-direction:column;align-items:center;width:30%;border-radius:16px;padding-top:15px;padding-bottom:14px;position:relative;border:1px solid;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)}
      /* Fundo adapta ao tema: gradient de tint para bg-card2 — fica escuro no dark, branco no claro */
      .podium-item.second{height:230px;background:linear-gradient(to bottom,var(--podium-2),var(--bg-card2));border-color:var(--roxo)}
      .podium-item.first{height:290px;background:linear-gradient(to bottom,var(--podium-1),var(--bg-card2));border-color:var(--azul);width:36%;box-shadow:0 0 28px var(--podium-1)}
      .podium-item.third{height:200px;background:linear-gradient(to bottom,var(--podium-3),var(--bg-card2));border-color:var(--bronze)}
      .avatar-wrapper{position:relative;margin-top:-45px;margin-bottom:12px}
      /* Anel do avatar: todos os 3 usam a cor de acento do tema; fundo usa bg-card2 (claro nos temas claros) */
      .avatar{width:60px;height:60px;border-radius:50%;background-color:var(--bg-card2);border:3px solid var(--azul);object-fit:cover}
      .first .avatar{width:75px;height:75px;border-color:var(--azul);border-width:3.5px}
      .second .avatar{border-color:var(--roxo)}
      .third .avatar{border-color:var(--bronze)}
      .badge{position:absolute;top:-5px;right:-5px;width:24px;height:24px;border-radius:50%;display:flex;justify-content:center;align-items:center;font-size:12px;font-weight:900;font-family:'Rajdhani';border:2px solid #000;z-index:3}
      .first .badge{background:var(--gold);color:#000;width:28px;height:28px;top:-8px;right:-8px}
      .second .badge{background:var(--roxo);color:#fff}
      .third .badge{background:var(--bronze);color:#fff}
      /* Valores: todos usam var(--azul) do tema atual para consistência visual */
      .podium-val{font-size:1.2rem;font-weight:800;font-family:'Rajdhani';display:flex;align-items:center;gap:5px;margin-top:2px;color:var(--azul)}
      .first .podium-val{font-size:1.5rem}
      .crown-emoji{position:absolute;top:-42px;left:50%;transform:translateX(-50%) rotate(-10deg);font-size:36px;filter:drop-shadow(0 2px 8px rgba(240,192,64,0.7));z-index:5}
      .podium-item .name{width:95%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-align:center;margin-bottom:0;font-size:13px}
      .podium-id{font-size:10px;color:var(--text-muted);margin-bottom:4px;font-family:'Exo 2',sans-serif}
      /* Tag de prêmio: verde sólido preenchido + texto branco — igual ao design de referência */
      .prize-tag{font-size:0.9rem;color:#fff;background:#166534;padding:6px 16px;border-radius:20px;margin-top:8px;font-family:'Rajdhani',sans-serif;font-weight:700;border:none;display:flex;align-items:center;letter-spacing:0.5px;box-shadow:0 2px 8px rgba(22,101,52,0.35)}
      .first .prize-tag{font-size:1.1rem;padding:7px 18px}
      .list-prize-tag{font-size:0.75rem;color:#fff;background:#166534;padding:3px 9px;border-radius:12px;font-family:'Rajdhani',sans-serif;font-weight:700;border:none;display:inline-flex;align-items:center;margin-top:4px;box-shadow:0 1px 5px rgba(22,101,52,0.3)}
      .currency-symbol{margin-right:4px;font-size:0.9em;opacity:0.9}
      .ranking-list{display:flex;flex-direction:column;gap:10px;width:100%;animation:fadeUp 0.8s ease both}
      .list-item{display:flex;align-items:center;padding:12px 18px;background:var(--bg-card);border-radius:16px;border:1px solid var(--border-dim);transition:transform 0.2s}
      .list-item:hover{transform:translateX(5px);background:var(--podium-2);border-color:var(--border)}
      .list-rank{width:35px;font-size:var(--t-title-md);font-family:'Rajdhani';font-weight:700;color:var(--text-muted);text-align:center}
      .list-avatar-wrap{position:relative;width:45px;height:45px;margin-right:15px;flex-shrink:0}
      .list-avatar{width:45px;height:45px;border-radius:50%;object-fit:cover;border:2px solid var(--border-dim);display:block}
      /* ── Live: sem borda azul, sem texto LIVE — só bolinha com barrinhas animadas ── */
      .avatar-wrapper.is-live .avatar,.list-avatar-wrap.is-live .list-avatar{border:2px solid var(--border-dim)}
      .live-badge,.list-live-badge{display:none}
      /* Bolinha animada estilo Kwai — tema escuro: sólida na cor azul do tema */
      .live-dot{position:absolute;bottom:2px;right:2px;width:16px;height:16px;background:var(--azul);border-radius:50%;display:flex;align-items:center;justify-content:center;gap:1.5px;z-index:4;box-shadow:0 0 6px var(--border);border:2px solid var(--azul);outline:2px solid rgba(0,0,0,0.5);}
      .live-dot span{display:block;width:2px;border-radius:2px;background:#fff;animation:livebar 0.9s ease-in-out infinite;}
      .live-dot span:nth-child(1){height:4px;animation-delay:0s}
      .live-dot span:nth-child(2){height:7px;animation-delay:0.2s}
      .live-dot span:nth-child(3){height:4px;animation-delay:0.4s}
      @keyframes livebar{0%,100%{transform:scaleY(0.4)}50%{transform:scaleY(1.2)}}
      /* Temas claros — bolinha branca com borda/glow da cor do tema */
      :host-context([data-theme="branco"]) .live-dot,
      :host-context([data-theme="rosa"]) .live-dot,
      :host-context([data-theme="laranja"]) .live-dot{background:#fff;border-color:var(--azul);outline-color:rgba(255,255,255,0.6);}
      :host-context([data-theme="branco"]) .live-dot span,
      :host-context([data-theme="rosa"]) .live-dot span,
      :host-context([data-theme="laranja"]) .live-dot span{background:var(--azul);}
      .list-name-col{display:flex;flex-direction:column;justify-content:center;flex:1;min-width:0;margin-right:10px}
      .list-name{font-size:var(--t-info);color:var(--text);font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .list-id{font-size:0.7rem;color:var(--text-muted);font-family:'Exo 2',sans-serif}
      /* Valor do score na lista — estilo idêntico ao panel-value do painel admin: gradiente de texto + letter-spacing */
      .list-score{font-size:var(--t-val);font-weight:700;font-family:'Rajdhani';margin-left:auto;display:flex;align-items:center;gap:6px;letter-spacing:0.5px;background:var(--bloom-grad);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}
      .state-msg{text-align:center;padding:40px;color:var(--roxo);font-family:'Rajdhani'}
      .spinner{width:40px;height:40px;border-radius:50%;border:3px solid var(--border-dim);border-top-color:var(--roxo);animation:spin 0.8s linear infinite;margin:0 auto 15px}
      .logout-btn{background:var(--bg-card);border:1px solid var(--border-dim);color:var(--red);cursor:pointer;margin-top:35px;padding:8px 16px;border-radius:8px;transition:0.3s}
      .page-btn{padding:8px 15px;border-radius:8px;cursor:pointer;font-family:'Rajdhani';font-weight:700}
      @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
      @keyframes spin{100%{transform:rotate(360deg)}}
      .panel-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,0.55);backdrop-filter:blur(2px);-webkit-backdrop-filter:blur(2px);z-index:298;}
      .panel-overlay.show{display:block}
      /* Botão "Regras" lateral — box-shadow usa var(--roxo) para seguir o tema */
      .info-tab-btn{position:fixed;right:0;bottom:28%;background:var(--bloom-grad);color:#fff;border:none;border-radius:10px 0 0 10px;padding:22px 10px;cursor:pointer;font-family:'Rajdhani',sans-serif;font-weight:700;font-size:0.72rem;letter-spacing:3px;text-transform:uppercase;writing-mode:vertical-lr;z-index:299;box-shadow:-4px 0 22px var(--border);display:flex;align-items:center;gap:10px;line-height:1;opacity:1;visibility:visible;pointer-events:auto;transition:opacity 0.25s ease,visibility 0.25s ease,box-shadow 0.3s;}
      .info-tab-btn:hover{box-shadow:-4px 0 32px var(--azul)}
      .info-tab-btn .tab-icon{display:block;transform:rotate(90deg);width:15px;height:15px;flex-shrink:0;}
      .info-panel{position:fixed;right:-290px;bottom:10%;width:255px;max-height:82vh;overflow-y:auto;overflow-x:hidden;padding:20px 18px 22px;z-index:299;border-radius:16px 0 0 16px !important;transition:right 0.35s cubic-bezier(0.4,0,0.2,1);scrollbar-width:thin;scrollbar-color:var(--border) transparent;}
      .info-panel::-webkit-scrollbar{width:3px}
      .info-panel::-webkit-scrollbar-thumb{background:var(--border);border-radius:4px}
      .info-panel::after{content:'';position:absolute;top:0;left:0;bottom:0;width:2px;right:auto !important;background:linear-gradient(180deg,transparent,var(--roxo),var(--azul),transparent);height:100% !important;}
      .info-panel.open{right:40px}
      .panel-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;padding-bottom:12px;border-bottom:1px solid var(--border-dim)}
      .panel-title{font-size:1rem;font-family:'Rajdhani',sans-serif;letter-spacing:2px;text-transform:uppercase;background:var(--bloom-grad);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
      .close-panel{background:var(--border-dim);border:1px solid var(--border-dim);color:var(--text-muted);cursor:pointer;width:26px;height:26px;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:0.9rem;transition:0.2s;flex-shrink:0}
      .close-panel:hover{color:var(--red);border-color:rgba(248,113,113,0.4);background:rgba(248,113,113,0.08)}
      .panel-row{display:flex;flex-direction:column;gap:3px;margin-bottom:13px}
      .panel-label{font-size:0.6rem;color:var(--text-muted);font-family:'Rajdhani',sans-serif;letter-spacing:2px;text-transform:uppercase}
      .panel-value{font-size:0.82rem;color:var(--azul);font-family:'Rajdhani',sans-serif;font-weight:700;letter-spacing:0.5px}
      .panel-value.highlight{color:var(--gold)}
      .panel-divider{height:1px;background:var(--border-dim);margin:14px 0}
      #rule-text{font-size:0.75rem;color:var(--text-sub);line-height:1.5;text-align:left;padding:0;margin-bottom:0}
      #rule-text b{color:var(--azul)}
      .btn-refresh{width:100%;padding:11px;background:transparent;border:1px solid var(--border);border-radius:10px;color:var(--text-muted);font-family:'Rajdhani';font-size:0.82rem;letter-spacing:1.5px;text-transform:uppercase;cursor:pointer;transition:0.3s;display:flex;align-items:center;justify-content:center;gap:8px;margin-top:2px}
      .btn-refresh:hover{border-color:var(--azul);color:var(--azul);background:var(--border-dim)}
      .btn-refresh:disabled{opacity:0.35;cursor:not-allowed}
      .btn-refresh svg{width:15px;height:15px;fill:currentColor;transition:transform 0.4s}
      .btn-refresh:not(:disabled):hover svg{transform:rotate(180deg)}
      @media(max-width:480px){
        /* Mobile: usa as vars do tema em vez de forçar fundo escuro */
        .app-container{background:linear-gradient(180deg,var(--bg-app) 0%,var(--bg-app2) 100%) !important}
        .glass-card,.podium-item,.tabs,.list-item,.period-select{backdrop-filter:none !important;-webkit-backdrop-filter:none !important;box-shadow:none !important}
        .podium{height:270px;gap:8px;animation:none}
        .podium-item.first{height:250px}.podium-item.second{height:190px}.podium-item.third{height:160px}
        .avatar{width:45px;height:45px}.first .avatar{width:55px;height:55px}
        .crown-emoji{top:-38px;font-size:30px}
        .ranking-list{animation:none}
        .podium-val{font-size:0.95rem}.first .podium-val{font-size:1.15rem}
        .podium-item .name,.list-name{font-size:11px}
        .podium-id,.list-id{font-size:10px}
        .prize-tag{font-size:0.8rem;padding:2px 6px}.first .prize-tag{font-size:0.95rem}
        .list-prize-tag{font-size:0.65rem;padding:2px 4px}
        .list-score{font-size:0.8rem}
        .list-item{padding:10px 10px}
        .list-rank{width:25px;font-size:1rem}
        .list-avatar-wrap{width:35px;height:35px;margin-right:8px}
        .list-avatar{width:35px;height:35px}
        .info-tab-btn{padding:18px 9px;font-size:0.68rem;bottom:28%}
        .info-panel{width:232px}
        .info-panel.open{right:34px}
      }
    </style>

    <div class="app-container">
      <div id="login-screen">
        <div class="glass-card login-box">
          <h2>RANK GERAL</h2>
          <div class="input-group">
            <input type="password" id="pass" placeholder="Insira a Senha">
            <button type="button" id="toggle-pw">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>
            </button>
          </div>
          <label class="remember-me"><input type="checkbox" id="remember" checked> Lembrar neste dispositivo</label>
          <button class="btn-submit" id="btn-login">ACESSAR</button>
          <p id="login-error">Senha incorreta. Tente novamente.</p>
        </div>
      </div>

      <div id="dashboard">
        <div class="header">
          <h1>RANKING GERAL</h1>
          <div id="time-counter" class="time-counter"></div>
          <div class="period-wrapper">
            <select id="sheet-selector" class="period-select"></select>
          </div>
        </div>
        <div class="tabs">
          <button class="tab-btn active" id="btn-diamonds">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 2L2 8l10 14L22 8l-4-6H6zm1.5 2h9l2.5 4H5L6.5 4zM12 18L5.5 9h13L12 18z"/></svg> DIAMANTES
          </button>
          <button class="tab-btn" id="btn-hours">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> HORAS
          </button>
        </div>
        <div id="content"></div>
        <div style="text-align:center"><button class="logout-btn" id="btn-logout">Sair</button></div>
        <div id="panel-overlay" class="panel-overlay"></div>
        <button id="info-tab-btn" class="info-tab-btn" title="Informações e Regras">
          <svg class="tab-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
          REGRAS
        </button>
        <div id="info-panel" class="info-panel glass-card">
          <div class="panel-header">
            <span class="panel-title">Informações</span>
            <button id="close-panel" class="close-panel" title="Fechar">✕</button>
          </div>
          <div class="panel-row">
            <span class="panel-label">Período</span>
            <span id="info-date" class="panel-value">--/--/----</span>
          </div>
          <div class="panel-row">
            <span class="panel-label">Atualizado às</span>
            <span id="info-time" class="panel-value">--:--</span>
          </div>
          <div class="panel-row">
            <span class="panel-label">Qualificados</span>
            <span id="panel-count" class="panel-value highlight">--</span>
          </div>
          <div class="panel-divider"></div>
          <div id="rule-text"></div>
          <div class="panel-divider"></div>
          <button id="btn-refresh" class="btn-refresh">
            <svg viewBox="0 0 24 24"><path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg>
            ATUALIZAR
          </button>
        </div>
      </div>
    </div>`;
  }

  bindEvents() {
    const r = this.shadowRoot;
    r.getElementById('pass').addEventListener('keydown', e => { if (e.key === 'Enter') this.doLogin(); });
    r.getElementById('btn-login').addEventListener('click', () => this.doLogin());
    r.getElementById('toggle-pw').addEventListener('click', () => this.togglePassword());
    r.getElementById('sheet-selector').addEventListener('change', () => this.loadTabData());
    r.getElementById('btn-diamonds').addEventListener('click', () => this.setTab('diamonds'));
    r.getElementById('btn-hours').addEventListener('click', () => this.setTab('hours'));
    r.getElementById('btn-logout').addEventListener('click', () => this.logout());
    r.getElementById('btn-refresh').addEventListener('click', () => { this.cache = {}; this.loadTabData(); });
    r.getElementById('info-tab-btn').addEventListener('click', () => this.togglePanel());
    r.getElementById('close-panel').addEventListener('click', () => this.closePanel());
    r.getElementById('panel-overlay').addEventListener('click', () => this.closePanel());
    r.addEventListener('click', e => {
      if (e.target.classList.contains('page-btn')) this.goPage(parseInt(e.target.getAttribute('data-page')));
    });
  }

  togglePanel() {
    const panel   = this.shadowRoot.getElementById('info-panel');
    const overlay = this.shadowRoot.getElementById('panel-overlay');
    panel.classList.toggle('open');
    overlay.classList.toggle('show', panel.classList.contains('open'));
  }

  closePanel() {
    this.shadowRoot.getElementById('info-panel').classList.remove('open');
    this.shadowRoot.getElementById('panel-overlay').classList.remove('show');
  }

  togglePassword() {
    const p = this.shadowRoot.getElementById('pass');
    p.type = p.type === 'password' ? 'text' : 'password';
  }

  // Login via DmaiorAPI centralizado
  async doLogin() {
    const val = this.shadowRoot.getElementById('pass').value;
    const err = this.shadowRoot.getElementById('login-error');
    err.style.display = 'none';
    try {
      const data = await window.DmaiorAPI.rank.login(val);
      if (data.sucesso && data.token) {
        if (typeof window !== 'undefined') {
          if (this.shadowRoot.getElementById('remember').checked) {
            try { localStorage.setItem('dmaior_token', data.token); } catch {}
          } else {
            this._sessionToken = data.token;
          }
        }
        this.initDashboard();
      } else {
        err.style.display = 'block';
        setTimeout(() => err.style.display = 'none', 3000);
      }
    } catch {
      err.textContent   = 'Erro ao conectar no servidor.';
      err.style.display = 'block';
    }
  }

  logout() {
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('dmaior_token');
        localStorage.removeItem('agencia_auth');
      } catch {}
    }
    this._sessionToken = '';
    location.reload();
  }

  initDashboard() {
    this.shadowRoot.getElementById('login-screen').style.display = 'none';
    this.shadowRoot.getElementById('dashboard').style.display    = 'block';
    const sel = this.shadowRoot.getElementById('sheet-selector');
    sel.innerHTML = '';
    this.ABAS_CONFIG.forEach(aba => {
      const o = document.createElement('option');
      o.value = aba.nome; o.textContent = aba.nome;
      sel.appendChild(o);
    });
    this.updateRuleText();
    this.loadTabData();
  }

  _isMesAtual() {
    const nomeAba = this.shadowRoot.getElementById('sheet-selector')?.value;
    const config  = this.ABAS_CONFIG.find(a => a.nome === nomeAba);
    return config?.tipo === 'supabase_mes';
  }

  // Busca streamers ao vivo via DmaiorAPI
  async fetchLives() {
    if (!this._isMesAtual()) { this.liveSet = new Set(); return; }
    try {
      const data = await window.DmaiorAPI.rank.getLives(this._getToken());
      this.liveSet = new Set(data.ao_vivo || []);
      if (this.allRows.length) this.renderScreen();
    } catch {}
  }

  updateRuleText() {
    const el = this.shadowRoot.getElementById('rule-text');
    if (!el) return;
    el.innerHTML = this.currentTab === 'diamonds'
      ? 'Somente streamers com <b>1.000 diamantes</b> ou mais são exibidos no ranking.'
      : 'Horas em <b>Live de Áudio</b> não são contabilizadas no ranking de horas.';
  }

  startTimer(periodStr) {
    clearInterval(this.timerInterval);
    const timerEl = this.shadowRoot.getElementById('time-counter');
    if (!periodStr || periodStr === '--/--/----') { timerEl.innerHTML = ''; return; }
    let endDateStr = periodStr;
    if (periodStr.includes('-')) { const parts = periodStr.split('-'); endDateStr = parts[parts.length - 1].trim(); }
    const dateParts = endDateStr.split('/');
    if (dateParts.length < 2) { timerEl.innerHTML = ''; return; }
    const day = parseInt(dateParts[0], 10), month = parseInt(dateParts[1], 10) - 1;
    const year = dateParts.length > 2 ? parseInt(dateParts[2], 10) : new Date().getFullYear();
    const endDateObj = new Date(year, month, day, 23, 59, 59);
    if (isNaN(endDateObj.getTime())) { timerEl.innerHTML = ''; return; }
    this.timerInterval = setInterval(() => {
      const now = new Date(), diff = endDateObj - now;
      if (diff <= 0) { timerEl.innerHTML = `${this.CLOCK_SVG} Período Encerrado`; clearInterval(this.timerInterval); return; }
      const d = Math.floor(diff / (1000 * 60 * 60 * 24));
      const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const m = Math.floor((diff / 1000 / 60) % 60);
      const s = Math.floor((diff / 1000) % 60);
      const pad = n => String(n).padStart(2, '0');
      timerEl.innerHTML = `${this.CLOCK_SVG} ${d}d ${pad(h)}h ${pad(m)}m ${pad(s)}s`;
    }, 1000);
  }

  // Carrega dados da aba selecionada via DmaiorAPI
  async loadTabData() {
    const nomeAba    = this.shadowRoot.getElementById('sheet-selector').value;
    const config     = this.ABAS_CONFIG.find(a => a.nome === nomeAba);
    const el         = this.shadowRoot.getElementById('content');
    const btnRefresh = this.shadowRoot.getElementById('btn-refresh');

    clearInterval(this.timerInterval);
    this.shadowRoot.getElementById('time-counter').innerHTML = '';
    this.liveSet = new Set();
    el.innerHTML = `<div class="state-msg"><div class="spinner"></div>Carregando ${nomeAba}...</div>`;
    btnRefresh.disabled = true;

    try {
      if (config.tipo === 'supabase_mes') {
        await this.fetchPrizes();
        const data = await window.DmaiorAPI.rank.getRanking(this._getToken());
        if (data.erro) throw new Error(data.erro);
        this.allRows  = (data.streamers || []).map(s => ({
          img:      this.proxyImg(s.foto_url),
          id:       s.kwai_id  || s.kwai_uid,
          uid:      s.kwai_uid,
          nome:     s.kwai_id  || s.kwai_uid || '—',
          diamonds: Number(s.diamantes_acumulados) || 0,
          hoursStr: s.horas_video || '00:00',
          hoursMin: this.h2m(s.horas_video),
        }));
        this.prevRows = [];
        const hoje = new Date();
        const mm   = String(hoje.getMonth() + 1).padStart(2, '0');
        const ano  = hoje.getFullYear();
        const ult  = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate();
        this.shadowRoot.getElementById('info-date').textContent = `01/${mm}/${ano} - ${ult}/${mm}/${ano}`;
        this.shadowRoot.getElementById('info-time').textContent = hoje.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        const ultimoDia = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
        this.startTimer(`${String(ultimoDia.getDate()).padStart(2,'0')}/${String(ultimoDia.getMonth()+1).padStart(2,'0')}/${ultimoDia.getFullYear()}`);
        await this.fetchLives();
      } else {
        const [sheetData] = await Promise.all([
          this.fetchSheet(nomeAba),
          Promise.resolve(this.prizesD = this.prizesH = []),
        ]);
        this.allRows = sheetData.rows;
        this.shadowRoot.getElementById('info-date').textContent = sheetData.date;
        this.shadowRoot.getElementById('info-time').textContent = sheetData.time;
        this.startTimer(sheetData.date);
        const prevData = config.compararCom ? await this.fetchSheet(config.compararCom) : { rows: [] };
        this.prevRows  = prevData.rows;
      }
      this.currentPage = 1;
      this.renderScreen();
    } catch (e) {
      el.innerHTML = `<div class="state-msg" style="color:var(--red)">Erro ao carregar os dados.<br><small>${e.message}</small></div>`;
    } finally {
      btnRefresh.disabled = false;
    }
  }

  // Busca prêmios via DmaiorAPI
  async fetchPrizes() {
    try {
      const data = await window.DmaiorAPI.rank.getPrizes(this._getToken());
      if (!data?.ok) return;
      const fmt = v => Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      this.prizesD = [];
      this.prizesH = [];
      (data.premiosD || []).forEach(p => { if (p.valor > 0) this.prizesD[p.posicao - 1] = fmt(p.valor); });
      (data.premiosH || []).forEach(p => { if (p.valor > 0) this.prizesH[p.posicao - 1] = fmt(p.valor); });
    } catch {}
  }

  // Busca planilha histórica via DmaiorAPI (com cache no localStorage)
  async fetchSheet(nomeAba) {
    if (this.cache[nomeAba]) return this.cache[nomeAba];
    const config = this.ABAS_CONFIG.find(a => a.nome === nomeAba);
    if (!config || config.tipo !== 'sheets') return { rows: [], time: '', date: '' };
    const cacheKey = 'dmaior_sheet_data_' + config.gid;
    try {
      let localData = null;
      if (typeof window !== 'undefined') {
        try { localData = localStorage.getItem(cacheKey); } catch {}
      }
      if (localData) {
        window.DmaiorAPI.rank.getSheet(config.gid, this._getToken())
          .then(raw => { if (raw && raw.length > 50 && typeof window !== 'undefined') {
            try { localStorage.setItem(cacheKey, raw); } catch {}
          }})
          .catch(() => {});
        const parsed = this.parseRows(localData);
        this.cache[nomeAba] = parsed;
        return parsed;
      }
      const raw = await window.DmaiorAPI.rank.getSheet(config.gid, this._getToken());
      if (raw && raw.length > 50 && typeof window !== 'undefined') {
        try { localStorage.setItem(cacheKey, raw); } catch {}
      }
      const data = this.parseRows(raw);
      this.cache[nomeAba] = data;
      return data;
    } catch {
      let fallback = null;
      if (typeof window !== 'undefined') { try { fallback = localStorage.getItem(cacheKey); } catch {} }
      if (fallback) return this.parseRows(fallback);
      return { rows: [], time: '', date: '' };
    }
  }

  parseRows(text) {
    const lines = text.split('\n');
    if (lines.length < 2) return { rows: [], time: '', date: '' };
    const firstRowCols = lines[1].split(',').map(v => v.replace(/"/g, '').trim());
    const timeG2 = firstRowCols[6] || '--:--';
    const dateH2 = firstRowCols[7] || '--/--/----';
    const rows = lines.slice(1).map(l => {
      const c = l.split(',').map(v => v.replace(/"/g, '').trim());
      if (!c[1]) return null;
      return {
        img: c[0] || 'https://cdn-icons-png.flaticon.com/512/149/149071.png',
        id: c[1], nome: c[2] || '', uid: c[3] || '',
        diamonds: parseInt(c[4]?.replace(/\D/g, '') || '0'),
        hoursStr: c[5] || '0:00',
        hoursMin: this.h2m(c[5]),
      };
    }).filter(Boolean);
    return { rows, time: timeG2, date: dateH2 };
  }

  h2m(t) {
    if (!t || !t.includes(':')) return 0;
    const p = t.split(':');
    return (parseInt(p[0] || 0) * 60) + parseInt(p[1] || 0);
  }

  // Valida que a URL tem esquema http/https antes de usar — bloqueia javascript: e data:
  safeUrl(url) {
    if (!url) return '';
    try {
      const u = new URL(String(url));
      return (u.protocol === 'http:' || u.protocol === 'https:') ? url : '';
    } catch { return ''; }
  }

  proxyImg(url) {
    const safe = this.safeUrl(url);
    if (!safe) return 'https://cdn-icons-png.flaticon.com/512/149/149071.png';
    return `https://images.weserv.nl/?url=${encodeURIComponent(safe)}&w=80&h=80&fit=cover&output=webp`;
  }

  // Escapa caracteres HTML perigosos de dados externos (Supabase/Sheets) antes de injetar via innerHTML
  esc(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  }

  growthHtml(s) {
    if (!this.prevRows.length) return '';
    const pv  = this.prevRows.find(p => p.uid === s.uid);
    const cur = this.currentTab === 'diamonds' ? s.diamonds : s.hoursMin;
    const prv = pv ? (this.currentTab === 'diamonds' ? pv.diamonds : pv.hoursMin) : 0;
    if (!pv) return `<span class="growth new">${this.STAR_SVG} Novo</span>`;
    const pct = prv > 0 ? ((cur - prv) / prv) * 100 : 100;
    if (pct > 0)  return `<span class="growth up">▲ ${pct.toFixed(1)}%</span>`;
    if (pct < 0)  return `<span class="growth down">▼ ${Math.abs(pct).toFixed(1)}%</span>`;
    return `<span class="growth neutral">- 0%</span>`;
  }

  renderScreen() {
    const el      = this.shadowRoot.getElementById('content');
    const nomeAba = this.shadowRoot.getElementById('sheet-selector').value;
    const config  = this.ABAS_CONFIG.find(a => a.nome === nomeAba);
    const isSupa  = config?.tipo === 'supabase_mes';
    const isMes   = config?.tipo === 'supabase_mes';
    const isD     = this.currentTab === 'diamonds';

    let filtered = isD ? this.allRows.filter(r => r.diamonds >= 1000) : [...this.allRows];
    filtered.sort((a, b) => isD ? b.diamonds - a.diamonds : b.hoursMin - a.hoursMin);

    const countEl = this.shadowRoot.getElementById('panel-count');
    if (countEl) countEl.textContent = filtered.length;

    const start         = (this.currentPage - 1) * this.PAGE_SIZE;
    const slice         = filtered.slice(start, start + this.PAGE_SIZE);
    const icon          = isD ? this.DSVG : this.HSVG;
    const getVal        = s => isD ? s.diamonds.toLocaleString('pt-BR') : s.hoursStr;
    const currentPrizes = isD ? this.prizesD : this.prizesH;

    let html = '';

    if (this.currentPage === 1 && filtered.length >= 1) {
      html += `<div class="podium">`;
      [1, 0, 2].forEach(idx => {
        const s = filtered[idx];
        if (!s) { html += `<div class="podium-item" style="border:none;background:transparent;backdrop-filter:none"></div>`; return; }
        const type       = idx === 0 ? 'first' : (idx === 1 ? 'second' : 'third');
        const prizeValue = isSupa && currentPrizes[idx] ? currentPrizes[idx] : '';
        const prizeHtml  = prizeValue ? `<div class="prize-tag"><span class="currency-symbol">R$</span> ${prizeValue}</div>` : '';
        const isLive     = isMes && this.liveSet.has(s.uid);
        const liveDot    = isLive ? `<div class="live-dot"><span></span><span></span><span></span></div>` : '';
        html += `
          <div class="podium-item ${type}">
            <div class="avatar-wrapper${isLive ? ' is-live' : ''}">
              ${idx === 0 ? `<div class="crown-emoji">👑</div>` : ''}
              <img src="${s.img}" class="avatar" onerror="this.src='https://cdn-icons-png.flaticon.com/512/149/149071.png'">
              <div class="badge">${idx + 1}</div>
              ${liveDot}
            </div>
            <div class="name" title="${this.esc(s.nome)}">${this.esc(s.nome) || 'Sem Nome'}</div>
            <div class="podium-id">@${this.esc(s.id)}</div>
            <div class="podium-val">${icon} ${getVal(s)}</div>
            ${prizeHtml}
            ${this.growthHtml(s)}
          </div>`;
      });
      html += `</div>`;
    }

    html += `<div class="ranking-list">`;
    const listSlice = this.currentPage === 1 ? filtered.slice(3, this.PAGE_SIZE) : slice;
    const offset    = this.currentPage === 1 ? 3 : start;
    listSlice.forEach((s, i) => {
      const globalIndex   = offset + i;
      const prizeValue    = isSupa && currentPrizes[globalIndex] ? currentPrizes[globalIndex] : '';
      const isLiveItem    = isMes && this.liveSet.has(s.uid);
      const liveDotItem   = isLiveItem ? `<div class="live-dot"><span></span><span></span><span></span></div>` : '';
      html += `
        <div class="list-item">
          <div class="list-rank">${globalIndex + 1}</div>
          <div class="list-avatar-wrap${isLiveItem ? ' is-live' : ''}">
            <img src="${s.img}" class="list-avatar" onerror="this.src='https://cdn-icons-png.flaticon.com/512/149/149071.png'">
            ${liveDotItem}
          </div>
          <div class="list-name-col">
            <div class="list-name" title="${this.esc(s.nome)}">${this.esc(s.nome) || 'Sem Nome'}</div>
            <div class="list-id">@${this.esc(s.id)}</div>
            <div class="badges-container">
              ${this.growthHtml(s)}
              ${prizeValue ? `<span class="list-prize-tag"><span class="currency-symbol">R$</span> ${prizeValue}</span>` : ''}
            </div>
          </div>
          <div class="list-score">${icon} ${getVal(s)}</div>
        </div>`;
    });
    html += `</div>`;

    const totalPages = Math.ceil(filtered.length / this.PAGE_SIZE);
    if (totalPages > 1) {
      html += `<div style="display:flex;justify-content:center;gap:8px;margin-top:25px;flex-wrap:wrap">`;
      for (let p = 1; p <= totalPages; p++) {
        const active = p === this.currentPage;
        const inicio = (p - 1) * this.PAGE_SIZE + 1;
        const fim    = Math.min(p * this.PAGE_SIZE, filtered.length);
        const label  = `${inicio}–${fim}`;
        html += `<button class="page-btn${active ? ' active' : ''}" data-page="${p}">${label}</button>`;
      }
      html += `</div>`;
    }

    el.innerHTML = html;
  }

  goPage(p) { this.currentPage = p; this.renderScreen(); window.scrollTo({ top: 0, behavior: 'smooth' }); }

  setTab(t) {
    this.currentTab  = t;
    this.currentPage = 1;
    this.shadowRoot.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    this.shadowRoot.getElementById('btn-' + t).classList.add('active');
    this.updateRuleText();
    this.renderScreen();
  }
}

customElements.define('ranking-dmaior', RankingDmaior);
