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
    recarga:     'https://recarga-dmaior.agencydmaior.com.br',
    rank:        'https://rank.agencydmaior.com.br',
    admin:       'https://admin.agencydmaior.com.br',
    dashboard:   'https://dashboard.agencydmaior.com.br',
    live:        'https://live.agencydmaior.com.br',
    pk:          'https://pk.agencydmaior.com.br',
    recrutamento:'https://recrutamento.agencydmaior.com.br',
    impulso:     'https://impulsionamento.agencydmaior.com.br',
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
      throw new Error(err.mensagem || err.erro || `HTTP ${res.status}`);
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

  // ── Módulo: Recarga de Diamantes ──────────────────────────────────────────

  recarga: {
    /**
     * Valida o ID de um perfil do Kwai.
     * @param {string} kwaiId - ID do Kwai informado pelo usuário
     * @param {string} sessionId - ID único da sessão de recarga
     */
    async validateId(kwaiId, sessionId) {
      return window.DmaiorAPI._post(
        window.DmaiorConfig.workers.recarga,
        '/validate-id',
        { kwai_id: kwaiId },
        { 'X-DM-Origin': 'hostinger-v1', 'X-Session-ID': sessionId },
      );
    },

    /**
     * Consulta o preço de uma quantidade de diamantes.
     * @param {number} diamantes - Quantidade de diamantes
     * @param {string} sessionId - ID da sessão
     */
    async getPrice(diamantes, sessionId) {
      return window.DmaiorAPI._post(
        window.DmaiorConfig.workers.recarga,
        '/get-price',
        { diamantes },
        { 'X-DM-Origin': 'hostinger-v1', 'X-Session-ID': sessionId },
      );
    },

    /**
     * Cria uma ordem de pagamento PIX.
     * @param {object} dados - { kwai_id, diamantes, whatsapp }
     * @param {string} sessionId - ID da sessão
     */
    async createOrder({ kwai_id, diamantes, whatsapp }, sessionId) {
      return window.DmaiorAPI._post(
        window.DmaiorConfig.workers.recarga,
        '/create-order',
        { kwai_id, diamantes, whatsapp },
        { 'X-DM-Origin': 'hostinger-v1', 'X-Session-ID': sessionId },
      );
    },

    /**
     * Verifica o status de um pagamento EnjoyPayment.
     * @param {string} epRef - Referência EnjoyPayment
     * @param {string} epHash - Hash EnjoyPayment
     * @param {string} sessionId - ID da sessão
     */
    async checkStatus(epRef, epHash, sessionId) {
      return window.DmaiorAPI._post(
        window.DmaiorConfig.workers.recarga,
        '/check-status',
        { ep_ref: epRef, ep_hash: epHash },
        { 'X-DM-Origin': 'hostinger-v1', 'X-Session-ID': sessionId },
      );
    },
  },

  // ── Módulo: Ranking ───────────────────────────────────────────────────────

  rank: {
    /** Gera header Authorization Bearer para o ranking */
    _auth(token) {
      return token ? { Authorization: `Bearer ${token}` } : {};
    },

    /**
     * Autentica com senha para acessar o ranking.
     * @param {string} senha - Senha do ranking
     */
    async login(senha) {
      return window.DmaiorAPI._post(
        window.DmaiorConfig.workers.rank,
        '/login',
        { senha },
      );
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
    /** Busca perfil Kwai/Voyager pelo UID antes do cadastro. */
    async buscarPerfil(uid) {
      return window.DmaiorAPI._post(window.DmaiorConfig.workers.admin, '/candidatura/buscar-perfil', { uid });
    },
    /** Envia candidatura completa com perfil confirmado. */
    async enviar({ uid, nome, whatsapp, categoria, recrutador_id, aceite }) {
      return window.DmaiorAPI._post(window.DmaiorConfig.workers.admin, '/candidatura/enviar', { uid, nome, whatsapp, categoria, recrutador_id, aceite });
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
};
