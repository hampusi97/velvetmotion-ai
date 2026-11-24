import { FLAGSHIP_COMPANIONS } from "@/data/companions";
import { EFFECTS } from "@/data/effects";
import { getGoonStats } from "@/lib/streaks";

describe("cross-brief contracts", () => {
  it("every companion has an id and name", () => {
    for (const c of FLAGSHIP_COMPANIONS) {
      expect(c.id).toBeTruthy();
      expect(c.name).toBeTruthy();
    }
  });

  it("effect slugs are unique and url-safe", () => {
    const slugs = EFFECTS.map((e) => e.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const s of slugs) expect(s).toMatch(/^[a-z0-9-]+$/);
  });

  it("effect SEO copy fits", () => {
    for (const e of EFFECTS) {
      expect(e.title.length).toBeLessThanOrEqual(60);
      expect(e.description.length).toBeLessThanOrEqual(155);
    }
  });

  it("GoonStats shape is intact", () => {
    const stats = getGoonStats();
    for (const k of ["streak", "totalMinutes", "sessions", "maxIntensity", "rankTitle"]) {
      expect(stats).toHaveProperty(k);
    }
  });
});
