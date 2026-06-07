import type { Metadata } from "next";
import Link from "next/link";
import { Panel } from "@/components/ui/Panel";

export const metadata: Metadata = {
  title: "Security & Trust — How FightVex Protects Your Account & Payments",
  description:
    "How FightVex keeps your account and payments safe: Stripe-hosted checkout (card data never touches our servers), salted+hashed passwords, revocable server-side sessions, encrypted transport, brute-force protection and responsible disclosure.",
  alternates: { canonical: "/security" },
};

export default function SecurityPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="font-display text-4xl font-bold uppercase sm:text-5xl">Security &amp; Trust</h1>
      <p className="mt-3 text-muted">
        FightVex handles real payments and personal accounts, so we treat security as a feature, not an afterthought.
        Here, in plain language, is exactly how we protect you — and an honest note on what security can and can&apos;t promise.
      </p>

      <Section title="Your payment details never touch our servers">
        <p>
          All payments run through <b>Stripe Checkout</b>, a PCI-DSS Level 1 certified processor. Your card number is entered
          on Stripe&apos;s own hosted page — <b>it is never sent to, processed by, or stored on FightVex</b>. We only ever
          receive a confirmation that a payment succeeded, tied to your account. Every message Stripe sends us is
          cryptographically <b>signature-verified and replay-protected</b> before we act on it, so no one can forge an upgrade.
        </p>
      </Section>

      <Section title="Your password is never stored in a readable form">
        <p>
          We never store, log, or email your password. It is run through <b>scrypt</b> — a deliberately slow, memory-hard
          hashing function — with a <b>unique random salt per account</b>, and only that one-way hash is saved. Even in the
          unlikely event of a database leak, passwords cannot simply be read out. Password checks use a constant-time
          comparison so attackers can&apos;t learn anything from timing.
        </p>
      </Section>

      <Section title="Sessions you control">
        <p>
          When you log in we issue an <b>opaque, random session token</b> stored server-side and held in a cookie that is
          <b> HttpOnly</b> (invisible to scripts), <b>Secure</b> (HTTPS only) and <b>SameSite</b> (resistant to cross-site
          abuse). The cookie itself carries nothing sensitive. <b>Changing your password instantly revokes every other
          session</b> on every device — so if you ever suspect something, one password change locks everyone else out.
        </p>
      </Section>

      <Section title="Locking out attackers">
        <p>
          Login is throttled two ways: <b>per source</b> (one machine can&apos;t hammer the login) and <b>per account</b>
          (so an attack spread across many machines still can&apos;t grind one victim&apos;s account). Sign-ups and
          sensitive actions are rate-limited too, and we never reveal whether an email is registered.
        </p>
      </Section>

      <Section title="Encrypted, locked-down delivery">
        <p>
          The whole site is served over <b>HTTPS only</b>, with <b>HSTS</b> (browsers refuse to connect insecurely) and a
          strict set of security headers: a Content-Security-Policy, clickjacking protection (the site can&apos;t be framed),
          MIME-sniffing protection, a tight referrer policy and a locked-down permissions policy. We don&apos;t advertise our
          framework or versions.
        </p>
      </Section>

      <Section title="We collect little, and watch closely">
        <p>
          Your account holds only what it needs — your name, email, the one-way password hash, and your plan. <b>No card
          data, ever.</b> Failures in payment and account paths raise real-time alerts so problems are caught fast, and
          access to the data store is restricted and encrypted in transit.
        </p>
      </Section>

      <Section title="Responsible disclosure">
        <p>
          Security is a process, not a finish line. If you find a vulnerability, please tell us first at{" "}
          <a href="mailto:security@fightvex.com" className="text-blood hover:underline">security@fightvex.com</a> (see our{" "}
          <a href="/.well-known/security.txt" className="text-blood hover:underline">security.txt</a>) — we welcome
          good-faith reports and will work with you.
        </p>
      </Section>

      <Section title="The honest part">
        <p>
          No website, anywhere, can truthfully promise it is &quot;100% unhackable&quot; — and you should be wary of any that
          does. What we can promise is <b>defense-in-depth</b>: multiple independent layers so that no single failure exposes
          you, the smallest blast radius we can manage, and fast detection and recovery. We keep hardening as threats evolve.
          That is how serious platforms protect people, and it&apos;s how we protect you.
        </p>
        <p className="text-[11px] text-faint">
          FightVex is informational analytics and entertainment, not betting or financial advice. 21+. See our{" "}
          <Link href="/legal/privacy" className="text-blood hover:underline">Privacy Policy</Link> and{" "}
          <Link href="/legal/terms" className="text-blood hover:underline">Terms</Link>.
        </p>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Panel className="reveal mt-6 p-6">
      <h2 className="mb-3 font-display text-xl font-bold uppercase">{title}</h2>
      <div className="space-y-2 text-sm leading-relaxed text-muted">{children}</div>
    </Panel>
  );
}
