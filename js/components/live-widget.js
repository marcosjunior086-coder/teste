/**
 * live-widget.js — Widget de transmissões ao vivo dos streamers DMaior
 *
 * Adaptado de kwai-live-widget.js (Wix Custom Element) para Hostinger estático.
 *
 * MUDANÇAS EM RELAÇÃO AO ORIGINAL:
 *  - this.PROXY e this.API_DMAIOR removidos — substituídos por getter _proxyBase
 *    e chamadas a window.DmaiorAPI.live.*
 *  - fetchEntries() usa window.DmaiorAPI.live.getLives() (sem fetch direto)
 *  - proxyFetch() usa window.DmaiorAPI.live.proxy() (sem fetch direto)
 *  - Todas as referências a this.PROXY no player HLS usam this._proxyBase
 *  - Identidade visual e lógica originais preservadas integralmente
 *
 * DEPENDÊNCIAS (carregar antes deste arquivo):
 *  - js/api.js (window.DmaiorConfig + window.DmaiorAPI)
 *  - HLS.js é carregado dinamicamente pelo componente (cdn.jsdelivr.net)
 */

class KwaiLiveWidget extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });

    // ── Configurações de cache e lote ──────────────────────────────────────
    this.CACHE_KEY     = 'widget_live_v6';
    this.CACHE_TTL     = 50000;
    this.BATCH_SIZE    = 5;
    this.ENABLE_MINI_PREVIEW = true;

    // Ícones SVG para o botão de mute/som
    this.SVG_MUTED = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>`;
    this.SVG_SOUND = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>`;

    // Estado interno do widget
    this.activePlayers  = new Map();
    this.activeCategory = 'Todos';
    this.isChecking     = false;
    this.isFirstLoad    = true;
    this.isMinimized    = false;
    this.userMinimized  = false;

    this.hlsModal        = null;
    this.hlsReadyPromise = null;
  }

  // ── Getter: URL base do proxy (vem de DmaiorConfig — sem hardcode) ─────────
  // Usado pelo HLS xhrSetup e nas URLs de src proxy do player
  get _proxyBase() {
    return window.DmaiorConfig.workers.live.replace(/\/$/, '') + '/?';
  }

  // ── Helpers de segurança ───────────────────────────────────────────────────

  // Escapa caracteres HTML — evita XSS em innerHTML
  _safe(str) {
    return String(str || '').replace(/[&<>"']/g, (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
    );
  }

  // Valida que a URL é HTTP(S) antes de usar em src/poster
  _safeUrl(url) {
    if (typeof url !== 'string') return '';
    const trimmed = url.trim();
    if (!trimmed.startsWith('https://') && !trimmed.startsWith('http://')) return '';
    return trimmed;
  }

  // ──────────────────────────────────────────────────────────────────────────

  async connectedCallback() {
    this.render();
    this.setupListeners();
    this.hlsReadyPromise = this.loadHlsLib();
    this.initObserver();
    this.init();
    // Atualiza as lives a cada 30 segundos — timer guardado para limpeza
    this.refreshTimer = setInterval(() => this.init(), 30000);
  }

  disconnectedCallback() {
    // Limpa o timer de atualização ao remover o componente do DOM
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  // Carrega HLS.js do CDN de forma assíncrona (não bloqueia se CDN falhar)
  loadHlsLib() {
    return new Promise((resolve) => {
      if (window.Hls) return resolve();
      const s   = document.createElement('script');
      s.src     = 'https://cdn.jsdelivr.net/npm/hls.js@1.5.20'; // versão fixada — evita quebra por update automático
      s.onload  = resolve;
      s.onerror = resolve; // não bloqueia se CDN falhar
      document.head.appendChild(s);
    });
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
        *{margin:0;padding:0;box-sizing:border-box;}
        :host{display:block;width:100%;}

        #liveWidget{
          background:var(--dm-grad-sidebar);
          border-bottom:1px solid var(--dm-effect-20, var(--dm-rank-cyan-20, rgba(0,212,212,.20)));
          padding:8px 6px 12px;color:var(--dm-text);
          position:relative;width:100%;
          font-family:var(--dm-font-body,'Inter',Arial,sans-serif);
          transition:padding .3s ease;
        }
        #liveWidget::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,var(--dm-effect-blue,var(--dm-rank-blue,#3b82f6)),var(--dm-effect-accent,var(--dm-rank-cyan,#00d4d4)),transparent);}
        #liveWidget.minimized{padding-bottom:6px;}

        #liveTop{display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;padding:0 8px;}
        /* Cor do texto "N AO VIVO" e bolinha — usa --dm-green que já adapta por tema */
        #liveCount{font-size:.65rem;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--dm-green,#4ade80);display:flex;align-items:center;gap:6px;}
        .live-dot{width:6px;height:6px;border-radius:50%;background:var(--dm-green,#4ade80);box-shadow:0 0 6px var(--dm-green,#4ade80);animation:dotPulse 2s infinite;}
        @keyframes dotPulse{0%,100%{box-shadow:0 0 6px var(--dm-green,#4ade80);}50%{box-shadow:0 0 2px var(--dm-green,#4ade80);opacity:.4;}}

        .top-right{display:flex;align-items:center;gap:8px;}

        #catFilter{
          background:var(--dm-bg-3);border:1px solid var(--dm-effect-35,var(--dm-rank-cyan-35,rgba(0,212,212,.35)));color:var(--dm-effect-accent,var(--dm-rank-cyan,#00d4d4));
          padding:3px 12px;border-radius:20px;
          font-family:var(--dm-font-body,'Inter',Arial,sans-serif);
          font-size:.6rem;font-weight:600;letter-spacing:.5px;text-transform:uppercase;
          cursor:pointer;outline:none;-webkit-appearance:none;appearance:none;display:none;
        }
        #catFilter option{background:var(--dm-bg-3);color:var(--dm-text);}

        #toggleMin{
          background:var(--dm-cyan-10);border:1px solid var(--dm-effect-35,var(--dm-rank-cyan-35,rgba(0,212,212,.35)));color:var(--dm-effect-accent,var(--dm-rank-cyan,#00d4d4));
          width:22px;height:22px;border-radius:5px;
          font-size:.85rem;font-weight:700;cursor:pointer;
          display:flex;align-items:center;justify-content:center;
          flex-shrink:0;line-height:1;transition:background .15s;
        }
        #toggleMin:hover{background:var(--dm-cyan-20);}

        #liveRow{
          display:flex;gap:8px;overflow-x:auto;overflow-y:visible;
          scrollbar-width:none;padding:8px;align-items:flex-start;
          min-height:80px;max-height:300px;
          transition:max-height .3s ease,opacity .3s ease,padding .3s ease,min-height .3s ease;
        }
        #liveRow::-webkit-scrollbar{display:none;}
        #liveRow.collapsed{max-height:0!important;opacity:0;padding-top:0!important;padding-bottom:0!important;min-height:0!important;overflow:hidden;}
        #emptyMsg{color:var(--dm-text-sub);font-size:.7rem;padding:8px 0;align-self:center;}

        .live-card{flex-shrink:0;text-align:center;cursor:pointer;width:52px;touch-action:manipulation;-webkit-tap-highlight-color:transparent;transition:transform .18s;}
        .live-card:hover{transform:scale(1.07);}

        /* Anel do avatar — usa var(--dm-cyan) para seguir o tema atual */
        .avatar-wrap{position:relative;width:52px;height:52px;margin:0 auto;border-radius:50%;
          background:var(--dm-grad-cyan,linear-gradient(135deg,var(--dm-cyan,#00e5e5),#007f9f,var(--dm-cyan,#00e5e5)));padding:2.5px;
          animation:ringGlow 2s ease-in-out infinite;}
        @media(min-width:600px){.live-card{width:60px;}.avatar-wrap{width:60px;height:60px;}#liveRow{gap:10px;}}
        @keyframes ringGlow{0%,100%{box-shadow:0 0 0 0 transparent,0 0 8px var(--dm-cyan-20,rgba(0,212,212,.4));}50%{box-shadow:0 0 0 4px var(--dm-cyan-08,rgba(0,212,212,.18)),0 0 16px var(--dm-cyan-40,rgba(0,212,212,.7));}}
        /* Ring pulse — usa var(--dm-cyan-30) para seguir a cor de acento do tema */
        .avatar-wrap::after{content:'';position:absolute;inset:-3px;border-radius:50%;border:2px solid var(--dm-cyan-30,rgba(0,229,229,.5));animation:ringPulse 2s ease-in-out infinite;pointer-events:none;}
        @keyframes ringPulse{0%{transform:scale(1);opacity:.7;}100%{transform:scale(1.28);opacity:0;}}

        /* Avatar: foto (fallback) embaixo, vídeo (primário) em cima */
        .avatar-circle{
          width:100%;height:100%;border-radius:50%;overflow:hidden;
          background:#111827;position:relative;
          clip-path:circle(50% at 50% 50%);-webkit-clip-path:circle(50% at 50% 50%);
          transform:translateZ(0);
        }
        .avatar-circle img{
          position:absolute;inset:0;width:100%;height:100%;
          object-fit:cover;object-position:center top;
          z-index:1;display:block;
        }
        .avatar-circle video{
          position:absolute;inset:0;width:100%;height:100%;
          object-fit:cover;z-index:2;display:block;
          pointer-events:none;
          border-radius:50%;
          clip-path:circle(50% at 50% 50%);-webkit-clip-path:circle(50% at 50% 50%);
        }

        /* Badge LIVE — fundo = cor de acento do tema; texto #000 no dark (cyan claro), #fff nos temas claros (pink/laranja/teal saturado) */
        .live-badge{position:absolute;bottom:-2px;left:50%;transform:translateX(-50%);z-index:5;
          background:var(--dm-cyan);color:#000;font-size:.42rem;font-weight:700;letter-spacing:1px;
          padding:1px 5px;border-radius:5px;border:1.5px solid var(--dm-bg-3);white-space:nowrap;
          box-shadow:0 0 8px var(--dm-cyan-30);}
        @media(min-width:600px){.live-badge{font-size:.46rem;padding:1px 6px;}}
        /* Temas claros — texto branco sobre fundo saturado */
        :host-context([data-theme="branco"]) .live-badge,
        :host-context([data-theme="rosa"]) .live-badge,
        :host-context([data-theme="laranja"]) .live-badge{color:#fff;}

        .live-name{margin-top:5px;font-size:.54rem;font-weight:600;color:var(--dm-text-sub);
          white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
          text-shadow:0 1px 3px var(--dm-shadow-md);}
        @media(min-width:600px){.live-name{font-size:.58rem;}}

        /* ── Modal ── */
        #modalOverlay{display:none;position:fixed;top:0;left:0;right:0;bottom:0;z-index:9999;
          background:transparent;justify-content:center;align-items:flex-start;padding-top:10px;
          font-family:var(--dm-font-body,'Inter',Arial,sans-serif);}
        #modalOverlay.open{display:flex;animation:fadeIn .2s ease;}
        @keyframes fadeIn{from{opacity:0;}to{opacity:1;}}

        #modalBox{position:relative;width:min(330px,92vw);background:var(--dm-bg-3);
          border:1px solid var(--dm-cyan-30);border-radius:16px;overflow:hidden;
          box-shadow:0 0 40px var(--dm-cyan-12),0 16px 48px var(--dm-shadow-xl);
          animation:slideDown .22s ease;}
        @keyframes slideDown{from{opacity:0;transform:translateY(-20px);}to{opacity:1;transform:translateY(0);}}
        #modalBox::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;
          background:linear-gradient(90deg,transparent,var(--dm-cyan),transparent);z-index:5;}

        /* Proporção portrait 3:4 — Kwai é plataforma vertical */
        .modal-video-wrap{position:relative;width:100%;padding-top:min(116%, 46vh);background:#000;overflow:hidden;}
        @media(max-width:480px){.modal-video-wrap{padding-top:min(108%, 43vh);}}
        #modalVideo{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block;opacity:0;transition:opacity .4s;}
        #modalCover{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:2;transition:opacity .5s;}

        #modalSpinner{position:absolute;inset:0;z-index:3;display:flex;flex-direction:column;
          align-items:center;justify-content:center;gap:10px;background:rgba(0,0,0,.55);}
        .spinner-ring{width:36px;height:36px;border-radius:50%;border:3px solid var(--dm-cyan-20);
          border-top-color:var(--dm-cyan);animation:spin .8s linear infinite;}
        @keyframes spin{to{transform:rotate(360deg);}}
        #spinnerText{font-size:.7rem;color:var(--dm-cyan);letter-spacing:1.5px;}

        #bufferBar{position:absolute;bottom:0;left:0;right:0;height:2px;z-index:4;
          background:var(--dm-cyan-20);display:none;}
        #bufferFill{height:100%;width:0%;background:var(--dm-cyan);transition:width .3s linear;}

        #muteBadge{position:absolute;bottom:10px;right:10px;z-index:6;
          background:rgba(0,0,0,.65);border:1px solid var(--dm-cyan-30);border-radius:20px;
          padding:4px 10px;font-size:.6rem;color:var(--dm-cyan);letter-spacing:1px;cursor:pointer;
          display:none;align-items:center;gap:5px;}

        #viewersOverlay{position:absolute;top:10px;left:12px;z-index:7;display:none;
          align-items:center;gap:5px;background:rgba(0,0,0,.6);
          border:1px solid var(--dm-cyan-30);border-radius:20px;
          padding:4px 10px 4px 8px;font-size:.68rem;color:var(--dm-text);font-weight:600;}
        #viewersOverlay svg{flex-shrink:0;}

        .modal-info{padding:14px 16px 16px;background:var(--dm-bg-3);}
        .modal-header{display:flex;align-items:center;gap:12px;margin-bottom:10px;}
        .modal-avatar{width:40px;height:40px;border-radius:50%;flex-shrink:0;border:2px solid var(--dm-cyan);object-fit:cover;}
        .modal-meta{flex:1;min-width:0;}
        .modal-name{font-size:1rem;font-weight:700;color:var(--dm-text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
        .modal-sub{font-size:.62rem;color:var(--dm-text-muted);margin-top:2px;}

        .modal-actions{display:flex;gap:8px;flex-wrap:wrap;}
        .btn-kwai{flex:1;background:var(--dm-grad-effect,var(--dm-grad-rank,linear-gradient(135deg,#3b82f6,#00d4d4)));color:#000;border:1px solid var(--dm-effect-35,rgba(0,212,212,.35));
          box-shadow:0 10px 24px var(--dm-effect-glow,rgba(59,130,246,.22));
          padding:10px 0;border-radius:8px;font-size:.72rem;font-weight:700;letter-spacing:.8px;cursor:pointer;
          min-width:90px;}
        .btn-kwai:hover{opacity:.85;}
        .btn-kwai-pk{flex:1;background:var(--dm-gold-10);border:1px solid var(--dm-gold-20);
          color:var(--dm-gold);padding:10px 0;border-radius:8px;
          font-size:.72rem;font-weight:700;letter-spacing:.8px;cursor:pointer;
          min-width:90px;}
        .btn-kwai-pk:hover{background:var(--dm-gold-20);}
        .btn-close{width:100%;background:var(--dm-bw05);border:1px solid var(--dm-bw10);
          color:var(--dm-text-muted);padding:9px 0;border-radius:8px;
          font-size:.72rem;font-weight:700;letter-spacing:.8px;cursor:pointer;}
        .btn-close:hover{background:var(--dm-bw10);color:var(--dm-text-sub);}
        #modalClose{position:absolute;top:10px;right:10px;z-index:20;width:28px;height:28px;
          border-radius:50%;background:rgba(0,0,0,.65);border:1px solid rgba(255,255,255,.15);
          color:rgba(255,255,255,.7);font-size:14px;cursor:pointer;
          display:flex;align-items:center;justify-content:center;}
        #modalClose:hover{background:rgba(225,29,72,.5);color:#fff;}
      </style>

      <div id="rootWrap" style="position:relative;">
        <div id="liveWidget">
          <div id="liveTop">
            <div id="liveCount"><span class="live-dot"></span>0 AO VIVO</div>
            <div class="top-right">
              <select id="catFilter"><option value="Todos">Todos</option></select>
              <button id="toggleMin" title="Minimizar">−</button>
            </div>
          </div>
          <div id="liveRow">
            <span id="emptyMsg">A procurar transmissões ao vivo...</span>
          </div>
        </div>

        <div id="modalOverlay">
          <div id="modalBox">
            <button id="modalClose">✕</button>
            <div class="modal-video-wrap">
              <img id="modalCover" src="" alt="">
              <div id="viewersOverlay">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00e5e5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
                <span id="modalViewers">—</span>
              </div>
              <div id="modalSpinner">
                <div class="spinner-ring"></div>
                <div id="spinnerText">CARREGANDO LIVE...</div>
              </div>
              <div id="bufferBar"><div id="bufferFill"></div></div>
              <video id="modalVideo" playsinline muted></video>
              <div id="muteBadge"></div>
            </div>
            <div class="modal-info">
              <div class="modal-header">
                <img class="modal-avatar" id="modalAvatar" src="" alt="">
                <div class="modal-meta">
                  <div class="modal-name" id="modalName">—</div>
                  <div class="modal-sub"  id="modalCaption"></div>
                </div>
              </div>
              <div class="modal-actions">
                <button class="btn-kwai" id="btnOpenKwai">Abrir no Kwai</button>
                <button class="btn-close" id="btnFechar">Fechar</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    window.DMaiorPrefs?.bind(this.shadowRoot);
  }

  setupListeners() {
    this.shadowRoot.getElementById('modalClose').addEventListener('click', () => this.closeModal());
    this.shadowRoot.getElementById('btnFechar').addEventListener('click',  () => this.closeModal());
    this.shadowRoot.getElementById('muteBadge').addEventListener('click',  () => this.toggleMute());
    this.shadowRoot.getElementById('toggleMin').addEventListener('click',  () => this.setMinimized(!this.isMinimized, true));
    this.shadowRoot.getElementById('catFilter').addEventListener('change', (e) => {
      this.activeCategory = e.target.value;
      this.activePlayers.forEach(({ streamer, card }) => {
        if (!card) return;
        card.style.display =
          (this.activeCategory === 'Todos' || streamer.category === this.activeCategory) ? '' : 'none';
      });
      this.updateTop();
    });
  }

  setMinimized(val, byUser = false) {
    this.isMinimized = val;
    if (byUser) this.userMinimized = val;
    const row    = this.shadowRoot.getElementById('liveRow');
    const btn    = this.shadowRoot.getElementById('toggleMin');
    const widget = this.shadowRoot.getElementById('liveWidget');
    if (val) {
      row.classList.add('collapsed');
      widget.classList.add('minimized');
      btn.textContent = '+'; btn.title = 'Expandir';
    } else {
      row.classList.remove('collapsed');
      widget.classList.remove('minimized');
      btn.textContent = '−'; btn.title = 'Minimizar';
    }
  }

  initObserver() {
    if (!this.ENABLE_MINI_PREVIEW) {
      this.cardObserver = { observe() {}, unobserve() {} };
      return;
    }
    // IntersectionObserver: inicia mini player quando o card entra na tela
    this.cardObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const url = entry.target.dataset.url;
        if (entry.isIntersecting) this.startMiniPlayer(url);
        else                      this.stopMiniPlayer(url);
      });
    }, {
      root: this.shadowRoot.getElementById('liveRow'),
      rootMargin: '0px 60px 0px 60px',
      threshold: 0.1,
    });
  }

  // ── Cache localStorage (já protegido com try/catch) ─────────────────────

  saveCache() {
    try {
      const list = [...this.activePlayers.values()].map((p) => p.streamer);
      if (list.length)
        localStorage.setItem(this.CACHE_KEY, JSON.stringify({ ts: Date.now(), data: list }));
    } catch (_) {}
  }

  loadCache() {
    try {
      const raw = localStorage.getItem(this.CACHE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      // Valida estrutura antes de usar
      if (
        !parsed ||
        typeof parsed !== 'object' ||
        typeof parsed.ts !== 'number' ||
        !Array.isArray(parsed.data)
      ) {
        localStorage.removeItem(this.CACHE_KEY);
        return [];
      }
      if (Date.now() - parsed.ts > this.CACHE_TTL) {
        localStorage.removeItem(this.CACHE_KEY);
        return [];
      }
      // Garante que cada item tem os campos mínimos
      return parsed.data.filter(
        (s) => s && typeof s === 'object' && typeof s.url === 'string' && s.url
      );
    } catch (_) {
      localStorage.removeItem(this.CACHE_KEY);
      return [];
    }
  }

  // ── Chamadas de rede — todas via window.DmaiorAPI (sem fetch direto) ──────

  /**
   * Faz proxy de uma URL externa (página Kwai) via Worker de live.
   * Delega para window.DmaiorAPI.live.proxy() — nenhum fetch direto aqui.
   * @param {string} url - URL da página Kwai
   * @returns {Promise<string|null>} HTML ou null
   */
  async proxyFetch(url) {
    return window.DmaiorAPI.live.proxy(url);
  }

  /**
   * Busca lista de streamers ao vivo do KV do Worker.
   * Delega para window.DmaiorAPI.live.getLives() — nenhum fetch direto aqui.
   * @returns {Promise<Array>} Array de streamers
   */
  async fetchEntries() {
    try {
      const data = await window.DmaiorAPI.live.getLives();
      if (!Array.isArray(data)) return [];
      return data
        .map((r) => ({
          name:      (r.nome       || '').trim().slice(0, 100),
          url:       (r.link       || '').trim(),
          category:  'Geral',
          image:     this._safeUrl(r.foto),
          playUrl:   this._safeUrl(r.stream_url),
          viewCount: typeof r.espectadores === 'number' ? r.espectadores : null,
        }))
        .filter((e) => e.url.startsWith('https://'));
    } catch (_) { return []; }
  }

  // ── Lógica principal de atualização ─────────────────────────────────────

  async init() {
    if (this.isChecking) return;
    this.isChecking = true;

    // Primeira carga: exibe cache enquanto busca dados frescos
    if (this.isFirstLoad) {
      this.loadCache().forEach((s) => {
        if (this.activePlayers.has(s.url)) return;
        const { card, circleId } = this.addCard(s);
        this.activePlayers.set(s.url, { streamer: s, hlsInst: null, watchdog: null, card, circleId, retries: 0, playing: false });
      });
      this.updateTop();
    }

    const entries  = await this.fetchEntries();

    // Se a API retornou vazio provavelmente foi erro de rede — não remove ninguém
    if (entries.length === 0 && this.activePlayers.size > 0) {
      this.isChecking = false;
      return;
    }

    const liveUrls = new Set(entries.map((e) => e.url));

    // Remove quem saiu da live
    [...this.activePlayers.keys()].forEach((url) => {
      if (!liveUrls.has(url)) this.removeCard(url);
    });

    // Adiciona novos streamers em lotes
    const toAdd = entries.filter((e) => !this.activePlayers.has(e.url));
    for (let i = 0; i < toAdd.length; i += this.BATCH_SIZE) {
      await Promise.allSettled(
        toAdd.slice(i, i + this.BATCH_SIZE).map((e) => this.checkAndAdd(e))
      );
    }

    // Atualiza contagem de espectadores de quem já está na tela
    entries.forEach((e) => {
      const entry = this.activePlayers.get(e.url);
      if (entry && e.viewCount != null) entry.streamer.viewCount = e.viewCount;
    });

    if (toAdd.length > 0 || this.isFirstLoad) this.saveCache();
    this.isFirstLoad = false;
    this.isChecking  = false;
    this.updateTop();
  }

  // KV já tem stream_url — só faz checkLive (proxy) como fallback
  async checkAndAdd(entry) {
    let result;
    const fallback = `https://ui-avatars.com/api/?name=${encodeURIComponent(entry.name)}&background=1a1a2e&color=00c8c8&bold=true`;

    if (entry.playUrl) {
      result = {
        url:       entry.url,
        name:      entry.name,
        category:  entry.category,
        image:     entry.image || fallback,
        playUrl:   entry.playUrl,
        viewCount: entry.viewCount,
        caption:   '',
      };
    } else {
      // Fallback: extrai stream_url da página Kwai via proxy
      result = await this.checkLive(entry);
      if (!result) return;
    }

    const { card, circleId } = this.addCard(result);
    this.activePlayers.set(result.url, {
      streamer: result,
      hlsInst:  null,
      watchdog: null,
      card,
      circleId,
      retries:  0,
      playing:  false,
    });
    this.updateTop();
  }

  // Extrai window.__INITIAL_STATE__ do HTML da página Kwai
  extractState(html) {
    const m = html.match(/window\.__INITIAL_STATE__\s*=\s*(\{[\s\S]+?\});\s*<\/script>/);
    if (!m) return null;
    try {
      return JSON.parse(m[1].replace(/\\u([\dA-Fa-f]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16))));
    } catch (_) { return null; }
  }

  getMeta(html, prop) {
    const m = html.match(new RegExp(`<meta[^>]+property=["']${prop}["'][^>]+content=["']([^"']+)`, 'i'));
    return m ? m[1] : '';
  }

  // Legado: extrai dados de live via proxy da página Kwai (fallback quando KV não tem stream_url)
  async checkLive(entry) {
    const html = await this.proxyFetch(entry.url);
    if (!html) return null;
    const state    = this.extractState(html);
    const liveInfo = state?.initData?.liveInfo;
    const fallback = `https://ui-avatars.com/api/?name=${encodeURIComponent(entry.name)}&background=1a1a2e&color=00c8c8&bold=true`;
    const image    = this._safeUrl(liveInfo?.userInfo?.userHead)
      || entry.image
      || this._safeUrl(this.getMeta(html, 'og:image'))
      || fallback;
    const viewCount = liveInfo?.userInfo?.liveViewCount ?? null;
    const caption   = liveInfo?.caption || entry.category || '';
    let playUrl = null;
    if (liveInfo?.hlsPlayUls) {
      if (typeof liveInfo.hlsPlayUls === 'string') playUrl = liveInfo.hlsPlayUls;
      else if (Array.isArray(liveInfo.hlsPlayUls) && liveInfo.hlsPlayUls.length)
        playUrl = liveInfo.hlsPlayUls[0].url || liveInfo.hlsPlayUls[0];
    }
    if (!playUrl) {
      const m = html.match(/"(https:\/\/[^"\\]+\.m3u8[^"\\]*)"/);
      if (m) playUrl = m[1].replace(/\\u002F/g, '/').replace(/\\\//g, '/');
    }
    return {
      url:      entry.url,
      name:     entry.name,
      category: entry.category,
      image:    this._safeUrl(image) || fallback,
      playUrl:  this._safeUrl(playUrl),
      viewCount,
      caption,
    };
  }

  updateTop() {
    const visible = this.visibleList();
    this.shadowRoot.getElementById('liveCount').innerHTML =
      `<span class="live-dot"></span>${visible.length} AO VIVO`;
    const cats = [...new Set([...this.activePlayers.values()].map((p) => p.streamer.category).filter(Boolean))];
    const sel  = this.shadowRoot.getElementById('catFilter');
    if (cats.length > 1) {
      sel.innerHTML =
        `<option value="Todos">Todos</option>` +
        cats.map((c) => `<option value="${this._safe(c)}"${c === this.activeCategory ? ' selected' : ''}>${this._safe(c)}</option>`).join('');
      sel.style.display = '';
    } else {
      sel.style.display = 'none';
    }
    const empty = this.shadowRoot.getElementById('emptyMsg');
    empty.style.display = visible.length === 0 ? '' : 'none';
    empty.textContent   = this.isFirstLoad ? 'A procurar transmissões ao vivo...' : 'Nenhuma live no momento...';
    if (visible.length === 0 && !this.isFirstLoad) this.setMinimized(true);
    else if (visible.length > 0 && !this.userMinimized) this.setMinimized(false);
  }

  visibleList() {
    return [...this.activePlayers.values()].filter(
      (p) => this.activeCategory === 'Todos' || p.streamer.category === this.activeCategory
    );
  }

  addCard(streamer) {
    const row      = this.shadowRoot.getElementById('liveRow');
    const fallback = `https://ui-avatars.com/api/?name=${encodeURIComponent(streamer.name)}&background=1a1a2e&color=00c8c8&bold=true`;
    const imgSrc   = this._safeUrl(streamer.image) || fallback;
    const safeName = this._safe(streamer.name);

    const card = document.createElement('div');
    card.className   = 'live-card';
    card.dataset.url = streamer.url;
    card.style.display =
      this.activeCategory !== 'Todos' && streamer.category !== this.activeCategory ? 'none' : '';

    // Gera ID único para o círculo a partir do URL do streamer
    const safeId =
      'ac-' +
      [...streamer.url]
        .reduce((h, c) => (Math.imul(31, h) + c.charCodeAt(0)) | 0, 0)
        .toString(36)
        .replace('-', 'n');

    // Vídeo como primário (com poster=foto); img como fallback embaixo
    card.innerHTML = `
      <div class="avatar-wrap">
        <div class="avatar-circle" id="${safeId}">
          <img src="${imgSrc}" alt="${safeName}">
          <video autoplay muted playsinline webkit-playsinline
                 poster="${imgSrc}"
                 disablePictureInPicture
                 x5-playsinline
                 x5-video-player-type="h5-page"
                 x5-video-player-fullscreen="false"></video>
        </div>
        <div class="live-badge">LIVE</div>
      </div>
      <div class="live-name">${safeName}</div>`;

    card.addEventListener('click', () => this.openModal(streamer.url));
    row.appendChild(card);
    this.cardObserver.observe(card);
    return { card, circleId: safeId };
  }

  removeCard(url) {
    const entry = this.activePlayers.get(url);
    if (!entry) return;
    if (entry.card) this.cardObserver.unobserve(entry.card);
    this.stopMiniPlayer(url);
    entry.card?.remove();
    this.activePlayers.delete(url);
  }

  // ── Mini player (círculo de avatar) ─────────────────────────────────────

  stopMiniPlayer(url) {
    const entry = this.activePlayers.get(url);
    if (!entry) return;
    clearInterval(entry.watchdog);
    try { entry.hlsInst?.destroy(); } catch (_) {}
    entry.hlsInst = null;
    entry.playing = false;
    const circleEl = this.shadowRoot.getElementById(entry.circleId);
    if (circleEl) {
      const vid = circleEl.querySelector('video');
      if (vid) {
        vid.pause();
        vid.removeAttribute('src');
        vid.load();
        // Re-aplica poster para mostrar a foto enquanto pausado
        const img = circleEl.querySelector('img');
        if (img && img.src) vid.poster = img.src;
      }
    }
  }

  startMiniPlayer(url) {
    const entry = this.activePlayers.get(url);
    if (!entry || !entry.streamer.playUrl) return;
    if (entry.playing || entry.hlsInst)   return;
    const circleEl = this.shadowRoot.getElementById(entry.circleId);
    if (!circleEl) return;
    const vid = circleEl.querySelector('video');
    if (!vid)  return;
    this._startHls(vid, entry.streamer.playUrl, entry);
  }

  _startHls(vid, playUrl, entry) {
    if (vid.canPlayType('application/vnd.apple.mpegurl')) {
      vid.src = playUrl;
      vid.addEventListener('playing', () => { entry.playing = true; }, { once: true });
      vid.addEventListener('error',   () => { entry.hlsInst = null; entry.playing = false; }, { once: true });
      vid.play().catch(() => {});
    } else if (window.Hls && window.Hls.isSupported()) {
      const hls = new window.Hls({ maxBufferLength: 8, autoStartLoad: true });
      hls.loadSource(playUrl);
      hls.attachMedia(vid);
      hls.on(window.Hls.Events.MANIFEST_PARSED, () => {
        entry.playing = true;
        vid.play().catch(() => {});
      });
      hls.on(window.Hls.Events.ERROR, (_, d) => {
        if (!d.fatal) return;
        try { hls.destroy(); } catch (_) {}
        entry.hlsInst = null;
        entry.playing = false;
      });
      entry.hlsInst = hls;
    }
  }

  // ── Modal de live ────────────────────────────────────────────────────────

  openModal(url) {
    const entry = this.activePlayers.get(url);
    if (!entry) return;
    const s = entry.streamer;
    window.scrollTo(0, 0);
    this.shadowRoot.getElementById('modalOverlay').classList.add('open');
    const video = this.shadowRoot.getElementById('modalVideo');
    this.shadowRoot.getElementById('modalSpinner').style.display = 'flex';
    this.shadowRoot.getElementById('muteBadge').style.display    = 'none';
    this.shadowRoot.getElementById('bufferBar').style.display    = 'none';
    this.shadowRoot.getElementById('modalCover').style.opacity   = '1';
    video.style.opacity = '0';
    this.shadowRoot.getElementById('spinnerText').textContent  = 'CARREGANDO LIVE...';
    this.shadowRoot.getElementById('modalName').textContent    = s.name;
    this.shadowRoot.getElementById('modalAvatar').src          = this._safeUrl(s.image) || '';
    this.shadowRoot.getElementById('modalCover').src           = this._safeUrl(s.image) || '';
    this.shadowRoot.getElementById('modalCaption').textContent = s.caption || s.category || '';
    this.setMuteIcon(true);
    const vo = this.shadowRoot.getElementById('viewersOverlay');
    vo.style.display = s.viewCount != null ? 'flex' : 'none';
    if (s.viewCount != null)
      this.shadowRoot.getElementById('modalViewers').textContent = s.viewCount;

    this.shadowRoot.getElementById('btnOpenKwai').onclick = () => {
      try {
        const aid = new URL(s.url).searchParams.get('liveAuthorId');
        if (aid) {
          window.location.href = `ikwai://live/play/${aid}`;
          // noopener,noreferrer: evita tabnapping
          setTimeout(() => window.open(s.url, '_blank', 'noopener,noreferrer'), 1500);
          return;
        }
      } catch (_) {}
      window.open(s.url, '_blank', 'noopener,noreferrer');
    };

    if (s.playUrl) this.playM3U8(s.playUrl);
    else this.shadowRoot.getElementById('spinnerText').textContent = 'Stream não disponível.';
  }

  closeModal() {
    this.shadowRoot.getElementById('modalOverlay').classList.remove('open');
    this.destroyHLSModal();
    const v = this.shadowRoot.getElementById('modalVideo');
    v.pause(); v.src = '';
    this.shadowRoot.getElementById('bufferBar').style.display = 'none';
  }

  destroyHLSModal() { try { this.hlsModal?.destroy(); } catch (_) {} this.hlsModal = null; }

  setMuteIcon(muted) {
    this.shadowRoot.getElementById('muteBadge').innerHTML =
      muted ? `${this.SVG_MUTED} SEM SOM` : `${this.SVG_SOUND} COM SOM`;
  }

  toggleMute() {
    const v = this.shadowRoot.getElementById('modalVideo');
    v.muted = !v.muted;
    this.setMuteIcon(v.muted);
  }

  playM3U8(url) {
    this.destroyHLSModal();
    const video = this.shadowRoot.getElementById('modalVideo');
    if (!window.Hls && !video.canPlayType('application/vnd.apple.mpegurl')) {
      this.shadowRoot.getElementById('spinnerText').textContent = 'Carregando player...';
      this.hlsReadyPromise = this.hlsReadyPromise || this.loadHlsLib();
      this.hlsReadyPromise.then(() => this._playM3U8WithMode(url));
      return;
    }
    this._playM3U8WithMode(url);
  }

  _playM3U8WithMode(url) {
    this.destroyHLSModal();
    const video = this.shadowRoot.getElementById('modalVideo');
    video.pause(); video.removeAttribute('src'); video.load();

    const onReady = () => {
      this.shadowRoot.getElementById('modalSpinner').style.display = 'none';
      this.shadowRoot.getElementById('modalCover').style.opacity   = '0';
      video.style.opacity = '1';
      this.shadowRoot.getElementById('muteBadge').style.display = 'flex';
      video.play().catch(() => {});
    };

    const onFatal = () => {
      this.shadowRoot.getElementById('modalSpinner').style.display = 'none';
      this.shadowRoot.getElementById('modalCover').style.opacity = '1';
      this.shadowRoot.getElementById('spinnerText').textContent = 'Stream indisponível. Abra no Kwai.';
    };

    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = url;
      video.addEventListener('canplay', () => onReady(), { once: true });
      video.addEventListener('error',   () => onFatal(), { once: true });
      video.load();
    } else if (window.Hls && window.Hls.isSupported()) {
      this.hlsModal = new window.Hls({ maxBufferLength: 10, autoStartLoad: true });
      this.hlsModal.loadSource(url);
      this.hlsModal.attachMedia(video);
      this.hlsModal.on(window.Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(() => {});
        onReady();
      });
      this.hlsModal.on(window.Hls.Events.ERROR, (_, d) => {
        if (!d.fatal) return;
        onFatal();
      });
    } else {
      this.shadowRoot.getElementById('spinnerText').textContent = 'Navegador sem suporte a HLS.';
    }
  }
}

// Registra o Custom Element
customElements.define('kwai-live-widget', KwaiLiveWidget);
