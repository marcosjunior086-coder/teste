/* eslint-env browser */
class PoliticasPremium extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
        this.render();
        this.bindEvents();
    }

    render() {
        // Ícones SVG Minimalistas
        const SVG_ALERT = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f87171" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0;"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
        const SVG_CHECK = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4ade80" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0;"><polyline points="20 6 9 17 4 12"/></svg>`;
        const SVG_INFO  = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00d4d4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`;
        const SVG_STAR  = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f0c040" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0;"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>`;
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
                font-family: var(--dm-font-body,'Exo 2',sans-serif);
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
                width: 60px; height: 2px; background: linear-gradient(90deg, transparent, var(--gold), transparent);
            }
            .header-title { 
                font-family: var(--dm-font-title,'Rajdhani',sans-serif); 
                font-size: clamp(1rem, 3.5vw, 1.2rem); 
                font-weight: 700; text-transform: uppercase; 
                letter-spacing: 0.5px; margin-bottom: 2px; 
                text-shadow: 0 0 10px rgba(240,192,64,0.3); 
                color: var(--gold);
            }
            .header-sub { font-size: 0.7rem; color: var(--sub); margin-bottom: 10px; }

            /* ===== PLAYER DE ÁUDIO DISCRETO ===== */
            .audio-player {
                background: rgba(0, 0, 0, 0.4); border: 1px solid rgba(0, 212, 212, 0.2); border-radius: 20px;
                display: inline-flex; align-items: center; padding: 4px 10px 4px 4px; gap: 8px; margin: 0 auto; max-width: 180px; 
            }
            .audio-btn {
                background: var(--cyan); border: none; width: 24px; height: 24px; border-radius: 50%;
                display: flex; align-items: center; justify-content: center; cursor: pointer; transition: transform 0.2s; flex-shrink: 0;
            }
            .audio-btn:hover { transform: scale(1.05); }
            .audio-btn svg { fill: #000; }
            
            .audio-info { display: flex; flex-direction: column; align-items: flex-start; }
            .audio-label { font-family: var(--dm-font-title,'Rajdhani',sans-serif); font-size: 0.65rem; font-weight: 700; color: #fff; text-transform: uppercase; display: flex; align-items: center; gap: 4px; }
            .audio-time { font-size: 0.6rem; color: var(--cyan); font-variant-numeric: tabular-nums; }
            .progress-container { width: 80px; height: 2px; background: rgba(255, 255, 255, 0.1); border-radius: 2px; margin-top: 2px; overflow: hidden; position: relative; }
            .progress-bar { height: 100%; width: 0%; background: var(--cyan); border-radius: 2px; transition: width 0.1s linear; }

            /* ===== SISTEMA DE ABAS ===== */
            .tabs-nav {
                display: flex; gap: 5px; overflow-x: auto; scrollbar-width: none; padding-bottom: 2px; -webkit-tap-highlight-color: transparent;
            }
            .tabs-nav::-webkit-scrollbar { display: none; }
            .tab-btn {
                background: rgba(26, 26, 46, 0.7); border: 1px solid rgba(240, 192, 64, 0.2);
                color: var(--sub); padding: 8px; border-radius: 8px;
                font-family: var(--dm-font-title,'Rajdhani',sans-serif); font-size: 0.75rem; font-weight: 700;
                text-transform: uppercase; letter-spacing: 0.5px; cursor: pointer;
                white-space: nowrap; transition: all 0.2s ease; flex: 1; text-align: center; user-select: none;
            }
            .tab-btn:hover { background: rgba(240, 192, 64, 0.1); color: #fff; }
            .tab-btn.active { background: var(--gold); color: #000; border-color: var(--gold); }
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
                display: flex; align-items: center; gap: 6px; font-family: var(--dm-font-title,'Rajdhani',sans-serif);
                font-size: 0.95rem; font-weight: 700; color: var(--gold); text-transform: uppercase;
                border-bottom: 1px solid rgba(240,192,64,0.15); padding-bottom: 6px; margin-bottom: 10px;
            }
            
            .text-block { margin-bottom: 10px; }
            .text-block h4 { font-size: 0.8rem; color: var(--text); margin-bottom: 4px; }
            .text-block p { font-size: 0.75rem; color: var(--sub); line-height: 1.4; margin-bottom: 6px; }
            .text-block ul { list-style: none; padding-left: 5px; margin-bottom: 6px; }
            .text-block ul li { font-size: 0.75rem; color: var(--sub); line-height: 1.4; position: relative; padding-left: 12px; margin-bottom: 4px; }
            .text-block ul li::before { content: '•'; color: var(--gold); position: absolute; left: 0; font-size: 1rem; line-height: 1.2; }
            
            .highlight { color: var(--gold); font-weight: 700; }
            .highlight-cyan { color: var(--cyan); font-weight: 700; }

            /* ===== ESTILO DE TABELAS COMPACTAS (SEM SCROLL) ===== */
            table { width: 100%; border-collapse: collapse; table-layout: fixed; margin-bottom: 10px; }
            thead tr th {
                font-size: clamp(0.55rem, 2vw, 0.65rem); color: var(--sub); text-transform: uppercase; padding: 6px 2px;
                text-align: center; background: rgba(0,200,200,0.07); border-bottom: 1px solid rgba(0,230,230,0.18);
                word-wrap: break-word; line-height: 1.1; letter-spacing: -0.2px;
            }
            tbody tr { border-bottom: 1px solid rgba(255,255,255,0.045); transition: background 0.2s; }
            tbody tr:hover { background: rgba(0,220,220,0.05); }
            td { text-align: center; padding: 6px 2px; font-size: clamp(0.65rem, 2.5vw, 0.75rem); color: var(--cyan); vertical-align: middle; word-wrap: break-word; line-height: 1.2; }
            
            /* Tabela Padrão (3 colunas: Mês 1) */
            .t-mes1 th:nth-child(1) { width: 30%; }
            .t-mes1 th:nth-child(2) { width: 30%; }
            .t-mes1 th:nth-child(3) { width: 40%; }
            .t-mes1 td:nth-child(3) { color: var(--gold); font-weight: 700; }

            /* Tabela Padrão (4 colunas: Mês 2 e 3) */
            .t-mes2 th:nth-child(1) { width: 20%; }
            .t-mes2 th:nth-child(2) { width: 25%; }
            .t-mes2 th:nth-child(3) { width: 25%; }
            .t-mes2 th:nth-child(4) { width: 30%; }
            .t-mes2 td:nth-child(3) { color: var(--sub); font-weight: 600; }
            .t-mes2 td:nth-child(4) { color: var(--gold); font-weight: 700; }

            /* ===== LINHAS DE DEFINIÇÃO (CATEGORIA E DESCRIÇÃO) ===== */
            .def-row { display: flex; border-bottom: 1px solid rgba(255,255,255,0.045); transition: background 0.2s; }
            .def-row:last-child { border-bottom: none; }
            .def-row:hover { background: rgba(0, 220, 220, 0.04); }
            .def-cat {
                width: 28%; flex-shrink: 0; padding: 10px 6px; border-right: 1px solid rgba(0,230,230,0.12);
                font-weight: 700; color: var(--cyan); display: flex; align-items: center; justify-content: center;
                text-align: center; font-size: clamp(0.65rem, 2vw, 0.75rem); line-height: 1.2;
            }
            .def-desc {
                flex: 1; padding: 10px; font-size: clamp(0.68rem, 2vw, 0.75rem); color: var(--sub);
                line-height: 1.5; display: flex; flex-direction: column; gap: 4px;
            }
            .def-desc p { margin: 0; }

            /* ===== CAIXAS DE ALERTA ===== */
            .alert-grid { display: grid; grid-template-columns: 1fr; gap: 8px; margin-top: 10px; }
            .alert-box {
                background: rgba(248, 113, 113, 0.05); border: 1px solid rgba(248, 113, 113, 0.3);
                border-radius: 10px; padding: 10px; display: flex; gap: 8px; align-items: flex-start;
            }
            .alert-box.info { background: rgba(0, 212, 212, 0.05); border-color: rgba(0, 212, 212, 0.3); }
            .alert-text { font-size: 0.75rem; line-height: 1.3; color: #f87171; font-weight: 600; }
            .info .alert-text { color: var(--sub); font-weight: 400; }

            @media (max-width: 480px) {
                .tabs-nav { flex-wrap: wrap; }
                .tab-btn { flex: 1 1 calc(50% - 5px); font-size: 0.7rem; padding: 8px; }
                .def-cat { width: 32%; font-size: 0.65rem; }
            }
        </style>

        <div class="container">
            <div class="header-hero">
                <div class="header-title">Políticas Streamer Premium</div>
                <div class="header-sub">Regras oficiais, qualidade e bonificação Kwai</div>
                
                <audio id="audio-expl" src="https://static.wixstatic.com/mp3/ac74b3_0cc85b86fe3342b2b3907865e9e6e103.m4a" preload="metadata"></audio>
                <div class="audio-player">
                    <button class="audio-btn" id="btn-play">${SVG_PLAY}</button>
                    <div class="audio-info">
                        <div class="audio-label">${SVG_AUDIO} Ouça as Regras</div>
                        <div class="progress-container"><div class="progress-bar" id="progress-bar"></div></div>
                        <div class="audio-time" id="time-display">00:00 / 00:00</div>
                    </div>
                </div>
            </div>

            <div class="tabs-nav">
                <button class="tab-btn active" data-target="tab-metas">Metas e Bônus</button>
                <button class="tab-btn" data-target="tab-aval">Avaliação</button>
                <button class="tab-btn" data-target="tab-visual">Padrão Visual</button>
                <button class="tab-btn" data-target="tab-conteudo">Conteúdo</button>
            </div>

            <div class="tab-content active" id="tab-metas">
                <div class="content-box">
                    <div class="box-title">${SVG_STAR} Regra de Bonificação Premium</div>
                    <div class="text-block">
                        <p>Os <span class="highlight">Streamers Premium</span> poderão receber política fixa da plataforma por até 3 meses consecutivos. <strong>O bônus pode ser revogado a qualquer momento sem aviso prévio</strong> caso as metas e a qualidade não sejam cumpridas.</p>
                        <ul>
                            <li><span class="highlight-cyan">1º mês:</span> Recebe o bônus sem necessidade de meta mínima de diamantes.</li>
                            <li><span class="highlight-cyan">2º e 3º meses:</span> Para garantir o bônus, deve atingir pelo menos 30.000 diamantes.</li>
                        </ul>
                    </div>
                    <div class="alert-box info">
                        ${SVG_INFO}
                        <div class="alert-text">Se a meta não for alcançada no 2º e 3º mês, a chance continua até o 6º mês. Basta atingir 30.000 diamantes em qualquer mês para resgatar.</div>
                    </div>
                </div>

                <div class="content-box">
                    <div class="box-title">${SVG_CHECK} Tabelas de Bonificação</div>
                    <div class="text-block"><h4>Primeiro Mês (Sem meta de diamantes)</h4></div>
                    <table class="t-mes1">
                        <thead><tr><th>Dias</th><th>Horas</th><th>Bônus</th></tr></thead>
                        <tbody>
                            <tr><td>12</td><td>20 h</td><td>R$ 150</td></tr>
                            <tr><td>15</td><td>30 h</td><td>R$ 300</td></tr>
                            <tr><td>24</td><td>50 h</td><td>R$ 600</td></tr>
                            <tr><td>25</td><td>60 h</td><td>R$ 800</td></tr>
                        </tbody>
                    </table>

                    <div class="text-block" style="margin-top: 15px;"><h4>Segundo e Terceiro Mês</h4></div>
                    <table class="t-mes2">
                        <thead><tr><th>Dias</th><th>Horas</th><th>Diamantes</th><th>Bônus</th></tr></thead>
                        <tbody>
                            <tr><td>20</td><td>40 h</td><td>30 mil</td><td>R$ 500</td></tr>
                            <tr><td>24</td><td>50 h</td><td>30 mil</td><td>R$ 800</td></tr>
                            <tr><td>24</td><td>60 h</td><td>90 mil</td><td>R$ 1.000</td></tr>
                        </tbody>
                    </table>
                </div>

                <div class="content-box">
                    <div class="box-title">${SVG_ALERT} Inatividade e Desligamento</div>
                    <div class="text-block">
                        <p>Streamers que solicitarem desligamento da agência, ou que permanecerem inativos por mais de 10 dias no mês subsequente ao pagamento, serão excluídos dos cálculos.</p>
                    </div>
                    <div class="alert-box">
                        ${SVG_ALERT}
                        <div class="alert-text">Nesses casos, o streamer perde o direito de solicitar qualquer bônus Premium.</div>
                    </div>
                </div>
            </div>

            <div class="tab-content" id="tab-aval">
                <div class="content-box">
                    <div class="box-title">${SVG_STAR} Suporte de Tráfego</div>
                    <div class="text-block">
                        <ul>
                            <li>Whitelist de qualidade 1080P (operada toda sexta-feira).</li>
                            <li>Uma semana de suporte de tráfego direto da plataforma.</li>
                            <li>Selo exclusivo de Streamer Premium no perfil.</li>
                            <li>Chance para participar do evento Streamer Showtime (Evento de tráfego).</li>
                        </ul>
                    </div>
                </div>

                <div class="content-box">
                    <div class="box-title">${SVG_INFO} Critérios de Avaliação</div>
                    <div class="text-block">
                        <p>O streamer não pode ter sido contratado pela agência por mais de 30 dias. É obrigatório realizar 2 dias de live testes no Kwai (1h por cada live).</p>
                        <p><strong>Requisitos durante o teste:</strong></p>
                        <ul>
                            <li>Número de pessoas (ACU) igual ou maior que 6.</li>
                            <li>Receita de pelo menos 1.000 diamantes no total.</li>
                        </ul>
                    </div>
                </div>

                <div class="content-box">
                    <div class="box-title">${SVG_ALERT} Controle de Qualidade</div>
                    <div class="text-block">
                        <h4>1. Verificação Semanal:</h4>
                        <p>Revisão das lives. Conteúdo fora do padrão = 1 advertência. <strong>2 advertências no mesmo mês = remoção imediata.</strong></p>
                        
                        <h4>2. Participação Obrigatória:</h4>
                        <p>Presença nas atividades de suporte e treinamentos é exigida. <strong>Mais de 2 ausências = exclusão automática.</strong></p>

                        <h4>3. Avaliação Mensal:</h4>
                        <p>Quem não atingir o padrão não recebe o bônus e é removido da atividade. O cumprimento integral é obrigatório.</p>
                    </div>
                </div>
            </div>

            <div class="tab-content" id="tab-visual">
                <div class="content-box">
                    <div class="box-title">${SVG_ALERT} Práticas Proibidas</div>
                    <div class="text-block">
                        <p>Exceto em casos especiais autorizados, <strong>não será permitido:</strong></p>
                        <ul>
                            <li>Permanecer deitado durante a live.</li>
                            <li>Transmissões vazias, tela preta ou apenas áudio.</li>
                            <li>Lives sem interação com o público.</li>
                            <li>Duas pessoas no mesmo perfil ou troca de streamers.</li>
                            <li>Lives ao ar livre ou em movimento (caminhando).</li>
                        </ul>
                    </div>
                </div>

                <div class="content-box">
                    <div class="box-title">${SVG_CHECK} Definições Premium</div>
                    <div class="def-row">
                        <div class="def-cat">Aparência</div>
                        <div class="def-desc"><p>Uso de maquiagem, estilo e produção visual compatíveis com a personalidade, garantindo experiência atrativa.</p></div>
                    </div>
                    <div class="def-row">
                        <div class="def-cat">Ambiente</div>
                        <div class="def-desc"><p>Espaço organizado, limpo e bem decorado, alinhado ao tema da live, com atmosfera profissional.</p></div>
                    </div>
                    <div class="def-row">
                        <div class="def-cat">Câmera</div>
                        <div class="def-desc">
                            <p>Captura estável e nítida. Sem tremores. Para transmissões externas, é obrigatório uso de suporte (cabeçote/highlight).</p>
                        </div>
                    </div>
                    <div class="def-row">
                        <div class="def-cat">Iluminação</div>
                        <div class="def-desc">
                            <p>Padrão profissional, destacando o rosto de forma suave. Tons de pele devem ser realistas e em harmonia com o ambiente.</p>
                        </div>
                    </div>
                </div>
            </div>

            <div class="tab-content" id="tab-conteudo">
                <div class="content-box">
                    <div class="box-title">${SVG_INFO} Qualidade de Conteúdo</div>
                    
                    <div class="def-row">
                        <div class="def-cat">Canto e Música</div>
                        <div class="def-desc">
                            <p>Uso de equipamentos profissionais para clareza de som. Seleção de músicas de qualidade e performances envolventes.</p>
                        </div>
                    </div>
                    <div class="def-row">
                        <div class="def-cat">Dança</div>
                        <div class="def-desc">
                            <p>Apresentações com boa expressão corporal e forte senso de ritmo, transmitindo energia.</p>
                        </div>
                    </div>
                    <div class="def-row">
                        <div class="def-cat">Horóscopo</div>
                        <div class="def-desc">
                            <p>Leitura e interpretação profissional e responsável (Carreira, Amor, Família, Amizade, etc).</p>
                        </div>
                    </div>
                    <div class="def-row">
                        <div class="def-cat">Religião</div>
                        <div class="def-desc">
                            <p>Ambiente acolhedor e motivador. Música e orações respeitosas e contagiantes, estimulando a fé.</p>
                        </div>
                    </div>
                    <div class="def-row">
                        <div class="def-cat">ASMR</div>
                        <div class="def-desc">
                            <p>Controle de som especializado para experiência relaxante. Inclusão criativa de recursos táteis e sonoros.</p>
                        </div>
                    </div>
                    <div class="def-row">
                        <div class="def-cat">Conversa e Interação</div>
                        <div class="def-desc">
                            <p>Chat com temas claros (fofocas, hobbies). Streamer deve inovar o conteúdo constantemente.</p>
                            <p style="color: #f87171; font-weight: 600; margin-top: 4px;">* Proibido comportamento desrespeitoso, bullying, difamação ou conflitos.</p>
                        </div>
                    </div>
                </div>
            </div>

        </div>
        `;
        window.DMaiorPrefs?.bind(this.shadowRoot);
    }

    bindEvents() {
        const root = this.shadowRoot;
        
        // Controle de Abas
        const btns = root.querySelectorAll('.tab-btn');
        const contents = root.querySelectorAll('.tab-content');

        btns.forEach(btn => {
            btn.addEventListener('click', () => {
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

        // Tentar obter a duração assim que os metadados carregarem
        audio.addEventListener('loadedmetadata', () => {
            timeDisplay.textContent = `00:00 / ${formatTime(audio.duration)}`;
        });

        btnPlay.addEventListener('click', () => {
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
            const duration = audio.duration || 1; // Previne divisão por zero
            const progressPercent = (currentTime / duration) * 100;
            
            progressBar.style.width = `${progressPercent}%`;
            timeDisplay.textContent = `${formatTime(currentTime)} / ${formatTime(duration)}`;
        });

        audio.addEventListener('ended', () => {
            btnPlay.innerHTML = SVG_PLAY;
            isPlaying = false;
            progressBar.style.width = '0%';
            timeDisplay.textContent = `00:00 / ${formatTime(audio.duration)}`;
        });
    }
}
customElements.define('politicas-premium', PoliticasPremium);
