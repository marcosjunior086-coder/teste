/* eslint-env browser */

const DMAIOR_COURSES = [
  {
    id: 'guia-streamer',
    title: 'Guia de Streamer',
    coverLabel: 'Guia de Streamers',
    duration: '1h',
    deadline: '1 dia',
    audience: 'Streamers, criadores e influenciadores',
    objective: 'Nosso curso foi criado para ajudar streamers a aprimorar suas transmissões ao vivo no Kwai, oferecendo orientações sobre apresentação, configuração do ambiente e uso dos melhores recursos para lives.',
    about: 'O conteúdo foi organizado para apoiar criadores em oratória, engajamento com o público, qualidade de transmissão e uso prático de ferramentas digitais para evoluir com mais segurança.',
    certificateUrl: 'https://docs.google.com/forms/d/e/1FAIpQLSfFeEwVERLGSdQabocPoMuXWWh0NrrZhLvytgLlMS-9wfM_AA/viewform',
    lessons: [
      {
        id: 'aula-1',
        title: 'Guia Streamer',
        summary: 'Primeiros passos, postura, rotina e boas práticas para começar com clareza.',
        vimeoUrl: 'https://player.vimeo.com/video/1128625974?title=0&byline=0&portrait=0&badge=0&autopause=0&player_id=0&app_id=58479'
      },
      {
        id: 'aula-2',
        title: 'Oratoria e Comunicacao',
        summary: 'Como se comunicar melhor, manter o público presente e conduzir a live.',
        vimeoUrl: 'https://player.vimeo.com/video/1128642404?title=0&byline=0&portrait=0&badge=0&autopause=0&player_id=0&app_id=58479'
      },
      {
        id: 'aula-3',
        title: 'Ferramentas Digitais',
        summary: 'Recursos e ferramentas para melhorar organização, visual e acompanhamento.',
        vimeoUrl: 'https://player.vimeo.com/video/1128681490?title=0&byline=0&portrait=0&badge=0&autopause=0&player_id=0&app_id=58479'
      }
    ]
  }
];

