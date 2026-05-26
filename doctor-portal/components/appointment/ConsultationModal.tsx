"use client";

import React, { useState, useEffect, useRef } from "react";
import { Patient } from "@/app/appointments/types";

interface ConsultationModalProps {
  patient: Patient;
  onClose: () => void;
}

export default function ConsultationModal({ patient, onClose }: ConsultationModalProps) {
  const [messages, setMessages] = useState<Array<{ sender: "doctor" | "patient"; text: string; time: string }>>([
    {
      sender: "patient",
      text: `Hello Doctor, thank you for seeing me. I've been feeling symptoms of ${patient.diagnosis.toLowerCase()} lately.`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputText, setInputText] = useState("");
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isSharingScreen, setIsSharingScreen] = useState(false);
  const [isCallConnected, setIsCallConnected] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Connect call simulation
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsCallConnected(true);
      setMessages((prev) => [
        ...prev,
        {
          sender: "patient",
          text: "My main concern is: " + patient.description,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    }, 1500);

    return () => clearTimeout(timer);
  }, [patient]);

  // Call duration counter
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isCallConnected) {
      interval = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isCallConnected]);

  const formatDuration = (sec: number) => {
    const minutes = Math.floor(sec / 60);
    const seconds = sec % 60;
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const newMsg = {
      sender: "doctor" as const,
      text: inputText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, newMsg]);
    setInputText("");

    // Simulate patient reply
    setTimeout(() => {
      let responseText = "Understood. Is there anything else I should be aware of?";
      
      const text = inputText.toLowerCase();
      if (text.includes("hello") || text.includes("hi")) {
        responseText = "Hello Doctor. Thank you for checking in on me.";
      } else if (text.includes("fever") || text.includes("temperature")) {
        responseText = "Yes, my temperature has been hovering around 101 degrees Fahrenheit. I took some paracetamol earlier.";
      } else if (text.includes("cough") || text.includes("throat")) {
        responseText = "It is mostly a dry cough, but it gets worse at night. My throat feels very sore.";
      } else if (text.includes("medicine") || text.includes("prescription") || text.includes("dose")) {
        responseText = "I will make sure to take the prescribed medication right after our call. Thank you!";
      } else if (text.includes("breathe") || text.includes("asthma") || text.includes("inhaler")) {
        responseText = "My breathing is okay right now, but I felt some tightness earlier today which is why I got worried.";
      }

      setMessages((prev) => [
        ...prev,
        {
          sender: "patient",
          text: responseText,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    }, 1500);
  };

  return (
    <div className="fixed inset-0 bg-[#0F111A] z-[9999] flex flex-col md:flex-row font-outfit overflow-hidden animate-fade-in text-white">
      {/* Video Call Screen (Left Side) */}
      <div className="flex-1 flex flex-col relative h-[65vh] md:h-full">
        {/* Connection Status / Duration */}
        <div className="absolute top-6 left-6 z-10 bg-black/60 backdrop-blur px-4 py-2 rounded-full flex items-center gap-3">
          <div className={`w-2.5 h-2.5 rounded-full ${isCallConnected ? "bg-green-500 animate-pulse" : "bg-yellow-500"}`}></div>
          <span className="text-xs font-medium tracking-wider">
            {isCallConnected ? `CONNECTED • ${formatDuration(callDuration)}` : "CONNECTING..."}
          </span>
        </div>

        {/* Big Video Area (Patient) */}
        <div className="flex-1 bg-[#1A1F2C] relative overflow-hidden flex items-center justify-center">
          {/* Patient Image Placeholder */}
          {isVideoOff ? (
            <div className="flex flex-col items-center justify-center text-gray-400">
              <div className="w-24 h-24 rounded-full bg-gray-700/50 flex items-center justify-center text-4xl mb-4 font-bold">
                {patient.name[0]}
              </div>
              <p className="text-sm">Patient's Camera is Off</p>
            </div>
          ) : (
            <div className="w-full h-full relative">
              <img
                src={patient.avatar}
                alt={patient.name}
                className="w-full h-full object-cover opacity-90 blur-[1px] md:blur-none"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    "https://api.builder.io/api/v1/image/assets/TEMP/f3dc26797671e7caea0bc2f0647901599c916831?width=72";
                }}
              />
              {/* Overlay styling for simulated video look */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/30 pointer-events-none"></div>
              {/* Patient Name Tag */}
              <div className="absolute bottom-6 left-6 bg-black/40 backdrop-blur px-3 py-1.5 rounded-[8px] text-sm">
                {patient.name} ({patient.age} y/o) - Patient
              </div>
            </div>
          )}

          {/* Doctor Preview PiP (Picture in Picture) */}
          <div className="absolute top-6 right-6 w-32 h-44 bg-[#1F2937] border-2 border-white/20 rounded-[12px] overflow-hidden shadow-2xl z-10 hidden sm:block">
            <div className="w-full h-full bg-[#111827] relative flex items-center justify-center">
              <div className="absolute inset-0 bg-gradient-to-tr from-blue-600/20 to-transparent z-0"></div>
              <div className="w-12 h-12 rounded-full bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] flex items-center justify-center font-bold text-lg text-white z-10">
                DR
              </div>
              <span className="absolute bottom-2 left-2 text-[10px] text-white/80 bg-black/40 px-1.5 py-0.5 rounded z-10">
                You
              </span>
            </div>
          </div>
        </div>

        {/* Video Control Buttons */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 bg-black/75 backdrop-blur-md px-6 py-4 rounded-full flex items-center gap-6 shadow-2xl z-10">
          {/* Mute Audio */}
          <button
            onClick={() => setIsMuted(!isMuted)}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 ${
              isMuted ? "bg-red-500/80 text-white" : "bg-white/10 hover:bg-white/20 text-white"
            }`}
            title={isMuted ? "Unmute Mic" : "Mute Mic"}
          >
            {isMuted ? (
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18" />
              </svg>
            ) : (
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            )}
          </button>

          {/* Toggle Video */}
          <button
            onClick={() => setIsVideoOff(!isVideoOff)}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 ${
              isVideoOff ? "bg-red-500/80 text-white" : "bg-white/10 hover:bg-white/20 text-white"
            }`}
            title={isVideoOff ? "Turn Video On" : "Turn Video Off"}
          >
            {isVideoOff ? (
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18" />
              </svg>
            ) : (
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            )}
          </button>

          {/* Share Screen */}
          <button
            onClick={() => setIsSharingScreen(!isSharingScreen)}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 ${
              isSharingScreen ? "bg-[#5476FC] text-white" : "bg-white/10 hover:bg-white/20 text-white"
            }`}
            title="Share Screen"
          >
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </button>

          {/* End Call */}
          <button
            onClick={onClose}
            className="w-14 h-14 bg-red-600 hover:bg-red-700 text-white rounded-full flex items-center justify-center shadow-lg transition-all duration-150 transform hover:scale-105"
            title="End Consultation"
          >
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 8l2 2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v2a2 2 0 001.242 1.844l.896.398a6.001 6.001 0 007.715 7.715l.398.896A2 2 0 0015 19h2a2 2 0 002-2v-2a2 2 0 00-1.242-1.844l-.896-.398a6 6 0 00-7.715-7.715l-.398-.896A2 2 0 007 5V3H5z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Chat Pane (Right Side) */}
      <div className="w-full md:w-[380px] bg-[#151821] border-t md:border-t-0 md:border-l border-white/10 flex flex-col h-[35vh] md:h-full">
        {/* Chat Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="font-semibold text-sm">Consultation Chat</span>
            <span className="text-[10px] text-white/50">{patient.name}</span>
          </div>
          <div className="bg-white/10 text-[10px] px-2 py-0.5 rounded font-mono">
            SECURE
          </div>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4 flex flex-col min-h-0 select-text">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex flex-col max-w-[80%] ${
                msg.sender === "doctor" ? "align-end self-end items-end" : "align-start self-start items-start"
              }`}
            >
              <div
                className={`p-3 rounded-[12px] text-xs leading-relaxed ${
                  msg.sender === "doctor"
                    ? "bg-[#5476FC] text-white rounded-tr-none"
                    : "bg-white/10 text-white/90 rounded-tl-none"
                }`}
              >
                {msg.text}
              </div>
              <span className="text-[9px] text-white/40 mt-1">{msg.time}</span>
            </div>
          ))}
          <div ref={messagesEndRef}></div>
        </div>

        {/* Chat Input */}
        <form onSubmit={handleSendMessage} className="p-4 border-t border-white/10 bg-[#0F111A]">
          <div className="flex gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ask patient about symptoms..."
              className="flex-1 bg-white/5 border border-white/10 rounded-[12px] px-3.5 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#5476FC] text-white"
            />
            <button
              type="submit"
              className="bg-[#5476FC] hover:bg-[#4065FB] text-white px-4 rounded-[12px] flex items-center justify-center transition-all duration-150"
            >
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
