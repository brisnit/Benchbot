export interface AudioParticipant {
  id: string;
  name: string;
  muted: boolean;
  hand: boolean;
  speaking: boolean;
}

// Common interface both transports (LiveKit / mesh) implement so the AudioRoom
// UI is backend-agnostic.
export interface AudioTransport {
  provider: "livekit" | "mesh";
  joined: boolean;
  joining: boolean;
  inCallCount: number;
  participants: AudioParticipant[]; // peers (excludes self)
  selfSpeaking: boolean;
  join: () => Promise<void>;
  leave: () => Promise<void>;
  setMuted: (b: boolean) => void;
  setHand: (b: boolean) => void;
}
