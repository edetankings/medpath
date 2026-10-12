import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import postcss from 'postcss';

// Render only illustrative landing content; no API, account, or patient storage access.
const result = await build({
  entryPoints: ['src/pages/LandingPage.tsx'], bundle: true, write: false,
  platform: 'node', format: 'cjs', external: ['react'], loader: { '.css': 'empty' },
  plugins: [{ name: 'isolated-contexts', setup(builder) {
    builder.onResolve({ filter: /context\/(AppContext|AuthContext)$/ }, args => ({ path: args.path, namespace: 'test-context' }));
    builder.onLoad({ filter: /.*/, namespace: 'test-context' }, () => ({ contents: 'export const useApp = () => ({ navigate() {} }); export const useAuth = () => ({ isAuthenticated: false, logout() {} });' }));
  } }],
});
const exported = { exports: {} };
new Function('require', 'module', 'exports', result.outputFiles[0].text)(createRequire(import.meta.url), exported, exported.exports);
const { LandingPage } = exported.exports;
const html = renderToStaticMarkup(React.createElement(LandingPage));
assert.match(html, /aria-label="Your Path to Better Healthcare\."/);
assert.equal((html.match(/<h1\b/g) || []).length, 1);
assert.equal((html.match(/<details>/g) || []).length, 6);
assert.equal((html.match(/class="mp-feature mp-feature-/g) || []).length, 5);
assert.equal((html.match(/aria-pressed=/g) || []).length, 4);
assert.equal((html.match(/role="tab"/g) || []).length, 3);
assert.match(html, /Example interface only\. No real patient information\./);
assert.match(html, /Live provider discovery is in development\./);
assert.doesNotMatch(html, /HIPAA|end-to-end encrypted|Let\?s|don\?t|it\?s/);
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
assert.equal(new Set(ids).size, ids.length, 'IDs must be unique');
for (const [, targets] of html.matchAll(/aria-(?:controls|labelledby)="([^"]+)"/g)) {
  for (const target of targets.split(' ')) assert.ok(ids.includes(target), `Missing ARIA target: ${target}`);
}
const css = postcss.parse(readFileSync('src/pages/LandingPage.css', 'utf8'));
css.walkRules(rule => {
  if (rule.parent.type === 'atrule' && /keyframes$/.test(rule.parent.name)) return;
  for (const selector of rule.selectors) assert.match(selector, /\.mp-/, `Unscoped style: ${selector}`);
});
assert.ok(css.nodes.some(node => node.type === 'atrule' && /^\(prefers-reduced-motion:\s*reduce\)$/.test(node.params)));
console.log('Landing SSR/content/ARIA references/style isolation checks passed. Browser interactions and layout are not covered.');
