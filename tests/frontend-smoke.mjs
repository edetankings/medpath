// Read-only application HTTP smoke check. Does not start the API or use patient data.
import { createServer, preview } from 'vite';
import assert from 'node:assert/strict';

for (const mode of ['development', 'preview']) {
  const server = mode === 'development'
    ? await createServer({ server: { port: 0 } })
    : await preview({ preview: { port: 0 } });
  try {
    if (mode === 'development') await server.listen();
    const port = server.httpServer.address().port;
    const base = `http://127.0.0.1:${port}`;
    const pending = ['/'];
    const visited = new Set();
    while (pending.length) {
      const url = pending.shift();
      if (visited.has(url)) continue;
      visited.add(url);
      const response = await fetch(base + url);
      assert.equal(response.status, 200, `${mode}: ${url}`);
      const text = await response.text();
      if (url === '/') {
        assert.match(text, /id="root"/);
        for (const match of text.matchAll(/(?:src|href)="([^"#]+)"/g)) {
          if (!match[1].startsWith('http')) pending.push(new URL(match[1], base).pathname);
        }
      } else if (response.headers.get('content-type')?.includes('javascript')) {
        for (const match of text.matchAll(/(?:from\s*|import\s*)["']([^"']+)["']/g)) {
          if (match[1].startsWith('/')) pending.push(match[1]);
        }
      }
    }
    assert.ok(visited.size >= (mode === 'development' ? 20 : 4));
    console.log(`${mode}: ${visited.size} frontend HTML/module/asset responses passed`);
  } finally {
    if (mode === 'development') await server.close();
    else await new Promise((resolve, reject) => server.httpServer.close(error => error ? reject(error) : resolve()));
  }
}
