/**
 * ferramentas.js — Cards de ferramentas externas úteis pro streamer
 *
 * Custom Element: <dmaior-ferramentas>
 * Shadow DOM, sem chamadas de API. Segue o mesmo padrão visual de tutoriais.js.
 */

class DmaiorFerramentas extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.render();
    this.bind();
  }

  render() {
    this.shadowRoot.innerHTML = `
    <style>
      :host{display:block;width:100%;background:transparent;color:var(--dm-text,#e2e8f0)}
      .container{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:12px;max-width:620px;margin:0 auto;padding:10px;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif}
      .card{position:relative;background:var(--dm-bg-card,rgba(255,255,255,.06));backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);border:1px solid var(--dm-cyan-border,rgba(0,168,255,.15));border-radius:12px;padding:18px 10px;text-align:center;transition:all 0.25s ease;cursor:pointer;text-decoration:none;display:flex;flex-direction:column;align-items:center}
      .card:hover{background:var(--dm-cyan-08,rgba(0,168,255,.08));transform:translateY(-4px);border-color:var(--dm-cyan,#00A8FF);box-shadow:0 6px 18px rgba(0,0,0,0.15)}
      .icon-wrapper{width:42px;height:42px;background:var(--dm-cyan-10,rgba(0,168,255,.1));border-radius:50%;display:flex;align-items:center;justify-content:center;margin-bottom:10px;transition:0.25s;flex-shrink:0}
      .card:hover .icon-wrapper{background:var(--dm-cyan-20,rgba(0,168,255,.2))}
      .icon-svg{width:20px;height:20px;fill:var(--dm-cyan,#00A8FF);transition:0.25s}
      .title{color:var(--dm-text,#FFFFFF);font-size:11.5px;font-weight:600;margin:0;text-transform:uppercase;letter-spacing:0.8px;line-height:1.3}
      .subtitle{color:var(--dm-text-muted,rgba(255,255,255,0.5));font-size:10px;margin-top:4px;font-weight:400;line-height:1.3}

      .floating-menu{display:none;flex-direction:column;gap:3px;position:absolute;top:calc(100% + 8px);left:50%;transform:translateX(-50%);min-width:180px;background:#0d1520;border:1px solid rgba(255,255,255,0.15);border-radius:10px;padding:6px;box-shadow:0 12px 30px rgba(0,0,0,0.45);z-index:20;text-align:left}
      .floating-menu.aberto{display:flex}
      .floating-link{display:flex;align-items:center;gap:7px;color:#fff;text-decoration:none;font-size:12px;font-weight:600;padding:8px 10px;border-radius:7px;transition:background .2s}
      .floating-link:hover{background:rgba(0,168,255,0.18)}
      .floating-link svg{width:14px;height:14px;fill:#00A8FF;flex-shrink:0}
    </style>
    <div class="container">
      <div class="card" id="cardLivePC">
        <div class="icon-wrapper">
          <svg class="icon-svg" viewBox="0 0 24 24"><path d="M21,16H3V4H21M21,2H3C1.89,2 1,2.89 1,4V16A2,2 0 0,0 3,18H10V20H8V22H16V20H14V18H21A2,2 0 0,0 23,16V4C23,2.89 22.1,2 21,2Z"/></svg>
        </div>
        <h3 class="title">Live no PC</h3>
        <span class="subtitle">Kwai Studio e OBS</span>
        <div class="floating-menu" id="menuLivePC">
          <a href="https://studio.kwai.com/user/login?redirect=%2Flive%2Flist&source=" target="_blank" rel="noopener noreferrer" class="floating-link">
            <svg viewBox="0 0 24 24"><path d="M10,8L16,12L10,16V8Z"/></svg>
            Kwai Studio
          </a>
          <a href="https://obsproject.com/pt-br/download" target="_blank" rel="noopener noreferrer" class="floating-link">
            <svg viewBox="0 0 24 24"><path d="M5,20H19V18H5M19,9H15V3H9V9H5L12,16L19,9Z"/></svg>
            Baixar OBS
          </a>
        </div>
      </div>

      <a href="sorteios.html" class="card">
        <div class="icon-wrapper">
          <svg class="icon-svg" viewBox="0 0 24 24"><path d="M6,3A3,3 0 0,0 3,6V18A3,3 0 0,0 6,21H18A3,3 0 0,0 21,18V6A3,3 0 0,0 18,3H6M7,6.5A1.5,1.5 0 0,1 8.5,8A1.5,1.5 0 0,1 7,9.5A1.5,1.5 0 0,1 5.5,8A1.5,1.5 0 0,1 7,6.5M17,6.5A1.5,1.5 0 0,1 18.5,8A1.5,1.5 0 0,1 17,9.5A1.5,1.5 0 0,1 15.5,8A1.5,1.5 0 0,1 17,6.5M12,10.5A1.5,1.5 0 0,1 13.5,12A1.5,1.5 0 0,1 12,13.5A1.5,1.5 0 0,1 10.5,12A1.5,1.5 0 0,1 12,10.5M7,14.5A1.5,1.5 0 0,1 8.5,16A1.5,1.5 0 0,1 7,17.5A1.5,1.5 0 0,1 5.5,16A1.5,1.5 0 0,1 7,14.5M17,14.5A1.5,1.5 0 0,1 18.5,16A1.5,1.5 0 0,1 17,17.5A1.5,1.5 0 0,1 15.5,16A1.5,1.5 0 0,1 17,14.5Z"/></svg>
        </div>
        <h3 class="title">Sorteios</h3>
        <span class="subtitle">Geral, rifa e por ID Kwai</span>
      </a>
    </div>`;
    window.DMaiorPrefs?.bind(this.shadowRoot);
  }

  bind() {
    const s = this.shadowRoot;
    const cardLivePC = s.getElementById('cardLivePC');
    const menuLivePC = s.getElementById('menuLivePC');
    cardLivePC.addEventListener('click', (e) => {
      e.stopPropagation();
      menuLivePC.classList.toggle('aberto');
    });
    menuLivePC.addEventListener('click', (e) => e.stopPropagation());
    document.addEventListener('click', () => menuLivePC.classList.remove('aberto'));
  }
}

customElements.define('dmaior-ferramentas', DmaiorFerramentas);
