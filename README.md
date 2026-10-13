# MedPath

MedPath is an experimental healthcare-navigation application with a React and
TypeScript single-page frontend and a Python FastAPI backend. The application
includes account and profile management, healthcare records, appointments,
document uploads, and a health-navigation experience.

> **Development project — not for real patient data.** MedPath has not been
> validated or configured for production use. Do not enter real medical,
> insurance, identity, or other sensitive personal information.

## Technology

- **Frontend:** React, TypeScript, Vite
- **Backend:** Python, FastAPI, Pydantic
- **Local persistence:** SQLite
- **Optional Android shell:** Capacitor

## Requirements

- Node.js and npm
- Python 3.10 or later
- Android Studio and Android SDK only if building the Android app

## Run locally

From the project root, install the frontend and backend dependencies:

```powershell
npm ci
python -m pip install -r backend/requirements.txt
```

Start the API and frontend in separate terminals:

```powershell
npm run backend
npm run dev
```

The frontend is available at `http://127.0.0.1:3000`. The API listens on
`http://127.0.0.1:8000`; its interactive API documentation is at
`http://127.0.0.1:8000/docs`.

Vite serves the frontend during development. Do not open `index.html` directly
or serve the project root with a generic static server.

### Frontend API URL

The frontend uses `http://localhost:8000` by default. To use another API
origin, create a local `.env.local` file in the project root:

```dotenv
VITE_API_URL=https://your-api.example
```

Restart the development server or rebuild after changing the value. Variables
prefixed with `VITE_` are included in browser-delivered code; never put secrets,
tokens, passwords, or personal data in them.

## Build and test

Create a production frontend bundle in `dist/`:

```powershell
npm run build
```

Run the project's standard test suite:

```powershell
npm test
```

Preview the built frontend locally with:

```powershell
npm run preview
```

The preview server is for local verification, not production hosting. The
application uses hash-based routes, for example `/#passport`.

## Android

Build the frontend assets, then synchronize or build the Android app:

```powershell
npm run build
npm run cap:sync
npm run build:apk
```

Android build tooling and the Android SDK must be installed separately.

## Data and security

- The API creates its SQLite database at `backend/medpath.db` when it starts.
- Uploaded files are stored locally under `backend/storage/`.
- Keep databases, uploaded files, environment files, credentials, and private
  configuration out of source control.
- Development servers bind to loopback by default. Do not expose them directly
  to the public internet.
- The current SQLite and local-file storage design requires a separate
  durability and backup plan before hosting.
- Review and restrict the API's CORS configuration and establish production
  security controls before connecting a hosted frontend.
- Healthcare data has strict privacy and security requirements. Obtain
  appropriate security, privacy, and legal review before handling real patient
  information.

## License

The project metadata declares the MIT License.
