/**
 * router.js — Controle de navegação e proteção de rotas — DMaior Agency
 *
 * Como o Hostinger é hospedagem estática, cada "rota" é um arquivo HTML.
 * Este arquivo centraliza o mapeamento de caminhos e a proteção de páginas
 * que requerem login.
 *
 * O .htaccess na raiz cuida dos redirects de URL amigável → arquivo HTML.
 */

const Router = {

  // Mapa de rotas: caminho → arquivo HTML correspondente
  routes: {
    '/':                '/index.html',
    '/rank-geral':      '/ranking.html',
    '/recarga':         '/recarga.html',
    '/politicas':       '/politicas.html',
    '/tutoriais':       '/tutoriais.html',
    '/formulario':      '/recrutamento.html',
    '/painel-streamer': '/painel/index.html',
    '/admin':           '/admin/index.html',
  },

  // Rotas que exigem login — se o usuário não estiver logado, redireciona para a home
  protectedRoutes: [
    '/painel/',
    '/admin/',
    '/painel-streamer',
  ],

  /**
   * Navega para uma rota mapeada ou para um caminho direto.
   * @param {string} path - Rota desejada (ex: '/rank-geral')
   */
  navigate(path) {
    const destino = this.routes[path] || path;
    window.location.href = destino;
  },

  /**
   * Verifica se a página atual requer autenticação.
   * Deve ser chamado no DOMContentLoaded de páginas protegidas.
   */
  checkProtection() {
    if (typeof window === 'undefined') return;
    const path = window.location.pathname;
    const requerLogin = this.protectedRoutes.some(r => path.includes(r));
    if (requerLogin && !Auth.isLoggedIn()) {
      window.location.href = '/index.html?redirect=' + encodeURIComponent(path);
    }
  },

  /**
   * Obtém o parâmetro 'redirect' da URL atual (após login bem-sucedido).
   * @returns {string|null} Caminho de redirecionamento ou null
   */
  getRedirect() {
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(window.location.search);
    return params.get('redirect') || null;
  },
};

// Verifica proteção de rota ao carregar qualquer página
if (typeof window !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => Router.checkProtection());
}
