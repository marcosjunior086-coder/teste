/* eslint-env browser */
// ════════════════════════════════════════════════════════════
// DMaior Agency — Admin Panel v2.1
// CORREÇÕES v2.1:
//   • _carregarListaCarteiras: usa /admin/carteira/streamers
//     (retorna TODOS os perfis, não limit=20 de antes)
//   • Modal carteira mobile: overflow-x:auto, não alarga
// ════════════════════════════════════════════════════════════
class DimaiorAdmin extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.WORKER  = 'https://admin.agencydmaior.com.br';
    this.TK_KEY  = 'dm_admin_token';
    this._token  = '';
    this._edtId  = null;
    this._pg     = { s:1, u:1, l:1, uid:1, cart:1, saques:1, desemp:1, rank:1, diario:1 };
    this._uidLookup = null;
    this._cartOp   = { uid: null, tipo: null, nome: '' };
    this._saqueId  = null;
    this._saqueAcao = null;
    this._premioTipo = 'diamantes';
    this._premioLinhas = { diamantes: [], horas: [] };
    this._premioRemover = { diamantes: new Set(), horas: new Set() };
    this._taxaSaque = 0;
    this._taxaPerc  = 0;
    this._edtCom    = null;
    this._creditoRapidoUid = null;
    // Lives — layout e modo (persistido em localStorage)
    const _lo = (() => { try { return JSON.parse(localStorage.getItem('dm_lives_opts')||'{}'); } catch { return {}; } })();
    this._livesOpts = { cols: _lo.cols||2, modo: _lo.modo||'capa', ordenar: _lo.ordenar||'padrao', estilo: _lo.estilo||1, dashboardAoVivo: _lo.dashboardAoVivo!==false };
    this._livesData = null;
  }

  connectedCallback() {
    this._loadFonts(); this._render(); this._bindEvents();
    const tk = localStorage.getItem(this.TK_KEY)||'';
    if (tk) { this._token=tk; this._validarSessao(); }
    this._startHeightObserver();
  }
  _startHeightObserver(){
    let lastH=0,timer=null;
    // Detecta largura real do CE para layout responsivo (independe da viewport)
    const widthObs=new ResizeObserver(([{contentRect}])=>{
      const root=this.shadowRoot.getElementById('root');
      if(!root)return;
      const w=contentRect.width;
      root.classList.toggle('narrow',w<650);
      root.classList.toggle('very-narrow',w<420);
    });
    widthObs.observe(this);
    const sendHeight=()=>{
      // Pega a altura real do conteúdo renderizado
      const root=this.shadowRoot.getElementById('root');
      const h=Math.max(
        root ? root.getBoundingClientRect().height : 0,
        this.scrollHeight,
        this.offsetHeight,
        600
      );
      if(h===lastH)return; // só envia se mudou
      lastH=h;
      // Envia para o iframe pai (Wix HtmlComponent)
      try{ window.parent.postMessage({type:'dmaior:height',height:h},'*'); }catch{}
      try{ window.postMessage({type:'dmaior:height',height:h},'*'); }catch{}
    };
    const debouncedSend=()=>{clearTimeout(timer);timer=setTimeout(sendHeight,100);};
    const ro=new ResizeObserver(debouncedSend);
    ro.observe(this);
    // Também observa o #root interno para pegar mudanças de modal/accordion
    const root=this.shadowRoot.getElementById('root');
    if(root){const ro2=new ResizeObserver(debouncedSend);ro2.observe(root);}
    this._sendHeight=sendHeight;
    sendHeight();
    // Reenvia em intervalos curtos nos primeiros 3s (garante carga inicial)
    let count=0;
    const ini=setInterval(()=>{sendHeight();if(++count>=6)clearInterval(ini);},500);
  }
  _loadFonts(){
    if(!document.getElementById('gf-adm-dm')){const l=document.createElement('link');l.id='gf-adm-dm';l.rel='stylesheet';l.href='https://fonts.googleapis.com/css2?family=Exo+2:wght@400;600&family=Rajdhani:wght@700&display=swap';document.head.appendChild(l);}
    const l2=document.createElement('link');l2.rel='stylesheet';l2.href='https://fonts.googleapis.com/css2?family=Exo+2:wght@400;600&family=Rajdhani:wght@700&display=swap';this.shadowRoot.appendChild(l2);
  }

  _ico(name,size=16){
    const icons={
      dashboard:`<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>`,
      live:`<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="3"/><path d="M8.56 8.56a5 5 0 0 0 0 6.88M15.44 8.56a5 5 0 0 1 0 6.88M5.14 5.14a9 9 0 0 0 0 13.72M18.86 5.14a9 9 0 0 1 0 13.72"/></svg>`,
      trophy:`<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>`,
      chart:`<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`,
      trend:`<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>`,
      mic:`<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/></svg>`,
      users:`<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
      metrics:`<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></svg>`,
      clipboard:`<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>`,
      search:`<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
      settings:`<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
      history:`<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.95"/></svg>`,
      logout:`<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>`,
      menu:`<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>`,
      refresh:`<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>`,
      plus:`<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
      edit:`<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
      trash:`<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>`,
      up:`<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l5 9H7z"/></svg>`,
      down:`<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor"><path d="M12 22l5-9H7z"/></svg>`,
      star:`<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`,
      warning:`<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
      check:`<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>`,
      server:`<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg>`,
      bolt:`<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>`,
      heart:`<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`,
      gift:`<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M12 2v20"/><path d="M2 7h20"/><path d="M12 7a4 4 0 0 1-4-4 4 4 0 0 1 8 0 4 4 0 0 1-4 4z"/></svg>`,
      wallet:`<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>`,
      key_uid:`<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="7.5" cy="15.5" r="5.5"/><path d="M21 2l-9.6 9.6"/><path d="M15.5 7.5l3 3 3-3-3-3"/></svg>`,
      send:`<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>`,
      diamond:`<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5L2 9l10 12L22 9l-3-6zm-7 14.5L4.5 9.5l2-4h11l2 4L12 17.5z"/></svg>`,
      clock_r:`<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
      award:`<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/></svg>`,
      pix_ico:`<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.06 10.94l-3-3A3 3 0 0 0 12 7.17a3 3 0 0 0-2.12.88l-3 3a3 3 0 0 0 0 4.24l3 3A3 3 0 0 0 12 19.17a3 3 0 0 0 2.12-.88l3-3a3 3 0 0 0 0-4.24z"/></svg>`,
      unlock:`<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>`,
      lock_r:`<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`,
      x_circle:`<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
      check_c:`<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
      calendar:`<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
      zap:`<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
      megaphone:`<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 11l19-9-9 19-2-8-8-2z"/></svg>`,
      bell:`<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>`,
    };
    return icons[name]||icons.search;
  }

  async _api(method,rota,body=null){
    const opts={method,headers:{'Content-Type':'application/json',...(this._token&&{Authorization:`Bearer ${this._token}`})},...(body&&{body:JSON.stringify(body)})};
    try{const r=await fetch(this.WORKER+rota,opts);const d=await r.json();if(r.status===401&&rota==='/admin/me'){this._doLogout();return null;}return d;}
    catch{if(rota!=='/admin/me')this._toast('Sem conexão com o servidor','err');return null;}
  }
  _validarSessao(){
    // Valida o JWT localmente (sem chamada ao servidor)
    // Isso evita logout desnecessário por problemas de rede/timeout
    try {
      const partes = this._token.split('.');
      if(partes.length !== 3) throw new Error('Token malformado');
      // Decodifica o payload (base64url)
      const payload = JSON.parse(atob(partes[1].replace(/-/g,'+').replace(/_/g,'/')));
      const agora   = Math.floor(Date.now()/1000);
      if(payload.exp && payload.exp < agora){
        // Token expirado — limpa e mostra login
        this._token = '';
        localStorage.removeItem(this.TK_KEY);
        return;
      }
      // Token válido — abre o app
      this._abrirApp();
    } catch {
      // Token corrompido — limpa
      this._token = '';
      localStorage.removeItem(this.TK_KEY);
    }
  }
  async _doLogin(){
    const s=this.shadowRoot;const u=s.getElementById('iU').value.trim(),p=s.getElementById('iP').value;
    const err=s.getElementById('lErr');if(!u||!p){err.textContent='Preencha todos os campos';err.style.display='block';return;}
    err.style.display='none';s.getElementById('btnL').style.display='none';s.getElementById('lLoad').classList.add('on');
    const d=await this._api('POST','/admin/login',{usuario:u,senha:p});
    s.getElementById('btnL').style.display='';s.getElementById('lLoad').classList.remove('on');
    if(d?.ok&&d.token){this._token=d.token;localStorage.setItem(this.TK_KEY,d.token);this._abrirApp();}
    else{err.textContent=d?.erro||'Credenciais inválidas';err.style.display='block';}
  }
  _doLogout(){this._token='';localStorage.removeItem(this.TK_KEY);const s=this.shadowRoot;s.getElementById('app').classList.remove('on');s.getElementById('login').style.display='flex';s.getElementById('iP').value='';}
  _abrirApp(){const s=this.shadowRoot;s.getElementById('login').style.display='none';s.getElementById('app').classList.add('on');this._ir('dashboard');this._carregarLives();}
  _ir(pag){
    const s=this.shadowRoot;s.querySelectorAll('.pag').forEach(e=>e.classList.remove('on'));s.getElementById('pag-'+pag)?.classList.add('on');
    s.querySelectorAll('.ni').forEach(n=>n.classList.toggle('on',n.dataset.p===pag));s.getElementById('side').classList.remove('open');
    setTimeout(()=>{if(this._sendHeight)this._sendHeight();},150);
    const mapa={dashboard:()=>this._carregarDash(),aoVivo:()=>this._carregarLives(),ranking:()=>this._carregarRanking(),diario:()=>this._carregarDiario(),desempenho:()=>this._carregarDesempenho(),historico:()=>this._carregarHistorico(),streamers:()=>this._carregarStreamers(),metricas:()=>this._carregarMetricas(),recrutamento:()=>this._carregarRecrutamento(),logs:()=>this._carregarLogs(),config:()=>this._carregarConfig(),uids:()=>this._carregarUids(),carteira:()=>this._carregarCarteiraDash(),saques:()=>this._carregarSaques(),premios:()=>this._carregarPremios(),comunicados:()=>this._carregarComunicados(),impulsoCtrl:()=>this._carregarImpulsoCtrl(),monitor:()=>this._carregarMonitor()};
    mapa[pag]?.();
  }

  _fdt(v){if(!v)return'—';const d=new Date(v);return d.toLocaleDateString('pt-BR')+' '+d.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});}
  _fdtCurto(v){if(!v)return'—';const d=new Date(v);return d.toLocaleDateString('pt-BR');}
  _dataHojeBR(){
    const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
    const p=Object.fromEntries(parts.map(x=>[x.type,x.value]));
    return `${p.year}-${p.month}-${p.day}`;
  }
  _proxyFoto(url){if(!url||url==='null'||url==='undefined')return null;if(url.includes('flaticon')||url.includes('149071'))return null;if(url.includes('weserv.nl'))return url;return`https://images.weserv.nl/?url=${encodeURIComponent(url)}&w=100&h=100&fit=cover&output=webp`;}
  _diam(sv){return Number(sv?.diamantes_acumulados||sv?.diamantes||sv?.diamantes_hoje||sv?.total_diamantes||sv?.diamonds||0);}
  _listaDiario(d){
    const lista=d?.streamers||d?.resultados||d?.ranking||d?.diario||d?.dados||d?.items||d?.lista||[];
    return Array.isArray(lista)?lista:[];
  }
  _avatar(foto,nome,cls='av'){const src=foto&&foto!=='null'?foto:null;if(src)return`<img class="${cls}" src="${src}" alt="" onerror="this.style.display='none';this.nextSibling.style.display='flex'"><div class="${cls}-fb" style="display:none">${this._ini(nome)}</div>`;return`<div class="${cls}-fb">${this._ini(nome)}</div>`;}
  _ini(n){return(n||'?').charAt(0).toUpperCase();}
  _loading(st=''){return`<div class="loading" style="${st}"><div class="sp"></div><span>Carregando...</span></div>`;}
  _empty(ico,msg){return`<div class="empty">${this._ico(ico,32)}<p>${msg}</p></div>`;}
  _num(n){return Number(n||0).toLocaleString('pt-BR');}
  _numK(n){if(n>=1000)return(n/1000).toFixed(1)+'K';return String(n||0);}
  _brl(n){return'R$ '+Number(n||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});}
  _dbc(fn,t){let id;return(...a)=>{clearTimeout(id);id=setTimeout(()=>fn(...a),t);};}
  _varBadge(v){if(v===null||v===undefined)return'<span class="vbadge neutro">—</span>';const cls=v>0?'up':v<0?'down':'neutro';const ico=v>0?this._ico('up',10):v<0?this._ico('down',10):'';return`<span class="vbadge ${cls}">${ico} ${v>0?'+':''}${v}%</span>`;}
  _renderPg(elId,n,qtd,lim,fn){const el=this.shadowRoot.getElementById(elId);if(!el)return;el.innerHTML=`<button ${n<=1?'disabled':''}>Anterior</button><span class="pn">Pág ${n}</span><button ${qtd<lim?'disabled':''}>Próxima</button>`;el.children[0].addEventListener('click',()=>fn(n-1));el.children[2].addEventListener('click',()=>fn(n+1));}
  _toast(msg,tipo='ok'){const el=this.shadowRoot.getElementById('toast');this.shadowRoot.getElementById('tIco').innerHTML=tipo==='ok'?this._ico('check',14):this._ico('warning',14);this.shadowRoot.getElementById('tMsg').textContent=msg;el.className='toast on '+tipo;setTimeout(()=>el.className='toast',3500);}
  _fechaModal(id){this.shadowRoot.getElementById(id)?.classList.remove('on');}
  _abrirModal(id){
    const el=this.shadowRoot.getElementById(id);
    if(!el)return;
    el.classList.add('on');
    // Scroll para o topo do CE para garantir que o modal seja visível
    try{this.scrollIntoView({behavior:'instant',block:'start'});}catch{}
  }

  async _carregarDash(){
    const s=this.shadowRoot;
    s.getElementById('gMetricas').innerHTML=this._loading('grid-column:1/-1');
    const dataHoje=this._dataHojeBR();
    const [d,diarioDash]=await Promise.all([this._api('GET','/admin/dashboard'),this._api('GET',`/admin/ranking/diario?data=${dataHoje}`)]);
    if(!d?.ok){s.getElementById('gMetricas').innerHTML=this._empty('warning','Erro ao carregar');return;}
    const m=d.metricas;
    const diamantesDia=this._listaDiario(diarioDash).reduce((acc,sv)=>acc+this._diam(sv),0);

    // Cards coloridos 2x2 (estilo referência)
    const dcards=[
      {ico:'trophy',  val:m.streamers_mes||0,    lbl:'No Ranking',    cor:'indigo', fmt:'num'},
      ...(this._livesOpts.dashboardAoVivo!==false?[{ico:'live',val:m.ao_vivo,lbl:'Ao Vivo Agora',cor:'verm',fmt:'num',blink:true}]:[]),
      {ico:'bolt',    val:m.impulsionamentos,    lbl:'Boosts',        cor:'verde',  fmt:'num'},
      {ico:'diamond', val:m.total_diamantes||0,  lbl:'Diamantes Mês', cor:'cyan',   fmt:'num'},
      {ico:'diamond', val:diamantesDia,          lbl:'Diamantes do Dia', cor:'cyan', fmt:'num'},
      {ico:'metrics', val:m.registros_hoje||0,   lbl:'Registros Hoje',cor:'gold',   fmt:'num'},
      {ico:'server',  val:new Date(m.horario).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}), lbl:'Horário Servidor', cor:'slate', fmt:'str'},
    ];
    s.getElementById('gMetricas').innerHTML=dcards.map(c=>`
      <div class="dc2 dc2-${c.cor}">
        <div class="dc2-ico ${c.blink?'dc2-blink':''}">${this._ico(c.ico,26)}</div>
        <div class="dc2-val">${c.fmt==='num'?this._numK(Number(c.val||0)):c.val}</div>
        <div class="dc2-lbl">${c.lbl}</div>
      </div>`).join('');

    // Ações Rápidas — estilo lista colorida (referência imagem 1)
    const qas=[
      {lbl:'Streamers',   sub:'Perfis cadastrados', pag:'streamers',   ico:'users',   cor:'indigo'},
      {lbl:'Ao Vivo',     sub:'Transmissões agora',  pag:'aoVivo',      ico:'live',    cor:'verm'},
      {lbl:'Carteira',    sub:'Saldos e saques',     pag:'carteira',    ico:'wallet',  cor:'verde'},
      {lbl:'Ranking',     sub:'Diamantes do mês',    pag:'ranking',     ico:'trophy',  cor:'cyan'},
      {lbl:'Prêmios',     sub:'Distribuição mensal', pag:'premios',     ico:'award',   cor:'gold'},
      {lbl:'Configuração',sub:'Taxas e pagamentos', pag:'config',      ico:'settings',cor:'slate'},
    ];

    const dashLiveCfg=()=>{
      const opts=this._livesOpts;
      const svgIcos={1:`<svg width="4" height="14" viewBox="0 0 4 14" fill="currentColor"><rect x="0" y="1" width="4" height="12" rx="1"/></svg>`,2:`<svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor"><rect x="0" y="1" width="4" height="12" rx="1"/><rect x="6" y="1" width="4" height="12" rx="1"/></svg>`,3:`<svg width="16" height="14" viewBox="0 0 16 14" fill="currentColor"><rect x="0" y="1" width="4" height="12" rx="1"/><rect x="6" y="1" width="4" height="12" rx="1"/><rect x="12" y="1" width="4" height="12" rx="1"/></svg>`,4:`<svg width="22" height="14" viewBox="0 0 22 14" fill="currentColor"><rect x="0" y="1" width="4" height="12" rx="1"/><rect x="6" y="1" width="4" height="12" rx="1"/><rect x="12" y="1" width="4" height="12" rx="1"/><rect x="18" y="1" width="4" height="12" rx="1"/></svg>`};
      const colBtns=[2,3,4].map(n=>`<button class="lv-cfg-opt-btn dash-lv-opt ${Number(opts.cols)===n?'on':''}" data-key="cols" data-val="${n}" title="${n} col">${svgIcos[n]}</button>`).join('');
      const modoBtns=`<button class="lv-cfg-opt-btn dash-lv-opt ${opts.modo==='capa'?'on':''}" data-key="modo" data-val="capa">${this._ico('gift',13)} Capa</button><button class="lv-cfg-opt-btn dash-lv-opt ${opts.modo==='video'?'on':''}" data-key="modo" data-val="video">${this._ico('live',13)} Video</button>`;
      const estiloBtns=`<button class="lv-cfg-opt-btn dash-lv-opt ${Number(opts.estilo||1)===1?'on':''}" data-key="estilo" data-val="1">Horizontal</button><button class="lv-cfg-opt-btn dash-lv-opt ${Number(opts.estilo||1)===2?'on':''}" data-key="estilo" data-val="2">Vertical</button>`;
      const ordens=[['padrao','Padrao','server'],['espectadores','Espectadores','users'],['presentes','Presentes','gift'],['horas','Horas ao vivo','clock_r']];
      const ordenBtns=ordens.map(([k,lbl,ico])=>`<button class="lv-cfg-opt-btn dash-lv-opt ${opts.ordenar===k?'on':''}" data-key="ordenar" data-val="${k}">${this._ico(ico,12)} ${lbl}</button>`).join('');
      const dashOn=opts.dashboardAoVivo!==false;
      const dashBtns=`<button class="lv-cfg-opt-btn dash-lv-opt ${dashOn?'on':''}" data-key="dashboardAoVivo" data-val="on">${this._ico('live',12)} Mostrar card</button><button class="lv-cfg-opt-btn dash-lv-opt ${!dashOn?'on':''}" data-key="dashboardAoVivo" data-val="off">${this._ico('x_circle',12)} Ocultar card</button>`;
      return `<div class="lv-cfg-painel dash-live-config" id="dashLiveConfig" style="display:none"><div class="lv-cfg-row"><span class="lv-cfg-label">Layout</span><div class="lv-cfg-opts">${colBtns}</div></div><div class="lv-cfg-row"><span class="lv-cfg-label">Modo</span><div class="lv-cfg-opts">${modoBtns}</div></div><div class="lv-cfg-row"><span class="lv-cfg-label">Estilo</span><div class="lv-cfg-opts">${estiloBtns}</div></div><div class="lv-cfg-row"><span class="lv-cfg-label">Ordenar</span><div class="lv-cfg-opts">${ordenBtns}</div></div><div class="lv-cfg-row"><span class="lv-cfg-label">Dashboard</span><div class="lv-cfg-opts">${dashBtns}</div></div></div>`;
    };

    s.getElementById('pDash').innerHTML=`
      <div class="box qa-box">
        <div class="bhead">
          <div class="btitulo">${this._ico('bolt',14)} Acesso Rápido</div>
        </div>
        <div class="qa-lista" id="qaLista"></div>
      </div>`;

    const ql=s.getElementById('qaLista');
    qas.forEach(q=>{
      const el=document.createElement('div');
      el.className=`qa-card qa-${q.cor}`;
      el.innerHTML=`
        <div class="qa-txt">
          <div class="qa-lbl">${q.lbl}</div>
          <div class="qa-sub">${q.sub}</div>
        </div>
        <div class="qa-actions">${q.pag==='aoVivo'?`<button class="qa-config-btn" id="btnDashLiveConfig" title="Configuracao do Ao Vivo">${this._ico('settings',16)}</button>`:''}<div class="qa-ico-wrap">${this._ico(q.ico,22)}</div></div>`;
      el.addEventListener('click',()=>this._ir(q.pag));
      ql.appendChild(el);
      if(q.pag==='aoVivo')el.insertAdjacentHTML('afterend',dashLiveCfg());
    });
    s.getElementById('btnDashLiveConfig')?.addEventListener('click',e=>{
      e.stopPropagation();
      const painel=s.getElementById('dashLiveConfig');
      if(painel)painel.style.display=painel.style.display==='none'?'':'none';
    });
    s.querySelectorAll('.dash-lv-opt').forEach(btn=>{
      btn.addEventListener('click',async()=>{
        const key=btn.dataset.key,val=btn.dataset.val;
        if(key==='cols'||key==='estilo')this._livesOpts[key]=parseInt(val);
        else if(key==='dashboardAoVivo')this._livesOpts.dashboardAoVivo=val==='on';
        else this._livesOpts[key]=val;
        try{localStorage.setItem('dm_lives_opts',JSON.stringify(this._livesOpts));}catch{}
        await this._carregarDash();
        this.shadowRoot.getElementById('btnDashLiveConfig')?.click();
      });
    });
  }

  async _carregarLives(){
    const s=this.shadowRoot;const el=s.getElementById('gLives');if(el)el.innerHTML=this._loading();
    const d=await this._api('GET','/admin/lives');const badge=s.getElementById('nbLive');
    if(!d?.ok){if(el)el.innerHTML=this._empty('warning','Erro ao buscar lives');return;}
    if(badge)badge.textContent=d.total??0;if(!el)return;
    this._livesData=d;
    if(!d.ao_vivo?.length){el.innerHTML=this._empty('live','Nenhum streamer ao vivo agora');return;}
    this._renderLives(d,el);
  }

  _renderLives(d,el){
    const s=this.shadowRoot;
    const root=this.shadowRoot.getElementById('root');
    const isMobile=root?root.classList.contains('narrow'):(window.innerWidth<=700);
    const cols=this._livesOpts.cols;
    const modo=this._livesOpts.modo;
    const ordenar=this._livesOpts.ordenar;
    const estilo=this._livesOpts.estilo||1;
    const dashboardAoVivo=this._livesOpts.dashboardAoVivo!==false;
    // No mobile com >1 col, Estilo 1 (horizontal) não funciona — forçar estilo 2
    // Estilo efetivo: no mobile com >1 col, horizontal não é viável → usa vertical
    // Mas com 1 col o horizontal funciona normalmente
    const estiloEfetivo=(isMobile && cols>1 && estilo===1)?2:estilo;
    try{localStorage.setItem('dm_lives_opts',JSON.stringify(this._livesOpts));}catch{}

    // ── Ordena as lives ──────────────────────────────────────────────────────
    let lista=[...d.ao_vivo];
    if(ordenar==='espectadores') lista.sort((a,b)=>(Number(b.espectadores||0))-(Number(a.espectadores||0)));
    else if(ordenar==='presentes') lista.sort((a,b)=>(Number(b.gifts||0))-(Number(a.gifts||0)));
    else if(ordenar==='horas') lista.sort((a,b)=>(Number(a.inicio||Date.now()))-(Number(b.inicio||Date.now())));

    // ── SVGs de colunas ──────────────────────────────────────────────────────
    const svgIcos={1:`<svg width="4"  height="14" viewBox="0 0 4  14" fill="currentColor"><rect x="0" y="1" width="4" height="12" rx="1"/></svg>`,2:`<svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor"><rect x="0" y="1" width="4" height="12" rx="1"/><rect x="6"  y="1" width="4" height="12" rx="1"/></svg>`,3:`<svg width="16" height="14" viewBox="0 0 16 14" fill="currentColor"><rect x="0" y="1" width="4" height="12" rx="1"/><rect x="6"  y="1" width="4" height="12" rx="1"/><rect x="12" y="1" width="4" height="12" rx="1"/></svg>`,4:`<svg width="22" height="14" viewBox="0 0 22 14" fill="currentColor"><rect x="0" y="1" width="4" height="12" rx="1"/><rect x="6"  y="1" width="4" height="12" rx="1"/><rect x="12" y="1" width="4" height="12" rx="1"/><rect x="18" y="1" width="4" height="12" rx="1"/></svg>`};
    const colOpts=isMobile?[{n:1},{n:2}]:[{n:2},{n:3},{n:4}];
    const colsBtns=colOpts.map(b=>`<button class="lv-cfg-opt-btn lv-cfg-col ${b.n===cols?'on':''}" data-cols="${b.n}" title="${b.n} col">${svgIcos[b.n]}</button>`).join('');

    // ── Botões de modo ───────────────────────────────────────────────────────
    const modoBtns=`
      <button class="lv-cfg-opt-btn lv-cfg-modo ${modo==='capa'?'on':''}" data-modo="capa">${this._ico('gift',13)} Capa</button>
      <button class="lv-cfg-opt-btn lv-cfg-modo ${modo==='video'?'on':''}" data-modo="video">${this._ico('live',13)} Vídeo</button>`;

    // ── Botões de ordenação ──────────────────────────────────────────────────
    const ordens=[
      {k:'padrao',    lbl:'Padrão',      ico:'server'},
      {k:'espectadores',lbl:'Espectadores',ico:'users'},
      {k:'presentes', lbl:'Presentes',   ico:'gift'},
      {k:'horas',     lbl:'Horas ao vivo',ico:'clock_r'},
    ];
    const ordenBtns=ordens.map(o=>`<button class="lv-cfg-opt-btn lv-cfg-ord ${ordenar===o.k?'on':''}" data-ord="${o.k}">${this._ico(o.ico,12)} ${o.lbl}</button>`).join('');
    const dashBtns=`
      <button class="lv-cfg-opt-btn lv-cfg-dash ${dashboardAoVivo?'on':''}" data-dash="on">${this._ico('live',12)} Mostrar card</button>
      <button class="lv-cfg-opt-btn lv-cfg-dash ${!dashboardAoVivo?'on':''}" data-dash="off">${this._ico('x_circle',12)} Ocultar card</button>`;

    el.innerHTML=`
      <!-- Header: cards dc2 compactos + botão cfg -->
      <div class="lv-header">
        <div class="lv-dc2 lv-dc2-verm">
          <div class="lv-dc2-ico">${this._ico('live',20)}</div>
          <div class="lv-dc2-body">
            <div class="lv-dc2-val">${d.total}</div>
            <div class="lv-dc2-lbl">ao vivo</div>
          </div>
        </div>
        <div class="lv-dc2 lv-dc2-azul">
          <div class="lv-dc2-ico">${this._ico('chart',20)}</div>
          <div class="lv-dc2-body">
            <div class="lv-dc2-val">${d.hoje_total||0}</div>
            <div class="lv-dc2-lbl">hoje</div>
          </div>
        </div>
        <div style="flex:1"></div>
        <button class="lv-cfg-btn" id="btnLvCfg">
          ${this._ico('settings',14)}
          <span>Configurações</span>
          <span class="lv-cfg-arrow" id="lvCfgArrow">${this._ico('down',11)}</span>
        </button>
      </div>

      <!-- Painel de configurações (toggle) -->
      <div class="lv-cfg-painel" id="lvCfgPainel" style="display:none">
        <div class="lv-cfg-row">
          <span class="lv-cfg-label">Layout</span>
          <div class="lv-cfg-opts">${colsBtns}</div>
        </div>
        <div class="lv-cfg-row">
          <span class="lv-cfg-label">Modo</span>
          <div class="lv-cfg-opts">${modoBtns}</div>
        </div>
        <div class="lv-cfg-row">
          <span class="lv-cfg-label">Estilo</span>
          <div class="lv-cfg-opts" id="lv-est-btns">
            <button class="lv-cfg-opt-btn lv-cfg-est ${estilo===1?'on':''}" data-est="1">
              <svg width="20" height="14" viewBox="0 0 20 14" fill="currentColor"><rect x="0" y="0" width="6" height="14" rx="1.5"/><rect x="8" y="0" width="12" height="3" rx="1"/><rect x="8" y="5" width="12" height="2" rx="1"/><rect x="8" y="9" width="12" height="2" rx="1"/><rect x="8" y="12" width="8" height="2" rx="1"/></svg>
              Horizontal
            </button>
            <button class="lv-cfg-opt-btn lv-cfg-est ${estilo===2?'on':''}" data-est="2">
              <svg width="14" height="20" viewBox="0 0 14 20" fill="currentColor"><rect x="0" y="0" width="14" height="9" rx="1.5"/><rect x="0" y="11" width="14" height="2" rx="1"/><rect x="0" y="15" width="10" height="2" rx="1"/><rect x="0" y="18" width="12" height="2" rx="1"/></svg>
              Vertical
            </button>
          </div>
        </div>
        <div class="lv-cfg-row">
          <span class="lv-cfg-label">Ordenar</span>
          <div class="lv-cfg-opts">${ordenBtns}</div>
        </div>
        <div class="lv-cfg-row">
          <span class="lv-cfg-label">Dashboard</span>
          <div class="lv-cfg-opts">${dashBtns}</div>
        </div>
      </div>

      <!-- Grid das lives -->
      <div class="lives-lista" id="livesLista" style="grid-template-columns:repeat(${cols},1fr);gap:14px">
        ${lista.map((sv,i)=>this._livesCard(sv,i,modo,estiloEfetivo)).join('')}
      </div>`;

    // ── Bind botão de configurações ──────────────────────────────────────────
    s.getElementById('btnLvCfg')?.addEventListener('click',()=>{
      const p=s.getElementById('lvCfgPainel');
      const a=s.getElementById('lvCfgArrow');
      const open=p.style.display==='none';
      p.style.display=open?'':'none';
      if(a) a.style.transform=open?'rotate(180deg)':'';
    });

    // ── Bind colunas ─────────────────────────────────────────────────────────
    el.querySelectorAll('.lv-cfg-col').forEach(btn=>{
      btn.addEventListener('click',()=>{
        this._livesOpts.cols=parseInt(btn.dataset.cols);
        if(this._livesData)this._renderLives(this._livesData,s.getElementById('gLives'));
      });
    });

    // ── Bind modo ────────────────────────────────────────────────────────────
    el.querySelectorAll('.lv-cfg-modo').forEach(btn=>{
      btn.addEventListener('click',()=>{
        this._livesOpts.modo=btn.dataset.modo;
        if(this._livesData)this._renderLives(this._livesData,s.getElementById('gLives'));
      });
    });

    // ── Bind estilo ──────────────────────────────────────────────────────────
    el.querySelectorAll('.lv-cfg-est').forEach(btn=>{
      btn.addEventListener('click',()=>{
        this._livesOpts.estilo=parseInt(btn.dataset.est);
        // Mobile com >1 col + estilo horizontal → força 1 coluna
        if(isMobile && this._livesOpts.estilo===1 && this._livesOpts.cols>1)
          this._livesOpts.cols=1;
        if(this._livesData)this._renderLives(this._livesData,s.getElementById('gLives'));
      });
    });
    // ── Bind ordenação ───────────────────────────────────────────────────────
    el.querySelectorAll('.lv-cfg-ord').forEach(btn=>{
      btn.addEventListener('click',()=>{
        this._livesOpts.ordenar=btn.dataset.ord;
        if(this._livesData)this._renderLives(this._livesData,s.getElementById('gLives'));
      });
    });

    // ── Cria modal player ────────────────────────────────────────────────────
    // Dashboard
    el.querySelectorAll('.lv-cfg-dash').forEach(btn=>{
      btn.addEventListener('click',()=>{
        this._livesOpts.dashboardAoVivo=btn.dataset.dash==='on';
        try{localStorage.setItem('dm_lives_opts',JSON.stringify(this._livesOpts));}catch{}
        if(this._livesData)this._renderLives(this._livesData,s.getElementById('gLives'));
      });
    });

    this._injetarPlayerHLS();

    // ── Modo vídeo: inicia HLS inline ────────────────────────────────────────
    if(modo==='video'){
      lista.forEach((sv,i)=>{
        if(sv.stream_url) this._iniciarVideoInline(`lv-vid-${i}`,sv.stream_url);
      });
    }
  }
  _iniciarVideoInline(videoId,url){
    const vid=this.shadowRoot.getElementById(videoId);if(!vid||!url)return;
    const start=()=>{
      const HlsLib=window['Hls'];
      if(HlsLib&&HlsLib.isSupported()){
        const hls=new HlsLib({maxBufferLength:8,autoStartLoad:true});
        hls.loadSource(url);hls.attachMedia(vid);
        hls.on(HlsLib.Events.MANIFEST_PARSED,()=>vid.play().catch(()=>{}));
        vid._hls=hls;
      } else if(vid.canPlayType('application/vnd.apple.mpegurl')){
        vid.src=url;vid.play().catch(()=>{});
      }
    };
    if(!document.getElementById('hls-js-cdn')){
      const sc=document.createElement('script');sc.id='hls-js-cdn';sc.src='https://cdn.jsdelivr.net/npm/hls.js@latest';sc.onload=start;document.head.appendChild(sc);
    } else { start(); }
  }
  _livesCard(sv,i,modo='capa',estilo=1){
    const tc=sv.inicio?this._tempoDecorrido(sv.inicio):'';
    const ca=sv.capa||'', fo=sv.foto||'';

    // Área de mídia: vídeo inline (modo vídeo) ou capa clicável (modo capa)
    const mediaHtml = modo==='video' && sv.stream_url
      ? `<div class="lc-capa lc-capa-video"><video id="lv-vid-${i}" class="lvc-video" autoplay muted playsinline></video><div class="lc-capa-overlay"><div class="lc-studio">Studio: ${sv.living_id||'—'}</div></div>${tc?`<div class="lc-tempo">${tc}</div>`:''}</div>`
      : `<div class="lc-capa" onclick="window._dmPlayLive('${(sv.stream_url||'').replace(/'/g,'')}','${(sv.nome||'').replace(/'/g,'')}','${ca.replace(/'/g,'')}')">${ca?`<img src="${ca}" class="lc-capa-img" onerror="this.style.display='none'"/>`:''}<div class="lc-capa-overlay">${sv.stream_url?`<div class="lc-play">${this._ico('live',20)}</div>`:''}<div class="lc-studio">Studio: ${sv.living_id||'—'}</div></div>${tc?`<div class="lc-tempo">${tc}</div>`:''}</div>`;

    const cardClass=`live-card-full${estilo===2?' lc-estilo2':' lc-horizontal'}`;
    return`<div class="${cardClass}">${mediaHtml}<div class="lc-info">
      <div class="lc-streamer"><div class="lc-foto-wrap">${fo?`<img src="${fo}" class="lc-foto" onerror="this.style.display='none';this.nextSibling.style.display='flex'">`:''}<div class="av-fb lc-foto-fb" style="${fo?'display:none':''}">${this._ini(sv.nome)}</div></div><div style="min-width:0;flex:1"><div class="lc-nome">${sv.nome||'—'}</div><div class="lc-id">ID:${sv.kwai_id||'—'}</div></div></div>
      <div class="lc-stats"><div class="lc-stat-row">${this._ico('users',12)}<span class="lc-stat-lbl">Seguidores</span><strong>${Number(sv.fans||0).toLocaleString('pt-BR')}</strong></div><div class="lc-stat-row">${this._ico('heart',12)}<span class="lc-stat-lbl">Curtidas</span><strong>${Number(sv.likes||0).toLocaleString('pt-BR')}</strong></div><div class="lc-stat-row">${this._ico('gift',12)}<span class="lc-stat-lbl">Presentes</span><strong style="color:var(--gold)">${sv.gifts||0}</strong></div></div>
      <div class="lc-footer"><div class="lc-espects"><div style="font-size:11px;color:var(--t3);font-family:'Exo 2',sans-serif">Espectadores</div><div style="font-size:24px;font-family:'Rajdhani',sans-serif;font-weight:700">${sv.espectadores||0}</div></div><div class="lc-acoes">${sv.stream_url?`<button class="btn btn-g btn-sm" onclick="window._dmPlayLive('${(sv.stream_url||'').replace(/'/g,'')}','${(sv.nome||'').replace(/'/g,'')}','${ca.replace(/'/g,'')}')">${this._ico('live',12)} Assistir</button>`:''}${sv.jump_url?`<a href="${sv.jump_url}" target="_blank" class="btn btn-o btn-sm" style="text-decoration:none">${this._ico('live',11)} Kwai</a>`:''}</div></div>
    </div></div>`;
  }
  _tempoDecorrido(s){const d=Date.now()-s,h=Math.floor(d/3600000),m=Math.floor((d%3600000)/60000);return h>0?`${h}h ${m}m`:m>0?`${m}m`:'<1m';}
  _injetarPlayerHLS(){
    const s=this.shadowRoot;if(s.getElementById('lv-player-modal'))return;
    const modal=document.createElement('div');modal.id='lv-player-modal';modal.style.cssText='position:fixed;inset:0;background:rgba(4,4,4,.95);z-index:9001;display:none;flex-direction:column;align-items:center;justify-content:center;gap:16px;padding:20px';
    modal.innerHTML=`<div style="width:100%;max-width:800px"><div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px"><div id="lv-player-nome" style="font-family:'Rajdhani',sans-serif;font-size:18px;font-weight:700;color:#fff"></div><button id="lv-player-close" style="background:rgba(248,113,113,.15);border:1px solid rgba(248,113,113,.4);border-radius:6px;color:#f87171;padding:6px 14px;cursor:pointer;font-size:12px">Fechar</button></div><div style="position:relative;padding-bottom:56.25%;background:#000;border-radius:10px;overflow:hidden"><video id="lv-player-video" style="position:absolute;inset:0;width:100%;height:100%" controls autoplay muted playsinline></video><img id="lv-player-capa" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:none"/></div><div id="lv-player-status" style="text-align:center;color:#a0b8c8;font-size:11px;margin-top:8px">Carregando stream...</div></div>`;
    s.getElementById('root').appendChild(modal);
    s.getElementById('lv-player-close').addEventListener('click',()=>{modal.style.display='none';const vid=s.getElementById('lv-player-video');vid.pause();vid.src='';if(window._hlsInstance){window._hlsInstance.destroy();window._hlsInstance=null;}});
    window._dmPlayLive=(url,nome,capa)=>{modal.style.display='flex';try{this.scrollIntoView({behavior:'instant',block:'start'});}catch{}s.getElementById('lv-player-nome').textContent=nome||'Live';const vid=s.getElementById('lv-player-video');const capaEl=s.getElementById('lv-player-capa');const status=s.getElementById('lv-player-status');if(capa){capaEl.src=capa;capaEl.style.display='block';}if(window._hlsInstance){window._hlsInstance.destroy();window._hlsInstance=null;}const iniciarHLS=()=>{const HlsLib=window['Hls'];if(HlsLib&&HlsLib.isSupported()){window._hlsInstance=new HlsLib({maxBufferLength:10});window._hlsInstance.loadSource(url);window._hlsInstance.attachMedia(vid);window._hlsInstance.on(HlsLib.Events.MANIFEST_PARSED,()=>{capaEl.style.display='none';vid.play().catch(()=>{});status.textContent='Reproduzindo ao vivo';});window._hlsInstance.on(HlsLib.Events.ERROR,(_,d)=>{if(d.fatal)status.textContent='Erro no stream.';});}else if(vid.canPlayType('application/vnd.apple.mpegurl')){vid.src=url;vid.play().catch(()=>{});capaEl.style.display='none';status.textContent='Reproduzindo';}else{status.textContent='HLS não suportado.'}};const hlsScript=document.getElementById('hls-js-cdn');if(!hlsScript){const s2=document.createElement('script');s2.id='hls-js-cdn';s2.src='https://cdn.jsdelivr.net/npm/hls.js@latest';s2.onload=iniciarHLS;document.head.appendChild(s2);}else{iniciarHLS();}};
  }

  async _carregarRanking(){
    const s=this.shadowRoot;
    const el=s.getElementById('tbRank');
    el.innerHTML=this._loading();
    const [d,prem]=await Promise.all([this._api('GET','/admin/ranking'),this._api('GET','/admin/premios/config?tipo=diamantes')]);
    if(!d?.ok||!d.streamers?.length){el.innerHTML=this._empty('trophy','Nenhum dado');return;}
    const POR_PAG=25;
    const lista=d.streamers.map((sv,i)=>({...sv,posicao:i+1}));
    const totalPags=Math.max(1,Math.ceil(lista.length/POR_PAG));
    this._pg.rank=Math.min(Math.max(this._pg.rank||1,1),totalPags);
    const pagina=lista.slice((this._pg.rank-1)*POR_PAG,this._pg.rank*POR_PAG);
    const premios=prem?.premios||[];
    const medalCor=pos=>pos===1?'var(--gold)':pos===2?'#94a3b8':pos===3?'#a86c31':'var(--t3)';
    const pager=`<div class="pag-bar rank-local-pg"><button ${this._pg.rank<=1?'disabled':''} data-pg="prev">Anterior</button><span class="pn">Pag ${this._pg.rank} / ${totalPags}</span><button ${this._pg.rank>=totalPags?'disabled':''} data-pg="next">Proxima</button></div>`;
    const tabelaHtml=`<div class="rank-table-wrap"><table><thead><tr><th>#</th><th>Perfil</th><th>Nome</th><th>${this._ico('diamond',12)} Diamantes</th><th>Dolar</th><th>Horas</th><th>Dias</th><th>Premio</th></tr></thead><tbody>${pagina.map(sv=>{const pos=sv.posicao,cor=medalCor(pos),pv=premios[pos-1];return`<tr><td style="color:${cor};font-family:'Rajdhani',sans-serif;font-weight:700;font-size:16px">${pos}</td><td>${this._avatar(this._proxyFoto(sv.foto||''),sv.nome||'')}</td><td><div style="font-family:'Rajdhani',sans-serif;font-weight:700;font-size:13px;color:var(--t1)">${sv.nome||'-'}</div><div style="font-size:10px;color:var(--cyan)">${sv.kwai_uid||sv.kwai_id||'-'}</div></td><td style="color:var(--cyan);font-family:'Rajdhani',sans-serif;font-weight:700">${this._num(this._diam(sv))}</td><td style="color:var(--verde);font-size:11px">${sv.dolar?'$'+Number(sv.dolar).toFixed(2):'-'}</td><td style="color:var(--t2)">${sv.horas||'-'}</td><td style="color:${sv.dias_validos>=20?'var(--verde)':'var(--verm)'};font-family:'Rajdhani',sans-serif;font-weight:700;font-size:12px">${sv.dias_validos||'-'}</td><td>${pv?.valor_premio?`<span class="prize-tag">${this._brl(pv.valor_premio)}</span>`:''}</td></tr>`;}).join('')}</tbody></table></div>`;
    const mobileHtml=`<div class="rank-mobile-only">${pagina.map(sv=>{const pos=sv.posicao,cor=medalCor(pos),pv=premios[pos-1];return`<div class="rk-item"><div class="rk-preview"><span class="rk-pos" style="color:${cor}">${pos}</span><div class="rk-av">${this._avatar(this._proxyFoto(sv.foto||''),sv.nome||'')}</div><div class="rk-info"><div class="rk-nome">${sv.nome||'-'}</div><div class="rk-uid">${sv.kwai_uid||sv.kwai_id||'-'}</div><div class="rk-diam">${this._ico('diamond',11)} ${this._num(this._diam(sv))}</div></div><div class="rk-right"><div class="rk-val" style="color:${sv.dias_validos>=20?'var(--verde)':'var(--verm)'}">${sv.dias_validos||'-'}/20 dias</div><div class="rk-val">${sv.horas||'-'}</div>${pv?.valor_premio?`<span class="prize-tag" style="font-size:9px">${this._brl(pv.valor_premio)}</span>`:''}</div></div></div>`;}).join('')}</div>`;
    const root=s.getElementById('root');
    const isMobile=root?.classList.contains('narrow')||window.matchMedia('(max-width:700px)').matches;
    el.innerHTML=(isMobile?mobileHtml:tabelaHtml)+pager;
    el.querySelector('[data-pg="prev"]')?.addEventListener('click',()=>{this._pg.rank--;this._carregarRanking();});
    el.querySelector('[data-pg="next"]')?.addEventListener('click',()=>{this._pg.rank++;this._carregarRanking();});
  }
  async _carregarDiario(){
    const s=this.shadowRoot;
    const el=s.getElementById('tbDiario');
    el.innerHTML=this._loading();
    const d=await this._api('GET',`/admin/ranking/diario?data=${this._dataHojeBR()}`);
    if(!d?.ok){el.innerHTML=this._empty('warning',d?.erro||'Erro');return;}
    const dadosDiario=this._listaDiario(d);
    if(!dadosDiario.length){el.innerHTML=this._empty('chart',d.aviso||d.mensagem||'Sem registros');return;}
    const POR_PAG=25;
    const lista=dadosDiario.map((sv,i)=>({...sv,posicao:i+1}));
    const totalPags=Math.max(1,Math.ceil(lista.length/POR_PAG));
    this._pg.diario=Math.min(Math.max(this._pg.diario||1,1),totalPags);
    const pagina=lista.slice((this._pg.diario-1)*POR_PAG,this._pg.diario*POR_PAG);
    const pager=`<div class="pag-bar diario-local-pg"><button ${this._pg.diario<=1?'disabled':''} data-pg="prev">Anterior</button><span class="pn">Pag ${this._pg.diario} / ${totalPags}</span><button ${this._pg.diario>=totalPags?'disabled':''} data-pg="next">Proxima</button></div>`;
    const tabelaHtml=`<div class="rank-table-wrap"><table><thead><tr><th>#</th><th>Perfil</th><th>Nome</th><th>${this._ico('diamond',12)} Diamantes</th><th>Horas</th></tr></thead><tbody>${pagina.map(sv=>`<tr><td style="color:var(--t3);font-family:'Rajdhani',sans-serif;font-weight:700">${sv.posicao}</td><td>${this._avatar(this._proxyFoto(sv.foto||sv.foto_url||''),sv.nome||'')}</td><td><div style="font-family:'Rajdhani',sans-serif;font-weight:700;color:var(--t1)">${sv.nome||'-'}</div><div style="font-size:10px;color:var(--cyan)">${sv.kwai_uid||sv.kwai_id||'-'}</div></td><td style="color:var(--azul);font-family:'Rajdhani',sans-serif;font-weight:700">${this._num(this._diam(sv))}</td><td style="color:var(--t2)">${sv.horas||'-'}</td></tr>`).join('')}</tbody></table></div>`;
    const mobileHtml=`<div class="rank-mobile-only">${pagina.map(sv=>`<div class="rk-item"><div class="rk-preview"><span class="rk-pos">${sv.posicao}</span><div class="rk-av">${this._avatar(this._proxyFoto(sv.foto||sv.foto_url||''),sv.nome||'')}</div><div class="rk-info"><div class="rk-nome">${sv.nome||'-'}</div><div class="rk-uid">${sv.kwai_uid||sv.kwai_id||'-'}</div><div class="rk-diam">${this._ico('diamond',11)} ${this._num(this._diam(sv))}</div></div><div class="rk-right"><div class="rk-val">${sv.horas||'-'}</div></div></div></div>`).join('')}</div>`;
    const root=s.getElementById('root');
    const isMobile=root?.classList.contains('narrow')||window.matchMedia('(max-width:700px)').matches;
    el.innerHTML=(isMobile?mobileHtml:tabelaHtml)+pager;
    el.querySelector('[data-pg="prev"]')?.addEventListener('click',()=>{this._pg.diario--;this._carregarDiario();});
    el.querySelector('[data-pg="next"]')?.addEventListener('click',()=>{this._pg.diario++;this._carregarDiario();});
  }
  async _carregarDesempenho(){
    const s=this.shadowRoot;s.getElementById('resumoDesemp').innerHTML=this._loading('grid-column:1/-1');s.getElementById('tbDesemp').innerHTML='';
    const d=await this._api('GET','/admin/desempenho');if(!d?.ok){s.getElementById('resumoDesemp').innerHTML=this._empty('warning','Erro');return;}
    const r=d.resumo;
    s.getElementById('resumoDesemp').innerHTML=`
      <div class="dc2 dc2-verde"><div class="dc2-ico">${this._ico('star',26)}</div><div class="dc2-val">${r.aprovado}</div><div class="dc2-lbl">Aprovados</div></div>
      <div class="dc2 dc2-cyan"><div class="dc2-ico">${this._ico('check',26)}</div><div class="dc2-val">${r.bom}</div><div class="dc2-lbl">No Caminho</div></div>
      <div class="dc2 dc2-verm"><div class="dc2-ico">${this._ico('warning',26)}</div><div class="dc2-val">${r.atencao}</div><div class="dc2-lbl">Atenção</div></div>
      <div class="dc2 dc2-indigo"><div class="dc2-ico">${this._ico('users',26)}</div><div class="dc2-val">${r.total}</div><div class="dc2-lbl">Avaliados</div></div>`;
    s.getElementById('tbDesemp').innerHTML=`<div class="bhead" style="margin-bottom:0;border-bottom:none"><div class="btitulo">${this._ico('trend',14)} Progresso (${d.mes_atual})</div><div class="bacoes"><select id="filtroDesemp" style="background:rgba(0,0,0,.5);border:1px solid var(--brd);border-radius:6px;color:var(--t1);padding:5px 9px;font-family:'Exo 2',sans-serif;font-size:12px;outline:none"><option value="">Todos</option><option value="aprovado">Aprovados</option><option value="bom">No Caminho</option><option value="atencao">Atenção</option></select></div></div><div id="listaDesemp"></div><div class="pag-bar" id="pgDesemp"></div>`;
    const render=(filtro='')=>{
      const POR_PAG=10;let lista=(d.streamers||[]);if(filtro)lista=lista.filter(sv=>sv.status===filtro);
      const total=lista.length,inicio=(this._pg.desemp-1)*POR_PAG,pagina=lista.slice(inicio,inicio+POR_PAG);
      const el=s.getElementById('listaDesemp');if(!pagina.length){el.innerHTML=this._empty('search','Nenhum');return;}
      el.innerHTML=pagina.map(sv=>`<div class="dc-card ${sv.status}"><div class="dc-topo"><div class="dc-pos">${sv.posicao}</div><div>${this._avatar(sv.foto,sv.nome)}</div><div class="dc-info"><div class="dc-nome">${sv.nome||'—'}</div><div class="dc-id">${sv.kwai_id||sv.kwai_uid||'—'}</div></div><div>${this._statusBadgeDesemp(sv.status)}</div></div><div class="dc-meta-group"><div class="dc-meta"><div class="dc-meta-row"><span class="dc-meta-lbl">${this._ico('calendar',11)} Dias</span><span class="dc-meta-val ${sv.dias_validos>=20?'ok':''}">${sv.dias_validos}/20</span></div><div class="dc-bar-bg"><div class="dc-bar" style="width:${sv.prog_dias}%;background:${sv.dias_validos>=20?'var(--verde)':'var(--verm)'}"></div></div></div><div class="dc-meta"><div class="dc-meta-row"><span class="dc-meta-lbl">${this._ico('live',11)} Horas</span><span class="dc-meta-val ${sv.horas_num>=40?'ok':''}">${sv.horas_str}/40h</span></div><div class="dc-bar-bg"><div class="dc-bar" style="width:${sv.prog_horas}%;background:${sv.horas_num>=40?'var(--verde)':'var(--verm)'}"></div></div></div><div class="dc-meta"><div class="dc-meta-row"><span class="dc-meta-lbl">${this._ico('chart',11)} Diamantes</span><span class="dc-meta-val" style="color:var(--azul)">${this._num(sv.diamantes)}</span></div><div class="dc-bar-bg"><div class="dc-bar" style="width:100%;background:var(--azul)"></div></div></div></div></div>`).join('');
      const totalPags=Math.ceil(total/POR_PAG);const pgEl=s.getElementById('pgDesemp');
      if(pgEl){pgEl.innerHTML=total>POR_PAG?`<button ${this._pg.desemp<=1?'disabled':''}>Anterior</button><span class="pn">Pág ${this._pg.desemp} / ${totalPags}</span><button ${this._pg.desemp>=totalPags?'disabled':''}>Próxima</button>`:`<span class="pn" style="color:var(--t3);font-size:11px">${total} streamers</span>`;if(total>POR_PAG){pgEl.children[0].addEventListener('click',()=>{this._pg.desemp--;render(s.getElementById('filtroDesemp')?.value||'');});pgEl.children[2].addEventListener('click',()=>{this._pg.desemp++;render(s.getElementById('filtroDesemp')?.value||'');});}}
    };
    render();s.getElementById('filtroDesemp').addEventListener('change',e=>{this._pg.desemp=1;render(e.target.value);});
  }
  _statusBadgeDesemp(status){const m={aprovado:`<span class="sbadge excelente">${this._ico('star',10)} Aprovado</span>`,bom:`<span class="sbadge bom">${this._ico('check',10)} No Caminho</span>`,atencao:`<span class="sbadge critico">${this._ico('warning',10)} Atenção</span>`};return m[status]||m.atencao;}
  async _carregarHistorico(forcar=false){
    const s=this.shadowRoot;const CACHE_KEY='dm_historico_cache';const CACHE_TTL=30*60*1000;
    if(!forcar){try{const cached=localStorage.getItem(CACHE_KEY);if(cached){const {ts,data}=JSON.parse(cached);if(Date.now()-ts<CACHE_TTL){this._renderHistorico(data);return;}}}catch(e){}}
    s.getElementById('tbHistorico').innerHTML=this._loading();const d=await this._api('GET','/admin/historico');
    if(d?.ok){try{localStorage.setItem(CACHE_KEY,JSON.stringify({ts:Date.now(),data:d}));}catch(e){}}
    if(!d?.ok||!d.historico?.length){s.getElementById('tbHistorico').innerHTML=this._empty('history','Sem dados');return;}
    this._renderHistorico(d);
  }
  _renderHistorico(d){
    const s=this.shadowRoot;const el=s.getElementById('tbHistorico');if(!el)return;
    const meses=d.historico;const pgHist={};
    el.innerHTML=`<div class="month-tabs" id="monthTabs">${meses.map((m,i)=>`<button class="month-tab ${i===0?'on':''}" data-idx="${i}">${m.mes}</button>`).join('')}</div><div id="monthContent"></div>`;
    const renderMes=(idx)=>{
      const m=meses[idx];if(!pgHist[idx])pgHist[idx]=1;
      s.querySelectorAll('.month-tab').forEach(t=>t.classList.toggle('on',parseInt(t.dataset.idx)===idx));
      const c=s.getElementById('monthContent');if(!m.rows?.length){c.innerHTML=this._empty('history','Sem dados');return;}
      const POR_PAG=30,total=m.rows.length,inicio=(pgHist[idx]-1)*POR_PAG,pagina=m.rows.slice(inicio,inicio+POR_PAG),totalPags=Math.ceil(total/POR_PAG);
      // Desktop: tabela — Mobile: accordion
      const tabelaHtml=`<div class="hist-table-wrap"><table><thead><tr><th>#</th><th>Perfil</th><th>Nome</th><th>Diamantes</th><th>Var.💎</th><th>Horas</th><th>Var.⏱</th></tr></thead><tbody>${pagina.map(sv=>`<tr><td style="color:var(--t3);font-family:'Rajdhani',sans-serif;font-weight:700">${sv.posicao}</td><td>${this._avatar(this._proxyFoto(sv.foto||''),sv.nome||'')}</td><td style="font-family:'Rajdhani',sans-serif;font-weight:700;color:var(--t1)">${sv.nome||'—'}</td><td style="color:var(--azul);font-family:'Rajdhani',sans-serif;font-weight:700">${this._num(sv.diamantes||0)}</td><td>${this._varBadge(sv.variacao)}</td><td style="color:var(--t2)">${sv.horas||'—'}</td><td>${this._varBadge(sv.var_horas)}</td></tr>`).join('')}</tbody></table></div>`;
      const accordionHtml=`<div class="hist-lista hist-mobile-only">${pagina.map(sv=>`<div class="hist-item"><div class="hist-preview" onclick="this.closest('.hist-item').classList.toggle('open')"><span class="hist-pos">${sv.posicao}</span><div class="hist-av">${this._avatar(this._proxyFoto(sv.foto||''),sv.nome||'')}</div><div class="hist-info"><div class="hist-nome">${sv.nome||'—'}</div><div class="hist-diam">${this._ico('diamond',10)} ${this._num(sv.diamantes||0)}</div></div><div class="hist-right">${this._varBadge(sv.variacao)}</div><span class="hist-chevron">${this._ico('down',11)}</span></div><div class="hist-body"><div class="hist-body-grid"><div class="hist-cel"><div class="hist-lbl">Diamantes</div><div class="hist-val" style="color:var(--azul)">${this._num(sv.diamantes||0)}</div></div><div class="hist-cel"><div class="hist-lbl">Var.</div><div class="hist-val">${this._varBadge(sv.variacao)}</div></div><div class="hist-cel"><div class="hist-lbl">Horas</div><div class="hist-val">${sv.horas||'—'}</div></div><div class="hist-cel"><div class="hist-lbl">Var. Horas</div><div class="hist-val">${this._varBadge(sv.var_horas)}</div></div></div></div></div>`).join('')}</div>`;
      c.innerHTML=tabelaHtml+accordionHtml+`${total>POR_PAG?`<div class="pag-bar"><button id="hPrev" ${pgHist[idx]<=1?'disabled':''}>Anterior</button><span class="pn">Pág ${pgHist[idx]} / ${totalPags}</span><button id="hNext" ${pgHist[idx]>=totalPags?'disabled':''}>Próxima</button></div>`:''}`;
      if(total>POR_PAG){s.getElementById('hPrev')?.addEventListener('click',()=>{pgHist[idx]--;renderMes(idx);});s.getElementById('hNext')?.addEventListener('click',()=>{pgHist[idx]++;renderMes(idx);});}
    };
    renderMes(0);s.getElementById('monthTabs').addEventListener('click',e=>{const btn=e.target.closest('.month-tab');if(btn)renderMes(parseInt(btn.dataset.idx));});
  }

  async _carregarStreamers(){
    const s=this.shadowRoot;s.getElementById('tbS').innerHTML=this._loading();
    const busca=s.getElementById('bS')?.value||'';
    const d=await this._api('GET',`/admin/streamers?pagina=${this._pg.s}&busca=${encodeURIComponent(busca)}`);
    const el=s.getElementById('tbS');const lista=d?.perfis||d?.streamers||[];
    if(!d?.ok||!lista.length){el.innerHTML=this._empty('users','Nenhum cadastrado');this._renderPg('pgS',this._pg.s,0,20,n=>{this._pg.s=n;this._carregarStreamers();});return;}
    el.innerHTML=`<div id="listaUsers"></div>`;
    const lu=s.getElementById('listaUsers');
    lu.innerHTML=lista.map(sv=>{
      const foto=this._proxyFoto(sv.foto||sv.foto_url||'');const uid=sv.kwai_uid||'—';const nome=sv.nome||sv.nome_social||'—';
      return`<div class="rec-item"><div class="rec-preview" onclick="this.closest('.rec-item').classList.toggle('open')"><div>${this._avatar(foto,nome,'av')}</div><div style="flex:1;min-width:0"><div style="font-family:'Rajdhani',sans-serif;font-size:14px;font-weight:700;color:var(--t1)">${nome}</div><div style="font-size:10px;color:var(--cyan)">${uid}</div></div><div style="display:flex;gap:6px;align-items:center"><span style="font-size:10px;color:var(--t3)">${sv.whatsapp||'—'}</span><span class="rec-chevron">${this._ico('down',12)}</span></div></div><div class="rec-body"><div class="rec-campos">${[['UID',uid],['Email',sv.email||'—'],['WhatsApp',sv.whatsapp||'—'],['Endereço',sv.endereco||'—'],['PIX Tipo',sv.pix_tipo||'—'],['PIX Chave',sv.pix_chave||'—'],['Cadastro',this._fdt(sv.cadastrado||sv.criado_em)]].map(([lbl,val])=>`<div class="rec-campo"><div class="rec-campo-lbl">${lbl}</div><div class="rec-campo-val">${val}</div><button class="rec-copy-btn" data-copy="${val}" title="Copiar">${this._ico('clipboard',11)}</button></div>`).join('')}</div><div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap"><button class="btn btn-o btn-sm" onclick="this.closest('.rec-item').classList.remove('open')">${this._ico('check',12)} Fechar</button></div></div></div>`;
    }).join('');
    this._renderPg('pgS',this._pg.s,lista.length,20,n=>{this._pg.s=n;this._carregarStreamers();});
  }
  async _carregarMetricas(){
    const s=this.shadowRoot;s.getElementById('gMet').innerHTML=this._loading('grid-column:1/-1');
    const d=await this._api('GET','/admin/metricas');const el=s.getElementById('gMet');if(!d?.ok){el.innerHTML=this._empty('warning','Erro');return;}
    const c=d.campanhas;
    el.innerHTML=`
      <div class="dc2 dc2-verde"><div class="dc2-ico">${this._ico('bolt',26)}</div><div class="dc2-val">${c.sucesso_semana}</div><div class="dc2-lbl">Boosts Semana</div></div>
      <div class="dc2 dc2-cyan"><div class="dc2-ico">${this._ico('metrics',26)}</div><div class="dc2-val">${c.sucesso_total}</div><div class="dc2-lbl">Total Sucesso</div></div>
      <div class="dc2 dc2-gold"><div class="dc2-ico">${this._ico('clock_r',26)}</div><div class="dc2-val">${c.pendente}</div><div class="dc2-lbl">Pendentes</div></div>
      <div class="dc2 dc2-verm"><div class="dc2-ico">${this._ico('warning',26)}</div><div class="dc2-val">${c.com_erro}</div><div class="dc2-lbl">Com Erro</div></div>`;
    const ultimos=d.ultimos||[];if(ultimos.length)el.insertAdjacentHTML('afterend',`<div class="box" style="margin-top:16px"><div class="bhead"><div class="btitulo">${this._ico('bolt',14)} Últimos Impulsionamentos</div></div><table><thead><tr><th>Link</th><th>Tempo</th><th>Status</th><th>Data</th></tr></thead><tbody>${ultimos.map(u=>`<tr><td style="font-size:11px;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${u.kwai_link||'—'}</td><td>${u.tempo_escolhido||'—'}</td><td><span class="badge ${u.status==='success'?'on':u.status==='error'?'off':''}">${u.status}</span></td><td>${this._fdt(u.created_at)}</td></tr>`).join('')}</tbody></table></div>`);
  }
  async _carregarRecrutamento(){
    const s=this.shadowRoot;s.getElementById('tbRec').innerHTML=this._loading();
    const busca=s.getElementById('bRec')?.value||'';
    const d=await this._api('GET',`/admin/planilha?tipo=recrutamento&busca=${encodeURIComponent(busca)}`);
    const el=s.getElementById('tbRec');if(!d?.ok){el.innerHTML=this._empty('clipboard',d?.erro||'Configure RECRUTAMENTO_URL');return;}
    const candidatos=d.candidatos||[],headers=d.headers||[];const nbRec=s.getElementById('nbRec');if(nbRec&&d.total>0){nbRec.textContent=d.total;nbRec.style.display='';}if(!candidatos.length){el.innerHTML=this._empty('clipboard','Nenhum candidato');return;}
    el.innerHTML=`<div style="padding:10px 16px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;border-bottom:1px solid var(--brddim)"><span style="color:var(--t3);font-size:11px">${this._ico('users',12)} <strong style="color:var(--cyan)">${d.total}</strong> candidatos</span><div class="busca">${this._ico('search',12)}<input id="bRec" type="text" placeholder="Buscar..." value="${busca}" style="width:160px"/></div></div><div id="listaRec"></div>`;
    const lista=s.getElementById('listaRec');
    lista.innerHTML=candidatos.map((c,i)=>{
      const cols=headers.slice(0,4);const preview=cols.map(h=>`<span style="color:var(--t2);font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:200px">${c[h]||'—'}</span>`).join('<span style="color:var(--brddim);margin:0 6px">|</span>');
      return`<div class="rec-item" data-idx="${i}"><div class="rec-preview" onclick="this.closest('.rec-item').classList.toggle('open')"><span style="color:var(--t3);font-family:'Rajdhani',sans-serif;font-size:13px;width:28px;flex-shrink:0">${d.total-i}</span><div style="flex:1;display:flex;gap:12px;align-items:center;min-width:0;flex-wrap:wrap">${preview}</div><span class="rec-chevron">${this._ico('down',12)}</span></div><div class="rec-body"><div class="rec-campos">${headers.map(h=>`<div class="rec-campo"><div class="rec-campo-lbl">${h}</div><div class="rec-campo-val">${c[h]||'—'}</div><button class="rec-copy-btn" data-copy="${(c[h]||'').replace(/"/g,'')}" title="Copiar">${this._ico('clipboard',11)}</button></div>`).join('')}</div></div></div>`;
    }).join('');
    const inp=s.getElementById('bRec');if(inp)inp.addEventListener('input',this._dbc(()=>this._carregarRecrutamento(),400));
  }
  async _carregarLogs(){
    const s=this.shadowRoot;s.getElementById('tbL').innerHTML=this._loading();const busca=s.getElementById('bL')?.value||'';
    const d=await this._api('GET',`/admin/logs?pagina=${this._pg.l}&tipo=${encodeURIComponent(busca)}`);
    const el=s.getElementById('tbL');if(!d?.ok||!d.logs?.length){el.innerHTML=this._empty('search','Nenhum log');return;}
    const cls=t=>{t=(t||'').toLowerCase();if(t.includes('login'))return'login';if(t.includes('uid')||t.includes('autoriza'))return'edit';if(t.includes('remov')||t.includes('erro')||t.includes('rejeit'))return'del';if(t.includes('carteira')||t.includes('saque')||t.includes('premio'))return'cfg';return'edit';};
    el.innerHTML=d.logs.map(l=>`<div class="log"><span class="log-tag ${cls(l.tipo)}">${l.tipo||'—'}</span><div class="log-info">${l.mensagem||''}</div><div class="log-hora">${this._fdt(l.criado_em)}</div></div>`).join('');
    this._renderPg('pgL',this._pg.l,d.logs.length,50,n=>{this._pg.l=n;this._carregarLogs();});
  }
  async _carregarConfig(){
    const s=this.shadowRoot;s.getElementById('tbC').innerHTML=this._loading();const d=await this._api('GET','/admin/config');const el=s.getElementById('tbC');
    if(!d?.ok||!d.config?.length){el.innerHTML=this._empty('settings','Sem configurações');return;}
    const labels={taxa_saque_mp:{label:'Taxa fixa por saque (R$)',hint:'Deixe 0.00 se usar app manual.'},taxa_saque_perc:{label:'Taxa percentual (%)',hint:'Ex: 0.99 = 0,99%.'},aviso_financeiro:{label:'Aviso no painel',hint:'Texto na aba Carteira.'},asaas_api_key:{label:'Asaas — API Key',hint:'Habilita PIX automático (30 grátis/mês).'},asaas_transfers_count:{label:'Asaas — Usados este mês',hint:'Automático.',readonly:true},asaas_transfers_mes:{label:'Asaas — Mês referência',hint:'Automático.',readonly:true}};
    el.innerHTML=`<div style="padding:12px 14px;background:rgba(59,130,246,.06);border-bottom:1px solid var(--brddim);font-size:11px;color:var(--t3)">${this._ico('settings',12)} Configurações financeiras.</div>${d.config.map(c=>{const lbl=labels[c.chave];const isRO=lbl?.readonly;const t=(c.chave.includes('key')||c.chave.includes('api'))?'password':'text';return`<div class="cfg-row"><div style="flex:1;min-width:140px"><div class="cfg-chave">${lbl?.label||c.chave}</div>${lbl?.hint?`<div style="font-size:9px;color:var(--t3);margin-top:2px;line-height:1.4">${lbl.hint}</div>`:''}</div>${isRO?`<div style="padding:7px 12px;background:rgba(0,0,0,.3);border:1px solid var(--brddim);border-radius:6px;font-size:11px;color:var(--t2);min-width:80px">${c.valor||'—'}</div>`:`<input class="cfg-inp" id="cfg_${c.chave}" type="${t}" value="${c.valor||''}"/>`}${isRO?'':`<button class="btn btn-o btn-sm" id="cfgSave_${c.chave}">${this._ico('check',12)} Salvar</button>`}</div>`;}).join('')}`;
    d.config.filter(c=>!labels[c.chave]?.readonly).forEach(c=>{s.getElementById(`cfgSave_${c.chave}`)?.addEventListener('click',async()=>{const val=s.getElementById(`cfg_${c.chave}`)?.value;const r=await this._api('POST','/admin/config',{chave:c.chave,valor:val});if(r?.ok){this._toast('Salvo!');if(c.chave==='taxa_saque_mp')this._taxaSaque=parseFloat(val)||0;if(c.chave==='taxa_saque_perc')this._taxaPerc=parseFloat(val)||0;}else this._toast(r?.erro||'Erro','err');});});
  }

  // ══════════════════════════ SEÇÕES v2 ══════════════════════════════════════

  async _carregarUids(){
    const s=this.shadowRoot;const container=s.getElementById('listaUids');if(container)container.innerHTML=this._loading();
    const filtro=s.getElementById('uidFiltro')?.value||'';
    const d=await this._api('GET',`/admin/uids?pagina=${this._pg.uid}&status=${filtro}`);
    if(!d?.ok){if(container)container.innerHTML=this._empty('warning','Erro');return;}
    const lista=d.uids||[];if(!lista.length){if(container)container.innerHTML=this._empty('key_uid','Nenhum UID autorizado');return;}
    if(container)container.innerHTML=lista.map(u=>{const sT=!u.ativo?'Revogado':u.utilizado?'Conta Criada':'Aguardando';const sC=!u.ativo?'off':u.utilizado?'on neutro':'on';return`<div class="uid-row"><div class="uid-row-main"><div class="uid-kwai">${this._ico('key_uid',14)} ${u.kwai_uid}</div>${u.nome_ref?`<div class="uid-nome-ref">${u.nome_ref}</div>`:''}<span class="badge ${sC}">${sT}</span></div><div class="uid-row-meta"><span>${this._ico('users',11)} por <strong>${u.autorizado_por||'admin'}</strong></span><span>${this._ico('calendar',11)} ${this._fdtCurto(u.autorizado_em)}</span>${u.utilizado_em?`<span>${this._ico('check_c',11)} usado ${this._fdtCurto(u.utilizado_em)}</span>`:''}</div>${u.ativo&&!u.utilizado?`<button class="btn btn-o btn-sm btn-d uid-revogar" data-uid="${u.kwai_uid}">${this._ico('x_circle',11)} Revogar</button>`:''}${!u.ativo?`<button class="btn btn-o btn-sm uid-reativar" data-uid="${u.kwai_uid}" style="border-color:rgba(74,222,128,.4);color:var(--verde)">${this._ico('check_c',11)} Reativar</button>`:''}</div>`;}).join('');
    this._renderPg('pgUID',this._pg.uid,lista.length,30,n=>{this._pg.uid=n;this._carregarUids();});
    if(container){container.querySelectorAll('.uid-revogar').forEach(btn=>{btn.addEventListener('click',()=>this._revogarUid(btn.dataset.uid,false));});container.querySelectorAll('.uid-reativar').forEach(btn=>{btn.addEventListener('click',()=>this._revogarUid(btn.dataset.uid,true));});}
  }
  _abrirModalUID(){
    const s=this.shadowRoot;this._uidLookup=null;s.getElementById('uidInputVal').value='';s.getElementById('uidLookupResult').innerHTML='';s.getElementById('uidLookupResult').style.display='none';s.getElementById('btnConfirmarUID').style.display='none';s.getElementById('btnBuscarUID').textContent='Buscar';s.getElementById('btnBuscarUID').disabled=false;s.getElementById('uidNomeRef').value='';this._abrirModal('mUID');setTimeout(()=>s.getElementById('uidInputVal')?.focus(),200);
  }
  async _executarBuscaUID(){
    const s=this.shadowRoot;const uid=s.getElementById('uidInputVal').value.trim();if(!uid)return this._toast('Digite um UID','err');
    const btn=s.getElementById('btnBuscarUID');btn.disabled=true;btn.textContent='Buscando...';s.getElementById('uidLookupResult').innerHTML=this._loading();s.getElementById('uidLookupResult').style.display='block';s.getElementById('btnConfirmarUID').style.display='none';
    const d=await this._api('GET',`/admin/uids/${uid}/info`);btn.disabled=false;btn.textContent='Buscar';
    if(!d?.ok){s.getElementById('uidLookupResult').innerHTML=`<div class="uid-lookup-err">${this._ico('warning',16)} ${d?.erro||'Erro ao buscar UID'}</div>`;return;}
    this._uidLookup=d;let html='';
    if(d.autorizacao_existente){const a=d.autorizacao_existente;if(a.ativo&&!a.utilizado){html+=`<div class="uid-lookup-warn">${this._ico('warning',14)} Já possui autorização ativa.</div>`;}else if(a.utilizado){html+=`<div class="uid-lookup-err">${this._ico('lock_r',14)} Já criou uma conta.</div>`;s.getElementById('uidLookupResult').innerHTML=html;return;}else{html+=`<div class="uid-lookup-warn">${this._ico('warning',14)} Autorização revogada. Confirmar irá reativar.</div>`;}}
    if(d.tem_historico&&d.streamer){const st=d.streamer;html+=`<div class="uid-lookup-card ok"><div class="uid-lookup-avatar">${st.foto?`<img src="${st.foto}" onerror="this.parentElement.innerHTML='<span class=av-fb>${this._ini(st.nome)}</span>'">`:`<span class="av-fb">${this._ini(st.nome)}</span>`}</div><div class="uid-lookup-info"><div class="uid-lookup-nome">${st.nome}</div><div class="uid-lookup-id">UID: ${uid}</div><div class="uid-lookup-stats"><span>${this._ico('diamond',11)} ${this._num(st.total_diamantes)}</span><span>${this._ico('clock_r',11)} ${st.total_horas}</span><span>${this._ico('live',11)} ${st.dias_com_live} dias</span></div><div class="uid-lookup-datas"><span>Primeira live: ${this._fdtCurto(st.primeira_live)||'—'}</span><span>Última live: ${this._fdtCurto(st.ultima_live)||'—'}</span></div></div></div>`;}
    else{html+=`<div class="uid-lookup-warn">${this._ico('warning',14)} <strong>Sem transmissões registradas.</strong> Pode liberar mesmo assim.</div>`;}
    if(d.tem_conta){html+=`<div class="uid-lookup-warn">${this._ico('lock_r',14)} Este UID já possui conta no painel.</div>`;s.getElementById('uidLookupResult').innerHTML=html;return;}
    s.getElementById('uidLookupResult').innerHTML=html;s.getElementById('btnConfirmarUID').style.display='flex';
  }
  async _confirmarAutorizarUID(){
    const s=this.shadowRoot;const uid=s.getElementById('uidInputVal').value.trim();const nomeRef=s.getElementById('uidNomeRef').value.trim();if(!uid)return;
    const btn=s.getElementById('btnConfirmarUID');btn.disabled=true;btn.textContent='Autorizando...';
    const d=await this._api('POST','/admin/uids',{kwai_uid:uid,nome_ref:nomeRef||null});btn.disabled=false;btn.textContent='Confirmar Autorização';
    if(d?.ok){this._fechaModal('mUID');this._toast(`UID ${uid} autorizado!`);this._carregarUids();}else{this._toast(d?.erro||'Erro ao autorizar','err');}
  }
  async _revogarUid(uid,reativar=false){
    const acao=reativar?'reativar':'revogar';if(!confirm(`Confirmar ${acao} UID ${uid}?`))return;
    const d=await this._api('PATCH',`/admin/uids/${uid}`,{ativo:reativar});
    if(d?.ok){this._toast(`UID ${uid} ${reativar?'reativado':'revogado'}`);this._carregarUids();}else this._toast(d?.erro||'Erro','err');
  }

  async _carregarCarteiraDash(){
    const s=this.shadowRoot;s.getElementById('carteiraResumo').innerHTML=this._loading('grid-column:1/-1');s.getElementById('carteiraStreamers').innerHTML=this._loading();
    const [d,dCfg]=await Promise.all([this._api('GET','/admin/carteira'),this._api('GET','/admin/config')]);
    if(!d?.ok){s.getElementById('carteiraResumo').innerHTML=this._empty('warning','Erro');return;}
    const r=d.resumo;const cfgMap={};(dCfg?.config||[]).forEach(c=>{cfgMap[c.chave]=c.valor;});
    this._taxaSaque=parseFloat(cfgMap.taxa_saque_mp||'0')||0;this._taxaPerc=parseFloat(cfgMap.taxa_saque_perc||'0')||0;
    const taxaInfo=this._taxaSaque>0||this._taxaPerc>0?`<div style="grid-column:1/-1;padding:10px 14px;background:rgba(251,191,36,.07);border:1px solid rgba(251,191,36,.25);border-radius:var(--rs);font-size:11px;color:#fbbf24;display:flex;align-items:center;gap:8px">${this._ico('warning',13)} Taxa: <strong>${this._taxaSaque>0?this._brl(this._taxaSaque)+' fixo':''} ${this._taxaPerc>0?this._taxaPerc+'%':''}</strong></div>`:`<div style="grid-column:1/-1;padding:8px 14px;background:rgba(74,222,128,.05);border:1px solid rgba(74,222,128,.15);border-radius:var(--rs);font-size:10px;color:var(--t3)">${this._ico('check_c',12)} PIX sem taxa configurada.</div>`;
    s.getElementById('carteiraResumo').innerHTML=`${taxaInfo}
      <div class="dc2 dc2-cyan"><div class="dc2-ico">${this._ico('wallet',26)}</div><div class="dc2-val">${this._brl(r.saldo_total_disponivel)}</div><div class="dc2-lbl">Disponível</div></div>
      <div class="dc2 dc2-gold"><div class="dc2-ico">${this._ico('clock_r',26)}</div><div class="dc2-val">${this._brl(r.saldo_total_pendente)}</div><div class="dc2-lbl">Saques Pend.</div></div>
      <div class="dc2 dc2-verde"><div class="dc2-ico">${this._ico('award',26)}</div><div class="dc2-val">${this._brl(r.total_distribuido)}</div><div class="dc2-lbl">Distribuído</div></div>
      <div class="dc2 dc2-indigo"><div class="dc2-ico">${this._ico('send',26)}</div><div class="dc2-val">${this._brl(r.total_sacado_historico)}</div><div class="dc2-lbl">Total Sacado</div></div>
      <div class="dc2 dc2-verm"><div class="dc2-ico">${this._ico('pix_ico',26)}</div><div class="dc2-val">${r.saques_pendentes_qtd}</div><div class="dc2-lbl">Aguardando</div></div>`;
    const ultimas=d.ultimas_movimentacoes||[],urgentes=d.saques_urgentes||[],premiacoes=d.ultimas_premiacoes||[];
    s.getElementById('carteiraStreamers').innerHTML=`<div style="display:flex;flex-direction:column;gap:14px"><div class="box"><div class="bhead acc-toggle" id="accMov"><div class="btitulo">${this._ico('zap',14)} Movimentações</div><span class="acc-chevron open" id="accMovIco">▼</span></div><div class="acc-body" id="accMovBody"><div style="padding:0">${ultimas.length?ultimas.map(t=>`<div class="tx-item"><span class="tx-tipo-badge ${['credito','premio_ranking'].includes(t.tipo)?'tx-entrada':'tx-saida'}">${['credito','premio_ranking'].includes(t.tipo)?'+':'-'}</span><div class="tx-desc"><span class="tx-uid">${t.kwai_uid}</span><span class="tx-detalhe">${t.descricao||t.tipo}</span></div><div class="tx-valor ${['credito','premio_ranking'].includes(t.tipo)?'tx-positivo':'tx-negativo'}">${this._brl(t.valor)}</div></div>`).join(''):this._empty('wallet','Sem movimentações')}</div></div></div><div class="box"><div class="bhead acc-toggle" id="accSaq"><div class="btitulo">${this._ico('pix_ico',14)} Saques Urgentes</div><div style="display:flex;align-items:center;gap:6px"><button class="btn btn-o btn-sm" id="btnVerSaques">${this._ico('send',12)} Ver todos</button><span class="acc-chevron open" id="accSaqIco">▼</span></div></div><div class="acc-body" id="accSaqBody"><div style="padding:0">${urgentes.length?urgentes.map(sg=>`<div class="tx-item"><div class="tx-desc"><span class="tx-uid">${sg.kwai_uid}</span><span class="tx-detalhe">${sg.pix_tipo}: ${sg.pix_chave}</span></div><span class="tx-valor">${this._brl(sg.valor)}</span></div>`).join(''):this._empty('check_c','Nenhum urgente')}</div></div></div></div><div class="box" style="margin-top:14px"><div class="bhead acc-toggle" id="accStr"><div class="btitulo">${this._ico('users',14)} Streamers com Saldo</div><div style="display:flex;align-items:center;gap:6px"><button class="btn btn-o btn-sm" id="btnCarrStreams">${this._ico('refresh',12)} Carregar</button><span class="acc-chevron open" id="accStrIco">▼</span></div></div><div class="acc-body" id="accStrBody"><div id="listaCarteiraStreamers">${this._empty('wallet','Clique em Carregar')}</div></div></div>`;
    s.getElementById('btnVerSaques')?.addEventListener('click',()=>this._ir('saques'));s.getElementById('btnCarrStreams')?.addEventListener('click',()=>this._carregarListaCarteiras());
    const _acc=(tId,bId,iId)=>{const btn=s.getElementById(tId),body=s.getElementById(bId),ico=s.getElementById(iId);if(!btn||!body)return;btn.addEventListener('click',e=>{if(e.target.closest('.btn'))return;body.classList.toggle('fechado');ico?.classList.toggle('open');});};
    _acc('accMov','accMovBody','accMovIco');_acc('accSaq','accSaqBody','accSaqIco');_acc('accStr','accStrBody','accStrIco');
    if(premiacoes.length){const sec=document.createElement('div');sec.className='box';sec.style.marginTop='14px';
    const _pHtml=premiacoes.map(p=>{
      const tipo=p.tipo_ranking==='diamantes'?`${this._ico('diamond',12)} Diamantes`:`${this._ico('clock_r',12)} Horas`;
      return`<div class="ph-acc-item"><div class="ph-acc-preview" onclick="this.closest('.ph-acc-item').classList.toggle('open')"><div style="display:flex;align-items:center;gap:8px;flex:1;min-width:0"><span style="font-family:'Rajdhani',sans-serif;font-size:14px;font-weight:700;color:var(--cyan)">${p.mes_referencia}</span><span style="font-size:11px;color:var(--t3);display:flex;align-items:center;gap:4px">${tipo}</span></div><span style="font-family:'Rajdhani',sans-serif;font-size:13px;font-weight:700;color:var(--azul);white-space:nowrap">${this._brl(p.total_valor)}</span><span class="ph-acc-chevron">${this._ico('down',12)}</span></div><div class="ph-acc-body"><div class="ph-acc-grid"><div class="ph-acc-cel"><div class="ph-acc-lbl">Premiados</div><div class="ph-acc-val" style="color:var(--verde)">${p.total_premiados}</div></div><div class="ph-acc-cel"><div class="ph-acc-lbl">Total</div><div class="ph-acc-val" style="color:var(--azul)">${this._brl(p.total_valor)}</div></div><div class="ph-acc-cel"><div class="ph-acc-lbl">Quando</div><div class="ph-acc-val" style="font-size:11px">${this._fdt(p.processado_em)}</div></div></div></div></div>`;
    }).join('');
    sec.innerHTML=`<div class="bhead"><div class="btitulo">${this._ico('award',14)} Últimas Premiações</div></div>${_pHtml}`;
    s.getElementById('carteiraStreamers').appendChild(sec);}
  }

  _abrirCreditoRapido(uidPreenchido=''){
    const s=this.shadowRoot;s.getElementById('mCrUid').value=uidPreenchido||'';s.getElementById('mCrInfo').style.display='none';s.getElementById('mCrInfo').innerHTML='';s.getElementById('mCrPasso2').style.display='none';s.getElementById('mCrStreamerCard').innerHTML='';s.getElementById('mCrValor').value='';s.getElementById('mCrDesc').value='';s.getElementById('btnCrConfirmar').style.display='none';s.getElementById('btnCrBuscar').disabled=false;s.getElementById('btnCrBuscar').textContent='Buscar';this._creditoRapidoUid=null;this._abrirModal('mCredito');setTimeout(()=>{const inp=s.getElementById('mCrUid');inp?.focus();if(uidPreenchido)this._buscarStreamerParaCredito();},150);
  }
  async _buscarStreamerParaCredito(){
    const s=this.shadowRoot;const uid=s.getElementById('mCrUid').value.trim();if(!uid)return this._toast('Digite um UID','err');
    const btn=s.getElementById('btnCrBuscar');const infoEl=s.getElementById('mCrInfo');btn.disabled=true;btn.textContent='Buscando...';infoEl.style.display='block';infoEl.innerHTML=this._loading('padding:12px 0');s.getElementById('mCrPasso2').style.display='none';s.getElementById('btnCrConfirmar').style.display='none';
    const d=await this._api('GET',`/admin/carteira/${uid}`);btn.disabled=false;btn.textContent='Buscar';
    if(!d?.ok){infoEl.innerHTML=`<div class="uid-lookup-err">${this._ico('warning',14)} ${d?.erro||'Não encontrado.'}</div>`;return;}
    this._creditoRapidoUid=uid;const p=d.perfil||{},c=d.carteira||{};infoEl.style.display='none';
    s.getElementById('mCrStreamerCard').innerHTML=`<div style="display:flex;align-items:center;gap:12px;padding:12px 14px;background:rgba(0,212,212,.06);border:1px solid rgba(0,212,212,.25);border-radius:var(--rs)">${p.foto?`<img src="${p.foto}" style="width:42px;height:42px;border-radius:50%;object-fit:cover;border:2px solid rgba(0,212,212,.4)" onerror="this.style.display='none'">`:`<div class="av-fb" style="width:42px;height:42px;font-size:16px">${this._ini(p.nome||uid)}</div>`}<div style="flex:1;min-width:0"><div style="font-family:'Rajdhani',sans-serif;font-size:15px;font-weight:700;color:var(--t1)">${p.nome||'—'}</div><div style="font-size:11px;color:var(--t3)">UID: ${uid}</div>${p.pix_tipo&&p.pix_chave?`<div style="font-size:10px;color:var(--t3)">${this._ico('pix_ico',10)} PIX ${p.pix_tipo}: ${p.pix_chave}</div>`:''}</div><div style="text-align:right"><div style="font-size:10px;color:var(--t3)">Saldo atual</div><div style="font-family:'Rajdhani',sans-serif;font-size:18px;font-weight:700;color:var(--verde)">${this._brl(c.saldo||0)}</div></div></div>`;
    s.getElementById('mCrPasso2').style.display='block';s.getElementById('btnCrConfirmar').style.display='flex';setTimeout(()=>s.getElementById('mCrValor')?.focus(),100);
  }
  async _confirmarCreditoRapido(){
    const s=this.shadowRoot;const uid=this._creditoRapidoUid;const valor=s.getElementById('mCrValor').value;const descricao=s.getElementById('mCrDesc').value.trim();
    if(!uid)return this._toast('Busque um streamer primeiro','err');if(!valor||Number(valor)<=0)return this._toast('Informe um valor','err');if(!descricao)return this._toast('Informe o motivo','err');
    const btn=s.getElementById('btnCrConfirmar');btn.disabled=true;btn.innerHTML=`<div class="sp" style="width:14px;height:14px;margin:0;border-width:2px;display:inline-block;vertical-align:middle"></div> Processando...`;
    const d=await this._api('POST',`/admin/carteira/${uid}/operacao`,{tipo:'credito',valor:Number(valor),descricao});
    btn.disabled=false;btn.innerHTML=`${this._ico('check',13)} Confirmar Crédito`;
    if(d?.ok){this._fechaModal('mCredito');this._toast(`✓ Saldo adicionado! Novo: ${this._brl(d.saldo_posterior)}`);this._carregarCarteiraDash();}else{this._toast(d?.erro||'Erro','err');}
  }

  // ── FIX v2.1: usa /admin/carteira/streamers que retorna TODOS (limit=1000 no worker v5)
  async _carregarListaCarteiras(){
    const s=this.shadowRoot;const container=s.getElementById('listaCarteiraStreamers');if(!container)return;
    container.innerHTML=this._loading();
    const d=await this._api('GET','/admin/carteira/streamers');
    if(!d?.ok){container.innerHTML=this._empty('warning','Erro ao carregar');return;}
    const lista=(d.carteiras||[]);
    if(!lista.length){container.innerHTML=this._empty('users','Nenhum streamer cadastrado');return;}
    container.innerHTML=`<div style="padding:10px 16px;border-bottom:1px solid var(--brddim);display:flex;gap:8px;align-items:center"><div class="busca" style="flex:1">${this._ico('search',12)}<input id="bCarteira" type="text" placeholder="Buscar por nome ou UID..." style="width:100%"/></div><span style="font-size:11px;color:var(--t3)">${lista.length} streamers</span></div><div id="listaCarteiraRows"></div>`;
    const render=(filtro='')=>{
      const rows=filtro?lista.filter(c=>(c.nome||'').toLowerCase().includes(filtro)||c.kwai_uid.includes(filtro)):lista;
      const el=s.getElementById('listaCarteiraRows');if(!el)return;
      if(!rows.length){el.innerHTML=this._empty('search','Nenhum resultado');return;}
      // Cards accordion — compacto por padrão, expande ao toque
      el.innerHTML=rows.map(c=>{
        const nome=c.nome||c.kwai_uid;
        const saldoColor=c.saldo>0?'var(--verde)':'var(--t3)';
        return`<div class="sc-item">
          <div class="sc-preview" onclick="this.closest('.sc-item').classList.toggle('open')">
            <div class="sc-av">${this._avatar(this._proxyFoto(c.foto||''),nome)}</div>
            <div class="sc-info">
              <div class="sc-nome">${nome}</div>
              <div class="sc-uid">UID: ${c.kwai_uid}</div>
            </div>
            <div class="sc-saldo-mini">
              <div style="font-size:9px;color:var(--t3);text-align:right">Disponível</div>
              <div style="font-family:'Rajdhani',sans-serif;font-weight:700;font-size:14px;color:${saldoColor}">${this._brl(c.saldo)}</div>
            </div>
            <span class="sc-chevron">${this._ico('down',12)}</span>
          </div>
          <div class="sc-body">
            <div class="sc-body-grid">
              <div class="sc-detalhe"><div class="sc-dlbl">Pendente</div><div class="sc-dval" style="color:#fbbf24">${c.saldo_pendente>0?this._brl(c.saldo_pendente):'—'}</div></div>
              <div class="sc-detalhe"><div class="sc-dlbl">Total Recebido</div><div class="sc-dval">${c.total_recebido>0?this._brl(c.total_recebido):'—'}</div></div>
            </div>
            <div class="sc-body-acoes">
              <button class="btn btn-g btn-sm sc-add" data-uid="${c.kwai_uid}" data-nome="${nome.replace(/"/g,'')}">${this._ico('plus',12)} Adicionar Saldo</button>
              ${c.tem_carteira?`<button class="btn btn-o btn-sm sc-ver" data-uid="${c.kwai_uid}" data-nome="${nome.replace(/"/g,'')}">${this._ico('wallet',12)} Ver Carteira</button>`:''}
            </div>
          </div>
        </div>`;
      }).join('');
      el.querySelectorAll('.sc-add').forEach(btn=>{btn.addEventListener('click',e=>{e.stopPropagation();this._abrirCreditoRapido(btn.dataset.uid);});});
      el.querySelectorAll('.sc-ver').forEach(btn=>{btn.addEventListener('click',e=>{e.stopPropagation();this._abrirDetalheCarteira(btn.dataset.uid,btn.dataset.nome);});});
    };
    render();s.getElementById('bCarteira')?.addEventListener('input',e=>render(e.target.value.trim()));
  }

  async _abrirDetalheCarteira(uid,nome){
    const s=this.shadowRoot;s.getElementById('mCartTitulo').textContent=`Carteira — ${nome}`;s.getElementById('mCartBody').innerHTML=this._loading();this._cartOp={uid,nome,tipo:null};this._abrirModal('mCart');
    const d=await this._api('GET',`/admin/carteira/${uid}`);if(!d?.ok){s.getElementById('mCartBody').innerHTML=this._empty('warning','Erro');return;}
    const c=d.carteira,txs=d.transacoes||[],sqs=d.saques||[];
    s.getElementById('mCartBody').innerHTML=`<div class="cart-saldo-row"><div class="cart-saldo-box cy"><div class="cart-saldo-lbl">Disponível</div><div class="cart-saldo-val">${this._brl(c.saldo)}</div></div><div class="cart-saldo-box" style="border-color:rgba(251,191,36,.3)"><div class="cart-saldo-lbl">Pendente</div><div class="cart-saldo-val" style="color:#fbbf24">${this._brl(c.saldo_pendente)}</div></div><div class="cart-saldo-box vd"><div class="cart-saldo-lbl">Recebido</div><div class="cart-saldo-val">${this._brl(c.total_recebido)}</div></div><div class="cart-saldo-box az"><div class="cart-saldo-lbl">Sacado</div><div class="cart-saldo-val">${this._brl(c.total_sacado)}</div></div></div><div class="cart-pix-row">${this._ico('pix_ico',13)} PIX: <strong>${d.perfil?.pix_tipo||'—'}</strong> ${d.perfil?.pix_chave||'—'}</div><div class="cart-acoes-row"><button class="btn btn-g" id="btnCartCredito">${this._ico('plus',14)} Adicionar Saldo</button><button class="btn" style="background:rgba(248,113,113,.2);color:var(--verm);border:1px solid rgba(248,113,113,.4)" id="btnCartDebito">${this._ico('trash',14)} Remover Saldo</button></div>${txs.length?`<div class="cart-hist-titulo">${this._ico('history',13)} Transações (${txs.length})</div><div class="cart-hist-lista">${txs.map(t=>{const ent=['credito','premio_ranking'].includes(t.tipo);const tL={credito:'Crédito',debito:'Débito',saque_solicitado:'Saque Sol.',saque_aprovado:'Saque Aprov.',saque_rejeitado:'Saque Rejeit.',premio_ranking:'Prêmio',estorno:'Estorno'}[t.tipo]||t.tipo;return`<div class="tx-item"><span class="tx-tipo-badge ${ent?'tx-entrada':'tx-saida'}">${ent?'+':'−'}</span><div class="tx-desc"><span class="tx-uid">${tL}</span><span class="tx-detalhe">${t.descricao||'—'}</span></div><div style="text-align:right"><div class="tx-valor ${ent?'tx-positivo':'tx-negativo'}">${this._brl(t.valor)}</div><div style="font-size:9px;color:var(--t3)">${this._fdtCurto(t.criado_em)}</div></div></div>`;}).join('')}</div>`:''}${sqs.length?`<div class="cart-hist-titulo">${this._ico('send',13)} Saques (${sqs.length})</div><div class="cart-hist-lista">${sqs.map(sg=>`<div class="tx-item"><span class="badge ${sg.status==='aprovado'||sg.status==='pago'?'on':sg.status==='rejeitado'?'off':''}"> ${sg.status}</span><div class="tx-desc"><span class="tx-uid">${sg.pix_tipo}: ${sg.pix_chave}</span></div><div style="text-align:right"><div class="tx-valor tx-negativo">${this._brl(sg.valor)}</div><div style="font-size:9px;color:var(--t3)">${this._fdtCurto(sg.solicitado_em)}</div></div></div>`).join('')}</div>`:''}`;
    s.getElementById('btnCartCredito')?.addEventListener('click',()=>{this._fechaModal('mCart');this._abrirModalOperacao(uid,nome,'credito');});s.getElementById('btnCartDebito')?.addEventListener('click',()=>{this._fechaModal('mCart');this._abrirModalOperacao(uid,nome,'debito');});
  }
  _abrirModalOperacao(uid,nome,tipo){
    const s=this.shadowRoot;this._cartOp={uid,nome,tipo};const isC=tipo==='credito';s.getElementById('mOpTitulo').textContent=`${isC?'Adicionar':'Remover'} Saldo — ${nome}`;s.getElementById('mOpValor').value='';s.getElementById('mOpDesc').value='';s.getElementById('mOpConfirmar').textContent=isC?'Confirmar Crédito':'Confirmar Débito';s.getElementById('mOpConfirmar').style.background=isC?'var(--grad)':'linear-gradient(135deg,#c00030,#f87171)';this._abrirModal('mOp');setTimeout(()=>s.getElementById('mOpValor')?.focus(),200);
  }
  async _confirmarOperacao(){
    const s=this.shadowRoot;const {uid,nome,tipo}=this._cartOp;const valor=s.getElementById('mOpValor').value;const descricao=s.getElementById('mOpDesc').value.trim();
    if(!valor||!descricao)return this._toast('Preencha valor e descrição','err');
    const btn=s.getElementById('mOpConfirmar');btn.disabled=true;btn.textContent='Processando...';
    const d=await this._api('POST',`/admin/carteira/${uid}/operacao`,{tipo,valor:Number(valor),descricao});
    btn.disabled=false;btn.textContent=tipo==='credito'?'Confirmar Crédito':'Confirmar Débito';
    if(d?.ok){this._fechaModal('mOp');this._toast(`${tipo==='credito'?'Crédito':'Débito'} realizado! Saldo: ${this._brl(d.saldo_posterior)}`);this._carregarCarteiraDash();}else{this._toast(d?.erro||'Erro','err');}
  }

  async _carregarSaques(){
    const s=this.shadowRoot;const container=s.getElementById('listaSaques');if(container)container.innerHTML=this._loading();
    const filtro=s.getElementById('saqueFiltro')?.value||'pendente';const d=await this._api('GET',`/admin/saques?status=${filtro}&pagina=${this._pg.saques}`);
    if(!d?.ok){if(container)container.innerHTML=this._empty('warning','Erro');return;}
    const badge=s.getElementById('nbSaques');if(badge&&d.pendentes_total){badge.textContent=d.pendentes_total;badge.style.display='';}
    const lista=d.saques||[];if(!lista.length){if(container)container.innerHTML=this._empty('check_c','Nenhuma solicitação');return;}
    if(container)container.innerHTML=lista.map(sg=>{
      const isPend=sg.status==='pendente';
      return`<div class="saque-card ${isPend?'saque-pend':''}"><div class="saque-header"><div><div class="saque-nome">${sg.nome_streamer||sg.kwai_uid}</div><div class="saque-uid">${sg.kwai_uid}</div></div><div style="text-align:right"><div class="saque-valor">${this._brl(sg.valor)}</div><span class="badge ${sg.status==='aprovado'||sg.status==='pago'?'on':sg.status==='rejeitado'?'off':''}">${sg.status}</span></div></div><div class="saque-pix">${this._ico('pix_ico',12)} ${sg.pix_tipo}: <strong>${sg.pix_chave}</strong></div><div class="saque-meta"><span>${this._ico('calendar',11)} ${this._fdt(sg.solicitado_em)}</span>${sg.processado_em?`<span>${this._ico('check_c',11)} ${this._fdt(sg.processado_em)} por ${sg.processado_por||'—'}</span>`:''}${sg.observacao?`<span>${this._ico('warning',11)} ${sg.observacao}</span>`:''}</div>${isPend?`<div class="saque-acoes"><button class="btn btn-g btn-sm saque-pagar-mp" data-id="${sg.id}" data-nome="${(sg.nome_streamer||sg.kwai_uid).replace(/"/g,'')}" data-val="${sg.valor}" data-pix="${sg.pix_tipo}: ${sg.pix_chave}" style="background:linear-gradient(135deg,#00b450,#00802e)"><img src="https://static.wixstatic.com/media/ac74b3_47887b03b957463eafa996b70580ec90~mv2.webp" style="width:13px;height:13px;object-fit:contain;flex-shrink:0" alt="pix"> Pagar PIX</button><button class="btn btn-g btn-sm saque-aprovar" data-id="${sg.id}" data-nome="${(sg.nome_streamer||sg.kwai_uid).replace(/"/g,'')}" data-val="${sg.valor}">${this._ico('check_c',12)} Só Aprovar</button><button class="btn btn-sm saque-rejeitar" style="border:1px solid rgba(248,113,113,.4);color:var(--verm);background:rgba(248,113,113,.08)" data-id="${sg.id}" data-nome="${(sg.nome_streamer||sg.kwai_uid).replace(/"/g,'')}" data-val="${sg.valor}">${this._ico('x_circle',12)} Rejeitar</button><button class="btn btn-o btn-sm" onclick="navigator.clipboard.writeText('${sg.pix_chave}')">${this._ico('clipboard',11)} Copiar PIX</button></div>`:''}${sg.status==='aprovado'?`<div class="saque-acoes"><button class="btn btn-g btn-sm saque-marcar-pago" data-id="${sg.id}" data-nome="${(sg.nome_streamer||sg.kwai_uid).replace(/"/g,'')}" data-val="${sg.valor}" style="background:linear-gradient(135deg,#00b450,#008040)">${this._ico('check_c',12)} Marcar como Pago</button><button class="btn btn-o btn-sm saque-pagar-mp" data-id="${sg.id}" data-pix="${sg.pix_tipo}: ${sg.pix_chave}">Pagar via MP (auto)</button></div>`:''}
      </div>`;
    }).join('');
    if(container){
      container.querySelectorAll('.saque-pagar-mp').forEach(btn=>{btn.addEventListener('click',()=>this._pagarSaqueMp(btn.dataset.id,btn.dataset.nome,btn.dataset.val,btn.dataset.pix));});
      container.querySelectorAll('.saque-aprovar').forEach(btn=>{btn.addEventListener('click',()=>this._abrirModalSaque(btn.dataset.id,btn.dataset.nome,btn.dataset.val,'aprovar'));});
      container.querySelectorAll('.saque-rejeitar').forEach(btn=>{btn.addEventListener('click',()=>this._abrirModalSaque(btn.dataset.id,btn.dataset.nome,btn.dataset.val,'rejeitar'));});
      container.querySelectorAll('.saque-marcar-pago').forEach(btn=>{btn.addEventListener('click',()=>this._abrirModalSaque(btn.dataset.id,btn.dataset.nome,btn.dataset.val,'marcar_pago'));});
    }
    this._renderPg('pgSaques',this._pg.saques,lista.length,20,n=>{this._pg.saques=n;this._carregarSaques();});
  }
  // ── PIX EMV Generator (Padrão Banco Central) ─────────────────────────────
  _gerarPixPayload(pixKey,valor){const f=(id,v)=>{const s=String(v);return`${id}${String(s.length).padStart(2,'0')}${s}`;};const mai=f('00','BR.GOV.BCB.PIX')+f('01',pixKey.replace(/\s/g,''));const amt=f('54',Number(valor).toFixed(2));const add=f('62',f('05','***'));let p=f('00','01')+f('01','12')+f('26',mai)+f('52','0000')+f('53','986')+amt+f('58','BR')+f('59','DMaior Agency')+f('60','Fortaleza')+add+'6304';let crc=0xFFFF;for(let i=0;i<p.length;i++){crc^=p.charCodeAt(i)<<8;for(let j=0;j<8;j++)crc=(crc&0x8000)?(crc<<1)^0x1021:crc<<1;}return p+(crc&0xFFFF).toString(16).toUpperCase().padStart(4,'0');}

  async _pagarSaqueMp(id,nome,valor,pixInfo){
    const btns=this.shadowRoot.querySelectorAll(`[data-id="${id}"]`);btns.forEach(b=>{b.disabled=true;});
    const btnPagar=this.shadowRoot.querySelector(`.saque-pagar-mp[data-id="${id}"]`);if(btnPagar)btnPagar.textContent='Processando...';
    const d=await this._api('POST',`/admin/saques/${id}/pagar`,{});btns.forEach(b=>{b.disabled=false;});if(btnPagar)btnPagar.innerHTML=`<img src="https://static.wixstatic.com/media/ac74b3_47887b03b957463eafa996b70580ec90~mv2.webp" style="width:13px;height:13px;object-fit:contain;flex-shrink:0" alt="pix"> Pagar PIX`;
    if(!d){this._toast('Sem resposta','err');return;}
    if(d.modo==='asaas'){this._toast(`✓ PIX enviado! ${d.mensagem}`);setTimeout(()=>this._carregarSaques(),1200);return;}
    if(d.modo==='info'||d.modo==='qrcode'){this._abrirModalPix(d);return;}
    this._toast(d?.erro||'Erro','err');
  }
  _abrirModalPix(data){
    const s=this.shadowRoot;const foto=data.foto||'';const imgEl=s.getElementById('mPixFoto');
    if(foto){imgEl.src=foto;imgEl.onerror=()=>{imgEl.src='';imgEl.style.display='none';};}else{imgEl.style.display='none';}
    s.getElementById('mPixNome').textContent=data.nome_streamer||data.uid||'—';s.getElementById('mPixUid').textContent=data.uid||'';s.getElementById('mPixValor').textContent=this._brl(data.valor);s.getElementById('mPixTipo').textContent=data.pix_tipo||'—';s.getElementById('mPixChave').textContent=data.pix_chave||'—';s.getElementById('mPixSaqueId').value=data.saque_id||'';this._abrirModal('mPix');
    const btnCopiar=s.getElementById('mPixCopiarChave');if(btnCopiar){btnCopiar.onclick=()=>{navigator.clipboard?.writeText(data.pix_chave||'').then(()=>{this._toast('Chave PIX copiada!');btnCopiar.innerHTML=`${this._ico('check_c',13)} Copiado!`;setTimeout(()=>{btnCopiar.innerHTML=`${this._ico('clipboard',13)} Copiar chave PIX`;},2000);}).catch(()=>{this._toast('Não foi possível copiar','err');});};}
  }
  _abrirModalSaque(id,nome,valor,acao){
    const s=this.shadowRoot;this._saqueId=id;this._saqueAcao=acao;
    const labels={aprovar:{titulo:'Aprovar Saque',btn:'Confirmar Aprovação',cor:'var(--grad)',obs:'Observação (opcional)'},rejeitar:{titulo:'Rejeitar Saque',btn:'Confirmar Rejeição',cor:'linear-gradient(135deg,#c00030,#f87171)',obs:'Motivo (opcional)'},marcar_pago:{titulo:'Marcar como Pago',btn:'Confirmar Pagamento',cor:'linear-gradient(135deg,#00b450,#008040)',obs:'ID/comprovante (opcional)'}};
    const l=labels[acao]||labels.aprovar;s.getElementById('mSaqueTitulo').textContent=`${l.titulo} — ${nome}`;s.getElementById('mSaqueInfo').textContent=`Valor: ${this._brl(valor)}`;s.getElementById('mSaqueObs').value='';s.getElementById('mSaqueConfirmar').textContent=l.btn;s.getElementById('mSaqueConfirmar').style.background=l.cor;s.getElementById('mSaqueObsLabel').textContent=l.obs;this._abrirModal('mSaque');
  }
  async _confirmarSaqueAcao(){
    const s=this.shadowRoot;const observacao=s.getElementById('mSaqueObs').value.trim();const btn=s.getElementById('mSaqueConfirmar');btn.disabled=true;btn.textContent='Processando...';
    const d=await this._api('POST',`/admin/saques/${this._saqueId}/processar`,{acao:this._saqueAcao,observacao});btn.disabled=false;btn.textContent=this._saqueAcao==='aprovar'?'Confirmar Aprovação':'Confirmar Rejeição';
    if(d?.ok){this._fechaModal('mSaque');this._toast(`Saque ${this._saqueAcao==='aprovar'?'aprovado':'rejeitado'}!`);this._carregarSaques();}else{this._toast(d?.erro||'Erro','err');}
  }

  async _carregarPremios(){
    const s=this.shadowRoot;this._premioLinhas[this._premioTipo]=[];this._premioRemover[this._premioTipo]=new Set();s.getElementById('historicoPremios').innerHTML=this._loading();
    await Promise.all([this._renderPremiosConfig(),this._carregarHistoricoPremios()]);
  }
  async _renderPremiosConfig(){
    const s=this.shadowRoot;const container=s.getElementById('premiosConfigArea');const tipo=this._premioTipo;
    if(this._premioLinhas[tipo].length===0){container.innerHTML=this._loading();const d=await this._api('GET',`/admin/premios/config?tipo=${tipo}`);if(!d?.ok){container.innerHTML=this._empty('warning','Erro');return;}this._premioLinhas[tipo]=(d.premios||[]).filter(p=>Number(p.valor_premio)>0).map(p=>({posicao:Number(p.posicao),valor:Number(p.valor_premio)})).sort((a,b)=>a.posicao-b.posicao);}
    this._renderPremioTabela(tipo);
  }
  _renderPremioTabela(tipo){
    const s=this.shadowRoot;const container=s.getElementById('premiosConfigArea');const linhas=this._premioLinhas[tipo];
    container.innerHTML=`<div class="premio-info-box">${this._ico('award',14)} Só posições com valor <strong>&gt; R$ 0</strong> são salvas.</div><table class="premio-table"><thead><tr><th style="width:130px">Posição</th><th>Valor</th><th style="width:50px"></th></tr></thead><tbody id="premioTbody">${linhas.length===0?`<tr><td colspan="3" style="text-align:center;padding:24px;color:var(--t3);font-size:12px">Nenhuma posição. Clique em <strong>Adicionar</strong>.</td></tr>`:linhas.map(l=>this._premioLinhaHtml(l.posicao,l.valor)).join('')}</tbody></table><div style="display:flex;justify-content:space-between;align-items:center;margin-top:12px;flex-wrap:wrap;gap:8px"><button class="btn btn-o btn-sm" id="btnAddLinha">${this._ico('plus',12)} Adicionar Posição</button><div style="display:flex;gap:10px;align-items:center"><span style="font-size:11px;color:var(--t3)" id="premioSaveStatus"></span><button class="btn btn-g" id="btnSalvarPremios">${this._ico('check',14)} Salvar</button></div></div>`;
    s.getElementById('btnAddLinha')?.addEventListener('click',()=>this._adicionarLinhaPremio(tipo));s.getElementById('btnSalvarPremios')?.addEventListener('click',()=>this._salvarPremios());
    container.querySelectorAll('.btn-remove-linha').forEach(btn=>{btn.addEventListener('click',()=>this._removerLinhaPremio(tipo,parseInt(btn.dataset.pos)));});
    container.querySelectorAll('.premio-val-inp').forEach(inp=>{inp.addEventListener('focus',()=>inp.style.borderColor='var(--cyan)');inp.addEventListener('blur',()=>inp.style.borderColor='var(--brd)');inp.addEventListener('input',()=>{const pos=parseInt(inp.dataset.pos),val=parseFloat(inp.value.replace(',','.'))||0;const linha=this._premioLinhas[tipo].find(l=>l.posicao===pos);if(linha)linha.valor=val;});});
  }
  _premioLinhaHtml(posicao,valor){
    const medal=posicao===1?'🥇':posicao===2?'🥈':posicao===3?'🥉':`#${posicao}`;
    return`<tr data-pos="${posicao}"><td class="premio-pos">${medal} Top ${posicao}</td><td><div style="display:flex;align-items:center;gap:8px"><span style="color:var(--t3);font-family:'Rajdhani',sans-serif;font-size:14px;font-weight:700">R$</span><input class="premio-val-inp" data-pos="${posicao}" type="number" min="0.01" step="0.01" value="${valor>0?valor:''}" placeholder="0.00" style="background:rgba(0,0,0,.5);border:1px solid var(--brd);border-radius:6px;color:var(--t1);padding:7px 12px;width:150px;font-family:'Exo 2',sans-serif;font-size:14px;outline:none;transition:border-color .2s"/></div></td><td><button class="btn btn-sm btn-remove-linha" data-pos="${posicao}" style="border:1px solid rgba(248,113,113,.3);color:var(--verm);background:rgba(248,113,113,.06);padding:4px 8px">${this._ico('x_circle',13)}</button></td></tr>`;
  }
  _adicionarLinhaPremio(tipo){const linhas=this._premioLinhas[tipo];const proxPos=linhas.length>0?Math.max(...linhas.map(l=>l.posicao))+1:1;linhas.push({posicao:proxPos,valor:0});this._renderPremioTabela(tipo);setTimeout(()=>{const inp=this.shadowRoot.querySelector(`.premio-val-inp[data-pos="${proxPos}"]`);if(inp){inp.focus();inp.style.borderColor='var(--cyan)';}},50);}
  _removerLinhaPremio(tipo,posicao){this._premioLinhas[tipo]=this._premioLinhas[tipo].filter(l=>l.posicao!==posicao);this._premioRemover[tipo].add(posicao);this._renderPremioTabela(tipo);}
  async _salvarPremios(){
    const s=this.shadowRoot;const tipo=this._premioTipo;const btn=s.getElementById('btnSalvarPremios');const statusEl=s.getElementById('premioSaveStatus');btn.disabled=true;btn.innerHTML=`<div class="sp" style="width:14px;height:14px;margin:0;border-width:2px;display:inline-block;vertical-align:middle"></div> Salvando...`;if(statusEl)statusEl.textContent='';
    const premios=[];s.querySelectorAll('.premio-val-inp').forEach(inp=>{const pos=parseInt(inp.dataset.pos),raw=inp.value.trim(),valor=raw===''?0:parseFloat(raw.replace(',','.'));if(!isNaN(valor)&&valor>0)premios.push({posicao:pos,valor_premio:valor});const linha=this._premioLinhas[tipo].find(l=>l.posicao===pos);if(linha)linha.valor=isNaN(valor)?0:valor;});
    const remover=[...this._premioRemover[tipo]];const d=await this._api('POST','/admin/premios/config',{tipo_ranking:tipo,premios,remover});btn.disabled=false;btn.innerHTML=`${this._ico('check',14)} Salvar`;
    if(d?.ok){this._premioRemover[tipo]=new Set();this._premioLinhas[tipo]=this._premioLinhas[tipo].filter(l=>l.valor>0);this._toast(`${d.salvos||premios.length} posição(ões) salva(s).`);if(statusEl)statusEl.textContent=`Salvo às ${new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}`;setTimeout(()=>{this._premioLinhas[tipo]=[];this._renderPremiosConfig();},1200);}else{this._toast(d?.erro||'Erro','err');}
  }
  async _carregarHistoricoPremios(){
    const s=this.shadowRoot;const d=await this._api('GET','/admin/carteira');const container=s.getElementById('historicoPremios');if(!container)return;
    const hist=d?.ultimas_premiacoes||[];if(!hist.length){container.innerHTML=this._empty('history','Nenhuma distribuição ainda');return;}
    // Accordion — funciona em mobile e desktop sem cortar
    container.innerHTML=hist.map((p,i)=>{
      const tipo=p.tipo_ranking==='diamantes'?`${this._ico('diamond',12)} Diamantes`:`${this._ico('clock_r',12)} Horas`;
      return`<div class="ph-acc-item">
        <div class="ph-acc-preview" onclick="this.closest('.ph-acc-item').classList.toggle('open')">
          <div style="display:flex;align-items:center;gap:8px;flex:1;min-width:0">
            <span style="font-family:'Rajdhani',sans-serif;font-size:14px;font-weight:700;color:var(--cyan)">${p.mes_referencia}</span>
            <span style="font-size:11px;color:var(--t3);display:flex;align-items:center;gap:4px">${tipo}</span>
          </div>
          <span style="font-family:'Rajdhani',sans-serif;font-size:14px;font-weight:700;color:var(--azul);white-space:nowrap">${this._brl(p.total_valor)}</span>
          <span class="ph-acc-chevron">${this._ico('down',12)}</span>
        </div>
        <div class="ph-acc-body">
          <div class="ph-acc-grid">
            <div class="ph-acc-cel"><div class="ph-acc-lbl">Premiados</div><div class="ph-acc-val" style="color:var(--verde)">${p.total_premiados}</div></div>
            <div class="ph-acc-cel"><div class="ph-acc-lbl">Total Distribuído</div><div class="ph-acc-val" style="color:var(--azul)">${this._brl(p.total_valor)}</div></div>
            <div class="ph-acc-cel"><div class="ph-acc-lbl">Processado por</div><div class="ph-acc-val">${p.processado_por||'—'}</div></div>
            <div class="ph-acc-cel"><div class="ph-acc-lbl">Quando</div><div class="ph-acc-val" style="font-size:11px">${this._fdt(p.processado_em)}</div></div>
          </div>
        </div>
      </div>`;
    }).join('');
  }
  _abrirModalProcessar(){
    const s=this.shadowRoot;const agora=new Date();const mesAnt=new Date(agora.getFullYear(),agora.getMonth()-1,1);const mesStr=`${mesAnt.getFullYear()}-${String(mesAnt.getMonth()+1).padStart(2,'0')}`;s.getElementById('mProcMes').value=mesStr;s.getElementById('mProcTipo').value=this._premioTipo;s.getElementById('mProcConfirmar').disabled=false;s.getElementById('mProcConfirmar').textContent='Processar Premiação';s.getElementById('mProcStatus').innerHTML='';
    const taxa=this._taxaSaque||0,taxaP=this._taxaPerc||0;const taxaInfo=s.getElementById('mProcTaxaInfo');if(taxaInfo){if(taxa>0||taxaP>0){taxaInfo.innerHTML=`<div style="padding:8px 12px;background:rgba(251,191,36,.08);border:1px solid rgba(251,191,36,.25);border-radius:var(--rs);font-size:11px;color:#fbbf24;margin-bottom:10px">${this._ico('warning',12)} Taxa: ${taxa>0?this._brl(taxa)+' fixo':''}${taxaP>0?' + '+taxaP+'%':''}</div>`;}else{taxaInfo.innerHTML=`<div style="padding:6px 12px;background:rgba(74,222,128,.05);border:1px solid rgba(74,222,128,.15);border-radius:var(--rs);font-size:10px;color:var(--t3);margin-bottom:10px">${this._ico('check_c',11)} Sem taxa.</div>`;}}
    this._abrirModal('mProc');
  }
  async _confirmarProcessarPremios(){
    const s=this.shadowRoot;const mes=s.getElementById('mProcMes').value,tipo=s.getElementById('mProcTipo').value;if(!mes)return this._toast('Selecione o mês','err');
    if(!confirm(`⚠️ Confirmar premiação ${tipo} para ${mes}?\n\nNÃO pode ser desfeita automaticamente.`))return;
    const btn=s.getElementById('mProcConfirmar');const statusEl=s.getElementById('mProcStatus');btn.disabled=true;btn.textContent='Processando...';statusEl.innerHTML=`<div style="text-align:center;padding:10px;color:var(--t3);font-size:12px">${this._ico('refresh',14)} Calculando...</div>`;
    const d=await this._api('POST','/admin/premios/processar',{mes_referencia:mes,tipo_ranking:tipo});btn.disabled=false;btn.textContent='Processar Premiação';
    if(d?.ok){statusEl.innerHTML=`<div class="mproc-sucesso">${this._ico('check_c',18)}<div><strong>${d.total_premiados} premiados</strong><br>${this._brl(d.total_valor)} distribuídos</div></div>${d.premiados?.map(p=>`<div class="mproc-item"><span class="prize-tag">Top ${p.posicao}</span><span>${p.kwai_uid}</span><span style="color:var(--verde);font-family:'Rajdhani',sans-serif;font-weight:700">${this._brl(p.valor)}</span></div>`).join('')||''}`;this._toast(`Premiação de ${mes} processada!`);setTimeout(()=>{this._fechaModal('mProc');this._carregarPremios();},3000);}
    else{statusEl.innerHTML=`<div class="uid-lookup-err">${this._ico('warning',14)} ${d?.erro||'Erro'}</div>`;this._toast(d?.erro||'Erro','err');}
  }

  _abrirModalS(){this._edtId=null;const s=this.shadowRoot;s.getElementById('mSTit').textContent='Adicionar Streamer';['mNome','mKwai','mFoto'].forEach(i=>s.getElementById(i).value='');s.getElementById('mAtivo').value='true';s.getElementById('mS').classList.add('on');}
  async _salvarStreamer(){
    const s=this.shadowRoot;const dados={nome:s.getElementById('mNome').value.trim(),kwai_id:s.getElementById('mKwai').value.trim(),foto_url:s.getElementById('mFoto').value.trim()};if(!dados.nome){this._toast('Nome obrigatório','err');return;}
    const rota=this._edtId?`/admin/streamers/${this._edtId}`:'/admin/streamers';const method=this._edtId?'PUT':'POST';
    const d=await this._api(method,rota,dados);if(d?.ok){this._fechaModal('mS');this._toast(this._edtId?'Atualizado!':'Adicionado!');this._carregarStreamers();}else this._toast(d?.erro||'Erro','err');
  }
  _confirmarDel(msg,cb){const s=this.shadowRoot;s.getElementById('mCMsg').textContent=msg;s.getElementById('mCOk').onclick=()=>{this._fechaModal('mC');cb();};s.getElementById('mC').classList.add('on');}

  _bindEvents(){
    const s=this.shadowRoot;const dbc=this._dbc.bind(this);
    s.getElementById('btnL').addEventListener('click',()=>this._doLogin());s.getElementById('iP').addEventListener('keydown',e=>{if(e.key==='Enter')this._doLogin();});s.getElementById('iU').addEventListener('keydown',e=>{if(e.key==='Enter')s.getElementById('iP').focus();});
    s.getElementById('btnSair').addEventListener('click',()=>this._doLogout());
    s.getElementById('btnHam').addEventListener('click',()=>s.getElementById('side').classList.toggle('open'));
    s.getElementById('root').addEventListener('click',e=>{const side=s.getElementById('side'),ham=s.getElementById('btnHam');if(side.classList.contains('open')&&!side.contains(e.target)&&e.target!==ham&&!ham.contains(e.target))side.classList.remove('open');});
    s.querySelectorAll('.ni').forEach(n=>n.addEventListener('click',()=>this._ir(n.dataset.p)));
    s.getElementById('btnAtuDash').addEventListener('click',()=>this._carregarDash());s.getElementById('btnAtuLive').addEventListener('click',()=>this._carregarLives());s.getElementById('btnAtuRank').addEventListener('click',()=>this._carregarRanking());s.getElementById('btnAtuDiar').addEventListener('click',()=>this._carregarDiario());s.getElementById('btnAtuDesemp').addEventListener('click',()=>this._carregarDesempenho());s.getElementById('btnAtuHist').addEventListener('click',()=>this._carregarHistorico(true));s.getElementById('btnAtuMet').addEventListener('click',()=>this._carregarMetricas());s.getElementById('btnAtuRec').addEventListener('click',()=>this._carregarRecrutamento());s.getElementById('btnAtuLog').addEventListener('click',()=>this._carregarLogs());s.getElementById('btnAtuCfg').addEventListener('click',()=>this._carregarConfig());
    s.getElementById('btnAddS').addEventListener('click',()=>this._abrirModalS());s.getElementById('mSSave').addEventListener('click',()=>this._salvarStreamer());s.getElementById('mSCancel').addEventListener('click',()=>this._fechaModal('mS'));s.getElementById('mCCancel').addEventListener('click',()=>this._fechaModal('mC'));
    s.getElementById('bS').addEventListener('input',dbc(()=>{this._pg.s=1;this._carregarStreamers();},400));s.getElementById('bL').addEventListener('input',dbc(()=>{this._pg.l=1;this._carregarLogs();},400));
    s.getElementById('root').addEventListener('click',e=>{const cb=e.target.closest('.rec-copy-btn');if(cb){navigator.clipboard.writeText(cb.dataset.copy||'').then(()=>this._toast('Copiado!','ok')).catch(()=>{});}});
    s.querySelectorAll('.ov').forEach(ov=>ov.addEventListener('click',e=>{if(e.target===ov)this._fechaModal(ov.id);}));
    // v2: UIDs
    s.getElementById('btnAtuUIDs').addEventListener('click',()=>this._carregarUids());s.getElementById('btnNovoUID').addEventListener('click',()=>this._abrirModalUID());s.getElementById('btnBuscarUID').addEventListener('click',()=>this._executarBuscaUID());s.getElementById('uidInputVal').addEventListener('keydown',e=>{if(e.key==='Enter')this._executarBuscaUID();});s.getElementById('btnConfirmarUID').addEventListener('click',()=>this._confirmarAutorizarUID());s.getElementById('btnCancelarUID').addEventListener('click',()=>this._fechaModal('mUID'));s.getElementById('uidFiltro').addEventListener('change',()=>{this._pg.uid=1;this._carregarUids();});
    // v2: Carteira
    s.getElementById('btnAtuCart').addEventListener('click',()=>this._carregarCarteiraDash());s.getElementById('btnFecharCart').addEventListener('click',()=>this._fechaModal('mCart'));s.getElementById('btnCancelarOp').addEventListener('click',()=>this._fechaModal('mOp'));s.getElementById('mOpConfirmar').addEventListener('click',()=>this._confirmarOperacao());s.getElementById('btnCreditoRapido').addEventListener('click',()=>this._abrirCreditoRapido());s.getElementById('btnCrBuscar').addEventListener('click',()=>this._buscarStreamerParaCredito());s.getElementById('mCrUid').addEventListener('keydown',e=>{if(e.key==='Enter')this._buscarStreamerParaCredito();});s.getElementById('btnCrConfirmar').addEventListener('click',()=>this._confirmarCreditoRapido());s.getElementById('btnCrCancelar').addEventListener('click',()=>this._fechaModal('mCredito'));
    // v2: Saques
    s.getElementById('btnAtuSaques').addEventListener('click',()=>this._carregarSaques());s.getElementById('saqueFiltro').addEventListener('change',()=>{this._pg.saques=1;this._carregarSaques();});s.getElementById('btnCancelarSaque').addEventListener('click',()=>this._fechaModal('mSaque'));s.getElementById('mSaqueConfirmar').addEventListener('click',()=>this._confirmarSaqueAcao());
    // Modal PIX
    s.getElementById('mPixClose').addEventListener('click',()=>this._fechaModal('mPix'));
    s.getElementById('mPixConfirmar').addEventListener('click',async()=>{
      const saqueId=s.getElementById('mPixSaqueId').value;if(!saqueId){this._toast('ID inválido','err');return;}
      const btn=s.getElementById('mPixConfirmar');btn.disabled=true;btn.textContent='Confirmando...';
      const r=await this._api('POST',`/admin/saques/${saqueId}/processar`,{acao:'marcar_pago',observacao:'PIX pago manualmente'});btn.disabled=false;btn.innerHTML=`${this._ico('check_c',15)} Já Paguei — Confirmar`;
      if(r?.ok){this._fechaModal('mPix');this._toast('✓ Saque marcado como pago!');setTimeout(()=>this._carregarSaques(),1000);}else{this._toast(r?.erro||'Erro','err');}
    });
    // v2: Prêmios
    s.getElementById('btnAtuPremios').addEventListener('click',()=>this._carregarPremios());s.getElementById('btnProcessarPremios').addEventListener('click',()=>this._abrirModalProcessar());s.getElementById('btnCancelarProc').addEventListener('click',()=>this._fechaModal('mProc'));s.getElementById('mProcConfirmar').addEventListener('click',()=>this._confirmarProcessarPremios());
    s.querySelectorAll('.premio-tipo-tab').forEach(tab=>{tab.addEventListener('click',()=>{s.querySelectorAll('.premio-tipo-tab').forEach(t=>t.classList.remove('on'));tab.classList.add('on');this._premioTipo=tab.dataset.tipo;this._renderPremiosConfig();});});
    // Comunicados
    s.getElementById('btnAtuCom').addEventListener('click',()=>this._carregarComunicados());
    s.getElementById('btnNovoRapido').addEventListener('click',()=>this._abrirModalCom(null,'rapido'));
    s.getElementById('btnNovoImportante').addEventListener('click',()=>this._abrirModalCom(null,'importante'));
    s.getElementById('mComSave').addEventListener('click',()=>this._salvarComunicado());
    s.getElementById('mComCancel').addEventListener('click',()=>this._fechaModal('mCom'));
    // Preview ao colar/digitar URL de imagem
    s.getElementById('mComImagem').addEventListener('input',e=>this._atualizarPreviewImagem(e.target.value));
    // Monitor Kwai
    s.getElementById('btnAtuMonitor').addEventListener('click',()=>this._verificarCookieStatus());
    s.getElementById('btnVerificarCookie').addEventListener('click',()=>this._verificarCookieStatus());
    s.getElementById('btnSalvarCookie').addEventListener('click',()=>this._atualizarCookie());
    s.getElementById('btnSimularResgate').addEventListener('click',()=>this._executarResgate(true));
    s.getElementById('btnExecutarResgate').addEventListener('click',()=>this._confirmarDel('Executar correção e gravar dados no banco?',()=>this._executarResgate(false)));
    s.getElementById('btnVerBuffer').addEventListener('click',()=>this._verBufferMonitor());
    s.getElementById('btnTestarTelegram').addEventListener('click',()=>this._testarTelegram());
    // Controle Impulsionamento
    s.getElementById('btnAtuImpulso').addEventListener('click',()=>this._carregarImpulsoCtrl());
    s.getElementById('btnSalvarImpulsoConfig').addEventListener('click',()=>this._salvarImpulsoConfig());
    s.getElementById('btnBuscarBloqUid').addEventListener('click',()=>this._buscarStreamerBloqueio());
    s.getElementById('btnAplicarBloqueio').addEventListener('click',()=>this._bloquearStreamer());
    s.getElementById('btnAtuBloqueios').addEventListener('click',async()=>{const blq=await this._api('GET','/admin/impulso/bloqueios');this._renderBloqueios(blq?.bloqueios||[]);});
  }

  // ── COMUNICADOS ─────────────────────────────────────────────────────────────
  async _carregarComunicados(){
    const s=this.shadowRoot;const el=s.getElementById('tbCom');if(el)el.innerHTML=this._loading();
    const d=await this._api('GET','/admin/comunicados');
    if(!d?.ok){if(el)el.innerHTML=this._empty('warning','Erro ao carregar comunicados');return;}
    this._renderComunicados(d.comunicados||[]);
  }

  _renderComunicados(lista){
    const s=this.shadowRoot;const el=s.getElementById('tbCom');if(!el)return;
    const LOCAIS_LABEL={ranking:'Ranking Geral',painel:'Painel/App',impulsionamento:'Impulsionamento'};
    if(!lista.length){el.innerHTML=this._empty('bell','Nenhum comunicado criado ainda');return;}
    el.innerHTML=`<div class="com-lista">${lista.map(c=>{
      const locaisBadges=(c.locais||[]).map(l=>`<span class="com-local">${LOCAIS_LABEL[l]||l}</span>`).join('');
      const statusBadge=c.ativo
        ?`<span class="com-status ativo">Ativo</span>`
        :`<span class="com-status inativo">Inativo</span>`;
      const tipoBadge=c.tipo==='importante'
        ?`<span class="com-status" style="background:rgba(0,212,212,.1);color:var(--cyan);border-color:rgba(0,212,212,.3)">📌 Importante</span>`
        :`<span class="com-status" style="background:rgba(240,192,64,.1);color:var(--gold);border-color:rgba(240,192,64,.3)">⚡ Rápido</span>`;
      const destaqueBadge=c.destaque?`<span class="com-status" style="background:rgba(240,192,64,.15);color:var(--gold);border-color:rgba(240,192,64,.3)">⭐ Destaque</span>`:'';
      const dataStr=c.criado_em?this._fdtCurto(c.criado_em):'—';
      const atualStr=c.atualizado_em&&c.atualizado_em!==c.criado_em?` · atualizado ${this._fdtCurto(c.atualizado_em)}`:'';
      const thumbHtml=c.imagem_url
        ?`<img src="${this._esc(c.imagem_url)}" alt="" style="width:48px;height:48px;object-fit:cover;border-radius:8px;flex-shrink:0;border:1px solid var(--brddim)">`
        :(c.emoji?`<span class="com-emoji">${c.emoji}</span>`:'');
      const titulo=c.titulo?`<strong style="display:block;font-size:13px;color:var(--t1);margin-bottom:2px">${this._esc(c.titulo)}</strong>`:'';
      return`<div class="com-item">
        <div class="com-preview" style="align-items:flex-start;gap:10px">
          ${thumbHtml}
          <div style="flex:1;min-width:0">
            ${titulo}
            <span class="com-texto">${this._esc(c.texto)}</span>
          </div>
        </div>
        <div class="com-meta">
          <div class="com-meta-esq">${tipoBadge}${statusBadge}${destaqueBadge}${locaisBadges}</div>
          <div class="com-data">${dataStr}${atualStr}</div>
        </div>
        <div class="com-acoes">
          <button class="btn btn-o btn-sm" data-com-edit="${c.id}">${this._ico('edit',12)} Editar</button>
          <button class="btn btn-sm com-toggle ${c.ativo?'btn-o':'btn-g'}" data-com-toggle="${c.id}" data-com-ativo="${c.ativo}">${c.ativo?`${this._ico('x_circle',12)} Desativar`:`${this._ico('check',12)} Ativar`}</button>
          <button class="btn btn-sm" style="background:rgba(248,113,113,.12);border:1px solid rgba(248,113,113,.4);color:var(--verm)" data-com-del="${c.id}">${this._ico('trash',12)} Excluir</button>
        </div>
      </div>`;
    }).join('')}</div>`;

    el.querySelectorAll('[data-com-edit]').forEach(btn=>btn.addEventListener('click',()=>{
      const c=lista.find(x=>x.id===btn.dataset.comEdit);if(c)this._abrirModalCom(c);
    }));
    el.querySelectorAll('[data-com-toggle]').forEach(btn=>btn.addEventListener('click',()=>{
      const ativo=btn.dataset.comAtivo==='true';this._toggleComunicadoAtivo(btn.dataset.comToggle,!ativo);
    }));
    el.querySelectorAll('[data-com-del]').forEach(btn=>btn.addEventListener('click',()=>{
      this._confirmarDel('Excluir este comunicado permanentemente?',()=>this._excluirComunicado(btn.dataset.comDel));
    }));
  }

  _esc(str){if(str==null)return'';return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}

  _abrirModalCom(c=null, tipoForcado=null){
    const s=this.shadowRoot;
    const tipo = tipoForcado || c?.tipo || 'rapido';
    const isImp = tipo === 'importante';

    // Título do modal
    if(c) {
      s.getElementById('mComTit').textContent = isImp ? 'Editar Aviso Importante' : 'Editar Aviso Rápido';
    } else {
      s.getElementById('mComTit').textContent = isImp ? 'Novo Aviso Importante' : 'Novo Aviso Rápido';
    }

    // Badge de tipo no modal
    const badge = s.getElementById('mComTipoBadge');
    if(badge){
      badge.textContent = isImp ? '📌 Importante' : '⚡ Rápido';
      badge.style.cssText = isImp
        ? 'display:inline-block;font-size:11px;padding:2px 10px;border-radius:20px;background:rgba(0,212,212,.12);color:var(--cyan);border:1px solid rgba(0,212,212,.3);margin-bottom:12px;font-family:Rajdhani,sans-serif;font-weight:700;letter-spacing:.05em'
        : 'display:inline-block;font-size:11px;padding:2px 10px;border-radius:20px;background:rgba(240,192,64,.12);color:var(--gold);border:1px solid rgba(240,192,64,.3);margin-bottom:12px;font-family:Rajdhani,sans-serif;font-weight:700;letter-spacing:.05em';
    }

    // Guarda o tipo para o salvar
    this._edtComTipo = tipo;

    // Mostra/oculta seções por tipo
    const secRapido    = s.getElementById('mComSecRapido');
    const secImportante= s.getElementById('mComSecImportante');
    if(secRapido)    secRapido.style.display    = isImp ? 'none' : 'block';
    if(secImportante)secImportante.style.display = isImp ? 'block' : 'none';

    // Preenche campos (texto vai para o campo certo por tipo)
    s.getElementById('mComTitulo').value    = c?.titulo      || '';
    s.getElementById('mComDescricao').value = c?.descricao   || '';
    if(isImp){
      const ti = s.getElementById('mComTexto_imp'); if(ti) ti.value = c?.texto || '';
      const tr = s.getElementById('mComTexto');     if(tr) tr.value = '';
    } else {
      const tr = s.getElementById('mComTexto');     if(tr) tr.value = c?.texto || '';
      const ti = s.getElementById('mComTexto_imp'); if(ti) ti.value = '';
    }
    s.getElementById('mComImagem').value    = c?.imagem_url  || '';
    s.getElementById('mComLinkLabel').value = c?.link_label  || '';
    s.getElementById('mComLinkUrl').value   = c?.link_url    || '';
    s.getElementById('mComLink2Label').value= c?.link2_label || '';
    s.getElementById('mComLink2Url').value  = c?.link2_url   || '';
    s.getElementById('mComEmoji').value     = c?.emoji       || '';
    s.getElementById('mComAtivo').value     = c ? (c.ativo?'true':'false') : 'true';
    s.getElementById('mComDestaque').checked= c?.destaque    || false;
    this._atualizarPreviewImagem(c?.imagem_url||'');
    const locais=c?.locais||[];
    ['home','ranking','painel','impulsionamento'].forEach(l=>{
      const cb=s.getElementById('mComLocal_'+l);if(cb)cb.checked=locais.includes(l);
    });
    this._edtCom=c?.id||null;
    this._abrirModal('mCom');
  }

  _atualizarPreviewImagem(url){
    const s=this.shadowRoot;
    const wrap=s.getElementById('mComImagemPreview');
    const img =s.getElementById('mComImgEl');
    if(!wrap||!img)return;
    if(url&&url.trim()){
      img.src=url.trim();
      img.onerror=()=>{wrap.style.display='none';};
      img.onload =()=>{wrap.style.display='block';};
      wrap.style.display='block';
    }else{
      wrap.style.display='none';
      img.src='';
    }
  }

  async _salvarComunicado(){
    const s=this.shadowRoot;
    const tipo        = this._edtComTipo || 'rapido';
    const isImp       = tipo === 'importante';
    const titulo      = s.getElementById('mComTitulo').value.trim();
    const descricao   = s.getElementById('mComDescricao').value.trim();
    // Lê o campo de texto correto por tipo
    const textoEl     = isImp ? s.getElementById('mComTexto_imp') : s.getElementById('mComTexto');
    const texto       = textoEl?.value.trim() || '';
    const imagem_url  = s.getElementById('mComImagem').value.trim();
    const link_label  = s.getElementById('mComLinkLabel').value.trim();
    const link_url    = s.getElementById('mComLinkUrl').value.trim();
    const link2_label = s.getElementById('mComLink2Label').value.trim();
    const link2_url   = s.getElementById('mComLink2Url').value.trim();
    const emoji       = s.getElementById('mComEmoji').value.trim();
    const ativo       = s.getElementById('mComAtivo').value==='true';
    const destaque    = s.getElementById('mComDestaque').checked;
    const locais      = ['home','ranking','painel','impulsionamento'].filter(l=>s.getElementById('mComLocal_'+l)?.checked);
    if(!texto){this._toast('Texto é obrigatório','err');return;}
    const btn=s.getElementById('mComSave');btn.disabled=true;
    const payload={tipo,emoji,titulo,descricao,texto,imagem_url,link_url,link_label,link2_url,link2_label,destaque,ativo,locais};
    let r;
    if(this._edtCom){
      r=await this._api('PUT',`/admin/comunicados/${this._edtCom}`,payload);
    }else{
      r=await this._api('POST','/admin/comunicados',payload);
    }
    btn.disabled=false;
    if(r?.ok){this._fechaModal('mCom');this._toast(this._edtCom?'Comunicado atualizado!':'Comunicado criado!');this._carregarComunicados();}
    else{this._toast(r?.erro||'Erro ao salvar','err');}
  }

  async _excluirComunicado(id){
    const r=await this._api('DELETE',`/admin/comunicados/${id}`);
    if(r?.ok){this._toast('Comunicado excluído');this._carregarComunicados();}
    else this._toast(r?.erro||'Erro ao excluir','err');
  }

  async _toggleComunicadoAtivo(id,novoAtivo){
    const r=await this._api('PATCH',`/admin/comunicados/${id}`,{ativo:novoAtivo});
    if(r?.ok){this._toast(novoAtivo?'Comunicado ativado':'Comunicado desativado');this._carregarComunicados();}
    else this._toast(r?.erro||'Erro','err');
  }

  // ── MONITOR KWAI ────────────────────────────────────────────
  async _carregarMonitor(){
    this._verificarCookieStatus();
  }
  async _verificarCookieStatus(){
    const el=this.shadowRoot.getElementById('monCookieStatus');
    el.style.cssText='display:flex;align-items:center;gap:10px;padding:12px 14px;border-radius:10px;background:rgba(255,255,255,.04);border:1px solid var(--brddim);font-size:13px;color:var(--t3)';
    el.textContent='Verificando...';
    const d=await this._api('GET','/admin/monitor/cookie-status');
    if(!d){el.innerHTML=`<span style="color:var(--verm)">${this._ico('warning',14)} Erro de conexão com o monitor</span>`;return;}
    if(d.erro){el.innerHTML=`<span style="color:var(--verm)">${this._ico('warning',14)} ${this._esc(d.erro)}</span>`;return;}
    const vivo=d.status==='COOKIE_VIVO';
    const cor=vivo?'var(--verde)':'var(--verm)';
    const ico=vivo?this._ico('check_c',16):this._ico('x_circle',16);
    const txt=vivo?`Cookie ativo — ${d.total_itens??0} live(s) visível(is) no histórico`:'Cookie expirado ou inválido — precisa atualizar';
    el.style.borderColor=vivo?'rgba(74,222,128,.3)':'rgba(248,113,113,.3)';
    el.style.background=vivo?'rgba(74,222,128,.07)':'rgba(248,113,113,.07)';
    el.innerHTML=`<span style="color:${cor};display:flex;align-items:center;gap:6px">${ico} <strong>${d.status??'—'}</strong></span><span style="color:var(--t2)">${txt}</span>`;
  }
  async _atualizarCookie(){
    const s=this.shadowRoot;
    const cookie=s.getElementById('monCookieInput').value.trim();
    if(!cookie||cookie.length<50){this._toast('Cookie muito curto ou vazio','err');return;}
    const d=await this._api('POST','/admin/monitor/atualizar-cookie',{cookie});
    if(d?.status){this._toast('Cookie atualizado!');s.getElementById('monCookieInput').value='';this._verificarCookieStatus();}
    else this._toast(d?.erro||'Erro ao salvar cookie','err');
  }
  async _executarResgate(preview){
    const s=this.shadowRoot;
    const dias=parseInt(s.getElementById('monDias').value)||7;
    const statusEl=s.getElementById('monResgateStatus');
    const resultEl=s.getElementById('monResgateResult');
    statusEl.style.display='block';
    statusEl.innerHTML=`<div style="display:flex;align-items:center;gap:8px;color:var(--t3);font-size:12px">${this._ico('refresh',13)} ${preview?'Simulando':'Executando correção'} dos últimos ${dias} dias... (pode levar até 60s)</div>`;
    resultEl.style.display='none';
    const rota=preview?'/admin/monitor/preview':'/admin/monitor/corrigir';
    const d=await this._api('GET',`${rota}?dias=${dias}`);
    statusEl.style.display='none';
    resultEl.style.display='block';
    if(!d){resultEl.textContent='Erro de conexão com o monitor.';return;}
    if(d.erro){resultEl.textContent=`Erro: ${d.erro}`;return;}
    // Formata resumo legível
    const linhas=[
      `Modo:        ${d.modo||d.status||'—'}`,
      `Dias alvo:   ${d.dias_alvo??'—'}`,
      `Total Kwai:  ${d.total_kwai_bruto??'—'} lives brutas`,
      `Válidos:     ${d.total_valido??'—'}`,
      `Inseridas:   ${d.inseridas?.length??0}`,
      `Corrigidas:  ${d.corrigidas?.length??0}`,
      `Ignoradas (recentes): ${d.ignoradas_recentes??0}`,
      `Ignoradas (iguais):   ${d.ignoradas_iguais??0}`,
      `Erros:       ${d.erros?.length??0}`,
      `Duração:     ${d.duracao_segundos??'—'}s`,
    ];
    if(d.inseridas?.length>0){
      linhas.push('','── Inseridas ──');
      d.inseridas.slice(0,20).forEach(x=>linhas.push(`  ${x.nome||x.live_id} | ${x.data} | ${x.diamantes}💎`));
      if(d.inseridas.length>20)linhas.push(`  ... +${d.inseridas.length-20} mais`);
    }
    if(d.corrigidas?.length>0){
      linhas.push('','── Corrigidas ──');
      d.corrigidas.slice(0,20).forEach(x=>linhas.push(`  ${x.nome||x.live_id} | ${x.data} | banco:${x.banco_diamantes}💎 → kwai:${x.kwai_diamantes}💎`));
      if(d.corrigidas.length>20)linhas.push(`  ... +${d.corrigidas.length-20} mais`);
    }
    if(d.erros?.length>0){
      linhas.push('','── Erros ──');
      d.erros.forEach(e=>linhas.push(`  ${e}`));
    }
    resultEl.textContent=linhas.join('\n');
  }
  async _verBufferMonitor(){
    const el=this.shadowRoot.getElementById('monBufferResult');
    el.textContent='Carregando...';
    const d=await this._api('GET','/admin/monitor/debug-buffer');
    if(!d||d.erro){el.innerHTML=`<span style="color:var(--verm)">${d?.erro||'Erro de conexão'}</span>`;return;}
    if(!d.total_no_buffer){el.innerHTML='<span style="color:var(--verde)">Buffer vazio — nenhum dado pendente.</span>';return;}
    el.innerHTML=`<div style="margin-bottom:8px;color:var(--cyan);font-weight:600">${d.total_no_buffer} item(s) no buffer</div>`
      +`<div style="display:flex;flex-direction:column;gap:4px">${(d.itens||[]).slice(0,30).map(i=>
        `<div style="display:flex;gap:8px;font-size:11px;color:var(--t2);border-bottom:1px solid var(--brddim);padding-bottom:4px">
          <span style="color:var(--t3);min-width:80px">${i.data||'—'}</span>
          <span style="flex:1">${this._esc(i.nome||'—')}</span>
          <span style="color:var(--cyan)">${i.diamantes??0}💎</span>
          <span style="color:var(--t3)">${i.minutos_live??0}min</span>
        </div>`).join('')}
      ${d.total_no_buffer>30?`<div style="color:var(--t3);font-size:11px">... +${d.total_no_buffer-30} mais</div>`:''}</div>`;
  }
  async _testarTelegram(){
    const d=await this._api('POST','/admin/monitor/testar-telegram');
    if(d?.status)this._toast('Mensagem enviada! Verifique o Telegram.');
    else this._toast(d?.erro||'Erro ao enviar','err');
  }

  // ── CONTROLE DE IMPULSIONAMENTO ──────────────────────────────
  async _carregarImpulsoCtrl(){
    // Carrega config e bloqueios em paralelo
    const [cfg,blq]=await Promise.all([
      this._api('GET','/admin/impulso/config'),
      this._api('GET','/admin/impulso/bloqueios'),
    ]);
    const s=this.shadowRoot;
    if(cfg?.ok){
      s.getElementById('iQuotaMax').value=cfg.quota_max??5;
      s.getElementById('iOpcao30min').checked=cfg.opcao_30min!==false;
      s.getElementById('iOpcao1hora').checked=cfg.opcao_1hora!==false;
    }
    this._renderBloqueios(blq?.bloqueios||[]);
  }
  async _salvarImpulsoConfig(){
    const s=this.shadowRoot;
    const quota_max=parseInt(s.getElementById('iQuotaMax').value)||5;
    const opcao_30min=s.getElementById('iOpcao30min').checked;
    const opcao_1hora=s.getElementById('iOpcao1hora').checked;
    const r=await this._api('POST','/admin/impulso/config',{quota_max,opcao_30min,opcao_1hora});
    if(r?.ok)this._toast('Configurações salvas!');
    else this._toast(r?.erro||'Erro ao salvar','err');
  }
  async _buscarStreamerBloqueio(){
    const s=this.shadowRoot;
    const uid=s.getElementById('iBloqUid').value.trim();
    if(!uid)return;
    const infoEl=s.getElementById('iBloqStreamerInfo');
    infoEl.style.display='block';infoEl.textContent='Buscando...';
    // Busca pelo nome do streamer via ranking (lista de streamers cadastrados)
    const d=await this._api('GET',`/admin/streamers?uid=${encodeURIComponent(uid)}`);
    const match=(d?.perfis||[])[0];
    if(match){
      infoEl.innerHTML=`<strong style="color:var(--cyan)">${this._esc(match.nome)}</strong><br><span style="color:var(--t3)">UID: ${uid}</span>`;
    } else {
      infoEl.innerHTML=`<span style="color:var(--t3)">UID: ${uid} (não encontrado no cadastro)</span>`;
    }
  }
  async _bloquearStreamer(){
    const s=this.shadowRoot;
    const kwai_uid=s.getElementById('iBloqUid').value.trim();
    const motivo=s.getElementById('iBloqMotivo').value.trim();
    const expiraRaw=s.getElementById('iBloqExpira').value;
    if(!kwai_uid||!motivo){this._toast('Preencha UID e motivo','err');return;}
    const body={kwai_uid,motivo};
    if(expiraRaw)body.expira_em=new Date(expiraRaw+'T23:59:59').toISOString();
    const r=await this._api('POST','/admin/impulso/bloqueios',body);
    if(r?.ok){
      this._toast('Streamer bloqueado!');
      s.getElementById('iBloqUid').value='';
      s.getElementById('iBloqMotivo').value='';
      s.getElementById('iBloqExpira').value='';
      s.getElementById('iBloqStreamerInfo').style.display='none';
      const blq=await this._api('GET','/admin/impulso/bloqueios');
      this._renderBloqueios(blq?.bloqueios||[]);
    } else this._toast(r?.erro||'Erro ao bloquear','err');
  }
  async _revogarBloqueio(id){
    const r=await this._api('PATCH',`/admin/impulso/bloqueios/${id}`,{ativo:false});
    if(r?.ok){
      this._toast('Bloqueio revogado');
      const blq=await this._api('GET','/admin/impulso/bloqueios');
      this._renderBloqueios(blq?.bloqueios||[]);
    } else this._toast(r?.erro||'Erro','err');
  }
  _renderBloqueios(lista){
    const s=this.shadowRoot;const el=s.getElementById('tbBloqueios');
    if(!lista.length){el.innerHTML=this._empty('check_c','Nenhum bloqueio ativo');return;}
    el.innerHTML=`<div class="bloq-lista">${lista.map(b=>`
      <div class="bloq-item">
        <div class="bloq-info">
          <div class="bloq-uid">${this._ico('lock_r',13)} UID: <strong>${this._esc(b.kwai_uid)}</strong></div>
          <div class="bloq-motivo">${this._esc(b.motivo||'—')}</div>
          <div class="bloq-meta">
            Bloqueado: ${this._fdtCurto(b.bloqueado_em)}
            ${b.expira_em?` • Expira: ${this._fdtCurto(b.expira_em)}`:'<span style="color:var(--verm);margin-left:6px">Permanente</span>'}
            ${b.bloqueado_por?` • por ${this._esc(b.bloqueado_por)}`:''}
          </div>
        </div>
        <button class="btn btn-o btn-sm bloq-rev" data-rev="${b.id}">${this._ico('unlock',12)} Revogar</button>
      </div>`).join('')}</div>`;
    el.querySelectorAll('.bloq-rev').forEach(btn=>{
      btn.addEventListener('click',()=>this._confirmarDel('Revogar este bloqueio?',()=>this._revogarBloqueio(btn.dataset.rev)));
    });
  }

  _css(){return`
    :host{display:block;width:100%;height:auto;min-height:600px;overflow:visible;background:#040414;
      --cyan:#00d4d4;--cyan-d:rgba(0,212,212,.15);--azul:#3b82f6;--grad:linear-gradient(135deg,#3b82f6 0%,#00e5e5 100%);
      --bg0:#04040e;--bg1:#0b0b1a;--brd:rgba(0,230,230,.18);--brddim:rgba(0,212,212,.08);--glass:rgba(18,18,32,.85);
      --t1:#fff;--t2:#d0d8e8;--t3:#a0b8c8;--verde:#4ade80;--verm:#f87171;--gold:#f0c040;--r:16px;--rs:10px;}
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    #root{width:100%;min-height:600px;overflow:visible;background:linear-gradient(180deg,var(--bg1),var(--bg0));color:var(--t1);font-family:'Exo 2',sans-serif;display:flex;flex-direction:column;position:relative;}
    .glass{background:var(--glass);border:1px solid var(--brd);border-radius:20px;position:relative;overflow:hidden;backdrop-filter:blur(12px)}.glass::after{content:'';position:absolute;bottom:0;left:0;right:0;background:var(--grad);height:2px}
    #login{position:absolute;inset:0;min-height:600px;background:rgba(4,4,14,.98);display:flex;align-items:center;justify-content:center;z-index:90}
    .lbox{padding:36px 28px;width:90%;max-width:370px;text-align:center}.lbox h2{font-family:'Rajdhani',sans-serif;font-size:clamp(1.2rem,4vw,1.7rem);background:var(--grad);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:20px}
    .lchip{display:inline-flex;align-items:center;gap:6px;background:var(--cyan-d);border:1px solid rgba(0,212,212,.4);border-radius:99px;padding:3px 12px;font-size:10px;color:var(--cyan);font-family:'Rajdhani',sans-serif;letter-spacing:2px;margin-bottom:20px}
    .ldot{width:6px;height:6px;background:var(--cyan);border-radius:50%;animation:bl 1.6s infinite}
    .campo{margin-bottom:13px;text-align:left}.campo input{width:100%;padding:12px 13px;background:rgba(0,0,0,.5);border:1px solid var(--brd);border-radius:var(--rs);color:var(--t1);font-family:'Exo 2',sans-serif;font-size:14px;outline:none;transition:border-color .2s,box-shadow .2s}.campo input:focus{border-color:var(--cyan);box-shadow:0 0 10px var(--cyan-d)}
    .btn-login{width:100%;padding:12px;background:var(--grad);border:none;border-radius:var(--rs);color:#fff;font-family:'Rajdhani',sans-serif;font-size:16px;font-weight:700;letter-spacing:2px;cursor:pointer;transition:all .3s}.btn-login:hover{transform:translateY(-2px);box-shadow:0 5px 20px rgba(59,130,246,.4)}
    .lerr{margin-top:10px;padding:8px 12px;border-radius:var(--rs);background:rgba(248,113,113,.12);border:1px solid var(--verm);color:var(--verm);font-size:12px;text-align:center;display:none}
    .lload{display:none;align-items:center;justify-content:center;gap:8px;margin-top:10px;color:var(--t3);font-size:12px}.lload.on{display:flex}
    #app{display:none;flex-direction:column;min-height:600px}#app.on{display:flex}
    .top{height:52px;background:rgba(11,11,26,.95);border-bottom:1px solid var(--brd);display:flex;align-items:center;padding:0 16px;gap:12px;flex-shrink:0;position:relative;backdrop-filter:blur(10px)}.top::after{content:'';position:absolute;bottom:0;left:0;right:0;height:2px;background:var(--grad)}
    .top-chip{font-size:9px;font-family:'Rajdhani',sans-serif;letter-spacing:2px;background:var(--cyan-d);border:1px solid rgba(0,212,212,.3);color:var(--cyan);border-radius:99px;padding:2px 9px}.top-sp{flex:1}
    .btn-sair{padding:5px 10px;border:1px solid var(--brddim);border-radius:var(--rs);background:transparent;color:var(--t3);font-size:11px;cursor:pointer;transition:all .2s;display:flex;align-items:center;gap:5px}.btn-sair:hover{border-color:var(--verm);color:var(--verm)}
    .btn-ham{width:32px;height:32px;background:rgba(0,0,0,.4);border:1px solid var(--brddim);border-radius:var(--rs);display:none;align-items:center;justify-content:center;cursor:pointer;color:var(--t3)}
    .shell{display:flex;flex:1;min-height:548px;}
    .side{width:220px;flex-shrink:0;background:rgba(8,8,20,.95);border-right:1px solid var(--brd);padding:10px 0;overflow-y:auto;}
    .ns{padding:8px 14px 2px;font-size:9px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:rgba(0,212,212,.55);font-family:'Rajdhani',sans-serif}
    .ni{display:flex;align-items:center;gap:8px;padding:9px 16px;cursor:pointer;color:var(--t3);font-size:12px;border-left:2px solid transparent;transition:all .15s;user-select:none;font-family:'Exo 2',sans-serif}.ni:hover{background:rgba(59,130,246,.08);color:var(--t1)}.ni.on{background:rgba(59,130,246,.12);border-left-color:var(--azul);color:var(--azul)}.ni.on svg{filter:drop-shadow(0 0 5px rgba(59,130,246,.6))}
    .ni .ico{width:16px;flex-shrink:0;display:flex;align-items:center}.ni .nlb{flex:1}
    .nb{font-size:9px;font-family:'Rajdhani',sans-serif;background:var(--cyan-d);color:var(--cyan);border:1px solid rgba(0,212,212,.3);border-radius:99px;padding:1px 6px}.nb.live{background:rgba(248,113,113,.2);color:var(--verm);border-color:rgba(248,113,113,.4);animation:bl 1.8s infinite}.nb.gold{background:rgba(240,192,64,.2);color:var(--gold);border-color:rgba(240,192,64,.4)}
    .content{flex:1;padding:20px;background:linear-gradient(180deg,var(--bg1),var(--bg0));min-height:0;}
    .pag{display:none}.pag.on{display:block;animation:fadeUp .3s ease both}
    .ph{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:10px}
    .titulo{font-family:'Rajdhani',sans-serif;font-size:clamp(1rem,3vw,1.4rem);font-weight:700;letter-spacing:2px;color:var(--t1);text-transform:uppercase;display:flex;align-items:center;gap:8px}.psub{font-size:11px;color:var(--t3);margin-top:3px}.ph-r{display:flex;gap:7px;align-items:center;flex-wrap:wrap}
    
    /* ── Dashboard cards coloridos 2x2 ── */
    .dc2-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:20px}
    .dc2{border-radius:var(--r);padding:18px 14px 14px;position:relative;overflow:hidden;cursor:default;transition:transform .2s,box-shadow .2s,filter .2s;border:1px solid transparent;box-shadow:0 10px 30px rgba(0,0,0,.34),inset 0 1px 0 rgba(255,255,255,.08);}
    @media(hover:hover){.dc2:hover{transform:translateY(-3px);filter:saturate(1.12);box-shadow:0 14px 38px rgba(0,0,0,.46),0 0 22px rgba(0,212,212,.08);}}
    .dc2-ico{position:absolute;top:12px;right:12px;opacity:.38}
    .dc2-blink{animation:bl 1.8s infinite}
    .dc2-val{font-family:'Rajdhani',sans-serif;font-size:clamp(1.5rem,4vw,2.2rem);font-weight:700;line-height:1;margin-top:28px;margin-bottom:4px;color:#fff}
    .dc2-lbl{font-size:10px;letter-spacing:1.5px;text-transform:uppercase;opacity:.75;font-family:'Rajdhani',sans-serif}
    .dc2-indigo{background:linear-gradient(135deg,rgba(79,70,229,.78),rgba(168,85,247,.52));border-color:rgba(167,139,250,.82);}.dc2-indigo .dc2-ico,.dc2-indigo .dc2-val{color:#d8b4fe;text-shadow:0 0 18px rgba(168,85,247,.7)}
    .dc2-verm{background:linear-gradient(135deg,rgba(220,38,38,.78),rgba(249,115,22,.55));border-color:rgba(248,113,113,.82);}.dc2-verm .dc2-ico,.dc2-verm .dc2-val{color:#fecaca;text-shadow:0 0 18px rgba(248,113,113,.7)}
    .dc2-verde{background:linear-gradient(135deg,rgba(22,163,74,.78),rgba(5,150,105,.52));border-color:rgba(74,222,128,.82);}.dc2-verde .dc2-ico,.dc2-verde .dc2-val{color:#bbf7d0;text-shadow:0 0 18px rgba(34,197,94,.68)}
    .dc2-cyan{background:linear-gradient(135deg,rgba(37,99,235,.78),rgba(0,212,212,.55));border-color:rgba(34,211,238,.86);}.dc2-cyan .dc2-ico,.dc2-cyan .dc2-val{color:#a5f3fc;text-shadow:0 0 18px rgba(0,212,212,.72)}
    .dc2-gold{background:linear-gradient(135deg,rgba(217,119,6,.8),rgba(234,179,8,.56));border-color:rgba(251,191,36,.86);}.dc2-gold .dc2-ico,.dc2-gold .dc2-val{color:#fef3c7;text-shadow:0 0 18px rgba(245,158,11,.72)}
    .dc2-slate{background:linear-gradient(135deg,rgba(51,65,85,.82),rgba(14,165,233,.32));border-color:rgba(148,163,184,.72);}.dc2-slate .dc2-ico,.dc2-slate .dc2-val{color:#e2e8f0;text-shadow:0 0 16px rgba(148,163,184,.55)}
    /* ── Widget Ao Vivo no Dashboard ── */
    .dlw-empty{display:flex;align-items:center;gap:8px;padding:16px;color:var(--t3);font-size:12px;font-family:'Exo 2',sans-serif}
    .dlw-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
    .dlw-item{border-radius:var(--rs);overflow:hidden;cursor:pointer;transition:transform .15s;border:1px solid rgba(248,113,113,.2);}
    @media(hover:hover){.dlw-item:hover{transform:scale(1.03);border-color:rgba(248,113,113,.5)}}
    .dlw-thumb{height:64px;background:#111;display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,.2)}
    .dlw-meta{background:rgba(0,0,0,.5)}
    .dlw-name{font-family:'Rajdhani',sans-serif;font-size:11px;font-weight:700;color:var(--t1);padding:3px 6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .dlw-espect{font-family:'Rajdhani',sans-serif;font-size:10px;color:var(--t3);padding:0 6px 4px}
    .dlw-est-1 .dlw-item{display:grid;grid-template-columns:minmax(72px,42%) minmax(0,1fr)}
    .dlw-est-1 .dlw-thumb{height:82px}
    .dlw-est-1 .dlw-meta{display:flex;flex-direction:column;justify-content:center;min-width:0}
    .dlw-mais{display:flex;align-items:center;justify-content:center;border-radius:var(--rs);border:1px dashed rgba(0,212,212,.3);color:var(--cyan);font-family:'Rajdhani',sans-serif;font-size:16px;font-weight:700;height:100%;min-height:100px;cursor:pointer}
    /* ── Ações Rápidas ── */
    .qa-lista{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;padding:14px}
    .qa-card{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;column-gap:12px;min-height:92px;padding:14px 14px 13px 16px;cursor:pointer;border:1px solid rgba(0,212,212,.16);border-radius:var(--r);position:relative;overflow:hidden;transition:background .15s,border-color .15s,transform .15s;box-shadow:0 8px 24px rgba(0,0,0,.24),inset 0 1px 0 rgba(255,255,255,.05);}
    .qa-card:last-child{border-bottom:1px solid rgba(0,212,212,.16)}
    @media(hover:hover){.qa-card:hover{background:rgba(0,212,212,.07);border-color:rgba(0,212,212,.32);transform:translateY(-2px);}}
    .qa-card:active{background:rgba(0,212,212,.1)}
    .qa-card::before{content:'';position:absolute;left:0;right:0;top:0;height:3px;background:var(--qa-cor,var(--cyan));box-shadow:0 0 14px var(--qa-cor,var(--cyan))}
    .qa-card::after{content:'';position:absolute;right:-30px;bottom:-30px;width:96px;height:96px;border-radius:50%;filter:blur(28px);opacity:.16;background:var(--qa-cor,var(--cyan))}
    .qa-txt{min-width:0;position:relative;z-index:1}.qa-lbl{font-family:'Rajdhani',sans-serif;font-size:15px;font-weight:700;letter-spacing:.5px;color:#fff;line-height:1.08;overflow-wrap:anywhere;word-break:normal}.qa-sub{font-size:10px;color:rgba(255,255,255,.55);margin-top:5px;font-family:'Exo 2',sans-serif;line-height:1.25;overflow-wrap:anywhere}
    .qa-actions{display:flex;align-items:center;justify-content:flex-end;gap:8px;min-width:max-content;position:relative;z-index:1}.qa-config-btn{width:34px;height:34px;border-radius:10px;border:1px solid rgba(0,212,212,.38);background:rgba(0,212,212,.08);color:var(--cyan);display:flex;align-items:center;justify-content:center;cursor:pointer;position:relative;z-index:2}.qa-config-btn:hover{background:rgba(0,212,212,.16);border-color:var(--cyan)}
    .qa-ico-wrap{width:42px;height:42px;border-radius:12px;display:flex;align-items:center;justify-content:center;flex-shrink:0;background:rgba(0,212,212,.09);border:1px solid rgba(0,212,212,.28);color:var(--cyan);box-shadow:0 0 16px rgba(0,212,212,.08)}
    .qa-indigo{--qa-cor:#8b5cf6;background:linear-gradient(90deg,rgba(139,92,246,.1),rgba(0,212,212,.025))}
    .qa-verm{--qa-cor:#f87171;background:linear-gradient(90deg,rgba(248,113,113,.1),rgba(0,212,212,.025))}
    .qa-verde{--qa-cor:#4ade80;background:linear-gradient(90deg,rgba(74,222,128,.1),rgba(0,212,212,.025))}
    .qa-cyan{--qa-cor:#22d3ee;background:linear-gradient(90deg,rgba(34,211,238,.1),rgba(0,212,212,.025))}
    .qa-gold{--qa-cor:#facc15;background:linear-gradient(90deg,rgba(250,204,21,.1),rgba(0,212,212,.025))}
    .qa-slate{--qa-cor:#38bdf8;background:linear-gradient(90deg,rgba(56,189,248,.1),rgba(0,212,212,.025))}
    .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;margin-bottom:16px}
    .card{background:var(--glass);border:1px solid var(--brd);border-radius:var(--r);padding:16px 14px;position:relative;overflow:hidden;transition:border-color .2s,transform .2s,box-shadow .2s;box-shadow:0 4px 20px rgba(0,0,0,.3)}@media(hover:hover){.card:hover{border-color:var(--cyan);transform:translateY(-2px);box-shadow:0 8px 28px rgba(0,0,0,.4);}}.card::after{content:'';position:absolute;bottom:0;left:0;right:0;height:1px;background:var(--grad)}.card::before{content:'';position:absolute;top:-20px;right:-20px;width:60px;height:60px;border-radius:50%;filter:blur(24px);opacity:.12}
    .card.az::before,.card.cy::before{background:var(--cyan)}.card.vd::before{background:var(--verde)}.card.vm::before{background:var(--verm)}
    .card svg{margin-bottom:4px;opacity:.4;width:14px;height:14px}.card-val{font-family:'Rajdhani',sans-serif;font-size:clamp(1.1rem,4vw,1.8rem);font-weight:700;line-height:1.1;word-break:break-word;overflow-wrap:anywhere;}
    .card.az .card-val,.card.cy .card-val{color:var(--cyan);text-shadow:0 0 15px var(--cyan-d)}.card.vd .card-val{color:var(--verde)}.card.vm .card-val{color:var(--verm)}.card-lbl{font-size:10px;color:var(--t3);letter-spacing:2px;text-transform:uppercase;margin-top:4px;font-family:'Rajdhani',sans-serif}
    .box{background:var(--glass);border:1px solid var(--brd);border-radius:var(--r);overflow:hidden;margin-bottom:16px;position:relative;box-shadow:0 8px 32px rgba(0,0,0,.3);transition:border-color .2s}
    .box::after{content:'';position:absolute;bottom:0;left:0;right:0;height:2px;background:var(--grad)}
    .box::before{content:'';position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,rgba(0,212,212,.15),transparent)}
    .bhead{display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-bottom:1px solid var(--brddim);flex-wrap:wrap;gap:8px;background:rgba(0,0,0,.1)}.btitulo{font-family:'Rajdhani',sans-serif;font-size:14px;font-weight:700;color:var(--t1);letter-spacing:1px;text-transform:uppercase;display:flex;align-items:center;gap:6px}.bacoes{display:flex;gap:7px;align-items:center}
    .busca{display:flex;align-items:center;gap:5px;background:rgba(0,0,0,.4);border:1px solid var(--brd);border-radius:var(--rs);padding:5px 9px}.busca input{background:none;border:none;outline:none;color:var(--t1);font-size:12px;font-family:'Exo 2',sans-serif;width:130px}
    table{width:100%;border-collapse:collapse}thead tr{background:rgba(0,0,0,.3)}th{padding:8px 14px;text-align:left;font-size:10px;font-weight:700;color:var(--cyan);letter-spacing:2px;text-transform:uppercase;border-bottom:1px solid var(--brddim);font-family:'Rajdhani',sans-serif}td{padding:10px 14px;border-bottom:1px solid var(--brddim);font-size:12px;color:var(--t2);vertical-align:middle}tbody tr:last-child td{border-bottom:none}@media(hover:hover){tbody tr:hover{background:var(--cyan-d)}}
    .rank-mobile-only,.hist-mobile-only{display:none !important}
    .badge{display:inline-flex;align-items:center;gap:5px;padding:3px 10px;border-radius:99px;font-size:10px;font-weight:700;font-family:'Rajdhani',sans-serif;letter-spacing:.5px}.badge::before{content:'';display:inline-block;width:6px;height:6px;border-radius:50%;background:currentColor}.badge.on{background:rgba(74,222,128,.12);color:var(--verde);border:1px solid rgba(74,222,128,.3)}.badge.off{background:rgba(248,113,113,.12);color:var(--verm);border:1px solid rgba(248,113,113,.25)}.badge.neutro{background:rgba(255,255,255,.05);color:var(--t3);border:1px solid rgba(255,255,255,.1)}.badge.live{background:rgba(248,113,113,.15);color:var(--verm);border:1px solid rgba(248,113,113,.4);animation:bl 1.8s infinite}
    .vbadge{display:inline-flex;align-items:center;gap:3px;padding:2px 8px;border-radius:99px;font-size:11px;font-weight:700;font-family:'Rajdhani',sans-serif}.vbadge.up{background:rgba(74,222,128,.12);color:var(--verde);border:1px solid rgba(74,222,128,.3)}.vbadge.down{background:rgba(248,113,113,.12);color:var(--verm);border:1px solid rgba(248,113,113,.3)}.vbadge.neutro{background:rgba(255,255,255,.05);color:var(--t3);border:1px solid rgba(255,255,255,.1)}
    .sbadge{display:inline-flex;align-items:center;gap:4px;padding:3px 9px;border-radius:99px;font-size:10px;font-weight:700;font-family:'Rajdhani',sans-serif}.sbadge.excelente{background:rgba(74,222,128,.12);color:var(--verde);border:1px solid rgba(74,222,128,.3)}.sbadge.bom{background:var(--cyan-d);color:var(--cyan);border:1px solid rgba(0,212,212,.3)}.sbadge.critico{background:rgba(248,113,113,.12);color:var(--verm);border:1px solid rgba(248,113,113,.3)}
    .prize-tag{font-size:11px;color:#fff;background:linear-gradient(135deg,rgba(34,197,94,.5),rgba(16,185,129,.35));padding:3px 10px;border-radius:8px;font-family:'Rajdhani',sans-serif;font-weight:700;border:1px solid rgba(74,222,128,.4);box-shadow:0 2px 8px rgba(34,197,94,.2)}
    .av{width:28px;height:28px;border-radius:50%;object-fit:cover;border:2px solid var(--brd)}.av-fb{width:28px;height:28px;border-radius:50%;background:var(--grad);display:inline-flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#000;font-family:'Rajdhani',sans-serif}
    .btn{padding:7px 13px;border-radius:var(--rs);font-size:12px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:5px;transition:all .2s;border:none;font-family:'Rajdhani',sans-serif;letter-spacing:.05em}.btn-g{background:var(--grad);color:#fff;box-shadow:0 2px 10px rgba(59,130,246,.25)}.btn-g:hover{transform:translateY(-1px);box-shadow:0 8px 24px rgba(59,130,246,.5)}.btn-o{background:transparent;border:1px solid var(--brd);color:var(--t3)}.btn-o:hover{border-color:var(--cyan);color:var(--cyan)}.btn-sm{padding:4px 8px;font-size:11px}.btn-d:hover{border-color:var(--verm)!important;color:var(--verm)!important}.btn:disabled{opacity:.5;cursor:not-allowed;transform:none!important}
    .pag-bar{display:flex;align-items:center;justify-content:center;gap:8px;padding:12px}.pag-bar button{padding:5px 13px;background:rgba(0,0,0,.4);border:1px solid var(--brddim);border-radius:var(--rs);color:var(--t3);font-size:11px;cursor:pointer;transition:all .15s;font-family:'Rajdhani',sans-serif;font-weight:700}.pag-bar button:hover:not(:disabled){border-color:var(--cyan);color:var(--cyan)}.pag-bar button:disabled{opacity:.35;cursor:not-allowed}.pag-bar .pn{font-size:11px;color:var(--t3);font-family:'Rajdhani',sans-serif}
    .log{display:flex;align-items:flex-start;gap:10px;padding:10px 14px;border-bottom:1px solid var(--brddim)}.log:last-child{border-bottom:none}.log-tag{font-family:'Rajdhani',sans-serif;font-size:10px;font-weight:700;padding:2px 7px;border-radius:4px;white-space:nowrap;flex-shrink:0;letter-spacing:1px}.log-tag.login{background:rgba(74,222,128,.12);color:var(--verde)}.log-tag.edit{background:var(--cyan-d);color:var(--cyan)}.log-tag.del{background:rgba(248,113,113,.12);color:var(--verm)}.log-tag.cfg{background:rgba(240,192,64,.12);color:var(--gold)}.log-info{flex:1;font-size:11px;color:var(--t2);line-height:1.5}.log-hora{font-family:'Rajdhani',sans-serif;font-size:10px;color:var(--t3);flex-shrink:0}
    /* ── Video inline (modo vídeo) ── */
    .lvc-video{width:100%;height:100%;object-fit:cover}.lc-capa-video{cursor:default}

    /* ════ LIVE HEADER v2 ════ */
    /* Header principal */
    .lv2-header{display:flex;align-items:center;justify-content:space-between;padding:16px 20px 12px;gap:12px}
    .lv2-header-left{display:flex;align-items:center;gap:14px}
    .lv2-icon-wrap{width:52px;height:52px;border-radius:14px;background:linear-gradient(135deg,rgba(139,92,246,.4),rgba(236,72,153,.3));border:1px solid rgba(139,92,246,.5);display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 4px 20px rgba(139,92,246,.25)}
    .lv2-icon-wrap svg{color:#c084fc}
    .lv2-titulo{font-family:'Rajdhani',sans-serif;font-size:clamp(1.1rem,3vw,1.6rem);font-weight:700;letter-spacing:3px;color:#fff}
    .lv2-sub{display:flex;align-items:center;gap:6px;font-size:11px;color:var(--t3);margin-top:2px}

    /* Barra de controles */
    .lv2-bar{display:flex;align-items:center;gap:16px;padding:14px 20px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:var(--r);margin:0 16px 16px;flex-wrap:wrap}
    .lv2-stats{display:flex;gap:10px;flex-wrap:wrap}
    .lv2-stat-card{display:flex;align-items:center;gap:10px;padding:8px 14px;border-radius:12px;background:rgba(0,0,0,.3);border:1px solid rgba(255,255,255,.07);cursor:default;min-width:80px}
    .lv2-stat-ico{width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
    .lv2-ico-live{background:linear-gradient(135deg,rgba(139,92,246,.4),rgba(236,72,153,.3))}.lv2-ico-live svg{color:#c084fc}
    .lv2-ico-hoje{background:linear-gradient(135deg,rgba(59,130,246,.4),rgba(0,229,229,.2))}.lv2-ico-hoje svg{color:var(--cyan)}
    .lv2-ico-api{background:linear-gradient(135deg,rgba(34,197,94,.3),rgba(16,185,129,.2))}.lv2-ico-api svg{color:#86efac}
    .lv2-stat-info{}
    .lv2-stat-num{font-family:'Rajdhani',sans-serif;font-size:18px;font-weight:700;color:#fff;line-height:1}
    .lv2-api-nome{font-size:13px !important}
    .lv2-stat-lbl{font-size:10px;color:var(--t3);display:flex;align-items:center;gap:4px;margin-top:2px}
    .lv2-dot{width:6px;height:6px;border-radius:50%;background:#22c55e;display:inline-block;animation:bl 1.8s infinite}
    .lv2-stat-api{border-color:rgba(34,197,94,.25)}

    /* Separador */
    .lv2-sep{width:1px;height:50px;background:rgba(255,255,255,.08);flex-shrink:0;align-self:center}

    /* Controles */
    .lv2-controls{display:flex;gap:20px;flex-wrap:wrap;align-items:flex-start}
    .lv2-ctrl-group{display:flex;flex-direction:column;gap:8px}
    .lv2-ctrl-label{font-size:9px;color:var(--t3);letter-spacing:1.5px;text-transform:uppercase;font-family:'Rajdhani',sans-serif}
    /* Botões de colunas */
    .lv2-col-btns{display:flex;gap:6px}
    .lv2-col-btn{width:42px;height:42px;border-radius:10px;border:1px solid rgba(255,255,255,.1);background:rgba(0,0,0,.4);color:var(--t3);font-size:11px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .15s;font-weight:700}
    .lv2-col-btn:hover{border-color:rgba(0,212,212,.4);color:var(--cyan)}
    .lv2-col-btn.active{background:rgba(0,212,212,.1);border-color:var(--cyan);color:var(--cyan);box-shadow:0 0 12px rgba(0,212,212,.2)}
    /* Toggles Capa/Vídeo */
    .lv2-modo-btns{display:flex;gap:8px}
    .lv2-modo-btn{display:flex;align-items:center;gap:8px;padding:8px 14px;border-radius:10px;border:1px solid rgba(255,255,255,.1);background:rgba(0,0,0,.4);color:var(--t3);font-size:12px;font-family:'Rajdhani',sans-serif;font-weight:700;cursor:pointer;transition:all .15s;white-space:nowrap}
    .lv2-modo-btn:hover{border-color:rgba(0,212,212,.3)}
    .lv2-modo-btn.active{background:rgba(0,212,212,.1);border-color:var(--cyan);color:var(--cyan)}
    /* Toggle switch */
    .lv2-toggle{width:32px;height:18px;border-radius:99px;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.15);position:relative;transition:background .2s;flex-shrink:0}
    .lv2-toggle.on{background:var(--cyan);border-color:var(--cyan);box-shadow:0 0 8px rgba(0,212,212,.4)}
    .lv2-toggle-thumb{position:absolute;top:2px;left:2px;width:12px;height:12px;border-radius:50%;background:#fff;transition:transform .2s;box-shadow:0 1px 4px rgba(0,0,0,.4)}
    .lv2-toggle.on .lv2-toggle-thumb{transform:translateX(14px)}

    /* ════ MOBILE lv2 ════ */
    @media(max-width:700px){
      .lv2-header{padding:12px 14px 8px;}
      .lv2-icon-wrap{width:42px;height:42px;border-radius:12px;}
      .lv2-titulo{font-size:1.1rem;letter-spacing:2px;}
      .lv2-bar{flex-direction:column;align-items:stretch;gap:12px;padding:12px 14px;margin:0 0 12px;}
      .lv2-stats{display:grid;grid-template-columns:1fr 1fr;gap:8px;}
      .lv2-stat-card.lv2-stat-api{grid-column:1/-1;}
      .lv2-sep{display:none;}
      .lv2-controls{flex-direction:row;gap:12px;align-items:flex-start;}
      .lv2-ctrl-group{flex:1;gap:6px;}
      .lv2-col-btns{gap:5px;}
      .lv2-col-btn{flex:1;height:44px;font-size:13px;}
      .lv2-modo-btns{gap:6px;flex-direction:column;}
      .lv2-modo-btn{width:100%;justify-content:space-between;padding:9px 12px;}
    }.lives-stat{display:flex;align-items:center;gap:6px;font-size:12px;color:var(--t3)}
    .lv-ctrl-sep{flex:1}
    .lv-ctrl-group{display:flex;gap:4px;align-items:center}
    .lv-ctrl-btn{padding:4px 9px;border-radius:6px;border:1px solid var(--brddim);background:rgba(0,0,0,.4);color:var(--t3);font-size:11px;cursor:pointer;transition:all .15s;font-family:'Rajdhani',sans-serif;font-weight:700;display:flex;align-items:center;gap:4px;white-space:nowrap}.lv-ctrl-btn:hover{border-color:var(--cyan);color:var(--t1)}.lv-ctrl-btn.on{background:var(--cyan-d);border-color:var(--brd);color:var(--cyan)}
    .lc-video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
    .lc-capa-video{cursor:default}
    .lives-lista{display:grid;grid-template-columns:repeat(2,1fr);gap:16px;align-items:start}.live-card-full{background:var(--glass);border:1px solid rgba(248,113,113,.25);border-radius:var(--r);overflow:hidden;min-height:200px;align-items:stretch}.live-card-full.lc-horizontal{display:grid;grid-template-columns:minmax(150px,40%) minmax(0,1fr);min-height:200px}
    /* ── Estilo 2: vertical (capa em cima, info embaixo) ── */
    .lc-estilo2{display:flex;flex-direction:column !important;min-height:auto !important}
    .lc-estilo2 .lc-capa{width:100% !important;height:175px !important;min-height:175px !important;flex-shrink:0}
    .lc-estilo2 .lc-info{padding:10px 12px !important}
    .lc-estilo2 .lc-footer{flex-direction:row;border-top:1px solid var(--brddim);padding-top:8px;margin-top:auto}
    .lc-estilo2 .lc-espects{flex:1}
    .lc-estilo2 .lc-acoes{flex-direction:column;width:auto;min-width:88px}
    .lc-estilo2 .lc-acoes .btn{width:100%;justify-content:center}.live-card-full:hover{border-color:rgba(248,113,113,.6)}
    .lc-capa{width:100%;min-height:180px;height:100%;flex-shrink:0;position:relative;cursor:pointer;background:#000}.lc-capa-img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}.lc-capa-overlay{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:space-between;padding:8px;background:linear-gradient(to top,rgba(0,0,0,.7) 0%,transparent 50%);z-index:1}.lc-play{width:36px;height:36px;background:rgba(248,113,113,.8);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:auto;transition:transform .2s}.lc-capa:hover .lc-play{transform:scale(1.15)}.lc-studio{font-size:9px;color:rgba(255,255,255,.7);background:rgba(0,0,0,.6);padding:2px 6px;border-radius:4px;width:fit-content;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.lc-tempo{position:absolute;top:8px;right:8px;font-size:9px;background:rgba(248,113,113,.9);color:#fff;padding:2px 6px;border-radius:99px;font-family:'Rajdhani',sans-serif;font-weight:700;z-index:2}
    .lc-info{flex:1;padding:12px;display:flex;flex-direction:column;gap:10px;min-width:0}.lc-streamer{display:flex;align-items:center;gap:8px;min-width:0}.lc-foto-wrap{flex-shrink:0}.lc-foto{width:34px;height:34px;border-radius:50%;object-fit:cover;border:2px solid var(--brd)}.lc-foto-fb{width:34px;height:34px;border-radius:50%;background:var(--grad);display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;font-family:'Rajdhani',sans-serif;color:#000;flex-shrink:0}.lc-nome{font-family:'Rajdhani',sans-serif;font-size:13px;font-weight:700;color:var(--t1);letter-spacing:1px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.lc-id{font-size:10px;color:var(--t3);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .lc-stats{display:flex;flex-direction:column;gap:4px;padding:8px 0;border-top:1px solid var(--brddim);border-bottom:1px solid var(--brddim)}.lc-stat-row{display:flex;align-items:center;gap:6px;font-size:10px;color:var(--t2);min-width:0}.lc-stat-lbl{color:var(--t3);flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.lc-stat-row strong{font-family:'Rajdhani',sans-serif;font-size:12px;font-weight:700;flex-shrink:0}
    .lc-footer{display:flex;align-items:flex-end;justify-content:space-between;gap:8px;margin-top:auto;min-width:0}.lc-espects{display:flex;flex-direction:column;min-width:0}.lc-acoes{display:flex;gap:6px;flex-direction:column;width:90px;flex-shrink:0;min-width:0}.lc-acoes .btn{width:100%;justify-content:center;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.lc-acoes .btn svg{flex-shrink:0}
    .lives-lista[style*='repeat(4'] .live-card-full.lc-horizontal{grid-template-columns:minmax(138px,44%) minmax(0,1fr)}
    .lives-lista[style*='repeat(4'] .live-card-full.lc-horizontal .lc-footer{flex-direction:column;align-items:stretch;border-top:1px solid var(--brddim);padding-top:8px;gap:6px}
    .lives-lista[style*='repeat(4'] .live-card-full.lc-horizontal .lc-espects{width:100%}
    .lives-lista[style*='repeat(4'] .live-card-full.lc-horizontal .lc-acoes{flex-direction:row;flex-wrap:wrap;width:100%}
    .lives-lista[style*='repeat(4'] .live-card-full.lc-horizontal .lc-acoes .btn{flex:1 1 78px}
    .dc-card{background:var(--glass);border:1px solid var(--brddim);border-radius:var(--r);padding:16px;margin-bottom:10px;box-shadow:0 4px 16px rgba(0,0,0,.2)}.dc-card.aprovado{border-left:3px solid var(--verde);background:linear-gradient(135deg,rgba(34,197,94,.06),rgba(0,0,0,0))}.dc-card.bom{border-left:3px solid var(--cyan);background:linear-gradient(135deg,rgba(0,212,212,.06),rgba(0,0,0,0))}.dc-card.atencao{border-left:3px solid var(--verm);background:linear-gradient(135deg,rgba(248,113,113,.06),rgba(0,0,0,0))}
    .dc-topo{display:flex;align-items:center;gap:10px;margin-bottom:14px}.dc-pos{font-family:'Rajdhani',sans-serif;font-size:18px;font-weight:700;color:var(--t3);width:24px;flex-shrink:0}.dc-info{flex:1;min-width:0}.dc-nome{font-family:'Rajdhani',sans-serif;font-size:14px;font-weight:700;color:var(--t1);letter-spacing:1px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.dc-id{font-size:10px;color:var(--t3)}
    .dc-meta{margin-bottom:10px}.dc-meta-row{display:flex;justify-content:space-between;align-items:center;margin-bottom:4px}.dc-meta-lbl{font-size:10px;color:var(--t3);display:flex;align-items:center;gap:4px}.dc-meta-val{font-size:11px;font-family:'Rajdhani',sans-serif;font-weight:700;color:var(--t1)}.dc-meta-val.ok{color:var(--verde)}.dc-bar-bg{height:6px;background:rgba(255,255,255,.06);border-radius:99px;overflow:hidden}.dc-bar{height:100%;border-radius:99px;transition:width .6s ease}
    .month-tabs{display:flex;gap:6px;flex-wrap:wrap;padding:14px 16px 0;border-bottom:1px solid var(--brddim)}.month-tab{padding:7px 16px;border-radius:var(--rs) var(--rs) 0 0;border:1px solid var(--brddim);border-bottom:none;background:transparent;color:var(--t3);font-family:'Rajdhani',sans-serif;font-size:13px;font-weight:700;cursor:pointer;transition:all .15s}.month-tab:hover{color:var(--t1)}.month-tab.on{background:linear-gradient(135deg,rgba(59,130,246,.2),rgba(0,212,212,.15));color:var(--cyan);border-color:rgba(0,212,212,.4);box-shadow:0 2px 12px rgba(0,212,212,.15)}
    .rec-item{border-bottom:1px solid var(--brddim)}.rec-item:last-child{border-bottom:none}.rec-preview{display:flex;align-items:center;gap:10px;padding:12px 16px;cursor:pointer;transition:background .15s;user-select:none}@media(hover:hover){.rec-preview:hover{background:var(--cyan-d)}}.rec-chevron{flex-shrink:0;color:var(--t3);transition:transform .2s}.rec-item.open .rec-chevron{transform:rotate(180deg)}.rec-body{display:none;padding:0 16px 14px}.rec-item.open .rec-body{display:block}
    .rec-campos{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px;margin-bottom:10px}.rec-campo{background:rgba(0,0,0,.3);border:1px solid var(--brddim);border-radius:var(--rs);padding:10px 12px;display:flex;flex-direction:column;gap:4px;position:relative}.rec-campo-lbl{font-size:9px;color:var(--cyan);font-family:'Rajdhani',sans-serif;letter-spacing:1px;text-transform:uppercase}.rec-campo-val{font-size:12px;color:var(--t1);word-break:break-all;padding-right:24px}
    .rec-copy-btn{position:absolute;top:8px;right:8px;background:transparent;border:none;color:var(--t3);cursor:pointer;padding:2px}.rec-copy-btn:hover{color:var(--cyan)}
    .cfg-row{display:flex;align-items:center;gap:10px;padding:11px 14px;border-bottom:1px solid var(--brddim);flex-wrap:wrap}.cfg-row:last-child{border-bottom:none}.cfg-chave{font-family:'Rajdhani',sans-serif;font-size:12px;color:var(--cyan);width:160px;flex-shrink:0;letter-spacing:1px}.cfg-inp{background:rgba(0,0,0,.5);border:1px solid var(--brd);border-radius:var(--rs);padding:5px 9px;color:var(--t1);font-family:'Exo 2',sans-serif;font-size:12px;width:150px;outline:none;transition:border-color .2s}.cfg-inp:focus{border-color:var(--cyan);box-shadow:0 0 0 3px var(--cyan-d)}
    .ov{position:fixed;inset:0;background:rgba(4,4,14,.9);backdrop-filter:blur(5px);display:flex;align-items:center;justify-content:center;z-index:9000;opacity:0;pointer-events:none;transition:opacity .2s}.ov.on{opacity:1;pointer-events:all}
    .modal-box{background:linear-gradient(160deg,rgba(11,11,26,.99),rgba(4,4,20,.99));border:1px solid var(--brd);border-radius:20px;box-shadow:0 0 40px rgba(0,180,80,.15),0 24px 64px rgba(0,0,0,.9);position:relative;overflow:hidden;max-height:90vh;overflow-y:auto;}.modal-box::after{content:'';position:absolute;bottom:0;left:0;right:0;height:2px;background:linear-gradient(90deg,var(--verde),var(--cyan))}
    .modal-close{width:28px;height:28px;border-radius:50%;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.15);color:var(--t3);font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .2s;flex-shrink:0;line-height:1}.modal-close:hover{background:rgba(248,113,113,.2);border-color:var(--verm);color:var(--verm)}
    .modal{background:linear-gradient(160deg,rgba(11,11,26,.98),rgba(4,4,14,.98));border:1px solid var(--brd);border-radius:20px;padding:26px;width:90%;max-width:480px;box-shadow:0 0 40px var(--cyan-d),0 24px 64px rgba(0,0,0,.8);position:relative;overflow:hidden;transform:scale(.95);transition:transform .2s;max-height:90vh;overflow-y:auto}.modal::after{content:'';position:absolute;bottom:0;left:0;right:0;height:2px;background:var(--grad)}.ov.on .modal{transform:scale(1)}
    .modal-lg{max-width:660px;overflow-x:hidden;}
    .m-titulo{font-family:'Rajdhani',sans-serif;font-size:18px;font-weight:700;color:var(--t1);margin-bottom:16px;letter-spacing:1px;text-transform:uppercase}
    .mc{margin-bottom:12px}.mc label{display:block;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--cyan);margin-bottom:4px;font-family:'Rajdhani',sans-serif}.mc input,.mc select,.mc textarea{width:100%;padding:9px 12px;background:rgba(0,0,0,.5);border:1px solid var(--brd);border-radius:var(--rs);color:var(--t1);font-size:13px;font-family:'Exo 2',sans-serif;outline:none;transition:border-color .2s;resize:none}.mc input:focus,.mc select:focus,.mc textarea:focus{border-color:var(--cyan);box-shadow:0 0 0 3px var(--cyan-d)}.mc select option{background:#0b0b1a}
    .mf{display:flex;gap:7px;justify-content:flex-end;margin-top:16px}
    .toast{position:absolute;bottom:18px;right:18px;background:var(--glass);border:1px solid var(--brd);border-radius:var(--r);padding:10px 14px;font-size:12px;color:var(--t1);box-shadow:0 0 20px var(--cyan-d);display:flex;align-items:center;gap:8px;transform:translateY(70px);opacity:0;transition:all .3s;z-index:999;font-family:'Exo 2',sans-serif}.toast.on{transform:translateY(0);opacity:1}.toast.ok{border-color:rgba(74,222,128,.5)}.toast.err{border-color:rgba(248,113,113,.5)}
    .empty{text-align:center;padding:40px;color:var(--t3);display:flex;flex-direction:column;align-items:center;gap:10px}.empty p{font-size:12px;font-family:'Rajdhani',sans-serif;letter-spacing:1px}
    .loading{display:flex;flex-direction:column;align-items:center;gap:9px;padding:36px;color:var(--t3)}.sp{width:40px;height:40px;border-radius:50%;border:3px solid var(--cyan-d);border-top-color:var(--cyan);animation:spin .8s linear infinite;margin:0 auto 5px}
    .uid-row{display:flex;flex-direction:column;gap:6px;padding:13px 16px;border-bottom:1px solid var(--brddim);transition:background .15s}@media(hover:hover){.uid-row:hover{background:var(--cyan-d)}}.uid-row:last-child{border-bottom:none}
    .uid-row-main{display:flex;align-items:center;gap:10px;flex-wrap:wrap}.uid-kwai{font-family:'Rajdhani',sans-serif;font-size:15px;font-weight:700;color:var(--cyan);letter-spacing:1px;display:flex;align-items:center;gap:5px}.uid-nome-ref{font-size:11px;color:var(--t2);flex:1}
    .uid-row-meta{display:flex;gap:14px;flex-wrap:wrap;font-size:10px;color:var(--t3);align-items:center}.uid-row-meta span{display:flex;align-items:center;gap:4px}
    .uid-lookup-card{display:flex;gap:12px;padding:14px;border-radius:var(--rs);margin-bottom:8px}.uid-lookup-card.ok{background:rgba(74,222,128,.06);border:1px solid rgba(74,222,128,.3)}.uid-lookup-warn{display:flex;align-items:flex-start;gap:8px;padding:12px 14px;border-radius:var(--rs);background:rgba(251,191,36,.08);border:1px solid rgba(251,191,36,.3);color:#fbbf24;font-size:12px;line-height:1.5;margin-bottom:8px}.uid-lookup-err{display:flex;align-items:flex-start;gap:8px;padding:12px 14px;border-radius:var(--rs);background:rgba(248,113,113,.08);border:1px solid rgba(248,113,113,.3);color:var(--verm);font-size:12px;margin-bottom:8px}
    .uid-lookup-avatar{width:48px;height:48px;flex-shrink:0;border-radius:50%;overflow:hidden;border:2px solid rgba(74,222,128,.4);display:flex;align-items:center;justify-content:center}.uid-lookup-avatar img{width:100%;height:100%;object-fit:cover}.uid-lookup-info{flex:1;min-width:0}.uid-lookup-nome{font-family:'Rajdhani',sans-serif;font-size:15px;font-weight:700;color:var(--t1)}.uid-lookup-id{font-size:10px;color:var(--t3);margin-bottom:6px}
    .uid-lookup-stats{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:4px}.uid-lookup-stats span{display:flex;align-items:center;gap:3px;font-size:11px;color:var(--t2);background:rgba(255,255,255,.05);padding:2px 8px;border-radius:99px}
    .uid-lookup-datas{font-size:10px;color:var(--t3);display:flex;gap:10px;flex-wrap:wrap}
    .uid-input-row{display:flex;gap:8px;align-items:flex-start}.uid-input-row input{flex:1;padding:9px 12px;background:rgba(0,0,0,.5);border:1px solid var(--brd);border-radius:var(--rs);color:var(--t1);font-size:14px;font-family:'Exo 2',sans-serif;outline:none;transition:border-color .2s}.uid-input-row input:focus{border-color:var(--cyan)}
    .tx-item{display:flex;align-items:center;gap:10px;padding:10px 16px;border-bottom:1px solid var(--brddim)}.tx-item:last-child{border-bottom:none}.tx-tipo-badge{width:24px;height:24px;border-radius:50%;flex-shrink:0;font-family:'Rajdhani',sans-serif;font-weight:700;font-size:14px;display:flex;align-items:center;justify-content:center}.tx-entrada{background:rgba(74,222,128,.15);color:var(--verde)}.tx-saida{background:rgba(248,113,113,.15);color:var(--verm)}
    .tx-desc{flex:1;min-width:0}.tx-uid{display:block;font-family:'Rajdhani',sans-serif;font-size:12px;font-weight:700;color:var(--t1)}.tx-detalhe{display:block;font-size:10px;color:var(--t3);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .tx-valor{font-family:'Rajdhani',sans-serif;font-size:13px;font-weight:700;white-space:nowrap}.tx-positivo{color:var(--verde)}.tx-negativo{color:var(--verm)}
    .cart-saldo-row{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px}.cart-saldo-box{background:rgba(0,0,0,.4);border:1px solid var(--brd);border-radius:var(--rs);padding:12px 14px}.cart-saldo-box.cy{border-color:rgba(0,212,212,.4)}.cart-saldo-box.vd{border-color:rgba(74,222,128,.3)}.cart-saldo-box.az{border-color:rgba(0,212,212,.3)}
    .cart-saldo-lbl{font-size:9px;color:var(--t3);font-family:'Rajdhani',sans-serif;letter-spacing:1px;text-transform:uppercase;margin-bottom:4px}.cart-saldo-val{font-family:'Rajdhani',sans-serif;font-size:18px;font-weight:700;color:var(--t1)}
    .cart-pix-row{display:flex;align-items:center;gap:6px;font-size:11px;color:var(--t3);margin-bottom:12px;padding:8px 12px;background:rgba(0,0,0,.3);border-radius:var(--rs)}.cart-acoes-row{display:flex;gap:8px;margin-bottom:14px}
    .cart-hist-titulo{font-family:'Rajdhani',sans-serif;font-size:11px;font-weight:700;color:var(--cyan);letter-spacing:2px;text-transform:uppercase;padding:10px 0 4px;display:flex;align-items:center;gap:5px;border-top:1px solid var(--brddim);margin-top:10px}.cart-hist-lista{max-height:220px;overflow-y:auto;border:1px solid var(--brddim);border-radius:var(--rs)}
    .saque-card{padding:14px 16px;border-bottom:1px solid var(--brddim);transition:background .15s;background:transparent}@media(hover:hover){.saque-card:hover{background:var(--cyan-d)}}.saque-card.saque-pend{border-left:3px solid var(--gold);background:linear-gradient(135deg,rgba(245,158,11,.06),rgba(0,0,0,0))}
    .saque-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px}.saque-nome{font-family:'Rajdhani',sans-serif;font-size:14px;font-weight:700;color:var(--t1)}.saque-uid{font-size:10px;color:var(--t3)}.saque-valor{font-family:'Rajdhani',sans-serif;font-size:18px;font-weight:700;color:var(--gold);text-align:right}
    .saque-pix{display:flex;align-items:center;gap:5px;font-size:11px;color:var(--t2);margin-bottom:6px}.saque-meta{display:flex;gap:12px;flex-wrap:wrap;font-size:10px;color:var(--t3)}.saque-meta span{display:flex;align-items:center;gap:3px}.saque-acoes{display:flex;gap:6px;margin-top:10px;flex-wrap:wrap;align-items:center}
    .premio-tipo-tabs{display:flex;gap:8px;margin-bottom:16px}.premio-tipo-tab{padding:8px 20px;border-radius:var(--rs);font-family:'Rajdhani',sans-serif;font-size:13px;font-weight:700;cursor:pointer;border:1px solid var(--brddim);background:transparent;color:var(--t3);transition:all .2s;display:flex;align-items:center;gap:6px}.premio-tipo-tab:hover{color:var(--t1)}.premio-tipo-tab.on{background:var(--cyan-d);border-color:var(--brd);color:var(--cyan)}
    .premio-table{width:100%;border-collapse:collapse;margin-bottom:14px}.premio-pos{font-family:'Rajdhani',sans-serif;font-size:13px;font-weight:700;color:var(--t1);white-space:nowrap}
    .premio-info-box{display:flex;align-items:center;gap:8px;padding:10px 14px;background:var(--cyan-d);border:1px solid rgba(0,212,212,.2);border-radius:var(--rs);font-size:11px;color:var(--cyan);margin-bottom:14px;line-height:1.5}
    .mproc-sucesso{display:flex;align-items:center;gap:10px;padding:12px 14px;background:rgba(74,222,128,.08);border:1px solid rgba(74,222,128,.3);border-radius:var(--rs);color:var(--verde);font-size:13px;margin-bottom:10px}
    .mproc-item{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:7px 12px;background:rgba(0,0,0,.3);border-radius:var(--rs);font-size:12px;margin-bottom:4px;font-family:'Exo 2',sans-serif}
    /* ── Accordion histórico premiações ── */
    .ph-acc-item{border-bottom:1px solid var(--brddim)}.ph-acc-item:last-child{border-bottom:none}
    .ph-acc-preview{display:flex;align-items:center;gap:10px;padding:11px 14px;cursor:pointer;user-select:none;transition:background .15s}@media(hover:hover){.ph-acc-preview:hover{background:var(--cyan-d)}}
    .ph-acc-chevron{flex-shrink:0;color:var(--t3);transition:transform .2s;margin-left:4px}.ph-acc-item.open .ph-acc-chevron{transform:rotate(180deg)}
    .ph-acc-body{display:none;padding:0 14px 12px 14px;border-top:1px solid var(--brddim)}.ph-acc-item.open .ph-acc-body{display:block}
    .ph-acc-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}
    .ph-acc-cel{background:rgba(0,0,0,.3);border:1px solid var(--brddim);border-radius:var(--rs);padding:8px 10px}
    .ph-acc-lbl{font-size:9px;color:var(--t3);font-family:'Rajdhani',sans-serif;letter-spacing:1px;text-transform:uppercase;margin-bottom:3px}
    .ph-acc-val{font-family:'Rajdhani',sans-serif;font-size:14px;font-weight:700;color:var(--t1)}
    .acc-toggle{cursor:pointer;user-select:none;transition:background .15s;}.acc-toggle:hover{background:rgba(59,130,246,.05);}
    .acc-chevron{font-size:11px;color:var(--t3);transition:transform .25s;flex-shrink:0;margin-left:auto;padding:2px 6px;background:rgba(255,255,255,.05);border-radius:4px;}.acc-chevron.open{transform:rotate(180deg);}
    .acc-body{overflow:hidden;transition:max-height .35s ease;max-height:2000px;}.acc-body.fechado{max-height:0;}
    /* ── Streamer Cards (lista carteira) ── */
    .sc-item{border-bottom:1px solid var(--brddim)}.sc-item:last-child{border-bottom:none}
    .sc-preview{display:flex;align-items:center;gap:10px;padding:11px 14px;cursor:pointer;user-select:none;transition:background .15s}@media(hover:hover){.sc-preview:hover{background:var(--cyan-d)}}
    .sc-av{flex-shrink:0}
    .sc-info{flex:1;min-width:0}.sc-nome{font-family:'Rajdhani',sans-serif;font-size:13px;font-weight:700;color:var(--t1);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.sc-uid{font-size:10px;color:var(--t3)}
    .sc-saldo-mini{text-align:right;flex-shrink:0}
    .sc-chevron{flex-shrink:0;color:var(--t3);transition:transform .2s;margin-left:4px}.sc-item.open .sc-chevron{transform:rotate(180deg)}
    .sc-body{display:none;padding:0 14px 12px 14px;border-top:1px solid var(--brddim)}.sc-item.open .sc-body{display:block}
    .sc-body-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px;margin-top:10px}
    .sc-detalhe{background:rgba(0,0,0,.3);border:1px solid var(--brddim);border-radius:var(--rs);padding:8px 10px}
    .sc-dlbl{font-size:9px;color:var(--t3);font-family:'Rajdhani',sans-serif;letter-spacing:1px;text-transform:uppercase;margin-bottom:2px}
    .sc-dval{font-family:'Rajdhani',sans-serif;font-size:14px;font-weight:700;color:var(--t1)}
    .sc-body-acoes{display:flex;gap:7px;flex-wrap:wrap}.sc-body-acoes .btn{flex:1;justify-content:center;min-width:0}
    /* ══ Ao Vivo — Header e Painel Config ══ */
    .lv-header{display:flex;align-items:stretch;gap:12px;flex-wrap:nowrap;margin-bottom:0;padding:14px 16px;background:var(--glass);border:1px solid var(--brd);border-radius:var(--r) var(--r) 0 0;overflow-x:auto;-webkit-overflow-scrolling:touch}
    /* Cards dc2 no header — mesmo estilo do Dashboard */
    .lv-dc2{border-radius:var(--r);padding:14px 18px 12px;position:relative;overflow:hidden;cursor:default;border:1px solid transparent;flex-shrink:0;min-width:130px;transition:transform .2s}
    @media(hover:hover){.lv-dc2:hover{transform:translateY(-2px);}}
    .lv-dc2-ico{position:absolute;top:10px;right:12px;opacity:.22}
    .lv-dc2-body{}
    .lv-dc2-val{font-family:'Rajdhani',sans-serif;font-size:clamp(1.4rem,3vw,2.1rem);font-weight:700;line-height:1;margin-top:22px;margin-bottom:3px;color:#fff}
    .lv-dc2-lbl{font-size:9px;text-transform:uppercase;letter-spacing:2px;font-family:'Rajdhani',sans-serif;opacity:.75}
    .lv-dc2-verm{background:linear-gradient(135deg,rgba(220,38,38,.78),rgba(249,115,22,.52));border-color:rgba(248,113,113,.82)}.lv-dc2-verm .lv-dc2-ico,.lv-dc2-verm .lv-dc2-val,.lv-dc2-verm .lv-dc2-lbl{color:#fecaca;text-shadow:0 0 16px rgba(248,113,113,.65)}
    .lv-dc2-azul{background:linear-gradient(135deg,rgba(37,99,235,.78),rgba(0,212,212,.52));border-color:rgba(34,211,238,.86)}.lv-dc2-azul .lv-dc2-ico,.lv-dc2-azul .lv-dc2-val,.lv-dc2-azul .lv-dc2-lbl{color:#a5f3fc;text-shadow:0 0 16px rgba(0,212,212,.68)}
    .lv-dc2-verde{background:linear-gradient(135deg,rgba(22,163,74,.78),rgba(5,150,105,.5));border-color:rgba(74,222,128,.82)}.lv-dc2-verde .lv-dc2-ico,.lv-dc2-verde .lv-dc2-val,.lv-dc2-verde .lv-dc2-lbl{color:#bbf7d0;text-shadow:0 0 16px rgba(34,197,94,.65)}
    /* Botão de configurações */
    .lv-cfg-btn{display:flex;align-items:center;gap:6px;padding:7px 14px;border-radius:var(--rs);border:1px solid var(--brddim);background:rgba(0,0,0,.4);color:var(--t3);font-size:12px;cursor:pointer;transition:all .15s;font-family:'Rajdhani',sans-serif;font-weight:700;white-space:nowrap;flex-shrink:0}
    .lv-cfg-btn:hover{border-color:var(--cyan);color:var(--cyan)}
    .lv-cfg-arrow{transition:transform .25s;display:flex;align-items:center}
    /* Painel de configurações */
    .lv-cfg-painel{background:rgba(0,0,0,.4);border:1px solid var(--brd);border-top:none;border-radius:0 0 var(--r) var(--r);padding:14px 16px;display:flex;flex-direction:column;gap:12px;margin-bottom:14px;animation:fadeUp .2s ease}
    .lv-cfg-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
    .lv-cfg-label{font-size:10px;color:var(--t3);font-family:'Rajdhani',sans-serif;letter-spacing:1.5px;text-transform:uppercase;min-width:70px;flex-shrink:0}
    .lv-cfg-opts{display:flex;gap:6px;flex-wrap:wrap}
    .lv-cfg-opt-btn{display:flex;align-items:center;gap:5px;padding:6px 13px;border-radius:8px;border:1px solid var(--brddim);background:rgba(0,0,0,.4);color:var(--t3);font-size:11px;cursor:pointer;transition:all .15s;font-family:'Rajdhani',sans-serif;font-weight:700;white-space:nowrap}
    .lv-cfg-opt-btn:hover{border-color:rgba(0,212,212,.4);color:var(--t1)}
    .lv-cfg-opt-btn.on{background:linear-gradient(135deg,rgba(59,130,246,.2),rgba(0,229,229,.1));border-color:var(--cyan);color:var(--cyan)}
    .lives-lista{margin-top:14px}
    
        @media(max-width:1150px) and (min-width:701px){.lives-lista{grid-template-columns:repeat(2,1fr) !important;}}
    /* ── Lives: layout baseado na largura real do CE (não da viewport) ── */
    /* Estilo 1 no narrow: mantém horizontal, lc-capa menor */
    #root.narrow .live-card-full.lc-horizontal{grid-template-columns:minmax(112px,34%) minmax(0,1fr);min-height:160px}
    #root.narrow .live-card-full.lc-horizontal .lc-capa{width:100% !important;height:100% !important;min-height:160px !important}
    #root.narrow .live-card-full.lc-horizontal .lc-info{padding:8px 10px !important;}
    #root.narrow .live-card-full.lc-horizontal .lc-footer{flex-direction:column;border-top:1px solid var(--brddim);padding-top:8px;}
    #root.narrow .live-card-full.lc-horizontal .lc-acoes{flex-direction:row;flex-wrap:wrap;width:100%;}
    #root.narrow .live-card-full.lc-horizontal .lc-acoes .btn{flex:1 1 86px;justify-content:center;}
    /* Estilo 2 no narrow: coluna (capa em cima) */
    #root.narrow .live-card-full.lc-estilo2{flex-direction:column !important}
    /* Estilo 2 no narrow: capa um pouco menor */
    #root.narrow .lc-estilo2 .lc-capa{width:100% !important;height:140px !important;min-height:140px !important;}
    #root.narrow .lc-estilo2 .lc-info{padding:8px !important;}
    #root.narrow .lc-estilo2 .lc-footer{flex-direction:column;border-top:1px solid var(--brddim);padding-top:8px;}
    #root.narrow .lc-estilo2 .lc-acoes{flex-direction:row;flex-wrap:wrap;width:100%;}
    #root.narrow .lc-estilo2 .lc-acoes .btn{flex:1 1 86px;justify-content:center;}
    #root.narrow .lives-lista[style*='repeat(1']{grid-template-columns:1fr !important;}
    #root.narrow .lives-lista[style*='repeat(2']{grid-template-columns:repeat(2,1fr) !important;}
    #root.very-narrow .lc-footer{gap:4px;}
    @media(max-width:700px){
      /* ── Base ── */
      :host{background:#04040e !important;}
      #root{background:#04040e !important;min-width:0;max-width:100vw;overflow:visible;}
      *{backdrop-filter:none !important;-webkit-backdrop-filter:none !important;box-sizing:border-box;}
      .glass,.box,.card,.modal,.modal-box,.side,.top,.content{background-color:#0b0b1a !important;}
      .side{background:#060614 !important;position:absolute;left:-220px;top:52px;bottom:0;z-index:200;transition:left .25s;max-height:none;}.side.open{left:0;}
      .top{background:#060614 !important;flex-wrap:nowrap;gap:6px;}
      .top-chip{font-size:8px;padding:2px 7px;letter-spacing:1px;flex-shrink:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
      .btn-ham{display:flex;flex-shrink:0;}
      .btn-sair{font-size:10px;padding:4px 8px;flex-shrink:0;}
      .content{padding:10px;overflow-x:clip;max-width:100%;}.shell{min-height:auto;}

      /* ── Page Header ── */
      .ph{flex-direction:column;gap:6px;margin-bottom:12px;}
      .titulo{font-size:0.9rem;gap:6px;}
      .psub{font-size:10px;}
      .ph-r{display:flex;flex-wrap:wrap;gap:5px;width:100%;}
      .ph-r>.btn{font-size:10px;padding:5px 9px;flex:1;justify-content:center;min-width:0;}

      /* ── Cards grid ── */
      .dc2-grid,#resumoDesemp,#carteiraResumo,#gMet{grid-template-columns:repeat(2,1fr) !important;gap:8px !important;}
      .dc2{padding:14px 10px 10px !important;}
      .dc2-val{font-size:clamp(1.2rem,5vw,1.8rem) !important;margin-top:22px !important;}
      .dc2-ico svg{width:20px !important;height:20px !important;}
      .dc2-lbl{font-size:9px !important;}
      .qa-lista{grid-template-columns:repeat(2,minmax(0,1fr)) !important;gap:8px;padding:10px;}
      .qa-card{grid-template-columns:minmax(0,1fr) auto;column-gap:7px;min-height:82px;padding:12px 9px 10px !important;border-radius:10px;}
      .qa-lbl{font-size:12.5px;letter-spacing:.25px;line-height:1.05;}
      .qa-sub{font-size:8.5px;line-height:1.25;}
      .qa-actions{gap:4px;}
      .qa-config-btn{width:28px;height:28px;border-radius:8px;}
      .qa-config-btn svg{width:14px;height:14px;}
      .qa-ico-wrap{width:32px;height:32px;border-radius:9px;}
      .qa-ico-wrap svg{width:18px;height:18px;}
      #gMetricas,#carteiraResumo,#resumoDesemp,#gMet{grid-template-columns:1fr 1fr !important;gap:8px !important;}
      /* Dashboard pDash: 2 colunas → 1 coluna */
      #pDash{grid-template-columns:1fr !important;gap:10px;}
      .dlw-grid{grid-template-columns:repeat(2,1fr) !important;}
      .card{padding:9px 7px !important;border-radius:8px;min-width:0;overflow:hidden;}
      .card svg{width:11px;height:11px;margin-bottom:1px;}
      .card-val{font-size:clamp(0.85rem,5vw,1.2rem) !important;word-break:break-all;line-height:1.1;}
      .card-lbl{font-size:7.5px !important;letter-spacing:.5px;}

      /* ── Box / tabelas ── */
      .box{overflow-x:hidden;max-width:100%;}
      .bhead{padding:10px 12px;gap:6px;}
      .btitulo{font-size:12px;}
      .bacoes{flex-wrap:wrap;gap:4px;}
      .busca{flex:1;min-width:0;}.busca input{width:100%;min-width:0;}
      /* Tabelas genéricas: scroll dentro do box */
      .box > table, .box > div > table{display:block;overflow-x:auto;-webkit-overflow-scrolling:touch;max-width:100%;}
      th{padding:5px 6px;font-size:9px;white-space:nowrap;}
      td{padding:6px 6px;font-size:11px;}

      /* ── Ranking ── */
      #tbRank table{table-layout:fixed;width:100%;min-width:0;}
      #tbRank th:nth-child(1),#tbRank td:nth-child(1){width:20px;text-align:center;padding:5px 2px;}
      #tbRank th:nth-child(2),#tbRank td:nth-child(2){width:34px;padding:5px 2px;}
      #tbRank th:nth-child(3),#tbRank td:nth-child(3){padding:5px 4px;overflow:hidden;min-width:0;}
      #tbRank th:nth-child(4),#tbRank td:nth-child(4){width:70px;text-align:right;padding:5px 4px;font-size:11px;white-space:nowrap;}
      #tbRank th:nth-child(n+5),#tbRank td:nth-child(n+5){display:none;}

      /* ── Diário ── */
      #tbDiario table{table-layout:fixed;width:100%;min-width:0;}
      #tbDiario th:nth-child(1),#tbDiario td:nth-child(1){width:20px;text-align:center;padding:5px 2px;}
      #tbDiario th:nth-child(2),#tbDiario td:nth-child(2){width:34px;padding:5px 2px;}
      #tbDiario th:nth-child(3),#tbDiario td:nth-child(3){padding:5px 4px;overflow:hidden;min-width:0;}
      #tbDiario th:nth-child(4),#tbDiario td:nth-child(4){width:70px;text-align:right;font-size:11px;}
      #tbDiario th:nth-child(n+5),#tbDiario td:nth-child(n+5){display:none;}

      /* ── Histórico meses ── */
      .month-tabs{overflow-x:auto;-webkit-overflow-scrolling:touch;flex-wrap:nowrap;padding:10px 12px 0;}
      .month-tab{flex-shrink:0;padding:6px 12px;font-size:12px;}
      #monthContent table{display:block;overflow-x:auto;-webkit-overflow-scrolling:touch;min-width:400px;}

      /* ── Desempenho ── */
      .dc-card{width:100%;box-sizing:border-box;padding:10px;margin-bottom:8px;}
      .dc-topo{flex-wrap:wrap;gap:5px;margin-bottom:8px;}
      .dc-info{min-width:0;flex:1;}
      .dc-topo .sbadge{margin-left:auto;font-size:8px;padding:2px 5px;}
      .dc-meta-row{flex-wrap:nowrap;gap:4px;}
      .dc-meta-lbl{font-size:9px;flex:1;}
      .dc-meta-val{font-size:10px;white-space:nowrap;}
      .dc-bar-bg{height:4px;}
      .dc-meta-group{display:flex;flex-direction:column;gap:6px;}

      /* ── Streamers (rec-item) ── */
      .rec-preview{padding:10px 12px;}
      .rec-campos{grid-template-columns:1fr !important;}
      .rec-body{padding:0 12px 12px;}

      /* ── UIDs ── */
      .uid-row-main{flex-wrap:wrap;}
      .uid-kwai{font-size:13px;}
      .uid-lookup-stats{gap:6px;}
      .uid-lookup-stats span{font-size:10px;padding:2px 6px;}
      .uid-input-row{flex-direction:column;gap:6px;}
      .uid-input-row input{width:100%;}
      .uid-input-row .btn{width:100%;justify-content:center;}

      /* ── Transações ── */
      .tx-item{padding:8px 12px;gap:8px;}
      .tx-uid{font-size:11px;white-space:normal;word-break:break-all;}
      .tx-detalhe{white-space:normal;font-size:9px;}
      .tx-valor{font-size:12px;}

      /* ── Carteira detalhe ── */
      .cart-saldo-row{grid-template-columns:1fr 1fr !important;gap:6px !important;margin-bottom:8px;}
      .cart-saldo-box{padding:7px 9px !important;}
      .cart-saldo-val{font-size:clamp(0.8rem,3.8vw,1rem) !important;}
      .cart-saldo-lbl{font-size:7.5px !important;}
      .cart-acoes-row{flex-direction:column;gap:6px;}
      .cart-acoes-row .btn{justify-content:center;width:100%;}
      .cart-hist-lista{max-height:180px;}

      /* ── Modais ── */
      .modal{padding:14px;width:96%;max-width:96%;border-radius:14px;}
      .modal-lg{max-width:96%;width:96%;overflow-x:hidden !important;}
      #mCartBody{overflow-x:auto;}
      .modal-box{width:95% !important;max-width:95% !important;}
      .m-titulo{font-size:14px;}
      .mc label{font-size:9px;}
      .mc input,.mc select,.mc textarea{font-size:13px;padding:8px 10px;}
      .mf{flex-wrap:wrap;gap:6px;}
      .mf .btn{flex:1;justify-content:center;min-width:0;}

      /* ── Saques ── */
      /* Saques — sem pirâmide, sem hover travado, botões legíveis */
      .saque-card{padding:12px 14px;word-break:normal;overflow-wrap:normal;background:transparent !important;}
      .saque-card:hover{background:transparent !important;}
      .saque-card:active{background:rgba(0,212,212,.06) !important;}
      .saque-header{flex-wrap:nowrap;gap:8px;align-items:flex-start;}
      .saque-header>div:first-child{flex:1;min-width:0;}
      .saque-nome{font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
      .saque-uid{font-size:10px;color:var(--t3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
      .saque-valor{font-size:15px;white-space:nowrap;}
      .saque-pix{font-size:10px;word-break:break-all;flex-wrap:wrap;}
      .saque-meta{display:flex;flex-direction:column;gap:4px;}
      .saque-meta span{display:flex;align-items:center;gap:4px;font-size:10px;flex-wrap:nowrap;}
      .saque-acoes{display:flex;flex-wrap:wrap;gap:5px;margin-top:10px;}
      /* Botões: 2 por linha no máximo, texto nunca quebra */
      .saque-acoes .btn{
        font-size:10px;padding:6px 10px;
        white-space:nowrap;
        flex:1 1 calc(50% - 5px);
        max-width:calc(50% - 5px);
        justify-content:center;
        min-width:0;overflow:hidden;
        text-overflow:ellipsis;
      }
      /* Botão único ocupa tudo */
      .saque-acoes .btn:only-child{flex:1 1 100%;max-width:100%;}

      /* ── Prêmios ── */
      .premio-tipo-tabs{flex-direction:column;gap:5px;}
      .premio-tipo-tab{width:100%;justify-content:center;}
      .premio-info-box{flex-direction:column;align-items:flex-start;gap:4px;font-size:10px;padding:8px 10px;line-height:1.5;}
      .premio-table th:last-child,.premio-table td:last-child{width:36px;}
      .premio-val-inp{width:130px !important;}

      /* ── Config ── */
      .cfg-row{flex-wrap:wrap;gap:8px;}
      .cfg-chave{width:100% !important;margin-bottom:2px;}
      .cfg-inp{width:100% !important;}

      /* ── Lives ── */
      /* Ao Vivo header mobile — compacto */
      .lv-header{gap:8px;padding:10px 12px;}
      /* Estilo 1 em tela estreita: capa um pouco mais estreita */
      #root.narrow .live-card-full:not(.lc-estilo2) .lc-info{padding:8px 10px;}
      #root.narrow .live-card-full:not(.lc-estilo2) .lc-nome{font-size:12px;}
      .lv-dc2{padding:10px 12px 8px;min-width:100px;}
      .lv-dc2-val{font-size:1.3rem !important;margin-top:16px !important;}
      .lv-dc2-lbl{font-size:8px !important;letter-spacing:1px !important;}
      .lv-cfg-btn span:not(.lv-cfg-arrow){display:none;}
      .lv-cfg-btn{padding:6px 10px;}
      .lv-cfg-painel{padding:10px 12px;gap:8px;}
      .lv-cfg-label{min-width:55px;font-size:9px;}
      .lv-cfg-opt-btn{font-size:10px;padding:4px 8px;}
      .lives-stat{font-size:11px;}
      .lv-ctrl-sep{display:none;}
      .lv-ctrl-group{gap:3px;}
      .lv-ctrl-btn{font-size:10px;padding:3px 7px;}
      .lives-lista{gap:8px !important;}
      .lives-lista[style*='repeat(1']{grid-template-columns:1fr !important;}
      .lives-lista[style*='repeat(2']{grid-template-columns:repeat(2,1fr) !important;}
      /* estilo e capa controlados por .narrow classes acima */
      .lc-info{padding:8px;}
      .lc-acoes{flex-wrap:wrap;width:100%;}
      .lc-acoes .btn{flex:1 1 86px;justify-content:center;}

      /* ── Streamers com Saldo (sc-) ── */
      .sc-preview{padding:10px 12px;}
      .sc-nome{font-size:12px;}
      .sc-uid{font-size:9px;}
      .sc-saldo-mini div:last-child{font-size:13px;}
      .sc-body{padding:0 12px 10px;}
      .sc-body-grid{grid-template-columns:1fr 1fr;gap:6px;}
      .sc-body-acoes .btn{font-size:10px;padding:5px 8px;}

      /* ── Accordions premiação ── */
      .ph-acc-preview{padding:10px 12px;}
      .ph-acc-body{padding:0 12px 10px;}
      .ph-acc-grid{grid-template-columns:1fr 1fr;gap:6px;}
      .ph-acc-val{font-size:13px;}

      /* ── Histórico: tabela desktop / accordion mobile ── */
    .hist-table-wrap{overflow-x:auto;-webkit-overflow-scrolling:touch;display:block}
    .hist-table-wrap table{min-width:520px;width:100%}
    .hist-mobile-only{display:none !important}
    @media(max-width:700px){
      .hist-table-wrap{display:none !important}
      .hist-mobile-only{display:block !important}
    }
    /* ── Ranking/Diário: tabela desktop / accordion mobile ── */
    .rank-table-wrap{display:block;overflow-x:auto;-webkit-overflow-scrolling:touch}
    .rank-table-wrap table{min-width:560px;width:100%}
    .rank-mobile-only{display:none !important}
    @media(max-width:700px){
      .rank-table-wrap{display:none !important}
      .rank-mobile-only{display:block !important}
    }
    /* Cards accordion Ranking/Diário */
    .rk-item{border-bottom:1px solid var(--brddim)}.rk-item:last-child{border-bottom:none}
    .rk-preview{display:flex;align-items:center;gap:8px;padding:10px 14px;cursor:pointer;user-select:none;transition:background .15s}
    @media(hover:hover){.rk-preview:hover{background:var(--cyan-d)}}
    .rk-pos{font-family:'Rajdhani',sans-serif;font-size:16px;font-weight:700;color:var(--t3);width:28px;flex-shrink:0;text-align:center}
    .rk-av{flex-shrink:0}
    .rk-info{flex:1;min-width:0}
    .rk-nome{font-family:'Rajdhani',sans-serif;font-size:13px;font-weight:700;color:var(--t1);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .rk-uid{font-size:9px;color:var(--t3)}
    .rk-right{text-align:right;flex-shrink:0;display:flex;flex-direction:column;align-items:flex-end;gap:3px}
    .rk-diam{font-family:'Rajdhani',sans-serif;font-size:12px;font-weight:700;color:var(--cyan);display:flex;align-items:center;gap:3px}
    .rk-chevron{flex-shrink:0;color:var(--t3);transition:transform .2s;margin-left:4px}.rk-item.open .rk-chevron{transform:rotate(180deg)}
    .rk-body{display:none;padding:0 14px 12px;border-top:1px solid var(--brddim)}.rk-item.open .rk-body{display:block}
    .rk-body-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}
    .rk-cel{background:rgba(0,0,0,.3);border:1px solid var(--brddim);border-radius:var(--rs);padding:8px 10px}
    .rk-lbl{font-size:9px;color:var(--t3);font-family:'Rajdhani',sans-serif;letter-spacing:1px;text-transform:uppercase;margin-bottom:3px}
    .rk-val{font-family:'Rajdhani',sans-serif;font-size:14px;font-weight:700;color:var(--t1)}

    .hist-item{border-bottom:1px solid var(--brddim)}.hist-item:last-child{border-bottom:none}
    .hist-preview{display:flex;align-items:center;gap:8px;padding:10px 14px;cursor:pointer;user-select:none;transition:background .15s}@media(hover:hover){.hist-preview:hover{background:var(--cyan-d)}}
    .hist-pos{font-family:'Rajdhani',sans-serif;font-size:14px;font-weight:700;color:var(--t3);width:22px;flex-shrink:0;text-align:center}
    .hist-av{flex-shrink:0}
    .hist-info{flex:1;min-width:0}.hist-nome{font-family:'Rajdhani',sans-serif;font-size:13px;font-weight:700;color:var(--t1);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.hist-diam{font-size:10px;color:var(--azul);display:flex;align-items:center;gap:3px;margin-top:2px}
    .hist-right{flex-shrink:0}
    .hist-chevron{flex-shrink:0;color:var(--t3);transition:transform .2s}.hist-item.open .hist-chevron{transform:rotate(180deg)}
    .hist-body{display:none;padding:0 14px 12px;border-top:1px solid var(--brddim)}.hist-item.open .hist-body{display:block}
    .hist-body-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}
    .hist-cel{background:rgba(0,0,0,.3);border:1px solid var(--brddim);border-radius:var(--rs);padding:8px 10px}
    .hist-lbl{font-size:9px;color:var(--t3);font-family:'Rajdhani',sans-serif;letter-spacing:1px;text-transform:uppercase;margin-bottom:3px}
    .hist-val{font-family:'Rajdhani',sans-serif;font-size:13px;font-weight:700;color:var(--t1)}
    /* ── Badges nav ── */
      .nb{font-size:8px;padding:1px 4px;}

      /* ── Paginação ── */
      .pag-bar{gap:5px;padding:8px;}
      .pag-bar button{padding:4px 10px;font-size:10px;}
      .pag-bar .pn{font-size:10px;}
    }
    @media(max-width:700px){
      /* Lives mobile */
      .lives-lista{gap:8px !important;}
      .lives-lista[style*='repeat(1']{grid-template-columns:1fr !important;}
      .lives-lista[style*='repeat(2']{grid-template-columns:repeat(2,1fr) !important;}
      .live-card-full.lc-horizontal{grid-template-columns:minmax(112px,34%) minmax(0,1fr);min-height:160px;}
      .live-card-full.lc-horizontal .lc-capa{width:100% !important;height:100% !important;min-height:160px !important;}
      .live-card-full.lc-estilo2{flex-direction:column}
      .live-card-full.lc-estilo2 .lc-capa{width:100% !important;height:120px !important;min-height:120px !important;}
      .lc-info{padding:8px !important;}
      .lc-footer{flex-direction:column;border-top:1px solid var(--brddim);padding-top:8px}
      .lc-acoes{flex-direction:row;flex-wrap:wrap;width:100%}
      .lc-acoes .btn{flex:1 1 86px;justify-content:center;}
    }
    @media(max-width:360px){
      .grid,#carteiraResumo,#resumoDesemp,#gMet{grid-template-columns:1fr !important;}
      #gMetricas{grid-template-columns:repeat(2,minmax(0,1fr)) !important;gap:7px !important;}
      #gMetricas .dc2{min-height:74px;padding:11px 9px 8px !important;border-radius:9px;}
      #gMetricas .dc2-val{font-size:1.1rem !important;margin-top:18px !important;margin-bottom:3px;}
      #gMetricas .dc2-lbl{font-size:7px !important;letter-spacing:.8px !important;line-height:1.1;}
      #gMetricas .dc2-ico{top:8px;right:8px;}
      #gMetricas .dc2-ico svg{width:16px !important;height:16px !important;}
      .cart-saldo-row,.sc-body-grid,.ph-acc-grid{grid-template-columns:1fr !important;}
      .card-val{font-size:0.85rem !important;}
      .lv-ctrl-btn{font-size:9px;padding:2px 5px;}
    }
    @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}@keyframes spin{100%{transform:rotate(360deg)}}@keyframes bl{0%,100%{opacity:1}50%{opacity:.35}}
    ::-webkit-scrollbar{width:3px}::-webkit-scrollbar-thumb{background:rgba(0,212,212,.3);border-radius:99px}
    /* ── Comunicados ── */
    .com-lista{display:flex;flex-direction:column;gap:12px;padding:4px 0}
    .com-item{background:rgba(0,0,0,.35);border:1px solid var(--brd);border-radius:var(--r);padding:14px 16px;display:flex;flex-direction:column;gap:10px}
    .com-preview{display:flex;align-items:flex-start;gap:10px;background:rgba(0,212,212,.06);border:1px solid var(--brddim);border-radius:var(--rs);padding:10px 13px}
    .com-emoji{font-size:1.4rem;line-height:1;flex-shrink:0;min-width:28px}
    .com-texto{font-size:13px;color:var(--t1);line-height:1.5;flex:1}
    .com-meta{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:6px}
    .com-meta-esq{display:flex;align-items:center;flex-wrap:wrap;gap:5px}
    .com-status{font-size:10px;font-family:'Rajdhani',sans-serif;letter-spacing:1px;padding:2px 8px;border-radius:99px;font-weight:700}
    .com-status.ativo{background:rgba(74,222,128,.15);border:1px solid rgba(74,222,128,.4);color:var(--verde)}
    .com-status.inativo{background:rgba(248,113,113,.12);border:1px solid rgba(248,113,113,.3);color:var(--verm)}
    .com-local{font-size:9px;font-family:'Rajdhani',sans-serif;letter-spacing:.8px;padding:2px 7px;border-radius:99px;background:var(--cyan-d);border:1px solid rgba(0,212,212,.3);color:var(--cyan);text-transform:uppercase}
    .com-data{font-size:10px;color:var(--t3);font-family:'Exo 2',sans-serif}
    .com-acoes{display:flex;gap:7px;flex-wrap:wrap}
    .com-locais-check{display:flex;flex-direction:column;gap:8px;margin-top:4px}
    .com-check-label{display:flex;align-items:center;gap:8px;font-size:13px;color:var(--t2);cursor:pointer}
    .com-check-label input[type=checkbox]{width:15px;height:15px;accent-color:var(--cyan);cursor:pointer}
    #mComTexto{width:100%;padding:9px 12px;background:rgba(0,0,0,.5);border:1px solid var(--brd);border-radius:var(--rs);color:var(--t1);font-family:'Exo 2',sans-serif;font-size:13px;outline:none;resize:vertical;transition:border-color .2s}
    #mComTexto:focus{border-color:var(--cyan);box-shadow:0 0 8px var(--cyan-d)}
    @media(max-width:600px){.com-acoes{gap:5px}.com-acoes .btn-sm{font-size:10px;padding:4px 7px}}
    /* ── Monitor Kwai ── */
    .mon-section{margin-bottom:16px}
    #monResgateResult{font-size:11px;font-family:'Courier New',monospace;line-height:1.7}
    #monBufferResult{padding:16px}
    @media(max-width:600px){#pag-monitor .btn{width:100%;justify-content:center}}
    /* ── Controle Impulsionamento ── */
    .impulso-section{margin-bottom:16px}
    .impulso-toggle-row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 14px;background:rgba(255,255,255,.03);border:1px solid var(--brddim);border-radius:10px}
    .tog-switch{position:relative;display:inline-block;width:42px;height:24px;flex-shrink:0}
    .tog-switch input{opacity:0;width:0;height:0}
    .tog-slider{position:absolute;inset:0;background:rgba(255,255,255,.12);border-radius:99px;cursor:pointer;transition:background .25s}
    .tog-slider::before{content:'';position:absolute;width:18px;height:18px;left:3px;top:3px;background:#fff;border-radius:50%;transition:transform .25s}
    .tog-switch input:checked+.tog-slider{background:var(--cyan)}
    .tog-switch input:checked+.tog-slider::before{transform:translateX(18px)}
    .bloq-lista{display:flex;flex-direction:column;gap:0}
    .bloq-item{display:flex;align-items:center;gap:12px;padding:12px 16px;border-bottom:1px solid var(--brddim)}
    .bloq-item:last-child{border-bottom:none}
    .bloq-info{flex:1;min-width:0}
    .bloq-uid{font-size:12px;color:var(--t1);display:flex;align-items:center;gap:6px;margin-bottom:3px}
    .bloq-motivo{font-size:12px;color:var(--t2);font-style:italic;margin-bottom:3px}
    .bloq-meta{font-size:10px;color:var(--t3)}
    @media(max-width:600px){.bloq-item{flex-direction:column;align-items:flex-start}.impulso-toggle-row{flex-wrap:wrap}}
  `;}

  _html(){
    const ni=(ico,pag,lbl,extra='')=>`<div class="ni" data-p="${pag}"><span class="ico">${this._ico(ico,14)}</span><span class="nlb">${lbl}</span>${extra}</div>`;
    const ph=(titulo,icoN,sub,btnId,extra='')=>`<div class="ph"><div><div class="titulo">${this._ico(icoN,18)} ${titulo}</div><div class="psub">${sub}</div></div><div class="ph-r"><button class="btn btn-o" id="${btnId}">${this._ico('refresh',13)} Atualizar</button>${extra}</div></div>`;
    return`<div id="root">
      <div id="login"><div class="glass lbox"><h2>DMAIOR<br>ADMIN MASTER</h2><div style="text-align:center"><span class="lchip"><span class="ldot"></span>ACESSO RESTRITO</span></div><div class="campo"><label>Usuário</label><input id="iU" type="text" placeholder="Usuário" autocomplete="username"/></div><div class="campo"><label>Senha</label><input id="iP" type="password" placeholder="••••••••" autocomplete="current-password"/></div><button class="btn-login" id="btnL">ENTRAR NO PAINEL</button><div class="lerr" id="lErr"></div><div class="lload" id="lLoad"><div class="sp" style="width:18px;height:18px;margin:0"></div><span>Autenticando...</span></div></div></div>
      <div id="app">
        <div class="top"><button class="btn-ham" id="btnHam">${this._ico('menu',16)}</button><span class="top-chip">ADMIN MASTER</span><div class="top-sp"></div><button class="btn-sair" id="btnSair">${this._ico('logout',13)} Sair</button></div>
        <div class="shell">
          <div class="side" id="side">
            <div class="ns">Principal</div>
            ${ni('dashboard','dashboard','Dashboard')}
            ${ni('live','aoVivo','Ao Vivo',`<span class="nb live" id="nbLive">0</span>`)}
            <div class="ns">Ranking</div>
            ${ni('trophy','ranking','Ranking Mês')}
            ${ni('chart','diario','Resultado Diário')}
            ${ni('trend','desempenho','Desempenho')}
            ${ni('history','historico','Histórico')}
            <div class="ns">Gestão</div>
            ${ni('users','streamers','Streamers')}
            ${ni('key_uid','uids','Autorização UIDs')}
            ${ni('metrics','metricas','Métricas')}
            ${ni('clipboard','recrutamento','Recrutamento',`<span class="nb" id="nbRec" style="display:none">0</span>`)}
            <div class="ns">Financeiro</div>
            ${ni('wallet','carteira','Carteira',`<span class="nb" style="background:rgba(0,229,229,.25);color:var(--cyan)">R$</span>`)}
            ${ni('send','saques','Saques',`<span class="nb gold" id="nbSaques" style="display:none">0</span>`)}
            ${ni('award','premios','Prêmios')}
            <div class="ns">Sistema</div>
            ${ni('bolt','impulsoCtrl','Ctrl. Impulso')}
            ${ni('bell','comunicados','Comunicados')}
            ${ni('server','monitor','Monitor Kwai')}
            ${ni('search','logs','Auditoria')}
            ${ni('settings','config','Configurações')}
          </div>
          <div class="content">
            <div class="pag on" id="pag-dashboard">${ph('Dashboard','dashboard','Visão geral da agência','btnAtuDash')}<div class="dc2-grid" id="gMetricas">${this._loading('grid-column:1/-1')}</div><div id="pDash"></div></div>
            <div class="pag" id="pag-aoVivo">${ph('Ao Vivo','live','Streamers ativos agora','btnAtuLive')}<div id="gLives">${this._loading()}</div></div>
            <div class="pag" id="pag-ranking">${ph('Ranking do Mês','trophy','Diamantes acumulados','btnAtuRank')}<div class="box"><div id="tbRank">${this._loading()}</div></div></div>
            <div class="pag" id="pag-diario">${ph('Resultado Diário','chart','Performance de hoje','btnAtuDiar')}<div class="box"><div id="tbDiario">${this._loading()}</div></div></div>
            <div class="pag" id="pag-desempenho">${ph('Desempenho','trend','Metas do mês','btnAtuDesemp')}<div class="dc2-grid" id="resumoDesemp">${this._loading('grid-column:1/-1')}</div><div class="box" id="tbDesemp"></div></div>
            <div class="pag" id="pag-historico">${ph('Histórico de Meses','history','Variação mensal','btnAtuHist')}<div class="box" id="tbHistorico">${this._loading()}</div></div>
            <div class="pag" id="pag-streamers"><div class="ph"><div><div class="titulo">${this._ico('users',18)} Streamers</div><div class="psub">Perfis cadastrados</div></div><div class="ph-r"><button class="btn btn-g" id="btnAddS">${this._ico('plus',13)} Adicionar</button></div></div><div class="box"><div class="bhead"><div class="btitulo">Lista</div><div class="bacoes"><div class="busca">${this._ico('search',12)}<input id="bS" type="text" placeholder="Buscar..."/></div></div></div><div id="tbS">${this._loading()}</div><div class="pag-bar" id="pgS"></div></div></div>
            <div class="pag" id="pag-uids">${ph('Autorização de UIDs','key_uid','Controle de acesso','btnAtuUIDs',`<button class="btn btn-g" id="btnNovoUID">${this._ico('plus',13)} Autorizar UID</button>`)}<div class="box"><div class="bhead"><div class="btitulo">${this._ico('unlock',14)} UIDs Liberados</div><div class="bacoes"><select id="uidFiltro" style="background:rgba(0,0,0,.5);border:1px solid var(--brd);border-radius:6px;color:var(--t1);padding:5px 9px;font-family:'Exo 2',sans-serif;font-size:12px;outline:none"><option value="">Todos</option><option value="pendente">Aguardando</option><option value="utilizado">Conta Criada</option><option value="inativo">Revogados</option></select></div></div><div id="listaUids">${this._loading()}</div><div class="pag-bar" id="pgUID"></div></div></div>
            <div class="pag" id="pag-metricas">${ph('Métricas','metrics','Campanhas e boosts','btnAtuMet')}<div class="dc2-grid" id="gMet">${this._loading('grid-column:1/-1')}</div></div>
            <div class="pag" id="pag-recrutamento">${ph('Recrutamento','clipboard','Candidatos do formulário','btnAtuRec')}<div class="box"><div id="tbRec">${this._loading()}</div></div></div>
            <div class="pag" id="pag-carteira">${ph('Carteira Financeira','wallet','Saldos dos streamers','btnAtuCart',`<button class="btn btn-g" id="btnCreditoRapido">${this._ico('plus',13)} Adicionar Saldo</button>`)}<div class="dc2-grid" id="carteiraResumo">${this._loading('grid-column:1/-1')}</div><div id="carteiraStreamers">${this._loading()}</div></div>
            <div class="pag" id="pag-saques">${ph('Solicitações de Saque','send','Aprovação de saques','btnAtuSaques')}<div class="box"><div class="bhead"><div class="btitulo">${this._ico('pix_ico',14)} Saques</div><select id="saqueFiltro" style="background:rgba(0,0,0,.5);border:1px solid var(--brd);border-radius:6px;color:var(--t1);padding:5px 9px;font-family:'Exo 2',sans-serif;font-size:12px;outline:none"><option value="pendente">Pendentes</option><option value="aprovado">Aprovados</option><option value="pago">Pagos</option><option value="rejeitado">Rejeitados</option><option value="todos">Todos</option></select></div><div id="listaSaques">${this._loading()}</div><div class="pag-bar" id="pgSaques"></div></div></div>
            <div class="pag" id="pag-premios">${ph('Prêmios','award','Premiação por ranking','btnAtuPremios',`<button class="btn btn-g" id="btnProcessarPremios">${this._ico('zap',13)} Processar</button>`)}<div class="box"><div class="bhead"><div class="btitulo">${this._ico('award',14)} Tabela de Prêmios</div></div><div style="padding:16px"><div class="premio-tipo-tabs"><button class="premio-tipo-tab on" data-tipo="diamantes">${this._ico('diamond',14)} Diamantes</button><button class="premio-tipo-tab" data-tipo="horas">${this._ico('clock_r',14)} Horas</button></div><div id="premiosConfigArea">${this._loading()}</div></div></div><div class="box"><div class="bhead"><div class="btitulo">${this._ico('history',14)} Histórico de Distribuições</div></div><div id="historicoPremios">${this._loading()}</div></div></div>
            <div class="pag" id="pag-comunicados">${ph('Comunicados / Avisos','bell','Avisos para streamers e ranking','btnAtuCom',`<div style="display:flex;gap:6px"><button class="btn btn-o" id="btnNovoRapido" style="border-color:rgba(240,192,64,.5);color:var(--gold)">${this._ico('zap',13)} Aviso Rápido</button><button class="btn btn-g" id="btnNovoImportante">${this._ico('bell',13)} Aviso Importante</button></div>`)}<div class="box"><div id="tbCom">${this._loading()}</div></div></div>
            <div class="pag" id="pag-impulsoCtrl">${ph('Controle de Impulsionamento','bolt','Configurações e bloqueios','btnAtuImpulso')}
              <div class="box impulso-section">
                <div class="bhead"><div class="btitulo">${this._ico('settings',14)} Configurações Gerais</div></div>
                <div style="padding:16px;display:flex;flex-direction:column;gap:14px">
                  <div class="mc"><label>Quota máxima semanal por streamer</label><div style="display:flex;gap:8px;align-items:center"><input id="iQuotaMax" type="number" min="1" max="99" style="width:80px;padding:9px 12px;background:rgba(0,0,0,.5);border:1px solid var(--brd);border-radius:var(--rs);color:var(--t1);font-family:'Exo 2',sans-serif;font-size:14px;outline:none"/><span style="color:var(--t3);font-size:12px">usos por semana</span></div></div>
                  <div style="display:flex;flex-direction:column;gap:10px">
                    <label style="font-size:12px;color:var(--t3);font-weight:600;text-transform:uppercase;letter-spacing:.08em">Opções disponíveis</label>
                    <div class="impulso-toggle-row"><div><div style="font-size:13px;color:var(--t1)">Impulsionar 30 minutos</div><div style="font-size:11px;color:var(--t3)">Libera a opção de 30min no painel do streamer</div></div><label class="tog-switch"><input type="checkbox" id="iOpcao30min"><span class="tog-slider"></span></label></div>
                    <div class="impulso-toggle-row"><div><div style="font-size:13px;color:var(--t1)">Impulsionar 1 hora</div><div style="font-size:11px;color:var(--t3)">Libera a opção de 1h no painel do streamer</div></div><label class="tog-switch"><input type="checkbox" id="iOpcao1hora"><span class="tog-slider"></span></label></div>
                  </div>
                  <div><button class="btn btn-g" id="btnSalvarImpulsoConfig">${this._ico('check',13)} Salvar Configurações</button></div>
                </div>
              </div>
              <div class="box impulso-section">
                <div class="bhead"><div class="btitulo">${this._ico('lock_r',14)} Bloquear Streamer</div></div>
                <div style="padding:16px;display:flex;flex-direction:column;gap:12px">
                  <div class="mc"><label>UID do Streamer</label><div style="display:flex;gap:8px"><input id="iBloqUid" type="number" placeholder="Ex: 11614413" style="flex:1;padding:9px 12px;background:rgba(0,0,0,.5);border:1px solid var(--brd);border-radius:var(--rs);color:var(--t1);font-family:'Exo 2',sans-serif;font-size:14px;outline:none"/><button class="btn btn-o" id="btnBuscarBloqUid">${this._ico('search',13)} Buscar</button></div></div>
                  <div id="iBloqStreamerInfo" style="display:none;background:rgba(0,212,212,.05);border:1px solid rgba(0,212,212,.15);border-radius:var(--rs);padding:10px 14px;font-size:12px;color:var(--t2)"></div>
                  <div class="mc"><label>Motivo do Bloqueio <span style="color:var(--verm)">*</span></label><textarea id="iBloqMotivo" rows="2" placeholder="Ex: Suspeita de uso indevido, manipulação..." style="padding:9px 12px;background:rgba(0,0,0,.5);border:1px solid var(--brd);border-radius:var(--rs);color:var(--t1);font-family:'Exo 2',sans-serif;font-size:13px;outline:none;width:100%;resize:none"></textarea></div>
                  <div class="mc"><label>Data de Expiração <span style="color:var(--t3);font-size:11px">(opcional — vazio = permanente)</span></label><input id="iBloqExpira" type="date" style="padding:9px 12px;background:rgba(0,0,0,.5);border:1px solid var(--brd);border-radius:var(--rs);color:var(--t1);font-family:'Exo 2',sans-serif;font-size:13px;outline:none;width:100%"/></div>
                  <div><button class="btn" id="btnAplicarBloqueio" style="background:linear-gradient(135deg,#c00030,#f87171)">${this._ico('lock_r',13)} Aplicar Bloqueio</button></div>
                </div>
              </div>
              <div class="box impulso-section">
                <div class="bhead"><div class="btitulo">${this._ico('x_circle',14)} Bloqueios Ativos</div><div class="bacoes"><button class="btn btn-o btn-sm" id="btnAtuBloqueios">${this._ico('refresh',12)} Atualizar</button></div></div>
                <div id="tbBloqueios">${this._loading()}</div>
              </div>
            </div>
            <div class="pag" id="pag-monitor">${ph('Monitor Kwai','server','Controle do worker de monitoramento','btnAtuMonitor')}
              <div class="box mon-section">
                <div class="bhead"><div class="btitulo">${this._ico('check_c',14)} Status do Cookie Kwai</div></div>
                <div style="padding:16px;display:flex;flex-direction:column;gap:12px">
                  <div id="monCookieStatus" style="display:flex;align-items:center;gap:10px;padding:12px 14px;border-radius:10px;background:rgba(255,255,255,.04);border:1px solid var(--brddim);font-size:13px;color:var(--t3)">Clique em Atualizar para verificar</div>
                  <div><button class="btn btn-o" id="btnVerificarCookie">${this._ico('refresh',13)} Verificar Agora</button></div>
                  <div style="border-top:1px solid var(--brddim);padding-top:12px">
                    <label style="font-size:12px;color:var(--t3);display:block;margin-bottom:6px">Novo cookie (cole aqui para atualizar)</label>
                    <textarea id="monCookieInput" rows="3" placeholder="Cole o cookie completo aqui..." style="width:100%;padding:9px 12px;background:rgba(0,0,0,.5);border:1px solid var(--brd);border-radius:var(--rs);color:var(--t1);font-family:'Exo 2',sans-serif;font-size:12px;outline:none;resize:vertical;transition:border-color .2s;word-break:break-all"></textarea>
                    <div style="margin-top:8px"><button class="btn btn-g" id="btnSalvarCookie">${this._ico('check',13)} Salvar Cookie</button></div>
                  </div>
                </div>
              </div>
              <div class="box mon-section">
                <div class="bhead"><div class="btitulo">${this._ico('history',14)} Resgate / Correção de Dados</div></div>
                <div style="padding:16px;display:flex;flex-direction:column;gap:12px">
                  <div style="background:rgba(248,193,0,.06);border:1px solid rgba(248,193,0,.25);border-radius:var(--rs);padding:10px 14px;font-size:11px;color:#fcd34d;display:flex;align-items:flex-start;gap:6px;line-height:1.6">${this._ico('warning',13)}<span><strong>Simular</strong> mostra o que seria alterado sem gravar nada. <strong>Executar</strong> grava os dados corrigidos no banco — confirme antes.</span></div>
                  <div class="mc"><label>Janela de dias a reprocessar</label><div style="display:flex;gap:8px;align-items:center"><input id="monDias" type="number" min="1" max="90" value="7" style="width:80px;padding:9px 12px;background:rgba(0,0,0,.5);border:1px solid var(--brd);border-radius:var(--rs);color:var(--t1);font-family:'Exo 2',sans-serif;font-size:14px;outline:none"/><span style="color:var(--t3);font-size:12px">dias atrás</span></div></div>
                  <div style="display:flex;gap:10px;flex-wrap:wrap">
                    <button class="btn btn-o" id="btnSimularResgate">${this._ico('search',13)} Simular (sem gravar)</button>
                    <button class="btn" id="btnExecutarResgate" style="background:linear-gradient(135deg,#1d4ed8,#3b82f6)">${this._ico('zap',13)} Executar Correção</button>
                  </div>
                  <div id="monResgateStatus" style="display:none"></div>
                  <div id="monResgateResult" style="display:none;background:rgba(0,0,0,.4);border:1px solid var(--brddim);border-radius:var(--rs);padding:12px;max-height:320px;overflow-y:auto;font-size:11px;font-family:monospace;color:var(--t2);word-break:break-word;white-space:pre-wrap;line-height:1.6"></div>
                </div>
              </div>
              <div class="box mon-section">
                <div class="bhead"><div class="btitulo">${this._ico('chart',14)} Buffer Atual</div><div class="bacoes"><button class="btn btn-o btn-sm" id="btnVerBuffer">${this._ico('refresh',12)} Ver Buffer</button></div></div>
                <div id="monBufferResult" style="padding:16px;color:var(--t3);font-size:12px">Clique em "Ver Buffer" para inspecionar os dados pendentes de envio ao banco.</div>
              </div>
              <div class="box mon-section">
                <div class="bhead"><div class="btitulo">${this._ico('send',14)} Telegram</div></div>
                <div style="padding:16px;display:flex;align-items:center;gap:12px;flex-wrap:wrap">
                  <span style="font-size:12px;color:var(--t3);flex:1">Envia uma mensagem de teste para confirmar que o bot está funcionando.</span>
                  <button class="btn btn-o" id="btnTestarTelegram">${this._ico('send',13)} Testar Bot</button>
                </div>
              </div>
            </div>
            <div class="pag" id="pag-logs">${ph('Auditoria','search','Registro de ações','btnAtuLog')}<div class="box"><div class="bhead"><div class="btitulo">Logs</div><div class="bacoes"><div class="busca">${this._ico('search',12)}<input id="bL" type="text" placeholder="Filtrar..."/></div></div></div><div id="tbL">${this._loading()}</div><div class="pag-bar" id="pgL"></div></div></div>
            <div class="pag" id="pag-config">${ph('Configurações','settings','Variáveis operacionais','btnAtuCfg')}<div class="box"><div id="tbC">${this._loading()}</div></div></div>
          </div>
        </div>
      </div>
      <!-- MODAIS -->
      <div class="ov" id="mS"><div class="modal"><div class="m-titulo" id="mSTit">Adicionar</div><div class="mc"><label>Nome</label><input id="mNome" type="text"/></div><div class="mc"><label>Kwai ID</label><input id="mKwai" type="text"/></div><div class="mc"><label>URL da Foto</label><input id="mFoto" type="text"/></div><div class="mc"><label>Status</label><select id="mAtivo"><option value="true">Ativo</option><option value="false">Inativo</option></select></div><div class="mf"><button class="btn btn-o" id="mSCancel">Cancelar</button><button class="btn btn-g" id="mSSave">${this._ico('check',13)} Salvar</button></div></div></div>
      <div class="ov" id="mC"><div class="modal"><div class="m-titulo">${this._ico('warning',16)} Confirmar</div><p id="mCMsg" style="color:var(--t2);font-size:13px;margin-bottom:16px;line-height:1.6"></p><div class="mf"><button class="btn btn-o" id="mCCancel">Cancelar</button><button class="btn btn-g" id="mCOk" style="background:linear-gradient(135deg,#c00030,#f87171)">${this._ico('trash',13)} Confirmar</button></div></div></div>
      <div class="ov" id="mUID"><div class="modal"><div class="m-titulo">${this._ico('key_uid',16)} Autorizar UID</div><div class="mc"><label>UID Kwai</label><div class="uid-input-row"><input id="uidInputVal" type="number" placeholder="Ex: 11614413" autocomplete="off"/><button class="btn btn-g" id="btnBuscarUID">${this._ico('search',13)} Buscar</button></div></div><div id="uidLookupResult" style="display:none"></div><div class="mc" style="margin-top:12px"><label>Anotação (opcional)</label><input id="uidNomeRef" type="text" placeholder="Ex: João da turma de maio"/></div><div class="mf"><button class="btn btn-o" id="btnCancelarUID">Cancelar</button><button class="btn btn-g" id="btnConfirmarUID" style="display:none">${this._ico('unlock',13)} Confirmar</button></div></div></div>
      <div class="ov" id="mCart"><div class="modal modal-lg"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px"><div class="m-titulo" id="mCartTitulo" style="margin-bottom:0">${this._ico('wallet',16)} Carteira</div><button class="btn btn-o btn-sm" id="btnFecharCart">${this._ico('x_circle',12)} Fechar</button></div><div id="mCartBody">${this._loading()}</div></div></div>
      <div class="ov" id="mOp"><div class="modal"><div class="m-titulo" id="mOpTitulo">${this._ico('wallet',16)} Operação</div><div class="mc"><label>Valor (R$)</label><input id="mOpValor" type="number" min="0.01" step="0.01" placeholder="0.00"/></div><div class="mc"><label>Descrição / Motivo <span style="color:var(--verm)">*</span></label><textarea id="mOpDesc" rows="3" placeholder="Ex: Fechamento maio..."></textarea></div><div class="mf"><button class="btn btn-o" id="btnCancelarOp">Cancelar</button><button class="btn btn-g" id="mOpConfirmar">${this._ico('check',13)} Confirmar</button></div></div></div>
      <div class="ov" id="mCredito"><div class="modal"><div class="m-titulo">${this._ico('plus',16)} Adicionar Saldo</div><div id="mCrPasso1"><div class="mc"><label>UID do Streamer</label><div style="display:flex;gap:8px"><input id="mCrUid" type="number" placeholder="Ex: 11614413" style="flex:1;padding:9px 12px;background:rgba(0,0,0,.5);border:1px solid var(--brd);border-radius:var(--rs);color:var(--t1);font-family:'Exo 2',sans-serif;font-size:14px;outline:none;transition:border-color .2s"/><button class="btn btn-g" id="btnCrBuscar">${this._ico('search',13)} Buscar</button></div></div><div id="mCrInfo" style="display:none;margin-top:12px"></div></div><div id="mCrPasso2" style="display:none"><div id="mCrStreamerCard" style="margin-bottom:14px"></div><div class="mc"><label>Valor (R$) <span style="color:var(--verm)">*</span></label><input id="mCrValor" type="number" min="0.01" step="0.01" placeholder="0.00" style="padding:9px 12px;background:rgba(0,0,0,.5);border:1px solid var(--brd);border-radius:var(--rs);color:var(--t1);font-family:'Exo 2',sans-serif;font-size:16px;outline:none;width:100%;transition:border-color .2s"/></div><div class="mc"><label>Motivo <span style="color:var(--verm)">*</span></label><textarea id="mCrDesc" rows="2" placeholder="Ex: Prêmio, fechamento..." style="padding:9px 12px;background:rgba(0,0,0,.5);border:1px solid var(--brd);border-radius:var(--rs);color:var(--t1);font-family:'Exo 2',sans-serif;font-size:13px;outline:none;width:100%;resize:none;transition:border-color .2s"></textarea></div></div><div class="mf" style="margin-top:14px"><button class="btn btn-o" id="btnCrCancelar">Cancelar</button><button class="btn btn-g" id="btnCrConfirmar" style="display:none">${this._ico('check',13)} Confirmar Crédito</button></div></div></div>
      <div class="ov" id="mPix"><div class="modal-box" style="max-width:360px;width:94%;padding:0;overflow:hidden;background:#08081a !important;"><div style="background:linear-gradient(135deg,rgba(0,160,70,.3),rgba(0,0,0,.2));padding:14px 16px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid rgba(0,180,80,.25)"><div style="display:flex;align-items:center;gap:7px">${this._ico('pix_ico',15)}<span style="font-family:'Rajdhani',sans-serif;font-size:.95rem;font-weight:700;color:var(--t1);text-transform:uppercase;letter-spacing:1px">Enviar PIX</span></div><button class="modal-close" id="mPixClose">✕</button></div><div style="padding:14px;display:flex;flex-direction:column;gap:10px"><div style="display:flex;align-items:center;gap:12px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);border-radius:10px;padding:10px 12px"><div style="position:relative;flex-shrink:0"><img id="mPixFoto" src="" alt="" style="width:44px;height:44px;border-radius:50%;border:2px solid rgba(74,222,128,.5);object-fit:cover;display:block;background:#101020"><div style="position:absolute;bottom:0;right:0;width:12px;height:12px;background:var(--verde);border-radius:50%;border:2px solid #08081a"></div></div><div style="min-width:0;flex:1"><div id="mPixNome" style="font-family:'Rajdhani',sans-serif;font-size:14px;font-weight:700;color:var(--t1);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">—</div><div id="mPixUid" style="font-size:10px;color:var(--t3);margin-top:1px">UID: —</div></div></div><div style="text-align:center;background:rgba(74,222,128,.07);border:1px solid rgba(74,222,128,.2);border-radius:10px;padding:12px"><div style="font-size:9px;color:var(--t3);text-transform:uppercase;letter-spacing:.12em;margin-bottom:3px;font-family:'Rajdhani',sans-serif">Valor a pagar</div><div id="mPixValor" style="font-family:'Rajdhani',sans-serif;font-size:2rem;font-weight:700;color:var(--verde);line-height:1">R$ 0,00</div></div><div style="background:rgba(0,212,212,.05);border:1px solid rgba(0,212,212,.18);border-radius:10px;padding:12px"><div style="font-size:9px;color:var(--cyan);font-family:'Rajdhani',sans-serif;text-transform:uppercase;letter-spacing:.1em;margin-bottom:5px">Chave PIX</div><div id="mPixTipo" style="font-size:10px;color:var(--t3);margin-bottom:2px">—</div><div id="mPixChave" style="font-size:13px;font-weight:700;color:var(--t1);word-break:break-all;margin-bottom:8px;line-height:1.4;font-family:'Exo 2',sans-serif">—</div><button id="mPixCopiarChave" class="btn btn-o" style="width:100%;justify-content:center;padding:8px;font-size:11px;border-color:rgba(0,212,212,.35);color:var(--cyan)">${this._ico('clipboard',12)} Copiar chave PIX</button></div><div style="display:flex;align-items:flex-start;gap:7px;padding:8px 10px;background:rgba(59,130,246,.06);border:1px solid rgba(59,130,246,.15);border-radius:8px;font-size:9px;color:#93c5fd;line-height:1.5">${this._ico('warning',10)}<span>Abra o app do banco, copie a chave PIX e envie. Confirme abaixo após o pagamento.</span></div><input type="hidden" id="mPixSaqueId" value=""><button id="mPixConfirmar" class="btn" style="background:linear-gradient(135deg,#00b450,#007a30);width:100%;justify-content:center;padding:12px;font-size:13px;border-radius:10px;letter-spacing:.05em">${this._ico('check_c',14)} Já Paguei — Confirmar no Sistema</button></div></div></div>
      <div class="ov" id="mSaque"><div class="modal"><div class="m-titulo" id="mSaqueTitulo">${this._ico('send',16)} Processar Saque</div><div style="background:rgba(59,130,246,.06);border:1px solid rgba(59,130,246,.2);border-radius:var(--rs);padding:10px 14px;margin-bottom:14px;font-family:'Rajdhani',sans-serif;font-size:14px;font-weight:700;color:var(--cyan)" id="mSaqueInfo"></div><div class="mc"><label id="mSaqueObsLabel">Observação</label><textarea id="mSaqueObs" rows="3" placeholder="Opcional..."></textarea></div><div class="mf"><button class="btn btn-o" id="btnCancelarSaque">Cancelar</button><button class="btn btn-g" id="mSaqueConfirmar">${this._ico('check',13)} Confirmar</button></div></div></div>
      <div class="ov" id="mProc"><div class="modal"><div class="m-titulo">${this._ico('award',16)} Processar Premiação</div><div style="background:rgba(248,113,113,.08);border:1px solid rgba(248,113,113,.3);border-radius:var(--rs);padding:10px 14px;margin-bottom:14px;font-size:11px;color:var(--verm);display:flex;align-items:flex-start;gap:6px;line-height:1.5">${this._ico('warning',13)}<span><strong>Atenção:</strong> Após processada, não pode ser desfeita automaticamente.</span></div><div class="mc"><label>Mês de Referência</label><input id="mProcMes" type="month" style="background:rgba(0,0,0,.5);border:1px solid var(--brd);border-radius:var(--rs);color:var(--t1);padding:9px 12px;font-family:'Exo 2',sans-serif;font-size:13px;outline:none;width:100%"/></div><div class="mc"><label>Tipo de Ranking</label><select id="mProcTipo" style="width:100%;padding:9px 12px;background:rgba(0,0,0,.5);border:1px solid var(--brd);border-radius:var(--rs);color:var(--t1);font-family:'Exo 2',sans-serif;font-size:13px;outline:none"><option value="diamantes">💎 Ranking de Diamantes</option><option value="horas">⏱ Ranking de Horas</option></select></div><div id="mProcTaxaInfo"></div><div id="mProcStatus"></div><div class="mf"><button class="btn btn-o" id="btnCancelarProc">Cancelar</button><button class="btn btn-g" id="mProcConfirmar">${this._ico('zap',13)} Processar Premiação</button></div></div></div>
      <div class="ov" id="mCom"><div class="modal" style="max-width:500px"><div class="m-titulo" id="mComTit">Novo Aviso</div>
        <div id="mComTipoBadge"></div>

        <!-- ── SEÇÃO: AVISO RÁPIDO ── -->
        <div id="mComSecRapido">
          <div class="mc"><label>Emoji <span style="color:var(--t3);font-size:11px">(opcional)</span></label><input id="mComEmoji" type="text" placeholder="Ex: ⚡ 🏆 🔔" maxlength="8" style="font-size:1.3rem;letter-spacing:4px"/></div>
          <div class="mc"><label>Texto do Aviso <span style="color:var(--verm)">*</span></label><textarea id="mComTexto" rows="3" placeholder="Ex: Os Top 10 streamers do mês participarão do sorteio de 10K diamantes."></textarea></div>
        </div>

        <!-- ── SEÇÃO: AVISO IMPORTANTE ── -->
        <div id="mComSecImportante" style="display:none">
          <div class="mc"><label>Título <span style="color:var(--verm)">*</span></label><input id="mComTitulo" type="text" placeholder="Ex: Inscrições abertas até 12 de junho!" maxlength="120"/></div>
          <div class="mc"><label>Subtítulo <span style="color:var(--t3);font-size:11px">(aparece em ciano abaixo do título)</span></label><textarea id="mComDescricao" rows="2" placeholder="Ex: BATALHA DE SQUADS"></textarea></div>
          <div class="mc"><label>Descrição / Corpo <span style="color:var(--verm)">*</span></label><textarea id="mComTexto_imp" rows="3" placeholder="Ex: Não perca tempo! Garanta já o seu lugar na Copa Arena."></textarea></div>
          <div class="mc"><label>Imagem (URL) <span style="color:var(--t3);font-size:11px">(thumbnail — cole o link da imagem)</span></label><input id="mComImagem" type="url" placeholder="https://..."/><div id="mComImagemPreview" style="margin-top:6px;display:none"><img id="mComImgEl" style="width:72px;height:72px;object-fit:cover;border-radius:8px;border:1px solid var(--brd)" alt="preview"/></div></div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
            <div class="mc" style="margin:0"><label>Botão principal — Label</label><input id="mComLinkLabel" type="text" placeholder="Ex: INSCREVER-SE" maxlength="30"/></div>
            <div class="mc" style="margin:0"><label>Botão principal — Link</label><input id="mComLinkUrl" type="url" placeholder="https://..."/></div>
            <div class="mc" style="margin:0"><label>Botão secundário — Label <span style="color:var(--t3);font-size:10px">(opcional)</span></label><input id="mComLink2Label" type="text" placeholder="Ex: VER REGRAS" maxlength="30"/></div>
            <div class="mc" style="margin:0"><label>Botão secundário — Link</label><input id="mComLink2Url" type="url" placeholder="https://..."/></div>
          </div>
          <div class="mc" style="margin-top:10px"><label class="com-check-label" style="font-size:13px"><input type="checkbox" id="mComDestaque"> &nbsp;⭐ Destaque — exibe como card principal no topo das notificações</label></div>
        </div>

        <!-- ── CAMPOS COMUNS ── -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px">
          <div class="mc" style="margin:0"><label>Status</label><select id="mComAtivo"><option value="true">Ativo</option><option value="false">Inativo</option></select></div>
        </div>
        <div class="mc"><label>Exibir em</label><div class="com-locais-check"><label class="com-check-label"><input type="checkbox" id="mComLocal_home"> 🏠 Home (carrossel)</label><label class="com-check-label"><input type="checkbox" id="mComLocal_ranking"> Ranking Geral</label><label class="com-check-label"><input type="checkbox" id="mComLocal_painel"> Painel / App</label><label class="com-check-label"><input type="checkbox" id="mComLocal_impulsionamento"> Impulsionamento</label></div></div>
        <div class="mf"><button class="btn btn-o" id="mComCancel">Cancelar</button><button class="btn btn-g" id="mComSave">${this._ico('check',13)} Salvar</button></div>
      </div></div>
      <div class="toast" id="toast"><span id="tIco"></span><span id="tMsg"></span></div>
    </div>`;
  }

  _render(){
    const style=document.createElement('style');style.textContent=this._css();this.shadowRoot.appendChild(style);
    const wrap=document.createElement('div');wrap.innerHTML=this._html();this.shadowRoot.appendChild(wrap);
  }
}

customElements.define('dmaior-admin', DimaiorAdmin);
