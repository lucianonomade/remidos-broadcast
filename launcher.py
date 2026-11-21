import sys
import os
import time
import threading
import webbrowser
import uvicorn

PORT = 8765
HOST = "127.0.0.1"

def print_banner():
    banner = f"""
========================================================================
    🕊️  REMIDOS EM CRISTO — NOVA ALIANÇA
    Sistema Profissional de Projeção, Bíblia, Louvor & Transmissão
========================================================================
  [+] Servidor local iniciado em: http://{HOST}:{PORT}
  [+] Painel do Operador:         http://{HOST}:{PORT}/admin
  [+] Telão / Projetor:           http://{HOST}:{PORT}/projector
  [+] Retorno de Palco:           http://{HOST}:{PORT}/stage
  [+] Link Croma / OBS Studio:    http://{HOST}:{PORT}/obs
  [+] Inteligência Artificial:    NVIDIA NeMoTron (build.nvidia.com)
  [+] Bíblia Offline:             31.000+ Versículos (NVI) instalados
------------------------------------------------------------------------
  Dica: Pressione Ctrl+C nesta janela para encerrar o sistema.
========================================================================
"""
    print(banner)

def open_browser():
    time.sleep(1.2)
    url = f"http://{HOST}:{PORT}"
    print(f"[*] Abrindo o Painel de Controle no seu navegador: {url}")
    webbrowser.open(url)

def main():
    print_banner()
    
    # Launch browser automatically
    if "--no-browser" not in sys.argv:
        t = threading.Thread(target=open_browser, daemon=True)
        t.start()

    # Start FastAPI server
    try:
        from app import app
        uvicorn.run(app, host=HOST, port=PORT, log_level="warning")
    except KeyboardInterrupt:
        print("\n[!] Sistema encerrado com sucesso. A paz do Senhor!")
    except Exception as e:
        print(f"\n[X] Erro ao executar o servidor: {e}")

if __name__ == '__main__':
    main()
