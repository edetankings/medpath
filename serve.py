#!/usr/bin/env python3
"""Serve only MedPath's compiled dist directory. Use Vite for development."""
import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote

BUILD_DIR = Path(__file__).absolute().parent / "dist"
PUBLIC_EXTENSIONS = {".js", ".css", ".json", ".svg", ".png", ".jpg", ".jpeg",
                     ".ico", ".webp", ".woff", ".woff2", ".ttf"}

class MedPathHandler(SimpleHTTPRequestHandler):
    """No directory listing, SPA catch-all, or access outside the build root."""
    def log_message(self, format, *args):
        # URLs can contain sensitive query strings. Do not log request contents.
        pass

    def end_headers(self):
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def send_head(self):
        try:
            url_path = unquote(self.path.split("?", 1)[0], errors="strict")
            parts = url_path.lstrip("/").split("/")
            if any(p.startswith(".") or ":" in p or "\\" in p or "%" in p
                   or any(ord(c) < 32 for c in p) for p in parts):
                raise ValueError("Invalid path")
            relative = "index.html" if url_path == "/" else url_path.lstrip("/")
            allowed = relative in {"index.html", "manifest.json"} or (
                relative.startswith("assets/") and Path(relative).suffix.lower() in PUBLIC_EXTENSIONS
            )
            root = Path(self.directory)
            target = root.joinpath(relative).resolve()
            if not allowed or not target.is_relative_to(root) or not target.is_file():
                raise ValueError("Not public")
            if target != root.joinpath(relative).absolute():
                raise ValueError("Linked file")
        except (ValueError, OSError, UnicodeError):
            self.send_error(404, "Not found")
            return None
        self.path = "/" + relative
        return super().send_head()

    def list_directory(self, path):
        self.send_error(404, "Not found")
        return None

def make_server(port=3000, host="127.0.0.1", build_dir=BUILD_DIR):
    # Injectable for tests; the CLI always uses the adjacent dist directory.
    root = Path(build_dir).absolute()
    if root.resolve() != root or not (root / "index.html").is_file():
        raise ValueError("Missing or linked dist directory. Run npm run build first.")
    return ThreadingHTTPServer((host, port), partial(MedPathHandler, directory=str(root)))

def run():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("legacy_port", nargs="?", type=int)
    parser.add_argument("--port", type=int, default=None)
    parser.add_argument("--host", default="127.0.0.1",
                        help="Explicit network opt-in, e.g. --host 0.0.0.0")
    args = parser.parse_args()
    port = args.port if args.port is not None else (args.legacy_port or 3000)
    try:
        server = make_server(port, args.host)
    except (ValueError, OSError) as error:
        parser.exit(1, f"Cannot start frontend server: {error}\n")
    print(f"MedPath compiled frontend: http://{args.host}:{server.server_port}/", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()

if __name__ == "__main__":
    run()
