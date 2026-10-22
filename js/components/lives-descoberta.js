/**
 * lives-descoberta.js — Aba lateral "LIVES" da home — DMaior Agency
 *
 * <dmaior-lives>: aba fina encostada na direita. Ao tocar, abre a área de
 * descoberta (Categorias / Canais ao vivo / Vídeos em breve) e a aba vira
 * "VOLTAR". No celular o painel ocupa a tela (abaixo do menu do topo); no
 * desktop é um painel lateral largo. O botão voltar do Android / Esc fecham
 * (o painel abre com #lives no histórico).
 *
 * Dados: Worker rank GET /lives/descoberta (window.DmaiorAPI.rank.getLivesDescoberta).
 * Quem está ao vivo vem do radar do Kwai; a categoria é a escolhida pelo streamer
 * no painel. Desligado no admin = a aba nem aparece. Radar parado = aviso de
 * "não deu pra confirmar", nunca "ninguém ao vivo".
 *
 * Sem <video> aqui (só capas): o navegador da Xiaomi não tem o que sequestrar.
 * "Assistir live" abre o link oficial que o próprio Kwai devolve (jump_url) —
 * no celular abre direto no app.
 */
(function () {
  if (customElements.get('dmaior-lives')) return;

  const ATUALIZA_ABERTO_MS  = 30000;  // painel aberto e visível
  const ATUALIZA_FECHADO_MS = 120000; // só pro número da aba
  const PREVIA_CANAIS = 4;            // "Canais ao vivo" embaixo das categorias
  const DADOS_VALIDOS_MS = 90000;     // sem conseguir atualizar por mais que isso, não afirma quem está ao vivo

  const ICO = {
    busca: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7.5"/><path d="m20.5 20.5-4.2-4.2"/></svg>',
    olho:  '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
    play:  '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.2-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z"/></svg>',
    info:  '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9.5"/><path d="M12 16v-4.5M12 8h.01"/></svg>',
    relog: '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M20 12a8 8 0 1 1-2.6-5.9L20 8.5"/><path d="M20 3.5v5h-5"/></svg>',
    seta:  '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>',
    dir:   '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>',
    coroa: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11.6 3.3a.5.5 0 0 1 .8 0l2.9 5.3a1 1 0 0 0 1.5.3L20.9 6a.5.5 0 0 1 .8.5l-2.8 10.2a1 1 0 0 1-1 .7H6.1a1 1 0 0 1-1-.7L2.3 6.5A.5.5 0 0 1 3.1 6l4.2 2.9a1 1 0 0 0 1.4-.3z"/><path d="M5 21h14"/></svg>',
    aviso: '<svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/></svg>',
    vazio: '<svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="2"/><path d="M16.2 7.8a6 6 0 0 1 0 8.5M7.8 16.2a6 6 0 0 1 0-8.5"/></svg>',
    check: '<svg viewBox="0 0 20 20" width="9" height="9"><path d="M5.5 10.5l3 3 6-6" stroke="white" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  };

  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const urlOk = (u) => (typeof u === 'string' && /^https:\/\/[^\s"'<>]+$/.test(u) ? u : '');
  const fmt = (n) => Number(n || 0).toLocaleString('pt-BR');
  const fmtCurto = (n) => {
    n = Number(n || 0);
    if (n < 10000) return fmt(n);
    try { return new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 }).format(n); } catch (_) { return fmt(n); }
  };
  const semAcento = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

  class DmaiorLives extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      this.d = null;            // última resposta
      this.recebidoEm = 0;      // Date.now() quando chegou (pra "atualizado há")
      this.erro = false;
      this.aberto = false;
      this.st = { aba: 'cats', grupo: 'todas', cat: null, q: '', ordem: 'esp' };
      this.encerradas = new Map(); // id → canal que saiu do ar enquanto o painel estava aberto
      this._t = null; this._tRel = null;
      // Live tocando no card (uma por vez): hover no computador, a mais centralizada no celular
      this._pv = null; this._pvT = null; this._pvTE = null; this._pvVig = null;
      this._pvFalhou = new Map(); this._pvBloq = false; this._pvOk = undefined;
      this._onPop = () => this._sync();
      this._onVis = () => {
        if (document.hidden) { clearTimeout(this._pvT); this._pvParar(); }
        else { this._agendar(true); this._pvAgendarEscolha(); }
      };
      this._onKey = (e) => { if (e.key === 'Escape' && this.aberto) this.fechar(); };
    }

    connectedCallback() {
      this.shadowRoot.innerHTML = `<style>${this._css()}</style>
        <button class="tab" id="tab" type="button" aria-expanded="false" aria-controls="painel" hidden>
          <span class="dot" aria-hidden="true"></span><span id="tabTxt">LIVES</span><span class="n" id="tabN" hidden></span>
          <span class="chev" aria-hidden="true">${ICO.seta}</span>
        </button>
        <div class="ovl" id="ovl"></div>
        <section class="painel" id="painel" role="dialog" aria-modal="true" aria-label="Lives" tabindex="-1" hidden></section>`;
      const r = this.shadowRoot;
      r.getElementById('tab').addEventListener('click', () => (this.aberto ? this.fechar() : this.abrir()));
      r.getElementById('ovl').addEventListener('click', () => this.fechar());
      // Imagem que falhar no proxy (weserv) tenta a original; se falhar também, some.
      r.addEventListener('error', (e) => {
        const im = e.target;
        if (!(im instanceof HTMLImageElement)) return;
        const raw = im.dataset.raw;
        if (raw && im.src !== raw) { im.dataset.raw = ''; im.src = raw; return; }
        im.classList.add('falhou');
      }, true);
      r.addEventListener('load', (e) => {
        const im = e.target;
        if (im instanceof HTMLImageElement && im.classList.contains('capa')) {
          // Live "em pé" (comum em entretenimento) aparece inteira sobre o fundo desfocado;
          // "deitada" (jogos) preenche o quadro.
          im.classList.toggle('vert', im.naturalHeight > im.naturalWidth * 1.05);
        }
      }, true);
      window.addEventListener('popstate', this._onPop);
      document.addEventListener('visibilitychange', this._onVis);
      document.addEventListener('keydown', this._onKey);
      // Primeira busca depois que a página assentou (não disputa com o carregamento da home)
      const ini = () => setTimeout(() => this._buscar().then(() => this._sync()), 1200);
      if (document.readyState === 'complete') ini(); else window.addEventListener('load', ini, { once: true });
    }

    disconnectedCallback() {
      window.removeEventListener('popstate', this._onPop);
      document.removeEventListener('visibilitychange', this._onVis);
      document.removeEventListener('keydown', this._onKey);
      clearTimeout(this._t); clearInterval(this._tRel); clearTimeout(this._pvT); clearTimeout(this._pvTE);
      this._pvParar();
      this._travarRolagem(false);
      if (this.aberto) this._avisaMidia(false);
    }

    // Painel aberto por cima da home: avisa quem toca vídeo/live no fundo (live-widget,
    // carrossel de banners) pra pausar enquanto ele estiver aberto, e retomar ao fechar.
    _avisaMidia(pausar) {
      try { window.dispatchEvent(new CustomEvent('dmaior:midia-pausa', { detail: { pausar: !!pausar, motivo: 'lives' } })); } catch (_) {}
    }

    // ── Dados ────────────────────────────────────────────────────────────────
    async _buscar() {
      clearTimeout(this._t);
      let d = null;
      try { d = await window.DmaiorAPI.rank.getLivesDescoberta(); } catch (_) { d = null; }
      // Desligado: continua conferindo de tempos em tempos (se o admin ligar, a aba aparece sem recarregar)
      if (d && d.ativo === false) { this.d = d; this.erro = false; this._mostrarAba(false); this._agendar(); return; }
      if (!d || !Array.isArray(d.canais)) {
        this.erro = true;
        if (!this.d) { this._mostrarAba(false); this._agendar(); return; } // nunca carregou: sem aba
      } else {
        // Quem estava na tela e saiu da lista: marca "encerrada" em vez de sumir do nada.
        // Só com todas as fontes confirmadas (status ok) — em 'parcial' a live pode só ter ficado de fora.
        const novos = new Set(d.canais.map((c) => c.id));
        const ocultos = new Set((d.ocultos || []).map(String)); // o streamer escondeu a própria live: some, não "encerrou"
        if (this.aberto && this.d && Array.isArray(this.d.canais) && d.status === 'ok') {
          for (const c of this.d.canais) if (!novos.has(c.id) && !ocultos.has(String(c.id))) this.encerradas.set(c.id, c);
        }
        // Voltou a aparecer (em qualquer resposta) ou foi ocultada: deixa de ser "encerrada"
        for (const id of novos) this.encerradas.delete(id);
        for (const id of ocultos) this.encerradas.delete(id);
        this.d = d; this.erro = false; this.recebidoEm = Date.now();
      }
      this._mostrarAba(true);
      this._numeroAba();
      if (this.aberto) this._render();
      this._agendar();
    }

    _agendar(agora) {
      clearTimeout(this._t);
      if (document.hidden) return;
      if (agora) { this._buscar(); return; }
      this._t = setTimeout(() => this._buscar(), this.aberto ? ATUALIZA_ABERTO_MS : ATUALIZA_FECHADO_MS);
    }

    _mostrarAba(on) {
      const tab = this.shadowRoot.getElementById('tab');
      tab.hidden = !on;
      if (!on && this.aberto) this.fechar();
    }

    // Sem dado confirmado agora: radar fora, ou a última resposta boa ficou velha (rede caiu)
    _semConfirmacao() {
      if (!this.d || !Array.isArray(this.d.canais) || this.d.status === 'indisponivel') return true;
      return this.erro && Date.now() - this.recebidoEm > DADOS_VALIDOS_MS;
    }

    _numeroAba() {
      const n = this.shadowRoot.getElementById('tabN');
      const tot = !this._semConfirmacao() && this.d.totais ? this.d.totais.canais : 0;
      n.hidden = !tot; n.textContent = tot > 99 ? '99+' : String(tot);
    }

    // ── Abrir / voltar ───────────────────────────────────────────────────────
    abrir() {
      if (this.aberto) return;
      if (location.hash !== '#lives') {
        try { history.pushState({ dmLives: true }, '', location.pathname + location.search + '#lives'); } catch (_) {}
      }
      this._sync(true);
    }

    fechar() {
      if (!this.aberto) return;
      // Se abrimos empurrando o histórico, voltar desfaz (o popstate fecha). Senão fecha direto.
      if (history.state && history.state.dmLives) { history.back(); return; }
      if (location.hash === '#lives') {
        try { history.replaceState(history.state, '', location.pathname + location.search); } catch (_) {}
      }
      this._sync(false);
    }

    _sync(forcar) {
      const tab = this.shadowRoot.getElementById('tab');
      const querAberto = forcar === undefined ? (location.hash === '#lives' && !tab.hidden) : forcar;
      if (querAberto === this.aberto) return;
      const r = this.shadowRoot, painel = r.getElementById('painel');
      this.aberto = querAberto;
      this._avisaMidia(querAberto);
      if (querAberto) {
        this._medirTopo();
        painel.hidden = false;
        this._render();
        requestAnimationFrame(() => requestAnimationFrame(() => { if (this.aberto) { this.toggleAttribute('data-aberto', true); try { painel.focus({ preventScroll: true }); } catch (_) {} } }));
        this._travarRolagem(true);
        r.getElementById('tabTxt').textContent = 'VOLTAR';
        tab.setAttribute('aria-expanded', 'true');
        tab.setAttribute('aria-label', 'Voltar');
        clearInterval(this._tRel);
        this._tRel = setInterval(() => this._atualizadoHa(), 5000);
        this._agendar(Date.now() - this.recebidoEm > 15000);
      } else {
        this.removeAttribute('data-aberto');
        clearTimeout(this._pvT); clearTimeout(this._pvTE); this._pvParar();
        this._travarRolagem(false);
        r.getElementById('tabTxt').textContent = 'LIVES';
        tab.setAttribute('aria-expanded', 'false');
        tab.removeAttribute('aria-label');
        clearInterval(this._tRel);
        this.encerradas.clear();
        if (this.shadowRoot.activeElement && painel.contains(this.shadowRoot.activeElement)) { try { tab.focus({ preventScroll: true }); } catch (_) {} }
        setTimeout(() => { if (!this.aberto) painel.hidden = true; }, 400);
        this._agendar();
      }
    }

    // No celular o menu do topo fica fixo por cima: o painel começa logo abaixo dele.
    _medirTopo() {
      let topo = 0;
      try {
        const m = document.querySelector('menu-mobile-dmaior');
        const b = m && m.getBoundingClientRect();
        if (b && b.top <= 1 && b.bottom > 0 && b.bottom < 140) topo = Math.round(b.bottom);
      } catch (_) {}
      this.style.setProperty('--lv-topo', topo + 'px');
    }

    _travarRolagem(on) {
      const h = document.documentElement;
      if (on) { this._ovAntes = h.style.overflow; h.style.overflow = 'hidden'; }
      else if (this._ovAntes !== undefined) { h.style.overflow = this._ovAntes; this._ovAntes = undefined; }
    }

    // ── Render ───────────────────────────────────────────────────────────────
    _render() {
      const p = this.shadowRoot.getElementById('painel');
      if (!p.firstElementChild) {
        p.innerHTML = `<div class="in">
          <header class="topo">
            <button type="button" class="voltar" id="voltar" aria-label="Voltar">${ICO.seta}<span>Voltar</span></button>
            <div class="cab"><h1>LIVES</h1><p>Quem da DMaior está ao vivo no Kwai agora.</p></div>
          </header>
          <label class="busca">${ICO.busca}<input id="q" type="search" placeholder="Buscar streamer, jogo ou categoria" autocomplete="off" enterkeyhint="search" aria-label="Buscar"></label>
          <nav class="abas" role="tablist">
            <button type="button" role="tab" data-aba="cats">Categorias</button>
            <button type="button" role="tab" data-aba="canais">Canais ao vivo</button>
            <button type="button" role="tab" disabled title="Em breve">Vídeos<span class="breve">EM BREVE</span></button>
            <span class="esp"></span>
            <label class="ordem" id="ordemL"><span class="sr">Ordenar</span><select id="ordem">
              <option value="esp">Mais assistidos</option><option value="rec">Começaram agora</option><option value="nome">Nome (A–Z)</option>
            </select></label>
          </nav>
          <div class="stats" id="stats"></div>
          <div class="chips" id="chips"></div>
          <div id="corpo"></div>
        </div>`;
        p.addEventListener('click', (e) => this._clique(e));
        p.querySelector('#voltar').addEventListener('click', () => this.fechar());
        // Live tocando no card: passar o mouse (computador) / rolar até ficar no centro (celular)
        p.addEventListener('mouseover', (e) => this._pvMouse(e, true));
        p.addEventListener('mouseout', (e) => this._pvMouse(e, false));
        p.addEventListener('scroll', () => this._pvAgendarEscolha(), { passive: true });
        p.addEventListener('pointerdown', () => { this._pvBloq = false; }, { passive: true }); // um toque libera o autoplay bloqueado
        p.querySelector('#q').addEventListener('input', (e) => { this.st.q = e.target.value.trim(); this._renderCorpo(); });
        p.querySelector('#ordem').addEventListener('change', (e) => { this.st.ordem = e.target.value; this._renderCorpo(); });
      }
      this._renderCorpo();
    }

    _clique(e) {
      const t = e.target.closest('[data-aba],[data-grupo],[data-cat],[data-ir],[data-limpar-cat],[data-tentar]');
      if (!t || t.disabled) return;
      if (t.dataset.aba) this.st.aba = t.dataset.aba;
      if (t.dataset.ir) this.st.aba = t.dataset.ir;
      if (t.dataset.grupo) { this.st.grupo = t.dataset.grupo; this.st.cat = null; }
      if (t.dataset.cat) { this.st.cat = t.dataset.cat; this.st.aba = 'canais'; }
      if (t.hasAttribute('data-limpar-cat')) this.st.cat = null;
      if (t.hasAttribute('data-tentar')) { this._buscar(); return; }
      this._renderCorpo();
      if (t.dataset.cat || t.dataset.ir) this.shadowRoot.getElementById('painel').scrollTo({ top: 0, behavior: 'smooth' });
    }

    _cat(id) { return (this.d && this.d.categorias || []).find((c) => c.id === id) || null; }
    _grupo(id) { return (this.d && this.d.grupos || []).find((g) => g.id === id) || null; }

    _filtrarCanais(lista) {
      const st = this.st;
      let l = lista.slice();
      if (st.grupo !== 'todas') l = l.filter((c) => c.grupo === st.grupo);
      if (st.cat) l = l.filter((c) => c.categoria === st.cat);
      if (st.q) {
        const q = semAcento(st.q);
        l = l.filter((c) => semAcento(c.nome).includes(q) || semAcento(this._cat(c.categoria)?.nome).includes(q) || semAcento(this._grupo(c.grupo)?.nome).includes(q));
      }
      const ord = {
        esp:  (a, b) => (b.espectadores ?? -1) - (a.espectadores ?? -1),
        rec:  (a, b) => (b.inicio || 0) - (a.inicio || 0),
        nome: (a, b) => a.nome.localeCompare(b.nome, 'pt-BR'),
      }[st.ordem] || (() => 0);
      return l.sort(ord);
    }

    _renderCorpo() { this._renderCorpoBase(); this._pvDepoisDoRender(); }

    _renderCorpoBase() {
      const r = this.shadowRoot, d = this.d || {}, st = this.st;
      if (!r.getElementById('corpo')) return;
      r.querySelectorAll('[data-aba]').forEach((b) => { const on = b.dataset.aba === st.aba; b.classList.toggle('on', on); b.setAttribute('aria-selected', on); });
      r.getElementById('ordemL').hidden = st.aba !== 'canais';
      const indisponivel = this._semConfirmacao();
      const canais = indisponivel ? [] : (d.canais || []);

      // Linha de números
      const tot = canais.length, soma = canais.reduce((s, c) => s + (c.espectadores || 0), 0);
      const semV = canais.some((c) => c.espectadores == null);
      r.getElementById('stats').innerHTML = indisponivel ? '' : `
        <span><i class="vivo"></i><b>${fmt(tot)}</b> ${tot === 1 ? 'canal' : 'canais'} ao vivo</span>
        ${tot ? `<span><b>${fmt(soma)}</b> espectadores somados <button type="button" class="dica" aria-label="O que é isso?">${ICO.info}<span class="tip" role="tooltip">Total de pessoas assistindo agora, somando o público de todas as lives.${semV ? ' Algumas lives não informaram espectadores.' : ''}</span></button></span>` : ''}
        <span class="atu" id="atu"></span>
        ${this._parcial() ? '<span class="parcial">Algumas lives podem não aparecer agora.</span>' : ''}`;
      this._atualizadoHa();

      // Filtros de categoria principal
      const grupos = d.grupos || [];
      r.getElementById('chips').innerHTML = grupos.length ? [['todas', 'Todas', tot], ...grupos.map((g) => [g.id, g.nome, g.canais])]
        .map(([k, t, n]) => `<button type="button" data-grupo="${esc(k)}" class="${st.grupo === k ? 'on' : ''}" aria-pressed="${st.grupo === k}">${esc(t)} <small>${indisponivel ? '' : fmt(n)}</small></button>`).join('') : '';

      const corpo = r.getElementById('corpo');
      if (indisponivel) {
        corpo.innerHTML = `<div class="estado aviso">${ICO.aviso}<b>Não deu pra confirmar quem está ao vivo</b>A atualização das lives está com problema agora. Tente de novo em alguns minutos.<button type="button" class="btn-sec" data-tentar>Tentar de novo</button></div>`;
        return;
      }
      if (st.aba === 'cats') corpo.innerHTML = this._htmlCategorias(canais);
      else corpo.innerHTML = this._htmlCanais(canais);
    }

    // ── Live tocando no card ─────────────────────────────────────────────────
    // Uma transmissão por vez, sem som, só dentro do quadro. Direto na Kwai; se falhar,
    // pelo proxy do Worker live; se falhar de novo, fica a capa (e não tenta de novo por 2 min).
    // Xiaomi (que troca <video> por player nativo) e "economia de dados" ficam só com a capa.
    _pvPermitido() {
      if (this._pvOk === undefined) {
        let sequestra = false, poupa = false;
        try { sequestra = !!(window.DmaiorVideoCompat && window.DmaiorVideoCompat.sequestraVideo && window.DmaiorVideoCompat.sequestraVideo()); } catch (_) {}
        try { poupa = !!(navigator.connection && navigator.connection.saveData); } catch (_) {}
        this._pvOk = !sequestra && !poupa;
      }
      return this._pvOk;
    }
    _pvHover() { try { return matchMedia('(hover: hover) and (pointer: fine)').matches; } catch (_) { return false; } }

    _hlsLib() {
      if (window.Hls) return Promise.resolve();
      return window.__dmHlsLib || (window.__dmHlsLib = new Promise((ok) => {
        const ja = document.querySelector('script[src*="hls.js"]'); // o widget da home pode já estar baixando
        const s = ja || Object.assign(document.createElement('script'), { src: 'https://cdn.jsdelivr.net/npm/hls.js@1.5.20' });
        s.addEventListener('load', ok); s.addEventListener('error', ok);
        setTimeout(ok, 10000);
        if (!ja) document.head.appendChild(s);
      }));
    }

    _pvMouse(e, entrou) {
      if (!this._pvHover() || !this.aberto) return;
      const t = e.target && e.target.closest ? e.target.closest('.thumb[data-stream]') : null;
      if (!t) return;
      if (entrou) {
        clearTimeout(this._pvT);
        if (this._pv && this._pv.thumb === t) return;
        this._pvT = setTimeout(() => this._pvIniciar(t), 250); // passou o mouse por cima sem querer: não liga
      } else {
        if (t.contains(e.relatedTarget)) return;
        clearTimeout(this._pvT);
        if (this._pv && this._pv.thumb === t) this._pvParar();
      }
    }

    // Celular: toca a transmissão cujo quadro está mais perto do meio da tela (mín. 55% visível)
    _pvAgendarEscolha() {
      if (!this.aberto || this._pvHover() || !this._pvPermitido()) return;
      clearTimeout(this._pvTE);
      this._pvTE = setTimeout(() => this._pvEscolher(), 280);
    }
    _pvEscolher() {
      if (!this.aberto || document.hidden) return;
      const painel = this.shadowRoot.getElementById('painel'); if (!painel) return;
      const pr = painel.getBoundingClientRect(), cy = pr.top + pr.height / 2;
      let melhor = null, dist = Infinity;
      for (const t of painel.querySelectorAll('.thumb[data-stream]')) {
        const b = t.getBoundingClientRect(); if (!b.height) continue;
        const vis = Math.min(b.bottom, pr.bottom) - Math.max(b.top, pr.top);
        if (vis < b.height * 0.55) continue;
        const d = Math.abs(b.top + b.height / 2 - cy);
        if (d < dist) { dist = d; melhor = t; }
      }
      if (!melhor) { this._pvParar(); return; }
      if (!this._pv || this._pv.thumb !== melhor) this._pvIniciar(melhor);
    }

    // A tela é redesenhada a cada atualização (30 s) e a cada filtro: a live que já toca
    // muda de lugar no mesmo instante em vez de recomeçar; se o card sumiu, para.
    _pvDepoisDoRender() {
      if (this._pv) {
        const pv = this._pv;
        const t = this._semConfirmacao() ? null
          : [...this.shadowRoot.querySelectorAll('.thumb[data-stream]')].find((x) => x.dataset.id === pv.id);
        if (t) {
          pv.url = t.dataset.stream; // link assinado mais novo: vale pra próxima conexão, sem derrubar a que toca
          t.appendChild(pv.video); pv.thumb = t; t.classList.toggle('tocando', pv.rodando);
          // Computador: o card pode ter mudado de lugar e o mouse já não estar em cima dele
          if (this._pvHover()) {
            setTimeout(() => { if (this._pv === pv && pv.thumb.isConnected && !pv.thumb.matches(':hover')) this._pvParar(); }, 200);
          }
        } else this._pvParar();
      }
      this._pvAgendarEscolha();
    }

    _pvIniciar(thumb) {
      if (!thumb || !thumb.isConnected || !this.aberto || document.hidden || this._pvBloq) return;
      if (this._pv && this._pv.thumb === thumb) return;
      const id = thumb.dataset.id, url = thumb.dataset.stream;
      this._pvParar();
      const falha = this._pvFalhou.get(id);
      if (!url || (falha && Date.now() - falha < 120000)) return;
      const v = document.createElement('video');
      v.muted = true; v.defaultMuted = true; v.playsInline = true;
      ['muted', 'playsinline', 'webkit-playsinline', 'x5-playsinline', 'disablepictureinpicture', 'disableremoteplayback'].forEach((a) => v.setAttribute(a, ''));
      v.setAttribute('controlslist', 'nodownload nofullscreen noremoteplayback noplaybackrate');
      v.setAttribute('aria-hidden', 'true'); v.tabIndex = -1;
      thumb.appendChild(v);
      const pv = this._pv = { id, url, thumb, video: v, hls: null, tok: 0, rodando: false, lastT: -1, parado: 0, timeout: null, onErr: null };
      v.addEventListener('playing', () => {
        if (this._pv !== pv) return;
        pv.rodando = true; clearTimeout(pv.timeout);
        // Live em pé aparece inteira sobre o fundo desfocado; deitada preenche o quadro
        v.classList.toggle('vert', v.videoHeight > v.videoWidth * 1.05);
        pv.thumb.classList.add('tocando');
      });
      this._pvLigar(pv, false);
      // Vigia: imagem parada por ~16 s = travou → recomeça
      this._pvVig = setInterval(() => {
        const cur = this._pv; if (!cur || document.hidden || !cur.rodando) return;
        const t = cur.video.currentTime;
        if (t === cur.lastT) {
          if (++cur.parado >= 2) { cur.parado = 0; cur.rodando = false; cur.thumb.classList.remove('tocando'); this._pvSoltar(cur); this._pvLigar(cur, false); }
        } else cur.parado = 0;
        cur.lastT = t;
      }, 8000);
    }

    async _pvLigar(pv, proxy) {
      const tok = ++pv.tok, v = pv.video;
      const vivo = () => this._pv === pv && pv.tok === tok;
      clearTimeout(pv.timeout);
      const base = ((window.DmaiorConfig && window.DmaiorConfig.workers && window.DmaiorConfig.workers.live) || '').replace(/\/$/, '');
      const url = proxy && base ? `${base}/?${encodeURIComponent(pv.url)}` : pv.url;
      const falhou = () => {
        if (!vivo()) return;
        this._pvSoltar(pv);
        if (!proxy && base) this._pvLigar(pv, true);
        else { this._pvFalhou.set(pv.id, Date.now()); this._pvParar(); }
      };
      if (window.MediaSource) await this._hlsLib();
      if (!vivo()) return;
      pv.timeout = setTimeout(falhou, proxy ? 14000 : 9000); // não começou a tocar a tempo → próxima tentativa
      v.muted = true;
      const tocar = () => {
        const pr = v.play();
        if (pr && pr.catch) pr.catch((e) => { if (vivo() && e && e.name === 'NotAllowedError') { this._pvBloq = true; this._pvParar(); } });
      };
      if (window.MediaSource && window.Hls && window.Hls.isSupported()) {
        const Hls = window.Hls;
        const hls = pv.hls = new Hls({
          capLevelToPlayerSize: true,   // quadro pequeno: não puxa qualidade além do necessário
          maxBufferLength: 6, maxMaxBufferLength: 12, backBufferLength: 0,
          liveSyncDurationCount: 3, manifestLoadingMaxRetry: 2, fragLoadingMaxRetry: 3,
        });
        hls.on(Hls.Events.MANIFEST_PARSED, () => { if (vivo()) tocar(); });
        hls.on(Hls.Events.ERROR, (_, d) => {
          if (!d.fatal || !vivo()) return;
          if (d.type === Hls.ErrorTypes.MEDIA_ERROR) { try { hls.recoverMediaError(); } catch (_) { falhou(); } }
          else falhou();
        });
        hls.loadSource(url);
        hls.attachMedia(v);
      } else if (v.canPlayType('application/vnd.apple.mpegurl')) {
        // iPhone: o Safari toca HLS sozinho
        pv.onErr = falhou;
        v.addEventListener('error', falhou, { once: true });
        v.src = url;
        tocar();
      } else {
        this._pvFalhou.set(pv.id, Date.now()); this._pvParar();
      }
    }

    _pvSoltar(pv) {
      try { if (pv.hls) pv.hls.destroy(); } catch (_) {}
      pv.hls = null;
      if (pv.onErr) { pv.video.removeEventListener('error', pv.onErr); pv.onErr = null; }
      try { pv.video.pause(); pv.video.removeAttribute('src'); pv.video.load(); } catch (_) {}
    }
    _pvParar() {
      const pv = this._pv;
      clearInterval(this._pvVig); this._pvVig = null;
      if (!pv) return;
      this._pv = null; pv.tok++;
      clearTimeout(pv.timeout);
      this._pvSoltar(pv);
      try { pv.video.remove(); } catch (_) {}
      if (pv.thumb) pv.thumb.classList.remove('tocando');
    }

    _parcial() { return !!this.d && (this.d.status === 'parcial' || this.erro); }
    _htmlNaoConfirmado() {
      return `<div class="estado aviso">${ICO.aviso}<b>Não deu pra confirmar todas as lives agora</b>Algumas transmissões podem estar faltando. Tente de novo em alguns minutos.<button type="button" class="btn-sec" data-tentar>Tentar de novo</button></div>`;
    }

    _atualizadoHa() {
      const el = this.shadowRoot.getElementById('atu');
      if (!el || !this.d || !this.d.atualizado_em) { if (el) el.innerHTML = ''; return; }
      // Idade no servidor quando respondeu + tempo desde que chegou aqui (sem depender do relógio do aparelho)
      const base = Math.max(0, (this.d.agora || 0) - this.d.atualizado_em);
      const s = Math.round((base + Date.now() - this.recebidoEm) / 1000);
      el.innerHTML = `${ICO.relog}Atualizado há ${s < 60 ? `${s} s` : `${Math.round(s / 60)} min`}`;
    }

    _htmlCategorias(canais) {
      const d = this.d, st = this.st;
      let cats = (d.categorias || []).filter((c) => st.grupo === 'todas' || c.grupo === st.grupo);
      if (!d.mostrar_vazias) cats = cats.filter((c) => c.canais > 0);
      if (st.q) { const q = semAcento(st.q); cats = cats.filter((c) => semAcento(c.nome).includes(q)); }
      cats = cats.slice().sort((a, b) => (b.espectadores - a.espectadores) || (b.canais - a.canais));
      const filtrados = this._filtrarCanais(canais);

      let html = '';
      if (cats.length) {
        html += `<div class="cats">${cats.map((c) => {
          const g = this._grupo(c.grupo), capa = urlOk(c.capa);
          return `<button type="button" class="cat ${c.canais ? '' : 'zero'}" data-cat="${esc(c.id)}">
            <span class="cat-capa">${capa ? `<img src="${esc(capa)}" alt="" loading="lazy" decoding="async" width="300" height="400">` : `<span class="sem-capa">${esc(c.nome)}</span>`}</span>
            <span class="cat-nome">${esc(c.nome)}</span>
            ${c.canais ? `<span class="cat-meta"><i class="vivo"></i>${fmt(c.canais)} ${c.canais === 1 ? 'canal' : 'canais'}${c.espectadores ? ` · ${fmtCurto(c.espectadores)} esp.` : ''}</span>` : `<span class="cat-meta off"><i class="vivo"></i>${this._parcial() ? 'Nenhuma confirmada' : 'Ninguém ao vivo'}</span>`}
            ${g ? `<span class="tag">${esc(g.nome)}</span>` : ''}
          </button>`;
        }).join('')}</div>`;
      } else if (st.q) {
        html += '<p class="nada">Nenhuma categoria encontrada.</p>';
      }

      if (!canais.length) {
        html += this._parcial() ? this._htmlNaoConfirmado() : `<div class="estado">${ICO.vazio}<b>Ninguém ao vivo agora</b>Volte mais tarde — as lives aparecem aqui assim que começam.</div>`;
      } else if (filtrados.length) {
        html += `<h2 class="sec">${ICO.coroa}Canais ao vivo<button type="button" class="ver" data-ir="canais">Ver todos ${ICO.dir}</button></h2>
          <div class="canais">${filtrados.slice(0, PREVIA_CANAIS).map((c) => this._htmlCanal(c)).join('')}</div>`;
      } else if (st.grupo !== 'todas' || st.q) {
        html += this._parcial() ? this._htmlNaoConfirmado() : '<p class="nada">Ninguém ao vivo com esse filtro agora.</p>';
      }
      return html;
    }

    _htmlCanais(canais) {
      const st = this.st, cat = st.cat && this._cat(st.cat);
      const lista = this._filtrarCanais(canais);
      const fim = [...this.encerradas.values()].filter((c) => this._filtrarCanais([c]).length);
      let html = cat ? `<div class="trilha"><button type="button" data-limpar-cat>${ICO.seta}Todas</button><span>/ ${esc(cat.nome)}</span></div>` : '';
      if (!lista.length && !fim.length) {
        if (this._parcial()) return html + this._htmlNaoConfirmado();
        html += canais.length
          ? `<div class="estado">${ICO.vazio}<b>${cat ? `Ninguém ao vivo em ${esc(cat.nome)} agora` : 'Nenhum canal com esse filtro'}</b>${cat ? 'Veja as outras categorias ou volte mais tarde.' : 'Tente outra categoria ou limpe a busca.'}</div>`
          : `<div class="estado">${ICO.vazio}<b>Ninguém ao vivo agora</b>Volte mais tarde — as lives aparecem aqui assim que começam.</div>`;
        return html;
      }
      return html + `<div class="canais">${lista.map((c) => this._htmlCanal(c)).join('')}${fim.map((c) => this._htmlCanal(c, true)).join('')}</div>`;
    }

    _selo(c) {
      const d = this.d;
      const img = (u, t, cls) => `<img class="selo ${cls}" src="${esc(u)}" width="15" height="15" alt="${t}" title="${t}">`;
      if (urlOk(c.selo_url)) return img(c.selo_url, 'Premium', 'premium');
      if (c.selo === 'premium') return urlOk(d.badge_premium_url) ? img(d.badge_premium_url, 'Verificado Premium', 'premium') : `<span class="selo premium" title="Verificado Premium">${ICO.check}</span>`;
      if (c.selo === 'verificado') return urlOk(d.badge_verificado_url) ? img(d.badge_verificado_url, 'Verificado', '') : `<span class="selo" title="Verificado">${ICO.check}</span>`;
      return '';
    }

    _htmlCanal(c, encerrada) {
      const cat = this._cat(c.categoria), g = this._grupo(c.grupo);
      const capa = urlOk(c.capa) || urlOk(c.foto), capaRaw = urlOk(c.capa_raw) || urlOk(c.foto_raw);
      const foto = urlOk(c.foto), fotoRaw = urlOk(c.foto_raw);
      const link = urlOk(c.link);
      const stream = !encerrada && this._pvPermitido() ? urlOk(c.stream) : '';
      let dur = '';
      if (c.inicio && !encerrada) {
        const min = Math.max(0, Math.floor((Date.now() - c.inicio) / 60000));
        if (min < 24 * 60) dur = min >= 60 ? `${Math.floor(min / 60)}h ${min % 60}min` : `${min}min`;
      }
      const rotulo = cat ? `${esc(g ? g.nome : '')}${g ? ' · ' : ''}${esc(cat.nome)}` : (g ? esc(g.nome) : '');
      return `<article class="canal ${encerrada ? 'fim' : ''}">
        <div class="thumb"${stream ? ` data-id="${esc(c.id)}" data-stream="${esc(stream)}"` : ''}>
          ${capa ? `<img class="fundo" src="${esc(capa)}" alt="" aria-hidden="true" loading="lazy" decoding="async"><img class="capa" src="${esc(capa)}" data-raw="${esc(capaRaw)}" alt="" loading="lazy" decoding="async">` : ''}
          ${encerrada ? '<span class="selo-live fim">ENCERRADA</span>' : '<span class="selo-live">AO VIVO</span>'}
          ${dur ? `<span class="dur">${dur}</span>` : ''}
          ${encerrada ? '' : `<span class="esp-n">${ICO.olho}${c.espectadores == null ? '—' : fmtCurto(c.espectadores)}</span>`}
        </div>
        <div class="corpo-c">
          <span class="av">${foto ? `<img src="${esc(foto)}" data-raw="${esc(fotoRaw)}" alt="" width="40" height="40" loading="lazy" decoding="async">` : ''}<span>${esc((c.nome || '?').trim().charAt(0).toUpperCase())}</span></span>
          <div class="info">
            <div class="nome"><span>${esc(c.nome)}</span>${this._selo(c)}</div>
            <div class="rot ${rotulo ? '' : 'sem'}">${rotulo || 'Sem categoria'}</div>
            ${encerrada
              ? '<span class="btn-ver off">Live encerrada</span>'
              : link
                ? `<a class="btn-ver" href="${esc(link)}" target="_blank" rel="noopener noreferrer">${ICO.play}Assistir live</a>`
                : '<span class="btn-ver off" title="O Kwai não informou o link desta live">Link indisponível</span>'}
          </div>
        </div>
      </article>`;
    }

    // ── Estilo (tokens --dm-* do global.css; trocam sozinhos com o tema) ───────
    _css() {
      return `
      :host{--lv-live:#ef4444;--lv-w:min(1040px,100vw);--lv-topo:0px;font-family:var(--dm-font-body,'Exo 2',sans-serif)}
      [hidden]{display:none!important}
      button{font:inherit;color:inherit;background:none;border:0;cursor:pointer;padding:0}
      svg{display:block;flex-shrink:0}
      .sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}

      /* Aba lateral — mesmo molde do botão REGRAS do ranking */
      .tab{position:fixed;right:0;top:46%;z-index:1045;display:flex;align-items:center;gap:8px;writing-mode:vertical-lr;
        padding:18px 9px;border-radius:12px 0 0 12px;background:var(--dm-grad-effect,linear-gradient(135deg,#3b82f6,#00d4d4));color:#fff;
        font-family:var(--dm-font-title,'Rajdhani',sans-serif);font-weight:700;font-size:.72rem;letter-spacing:3px;line-height:1;
        box-shadow:-4px 0 22px var(--dm-effect-glow,rgba(59,130,246,.28));transition:right .38s cubic-bezier(.4,0,.2,1),left .38s cubic-bezier(.4,0,.2,1),background .2s;-webkit-tap-highlight-color:transparent}
      .tab .dot{width:7px;height:7px;border-radius:50%;background:#fff;animation:pulso 1.8s infinite}
      .tab .n{writing-mode:horizontal-tb;font-size:.62rem;letter-spacing:0;background:rgba(0,0,0,.28);border-radius:999px;padding:2px 6px}
      .tab .chev{display:none;transform:rotate(90deg)}
      @keyframes pulso{0%{box-shadow:0 0 0 0 rgba(255,255,255,.7)}70%,100%{box-shadow:0 0 0 7px rgba(255,255,255,0)}}
      @media(prefers-reduced-motion:reduce){.tab .dot{animation:none}.painel,.ovl,.tab{transition:none!important}}
      :host([data-aberto]) .tab{background:var(--dm-bg-panel);color:var(--dm-cyan);border:1px solid var(--dm-border);border-right:0;box-shadow:-4px 0 18px var(--dm-shadow-sm,rgba(0,0,0,.3))}
      :host([data-aberto]) .tab .dot,:host([data-aberto]) .tab .n{display:none}
      :host([data-aberto]) .tab .chev{display:block}
      @media(min-width:1041px){:host([data-aberto]) .tab{right:var(--lv-w)}}
      @media(max-width:1040px){:host([data-aberto]) .tab{right:auto;left:0;border-radius:0 12px 12px 0;border:1px solid var(--dm-border);border-left:0}}

      .ovl{position:fixed;inset:0;z-index:1035;background:var(--dm-overlay,rgba(0,0,0,.75));opacity:0;visibility:hidden;transition:opacity .3s,visibility .3s}
      :host([data-aberto]) .ovl{opacity:.75;visibility:visible}
      .painel:focus{outline:none}
      .painel{position:fixed;top:var(--lv-topo);right:0;bottom:0;width:var(--lv-w);z-index:1040;background:var(--dm-bg-panel);color:var(--dm-text);
        border-left:1px solid var(--dm-border);box-shadow:-10px 0 40px var(--dm-shadow-md,rgba(0,0,0,.45));transform:translateX(100%);
        transition:transform .38s cubic-bezier(.4,0,.2,1);overflow-y:auto;overflow-x:hidden;overscroll-behavior:contain;-webkit-overflow-scrolling:touch}
      :host([data-aberto]) .painel{transform:none}
      .in{padding:22px 26px 90px}
      @media(max-width:1040px){
        .in{padding:14px 16px 80px}
        .voltar{display:inline-flex}
        :host([data-aberto]) .tab{display:none} /* o Voltar fica no topo do painel (a aba lateral sobrava e deixava a tela vazia) */
      }

      .topo{display:flex;align-items:center;gap:14px;margin-bottom:14px}
      .cab{min-width:0}
      .voltar{display:inline-flex;align-items:center;gap:4px;flex-shrink:0;min-height:44px;padding:0 16px 0 10px;border-radius:999px;border:1px solid var(--dm-border);
        background:var(--dm-bg-card);color:var(--dm-cyan);font-family:var(--dm-font-title,'Rajdhani',sans-serif);font-weight:700;font-size:.95rem;-webkit-tap-highlight-color:transparent}
      @media(min-width:1041px){.voltar{display:none}} /* no computador o VOLTAR é a aba ao lado do painel */
      .cab h1{margin:0;font-family:var(--dm-font-title,'Rajdhani',sans-serif);font-weight:700;font-size:1.9rem;letter-spacing:1px;line-height:1;color:var(--dm-text)}
      .cab p{margin:4px 0 0;color:var(--dm-text-sub);font-size:.86rem;line-height:1.35}

      .busca{display:flex;align-items:center;gap:10px;height:46px;padding:0 16px;border-radius:999px;background:var(--dm-bg-card);border:1px solid var(--dm-border);color:var(--dm-text-muted);margin-bottom:12px}
      .busca:focus-within{border-color:var(--dm-cyan)}
      .busca input{flex:1;min-width:0;background:none;border:0;outline:0;color:var(--dm-text);font:inherit;font-size:16px}
      .busca input::placeholder{color:var(--dm-text-muted)}

      .abas{display:flex;align-items:center;gap:2px;border-bottom:1px solid var(--dm-border-dim);margin-bottom:14px;white-space:nowrap;overflow-x:auto;scrollbar-width:none}
      .abas::-webkit-scrollbar{display:none}
      .abas [data-aba],.abas [disabled]{flex-shrink:0;position:relative;padding:12px 12px;font-family:var(--dm-font-title,'Rajdhani',sans-serif);font-weight:700;font-size:1rem;letter-spacing:.4px;color:var(--dm-text-muted)}
      .abas .on{color:var(--dm-text)}
      .abas .on::after{content:'';position:absolute;left:10px;right:10px;bottom:-1px;height:3px;border-radius:3px;background:var(--dm-grad-effect,linear-gradient(90deg,#3b82f6,#00d4d4))}
      .abas [disabled]{cursor:default;opacity:.55}
      .breve{font-family:var(--dm-font-body,'Exo 2',sans-serif);font-weight:600;font-size:.58rem;letter-spacing:.4px;border:1px solid var(--dm-border);border-radius:999px;padding:1px 6px;margin-left:5px;vertical-align:2px}
      .abas .esp{flex:1}
      .ordem select{background:var(--dm-bg-card);color:var(--dm-text-sub);border:1px solid var(--dm-border);border-radius:10px;padding:6px 8px;font:inherit;font-size:.8rem}
      .ordem option{background:var(--dm-bg-2,#1a1a2e);color:var(--dm-text)}
      @media(max-width:600px){.abas [data-aba],.abas [disabled]{padding:12px 9px;font-size:.95rem}}

      .stats{display:flex;flex-wrap:wrap;align-items:center;gap:6px 16px;font-size:.8rem;color:var(--dm-text-sub);margin-bottom:12px;min-height:20px}
      .stats b{color:var(--dm-text);font-weight:600}
      .stats > span{display:inline-flex;align-items:center;gap:5px}
      i.vivo{display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--lv-live);flex-shrink:0}
      .atu{margin-left:auto;color:var(--dm-text-muted);font-size:.72rem}
      .parcial{width:100%;color:var(--dm-gold);font-size:.74rem}
      .dica{position:relative;color:var(--dm-text-muted);display:inline-flex}
      .tip{position:absolute;bottom:135%;right:-70px;width:min(240px,70vw);padding:8px 10px;border-radius:8px;background:var(--dm-bg-panel);border:1px solid var(--dm-border);
        color:var(--dm-text-sub);font-size:.72rem;line-height:1.4;text-align:left;opacity:0;visibility:hidden;transition:.2s;z-index:3;box-shadow:0 8px 24px var(--dm-shadow-md,rgba(0,0,0,.45))}
      .dica:hover .tip,.dica:focus .tip,.dica:focus-within .tip{opacity:1;visibility:visible}

      .chips{display:flex;gap:8px;margin-bottom:16px;overflow-x:auto;scrollbar-width:none}
      .chips::-webkit-scrollbar{display:none}
      .chips button{flex-shrink:0;display:flex;align-items:center;gap:7px;padding:8px 15px;border-radius:999px;border:1px solid var(--dm-border);background:var(--dm-bg-card);font-size:.84rem;color:var(--dm-text-sub)}
      .chips button.on{background:var(--dm-grad-effect,linear-gradient(135deg,#3b82f6,#00d4d4));border-color:transparent;color:#fff;font-weight:600}
      .chips small{font-size:.7rem;opacity:.85}

      /* Categorias — capa 3:4; 3 colunas no celular, mais largas no computador */
      .cats{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:18px 14px;margin-bottom:26px}
      @media(max-width:600px){.cats{grid-template-columns:repeat(3,minmax(0,1fr));gap:14px 10px}}
      .cat{display:flex;flex-direction:column;align-items:flex-start;text-align:left;min-width:0}
      .cat-capa{position:relative;display:block;width:100%;aspect-ratio:3/4;border-radius:10px;overflow:hidden;background:var(--dm-bg-card);border:1px solid var(--dm-border-dim);transition:transform .2s,border-color .2s}
      .cat:hover .cat-capa,.cat:focus-visible .cat-capa{transform:translateY(-3px);border-color:var(--dm-cyan)}
      .cat-capa img{width:100%;height:100%;object-fit:cover;display:block}
      .cat.zero .cat-capa{opacity:.55}
      .sem-capa{position:absolute;inset:0;display:flex;align-items:flex-end;padding:10px;background:var(--dm-grad-effect,linear-gradient(135deg,#3b82f6,#00d4d4));color:#fff;
        font-family:var(--dm-font-title,'Rajdhani',sans-serif);font-weight:700;font-size:1.15rem;line-height:1.05;text-shadow:0 2px 8px rgba(0,0,0,.35);overflow-wrap:anywhere}
      .cat-nome{margin-top:7px;max-width:100%;font-family:var(--dm-font-title,'Rajdhani',sans-serif);font-weight:700;font-size:1rem;color:var(--dm-text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .cat-meta{display:flex;align-items:center;gap:5px;max-width:100%;font-size:.74rem;color:var(--dm-text-sub);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .cat-meta.off{color:var(--dm-text-muted)}
      .cat-meta.off i.vivo{background:var(--dm-text-dim)}
      .tag{margin-top:6px;font-size:.66rem;padding:2px 8px;border-radius:999px;background:var(--dm-bg-card);color:var(--dm-text-muted)}
      @media(max-width:600px){.cat-nome{font-size:.92rem}.cat-meta{font-size:.68rem}.tag{display:none}}

      .sec{display:flex;align-items:center;gap:8px;margin:4px 0 12px;font-family:var(--dm-font-title,'Rajdhani',sans-serif);font-weight:700;font-size:1.25rem;color:var(--dm-text)}
      .sec svg{color:var(--dm-gold)}
      .ver{margin-left:auto;display:flex;align-items:center;gap:2px;font-family:var(--dm-font-body,'Exo 2',sans-serif);font-weight:600;font-size:.8rem;color:var(--dm-cyan)}
      .trilha{display:flex;align-items:center;gap:8px;margin-bottom:12px;font-size:.86rem;color:var(--dm-text-sub)}
      .trilha button{display:flex;align-items:center;gap:3px;color:var(--dm-cyan);font-weight:600}

      /* Canais */
      .canais{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:20px 16px}
      @media(max-width:600px){.canais{grid-template-columns:minmax(0,1fr)}}
      .canal{min-width:0}
      .canal.fim{opacity:.55}
      .thumb{position:relative;aspect-ratio:16/9;border-radius:12px;overflow:hidden;background:var(--dm-bg-4,#111827);border:1px solid var(--dm-border-dim)}
      .thumb img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block}
      .thumb img.fundo{filter:blur(18px) brightness(.6);transform:scale(1.15)}
      .thumb img.capa.vert{object-fit:contain}
      .thumb img.falhou{display:none}
      .thumb video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0;transition:opacity .3s;z-index:1;pointer-events:none}
      .thumb video.vert{object-fit:contain}
      .thumb.tocando video{opacity:1}
      .selo-live,.dur,.esp-n{z-index:2}
      .selo-live{position:absolute;top:8px;left:8px;background:var(--lv-live);color:#fff;font-family:var(--dm-font-title,'Rajdhani',sans-serif);font-weight:700;font-size:.74rem;letter-spacing:1px;padding:2px 7px;border-radius:5px}
      .selo-live.fim{background:rgba(0,0,0,.7)}
      .dur{position:absolute;top:8px;right:8px;background:rgba(0,0,0,.62);color:#fff;font-size:.7rem;padding:2px 6px;border-radius:5px}
      .esp-n{position:absolute;bottom:8px;left:8px;display:flex;align-items:center;gap:5px;background:rgba(0,0,0,.65);color:#fff;font-size:.74rem;padding:3px 8px;border-radius:6px}
      .corpo-c{display:flex;gap:10px;margin-top:10px}
      .av{position:relative;width:40px;height:40px;border-radius:50%;flex-shrink:0;overflow:hidden;display:grid;place-items:center;border:2px solid var(--dm-cyan);
        background:var(--dm-grad-effect,linear-gradient(135deg,#3b82f6,#00d4d4));color:#fff;font-family:var(--dm-font-title,'Rajdhani',sans-serif);font-weight:700}
      .av img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
      .av img.falhou{display:none}
      .info{min-width:0;flex:1}
      .nome{display:flex;align-items:center;gap:5px;font-weight:600;font-size:.96rem;color:var(--dm-text)}
      .nome > span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .selo{display:inline-flex;align-items:center;justify-content:center;width:15px;height:15px;flex:0 0 15px;border-radius:50%;background:linear-gradient(135deg,#29b6f6,#00e5ff);object-fit:cover}
      .selo.premium{background:linear-gradient(135deg,#ffd600,#ff5722)}
      img.selo{background:none}
      .rot{font-size:.8rem;color:var(--dm-text-sub);margin-top:2px}
      .rot.sem{color:var(--dm-text-muted);font-style:italic}
      .btn-ver{display:inline-flex;align-items:center;gap:6px;margin-top:9px;padding:8px 14px;border-radius:10px;background:var(--dm-grad-effect,linear-gradient(135deg,#3b82f6,#00d4d4));
        color:#000;font-weight:700;font-size:.82rem;text-decoration:none;font-family:var(--dm-font-title,'Rajdhani',sans-serif);letter-spacing:.3px}
      .btn-ver:hover{filter:brightness(1.08)}
      .btn-ver.off{background:var(--dm-bg-card);color:var(--dm-text-muted);border:1px solid var(--dm-border);cursor:default;filter:none}

      .estado{display:flex;flex-direction:column;align-items:center;gap:4px;border:1px dashed var(--dm-border);border-radius:var(--dm-radius-lg,20px);padding:28px 18px;margin-bottom:22px;text-align:center;color:var(--dm-text-sub);font-size:.88rem}
      .estado svg{margin-bottom:8px;color:var(--dm-text-muted)}
      .estado.aviso svg{color:var(--dm-gold)}
      .estado b{color:var(--dm-text);font-family:var(--dm-font-title,'Rajdhani',sans-serif);font-weight:700;font-size:1.1rem}
      .btn-sec{margin-top:12px;padding:8px 16px;border-radius:10px;border:1px solid var(--dm-border);color:var(--dm-cyan);font-weight:600}
      .nada{color:var(--dm-text-muted);font-size:.86rem;margin:0 0 20px}
      `;
    }
  }

  customElements.define('dmaior-lives', DmaiorLives);
})();
