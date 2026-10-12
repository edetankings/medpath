import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { createServer, preview } from 'vite';

const project = fileURLToPath(new URL('../', import.meta.url));
const privateUrls = ['/backend/medpath.db', '/backend/medpath.db-wal', '/backend/medpath.db-shm',
  '/backend/medpath.db-journal', '/private.js', '/.env', '/.env.local', '/backend/app.py',
  '/backend/storage/documents/report.pdf', '/private-config.json', '/vite.config.ts',
  '/.backups/snapshot/manifest.json', '/scripts/frontend-boundary.mjs',
  '/../backend/medpath.db', '/%2e%2e/backend/medpath.db',
  '/assets/..%5c..%5cbackend%5cmedpath.db', '/backend/app.py?raw',
  '/backend/app.py?import&raw??', '/.env?raw', '/assets/%252e%252e/backend/medpath.db'];

function get(port, url, method = 'GET') {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port, path: url, method }, res => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', data => body += data);
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('error', reject);
    req.end();
  });
}

for (const mode of ['development', 'preview']) {
  test(`${mode}: private fixtures blocked, frontend served, loopback default`, async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'medpath-vite-test-'));
    let server;
    try {
      for (const name of ['src', 'css', 'assets', 'node_modules', 'backend/storage/documents', 'dist/assets', '.backups/snapshot'])
        await fs.mkdir(path.join(root, name), { recursive: true });
      for (const url of privateUrls.filter(p => !p.includes('%') && !p.includes('?') && !p.includes('..'))) {
        const file = path.join(root, url.slice(1));
        await fs.mkdir(path.dirname(file), { recursive: true });
        await fs.writeFile(file, 'PRIVATE_FIXTURE_DO_NOT_SERVE');
      }
      await fs.writeFile(path.join(root, 'index.html'), '<div id="root">MedPath fixture</div><script type="module" src="/src/main.ts"></script>');
      await fs.writeFile(path.join(root, 'src/main.ts'), 'const value: string = "frontend"; document.querySelector("#root").textContent = value;');
      await fs.writeFile(path.join(root, 'dist/index.html'), '<div>MedPath fixture</div><script src="/assets/app.js"></script>');
      await fs.writeFile(path.join(root, 'dist/assets/app.js'), 'window.frontendLoaded=true;');
      await fs.mkdir(path.join(root, 'private-assets'));
      await fs.writeFile(path.join(root, 'private-assets/leak.js'), 'PRIVATE_FIXTURE_DO_NOT_SERVE');
      const linkRoot = mode === 'preview' ? 'dist/assets/linked' : 'assets/linked';
      await fs.symlink(path.join(root, 'private-assets'), path.join(root, linkRoot), process.platform === 'win32' ? 'junction' : 'dir');
      const options = {
        root, configFile: path.join(project, 'vite.config.ts'), logLevel: 'silent',
        server: { port: 0, fs: { allow: [path.join(root, 'src'), path.join(root, 'index.html')] } },
        preview: { port: 0 },
      };
      server = mode === 'development' ? await createServer(options) : await preview(options);
      if (mode === 'development') await server.listen();
      const address = server.httpServer.address();
      assert.equal(address.address, '127.0.0.1');
      const urls = [...privateUrls, '/assets/linked/leak.js', '/@fs/' + path.join(root, 'backend/medpath.db').replaceAll('\\', '/')];
      for (const url of urls) {
        for (const method of ['GET', 'HEAD']) {
          const result = await get(address.port, url, method);
          assert.equal(result.status, 404, `${method} ${url}`);
          assert.ok(!result.body.includes('PRIVATE_FIXTURE'));
        }
      }
      const index = await get(address.port, '/');
      assert.equal(index.status, 200);
      assert.match(index.body, /MedPath fixture/);
      const script = await get(address.port, mode === 'development' ? '/src/main.ts' : '/assets/app.js');
      assert.equal(script.status, 200);
      assert.match(script.body, /frontend/);
      if (mode === 'development') assert.ok(!script.body.includes(': string'));
    } finally {
      if (server) {
        if (mode === 'development') await server.close();
        else await new Promise((resolve, reject) => server.httpServer.close(error => error ? reject(error) : resolve()));
      }
      await fs.rm(root, { recursive: true, force: true });
    }
  });
}
