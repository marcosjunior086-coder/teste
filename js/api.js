/**
 * api.js — Centralização de TODAS as chamadas aos Workers da DMaior Agency
 *
 * REGRA: Nenhum componente faz fetch() diretamente.
 *        Toda comunicação com os Workers passa por window.DmaiorAPI.
 *
 * Para alterar uma URL de Worker, mude SOMENTE em DmaiorConfig.workers.
 */

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURAÇÃO — URLs dos Workers Cloudflare
// ─────────────────────────────────────────────────────────────────────────────
window.DmaiorConfig = {
  // URL base do site — usada pelos componentes para montar links internos
  // document.baseURI resolve o <base href> automaticamente
  get baseUrl() { return typeof document !== 'undefined' ? document.baseURI : '/'; },
  workers: {
    rank:        'https://rank.agencydmaior.com.br',
    admin:       'https://admin.agencydmaior.com.br',
    dashboard:   'https://dashboard.agencydmaior.com.br',
    live:        'https://live.agencydmaior.com.br',
    pk:          'https://pk.agencydmaior.com.br',
    recrutamento:'https://recrutamento.agencydmaior.com.br',
    impulso:     'https://impulsionamento.agencydmaior.com.br',
    // Notificações push (Fase 1). O worker é UM só. No domínio real usa
    // push.agencydmaior.com.br (anexar o domínio ao worker); em qualquer outro
    // host (dmaior-site.pages.dev de teste, github.io, localhost) usa a URL
    // .workers.dev do MESMO worker.
    push: (function () {
      var h = (typeof location !== 'undefined' && location.hostname) || '';
      return /(^|\.)agencydmaior\.com\.br$/.test(h)
        ? 'https://push.agencydmaior.com.br'
        : 'https://push.contato-marcosbento.workers.dev';
    })(),
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// API CENTRALIZADA
// ─────────────────────────────────────────────────────────────────────────────
window.DmaiorAPI = {

  // ── Helpers internos de fetch ─────────────────────────────────────────────

  /**
   * POST genérico para qualquer Worker.
   * @param {string} base - URL base do Worker
   * @param {string} endpoint - Caminho (ex: '/validate-id')
   * @param {object} body - Corpo da requisição
   * @param {object} extraHeaders - Headers adicionais
   * @returns {Promise<object>} JSON de resposta
   */
  async _post(base, endpoint, body = {}, extraHeaders = {}) {
    const url = base.replace(/\/$/, '') + endpoint;
    const res = await fetch(url, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', ...extraHeaders },
      body:    JSON.stringify(body),
      signal:  AbortSignal.timeout(25000),
    });
     if (!res.ok) {
       const err = await res.json().catch(() => ({}));
       const message = err.checkMessage || err.motivoBloqueio || err.mensagem || err.erro || `HTTP ${res.status}`;
       const error = new Error(message);
       error.httpStatus = res.status;
       error.data = err;
       throw error;
     }
    return res.json();
  },

  /**
   * GET genérico para qualquer Worker — retorna JSON.
   */
  async _get(base, endpoint, headers = {}) {
    const url = base.replace(/\/$/, '') + endpoint;
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },

  /**
   * GET genérico — retorna texto puro (para planilhas CSV).
   */
  async _getText(base, endpoint, headers = {}) {
    const url = base.replace(/\/$/, '') + endpoint;
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.text();
  },

  // ── Módulo: Ranking ───────────────────────────────────────────────────────

  rank: {
    /** Gera header Authorization Bearer para o ranking */
    _auth(token) {
      return token ? { Authorization: `Bearer ${token}` } : {};
    },

    /**
     * Busca ranking do mês atual via Supabase (endpoint v2).
     * @param {string} token - Bearer token de autenticação
     */
    async getRanking(token) {
      return window.DmaiorAPI._get(
        window.DmaiorConfig.workers.rank,
        '/api/ranking/v2',
        window.DmaiorAPI.rank._auth(token),
      );
    },

    /**
     * Retorna UIDs de streamers ao vivo agora.
     * @param {string} token - Bearer token
     */
    async getLives(token) {
      return window.DmaiorAPI._get(
        window.DmaiorConfig.workers.rank,
        '/api/lives',
        window.DmaiorAPI.rank._auth(token),
      );
    },

    /**
     * Busca configuração de prêmios (diamantes e horas).
     * @param {string} token - Bearer token
     */
    async getPrizes(token) {
      return window.DmaiorAPI._get(
        window.DmaiorConfig.workers.rank,
        '/premios',
        window.DmaiorAPI.rank._auth(token),
      );
    },

    /**
     * Busca dados de uma aba histórica (Google Sheets via Worker).
     * Retorna CSV/texto puro para parse local.
     * @param {string} gid - ID da aba do Google Sheets
     * @param {string} token - Bearer token
     */
    async getSheet(gid, token) {
      return window.DmaiorAPI._getText(
        window.DmaiorConfig.workers.rank,
        `/planilha?gid=${gid}`,
        window.DmaiorAPI.rank._auth(token),
      );
    },

    /**
     * Busca a lista dinâmica de meses históricos do ranking.
     * A configuração fica no KV do Worker Rank.
     * @param {string} token - Bearer token
     */
    async getMeses(token) {
      return window.DmaiorAPI._get(
        window.DmaiorConfig.workers.rank,
        '/api/ranking/meses',
        window.DmaiorAPI.rank._auth(token),
      );
    },

    /**
     * Busca comunicados ativos filtrados por local (sem auth — público).
     * @param {string} local - 'ranking' | 'painel' | 'impulsionamento'
     */
    async getComunicados(local = '') {
      return window.DmaiorAPI._get(
        window.DmaiorConfig.workers.rank,
        `/comunicados${local ? `?local=${encodeURIComponent(local)}` : ''}`,
      );
    },

    /**
     * Retorna configuração pública do impulsionamento (quota, opções ativas).
     */
    async getImpulsoConfig() {
      return window.DmaiorAPI._get(
        window.DmaiorConfig.workers.rank,
        '/impulso/config',
      );
    },

    /**
     * Verifica se um UID está bloqueado no impulsionamento.
     * @param {string} uid - UID do streamer
     */
    async checkImpulsoBlock(uid) {
      return window.DmaiorAPI._get(
        window.DmaiorConfig.workers.rank,
        `/impulso/check?uid=${encodeURIComponent(uid)}`,
      );
    },
  },

  // ── Módulo: Autenticação do Painel ────────────────────────────────────────

  auth: {
    /**
     * Login do streamer no painel.
     * @param {string} email - E-mail cadastrado
     * @param {string} senha - Senha
     */
    async login(email, senha) {
      return window.DmaiorAPI._post(
        window.DmaiorConfig.workers.dashboard,
        '/login',
        { email, senha },
      );
    },

    /**
     * Valida o token JWT do streamer.
     * @param {string} token - Bearer token armazenado no localStorage
     */
    async verificarToken(token) {
      return window.DmaiorAPI._get(
        window.DmaiorConfig.workers.dashboard,
        '/me',
        { Authorization: `Bearer ${token}` },
      );
    },
  },

  // ── Módulo: Recrutamento ──────────────────────────────────────────────────

  recrutamento: {
    async enviar(dados) {
      return window.DmaiorAPI._post(window.DmaiorConfig.workers.recrutamento, '/candidatura', dados);
    },
  },

  // ── Módulo: Candidatura (fluxo Voyager) ───────────────────────────────────

  candidatura: {
    /** Lista os recrutadores ativos disponíveis no formulário público. */
    async listarRecrutadores() {
      return window.DmaiorAPI._get(window.DmaiorConfig.workers.admin, '/candidatura/recrutadores');
    },
    /** Resolve o agente por trás de um link exclusivo (?agente=<id>). */
    async buscarAgente(id) {
      return window.DmaiorAPI._get(window.DmaiorConfig.workers.admin, `/candidatura/agente/${encodeURIComponent(id)}`);
    },
    /** Busca perfil Kwai/Voyager pelo UID antes do cadastro. */
    async buscarPerfil(uid) {
      return window.DmaiorAPI._post(window.DmaiorConfig.workers.admin, '/candidatura/buscar-perfil', { uid });
    },
    /** Envia candidatura completa com perfil confirmado. */
    async enviar({ uid, nome, whatsapp, categoria, recrutador_id, agente_id, aceite }) {
      return window.DmaiorAPI._post(window.DmaiorConfig.workers.admin, '/candidatura/enviar', { uid, nome, whatsapp, categoria, recrutador_id, agente_id, aceite });
    },
    /** Consulta status pelo protocolo gerado no envio. */
    async status(protocolo) {
      return window.DmaiorAPI._get(window.DmaiorConfig.workers.admin, `/candidatura/status/${encodeURIComponent(protocolo)}`);
    },
    /** Registra clique no botão de migração (para o admin acompanhar). */
    async registrarMigracao({ uid, kwai_id, agencia_atual, candidatura_id }) {
      return window.DmaiorAPI._post(window.DmaiorConfig.workers.admin, '/candidatura/migracao', { uid, kwai_id, agencia_atual, candidatura_id });
    },
  },

  // ── Módulo: Votação ────────────────────────────────────────────────────────

  votacao: {
    /** Valida o UID informado (público ou já logado no painel) antes de mostrar as votações. */
    async verificarId(uid) {
      return window.DmaiorAPI._post(window.DmaiorConfig.workers.admin, '/votacao/verificar-id', { uid });
    },
    /** Lista votações disponíveis. modo: 'publico' (só publica=true) ou 'privado' (todas as ativas). */
    async listar(uid, modo = 'publico') {
      return window.DmaiorAPI._get(window.DmaiorConfig.workers.admin, `/votacao/listar?uid=${encodeURIComponent(uid)}&modo=${modo}`);
    },
    /** Detalhe de uma votação (pergunta + alternativas) e se o uid já votou. */
    async detalhe(votacaoId, uid) {
      return window.DmaiorAPI._get(window.DmaiorConfig.workers.admin, `/votacao/detalhe?id=${encodeURIComponent(votacaoId)}&uid=${encodeURIComponent(uid)}`);
    },
    /** Registra o voto. alternativaIds é sempre um array, mesmo pra seleção única. */
    async votar({ votacao_id, uid, alternativa_ids }) {
      return window.DmaiorAPI._post(window.DmaiorConfig.workers.admin, '/votacao/votar', { votacao_id, uid, alternativa_ids });
    },
  },

  // ── Módulo: PK Diário ──────────────────────────────────────────────────────
  // Leitura pública pro streamer logado — mesmo Worker/nível de confiança do
  // módulo votacao (não precisa de uid, o ranking/confrontos são iguais pra
  // qualquer streamer).
  pk: {
    /** Programações com status ativa ou encerrada. */
    async listarProgramacoes() {
      return window.DmaiorAPI._get(window.DmaiorConfig.workers.admin, '/pk/programacoes');
    },
    /** Confrontos de uma programação, com nome/foto/ao_vivo já resolvidos. */
    async confrontos(programacaoId) {
      return window.DmaiorAPI._get(window.DmaiorConfig.workers.admin, `/pk/confrontos?programacao_id=${encodeURIComponent(programacaoId)}`);
    },
    /** Ranking — informe programacao_id OU { data_inicio, data_fim }. */
    async ranking({ programacao_id, data_inicio, data_fim } = {}) {
      const qs = programacao_id
        ? `programacao_id=${encodeURIComponent(programacao_id)}`
        : `data_inicio=${encodeURIComponent(data_inicio)}&data_fim=${encodeURIComponent(data_fim)}`;
      return window.DmaiorAPI._get(window.DmaiorConfig.workers.admin, `/pk/ranking?${qs}`);
    },
  },

  // ── Módulo: Widget de Live ────────────────────────────────────────────────

  live: {
    /**
     * Busca a lista de streamers ao vivo cadastrados no KV do Worker de live.
     * Retorna array de objetos { nome, link, foto, stream_url, espectadores }.
     */
    async getLives() {
      return window.DmaiorAPI._get(
        window.DmaiorConfig.workers.live,
        '/api/lives',
      );
    },

    /**
     * Faz proxy de uma URL externa (página Kwai) via Worker de live.
     * Usado como fallback para obter stream_url quando o KV não tem o campo.
     * @param {string} url - URL da página Kwai a ser proxiada
     * @returns {Promise<string|null>} HTML da página ou null se falhar
     */
    async proxy(url) {
      try {
        const base = window.DmaiorConfig.workers.live.replace(/\/$/, '');
        const res  = await fetch(`${base}/?${encodeURIComponent(url)}`, {
          signal: AbortSignal.timeout(15000),
        });
        if (!res.ok) return null;
        const text = await res.text();
        return text.length > 200 ? text : null;
      } catch (_) { return null; }
    },
  },

  // ── Módulo: Notificações Push ────────────────────────────────────────────
  // Auth = mesmo access_token do Supabase Auth (dm_token) já usado no painel.
  // O worker deriva a identidade sozinho — nunca mandamos uid/kwai_uid daqui.
  push: {
    _auth(token) { return token ? { Authorization: `Bearer ${token}` } : {}; },

    /** Chave pública VAPID (para PushManager.subscribe). Público, sem auth. */
    async vapidPublicKey() {
      return window.DmaiorAPI._get(window.DmaiorConfig.workers.push, '/vapid-public-key');
    },

    /** Registra/atualiza este aparelho. sub = PushSubscription.toJSON(). */
    async subscribe(token, sub) {
      return window.DmaiorAPI._post(
        window.DmaiorConfig.workers.push, '/subscribe',
        { subscription: sub }, window.DmaiorAPI.push._auth(token),
      );
    },

    /** Revoga um aparelho. ref = { endpoint } ou { endpoint_hash }. */
    async unsubscribe(token, ref) {
      return window.DmaiorAPI._post(
        window.DmaiorConfig.workers.push, '/unsubscribe',
        ref || {}, window.DmaiorAPI.push._auth(token),
      );
    },

    /** Lista os aparelhos registrados do streamer (sanitizado). */
    async devices(token) {
      return window.DmaiorAPI._get(
        window.DmaiorConfig.workers.push, '/devices',
        window.DmaiorAPI.push._auth(token),
      );
    },

    /** Dispara um push de teste para o próprio streamer. */
    async test(token) {
      return window.DmaiorAPI._post(
        window.DmaiorConfig.workers.push, '/test',
        {}, window.DmaiorAPI.push._auth(token),
      );
    },

    /** Histórico de notificações. params ex: '?limit=20&before=<ISO>'. */
    async notifications(token, params = '') {
      return window.DmaiorAPI._get(
        window.DmaiorConfig.workers.push, `/notifications${params}`,
        window.DmaiorAPI.push._auth(token),
      );
    },

    /** Contador de não lidas (sino). */
    async unreadCount(token) {
      return window.DmaiorAPI._get(
        window.DmaiorConfig.workers.push, '/unread-count',
        window.DmaiorAPI.push._auth(token),
      );
    },

    /** Marca uma notificação como lida. */
    async markRead(token, id) {
      return window.DmaiorAPI._post(
        window.DmaiorConfig.workers.push, `/notifications/${encodeURIComponent(id)}/read`,
        {}, window.DmaiorAPI.push._auth(token),
      );
    },

    /** Marca todas as visíveis como lidas. */
    async markAllRead(token) {
      return window.DmaiorAPI._post(
        window.DmaiorConfig.workers.push, '/notifications/read-all',
        {}, window.DmaiorAPI.push._auth(token),
      );
    },
  },
};
