"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";

interface Message {
  id: string;
  sender: "me" | "them";
  text: string;
  time: string;
}

interface Medication {
  name: string;
  instruction: string;
}

interface ChatThread {
  id: string;
  type: "patient" | "service";
  name: string;
  email: string;
  avatar: string;
  unread: boolean;
  time: string;
  preview: string;
  summaryTitle: string;
  summaryText: string | React.ReactNode;
  medications?: Medication[];
  messages: Message[];
}

const MedicationIcon = () => (
  <svg width="24" height="24" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
    <rect width="16" height="16" rx="8" fill="url(#paint0_linear_pill)"/>
    <path d="M9.6313 8.00508L10.0157 7.6207C10.2782 7.3582 10.4094 7.01133 10.4094 6.66445C10.4094 6.31758 10.2782 5.9707 10.0157 5.7082C9.49067 5.1832 8.63755 5.1832 8.11255 5.7082L7.01567 6.80508L5.92817 7.90195C5.40317 8.42695 5.40317 9.28008 5.92817 9.80508C6.4438 10.3207 7.25942 10.3301 7.78442 9.84258" stroke="#FAFAFA" strokeWidth="0.7" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M8.46875 6.05586C8.80625 5.71836 9.34063 5.71836 9.67813 6.05586" stroke="#FAFAFA" strokeWidth="0.7" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M8.29062 8.12656L7.01562 6.80469" stroke="#FAFAFA" strokeWidth="0.7" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M9.06875 10.6863C9.84022 10.6863 10.4656 10.0609 10.4656 9.28945C10.4656 8.51798 9.84022 7.89258 9.06875 7.89258C8.29728 7.89258 7.67188 8.51798 7.67188 9.28945C7.67188 10.0609 8.29728 10.6863 9.06875 10.6863Z" stroke="#FAFAFA" strokeWidth="0.7" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M8.08447 10.2828L10.0626 8.30469" stroke="#FAFAFA" strokeWidth="0.7" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
    <defs>
      <linearGradient id="paint0_linear_pill" x1="8" y1="0" x2="8" y2="16" gradientUnits="userSpaceOnUse">
        <stop stopColor="#8AA0FF"/>
        <stop offset="1" stopColor="#5476FC"/>
      </linearGradient>
    </defs>
  </svg>
);

