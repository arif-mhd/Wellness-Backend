"use client";

import { useState, useImperativeHandle, forwardRef } from "react";
import patientVideoCall from "@/assets/images/patient_video_call.png";
import doctorAvatar from "@/assets/images/videocall.jpg";

interface SpecialistInfo {
  name: string;
  avatar: string;
}

interface VideoFeedProps {
  specialistJoined?: boolean;
  specialist?: SpecialistInfo | null;
  onDataMessage?: (payload: string) => void;
}

// VideoFeed is a mock component — in production this would wrap the LiveKit Room.
// The parent (video-calls/page.tsx) passes onDataMessage to receive real-time
// signals (specialist_accepted / specialist_declined) from the LiveKit data channel.
export default function VideoFeed({ specialistJoined = false, specialist = null, onDataMessage }: VideoFeedProps) {
  const [micActive, setMicActive] = useState(true);
  const [cameraActive, setCameraActive] = useState(true);

  return (
    <div className="relative w-full aspect-[16/10] bg-slate-900 rounded-2xl overflow-hidden shadow-lg border border-[#EBEEF5]">
      {/* Main Video Stream */}
      {cameraActive ? (
        <img
          src={patientVideoCall.src}
          alt="Patient Video Stream"
          className="w-full h-full object-cover transition-all duration-300"
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-850 gap-4 text-white">
          <div className="w-20 h-20 rounded-full bg-gradient-to-r from-[#869DFE] to-[#5879FC] flex items-center justify-center text-2xl font-semibold shadow-lg">
            AF
          </div>
          <span className="text-xs font-medium text-slate-400">Albert Flores&apos;s camera is off</span>
        </div>
      )}

      {/* Display Name - Bottom Left */}
      <div className="absolute bottom-4 left-4 px-3.5 py-1.5 bg-black/60 backdrop-blur-md rounded-lg text-white text-xs font-semibold select-none">
        Albert Flores
      </div>

      {/* PiP Stack - Bottom Right */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-2">

        {/* Specialist PiP — animated in when joined */}
        {specialistJoined && specialist && (
          <div
            className="w-[140px] aspect-[16/10] bg-slate-700 rounded-xl overflow-hidden shadow-2xl border-2 border-white/30 select-none"
            style={{ animation: "fadeInPiP 0.4s ease-out" }}
          >
            <style dangerouslySetInnerHTML={{__html: `
              @keyframes fadeInPiP {
                from { opacity: 0; transform: scale(0.88) translateY(10px); }
                to   { opacity: 1; transform: scale(1) translateY(0); }
              }
            `}} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={specialist.avatar}
              alt={specialist.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-1.5 left-2 px-1.5 py-0.5 bg-black/55 backdrop-blur-md rounded text-[9px] text-white font-medium">
              Guest
            </div>
          </div>
        )}

        {/* Doctor self PiP — always shown */}
        <div className="w-[140px] aspect-[16/10] bg-slate-800 rounded-xl overflow-hidden shadow-2xl border border-white/20 select-none">
          <img
            src={doctorAvatar.src}
            alt="Doctor Feed"
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-1.5 left-2 px-1.5 py-0.5 bg-black/50 backdrop-blur-md rounded text-[9px] text-white font-medium">
            Display Name
          </div>
        </div>
      </div>

      {/* Floating Call Controls - Bottom Center */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-4">
        {/* 1. Toggle Camera */}
        <button
          onClick={() => setCameraActive(!cameraActive)}
          title={cameraActive ? "Turn Camera Off" : "Turn Camera On"}
          className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all duration-200 active:scale-95 border border-white/5 ${
            cameraActive
              ? "bg-[#25282B]/90 hover:bg-[#34373C] text-white"
              : "bg-red-500 hover:bg-red-600 text-white"
          }`}
        >
          {cameraActive ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 7a2 2 0 0 0-2.45-1.45L16 7V5a2 2 0 0 0-2-2H2a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2l4.55 1.45A2 2 0 0 0 23 17V7Z" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 16v1a2 2 0 0 1-2 2H2a2 2 0 0 1-2 2V5a2 2 0 0 1 2-2h7" />
              <path d="M23 7a2 2 0 0 0-2.45-1.45L16 7v4" />
              <line x1="2" y1="2" x2="22" y2="22" />
            </svg>
          )}
        </button>

        {/* 2. End Call Button */}
        <button
          title="End Call"
          onClick={() => alert("Mock call ended.")}
          className="w-16 h-12 rounded-[18px] bg-[#FF0000] hover:bg-red-600 flex items-center justify-center shadow-xl text-white transition-all duration-200 active:scale-95 hover:scale-105"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="rotate-[135deg]">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
          </svg>
        </button>

        {/* 3. Toggle Microphone */}
        <button
          onClick={() => setMicActive(!micActive)}
          title={micActive ? "Mute Microphone" : "Unmute Microphone"}
          className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all duration-200 active:scale-95 border border-white/5 ${
            micActive
              ? "bg-[#25282B]/90 hover:bg-[#34373C] text-white"
              : "bg-red-500 hover:bg-red-600 text-white"
          }`}
        >
          {micActive ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
              <path d="M19 10v1a7 7 0 0 1-14 0v-1M12 19v4M8 23h8" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="2" y1="2" x2="22" y2="22" />
              <path d="M18.89 13.19a8.94 8.94 0 0 1-5.69 5.69M12 19v4M8 23h8" />
              <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V5a3 3 0 0 0-5.94-.6" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
