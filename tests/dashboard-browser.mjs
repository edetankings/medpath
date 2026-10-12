// Real UI + FastAPI validation using only a disposable database and synthetic records.
// Set MEDPATH_PLAYWRIGHT_MODULE to an installed playwright-core module path when needed.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createServer } from 'vite';

const modulePath = process.env.MEDPATH_PLAYWRIGHT_MODULE;
const { chromium } = await import(modulePath ? pathToFileURL(modulePath).href : 'playwright');
const apiPort = 18765;
const apiBase = `http://127.0.0.1:${apiPort}`;
const python = process.env.MEDPATH_TEST_PYTHON || path.resolve('.venv-task2/Scripts/python.exe');
const backend = spawn(python, ['-B', 'tests/dashboard_test_api.py', String(apiPort)], { stdio: 'ignore' });
let server, browser;
try {
  for (let attempt = 0; ; attempt++) {
    try { const response = await fetch(`${apiBase}/openapi.json`); if (response.ok) break; } catch {}
    assert.ok(attempt < 100, 'Disposable API did not start');
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  server = await createServer({ server: { port: 0, strictPort: false }, define: { 'import.meta.env.VITE_API_URL': JSON.stringify(apiBase) } });
  await server.listen();
  const base = `http://127.0.0.1:${server.httpServer.address().port}`;
  const credentials = { email: 'dashboard@fixture.example', password: 'Synthetic-Dashboard-Password-Only!' };
  const signup = await fetch(`${apiBase}/api/auth/signup`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...credentials, firstName: 'Dashboard', lastName: 'Fixture' }) });
  assert.equal(signup.status, 201);
  const { token } = await signup.json();
  const apiRequest = async (route, payload) => {
    const response = await fetch(apiBase + route, { method: payload ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: payload ? JSON.stringify(payload) : undefined });
    assert.ok(response.ok, `Fixture API request failed: ${route}`);
    return response.json();
  };
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
  page.setDefaultTimeout(60000);
  await page.route(/https:\/\/(fonts\.googleapis\.com|fonts\.gstatic\.com)/, route => route.abort());
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`${base}/#signin`, { waitUntil: 'domcontentloaded' });
  await page.getByLabel('Email address').fill(credentials.email);
  await page.locator('#auth-password').fill(credentials.password);
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  await page.getByRole('heading', { name: 'Welcome back, Dashboard.' }).waitFor();
  await page.getByRole('heading', { name: 'Space for your next step' }).waitFor();
  await page.getByRole('heading', { name: 'Your story starts here' }).waitFor();
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: 'Welcome back, Dashboard.' }).waitFor();
  console.log('Login, empty states and authenticated refresh passed');

  await apiRequest('/api/passport/allergies', { allergen: 'Synthetic allergen', severity: 'Mild', reaction: 'Fixture reaction', diagnosedDate: '2026-01-01' });
  await apiRequest('/api/appointments', { providerName: 'Synthetic provider', specialty: 'General practice', clinic: 'Fixture clinic', date: '2099-01-01', time: '10:00 AM', type: 'in-person' });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.getByText('Synthetic allergen (Mild)', { exact: true }).waitFor();
  await page.locator('.pd-appointment').getByText('Synthetic provider', { exact: true }).waitFor();
  await page.getByText('Planned', { exact: true }).waitFor();
  assert.ok((await page.locator('.pd-events li').count()) > 0, 'Real timeline events missing');
  await mkdir('docs/dashboard-qa', { recursive: true });
  for (const width of [1440, 1024, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 1100 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `Horizontal overflow at ${width}px`);
    if (width === 1440 || width === 390) await page.screenshot({ path: `docs/dashboard-qa/${width}.png`, fullPage: true });
    if (width <= 800) {
      await page.getByRole('button', { name: 'Toggle navigation' }).click();
      await page.getByRole('button', { name: 'Close navigation', exact: true }).first().waitFor({ state: 'visible' });
      await page.waitForFunction(() => document.getElementById('app-navigation').contains(document.activeElement), null, {timeout:10000}).catch(async error => { console.log(await page.evaluate(() => ({active:document.activeElement.tagName, sidebarVisibility:getComputedStyle(document.getElementById('app-navigation')).visibility, sidebarInert:document.getElementById('app-navigation').inert, mainInert:document.querySelector('.app-main').inert}))); throw error; });
      await page.keyboard.press('Escape');
      assert.equal(await page.getByRole('button', { name: 'Toggle navigation' }).getAttribute('aria-expanded'), 'false');
    }
  }
  console.log('Real passport, appointments, timeline and responsive widths passed');
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.getByRole('button', { name: 'Notifications', exact: true }).click();
  await page.getByText(/Notifications.*Coming soon/).waitFor();
  await page.keyboard.press('Escape');
  console.log('Notification dropdown passed');
  await page.getByRole('button', { name: 'Upload Medical Document' }).click();
  await page.getByRole('dialog').waitFor();
  await page.getByLabel('Document Title', { exact: true }).fill('Synthetic browser document');
  await page.locator('#doc-file-input').setInputFiles({name:'fixture.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.4\n% Synthetic fixture\n%%EOF\n')});
  await page.getByRole('button', {name:'Upload & Save',exact:true}).click();
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
  await page.getByRole('cell', {name:'Synthetic browser document',exact:true}).waitFor();
  console.log('Document upload saved through FastAPI');
  for (const [name, hash] of [['Dashboard', 'dashboard'], ['Healthcare Passport', 'passport'], ['Medical Documents', 'documents'], ['Find Care', 'find-care'], ['Appointments', 'appointments'], ['Health Timeline', 'timeline'], ['Messages', 'messages'], ['Settings', 'profile'], ['AI Navigator', 'ai-navigator']]) {
    await page.locator('.sidebar-link').getByText(name, { exact: true }).click();
    assert.equal(new URL(page.url()).hash, '#' + hash);
    await page.locator('main').waitFor();
  }
  await page.getByRole('button', { name: 'Sign Out', exact: true }).click();
  await page.waitForURL('**/#home');
  await page.goto(`${base}/#dashboard`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Sign In', exact: true }).waitFor();
  assert.equal(new URL(page.url()).hash, '#signin');
  assert.deepEqual(errors, [], 'Browser runtime errors');
  console.log('Document upload entry, all navigation destinations, notifications and logout protection passed');
} finally {
  await browser?.close();
  await server?.close();
  backend.kill();
}
