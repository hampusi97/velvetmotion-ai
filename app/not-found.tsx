import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-[#07050c] text-white flex items-center justify-center p-6">
      <div className="max-w-md w-full rounded-3xl border border-pink-500/35 bg-gradient-to-b from-zinc-950 to-black p-8 text-center space-y-4 shadow-[0_0_60px_rgba(236,72,153,0.2)]">
        <div className="text-5xl">✨</div>
        <h1 className="font-display text-3xl text-white">Room Not Found</h1>
        <p className="text-sm text-zinc-400">
          That link doesn&apos;t exist in VelvetMotion AI. Jump back into the penthouse lobby below.
        </p>
        <Link
          href="/"
          className="inline-flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-pink-600 to-fuchsia-600 py-3 text-sm font-semibold text-white"
        >
          ← Back to VelvetMotion AI
        </Link>
      </div>
    </main>
  );
}
