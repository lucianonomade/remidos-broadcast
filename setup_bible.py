import urllib.request
import json
import sqlite3
import os

def setup_bible():
    os.makedirs('data', exist_ok=True)
    db_path = os.path.join('data', 'bible.db')
    
    conn = sqlite3.connect(db_path)
    c = conn.cursor()

    c.execute('''CREATE TABLE IF NOT EXISTS books (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        abbrev TEXT NOT NULL,
        testament TEXT,
        chapter_count INTEGER
    )''')

    c.execute('''CREATE TABLE IF NOT EXISTS verses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        version TEXT DEFAULT 'NVI',
        book_id INTEGER,
        chapter INTEGER,
        verse INTEGER,
        text TEXT,
        FOREIGN KEY(book_id) REFERENCES books(id)
    )''')

    c.execute('CREATE INDEX IF NOT EXISTS idx_verses_lookup ON verses(version, book_id, chapter, verse)')
    
    # Check if already populated
    c.execute('SELECT COUNT(*) FROM verses WHERE version = "NVI"')
    existing_count = c.fetchone()[0]
    if existing_count > 30000:
        print(f"Bíblia NVI já instalada com {existing_count} versículos.")
        conn.close()
        return

    print("Baixando Bíblia Sagrada NVI em Português...")
    url = "https://raw.githubusercontent.com/thiagobodruk/bible/master/json/pt_nvi.json"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    raw_data = urllib.request.urlopen(req, timeout=30).read().decode('utf-8')
    bible_json = json.loads(raw_data)

    print(f"Inserindo {len(bible_json)} livros...")
    total_verses = 0
    records = []
    
    for b_idx, book in enumerate(bible_json, start=1):
        b_name = book.get('name', '')
        b_abbrev = book.get('abbrev', '')
        chapters = book.get('chapters', [])
        testament = 'VT' if b_idx <= 39 else 'NT'
        
        c.execute('INSERT OR REPLACE INTO books (id, name, abbrev, testament, chapter_count) VALUES (?, ?, ?, ?, ?)',
                  (b_idx, b_name, b_abbrev, testament, len(chapters)))
        
        for c_idx, chap in enumerate(chapters, start=1):
            for v_idx, v_text in enumerate(chap, start=1):
                records.append(('NVI', b_idx, c_idx, v_idx, v_text.strip()))
                total_verses += 1

    c.executemany('INSERT INTO verses (version, book_id, chapter, verse, text) VALUES (?, ?, ?, ?, ?)', records)
    
    # Also create FTS table for keyword search
    c.execute('CREATE VIRTUAL TABLE IF NOT EXISTS verses_fts USING fts5(text, content=verses, content_rowid=id)')
    c.execute('INSERT INTO verses_fts(verses_fts) VALUES("rebuild")')

    conn.commit()
    conn.close()
    print(f"Bíblia instalada com sucesso! {len(bible_json)} livros e {total_verses} versículos salvos em {db_path}.")

if __name__ == '__main__':
    setup_bible()
