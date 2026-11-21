import requests
import json
import os

SUPABASE_URL = "https://jeswsnonrnmvbqjeavmb.supabase.co"
SUPABASE_KEY = "sb_publishable_BcWhY2TiN0ByycCPZLHZCA_4FS75ay3"

headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json"
}

def check():
    print(f"Checking Supabase at {SUPABASE_URL}...")
    ready = True
    for table in ["songs", "settings", "setlists"]:
        resp = requests.get(f"{SUPABASE_URL}/rest/v1/{table}?select=*&limit=1", headers=headers, timeout=5)
        if resp.status_code == 200:
            print(f"  [OK] Tabela '{table}' conectada com sucesso!")
        else:
            print(f"  [PENDENTE] Tabela '{table}' ainda não foi criada no SQL Editor (Status: {resp.status_code})")
            ready = False
    if ready:
        print("\n--> SUCESSO: Todas as tabelas do Supabase estao ativas e sincronizando!")
    else:
        print("\n--> AVISO: Cole e execute o arquivo 'supabase_schema.sql' no SQL Editor do Supabase.")

if __name__ == "__main__":
    check()
