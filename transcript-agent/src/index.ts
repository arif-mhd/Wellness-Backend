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
import {
  AudioStream,
  RoomEvent,
  TrackKind,
  type RemoteTrack,
  type RemoteTrackPublication,
  type RemoteParticipant,
  type TranscriptionSegment,
} from "@livekit/rtc-node";

const { SpeechEventType } = sttNamespace;

const BACKEND_URL = process.env.BACKEND_URL;
const INTERNAL_SECRET = process.env.INTERNAL_CRON_SECRET;
const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;
const GOOGLE_TRANSLATE_API_KEY = process.env.GOOGLE_TRANSLATE_API_KEY;

if (!BACKEND_URL || !INTERNAL_SECRET || !DEEPGRAM_API_KEY || !GOOGLE_TRANSLATE_API_KEY) {
  throw new Error(
    "BACKEND_URL, INTERNAL_CRON_SECRET, DEEPGRAM_API_KEY, and GOOGLE_TRANSLATE_API_KEY must all be set — see .env.example."
  );
}

// Cloud Translation API v2 target-language codes for every name
// backend/src/utils/languages.ts's SUPPORTED_LANGUAGES offers in the
// doctor/patient language pickers. Kept separate from that file's own
// bcp47/deepgramCode columns because Translate doesn't always agree with
// them (e.g. Chinese is "zh" here, not that list's ISO-639-3 "cmn"). If a
// new language is ever added to that picker, add its Translate code here
// too, or its speech will simply never appear translated for the other
// side (translateText below fails closed, not with a thrown error).
const TRANSLATE_LANGUAGE_CODES: Record<string, string> = {
  Arabic: "ar",
  English: "en",
  Hindi: "hi",
  Urdu: "ur",
  Malayalam: "ml",
  Tamil: "ta",
  Tagalog: "fil",
  Bengali: "bn",
  Punjabi: "pa",
  Sinhalese: "si",
  Nepali: "ne",
  French: "fr",
  German: "de",
  Spanish: "es",
  Chinese: "zh",
  Japanese: "ja",
  Korean: "ko",
  Russian: "ru",
  Persian: "fa",
  Turkish: "tr",
  Amharic: "am",
};

