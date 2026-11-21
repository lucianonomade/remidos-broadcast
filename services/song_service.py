import sqlite3
import json
import os
import requests
from datetime import datetime

APP_DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'app.db')

# --- LOAD .ENV IF PRESENT ---
env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env')
if os.path.exists(env_path):
    with open(env_path, encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                k, v = line.split('=', 1)
                k = k.strip()
                v = v.strip().strip('"').strip("'")
                if k not in os.environ:
                    os.environ[k] = v

# --- SUPABASE CONFIGURATION (FROM ENVIRONMENT OR .ENV) ---
SUPABASE_URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "") or os.environ.get("SUPABASE_ANON_KEY", "")

def is_supabase_configured():
    return bool(SUPABASE_URL and SUPABASE_KEY)

def get_supabase_headers():
    return {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation"
    }

DEFAULT_SONGS = [
    {
        "title": "A Bênção",
        "artist": "Gabriel Guedes / Nívea Soares",
        "tags": "bênção, adoração, família",
        "slides": [
            {"type": "Verso", "text": "O Senhor te abençoe e te guarde\nO Senhor faça resplandecer\nO Seu rosto sobre ti"},
            {"type": "Verso", "text": "E tenha misericórdia de ti\nO Senhor sobre ti levante o Seu rosto\nE te dê a paz"},
            {"type": "Refrão", "text": "Amém, amém, amém\nAmém, amém, amém"},
            {"type": "Ponte", "text": "Que a Sua graça vá até mil gerações\nSua família e seus filhos\nE os filhos dos seus filhos"},
            {"type": "Ponte", "text": "Sua presença vá contigo\nÀ sua frente, ao teu lado\nE ao redor de ti, e em ti"},
            {"type": "Ponte", "text": "Ele é contigo, Ele é por ti\nDe manhã, ao deitar\nNa entrada e no sair"},
            {"type": "Refrão", "text": "Amém, amém, amém\nAmém, amém, amém"}
        ]
    },
    {
        "title": "Bondade de Deus",
        "artist": "Isaías Saad",
        "tags": "adoração, gratidão",
        "slides": [
            {"type": "Verso 1", "text": "Te amo, Deus, Tua graça nunca falha\nTodos os dias eu estou em Tuas mãos"},
            {"type": "Verso 1", "text": "Desde quando me levanto até eu me deitar\nEu cantarei da bondade de Deus"},
            {"type": "Refrão", "text": "És fiel em todo tempo\nEm todo tempo Tu és tão, tão bom"},
            {"type": "Refrão", "text": "Com todo fôlego que tenho\nEu cantarei da bondade de Deus"},
            {"type": "Verso 2", "text": "Tua voz me guia em meio aos temporais\nNa escuridão me mostras quem Tu és"},
            {"type": "Verso 2", "text": "Eu Te conheço como Pai e como amigo\nE eu tenho vivido na bondade de Deus"},
            {"type": "Refrão", "text": "És fiel em todo tempo\nEm todo tempo Tu és tão, tão bom"},
            {"type": "Refrão", "text": "Com todo fôlego que tenho\nEu cantarei da bondade de Deus"},
            {"type": "Ponte", "text": "Tua bondade me seguirá, me seguirá, Senhor\nTua bondade me seguirá, me seguirá, Senhor"},
            {"type": "Ponte", "text": "Eu me rendo a Ti, Te dou o meu ser\nEntrego tudo a Ti"},
            {"type": "Refrão Final", "text": "És fiel em todo tempo\nEm todo tempo Tu és tão, tão bom\nCom todo fôlego que tenho\nEu cantarei da bondade de Deus"}
        ]
    },
    {
        "title": "Porque Ele Vive",
        "artist": "Harpa Cristã",
        "tags": "clássico, páscoa, fé",
        "slides": [
            {"type": "Verso 1", "text": "Deus enviou Seu Filho amado\nPara morrer no meu lugar"},
            {"type": "Verso 1", "text": "Na cruz morreu por meus pecados\nMas ressurgiu e vivo com o Pai está"},
            {"type": "Refrão", "text": "Porque Ele vive, eu posso crer no amanhã\nPorque Ele vive, temor não há"},
            {"type": "Refrão", "text": "Mas eu bem sei, eu sei, que a minha vida\nEstá nas mãos de meu Jesus, que vivo está"}
        ]
    },
    {
        "title": "Ruja o Leão",
        "artist": "Talita Catanzaro",
        "tags": "celebração, batalha, glória",
        "slides": [
            {"type": "Verso 1", "text": "Sobre o trono de justiça\nEternamente reinará"},
            {"type": "Verso 1", "text": "O Cordeiro que venceu\nPara sempre viverá"},
            {"type": "Refrão", "text": "Ruja o Leão, e a terra estremecerá\nRuja o Leão, e o Seu povo louvará"},
            {"type": "Refrão", "text": "Que se abram os céus\nVenha o Teu Reino aqui!"}
        ]
    }
]

