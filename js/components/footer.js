/**
 * footer.js — Rodapé global da DMaior Agency
 *
 * Custom Element: <dmaior-footer>
 *
 * Exibe: logo, contato, redes sociais, links legais e copyright.
 * Responde ao sistema de temas via CSS custom properties (var()).
 * Sem chamadas de API — componente puramente visual.
 */

class DmaiorFooter extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.render();
  }

  render() {
    const ANO = new Date().getFullYear();

    // SVG Instagram
    const SVG_INSTA = `<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/></svg>`;

    // SVG Kwai (ícone genérico de play/vídeo como substituto)
    const SVG_KWAI = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5"/><polygon points="10 8 16 12 10 16 10 8" fill="currentColor" stroke="none"/></svg>`;

    // URL do logo (mesmo do menu)
    const URL_LOGO = 'https://static.wixstatic.com/media/ac74b3_a9a577806ac34acbb663f4cd05e8c70f~mv2.png';

    this.shadowRoot.innerHTML = `
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@600;700&family=Exo+2:wght@300;400;600&display=swap');
        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
        :host { display:block; width:100%; }

        /* ── Wrapper principal ── */
        .footer {
          background: var(--dm-grad-card, linear-gradient(160deg,#1a1a2e 0%,#12121f 100%));
          border-top: 1px solid var(--dm-border, rgba(0,212,212,.15));
          font-family: 'Exo 2', sans-serif;
          color: var(--dm-text-sub, #a0b8c8);
          padding: 36px 24px 0;
        }

        /* ── Grade superior: logo | contato | redes | links ── */
        .footer-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 32px;
          max-width: 960px;
          margin: 0 auto;
          padding-bottom: 28px;
          border-bottom: 1px solid var(--dm-bw05, rgba(255,255,255,.05));
          align-items: flex-start;
        }

        /* Logo — coluna esquerda */
        .col-logo {
          flex: 0 0 auto;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .footer-logo {
          height: 42px;
          width: auto;
          max-width: 140px;
          object-fit: contain;
          display: block;
          filter: brightness(1);
          transition: filter .2s;
        }
        .footer-logo:hover { filter: brightness(1.15); }
        /* Temas claros: logo fica escura */
        :host-context([data-theme="branco"]) .footer-logo,
        :host-context([data-theme="rosa"]) .footer-logo,
        :host-context([data-theme="laranja"]) .footer-logo { filter: brightness(0); }
        :host-context([data-theme="branco"]) .footer-logo:hover,
        :host-context([data-theme="rosa"]) .footer-logo:hover,
        :host-context([data-theme="laranja"]) .footer-logo:hover { filter: brightness(0.2); }
        .col-logo p {
          font-size: .68rem;
          color: var(--dm-text-muted, #7a9ab4);
          letter-spacing: .5px;
          font-style: italic;
        }

        /* Colunas de conteúdo */
        .col {
          flex: 1 1 130px;
          min-width: 120px;
        }
        .col-title {
          font-family: 'Rajdhani', sans-serif;
          font-size: .72rem;
          font-weight: 700;
          color: var(--dm-text, #e0e8f0);
          text-transform: uppercase;
          letter-spacing: 2px;
          margin-bottom: 12px;
        }

        /* Contato */
        .contact-item {
          display: flex;
          align-items: center;
          gap: 7px;
          font-size: .8rem;
          color: var(--dm-text-sub, #a0b8c8);
          margin-bottom: 8px;
          text-decoration: none;
          transition: color .2s;
        }
        .contact-item:hover { color: var(--dm-cyan, #00d4d4); }
        .contact-item svg { flex-shrink: 0; }

        /* Ícones sociais */
        .social-row {
          display: flex;
          gap: 10px;
          align-items: center;
          flex-wrap: wrap;
        }
        .social-btn {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          background: var(--dm-bw05, rgba(255,255,255,.05));
          border: 1px solid var(--dm-bw10, rgba(255,255,255,.10));
          color: var(--dm-text-sub, #a0b8c8);
          display: flex;
          align-items: center;
          justify-content: center;
          text-decoration: none;
          transition: background .2s, color .2s, border-color .2s;
        }
        .social-btn:hover {
          background: var(--dm-cyan-10, rgba(0,212,212,.10));
          border-color: var(--dm-cyan-25, rgba(0,212,212,.25));
          color: var(--dm-cyan, #00d4d4);
        }
        .social-btn.kwai:hover {
          background: rgba(255,100,0,.1);
          border-color: rgba(255,100,0,.3);
          color: #ff6400;
        }

        /* Links legais */
        .legal-list {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .legal-list li a {
          font-size: .8rem;
          color: var(--dm-text-sub, #a0b8c8);
          text-decoration: underline;
          text-underline-offset: 2px;
          transition: color .2s;
        }
        .legal-list li a:hover { color: var(--dm-cyan, #00d4d4); }

        /* ── Barra de copyright ── */
        .footer-bottom {
          max-width: 960px;
          margin: 0 auto;
          padding: 14px 0 18px;
          text-align: center;
          font-size: .72rem;
          color: var(--dm-text-muted, #7a9ab4);
          letter-spacing: .3px;
        }
        .footer-bottom strong {
          color: var(--dm-text, #e0e8f0);
          font-weight: 600;
        }

        /* ── Responsivo ── */
        @media (max-width: 520px) {
          .footer-grid { gap: 22px; }
          .col-logo { width: 100%; }
        }
        /* Tema experimental: fonte nativa e hierarquia mais editorial. */
        :host-context([data-theme="teste-clean"]) * { font-family:var(--dm-font-body)!important;letter-spacing:0!important;text-transform:none!important;text-shadow:none!important;box-shadow:none!important;backdrop-filter:none!important; }
        :host-context([data-theme="teste-clean"]) .footer-title { text-transform:none!important; }
      </style>

      <footer class="footer">
        <div class="footer-grid">

          <!-- Logo + tagline -->
          <div class="col-logo">
            <img src="${URL_LOGO}" alt="DMaior Agency" class="footer-logo">
            <p>Agency - Lives</p>
          </div>

          <!-- Contato -->
          <div class="col">
            <div class="col-title">Contato</div>

            <a class="contact-item" href="tel:+5517997176407">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.59 3.44 2 2 0 0 1 3.56 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.53a16 16 0 0 0 6.29 6.29l.88-.88a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
              (17) 99717-6407
            </a>

            <a class="contact-item" href="mailto:dmaior.agency@gmail.com">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
              dmaior.agency@gmail.com
            </a>
          </div>

          <!-- Redes sociais -->
          <div class="col">
            <div class="col-title">Redes Sociais</div>
            <div class="social-row">
              <a class="social-btn" href="https://www.instagram.com/dmaioragency/" target="_blank" rel="noopener noreferrer" title="Instagram">
                ${SVG_INSTA}
              </a>
              <a class="social-btn kwai" href="https://www.kwai.com/@dmaioragency" target="_blank" rel="noopener noreferrer" title="Kwai">
                ${SVG_KWAI}
              </a>
            </div>
          </div>

          <!-- Links legais -->
          <div class="col">
            <ul class="legal-list">
              <li><a href="politicas.html">Política de Privacidade</a></li>
              <li><a href="politicas.html">Termos e Condições</a></li>
            </ul>
          </div>

        </div>

        <!-- Copyright -->
        <div class="footer-bottom">
          © ${ANO} - <strong>DMaior Agency</strong> · <strong>Todos os direitos reservados</strong>
        </div>
      </footer>
    `;
  }
}

customElements.define('dmaior-footer', DmaiorFooter);
