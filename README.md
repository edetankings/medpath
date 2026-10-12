# MedPath

React + TypeScript frontend built with Vite, with a separate FastAPI/SQLite API.
Requires Python 3.10+ and a Node version supported by the installed Vite version.

## Development

Install dependencies once from the project root:

```powershell
npm install
python -m pip install -r backend/requirements.txt
```

Run in separate terminals:

```powershell
npm run backend
npm run dev
```

Open **http://127.0.0.1:3000**. The API listens on **127.0.0.1:8000**.
`npm start` also starts Vite. `run-backend.ps1` forwards arguments to the API
launcher. Starting the API initializes its database; fixture-only tests do not
start the API.

Vite transforms `/src/main.tsx` and supports React hot reload. Opening
`index.html` directly or serving the source directory with a generic static
server does not run this application correctly and can expose private files.

The default API URL is `http://localhost:8000`. Override it in `.env.local`,
then restart Vite or rebuild:

```text
VITE_API_URL=https://api.example.com
```

Every `VITE_` variable is public frontend configuration. Never put passwords,
API secrets, session tokens or patient information in these variables or
frontend source/assets. Private credentials belong in the API environment.

## Compiled frontend / production

```powershell
npm run build
npm run serve:py
```

Open **http://127.0.0.1:3000**. Python serves only the adjacent `dist` build and
fails if the build is missing. Equivalent Windows command:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\serve.ps1 -Port 3000
```

`npm run serve` invokes that wrapper. `npm run preview` runs the restricted Vite
build preview on **127.0.0.1:4173** for local build checks. Neither preview nor
the Python helper is an internet-facing production gateway.

For public production, publish **only the contents of `dist`** to a static host
behind HTTPS. Run the API separately behind HTTPS with an explicit CORS allowlist
for the frontend origin. Set `VITE_API_URL` before building; the existing API
CORS configuration needs separate production review. Never publish the project
root, `backend`, `.backups`, `node_modules`, `.env*`, databases/journals or
uploaded documents. Never copy private data into `dist`, `src`, `css` or `assets`.
Builds disable public-directory copying and production source maps. Uploaded
files remain behind existing authenticated API routes.

The app uses hash routes such as `/#passport`; no catch-all static-server
fallback is needed. Deploy `index.html` and its assets from the same build.

## Explicit network access

Local servers bind to loopback by default. For deliberate access from a trusted
development device, explicitly opt in to the servers you need:

```powershell
npm run dev -- --host 0.0.0.0
python backend/run.py --host 0.0.0.0
python serve.py --host 0.0.0.0 --port 3000
# PowerShell: .\serve.ps1 -BindAddress 0.0.0.0 -Port 3000
# Preview: npm run preview -- --host 0.0.0.0
```

Restrict access with a firewall; do not expose Vite or the development API to
the internet. LAN HTTP does not protect passwords or tokens in transit. Use
HTTPS for real accounts/data. For a phone or emulator set the API URL to a
reachable host: its localhost is not the development computer.

The Android build remains `npm run build:apk`, which packages `dist` through
Capacitor. Existing packaged Android assets require a new sync/build to update.

## Security regression tests

```powershell
npm test
# Windows wrapper:
powershell -NoProfile -ExecutionPolicy Bypass -File .\test-server.ps1
```

After a build, `node tests/frontend-smoke.mjs` also checks the actual frontend
module and asset responses without starting the API. It is an HTTP smoke check,
not a visual/browser test.

Tests create synthetic private files in temporary directories and exercise
Python, the PowerShell wrapper (Windows), Vite development and Vite preview.
They check private paths, traversal, encoding, directory junctions, GET/HEAD,
loopback defaults and frontend asset responses. The API launcher uses a stub;
the application database is never opened. FastAPI/Pydantic are not required.

Do **not** use `backend/test_real_auth.py` for non-destructive verification: that
older suite writes to the application database and deletes sessions.

## Stage 2A Task 2: medical-data and document tests

Install declared backend/test dependencies into an isolated environment:

```powershell
python -m venv .venv-task2
.\.venv-task2\Scripts\python.exe -m pip install -r backend/requirements-test.txt
.\.venv-task2\Scripts\python.exe -B -m unittest discover -s tests -p test_medical_documents.py -v
node --test tests/document-client.test.mjs
npm run build
```

On macOS/Linux use `.venv-task2/bin/python` instead. The backend suite confines
all SQLite connections to a new temporary database and redirects document
storage before starting the test app. It does not run the legacy destructive
authentication suite. Test HTTP clients use synthetic accounts and files only.
