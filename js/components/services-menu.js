/**
 * services-menu.js — Menu de serviços responsivo da DMaior Agency
 *
 * Custom Element: <dmaior-services-menu>
 *
 * LAYOUTS DISPONÍVEIS (salvo em localStorage como 'dm_layout'):
 *   'original'  — Botão "Entrar" + painel de ícones (mobile) | 4 botões (desktop)
 *   'dinamico'  — Banner Recarga + grid 2 colunas com seções desagrupadas (mobile only)
 *
 * Desktop (800px+) sempre exibe o layout original independente da preferência.
 * Troca de layout em tempo real via evento window 'dmaior:layout'.
 * Banner carousel: busca comunicados do tipo 'importante' com local 'home' via
 *   window.DmaiorAPI.rank.getComunicados('home') com retry automático.
 */

class DmaiorServicesMenu extends HTMLElement {
  constructor() {
    super();
  }

  // Lê layout salvo no localStorage (padrão: 'original')
  getLayout() {
    try { return localStorage.getItem('dm_layout') || 'original'; } catch (_) { return 'original'; }
  }

  connectedCallback() {
    if (typeof window === 'undefined') return;
    if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
    this.render();
    this.setupListeners();

    // Reage à troca de layout feita pela engrenagem do menu (sem reload)
    this._layoutHandler = (e) => { this._stopCarousel(); this.render(); this.setupListeners(); };
    window.addEventListener('dmaior:layout', this._layoutHandler);

    // Sincroniza se outro contexto alterar o localStorage — handler guardado para limpeza
    this._storageHandler = (e) => {
      if (e.key === 'dm_layout') { this.render(); this.setupListeners(); }
    };
    window.addEventListener('storage', this._storageHandler);
  }

  disconnectedCallback() {
    window.removeEventListener('dmaior:layout', this._layoutHandler);
    window.removeEventListener('storage',       this._storageHandler);
    this._stopCarousel();
  }

  setupListeners() {
    // Agenda carregamento dos banners com retry (API pode não estar pronta)
    this._scheduleBanners();
  }

  // ── Banner Carousel ──────────────────────────────────────────

  _scheduleBanners(attempts = 0) {
    if (window.DmaiorAPI?.rank?.getComunicados) {
      this._loadBanners();
      return;
    }
    if (attempts < 6) {
      const delay = attempts < 3 ? 300 + attempts * 300 : 2000;
      setTimeout(() => this._scheduleBanners(attempts + 1), delay);
    }
  }

  async _loadBanners() {
    try {
      const data    = await window.DmaiorAPI.rank.getComunicados('home');
      const slides  = (data.comunicados || []).filter(c => c.imagem_url);
      const wrap    = this.shadowRoot?.getElementById('bc-wrap');
      if (!wrap) return;
      if (!slides.length) { wrap.style.display = 'none'; return; }
      wrap.style.display = '';
      wrap.innerHTML = this._buildCarouselHTML(slides);
      this._bindCarousel(slides);
    } catch (_) { /* API indisponível — carrossel permanece oculto */ }
  }

  _buildCarouselHTML(slides) {
    const imgs = slides.map((s, i) => {
      const tag  = s.link_url ? 'a' : 'div';
      const href = s.link_url ? ` href="${this._escAttr(s.link_url)}" target="_blank" rel="noopener noreferrer"` : '';
      const alt  = s.titulo   ? ` title="${this._escAttr(s.titulo)}"` : '';
      return `<${tag} class="bc-slide"${href}${alt} data-idx="${i}">
        <img src="${this._escAttr(this._normalizarImagemUrl(s.imagem_url))}" alt="${this._escAttr(s.titulo||'Banner')}" loading="lazy">
        ${s.titulo ? `<div class="bc-caption"><span>${this._escHtml(s.titulo)}</span></div>` : ''}
      </${tag}>`;
    }).join('');
    const dots = slides.map((_, i) =>
      `<button class="bc-dot${i===0?' bc-dot-active':''}" data-idx="${i}" aria-label="Banner ${i+1}"></button>`
    ).join('');
    return `
      <div class="bc-carousel" id="bc-carousel">
        <div class="bc-track" id="bc-track">${imgs}</div>
        ${slides.length > 1 ? `<div class="bc-dots" id="bc-dots">${dots}</div>` : ''}
      </div>`;
  }

