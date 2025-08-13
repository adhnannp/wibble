# Video Chat App (TypeScript) — JWT + Session Hybrid

**Stack**: React (Vite + TS), Node.js (Express + TS), Socket.io, MongoDB (Mongoose), Redis, Zod, bcrypt, simple-peer, JWT, Coturn example

## Features
- Register/Login with Zod validation (fullName, username, password)
- **JWT-based API auth** (Bearer token) **plus** Redis-backed sessions for multi-device/tab tracking
- Create/join 4-person max rooms
- WebRTC via simple-peer + Socket.io signaling
- **Auto-delete rooms** that stay empty for **30 minutes**
- **Two-tab/device detection**: Redis tracks active deviceIds per user; backend flags if user is already active elsewhere
- Docker Compose for MongoDB, Redis, Coturn
- Example Coturn config for production NAT traversal

## Quick Start
1. Install Node 18+, Docker, and pnpm (or npm).
2. `docker compose up -d` (starts Mongo, Redis, Coturn example)
3. Backend:
   ```bash
   cd backend
   cp .env.example .env
   pnpm install
   pnpm dev
   ```
4. Frontend:
   ```bash
   cd frontend
   cp .env.example .env
   pnpm install
   pnpm dev
   ```
5. Open `http://localhost:5173`

## ENV
See `.env.example` files in frontend and backend.
