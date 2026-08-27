import "dotenv/config";
import { fileURLToPath } from "node:url";
import { createServer } from "node:http";
import {
  defineAgent,
  cli,
  WorkerOptions,
  type JobContext,
  stt as sttNamespace,
} from "@livekit/agents";
import * as deepgram from "@livekit/agents-plugin-deepgram";
import { AudioStream, RoomEvent, TrackKind } from "@livekit/rtc-node";

const { SpeechEventType } = sttNamespace;

const BACKEND_URL = process.env.BACKEND_URL;
const INTERNAL_SECRET = process.env.INTERNAL_CRON_SECRET;
const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;

if (!BACKEND_URL || !INTERNAL_SECRET || !DEEPGRAM_API_KEY) {
  throw new Error(
    "BACKEND_URL, INTERNAL_CRON_SECRET, and DEEPGRAM_API_KEY must all be set — see .env.example."
  );
}

interface TranscriptLine {
  speaker: string;
  text: string;
  startedAt: string;
  endedAt: string;
}

async function fetchDeepgramLanguage(appointmentId: string): Promise<string | null> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/internal/appointments/${appointmentId}/language`, {
      headers: { "x-internal-secret": INTERNAL_SECRET! },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { deepgramLanguageCode: string | null };
    return data.deepgramLanguageCode;
  } catch (err) {
    console.error(`[transcript-agent] Failed to fetch language for ${appointmentId}:`, err);
    return null;
  }
}

async function saveTranscript(appointmentId: string, transcript: TranscriptLine[]): Promise<void> {
  if (transcript.length === 0) return;
  try {
    const res = await fetch(`${BACKEND_URL}/api/internal/appointments/${appointmentId}/transcript`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-internal-secret": INTERNAL_SECRET! },
      body: JSON.stringify({ transcript }),
    });
    if (!res.ok) console.error(`[transcript-agent] Save failed for ${appointmentId}: HTTP ${res.status}`);
  } catch (err) {
    console.error(`[transcript-agent] Failed to save transcript for ${appointmentId}:`, err);
  }
}

export default defineAgent({
  entry: async (ctx: JobContext) => {
    await ctx.connect();
    const room = ctx.room;
    // The appointment id IS the room name — see `livekitRoom: ... ? id : null`
    // in backend/src/routes/appointments.ts.
    const appointmentId = room.name;
    if (!appointmentId) {
      console.error("[transcript-agent] Room has no name — cannot resolve appointment, skipping.");
      return;
    }

    const deepgramLanguageCode = await fetchDeepgramLanguage(appointmentId);
    console.log(
      `[transcript-agent] Joined room ${appointmentId} — STT language: ${deepgramLanguageCode ?? "auto-detect"}`
    );

    const transcript: TranscriptLine[] = [];

    room.on(
      RoomEvent.TrackSubscribed,
      (track, publication, participant) => {
        if (track.kind !== TrackKind.KIND_AUDIO) return;

        const deepgramSTT = new deepgram.STT({
          apiKey: DEEPGRAM_API_KEY,
          model: "nova-3",
          ...(deepgramLanguageCode
            ? { language: deepgramLanguageCode, detectLanguage: false }
            : { detectLanguage: true }),
          interimResults: true,
          smartFormat: true,
          punctuate: true,
        });

        const speechStream = deepgramSTT.stream();
        // AudioStream (from @livekit/rtc-node) and the ReadableStream type
        // updateInputStream expects (from node:stream/web) are the same Web
        // Streams API at runtime — this cast only works around a structural
        // mismatch between TypeScript's DOM lib types and Node's stream/web
        // types, both describing the same underlying interface.
        speechStream.updateInputStream(new AudioStream(track) as any);

        (async () => {
          try {
            for await (const event of speechStream) {
              if (event.type !== SpeechEventType.FINAL_TRANSCRIPT) continue;
              const alt = event.alternatives?.[0];
              if (!alt?.text?.trim()) continue;

              const now = new Date();
              const startedAt = new Date(now.getTime() - Math.max(alt.endTime - alt.startTime, 0) * 1000).toISOString();
              const endedAt = now.toISOString();

              transcript.push({
                speaker: participant.identity,
                text: alt.text.trim(),
                startedAt,
                endedAt,
              });

              // Live captions — same LiveKit transcription channel both the
              // doctor portal (livekit-client) and the mobile app
              // (@livekit/react-native) already know how to listen for.
              await room.localParticipant?.publishTranscription({
                participantIdentity: participant.identity,
                trackSid: publication.sid ?? "",
                segments: [
                  {
                    id: `${participant.identity}-${now.getTime()}`,
                    text: alt.text.trim(),
                    startTime: BigInt(Math.round(alt.startTime * 1000)),
                    endTime: BigInt(Math.round(alt.endTime * 1000)),
                    language: deepgramLanguageCode ?? alt.language ?? "",
                    final: true,
                  },
                ],
              });
            }
          } catch (err) {
            console.error(`[transcript-agent] STT stream error for ${participant.identity}:`, err);
          }
        })();
      }
    );

    room.on(RoomEvent.Disconnected, async () => {
      console.log(`[transcript-agent] Room ${appointmentId} ended — saving ${transcript.length} line(s).`);
      await saveTranscript(appointmentId, transcript);
    });
  },
});

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  // This worker does its real work by holding a persistent connection to
  // LiveKit (job dispatch), not by serving HTTP requests — but Cloud Run
  // (and most container platforms) only consider a container "healthy" if
  // it answers on $PORT. This listener exists purely to satisfy that health
  // check; it has nothing to do with the actual transcript pipeline above.
  const port = process.env.PORT || 8080;
  createServer((_req, res) => {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("transcript-agent OK");
  }).listen(port, () => {
    console.log(`[transcript-agent] Health check server listening on :${port}`);
  });

  cli.runApp(
    new WorkerOptions({
      agent: import.meta.filename,
      wsURL: process.env.LIVEKIT_WS_URL,
      apiKey: process.env.LIVEKIT_API_KEY,
      apiSecret: process.env.LIVEKIT_API_SECRET,
    })
  );
}
