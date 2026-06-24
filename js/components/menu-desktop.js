/**
 * menu-desktop.js — Navbar desktop da DMaior Agency
 *
 * Custom Element: <menu-desktop-dmaior>
 * Lê autenticação do localStorage (dm_token, dm_foto, dm_nome).
 * Detecta mudanças via evento 'dmaior:auth' e via 'storage' (multi-aba).
 * Logout disparado via evento 'dmaior:logout' (capturado por auth.js).
 *
 * Preserva 100% o design original — nenhum estilo foi alterado.
 */

/* eslint-env browser */
class MenuDesktopDMaior extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.render();
    this.bindEvents();
    this.checkAuth();
    // Atualiza quando outra aba mudar o token
    window.addEventListener('storage', (e) => {
      if (['dm_token', 'dm_foto', 'dm_nome'].includes(e.key)) this.checkAuth();
    });
    // Atualiza quando auth.js disparar o evento de login/logout
    window.addEventListener('dmaior:auth', (e) => this.updateAuthUI(e.detail));
  }

  disconnectedCallback() {
    window.removeEventListener('dmaior:auth', this._authHandler);
  }

  // Lê localStorage de forma segura e atualiza a UI de autenticação
  checkAuth() {
    if (typeof window === 'undefined') return;
    try {
      const token = localStorage.getItem('dm_token') || '';
      const foto  = localStorage.getItem('dm_foto')  || '';
      const nome  = localStorage.getItem('dm_nome')  || '';
      this.updateAuthUI({ logado: !!token, foto, nome });
    } catch {}
  }

  render() {
    const URL_LOGO   = `https://static.wixstatic.com/media/ac74b3_a9a577806ac34acbb663f4cd05e8c70f~mv2.png`;
    const SVG_CHEV   = `<svg class="chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a0b8c8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>`;
    const SVG_HOME   = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00d4d4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>`;
    const SVG_RANK   = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00d4d4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>`;
    const SVG_FOLDER = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00d4d4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>`;
    const SVG_BOOK   = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00d4d4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>`;
    const SVG_EVENT  = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00d4d4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>`;
    const SVG_TOOL   = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00d4d4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg>`;
    const SVG_INFO   = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00d4d4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
    const SVG_PAINEL = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>`;
    const SVG_LOGOUT = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>`;
    const SVG_USER   = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#a0b8c8" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`;
    const SVG_ACCESS = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path><polyline points="10 17 15 12 10 7"></polyline><line x1="15" y1="12" x2="3" y2="12"></line></svg>`;

    // Estrutura de navegação (links relativos para Hostinger)
    const menuData = [
      { label: 'Início',      link: '/',              icon: SVG_HOME   },
      { label: 'Rank',        link: '/ranking.html',  icon: SVG_RANK   },
      { label: 'Material',    link: '#',              icon: SVG_FOLDER, subItems: [
          { label: 'Central Kwai',          link: '/material.html' },
          { label: 'Academia do Streamer',  link: '/academia-streamer.html' },
      ]},
      { label: 'Cursos',      link: '/cursos.html',   icon: SVG_BOOK   },
      { label: 'Eventos',     link: '#',              icon: SVG_EVENT,  subItems: [
          { label: 'PK Interno', link: '/pk-interno.html' },
      ]},
      { label: 'Ferramentas', link: '/aplicativos.html', icon: SVG_TOOL },
      { label: 'Portfólio',   link: '#',              icon: SVG_INFO,   subItems: [
          { label: 'Quem Somos?', link: '/quem-somos.html' },
      ]},
    ];

    let navHTML = '';
    menuData.forEach(item => {
      if (item.subItems) {
        const subHTML = item.subItems.map(s => `<a href="${s.link}" class="dd-link">${s.label}</a>`).join('');
        navHTML += `
          <div class="nav-item has-dd">
            <a href="${item.link}" class="nav-link">${item.icon}<span>${item.label}</span>${SVG_CHEV}</a>
            <div class="dd-menu">${subHTML}</div>
          </div>`;
      } else {
        navHTML += `
          <div class="nav-item">
            <a href="${item.link}" class="nav-link direct">${item.icon}<span>${item.label}</span></a>
          </div>`;
      }
    });

    this.shadowRoot.innerHTML = `
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@600;700&family=Exo+2:wght@400;500;600&display=swap');
      *{ box-sizing:border-box; margin:0; padding:0; }
      :host{ display:block; font-family:'Exo 2',sans-serif; width:100%; height:80px; }
      .hd{ display:flex; align-items:center; width:100%; height:80px; padding:0 40px; background:transparent; }
      .logo{ height:38px; width:auto; object-fit:contain; margin-right:40px; transition:transform .2s; }
      .logo:hover{ transform:scale(1.02); }
      nav{ display:flex; align-items:center; gap:15px; height:100%; }
      .nav-item{ position:relative; height:100%; display:flex; align-items:center; }
      .nav-link{ display:flex; align-items:center; gap:6px; font-size:.95rem; font-weight:500; color:#e2e8f0; text-decoration:none; padding:8px 12px; border-radius:6px; transition:all .2s; }
      .nav-link:hover{ background:rgba(0,212,212,.08); color:#fff; }
      .chevron{ transition:transform .3s; }
      .dd-menu{ display:none; position:absolute; top:80px; left:0; background:rgba(20,20,32,.98); backdrop-filter:blur(8px); border:1px solid rgba(0,212,212,.15); border-top:2px solid #00d4d4; border-radius:0 0 8px 8px; min-width:220px; flex-direction:column; box-shadow:0 10px 25px rgba(0,0,0,.5); padding:10px 0; z-index:100; }
      @keyframes fadePop{ from{ opacity:0; transform:translateY(8px); } to{ opacity:1; transform:translateY(0); } }
      .has-dd:hover .dd-menu{ display:flex; animation:fadePop .25s ease forwards; }
      .has-dd:hover .chevron{ transform:rotate(180deg); }
      .dd-link{ padding:12px 24px; text-decoration:none; color:#a0b8c8; font-size:.9rem; font-weight:500; transition:all .2s; }
      .dd-link:hover{ background:rgba(0,212,212,.1); color:#fff; padding-left:30px; border-left:3px solid #00d4d4; }
      .auth-zone{ margin-left:auto; display:flex; align-items:center; min-width:220px; justify-content:flex-end; }
      .btn-access{ display:flex; align-items:center; gap:8px; background:linear-gradient(90deg,#00d4d4,#008c8c); color:#000; border:none; padding:9px 18px; border-radius:8px; font-family:'Rajdhani',sans-serif; font-weight:700; font-size:.9rem; text-transform:uppercase; cursor:pointer; text-decoration:none; transition:all .2s; letter-spacing:.05em; }
      .btn-access:hover{ transform:translateY(-1px); box-shadow:0 4px 15px rgba(0,212,212,.3); }
      .user-zone{ position:relative; display:flex; align-items:center; gap:10px; cursor:pointer; }
      .avatar-wrap{ width:38px; height:38px; border-radius:50%; border:2px solid #00d4d4; overflow:hidden; background:#12121f; display:flex; align-items:center; justify-content:center; flex-shrink:0; transition:box-shadow .2s; }
      .avatar-wrap:hover{ box-shadow:0 0 12px rgba(0,212,212,.5); }
      .avatar-wrap img{ width:100%; height:100%; object-fit:cover; }
      .user-name{ font-family:'Rajdhani',sans-serif; font-weight:700; font-size:.9rem; color:#e2e8f0; text-transform:uppercase; letter-spacing:.05em; max-width:120px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
      .user-chev{ transition:transform .3s; }
      .user-dd{ display:none; position:absolute; top:52px; right:0; background:rgba(20,20,32,.98); backdrop-filter:blur(8px); border:1px solid rgba(0,212,212,.15); border-top:2px solid #00d4d4; border-radius:0 0 8px 8px; min-width:200px; flex-direction:column; box-shadow:0 10px 25px rgba(0,0,0,.5); padding:8px 0; z-index:200; }
      .user-zone:hover .user-dd{ display:flex; animation:fadePop .25s ease forwards; }
      .user-zone:hover .user-chev{ transform:rotate(180deg); }
      .ud-link{ display:flex; align-items:center; gap:10px; padding:12px 20px; text-decoration:none; color:#a0b8c8; font-size:.9rem; font-weight:500; transition:all .2s; border:none; background:none; width:100%; cursor:pointer; font-family:'Exo 2',sans-serif; }
      .ud-link:hover{ background:rgba(0,212,212,.1); color:#fff; }
      .ud-link.danger{ color:#f87171; }
      .ud-link.danger:hover{ background:rgba(248,113,113,.1); color:#f87171; }
      .ud-sep{ height:1px; background:rgba(255,255,255,.06); margin:4px 0; }
      .hidden{ display:none !important; }
    </style>

    <header class="hd">
      <a href="/"><img src="${URL_LOGO}" alt="DMaior Agency" class="logo"></a>
      <nav>${navHTML}</nav>
      <div class="auth-zone">
        <a href="/painel/index.html" class="btn-access" id="btnAccess">
          ${SVG_ACCESS} ACESSAR PAINEL
        </a>
        <div class="user-zone hidden" id="userZone">
          <div class="avatar-wrap" id="avatarWrap">${SVG_USER}</div>
          <span class="user-name" id="userName">Streamer</span>
          <svg class="user-chev" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a0b8c8" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
          <div class="user-dd">
            <a href="/painel/index.html" class="ud-link">${SVG_PAINEL} Painel do Host</a>
            <div class="ud-sep"></div>
            <button class="ud-link danger" id="btnLogout">${SVG_LOGOUT} Sair</button>
          </div>
        </div>
      </div>
    </header>`;
    window.DMaiorPrefs?.bind(this.shadowRoot);
  }

  // Atualiza a zona de auth conforme estado de login
  updateAuthUI(detail) {
    const root      = this.shadowRoot;
    const btnAccess = root.getElementById('btnAccess');
    const userZone  = root.getElementById('userZone');
    const avatarWrap = root.getElementById('avatarWrap');
    const userName  = root.getElementById('userName');
    if (!btnAccess || !userZone) return;
    if (detail.logado) {
      btnAccess.classList.add('hidden');
      userZone.classList.remove('hidden');
      if (detail.foto) avatarWrap.innerHTML = `<img src="${detail.foto}" alt="Avatar">`;
      if (detail.nome) userName.textContent = detail.nome.split(' ')[0];
    } else {
      btnAccess.classList.remove('hidden');
      userZone.classList.add('hidden');
    }
  }

  bindEvents() {
    const root = this.shadowRoot;
    const btnLogout = root.getElementById('btnLogout');
    if (btnLogout) {
      btnLogout.addEventListener('click', () => {
        window.dispatchEvent(new CustomEvent('dmaior:logout'));
      });
    }
  }
}

customElements.define('menu-desktop-dmaior', MenuDesktopDMaior);
