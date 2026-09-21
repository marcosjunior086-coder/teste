/* eslint-env browser */
// ============================================================
//  DMaior Agency — Custom Element: <regras-dmaior>
//  Aba "Regras e Diretrizes" do painel do streamer: regulamento da
//  campanha de livestream da plataforma (+ políticas da agência, quando
//  chegarem). Conteúdo estático, sem chamada de rede.
//  Exclusivo do painel do streamer logado (dmaior-app.js).
//
//  Renderiza no DOM normal (sem shadow) de propósito: herda as variáveis
//  de tema do painel (--text, --muted, --border, --glass, --gold, --red,
//  --cyan), que já trocam sozinhas nos 4 temas, e reaproveita a classe
//  .card do painel.
//
//  Pra adicionar uma seção nova (ex: políticas da agência): um item novo
//  em SECOES. As abas do topo aparecem sozinhas quando há mais de uma.
// ============================================================
(function () {
  const UPD = '<span class="rg-upd">Atualizado 2H2026</span>';

  // ── Regulamento da Campanha de Livestream 2H2026 (plataforma) ──────────
  const HTML_KWAI = `
    <div class="card rg-head">
      <span class="rg-kicker">Campanha de Livestream · 2H2026</span>
      <h2>Regulamento da Campanha de Livestream 2H2026</h2>
      <p>Versão consolidada — inclui as Atualizações de Políticas de Livestream 2H2026.</p>
      <p class="rg-legend">Os itens com o selo ${UPD} foram alterados nesta versão.</p>
    </div>

    <details class="card rg-sec" open>
      <summary><span class="rg-num">1</span>Elegibilidade para Agenciamento de Streamers</summary>
      <div class="rg-body">
        <div class="rg-crit">O nível do streamer deve ser <b>20 ou inferior</b>. ${UPD}</div>
        <div class="rg-ou">OU</div>
        <div class="rg-crit">O tempo total de transmissão não deve exceder <b>120 minutos nos últimos 90 dias</b>. ${UPD}</div>
        <p class="rg-prev"><b>Critério anterior, substituído:</b> nível 10 ou inferior; ou tempo total de transmissão não superior a 60 minutos nos últimos 30 dias.</p>
        <p>Streamers que possuam mais de uma conta poderão ser impedidos de agenciar novas contas criadas com o objetivo de participar da campanha, caso isso seja considerado uma tentativa de atender artificialmente aos requisitos acima.</p>
      </div>
    </details>

    <details class="card rg-sec" open>
      <summary><span class="rg-num">2</span>Regras Gerais para Streamers</summary>
      <div class="rg-body">

        <div class="rg-sev crit">
          <h3><span class="rg-num">2.1</span>Infração Extremamente Gravíssima</h3>
          <ul>
            <li>Não são permitidos lives com streamers menores de 14 anos e/ou com participação/feito de crianças.</li>
            <li>Espalhar obscenidade, pornografia, jogos de azar, violência, homicídio, terror, instigar ao crime, mutilação, maus-tratos a animais, itens proibidos como armas, facas, drogas, entre outros.</li>
            <li>Colocar em risco a própria segurança ou a segurança de outros.</li>
            <li>Fumar ou aparição de cigarro, bem como bebida alcoólica ou qualquer tipo de droga.</li>
            <li>Infringir as leis do Brasil ou colocar a nação em perigo.</li>
          </ul>
          <p class="rg-pen"><b>Penalidade:</b> a plataforma irá banir e/ou remover da campanha permanentemente as contas no Kwai. Há possibilidade de confisco de todas as receitas não liquidadas. As informações serão salvas e, caso necessário, a plataforma se reserva o direito de buscar punições legais.</p>
        </div>

        <div class="rg-sev grave">
          <h3><span class="rg-num">2.2</span>Infração Grave</h3>
          <ul>
            <li>Ameaçar, intimidar, assediar, insultar, caluniar hosts, agências, usuários e/ou a plataforma.</li>
            <li>Utilização de conteúdo de terceiros (transmissão de filmes, séries, etc.).</li>
            <li>Campanha política, palavras de baixo calão em excesso, etc.</li>
            <li>Solicitar pix ou pagamentos por vias que não sejam as presentes dentro do app.</li>
            <li>Outras violações não mencionadas que coloquem a plataforma em risco.</li>
          </ul>
          <p class="rg-pen"><b>Penalidade:</b> caso a violação seja constatada mais de uma vez (avaliado caso a caso), o streamer será removido da campanha de live.</p>
        </div>

        <div class="rg-sev mod">
          <h3><span class="rg-num">2.3</span>Infração Moderada</h3>
          <ul>
            <li>Lives gravadas (vídeo transmitido como se fosse live) são proibidas — a campanha é para conteúdo transmitido em tempo real.</li>
            <li>Outras violações não mencionadas que coloquem a plataforma em risco.</li>
          </ul>
          <p class="rg-pen"><b>Penalidade:</b> banimento de 7 dias na primeira constatação e remoção da campanha a partir da segunda.</p>
        </div>

        <div class="rg-note">
          <b>Todas as regras se aplicam ao streamer e ao ambiente ao seu redor.</b> Mesmo que não seja o streamer fumando ou bebendo, por exemplo, se outra pessoa aparecer fazendo isso ao fundo da live, o streamer será punido. Mantenha o ambiente organizado, limpo e com boa iluminação, em local tranquilo, para evitar punições e aumentar a qualidade do trabalho.
        </div>
      </div>
    </details>

    <div class="card rg-final">
      <h3>Considerações Finais</h3>
      <p>O Kwai reserva-se o direito de adaptar, modificar e decidir a aplicação das regras da plataforma conforme a necessidade da campanha de livestreaming, sem aviso prévio. Mantenha-se atualizado com este documento.</p>
    </div>`;

  const SECOES = [
    { id: 'kwai', rotulo: 'Campanha Kwai', html: HTML_KWAI },
    // { id: 'agencia', rotulo: 'Políticas da agência', html: HTML_AGENCIA },
  ];

  const CSS = `
    regras-dmaior{display:block;width:100%;}
    regras-dmaior .rg-wrap{max-width:820px;margin:0 auto;width:100%;color:var(--text);font-size:.86rem;line-height:1.65;}
    regras-dmaior .rg-title{font-family:var(--dm-font-title,'Rajdhani',sans-serif);font-size:1.3rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--text);margin:0 0 4px;}
    regras-dmaior .rg-sub{font-size:.8rem;color:var(--muted);margin:0 0 16px;line-height:1.5;}
    regras-dmaior .rg-tabs{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px;}
    regras-dmaior .rg-tab{background:transparent;border:1px solid var(--border);color:var(--muted);padding:7px 16px;border-radius:999px;font-family:var(--dm-font-title,'Rajdhani',sans-serif);font-weight:700;font-size:.8rem;text-transform:uppercase;letter-spacing:.04em;cursor:pointer;transition:.2s;}
    regras-dmaior .rg-tab.on{background:var(--cyan-d);border-color:var(--cyan);color:var(--cyan);}
    regras-dmaior p{margin:0 0 10px;}
    regras-dmaior p:last-child{margin-bottom:0;}
    regras-dmaior b{font-weight:700;}

    /* Cabeçalho do documento */
    regras-dmaior .rg-head h2{font-family:var(--dm-font-title,'Rajdhani',sans-serif);font-size:1.15rem;font-weight:700;line-height:1.3;margin:6px 0 8px;color:var(--text);}
    regras-dmaior .rg-head p{color:var(--muted);}
    regras-dmaior .rg-kicker{font-family:var(--dm-font-title,'Rajdhani',sans-serif);font-size:.66rem;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--cyan);}
    regras-dmaior .rg-legend{font-size:.78rem;margin-top:10px;}

    /* Selo de item alterado nesta versão */
    regras-dmaior .rg-upd{display:inline-block;font-family:var(--dm-font-title,'Rajdhani',sans-serif);font-size:.58rem;font-weight:700;letter-spacing:.04em;text-transform:uppercase;padding:2px 8px;border-radius:999px;border:1px solid var(--gold);color:var(--gold);white-space:nowrap;vertical-align:middle;margin-left:4px;line-height:1.4;}

    /* Seções recolhíveis (todas abertas por padrão) */
    regras-dmaior .rg-sec>summary{list-style:none;cursor:pointer;display:flex;align-items:center;gap:10px;font-family:var(--dm-font-title,'Rajdhani',sans-serif);font-size:.98rem;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:var(--text);}
    regras-dmaior .rg-sec>summary::-webkit-details-marker{display:none;}
    regras-dmaior .rg-sec>summary::after{content:'';margin-left:auto;flex:none;width:8px;height:8px;border-right:2px solid var(--muted);border-bottom:2px solid var(--muted);transform:rotate(45deg);transition:transform .2s;}
    regras-dmaior .rg-sec[open]>summary::after{transform:rotate(-135deg);}
    regras-dmaior .rg-body{margin-top:14px;}
    regras-dmaior .rg-num{flex:none;display:inline-block;min-width:26px;text-align:center;font-size:.74rem;padding:1px 8px;border-radius:999px;background:var(--cyan-d);color:var(--cyan);}

    /* 1. Elegibilidade */
    regras-dmaior .rg-crit{border:1px solid var(--border);border-radius:14px;padding:12px 14px;}
    regras-dmaior .rg-ou{text-align:center;font-family:var(--dm-font-title,'Rajdhani',sans-serif);font-weight:700;font-size:.72rem;letter-spacing:.14em;color:var(--muted);margin:8px 0;}
    regras-dmaior .rg-prev{font-size:.78rem;color:var(--muted);line-height:1.55;margin:14px 0;padding-left:12px;border-left:2px solid var(--border);}

    /* 2. Infrações por gravidade */
    regras-dmaior .rg-sev{--sev:var(--cyan);border:1px solid var(--border);border-left:4px solid var(--sev);border-radius:14px;padding:14px 16px;margin-bottom:14px;}
    regras-dmaior .rg-sev.crit{--sev:var(--red);}
    regras-dmaior .rg-sev.grave{--sev:var(--gold);}
    regras-dmaior .rg-sev h3{display:flex;align-items:center;gap:8px;font-family:var(--dm-font-title,'Rajdhani',sans-serif);font-size:.92rem;font-weight:700;text-transform:uppercase;letter-spacing:.03em;color:var(--sev);margin:0 0 10px;}
    regras-dmaior .rg-sev .rg-num{background:transparent;border:1px solid var(--sev);color:var(--sev);}
    regras-dmaior .rg-sev ul{margin:0 0 12px;padding-left:18px;}
    regras-dmaior .rg-sev li{margin-bottom:6px;}
    regras-dmaior .rg-sev li::marker{color:var(--sev);}
    regras-dmaior .rg-pen{background:rgba(127,127,127,.09);border-radius:10px;padding:10px 12px;font-size:.82rem;line-height:1.55;}
    regras-dmaior .rg-pen b{color:var(--sev);}
    regras-dmaior .rg-note{border:1px solid var(--gold);border-radius:14px;padding:12px 14px;}
    regras-dmaior .rg-note b{color:var(--gold);}

    /* Considerações finais */
    regras-dmaior .rg-final h3{font-family:var(--dm-font-title,'Rajdhani',sans-serif);font-size:.98rem;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:var(--text);margin:0 0 8px;}
    regras-dmaior .rg-final p{color:var(--muted);}
  `;

  class RegrasDmaior extends HTMLElement {
    connectedCallback() {
      if (this._iniciado) return;
      this._iniciado = true;
      this._ativa = SECOES[0].id;
      this._render();
    }

    _render() {
      const sec = SECOES.find(s => s.id === this._ativa) || SECOES[0];
      const abas = SECOES.length > 1
        ? `<div class="rg-tabs" role="tablist">${SECOES.map(s =>
            `<button type="button" role="tab" class="rg-tab${s.id === sec.id ? ' on' : ''}" data-id="${s.id}" aria-selected="${s.id === sec.id}">${s.rotulo}</button>`
          ).join('')}</div>`
        : '';
      this.innerHTML = `
        <style>${CSS}</style>
        <div class="rg-wrap">
          <h1 class="rg-title">Regras e Diretrizes</h1>
          <p class="rg-sub">Regulamento e diretrizes para streamers. Mantenha-se atualizado.</p>
          ${abas}
          ${sec.html}
        </div>`;
      this.querySelectorAll('.rg-tab').forEach(b => {
        b.addEventListener('click', () => { this._ativa = b.dataset.id; this._render(); });
      });
    }
  }

  if (!customElements.get('regras-dmaior')) customElements.define('regras-dmaior', RegrasDmaior);
})();
