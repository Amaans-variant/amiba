"use client";

import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Phone, PhoneOff, Maximize2, X, Users, Send, Copy, Check } from "lucide-react";
import { WidgetChrome } from "@/components/ui/WidgetChrome";
import { GlassButton } from "@/components/ui/GlassButton";
import { useAuth } from "@/components/providers/AuthProvider";
import { useStudyCall } from "@/hooks/useStudyCall";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { ChatMessage, StudyRoom } from "@/types";

function generateInviteCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // skips 0/O/1/I to avoid mix-ups when read aloud
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

const STATUS_LABEL: Record<string, string> = {
  idle: "Not connected",
  connecting: "Connecting...",
  waiting: "Waiting for your friend...",
  connected: "Connected",
  ended: "Call ended",
  error: "Connection issue",
};

export function StudyCallRoom() {
  const { userId } = useAuth();
  const [room, setRoom] = useState<StudyRoom | null>(null);
  const [joinMode, setJoinMode] = useState(false);
  const [codeInput, setCodeInput] = useState("");
  const [roomError, setRoomError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const [expanded, setExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  const call = useStudyCall(room?.id ?? "", userId);

  useEffect(() => {
    if (!room) return;
    const supabase = createClient();

    supabase
      .from("chat_messages")
      .select("*")
      .eq("room_id", room.id)
      .order("created_at", { ascending: true })
      .then(({ data }) => setMessages((data as ChatMessage[]) ?? []));

    const channel = supabase
      .channel(`chat-${room.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `room_id=eq.${room.id}` },
        (payload) => setMessages((prev) => [...prev, payload.new as ChatMessage])
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [room]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const createRoom = async () => {
    setBusy(true);
    setRoomError(null);
    const supabase = createClient();
    const invite_code = generateInviteCode();
    const { data, error } = await supabase
      .from("study_rooms")
      .insert({ created_by: userId, invite_code })
      .select()
      .single();
    if (error || !data) {
      setRoomError("Couldn't create a room — try again.");
      setBusy(false);
      return;
    }
    await supabase.from("study_room_participants").insert({ room_id: data.id, user_id: userId });
    setRoom(data as StudyRoom);
    setBusy(false);
  };

  const joinRoom = async () => {
    if (!codeInput.trim()) return;
    setBusy(true);
    setRoomError(null);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("study_rooms")
      .select("*")
      .eq("invite_code", codeInput.trim().toUpperCase())
      .maybeSingle();
    if (error || !data) {
      setRoomError("No room found with that code.");
      setBusy(false);
      return;
    }
    await supabase
      .from("study_room_participants")
      .upsert({ room_id: data.id, user_id: userId }, { onConflict: "room_id,user_id" });
    setRoom(data as StudyRoom);
    setBusy(false);
  };

  const leaveRoom = () => {
    call.endCall();
    setRoom(null);
    setMessages([]);
    setExpanded(false);
    setJoinMode(false);
    setCodeInput("");
  };

  const sendChat = async () => {
    const text = draft.trim();
    if (!text || !room) return;
    setDraft("");
    const supabase = createClient();
    await supabase.from("chat_messages").insert({ room_id: room.id, user_id: userId, content: text });
  };

  const copyCode = () => {
    if (!room) return;
    navigator.clipboard
      .writeText(room.invite_code)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      })
      .catch(() => {});
  };

  const renderContent = (isExpanded: boolean) => (
    <WidgetChrome
      icon={<Users className="h-4 w-4" />}
      title="Study call"
      subtitle={room ? `Code ${room.invite_code}` : "Co-study with a friend"}
      noPadding
      actions={
        isExpanded ? (
          <button
            onClick={() => setExpanded(false)}
            className="rounded-md p-1.5 text-ink-soft transition-colors hover:bg-white/10 hover:text-ink"
          >
            <X className="h-4 w-4" />
          </button>
        ) : (
          room && (
            <button
              onClick={() => setExpanded(true)}
              className="rounded-md p-1.5 text-ink-soft transition-colors hover:bg-white/10 hover:text-ink"
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </button>
          )
        )
      }
    >
      <div className="flex h-full flex-col">
        {!room ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-4 text-center">
            {!joinMode ? (
              <>
                <GlassButton variant="primary" size="sm" onClick={createRoom} disabled={busy}>
                  Start a room
                </GlassButton>
                <button
                  onClick={() => setJoinMode(true)}
                  className="text-xs text-ink-soft underline underline-offset-2 hover:text-ink"
                >
                  Join with a code instead
                </button>
              </>
            ) : (
              <>
                <input
                  value={codeInput}
                  onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === "Enter" && joinRoom()}
                  placeholder="ABC123"
                  maxLength={6}
                  className="glass-input text-center uppercase tracking-widest"
                />
                <GlassButton variant="primary" size="sm" onClick={joinRoom} disabled={busy}>
                  Join room
                </GlassButton>
                <button onClick={() => setJoinMode(false)} className="text-xs text-ink-faint hover:text-ink-soft">
                  Back
                </button>
              </>
            )}
            {roomError && <p className="text-xs text-danger">{roomError}</p>}
          </div>
        ) : (
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between gap-2 border-b border-glass-border px-3 py-2">
              <button
                onClick={copyCode}
                className="flex items-center gap-1.5 text-[11px] text-ink-soft transition-colors hover:text-ink"
              >
                {copied ? <Check className="h-3 w-3 text-accent" /> : <Copy className="h-3 w-3" />}
                {room.invite_code}
              </button>
              <div className="flex items-center gap-1.5 text-[11px] text-ink-faint">
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    call.status === "connected" ? "animate-pulse-ring bg-accent" : "bg-ink-faint"
                  )}
                />
                {STATUS_LABEL[call.status]}
              </div>
            </div>

            {isExpanded && (
              <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-4">
                {messages.length === 0 && (
                  <p className="py-6 text-center text-xs text-ink-faint">No messages yet — say hi.</p>
                )}
                {messages.map((m) => (
                  <div key={m.id} className={cn("flex", m.user_id === userId ? "justify-end" : "justify-start")}>
                    <div
                      className={cn(
                        "max-w-[75%] rounded-xl2 px-3 py-2 text-[13px]",
                        m.user_id === userId
                          ? "bg-accent text-[#171009]"
                          : "border border-glass-border bg-white/5 text-ink"
                      )}
                    >
                      {m.content}
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
            )}

            <div className="mt-auto flex flex-col gap-2 p-3">
              {call.error && <p className="text-[11px] text-danger">{call.error}</p>}
              <div className="flex items-center justify-center gap-3">
                {call.status === "idle" || call.status === "ended" || call.status === "error" ? (
                  <GlassButton variant="primary" size="sm" onClick={() => call.startCall()}>
                    <Phone className="h-3.5 w-3.5" /> Start call
                  </GlassButton>
                ) : (
                  <>
                    <GlassButton size="sm" onClick={call.toggleMute}>
                      {call.muted ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
                    </GlassButton>
                    <GlassButton variant="danger" size="sm" onClick={call.endCall}>
                      <PhoneOff className="h-3.5 w-3.5" />
                    </GlassButton>
                  </>
                )}
                <GlassButton size="sm" onClick={leaveRoom}>
                  Leave
                </GlassButton>
              </div>
              {isExpanded && (
                <div className="flex gap-2">
                  <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendChat()}
                    placeholder="Message..."
                    className="glass-input"
                  />
                  <GlassButton size="sm" onClick={sendChat} aria-label="Send">
                    <Send className="h-3.5 w-3.5" />
                  </GlassButton>
                </div>
              )}
            </div>
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <audio ref={call.remoteAudioRef} autoPlay className="hidden" />
          </div>
        )}
      </div>
    </WidgetChrome>
  );

  return (
    <>
      <div className="h-full">
        {!expanded ? (
          <motion.div layoutId="study-call-card" className="h-full">
            {renderContent(false)}
          </motion.div>
        ) : (
          <div className="glass-panel flex h-full flex-col items-center justify-center gap-2 text-ink-faint">
            <Users className="h-5 w-5" />
            <button
              onClick={() => setExpanded(false)}
              className="text-xs underline underline-offset-2 hover:text-ink-soft"
            >
              Bring back
            </button>
          </div>
        )}
      </div>

      {mounted &&
        createPortal(
          <AnimatePresence>
            {expanded && (
              <motion.div
                key="study-call-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setExpanded(false)}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6 backdrop-blur-sm"
              >
                <motion.div
                  layoutId="study-call-card"
                  onClick={(e) => e.stopPropagation()}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  className="glass-panel-strong h-[min(640px,85vh)] w-full max-w-xl overflow-hidden"
                >
                  {renderContent(true)}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </>
  );
}
