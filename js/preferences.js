(function () {
  'use strict';

  const LANG_KEY = 'dm_idioma';
  const FONT_KEY = 'dm_tamanho_texto';
  const DEFAULT_LANG = 'pt-BR';
  const DEFAULT_FONT = 'normal';

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
      frameNote: 'Selecione a qualidade e depois use o botão de download. Os arquivos são PNG sem perda. As opções 16K e 22K são recomendadas apenas em computadores com boa memória.'
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
      frameNote: 'Select the quality and then use the download button. Files are lossless PNG. 16K and 22K are recommended only for computers with enough memory.'
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
      frameNote: 'Selecciona la calidad y luego usa el botón de descarga. Los archivos son PNG sin pérdida. 16K y 22K se recomiendan solo en computadoras con buena memoria.'
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
      frameNote: '选择质量后点击下载按钮。文件为无损 PNG。16K 和 22K 仅建议在内存较好的电脑上使用。'
    }
  };

  const fonts = {
    normal: { scale: '1' },
    grande: { scale: '1.12' },
    extra: { scale: '1.22' }
  };

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

  function setLanguage(lang) {
    const chosen = dict[lang] ? lang : DEFAULT_LANG;
    try { localStorage.setItem(LANG_KEY, chosen); } catch (_) {}
    document.documentElement.lang = chosen;
    bind(document);
    window.dispatchEvent(new CustomEvent('dmaior:preferences', { detail: getState() }));
  }

  function bind(root) {
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
  }

  function getState() {
    return { language: getLang(), fontSize: getFontSize() };
  }

  function init() {
    applyFontSize(getFontSize());
    document.documentElement.lang = getLang();
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => bind(document), { once: true });
    } else {
      bind(document);
    }
    window.addEventListener('storage', event => {
      if (event.key === FONT_KEY) applyFontSize(getFontSize());
      if (event.key === LANG_KEY) bind(document);
    });
  }

  window.DMaiorPrefs = {
    t,
    bind,
    init,
    getState,
    getLang,
    getFontSize,
    setLanguage,
    setFontSize,
    languages: Object.keys(dict).map(code => ({ code, name: dict[code].languageName })),
    fontSizes: Object.keys(fonts)
  };

  init();
})();
