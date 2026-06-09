/**
 * policies.js — Políticas DMaior Agency
 *
 * Custom Element: <dmaior-policies>
 * Shadow DOM, 15 seções LGPD, TOC interativo, IntersectionObserver.
 * Cópia 100% fiel ao original. Sem chamadas de API.
 */

class DMaiorPolicies extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.render();
    const scrollArea = this.shadowRoot.querySelector('.scroll-area');
    this._initObserver(scrollArea);
    this._initTOC(scrollArea);
  }

  _initObserver(scrollArea) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); }
        });
      },
      { root: scrollArea, threshold: 0.08, rootMargin: '0px 0px -30px 0px' }
    );
    this.shadowRoot.querySelectorAll('.animate').forEach(el => observer.observe(el));
  }

  _initTOC(scrollArea) {
    const tocLinks = this.shadowRoot.querySelectorAll('.toc-link');
    tocLinks.forEach(link => {
      link.addEventListener('click', () => {
        const target = this.shadowRoot.getElementById(link.dataset.target);
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        tocLinks.forEach(l => l.classList.remove('active'));
        link.classList.add('active');
      });
    });
    scrollArea.addEventListener('scroll', () => {
      const sections = this.shadowRoot.querySelectorAll('.policy-section');
      const areaTop  = scrollArea.getBoundingClientRect().top;
      let current    = '';
      sections.forEach(sec => {
        if (sec.getBoundingClientRect().top - areaTop <= 120) current = sec.id;
      });
      tocLinks.forEach(l => l.classList.toggle('active', l.dataset.target === current));
    });
  }

  render() {
    this.shadowRoot.innerHTML = `
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Exo+2:wght@300;400;500;600&family=Rajdhani:wght@500;600;700&display=swap');
      :host{display:block;width:100%;box-sizing:border-box;font-family:'Exo 2',sans-serif;--cyan:#00f2ff;--cyan-dim:rgba(0,242,255,0.65);--cyan-glow:rgba(0,242,255,0.22);--cyan-border:rgba(0,242,255,0.16);--bg-deep:#0b0b18;--bg-card:rgba(255,255,255,0.025);--text-main:#e4eef8;--text-muted:#7a9ab4;--text-dim:#4a6070;--radius:16px;--ease:0.35s cubic-bezier(.4,0,.2,1)}
      /* ── Tema branco: cards e fundo claros ── */
      :host-context([data-theme="branco"]){--bg-deep:#f0f4f8;--bg-card:#ffffff;--text-main:#0d1117;--text-muted:#2d3748;--text-dim:#4a5568;--cyan:#0095a8;--cyan-dim:rgba(0,149,168,0.8);--cyan-glow:rgba(0,149,168,0.15);--cyan-border:rgba(0,149,168,0.25)}
      *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
      .root{background:var(--bg-deep);border:1px solid var(--cyan-border);border-radius:20px;box-shadow:0 8px 60px rgba(0,0,0,0.85),inset 0 1px 0 rgba(255,255,255,0.035);max-width:980px;margin:10px auto;overflow:hidden;display:grid;grid-template-rows:auto 1fr}
      .header{padding:clamp(26px,5vw,52px) clamp(22px,5vw,56px) clamp(18px,3vw,34px);border-bottom:1px solid var(--cyan-border);background:linear-gradient(135deg,rgba(0,242,255,0.04) 0%,transparent 55%)}
      .header-badge{display:inline-flex;align-items:center;gap:7px;background:rgba(0,242,255,0.07);border:1px solid var(--cyan-border);border-radius:20px;padding:4px 13px;margin-bottom:14px;font-size:0.7rem;letter-spacing:0.14em;text-transform:uppercase;color:var(--cyan-dim)}
      .badge-dot{width:6px;height:6px;background:var(--cyan);border-radius:50%;box-shadow:0 0 8px var(--cyan);animation:pdot 2.2s ease-in-out infinite}
      @keyframes pdot{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(.65)}}
      .header h1{font-family:'Rajdhani',sans-serif;font-size:clamp(1.85rem,5vw,3rem);font-weight:700;color:var(--text-main);text-transform:uppercase;letter-spacing:0.07em;line-height:1.1;text-shadow:0 0 40px var(--cyan-glow)}
      .header h1 em{font-style:normal;color:var(--cyan)}
      .header-sub{margin-top:10px;font-size:0.8rem;color:var(--text-dim);letter-spacing:0.04em}
      .header-sub span{color:var(--text-muted)}
      .body{display:grid;grid-template-columns:230px 1fr}
      .toc{border-right:1px solid var(--cyan-border);padding:28px 18px;}
      .toc::-webkit-scrollbar{width:2px}.toc::-webkit-scrollbar-thumb{background:var(--cyan-border);border-radius:2px}
      .toc-label{font-family:'Rajdhani',sans-serif;font-size:0.68rem;letter-spacing:0.18em;text-transform:uppercase;color:var(--text-dim);margin-bottom:14px;padding-left:10px}
      .toc-link{display:flex;align-items:flex-start;gap:9px;padding:8px 10px;border-radius:8px;color:var(--text-muted);font-size:0.82rem;font-weight:500;cursor:pointer;transition:var(--ease);border:1px solid transparent;margin-bottom:3px;background:none;text-align:left;width:100%;line-height:1.35}
      .toc-link:hover{color:var(--text-main);background:rgba(0,242,255,0.05);border-color:var(--cyan-border)}
      .toc-link.active{color:var(--cyan);background:rgba(0,242,255,0.08);border-color:rgba(0,242,255,0.28)}
      .toc-num{font-family:'Rajdhani',sans-serif;font-size:0.7rem;font-weight:700;color:var(--text-dim);min-width:18px;padding-top:1px;transition:color var(--ease)}
      .toc-link.active .toc-num{color:var(--cyan)}
      .scroll-area{padding:clamp(28px,4vw,48px) clamp(22px,4vw,52px);}
      .scroll-area::-webkit-scrollbar{width:3px}.scroll-area::-webkit-scrollbar-thumb{background:var(--cyan-border);border-radius:3px}
      .policy-section{margin-bottom:54px;scroll-margin-top:24px}
      .animate{opacity:0;transform:translateY(20px);transition:opacity .5s ease,transform .5s ease}
      .animate.visible{opacity:1;transform:none}
      .sec-title{display:flex;align-items:center;gap:13px;margin-bottom:24px;padding-bottom:16px;border-bottom:1px solid var(--cyan-border);position:relative}
      .sec-title::after{content:'';position:absolute;bottom:-1px;left:0;width:55px;height:1px;background:var(--cyan);box-shadow:0 0 10px var(--cyan)}
      .sec-icon{display:flex;align-items:center;justify-content:center;width:38px;height:38px;border-radius:10px;background:rgba(0,242,255,0.07);border:1px solid var(--cyan-border);flex-shrink:0;color:var(--cyan)}
      .sec-title h2{font-family:'Rajdhani',sans-serif;font-size:clamp(1.05rem,2.5vw,1.35rem);font-weight:700;color:var(--text-main);text-transform:uppercase;letter-spacing:0.06em}
      .sub{margin-top:26px}
      .sub h3{font-family:'Rajdhani',sans-serif;font-size:.95rem;font-weight:600;color:var(--cyan-dim);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:10px;display:flex;align-items:center;gap:8px}
      .sub h3::before{content:'';display:inline-block;width:3px;height:13px;background:var(--cyan);border-radius:2px;box-shadow:0 0 5px var(--cyan)}
      p{color:var(--text-muted);font-size:clamp(.87rem,1.8vw,.96rem);line-height:1.78;margin-bottom:12px;font-weight:300}
      strong{color:var(--text-main);font-weight:600}
      .ilist{display:flex;flex-direction:column;gap:9px;margin-top:12px}
      .irow{display:flex;align-items:flex-start;gap:12px;padding:12px 15px;background:var(--bg-card);border:1px solid var(--cyan-border);border-radius:10px;transition:border-color var(--ease),background var(--ease)}
      .irow:hover{background:rgba(0,242,255,0.04);border-color:rgba(0,242,255,0.3)}
      .iarrow{color:var(--cyan);flex-shrink:0;font-size:.85rem;margin-top:2px}
      .itext{color:var(--text-muted);font-size:.88rem;line-height:1.62;font-weight:300}
      .itext strong{color:var(--text-main)}
      .alert{margin-top:18px;padding:13px 17px;border-left:3px solid var(--cyan);background:rgba(0,242,255,0.04);border-radius:0 10px 10px 0;font-size:.87rem;color:var(--text-muted);line-height:1.65}
      .alert strong{color:var(--cyan)}
      .alert.warn{border-left-color:#ffcc00;background:rgba(255,204,0,0.04)}
      .alert.warn strong{color:#ffcc00}
      .rights-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(175px,1fr));gap:10px;margin-top:14px}
      .right-card{padding:14px 15px;background:var(--bg-card);border:1px solid var(--cyan-border);border-radius:10px;transition:var(--ease)}
      .right-card:hover{border-color:rgba(0,242,255,.35);background:rgba(0,242,255,0.04)}
      .rc-title{font-family:'Rajdhani',sans-serif;font-size:.9rem;font-weight:700;color:var(--cyan-dim);text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px}
      .right-card p{font-size:.82rem;margin-bottom:0}
      .divider{height:1px;background:linear-gradient(90deg,transparent,var(--cyan-border),transparent);margin:48px 0}
      .contact-card{margin-top:44px;padding:clamp(18px,4vw,34px);background:linear-gradient(135deg,rgba(0,242,255,0.05) 0%,rgba(0,242,255,0.02) 100%);border:1px dashed rgba(0,242,255,.35);border-radius:var(--radius);text-align:center}
      .contact-card svg{color:var(--cyan);margin-bottom:12px}
      .contact-label{font-size:.87rem;color:var(--text-muted);margin-bottom:8px}
      .contact-email{display:inline-block;font-family:'Rajdhani',sans-serif;font-weight:700;font-size:clamp(.95rem,3vw,1.15rem);color:var(--cyan);letter-spacing:.05em;word-break:break-all;text-decoration:none}
      .contact-email:hover{text-decoration:underline}
      .contact-note{margin-top:14px;font-size:.78rem;color:var(--text-dim)}
      .footer-note{margin-top:48px;padding:16px 20px;background:rgba(255,255,255,0.02);border:1px solid var(--cyan-border);border-radius:10px;font-size:.8rem;color:var(--text-dim);line-height:1.65}
      .footer-note strong{color:var(--text-muted)}
      @media(max-width:700px){
        :host{height:auto;min-height:400px}
        .root{height:auto;border-radius:14px;overflow:visible}
        .body{grid-template-columns:1fr;overflow:visible}
        .toc{overflow-y:visible;border-right:none;border-bottom:1px solid var(--cyan-border);padding:14px 16px;display:flex;flex-wrap:wrap;gap:5px}
        .toc-label{width:100%;margin-bottom:6px}
        .toc-link{width:auto;padding:5px 9px;font-size:.76rem}
        .toc-num{display:none}
        .scroll-area{overflow-y:visible;padding:22px 16px}
      }
    </style>

    <div class="root">
      <div class="header">
        <div class="header-badge"><span class="badge-dot"></span> Documentos Oficiais</div>
        <h1>Políticas <em>DMaior</em></h1>
        <p class="header-sub">Atualizado em: <span>01 de Maio de 2025</span> &nbsp;·&nbsp; Versão 3.0 &nbsp;·&nbsp; Conformidade LGPD — Lei nº 13.709/2018</p>
      </div>
      <div class="body">
        <nav class="toc" aria-label="Navegação das políticas">
          <div class="toc-label">Navegação</div>
          <button class="toc-link active" data-target="intro"        aria-label="Introdução"><span class="toc-num">01</span> Introdução</button>
          <button class="toc-link"         data-target="coleta"      aria-label="Coleta de Dados"><span class="toc-num">02</span> Coleta de Dados</button>
          <button class="toc-link"         data-target="baselegal"   aria-label="Base Legal LGPD"><span class="toc-num">03</span> Base Legal LGPD</button>
          <button class="toc-link"         data-target="cookies"     aria-label="Cookies"><span class="toc-num">04</span> Cookies</button>
          <button class="toc-link"         data-target="compartilha" aria-label="Compartilhamento"><span class="toc-num">05</span> Compartilhamento</button>
          <button class="toc-link"         data-target="inter"       aria-label="Transferência Intl."><span class="toc-num">06</span> Transferência Intl.</button>
          <button class="toc-link"         data-target="direitos"    aria-label="Seus Direitos"><span class="toc-num">07</span> Seus Direitos</button>
          <button class="toc-link"         data-target="imagem"      aria-label="Uso de Imagem"><span class="toc-num">08</span> Uso de Imagem</button>
          <button class="toc-link"         data-target="menores"     aria-label="Menores de Idade"><span class="toc-num">09</span> Menores de Idade</button>
          <button class="toc-link"         data-target="termos"      aria-label="Termos de Uso"><span class="toc-num">10</span> Termos de Uso</button>
          <button class="toc-link"         data-target="financeiro"  aria-label="Financeiro"><span class="toc-num">11</span> Financeiro</button>
          <button class="toc-link"         data-target="rescisao"    aria-label="Rescisão"><span class="toc-num">12</span> Rescisão</button>
          <button class="toc-link"         data-target="conduta"     aria-label="Conduta"><span class="toc-num">13</span> Conduta</button>
          <button class="toc-link"         data-target="foro"        aria-label="Lei e Foro"><span class="toc-num">14</span> Lei e Foro</button>
          <button class="toc-link"         data-target="contato"     aria-label="Contato / DPO"><span class="toc-num">15</span> Contato / DPO</button>
        </nav>
        <div class="scroll-area">
          <div class="policy-section animate" id="intro">
            <div class="sec-title"><div class="sec-icon"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></div><h2>Introdução e Identificação</h2></div>
            <p>A <strong>DMaior Agency</strong> é uma empresa de agenciamento de streamers atuante nas plataformas digitais, com foco principal no <strong>Kwai</strong>. Este documento rege toda a relação entre a Agência e seus streamers, colaboradores e visitantes do site.</p>
            <p>Ao se cadastrar no painel, utilizar qualquer ferramenta interna ou firmar vínculo com a Agência, o usuário declara ter lido, compreendido e concordado integralmente com este documento.</p>
            <div class="alert"><strong>Atualizações:</strong> Esta política pode ser alterada a qualquer momento. Mudanças relevantes serão comunicadas com antecedência mínima de <strong>7 dias corridos</strong>.</div>
          </div>
          <div class="divider"></div>
          <div class="policy-section animate" id="coleta">
            <div class="sec-title"><div class="sec-icon"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg></div><h2>Coleta e Uso dos Dados</h2></div>
            <p>Coletamos apenas os dados estritamente necessários para o funcionamento das atividades de agenciamento.</p>
            <div class="sub"><h3>Dados Pessoais</h3><div class="ilist">
              <div class="irow"><span class="iarrow">→</span><span class="itext"><strong>Identificação — Contrato:</strong> Nome completo e CPF para vínculo civil entre as partes.</span></div>
              <div class="irow"><span class="iarrow">→</span><span class="itext"><strong>Contato — Painel:</strong> WhatsApp, e-mail e identificadores nas plataformas (ID e usuário no Kwai).</span></div>
              <div class="irow"><span class="iarrow">→</span><span class="itext"><strong>Endereço — Contrato:</strong> Cidade e localização básica registrada no Termo de Cooperação.</span></div>
              <div class="irow"><span class="iarrow">→</span><span class="itext"><strong>Endereço — Painel:</strong> Endereço completo coletado opcionalmente para entregas de premiações físicas.</span></div>
            </div></div>
            <div class="sub"><h3>Dados Financeiros</h3><div class="ilist">
              <div class="irow"><span class="iarrow">→</span><span class="itext"><strong>Chave PIX — Painel:</strong> Utilizada para pagamento de bonificações e premiações de eventos internos.</span></div>
              <div class="irow"><span class="iarrow">→</span><span class="itext"><strong>Histórico de bonificações:</strong> Registro de pagamentos acessível apenas pelo streamer e equipe autorizada.</span></div>
            </div></div>
            <div class="sub"><h3>Dados de Desempenho</h3><div class="ilist">
              <div class="irow"><span class="iarrow">→</span><span class="itext"><strong>Métricas de live:</strong> Diamantes recebidos, horas transmitidas, seguidores e ranking — coletados via API.</span></div>
              <div class="irow"><span class="iarrow">→</span><span class="itext"><strong>Status de transmissão:</strong> Monitoramento em tempo real (online/offline) para gestão de metas.</span></div>
            </div></div>
            <div class="sub"><h3>Retenção</h3><p>Dados mantidos pelo período de vínculo e por até <strong>12 meses</strong> após encerramento do contrato.</p></div>
          </div>
          <div class="divider"></div>
          <div class="policy-section animate" id="baselegal">
            <div class="sec-title"><div class="sec-icon"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg></div><h2>Base Legal do Tratamento (LGPD)</h2></div>
            <p>Nos termos do art. 7º da LGPD, a DMaior Agency fundamenta suas operações nas seguintes hipóteses:</p>
            <div class="ilist">
              <div class="irow"><span class="iarrow">→</span><span class="itext"><strong>Execução de Contrato (art. 7º, V):</strong> Dados tratados para cumprimento da relação de agenciamento.</span></div>
              <div class="irow"><span class="iarrow">→</span><span class="itext"><strong>Consentimento (art. 7º, I):</strong> Dados de imagem tratados mediante consentimento expresso do titular.</span></div>
              <div class="irow"><span class="iarrow">→</span><span class="itext"><strong>Legítimo Interesse (art. 7º, IX):</strong> Monitoramento de desempenho e métricas para gestão de carreira.</span></div>
              <div class="irow"><span class="iarrow">→</span><span class="itext"><strong>Obrigação Legal (art. 7º, II):</strong> Dados mantidos para cumprimento de obrigações fiscais.</span></div>
            </div>
          </div>
          <div class="divider"></div>
          <div class="policy-section animate" id="cookies">
            <div class="sec-title"><div class="sec-icon"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="8.5" cy="9" r="1.5" fill="currentColor"/><circle cx="15" cy="9" r="1.5" fill="currentColor"/><circle cx="11.5" cy="14" r="1.5" fill="currentColor"/></svg></div><h2>Cookies e Armazenamento Local</h2></div>
            <p>O painel utiliza <strong>sessionStorage</strong> e <strong>localStorage</strong> exclusivamente para funcionalidades técnicas. Não há rastreamento de terceiros.</p>
            <div class="ilist">
              <div class="irow"><span class="iarrow">→</span><span class="itext"><strong>Session Token:</strong> Mantém a sessão autenticada. Expira ao fechar o navegador ou após inatividade.</span></div>
              <div class="irow"><span class="iarrow">→</span><span class="itext"><strong>Preferências de Interface:</strong> Configurações de abas e filtros salvas apenas no dispositivo do usuário.</span></div>
              <div class="irow"><span class="iarrow">→</span><span class="itext"><strong>Sem cookies de terceiros:</strong> Nenhum script de analytics é carregado no painel dos streamers.</span></div>
            </div>
          </div>
          <div class="divider"></div>
          <div class="policy-section animate" id="compartilha">
            <div class="sec-title"><div class="sec-icon"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg></div><h2>Compartilhamento de Dados</h2></div>
            <p>A DMaior Agency <strong>não vende, aluga nem comercializa</strong> dados dos streamers. O compartilhamento ocorre somente em:</p>
            <div class="ilist">
              <div class="irow"><span class="iarrow">→</span><span class="itext"><strong>Kwai / Plataformas Parceiras:</strong> ID e dados de agenciamento utilizados via APIs oficiais.</span></div>
              <div class="irow"><span class="iarrow">→</span><span class="itext"><strong>Infraestrutura Técnica:</strong> Supabase, Cloudflare e Hostinger — todos com conformidade LGPD.</span></div>
              <div class="irow"><span class="iarrow">→</span><span class="itext"><strong>Obrigação Legal:</strong> Mediante ordem judicial ou requisição de autoridade competente.</span></div>
              <div class="irow"><span class="iarrow">→</span><span class="itext"><strong>Consentimento Explícito:</strong> Em qualquer outro caso, somente com autorização expressa e por escrito.</span></div>
            </div>
          </div>
          <div class="divider"></div>
          <div class="policy-section animate" id="inter">
            <div class="sec-title"><div class="sec-icon"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg></div><h2>Transferência Internacional de Dados</h2></div>
            <p>Alguns provedores podem processar dados em servidores fora do Brasil, com as devidas salvaguardas conforme art. 33 da LGPD:</p>
            <div class="ilist">
              <div class="irow"><span class="iarrow">→</span><span class="itext"><strong>Supabase Inc. (EUA):</strong> Banco de dados com conformidade SOC 2 Type II. Dados criptografados em repouso e em trânsito.</span></div>
              <div class="irow"><span class="iarrow">→</span><span class="itext"><strong>Cloudflare Inc. (EUA):</strong> Proxy e segurança com certificação ISO 27001 e conformidade GDPR.</span></div>
              <div class="irow"><span class="iarrow">→</span><span class="itext"><strong>Hostinger (LT):</strong> Hospedagem do site com conformidade GDPR e cláusulas de proteção de dados adequadas.</span></div>
            </div>
            <div class="alert"><strong>Garantia:</strong> Todos os provedores estão contratualmente vinculados a tratar os dados exclusivamente conforme as instruções da DMaior Agency.</div>
          </div>
          <div class="divider"></div>
          <div class="policy-section animate" id="direitos">
            <div class="sec-title"><div class="sec-icon"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div><h2>Seus Direitos como Titular de Dados</h2></div>
            <p>Nos termos dos arts. 17 a 22 da LGPD, você tem os seguintes direitos sobre seus dados pessoais:</p>
            <div class="rights-grid">
              <div class="right-card"><div class="rc-title">Acesso</div><p>Consultar quais dados estão armazenados e como são utilizados.</p></div>
              <div class="right-card"><div class="rc-title">Correção</div><p>Solicitar atualização de dados incorretos ou desatualizados.</p></div>
              <div class="right-card"><div class="rc-title">Eliminação</div><p>Pedir exclusão de dados tratados com base em consentimento.</p></div>
              <div class="right-card"><div class="rc-title">Portabilidade</div><p>Receber seus dados em formato estruturado e legível por máquina.</p></div>
              <div class="right-card"><div class="rc-title">Revogação</div><p>Revogar consentimento para finalidades específicas.</p></div>
              <div class="right-card"><div class="rc-title">Oposição</div><p>Opor-se ao tratamento realizado com base em legítimo interesse.</p></div>
              <div class="right-card"><div class="rc-title">Informação</div><p>Saber com quem seus dados foram compartilhados e por qual finalidade.</p></div>
              <div class="right-card"><div class="rc-title">Revisão Automatizada</div><p>Solicitar revisão de decisões tomadas por sistemas automatizados.</p></div>
            </div>
            <p style="margin-top:16px;">Prazo de resposta: até <strong>15 dias úteis</strong> a partir do recebimento da solicitação.</p>
          </div>
          <div class="divider"></div>
          <div class="policy-section animate" id="imagem">
            <div class="sec-title"><div class="sec-icon"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg></div><h2>Uso de Imagem e Identidade</h2></div>
            <p>Ao ingressar na DMaior Agency, o streamer autoriza o uso de sua imagem, nome artístico, voz e demais elementos de identidade exclusivamente para as finalidades abaixo, pelo período de vigência do vínculo.</p>
            <div class="sub"><h3>Usos Permitidos</h3><div class="ilist">
              <div class="irow"><span class="iarrow">→</span><span class="itext">Divulgação nos canais oficiais da Agência (Instagram, TikTok, WhatsApp, Kwai, etc.).</span></div>
              <div class="irow"><span class="iarrow">→</span><span class="itext">Materiais institucionais: banners, flyers e apresentações para marcas e patrocinadores.</span></div>
              <div class="irow"><span class="iarrow">→</span><span class="itext">Rankings, painéis e relatórios de desempenho compartilhados com parceiros.</span></div>
              <div class="irow"><span class="iarrow">→</span><span class="itext">Clipes de lives para divulgação, desde que não deturpem o contexto original.</span></div>
            </div></div>
            <div class="sub"><h3>Proibido sem Autorização Específica</h3><div class="ilist">
              <div class="irow"><span class="iarrow">→</span><span class="itext">Uso em campanhas pagas de terceiros sem consentimento e negociação de cachê.</span></div>
              <div class="irow"><span class="iarrow">→</span><span class="itext">Cessão ou venda da imagem a outras agências ou empresas.</span></div>
              <div class="irow"><span class="iarrow">→</span><span class="itext">Uso em contextos que possam causar dano à reputação do streamer.</span></div>
            </div></div>
            <div class="alert"><strong>Pós-rescisão:</strong> Publicações históricas permanecem visíveis. O que cessa imediatamente é a <strong>promoção ativa</strong> com a imagem do streamer.</div>
          </div>
          <div class="divider"></div>
          <div class="policy-section animate" id="menores">
            <div class="sec-title"><div class="sec-icon"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg></div><h2>Menores de Idade</h2></div>
            <p>Os serviços da DMaior Agency são destinados a pessoas com <strong>18 anos ou mais</strong>. Streamers com <strong>16 ou 17 anos</strong> podem ser agenciados mediante autorização por escrito dos responsáveis legais. Menores de 16 anos não são aceitos.</p>
            <div class="alert warn"><strong>Atenção:</strong> Caso identifiquemos dados de um menor coletados sem autorização, procederemos com a exclusão imediata e notificação dos responsáveis.</div>
          </div>
          <div class="divider"></div>
          <div class="policy-section animate" id="termos">
            <div class="sec-title"><div class="sec-icon"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg></div><h2>Termos e Condições de Uso</h2></div>
            <div class="sub"><h3>Propriedade Intelectual</h3><p>Todo material institucional é propriedade exclusiva da DMaior Agency. Reprodução sem autorização formal por escrito é proibida.</p></div>
            <div class="sub"><h3>Uso das Ferramentas</h3><p>O streamer é responsável pela inserção correta de links e IDs. <strong>Erros de digitação não geram direito a estorno</strong> após o processamento.</p></div>
            <div class="sub"><h3>Liberdade de Plataforma</h3><p>O vínculo com a DMaior Agency <strong>não implica exclusividade de plataforma</strong>. O streamer é livre para atuar em outras plataformas simultaneamente.</p></div>
            <div class="sub"><h3>Limitação de Responsabilidade</h3><p>A DMaior Agency não se responsabiliza por: banimentos das plataformas; queda de receita por mudanças de algoritmo; danos indiretos por interrupção dos serviços.</p></div>
          </div>
          <div class="divider"></div>
          <div class="policy-section animate" id="financeiro">
            <div class="sec-title"><div class="sec-icon"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg></div><h2>Comissões, Repasses e Financeiro</h2></div>
            <p>Os rendimentos regulares (diamantes, moedas, gifts) são pagos <strong>diretamente pela plataforma Kwai</strong> ao streamer, sem intermediação da Agência. A DMaior Agency realiza pagamentos próprios apenas em:</p>
            <div class="ilist">
              <div class="irow"><span class="iarrow">→</span><span class="itext"><strong>Premiações de Eventos Internos:</strong> Campanhas e competições com premiação em dinheiro via PIX.</span></div>
              <div class="irow"><span class="iarrow">→</span><span class="itext"><strong>Bonificações de Campanhas:</strong> Valores vinculados a rankings internos, pagos via PIX.</span></div>
              <div class="irow"><span class="iarrow">→</span><span class="itext"><strong>Premiações Físicas:</strong> Brindes enviados ao endereço completo cadastrado no painel.</span></div>
              <div class="irow"><span class="iarrow">→</span><span class="itext"><strong>Contestação:</strong> O streamer pode contestar divergências em até <strong>5 dias úteis</strong> após o pagamento.</span></div>
            </div>
          </div>
          <div class="divider"></div>
          <div class="policy-section animate" id="rescisao">
            <div class="sec-title"><div class="sec-icon"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg></div><h2>Rescisão do Vínculo</h2></div>
            <div class="sub"><h3>Por Iniciativa do Streamer</h3><p>Encerramento a qualquer momento, mediante comunicação formal com antecedência mínima de <strong>90 dias corridos</strong>, conforme cláusula 2.3 do Termo de Cooperação.</p></div>
            <div class="sub"><h3>Por Iniciativa da Agência — Imediata</h3><div class="ilist">
              <div class="irow"><span class="iarrow">→</span><span class="itext">Uso de bots, fraude em métricas ou violação dos Termos das plataformas parceiras.</span></div>
              <div class="irow"><span class="iarrow">→</span><span class="itext">Conduta que cause dano à reputação da Agência, de parceiros ou de outros streamers.</span></div>
              <div class="irow"><span class="iarrow">→</span><span class="itext">Banimento permanente da plataforma Kwai por violação dos seus Termos de Serviço.</span></div>
            </div></div>
            <div class="sub"><h3>Efeitos da Rescisão</h3><p>Após confirmação: acesso ao painel bloqueado; repasses pendentes quitados no próximo ciclo; promoção ativa encerrada imediatamente; dados eliminados após 12 meses.</p></div>
          </div>
          <div class="divider"></div>
          <div class="policy-section animate" id="conduta">
            <div class="sec-title"><div class="sec-icon"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></div><h2>Código de Conduta</h2></div>
            <p>A DMaior Agency preza por um ambiente profissional e saudável. O descumprimento pode resultar em advertência, suspensão ou rescisão imediata.</p>
            <div class="ilist">
              <div class="irow"><span class="iarrow">→</span><span class="itext"><strong>Plataformas:</strong> Cumprimento obrigatório dos Termos de Serviço de todas as plataformas, especialmente o Kwai.</span></div>
              <div class="irow"><span class="iarrow">→</span><span class="itext"><strong>Fraudes:</strong> Bots, compra de interações e manipulação de métricas são estritamente proibidos.</span></div>
              <div class="irow"><span class="iarrow">→</span><span class="itext"><strong>Conflitos:</strong> Divergências com a Agência devem ser tratadas diretamente com a equipe responsável.</span></div>
              <div class="irow"><span class="iarrow">→</span><span class="itext"><strong>Confidencialidade:</strong> Estratégias, metas, comissões e informações sobre outros streamers são confidenciais.</span></div>
              <div class="irow"><span class="iarrow">→</span><span class="itext"><strong>Conteúdo:</strong> O streamer é integralmente responsável pelo conteúdo que transmite.</span></div>
            </div>
          </div>
          <div class="divider"></div>
          <div class="policy-section animate" id="foro">
            <div class="sec-title"><div class="sec-icon"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg></div><h2>Lei Aplicável e Foro Competente</h2></div>
            <p>Este documento é regido pelas leis da <strong>República Federativa do Brasil</strong>, em especial:</p>
            <div class="ilist">
              <div class="irow"><span class="iarrow">→</span><span class="itext"><strong>Lei nº 13.709/2018</strong> — Lei Geral de Proteção de Dados (LGPD)</span></div>
              <div class="irow"><span class="iarrow">→</span><span class="itext"><strong>Lei nº 12.965/2014</strong> — Marco Civil da Internet</span></div>
              <div class="irow"><span class="iarrow">→</span><span class="itext"><strong>Lei nº 10.406/2002</strong> — Código Civil Brasileiro</span></div>
              <div class="irow"><span class="iarrow">→</span><span class="itext"><strong>Lei nº 8.078/1990</strong> — Código de Defesa do Consumidor (quando aplicável)</span></div>
            </div>
            <p style="margin-top:16px;">Fica eleito o foro da comarca da sede da DMaior Agency como competente para dirimir quaisquer controvérsias.</p>
          </div>
          <div class="divider"></div>
          <div class="policy-section animate" id="contato">
            <div class="sec-title"><div class="sec-icon"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg></div><h2>Contato e Encarregado de Dados (DPO)</h2></div>
            <p>Para exercer seus direitos LGPD ou reportar qualquer violação, entre em contato com o <strong>Encarregado de Proteção de Dados (DPO)</strong> da DMaior Agency:</p>
            <div class="contact-card">
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
              <p class="contact-label">Encarregado de Dados (DPO) — DMaior Agency</p>
              <a class="contact-email" href="mailto:dmaior.agency@gmail.com">dmaior.agency@gmail.com</a>
              <p class="contact-note">Prazo de resposta: até 15 dias úteis &nbsp;·&nbsp; Atendimento em Português</p>
            </div>
            <div class="footer-note"><strong>Autoridade Nacional de Proteção de Dados (ANPD):</strong> Caso não fique satisfeito com nossa resposta, você tem o direito de apresentar reclamação diretamente à ANPD. Acesse <strong>gov.br/anpd</strong> para mais informações.</div>
          </div>
        </div>
      </div>
    </div>`;
  }
}

customElements.define('dmaior-policies', DMaiorPolicies);
