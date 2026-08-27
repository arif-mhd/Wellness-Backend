# Live Transcript Agent

A LiveKit Agents worker that joins every video consultation as a silent
participant, transcribes both sides of the call in real time via Deepgram,
publishes live captions back into the room (both the doctor portal and the
mobile app already know how to display these — same `RoomEvent.Transcription`
LiveKit's client SDKs use for any transcription), and saves the finished
transcript onto the appointment record when the call ends.

## Why Deepgram, not Google

The long-term plan is Google Cloud Speech-to-Text — it's the only vendor of
the two that supports every language the app does, including Malayalam.
Deepgram was chosen first to get the pipeline itself proven out, because
LiveKit's Node.js Agents SDK doesn't have a ready-made Google STT plugin yet
(only Gemini LLM support) — using Google would mean hand-writing the
audio-track-to-Google-streamingRecognize integration from scratch. Swapping
the STT vendor later only touches this one file (`src/index.ts`'s
`deepgram.STT` construction) — nothing in the backend, mobile app, or doctor
portal needs to change, since they all just listen for LiveKit's standard
transcription events regardless of which vendor produced them.

Malayalam has no Deepgram language code at all right now, so a Malayalam
consultation will fall back to Deepgram's language auto-detection rather than
being explicitly targeted — expect lower accuracy there until the Google
swap happens.

## Setup

1. Copy `.env.example` to `.env` and fill in:
   - `LIVEKIT_WS_URL` / `LIVEKIT_API_KEY` / `LIVEKIT_API_SECRET` — the same
     values the backend already uses (`backend/.env`).
   - `DEEPGRAM_API_KEY` — from console.deepgram.com.
   - `BACKEND_URL` — the main backend's base URL.
   - `INTERNAL_CRON_SECRET` — must match the backend's own `INTERNAL_CRON_SECRET`
     exactly (same shared-secret pattern already used by the
     appointment-reminders sweep cron).
2. `npm install`
3. `npm run dev` — runs in LiveKit's dev mode (connects to your LiveKit
   project and waits for a room to join). Check the actual subcommand names
   LiveKit's CLI expects (`node dist/index.js --help` after `npm run build`)
   before relying on `dev`/`start` in package.json — those are the
   conventional names but weren't independently confirmed against this
   exact SDK version's CLI parser.

## Deploying

This needs an **always-on process**, not a scale-to-zero one — it holds a
persistent connection to LiveKit to receive job dispatch. Cloud Run with
`min-instances: 1` works, or run it alongside wherever SuperTokens Core is
already hosted as a persistent service.

## What it does NOT do yet

- No consent UI/notice before a call starts — that's a product decision
  (wording, where it's shown) still to be made on the client side.
- No handling for a dropped connection mid-call beyond whatever LiveKit's own
  reconnect logic does — a real gap in the transcript from a network blip
  isn't specially flagged.
- Live captions render wherever a client chooses to listen for
  `RoomEvent.Transcription` — neither the doctor portal nor the mobile app
  has that UI built yet. This worker only produces and publishes the
  captions; nothing subscribes to them on either client yet.
