/* eslint-env browser */
// ============================================================
//  DMaior Agency — Custom Element: <regras-dmaior>
//  Aba "Regras e Diretrizes" do painel do streamer: regulamento da
//  campanha de livestream da plataforma + Termo de Cooperação da agência.
//  Conteúdo estático, sem chamada de rede.
//  Usado no painel do streamer (aba Regras) e no recrutamento.html (janela
//  "Ler" dos aceites, com secao="..." unica) — texto num lugar só.
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

  // ── Termo de Cooperação DMaior Agency (lido no painel e aceito no recrutamento) ──
  // Texto do PDF "Termos Dmaior Agency" (2026-09). Única adaptação: os campos
  // em branco (nome/CPF/endereço) e o bloco de assinatura viraram aceite
  // digital — o streamer é identificado pelo UID e pelos dados da candidatura,
  // e o aceite (data/hora + TERMO_AGENCIA_VERSAO) é gravado em `candidaturas`.
  // Mudou o texto? Troque a versão, pra dar pra saber quem aceitou qual.
  const TERMO_AGENCIA_VERSAO = '2026-09';
  const sec = (n, titulo, corpo) => `
    <details class="card rg-sec" open>
      <summary><span class="rg-num">${n}</span>${titulo}</summary>
      <div class="rg-body">${corpo}</div>
    </details>`;
  const HTML_AGENCIA = `
    <div class="card rg-head">
      <span class="rg-kicker">DMaior Agency · Versão 09/2026</span>
      <h2>Termo de Cooperação para Criador de Conteúdo (Streamer)</h2>
      <p><b>Partes.</b> De um lado, <b>DMaior Agency – Danilo Duarte</b>, inscrita no CNPJ sob o nº 64.207.221/0001-18, doravante denominada <b>AGÊNCIA</b>; e, de outro lado, o(a) criador(a) de conteúdo que aceita este Termo, identificado(a) pelo seu UID Kwai e pelos dados informados na candidatura, doravante denominado(a) <b>STREAMER</b>.</p>
      <p>As partes resolvem celebrar o presente TERMO DE COOPERAÇÃO, de natureza civil, regido pelas leis brasileiras, mediante as cláusulas e condições a seguir:</p>
    </div>
    ${sec(1, 'Objeto', `<p>O presente Termo tem por objeto a cooperação entre as partes para a criação, desenvolvimento e realização de transmissões ao vivo (“lives”) de conteúdo digital na plataforma Kwai, com foco em entretenimento e engajamento.</p>`)}
    ${sec(2, 'Natureza da relação e prazo', `
      <p><b>2.1.</b> O presente instrumento possui natureza estritamente civil e colaborativa, não configurando, em hipótese alguma:</p>
      <ul class="rg-lista"><li>a) Vínculo empregatício;</li><li>b) Relação de trabalho regida pela CLT;</li><li>c) Sociedade, associação ou representação comercial.</li></ul>
      <p><b>2.2.</b> O presente Termo é celebrado por prazo indeterminado, iniciando-se na data de sua aceitação e assinatura digital.</p>
      <p><b>2.3.</b> A rescisão poderá ser solicitada por qualquer das partes, mediante aviso prévio mínimo de 90 (noventa) dias, respeitando obrigatoriamente as diretrizes da plataforma Kwai.</p>
      <p><b>2.4.</b> Para fins de desligamento formal, será observado o critério da plataforma Kwai, consistente em 90 (noventa) dias de inatividade, sendo este o meio válido para liberação do vínculo dentro da plataforma.</p>
      <p><b>2.5.</b> Fica vedada qualquer tentativa de burlar as regras da plataforma, incluindo a criação de novas contas para evitar o cumprimento do prazo de inatividade.</p>`)}
    ${sec(3, 'Obrigações da agência', `
      <p>A AGÊNCIA poderá, a seu critério:</p>
      <ul class="rg-lista"><li>a) Oferecer suporte técnico e operacional;</li><li>b) Fornecer orientação estratégica para crescimento;</li><li>c) Compartilhar boas práticas e direcionamento de conteúdo;</li><li>d) Acompanhar o desempenho do STREAMER, sem garantia de resultados.</li></ul>`)}
    ${sec(4, 'Obrigações do streamer', `
      <p>O STREAMER compromete-se a:</p>
      <ul class="rg-lista"><li>a) Produzir conteúdo original, lícito e adequado às diretrizes da plataforma;</li><li>b) Cumprir integralmente as regras do Kwai;</li><li>c) Manter conduta ética e respeitosa;</li><li>d) Não prejudicar a imagem da AGÊNCIA;</li><li>e) Não utilizar práticas fraudulentas (contas falsas, manipulação de métricas, etc.).</li></ul>`)}
    ${sec(5, 'Uso de imagem e conteúdo', `<p>O STREAMER autoriza, de forma gratuita, o uso de sua imagem, nome e conteúdo para fins de divulgação, marketing e portfólio da AGÊNCIA durante a vigência deste Termo.</p>`)}
    ${sec(6, 'Confidencialidade', `<p>As partes comprometem-se a manter sigilo absoluto sobre informações estratégicas, comerciais e operacionais, não podendo divulgá-las sem autorização prévia por escrito.</p>`)}
    ${sec(7, 'Condições financeiras', `
      <p><b>7.1.</b> Este Termo não estabelece qualquer pagamento, salário ou remuneração por parte da AGÊNCIA ao STREAMER.</p>
      <p><b>7.2.</b> Os ganhos do STREAMER são provenientes exclusivamente da plataforma Kwai, de acordo com as regras de monetização da mesma e o desempenho do STREAMER.</p>
      <p><b>7.3.</b> A AGÊNCIA não garante resultados financeiros de nenhuma espécie.</p>`)}
    ${sec(8, 'Concorrência desleal e parcerias', `
      <p><b>8.1.</b> O STREAMER poderá atuar de forma independente, desde que não haja conflito com este Termo ou com as diretrizes da plataforma.</p>
      <p><b>8.2.</b> É expressamente proibido:</p>
      <ul class="rg-lista"><li>a) Prejudicar, direta ou indiretamente, a imagem da AGÊNCIA;</li><li>b) Compartilhar informações internas da AGÊNCIA com terceiros;</li><li>c) Aliciar streamers vinculados à AGÊNCIA;</li><li>d) Firmar parcerias com o objetivo de prejudicar a AGÊNCIA;</li><li>e) Praticar atos de concorrência desleal ou má-fé.</li></ul>
      <p><b>8.3.</b> O descumprimento das proibições acima poderá resultar em rescisão imediata do presente Termo, sem prejuízo das medidas legais e judiciais cabíveis.</p>`)}
    ${sec(9, 'Não aliciamento', `
      <p><b>9.1.</b> O STREAMER compromete-se a não recrutar, influenciar, aliciar ou induzir streamers da AGÊNCIA a saírem ou migrarem para outras agências.</p>
      <p><b>9.2.</b> Esta obrigação de não aliciamento permanece válida durante a vigência deste Termo e pelo prazo de 12 (doze) meses após o seu encerramento.</p>
      <p><b>9.3.</b> Considera-se aliciamento, dentre outras condutas:</p>
      <ul class="rg-lista"><li>a) Convites diretos ou indiretos para saída da agência;</li><li>b) Intermediação de contatos com concorrentes;</li><li>c) Tentativas de enfraquecer a base de agenciados da AGÊNCIA;</li><li>d) Parcerias ou consórcios para captação de streamers da AGÊNCIA.</li></ul>
      <p><b>9.4.</b> O mero relacionamento social, sem qualquer intenção ou ato de captação, não configura violação desta cláusula.</p>
      <p><b>9.5.</b> O descumprimento desta obrigação sujeita o infrator à rescisão imediata do contrato, além de perdas e danos e demais medidas judiciais cabíveis.</p>`)}
    ${sec(10, 'Disposições gerais', `
      <ul class="rg-lista"><li>a) As partes declaram atuar com total independência e autonomia;</li><li>b) Não há exclusividade de prestação de serviços, salvo se houver acordo específico em contrário;</li><li>c) O STREAMER é o único responsável pelo cumprimento de suas obrigações legais, fiscais e tributárias decorrentes de sua atividade;</li><li>d) Este instrumento representa o acordo integral entre as partes, revogando e substituindo quaisquer entendimentos anteriores.</li></ul>`)}
    ${sec(11, 'Foro', `<p>Fica eleito o foro da comarca da sede da AGÊNCIA (DMaior Agency), com renúncia expressa a qualquer outro, por mais privilegiado que seja, para dirimir eventuais dúvidas ou conflitos oriundos deste Termo.</p>`)}
    <div class="card rg-final">
      <h3>Aceite e assinatura digital</h3>
      <p>E, por estarem em perfeito acordo com as cláusulas estipuladas, as partes firmam o presente instrumento para que produza seus regulares efeitos de direito.</p>
      <p>O aceite do STREAMER é feito eletronicamente, ao marcar a concordância com este Termo na candidatura da DMaior Agency, e fica registrado com data e hora.</p>
    </div>`;

  const SECOES = [
    { id: 'kwai',    rotulo: 'Diretrizes Kwai',  html: HTML_KWAI },
    { id: 'agencia', rotulo: 'Termo da agência', html: HTML_AGENCIA },
  ];

  // Versão atual de cada documento. A candidatura (recrutamento.html) grava
  // qual foi aceita; o painel compara com termos_aceites pra saber se o
  // streamer ainda precisa aceitar (versão nova = aceitar de novo).
  const VERSOES = { agencia: TERMO_AGENCIA_VERSAO, kwai: '2H2026' };
  const NOME_DOC = { agencia: 'o Termo de Cooperação da DMaior Agency', kwai: 'as Diretrizes do Kwai' };
  window.DmaiorTermos = { versaoAgencia: VERSOES.agencia, versaoKwai: VERSOES.kwai };

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

    /* Listas a) b) c) do termo da agência (a letra já vem no texto) */
    regras-dmaior .rg-lista{list-style:none;margin:0 0 10px;padding-left:10px;}
    regras-dmaior .rg-lista li{margin-bottom:5px;}

    /* Aceite no painel (atributo com-aceite) */
    regras-dmaior .rg-tab .rg-pend{display:inline-block;width:7px;height:7px;border-radius:50%;background:#ff3b5c;margin-left:6px;vertical-align:middle;}
    regras-dmaior .rg-aceite{border-color:var(--cyan);}
    regras-dmaior .rg-aceite h3{font-family:var(--dm-font-title,'Rajdhani',sans-serif);font-size:.98rem;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:var(--text);margin:0 0 8px;}
    regras-dmaior .rg-aceite p{color:var(--muted);}
    regras-dmaior .rg-aceite-btn{margin-top:12px;width:100%;padding:13px 16px;border:none;border-radius:12px;background:var(--rank-grad,linear-gradient(135deg,#3b82f6,#00d4d4));color:#fff;font-family:var(--dm-font-title,'Rajdhani',sans-serif);font-weight:700;font-size:.95rem;text-transform:uppercase;letter-spacing:.06em;cursor:pointer;}
    regras-dmaior .rg-aceite-btn:disabled{opacity:.6;cursor:wait;}
    regras-dmaior .rg-aceite-erro{color:var(--red) !important;margin-top:10px;font-size:.8rem;}
    regras-dmaior .rg-aceite.ok{display:flex;gap:12px;align-items:flex-start;border-color:#4ade80;}
    regras-dmaior .rg-aceite-ico{flex:none;width:30px;height:30px;border-radius:50%;display:grid;place-items:center;background:rgba(74,222,128,.15);color:#4ade80;font-weight:700;}
    regras-dmaior .rg-aceite.ok b{display:block;color:#4ade80;margin-bottom:2px;}
  `;

  class RegrasDmaior extends HTMLElement {
    connectedCallback() {
      if (this._iniciado) return;
      this._iniciado = true;
      // secao="agencia" abre direto num documento; o atributo unica mostra só
      // ele, sem título/abas (é assim que o recrutamento usa, dentro da janela "Ler")
      const pedida = this.getAttribute('secao');
      this._ativa = SECOES.some(s => s.id === pedida) ? pedida : SECOES[0].id;
      this._aceites = null; // null = ainda carregando (só importa com com-aceite)
      this._render();
    }

    _render() {
      const sec = SECOES.find(s => s.id === this._ativa) || SECOES[0];
      const unica = this.hasAttribute('unica');
      const abas = !unica && SECOES.length > 1
        ? `<div class="rg-tabs" role="tablist">${SECOES.map(s =>
            `<button type="button" role="tab" class="rg-tab${s.id === sec.id ? ' on' : ''}" data-id="${s.id}" aria-selected="${s.id === sec.id}">${s.rotulo}${this._pendente(s.id) ? '<span class="rg-pend" title="Aceite pendente"></span>' : ''}</button>`
          ).join('')}</div>`
        : '';
      this.innerHTML = `
        <style>${CSS}</style>
        <div class="rg-wrap">
          ${unica ? '' : `<h1 class="rg-title">Regras e Diretrizes</h1>
          <p class="rg-sub">Diretrizes da plataforma Kwai e Termo de Cooperação da DMaior Agency. Mantenha-se atualizado.</p>`}
          ${abas}
          ${sec.html}
          ${this._blocoAceite(sec.id)}
        </div>`;
      this.querySelectorAll('.rg-tab').forEach(b => {
        b.addEventListener('click', () => { this._ativa = b.dataset.id; this._render(); });
      });
      const btn = this.querySelector('.rg-aceite-btn');
      if (btn) btn.addEventListener('click', () => {
        btn.disabled = true; btn.textContent = 'Registrando…';
        // Quem grava é o painel (dmaior-app.js): ele escuta este evento
        this.dispatchEvent(new CustomEvent('regras-aceitar', { bubbles: true, detail: { documento: btn.dataset.doc, versao: VERSOES[btn.dataset.doc] } }));
      });
    }

    // ── Aceite pelo painel (só com o atributo com-aceite) ──────────────
    // Lista vinda de GET /api/termos: [{ documento, versao, aceito_em }]
    setAceites(lista) { this._aceites = Array.isArray(lista) ? lista : []; this._erroAceite = null; if (this._iniciado) this._render(); }
    setErroAceite(msg) { this._erroAceite = msg || 'Não foi possível registrar o aceite.'; if (this._iniciado) this._render(); }
    _aceiteDe(doc) { return (this._aceites || []).find(a => a.documento === doc && a.versao === VERSOES[doc]) || null; }
    _pendente(doc) { return this.hasAttribute('com-aceite') && Array.isArray(this._aceites) && !this._aceiteDe(doc); }
    _blocoAceite(doc) {
      if (!this.hasAttribute('com-aceite') || !VERSOES[doc]) return '';
      if (!Array.isArray(this._aceites)) return `<div class="card rg-aceite"><p>Verificando seu aceite…</p></div>`;
      const a = this._aceiteDe(doc);
      if (a) {
        const d = new Date(a.aceito_em);
        const quando = isNaN(d) ? '' : `${d.toLocaleDateString('pt-BR')} às ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
        return `<div class="card rg-aceite ok"><span class="rg-aceite-ico">✓</span><div><b>Você aceitou ${NOME_DOC[doc]}</b><p>${quando ? `Em ${quando} · ` : ''}versão ${VERSOES[doc]}</p></div></div>`;
      }
      return `<div class="card rg-aceite">
          <h3>Aceite do documento</h3>
          <p>Ao tocar em <b>Li e aceito</b>, você declara que leu e concorda com ${NOME_DOC[doc]} (versão ${VERSOES[doc]}). O aceite fica registrado com data e hora.</p>
          <button type="button" class="rg-aceite-btn" data-doc="${doc}">Li e aceito</button>
          ${this._erroAceite ? `<p class="rg-aceite-erro">${this._erroAceite}</p>` : ''}
        </div>`;
    }
  }

  if (!customElements.get('regras-dmaior')) customElements.define('regras-dmaior', RegrasDmaior);
})();
