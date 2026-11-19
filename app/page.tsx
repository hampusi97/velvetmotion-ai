"use client";

// TEMP minimal shell — full page restore follows if this lands
export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center p-8">
      <div className="text-center space-y-3">
        <h1 className="text-2xl font-bold text-pink-300">VelvetMotion</h1>
        <p className="text-sm text-zinc-400">Deploy restore in progress — refresh in a minute.</p>
        <a className="text-pink-400 underline text-sm" href="/?view=joi3d">Try 3D JOI Stage</a>
      </div>
    </main>
  );
}
