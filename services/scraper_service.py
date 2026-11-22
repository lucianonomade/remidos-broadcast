import re
import urllib.parse
import requests
from bs4 import BeautifulSoup
from typing import Dict, Any, List

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7"
}

def split_text_into_slides(raw_text: str) -> List[Dict[str, str]]:
    """
    Splits raw lyrics into liturgical slides with intelligent type assignment:
    Verso 1, Verso 2, Refrão, Ponte, etc., keeping max 4 lines per slide.
    """
    raw_stanzas = [s.strip() for s in re.split(r'\n\s*\n', raw_text) if s.strip()]
    slides = []
    verse_counter = 1

    # Frequency tracking to identify repeated refrain/chorus
    stanza_counts = {}
    cleaned_stanzas = []
    for s in raw_stanzas:
        lines = [l.strip() for l in s.split('\n') if l.strip()]
        if not lines:
            continue
        joined = "\n".join(lines)
        cleaned_stanzas.append(joined)
        stanza_counts[joined] = stanza_counts.get(joined, 0) + 1

    for s in cleaned_stanzas:
        lines = s.split('\n')
        lower_s = s.lower()

        # Determine section type
        if "refrão" in lower_s or "chorus" in lower_s or stanza_counts.get(s, 0) > 1:
            slide_type = "Refrão"
        elif "ponte" in lower_s or "bridge" in lower_s:
            slide_type = "Ponte"
        elif "pré-refrão" in lower_s or "pre-chorus" in lower_s:
            slide_type = "Pré-Refrão"
        else:
            slide_type = f"Verso {verse_counter}"
            verse_counter += 1

        # Clean marker from text if present
        clean_lines = []
        for line in lines:
            if re.match(r'^\[?(verso|refrão|ponte|chorus|bridge|estrofe)[\s\d]*\]?$', line.strip(), re.IGNORECASE):
                continue
            clean_lines.append(line)

        # Chunk into max 4 lines per slide for optimal projection readability
        chunk_size = 4
        for i in range(0, len(clean_lines), chunk_size):
            chunk = clean_lines[i:i + chunk_size]
            if chunk:
                slides.append({
                    "type": slide_type,
                    "text": "\n".join(chunk)
                })

    return slides

def extract_metadata_from_url(url: str):
    """Extracts artist and track hints from popular Brazilian lyrics URLs"""
    parsed = urllib.parse.urlparse(url)
    path = parsed.path.strip('/')
    parts = [p for p in path.split('/') if p]

    artist_hint = ""
    track_hint = ""

    if 'letras.mus.br' in parsed.netloc:
        if len(parts) >= 2:
            artist_hint = parts[0].replace('-', ' ')
            track_hint = parts[1].replace('-', ' ')
        elif len(parts) == 1:
            track_hint = parts[0].replace('-', ' ')
    elif 'cifraclub.com.br' in parsed.netloc:
        if len(parts) >= 2:
            artist_hint = parts[0].replace('-', ' ')
            track_hint = parts[1].replace('-', ' ')
    elif 'vagalume.com.br' in parsed.netloc:
        if len(parts) >= 2:
            artist_hint = parts[0].replace('-', ' ')
            track_hint = parts[1].replace('.html', '').replace('-', ' ')

    return artist_hint, track_hint

def search_lrclib(query: str, artist: str = None, track: str = None) -> Dict[str, Any]:
    """Queries LRCLIB open music API for lyrics"""
    base_headers = {"User-Agent": "RemidosBroadcast/1.0 (https://remidos-broadcast.onrender.com)"}

    # 1. Try exact get if artist and track are known
    if artist and track:
        try:
            url = f"https://lrclib.net/api/get?track_name={requests.utils.quote(track)}&artist_name={requests.utils.quote(artist)}"
            r = requests.get(url, headers=base_headers, timeout=6)
            if r.status_code == 200:
                data = r.json()
                if data.get('plainLyrics'):
                    return {
                        "title": data.get('trackName') or track.title(),
                        "artist": data.get('artistName') or artist.title(),
                        "plain_lyrics": data['plainLyrics']
                    }
        except Exception:
            pass

    # 2. Search query
    search_q = query
    if artist and track:
        search_q = f"{track} {artist}"

    try:
        url = f"https://lrclib.net/api/search?q={requests.utils.quote(search_q)}"
        r = requests.get(url, headers=base_headers, timeout=6)
        if r.status_code == 200:
            items = r.json()
            for it in items:
                if it.get('plainLyrics'):
                    return {
                        "title": it.get('trackName') or search_q.title(),
                        "artist": it.get('artistName') or "",
                        "plain_lyrics": it['plainLyrics']
                    }
    except Exception:
        pass

    return None

def import_song_from_web(url_or_query: str) -> Dict[str, Any]:
    raw_input = url_or_query.strip()
    artist_hint, track_hint = "", ""

    if raw_input.startswith("http://") or raw_input.startswith("https://"):
        artist_hint, track_hint = extract_metadata_from_url(raw_input)
        search_query = f"{track_hint} {artist_hint}".strip() or raw_input
    else:
        search_query = raw_input

    # Step 1: Query LRCLIB
    result = search_lrclib(search_query, artist=artist_hint, track=track_hint)
    if result and result.get("plain_lyrics"):
        slides = split_text_into_slides(result["plain_lyrics"])
        return {
            "title": result["title"],
            "artist": result["artist"],
            "tags": "importado, louvor",
            "slides": slides,
            "raw_lyrics": result["plain_lyrics"]
        }

    # Step 2: Fallback direct scrape if URL was provided
    if raw_input.startswith("http://") or raw_input.startswith("https://"):
        try:
            r = requests.get(raw_input, headers=HEADERS, timeout=8)
            if r.status_code == 200:
                soup = BeautifulSoup(r.text, 'html.parser')
                h1 = soup.find('h1')
                title = h1.get_text(strip=True) if h1 else (track_hint.title() or "Louvor")

                artist_tag = soup.select_one('.cnt-head_title h2, h2, a[href*="artista"]')
                artist = artist_tag.get_text(strip=True) if artist_tag else (artist_hint.title() or "")

                lyric_el = soup.select_one('.lyric-original, article, #lyrics, pre')
                if lyric_el:
                    raw_text = lyric_el.get_text('\n\n', strip=True)
                    slides = split_text_into_slides(raw_text)
                    return {
                        "title": title,
                        "artist": artist,
                        "tags": "importado",
                        "slides": slides,
                        "raw_lyrics": raw_text
                    }
        except Exception as e:
            print(f"[Scraper Fallback Error] {e}")

    raise ValueError(f"Não foi possível encontrar a letra para '{raw_input}'. Tente digitar o nome da música e do cantor, ou cole a letra manualmente no botão 'Novo Louvor'.")