export default function MessagesPage() {
  const [activeTab, setActiveTab] = useState<"All" | "Unread">("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeChatId, setActiveChatId] = useState("chat-1");
  const [inputText, setInputText] = useState("");

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Hardcoded Chat Threads matching Figma specifications
  const [chatThreads, setChatThreads] = useState<ChatThread[]>([
    {
      id: "chat-1",
      type: "service",
      name: "Wellness Pharmacy",
      email: "mail@example.com",
      avatar: "https://api.builder.io/api/v1/image/assets/TEMP/a71684e21beb4bbcf6a014029080831ad0ca7229?width=72",
      unread: true,
      time: "11:02 AM",
      preview: "The CBC and BMP results are now available. Would you like me to send them directly to your EMR system?",
      summaryTitle: "Summery of medicine history",
      summaryText: (
        <span>
          The lab report for <span className="text-[#5476FC] font-medium">Arlene McCoy</span> has been completed and is ready for review. Please check the results, update the electronic medical record (EMR), and finalize the consultation notes to ensure accurate documentation and follow-up care.
        </span>
      ),
      messages: [
        { id: "m1", sender: "them", text: "Hi Doctor", time: "11:02 AM" },
        { id: "m2", sender: "me", text: "Yes, Let’s start this meeting", time: "11:02 AM" },
        { id: "m3", sender: "them", text: "The CBC and BMP results are now available. Would you like me to send them directly to your EMR system?", time: "11:02 AM" },
        { id: "m4", sender: "me", text: "Yes, please send the CBC and BMP results directly to my EMR system. I appreciate your prompt assistance!", time: "11:02 AM" }
      ]
    },
    {
      id: "chat-4",
      type: "patient",
      name: "Bessie Cooper",
      email: "mail@example.com",
      avatar: "https://api.builder.io/api/v1/image/assets/TEMP/e6e4b8fddadb96a17705ee6b70c6d5e760e152b1?width=72",
      unread: false,
      time: "11:02 AM",
      preview: "The CBC and BMP results are now available. Would you like me to send them directly to your EMR system?",
      summaryTitle: "Summery of medicine history",
      summaryText: (
        <span>
          The lab report for <span className="text-[#5476FC] font-medium">Arlene McCoy</span> has been completed and is ready for review. Please check the results, update the electronic medical record (EMR), and finalize the consultation notes to ensure accurate documentation and follow-up care.
        </span>
      ),
      medications: [
        { name: "Paracetamol 500 mg", instruction: "Take 1 tablet every 6 hours for 5 days, with or after meals." },
        { name: "Ibuprofen 200 mg", instruction: "Take 1 tablet every 6 hours for 5 days, with or after meals." }
      ],
      messages: [
        { id: "p1", sender: "them", text: "Hi Doctor", time: "11:02 AM" },
        { id: "p2", sender: "me", text: "Yes, Let’s start this meeting", time: "11:02 AM" },
        { id: "p3", sender: "them", text: "The CBC and BMP results are now available. Would you like me to send them directly to your EMR system?", time: "11:02 AM" },
        { id: "p4", sender: "me", text: "Yes, please send the CBC and BMP results directly to my EMR system. I appreciate your prompt assistance!", time: "11:02 AM" }
      ]
    },
    {
      id: "chat-2",
      type: "service",
      name: "Message from Lab",
      email: "yelena@example.com",
      avatar: "https://api.builder.io/api/v1/image/assets/TEMP/b0fa5b18f895dcdae9d953306232e04d7859aa1a?width=72",
      unread: false,
      time: "11:02 AM",
      preview: "yelena@example.com",
      summaryTitle: "Summary of lab results",
      summaryText: (
        <span>
          Hematology and biochemistry report for <span className="text-[#5476FC] font-medium">Albert Flores</span> has been uploaded. Blood glucose levels are slightly elevated (140 mg/dL). Monitor patient during next visit.
        </span>
      ),
      messages: [
        { id: "m5", sender: "them", text: "Hello Dr. Jordan, the full profile for Albert Flores is uploaded.", time: "11:02 AM" },
        { id: "m6", sender: "me", text: "Got it, I will check the CBC panel details.", time: "11:02 AM" }
      ]
    },
    {
      id: "chat-3",
      type: "service",
      name: "Message from Lab 2",
      email: "lab2@example.com",
      avatar: "https://api.builder.io/api/v1/image/assets/TEMP/a71684e21beb4bbcf6a014029080831ad0ca7229?width=72",
      unread: false,
      time: "Yesterday",
      preview: "We have finalized the lipid profile for Savannah Nguyen.",
      summaryTitle: "Lipid Profile Savannah",
      summaryText: (
        <span>
          Savannah Nguyen's lipid panel shows total cholesterol of 190 mg/dL. Good response to dietary changes.
        </span>
      ),
      messages: [
        { id: "m7", sender: "them", text: "Lipid profile results for Savannah Nguyen are in.", time: "4:15 PM" }
      ]
    }
  ]);

  // Active chat thread
  const activeChat = useMemo(() => {
    return chatThreads.find(chat => chat.id === activeChatId) || chatThreads[0];
  }, [chatThreads, activeChatId]);

  // Scroll to bottom when messages list updates
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeChat.messages]);

  // Filter threads by search query and tabs
  const filteredThreads = useMemo(() => {
    let result = [...chatThreads];

    if (activeTab === "Unread") {
      result = result.filter(c => c.unread);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        c => c.name.toLowerCase().includes(q) || c.preview.toLowerCase().includes(q)
      );
    }

    return result;
  }, [chatThreads, activeTab, searchQuery]);

  // Mark active chat as read
  useEffect(() => {
    if (activeChat.unread) {
      setChatThreads(prev =>
        prev.map(c => (c.id === activeChat.id ? { ...c, unread: false } : c))
      );
    }
  }, [activeChatId]);

  // Handle send message
  const handleSendMessage = () => {
    if (!inputText.trim()) return;

    const newMsg: Message = {
      id: `m-${Date.now()}`,
      sender: "me",
      text: inputText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setChatThreads(prev =>
      prev.map(c => {
        if (c.id === activeChat.id) {
          return {
            ...c,
            preview: inputText,
            time: newMsg.time,
            messages: [...c.messages, newMsg]
          };
        }
        return c;
      })
    );

    setInputText("");
  };

  return (
    <div className="w-full min-h-full px-6 xl:px-[40px] py-8 font-outfit select-none bg-[#F7F9FC]">
      <div className="flex flex-col gap-8">
        
        {/* Title */}
        <h1 className="text-[#383F45] font-normal text-[32px] leading-none tracking-[-0.64px]">
          Messages
        </h1>

        {/* 3-Column Split Layout */}
        <div className="flex flex-col lg:flex-row gap-8 items-stretch h-[calc(100vh-230px)] min-h-[600px]">
          
          {/* COLUMN 1: Chat Threads Sidebar */}
          <div className="w-full lg:w-[372px] bg-white border border-[#EBEEF5] rounded-[12px] flex flex-col p-6 shadow-sm shrink-0">
            {/* Filter Tabs & Search Header */}
            <div className="flex justify-between items-center pb-4 border-b border-gray-100 mb-4">
              <div className="flex items-center gap-2">
                {(["All", "Unread"] as const).map((tab) => {
                  const isActive = activeTab === tab;
                  return (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`px-4 py-2 rounded-full text-[14px] font-normal transition-all ${
                        isActive
                          ? "bg-[#2E344E] text-white"
                          : "bg-white text-[#222530] hover:bg-gray-100 border border-gray-100 shadow-sm"
                      }`}
                    >
                      {tab}
                    </button>
                  );
                })}
              </div>

              {/* Sub Search input */}
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search chats..."
                  className="bg-gray-50 border border-gray-200 text-xs px-3 py-1.5 pl-8 rounded-full outline-none focus:border-[#8AA0FF] w-[130px] transition-all"
                />
                <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>

            {/* List of Threads */}
            <div className="flex-1 overflow-y-auto flex flex-col gap-2 pr-1">
              {filteredThreads.map((thread) => {
                const isActive = thread.id === activeChat.id;
                return (
                  <div key={thread.id} className="flex flex-col">
                    <div
                      onClick={() => setActiveChatId(thread.id)}
                      className={`flex items-center gap-4 p-3 rounded-[8px] cursor-pointer transition-all duration-200 ${
                        isActive
                          ? "bg-[#EEF1FF]/60 border border-[#8AA0FF]/40 shadow-sm"
                          : "hover:bg-gray-50 border border-transparent"
                      }`}
                    >
                      {/* Avatar */}
                      <div className="relative flex-shrink-0">
                        <img
                          src={thread.avatar}
                          alt={thread.name}
                          className="w-9 h-9 rounded-full object-cover border border-gray-100 shadow-sm"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              "https://api.builder.io/api/v1/image/assets/TEMP/a71684e21beb4bbcf6a014029080831ad0ca7229?width=72";
                          }}
                        />
                        {thread.unread && (
                          <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-red-500 rounded-full border-2 border-white animate-pulse" />
                        )}
                      </div>

                      {/* Info preview */}
                      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                        <div className="flex justify-between items-baseline">
                          <span className="text-[#24292E] font-medium text-[14px] truncate leading-tight">
                            {thread.name}
                          </span>
                          <span className="text-gray-400 text-[10px] whitespace-nowrap">
                            {thread.time}
                          </span>
                        </div>
                        <p className={`text-[12px] leading-tight truncate ${thread.unread ? "text-[#24292E] font-semibold" : "text-[#9EA5AD]"}`}>
                          {thread.preview}
                        </p>
                      </div>
                    </div>
                    <div className="h-[1px] bg-[#EBEEF5] my-1 mx-2" />
                  </div>
                );
              })}
            </div>
          </div>

          {/* COLUMN 2: Chat Main Conversation Window */}
          <div className="flex-1 bg-[#F5F6FA] border border-white rounded-[12px] flex flex-col p-6 shadow-sm relative justify-between overflow-hidden">
            
            {/* Chat Window Header */}
            <div className="flex items-center gap-4 pb-4 border-b border-[#EBEEF5] mb-4 shrink-0 select-none">
              <img
                src={activeChat.avatar}
                alt={activeChat.name}
                className="w-9 h-9 rounded-full object-cover border border-gray-200"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    "https://api.builder.io/api/v1/image/assets/TEMP/a71684e21beb4bbcf6a014029080831ad0ca7229?width=72";
                }}
              />
              <div className="flex flex-col">
                <span className="text-[#24292E] font-medium text-[14px] leading-tight">
                  {activeChat.name}
                </span>
                <span className="text-[#9EA5AD] text-[12px]">
                  {activeChat.email}
                </span>
              </div>
            </div>

            {/* Conversation Bubbles Area */}
            <div className="flex-1 overflow-y-auto pr-2 flex flex-col gap-4 mb-4 min-h-0">
              {activeChat.messages.map((msg, idx) => {
                const isMe = msg.sender === "me";
                
                // Group messages or display custom TODAY indicator if it's the middle message
                const showTodayDivider = idx === 2;

                return (
                  <React.Fragment key={msg.id}>
                    {showTodayDivider && (
                      <div className="flex items-center justify-center my-3 select-none">
                        <span className="text-[#A8A8A8] text-[10px] font-medium tracking-[1.5px] uppercase">
                          TODAY
                        </span>
                      </div>
                    )}
                    <div className={`flex flex-col ${isMe ? "items-end" : "items-start"} gap-1`}>
                      <div
                        className={`max-w-[85%] px-4 py-2.5 rounded-[12px] text-[14px] leading-relaxed shadow-sm ${
                          isMe
                            ? "bg-[#E0E7FF] text-[#182A6F] rounded-tr-none"
                            : "bg-white text-[#24292E] rounded-tl-none"
                        }`}
                      >
                        {msg.text}
                      </div>
                      <span className="text-gray-400 text-[10px] px-1 select-none">
                        {msg.time}
                      </span>
                    </div>
                  </React.Fragment>
                );
              })}
              <div ref={chatEndRef} />
            </div>

            {/* Message Input Controls */}
            <div className="flex items-center gap-3 bg-[#F6F6F6] rounded-[88px] p-1.5 shrink-0 border border-[#EBEEF5]">
              {/* Attachment Paperclip Button */}
              <button 
                onClick={() => alert("Attachment upload requested")}
                className="w-10 h-10 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636l-3.536 3.536m0 0l-3.536 3.536m3.536-3.536L15 12M9.172 9.172a4 4 0 015.656 0L20 14a8 8 0 11-11.314-11.314l5.657-5.657" />
                </svg>
              </button>

              {/* Text Input */}
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSendMessage();
                }}
                placeholder="Type Something..."
                className="flex-1 bg-transparent text-[#24292E] placeholder-[#8D8F98] text-[14px] outline-none px-2"
              />

              {/* Send Button */}
              <button
                onClick={handleSendMessage}
                disabled={!inputText.trim()}
                className={`w-[44px] h-[44px] rounded-full flex items-center justify-center text-white transition-all shadow-sm ${
                  inputText.trim()
                    ? "bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] hover:opacity-90"
                    : "bg-[#8AA0FF]/50 cursor-not-allowed"
                }`}
              >
                <svg width="20" height="20" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9.2501 7.90019L19.8626 4.36269C24.6251 2.77519 27.2126 5.37519 25.6376 10.1377L22.1001 20.7502C19.7251 27.8877 15.8251 27.8877 13.4501 20.7502L12.4001 17.6002L9.2501 16.5502C2.1126 14.1752 2.1126 10.2877 9.2501 7.90019Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M12.6375 17.0617L17.1125 12.5742" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
          </div>

          {/* COLUMN 3: Active Chat Details Info Panel */}
          <div className="w-full lg:w-[372px] bg-white border border-[#EBEEF5] rounded-[12px] flex flex-col p-6 shadow-sm shrink-0 justify-start gap-6 font-outfit select-none overflow-y-auto max-h-full">
            {/* Header info */}
            <div className="flex items-center gap-4 pb-4 border-b border-gray-100">
              <img
                src={activeChat.avatar}
                alt={activeChat.name}
                className="w-10 h-10 rounded-full object-cover border border-gray-200 shadow-sm"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    "https://api.builder.io/api/v1/image/assets/TEMP/a71684e21beb4bbcf6a014029080831ad0ca7229?width=72";
                }}
              />
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-[#24292E] font-medium text-[14px] leading-tight truncate">
                  {activeChat.name}
                </span>
                <span className="text-[#9EA5AD] text-[12px] truncate">
                  {activeChat.email}
                </span>
              </div>
            </div>

            {/* Patient Mode Extra Components */}
            {activeChat.type === "patient" && (
              <>
                {/* Orders Details Button */}
                <button
                  onClick={() => alert("Orders Details requested")}
                  className="w-full flex items-center justify-center py-2 px-4 rounded-[12px] bg-[#E0E7FF] text-[#182A6F] font-medium text-[13px] hover:opacity-90 transition-opacity"
                >
                  Orders Details
                </button>

                {/* Medications List */}
                <div className="flex flex-col gap-4">
                  {activeChat.medications?.map((med, index) => (
                    <div key={index} className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <MedicationIcon />
                        <span className="text-[#24292E] text-[12px] font-medium leading-none">
                          {med.name}
                        </span>
                      </div>
                      <p className="text-[#676E76] text-[12px] leading-relaxed">
                        {med.instruction}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="h-[1px] bg-[#EBEEF5]" />
              </>
            )}

            {/* Medicine Summary Detail Panel */}
            <div className="flex flex-col gap-3 bg-[#F7F9FF] p-5 rounded-[12px] border border-[#EBEEF5]">
              <h3 className="text-[#24292E] font-medium text-[12px] uppercase tracking-[0.5px]">
                {activeChat.summaryTitle}
              </h3>
              <p className="text-[#676E76] text-[13px] leading-relaxed">
                {activeChat.summaryText}
              </p>
            </div>

            {/* Patient Mode Remind Consultation Button */}
            {activeChat.type === "patient" && (
              <button
                onClick={() => alert(`Consultation Reminder sent to ${activeChat.name}!`)}
                className="w-full flex items-center justify-center py-3 px-4 rounded-[12px] bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] text-white font-medium text-[14px] hover:opacity-90 transition-opacity mt-auto shadow-sm"
              >
                Remind of Consultation
              </button>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
