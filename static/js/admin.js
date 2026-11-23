document.addEventListener('DOMContentLoaded', function() {
  
  // --- STATE VARIABLES ---
  let currentState = null;
  let activeDeck = []; // Array of slide objects currently in the deck
  let activeDeckIndex = 0;
  let currentLoadedSong = null;
  let currentSetlist = [];
  let ws = null;

  // --- DOM ELEMENTS ---
  const liveBadge = document.getElementById('live-badge');
  const liveStatusText = document.getElementById('live-status-text');
  const btnBlackout = document.getElementById('btn-blackout');
  const btnClear = document.getElementById('btn-clear');
  const btnLogo = document.getElementById('btn-logo');
  const btnOpenProjector = document.getElementById('btn-open-projector');
  const btnOpenStage = document.getElementById('btn-open-stage');
  const btnOpenObs = document.getElementById('btn-open-obs');

  // Preview elements
  const opLivePreview = document.getElementById('operator-live-preview');
  const prevOverlayBlackout = document.getElementById('prev-overlay-blackout');
  const prevOverlayClear = document.getElementById('prev-overlay-clear');
  const prevOverlayLogo = document.getElementById('prev-overlay-logo');
  const prevContent = document.getElementById('prev-content');
  const prevSlideText = document.getElementById('prev-slide-text');
  const prevSlideRef = document.getElementById('prev-slide-ref');
  const currentSlideNum = document.getElementById('current-slide-num');
  const totalSlideNum = document.getElementById('total-slide-num');
  const btnPrevSlide = document.getElementById('btn-prev-slide');
  const btnNextSlide = document.getElementById('btn-next-slide');
  const deckTitle = document.getElementById('deck-title');
  const deckSubtitle = document.getElementById('deck-subtitle');
  const deckSlidesContainer = document.getElementById('deck-slides-container');

  // Tabs
  const navTabs = document.querySelectorAll('.sub-nav .nav-btn');
  const tabContents = document.querySelectorAll('.tab-pane');

  // Bible Tab Elements
  const bibleSearchInput = document.getElementById('bible-search-input');
  const btnBibleSearch = document.getElementById('btn-bible-search');
  const bibleBookSelect = document.getElementById('bible-book-select');
  const bibleChapterSelect = document.getElementById('bible-chapter-select');
  const bibleVersionSelect = document.getElementById('bible-version-select');
  const bibleResultsList = document.getElementById('bible-results-list');
  const bibleResultsTitle = document.getElementById('bible-results-title');
  const bibleResultsCount = document.getElementById('bible-results-count');
  const quickRefChips = document.querySelectorAll('.chip-ref');

  // Songs Tab Elements
  const songsSearchInput = document.getElementById('songs-search-input');
  const btnNewSong = document.getElementById('btn-new-song');
  const songsList = document.getElementById('songs-list');
  const songSelectedTitle = document.getElementById('song-selected-title');
  const songSelectedArtist = document.getElementById('song-selected-artist');
  const songSlidesGrid = document.getElementById('song-slides-grid');
  const btnAddSongToSetlist = document.getElementById('btn-add-song-to-setlist');
  const btnEditSong = document.getElementById('btn-edit-song');
  const btnDeleteSong = document.getElementById('btn-delete-song');

  // AI Tab Elements
  const aiRawText = document.getElementById('ai-raw-text');
  const aiModelSelect = document.getElementById('ai-model-select');
  const btnRunAi = document.getElementById('btn-run-ai');
  const btnRunOffline = document.getElementById('btn-run-offline-split');
  const btnClearAi = document.getElementById('btn-clear-ai');
  const aiSpinner = document.getElementById('ai-spinner');
  const aiStatusNote = document.getElementById('ai-status-note');
  const aiResultsSection = document.getElementById('ai-results-section');
  const aiDetectedTitle = document.getElementById('ai-detected-title');
  const aiDetectedArtist = document.getElementById('ai-detected-artist');
  const aiGeneratedSlides = document.getElementById('ai-generated-slides');
  const btnAiSaveSong = document.getElementById('btn-ai-save-song');
  const btnAiProjectFirst = document.getElementById('btn-ai-project-first');
  let lastAiResult = null;

  // Setlist Elements
  const currentSetlistItems = document.getElementById('current-setlist-items');
  const btnClearSetlist = document.getElementById('btn-clear-setlist');

  // Settings Elements
  const settingChurchName = document.getElementById('setting-church-name');
  const settingChurchSubtitle = document.getElementById('setting-church-subtitle');
  const settingNvidiaKey = document.getElementById('setting-nvidia-key');
  const settingFontFamily = document.getElementById('setting-font-family');
  const settingFontWeight = document.getElementById('setting-font-weight');
  const settingTextPosition = document.getElementById('setting-text-position');
  const settingTextAlign = document.getElementById('setting-text-align');
  const settingBgDim = document.getElementById('setting-bg-dim');
  const bgDimValLabel = document.getElementById('bg-dim-val-label');
  const settingTextShadow = document.getElementById('setting-text-shadow');
  const btnSaveSettings = document.getElementById('btn-save-settings');
  const settingsSavedIndicator = document.getElementById('settings-saved-indicator');

  // Modal Song
  const modalSong = document.getElementById('modal-song');
  const modalSongTitle = document.getElementById('modal-song-title');
  const modalSongId = document.getElementById('modal-song-id');
  const modalSongName = document.getElementById('modal-song-name');
  const modalSongArtist = document.getElementById('modal-song-artist');
  const modalSongTags = document.getElementById('modal-song-tags');
  const modalSongLyrics = document.getElementById('modal-song-lyrics');
  const btnCloseSongModal = document.getElementById('btn-close-song-modal');
  const btnModalCancel = document.getElementById('btn-modal-cancel');
  const btnModalSave = document.getElementById('btn-modal-save');

  // --- WEBSOCKET CONNECTION ---
  function initWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    ws = new WebSocket(wsUrl);

    ws.onmessage = function(event) {
      try {
        const state = JSON.parse(event.data);
        currentState = state;
        updateOperatorUI(state);
      } catch (err) {
        console.error('Error handling ws message:', err);
      }
    };

    ws.onclose = function() {
      setTimeout(initWebSocket, 2000);
    };
  }

  function updateOperatorUI(state) {
    // Sync Theme / Background Tag
    if (state.theme_name) {
      const liveTheme = document.getElementById('live-theme-tag');
      if (liveTheme) liveTheme.textContent = state.theme_name;
    }

    // Sync Preview Background
    if (opLivePreview && state.bg_type) {
      if (state.bg_type === 'color') {
        opLivePreview.style.backgroundImage = 'none';
        opLivePreview.style.backgroundColor = state.bg_url || '#000';
      } else if (state.bg_type === 'motion_particles') {
        opLivePreview.style.backgroundImage = 'none';
        opLivePreview.style.backgroundColor = '#141006';
      } else if (state.bg_type === 'motion_clouds') {
        opLivePreview.style.backgroundImage = 'none';
        opLivePreview.style.backgroundColor = '#0b0f18';
      } else if (state.bg_url) {
        opLivePreview.style.backgroundImage = `url('${state.bg_url}')`;
      }
    }

    // Sync Mobile Action Buttons
    const mobBlackout = document.getElementById('mob-btn-blackout');
    const mobLogo = document.getElementById('mob-btn-logo');
    const mobClear = document.getElementById('mob-btn-clear');
    if (mobBlackout) mobBlackout.classList.toggle('active', !!state.is_blackout);
    if (mobLogo) mobLogo.classList.toggle('active', !!state.is_logo && !state.is_blackout);
    if (mobClear) mobClear.classList.toggle('active', !!state.is_clear && !state.is_blackout && !state.is_logo);

    // 1. Toggles
    if (state.is_blackout) {
      btnBlackout.classList.add('active');
      liveBadge.className = 'live-badge off-air';
      liveStatusText.textContent = 'Telão apagado';
      prevOverlayBlackout.style.display = 'flex';
      prevOverlayClear.style.display = 'none';
      prevOverlayLogo.style.display = 'none';
      prevContent.style.display = 'none';
    } else {
      btnBlackout.classList.remove('active');
      prevOverlayBlackout.style.display = 'none';

      if (state.is_logo) {
        btnLogo.classList.add('active');
        liveBadge.className = 'live-badge on-air';
        liveStatusText.textContent = 'Logo no telão';
        prevOverlayLogo.style.display = 'flex';
        prevOverlayClear.style.display = 'none';
        prevContent.style.display = 'none';
      } else {
        btnLogo.classList.remove('active');
        prevOverlayLogo.style.display = 'none';

        if (state.is_clear) {
          btnClear.classList.add('active');
          liveStatusText.textContent = 'Texto oculto';
          prevOverlayClear.style.display = 'flex';
          prevContent.style.display = 'none';
        } else {
          btnClear.classList.remove('active');
          liveBadge.className = 'live-badge on-air';
          liveStatusText.textContent = 'No ar';
          prevOverlayClear.style.display = 'none';

          if (state.current_slide && state.current_slide.text) {
            prevContent.style.display = 'flex';
            prevSlideText.textContent = state.current_slide.text;
            const isBible = state.current_slide.type === 'Bíblia' || (state.current_slide.reference && /^[0-9]?\s*[A-Za-zÀ-ÖØ-öø-ÿ]+\s+\d+:\d+/.test(state.current_slide.reference));
            if (isBible) {
              prevSlideRef.style.display = 'block';
              prevSlideRef.textContent = state.current_slide.reference || state.current_slide.title || '';
            } else {
              prevSlideRef.style.display = 'none';
              prevSlideRef.textContent = '';
            }
          }
        }
      }
    }

    // Update active deck highlighting
    highlightActiveDeckSlide();

    // Render Projector Alert on the Operator Live Preview Monitor
    const prevAlert = document.getElementById('prev-overlay-alert');
    const prevAlertIcon = document.getElementById('prev-alert-icon');
    const prevAlertText = document.getElementById('prev-alert-text');
    if (prevAlert) {
      if (state.projector_alert && state.projector_alert.trim() && !state.is_blackout) {
        if (prevAlertText) prevAlertText.textContent = state.projector_alert.trim();
        if (prevAlertIcon) {
          const type = state.projector_alert_type || 'general';
          if (type === 'nursery') {
            prevAlertIcon.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M6 20v-2a6 6 0 0 1 12 0v2"/></svg>';
          } else if (type === 'car') {
            prevAlertIcon.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="10" x="3" y="10" rx="2"/><circle cx="7" cy="15" r="1.5"/><circle cx="17" cy="15" r="1.5"/><path d="M5 10l2-5h10l2 5"/></svg>';
          } else {
            prevAlertIcon.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>';
          }
        }
        prevAlert.style.display = 'flex';
      } else {
        prevAlert.style.display = 'none';
      }
    }

    // Sync Altar & Culto Tools (Alerts & Timer)
    if (typeof updateAltarAlertsUI === 'function') {
      updateAltarAlertsUI(state);
    }
  }

  function highlightActiveDeckSlide() {
    const deckCards = deckSlidesContainer.querySelectorAll('.deck-slide-item');
    deckCards.forEach((card, idx) => {
      if (idx === activeDeckIndex && !currentState.is_logo && !currentState.is_blackout) {
        card.classList.add('active');
        card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      } else {
        card.classList.remove('active');
      }
    });

    currentSlideNum.textContent = activeDeck.length > 0 ? (activeDeckIndex + 1) : 0;
    totalSlideNum.textContent = activeDeck.length;
  }

  // --- ACTIONS & BROADCAST CALLS ---
  async function toggleBlackout() {
    await fetch('/api/projector/blackout', { method: 'POST' });
  }

  async function toggleClear() {
    await fetch('/api/projector/clear', { method: 'POST' });
  }

  async function toggleLogo() {
    await fetch('/api/projector/logo', { method: 'POST' });
  }

  async function pushCurrentDeckSlide(index) {
    if (index < 0 || index >= activeDeck.length) return;
    activeDeckIndex = index;
    const current = activeDeck[activeDeckIndex];
    const next = (activeDeckIndex + 1 < activeDeck.length) ? activeDeck[activeDeckIndex + 1] : null;

    await fetch('/api/projector/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        current_slide: current,
        next_slide: next,
        presentation: activeDeck,
        index: activeDeckIndex
      })
    });
  }

  function nextSlide() {
    if (activeDeck.length === 0) return;
    if (activeDeckIndex < activeDeck.length - 1) {
      pushCurrentDeckSlide(activeDeckIndex + 1);
    }
  }

  function prevSlide() {
    if (activeDeck.length === 0) return;
    if (activeDeckIndex > 0) {
      pushCurrentDeckSlide(activeDeckIndex - 1);
    }
  }

  // Set active deck from items
  function loadDeck(title, subtitle, slides, startIndex = 0) {
    activeDeck = slides.map((s, idx) => ({
      ...s,
      slide_index: idx,
      total_slides: slides.length
    }));
    activeDeckIndex = startIndex;
    deckTitle.textContent = title;
    deckSubtitle.textContent = subtitle || `${slides.length} slides`;

    deckSlidesContainer.innerHTML = '';
    activeDeck.forEach((slide, idx) => {
      const card = document.createElement('div');
      card.className = `deck-slide-item ${idx === startIndex ? 'active' : ''}`;
      card.innerHTML = `
        <span class="ds-index">${idx + 1}</span>
        <div class="ds-text">${slide.text}</div>
      `;
      card.addEventListener('click', () => {
        pushCurrentDeckSlide(idx);
      });
      deckSlidesContainer.appendChild(card);
    });

    currentSlideNum.textContent = startIndex + 1;
    totalSlideNum.textContent = activeDeck.length;

    // Sync Mobile Counter
    const mobCurrent = document.getElementById('mob-current-slide');
    const mobTotal = document.getElementById('mob-total-slide');
    if (mobCurrent) mobCurrent.textContent = startIndex + 1;
    if (mobTotal) mobTotal.textContent = activeDeck.length;
  }

  // --- POPUP WINDOW LAUNCHERS ---
  btnOpenProjector.addEventListener('click', () => {
    window.open('/projector', 'RemidosProjetor', 'width=1280,height=720,menubar=no,toolbar=no,location=no');
  });

  btnOpenStage.addEventListener('click', () => {
    window.open('/stage', 'RemidosRetorno', 'width=960,height=540,menubar=no,toolbar=no,location=no');
  });

  btnOpenObs.addEventListener('click', () => {
    const url = window.location.origin + '/obs';
    navigator.clipboard.writeText(url).then(() => {
      alert(`Link do OBS copiado para a área de transferência:\n\n${url}\n\nCole como 'Fonte de Navegador' (Browser Source) no OBS Studio.`);
    }).catch(() => {
      window.open('/obs', '_blank');
    });
  });

  // Desktop Buttons
  btnBlackout.addEventListener('click', toggleBlackout);
  btnClear.addEventListener('click', toggleClear);
  btnLogo.addEventListener('click', toggleLogo);
  btnNextSlide.addEventListener('click', nextSlide);
  btnPrevSlide.addEventListener('click', prevSlide);

  // Mobile Bottom Bar Buttons
  const mobBtnPrev = document.getElementById('mob-btn-prev');
  const mobBtnNext = document.getElementById('mob-btn-next');
  const mobBtnBlackout = document.getElementById('mob-btn-blackout');
  const mobBtnClear = document.getElementById('mob-btn-clear');
  const mobBtnLogo = document.getElementById('mob-btn-logo');
  const mobBtnDeck = document.getElementById('mob-btn-deck');

  if (mobBtnPrev) mobBtnPrev.addEventListener('click', prevSlide);
  if (mobBtnNext) mobBtnNext.addEventListener('click', nextSlide);
  if (mobBtnBlackout) mobBtnBlackout.addEventListener('click', toggleBlackout);
  if (mobBtnClear) mobBtnClear.addEventListener('click', toggleClear);
  if (mobBtnLogo) mobBtnLogo.addEventListener('click', toggleLogo);
  if (mobBtnDeck) {
    mobBtnDeck.addEventListener('click', () => {
      const deckTab = document.querySelector('.sub-nav .nav-btn[data-tab="tab-deck"]');
      if (deckTab) {
        deckTab.click();
      } else {
        document.body.classList.toggle('mobile-deck-active');
      }
    });
  }

  // Keyboard Shortcuts
  window.addEventListener('keydown', (e) => {
    // If user is typing in an input or textarea, ignore shortcuts
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
      return;
    }

    if (e.key === 'ArrowRight' || e.code === 'Space') {
      e.preventDefault();
      nextSlide();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      prevSlide();
    } else if (e.key.toLowerCase() === 's' || e.key.toLowerCase() === 'b') {
      e.preventDefault();
      toggleBlackout();
    } else if (e.key.toLowerCase() === 'c') {
      e.preventDefault();
      toggleClear();
    } else if (e.key.toLowerCase() === 'l') {
      e.preventDefault();
      toggleLogo();
    }
  });

  // --- TABS LOGIC ---
  navTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      navTabs.forEach(t => t.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));

      tab.classList.add('active');
      const targetId = tab.getAttribute('data-tab');

      if (targetId === 'tab-deck') {
        document.body.classList.add('mobile-deck-active');
        const rightSidebar = document.querySelector('.console-column.right-sidebar');
        if (rightSidebar) {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      } else {
        document.body.classList.remove('mobile-deck-active');
        const targetEl = document.getElementById(targetId);
        if (targetEl) {
          targetEl.classList.add('active');
        }
      }
    });
  });

  // --- BIBLE TAB LOGIC ---
  async function loadBooks() {
    try {
      const res = await fetch('/api/bible/books');
      const books = await res.json();
      bibleBookSelect.innerHTML = '<option value="">Selecione um Livro...</option>';
      books.forEach(b => {
        const opt = document.createElement('option');
        opt.value = b.id;
        opt.dataset.chapters = b.chapter_count;
        opt.dataset.name = b.name;
        opt.textContent = `${b.name} (${b.testament})`;
        bibleBookSelect.appendChild(opt);
      });
    } catch (err) {
      console.error('Failed to load bible books:', err);
    }
  }

  bibleBookSelect.addEventListener('change', () => {
    const selected = bibleBookSelect.options[bibleBookSelect.selectedIndex];
    if (!selected || !selected.value) {
      bibleChapterSelect.disabled = true;
      bibleChapterSelect.innerHTML = '<option value="">Capítulo...</option>';
      return;
    }

    const chapterCount = parseInt(selected.dataset.chapters);
    bibleChapterSelect.innerHTML = '<option value="">Capítulo...</option>';
    for (let i = 1; i <= chapterCount; i++) {
      const opt = document.createElement('option');
      opt.value = i;
      opt.textContent = `Capítulo ${i}`;
      bibleChapterSelect.appendChild(opt);
    }
    bibleChapterSelect.disabled = false;
  });

  bibleChapterSelect.addEventListener('change', async () => {
    const bookId = bibleBookSelect.value;
    const chapter = bibleChapterSelect.value;
    const version = bibleVersionSelect.value;
    if (!bookId || !chapter) return;

    const res = await fetch(`/api/bible/chapter?book_id=${bookId}&chapter=${chapter}&version=${version}`);
    const data = await res.json();
    renderBibleVerses(data.verses.map(v => ({
      ...v,
      book_name: data.book_name,
      chapter: data.chapter
    })), `${data.book_name} ${data.chapter}`);
  });

  async function performBibleSearch(query) {
    if (!query || !query.trim()) return;
    const version = bibleVersionSelect.value;
    bibleResultsTitle.textContent = `Buscando "${query}"...`;
    
    try {
      const res = await fetch(`/api/bible/search?q=${encodeURIComponent(query)}&version=${version}`);
      const data = await res.json();
      const title = data.type === 'reference' ? data.reference_text : `Resultados para "${query}"`;
      renderBibleVerses(data.results, title);
    } catch (err) {
      console.error('Search error:', err);
    }
  }

  btnBibleSearch.addEventListener('click', () => {
    performBibleSearch(bibleSearchInput.value);
  });

  bibleSearchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      performBibleSearch(bibleSearchInput.value);
    }
  });

  quickRefChips.forEach(chip => {
    chip.addEventListener('click', () => {
      const ref = chip.getAttribute('data-ref');
      bibleSearchInput.value = ref;
      performBibleSearch(ref);
    });
  });

  function renderBibleVerses(verses, groupTitle) {
    bibleResultsTitle.textContent = groupTitle;
    bibleResultsCount.textContent = verses.length;
    bibleResultsList.innerHTML = '';

    if (verses.length === 0) {
      bibleResultsList.innerHTML = `
        <div class="empty-state">
          <span class="empty-icon">🔍</span>
          <p>Nenhum versículo encontrado para essa consulta.</p>
        </div>
      `;
      return;
    }

    // Convert verses to slide format for deck
    const formattedSlides = verses.map(v => ({
      type: 'Bíblia',
      title: `${v.book_name} ${v.chapter}:${v.verse}`,
      reference: `${v.book_name} ${v.chapter}:${v.verse} (${bibleVersionSelect.value})`,
      text: v.text
    }));

    verses.forEach((v, idx) => {
      const item = document.createElement('div');
      item.className = 'verse-item';
      item.innerHTML = `
        <div class="verse-num">${v.verse}</div>
        <div class="verse-text-body">${v.text}</div>
        <div class="verse-actions-mini">
          <button class="btn-mini btn-proj" title="Projetar agora">Telão</button>
          <button class="btn-mini btn-setlist" title="Adicionar ao Culto">➕</button>
        </div>
      `;

      // Project verse immediately
      item.querySelector('.btn-proj').addEventListener('click', (e) => {
        e.stopPropagation();
        loadDeck(groupTitle, 'Passagem Bíblica', formattedSlides, idx);
        pushCurrentDeckSlide(idx);
      });

      item.querySelector('.btn-setlist').addEventListener('click', (e) => {
        e.stopPropagation();
        addToSetlist({
          type: 'bible',
          title: `${v.book_name} ${v.chapter}:${v.verse}`,
          slides: [formattedSlides[idx]]
        });
      });

      item.addEventListener('click', () => {
        loadDeck(groupTitle, 'Passagem Bíblica', formattedSlides, idx);
        pushCurrentDeckSlide(idx);
      });

      bibleResultsList.appendChild(item);
    });
  }

  // --- SONGS TAB LOGIC ---
  async function loadSongs(search = '') {
    try {
      const res = await fetch(`/api/songs?search=${encodeURIComponent(search)}`);
      const songs = await res.json();
      songsList.innerHTML = '';

      if (songs.length === 0) {
        songsList.innerHTML = '<p class="placeholder-text" style="padding:10px;">Nenhum louvor encontrado.</p>';
        return;
      }

      songs.forEach((s, idx) => {
        const item = document.createElement('div');
        item.className = `song-list-item ${currentLoadedSong && currentLoadedSong.id === s.id ? 'selected' : ''}`;
        item.innerHTML = `
          <div class="sli-title">${s.title}</div>
          <div class="sli-artist">${s.artist || 'Sem artista'}</div>
        `;
        item.addEventListener('click', () => {
          document.querySelectorAll('.song-list-item').forEach(el => el.classList.remove('selected'));
          item.classList.add('selected');
          selectSong(s.id);
        });
        songsList.appendChild(item);
      });

      // Auto select "A Bênção" on first load if none selected to match default liturgical state
      if (!currentLoadedSong && songs.length > 0) {
        const aBencao = songs.find(s => s.title.toLowerCase().includes('bênção') || s.title.toLowerCase().includes('bencao'));
        if (aBencao) {
          selectSong(aBencao.id, 3);
        } else {
          selectSong(songs[0].id, 0);
        }
      }
    } catch (err) {
      console.error('Failed to load songs:', err);
    }
  }

  songsSearchInput.addEventListener('input', (e) => {
    loadSongs(e.target.value);
  });

  async function selectSong(songId, initialSlideIndex = 0) {
    try {
      const res = await fetch(`/api/songs/${songId}`);
      const song = await res.json();
      currentLoadedSong = song;

      songSelectedTitle.textContent = song.title;
      songSelectedArtist.textContent = song.artist || 'Igreja Remidos em Cristo';

      // Render song slides in grid
      songSlidesGrid.innerHTML = '';
      const formattedDeckSlides = song.slides.map((s, idx) => ({
        type: s.type || 'Louvor',
        title: song.title,
        reference: `${song.title} • ${s.type || 'Verso'}`,
        text: s.text
      }));

      song.slides.forEach((slide, idx) => {
        const card = document.createElement('div');
        card.className = 'slide-flow-card';
        card.innerHTML = `
          <div class="sfc-header">
            <span>${slide.type || `Estrofe ${idx + 1}`}</span>
            <span>#${idx + 1}</span>
          </div>
          <div class="sfc-text">${slide.text}</div>
        `;

        card.addEventListener('click', () => {
          loadDeck(song.title, song.artist, formattedDeckSlides, idx);
          pushCurrentDeckSlide(idx);
        });

        songSlidesGrid.appendChild(card);
      });

      // Automatically stage to deck
      const safeIndex = (initialSlideIndex >= 0 && initialSlideIndex < formattedDeckSlides.length) ? initialSlideIndex : 0;
      loadDeck(song.title, song.artist, formattedDeckSlides, safeIndex);

    } catch (err) {
      console.error('Failed to select song:', err);
    }
  }

  btnAddSongToSetlist.addEventListener('click', () => {
    if (!currentLoadedSong) return;
    addToSetlist({
      type: 'song',
      title: currentLoadedSong.title,
      artist: currentLoadedSong.artist,
      slides: currentLoadedSong.slides.map(s => ({
        type: s.type || 'Louvor',
        title: currentLoadedSong.title,
        reference: `${currentLoadedSong.title} • ${s.type || 'Louvor'}`,
        text: s.text
      }))
    });
  });

  btnEditSong.addEventListener('click', () => {
    if (!currentLoadedSong) return;
    openSongModal(currentLoadedSong);
  });

  btnDeleteSong.addEventListener('click', async () => {
    if (!currentLoadedSong) return;
    if (confirm(`Deseja realmente excluir o louvor "${currentLoadedSong.title}"?`)) {
      await fetch(`/api/songs/${currentLoadedSong.id}`, { method: 'DELETE' });
      currentLoadedSong = null;
      loadSongs();
    }
  });

  btnNewSong.addEventListener('click', () => {
    openSongModal();
  });

  function openSongModal(song = null) {
    if (song) {
      modalSongTitle.textContent = 'Editar Louvor';
      modalSongId.value = song.id;
      modalSongName.value = song.title;
      modalSongArtist.value = song.artist || '';
      modalSongTags.value = song.tags || '';
      modalSongLyrics.value = song.slides.map(s => `[${s.type || 'Verso'}]\n${s.text}`).join('\n\n');
    } else {
      modalSongTitle.textContent = 'Adicionar Novo Louvor';
      modalSongId.value = '';
      modalSongName.value = '';
      modalSongArtist.value = '';
      modalSongTags.value = '';
      modalSongLyrics.value = '';
    }
    modalSong.style.display = 'flex';
  }

  function closeSongModal() {
    modalSong.style.display = 'none';
  }

  btnCloseSongModal.addEventListener('click', closeSongModal);
  btnModalCancel.addEventListener('click', closeSongModal);

  btnModalSave.addEventListener('click', async () => {
    const title = modalSongName.value.trim();
    if (!title) {
      alert('Por favor, informe o título do louvor.');
      return;
    }

    const rawLyrics = modalSongLyrics.value.trim();
    // Smart split of modal text
    const paragraphs = rawLyrics.split(/\n\s*\n/);
    const slides = [];

    paragraphs.forEach(para => {
      const lines = para.split('\n').map(l => l.trim()).filter(l => l);
      if (lines.length === 0) return;

      let type = 'Verso';
      let cleanLines = [];
      lines.forEach(line => {
        if (line.startsWith('[') && line.endsWith(']')) {
          type = line.slice(1, -1);
        } else {
          cleanLines.push(line);
        }
      });

      if (cleanLines.length > 0) {
        slides.push({
          type: type,
          text: cleanLines.join('\n')
        });
      }
    });

    const songId = modalSongId.value ? parseInt(modalSongId.value) : null;
    const payload = {
      id: songId,
      title: title,
      artist: modalSongArtist.value.trim(),
      tags: modalSongTags.value.trim(),
      slides: slides.length > 0 ? slides : [{ type: 'Verso', text: rawLyrics }]
    };

    const res = await fetch('/api/songs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const saved = await res.json();
    closeSongModal();
    await loadSongs();
    selectSong(saved.id);
  });

  // --- AI NEMOTRON & TRANSCRIPTION LOGIC ---
  async function processAI(isOffline = false) {
    const text = aiRawText.value.trim();
    if (!text) {
      aiStatusNote.style.display = 'block';
      aiStatusNote.textContent = 'Por favor, cole um texto, letra ou transcrição antes de processar.';
      return;
    }

    const modeInput = document.querySelector('input[name="ai-mode"]:checked');
    const mode = modeInput ? modeInput.value : 'worship';
    const model = isOffline ? 'offline' : (aiModelSelect ? aiModelSelect.value : '');

    btnRunAi.disabled = true;
    btnRunOffline.disabled = true;
    if (aiSpinner) aiSpinner.style.display = 'inline-block';
    aiStatusNote.style.display = 'block';
    aiStatusNote.textContent = isOffline ? 'Formatando localmente...' : 'Processando com IA Igreja... Aguarde alguns instantes.';

    try {
      const res = await fetch('/api/ai/format', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text,
          mode: mode,
          model: isOffline ? '' : model
        })
      });

      const data = await res.json();
      lastAiResult = data;
      renderAiResults(data);
    } catch (err) {
      aiStatusNote.textContent = `Erro ao processar: ${err.message}`;
    } finally {
      btnRunAi.disabled = false;
      btnRunOffline.disabled = false;
      if (aiSpinner) aiSpinner.style.display = 'none';
    }
  }

  btnRunAi.addEventListener('click', () => processAI(false));
  btnRunOffline.addEventListener('click', () => processAI(true));

  btnClearAi.addEventListener('click', () => {
    aiRawText.value = '';
    aiResultsSection.style.display = 'none';
    aiStatusNote.style.display = 'none';
    lastAiResult = null;
  });

  function renderAiResults(data) {
    aiResultsSection.style.display = 'block';
    aiDetectedTitle.textContent = data.title || 'Louvor Formatado';
    aiDetectedArtist.textContent = data.artist || 'Igreja Remidos em Cristo';
    aiStatusNote.textContent = data.note || 'Processamento concluído com sucesso!';

    aiGeneratedSlides.innerHTML = '';
    (data.slides || []).forEach((slide, idx) => {
      const card = document.createElement('div');
      card.className = 'slide-flow-card';
      card.innerHTML = `
        <div class="sfc-header">
          <span>${slide.type || `Slide ${idx + 1}`}</span>
          <span>#${idx + 1}</span>
        </div>
        <div class="sfc-text">${slide.text}</div>
      `;

      card.addEventListener('click', () => {
        const deckSlides = data.slides.map(s => ({
          type: s.type || 'Louvor',
          title: data.title,
          reference: `${data.title} • ${s.type || 'Verso'}`,
          text: s.text
        }));
        loadDeck(data.title, data.artist, deckSlides, idx);
        pushCurrentDeckSlide(idx);
      });

      aiGeneratedSlides.appendChild(card);
    });
  }

  btnAiProjectFirst.addEventListener('click', () => {
    if (!lastAiResult || !lastAiResult.slides || lastAiResult.slides.length === 0) return;
    const deckSlides = lastAiResult.slides.map(s => ({
      type: s.type || 'Louvor',
      title: lastAiResult.title,
      reference: `${lastAiResult.title} • ${s.type || 'Verso'}`,
      text: s.text
    }));
    loadDeck(lastAiResult.title, lastAiResult.artist, deckSlides, 0);
    pushCurrentDeckSlide(0);
  });

  btnAiSaveSong.addEventListener('click', async () => {
    if (!lastAiResult) return;
    const payload = {
      title: lastAiResult.title || 'Novo Louvor NeMoTron',
      artist: lastAiResult.artist || '',
      tags: 'IA NeMoTron, louvor',
      slides: lastAiResult.slides
    };

    const res = await fetch('/api/songs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const saved = await res.json();
    aiStatusNote.style.display = 'block';
    aiStatusNote.textContent = `Louvor "${saved.title}" salvo com sucesso no acervo! Redirecionando para Louvores...`;
    
    // 1. Reload the song catalog
    await loadSongs();

    // 2. Select and stage the newly saved song
    if (saved && saved.id) {
      await selectSong(saved.id, 0);
    }

    // 3. Switch directly to Louvores tab
    navTabs.forEach(t => t.classList.remove('active'));
    tabContents.forEach(c => c.classList.remove('active'));
    const songsTabBtn = document.querySelector('.sub-nav .nav-btn[data-tab="tab-songs"]');
    const songsTabPane = document.getElementById('tab-songs');
    if (songsTabBtn) songsTabBtn.classList.add('active');
    if (songsTabPane) songsTabPane.classList.add('active');
  });

  // --- SETLIST (ORDEM DO CULTO) LOGIC ---
  function addToSetlist(item) {
    currentSetlist.push(item);
    renderSetlist();
  }

  function renderSetlist() {
    if (currentSetlist.length === 0) {
      currentSetlistItems.innerHTML = `
        <div class="empty-placeholder">
          <p>Nenhum item adicionado ao roteiro. Navegue nas abas Bíblia e Louvores para adicionar itens ao culto.</p>
        </div>
      `;
      return;
    }

    currentSetlistItems.innerHTML = '';
    currentSetlist.forEach((item, idx) => {
      const card = document.createElement('div');
      card.className = 'setlist-item-card';
      card.innerHTML = `
        <div>
          <strong>${idx + 1}. ${item.title}</strong>
          <div class="muted-label">${item.type === 'bible' ? 'Passagem Bíblica' : (item.artist || 'Louvor')} • ${item.slides.length} slides</div>
        </div>
        <div class="song-header-actions">
          <button class="tool-btn primary btn-load-setlist">Iniciar</button>
          <button class="tool-btn danger btn-remove-setlist">&times;</button>
        </div>
      `;

      card.querySelector('.btn-load-setlist').addEventListener('click', () => {
        loadDeck(item.title, item.artist || '', item.slides, 0);
        pushCurrentDeckSlide(0);
      });

      card.querySelector('.btn-remove-setlist').addEventListener('click', () => {
        currentSetlist.splice(idx, 1);
        renderSetlist();
      });

      currentSetlistItems.appendChild(card);
    });
  }

  btnClearSetlist.addEventListener('click', () => {
    if (confirm('Deseja limpar todos os itens do roteiro do culto?')) {
      currentSetlist = [];
      renderSetlist();
    }
  });

  // --- SETTINGS LOGIC ---
  async function broadcastLiveStyles() {
    const styles = {
      font_family: settingFontFamily ? settingFontFamily.value : "'Montserrat', sans-serif",
      text_weight: settingFontWeight ? settingFontWeight.value : "700",
      text_position: settingTextPosition ? settingTextPosition.value : "center",
      text_align: settingTextAlign ? settingTextAlign.value : "center",
      bg_dim: settingBgDim ? parseInt(settingBgDim.value) : 18,
      text_shadow: settingTextShadow ? settingTextShadow.value : "cinematic"
    };
    await fetch('/api/projector/styles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(styles)
    });
  }

  if (settingFontFamily) settingFontFamily.addEventListener('change', broadcastLiveStyles);
  if (settingFontWeight) settingFontWeight.addEventListener('change', broadcastLiveStyles);
  if (settingTextPosition) settingTextPosition.addEventListener('change', broadcastLiveStyles);
  if (settingTextAlign) settingTextAlign.addEventListener('change', broadcastLiveStyles);
  if (settingTextShadow) settingTextShadow.addEventListener('change', broadcastLiveStyles);
  if (settingBgDim) {
    settingBgDim.addEventListener('input', (e) => {
      if (bgDimValLabel) bgDimValLabel.textContent = `${e.target.value}%`;
      broadcastLiveStyles();
    });
  }

  async function loadSettings() {
    try {
      const res = await fetch('/api/settings');
      const settings = await res.json();
      if (settings.church_name && settingChurchName) settingChurchName.value = settings.church_name;
      if (settings.church_subtitle && settingChurchSubtitle) settingChurchSubtitle.value = settings.church_subtitle;
      if (settings.nvidia_api_key && settingNvidiaKey) settingNvidiaKey.value = settings.nvidia_api_key;
      if (settings.font_family && settingFontFamily) settingFontFamily.value = settings.font_family;
      if (settings.text_weight && settingFontWeight) settingFontWeight.value = settings.text_weight;
      if (settings.text_position && settingTextPosition) settingTextPosition.value = settings.text_position;
      if (settings.text_align && settingTextAlign) settingTextAlign.value = settings.text_align;
      if (settings.bg_dim !== undefined && settingBgDim) {
        settingBgDim.value = settings.bg_dim;
        if (bgDimValLabel) bgDimValLabel.textContent = `${settings.bg_dim}%`;
      }
      if (settings.text_shadow && settingTextShadow) settingTextShadow.value = settings.text_shadow;
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
  }

  btnSaveSettings.addEventListener('click', async () => {
    const payload = {
      church_name: settingChurchName.value.trim(),
      church_subtitle: settingChurchSubtitle.value.trim(),
      nvidia_api_key: settingNvidiaKey.value.trim(),
      font_family: settingFontFamily ? settingFontFamily.value : "'Montserrat', sans-serif",
      text_weight: settingFontWeight ? settingFontWeight.value : "700",
      text_position: settingTextPosition ? settingTextPosition.value : "center",
      text_align: settingTextAlign ? settingTextAlign.value : "center",
      bg_dim: settingBgDim ? parseInt(settingBgDim.value) : 18,
      text_shadow: settingTextShadow ? settingTextShadow.value : "cinematic"
    };

    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    settingsSavedIndicator.style.display = 'inline';
    setTimeout(() => {
      settingsSavedIndicator.style.display = 'none';
    }, 2500);
  });

  // =========================================================================
  // BACKGROUND PRESETS & MOTION MEDIA
  // =========================================================================
  const bgPresetCards = document.querySelectorAll('.bg-preset-card');
  const inputBgUpload = document.getElementById('input-bg-upload');
  const liveThemeTag = document.getElementById('live-theme-tag');

  bgPresetCards.forEach(card => {
    card.addEventListener('click', async () => {
      const bgType = card.getAttribute('data-type');
      const bgUrl = card.getAttribute('data-url');
      const bgName = card.getAttribute('data-name');

      bgPresetCards.forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      if (liveThemeTag) liveThemeTag.textContent = bgName;

      await fetch('/api/projector/background', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bg_type: bgType, bg_url: bgUrl, theme_name: bgName })
      });
    });
  });

  if (inputBgUpload) {
    inputBgUpload.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const formData = new FormData();
      formData.append('file', file);

      try {
        const res = await fetch('/api/backgrounds/upload', {
          method: 'POST',
          body: formData
        });
        const data = await res.json();
        if (data.url) {
          bgPresetCards.forEach(c => c.classList.remove('active'));
          if (liveThemeTag) liveThemeTag.textContent = data.theme_name || 'Personalizado';
          alert(`Mídia de fundo '${file.name}' enviada e aplicada com sucesso no telão!`);
        }
      } catch (err) {
        alert('Erro ao enviar mídia de fundo: ' + err.message);
      }
    });
  }

  // =========================================================================
  // IMPORT SONG FROM URL / SEARCH MODAL
  // =========================================================================
  const modalImportSong = document.getElementById('modal-import-song');
  const btnOpenImportModal = document.getElementById('btn-open-import-modal');
  const btnCloseImportModal = document.getElementById('btn-close-import-modal');
  const btnCancelImport = document.getElementById('btn-cancel-import');
  const btnDoImport = document.getElementById('btn-do-import');
  const importUrlInput = document.getElementById('import-url-input');
  const importSpinner = document.getElementById('import-spinner');
  const importError = document.getElementById('import-error');
  const importPreviewArea = document.getElementById('import-preview-area');
  const importResTitle = document.getElementById('import-res-title');
  const importResArtist = document.getElementById('import-res-artist');
  const importResSlidesCount = document.getElementById('import-res-slides-count');
  const importResSlidesList = document.getElementById('import-res-slides-list');
  const btnSaveImportedSong = document.getElementById('btn-save-imported-song');

  let importedSongData = null;

  function openImportModal() {
    if (modalImportSong) {
      modalImportSong.style.display = 'flex';
      if (importUrlInput) {
        importUrlInput.value = '';
        importUrlInput.focus();
      }
      if (importPreviewArea) importPreviewArea.style.display = 'none';
      if (importError) importError.style.display = 'none';
      if (importSpinner) importSpinner.style.display = 'none';
      if (btnSaveImportedSong) btnSaveImportedSong.style.display = 'none';
      importedSongData = null;
    }
  }

  function closeImportModal() {
    if (modalImportSong) modalImportSong.style.display = 'none';
  }

  if (btnOpenImportModal) btnOpenImportModal.addEventListener('click', openImportModal);
  if (btnCloseImportModal) btnCloseImportModal.addEventListener('click', closeImportModal);
  if (btnCancelImport) btnCancelImport.addEventListener('click', closeImportModal);

  if (btnDoImport) {
    btnDoImport.addEventListener('click', async () => {
      const q = importUrlInput.value.trim();
      if (!q) {
        alert('Digite o link do louvor ou o nome da música e cantor.');
        return;
      }

      importSpinner.style.display = 'block';
      importError.style.display = 'none';
      importPreviewArea.style.display = 'none';
      btnSaveImportedSong.style.display = 'none';

      try {
        const res = await fetch('/api/songs/import-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url_or_query: q })
        });
        const data = await res.json();

        if (!res.ok || data.error) {
          throw new Error(data.error || 'Erro ao importar letra');
        }

        importedSongData = data;
        importResTitle.textContent = data.title;
        importResArtist.textContent = data.artist || 'Artista não identificado';
        importResSlidesCount.textContent = `${data.slides.length} slides`;

        importResSlidesList.innerHTML = '';
        data.slides.forEach((sl, idx) => {
          const row = document.createElement('div');
          row.className = 'import-slide-row';
          row.innerHTML = `
            <div class="import-slide-type">${sl.type}</div>
            <div class="import-slide-text">${sl.text}</div>
          `;
          importResSlidesList.appendChild(row);
        });

        importPreviewArea.style.display = 'flex';
        btnSaveImportedSong.style.display = 'inline-flex';
      } catch (err) {
        importError.textContent = err.message;
        importError.style.display = 'block';
      } finally {
        importSpinner.style.display = 'none';
      }
    });
  }

  if (btnSaveImportedSong) {
    btnSaveImportedSong.addEventListener('click', async () => {
      if (!importedSongData) return;

      try {
        const res = await fetch('/api/songs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: importedSongData.title,
            artist: importedSongData.artist || '',
            tags: importedSongData.tags || 'importado',
            slides: importedSongData.slides
          })
        });
        const saved = await res.json();
        closeImportModal();
        await loadSongs();
        if (saved && saved.id) {
          selectSong(saved.id);
        }
        alert(`Louvor '${importedSongData.title}' salvo com sucesso no acervo!`);
      } catch (err) {
        alert('Erro ao salvar louvor: ' + err.message);
      }
    });
  }

  // =========================================================================
  // ALTAR & CULTO TOOLS (STAGE ALERTS, PROJECTOR ALERTS & COUNTDOWN TIMER)
  // =========================================================================
  const modalAlertsTimer = document.getElementById('modal-alerts-timer');
  const btnOpenAlertsHeader = document.getElementById('btn-open-alerts-header');
  const btnOpenAlertsDeck = document.getElementById('btn-open-alerts-deck');
  const mobBtnAlerts = document.getElementById('mob-btn-alerts');
  const btnCloseAlertsModal = document.getElementById('btn-close-alerts-modal');
  const btnCloseAlertsFooter = document.getElementById('btn-close-alerts-footer');

  // Modal UI elements
  const adminTimerStatus = document.getElementById('admin-timer-status');
  const adminTimerClock = document.getElementById('admin-timer-clock');
  const adminTimerDesc = document.getElementById('admin-timer-desc');
  const activeTimerIndicator = document.getElementById('active-timer-indicator');
  const inputTimerMinutes = document.getElementById('input-timer-minutes');
  const inputTimerLabel = document.getElementById('input-timer-label');
  const btnTimerStart = document.getElementById('btn-timer-start');
  const btnTimerStop = document.getElementById('btn-timer-stop');
  const btnTimerReset = document.getElementById('btn-timer-reset');

  // Tab UI elements (Dedicated Culto & Altar Tab)
  const tabTimerStatus = document.getElementById('tab-timer-status');
  const tabTimerClock = document.getElementById('tab-timer-clock');
  const tabTimerDesc = document.getElementById('tab-timer-desc');
  const tabInputTimerMinutes = document.getElementById('tab-input-timer-minutes');
  const tabInputTimerLabel = document.getElementById('tab-input-timer-label');
  const tabBtnTimerStart = document.getElementById('tab-btn-timer-start');
  const tabBtnTimerStop = document.getElementById('tab-btn-timer-stop');
  const tabBtnTimerReset = document.getElementById('tab-btn-timer-reset');

  // Stage Alert UI elements
  const adminStageAlertStatus = document.getElementById('admin-stage-alert-status');
  const tabStageAlertStatus = document.getElementById('tab-stage-alert-status');
  const inputStageAlert = document.getElementById('input-stage-alert');
  const tabInputStageAlert = document.getElementById('tab-input-stage-alert');
  const btnSendStageAlert = document.getElementById('btn-send-stage-alert');
  const tabBtnSendStageAlert = document.getElementById('tab-btn-send-stage-alert');
  const btnClearStageAlert = document.getElementById('btn-clear-stage-alert');
  const tabBtnClearStageAlert = document.getElementById('tab-btn-clear-stage-alert');

  // Projector Alert UI elements
  const adminProjAlertStatus = document.getElementById('admin-proj-alert-status');
  const tabProjAlertStatus = document.getElementById('tab-proj-alert-status');
  const inputProjAlert = document.getElementById('input-proj-alert');
  const tabInputProjAlert = document.getElementById('tab-input-proj-alert');
  const btnSendProjAlert = document.getElementById('btn-send-proj-alert');
  const tabBtnSendProjAlert = document.getElementById('tab-btn-send-proj-alert');
  const btnClearProjAlert = document.getElementById('btn-clear-proj-alert');
  const tabBtnClearProjAlert = document.getElementById('tab-btn-clear-proj-alert');

  let adminTimer = {
    active: false,
    targetTimestamp: 0,
    label: 'Pregação',
    duration: 40
  };

  function activateAltarTab() {
    const altarNavBtn = document.querySelector('.nav-btn[data-tab="tab-altar"]');
    if (altarNavBtn) {
      altarNavBtn.click();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      openAlertsModal();
    }
  }

  function openAlertsModal() {
    if (modalAlertsTimer) modalAlertsTimer.style.display = 'flex';
  }

  function closeAlertsModal() {
    if (modalAlertsTimer) modalAlertsTimer.style.display = 'none';
  }

  if (btnOpenAlertsHeader) btnOpenAlertsHeader.addEventListener('click', activateAltarTab);
  if (btnOpenAlertsDeck) btnOpenAlertsDeck.addEventListener('click', openAlertsModal);
  if (mobBtnAlerts) mobBtnAlerts.addEventListener('click', activateAltarTab);
  if (btnCloseAlertsModal) btnCloseAlertsModal.addEventListener('click', closeAlertsModal);
  if (btnCloseAlertsFooter) btnCloseAlertsFooter.addEventListener('click', closeAlertsModal);
  if (modalAlertsTimer) {
    modalAlertsTimer.addEventListener('click', (e) => {
      if (e.target === modalAlertsTimer) closeAlertsModal();
    });
  }

  // Timer Tick Function
  function tickAdminTimer() {
    if (!adminTimer.active || !adminTimer.targetTimestamp) {
      if (adminTimerStatus) {
        adminTimerStatus.textContent = 'Pausado';
        adminTimerStatus.className = 'timer-live-badge inactive';
      }
      if (tabTimerStatus) {
        tabTimerStatus.textContent = 'Pausado';
        tabTimerStatus.className = 'timer-live-badge inactive';
      }
      if (activeTimerIndicator) {
        activeTimerIndicator.style.display = 'none';
      }
      return;
    }

    if (adminTimerStatus) {
      adminTimerStatus.textContent = 'Em andamento';
      adminTimerStatus.className = 'timer-live-badge active';
    }
    if (tabTimerStatus) {
      tabTimerStatus.textContent = 'Em andamento';
      tabTimerStatus.className = 'timer-live-badge active';
    }

    const nowSec = Date.now() / 1000;
    const diff = Math.round(adminTimer.targetTimestamp - nowSec);

    let timeText = '00:00';
    let styleClass = 'admin-timer-numbers normal';
    if (diff <= 0) {
      const over = Math.abs(diff);
      const m = String(Math.floor(over / 60)).padStart(2, '0');
      const s = String(over % 60).padStart(2, '0');
      timeText = `-${m}:${s}`;
      styleClass = 'admin-timer-numbers overtime';
    } else {
      const m = String(Math.floor(diff / 60)).padStart(2, '0');
      const s = String(diff % 60).padStart(2, '0');
      timeText = `${m}:${s}`;
      styleClass = diff <= 300 ? 'admin-timer-numbers warning' : 'admin-timer-numbers normal';
    }

    if (adminTimerClock) {
      adminTimerClock.textContent = timeText;
      adminTimerClock.className = styleClass;
    }
    if (tabTimerClock) {
      tabTimerClock.textContent = timeText;
      tabTimerClock.className = styleClass;
    }
    if (adminTimerDesc) adminTimerDesc.textContent = adminTimer.label || 'Pregação';
    if (tabTimerDesc) tabTimerDesc.textContent = adminTimer.label || 'Pregação';

    if (activeTimerIndicator) {
      activeTimerIndicator.textContent = timeText;
      activeTimerIndicator.style.display = 'inline-block';
    }
  }
  setInterval(tickAdminTimer, 1000);

  // Sync state handler
  function updateAltarAlertsUI(state) {
    if (!state) return;

    // 1. Stage Alert sync
    const stageMsg = state.stage_alert ? state.stage_alert.trim() : '';
    const stageStatusText = stageMsg ? ('Ativo no Palco: ' + stageMsg) : 'Nenhum aviso';
    const stageStatusClass = stageMsg ? 'status-indicator-pill active' : 'status-indicator-pill off';

    if (adminStageAlertStatus) {
      adminStageAlertStatus.className = stageStatusClass;
      adminStageAlertStatus.textContent = stageStatusText;
    }
    if (tabStageAlertStatus) {
      tabStageAlertStatus.className = stageStatusClass;
      tabStageAlertStatus.textContent = stageStatusText;
    }

    // 2. Projector Alert sync
    const projMsg = state.projector_alert ? state.projector_alert.trim() : '';
    const projStatusText = projMsg ? ('Projetando: ' + projMsg) : 'Nenhum alerta no ar';
    const projStatusClass = projMsg ? 'status-indicator-pill active' : 'status-indicator-pill off';

    if (adminProjAlertStatus) {
      adminProjAlertStatus.className = projStatusClass;
      adminProjAlertStatus.textContent = projStatusText;
    }
    if (tabProjAlertStatus) {
      tabProjAlertStatus.className = projStatusClass;
      tabProjAlertStatus.textContent = projStatusText;
    }

    // 3. Timer sync
    adminTimer.active = !!state.timer_active;
    adminTimer.targetTimestamp = state.timer_target_timestamp || 0;
    adminTimer.label = state.timer_label || 'Pregação';
    adminTimer.duration = state.timer_duration_minutes || 40;
    tickAdminTimer();
  }
  window.updateAltarAlertsUI = updateAltarAlertsUI;

  // Timer Presets & Controls
  const allTimerChips = document.querySelectorAll('.timer-chip');
  allTimerChips.forEach(chip => {
    chip.addEventListener('click', () => {
      const min = chip.getAttribute('data-min');
      const label = chip.getAttribute('data-label');
      allTimerChips.forEach(c => {
        c.classList.toggle('active', c.getAttribute('data-min') === min);
      });
      if (inputTimerMinutes) inputTimerMinutes.value = min;
      if (tabInputTimerMinutes) tabInputTimerMinutes.value = min;
      if (inputTimerLabel) inputTimerLabel.value = label;
      if (tabInputTimerLabel) tabInputTimerLabel.value = label;

      if (!adminTimer.active) {
        const previewText = `${String(min).padStart(2, '0')}:00`;
        if (adminTimerClock) {
          adminTimerClock.textContent = previewText;
          adminTimerClock.className = 'admin-timer-numbers normal';
        }
        if (tabTimerClock) {
          tabTimerClock.textContent = previewText;
          tabTimerClock.className = 'admin-timer-numbers normal';
        }
      }
      if (adminTimerDesc) adminTimerDesc.textContent = label;
      if (tabTimerDesc) tabTimerDesc.textContent = label;
    });
  });

  async function handleTimerStart(sourceInputMinutes, sourceInputLabel) {
    const minutes = parseInt(sourceInputMinutes ? sourceInputMinutes.value : 40) || 40;
    const label = (sourceInputLabel ? sourceInputLabel.value : 'Pregação') || 'Pregação';
    try {
      await fetch('/api/timer/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ minutes, label })
      });
    } catch (err) {
      alert('Erro ao iniciar cronômetro: ' + err.message);
    }
  }

  async function handleTimerStop() {
    try {
      await fetch('/api/timer/stop', { method: 'POST' });
    } catch (err) {
      alert('Erro ao pausar cronômetro: ' + err.message);
    }
  }

  async function handleTimerReset(sourceInputMinutes) {
    try {
      await fetch('/api/timer/reset', { method: 'POST' });
      const min = sourceInputMinutes ? sourceInputMinutes.value : '40';
      const previewText = `${String(min).padStart(2, '0')}:00`;
      if (adminTimerClock) {
        adminTimerClock.textContent = previewText;
        adminTimerClock.className = 'admin-timer-numbers normal';
      }
      if (tabTimerClock) {
        tabTimerClock.textContent = previewText;
        tabTimerClock.className = 'admin-timer-numbers normal';
      }
    } catch (err) {
      alert('Erro ao zerar cronômetro: ' + err.message);
    }
  }

  if (btnTimerStart) btnTimerStart.addEventListener('click', () => handleTimerStart(inputTimerMinutes, inputTimerLabel));
  if (tabBtnTimerStart) tabBtnTimerStart.addEventListener('click', () => handleTimerStart(tabInputTimerMinutes, tabInputTimerLabel));
  if (btnTimerStop) btnTimerStop.addEventListener('click', handleTimerStop);
  if (tabBtnTimerStop) tabBtnTimerStop.addEventListener('click', handleTimerStop);
  if (btnTimerReset) btnTimerReset.addEventListener('click', () => handleTimerReset(inputTimerMinutes));
  if (tabBtnTimerReset) tabBtnTimerReset.addEventListener('click', () => handleTimerReset(tabInputTimerMinutes));

  // Stage Alert Presets & Buttons
  const allStageChips = document.querySelectorAll('.chip-preset-stage');
  allStageChips.forEach(chip => {
    chip.addEventListener('click', () => {
      const text = chip.getAttribute('data-text') || '';
      if (inputStageAlert) inputStageAlert.value = text;
      if (tabInputStageAlert) tabInputStageAlert.value = text;
    });
  });

  async function handleSendStageAlert(sourceInput) {
    const msg = sourceInput ? sourceInput.value.trim() : '';
    if (!msg) return alert('Digite a mensagem para o palco.');
    try {
      await fetch('/api/alerts/stage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg })
      });
    } catch (err) {
      alert('Erro ao enviar mensagem ao palco: ' + err.message);
    }
  }

  async function handleClearStageAlert() {
    try {
      await fetch('/api/alerts/stage', { method: 'DELETE' });
      if (inputStageAlert) inputStageAlert.value = '';
      if (tabInputStageAlert) tabInputStageAlert.value = '';
    } catch (err) {
      alert('Erro ao limpar mensagem do palco: ' + err.message);
    }
  }

  if (btnSendStageAlert) btnSendStageAlert.addEventListener('click', () => handleSendStageAlert(inputStageAlert));
  if (tabBtnSendStageAlert) tabBtnSendStageAlert.addEventListener('click', () => handleSendStageAlert(tabInputStageAlert));
  if (btnClearStageAlert) btnClearStageAlert.addEventListener('click', handleClearStageAlert);
  if (tabBtnClearStageAlert) tabBtnClearStageAlert.addEventListener('click', handleClearStageAlert);

  // Projector Alert Presets & Buttons
  const allProjChips = document.querySelectorAll('.chip-preset-proj');
  allProjChips.forEach(chip => {
    chip.addEventListener('click', () => {
      const type = chip.getAttribute('data-type') || 'general';
      const text = chip.getAttribute('data-text') || '';
      document.querySelectorAll('input[name="proj_alert_type"], input[name="tab_proj_alert_type"]').forEach(r => {
        if (r.value === type) r.checked = true;
      });
      if (inputProjAlert) inputProjAlert.value = text;
      if (tabInputProjAlert) tabInputProjAlert.value = text;
    });
  });

  async function handleSendProjAlert(sourceInput, radioName) {
    const msg = sourceInput ? sourceInput.value.trim() : '';
    if (!msg) return alert('Digite a mensagem para o telão.');
    let selectedType = 'general';
    const checkedRadio = document.querySelector(`input[name="${radioName}"]:checked`);
    if (checkedRadio) selectedType = checkedRadio.value;
    try {
      await fetch('/api/alerts/projector', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, alert_type: selectedType })
      });
    } catch (err) {
      alert('Erro ao projetar alerta: ' + err.message);
    }
  }

  async function handleClearProjAlert() {
    try {
      await fetch('/api/alerts/projector', { method: 'DELETE' });
      if (inputProjAlert) inputProjAlert.value = '';
      if (tabInputProjAlert) tabInputProjAlert.value = '';
    } catch (err) {
      alert('Erro ao remover alerta do telão: ' + err.message);
    }
  }

  if (btnSendProjAlert) btnSendProjAlert.addEventListener('click', () => handleSendProjAlert(inputProjAlert, 'proj_alert_type'));
  if (tabBtnSendProjAlert) tabBtnSendProjAlert.addEventListener('click', () => handleSendProjAlert(tabInputProjAlert, 'tab_proj_alert_type'));
  if (btnClearProjAlert) btnClearProjAlert.addEventListener('click', handleClearProjAlert);
  if (tabBtnClearProjAlert) tabBtnClearProjAlert.addEventListener('click', handleClearProjAlert);

  // =========================================================================
  // PWA SERVICE WORKER REGISTRATION (AUTO-UPDATING)
  // =========================================================================
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').then((reg) => {
        console.log('PWA Service Worker registered:', reg.scope);
        // Prompt immediate update
        reg.update();
      }).catch((err) => {
        console.log('PWA registration notice:', err);
      });
    });
  }

  // --- INITIALIZE EVERYTHING ---
  initWebSocket();
  loadBooks();
  loadSongs();
  loadSettings();
});
