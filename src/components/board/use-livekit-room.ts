"use client";

import * as React from "react";
import type { Room } from "livekit-client";
import type { AudioParticipant, AudioTransport } from "@/components/board/audio-types";

type LiveKitModule = typeof import("livekit-client");

// LiveKit (SFU) transport — scales to large calls and provides TURN. The
// browser SDK is imported lazily so it isn't bundled for mesh-only users.
export function useLiveKitRoom({
  currentUser,
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
  const [selfSpeaking, setSelfSpeaking] = React.useState(false);

  const roomRef = React.useRef<Room | null>(null);
  const lkRef = React.useRef<LiveKitModule | null>(null);
  const speakingRef = React.useRef<Set<string>>(new Set());

  const rebuild = React.useCallback(() => {
    const room = roomRef.current;
    const lk = lkRef.current;
    if (!room || !lk) return;
    const out: AudioParticipant[] = [];
    room.remoteParticipants.forEach((p) => {
      const pub = p.getTrackPublication(lk.Track.Source.Microphone);
      let hand = false;
      try { hand = JSON.parse(p.metadata || "{}").hand === true; } catch { /* noop */ }
      out.push({
        id: p.identity,
        name: p.name || p.identity,
        muted: !pub || pub.isMuted,
        hand,
        speaking: speakingRef.current.has(p.identity),
      });
    });
    setParticipants(out);
    setSelfSpeaking(speakingRef.current.has(myId));
  }, [myId]);

  const join = React.useCallback(async () => {
    setJoining(true);
    try {
      const res = await fetch("/api/board/rtc/token");
      const cfg = await res.json();
      if (cfg.provider !== "livekit") throw new Error("LiveKit not configured");

      const lk = await import("livekit-client");
      lkRef.current = lk;
      const room = new lk.Room({ adaptiveStream: true });
      roomRef.current = room;

      room.on(lk.RoomEvent.TrackSubscribed, (track) => {
        if (track.kind === lk.Track.Kind.Audio) {
          const el = track.attach();
          el.style.display = "none";
          document.body.appendChild(el);
        }
      });
      room.on(lk.RoomEvent.TrackUnsubscribed, (track) => {
        track.detach().forEach((el) => el.remove());
      });
      room.on(lk.RoomEvent.ActiveSpeakersChanged, (speakers) => {
        speakingRef.current = new Set(speakers.map((s) => s.identity));
        rebuild();
      });
      room.on(lk.RoomEvent.ParticipantConnected, rebuild);
      room.on(lk.RoomEvent.ParticipantDisconnected, rebuild);
      room.on(lk.RoomEvent.ParticipantMetadataChanged, rebuild);
      room.on(lk.RoomEvent.TrackMuted, rebuild);
      room.on(lk.RoomEvent.TrackUnmuted, rebuild);
      room.on(lk.RoomEvent.Disconnected, () => {
        setJoined(false);
        setParticipants([]);
      });

      await room.connect(cfg.url, cfg.token);
      await room.localParticipant.setMetadata(JSON.stringify({ hand: false }));
      await room.localParticipant.setMicrophoneEnabled(true);
      setJoined(true);
      rebuild();
    } catch (e) {
      onError?.((e as Error).message || "Couldn't join the call.");
      try { await roomRef.current?.disconnect(); } catch { /* noop */ }
      roomRef.current = null;
    } finally {
      setJoining(false);
    }
  }, [rebuild, onError]);

  const leave = React.useCallback(async () => {
    try { await roomRef.current?.disconnect(); } catch { /* noop */ }
    roomRef.current = null;
    setJoined(false);
    setParticipants([]);
    setSelfSpeaking(false);
  }, []);

  const setMuted = React.useCallback((m: boolean) => {
    void roomRef.current?.localParticipant.setMicrophoneEnabled(!m).then(rebuild).catch(() => {});
  }, [rebuild]);

  const setHand = React.useCallback((h: boolean) => {
    void roomRef.current?.localParticipant.setMetadata(JSON.stringify({ hand: h })).catch(() => {});
  }, []);

  React.useEffect(() => () => { void roomRef.current?.disconnect(); }, []);

  return {
    provider: "livekit",
    joined,
    joining,
    inCallCount: 0,
    participants,
    selfSpeaking,
    join,
    leave,
    setMuted,
    setHand,
  };
}
