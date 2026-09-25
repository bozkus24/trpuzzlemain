#!/usr/bin/env python3
"""Yerel anasayfa + Netlify oyun proxy'leri: python3 tools/preview.py."""
import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import re
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parent.parent
# Yayınla aynı oyun adreslerini kullan; ikinci bir yönlendirme listesi tutma.
ROUTES = dict(re.findall(
    r'from\s*=\s*"/([^/]+)/\*"\s+to\s*=\s*"(https://[^/]+)/:splat"',
    (ROOT / 'netlify.toml').read_text(),
))


class PreviewHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        self.serve(False)

    def do_HEAD(self):
        self.serve(True)

    def serve(self, head):
        parsed = urlsplit(self.path)
        parts = parsed.path.split('/', 2)
        game = parts[1] if len(parts) > 1 else ''
        if game not in ROUTES:
            return super().do_HEAD() if head else super().do_GET()
        if len(parts) < 3:
            self.send_response(302)
            self.send_header('Location', '/' + game + '/' + ('?' + parsed.query if parsed.query else ''))
            self.end_headers()
            return
        target = ROUTES[game] + '/' + parts[2]
        if parsed.query:
            target += '?' + parsed.query
        try:
            # Tarayıcı çerezlerini/kimlik bilgilerini uzak siteye iletme.
            request = Request(target, headers={'User-Agent': 'TrPuzzle-Local-Preview', 'Accept-Encoding': 'identity'})
            with urlopen(request, timeout=25) as response:
                body = response.read()
                content_type = response.headers.get('Content-Type', 'application/octet-stream')
                if 'text/html' in content_type:
                    # Henüz yayımlanmamış ara sayfa güncellemesini de önizle.
                    if b'TRPUZZLE-PROGRESS-START' not in body:
                        script = (ROOT / 'assets/splash-progress.js').read_bytes()
                        body = body.replace(b'</body>', b'<script>\n' + script + b'</script>\n</body>', 1)
                    # Oyunların ana sayfa/footer linkleri de yerel önizlemeye dönsün.
                    body = body.replace(b'href="https://trpuzzle.com/', b'href="/')
                    body = body.replace(b"href='https://trpuzzle.com/", b"href='/")
                self.send_response(response.status)
                self.send_header('Content-Type', content_type)
                self.send_header('Content-Length', str(len(body)))
                self.send_header('Cache-Control', 'no-store')
                self.end_headers()
                if not head:
                    self.wfile.write(body)
        except HTTPError as error:
            self.send_error(error.code, 'Oyun dosyasi yuklenemedi')
        except (URLError, TimeoutError):
            self.send_error(502, 'Oyun sitesine ulasilamadi; internet baglantisini kontrol edin')

    def end_headers(self):
        # Yerel düzenlemeler yenilemede hemen görünsün.
        if not any(self.path.startswith('/' + game + '/') for game in ROUTES):
            self.send_header('Cache-Control', 'no-store')
        super().end_headers()


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port', type=int, default=8093)
    args = parser.parse_args()
    handler = partial(PreviewHandler, directory=str(ROOT))
    server = ThreadingHTTPServer(('127.0.0.1', args.port), handler)
    print(f'Önizleme: http://127.0.0.1:{args.port}/ (oyunlar için internet gerekir)', flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        server.server_close()
