#!/usr/bin/env python3
"""
⚡ Partajare Energie - Single Command Launcher
Starts the FastAPI backend, initializes the SQLite database, and serves the React Web Interface.
"""

import sys
import os
import time
import webbrowser
from pathlib import Path

# Safe encoding for Windows consoles
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Add project root to sys.path
BASE_DIR = Path(__file__).resolve().parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))


def check_and_seed_db():
    """Ensure database tables exist and realistic demo data is seeded."""
    try:
        from app.database import engine, Base, SessionLocal
        from app.seed_data import seed_initial_data

        print("[*] Verificare schemă bază de date SQLite...")
        Base.metadata.create_all(bind=engine)

        with SessionLocal() as db:
            seed_initial_data(db, force=False)
        print("[+] Baza de date este pregătită (tabele create, date demo verificate).")
    except Exception as e:
        print(f"[!] Atenție la inițializarea bazei de date: {e}")


def main():
    print("=" * 65)
    print(" PARTAJARE ENERGIE — Platforma P2P Energie Regenerabila")
    print("=" * 65)
    print("[*] Director proiect:", BASE_DIR)
    
    # 1. Initialize SQLite Database
    check_and_seed_db()

    # 2. Server configuration
    host = "127.0.0.1"
    port = 8000
    url = f"http://{host}:{port}"

    print(f"\n[+] Pornire server web FastAPI la: {url}")
    print(f"[+] Documentatie Swagger API la:  {url}/docs")
    print(f"[+] Pentru a opri serverul: apasa CTRL+C in terminal\n")

    # Optional: open browser after 1.5 seconds
    def open_browser():
        time.sleep(1.2)
        try:
            webbrowser.open(url)
        except Exception:
            pass

    import threading
    threading.Thread(target=open_browser, daemon=True).start()

    # 3. Launch Uvicorn
    import uvicorn
    uvicorn.run("app.main:app", host=host, port=port, reload=True)


if __name__ == "__main__":
    main()
