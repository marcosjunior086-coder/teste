/**
 * tutoriais.js — Cards de tutoriais em vídeo (Google Drive)
 *
 * Custom Element: <dmaior-tutoriais>
 * Shadow DOM, sem chamadas de API. Segue o mesmo padrão visual de ferramentas.js:
 * tudo em var(--dm-*) — reage sozinho aos 5 temas do site, sem listener próprio.
 */

class DmaiorTutoriais extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.render();
  }

  render() {
    const PLAY = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>`;
    const ICON_CONVITE = `<path d="M15,14C12.33,14 7,15.33 7,18V20H23V18C23,15.33 17.67,14 15,14M6,10V7H4V10H1V12H4V15H6V12H9V10M15,12A4,4 0 0,0 19,8A4,4 0 0,0 15,4A4,4 0 0,0 11,8A4,4 0 0,0 15,12Z"/>`;
    const ICON_SAQUE = `<path d="M21,18V19A2,2 0 0,1 19,21H5C3.89,21 3,20.1 3,19V5A2,2 0 0,1 5,3H19A2,2 0 0,1 21,5V6H12C10.89,6 10,6.9 10,8V16A2,2 0 0,1 12,18M12,16H22V8H12M16,13.5A1.5,1.5 0 0,1 14.5,12A1.5,1.5 0 0,1 16,10.5A1.5,1.5 0 0,1 17.5,12A1.5,1.5 0 0,1 16,13.5Z"/>`;

    this.shadowRoot.innerHTML = `
    <style>
      *{box-sizing:border-box}
      :host{display:block;width:100%;background:transparent;color:var(--dm-text,#e2e8f0)}

      .container{
        display:grid;
        grid-template-columns:repeat(auto-fit,minmax(260px,1fr));
        gap:18px;
        max-width:760px;
        margin:0 auto;
        padding:10px 4px 34px;
        font-family:var(--dm-font-body,'Exo 2','Segoe UI',Roboto,sans-serif);
      }

      .card{
        background:var(--dm-grad-card,rgba(255,255,255,.05));
        border:1px solid var(--dm-border,rgba(0,212,212,.16));
        border-radius:16px;
        padding:32px 22px;
        text-align:center;
        text-decoration:none;
        cursor:pointer;
        display:flex;flex-direction:column;align-items:center;
        transition:transform .25s ease,border-color .25s ease,background .25s ease,box-shadow .25s ease;
      }
      .card:hover{
        background:var(--dm-cyan-08,rgba(0,212,212,.08));
        transform:translateY(-5px);
        border-color:var(--dm-cyan,#00d4d4);
        box-shadow:0 12px 30px rgba(0,0,0,.25);
      }

      .icon-wrapper{
        width:62px;height:62px;flex-shrink:0;
        border-radius:50%;
        background:var(--dm-cyan-10,rgba(0,212,212,.1));
        border:1px solid var(--dm-cyan-20,rgba(0,212,212,.2));
        display:flex;align-items:center;justify-content:center;
        margin-bottom:16px;
        transition:background .25s ease;
      }
      .card:hover .icon-wrapper{background:var(--dm-cyan-20,rgba(0,212,212,.2))}
      .icon-svg{width:28px;height:28px;fill:var(--dm-cyan,#00d4d4)}

      .title{
        margin:0;
        font-family:var(--dm-font-title,'Rajdhani',sans-serif);
        font-size:1.05rem;font-weight:700;line-height:1.25;
        text-transform:uppercase;letter-spacing:.06em;
        color:var(--dm-text,#fff);
      }
      .subtitle{
        margin-top:8px;
        display:inline-flex;align-items:center;gap:6px;
        font-size:.8rem;font-weight:600;
        color:var(--dm-cyan,#00d4d4);
        text-transform:uppercase;letter-spacing:.05em;
      }
      .subtitle svg{width:12px;height:12px;fill:currentColor}

      @media(max-width:560px){
        .container{grid-template-columns:1fr;max-width:360px}
        .card{padding:26px 20px}
      }
    </style>

    <div class="container">
      <a href="https://drive.google.com/file/d/1ywFAzGnmj4xyhs_p8sPWWZUWSx3FzCVj/view?usp=drive_link" target="_blank" rel="noopener noreferrer" class="card">
        <div class="icon-wrapper">
          <svg class="icon-svg" viewBox="0 0 24 24">${ICON_CONVITE}</svg>
        </div>
        <h3 class="title">Como Aceitar Convite</h3>
        <span class="subtitle">${PLAY} Assistir tutorial</span>
      </a>
      <a href="https://drive.google.com/file/d/1WV08AveTDUVlyyTVRMAx9sTikH2KiyP_/view?usp=drive_link" target="_blank" rel="noopener noreferrer" class="card">
        <div class="icon-wrapper">
          <svg class="icon-svg" viewBox="0 0 24 24">${ICON_SAQUE}</svg>
        </div>
        <h3 class="title">Como Efetuar Saque</h3>
        <span class="subtitle">${PLAY} Assistir tutorial</span>
      </a>
    </div>`;
    window.DMaiorPrefs?.bind(this.shadowRoot);
  }
}

customElements.define('dmaior-tutoriais', DmaiorTutoriais);