class DMaiorCursos extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.course = DMAIOR_COURSES[0];
    this.view = 'home';
    this.lessonIndex = 0;
    this.player = null;
    this._prefsHandler = () => this.render();
  }

  connectedCallback() {
    this.render();
    window.addEventListener('dmaior:preferences', this._prefsHandler);
  }

  disconnectedCallback() {
    window.removeEventListener('dmaior:preferences', this._prefsHandler);
    this._destroyPlayer();
  }

  _t(key) {
    const lang = window.DMaiorPrefs?.getLang?.() || 'pt-BR';
    const dict = {
      'pt-BR': {
        freeCourses: 'Cursos online gratuitos!',
        heroText: 'O seu sucesso começa aqui. Aprimore suas habilidades com cursos rápidos e gratuitos, voltados ao crescimento do streaming e ao desenvolvimento dentro da plataforma.',
        start: 'Começar',
        continue: 'Continuar',
        format: 'Formato',
        online: 'Online',
        duration: 'Duração',
        deadline: 'Prazo de conclusão',
        audience: 'A quem se destina',
        objective: 'Objetivo',
        about: 'Sobre o curso',
        lessons: 'Aulas',
        certificate: 'Receber Certificado',
        certificateText: 'Para receber seu certificado de participação, conclua todas as aulas e depois preencha a avaliação.',
        evaluation: 'Avaliação',
        locked: 'Conclua todas as aulas para liberar a avaliacao.',
        complete: 'Concluido',
        pending: 'Pendente',
        progress: 'Progresso',
        backCourses: 'Voltar aos cursos',
        backCourse: 'Voltar ao curso',
        markDone: 'Marcar aula como concluída',
        doneLesson: 'Aula concluída',
        nextLesson: 'Próxima aula',
        finishCourse: 'Finalizar curso',
        videoSoon: 'Adicione o link do Vimeo desta aula no arquivo cursos.js.',
        important: 'Importante',
        certNote: 'Este certificado é emitido pela DMaior Agency como comprovação interna de participação e treinamento.',
        noMec: 'Não é homologado pelo MEC ou por qualquer órgão governamental. Trata-se de um documento interno da agência.'
      },
      en: {
        freeCourses: 'Free online courses!',
        heroText: 'Your success starts here. Improve your skills with quick, free courses focused on streaming growth and platform development.',
        start: 'Start',
        continue: 'Continue',
        format: 'Format',
        online: 'Online',
        duration: 'Duration',
        deadline: 'Completion deadline',
        audience: 'Who it is for',
        objective: 'Objective',
        about: 'About the course',
        lessons: 'Lessons',
        certificate: 'Get certificate',
        certificateText: 'To receive your participation certificate, complete all lessons and then fill out the evaluation.',
        evaluation: 'Evaluation',
        locked: 'Complete every lesson to unlock the evaluation.',
        complete: 'Completed',
        pending: 'Pending',
        progress: 'Progress',
        backCourses: 'Back to courses',
        backCourse: 'Back to course',
        markDone: 'Mark lesson complete',
        doneLesson: 'Lesson completed',
        nextLesson: 'Next lesson',
        finishCourse: 'Finish course',
        videoSoon: 'Add this lesson Vimeo link in cursos.js.',
        important: 'Important',
        certNote: 'This certificate is issued by DMaior Agency as internal proof of participation and training.',
        noMec: 'It is not certified by MEC or any government institution. It is an internal agency document.'
      },
      es: {
        freeCourses: 'Cursos online gratuitos!',
        heroText: 'Tu exito empieza aqui. Mejora tus habilidades con cursos rapidos y gratuitos enfocados en el crecimiento del streaming.',
        start: 'Comenzar',
        continue: 'Continuar',
        format: 'Formato',
        online: 'Online',
        duration: 'Duracion',
        deadline: 'Plazo de conclusion',
        audience: 'A quien se dirige',
        objective: 'Objetivo',
        about: 'Sobre el curso',
        lessons: 'Clases',
        certificate: 'Recibir certificado',
        certificateText: 'Para recibir tu certificado, completa todas las clases y luego llena la evaluacion.',
        evaluation: 'Evaluacion',
        locked: 'Completa todas las clases para liberar la evaluacion.',
        complete: 'Concluido',
        pending: 'Pendiente',
        progress: 'Progreso',
        backCourses: 'Volver a cursos',
        backCourse: 'Volver al curso',
        markDone: 'Marcar clase concluida',
        doneLesson: 'Clase concluida',
        nextLesson: 'Siguiente clase',
        finishCourse: 'Finalizar curso',
        videoSoon: 'Agrega el link de Vimeo de esta clase en cursos.js.',
        important: 'Importante',
        certNote: 'Este certificado es emitido por DMaior Agency como comprobante interno de participacion y entrenamiento.',
        noMec: 'No esta homologado por el MEC ni por ningun organismo gubernamental. Es un documento interno de la agencia.'
      },
      zh: {
        freeCourses: '免费在线课程',
        heroText: '成功从这里开始。通过快速免费的课程提升直播技能并在平台内成长。',
        start: '开始',
        continue: '继续',
        format: '形式',
        online: '在线',
        duration: '时长',
        deadline: '完成期限',
        audience: '适合人群',
        objective: '目标',
        about: '课程介绍',
        lessons: '课程',
        certificate: '领取证书',
        certificateText: '完成所有课程后填写评估表即可领取参与证书。',
        evaluation: '评估',
        locked: '完成所有课程后解锁评估。',
        complete: '已完成',
        pending: '待完成',
        progress: '进度',
        backCourses: '返回课程',
        backCourse: '返回课程详情',
        markDone: '标记为完成',
        doneLesson: '课程已完成',
        nextLesson: '下一课',
        finishCourse: '完成课程',
        videoSoon: '请在 cursos.js 中添加本课 Vimeo 链接。',
        important: '重要',
        certNote: '该证书由 DMaior Agency 作为内部参与和培训证明发放。',
        noMec: '该证书不是政府或官方学历认证文件，仅作为机构内部文件。'
      }
    };
    return (dict[lang] && dict[lang][key]) || dict['pt-BR'][key] || key;
  }

  _progress() {
    try {
      return JSON.parse(localStorage.getItem('dm_cursos_progress') || '{}');
    } catch (_) {
      return {};
    }
  }

  _saveProgress(progress) {
    localStorage.setItem('dm_cursos_progress', JSON.stringify(progress));
  }

  _isDone(lessonId) {
    return !!this._progress()[`${this.course.id}:${lessonId}`];
  }

  _completedCount() {
    return this.course.lessons.filter(lesson => this._isDone(lesson.id)).length;
  }

  _isCourseDone() {
    return this._completedCount() >= this.course.lessons.length;
  }

  _completeLesson(lessonId) {
    const progress = this._progress();
    progress[`${this.course.id}:${lessonId}`] = {
      done: true,
      completedAt: new Date().toISOString()
    };
    this._saveProgress(progress);
    this.render();
  }

  _open(view, lessonIndex = 0) {
    this.view = view;
    this.lessonIndex = lessonIndex;
    this.render();
    setTimeout(() => this.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
  }

  _embedUrl(raw) {
    if (!raw) return '';
    try {
      const url = new URL(raw);
      if (url.hostname.includes('player.vimeo.com')) return url.href;
      const parts = url.pathname.split('/').filter(Boolean);
      const id = parts.find(part => /^\d+$/.test(part));
      if (!id) return '';
      const hash = parts.find(part => /^[a-zA-Z0-9]{6,}$/.test(part) && part !== id);
      const params = new URLSearchParams();
      if (hash) params.set('h', hash);
      params.set('badge', '0');
      params.set('autopause', '0');
      return `https://player.vimeo.com/video/${id}${params.toString() ? `?${params}` : ''}`;
    } catch (_) {
      return '';
    }
  }

  _destroyPlayer() {
    try { this.player?.unload?.(); } catch (_) {}
    this.player = null;
  }

  _setupVimeo(lesson) {
    this._destroyPlayer();
    const iframe = this.shadowRoot.getElementById('course-video');
    if (!iframe || !lesson?.vimeoUrl) return;
    const init = () => {
      try {
        this.player = new window.Vimeo.Player(iframe);
        this.player.on('ended', () => this._completeLesson(lesson.id));
      } catch (_) {}
    };
    if (window.Vimeo?.Player) return init();
    const script = document.createElement('script');
    script.src = 'https://player.vimeo.com/api/player.js';
    script.onload = init;
    document.head.appendChild(script);
  }

  _home() {
    const count = this._completedCount();
    const total = this.course.lessons.length;
    const percent = Math.round((count / total) * 100);
    return `
      <section class="hero">
        <div class="hero-copy">
          <h1>${this._t('freeCourses')}</h1>
          <p>${this._t('heroText')}</p>
        </div>
        <button class="course-card" data-action="course" type="button" aria-label="${this.course.title}">
          <div class="course-cover">
            <span class="brand-mark">DM</span>
            <span class="cover-pill">Curso</span>
            <strong>${this.course.coverLabel}</strong>
            <small>Carga horária: ${this.course.duration}</small>
            <div class="cover-shapes"><span></span><span></span></div>
          </div>
          <div class="course-foot">
            <strong>${this.course.title}</strong>
            <span class="progress-mini"><span style="width:${percent}%"></span></span>
            <em>${count}/${total} ${this._t('lessons').toLowerCase()}</em>
            <span class="start-btn">${count ? this._t('continue') : this._t('start')}</span>
          </div>
        </button>
      </section>`;
  }

  _course() {
    const count = this._completedCount();
    const total = this.course.lessons.length;
    const percent = Math.round((count / total) * 100);
    const done = this._isCourseDone();
    return `
      <section class="course-detail">
        <button class="ghost-btn" data-action="home" type="button">${this._t('backCourses')}</button>
        <div class="course-grid">
          <aside class="info-panel">
            <div class="info-pair"><span>${this._icon('file')}${this._t('format')}</span><strong>${this._t('online')}</strong></div>
            <div class="info-pair"><span>${this._icon('clock')}${this._t('duration')}</span><strong>${this.course.duration}</strong></div>
            <div class="info-pair"><span>${this._icon('calendar')}${this._t('deadline')}</span><strong>${this.course.deadline}</strong></div>
            <div class="info-pair wide"><span>${this._icon('user')}${this._t('audience')}</span><strong>${this.course.audience}</strong></div>
            <div class="progress-box">
              <div><span>${this._t('progress')}</span><strong>${percent}%</strong></div>
              <span class="progress-bar"><span style="width:${percent}%"></span></span>
            </div>
          </aside>
          <article class="text-panel">
            <h2>${this._t('objective')}</h2>
            <p>${this.course.objective}</p>
            <h2>${this._t('about')}</h2>
            <p>${this.course.about}</p>
          </article>
        </div>
        <div class="lessons-block">
          <h2>${this._t('lessons')}</h2>
          <div class="lesson-list">
            ${this.course.lessons.map((lesson, index) => `
              <button class="lesson-row ${this._isDone(lesson.id) ? 'done' : ''}" data-action="lesson" data-index="${index}" type="button">
                <span>Aula ${index + 1}</span>
                <strong>${lesson.title}</strong>
                <em>${this._isDone(lesson.id) ? this._t('complete') : this._t('pending')}</em>
              </button>`).join('')}
          </div>
        </div>
        <div class="certificate ${done ? 'unlocked' : 'locked'}">
          <div>
            <h2>${this._t('certificate')}</h2>
            <p>${this._t('certificateText')}</p>
            <ul>
              <li>A avaliação contém 10 perguntas.</li>
              <li>Preencha nome completo e e-mail corretamente.</li>
              <li>O certificado será enviado diretamente para o seu e-mail.</li>
            </ul>
            <p><strong>${this._t('important')}:</strong> ${this._t('certNote')}</p>
            <p>${this._t('noMec')}</p>
          </div>
          <a class="cert-btn ${done ? '' : 'disabled'}" href="${done ? this.course.certificateUrl : '#'}" target="_blank" rel="noopener noreferrer" data-action="${done ? '' : 'locked'}">${this._t('evaluation')}</a>
          ${done ? '' : `<small>${this._t('locked')}</small>`}
        </div>
      </section>`;
  }

  _lesson() {
    const lesson = this.course.lessons[this.lessonIndex] || this.course.lessons[0];
    const embed = this._embedUrl(lesson.vimeoUrl);
    const done = this._isDone(lesson.id);
    const nextIndex = Math.min(this.lessonIndex + 1, this.course.lessons.length - 1);
    return `
      <section class="lesson-view">
        <button class="ghost-btn" data-action="course" type="button">${this._t('backCourse')}</button>
        <div class="lesson-title">
          <span>Aula ${this.lessonIndex + 1}</span>
          <h1>${lesson.title}</h1>
          <p>${lesson.summary}</p>
        </div>
        <div class="video-shell">
          ${embed ? `<iframe id="course-video" src="${embed}" allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen title="${lesson.title}"></iframe>` : `<div class="video-empty">${this._icon('play')}<span>${this._t('videoSoon')}</span></div>`}
        </div>
        <div class="lesson-actions">
          <button class="outline-btn ${done ? 'done' : ''}" data-action="complete" data-lesson="${lesson.id}" type="button">${done ? this._t('doneLesson') : this._t('markDone')}</button>
          <button class="main-btn" data-action="${this.lessonIndex === this.course.lessons.length - 1 ? 'course' : 'lesson'}" data-index="${nextIndex}" type="button">${this.lessonIndex === this.course.lessons.length - 1 ? this._t('finishCourse') : this._t('nextLesson')}</button>
        </div>
      </section>`;
  }

  _icon(name) {
    const icons = {
      file: '<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M8 13h8M8 17h6"/></svg>',
      clock: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
      calendar: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/></svg>',
      user: '<svg viewBox="0 0 24 24"><path d="M20 21a8 8 0 0 0-16 0"/><circle cx="12" cy="7" r="4"/></svg>',
      play: '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>'
    };
    return icons[name] || '';
  }

  _style() {
    return `
      :host{display:block;width:100%;font-family:var(--dm-font-body);color:var(--dm-text)}
      *{box-sizing:border-box}
      svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;flex-shrink:0}
      button,a{font:inherit}
      .wrap{padding:34px 0 70px}
      .hero{display:grid;grid-template-columns:minmax(0,1.35fr) 340px;gap:42px;align-items:end;max-width:980px;margin:0 auto}
      .hero-copy h1{font-family:var(--dm-font-title);font-size:clamp(3rem,8vw,5.5rem);line-height:.9;letter-spacing:.01em;text-transform:none;color:#fff;margin:0 0 26px;max-width:680px}
      .hero-copy h1::after{content:'';display:block;width:180px;height:10px;border-radius:99px;background:var(--dm-effect-accent);margin-top:-4px}
      .hero-copy p{font-size:clamp(1rem,2vw,1.25rem);line-height:1.7;color:#fff;max-width:850px;text-align:justify}
      :host-context([data-theme="branco"]) .hero-copy h1,:host-context([data-theme="branco"]) .hero-copy p,:host-context([data-theme="rosa"]) .hero-copy h1,:host-context([data-theme="rosa"]) .hero-copy p,:host-context([data-theme="laranja"]) .hero-copy h1,:host-context([data-theme="laranja"]) .hero-copy p{color:var(--dm-text)}
      .course-card{border:1px solid var(--dm-bw10);background:var(--dm-grad-card);border-radius:18px;overflow:hidden;color:var(--dm-text);padding:0;text-align:left;box-shadow:0 24px 60px var(--dm-shadow-md);transition:transform .25s ease,border-color .25s ease;width:100%}
      .course-card:hover{transform:translateY(-4px);border-color:var(--dm-effect-accent)}
      .course-cover{min-height:192px;background:linear-gradient(135deg,#ff5a1f 0 36%,#f7f2ed 36% 100%);position:relative;padding:18px;color:#171717;display:flex;flex-direction:column;justify-content:flex-end;overflow:hidden}
      .brand-mark{position:absolute;top:18px;left:18px;background:#fff;color:#ff5a1f;border-radius:8px;padding:3px 7px;font-family:var(--dm-font-title);font-weight:700}
      .cover-pill{width:max-content;background:#ff5a1f;color:#fff;border-radius:99px;padding:2px 12px;font:700 .75rem var(--dm-font-title);text-transform:uppercase}
      .course-cover strong{font-family:var(--dm-font-title);font-size:1.35rem;margin-top:4px}
      .course-cover small{font-weight:700;color:#ff5a1f}
      .cover-shapes{position:absolute;right:18px;top:34px;width:130px;height:118px;background:rgba(255,255,255,.86);border-radius:14px;display:flex;align-items:end;justify-content:center;gap:10px;padding:18px}
      .cover-shapes span{width:42px;height:74px;border-radius:24px 24px 18px 18px;background:#f72585}
      .cover-shapes span+span{height:86px;background:#f5c542}
      .course-foot{padding:18px;display:grid;gap:10px;text-align:center}
      .course-foot strong{font:700 1.25rem var(--dm-font-title)}
      .course-foot em{font-style:normal;color:var(--dm-text-muted);font-size:.82rem}
      .progress-mini,.progress-bar{height:8px;background:var(--dm-bw06);border-radius:99px;overflow:hidden}
      .progress-mini span,.progress-bar span{display:block;height:100%;border-radius:inherit;background:var(--dm-grad-effect)}
      .start-btn,.main-btn,.cert-btn{display:inline-flex;justify-content:center;align-items:center;min-height:44px;border-radius:999px;background:var(--dm-grad-effect);color:#030712;font-weight:800;font-family:var(--dm-font-title);letter-spacing:.04em;text-transform:uppercase;padding:10px 24px;text-decoration:none;border:1px solid var(--dm-effect-35)}
      .course-detail,.lesson-view{max-width:1060px;margin:0 auto;display:grid;gap:28px}
      .ghost-btn{width:max-content;color:var(--dm-effect-accent);border:1px solid var(--dm-border);border-radius:999px;padding:9px 16px;background:var(--dm-bg-card);font-weight:700}
      .course-grid{display:grid;grid-template-columns:310px minmax(0,1fr);gap:54px;align-items:start}
      .info-panel,.text-panel,.lessons-block,.certificate,.video-shell{border:1px solid var(--dm-border);background:var(--dm-bg-card);border-radius:20px;padding:24px;box-shadow:0 16px 45px var(--dm-shadow-sm)}
      .info-panel{display:grid;grid-template-columns:1fr 1fr;gap:24px}
      .info-pair{display:grid;gap:8px}.info-pair.wide{grid-column:1/-1}
      .info-pair span{display:flex;align-items:center;gap:8px;font:700 .92rem var(--dm-font-title);text-transform:uppercase;color:var(--dm-text)}
      .info-pair strong{font-size:.95rem;color:var(--dm-text-sub);font-weight:600}
      .progress-box{grid-column:1/-1;display:grid;gap:9px}.progress-box div{display:flex;justify-content:space-between;color:var(--dm-text-muted);font-size:.85rem}.progress-box strong{color:var(--dm-effect-accent)}
      .text-panel{background:transparent;border:none;box-shadow:none;padding:0}
      .text-panel h2,.lessons-block h2,.certificate h2,.lesson-title h1{font-family:var(--dm-font-title);font-size:clamp(2rem,5vw,3rem);line-height:1;margin:0 0 10px;text-transform:none;color:#fff}
      .text-panel p,.certificate p,.lesson-title p{color:#fff;line-height:1.8;font-weight:600;max-width:680px}
      :host-context([data-theme="branco"]) .text-panel h2,:host-context([data-theme="branco"]) .certificate h2,:host-context([data-theme="branco"]) .lesson-title h1,:host-context([data-theme="branco"]) .text-panel p,:host-context([data-theme="branco"]) .certificate p,:host-context([data-theme="branco"]) .lesson-title p,:host-context([data-theme="rosa"]) .text-panel h2,:host-context([data-theme="rosa"]) .certificate h2,:host-context([data-theme="rosa"]) .lesson-title h1,:host-context([data-theme="rosa"]) .text-panel p,:host-context([data-theme="rosa"]) .certificate p,:host-context([data-theme="rosa"]) .lesson-title p,:host-context([data-theme="laranja"]) .text-panel h2,:host-context([data-theme="laranja"]) .certificate h2,:host-context([data-theme="laranja"]) .lesson-title h1,:host-context([data-theme="laranja"]) .text-panel p,:host-context([data-theme="laranja"]) .certificate p,:host-context([data-theme="laranja"]) .lesson-title p{color:var(--dm-text)}
      .lesson-list{display:grid;gap:14px}
      .lesson-row{display:grid;grid-template-columns:120px minmax(0,1fr) 120px;align-items:center;gap:16px;width:100%;border:1px solid var(--dm-bw10);border-radius:14px;background:var(--dm-bg-tint);color:var(--dm-text);padding:14px 18px;text-align:left}
      .lesson-row span{font:700 1.5rem var(--dm-font-title);color:#fff}.lesson-row strong{font:700 1rem var(--dm-font-title);letter-spacing:.08em;text-align:center}.lesson-row em{justify-self:end;font-style:normal;color:var(--dm-text-muted);font-size:.78rem}
      .lesson-row.done{border-color:var(--dm-effect-accent);background:var(--dm-effect-20)}.lesson-row.done em{color:var(--dm-green)}
      :host-context([data-theme="branco"]) .lesson-row span,:host-context([data-theme="rosa"]) .lesson-row span,:host-context([data-theme="laranja"]) .lesson-row span{color:var(--dm-text)}
      .certificate{display:grid;grid-template-columns:minmax(0,1fr) 220px;gap:28px;align-items:center;background:linear-gradient(135deg,var(--dm-effect-blue),var(--dm-effect-accent))}
      .certificate p,.certificate li,.certificate h2{color:#fff}.certificate ul{margin:8px 0 20px 18px;color:#fff}.certificate small{grid-column:2;color:#fff;text-align:center;font-size:.82rem}
      .cert-btn{background:#050505;color:#fff;border-color:rgba(255,255,255,.22)}.cert-btn.disabled{opacity:.45;pointer-events:auto;cursor:not-allowed}
      .lesson-title span{display:inline-flex;color:var(--dm-effect-accent);font-weight:800;font-family:var(--dm-font-title);text-transform:uppercase;letter-spacing:.14em;margin-bottom:8px}
      .video-shell{padding:0;overflow:hidden;aspect-ratio:16/9;background:#050505;display:flex;align-items:center;justify-content:center}
      .video-shell iframe{width:100%;height:100%;border:0;display:block}
      .video-empty{display:grid;place-items:center;gap:14px;color:var(--dm-text-muted);text-align:center;padding:30px}.video-empty svg{width:54px;height:54px;color:var(--dm-effect-accent)}
      .lesson-actions{display:grid;grid-template-columns:1fr 1fr;gap:14px}.outline-btn{min-height:44px;border:1px solid var(--dm-border);border-radius:999px;color:var(--dm-text);background:var(--dm-bg-card);font-weight:800;font-family:var(--dm-font-title);text-transform:uppercase}.outline-btn.done{color:var(--dm-green);border-color:rgba(74,222,128,.45)}
      @media(max-width:820px){.wrap{padding:22px 0 48px}.hero{grid-template-columns:1fr;gap:26px}.course-grid{grid-template-columns:1fr;gap:24px}.hero-copy h1{font-size:clamp(2.7rem,14vw,4rem)}.hero-copy p{text-align:left}.certificate{grid-template-columns:1fr}.certificate small{grid-column:auto}.lesson-row{grid-template-columns:1fr;gap:6px}.lesson-row strong{text-align:left}.lesson-row em{justify-self:start}.lesson-actions{grid-template-columns:1fr}.info-panel{grid-template-columns:1fr}.course-card{max-width:360px}.course-cover{min-height:180px}.cover-shapes{opacity:.9;transform:scale(.86);transform-origin:top right}}
    `;
  }

  render() {
    this._destroyPlayer();
    const body = this.view === 'lesson' ? this._lesson() : this.view === 'course' ? this._course() : this._home();
    this.shadowRoot.innerHTML = `<style>${this._style()}</style><div class="wrap">${body}</div>`;
    this.shadowRoot.querySelectorAll('[data-action]').forEach(el => {
      el.addEventListener('click', event => {
        const action = el.dataset.action;
        if (action === 'home') this._open('home');
        if (action === 'course') this._open('course');
        if (action === 'lesson') this._open('lesson', Number(el.dataset.index || 0));
        if (action === 'complete') this._completeLesson(el.dataset.lesson);
        if (action === 'locked') {
          event.preventDefault();
          this.shadowRoot.querySelector('.certificate')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      });
    });
    if (this.view === 'lesson') this._setupVimeo(this.course.lessons[this.lessonIndex]);
    window.DMaiorPrefs?.bind?.(this.shadowRoot);
  }
}

customElements.define('dmaior-cursos', DMaiorCursos);
