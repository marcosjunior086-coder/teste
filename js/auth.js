/**
 * auth.js — Gerenciamento de sessão e autenticação do usuário DMaior Agency
 *
 * Centraliza leitura, escrita e limpeza das chaves de sessão no localStorage.
 * Todas as operações são protegidas com verificação de window (SSR-safe).
 *
 * Chaves utilizadas: dm_uid, dm_token, dm_email, dm_foto, dm_nome
 */

const Auth = {

  // Chaves do localStorage — altere aqui se precisar renomear
  KEYS: {
    uid:   'dm_uid',
    token: 'dm_token',
    email: 'dm_email',
    foto:  'dm_foto',
    nome:  'dm_nome',
  },

  /**
   * Retorna os dados da sessão atual.
   * @returns {object|null} Sessão ou null se não logado
   */
  getSession() {
    if (typeof window === 'undefined') return null;
    try {
      const token = localStorage.getItem(this.KEYS.token);
      if (!token) return null;
      return {
        uid:   localStorage.getItem(this.KEYS.uid)   || '',
        token,
        email: localStorage.getItem(this.KEYS.email) || '',
        foto:  localStorage.getItem(this.KEYS.foto)  || '',
        nome:  localStorage.getItem(this.KEYS.nome)  || '',
      };
    } catch { return null; }
  },

  /**
   * Verifica se o usuário está logado (token presente).
   * @returns {boolean}
   */
  isLoggedIn() {
    return !!this.getSession();
  },

  /**
   * Salva a sessão no localStorage após login bem-sucedido.
   * Dispara o evento 'dmaior:auth' para atualizar os menus.
   * @param {object} dados - { uid, token, email, foto, nome }
   */
  saveSession({ uid, token, email, foto, nome }) {
    if (typeof window === 'undefined') return;
    try {
      if (uid)   localStorage.setItem(this.KEYS.uid, uid);
      if (token) localStorage.setItem(this.KEYS.token, token);
      if (email) localStorage.setItem(this.KEYS.email, email);
      if (foto)  localStorage.setItem(this.KEYS.foto, foto);
      if (nome)  localStorage.setItem(this.KEYS.nome, nome);

      // Notifica menus e componentes que o usuário logou
      window.dispatchEvent(new CustomEvent('dmaior:auth', {
        detail: { logado: true, foto: foto || '', nome: nome || '' },
      }));
    } catch {}
  },

  /**
   * Encerra a sessão: remove todas as chaves e notifica os componentes.
   */
  logout() {
    if (typeof window === 'undefined') return;
    try {
      Object.values(this.KEYS).forEach(k => localStorage.removeItem(k));

      // Notifica menus e componentes que o usuário deslogou
      window.dispatchEvent(new CustomEvent('dmaior:auth', {
        detail: { logado: false, foto: '', nome: '' },
      }));
      window.dispatchEvent(new CustomEvent('dmaior:logout'));
    } catch {}
  },

  /**
   * Registra listener global para o evento de logout disparado pelos menus.
   * Chamado automaticamente na inicialização (abaixo).
   */
  listenLogout() {
    if (typeof window === 'undefined') return;
    window.addEventListener('dmaior:logout', () => this.logout());
  },

  /**
   * Redireciona para a home se a página atual requer login e o usuário não está logado.
   * @param {string} redirectParam - Nome do parâmetro de redirect na URL (padrão: 'redirect')
   */
  protegerPagina(redirectParam = 'redirect') {
    if (typeof window === 'undefined') return;
    if (!this.isLoggedIn()) {
      const dest = encodeURIComponent(window.location.pathname);
      // Caminho relativo para funcionar tanto em GitHub Pages (/teste/) quanto em domínio raiz
      window.location.href = 'index.html?' + redirectParam + '=' + dest;
    }
  },
};

// Inicializa o listener de logout assim que o script carrega
if (typeof window !== 'undefined') {
  Auth.listenLogout();
  // Expõe Auth globalmente para que painel/admin possam verificar window.Auth
  window.Auth = Auth;
}
