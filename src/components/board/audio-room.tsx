"use client";

import * as React from "react";
import { Mic, MicOff, PhoneOff, Headphones, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { colorForUser } from "@/lib/board/types";

interface Participant {
  id: string;
  name: string;
  muted: boolean;
}

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

// Peer-to-peer (mesh) audio call for the workspace. Signalling is exchanged
// over /api/board/rtc (polled). Best for small groups; a media server (SFU)
// would be the upgrade for very large calls.
export function AudioRoom({ currentUser }: { currentUser: { id: string; name: string } }) {
  const { toast } = useToast();
  const [joined, setJoined] = React.useState(false);
  const [joining, setJoining] = React.useState(false);
  const [muted, setMuted] = React.useState(false);
  const [participants, setParticipants] = React.useState<Participant[]>([]);
  const [inCallCount, setInCallCount] = React.useState(0);
  const [speaking, setSpeaking] = React.useState<Set<string>>(new Set());

  const myId = currentUser.id;
  const localStream = React.useRef<MediaStream | null>(null);
  const pcs = React.useRef<Map<string, PeerEntry>>(new Map());
  const outgoing = React.useRef<{ to: string; data: SignalData }[]>([]);
  const remoteAudio = React.useRef<Map<string, HTMLAudioElement>>(new Map());
  const audioCtx = React.useRef<AudioContext | null>(null);
  const analysers = React.useRef<Map<string, AnalyserNode>>(new Map());
  const joinedRef = React.useRef(false);
  const mutedRef = React.useRef(false);

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
    } catch {
      /* analyser optional */
    }
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
    if (e) {
      try { e.pc.close(); } catch { /* noop */ }
      pcs.current.delete(id);
    }
    const el = remoteAudio.current.get(id);
    if (el) {
      el.srcObject = null;
      el.remove();
      remoteAudio.current.delete(id);
    }
    analysers.current.delete(id);
  }, []);

  const createPeer = React.useCallback((peerId: string, name: string, initiator: boolean): PeerEntry => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    const entry: PeerEntry = { pc, pending: [], name };
    pcs.current.set(peerId, entry);
    localStream.current?.getTracks().forEach((t) => pc.addTrack(t, localStream.current!));
    pc.onicecandidate = (ev) => {
      if (ev.candidate) queueSignal(peerId, { kind: "ice", candidate: ev.candidate.toJSON() });
    };
    pc.ontrack = (ev) => attachRemote(peerId, ev.streams[0]);
    pc.onconnectionstatechange = () => {
      if (["failed", "closed"].includes(pc.connectionState)) closePeer(peerId);
    };
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

  const handleSignal = React.useCallback(async (from: string, data: SignalData, parts: Participant[]) => {
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

  const reconcile = React.useCallback((parts: Participant[]) => {
    const ids = new Set(parts.map((p) => p.id));
    for (const id of Array.from(pcs.current.keys())) if (!ids.has(id)) closePeer(id);
    for (const p of parts) {
      if (p.id !== myId && !pcs.current.has(p.id)) createPeer(p.id, p.name, myId < p.id);
    }
  }, [myId, createPeer, closePeer]);

  // Poll: heartbeat + send queued signals + drain inbox.
  React.useEffect(() => {
    let alive = true;
    async function poll(inCall: boolean) {
      try {
        const signals = outgoing.current.splice(0);
        const res = await fetch("/api/board/rtc", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ inCall, muted: mutedRef.current, signals }),
        });
        if (!res.ok) return;
        const data = await res.json();
        if (!alive) return;
        const parts: Participant[] = data.participants ?? [];
        setInCallCount(parts.length);
        if (joinedRef.current) {
          setParticipants(parts.filter((p) => p.id !== myId));
          reconcile(parts);
          for (const msg of data.inbox ?? []) await handleSignal(msg.from, msg.data as SignalData, parts);
        }
      } catch { /* offline tolerant */ }
    }
    // fast cadence while in a call, slow while just showing the count
    const fast = 800;
    const slow = 4000;
    let iv: ReturnType<typeof setInterval>;
    function schedule() {
      clearInterval(iv);
      iv = setInterval(() => poll(joinedRef.current), joinedRef.current ? fast : slow);
    }
    schedule();
    poll(joinedRef.current);
    const onJoinChange = () => schedule();
    window.addEventListener("bb-call-change", onJoinChange);
    return () => {
      alive = false;
      clearInterval(iv);
      window.removeEventListener("bb-call-change", onJoinChange);
    };
  }, [myId, reconcile, handleSignal]);

  // Speaking detection (throttled).
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
      setSpeaking((prev) => {
        if (prev.size === next.size && [...next].every((x) => prev.has(x))) return prev;
        return next;
      });
    }, 180);
    return () => clearInterval(iv);
  }, [joined]);

  async function join() {
    setJoining(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStream.current = stream;
      setupAnalyser("self", stream);
      joinedRef.current = true;
      setJoined(true);
      window.dispatchEvent(new Event("bb-call-change"));
      toast({ title: "You joined the audio call", variant: "success" });
    } catch {
      toast({ title: "Microphone needed", description: "Allow mic access to join the call.", variant: "error" });
    } finally {
      setJoining(false);
    }
  }

  async function leave() {
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
      await fetch("/api/board/rtc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inCall: false }),
      });
    } catch { /* noop */ }
  }

  function toggleMute() {
    const m = !muted;
    setMuted(m);
    mutedRef.current = m;
    localStream.current?.getAudioTracks().forEach((t) => (t.enabled = !m));
  }

  // cleanup on unmount
  React.useEffect(() => () => {
    pcs.current.forEach((e) => { try { e.pc.close(); } catch { /* noop */ } });
    remoteAudio.current.forEach((el) => { el.srcObject = null; el.remove(); });
    localStream.current?.getTracks().forEach((t) => t.stop());
  }, []);

  if (!joined) {
    return (
      <button
        onClick={join}
        disabled={joining}
        className="flex items-center gap-2 rounded-full border border-border bg-white px-3.5 py-2 text-sm font-medium text-ink shadow-md transition-colors hover:border-brand/40 hover:bg-secondary"
      >
        {joining ? <Loader2 className="h-4 w-4 animate-spin text-brand" /> : <Headphones className="h-4 w-4 text-brand" />}
        Join audio
        {inCallCount > 0 && (
          <span className="flex items-center gap-1 rounded-full bg-good/15 px-2 py-0.5 text-xs font-semibold text-good">
            <span className="h-1.5 w-1.5 rounded-full bg-good" /> {inCallCount}
          </span>
        )}
      </button>
    );
  }

  const me: Participant = { id: myId, name: currentUser.name, muted };
  const roster = [me, ...participants];

  return (
    <div className="flex items-center gap-2 rounded-full border border-border bg-white px-2 py-1.5 shadow-md">
      <span className="flex items-center gap-1.5 pl-1 pr-1 text-xs font-medium text-good">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-good opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-good" />
        </span>
        Live
      </span>

      <div className="flex items-center -space-x-1.5">
        {roster.slice(0, 8).map((p) => {
          const isSpeaking = speaking.has(p.id === myId ? "self" : p.id) && !p.muted;
          return (
            <span
              key={p.id}
              title={`${p.name}${p.id === myId ? " (you)" : ""}${p.muted ? " · muted" : ""}`}
              className={cn(
                "relative flex h-7 w-7 items-center justify-center rounded-full border-2 text-[10px] font-semibold text-white transition-shadow",
                isSpeaking ? "border-good ring-2 ring-good/40" : "border-white",
              )}
              style={{ backgroundColor: colorForUser(p.id) }}
            >
              {p.name.slice(0, 2).toUpperCase()}
              {p.muted && (
                <span className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-critical text-white">
                  <MicOff className="h-2.5 w-2.5" />
                </span>
              )}
            </span>
          );
        })}
        {roster.length > 8 && (
          <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-slate-400 text-[10px] font-semibold text-white">
            +{roster.length - 8}
          </span>
        )}
      </div>

      <div className="ml-1 flex items-center gap-1">
        <button
          onClick={toggleMute}
          title={muted ? "Unmute" : "Mute"}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-full transition-colors",
            muted ? "bg-critical/10 text-critical" : "bg-secondary text-ink hover:bg-secondary/80",
          )}
        >
          {muted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        </button>
        <button
          onClick={leave}
          title="Leave call"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-critical text-white transition-opacity hover:opacity-90"
        >
          <PhoneOff className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
