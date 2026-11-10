import Link from "next/link";

export default function NotFound() {
  return (
    <main id="content" className="gate-shell">
      <section className="gate-card">
        <p className="eyebrow">Missing page</p>
        <h1 className="font-display text-4xl text-rose-50">That page isn&apos;t here</h1>
        <Link href="/" className="button-primary mt-6 inline-flex">
          Back to characters
        </Link>
      </section>
    </main>
  );
}
