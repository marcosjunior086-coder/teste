===========================================================
  DMAJOR AGENCY — SITE ESTÁTICO PARA HOSTINGER
  Versão gerada em: Junho 2025
===========================================================

ESTRUTURA DE ARQUIVOS
---------------------
hostinger/
├── index.html          → Página inicial (home)
├── ranking.html        → Ranking geral (diamantes + horas)
├── recarga.html        → Chat de recarga de diamantes Kwai
├── politicas.html      → Políticas de privacidade / LGPD
├── tutoriais.html      → Tutoriais em vídeo
├── recrutamento.html   → Formulário de candidatura
├── .htaccess           → Configurações Apache (HTTPS, cache, redirects)
│
├── painel/
│   └── index.html      → Painel do streamer (rota protegida)
│
├── admin/
│   └── index.html      → Painel administrativo (rota protegida)
│
├── css/
│   ├── global.css      → Design system (variáveis, tipografia, layout)
│   └── components.css  → Estilos compartilhados (botões, cards, etc.)
│
└── js/
    ├── api.js          → window.DmaiorAPI — ÚNICA fonte de fetch
    ├── auth.js         → Gerenciamento de sessão (localStorage)
    ├── router.js       → Navegação e proteção de rotas
    ├── utils/
    │   ├── storage.js  → localStorage com proteção SSR
    │   └── helpers.js  → Formatadores, debounce, sons, etc.
    └── components/
        ├── menu-desktop.js  → Navbar desktop
        ├── menu-mobile.js   → Menu mobile hamburguer
        ├── services-menu.js → Botões de serviços
        ├── beneficios.js    → Grid de benefícios + FAQ
        ├── ranking.js       → Ranking interativo (login + pódio + lista)
        ├── recarga.js       → Chat de recarga PIX
        ├── live-widget.js   → Widget de transmissões ao vivo (KwaiLiveWidget)
        ├── policies.js      → Políticas LGPD com TOC
        └── tutoriais.js     → Cards de tutoriais


COMO FAZER UPLOAD NA HOSTINGER
-------------------------------
1. Acesse o hPanel (hpanel.hostinger.com) e faça login.
2. Vá em "Websites" → seu domínio → "Gerenciar".
3. Clique em "Gerenciador de Arquivos" (File Manager).
4. Abra a pasta "public_html" (raiz do site).
5. Delete qualquer arquivo padrão que exista (index.html de boas-vindas).
6. Selecione TODOS os arquivos e pastas desta pasta "hostinger/" e faça upload.
   IMPORTANTE: faça upload do CONTEÚDO da pasta (não a pasta em si).
   A estrutura final deve ser:
     public_html/
       index.html
       ranking.html
       recarga.html
       politicas.html
       tutoriais.html
       recrutamento.html
       .htaccess
       css/
       js/
       painel/
       admin/

7. O arquivo .htaccess pode ficar oculto no gerenciador — habilite
   "Mostrar arquivos ocultos" se necessário.

8. Após o upload, acesse agencydmaior.com.br para verificar.


BACKEND (NÃO ALTERAR)
----------------------
O backend permanece inalterado nos Cloudflare Workers:
  - recarga: https://recarga-dmaior.agencydmaior.com.br
  - ranking: https://rank.agencydmaior.com.br
  - admin:   https://admin.agencydmaior.com.br
  - outros:  veja js/api.js → window.DmaiorConfig.workers

O banco de dados Supabase PostgreSQL também permanece inalterado.


SESSÃO / AUTENTICAÇÃO
----------------------
As chaves de localStorage utilizadas são:
  dm_uid    → ID do usuário logado
  dm_token  → Token JWT da sessão
  dm_email  → E-mail do usuário
  dm_foto   → URL da foto de perfil
  dm_nome   → Nome do usuário

Para o ranking especificamente:
  dmaior_token              → Token de acesso ao ranking
  agencia_auth              → Flag de agência autenticada
  dmaior_sheet_data_{gid}   → Cache das planilhas históricas


OBSERVAÇÕES TÉCNICAS
---------------------
- Todos os fetch() estão centralizados em js/api.js (window.DmaiorAPI)
- Nenhum componente faz fetch() direto
- Nenhuma chave secreta ou token está exposta no front-end
- localStorage sempre protegido com try/catch
- Custom Elements (Web Components) com Shadow DOM preservado
- Design idêntico ao Wix: fundo #0a0e27, cyan #00d4d4, gold #f0c040
- Fontes: Rajdhani (títulos) + Exo 2 (corpo) via Google Fonts


SUPORTE
-------
Em caso de dúvidas técnicas, contate: dmaior.agency@gmail.com

===========================================================
