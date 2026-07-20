"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Session from "supertokens-web-js/recipe/session";
import {
  Room, RoomEvent, Track,
  RemoteTrack, RemoteTrackPublication, RemoteParticipant,
  LocalTrackPublication,
} from "livekit-client";
import { apiFetch } from "@/lib/apiFetch";
import IntakePlan, { EmrSections, EMPTY_EMR_SECTIONS, VisitInfo, EMPTY_VISIT_INFO } from "@/components/video-call/IntakePlan";
import AddMedicines, { Medicine } from "@/components/video-call/AddMedicines";
import AddLabs, { LabRecommendation } from "@/components/video-call/AddLabs";
import EhrPanel from "@/components/video-call/EhrPanel";

function fmt(d: Date) {
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

interface ChatMsg { id: string; sender: "you" | "other"; name: string; text: string; time: string; }

interface RemoteVideoTile {
  participantId: string;
  name: string;
  trackSid: string | undefined;
}

interface AvailableDoctor {
  id: string;
  fullName: string;
  specialty: string;
  avatarUrl: string | null;
  email: string;
  fees: string | null;
  rating: number;
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[...Array(5)].map((_, i) => (
        <svg key={i} width="10" height="10" viewBox="0 0 24 24"
          className={i < Math.floor(rating) ? "fill-[#5476FC] stroke-[#5476FC]" : "fill-gray-200 stroke-gray-200"}>
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
        </svg>
      ))}
    </div>
  );
}

