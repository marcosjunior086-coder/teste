/* eslint-env browser */
// ============================================================
//  DMaior Agency — Custom Element: <painel-pk> (Fase 4)
//  Autocontido, no mesmo padrão de dmaior-votacao.js/ranking.js:
//  lê dm_uid/dm_token do localStorage sozinho e busca os dados via
//  window.DmaiorAPI.pk.* — não recebe mais estado por atributo.
//  Exclusivo do painel do streamer logado (dmaior-app.js).
//
//  Visual: cards claros com placar em pílula rosa/azul e anel de
//  avatar gradiente, seguindo a referência enviada (estilo nativo
//  Kwai) — acompanha os temas do site (--tema em :host-context),
//  mesmo padrão de dmaior-votacao.js.
// ============================================================
class PainelPK extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._iniciado = false;
    this._carregando = true;
    this._erro = null;
    this._programacoes = [];
    this._progIdx = 0;
    this._confrontos = [];
    this._ranking = [];
    this._datas = [];
    this._dataIdx = 0;
    this._abaAtiva = 'confrontos';
  }

  connectedCallback() {
    this._syncThemeHost();
    this._render();
    if (this._isLoggedIn()) this._iniciarCarregamento();
    this._storageThemeHandler = (e) => { if (e.key === 'dm_tema') this._syncThemeHost(); };
    this._themeHandler = () => this._syncThemeHost();
    window.addEventListener('storage', this._storageThemeHandler);
    window.addEventListener('dmaior:tema', this._themeHandler);
  }

  disconnectedCallback() {
    window.removeEventListener('storage', this._storageThemeHandler);
    window.removeEventListener('dmaior:tema', this._themeHandler);
  }

  // Mesmo mecanismo de tema de dmaior-votacao.js/ranking.js — lê
  // dm_tema do localStorage e espelha no atributo data-theme do
  // próprio host, pra CSS :host-context/:host([data-theme]) reagir.
  _syncThemeHost() {
    let tema = 'original';
    try { tema = localStorage.getItem('dm_tema') || 'original'; } catch (_) {}
    if (tema === 'original') this.removeAttribute('data-theme');
    else this.setAttribute('data-theme', tema);
  }

  // Chamado por dmaior-app.js ao abrir a aba — cobre o caso do elemento já
  // existir no DOM desde antes do login terminar (mesmo padrão de
  // ranking-dmaior/dmaior-votacao).
  verificarSessao() {
    if (!this._iniciado && this._isLoggedIn()) this._iniciarCarregamento();
  }

  _isLoggedIn() {
    return !!(localStorage.getItem('dm_uid') && localStorage.getItem('dm_token'));
  }

  async _iniciarCarregamento() {
    this._iniciado = true;
    this._carregando = true;
    this._erro = null;
    this._renderConteudo();
    try {
      const data = await window.DmaiorAPI.pk.listarProgramacoes();
      this._programacoes = data.programacoes || [];
      this._progIdx = 0;
      await this._carregarProgramacaoAtiva();
    } catch (e) {
      this._erro = 'Não foi possível carregar o PK Diário agora. Tente novamente mais tarde.';
    } finally {
      this._carregando = false;
      this._renderConteudo();
    }
  }

  async _carregarProgramacaoAtiva() {
    const prog = this._programacoes[this._progIdx];
    if (!prog) { this._confrontos = []; this._ranking = []; this._datas = []; return; }
    const [confData, rankData] = await Promise.all([
      window.DmaiorAPI.pk.confrontos(prog.id),
      window.DmaiorAPI.pk.ranking({ programacao_id: prog.id }),
    ]);
    this._confrontos = confData.confrontos || [];
    this._ranking = rankData.ranking || [];
    this._datas = [...new Set(this._confrontos.map(c => c.data_confronto))].sort();
    this._dataIdx = 0;
  }

  async _mudarProgramacao(idx) {
    this._progIdx = idx;
    this._dataIdx = 0;
    this._carregando = true;
    this._renderConteudo();
    await this._carregarProgramacaoAtiva();
    this._carregando = false;
    this._renderConteudo();
  }

  _mudarData(idx) { this._dataIdx = idx; this._renderConteudo(); }
  _mudarAba(aba) { this._abaAtiva = aba; this._renderConteudo(); }

  _render() {
    const estilo = `
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@700;800;900&family=Exo+2:wght@400;600;700;800&display=swap');

        :host {
          display: block;
          font-family: var(--dm-font-body,'Nunito',sans-serif);
          --pk-pink: #FF1A54;
          --pk-pink-l: #FF6FA0;
          --pk-blue: #0055FF;
          --pk-blue-l: #5C9DFF;
          --cyan: #00d4d4;
          --cyan-d: rgba(0,212,212,0.15);
          --gold: #f0c040;
          --silver: #b8c4d0;
          --bronze: #cd7f32;
          --green: #4ade80;
          --red: #f87171;
          --border: rgba(255,255,255,0.1);
          --card-bg: rgba(255,255,255,0.05);
          --text: #fff;
          --muted: #94a3b8;
        }
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }

        .app { width: 100%; color: var(--text); }
        .content { width: 100%; max-width: 600px; margin: 0 auto; padding: 20px 14px 40px; }

        .pk-toolbar { display: flex; justify-content: flex-end; margin-bottom: 10px; }
        .pk-refresh-btn { width: 36px; height: 36px; border-radius: 50%; background: var(--card-bg); border: 1px solid var(--border); color: var(--muted); display: flex; align-items: center; justify-content: center; cursor: pointer; transition: color .2s, border-color .2s; padding: 0; }
        .pk-refresh-btn:hover { color: var(--text); border-color: var(--cyan); }
        .pk-refresh-btn:disabled { cursor: default; opacity: .7; }
        .pk-refresh-btn.spinning svg { animation: spin .8s linear infinite; }
        .nav-container { display: flex; flex-wrap: wrap; justify-content: center; gap: 6px; margin: 0 auto 12px; background: var(--card-bg); padding: 5px; border-radius: 14px; border: 1px solid var(--border); width: fit-content; max-width: 100%; }
        .btn-base { font-family: inherit; background: transparent; border: none; padding: 8px 16px; border-radius: 10px; font-weight: 800; font-size: .78rem; cursor: pointer; transition: all .2s; text-transform: uppercase; letter-spacing: .5px; color: var(--muted); }
        .btn-base:hover { color: var(--text); }
        .btn-base.active { background: linear-gradient(135deg, var(--pk-pink), var(--pk-blue)); color: #fff; box-shadow: 0 4px 16px rgba(0,85,255,.25); }

        .pk-agenda-banner { text-align: center; font-size: .74rem; font-weight: 800; color: var(--cyan); background: var(--cyan-d); border: 1px solid var(--cyan); border-radius: 12px; padding: 8px 14px; margin: 0 auto 14px; width: fit-content; max-width: 100%; }

        .date-container { display: flex; justify-content: center; flex-wrap: wrap; gap: 8px; margin: 0 auto 16px; min-height: 34px; }
        .date-btn { font-family: inherit; background: var(--card-bg); border: 1px solid var(--border); color: var(--muted); padding: 6px 16px; border-radius: 10px; font-weight: 800; font-size: .72rem; cursor: pointer; transition: all .2s; }
        .date-btn:hover { color: var(--text); }
        .date-btn.active { background: var(--cyan-d); border-color: var(--cyan); color: var(--cyan); }

        .tabs { display: flex; justify-content: center; margin: 0 auto 22px; width: fit-content; max-width: 100%; background: var(--card-bg); border: 1px solid var(--border); border-radius: 14px; overflow: hidden; }
        .tab-btn { font-family: inherit; background: transparent; border: none; color: var(--muted); padding: 10px 22px; font-weight: 800; font-size: .76rem; cursor: pointer; transition: all .2s; text-transform: uppercase; letter-spacing: .5px; display: flex; align-items: center; justify-content: center; gap: 6px; flex: 1 1 auto; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .tab-btn svg { width: 13px; height: 13px; fill: currentColor; flex-shrink: 0; }
        .tab-btn.active { background: linear-gradient(135deg, var(--pk-pink), var(--pk-blue)); color: #fff; }
        /* 3 abas (Confrontos/Ranking/Regras) não cabiam num celular estreito
           com o padding padrão — o container tinha width:fit-content sem
           limite, então "Regras" ficava cortado fora da tela em vez de
           encolher junto com as outras. */
        @media (max-width: 420px) {
          .tab-btn { padding: 9px 8px; font-size: .64rem; gap: 4px; }
          .tab-btn svg { width: 11px; height: 11px; }
        }

        .state-msg { text-align: center; padding: 50px 20px; color: var(--muted); font-size: .95rem; font-weight: 700; display: flex; flex-direction: column; align-items: center; gap: 12px; }
        .spinner { width: 36px; height: 36px; border-radius: 50%; border: 3px solid var(--cyan-d); border-top-color: var(--cyan); animation: spin .8s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }

        /* ── Cards de confronto (referência: lista estilo Kwai) ── */
        .cards-grid { display: flex; flex-direction: column; gap: 16px; animation: fadeUp .4s ease both; }
        .pk-card { background: var(--card-bg); border: 1px solid var(--border); border-radius: 22px; padding: 18px 18px 20px; }
        .pk-result { text-align: center; font-size: 1.3rem; font-weight: 900; color: var(--text); }
        .pk-result.cancelado { color: var(--red); }
        .pk-result.pendente { color: var(--muted); font-size: 1rem; }
        .pk-date { text-align: center; font-size: .78rem; color: var(--muted); font-weight: 700; margin-top: 3px; margin-bottom: 16px; }

        .pk-row { display: flex; align-items: center; justify-content: space-between; padding: 0 2px; margin-bottom: 16px; gap: 8px; }
        .pk-side { display: flex; flex-direction: column; align-items: center; gap: 6px; width: 96px; }
        .pk-vs { font-family: var(--dm-font-body,'Exo 2',sans-serif); font-weight: 900; font-size: .8rem; color: var(--muted); flex-shrink: 0; letter-spacing: 1px; }
        .pk-avatar-ring { width: 58px; height: 58px; border-radius: 50%; padding: 3px; display: flex; flex-shrink: 0; }
        .pk-avatar-ring.a { background: linear-gradient(135deg, var(--pk-pink), var(--pk-pink-l)); }
        .pk-avatar-ring.b { background: linear-gradient(135deg, var(--pk-blue-l), var(--pk-blue)); }
        .pk-avatar-ring.gray { background: var(--border); }
        .pk-avatar { width: 100%; height: 100%; border-radius: 50%; object-fit: cover; display: block; background: var(--card-bg); border: 2px solid var(--card-bg); }
        .pk-avatar.lose { filter: grayscale(100%); opacity: .75; }
        .pk-avatar-placeholder { width: 100%; height: 100%; border-radius: 50%; background: var(--card-bg); display: flex; align-items: center; justify-content: center; border: 2px solid var(--card-bg); }
        .pk-avatar-placeholder svg { width: 24px; height: 24px; fill: var(--muted); }
        .pk-name { font-size: .74rem; font-weight: 800; text-align: center; color: var(--text); max-width: 96px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .pk-badge-result { font-size: .6rem; font-weight: 800; letter-spacing: .6px; text-transform: uppercase; padding: 3px 10px; border-radius: 20px; }
        .pk-badge-result.win  { background: rgba(240,192,64,.1); border: 1px solid rgba(240,192,64,.35); color: var(--dm-gold, #f0c040); }
        .pk-badge-result.lose { background: rgba(148,163,184,.1); border: 1px solid rgba(148,163,184,.35); color: var(--muted); }
        .pk-live-tag { font-size: .56rem; font-weight: 900; padding: 2px 8px; border-radius: 99px; text-transform: uppercase; letter-spacing: .5px; display: inline-flex; align-items: center; gap: 3px; }
        .pk-live-tag.on { background: rgba(74,222,128,.15); color: var(--green); }
        .pk-live-tag.off { background: var(--border); color: var(--muted); }
        .pk-live-dot { width: 5px; height: 5px; border-radius: 50%; background: var(--green); animation: blink 1s ease infinite; }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:.3} }

        .pk-scorebar { display: flex; height: 40px; border-radius: 999px; overflow: hidden; }
        .pk-scorebar .side { flex: 1; display: flex; align-items: center; font-weight: 900; font-size: .95rem; color: #fff; padding: 0 18px; white-space: nowrap; }
        .pk-scorebar .side.pink { background: linear-gradient(90deg, var(--pk-pink), var(--pk-pink-l)); justify-content: flex-start; }
        .pk-scorebar .side.blue { background: linear-gradient(90deg, var(--pk-blue-l), var(--pk-blue)); justify-content: flex-end; }
        .pk-scorebar.neutro .side { background: var(--border); color: var(--muted); justify-content: center; font-size: .74rem; font-weight: 800; text-transform: uppercase; letter-spacing: .5px; }

        .ranking-wrap { animation: fadeUp .4s ease both; }
        .rank-section-title { font-family: var(--dm-font-body,'Exo 2',sans-serif); font-size: .72rem; font-weight: 800; color: var(--cyan); letter-spacing: 2px; text-transform: uppercase; text-align: center; margin-bottom: 20px; display: flex; align-items: center; justify-content: center; gap: 10px; }
        .rank-section-title::before, .rank-section-title::after { content:''; flex:1; height:1px; background:linear-gradient(90deg,transparent,var(--cyan-d),transparent); }

        .podium { display: flex; justify-content: center; align-items: flex-end; margin-bottom: 28px; margin-top: 78px; gap: 10px; }
        .podium-item { display: flex; flex-direction: column; align-items: center; width: 30%; border-radius: 18px; padding: 15px 6px 12px; position: relative; border: 1px solid var(--border); background: var(--card-bg); }
        .podium-item.first { padding-top: 20px; }
        .avatar-wrapper { position: relative; margin-top: -42px; margin-bottom: 8px; }
        .avatar { width: 58px; height: 58px; border-radius: 50%; background: var(--card-bg); border: 3px solid var(--border); object-fit: cover; display: block; }
        .first .avatar { width: 72px; height: 72px; border-color: var(--gold); box-shadow: 0 0 0 3px rgba(240,192,64,.25); }
        .second .avatar { border-color: var(--silver); }
        .third .avatar { border-color: var(--bronze); }
        .pod-badge { position: absolute; top: -4px; right: -4px; width: 24px; height: 24px; border-radius: 50%; display: flex; justify-content: center; align-items: center; font-size: 11px; font-weight: 900; border: 2px solid var(--card-bg); color: #fff; }
        .first .pod-badge { background: var(--gold); width: 28px; height: 28px; top: -6px; right: -6px; font-size: 13px; color: #3a2a00; }
        .second .pod-badge { background: var(--silver); color: #1a2430; }
        .third .pod-badge { background: var(--bronze); }
        .crown-icon { position: absolute; top: -40px; left: 50%; transform: translateX(-50%) rotate(-8deg); fill: var(--gold); width: 28px; height: 28px; }
        .podium-name { width: 95%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-align: center; font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: .3px; color: var(--text); margin-top: 2px; }
        .podium-val { font-size: .9rem; font-weight: 900; display: flex; align-items: center; gap: 4px; margin-top: 4px; color: var(--cyan); }
        .podium-sub { font-size: .6rem; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: .3px; margin-top: 1px; }

        .ranking-list { display: flex; flex-direction: column; gap: 8px; }
        .list-item { display: flex; align-items: center; padding: 11px 14px; background: var(--card-bg); border-radius: 14px; border: 1px solid var(--border); }
        .list-rank { width: 28px; font-size: .95rem; font-weight: 900; color: var(--muted); text-align: center; }
        .list-avatar-wrap { width: 40px; height: 40px; margin-right: 12px; flex-shrink: 0; }
        .list-avatar { width: 40px; height: 40px; border-radius: 50%; object-fit: cover; border: 2px solid var(--border); display: block; background: var(--card-bg); }
        .list-name-col { display: flex; flex-direction: column; justify-content: center; flex: 1; min-width: 0; margin-right: 10px; }
        .list-name { font-size: .82rem; color: var(--text); font-weight: 800; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .list-sub { font-size: .66rem; color: var(--muted); font-weight: 700; margin-top: 2px; }
        .list-score { font-size: .85rem; font-weight: 900; color: var(--cyan); display: flex; align-items: center; gap: 4px; margin-left: auto; white-space: nowrap; }

        /* ── Regras ── */
        .rules-wrap { animation: fadeUp .4s ease both; display: flex; flex-direction: column; gap: 12px; }
        .rule-card { background: var(--card-bg); border: 1px solid var(--border); border-radius: 16px; padding: 14px 16px; display: flex; gap: 12px; align-items: flex-start; }
        .rule-num { font-family: var(--dm-font-body,'Exo 2',sans-serif); font-weight: 900; font-size: 1rem; color: #fff; background: linear-gradient(135deg, var(--pk-pink), var(--pk-blue)); width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .rule-text { font-size: .82rem; line-height: 1.5; color: var(--text); }
        .rule-text strong { color: var(--cyan); }

        @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }

        /* ══ Temas claros — mesmo padrão de dmaior-votacao.js/ranking.js ══ */
        /* card-bg um degrau mais escuro que o fundo da página (mesmos tons de
           --dm-bg-1 do global.css) — senão o card some contra o fundo claro,
           quase da mesma cor. */
        :host-context([data-theme="branco"]), :host([data-theme="branco"]) { --cyan:#0095a8; --cyan-d:rgba(0,149,168,.14); --text:#0d1117; --muted:#5b6472; --border:rgba(0,0,0,.08); --card-bg:#eaeff6; }
        :host-context([data-theme="rosa"]), :host([data-theme="rosa"]) { --cyan:#e91e8c; --cyan-d:rgba(233,30,140,.14); --text:#1a0010; --muted:#7a4060; --border:rgba(0,0,0,.06); --card-bg:#fce4ec; }
        :host-context([data-theme="laranja"]), :host([data-theme="laranja"]) { --cyan:#f97316; --cyan-d:rgba(249,115,22,.14); --text:#1a0a00; --muted:#7c5b3a; --border:rgba(0,0,0,.06); --card-bg:#fff3e0; }
        :host-context([data-theme="branco"]) .pk-card, :host([data-theme="branco"]) .pk-card,
        :host-context([data-theme="rosa"]) .pk-card, :host([data-theme="rosa"]) .pk-card,
        :host-context([data-theme="laranja"]) .pk-card, :host([data-theme="laranja"]) .pk-card {
          box-shadow: 0 2px 14px rgba(0,0,0,.06);
        }
      </style>
    `;

    this.shadowRoot.innerHTML = `
      ${estilo}
      <div class="app">
        <div class="content">
          <div class="pk-toolbar">
            <button class="pk-refresh-btn" id="btn-pk-refresh" type="button" title="Atualizar">${PainelPK._icons.RefreshSVG}</button>
          </div>
          <nav class="nav-container" id="nav-container"></nav>
          <div class="date-container" id="date-container"></div>
          <div class="tabs" id="tabs-container"></div>
          <div id="dynamic-content"></div>
        </div>
      </div>
    `;
    window.DMaiorPrefs?.bind(this.shadowRoot);
    this.shadowRoot.getElementById('btn-pk-refresh').addEventListener('click', () => this._atualizar());
    this._renderConteudo();
  }

  // Botão manual — evita ter que sair da aba ou dar refresh na página
  // inteira só pra ver diamantes/confrontos atualizados. Não usa o estado
  // "carregando" de tela cheia (ficaria piscando a cada clique) — só gira o
  // ícone do próprio botão enquanto busca de novo.
  async _atualizar() {
    const btn = this.shadowRoot.getElementById('btn-pk-refresh');
    if (btn) { btn.disabled = true; btn.classList.add('spinning'); }
    try {
      if (!this._programacoes.length) {
        const data = await window.DmaiorAPI.pk.listarProgramacoes();
        this._programacoes = data.programacoes || [];
      }
      await this._carregarProgramacaoAtiva();
      this._erro = null;
    } catch (e) {
      this._erro = 'Não foi possível atualizar agora. Tente de novo em instantes.';
    } finally {
      this._renderConteudo();
      if (btn) { btn.disabled = false; btn.classList.remove('spinning'); }
    }
  }

  // ── Ícones/escape ──────────────────────────────────────────────────────
  static get _icons() {
    return {
      UserSVG: `<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/></svg>`,
      CrownSVG: `<svg class="crown-icon" viewBox="0 0 24 24"><path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z"/></svg>`,
      TrophySVG: `<svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor" style="flex-shrink:0"><path d="M18 2H6v7a6 6 0 0 0 5 5.92V17h-2a1 1 0 0 0 0 2h6a1 1 0 0 0 0-2h-2v-2.08A6 6 0 0 0 18 9V2zM4 4v3a4 4 0 0 0 3 3.87V6H5V4H4zm16 0h-1v2h-2v4.87A4 4 0 0 0 20 7V4z"/></svg>`,
      RefreshSVG: `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M17.65 6.35A7.95 7.95 0 0 0 12 4a8 8 0 1 0 7.73 10h-2.08A6 6 0 1 1 12 6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg>`,
    };
  }

  _esc(str) {
    return String(str || '').replace(/[&<>"']/g, m => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[m]));
  }
  _num(n) {
    return Number(n || 0).toLocaleString('pt-BR');
  }

  // Data local (fuso do navegador do streamer) em ISO — usada só pra
  // decidir rótulos de exibição (não precisa ser BRT exato como no Worker).
  _hojeISO() {
    const h = new Date();
    return `${h.getFullYear()}-${String(h.getMonth() + 1).padStart(2, '0')}-${String(h.getDate()).padStart(2, '0')}`;
  }
  _diasAte(dataISO) {
    const alvo = new Date(dataISO + 'T00:00:00');
    const hoje = new Date(this._hojeISO() + 'T00:00:00');
    return Math.round((alvo - hoje) / 86400000);
  }
  _fmtBr(dataISO) {
    const [ano, mes, dia] = dataISO.split('-');
    return `${dia}/${mes}/${ano}`;
  }

  // Banner de agendamento — só aparece quando a liga tem início futuro
  // e/ou data de encerramento definida (liga contínua sem essas datas não
  // mostra nada aqui).
  _renderAvisoAgendamento() {
    const prog = this._programacoes[this._progIdx];
    if (!prog || (!prog.data_inicio && !prog.data_fim)) return '';
    const partes = [];
    if (prog.data_inicio) {
      const dias = this._diasAte(prog.data_inicio);
      partes.push(dias > 0
        ? `Começa em ${dias} dia${dias === 1 ? '' : 's'} — ${this._fmtBr(prog.data_inicio)}`
        : `Em andamento desde ${this._fmtBr(prog.data_inicio)}`);
    }
    if (prog.data_fim) partes.push(`Até ${this._fmtBr(prog.data_fim)}`);
    return `<div class="pk-agenda-banner">${this._esc(partes.join(' · '))}</div>`;
  }

  // ── Barras de navegação (programações / datas / abas) ─────────────────
  _renderNav() {
    const nav = this.shadowRoot.getElementById('nav-container');
    if (!nav) return;
    nav.innerHTML = this._programacoes.map((p, i) =>
      `<button class="btn-base${this._progIdx === i ? ' active' : ''}" data-prog-idx="${i}">${this._esc(p.nome)}</button>`
    ).join('');
    nav.querySelectorAll('[data-prog-idx]').forEach(b => b.addEventListener('click', () => this._mudarProgramacao(Number(b.dataset.progIdx))));

    const dateWrap = this.shadowRoot.getElementById('date-container');
    if (this._abaAtiva !== 'confrontos' || this._datas.length <= 1) {
      dateWrap.innerHTML = '';
    } else {
      dateWrap.innerHTML = this._datas.map((d, i) => {
        const [ano, mes, dia] = d.split('-');
        return `<button class="date-btn${this._dataIdx === i ? ' active' : ''}" data-data-idx="${i}">${dia}/${mes}</button>`;
      }).join('');
      dateWrap.querySelectorAll('[data-data-idx]').forEach(b => b.addEventListener('click', () => this._mudarData(Number(b.dataset.dataIdx))));
    }

    const tabs = this.shadowRoot.getElementById('tabs-container');
    tabs.innerHTML = `
      <button class="tab-btn${this._abaAtiva === 'confrontos' ? ' active' : ''}" data-aba="confrontos">
        <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/></svg>
        Confrontos
      </button>
      <button class="tab-btn${this._abaAtiva === 'ranking' ? ' active' : ''}" data-aba="ranking">
        <svg viewBox="0 0 24 24"><path d="M7.5 21H2V9h5.5v12zm7.25-18h-5.5v18h5.5V3zM22 11h-5.5v10H22V11z"/></svg>
        Ranking
      </button>
      <button class="tab-btn${this._abaAtiva === 'regras' ? ' active' : ''}" data-aba="regras">
        <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
        Regras
      </button>`;
    tabs.querySelectorAll('[data-aba]').forEach(b => b.addEventListener('click', () => this._mudarAba(b.dataset.aba)));
  }

  // ── Conteúdo principal ───────────────────────────────────────────────
  _renderConteudo() {
    this._renderNav();
    const el = this.shadowRoot.getElementById('dynamic-content');
    if (!el) return;

    if (this._carregando) { el.innerHTML = `<div class="state-msg"><div class="spinner"></div>Carregando...</div>`; return; }
    if (this._erro) { el.innerHTML = `<div class="state-msg">${this._esc(this._erro)}</div>`; return; }
    // Regras é conteúdo estático — funciona mesmo sem nenhuma liga ativa.
    if (this._abaAtiva === 'regras') { el.innerHTML = this._renderRegras(); return; }
    if (!this._programacoes.length) { el.innerHTML = `<div class="state-msg">Nenhuma programação de PK disponível no momento.</div>`; return; }

    const banner = this._renderAvisoAgendamento();
    el.innerHTML = banner + (this._abaAtiva === 'ranking' ? this._renderRanking() : this._renderConfrontos());
  }

  // Placar mostrado na pílula — usa score_a/score_b reais quando o admin
  // registrou (opcional), senão deriva um placar simples 1-0/0-1/0-0 a
  // partir do resultado, só pra dar a mesma leitura visual da referência.
  _placarConfronto(c, resultado) {
    if (c.score_a != null && c.score_b != null) return [Number(c.score_a), Number(c.score_b)];
    if (resultado === 'vitoria_a') return [1, 0];
    if (resultado === 'vitoria_b') return [0, 1];
    return [0, 0];
  }

  _renderConfrontos() {
    const { UserSVG } = PainelPK._icons;
    const dataFiltro = this._datas[this._dataIdx];
    const filtrados = dataFiltro ? this._confrontos.filter(c => c.data_confronto === dataFiltro) : this._confrontos;
    if (!filtrados.length) return `<div class="state-msg">Sem confrontos disponíveis.</div>`;

    return `<div class="cards-grid">` + filtrados.map(c => {
      const resultado = c.resultado || 'pendente';
      const pendente = resultado === 'pendente';
      const cancelado = resultado === 'cancelado';
      const winA = resultado === 'vitoria_a';
      const winB = resultado === 'vitoria_b';

      const isHoje = c.data_confronto === this._hojeISO();
      const rotuloResultado = { vitoria_a: 'Vitória', vitoria_b: 'Derrota', empate: 'Empate', cancelado: 'Cancelado' }[resultado]
        || (pendente && isHoje ? 'Em Andamento' : 'Programado');
      const classeResultado = cancelado ? 'cancelado' : (pendente ? 'pendente' : '');

      const [dia, mes] = [String(c.data_confronto).slice(8,10), String(c.data_confronto).slice(5,7)];
      // Confronto pendente normalmente é o de hoje (a liga fecha à meia-noite
      // e não existe mais horário fixo por confronto) — mas com início
      // agendado no futuro a rodada 1 já fica visível com antecedência,
      // datada num dia que ainda vai chegar.
      const dataLabel = pendente
        ? (isHoje ? 'Hoje' : `Agendado — ${dia}/${mes}`)
        : `${dia}/${mes}/${String(c.data_confronto).slice(0,4)}`;

      // Confronto com vencedor definido — cada lado ganha um badge próprio
      // (Vitória dourado / Derrota cinza) em vez do rótulo genérico no topo,
      // e o lado perdedor fica com foto e anel em cinza.
      const finalizado = winA || winB;
      const imgA = c.foto_a ? `<img class="pk-avatar${finalizado && !winA ? ' lose' : ''}" src="${this._esc(c.foto_a)}">` : `<div class="pk-avatar-placeholder">${UserSVG}</div>`;
      const imgB = c.foto_b ? `<img class="pk-avatar${finalizado && !winB ? ' lose' : ''}" src="${this._esc(c.foto_b)}">` : `<div class="pk-avatar-placeholder">${UserSVG}</div>`;
      const anelA = cancelado || (finalizado && !winA) ? 'gray' : 'a';
      const anelB = cancelado || (finalizado && !winB) ? 'gray' : 'b';
      const badgeA = finalizado ? `<span class="pk-badge-result ${winA ? 'win' : 'lose'}">${winA ? 'Vitória' : 'Derrota'}</span>` : '';
      const badgeB = finalizado ? `<span class="pk-badge-result ${winB ? 'win' : 'lose'}">${winB ? 'Vitória' : 'Derrota'}</span>` : '';

      const liveA = pendente && c.ao_vivo_a != null ? `<span class="pk-live-tag ${c.ao_vivo_a ? 'on' : 'off'}">${c.ao_vivo_a ? '<span class="pk-live-dot"></span>AO VIVO' : 'OFFLINE'}</span>` : '';
      const liveB = pendente && c.ao_vivo_b != null ? `<span class="pk-live-tag ${c.ao_vivo_b ? 'on' : 'off'}">${c.ao_vivo_b ? '<span class="pk-live-dot"></span>AO VIVO' : 'OFFLINE'}</span>` : '';

      let barraHtml;
      if (cancelado) {
        barraHtml = `<div class="pk-scorebar neutro"><div class="side">Confronto cancelado</div></div>`;
      } else if (pendente && isHoje) {
        // Placar parcial de hoje — só pra acompanhar, quem tiver mais
        // diamantes ATÉ AGORA fica com a barra maior. O resultado oficial
        // só é decidido à meia-noite (isso aqui nunca decide ponto).
        const diamA = Number(c.diamantes_hoje_a || 0), diamB = Number(c.diamantes_hoje_b || 0);
        const total = diamA + diamB;
        const pctA = total > 0 ? (diamA / total) * 100 : 50;
        const pctB = 100 - pctA;
        barraHtml = `<div class="pk-scorebar">
          <div class="side pink" style="flex:${pctA} 1 0%">${this._num(diamA)} 💎</div>
          <div class="side blue" style="flex:${pctB} 1 0%">${this._num(diamB)} 💎</div>
        </div>`;
      } else if (pendente) {
        barraHtml = `<div class="pk-scorebar neutro"><div class="side">Ainda não começou</div></div>`;
      } else {
        const [placarA, placarB] = this._placarConfronto(c, resultado);
        barraHtml = `<div class="pk-scorebar">
          <div class="side pink">${placarA}</div>
          <div class="side blue">${placarB}</div>
        </div>`;
      }

      return `
        <div class="pk-card">
          ${finalizado ? '' : `<div class="pk-result ${classeResultado}">${rotuloResultado}</div>`}
          <div class="pk-date">${dataLabel}</div>
          <div class="pk-row">
            <div class="pk-side">
              <div class="pk-avatar-ring ${anelA}">${imgA}</div>
              <span class="pk-name">${this._esc(c.nome_a || c.kwai_uid_a)}</span>
              ${badgeA}
              ${liveA}
            </div>
            <div class="pk-vs">VS</div>
            <div class="pk-side">
              <div class="pk-avatar-ring ${anelB}">${imgB}</div>
              <span class="pk-name">${this._esc(c.nome_b || c.kwai_uid_b)}</span>
              ${badgeB}
              ${liveB}
            </div>
          </div>
          ${barraHtml}
        </div>`;
    }).join('') + `</div>`;
  }

  _renderRanking() {
    const { CrownSVG, TrophySVG } = PainelPK._icons;
    const top = this._ranking || [];
    if (!top.length) return `<div class="state-msg">Nenhum confronto finalizado ainda nessa programação.</div>`;

    let html = `<div class="ranking-wrap"><div class="rank-section-title">Ranking de Vitórias</div>`;

    html += `<div class="podium">`;
    [1, 0, 2].forEach(idx => {
      const r = top[idx];
      if (!r) { html += `<div class="podium-item" style="border:none;background:transparent"></div>`; return; }
      const tipo = idx === 0 ? 'first' : (idx === 1 ? 'second' : 'third');
      html += `
        <div class="podium-item ${tipo}">
          <div class="avatar-wrapper">
            ${idx === 0 ? CrownSVG : ''}
            <img src="${this._esc(r.foto || '')}" class="avatar">
            <div class="pod-badge">${idx + 1}</div>
          </div>
          <div class="podium-name">${this._esc(r.nome || r.kwai_uid)}</div>
          <div class="podium-val">${TrophySVG} ${r.pontos} pts</div>
          <div class="podium-sub">${r.vitorias} vitória${r.vitorias === 1 ? '' : 's'}</div>
        </div>`;
    });
    html += `</div>`;

    const resto = top.slice(3);
    if (resto.length) {
      html += `<div class="rank-section-title" style="margin-top:24px;margin-bottom:14px">Classificação</div><div class="ranking-list">`;
      html += resto.map((r, i) => `
        <div class="list-item">
          <div class="list-rank">${i + 4}</div>
          <div class="list-avatar-wrap"><img src="${this._esc(r.foto || '')}" class="list-avatar"></div>
          <div class="list-name-col">
            <div class="list-name">${this._esc(r.nome || r.kwai_uid)}</div>
            <div class="list-sub">${r.vitorias} vitória${r.vitorias === 1 ? '' : 's'}</div>
          </div>
          <div class="list-score">${TrophySVG} ${r.pontos} pts</div>
        </div>`).join('');
      html += `</div>`;
    }
    return html + `</div>`;
  }

  _renderRegras() {
    const regras = [
      'Todo dia você é pareado com <strong>1 streamer</strong> — não é uma live conjunta, cada um transmite normal, separado.',
      'À meia-noite, o sistema compara quantos <strong>diamantes cada um dos dois recebeu naquele dia</strong>. Quem fez mais vence e ganha <strong>1 ponto</strong> no ranking.',
      'Empate (inclusive 0 a 0) não rende ponto pra nenhum lado.',
      'O ranking é por <strong>vitórias</strong>, não por diamantes — quem vence mais confrontos sobe na tabela.',
      'Ninguém é eliminado: mesmo perdendo, você recebe um <strong>novo adversário no dia seguinte</strong>, automaticamente.',
      'O primeiro confronto de cada streamer usa o desempenho do <strong>mês anterior</strong> só pra equilibrar o início — depois disso, os pares seguem o desempenho dentro da própria liga.',
    ];
    return `<div class="rules-wrap">` + regras.map((texto, i) => `
      <div class="rule-card">
        <div class="rule-num">${i + 1}</div>
        <div class="rule-text">${texto}</div>
      </div>`).join('') + `</div>`;
  }
}

customElements.define('painel-pk', PainelPK);
