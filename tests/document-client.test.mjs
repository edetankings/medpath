import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import ts from 'typescript';

// Execute the actual API client without a browser or any live API/database.
const source = await fs.readFile(new URL('../src/services/api.ts', import.meta.url), 'utf8');
const code = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
const { api, formatUserProfile } = await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'));
const originalFetch = globalThis.fetch;
const originalStorage = globalThis.localStorage;
const values = new Map();
globalThis.localStorage = {
  getItem: key => values.get(key) ?? null,
  setItem: (key, value) => values.set(key, value),
  removeItem: key => values.delete(key),
};

try {
  await test('unknown blood type stays null; explicit type survives mapping', () => {
    assert.equal(formatUserProfile({ id: 'fixture', bloodGroup: null }).bloodGroup, null);
    assert.equal(formatUserProfile({ id: 'fixture', bloodGroup: 'AB-' }).bloodGroup, 'AB-');
  });
  await test('passport and upload retain download filename and document metadata', async () => {
    const document = { id: 'fixture', title: 'Record', category: 'Imaging', issuingDoctor: 'Dr. Fixture',
      documentDate: '2024-02-29', fileName: 'report.pdf', fileSize: '1 KB PDF', mimeType: 'application/pdf', createdAt: '2026-09-27' };
    globalThis.fetch = async () => new Response(JSON.stringify({ documents: [document] }));
    const passport = await api.getPassport();
    const mapped = passport.documents[0];
    assert.equal(mapped.fileName, document.fileName);
    assert.equal(mapped.doctor, document.issuingDoctor);
    assert.equal(mapped.date, document.documentDate);
    assert.equal(mapped.mimeType, document.mimeType);
    assert.equal(mapped.createdAt, document.createdAt);
    globalThis.fetch = async () => new Response(JSON.stringify(document), { status: 201 });
    assert.deepEqual(await api.uploadDocument(new FormData()), mapped);
  });
  await test('missing document error propagates for the UI instead of saving a fake PDF', async () => {
    globalThis.fetch = async () => new Response(JSON.stringify({ detail: 'Document file is unavailable. No replacement was generated.' }), { status: 404 });
    await assert.rejects(api.downloadDocument('fixture', 'report.pdf'), /Document file is unavailable/);
  });
  await test('document download authentication failure clears the expired session', async () => {
    let unauthorized = false;
    api.setUnauthorizedHandler(() => { unauthorized = true; });
    api.setToken('synthetic-test-token');
    globalThis.fetch = async () => new Response(JSON.stringify({ detail: 'Session expired' }), { status: 401 });
    await assert.rejects(api.downloadDocument('fixture', 'report.pdf'), /Session expired/);
    assert.equal(api.getToken(), null);
    assert.equal(unauthorized, true);
  });
} finally {
  globalThis.fetch = originalFetch;
  if (originalStorage === undefined) delete globalThis.localStorage;
  else globalThis.localStorage = originalStorage;
}
