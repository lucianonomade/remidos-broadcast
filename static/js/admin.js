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
      liveStatusText.textContent = 'TELÃO APAGADO';
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
        liveStatusText.textContent = 'LOGO NO TELÃO';
        prevOverlayLogo.style.display = 'flex';
        prevOverlayClear.style.display = 'none';
        prevContent.style.display = 'none';
      } else {
        btnLogo.classList.remove('active');
        prevOverlayLogo.style.display = 'none';

        if (state.is_clear) {
          btnClear.classList.add('active');
          liveStatusText.textContent = 'TEXTO OCULTO';
          prevOverlayClear.style.display = 'flex';
          prevContent.style.display = 'none';
        } else {
          btnClear.classList.remove('active');
          liveBadge.className = 'live-badge on-air';
          liveStatusText.textContent = 'NO AR';
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

  // --- INITIALIZE EVERYTHING ---
  initWebSocket();
  loadBooks();
  loadSongs();
  loadSettings();
});
