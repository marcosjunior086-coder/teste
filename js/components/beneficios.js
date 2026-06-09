/**
 * beneficios.js — Grid de benefícios + FAQ sanfona
 *
 * Custom Element: <widget-beneficios>
 * Shadow DOM preservado. Sem chamadas de API.
 * Cópia direta do original Wix com renomeação mínima de tag.
 */

class WidgetBeneficios extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.render();
    this.bindEvents();
    this.toggleFaq('1');
  }

  render() {
    this.shadowRoot.innerHTML = `
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@600;700&family=Exo+2:wght@300;400;600&display=swap');
      *{margin:0;padding:0;box-sizing:border-box;max-width:100%}
      :host{display:block;width:100%;font-family:'Exo 2',sans-serif;color:var(--dm-text);background:transparent}

      /* ── Containers ── */
      .benefits-container{max-width:1000px;margin:0 auto;padding:40px 20px}
      .faq-container{max-width:900px;margin:0 auto;padding:40px 20px}

      /* ── Cabeçalhos ── */
      .header-benefits,.faq-header{text-align:center;margin-bottom:35px}
      .main-title,.faq-title{font-family:'Rajdhani',sans-serif;font-size:clamp(1.6rem,4vw,2.2rem);font-weight:700;color:var(--dm-text);text-transform:uppercase;letter-spacing:2px;margin-bottom:12px}
      .subtitle,.faq-subtitle{font-size:clamp(.85rem,2vw,1rem);color:var(--dm-text-sub);font-weight:300;max-width:520px;margin:0 auto;line-height:1.6}
      .gradient-text{color:var(--dm-cyan)}

      /* ── Cards de benefício ── */
      .benefits-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-bottom:35px}
      .benefit-card{background:var(--dm-grad-card);border:1px solid var(--dm-border-dim);border-radius:16px;padding:25px 20px;transition:all .4s ease;position:relative;overflow:hidden}
      .benefit-card::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,var(--dm-cyan),var(--dm-gold),transparent);transform:scaleX(0);transition:transform .5s ease}
      .benefit-card:hover{transform:translateY(-8px);border-color:var(--dm-cyan-25);box-shadow:0 20px 40px var(--dm-shadow-lg),0 0 20px var(--dm-cyan-10)}
      .benefit-card:hover::before{transform:scaleX(1)}
      .card-header{display:flex;align-items:center;gap:15px;margin-bottom:12px}
      .icon-container{width:48px;height:48px;display:flex;align-items:center;justify-content:center;flex-shrink:0;background:var(--dm-cyan-08);border-radius:12px;border:1px solid var(--dm-cyan-20)}
      .icon{width:28px;height:28px}
      .benefit-title{font-family:'Rajdhani',sans-serif;font-size:1.05rem;font-weight:700;color:var(--dm-text);text-transform:uppercase;letter-spacing:.5px;margin:0}
      .benefit-text{font-size:.88rem;color:var(--dm-text-sub);line-height:1.65}

      /* ── Tips grid ── */
      .tips-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:15px;margin-bottom:40px}
      .tip-card{background:var(--dm-grad-card);border:1px solid var(--dm-border-dim);padding:16px;border-radius:12px;text-align:center;transition:all .3s}
      .tip-card:hover{transform:translateY(-4px);border-color:var(--dm-cyan-25);box-shadow:0 10px 20px var(--dm-shadow-md)}
      .tip-icon{width:44px;height:44px;margin:0 auto 10px;display:flex;align-items:center;justify-content:center;background:var(--dm-cyan-08);border-radius:50%;border:1px solid var(--dm-cyan-20)}
      .tip-icon svg{width:24px;height:24px}
      .tip-text{font-family:'Rajdhani',sans-serif;font-size:.85rem;font-weight:700;color:var(--dm-text);text-transform:uppercase;letter-spacing:.5px;line-height:1.3}

      /* ── Acordeão ── */
      .accordion-wrapper{display:flex;flex-direction:column;gap:14px}
      .accordion-item{background:var(--dm-grad-card);border-radius:16px;border:1px solid var(--dm-border-dim);overflow:hidden;transition:border-color .3s}
      .accordion-item:has(.accordion-content.active){border-color:var(--dm-cyan-25)}
      .accordion-header{padding:18px 22px;display:flex;align-items:center;justify-content:space-between;cursor:pointer;transition:background .25s}
      .accordion-header:hover{background:var(--dm-cyan-05)}
      .acc-title-wrapper{display:flex;align-items:center}
      .acc-icon-left{width:38px;height:38px;margin-right:14px;display:flex;align-items:center;justify-content:center;background:var(--dm-cyan-08);border-radius:10px;border:1px solid var(--dm-cyan-20);flex-shrink:0}
      .acc-icon-left svg{width:22px;height:22px}
      .acc-title{font-family:'Rajdhani',sans-serif;font-size:1.1rem;font-weight:700;color:var(--dm-text);text-transform:uppercase;letter-spacing:.5px}
      .acc-icon-right{width:30px;height:30px;display:flex;align-items:center;justify-content:center;background:var(--dm-cyan-08);border-radius:50%;border:1px solid var(--dm-cyan-20);color:var(--dm-cyan);transition:transform .3s;flex-shrink:0}
      .acc-icon-right svg{width:18px;height:18px;stroke:var(--dm-cyan)}
      .acc-icon-right.rotated{transform:rotate(45deg)}
      .accordion-content{max-height:0;overflow:hidden;transition:max-height .4s ease-out}
      .accordion-content.active{max-height:1400px}
      .acc-body{padding:0 22px 22px;display:flex;flex-direction:column;gap:14px}

      /* ── Alertas ── */
      .alert-box{background:var(--dm-bg-1);padding:16px;border-radius:12px;border-left:3px solid}
      .alert-blue{border-left-color:var(--dm-cyan)}
      .alert-cyan{border-left-color:var(--dm-cyan)}
      .alert-green{border-left-color:var(--dm-green,#10b981)}
      .alert-red{border-left-color:var(--dm-red,#ef4444)}
      .alert-title{font-family:'Rajdhani',sans-serif;font-weight:700;margin-bottom:8px;font-size:.95rem;text-transform:uppercase;letter-spacing:.5px}
      .alert-blue .alert-title,.alert-cyan .alert-title{color:var(--dm-cyan)}
      .alert-green .alert-title{color:var(--dm-green,#10b981)}
      .alert-red .alert-title{color:var(--dm-red,#ef4444)}
      .alert-text{font-size:.9rem;color:var(--dm-text-sub);line-height:1.65}
      .hl-cyan,.hl-blue{color:var(--dm-cyan);font-weight:600}
      .hl-green{color:var(--dm-green,#10b981);font-weight:600}
      .hl-red{color:var(--dm-red,#ef4444);font-weight:600}

      /* ── Bônus ── */
      .bonus-wrapper{background:var(--dm-cyan-05);border:1px solid var(--dm-cyan-20);border-radius:12px;padding:22px}
      .bonus-header{font-family:'Rajdhani',sans-serif;font-weight:700;color:var(--dm-gold);margin-bottom:16px;display:flex;align-items:center;font-size:1rem;text-transform:uppercase;letter-spacing:.5px}
      .bonus-header svg{width:22px;height:22px;margin-right:8px}
      .bonus-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
      .bonus-card{padding:16px;border-radius:10px;text-align:center;border:1px solid var(--dm-gold-10);background:var(--dm-gold-10);transition:all .3s}
      .bonus-card:hover{transform:translateY(-3px);box-shadow:0 8px 20px var(--dm-shadow-md)}
      .bonus-val{font-family:'Rajdhani',sans-serif;font-size:1.4rem;font-weight:700;color:var(--dm-gold);display:flex;align-items:center;justify-content:center;gap:8px}
      .bonus-val svg{width:22px;height:22px}
      .bonus-sub{font-size:.82rem;color:var(--dm-text-muted);margin-top:4px}

      /* ── Suporte grid ── */
      .support-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-top:14px}
      .support-item{display:flex;flex-direction:column;align-items:center;text-align:center}
      .support-icon{width:44px;height:44px;margin-bottom:8px;display:flex;align-items:center;justify-content:center;background:var(--dm-cyan-08);border-radius:50%;border:1px solid var(--dm-cyan-20)}
      .support-icon svg{width:24px;height:24px}
      .support-text{font-size:.82rem;color:var(--dm-text-muted);line-height:1.3;font-family:'Rajdhani',sans-serif;text-transform:uppercase;letter-spacing:.3px}

      @media(max-width:1024px){.benefits-grid{grid-template-columns:repeat(2,1fr)}.tips-grid,.support-grid{grid-template-columns:repeat(2,1fr)}}
      @media(max-width:768px){.benefits-container,.faq-container{padding:28px 14px}.benefits-grid{grid-template-columns:1fr}.bonus-grid{grid-template-columns:1fr}.acc-title{font-size:1rem}.accordion-header{padding:14px 16px}.acc-body{padding:0 14px 18px}}
      @media(max-width:480px){.tips-grid{grid-template-columns:repeat(2,1fr)}.support-grid{grid-template-columns:repeat(2,1fr)}.accordion-content.active{max-height:1800px}}
    </style>

    <div class="benefits-container">
      <header class="header-benefits">
        <h1 class="main-title">Benefícios Exclusivos</h1>
        <p class="subtitle">Descubra os diferenciais que fazem da nossa agência a escolha certa para sua jornada no mundo das lives</p>
      </header>
      <main class="benefits-grid">
        <article class="benefit-card">
          <div class="card-header"><div class="icon-container"><svg class="icon" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9V15C5 16.1 5.9 17 7 17H8V11H6V9C6 5.69 8.69 3 12 3S18 5.69 18 9V11H16V17H17C18.1 17 19 16.1 19 15V9C19 5.13 15.87 2 12 2Z" fill="none" stroke="#3b82f6" stroke-width="1.5"/><rect x="4" y="11" width="4" height="6" rx="2" fill="#3b82f6"/><rect x="16" y="11" width="4" height="6" rx="2" fill="#3b82f6"/><path d="M9 19C9 20.1 9.9 21 11 21H13C14.1 21 15 20.1 15 19" stroke="#10b981" stroke-width="1.5" fill="none" stroke-linecap="round"/><circle cx="12" cy="9" r="1" fill="#00e5e5"/></svg></div><h2 class="benefit-title">Suporte completo exclusivo</h2></div>
          <p class="benefit-text">Suporte humano com equipe especializada, preparada para oferecer orientação profissional e acompanhamento contínuo em todas as etapas do processo.</p>
        </article>
        <article class="benefit-card">
          <div class="card-header"><div class="icon-container"><svg class="icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3" fill="none" stroke="#3b82f6" stroke-width="1.5"/><path d="M12 1L13.09 4.26L16 2L14.74 5.09L18 4L16.74 7.09L20 8L16.74 9.91L18 12L14.74 10.91L16 14L13.09 12.74L12 16L10.91 12.74L8 14L9.26 10.91L6 12L7.26 9.91L4 8L7.26 7.09L6 4L9.26 5.09L8 2L10.91 4.26L12 1Z" fill="none" stroke="#3b82f6" stroke-width="1"/><circle cx="18" cy="6" r="2" fill="none" stroke="#00e5e5" stroke-width="1"/><circle cx="6" cy="18" r="2" fill="none" stroke="#10b981" stroke-width="1"/><path d="M16.5 7.5L15 9M8.5 16.5L7 18" stroke="#00e5e5" stroke-width="1" stroke-linecap="round"/></svg></div><h2 class="benefit-title">Método exclusivo</h2></div>
          <p class="benefit-text">Metodologia própria, desenvolvida e validada de acordo com as regras oficiais da plataforma, garantindo segurança e consistência.</p>
        </article>
        <article class="benefit-card">
          <div class="card-header"><div class="icon-container"><svg class="icon" viewBox="0 0 24 24"><path d="M12 2L4 6V12C4 18 12 22 12 22S20 18 20 12V6L12 2Z" fill="none" stroke="#10b981" stroke-width="1.5"/><path d="M9 12L11 14L15 10" stroke="#10b981" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="2" r="1" fill="#00e5e5"/><path d="M12 3V7" stroke="#3b82f6" stroke-width="1" stroke-linecap="round"/><text x="12" y="20" text-anchor="middle" fill="#3b82f6" font-size="6" font-weight="bold">FREE</text></svg></div><h2 class="benefit-title">Adesão gratuita</h2></div>
          <p class="benefit-text">Candidatura, treinamento e suporte totalmente gratuitos, com transparência e sem custos adicionais.</p>
        </article>
        <article class="benefit-card">
          <div class="card-header"><div class="icon-container"><svg class="icon" viewBox="0 0 24 24"><path d="M12 3L1 9L12 15L21 10.09V17H23V9L12 3Z" fill="none" stroke="#3b82f6" stroke-width="1.5"/><path d="M5 13.18V17.18C5 17.97 8.58 20 12 20S19 17.97 19 17.18V13.18" fill="none" stroke="#00e5e5" stroke-width="1.5"/><circle cx="12" cy="9" r="1" fill="#00e5e5"/><path d="M8 11L12 13L16 11" stroke="#10b981" stroke-width="1" stroke-linecap="round"/><path d="M21 10L23 11V15L21 16" stroke="#3b82f6" stroke-width="1" stroke-linecap="round"/></svg></div><h2 class="benefit-title">Sem experiência prévia</h2></div>
          <p class="benefit-text">Não importa se você nunca fez lives: nossa equipe acompanha cada passo do seu desenvolvimento até a evolução completa.</p>
        </article>
        <article class="benefit-card">
          <div class="card-header"><div class="icon-container"><svg class="icon" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="14" rx="2" fill="none" stroke="#3b82f6" stroke-width="1.5"/><path d="M7 8H17M7 12H13M7 16H15" stroke="#10b981" stroke-width="1" stroke-linecap="round"/><circle cx="19" cy="6" r="2" fill="#00e5e5"/><path d="M17 6H21" stroke="#00e5e5" stroke-width="1" stroke-linecap="round"/><rect x="15" y="14" width="4" height="2" rx="1" fill="#3b82f6"/><path d="M3 20L6 17L9 19L12 16L15 18L18 15L21 17" stroke="#10b981" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg></div><h2 class="benefit-title">Monitoramento constante</h2></div>
          <p class="benefit-text">Acompanhamento profissional do desempenho, com análise de metas e orientações para aprimoramento contínuo.</p>
        </article>
        <article class="benefit-card">
          <div class="card-header"><div class="icon-container"><svg class="icon" viewBox="0 0 24 24"><path d="M7 4V2C7 1.45 7.45 1 8 1H16C16.55 1 17 1.45 17 2V4H20C21.1 4 22 4.9 22 6V8C22 10.76 19.76 13 17 13H16.5C16.19 15.37 14.37 17.19 12 17.5V20H16V22H8V20H12V17.5C9.63 17.19 7.81 15.37 7.5 13H7C4.24 13 2 10.76 2 8V6C2 4.9 2.9 4 4 4H7Z" fill="none" stroke="#00e5e5" stroke-width="1.5"/><circle cx="12" cy="8" r="2" fill="none" stroke="#10b981" stroke-width="1"/><text x="12" y="11" text-anchor="middle" fill="#3b82f6" font-size="6" font-weight="bold">$</text><path d="M4 6H7M17 6H20" stroke="#3b82f6" stroke-width="1" stroke-linecap="round"/><circle cx="4" cy="8" r="1" fill="#3b82f6"/><circle cx="20" cy="8" r="1" fill="#3b82f6"/></svg></div><h2 class="benefit-title">Premiações extras</h2></div>
          <p class="benefit-text">Reconhecimento e benefícios adicionais mediante o alcance de metas previamente estabelecidas.</p>
        </article>
      </main>
    </div>

    <div class="faq-container">
      <header class="faq-header">
        <h1 class="faq-title gradient-text">FAQ - Perguntas Frequentes</h1>
        <p class="faq-subtitle">Tudo que você precisa saber sobre nossa agência</p>
      </header>
      <section class="tips-grid">
        <div class="tip-card"><div class="tip-icon"><svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="3" fill="#3B82F6"/><circle cx="12" cy="12" r="8" stroke="#00E5E5" stroke-width="2" fill="none"/><path d="M12 4V2M12 22V20M20 12H22M2 12H4" stroke="#3B82F6" stroke-width="2" stroke-linecap="round"/></svg></div><p class="tip-text">Não precisa de experiência!</p></div>
        <div class="tip-card"><div class="tip-icon"><svg viewBox="0 0 24 24" fill="none"><path d="M9 12L11 14L15 10" stroke="#10B981" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="12" r="9" stroke="#00E5E5" stroke-width="2" fill="none"/></svg></div><p class="tip-text">Comece do zero!</p></div>
        <div class="tip-card"><div class="tip-icon"><svg viewBox="0 0 24 24" fill="none"><path d="M12 2L22 8.5V15.5L12 22L2 15.5V8.5L12 2Z" stroke="#3B82F6" stroke-width="2" fill="none"/><circle cx="12" cy="12" r="4" fill="#00E5E5"/><path d="M8 12L10 14L16 8" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div><p class="tip-text">Cresça com suporte</p></div>
        <div class="tip-card"><div class="tip-icon"><svg viewBox="0 0 24 24" fill="none"><rect x="3" y="8" width="18" height="10" rx="2" stroke="#F59E0B" stroke-width="2" fill="none"/><path d="M7 8V6C7 4.34 8.34 3 10 3H14C15.66 3 17 4.34 17 6V8" stroke="#EF4444" stroke-width="2" stroke-linecap="round"/><path d="M8 12L10 14L16 8" stroke="#10B981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div><p class="tip-text">Resultados reais</p></div>
      </section>
      <div class="accordion-wrapper">
        <section class="accordion-item">
          <div class="accordion-header" data-id="1">
            <div class="acc-title-wrapper"><div class="acc-icon-left"><svg viewBox="0 0 24 24" fill="none"><rect x="4" y="6" width="16" height="12" rx="2" stroke="#3B82F6" stroke-width="2" fill="none"/><path d="M7 10H17M7 14H14" stroke="#00E5E5" stroke-width="2" stroke-linecap="round"/><circle cx="18" cy="4" r="2" fill="#10B981"/><path d="M17 4L17.5 4.5L19 3" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></div><h2 class="acc-title gradient-text">1. Processo de Seleção</h2></div>
            <div class="acc-icon-right" id="icon1"><svg viewBox="0 0 24 24" fill="none"><path d="M12 5V19M5 12H19" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></div>
          </div>
          <div class="accordion-content" id="content1"><div class="acc-body">
            <div class="alert-box alert-blue"><h3 class="alert-title">Como funciona o processo de seleção?</h3><p class="alert-text">O processo é <span class="hl-cyan">100% gratuito e imediato</span>. Basta preencher nosso formulário e nossa equipe entrará em contato em até 24h.</p></div>
            <div class="alert-box alert-cyan"><h3 class="alert-title">Quanto custa para ser agenciado?</h3><p class="alert-text">Ser agenciado é <span class="hl-blue">totalmente grátis</span>, com acompanhamento personalizado focado em maximizar seus ganhos.</p></div>
          </div></div>
        </section>
        <section class="accordion-item">
          <div class="accordion-header" data-id="2">
            <div class="acc-title-wrapper"><div class="acc-icon-left"><svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8" stroke="#10B981" stroke-width="2" fill="none"/><path d="M12 8V16M9 10H15M9 14H15" stroke="#F59E0B" stroke-width="2" stroke-linecap="round"/><path d="M16 6L20 10M4 14L8 18M8 6L4 10M20 14L16 18" stroke="#00E5E5" stroke-width="1.5" stroke-linecap="round"/></svg></div><h2 class="acc-title gradient-text">2. Ganhos e Pagamentos</h2></div>
            <div class="acc-icon-right" id="icon2"><svg viewBox="0 0 24 24" fill="none"><path d="M12 5V19M5 12H19" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></div>
          </div>
          <div class="accordion-content" id="content2"><div class="acc-body">
            <div class="alert-box alert-green"><h3 class="alert-title">Quanto tempo leva para começar a ganhar?</h3><p class="alert-text">Você pode começar a ganhar <span class="hl-green">desde a primeira live</span>.</p></div>
            <div class="alert-box alert-blue"><h3 class="alert-title">Como recebo os pagamentos?</h3><p class="alert-text">Os pagamentos são feitos em <span class="hl-blue">dólar diretamente pelo aplicativo</span>. Saque via Pix no mesmo dia.</p></div>
            <div class="bonus-wrapper">
              <h3 class="bonus-header"><svg viewBox="0 0 24 24" fill="none"><path d="M12 2L18 8L12 14L6 8L12 2Z" fill="#F59E0B" stroke="#00E5E5" stroke-width="1"/></svg>Como são calculados os bônus?</h3>
              <div class="bonus-grid">
                <div class="bonus-card bonus-yellow"><div class="bonus-val">200 <svg viewBox="0 0 24 24" fill="none"><path d="M12 3L17 8L12 13L7 8L12 3Z" fill="#F59E0B" stroke="#F97316" stroke-width="1"/></svg></div><div class="bonus-sub">≈ US$ 1,00</div></div>
                <div class="bonus-card bonus-orange"><div class="bonus-val">500 <svg viewBox="0 0 24 24" fill="none"><path d="M12 3L17 8L12 13L7 8L12 3Z" fill="#F97316" stroke="#EF4444" stroke-width="1"/></svg></div><div class="bonus-sub">≈ US$ 2,50</div></div>
                <div class="bonus-card bonus-red"><div class="bonus-val">1.000 <svg viewBox="0 0 24 24" fill="none"><path d="M12 3L17 8L12 13L7 8L12 3Z" fill="#EF4444" stroke="#3B82F6" stroke-width="1"/></svg></div><div class="bonus-sub">≈ US$ 5,00</div></div>
              </div>
            </div>
          </div></div>
        </section>
        <section class="accordion-item">
          <div class="accordion-header" data-id="3">
            <div class="acc-title-wrapper"><div class="acc-icon-left"><svg viewBox="0 0 24 24" fill="none"><path d="M12 2L20 7V17L12 22L4 17V7L12 2Z" stroke="#3B82F6" stroke-width="2" fill="none"/><circle cx="12" cy="12" r="4" fill="#00E5E5"/><path d="M10 12L11 13L14 10" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div><h2 class="acc-title gradient-text">3. Suporte e Treinamento</h2></div>
            <div class="acc-icon-right" id="icon3"><svg viewBox="0 0 24 24" fill="none"><path d="M12 5V19M5 12H19" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></div>
          </div>
          <div class="accordion-content" id="content3"><div class="acc-body">
            <div class="alert-box alert-blue"><h3 class="alert-title">Qual suporte é oferecido?</h3><p class="alert-text">Suporte humano real e treinamento completo em vídeo, com acompanhamento diário da sua evolução.</p>
              <div class="support-grid">
                <div class="support-item"><div class="support-icon"><svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="3" fill="#3B82F6"/><path d="M12 1V5M12 19V23M4.22 4.22L6.34 6.34M17.66 17.66L19.78 19.78M1 12H5M19 12H23M4.22 19.78L6.34 17.66M17.66 6.34L19.78 4.22" stroke="#00E5E5" stroke-width="2" stroke-linecap="round"/></svg></div><span class="support-text">Suporte Humano</span></div>
                <div class="support-item"><div class="support-icon"><svg viewBox="0 0 24 24" fill="none"><rect x="3" y="6" width="18" height="12" rx="2" stroke="#374151" stroke-width="2" fill="none"/><path d="M9 10L13 12L9 14V10Z" fill="#3B82F6"/><circle cx="18" cy="8" r="2" fill="#00E5E5"/></svg></div><span class="support-text">Vídeos de Treinamento</span></div>
                <div class="support-item"><div class="support-icon"><svg viewBox="0 0 24 24" fill="none"><rect x="4" y="4" width="16" height="16" rx="2" stroke="#059669" stroke-width="2" fill="none"/><path d="M8 16V12M12 16V8M16 16V10" stroke="#10B981" stroke-width="2" stroke-linecap="round"/></svg></div><span class="support-text">Estatísticas Reais</span></div>
                <div class="support-item"><div class="support-icon"><svg viewBox="0 0 24 24" fill="none"><rect x="4" y="6" width="16" height="12" rx="2" stroke="#3B82F6" stroke-width="2" fill="none"/><path d="M16 2V6M8 2V6M4 10H20" stroke="#00E5E5" stroke-width="2" stroke-linecap="round"/><circle cx="9" cy="13" r="1" fill="#10B981"/><circle cx="15" cy="13" r="1" fill="#EF4444"/></svg></div><span class="support-text">Acompanhamento</span></div>
              </div>
            </div>
          </div></div>
        </section>
        <section class="accordion-item">
          <div class="accordion-header" data-id="4">
            <div class="acc-title-wrapper"><div class="acc-icon-left"><svg viewBox="0 0 24 24" fill="none"><rect x="5" y="5" width="14" height="14" rx="2" stroke="#00E5E5" stroke-width="2" fill="none"/><path d="M9 12L11 14L15 10" stroke="#3B82F6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="18" cy="6" r="2" fill="#10B981"/><path d="M17 6L17.5 6.5L19 5" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></div><h2 class="acc-title gradient-text">4. Requisitos</h2></div>
            <div class="acc-icon-right" id="icon4"><svg viewBox="0 0 24 24" fill="none"><path d="M12 5V19M5 12H19" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></div>
          </div>
          <div class="accordion-content" id="content4"><div class="acc-body">
            <div class="alert-box alert-red"><h3 class="alert-title">Qual a idade mínima para participar?</h3><p class="alert-text">É necessário ter <span class="hl-red">18 anos ou mais</span>. Não existe limite máximo.</p></div>
            <div class="alert-box alert-green"><h3 class="alert-title">Preciso ter muitos seguidores?</h3><p class="alert-text"><span class="hl-green">Não. Você pode começar do zero.</span> Seguidores e audiência crescem com o treinamento e consistência nas lives.</p></div>
          </div></div>
        </section>
      </div>
    </div>`;
  }

  bindEvents() {
    this.shadowRoot.querySelectorAll('.accordion-header').forEach(header => {
      header.addEventListener('click', () => this.toggleFaq(header.getAttribute('data-id')));
    });
  }

  toggleFaq(id) {
    this.shadowRoot.querySelectorAll('.accordion-content').forEach(c => c.classList.remove('active'));
    this.shadowRoot.querySelectorAll('.acc-icon-right').forEach(i => i.classList.remove('rotated'));
    const content = this.shadowRoot.getElementById('content' + id);
    const icon    = this.shadowRoot.getElementById('icon' + id);
    if (content && icon) { content.classList.add('active'); icon.classList.add('rotated'); }
  }
}

customElements.define('widget-beneficios', WidgetBeneficios);
