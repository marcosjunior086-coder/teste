// ============================================================
//  DMaior Agency — Custom Element: dmaior-impulso v12
//  Atributo obrigatório:
//    worker-url → URL base do Cloudflare Worker
// ============================================================

const QUOTA_MAX_DEFAULT = 5; // fallback enquanto config não carrega

const SVG_ROCKET = `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M24 4C24 4 34 10 34 24c0 6-2 11-4 14H18c-2-3-4-8-4-14C14 10 24 4 24 4z" fill="rgba(0,0,0,0.3)" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
  <ellipse cx="24" cy="22" rx="4" ry="4" fill="currentColor" opacity="0.8"/>
  <path d="M18 38l-4 6h20l-4-6" fill="rgba(0,0,0,0.3)" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
  <path d="M14 24c-3 1-6 4-6 8h8" fill="rgba(0,0,0,0.3)" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>
  <path d="M34 24c3 1 6 4 6 8h-8" fill="rgba(0,0,0,0.3)" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>
</svg>`;

const SVG_CLOCK = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`;
const SVG_LINK  = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`;
const SVG_GRID  = `<svg viewBox="0 0 24 24"><path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/></svg>`;
const SVG_BOOST = `<svg viewBox="0 0 24 24"><path d="M12 2s6 4 6 11c0 3.5-1.5 6.5-3 8H9c-1.5-1.5-3-4.5-3-8C6 6 12 2 12 2zm0 7a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm-4 13h8v-2H8v2z"/></svg>`;
const SVG_LOGOUT= `<svg viewBox="0 0 24 24"><path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/></svg>`;

