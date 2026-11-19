/** Simple generation queue so we don't spam Pollinations. */
type Job = { id: string; run: () => Promise<void> };
const queue: Job[] = [];
let running = false;
const MIN_GAP = 2000;

async function pump() {
  if (running) return;
  running = true;
  while (queue.length) {
    const job = queue.shift()!;
    try { await job.run(); } catch { /* */ }
    await new Promise((r) => setTimeout(r, MIN_GAP));
  }
  running = false;
}

export function enqueueGen(id: string, run: () => Promise<void>) {
  queue.push({ id, run });
  void pump();
}
