"use client";

import * as React from "react";
import type { AudioParticipant, AudioTransport } from "@/components/board/audio-types";

const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:global.stun.twilio.com:3478" },
];

interface PeerEntry {
  pc: RTCPeerConnection;
  pending: RTCIceCandidateInit[];
  name: string;
}
type SignalData =
  | { kind: "offer"; sdp: RTCSessionDescriptionInit }
  | { kind: "answer"; sdp: RTCSessionDescriptionInit }
  | { kind: "ice"; candidate: RTCIceCandidateInit };
interface ServerParticipant { id: string; name: string; muted: boolean; hand: boolean }

// Peer-to-peer (mesh) audio with signalling over /api/board/rtc. STUN-only.
// Good for small groups; LiveKit is used when configured.
export function useMeshRoom({
  currentUser,
  enabled,
  onError,
}: {
  currentUser: { id: string; name: string };
  enabled: boolean;
  onError?: (msg: string) => void;
}): AudioTransport {
  const myId = currentUser.id;
  const [joined, setJoined] = React.useState(false);
  const [joining, setJoining] = React.useState(false);
  const [participants, setParticipants] = React.useState<AudioParticipant[]>([]);
  const [inCallCount, setInCallCount] = React.useState(0);
  const [speaking, setSpeaking] = React.useState<Set<string>>(new Set());

  const localStream = React.useRef<MediaStream | null>(null);
  const pcs = React.useRef<Map<string, PeerEntry>>(new Map());
  const outgoing = React.useRef<{ to: string; data: SignalData }[]>([]);
  const remoteAudio = React.useRef<Map<string, HTMLAudioElement>>(new Map());
  const audioCtx = React.useRef<AudioContext | null>(null);
  const analysers = React.useRef<Map<string, AnalyserNode>>(new Map());
  const joinedRef = React.useRef(false);
  const mutedRef = React.useRef(false);
  const handRef = React.useRef(false);
  const serverParts = React.useRef<ServerParticipant[]>([]);

  const queueSignal = React.useCallback((to: string, data: SignalData) => {
    outgoing.current.push({ to, data });
  }, []);

  const setupAnalyser = React.useCallback((id: string, stream: MediaStream) => {
    try {
      if (!audioCtx.current) {
        const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        audioCtx.current = new Ctx();
      }
      const src = audioCtx.current.createMediaStreamSource(stream);
      const an = audioCtx.current.createAnalyser();
      an.fftSize = 256;
      src.connect(an);
      analysers.current.set(id, an);
    } catch { /* optional */ }
  }, []);

  const attachRemote = React.useCallback((peerId: string, stream: MediaStream) => {
    let el = remoteAudio.current.get(peerId);
    if (!el) {
      el = document.createElement("audio");
      el.autoplay = true;
      remoteAudio.current.set(peerId, el);
      document.body.appendChild(el);
    }
    el.srcObject = stream;
    void el.play?.().catch(() => {});
    setupAnalyser(peerId, stream);
  }, [setupAnalyser]);

  const closePeer = React.useCallback((id: string) => {
    const e = pcs.current.get(id);
    if (e) { try { e.pc.close(); } catch { /* noop */ } pcs.current.delete(id); }
    const el = remoteAudio.current.get(id);
    if (el) { el.srcObject = null; el.remove(); remoteAudio.current.delete(id); }
    analysers.current.delete(id);
  }, []);

  const createPeer = React.useCallback((peerId: string, name: string, initiator: boolean): PeerEntry => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    const entry: PeerEntry = { pc, pending: [], name };
    pcs.current.set(peerId, entry);
    localStream.current?.getTracks().forEach((t) => pc.addTrack(t, localStream.current!));
    pc.onicecandidate = (ev) => { if (ev.candidate) queueSignal(peerId, { kind: "ice", candidate: ev.candidate.toJSON() }); };
    pc.ontrack = (ev) => attachRemote(peerId, ev.streams[0]);
    pc.onconnectionstatechange = () => { if (["failed", "closed"].includes(pc.connectionState)) closePeer(peerId); };
    if (initiator) {
      void (async () => {
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          if (pc.localDescription) queueSignal(peerId, { kind: "offer", sdp: pc.localDescription.toJSON() });
        } catch { /* noop */ }
      })();
    }
    return entry;
  }, [queueSignal, attachRemote, closePeer]);

  const handleSignal = React.useCallback(async (from: string, data: SignalData, parts: ServerParticipant[]) => {
    let entry = pcs.current.get(from);
    if (!entry) entry = createPeer(from, parts.find((p) => p.id === from)?.name ?? "Guest", false);
    const pc = entry.pc;
    try {
      if (data.kind === "offer") {
        await pc.setRemoteDescription(data.sdp);
        for (const c of entry.pending.splice(0)) await pc.addIceCandidate(c).catch(() => {});
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        if (pc.localDescription) queueSignal(from, { kind: "answer", sdp: pc.localDescription.toJSON() });
      } else if (data.kind === "answer") {
        await pc.setRemoteDescription(data.sdp);
        for (const c of entry.pending.splice(0)) await pc.addIceCandidate(c).catch(() => {});
      } else if (data.kind === "ice") {
        if (pc.remoteDescription && pc.remoteDescription.type) await pc.addIceCandidate(data.candidate).catch(() => {});
        else entry.pending.push(data.candidate);
      }
    } catch { /* noop */ }
  }, [createPeer, queueSignal]);

  const reconcile = React.useCallback((parts: ServerParticipant[]) => {
    const ids = new Set(parts.map((p) => p.id));
    for (const id of Array.from(pcs.current.keys())) if (!ids.has(id)) closePeer(id);
    for (const p of parts) if (p.id !== myId && !pcs.current.has(p.id)) createPeer(p.id, p.name, myId < p.id);
  }, [myId, createPeer, closePeer]);

  // Poll loop (only when this transport is the active one).
  React.useEffect(() => {
    if (!enabled) return;
    let alive = true;
    async function poll() {
      try {
        const signals = outgoing.current.splice(0);
        const res = await fetch("/api/board/rtc", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ inCall: joinedRef.current, muted: mutedRef.current, hand: handRef.current, signals }),
        });
        if (!res.ok) return;
        const data = await res.json();
        if (!alive) return;
        const parts: ServerParticipant[] = data.participants ?? [];
        serverParts.current = parts;
        setInCallCount(parts.length);
        if (joinedRef.current) {
          reconcile(parts);
          for (const msg of data.inbox ?? []) await handleSignal(msg.from, msg.data as SignalData, parts);
        }
      } catch { /* offline tolerant */ }
    }
    let iv: ReturnType<typeof setInterval>;
    const schedule = () => { clearInterval(iv); iv = setInterval(poll, joinedRef.current ? 800 : 4000); };
    schedule();
    poll();
    const onChange = () => schedule();
    window.addEventListener("bb-call-change", onChange);
    return () => { alive = false; clearInterval(iv); window.removeEventListener("bb-call-change", onChange); };
  }, [enabled, reconcile, handleSignal]);

  // Speaking detection + participant roster refresh.
  React.useEffect(() => {
    if (!joined) return;
    const buf = new Uint8Array(128);
    const iv = setInterval(() => {
      const next = new Set<string>();
      for (const [id, an] of analysers.current) {
        try { an.getByteFrequencyData(buf); } catch { continue; }
        let sum = 0;
        for (let i = 0; i < buf.length; i++) sum += buf[i];
        if (sum / buf.length > 16) next.add(id);
      }
      setSpeaking((prev) => (prev.size === next.size && [...next].every((x) => prev.has(x)) ? prev : next));
      // refresh roster (muted/hand from server)
      setParticipants(
        serverParts.current
          .filter((p) => p.id !== myId)
          .map((p) => ({ id: p.id, name: p.name, muted: p.muted, hand: p.hand, speaking: next.has(p.id) && !p.muted })),
      );
    }, 180);
    return () => clearInterval(iv);
  }, [joined, myId]);

  const join = React.useCallback(async () => {
    setJoining(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStream.current = stream;
      setupAnalyser("self", stream);
      joinedRef.current = true;
      setJoined(true);
      window.dispatchEvent(new Event("bb-call-change"));
    } catch {
      onError?.("Allow microphone access to join the call.");
    } finally {
      setJoining(false);
    }
  }, [setupAnalyser, onError]);

  const leave = React.useCallback(async () => {
    joinedRef.current = false;
    setJoined(false);
    for (const id of Array.from(pcs.current.keys())) closePeer(id);
    localStream.current?.getTracks().forEach((t) => t.stop());
    localStream.current = null;
    analysers.current.clear();
    setParticipants([]);
    setSpeaking(new Set());
    window.dispatchEvent(new Event("bb-call-change"));
    try {
      await fetch("/api/board/rtc", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ inCall: false }) });
    } catch { /* noop */ }
  }, [closePeer]);

  const setMuted = React.useCallback((m: boolean) => {
    mutedRef.current = m;
    localStream.current?.getAudioTracks().forEach((t) => (t.enabled = !m));
  }, []);
  const setHand = React.useCallback((h: boolean) => { handRef.current = h; }, []);

  React.useEffect(() => () => {
    pcs.current.forEach((e) => { try { e.pc.close(); } catch { /* noop */ } });
    remoteAudio.current.forEach((el) => { el.srcObject = null; el.remove(); });
    localStream.current?.getTracks().forEach((t) => t.stop());
  }, []);

  return {
    provider: "mesh",
    joined,
    joining,
    inCallCount,
    participants,
    selfSpeaking: speaking.has("self"),
    join,
    leave,
    setMuted,
    setHand,
  };
}
