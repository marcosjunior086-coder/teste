/* eslint-env browser */
class PainelPK extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.estado = null;
  }

  static get observedAttributes() {
    return ['estado-painel'];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'estado-painel' && newValue) {
      try {
        this.estado = JSON.parse(newValue);
        this.render();
      } catch (e) {
        console.error("Erro ao fazer parse do estado", e);
      }
    }
  }

  connectedCallback() {
    if (!this.estado) this.render();
  }

  despacharAcao(acao, valor) {
    this.dispatchEvent(new CustomEvent('acaoui', { detail: { acao, valor } }));
  }

  render() {
    const estilo = `
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@700;800;900&family=Exo+2:wght@600;700;800;900&family=Rajdhani:wght@600;700&display=swap');
        :host { display: block; width: 100%; min-height: 100vh; background: linear-gradient(180deg, #060B18 0%, #0C1428 50%, #060B18 100%); position: relative; overflow: hidden; }
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        .app { font-family: 'Nunito', sans-serif; color: #F8FAFC; width: 100%; position: relative; padding: 20px 10px 40px; }
        
        .waves-bg { position: fixed; inset: 0; pointer-events: none; z-index: 0; overflow: hidden; }
        .wave-svg { width: 100%; position: absolute; opacity: .06; }
        .wave-svg.w1 { bottom: -10%; animation: waveMove 8s ease-in-out infinite; }
        .wave-svg.w2 { bottom: -20%; animation: waveMove 12s ease-in-out infinite reverse; opacity: .04; }
        .wave-svg.w3 { bottom: -5%;  animation: waveMove 6s ease-in-out infinite 2s; opacity: .03; }
        .wave-svg.top1 { top: -15%; transform: rotate(180deg); animation: waveMove 9s ease-in-out infinite 1s; }
        .wave-svg.top2 { top: -25%; transform: rotate(180deg); animation: waveMove 13s ease-in-out infinite reverse 3s; opacity:.03; }
        @keyframes waveMove { 0% { transform: translateX(0); } 50% { transform: translateX(-5%); } 100% { transform: translateX(0); } }
        
        .content { position: relative; z-index: 1; width: 100%; max-width: 640px; margin: 0 auto; }
        .header { text-align: center; margin-bottom: 24px; animation: fadeDown .6s cubic-bezier(.34,1.56,.64,1) both; }
        .header h1 { font-family: 'Exo 2', sans-serif; font-size: clamp(1.4rem,5vw,2rem); font-weight: 900; letter-spacing: 3px; text-transform: uppercase; color: #fff; text-shadow: 0 0 30px rgba(0,212,212,.3); }
        .header h1 span { color: #00d4d4; }
        .header-line { width: 60px; height: 3px; border-radius: 99px; background: linear-gradient(90deg, #FF1A54, #0055FF); margin: 8px auto 0; }
        
        .nav-container { display: flex; flex-wrap: wrap; justify-content: center; gap: 6px; margin: 0 auto 12px; background: rgba(255,255,255,.04); padding: 5px; border-radius: 14px; border: 1px solid rgba(255,255,255,.08); width: fit-content; }
        .btn-base { font-family: 'Exo 2', sans-serif; background: transparent; border: none; padding: 8px 18px; border-radius: 10px; font-weight: 800; font-size: .82rem; cursor: pointer; transition: all .25s; text-transform: uppercase; letter-spacing: 1px; color: rgba(255,255,255,.4); }
        .btn-base:hover { color: #fff; background: rgba(255,255,255,.07); }
        .btn-base.active { background: linear-gradient(135deg, #FF1A54, #0055FF); color: #fff; box-shadow: 0 4px 20px rgba(0,85,255,.3); }
        
        .date-container { display: flex; justify-content: center; gap: 8px; margin: 0 auto 16px; min-height: 36px; }
        .date-btn { font-family: 'Exo 2', sans-serif; background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.1); color: rgba(255,255,255,.4); padding: 6px 18px; border-radius: 10px; font-weight: 800; font-size: .75rem; cursor: pointer; transition: all .25s; letter-spacing: .5px; }
        .date-btn:hover { background: rgba(255,255,255,.08); color: #fff; }
        .date-btn.active { background: rgba(0,212,212,.12); border-color: #00d4d4; color: #00d4d4; box-shadow: 0 0 16px rgba(0,212,212,.2); }
        
        .tabs { display: flex; justify-content: center; margin: 0 auto 24px; width: fit-content; background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.08); border-radius: 14px; overflow: hidden; }
        .tab-btn { font-family: 'Exo 2', sans-serif; background: transparent; border: none; color: rgba(255,255,255,.4); padding: 10px 26px; font-weight: 800; font-size: .8rem; cursor: pointer; transition: all .25s; text-transform: uppercase; letter-spacing: 1px; display: flex; align-items: center; gap: 7px; }
        .tab-btn svg { width: 14px; height: 14px; fill: currentColor; }
        .tab-btn:hover { color: #fff; background: rgba(255,255,255,.06); }
        .tab-btn.active { background: linear-gradient(135deg, #FF1A54, #0055FF); color: #fff; box-shadow: inset 0 0 20px rgba(0,0,0,.2); }
        
        .state-msg { text-align: center; padding: 60px 20px; color: rgba(255,255,255,.3); font-size: 1rem; font-family: 'Exo 2', sans-serif; font-weight: 700; display: flex; flex-direction: column; align-items: center; gap: 14px; }
        .spinner { width: 40px; height: 40px; border-radius: 50%; border: 3px solid rgba(0,212,212,.15); border-top-color: #00d4d4; animation: spin .8s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
        
        .cards-grid { display: grid; grid-template-columns: 1fr; gap: 24px; }
        .pk-wrapper { display: flex; flex-direction: column; animation: cardIn .5s cubic-bezier(.34,1.4,.64,1) both; }
        @keyframes cardIn { from{opacity:0;transform:scale(.9) translateY(16px)} to{opacity:1;transform:scale(1) translateY(0)} }
        
        .pk-timer { text-align: center; font-size: .72rem; font-weight: 800; color: rgba(255,255,255,.4); padding: 0 0 10px; text-transform: uppercase; letter-spacing: 1.5px; font-family: 'Exo 2', sans-serif; display: flex; align-items: center; justify-content: center; gap: 6px; }
        .pk-timer strong { color: #00d4d4; }
        .pk-timer.finalizado { color: #ef4444 !important; font-weight: 900; }
        
        .pk-outer { background: #fff; border-radius: 24px; overflow: hidden; box-shadow: 0 0 0 2px rgba(255,255,255,.15), 0 20px 50px rgba(0,0,0,.5); transition: transform .25s; }
        .pk-sides { position: relative; height: 180px; background: #fff; }
        .side-left { position: absolute; left:0; top:0; bottom:0; width: 58%; background: #FF1A54; clip-path: polygon(0 0,100% 0,78% 100%,0 100%); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; padding: 16px 12px; }
        .side-right { position: absolute; right:0; top:0; bottom:0; width: 58%; background: #0055FF; clip-path: polygon(22% 0,100% 0,100% 100%,0 100%); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; padding: 16px 12px; }
        .side-left.winner { background: #0055FF; } .side-left.loser { background: #FF1A54; }
        .side-right.winner { background: #0055FF; } .side-right.loser { background: #FF1A54; }
        
        .live-tag { font-size: .58rem; font-weight: 900; padding: 3px 10px; border-radius: 99px; text-transform: uppercase; letter-spacing: 1.5px; display: flex; align-items: center; gap: 5px; font-family: 'Exo 2', sans-serif; border: 1.5px solid rgba(255,255,255,.4); }
        .live-tag.on { background: rgba(255,255,255,.2); color: #fff; animation: livePop .9s ease infinite alternate; }
        .live-tag.off { background: rgba(0,0,0,.2); color: rgba(255,255,255,.4); border-color: transparent; }
        .live-dot { width: 6px; height: 6px; border-radius: 50%; background: #fff; animation: blink 1s ease infinite; }
        @keyframes livePop { from{box-shadow:0 0 0 0 rgba(255,255,255,.2)} to{box-shadow:0 0 0 4px rgba(255,255,255,.08)} }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:.2} }
        
        .avatar-container { position: relative; padding-bottom: 18px; }
        .avatar-wrap { width: 74px; height: 74px; border-radius: 50%; overflow: hidden; border: 3px solid rgba(255,255,255,.65); background: rgba(0,0,0,.15); display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: filter .4s, transform .3s; box-shadow: 0 4px 16px rgba(0,0,0,.3); }
        .avatar-wrap.gray { filter: grayscale(1) brightness(.5); }
        .avatar-img { width:100%;height:100%;object-fit:cover;object-position:center;display:block; }
        .avatar-placeholder svg { width:34px;height:34px;fill:rgba(255,255,255,.4); }
        
        .result-badge { position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); font-size: .58rem; font-weight: 900; padding: 3px 12px; border-radius: 99px; text-transform: uppercase; letter-spacing: 1.5px; white-space: nowrap; color: #fff; z-index: 5; font-family: 'Exo 2', sans-serif; }
        .badge-derrota { background: rgba(0,0,0,.5); border: 1.5px solid rgba(255,255,255,.25); }
        .badge-vitoria { background: #FFE500; color: #0B0B44; border: 1.5px solid rgba(255,255,255,.6); }
        
        .player-name { font-size: .82rem; font-weight: 900; color: #fff; text-align: center; text-transform: uppercase; text-shadow: 0 2px 8px rgba(0,0,0,.4); letter-spacing: .5px; max-width: 130px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-family: 'Exo 2', sans-serif; }
        .vs-circle { position: absolute; left: 50%; top: 50%; transform: translate(-50%,-50%); width: 56px; height: 56px; border-radius: 50%; background: #fff; z-index: 10; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 0 3px rgba(255,255,255,.25), 0 0 0 6px rgba(255,255,255,.08), 0 8px 24px rgba(0,0,0,.35); }
        .vs-circle span { font-size: 1rem; font-weight: 900; font-style: italic; color: #FF1A54; letter-spacing: 1px; font-family: 'Exo 2', sans-serif; }
        
        .pk-gap { background: #fff; height: 12px; }
        .pk-bar { display: flex; height: 44px; }
        .bar-col { flex: 1; display: flex; align-items: center; justify-content: center; font-size: .82rem; font-weight: 900; color: #fff; transition: flex 1.2s cubic-bezier(.34,1.1,.64,1); font-family: 'Exo 2', sans-serif; white-space: nowrap; overflow: hidden; padding: 0 6px; gap: 4px; }
        .bar-l { background: #FF1A54; border-radius: 0 0 0 24px; }
        .bar-r { background: #0055FF; border-radius: 0 0 24px 0; }
        
        .pk-preparing { text-align: center; font-size: .7rem; color: rgba(255,255,255,.35); font-weight: 800; padding: 10px 0 2px; display: flex; align-items: center; justify-content: center; gap: 6px; text-transform: uppercase; letter-spacing: 1.5px; font-family: 'Exo 2', sans-serif; }
        .dot { width: 5px; height: 5px; border-radius: 50%; background: #00d4d4; display: inline-block; animation: dotBounce 1.4s ease infinite; }
        .dot:nth-child(2){animation-delay:.2s} .dot:nth-child(3){animation-delay:.4s}
        @keyframes dotBounce { 0%,100%{transform:translateY(0);opacity:.4} 50%{transform:translateY(-5px);opacity:1} }
        
        .ranking-wrap { animation: fadeUp .5s cubic-bezier(.34,1.4,.64,1) both; }
        .rank-section-title { font-family: 'Exo 2', sans-serif; font-size: .72rem; font-weight: 800; color: #00d4d4; letter-spacing: 2px; text-transform: uppercase; text-align: center; margin-bottom: 20px; display: flex; align-items: center; justify-content: center; gap: 10px; }
        .rank-section-title::before, .rank-section-title::after { content:''; flex:1; height:1px; background:linear-gradient(90deg,transparent,rgba(0,212,212,.4),transparent); }
        
        .podium { display: flex; justify-content: center; align-items: flex-end; height: 300px; margin-bottom: 32px; margin-top: 52px; gap: 12px; }
        .podium-item { display: flex; flex-direction: column; align-items: center; width: 30%; border-radius: 20px 20px 0 0; padding-top: 15px; padding-bottom: 10px; position: relative; border-top: 2px solid; border-left: 2px solid; border-right: 2px solid; animation: podiumIn .7s cubic-bezier(.34,1.56,.64,1) both; }
        @keyframes podiumIn { from{opacity:0;transform:translateY(40px) scale(.85)} to{opacity:1;transform:translateY(0) scale(1)} }
        .podium-item.second { height: 220px; background: linear-gradient(160deg, rgba(0,85,255,.25) 0%, rgba(0,85,255,.08) 100%); border-color: #0055FF; }
        .podium-item.first { height: 280px; width: 36%; background: linear-gradient(160deg, rgba(255,229,0,.22) 0%, rgba(255,160,0,.08) 100%); border-color: #FFE500; }
        .podium-item.third { height: 185px; background: linear-gradient(160deg, rgba(205,127,50,.22) 0%, rgba(205,127,50,.06) 100%); border-color: #CD7F32; }
        .podium-item::after { content: ''; position: absolute; bottom: -12px; left: -2px; right: -2px; height: 12px; border-radius: 0 0 8px 8px; }
        .podium-item.first::after { background: #FFE500; opacity: .6; } .podium-item.second::after { background: #0055FF; opacity: .5; } .podium-item.third::after { background: #CD7F32; opacity: .5; }
        
        .avatar-wrapper { position: relative; margin-top: -45px; margin-bottom: 10px; }
        .avatar { width: 62px; height: 62px; border-radius: 50%; background: rgba(0,0,0,.4); border: 3px solid transparent; object-fit: cover; display: block; }
        .first .avatar { width:78px;height:78px; border-color:#FFE500; box-shadow: 0 0 0 3px rgba(255,229,0,.3), 0 0 24px rgba(255,229,0,.5); }
        .second .avatar { border-color:#4488FF; box-shadow:0 0 16px rgba(68,136,255,.4); }
        .third .avatar { border-color:#E09040; box-shadow:0 0 14px rgba(205,127,50,.4); }
        
        .pod-badge { position:absolute;top:-5px;right:-5px; width:26px;height:26px;border-radius:50%; display:flex;justify-content:center;align-items:center; font-size:12px;font-weight:900;font-family:'Exo 2',sans-serif; border:2px solid rgba(0,0,0,.5);z-index:3; }
        .first .pod-badge { background:linear-gradient(135deg,#FFE500,#FFA500);color:#0B0B44;width:30px;height:30px;top:-8px;right:-8px;font-size:14px;box-shadow:0 2px 8px rgba(255,165,0,.5); }
        .second .pod-badge { background:linear-gradient(135deg,#4488FF,#0055FF);color:#fff;box-shadow:0 2px 8px rgba(0,85,255,.4); }
        .third .pod-badge { background:linear-gradient(135deg,#E09040,#CD7F32);color:#fff;box-shadow:0 2px 8px rgba(205,127,50,.4); }
        
        .crown-icon { position:absolute;top:-46px;left:50%;transform:translateX(-50%) rotate(-8deg); z-index:5; animation: crownFloat 3s ease-in-out infinite; fill: #FFE500; filter: drop-shadow(0 3px 6px rgba(255,229,0,.6)); width: 34px; height: 34px; }
        @keyframes crownFloat { 0%,100%{transform:translateX(-50%) rotate(-8deg) translateY(0)} 50%{transform:translateX(-50%) rotate(-8deg) translateY(-7px)} }
        
        .avatar-wrapper.is-live .avatar { border-color: #00d4d4 !important; box-shadow: 0 0 0 3px rgba(0,212,212,.25), 0 0 20px rgba(0,212,212,.5) !important; animation: liveRing 2s ease-in-out infinite !important; }
        @keyframes liveRing { 0%,100%{box-shadow:0 0 0 3px rgba(0,212,212,.25),0 0 16px rgba(0,212,212,.4)} 50%{box-shadow:0 0 0 6px rgba(0,212,212,.12),0 0 28px rgba(0,212,212,.7)} }
        .live-badge { position:absolute;bottom:-8px;left:50%;transform:translateX(-50%); background:#00d4d4;color:#042c1a; font-family:'Exo 2',sans-serif;font-size:9px;font-weight:900; letter-spacing:1px;padding:2px 6px;border-radius:6px; white-space:nowrap;z-index:4; }
        
        .podium-name { font-family:'Exo 2',sans-serif; width:95%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis; text-align:center;font-size:12px;font-weight:900; text-transform:uppercase;letter-spacing:.5px;color:#fff; margin-top:4px; }
        .podium-val { font-family:'Exo 2',sans-serif; font-size:.95rem;font-weight:900; display:flex;align-items:center;gap:5px;margin-top:2px; }
        .first .podium-val { color:#FFE500;font-size:1.2rem;text-shadow:0 0 12px rgba(255,229,0,.5); }
        .second .podium-val { color:#6699FF; }
        .third .podium-val { color:#E09040; }
        
        .ranking-list { display:flex;flex-direction:column;gap:8px; }
        .list-item { display:flex;align-items:center;padding:12px 16px; background:rgba(255,255,255,.04); border-radius:16px; border:1px solid rgba(255,255,255,.07); transition: transform .2s, border-color .2s, background .2s; }
        .list-item:hover { transform:translateX(5px);background:rgba(0,85,255,.08);border-color:rgba(0,85,255,.3); }
        .list-rank { width:32px;font-size:1rem;font-family:'Exo 2',sans-serif;font-weight:900;color:rgba(255,255,255,.25);text-align:center; }
        .list-avatar-wrap { position:relative;width:44px;height:44px;margin-right:14px;flex-shrink:0; }
        .list-avatar { width:44px;height:44px;border-radius:50%;object-fit:cover;border:2px solid rgba(255,255,255,.1);display:block; }
        .list-avatar-wrap.is-live .list-avatar { border:2px solid #00d4d4; box-shadow:0 0 10px rgba(0,212,212,.5); }
        .list-live-badge { position:absolute;bottom:-7px;left:50%;transform:translateX(-50%); background:#00d4d4;color:#042c1a; font-family:'Exo 2',sans-serif;font-size:8px;font-weight:900; padding:1px 5px;border-radius:4px;white-space:nowrap;z-index:4; }
        .list-name-col { display:flex;flex-direction:column;justify-content:center;flex:1;min-width:0;margin-right:10px; }
        .list-name { font-size:.85rem;color:#fff;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-family:'Exo 2',sans-serif;text-transform:uppercase; }
        .list-score { font-size:.9rem;font-weight:900;color:#00d4d4;display:flex;align-items:center;gap:5px;font-family:'Exo 2',sans-serif;margin-left:auto;white-space:nowrap; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
      </style>
    `;

    const svgWaves = `
      <div class="waves-bg">
        <svg class="wave-svg w1" viewBox="0 0 1440 320" preserveAspectRatio="none"><path fill="#00d4d4" d="M0,160L48,144C96,128,192,96,288,106.7C384,117,480,171,576,176C672,181,768,139,864,128C960,117,1056,139,1152,149.3C1248,160,1344,160,1392,160L1440,160L1440,320L1392,320L1344,320L1248,320L1152,320L1056,320L960,320L864,320L768,320L672,320L576,320L480,320L384,320L288,320L192,320L96,320L48,320L0,320Z"/></svg>
        <svg class="wave-svg w2" viewBox="0 0 1440 320" preserveAspectRatio="none"><path fill="#0055FF" d="M0,224L60,213.3C120,203,240,181,360,181.3C480,181,600,203,720,197.3C840,192,960,160,1080,154.7C1200,149,1320,171,1380,181.3L1440,192L1440,320L1380,320L1320,320L1200,320L1080,320L960,320L840,320L720,320L600,320L480,320L360,320L240,320L120,320L60,320L0,320Z"/></svg>
        <svg class="wave-svg w3" viewBox="0 0 1440 320" preserveAspectRatio="none"><path fill="#FF1A54" d="M0,256L80,245.3C160,235,320,213,480,208C640,203,800,213,960,218.7C1120,224,1280,224,1360,224L1440,224L1440,320L1360,320L1280,320L1120,320L960,320L800,320L640,320L480,320L320,320L160,320L80,320L0,320Z"/></svg>
      </div>
    `;

    const DSVG = `<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" style="flex-shrink:0"><path d="M12 2L2 9l10 13 10-13L12 2zm0 3.5l5.5 4-5.5 7-5.5-7L12 5.5z"/></svg>`;
    const UserSVG = `<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/></svg>`;
    const CheckSVG = `<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>`;
    const CrownSVG = `<svg class="crown-icon" viewBox="0 0 24 24"><path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z"/></svg>`;

    const esc = (str) => String(str || '').replace(/[&<>"']/g, match => {
      const mapeamento = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
      return mapeamento[match];
    });

    const criarBotoesRodada = () => {
      if (!this.estado || !this.estado.rodadas) return '';
      return this.estado.rodadas.map((r, i) => {
        const active = this.estado.rodadaAtiva === i ? ' active' : '';
        return `<button class="btn-base${active}" onclick="this.getRootNode().host.despacharAcao('mudar-rodada', ${i})">${esc(r.label)}</button>`;
      }).join('');
    };

    const criarBotoesDatas = () => {
      if (!this.estado || !this.estado.datas || this.estado.abaAtiva === 'ranking') return '';
      return this.estado.datas.map((d, i) => {
        const active = this.estado.dataAtiva === i ? ' active' : '';
        return `<button class="date-btn${active}" onclick="this.getRootNode().host.despacharAcao('mudar-data', ${i})">${esc(d.substring(0, 5))}</button>`;
      }).join('');
    };

    const renderConteudo = () => {
      if (!this.estado || this.estado.carregando) {
        return `<div class="state-msg"><div class="spinner"></div>Carregando dados seguros...</div>`;
      }

      if (this.estado.abaAtiva === 'confrontos') {
        const dataFiltro = this.estado.datas[this.estado.dataAtiva];
        let filtrados = this.estado.confrontos || [];
        if (dataFiltro) {
          filtrados = filtrados.filter(c => c.dataStr === dataFiltro);
        }

        if (filtrados.length === 0) return `<div class="state-msg">Sem confrontos disponíveis.</div>`;

        return `<div class="cards-grid">` + filtrados.map(c => {
          const tot = c.score1 + c.score2 || 1;
          const p1 = (c.score1 / tot * 100).toFixed(1);
          const p2 = (c.score2 / tot * 100).toFixed(1);
          const win1 = c.score1 >= c.score2;
          const win2 = c.score2 > c.score1;
          const has = (c.score1 + c.score2) > 0;
          
          const live1 = this.estado.liveStatus && this.estado.liveStatus[c.id1.toLowerCase()] ? 'on' : 'off';
          const live2 = this.estado.liveStatus && this.estado.liveStatus[c.id2.toLowerCase()] ? 'on' : 'off';

          const img1 = c.foto1 ? `<img class="avatar-img" src="${esc(c.foto1)}">` : `<div class="avatar-placeholder">${UserSVG}</div>`;
          const img2 = c.foto2 ? `<img class="avatar-img" src="${esc(c.foto2)}">` : `<div class="avatar-placeholder">${UserSVG}</div>`;

          return `
            <div class="pk-wrapper">
              <div class="pk-timer ${has ? 'finalizado' : ''}">
                ${has ? CheckSVG + ' Finalizado' : 'Inicia em <strong>' + esc(c.dataStr.substring(0,5)) + ' ' + esc(c.horario) + '</strong>'}
              </div>
              <div class="pk-outer">
                <div class="pk-sides">
                  <div class="side-left ${has ? (win1 ? 'winner' : 'loser') : ''}">
                    <span class="live-tag ${has ? 'off' : live1}" style="${has ? 'display:none' : ''}">
                      ${live1 === 'on' ? '<span class="live-dot"></span>AO VIVO' : 'OFFLINE'}
                    </span>
                    <div class="avatar-container">
                      <div class="avatar-wrap ${has && !win1 ? 'gray' : ''}">${img1}</div>
                      ${has ? `<div class="result-badge ${win1 ? 'badge-vitoria' : 'badge-derrota'}">${win1 ? 'VITORIA' : 'DERROTA'}</div>` : ''}
                    </div>
                    <span class="player-name">${esc(c.id1)}</span>
                  </div>
                  <div class="vs-circle"><span>VS</span></div>
                  <div class="side-right ${has ? (win2 ? 'winner' : 'loser') : ''}">
                    <span class="live-tag ${has ? 'off' : live2}" style="${has ? 'display:none' : ''}">
                      ${live2 === 'on' ? '<span class="live-dot"></span>AO VIVO' : 'OFFLINE'}
                    </span>
                    <div class="avatar-container">
                      <div class="avatar-wrap ${has && !win2 ? 'gray' : ''}">${img2}</div>
                      ${has ? `<div class="result-badge ${win2 ? 'badge-vitoria' : 'badge-derrota'}">${win2 ? 'VITORIA' : 'DERROTA'}</div>` : ''}
                    </div>
                    <span class="player-name">${esc(c.id2)}</span>
                  </div>
                </div>
                <div class="pk-gap"></div>
                <div class="pk-bar">
                  <div class="bar-col bar-l" style="flex:${has ? p1 : 50}">${has ? DSVG + ' ' + c.score1.toLocaleString('pt-BR') : '---'}</div>
                  <div class="bar-col bar-r" style="flex:${has ? p2 : 50}">${has ? DSVG + ' ' + c.score2.toLocaleString('pt-BR') : '---'}</div>
                </div>
              </div>
            </div>`;
        }).join('') + `</div>`;
      } 
      
      if (this.estado.abaAtiva === 'ranking') {
        const top = this.estado.ranking || [];
        if (top.length === 0) return `<div class="state-msg">Nenhum dado processado.</div>`;

        let html = `<div class="ranking-wrap"><div class="rank-section-title">Ranking Geral</div>`;
        
        if (top.length >= 1) {
          html += `<div class="podium">`;
          [1, 0, 2].forEach(idx => {
            const r = top[idx];
            if (!r) { html += `<div class="podium-item" style="border:none;background:transparent"></div>`; return; }
            
            const tipo = idx === 0 ? 'first' : (idx === 1 ? 'second' : 'third');
            const live = this.estado.liveStatus && this.estado.liveStatus[r.id.toLowerCase()];
            const img = r.foto ? esc(r.foto) : '';

            html += `
              <div class="podium-item ${tipo}">
                <div class="avatar-wrapper ${live ? 'is-live' : ''}">
                  ${idx === 0 ? CrownSVG : ''}
                  <img src="${img}" class="avatar">
                  <div class="pod-badge">${idx + 1}</div>
                  ${live ? `<span class="live-badge">LIVE</span>` : ''}
                </div>
                <div class="podium-name">${esc(r.nome)}</div>
                <div class="podium-val">${DSVG} ${r.total.toLocaleString('pt-BR')}</div>
              </div>`;
          });
          html += `</div>`;
        }

        const resto = top.slice(3);
        if (resto.length > 0) {
          html += `<div class="rank-section-title" style="margin-top:24px;margin-bottom:14px">Classificacao</div><div class="ranking-list">`;
          html += resto.map((r, i) => {
            const live = this.estado.liveStatus && this.estado.liveStatus[r.id.toLowerCase()];
            return `
              <div class="list-item">
                <div class="list-rank">${i + 4}</div>
                <div class="list-avatar-wrap ${live ? 'is-live' : ''}">
                  <img src="${esc(r.foto)}" class="list-avatar">
                  ${live ? `<span class="list-live-badge">LIVE</span>` : ''}
                </div>
                <div class="list-name-col">
                  <div class="list-name">${esc(r.nome)}</div>
                </div>
                <div class="list-score">${DSVG} ${r.total.toLocaleString('pt-BR')}</div>
              </div>`;
          }).join('');
          html += `</div>`;
        }
        return html + `</div>`;
      }
    };

    const abaConfrontosAtiva = (!this.estado || this.estado.abaAtiva === 'confrontos') ? ' active' : '';
    const abaRankingAtiva = (this.estado && this.estado.abaAtiva === 'ranking') ? ' active' : '';

    this.shadowRoot.innerHTML = `
      ${estilo}
      <div class="app">
        ${svgWaves}
        <div class="content">
          <header class="header">
            <h1>PK <span>Interno</span></h1>
            <div class="header-line"></div>
          </header>
          
          <nav class="nav-container">${criarBotoesRodada()}</nav>
          <div class="date-container">${criarBotoesDatas()}</div>
          
          <div class="tabs">
            <button class="tab-btn${abaConfrontosAtiva}" onclick="this.getRootNode().host.despacharAcao('mudar-aba', 'confrontos')">
              <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/></svg>
              Confrontos
            </button>
            <button class="tab-btn${abaRankingAtiva}" onclick="this.getRootNode().host.despacharAcao('mudar-aba', 'ranking')">
              <svg viewBox="0 0 24 24"><path d="M7.5 21H2V9h5.5v12zm7.25-18h-5.5v18h5.5V3zM22 11h-5.5v10H22V11z"/></svg>
              Ranking Geral
            </button>
          </div>

          <div id="dynamic-content">
            ${renderConteudo()}
          </div>
        </div>
      </div>
    `;
    window.DMaiorPrefs?.bind(this.shadowRoot);
  }
}

customElements.define('painel-pk', PainelPK);
