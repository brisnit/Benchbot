"use client";

import * as React from "react";
import { Mic, MicOff, PhoneOff, Headphones, Loader2, Hand, Radio } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { colorForUser } from "@/lib/board/types";
import { useMeshRoom } from "@/components/board/use-mesh-room";
import { useLiveKitRoom } from "@/components/board/use-livekit-room";
import type { AudioParticipant } from "@/components/board/audio-types";

const PROVIDER: "livekit" | "mesh" = process.env.NEXT_PUBLIC_LIVEKIT_URL ? "livekit" : "mesh";

export function AudioRoom({ currentUser }: { currentUser: { id: string; name: string } }) {
  const { toast } = useToast();
  const onError = React.useCallback(
    (msg: string) => toast({ title: "Audio", description: msg, variant: "error" }),
    [toast],
  );

  // Both hooks are always called (rules of hooks); only the active one runs.
  const mesh = useMeshRoom({ currentUser, enabled: PROVIDER === "mesh", onError });
  const lk = useLiveKitRoom({ currentUser, enabled: PROVIDER === "livekit", onError });
  const t = PROVIDER === "livekit" ? lk : mesh;

  const [muted, setMuted] = React.useState(false);
  const [hand, setHand] = React.useState(false);
  const [pttMode, setPttMode] = React.useState(false);
  const [pttActive, setPttActive] = React.useState(false);

  const effectiveMuted = pttMode ? !pttActive : muted;

  // Apply mute / hand to the transport.
  React.useEffect(() => {
    if (t.joined) t.setMuted(effectiveMuted);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t.joined, effectiveMuted]);
  React.useEffect(() => {
    if (t.joined) t.setHand(hand);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t.joined, hand]);

  // Push-to-talk: hold the backtick (`) key while in PTT mode.
  React.useEffect(() => {
    if (!t.joined || !pttMode) return;
    function down(e: KeyboardEvent) {
      if (e.code !== "Backquote") return;
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA")) return;
      e.preventDefault();
      setPttActive(true);
    }
    function up(e: KeyboardEvent) {
      if (e.code === "Backquote") setPttActive(false);
    }
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [t.joined, pttMode]);

  function leave() {
    void t.leave();
    setHand(false);
    setPttMode(false);
    setPttActive(false);
    setMuted(false);
  }

  if (!t.joined) {
    return (
      <button
        onClick={() => void t.join()}
        disabled={t.joining}
        className="flex items-center gap-2 rounded-full border border-border bg-white px-3.5 py-2 text-sm font-medium text-ink shadow-md transition-colors hover:border-brand/40 hover:bg-secondary"
        title={PROVIDER === "livekit" ? "Audio powered by LiveKit" : "Peer-to-peer audio"}
      >
        {t.joining ? <Loader2 className="h-4 w-4 animate-spin text-brand" /> : <Headphones className="h-4 w-4 text-brand" />}
        Join audio
        {t.inCallCount > 0 && (
          <span className="flex items-center gap-1 rounded-full bg-good/15 px-2 py-0.5 text-xs font-semibold text-good">
            <span className="h-1.5 w-1.5 rounded-full bg-good" /> {t.inCallCount}
          </span>
        )}
      </button>
    );
  }

  const self: AudioParticipant = { id: currentUser.id, name: currentUser.name, muted: effectiveMuted, hand, speaking: t.selfSpeaking };
  const roster = [self, ...t.participants];

  return (
    <div className="flex items-center gap-2 rounded-full border border-border bg-white px-2 py-1.5 shadow-md">
      <span className="flex items-center gap-1.5 pl-1 text-xs font-medium text-good">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-good opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-good" />
        </span>
        Live
      </span>

      <div className="flex items-center -space-x-1.5">
        {roster.slice(0, 8).map((p) => {
          const isSpeaking = p.speaking && !p.muted;
          return (
            <span
              key={p.id}
              title={`${p.name}${p.id === currentUser.id ? " (you)" : ""}${p.muted ? " · muted" : ""}${p.hand ? " · ✋" : ""}`}
              className={cn(
                "relative flex h-7 w-7 items-center justify-center rounded-full border-2 text-[10px] font-semibold text-white transition-shadow",
                isSpeaking ? "border-good ring-2 ring-good/40" : "border-white",
              )}
              style={{ backgroundColor: colorForUser(p.id) }}
            >
              {p.name.slice(0, 2).toUpperCase()}
              {p.hand && (
                <span className="absolute -top-1.5 -right-1 text-xs leading-none">✋</span>
              )}
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
        {/* raise hand */}
        <button
          onClick={() => setHand((h) => !h)}
          title={hand ? "Lower hand" : "Raise hand"}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-full transition-colors",
            hand ? "bg-warn/20 text-[#B5740B]" : "bg-secondary text-ink hover:bg-secondary/80",
          )}
        >
          <Hand className="h-4 w-4" />
        </button>

        {/* PTT mode toggle */}
        <button
          onClick={() => { setPttMode((m) => !m); setPttActive(false); }}
          title={pttMode ? "Push-to-talk on — click to switch to open mic" : "Switch to push-to-talk"}
          className={cn(
            "flex h-8 items-center gap-1 rounded-full px-2 text-xs font-medium transition-colors",
            pttMode ? "bg-brand text-white" : "bg-secondary text-ink hover:bg-secondary/80",
          )}
        >
          <Radio className="h-4 w-4" /> PTT
        </button>

        {pttMode ? (
          <button
            onMouseDown={() => setPttActive(true)}
            onMouseUp={() => setPttActive(false)}
            onMouseLeave={() => setPttActive(false)}
            onTouchStart={(e) => { e.preventDefault(); setPttActive(true); }}
            onTouchEnd={() => setPttActive(false)}
            title="Hold to talk (or hold the ` key)"
            className={cn(
              "flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition-colors",
              pttActive ? "bg-good text-white" : "bg-ink text-white hover:bg-ink/90",
            )}
          >
            <Mic className="h-4 w-4" /> {pttActive ? "Talking…" : "Hold to talk"}
          </button>
        ) : (
          <button
            onClick={() => setMuted((m) => !m)}
            title={muted ? "Unmute" : "Mute"}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-full transition-colors",
              muted ? "bg-critical/10 text-critical" : "bg-secondary text-ink hover:bg-secondary/80",
            )}
          >
            {muted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </button>
        )}

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
