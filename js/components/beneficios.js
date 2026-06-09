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
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
      *{margin:0;padding:0;box-sizing:border-box;max-width:100%}
      :host{display:block;width:100%;font-family:'Inter',sans-serif;color:var(--dm-text);background:transparent}
      .benefits-container{max-width:1000px;margin:0 auto;padding:40px 20px}
      .header-benefits{text-align:center;margin-bottom:35px}
      .main-title{font-size:2.2rem;font-weight:700;color:var(--dm-text);margin-bottom:15px;text-shadow:0 2px 10px rgba(59,130,246,0.2);letter-spacing:-0.02em}
      .subtitle{font-size:1.1rem;color:var(--dm-text-sub);font-weight:300;max-width:500px;margin:0 auto;line-height:1.5}
      .benefits-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-bottom:35px}
      .benefit-card{background:var(--dm-bg-card);backdrop-filter:blur(10px);border:1px solid var(--dm-bw10);border-radius:16px;padding:25px 20px;transition:all 0.5s cubic-bezier(0.4,0,0.2,1);position:relative;overflow:hidden}
      .benefit-card::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,#3b82f6,#00e5e5,#10b981,#3b82f6);transform:scaleX(0);transition:transform 0.6s ease;border-radius:20px 20px 0 0}
      .benefit-card::after{content:'';position:absolute;top:0;left:0;right:0;bottom:0;background:linear-gradient(135deg,rgba(59,130,246,0.08),rgba(0,229,229,0.08),rgba(16,185,129,0.05));opacity:0;transition:opacity 0.5s ease;border-radius:20px}
      .benefit-card:hover{transform:translateY(-15px) scale(1.03);background:rgba(255,255,255,0.1);border-color:rgba(59,130,246,0.5);box-shadow:0 30px 60px rgba(59,130,246,0.2),0 0 40px rgba(0,229,229,0.15),inset 0 1px 0 rgba(255,255,255,0.1)}
      .benefit-card:hover::before{transform:scaleX(1)}
      .benefit-card:hover::after{opacity:1}
      .card-header{display:flex;align-items:center;gap:15px;margin-bottom:15px}
      .icon-container{width:50px;height:50px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
      .icon{width:35px;height:35px;fill:white}
      .benefit-title{font-size:1.2rem;font-weight:600;color:var(--dm-text);margin:0}
      .benefit-text{font-size:0.9rem;color:var(--dm-text-sub);line-height:1.6}
      .faq-container{max-width:900px;margin:0 auto;padding:40px 20px}
      .gradient-text{background:linear-gradient(135deg,#3b82f6,#00e5e5);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
      .faq-header{text-align:center;margin-bottom:40px}
      .faq-title{font-size:2.5rem;font-weight:700;margin-bottom:15px;line-height:1.2}
      .faq-subtitle{font-size:1.1rem;color:var(--dm-text-sub);max-width:600px;margin:0 auto}
      .tips-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:15px;margin-bottom:40px}
      .tip-card{background:linear-gradient(to bottom right,rgba(37,99,235,0.2),rgba(6,182,212,0.2));border:1px solid rgba(59,130,246,0.3);padding:15px;border-radius:12px;text-align:center;transition:all 0.3s}
      .tip-card:hover{transform:translateY(-5px);box-shadow:0 10px 20px rgba(59,130,246,0.2)}
      .tip-icon{width:48px;height:48px;margin:0 auto 10px auto;display:flex;align-items:center;justify-content:center}
      .tip-icon svg{width:28px;height:28px}
      .tip-text{font-size:0.85rem;font-weight:600;line-height:1.2}
      .accordion-wrapper{display:flex;flex-direction:column;gap:16px}
      .accordion-item{background:linear-gradient(to right,rgba(30,58,138,0.3),rgba(22,78,99,0.3));border-radius:16px;border:1px solid rgba(59,130,246,0.3);overflow:hidden;box-shadow:0 0 15px rgba(59,130,246,0.1)}
      .accordion-header{padding:20px 24px;display:flex;align-items:center;justify-content:space-between;cursor:pointer;transition:background 0.3s}
      .accordion-header:hover{background:linear-gradient(to right,rgba(30,58,138,0.4),rgba(22,78,99,0.4))}
      .acc-title-wrapper{display:flex;align-items:center}
      .acc-icon-left{width:40px;height:40px;margin-right:15px;display:flex;align-items:center;justify-content:center}
      .acc-icon-left svg{width:28px;height:28px}
      .acc-title{font-size:1.25rem;font-weight:700}
      .acc-icon-right{width:32px;height:32px;display:flex;align-items:center;justify-content:center;background:rgba(37,99,235,0.3);border-radius:50%;border:1px solid rgba(96,165,250,0.5);transition:transform 0.3s;flex-shrink:0}
      .acc-icon-right svg{width:20px;height:20px}
      .acc-icon-right.rotated{transform:rotate(45deg)}
      .accordion-content{max-height:0;overflow:hidden;transition:max-height 0.4s ease-out}
      .accordion-content.active{max-height:1200px}
      .acc-body{padding:0 24px 24px 24px;display:flex;flex-direction:column;gap:16px}
      .alert-box{background:rgba(0,0,0,0.3);padding:16px;border-radius:12px;border-left:4px solid}
      .alert-blue{border-left-color:#3b82f6}
      .alert-cyan{border-left-color:#06b6d4}
      .alert-green{border-left-color:#10b981}
      .alert-red{border-left-color:#ef4444}
      .alert-title{font-weight:600;margin-bottom:8px;font-size:1rem}
      .alert-blue .alert-title{color:#93c5fd}
      .alert-cyan .alert-title{color:#67e8f9}
      .alert-green .alert-title{color:#6ee7b7}
      .alert-red .alert-title{color:#fca5a5}
      .alert-text{font-size:0.95rem;color:var(--dm-text-sub);line-height:1.6}
      .hl-cyan{color:#22d3ee;font-weight:600}
      .hl-blue{color:#60a5fa;font-weight:600}
      .hl-green{color:#34d399;font-weight:600}
      .hl-red{color:#f87171;font-weight:600}
      .bonus-wrapper{background:linear-gradient(135deg,rgba(37,99,235,0.1),rgba(6,182,212,0.1));border:1px solid rgba(37,99,235,0.3);border-radius:12px;padding:24px}
      .bonus-header{font-weight:600;color:#fde047;margin-bottom:16px;display:flex;align-items:center;font-size:1rem}
      .bonus-header svg{width:24px;height:24px;margin-right:8px}
      .bonus-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
      .bonus-card{padding:16px;border-radius:8px;text-align:center;border:1px solid;transition:all 0.3s}
      .bonus-card:hover{transform:translateY(-4px) scale(1.02)}
      .bonus-yellow{background:linear-gradient(to bottom right,rgba(202,138,4,0.2),rgba(234,88,12,0.2));border-color:rgba(234,179,8,0.3)}
      .bonus-orange{background:linear-gradient(to bottom right,rgba(234,88,12,0.2),rgba(239,68,68,0.2));border-color:rgba(249,115,22,0.3)}
      .bonus-red{background:linear-gradient(to bottom right,rgba(239,68,68,0.2),rgba(219,39,119,0.2));border-color:rgba(239,68,68,0.3)}
      .bonus-val{font-size:1.5rem;font-weight:700;display:flex;align-items:center;justify-content:center;gap:8px}
      .bonus-yellow .bonus-val{color:#facc15}
      .bonus-orange .bonus-val{color:#fb923c}
      .bonus-red .bonus-val{color:#f87171}
      .bonus-val svg{width:24px;height:24px}
      .bonus-sub{font-size:0.85rem;color:var(--dm-text-sub);margin-top:4px}
      .support-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-top:16px}
      .support-item{display:flex;flex-direction:column;align-items:center;text-align:center}
      .support-icon{width:48px;height:48px;margin-bottom:8px;display:flex;align-items:center;justify-content:center}
      .support-icon svg{width:28px;height:28px}
      .support-text{font-size:0.85rem;color:#9ca3af;line-height:1.2}
      @media(max-width:1024px){.benefits-grid{grid-template-columns:repeat(2,1fr)}.tips-grid,.support-grid{grid-template-columns:repeat(2,1fr)}}
      @media(max-width:768px){.benefits-container,.faq-container{padding:30px 15px}.main-title,.faq-title{font-size:1.8rem}.benefits-grid{grid-template-columns:1fr}.bonus-grid{grid-template-columns:1fr}.acc-title{font-size:1.1rem}.accordion-header{padding:16px}.acc-body{padding:0 16px 16px 16px}}
      @media(max-width:480px){.accordion-content.active{max-height:1800px}}
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
