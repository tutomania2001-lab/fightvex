import Link from "next/link";

export default function NotFound() {
  return (
    <div className="bg-cage spotlight flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      <p className="font-display text-7xl font-bold text-blood">404</p>
      <h1 className="mt-2 font-display text-2xl font-bold uppercase">No fight found here</h1>
      <p className="mt-2 max-w-sm text-muted">This page slipped the jab. Let&apos;s get you back to the action.</p>
      <Link href="/" className="mt-6 rounded-md bg-blood px-6 py-3 text-sm font-bold uppercase tracking-wide text-white hover:bg-blood-dim">Back to home</Link>
    </div>
  );
}
