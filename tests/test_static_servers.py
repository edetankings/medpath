"""Temporary fixtures only: never import backend.app or open medpath.db."""
import contextlib
import http.client
import os
from pathlib import Path
import runpy
import shutil
import socket
import subprocess
import sys
import tempfile
import threading
import time
import types
import unittest
from unittest.mock import patch

from serve import make_server

ROOT = Path(__file__).resolve().parents[1]
PRIVATE_PATHS = [
    '/backend/medpath.db', '/backend/medpath.db-wal', '/backend/medpath.db-shm',
    '/backend/medpath.db-journal', '/private.js', '/.env', '/.env.local', '/backend/app.py',
    '/backend/storage/documents/report.pdf', '/private-config.json',
    '/.backups/snapshot/manifest.json', '/serve.py', '/src/main.tsx',
    '/node_modules/package.json', '/assets/', '/backend/',
    '/../backend/medpath.db', '/%2e%2e/backend/medpath.db',
    '/assets/%2e%2e/%2e%2e/backend/medpath.db',
    '/assets/%252e%252e/backend/medpath.db',
    '/assets/..%5c..%5cbackend%5cmedpath.db', '/assets/app.js::$DATA',
    '/@fs/backend/medpath.db', '/backend/app.py?raw', '/.env?import',
]

def request(port, url, method='GET'):
    connection = http.client.HTTPConnection('127.0.0.1', port, timeout=3)
    try:
        connection.request(method, url)
        response = connection.getresponse()
        return response.status, response.read(), dict(response.getheaders())
    finally:
        connection.close()

class StaticServerTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='medpath-static-test-')
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name).resolve()
        self.dist = self.root / 'dist'
        (self.dist / 'assets').mkdir(parents=True)
        (self.dist / 'index.html').write_text('<html><script src="/assets/app.js"></script>MedPath fixture</html>')
        (self.dist / 'assets/app.js').write_text('window.frontendLoaded = true;')
        for name in ['backend/medpath.db', 'backend/medpath.db-wal', 'backend/medpath.db-shm',
                     'backend/medpath.db-journal', 'private.js', '.env', '.env.local', 'backend/app.py',
                     'backend/storage/documents/report.pdf', 'private-config.json',
                     '.backups/snapshot/manifest.json']:
            p = self.root / name
            p.parent.mkdir(parents=True, exist_ok=True)
            p.write_text('PRIVATE_FIXTURE_DO_NOT_SERVE')
        # Even accidentally misplaced private files are outside the public layout.
        (self.dist / '.env').write_text('PRIVATE_FIXTURE_DO_NOT_SERVE')
        (self.dist / 'patient.db').write_text('PRIVATE_FIXTURE_DO_NOT_SERVE')
        (self.dist / 'assets/patient.db').write_text('PRIVATE_FIXTURE_DO_NOT_SERVE')
        self.server = make_server(0, build_dir=self.dist)
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        self.addCleanup(self.stop_server)
        self.port = self.server.server_port

    def stop_server(self):
        self.server.shutdown()
        self.server.server_close()
        self.thread.join(timeout=3)

    def check_boundary(self, port):
        for url in PRIVATE_PATHS + ['/patient.db', '/assets/patient.db']:
            for method in ['GET', 'HEAD']:
                with self.subTest(url=url, method=method):
                    status, body, _ = request(port, url, method)
                    self.assertEqual(status, 404)
                    self.assertNotIn(b'PRIVATE_FIXTURE', body)
        status, html, headers = request(port, '/')
        self.assertEqual(status, 200)
        self.assertIn(b'MedPath fixture', html)
        self.assertEqual(headers['X-Content-Type-Options'], 'nosniff')
        self.assertEqual(request(port, '/assets/app.js')[0], 200)
        self.assertEqual(request(port, '/assets/app.js', 'HEAD')[1], b'')

    def test_python_boundary_and_frontend(self):
        self.check_boundary(self.port)
        self.assertEqual(self.server.server_address[0], '127.0.0.1')

    def test_missing_build_fails_closed(self):
        with self.assertRaises(ValueError):
            make_server(0, build_dir=self.root / 'missing')

    def test_link_escape(self):
        outside = self.root / 'private-assets'
        outside.mkdir()
        (outside / 'leak.js').write_text('PRIVATE_FIXTURE_DO_NOT_SERVE')
        link = self.dist / 'assets/linked'
        try:
            link.symlink_to(outside, target_is_directory=True)
        except OSError:
            if os.name != 'nt':
                self.skipTest('Symlink creation not permitted')
            result = subprocess.run(['cmd', '/c', 'mklink', '/J', str(link), str(outside)],
                                    capture_output=True, creationflags=subprocess.CREATE_NO_WINDOW)
            if result.returncode:
                self.skipTest('Neither symlinks nor junctions permitted')
        self.assertEqual(request(self.port, '/assets/linked/leak.js')[0], 404)
        with self.assertRaises(ValueError):
            make_server(0, build_dir=link)

    @unittest.skipUnless(os.name == 'nt' and shutil.which('powershell'), 'Windows PowerShell required')
    def test_powershell_wrapper_boundary(self):
        shutil.copy2(ROOT / 'serve.py', self.root / 'serve.py')
        shutil.copy2(ROOT / 'serve.ps1', self.root / 'serve.ps1')
        with socket.socket() as sock:
            sock.bind(('127.0.0.1', 0))
            port = sock.getsockname()[1]
        process = subprocess.Popen(['powershell', '-NoProfile', '-ExecutionPolicy', 'Bypass',
                                    '-File', str(self.root / 'serve.ps1'), '-Port', str(port)],
                                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                                   creationflags=subprocess.CREATE_NO_WINDOW)
        try:
            deadline = time.monotonic() + 20
            while True:
                if process.poll() is not None:
                    self.fail('PowerShell wrapper exited before serving')
                try:
                    request(port, '/')
                    break
                except OSError:
                    if time.monotonic() > deadline:
                        self.fail('PowerShell wrapper startup timed out')
                    time.sleep(0.1)
            self.check_boundary(port)
        finally:
            subprocess.run(['taskkill', '/PID', str(process.pid), '/T', '/F'],
                           capture_output=True, creationflags=subprocess.CREATE_NO_WINDOW)
            process.wait(timeout=10)

class BackendLauncherTests(unittest.TestCase):
    def test_binding_default_and_explicit_override_without_starting_api(self):
        for arguments, expected in [([], '127.0.0.1'), (['--host', '0.0.0.0'], '0.0.0.0')]:
            calls = []
            fake = types.SimpleNamespace(run=lambda *args, **kwargs: calls.append(kwargs))
            with patch.dict(sys.modules, {'uvicorn': fake}), patch.object(sys, 'argv', ['run.py'] + arguments):
                runpy.run_path(str(ROOT / 'backend/run.py'), run_name='__main__')
            self.assertEqual(calls[0]['host'], expected)

if __name__ == '__main__':
    unittest.main()
