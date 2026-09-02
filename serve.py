#!/usr/bin/env python3
"""Prosty serwer statyczny BEZ cache — do pracy lokalnej (Termux/PC).

Zwykły `python -m http.server` każe przeglądarce cache'ować pliki JS,
przez co po `git pull` nie widać zmian. Ten serwer wysyła nagłówki
'no-store', więc przeglądarka zawsze pobiera świeżą wersję.

Użycie:  python serve.py         (domyślnie port 8000)
         python serve.py 8080    (inny port)
"""
import sys
import http.server
import socketserver

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8000


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def log_message(self, fmt, *args):
        # krótszy log
        sys.stderr.write("%s - %s\n" % (self.address_string(), fmt % args))


class Server(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True


with Server(("", PORT), NoCacheHandler) as httpd:
    print(f"✅ Serwer BEZ cache działa:  http://localhost:{PORT}")
    print("   (Ctrl+C aby zatrzymać)")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nZatrzymano.")
