"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Session from "supertokens-web-js/recipe/session";
import {
  Room, RoomEvent, Track,
  RemoteTrack, RemoteTrackPublication, RemoteParticipant,
  LocalTrackPublication,
} from "livekit-client";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

function fmt(d: Date) {
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

interface ChatMsg  { id: string; sender: "you" | "patient"; text: string; time: string; }
interface Medicine { id: string; name: string; notes: string; }
interface Lab      { id: string; name: string; }
type Panel = "chat" | "emr" | "specialist";

interface AvailableDoctor {
  id: string;
  fullName: string;
  specialty: string;
  avatarUrl: string | null;
  email: string;
  fees: string | null;
  rating: number;
}

function ConsultRoom() {
  const searchParams  = useSearchParams();
  const router        = useRouter();
  const appointmentId = searchParams.get("appointmentId") ?? "";
  const patientName   = searchParams.get("patientName")   ?? "Patient";
  const patientInitials = patientName.split(" ").map((w: string) => w[0]).join("").slice(0,2).toUpperCase();

  const [connected, setConnected] = useState(false);
  const [ended,     setEnded]     = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const [micOn,     setMicOn]     = useState(true);
  const [camOn,     setCamOn]     = useState(true);
  const [timer,     setTimer]     = useState(0);
  const [panel,     setPanel]     = useState<Panel>("chat");
  const [unread,    setUnread]    = useState(0);

  const [messages,  setMessages]  = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [notes,     setNotes]     = useState("");
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [labs,      setLabs]      = useState<Lab[]>([]);
  const [savingEmr, setSavingEmr] = useState(false);
  const [emrSaved,  setEmrSaved]  = useState(false);

  // Specialist invite state
  const [availableDoctors,   setAvailableDoctors]   = useState<AvailableDoctor[]>([]);
  const [doctorsLoading,     setDoctorsLoading]     = useState(false);
  const [specialistSearch,   setSpecialistSearch]   = useState("");
  const [selectedSpecialist, setSelectedSpecialist] = useState<AvailableDoctor | null>(null);
  const [inviteStatus,       setInviteStatus]       = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [inviteError,        setInviteError]        = useState("");

  const roomRef       = useRef<Room | null>(null);
  const remoteVideoEl = useRef<HTMLVideoElement>(null);
  const localVideoEl  = useRef<HTMLVideoElement>(null);
  const didConnectRef = useRef(false);
  const tokenRef      = useRef("");

  // Timer
  useEffect(() => {
    if (!connected) return;
    const id = setInterval(() => setTimer(t => t + 1), 1000);
    return () => clearInterval(id);
  }, [connected]);
  const timerStr = `${String(Math.floor(timer / 60)).padStart(2,"0")}:${String(timer % 60).padStart(2,"0")}`;

  // Scroll chat
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => { if (panel === "chat") setUnread(0); }, [panel]);

  // LiveKit connect
  useEffect(() => {
    // Guard against React StrictMode double-invoke: if a room is already
    // connected or connecting, don't create a second one.
    if (roomRef.current) return;

    const room = new Room();
    roomRef.current = room;
    let cancelled = false;

    function attachRemoteTrack(track: RemoteTrack) {
      if (track.kind === Track.Kind.Video && remoteVideoEl.current) track.attach(remoteVideoEl.current);
      if (track.kind === Track.Kind.Audio) track.attach();
    }

    room.on(RoomEvent.ParticipantConnected, () => {
      if (!cancelled) setConnected(true);
    });
    room.on(RoomEvent.ParticipantDisconnected, () => {
      if (!cancelled) {
        setConnected(false);
        if (remoteVideoEl.current) remoteVideoEl.current.srcObject = null;
      }
    });
    room.on(RoomEvent.TrackSubscribed, (track: RemoteTrack, _p: RemoteTrackPublication, _r: RemoteParticipant) => {
      if (!cancelled) attachRemoteTrack(track);
    });
    room.on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack) => {
      track.detach();
      if (track.kind === Track.Kind.Video && remoteVideoEl.current) remoteVideoEl.current.srcObject = null;
    });
    // Attach local camera as soon as it is published (more reliable than getTrackPublication after enable)
    room.on(RoomEvent.LocalTrackPublished, (pub: LocalTrackPublication) => {
      if (pub.source === Track.Source.Camera && pub.track && localVideoEl.current) {
        pub.track.attach(localVideoEl.current);
      }
    });
    room.on(RoomEvent.DataReceived, (payload: Uint8Array) => {
      if (cancelled) return;
      try {
        const data = JSON.parse(new TextDecoder().decode(payload));
        if (data.type === "chat") {
          setMessages(prev => [...prev, { id: `${Date.now()}${Math.random()}`, sender: "patient", text: data.text, time: fmt(new Date()) }]);
          setUnread(u => u + 1);
        }
      } catch {}
    });
    room.on(RoomEvent.Disconnected, () => {
      if (cancelled) return;
      if (didConnectRef.current) setEnded(true);
      else setError("Could not connect to the call. Please try again.");
    });

    async function init() {
      if (!appointmentId) { setError("Missing appointment ID"); return; }
      try {
        const token = await Session.getAccessToken();
        if (cancelled) return;
        tokenRef.current = token ?? "";
        const res = await fetch(`${API_URL}/api/appointments/${appointmentId}/livekit-token`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) { setError("Could not get call token"); return; }
        const { token: lkToken, wsUrl } = await res.json();
        if (cancelled) return;

        await room.connect(wsUrl, lkToken, { autoSubscribe: true });
        if (cancelled) { room.disconnect(); return; }
        didConnectRef.current = true;

        // If patient is already in the room, attach their existing tracks
        room.remoteParticipants.forEach(participant => {
          setConnected(true);
          participant.trackPublications.forEach(pub => {
            if (pub.isSubscribed && pub.track) attachRemoteTrack(pub.track as RemoteTrack);
          });
        });

        await room.localParticipant.setCameraEnabled(true);
        await room.localParticipant.setMicrophoneEnabled(true);

        fetch(`${API_URL}/api/appointments/${appointmentId}/status`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ status: "in_progress" }),
        }).catch(() => {});
      } catch (e: any) {
        if (!cancelled) setError(`Connection error: ${e?.message}`);
      }
    }

    init();

    return () => {
      cancelled = true;
      // Only disconnect if we actually connected — avoids killing the room
      // during React StrictMode's cleanup of the first (no-op) mount.
      if (didConnectRef.current) {
        room.disconnect();
      }
      roomRef.current = null;
    };
  }, [appointmentId]);

  const disconnect = useCallback(async () => {
    await roomRef.current?.disconnect();
    fetch(`${API_URL}/api/appointments/${appointmentId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokenRef.current}` },
      body: JSON.stringify({ status: "completed" }),
    }).catch(() => {});
    setEnded(true);
  }, [appointmentId]);

  const sendChat = useCallback(async () => {
    const text = chatInput.trim();
    if (!text || !roomRef.current) return;
    await roomRef.current.localParticipant.publishData(
      new TextEncoder().encode(JSON.stringify({ type: "chat", senderName: "Doctor", text })),
      { reliable: true }
    );
    setMessages(prev => [...prev, { id: `${Date.now()}${Math.random()}`, sender: "you", text, time: fmt(new Date()) }]);
    setChatInput("");
  }, [chatInput]);

  const toggleMic = async () => { await roomRef.current?.localParticipant.setMicrophoneEnabled(!micOn); setMicOn(v => !v); };
  const toggleCam = async () => { await roomRef.current?.localParticipant.setCameraEnabled(!camOn);   setCamOn(v => !v); };

  const fetchAvailableDoctors = useCallback(async () => {
    if (!appointmentId) return;
    setDoctorsLoading(true);
    try {
      const token = await Session.getAccessToken();
      const res = await fetch(`${API_URL}/api/appointments/${appointmentId}/available-doctors`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const { doctors: list } = await res.json();
        setAvailableDoctors(list ?? []);
      }
    } catch {}
    finally { setDoctorsLoading(false); }
  }, [appointmentId]);

  // Load doctors when switching to specialist panel
  useEffect(() => {
    if (panel === "specialist" && availableDoctors.length === 0) fetchAvailableDoctors();
  }, [panel, availableDoctors.length, fetchAvailableDoctors]);

  const sendInvite = async (doctor: AvailableDoctor) => {
    if (!appointmentId) return;
    setSelectedSpecialist(doctor);
    setInviteStatus("sending");
    setInviteError("");
    try {
      const token = await Session.getAccessToken();
      const res = await fetch(`${API_URL}/api/appointments/${appointmentId}/invite-specialist`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ specialistDoctorId: doctor.id }),
      });
      if (res.ok) {
        setInviteStatus("sent");
      } else {
        const body = await res.json().catch(() => ({}));
        setInviteError(body.error ?? "Failed to send invite");
        setInviteStatus("error");
      }
    } catch {
      setInviteError("Network error. Please try again.");
      setInviteStatus("error");
    }
  };

  const saveEmr = async () => {
    setSavingEmr(true);
    try {
      await fetch(`${API_URL}/api/appointments/${appointmentId}/emr`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokenRef.current}` },
        body: JSON.stringify({ notes, medicines, labs }),
      });
      setEmrSaved(true);
      setTimeout(() => setEmrSaved(false), 2500);
    } catch {} finally { setSavingEmr(false); }
  };

  if (ended) return (
    <div className="flex flex-col items-center justify-center h-[calc(100vh-96px)] gap-4 bg-[#f7f9fc]">
      <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center text-2xl">✓</div>
      <h2 className="text-[#24292e] text-xl font-semibold">Call Ended</h2>
      <p className="text-[#676e76] text-sm">Duration: {timerStr}</p>
      <button onClick={() => router.push("/appointments")}
        className="px-6 py-2.5 bg-[#5476fc] text-white text-sm font-medium rounded-xl hover:bg-[#4466ec]">
        Back to Appointments
      </button>
    </div>
  );

  const dateStr = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) +
    " " + new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });

  return (
    <div className="flex flex-col bg-white" style={{ height: "calc(100vh - 96px)" }}>

      {/* ── Top call bar ── */}
      <div className="flex items-center gap-4 px-5 py-2.5 bg-white border-b border-gray-200 flex-shrink-0">
        {/* Timer + patient info */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${connected ? "bg-red-500 animate-pulse" : "bg-yellow-400"}`} />
            <span className="text-[#24292e] font-mono text-sm font-semibold">{timerStr}</span>
          </div>
          <span className="text-gray-300">|</span>
          <div>
            <p className="text-[#24292e] text-xs font-semibold leading-none">[Internal] Calling · {patientName}</p>
            <p className="text-gray-400 text-[10px] mt-0.5">{dateStr}</p>
          </div>
        </div>

        {/* Controls */}
        <div className="ml-auto flex items-center gap-2">
          <button onClick={toggleMic}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${micOn ? "bg-gray-100 text-gray-600 hover:bg-gray-200" : "bg-red-50 text-red-500"}`}
            title={micOn ? "Mute" : "Unmute"}>
            <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              {micOn
                ? <><path strokeLinecap="round" strokeLinejoin="round" d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path strokeLinecap="round" strokeLinejoin="round" d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8"/></>
                : <><line x1="1" y1="1" x2="23" y2="23"/><path strokeLinecap="round" strokeLinejoin="round" d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/><path strokeLinecap="round" strokeLinejoin="round" d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23M12 19v4M8 23h8"/></>
              }
            </svg>
          </button>
          <button onClick={toggleCam}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${camOn ? "bg-gray-100 text-gray-600 hover:bg-gray-200" : "bg-red-50 text-red-500"}`}
            title={camOn ? "Stop camera" : "Start camera"}>
            <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              {camOn
                ? <><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></>
                : <><line x1="1" y1="1" x2="23" y2="23"/><path d="M21 21H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3m3-3h6l2 3h4a2 2 0 0 1 2 2v9.34m-7.72-2.06A4 4 0 1 1 7.88 8.88"/></>
              }
            </svg>
          </button>
          <button onClick={disconnect}
            className="flex items-center gap-2 h-8 px-4 bg-[#e84949] text-white text-xs font-semibold rounded-lg hover:bg-[#d43f3f] transition-colors">
            Disconnect
          </button>
        </div>
      </div>

      {/* ── Body: left panel + video ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left panel */}
        <aside className="w-[300px] flex-shrink-0 bg-white flex flex-col border-r border-gray-200">

          {/* Tabs */}
          <div className="flex border-b border-gray-200">
            {(["chat","emr","specialist"] as Panel[]).map(t => (
              <button key={t} onClick={() => setPanel(t)}
                className={`flex-1 py-2.5 text-[11px] font-semibold uppercase tracking-wide relative transition-colors ${panel === t ? "text-[#5476fc] border-b-2 border-[#5476fc]" : "text-gray-400 hover:text-gray-600"}`}>
                {t === "specialist" ? "Add Specialist" : t}
                {t === "chat" && unread > 0 && (
                  <span className="absolute top-1.5 right-2 min-w-[16px] h-4 rounded-full bg-[#e84949] text-[9px] text-white flex items-center justify-center px-1">{unread}</span>
                )}
              </button>
            ))}
          </div>

          {/* ── CHAT ── */}
          {panel === "chat" && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
                {messages.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center py-16 text-center">
                    <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" className="text-gray-300 mb-3"><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
                    <p className="text-gray-400 text-xs font-medium">No messages yet</p>
                    <p className="text-gray-300 text-[10px] mt-1">Chat with your patient during the call</p>
                  </div>
                ) : messages.map(m => (
                  <div key={m.id} className={`flex items-start gap-2.5 ${m.sender === "you" ? "flex-row-reverse" : ""}`}>
                    <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold ${m.sender === "you" ? "bg-[#5476fc]/20 text-[#5476fc]" : "bg-gray-100 text-gray-500"}`}>
                      {m.sender === "you" ? "Dr" : patientInitials}
                    </div>
                    <div className={`max-w-[76%] px-3 py-2 rounded-2xl text-xs leading-relaxed ${m.sender === "you" ? "bg-[#5476fc] text-white rounded-tr-none" : "bg-gray-100 text-gray-700 rounded-tl-none"}`}>
                      {m.sender !== "you" && <p className="text-[9px] font-semibold text-[#5476fc] mb-1">{patientName}</p>}
                      <p>{m.text}</p>
                      <p className="text-[9px] opacity-50 mt-0.5 text-right">{m.time}</p>
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
              <div className="p-3 border-t border-gray-200 flex gap-2 items-center">
                <button className="text-gray-400 hover:text-gray-600 flex-shrink-0">
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/></svg>
                </button>
                <input value={chatInput} onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChat(); } }}
                  placeholder="Type Something..."
                  className="flex-1 bg-transparent text-xs text-gray-700 placeholder-gray-300 outline-none"
                />
                <button onClick={sendChat} disabled={!chatInput.trim()}
                  className="w-7 h-7 rounded-full bg-[#5476fc] flex items-center justify-center disabled:opacity-30 hover:bg-[#4466ec] transition-colors flex-shrink-0">
                  <svg width="12" height="12" fill="none" viewBox="0 0 24 24"><path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
              </div>
            </div>
          )}

          {/* ── EMR ── */}
          {panel === "emr" && (
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
              <button className="flex items-center gap-1 text-[#5476fc] text-xs font-semibold hover:underline w-fit">
                View Detailed EHR →
              </button>

              <div>
                <p className="text-gray-800 text-xs font-semibold mb-1">Make Plan</p>
                <p className="text-gray-400 text-[10px] mb-2 leading-relaxed">Documentation used by providers to input notes into patients&apos; medical records.</p>
                <p className="text-gray-400 text-[10px] mb-1.5">Write note/Add to EMR here...</p>
                <textarea value={notes} onChange={e => setNotes(e.target.value)}
                  placeholder="Subjective..."
                  rows={4}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs text-gray-700 placeholder-gray-300 outline-none focus:border-[#5476fc]/50 resize-none"
                />
              </div>

              {/* Medicines */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-gray-700 text-xs font-semibold">Add Medicines</p>
                  <button onClick={() => setMedicines(p => [...p, { id: `${Date.now()}`, name: "", notes: "" }])}
                    className="w-5 h-5 rounded-full bg-[#5476fc]/10 text-[#5476fc] flex items-center justify-center hover:bg-[#5476fc]/20 text-sm leading-none">+</button>
                </div>
                <div className="flex flex-col gap-2">
                  {medicines.map(m => (
                    <div key={m.id} className="bg-gray-50 border border-gray-200 rounded-xl p-2.5">
                      <div className="flex items-start gap-2">
                        <div className="flex-1">
                          <input value={m.name} onChange={e => setMedicines(p => p.map(x => x.id===m.id ? {...x, name: e.target.value} : x))}
                            placeholder="Medicine name + dosage"
                            className="w-full bg-transparent text-[11px] text-gray-700 placeholder-gray-300 outline-none font-medium mb-1"
                          />
                          <input value={m.notes} onChange={e => setMedicines(p => p.map(x => x.id===m.id ? {...x, notes: e.target.value} : x))}
                            placeholder="Notes: e.g. After breakfast every morning"
                            className="w-full bg-transparent text-[10px] text-gray-400 placeholder-gray-300 outline-none"
                          />
                        </div>
                        <button onClick={() => setMedicines(p => p.filter(x => x.id!==m.id))}
                          className="text-gray-300 hover:text-red-400 text-sm leading-none mt-0.5">✕</button>
                      </div>
                    </div>
                  ))}
                  {medicines.length === 0 && <p className="text-gray-300 text-[11px]">No medicines added yet</p>}
                </div>
              </div>

              {/* Labs */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-gray-700 text-xs font-semibold">Add Recommended Labs</p>
                  <button onClick={() => setLabs(p => [...p, { id: `${Date.now()}`, name: "" }])}
                    className="w-5 h-5 rounded-full bg-[#5476fc]/10 text-[#5476fc] flex items-center justify-center hover:bg-[#5476fc]/20 text-sm leading-none">+</button>
                </div>
                <div className="flex flex-col gap-1.5">
                  {labs.map(l => (
                    <div key={l.id} className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
                      <span className="text-[#5476fc] text-xs flex-shrink-0">🧪</span>
                      <input value={l.name} onChange={e => setLabs(p => p.map(x => x.id===l.id ? {...x, name: e.target.value} : x))}
                        placeholder="Lab test name"
                        className="flex-1 bg-transparent text-[11px] text-gray-600 placeholder-gray-300 outline-none"
                      />
                      <button onClick={() => setLabs(p => p.filter(x => x.id!==l.id))}
                        className="text-gray-300 hover:text-red-400 text-xs">✕</button>
                    </div>
                  ))}
                  {labs.length === 0 && <p className="text-gray-300 text-[11px]">No labs added yet</p>}
                </div>
              </div>

              <div className="flex gap-2 mt-auto pt-2 sticky bottom-0 bg-white">
                <button className="flex-1 py-2 border border-gray-200 text-gray-400 text-xs font-semibold rounded-xl hover:bg-gray-50 transition-colors">Cancel</button>
                <button onClick={saveEmr} disabled={savingEmr}
                  className={`flex-1 py-2 text-white text-xs font-semibold rounded-xl transition-colors ${emrSaved ? "bg-green-500" : "bg-[#5476fc] hover:bg-[#4466ec]"}`}>
                  {savingEmr ? "Saving…" : emrSaved ? "Saved ✓" : "Save EMR"}
                </button>
              </div>
            </div>
          )}

          {/* ── SPECIALIST ── */}
          {panel === "specialist" && (
            <div className="flex-1 flex flex-col overflow-hidden">

              {/* Invite sent banner */}
              {inviteStatus === "sent" && selectedSpecialist && (
                <div className="mx-3 mt-3 flex items-start gap-2.5 bg-green-50 border border-green-100 rounded-xl p-3">
                  <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0 mt-1" />
                  <div className="flex-1 min-w-0">
                    <p className="text-green-700 text-[11px] font-semibold">Invite sent!</p>
                    <p className="text-green-600 text-[10px] mt-0.5 leading-relaxed">
                      Waiting for <span className="font-semibold">{selectedSpecialist.fullName}</span> to accept.
                      They will receive a notification on their dashboard.
                    </p>
                  </div>
                  <button onClick={() => { setInviteStatus("idle"); setSelectedSpecialist(null); fetchAvailableDoctors(); }}
                    className="text-green-400 hover:text-green-600 text-xs flex-shrink-0">✕</button>
                </div>
              )}

              {inviteStatus === "error" && (
                <div className="mx-3 mt-3 bg-red-50 border border-red-100 rounded-xl p-3 text-red-600 text-[10px]">
                  {inviteError}
                  <button onClick={() => setInviteStatus("idle")} className="ml-2 underline">Dismiss</button>
                </div>
              )}

              {/* Search */}
              <div className="p-3 border-b border-gray-100">
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                  </svg>
                  <input
                    value={specialistSearch}
                    onChange={e => setSpecialistSearch(e.target.value)}
                    placeholder="Search by name or specialty…"
                    className="w-full bg-gray-50 rounded-lg pl-8 pr-3 py-2 text-[11px] text-gray-700 placeholder-gray-300 outline-none focus:ring-1 focus:ring-[#5476fc]/30"
                  />
                </div>
              </div>

              {/* Doctor list */}
              <div className="flex-1 overflow-y-auto">
                {doctorsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="w-6 h-6 border-2 border-[#5476fc] border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : availableDoctors.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-lg mb-2">👨‍⚕️</div>
                    <p className="text-gray-400 text-xs font-medium">No doctors available</p>
                    <p className="text-gray-300 text-[10px] mt-1">All other doctors are currently in calls</p>
                    <button onClick={fetchAvailableDoctors}
                      className="mt-3 text-[#5476fc] text-[10px] font-semibold hover:underline">
                      Refresh
                    </button>
                  </div>
                ) : (
                  availableDoctors
                    .filter(d =>
                      d.fullName.toLowerCase().includes(specialistSearch.toLowerCase()) ||
                      d.specialty.toLowerCase().includes(specialistSearch.toLowerCase())
                    )
                    .map(doc => {
                      const isSelected = selectedSpecialist?.id === doc.id && inviteStatus === "sent";
                      return (
                        <div key={doc.id} className={`flex items-center gap-3 px-3 py-3 border-b border-gray-50 transition-colors ${isSelected ? "bg-green-50" : "hover:bg-gray-50"}`}>
                          {/* Avatar */}
                          <div className="relative flex-shrink-0">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={doc.avatarUrl ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(doc.fullName)}&background=5476FC&color=fff&size=64`}
                              alt={doc.fullName}
                              className="w-9 h-9 rounded-full object-cover border border-slate-100"
                            />
                            <span className="w-2 h-2 rounded-full bg-green-400 border-2 border-white absolute bottom-0 right-0" />
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <p className="text-[#24292e] text-[11px] font-semibold truncate">{doc.fullName}</p>
                            <p className="text-gray-400 text-[10px] truncate">{doc.specialty}</p>
                            {doc.fees && (
                              <p className="text-[#5476fc] text-[10px] font-medium">AED {doc.fees}</p>
                            )}
                          </div>

                          {/* Action */}
                          {isSelected ? (
                            <span className="text-[10px] text-green-600 font-semibold flex-shrink-0">Invited ✓</span>
                          ) : (
                            <button
                              onClick={() => sendInvite(doc)}
                              disabled={inviteStatus === "sending" || inviteStatus === "sent"}
                              className="flex-shrink-0 h-7 px-3 rounded-full text-[10px] font-semibold border border-[#5476fc] text-[#5476fc] hover:bg-[#5476fc] hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              {inviteStatus === "sending" && selectedSpecialist?.id === doc.id ? "…" : "Invite"}
                            </button>
                          )}
                        </div>
                      );
                    })
                )}
              </div>

              {/* Refresh footer */}
              {availableDoctors.length > 0 && inviteStatus !== "sent" && (
                <div className="p-2 border-t border-gray-100 text-center">
                  <button onClick={fetchAvailableDoctors}
                    className="text-[10px] text-gray-400 hover:text-[#5476fc] transition-colors">
                    ↻ Refresh list
                  </button>
                </div>
              )}
            </div>
          )}
        </aside>

        {/* ── Video area ── */}
        <div className="flex-1 relative bg-[#1a2035] overflow-hidden">
          {/* Remote video */}
          <video ref={remoteVideoEl} autoPlay playsInline className="absolute inset-0 w-full h-full object-cover" />

          {/* Waiting overlay */}
          {!connected && !error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#1a2035] gap-4">
              <div className="w-16 h-16 rounded-full bg-[#5476fc]/10 border border-[#5476fc]/30 flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-[#5476fc] border-t-transparent rounded-full animate-spin" />
              </div>
              <div className="text-center">
                <p className="text-white text-sm font-medium">Waiting for {patientName}…</p>
                <p className="text-white/30 text-xs mt-1">The patient will join shortly</p>
              </div>
            </div>
          )}

          {/* Error overlay */}
          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#1a2035] gap-4 p-8">
              <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center text-xl">⚠️</div>
              <div className="text-center max-w-sm">
                <p className="text-red-400 text-sm font-semibold mb-2">Connection Failed</p>
                <p className="text-white/40 text-xs leading-relaxed">{error}</p>
              </div>
              <button onClick={() => window.location.reload()}
                className="px-4 py-2 bg-[#5476fc] text-white text-sm rounded-lg hover:bg-[#4466ec]">Retry</button>
            </div>
          )}

          {/* Patient name label */}
          <div className="absolute bottom-[116px] left-4 bg-black/50 backdrop-blur-sm text-white text-[11px] font-medium px-3 py-1 rounded-lg z-10">
            {patientName}
          </div>

          {/* Doctor PiP + label */}
          <div className="absolute bottom-4 right-4 z-10 flex flex-col items-center gap-1">
            <div className="w-36 h-24 rounded-xl overflow-hidden border border-white/20 bg-[#1a2035] shadow-2xl">
              <video ref={localVideoEl} autoPlay playsInline muted className="w-full h-full object-cover" />
            </div>
            <span className="text-white/70 text-[9px] font-semibold">Display Name</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ConsultPage() {
  return (
    <Suspense fallback={
      <div className="flex h-[calc(100vh-96px)] items-center justify-center bg-white">
        <div className="w-8 h-8 border-2 border-[#5476fc] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <ConsultRoom />
    </Suspense>
  );
}
