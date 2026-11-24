import CompanionCard from "@/components/CompanionCard";
import { FLAGSHIP_COMPANIONS } from "@/data/companions";

export const metadata = { title: "The girls — VelvetMotion" };

export default function GirlsPage() {
  return (
    <main className="mx-auto max-w-[1440px] px-6 py-24">
      <p className="text-[10px] tracking-[0.2em] uppercase text-[#a89c8d]">The roster · {FLAGSHIP_COMPANIONS.length}</p>
      <h1 className="mt-4 max-w-[16ch] font-serif text-[clamp(2.5rem,7vw,5.5rem)] font-light leading-[0.96] tracking-tight text-[#f6f1e8]">
        Every one of them knows what she wants.
      </h1>
      <hr className="my-12 border-0 border-t border-white/10" />
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {FLAGSHIP_COMPANIONS.map((c, i) => (
          <CompanionCard key={c.id} c={c} index={i} />
        ))}
      </div>
    </main>
  );
}
