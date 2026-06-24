/**
 * recarga.js — Chat de Recarga de Diamantes Kwai
 *
 * Custom Element: <dmaior-recarga>
 * Design e UI 100% preservados do original Wix.
 *
 * ALTERAÇÕES em relação ao original:
 *   - Método privado #call() removido — substituído por window.DmaiorAPI.recarga.*
 *   - Constante WORKER_URL removida — API centralizada em api.js
 *   - Header alterado de 'wix-ce-v1' para 'hostinger-v1' (gerenciado pelo api.js)
 *   - localStorage protegido via try/catch (já era assim no original)
 */

const MINIMO = 100;

class DmaiorRecarga extends HTMLElement {

  #step           = 'AGUARDANDO_ID';
  #perfilKwai     = null;
  #diamantes      = 0;
  #valor          = null;
  #userData       = {};
  #sessionId      = crypto.randomUUID();
  #orderId        = null;
  #epRef          = null;
  #epHash         = null;
  #epUrl          = null;
  #pollingTimer   = null;
  #countdownTimer = null;
  #statusCard     = null;
  #requestCount   = 0;
  #lastRequest    = 0;

  connectedCallback() {
    this.#render();
    this.#bindEvents();
    this.#ajustarAltura();
    this._resizeHandler = () => this.#ajustarAltura();
    window.addEventListener('resize', this._resizeHandler);
    window.visualViewport?.addEventListener('resize', this._resizeHandler);
    setTimeout(() => this.#boasVindas(), 400);
  }

  disconnectedCallback() {
    this.#perfilKwai = null;
    this.#userData   = {};
    if (this._resizeHandler) {
      window.removeEventListener('resize', this._resizeHandler);
      window.visualViewport?.removeEventListener('resize', this._resizeHandler);
    }
    if (this.#pollingTimer)   clearInterval(this.#pollingTimer);
    if (this.#countdownTimer) clearInterval(this.#countdownTimer);
  }

  #render() {
    this.innerHTML = `
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=Exo+2:wght@300;400;500;600&display=swap');
        /* Mapeia vars locais para as globais — chat adapta-se ao tema ativo */
        :host, dmaior-recarga {
          display:block; width:100%;
          --rc-bg:       var(--dm-bg-1, #080c14);
          --rc-cyan:     var(--dm-cyan, #00f2ff);
          --rc-gold:     var(--dm-gold, #f0c040);
          --rc-text:     var(--dm-text, #dde6f0);
          --rc-sub:      var(--dm-text-sub, #a0b8c8);
          --rc-border:   var(--dm-border, rgba(0,230,230,0.15));
          --rc-card:     var(--dm-bg-card, rgba(255,255,255,0.04));
          --rc-cyan-08:  var(--dm-cyan-08, rgba(0,242,255,0.08));
          --rc-cyan-15:  var(--dm-cyan-12, rgba(0,242,255,0.12)); /* usa --dm-cyan-12, pois --dm-cyan-15 não existe */
          --rc-cyan-25:  var(--dm-cyan-25, rgba(0,242,255,0.25));
        }
        .dm-wrap * { box-sizing:border-box; margin:0; padding:0; }

        .dm-wrap {
          font-family:'Exo 2',sans-serif; background:var(--rc-bg);
          border-radius:20px; width:100%; max-width:420px; height:640px;
          display:flex; flex-direction:column; overflow:hidden; position:relative;
          box-shadow: 0 0 0 1px var(--rc-cyan-15), 0 25px 60px rgba(0,0,0,0.7), 0 0 40px var(--rc-cyan-08);
        }
        .dm-wrap::before {
          content:''; position:absolute; inset:0;
          background:radial-gradient(ellipse 80% 60% at 50% -10%,var(--rc-cyan-08) 0%,transparent 70%);
          pointer-events:none; z-index:0;
        }

        .dm-header {
          position:relative; z-index:1; padding:16px 20px;
          background:var(--rc-cyan-08); border-bottom:1px solid var(--rc-cyan-15);
          display:flex; align-items:center; justify-content:space-between;
          backdrop-filter:blur(12px); flex-shrink:0;
        }
        .dm-brand { display:flex; align-items:center; gap:10px; }
        .dm-logo-icon {
          width:34px; height:34px;
          background:linear-gradient(135deg,var(--rc-cyan-08),var(--rc-cyan-15));
          border:1px solid var(--rc-cyan-25); border-radius:10px;
          display:flex; align-items:center; justify-content:center;
          box-shadow:0 0 12px var(--rc-cyan-15);
        }
        .dm-brand-text { display:flex; flex-direction:column; }
        .dm-brand-name { font-family:'Rajdhani',sans-serif; font-size:15px; font-weight:700; letter-spacing:2px; color:var(--rc-text); text-transform:uppercase; }
        .dm-brand-sub  { font-size:10px; color:var(--rc-sub); letter-spacing:1.5px; text-transform:uppercase; }
        .dm-status     { display:flex; align-items:center; gap:6px; font-size:11px; color:var(--rc-sub); }
        .dm-dot        { width:7px; height:7px; border-radius:50%; background:var(--rc-cyan); box-shadow:0 0 6px var(--rc-cyan); animation:dm-pulse 2s infinite; }
        @keyframes dm-pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(.8)} }

        .dm-body {
          flex:1; overflow-y:auto; overflow-x:hidden;
          padding:20px 16px; display:flex; flex-direction:column; gap:12px;
          position:relative; z-index:1; scroll-behavior:smooth;
        }
        .dm-body::-webkit-scrollbar { width:4px; }
        .dm-body::-webkit-scrollbar-track { background:transparent; }
        .dm-body::-webkit-scrollbar-thumb { background:var(--rc-cyan-15); border-radius:4px; }

        @keyframes dm-fadein { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        .dm-msg { padding:11px 15px; border-radius:14px; font-size:13.5px; line-height:1.5; max-width:88%; word-break:break-word; animation:dm-fadein .3s ease; }
        .dm-msg.bot  { background:var(--rc-card); border:1px solid var(--rc-border); color:var(--rc-text); align-self:flex-start; border-bottom-left-radius:4px; }
        .dm-msg.bot strong { color:var(--rc-cyan); }
        .dm-msg.user { background:var(--dm-grad-cyan,linear-gradient(135deg,#00b4d8,#00f2ff)); color:#000; font-weight:600; align-self:flex-end; border-bottom-right-radius:4px; box-shadow:0 0 14px var(--rc-cyan-25); }
        .dm-msg.erro { background:rgba(255,60,60,0.12); border:1px solid rgba(255,80,80,0.3); color:#ff9090; align-self:flex-start; }

        .dm-card-perfil { background:var(--rc-cyan-08); border:1px solid var(--rc-cyan-25); border-radius:14px; padding:14px; display:flex; align-items:center; gap:13px; align-self:flex-start; max-width:88%; animation:dm-fadein .35s ease; }
        .dm-card-perfil img { width:52px; height:52px; border-radius:50%; border:2px solid var(--rc-cyan-25); object-fit:cover; }
        .dm-perfil-nome { font-family:'Rajdhani',sans-serif; font-size:15px; font-weight:700; color:var(--rc-text); margin-bottom:2px; }
        .dm-perfil-id   { font-size:11px; color:var(--rc-sub); margin-bottom:4px; }
        .dm-perfil-link { font-size:11px; color:var(--rc-cyan); text-decoration:none; }
        .dm-perfil-link:hover { text-decoration:underline; }

        .dm-btns { display:flex; gap:8px; flex-wrap:wrap; align-self:flex-start; max-width:100%; animation:dm-fadein .35s ease; }
        .dm-btn  { font-family:'Rajdhani',sans-serif; font-size:14px; font-weight:700; letter-spacing:1px; padding:9px 22px; border-radius:10px; cursor:pointer; transition:all .25s; border:none; text-transform:uppercase; }
        .dm-btn.primary   { background:var(--dm-grad-cyan,linear-gradient(135deg,#00b4d8,#00f2ff)); color:#000; box-shadow:0 0 14px var(--rc-cyan-25); }
        .dm-btn.primary:hover { transform:scale(1.04); filter:brightness(1.1); }
        .dm-btn.secondary { background:var(--rc-card); color:var(--rc-sub); border:1px solid var(--rc-border); }
        .dm-btn.secondary:hover { background:rgba(255,80,80,0.12); border-color:rgba(255,80,80,0.3); color:#ff9090; }
        .dm-btn:disabled  { opacity:.4; cursor:not-allowed; transform:none !important; }
        .dm-btn, .dm-send, .dm-perfil-link { -webkit-tap-highlight-color:transparent; touch-action:manipulation; }
        .dm-header, .dm-btn, .dm-brand-name { -webkit-user-select:none; user-select:none; }

        .dm-calc-wrap { align-self:flex-start; max-width:90%; animation:dm-fadein .35s ease; }
        .dm-calc { background:var(--rc-cyan-08); border:1px solid var(--rc-cyan-15); border-radius:14px; padding:14px; }
        .dm-calc-label { font-size:11px; color:var(--rc-sub); letter-spacing:1px; text-transform:uppercase; margin-bottom:8px; }
        .dm-calc-input-row { display:flex; align-items:center; gap:8px; margin-bottom:10px; }
        .dm-calc-input { flex:1; background:rgba(0,0,0,0.35); border:1px solid var(--rc-cyan-25); border-radius:8px; padding:9px 12px; color:var(--rc-text); font-size:16px; font-weight:600; font-family:'Rajdhani',sans-serif; outline:none; transition:.25s; -moz-appearance:textfield; }
        .dm-calc-input::-webkit-outer-spin-button, .dm-calc-input::-webkit-inner-spin-button { -webkit-appearance:none; }
        .dm-calc-input:focus { border-color:var(--rc-cyan); box-shadow:0 0 8px var(--rc-cyan-15); }
        .dm-calc-unit { font-size:11px; color:var(--rc-sub); white-space:nowrap; }
        .dm-calc-preview { display:flex; justify-content:space-between; align-items:center; padding:8px 10px; background:rgba(0,0,0,0.3); border-radius:8px; }
        .dm-calc-label-sm { font-size:12px; color:var(--rc-sub); }
        .dm-calc-valor { font-family:'Rajdhani',sans-serif; font-size:20px; font-weight:700; color:var(--rc-cyan); transition:.2s; }
        .dm-calc-aviso { font-size:11px; color:#ff9060; margin-top:6px; display:none; }

        .dm-form-wrap { align-self:flex-start; max-width:90%; animation:dm-fadein .35s ease; }
        .dm-form { background:var(--rc-cyan-08); border:1px solid var(--rc-cyan-15); border-radius:14px; padding:14px; display:flex; flex-direction:column; gap:10px; }
        .dm-form-titulo { font-family:'Rajdhani',sans-serif; font-size:13px; font-weight:600; color:var(--rc-sub); letter-spacing:.8px; text-transform:uppercase; border-bottom:1px solid var(--rc-cyan-08); padding-bottom:8px; }
        .dm-form-field { display:flex; flex-direction:column; gap:4px; }
        .dm-form-field label { font-size:11px; color:var(--rc-sub); letter-spacing:1px; text-transform:uppercase; }
        .dm-form-field input { background:rgba(0,0,0,0.35); border:1px solid var(--rc-cyan-15); border-radius:8px; padding:9px 12px; color:var(--rc-text); font-size:14px; font-family:'Exo 2',sans-serif; outline:none; transition:.25s; }
        .dm-form-field input:focus { border-color:var(--rc-cyan); box-shadow:0 0 8px var(--rc-cyan-15); }
        .dm-form-field input.erro { border-color:#ff6060 !important; }

        .dm-pix-frame-wrap { align-self:flex-start; width:96%; max-width:96%; animation:dm-fadein .4s ease; }
        .dm-pix-frame-header {
          background:var(--rc-cyan-08); border:1px solid var(--rc-cyan-25);
          border-radius:14px 14px 0 0; padding:10px 14px;
          display:flex; align-items:center; justify-content:space-between;
        }
        .dm-pix-frame-titulo { font-family:'Rajdhani',sans-serif; font-size:13px; font-weight:700; color:var(--rc-cyan); letter-spacing:.8px; text-transform:uppercase; display:flex; align-items:center; gap:6px; }
        .dm-pix-frame-timer  { font-family:'Rajdhani',sans-serif; font-size:12px; font-weight:600; color:var(--rc-gold); }
        .dm-pix-iframe { width:100%; height:420px; border:1px solid var(--rc-cyan-15); border-top:none; border-radius:0 0 14px 14px; background:#fff; display:block; }
        .dm-pix-fallback { background:rgba(0,0,0,0.3); border:1px solid var(--rc-cyan-15); border-top:none; border-radius:0 0 14px 14px; padding:16px; text-align:center; display:none; flex-direction:column; gap:10px; }
        .dm-pix-fallback p { font-size:12px; color:var(--rc-sub); line-height:1.5; }
        .dm-pagar-ext-btn { background:var(--dm-grad-cyan,linear-gradient(135deg,#00b4d8,#00f2ff)); color:#000; font-family:'Rajdhani',sans-serif; font-size:15px; font-weight:700; letter-spacing:1px; border:none; border-radius:10px; padding:12px; cursor:pointer; text-transform:uppercase; width:100%; transition:all .25s; box-shadow:0 4px 18px var(--rc-cyan-25); -webkit-tap-highlight-color:transparent; }
        .dm-pagar-ext-btn:hover { transform:scale(1.02); filter:brightness(1.1); }

        .dm-typing { display:flex; align-items:center; gap:5px; padding:10px 14px; background:var(--rc-card); border:1px solid var(--rc-border); border-radius:14px; border-bottom-left-radius:4px; align-self:flex-start; animation:dm-fadein .2s ease; }
        .dm-typing span { width:6px; height:6px; border-radius:50%; background:var(--rc-sub); animation:dm-blink 1.2s infinite; }
        .dm-typing span:nth-child(2){animation-delay:.2s} .dm-typing span:nth-child(3){animation-delay:.4s}
        @keyframes dm-blink{0%,80%,100%{opacity:.2}40%{opacity:1}}

        .dm-input-area { position:relative; z-index:1; padding:12px 14px; background:rgba(0,0,0,0.4); border-top:1px solid var(--rc-cyan-08); display:flex; gap:8px; align-items:center; flex-shrink:0; }
        .dm-input { flex:1; background:var(--rc-card); border:1px solid var(--rc-cyan-15); border-radius:10px; padding:11px 14px; color:var(--rc-text); font-size:14px; font-family:'Exo 2',sans-serif; outline:none; transition:.25s; height:42px; }
        .dm-input:focus { border-color:var(--rc-cyan); box-shadow:0 0 8px var(--rc-cyan-08); }
        .dm-input:disabled { opacity:.4; cursor:not-allowed; }
        .dm-input::placeholder { color:var(--rc-sub); opacity:.5; }
        .dm-send { width:42px; height:42px; background:var(--dm-grad-cyan,linear-gradient(135deg,#00b4d8,#00f2ff)); border:none; border-radius:10px; cursor:pointer; display:flex; align-items:center; justify-content:center; flex-shrink:0; transition:all .25s; box-shadow:0 0 12px var(--rc-cyan-15); }
        .dm-send:hover { transform:scale(1.08); filter:brightness(1.1); }
        .dm-send:disabled { opacity:.4; cursor:not-allowed; transform:none; }
        .dm-input-wrap { flex:1; display:flex; flex-direction:column; gap:5px; min-width:0; }
        .dm-ajuda-btn { display:flex; align-items:center; gap:5px; background:none; border:none; padding:0 2px; color:var(--rc-sub); font-size:11px; font-family:'Exo 2',sans-serif; cursor:pointer; transition:.2s; width:fit-content; -webkit-tap-highlight-color:transparent; opacity:.6; }
        .dm-ajuda-btn:hover { opacity:1; color:var(--rc-cyan); }

        .dm-ajuda-modal { display:none; position:absolute; inset:0; z-index:100; background:rgba(0,0,0,0.75); align-items:center; justify-content:center; backdrop-filter:blur(4px); padding:20px; }
        .dm-ajuda-modal.aberto { display:flex; animation:dm-fadein .25s ease; }
        .dm-ajuda-inner { background:var(--rc-bg); border:1px solid var(--rc-cyan-25); border-radius:16px; overflow:hidden; width:100%; max-width:340px; box-shadow:0 20px 60px rgba(0,0,0,0.8); }
        .dm-ajuda-header { display:flex; justify-content:space-between; align-items:center; padding:12px 16px; border-bottom:1px solid var(--rc-cyan-08); font-family:'Rajdhani',sans-serif; font-size:14px; font-weight:600; color:var(--rc-text); }
        .dm-ajuda-fechar { background:var(--rc-card); border:1px solid var(--rc-border); border-radius:6px; width:28px; height:28px; color:var(--rc-sub); cursor:pointer; font-size:13px; display:flex; align-items:center; justify-content:center; transition:.2s; }
        .dm-ajuda-fechar:hover { background:rgba(255,60,60,0.15); color:#ff8888; }
        .dm-ajuda-img { width:100%; display:block; max-height:320px; object-fit:contain; background:var(--rc-bg); }

        .dm-status-card { display:flex; align-items:center; gap:12px; padding:12px 14px; border-radius:13px; align-self:flex-start; max-width:88%; animation:dm-fadein .4s ease; transition:all .4s ease; }
        .dm-status-card.aguardando  { background:rgba(255,200,0,0.07);  border:1px solid rgba(255,200,0,0.2);  }
        .dm-status-card.em-processo { background:rgba(0,150,255,0.07);  border:1px solid rgba(0,150,255,0.25); }
        .dm-status-card.concluido   { background:rgba(0,255,150,0.07);  border:1px solid rgba(0,255,150,0.25); }
        .dm-status-card.expirado    { background:rgba(255,60,60,0.07);  border:1px solid rgba(255,60,60,0.2);  }
        .dm-status-icon { font-size:22px; flex-shrink:0; }
        .dm-status-texto { display:flex; flex-direction:column; gap:2px; }
        .dm-status-texto strong { font-size:13px; color:#fff; }
        .dm-status-texto span   { font-size:11px; color:#889; }
        .dm-status-card.aguardando  .dm-status-texto strong { color:#ffc800; }
        .dm-status-card.em-processo .dm-status-texto strong { color:#4db8ff; }
        .dm-status-card.concluido   .dm-status-texto strong { color:#00ff96; }
        .dm-status-card.expirado    .dm-status-texto strong { color:#ff6060; }

        .dm-footer-badge { flex-shrink:0; display:flex; justify-content:center; align-items:center; padding:5px; background:rgba(0,0,0,0.25); font-size:9px; color:rgba(255,255,255,0.18); letter-spacing:1px; text-transform:uppercase; border-top:1px solid rgba(255,255,255,0.03); pointer-events:none; z-index:1; }

        .dm-pos-conclusao { display:flex; gap:8px; flex-wrap:wrap; align-self:flex-start; animation:dm-fadein .4s ease; }
        .dm-btn-suporte { display:flex; align-items:center; gap:6px; font-family:'Rajdhani',sans-serif; font-size:13px; font-weight:700; letter-spacing:.8px; padding:10px 18px; border-radius:10px; cursor:pointer; text-transform:uppercase; text-decoration:none; transition:all .22s; -webkit-tap-highlight-color:transparent; }
        .dm-btn-nova-recarga { background:linear-gradient(135deg,#00b4d8,#00f2ff); color:#000; border:none; box-shadow:0 4px 14px rgba(0,242,255,0.25); }
        .dm-btn-nova-recarga:hover { transform:scale(1.04); filter:brightness(1.08); }
        .dm-btn-whatsapp { background:rgba(37,211,102,0.12); color:#25d366; border:1px solid rgba(37,211,102,0.3); }
        .dm-btn-whatsapp:hover { background:rgba(37,211,102,0.2); }

        @media(min-width:769px){ .dm-wrap { max-width:420px; height:640px; margin:0 auto; } }
        @media(min-width:481px) and (max-width:768px){
          .dm-wrap { max-width:100%; height:600px; border-radius:16px; }
          .dm-msg,.dm-card-perfil,.dm-calc-wrap,.dm-form-wrap,.dm-pix-frame-wrap,.dm-status-card { max-width:95%; }
        }
        @media(max-width:480px){
          :host, dmaior-recarga { display:flex; flex-direction:column; width:100%; }
          .dm-wrap { max-width:100%; width:100%; border-radius:0; box-shadow:none; }
          .dm-body { flex:1; min-height:0; overflow-y:auto; -webkit-overflow-scrolling:touch; }
          .dm-input-area,.dm-footer-badge { flex-shrink:0; }
          .dm-footer-badge { display:none; }
          .dm-header { padding:12px 14px; }
          .dm-brand-name { font-size:13px; letter-spacing:1.5px; }
          .dm-msg { font-size:14px; line-height:1.55; max-width:92%; }
          .dm-body { padding:14px 12px; gap:10px; }
          .dm-btn { padding:12px 20px; font-size:14px; min-height:44px; }
          .dm-btns { gap:8px; width:100%; }
          .dm-btn.primary,.dm-btn.secondary { flex:1; text-align:center; justify-content:center; }
          .dm-card-perfil,.dm-calc-wrap,.dm-form-wrap,.dm-pix-frame-wrap,.dm-status-card { max-width:96%; width:96%; }
          .dm-calc-input { font-size:18px; }
          .dm-form-field input { font-size:16px; padding:12px; min-height:44px; }
          .dm-input { font-size:16px; padding:12px 13px; height:46px; }
          .dm-send { width:46px; height:46px; border-radius:11px; }
          .dm-input-area { padding:10px 12px; gap:8px; }
          .dm-pix-iframe { height:380px; }
        }
        @media(max-width:360px){
          .dm-brand-name { font-size:12px; }
          .dm-msg { font-size:13px; }
          .dm-btn { padding:11px 14px; font-size:13px; }
          .dm-pix-iframe { height:340px; }
        }
      </style>

      <div class="dm-wrap">
        <div class="dm-header">
          <div class="dm-brand">
            <div class="dm-logo-icon">
              <img src="https://static.wixstatic.com/media/ac74b3_641fc6e90c194490b0e62a2786cc1f06~mv2.png"
                   alt="DMaior" style="width:100%;height:100%;object-fit:contain;border-radius:9px;display:block;">
            </div>
            <div class="dm-brand-text">
              <div class="dm-brand-name">DMaior Agency</div>
              <div class="dm-brand-sub">Recarga Kwai</div>
            </div>
          </div>
          <div class="dm-status"><div class="dm-dot"></div><span>Online</span></div>
        </div>

        <div class="dm-body" id="dm-body"></div>

        <div class="dm-ajuda-modal" id="dm-ajuda-modal">
          <div class="dm-ajuda-inner">
            <div class="dm-ajuda-header">
              <span>Como encontrar meu ID?</span>
              <button class="dm-ajuda-fechar" id="dm-ajuda-fechar">✕</button>
            </div>
            <img src="https://static.wixstatic.com/media/ac74b3_8a6b5a0e780d472ab45f52c545345175~mv2.png"
                 alt="Como encontrar o ID no Kwai" class="dm-ajuda-img">
          </div>
        </div>

        <div class="dm-input-area">
          <div class="dm-input-wrap">
            <input class="dm-input" id="dm-input" type="text"
              placeholder="Digite seu ID do Kwai..."
              maxlength="100" autocomplete="off" autocorrect="off" spellcheck="false"/>
            <button class="dm-ajuda-btn" id="dm-ajuda-btn">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              Onde fica meu ID?
            </button>
          </div>
          <button class="dm-send" id="dm-send" aria-label="Enviar">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>

        <div class="dm-footer-badge">🔒 Conexão criptografada · DMaior Agency</div>
      </div>
    `;
    window.DMaiorPrefs?.bind(this);
  }

  #bindEvents() {
    const input  = this.querySelector('#dm-input');
    const send   = this.querySelector('#dm-send');
    const ajuda  = this.querySelector('#dm-ajuda-btn');
    const modal  = this.querySelector('#dm-ajuda-modal');
    const fechar = this.querySelector('#dm-ajuda-fechar');

    send.addEventListener('click',    () => this.#onEnviar());
    input.addEventListener('keydown', e  => { if (e.key==='Enter'&&!e.shiftKey){e.preventDefault();this.#onEnviar();} });
    ajuda?.addEventListener('click',  () => modal?.classList.add('aberto'));
    fechar?.addEventListener('click', () => modal?.classList.remove('aberto'));
    modal?.addEventListener('click',  e  => { if(e.target===modal) modal.classList.remove('aberto'); });
  }

  #onEnviar() {
    const input = this.querySelector('#dm-input');
    const val   = input.value.trim();
    if (!val) return;
    const agora = Date.now();
    if (agora - this.#lastRequest < 2000) return;
    this.#lastRequest = agora;
    this.#requestCount++;
    if (this.#requestCount > 30) { this.#addMsg('bot erro','⚠️ Muitas tentativas. Recarregue a página.'); this.#setInputEnabled(false); return; }
    if (this.#step === 'AGUARDANDO_ID') this.#onReceberID(val);
    input.value = '';
  }

  async #onReceberID(id) {
    const idLimpo = id.replace(/[<>"'& ]/g,'').substring(0,100);
    if (!idLimpo) { this.#addMsg('bot erro','⚠️ ID inválido.'); return; }
    this.#addMsg('user', idLimpo);
    this.#setInputEnabled(false);
    this.#step = 'VALIDANDO';
    const typing = this.#addTyping();
    await this.#delay(700);
    try {
      // Substituído: this.#call('/validate-id', ...) → window.DmaiorAPI.recarga.validateId(...)
      const data = await window.DmaiorAPI.recarga.validateId(idLimpo, this.#sessionId);
      this.#removeEl(typing);
      if (!data.ok) {
        this.#addMsg('bot erro', `⚠️ ${data.mensagem || 'ID não encontrado. Verifique e tente novamente.'}`);
        this.#step = 'AGUARDANDO_ID';
        this.#setInputEnabled(true, 'Digite seu ID do Kwai...');
        return;
      }
      this.#perfilKwai = data.perfil;
      this.#step = 'CONFIRMANDO_PERFIL';
      this.#mostrarPerfil(data.perfil);
    } catch (e) {
      this.#removeEl(typing);
      this.#addMsg('bot erro', '⚠️ Erro ao validar ID. Verifique sua conexão e tente novamente.');
      this.#step = 'AGUARDANDO_ID';
      this.#setInputEnabled(true, 'Digite seu ID do Kwai...');
    }
  }

  #mostrarPerfil(perfil) {
    const body = this.querySelector('#dm-body');
    this.#addMsg('bot', 'Encontrei este perfil. <strong>É você?</strong>');
    const card = document.createElement('div');
    card.className = 'dm-card-perfil';
    card.innerHTML = `
      <img src="${this.#sanitizeURL(perfil.foto_url)}" alt="Foto" onerror="this.src='https://placehold.co/52x52/0a0a0a/00f2ff?text=?'">
      <div>
        <div class="dm-perfil-nome">${this.#sanitizeText(perfil.nome)}</div>
        <div class="dm-perfil-id">ID: ${this.#sanitizeText(perfil.kwai_id)}</div>
        <a class="dm-perfil-link" href="${this.#sanitizeURL(perfil.link_perfil)}" target="_blank" rel="noopener">Ver perfil ↗</a>
      </div>`;
    body.appendChild(card);
    const btns = document.createElement('div');
    btns.className = 'dm-btns';
    btns.innerHTML = `<button class="dm-btn primary" data-a="sim">✓ Sim, sou eu</button><button class="dm-btn secondary" data-a="nao">✕ Não sou eu</button>`;
    btns.querySelector('[data-a="sim"]').addEventListener('click', () => { this.#removeEl(btns); this.#onConfirmarPerfil(true);  });
    btns.querySelector('[data-a="nao"]').addEventListener('click', () => { this.#removeEl(btns); this.#removeEl(card); this.#onConfirmarPerfil(false); });
    body.appendChild(btns);
    this.#scrollDown();
    this.#setInputEnabled(false);
  }

  async #onConfirmarPerfil(ok) {
    if (!ok) {
      this.#perfilKwai = null;
      this.#addMsg('bot','Informe o <strong>ID correto</strong> do seu Kwai.');
      this.#step = 'AGUARDANDO_ID';
      this.#setInputEnabled(true,'Digite seu ID do Kwai...');
      return;
    }
    this.#addMsg('user','✓ Sim, sou eu');
    await this.#delay(400);
    this.#mostrarCalculadora();
  }

  #mostrarCalculadora() {
    this.#step = 'ESCOLHENDO_DIAMANTES';
    this.#addMsg('bot','Informe a <strong>quantidade de Diamantes</strong>. Mínimo: <strong>100</strong>.');
    const wrap = document.createElement('div');
    wrap.className = 'dm-calc-wrap';
    wrap.innerHTML = `
      <div class="dm-calc">
        <div class="dm-calc-label">💎 Quantidade de Diamantes</div>
        <div class="dm-calc-input-row">
          <input class="dm-calc-input" id="dm-diamantes" type="number" min="100" placeholder="100" inputmode="numeric" autocomplete="off">
          <span class="dm-calc-unit">diamantes</span>
        </div>
        <div class="dm-calc-preview">
          <span class="dm-calc-label-sm">Valor estimado:</span>
          <span class="dm-calc-valor" id="dm-valor-preview">—</span>
        </div>
        <div class="dm-calc-aviso" id="dm-calc-aviso"></div>
      </div>`;

    const inputD  = wrap.querySelector('#dm-diamantes');
    const preview = wrap.querySelector('#dm-valor-preview');
    const aviso   = wrap.querySelector('#dm-calc-aviso');
    let priceTimer = null;

    inputD.addEventListener('input', () => {
      const raw = parseInt(inputD.value.replace(/\D/g,''),10) || 0;
      inputD.value = raw || '';
      if (raw > 0 && raw < MINIMO) { aviso.textContent=`⚠️ Mínimo: ${MINIMO} diamantes`; aviso.style.display='block'; preview.textContent='—'; return; }
      aviso.style.display = 'none';
      if (raw < MINIMO) { preview.textContent='—'; return; }
      preview.textContent = '...';
      clearTimeout(priceTimer);
      priceTimer = setTimeout(async () => {
        try {
          // Substituído: this.#call('/get-price', ...) → window.DmaiorAPI.recarga.getPrice(...)
          const d = await window.DmaiorAPI.recarga.getPrice(raw, this.#sessionId);
          preview.textContent = (d.ok && d.valor)
            ? Number(d.valor).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})
            : '💎 '+raw.toLocaleString('pt-BR');
        } catch { preview.textContent='💎 '+raw.toLocaleString('pt-BR'); }
      }, 600);
    });

    const body = this.querySelector('#dm-body');
    body.appendChild(wrap);
    const btnWrap = document.createElement('div');
    btnWrap.className = 'dm-btns';
    btnWrap.innerHTML = `<button class="dm-btn primary" id="dm-btn-cont">Continuar →</button>`;
    btnWrap.querySelector('#dm-btn-cont').addEventListener('click', () => {
      const qt = parseInt(inputD.value,10)||0;
      if (qt < MINIMO) { inputD.classList.add('erro'); this.#addMsg('bot erro',`⚠️ Mínimo: ${MINIMO} diamantes.`); return; }
      this.#diamantes = qt;
      const vStr = preview.textContent.replace(/[^\d,]/g,'').replace(',','.');
      this.#valor = parseFloat(vStr)||null;
      clearTimeout(priceTimer);
      this.#removeEl(btnWrap); inputD.disabled=true;
      this.#onDiamantesConfirmados();
    });
    body.appendChild(btnWrap);
    this.#scrollDown();
    setTimeout(()=>inputD.focus(),100);
  }

  async #onDiamantesConfirmados() {
    this.#addMsg('user',`💎 ${this.#diamantes.toLocaleString('pt-BR')} diamantes`);
    await this.#delay(500);
    this.#addMsg('bot',`Perfeito! Para a recarga de <strong>💎 ${this.#diamantes.toLocaleString('pt-BR')} diamantes</strong>, informe seu WhatsApp:`);
    this.#step = 'COLETANDO_DADOS';
    await this.#delay(300);
    this.#mostrarFormDados();
  }

  #mostrarFormDados() {
    const body = this.querySelector('#dm-body');
    const wrap = document.createElement('div');
    wrap.className = 'dm-form-wrap';
    wrap.innerHTML = `
      <div class="dm-form">
        <div class="dm-form-titulo">📋 Contato</div>
        <div class="dm-form-field">
          <label>WhatsApp</label>
          <input id="dm-tel" type="tel" placeholder="(00) 90000-0000" maxlength="15" inputmode="numeric" autocomplete="tel">
        </div>
      </div>`;
    const telI = wrap.querySelector('#dm-tel');
    telI.addEventListener('input', () => {
      let v = telI.value.replace(/\D/g,'').substring(0,11);
      v = v.length>10 ? v.replace(/(\d{2})(\d{5})(\d{4})/,'($1) $2-$3') : v.replace(/(\d{2})(\d{4})(\d{4})/,'($1) $2-$3');
      telI.value = v;
    });
    body.appendChild(wrap);
    const btnWrap = document.createElement('div');
    btnWrap.className = 'dm-btns';
    btnWrap.innerHTML = `<button class="dm-btn primary" id="dm-btn-dados">Gerar PIX →</button>`;
    btnWrap.querySelector('#dm-btn-dados').addEventListener('click', () => {
      const telLimpo = telI.value.replace(/\D/g,'');
      if (telLimpo.length<10) { telI.classList.add('erro'); this.#addMsg('bot erro','⚠️ WhatsApp inválido.'); return; }
      telI.classList.remove('erro');
      this.#userData = { telefone: telLimpo };
      this.#removeEl(btnWrap); telI.disabled=true;
      this.#onDadosConfirmados();
    });
    body.appendChild(btnWrap);
    this.#scrollDown();
    setTimeout(()=>telI.focus(),80);
  }

  async #onDadosConfirmados() {
    this.#addMsg('user','✓ WhatsApp confirmado');
    this.#step = 'CRIANDO_ORDEM';
    await this.#delay(400);
    const typing = this.#addTyping();
    this.#setInputEnabled(false);
    this.#addMsg('bot','Criando sua ordem de pagamento... ⏳');

    try {
      // Substituído: this.#call('/create-order', ...) → window.DmaiorAPI.recarga.createOrder(...)
      const orderData = await window.DmaiorAPI.recarga.createOrder({
        kwai_id:   this.#perfilKwai.kwai_id,
        diamantes: this.#diamantes,
        whatsapp:  this.#userData.telefone,
      }, this.#sessionId);
      this.#removeEl(typing);

      if (!orderData.ok) {
        this.#addMsg('bot erro',`⚠️ ${orderData.mensagem || 'Erro ao criar ordem. Tente novamente.'}`);
        this.#step = 'COLETANDO_DADOS';
        return;
      }

      this.#orderId = orderData.order_id;
      this.#epRef   = orderData.ep_ref;
      this.#epHash  = orderData.ep_hash;
      this.#step    = 'AGUARDANDO_PAGAMENTO';

      if (this.#epRef && this.#epHash) {
        this.#epUrl = `https://cashier-hub.enjoypayment.com/pix-p01/reference/${this.#epRef}/${this.#epHash}`;
        this.#addMsg('bot','✅ Ordem criada! Preencha seu <strong>Nome e CPF</strong> abaixo para gerar o QR PIX.');
        this.#mostrarIframeEnjoy();
        this.#iniciarPolling();
      } else {
        const ordemUrl = `https://rocketbunny.club/payorder/number/${this.#orderId}`;
        this.#addMsg('bot','✅ Ordem criada! Clique abaixo para pagar via PIX.');
        this.#mostrarBotaoPagarExterno(ordemUrl);
      }

    } catch (e) {
      this.#removeEl(typing);
      this.#addMsg('bot erro','⚠️ Não foi possível conectar. Tente novamente.');
      this.#step = 'COLETANDO_DADOS';
    }
  }

  #mostrarIframeEnjoy() {
    const body = this.querySelector('#dm-body');
    let segundos = 120 * 60;
    const wrap = document.createElement('div');
    wrap.className = 'dm-pix-frame-wrap';
    wrap.innerHTML = `
      <div class="dm-pix-frame-header">
        <div class="dm-pix-frame-titulo">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00f2ff" stroke-width="2.2"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
          Pagamento PIX
        </div>
        <div class="dm-pix-frame-timer">⏱ <span id="dm-countdown">${this.#fmt(segundos)}</span></div>
      </div>
      <iframe class="dm-pix-iframe" id="dm-iframe" src="${this.#epUrl}" frameborder="0" scrolling="yes" title="Pagamento PIX"></iframe>
      <div class="dm-pix-fallback" id="dm-fallback">
        <p>O formulário não carregou aqui.<br>Clique para abrir o pagamento.</p>
        <button class="dm-pagar-ext-btn" id="dm-fallback-btn">💳 Abrir Pagamento</button>
      </div>`;

    const iframe   = wrap.querySelector('#dm-iframe');
    const fallback = wrap.querySelector('#dm-fallback');

    setTimeout(() => {
      try { if (!iframe.contentWindow?.document?.body) { iframe.style.display='none'; fallback.style.display='flex'; } }
      catch { /* cross-origin: carregou OK */ }
    }, 8000);

    wrap.querySelector('#dm-fallback-btn')?.addEventListener('click', () => window.open(this.#epUrl,'_blank','noopener,noreferrer'));
    body.appendChild(wrap);

    this.#statusCard = document.createElement('div');
    this.#statusCard.className = 'dm-status-card aguardando';
    this.#statusCard.innerHTML = `<div class="dm-status-icon">⏳</div><div class="dm-status-texto"><strong>Aguardando pagamento</strong><span>Preencha seus dados no formulário acima</span></div>`;
    body.appendChild(this.#statusCard);
    this.#scrollDown();

    this.#countdownTimer = setInterval(() => {
      segundos--;
      const el = this.querySelector('#dm-countdown');
      if (el) el.textContent = this.#fmt(segundos);
      if (segundos <= 0) { clearInterval(this.#countdownTimer); this.#atualizarStatus('EXPIRADO'); }
    }, 1000);
  }

  #mostrarBotaoPagarExterno(url) {
    const body = this.querySelector('#dm-body');
    const card = document.createElement('div');
    card.style.cssText = 'align-self:flex-start;width:90%;max-width:90%;animation:dm-fadein .4s ease;';
    card.innerHTML = `<button class="dm-pagar-ext-btn">💳 Pagar Agora</button>`;
    card.querySelector('button').addEventListener('click', () => window.open(url,'_blank','noopener,noreferrer'));
    body.appendChild(card);
    this.#statusCard = document.createElement('div');
    this.#statusCard.className = 'dm-status-card aguardando';
    this.#statusCard.innerHTML = `<div class="dm-status-icon">⏳</div><div class="dm-status-texto"><strong>Aguardando pagamento</strong><span>Clique em "Pagar Agora" e conclua o PIX</span></div>`;
    body.appendChild(this.#statusCard);
    this.#scrollDown();
  }

  #fmt(seg) { return `${Math.floor(seg/60).toString().padStart(2,'0')}:${(seg%60).toString().padStart(2,'0')}`; }

  #iniciarPolling() {
    if (!this.#epRef || !this.#epHash) return;
    let tentativas = 0;
    this.#pollingTimer = setInterval(async () => {
      tentativas++;
      if (tentativas > 144) { clearInterval(this.#pollingTimer); this.#atualizarStatus('EXPIRADO'); return; }
      try {
        // Substituído: this.#call('/check-status', ...) → window.DmaiorAPI.recarga.checkStatus(...)
        const d = await window.DmaiorAPI.recarga.checkStatus(this.#epRef, this.#epHash, this.#sessionId);
        if (!d.ok) return;
        this.#atualizarStatus(d.status);
        if (['CONCLUIDO','EXPIRADO'].includes(d.status)) {
          clearInterval(this.#pollingTimer);
          await this.#delay(2000);
          this.#mostrarBotoesPosCompra();
        }
      } catch { }
    }, 5000);
  }

  #atualizarStatus(status) {
    if (!this.#statusCard) return;
    const c = {
      AGUARDANDO:  {cls:'aguardando',  icon:'⏳', t:'Aguardando pagamento',   s:'Preencha seus dados no formulário acima'},
      EM_PROCESSO: {cls:'em-processo', icon:'🔄', t:'Em processamento',        s:'Pagamento confirmado! Creditando diamantes...'},
      CONCLUIDO:   {cls:'concluido',   icon:'✅', t:'Recarga concluída!',      s:'Diamantes creditados na sua conta 💎'},
      EXPIRADO:    {cls:'expirado',    icon:'❌', t:'PIX expirado',            s:'Inicie uma nova recarga.'}
    }[status] || {cls:'aguardando',icon:'⏳',t:'Aguardando',s:''};
    ['aguardando','em-processo','concluido','expirado'].forEach(cl=>this.#statusCard.classList.remove(cl));
    this.#statusCard.classList.add(c.cls);
    this.#statusCard.innerHTML=`<div class="dm-status-icon">${c.icon}</div><div class="dm-status-texto"><strong>${c.t}</strong><span>${c.s}</span></div>`;
    if (status==='CONCLUIDO') {
      this.#addMsg('bot','🎉 <strong>Recarga concluída!</strong> Seus diamantes já estão na conta. Obrigado! 💎');
      this.#step = 'CONCLUIDO';
    }
    this.#scrollDown();
  }

  #ajustarAltura() {
    const wrap = this.querySelector('.dm-wrap');
    if (!wrap) return;
    if (window.innerWidth > 480) { wrap.style.height=''; return; }
    const vh   = window.visualViewport ? window.visualViewport.height : window.innerHeight;
    const rect = this.getBoundingClientRect();
    wrap.style.height   = Math.max(300, vh - Math.max(0, rect.top)) + 'px';
    wrap.style.maxWidth = '100%';
    const body = wrap.querySelector('#dm-body');
    if (body) requestAnimationFrame(()=>{ body.scrollTop=body.scrollHeight; });
  }

  #mostrarBotoesPosCompra() {
    const body = this.querySelector('#dm-body');
    const msg  = encodeURIComponent(`Olá, suporte. Minha ordem: ${this.#orderId||''}`);
    const wrap = document.createElement('div');
    wrap.className = 'dm-pos-conclusao';
    wrap.innerHTML = `
      <button class="dm-btn-suporte dm-btn-nova-recarga" id="dm-nova">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.5"/></svg>
        Nova Recarga
      </button>
      <a class="dm-btn-suporte dm-btn-whatsapp" href="https://wa.me/5517997176407?text=${msg}" target="_blank" rel="noopener">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
        Suporte
      </a>`;
    wrap.querySelector('#dm-nova').addEventListener('click', () => {
      if (this.#pollingTimer)   clearInterval(this.#pollingTimer);
      if (this.#countdownTimer) clearInterval(this.#countdownTimer);
      this.#step='AGUARDANDO_ID'; this.#perfilKwai=null; this.#diamantes=0;
      this.#valor=null; this.#userData={}; this.#orderId=null;
      this.#epRef=null; this.#epHash=null; this.#epUrl=null; this.#statusCard=null;
      this.#sessionId=crypto.randomUUID();
      const bd=this.querySelector('#dm-body'); if(bd) bd.innerHTML='';
      this.#boasVindas();
    });
    body.appendChild(wrap);
    this.#scrollDown();
  }

  #addMsg(tipo, html) {
    const body=this.querySelector('#dm-body');
    const div=document.createElement('div');
    div.className=`dm-msg ${tipo}`;
    if(tipo.startsWith('user')) div.textContent=html; else div.innerHTML=html;
    body.appendChild(div);
    window.DMaiorPrefs?.bind(this);
    this.#scrollDown();
    return div;
  }
  #addTyping() {
    const body=this.querySelector('#dm-body');
    const el=document.createElement('div');
    el.className='dm-typing'; el.innerHTML='<span></span><span></span><span></span>';
    body.appendChild(el); this.#scrollDown(); return el;
  }
  #removeEl(el)  { if(el?.parentNode) el.parentNode.removeChild(el); }
  #scrollDown()  { const b=this.querySelector('#dm-body'); if(b) requestAnimationFrame(()=>{ b.scrollTop=b.scrollHeight; }); }
  #setInputEnabled(on,ph) {
    const i=this.querySelector('#dm-input'),s=this.querySelector('#dm-send'),a=this.querySelector('#dm-ajuda-btn');
    if(!i) return; i.disabled=!on; s.disabled=!on; if(ph) i.placeholder=ph;
    if(a) a.style.display=(on&&this.#step==='AGUARDANDO_ID')?'flex':'none';
  }
  #delay(ms) { return new Promise(r=>setTimeout(r,ms)); }
  #sanitizeText(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;').substring(0,200); }
  #sanitizeURL(u) { try{const x=new URL(String(u||''));return['http:','https:'].includes(x.protocol)?x.href:'';}catch{return'';} }

  async #boasVindas() {
    this.#setInputEnabled(false);
    const t1=this.#addTyping(); await this.#delay(800); this.#removeEl(t1);
    this.#addMsg('bot','Olá! Bem-vindo ao <strong>Centro de Recarga DMaior Agency</strong>. 💎');
    await this.#delay(600);
    const t2=this.#addTyping(); await this.#delay(900); this.#removeEl(t2);
    this.#addMsg('bot','Recarregue diamantes Kwai com <strong>segurança e PIX instantâneo</strong>. Informe seu <strong>ID do Kwai</strong> para começar.');
    this.#step='AGUARDANDO_ID';
    this.#setInputEnabled(true,'Digite seu ID do Kwai...');
  }
}

if (!customElements.get('dmaior-recarga')) customElements.define('dmaior-recarga', DmaiorRecarga);
