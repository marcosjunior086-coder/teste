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
        if (this._resizeObserver) {
            this._resizeObserver.disconnect();
            this._resizeObserver = null;
        }
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
                if (refresh) {
                    try {
                        const controller = new AbortController();
                        const timer = setTimeout(() => controller.abort(), 5000);
                        const res = await fetch(`${this.apiUrl}/api/refresh`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ refresh_token: refresh }),
                            signal: controller.signal,
                        });
                        clearTimeout(timer);
                        if (res.ok) {
                            const data = await res.json();
                            if (data.token) {
                                localStorage.setItem('dm_token',   data.token);
                                localStorage.setItem('dm_refresh', data.refresh_token || refresh);
                            }
                        } else if (res.status === 401) {
                            this._clearSession();
                            if (loading) loading.style.display = 'none';
                            return;
                        }
                    } catch(_) {}
                }

                this.sessionUid   = uid;
                this.sessionToken = localStorage.getItem('dm_token') || token;
                this.sessionEmail = email;
                try { localStorage.setItem('agencia_auth', 'true'); } catch(e){}

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
            ['dm_uid','dm_token','dm_refresh','dm_email','dm_foto','dm_nome','agencia_auth']
                .forEach(k => localStorage.removeItem(k));
        } catch(e) {}
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
    svgLogout()  { return `<svg viewBox="0 0 24 24"><path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/></svg>`; }
    svgInfo()    { return `<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>`; }
    svgRank()    { return `<svg viewBox="0 0 24 24"><path d="M7.5 21H2V9h5.5v12zm7.25-18h-5.5v18h5.5V3zM22 11h-5.5v10H22V11z"/></svg>`; }
    svgBoost()   { return `<svg viewBox="0 0 24 24"><path d="M12 2s6 4 6 11c0 3.5-1.5 6.5-3 8H9c-1.5-1.5-3-4.5-3-8C6 6 12 2 12 2zm0 7a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm-4 13h8v-2H8v2z"/></svg>`; }
    svgFrame()   { return `<svg viewBox="0 0 24 24"><path d="M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zm0 2v2.17A3 3 0 0 0 16.17 5H19zM5 5h2.83A3 3 0 0 0 5 7.83V5zm0 14v-2.83A3 3 0 0 0 7.83 19H5zm14 0h-2.83A3 3 0 0 0 19 16.17V19zM9 19a5 5 0 0 1 10-5V10a5 5 0 0 1-5-5h-4a5 5 0 0 1-5 5v4a5 5 0 0 1 4 5z"/></svg>`; }
    svgKey()     { return `<svg viewBox="0 0 24 24"><path d="M12.65 10A6 6 0 1 0 14 14.65L14 14h2v2h2v2h2v-2.18A6.002 6.002 0 0 0 12.65 10zM7 14a2 2 0 1 1 0-4 2 2 0 0 1 0 4z"/></svg>`; }
    svgWallet()  { return `<svg viewBox="0 0 24 24"><path d="M21 7H3c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V9c0-1.1-.9-2-2-2zm0 12H3V9h18v10zm-9-1c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3 1.34 3 3 3zM1 5h20V3H1v2z"/></svg>`; }
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
                --border:rgba(0,230,230,.18); --glass:rgba(26,26,26,.92);
                --text:#fff; --muted:#a0b8c8;
                --ftitle:clamp(1.2rem,5vw,1.8rem); --fval:clamp(1.1rem,4vw,1.5rem);
                font-family:var(--dm-font-body,'Exo 2',sans-serif); font-size:calc(16px * var(--dm-font-scale, 1)); background:transparent; color:var(--text);
                min-height:100%; display:flex; flex-direction:row; width:100%; overflow-x:hidden; position:relative;
            }
            .content { flex:1; display:flex; flex-direction:column; align-items:center; padding:24px; min-width:0; overflow-x:hidden; }
            .bnav { order:-1; width:220px; min-width:220px; flex-shrink:0; display:none; flex-direction:column; align-items:stretch; justify-content:flex-start; position:relative; height:100%; background:transparent; border-right:1px solid var(--border); padding:20px 0; gap:2px; z-index:100; }
            .bnav.on { display:flex; }
            .nit { display:flex; flex-direction:row; align-items:center; justify-content:flex-start; color:var(--muted); font-size:.8rem; font-family:var(--dm-font-title,'Rajdhani',sans-serif); font-weight:600; gap:10px; cursor:pointer; transition:all 0.2s; border:none; background:none; padding:12px 16px; border-radius:8px; margin:0 10px; width:calc(100% - 20px); }
            .nit svg { width:18px; height:18px; fill:currentColor; flex-shrink:0; }
            .nit:hover { color:var(--text); background:rgba(255,255,255,0.05); }
            .nit.on { color:var(--cyan); background:var(--cyan-d); }
            .nit.on svg { filter:drop-shadow(0 0 5px var(--cyan)); }
            .nit.sair { margin-top:auto; color:var(--red); }
            .nit.sair:hover { background:rgba(248,113,113,.1); }

            @media(max-width:768px){
                .shell { flex-direction:column; }
                .content { padding:15px 10px 90px; }
                .card { background:rgba(26,26,26,.97); backdrop-filter:none; padding:15px; }
                .earn .usd { font-size:1.8rem; }
                .mbox { padding:12px; }
                .bnav { order:0; position:fixed; top:auto; bottom:0; left:0; width:100%; height:70px; min-height:0; flex-direction:row; justify-content:space-around; align-items:center; border-right:none; border-top:1px solid var(--border); padding:0; background:rgba(18,18,18,0.97); z-index:1000; backdrop-filter:blur(10px); }
                .nit { flex-direction:column; justify-content:center; font-size:.6rem; gap:3px; padding:6px 8px; margin:0; width:auto; border-radius:0; background:none; }
                .nit svg { width:20px; height:20px; }
                .nit:hover,.nit.sair:hover { background:none; }
                .nit.on { background:none; }
                .nit.sair { margin-top:0; }
                .molduras-frame{height:calc(100vh - 98px);min-height:620px;border-radius:0;}
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
            .auth-view{max-width:580px;margin:0 auto;}
            .dash-view{max-width:1100px;margin:0 auto;}
            @keyframes fi{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
            .dash-grid{display:grid;grid-template-columns:1fr 1.3fr;gap:20px;align-items:start;}
            .dash-left,.dash-right{min-width:0;}
            @media(max-width:992px){.dash-grid{grid-template-columns:1fr;gap:0;}}
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
            .disc-wrap{border-top:1px solid var(--border);margin-top:12px;padding-top:12px;}
            .disc-trigger{display:flex;align-items:center;justify-content:space-between;width:100%;background:none;border:none;cursor:pointer;padding:0;color:var(--gold);font-family:var(--dm-font-title,'Rajdhani',sans-serif);font-weight:700;font-size:.8rem;text-transform:uppercase;letter-spacing:.06em;transition:opacity .2s;}
            .disc-trigger:hover{opacity:.8;}
            .disc-left{display:flex;align-items:center;gap:7px;}
            .disc-left svg{width:14px;height:14px;fill:var(--gold);flex-shrink:0;}
            .disc-arrow{width:14px;height:14px;fill:var(--muted);transition:transform .3s;flex-shrink:0;}
            .disc-trigger.open .disc-arrow{transform:rotate(180deg);}
            .disc-body{max-height:0;overflow:hidden;transition:max-height .35s ease;}
            .disc-body.open{max-height:300px;}
            .disc-inner{padding-top:10px;display:flex;flex-direction:column;gap:8px;}
            .disc-item{display:flex;gap:8px;align-items:flex-start;font-size:.7rem;color:var(--muted);line-height:1.5;}
            .disc-item svg{width:13px;height:13px;flex-shrink:0;margin-top:2px;}
            .disc-item svg.radar{fill:var(--cyan);}.disc-item svg.tool{fill:var(--gold);}.disc-item svg.chart{fill:var(--green);}
            .disc-item strong{color:var(--text);}
            .rst{display:none;animation:fi .3s ease;}.rst.on{display:block;}
            .al{display:none;border:1px solid var(--red);color:var(--red);padding:10px;border-radius:8px;font-size:.8rem;margin-bottom:15px;text-align:center;}
            .al.on{display:block;}
            .fEmail-box{background:rgba(0,212,212,.07);border:1px dashed var(--cyan);border-radius:12px;padding:14px 20px;margin-bottom:20px;}
            .fEmail-box .fe-lbl{font-size:.7rem;color:var(--muted);font-family:var(--dm-font-title,'Rajdhani',sans-serif);text-transform:uppercase;margin-bottom:4px;}
            .fEmail-box .fe-val{font-size:1rem;color:var(--cyan);font-family:var(--dm-font-title,'Rajdhani',sans-serif);font-weight:700;word-break:break-all;}

            /* ── CARTEIRA v2 ── */
            .cart-view{max-width:620px;margin:0 auto;}
            .cart-mini-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:15px;}

            /* Hero card saldo — gradiente azul escuro → ciano (de cima pra baixo) */
            .cart-hero{
                width:100%;
                background:linear-gradient(0deg,#05051a 0%,#003f4f 55%,#00d4d4 100%);
                border-radius:20px;
                padding:24px 20px 22px;
                position:relative;
                margin-bottom:15px;
                border:1px solid rgba(0,212,212,.3);
                box-shadow:0 8px 40px rgba(0,212,212,.18);
                overflow:hidden;
            }
            /* brilho sutil no canto superior */
            .cart-hero::before{
                content:'';position:absolute;top:-40px;right:-40px;
                width:160px;height:160px;border-radius:50%;
                background:radial-gradient(circle,rgba(0,212,212,.12) 0%,transparent 70%);
                pointer-events:none;
            }
            .cart-hero .hero-lbl{
                font-size:.72rem;color:rgba(255,255,255,.65);
                font-family:var(--dm-font-title,'Rajdhani',sans-serif);text-transform:uppercase;
                letter-spacing:1.5px;margin-bottom:8px;
            }
            .cart-hero .hero-valor{
                font-size:2.8rem;color:#fff;font-weight:700;
                font-family:var(--dm-font-title,'Rajdhani',sans-serif);line-height:1;
                text-shadow:0 0 24px rgba(0,212,212,.5);
                margin-bottom:6px;
            }
            .cart-hero .hero-sub{
                font-size:.75rem;color:rgba(255,255,255,.55);
                font-family:var(--dm-font-title,'Rajdhani',sans-serif);
            }
            /* Botão Histórico no canto superior direito */
            .cart-hist-btn{
                position:absolute;top:18px;right:16px;
                background:rgba(255,255,255,.12);
                border:1px solid rgba(255,255,255,.22);
                border-radius:20px;padding:5px 13px;
                display:flex;align-items:center;gap:5px;
                color:#fff;font-family:var(--dm-font-title,'Rajdhani',sans-serif);
                font-size:.72rem;font-weight:700;cursor:pointer;
                backdrop-filter:blur(6px);transition:background .2s;
                text-transform:uppercase;letter-spacing:.05em;
                white-space:nowrap;
            }
            .cart-hist-btn:hover{background:rgba(255,255,255,.22);}
            .cart-hist-btn svg{width:13px;height:13px;fill:#fff;flex-shrink:0;}

            /* Sub-view histórico */
            .hist-panel{display:none;animation:fi .3s ease;}
            .hist-panel.on{display:block;}
            .hist-back{
                display:flex;align-items:center;gap:8px;
                background:none;border:none;color:var(--cyan);
                font-family:var(--dm-font-title,'Rajdhani',sans-serif);font-weight:700;
                font-size:.9rem;cursor:pointer;padding:0;
                margin-bottom:16px;text-transform:uppercase;
            }
            .hist-back svg{width:20px;height:20px;fill:var(--cyan);}

            .tx-row{display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid rgba(255,255,255,.04);}
            .tx-row:last-child{border-bottom:none;}
            .tx-icon{width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
            .tx-icon.in{background:rgba(74,222,128,.15);}
            .tx-icon.out{background:rgba(248,113,113,.12);}
            .tx-icon svg{width:14px;height:14px;}
            .tx-icon.in svg{fill:var(--green);}
            .tx-icon.out svg{fill:var(--red);}
            .tx-info{flex:1;min-width:0;}
            .tx-tipo{font-family:var(--dm-font-title,'Rajdhani',sans-serif);font-size:.8rem;font-weight:700;color:var(--text);}
            .tx-desc{font-size:.7rem;color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
            .tx-val{font-family:var(--dm-font-title,'Rajdhani',sans-serif);font-size:.95rem;font-weight:700;text-align:right;}
            .tx-val.in{color:var(--green);}
            .tx-val.out{color:var(--red);}
            .tx-data{font-size:.65rem;color:var(--muted);text-align:right;}
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
            }
            /* Cart-hero — saldo disponível — segue bloom do tema */
            [data-theme="branco"] .shell .cart-hero {
                background: linear-gradient(0deg,#0d1a2e 0%,#0369a1 55%,#0095a8 100%);
                border-color: rgba(0,149,168,0.4);
                box-shadow: 0 8px 40px rgba(0,149,168,0.2);
            }
            [data-theme="rosa"] .shell .cart-hero {
                background: linear-gradient(0deg,#1a0010 0%,#880040 55%,#e91e8c 100%);
                border-color: rgba(233,30,140,0.4);
                box-shadow: 0 8px 40px rgba(233,30,140,0.2);
            }
            [data-theme="laranja"] .shell .cart-hero {
                background: linear-gradient(0deg,#1a0800 0%,#92400e 55%,#f97316 100%);
                border-color: rgba(249,115,22,0.4);
                box-shadow: 0 8px 40px rgba(249,115,22,0.2);
            }
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
                <button class="nit on" id="nD">${this.svgGrid()} <span data-i18n="dashboard">RESUMO</span></button>
                <button class="nit" id="nS">${this.svgUser()} <span data-i18n="profile">PERFIL</span></button>
                <button class="nit" id="nC">${this.svgWallet()} <span data-i18n="wallet">CARTEIRA</span></button>
                <button class="nit" id="nImpulso">${this.svgBoost()} <span data-i18n="boost">IMPULSO</span></button>
                <button class="nit" id="nMolduras">${this.svgFrame()} <span data-i18n="frames">MOLDURAS</span></button>
                <button class="nit" id="nRank">${this.svgRank()} <span data-i18n="ranking">RANKING</span></button>
                <button class="nit sair" id="nO">${this.svgLogout()} <span data-i18n="logout">SAIR</span></button>
            </nav>

            <div class="content">

                <!-- ══════ LOGIN ══════ -->
                <div id="vL" class="view auth-view">
                    <div class="card" style="margin-top:10vh;text-align:center;padding:40px 25px;">
                        <p class="raaj" style="font-size:1rem;color:var(--cyan);margin-bottom:30px;">ACESSO STREAMER</p>
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
                    <div class="hd">
                        <button class="btn-sm" id="btnRef"><span id="refIco">${this.svgRefresh()}</span> ATUALIZAR</button>
                    </div>
                    <div id="painelComunicados" style="width:100%;margin-bottom:4px;display:flex;flex-direction:column;gap:8px;"></div>
                    <div class="dash-grid">
                        <div class="dash-left">
                            <div class="card pcard">
                                <div class="ava" id="dAva"><span style="width:30px;height:30px;">${this.svgUser()}</span></div>
                                <div>
                                    <h2 class="raaj" id="dName" style="font-size:1.1rem;">Aguardando...</h2>
                                    <p id="dUid" style="font-size:.75rem;color:var(--gold);margin-top:2px;">UID: ------</p>
                                </div>
                            </div>
                            <div class="card earn">
                                <span class="raaj lbl">ESTIMATIVA ACUMULADA (USD)</span>
                                <div class="usd" id="dUsd">$ 0.00</div>
                                <span id="dDiaLbl" style="font-size:.75rem;color:var(--muted);font-family:var(--dm-font-title,'Rajdhani',sans-serif);">0 diamantes</span>
                            </div>
                            <div class="mgrid">
                                <div class="mbox">
                                    <span class="mlbl">${this.svgDiamond()} DIAMANTES</span>
                                    <span class="val" id="dDia">0</span>
                                </div>
                                <div class="mbox">
                                    <span class="mlbl">${this.svgClock()} TEMPO TRANSMITIDO</span>
                                    <span class="val" id="dHrTot">00:00</span>
                                    <div class="hsub">
                                        <div class="hrow"><span class="tag">${this.svgClock()} Vídeo</span><span class="hv" style="color:var(--cyan);" id="dHrVid">00:00</span></div>
                                        <div class="hrow"><span class="tag">${this.svgClock()} Áudio</span><span class="hv" style="color:var(--gold);" id="dHrAud">00:00</span></div>
                                    </div>
                                </div>
                                <div class="mbox" style="grid-column:span 2;">
                                    <div style="display:flex;justify-content:space-between;align-items:flex-end;">
                                        <div><span class="mlbl">${this.svgClock()} HORAS VÁLIDAS</span><span class="val" id="dHrTxt">0h <span style="font-size:.7rem;color:var(--muted);font-weight:normal">/ 40h</span></span></div>
                                        <span style="font-size:.8rem;color:var(--cyan);" id="dHrPct">0%</span>
                                    </div>
                                    <div class="prog"><div class="progf" id="pH" style="width:0%"></div></div>
                                </div>
                                <div class="mbox" style="grid-column:span 2;">
                                    <div style="display:flex;justify-content:space-between;align-items:flex-end;">
                                        <div><span class="mlbl">${this.svgCal()} DIAS DE LIVE</span><span class="val" id="dDayTxt">0 <span style="font-size:.7rem;color:var(--muted);font-weight:normal">/ 20 dias</span></span></div>
                                        <span style="font-size:.8rem;color:var(--cyan);" id="dDayPct">0%</span>
                                    </div>
                                    <div class="prog"><div class="progf" id="pD" style="width:0%"></div></div>
                                </div>
                            </div>
                        </div>
                        <div class="dash-right">
                            <div class="card">
                                <div class="ctogs">
                                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                                        <h3 class="raaj" style="font-size:.9rem;color:var(--muted);">DESEMPENHO</h3>
                                        <div class="tgrp">
                                            <button class="tbtn on" id="tMesAtual">Mês Atual</button>
                                            <button class="tbtn" id="tMesAnt">Mês Anterior</button>
                                        </div>
                                    </div>
                                    <div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:flex-end;">
                                        <div class="tgrp">
                                            <button class="tbtn on" id="tDi">Diamantes</button>
                                            <button class="tbtn" id="tHo">Horas</button>
                                        </div>
                                        <div class="tgrp">
                                            <button class="tbtn on" id="t7d">7 dias</button>
                                            <button class="tbtn" id="t30d">30 dias</button>
                                        </div>
                                    </div>
                                </div>
                                <div class="chwrap"><canvas id="pChart"></canvas></div>
                            </div>
                            <div class="card">
                                <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:4px;">
                                    <h3 class="raaj" style="font-size:.9rem;color:var(--muted);">HISTÓRICO DIÁRIO</h3>
                                    <span class="raaj" style="font-size:.7rem;color:var(--muted);" id="hRes">— dias • — diamantes</span>
                                </div>
                                <table class="htbl">
                                    <thead><tr>
                                        <th>Data</th>
                                        <th><span style="display:flex;align-items:center;gap:3px;"><span style="width:12px;height:12px;display:inline-flex;flex-shrink:0;">${this.svgClock()}</span> Horas</span></th>
                                        <th><span style="display:flex;align-items:center;gap:3px;"><span style="width:12px;height:12px;display:inline-flex;flex-shrink:0;">${this.svgDiamond()}</span> Diamantes</span></th>
                                        <th class="r">Status</th>
                                    </tr></thead>
                                    <tbody id="hBody"><tr><td colspan="4" style="text-align:center;color:var(--muted);padding:20px;font-size:.8rem;">Carregando...</td></tr></tbody>
                                </table>
                                <div class="disc-wrap">
                                    <button class="disc-trigger" id="discBtn">
                                        <span class="disc-left">
                                            <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
                                            Monitoramento de Desempenho
                                        </span>
                                        <svg class="disc-arrow" viewBox="0 0 24 24"><path d="M7 10l5 5 5-5z"/></svg>
                                    </button>
                                    <div class="disc-body" id="discBody">
                                        <div class="disc-inner">
                                            <div class="disc-item">
                                                <svg class="radar" viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8zm-1-5h2v2h-2zm0-8h2v6h-2z"/></svg>
                                                <span><strong>Atualização em Tempo Real:</strong> Os dados são sincronizados a cada <strong>1 minuto</strong> diretamente da plataforma Kwai. Por conta dessa frequência, pode haver uma variação de até <strong>2%</strong> em relação aos dados oficiais — normal para sistemas de monitoramento em tempo real.</span>
                                            </div>
                                            <div class="disc-item">
                                                <svg class="tool" viewBox="0 0 24 24"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
                                                <span><strong>Auto-Correção a cada 48h:</strong> O sistema realiza automaticamente uma reconciliação completa dos dados a cada <strong>48 horas</strong>, corrigindo qualquer divergência e alinhando os totais ao padrão oficial da plataforma.</span>
                                            </div>
                                            <div class="disc-item">
                                                <svg class="chart" viewBox="0 0 24 24"><path d="M19 3H5L2 9l10 12L22 9l-3-6zm-7 14.5L4.5 9.5l2-4h11l2 4L12 17.5z"/></svg>
                                                <span><strong>Relatório Oficial:</strong> Os resultados definitivos são validados e consolidados no mês seguinte com base no relatório oficial da plataforma Kwai, que prevalece sobre qualquer dado exibido aqui.</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
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

                        <!-- Hero card saldo com botão Histórico -->
                        <div class="cart-hero">
                            <div class="hero-lbl">Saldo Disponível</div>
                            <div class="hero-valor" id="cSaldo">R$ 0,00</div>
                            <div class="hero-sub" id="cPendente">Nenhum saque pendente</div>
                            <button class="cart-hist-btn" id="btnHistorico">
                                ${this.svgClock()} HISTÓRICO
                            </button>
                        </div>

                        <!-- Mini stats -->
                        <div class="cart-mini-grid">
                            <div class="mbox">
                                <span class="mlbl">${this.svgSend()} TOTAL RECEBIDO</span>
                                <span class="val" id="cRecebido" style="color:var(--green);">R$ 0,00</span>
                            </div>
                            <div class="mbox">
                                <span class="mlbl" style="display:flex;align-items:center;gap:5px;">
                                    <img src="https://static.wixstatic.com/media/ac74b3_47887b03b957463eafa996b70580ec90~mv2.webp"
                                         style="width:16px;height:16px;object-fit:contain;flex-shrink:0;" alt="pix">
                                    TOTAL SACADO
                                </span>
                                <span class="val" id="cSacado" style="color:var(--muted);">R$ 0,00</span>
                            </div>
                        </div>

                        <!-- Aviso PIX inválido -->
                        <div id="cPixWarn" class="pix-warn" style="display:none;">
                            ${this.svgInfo()}
                            <span>Para solicitar saque, cadastre uma chave PIX do tipo <strong>CPF</strong> ou <strong>Celular</strong> na aba <strong>PERFIL</strong>. Chaves do tipo E-mail, CNPJ e Aleatória não são aceitas para saque.</span>
                        </div>

                        <!-- Formulário de saque -->
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

                    </div><!-- /cMain -->

                    <!-- ── Sub-view Histórico de movimentações ── -->
                    <div id="cHistPanel" class="hist-panel">
                        <button class="hist-back" id="btnHistBack">
                            ${this.svgBack()} VOLTAR
                        </button>
                        <div class="card">
                            <h3 class="raaj" style="font-size:.85rem;color:var(--muted);margin-bottom:12px;">HISTÓRICO DE MOVIMENTAÇÕES</h3>
                            <div id="cTxLista"><p style="text-align:center;color:var(--muted);font-size:.8rem;padding:20px 0;">Carregando...</p></div>
                        </div>
                    </div>

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
        // Garante que carteira abre sempre no painel principal
        if(id==='vC'){
            this.qs('#cMain').style.display = 'block';
            this.qs('#cHistPanel').classList.remove('on');
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
    }

    setToggle(g, activeId){
        const m=['tDi','tHo'], p=['t7d','t30d'], mes=['tMesAtual','tMesAnt'];
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

    _historicoDoMes(){
        const mesStr=this.mesSelecionado==='anterior'?this._mesStr(1):this._mesStr(0);
        const map={};
        this.historicoCompleto.filter(d=>d.data.startsWith(mesStr)).forEach(d=>{map[d.data]=d;});
        return this._allDaysOfMonth(mesStr).map(d=>map[d]||{data:d,diamantes:0,minutos:0});
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
        this.qs('#btnBackRank').addEventListener('click',()=>{this.navigate('vD');this.navActive('nD');this.loadDash();});
        this.qs('#btnBackAvisos').addEventListener('click',()=>{this.navigate('vD');this.navActive('nD');});
        this.qs('#btnMarkAllRead').addEventListener('click',()=>this._marcarTodosLidos());
        // Escuta o clique no sino do menu — navega para a view de avisos
        window.addEventListener('dmaior:avisos', this._avisosHandler);
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

        // Histórico: abrir sub-view
        this.qs('#btnHistorico').addEventListener('click',()=>{
            this.qs('#cMain').style.display = 'none';
            this.qs('#cHistPanel').classList.add('on');
            setTimeout(()=>{ if(this._sendHeight) this._sendHeight(); }, 100);
        });
        // Histórico: voltar ao painel principal
        this.qs('#btnHistBack').addEventListener('click',()=>{
            this.qs('#cHistPanel').classList.remove('on');
            this.qs('#cMain').style.display = 'block';
            setTimeout(()=>{ if(this._sendHeight) this._sendHeight(); }, 100);
        });

        const discBtn=this.qs('#discBtn'), discBody=this.qs('#discBody');
        if(discBtn&&discBody) discBtn.addEventListener('click',()=>{const o=discBody.classList.toggle('open');discBtn.classList.toggle('open',o);});

        this.qs('#tDi').addEventListener('click',()=>{this.chartMetrica='diamantes';this.setToggle('m','tDi');this.renderChart();});
        this.qs('#tHo').addEventListener('click',()=>{this.chartMetrica='horas';this.setToggle('m','tHo');this.renderChart();});
        this.qs('#t7d').addEventListener('click',()=>{this.chartPeriodo='semanal';this.setToggle('p','t7d');this.renderChart();});
        this.qs('#t30d').addEventListener('click',()=>{this.chartPeriodo='mensal';this.setToggle('p','t30d');this.renderChart();});
        this.qs('#tMesAtual').addEventListener('click',()=>{this.mesSelecionado='atual';this.setToggle('mes','tMesAtual');this.renderChart();this.renderHist();});
        this.qs('#tMesAnt').addEventListener('click',()=>{this.mesSelecionado='anterior';this.setToggle('mes','tMesAnt');this.renderChart();this.renderHist();});

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
                localStorage.setItem('agencia_auth','true');
                window.dispatchEvent(new CustomEvent('dmaior:auth',{detail:{logado:true,foto:data.foto_url||'',nome:data.nome||'',uid}}));
            } catch(e){}
            await this.loadDash();
            this.qs('#lPass').value='';
            this.navigate('vD');
            this.navActive('nD');
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
            const res=await fetch(`${this.apiUrl}/api/dashboard`,{
                method:'POST',
                headers:{'Content-Type':'application/json','Authorization':`Bearer ${this.sessionToken}`},
                body:JSON.stringify({uid:this.sessionUid})
            });
            if(res.status === 401){
                this._clearSession();
                this.navigate('vL');
                this.showAlert('#alL','Sua sessão expirou. Faça login novamente.');
                return;
            }
            if(!res.ok){ const e=await res.json(); throw new Error(e.erro||'Falha de integração.'); }
            const data=await res.json();
            const t=data.totais_mes||{}, p=data.perfil||{};
            const nomeExibir = t.nome_streamer || p.nome || localStorage.getItem('dm_nome') || 'Streamer DMaior';
            const fotoExibir = t.foto_url || localStorage.getItem('dm_foto') || '';
            this.qs('#dName').textContent = nomeExibir;
            this.qs('#dUid').textContent=`UID: ${this.sessionUid}`;
            if(fotoExibir) this.qs('#dAva').innerHTML=`<img src="${fotoExibir}"/>`;
            try {
                if(nomeExibir) localStorage.setItem('dm_nome', nomeExibir);
                if(fotoExibir) localStorage.setItem('dm_foto', fotoExibir);
            } catch(e) {}
            const usd=Number(t.dolar||0).toFixed(2);
            this.qs('#dUsd').textContent=`$ ${usd}`;
            this.qs('#dDiaLbl').textContent=`${Number(t.diamantes||0).toLocaleString('pt-BR')} diamantes`;
            this.qs('#dDia').textContent=Number(t.diamantes||0).toLocaleString('pt-BR');
            this.qs('#dHrTot').textContent=t.horas_totais||'00:00';
            this.qs('#dHrVid').textContent=t.horas_video||'00:00';
            this.qs('#dHrAud').textContent=t.horas_audio||'00:00';
            const hrD=this.h2dec(t.horas_totais);
            const pHr=Math.min((hrD/40)*100,100);
            this.qs('#dHrTxt').innerHTML=`${hrD.toFixed(1)}h <span style="font-size:.7rem;color:var(--muted);font-weight:normal">/ 40h</span>`;
            this.qs('#dHrPct').textContent=`${pHr.toFixed(0)}%`;
            this.qs('#pH').style.width=`${pHr}%`;
            const dias=Number(t.dias_validos||0);
            const pDia=Math.min((dias/20)*100,100);
            this.qs('#dDayTxt').innerHTML=`${dias} <span style="font-size:.7rem;color:var(--muted);font-weight:normal">/ 20 dias</span>`;
            this.qs('#dDayPct').textContent=`${pDia.toFixed(0)}%`;
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
            const hBody=this.qs('#hBody');
            if(hBody) hBody.innerHTML=`<tr><td colspan="4" style="text-align:center;color:var(--red);padding:20px;font-size:.8rem;">Erro ao carregar dados: ${e.message}</td></tr>`;
        }
        finally{ if(btn){ btn.disabled=false; btn.innerHTML=`<span>${this.svgRefresh()}</span> ATUALIZAR`; } }
    }

    // ── Gráfico ─────────────────────────────────────────────────────
    renderChart(){
        if(!window.Chart) return setTimeout(()=>this.renderChart(),500);
        const hist=this._historicoDoMes();
        if(!hist.length) return;
        // hist: newest-first. slice(0,7) = últimos 7 dias do mês. Reverse p/ exibir cronológico.
        const slice=(this.chartPeriodo==='semanal'?hist.slice(0,7):hist).slice().reverse();
        const labels=slice.map(d=>d.data.substring(5,10).replace('-','/'));
        const vals=this.chartMetrica==='diamantes'?slice.map(d=>d.diamantes):slice.map(d=>parseFloat((d.minutos/60).toFixed(2)));
        const ctx=this.qs('#pChart').getContext('2d');
        if(this.chartInstance) this.chartInstance.destroy();
        const cor=this.chartMetrica==='diamantes'?'#00d4d4':'#f0c040';
        const rgb=this.chartMetrica==='diamantes'?'0,212,212':'240,192,64';
        const grad=ctx.createLinearGradient(0,0,0,200);
        grad.addColorStop(0,`rgba(${rgb},.4)`); grad.addColorStop(1,`rgba(${rgb},0)`);
        this.chartInstance=new window.Chart(ctx,{type:'line',data:{labels,datasets:[{data:vals,borderColor:cor,backgroundColor:grad,borderWidth:2,pointBackgroundColor:'#fff',pointRadius:3,fill:true,tension:.4}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{grid:{display:false},ticks:{color:'#a0b8c8',font:{size:10}}},y:{grid:{color:'rgba(255,255,255,.05)'},ticks:{color:'#a0b8c8',font:{size:10}}}}}});
    }

    // ── Histórico ────────────────────────────────────────────────────
    renderHist(){
        const dows=['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
        const tb=this.qs('#hBody');
        const hist=this._historicoDoMes();
        if(!hist.length){ tb.innerHTML=`<tr><td colspan="4" style="text-align:center;color:var(--muted);padding:20px;font-size:.8rem;">Nenhum registro.</td></tr>`; return; }
        const validos=hist.filter(d=>d.minutos>=60).length;
        const totDia=hist.reduce((s,d)=>s+d.diamantes,0);
        this.qs('#hRes').textContent=`${validos} válidos • ${totDia.toLocaleString('pt-BR')} diamantes`;
        tb.innerHTML=hist.map(dia=>{
            const dt=new Date(dia.data+'T12:00:00');
            const dd=String(dt.getDate()).padStart(2,'0');
            const mm=String(dt.getMonth()+1).padStart(2,'0');
            const dow=dows[dt.getDay()];
            const h=Math.floor(dia.minutos/60), m=dia.minutos%60;
            const semLive=dia.minutos===0&&dia.diamantes===0;
            const ok=dia.minutos>=60;
            const badgeCls=semLive?'nok':ok?'ok':'nok';
            const badgeTxt=semLive?'Sem live':ok?'Válido':'Inválido';
            const horasStr=semLive?'—':`${h}h ${String(m).padStart(2,'0')}m`;
            const diamStr=semLive?'—':dia.diamantes.toLocaleString('pt-BR');
            return `<tr style="${semLive?'opacity:.45':''}"><td class="dc"><span class="dd">${dd}/${mm}</span><br><span class="dw">${dow}</span></td><td style="font-family:var(--dm-font-title,'Rajdhani',sans-serif);font-weight:700;color:${semLive?'var(--muted)':ok?'var(--cyan)':'var(--muted)'};">${horasStr}</td><td style="font-family:var(--dm-font-title,'Rajdhani',sans-serif);font-weight:700;">${diamStr}</td><td class="r"><span class="badge ${badgeCls}">${badgeTxt}</span></td></tr>`;
        }).join('');
    }

    // ── Carteira ─────────────────────────────────────────────────────
    async loadCarteira(){
        const btn=this.qs('#btnRefCart');
        if(btn){ btn.disabled=true; }

        // Sempre inicia no painel principal
        this.qs('#cMain').style.display = 'block';
        this.qs('#cHistPanel').classList.remove('on');

        try {
            const resCart = await fetch(`${this.apiUrl}/api/carteira?uid=${this.sessionUid}`, {
                headers: { 'Authorization': `Bearer ${this.sessionToken}` }
            });

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

            this.qs('#cPixWarn').style.display   = pixOk ? 'none' : 'flex';
            this.qs('#cSaqueForm').style.display = pixOk ? 'block' : 'none';

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

            // Transações (ficam na sub-view Histórico)
            const txs = cart.transacoes || [];
            if (!txs.length) {
                this.qs('#cTxLista').innerHTML = `<p style="text-align:center;color:var(--muted);font-size:.8rem;padding:20px 0;">Nenhuma movimentação ainda.</p>`;
            } else {
                const tipoLabel = {
                    credito:         '+ Crédito',
                    debito:          '− Débito',
                    saque_solicitado:'→ Saque Solicitado',
                    saque_aprovado:  '✓ Saque Aprovado',
                    saque_rejeitado: '✗ Saque Recusado',
                    premio_ranking:  '🏆 Prêmio Ranking',
                    estorno:         '↩ Estorno',
                };
                const isEntrada = t => ['credito','premio_ranking','estorno','saque_rejeitado'].includes(t);
                this.qs('#cTxLista').innerHTML = txs.map(tx => `
                    <div class="tx-row">
                        <div class="tx-icon ${isEntrada(tx.tipo)?'in':'out'}">
                            ${isEntrada(tx.tipo) ? this.svgDiamond() : this.svgSend()}
                        </div>
                        <div class="tx-info">
                            <div class="tx-tipo">${tipoLabel[tx.tipo]||tx.tipo}</div>
                            <div class="tx-desc">${tx.descricao||'—'}</div>
                        </div>
                        <div>
                            <div class="tx-val ${isEntrada(tx.tipo)?'in':'out'}">${isEntrada(tx.tipo)?'+':'−'} ${this.brl(tx.valor)}</div>
                            <div class="tx-data">${this.fdt(tx.criado_em)}</div>
                        </div>
                    </div>`).join('');
            }


        } catch(e) {
            this.qs('#cTxLista').innerHTML = `<p style="text-align:center;color:var(--red);font-size:.8rem;padding:20px 0;">${e.message}</p>`;
        } finally {
            if(btn) btn.disabled=false;
        }
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
            const res = await fetch(`${this.apiUrl}/api/carteira/saque`, {
                method: 'POST',
                headers: { 'Content-Type':'application/json', 'Authorization':`Bearer ${this.sessionToken}` },
                body: JSON.stringify({ uid: this.sessionUid, valor, pix_tipo: pixTipo, pix_chave: pixChave }),
            });
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
            const res=await fetch(`${this.apiUrl}/api/perfil/atualizar`,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${this.sessionToken}`},body:JSON.stringify({uid:this.sessionUid,nome:this.qs('#sName').value,whatsapp:this.qs('#sWpp').value,endereco:this.qs('#sAddr').value,pix_tipo:this.qs('#sPixTipo').value,pix_chave:this.qs('#sPixChave').value,nova_senha:nova})});
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
        // Sinaliza ao componente ranking que o acesso é autenticado via painel
        try { localStorage.setItem('agencia_auth', 'true'); } catch(e){}
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

            // Nav interno do componente removido — painel pai já tem menu
        }
        this.navigate('vImpulso');
        this.navActive('nImpulso');
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
                    const data   = c.criado_em ? this._fdt(c.criado_em) : '';
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
