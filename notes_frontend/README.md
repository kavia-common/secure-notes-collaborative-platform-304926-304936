# Secure Notes Frontend (React)

Ocean Professional themed React SPA for:
- Register / Login (cookie-based JWT auth via backend)
- Collections CRUD
- Notes CRUD (list + editor)

## Prerequisites
- Node.js + npm
- Backend running (notes_backend_api)

## Configuration

Create a `.env.local` (recommended) in this folder:

```bash
REACT_APP_API_BASE_URL=http://localhost:4000
```

You can copy from `.env.example`.

Important: The backend uses an **HTTP-only cookie** for JWT, so the frontend must send requests with credentials. This app does that automatically in `src/api/client.js`.

## Run

```bash
npm install
npm start
```

App will run at: http://localhost:3000

## Backend API expectation

This frontend calls:
- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/logout`
- `GET/POST/PUT/DELETE /collections`
- `GET/POST /collections/:collectionId/notes`
- `GET/PUT/DELETE /notes/:noteId`

If you see authentication errors, confirm backend CORS allows credentials and the API base URL is correct.
