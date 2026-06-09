/**
 * helpers.js — Funções utilitárias reutilizáveis da DMaior Agency
 * Contém formatadores, timers, áudio e sanitização de dados.
 */

const Helpers = {

  /**
   * Formata segundos no formato MM:SS (ex: 7200 → "02:00:00").
   * @param {number} segundos - Total de segundos
   * @returns {string} Tempo formatado
   */
  formatCountdown(segundos) {
    const h = Math.floor(segundos / 3600);
    const m = Math.floor((segundos % 3600) / 60);
    const s = segundos % 60;
    const pad = n => String(n).padStart(2, '0');
    return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
  },

  /**
   * Formata número como moeda BRL (R$ 1.234,56).
   * @param {number} valor - Valor numérico
   * @returns {string} String formatada
   */
  formatBRL(valor) {
    return Number(valor).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  },

  /**
   * Formata número com separador de milhar (pt-BR).
   * @param {number} num - Número
   * @returns {string} Número formatado
   */
  formatNumber(num) {
    return Number(num).toLocaleString('pt-BR');
  },

  /**
   * Converte string de horas "HH:MM" para minutos.
   * @param {string} t - Ex: "3:45"
   * @returns {number} Total de minutos
   */
  horasParaMinutos(t) {
    if (!t || !t.includes(':')) return 0;
    const [h, m] = t.split(':');
    return (parseInt(h, 10) * 60) + parseInt(m, 10);
  },

  /**
   * Debounce: atrasa execução da função até o usuário parar de chamar.
   * @param {Function} fn - Função a atrasar
   * @param {number} delay - Milissegundos
   * @returns {Function} Função com debounce aplicado
   */
  debounce(fn, delay = 400) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  },

  /**
   * Sanitiza texto para evitar XSS (escapa HTML).
   * Use antes de inserir conteúdo dinâmico no innerHTML.
   * @param {string} str - Texto bruto
   * @param {number} maxLen - Comprimento máximo (padrão 200)
   * @returns {string} Texto sanitizado
   */
  sanitizeText(str, maxLen = 200) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
      .substring(0, maxLen);
  },

  /**
   * Sanitiza URL: permite apenas http e https.
   * @param {string} url - URL bruta
   * @returns {string} URL segura ou string vazia
   */
  sanitizeURL(url) {
    try {
      const u = new URL(String(url || ''));
      return ['http:', 'https:'].includes(u.protocol) ? u.href : '';
    } catch { return ''; }
  },

  /**
   * Toca o som de clique característico da DMaior Agency.
   * Usa Web Audio API nativa — sem dependências externas.
   */
  playClickSound() {
    try {
      const ctx  = new (window.AudioContext || window.webkitAudioContext)();
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(650, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } catch { /* navegador sem suporte a AudioContext */ }
  },

  /**
   * Aguarda N milissegundos (usado com async/await).
   * @param {number} ms - Milissegundos
   * @returns {Promise<void>}
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  /**
   * Faz scroll suave até o topo da página.
   */
  scrollTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },
};
