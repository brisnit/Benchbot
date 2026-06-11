import { NextResponse } from "next/server";
import { AccessToken } from "livekit-server-sdk";
import { requireApiSession } from "@/lib/api";
import { env, hasLiveKit } from "@/lib/env";

export const dynamic = "force-dynamic";

// Mints a LiveKit access token for the user to join their workspace's audio
// room. If LiveKit isn't configured, signals the client to use the mesh
// fallback instead.
export async function GET() {
  const session = await requireApiSession();
  if (!session.ok) return session.response;

  if (!hasLiveKit()) {
    return NextResponse.json({ provider: "mesh" });
  }

  const room = `ws_${session.workspace.id}`;
  const at = new AccessToken(env.livekitApiKey, env.livekitApiSecret, {
    identity: session.user.id,
    name: session.user.name || session.user.email,
  });
  at.addGrant({
    roomJoin: true,
    room,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
    canUpdateOwnMetadata: true,
  });

  const token = await at.toJwt();
  return NextResponse.json({ provider: "livekit", url: env.livekitUrl, token, room });
}
