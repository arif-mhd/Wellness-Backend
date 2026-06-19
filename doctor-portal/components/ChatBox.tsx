import React, { useState } from "react";

export default function ChatBox({ onClose }: { onClose: () => void }) {
  const [messages, setMessages] = useState([
    { id: 1, sender: "patient", text: "Hello doctor, I have a question about my prescription.", time: "10:00 AM" },
    { id: 2, sender: "doctor", text: "Hi! How can I help you?", time: "10:05 AM" },
  ]);
  const [input, setInput] = useState("");

  const handleSend = () => {
    if (!input.trim()) return;
    setMessages([...messages, { id: Date.now(), sender: "doctor", text: input, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
    setInput("");
  };

  return (
    <div className="absolute right-0 top-14 bg-white border border-[#EBEEF5] rounded-2xl shadow-xl w-80 z-50 flex flex-col h-96 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#EBEEF5] bg-[#F7F9FC]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[#5476FC] text-white flex items-center justify-center font-bold text-sm">
            P
          </div>
          <div>
            <span className="font-semibold text-sm text-[#24292E]">Patient Chat</span>
            <span className="text-[10px] text-[#22C55E] block">Online</span>
          </div>
        </div>
        <button onClick={onClose} className="text-[#9EA5AD] hover:text-[#3D4B5A]">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 bg-[#F7F9FC]/50">
        {messages.map(msg => (
          <div key={msg.id} className={`flex flex-col max-w-[80%] ${msg.sender === "doctor" ? "self-end items-end" : "self-start items-start"}`}>
            <div className={`px-3 py-2 rounded-xl text-xs ${msg.sender === "doctor" ? "bg-[#5476FC] text-white rounded-tr-none" : "bg-white border border-[#EBEEF5] text-[#3D4B5A] rounded-tl-none shadow-sm"}`}>
              {msg.text}
            </div>
            <span className="text-[9px] text-[#9EA5AD] mt-1">{msg.time}</span>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="p-3 border-t border-[#EBEEF5] bg-white flex items-center gap-2">
        <input 
          type="text" 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Type a message..." 
          className="flex-1 bg-[#F7F9FC] text-[#3D4B5A] text-xs rounded-full px-4 py-2 outline-none focus:ring-1 focus:ring-[#5476FC]/30 border border-transparent focus:border-[#5476FC]/30"
        />
        <button onClick={handleSend} className="w-8 h-8 bg-[#5476FC] hover:bg-[#4361EE] rounded-full flex items-center justify-center text-white transition-colors shadow-sm">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12.8333 1.16669L6.41667 7.58335M12.8333 1.16669L8.75 12.8334C8.68352 13.0232 8.55523 13.1843 8.38541 13.2913C8.21558 13.3983 8.01394 13.445 7.8125 13.4244C7.61106 13.4037 7.42132 13.317 7.27361 13.1783C7.12591 13.0396 7.02875 12.8569 6.99792 12.6584L5.83333 7.58335L0.758333 6.41869C0.559858 6.38786 0.37715 6.2907 0.23845 6.14299C0.0997491 5.99529 0.0130635 5.80555 -0.00757967 5.60411C-0.0282228 5.40267 0.0184711 5.20103 0.125471 5.0312C0.232472 4.86138 0.393539 4.73309 0.583333 4.66669L12.8333 1.16669Z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}
