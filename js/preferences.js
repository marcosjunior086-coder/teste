(function () {
  'use strict';

  const LANG_KEY = 'dm_idioma';
  const FONT_KEY = 'dm_tamanho_texto';
  const FONT_FAMILY_KEY = 'dm_familia_fonte';
  const THEME_KEY = 'dm_tema';
  const DEFAULT_LANG = 'pt-BR';
  const DEFAULT_FONT = 'normal';
  const DEFAULT_FONT_FAMILY = 'dmaior';
  const THEME_META = {
    original: { color: '#060B16', scheme: 'dark' },
    dark:     { color: '#000000', scheme: 'dark' },
    branco:   { color: '#f0f4f8', scheme: 'light' },
    rosa:     { color: '#fff5f8', scheme: 'light' },
    laranja:  { color: '#fff8f0', scheme: 'light' }
  };

  const dict = {
    'pt-BR': {
      languageName: 'Português BR',
      fontNormal: 'Normal',
      fontLarge: 'Grande',
      fontExtra: 'Muito grande',
      preferences: 'Preferências',
      accessibility: 'Acessibilidade',
      textSize: 'Tamanho do texto',
      language: 'Idioma',
      profileControl: 'Controle de perfil',
      personalData: 'Dados pessoais',
      appearanceAccess: 'Aparência e acessibilidade',
      appearanceHelp: 'Essas opções ficam salvas neste aparelho e ajudam na leitura sem alterar seus dados.',
      dashboard: 'Resumo',
      profile: 'Perfil',
      wallet: 'Carteira',
      boost: 'Impulso',
      frames: 'Molduras',
      ranking: 'Ranking',
      vote: 'Votação',
      more: 'Mais',
      logout: 'Sair',
      updateData: 'Atualizar dados',
      enterAgency: 'Entrar para a agência',
      recruitmentSubtitle: 'Processo gratuito. Consulte seu perfil, confirme e envie sua candidatura.',
      infoKwaiId: 'Informe seu Kwai ID (nome de usuário ou número de ID) para consultarmos sua situação.',
      infoFree: 'O processo é totalmente gratuito e sem compromisso.',
      infoData: 'Seus dados são usados apenas para o processo de agenciamento.',
      kwaiIdLabel: 'Kwai ID ou número de membro',
      kwaiIdPlaceholder: 'Ex: seu_usuario ou 123456789',
      kwaiIdHint: 'Encontre seu ID no perfil do Kwai → três pontos → Copiar ID.',
      searchProfile: 'Buscar perfil',
      loadingProfile: 'Consultando perfil no Kwai...',
      confirmProfile: 'Este é o seu perfil no Kwai?',
      noCorrect: 'Não, corrigir',
      yesMine: 'Sim, é o meu',
      fullName: 'Nome completo',
      fullNamePlaceholder: 'Seu nome completo',
      whatsapp: 'WhatsApp',
      contentCategory: 'Categoria de conteúdo',
      select: 'Selecione...',
      entertainment: 'Entretenimento',
      games: 'Games',
      consent: 'Autorizo o contato pela DMaior Agency e concordo que minhas informações sejam usadas exclusivamente para o processo de agenciamento.',
      sendingApplication: 'Enviando candidatura...',
      back: 'Voltar',
      submitApplication: 'Enviar candidatura',
      migrationTitle: 'Perfil vinculado a outra agência',
      migrationCopy: 'Para entrar na DMaior Agency você precisará solicitar sua liberação. Clique abaixo para iniciar o processo via WhatsApp, nossa equipe vai orientar você.',
      requestMigration: 'Solicitar migração de agência',
      backStart: 'Voltar ao início',
      applicationSent: 'Candidatura enviada!',
      applicationReceived: 'Candidatura recebida!',
      inviteSent: 'Convite enviado!',
      resultDefault: 'Nossa equipe vai analisar seu perfil e entrar em contato pelo WhatsApp em breve.',
      nextSteps: 'Próximos passos',
      inviteDelay: 'O convite foi enviado pelo chat do Kwai e pode levar até 30 minutos para aparecer. Ao aceitar, informe o ID da agência abaixo quando solicitado.',
      agencyId: 'ID da agência',
      copy: 'Copiar',
      copied: 'Copiado',
      recruiterResponsible: 'Responsável pelo convite',
      recruiterSoon: 'Informações de recrutador em breve.',
      howAcceptInvite: 'Como aceitar o convite',
      talkAgency: 'Falar com a agência',
      newSearch: 'Nova consulta',
      liveRequirementTitle: 'Requisito de live não atingido',
      liveRequirementHelp: 'Você poderá tentar novamente quando cumprir o tempo mínimo exigido pelo Kwai.',
      eligibilityLiveDefault: 'Este perfil não atingiu o mínimo de horas de live exigido pela plataforma.',
      serviceUnavailable: 'Serviço temporariamente indisponível. Tente novamente em alguns minutos.',
      verifyIncomplete: 'Não foi possível verificar o status deste perfil. Tente novamente mais tarde.',
      profileNotFound: 'Perfil não encontrado. Verifique o Kwai ID e tente novamente.',
      informKwaiId: 'Informe o Kwai ID antes de buscar.',
      informName: 'Informe seu nome completo.',
      invalidWhatsapp: 'WhatsApp inválido. Use DDD + número.',
      selectCategory: 'Selecione uma categoria de conteúdo.',
      acceptTerms: 'Você precisa aceitar os termos para continuar.',
      cannotSendInvite: 'Não foi possível enviar o convite',
      kwaiRefused: 'O Kwai recusou o convite. Nossa equipe analisará e entrará em contato.',
      alreadyMember: 'Já é membro',
      noEligibility: 'Sem elegibilidade',
      activeInvite: 'Convite ativo',
      expiredInvite: 'Convite expirado',
      frameTitle: 'Gerador de Moldura',
      frameArea: 'DMaior Agency · Área do streamer',
      frameHint: 'Escolha um tema e arraste a foto para reposicioná-la no círculo.',
      frameTheme: '1 · Tema da moldura',
      framePhoto: '2 · Sua foto',
      addImage: 'Adicionar imagem',
      addImageHelp: 'Clique ou arraste uma foto aqui',
      change: 'Trocar',
      frameAdjust: '3 · Ajustar',
      centerReset: 'Centralizar / Redefinir',
      chooseQuality: '4 · Escolha a qualidade',
      ultraHigh: 'Ultra alta resolução',
      downloadFrame: 'Baixar moldura',
      frameNote: 'Selecione a qualidade e depois use o botão de download. Os arquivos são PNG sem perda. As opções 16K e 22K são recomendadas apenas em computadores com boa memória.',
      homeJoinAgency: 'Entrar na Agência',
      homeTopup: 'Recarga',
      homeSupport: 'Suporte',
      homeDiamondTopup: 'Recarga de Diamantes',
      homeTopupSub: 'Rápido, seguro e pelo melhor preço',
      homeFree: 'Gratuito',
      homeQuickAccess: 'Acesso rápido',
      homeRanking: 'Ranking',
      homeSeePositions: 'Ver posições',
      homeTutorials: 'Tutoriais',
      homeLearnMore: 'Aprenda mais',
      homeEvents: 'Eventos',
      homePkChallenges: 'PK e desafios',
      homePortfolio: 'Portfólio',
      homeWhoWeAre: 'Quem somos',
      homePolicies: 'Políticas',
      homeHostPolicy: 'Política de Host',
      homeKwaiPayments: 'Pagamentos Kwai',
      homeSpecialPolicy: 'Pol. Especial',
      homePremiumStreamer: 'Streamer Premium'
    },
    en: {
      languageName: 'English',
      fontNormal: 'Normal',
      fontLarge: 'Large',
      fontExtra: 'Extra large',
      preferences: 'Preferences',
      accessibility: 'Accessibility',
      textSize: 'Text size',
      language: 'Language',
      profileControl: 'Profile control',
      personalData: 'Personal data',
      appearanceAccess: 'Appearance and accessibility',
      appearanceHelp: 'These options are saved on this device and improve readability without changing your data.',
      dashboard: 'Summary',
      profile: 'Profile',
      wallet: 'Wallet',
      boost: 'Boost',
      frames: 'Frames',
      ranking: 'Ranking',
      vote: 'Vote',
      more: 'More',
      logout: 'Log out',
      updateData: 'Update data',
      enterAgency: 'Join the agency',
      recruitmentSubtitle: 'Free process. Check your profile, confirm it, and submit your application.',
      infoKwaiId: 'Enter your Kwai ID (username or member ID) so we can check your status.',
      infoFree: 'The process is completely free and without commitment.',
      infoData: 'Your data is used only for the agency onboarding process.',
      kwaiIdLabel: 'Kwai ID or member number',
      kwaiIdPlaceholder: 'Example: your_username or 123456789',
      kwaiIdHint: 'Find your ID in your Kwai profile → three dots → Copy ID.',
      searchProfile: 'Search profile',
      loadingProfile: 'Checking profile on Kwai...',
      confirmProfile: 'Is this your Kwai profile?',
      noCorrect: 'No, correct it',
      yesMine: 'Yes, it is mine',
      fullName: 'Full name',
      fullNamePlaceholder: 'Your full name',
      whatsapp: 'WhatsApp',
      contentCategory: 'Content category',
      select: 'Select...',
      entertainment: 'Entertainment',
      games: 'Games',
      consent: 'I authorize DMaior Agency to contact me and agree that my information will be used only for the agency onboarding process.',
      sendingApplication: 'Submitting application...',
      back: 'Back',
      submitApplication: 'Submit application',
      migrationTitle: 'Profile linked to another agency',
      migrationCopy: 'To join DMaior Agency, you need to request release. Tap below to start the process on WhatsApp and our team will guide you.',
      requestMigration: 'Request agency migration',
      backStart: 'Back to start',
      applicationSent: 'Application sent!',
      applicationReceived: 'Application received!',
      inviteSent: 'Invite sent!',
      resultDefault: 'Our team will review your profile and contact you soon through WhatsApp.',
      nextSteps: 'Next steps',
      inviteDelay: 'The invite was sent through Kwai chat and may take up to 30 minutes to appear. When accepting it, enter the agency ID below when requested.',
      agencyId: 'Agency ID',
      copy: 'Copy',
      copied: 'Copied',
      recruiterResponsible: 'Invite manager',
      recruiterSoon: 'Recruiter details coming soon.',
      howAcceptInvite: 'How to accept the invite',
      talkAgency: 'Talk to the agency',
      newSearch: 'New search',
      liveRequirementTitle: 'Live time requirement not met',
      liveRequirementHelp: 'You can try again after reaching the minimum live time required by Kwai.',
      eligibilityLiveDefault: 'This profile has not reached the minimum live time required by the platform.',
      serviceUnavailable: 'Service temporarily unavailable. Try again in a few minutes.',
      verifyIncomplete: 'Could not verify this profile status. Try again later.',
      profileNotFound: 'Profile not found. Check the Kwai ID and try again.',
      informKwaiId: 'Enter the Kwai ID before searching.',
      informName: 'Enter your full name.',
      invalidWhatsapp: 'Invalid WhatsApp. Use area code plus number.',
      selectCategory: 'Select a content category.',
      acceptTerms: 'You need to accept the terms to continue.',
      cannotSendInvite: 'Could not send the invite',
      kwaiRefused: 'Kwai refused the invite. Our team will review it and contact you.',
      alreadyMember: 'Already a member',
      noEligibility: 'Not eligible',
      activeInvite: 'Active invite',
      expiredInvite: 'Expired invite',
      frameTitle: 'Frame Generator',
      frameArea: 'DMaior Agency · Streamer area',
      frameHint: 'Choose a theme and drag the photo to reposition it inside the circle.',
      frameTheme: '1 · Frame theme',
      framePhoto: '2 · Your photo',
      addImage: 'Add image',
      addImageHelp: 'Click or drag a photo here',
      change: 'Change',
      frameAdjust: '3 · Adjust',
      centerReset: 'Center / Reset',
      chooseQuality: '4 · Choose quality',
      ultraHigh: 'Ultra high resolution',
      downloadFrame: 'Download frame',
      frameNote: 'Select the quality and then use the download button. Files are lossless PNG. 16K and 22K are recommended only for computers with enough memory.',
      homeJoinAgency: 'Join the Agency',
      homeTopup: 'Top-up',
      homeSupport: 'Support',
      homeDiamondTopup: 'Diamond Top-up',
      homeTopupSub: 'Fast, secure, and at the best price',
      homeFree: 'Free',
      homeQuickAccess: 'Quick access',
      homeRanking: 'Ranking',
      homeSeePositions: 'See positions',
      homeTutorials: 'Tutorials',
      homeLearnMore: 'Learn more',
      homeEvents: 'Events',
      homePkChallenges: 'PK and challenges',
      homePortfolio: 'Portfolio',
      homeWhoWeAre: 'Who we are',
      homePolicies: 'Policies',
      homeHostPolicy: 'Host Policy',
      homeKwaiPayments: 'Kwai payments',
      homeSpecialPolicy: 'Special Policy',
      homePremiumStreamer: 'Premium Streamer'
    },
    es: {
      languageName: 'Español',
      fontNormal: 'Normal',
      fontLarge: 'Grande',
      fontExtra: 'Muy grande',
      preferences: 'Preferencias',
      accessibility: 'Accesibilidad',
      textSize: 'Tamaño del texto',
      language: 'Idioma',
      profileControl: 'Control de perfil',
      personalData: 'Datos personales',
      appearanceAccess: 'Apariencia y accesibilidad',
      appearanceHelp: 'Estas opciones quedan guardadas en este dispositivo y ayudan a leer mejor sin cambiar tus datos.',
      dashboard: 'Resumen',
      profile: 'Perfil',
      wallet: 'Billetera',
      boost: 'Impulso',
      frames: 'Marcos',
      ranking: 'Ranking',
      vote: 'Votación',
      more: 'Más',
      logout: 'Salir',
      updateData: 'Actualizar datos',
      enterAgency: 'Entrar a la agencia',
      recruitmentSubtitle: 'Proceso gratuito. Consulta tu perfil, confirma y envía tu candidatura.',
      infoKwaiId: 'Informa tu Kwai ID (usuario o número de miembro) para consultar tu situación.',
      infoFree: 'El proceso es totalmente gratuito y sin compromiso.',
      infoData: 'Tus datos se usan solo para el proceso de agenciamiento.',
      kwaiIdLabel: 'Kwai ID o número de miembro',
      kwaiIdPlaceholder: 'Ej: tu_usuario o 123456789',
      kwaiIdHint: 'Encuentra tu ID en el perfil de Kwai → tres puntos → Copiar ID.',
      searchProfile: 'Buscar perfil',
      loadingProfile: 'Consultando perfil en Kwai...',
      confirmProfile: '¿Este es tu perfil de Kwai?',
      noCorrect: 'No, corregir',
      yesMine: 'Sí, es mío',
      fullName: 'Nombre completo',
      fullNamePlaceholder: 'Tu nombre completo',
      whatsapp: 'WhatsApp',
      contentCategory: 'Categoría de contenido',
      select: 'Selecciona...',
      entertainment: 'Entretenimiento',
      games: 'Games',
      consent: 'Autorizo el contacto de DMaior Agency y acepto que mis datos se usen solo para el proceso de agenciamiento.',
      sendingApplication: 'Enviando candidatura...',
      back: 'Volver',
      submitApplication: 'Enviar candidatura',
      migrationTitle: 'Perfil vinculado a otra agencia',
      migrationCopy: 'Para entrar a DMaior Agency debes solicitar liberación. Toca abajo para iniciar el proceso por WhatsApp y nuestro equipo te orientará.',
      requestMigration: 'Solicitar migración de agencia',
      backStart: 'Volver al inicio',
      applicationSent: '¡Candidatura enviada!',
      applicationReceived: '¡Candidatura recibida!',
      inviteSent: '¡Invitación enviada!',
      resultDefault: 'Nuestro equipo revisará tu perfil y te contactará pronto por WhatsApp.',
      nextSteps: 'Próximos pasos',
      inviteDelay: 'La invitación fue enviada por el chat de Kwai y puede tardar hasta 30 minutos en aparecer. Al aceptarla, informa el ID de la agencia abajo cuando se solicite.',
      agencyId: 'ID de la agencia',
      copy: 'Copiar',
      copied: 'Copiado',
      recruiterResponsible: 'Responsable de la invitación',
      recruiterSoon: 'Información del reclutador próximamente.',
      howAcceptInvite: 'Cómo aceptar la invitación',
      talkAgency: 'Hablar con la agencia',
      newSearch: 'Nueva consulta',
      liveRequirementTitle: 'Requisito de tiempo de live no alcanzado',
      liveRequirementHelp: 'Podrás intentarlo nuevamente cuando cumplas el tiempo mínimo exigido por Kwai.',
      eligibilityLiveDefault: 'Este perfil no alcanzó el mínimo de horas de live exigido por la plataforma.',
      serviceUnavailable: 'Servicio temporalmente no disponible. Intenta de nuevo en unos minutos.',
      verifyIncomplete: 'No fue posible verificar el estado de este perfil. Intenta más tarde.',
      profileNotFound: 'Perfil no encontrado. Verifica el Kwai ID e intenta nuevamente.',
      informKwaiId: 'Informa el Kwai ID antes de buscar.',
      informName: 'Informa tu nombre completo.',
      invalidWhatsapp: 'WhatsApp inválido. Usa código de área y número.',
      selectCategory: 'Selecciona una categoría de contenido.',
      acceptTerms: 'Debes aceptar los términos para continuar.',
      cannotSendInvite: 'No fue posible enviar la invitación',
      kwaiRefused: 'Kwai rechazó la invitación. Nuestro equipo revisará y entrará en contacto.',
      alreadyMember: 'Ya es miembro',
      noEligibility: 'Sin elegibilidad',
      activeInvite: 'Invitación activa',
      expiredInvite: 'Invitación expirada',
      frameTitle: 'Generador de Marco',
      frameArea: 'DMaior Agency · Área del streamer',
      frameHint: 'Elige un tema y arrastra la foto para reposicionarla dentro del círculo.',
      frameTheme: '1 · Tema del marco',
      framePhoto: '2 · Tu foto',
      addImage: 'Agregar imagen',
      addImageHelp: 'Haz clic o arrastra una foto aquí',
      change: 'Cambiar',
      frameAdjust: '3 · Ajustar',
      centerReset: 'Centrar / Restablecer',
      chooseQuality: '4 · Elige la calidad',
      ultraHigh: 'Resolución ultra alta',
      downloadFrame: 'Descargar marco',
      frameNote: 'Selecciona la calidad y luego usa el botón de descarga. Los archivos son PNG sin pérdida. 16K y 22K se recomiendan solo en computadoras con buena memoria.',
      homeJoinAgency: 'Entrar a la agencia',
      homeTopup: 'Recarga',
      homeSupport: 'Soporte',
      homeDiamondTopup: 'Recarga de Diamantes',
      homeTopupSub: 'Rápido, seguro y al mejor precio',
      homeFree: 'Gratis',
      homeQuickAccess: 'Acceso rápido',
      homeRanking: 'Ranking',
      homeSeePositions: 'Ver posiciones',
      homeTutorials: 'Tutoriales',
      homeLearnMore: 'Aprende más',
      homeEvents: 'Eventos',
      homePkChallenges: 'PK y desafíos',
      homePortfolio: 'Portafolio',
      homeWhoWeAre: 'Quiénes somos',
      homePolicies: 'Políticas',
      homeHostPolicy: 'Política de Host',
      homeKwaiPayments: 'Pagos Kwai',
      homeSpecialPolicy: 'Pol. Especial',
      homePremiumStreamer: 'Streamer Premium'
    },
    zh: {
      languageName: '中文',
      fontNormal: '标准',
      fontLarge: '大',
      fontExtra: '特大',
      preferences: '偏好设置',
      accessibility: '无障碍',
      textSize: '文字大小',
      language: '语言',
      profileControl: '个人资料管理',
      personalData: '个人资料',
      appearanceAccess: '外观与无障碍',
      appearanceHelp: '这些选项会保存在本设备上，只改善阅读体验，不会更改你的资料。',
      dashboard: '概览',
      profile: '资料',
      wallet: '钱包',
      boost: '助推',
      frames: '头像框',
      ranking: '排行榜',
      vote: '投票',
      more: '更多',
      logout: '退出',
      updateData: '更新资料',
      enterAgency: '加入公会',
      recruitmentSubtitle: '免费流程。查询资料，确认后提交申请。',
      infoKwaiId: '请输入你的 Kwai ID（用户名或会员 ID），以便查询状态。',
      infoFree: '流程完全免费，没有任何强制承诺。',
      infoData: '你的资料仅用于公会入驻流程。',
      kwaiIdLabel: 'Kwai ID 或会员编号',
      kwaiIdPlaceholder: '例如：your_username 或 123456789',
      kwaiIdHint: '在 Kwai 个人资料中找到 ID → 三个点 → 复制 ID。',
      searchProfile: '查询资料',
      loadingProfile: '正在查询 Kwai 资料...',
      confirmProfile: '这是你的 Kwai 资料吗？',
      noCorrect: '不是，修改',
      yesMine: '是我的',
      fullName: '姓名',
      fullNamePlaceholder: '请输入姓名',
      whatsapp: 'WhatsApp',
      contentCategory: '内容类别',
      select: '请选择...',
      entertainment: '娱乐',
      games: '游戏',
      consent: '我授权 DMaior Agency 联系我，并同意我的信息仅用于公会入驻流程。',
      sendingApplication: '正在提交申请...',
      back: '返回',
      submitApplication: '提交申请',
      migrationTitle: '资料已绑定其他公会',
      migrationCopy: '如需加入 DMaior Agency，你需要申请解除绑定。点击下方通过 WhatsApp 联系团队获取帮助。',
      requestMigration: '申请公会迁移',
      backStart: '返回开始',
      applicationSent: '申请已发送！',
      applicationReceived: '申请已收到！',
      inviteSent: '邀请已发送！',
      resultDefault: '我们的团队会审核你的资料，并尽快通过 WhatsApp 联系你。',
      nextSteps: '下一步',
      inviteDelay: '邀请已通过 Kwai 聊天发送，最多可能需要 30 分钟显示。接受时，请在系统要求时填写下方公会 ID。',
      agencyId: '公会 ID',
      copy: '复制',
      copied: '已复制',
      recruiterResponsible: '邀请负责人',
      recruiterSoon: '招募负责人信息即将提供。',
      howAcceptInvite: '如何接受邀请',
      talkAgency: '联系公会',
      newSearch: '重新查询',
      liveRequirementTitle: '未达到直播时长要求',
      liveRequirementHelp: '达到 Kwai 要求的最低直播时长后，你可以再次尝试。',
      eligibilityLiveDefault: '该资料未达到平台要求的最低直播时长。',
      serviceUnavailable: '服务暂时不可用，请稍后再试。',
      verifyIncomplete: '无法确认此资料状态，请稍后再试。',
      profileNotFound: '未找到资料。请检查 Kwai ID 后重试。',
      informKwaiId: '查询前请输入 Kwai ID。',
      informName: '请输入姓名。',
      invalidWhatsapp: 'WhatsApp 无效，请填写区号和号码。',
      selectCategory: '请选择内容类别。',
      acceptTerms: '继续前需要接受条款。',
      cannotSendInvite: '无法发送邀请',
      kwaiRefused: 'Kwai 拒绝了邀请。我们的团队会审核并联系你。',
      alreadyMember: '已经是成员',
      noEligibility: '不符合条件',
      activeInvite: '邀请有效',
      expiredInvite: '邀请已过期',
      frameTitle: '头像框生成器',
      frameArea: 'DMaior Agency · 主播区域',
      frameHint: '选择主题并拖动照片，将它放到圆形区域中。',
      frameTheme: '1 · 头像框主题',
      framePhoto: '2 · 你的照片',
      addImage: '添加图片',
      addImageHelp: '点击或拖动照片到这里',
      change: '更换',
      frameAdjust: '3 · 调整',
      centerReset: '居中 / 重置',
      chooseQuality: '4 · 选择质量',
      ultraHigh: '超高分辨率',
      downloadFrame: '下载头像框',
      frameNote: '选择质量后点击下载按钮。文件为无损 PNG。16K 和 22K 仅建议在内存较好的电脑上使用。',
      homeJoinAgency: '加入公会',
      homeTopup: '充值',
      homeSupport: '支持',
      homeDiamondTopup: '钻石充值',
      homeTopupSub: '快速、安全、价格更优惠',
      homeFree: '免费',
      homeQuickAccess: '快捷入口',
      homeRanking: '排行榜',
      homeSeePositions: '查看排名',
      homeTutorials: '教程',
      homeLearnMore: '了解更多',
      homeEvents: '活动',
      homePkChallenges: 'PK 和挑战',
      homePortfolio: '作品集',
      homeWhoWeAre: '关于我们',
      homePolicies: '政策',
      homeHostPolicy: '主播政策',
      homeKwaiPayments: 'Kwai 付款',
      homeSpecialPolicy: '特殊政策',
      homePremiumStreamer: '高级主播'
    }
  };

  const fonts = {
    normal: { scale: '1' },
    grande: { scale: '1.12' },
    extra: { scale: '1.22' }
  };

  const fontFamilies = {
    dmaior: {
      title: "'Rajdhani', sans-serif",
      body:  "'Exo 2', sans-serif"
    },
    inter: {
      title: "'Inter', system-ui, sans-serif",
      body:  "'Inter', system-ui, sans-serif"
    },
    manrope: {
      title: "'Manrope', system-ui, sans-serif",
      body:  "'Manrope', system-ui, sans-serif"
    },
    montserrat: {
      title: "'Montserrat', system-ui, sans-serif",
      body:  "'Montserrat', system-ui, sans-serif"
    },
    opensans: {
      title: "'Open Sans', system-ui, sans-serif",
      body:  "'Open Sans', system-ui, sans-serif"
    },
    plusjakarta: {
      title: "'Plus Jakarta Sans', system-ui, sans-serif",
      body:  "'Plus Jakarta Sans', system-ui, sans-serif"
    },
    poppins: {
      title: "'Poppins', system-ui, sans-serif",
      body:  "'Poppins', system-ui, sans-serif"
    },
    sistema: {
      title: "system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif",
      body:  "system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif"
    }
  };

  const textOriginals = new WeakMap();
  let observer = null;
  const observedRoots = new WeakSet();
  let scheduled = false;

  const autoText = {
    en: {
      'CARREGANDO...': 'LOADING...',
      'ACESSO STREAMER': 'STREAMER ACCESS',
      'UID NUMERICO': 'NUMERIC UID',
      'UID KWAI': 'KWAI UID',
      'SENHA': 'PASSWORD',
      'ENTRAR NO PAINEL': 'ENTER PANEL',
      'Primeiro Acesso?': 'First access?',
      'Validar Cadastro': 'Validate registration',
      'Esqueceu a senha?': 'Forgot password?',
      'Recuperar acesso': 'Recover access',
      'Voltar': 'Back',
      'VALIDACAO DE CONTA': 'ACCOUNT VALIDATION',
      'Autorize seu acesso ao sistema.': 'Authorize your system access.',
      'E-MAIL': 'EMAIL',
      'RECEBER CODIGO': 'GET CODE',
      'Insira o codigo de validacao enviado.': 'Enter the validation code sent.',
      'CONFIRMAR CODIGO': 'CONFIRM CODE',
      'CRIAR SENHA': 'CREATE PASSWORD',
      'CONFIRMAR SENHA': 'CONFIRM PASSWORD',
      'CONCLUIR CADASTRO': 'FINISH REGISTRATION',
      'RECUPERAR SENHA': 'RECOVER PASSWORD',
      'Redefina seu acesso em 3 passos.': 'Reset your access in 3 steps.',
      'SEU UID KWAI': 'YOUR KWAI UID',
      'BUSCAR CONTA': 'FIND ACCOUNT',
      'Conta encontrada. Enviaremos o código para:': 'Account found. We will send the code to:',
      'E-mail vinculado': 'Linked email',
      'ENVIAR CÓDIGO': 'SEND CODE',
      'UID diferente': 'Different UID',
      'VALIDAR CÓDIGO': 'VALIDATE CODE',
      'NOVA SENHA': 'NEW PASSWORD',
      'SALVAR NOVA SENHA': 'SAVE NEW PASSWORD',
      'RESUMO': 'SUMMARY',
      'PERFIL': 'PROFILE',
      'CARTEIRA': 'WALLET',
      'IMPULSO': 'BOOST',
      'MOLDURAS': 'FRAMES',
      'RANKING': 'RANKING',
      'SAIR': 'LOG OUT',
      'ATUALIZAR': 'REFRESH',
      'Aguardando...': 'Waiting...',
      'ESTIMATIVA ACUMULADA (USD)': 'ACCUMULATED ESTIMATE (USD)',
      'DIAMANTES': 'DIAMONDS',
      'TEMPO TRANSMITIDO': 'STREAMED TIME',
      'HORAS VÁLIDAS': 'VALID HOURS',
      'DIAS DE LIVE': 'LIVE DAYS',
      'DESEMPENHO': 'PERFORMANCE',
      'Diamantes': 'Diamonds',
      'Horas': 'Hours',
      '7 dias': '7 days',
      '30 dias': '30 days',
      'HISTÓRICO DIÁRIO': 'DAILY HISTORY',
      'Data': 'Date',
      'Status': 'Status',
      'Monitoramento de Desempenho': 'Performance monitoring',
      'DADOS DE RECEBIMENTO': 'PAYMENT DATA',
      'TIPO DE CHAVE PIX': 'PIX KEY TYPE',
      'Selecione o tipo': 'Select type',
      'CHAVE PIX': 'PIX KEY',
      'SEGURANÇA': 'SECURITY',
      'MODIFICAR SENHA': 'CHANGE PASSWORD',
      '(opcional)': '(optional)',
      '1 Letra Maiúscula': '1 uppercase letter',
      '1 Número': '1 number',
      'Saldo Disponível': 'Available balance',
      'Nenhum saque pendente': 'No pending withdrawal',
      'HISTÓRICO': 'HISTORY',
      'TOTAL RECEBIDO': 'TOTAL RECEIVED',
      'TOTAL SACADO': 'TOTAL WITHDRAWN',
      'SOLICITAR SAQUE': 'REQUEST WITHDRAWAL',
      'MEUS SAQUES': 'MY WITHDRAWALS',
      'HISTÓRICO DE MOVIMENTAÇÕES': 'TRANSACTION HISTORY',
      'VOLTAR AO PAINEL': 'BACK TO PANEL',
      'MARCAR TODOS COMO LIDOS': 'MARK ALL AS READ',
      'Abrir no Kwai': 'Open in Kwai',
      'Fechar': 'Close',
      'Todos': 'All',
      'A procurar transmissões ao vivo...': 'Searching live streams...',
      'A CARREGAR LIVE...': 'LOADING LIVE...',
      'Entrar na Agência': 'Join the Agency',
      'Ranking': 'Ranking',
      'Tutoriais': 'Tutorials',
      'PK Interno': 'Internal PK',
      'Portfólio': 'Portfolio',
      'Políticas': 'Policies',
      'Política Host': 'Host Policy',
      'Premium': 'Premium',
      'Benefícios': 'Benefits',
      'Suporte': 'Support',
      'Início': 'Home',
      'Recarga': 'Top-up',
      'Como aceitar o convite': 'How to accept the invite',
      'Termos': 'Terms',
      'Políticas Premium': 'Premium Policies',
      'Área do Streamer': 'Streamer Area',
      'Adicionar imagem': 'Add image',
      'Clique ou arraste uma foto aqui': 'Click or drag a photo here',
      'Trocar': 'Change',
      'Centralizar / Redefinir': 'Center / Reset',
      'Baixar moldura': 'Download frame'
    },
    es: {
      'CARREGANDO...': 'CARGANDO...',
      'ACESSO STREAMER': 'ACCESO STREAMER',
      'UID NUMERICO': 'UID NUMÉRICO',
      'UID KWAI': 'UID KWAI',
      'SENHA': 'CONTRASEÑA',
      'ENTRAR NO PAINEL': 'ENTRAR AL PANEL',
      'Primeiro Acesso?': '¿Primer acceso?',
      'Validar Cadastro': 'Validar registro',
      'Esqueceu a senha?': '¿Olvidaste la contraseña?',
      'Recuperar acesso': 'Recuperar acceso',
      'Voltar': 'Volver',
      'VALIDACAO DE CONTA': 'VALIDACIÓN DE CUENTA',
      'Autorize seu acesso ao sistema.': 'Autoriza tu acceso al sistema.',
      'E-MAIL': 'E-MAIL',
      'RECEBER CODIGO': 'RECIBIR CÓDIGO',
      'Insira o codigo de validacao enviado.': 'Ingresa el código de validación enviado.',
      'CONFIRMAR CODIGO': 'CONFIRMAR CÓDIGO',
      'CRIAR SENHA': 'CREAR CONTRASEÑA',
      'CONFIRMAR SENHA': 'CONFIRMAR CONTRASEÑA',
      'CONCLUIR CADASTRO': 'FINALIZAR REGISTRO',
      'RECUPERAR SENHA': 'RECUPERAR CONTRASEÑA',
      'Redefina seu acesso em 3 passos.': 'Restablece tu acceso en 3 pasos.',
      'SEU UID KWAI': 'TU UID KWAI',
      'BUSCAR CONTA': 'BUSCAR CUENTA',
      'Conta encontrada. Enviaremos o código para:': 'Cuenta encontrada. Enviaremos el código a:',
      'E-mail vinculado': 'E-mail vinculado',
      'ENVIAR CÓDIGO': 'ENVIAR CÓDIGO',
      'UID diferente': 'UID diferente',
      'VALIDAR CÓDIGO': 'VALIDAR CÓDIGO',
      'NOVA SENHA': 'NUEVA CONTRASEÑA',
      'SALVAR NOVA SENHA': 'GUARDAR NUEVA CONTRASEÑA',
      'RESUMO': 'RESUMEN',
      'PERFIL': 'PERFIL',
      'CARTEIRA': 'BILLETERA',
      'IMPULSO': 'IMPULSO',
      'MOLDURAS': 'MARCOS',
      'RANKING': 'RANKING',
      'SAIR': 'SALIR',
      'ATUALIZAR': 'ACTUALIZAR',
      'Aguardando...': 'Esperando...',
      'ESTIMATIVA ACUMULADA (USD)': 'ESTIMACIÓN ACUMULADA (USD)',
      'DIAMANTES': 'DIAMANTES',
      'TEMPO TRANSMITIDO': 'TIEMPO TRANSMITIDO',
      'HORAS VÁLIDAS': 'HORAS VÁLIDAS',
      'DIAS DE LIVE': 'DÍAS DE LIVE',
      'DESEMPENHO': 'RENDIMIENTO',
      'Diamantes': 'Diamantes',
      'Horas': 'Horas',
      '7 dias': '7 días',
      '30 dias': '30 días',
      'HISTÓRICO DIÁRIO': 'HISTORIAL DIARIO',
      'Data': 'Fecha',
      'Status': 'Estado',
      'Monitoramento de Desempenho': 'Monitoreo de rendimiento',
      'DADOS DE RECEBIMENTO': 'DATOS DE PAGO',
      'TIPO DE CHAVE PIX': 'TIPO DE CLAVE PIX',
      'Selecione o tipo': 'Selecciona el tipo',
      'CHAVE PIX': 'CLAVE PIX',
      'SEGURANÇA': 'SEGURIDAD',
      'MODIFICAR SENHA': 'CAMBIAR CONTRASEÑA',
      '(opcional)': '(opcional)',
      '1 Letra Maiúscula': '1 letra mayúscula',
      '1 Número': '1 número',
      'Saldo Disponível': 'Saldo disponible',
      'Nenhum saque pendente': 'Ningún retiro pendiente',
      'HISTÓRICO': 'HISTORIAL',
      'TOTAL RECEBIDO': 'TOTAL RECIBIDO',
      'TOTAL SACADO': 'TOTAL RETIRADO',
      'SOLICITAR SAQUE': 'SOLICITAR RETIRO',
      'MEUS SAQUES': 'MIS RETIROS',
      'HISTÓRICO DE MOVIMENTAÇÕES': 'HISTORIAL DE MOVIMIENTOS',
      'VOLTAR AO PAINEL': 'VOLVER AL PANEL',
      'MARCAR TODOS COMO LIDOS': 'MARCAR TODOS COMO LEÍDOS',
      'Abrir no Kwai': 'Abrir en Kwai',
      'Fechar': 'Cerrar',
      'Todos': 'Todos',
      'A procurar transmissões ao vivo...': 'Buscando transmisiones en vivo...',
      'A CARREGAR LIVE...': 'CARGANDO LIVE...',
      'Entrar na Agência': 'Entrar a la agencia',
      'Tutoriais': 'Tutoriales',
      'PK Interno': 'PK Interno',
      'Portfólio': 'Portafolio',
      'Políticas': 'Políticas',
      'Política Host': 'Política Host',
      'Benefícios': 'Beneficios',
      'Suporte': 'Soporte',
      'Início': 'Inicio',
      'Recarga': 'Recarga',
      'Termos': 'Términos',
      'Área do Streamer': 'Área del streamer'
    },
    zh: {
      'CARREGANDO...': '加载中...',
      'ACESSO STREAMER': '主播登录',
      'UID NUMERICO': '数字 UID',
      'UID KWAI': 'Kwai UID',
      'SENHA': '密码',
      'ENTRAR NO PAINEL': '进入面板',
      'Primeiro Acesso?': '首次访问？',
      'Validar Cadastro': '验证注册',
      'Esqueceu a senha?': '忘记密码？',
      'Recuperar acesso': '找回访问',
      'Voltar': '返回',
      'VALIDACAO DE CONTA': '账号验证',
      'Autorize seu acesso ao sistema.': '授权访问系统。',
      'E-MAIL': '邮箱',
      'RECEBER CODIGO': '获取验证码',
      'Insira o codigo de validacao enviado.': '请输入收到的验证码。',
      'CONFIRMAR CODIGO': '确认验证码',
      'CRIAR SENHA': '创建密码',
      'CONFIRMAR SENHA': '确认密码',
      'CONCLUIR CADASTRO': '完成注册',
      'RECUPERAR SENHA': '找回密码',
      'Redefina seu acesso em 3 passos.': '通过 3 个步骤重置访问。',
      'SEU UID KWAI': '你的 Kwai UID',
      'BUSCAR CONTA': '查找账号',
      'Conta encontrada. Enviaremos o código para:': '已找到账号。验证码将发送到：',
      'E-mail vinculado': '绑定邮箱',
      'ENVIAR CÓDIGO': '发送验证码',
      'UID diferente': '其他 UID',
      'VALIDAR CÓDIGO': '验证验证码',
      'NOVA SENHA': '新密码',
      'SALVAR NOVA SENHA': '保存新密码',
      'RESUMO': '概览',
      'PERFIL': '资料',
      'CARTEIRA': '钱包',
      'IMPULSO': '助推',
      'MOLDURAS': '头像框',
      'RANKING': '排行榜',
      'SAIR': '退出',
      'ATUALIZAR': '刷新',
      'Aguardando...': '等待中...',
      'ESTIMATIVA ACUMULADA (USD)': '累计预估 (USD)',
      'DIAMANTES': '钻石',
      'TEMPO TRANSMITIDO': '直播时长',
      'HORAS VÁLIDAS': '有效小时',
      'DIAS DE LIVE': '直播天数',
      'DESEMPENHO': '表现',
      'Diamantes': '钻石',
      'Horas': '小时',
      '7 dias': '7 天',
      '30 dias': '30 天',
      'HISTÓRICO DIÁRIO': '每日记录',
      'Data': '日期',
      'Status': '状态',
      'Monitoramento de Desempenho': '表现监控',
      'DADOS DE RECEBIMENTO': '收款资料',
      'TIPO DE CHAVE PIX': 'PIX 密钥类型',
      'Selecione o tipo': '选择类型',
      'CHAVE PIX': 'PIX 密钥',
      'SEGURANÇA': '安全',
      'MODIFICAR SENHA': '修改密码',
      '(opcional)': '（可选）',
      '1 Letra Maiúscula': '1 个大写字母',
      '1 Número': '1 个数字',
      'Saldo Disponível': '可用余额',
      'Nenhum saque pendente': '没有待处理提现',
      'HISTÓRICO': '历史',
      'TOTAL RECEBIDO': '总收入',
      'TOTAL SACADO': '总提现',
      'SOLICITAR SAQUE': '申请提现',
      'MEUS SAQUES': '我的提现',
      'HISTÓRICO DE MOVIMENTAÇÕES': '交易记录',
      'VOLTAR AO PAINEL': '返回面板',
      'MARCAR TODOS COMO LIDOS': '全部标为已读',
      'Abrir no Kwai': '在 Kwai 打开',
      'Fechar': '关闭',
      'Todos': '全部',
      'A procurar transmissões ao vivo...': '正在搜索直播...',
      'A CARREGAR LIVE...': '正在加载直播...',
      'Entrar na Agência': '加入公会',
      'Tutoriais': '教程',
      'PK Interno': '内部 PK',
      'Portfólio': '作品集',
      'Políticas': '政策',
      'Política Host': '主播政策',
      'Benefícios': '福利',
      'Suporte': '支持',
      'Início': '首页',
      'Recarga': '充值',
      'Termos': '条款',
      'Área do Streamer': '主播区域'
    }
  };

  const extraAutoText = {
    en: {
      'Links Rápidos': 'Quick links',
      'Redes Sociais': 'Social media',
      'Política de Privacidade': 'Privacy Policy',
      'Todos os direitos reservados': 'All rights reserved',
      'Agência oficial Kwai': 'Official Kwai agency',
      'Como Aceitar Convite': 'How to accept the invite',
      'Como Efetuar Saque': 'How to request a withdrawal',
      'Clique para ver o tutorial': 'Click to view the tutorial',
      'Benefícios Exclusivos': 'Exclusive benefits',
      'Políticas DMaior': 'DMaior Policies',
      'Pagamentos e Políticas Kwai': 'Kwai payments and policies',
      'Insira a Senha': 'Enter the password',
      'Senha incorreta. Tente novamente.': 'Incorrect password. Try again.',
      'Regras e Informações': 'Rules and information',
      'Informações e Regras': 'Information and rules',
      'Informações': 'Information',
      'Período': 'Period',
      'Período Encerrado': 'Period ended',
      'Erro ao conectar no servidor.': 'Error connecting to the server.',
      'Erro ao carregar os dados.': 'Error loading data.',
      'Sem Nome': 'No name',
      'Verificado': 'Verified',
      'Verificado Premium': 'Premium verified',
      'Carregando dados seguros...': 'Loading secure data...',
      'Nenhum dado processado.': 'No processed data.',
      'Sem confrontos disponíveis.': 'No matchups available.',
      'Ranking Geral': 'Overall ranking',
      'Confrontos': 'Matchups',
      'Recarga Kwai': 'Kwai top-up',
      'Online': 'Online',
      'Como encontrar meu ID?': 'How to find my ID?',
      'Onde fica meu ID?': 'Where is my ID?',
      'Conexão criptografada · DMaior Agency': 'Encrypted connection · DMaior Agency',
      'Erro ao validar ID. Verifique sua conexão e tente novamente.': 'Error validating ID. Check your connection and try again.',
      'Sim, sou eu': 'Yes, it is me',
      'Não sou eu': 'It is not me',
      'Quantidade de Diamantes': 'Diamond amount',
      'Continuar →': 'Continue →',
      'Gerar PIX →': 'Generate PIX →',
      'Pagamento PIX': 'PIX payment',
      'Abrir Pagamento': 'Open payment',
      'Aguardando pagamento': 'Waiting for payment',
      'Pagar Agora': 'Pay now',
      'Clique em "Pagar Agora" e conclua o PIX': 'Click "Pay now" and complete the PIX',
      'Em processamento': 'Processing',
      'Pagamento confirmado! Creditando diamantes...': 'Payment confirmed! Crediting diamonds...',
      'Recarga concluída!': 'Top-up complete!',
      'Diamantes creditados na sua conta 💎': 'Diamonds credited to your account 💎',
      'PIX expirado': 'PIX expired',
      'Inicie uma nova recarga.': 'Start a new top-up.',
      'Nova Recarga': 'New top-up',
      'Preencha seus dados no formulário acima': 'Fill in your details in the form above',
      'Carregando...': 'Loading...',
      'Nenhum registro.': 'No records.',
      'Nenhuma movimentação ainda.': 'No transactions yet.',
      'Nenhuma solicitação ainda.': 'No requests yet.',
      'Erro ao carregar dados:': 'Error loading data:',
      'Erro ao carregar carteira': 'Error loading wallet',
      'Erro ao solicitar saque.': 'Error requesting withdrawal.',
      'Erro ao enviar código.': 'Error sending code.',
      'Processo recusado.': 'Process refused.',
      'Falha na atualizacao.': 'Update failed.',
      'UID não encontrado.': 'UID not found.',
      'Código inválido ou expirado.': 'Invalid or expired code.',
      'Carregando avisos...': 'Loading notices...',
      'Nenhum aviso no momento.': 'No notices right now.',
      'Não foi possível carregar os avisos.': 'Could not load notices.',
      'Últimos avisos': 'Latest notices',
      'VOLTAR': 'BACK',
      'Atualizar dados': 'Update data',
      'SALVANDO...': 'SAVING...',
      'BUSCANDO...': 'SEARCHING...',
      'ENVIANDO...': 'SENDING...',
      'PROCESSANDO...': 'PROCESSING...'
    },
    es: {
      'Links Rápidos': 'Enlaces rápidos',
      'Redes Sociais': 'Redes sociales',
      'Política de Privacidade': 'Política de privacidad',
      'Todos os direitos reservados': 'Todos los derechos reservados',
      'Agência oficial Kwai': 'Agencia oficial Kwai',
      'Como Aceitar Convite': 'Cómo aceptar la invitación',
      'Como Efetuar Saque': 'Cómo solicitar retiro',
      'Clique para ver o tutorial': 'Haz clic para ver el tutorial',
      'Benefícios Exclusivos': 'Beneficios exclusivos',
      'Políticas DMaior': 'Políticas DMaior',
      'Pagamentos e Políticas Kwai': 'Pagos y políticas Kwai',
      'Insira a Senha': 'Ingresa la contraseña',
      'Senha incorreta. Tente novamente.': 'Contraseña incorrecta. Intenta nuevamente.',
      'Regras e Informações': 'Reglas e información',
      'Informações e Regras': 'Información y reglas',
      'Informações': 'Información',
      'Período': 'Período',
      'Período Encerrado': 'Período finalizado',
      'Erro ao conectar no servidor.': 'Error al conectar con el servidor.',
      'Erro ao carregar os dados.': 'Error al cargar los datos.',
      'Sem Nome': 'Sin nombre',
      'Verificado': 'Verificado',
      'Verificado Premium': 'Verificado Premium',
      'Carregando dados seguros...': 'Cargando datos seguros...',
      'Nenhum dado processado.': 'Ningún dato procesado.',
      'Sem confrontos disponíveis.': 'No hay enfrentamientos disponibles.',
      'Ranking Geral': 'Ranking general',
      'Confrontos': 'Enfrentamientos',
      'Recarga Kwai': 'Recarga Kwai',
      'Online': 'En línea',
      'Como encontrar meu ID?': '¿Cómo encontrar mi ID?',
      'Onde fica meu ID?': '¿Dónde está mi ID?',
      'Conexão criptografada · DMaior Agency': 'Conexión cifrada · DMaior Agency',
      'Erro ao validar ID. Verifique sua conexão e tente novamente.': 'Error al validar ID. Verifica tu conexión e intenta nuevamente.',
      'Sim, sou eu': 'Sí, soy yo',
      'Não sou eu': 'No soy yo',
      'Quantidade de Diamantes': 'Cantidad de Diamantes',
      'Continuar →': 'Continuar →',
      'Gerar PIX →': 'Generar PIX →',
      'Pagamento PIX': 'Pago PIX',
      'Abrir Pagamento': 'Abrir pago',
      'Aguardando pagamento': 'Esperando pago',
      'Pagar Agora': 'Pagar ahora',
      'Clique em "Pagar Agora" e conclua o PIX': 'Haz clic en "Pagar ahora" y completa el PIX',
      'Em processamento': 'En procesamiento',
      'Pagamento confirmado! Creditando diamantes...': '¡Pago confirmado! Acreditando diamantes...',
      'Recarga concluída!': '¡Recarga concluida!',
      'Diamantes creditados na sua conta 💎': 'Diamantes acreditados en tu cuenta 💎',
      'PIX expirado': 'PIX expirado',
      'Inicie uma nova recarga.': 'Inicia una nueva recarga.',
      'Nova Recarga': 'Nueva recarga',
      'Preencha seus dados no formulário acima': 'Completa tus datos en el formulario de arriba',
      'Carregando...': 'Cargando...',
      'Nenhum registro.': 'Ningún registro.',
      'Nenhuma movimentação ainda.': 'Ningún movimiento aún.',
      'Nenhuma solicitação ainda.': 'Ninguna solicitud aún.',
      'Erro ao carregar dados:': 'Error al cargar datos:',
      'Erro ao carregar carteira': 'Error al cargar cartera',
      'Erro ao solicitar saque.': 'Error al solicitar retiro.',
      'Erro ao enviar código.': 'Error al enviar código.',
      'Processo recusado.': 'Proceso rechazado.',
      'Falha na atualizacao.': 'Error en la actualización.',
      'UID não encontrado.': 'UID no encontrado.',
      'Código inválido ou expirado.': 'Código inválido o expirado.',
      'Carregando avisos...': 'Cargando avisos...',
      'Nenhum aviso no momento.': 'No hay avisos por ahora.',
      'Não foi possível carregar os avisos.': 'No fue posible cargar los avisos.',
      'Últimos avisos': 'Últimos avisos',
      'VOLTAR': 'VOLVER',
      'Atualizar dados': 'Actualizar datos',
      'SALVANDO...': 'GUARDANDO...',
      'BUSCANDO...': 'BUSCANDO...',
      'ENVIANDO...': 'ENVIANDO...',
      'PROCESSANDO...': 'PROCESANDO...'
    },
    zh: {
      'Links Rápidos': '快捷链接',
      'Redes Sociais': '社交媒体',
      'Política de Privacidade': '隐私政策',
      'Todos os direitos reservados': '保留所有权利',
      'Agência oficial Kwai': 'Kwai 官方公会',
      'Como Aceitar Convite': '如何接受邀请',
      'Como Efetuar Saque': '如何提现',
      'Clique para ver o tutorial': '点击查看教程',
      'Benefícios Exclusivos': '专属福利',
      'Políticas DMaior': 'DMaior 政策',
      'Pagamentos e Políticas Kwai': 'Kwai 付款和政策',
      'Insira a Senha': '输入密码',
      'Senha incorreta. Tente novamente.': '密码错误，请重试。',
      'Regras e Informações': '规则和信息',
      'Informações e Regras': '信息和规则',
      'Informações': '信息',
      'Período': '周期',
      'Período Encerrado': '周期已结束',
      'Erro ao conectar no servidor.': '连接服务器出错。',
      'Erro ao carregar os dados.': '数据加载失败。',
      'Sem Nome': '无名称',
      'Verificado': '已认证',
      'Verificado Premium': '高级认证',
      'Carregando dados seguros...': '正在加载安全数据...',
      'Nenhum dado processado.': '没有已处理的数据。',
      'Sem confrontos disponíveis.': '暂无可用对战。',
      'Ranking Geral': '总排名',
      'Confrontos': '对战',
      'Recarga Kwai': 'Kwai 充值',
      'Online': '在线',
      'Como encontrar meu ID?': '如何找到我的 ID？',
      'Onde fica meu ID?': '我的 ID 在哪里？',
      'Conexão criptografada · DMaior Agency': '加密连接 · DMaior Agency',
      'Erro ao validar ID. Verifique sua conexão e tente novamente.': 'ID 验证失败，请检查网络后重试。',
      'Sim, sou eu': '是我',
      'Não sou eu': '不是我',
      'Quantidade de Diamantes': '钻石数量',
      'Continuar →': '继续 →',
      'Gerar PIX →': '生成 PIX →',
      'Pagamento PIX': 'PIX 支付',
      'Abrir Pagamento': '打开支付',
      'Aguardando pagamento': '等待支付',
      'Pagar Agora': '立即支付',
      'Clique em "Pagar Agora" e conclua o PIX': '点击“立即支付”并完成 PIX',
      'Em processamento': '处理中',
      'Pagamento confirmado! Creditando diamantes...': '支付已确认，正在发放钻石...',
      'Recarga concluída!': '充值完成！',
      'Diamantes creditados na sua conta 💎': '钻石已到账 💎',
      'PIX expirado': 'PIX 已过期',
      'Inicie uma nova recarga.': '请开始新的充值。',
      'Nova Recarga': '新充值',
      'Preencha seus dados no formulário acima': '请在上方表单填写资料',
      'Carregando...': '加载中...',
      'Nenhum registro.': '没有记录。',
      'Nenhuma movimentação ainda.': '暂无交易。',
      'Nenhuma solicitação ainda.': '暂无申请。',
      'Erro ao carregar dados:': '加载数据出错：',
      'Erro ao carregar carteira': '加载钱包出错',
      'Erro ao solicitar saque.': '申请提现出错。',
      'Erro ao enviar código.': '发送验证码出错。',
      'Processo recusado.': '流程被拒绝。',
      'Falha na atualizacao.': '更新失败。',
      'UID não encontrado.': '未找到 UID。',
      'Código inválido ou expirado.': '验证码无效或已过期。',
      'Carregando avisos...': '正在加载公告...',
      'Nenhum aviso no momento.': '当前没有公告。',
      'Não foi possível carregar os avisos.': '无法加载公告。',
      'Últimos avisos': '最新公告',
      'VOLTAR': '返回',
      'Atualizar dados': '更新资料',
      'SALVANDO...': '正在保存...',
      'BUSCANDO...': '正在搜索...',
      'ENVIANDO...': '正在发送...',
      'PROCESSANDO...': '处理中...'
    }
  };

  Object.keys(extraAutoText).forEach(lang => {
    autoText[lang] = Object.assign(autoText[lang] || {}, extraAutoText[lang]);
  });

  function getLang() {
    try {
      const lang = localStorage.getItem(LANG_KEY) || DEFAULT_LANG;
      return dict[lang] ? lang : DEFAULT_LANG;
    } catch (_) {
      return DEFAULT_LANG;
    }
  }

  function getFontSize() {
    try {
      const size = localStorage.getItem(FONT_KEY) || DEFAULT_FONT;
      return fonts[size] ? size : DEFAULT_FONT;
    } catch (_) {
      return DEFAULT_FONT;
    }
  }

  function getTheme() {
    try {
      const theme = localStorage.getItem(THEME_KEY) || 'original';
      return THEME_META[theme] ? theme : 'original';
    } catch (_) {
      return 'original';
    }
  }

  function upsertMeta(name, content) {
    if (!document.head) return;
    let meta = document.querySelector(`meta[name="${name}"]`);
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', name);
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', content);
  }

  function applyThemeMeta() {
    const meta = THEME_META[getTheme()] || THEME_META.original;
    upsertMeta('theme-color', meta.color);
    upsertMeta('color-scheme', meta.scheme === 'light' ? 'light dark' : 'dark light');
    document.documentElement.style.colorScheme = meta.scheme;
  }

  function t(key, params) {
    const lang = getLang();
    let value = (dict[lang] && dict[lang][key]) || dict[DEFAULT_LANG][key] || key;
    if (params) {
      Object.keys(params).forEach(name => {
        value = value.replace(new RegExp(`\\{${name}\\}`, 'g'), params[name]);
      });
    }
    return value;
  }

  function normalizeText(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function phraseMap(lang) {
    const map = Object.assign({}, autoText[lang] || {});
    const base = dict[DEFAULT_LANG] || {};
    const target = dict[lang] || base;
    Object.keys(base).forEach(key => {
      if (typeof base[key] === 'string' && typeof target[key] === 'string') {
        map[normalizeText(base[key])] = target[key];
      }
    });
    return map;
  }

  function shouldSkipNode(node) {
    const parent = node.parentElement;
    if (!parent) return true;
    if (parent.closest('[data-no-i18n]')) return true;
    if (parent.closest('[data-pref-lang-select]')) return true;
    const tag = parent.tagName;
    return ['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'CODE', 'PRE', 'CANVAS'].includes(tag);
  }

  function syncLanguageSelectLabels(root) {
    const scope = root || document;
    if (!scope.querySelectorAll) return;
    const labels = {
      'pt-BR': 'Português BR',
      en: 'English',
      es: 'Español',
      zh: '中文'
    };
    scope.querySelectorAll('[data-pref-lang-select]').forEach(select => {
      Array.from(select.options || []).forEach(option => {
        if (labels[option.value]) option.textContent = labels[option.value];
      });
    });
  }

  function translateTextNode(node, map) {
    if (shouldSkipNode(node)) return;
    const raw = node.nodeValue;
    const trimmed = normalizeText(raw);
    if (!trimmed) return;
    if (!textOriginals.has(node)) textOriginals.set(node, raw);
    const original = normalizeText(textOriginals.get(node));
    const translated = map[original] || map[trimmed];
    if (!translated) return;
    const leading = raw.match(/^\s*/)?.[0] || '';
    const trailing = raw.match(/\s*$/)?.[0] || '';
    const next = leading + translated + trailing;
    if (node.nodeValue !== next) node.nodeValue = next;
  }

  function restoreAutoText(root) {
    const scope = root || document;
    const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(node => {
      if (textOriginals.has(node) && node.nodeValue !== textOriginals.get(node)) {
        node.nodeValue = textOriginals.get(node);
      }
    });
    if (scope.querySelectorAll) {
      scope.querySelectorAll('[data-dm-i18n-placeholder-original], [data-dm-i18n-title-original], [data-dm-i18n-aria-label-original]').forEach(el => {
        if (el.hasAttribute('data-dm-i18n-placeholder-original')) el.setAttribute('placeholder', el.getAttribute('data-dm-i18n-placeholder-original'));
        if (el.hasAttribute('data-dm-i18n-title-original')) el.setAttribute('title', el.getAttribute('data-dm-i18n-title-original'));
        if (el.hasAttribute('data-dm-i18n-aria-label-original')) el.setAttribute('aria-label', el.getAttribute('data-dm-i18n-aria-label-original'));
      });
    }
  }

  function translateAttr(el, attr, map) {
    if (!el.hasAttribute(attr)) return;
    const key = `data-dm-i18n-${attr}-original`;
    if (!el.hasAttribute(key)) el.setAttribute(key, el.getAttribute(attr) || '');
    const original = normalizeText(el.getAttribute(key));
    const translated = map[original];
    if (translated) el.setAttribute(attr, translated);
  }

  function autoTranslate(root) {
    const lang = getLang();
    if (lang === DEFAULT_LANG) {
      restoreAutoText(root);
      return;
    }
    const map = phraseMap(lang);
    const scope = root || document;
    const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(node => translateTextNode(node, map));

    if (scope.querySelectorAll) {
      scope.querySelectorAll('input[placeholder], textarea[placeholder], [title], [aria-label]').forEach(el => {
        translateAttr(el, 'placeholder', map);
        translateAttr(el, 'title', map);
        translateAttr(el, 'aria-label', map);
      });
    }
  }

  function bindTree(root) {
    bind(root || document, false);
    const scope = root || document;
    observeScope(scope);
    if (scope.querySelectorAll) {
      scope.querySelectorAll('*').forEach(el => {
        if (el.shadowRoot) bindTree(el.shadowRoot);
      });
    }
  }

  function observeScope(scope) {
    if (!observer || !scope) return;
    const target = scope === document ? document.body : scope;
    if (!target || observedRoots.has(target)) return;
    try {
      observer.observe(target, { childList: true, subtree: true, characterData: true });
      observedRoots.add(target);
    } catch (_) {}
  }

  function scheduleBind() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      bindTree(document);
    });
  }

  function applyFontSize(size) {
    const chosen = fonts[size] ? size : getFontSize();
    document.documentElement.dataset.fontSize = chosen;
    document.documentElement.style.setProperty('--dm-font-scale', fonts[chosen].scale);
  }

  function setFontSize(size) {
    const chosen = fonts[size] ? size : DEFAULT_FONT;
    try { localStorage.setItem(FONT_KEY, chosen); } catch (_) {}
    applyFontSize(chosen);
    window.dispatchEvent(new CustomEvent('dmaior:preferences', { detail: getState() }));
  }

  function getFontFamily() {
    try {
      const family = localStorage.getItem(FONT_FAMILY_KEY) || DEFAULT_FONT_FAMILY;
      return fontFamilies[family] ? family : DEFAULT_FONT_FAMILY;
    } catch (_) {
      return DEFAULT_FONT_FAMILY;
    }
  }

  const _loadedFonts = new Set(['dmaior', 'sistema']);
  function applyFontFamily(family) {
    const chosen = fontFamilies[family] ? family : getFontFamily();
    const fam = fontFamilies[chosen];
    document.documentElement.dataset.fontFamily = chosen;
    document.documentElement.style.setProperty('--dm-font-title', fam.title);
    document.documentElement.style.setProperty('--dm-font-body',  fam.body);
    if (!_loadedFonts.has(chosen)) {
      _loadedFonts.add(chosen);
      const fontMap = {
        inter:       'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap',
        manrope:     'https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700&display=swap',
        montserrat:  'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700&display=swap',
        opensans:    'https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600;700&display=swap',
        plusjakarta: 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700&display=swap',
        poppins:     'https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap',
      };
      const url = fontMap[chosen];
      if (url && !document.querySelector(`link[href*="${chosen}"]`)) {
        const link = document.createElement('link');
        link.rel  = 'stylesheet';
        link.href = url;
        document.head.appendChild(link);
      }
    }
  }

  function setFontFamily(family) {
    const chosen = fontFamilies[family] ? family : DEFAULT_FONT_FAMILY;
    try { localStorage.setItem(FONT_FAMILY_KEY, chosen); } catch (_) {}
    applyFontFamily(chosen);
    window.dispatchEvent(new CustomEvent('dmaior:preferences', { detail: getState() }));
  }

  function setLanguage(lang) {
    const chosen = dict[lang] ? lang : DEFAULT_LANG;
    try { localStorage.setItem(LANG_KEY, chosen); } catch (_) {}
    document.documentElement.lang = chosen;
    bindTree(document);
    window.dispatchEvent(new CustomEvent('dmaior:preferences', { detail: getState() }));
  }

  function bind(root, notifyDone = true) {
    const scope = root || document;
    const lang = getLang();
    document.documentElement.lang = lang;

    scope.querySelectorAll('[data-i18n]').forEach(el => {
      el.textContent = t(el.dataset.i18n);
    });
    scope.querySelectorAll('[data-i18n-html]').forEach(el => {
      el.innerHTML = t(el.dataset.i18nHtml);
    });
    scope.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      el.setAttribute('placeholder', t(el.dataset.i18nPlaceholder));
    });
    scope.querySelectorAll('[data-i18n-title]').forEach(el => {
      el.setAttribute('title', t(el.dataset.i18nTitle));
    });
    scope.querySelectorAll('[data-i18n-aria]').forEach(el => {
      el.setAttribute('aria-label', t(el.dataset.i18nAria));
    });
    scope.querySelectorAll('[data-pref-font-select]').forEach(el => {
      el.value = getFontSize();
    });
    scope.querySelectorAll('[data-pref-lang-select]').forEach(el => {
      el.value = getLang();
    });
    syncLanguageSelectLabels(scope);

    autoTranslate(scope);
    if (notifyDone && window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent('dmaior:i18n-bound', { detail: getState() }));
    }
  }

  function getState() {
    return { language: getLang(), fontSize: getFontSize(), fontFamily: getFontFamily(), theme: getTheme() };
  }

  function init() {
    applyFontSize(getFontSize());
    applyFontFamily(getFontFamily());
    applyThemeMeta();
    document.documentElement.lang = getLang();
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        bindTree(document);
        startObserver();
      }, { once: true });
    } else {
      bindTree(document);
      startObserver();
    }
    window.addEventListener('storage', event => {
      if (event.key === FONT_KEY)        applyFontSize(getFontSize());
      if (event.key === FONT_FAMILY_KEY) applyFontFamily(getFontFamily());
      if (event.key === LANG_KEY)        bindTree(document);
      if (event.key === THEME_KEY)       applyThemeMeta();
    });
    window.addEventListener('dmaior:tema', applyThemeMeta);
  }

  function startObserver() {
    if (observer || !document.body) return;
    observer = new MutationObserver(mutations => {
      if (getLang() === DEFAULT_LANG) return;
      for (const mutation of mutations) {
        if (mutation.type === 'childList' && mutation.addedNodes.length) {
          scheduleBind();
          return;
        }
        if (mutation.type === 'characterData') {
          scheduleBind();
          return;
        }
      }
    });
    observeScope(document);
    setTimeout(() => bindTree(document), 100);
    setTimeout(() => bindTree(document), 600);
    setTimeout(() => bindTree(document), 1600);
  }

  window.DMaiorPrefs = {
    t,
    bind,
    bindTree,
    init,
    getState,
    getLang,
    getFontSize,
    getFontFamily,
    getTheme,
    setLanguage,
    setFontSize,
    setFontFamily,
    applyThemeMeta,
    languages: Object.keys(dict).map(code => ({ code, name: dict[code].languageName })),
    fontSizes: Object.keys(fonts),
    fontFamilyOptions: Object.keys(fontFamilies)
  };

  init();
})();