// Translates into targetLanguageName (a SUPPORTED_LANGUAGES display name,
// e.g. "Hindi") using Cloud Translation's Basic/v2 API — plain API-key
// auth, source language auto-detected. Returns null on any failure so
// callers can just skip publishing a translated segment rather than
// surfacing an error into the live call.
async function translateText(text: string, targetLanguageName: string): Promise<string | null> {
  const targetCode = TRANSLATE_LANGUAGE_CODES[targetLanguageName];
  if (!targetCode) {
    console.error(`[transcript-agent] No Translate code mapped for language "${targetLanguageName}"`);
    return null;
  }
  try {
    const res = await fetch(
      `https://translation.googleapis.com/language/translate/v2?key=${GOOGLE_TRANSLATE_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ q: text, target: targetCode, format: "text" }),
      }
    );
    if (!res.ok) {
      console.error(`[transcript-agent] Translation HTTP ${res.status} for target=${targetCode}`);
      return null;
    }
    const data = (await res.json()) as { data?: { translations?: { translatedText: string }[] } };
    return data.data?.translations?.[0]?.translatedText?.trim() || null;
  } catch (err) {
    console.error(`[transcript-agent] Translation request failed for target=${targetCode}:`, err);
    return null;
  }
}

interface TranscriptLine {
  speaker: string;
  text: string;
  startedAt: string;
  endedAt: string;
}

interface CallLanguages {
  doctorId: string | null;
  patientId: string | null;
  doctorDeepgramLanguageCode: string | null;
  patientDeepgramLanguageCode: string | null;
  // Display names (e.g. "English", "Hindi") — same values as
  // doctor*/patient*DeepgramLanguageCode were derived from, but kept as
  // names rather than STT codes because that's what TRANSLATE_LANGUAGE_CODES
  // (and Cloud Translation) key off. Used only to decide/target translation,
  // never for STT.
  doctorLanguageName: string | null;
  patientLanguageName: string | null;
}

const NO_LANGUAGES: CallLanguages = {
  doctorId: null,
  patientId: null,
  doctorDeepgramLanguageCode: null,
  patientDeepgramLanguageCode: null,
  doctorLanguageName: null,
  patientLanguageName: null,
};

async function fetchLanguages(appointmentId: string): Promise<CallLanguages> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/internal/appointments/${appointmentId}/language`, {
      headers: { "x-internal-secret": INTERNAL_SECRET! },
    });
    if (!res.ok) return NO_LANGUAGES;
    const data = (await res.json()) as {
      doctorId: string | null;
      patientId: string | null;
      consultationLanguage: string | null;
      doctorDeepgramLanguageCode: string | null;
      patientLanguage: string | null;
      patientDeepgramLanguageCode: string | null;
    };
    return {
      doctorId: data.doctorId ?? null,
      patientId: data.patientId ?? null,
      doctorDeepgramLanguageCode: data.doctorDeepgramLanguageCode ?? null,
      patientDeepgramLanguageCode: data.patientDeepgramLanguageCode ?? null,
      doctorLanguageName: data.consultationLanguage ?? null,
      patientLanguageName: data.patientLanguage ?? null,
    };
  } catch (err) {
    console.error(`[transcript-agent] Failed to fetch languages for ${appointmentId}:`, err);
    return NO_LANGUAGES;
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

    // Whichever side joined the room before this agent did (almost always
    // the doctor — they start the call and wait for the patient to pick up)
    // gets auto-subscribed the instant ctx.connect() resolves above, which
    // fires TrackSubscribed immediately. That event is not replayed for
    // listeners added later, so awaiting fetchLanguages() before registering
    // the listener (as this used to do) silently dropped whichever track got
    // subscribed during that gap — that participant's audio was never
    // transcribed for the rest of the call, while a participant who joined
    // after the listener was attached (typically the patient) worked fine.
    // Kick the fetch off without blocking, and register the listener on the
    // very next line so nothing can be missed.
    const languagesPromise = fetchLanguages(appointmentId);
    languagesPromise.then(
      ({ doctorId, patientId, doctorDeepgramLanguageCode, patientDeepgramLanguageCode, doctorLanguageName, patientLanguageName }) => {
        console.log(
          `[transcript-agent] Joined room ${appointmentId} — doctorId=${doctorId} (STT ${doctorDeepgramLanguageCode ?? "auto-detect"}, speaks ${doctorLanguageName ?? "unknown"}), patientId=${patientId} (STT ${patientDeepgramLanguageCode ?? "auto-detect"}, speaks ${patientLanguageName ?? "unknown"})`
        );
      }
    );

    const transcript: TranscriptLine[] = [];

    async function startTranscription(
      track: RemoteTrack,
      publication: RemoteTrackPublication,
      participant: RemoteParticipant
    ) {
      const {
        doctorId,
        patientId,
        doctorDeepgramLanguageCode,
        patientDeepgramLanguageCode,
        doctorLanguageName,
        patientLanguageName,
      } = await languagesPromise;

      // Each side of the call speaks their own language regardless of what
      // the other was asked to speak — the doctor's audio must be decoded
      // with the language they were booked to speak, the patient's (or
      // family member's) with their own profile language, not each other's.
      const speakerLanguageCode =
        participant.identity === doctorId ? doctorDeepgramLanguageCode
        : participant.identity === patientId ? patientDeepgramLanguageCode
        : null;

      console.log(
        `[transcript-agent] Starting STT for identity=${participant.identity} — language=${speakerLanguageCode ?? "auto-detect"}`
      );

      const deepgramSTT = new deepgram.STT({
        apiKey: DEEPGRAM_API_KEY,
        model: "nova-3",
        ...(speakerLanguageCode
          ? { language: speakerLanguageCode, detectLanguage: false }
          : { detectLanguage: true }),
        interimResults: true,
        smartFormat: true,
        punctuate: true,
        // Deepgram's default 25ms endpointing fires FINAL_TRANSCRIPT on every
        // brief pause (a breath, a comma) — great for low-latency partials,
        // wrong as a caption boundary. utteranceEndMs asks Deepgram to also
        // emit a real end-of-turn signal (surfaced by this plugin as
        // END_OF_SPEECH) once genuine silence follows, which is what the loop
        // below waits for before treating an utterance as finished.
        utteranceEndMs: 1000,
      });

      const speechStream = deepgramSTT.stream();
      // AudioStream (from @livekit/rtc-node) and the ReadableStream type
      // updateInputStream expects (from node:stream/web) are the same Web
      // Streams API at runtime — this cast only works around a structural
      // mismatch between TypeScript's DOM lib types and Node's stream/web
      // types, both describing the same underlying interface.
      speechStream.updateInputStream(new AudioStream(track) as any);

      console.log(`[transcript-agent] STT stream opened for identity=${participant.identity}`);
      let sawFirstEvent = false;

      // Deepgram (via this plugin) fires FINAL_TRANSCRIPT once per short
      // endpointing gap — several times within a single spoken sentence, not
      // once per sentence — and reserves END_OF_SPEECH (speech_final /
      // UtteranceEnd, enabled by utteranceEndMs above) for when the speaker
      // actually stops. So chunks are accumulated into one growing utterance
      // under a single segment id (republished as it grows — the client
      // upserts by id in place rather than adding a new bubble) and only
      // committed to the transcript / handed to translation once END_OF_SPEECH
      // confirms the sentence is actually finished.
      let utteranceId: string | null = null;
      let utteranceText = "";
      let utteranceStartSec = 0;
      let utteranceEndSec = 0;

      // Ambient noise picked up during silence (the base SDK's own energy
      // gate lets modest room noise through, not just true silence) tends to
      // produce short, low-confidence "words" rather than being rejected
      // outright — Deepgram still scores its own uncertainty per result, so
      // filtering on that catches what the energy gate doesn't.
      const MIN_CONFIDENCE = 0.5;

      try {
        for await (const event of speechStream) {
          if (!sawFirstEvent) {
            sawFirstEvent = true;
            console.log(`[transcript-agent] First STT event for identity=${participant.identity}: ${event.type}`);
          }

          if (event.type === SpeechEventType.FINAL_TRANSCRIPT) {
            const alt = event.alternatives?.[0];
            if (!alt) continue;
            const chunkText = alt.text?.trim();
            if (!chunkText) continue;
            if (typeof alt.confidence === "number" && alt.confidence < MIN_CONFIDENCE) continue;

            if (!utteranceId) {
              utteranceId = `${participant.identity}-${Date.now()}`;
              utteranceStartSec = alt.startTime;
            }
            utteranceText = utteranceText ? `${utteranceText} ${chunkText}` : chunkText;
            utteranceEndSec = alt.endTime;

            await room.localParticipant?.publishTranscription({
              participantIdentity: participant.identity,
              trackSid: publication.sid ?? "",
              segments: [
                {
                  id: utteranceId,
                  text: utteranceText,
                  startTime: BigInt(Math.round(utteranceStartSec * 1000)),
                  endTime: BigInt(Math.round(utteranceEndSec * 1000)),
                  language: speakerLanguageCode ?? alt.language ?? "",
                  final: true,
                },
              ],
            });
            continue;
          }

          if (event.type !== SpeechEventType.END_OF_SPEECH) continue;
          if (!utteranceId || !utteranceText) {
            utteranceId = null;
            utteranceText = "";
            continue;
          }

          const finishedId = utteranceId;
          const text = utteranceText;
          utteranceId = null;
          utteranceText = "";

          const now = new Date();
          const startedAt = new Date(now.getTime() - Math.max(utteranceEndSec - utteranceStartSec, 0) * 1000).toISOString();
          const endedAt = now.toISOString();
          transcript.push({ speaker: participant.identity, text, startedAt, endedAt });

          const originalSegment: TranscriptionSegment = {
            id: finishedId,
            text,
            startTime: BigInt(Math.round(utteranceStartSec * 1000)),
            endTime: BigInt(Math.round(utteranceEndSec * 1000)),
            language: speakerLanguageCode ?? "",
            final: true,
          };

          // Translate for the other side of the doctor<->patient pair only (a
          // third participant, e.g. an added specialist, gets no translation —
          // targetLanguageName stays null for them) and republish the same
          // segment id plus a translated one once/if it resolves. Fired
          // without awaiting so a slow translation can't delay the next
          // utterance from being processed.
          const targetLanguageName =
            participant.identity === doctorId ? patientLanguageName
            : participant.identity === patientId ? doctorLanguageName
            : null;
          const speakerLanguageName =
            participant.identity === doctorId ? doctorLanguageName
            : participant.identity === patientId ? patientLanguageName
            : null;

          if (targetLanguageName && targetLanguageName.toLowerCase() !== speakerLanguageName?.toLowerCase()) {
            translateText(text, targetLanguageName)
              .then(async (translated) => {
                if (!translated) return;
                await room.localParticipant?.publishTranscription({
                  participantIdentity: participant.identity,
                  trackSid: publication.sid ?? "",
                  segments: [
                    originalSegment,
                    {
                      id: `${finishedId}-translated`,
                      text: translated,
                      startTime: originalSegment.startTime,
                      endTime: originalSegment.endTime,
                      language: TRANSLATE_LANGUAGE_CODES[targetLanguageName] ?? "",
                      final: true,
                    },
                  ],
                });
              })
              .catch((err) => {
                console.error(`[transcript-agent] Translation publish failed for ${participant.identity}:`, err);
              });
          }
        }
      } catch (err) {
        console.error(`[transcript-agent] STT stream error for ${participant.identity}:`, err);
      }
    }

    room.on(
      RoomEvent.TrackSubscribed,
      (track, publication, participant) => {
        console.log(
          `[transcript-agent] TrackSubscribed: identity=${participant.identity} kind=${track.kind} source=${publication.source}`
        );
        if (track.kind !== TrackKind.KIND_AUDIO) return;
        startTranscription(track, publication, participant);
      }
    );

    room.on(RoomEvent.ParticipantConnected, (participant) => {
      console.log(`[transcript-agent] Participant connected: identity=${participant.identity} name=${participant.name}`);
    });
    // Back-fill anyone already subscribed before the listener above was
    // registered — see the race explained at languagesPromise above. This
    // runs synchronously right after room.on(TrackSubscribed) with no
    // intervening `await`, so no subscription happening in between can be
    // missed by both.
    for (const participant of room.remoteParticipants.values()) {
      console.log(`[transcript-agent] Already-present participant: identity=${participant.identity} name=${participant.name}`);
      for (const publication of participant.trackPublications.values()) {
        if (!publication.track) continue;
        console.log(
          `[transcript-agent] Already-subscribed track found for identity=${participant.identity} kind=${publication.track.kind}`
        );
        if (publication.track.kind === TrackKind.KIND_AUDIO) {
          startTranscription(publication.track as RemoteTrack, publication, participant);
        }
      }
    }

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