def init_app_db():
    conn = sqlite3.connect(APP_DB_PATH)
    c = conn.cursor()
    
    c.execute('''CREATE TABLE IF NOT EXISTS songs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        artist TEXT,
        tags TEXT,
        slides_json TEXT NOT NULL,
        created_at TEXT,
        updated_at TEXT
    )''')
    
    c.execute('''CREATE TABLE IF NOT EXISTS setlists (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        items_json TEXT NOT NULL,
        created_at TEXT
    )''')
    
    c.execute('''CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
    )''')
    
    c.execute("SELECT COUNT(*) FROM songs")
    if c.fetchone()[0] == 0:
        now = datetime.now().isoformat()
        for s in DEFAULT_SONGS:
            c.execute("""
                INSERT INTO songs (title, artist, tags, slides_json, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (s["title"], s["artist"], s["tags"], json.dumps(s["slides"], ensure_ascii=False), now, now))
            
    default_settings = {
        "church_name": "Remidos em Cristo",
        "church_subtitle": "Nova Aliança",
        "theme": "gold_dark",
        "font_family": "'Outfit', sans-serif",
        "font_size": "50px",
        "text_weight": "700",
        "text_position": "center",
        "text_align": "center",
        "bg_dim": "18",
        "text_shadow": "cinematic",
        "nvidia_api_key": "",
        "nvidia_model": "nvidia/llama-3.1-nemotron-70b-instruct",
        "obs_chroma_color": "#00ff00"
    }
    for k, v in default_settings.items():
        c.execute("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)", (k, str(v)))
        
    conn.commit()
    conn.close()

def get_app_db():
    conn = sqlite3.connect(APP_DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

# =========================================================================
# SONGS (HYBRID: SUPABASE CLOUD FIRST -> SQLITE FALLBACK)
# =========================================================================
def list_songs(search: str = ""):
    if is_supabase_configured():
        try:
            url = f"{SUPABASE_URL}/rest/v1/songs?select=id,title,artist,tags,created_at,updated_at&order=title.asc"
            if search:
                url += f"&or=(title.ilike.*{search}*,artist.ilike.*{search}*,tags.ilike.*{search}*)"
            resp = requests.get(url, headers=get_supabase_headers(), timeout=5)
            if resp.status_code == 200:
                return resp.json()
        except Exception as e:
            print(f"[Supabase] list_songs fallback: {e}")

    conn = get_app_db()
    c = conn.cursor()
    if search:
        c.execute("""
            SELECT id, title, artist, tags, created_at, updated_at
            FROM songs
            WHERE title LIKE ? OR artist LIKE ? OR tags LIKE ?
            ORDER BY title ASC
        """, (f"%{search}%", f"%{search}%", f"%{search}%"))
    else:
        c.execute("SELECT id, title, artist, tags, created_at, updated_at FROM songs ORDER BY title ASC")
    rows = [dict(row) for row in c.fetchall()]
    conn.close()
    return rows

def get_song(song_id: int):
    if is_supabase_configured():
        try:
            url = f"{SUPABASE_URL}/rest/v1/songs?id=eq.{song_id}&select=*"
            resp = requests.get(url, headers=get_supabase_headers(), timeout=5)
            if resp.status_code == 200:
                rows = resp.json()
                if rows:
                    r = rows[0]
                    r["slides"] = json.loads(r["slides_json"]) if isinstance(r["slides_json"], str) else r["slides_json"]
                    return r
        except Exception as e:
            print(f"[Supabase] get_song fallback: {e}")

    conn = get_app_db()
    c = conn.cursor()
    c.execute("SELECT * FROM songs WHERE id = ?", (song_id,))
    row = c.fetchone()
    conn.close()
    if not row:
        return None
    d = dict(row)
    d["slides"] = json.loads(d["slides_json"])
    return d

def save_song(title: str, artist: str, tags: str, slides: list, song_id: int = None):
    now = datetime.now().isoformat()
    slides_json = json.dumps(slides, ensure_ascii=False)

    if is_supabase_configured():
        try:
            payload = {
                "title": title,
                "artist": artist,
                "tags": tags,
                "slides_json": slides_json,
                "updated_at": now
            }
            if song_id:
                url = f"{SUPABASE_URL}/rest/v1/songs?id=eq.{song_id}"
                resp = requests.patch(url, headers=get_supabase_headers(), json=payload, timeout=5)
                if resp.status_code in (200, 204):
                    return get_song(song_id)
            else:
                payload["created_at"] = now
                url = f"{SUPABASE_URL}/rest/v1/songs"
                resp = requests.post(url, headers=get_supabase_headers(), json=payload, timeout=5)
                if resp.status_code in (200, 201):
                    rows = resp.json()
                    if rows:
                        r = rows[0]
                        r["slides"] = json.loads(r["slides_json"]) if isinstance(r["slides_json"], str) else r["slides_json"]
                        return r
        except Exception as e:
            print(f"[Supabase] save_song fallback: {e}")

    # Local SQLite fallback
    conn = get_app_db()
    c = conn.cursor()
    if song_id:
        c.execute("""
            UPDATE songs SET title = ?, artist = ?, tags = ?, slides_json = ?, updated_at = ?
            WHERE id = ?
        """, (title, artist, tags, slides_json, now, song_id))
        target_id = song_id
    else:
        c.execute("""
            INSERT INTO songs (title, artist, tags, slides_json, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (title, artist, tags, slides_json, now, now))
        target_id = c.lastrowid
        
    conn.commit()
    conn.close()
    return get_song(target_id)

def delete_song(song_id: int):
    if is_supabase_configured():
        try:
            url = f"{SUPABASE_URL}/rest/v1/songs?id=eq.{song_id}"
            resp = requests.delete(url, headers=get_supabase_headers(), timeout=5)
            if resp.status_code in (200, 204):
                return True
        except Exception as e:
            print(f"[Supabase] delete_song fallback: {e}")

    conn = get_app_db()
    c = conn.cursor()
    c.execute("DELETE FROM songs WHERE id = ?", (song_id,))
    conn.commit()
    conn.close()
    return True

DEFAULT_SETTINGS = {
    "church_name": "Remidos em Cristo",
    "church_subtitle": "Nova Aliança",
    "theme": "gold_dark",
    "font_family": "'Outfit', sans-serif",
    "font_size": "50px",
    "text_weight": "700",
    "text_position": "center",
    "text_align": "center",
    "bg_dim": "18",
    "text_shadow": "cinematic",
    "nvidia_api_key": "",
    "nvidia_model": "nvidia/llama-3.1-nemotron-70b-instruct",
    "obs_chroma_color": "#00ff00"
}

# =========================================================================
# SETTINGS (HYBRID)
# =========================================================================
def get_settings():
    settings = DEFAULT_SETTINGS.copy()
    if is_supabase_configured():
        try:
            url = f"{SUPABASE_URL}/rest/v1/settings?select=key,value"
            resp = requests.get(url, headers=get_supabase_headers(), timeout=5)
            if resp.status_code == 200:
                supa_data = {r["key"]: r["value"] for r in resp.json()}
                if supa_data:
                    settings.update(supa_data)
                    return settings
                else:
                    # Seed Supabase with defaults if empty
                    headers = get_supabase_headers()
                    headers["Prefer"] = "resolution=merge-duplicates"
                    for k, v in DEFAULT_SETTINGS.items():
                        requests.post(f"{SUPABASE_URL}/rest/v1/settings", headers=headers, json={"key": k, "value": str(v)}, timeout=3)
                    return settings
        except Exception as e:
            print(f"[Supabase] get_settings fallback: {e}")

    try:
        conn = get_app_db()
        c = conn.cursor()
        c.execute("SELECT key, value FROM settings")
        local_data = {row["key"]: row["value"] for row in c.fetchall()}
        conn.close()
        settings.update(local_data)
    except Exception as e:
        print(f"[Local DB] get_settings error: {e}")

    return settings

def update_settings(new_settings: dict):
    if is_supabase_configured():
        try:
            headers = get_supabase_headers()
            headers["Prefer"] = "resolution=merge-duplicates,return=representation"
            for k, v in new_settings.items():
                requests.post(f"{SUPABASE_URL}/rest/v1/settings", headers=headers, json={"key": k, "value": str(v)}, timeout=4)
            return get_settings()
        except Exception as e:
            print(f"[Supabase] update_settings fallback: {e}")

    conn = get_app_db()
    c = conn.cursor()
    for k, v in new_settings.items():
        c.execute("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", (k, str(v)))
    conn.commit()
    conn.close()
    return get_settings()

# =========================================================================
# SETLISTS (HYBRID)
# =========================================================================
def get_setlists():
    if is_supabase_configured():
        try:
            url = f"{SUPABASE_URL}/rest/v1/setlists?select=*&order=id.desc"
            resp = requests.get(url, headers=get_supabase_headers(), timeout=5)
            if resp.status_code == 200:
                rows = []
                for r in resp.json():
                    r["items"] = json.loads(r["items_json"]) if isinstance(r["items_json"], str) else r["items_json"]
                    rows.append(r)
                return rows
        except Exception as e:
            print(f"[Supabase] get_setlists fallback: {e}")

    conn = get_app_db()
    c = conn.cursor()
    c.execute("SELECT * FROM setlists ORDER BY id DESC")
    rows = []
    for r in c.fetchall():
        d = dict(r)
        d["items"] = json.loads(d["items_json"])
        rows.append(d)
    conn.close()
    return rows

def save_setlist(name: str, items: list, setlist_id: int = None):
    now = datetime.now().isoformat()
    items_json = json.dumps(items, ensure_ascii=False)

    if is_supabase_configured():
        try:
            if setlist_id:
                url = f"{SUPABASE_URL}/rest/v1/setlists?id=eq.{setlist_id}"
                requests.patch(url, headers=get_supabase_headers(), json={"name": name, "items_json": items_json}, timeout=5)
                return setlist_id
            else:
                url = f"{SUPABASE_URL}/rest/v1/setlists"
                resp = requests.post(url, headers=get_supabase_headers(), json={"name": name, "items_json": items_json, "created_at": now}, timeout=5)
                if resp.status_code in (200, 201):
                    rows = resp.json()
                    if rows:
                        return rows[0]["id"]
        except Exception as e:
            print(f"[Supabase] save_setlist fallback: {e}")

    conn = get_app_db()
    c = conn.cursor()
    if setlist_id:
        c.execute("UPDATE setlists SET name = ?, items_json = ? WHERE id = ?", (name, items_json, setlist_id))
        target_id = setlist_id
    else:
        c.execute("INSERT INTO setlists (name, items_json, created_at) VALUES (?, ?, ?)", (name, items_json, now))
        target_id = c.lastrowid
    conn.commit()
    conn.close()
    return target_id
