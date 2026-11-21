(function() {
  const container = document.getElementById('obs-lowerthird');
  const textEl = document.getElementById('obs-text');
  const refEl = document.getElementById('obs-ref');

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
        console.error('OBS Overlay error:', err);
      }
    };

    ws.onclose = function() {
      setTimeout(connectWS, 1500);
    };
  }

  function renderState(state) {
    // If blackout, logo or clear, fade out lower third completely
    if (state.is_blackout || state.is_clear || state.is_logo) {
      container.style.opacity = '0';
      container.style.transform = 'translateY(15px)';
      return;
    }

    const cur = state.current_slide;
    if (cur && cur.text) {
      textEl.textContent = cur.text;
      const ref = cur.reference || cur.title || '';
      refEl.textContent = ref;
      container.style.opacity = '1';
      container.style.transform = 'translateY(0)';
    } else {
      container.style.opacity = '0';
      container.style.transform = 'translateY(15px)';
    }
  }

  connectWS();
})();
