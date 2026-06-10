/**
 * helpers.js — Funções utilitárias reutilizáveis da DMaior Agency
 * Contém formatadores, timers, áudio e sanitização de dados.
 */

// ── SOM GLOBAL — singleton AudioContext ──────────────────────────────────────
// AudioContext criado uma única vez na primeira interação — zero delay a partir daí.
(function () {
  let _ctx = null;

  function _getCtx() {
    if (!_ctx) _ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (_ctx.state === 'suspended') _ctx.resume();
    return _ctx;
  }

  window.dmPlayClick = function () {
    try {
      const ctx  = _getCtx();
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      const now  = ctx.currentTime;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(650, now);
      osc.frequency.exponentialRampToValueAtTime(150, now + 0.08);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.08);
    } catch {}
  };

  // Listener global — captura cliques em botões e links de TODO o sistema,
  // incluindo dentro de Shadow DOM (via composedPath).
  document.addEventListener('click', function (e) {
    const path = e.composedPath();
    for (let i = 0; i < path.length; i++) {
      const el = path[i];
      if (!el || !el.tagName) continue;
      const tag = el.tagName.toUpperCase();
      if (tag === 'BUTTON' || tag === 'A') { window.dmPlayClick(); return; }
      if (tag === 'INPUT' && el.type === 'submit') { window.dmPlayClick(); return; }
      if (el.classList && (
        el.classList.contains('btn') ||
        el.classList.contains('ni') ||
        el.classList.contains('nav-link') ||
        el.classList.contains('dd-link') ||
        el.classList.contains('menu-item') ||
        el.classList.contains('dp-item') ||
        el.classList.contains('floating-btn') ||
        el.classList.contains('premio-tipo-tab') ||
        el.classList.contains('radio-opt') ||
        el.classList.contains('com-toggle') ||
        el.classList.contains('bloq-rev')
      )) { window.dmPlayClick(); return; }
      // Para quando sai dos elementos interativos (evita percorrer o DOM inteiro)
      if (tag === 'BODY' || tag === 'HTML') break;
    }
  }, true); // capture: true garante execução antes de qualquer handler nos componentes
})();

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

  playClickSound() { window.dmPlayClick?.(); },

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
