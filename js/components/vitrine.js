/**
 * vitrine.js — Loja de produtos de afiliado (Shopee, Mercado Livre, Amazon) — DMaior Agency
 *
 * <dmaior-vitrine> tem dois jeitos de aparecer:
 *  1) Na home (index.html): aba fina "LOJA" encostada na direita, logo abaixo da aba LIVES.
 *     Ao tocar, abre o painel lateral (celular: tela cheia abaixo do menu; computador: painel
 *     largo) e a aba vira "VOLTAR". O botão voltar do Android / Esc fecham (abre com #loja no
 *     histórico). Some se o admin desligar o "botão lateral".
 *  2) <dmaior-vitrine modo="pagina"> (loja.html): a loja inteira numa página, sem aba nem painel.
 *     É pra onde vai o item "Loja" do menu (menu-mobile.js).
 *
 * Dados: Worker rank GET /vitrine (window.DmaiorAPI.rank.getVitrine). Os produtos são
 * cadastrados/atualizados no admin (aba "Vitrine"). Desligado no admin = nada aparece.
 * Nichos (Beleza, Moda feminina...) e subcategorias (Cuidados masculinos...) vêm dos produtos.
 * Clicar no produto abre o link de AFILIADO cadastrado (nova aba; no celular abre o app da loja).
 * Nunca reescrevemos o link: a comissão só conta por ele.
 *
 * Também avisa o menu (evento dmaior:vitrine + localStorage dm_vitrine_cfg) de quais itens "Loja" mostrar.
 * Sem <video> aqui: o navegador da Xiaomi não tem o que sequestrar.
 */