  _bindCarousel(slides) {
    if (slides.length <= 1) return;
    this._carouselIdx   = 0;
    this._carouselTotal = slides.length;

    // Dot clicks
    const dotsEl = this.shadowRoot?.getElementById('bc-dots');
    if (dotsEl) {
      dotsEl.addEventListener('click', (e) => {
        const btn = e.target.closest('.bc-dot');
        if (!btn) return;
        this._goSlide(Number(btn.dataset.idx));
        this._resetTimer();
      });
    }

    // Touch swipe
    const carousel = this.shadowRoot?.getElementById('bc-carousel');
    if (carousel) {
      let touchX = null;
      carousel.addEventListener('touchstart', e => { touchX = e.touches[0].clientX; }, { passive: true });
      carousel.addEventListener('touchend',   e => {
        if (touchX === null) return;
        const dx = e.changedTouches[0].clientX - touchX;
        touchX = null;
        if (Math.abs(dx) < 40) return;
        dx < 0 ? this._nextSlide() : this._prevSlide();
        this._resetTimer();
      }, { passive: true });
    }

    this._startTimer();
  }

  _goSlide(idx) {
    const total = this._carouselTotal || 1;
    this._carouselIdx = ((idx % total) + total) % total;
    const track = this.shadowRoot?.getElementById('bc-track');
    if (track) track.style.transform = `translateX(-${this._carouselIdx * 100}%)`;
    const dots = this.shadowRoot?.querySelectorAll('.bc-dot');
    if (dots) dots.forEach((d, i) => d.classList.toggle('bc-dot-active', i === this._carouselIdx));
  }

  _nextSlide() { this._goSlide((this._carouselIdx || 0) + 1); }
  _prevSlide() { this._goSlide((this._carouselIdx || 0) - 1); }

  _startTimer() {
    this._stopCarousel();
    this._carouselTimer = setInterval(() => this._nextSlide(), 5000);
  }

  _resetTimer() { this._startTimer(); }

  _stopCarousel() {
    if (this._carouselTimer) { clearInterval(this._carouselTimer); this._carouselTimer = null; }
  }

