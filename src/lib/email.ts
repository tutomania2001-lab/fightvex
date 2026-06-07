// Transactional email via Resend (server-only). Dormant until RESEND_API_KEY is
// set — sendEmail() returns {ok:false} and never throws, so callers (watchlist
// alerts, line-move notifications) can fire safely before email is configured.
import { Resend } from "resend";

const KEY = process.env.RESEND_API_KEY;
// Must be a verified sending domain in Resend (e.g. alerts@fightvex.com).
const FROM = process.env.EMAIL_FROM || "FightVex <alerts@fightvex.com>";

export const emailEnabled = !!KEY;

export async function sendEmail(opts: {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  replyTo?: string;
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  if (!KEY) return { ok: false, error: "email not configured" };
  try {
    const resend = new Resend(KEY);
    const { data, error } = await resend.emails.send({
      from: FROM,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      text: opts.text ?? (opts.html ? undefined : opts.subject),
      replyTo: opts.replyTo,
    } as Parameters<typeof resend.emails.send>[0]);
    if (error) return { ok: false, error: error.message || String(error) };
    return { ok: true, id: data?.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
