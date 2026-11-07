"use client";

import { useCallback, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

export type CallStatus = "idle" | "connecting" | "waiting" | "connected" | "ended" | "error";

interface SignalPayload {
  type: "hello" | "offer" | "answer" | "ice-candidate" | "hangup";
  from: string;
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
}

function buildIceServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ];
  const turnUrl = process.env.NEXT_PUBLIC_TURN_URL;
  if (turnUrl) {
    servers.push({
      urls: turnUrl,
      username: process.env.NEXT_PUBLIC_TURN_USERNAME,
      credential: process.env.NEXT_PUBLIC_TURN_CREDENTIAL,
    });
  }
  return servers;
}

/**
 * 1:1 audio calling over WebRTC, signaled entirely through a Supabase
 * Realtime broadcast channel — no separate signaling server needed.
 *
 * The tricky part isn't the WebRTC plumbing, it's the rendezvous: broadcast
 * messages are never replayed to late subscribers, so if peer A joins and
 * immediately fires an offer, a peer B who joins even a second later would
 * simply never see it — the two would sit there forever, each thinking the
 * call is "waiting". This hook fixes that with a tiny hello handshake: every
 * peer announces itself on join, echoes back the first hello it hears (so
 * the earlier-joining peer is guaranteed to hear from the later one even
 * though its own first hello went unheard), and then the peer with the
 * lexicographically smaller id sends the offer. Deterministic, symmetric,
 * no UI-level "who's the caller" bookkeeping required.
 *
 * Known limitation: STUN-only can fail across strict/symmetric NATs (common
 * on hostel wifi). Set NEXT_PUBLIC_TURN_* in .env.local to fix that — see
 * .env.example.
 */
export function useStudyCall(roomId: string, selfId: string) {
  const [status, setStatus] = useState<CallStatus>("idle");
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const hasOfferedRef = useRef(false);
  const hasSeenPeerRef = useRef(false);

  const teardown = useCallback(() => {
    pcRef.current?.close();
    pcRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    pendingCandidatesRef.current = [];
    hasOfferedRef.current = false;
    hasSeenPeerRef.current = false;
    if (channelRef.current) {
      createClient().removeChannel(channelRef.current);
      channelRef.current = null;
    }
  }, []);

  const flushPendingCandidates = useCallback(async (pc: RTCPeerConnection) => {
    for (const candidate of pendingCandidatesRef.current) {
      await pc.addIceCandidate(candidate).catch(() => {});
    }
    pendingCandidatesRef.current = [];
  }, []);

  const startCall = useCallback(
    async () => {
      setError(null);
      setStatus("connecting");

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;

        const supabase = createClient();
        const channel = supabase.channel(`study-room-${roomId}`, {
          config: { broadcast: { self: false } },
        });
        channelRef.current = channel;

        const pc = new RTCPeerConnection({ iceServers: buildIceServers() });
        pcRef.current = pc;
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));

        const sendOffer = async () => {
          hasOfferedRef.current = true;
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          channel.send({ type: "broadcast", event: "signal", payload: { type: "offer", from: selfId, sdp: offer } });
        };

        pc.onicecandidate = (event) => {
          if (event.candidate) {
            channel.send({
              type: "broadcast",
              event: "signal",
              payload: { type: "ice-candidate", from: selfId, candidate: event.candidate.toJSON() },
            });
          }
        };

        pc.ontrack = (event) => {
          setStatus("connected");
          if (remoteAudioRef.current) remoteAudioRef.current.srcObject = event.streams[0];
        };

        pc.onconnectionstatechange = () => {
          if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
            setStatus("error");
            setError("The call connection dropped — likely a strict network on one side. A TURN server (see .env.example) usually fixes this.");
          }
        };

        // IMPORTANT: register the listener before subscribing. Register-then-
        // subscribe is the only order that guarantees we don't miss a message
        // that arrives the instant we come online.
        channel.on("broadcast", { event: "signal" }, async ({ payload }: { payload: SignalPayload }) => {
          if (payload.from === selfId) return;

          try {
            if (payload.type === "hello") {
              // Broadcasts aren't replayed to late subscribers, so whoever
              // joined first never saw the other side's original hello.
              // Echoing it back (once) guarantees BOTH sides eventually get
              // a message from the other, however far apart they joined.
              if (!hasSeenPeerRef.current) {
                hasSeenPeerRef.current = true;
                channel.send({ type: "broadcast", event: "signal", payload: { type: "hello", from: selfId } });
              }
              // Deterministic role split: lower id always offers. No UI-level
              // "who clicked create vs join" bookkeeping required.
              if (!hasOfferedRef.current && pc.signalingState === "stable" && selfId < payload.from) {
                await sendOffer();
              }
            } else if (payload.type === "offer" && payload.sdp) {
              // Belt-and-suspenders glare guard for the rare case both sides
              // still end up offering at once.
              if (hasOfferedRef.current && pc.signalingState === "have-local-offer" && selfId < payload.from) {
                return;
              }
              await pc.setRemoteDescription(payload.sdp);
              await flushPendingCandidates(pc);
              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);
              channel.send({ type: "broadcast", event: "signal", payload: { type: "answer", from: selfId, sdp: answer } });
            } else if (payload.type === "answer" && payload.sdp) {
              if (pc.signalingState === "have-local-offer") {
                await pc.setRemoteDescription(payload.sdp);
                await flushPendingCandidates(pc);
              }
            } else if (payload.type === "ice-candidate" && payload.candidate) {
              if (pc.remoteDescription) {
                await pc.addIceCandidate(payload.candidate).catch(() => {});
              } else {
                pendingCandidatesRef.current.push(payload.candidate);
              }
            } else if (payload.type === "hangup") {
              teardown();
              setStatus("ended");
            }
          } catch (err) {
            console.error("[useStudyCall] signaling error", err);
          }
        });

        channel.subscribe(async (subStatus) => {
          if (subStatus !== "SUBSCRIBED") return;
          setStatus((s) => (s === "connected" ? s : "waiting"));
          channel.send({ type: "broadcast", event: "signal", payload: { type: "hello", from: selfId } });
        });
      } catch (err) {
        setStatus("error");
        setError(err instanceof Error ? err.message : "Couldn't access the microphone — check your browser permissions.");
      }
    },
    [roomId, selfId, flushPendingCandidates, teardown]
  );

  const endCall = useCallback(() => {
    channelRef.current?.send({ type: "broadcast", event: "signal", payload: { type: "hangup", from: selfId } });
    teardown();
    setStatus("ended");
  }, [selfId, teardown]);

  const toggleMute = useCallback(() => {
    const stream = streamRef.current;
    if (!stream) return;
    const nextMuted = !muted;
    stream.getAudioTracks().forEach((t) => (t.enabled = !nextMuted));
    setMuted(nextMuted);
  }, [muted]);

  return { status, error, muted, remoteAudioRef, startCall, endCall, toggleMute };
}
