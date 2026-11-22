(function() {
  const body = document.getElementById('projector-body');
  const backdrop = document.getElementById('projector-backdrop');
  const dimmer = document.getElementById('backdrop-dimmer');
  const videoBg = document.getElementById('projector-video');
  const motionCanvas = document.getElementById('motion-canvas');
  const blackoutScreen = document.getElementById('blackout-screen');
  const logoScreen = document.getElementById('logo-screen');
  const slideScreen = document.getElementById('slide-screen');
  const verseChamber = document.getElementById('verse-chamber');
  const slideText = document.getElementById('slide-text');
  const slideReference = document.getElementById('slide-reference');
  const slideTypeBadge = document.getElementById('slide-type-badge');

  let ws = null;
  let currentState = null;
  let activeMotionType = null;
  let motionAnimId = null;

  // --- MOTION CANVAS ENGINE (60 FPS SACRED AMBIENCE) ---
  let ctx = null;
  let particles = [];
  let w = window.innerWidth;
  let h = window.innerHeight;

  function resizeCanvas() {
    if (!motionCanvas) return;
    w = window.innerWidth;
    h = window.innerHeight;
    motionCanvas.width = w;
    motionCanvas.height = h;
  }
  window.addEventListener('resize', resizeCanvas);

  function initParticles() {
    particles = [];
    const count = Math.min(70, Math.floor((w * h) / 18000));
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        radius: Math.random() * 2.5 + 0.8,
        vy: -(Math.random() * 0.45 + 0.25),
        vx: (Math.random() - 0.5) * 0.25,
        alpha: Math.random() * 0.6 + 0.2,
        pulseSpeed: Math.random() * 0.02 + 0.008
      });
    }
  }

  function renderMotionFrame(time) {
    if (!ctx || !motionCanvas) return;
    ctx.clearRect(0, 0, w, h);

    if (activeMotionType === 'motion_particles') {
      // Golden Sacred Particle Atmosphere
      // Gradient background
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, '#06070a');
      grad.addColorStop(0.6, '#0c0e14');
      grad.addColorStop(1, '#1a1408');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      for (let p of particles) {
        p.y += p.vy;
        p.x += p.vx;
        p.alpha += Math.sin(time * p.pulseSpeed) * 0.005;

        if (p.y < -10) { p.y = h + 10; p.x = Math.random() * w; }
        if (p.x < -10) p.x = w + 10;
        if (p.x > w + 10) p.x = -10;

        const a = Math.max(0.1, Math.min(0.85, p.alpha));
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(242, 198, 109, ${a})`;
        ctx.shadowColor = 'rgba(214, 168, 79, 0.8)';
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    } else if (activeMotionType === 'motion_clouds') {
      // Celestial Sacred Clouds / Aurora Flow
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, '#040508');
      grad.addColorStop(0.5, '#0b0f18');
      grad.addColorStop(1, '#080a0f');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      const t = time * 0.0006;
      ctx.save();
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        const yBase = h * (0.35 + i * 0.22);
        ctx.moveTo(0, h);
        for (let x = 0; x <= w; x += 30) {
          const wave = Math.sin(x * 0.002 + t + i) * 60 + Math.cos(x * 0.004 - t * 0.5) * 35;
          ctx.lineTo(x, yBase + wave);
        }
        ctx.lineTo(w, h);
        ctx.closePath();
        ctx.fillStyle = i === 0 ? 'rgba(214, 168, 79, 0.04)' : i === 1 ? 'rgba(96, 130, 182, 0.05)' : 'rgba(242, 198, 109, 0.03)';
        ctx.fill();
      }
      ctx.restore();
    }

    motionAnimId = requestAnimationFrame(renderMotionFrame);
  }

  function setBackgroundMode(bgType, bgUrl) {
    if (motionAnimId) {
      cancelAnimationFrame(motionAnimId);
      motionAnimId = null;
    }

    if (bgType === 'motion_particles' || bgType === 'motion_clouds') {
      activeMotionType = bgType;
      if (videoBg) { videoBg.pause(); videoBg.style.display = 'none'; }
      if (motionCanvas) {
        motionCanvas.style.display = 'block';
        if (!ctx) ctx = motionCanvas.getContext('2d');
        resizeCanvas();
        if (bgType === 'motion_particles') initParticles();
        motionAnimId = requestAnimationFrame(renderMotionFrame);
      }
      if (backdrop) backdrop.style.backgroundImage = 'none';
    } else if (bgType === 'video' && bgUrl) {
      activeMotionType = null;
      if (motionCanvas) motionCanvas.style.display = 'none';
      if (videoBg) {
        videoBg.style.display = 'block';
        if (videoBg.src !== window.location.origin + bgUrl && videoBg.src !== bgUrl) {
          videoBg.src = bgUrl;
        }
        videoBg.play().catch(e => console.log('Video autoplay:', e));
      }
      if (backdrop) backdrop.style.backgroundImage = 'none';
    } else if (bgType === 'color') {
      activeMotionType = null;
      if (motionCanvas) motionCanvas.style.display = 'none';
      if (videoBg) { videoBg.pause(); videoBg.style.display = 'none'; }
      if (backdrop) {
        backdrop.style.backgroundImage = 'none';
        backdrop.style.backgroundColor = bgUrl || '#000000';
      }
    } else {
      // Default: Static Image
      activeMotionType = null;
      if (motionCanvas) motionCanvas.style.display = 'none';
      if (videoBg) { videoBg.pause(); videoBg.style.display = 'none'; }
      if (backdrop) {
        const imgUrl = bgUrl || '/static/img/projector_bg.jpg';
        backdrop.style.backgroundImage = `url('${imgUrl}')`;
        backdrop.style.backgroundColor = '#000000';
      }
    }
  }

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
    // 1. Dynamic Background / Motion / Color
    if (state.bg_type) {
      setBackgroundMode(state.bg_type, state.bg_url);
    }

    // 2. Dynamic Styling
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

    // 3. Blackout
    if (state.is_blackout) {
      blackoutScreen.style.display = 'block';
      return;
    } else {
      blackoutScreen.style.display = 'none';
    }

    // 4. Logo screen
    if (state.is_logo) {
      logoScreen.style.display = 'flex';
      slideScreen.style.display = 'none';
      return;
    } else {
      logoScreen.style.display = 'none';
    }

    // 5. Clear text
    if (state.is_clear) {
      slideScreen.style.display = 'none';
      return;
    }

    // 6. Normal slide content
    const slide = state.current_slide;
    if (slide && slide.text) {
      slideText.textContent = slide.text;
      
      const slideMeta = document.getElementById('slide-meta');
      const isBible = slide.type === 'Bíblia' || (slide.reference && /^[0-9]?\s*[A-Za-zÀ-ÖØ-öø-ÿ]+\s+\d+:\d+/.test(slide.reference));
      
      if (isBible) {
        slideReference.textContent = slide.reference || slide.title || '';
        slideReference.style.display = 'inline-block';
        slideTypeBadge.style.display = 'none';
        if (slideMeta) slideMeta.style.display = 'flex';
      } else {
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
