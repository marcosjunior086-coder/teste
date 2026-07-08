// ============================================================
//  DMaior Agency — Custom Element: dmaior-votacao v1 (Fase 1)
//  Um único componente pros dois contextos:
//    - Página pública (votacao.html): sem dm_uid/dm_token no
//      localStorage → mostra a etapa "informe seu ID".
//    - Painel do streamer (dmaior-app.js): dm_uid/dm_token já
//      existem → pula a etapa de ID e mostra a lista direto.
//  Toda chamada de rede passa por window.DmaiorAPI.votacao.*
//  (js/api.js precisa estar carregado antes deste script).
// ============================================================

const SVG_VOTE   = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>`;
const SVG_CHECK  = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>`;
const SVG_USERS  = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`;
const SVG_BACK   = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>`;

class DmaiorVotacao extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._uid    = localStorage.getItem('dm_uid')   || '';
    this._token  = localStorage.getItem('dm_token') || '';
    this._modo   = (this._uid && this._token) ? 'privado' : 'publico';
    this._perfil = this._modo === 'privado' ? { uid: this._uid } : null;
    this._votacoes = [];
    this._atual  = null;      // { votacao, pergunta, alternativas, ja_votou }
    this._selecionadas = new Set();
    this._iniciado = false;   // connectedCallback pode disparar mais de uma vez
                              // (mesmo comportamento já visto em dmaior-impulso.js) —
                              // essa flag garante que só carregamos dados uma vez.
  }

  connectedCallback() {
    this._syncThemeHost();
    this._renderShell();
    this._iniciarUmaVez();

    this._storageThemeHandler = (e) => { if (e.key === 'dm_tema') this._syncThemeHost(); };
    this._themeHandler = () => this._syncThemeHost();
    window.addEventListener('storage', this._storageThemeHandler);
    window.addEventListener('dmaior:tema', this._themeHandler);
  }

  _iniciarUmaVez() {
    if (this._iniciado) return;
    this._iniciado = true;
    if (this._perfil) this._carregarLista();
    else this._renderGate();
  }

  disconnectedCallback() {
    window.removeEventListener('storage', this._storageThemeHandler);
    window.removeEventListener('dmaior:tema', this._themeHandler);
  }

  _syncThemeHost() {
    let tema = 'original';
    try { tema = localStorage.getItem('dm_tema') || 'original'; } catch (_) {}
    if (tema === 'original') this.removeAttribute('data-theme');
    else this.setAttribute('data-theme', tema);
  }

  // Mesma conversão de link do Drive usada no admin (_normalizarImagemUrl +
  // _proxyFoto), duplicada aqui de propósito — cada custom element deste
  // projeto é autocontido, sem import entre componentes.
  _imgUrl(url, w = 400, h = 300) {
    if (!url || typeof url !== 'string') return '';
    let raw = url.trim();
    if (!raw) return '';
    try {
      const u = new URL(raw);
      if (u.protocol !== 'http:' && u.protocol !== 'https:') return '';
      const host = u.hostname.toLowerCase();
      if (host === 'drive.google.com' || host === 'docs.google.com' || host.endsWith('.googleusercontent.com')) {
        const m  = u.pathname.match(/\/file\/d\/([^/]+)/);
        const id = m?.[1] || u.searchParams.get('id');
        if (id && /^[\w-]{10,}$/.test(id)) raw = `https://drive.google.com/thumbnail?id=${encodeURIComponent(id)}&sz=w1600`;
      } else {
        raw = u.href;
      }
    } catch { return ''; }
    return `https://images.weserv.nl/?url=${encodeURIComponent(raw)}&w=${w}&h=${h}&fit=cover&output=webp`;
  }

  _fmtData(iso) {
    if (!iso) return '';
    try { return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }); }
    catch { return ''; }
  }

  _renderShell() {
    this.shadowRoot.innerHTML = `
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@600;700&family=Exo+2:wght@400;600;700&display=swap');

        :host {
          display: block;
          --cyan: #00d4d4;
          --cyan-d: rgba(0,212,212,0.15);
          --rank-cyan: var(--cyan); /* referencia --cyan pra seguir o tema sozinho, sem precisar de override por tema */
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

        .content { display:flex; justify-content:center; padding:8px 20px 24px; width:100%; }
        .wrap { background:var(--glass); border:1px solid var(--border); border-radius:20px; padding:24px 25px; width:100%; max-width:640px; }
        @media(max-width:768px){ .content{padding:8px 10px 24px;} .wrap{padding:20px 15px;} }

        .header { display:flex; align-items:center; gap:12px; margin-bottom:20px; padding-bottom:16px; border-bottom:1px solid rgba(0,212,212,0.22); }
        .header-icon { width:38px; height:38px; flex-shrink:0; color:var(--rank-cyan); }
        .header-icon svg { width:100%; height:100%; }
        .header-title { font-family:var(--dm-font-title,'Rajdhani',sans-serif); font-size:1.15rem; font-weight:700; letter-spacing:0.06em; text-transform:uppercase; }
        .header-sub { font-family:var(--dm-font-title,'Rajdhani',sans-serif); font-size:0.72rem; font-weight:700; color:var(--rank-cyan); letter-spacing:0.06em; text-transform:uppercase; }

        .field-group { margin-bottom:16px; }
        .field-label { display:flex; align-items:center; gap:6px; font-size:0.7rem; font-weight:700; color:var(--rank-cyan); font-family:var(--dm-font-title,'Rajdhani',sans-serif); letter-spacing:0.08em; text-transform:uppercase; margin-bottom:8px; }
        .field-input { width:100%; background:rgba(0,0,0,0.5); border:1px solid var(--border); border-radius:10px; padding:14px; color:var(--text); font-family:inherit; font-size:0.95rem; outline:none; transition:0.3s; }
        .field-input:focus { border-color:var(--cyan); box-shadow:0 0 10px var(--cyan-d); }
        .field-input:disabled { opacity:0.5; cursor:not-allowed; }

        .btn-main { width:100%; margin-top:6px; padding:14px; border-radius:12px; border:1px solid var(--rank-cyan);
          background:linear-gradient(135deg, rgba(59,130,246,0.14), rgba(0,212,212,0.12)); color:var(--rank-cyan);
          font-family:var(--dm-font-title,'Rajdhani',sans-serif); font-size:1rem; font-weight:700; letter-spacing:0.05em; text-transform:uppercase;
          cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px; transition:0.3s; }
        .btn-main:hover:not(:disabled) { box-shadow:0 0 22px rgba(0,212,212,.25); transform:translateY(-2px); }
        .btn-main:disabled { opacity:0.5; cursor:not-allowed; transform:none; box-shadow:none; }
        .btn-ghost { background:none; border:1px solid var(--border); color:var(--muted); border-radius:10px; padding:10px 16px; font-family:var(--dm-font-title,'Rajdhani',sans-serif); font-weight:700; font-size:0.82rem; cursor:pointer; display:inline-flex; align-items:center; gap:6px; transition:0.2s; }
        .btn-ghost:hover { border-color:var(--cyan); color:var(--cyan); }

        .feedback { margin-top:14px; padding:12px 14px; border-radius:9px; font-size:0.82rem; line-height:1.5; display:none; }
        .feedback.ok   { background:rgba(74,222,128,.1); border:1px solid rgba(74,222,128,.3); color:var(--green); display:block; }
        .feedback.erro { background:rgba(248,113,113,.1); border:1px solid rgba(248,113,113,.2); color:var(--red); display:block; }

        .spinner { width:16px; height:16px; border:2px solid rgba(0,212,212,0.3); border-top-color:var(--rank-cyan); border-radius:50%; animation:spin 0.7s linear infinite; display:inline-block; }
        @keyframes spin { to { transform:rotate(360deg); } }

        /* Confirmação de perfil */
        .perfil-card { display:flex; align-items:center; gap:14px; background:rgba(0,0,0,0.3); border:1px solid var(--border); border-radius:14px; padding:14px 16px; margin-bottom:18px; }
        .perfil-ava { width:52px; height:52px; border-radius:50%; overflow:hidden; background:rgba(255,255,255,0.06); flex-shrink:0; display:flex; align-items:center; justify-content:center; }
        .perfil-ava img { width:100%; height:100%; object-fit:cover; }
        .perfil-nome { font-family:var(--dm-font-title,'Rajdhani',sans-serif); font-weight:700; font-size:1rem; }
        .perfil-uid { font-size:0.75rem; color:var(--muted); }
        .confirmar-row { display:flex; gap:10px; }
        .confirmar-row .btn-main { margin-top:0; }

        /* Lista de votações */
        .votacao-card { display:flex; gap:14px; align-items:center; background:rgba(0,0,0,0.3); border:1px solid var(--border); border-radius:14px; padding:14px; margin-bottom:12px; cursor:pointer; transition:0.2s; }
        .votacao-card:hover { border-color:var(--cyan); background:var(--cyan-d); }
        .votacao-card.votada { opacity:0.55; cursor:default; }
        .votacao-card.votada:hover { border-color:var(--border); background:rgba(0,0,0,0.3); }
        .votacao-banner { width:72px; height:52px; border-radius:8px; object-fit:cover; flex-shrink:0; background:rgba(255,255,255,0.05); }
        .votacao-info { flex:1; min-width:0; }
        .votacao-titulo { font-family:var(--dm-font-title,'Rajdhani',sans-serif); font-weight:700; font-size:0.98rem; margin-bottom:3px; }
        .votacao-meta { font-size:0.72rem; color:var(--muted); display:flex; gap:8px; flex-wrap:wrap; }
        .badge-votada { font-size:0.65rem; font-weight:700; color:var(--green); text-transform:uppercase; letter-spacing:0.05em; }

        /* Banner + pergunta */
        .banner-img { width:100%; max-height:180px; object-fit:cover; border-radius:14px; margin-bottom:16px; display:block; }
        .pergunta-texto { font-family:var(--dm-font-title,'Rajdhani',sans-serif); font-size:1.05rem; font-weight:700; margin-bottom:6px; }
        .pergunta-desc { font-size:0.82rem; color:var(--muted); margin-bottom:16px; line-height:1.5; }
        .pergunta-limite { font-size:0.72rem; color:var(--gold); margin-bottom:14px; }

        /* Alternativas */
        .alt-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:18px; }
        .alt-grid.tipo-texto { grid-template-columns:1fr; }
        @media(max-width:520px){ .alt-grid { grid-template-columns:1fr; } }
        .alt-card { border:1px solid var(--border); border-radius:14px; padding:12px; cursor:pointer; transition:0.2s; background:rgba(0,0,0,0.25); position:relative; }
        .alt-card:hover { border-color:var(--cyan); }
        .alt-card.sel { border-color:var(--rank-cyan); background:var(--cyan-d); box-shadow:0 0 14px rgba(0,212,212,.2); }
        .alt-foto { width:100%; height:120px; object-fit:cover; border-radius:10px; margin-bottom:8px; background:rgba(255,255,255,0.05); }
        .alt-titulo { font-family:var(--dm-font-title,'Rajdhani',sans-serif); font-weight:700; font-size:0.9rem; }
        .alt-desc { font-size:0.74rem; color:var(--muted); margin-top:3px; line-height:1.4; }
        .alt-check { position:absolute; top:8px; right:8px; width:22px; height:22px; border-radius:50%; border:2px solid var(--border); background:rgba(0,0,0,.4); display:flex; align-items:center; justify-content:center; color:var(--rank-cyan); }
        .alt-card.sel .alt-check { background:var(--rank-cyan); border-color:var(--rank-cyan); color:#04262b; }
        .alt-check svg { width:12px; height:12px; display:none; }
        .alt-card.sel .alt-check svg { display:block; }

        .voltar-row { margin-bottom:16px; }
        .empty-msg { text-align:center; color:var(--muted); font-size:0.85rem; padding:30px 10px; }

        /* ══ Temas claros — mesmas variáveis do resto do painel ══ */
        :host-context([data-theme="branco"]) , :host([data-theme="branco"]) { --cyan:#0095a8; --cyan-d:rgba(0,149,168,0.15); --gold:#b8860b; --text:#0d1117; --muted:#4a5568; --border:rgba(0,149,168,0.35); --glass:rgba(255,255,255,0.95); }
        :host-context([data-theme="rosa"]) , :host([data-theme="rosa"]) { --cyan:#e91e8c; --cyan-d:rgba(233,30,140,0.15); --gold:#c2185b; --text:#1a0010; --muted:#80004a; --border:rgba(233,30,140,0.35); --glass:rgba(255,255,255,0.95); }
        :host-context([data-theme="laranja"]) , :host([data-theme="laranja"]) { --cyan:#f97316; --cyan-d:rgba(249,115,22,0.15); --gold:#ea580c; --text:#1a0a00; --muted:#7c3a00; --border:rgba(249,115,22,0.35); --glass:rgba(255,255,255,0.95); }
        :host-context([data-theme="branco"]) .field-input, :host([data-theme="branco"]) .field-input,
        :host-context([data-theme="rosa"]) .field-input, :host([data-theme="rosa"]) .field-input,
        :host-context([data-theme="laranja"]) .field-input, :host([data-theme="laranja"]) .field-input,
        :host-context([data-theme="branco"]) .perfil-card, :host([data-theme="branco"]) .perfil-card,
        :host-context([data-theme="rosa"]) .perfil-card, :host([data-theme="rosa"]) .perfil-card,
        :host-context([data-theme="laranja"]) .perfil-card, :host([data-theme="laranja"]) .perfil-card,
        :host-context([data-theme="branco"]) .votacao-card, :host([data-theme="branco"]) .votacao-card,
        :host-context([data-theme="rosa"]) .votacao-card, :host([data-theme="rosa"]) .votacao-card,
        :host-context([data-theme="laranja"]) .votacao-card, :host([data-theme="laranja"]) .votacao-card,
        :host-context([data-theme="branco"]) .alt-card, :host([data-theme="branco"]) .alt-card,
        :host-context([data-theme="rosa"]) .alt-card, :host([data-theme="rosa"]) .alt-card,
        :host-context([data-theme="laranja"]) .alt-card, :host([data-theme="laranja"]) .alt-card {
          background: rgba(0,0,0,0.04); border-color: var(--border);
        }
      </style>

      <div class="content">
        <div class="wrap">
          <div class="header">
            <div class="header-icon">${SVG_VOTE}</div>
            <div>
              <div class="header-title">Votação</div>
              <div class="header-sub">DMaior Agency</div>
            </div>
          </div>
          <div id="conteudo"></div>
        </div>
      </div>
    `;
  }

  // ── Etapa 1 (só no contexto público): informar UID ────────────────────
  _renderGate() {
    const el = this.shadowRoot.getElementById('conteudo');
    el.innerHTML = `
      <div class="field-group">
        <label class="field-label">${SVG_USERS} Seu ID de Streamer</label>
        <input type="text" id="inp-uid" class="field-input" placeholder="Digite seu UID do Kwai" autocomplete="off" />
      </div>
      <button class="btn-main" id="btn-verificar"><span id="btn-verificar-texto">Verificar</span></button>
      <div class="feedback" id="fb-gate"></div>
    `;
    this.shadowRoot.getElementById('btn-verificar').addEventListener('click', () => this._onVerificar());
    this.shadowRoot.getElementById('inp-uid').addEventListener('keydown', (e) => { if (e.key === 'Enter') this._onVerificar(); });
  }

  async _onVerificar() {
    const sr = this.shadowRoot;
    const input = sr.getElementById('inp-uid');
    const btn   = sr.getElementById('btn-verificar');
    const texto = sr.getElementById('btn-verificar-texto');
    const fb    = sr.getElementById('fb-gate');
    const uid = input.value.trim();

    fb.className = 'feedback'; fb.textContent = '';
    if (!uid) { fb.className = 'feedback erro'; fb.textContent = 'Informe seu ID.'; return; }

    btn.disabled = true; texto.innerHTML = '<span class="spinner"></span>';
    try {
      const data = await window.DmaiorAPI.votacao.verificarId(uid);
      this._perfil = { uid: data.uid, nome: data.nome, foto_url: data.foto_url };
      this._renderConfirmar();
    } catch (e) {
      fb.className = 'feedback erro';
      fb.textContent = e.message || 'Não foi possível verificar esse ID.';
    } finally {
      btn.disabled = false; texto.textContent = 'Verificar';
    }
  }

  _renderConfirmar() {
    const el = this.shadowRoot.getElementById('conteudo');
    const p = this._perfil;
    const foto = this._imgUrl(p.foto_url, 104, 104);
    el.innerHTML = `
      <div class="perfil-card">
        <div class="perfil-ava">${foto ? `<img src="${foto}" alt="">` : SVG_USERS}</div>
        <div>
          <div class="perfil-nome">${p.nome || 'Streamer'}</div>
          <div class="perfil-uid">UID: ${p.uid}</div>
        </div>
      </div>
      <p style="font-size:0.85rem;color:var(--muted);margin-bottom:16px;">É você mesmo?</p>
      <div class="confirmar-row">
        <button class="btn-main" id="btn-sim">Sim, é a minha conta</button>
        <button class="btn-ghost" id="btn-nao">Não sou eu</button>
      </div>
    `;
    this.shadowRoot.getElementById('btn-sim').addEventListener('click', () => this._carregarLista());
    this.shadowRoot.getElementById('btn-nao').addEventListener('click', () => { this._perfil = null; this._renderGate(); });
  }

  // ── Etapa 2: lista de votações disponíveis ────────────────────────────
  async _carregarLista() {
    const el = this.shadowRoot.getElementById('conteudo');
    el.innerHTML = `<p style="text-align:center;color:var(--muted);font-size:0.85rem;padding:20px 0;"><span class="spinner"></span> Carregando votações...</p>`;
    try {
      const data = await window.DmaiorAPI.votacao.listar(this._perfil.uid, this._modo);
      this._votacoes = data.votacoes || [];
      this._renderLista();
    } catch (_) {
      el.innerHTML = `<p class="empty-msg">Não foi possível carregar as votações. Tente novamente mais tarde.</p>`;
    }
  }

  _renderLista() {
    const el = this.shadowRoot.getElementById('conteudo');
    if (!this._votacoes.length) {
      el.innerHTML = `<p class="empty-msg">Nenhuma votação disponível no momento.</p>`;
      return;
    }
    el.innerHTML = this._votacoes.map(v => `
      <div class="votacao-card ${v.ja_votou ? 'votada' : ''}" data-id="${v.id}">
        ${v.banner_url ? `<img class="votacao-banner" src="${this._imgUrl(v.banner_url, 144, 104)}" alt="">` : ''}
        <div class="votacao-info">
          <div class="votacao-titulo">${v.titulo}</div>
          <div class="votacao-meta">
            <span>Encerra em ${this._fmtData(v.data_fim)}</span>
            ${v.ja_votou ? '<span class="badge-votada">✓ Você já votou</span>' : ''}
          </div>
        </div>
      </div>`).join('');

    el.querySelectorAll('.votacao-card').forEach(card => {
      card.addEventListener('click', () => this._abrirVotacao(card.dataset.id));
    });
  }

  // ── Etapa 3: detalhe + votar ───────────────────────────────────────────
  async _abrirVotacao(votacaoId) {
    const el = this.shadowRoot.getElementById('conteudo');
    el.innerHTML = `<p style="text-align:center;color:var(--muted);font-size:0.85rem;padding:20px 0;"><span class="spinner"></span> Carregando...</p>`;
    try {
      const data = await window.DmaiorAPI.votacao.detalhe(votacaoId, this._perfil.uid);
      this._atual = data;
      this._selecionadas = new Set();
      this._renderVotacao();
    } catch (_) {
      el.innerHTML = `<p class="empty-msg">Não foi possível abrir esta votação.</p>`;
    }
  }

  _renderVotacao() {
    const el = this.shadowRoot.getElementById('conteudo');
    const { votacao, pergunta, alternativas, ja_votou } = this._atual;

    const voltar = `<div class="voltar-row"><button class="btn-ghost" id="btn-voltar">${SVG_BACK} Voltar</button></div>`;

    if (ja_votou) {
      el.innerHTML = `${voltar}<p class="empty-msg">Você já votou nesta votação. Obrigado por participar!</p>`;
      this.shadowRoot.getElementById('btn-voltar').addEventListener('click', () => this._carregarLista());
      return;
    }

    const isFoto = votacao.tipo === 'foto';
    el.innerHTML = `
      ${voltar}
      ${votacao.banner_url ? `<img class="banner-img" src="${this._imgUrl(votacao.banner_url, 640, 220)}" alt="">` : ''}
      <div class="pergunta-texto">${pergunta.texto}</div>
      ${votacao.descricao ? `<div class="pergunta-desc">${votacao.descricao}</div>` : ''}
      ${pergunta.max_selecoes > 1 ? `<div class="pergunta-limite">Escolha até ${pergunta.max_selecoes} opções</div>` : ''}
      <div class="alt-grid ${isFoto ? '' : 'tipo-texto'}" id="alt-grid">
        ${alternativas.map(a => `
          <div class="alt-card" data-id="${a.id}">
            <div class="alt-check">${SVG_CHECK}</div>
            ${isFoto && a.imagem_url ? `<img class="alt-foto" src="${this._imgUrl(a.imagem_url, 300, 220)}" alt="">` : ''}
            <div class="alt-titulo">${a.titulo}</div>
            ${a.descricao ? `<div class="alt-desc">${a.descricao}</div>` : ''}
          </div>`).join('')}
      </div>
      <button class="btn-main" id="btn-confirmar-voto" disabled><span id="btn-confirmar-texto">Confirmar Voto</span></button>
      <div class="feedback" id="fb-voto"></div>
    `;

    this.shadowRoot.getElementById('btn-voltar').addEventListener('click', () => this._carregarLista());
    this.shadowRoot.querySelectorAll('.alt-card').forEach(card => {
      card.addEventListener('click', () => this._toggleAlternativa(card.dataset.id, pergunta.max_selecoes));
    });
    this.shadowRoot.getElementById('btn-confirmar-voto').addEventListener('click', () => this._confirmarVoto());
  }

  _toggleAlternativa(id, maxSelecoes) {
    if (maxSelecoes <= 1) {
      this._selecionadas = new Set([id]);
    } else if (this._selecionadas.has(id)) {
      this._selecionadas.delete(id);
    } else if (this._selecionadas.size < maxSelecoes) {
      this._selecionadas.add(id);
    }
    // Não trava seleção nova quando já está no limite — só ignora o clique
    // (o card simplesmente não fica marcado até o usuário desmarcar outro).

    const sr = this.shadowRoot;
    sr.querySelectorAll('.alt-card').forEach(card => {
      card.classList.toggle('sel', this._selecionadas.has(card.dataset.id));
    });
    sr.getElementById('btn-confirmar-voto').disabled = this._selecionadas.size === 0;
  }

  async _confirmarVoto() {
    const sr = this.shadowRoot;
    const btn   = sr.getElementById('btn-confirmar-voto');
    const texto = sr.getElementById('btn-confirmar-texto');
    const fb    = sr.getElementById('fb-voto');

    fb.className = 'feedback'; fb.textContent = '';
    btn.disabled = true; texto.innerHTML = '<span class="spinner"></span>';

    try {
      await window.DmaiorAPI.votacao.votar({
        votacao_id:      this._atual.votacao.id,
        uid:             this._perfil.uid,
        alternativa_ids: Array.from(this._selecionadas),
      });
      this._renderObrigado();
    } catch (e) {
      fb.className = 'feedback erro';
      fb.textContent = e.message || 'Não foi possível registrar seu voto.';
      btn.disabled = false;
      texto.textContent = 'Confirmar Voto';
    }
  }

  _renderObrigado() {
    const el = this.shadowRoot.getElementById('conteudo');
    el.innerHTML = `
      <p class="empty-msg" style="color:var(--green);">✓ Voto registrado com sucesso!<br>Obrigado por participar.</p>
      <button class="btn-ghost" id="btn-voltar-lista" style="margin:0 auto;display:flex;">${SVG_BACK} Voltar às votações</button>
    `;
    this.shadowRoot.getElementById('btn-voltar-lista').addEventListener('click', () => this._carregarLista());
  }
}

customElements.define('dmaior-votacao', DmaiorVotacao);
