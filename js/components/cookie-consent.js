class DmaiorCookieConsent extends HTMLElement {
  connectedCallback() {
    if (localStorage.getItem('dm_cookies_ok') === '1') return;
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; }
        .banner {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          z-index: 99999;
          background: var(--dm-bg-panel, #0d1130);
          border-top: 1px solid var(--dm-cyan-20, rgba(0,200,200,.2));
          padding: 16px 20px;
          display: flex;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
          box-shadow: 0 -4px 24px rgba(0,0,0,.5);
          animation: slideUp .35s ease;
        }
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
        .txt {
          flex: 1;
          min-width: 220px;
          font-family: 'Exo 2', sans-serif;
          font-size: .85rem;
          color: var(--dm-text-sub, #a0aec0);
          line-height: 1.5;
        }
        .txt a {
          color: var(--dm-cyan, #00c8c8);
          text-decoration: none;
        }
        .txt a:hover { text-decoration: underline; }
        .actions {
          display: flex;
          gap: 10px;
          flex-shrink: 0;
        }
        .btn-accept {
          background: var(--dm-cyan, #00c8c8);
          color: #000;
          border: none;
          border-radius: 8px;
          padding: 10px 22px;
          font-family: 'Rajdhani', sans-serif;
          font-size: .95rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: .5px;
          cursor: pointer;
          transition: opacity .2s;
        }
        .btn-accept:hover { opacity: .85; }
        .btn-decline {
          background: transparent;
          color: var(--dm-text-muted, #718096);
          border: 1px solid var(--dm-border, rgba(255,255,255,.1));
          border-radius: 8px;
          padding: 10px 16px;
          font-family: 'Rajdhani', sans-serif;
          font-size: .9rem;
          cursor: pointer;
          transition: border-color .2s, color .2s;
        }
        .btn-decline:hover { border-color: var(--dm-text-muted, #718096); color: var(--dm-text, #e2e8f0); }
        @media (max-width: 480px) {
          .banner { flex-direction: column; align-items: flex-start; }
          .actions { width: 100%; }
          .btn-accept { flex: 1; text-align: center; }
        }
      </style>
      <div class="banner" role="dialog" aria-label="Aviso de cookies">
        <p class="txt">
          Usamos cookies e armazenamento local para melhorar sua experiência, manter sessão e personalizar conteúdo.
          Ao continuar navegando, você concorda com nossa <a href="/teste/politicas.html">Política de Privacidade</a>.
        </p>
        <div class="actions">
          <button class="btn-decline" id="btnDecline">Recusar</button>
          <button class="btn-accept"  id="btnAccept">Aceitar</button>
        </div>
      </div>
    `;
    window.DMaiorPrefs?.bind(this.shadowRoot);
    this.shadowRoot.getElementById('btnAccept').addEventListener('click', () => this._accept());
    this.shadowRoot.getElementById('btnDecline').addEventListener('click', () => this._decline());
  }

  _accept() {
    localStorage.setItem('dm_cookies_ok', '1');
    this._hide();
  }

  _decline() {
    // Não salva — aparece na próxima sessão (sessionStorage bloqueia na sessão atual)
    sessionStorage.setItem('dm_cookies_dismissed', '1');
    this._hide();
  }

  _hide() {
    const banner = this.shadowRoot?.querySelector('.banner');
    if (banner) {
      banner.style.animation = 'none';
      banner.style.transform = 'translateY(100%)';
      banner.style.transition = 'transform .3s ease';
      setTimeout(() => this.remove(), 300);
    }
  }
}

customElements.define('dmaior-cookie-consent', DmaiorCookieConsent);
