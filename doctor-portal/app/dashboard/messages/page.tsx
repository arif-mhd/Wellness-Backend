"use client";

import { Suspense, useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Session from "supertokens-web-js/recipe/session";
import { apiFetch } from "@/lib/apiFetch";
import { Room, RoomEvent } from "livekit-client";

interface Conversation {
  conversationId: string;
  otherPartyId: string;
  otherPartyName: string;
  otherPartyRole: string;
  otherPartyAvatarUrl?: string | null;
  lastMessage?: { text: string; createdAt: string; senderRole: string } | null;
  unreadCount: number;
}

interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderRole: "patient" | "doctor";
  text: string;
  createdAt: string;
  isRead: boolean;
}

function fmtTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function Avatar({ name, avatarUrl, size = 40 }: { name: string; avatarUrl?: string | null; size?: number }) {
  const initials = name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  const colors = ["#5476fc", "#0abc49", "#f59e0b", "#e84949", "#8b5cf6", "#06b6d4"];
  const bg = colors[initials.charCodeAt(0) % colors.length];

  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt={name}
        style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
      />
    );
  }
  return (
    <div
      style={{
        width: size, height: size, borderRadius: "50%", backgroundColor: bg,
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "#fff", fontWeight: 600, fontSize: size * 0.33, flexShrink: 0,
      }}
    >
      {initials}
    </div>
  );
}

function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}
function MessageSquareIcon({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
    </svg>
  );
}
function SendIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}
function SpinnerIcon({ size = 24 }: { size?: number }) {
  return (
    <div
      style={{
        width: size, height: size, borderRadius: "50%",
        border: "2.5px solid #eaecf0", borderTopColor: "#5476fc",
        animation: "spin 0.8s linear infinite",
      }}
    />
  );
}

function MessagesPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const targetPatientId = searchParams.get("patientId");
  const [conversations, setConversations]     = useState<Conversation[]>([]);
  const [filtered, setFiltered]               = useState<Conversation[]>([]);
  const [searchQuery, setSearchQuery]         = useState("");
  const [selectedConv, setSelectedConv]       = useState<Conversation | null>(null);
  const [messages, setMessages]               = useState<ChatMessage[]>([]);
  const [inputText, setInputText]             = useState("");
  const [loadingConvs, setLoadingConvs]       = useState(true);
  const [loadingMsgs, setLoadingMsgs]         = useState(false);
  const [sending, setSending]                 = useState(false);
  const [connected, setConnected]             = useState(false);
  const [myUserId, setMyUserId]               = useState<string>("");
  const [myName, setMyName]                   = useState("Doctor");

  const roomRef = useRef<Room | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // ── Fetch doctor identity ──────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const uid = await Session.getUserId().catch(() => null);
      if (!uid) { router.push("/auth/login"); return; }
      setMyUserId(uid);

      try {
        const r = await apiFetch("/api/doctors/me");
        if (r.ok) {
          const { doctor } = await r.json();
          if (doctor?.fullName) setMyName(doctor.fullName);
        }
      } catch { /* keep default name */ }
    })();
  }, [router]);

  // ── Fetch conversations ────────────────────────────────────────────────────
  const fetchConversations = useCallback(async () => {
    try {
      const r = await apiFetch("/api/messages/conversations");
      if (r.ok) {
        const d = await r.json();
        setConversations(d.conversations ?? []);
        setFiltered(d.conversations ?? []);
      }
    } catch (e) {
      console.error("fetchConversations:", e);
    } finally {
      setLoadingConvs(false);
    }
  }, []);

  useEffect(() => { fetchConversations(); }, [fetchConversations]);

  // ── Auto-select conversation from patientId query param ───────────────────
  useEffect(() => {
    if (!targetPatientId || loadingConvs || conversations.length === 0) return;
    const match = conversations.find((c) => c.otherPartyId === targetPatientId);
    if (match && selectedConv?.conversationId !== match.conversationId) {
      selectConversation(match);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetPatientId, loadingConvs, conversations]);

  // ── Search filter ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!searchQuery.trim()) { setFiltered(conversations); return; }
    const q = searchQuery.toLowerCase();
    setFiltered(conversations.filter((c) => c.otherPartyName.toLowerCase().includes(q)));
  }, [searchQuery, conversations]);

  // ── Select conversation ────────────────────────────────────────────────────
  const selectConversation = useCallback(async (conv: Conversation) => {
    if (roomRef.current) {
      await roomRef.current.disconnect();
      roomRef.current = null;
      setConnected(false);
    }

    setSelectedConv(conv);
    setMessages([]);
    setLoadingMsgs(true);

    try {
      const r = await apiFetch(`/api/messages/${encodeURIComponent(conv.conversationId)}`);
      if (r.ok) {
        const d = await r.json();
        setMessages(d.messages ?? []);
      }

      const tokenRes = await apiFetch(`/api/messages/token?channel=${encodeURIComponent(conv.conversationId)}`);
      if (!tokenRes.ok) throw new Error("Could not get chat token");
      const { token: lkToken, wsUrl } = await tokenRes.json();

      const room = new Room();
      roomRef.current = room;

      room.on(RoomEvent.DataReceived, (payload: Uint8Array) => {
        try {
          const decoded = new TextDecoder().decode(payload);
          const packet = JSON.parse(decoded);
          if (packet.type === "chat_message") {
            const newMsg: ChatMessage = {
              id: packet.id ?? `tmp_${Date.now()}`,
              conversationId: conv.conversationId,
              senderId: packet.senderId,
              senderRole: packet.senderRole,
              text: packet.text,
              createdAt: packet.createdAt ?? new Date().toISOString(),
              isRead: false,
            };
            setMessages((prev) => {
              if (prev.some((m) => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });
          }
        } catch { /* ignore parse errors */ }
      });

      room.on(RoomEvent.Connected, () => setConnected(true));
      room.on(RoomEvent.Disconnected, () => setConnected(false));

      await room.connect(wsUrl, lkToken);

    } catch (err) {
      console.error("selectConversation:", err);
    } finally {
      setLoadingMsgs(false);
    }

    setConversations((prev) =>
      prev.map((c) => c.conversationId === conv.conversationId ? { ...c, unreadCount: 0 } : c)
    );
  }, []);

  // ── Auto scroll ────────────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Send message ───────────────────────────────────────────────────────────
  const handleSend = useCallback(async () => {
    if (!inputText.trim() || !selectedConv || sending) return;
    const text = inputText.trim();
    setInputText("");
    setSending(true);

    const optimisticMsg: ChatMessage = {
      id: `opt_${Date.now()}`,
      conversationId: selectedConv.conversationId,
      senderId: myUserId,
      senderRole: "doctor",
      text,
      createdAt: new Date().toISOString(),
      isRead: true,
    };
    setMessages((prev) => [...prev, optimisticMsg]);

    try {
      const r = await apiFetch(
        `/api/messages/${encodeURIComponent(selectedConv.conversationId)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        }
      );

      let savedMsg: ChatMessage | null = null;
      if (r.ok) {
        const d = await r.json();
        savedMsg = d.message;
        if (savedMsg) {
          setMessages((prev) =>
            prev.map((m) => m.id === optimisticMsg.id ? savedMsg! : m)
          );
        }
      }

      if (roomRef.current && roomRef.current.state === "connected") {
        const packet = {
          type: "chat_message",
          id: savedMsg?.id ?? optimisticMsg.id,
          senderId: myUserId,
          senderRole: "doctor",
          senderName: myName,
          text,
          createdAt: savedMsg?.createdAt ?? optimisticMsg.createdAt,
        };
        const data = new TextEncoder().encode(JSON.stringify(packet));
        await roomRef.current.localParticipant.publishData(data, { reliable: true });
      }

      setConversations((prev) =>
        prev.map((c) =>
          c.conversationId === selectedConv.conversationId
            ? { ...c, lastMessage: { text, createdAt: new Date().toISOString(), senderRole: "doctor" } }
            : c
        )
      );

    } catch (err) {
      console.error("handleSend:", err);
      setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id));
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }, [inputText, selectedConv, sending, myUserId, myName]);

  // ── Cleanup on unmount ─────────────────────────────────────────────────────
  useEffect(() => {
    return () => { roomRef.current?.disconnect(); };
  }, []);

  const totalUnread = conversations.reduce((acc, c) => acc + c.unreadCount, 0);

  return (
    <div style={{ display: "flex", height: "calc(100vh - 48px)", background: "#f4f5fa", overflow: "hidden" }}>
      <style dangerouslySetInnerHTML={{ __html: `@keyframes spin{to{transform:rotate(360deg)}}` }} />

      {/* ── Left panel: conversation list ── */}
      <div style={{ width: 320, borderRight: "1px solid #eaecf0", background: "#fff", display: "flex", flexDirection: "column", flexShrink: 0 }}>
        <div style={{ padding: "20px 20px 12px", borderBottom: "1px solid #f4f5fa" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <h1 style={{ fontSize: 18, fontWeight: 700, color: "#24292e", flex: 1 }}>Messages</h1>
            {totalUnread > 0 && (
              <span style={{
                padding: "2px 8px", borderRadius: 999, background: "#e84949", color: "#fff",
                fontSize: 11, fontWeight: 700,
              }}>
                {totalUnread}
              </span>
            )}
          </div>
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#9ea5ad" }}>
              <SearchIcon />
            </span>
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search patients..."
              style={{
                width: "100%", paddingLeft: 32, paddingRight: 12, paddingTop: 8, paddingBottom: 8,
                border: "1px solid #eaecf0", borderRadius: 8, fontSize: 13, outline: "none",
                background: "#f8f9fc", color: "#24292e", boxSizing: "border-box",
              }}
            />
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto" }}>
          {loadingConvs ? (
            <div style={{ display: "flex", justifyContent: "center", marginTop: 40 }}>
              <SpinnerIcon />
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 20px", color: "#9ea5ad" }}>
              <div style={{ opacity: 0.4, marginBottom: 12 }}><MessageSquareIcon /></div>
              <p style={{ fontSize: 13 }}>
                {conversations.length === 0
                  ? "No patient conversations yet. Patients can message you after booking an appointment."
                  : "No results found."}
              </p>
            </div>
          ) : (
            filtered.map((conv) => {
              const isSelected = selectedConv?.conversationId === conv.conversationId;
              return (
                <button
                  key={conv.conversationId}
                  onClick={() => selectConversation(conv)}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", gap: 12,
                    padding: "14px 20px", border: "none", cursor: "pointer", textAlign: "left",
                    background: isSelected ? "#f0f3ff" : "#fff",
                    borderLeft: isSelected ? "3px solid #5476fc" : "3px solid transparent",
                    transition: "background 0.15s",
                  }}
                >
                  <div style={{ position: "relative" }}>
                    <Avatar name={conv.otherPartyName} avatarUrl={conv.otherPartyAvatarUrl} size={42} />
                    {conv.unreadCount > 0 && (
                      <span style={{
                        position: "absolute", top: -2, right: -2, width: 16, height: 16,
                        borderRadius: "50%", background: "#5476fc", color: "#fff",
                        fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center",
                        border: "2px solid #fff",
                      }}>
                        {conv.unreadCount > 9 ? "9+" : conv.unreadCount}
                      </span>
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <p style={{ fontSize: 14, fontWeight: conv.unreadCount > 0 ? 700 : 600, color: "#24292e", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {conv.otherPartyName}
                      </p>
                      {conv.lastMessage && (
                        <span style={{ fontSize: 11, color: "#9ea5ad", flexShrink: 0, marginLeft: 8 }}>
                          {fmtTime(conv.lastMessage.createdAt)}
                        </span>
                      )}
                    </div>
                    <p style={{
                      fontSize: 12, color: conv.unreadCount > 0 ? "#5476fc" : "#9ea5ad",
                      margin: "2px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      fontWeight: conv.unreadCount > 0 ? 600 : 400,
                    }}>
                      {conv.lastMessage
                        ? `${conv.lastMessage.senderRole === "doctor" ? "You: " : ""}${conv.lastMessage.text}`
                        : "Tap to start chatting"}
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ── Right panel: chat window ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {!selectedConv ? (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#9ea5ad" }}>
            <div style={{ width: 72, height: 72, borderRadius: "50%", background: "#f0f3ff", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16, color: "#5476fc" }}>
              <MessageSquareIcon />
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: "#24292e", marginBottom: 8 }}>Select a conversation</h2>
            <p style={{ fontSize: 14, textAlign: "center", maxWidth: 280 }}>
              Choose a patient from the list to view and send messages.
            </p>
          </div>
        ) : (
          <>
            <div style={{
              padding: "16px 24px", borderBottom: "1px solid #eaecf0", background: "#fff",
              display: "flex", alignItems: "center", gap: 12,
            }}>
              <Avatar name={selectedConv.otherPartyName} avatarUrl={selectedConv.otherPartyAvatarUrl} size={40} />
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 700, color: "#24292e", margin: 0, fontSize: 15 }}>{selectedConv.otherPartyName}</p>
                <p style={{ fontSize: 12, color: "#9ea5ad", margin: "2px 0 0" }}>Patient</p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: connected ? "#0abc49" : "#9ea5ad", display: "inline-block" }} />
                <span style={{ fontSize: 12, color: connected ? "#0abc49" : "#9ea5ad" }}>
                  {connected ? "Connected" : "Connecting..."}
                </span>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 8 }}>
              {loadingMsgs ? (
                <div style={{ display: "flex", justifyContent: "center", marginTop: 40 }}>
                  <SpinnerIcon />
                </div>
              ) : messages.length === 0 ? (
                <div style={{ textAlign: "center", marginTop: 60, color: "#9ea5ad" }}>
                  <p style={{ fontSize: 14 }}>No messages yet. Say hello!</p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMe = msg.senderId === myUserId;
                  return (
                    <div key={msg.id} style={{ display: "flex", justifyContent: isMe ? "flex-end" : "flex-start", alignItems: "flex-end", gap: 8 }}>
                      {!isMe && (
                        <Avatar name={selectedConv.otherPartyName} avatarUrl={selectedConv.otherPartyAvatarUrl} size={28} />
                      )}
                      <div>
                        <div style={{
                          maxWidth: 440, padding: "10px 14px", borderRadius: isMe ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                          background: isMe ? "#5476fc" : "#fff",
                          color: isMe ? "#fff" : "#24292e",
                          fontSize: 14, lineHeight: 1.5,
                          boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                          wordBreak: "break-word",
                        }}>
                          {msg.text}
                        </div>
                        <p style={{ fontSize: 10, color: "#9ea5ad", margin: "4px 2px 0", textAlign: isMe ? "right" : "left" }}>
                          {fmtTime(msg.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            <div style={{ padding: "16px 24px", borderTop: "1px solid #eaecf0", background: "#fff" }}>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <input
                  ref={inputRef}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  placeholder={`Message ${selectedConv.otherPartyName}...`}
                  style={{
                    flex: 1, padding: "12px 18px", borderRadius: 28, border: "1.5px solid #eaecf0",
                    fontSize: 14, outline: "none", background: "#f8f9fc", color: "#24292e",
                    transition: "border-color 0.15s",
                  }}
                  onFocus={(e) => { e.target.style.borderColor = "#5476fc"; }}
                  onBlur={(e) => { e.target.style.borderColor = "#eaecf0"; }}
                />
                <button
                  onClick={handleSend}
                  disabled={!inputText.trim() || sending}
                  style={{
                    width: 48, height: 48, borderRadius: "50%", border: "none", cursor: "pointer",
                    background: inputText.trim() ? "#5476fc" : "#eaecf0",
                    color: inputText.trim() ? "#fff" : "#9ea5ad",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "all 0.15s", flexShrink: 0,
                  }}
                >
                  {sending ? <SpinnerIcon size={18} /> : <SendIcon />}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function MessagesPage() {
  return (
    <Suspense fallback={
      <div style={{ display: "flex", height: "calc(100vh - 48px)", alignItems: "center", justifyContent: "center" }}>
        <SpinnerIcon size={32} />
      </div>
    }>
      <MessagesPageInner />
    </Suspense>
  );
}
