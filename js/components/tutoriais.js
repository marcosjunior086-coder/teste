/**
 * tutoriais.js — Cards de tutoriais em vídeo (Google Drive)
 *
 * Custom Element: <dmaior-tutoriais>
 * Shadow DOM, sem chamadas de API. Cópia fiel ao original.
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
    this.shadowRoot.innerHTML = `
    <style>
      :host{display:block;width:100%;background:transparent}
      .container{display:flex;flex-wrap:wrap;gap:25px;justify-content:center;padding:20px;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif}
      .card{background:rgba(255,255,255,0.03);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,0.1);border-radius:16px;width:300px;padding:40px 20px;text-align:center;transition:all 0.4s cubic-bezier(0.175,0.885,0.32,1.275);cursor:pointer;text-decoration:none;display:flex;flex-direction:column;align-items:center}
      .card:hover{background:rgba(255,255,255,0.08);transform:translateY(-8px);border-color:#00A8FF;box-shadow:0 10px 30px rgba(0,0,0,0.3)}
      .icon-wrapper{width:64px;height:64px;background:rgba(0,168,255,0.1);border-radius:50%;display:flex;align-items:center;justify-content:center;margin-bottom:20px;transition:0.3s}
      .card:hover .icon-wrapper{background:#00A8FF}
      .icon-svg{width:32px;height:32px;fill:#FFFFFF;transition:0.3s}
      .title{color:#FFFFFF;font-size:16px;font-weight:600;margin:0;text-transform:uppercase;letter-spacing:1.5px}
      .subtitle{color:rgba(255,255,255,0.5);font-size:12px;margin-top:8px;font-weight:400}
      @media(max-width:600px){.card{width:100%;max-width:340px}}
    </style>
    <div class="container">
      <a href="https://drive.google.com/file/d/1ywFAzGnmj4xyhs_p8sPWWZUWSx3FzCVj/view?usp=drive_link" target="_blank" rel="noopener noreferrer" class="card">
        <div class="icon-wrapper">
          <svg class="icon-svg" viewBox="0 0 24 24"><path d="M15,14C12.33,14 7,15.33 7,18V20H23V18C23,15.33 17.67,14 15,14M6,10V7H4V10H1V12H4V15H6V12H9V10M15,12A4,4 0 0,0 19,8A4,4 0 0,0 15,4A4,4 0 0,0 11,8A4,4 0 0,0 15,12Z"/></svg>
        </div>
        <h3 class="title">Como Aceitar Convite</h3>
        <span class="subtitle">Clique para ver o tutorial</span>
      </a>
      <a href="https://drive.google.com/file/d/1WV08AveTDUVlyyTVRMAx9sTikH2KiyP_/view?usp=drive_link" target="_blank" rel="noopener noreferrer" class="card">
        <div class="icon-wrapper">
          <svg class="icon-svg" viewBox="0 0 24 24"><path d="M21,18H3V6H21V18M19,16V8H5V16H19M11,10H13V14H11V10M9,10H10V14H9V10M14,10H15V14H14V10M2,4H22V6H2V4M2,18H22V20H2V18Z"/></svg>
        </div>
        <h3 class="title">Como Efetuar Saque</h3>
        <span class="subtitle">Clique para ver o tutorial</span>
      </a>
    </div>`;
    window.DMaiorPrefs?.bind(this.shadowRoot);
  }
}

customElements.define('dmaior-tutoriais', DmaiorTutoriais);
