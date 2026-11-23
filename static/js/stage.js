(function() {
  // Elements
  const stageClock = document.getElementById('stage-clock');
  const preacherWallClock = document.getElementById('preacher-wall-clock');
  const modeBtns = document.querySelectorAll('.stage-mode-btn');

  // Views
  const viewLyrics = document.getElementById('view-lyrics');
  const viewPreacher = document.getElementById('view-preacher');
  const viewStandby = document.getElementById('view-standby');

  // Mini Header Timer
  const stageMiniTimer = document.getElementById('stage-mini-timer');
  const miniTimerLabel = document.getElementById('mini-timer-label');
  const miniTimerDisplay = document.getElementById('mini-timer-display');

  // Big Preacher Timer View Elements
  const bigTimerDisplay = document.getElementById('big-timer-display');
  const bigTimerLabel = document.getElementById('big-timer-label');
  const bigTimerStatus = document.getElementById('big-timer-status');
  const preacherVersePreview = document.getElementById('preacher-verse-preview');
  const preacherVerseRef = document.getElementById('preacher-verse-ref');
  const preacherVerseText = document.getElementById('preacher-verse-text');

  // Lyrics View Elements
  const stageCurrentText = document.getElementById('stage-current-text');
  const stageCurrentRef = document.getElementById('stage-current-ref');
  const stageCurrentStandby = document.getElementById('stage-current-standby');
  const stageStandbyTitle = document.getElementById('stage-standby-title');
  const stageStandbySubtitle = document.getElementById('stage-standby-subtitle');
  const stageNextText = document.getElementById('stage-next-text');
  const stageNextRef = document.getElementById('stage-next-ref');
  const stageStatusTag = document.getElementById('stage-status-tag');

  // Standby View Elements
  const standbyStatusText = document.getElementById('standby-status-text');

  // Stage Alert Banner
  const stageAlertBanner = document.getElementById('stage-alert-banner');
  const stageAlertText = document.getElementById('stage-alert-text');

  // State
  let currentMode = localStorage.getItem('stage_mode') || 'auto';
  let currentState = null;
  let currentTimer = {
    active: false,
    targetTimestamp: 0,
    label: 'Pregação',
    duration: 40
  };

  // Wall Clock (Synchronized every second)
  function updateClock() {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    const s = String(now.getSeconds()).padStart(2, '0');
    const timeStr = `${h}:${m}:${s}`;
    if (stageClock) stageClock.textContent = timeStr;
    if (preacherWallClock) preacherWallClock.textContent = timeStr;
  }
  setInterval(updateClock, 1000);
  updateClock();

  // Mode Selection
  function setMode(mode) {
    currentMode = mode;
    localStorage.setItem('stage_mode', mode);
    modeBtns.forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-mode') === mode);
    });
    if (currentState) {
      applyActiveView(currentState);
    }
  }

  modeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      setMode(btn.getAttribute('data-mode') || 'auto');
    });
  });

  // Activate Initial Mode Button
  setMode(currentMode);

  // Countdown Timer Runner
  function tickTimer() {
    if (!currentTimer.active || !currentTimer.targetTimestamp) {
      if (stageMiniTimer) stageMiniTimer.style.display = 'none';
      if (bigTimerStatus) {
        bigTimerStatus.textContent = 'Pausado';
        bigTimerStatus.className = 'sync-status-badge inactive';
      }
      return;
    }

    const nowSec = Date.now() / 1000;
    const diff = Math.round(currentTimer.targetTimestamp - nowSec);

    let timeText = '00:00';
    let styleClass = 'giant-digital-clock normal';

    if (diff <= 0) {
      const over = Math.abs(diff);
      const m = String(Math.floor(over / 60)).padStart(2, '0');
      const s = String(over % 60).padStart(2, '0');
      timeText = `-${m}:${s}`;
      styleClass = 'giant-digital-clock overtime';
    } else {
      const m = String(Math.floor(diff / 60)).padStart(2, '0');
      const s = String(diff % 60).padStart(2, '0');
      timeText = `${m}:${s}`;
      styleClass = diff <= 300 ? 'giant-digital-clock warning' : 'giant-digital-clock normal';
    }

    if (bigTimerDisplay) {
      bigTimerDisplay.textContent = timeText;
      bigTimerDisplay.className = styleClass;
    }
    if (bigTimerLabel) {
      bigTimerLabel.textContent = currentTimer.label || 'Pregação';
    }
    if (bigTimerStatus) {
      bigTimerStatus.textContent = 'Em andamento';
      bigTimerStatus.className = 'sync-status-badge active';
    }

    if (stageMiniTimer) {
      if (miniTimerDisplay) miniTimerDisplay.textContent = timeText;
      if (miniTimerLabel) miniTimerLabel.textContent = currentTimer.label || 'Pregação';
      stageMiniTimer.style.display = 'flex';
    }
  }
  setInterval(tickTimer, 1000);

  // Switch which view is shown
  function applyActiveView(state) {
    const hasActiveSlide = !state.is_blackout && !state.is_logo && !state.is_clear && !!(state.current_slide && state.current_slide.text);
    const hasActiveTimer = !!state.timer_active;

    let targetView = 'standby';

    if (currentMode === 'lyrics') {
      targetView = 'lyrics';
    } else if (currentMode === 'preacher') {
      targetView = 'preacher';
    } else {
      // Auto Mode
      if (hasActiveSlide) {
        targetView = 'lyrics';
      } else if (hasActiveTimer) {
        targetView = 'preacher';
      } else {
        targetView = 'standby';
      }
    }

    if (viewLyrics) {
      viewLyrics.classList.toggle('active', targetView === 'lyrics');
      viewLyrics.style.display = targetView === 'lyrics' ? 'flex' : 'none';
    }
    if (viewPreacher) {
      viewPreacher.classList.toggle('active', targetView === 'preacher');
      viewPreacher.style.display = targetView === 'preacher' ? 'flex' : 'none';
    }
    if (viewStandby) {
      viewStandby.classList.toggle('active', targetView === 'standby');
      viewStandby.style.display = targetView === 'standby' ? 'flex' : 'none';
    }
  }

  // Render WebSocket State
  function renderState(state) {
    currentState = state;

    // 1. Timer State Sync
    currentTimer.active = !!state.timer_active;
    currentTimer.targetTimestamp = state.timer_target_timestamp || 0;
    currentTimer.label = state.timer_label || 'Pregação';
    currentTimer.duration = state.timer_duration_minutes || 40;
    tickTimer();

    // 2. Private Stage Alert
    if (state.stage_alert && state.stage_alert.trim()) {
      if (stageAlertText) stageAlertText.textContent = state.stage_alert.trim();
      if (stageAlertBanner) stageAlertBanner.style.display = 'flex';
    } else if (stageAlertBanner) {
      stageAlertBanner.style.display = 'none';
    }

    // 3. Status Tag & Current Slide Chamber
    const cur = state.current_slide;
    const isShowingSlide = cur && cur.text && !state.is_blackout && !state.is_logo && !state.is_clear;

    if (isShowingSlide) {
      if (stageCurrentText) {
        stageCurrentText.textContent = cur.text;
        stageCurrentText.style.display = 'block';
      }
      if (stageCurrentStandby) stageCurrentStandby.style.display = 'none';
      if (stageCurrentRef) stageCurrentRef.textContent = cur.reference || cur.title || 'Louvor';
      if (stageStatusTag) stageStatusTag.textContent = 'Ao vivo';

      // Preacher mini verse preview
      if (preacherVersePreview) {
        if (preacherVerseRef) preacherVerseRef.textContent = cur.reference || cur.title || 'Leitura bíblica';
        if (preacherVerseText) preacherVerseText.textContent = cur.text;
        preacherVersePreview.style.display = 'flex';
      }
    } else {
      // Standby / Logo / Blackout states in program card
      if (stageCurrentText) stageCurrentText.style.display = 'none';
      if (stageCurrentStandby) stageCurrentStandby.style.display = 'flex';
      if (preacherVersePreview) preacherVersePreview.style.display = 'none';

      if (state.is_blackout) {
        if (stageStandbyTitle) stageStandbyTitle.textContent = 'Telão apagado';
        if (stageStandbySubtitle) stageStandbySubtitle.textContent = 'Modo blackout ativo na mesa';
        if (stageCurrentRef) stageCurrentRef.textContent = 'Blackout';
        if (stageStatusTag) stageStatusTag.textContent = 'Apagado';
      } else if (state.is_logo) {
        if (stageStandbyTitle) stageStandbyTitle.textContent = 'Logo em exibição no telão';
        if (stageStandbySubtitle) stageStandbySubtitle.textContent = 'Telão principal transmitindo a insígnia da igreja';
        if (stageCurrentRef) stageCurrentRef.textContent = 'Transmissão da Logo';
        if (stageStatusTag) stageStatusTag.textContent = 'Logo ativa';
      } else if (state.is_clear) {
        if (stageStandbyTitle) stageStandbyTitle.textContent = 'Texto oculto';
        if (stageStandbySubtitle) stageStandbySubtitle.textContent = 'Aguardando liberação do texto na mesa';
        if (stageCurrentRef) stageCurrentRef.textContent = 'Oculto';
        if (stageStatusTag) stageStatusTag.textContent = 'Standby';
      } else {
        if (stageStandbyTitle) stageStandbyTitle.textContent = 'Aguardando projeção';
        if (stageStandbySubtitle) stageStandbySubtitle.textContent = 'Selecione um louvor ou versículo na cabine';
        if (stageCurrentRef) stageCurrentRef.textContent = 'Pronto';
        if (stageStatusTag) stageStatusTag.textContent = 'Em espera';
      }
    }

    // 4. Standby View Elements
    if (standbyStatusText) {
      if (state.is_blackout) {
        standbyStatusText.textContent = 'Telão principal apagado (Blackout)';
      } else if (state.is_logo) {
        standbyStatusText.textContent = 'Logo em exibição no telão principal';
      } else {
        standbyStatusText.textContent = 'Aguardando projeção da mesa';
      }
    }

    // 5. Next Slide (NEXT)
    const nxt = state.next_slide;
    if (nxt && nxt.text && !state.is_blackout && !state.is_clear) {
      if (stageNextText) stageNextText.textContent = nxt.text;
      if (stageNextRef) stageNextRef.textContent = nxt.reference || nxt.title || 'Próxima estrofe';
    } else {
      if (stageNextText) stageNextText.textContent = '—';
      if (stageNextRef) stageNextRef.textContent = 'Fim da sequência';
    }

    // 6. View Activation
    applyActiveView(state);
  }

  // Fullscreen Button
  const fsBtn = document.getElementById('stage-fullscreen-btn');
  if (fsBtn) {
    function updateFsState() {
      const isFs = !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement);
      const iconEnter = fsBtn.querySelector('.fs-icon.enter');
      const iconExit = fsBtn.querySelector('.fs-icon.exit');
      const fsText = fsBtn.querySelector('.fs-text');
      if (iconEnter && iconExit) {
        iconEnter.style.display = isFs ? 'none' : 'block';
        iconExit.style.display = isFs ? 'block' : 'none';
      }
      if (fsText) fsText.textContent = isFs ? 'Sair' : 'Tela cheia';
    }

    fsBtn.addEventListener('click', function(e) {
      e.preventDefault();
      const isFs = !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement);
      if (!isFs) {
        const docEl = document.documentElement;
        if (docEl.requestFullscreen) docEl.requestFullscreen().catch(() => {});
        else if (docEl.webkitRequestFullscreen) docEl.webkitRequestFullscreen();
      } else {
        if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
        else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
      }
    });

    document.addEventListener('fullscreenchange', updateFsState);
    document.addEventListener('webkitfullscreenchange', updateFsState);
  }

  // WebSocket Connection
  let ws = null;
  function connectWS() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    ws = new WebSocket(wsUrl);

    ws.onmessage = function(event) {
      try {
        const state = JSON.parse(event.data);
        renderState(state);
      } catch (err) {
        console.error('Stage monitor error:', err);
      }
    };

    ws.onclose = function() {
      setTimeout(connectWS, 1500);
    };
  }

  connectWS();
})();
