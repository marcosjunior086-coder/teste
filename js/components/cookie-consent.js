/**
 * cookie-consent.js — Consentimento de cookies / armazenamento (LGPD)
 *
 * O site NÃO usa Google Analytics, Meta Pixel nem rastreadores de marketing.
 * A medição de audiência é o Cloudflare Web Analytics, que é agregado e não
 * usa cookies. O único recurso não essencial que depende de consentimento é
 * o conteúdo incorporado de terceiros — os vídeos do Vimeo na área de cursos.
 *
 * Modelo:
 *   - Essenciais (sessão, preferências): sempre ativos, não dependem de escolha.
 *   - "Conteúdo incorporado" (Vimeo): opt-in explícito.
 *   - "Aceitar"  → { embeds: true }
 *   - "Só essenciais" → { embeds: false }  — PERSISTE, não volta a perguntar.
 *   - Rodapé "Gerenciar cookies" → reabre a escolha (DMaiorConsent.open()).
 *
 * O consentimento é gravado com versão e data (localStorage 'dm_consent') para
 * servir de prova. Nada é enviado a servidores.
 *
 * API global (pronta antes de o banner renderizar):
 *   window.DMaiorConsent.decided()        -> bool  (já escolheu?)
 *   window.DMaiorConsent.allows('embeds') -> bool
 *   window.DMaiorConsent.get()            -> {v,embeds,ts} | null
 *   window.DMaiorConsent.set(embeds)      -> grava + dispara evento
 *   window.DMaiorConsent.open()           -> mostra o banner de novo
 * Evento: window 'dmaior:consent'  detail: { embeds }
 */
