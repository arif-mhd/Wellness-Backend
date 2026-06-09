"use client";

import { useState, useRef, useEffect } from "react";

interface Message {
  id: number;
  sender: string;
  avatar: string;
  text: string;
  time: string;
  isDoctor: boolean;
}

export default function ChatTranscript() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      sender: "Kathryn Murphy",
      avatar: "/patient-avatar-1.png",
      text: "Good afternoon, everyone.",
      time: "11:02 AM",
      isDoctor: false,
    },
    {
      id: 2,
      sender: "Joshua Abraham",
      avatar: "/doctor-avatar.png",
      text: "Yes, Let's start this meeting",
      time: "11:02 AM",
      isDoctor: true,
    },
    {
      id: 3,
      sender: "Kathryn Murphy",
      avatar: "/patient-avatar-1.png",
      text: "I've had a fever for three days with chills, body aches, and fatigue.",
      time: "11:02 AM",
      isDoctor: false,
    },
    {
      id: 4,
      sender: "Kathryn Murphy",
      avatar: "/patient-avatar-1.png",
      text: "I've had a fever for three days with chills, body aches, and fatigue.",
      time: "11:02 AM",
      isDoctor: false,
    },
    {
      id: 5,
      sender: "Joshua Abraham",
      avatar: "/doctor-avatar.png",
      text: "Yes, Let's start this meeting",
      time: "11:02 AM",
      isDoctor: true,
    },
  ]);

  const [inputText, setInputText] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const isFirstRender = useRef(true);

  // Auto-scroll to bottom ONLY when a new message is sent (not on initial mount)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!inputText.trim()) return;

    const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const newMessage: Message = {
      id: messages.length + 1,
      sender: "Dr. Jordan Anderson",
      avatar: "/doctor-avatar.png",
      text: inputText.trim(),
      time: timeString,
      isDoctor: true,
    };

    setMessages([...messages, newMessage]);
    setInputText("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSend();
    }
  };

  return (
    <div className="bg-[#F5F6FA] rounded-2xl p-5 flex flex-col gap-4 h-[440px] border border-[#EBEEF5]">
      {/* Messages List Container */}
      <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-4 scrollbar-thin scrollbar-thumb-slate-200">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start gap-3 max-w-[85%] ${
              msg.isDoctor ? "self-end flex-row-reverse" : "self-start"
            }`}
          >
            {/* Avatar */}
            <div className="w-9 h-9 rounded-full overflow-hidden shrink-0 border border-white shadow-sm">
              <img
                src={msg.avatar}
                alt={msg.sender}
                className="w-full h-full object-cover"
                onError={(e) => {
                  // Fallback if avatar fails to render
                  (e.target as HTMLImageElement).src = "/doctor-avatar.png";
                }}
              />
            </div>

            {/* Bubble details */}
            <div className={`flex flex-col gap-1 ${msg.isDoctor ? "items-end" : "items-start"}`}>
              {/* Name */}
              <span className="text-[#676E76] text-[10px] font-semibold tracking-wide">
                {msg.sender}
              </span>

              {/* Text box */}
              <div
                className={`px-4 py-3 rounded-2xl text-xs leading-relaxed shadow-sm font-medium ${
                  msg.isDoctor
                    ? "bg-gradient-to-br from-[#869DFE] to-[#5476FC] text-white rounded-tr-none"
                    : "bg-white text-[#383F45] rounded-tl-none border border-[#EBEEF5]"
                }`}
              >
                {msg.text}
              </div>

              {/* Time */}
              <span className="text-[#9EA5AD] text-[9px] mt-0.5 font-medium px-1">
                {msg.time}
              </span>
            </div>
          </div>
        ))}
        {/* Anchor element for auto scrolling */}
        <div ref={scrollRef} />
      </div>

      {/* Input panel */}
      <div className="w-full h-[52px] bg-white rounded-full border border-[#EBEEF5] px-4 flex items-center gap-3 shadow-[0_2px_8px_rgba(0,0,0,0.03)] focus-within:ring-2 focus-within:ring-[#5476FC]/25 transition-all">
        {/* Attachment button */}
        <button
          title="Attach file"
          onClick={() => alert("File attachment triggered (mock).")}
          className="p-1 text-[#9EA5AD] hover:text-[#5476FC] transition-colors shrink-0"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
          </svg>
        </button>

        {/* Input */}
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type Something..."
          className="flex-1 bg-transparent border-none outline-none text-[#383F45] text-xs placeholder-[#9EA5AD] font-medium"
        />

        {/* Send Button */}
        <button
          onClick={handleSend}
          title="Send Message"
          disabled={!inputText.trim()}
          className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 shadow-md transition-all duration-200 ${
            inputText.trim()
              ? "bg-gradient-to-b from-[#869DFE] to-[#5476FC] text-white hover:scale-105 active:scale-95"
              : "bg-[#F5F6FA] text-[#9EA5AD] cursor-not-allowed shadow-none"
          }`}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="translate-x-[0.5px]">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>
    </div>
  );
}
