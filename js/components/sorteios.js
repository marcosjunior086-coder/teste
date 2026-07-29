/**
 * sorteios.js — Ferramenta de sorteios da DMaior Agency
 *
 * Custom Element: <dmaior-sorteios>
 * Shadow DOM, sem login/backend próprio. Três modalidades independentes:
 *   - Geral: participantes por nome (manual ou colados em lote).
 *   - Rifa: números 1..N gerados a partir de uma quantidade.
 *   - Kwai ID: resolve nome/foto de participantes via o worker público
 *     busca-uid.agencydmaior.com.br (mesmo usado no /buscador).
 *
 * A lógica/efeito da roleta (contagem 3,2,1,GO!, giro, desaceleração,
 * resultado, confete) foi adaptada de uma ferramenta de sorteios usada em
 * outra agência — só o EFEITO foi reaproveitado, com cores/layout próprios
 * do site DMaior (var(--dm-cyan) etc.), sem copiar o visual original.
 */

class DmaiorSorteios extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });

    this.WORKER_UID = 'https://busca-uid.agencydmaior.com.br';

    this.modo = 'geral';

    this.geralParts       = [];
    this.geralDisponiveis = [];

    this.rifaPool        = [];
    this.rifaDisponiveis = [];

    this.kwaiPendentes    = [];
    this.kwaiParts        = [];
    this.kwaiDisponiveis  = [];
    this.kwaiErros        = [];
    this.kwaiProcessando  = false;
  }

  connectedCallback() {
    this.render();
    this.bind();
  }

  $(id) { return this.shadowRoot.getElementById(id); }
  esc(t) { const d = document.createElement('div'); d.textContent = String(t == null ? '' : t); return d.innerHTML; }
  sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  _safeUrl(url) {
    if (!url || typeof url !== 'string') return '';
    try { const u = new URL(url.trim()); if (u.protocol === 'https:' || u.protocol === 'http:') return u.href; } catch (_) {}
    return '';
  }

  _avatarFallbackSvg() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 0 0-16 0"/></svg>`;
  }

  toast(msg, tipo = 'sucesso') {
    const cores = {
      sucesso: ['rgba(0,212,212,.12)', 'rgba(0,212,212,.3)', 'var(--dm-cyan, #00d4d4)'],
      erro:    ['rgba(239,68,68,.12)', 'rgba(239,68,68,.3)', '#ef4444'],
      info:    ['rgba(160,184,200,.12)', 'rgba(160,184,200,.3)', 'var(--dm-text-sub, #a0b8c8)'],
    };
    const [bg, bc, col] = cores[tipo] || cores.info;
    const icones = {
      sucesso: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>',
      erro:    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
      info:    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
    };
    const t = document.createElement('div');
    t.className = 'sort-toast';
    t.style.cssText = `background:${bg};border:1px solid ${bc};color:${col};`;
    t.innerHTML = (icones[tipo] || icones.info) + `<span>${this.esc(msg)}</span>`;
    this.$('sort-tc').appendChild(t);
    setTimeout(() => t.remove(), 3400);
  }

  // ════════════════════════════════════════════════════════
  //  NAVEGAÇÃO ENTRE MODALIDADES
  // ════════════════════════════════════════════════════════

  switchModo(modo) {
    this.modo = modo;
    this.shadowRoot.querySelectorAll('.sort-tab').forEach(b => b.classList.toggle('ativa', b.dataset.modo === modo));
    this.shadowRoot.querySelectorAll('.sort-painel').forEach(p => p.classList.toggle('ativo', p.id === `painel-${modo}`));
  }

  // ════════════════════════════════════════════════════════
  //  MODALIDADE 1 — SORTEIO GERAL (nomes)
  // ════════════════════════════════════════════════════════

  addGeralIndividual() {
    const inp = this.$('geral-nome');
    const nome = inp.value.trim();
    if (!nome) { this.toast('Digite um nome.', 'erro'); return; }
    this.geralParts.push({ nome });
    this.geralDisponiveis = [...this.geralParts];
    inp.value = '';
    inp.focus();
    this._renderGeralLista();
  }

  addGeralLote() {
    const raw = this.$('geral-lote').value;
    if (!raw.trim()) { this.toast('Cole ao menos um nome.', 'erro'); return; }
    let count = 0;
    raw.split('\n').map(l => l.trim()).filter(Boolean).forEach(nome => {
      this.geralParts.push({ nome });
      count++;
    });
    this.geralDisponiveis = [...this.geralParts];
    this.$('geral-lote').value = '';
    this._renderGeralLista();
    this.toast(`${count} participante${count !== 1 ? 's' : ''} adicionado${count !== 1 ? 's' : ''}!`, 'sucesso');
  }

  removeGeral(idx) {
    this.geralParts.splice(idx, 1);
    this.geralDisponiveis = [...this.geralParts];
    this._renderGeralLista();
  }

  limparGeral() {
    if (!this.geralParts.length) { this.toast('Lista já está vazia.', 'info'); return; }
    this.geralParts = []; this.geralDisponiveis = [];
    this._renderGeralLista();
    this.toast('Lista limpa!', 'sucesso');
  }

  _renderGeralLista() {
    const c = this.$('geral-lista');
    const cnt = this.$('geral-cnt');
    if (cnt) cnt.textContent = `${this.geralParts.length} participante${this.geralParts.length !== 1 ? 's' : ''}`;
    const btn = this.$('btn-sortear-geral');
    if (btn) btn.disabled = this.geralParts.length === 0;
    if (!this.geralParts.length) {
      c.innerHTML = `<p class="sort-vazio">Nenhum participante ainda</p>`;
      return;
    }
    c.innerHTML = this.geralParts.map((p, i) => `
      <div class="sort-item">
        <span class="sort-item-idx">#${i + 1}</span>
        <span class="sort-item-nome">${this.esc(p.nome)}</span>
        <button class="sort-item-rm" data-action="removeGeral" data-idx="${i}" aria-label="Remover">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>`).join('');
  }

  // Sorteia N itens distintos (sem repetir) de `disponiveis`, recarregando a
  // lista automaticamente se já tiver acabado, e limitando N ao que houver
  // disponível. `disponiveis` é mutado diretamente (splice), então precisa
  // ser o array real do estado (this.xDisponiveis), não uma cópia.
  _prepararSorteioN(disponiveis, poolCompleto, nSolicitado) {
    if (!disponiveis.length) {
      disponiveis.push(...poolCompleto);
      this.toast('Todos já foram sorteados — lista reiniciada!', 'info');
    }
    let n = Math.max(1, parseInt(nSolicitado, 10) || 1);
    if (n > disponiveis.length) {
      this.toast(`Só há ${disponiveis.length} disponível${disponiveis.length !== 1 ? 'is' : ''} — sorteando ${disponiveis.length}.`, 'info');
      n = disponiveis.length;
    }
    const vencedores = [];
    for (let i = 0; i < n; i++) {
      const idx = Math.floor(Math.random() * disponiveis.length);
      vencedores.push(disponiveis[idx]);
      disponiveis.splice(idx, 1);
    }
    return vencedores;
  }

  async sortearGeral() {
    if (!this.geralParts.length) { this.toast('Adicione participantes primeiro!', 'erro'); return; }
    const n = this.$('geral-qtd-ganhadores').value;
    const vencedores = this._prepararSorteioN(this.geralDisponiveis, this.geralParts, n);
    await this._abrirRoleta({
      tipo: 'geral',
      pool: this.geralParts,
      vencedores,
    });
    this._renderGeralLista();
  }

  // ════════════════════════════════════════════════════════
  //  MODALIDADE 2 — SORTEIO DE RIFA (números)
  // ════════════════════════════════════════════════════════

  gerarRifa() {
    const qtd = parseInt(this.$('rifa-qtd').value, 10);
    if (!qtd || qtd < 1) { this.toast('Informe uma quantidade válida.', 'erro'); return; }
    if (qtd > 100000) { this.toast('Quantidade máxima: 100.000 números.', 'erro'); return; }
    this.rifaPool = Array.from({ length: qtd }, (_, i) => i + 1);
    this.rifaDisponiveis = [...this.rifaPool];
    this.$('rifa-info').textContent = `Números gerados: 1 até ${qtd}`;
    this.$('btn-sortear-rifa').disabled = false;
    this.toast(`${qtd} números gerados!`, 'sucesso');
  }

  async sortearRifa() {
    if (!this.rifaPool.length) { this.toast('Gere os números primeiro!', 'erro'); return; }
    const n = this.$('rifa-qtd-ganhadores').value;
    const vencedores = this._prepararSorteioN(this.rifaDisponiveis, this.rifaPool, n);
    await this._abrirRoleta({
      tipo: 'rifa',
      pool: this.rifaPool,
      vencedores,
    });
  }

  // ════════════════════════════════════════════════════════
  //  MODALIDADE 3 — SORTEIO POR ID KWAI
  // ════════════════════════════════════════════════════════

  _idJaExiste(id) {
    const idLower = id.toLowerCase();
    return this.kwaiPendentes.some(p => p.toLowerCase() === idLower) ||
           this.kwaiParts.some(p => p.id.toLowerCase() === idLower);
  }

  addKwaiIndividual() {
    const inp = this.$('kwai-id');
    const bruto = inp.value.trim().replace(/^@/, '');
    if (!bruto) { this.toast('Digite um ID da Kwai.', 'erro'); return; }
    if (this._idJaExiste(bruto)) { this.toast(`ID "${bruto}" já foi adicionado.`, 'erro'); return; }
    this.kwaiPendentes.push(bruto);
    inp.value = '';
    inp.focus();
    this._renderKwaiPendentes();
  }

  addKwaiLote() {
    const raw = this.$('kwai-lote').value;
    if (!raw.trim()) { this.toast('Cole ao menos um ID.', 'erro'); return; }
    let add = 0, dup = 0;
    raw.split('\n').map(l => l.trim().replace(/^@/, '')).filter(Boolean).forEach(id => {
      if (this._idJaExiste(id)) { dup++; return; }
      this.kwaiPendentes.push(id);
      add++;
    });
    this.$('kwai-lote').value = '';
    this._renderKwaiPendentes();
    if (add) this.toast(`${add} ID${add !== 1 ? 's' : ''} adicionado${add !== 1 ? 's' : ''}!`, 'sucesso');
    if (dup)  this.toast(`${dup} duplicado${dup !== 1 ? 's' : ''} ignorado${dup !== 1 ? 's' : ''}.`, 'info');
  }

  removeKwaiPendente(idx) {
    this.kwaiPendentes.splice(idx, 1);
    this._renderKwaiPendentes();
  }

  removeKwaiParticipante(idx) {
    this.kwaiParts.splice(idx, 1);
    this.kwaiDisponiveis = [...this.kwaiParts];
    this._renderKwaiGrid();
    this._atualizarBotaoSortearKwai();
  }

  _renderKwaiPendentes() {
    const c = this.$('kwai-pendentes');
    const cnt = this.$('kwai-pend-cnt');
    if (cnt) cnt.textContent = this.kwaiPendentes.length ? `${this.kwaiPendentes.length} na fila` : '';
    if (!this.kwaiPendentes.length) { c.innerHTML = ''; return; }
    c.innerHTML = this.kwaiPendentes.map((id, i) => `
      <span class="sort-tag">
        ${this.esc(id)}
        <button data-action="removeKwaiPendente" data-idx="${i}" aria-label="Remover">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </span>`).join('');
  }

  async processarKwai() {
    if (!this.kwaiPendentes.length) { this.toast('Adicione ao menos um ID primeiro.', 'erro'); return; }
    if (this.kwaiProcessando) return;

    this.kwaiProcessando = true;
    this.kwaiErros = [];
    const idsParaProcessar = [...this.kwaiPendentes];
    this.kwaiPendentes = [];
    this._renderKwaiPendentes();

    const btn = this.$('btn-processar-kwai');
    btn.disabled = true;
    this._atualizarBotaoSortearKwai();

    const status = this.$('kwai-status');
    let feitos = 0;
    const total = idsParaProcessar.length;
    status.style.display = '';
    status.textContent = `Processando 0 de ${total}...`;

    const processarUm = async (id) => {
      try {
        const resp = await fetch(`${this.WORKER_UID}/resolver?id=${encodeURIComponent(id)}`);
        const dados = await resp.json();
        if (dados.ok) {
          this.kwaiParts.push({ id, uid: dados.uid, nome: dados.nome || id, foto: dados.foto || '' });
          this.kwaiDisponiveis = [...this.kwaiParts];
          this._renderKwaiGrid();
        } else {
          this.kwaiErros.push({ id, motivo: dados.erro || 'Não encontrado' });
        }
      } catch (e) {
        this.kwaiErros.push({ id, motivo: 'Falha ao consultar' });
      }
      feitos++;
      status.textContent = `Processando ${feitos} de ${total}...`;
    };

    const CONCORRENCIA = 5;
    let cursor = 0;
    const trabalhador = async () => {
      while (cursor < idsParaProcessar.length) {
        const meu = cursor++;
        await processarUm(idsParaProcessar[meu]);
      }
    };
    await Promise.all(Array.from({ length: Math.min(CONCORRENCIA, idsParaProcessar.length) }, trabalhador));

    this.kwaiProcessando = false;
    btn.disabled = false;
    this._atualizarBotaoSortearKwai();

    if (this.kwaiErros.length) {
      status.innerHTML = `<span style="color:#ef4444">${this.kwaiErros.length} ID${this.kwaiErros.length !== 1 ? 's' : ''} com erro: ${this.kwaiErros.map(e => this.esc(e.id)).join(', ')}</span>`;
      this.toast(`${this.kwaiErros.length} ID${this.kwaiErros.length !== 1 ? 's' : ''} não encontrado(s).`, 'erro');
    } else {
      status.style.display = 'none';
    }
    if (feitos - this.kwaiErros.length > 0) this.toast('Participantes processados!', 'sucesso');
  }

  _atualizarBotaoSortearKwai() {
    const btn = this.$('btn-sortear-kwai');
    if (btn) btn.disabled = this.kwaiProcessando || this.kwaiParts.length === 0;
  }

  _renderKwaiGrid() {
    const c = this.$('kwai-grid');
    const cnt = this.$('kwai-cnt');
    if (cnt) cnt.textContent = `${this.kwaiParts.length} participante${this.kwaiParts.length !== 1 ? 's' : ''}`;
    this._atualizarBotaoSortearKwai();
    if (!this.kwaiParts.length) { c.innerHTML = `<p class="sort-vazio">Nenhum participante processado ainda</p>`; return; }
    c.innerHTML = this.kwaiParts.map((p, i) => {
      const foto = this._safeUrl(p.foto);
      return `
      <div class="sort-kwai-card">
        <button class="sort-item-rm sort-kwai-rm" data-action="removeKwaiParticipante" data-idx="${i}" aria-label="Remover">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
        ${foto
          ? `<img class="sort-kwai-foto" src="${this.esc(foto)}" alt="" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
             <div class="sort-kwai-foto-fb" style="display:none">${this._avatarFallbackSvg()}</div>`
          : `<div class="sort-kwai-foto-fb">${this._avatarFallbackSvg()}</div>`}
        <div class="sort-kwai-nome">${this.esc(p.nome)}</div>
        <div class="sort-kwai-id">ID: ${this.esc(p.id)}</div>
      </div>`;
    }).join('');
  }

  async sortearKwai() {
    if (!this.kwaiParts.length) { this.toast('Processe os participantes primeiro!', 'erro'); return; }
    if (this.kwaiProcessando) { this.toast('Aguarde o processamento terminar.', 'erro'); return; }
    const n = this.$('kwai-qtd-ganhadores').value;
    const vencedores = this._prepararSorteioN(this.kwaiDisponiveis, this.kwaiParts, n);
    await this._abrirRoleta({
      tipo: 'kwai',
      pool: this.kwaiParts,
      vencedores,
    });
  }

  // ════════════════════════════════════════════════════════
  //  ROLETA — animação compartilhada (efeito adaptado)
  // ════════════════════════════════════════════════════════

  async _abrirRoleta({ tipo, pool, vencedores }) {
    const vencedor = vencedores[0];
    this._ultimoSorteio = { tipo };
    const ol      = this.$('roleta-ol');
    const cd      = this.$('roleta-cd');
    const inner   = this.$('roleta-inner');
    const spinBox = this.$('roleta-spin-box');
    const resBox  = this.$('roleta-resultado');

    ol.classList.add('aberta');
    spinBox.style.display = '';
    resBox.style.display  = 'none';
    inner.innerHTML = '';
    inner.classList.remove('sort-shake');

    for (const n of ['3', '2', '1', 'GO!']) {
      cd.textContent = n;
      cd.classList.remove('mostrar');
      void cd.offsetWidth;
      cd.classList.add('mostrar');
      await this.sleep(n === 'GO!' ? 550 : 780);
    }
    cd.classList.remove('mostrar');

    if (tipo === 'kwai') {
      inner.innerHTML = `
        <div class="sort-roleta-foto-wrap"><img class="sort-roleta-foto" id="roleta-foto" src="" alt="" onerror="this.style.opacity=0"></div>
        <div class="sort-roleta-nome" id="roleta-nome">...</div>
        <div class="sort-roleta-sub" id="roleta-sub"></div>`;
    } else {
      inner.innerHTML = `<div class="sort-roleta-texto" id="roleta-texto">...</div>`;
    }
    inner.classList.add('sort-shake');

    let intervalo = setInterval(() => {
      const p = pool[Math.floor(Math.random() * pool.length)];
      if (tipo === 'kwai') {
        const foto = this._safeUrl(p.foto);
        const elFoto = inner.querySelector('#roleta-foto');
        const elNome = inner.querySelector('#roleta-nome');
        const elSub  = inner.querySelector('#roleta-sub');
        if (elFoto) { elFoto.src = foto; elFoto.style.opacity = foto ? '1' : '0'; }
        if (elNome) elNome.textContent = p.nome;
        if (elSub)  elSub.textContent  = `ID: ${p.id}`;
      } else {
        const elTxt = inner.querySelector('#roleta-texto');
        if (elTxt) elTxt.textContent = tipo === 'rifa' ? p : p.nome;
      }
    }, 65);

    await this.sleep(3600);
    clearInterval(intervalo);
    inner.classList.remove('sort-shake');

    if (tipo === 'kwai') {
      const foto = this._safeUrl(vencedor.foto);
      const elFoto = inner.querySelector('#roleta-foto');
      const elNome = inner.querySelector('#roleta-nome');
      const elSub  = inner.querySelector('#roleta-sub');
      if (elFoto) { elFoto.src = foto; elFoto.style.opacity = foto ? '1' : '0'; }
      if (elNome) elNome.textContent = vencedor.nome;
      if (elSub)  elSub.textContent  = `ID: ${vencedor.id}`;
    } else {
      const elTxt = inner.querySelector('#roleta-texto');
      if (elTxt) elTxt.textContent = tipo === 'rifa' ? vencedor : vencedor.nome;
    }

    await this.sleep(700);

    spinBox.style.display = 'none';
    resBox.style.display  = '';

    const rotulo = { geral: 'Participante', rifa: 'Número', kwai: 'Participante' }[tipo];
    this.$('roleta-resultado-titulo').textContent = vencedores.length > 1
      ? `${vencedores.length} ${rotulo}s Sorteados!`
      : `${rotulo} Sorteado!`;

    const conteudo = this.$('roleta-resultado-conteudo');
    if (vencedores.length === 1) {
      if (tipo === 'kwai') {
        const foto = this._safeUrl(vencedor.foto);
        conteudo.innerHTML = `
          <div class="sort-resultado-foto-wrap">
            ${foto ? `<img class="sort-resultado-foto" src="${this.esc(foto)}" onerror="this.style.display='none'">` : `<div class="sort-resultado-foto-fb">${this._avatarFallbackSvg()}</div>`}
          </div>
          <div class="sort-resultado-nome">${this.esc(vencedor.nome)}</div>
          <div class="sort-resultado-sub">ID: ${this.esc(vencedor.id)}</div>`;
      } else if (tipo === 'rifa') {
        conteudo.innerHTML = `<div class="sort-resultado-numero">${this.esc(vencedor)}</div>`;
      } else {
        conteudo.innerHTML = `<div class="sort-resultado-nome sort-resultado-nome-grande">${this.esc(vencedor.nome)}</div>`;
      }
    } else {
      conteudo.innerHTML = `<div class="sort-resultado-grid">${vencedores.map(v => {
        if (tipo === 'kwai') {
          const foto = this._safeUrl(v.foto);
          return `<div class="sort-resultado-mini">
            ${foto ? `<img class="sort-resultado-mini-foto" src="${this.esc(foto)}" onerror="this.style.display='none'">` : `<div class="sort-resultado-mini-foto-fb">${this._avatarFallbackSvg()}</div>`}
            <div class="sort-resultado-mini-nome">${this.esc(v.nome)}</div>
            <div class="sort-resultado-mini-sub">ID: ${this.esc(v.id)}</div>
          </div>`;
        }
        if (tipo === 'rifa') {
          return `<div class="sort-resultado-mini"><div class="sort-resultado-mini-numero">${this.esc(v)}</div></div>`;
        }
        return `<div class="sort-resultado-mini"><div class="sort-resultado-mini-nome">${this.esc(v.nome)}</div></div>`;
      }).join('')}</div>`;
    }

    this._shootConfetti();
  }

  _shootConfetti() {
    const cores = ['#00d4d4', '#ffffff', '#f5b942', '#00a8a8'];
    const ol = this.$('roleta-ol');
    for (let i = 0; i < 60; i++) {
      const c = document.createElement('div');
      c.className = 'sort-confete';
      c.style.left = Math.random() * 100 + '%';
      c.style.width = (5 + Math.random() * 7) + 'px';
      c.style.height = (9 + Math.random() * 12) + 'px';
      c.style.background = cores[Math.floor(Math.random() * cores.length)];
      c.style.animationDelay = (Math.random() * 0.6) + 's';
      c.style.animationDuration = (2.2 + Math.random() * 1.3) + 's';
      c.style.transform = `rotate(${Math.random() * 360}deg)`;
      ol.appendChild(c);
      setTimeout(() => c.remove(), 4200);
    }
  }

  fecharRoleta() {
    this.$('roleta-ol').classList.remove('aberta');
  }

  async sortearNovamente() {
    const tipo = this._ultimoSorteio?.tipo;
    this.fecharRoleta();
    await this.sleep(150);
    if (tipo === 'geral') await this.sortearGeral();
    else if (tipo === 'rifa') await this.sortearRifa();
    else if (tipo === 'kwai') await this.sortearKwai();
  }

  // ════════════════════════════════════════════════════════
  //  EVENTOS
  // ════════════════════════════════════════════════════════

  bind() {
    this.shadowRoot.addEventListener('click', e => {
      const tab = e.target.closest('.sort-tab');
      if (tab) { this.switchModo(tab.dataset.modo); return; }
      const t = e.target.closest('[data-action]');
      if (!t) return;
      const a = t.dataset.action;
      if (a === 'addGeralIndividual')     this.addGeralIndividual();
      if (a === 'addGeralLote')           this.addGeralLote();
      if (a === 'removeGeral')            this.removeGeral(parseInt(t.dataset.idx, 10));
      if (a === 'limparGeral')            this.limparGeral();
      if (a === 'sortearGeral')           this.sortearGeral();
      if (a === 'gerarRifa')              this.gerarRifa();
      if (a === 'sortearRifa')            this.sortearRifa();
      if (a === 'addKwaiIndividual')      this.addKwaiIndividual();
      if (a === 'addKwaiLote')            this.addKwaiLote();
      if (a === 'removeKwaiPendente')     this.removeKwaiPendente(parseInt(t.dataset.idx, 10));
      if (a === 'removeKwaiParticipante') this.removeKwaiParticipante(parseInt(t.dataset.idx, 10));
      if (a === 'processarKwai')          this.processarKwai();
      if (a === 'sortearKwai')            this.sortearKwai();
      if (a === 'fecharRoleta')           this.fecharRoleta();
      if (a === 'sortearNovamente')       this.sortearNovamente();
    });

    this.shadowRoot.addEventListener('keydown', e => {
      if (e.key !== 'Enter') return;
      if (e.target.id === 'geral-nome') this.addGeralIndividual();
      if (e.target.id === 'kwai-id')     this.addKwaiIndividual();
      if (e.target.id === 'rifa-qtd')    this.gerarRifa();
    });
  }

  // ════════════════════════════════════════════════════════
  //  LAYOUT
  // ════════════════════════════════════════════════════════

  render() {
    this.shadowRoot.innerHTML = `
    <style>
      :host{display:block;width:100%;font-family:var(--dm-font-body,'Exo 2',sans-serif);color:var(--dm-text,#e2e8f0);}
      *{box-sizing:border-box;}
      #sort-tc{position:fixed;top:14px;right:14px;z-index:200;display:flex;flex-direction:column;gap:8px;max-width:280px;}
      .sort-toast{display:flex;align-items:center;gap:7px;padding:.6rem .85rem;font-size:.8rem;font-weight:500;border-radius:10px;animation:sortIn .25s ease-out;}
      @keyframes sortIn{from{transform:translateX(110%);opacity:0}to{transform:translateX(0);opacity:1}}

      .sort-tabs{display:flex;gap:6px;flex-wrap:wrap;justify-content:center;background:var(--dm-bg-card,rgba(255,255,255,.06));border:1px solid var(--dm-cyan-border,rgba(0,212,212,.15));border-radius:12px;padding:5px;max-width:560px;margin:0 auto 20px;}
      .sort-tab{flex:1;min-width:110px;padding:.55rem .7rem;border-radius:9px;border:none;cursor:pointer;font-family:var(--dm-font-body,'Exo 2',sans-serif);font-weight:600;font-size:.8rem;background:transparent;color:var(--dm-text-muted,#7a9ab4);transition:background .2s,color .2s;}
      .sort-tab.ativa{background:var(--dm-cyan-12,rgba(0,212,212,.12));color:var(--dm-cyan,#00d4d4);}

      .sort-painel{display:none;max-width:560px;margin:0 auto;}
      .sort-painel.ativo{display:block;}

      .sort-card{background:var(--dm-bg-card,rgba(255,255,255,.06));border:1px solid var(--dm-cyan-border,rgba(0,212,212,.15));border-radius:14px;padding:1.1rem 1.15rem;margin-bottom:14px;}
      .sort-label{font-size:.72rem;color:var(--dm-text-muted,#7a9ab4);display:block;margin-bottom:5px;font-weight:500;}
      .sort-inp,.sort-textarea,.sort-select{width:100%;background:var(--dm-bg-tint,rgba(0,0,0,.2));border:1px solid var(--dm-cyan-border,rgba(0,212,212,.15));border-radius:9px;padding:.65rem .8rem;color:var(--dm-text,#e2e8f0);font-family:var(--dm-font-body,'Exo 2',sans-serif);font-size:.85rem;outline:none;transition:border-color .2s;}
      .sort-inp:focus,.sort-textarea:focus{border-color:var(--dm-cyan,#00d4d4);}
      .sort-textarea{resize:vertical;min-height:90px;font-family:monospace;font-size:.8rem;}
      .sort-row{display:flex;gap:8px;}
      .sort-row .sort-inp{flex:1;}

      .sort-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;background:var(--dm-grad-cyan,linear-gradient(90deg,#00d4d4,#008c8c));color:#04141a;font-weight:700;border:none;border-radius:9px;padding:.62rem 1.1rem;cursor:pointer;font-family:var(--dm-font-body,'Exo 2',sans-serif);font-size:.82rem;transition:opacity .2s,transform .15s;}
      .sort-btn:hover{opacity:.9;}
      .sort-btn:active{transform:scale(.97);}
      .sort-btn:disabled{opacity:.35;cursor:not-allowed;}
      .sort-btn svg{width:15px;height:15px;}
      .sort-btn-full{width:100%;}
      .sort-btn-g{background:transparent;border:1px solid var(--dm-cyan-border,rgba(0,212,212,.2));color:var(--dm-text-muted,#7a9ab4);}
      .sort-btn-g:hover{border-color:var(--dm-cyan,#00d4d4);color:var(--dm-cyan,#00d4d4);}
      .sort-btn-d{background:transparent;border:1px solid rgba(239,68,68,.28);color:#ef4444;}
      .sort-btn-d:hover{background:rgba(239,68,68,.08);}

      .sort-divisor{text-align:center;font-size:.7rem;color:var(--dm-text-dim,#4a6070);margin:.85rem 0;text-transform:uppercase;letter-spacing:.06em;}

      .sort-header-row{display:flex;align-items:center;justify-content:space-between;margin-bottom:.7rem;}
      .sort-header-row h3{font-size:.85rem;font-weight:700;color:var(--dm-cyan,#00d4d4);margin:0;}
      .sort-header-row span{font-size:.72rem;color:var(--dm-text-muted,#7a9ab4);}

      .sort-vazio{color:var(--dm-text-muted,#7a9ab4);text-align:center;padding:1.3rem 0;font-size:.8rem;}

      .sort-lista{display:flex;flex-direction:column;gap:5px;max-height:280px;overflow-y:auto;margin-bottom:.9rem;}
      .sort-item{display:flex;align-items:center;gap:8px;background:var(--dm-cyan-05,rgba(0,212,212,.05));border:1px solid var(--dm-cyan-border,rgba(0,212,212,.12));border-radius:9px;padding:.5rem .75rem;}
      .sort-item-idx{font-family:monospace;font-size:.68rem;color:var(--dm-cyan,#00d4d4);min-width:26px;}
      .sort-item-nome{flex:1;font-size:.83rem;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
      .sort-item-rm{background:none;border:none;cursor:pointer;color:rgba(239,68,68,.4);padding:4px;border-radius:6px;line-height:0;flex-shrink:0;}
      .sort-item-rm:hover{color:#ef4444;background:rgba(239,68,68,.1);}
      .sort-item-rm svg{width:13px;height:13px;}

      .sort-tags{display:flex;flex-wrap:wrap;gap:6px;margin:.6rem 0;}
      .sort-tag{display:inline-flex;align-items:center;gap:5px;background:var(--dm-cyan-08,rgba(0,212,212,.08));border:1px solid var(--dm-cyan-border,rgba(0,212,212,.2));border-radius:20px;padding:.3rem .5rem .3rem .7rem;font-size:.75rem;font-family:monospace;}
      .sort-tag button{background:none;border:none;cursor:pointer;color:rgba(239,68,68,.5);padding:2px;line-height:0;}
      .sort-tag button:hover{color:#ef4444;}
      .sort-tag button svg{width:11px;height:11px;}

      #kwai-status{font-size:.76rem;color:var(--dm-text-muted,#7a9ab4);margin-bottom:.7rem;}

      .sort-kwai-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(100px,1fr));gap:9px;max-height:360px;overflow-y:auto;margin-bottom:.9rem;}
      .sort-kwai-card{position:relative;background:var(--dm-cyan-05,rgba(0,212,212,.05));border:1px solid var(--dm-cyan-border,rgba(0,212,212,.14));border-radius:11px;padding:.7rem .5rem;text-align:center;}
      .sort-kwai-rm{position:absolute;top:3px;right:3px;}
      .sort-kwai-foto,.sort-kwai-foto-fb{width:44px;height:44px;border-radius:50%;object-fit:cover;margin:0 auto 6px;display:block;border:2px solid var(--dm-cyan-border,rgba(0,212,212,.3));}
      .sort-kwai-foto-fb{display:flex;align-items:center;justify-content:center;background:var(--dm-cyan-08,rgba(0,212,212,.08));color:var(--dm-cyan,#00d4d4);}
      .sort-kwai-foto-fb svg{width:18px;height:18px;}
      .sort-kwai-nome{font-size:.72rem;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
      .sort-kwai-id{font-size:.62rem;color:var(--dm-text-muted,#7a9ab4);font-family:monospace;margin-top:2px;}

      /* ── ROLETA ── */
      #roleta-ol{display:none;position:fixed;inset:0;background:rgba(2,3,6,.94);z-index:300;align-items:center;justify-content:center;flex-direction:column;padding:1rem;overflow-y:auto;}
      #roleta-ol.aberta{display:flex;}
      .sort-roleta-card{position:relative;width:min(420px,90vw);min-height:280px;background:linear-gradient(150deg,var(--dm-cyan-20,rgba(0,212,212,.2)),rgba(0,0,0,.6));border:2px solid var(--dm-cyan-border,rgba(0,212,212,.3));border-radius:24px;display:grid;place-items:center;padding:24px;box-shadow:0 0 70px var(--dm-cyan-12,rgba(0,212,212,.12));}
      .sort-shake{animation:sortShake .14s linear infinite;}
      @keyframes sortShake{0%,100%{transform:translateX(0)}25%{transform:translateX(-3px) rotate(-.4deg)}75%{transform:translateX(3px) rotate(.4deg)}}
      .sort-cd{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) scale(.4);font-family:var(--dm-font-title,'Rajdhani',sans-serif);font-size:clamp(70px,16vw,140px);font-weight:700;color:#fff;opacity:0;text-shadow:0 0 40px var(--dm-cyan,#00d4d4);pointer-events:none;}
      .sort-cd.mostrar{animation:sortCdPop .68s ease forwards;}
      @keyframes sortCdPop{0%{transform:translate(-50%,-50%) scale(.4);opacity:0}35%{transform:translate(-50%,-50%) scale(1.1);opacity:1}100%{transform:translate(-50%,-50%) scale(.95);opacity:.9}}
      .sort-roleta-texto{font-family:var(--dm-font-title,'Rajdhani',sans-serif);font-size:clamp(28px,6vw,46px);font-weight:700;text-align:center;color:var(--dm-cyan,#00d4d4);word-break:break-word;max-width:100%;}
      .sort-roleta-foto-wrap{width:140px;height:140px;border-radius:50%;padding:5px;background:conic-gradient(from 0deg,var(--dm-cyan,#00d4d4),#fff,var(--dm-gold,#f0c040),var(--dm-cyan,#00d4d4));margin:0 auto 12px;}
      .sort-roleta-foto{width:100%;height:100%;border-radius:50%;object-fit:cover;border:3px solid rgba(0,0,0,.7);background:#0a0e1a;}
      .sort-roleta-nome{font-family:var(--dm-font-title,'Rajdhani',sans-serif);font-size:clamp(18px,4vw,28px);font-weight:700;text-align:center;color:var(--dm-cyan,#00d4d4);}
      .sort-roleta-sub{font-size:.78rem;color:var(--dm-text-muted,#7a9ab4);text-align:center;margin-top:2px;}

      .sort-confete{position:absolute;top:-20px;pointer-events:none;border-radius:2px;animation:sortConfFall linear forwards;}
      @keyframes sortConfFall{to{transform:translateY(105vh) rotate(720deg);opacity:0}}

      #roleta-resultado{max-width:420px;width:92vw;text-align:center;}
      #roleta-resultado-titulo{font-family:var(--dm-font-title,'Rajdhani',sans-serif);font-size:clamp(22px,4.5vw,32px);font-weight:700;color:var(--dm-cyan,#00d4d4);margin:0 0 14px;}
      .sort-resultado-foto-wrap{width:110px;height:110px;border-radius:50%;padding:4px;background:conic-gradient(from 0deg,var(--dm-cyan,#00d4d4),#fff,var(--dm-gold,#f0c040));margin:0 auto 10px;}
      .sort-resultado-foto,.sort-resultado-foto-fb{width:100%;height:100%;border-radius:50%;object-fit:cover;border:3px solid rgba(0,0,0,.7);}
      .sort-resultado-foto-fb{display:flex;align-items:center;justify-content:center;background:#0a0e1a;color:var(--dm-cyan,#00d4d4);}
      .sort-resultado-foto-fb svg{width:38px;height:38px;}
      .sort-resultado-nome{font-family:var(--dm-font-title,'Rajdhani',sans-serif);font-size:1.3rem;font-weight:700;color:#fff;}
      .sort-resultado-nome-grande{font-size:1.8rem;}
      .sort-resultado-sub{font-size:.8rem;color:var(--dm-text-muted,#7a9ab4);margin-top:2px;}
      .sort-resultado-numero{font-family:var(--dm-font-title,'Rajdhani',sans-serif);font-size:clamp(48px,12vw,84px);font-weight:800;color:var(--dm-cyan,#00d4d4);}
      .sort-resultado-btns{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:18px;}

      .sort-resultado-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(90px,1fr));gap:10px;max-height:44vh;overflow-y:auto;margin:0 auto;padding:2px;}
      .sort-resultado-mini{background:rgba(255,255,255,.06);border:1px solid rgba(0,212,212,.25);border-radius:12px;padding:10px 6px;text-align:center;}
      .sort-resultado-mini-foto,.sort-resultado-mini-foto-fb{width:50px;height:50px;border-radius:50%;object-fit:cover;margin:0 auto 6px;display:block;border:2px solid rgba(0,212,212,.4);}
      .sort-resultado-mini-foto-fb{display:flex;align-items:center;justify-content:center;background:rgba(0,212,212,.12);color:var(--dm-cyan,#00d4d4);}
      .sort-resultado-mini-foto-fb svg{width:20px;height:20px;}
      .sort-resultado-mini-nome{font-size:.75rem;font-weight:700;color:#fff;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
      .sort-resultado-mini-sub{font-size:.65rem;color:#9db3c4;margin-top:2px;font-family:monospace;}
      .sort-resultado-mini-numero{font-family:var(--dm-font-title,'Rajdhani',sans-serif);font-size:1.6rem;font-weight:800;color:var(--dm-cyan,#00d4d4);}

      @media(max-width:600px){.sort-roleta-card{min-height:230px;padding:18px;}.sort-roleta-foto-wrap{width:100px;height:100px;}}
    </style>

    <div id="sort-tc"></div>

    <div class="sort-tabs">
      <button class="sort-tab ativa" data-modo="geral">
        Sorteio Geral
      </button>
      <button class="sort-tab" data-modo="rifa">
        Sorteio de Rifa
      </button>
      <button class="sort-tab" data-modo="kwai">
        Sorteio por ID Kwai
      </button>
    </div>

    <div class="sort-painel ativo" id="painel-geral">
      <div class="sort-card">
        <label class="sort-label">Adicionar participante</label>
        <div class="sort-row" style="margin-bottom:.9rem;">
          <input type="text" id="geral-nome" class="sort-inp" placeholder="Nome do participante">
          <button class="sort-btn" data-action="addGeralIndividual">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Adicionar
          </button>
        </div>
        <div class="sort-divisor">ou cole uma lista (um nome por linha)</div>
        <textarea id="geral-lote" class="sort-textarea" placeholder="Maria&#10;João&#10;Pedro&#10;Ana"></textarea>
        <button class="sort-btn sort-btn-g sort-btn-full" style="margin-top:.7rem;" data-action="addGeralLote">Importar lista</button>
      </div>

      <div class="sort-card">
        <div class="sort-header-row">
          <h3>Participantes</h3>
          <span id="geral-cnt">0 participantes</span>
        </div>
        <div id="geral-lista" class="sort-lista"><p class="sort-vazio">Nenhum participante ainda</p></div>
        <div style="margin-bottom:.7rem;">
          <label class="sort-label">Quantos ganhadores?</label>
          <input type="number" id="geral-qtd-ganhadores" class="sort-inp" value="1" min="1">
        </div>
        <div style="display:flex;gap:8px;">
          <button class="sort-btn sort-btn-full" id="btn-sortear-geral" data-action="sortearGeral" disabled>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            Sortear
          </button>
          <button class="sort-btn sort-btn-d" data-action="limparGeral">Limpar</button>
        </div>
      </div>
    </div>

    <div class="sort-painel" id="painel-rifa">
      <div class="sort-card">
        <label class="sort-label">Quantidade total de números</label>
        <div class="sort-row" style="margin-bottom:.6rem;">
          <input type="number" id="rifa-qtd" class="sort-inp" placeholder="Ex: 100" min="1">
          <button class="sort-btn" data-action="gerarRifa">Gerar números</button>
        </div>
        <div id="rifa-info" style="font-size:.78rem;color:var(--dm-text-muted,#7a9ab4);"></div>
      </div>
      <div class="sort-card">
        <label class="sort-label">Quantos números sortear?</label>
        <input type="number" id="rifa-qtd-ganhadores" class="sort-inp" value="1" min="1" style="margin-bottom:.9rem;">
        <button class="sort-btn sort-btn-full" id="btn-sortear-rifa" data-action="sortearRifa" disabled>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          Sortear
        </button>
      </div>
    </div>

    <div class="sort-painel" id="painel-kwai">
      <div class="sort-card">
        <label class="sort-label">Adicionar ID da Kwai</label>
        <div class="sort-row" style="margin-bottom:.7rem;">
          <input type="text" id="kwai-id" class="sort-inp" placeholder="ex: amandinhanery">
          <button class="sort-btn" data-action="addKwaiIndividual">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Adicionar
          </button>
        </div>
        <div class="sort-divisor">ou cole uma lista (um ID por linha)</div>
        <textarea id="kwai-lote" class="sort-textarea" placeholder="participante01&#10;participante02&#10;participante03"></textarea>
        <button class="sort-btn sort-btn-g sort-btn-full" style="margin-top:.7rem;" data-action="addKwaiLote">Importar lista</button>
        <div class="sort-tags" id="kwai-pendentes"></div>
        <span id="kwai-pend-cnt" style="font-size:.72rem;color:var(--dm-text-muted,#7a9ab4);"></span>
        <button class="sort-btn sort-btn-full" id="btn-processar-kwai" style="margin-top:.8rem;" data-action="processarKwai">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 12a9 9 0 1 1-3-6.7"/><polyline points="21 3 21 9 15 9"/></svg>
          Processar participantes
        </button>
      </div>

      <div class="sort-card">
        <div class="sort-header-row">
          <h3>Participantes processados</h3>
          <span id="kwai-cnt">0 participantes</span>
        </div>
        <div id="kwai-status" style="display:none;"></div>
        <div id="kwai-grid" class="sort-kwai-grid"><p class="sort-vazio">Nenhum participante processado ainda</p></div>
        <label class="sort-label">Quantos ganhadores?</label>
        <input type="number" id="kwai-qtd-ganhadores" class="sort-inp" value="1" min="1" style="margin-bottom:.9rem;">
        <button class="sort-btn sort-btn-full" id="btn-sortear-kwai" data-action="sortearKwai" disabled>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          Sortear
        </button>
      </div>
    </div>

    <div id="roleta-ol">
      <div id="roleta-spin-box" style="display:flex;flex-direction:column;align-items:center;">
        <div class="sort-roleta-card">
          <div class="sort-cd" id="roleta-cd"></div>
          <div id="roleta-inner"></div>
        </div>
      </div>
      <div id="roleta-resultado" style="display:none;">
        <h3 id="roleta-resultado-titulo"></h3>
        <div id="roleta-resultado-conteudo"></div>
        <div class="sort-resultado-btns">
          <button class="sort-btn" data-action="fecharRoleta">Fechar</button>
          <button class="sort-btn sort-btn-g" data-action="sortearNovamente">Sortear novamente</button>
        </div>
      </div>
    </div>`;
  }
}

customElements.define('dmaior-sorteios', DmaiorSorteios);
