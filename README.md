# Aincrad Grid: VR Group Chat

A futuristic, Sword-Art-Online-inspired real-time group chat app: text chat with
reactions/typing indicators, guild alliances, an inventory/quest system, HP/EXP
progression, and live voice & video "Tactical Chambers" powered by WebRTC.

## Stack

- **Frontend:** React 19 + Vite + Tailwind CSS, Socket.IO client, `motion`
- **Backend:** Express + Socket.IO server (TypeScript, run via `tsx`)
- **Data storage:** a small embedded JSON-file database (`data/db.json`) —
  no external database or account needed to run this locally.
- **Voice/Video:** native WebRTC (`getUserMedia` + `RTCPeerConnection` mesh),
  signaled through the existing Socket.IO connection. No third-party call
  service required.

## Run Locally

**Prerequisites:** Node.js 18+

1. Install dependencies:
   ```
   npm install
   ```
2. (Optional) Copy `.env.example` to `.env` and set a real `JWT_SECRET`.
   If you skip this, a development default is used — fine for local testing,
   not for production.
3. Run the app:
   ```
   npm run dev
   ```
4. Open the printed local URL. Register an account (or use "Enter as Guest
   Player"), then explore the Chat Floors, Guild Alliances, Inventory, Quest
   Board, and Voice Chambers from the menu.

Your account data, rooms, guilds, and messages are stored in `data/db.json`,
created automatically on first run. Delete that file to reset the world.

## Voice & Video Chambers

Joining a chamber under "Voice Chambers" asks your browser for microphone
(and, if available, camera) permission. Audio is on and camera is off by
default; toggle either with the buttons in the call HUD. Everyone in the same
chamber connects directly to each other (a WebRTC mesh), so it works best
with a handful of participants at once.

If you deny camera/microphone permission, you can still join a chamber in
listen-only mode.

## Building for Production

```
npm run build
npm start
```

This builds the client with Vite and bundles the server with esbuild into
`dist/server.cjs`.
