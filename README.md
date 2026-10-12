# MedPath

MedPath is a healthcare-navigation application with a React and TypeScript
single-page frontend and a FastAPI backend. It includes profile and healthcare
record management, appointment planning, document upload, and an experimental
health navigator.

> **Project status:** This project is not currently validated or configured for
> production use with real patient information. Do not enter real medical,
> insurance, or identity data.

## Technology

- Frontend: React, TypeScript, Vite
- API: Python, FastAPI, Pydantic
- Local persistence: SQLite
- Optional mobile shell: Capacitor for Android

## Requirements

- Node.js compatible with the Vite 5 toolchain
- Python 3.10 or later

## Local development

Install the frontend and API dependencies from the project root:

```powershell
npm ci
python -m pip install -r backend/requirements.txt
```

Start the API and frontend in separate terminals:

```powershell
npm run backend
npm run dev
```

Open `http://127.0.0.1:3000`. The development API listens on
`http://127.0.0.1:8000`. Vite serves the application entry point and transforms
the TypeScript source; do not open `index.html` directly or serve the project
root with a generic static file server.

The API initializes its SQLite database when it starts. Its local database is
stored at `backend/medpath.db` and is excluded from Git. Keep local databases,
environment files, uploaded documents, and credentials out of source control.

### Frontend API URL

The frontend defaults to `http://localhost:8000`. To use a different API origin,
create a local `.env.local` file:

```dotenv
VITE_API_URL=https://your-api.example
```

Restart Vite or rebuild after changing the value. All `VITE_` variables are
embedded in browser-delivered code and are public. Never put secrets, access
tokens, passwords, or personal data in them.

## Build and local preview

Create a production frontend build:

```powershell
npm run build
```

The generated site is written to `dist/`. Preview the build locally with:

```powershell
npm run preview
```

The preview server is for local verification, not an internet-facing production
server. The application uses hash-based routes such as `/#passport`.

For a local static-server check after building:

```powershell
npm run serve:py
```

This helper serves only the adjacent `dist` build and binds to loopback by
default. It is not a production hosting service.

## Tests

Run the standard security-boundary tests:

```powershell
npm test
```

These tests use temporary fixtures and do not start the API against the local
application database. The medical-document regression suite is also designed
to use a temporary database and isolated document storage. Install its declared
test dependencies in a virtual environment before running it:

```powershell
python -m venv .venv-task2
.\.venv-task2\Scripts\python.exe -m pip install -r backend/requirements-test.txt
.\.venv-task2\Scripts\python.exe -B -m unittest discover -s tests -p test_medical_documents.py -v
node --test tests/document-client.test.mjs
```

Do not run legacy database-mutating test utilities against real or valuable
data. In particular, tests that delete sessions or records must only be used
with a disposable, isolated database.

## Android

The Android shell is configured with Capacitor. Build the web assets first, then
use the project scripts to synchronize or build Android:

```powershell
npm run build
npm run cap:sync
npm run build:apk
```

Android build tooling and the Android SDK must be installed separately.

## Security and deployment considerations

- Local development servers bind to loopback by default. Do not expose Vite or
  the development API to the public internet.
- The API currently uses SQLite at a fixed local path and stores uploaded
  documents on the local filesystem. These choices require a deliberate,
  durable storage design before a hosted deployment.
- Review and restrict the API CORS configuration to the deployed frontend
  origin before production use.
- Use HTTPS for hosted traffic and configure production secrets only in the
  backend hosting environment.
- Never publish `.env` files, local databases, uploaded documents, private
  agent configuration, backup snapshots, or generated build artifacts.
- Healthcare data has strict privacy and security requirements. Obtain
  appropriate security, privacy, and legal review before handling real patient
  information.