(function () {
  if (customElements.get('dmaior-vitrine')) return;

  const ICO = {
    busca: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7.5"/><path d="m20.5 20.5-4.2-4.2"/></svg>',
    seta:  '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>',
    // Sacola de loja (genérica): é o ícone da LOJA. O logo de cada marketplace só aparece dentro do produto.
    sacolaG: '<svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>',
    fora:  '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17 17 7"/><path d="M8 7h9v9"/></svg>',
    estrela: '<svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>',
    info:  '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9.5"/><path d="M12 16v-4.5M12 8h.01"/></svg>',
    raio:  '<svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/></svg>',
    queda: '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M16 17h6v-6"/><path d="m22 17-8.5-8.5-5 5L2 7"/></svg>',
    tag:   '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12.6 2.6A2 2 0 0 0 11.2 2H4a2 2 0 0 0-2 2v7.2a2 2 0 0 0 .6 1.4l8.7 8.7a2.4 2.4 0 0 0 3.4 0l6.6-6.6a2.4 2.4 0 0 0 0-3.4z"/><circle cx="7.5" cy="7.5" r=".5" fill="currentColor"/></svg>',
  };

  // Etiqueta de cada loja no canto da foto. Shopee: logo redesenhado em SVG (mesmo de assets/icons/shopee.svg).
  // Mercado Livre e Amazon: só o nome por enquanto (entra o logo quando o dono mandar o arquivo).
  const MKT = {
    shopee: {
      nome: 'Shopee',
      logo: '<svg viewBox="205 88 455 500" width="13" height="14" aria-hidden="true"><path d="M341 222V213C341 140 385 111 432 111S523 140 523 213V222" fill="none" stroke="#EE4D2D" stroke-width="28"/><path d="M224 213H640Q646 213 645 222L630 540Q628 578 590 578H275Q236 578 233 540L218 222Q217 213 224 213Z" fill="#EE4D2D"/><path d="M489 306C470 292 451 284 432 284C395 284 368 308 368 338C368 368 392 381 432 395C474 410 498 424 498 452C498 484 470 504 434 504C405 504 380 492 360 474" fill="none" stroke="#fff" stroke-width="27" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    },
    mercadolivre: { nome: 'Mercado Livre', logo: '' },
    amazon: { nome: 'Amazon', logo: '' },
  };
  const mkt = (id) => MKT[id] || MKT.shopee;

  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const urlOk = (u) => (typeof u === 'string' && /^https:\/\/[^\s"'<>]+$/.test(u) ? u : '');
  const semAcento = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const brl = (n) => 'R$ ' + Number(n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  // Mesmo jeito da Shopee: abaixo de mil mostra o número; acima, arredonda pra baixo ("9mil+", "100mil+")
  const vendidosTxt = (n) => {
    if (n == null || !(n > 0)) return '';
    if (n < 1000) return `${n} vendido${n === 1 ? '' : 's'}`;
    const base = n < 10000 ? 1000 : n < 100000 ? 10000 : 100000;
    return `${Math.floor(n / base) * base / 1000}mil+ vendidos`;
  };

  class DmaiorVitrine extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      this.d = null;
      this.recebidoEm = 0;
      this.aberto = false;
      this.carregando = true;
      this.st = { cat: 'todas', sub: 'todas', q: '', ordem: 'dest' };
      this._t = null;
      this._onPop = () => this._sync();
      this._onKey = (e) => { if (e.key === 'Escape' && this.aberto) this.fechar(); };
      // Menu ☰ aberto: a aba LOJA da borda não pode ficar por cima dele
      this._onMenu = (e) => this.toggleAttribute('data-menu', !!(e.detail && e.detail.aberto));
      this._obsLives = null;
    }

    get _pagina() { return this.getAttribute('modo') === 'pagina'; }

    connectedCallback() {
      this.shadowRoot.innerHTML = `<style>${this._css()}</style>
        <button class="tab" id="tab" type="button" aria-expanded="false" aria-controls="painel" hidden>
          <span id="tabTxt">LOJA</span><span class="chev" aria-hidden="true">${ICO.seta}</span>
        </button>
        <div class="ovl" id="ovl"></div>
        <section class="painel" id="painel" role="${this._pagina ? 'region' : 'dialog'}" ${this._pagina ? '' : 'aria-modal="true"'} aria-label="Loja" tabindex="-1" hidden></section>`;
      const r = this.shadowRoot;
      r.getElementById('tab').addEventListener('click', () => (this.aberto ? this.fechar() : this.abrir()));
      r.getElementById('ovl').addEventListener('click', () => this.fechar());
      // Foto que falhar no proxy (weserv) tenta a original; se falhar também, mostra o fundo
      r.addEventListener('error', (e) => {
        const im = e.target;
        if (!(im instanceof HTMLImageElement)) return;
        const raw = im.dataset.raw;
        if (raw && im.src !== raw) { im.dataset.raw = ''; im.src = raw; return; }
        im.classList.add('falhou');
      }, true);

      if (this._pagina) {
        // Página inteira: sem aba, sem painel deslizante — só o conteúdo
        const p = r.getElementById('painel');
        p.hidden = false; this.aberto = true;
        this._render();
        this._buscar();
        return;
      }

      window.addEventListener('popstate', this._onPop);
      window.addEventListener('dmaior:menu', this._onMenu);
      document.addEventListener('keydown', this._onKey);
      // A aba LIVES (outro componente) tem o painel dela: enquanto aberto, esconde a LOJA pra não ficar por cima
      const lives = document.querySelector('dmaior-lives');
      if (lives && window.MutationObserver) {
        this._obsLives = new MutationObserver(() => this._ajustaAba());
        this._obsLives.observe(lives, { attributes: true, attributeFilter: ['data-aberto'] });
      }
      // Primeira busca depois que a página assentou (não disputa com o carregamento da home)
      const ini = () => setTimeout(() => this._buscar().then(() => this._sync()), 1500);
      if (document.readyState === 'complete') ini(); else window.addEventListener('load', ini, { once: true });
    }

    disconnectedCallback() {
      window.removeEventListener('popstate', this._onPop);
      window.removeEventListener('dmaior:menu', this._onMenu);
      document.removeEventListener('keydown', this._onKey);
      if (this._obsLives) this._obsLives.disconnect();
      clearTimeout(this._t);
      this._travarRolagem(false);
      if (this.aberto && !this._pagina) this._avisaMidia(false);
    }

    // Painel aberto por cima da home: avisa quem toca vídeo/live no fundo (live-widget,
    // carrossel de banners) pra pausar enquanto ele estiver aberto, e retomar ao fechar.
    _avisaMidia(pausar) {
      try { window.dispatchEvent(new CustomEvent('dmaior:midia-pausa', { detail: { pausar: !!pausar, motivo: 'loja' } })); } catch (_) {}
    }

    // ── Dados ────────────────────────────────────────────────────────────────
    async _buscar() {
      clearTimeout(this._t);
      let d = null;
      try { d = await window.DmaiorAPI.rank.getVitrine(); } catch (_) { d = null; }
      this.carregando = false;
      if (d && Array.isArray(d.produtos) && d.ativo !== false) {
        this.d = d; this.recebidoEm = Date.now();
        // O nicho/subcategoria escolhidos podem ter sumido (produto pausado): volta pra "Todos"
        const nicho = (d.categorias || []).find((c) => c.nome === this.st.cat);
        if (this.st.cat !== 'todas' && !nicho) { this.st.cat = 'todas'; this.st.sub = 'todas'; }
        else if (this.st.sub !== 'todas' && !(nicho.subs || []).some((s) => s.nome === this.st.sub)) this.st.sub = 'todas';
        this._avisaMenu(d);
        this._mostrarAba(d.produtos.length > 0 && d.botao_lateral !== false);
        this._temLoja = d.produtos.length > 0;
        if (this.aberto || this._pagina) this._renderCorpo();
      } else if (d && d.ativo === false) {
        this.d = null; this._temLoja = false;
        this._avisaMenu(d); this._mostrarAba(false); // desligado no admin
        if (this._pagina) this._renderCorpo();
      } else {
        // Sem resposta: mantém o que já tinha; se nunca carregou, sem aba
        if (!this.d) this._mostrarAba(false);
        if (this._pagina) this._renderCorpo();
      }
      // Confere de tempos em tempos (se o admin ligar/pausar, reflete sem recarregar a página)
      if (!document.hidden) this._t = setTimeout(() => this._buscar(), this.aberto ? 60000 : 300000);
    }

    // Avisa o menu do topo quais itens "Loja" mostrar (as outras páginas leem do localStorage)
    _avisaMenu(d) {
      const cfg = { ativo: d.ativo !== false && (d.produtos || []).length > 0, menu_desktop: d.menu_desktop !== false, menu_mobile: d.menu_mobile === true };
      cfg.menu_desktop = cfg.ativo && cfg.menu_desktop; cfg.menu_mobile = cfg.ativo && cfg.menu_mobile;
      try { localStorage.setItem('dm_vitrine_cfg', JSON.stringify({ ...cfg, t: Date.now() })); } catch (_) {}
      try { window.dispatchEvent(new CustomEvent('dmaior:vitrine', { detail: cfg })); } catch (_) {}
    }

    _mostrarAba(on) {
      this._temAba = on;
      this._ajustaAba();
      if (!on && this.aberto && !this._pagina) this.fechar();
    }

    _ajustaAba() {
      const tab = this.shadowRoot.getElementById('tab');
      const livesAberto = !!document.querySelector('dmaior-lives[data-aberto]');
      tab.hidden = this._pagina || !this._temAba || livesAberto;
    }

    // ── Abrir / voltar (só no modo painel lateral) ───────────────────────────
    abrir() {
      if (this._pagina || this.aberto) return;
      if (location.hash !== '#loja') {
        try { history.pushState({ dmLoja: true }, '', location.pathname + location.search + '#loja'); } catch (_) {}
      }
      this._sync(true);
    }

    fechar() {
      if (this._pagina || !this.aberto) return;
      // Se abrimos empurrando o histórico, voltar desfaz (o popstate fecha). Senão fecha direto.
      if (history.state && history.state.dmLoja) { history.back(); return; }
      if (location.hash === '#loja') {
        try { history.replaceState(history.state, '', location.pathname + location.search); } catch (_) {}
      }
      this._sync(false);
    }

    _sync(forcar) {
      if (this._pagina) return;
      const tab = this.shadowRoot.getElementById('tab');
      const querAberto = forcar === undefined ? (location.hash === '#loja' && !!this._temLoja) : forcar;
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
        if (Date.now() - this.recebidoEm > 60000) this._buscar();
      } else {
        this.removeAttribute('data-aberto');
        this._travarRolagem(false);
        r.getElementById('tabTxt').textContent = 'LOJA';
        tab.setAttribute('aria-expanded', 'false');
        tab.removeAttribute('aria-label');
        if (this.shadowRoot.activeElement && painel.contains(this.shadowRoot.activeElement)) { try { tab.focus({ preventScroll: true }); } catch (_) {} }
        setTimeout(() => { if (!this.aberto) painel.hidden = true; }, 400);
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
      this.style.setProperty('--vt-topo', topo + 'px');
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
            <div class="cab"><h1>LOJA</h1><p>Produtos escolhidos pela DMaior, direto nas lojas parceiras.</p></div>
          </header>
          <label class="busca">${ICO.busca}<input id="q" type="search" placeholder="Buscar produto" autocomplete="off" enterkeyhint="search" aria-label="Buscar produto"></label>
          <div class="barra">
            <div class="chips" id="chips"></div>
            <label class="ordem"><span class="sr">Ordenar</span><select id="ordem">
              <option value="dest">Destaques</option><option value="vend">Mais vendidos</option><option value="menor">Menor preço</option>
              <option value="maior">Maior preço</option><option value="desc">Maiores descontos</option>
            </select></label>
          </div>
          <div class="chips sub" id="subs"></div>
          <div id="corpo"></div>
          <p class="aviso">${ICO.info}<span>Links de afiliado: se você comprar por eles, a DMaior pode receber uma comissão, sem custo extra pra você. A compra é feita na loja parceira (Shopee, Mercado Livre ou Amazon); preço, estoque e entrega são dela e podem mudar.</span></p>
        </div>`;
        p.querySelector('#voltar').addEventListener('click', () => this.fechar());
        p.querySelector('#q').addEventListener('input', (e) => { this.st.q = e.target.value.trim(); this._renderCorpo(); });
        p.querySelector('#ordem').addEventListener('change', (e) => { this.st.ordem = e.target.value; this._renderCorpo(); });
        p.querySelector('#chips').addEventListener('click', (e) => {
          const b = e.target.closest('[data-cat]');
          if (!b) return;
          this.st.cat = b.dataset.cat; this.st.sub = 'todas';
          this._renderCorpo();
        });
        p.querySelector('#subs').addEventListener('click', (e) => {
          const b = e.target.closest('[data-sub]');
          if (!b) return;
          this.st.sub = b.dataset.sub;
          this._renderCorpo();
        });
      }
      this._renderCorpo();
    }

    _filtrar() {
      const st = this.st;
      let l = (this.d && this.d.produtos || []).slice();
      if (st.cat !== 'todas') l = l.filter((p) => p.categoria === st.cat);
      if (st.sub !== 'todas') l = l.filter((p) => p.subcategoria === st.sub);
      if (st.q) {
        const q = semAcento(st.q);
        l = l.filter((p) => semAcento(p.titulo).includes(q) || semAcento(p.loja).includes(q) || semAcento(p.categoria).includes(q) || semAcento(p.subcategoria).includes(q) || semAcento(mkt(p.marketplace).nome).includes(q));
      }
      const ord = {
        dest:  null, // ordem do admin (já vem ordenada)
        vend:  (a, b) => (b.vendidos || 0) - (a.vendidos || 0),
        menor: (a, b) => a.preco - b.preco,
        maior: (a, b) => b.preco - a.preco,
        desc:  (a, b) => (b.desconto || 0) - (a.desconto || 0),
      }[st.ordem];
      // Esgotados sempre por último (a ordem escolhida vale dentro de cada grupo)
      if (ord) l.sort(ord);
      return l.sort((a, b) => (a.esgotado ? 1 : 0) - (b.esgotado ? 1 : 0));
    }

    _renderCorpo() {
      const r = this.shadowRoot, d = this.d || {}, st = this.st;
      const corpo = r.getElementById('corpo');
      if (!corpo) return;
      const todos = d.produtos || [];
      const nichos = d.categorias || [];
      r.getElementById('chips').innerHTML = nichos.length > 1
        ? `<button type="button" data-cat="todas" class="${st.cat === 'todas' ? 'on' : ''}">Todos <small>${todos.length}</small></button>`
          + nichos.map((c) => `<button type="button" data-cat="${esc(c.nome)}" class="${st.cat === c.nome ? 'on' : ''}">${esc(c.nome)} <small>${c.total}</small></button>`).join('')
        : '';
      // Subcategorias do nicho escolhido (só aparece se ele tiver alguma)
      const nicho = nichos.find((c) => c.nome === st.cat);
      const subs = nicho && nicho.subs || [];
      r.getElementById('subs').innerHTML = subs.length
        ? `<button type="button" data-sub="todas" class="${st.sub === 'todas' ? 'on' : ''}">Tudo em ${esc(nicho.nome)} <small>${nicho.total}</small></button>`
          + subs.map((s) => `<button type="button" data-sub="${esc(s.nome)}" class="${st.sub === s.nome ? 'on' : ''}">${esc(s.nome)} <small>${s.total}</small></button>`).join('')
        : '';
      if (this.carregando && !todos.length) {
        corpo.innerHTML = `<div class="estado">${ICO.sacolaG}<b>Carregando a loja…</b></div>`;
        return;
      }
      if (!todos.length) {
        corpo.innerHTML = `<div class="estado">${ICO.sacolaG}<b>${this._pagina ? 'A loja está fechada por enquanto' : 'Nenhum produto por enquanto'}</b>Volte daqui a pouco.</div>`;
        return;
      }
      const lista = this._filtrar();
      if (!lista.length) {
        corpo.innerHTML = `<div class="estado">${ICO.busca}<b>Nada encontrado</b>Tente outra palavra ou outra categoria.</div>`;
        return;
      }
      corpo.innerHTML = `<div class="grid">${lista.map((p) => this._card(p)).join('')}</div>`;
    }

    _card(p) {
      const link = urlOk(p.link);
      if (!link) return '';
      const img = urlOk(p.imagem), raw = urlOk(p.imagem_raw);
      const m = mkt(p.marketplace);
      const vend = vendidosTxt(p.vendidos);
      // Selo no canto da foto (só um): relâmpago > preço caiu > promoção
      const selo = /rel[aâ]mpago|flash/i.test(p.promocao || '') ? `<span class="sel rel">${ICO.raio}Relâmpago</span>`
        : p.preco_caiu ? `<span class="sel caiu">${ICO.queda}Preço caiu</span>`
        : p.promocao ? `<span class="sel promo">${ICO.tag}${esc(p.promocao)}</span>` : '';
      const meta = [p.nota != null ? `<span class="nota">${ICO.estrela}${Number(p.nota).toFixed(1).replace('.', ',')}</span>` : '', vend ? `<span>${esc(vend)}</span>` : ''].filter(Boolean).join('');
      return `<a class="card ${p.esgotado ? 'esg' : ''}" href="${esc(link)}" target="_blank" rel="sponsored noopener noreferrer" aria-label="${esc(p.titulo)}${p.esgotado ? ' (esgotado)' : ''} — abrir na ${esc(m.nome)}">
        <span class="foto">
          ${(img || raw) ? `<img src="${esc(img || raw)}" ${img && raw ? `data-raw="${esc(raw)}"` : ''} alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer">` : ''}
          ${p.desconto > 0 ? `<span class="desc">-${p.desconto}%</span>` : ''}
          ${selo}
          <span class="mk ${esc(p.marketplace || 'shopee')}" title="Vendido por ${esc(m.nome)}">${m.logo}${esc(m.nome)}</span>
          ${p.esgotado ? '<span class="esgotado"><b>Esgotado</b></span>' : ''}
        </span>
        <span class="corpo-c">
          <span class="tit">${p.oficial ? '<i class="of">Oficial</i>' : ''}${esc(p.titulo)}</span>
          ${p.loja ? `<span class="loja">${esc(p.loja)}</span>` : ''}
          <span class="preco"><b>${esc(brl(p.preco))}</b>${p.preco_original ? `<s>${esc(brl(p.preco_original))}</s>` : ''}</span>
          ${meta ? `<span class="meta">${meta}</span>` : ''}
          <span class="cta">Ver na ${esc(m.nome)} ${ICO.fora}</span>
        </span>
      </a>`;
    }

    // ── Estilo (tokens --dm-* do global.css; trocam sozinhos com o tema) ───────
    _css() {
      return `
      :host{--vt-w:min(1040px,100vw);--vt-topo:0px;font-family:var(--dm-font-body,'Exo 2',sans-serif)}
      [hidden]{display:none!important}
      button{font:inherit;color:inherit;background:none;border:0;cursor:pointer;padding:0}
      svg{display:block;flex-shrink:0}
      .sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}

      /* Aba lateral — logo abaixo da aba LIVES (mesmo molde) */
      .tab{position:fixed;right:0;top:calc(46% + 132px);z-index:1051;display:flex;align-items:center;gap:8px;writing-mode:vertical-lr;
        padding:18px 9px;border-radius:12px 0 0 12px;background:var(--dm-grad-effect,linear-gradient(135deg,#3b82f6,#00d4d4));color:#fff;
        font-family:var(--dm-font-title,'Rajdhani',sans-serif);font-weight:700;font-size:.72rem;letter-spacing:3px;line-height:1;
        box-shadow:-4px 0 22px var(--dm-effect-glow,rgba(59,130,246,.28));transition:right .38s cubic-bezier(.4,0,.2,1),left .38s cubic-bezier(.4,0,.2,1),background .2s;-webkit-tap-highlight-color:transparent}
      .tab .chev{display:none;transform:rotate(90deg)}
      :host([data-menu]) .tab{display:none}
      @media(prefers-reduced-motion:reduce){.painel,.ovl,.tab{transition:none!important}}
      :host([data-aberto]) .tab{background:var(--dm-bg-panel);color:var(--dm-cyan);border:1px solid var(--dm-border);border-right:0;box-shadow:-4px 0 18px var(--dm-shadow-sm,rgba(0,0,0,.3))}
      :host([data-aberto]) .tab .chev{display:block}
      @media(min-width:1041px){:host([data-aberto]) .tab{right:var(--vt-w);top:46%}}
      @media(max-width:1040px){:host([data-aberto]) .tab{right:auto;left:0;border-radius:0 12px 12px 0;border:1px solid var(--dm-border);border-left:0}}

      .ovl{position:fixed;inset:0;z-index:1049;background:var(--dm-overlay,rgba(0,0,0,.75));opacity:0;visibility:hidden;transition:opacity .3s,visibility .3s}
      :host([data-aberto]) .ovl{opacity:.75;visibility:visible}
      .painel:focus{outline:none}
      .painel{position:fixed;top:var(--vt-topo);right:0;bottom:0;width:var(--vt-w);z-index:1050;background:var(--dm-bg-panel);color:var(--dm-text);
        border-left:1px solid var(--dm-border);box-shadow:-10px 0 40px var(--dm-shadow-md,rgba(0,0,0,.45));transform:translateX(100%);
        transition:transform .38s cubic-bezier(.4,0,.2,1);overflow-y:auto;overflow-x:hidden;overscroll-behavior:contain;-webkit-overflow-scrolling:touch}
      :host([data-aberto]) .painel{transform:none}
      .in{padding:22px 26px 90px}
      @media(max-width:1040px){
        .in{padding:14px 16px 80px}
        :host([data-aberto]) .tab{display:none} /* o Voltar fica no topo do painel */
      }

      /* Modo página inteira (loja.html): sem aba, sem painel deslizante */
      :host([modo="pagina"]){display:block}
      :host([modo="pagina"]) .tab,:host([modo="pagina"]) .ovl,:host([modo="pagina"]) .voltar{display:none!important}
      :host([modo="pagina"]) .painel{position:static;transform:none;width:auto;max-width:1240px;margin:0 auto;z-index:auto;background:transparent;border:0;box-shadow:none;overflow:visible}
      :host([modo="pagina"]) .in{padding:26px 20px 70px}
      :host([modo="pagina"]) .grid{grid-template-columns:repeat(auto-fill,minmax(210px,1fr))}
      @media(max-width:600px){:host([modo="pagina"]) .in{padding:18px 14px 60px}:host([modo="pagina"]) .grid{grid-template-columns:repeat(2,minmax(0,1fr))}}

      .topo{display:flex;align-items:center;gap:14px;margin-bottom:14px}
      .cab{min-width:0}
      .voltar{display:none;align-items:center;gap:4px;flex-shrink:0;min-height:44px;padding:0 16px 0 10px;border-radius:999px;border:1px solid var(--dm-border);
        background:var(--dm-bg-card);color:var(--dm-cyan);font-family:var(--dm-font-title,'Rajdhani',sans-serif);font-weight:700;font-size:.95rem;-webkit-tap-highlight-color:transparent}
      @media(max-width:1040px){.voltar{display:inline-flex}}
      .cab h1{margin:0;font-family:var(--dm-font-title,'Rajdhani',sans-serif);font-weight:700;font-size:1.9rem;letter-spacing:1px;line-height:1;color:var(--dm-text)}
      .cab p{margin:4px 0 0;color:var(--dm-text-sub);font-size:.86rem;line-height:1.35}

      .busca{display:flex;align-items:center;gap:10px;height:46px;padding:0 16px;border-radius:999px;background:var(--dm-bg-card);border:1px solid var(--dm-border);color:var(--dm-text-muted);margin-bottom:12px}
      .busca:focus-within{border-color:var(--dm-cyan)}
      .busca input{flex:1;min-width:0;background:none;border:0;outline:0;color:var(--dm-text);font:inherit;font-size:16px}
      .busca input::placeholder{color:var(--dm-text-muted)}

      .barra{display:flex;align-items:center;gap:10px;margin-bottom:10px}
      .chips{display:flex;gap:8px;flex:1;min-width:0;overflow-x:auto;scrollbar-width:none}
      .chips::-webkit-scrollbar{display:none}
      .chips button{flex-shrink:0;display:flex;align-items:center;gap:7px;padding:8px 15px;border-radius:999px;border:1px solid var(--dm-border);background:var(--dm-bg-card);font-size:.84rem;color:var(--dm-text-sub)}
      .chips button.on{background:var(--dm-grad-effect,linear-gradient(135deg,#3b82f6,#00d4d4));border-color:transparent;color:#fff;font-weight:600}
      .chips small{font-size:.7rem;opacity:.85}
      /* Subcategorias: segunda linha, mais discreta */
      .chips.sub{flex:none;margin-bottom:16px}
      .chips.sub:empty{display:none}
      .chips.sub button{padding:6px 13px;font-size:.78rem;background:transparent}
      .chips.sub button.on{background:var(--dm-cyan-08,rgba(0,212,212,.12));border-color:var(--dm-cyan);color:var(--dm-cyan);font-weight:600}
      .barra + .chips.sub{margin-top:0}
      .ordem{flex-shrink:0;margin-left:auto}
      .ordem select{background:var(--dm-bg-card);color:var(--dm-text-sub);border:1px solid var(--dm-border);border-radius:10px;padding:7px 8px;font:inherit;font-size:.8rem}
      .ordem option{background:var(--dm-bg-2,#1a1a2e);color:var(--dm-text)}
      @media(max-width:600px){.barra{flex-wrap:wrap;gap:10px}.chips{flex:1 1 100%}.ordem{margin-left:0;width:100%}.ordem select{width:100%;padding:9px 10px}}

      /* Produtos — 2 colunas no celular, mais no computador */
      .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(188px,1fr));gap:16px 14px}
      @media(max-width:600px){.grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:12px 10px}}
      .card{display:flex;flex-direction:column;min-width:0;border-radius:12px;overflow:hidden;background:var(--dm-bg-card);border:1px solid var(--dm-border-dim);
        color:inherit;text-decoration:none;transition:transform .2s,border-color .2s;-webkit-tap-highlight-color:transparent}
      .card:hover,.card:focus-visible{transform:translateY(-3px);border-color:var(--dm-cyan);outline:none}
      /* Cards fora da tela não são pintados nem medidos até chegarem perto (grid com dezenas de produtos) */
      .card{content-visibility:auto;contain-intrinsic-size:auto 340px}
      .foto{position:relative;display:block;aspect-ratio:1;background:var(--dm-bg-4,#111827);overflow:hidden}
      .foto img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block}
      .foto img.falhou{display:none}
      .desc{position:absolute;top:8px;left:8px;background:#ef4444;color:#fff;font-weight:700;font-size:.74rem;padding:2px 7px;border-radius:6px}
      /* Selo de promoção no canto de cima, à direita */
      .sel{position:absolute;top:8px;right:8px;display:inline-flex;align-items:center;gap:4px;font-weight:700;font-size:.68rem;padding:3px 8px 3px 6px;border-radius:999px;box-shadow:0 2px 8px rgba(0,0,0,.3);color:#fff}
      .sel.rel{background:linear-gradient(135deg,#f97316,#facc15);color:#1a1200}
      .sel.caiu{background:#16a34a}
      .sel.promo{background:rgba(17,24,39,.82);color:#fff}
      /* Etiqueta da loja (logo + nome) no canto da foto */
      .mk{position:absolute;left:8px;bottom:8px;display:inline-flex;align-items:center;gap:4px;font-weight:700;font-size:.7rem;letter-spacing:.1px;
        padding:3px 9px 3px 6px;border-radius:999px;box-shadow:0 2px 8px rgba(0,0,0,.3);background:#fff;color:#444}
      .mk.shopee{color:#EE4D2D}
      .mk.mercadolivre{background:#FFE600;color:#2D3277;padding-left:9px}
      .mk.amazon{background:#232F3E;color:#fff;padding-left:9px}
      .esgotado{position:absolute;inset:0;display:grid;place-items:center;background:rgba(0,0,0,.55)}
      .esgotado b{width:78px;height:78px;border-radius:50%;display:grid;place-items:center;background:rgba(40,40,40,.85);color:#fff;font-size:.78rem;font-weight:600;border:2px solid rgba(255,255,255,.7)}
      .card.esg .corpo-c{opacity:.65}
      .corpo-c{display:flex;flex-direction:column;gap:5px;padding:10px 10px 11px;flex:1;min-width:0}
      .tit{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;font-size:.86rem;line-height:1.3;color:var(--dm-text);min-height:2.6em;overflow-wrap:anywhere}
      .of{display:inline-block;font-style:normal;font-weight:700;font-size:.62rem;line-height:1;background:#d0011b;color:#fff;padding:2px 4px;border-radius:3px;margin-right:5px;vertical-align:1px}
      .loja{font-size:.72rem;color:var(--dm-text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .preco{display:flex;align-items:baseline;flex-wrap:wrap;gap:2px 8px;margin-top:2px}
      .preco b{font-family:var(--dm-font-title,'Rajdhani',sans-serif);font-weight:700;font-size:1.3rem;line-height:1.1;color:var(--dm-text)}
      .preco s{font-size:.74rem;color:var(--dm-text-muted)}
      .meta{display:flex;flex-wrap:wrap;align-items:center;gap:2px 10px;font-size:.72rem;color:var(--dm-text-sub)}
      .nota{display:inline-flex;align-items:center;gap:3px;color:var(--dm-gold,#fbbf24)}
      .cta{display:flex;align-items:center;justify-content:center;gap:6px;margin-top:auto;padding:9px 10px;border-radius:10px;background:var(--dm-grad-effect,linear-gradient(135deg,#3b82f6,#00d4d4));
        color:#000;font-weight:700;font-size:.82rem;font-family:var(--dm-font-title,'Rajdhani',sans-serif);letter-spacing:.3px;text-align:center}
      .corpo-c .meta + .cta,.corpo-c .preco + .cta{margin-top:6px}
      .card:hover .cta{filter:brightness(1.08)}
      .card.esg .cta{background:var(--dm-bg-card);color:var(--dm-text-muted);border:1px solid var(--dm-border)}

      .estado{display:flex;flex-direction:column;align-items:center;gap:4px;border:1px dashed var(--dm-border);border-radius:var(--dm-radius-lg,20px);padding:28px 18px;margin-bottom:22px;text-align:center;color:var(--dm-text-sub);font-size:.88rem}
      .estado svg{margin-bottom:8px;color:var(--dm-text-muted)}
      .estado b{color:var(--dm-text);font-family:var(--dm-font-title,'Rajdhani',sans-serif);font-weight:700;font-size:1.1rem}
      .aviso{display:flex;gap:8px;align-items:flex-start;margin:22px 0 0;color:var(--dm-text-muted);font-size:.74rem;line-height:1.45}
      .aviso svg{margin-top:1px}
      `;
    }
  }

  customElements.define('dmaior-vitrine', DmaiorVitrine);
})();
