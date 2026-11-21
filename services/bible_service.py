import sqlite3
import re
import os

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'bible.db')

BOOK_ALIASES = {
    "gn": 1, "gen": 1, "genesis": 1, "gênesis": 1,
    "ex": 2, "êx": 2, "exodo": 2, "êxodo": 2,
    "lv": 3, "lev": 3, "levitico": 3, "levítico": 3,
    "nm": 4, "num": 4, "numeros": 4, "números": 4,
    "dt": 5, "deut": 5, "deuteronomio": 5, "deuteronômio": 5,
    "js": 6, "jos": 6, "josue": 6, "josué": 6,
    "jz": 7, "juiz": 7, "juizes": 7, "juízes": 7,
    "rt": 8, "rut": 8, "rute": 8,
    "1sm": 9, "1 sm": 9, "1samuel": 9, "1 samuel": 9,
    "2sm": 10, "2 sm": 10, "2samuel": 10, "2 samuel": 10,
    "1rs": 11, "1 rs": 11, "1reis": 11, "1 reis": 11,
    "2rs": 12, "2 rs": 12, "2reis": 12, "2 reis": 12,
    "1cr": 13, "1 cr": 13, "1cronicas": 13, "1 crônicas": 13,
    "2cr": 14, "2 cr": 14, "2cronicas": 14, "2 crônicas": 14,
    "ed": 15, "esd": 15, "esdras": 15,
    "ne": 16, "nee": 16, "neemias": 16,
    "et": 17, "est": 17, "ester": 17,
    "jo": 18, "jó": 18,
    "sl": 19, "sal": 19, "salmo": 19, "salmos": 19,
    "pv": 20, "prov": 20, "proverbios": 20, "provérbios": 20,
    "ec": 21, "ecl": 21, "eclesiastes": 21,
    "ct": 22, "cant": 22, "cantares": 22,
    "is": 23, "isa": 23, "isaias": 23, "isaías": 23,
    "jr": 24, "jer": 24, "jeremias": 24,
    "lm": 25, "lam": 25, "lamentacoes": 25, "lamentações": 25,
    "ez": 26, "ezeq": 26, "ezequiel": 26,
    "dn": 27, "dan": 27, "daniel": 27,
    "os": 28, "ose": 28, "oseias": 28, "oséias": 28,
    "jl": 29, "joe": 29, "joel": 29,
    "am": 30, "amos": 30, "amós": 30,
    "ob": 31, "oba": 31, "obadias": 31,
    "jn": 32, "jon": 32, "jonas": 32,
    "mq": 33, "miq": 33, "miqueias": 33, "miquéias": 33,
    "na": 34, "nau": 34, "naum": 34,
    "hc": 35, "hab": 35, "habacuque": 35,
    "sf": 36, "sof": 36, "sofonias": 36,
    "ag": 37, "age": 37, "ageu": 37,
    "zc": 38, "zac": 38, "zacarias": 38,
    "ml": 39, "mal": 39, "malaquias": 39,
    "mt": 40, "mat": 40, "mateus": 40,
    "mc": 41, "mar": 41, "marcos": 41,
    "lc": 42, "luc": 42, "lucas": 42,
    "joo": 43, "joao": 43, "joão": 43,
    "at": 44, "atos": 44,
    "rm": 45, "rom": 45, "romanos": 45,
    "1co": 46, "1 co": 46, "1corintios": 46, "1 coríntios": 46,
    "2co": 47, "2 co": 47, "2corintios": 47, "2 coríntios": 47,
    "gl": 48, "gal": 48, "galatas": 48, "gálatas": 48,
    "ef": 49, "efe": 49, "efesios": 49, "efésios": 49,
    "fp": 50, "fil": 50, "filipenses": 50,
    "cl": 51, "col": 51, "colossenses": 51,
    "1ts": 52, "1 ts": 52, "1tessalonicenses": 52, "1 tessalonicenses": 52,
    "2ts": 53, "2 ts": 53, "2tessalonicenses": 53, "2 tessalonicenses": 53,
    "1tm": 54, "1 tm": 54, "1timoteo": 54, "1 timóteo": 54,
    "2tm": 55, "2 tm": 55, "2timoteo": 55, "2 timóteo": 55,
    "tt": 56, "tit": 56, "tito": 56,
    "fm": 57, "flm": 57, "filemom": 57,
    "hb": 58, "heb": 58, "hebreus": 58,
    "tg": 59, "tia": 59, "tiago": 59,
    "1pe": 60, "1 pe": 60, "1pedro": 60, "1 pedro": 60,
    "2pe": 61, "2 pe": 61, "2pedro": 61, "2 pedro": 61,
    "1jo": 62, "1 jo": 62, "1joao": 62, "1 joão": 62,
    "2jo": 63, "2 jo": 63, "2joao": 63, "2 joão": 63,
    "3jo": 64, "3 jo": 64, "3joao": 64, "3 joão": 64,
    "jd": 65, "jud": 65, "judas": 65,
    "ap": 66, "apo": 66, "apocalipse": 66
}

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def list_books():
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT id, name, abbrev, testament, chapter_count FROM books ORDER BY id ASC")
    rows = [dict(row) for row in c.fetchall()]
    conn.close()
    return rows

def get_chapter(book_id: int, chapter: int, version: str = "NVI"):
    conn = get_db()
    c = conn.cursor()
    
    # Get book name
    c.execute("SELECT name, abbrev FROM books WHERE id = ?", (book_id,))
    book_row = c.fetchone()
    if not book_row:
        conn.close()
        return None
        
    c.execute("""
        SELECT verse, text 
        FROM verses 
        WHERE book_id = ? AND chapter = ? AND version = ?
        ORDER BY verse ASC
    """, (book_id, chapter, version))
    verses = [dict(row) for row in c.fetchall()]
    conn.close()
    
    return {
        "book_id": book_id,
        "book_name": book_row["name"],
        "book_abbrev": book_row["abbrev"],
        "chapter": chapter,
        "version": version,
        "verses": verses
    }

