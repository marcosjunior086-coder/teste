class DMaiorPainel extends HTMLElement {
    constructor() {
        super();
        this.apiUrl = "https://dashboard.agencydmaior.com.br";
        this.sessionUid   = "";
        this.sessionToken = "";
        this.sessionEmail = "";
        this.historicoCompleto = [];
        this.chartInstance  = null;
        this.chartMetrica   = 'diamantes';
        this.chartPeriodo   = 'semanal';
        this.mesSelecionado = 'atual';
    }

    connectedCallback() {
        this.render();
        this.applyPreferences();
        this.loadChartJS();
        // Guarda referência antes de setupNavigation para poder remover depois
        this._avisosHandler = () => this.goAvisos();
        // Ao trocar o tema, o gráfico (canvas) precisa ser repintado com as novas cores
        this._temaHandler = () => { if (this.chartInstance) setTimeout(() => this.renderChart(), 60); };
        window.addEventListener('dmaior:tema', this._temaHandler);
        this.setupNavigation();
        this.setupActionListeners();
        this.restoreSession();
        this._startHeightObserver();
    }

    disconnectedCallback() {
        if (this._avisosHandler) {
            window.removeEventListener('dmaior:avisos', this._avisosHandler);
            this._avisosHandler = null;
        }
        if (this._temaHandler) {
            window.removeEventListener('dmaior:tema', this._temaHandler);
            this._temaHandler = null;
        }
        if (this._resizeObserver) {
            this._resizeObserver.disconnect();
            this._resizeObserver = null;
        }
        if (this._updNotch) window.removeEventListener('resize', this._updNotch);
        if (this._mEscHandler) document.removeEventListener('keydown', this._mEscHandler);
        this._mNavRO?.disconnect();
    }

    _startHeightObserver() {
        const sendHeight = () => {
            const h = Math.max(this.scrollHeight, this.offsetHeight, 600);
            window.parent.postMessage({ height: h }, '*');
        };
        this._resizeObserver = new ResizeObserver(() => sendHeight());
        this._resizeObserver.observe(this);
        this._sendHeight = sendHeight;
        sendHeight();
    }

    async restoreSession() {
        const loading = this.qs('#vLoading');
        if (loading) loading.style.display = 'flex';

        try {
            const uid     = localStorage.getItem('dm_uid');
            const token   = localStorage.getItem('dm_token');
            const refresh = localStorage.getItem('dm_refresh');
            const email   = localStorage.getItem('dm_email') || '';

            if (uid && token) {
                this.sessionUid   = uid;
                this.sessionToken = token;
                this.sessionEmail = email;

                // Só renova se o token já expirou ou está perto de vencer (2min) — evita
                // chamar /api/refresh toda vez que a página abre. Chamar sempre era a
                // principal causa de duas abas (ou 2 dispositivos) renovarem o mesmo
                // dm_refresh ao mesmo tempo, e o Supabase derrubar a sessão inteira por
                // "reuso suspeito" de refresh token. Se a renovação falhar aqui (rede
                // instável, por exemplo), segue com o token que já tem — o primeiro
                // fetch autenticado real (_fetchAutenticado) tenta de novo e só força
                // logout se o refresh_token estiver de fato morto.
                const exp = this._jwtExp(token);
                const precisaRenovar = !!refresh && (!exp || exp - Date.now() < 2 * 60 * 1000);
                if (precisaRenovar) await this._renovarToken();
                this.sessionToken = localStorage.getItem('dm_token') || this.sessionToken;

                const savedNome = localStorage.getItem('dm_nome') || '';
                const savedFoto = localStorage.getItem('dm_foto') || '';
                if (savedNome) { const el = this.qs('#dName'); if(el) el.textContent = savedNome; }
                if (savedFoto) { const el = this.qs('#dAva');  if(el) el.innerHTML = `<img src="${savedFoto}"/>`; }
                const uidEl = this.qs('#dUid'); if(uidEl) uidEl.textContent = `UID: ${uid}`;

                if (loading) loading.style.display = 'none';
                // Verifica deeplink — sino no site público redireciona com #avisos
                if (window.location.hash === '#avisos') {
                    history.replaceState(null, '', window.location.pathname);
                    this.goAvisos();
                } else {
                    this.navigate('vD');
                    this.navActive('nD');
                    this.loadDash();
                    this.fetchComunicados();
                }
                return;
            }
        } catch(e) {}

        if (loading) loading.style.display = 'none';
        this.navigate('vL');
    }

    _clearSession() {
        this.sessionUid = ''; this.sessionToken = ''; this.sessionEmail = '';
        this.historicoCompleto = [];
        try {
            ['dm_uid','dm_token','dm_refresh','dm_email','dm_foto','dm_nome','dm_atalho_admin','dm_atalho_agente']
                .forEach(k => localStorage.removeItem(k));
        } catch(e) {}
    }

    // Lê o "exp" de um JWT sem validar assinatura — só pra saber se está perto
    // de vencer (a validação de verdade é sempre feita no backend/Supabase).
    _jwtExp(token) {
        try {
            const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));
            return payload.exp ? payload.exp * 1000 : null;
        } catch(_) { return null; }
    }

    // Renova dm_token via /api/refresh. Compartilha 1 única chamada em
    // andamento entre quem pedir ao mesmo tempo (ex: várias telas dando 401
    // juntas) — evita 2 chamadas simultâneas consumirem o mesmo dm_refresh e
    // o Supabase derrubar a sessão inteira por "reuso suspeito". Retorna
    // true se conseguiu um token novo, false em qualquer outro caso.
    async _renovarToken() {
        if (this._renovacaoPromise) return this._renovacaoPromise;
        this._renovacaoPromise = (async () => {
            const refresh = localStorage.getItem('dm_refresh');
            if (!refresh) return false;
            try {
                const res = await fetch(`${this.apiUrl}/api/refresh`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ refresh_token: refresh }),
                    signal: AbortSignal.timeout(8000),
                });
                if (!res.ok) return false;
                const data = await res.json();
                if (!data.token) return false;
                this.sessionToken = data.token;
                localStorage.setItem('dm_token',   data.token);
                localStorage.setItem('dm_refresh', data.refresh_token || refresh);
                return true;
            } catch(_) { return false; }
        })();
        try { return await this._renovacaoPromise; }
        finally { this._renovacaoPromise = null; }
    }

    // fetch autenticado padrão pro painel: manda o Bearer atual e, se vier
    // 401 (token expirado), tenta renovar 1x (via _renovarToken, deduplicado)
    // e repete a chamada original. Só encerra a sessão de verdade se a
    // renovação também falhar — antes disso, cada tela tratava 401 do seu
    // jeito (algumas nem tratavam), sem nunca tentar renovar primeiro.
    async _fetchAutenticado(url, opts = {}) {
        const comAuth = () => ({
            ...opts,
            headers: { ...(opts.headers || {}), 'Authorization': `Bearer ${this.sessionToken}` },
        });
        let res = await fetch(url, comAuth());
        if (res.status === 401) {
            const renovou = await this._renovarToken();
            if (renovou) res = await fetch(url, comAuth());
            if (res.status === 401) {
                this._clearSession();
                this.navigate('vL');
                this.showAlert('#alL','Sua sessão expirou. Faça login novamente.');
            }
        }
        return res;
    }

    loadChartJS() {
        if (typeof Chart === 'undefined') {
            const script = document.createElement('script');
            script.src = "https://cdn.jsdelivr.net/npm/chart.js";
            document.head.appendChild(script);
        }
    }

    // ── SVG library ─────────────────────────────────────────────────
    svgUser()    { return `<svg viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>`; }
    svgLock()    { return `<svg viewBox="0 0 24 24"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/></svg>`; }
    svgMail()    { return `<svg viewBox="0 0 24 24"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>`; }
    svgPhone()   { return `<svg viewBox="0 0 24 24"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>`; }
    svgPin()     { return `<svg viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>`; }
    svgEyeOn()   { return `<svg viewBox="0 0 24 24"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>`; }
    svgEyeOff()  { return `<svg viewBox="0 0 24 24"><path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46A11.804 11.804 0 0 0 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/></svg>`; }
    svgRefresh() { return `<svg viewBox="0 0 24 24"><path d="M17.65 6.35A7.958 7.958 0 0 0 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0 1 12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg>`; }
    svgDiamond() { return `<svg viewBox="0 0 24 24"><path d="M19 3H5L2 9l10 12L22 9l-3-6zm-7 14.5L4.5 9.5l2-4h11l2 4L12 17.5zm0-6.5a2 2 0 100-4 2 2 0 000 4z"/></svg>`; }
    svgClock()   { return `<svg viewBox="0 0 24 24"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z"/></svg>`; }
    svgCal()     { return `<svg viewBox="0 0 24 24"><path d="M20 3h-1V1h-2v2H7V1H5v2H4c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 18H4V8h16v13z"/></svg>`; }
    svgLink()    { return `<svg viewBox="0 0 24 24"><path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/></svg>`; }
    svgPix()     { return `<svg viewBox="0 0 24 24"><path d="M17.06 10.94l-3-3A3 3 0 0 0 12 7.17a3 3 0 0 0-2.12.88l-3 3a3 3 0 0 0 0 4.24l3 3A3 3 0 0 0 12 19.17a3 3 0 0 0 2.12-.88l3-3a3 3 0 0 0 0-4.24zm-1.41 2.83l-3 3a1 1 0 0 1-1.41 0l-3-3a1 1 0 0 1 0-1.41l3-3a1 1 0 0 1 1.41 0l3 3a1 1 0 0 1 0 1.41z"/></svg>`; }
    svgBack()    { return `<svg viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>`; }
    svgGrid()    { return `<svg viewBox="0 0 24 24"><path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/></svg>`; }
    svgChevron() { return `<svg viewBox="0 0 24 24"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z"/></svg>`; }
    svgVote()    { return `<svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>`; }
    svgLogout()  { return `<svg viewBox="0 0 24 24"><path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/></svg>`; }
    svgInfo()    { return `<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>`; }
    svgRank()    { return `<svg viewBox="0 0 24 24"><path d="M7.5 21H2V9h5.5v12zm7.25-18h-5.5v18h5.5V3zM22 11h-5.5v10H22V11z"/></svg>`; }
    svgPk()      { return `<svg viewBox="0 0 24 24"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>`; }
    svgBoost()   { return `<svg viewBox="0 0 24 24"><path d="M12 2s6 4 6 11c0 3.5-1.5 6.5-3 8H9c-1.5-1.5-3-4.5-3-8C6 6 12 2 12 2zm0 7a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm-4 13h8v-2H8v2z"/></svg>`; }
    svgTicket()  { return `<svg viewBox="0 0 24 24"><path d="M4 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4V8Z"/></svg>`; }
    svgFrame()   { return `<svg viewBox="0 0 24 24"><path d="M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zm0 2v2.17A3 3 0 0 0 16.17 5H19zM5 5h2.83A3 3 0 0 0 5 7.83V5zm0 14v-2.83A3 3 0 0 0 7.83 19H5zm14 0h-2.83A3 3 0 0 0 19 16.17V19zM9 19a5 5 0 0 1 10-5V10a5 5 0 0 1-5-5h-4a5 5 0 0 1-5 5v4a5 5 0 0 1 4 5z"/></svg>`; }
    svgKey()     { return `<svg viewBox="0 0 24 24"><path d="M12.65 10A6 6 0 1 0 14 14.65L14 14h2v2h2v2h2v-2.18A6.002 6.002 0 0 0 12.65 10zM7 14a2 2 0 1 1 0-4 2 2 0 0 1 0 4z"/></svg>`; }
    svgWallet()  { return `<svg viewBox="0 0 24 24"><path d="M21 7H3c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V9c0-1.1-.9-2-2-2zm0 12H3V9h18v10zm-9-1c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3 1.34 3 3 3zM1 5h20V3H1v2z"/></svg>`; }
    svgShield()  { return `<svg viewBox="0 0 24 24"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-1.5 14.5L6 11l1.41-1.41L10.5 12.67l6.09-6.09L18 8l-7.5 7.5z"/></svg>`; }
    svgAgente()  { return `<svg viewBox="0 0 24 24"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>`; }
    svgSend()    { return `<svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>`; }

    // ── Formatação BRL ───────────────────────────────────────────────
    brl(n) { return 'R$ ' + Number(n||0).toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2}); }

    render() {
        this.innerHTML = `
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@600;700&family=Exo+2:wght@400;600;700&display=swap');
            *{margin:0;padding:0;box-sizing:border-box;-webkit-tap-highlight-color:transparent;}

            .shell {
                --cyan:#00d4d4; --cyan-d:rgba(0,212,212,.15);
                --rank-grad:linear-gradient(135deg,#3b82f6,#00d4d4);
                --rank-border:rgba(0,212,212,.35);
                --rank-glow:transparent;
                --gold:#f0c040; --green:#4ade80; --red:#f87171;
                --border:rgba(0,230,230,.18);
                /* superfície dos cards = mesmo tom do menu do topo (--dm-grad-card do site) */
                --glass:var(--dm-grad-card, linear-gradient(160deg,#1a1a2e 0%,#12121f 100%));
                --card-solid:var(--dm-bg-2, #1a1a2e);
                --text:#fff; --muted:#a0b8c8;
                --ftitle:clamp(1.2rem,5vw,1.8rem); --fval:clamp(1.1rem,4vw,1.5rem);
                font-family:var(--dm-font-body,'Exo 2',sans-serif); font-size:calc(16px * var(--dm-font-scale, 1)); background:transparent; color:var(--text);
                min-height:100%; display:flex; flex-direction:row; width:100%; overflow-x:hidden; position:relative;
            }
            .content { flex:1; display:flex; flex-direction:column; align-items:flex-start; padding:24px 32px; min-width:0; overflow-x:hidden; }
            /* Sidebar do desktop — mesmo estilo do painel do Agente (linhas full-width, acento na borda esquerda) */
            .bnav { order:-1; width:220px; min-width:220px; flex-shrink:0; display:none; flex-direction:column; align-items:stretch; justify-content:flex-start; position:relative; height:100%; background:var(--glass); border-right:1px solid var(--border); padding:14px 0 0; z-index:100; }
            .bnav.on { display:flex; }
            .bnav-head { padding:4px 20px 14px; margin:0 0 8px; border-bottom:1px solid var(--border); font-family:var(--dm-font-title,'Rajdhani',sans-serif); font-size:.6rem; font-weight:700; letter-spacing:.18em; text-transform:uppercase; color:var(--muted); }
            .nit { display:flex; flex-direction:row; align-items:center; justify-content:flex-start; color:var(--muted); font-size:.88rem; font-family:var(--dm-font-title,'Rajdhani',sans-serif); font-weight:700; letter-spacing:.02em; text-transform:uppercase; gap:12px; cursor:pointer; transition:background .18s,color .18s,border-color .18s; border:none; border-left:3px solid transparent; background:none; padding:12px 20px; text-decoration:none; }
            .nit svg { width:18px; height:18px; fill:currentColor; flex-shrink:0; }
            .nit:hover { color:var(--text); background:rgba(255,255,255,0.045); }
            .nit.on { color:var(--cyan); background:var(--cyan-d); border-left-color:var(--cyan); }
            .nit.on svg { filter:none; }
            .nit.sair { margin-top:auto; color:var(--red); border-top:1px solid var(--border); padding-top:15px; padding-bottom:15px; }
            .nit.sair:hover { background:rgba(248,113,113,.09); border-left-color:transparent; }
            [data-theme="branco"] .shell .nit:hover,
            [data-theme="rosa"] .shell .nit:hover,
            [data-theme="laranja"] .shell .nit:hover { background:rgba(0,0,0,.045); }

            /* No desktop o menu já é uma lista vertical com espaço de sobra —
               o wrapper "mais" fica transparente (display:contents) e o botão
               de seta some, pra tudo continuar visível de uma vez só. */
            .nav-more { display:contents; }
            .nit.nav-toggle { display:none; }

            /* ══ Menu móvel: barra flutuante com entalhe em U + FAB central
                  (mesmo padrão do painel Admin e do painel do Agente) ══ */
            .mnav, .mfab, .msheet { display:none; }
            .mnav-bg { position:absolute; inset:0; width:100%; height:100%; display:block; }
            .mnav-bg path { stroke:var(--border); stroke-width:1; }

            @media(max-width:768px){
                .shell { flex-direction:column; }
                .content { padding:14px 16px 24px; }
                #bNav.on ~ .content { padding-bottom:calc(104px + env(safe-area-inset-bottom)); }
                .card { background:rgba(26,26,26,.97); backdrop-filter:none; padding:15px; }
                .earn .usd { font-size:1.8rem; }
                .mbox { padding:12px; }

                /* A lista .bnav é só desktop; no mobile ela some e entra a barra flutuante */
                .bnav, .bnav.on { display:none !important; }

                #bNav.on ~ .mnav { display:flex; }
                #bNav.on ~ .mfab { display:flex; }
                #bNav.on ~ .msheet { display:block; }

                .mnav {
                    align-items:center; justify-content:space-between;
                    position:fixed; left:14px; right:14px; bottom:calc(12px + env(safe-area-inset-bottom));
                    height:62px; padding:0 26px; z-index:1000;
                    color:var(--card-solid, #1a1a2e);
                    filter:drop-shadow(0 12px 26px rgba(0,0,0,.5));
                }
                .mnav .mgrp { display:flex; gap:34px; position:relative; z-index:1; }
                .mnav button { display:grid; place-items:center; background:none; border:none; color:var(--muted); padding:8px; cursor:pointer; }
                .mnav button svg { width:23px; height:23px; fill:currentColor; opacity:.58; transition:opacity .2s,color .2s; }
                .mnav button[aria-current="page"] { color:var(--cyan); }
                .mnav button[aria-current="page"] svg { opacity:1; filter:drop-shadow(0 0 5px var(--cyan)); }

                .mfab {
                    align-items:center; justify-content:center;
                    position:fixed; left:50%; bottom:calc(12px + env(safe-area-inset-bottom) + 34px);
                    transform:translateX(-50%);
                    width:54px; height:54px; border:none; border-radius:50%;
                    background:var(--rank-grad,linear-gradient(135deg,#3b82f6,#00d4d4));
                    color:#fff; cursor:pointer; z-index:1002;
                    box-shadow:0 12px 28px -6px rgba(0,0,0,.55), 0 0 18px var(--rank-glow,rgba(59,130,246,.28));
                    transition:transform .25s ease;
                }
                .mfab svg { width:24px; height:24px; }
                .mfab.on { transform:translateX(-50%) rotate(45deg); }

                .msheet { position:fixed; inset:0; z-index:1003; background:rgba(0,0,0,.5); opacity:0; pointer-events:none; transition:opacity .22s ease; }
                .msheet.on { opacity:1; pointer-events:auto; }
                .msheet-in {
                    position:absolute; left:0; right:0; bottom:0;
                    background:var(--glass); backdrop-filter:blur(12px);
                    border-top:1px solid var(--border); border-radius:22px 22px 0 0;
                    padding:8px 14px calc(20px + env(safe-area-inset-bottom));
                    max-height:82vh; overflow-y:auto;
                    transform:translateY(100%); transition:transform .28s cubic-bezier(.4,0,.2,1);
                }
                .msheet.on .msheet-in { transform:translateY(0); }
                .msheet-grab { width:38px; height:4px; border-radius:4px; background:var(--border); margin:4px auto 12px; }
                .msheet-sec { font-family:var(--dm-font-title,'Rajdhani',sans-serif); font-size:.62rem; font-weight:700; letter-spacing:2.5px; text-transform:uppercase; color:var(--muted); padding:10px 8px 6px; }
                .msheet-rows { display:flex; flex-direction:column; gap:2px; }
                .msrow { display:flex; align-items:center; gap:13px; width:100%; padding:12px 8px; border:none; border-radius:12px; background:none; font:inherit; font-size:.95rem; color:var(--text); text-align:left; cursor:pointer; font-family:var(--dm-font-body,'Exo 2',sans-serif); }
                .msrow[aria-current="page"] { background:var(--cyan-d); color:var(--cyan); }
                .msrow.sair { color:var(--red); }
                .msrow .msi { width:34px; height:34px; border-radius:10px; flex:none; background:var(--glass); border:1px solid var(--border); display:grid; place-items:center; color:var(--cyan); }
                .msrow.sair .msi { color:var(--red); border-color:rgba(248,113,113,.28); }
                .msrow .msi svg { width:16px; height:16px; fill:currentColor; }

                .molduras-frame{height:calc(100vh - 130px);min-height:620px;border-radius:0;}
            }

            .raaj{font-family:var(--dm-font-title,'Rajdhani',sans-serif);text-transform:uppercase;letter-spacing:.08em;}
            svg{fill:currentColor;display:inline-block;vertical-align:middle;flex-shrink:0;}
            .card{width:100%;background:var(--glass);border:1px solid var(--border);border-radius:20px;padding:20px;margin-bottom:15px;box-shadow:0 8px 32px rgba(0,0,0,.3);min-width:0;}
            .btn{width:100%;background:var(--rank-grad,linear-gradient(135deg,#3b82f6,#00d4d4));color:#000;border:1px solid var(--rank-border,rgba(0,212,212,.35));padding:14px;border-radius:12px;font-size:1rem;font-weight:700;font-family:var(--dm-font-title,'Rajdhani',sans-serif);cursor:pointer;text-transform:uppercase;transition:.3s;display:flex;align-items:center;justify-content:center;gap:8px;box-shadow:0 0 16px var(--rank-glow,rgba(59,130,246,.22));}
            .btn:hover{transform:translateY(-2px);box-shadow:0 6px 22px var(--rank-glow,rgba(59,130,246,.28));}
            .btn:disabled{background:#333;color:#666;cursor:not-allowed;transform:none;box-shadow:none;}
            .btn-txt{background:none;border:none;color:var(--cyan);padding:0;display:flex;align-items:center;font-family:var(--dm-font-title,'Rajdhani',sans-serif);font-weight:700;font-size:.9rem;cursor:pointer;gap:6px;}
            .btn-txt svg{width:20px;height:20px;}
            .btn-sm{background:none;border:1px solid var(--border);color:var(--cyan);padding:7px 12px;border-radius:10px;font-family:var(--dm-font-title,'Rajdhani',sans-serif);font-weight:700;font-size:.75rem;cursor:pointer;transition:.3s;display:flex;align-items:center;gap:5px;}
            .btn-sm svg{width:14px;height:14px;}
            .btn-sm:hover{background:var(--cyan-d);}
            .ig{margin-bottom:16px;text-align:left;}
            .ig label{display:block;font-size:.75rem;color:var(--cyan);margin-bottom:6px;font-weight:600;font-family:var(--dm-font-title,'Rajdhani',sans-serif);}
            .pref-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:4px;}
            .pref-note{font-size:.78rem;color:var(--muted);line-height:1.55;margin-top:6px;}
            @media(max-width:520px){.pref-grid{grid-template-columns:1fr;}}
            .iw{position:relative;display:flex;align-items:center;}
            .iw .ico{position:absolute;left:14px;width:18px;height:18px;fill:var(--muted);pointer-events:none;}
            .iw .eye{position:absolute;right:12px;width:20px;height:20px;fill:var(--muted);cursor:pointer;}
            .iw .eye:hover{fill:var(--cyan);}
            input,select{width:100%;background:rgba(0,0,0,.5);border:1px solid var(--border);padding:14px 14px 14px 42px;border-radius:10px;color:var(--text);font-size:.95rem;outline:none;transition:.3s;font-family:var(--dm-font-body,'Exo 2',sans-serif);}
            select{appearance:none;padding-right:36px;cursor:pointer;}
            input:focus,select:focus{border-color:var(--cyan);box-shadow:0 0 10px var(--cyan-d);}
            input[readonly]{opacity:.55;cursor:not-allowed;}
            .prules{display:flex;gap:16px;margin-top:6px;}
            .prule{font-size:.72rem;font-family:var(--dm-font-title,'Rajdhani',sans-serif);display:flex;align-items:center;gap:4px;}
            .prule svg{width:10px;height:10px;}
            .prule.ok{color:var(--green);}.prule.fail{color:var(--red);}
            .view{display:none;width:100%;animation:fi .4s ease;}
            .view.on{display:block;}
            .auth-view{max-width:420px;margin:0 auto;}
            .dash-view{max-width:1100px;margin:0 auto;}
            /* Login/cadastro/recuperar — padrão "app moderno" (mesmo do painel do agente):
               campo em pílula + selo de ícone circular em gradiente + botão pílula com brilho */
            .vlogo{height:44px;width:auto;margin:0 auto 16px;display:block;}
            [data-theme="branco"] .vlogo,[data-theme="rosa"] .vlogo,[data-theme="laranja"] .vlogo{filter:brightness(0);}
            #vL .card{background:none;border:none;box-shadow:none;padding:24px 6px;margin-top:6vh;}
            .auth-view .iw{background:rgba(0,0,0,.4);border:1px solid var(--border);border-radius:999px;padding:6px;transition:border-color .25s,box-shadow .25s;}
            [data-theme="branco"] .auth-view .iw,[data-theme="rosa"] .auth-view .iw,[data-theme="laranja"] .auth-view .iw{background:rgba(0,0,0,.04);}
            .auth-view .iw:focus-within{border-color:var(--cyan);box-shadow:0 0 0 4px var(--cyan-d);}
            .auth-view .iw .ico{position:static;width:44px;height:44px;flex:none;border-radius:999px;display:grid;place-items:center;padding:0;background:var(--rank-grad,linear-gradient(135deg,#3b82f6,#00d4d4));fill:#fff;}
            [data-theme="branco"] .auth-view .iw .ico,
            [data-theme="rosa"] .auth-view .iw .ico,
            [data-theme="laranja"] .auth-view .iw .ico{background:var(--bloom,linear-gradient(135deg,#3b82f6,#00d4d4));}
            .auth-view .iw .ico svg{width:20px;height:20px;fill:#fff;}
            .auth-view .iw input{background:none;border:none;padding:0 14px;height:44px;box-shadow:none;}
            .auth-view .iw input:focus{background:none;border:none;box-shadow:none;}
            .auth-view .iw .eye{position:static;margin-left:auto;margin-right:10px;flex:none;}
            .auth-view .btn{border-radius:999px;height:54px;padding:0;color:#fff;}
            .auth-view .btn:disabled{color:#666;}
            @keyframes fi{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
            .dash-grid{display:grid;grid-template-columns:1fr 1.3fr;gap:20px;align-items:start;}
            .dash-left,.dash-right{min-width:0;}
            @media(max-width:992px){.dash-grid{grid-template-columns:1fr;gap:0;}}

            /* ── DASHBOARD do streamer — versão prévia (Finnova-like) ── */
            .dash-view{max-width:960px;margin:0;align-self:flex-start;}
            .greet{display:flex;align-items:center;gap:14px;padding:14px 16px;margin-bottom:14px;}
            .greet .ava{width:52px;height:52px;}
            .greet-txt{flex:1;min-width:0;}
            .greet-txt h2{font-family:var(--dm-font-title,'Rajdhani',sans-serif);font-size:1.15rem;font-weight:700;color:var(--text);line-height:1.15;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
            .greet-txt p{font-size:.72rem;color:var(--muted);margin-top:2px;font-family:var(--dm-font-title,'Rajdhani',sans-serif);}
            .greet .btn-sm{flex-shrink:0;}

            .dstat-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:14px;}
            @media(max-width:560px){.dstat-grid{grid-template-columns:1fr;}}
            .dstat{background:var(--glass);border:1px solid var(--border);border-radius:16px;padding:14px 16px;display:flex;flex-direction:column;gap:4px;min-width:0;}
            .dstat .dk{font-size:.66rem;color:var(--muted);font-weight:700;font-family:var(--dm-font-title,'Rajdhani',sans-serif);text-transform:uppercase;letter-spacing:.04em;display:flex;align-items:center;gap:6px;}
            .dstat .dk svg{width:13px;height:13px;fill:var(--cyan);flex-shrink:0;}
            .dstat .dv{font-family:var(--dm-font-title,'Rajdhani',sans-serif);font-weight:700;font-size:1.55rem;color:var(--text);line-height:1;margin-top:3px;}
            .dstat .dv small{font-size:.72rem;color:var(--muted);font-weight:400;}
            .dstat .dsub{font-size:.68rem;color:var(--muted);font-family:var(--dm-font-title,'Rajdhani',sans-serif);}

            .dwide{display:grid;grid-template-columns:1.35fr 1fr;gap:14px;align-items:start;margin-bottom:14px;}
            @media(max-width:900px){.dwide{grid-template-columns:1fr;}}
            .dwide .dstack{display:flex;flex-direction:column;gap:14px;min-width:0;}
            .card > h3.dcard-h{font-family:var(--dm-font-title,'Rajdhani',sans-serif);font-size:.95rem;font-weight:700;color:var(--text);text-transform:uppercase;letter-spacing:.04em;margin-bottom:12px;display:flex;align-items:center;justify-content:space-between;gap:8px;}

            #chLegend{display:none;align-items:center;gap:16px;margin-top:10px;font-size:.7rem;color:var(--muted);font-family:var(--dm-font-title,'Rajdhani',sans-serif);}
            #chLegend span{display:flex;align-items:center;gap:6px;}
            #chLegend i{width:14px;height:3px;border-radius:2px;display:inline-block;}

            .metas-bar{margin-bottom:14px;}
            .metas-bar:last-child{margin-bottom:0;}
            .metas-bar .mb-top{display:flex;justify-content:space-between;align-items:baseline;font-family:var(--dm-font-title,'Rajdhani',sans-serif);font-size:.78rem;font-weight:700;color:var(--text);margin-bottom:7px;}
            .metas-bar .mb-top span:last-child{color:var(--muted);font-size:.72rem;}

            .hist-row{display:flex;align-items:center;gap:12px;padding:11px 2px;border-bottom:1px solid var(--border);}
            .hist-row:last-child{border-bottom:none;}
            .hist-row.off{opacity:.45;}
            .hist-row .hist-d{font-family:var(--dm-font-title,'Rajdhani',sans-serif);font-weight:700;font-size:.82rem;color:var(--text);width:52px;flex:none;}
            .hist-row .hist-mid{flex:1;min-width:0;display:flex;flex-direction:column;}
            .hist-row .hist-mid b{font-family:var(--dm-font-title,'Rajdhani',sans-serif);font-size:.82rem;font-weight:700;color:var(--text);}
            .hist-row .hist-mid span{font-size:.68rem;color:var(--muted);}
            .hist-pill{flex:none;font-size:.6rem;font-weight:700;font-family:var(--dm-font-title,'Rajdhani',sans-serif);text-transform:uppercase;letter-spacing:.03em;padding:3px 9px;border-radius:999px;}
            .hist-pill.ok{background:rgba(74,222,128,.15);color:var(--green);border:1px solid rgba(74,222,128,.3);}
            .hist-pill.mut{background:rgba(255,255,255,.05);color:var(--muted);border:1px solid var(--border);}
            [data-theme="branco"] .shell .hist-pill.mut,
            [data-theme="rosa"] .shell .hist-pill.mut,
            [data-theme="laranja"] .shell .hist-pill.mut{background:rgba(0,0,0,.04);}
            [data-theme="branco"] .shell .dstat .dv,
            [data-theme="rosa"] .shell .dstat .dv,
            [data-theme="laranja"] .shell .dstat .dv{color:var(--text);}
            .hd{display:flex;justify-content:flex-end;align-items:center;margin-bottom:15px;}
            .pcard{display:flex;align-items:center;gap:15px;padding:15px 20px;}
            .ava{width:60px;height:60px;border-radius:50%;border:2px solid var(--cyan);background:#000;display:flex;justify-content:center;align-items:center;overflow:hidden;flex-shrink:0;}
            .ava img{width:100%;height:100%;object-fit:cover;}
            .earn{text-align:center;background:linear-gradient(135deg,rgba(0,212,212,.1),rgba(0,0,0,.4));border-color:var(--cyan);}
            .earn .lbl{font-size:.75rem;color:var(--muted);text-transform:uppercase;letter-spacing:1px;}
            .earn .usd{font-size:2.2rem;color:var(--cyan);font-weight:700;margin:5px 0;text-shadow:0 0 15px var(--cyan-d);}
            .mgrid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:15px;}
            .mbox{background:rgba(0,0,0,.3);border:1px solid rgba(255,255,255,.05);border-radius:14px;padding:15px;display:flex;flex-direction:column;min-width:0;}
            .mbox .mlbl{font-size:.7rem;color:var(--muted);display:flex;align-items:center;gap:4px;margin-bottom:6px;font-family:var(--dm-font-title,'Rajdhani',sans-serif);text-transform:uppercase;}
            .mbox .mlbl svg{width:13px;height:13px;}
            .mbox .val{font-size:var(--fval);color:#fff;font-weight:700;font-family:var(--dm-font-title,'Rajdhani',sans-serif);}
            .hsub{display:flex;flex-direction:column;gap:4px;margin-top:8px;}
            .hrow{display:flex;justify-content:space-between;align-items:center;}
            .hrow .tag{font-size:.65rem;color:var(--muted);font-family:var(--dm-font-title,'Rajdhani',sans-serif);text-transform:uppercase;display:flex;align-items:center;gap:3px;}
            .hrow .tag svg{width:11px;height:11px;}
            .hrow .hv{font-size:.8rem;font-weight:700;font-family:var(--dm-font-title,'Rajdhani',sans-serif);}
            .prog{width:100%;background:#222;border-radius:8px;height:8px;margin-top:10px;overflow:hidden;}
            [data-theme="branco"] .shell .prog,
            [data-theme="rosa"] .shell .prog,
            [data-theme="laranja"] .shell .prog{background:rgba(0,0,0,.08);}
            .progf{height:100%;background:var(--cyan);border-radius:8px;box-shadow:0 0 8px var(--cyan);transition:width .5s ease;}
            .ctogs{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;gap:8px;flex-wrap:wrap;}
            .tgrp{display:flex;gap:6px;}
            .tbtn{background:rgba(0,0,0,.4);border:1px solid var(--border);color:var(--muted);padding:5px 12px;border-radius:8px;font-family:var(--dm-font-title,'Rajdhani',sans-serif);font-weight:700;font-size:.75rem;cursor:pointer;transition:.2s;text-transform:uppercase;}
            .tbtn.on{background:var(--cyan-d);border-color:var(--cyan);color:var(--cyan);}
            .chwrap{position:relative;height:200px;width:100%;margin-top:10px;}
            .htbl{width:100%;border-collapse:collapse;margin-top:10px;}
            .htbl th{font-size:.65rem;color:var(--muted);font-family:var(--dm-font-title,'Rajdhani',sans-serif);text-transform:uppercase;padding:4px 6px;text-align:left;border-bottom:1px solid var(--border);}
            .htbl th svg{width:12px!important;height:12px!important;flex-shrink:0;}
            .htbl th.r,.htbl td.r{text-align:right;}
            .htbl td{font-size:.8rem;padding:8px 6px;border-bottom:1px solid rgba(255,255,255,.04);vertical-align:middle;}
            .htbl tr:last-child td{border-bottom:none;}
            .badge{display:inline-block;padding:2px 10px;border-radius:20px;font-size:.65rem;font-family:var(--dm-font-title,'Rajdhani',sans-serif);font-weight:700;text-transform:uppercase;}
            .badge.ok{background:rgba(74,222,128,.15);color:var(--green);border:1px solid rgba(74,222,128,.3);}
            .badge.nok{background:rgba(248,113,113,.1);color:var(--red);border:1px solid rgba(248,113,113,.2);}
            .dc .dd{font-weight:700;font-family:var(--dm-font-title,'Rajdhani',sans-serif);}
            .dc .dw{font-size:.65rem;color:var(--muted);}
            .rst{display:none;animation:fi .3s ease;}.rst.on{display:block;}
            .al{display:none;border:1px solid var(--red);color:var(--red);padding:10px;border-radius:8px;font-size:.8rem;margin-bottom:15px;text-align:center;}
            .al.on{display:block;}
            .fEmail-box{background:rgba(0,212,212,.07);border:1px dashed var(--cyan);border-radius:12px;padding:14px 20px;margin-bottom:20px;}
            .fEmail-box .fe-lbl{font-size:.7rem;color:var(--muted);font-family:var(--dm-font-title,'Rajdhani',sans-serif);text-transform:uppercase;margin-bottom:4px;}
            .fEmail-box .fe-val{font-size:1rem;color:var(--cyan);font-family:var(--dm-font-title,'Rajdhani',sans-serif);font-weight:700;word-break:break-all;}

            /* ── CARTEIRA — topo azul + card branco sobreposto (demo redesign) ── */
            .cart-view{max-width:660px;margin:0;align-self:flex-start;}

            .wallet-head{
                background:linear-gradient(155deg,#3b82f6 0%,#1e40af 100%);
                border-radius:20px;
                padding:14px 18px 42px;
                color:#fff;
                text-align:center;
                position:relative;
                overflow:hidden;
            }
            .wallet-head::before{
                content:'';position:absolute;top:-55px;right:-45px;
                width:180px;height:180px;border-radius:50%;
                background:radial-gradient(circle,rgba(255,255,255,.14) 0%,transparent 70%);
                pointer-events:none;
            }
            .wallet-head .wbar{display:flex;align-items:center;gap:10px;margin-bottom:16px;position:relative;z-index:1;}
            .wallet-head .wbar button{
                width:34px;height:34px;border-radius:11px;flex:none;
                background:rgba(255,255,255,.16);border:none;color:#fff;
                display:flex;align-items:center;justify-content:center;cursor:pointer;
                transition:background .2s;
            }
            .wallet-head .wbar button:hover{background:rgba(255,255,255,.28);}
            .wallet-head .wbar button svg{width:16px;height:16px;fill:#fff;}
            .wallet-head .wbar b{
                flex:1;font-family:var(--dm-font-title,'Rajdhani',sans-serif);
                font-size:.78rem;letter-spacing:.16em;text-transform:uppercase;font-weight:700;
            }
            .wallet-head .wlbl{
                font-size:.64rem;letter-spacing:.16em;text-transform:uppercase;
                color:rgba(255,255,255,.85);font-weight:700;
                font-family:var(--dm-font-title,'Rajdhani',sans-serif);
                position:relative;z-index:1;
            }
            .wallet-head .wbig{
                font-family:var(--dm-font-title,'Rajdhani',sans-serif);font-weight:700;
                font-size:2.5rem;margin-top:7px;line-height:1;color:#fff;
                text-shadow:0 0 24px rgba(255,255,255,.25);
                position:relative;z-index:1;
            }
            .wallet-head .wsub{
                font-size:.72rem;color:rgba(255,255,255,.7);margin-top:9px;
                font-family:var(--dm-font-title,'Rajdhani',sans-serif);
                position:relative;z-index:1;
            }

            .wallet-panel{
                background:var(--glass);
                border:1px solid var(--border);
                border-radius:18px;
                margin:-30px 12px 16px;
                padding:16px;
                position:relative;z-index:2;
                box-shadow:0 12px 34px rgba(0,0,0,.3);
            }
            .wallet-figs{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px;}
            .wallet-figs > div + div{border-left:1px solid var(--border);padding-left:14px;}
            .wallet-figs .k{
                font-size:.66rem;color:var(--muted);font-weight:700;
                font-family:var(--dm-font-title,'Rajdhani',sans-serif);
                text-transform:uppercase;letter-spacing:.04em;
                display:flex;align-items:center;gap:6px;
            }
            .wallet-figs .k svg{width:13px;height:13px;flex-shrink:0;fill:currentColor;}
            .wallet-figs .k img{width:13px;height:13px;object-fit:contain;flex-shrink:0;}
            .wallet-figs .v{
                font-family:var(--dm-font-title,'Rajdhani',sans-serif);font-weight:700;
                font-size:1.3rem;margin-top:6px;color:var(--text);
            }
            .wallet-cta{
                display:flex;align-items:center;justify-content:center;gap:9px;width:100%;
                padding:14px;border:none;border-radius:12px;
                background:var(--rank-grad,linear-gradient(135deg,#3b82f6,#00d4d4));
                color:#fff;font-family:var(--dm-font-title,'Rajdhani',sans-serif);font-weight:700;
                font-size:.95rem;letter-spacing:.05em;text-transform:uppercase;cursor:pointer;
                transition:transform .15s,box-shadow .2s,opacity .2s;
            }
            .wallet-cta:hover{transform:translateY(-1px);box-shadow:0 6px 22px rgba(59,130,246,.3);}
            .wallet-cta:disabled{background:#333;color:#777;cursor:not-allowed;transform:none;box-shadow:none;}
            .wallet-cta svg{width:15px;height:15px;fill:currentColor;}
            [data-theme="branco"] .shell .wallet-cta,
            [data-theme="rosa"] .shell .wallet-cta,
            [data-theme="laranja"] .shell .wallet-cta{ background:var(--bloom, var(--rank-grad)); }

            /* Transações — estilo demo (.txn) */
            .txn-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:2px 0 12px;flex-wrap:wrap;}
            .txn-head h3{font-family:var(--dm-font-title,'Rajdhani',sans-serif);font-size:.95rem;font-weight:700;color:var(--text);text-transform:uppercase;letter-spacing:.04em;}
            .txn-seg{display:flex;gap:3px;background:rgba(255,255,255,.05);border:1px solid var(--border);border-radius:10px;padding:3px;}
            .txn-seg button{background:none;border:none;color:var(--muted);cursor:pointer;font-family:var(--dm-font-title,'Rajdhani',sans-serif);font-weight:700;font-size:.68rem;text-transform:uppercase;letter-spacing:.03em;padding:6px 11px;border-radius:8px;transition:background .15s,color .15s;}
            .txn-seg button.on{background:var(--cyan-d);color:var(--cyan);}

            .txn{display:flex;align-items:center;gap:12px;padding:12px;border:1px solid var(--border);border-radius:14px;background:var(--glass);}
            .txn + .txn{margin-top:9px;}
            .txn .ti{width:40px;height:40px;border-radius:12px;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
            .txn .ti svg{width:17px;height:17px;}
            .txn .ti.in{background:rgba(74,222,128,.14);}
            .txn .ti.in svg{fill:var(--green);}
            .txn .ti.out{background:rgba(248,113,113,.12);}
            .txn .ti.out svg{fill:var(--red);}
            .txn .tb{flex:1;min-width:0;}
            .txn .tb b{font-family:var(--dm-font-title,'Rajdhani',sans-serif);font-size:.85rem;font-weight:700;color:var(--text);display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
            .txn .tb .m{display:flex;align-items:center;gap:7px;margin-top:3px;font-size:.68rem;color:var(--muted);min-width:0;}
            .txn .tb .m .tag{font-size:.58rem;padding:2px 6px;border-radius:5px;background:var(--cyan-d);color:var(--cyan);font-weight:700;white-space:nowrap;flex-shrink:0;text-transform:uppercase;letter-spacing:.03em;}
            .txn .tb .m .dt{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
            .txn .amt{text-align:right;flex:none;font-family:var(--dm-font-title,'Rajdhani',sans-serif);font-size:.95rem;font-weight:700;color:var(--muted);}
            .txn .amt.pos{color:var(--green);}
            .txn-empty{text-align:center;color:var(--muted);font-size:.8rem;padding:24px 0;}

            .saque-badge{display:inline-block;padding:2px 8px;border-radius:20px;font-size:.65rem;font-family:var(--dm-font-title,'Rajdhani',sans-serif);font-weight:700;text-transform:uppercase;}
            .saque-badge.pendente{background:rgba(240,192,64,.1);color:var(--gold);border:1px solid rgba(240,192,64,.3);}
            .saque-badge.aprovado{background:rgba(74,222,128,.1);color:var(--green);border:1px solid rgba(74,222,128,.3);}
            .saque-badge.rejeitado{background:rgba(248,113,113,.1);color:var(--red);border:1px solid rgba(248,113,113,.2);}
            .saque-badge.pago{background:rgba(0,212,212,.1);color:var(--cyan);border:1px solid var(--border);}
            .pix-warn{background:rgba(240,192,64,.07);border:1px solid rgba(240,192,64,.3);border-radius:12px;padding:14px 16px;margin-bottom:15px;display:flex;align-items:flex-start;gap:10px;font-size:.8rem;color:var(--gold);line-height:1.5;}
            .pix-warn svg{width:18px;height:18px;fill:var(--gold);flex-shrink:0;margin-top:1px;}
            .saque-form{background:rgba(0,0,0,.3);border:1px solid var(--border);border-radius:14px;padding:16px;margin-bottom:15px;}
            .saque-form h3{font-family:var(--dm-font-title,'Rajdhani',sans-serif);font-size:.85rem;color:var(--cyan);margin-bottom:12px;text-transform:uppercase;letter-spacing:.06em;}
            .valor-input-wrap{position:relative;display:flex;align-items:center;margin-bottom:12px;}
            .valor-input-wrap .prefix{position:absolute;left:14px;color:var(--muted);font-family:var(--dm-font-title,'Rajdhani',sans-serif);font-weight:700;font-size:1rem;pointer-events:none;}
            .valor-input-wrap input{padding-left:46px!important;}

            /* ── Botão voltar nas views inline (rank / impulso) ── */
            .iframe-back{display:flex;align-items:center;gap:8px;background:none;border:none;color:var(--cyan);font-family:var(--dm-font-title,'Rajdhani',sans-serif);font-weight:700;font-size:.9rem;cursor:pointer;padding:0 0 14px;text-transform:uppercase;}
            .iframe-back svg{width:20px;height:20px;fill:var(--cyan);}
            .molduras-frame{display:block;width:100%;height:calc(100vh - 48px);min-height:720px;border:0;border-radius:8px;background:transparent;}

            /* ── Banners de comunicados ── */
            .dm-comunicado{display:flex;align-items:flex-start;gap:10px;padding:11px 15px;border-radius:12px;background:rgba(240,192,64,0.08);border:1px solid rgba(240,192,64,0.30);animation:fi .4s ease both;width:100%;}
            .dm-comunicado-ico{font-size:1.2rem;line-height:1;flex-shrink:0;}
            .dm-comunicado-txt{font-size:0.78rem;color:var(--muted);line-height:1.55;flex:1;}
            .dm-comunicado-txt strong,.dm-comunicado-txt b{color:var(--gold);}
            /* Temas claros */
            [data-theme="branco"] .dm-comunicado,[data-theme="laranja"] .dm-comunicado{background:rgba(180,130,0,0.07);border-color:rgba(180,130,0,0.30);}
            [data-theme="rosa"] .dm-comunicado{background:rgba(233,30,140,0.07);border-color:rgba(233,30,140,0.28);}
            /* Dark */
            [data-theme="dark"] .dm-comunicado{background:rgba(240,192,64,0.06);border-color:rgba(240,192,64,0.22);}

            /* ── View Avisos ── */
            .avisos-topbar{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;gap:8px;flex-wrap:wrap;}
            .avisos-topbar .iframe-back{padding:0;}
            .btn-mark-all{display:flex;align-items:center;gap:6px;background:none;border:1.5px solid var(--border);color:var(--cyan);border-radius:20px;padding:7px 14px;font-family:var(--dm-font-title,'Rajdhani',sans-serif);font-weight:700;font-size:.78rem;text-transform:uppercase;letter-spacing:.05em;cursor:pointer;transition:background .2s,border-color .2s;white-space:nowrap;}
            .btn-mark-all:hover{background:rgba(0,212,212,.07);border-color:var(--cyan);}
            .btn-mark-all svg{width:14px;height:14px;fill:var(--cyan);}
            /* Card destaque */
            .aviso-destaque{border-radius:16px;border:1.5px solid var(--border);overflow:hidden;margin-bottom:20px;animation:fi .4s ease both;}
            .aviso-destaque-img{width:100%;aspect-ratio:32/9;object-fit:cover;display:block;}
            .aviso-destaque-body{padding:16px;}
            .aviso-destaque-titulo{font-family:var(--dm-font-title,'Rajdhani',sans-serif);font-size:1.15rem;font-weight:700;color:var(--text);line-height:1.25;margin-bottom:3px;}
            .aviso-destaque-sub{font-size:.78rem;color:var(--cyan);font-family:var(--dm-font-title,'Rajdhani',sans-serif);font-weight:700;text-transform:uppercase;letter-spacing:.05em;margin-bottom:10px;}
            .aviso-destaque-desc{font-size:.82rem;color:var(--muted);line-height:1.55;margin-bottom:14px;}
            .aviso-destaque-btns{display:flex;gap:8px;flex-wrap:wrap;}
            .aviso-btn-sec{background:none;border:1.5px solid var(--border);color:var(--text);border-radius:8px;padding:9px 18px;font-family:var(--dm-font-title,'Rajdhani',sans-serif);font-weight:700;font-size:.85rem;text-transform:uppercase;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center;transition:border-color .2s;}
            .aviso-btn-sec:hover{border-color:var(--cyan);}
            .aviso-btn-pri{background:var(--cyan);border:none;color:#000;border-radius:8px;padding:9px 18px;font-family:var(--dm-font-title,'Rajdhani',sans-serif);font-weight:700;font-size:.85rem;text-transform:uppercase;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center;transition:opacity .2s;}
            .aviso-btn-pri:hover{opacity:.85;}
            /* Seção lista */
            .avisos-sec-titulo{font-family:var(--dm-font-title,'Rajdhani',sans-serif);font-size:1rem;font-weight:700;color:var(--text);text-transform:uppercase;letter-spacing:.05em;margin:0 0 10px;}
            .avisos-list{display:flex;flex-direction:column;gap:8px;}
            /* Card item */
            .aviso-card{display:flex;align-items:flex-start;gap:12px;padding:12px 14px;border-radius:14px;border:1px solid var(--border);background:var(--glass);animation:fi .35s ease both;cursor:default;}
            .aviso-card-thumb{width:64px;height:64px;object-fit:cover;border-radius:10px;flex-shrink:0;display:block;}
            .aviso-card-emoji{width:64px;height:64px;display:flex;align-items:center;justify-content:center;font-size:1.8rem;flex-shrink:0;border-radius:10px;background:rgba(240,192,64,.08);border:1px solid rgba(240,192,64,.2);}
            .aviso-card-body{flex:1;min-width:0;}
            .aviso-card-titulo{font-weight:700;font-size:.88rem;color:var(--text);line-height:1.3;margin-bottom:3px;}
            .aviso-card-desc{font-size:.78rem;color:var(--muted);line-height:1.5;margin-bottom:6px;}
            .aviso-card-data{font-size:.7rem;color:var(--muted);opacity:.7;display:flex;align-items:center;gap:4px;}
            .aviso-card-data svg{width:11px;height:11px;flex-shrink:0;}
            .avisos-empty{text-align:center;color:var(--muted);font-size:.85rem;padding:32px 0;opacity:.7;}
            .avisos-loading{text-align:center;color:var(--muted);font-size:.85rem;padding:32px 0;opacity:.7;}

            /* ══ TEMA DARK — cinza neutro, sem azul ══ */
            [data-theme="dark"] .shell {
                --glass: rgba(12,13,15,.97);
                --border: rgba(255,255,255,.10);
            }
            [data-theme="dark"] .shell .card { background: rgba(12,13,15,.98); }
            [data-theme="dark"] .shell .mbox { background: rgba(0,0,0,.35); border-color: rgba(255,255,255,.06); }
            [data-theme="dark"] .shell .saque-form { background: rgba(0,0,0,.35); }
            @media(max-width:768px){
                [data-theme="dark"] .shell .card { background: rgba(12,13,15,.99); }
                [data-theme="dark"] .shell .bnav { background: rgba(18,18,18,.99); border-top-color: rgba(255,255,255,.10); }
                [data-theme="dark"] .shell .nav-more { background: rgba(12,13,15,.99); border-color: rgba(255,255,255,.10); }
                [data-theme="dark"] .shell .nav-more .nit { background: rgba(255,255,255,.04); }
            }

            /* ══ TEMA BRANCO — bloom azul-petróleo (padrão do ranking) ══ */
            [data-theme="branco"] .shell {
                --cyan:#0095a8; --cyan-d:rgba(0,149,168,0.15);
                --gold:#b8860b; --red:#dc2626; --green:#15803d;
                --border:rgba(0,149,168,0.35); --glass:rgba(255,255,255,0.95);
                --text:#0d1117; --muted:#4a5568;
                --bloom: linear-gradient(135deg,#0369a1 0%,#0095a8 100%);
            }
            /* ══ TEMA ROSA — bloom pink/magenta ══ */
            [data-theme="rosa"] .shell {
                --cyan:#e91e8c; --cyan-d:rgba(233,30,140,0.15);
                --gold:#c2185b; --red:#b71c1c; --green:#2e7d32;
                --border:rgba(233,30,140,0.35); --glass:rgba(255,255,255,0.95);
                --text:#1a0010; --muted:#80004a;
                --bloom: linear-gradient(135deg,#e91e8c 0%,#ff6090 100%);
            }
            /* ══ TEMA LARANJA — bloom laranja/âmbar ══ */
            [data-theme="laranja"] .shell {
                --cyan:#f97316; --cyan-d:rgba(249,115,22,0.15);
                --gold:#ea580c; --red:#dc2626; --green:#15803d;
                --border:rgba(249,115,22,0.35); --glass:rgba(255,255,255,0.95);
                --text:#1a0a00; --muted:#7c3a00;
                --bloom: linear-gradient(135deg,#f97316 0%,#fbbf24 100%);
            }
            /* ══ Cards, inputs, nav — todos os temas claros ══ */
            [data-theme="branco"] .shell .card,
            [data-theme="rosa"] .shell .card,
            [data-theme="laranja"] .shell .card {
                background: var(--glass);
                border-color: var(--border);
                box-shadow: 0 4px 20px rgba(0,0,0,0.07);
            }
            [data-theme="branco"] .shell .mbox,
            [data-theme="rosa"] .shell .mbox,
            [data-theme="laranja"] .shell .mbox {
                background: rgba(0,0,0,0.04);
                border-color: rgba(0,0,0,0.07);
            }
            [data-theme="branco"] .shell .saque-form,
            [data-theme="rosa"] .shell .saque-form,
            [data-theme="laranja"] .shell .saque-form { background: rgba(0,0,0,0.03); }
            [data-theme="branco"] .shell input, [data-theme="branco"] .shell select,
            [data-theme="rosa"] .shell input,   [data-theme="rosa"] .shell select,
            [data-theme="laranja"] .shell input, [data-theme="laranja"] .shell select {
                background: rgba(0,0,0,0.05);
                border-color: var(--border);
                color: var(--text);
            }
            /* Botões toggle (Diamantes/Horas, 7dias/30dias) */
            [data-theme="branco"] .shell .tbtn,
            [data-theme="rosa"] .shell .tbtn,
            [data-theme="laranja"] .shell .tbtn {
                background: rgba(0,0,0,0.05);
                border-color: var(--border);
                color: var(--muted);
            }
            [data-theme="branco"] .shell .tbtn.on,
            [data-theme="rosa"] .shell .tbtn.on,
            [data-theme="laranja"] .shell .tbtn.on {
                background: var(--bloom, var(--cyan-d));
                border-color: transparent;
                color: #fff;
            }
            /* Botão principal (ENTRAR, ATUALIZAR etc.) */
            [data-theme="branco"] .shell .btn,
            [data-theme="rosa"] .shell .btn,
            [data-theme="laranja"] .shell .btn {
                background: var(--bloom, linear-gradient(90deg,var(--cyan),#008c8c));
            }
            /* FAB do menu móvel segue o bloom do tema (igual Admin/Agente) */
            [data-theme="branco"] .shell .mfab,
            [data-theme="rosa"] .shell .mfab,
            [data-theme="laranja"] .shell .mfab {
                background: var(--bloom, var(--rank-grad,linear-gradient(135deg,#3b82f6,#00d4d4)));
            }
            /* Barra de progresso */
            [data-theme="branco"] .shell .progf,
            [data-theme="rosa"] .shell .progf,
            [data-theme="laranja"] .shell .progf {
                background: var(--bloom, var(--cyan));
                box-shadow: none;
            }
            /* Nav lateral */
            [data-theme="branco"] .shell .bnav,
            [data-theme="rosa"] .shell .bnav,
            [data-theme="laranja"] .shell .bnav { border-right-color: var(--border); }
            @media(max-width:768px){
                [data-theme="branco"] .shell .bnav,
                [data-theme="rosa"] .shell .bnav,
                [data-theme="laranja"] .shell .bnav {
                    background: rgba(255,255,255,0.97);
                    border-top-color: var(--border);
                    backdrop-filter: blur(12px);
                }
                [data-theme="branco"] .shell .nav-more,
                [data-theme="rosa"] .shell .nav-more,
                [data-theme="laranja"] .shell .nav-more {
                    background: rgba(255,255,255,0.97);
                    border-color: var(--border);
                }
                [data-theme="branco"] .shell .nav-more .nit,
                [data-theme="rosa"] .shell .nav-more .nit,
                [data-theme="laranja"] .shell .nav-more .nit {
                    background: rgba(0,0,0,0.04);
                }
            }
            /* Topo da carteira — segue a cor do tema */
            [data-theme="branco"] .shell .wallet-head { background: linear-gradient(155deg,#0284c7 0%,#0c4a6e 100%); }
            [data-theme="rosa"] .shell .wallet-head { background: linear-gradient(155deg,#e91e8c 0%,#831843 100%); }
            [data-theme="laranja"] .shell .wallet-head { background: linear-gradient(155deg,#f97316 0%,#7c2d12 100%); }
            /* Loading overlay */
            [data-theme="branco"] #vLoading,
            [data-theme="rosa"] #vLoading,
            [data-theme="laranja"] #vLoading { background: rgba(240,244,248,0.97) !important; }
        </style>

        <div class="shell">
            <!-- ══════ LOADING INICIAL ══════ -->
            <div id="vLoading" style="position:absolute;inset:0;background:rgba(4,4,20,.97);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;z-index:9999;min-height:100vh">
                <div style="width:48px;height:48px;border-radius:50%;border:3px solid rgba(0,212,212,.15);border-top-color:var(--cyan);animation:spinC .7s linear infinite"></div>
                <span style="font-family:var(--dm-font-title,'Rajdhani',sans-serif);font-size:.85rem;color:var(--muted);letter-spacing:2px">CARREGANDO...</span>
            </div>
            <style>@keyframes spinC{to{transform:rotate(360deg)}}</style>

            <!-- ══════ MENU ══════ -->
            <nav class="bnav" id="bNav">
                <div class="bnav-head">Painel do Host</div>
                <button class="nit on" id="nD">${this.svgGrid()} <span data-i18n="dashboard">RESUMO</span></button>
                <button class="nit" id="nC">${this.svgWallet()} <span data-i18n="wallet">CARTEIRA</span></button>
                <button class="nit" id="nImpulso">${this.svgBoost()} <span data-i18n="boost">IMPULSO</span></button>
                <button class="nit nav-toggle" id="nMore" type="button">${this.svgChevron()} <span data-i18n="more">MAIS</span></button>
                <div class="nav-more" id="navMore">
                    <button class="nit" id="nS">${this.svgUser()} <span data-i18n="profile">PERFIL</span></button>
                    <button class="nit" id="nMolduras">${this.svgFrame()} <span data-i18n="frames">MOLDURAS</span></button>
                    <button class="nit" id="nRank">${this.svgRank()} <span data-i18n="ranking">RANKING</span></button>
                    <button class="nit" id="nVotacao">${this.svgVote()} <span data-i18n="vote">VOTAÇÃO</span></button>
                    <button class="nit" id="nPk">${this.svgPk()} <span data-i18n="pk">PK DIÁRIO</span></button>
                    <button class="nit hidden" id="nTickets">${this.svgTicket()} <span data-i18n="tickets">TICKETS</span></button>
                    <a class="nit hidden" id="nAtalhoAdmin" href="admin/index.html">${this.svgShield()} <span>ADMIN</span></a>
                    <a class="nit hidden" id="nAtalhoAgente" href="agente/index.html">${this.svgAgente()} <span>AGENTE</span></a>
                    <button class="nit sair" id="nO">${this.svgLogout()} <span data-i18n="logout">SAIR</span></button>
                </div>
            </nav>

            <!-- ══════ MENU MÓVEL — barra flutuante com entalhe + FAB (padrão Admin/Agente) ══════ -->
            <nav class="mnav" id="mNav" aria-label="Navegação rápida">
                <svg class="mnav-bg" preserveAspectRatio="none" aria-hidden="true"><path fill="currentColor"></path></svg>
                <div class="mgrp" data-g="a">
                    <button type="button" data-nav="nD" aria-label="Resumo">${this.svgGrid()}</button>
                    <button type="button" data-nav="nC" aria-label="Carteira">${this.svgWallet()}</button>
                </div>
                <div class="mgrp" data-g="b">
                    <button type="button" data-nav="nImpulso" aria-label="Impulso">${this.svgBoost()}</button>
                    <button type="button" data-nav="nRank" aria-label="Ranking">${this.svgRank()}</button>
                </div>
            </nav>
            <button class="mfab" id="mFab" type="button" aria-label="Abrir menu">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            </button>
            <div class="msheet" id="mSheet">
                <div class="msheet-in">
                    <div class="msheet-grab"></div>
                    <div class="msheet-sec">Menu</div>
                    <div class="msheet-rows" id="mSheetRows"></div>
                </div>
            </div>

            <div class="content">

                <!-- ══════ LOGIN ══════ -->
                <div id="vL" class="view auth-view">
                    <div class="card" style="text-align:center;">
                        <img class="vlogo" src="https://static.wixstatic.com/media/ac74b3_a9a577806ac34acbb663f4cd05e8c70f~mv2.png" alt="DMaior Agency">
                        <p class="raaj" style="font-size:1rem;color:var(--cyan);margin-bottom:26px;">Acesso do Streamer</p>
                        <div id="alL" class="al"></div>
                        <div class="ig"><label class="raaj">UID NUMERICO</label>
                            <div class="iw"><span class="ico">${this.svgUser()}</span>
                                <input type="number" id="lUid" placeholder="Digite seu UID">
                            </div>
                        </div>
                        <div class="ig"><label class="raaj">SENHA</label>
                            <div class="iw"><span class="ico">${this.svgLock()}</span>
                                <input type="password" id="lPass" placeholder="Senha de acesso">
                                <span class="eye" id="eyeL">${this.svgEyeOn()}</span>
                            </div>
                        </div>
                        <button class="btn" id="btnL">ENTRAR NO PAINEL</button>
                        <p style="margin-top:25px;font-size:.8rem;color:var(--muted);">Primeiro Acesso?
                            <a href="#" id="goReg" style="color:var(--gold);text-decoration:none;font-weight:600;">Validar Cadastro</a>
                        </p>
                        <p style="margin-top:10px;font-size:.8rem;color:var(--muted);">Esqueceu a senha?
                            <a href="#" id="goForgot" style="color:var(--cyan);text-decoration:none;font-weight:600;">Recuperar acesso</a>
                        </p>
                    </div>
                </div>

                <!-- ══════ CADASTRO ══════ -->
                <div id="vR" class="view auth-view">
                    <div class="hd" style="justify-content:flex-start;">
                        <button class="btn-txt" id="backL"><span>${this.svgBack()}</span> Voltar</button>
                    </div>
                    <div class="card" style="text-align:center;padding:40px 25px;">
                        <h1 class="raaj" style="font-size:var(--ftitle);color:var(--gold);margin-bottom:5px;">VALIDACAO DE CONTA</h1>
                        <p style="font-size:.8rem;color:var(--muted);margin-bottom:25px;">Autorize seu acesso ao sistema.</p>
                        <div id="alR" class="al"></div>
                        <div id="rs1" class="rst on">
                            <div class="ig"><label class="raaj">UID KWAI</label>
                                <div class="iw"><span class="ico">${this.svgLink()}</span>
                                    <input type="number" id="rUid" placeholder="Numeracao interna">
                                </div>
                            </div>
                            <div class="ig"><label class="raaj">E-MAIL</label>
                                <div class="iw"><span class="ico">${this.svgMail()}</span>
                                    <input type="email" id="rEmail" placeholder="seu@email.com">
                                </div>
                            </div>
                            <button class="btn" id="btnCode">RECEBER CODIGO</button>
                        </div>
                        <div id="rs2" class="rst">
                            <p style="font-size:.85rem;color:var(--text);margin-bottom:15px;">Insira o codigo de validacao enviado.</p>
                            <div class="ig"><div class="iw">
                                <input type="text" id="rOtp" maxlength="6" style="text-align:center;font-size:1.5rem;letter-spacing:12px;padding-left:14px;" placeholder="------">
                            </div></div>
                            <button class="btn" id="btnOtp">CONFIRMAR CODIGO</button>
                        </div>
                        <div id="rs3" class="rst">
                            <div class="ig"><label class="raaj">CRIAR SENHA</label>
                                <div class="iw"><span class="ico">${this.svgLock()}</span>
                                    <input type="password" id="rP1" placeholder="Crie sua senha">
                                    <span class="eye" id="eyeR1">${this.svgEyeOn()}</span>
                                </div>
                                <div class="prules">
                                    <span class="prule fail" id="rm1"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/></svg>1 Letra Maiúscula</span>
                                    <span class="prule fail" id="rn1"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/></svg>1 Número</span>
                                </div>
                            </div>
                            <div class="ig"><label class="raaj">CONFIRMAR SENHA</label>
                                <div class="iw"><span class="ico">${this.svgLock()}</span>
                                    <input type="password" id="rP2" placeholder="Repita a senha">
                                    <span class="eye" id="eyeR2">${this.svgEyeOn()}</span>
                                </div>
                            </div>
                            <button class="btn" id="btnReg">CONCLUIR CADASTRO</button>
                        </div>
                    </div>
                </div>

                <!-- ══════ RECUPERAR SENHA ══════ -->
                <div id="vF" class="view auth-view">
                    <div class="hd" style="justify-content:flex-start;">
                        <button class="btn-txt" id="backForgot"><span>${this.svgBack()}</span> Voltar</button>
                    </div>
                    <div class="card" style="text-align:center;padding:40px 25px;">
                        <div style="width:48px;height:48px;margin:0 auto 12px;color:var(--cyan);">${this.svgKey()}</div>
                        <h1 class="raaj" style="font-size:var(--ftitle);color:var(--cyan);margin-bottom:5px;">RECUPERAR SENHA</h1>
                        <p style="font-size:.8rem;color:var(--muted);margin-bottom:25px;">Redefina seu acesso em 3 passos.</p>
                        <div id="alF" class="al"></div>
                        <div id="fs1" class="rst on">
                            <div class="ig"><label class="raaj">SEU UID KWAI</label>
                                <div class="iw"><span class="ico">${this.svgUser()}</span>
                                    <input type="number" id="fUid" placeholder="Digite seu UID numérico">
                                </div>
                            </div>
                            <button class="btn" id="btnFind">BUSCAR CONTA</button>
                        </div>
                        <div id="fs2" class="rst">
                            <p style="font-size:.85rem;color:var(--muted);margin-bottom:15px;">Conta encontrada. Enviaremos o código para:</p>
                            <div class="fEmail-box">
                                <div class="fe-lbl">E-mail vinculado</div>
                                <div class="fe-val" id="fEmailMask">---</div>
                            </div>
                            <button class="btn" id="btnSendReset">ENVIAR CÓDIGO</button>
                            <button class="btn-txt" id="btnBackFs1" style="margin:14px auto 0;justify-content:center;">
                                <span>${this.svgBack()}</span> UID diferente
                            </button>
                        </div>
                        <div id="fs3" class="rst">
                            <p style="font-size:.85rem;color:var(--text);margin-bottom:6px;">Insira o código de 6 dígitos recebido no e-mail.</p>
                            <p style="font-size:.75rem;color:var(--muted);margin-bottom:18px;">Verifique também a caixa de spam.</p>
                            <div class="ig"><div class="iw">
                                <input type="text" id="fOtp" maxlength="6" style="text-align:center;font-size:1.5rem;letter-spacing:12px;padding-left:14px;" placeholder="------">
                            </div></div>
                            <button class="btn" id="btnCheckOtp">VALIDAR CÓDIGO</button>
                        </div>
                        <div id="fs4" class="rst">
                            <div class="ig"><label class="raaj">NOVA SENHA</label>
                                <div class="iw"><span class="ico">${this.svgLock()}</span>
                                    <input type="password" id="fP1" placeholder="Crie sua nova senha">
                                    <span class="eye" id="eyeF1">${this.svgEyeOn()}</span>
                                </div>
                                <div class="prules">
                                    <span class="prule fail" id="fm1"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/></svg>1 Letra Maiúscula</span>
                                    <span class="prule fail" id="fn1"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/></svg>1 Número</span>
                                </div>
                            </div>
                            <div class="ig"><label class="raaj">CONFIRMAR SENHA</label>
                                <div class="iw"><span class="ico">${this.svgLock()}</span>
                                    <input type="password" id="fP2" placeholder="Repita a nova senha">
                                    <span class="eye" id="eyeF2">${this.svgEyeOn()}</span>
                                </div>
                            </div>
                            <button class="btn" id="btnResetPass">SALVAR NOVA SENHA</button>
                        </div>
                    </div>
                </div>

                <!-- ══════ DASHBOARD ══════ -->
                <div id="vD" class="view dash-view">
                    <div id="painelComunicados" style="width:100%;margin-bottom:12px;display:flex;flex-direction:column;gap:8px;"></div>

                    <!-- Saudação -->
                    <div class="card greet">
                        <div class="ava" id="dAva"><span style="width:26px;height:26px;">${this.svgUser()}</span></div>
                        <div class="greet-txt">
                            <h2 id="dName">Aguardando...</h2>
                            <p id="dUid">UID ------ · DMaior</p>
                        </div>
                        <button class="btn-sm" id="btnRef"><span id="refIco">${this.svgRefresh()}</span> ATUALIZAR</button>
                    </div>

                    <!-- 3 números do mês -->
                    <div class="dstat-grid">
                        <div class="dstat">
                            <span class="dk">${this.svgDiamond()} Diamantes no mês</span>
                            <span class="dv" id="dDia">0</span>
                            <span class="dsub" id="dDiaUsd">≈ $ 0.00 USD</span>
                        </div>
                        <div class="dstat">
                            <span class="dk">${this.svgClock()} Horas de live</span>
                            <span class="dv" id="dHoras">0h</span>
                            <span class="dsub" id="dHorasMeta">de 40h · 0%</span>
                        </div>
                        <div class="dstat">
                            <span class="dk">${this.svgCal()} Dias de live</span>
                            <span class="dv" id="dDias">0</span>
                            <span class="dsub" id="dDiasMeta">de 20 dias · 0%</span>
                        </div>
                    </div>

                    <div class="dwide">
                        <!-- Evolução diária -->
                        <div class="card">
                            <div class="ctogs">
                                <h3 class="raaj" style="font-size:.9rem;color:var(--text);margin:0;">EVOLUÇÃO DIÁRIA</h3>
                                <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end;">
                                    <div class="tgrp">
                                        <button class="tbtn on" id="tDi">Diamantes</button>
                                        <button class="tbtn" id="tHo">Horas</button>
                                    </div>
                                    <div class="tgrp">
                                        <button class="tbtn on" id="t7d">7 dias</button>
                                        <button class="tbtn" id="t30d">30 dias</button>
                                    </div>
                                    <div class="tgrp">
                                        <button class="tbtn on" id="tMesAtual">Mês atual</button>
                                        <button class="tbtn" id="tMesComp">Comparar</button>
                                    </div>
                                </div>
                            </div>
                            <div class="chwrap"><canvas id="pChart"></canvas></div>
                            <div id="chLegend">
                                <span><i style="background:#3b82f6"></i>Mês atual</span>
                                <span><i style="background:#f0c040"></i>Mês anterior</span>
                            </div>
                        </div>

                        <div class="dstack">
                            <!-- Metas do mês -->
                            <div class="card">
                                <h3 class="dcard-h">Metas do mês</h3>
                                <div class="metas-bar">
                                    <div class="mb-top"><span>Horas de live</span><span id="mHoras">0 / 40 h</span></div>
                                    <div class="prog"><div class="progf" id="pH" style="width:0%"></div></div>
                                </div>
                                <div class="metas-bar">
                                    <div class="mb-top"><span>Dias válidos</span><span id="mDias">0 / 20 dias</span></div>
                                    <div class="prog"><div class="progf" id="pD" style="width:0%"></div></div>
                                </div>
                            </div>

                            <!-- Horas por tipo -->
                            <div class="card">
                                <h3 class="dcard-h">Horas por tipo</h3>
                                <div class="wallet-figs" style="margin:0">
                                    <div><div class="k">${this.svgClock()} Vídeo</div><div class="v" id="dHrVid">00:00</div></div>
                                    <div><div class="k">${this.svgClock()} Áudio</div><div class="v" id="dHrAud">00:00</div></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Histórico diário -->
                    <div class="card">
                        <h3 class="dcard-h">Histórico diário <span class="raaj" style="font-size:.7rem;color:var(--muted);font-weight:400;" id="hRes">— válidos · — 💎</span></h3>
                        <div id="hList"><p class="txn-empty">Carregando...</p></div>
                    </div>
                </div>

                <!-- ══════ PERFIL ══════ -->
                <div id="vS" class="view auth-view">
                    <div class="hd"><h1 class="raaj" style="font-size:1.3rem;color:var(--text);" data-i18n="profileControl">CONTROLE DE PERFIL</h1></div>
                    <div class="card">
                        <h2 class="raaj" style="font-size:.9rem;margin-bottom:15px;color:var(--gold);border-bottom:1px solid var(--border);padding-bottom:8px;" data-i18n="personalData">DADOS PESSOAIS</h2>
                        <div id="alS" class="al"></div>
                        <div class="ig"><label>NOME DE IDENTIFICACAO</label>
                            <div class="iw"><span class="ico">${this.svgUser()}</span><input type="text" id="sName" placeholder="Nome social"></div>
                        </div>
                        <div class="ig">
                            <label>E-MAIL BASE <span style="color:var(--muted);font-size:.65rem;">(somente leitura)</span></label>
                            <div class="iw"><span class="ico">${this.svgMail()}</span><input type="email" id="sEmail" readonly tabindex="-1"></div>
                        </div>
                        <div class="ig"><label>CONTATO WHATSAPP</label>
                            <div class="iw"><span class="ico">${this.svgPhone()}</span><input type="tel" id="sWpp" placeholder="(00) 00000-0000" maxlength="15"></div>
                        </div>
                        <div class="ig"><label>ENDERECO RESIDENCIAL</label>
                            <div class="iw"><span class="ico">${this.svgPin()}</span><input type="text" id="sAddr" placeholder="Endereco completo"></div>
                        </div>
                        <h2 class="raaj" style="font-size:.9rem;margin:20px 0 12px;color:var(--cyan);border-bottom:1px solid var(--border);padding-bottom:8px;" data-i18n="appearanceAccess">APARÊNCIA E ACESSIBILIDADE</h2>
                        <div class="pref-grid">
                            <div class="ig">
                                <label data-i18n="textSize">TAMANHO DO TEXTO</label>
                                <select id="sFontSize" data-pref-font-select>
                                    <option value="normal" data-i18n="fontNormal">Normal</option>
                                    <option value="grande" data-i18n="fontLarge">Grande</option>
                                    <option value="extra" data-i18n="fontExtra">Muito grande</option>
                                </select>
                            </div>
                            <div class="ig">
                                <label data-i18n="language">IDIOMA</label>
                                <select id="sLang" data-pref-lang-select>
                                    <option value="pt-BR">Português BR</option>
                                    <option value="en">English</option>
                                    <option value="es">Español</option>
                                    <option value="zh">中文</option>
                                </select>
                            </div>
                        </div>
                        <p class="pref-note" data-i18n="appearanceHelp">Essas opções ficam salvas neste aparelho e ajudam na leitura sem alterar seus dados.</p>
                        <!-- Notificações push (Fase 1) — preenchido por js/push.js; fica vazio se o navegador não suportar -->
                        <div id="dmPushMount"></div>
                        <h2 class="raaj" style="font-size:.9rem;margin:20px 0 12px;color:var(--gold);border-bottom:1px solid var(--border);padding-bottom:8px;">DADOS DE RECEBIMENTO</h2>
                        <div class="ig"><label>TIPO DE CHAVE PIX</label>
                            <div class="iw"><span class="ico">${this.svgPix()}</span>
                                <select id="sPixTipo">
                                    <option value="">Selecione o tipo</option>
                                    <option value="CPF">CPF</option>
                                    <option value="CNPJ">CNPJ</option>
                                    <option value="Email">E-mail</option>
                                    <option value="Celular">Celular</option>
                                    <option value="Aleatoria">Chave Aleatória</option>
                                </select>
                            </div>
                        </div>
                        <div class="ig"><label>CHAVE PIX</label>
                            <div class="iw"><span class="ico">${this.svgPix()}</span><input type="text" id="sPixChave" placeholder="Informe sua chave Pix"></div>
                        </div>
                        <h2 class="raaj" style="font-size:.9rem;margin:20px 0 12px;color:var(--red);border-bottom:1px solid var(--border);padding-bottom:8px;">SEGURANÇA</h2>
                        <div class="ig">
                            <label style="color:var(--red);">MODIFICAR SENHA <span style="color:var(--muted);font-size:.65rem;">(opcional)</span></label>
                            <div class="iw"><span class="ico">${this.svgLock()}</span>
                                <input type="password" id="sPass" placeholder="Nova senha">
                                <span class="eye" id="eyeS">${this.svgEyeOn()}</span>
                            </div>
                            <div class="prules">
                                <span class="prule fail" id="sm1"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/></svg>1 Letra Maiúscula</span>
                                <span class="prule fail" id="sn1"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/></svg>1 Número</span>
                            </div>
                        </div>
                        <button class="btn" id="btnSave" style="margin-top:20px;" data-i18n="updateData">ATUALIZAR DADOS</button>
                    </div>
                </div>

                <!-- ══════ CARTEIRA ══════ -->
                <div id="vC" class="view cart-view">
                    <div class="hd">
                        <button class="btn-sm" id="btnRefCart"><span>${this.svgRefresh()}</span> ATUALIZAR</button>
                    </div>

                    <!-- ── Painel principal ── -->
                    <div id="cMain">

                        <!-- Topo azul: voltar · Carteira · ir para transações -->
                        <div class="wallet-head">
                            <div class="wbar">
                                <button id="btnCartBack" type="button" title="Voltar ao resumo">${this.svgBack()}</button>
                                <b>Carteira</b>
                                <button id="btnCartExtrato" type="button" title="Ver transações">${this.svgClock()}</button>
                            </div>
                            <div class="wlbl">Saldo disponível</div>
                            <div class="wbig" id="cSaldo">R$ 0,00</div>
                            <div class="wsub" id="cPendente">Nenhum saque pendente</div>
                        </div>

                        <!-- Card branco sobreposto: totais + solicitar saque -->
                        <div class="wallet-panel">
                            <div class="wallet-figs">
                                <div>
                                    <div class="k">${this.svgSend()} Total recebido</div>
                                    <div class="v" id="cRecebido">R$ 0,00</div>
                                </div>
                                <div>
                                    <div class="k"><img src="https://static.wixstatic.com/media/ac74b3_47887b03b957463eafa996b70580ec90~mv2.webp" alt="pix"> Total sacado</div>
                                    <div class="v" id="cSacado">R$ 0,00</div>
                                </div>
                            </div>

                            <!-- Aviso PIX inválido -->
                            <div id="cPixWarn" class="pix-warn" style="display:none;">
                                ${this.svgInfo()}
                                <span>Para solicitar saque, cadastre uma chave PIX do tipo <strong>CPF</strong> ou <strong>Celular</strong> na aba <strong>PERFIL</strong>. Chaves do tipo E-mail, CNPJ e Aleatória não são aceitas para saque.</span>
                            </div>

                            <button class="wallet-cta" id="btnAbrirSaque" type="button">
                                Solicitar saque <svg viewBox="0 0 24 24"><path d="M8.59 16.59 13.17 12 8.59 7.41 10 6l6 6-6 6z"/></svg>
                            </button>
                        </div>

                        <!-- Formulário de saque (abre pelo botão acima) -->
                        <div class="saque-form" id="cSaqueForm" style="display:none;">
                            <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
                                <img src="https://static.wixstatic.com/media/ac74b3_47887b03b957463eafa996b70580ec90~mv2.webp"
                                     style="width:32px;height:32px;object-fit:contain;flex-shrink:0;" alt="pix">
                                <span style="font-family:var(--dm-font-title,'Rajdhani',sans-serif);font-size:.85rem;color:var(--cyan);font-weight:700;letter-spacing:.06em;text-transform:uppercase;" id="cSaqueFormTitle">SOLICITAR SAQUE</span>
                            </div>
                            <div id="cSaqueDesc" style="margin-bottom:10px"></div>
                            <p style="font-size:.75rem;color:var(--muted);margin-bottom:14px;" id="cPixInfo"></p>
                            <div id="alC" class="al"></div>
                            <div class="valor-input-wrap">
                                <span class="prefix">R$</span>
                                <input type="number" id="cValor" min="0.01" step="0.01" placeholder="0,00" style="font-size:1.2rem;">
                            </div>
                            <button class="btn" id="btnSaque">SOLICITAR SAQUE</button>
                        </div>

                        <!-- Transações (inline, com filtro) -->
                        <div class="txn-head">
                            <h3>Transações</h3>
                            <div class="txn-seg" id="cTxnSeg">
                                <button type="button" data-f="all" class="on">Tudo</button>
                                <button type="button" data-f="in">Entradas</button>
                                <button type="button" data-f="out">Saídas</button>
                            </div>
                        </div>
                        <div id="cTxLista"><p class="txn-empty">Carregando...</p></div>

                    </div><!-- /cMain -->

                </div><!-- /vC -->

                <!-- ══════ RANKING (componente nativo) ══════ -->
                <div id="vRank" class="view" style="width:100%;">
                    <button class="iframe-back" id="btnBackRank">${this.svgBack()} VOLTAR AO PAINEL</button>
                    <ranking-dmaior id="rankingEl" style="display:block;width:100%;min-height:80vh;"></ranking-dmaior>
                </div>

                <!-- ══════ IMPULSO (componente nativo) ══════ -->
                <div id="vImpulso" class="view" style="width:100%;">
                    <dmaior-impulso id="impulsoEl" worker-url="https://dashboard.agencydmaior.com.br"></dmaior-impulso>
                </div>

                <!-- ══════ VOTAÇÃO (componente nativo) ══════ -->
                <!-- dmaior-votacao detecta sozinho dm_uid/dm_token no localStorage —
                     rodando aqui dentro do painel já autenticado, pula direto pra
                     lista de votações sem pedir UID de novo. -->
                <div id="vVotacao" class="view" style="width:100%;">
                    <dmaior-votacao id="votacaoEl"></dmaior-votacao>
                </div>

                <!-- ══════ PK DIÁRIO (componente nativo) ══════ -->
                <!-- painel-pk detecta sozinho dm_uid/dm_token, igual dmaior-votacao. -->
                <div id="vPk" class="view" style="width:100%;">
                    <button class="iframe-back" id="btnBackPk">${this.svgBack()} VOLTAR AO PAINEL</button>
                    <painel-pk id="pkEl"></painel-pk>
                </div>

                <!-- ══════ TICKETS (componente nativo) ══════ -->
                <!-- dmaior-tickets lê dm_uid/dm_token do localStorage sozinho, igual
                     dmaior-impulso — mas precisa do worker-url pra falar com o
                     mesmo worker do painel (dashboard). -->
                <div id="vTickets" class="view" style="width:100%;">
                    <button class="iframe-back" id="btnBackTickets">${this.svgBack()} VOLTAR AO PAINEL</button>
                    <dmaior-tickets id="ticketsEl" worker-url="https://dashboard.agencydmaior.com.br"></dmaior-tickets>
                </div>

                <!-- Gerador local de molduras, carregado somente após autenticação -->
                <div id="vMolduras" class="view" style="width:100%;">
                    <iframe id="moldurasFrame" class="molduras-frame" title="Gerador de molduras da DMaior Agency" allow="clipboard-write"></iframe>
                </div>

                <!-- ══════ AVISOS ══════ -->
                <div id="vAvisos" class="view" style="width:100%;">
                    <div class="avisos-topbar">
                        <button class="iframe-back" id="btnBackAvisos">${this.svgBack()} VOLTAR</button>
                        <button class="btn-mark-all" id="btnMarkAllRead">
                            <svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>
                            MARCAR TODOS COMO LIDOS
                        </button>
                    </div>
                    <div id="avisosList"></div>
                </div>

            </div><!-- /content -->
        </div><!-- /shell -->`;
    }

    // ── Utils ───────────────────────────────────────────────────────
    qs(s){ return this.querySelector(s); }

    applyPreferences(){
        if(window.DMaiorPrefs){
            window.DMaiorPrefs.bind(this);
            const fs = this.qs('#sFontSize');
            const lg = this.qs('#sLang');
            if(fs) fs.value = window.DMaiorPrefs.getFontSize();
            if(lg) lg.value = window.DMaiorPrefs.getLang();
        }
    }

    showAlert(id, msg, err=true){
        const el = this.qs(id);
        el.textContent = msg;
        el.style.color           = err ? 'var(--red)'           : 'var(--green)';
        el.style.borderColor     = err ? 'var(--red)'           : 'var(--green)';
        el.style.backgroundColor = err ? 'rgba(248,113,113,.1)' : 'rgba(74,222,128,.1)';
        el.classList.add('on');
        setTimeout(()=>el.classList.remove('on'), 5000);
    }

    navigate(id){
        const loading = this.qs('#vLoading');
        if (loading) loading.style.display = 'none';

        // Fecha o grid "mais" do menu mobile sempre que uma navegação acontece
        this.qs('#bNav')?.classList.remove('expanded');

        this.querySelectorAll('.view').forEach(e=>e.classList.remove('on'));
        this.qs(`#${id}`)?.classList.add('on');
        const nav = this.qs('#bNav');
        (id==='vL'||id==='vR'||id==='vF') ? nav.classList.remove('on') : nav.classList.add('on');
        if(id==='vL'){
            this.querySelectorAll('.rst').forEach(e=>e.classList.remove('on'));
            this.qs('#rs1')?.classList.add('on');
            this.qs('#fs1')?.classList.add('on');
        }
        if(id==='vF'){
            ['fs1','fs2','fs3','fs4'].forEach(s=>this.qs('#'+s)?.classList.remove('on'));
            this.qs('#fs1')?.classList.add('on');
            this.qs('#alF')?.classList.remove('on');
        }
        // Fecha o formulário de saque ao (re)abrir a carteira
        if(id==='vC'){
            const sf = this.qs('#cSaqueForm');
            if(sf) sf.style.display = 'none';
        }
        setTimeout(() => { if(this._sendHeight) this._sendHeight(); }, 100);
    }

    navActive(id){
        this.querySelectorAll('.nit').forEach(e=>{
            e.classList.remove('on');
            if(e.id !== 'nO') e.style.color = 'var(--muted)';
        });
        const el = this.qs(`#${id}`);
        if(el){ el.classList.add('on'); el.style.color='var(--cyan)'; }
        this._syncMobileNav(id);
    }

    // ── Menu móvel (barra flutuante + FAB) — mesmo padrão do Admin/Agente ──
    _buildMobileNav(){
        const nav = this.qs('#mNav'), fab = this.qs('#mFab'), sheet = this.qs('#mSheet'), rowsEl = this.qs('#mSheetRows');
        if(!nav || !fab || !sheet || !rowsEl) return;

        const closeSheet = () => { sheet.classList.remove('on'); fab.classList.remove('on'); };
        const openSheet  = () => { this._fillMobileSheet(); sheet.classList.add('on'); fab.classList.add('on'); };

        // Barra: cada botão dispara o clique do item real do .bnav (reusa toda a lógica de navegação)
        nav.querySelectorAll('button[data-nav]').forEach(b=>{
            b.addEventListener('click', ()=>{ this.qs('#'+b.dataset.nav)?.click(); });
        });
        fab.addEventListener('click', ()=> sheet.classList.contains('on') ? closeSheet() : openSheet());
        sheet.addEventListener('click', e=>{ if(e.target === sheet) closeSheet(); });
        this._mSheetClose = closeSheet;
        this._mEscHandler = e=>{ if(e.key === 'Escape' && sheet.classList.contains('on')) closeSheet(); };
        document.addEventListener('keydown', this._mEscHandler);

        // Entalhe em U — mesma geometria do Admin/Agente
        const path = (w,h) => {
            const r = Math.min(31, h/2), c = r*0.448, nw = 118, nd = 40, cx = w/2, nl = cx-nw/2, nr = cx+nw/2;
            return 'M'+r+' 0H'+nl.toFixed(1)
                +'C'+(nl+nw*0.10).toFixed(1)+' 0 '+(nl+nw*0.25).toFixed(1)+' '+nd+' '+cx.toFixed(1)+' '+nd
                +'C'+(nr-nw*0.25).toFixed(1)+' '+nd+' '+(nr-nw*0.10).toFixed(1)+' 0 '+nr.toFixed(1)+' 0'
                +'H'+(w-r).toFixed(1)
                +'C'+(w-c).toFixed(1)+' 0 '+w.toFixed(1)+' '+c.toFixed(1)+' '+w.toFixed(1)+' '+r
                +'V'+(h-r).toFixed(1)
                +'C'+w.toFixed(1)+' '+(h-c).toFixed(1)+' '+(w-c).toFixed(1)+' '+h+' '+(w-r).toFixed(1)+' '+h
                +'H'+r
                +'C'+c.toFixed(1)+' '+h+' 0 '+(h-c).toFixed(1)+' 0 '+(h-r).toFixed(1)
                +'V'+r+'C0 '+c.toFixed(1)+' '+c.toFixed(1)+' 0 '+r+' 0Z';
        };
        this._updNotch = () => {
            const svg = nav.querySelector('.mnav-bg'); if(!svg) return;
            const w = Math.round(nav.clientWidth), h = Math.round(nav.clientHeight) || 62;
            if(w < 40) return;
            svg.setAttribute('viewBox', '0 0 '+w+' '+h);
            svg.querySelector('path').setAttribute('d', path(w,h));
        };
        window.addEventListener('resize', this._updNotch);
        window.addEventListener('orientationchange', ()=> setTimeout(this._updNotch, 120));
        if(window.ResizeObserver){ this._mNavRO = new ResizeObserver(()=>this._updNotch()); this._mNavRO.observe(nav); }
        setTimeout(this._updNotch, 60);
        setTimeout(this._updNotch, 500);

        this._fillMobileSheet();
        this._syncMobileNav();
    }

    // Reconstrói a lista do sheet a partir dos itens visíveis do .bnav
    _fillMobileSheet(){
        const rowsEl = this.qs('#mSheetRows'); if(!rowsEl) return;
        let html = '';
        this.querySelectorAll('#bNav .nit').forEach(nit=>{
            if(nit.classList.contains('nav-toggle') || nit.classList.contains('hidden')) return;
            const icon  = nit.querySelector('svg')?.outerHTML || '';
            const label = nit.querySelector('span')?.textContent || '';
            html += `<button type="button" class="msrow${nit.classList.contains('sair')?' sair':''}" data-nav="${nit.id}"><span class="msi">${icon}</span>${label}</button>`;
        });
        rowsEl.innerHTML = html;
        rowsEl.querySelectorAll('.msrow').forEach(b=>{
            b.addEventListener('click', ()=>{ this._mSheetClose?.(); this.qs('#'+b.dataset.nav)?.click(); });
        });
        this._syncMobileNav();
    }

    _syncMobileNav(id){
        if(!id){ const on = this.qs('#bNav .nit.on'); id = on ? on.id : 'nD'; }
        this.querySelectorAll('#mNav button[data-nav]').forEach(b=>{
            b.dataset.nav === id ? b.setAttribute('aria-current','page') : b.removeAttribute('aria-current');
        });
        this.querySelectorAll('#mSheetRows .msrow').forEach(b=>{
            b.dataset.nav === id ? b.setAttribute('aria-current','page') : b.removeAttribute('aria-current');
        });
    }

    setToggle(g, activeId){
        const m=['tDi','tHo'], p=['t7d','t30d'], mes=['tMesAtual','tMesComp'];
        (g==='m'?m:g==='p'?p:mes).forEach(id=>this.qs(`#${id}`)?.classList.toggle('on',id===activeId));
    }

    _mesStr(offset=0){
        const d=new Date();
        d.setDate(1);
        d.setMonth(d.getMonth()-offset);
        return d.toISOString().substring(0,7);
    }

    _allDaysOfMonth(mesStr){
        const [y,m]=mesStr.split('-').map(Number);
        const hoje=new Date().toISOString().split('T')[0];
        const total=new Date(y,m,0).getDate();
        const days=[];
        for(let d=1;d<=total;d++){
            const dd=`${mesStr}-${String(d).padStart(2,'0')}`;
            if(dd>hoje) break;
            days.push(dd);
        }
        return days.reverse();
    }

    // Dias do mês (offset 0 = atual, 1 = anterior) — mais NOVO primeiro, buracos = 0
    _mesData(offset){
        const mesStr=this._mesStr(offset);
        const map={};
        (this.historicoCompleto||[]).filter(d=>d.data.startsWith(mesStr)).forEach(d=>{map[d.data]=d;});
        return this._allDaysOfMonth(mesStr).map(d=>map[d]||{data:d,diamantes:0,minutos:0});
    }

    _historicoDoMes(){
        // 'comparar' e 'atual' mostram o mês atual na lista; só a linha "anterior" (legado) puxa o passado
        return this._mesData(this.mesSelecionado==='anterior'?1:0);
    }

    h2dec(str){
        if(!str||!str.includes(':')) return 0;
        const [h,m]=str.split(':').map(Number);
        return h+(m/60);
    }

    maskPhone(input){
        let v = input.value.replace(/\D/g,'').substring(0,11);
        if(v.length>10)      v=`(${v.substring(0,2)}) ${v.substring(2,7)}-${v.substring(7)}`;
        else if(v.length>6)  v=`(${v.substring(0,2)}) ${v.substring(2,6)}-${v.substring(6)}`;
        else if(v.length>2)  v=`(${v.substring(0,2)}) ${v.substring(2)}`;
        else if(v.length>0)  v=`(${v}`;
        input.value = v;
    }

    setupEye(eyeSel, inSel){
        let show=false;
        this.qs(eyeSel).addEventListener('click',()=>{
            show=!show;
            this.qs(inSel).type = show?'text':'password';
            this.qs(eyeSel).innerHTML = show?this.svgEyeOff():this.svgEyeOn();
        });
    }

    checkPass(inSel, m1Sel, n1Sel){
        const v=this.qs(inSel).value;
        const hM=/[A-Z]/.test(v), hN=/[0-9]/.test(v);
        this.qs(m1Sel).classList.toggle('ok', hM); this.qs(m1Sel).classList.toggle('fail',!hM);
        this.qs(n1Sel).classList.toggle('ok', hN); this.qs(n1Sel).classList.toggle('fail',!hN);
    }

    fdt(v){
        if(!v) return '—';
        const d = new Date(v);
        return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
    }

    esc(s){ return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

    // ── Setup ───────────────────────────────────────────────────────
    setupNavigation(){
        this.qs('#goReg').addEventListener('click',e=>{e.preventDefault();this.navigate('vR');});
        this.qs('#backL').addEventListener('click',()=>this.navigate('vL'));
        this.qs('#goForgot').addEventListener('click',e=>{e.preventDefault();this.navigate('vF');});
        this.qs('#backForgot').addEventListener('click',()=>this.navigate('vL'));
        this.qs('#nD').addEventListener('click',()=>{this.navigate('vD');this.navActive('nD');});
        this.qs('#nS').addEventListener('click',()=>{this.navigate('vS');this.navActive('nS');});
        this.qs('#nC').addEventListener('click',()=>{this.navigate('vC');this.navActive('nC');this.loadCarteira();});
        this.qs('#nO').addEventListener('click',()=>this.logout());
        this.qs('#nRank').addEventListener('click',()=>this.goRanking());
        this.qs('#nImpulso').addEventListener('click',()=>this.goImpulsionamento());
        this.qs('#nMolduras').addEventListener('click',()=>this.goMolduras());
        this.qs('#nVotacao').addEventListener('click',()=>this.goVotacao());
        this.qs('#nPk').addEventListener('click',()=>this.goPk());
        this.qs('#btnBackPk')?.addEventListener('click',()=>{this.navigate('vD');this.navActive('nD');});
        this.qs('#nTickets').addEventListener('click',()=>this.goTickets());
        this.qs('#btnBackTickets')?.addEventListener('click',()=>{this.navigate('vD');this.navActive('nD');});
        this.qs('#nMore').addEventListener('click',()=>{
            this.qs('#bNav').classList.toggle('expanded');
        });
        // Clique fora do menu fecha o grid "mais" (mobile)
        document.addEventListener('click',e=>{
            const nav = this.qs('#bNav');
            if(nav && nav.classList.contains('expanded') && !nav.contains(e.target)) nav.classList.remove('expanded');
        });
        this.qs('#btnBackRank').addEventListener('click',()=>{this.navigate('vD');this.navActive('nD');this.loadDash();});
        this.qs('#btnBackAvisos').addEventListener('click',()=>{this.navigate('vD');this.navActive('nD');});
        this.qs('#btnMarkAllRead').addEventListener('click',()=>this._marcarTodosLidos());
        // Escuta o clique no sino do menu — navega para a view de avisos
        window.addEventListener('dmaior:avisos', this._avisosHandler);
        this._buildMobileNav();
    }

    setupActionListeners(){
        this.qs('#btnL').addEventListener('click',()=>this.doLogin());
        this.qs('#btnCode').addEventListener('click',()=>this.doOtpReq());
        this.qs('#btnOtp').addEventListener('click',()=>this.doOtpVal());
        this.qs('#btnReg').addEventListener('click',()=>this.doReg());
        this.qs('#btnSave').addEventListener('click',()=>this.doSave());
        this.qs('#btnRef').addEventListener('click',()=>this.loadDash());
        this.qs('#btnRefCart').addEventListener('click',()=>this.loadCarteira());
        this.qs('#btnSaque').addEventListener('click',()=>this.doSolicSaque());

        // Carteira: voltar ao resumo / rolar até as transações
        this.qs('#btnCartBack')?.addEventListener('click',()=>{ this.navigate('vD'); this.navActive('nD'); });
        this.qs('#btnCartExtrato')?.addEventListener('click',()=>{
            this.qs('.txn-head')?.scrollIntoView({behavior:'smooth',block:'start'});
        });
        // Carteira: abre/fecha o formulário de saque
        this.qs('#btnAbrirSaque')?.addEventListener('click',()=>{
            const f = this.qs('#cSaqueForm');
            if(!f) return;
            const abrir = f.style.display === 'none' || !f.style.display;
            f.style.display = abrir ? 'block' : 'none';
            if(abrir){
                f.scrollIntoView({behavior:'smooth',block:'center'});
                this.qs('#cValor')?.focus();
            }
            setTimeout(()=>{ if(this._sendHeight) this._sendHeight(); }, 120);
        });
        // Carteira: filtro Tudo / Entradas / Saídas
        this.qs('#cTxnSeg')?.addEventListener('click',e=>{
            const b = e.target.closest('button[data-f]');
            if(!b) return;
            this.querySelectorAll('#cTxnSeg button').forEach(x=>x.classList.toggle('on', x===b));
            this._cartTxFilter = b.dataset.f;
            this._renderCartTxns();
        });

        this.qs('#tDi').addEventListener('click',()=>{this.chartMetrica='diamantes';this.setToggle('m','tDi');this.renderChart();});
        this.qs('#tHo').addEventListener('click',()=>{this.chartMetrica='horas';this.setToggle('m','tHo');this.renderChart();});
        this.qs('#t7d').addEventListener('click',()=>{this.chartPeriodo='semanal';this.setToggle('p','t7d');this.renderChart();});
        this.qs('#t30d').addEventListener('click',()=>{this.chartPeriodo='mensal';this.setToggle('p','t30d');this.renderChart();});
        this.qs('#tMesAtual').addEventListener('click',()=>{this.mesSelecionado='atual';this.setToggle('mes','tMesAtual');this.renderChart();this.renderHist();});
        this.qs('#tMesComp').addEventListener('click',()=>{this.mesSelecionado='comparar';this.setToggle('mes','tMesComp');this.renderChart();this.renderHist();});

        this.setupEye('#eyeL','#lPass');
        this.setupEye('#eyeR1','#rP1');
        this.setupEye('#eyeR2','#rP2');
        this.setupEye('#eyeS','#sPass');
        this.setupEye('#eyeF1','#fP1');
        this.setupEye('#eyeF2','#fP2');

        this.qs('#rP1').addEventListener('input',()=>this.checkPass('#rP1','#rm1','#rn1'));
        this.qs('#sPass').addEventListener('input',()=>this.checkPass('#sPass','#sm1','#sn1'));
        this.qs('#fP1').addEventListener('input',()=>this.checkPass('#fP1','#fm1','#fn1'));
        this.qs('#sWpp').addEventListener('input',e=>this.maskPhone(e.target));

        const fontSel = this.qs('#sFontSize');
        if(fontSel) fontSel.addEventListener('change', e=>{
            window.DMaiorPrefs?.setFontSize(e.target.value);
            this.applyPreferences();
            setTimeout(()=>{ if(this._sendHeight) this._sendHeight(); }, 80);
        });

        const langSel = this.qs('#sLang');
        if(langSel) langSel.addEventListener('change', e=>{
            window.DMaiorPrefs?.setLanguage(e.target.value);
            this.applyPreferences();
            setTimeout(()=>{ if(this._sendHeight) this._sendHeight(); }, 80);
        });

        this.qs('#btnFind').addEventListener('click',()=>this.doFindAccount());
        this.qs('#btnSendReset').addEventListener('click',()=>this.doSendReset());
        this.qs('#btnBackFs1').addEventListener('click',()=>{this.qs('#fs2').classList.remove('on');this.qs('#fs1').classList.add('on');});
        this.qs('#btnCheckOtp').addEventListener('click',()=>this.doCheckResetOtp());
        this.qs('#btnResetPass').addEventListener('click',()=>this.doConfirmReset());
    }

    // ── Login ───────────────────────────────────────────────────────
    async doLogin(){
        const uid=this.qs('#lUid').value, pass=this.qs('#lPass').value;
        const btn=this.qs('#btnL');
        if(!uid||!pass) return this.showAlert('#alL','Forneca os dados de acesso.');
        btn.textContent='PROCESSANDO...'; btn.disabled=true;
        try{
            const res=await fetch(`${this.apiUrl}/api/login`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({uid:String(uid),password:pass})});
            if(!res.ok){ const e=await res.json(); throw new Error(e.erro||'Credenciais invalidas.'); }
            const data=await res.json();
            this.sessionUid=uid; this.sessionToken=data.token; this.sessionEmail=data.email||'';
            try {
                localStorage.setItem('dm_uid',uid);
                localStorage.setItem('dm_token',data.token);
                localStorage.setItem('dm_refresh',data.refresh_token||'');
                localStorage.setItem('dm_email',data.email||'');
                localStorage.setItem('dm_foto',data.foto_url||'');
                localStorage.setItem('dm_nome',data.nome||'');
                localStorage.setItem('dm_atalho_admin',data.atalho_admin?'true':'false');
                localStorage.setItem('dm_atalho_agente',data.atalho_agente?'true':'false');
                window.dispatchEvent(new CustomEvent('dmaior:auth',{detail:{logado:true,foto:data.foto_url||'',nome:data.nome||'',uid,atalhoAdmin:!!data.atalho_admin,atalhoAgente:!!data.atalho_agente}}));
            } catch(e){}
            this.qs('#lPass').value='';
            this.navigate('vD');
            this.navActive('nD');
            // Não espera o dashboard terminar de carregar pra liberar o botão —
            // a tela já navega e o conteúdo preenche em segundo plano (o próprio
            // loadDash tem seu spinner no botão de atualizar).
            this.loadDash();
            this.fetchComunicados();
        } catch(e){ this.showAlert('#alL',e.message); }
        finally{ btn.textContent='ENTRAR NO PAINEL'; btn.disabled=false; }
    }

    // ── Dashboard ───────────────────────────────────────────────────
    async loadDash(){
        const btn=this.qs('#btnRef');
        if(btn){ btn.disabled=true; btn.innerHTML=`<span style="display:inline-block;animation:spin .8s linear infinite;">${this.svgRefresh()}</span> ...`; }
        if(!document.querySelector('#kfSpin')){ const s=document.createElement('style');s.id='kfSpin';s.textContent='@keyframes spin{to{transform:rotate(360deg)}}';document.head.appendChild(s); }
        try{
            const res=await this._fetchAutenticado(`${this.apiUrl}/api/dashboard`,{
                method:'POST',
                headers:{'Content-Type':'application/json'},
                body:JSON.stringify({uid:this.sessionUid})
            });
            if(res.status === 401) return; // _fetchAutenticado já limpou a sessão e avisou
            if(!res.ok){ const e=await res.json(); throw new Error(e.erro||'Falha de integração.'); }
            const data=await res.json();
            const t=data.totais_mes||{}, p=data.perfil||{};
            const nomeExibir = t.nome_streamer || p.nome || localStorage.getItem('dm_nome') || 'Streamer DMaior';
            const fotoExibir = t.foto_url || localStorage.getItem('dm_foto') || '';
            this.qs('#dName').textContent = nomeExibir;
            this.qs('#dUid').textContent=`UID ${this.sessionUid} · DMaior`;
            if(fotoExibir) this.qs('#dAva').innerHTML=`<img src="${fotoExibir}"/>`;
            try {
                if(nomeExibir) localStorage.setItem('dm_nome', nomeExibir);
                if(fotoExibir) localStorage.setItem('dm_foto', fotoExibir);
                localStorage.setItem('dm_atalho_admin',  p.atalho_admin  ? 'true' : 'false');
                localStorage.setItem('dm_atalho_agente', p.atalho_agente ? 'true' : 'false');
                window.dispatchEvent(new CustomEvent('dmaior:auth', { detail: {
                    logado: true, foto: fotoExibir, nome: nomeExibir, uid: this.sessionUid,
                    atalhoAdmin: !!p.atalho_admin, atalhoAgente: !!p.atalho_agente,
                } }));
            } catch(e) {}
            this.qs('#nAtalhoAdmin')?.classList.toggle('hidden', !p.atalho_admin);
            this.qs('#nAtalhoAgente')?.classList.toggle('hidden', !p.atalho_agente);
            // Aba Tickets só aparece pra quem o admin liberou (ver
            // tickets_streamers_liberados) — quem não foi selecionado nem
            // sabe que a função existe.
            this.qs('#nTickets')?.classList.toggle('hidden', !p.tickets_liberado);
            const usd=Number(t.dolar||0).toFixed(2);
            const diam=Number(t.diamantes||0);
            this.qs('#dDia').textContent=diam.toLocaleString('pt-BR');
            this.qs('#dDiaUsd').textContent=`≈ $ ${usd} USD`;
            this.qs('#dHrVid').textContent=t.horas_video||'00:00';
            this.qs('#dHrAud').textContent=t.horas_audio||'00:00';
            const hrD=this.h2dec(t.horas_totais);
            const pHr=Math.min((hrD/40)*100,100);
            this.qs('#dHoras').textContent=`${hrD.toFixed(1)}h`;
            this.qs('#dHorasMeta').textContent=`de 40h · ${pHr.toFixed(0)}%`;
            this.qs('#mHoras').textContent=`${hrD.toFixed(1)} / 40 h`;
            this.qs('#pH').style.width=`${pHr}%`;
            const dias=Number(t.dias_validos||0);
            const pDia=Math.min((dias/20)*100,100);
            this.qs('#dDias').textContent=dias;
            this.qs('#dDiasMeta').textContent=`de 20 dias · ${pDia.toFixed(0)}%`;
            this.qs('#mDias').textContent=`${dias} / 20 dias`;
            this.qs('#pD').style.width=`${pDia}%`;
            this.qs('#sEmail').value=p.email||this.sessionEmail;
            this.qs('#sName').value=p.nome||'';
            this.qs('#sWpp').value=p.whatsapp||'';
            this.qs('#sAddr').value=p.endereco||'';
            this.qs('#sPixTipo').value=p.pix_tipo||'';
            this.qs('#sPixChave').value=p.pix_chave||'';
            this.historicoCompleto=data.historico||[];
            this.renderChart();
            this.renderHist();
        } catch(e){
            console.error('loadDash erro:',e);
            const hl=this.qs('#hList');
            if(hl) hl.innerHTML=`<p class="txn-empty" style="color:var(--red)">Erro ao carregar dados: ${e.message}</p>`;
        }
        finally{ if(btn){ btn.disabled=false; btn.innerHTML=`<span>${this.svgRefresh()}</span> ATUALIZAR`; } }
    }

    // ── Gráfico "Evolução diária" ──────────────────────────────────────
    renderChart(){
        if(!window.Chart) return setTimeout(()=>this.renderChart(),500);
        const cv=this.qs('#pChart'); if(!cv) return;
        const compare=this.mesSelecionado==='comparar';
        const toVal=d=>this.chartMetrica==='diamantes'?d.diamantes:parseFloat((d.minutos/60).toFixed(2));

        // _mesData(0) vem mais-novo-primeiro → reverse p/ cronológico
        const cur=this._mesData(0).slice().reverse();
        if(!cur.length) return;
        const win=this.chartPeriodo==='semanal'?7:31;
        const curSlice=cur.slice(-win);
        const labels=curSlice.map(d=>d.data.substring(8,10)); // dia do mês

        const ctx=cv.getContext('2d');
        if(this.chartInstance) this.chartInstance.destroy();

        // cores do gráfico seguem o tema (texto/grade legíveis em card branco; linha vira o acento no rosa/laranja)
        const scs=getComputedStyle(this.qs('.shell'));
        const tickCol=scs.getPropertyValue('--muted').trim()||'#a0b8c8';
        const gridCol=scs.getPropertyValue('--border').trim()||'rgba(255,255,255,.08)';
        const tema=document.documentElement.getAttribute('data-theme');
        const lineCol=(tema==='rosa'||tema==='laranja') ? (scs.getPropertyValue('--cyan').trim()||'#3b82f6') : '#3b82f6';
        const hx=lineCol.replace('#','');
        const lineRgb = hx.length===6 ? `${parseInt(hx.slice(0,2),16)},${parseInt(hx.slice(2,4),16)},${parseInt(hx.slice(4,6),16)}` : '59,130,246';

        const grad=ctx.createLinearGradient(0,0,0,200);
        grad.addColorStop(0,`rgba(${lineRgb},.30)`); grad.addColorStop(1,`rgba(${lineRgb},0)`);
        const datasets=[{data:curSlice.map(toVal),borderColor:lineCol,backgroundColor:compare?'transparent':grad,borderWidth:2,pointBackgroundColor:lineCol,pointBorderWidth:0,pointRadius:compare?0:3,fill:!compare,tension:.4}];

        if(compare){
            const prev=this._mesData(1);
            const prevByDay={};
            prev.forEach(d=>{ prevByDay[+d.data.substring(8,10)]=d; });
            const prevSlice=curSlice.map(d=>prevByDay[+d.data.substring(8,10)]||{diamantes:0,minutos:0});
            datasets.push({data:prevSlice.map(toVal),borderColor:'#f0c040',backgroundColor:'transparent',borderWidth:2,borderDash:[5,4],pointRadius:0,fill:false,tension:.4});
        }

        this.chartInstance=new window.Chart(ctx,{type:'line',data:{labels,datasets},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{grid:{display:false},ticks:{color:tickCol,font:{size:10}}},y:{grid:{color:gridCol},ticks:{color:tickCol,font:{size:10}}}}}});
        const leg=this.qs('#chLegend');
        if(leg){
            leg.style.display=compare?'flex':'none';
            const sw=leg.querySelector('span:first-child i');
            if(sw) sw.style.background=lineCol;
        }
    }

    // ── Histórico diário (lista) ──────────────────────────────────────
    renderHist(){
        const el=this.qs('#hList'); if(!el) return;
        const hist=this._historicoDoMes(); // mais-novo-primeiro
        if(!hist.length){ el.innerHTML=`<p class="txn-empty">Nenhum registro.</p>`; return; }
        const validos=hist.filter(d=>d.minutos>=60).length;
        const totDia=hist.reduce((s,d)=>s+d.diamantes,0);
        const res=this.qs('#hRes'); if(res) res.textContent=`${validos} válidos · ${totDia.toLocaleString('pt-BR')} 💎`;
        el.innerHTML=hist.map(dia=>{
            const dt=new Date(dia.data+'T12:00:00');
            const dd=String(dt.getDate()).padStart(2,'0');
            const mm=String(dt.getMonth()+1).padStart(2,'0');
            const h=Math.floor(dia.minutos/60), m=dia.minutos%60;
            const semLive=dia.minutos===0&&dia.diamantes===0;
            const ok=dia.minutos>=60;
            const pill=semLive?`<span class="hist-pill mut">sem live</span>`
                      :ok?`<span class="hist-pill ok">dia válido</span>`
                      :`<span class="hist-pill mut">não válido</span>`;
            const mid=semLive
                ? `<b>—</b><span>sem transmissão</span>`
                : `<b>${dia.diamantes.toLocaleString('pt-BR')} 💎</b><span>${h}h ${String(m).padStart(2,'0')}m de live</span>`;
            return `<div class="hist-row${semLive?' off':''}"><span class="hist-d">${dd}/${mm}</span><div class="hist-mid">${mid}</div>${pill}</div>`;
        }).join('');
    }

    // ── Carteira ─────────────────────────────────────────────────────
    async loadCarteira(){
        const btn=this.qs('#btnRefCart');
        if(btn){ btn.disabled=true; }

        try {
            const resCart = await this._fetchAutenticado(`${this.apiUrl}/api/carteira?uid=${this.sessionUid}`, {});

            if (resCart.status === 401) return; // _fetchAutenticado já limpou a sessão e avisou
            if (!resCart.ok) throw new Error('Erro ao carregar carteira');
            const cart   = await resCart.json();

            const saldo    = Number(cart.saldo          || 0);
            const pendente = Number(cart.saldo_pendente  || 0);
            const recebido = Number(cart.total_recebido  || 0);
            const sacado   = Number(cart.total_sacado    || 0);

            this.qs('#cSaldo').textContent    = this.brl(saldo);
            this.qs('#cRecebido').textContent = this.brl(recebido);
            this.qs('#cSacado').textContent   = this.brl(sacado);
            this.qs('#cPendente').textContent = pendente > 0
                ? `${this.brl(pendente)} em análise`
                : 'Nenhum saque pendente';

            const pixTipo  = this.qs('#sPixTipo').value  || localStorage.getItem('dm_pix_tipo')  || '';
            const pixChave = this.qs('#sPixChave').value || localStorage.getItem('dm_pix_chave') || '';
            const pixOk    = ['CPF','Celular'].includes(pixTipo) && pixChave;

            this.qs('#cPixWarn').style.display = pixOk ? 'none' : 'flex';

            // Botão "Solicitar saque" no card branco — controla a abertura do formulário
            const cta = this.qs('#btnAbrirSaque');
            if (cta) {
                if (!pixOk) {
                    cta.style.display = 'none';
                    this.qs('#cSaqueForm').style.display = 'none';
                } else {
                    cta.style.display = 'flex';
                    cta.disabled = saldo <= 0;
                    cta.innerHTML = saldo <= 0
                        ? 'Saldo indisponível'
                        : `Solicitar saque <svg viewBox="0 0 24 24"><path d="M8.59 16.59 13.17 12 8.59 7.41 10 6l6 6-6 6z"/></svg>`;
                }
            }

            if (pixOk) {
                this.qs('#cPixInfo').textContent = `PIX ${pixTipo}: ${pixChave}`;
                const btnSaque = this.qs('#btnSaque');
                if (btnSaque) {
                    if (saldo <= 0) {
                        btnSaque.disabled = true;
                        btnSaque.textContent = 'SALDO INDISPONÍVEL';
                        btnSaque.style.background = '#333';
                    } else {
                        btnSaque.disabled = false;
                        btnSaque.innerHTML = `<img src="https://static.wixstatic.com/media/ac74b3_47887b03b957463eafa996b70580ec90~mv2.webp" style="width:18px;height:18px;object-fit:contain;flex-shrink:0" alt="pix"> SOLICITAR SAQUE`;
                        btnSaque.style.background = 'var(--rank-grad,linear-gradient(135deg,#3b82f6,#00d4d4))';
                        const h3 = this.qs('#cSaqueForm h3');
                        if(h3) h3.textContent = 'SOLICITAR SAQUE';
                        const desc = this.qs('#cSaqueDesc');
                        if(desc) desc.innerHTML = `<span style="color:var(--muted);font-size:.75rem">Será processado pela agência em breve</span>`;
                    }
                }
            }

            // Transações — guarda e renderiza pelo filtro atual
            this._cartTxns = cart.transacoes || [];
            this._renderCartTxns();

        } catch(e) {
            this.qs('#cTxLista').innerHTML = `<p class="txn-empty" style="color:var(--red)">${e.message}</p>`;
        } finally {
            if(btn) btn.disabled=false;
        }
    }

    // Entradas = crédito, prêmio, estorno, saque recusado (dinheiro volta pra carteira)
    _cartTxEntrada(tipo){ return ['credito','premio_ranking','estorno','saque_rejeitado'].includes(tipo); }

    _renderCartTxns(){
        const el = this.qs('#cTxLista'); if(!el) return;
        const filtro = this._cartTxFilter || 'all';
        const todas  = this._cartTxns || [];
        const lista  = todas.filter(tx => {
            const inn = this._cartTxEntrada(tx.tipo);
            return filtro === 'all' || (filtro === 'in' && inn) || (filtro === 'out' && !inn);
        });
        if (!todas.length) { el.innerHTML = `<p class="txn-empty">Nenhuma movimentação ainda.</p>`; return; }
        if (!lista.length)  { el.innerHTML = `<p class="txn-empty">Nada nesse filtro.</p>`; return; }

        const tipoLabel = {
            credito:'Crédito', debito:'Débito',
            saque_solicitado:'Saque solicitado', saque_aprovado:'Saque aprovado',
            saque_rejeitado:'Saque recusado', premio_ranking:'Prêmio ranking', estorno:'Estorno',
        };
        el.innerHTML = lista.map(tx => {
            const inn = this._cartTxEntrada(tx.tipo);
            const tag = (tipoLabel[tx.tipo] || tx.tipo).split(' ')[0];
            return `
            <div class="txn">
                <span class="ti ${inn?'in':'out'}">${inn ? this.svgDiamond() : this.svgSend()}</span>
                <div class="tb">
                    <b>${tipoLabel[tx.tipo] || tx.tipo}</b>
                    <div class="m"><span class="tag">${tag}</span><span class="dt">${tx.descricao ? this.esc(tx.descricao) : this.fdt(tx.criado_em)}</span></div>
                </div>
                <div class="amt ${inn?'pos':''}">${inn?'+':'−'} ${this.brl(tx.valor)}</div>
            </div>`;
        }).join('');
    }

    async doSolicSaque(){
        const valor = parseFloat(this.qs('#cValor').value);
        const pixTipo  = this.qs('#sPixTipo').value;
        const pixChave = this.qs('#sPixChave').value;

        if (!valor || valor <= 0) return this.showAlert('#alC','Informe um valor válido.');
        if (!['CPF','Celular'].includes(pixTipo)) return this.showAlert('#alC','Chave PIX inválida. Use CPF ou Celular.');
        if (!pixChave) return this.showAlert('#alC','Cadastre sua chave PIX no Perfil primeiro.');

        const btn=this.qs('#btnSaque');
        btn.disabled=true; btn.textContent='PROCESSANDO...';

        try {
            const res = await this._fetchAutenticado(`${this.apiUrl}/api/carteira/saque`, {
                method: 'POST',
                headers: { 'Content-Type':'application/json' },
                body: JSON.stringify({ uid: this.sessionUid, valor, pix_tipo: pixTipo, pix_chave: pixChave }),
            });
            if (res.status === 401) return; // _fetchAutenticado já limpou a sessão e avisou
            const data = await res.json();
            if (!res.ok) throw new Error(data.erro || 'Erro ao solicitar saque.');
            this.qs('#cValor').value = '';
            if (data.pago) {
                this.showAlert('#alC', `✓ ${data.mensagem}`, false);
            } else {
                this.showAlert('#alC','Saque solicitado! A agência processará em breve.',false);
            }
            setTimeout(()=>this.loadCarteira(), 1500);
        } catch(e) {
            this.showAlert('#alC', e.message);
        } finally {
            btn.disabled=false; btn.textContent='SOLICITAR SAQUE';
        }
    }

    // ── Cadastro ─────────────────────────────────────────────────────
    async doOtpReq(){
        const uid=this.qs('#rUid').value, email=this.qs('#rEmail').value;
        if(!uid||!email) return this.showAlert('#alR','Preencha UID e e-mail.');
        const btn=this.qs('#btnCode'); btn.disabled=true;
        try{
            const res=await fetch(`${this.apiUrl}/api/auth/enviar-otp`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({uid,email})});
            if(!res.ok){ const e=await res.json(); throw new Error(e.erro||'Erro ao enviar código.'); }
            this.qs('#rs1').classList.remove('on');
            this.qs('#rs2').classList.add('on');
        } catch(e){ this.showAlert('#alR',e.message); }
        finally{ btn.disabled=false; }
    }

    doOtpVal(){
        const otp=this.qs('#rOtp').value;
        if(otp.length!==6) return this.showAlert('#alR','Formato incorreto.');
        this.qs('#rs2').classList.remove('on');
        this.qs('#rs3').classList.add('on');
    }

    async doReg(){
        const uid=this.qs('#rUid').value, email=this.qs('#rEmail').value, otp=this.qs('#rOtp').value;
        const p1=this.qs('#rP1').value, p2=this.qs('#rP2').value;
        const rx=/^(?=.*[A-Z])(?=.*\d)[A-Za-z\d@$!%*?&]{6,}$/;
        if(p1!==p2)      return this.showAlert('#alR','As senhas nao conferem.');
        if(!rx.test(p1)) return this.showAlert('#alR','Senha fraca: 1 maiuscula e 1 numero.');
        const btn=this.qs('#btnReg'); btn.disabled=true;
        try{
            const res=await fetch(`${this.apiUrl}/api/auth/confirmar`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({uid,email,otp,password:p1})});
            if(!res.ok){ const e=await res.json(); throw new Error(e.erro||'Processo recusado.'); }
            this.qs('#lUid').value=uid; this.qs('#lPass').value=p1;
            this.doLogin();
        } catch(e){ this.showAlert('#alR',e.message); btn.disabled=false; }
    }

    // ── Salvar perfil ─────────────────────────────────────────────────
    async doSave(){
        const nova=this.qs('#sPass').value;
        const rx=/^(?=.*[A-Z])(?=.*\d)[A-Za-z\d@$!%*?&]{6,}$/;
        if(nova&&!rx.test(nova)) return this.showAlert('#alS','Senha fraca: 1 maiuscula e 1 numero.');
        const btn=this.qs('#btnSave'); btn.disabled=true; btn.textContent='SALVANDO...';
        try{
            const res=await this._fetchAutenticado(`${this.apiUrl}/api/perfil/atualizar`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({uid:this.sessionUid,nome:this.qs('#sName').value,whatsapp:this.qs('#sWpp').value,endereco:this.qs('#sAddr').value,pix_tipo:this.qs('#sPixTipo').value,pix_chave:this.qs('#sPixChave').value,nova_senha:nova})});
            if(res.status === 401) return; // _fetchAutenticado já limpou a sessão e avisou
            if(!res.ok){ const e=await res.json(); throw new Error(e.erro||'Falha na atualizacao.'); }
            this.showAlert('#alS','Dados atualizados com sucesso.',false);
            const n=this.qs('#sName').value;
            if(n) this.qs('#dName').textContent=n;
        } catch(e){ this.showAlert('#alS',e.message); }
        finally{ btn.disabled=false; btn.textContent='ATUALIZAR DADOS'; this.qs('#sPass').value=''; this.checkPass('#sPass','#sm1','#sn1'); }
    }

    // ── Recuperar Senha ───────────────────────────────────────────────
    async doFindAccount(){
        const uid=this.qs('#fUid').value.trim();
        if(!uid) return this.showAlert('#alF','Informe seu UID Kwai.');
        const btn=this.qs('#btnFind'); btn.disabled=true; btn.textContent='BUSCANDO...';
        try{
            const res=await fetch(`${this.apiUrl}/api/auth/buscar-email`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({uid})});
            if(!res.ok){ const e=await res.json(); throw new Error(e.erro||'UID não encontrado.'); }
            const data=await res.json();
            this.qs('#fEmailMask').textContent=data.email_mascarado;
            this.qs('#fs1').classList.remove('on');
            this.qs('#fs2').classList.add('on');
        } catch(e){ this.showAlert('#alF',e.message); }
        finally{ btn.disabled=false; btn.textContent='BUSCAR CONTA'; }
    }

    async doSendReset(){
        const uid=this.qs('#fUid').value.trim();
        const btn=this.qs('#btnSendReset'); btn.disabled=true; btn.textContent='ENVIANDO...';
        try{
            const res=await fetch(`${this.apiUrl}/api/auth/recuperar-senha`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({uid})});
            if(!res.ok){ const e=await res.json(); throw new Error(e.erro||'Erro ao enviar código.'); }
            this.qs('#fs2').classList.remove('on');
            this.qs('#fs3').classList.add('on');
        } catch(e){ this.showAlert('#alF',e.message); }
        finally{ btn.disabled=false; btn.textContent='ENVIAR CÓDIGO'; }
    }

    doCheckResetOtp(){
        const otp=this.qs('#fOtp').value.trim();
        if(otp.length!==6) return this.showAlert('#alF','Código deve ter 6 dígitos.');
        this.qs('#fs3').classList.remove('on');
        this.qs('#fs4').classList.add('on');
    }

    async doConfirmReset(){
        const uid=this.qs('#fUid').value.trim(), otp=this.qs('#fOtp').value.trim();
        const p1=this.qs('#fP1').value, p2=this.qs('#fP2').value;
        const rx=/^(?=.*[A-Z])(?=.*\d)[A-Za-z\d@$!%*?&]{6,}$/;
        if(p1!==p2)      return this.showAlert('#alF','As senhas não conferem.');
        if(!rx.test(p1)) return this.showAlert('#alF','Senha fraca: 1 maiúscula e 1 número.');
        const btn=this.qs('#btnResetPass'); btn.disabled=true; btn.textContent='SALVANDO...';
        try{
            const res=await fetch(`${this.apiUrl}/api/auth/confirmar-reset`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({uid,otp,nova_senha:p1})});
            if(!res.ok){ const e=await res.json(); throw new Error(e.erro||'Código inválido ou expirado.'); }
            this.qs('#lUid').value=uid; this.qs('#lPass').value=p1;
            await this.doLogin();
        } catch(e){ this.showAlert('#alF',e.message); }
        finally{ btn.disabled=false; btn.textContent='SALVAR NOVA SENHA'; }
    }

    // ── Comunicados do painel ────────────────────────────────────────
    async fetchComunicados() {
        try {
            const data = await window.DmaiorAPI.rank.getComunicados('painel');
            const todos = data.comunicados || [];

            // Dashboard: só avisos rápidos (tipo = 'rapido' ou sem tipo — compatibilidade)
            const rapidos = todos.filter(c => !c.tipo || c.tipo === 'rapido');
            const el = this.qs('#painelComunicados');
            if (el) {
                if (!rapidos.length) { el.innerHTML = ''; }
                else {
                    el.innerHTML = rapidos.map(c => `
                        <div class="dm-comunicado">
                            ${c.emoji ? `<span class="dm-comunicado-ico">${this._escHtml(c.emoji)}</span>` : ''}
                            <span class="dm-comunicado-txt">${this._escHtml(c.texto)}</span>
                        </div>`).join('');
                }
            }

            // Atualiza ponto do sino: verifica se há importantes não lidos
            const importantes = todos.filter(c => c.tipo === 'importante');
            if (importantes.length) {
                try {
                    const uid     = localStorage.getItem('dm_uid') || 'anon';
                    const seenRaw = localStorage.getItem(`dm_avisos_ids_${uid}`);
                    const seen    = seenRaw ? JSON.parse(seenRaw) : [];
                    const hasNew  = importantes.some(c => !seen.includes(String(c.id)));
                    const menu    = document.querySelector('menu-mobile-dmaior');
                    if (menu?.shadowRoot) {
                        const dot = menu.shadowRoot.getElementById('bellDot');
                        if (dot) dot.classList.toggle('hidden', !hasNew);
                    }
                } catch {}
            }
        } catch { /* silencia erro — comunicados são opcionais */ }
    }

    // ── Ranking / Impulsionamento / Logout ───────────────────────────
    goRanking(){
        // ranking-dmaior já existe no DOM desde antes do login terminar —
        // reconfirma a sessão real do streamer toda vez que a aba abre.
        this.qs('#rankingEl')?.verificarSessao?.();
        this.navigate('vRank');
        this.navActive('nRank');
    }
    goImpulsionamento(){
        // Abre o componente dmaior-impulso inline, sem sair do painel
        const el = this.qs('#impulsoEl');
        if(el){
            // Define o worker-url para o componente (lido em connectedCallback)
            // Auth e quota do impulso rodam no mesmo worker do painel (dashboard)
            const workerUrl = window.DmaiorConfig?.workers?.dashboard || 'https://dashboard.agencydmaior.com.br';
            el.setAttribute('worker-url', workerUrl);

            // Reconfirma a sessão sempre que abrir essa aba — o componente já
            // existe no DOM desde antes do login terminar, então pode ter
            // ficado preso em "Sessão Expirada" da primeira checagem (feita
            // sem token ainda). Isso corrige sozinho, sem precisar deslogar.
            el.verificarSessao?.();

            // Nav interno do componente removido — painel pai já tem menu
        }
        this.navigate('vImpulso');
        this.navActive('nImpulso');
    }
    goVotacao(){
        // dmaior-votacao já lê dm_uid/dm_token do localStorage sozinho — só
        // precisa navegar, sem passar atributo nenhum (diferente do impulso,
        // que precisa do worker-url porque fala com um worker diferente).
        this.navigate('vVotacao');
        this.navActive('nVotacao');
    }
    goPk(){
        // painel-pk já lê dm_uid/dm_token do localStorage sozinho — só precisa
        // navegar e reconfirmar a sessão, igual ranking-dmaior/dmaior-votacao.
        this.qs('#pkEl')?.verificarSessao?.();
        this.navigate('vPk');
        this.navActive('nPk');
    }
    goTickets(){
        // dmaior-tickets já existe no DOM desde antes do login terminar — reconfirma
        // a sessão toda vez que a aba abre, igual dmaior-impulso.
        this.qs('#ticketsEl')?.verificarSessao?.();
        this.navigate('vTickets');
        this.navActive('nTickets');
    }
    goMolduras(){
        const frame = this.qs('#moldurasFrame');
        if(frame && !frame.getAttribute('src')) frame.setAttribute('src', 'molduras.html?v=20260622-1');
        this.navigate('vMolduras');
        this.navActive('nMolduras');
    }
    goAvisos(){
        this.navigate('vAvisos');
        // Sem item no menu inferior — remove o active de todos
        this.querySelectorAll('.nit').forEach(e=>{
            e.classList.remove('on');
            if(e.id!=='nO') e.style.color='var(--muted)';
        });
        this.loadAvisos();
    }

    async loadAvisos(){
        const el = this.qs('#avisosList');
        if(!el) return;
        el.innerHTML = '<div class="avisos-loading">Carregando avisos...</div>';
        try {
            const data  = await window.DmaiorAPI.rank.getComunicados('painel');
            // Notificações mostram apenas avisos importantes
            const lista = (data.comunicados || []).filter(c => c.tipo === 'importante');

            // Armazena para uso em _marcarTodosLidos
            this._avisosLista = lista;

            // Marca todos como lidos e apaga o ponto do sino
            this._salvarIdsLidos(lista);

            if(!lista.length){
                el.innerHTML = '<div class="avisos-empty">Nenhum aviso no momento.</div>';
                return;
            }

            // Separa destaque dos demais
            const destaque = lista.find(c => c.destaque);
            const demais   = lista.filter(c => !c.destaque);

            let html = '';

            // ── Card destaque ────────────────────────────────────────
            if(destaque){
                const imgHtml = destaque.imagem_url
                    ? `<img class="aviso-destaque-img" src="${this._escHtml(this._normalizarImagemUrl(destaque.imagem_url))}" alt="${this._escHtml(destaque.titulo||destaque.texto)}" loading="lazy">`
                    : '';
                const sub  = destaque.descricao ? `<div class="aviso-destaque-sub">${this._escHtml(destaque.descricao)}</div>` : '';
                const desc = destaque.texto ? `<div class="aviso-destaque-desc">${this._escHtml(destaque.texto)}</div>` : '';
                const btn1 = (destaque.link_url && destaque.link_label)
                    ? `<a href="${this._escHtml(destaque.link_url)}" target="_blank" rel="noopener noreferrer" class="aviso-btn-pri">${this._escHtml(destaque.link_label)}</a>`
                    : '';
                const btn2 = (destaque.link2_url && destaque.link2_label)
                    ? `<a href="${this._escHtml(destaque.link2_url)}" target="_blank" rel="noopener noreferrer" class="aviso-btn-sec">${this._escHtml(destaque.link2_label)}</a>`
                    : '';
                html += `<div class="aviso-destaque">
                    ${imgHtml}
                    <div class="aviso-destaque-body">
                        <div class="aviso-destaque-titulo">${this._escHtml(destaque.titulo || destaque.texto)}</div>
                        ${sub}${desc}
                        ${(btn1||btn2)?`<div class="aviso-destaque-btns">${btn2}${btn1}</div>`:''}
                    </div>
                </div>`;
            }

            // ── Lista de avisos ──────────────────────────────────────
            if(demais.length){
                html += `<div class="avisos-sec-titulo">Últimos avisos</div>
                <div class="avisos-list">${demais.map(c=>{
                    const thumbHtml = c.imagem_url
                        ? `<img class="aviso-card-thumb" src="${this._escHtml(this._normalizarImagemUrl(c.imagem_url))}" alt="" loading="lazy">`
                        : (c.emoji ? `<div class="aviso-card-emoji">${c.emoji}</div>` : '');
                    const titulo = this._escHtml(c.titulo || c.texto);
                    const desc   = c.titulo && c.texto ? `<div class="aviso-card-desc">${this._escHtml(c.texto)}</div>` : '';
                    const data   = c.criado_em ? this.fdt(c.criado_em) : '';
                    const dataHtml = data ? `<div class="aviso-card-data"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>${data}</div>` : '';
                    return `<div class="aviso-card">
                        ${thumbHtml}
                        <div class="aviso-card-body">
                            <div class="aviso-card-titulo">${titulo}</div>
                            ${desc}${dataHtml}
                        </div>
                    </div>`;
                }).join('')}</div>`;
            }

            el.innerHTML = html;
        } catch {
            el.innerHTML = '<div class="avisos-empty">Não foi possível carregar os avisos.</div>';
        }
    }

    // Salva IDs no localStorage e apaga ponto do sino
    _salvarIdsLidos(lista){
        try {
            const uid = localStorage.getItem('dm_uid') || 'anon';
            const ids = lista.map(c => String(c.id));
            localStorage.setItem(`dm_avisos_ids_${uid}`, JSON.stringify(ids));
            const menu = document.querySelector('menu-mobile-dmaior');
            if(menu?.shadowRoot){
                const dot = menu.shadowRoot.getElementById('bellDot');
                if(dot) dot.classList.add('hidden');
            }
        } catch {}
    }

    _marcarTodosLidos(){
        // Salva os IDs da lista ATUALMENTE carregada (não reler os mesmos do localStorage)
        if(this._avisosLista?.length) {
            this._salvarIdsLidos(this._avisosLista);
        }
        // Apaga ponto do sino visualmente
        const menu = document.querySelector('menu-mobile-dmaior');
        if(menu?.shadowRoot){
            const dot = menu.shadowRoot.getElementById('bellDot');
            if(dot) dot.classList.add('hidden');
        }
        const btn = this.qs('#btnMarkAllRead');
        if(btn){ btn.style.opacity='.4'; btn.style.pointerEvents='none'; }
    }

    // Escapa HTML para evitar XSS em conteúdo vindo da API
    _escHtml(str){
        if(str==null) return '';
        return String(str)
            .replace(/&/g,'&amp;')
            .replace(/</g,'&lt;')
            .replace(/>/g,'&gt;')
            .replace(/"/g,'&quot;')
            .replace(/'/g,'&#39;');
    }

    _normalizarImagemUrl(u){
        if(!u || typeof u !== 'string') return '';
        const raw = u.trim();
        if(!raw) return '';
        try{
            const url = new URL(raw);
            if(url.protocol !== 'http:' && url.protocol !== 'https:') return '';
            const host = url.hostname.toLowerCase();
            if(host === 'drive.google.com' || host === 'docs.google.com' || host.endsWith('.googleusercontent.com')){
                const fileMatch = url.pathname.match(/\/file\/d\/([^/]+)/);
                const id = fileMatch?.[1] || url.searchParams.get('id');
                if(id && /^[\w-]{10,}$/.test(id)) return `https://drive.google.com/thumbnail?id=${encodeURIComponent(id)}&sz=w1600`;
            }
            return url.href;
        }catch{
            return '';
        }
    }

    logout(){
        this._clearSession();
        this.navigate('vL');
    }
}

customElements.define('dmaior-app', DMaiorPainel);
