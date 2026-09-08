/**
 * home-webpro.js — Layout "Web Pro" da home (3ª opção da engrenagem)
 *
 * Custom Element: <dmaior-home-webpro>
 *
 * Só renderiza quando localStorage.dm_layout === 'webpro' (que é o DEFAULT —
 * quem abre o site pela 1ª vez sem preferência cai aqui). "Padrão" (dinamico)
 * e "Antigo" (original) continuam intactos no <dmaior-services-menu>.
 *
 * A visibilidade (mostrar/esconder este componente vs. o services-menu vs. os
 * benefícios) é controlada por aplicarLayout() em index.html.
 *
 * Contém: carrossel de campanha (getComunicados('home')), hero com título que
 * alterna, banner de recarga, live 3:4 (mobile), acesso rápido + políticas,
 * benefícios, FAQ e CTA final. Shadow DOM; tema via :host([data-theme]).
 *
 * PENDÊNCIAS (próximas etapas do port):
 *  - nav desktop + foto do usuário no topo → menu-mobile.js
 *  - live 3:4 rodando de verdade no hero → integrar com live-widget.js
 */

class DmaiorHomeWebpro extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._rendered = false;
    this._timers = [];
  }

  connectedCallback() {
    this._syncThemeHost();

    this._storageHandler = (e) => {
      if (e.key === 'dm_tema')   this._syncThemeHost();
      if (e.key === 'dm_layout') this._maybeRender();
    };
    this._themeHandler  = () => this._syncThemeHost();
    this._layoutHandler = () => this._maybeRender();
    this._livesHandler  = (e) => this._applyLives(e && e.detail && e.detail.lives);
    // breakpoint desktop<->mobile: move a live pro quadro que está visível
    this._mq = window.matchMedia('(max-width:1000px)');
    this._mqHandler = () => { if (this._rendered) this._renderFeatured(); };
    window.addEventListener('storage', this._storageHandler);
    window.addEventListener('dmaior:tema', this._themeHandler);
    window.addEventListener('dmaior:layout', this._layoutHandler);
    window.addEventListener('dmaior:lives', this._livesHandler);
    try { this._mq.addEventListener('change', this._mqHandler); } catch (_) { this._mq.addListener(this._mqHandler); }

    this._maybeRender();
  }

  disconnectedCallback() {
    window.removeEventListener('storage', this._storageHandler);
    window.removeEventListener('dmaior:tema', this._themeHandler);
    window.removeEventListener('dmaior:layout', this._layoutHandler);
    window.removeEventListener('dmaior:lives', this._livesHandler);
    try { this._mq.removeEventListener('change', this._mqHandler); } catch (_) { this._mq && this._mq.removeListener(this._mqHandler); }
    this._clearTimers();
    this._killHeroPlayers();
  }

  // ── Tema ────────────────────────────────────────────────────────────
  _syncThemeHost() {
    let t = 'original';
    try { t = localStorage.getItem('dm_tema') || 'original'; } catch (_) {}
    if (t === 'original') this.removeAttribute('data-theme');
    else this.setAttribute('data-theme', t);
  }

  _isActive() {
    let l = 'webpro';
    try { l = localStorage.getItem('dm_layout') || 'webpro'; } catch (_) {}
    return l === 'webpro';
  }

  // Renderiza só quando o layout Web Pro está ativo; limpa quando sai dele.
  _maybeRender() {
    if (this._isActive()) {
      if (!this._rendered) {
        this.render(); this._bind(); this._rendered = true;
        this._scheduleBanners();
        this._applyLives(window.__dmaiorLives);
      }
    } else if (this._rendered) {
      this._clearTimers();
      this._killHeroPlayers();
      this.shadowRoot.innerHTML = '';
      this._rendered = false;
    }
  }

  _clearTimers() { this._timers.forEach(clearInterval); this._timers = []; }

  _killHeroPlayers() {
    clearInterval(this._featTimer);
    this._stopFeatured();
  }

  // ── Render ──────────────────────────────────────────────────────────
  render() {
    this.shadowRoot.innerHTML = `<style>${this._css()}</style>${this._html()}`;
    window.DMaiorPrefs?.bind(this.shadowRoot);
  }

  _css() { return `
    :host{
      display:block;
      --f-title:var(--dm-font-body,'Exo 2',sans-serif);
      --btn-grad:var(--dm-grad-effect,linear-gradient(135deg,#3b82f6,#00d4d4));
      --btn-glow:var(--dm-effect-glow,rgba(59,130,246,.28));
      /* !important: o *{padding:0} do global.css (árvore externa) ganha do :host sem ele */
      padding-bottom:clamp(44px,7vw,80px) !important;
    }
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
    a{color:var(--dm-cyan,#00d4d4);text-decoration:none;transition:color .2s,background .2s,border-color .2s,transform .2s;}
    a:hover{color:var(--dm-text,#e2e8f0);}
    img{display:block;max-width:100%;}
    button{font-family:inherit;cursor:pointer;}
    h1,h2,h3,h4{font-family:var(--f-title);font-weight:700;letter-spacing:-.01em;line-height:1.14;text-transform:uppercase;color:var(--dm-text,#e2e8f0);text-wrap:pretty;}
    .wrap{max-width:1200px;margin:0 auto;padding-left:clamp(16px,4vw,40px);padding-right:clamp(16px,4vw,40px);}
    .no-bar{scrollbar-width:none;} .no-bar::-webkit-scrollbar{display:none;}
    .kicker{font-size:.7rem;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:var(--dm-cyan,#00d4d4);}
    .desktop-only{display:block;} .mobile-only{display:none;}
    @keyframes wpPulse{0%,100%{opacity:1}50%{opacity:.35}}
    @keyframes wpShine{0%{transform:translateX(-120%)}60%,100%{transform:translateX(220%)}}
    @media (prefers-reduced-motion:reduce){*{animation:none!important}}

    .surface{background:var(--dm-grad-card);border:1px solid var(--dm-border);border-radius:20px;position:relative;overflow:hidden;}
    .surface.strip::before{content:"";position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,var(--dm-effect-blue,#3b82f6),var(--dm-effect-accent,#00d4d4),transparent);opacity:.75;}

    .btn-grad{display:inline-flex;align-items:center;gap:10px;background:var(--btn-grad);color:#fff;font-weight:700;border:1px solid var(--dm-effect-35,rgba(0,212,212,.35));border-radius:999px;box-shadow:0 12px 30px var(--btn-glow);}
    .btn-grad:hover{color:#fff;transform:translateY(-2px);}
    .btn-outline{display:inline-flex;align-items:center;gap:10px;background:transparent;color:var(--dm-text,#e2e8f0);font-weight:700;border:1px solid var(--dm-bw06,rgba(255,255,255,.09));border-radius:999px;}
    .btn-outline:hover{color:var(--dm-text,#e2e8f0);border-color:var(--dm-cyan-30);background:var(--dm-cyan-08);}

    .sec{padding-top:clamp(38px,6vw,68px);}

    /* CARROSSEL DE CAMPANHA (igual ao bc-carousel do services-menu) */
    /* min-height reserva o espaço do carrossel enquanto ele carrega (anti-CLS);
       .empty zera quando a API confirma que não há banner. */
    .banner{padding-top:14px;min-height:calc(min(820px, 100vw - 60px) * .281 + 40px);}
    .banner.empty{min-height:0;}
    .banner .bc{position:relative;width:100%;max-width:820px;margin:0 auto;border-radius:16px;overflow:hidden;}
    .banner .bc-track{display:flex;transition:transform .45s cubic-bezier(.4,0,.2,1);will-change:transform;}
    .banner .bc-slide{flex:0 0 100%;width:100%;min-width:100%;position:relative;display:block;}
    .banner .bc-slide img{display:block;width:100%;height:auto;aspect-ratio:32/9;object-fit:cover;border-radius:16px;background:var(--dm-bg-2);}
    .banner .bc-cap{position:absolute;bottom:0;left:0;right:0;padding:8px 14px 10px;background:linear-gradient(to top,rgba(0,0,0,.65),transparent);border-radius:0 0 16px 16px;pointer-events:none;}
    .banner .bc-cap span{font-family:var(--f-title);font-size:.85rem;font-weight:700;color:#fff;text-transform:uppercase;letter-spacing:.5px;text-shadow:0 1px 3px rgba(0,0,0,.6);}
    /* dots FORA da imagem (numa faixa embaixo) — assim não se sobrepõem ao
       link do banner nem uns aos outros (Lighthouse: áreas de toque). */
    .banner .bc-dots{display:flex;justify-content:center;gap:2px;margin:6px auto 0;max-width:820px;}
    .banner .bc-dot{width:26px;height:24px;border:none;background:transparent;cursor:pointer;padding:0;display:flex;align-items:center;justify-content:center;}
    .banner .bc-dot::after{content:"";width:7px;height:7px;border-radius:50%;background:var(--dm-text-muted,rgba(120,130,150,.5));transition:background .25s,transform .25s;}
    .banner .bc-dot.on::after{background:var(--dm-cyan,#00d4d4);transform:scale(1.3);}
    .banner .bc-fallback{width:100%;max-width:820px;margin:0 auto;aspect-ratio:32/9;border-radius:16px;position:relative;overflow:hidden;background:var(--dm-grad-card-alt);border:1px solid var(--dm-border);display:flex;align-items:flex-end;padding:14px 18px;}
    .banner .bc-fallback::before{content:"";position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,var(--dm-effect-blue,#3b82f6),var(--dm-effect-accent,#00d4d4),transparent);opacity:.75;}
    .banner .bc-fallback span{font-family:var(--f-title);font-weight:700;font-size:.9rem;text-transform:uppercase;letter-spacing:.5px;color:var(--dm-text,#e2e8f0);}

    /* HERO */
    .hero{display:grid;grid-template-columns:1.05fr .95fr;gap:clamp(28px,5vw,60px);align-items:center;padding-top:clamp(36px,6vw,68px);padding-bottom:clamp(24px,4vw,40px);}
    .eyebrow{display:inline-flex;align-items:center;gap:8px;background:var(--dm-cyan-10);border:1px solid var(--dm-cyan-30);color:var(--dm-cyan,#00d4d4);font-size:.68rem;font-weight:700;letter-spacing:.14em;text-transform:uppercase;padding:7px 14px;border-radius:999px;}
    /* min-height reserva o caso de 3 linhas (a frase rotativa longa quebra),
       pra o título não pular quando as frases trocam (anti-CLS). */
    .hero h1{font-size:clamp(2rem,4.4vw,3.1rem);font-weight:700;margin:18px 0 0;letter-spacing:.01em;min-height:3.5em;}
    .hero h1 .rot{color:var(--dm-cyan,#00d4d4);display:inline-block;transition:opacity .35s ease,transform .35s ease;}
    .hero h1 .rot.out{opacity:0;transform:translateY(6px);}
    .hero .sub{font-size:clamp(1rem,1.5vw,1.1rem);line-height:1.6;color:var(--dm-text-sub,#a0b8c8);margin:16px 0 0;max-width:50ch;}
    .cta{display:flex;flex-wrap:wrap;gap:12px;margin-top:26px;}
    .cta .btn-grad,.cta .btn-outline{font-size:1rem;padding:15px 26px;}
    .proof{display:flex;align-items:center;gap:13px;margin-top:28px;flex-wrap:wrap;}
    .stack{display:flex;}
    .stack i{width:34px;height:34px;border-radius:50%;border:2px solid var(--dm-bg,#060B16);background:var(--dm-grad-effect,linear-gradient(135deg,#3b82f6,#00d4d4));display:block;}
    .stack img{width:34px;height:34px;border-radius:50%;border:2px solid var(--dm-bg,#060B16);object-fit:cover;display:block;background:var(--dm-bg-3);}
    .stack i+i,.stack img+img{margin-left:-11px;}
    .proof p{font-size:.84rem;color:var(--dm-text-sub,#a0b8c8);line-height:1.4;margin:0;}
    .proof strong{color:var(--dm-text,#e2e8f0);font-weight:700;}

    /* frame da live (placeholder — etapa 3 liga o player real) */
    .hlive{position:relative;width:min(330px,100%);margin:0 auto;}
    .hlive .halo{position:absolute;inset:-16% -12%;background:radial-gradient(closest-side,var(--dm-cyan-25),transparent 72%);filter:blur(8px);}
    .frame{position:relative;aspect-ratio:3/4;border-radius:24px;overflow:hidden;border:1px solid var(--dm-cyan-25);background:radial-gradient(120% 80% at 50% 0%,var(--dm-bg-2) 0%,var(--dm-bg-3) 70%);box-shadow:0 36px 70px var(--dm-shadow-lg);display:flex;align-items:center;justify-content:center;}
    .frame::after{content:"";position:absolute;top:0;left:0;width:40%;height:100%;background:linear-gradient(100deg,transparent,rgba(255,255,255,.06),transparent);animation:wpShine 3.6s ease-in-out infinite;z-index:2;}
    .frame.has-live{background:#000;cursor:pointer;}
    .frame.has-live::after{display:none;}
    .frame .ph{display:flex;flex-direction:column;align-items:center;gap:10px;color:var(--dm-text-sub,#a0b8c8);z-index:1;}
    .frame .ph svg{width:34px;height:34px;stroke:var(--dm-cyan,#00d4d4);}
    .frame .ph span{font-family:var(--f-title);font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.14em;}
    .frame .hf-poster{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:0;}
    .frame .hf-video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:1;opacity:0;transition:opacity .45s ease;}
    .frame.playing .hf-video{opacity:1;}
    .frame .hf-sound{position:absolute;top:12px;right:12px;display:inline-flex;align-items:center;gap:6px;background:rgba(6,11,22,.6);backdrop-filter:blur(4px);border:1px solid var(--dm-bw06,rgba(255,255,255,.09));color:#fff;font-size:.58rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;padding:5px 9px;border-radius:999px;z-index:3;transition:opacity .3s;}
    .frame .hf-sound svg{width:13px;height:13px;stroke:#fff;}
    .frame.sound .hf-sound{opacity:0;pointer-events:none;}
    .frame:not(.playing) .hf-sound{opacity:0;}
    .frame .hf-who{position:absolute;left:12px;right:12px;bottom:12px;display:flex;align-items:center;gap:10px;background:rgba(6,11,22,.72);backdrop-filter:blur(8px);border:1px solid var(--dm-bw06,rgba(255,255,255,.09));border-radius:14px;padding:9px 11px;z-index:3;}
    .frame .hf-who img{width:32px;height:32px;border-radius:50%;object-fit:cover;flex-shrink:0;}
    .frame .hf-who b{font-weight:700;font-size:.82rem;color:#fff;display:block;line-height:1.2;}
    .frame .hf-who .hf-vc{font-size:.68rem;color:#c9d6e5;}
    .lp{position:absolute;top:12px;left:12px;display:inline-flex;align-items:center;gap:6px;background:#dc2626;color:#fff;font-size:.6rem;font-weight:800;letter-spacing:.12em;padding:5px 10px;border-radius:8px;z-index:3;}
    .lp i{width:6px;height:6px;border-radius:50%;background:#fff;animation:wpPulse 1.6s infinite;}
    .hlive .stat{position:absolute;background:var(--dm-bg-2);border:1px solid var(--dm-border);border-radius:14px;padding:11px 13px;box-shadow:0 16px 36px var(--dm-shadow-md);z-index:2;}
    .hlive .stat b{font-family:var(--f-title);font-weight:700;font-size:1rem;display:block;color:var(--dm-text,#e2e8f0);}
    .hlive .stat span{font-size:.64rem;color:var(--dm-text-sub,#a0b8c8);letter-spacing:.03em;}
    .hlive .stat.a{top:9%;right:-9%;} .hlive .stat.a b{color:var(--dm-cyan,#00d4d4);}
    .hlive .stat.b{top:33%;right:-6%;}

    /* RECARGA */
    .recarga{display:grid;grid-template-columns:1fr auto;gap:22px;align-items:center;padding:clamp(20px,3vw,30px);color:inherit;}
    .recarga:hover{color:inherit;border-color:var(--dm-cyan-30);}
    .recarga .l{display:flex;align-items:center;gap:15px;min-width:0;}
    .recarga .ic{width:50px;height:50px;flex-shrink:0;border-radius:16px;background:var(--dm-cyan-10);border:1px solid var(--dm-cyan-30);display:flex;align-items:center;justify-content:center;}
    .recarga .ic svg{stroke:var(--dm-cyan,#00d4d4);}
    .recarga h2{font-size:clamp(1.1rem,2vw,1.45rem);font-weight:700;letter-spacing:.02em;}
    .recarga .l div p{font-size:.9rem;color:var(--dm-text-sub,#a0b8c8);margin-top:4px;}
    .recarga .go{padding:13px 22px;font-size:.92rem;white-space:nowrap;}

    /* LIVE 3:4 MOBILE (placeholder) */
    .livemob{padding-top:clamp(28px,6vw,40px);}
    .livemob .frame{aspect-ratio:3/4;max-width:300px;margin:0 auto;border-radius:22px;box-shadow:0 28px 60px var(--dm-shadow-lg);}

    /* ACESSO RÁPIDO + POLÍTICAS */
    .cols2{display:grid;grid-template-columns:1fr 1fr;gap:clamp(26px,4vw,46px);}
    .cols2 h2{font-size:clamp(1.25rem,2.2vw,1.6rem);font-weight:700;margin:0 0 6px;letter-spacing:.03em;}
    .cols2 .sub2{font-size:.9rem;color:var(--dm-text-sub,#a0b8c8);margin:0 0 18px;}
    .qa{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
    .qa a{display:flex;align-items:center;gap:12px;padding:15px;color:inherit;}
    .qa a:hover{color:inherit;border-color:var(--dm-cyan-30);}
    .qa .ic{width:38px;height:38px;flex-shrink:0;border-radius:12px;display:flex;align-items:center;justify-content:center;}
    .qa b{display:block;font-family:var(--f-title);font-weight:700;font-size:.92rem;}
    .qa span{display:block;font-size:.72rem;color:var(--dm-text-sub,#a0b8c8);margin-top:2px;}
    .pol{display:flex;flex-direction:column;gap:12px;}
    .pol a{display:flex;align-items:center;gap:13px;padding:17px 15px;color:inherit;}
    .pol a:hover{color:inherit;border-color:var(--dm-cyan-30);background:var(--dm-cyan-05);}
    .pol b{display:block;font-family:var(--f-title);font-weight:700;font-size:.92rem;}
    .pol span{display:block;font-size:.72rem;color:var(--dm-text-sub,#a0b8c8);margin-top:2px;}

    /* BENEFÍCIOS */
    .benefits{padding-top:clamp(38px,6vw,72px);}
    .ben-head{display:grid;grid-template-columns:1.2fr .8fr;gap:clamp(18px,4vw,54px);align-items:end;margin-bottom:34px;}
    .ben-head h2{font-size:clamp(1.7rem,3.2vw,2.5rem);font-weight:700;letter-spacing:.02em;margin:0;}
    .ben-head p{font-size:1rem;line-height:1.65;color:var(--dm-text-sub,#a0b8c8);margin:0;max-width:44ch;}
    /* Cards que se sobrepõem no scroll (sticky stack, estilo whitebit.com) */
    .ben-grid{display:flex;flex-direction:column;gap:16px;--ben-top:clamp(80px,12vh,112px);--ben-step:clamp(12px,1.7vh,20px);}
    .ben{
      position:sticky;
      top:calc(var(--ben-top) + var(--i,0) * var(--ben-step));
      min-height:clamp(200px,26vh,278px);
      display:grid;grid-template-columns:auto minmax(0,1fr);
      align-content:center;justify-content:start;
      column-gap:clamp(20px,4vw,52px);row-gap:10px;
      padding:clamp(24px,3.4vw,40px) clamp(22px,4vw,46px);
      border-radius:24px;
      box-shadow:0 -14px 44px -14px rgba(0,0,0,.5),0 28px 64px -22px rgba(0,0,0,.55);
    }
    .ben>.ic{
      grid-row:1 / -1;align-self:center;margin:0;flex-shrink:0;
      width:clamp(58px,7vw,88px);height:clamp(58px,7vw,88px);border-radius:20px;
      display:flex;align-items:center;justify-content:center;
      background:var(--dm-cyan-08);border:1px solid var(--dm-cyan-20);
    }
    .ben>.ic svg{width:44%;height:44%;stroke:var(--dm-cyan,#00d4d4);}
    .ben.gold>.ic{background:var(--dm-gold-10);border-color:var(--dm-gold-20);} .ben.gold>.ic svg{stroke:var(--dm-gold,#f0c040);}
    .ben.green>.ic{background:rgba(74,222,128,.10);border-color:rgba(74,222,128,.22);} .ben.green>.ic svg{stroke:var(--dm-green,#4ade80);}
    /* rosa/laranja: sem verde/dourado destoando — tudo no acento do tema */
    :host([data-theme="rosa"]) .ben.gold>.ic,:host([data-theme="laranja"]) .ben.gold>.ic,
    :host([data-theme="rosa"]) .ben.green>.ic,:host([data-theme="laranja"]) .ben.green>.ic{background:var(--dm-cyan-08);border-color:var(--dm-cyan-20);}
    :host([data-theme="rosa"]) .ben.gold>.ic svg,:host([data-theme="laranja"]) .ben.gold>.ic svg,
    :host([data-theme="rosa"]) .ben.green>.ic svg,:host([data-theme="laranja"]) .ben.green>.ic svg{stroke:var(--dm-cyan);}
    :host([data-theme="rosa"]) .qa .ic,:host([data-theme="laranja"]) .qa .ic{background:var(--dm-cyan-10)!important;}
    :host([data-theme="rosa"]) .qa .ic svg[fill^="#"],:host([data-theme="laranja"]) .qa .ic svg[fill^="#"]{fill:var(--dm-cyan);}
    .ben>h3{grid-column:2;align-self:end;font-size:clamp(1.12rem,2.1vw,1.6rem);font-weight:700;letter-spacing:.01em;margin:0;}
    .ben>p{grid-column:2;align-self:start;font-size:clamp(.9rem,1.35vw,1.04rem);line-height:1.62;color:var(--dm-text-sub,#a0b8c8);margin:0;max-width:54ch;}
    @media (max-width:820px){
      .ben-grid{--ben-top:clamp(64px,9vh,92px);}
      .ben{grid-template-columns:1fr;justify-items:start;min-height:clamp(208px,38vh,282px);row-gap:8px;}
      .ben>.ic{grid-row:auto;margin-bottom:4px;}
      .ben>h3{grid-column:1;align-self:auto;}
      .ben>p{grid-column:1;align-self:auto;}
    }
    @media (prefers-reduced-motion:reduce){ .ben{position:static;} }

    /* FAQ */
    .faq{padding-top:clamp(44px,7vw,86px);}
    .faq-cols{display:grid;grid-template-columns:.85fr 1.15fr;gap:clamp(22px,4vw,52px);align-items:start;}
    .faq-side{position:sticky;top:92px;}
    .faq-side h2{font-size:clamp(1.7rem,3vw,2.2rem);font-weight:700;letter-spacing:.02em;margin:10px 0 12px;}
    .faq-side p{font-size:1rem;line-height:1.65;color:var(--dm-text-sub,#a0b8c8);margin:0 0 20px;max-width:40ch;}
    .faq-side a{display:inline-flex;align-items:center;gap:10px;font-weight:700;font-size:.9rem;color:var(--dm-text,#e2e8f0);border:1px solid var(--dm-bw06,rgba(255,255,255,.09));padding:12px 20px;border-radius:999px;}
    .faq-side a:hover{color:var(--dm-text,#e2e8f0);background:var(--dm-cyan-08);border-color:var(--dm-cyan-30);}
    .faq-list{display:flex;flex-direction:column;gap:12px;}
    .fq{overflow:hidden;}
    .fq>button{width:100%;display:flex;align-items:center;gap:14px;padding:18px 20px;background:transparent;border:none;text-align:left;color:var(--dm-text,#e2e8f0);}
    .fq>button .fq-ic{width:34px;height:34px;flex-shrink:0;border-radius:10px;background:var(--dm-cyan-08);border:1px solid var(--dm-cyan-20);display:flex;align-items:center;justify-content:center;}
    .fq>button .fq-ic svg{width:18px;height:18px;stroke:var(--dm-cyan,#00d4d4);}
    .fq>button b{font-family:var(--f-title);font-weight:700;font-size:1rem;text-transform:uppercase;letter-spacing:.02em;flex:1;min-width:0;}
    .fq>button .fq-pm{width:26px;height:26px;flex-shrink:0;border-radius:50%;border:1px solid var(--dm-cyan-20);display:flex;align-items:center;justify-content:center;color:var(--dm-cyan,#00d4d4);font-style:normal;font-size:1rem;line-height:1;transition:transform .25s;}
    .fq.open>button .fq-pm{transform:rotate(45deg);}
    .fq-body{display:none;padding:0 20px 20px 20px;flex-direction:column;gap:11px;}
    .fq.open .fq-body{display:flex;}
    .note{background:var(--dm-bg-1);border-left:3px solid var(--dm-cyan,#00d4d4);border-radius:11px;padding:15px;}
    .note.g{border-left-color:var(--dm-green,#4ade80);} .note.r{border-left-color:var(--dm-red,#f87171);}
    .note h3{font-family:var(--f-title);font-weight:700;font-size:.92rem;margin:0 0 5px;color:var(--dm-cyan,#00d4d4);text-transform:uppercase;letter-spacing:.02em;}
    .note.g h3{color:var(--dm-green,#4ade80);} .note.r h3{color:var(--dm-red,#f87171);}
    .note p{margin:0;font-size:.88rem;line-height:1.6;color:var(--dm-text-sub,#a0b8c8);}
    .hl{color:var(--dm-cyan,#00d4d4);font-weight:700;} .hl.g{color:var(--dm-green,#4ade80);} .hl.r{color:var(--dm-red,#f87171);}
    .bonus{background:var(--dm-gold-10);border:1px solid var(--dm-gold-20);border-radius:13px;padding:18px;}
    .bonus h3{font-family:var(--f-title);font-weight:700;font-size:.92rem;margin:0 0 13px;color:var(--dm-gold,#f0c040);text-transform:uppercase;letter-spacing:.02em;}
    .bonus-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:11px;}
    .bonus-c{background:var(--dm-gold-10);border:1px solid var(--dm-gold-20);border-radius:11px;padding:15px;text-align:center;}
    .bonus-c b{font-family:var(--f-title);font-weight:700;font-size:1.25rem;color:var(--dm-gold,#f0c040);display:block;}
    .bonus-c span{font-size:.78rem;color:var(--dm-text-sub,#a0b8c8);margin-top:3px;display:block;}

    /* CTA final */
    .cta-band{padding:clamp(28px,5vw,48px);display:grid;grid-template-columns:1fr auto;gap:26px;align-items:center;margin-top:clamp(48px,8vw,96px);}
    .cta-band .kicker{display:block;margin-bottom:9px;}
    .cta-band h2{font-size:clamp(1.5rem,2.8vw,2.1rem);font-weight:700;margin:0;letter-spacing:.02em;}
    .cta-band p{font-size:1rem;line-height:1.55;color:var(--dm-text-sub,#a0b8c8);margin:10px 0 0;max-width:44ch;}
    .cta-band .btns{display:flex;flex-wrap:wrap;gap:12px;}
    .cta-band .btn-grad{padding:14px 16px 14px 24px;font-size:1rem;}
    .cta-band .btn-outline{padding:15px 24px;font-size:1rem;}
    .cta-band .tag{font-size:.62rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase;background:rgba(255,255,255,.22);color:#fff;padding:5px 10px;border-radius:999px;margin-left:2px;}

    @media (max-width:1000px){
      .desktop-only{display:none;} .mobile-only{display:block;}
      .hero{grid-template-columns:1fr;}
      .recarga{grid-template-columns:1fr;}
      .cols2{grid-template-columns:1fr;}
      .cta-band{grid-template-columns:1fr;}
      .ben-head{grid-template-columns:1fr;}
      .faq-cols{grid-template-columns:1fr;}
      .faq-side{position:static;}
    }
    @media (max-width:560px){
      .qa{grid-template-columns:1fr;}
      .bonus-grid{grid-template-columns:1fr;}
      .hero h1{font-size:1.75rem;}
    }
  `; }

  _html() {
    const ARROW = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>`;
    return `
    <!-- CARROSSEL DE CAMPANHA -->
    <section class="wrap banner" aria-label="Campanhas">
      <div id="bcWrap" style="display:none;"></div>
    </section>

    <!-- HERO -->
    <section class="wrap hero">
      <div>
        <span class="eyebrow">Agência oficial de lives · Kwai</span>
        <h1>Faça lives no Kwai<br><span class="rot" id="rot">e receba em dólar.</span></h1>
        <p class="sub">A DMaior te treina, acompanha e premia. Do zero, sem experiência e sem custo nenhum para entrar.</p>
        <div class="cta">
          <a href="recrutamento.html" class="btn-grad">Quero ser agenciado
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="13 6 19 12 13 18"/></svg>
          </a>
          <a href="https://wa.me/5517997176407" target="_blank" rel="noopener noreferrer" class="btn-outline">Falar com o suporte</a>
        </div>
        <div class="proof">
          <span class="stack"><i></i><i></i><i></i><i></i></span>
          <p>Streamers da DMaior <strong>ao vivo agora</strong><br>pagamento em dólar, saque no mesmo dia.</p>
        </div>
      </div>
      <div class="hlive desktop-only">
        <div class="halo"></div>
        <div class="frame" id="heroFrame">
          <span class="lp"><i></i>LIVE</span>
          <span class="ph">
            <svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            <span>Live ao vivo · Kwai</span>
          </span>
        </div>
        <div class="stat a"><b>US$ 5,00</b><span>a cada 1.000 ◆</span></div>
        <div class="stat b"><b>Adesão R$ 0</b><span>treinamento incluso</span></div>
      </div>
    </section>

    <!-- RECARGA -->
    <section class="wrap sec">
      <a href="https://rocketbunny.club/@DMAIOR_AGENCY" target="_blank" rel="noopener noreferrer" class="surface strip recarga">
        <div class="l">
          <span class="ic"><svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h12l4 6-10 13L2 9Z"/><path d="M11 3 8 9l4 13"/><path d="M13 3l3 6-4 13"/><path d="M2 9h20"/></svg></span>
          <div><h2>Recarga de Diamantes</h2><p>Rápido, seguro e pelo melhor preço — direto no seu perfil Kwai.</p></div>
        </div>
        <span class="btn-grad go">Recarregar agora ${ARROW}</span>
      </a>
    </section>

    <!-- LIVE 3:4 — só mobile -->
    <section class="wrap livemob mobile-only" aria-label="Live acontecendo agora">
      <div class="frame" id="heroFrameMob">
        <span class="lp"><i></i>LIVE</span>
        <span class="ph">
          <svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          <span>Live ao vivo · Kwai</span>
        </span>
      </div>
    </section>

    <!-- ACESSO RÁPIDO + POLÍTICAS -->
    <section class="wrap sec cols2">
      <div>
        <h2>Acesso rápido</h2>
        <p class="sub2">Os canais que você mais usa no dia a dia.</p>
        <div class="qa">
          <a href="https://www.instagram.com/dmaioragency/" target="_blank" rel="noopener noreferrer" class="surface">
            <span class="ic" style="background:rgba(225,48,108,.12);"><svg viewBox="0 0 24 24" width="18" height="18" fill="#E1306C"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/></svg></span>
            <span style="min-width:0;"><b>Instagram</b><span>@dmaioragency</span></span>
          </a>
          <a href="https://wa.me/5517997176407" target="_blank" rel="noopener noreferrer" class="surface">
            <span class="ic" style="background:rgba(37,211,102,.12);"><svg viewBox="0 0 24 24" width="18" height="18" fill="#25D366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.82 9.82 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg></span>
            <span style="min-width:0;"><b>Suporte</b><span>WhatsApp</span></span>
          </a>
          <a href="tutoriais.html" class="surface">
            <span class="ic" style="background:var(--dm-cyan-10);"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="var(--dm-cyan,#00d4d4)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg></span>
            <span style="min-width:0;"><b>Tutoriais</b><span>Aprenda mais</span></span>
          </a>
          <a href="quem-somos.html" class="surface">
            <span class="ic" style="background:var(--dm-cyan-10);"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="var(--dm-cyan,#00d4d4)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg></span>
            <span style="min-width:0;"><b>Portfólio</b><span>Quem somos</span></span>
          </a>
        </div>
      </div>
      <div>
        <h2>Políticas</h2>
        <p class="sub2">Regras de pagamento e metas, sempre atualizadas.</p>
        <div class="pol">
          <a href="politicas-host.html" class="surface">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="var(--dm-text-sub,#a0b8c8)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
            <span style="min-width:0;"><b>Política de Host</b><span>Pagamentos Kwai</span></span>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--dm-text-muted,#7a9ab4)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-left:auto;flex-shrink:0;"><polyline points="9 18 15 12 9 6"/></svg>
          </a>
          <a href="politicas-premium.html" class="surface">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="var(--dm-gold,#f0c040)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            <span style="min-width:0;"><b>Pol. Especial</b><span>Streamer Premium</span></span>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--dm-text-muted,#7a9ab4)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-left:auto;flex-shrink:0;"><polyline points="9 18 15 12 9 6"/></svg>
          </a>
        </div>
      </div>
    </section>

    <!-- BENEFÍCIOS -->
    <section class="wrap benefits" aria-label="Benefícios">
      <div class="ben-head">
        <h2>Benefícios Exclusivos</h2>
        <p>Os diferenciais que fazem da DMaior a escolha certa para a sua jornada nas lives.</p>
      </div>
      <div class="ben-grid" id="benGrid">
        <article class="surface strip ben">
          <span class="ic"><svg viewBox="0 0 24 24" fill="none" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg></span>
          <h3>Suporte completo exclusivo</h3>
          <p>Equipe humana especializada, com orientação profissional e acompanhamento contínuo em todas as etapas.</p>
        </article>
        <article class="surface strip ben">
          <span class="ic"><svg viewBox="0 0 24 24" fill="none" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg></span>
          <h3>Método exclusivo</h3>
          <p>Metodologia própria, validada de acordo com as regras oficiais da plataforma — segurança e consistência.</p>
        </article>
        <article class="surface strip ben green">
          <span class="ic"><svg viewBox="0 0 24 24" fill="none" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5C11 3 12 8 12 8M16.5 8a2.5 2.5 0 0 0 0-5C13 3 12 8 12 8"/></svg></span>
          <h3>Adesão gratuita</h3>
          <p>Candidatura, treinamento e suporte 100% gratuitos, com transparência e sem custos adicionais.</p>
        </article>
        <article class="surface strip ben">
          <span class="ic"><svg viewBox="0 0 24 24" fill="none" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/></svg></span>
          <h3>Sem experiência prévia</h3>
          <p>Nunca fez lives? A equipe acompanha cada passo do seu desenvolvimento até a evolução completa.</p>
        </article>
        <article class="surface strip ben">
          <span class="ic"><svg viewBox="0 0 24 24" fill="none" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg></span>
          <h3>Monitoramento constante</h3>
          <p>Acompanhamento profissional do desempenho, com análise de metas e orientações de melhoria contínua.</p>
        </article>
        <article class="surface strip ben gold">
          <span class="ic"><svg viewBox="0 0 24 24" fill="none" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg></span>
          <h3>Premiações extras</h3>
          <p>Reconhecimento e benefícios adicionais ao alcançar as metas previamente estabelecidas.</p>
        </article>
      </div>
    </section>

    <!-- FAQ -->
    <section class="wrap faq" aria-label="Perguntas frequentes">
      <div class="faq-cols">
        <div class="faq-side">
          <span class="kicker">FAQ</span>
          <h2>Perguntas frequentes</h2>
          <p>Tudo que você precisa saber sobre a agência antes de se candidatar.</p>
          <a href="https://wa.me/5517997176407" target="_blank" rel="noopener noreferrer">Ficou outra dúvida? Chama no WhatsApp</a>
        </div>
        <div class="faq-list">
          <div class="surface strip fq open">
            <button>
              <span class="fq-ic"><svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect width="8" height="4" x="8" y="2" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m9 14 2 2 4-4"/></svg></span>
              <b>1. Processo de Seleção</b><i class="fq-pm">+</i>
            </button>
            <div class="fq-body">
              <div class="note"><h3>Como funciona o processo de seleção?</h3><p>O processo é <span class="hl">100% gratuito e imediato</span>. Basta preencher nosso formulário e nossa equipe entra em contato em até 24h.</p></div>
              <div class="note"><h3>Quanto custa para ser agenciado?</h3><p>Ser agenciado é <span class="hl">totalmente grátis</span>, com acompanhamento personalizado focado em maximizar seus ganhos.</p></div>
            </div>
          </div>
          <div class="surface strip fq">
            <button>
              <span class="fq-ic"><svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/></svg></span>
              <b>2. Ganhos e Pagamentos</b><i class="fq-pm">+</i>
            </button>
            <div class="fq-body">
              <div class="note g"><h3>Quanto tempo leva para começar a ganhar?</h3><p>Você pode começar a ganhar <span class="hl g">desde a primeira live</span>.</p></div>
              <div class="note"><h3>Como recebo os pagamentos?</h3><p>Os pagamentos são feitos em <span class="hl">dólar diretamente pelo aplicativo</span>. Saque via Pix no mesmo dia.</p></div>
              <div class="bonus">
                <h3>Como são calculados os bônus?</h3>
                <div class="bonus-grid">
                  <div class="bonus-c"><b>200 ◆</b><span>≈ US$ 1,00</span></div>
                  <div class="bonus-c"><b>500 ◆</b><span>≈ US$ 2,50</span></div>
                  <div class="bonus-c"><b>1.000 ◆</b><span>≈ US$ 5,00</span></div>
                </div>
              </div>
            </div>
          </div>
          <div class="surface strip fq">
            <button>
              <span class="fq-ic"><svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg></span>
              <b>3. Suporte e Treinamento</b><i class="fq-pm">+</i>
            </button>
            <div class="fq-body">
              <div class="note"><h3>Qual suporte é oferecido?</h3><p>Suporte humano real e treinamento completo em vídeo, com acompanhamento diário da sua evolução. Inclui: suporte humano, vídeos de treinamento, estatísticas reais e acompanhamento.</p></div>
            </div>
          </div>
          <div class="surface strip fq">
            <button>
              <span class="fq-ic"><svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m3 17 2 2 4-4M3 7l2 2 4-4M13 6h8M13 12h8M13 18h8"/></svg></span>
              <b>4. Requisitos</b><i class="fq-pm">+</i>
            </button>
            <div class="fq-body">
              <div class="note r"><h3>Qual a idade mínima para participar?</h3><p>É necessário ter <span class="hl r">18 anos ou mais</span>. Não existe limite máximo.</p></div>
              <div class="note g"><h3>Preciso ter muitos seguidores?</h3><p><span class="hl g">Não. Você pode começar do zero.</span> Seguidores e audiência crescem com o treinamento e a consistência nas lives.</p></div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA final — recrutamento de agentes -->
    <section class="wrap">
      <div class="surface strip cta-band">
        <div>
          <span class="kicker">Programa de agentes</span>
          <h2>Recrute streamers e ganhe comissão.</h2>
          <p>Você indica novos streamers pelo seu link e eles já entram vinculados a você. Acompanha o time num painel próprio — lives ao vivo, diamantes, horas e ranking — e recebe comissão pelo desempenho. Sem custo pra começar.</p>
        </div>
        <div class="btns">
          <a href="https://wa.me/5517997176407?text=Ol%C3%A1!%20Tenho%20interesse%20em%20ser%20agente%20recrutador%20da%20DMaior%20Agency.%20Como%20funciona%3F" target="_blank" rel="noopener noreferrer" class="btn-grad">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
            Quero ser agente
          </a>
          <a href="https://www.kwai.com/@KWAIRES" target="_blank" rel="noopener noreferrer" class="btn-outline">Ver nosso Kwai</a>
        </div>
      </div>
    </section>
    `;
  }

  // ── Interações ──────────────────────────────────────────────────────
  _bind() {
    const s = this.shadowRoot;

    // título rotativo
    const rot = s.getElementById('rot');
    if (rot) {
      const frases = ['e receba em dólar.', 'e saque no mesmo dia.', 'mesmo começando do zero.', 'sem pagar pra entrar.', 'com suporte de verdade.'];
      let i = 0;
      this._timers.push(setInterval(() => {
        rot.classList.add('out');
        setTimeout(() => { i = (i + 1) % frases.length; rot.textContent = frases[i]; rot.classList.remove('out'); }, 360);
      }, 2600));
    }

    // acordeão FAQ (o "+" gira 45° via CSS)
    s.querySelectorAll('.fq > button').forEach(btn => {
      btn.addEventListener('click', () => {
        const item = btn.parentElement, was = item.classList.contains('open');
        s.querySelectorAll('.fq').forEach(f => f.classList.remove('open'));
        if (!was) item.classList.add('open');
      });
    });

    // benefícios — empilhamento no scroll: cada card gruda um pouco mais embaixo (--i)
    const grid = s.getElementById('benGrid');
    if (grid) grid.querySelectorAll('.ben').forEach((c, i) => c.style.setProperty('--i', i));
  }

  // ── Lives (via evento 'dmaior:lives' do kwai-live-widget) ────────────
  _applyLives(lives) {
    if (!this._rendered || !this.shadowRoot) return;
    lives = Array.isArray(lives) ? lives : [];
    const s = this.shadowRoot;

    // pilha de avatares do hero — fotos reais dos streamers ao vivo
    const stack = s.querySelector('.proof .stack');
    if (stack) {
      const pics = lives.filter(l => l.image).slice(0, 4);
      if (pics.length) {
        stack.innerHTML = pics.map(l => `<img src="${this._esc(l.image)}" alt="" loading="lazy">`).join('');
      }
    }

    // streamer em destaque = mais espectadores (com stream pronto na frente)
    this._featured = lives.find(l => l.ready) || lives[0] || null;
    this._renderFeatured();

    // insiste até a live tocar de fato dentro do quadro (cobre: componente
    // ainda display:none na 1ª tentativa, stream que só resolveu depois,
    // autoplay que não pegou de primeira)
    clearInterval(this._featTimer);
    let tries = 0;
    this._featTimer = setInterval(() => {
      const f = this.shadowRoot && this.shadowRoot.getElementById(
        window.matchMedia('(max-width:1000px)').matches ? 'heroFrameMob' : 'heroFrame');
      if ((f && f.classList.contains('playing')) || !this._featured || !this._featured.ready || ++tries > 12) {
        clearInterval(this._featTimer); return;
      }
      if (!this._featuredCleanup) {
        this._renderFeatured();
      } else {
        const v = f && f.querySelector('.hf-video');
        if (v) v.play().catch(() => {});
      }
    }, 2000);
    this._timers.push(this._featTimer);
  }

  _viewersText(n) {
    return (typeof n === 'number' && n > 0)
      ? n.toLocaleString('pt-BR') + ' assistindo agora'
      : 'ao vivo agora · Kwai';
  }

  _framePlaceholderHTML() {
    return `<span class="lp"><i></i>LIVE</span>
      <span class="ph">
        <svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
        <span>Live ao vivo · Kwai</span>
      </span>`;
  }

  _stopFeatured() {
    if (typeof this._featuredCleanup === 'function') { try { this._featuredCleanup(); } catch (_) {} }
    this._featuredCleanup = null;
    this._featuredUrl = null;
  }

  // Monta a live SÓ no quadro ativo do viewport atual (desktop OU mobile).
  // Nunca abre modal — a live roda dentro do quadro; tocar liga/desliga o som.
  _renderFeatured() {
    if (!this._rendered || !this.shadowRoot) return;
    const s = this.shadowRoot;
    const mobile = window.matchMedia('(max-width:1000px)').matches;
    const active = s.getElementById(mobile ? 'heroFrameMob' : 'heroFrame');
    const idle   = s.getElementById(mobile ? 'heroFrame' : 'heroFrameMob');

    // quadro que não está em uso volta ao placeholder
    if (idle && idle.dataset.url) {
      idle.classList.remove('has-live', 'playing', 'sound');
      idle.onclick = null;
      idle.innerHTML = this._framePlaceholderHTML();
      delete idle.dataset.url;
    }

    if (!active) return;
    const live = this._featured;

    if (!live) {
      this._stopFeatured();
      if (active.dataset.url) {
        active.classList.remove('has-live', 'playing', 'sound');
        active.onclick = null;
        active.innerHTML = this._framePlaceholderHTML();
        delete active.dataset.url;
      }
      return;
    }

    // troca de streamer (ou 1ª montagem)
    if (active.dataset.url !== live.url) {
      this._stopFeatured();
      this._featuredUrl = live.url;
      active.dataset.url = live.url;
      active.classList.add('has-live');
      active.classList.remove('playing', 'sound');
      active.innerHTML = `
        <img class="hf-poster" src="${this._esc(live.image)}" alt="">
        <video class="hf-video" muted playsinline webkit-playsinline autoplay></video>
        <span class="lp"><i></i>LIVE</span>
        <span class="hf-sound" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>
          <span>toque p/ som</span>
        </span>
        <div class="hf-who">
          <img src="${this._esc(live.image)}" alt="">
          <div><b>${this._esc(live.name || 'Streamer')}</b><span class="hf-vc">${this._viewersText(live.viewCount)}</span></div>
        </div>`;
      // tocar no quadro = liga/desliga o som (não abre modal, não sai da página)
      active.onclick = () => {
        const v = active.querySelector('.hf-video');
        if (!v) return;
        v.muted = !v.muted;
        active.classList.toggle('sound', !v.muted);
      };
    } else {
      const vc = active.querySelector('.hf-vc');
      if (vc) vc.textContent = this._viewersText(live.viewCount);
    }

    // liga o player (se ainda não estiver ligado e a live tem stream resolvido)
    if (!this._featuredCleanup && live.ready) {
      const lw = document.querySelector('kwai-live-widget');
      const video = active.querySelector('.hf-video');
      if (lw && video && typeof lw.playFeaturedInto === 'function') {
        const cleanup = lw.playFeaturedInto(video, live.url);
        if (cleanup) {
          this._featuredCleanup = cleanup;
          const reveal = () => active.classList.add('playing');
          video.addEventListener('playing', reveal, { once: true });
          video.addEventListener('timeupdate', reveal, { once: true });
        }
      }
    }
  }

  // ── Carrossel de campanha — getComunicados('home') (igual ao services-menu) ──
  _scheduleBanners(attempts = 0) {
    if (window.DmaiorAPI?.rank?.getComunicados) { this._loadBanners(); return; }
    if (attempts < 6) {
      const delay = attempts < 3 ? 300 + attempts * 300 : 2000;
      setTimeout(() => this._scheduleBanners(attempts + 1), delay);
    }
  }

  async _loadBanners() {
    try {
      const data   = await window.DmaiorAPI.rank.getComunicados('home');
      const slides = (data.comunicados || []).filter(c => c.imagem_url);
      const wrap   = this.shadowRoot?.getElementById('bcWrap');
      const band   = this.shadowRoot?.querySelector('.banner');
      if (!wrap) return;
      if (!slides.length) { wrap.style.display = 'none'; band?.classList.add('empty'); return; }
      band?.classList.remove('empty');
      wrap.style.display = '';
      wrap.innerHTML = this._carouselHTML(slides);
      this._bindCarousel(slides.length);
    } catch (_) { /* API indisponível — carrossel fica oculto */
      this.shadowRoot?.querySelector('.banner')?.classList.add('empty');
    }
  }

  _carouselHTML(slides) {
    const imgs = slides.map((s, i) => {
      const tag  = s.link_url ? 'a' : 'div';
      const href = s.link_url ? ` href="${this._esc(s.link_url)}" target="_blank" rel="noopener noreferrer"` : '';
      // 1º slide é o elemento de LCP (fica acima da dobra): eager + fetchpriority=high,
      // como o Lighthouse pede. O peso vem do srcset — no mobile puxa a versão w480.
      const load   = i === 0 ? 'loading="eager" fetchpriority="high"' : 'loading="lazy"';
      const src    = this._normUrl(s.imagem_url, 720);
      const set    = this._srcSet(s.imagem_url);
      const srcset = set ? ` srcset="${this._esc(set)}" sizes="(min-width:860px) 820px, 100vw"` : '';
      return `<${tag} class="bc-slide"${href}>
        <img src="${this._esc(src)}"${srcset} alt="${this._esc(s.titulo || 'Banner')}" width="1280" height="360" decoding="async" ${load}>
        ${s.titulo ? `<span class="bc-cap"><span>${this._esc(s.titulo)}</span></span>` : ''}
      </${tag}>`;
    }).join('');
    const dots = slides.length > 1
      ? `<div class="bc-dots" id="bcDots">${slides.map((_, i) => `<button class="bc-dot${i === 0 ? ' on' : ''}" data-i="${i}" aria-label="Banner ${i + 1}"></button>`).join('')}</div>`
      : '';
    return `<div class="bc" id="bc"><div class="bc-track" id="bcTrack">${imgs}</div></div>${dots}`;
  }

  _bindCarousel(n) {
    if (n <= 1) return;
    const s = this.shadowRoot;
    const bc = s.getElementById('bc'), track = s.getElementById('bcTrack'), dots = s.getElementById('bcDots');
    let i = 0, timer = null;
    const go = (x) => {
      i = ((x % n) + n) % n;
      track.style.transform = `translateX(-${i * 100}%)`;
      dots && dots.querySelectorAll('.bc-dot').forEach((d, k) => d.classList.toggle('on', k === i));
    };
    const start = () => { stop(); timer = setInterval(() => go(i + 1), 5000); this._timers.push(timer); };
    const stop = () => { if (timer) { clearInterval(timer); timer = null; } };
    dots && dots.addEventListener('click', (e) => { const b = e.target.closest('.bc-dot'); if (!b) return; go(+b.dataset.i); start(); });
    let tx = null;
    bc.addEventListener('touchstart', (e) => { tx = e.touches[0].clientX; }, { passive: true });
    bc.addEventListener('touchend', (e) => {
      if (tx === null) return;
      const dx = e.changedTouches[0].clientX - tx; tx = null;
      if (Math.abs(dx) < 40) return;
      go(dx < 0 ? i + 1 : i - 1); start();
    }, { passive: true });
    start();
  }

  _esc(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  _driveId(u) {
    if (!u || typeof u !== 'string') return null;
    try {
      const url = new URL(u.trim());
      if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
      const host = url.hostname.toLowerCase();
      if (host === 'drive.google.com' || host === 'docs.google.com' || host.endsWith('.googleusercontent.com')) {
        const m = url.pathname.match(/\/file\/d\/([^/]+)/);
        const id = m?.[1] || url.searchParams.get('id');
        if (id && /^[\w-]{10,}$/.test(id)) return id;
      }
    } catch (_) {}
    return null;
  }

  _normUrl(u, w = 720) {
    const id = this._driveId(u);
    if (id) return `https://drive.google.com/thumbnail?id=${encodeURIComponent(id)}&sz=w${w}`;
    if (!u || typeof u !== 'string') return '';
    try {
      const url = new URL(u.trim());
      if (url.protocol !== 'http:' && url.protocol !== 'https:') return '';
      return url.href;
    } catch (_) { return ''; }
  }

  // srcset só pra imagens do Drive (as únicas em que dá pra pedir tamanhos).
  _srcSet(u) {
    const id = this._driveId(u);
    if (!id) return '';
    return [480, 720, 1080]
      .map(w => `https://drive.google.com/thumbnail?id=${encodeURIComponent(id)}&sz=w${w} ${w}w`)
      .join(', ');
  }
}

customElements.define('dmaior-home-webpro', DmaiorHomeWebpro);
