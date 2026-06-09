/* eslint-env browser */
class PoliticasHost extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
        this.render();
        this.bindEvents();
    }

    // Função de áudio para o clique (Web Audio API)
    playClickSound() {
        try {
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();

            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(650, audioCtx.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(150, audioCtx.currentTime + 0.1);

            gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);

            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);

            oscillator.start();
            oscillator.stop(audioCtx.currentTime + 0.1);
        } catch (e) {
            console.log("AudioContext não suportado.");
        }
    }

    render() {
        // Ícones SVG Minimalistas com tamanho fixo para não quebrarem o layout
        const SVG_ALERT = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f87171" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0;"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
        const SVG_CHECK = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4ade80" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0;"><polyline points="20 6 9 17 4 12"/></svg>`;
        const SVG_INFO  = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00d4d4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`;
        const SVG_PLAY  = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`;
        const SVG_PAUSE = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>`;
        const SVG_AUDIO = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#00d4d4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0;"><path d="M3 18v-6a9 9 0 0 1 18 0v6"></path><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"></path></svg>`;

        this.shadowRoot.innerHTML = `
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;700&family=Exo+2:wght@400;600;700&display=swap');
            
            * { box-sizing: border-box; margin: 0; padding: 0; }
            
            :host {
                display: block;
                /* Mapeia vars locais para as globais — muda automaticamente com o tema */
                --bg-grad:  var(--dm-grad-card);
                --cyan:     var(--dm-cyan);
                --gold:     var(--dm-gold);
                --text:     var(--dm-text);
                --sub:      var(--dm-text-sub);
                --border:   var(--dm-border);
                width: 100%;
                font-family: 'Exo 2', sans-serif;
                color: var(--text);
            }

            .container {
                width: 100%;
                max-width: 600px; 
                margin: 0 auto;
                padding: 10px 5px;
                display: flex;
                flex-direction: column;
                gap: 12px;
            }

            /* ===== CABEÇALHO COMPACTO ===== */
            .header-hero {
                text-align: center;
                padding: 14px 10px;
                background: var(--bg-grad);
                border: 1px solid var(--border);
                border-radius: 16px;
                box-shadow: 0 4px 15px rgba(0,0,0,0.5);
                position: relative;
                overflow: hidden;
            }
            .header-hero::after {
                content: ''; position: absolute; bottom: 0; left: 50%; transform: translateX(-50%);
                width: 60px; height: 2px; background: linear-gradient(90deg, transparent, var(--cyan), transparent);
            }
            .header-title { 
                font-family: 'Rajdhani', sans-serif; 
                font-size: clamp(1rem, 3.5vw, 1.2rem); 
                font-weight: 700; text-transform: uppercase; 
                letter-spacing: 0.5px; margin-bottom: 2px; 
                text-shadow: 0 0 10px rgba(0,212,212,0.3); 
            }
            .header-sub { font-size: 0.7rem; color: var(--sub); margin-bottom: 10px; }

            /* ===== PLAYER DE ÁUDIO DISCRETO ===== */
            .audio-player {
                background: rgba(0, 0, 0, 0.4);
                border: 1px solid rgba(0, 212, 212, 0.2);
                border-radius: 20px;
                display: inline-flex;
                align-items: center;
                padding: 4px 10px 4px 4px;
                gap: 8px;
                margin: 0 auto;
                max-width: 180px; 
            }
            .audio-btn {
                background: var(--cyan); border: none; width: 24px; height: 24px;
                border-radius: 50%; display: flex; align-items: center; justify-content: center;
                cursor: pointer; transition: transform 0.2s; flex-shrink: 0;
            }
            .audio-btn:hover { transform: scale(1.05); }
            .audio-btn svg { fill: #000; }
            
            .audio-info { display: flex; flex-direction: column; align-items: flex-start; }
            .audio-label { font-family: 'Rajdhani', sans-serif; font-size: 0.65rem; font-weight: 700; color: #fff; text-transform: uppercase; display: flex; align-items: center; gap: 4px; }
            .audio-time { font-size: 0.6rem; color: var(--cyan); font-variant-numeric: tabular-nums; }
            .progress-container { width: 80px; height: 2px; background: rgba(255, 255, 255, 0.1); border-radius: 2px; margin-top: 2px; overflow: hidden; position: relative; }
            .progress-bar { height: 100%; width: 0%; background: var(--cyan); border-radius: 2px; transition: width 0.1s linear; }

            /* ===== SISTEMA DE ABAS ===== */
            .tabs-nav {
                display: flex; gap: 5px; overflow-x: auto; scrollbar-width: none; padding-bottom: 2px;
                -webkit-tap-highlight-color: transparent;
            }
            .tabs-nav::-webkit-scrollbar { display: none; }
            .tab-btn {
                background: rgba(26, 26, 46, 0.7); border: 1px solid rgba(0, 212, 212, 0.2);
                color: var(--sub); padding: 8px; border-radius: 8px;
                font-family: 'Rajdhani', sans-serif; font-size: 0.75rem; font-weight: 700;
                text-transform: uppercase; letter-spacing: 0.5px; cursor: pointer;
                white-space: nowrap; transition: all 0.2s ease; flex: 1; text-align: center;
                user-select: none;
            }
            .tab-btn:hover { background: rgba(0, 212, 212, 0.1); color: #fff; }
            .tab-btn.active { background: var(--cyan); color: #000; border-color: var(--cyan); }
            .tab-btn:active { transform: scale(0.95); }

            .tab-content { display: none; animation: fadeIn 0.3s ease; flex-direction: column; gap: 10px; }
            .tab-content.active { display: flex; }
            @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }

            /* ===== CAIXAS DE TEXTO ===== */
            .content-box {
                background: var(--bg-grad); border: 1px solid var(--border); border-radius: 14px;
                padding: 14px 10px; box-shadow: 0 4px 15px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05);
            }
            .box-title {
                display: flex; align-items: center; gap: 6px; font-family: 'Rajdhani', sans-serif;
                font-size: 0.95rem; font-weight: 700; color: var(--cyan); text-transform: uppercase;
                border-bottom: 1px solid rgba(0,212,212,0.15); padding-bottom: 6px; margin-bottom: 10px;
            }
            .box-title img { height: 20px; width: auto; object-fit: contain; }
            
            .text-block { margin-bottom: 10px; }
            .text-block h4 { font-size: 0.8rem; color: var(--text); margin-bottom: 4px; }
            .text-block p { font-size: 0.75rem; color: var(--sub); line-height: 1.4; margin-bottom: 4px; }
            .text-block ul { list-style: none; padding-left: 5px; margin-bottom: 6px; }
            .text-block ul li { font-size: 0.75rem; color: var(--sub); line-height: 1.4; position: relative; padding-left: 12px; margin-bottom: 4px; }
            .text-block ul li::before { content: '•'; color: var(--cyan); position: absolute; left: 0; font-size: 1rem; line-height: 1.2; }
            
            .highlight { color: var(--gold); font-weight: 700; }
            .highlight-cyan { color: var(--cyan); font-weight: 700; }

            /* ===== ESTILO DE TABELAS (ESPREMIDAS, SEM SCROLL) ===== */
            table { width: 100%; border-collapse: collapse; table-layout: fixed; }
            thead tr th {
                font-size: clamp(0.55rem, 2vw, 0.65rem); color: var(--sub); text-transform: uppercase; padding: 6px 2px;
                text-align: center; background: rgba(0,200,200,0.07); border-bottom: 1px solid rgba(0,230,230,0.18);
                word-wrap: break-word; line-height: 1.1; letter-spacing: -0.2px;
            }
            tbody tr { border-bottom: 1px solid rgba(255,255,255,0.045); transition: background 0.2s; }
            tbody tr:hover { background: rgba(0,220,220,0.05); }
            td { 
                text-align: center; padding: 6px 2px; font-size: clamp(0.65rem, 2.5vw, 0.75rem); 
                color: var(--cyan); vertical-align: middle; word-wrap: break-word; line-height: 1.2; 
            }
            
            /* Específicos Tabela Tarefas */
            .t-tarefas th:nth-child(1) { width: 12%; }
            .t-tarefas th:nth-child(2) { width: 28%; }
            .t-tarefas th:nth-child(3) { width: 20%; }
            .t-tarefas th:nth-child(4) { width: 20%; }
            .t-tarefas th:nth-child(5) { width: 20%; }

            .t-tarefas td:nth-child(1) { font-weight: 700; color: #fff; }
            .t-tarefas td:nth-child(2) { color: var(--cyan); font-weight: 600; }
            .t-tarefas td:nth-child(3) { color: var(--sub); }
            .t-tarefas td:nth-child(4) { color: var(--sub); }
            .t-tarefas td:nth-child(5) { font-weight: 700; color: var(--gold); }

            /* Específicos Tabela Regras de Horas */
            .t-horas th:nth-child(1) { width: 40%; }
            .t-horas th:nth-child(2) { width: 30%; }
            .t-horas th:nth-child(3) { width: 15%; }
            .t-horas th:nth-child(4) { width: 15%; }

            .t-horas td.cat { font-weight: 700; color: #fff; border-right: 1px solid rgba(0,230,230,0.12); }
            .t-horas td.sub { color: var(--sub); font-weight: 600; font-size: 0.65rem; }
            .t-horas td.sub-full { color: var(--cyan); font-weight: 700; text-transform: uppercase; font-size: 0.65rem; }
            .t-horas td.val { font-weight: 700; color: var(--gold); font-size: 0.75rem; }
            .t-horas tr.inner td { border-top: 1px solid rgba(0,230,230,0.08); }

            /* ===== CAIXAS DE ALERTA ===== */
            .alert-grid { display: grid; grid-template-columns: 1fr; gap: 8px; margin-top: 10px; }
            .alert-box {
                background: rgba(248, 113, 113, 0.05); border: 1px solid rgba(248, 113, 113, 0.3);
                border-radius: 10px; padding: 10px; display: flex; gap: 8px; align-items: flex-start;
            }
            .alert-box.info { background: rgba(0, 212, 212, 0.05); border-color: rgba(0, 212, 212, 0.3); }
            .alert-box.col-info { flex-direction: column; gap: 4px; }
            .alert-text { font-size: 0.75rem; line-height: 1.3; color: #f87171; font-weight: 600; }
            .info .alert-text { color: var(--sub); font-weight: 400; }

            @media (max-width: 480px) {
                .tabs-nav { flex-wrap: wrap; }
                .tab-btn { flex: 1 1 calc(50% - 5px); font-size: 0.7rem; padding: 8px; }
            }
        </style>

        <div class="container">
            <div class="header-hero">
                <div class="header-title">Pagamentos e Políticas Kwai</div>
                <div class="header-sub">Guia completo de classificação, metas e faturamento</div>
                
                <audio id="audio-expl" src="https://static.wixstatic.com/mp3/ac74b3_0e9da4decf264f29b42cbee055f8e932.m4a" preload="metadata"></audio>
                <div class="audio-player">
                    <button class="audio-btn" id="btn-play">${SVG_PLAY}</button>
                    <div class="audio-info">
                        <div class="audio-label">${SVG_AUDIO} Ouça a Explicação</div>
                        <div class="progress-container"><div class="progress-bar" id="progress-bar"></div></div>
                        <div class="audio-time" id="time-display">00:00 / 09:11</div>
                    </div>
                </div>
            </div>

            <div class="tabs-nav">
                <button class="tab-btn active" data-target="tab-regras">Regras e Metas</button>
                <button class="tab-btn" data-target="tab-novos">Novos Streamers</button>
                <button class="tab-btn" data-target="tab-cresc">Em Crescimento</button>
                <button class="tab-btn" data-target="tab-pro">Streamer PRO</button>
            </div>

            <div class="tab-content active" id="tab-regras">
                <div class="content-box">
                    <div class="box-title">${SVG_INFO} Classificação</div>
                    <div class="text-block">
                        <ul>
                            <li><span class="highlight-cyan">Novo Streamer:</span> Entrou na agência nos últimos 3 meses e tem Baseline ≤ 150.000 diamantes. Pode manter o status por até 6 meses se for "Alto Potencial".</li>
                            <li><span class="highlight-cyan">Em Crescimento:</span> Não é Novo Streamer e tem Baseline < 60.000 diamantes.</li>
                            <li><span class="highlight-cyan">Streamer Pro:</span> Não é Novo Streamer e tem Baseline ≥ 60.000 diamantes.</li>
                        </ul>
                    </div>
                </div>

                <div class="content-box">
                    <div class="box-title">${SVG_CHECK} Meta Dias e Horas</div>
                    <table class="t-horas">
                        <thead>
                            <tr>
                                <th colspan="2">Categoria / Mês</th>
                                <th>Dias</th>
                                <th>Horas</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td class="cat" rowspan="2">Novo Streamer</td>
                                <td class="sub">1º mês</td>
                                <td class="val">7</td>
                                <td class="val">15 H</td>
                            </tr>
                            <tr class="inner">
                                <td class="sub">2º e 3º mês</td>
                                <td class="val">20</td>
                                <td class="val">40 H</td>
                            </tr>
                            <tr class="inner">
                                <td class="sub-full" colspan="2">Crescimento e PRO</td>
                                <td class="val">20</td>
                                <td class="val">40 H</td>
                            </tr>
                        </tbody>
                    </table>
                    
                    <div class="alert-grid">
                        <div class="alert-box info">
                            ${SVG_INFO}
                            <div class="alert-text"><strong>Dia =</strong> 1 hr transmissão.<br><strong>Ativo =</strong> Cumpre dias, horas e diamantes.</div>
                        </div>
                        <div class="alert-box info">
                            ${SVG_CHECK}
                            <div class="alert-text"><strong>Sugerido:</strong> 23 dias + 60 horas para Crescimento e PRO.</div>
                        </div>
                    </div>
                </div>

                <div class="content-box">
                    <div class="box-title">${SVG_ALERT} Práticas Proibidas</div>
                    <div class="text-block">
                        <h4>Avaliação Vídeo/Áudio:</h4>
                        <p>Plataforma exige engajamento, retenção (+5min) e satisfação. Evite apenas áudio se puder fazer vídeo.</p>
                    </div>
                    <div class="alert-box">
                        ${SVG_ALERT}
                        <div class="alert-text">
                            <strong>Remoção da campanha:</strong> Fraude, tela preta, sem interação verbal, baixa retenção (saem em 1 min).
                        </div>
                    </div>
                </div>
            </div>

            <div class="tab-content" id="tab-novos">
                <div class="content-box">
                    <div class="box-title">
                        <img src="https://static.wixstatic.com/media/ac74b3_7a0f84632cbe42169e17d7d60bd550a2~mv2.png/v1/crop/x_0,y_13,w_1146,h_1331/fill/w_68,h_79,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/melhada%20bronze_edited.png" alt="Bronze">
                        Novos Streamers
                    </div>
                    <div class="text-block"><p>Pagamento em Koins. <strong>100 koins = 1 USD</strong>.</p></div>
                    <table class="t-tarefas">
                        <thead>
                            <tr><th>Tar</th><th>Diam.</th><th>Conv(U$)</th><th>Bônus(U$)</th><th>Total</th></tr>
                        </thead>
                        <tbody>
                            <tr><td>1</td><td>1.000</td><td>5</td><td>2</td><td>7</td></tr>
                            <tr><td>2</td><td>2.500</td><td>12</td><td>5</td><td>17</td></tr>
                            <tr><td>3</td><td>4.500</td><td>22,5</td><td>9</td><td>31,5</td></tr>
                            <tr><td>4</td><td>7.000</td><td>35</td><td>14</td><td>49</td></tr>
                            <tr><td>5</td><td>10.000</td><td>50</td><td>20</td><td>70</td></tr>
                            <tr><td>6</td><td>13.500</td><td>67,5</td><td>27</td><td>94,5</td></tr>
                            <tr><td>7</td><td>17.500</td><td>85</td><td>35</td><td>120</td></tr>
                            <tr><td>8</td><td>22.000</td><td>110</td><td>44</td><td>154</td></tr>
                            <tr><td>9</td><td>27.000</td><td>135</td><td>54</td><td>189</td></tr>
                            <tr><td>10</td><td>32.500</td><td>162,5</td><td>65</td><td>227,5</td></tr>
                            <tr><td>11</td><td>38.500</td><td>192,5</td><td>77</td><td>269,5</td></tr>
                            <tr><td>12</td><td>45.000</td><td>225</td><td>90</td><td>315</td></tr>
                            <tr><td>13</td><td>52.000</td><td>260</td><td>104</td><td>364</td></tr>
                            <tr><td>14</td><td>60.000</td><td>300</td><td>120</td><td>420</td></tr>
                            <tr><td>15</td><td>70.000</td><td>350</td><td>140</td><td>490</td></tr>
                            <tr><td>16</td><td>80.000</td><td>400</td><td>160</td><td>560</td></tr>
                            <tr><td>17</td><td>100.000</td><td>500</td><td>200</td><td>700</td></tr>
                            <tr><td>18</td><td>150.000</td><td>750</td><td>300</td><td>1.050</td></tr>
                            <tr><td>19</td><td>200.000</td><td>1.000</td><td>400</td><td>1.400</td></tr>
                            <tr><td>20</td><td>300.000</td><td>1.500</td><td>600</td><td>2.100</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="tab-content" id="tab-cresc">
                <div class="content-box">
                    <div class="box-title">
                        <img src="https://static.wixstatic.com/media/ac74b3_bf3a48256e3b4bd3ab1f8e187e7baaf0~mv2.png/v1/crop/x_30,y_0,w_1133,h_1316/fill/w_68,h_79,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/medalha%20ouro_edited.png" alt="Ouro">
                        Em Crescimento
                    </div>
                    <table class="t-tarefas">
                        <thead>
                            <tr><th>Tar</th><th>Diam.</th><th>Conv(U$)</th><th>Bônus(U$)</th><th>Total</th></tr>
                        </thead>
                        <tbody>
                            <tr><td>1</td><td>1.000</td><td>5</td><td>2</td><td>7</td></tr>
                            <tr><td>2</td><td>2.500</td><td>12</td><td>3</td><td>15</td></tr>
                            <tr><td>3</td><td>4.500</td><td>22,5</td><td>7</td><td>29,5</td></tr>
                            <tr><td>4</td><td>7.000</td><td>35</td><td>12</td><td>47</td></tr>
                            <tr><td>5</td><td>10.000</td><td>50</td><td>18</td><td>68</td></tr>
                            <tr><td>6</td><td>13.500</td><td>67,5</td><td>25</td><td>92,5</td></tr>
                            <tr><td>7</td><td>17.500</td><td>85</td><td>33</td><td>118</td></tr>
                            <tr><td>8</td><td>22.000</td><td>110</td><td>42</td><td>152</td></tr>
                            <tr><td>9</td><td>27.000</td><td>135</td><td>52</td><td>187</td></tr>
                            <tr><td>10</td><td>32.500</td><td>162,5</td><td>63</td><td>225,5</td></tr>
                            <tr><td>11</td><td>38.500</td><td>192,5</td><td>75</td><td>267,5</td></tr>
                            <tr><td>12</td><td>45.000</td><td>225</td><td>88</td><td>313</td></tr>
                            <tr><td>13</td><td>52.000</td><td>260</td><td>102</td><td>362</td></tr>
                            <tr><td>14</td><td>60.000</td><td>300</td><td>118</td><td>418</td></tr>
                            <tr><td>15</td><td>70.000</td><td>350</td><td>138</td><td>488</td></tr>
                            <tr><td>16</td><td>80.000</td><td>400</td><td>160</td><td>560</td></tr>
                            <tr><td>17</td><td>100.000</td><td>500</td><td>190</td><td>690</td></tr>
                            <tr><td>18</td><td>150.000</td><td>750</td><td>230</td><td>980</td></tr>
                            <tr><td>19</td><td>200.000</td><td>1.000</td><td>280</td><td>1.280</td></tr>
                            <tr><td>20</td><td>300.000</td><td>1.500</td><td>340</td><td>1.840</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="tab-content" id="tab-pro">
                <div class="content-box">
                    <div class="box-title">
                        <img src="https://static.wixstatic.com/media/ac74b3_f0a3ffb2e43c462b909ace96f52522ad~mv2.png/v1/crop/x_0,y_4,w_1011,h_1175/fill/w_68,h_79,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/medalaha%20pro_edited.png" alt="Pro">
                        Streamer PRO
                    </div>
                    <table class="t-tarefas">
                        <thead>
                            <tr><th>Tar</th><th>Diam.</th><th>Conv(U$)</th><th>Bônus(U$)</th><th>Total</th></tr>
                        </thead>
                        <tbody>
                            <tr><td>1</td><td>10.000</td><td>50</td><td>20</td><td>70</td></tr>
                            <tr><td>2</td><td>25.000</td><td>125</td><td>45</td><td>170</td></tr>
                            <tr><td>3</td><td>40.000</td><td>200</td><td>72</td><td>272</td></tr>
                            <tr><td>4</td><td>60.000</td><td>300</td><td>102</td><td>402</td></tr>
                            <tr><td>5</td><td>72.000</td><td>360</td><td>122</td><td>482</td></tr>
                            <tr><td>6</td><td>86.000</td><td>430</td><td>146</td><td>576</td></tr>
                            <tr><td>7</td><td>102.000</td><td>510</td><td>172</td><td>682</td></tr>
                            <tr><td>8</td><td>120.000</td><td>600</td><td>200</td><td>800</td></tr>
                            <tr><td>9</td><td>140.000</td><td>700</td><td>230</td><td>930</td></tr>
                            <tr><td>10</td><td>165.000</td><td>825</td><td>262</td><td>1.087</td></tr>
                            <tr><td>11</td><td>195.000</td><td>975</td><td>295</td><td>1.270</td></tr>
                            <tr><td>12</td><td>230.000</td><td>1.150</td><td>330</td><td>1.480</td></tr>
                            <tr><td>13</td><td>270.000</td><td>1.350</td><td>370</td><td>1.720</td></tr>
                            <tr><td>14</td><td>315.000</td><td>1.575</td><td>415</td><td>1.990</td></tr>
                            <tr><td>15</td><td>365.000</td><td>1.825</td><td>465</td><td>2.290</td></tr>
                            <tr><td>16</td><td>420.000</td><td>2.100</td><td>520</td><td>2.620</td></tr>
                            <tr><td>17</td><td>480.000</td><td>2.400</td><td>580</td><td>2.920</td></tr>
                            <tr><td>18</td><td>550.000</td><td>2.750</td><td>650</td><td>3.400</td></tr>
                            <tr><td>19</td><td>630.000</td><td>3.150</td><td>730</td><td>3.880</td></tr>
                            <tr><td>20</td><td>710.000</td><td>3.550</td><td>810</td><td>4.360</td></tr>
                            <tr><td>21</td><td>800.000</td><td>4.000</td><td>900</td><td>4.900</td></tr>
                            <tr><td>22</td><td>900.000</td><td>4.500</td><td>1.000</td><td>5.600</td></tr>
                            <tr><td>23</td><td>1.000.000</td><td>5.000</td><td>1.100</td><td>6.100</td></tr>
                            <tr><td>24</td><td>1.100.000</td><td>5.500</td><td>1.200</td><td>6.700</td></tr>
                            <tr><td>25</td><td>1.200.000</td><td>6.000</td><td>1.300</td><td>7.300</td></tr>
                        </tbody>
                    </table>

                    <div class="box-title" style="margin-top:24px;">
                        <img src="https://static.wixstatic.com/media/ac74b3_f0a3ffb2e43c462b909ace96f52522ad~mv2.png/v1/crop/x_0,y_4,w_1011,h_1175/fill/w_68,h_79,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/medalaha%20pro_edited.png" alt="Pro">
                        Bônus Tarefa 2
                    </div>
                    <table class="t-horas" style="min-width: 100%; margin-bottom: 16px;">
                        <thead>
                            <tr><th style="width:20%">Nível</th><th style="width:50%">Crescimento</th><th style="width:30%">Bônus</th></tr>
                        </thead>
                        <tbody>
                            <tr><td class="cat">1</td><td class="sub">80% da Baseline</td><td class="val">2%</td></tr>
                            <tr><td class="cat">2</td><td class="sub">90% da Baseline</td><td class="val">3%</td></tr>
                            <tr><td class="cat">3</td><td class="sub">100% da Baseline</td><td class="val">4%</td></tr>
                            <tr><td class="cat">4</td><td class="sub">115% da Baseline</td><td class="val">4,5%</td></tr>
                            <tr><td class="cat">5</td><td class="sub">130% da Baseline</td><td class="val">5%</td></tr>
                        </tbody>
                    </table>

                    <div class="text-block" style="background: rgba(0,0,0,0.2); padding: 12px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.05);">
                        <div style="font-family: 'Rajdhani', sans-serif; font-size: 1rem; font-weight: 700; color: var(--cyan); text-transform: uppercase; margin-bottom: 8px; border-bottom: 1px solid rgba(0,212,212,0.15); padding-bottom: 4px;">
                            Cálculo da Baseline de Diamantes
                        </div>
                        
                        <h4>1. Média dos últimos 3 meses</h4>
                        <p>É a média de receita em diamantes dos meses anteriores.</p>
                        <div class="alert-box info col-info" style="margin-bottom: 12px;">
                            <span class="highlight-cyan" style="font-size: 0.7rem;">Exemplo:</span>
                            <span style="font-size: 0.7rem; color: #c0cfe0;">Mês 1: 120k | Mês 2: 120k | Mês 3: 120k</span>
                            <strong style="color: #fff; font-size: 0.7rem;">Baseline = (120k + 120k + 120k) ÷ 3 = 120k diamantes</strong>
                        </div>

                        <h4>2. Taxa de Crescimento</h4>
                        <p>A taxa mostra se o streamer superou ou não sua meta pessoal.</p>
                        <div class="alert-box info col-info" style="margin-bottom: 12px;">
                            <span class="highlight-cyan" style="font-size: 0.7rem;">Exemplo:</span>
                            <span style="font-size: 0.7rem; color: #c0cfe0;">Receita mês atual: 150k | Baseline: 120k</span>
                            <strong style="color: #fff; font-size: 0.7rem;">150k ÷ 120k = 1,25 → Crescimento de 125% no mês</strong>
                        </div>

                        <h4>3. Cálculo do Bônus</h4>
                        <p>O bônus é definido em % sobre a receita mensal quando a meta é batida. A baseline varia de streamer para streamer.</p>
                        <div class="alert-box info col-info" style="margin-bottom: 12px;">
                            <span class="highlight-cyan" style="font-size: 0.7rem;">Exemplo:</span>
                            <span style="font-size: 0.7rem; color: #c0cfe0;">Meta (baseline): 130k | Receita do mês: 150k</span>
                            <strong style="color: #fff; font-size: 0.7rem;">Crescimento: 150k ÷ 130k ≈ 1,15 → Alcançou 115% da meta.</strong>
                            <span style="font-size: 0.65rem; color: #c0cfe0; margin-top: 2px;">Para coletar todos os bônus, é necessário alcançar 130% (meta máxima).</span>
                            <strong style="color: var(--gold); font-size: 0.75rem; margin-top: 4px;">Bônus (4,5% sobre 150k): 6.750 Koins ÷ 100 = 67,5 U$</strong>
                        </div>

                        <h4>4. Pagamento</h4>
                        <p style="margin-bottom: 0;">O valor do bônus é pago em Koins diretamente na conta Kwai do streamer. A Baseline oficial será exibida pelo sistema. A plataforma tem direito à interpretação final.</p>
                    </div>
                </div>
            </div>
        </div>
        `;
    }

    bindEvents() {
        const root = this.shadowRoot;
        
        // Controle de Abas
        const btns = root.querySelectorAll('.tab-btn');
        const contents = root.querySelectorAll('.tab-content');

        btns.forEach(btn => {
            btn.addEventListener('click', () => {
                // Toca o som em toda troca de aba
                this.playClickSound();

                btns.forEach(b => b.classList.remove('active'));
                contents.forEach(c => c.classList.remove('active'));
                btn.classList.add('active');
                const target = root.getElementById(btn.dataset.target);
                if (target) target.classList.add('active');
            });
        });

        // Controle do Player de Áudio
        const audio = root.getElementById('audio-expl');
        const btnPlay = root.getElementById('btn-play');
        const progressBar = root.getElementById('progress-bar');
        const timeDisplay = root.getElementById('time-display');

        const SVG_PLAY  = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`;
        const SVG_PAUSE = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>`;

        let isPlaying = false;

        function formatTime(seconds) {
            if (isNaN(seconds)) return "00:00";
            const min = Math.floor(seconds / 60);
            const sec = Math.floor(seconds % 60);
            return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
        }

        btnPlay.addEventListener('click', () => {
            // Toca o som curto ao clicar no play/pause também
            this.playClickSound();

            if (isPlaying) {
                audio.pause();
                btnPlay.innerHTML = SVG_PLAY;
            } else {
                audio.play();
                btnPlay.innerHTML = SVG_PAUSE;
            }
            isPlaying = !isPlaying;
        });

        audio.addEventListener('timeupdate', () => {
            const currentTime = audio.currentTime;
            const duration = audio.duration || 551; // 09:11 = 551s
            const progressPercent = (currentTime / duration) * 100;
            
            progressBar.style.width = `${progressPercent}%`;
            timeDisplay.textContent = `${formatTime(currentTime)} / 09:11`;
        });

        audio.addEventListener('ended', () => {
            btnPlay.innerHTML = SVG_PLAY;
            isPlaying = false;
            progressBar.style.width = '0%';
            timeDisplay.textContent = '00:00 / 09:11';
        });
    }
}
customElements.define('politicas-host', PoliticasHost);