function VideoCallInner() {
  const searchParams  = useSearchParams();
  const router        = useRouter();
  const appointmentId = searchParams.get("appointmentId") ?? "";
  const isSpecialist  = searchParams.get("role") === "specialist";

  const [connected,  setConnected]  = useState(false);
  const [ended,      setEnded]      = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const [micOn,      setMicOn]      = useState(true);
  const [camOn,      setCamOn]      = useState(true);
  const [timer,      setTimer]      = useState(0);

  const [messages,   setMessages]   = useState<ChatMsg[]>([]);
  const [chatInput,  setChatInput]  = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [unread,     setUnread]     = useState(0);

  const [emrSections, setEmrSections] = useState<EmrSections>(EMPTY_EMR_SECTIONS);
  const [visitInfo, setVisitInfo] = useState<VisitInfo>(EMPTY_VISIT_INFO);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [labs,      setLabs]      = useState<LabRecommendation[]>([]);
  const [expandedSection, setExpandedSection] = useState<string | null>("reasonForVisit");
  const [savingEmr,  setSavingEmr]  = useState(false);
  const [emrSaved,   setEmrSaved]   = useState(false);
  const [loadingEmr, setLoadingEmr] = useState(true);

  // Patient profile for the snapshot strip + HPI pre-fill
  const [patientProfile, setPatientProfile] = useState<any | null>(null);

  // Current doctor identity — used by AddMedicines/AddLabs to identify own entries
  const [currentDoctorId, setCurrentDoctorId] = useState<string | null>(null);

  // EHR panel
  const [ehrOpen, setEhrOpen] = useState(false);
  const [ehrLoading, setEhrLoading] = useState(false);
  const [ehrData, setEhrData] = useState<any | null>(null);
  const [fhirLoading, setFhirLoading] = useState(false);
  const [fhirData, setFhirData] = useState<any | null>(null);

  // Specialist invite (primary doctor only)
  const [availableDoctors,   setAvailableDoctors]   = useState<AvailableDoctor[]>([]);
  const [doctorsLoading,     setDoctorsLoading]     = useState(false);
  const [specialistSearch,   setSpecialistSearch]   = useState("");
  const [selectedSpecialist, setSelectedSpecialist] = useState<AvailableDoctor | null>(null);
  const [showSpecialistList, setShowSpecialistList] = useState(false);
  const [showApprovalModal,  setShowApprovalModal]  = useState(false);
  const [showSuccessModal,   setShowSuccessModal]   = useState(false);
  const [inviteStatus,       setInviteStatus]       = useState<"idle" | "sending" | "waiting" | "accepted" | "declined">("idle");
  const patientPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Follow-up scheduling (primary doctor only)
  const [showFollowUpModal,   setShowFollowUpModal]   = useState(false);
  const [followUpDate,        setFollowUpDate]        = useState("");
  const [followUpTime,        setFollowUpTime]        = useState("");
  const [followUpReason,      setFollowUpReason]      = useState("Follow-up consultation");
  const [followUpStatus,      setFollowUpStatus]      = useState<"idle" | "sending" | "waiting" | "accepted" | "declined">("idle");
  const [followUpToast,       setFollowUpToast]       = useState<string | null>(null);

  // LiveKit
  const roomRef      = useRef<Room | null>(null);
  const localVideoEl = useRef<HTMLVideoElement>(null);
  const didConnectRef = useRef(false);
  const remoteVideoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  const [remoteTiles, setRemoteTiles] = useState<RemoteVideoTile[]>([]);

  // Fullscreen
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [pinnedId, setPinnedId] = useState<string | null>(null);

  // A stable ref to the latest "refresh medicines + labs only" function so the
  // once-registered LiveKit DataReceived handler can always call the current version.
  const refreshMedicinesRef = useRef<(() => Promise<void>) | null>(null);

  // Timer
  useEffect(() => {
    if (!connected) return;
    const id = setInterval(() => setTimer(t => t + 1), 1000);
    return () => clearInterval(id);
  }, [connected]);
  const timerStr = `${String(Math.floor(timer / 60)).padStart(2,"0")}:${String(timer % 60).padStart(2,"0")}`;

  // Track fullscreen changes (user pressing Esc, etc.)
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  const toggleFullscreen = useCallback(() => {
    const el = videoContainerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  // LiveKit connect
  useEffect(() => {
    if (roomRef.current) return;

    const room = new Room();
    roomRef.current = room;
    let cancelled = false;

    function attachRemoteTrack(track: RemoteTrack, participant: RemoteParticipant) {
      if (track.kind === Track.Kind.Video) {
        setRemoteTiles(prev => {
          if (prev.find(t => t.trackSid === track.sid)) return prev;
          return [...prev, { participantId: participant.identity, name: participant.name ?? participant.identity, trackSid: track.sid }];
        });
        requestAnimationFrame(() => {
          const el = remoteVideoRefs.current.get(participant.identity);
          if (el) track.attach(el);
        });
      }
      if (track.kind === Track.Kind.Audio) track.attach();
    }

    room.on(RoomEvent.ParticipantConnected, (p: RemoteParticipant) => {
      if (!cancelled) {
        setConnected(true);
        setPinnedId(prev => prev ?? p.identity);
      }
    });
    room.on(RoomEvent.ParticipantDisconnected, (p: RemoteParticipant) => {
      if (!cancelled) {
        setRemoteTiles(prev => prev.filter(t => t.participantId !== p.identity));
        remoteVideoRefs.current.delete(p.identity);
        setPinnedId(prev => prev === p.identity ? null : prev);
        if (room.remoteParticipants.size === 0) setConnected(false);
      }
    });
    room.on(RoomEvent.TrackSubscribed, (track: RemoteTrack, _pub: RemoteTrackPublication, participant: RemoteParticipant) => {
      if (!cancelled) attachRemoteTrack(track, participant);
    });
    room.on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack, _pub: RemoteTrackPublication, participant: RemoteParticipant) => {
      track.detach();
      if (track.kind === Track.Kind.Video) {
        setRemoteTiles(prev => prev.filter(t => t.participantId !== participant.identity || t.trackSid !== track.sid));
      }
    });
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
          setMessages(prev => [...prev, { id: `${Date.now()}${Math.random()}`, sender: "other", name: data.senderName ?? "Other", text: data.text, time: fmt(new Date()) }]);
          setUnread(u => u + 1);
        } else if (data.type === "specialist_accepted" && !isSpecialist) {
          if (patientPollRef.current) clearInterval(patientPollRef.current);
          setInviteStatus("accepted");
          setShowSuccessModal(true);
        } else if (data.type === "specialist_declined" && !isSpecialist) {
          if (patientPollRef.current) clearInterval(patientPollRef.current);
          setInviteStatus("declined");
        } else if (data.type === "emr_updated") {
          // Another doctor in the call saved the EMR — re-fetch medicines & labs
          // so both doctors always see the merged, up-to-date prescription list.
          refreshMedicinesRef.current?.();
        } else if (data.type === "followup_accepted" && !isSpecialist) {
          setFollowUpStatus("accepted");
          const toast = data.followUpDate
            ? `Follow-up booked for ${data.followUpDate} at ${data.followUpTime}`
            : "Follow-up appointment booked!";
          setFollowUpToast(toast);
          setTimeout(() => setFollowUpToast(null), 5000);
        } else if (data.type === "followup_declined" && !isSpecialist) {
          setFollowUpStatus("declined");
          setFollowUpToast("Patient declined the follow-up.");
          setTimeout(() => setFollowUpToast(null), 4000);
        }
      } catch {}
    });
    room.on(RoomEvent.Disconnected, () => {
      if (cancelled) return;
      if (didConnectRef.current) setEnded(true);
      else setError("Could not connect to the call.");
    });

    async function init() {
      if (!appointmentId) { setError("Missing appointment ID"); return; }
      try {
        const endpoint = isSpecialist
          ? `/api/appointments/${appointmentId}/specialist-join`
          : `/api/appointments/${appointmentId}/livekit-token`;
        const res = await apiFetch(endpoint);
        if (cancelled) return;
        if (!res.ok) { setError("Could not get call token"); return; }
        const { token: lkToken, wsUrl } = await res.json();
        if (cancelled) return;

        await room.connect(wsUrl, lkToken, { autoSubscribe: true });
        if (cancelled) { room.disconnect(); return; }
        didConnectRef.current = true;

        room.remoteParticipants.forEach(participant => {
          setConnected(true);
          participant.trackPublications.forEach(pub => {
            if (pub.isSubscribed && pub.track) attachRemoteTrack(pub.track as RemoteTrack, participant);
          });
        });

        await room.localParticipant.setCameraEnabled(true);
        await room.localParticipant.setMicrophoneEnabled(true);
      } catch (e: any) {
        if (!cancelled) setError(`Connection error: ${e?.message}`);
      }
    }

    init();

    return () => {
      cancelled = true;
      if (didConnectRef.current) room.disconnect();
      roomRef.current = null;
    };
  }, [appointmentId, isSpecialist]);

  const setRemoteVideoRef = useCallback((participantId: string, el: HTMLVideoElement | null) => {
    if (!el) { remoteVideoRefs.current.delete(participantId); return; }
    remoteVideoRefs.current.set(participantId, el);
    const room = roomRef.current;
    if (!room) return;
    const participant = room.remoteParticipants.get(participantId);
    if (!participant) return;
    participant.trackPublications.forEach(pub => {
      if (pub.kind === Track.Kind.Video && pub.isSubscribed && pub.track) {
        (pub.track as RemoteTrack).attach(el);
      }
    });
  }, []);

  const disconnect = useCallback(async () => {
    await roomRef.current?.disconnect();
    setEnded(true);
  }, []);

  // Load the current doctor's user ID on mount so components can identify own entries
  useEffect(() => {
    Session.getUserId().then((id) => setCurrentDoctorId(id ?? null)).catch(() => {});
  }, []);

  // Restore any previously saved EMR for this appointment + load patient profile
  useEffect(() => {
    if (!appointmentId) return;
    (async () => {
      setLoadingEmr(true);
      try {
        // 1. Load patient profile (for the snapshot strip)
        try {
          const profRes = await apiFetch(`/api/appointments/${appointmentId}/ehr`);
          if (profRes.ok) {
            const { profile } = await profRes.json();
            setPatientProfile(profile ?? null);
          }
        } catch { /* non-fatal */ }

        // 2. Load saved EMR for this encounter
        const emrRes = await apiFetch(`/api/appointments/${appointmentId}/emr`);
        if (emrRes.ok) {
          const { emr } = await emrRes.json();
          if (emr) {
            if (emr.sections) setEmrSections({ ...EMPTY_EMR_SECTIONS, ...emr.sections });
            if (emr.visitInfo) setVisitInfo({ ...EMPTY_VISIT_INFO, ...emr.visitInfo });
            setMedicines(emr.medicines ?? []);
            setLabs(emr.labs ?? []);
          } else {
            // 3. No saved EMR yet — pre-fill HPI from the patient's most recent
            //    past appointment that has an EMR (fetched via the EHR endpoint).
            try {
              const ehrRes = await apiFetch(`/api/appointments/${appointmentId}/ehr`);
              if (ehrRes.ok) {
                const ehrData = await ehrRes.json();
                const history: any[] = ehrData?.visitHistory ?? [];
                // Find the most-recent completed visit that has HPI recorded
                const hpiSource = history.find(
                  (v: any) => v.emr?.sections?.historyOfPresentIllness?.trim()
                );
                if (hpiSource) {
                  setEmrSections((prev) => ({
                    ...prev,
                    historyOfPresentIllness: hpiSource.emr.sections.historyOfPresentIllness,
                  }));
                }
              }
            } catch { /* non-fatal — leave HPI blank */ }
          }
        }
      } catch {
        // ignore — start with a blank form
      } finally {
        setLoadingEmr(false);
      }
    })();
  }, [appointmentId]);

  // Keep refreshMedicinesRef pointing at the latest fetch function.
  // We do this separately from the EMR-load useEffect so it can be called
  // by the once-registered LiveKit DataReceived handler at any time.
  useEffect(() => {
    refreshMedicinesRef.current = async () => {
      if (!appointmentId) return;
      try {
        const res = await apiFetch(`/api/appointments/${appointmentId}/emr`);
        if (res.ok) {
          const { emr } = await res.json();
          if (emr) {
            // Only refresh medicines + labs; leave the doctor's in-progress
            // section notes untouched so they don't lose unsaved text.
            setMedicines(emr.medicines ?? []);
            setLabs(emr.labs ?? []);
          }
        }
      } catch {
        // ignore — keep existing state
      }
    };
  }, [appointmentId]);

  const saveEmr = async () => {
    setSavingEmr(true);
    try {
      // CRITICAL: Only send THIS doctor's own entries to the backend.
      // The local medicines/labs state includes entries from other doctors
      // (loaded via EMR fetch). If we sent those too, the backend would
      // re-tag them with this doctor's contributorDoctorId, corrupting the
      // merge. The backend preserves all other doctors' entries independently.
      const ownMedicines = medicines.filter(
        (m) => !currentDoctorId || !m.contributorDoctorId || m.contributorDoctorId === currentDoctorId
      );
      const ownLabs = labs.filter(
        (l) => !currentDoctorId || !l.contributorDoctorId || l.contributorDoctorId === currentDoctorId
      );

      const res = await apiFetch(`/api/appointments/${appointmentId}/emr`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sections: emrSections, visitInfo, medicines: ownMedicines, labs: ownLabs }),
      });
      if (res.ok) {
        // Update local state with what the backend actually saved — the fully
        // merged list (this doctor's entries + all other doctors' entries).
        const { emr: savedEmr } = await res.json();
        if (savedEmr) {
          setMedicines(savedEmr.medicines ?? []);
          setLabs(savedEmr.labs ?? []);
        }
        setEmrSaved(true);
        setTimeout(() => setEmrSaved(false), 2500);

        // Notify the other doctor(s) in the room so they re-fetch immediately.
        try {
          await roomRef.current?.localParticipant.publishData(
            new TextEncoder().encode(JSON.stringify({ type: "emr_updated" })),
            { reliable: true }
          );
        } catch { /* non-fatal */ }
      }
    } catch {} finally { setSavingEmr(false); }
  };

  const openEhrPanel = async () => {
    setEhrOpen(true);
    setEhrLoading(true);
    try {
      const res = await apiFetch(`/api/appointments/${appointmentId}/ehr`);
      if (res.ok) {
        const ehr = await res.json();
        setEhrData(ehr);

        const fhirId = ehr?.profile?.fhirPatientId;
        if (fhirId) {
          setFhirLoading(true);
          try {
            const [encRes, notesRes, obsRes] = await Promise.all([
              apiFetch(`/api/fhir/patients/${fhirId}/encounters`),
              apiFetch(`/api/fhir/patients/${fhirId}/notes`),
              apiFetch(`/api/fhir/patients/${fhirId}/observations`),
            ]);
            setFhirData({
              encounters: encRes.ok ? await encRes.json() : [],
              notes:      notesRes.ok ? await notesRes.json() : [],
              observations: obsRes.ok ? await obsRes.json() : [],
            });
          } catch {
            setFhirData(null);
          } finally {
            setFhirLoading(false);
          }
        }
      }
    } catch {
      // ignore
    } finally {
      setEhrLoading(false);
    }
  };

  const sendChat = useCallback(async () => {
    const text = chatInput.trim();
    if (!text || !roomRef.current) return;
    const role = isSpecialist ? "Specialist" : "Doctor";
    await roomRef.current.localParticipant.publishData(
      new TextEncoder().encode(JSON.stringify({ type: "chat", senderName: role, text })),
      { reliable: true }
    );
    setMessages(prev => [...prev, { id: `${Date.now()}${Math.random()}`, sender: "you", name: role, text, time: fmt(new Date()) }]);
    setChatInput("");
    setUnread(0);
  }, [chatInput, isSpecialist]);

  const toggleMic = async () => { await roomRef.current?.localParticipant.setMicrophoneEnabled(!micOn); setMicOn(v => !v); };
  const toggleCam = async () => { await roomRef.current?.localParticipant.setCameraEnabled(!camOn);   setCamOn(v => !v); };

  const fetchAvailableDoctors = useCallback(async () => {
    if (!appointmentId || isSpecialist) return;
    setDoctorsLoading(true);
    try {
      const res = await apiFetch(`/api/appointments/${appointmentId}/available-doctors`);
      if (res.ok) { const { doctors: list } = await res.json(); setAvailableDoctors(list ?? []); }
    } catch {} finally { setDoctorsLoading(false); }
  }, [appointmentId, isSpecialist]);

  const handleSelectDoctor = (doc: AvailableDoctor) => {
    setSelectedSpecialist(doc);
    setShowSpecialistList(false);
    setShowApprovalModal(true);
  };

  const handleRequestApproval = async () => {
    if (!selectedSpecialist || !appointmentId) return;
    setInviteStatus("sending");
    try {
      const res = await apiFetch(`/api/appointments/${appointmentId}/invite-specialist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ specialistDoctorId: selectedSpecialist.id }),
      });
      if (res.ok) {
        setInviteStatus("waiting");
        setShowApprovalModal(false);
        if (patientPollRef.current) clearInterval(patientPollRef.current);
        patientPollRef.current = setInterval(async () => {
          const r = await apiFetch(`/api/appointments/${appointmentId}/specialist-status`);
          if (r.ok) {
            const { patientDecision } = await r.json();
            if (patientDecision === "accepted") {
              clearInterval(patientPollRef.current!);
              setInviteStatus("accepted");
              setShowSuccessModal(true);
            } else if (patientDecision === "declined") {
              clearInterval(patientPollRef.current!);
              setInviteStatus("declined");
            }
          }
        }, 5000);
      } else { setInviteStatus("idle"); }
    } catch { setInviteStatus("idle"); }
  };

  useEffect(() => { return () => { if (patientPollRef.current) clearInterval(patientPollRef.current); }; }, []);

  const handleSendFollowUp = async () => {
    if (!followUpDate || !followUpTime || !appointmentId) return;
    setFollowUpStatus("sending");
    try {
      const res = await apiFetch(`/api/appointments/${appointmentId}/send-followup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ followUpDate, followUpTime, reason: followUpReason }),
      });
      if (res.ok) {
        setFollowUpStatus("waiting");
        setShowFollowUpModal(false);
      } else {
        setFollowUpStatus("idle");
      }
    } catch {
      setFollowUpStatus("idle");
    }
  };

  const filteredDoctors = availableDoctors.filter(d =>
    d.fullName.toLowerCase().includes(specialistSearch.toLowerCase()) ||
    d.specialty.toLowerCase().includes(specialistSearch.toLowerCase())
  );

  const dateStr = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) +
    " | " + new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });

  if (ended) return (
    <div className="flex flex-col items-center justify-center h-screen gap-4 bg-[#f7f9fc]">
      <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center text-2xl">✓</div>
      <h2 className="text-[#24292e] text-xl font-semibold">Call Ended</h2>
      <p className="text-[#676e76] text-sm">Duration: {timerStr}</p>
      <button onClick={() => router.push("/dashboard")}
        className="px-6 py-2.5 bg-[#5476fc] text-white text-sm font-medium rounded-xl hover:bg-[#4466ec]">
        Back to Dashboard
      </button>
    </div>
  );

  return (
    <div className="flex flex-col bg-white" style={{ height: "calc(100vh - 96px)" }}>

      {/* ── Follow-up scheduling modal ── */}
      {showFollowUpModal && !isSpecialist && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setShowFollowUpModal(false)}/>
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-[440px] mx-4 p-8 animate-[zoomIn_0.2s_ease-out]">
            <style dangerouslySetInnerHTML={{__html:`@keyframes zoomIn{from{transform:scale(0.94);opacity:0}to{transform:scale(1);opacity:1}}`}}/>
            <button onClick={() => setShowFollowUpModal(false)} className="absolute top-5 right-5 text-gray-400 hover:text-gray-600">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>

            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-[#5476FC]/10 flex items-center justify-center flex-shrink-0">
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#5476FC" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
              </div>
              <div>
                <h3 className="text-[#24292e] font-semibold text-base">Schedule Follow-up</h3>
                <p className="text-gray-400 text-[11px]">Propose a follow-up appointment to the patient</p>
              </div>
            </div>

            {/* Date */}
            <div className="mb-4">
              <label className="block text-[11px] font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Follow-up Date</label>
              <input
                type="date"
                value={followUpDate}
                onChange={e => setFollowUpDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full h-10 border border-gray-200 rounded-xl px-3 text-sm text-[#24292e] outline-none focus:border-[#5476FC] focus:ring-1 focus:ring-[#5476FC]/30 transition-colors"
              />
            </div>

            {/* Time */}
            <div className="mb-4">
              <label className="block text-[11px] font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Follow-up Time</label>
              <input
                type="time"
                value={followUpTime}
                onChange={e => setFollowUpTime(e.target.value)}
                className="w-full h-10 border border-gray-200 rounded-xl px-3 text-sm text-[#24292e] outline-none focus:border-[#5476FC] focus:ring-1 focus:ring-[#5476FC]/30 transition-colors"
              />
            </div>

            {/* Reason */}
            <div className="mb-6">
              <label className="block text-[11px] font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Reason</label>
              <input
                type="text"
                value={followUpReason}
                onChange={e => setFollowUpReason(e.target.value)}
                placeholder="Follow-up consultation"
                className="w-full h-10 border border-gray-200 rounded-xl px-3 text-sm text-[#24292e] outline-none focus:border-[#059669] focus:ring-1 focus:ring-[#059669]/30 transition-colors"
              />
            </div>

            <button
              onClick={handleSendFollowUp}
              disabled={!followUpDate || !followUpTime || followUpStatus === "sending"}
              className="w-full h-10 rounded-xl bg-gradient-to-b from-[#8AA0FF] to-[#5476fc] text-white text-xs font-bold shadow-[0_2px_8px_rgba(84,118,252,0.3)] hover:opacity-90 disabled:opacity-50 transition-all"
            >
              {followUpStatus === "sending" ? "Sending…" : "Send to Patient"}
            </button>
          </div>
        </div>
      )}

      {/* ── Specialist selection drawer ── */}
      {showSpecialistList && !isSpecialist && (
        <div className="fixed inset-0 z-[99999] flex items-start justify-end">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setShowSpecialistList(false)}/>
          <div className="relative bg-white w-[360px] h-full shadow-2xl flex flex-col animate-[slideIn_0.25s_ease-out]">
            <style dangerouslySetInnerHTML={{__html:`@keyframes slideIn{from{transform:translateX(30px);opacity:0}to{transform:translateX(0);opacity:1}}`}}/>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <span className="text-[#24292e] font-semibold text-sm">Add Specialist</span>
              <button onClick={() => setShowSpecialistList(false)} className="text-gray-400 hover:text-gray-600">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="px-4 py-3 border-b border-gray-100">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <input value={specialistSearch} onChange={e => setSpecialistSearch(e.target.value)}
                  placeholder="Search…" className="w-full bg-gray-50 rounded-lg pl-8 pr-3 py-2 text-xs outline-none"/>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {doctorsLoading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="w-6 h-6 border-2 border-[#5476fc] border-t-transparent rounded-full animate-spin"/>
                </div>
              ) : filteredDoctors.map((doc, idx) => (
                <div key={doc.id}>
                  <div className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50">
                    <div className="relative flex-shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={doc.avatarUrl ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(doc.fullName)}&background=5476FC&color=fff`}
                        alt={doc.fullName} className="w-10 h-10 rounded-full object-cover"/>
                      <span className="w-2.5 h-2.5 rounded-full bg-green-400 border-2 border-white absolute bottom-0 right-0"/>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[#24292e] text-xs font-semibold truncate">{doc.fullName}</p>
                      <StarRating rating={doc.rating}/>
                      {doc.fees && <p className="text-[10px] text-gray-400">AED {doc.fees}</p>}
                    </div>
                    <button onClick={() => handleSelectDoctor(doc)}
                      className="h-7 px-4 rounded-full text-[10px] font-semibold border border-gray-200 text-gray-600 hover:border-[#5476fc] hover:text-[#5476fc] transition-colors">
                      Add
                    </button>
                  </div>
                  {idx < filteredDoctors.length - 1 && <div className="h-px bg-gray-50 mx-5"/>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Approval modal ── */}
      {showApprovalModal && selectedSpecialist && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setShowApprovalModal(false)}/>
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-[520px] mx-4 p-8 animate-[zoomIn_0.2s_ease-out]">
            <style dangerouslySetInnerHTML={{__html:`@keyframes zoomIn{from{transform:scale(0.94);opacity:0}to{transform:scale(1);opacity:1}}`}}/>
            <button onClick={() => setShowApprovalModal(false)} className="absolute top-5 right-5 text-gray-400 hover:text-gray-600">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
            <h3 className="text-[#24292e] font-semibold text-lg text-center mb-1">Add Specialist</h3>
            <p className="text-gray-400 text-xs text-center mb-6">Add this provider to the consultation.</p>
            <div className="flex items-center gap-3 mb-5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={selectedSpecialist.avatarUrl ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedSpecialist.fullName)}&background=5476FC&color=fff`}
                alt={selectedSpecialist.fullName} className="w-11 h-11 rounded-full object-cover"/>
              <div className="flex-1">
                <p className="text-[#24292e] text-sm font-semibold">{selectedSpecialist.fullName}</p>
                <p className="text-gray-400 text-[11px]">{selectedSpecialist.email}</p>
                <StarRating rating={selectedSpecialist.rating}/>
              </div>
              <button className="h-8 px-4 rounded-full text-[11px] font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50">View Profile in New Tab</button>
            </div>
            <div className="divide-y divide-gray-100">
              <div className="flex justify-between py-2.5 text-xs"><span className="text-gray-500">Consultation Fee</span><span className="font-semibold">{selectedSpecialist.fees ? `AED ${selectedSpecialist.fees}` : "AED 200.00"}</span></div>
              <div className="flex justify-between py-2.5 text-xs"><span className="text-gray-500">Specialty</span><span className="font-semibold">{selectedSpecialist.specialty}</span></div>
              <div className="flex justify-between py-2.5 text-xs"><span className="text-gray-500">Insurance Eligibility of Patient</span><span className="text-[#5476fc] font-semibold">Eligible</span></div>
            </div>
            <p className="text-red-500 text-[10.5px] mt-4 mb-5 leading-relaxed">Important: Please consult with the patient before adding this specialist and inform them about insurance eligibility and payment options, if applicable.</p>
            <div className="flex justify-end">
              <button onClick={handleRequestApproval} disabled={inviteStatus === "sending"}
                className="h-10 px-8 rounded-xl bg-gradient-to-b from-[#8AA0FF] to-[#5476fc] text-white text-xs font-bold shadow-[0_2px_8px_rgba(84,118,252,0.3)] hover:opacity-90 disabled:opacity-60">
                {inviteStatus === "sending" ? "Sending..." : "Request Patient Approval"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Success modal ── */}
      {showSuccessModal && selectedSpecialist && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setShowSuccessModal(false)}/>
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-[300px] mx-4 p-7 flex flex-col items-center gap-3 animate-[zoomIn_0.2s_ease-out]">
            <h3 className="text-[#24292e] font-semibold text-base text-center">Specialist Added<br/>Successfully</h3>
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={selectedSpecialist.avatarUrl ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedSpecialist.fullName)}&background=5476FC&color=fff`}
                alt={selectedSpecialist.fullName} className="w-14 h-14 rounded-full object-cover"/>
              <span className="w-3 h-3 rounded-full bg-green-400 border-2 border-white absolute bottom-0 right-0"/>
            </div>
            <p className="text-[#24292e] text-xs font-semibold">{selectedSpecialist.fullName}</p>
            <StarRating rating={selectedSpecialist.rating}/>
            <p className="text-gray-500 text-[11px] text-center leading-relaxed">Patient approved. The specialist has been notified and will join shortly.</p>
            <button onClick={() => setShowSuccessModal(false)}
              className="w-full py-2.5 rounded-xl bg-gradient-to-b from-[#8AA0FF] to-[#5476fc] text-white text-xs font-bold hover:opacity-90">
              Connect Now
            </button>
          </div>
        </div>
      )}

      {/* ── Top bar ── */}
      <div className="flex items-center gap-4 px-5 py-2.5 bg-white border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <p className="text-[#24292e] text-xs font-semibold">[Internal] Calling{isSpecialist ? " · Specialist" : ""}</p>
          <span className="text-gray-300">|</span>
          <p className="text-gray-400 text-[10px] hidden sm:block">{dateStr}</p>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className={`w-2 h-2 rounded-full ${connected ? "bg-red-500 animate-pulse" : "bg-yellow-400"}`}/>
            <span className="text-[#24292e] font-mono text-xs font-bold">{timerStr}</span>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-1.5 overflow-x-auto">
          {inviteStatus === "waiting" && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 border border-blue-100 rounded-full text-blue-600 text-[10px] font-semibold animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500"/>Waiting for patient…
            </div>
          )}
          {inviteStatus === "declined" && (
            <div className="px-3 py-1.5 bg-red-50 border border-red-100 rounded-full text-red-600 text-[10px] font-semibold">Patient declined</div>
          )}
          {followUpStatus === "waiting" && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-100 rounded-full text-amber-700 text-[10px] font-semibold animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"/>Awaiting follow-up response…
            </div>
          )}
          {followUpToast && (
            <div className={`px-3 py-1.5 rounded-full text-[10px] font-semibold border ${
              followUpStatus === "accepted"
                ? "bg-green-50 border-green-100 text-green-700"
                : "bg-red-50 border-red-100 text-red-600"
            }`}>{followUpToast}</div>
          )}
          <button onClick={openEhrPanel} className="h-8 px-3 rounded-lg border border-gray-200 text-gray-600 text-[10px] font-semibold hover:bg-gray-50 transition-colors whitespace-nowrap">
            EHR
          </button>
          {!isSpecialist && (
            <>
              <button onClick={() => { setShowSpecialistList(true); fetchAvailableDoctors(); }}
                className="h-8 px-3 rounded-lg bg-gradient-to-b from-[#8AA0FF] to-[#5476fc] text-white text-[10px] font-bold shadow-[0_2px_6px_rgba(84,118,252,0.3)] hover:opacity-90 whitespace-nowrap">
                + Specialist
              </button>

            </>
          )}
          <button onClick={toggleMic}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${micOn ? "bg-gray-100 text-gray-600 hover:bg-gray-200" : "bg-red-50 text-red-500"}`}>
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              {micOn ? <><path strokeLinecap="round" strokeLinejoin="round" d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path strokeLinecap="round" strokeLinejoin="round" d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8"/></> : <><line x1="1" y1="1" x2="23" y2="23"/><path strokeLinecap="round" strokeLinejoin="round" d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/><path strokeLinecap="round" strokeLinejoin="round" d="M17 16.95A7 7 0 0 1 5 12v-2M12 19v4M8 23h8"/></>}
            </svg>
          </button>
          <button onClick={toggleCam}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${camOn ? "bg-gray-100 text-gray-600 hover:bg-gray-200" : "bg-red-50 text-red-500"}`}>
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              {camOn ? <><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></> : <><line x1="1" y1="1" x2="23" y2="23"/><path d="M21 21H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3m3-3h6l2 3h4a2 2 0 0 1 2 2v9.34m-7.72-2.06A4 4 0 1 1 7.88 8.88"/></>}
            </svg>
          </button>
          <button onClick={disconnect}
            className="flex items-center gap-1.5 h-8 px-3 bg-[#e84949] text-white text-[11px] font-semibold rounded-lg hover:bg-[#d43f3f]">
            End
          </button>
        </div>
      </div>

      {/* ── Main body ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left: Video + Chat */}
        <div className="flex flex-col" style={{ width: "560px", flexShrink: 0 }}>

          {/* Video */}
          <div
            ref={videoContainerRef}
            className="relative bg-[#1a2035] overflow-hidden"
            style={{ height: isFullscreen ? "100vh" : "420px" }}
          >
            {remoteTiles.length === 0 ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                {!error ? (
                  <>
                    <div className="w-12 h-12 rounded-full bg-[#5476fc]/10 border border-[#5476fc]/30 flex items-center justify-center">
                      <div className="w-5 h-5 border-2 border-[#5476fc] border-t-transparent rounded-full animate-spin"/>
                    </div>
                    <p className="text-white text-xs font-medium">Connecting to call…</p>
                  </>
                ) : (
                  <>
                    <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center text-lg">⚠️</div>
                    <p className="text-red-400 text-xs">{error}</p>
                    <button onClick={() => window.location.reload()} className="px-3 py-1.5 bg-[#5476fc] text-white text-xs rounded-lg">Retry</button>
                  </>
                )}
              </div>
            ) : (() => {
              const mainTile = remoteTiles.find(t => t.participantId === pinnedId) ?? remoteTiles[0];
              const pipTiles = remoteTiles.filter(t => t.participantId !== mainTile.participantId);
              return (
                <>
                  <video ref={el => setRemoteVideoRef(mainTile.participantId, el)}
                    autoPlay playsInline className="absolute inset-0 w-full h-full object-cover"/>
                  <div className="absolute bottom-16 left-3 bg-black/50 text-white text-[10px] font-medium px-2 py-0.5 rounded-md z-10">
                    {mainTile.name}
                  </div>
                  {pipTiles.map((tile, i) => (
                    <button key={tile.participantId}
                      onClick={() => setPinnedId(tile.participantId)}
                      className="absolute z-20 group"
                      style={{ bottom: `${52 + (i + 1) * 88}px`, right: "8px" }}
                      title="Click to make main">
                      <div className="w-28 h-20 rounded-xl overflow-hidden border-2 border-white/30 bg-[#1a2035] shadow-xl relative hover:border-[#5476fc] transition-colors">
                        <video ref={el => setRemoteVideoRef(tile.participantId, el)} autoPlay playsInline className="w-full h-full object-cover"/>
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                          <svg className="opacity-0 group-hover:opacity-100 transition-opacity" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"/></svg>
                        </div>
                      </div>
                      <p className="text-white/70 text-[9px] text-center mt-0.5 font-medium">{tile.name}</p>
                    </button>
                  ))}
                </>
              );
            })()}

            {/* Local PiP — slot 0 in right column */}
            <div className="absolute z-20" style={{ bottom: "52px", right: "8px" }}>
              <div className="w-28 h-20 rounded-xl overflow-hidden border-2 border-white/20 bg-[#1a2035] shadow-xl">
                <video ref={localVideoEl} autoPlay playsInline muted className="w-full h-full object-cover"/>
              </div>
              <p className="text-white/70 text-[9px] text-center mt-0.5 font-medium">You</p>
            </div>

            {/* Fullscreen toggle button — top-right */}
            <button
              onClick={toggleFullscreen}
              title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
              className="absolute top-3 right-3 z-30 w-8 h-8 rounded-lg bg-black/40 hover:bg-black/60 backdrop-blur-sm flex items-center justify-center text-white transition-all duration-200 hover:scale-110 active:scale-95 border border-white/10"
            >
              {isFullscreen ? (
                /* Exit fullscreen icon */
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M8 3v3a2 2 0 0 1-2 2H3"/>
                  <path d="M21 8h-3a2 2 0 0 1-2-2V3"/>
                  <path d="M3 16h3a2 2 0 0 1 2 2v3"/>
                  <path d="M16 21v-3a2 2 0 0 1 2-2h3"/>
                </svg>
              ) : (
                /* Enter fullscreen icon */
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M8 3H5a2 2 0 0 0-2 2v3"/>
                  <path d="M21 8V5a2 2 0 0 0-2-2h-3"/>
                  <path d="M3 16v3a2 2 0 0 0 2 2h3"/>
                  <path d="M16 21h3a2 2 0 0 0 2-2v-3"/>
                </svg>
              )}
            </button>

            {/* Controls overlay — bottom-center, offset left of PiP column */}
            <div className="absolute bottom-3 z-20 flex items-center gap-2" style={{ left: "50%", transform: "translateX(calc(-50% - 72px))" }}>
              <button onClick={toggleMic}
                className={`w-9 h-9 rounded-full flex items-center justify-center shadow-lg ${micOn ? "bg-white/20 text-white" : "bg-red-500 text-white"}`}>
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  {micOn ? <><path strokeLinecap="round" strokeLinejoin="round" d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path strokeLinecap="round" strokeLinejoin="round" d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8"/></> : <><line x1="1" y1="1" x2="23" y2="23"/><path strokeLinecap="round" strokeLinejoin="round" d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/><path strokeLinecap="round" strokeLinejoin="round" d="M17 16.95A7 7 0 0 1 5 12v-2M12 19v4M8 23h8"/></>}
                </svg>
              </button>
              <button onClick={disconnect}
                className="w-10 h-10 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg hover:bg-red-600">
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" d="M10.68 13.31a16 16 0 003.41 2.6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7 2 2 0 012 2v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.42 19.42 0 013.43 9.63 19.79 19.79 0 01.36 1a2 2 0 012-2H6a2 2 0 012 2 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L7.08 8.96"/>
                </svg>
              </button>
              <button onClick={toggleCam}
                className={`w-9 h-9 rounded-full flex items-center justify-center shadow-lg ${camOn ? "bg-white/20 text-white" : "bg-red-500 text-white"}`}>
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  {camOn ? <><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></> : <><line x1="1" y1="1" x2="23" y2="23"/><path d="M21 21H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3m3-3h6l2 3h4a2 2 0 0 1 2 2v9.34m-7.72-2.06A4 4 0 1 1 7.88 8.88"/></>}
                </svg>
              </button>
            </div>
          </div>

          {/* Chat */}
          <div className="flex-1 flex flex-col overflow-hidden border-t border-gray-100">
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-100 flex-shrink-0">
              <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="text-gray-500"><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
              <span className="text-[#24292e] text-xs font-semibold">Chat</span>
              {unread > 0 && <span className="min-w-[16px] h-4 rounded-full bg-red-500 text-[9px] text-white flex items-center justify-center px-1">{unread}</span>}
            </div>
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3" onClick={() => setUnread(0)}>
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-8">
                  <p className="text-gray-300 text-[11px]">No messages yet</p>
                </div>
              ) : messages.map(m => (
                <div key={m.id} className={`flex items-start gap-2 ${m.sender === "you" ? "flex-row-reverse" : ""}`}>
                  <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold ${m.sender === "you" ? "bg-[#5476fc]/15 text-[#5476fc]" : "bg-gray-100 text-gray-500"}`}>
                    {m.name.slice(0,2).toUpperCase()}
                  </div>
                  <div className={`max-w-[75%] flex flex-col gap-0.5 ${m.sender === "you" ? "items-end" : "items-start"}`}>
                    <p className="text-[9px] text-gray-400 font-medium px-1">{m.name}</p>
                    <div className={`px-3 py-2 rounded-2xl text-xs leading-relaxed ${m.sender === "you" ? "bg-[#5476fc] text-white rounded-tr-none" : "bg-gray-100 text-gray-700 rounded-tl-none"}`}>
                      {m.text}
                    </div>
                    <p className="text-[9px] text-gray-300 px-1">{m.time}</p>
                  </div>
                </div>
              ))}
              <div ref={chatEndRef}/>
            </div>
            <div className="p-3 border-t border-gray-100 flex gap-2 items-center flex-shrink-0">
              <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="text-gray-300 flex-shrink-0"><path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/></svg>
              <input value={chatInput} onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChat(); } }}
                placeholder="Type Something..."
                className="flex-1 bg-transparent text-xs text-gray-700 placeholder-gray-300 outline-none"/>
              <button onClick={sendChat} disabled={!chatInput.trim()}
                className="w-7 h-7 rounded-full bg-[#5476fc] flex items-center justify-center disabled:opacity-30 hover:bg-[#4466ec] flex-shrink-0">
                <svg width="11" height="11" fill="none" viewBox="0 0 24 24"><path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
            </div>
          </div>
        </div>

        {/* Right: EMR */}
        <div className="flex-1 overflow-hidden flex flex-col border-l border-gray-100">
          <div className="flex-1 overflow-y-auto">
            {loadingEmr ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-6 h-6 border-2 border-[#5476fc] border-t-transparent rounded-full animate-spin"/>
              </div>
            ) : (
              <div className="px-6 py-4 flex flex-col gap-5">
                <IntakePlan
                  sections={emrSections}
                  onChange={setEmrSections}
                  openSection={expandedSection}
                  onToggleSection={setExpandedSection}
                  patientProfile={patientProfile}
                  visitInfo={visitInfo}
                  onVisitInfoChange={setVisitInfo}
                  onScheduleFollowUp={() => { setShowFollowUpModal(true); setFollowUpStatus("idle"); }}
                />

                <div className="grid grid-cols-2 gap-4">
                  <AddMedicines medicines={medicines} onChange={setMedicines} currentDoctorId={currentDoctorId ?? undefined} />
                  <AddLabs labs={labs} onChange={setLabs} currentDoctorId={currentDoctorId ?? undefined} />
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center justify-end gap-3 px-6 py-3 border-t border-gray-100 flex-shrink-0">
            <button className="h-9 px-5 rounded-full border border-gray-200 text-gray-500 text-xs font-semibold hover:bg-gray-50">Cancel</button>
            <button onClick={saveEmr} disabled={savingEmr}
              className={`h-9 px-6 rounded-xl text-white text-xs font-bold transition-all ${emrSaved ? "bg-green-500" : "bg-[#5476fc] hover:bg-[#4466ec]"}`}>
              {savingEmr ? "Saving…" : emrSaved ? "Saved ✓" : "Save Consultation Notes"}
            </button>
          </div>
        </div>
      </div>

      <EhrPanel open={ehrOpen} onClose={() => setEhrOpen(false)} loading={ehrLoading} data={ehrData} fhirLoading={fhirLoading} fhirData={fhirData} />
    </div>
  );
}

export default function VideoCallsPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-white">
        <div className="w-8 h-8 border-2 border-[#5476fc] border-t-transparent rounded-full animate-spin"/>
      </div>
    }>
      <VideoCallInner/>
    </Suspense>
  );
}
