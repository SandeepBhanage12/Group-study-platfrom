## Group Study Platform

Real-time study rooms with video, chat, and an AI helper (Gemini). Users can create or join named rooms, video chat with peers (WebRTC + socket.io signaling), exchange messages, and query Gemini for study assistance.

### Features
- Create/join rooms by name; capacity guard built-in
- WebRTC video calling via simple-peer with socket.io signaling
- In-room text chat (broadcast to peers)
- Gemini-powered helper panel
- Room list fetch to see active rooms

### Tech Stack
- Frontend: React (CRA), socket.io-client, simple-peer, styled-components
- Backend: Node.js, Express, socket.io
- AI: Google Generative AI (Gemini)

### Project Structure
```
.
├─ server.js          # Express + socket.io server
├─ client/            # React app
└─ static.json        # Static hosting helper (if needed)
```

### Prerequisites
- Node.js 18+ recommended
- npm or yarn
- (Optional) Gemini API key if using the AI helper

### Environment Variables
Create two env files:

**Backend (`.env` at repo root)**
```
PORT=8181
USE_HTTPS=false
```
- Set `USE_HTTPS=true` only if you have `cert.key` and `cert.crt` in the root.

**Frontend (`client/.env`)**
```
REACT_APP_BASE_URL=http://localhost:8181
REACT_APP_GEMINI_API_KEY=your_gemini_key_here
```
- The base URL must include protocol. In prod (served by the same origin) it falls back to the page origin.

### Install
```bash
# from repo root
npm install          # installs server deps
cd client && npm install
```

### Run in Development
```bash
# terminal 1 (backend)
npm run dev          # or: node server.js

# terminal 2 (frontend)
cd client
npm start
```
- Backend default: http://localhost:8181
- Frontend dev: http://localhost:3000

### Build for Production
```bash
npm run build        # builds the React app into client/build
```
- In production the server serves `client/build` and uses `window.location.origin` for sockets.

### Key Endpoints
- `POST /get-rooms` — returns current room occupancy (in-memory).
- Socket namespace: root (`/`) with events `join room`, `sending signal`, `returning signal`, `send message`, etc.

### Troubleshooting
- **Cannot connect sockets in dev:** ensure `REACT_APP_BASE_URL` points to your backend with protocol (e.g., `http://localhost:8181`). Restart `npm start` after changes.
- **Room full alert:** rooms cap at 4 participants.
- **Gemini quota / 429:** the UI now surfaces a friendly message; switch to a key with quota or wait/reset limits.
- **HTTPS locally:** set `USE_HTTPS=true` and provide `cert.key`/`cert.crt`, then use `https://localhost:8181` in `REACT_APP_BASE_URL`.

### Scripts (root)
- `npm run dev` — start backend in development
- `npm start` — start backend
- `npm run build` — build frontend

### Scripts (client/)
- `npm start` — React dev server
- `npm run build` — production build

### Notes
- Environment changes require restarting the corresponding server.
- Room/user data is in-memory; restarting the server clears rooms.

### Deploy on Render (Web Service)
1) Push this repo to a Git provider (GitHub/GitLab/Bitbucket).
2) Create a **Web Service** on Render and connect the repo.
3) Environment:
   - Add `PORT` = `10000` (Render sets `PORT`; any value is fine, your server reads `process.env.PORT`).
   - Add `USE_HTTPS` = `false` (Render terminates TLS; keep the app on HTTP internally).
   - Add `REACT_APP_GEMINI_API_KEY` if you need the AI helper.
   - `REACT_APP_BASE_URL` is not required in production; the client uses the same origin.
4) Build command:
   ```
   npm install && npm run build
   ```
5) Start command:
   ```
   npm start
   ```
6) Instance type: start with a free/shared instance; scale up if video sessions or users grow.
7) After first deploy, open the Render URL. Sockets and API will use the same origin automatically.

