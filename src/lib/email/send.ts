import { env, hasEmail } from "@/lib/env";

// Sends transactional email via Resend when configured; otherwise logs (so the
// weekly job still works end-to-end without an email provider in dev/demo).
export async function sendEmail(opts: { to: string; subject: string; html: string }): Promise<boolean> {
  if (!hasEmail()) {
    console.log(`[email:skipped] To: ${opts.to} · Subject: ${opts.subject} (no RESEND_API_KEY set)`);
    return false;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: env.resendFrom, to: opts.to, subject: opts.subject, html: opts.html }),
    });
    if (!res.ok) {
      console.error("[email:failed]", res.status, await res.text().catch(() => ""));
      return false;
    }
    return true;
  } catch (e) {
    console.error("[email:error]", (e as Error).message);
    return false;
  }
}