(function () {
  var KEY = 'dm_consent';
  var VERSION = 1;

  function ler() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) {
        var o = JSON.parse(raw);
        if (o && typeof o.embeds === 'boolean') return o;
      }
      // Migração do modelo antigo: quem já tinha clicado "Aceitar" no banner
      // anterior (dm_cookies_ok === '1') mantém a escolha de aceitar.
      if (localStorage.getItem('dm_cookies_ok') === '1') {
        var mig = { v: VERSION, embeds: true, ts: new Date().toISOString(), migrado: true };
        try { localStorage.setItem(KEY, JSON.stringify(mig)); } catch (e) {}
        return mig;
      }
    } catch (e) {}
    return null;
  }

  function gravar(embeds) {
    var rec = { v: VERSION, embeds: !!embeds, ts: new Date().toISOString() };
    try { localStorage.setItem(KEY, JSON.stringify(rec)); } catch (e) {}
    // Compat com código que ainda leia a chave antiga.
    try { localStorage.setItem('dm_cookies_ok', embeds ? '1' : '0'); } catch (e) {}
    try { window.dispatchEvent(new CustomEvent('dmaior:consent', { detail: { embeds: !!embeds } })); } catch (e) {}
    return rec;
  }

  window.DMaiorConsent = {
    get: ler,
    decided: function () { return !!ler(); },
    allows: function (cat) {
      if (cat === 'essential') return true;
      var c = ler();
      if (cat === 'embeds') return !!(c && c.embeds);
      return false;
    },
    set: function (embeds) {
      var r = gravar(embeds);
      var el = document.querySelector('dmaior-cookie-consent');
      if (el && el._hide) el._hide();
      return r;
    },
    open: function () {
      var el = document.querySelector('dmaior-cookie-consent');
      if (!el) { el = document.createElement('dmaior-cookie-consent'); document.body.appendChild(el); }
      if (el._show) el._show();
    },
  };

  var CSS = `
    :host { display: block; }
    .banner {
      position: fixed; bottom: 0; left: 0; right: 0; z-index: 99999;
      background: var(--dm-bg-panel, #0d1130);
      border-top: 1px solid var(--dm-cyan-20, rgba(0,200,200,.2));
      padding: 16px 20px; display: flex; align-items: center; gap: 16px;
      flex-wrap: wrap; box-shadow: 0 -4px 24px rgba(0,0,0,.5);
      transform: translateY(0); transition: transform .35s ease;
    }
    .banner.enter { transform: translateY(100%); }
    .txt {
      flex: 1; min-width: 240px;
      font-family: var(--dm-font-body,'Exo 2',sans-serif);
      color: var(--dm-text-sub, #a0aec0); line-height: 1.5;
    }
    .txt strong {
      display: block; color: var(--dm-text, #e2e8f0);
      font-family: var(--dm-font-title,'Rajdhani',sans-serif);
      font-size: .95rem; text-transform: uppercase; letter-spacing: .5px; margin-bottom: 4px;
    }
    .txt p { font-size: .82rem; margin: 0; }
    .txt a { color: var(--dm-cyan, #00c8c8); text-decoration: none; }
    .txt a:hover { text-decoration: underline; }
    .actions { display: flex; gap: 10px; flex-shrink: 0; }
    button {
      border-radius: 8px; cursor: pointer;
      font-family: var(--dm-font-title,'Rajdhani',sans-serif); font-size: .92rem;
      transition: opacity .2s, border-color .2s, color .2s;
    }
    .btn-accept {
      background: var(--dm-cyan, #00c8c8); color: #000; border: none;
      padding: 10px 22px; font-weight: 700; text-transform: uppercase; letter-spacing: .5px;
    }
    .btn-accept:hover { opacity: .85; }
    .btn-decline {
      background: transparent; color: var(--dm-text-muted, #718096);
      border: 1px solid var(--dm-border, rgba(255,255,255,.14)); padding: 10px 16px;
    }
    .btn-decline:hover { border-color: var(--dm-text-muted, #718096); color: var(--dm-text, #e2e8f0); }
    @media (max-width: 520px) {
      .banner { flex-direction: column; align-items: stretch; }
      .actions { width: 100%; }
      .actions button { flex: 1; text-align: center; }
    }
  `;

  var HTML = `
    <div class="banner enter" role="dialog" aria-label="Aviso de cookies" aria-live="polite">
      <div class="txt">
        <strong>Sua privacidade</strong>
        <p>Usamos armazenamento local apenas para o site funcionar (sua sessão e preferências) e medição de audiência <b>sem cookies</b>. Se você <b>aceitar</b>, também liberamos vídeos incorporados do Vimeo na área de cursos. Detalhes na <a href="politicas.html">Política de Privacidade</a>.</p>
      </div>
      <div class="actions">
        <button class="btn-decline" id="dm-cc-no">Só essenciais</button>
        <button class="btn-accept"  id="dm-cc-yes">Aceitar</button>
      </div>
    </div>
  `;

  class DmaiorCookieConsent extends HTMLElement {
    connectedCallback() {
      if (ler()) return;                 // já escolheu — não mostra
      this._build();
    }
    _build() {
      if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
      this.shadowRoot.innerHTML = '<style>' + CSS + '</style>' + HTML;
      var b = this.shadowRoot.querySelector('.banner');
      requestAnimationFrame(function () { if (b) b.classList.remove('enter'); });
      var self = this;
      this.shadowRoot.getElementById('dm-cc-yes').addEventListener('click', function () { gravar(true);  self._hide(); });
      this.shadowRoot.getElementById('dm-cc-no').addEventListener('click',  function () { gravar(false); self._hide(); });
      if (window.DMaiorPrefs && window.DMaiorPrefs.bind) window.DMaiorPrefs.bind(this.shadowRoot);
    }
    _show() { this._build(); }
    _hide() {
      var b = this.shadowRoot && this.shadowRoot.querySelector('.banner');
      if (!b) { return; }
      b.style.transform = 'translateY(110%)';
      var sr = this.shadowRoot;
      setTimeout(function () { sr.innerHTML = ''; }, 360);
    }
  }

  if (!customElements.get('dmaior-cookie-consent')) {
    customElements.define('dmaior-cookie-consent', DmaiorCookieConsent);
  }
})();