def get_verse(book_id: int, chapter: int, verse: int, version: str = "NVI"):
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT name, abbrev FROM books WHERE id = ?", (book_id,))
    book_row = c.fetchone()
    if not book_row:
        conn.close()
        return None
        
    c.execute("""
        SELECT verse, text 
        FROM verses 
        WHERE book_id = ? AND chapter = ? AND verse = ? AND version = ?
    """, (book_id, chapter, verse, version))
    v_row = c.fetchone()
    conn.close()
    
    if not v_row:
        return None
        
    return {
        "book_id": book_id,
        "book_name": book_row["name"],
        "chapter": chapter,
        "verse": verse,
        "version": version,
        "text": v_row["text"]
    }

def parse_reference(query: str):
    """
    Parses strings like:
    - Jo 3:16
    - João 3:16-18
    - 1 Co 13:4
    - Salmos 23
    - Gn 1
    """
    q = query.strip()
    # Normalize spaces and lowercase
    # Match patterns like: (optional 1/2/3)? (letters) (chapter):?(verse)?(-verse_end)?
    pattern = r'^(\d\s*)?([a-zA-ZÀ-ÿ]+)\s*(\d+)(?:[:,\.](\d+)(?:-(\d+))?)?'
    m = re.match(pattern, q)
    if not m:
        return None
    
    num_prefix, book_part, chapter, start_v, end_v = m.groups()
    book_key = (num_prefix.strip() if num_prefix else "") + book_part.strip().lower()
    # Remove accents for alias matching
    book_clean = book_key.replace("ã", "a").replace("á", "a").replace("â", "a") \
                         .replace("é", "e").replace("ê", "e").replace("í", "i") \
                         .replace("ó", "o").replace("ô", "o").replace("ú", "u")
    
    # Special fix: "jo" vs "jó" vs "joao"
    if book_key in ["jó", "jo"] and ("jo" in query.lower() and not "jó" in query.lower() and int(chapter) > 3):
        # Jó has 42 chapters, but if someone typed 'jo 3:16' it's João!
        if int(chapter) <= 42 and start_v:
            pass # could be Jó
    if book_clean in ["jo", "joo", "joao"]:
        book_id = 43 # João (most common in church)
    else:
        book_id = BOOK_ALIASES.get(book_clean) or BOOK_ALIASES.get(book_key)
        
    if not book_id:
        return None
        
    chap_num = int(chapter)
    v_start = int(start_v) if start_v else 1
    v_end = int(end_v) if end_v else (int(start_v) if start_v else None)
    
    return {
        "book_id": book_id,
        "chapter": chap_num,
        "verse_start": v_start,
        "verse_end": v_end
    }

def search_bible(query: str, version: str = "NVI", limit: int = 30):
    ref = parse_reference(query)
    conn = get_db()
    c = conn.cursor()
    
    if ref:
        book_id = ref["book_id"]
        chapter = ref["chapter"]
        v_start = ref["verse_start"]
        v_end = ref["verse_end"]
        
        c.execute("SELECT name FROM books WHERE id = ?", (book_id,))
        b_name = c.fetchone()["name"]
        
        if v_end:
            c.execute("""
                SELECT v.id, v.chapter, v.verse, v.text, b.name as book_name, b.id as book_id
                FROM verses v
                JOIN books b ON b.id = v.book_id
                WHERE v.book_id = ? AND v.chapter = ? AND v.verse >= ? AND v.verse <= ? AND v.version = ?
                ORDER BY v.verse ASC
            """, (book_id, chapter, v_start, v_end, version))
        else:
            c.execute("""
                SELECT v.id, v.chapter, v.verse, v.text, b.name as book_name, b.id as book_id
                FROM verses v
                JOIN books b ON b.id = v.book_id
                WHERE v.book_id = ? AND v.chapter = ? AND v.version = ?
                ORDER BY v.verse ASC
            """, (book_id, chapter, version))
        rows = [dict(row) for row in c.fetchall()]
        conn.close()
        return {
            "type": "reference",
            "reference_text": f"{b_name} {chapter}" + (f":{v_start}" if v_start == v_end else f":{v_start}-{v_end}" if v_end else ""),
            "results": rows
        }
    
    # Otherwise full text keyword search
    clean_q = query.strip().replace('"', '""')
    # Try FTS search
    try:
        c.execute("""
            SELECT v.id, v.chapter, v.verse, v.text, b.name as book_name, b.id as book_id
            FROM verses_fts f
            JOIN verses v ON v.id = f.rowid
            JOIN books b ON b.id = v.book_id
            WHERE verses_fts MATCH ? AND v.version = ?
            LIMIT ?
        """, (f'"{clean_q}"', version, limit))
        rows = [dict(row) for row in c.fetchall()]
    except Exception:
        # Fallback to LIKE
        c.execute("""
            SELECT v.id, v.chapter, v.verse, v.text, b.name as book_name, b.id as book_id
            FROM verses v
            JOIN books b ON b.id = v.book_id
            WHERE v.text LIKE ? AND v.version = ?
            LIMIT ?
        """, (f'%{clean_q}%', version, limit))
        rows = [dict(row) for row in c.fetchall()]
        
    conn.close()
    return {
        "type": "text_search",
        "query": query,
        "results": rows
    }