class DmaiorImpulso extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._workerUrl      = '';
    this._uid            = '';
    this._token          = '';
    this._refreshToken   = '';
    this._quota          = 0;
    this._quotaMax       = QUOTA_MAX_DEFAULT;
    this._quotaCarregada = false;
    this._bloqueado      = false;
    this._shellPronto    = false;
    this._iniciado       = false;
  }

  static get observedAttributes() { return ['worker-url']; }

  attributeChangedCallback(name, oldVal, newVal) {
    if (name === 'worker-url' && newVal && newVal !== oldVal) {
      this._workerUrl = newVal.replace(/\/+$/, '');
      // Se o shell já foi renderizado e ainda não iniciou, inicia agora
      if (this._shellPronto && !this._iniciado && this._uid && this._token) {
        this._iniciarUmaVez();
      }
    }
  }

  connectedCallback() {
    this._uid          = localStorage.getItem('dm_uid')      || '';
    this._token        = localStorage.getItem('dm_token')    || '';
    this._refreshToken = localStorage.getItem('dm_refresh')  || '';
    // worker-url pode já estar setado ou chegar depois via attributeChangedCallback
    this._workerUrl    = (this.getAttribute('worker-url') || '').replace(/\/+$/, '');

    this._renderShell();
    this._shellPronto = true;

    if (!this._uid || !this._token) {
      this._mostrarSessaoExpirada();
      return;
    }

    if (this._workerUrl) {
      this._iniciarUmaVez();
    }
    // Se worker-url ainda não veio, aguarda attributeChangedCallback
  }

  _iniciarUmaVez() {
    if (this._iniciado) return;
    this._iniciado = true;
    this._iniciar();
  }

  _mostrarSessaoExpirada() {
    const sr = this.shadowRoot;
    if (!sr) return;
    for (let i = 1; i <= this._quotaMax; i++) {
      const dot = sr.getElementById(`d${i}`);
      if (dot) { dot.classList.remove('loading'); dot.style.borderColor = 'rgba(255,80,80,0.35)'; }
    }
    const fb = sr.getElementById('feedback');
    if (fb) {
      fb.className = 'feedback erro';
      fb.innerHTML = 'Sua sessão expirou. Saia da conta e faça login novamente para gerar uma nova sessão.';
    }
    const btnTexto = sr.getElementById('btn-texto');
    if (btnTexto) btnTexto.textContent = 'Sessão Expirada';
    this._travar();
  }

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
      if (data.token) {
        this._token = data.token;
        localStorage.setItem('dm_token', data.token);
      }
      if (data.refresh_token) {
        this._refreshToken = data.refresh_token;
        localStorage.setItem('dm_refresh', data.refresh_token);
      }
      return true;
    } catch(_) { return false; }
  }

  async _iniciar() {
    await this._renovarToken();
    await this._carregarConfig();
    if (!this._bloqueado) this._carregarQuota(false);
    this._fetchComunicados();
  }

  async _carregarConfig() {
    try {
      const cfg = await window.DmaiorAPI.rank.getImpulsoConfig();
      const qMax = parseInt(cfg.quota_max) || QUOTA_MAX_DEFAULT;
      this._quotaMax = qMax;

      // Atualiza dots conforme novo quota_max
      this._renderDots();

      // Atualiza texto do alerta de limite
      const alertaEl = this.shadowRoot.getElementById('alerta-limite');
      if (alertaEl) {
        alertaEl.innerHTML = `Limite semanal atingido. Você já utilizou os <span class="destaque">${qMax} impulsionamentos</span> desta semana. O contador reinicia toda <span class="destaque">segunda-feira</span>.`;
      }

      // Ativa/desativa opções de tempo
      const opt30 = this.shadowRoot.querySelector('label.radio-opt-30min');
      const opt1h  = this.shadowRoot.querySelector('label.radio-opt-1hora');
      if (opt30) opt30.style.display = cfg.opcao_30min === false ? 'none' : '';
      if (opt1h)  opt1h.style.display  = cfg.opcao_1hora  === false ? 'none' : '';

      // Se 30min desativado e 1h ativo, força seleção de 1h
      if (cfg.opcao_30min === false && cfg.opcao_1hora !== false) {
        const r1h = this.shadowRoot.querySelector('input[name="tempo"][value="1hora"]');
        if (r1h) r1h.checked = true;
      }

      // Verifica se o UID está bloqueado
      if (this._uid) {
        const check = await window.DmaiorAPI.rank.checkImpulsoBlock(this._uid);
        if (check.bloqueado) {
          this._bloqueado = true;
          const fb = this.shadowRoot.getElementById('feedback');
          if (fb) {
            fb.className = 'feedback erro';
            fb.innerHTML = check.motivo
              ? `Seu acesso ao impulsionamento foi suspenso. Motivo: <strong>${check.motivo}</strong>`
              : 'Seu acesso ao impulsionamento está suspenso. Entre em contato com a agência.';
          }
          this._travar();
          this._quotaCarregada = true; // evita que _enviar() rode
        }
      }
    } catch { /* usa defaults */ }
  }

  _renderDots() {
    const container = this.shadowRoot.getElementById('quota-dots');
    if (!container) return;
    let html = '';
    for (let i = 1; i <= this._quotaMax; i++) {
      html += `<div class="dot loading" id="d${i}"></div>`;
    }
    container.innerHTML = html;
  }

  _renderShell() {
    this.shadowRoot.innerHTML = `
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@600;700&family=Exo+2:wght@400;600;700&display=swap');
        
        :host {
          display: block;
          --cyan: #00d4d4; 
          --cyan-d: rgba(0,212,212,0.15);
          --rank-cyan: #00d4d4;
          --rank-grad: linear-gradient(135deg,#3b82f6,#00d4d4);
          --rank-glow: transparent;
          --gold: #f0c040; 
          --green: #4ade80; 
          --red: #f87171;
          --border: rgba(0,212,212,0.28); 
          --glass: rgba(24,26,40,0.92);
          --text: #fff; 
          --muted: #a0b8c8;
          font-family: var(--dm-font-body,'Exo 2',sans-serif);
          color: var(--text);
        }

        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; -webkit-tap-highlight-color: transparent; }

        /* Nav interno removido — o painel pai já tem menu */
        .shell {
          display: block;
          width: 100%;
          background: transparent;
        }

        .content {
          display: flex;
          justify-content: center;
          align-items: flex-start;
          padding: 8px 20px 24px;
          width: 100%;
        }

        .bnav { display: none !important; }

        .wrap {
          background: var(--glass);
          border: 1px solid rgba(0,212,212,0.28);
          border-radius: 20px;
          box-shadow: none;
          padding: 24px 25px;
          width: 100%; max-width: 520px;
        }

        @media(max-width:768px){
          .content { padding: 8px 10px 24px; }
          .wrap { padding: 20px 15px; }
          .radio-group { flex-direction: column; }
          .radio-opt { width: 100%; min-width: unset; }
        }

        .header { display:flex; align-items:center; gap:12px; margin-bottom:22px; padding-bottom:16px; border-bottom:1px solid rgba(0,212,212,0.22); }
        .header-icon { width:42px; height:42px; flex-shrink:0; color:var(--rank-cyan); }
        .header-icon svg { width:100%; height:100%; }
        .header-title { font-family:var(--dm-font-title,'Rajdhani',sans-serif); font-size:1.2rem; font-weight:700; color:var(--text); letter-spacing:0.08em; text-transform:uppercase; }
        .header-sub { font-family:var(--dm-font-title,'Rajdhani',sans-serif); font-size:0.75rem; font-weight:700; color:var(--rank-cyan); letter-spacing:0.06em; text-transform:uppercase; }

        .quota-box { background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.05); border-radius:12px; padding:12px 14px; margin-bottom:20px; display:flex; align-items:center; justify-content:space-between; gap:10px; flex-wrap:wrap; }
        .quota-label { font-size:0.72rem; color:var(--muted); font-family:var(--dm-font-title,'Rajdhani',sans-serif); letter-spacing:0.06em; text-transform:uppercase; font-weight:600; }
        .quota-dots { display:flex; gap:6px; align-items:center; }
        .dot { width:12px; height:12px; border-radius:50%; border:1.5px solid rgba(0,212,212,0.35); background:transparent; transition:background 0.25s,border-color 0.25s,box-shadow 0.25s; }
        .dot.used { background:var(--rank-grad); border-color:var(--rank-cyan); box-shadow:0 0 8px var(--rank-glow); }
        .dot.loading { border-color:rgba(0,212,212,0.15); animation:pulse 1s infinite; }
        @keyframes pulse { 0%,100%{opacity:0.3} 50%{opacity:0.8} }

        .alerta { border-radius:10px; padding:14px 16px; margin-bottom:20px; font-size:0.82rem; line-height:1.5; display:none; }
        .alerta.limite { background:rgba(248,113,113,0.1); border:1px solid rgba(248,113,113,0.2); color:var(--red); }
        .alerta.erro-quota { background:rgba(240,192,64,0.1); border:1px solid rgba(240,192,64,0.2); color:var(--gold); }
        .destaque { color:var(--gold); font-weight:700; }

        .field-group { margin-bottom:18px; }
        .field-label { display:flex; align-items:center; gap:6px; font-size:0.7rem; font-weight:700; color:var(--rank-cyan); font-family:var(--dm-font-title,'Rajdhani',sans-serif); letter-spacing:0.08em; text-transform:uppercase; margin-bottom:8px; }
        .field-input { width:100%; background:rgba(0,0,0,0.5); border:1px solid var(--border); border-radius:10px; padding:14px; color:var(--text); font-family:inherit; font-size:0.95rem; outline:none; transition:0.3s; }
        .field-input::placeholder { color:rgba(255,255,255,0.2); }
        .field-input:focus { border-color:var(--cyan); box-shadow:0 0 10px var(--cyan-d); }
        .field-input:disabled { opacity:0.5; cursor:not-allowed; }

        .radio-group { display:flex; gap:10px; flex-wrap:wrap; }
        .radio-opt { flex:1; min-width:120px; }
        .radio-opt input[type="radio"] { display:none; }
        .radio-card { display:flex; align-items:center; justify-content:center; padding:14px 10px; border:1px solid var(--border); border-radius:10px; cursor:pointer; background:rgba(0,0,0,0.3); transition:all 0.3s; user-select:none; }
        .radio-card:hover { background:var(--cyan-d); border-color:var(--cyan); }
        .radio-card .rc-tempo { font-family:var(--dm-font-title,'Rajdhani',sans-serif); font-size:1.05rem; font-weight:700; color:var(--muted); letter-spacing:0.05em; text-align:center; text-transform:uppercase; transition:color 0.3s; }
        
        .radio-opt input[type="radio"]:checked + .radio-card, 
        #btn-impulso {
          background: linear-gradient(135deg, rgba(59,130,246,0.14), rgba(0,212,212,0.12));
          border: 1px solid var(--rank-cyan);
          color: var(--rank-cyan);
        }
        .radio-opt input[type="radio"]:checked + .radio-card { box-shadow: 0 0 16px var(--rank-glow); }
        .radio-opt input[type="radio"]:checked + .radio-card .rc-tempo { color: var(--rank-cyan); }
        .radio-opt input[type="radio"]:disabled + .radio-card { opacity:0.4; cursor:not-allowed; background:rgba(0,0,0,0.2); border-color:rgba(255,255,255,0.05); transform:none; box-shadow:none; }

        #btn-impulso {
          width: 100%; margin-top: 22px; padding: 14px;
          border-radius: 12px;
          font-family: var(--dm-font-title,'Rajdhani',sans-serif); font-size: 1rem; font-weight: 700;
          letter-spacing: 0.05em; text-transform: uppercase; cursor: pointer;
          display: flex; align-items: center; justify-content: center; gap: 8px; transition: 0.3s;
        }
        #btn-impulso:hover:not(:disabled) { box-shadow: 0 0 22px var(--rank-glow); transform: translateY(-2px); }
        #btn-impulso:disabled { opacity:0.55; background:rgba(59,130,246,.08); border-color:rgba(0,212,212,0.28); color:rgba(0,212,212,0.55); cursor: not-allowed; box-shadow: none; transform: none; }

        .feedback { margin-top:14px; padding:12px 14px; border-radius:9px; font-size:0.82rem; line-height:1.5; display:none; }
        .feedback.ok   { background:rgba(74,222,128,.1); border:1px solid rgba(74,222,128,.3); color:var(--green); display:block; }
        .feedback.erro { background:rgba(248,113,113,.1); border:1px solid rgba(248,113,113,.2); color:var(--red); display:block; }

        /* ── Comunicados ── */
        #imp-comunicados { display:flex; flex-direction:column; gap:8px; margin-bottom:16px; }
        .imp-comunicado { display:flex; align-items:flex-start; gap:10px; padding:11px 14px; border-radius:10px; background:rgba(240,192,64,0.08); border:1px solid rgba(240,192,64,0.30); animation:pulse .0s; }
        .imp-comunicado-ico { font-size:1.1rem; line-height:1; flex-shrink:0; }
        .imp-comunicado-txt { font-size:0.76rem; color:var(--muted); line-height:1.55; flex:1; }
        .imp-comunicado-txt strong, .imp-comunicado-txt b { color:var(--gold); }
        :host-context([data-theme="branco"]) .imp-comunicado,
        :host-context([data-theme="laranja"]) .imp-comunicado { background:rgba(180,130,0,0.07); border-color:rgba(180,130,0,0.28); }
        :host-context([data-theme="rosa"]) .imp-comunicado { background:rgba(233,30,140,0.07); border-color:rgba(233,30,140,0.25); }
        :host-context([data-theme="dark"]) .imp-comunicado { background:rgba(240,192,64,0.06); border-color:rgba(240,192,64,0.20); }

        .spinner { width:16px; height:16px; border:2px solid rgba(0,212,212,0.3); border-top-color:var(--rank-cyan); border-radius:50%; animation:spin 0.7s linear infinite; display:none; }
        @keyframes spin { to { transform:rotate(360deg); } }

        /* ══ TEMA BRANCO — bloom azul-petróleo ══ */
        :host-context([data-theme="branco"]) {
          --cyan:#0095a8; --cyan-d:rgba(0,149,168,0.15);
          --gold:#b8860b; --text:#0d1117; --muted:#4a5568;
          --border:rgba(0,149,168,0.35); --glass:rgba(255,255,255,0.95);
          --bloom:linear-gradient(135deg,#0369a1 0%,#0095a8 100%);
        }
        :host-context([data-theme="branco"]) .wrap {
          background: var(--glass);
          border-color: var(--border);
          box-shadow: 0 6px 24px rgba(0,149,168,0.1);
        }

        /* ══ TEMA ROSA — bloom pink/magenta ══ */
        :host-context([data-theme="rosa"]) {
          --cyan:#e91e8c; --cyan-d:rgba(233,30,140,0.15);
          --gold:#c2185b; --text:#1a0010; --muted:#80004a;
          --border:rgba(233,30,140,0.35); --glass:rgba(255,255,255,0.95);
          --bloom:linear-gradient(135deg,#e91e8c 0%,#ff6090 100%);
        }
        :host-context([data-theme="rosa"]) .wrap {
          background: var(--glass);
          border-color: var(--border);
          box-shadow: 0 6px 24px rgba(233,30,140,0.1);
        }

        /* ══ TEMA LARANJA — bloom laranja/âmbar ══ */
        :host-context([data-theme="laranja"]) {
          --cyan:#f97316; --cyan-d:rgba(249,115,22,0.15);
          --gold:#ea580c; --text:#1a0a00; --muted:#7c3a00;
          --border:rgba(249,115,22,0.35); --glass:rgba(255,255,255,0.95);
          --bloom:linear-gradient(135deg,#f97316 0%,#fbbf24 100%);
        }
        :host-context([data-theme="laranja"]) .wrap {
          background: var(--glass);
          border-color: var(--border);
          box-shadow: 0 6px 24px rgba(249,115,22,0.1);
        }

        /* ══ Campos, radio e quota — todos os temas claros ══ */
        :host-context([data-theme="branco"]) .quota-box,
        :host-context([data-theme="rosa"]) .quota-box,
        :host-context([data-theme="laranja"]) .quota-box {
          background: rgba(0,0,0,0.04);
          border-color: var(--border);
        }
        :host-context([data-theme="branco"]) .quota-label,
        :host-context([data-theme="rosa"]) .quota-label,
        :host-context([data-theme="laranja"]) .quota-label { color: var(--text); }
        :host-context([data-theme="branco"]) .field-input,
        :host-context([data-theme="rosa"]) .field-input,
        :host-context([data-theme="laranja"]) .field-input {
          background: rgba(0,0,0,0.05);
          border-color: var(--border);
          color: var(--text);
        }
        :host-context([data-theme="branco"]) .field-input::placeholder,
        :host-context([data-theme="rosa"]) .field-input::placeholder,
        :host-context([data-theme="laranja"]) .field-input::placeholder { color: var(--muted); }
        /* Radio cards inativos */
        :host-context([data-theme="branco"]) .radio-card,
        :host-context([data-theme="rosa"]) .radio-card,
        :host-context([data-theme="laranja"]) .radio-card {
          background: rgba(0,0,0,0.04);
          border-color: var(--border);
        }
        :host-context([data-theme="branco"]) .radio-card .rc-tempo,
        :host-context([data-theme="rosa"]) .radio-card .rc-tempo,
        :host-context([data-theme="laranja"]) .radio-card .rc-tempo { color: var(--text); }
        /* Radio card selecionado + botão impulso — usa bloom do tema */
        :host-context([data-theme="branco"]) .radio-opt input[type="radio"]:checked + .radio-card,
        :host-context([data-theme="rosa"])   .radio-opt input[type="radio"]:checked + .radio-card,
        :host-context([data-theme="laranja"]) .radio-opt input[type="radio"]:checked + .radio-card,
        :host-context([data-theme="branco"]) #btn-impulso,
        :host-context([data-theme="rosa"])   #btn-impulso,
        :host-context([data-theme="laranja"]) #btn-impulso {
          background: var(--bloom);
          border-color: transparent;
          color: #fff;
        }
        :host-context([data-theme="branco"]) #btn-impulso:disabled,
        :host-context([data-theme="rosa"])   #btn-impulso:disabled,
        :host-context([data-theme="laranja"]) #btn-impulso:disabled {
          background: rgba(0,0,0,0.08);
          color: var(--muted);
        }
        /* Labels de campo */
        :host-context([data-theme="branco"]) .field-label,
        :host-context([data-theme="rosa"]) .field-label,
        :host-context([data-theme="laranja"]) .field-label { color: var(--cyan); }
        :host-context([data-theme="branco"]) .header-sub,
        :host-context([data-theme="rosa"]) .header-sub,
        :host-context([data-theme="laranja"]) .header-sub { color: var(--cyan); }
        :host-context([data-theme="branco"]) .header-title,
        :host-context([data-theme="rosa"]) .header-title,
        :host-context([data-theme="laranja"]) .header-title { color: var(--text); }
      </style>

      <div class="shell">

        <div class="content">
          <div class="wrap">
            <div class="header">
              <div class="header-icon">${SVG_ROCKET}</div>
              <div class="header-text">
                <div class="header-title">Impulsionar Live</div>
                <div class="header-sub">Integração Kwai</div>
              </div>
            </div>

            <div id="imp-comunicados"></div>

            <div class="quota-box">
              <div class="quota-label">Usos esta semana</div>
              <div class="quota-dots" id="quota-dots">
                <div class="dot loading" id="d1"></div>
                <div class="dot loading" id="d2"></div>
                <div class="dot loading" id="d3"></div>
                <div class="dot loading" id="d4"></div>
                <div class="dot loading" id="d5"></div>
              </div>
            </div>

            <div class="alerta limite" id="alerta-limite">
              Limite semanal atingido. Você já utilizou os <span class="destaque">${QUOTA_MAX_DEFAULT} impulsionamentos</span> desta semana.
              O contador reinicia toda <span class="destaque">segunda-feira</span>.
            </div>

            <div class="alerta erro-quota" id="alerta-erro-quota">
              Não foi possível verificar sua cota. Recarregue a página.
            </div>

            <div class="field-group">
              <label class="field-label">${SVG_LINK} Link da Live</label>
              <input type="url" id="inp-link" class="field-input" placeholder="https://www.kwai.com/..." autocomplete="off" spellcheck="false" disabled/>
            </div>

            <div class="field-group">
              <label class="field-label">${SVG_CLOCK} Duração do Impulsionamento</label>
              <div class="radio-group">
                <label class="radio-opt radio-opt-30min">
                  <input type="radio" name="tempo" value="30min" checked disabled/>
                  <div class="radio-card"><span class="rc-tempo">30 Minutos</span></div>
                </label>
                <label class="radio-opt radio-opt-1hora">
                  <input type="radio" name="tempo" value="1hora" disabled/>
                  <div class="radio-card"><span class="rc-tempo">1 Hora</span></div>
                </label>
              </div>
            </div>

            <button id="btn-impulso" disabled>
              <div class="spinner" id="spinner"></div>
              <span id="btn-texto">Verificando...</span>
            </button>

            <div class="feedback" id="feedback"></div>
          </div>
        </div>

      </div>
    `;
    window.DMaiorPrefs?.bind(this.shadowRoot);

    this.shadowRoot.getElementById('btn-impulso').addEventListener('click', () => this._enviar());
  }

  async _carregarQuota(retry = false) {
    try {
      const res = await fetch(`${this._workerUrl}/api/quota`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this._token}` },
        body: JSON.stringify({ uid: this._uid }),
      });

      if (res.status === 401 && !retry) {
        const renovado = await this._renovarToken();
        if (renovado) return this._carregarQuota(true);
        this._mostrarSessaoExpirada();
        return;
      }

      if (!res.ok) { this._erroQuota(); return; }

      const data = await res.json();
      this._quota = data.usado || 0;
      this._quotaCarregada = true;
      this._atualizarQuotaUI();

    } catch(_) { this._erroQuota(); }
  }

  _erroQuota() {
    const sr = this.shadowRoot;
    for (let i = 1; i <= this._quotaMax; i++) {
      const dot = sr.getElementById(`d${i}`);
      if (dot) { dot.classList.remove('loading'); dot.style.borderColor = 'rgba(240,192,64,0.4)'; }
    }
    sr.getElementById('alerta-erro-quota').style.display = 'block';
    sr.getElementById('btn-texto').textContent = 'Indisponível';
  }

  _atualizarQuotaUI() {
    const sr = this.shadowRoot;
    for (let i = 1; i <= this._quotaMax; i++) {
      const dot = sr.getElementById(`d${i}`);
      if (dot) { dot.classList.remove('loading'); dot.classList.toggle('used', i <= this._quota); }
    }
    if (this._quota >= this._quotaMax) {
      sr.getElementById('alerta-limite').style.display = 'block';
      this._travar();
    } else {
      sr.getElementById('btn-impulso').disabled = false;
      sr.getElementById('inp-link').disabled    = false;
      sr.querySelectorAll('input[name="tempo"]').forEach(r => r.disabled = false);
      sr.getElementById('btn-texto').textContent = 'Impulsionar Live';
    }
  }

  _travar() {
    const sr = this.shadowRoot;
    sr.getElementById('btn-impulso').disabled = true;
    sr.getElementById('inp-link').disabled    = true;
    sr.querySelectorAll('input[name="tempo"]').forEach(r => r.disabled = true);
  }

  async _enviar() {
    if (!this._quotaCarregada) return;
    const sr       = this.shadowRoot;
    const link     = sr.getElementById('inp-link').value.trim();
    const tempo    = sr.querySelector('input[name="tempo"]:checked')?.value || '30min';
    const btn      = sr.getElementById('btn-impulso');
    const spinner  = sr.getElementById('spinner');
    const btnTexto = sr.getElementById('btn-texto');
    const feedback = sr.getElementById('feedback');

    feedback.className   = 'feedback';
    feedback.textContent = '';

    if (!link) { feedback.className='feedback erro'; feedback.textContent='Informe o link da sua live antes de continuar.'; return; }
    if (!link.includes('kwai.com')) { feedback.className='feedback erro'; feedback.textContent='O link informado não parece ser uma live do Kwai.'; return; }

    btn.disabled          = true;
    spinner.style.display = 'block';
    btnTexto.textContent  = 'Aguarde...';

    try {
      const res = await fetch(`${this._workerUrl}/api/impulsionar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this._token}` },
        body: JSON.stringify({ uid: this._uid, link, tempo }),
      });
      const data = await res.json();

      if (res.ok && data.sucesso) {
        this._quota++;
        this._atualizarQuotaUI();
        feedback.className   = 'feedback ok';
        feedback.textContent = 'Impulsionamento iniciado com sucesso!';
        sr.getElementById('inp-link').value = '';
      } else {
        feedback.className   = 'feedback erro';
        feedback.textContent = data.erro || 'Erro ao processar o pedido. Tente novamente.';
        if (this._quota < this._quotaMax) btn.disabled = false;
      }
    } catch(_) {
      feedback.className   = 'feedback erro';
      feedback.textContent = 'Falha de conexão com o servidor. Verifique sua internet.';
      if (this._quota < this._quotaMax) btn.disabled = false;
    } finally {
      spinner.style.display = 'none';
      btnTexto.textContent  = 'Impulsionar Live';
    }
  }

  async _fetchComunicados() {
    try {
      const data  = await window.DmaiorAPI.rank.getComunicados('impulsionamento');
      const lista = data.comunicados || [];
      const el    = this.shadowRoot.getElementById('imp-comunicados');
      if (!el) return;
      if (!lista.length) { el.innerHTML = ''; return; }
      el.innerHTML = lista.map(c => `
        <div class="imp-comunicado">
          ${c.emoji ? `<span class="imp-comunicado-ico">${c.emoji}</span>` : ''}
          <span class="imp-comunicado-txt">${c.texto || ''}</span>
        </div>`).join('');
    } catch { /* comunicados são opcionais */ }
  }
}

customElements.define('dmaior-impulso', DmaiorImpulso);
