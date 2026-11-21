(function() {
  const clockEl = document.getElementById('stage-clock');
  const badgeEl = document.getElementById('stage-status-badge');
  const statusTextEl = badgeEl ? badgeEl.querySelector('.status-text') : null;
  const currentTextEl = document.getElementById('stage-current-text');
  const currentRefEl = document.getElementById('stage-current-ref');
  const nextTextEl = document.getElementById('stage-next-text');
  const nextRefEl = document.getElementById('stage-next-ref');

  // Digital clock in real-time
  function updateClock() {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    const s = String(now.getSeconds()).padStart(2, '0');
    clockEl.textContent = `${h}:${m}:${s}`;
  }
  setInterval(updateClock, 1000);
  updateClock();

  // Fullscreen toggle for tablets and monitors
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
      if (fsText) {
        fsText.textContent = isFs ? 'Sair' : 'Tela Cheia';
      }
    }

    fsBtn.addEventListener('click', function(e) {
      e.preventDefault();
      const isFs = !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement);
      if (!isFs) {
        const docEl = document.documentElement;
        if (docEl.requestFullscreen) {
          docEl.requestFullscreen().catch(function() {});
        } else if (docEl.webkitRequestFullscreen) {
          docEl.webkitRequestFullscreen();
        } else if (docEl.msRequestFullscreen) {
          docEl.msRequestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen().catch(function() {});
        } else if (document.webkitExitFullscreen) {
          document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) {
          document.msExitFullscreen();
        }
      }
    });

    document.addEventListener('fullscreenchange', updateFsState);
    document.addEventListener('webkitfullscreenchange', updateFsState);
    document.addEventListener('mozfullscreenchange', updateFsState);
    document.addEventListener('MSFullscreenChange', updateFsState);
  }

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

  function setBadge(isBlackout, text) {
    if (!badgeEl) return;
    badgeEl.className = isBlackout ? 'live-status-pill blackout' : 'live-status-pill live';
    if (statusTextEl) {
      statusTextEl.textContent = text;
    } else {
      badgeEl.textContent = text;
    }
  }

  function renderState(state) {
    if (state.is_blackout) {
      setBadge(true, 'TELÃO APAGADO');
    } else if (state.is_logo) {
      setBadge(false, 'LOGO NO AR');
    } else {
      setBadge(false, 'AO VIVO');
    }

    // Current slide (PROGRAM)
    const cur = state.current_slide;
    if (state.is_blackout) {
      currentTextEl.textContent = '[ TELÃO APAGADO ]';
      currentRefEl.textContent = 'Blackout';
    } else if (state.is_logo) {
      currentTextEl.textContent = '[ LOGO NO TELÃO ]';
      currentRefEl.textContent = 'Transmissão da Logo';
    } else if (cur && cur.text) {
      currentTextEl.textContent = cur.text;
      currentRefEl.textContent = cur.reference || cur.title || (cur.type || '');
    } else {
      currentTextEl.textContent = 'Aguardando projeção...';
      currentRefEl.textContent = 'Pronto';
    }

    // Next slide (NEXT)
    const nxt = state.next_slide;
    if (nxt && nxt.text) {
      nextTextEl.textContent = nxt.text;
      nextRefEl.textContent = nxt.reference || nxt.title || (nxt.type || '');
    } else {
      nextTextEl.textContent = '---';
      nextRefEl.textContent = 'Fim da sequência';
    }
  }

  connectWS();
})();
