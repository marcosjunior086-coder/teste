/**
 * storage.js — Wrapper seguro para o localStorage da DMaior Agency
 * Todas as operações verificam se window existe antes de acessar o localStorage,
 * evitando erros em ambientes SSR ou Worker.
 */

const Storage = {

  /**
   * Lê um valor do localStorage.
   * @param {string} key - Chave a ser lida
   * @returns {string|null} Valor armazenado ou null se não existir
   */
  get(key) {
    if (typeof window === 'undefined') return null;
    try { return localStorage.getItem(key); } catch { return null; }
  },

  /**
   * Salva um valor no localStorage.
   * @param {string} key - Chave
   * @param {string} value - Valor (string)
   */
  set(key, value) {
    if (typeof window === 'undefined') return;
    try { localStorage.setItem(key, String(value)); } catch {}
  },

  /**
   * Remove uma chave do localStorage.
   * @param {string} key - Chave a remover
   */
  remove(key) {
    if (typeof window === 'undefined') return;
    try { localStorage.removeItem(key); } catch {}
  },

  /**
   * Lê e faz parse de um valor JSON armazenado.
   * @param {string} key - Chave
   * @param {*} fallback - Valor padrão se não existir ou erro de parse
   */
  getJSON(key, fallback = null) {
    if (typeof window === 'undefined') return fallback;
    try {
      const val = localStorage.getItem(key);
      return val ? JSON.parse(val) : fallback;
    } catch { return fallback; }
  },

  /**
   * Salva um objeto como JSON no localStorage.
   * @param {string} key - Chave
   * @param {*} value - Valor a serializar
   */
  setJSON(key, value) {
    if (typeof window === 'undefined') return;
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  },

  /**
   * Limpa completamente o localStorage.
   * Use com cuidado — apaga tudo.
   */
  clear() {
    if (typeof window === 'undefined') return;
    try { localStorage.clear(); } catch {}
  },
};

// Nota: NÃO expor como window.Storage pois conflita com a interface nativa do browser.
// Storage é usado diretamente pelos scripts que carregam após este arquivo.
