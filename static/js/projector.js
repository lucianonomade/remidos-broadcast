(function() {
  const body = document.getElementById('projector-body');
  const dimmer = document.getElementById('backdrop-dimmer');
  const blackoutScreen = document.getElementById('blackout-screen');
  const logoScreen = document.getElementById('logo-screen');
  const slideScreen = document.getElementById('slide-screen');
  const verseChamber = document.getElementById('verse-chamber');
  const slideText = document.getElementById('slide-text');
  const slideReference = document.getElementById('slide-reference');
  const slideTypeBadge = document.getElementById('slide-type-badge');

  let ws = null;
  let currentState = null;

  function connectWS() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    ws = new WebSocket(wsUrl);

    ws.onmessage = function(event) {
      try {
        const state = JSON.parse(event.data);
        currentState = state;
        renderState(state);
      } catch (err) {
        console.error('Projector state error:', err);
      }
    };

    ws.onclose = function() {
      setTimeout(connectWS, 1500);
    };
  }

  function renderState(state) {
    // 1. Dynamic Styling
    if (state.font_family) {
      slideText.style.fontFamily = state.font_family;
    }
    if (state.font_size) {
      slideText.style.fontSize = state.font_size;
    }
    if (state.text_weight) {
      slideText.style.fontWeight = state.text_weight;
    }
    if (state.text_align) {
      verseChamber.className = `verse-chamber ${state.text_align === 'left' ? 'align-left' : ''} ${state.text_position === 'upper' ? 'pos-upper' : state.text_position === 'lower' ? 'pos-lower' : ''}`;
    }
    if (state.bg_dim !== undefined && dimmer) {
      const dimOpacity = (parseInt(state.bg_dim) || 18) / 100;
      dimmer.style.backgroundColor = `rgba(0, 0, 0, ${dimOpacity})`;
    }
    if (state.text_shadow) {
      slideText.className = `verse-projection-text ${state.text_shadow === 'soft' ? 'shadow-soft' : state.text_shadow === 'none' ? 'shadow-none' : ''}`;
    }

    // 2. Blackout
    if (state.is_blackout) {
      blackoutScreen.style.display = 'block';
      return;
    } else {
      blackoutScreen.style.display = 'none';
    }

    // 3. Logo screen
    if (state.is_logo) {
      logoScreen.style.display = 'flex';
      slideScreen.style.display = 'none';
      return;
    } else {
      logoScreen.style.display = 'none';
    }

    // 4. Clear text
    if (state.is_clear) {
      slideScreen.style.display = 'none';
      return;
    }

    // 5. Normal slide content
    const slide = state.current_slide;
    if (slide && slide.text) {
      slideText.textContent = slide.text;
      
      const slideMeta = document.getElementById('slide-meta');
      // Only Bible verses should show reference on the congregation's projector
      const isBible = slide.type === 'Bíblia' || (slide.reference && /^[0-9]?\s*[A-Za-zÀ-ÖØ-öø-ÿ]+\s+\d+:\d+/.test(slide.reference));
      
      if (isBible) {
        slideReference.textContent = slide.reference || slide.title || '';
        slideReference.style.display = 'inline-block';
        slideTypeBadge.style.display = 'none';
        if (slideMeta) slideMeta.style.display = 'flex';
      } else {
        // Worship songs: never show internal cue tags ('Verso', 'Refrão', 'Slide', etc.) on the projector
        slideReference.textContent = '';
        slideReference.style.display = 'none';
        slideTypeBadge.style.display = 'none';
        if (slideMeta) slideMeta.style.display = 'none';
      }

      slideScreen.style.display = 'flex';
    } else {
      logoScreen.style.display = 'flex';
      slideScreen.style.display = 'none';
    }
  }

  // Double click for fullscreen toggle
  document.addEventListener('dblclick', function() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => console.log(err));
    } else if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  });

  connectWS();
})();