  _escHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }

  _escAttr(str) { return this._escHtml(str); }

  _normalizarImagemUrl(u) {
    if (!u || typeof u !== 'string') return '';
    const raw = u.trim();
    if (!raw) return '';
    try {
      const url = new URL(raw);
      if (url.protocol !== 'http:' && url.protocol !== 'https:') return '';
      const host = url.hostname.toLowerCase();
      if (host === 'drive.google.com' || host === 'docs.google.com' || host.endsWith('.googleusercontent.com')) {
        const fileMatch = url.pathname.match(/\/file\/d\/([^/]+)/);
        const id = fileMatch?.[1] || url.searchParams.get('id');
        if (id && /^[\w-]{10,}$/.test(id)) return `https://drive.google.com/thumbnail?id=${encodeURIComponent(id)}&sz=w1600`;
      }
      return url.href;
    } catch (_) {
      return '';
    }
  }

  render() {
    const layout = this.getLayout(); // 'original' ou 'dinamico'

    // SVGs reutilizados
    const SVG_AGENCY   = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="23" y1="11" x2="17" y2="11"></line></svg>`;
    const SVG_DIAMOND  = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h12l4 6-10 13L2 9Z"></path><path d="M11 3 8 9l4 13"></path><path d="M13 3l3 6-4 13"></path><path d="M2 9h20"></path></svg>`;
    const SVG_INSTA    = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/></svg>`;
    const SVG_WA       = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.82 9.82 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>`;
    const SVG_RANK     = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`;
    const SVG_VIDEO    = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>`;
    const SVG_CALENDAR = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`;
    const SVG_INFO     = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`;
    const SVG_DOC      = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`;
    const SVG_STAR     = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;
    const SVG_ARROW    = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>`;

    this.shadowRoot.innerHTML = `
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Exo+2:wght@400;600&family=Rajdhani:wght@700&display=swap');
        * { margin:0; padding:0; box-sizing:border-box; -webkit-tap-highlight-color:transparent; }
        :host { display:block; width:100%; }
        .container { background-color:transparent; font-family:'Exo 2',sans-serif; display:flex; justify-content:center; align-items:center; padding:30px 10px; width:100%; }
        .mobile-layout { display:flex; flex-direction:column; align-items:center; gap:30px; width:100%; max-width:450px; }
        .btn-agency-mobile { display:flex; align-items:center; justify-content:center; gap:10px; width:100%; background:var(--dm-grad-deep); border:1px solid var(--dm-rank-cyan-35,rgba(0,212,212,.35)); border-radius:16px; padding:16px 15px; text-decoration:none; color:var(--dm-rank-cyan,#00d4d4); position:relative; box-shadow:0 10px 25px var(--dm-shadow-50),0 0 20px var(--dm-rank-glow,rgba(59,130,246,.28)),inset 0 1px 0 var(--dm-bw05); transition:all .3s ease; overflow:hidden; cursor:pointer; }
        .btn-agency-mobile::before { content:''; position:absolute; top:0; left:0; right:0; height:2px; background:var(--dm-grad-rank-x,linear-gradient(90deg,#3b82f6,#00d4d4)); opacity:.68; }
        .btn-agency-mobile span { font-family:'Rajdhani',sans-serif; font-size:1rem; font-weight:700; text-transform:uppercase; letter-spacing:1px; color:var(--dm-text); white-space:nowrap; }
        .btn-agency-mobile svg { width:24px; height:24px; stroke:var(--dm-rank-cyan,#00d4d4); flex-shrink:0; }
        .menu-panel { position:relative; width:100%; background:var(--dm-grad-deep); border:1px solid var(--dm-rank-cyan-20,rgba(0,212,212,.20)); border-radius:25px; display:flex; justify-content:space-around; align-items:center; padding:15px 10px; box-shadow:0 15px 35px var(--dm-shadow-lg),0 0 22px var(--dm-rank-glow,rgba(59,130,246,.28)),inset 0 1px 0 var(--dm-bw05); }
        .menu-panel::before { content:''; position:absolute; top:0; left:0; right:0; height:2px; background:linear-gradient(90deg,transparent,var(--dm-rank-blue,#3b82f6),var(--dm-rank-cyan,#00d4d4),transparent); opacity:.68; border-radius:25px 25px 0 0; }
        .nav-item { display:flex; flex-direction:column; align-items:center; text-decoration:none; width:80px; gap:8px; cursor:pointer; }
        .nav-item svg { width:28px; height:28px; transition:all .3s ease; }
        .nav-item span { font-family:'Rajdhani',sans-serif; font-size:.75rem; font-weight:700; text-transform:uppercase; letter-spacing:.5px; color:var(--dm-text); transition:all .3s ease; }
        .item-instagram { color:#E1306C; }
        .item-instagram svg { fill:#E1306C; }
        .item-whatsapp { color:#25D366; }
        .item-whatsapp svg { fill:#25D366; }
        .nav-item-center { position:relative; top:-25px; text-decoration:none; display:flex; flex-direction:column; align-items:center; cursor:pointer; }
        .floating-btn { width:75px; height:75px; background:var(--dm-grad-card-alt); border:2px solid var(--dm-rank-cyan,#00d4d4); border-radius:50%; display:flex; justify-content:center; align-items:center; box-shadow:0 10px 25px var(--dm-shadow-50),0 0 22px var(--dm-rank-glow,rgba(59,130,246,.28)),inset 0 0 15px rgba(0,212,212,.10); margin-bottom:8px; transition:all .3s ease; }
        .floating-btn svg { width:32px; height:32px; stroke:var(--dm-rank-cyan,#00d4d4); animation:pulse-gem 2s infinite ease-in-out; }
        .nav-item-center span { font-family:'Rajdhani',sans-serif; font-size:.8rem; font-weight:700; color:var(--dm-rank-cyan,#00d4d4); text-transform:uppercase; letter-spacing:1px; text-shadow:0 0 10px var(--dm-rank-glow,rgba(59,130,246,.28)); }
        @keyframes pulse-gem { 0%{transform:scale(1);opacity:.86;filter:drop-shadow(0 0 5px var(--dm-rank-blue,#3b82f6))} 50%{transform:scale(1.15);opacity:1;filter:drop-shadow(0 0 15px var(--dm-rank-cyan,#00d4d4))} 100%{transform:scale(1);opacity:.86;filter:drop-shadow(0 0 5px var(--dm-rank-blue,#3b82f6))} }
        /* Desktop usa o mesmo layout do mobile — menu unificado */
        .mobile-layout { max-width:520px; }
        @media (min-width:800px) {
          /* ── Layout Original no desktop — ligeiramente maior ── */
          .container { padding:30px 20px; }
          .mobile-layout { max-width:620px; }
          .menu-panel { padding:18px 28px; }
          .nav-item { width:100px; }
          .nav-item svg { width:32px; height:32px; }
          .floating-btn { width:82px; height:82px; }
          .floating-btn svg { width:36px; height:36px; }
          .btn-agency-mobile { padding:18px 24px; font-size:1.05rem; }

          /* ── Dinâmico Pro no desktop — 3 colunas + containers largos ── */
          .dinamico-layout { max-width:860px; width:100%; }
          .dp-grid { grid-template-columns:repeat(3,1fr); gap:14px; padding:0 20px 18px; }
          .dp-item { min-height:96px; padding:16px 14px; border-radius:24px; }
          .dp-item-icon { width:40px; height:40px; border-radius:16px; }
          .dp-item-icon svg { width:22px; height:22px; }
          .dp-item-name { font-size:1rem; }
          .dp-item-label { font-size:.68rem; }
          .dp-banner { margin:0 20px 14px; padding:16px 20px; border-radius:26px; }
          .dp-banner-icon { width:50px; height:50px; border-radius:18px; }
          .dp-banner-title { font-size:1.1rem; }
          .dp-agency-btn { margin:0 20px 18px; padding:16px 20px; font-size:1rem; border-radius:24px; }
          .dp-section-title { font-size:.72rem; padding:0 20px 10px; }
        }

        /* ══ Dinâmico Pro ══════════════════════════════════════════ */
        .dinamico-layout { display:${layout === 'dinamico' ? 'block' : 'none'}; padding:12px 0 4px; }

        /* Banner de destaque Recarga */
        .dp-banner { margin:0 16px 12px; border-radius:26px; overflow:hidden; position:relative; background:var(--dm-grad-card-alt); border:1px solid var(--dm-rank-cyan-35,rgba(0,212,212,.35)); box-shadow:0 8px 24px var(--dm-shadow-50),0 0 20px var(--dm-rank-glow,rgba(59,130,246,.28)); text-decoration:none; display:flex; align-items:center; padding:14px 16px; gap:14px; }
        .dp-banner::before { content:''; position:absolute; top:0; left:0; right:0; height:2px; background:linear-gradient(90deg,transparent,var(--dm-rank-blue,#3b82f6),var(--dm-rank-cyan,#00d4d4),transparent); }
        .dp-banner-icon { width:46px; height:46px; border-radius:18px; background:rgba(59,130,246,.10); border:1px solid var(--dm-rank-cyan-35,rgba(0,212,212,.35)); display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .dp-banner-icon svg { width:26px; height:26px; stroke:var(--dm-rank-cyan,#00d4d4); animation:pulse-gem 2s infinite ease-in-out; }
        .dp-banner-text { flex:1; min-width:0; }
        .dp-banner-title { font-family:'Rajdhani',sans-serif; font-weight:700; font-size:1.05rem; color:var(--dm-text); text-transform:uppercase; letter-spacing:.5px; line-height:1.2; }
        .dp-banner-sub { font-size:.72rem; color:var(--dm-rank-cyan,#00d4d4); margin-top:2px; }
        .dp-banner-arrow { width:30px; height:30px; border-radius:50%; background:rgba(59,130,246,.10); border:1px solid var(--dm-rank-cyan-35,rgba(0,212,212,.35)); display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .dp-banner-arrow svg { width:14px; height:14px; stroke:var(--dm-rank-cyan,#00d4d4); }

        /* Botão Entrar na Agência (Dinâmico) */
        .dp-agency-btn { display:flex; align-items:center; gap:12px; margin:0 16px 14px; padding:14px 16px; background:linear-gradient(135deg,rgba(59,130,246,.14),rgba(0,212,212,.10)); border:1px solid var(--dm-rank-cyan-35,rgba(0,212,212,.35)); border-radius:24px; text-decoration:none; position:relative; overflow:hidden; }
        .dp-agency-btn::before { content:''; position:absolute; top:0; left:0; right:0; height:1.5px; background:linear-gradient(90deg,transparent,var(--dm-rank-blue,#3b82f6),var(--dm-rank-cyan,#00d4d4),transparent); }
        .dp-agency-btn svg { width:20px; height:20px; stroke:var(--dm-rank-cyan,#00d4d4); flex-shrink:0; }
        .dp-agency-btn span { font-family:'Rajdhani',sans-serif; font-weight:700; font-size:.95rem; text-transform:uppercase; letter-spacing:1px; color:var(--dm-text); }
        .dp-agency-badge { margin-left:auto; background:rgba(59,130,246,.12); border:1px solid var(--dm-rank-cyan-35,rgba(0,212,212,.35)); border-radius:999px; padding:3px 12px; font-size:.62rem; font-weight:700; color:var(--dm-rank-cyan,#00d4d4); font-family:'Rajdhani',sans-serif; text-transform:uppercase; letter-spacing:.5px; white-space:nowrap; }

        /* Título de seção */
        .dp-section-title { font-family:'Rajdhani',sans-serif; font-size:.65rem; font-weight:700; color:var(--dm-text-sub); text-transform:uppercase; letter-spacing:2px; padding:0 16px 8px; }

        /* Grid 2 colunas */
        .dp-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; padding:0 16px 14px; }
        .dp-item { display:flex; flex-direction:row; align-items:center; gap:11px; padding:13px 12px; border-radius:24px; background:var(--dm-grad-card-alt); border:1px solid var(--dm-bw06); text-decoration:none; position:relative; overflow:hidden; transition:transform .18s, border-color .18s, box-shadow .18s; min-height:68px; }
        .dp-item:hover { border-color:var(--dm-rank-cyan-35,rgba(0,212,212,.35)); box-shadow:0 10px 24px var(--dm-shadow-40),0 0 16px var(--dm-rank-glow,rgba(59,130,246,.28)); }
        .dp-item:active { transform:scale(.97); }
        .dp-item::before { content:''; position:absolute; top:0; left:0; right:0; height:1.5px; }
        .dp-item-icon { width:38px; height:38px; border-radius:16px; border:1px solid; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .dp-item-icon svg { width:19px; height:19px; }
        .dp-item-text { flex:1; min-width:0; }
        .dp-item-name { font-family:'Rajdhani',sans-serif; font-weight:700; font-size:.95rem; color:var(--dm-text); text-transform:uppercase; letter-spacing:.3px; line-height:1.1; }
        .dp-item-label { font-size:.62rem; font-weight:600; margin-top:2px; opacity:.75; }
        .dp-item-arrow { width:22px; height:22px; display:flex; align-items:center; justify-content:center; flex-shrink:0; opacity:.4; margin-left:auto; color:var(--dm-text); }
        .dp-item-arrow svg { width:14px; height:14px; }

        /* Variantes de cor */
        .dp-pink  { border-color:rgba(225,48,108,.15); } .dp-pink::before  { background:linear-gradient(90deg,transparent,#E1306C,transparent); } .dp-pink  .dp-item-icon { background:rgba(225,48,108,.1); border-color:rgba(225,48,108,.2); } .dp-pink  .dp-item-icon svg { fill:#E1306C; } .dp-pink  .dp-item-label { color:#E1306C; }
        .dp-green { border-color:rgba(37,211,102,.15); } .dp-green::before { background:linear-gradient(90deg,transparent,#25D366,transparent); } .dp-green .dp-item-icon { background:rgba(37,211,102,.1); border-color:rgba(37,211,102,.2); } .dp-green .dp-item-icon svg { fill:#25D366; } .dp-green .dp-item-label { color:#25D366; }
        .dp-cyan  { border-color:rgba(0,212,212,.15);  } .dp-cyan::before  { background:linear-gradient(90deg,transparent,#00d4d4,transparent); } .dp-cyan  .dp-item-icon { background:rgba(0,212,212,.1);  border-color:rgba(0,212,212,.2);  } .dp-cyan  .dp-item-icon svg { stroke:#00d4d4; } .dp-cyan  .dp-item-label { color:#00d4d4; }
        .dp-purple{ border-color:rgba(168,85,247,.15); } .dp-purple::before{ background:linear-gradient(90deg,transparent,#a855f7,transparent); } .dp-purple.dp-item-icon { background:rgba(168,85,247,.1); border-color:rgba(168,85,247,.2); } .dp-purple .dp-item-icon { background:rgba(168,85,247,.1); border-color:rgba(168,85,247,.2); } .dp-purple .dp-item-icon svg { stroke:#a855f7; } .dp-purple .dp-item-label { color:#a855f7; }
        .dp-orange{ border-color:rgba(251,146,60,.15); } .dp-orange::before{ background:linear-gradient(90deg,transparent,#fb923c,transparent); } .dp-orange .dp-item-icon { background:rgba(251,146,60,.1); border-color:rgba(251,146,60,.2); } .dp-orange .dp-item-icon svg { stroke:#fb923c; } .dp-orange .dp-item-label { color:#fb923c; }
        .dp-blue  { border-color:rgba(59,130,246,.15); } .dp-blue::before  { background:linear-gradient(90deg,transparent,#3b82f6,transparent); } .dp-blue  .dp-item-icon { background:rgba(59,130,246,.1);  border-color:rgba(59,130,246,.2);  } .dp-blue  .dp-item-icon svg { stroke:#3b82f6; } .dp-blue  .dp-item-label { color:#3b82f6; }
        .dp-teal  { border-color:rgba(20,184,166,.15); } .dp-teal::before  { background:linear-gradient(90deg,transparent,#14b8a6,transparent); } .dp-teal  .dp-item-icon { background:rgba(20,184,166,.1);  border-color:rgba(20,184,166,.2);  } .dp-teal  .dp-item-icon svg { stroke:#14b8a6; } .dp-teal  .dp-item-label { color:#14b8a6; }
        .dp-gold  { border-color:rgba(240,192,64,.2);  } .dp-gold::before  { background:linear-gradient(90deg,transparent,#f0c040,transparent); } .dp-gold  .dp-item-icon { background:rgba(240,192,64,.1);  border-color:rgba(240,192,64,.25); } .dp-gold  .dp-item-icon svg { stroke:#f0c040; } .dp-gold  .dp-item-label { color:#f0c040; }
        .dp-pink,.dp-green,.dp-cyan,.dp-purple,.dp-orange,.dp-blue,.dp-teal,.dp-gold { border-color:var(--dm-rank-cyan-20,rgba(0,212,212,.20)); }
        .dp-pink::before,.dp-green::before,.dp-cyan::before,.dp-purple::before,.dp-orange::before,.dp-blue::before,.dp-teal::before,.dp-gold::before { background:linear-gradient(90deg,transparent,var(--dm-rank-blue,#3b82f6),var(--dm-rank-cyan,#00d4d4),transparent); opacity:.72; }
        :host-context([data-theme="dark"]) .item-instagram,
        :host-context([data-theme="dark"]) .item-whatsapp,
        :host-context([data-theme="dark"]) .dp-pink .dp-item-label,
        :host-context([data-theme="dark"]) .dp-green .dp-item-label,
        :host-context([data-theme="dark"]) .dp-cyan .dp-item-label,
        :host-context([data-theme="dark"]) .dp-purple .dp-item-label,
        :host-context([data-theme="dark"]) .dp-orange .dp-item-label,
        :host-context([data-theme="dark"]) .dp-blue .dp-item-label,
        :host-context([data-theme="dark"]) .dp-teal .dp-item-label,
        :host-context([data-theme="dark"]) .dp-gold .dp-item-label { color:var(--dm-rank-cyan,#00d4d4); }
        :host-context([data-theme="dark"]) .item-instagram svg,
        :host-context([data-theme="dark"]) .item-whatsapp svg,
        :host-context([data-theme="dark"]) .dp-pink .dp-item-icon svg,
        :host-context([data-theme="dark"]) .dp-green .dp-item-icon svg,
        :host-context([data-theme="dark"]) .dp-cyan .dp-item-icon svg,
        :host-context([data-theme="dark"]) .dp-purple .dp-item-icon svg,
        :host-context([data-theme="dark"]) .dp-orange .dp-item-icon svg,
        :host-context([data-theme="dark"]) .dp-blue .dp-item-icon svg,
        :host-context([data-theme="dark"]) .dp-teal .dp-item-icon svg,
        :host-context([data-theme="dark"]) .dp-gold .dp-item-icon svg { fill:var(--dm-rank-cyan,#00d4d4); stroke:var(--dm-rank-cyan,#00d4d4); }
        :host-context([data-theme="dark"]) .dp-item-icon { background:rgba(59,130,246,.10); border-color:var(--dm-rank-cyan-35,rgba(0,212,212,.35)); }
        :host-context([data-theme="dark"]) .dp-banner,
        :host-context([data-theme="dark"]) .dp-agency-btn,
        :host-context([data-theme="dark"]) .dp-item,
        :host-context([data-theme="dark"]) .menu-panel,
        :host-context([data-theme="dark"]) .btn-agency-mobile {
          background:linear-gradient(145deg,rgba(8,9,11,.96),rgba(0,0,0,.98));
          border-color:rgba(0,212,212,.22);
          box-shadow:none;
        }
        :host-context([data-theme="dark"]) .dp-item:hover {
          border-color:rgba(0,212,212,.42);
          box-shadow:none;
        }
        :host-context([data-theme="dark"]) .dp-item-icon {
          background:rgba(0,0,0,.35);
          border-color:currentColor;
          box-shadow:none;
        }
        :host-context([data-theme="dark"]) .dp-pink .dp-item-label,
        :host-context([data-theme="dark"]) .dp-pink .dp-item-icon,
        :host-context([data-theme="dark"]) .dp-pink .dp-item-icon svg { color:#e130ff; fill:#ff2ecf; stroke:#ff2ecf; }
        :host-context([data-theme="dark"]) .dp-green .dp-item-label,
        :host-context([data-theme="dark"]) .dp-green .dp-item-icon,
        :host-context([data-theme="dark"]) .dp-green .dp-item-icon svg { color:#22e67a; fill:#22e67a; stroke:#22e67a; }
        :host-context([data-theme="dark"]) .dp-cyan .dp-item-label,
        :host-context([data-theme="dark"]) .dp-cyan .dp-item-icon,
        :host-context([data-theme="dark"]) .dp-cyan .dp-item-icon svg,
        :host-context([data-theme="dark"]) .dp-teal .dp-item-label,
        :host-context([data-theme="dark"]) .dp-teal .dp-item-icon,
        :host-context([data-theme="dark"]) .dp-teal .dp-item-icon svg,
        :host-context([data-theme="dark"]) .dp-blue .dp-item-label,
        :host-context([data-theme="dark"]) .dp-blue .dp-item-icon,
        :host-context([data-theme="dark"]) .dp-blue .dp-item-icon svg { color:#00d4d4; fill:#00d4d4; stroke:#00d4d4; }
        :host-context([data-theme="dark"]) .dp-purple .dp-item-label,
        :host-context([data-theme="dark"]) .dp-purple .dp-item-icon,
        :host-context([data-theme="dark"]) .dp-purple .dp-item-icon svg { color:#8b5cf6; fill:#8b5cf6; stroke:#8b5cf6; }
        :host-context([data-theme="dark"]) .dp-orange .dp-item-label,
        :host-context([data-theme="dark"]) .dp-orange .dp-item-icon,
        :host-context([data-theme="dark"]) .dp-orange .dp-item-icon svg,
        :host-context([data-theme="dark"]) .dp-gold .dp-item-label,
        :host-context([data-theme="dark"]) .dp-gold .dp-item-icon,
        :host-context([data-theme="dark"]) .dp-gold .dp-item-icon svg { color:#f0c040; fill:#f0c040; stroke:#f0c040; }

        @keyframes pulse-gem { 0%,100%{transform:scale(1);filter:drop-shadow(0 0 5px #f0c040)} 50%{transform:scale(1.12);filter:drop-shadow(0 0 12px #f0c040)} }

        /* ══ Banner Carousel ════════════════════════════════════════ */
        #bc-wrap { width:100%; margin-bottom:18px; }
        .bc-carousel { position:relative; width:100%; border-radius:16px; overflow:hidden; }
        .bc-track { display:flex; transition:transform .45s cubic-bezier(.4,0,.2,1); will-change:transform; }
        .bc-slide { flex:0 0 100%; width:100%; min-width:100%; display:block; position:relative; text-decoration:none; cursor:default; }
        a.bc-slide { cursor:pointer; }
        .bc-slide img { display:block; width:100%; aspect-ratio:32/9; object-fit:cover; border-radius:16px; }
        .bc-caption { position:absolute; bottom:0; left:0; right:0; padding:8px 14px 10px; background:linear-gradient(to top,rgba(0,0,0,.65),transparent); border-radius:0 0 16px 16px; pointer-events:none; }
        .bc-caption span { font-family:'Rajdhani',sans-serif; font-size:.85rem; font-weight:700; color:#fff; text-transform:uppercase; letter-spacing:.5px; text-shadow:0 1px 3px rgba(0,0,0,.6); }
        .bc-dots { position:absolute; bottom:10px; left:50%; transform:translateX(-50%); display:flex; gap:6px; z-index:2; }
        .bc-dot { width:7px; height:7px; border-radius:50%; border:none; background:rgba(255,255,255,.4); cursor:pointer; padding:0; transition:background .25s,transform .25s; }
        .bc-dot-active { background:#fff; transform:scale(1.25); }
      </style>

      <div class="container" style="flex-direction:column">
        <!-- ══ Banner Carousel — aparece acima dos dois layouts ══ -->
        <div id="bc-wrap" style="display:none;width:100%;max-width:620px;"></div>

        <!-- ══ Layout original — menu universal (mobile e desktop) ══ -->
        <div class="mobile-layout" style="display:${layout === 'dinamico' ? 'none' : 'flex'}">
          <a href="recrutamento.html" class="btn-agency-mobile">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="23" y1="11" x2="17" y2="11"></line></svg>
            <span data-i18n="homeJoinAgency">Entrar na Agência</span>
          </a>
          <div class="menu-panel">
            <a href="https://www.instagram.com/dmaioragency/" target="_blank" rel="noopener noreferrer" class="nav-item item-instagram">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/></svg>
              <span>Insta</span>
            </a>
            <a href="https://rocketbunny.club/@DMAIOR_AGENCY" target="_blank" rel="noopener noreferrer" class="nav-item-center">
              <div class="floating-btn">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h12l4 6-10 13L2 9Z"></path><path d="M11 3 8 9l4 13"></path><path d="M13 3l3 6-4 13"></path><path d="M2 9h20"></path></svg>
              </div>
              <span data-i18n="homeTopup">Recarga</span>
            </a>
            <a href="https://wa.me/5517997176407" target="_blank" rel="noopener noreferrer" class="nav-item item-whatsapp">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.82 9.82 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>
              <span data-i18n="homeSupport">Suporte</span>
            </a>
          </div>
        </div>

        <!-- ══ Layout Dinâmico Pro — universal (mobile e desktop) ════ -->
        <div class="dinamico-layout">

          <!-- Banner destaque: Recarga de Diamantes -->
          <a href="recarga.html" class="dp-banner">
            <div class="dp-banner-icon">${SVG_DIAMOND}</div>
            <div class="dp-banner-text">
              <div class="dp-banner-title" data-i18n="homeDiamondTopup">Recarga de Diamantes</div>
              <div class="dp-banner-sub" data-i18n="homeTopupSub">Rápido, seguro e pelo melhor preço</div>
            </div>
            <div class="dp-banner-arrow">${SVG_ARROW}</div>
          </a>

          <!-- Botão Entrar na Agência -->
          <a href="recrutamento.html" class="dp-agency-btn">
            ${SVG_AGENCY}
            <span data-i18n="homeJoinAgency">Entrar na Agência</span>
            <span class="dp-agency-badge" data-i18n="homeFree">Gratuito</span>
          </a>

          <!-- Seção: Acesso rápido -->
          <div class="dp-section-title" data-i18n="homeQuickAccess">Acesso rápido</div>
          <div class="dp-grid">

            <a href="https://www.instagram.com/dmaioragency/" target="_blank" rel="noopener noreferrer" class="dp-item dp-pink">
              <div class="dp-item-icon">${SVG_INSTA}</div>
              <div class="dp-item-text">
                <div class="dp-item-name">Instagram</div>
                <div class="dp-item-label">@dmaioragency</div>
              </div>
              <div class="dp-item-arrow">${SVG_ARROW}</div>
            </a>

            <a href="https://wa.me/5517997176407" target="_blank" rel="noopener noreferrer" class="dp-item dp-green">
              <div class="dp-item-icon">${SVG_WA}</div>
              <div class="dp-item-text">
                <div class="dp-item-name" data-i18n="homeSupport">Suporte</div>
                <div class="dp-item-label">WhatsApp</div>
              </div>
              <div class="dp-item-arrow">${SVG_ARROW}</div>
            </a>

            <a href="ranking.html" class="dp-item dp-cyan">
              <div class="dp-item-icon">${SVG_RANK}</div>
              <div class="dp-item-text">
                <div class="dp-item-name" data-i18n="homeRanking">Ranking</div>
                <div class="dp-item-label" data-i18n="homeSeePositions">Ver posições</div>
              </div>
              <div class="dp-item-arrow">${SVG_ARROW}</div>
            </a>

            <a href="tutoriais.html" class="dp-item dp-purple">
              <div class="dp-item-icon">${SVG_VIDEO}</div>
              <div class="dp-item-text">
                <div class="dp-item-name" data-i18n="homeTutorials">Tutoriais</div>
                <div class="dp-item-label" data-i18n="homeLearnMore">Aprenda mais</div>
              </div>
              <div class="dp-item-arrow">${SVG_ARROW}</div>
            </a>

            <a href="pk-interno.html" class="dp-item dp-orange">
              <div class="dp-item-icon">${SVG_CALENDAR}</div>
              <div class="dp-item-text">
                <div class="dp-item-name" data-i18n="homeEvents">Eventos</div>
                <div class="dp-item-label" data-i18n="homePkChallenges">PK e desafios</div>
              </div>
              <div class="dp-item-arrow">${SVG_ARROW}</div>
            </a>

            <a href="quem-somos.html" class="dp-item dp-blue">
              <div class="dp-item-icon">${SVG_INFO}</div>
              <div class="dp-item-text">
                <div class="dp-item-name" data-i18n="homePortfolio">Portfólio</div>
                <div class="dp-item-label" data-i18n="homeWhoWeAre">Quem somos</div>
              </div>
              <div class="dp-item-arrow">${SVG_ARROW}</div>
            </a>

          </div>

          <!-- Seção: Políticas (desagrupadas — antes dentro de "Material") -->
          <div class="dp-section-title" data-i18n="homePolicies">Políticas</div>
          <div class="dp-grid">

            <a href="politicas-host.html" class="dp-item dp-teal">
              <div class="dp-item-icon">${SVG_DOC}</div>
              <div class="dp-item-text">
                <div class="dp-item-name" data-i18n="homeHostPolicy">Política de Host</div>
                <div class="dp-item-label" data-i18n="homeKwaiPayments">Pagamentos Kwai</div>
              </div>
              <div class="dp-item-arrow">${SVG_ARROW}</div>
            </a>

            <a href="politicas-premium.html" class="dp-item dp-gold">
              <div class="dp-item-icon">${SVG_STAR}</div>
              <div class="dp-item-text">
                <div class="dp-item-name" data-i18n="homeSpecialPolicy">Pol. Especial</div>
                <div class="dp-item-label" data-i18n="homePremiumStreamer">Streamer Premium</div>
              </div>
              <div class="dp-item-arrow">${SVG_ARROW}</div>
            </a>

          </div>
        </div><!-- /dinamico-layout -->

      </div>
    `;
    window.DMaiorPrefs?.bind(this.shadowRoot);
  }
}

customElements.define('dmaior-services-menu', DmaiorServicesMenu);
