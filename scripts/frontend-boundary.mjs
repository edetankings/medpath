import path from 'node:path';
import fs from 'node:fs';

const publicExtensions = new Set(['.js', '.css', '.json', '.svg', '.png', '.jpg', '.jpeg', '.ico', '.webp', '.woff', '.woff2', '.ttf']);
const sourceExtensions = new Set([...publicExtensions, '.ts', '.tsx', '.jsx', '.mjs', '.cjs', '.html']);
const within = (file, root) => file === root || file.startsWith(root + path.sep);

// Run BEFORE Vite's transform, raw-file, public-directory, and SPA middleware.
export function frontendBoundary() {
  let root;
  let dist;
  let frontendRoots;
  let frontendFiles;
  function allowedFile(file, roots, files = []) {
    try {
      const resolved = fs.realpathSync(file);
      return resolved === path.resolve(file) && fs.statSync(resolved).isFile()
        && (files.includes(resolved) || roots.some(base => within(resolved, base)));
    } catch { return false; }
  }
  function middleware(production) {
    return (req, res, next) => {
      let allowed = false;
      try {
        const url = decodeURIComponent((req.url || '/').split('?')[0]);
        const parts = url.split('/');
        const invalid = /[\\\x00-\x1f%]/.test(url)
          || parts.some(p => p === '..' || p === '.' || (p.startsWith('.') && p !== '.vite'));
        if (!invalid && ['GET', 'HEAD'].includes(req.method)) {
          if (production) {
            const relative = url === '/' ? 'index.html' : url.slice(1);
            const publicPath = ['index.html', 'manifest.json'].includes(relative)
              || (relative.startsWith('assets/') && publicExtensions.has(path.extname(relative).toLowerCase()));
            allowed = !url.includes(':') && publicPath && allowedFile(path.resolve(dist, relative), [dist]);
          } else if (url === '/@vite/client' || url === '/@react-refresh') {
            allowed = true;
          } else {
            const file = url.startsWith('/@fs/')
              ? path.resolve(url.slice(5))
              : path.resolve(root, url === '/' ? 'index.html' : url.slice(1));
            allowed = sourceExtensions.has(path.extname(file).toLowerCase())
              && allowedFile(file, frontendRoots, frontendFiles);
          }
        }
      } catch { /* Malformed encoding must fail closed. */ }
      if (!allowed) {
        res.statusCode = 404;
        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.end('Not found');
        return;
      }
      next();
    };
  }
  return {
    name: 'medpath-frontend-boundary',
    enforce: 'pre',
    configResolved(config) {
      root = fs.realpathSync(config.root);
      dist = path.resolve(root, config.build.outDir);
      frontendRoots = ['src', 'css', 'assets', 'node_modules'].map(p => path.resolve(root, p));
      frontendFiles = ['index.html', 'manifest.json'].map(p => path.resolve(root, p));
    },
    configureServer(server) { server.middlewares.use(middleware(false)); },
    configurePreviewServer(server) { server.middlewares.use(middleware(true)); },
  };
}
