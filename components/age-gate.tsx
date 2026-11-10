"use client";

export function AgeGate({ onEnter, onLeave }: { onEnter: () => void; onLeave: () => void }) {
  return (
    <main id="content" className="gate-shell">
      <section className="gate-card rise-in" aria-labelledby="age-title">
        <p className="eyebrow">Adults only</p>
        <h1 id="age-title" className="font-display text-5xl text-rose-100">
          VelvetMotion
        </h1>
        <p className="mt-4 text-base leading-relaxed text-rose-100/80">
          This is an 18+ space for private conversation with fictional characters. Every character is invented and written as an adult of 21 or older. No real people are depicted.
        </p>
        <div className="mt-8 grid gap-3">
          <button type="button" className="button-primary" onClick={onEnter} autoFocus>
            I am 18 or older — Enter
          </button>
          <button type="button" className="button-quiet" onClick={onLeave}>
            I am under 18 — Leave
          </button>
        </div>
        <p className="mt-5 text-sm leading-relaxed text-rose-100/60">
          Entering confirms that you are at least 18, that you want consensual adult fantasy, and that you understand the people here are not real.
        </p>
      </section>
    </main>
  );
}

export function LeftScreen() {
  return (
    <main id="content" className="gate-shell">
      <section className="gate-card" aria-labelledby="left-title">
        <p className="eyebrow">18+</p>
        <h1 id="left-title" className="font-display text-4xl text-rose-100">
          VelvetMotion is for adults
        </h1>
        <p className="mt-4 text-base leading-relaxed text-rose-100/75">
          You need to be 18 or older to enter. Nothing was saved and no account was created.
        </p>
      </section>
    </main>
  );
}
