import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { Character } from "./charactersTypes";
import { calculateConversationIntensity, computeMoodState } from "./moodEngine";

describe("Mood Engine Pure Logic", () => {
  const sampleCharacter: Pick<Character, "id" | "name" | "category" | "intimacy" | "voice"> = {
    id: "maren",
    name: "Maren Vance",
    category: "Dominant",
    intimacy: 40,
    voice: {
      label: "Velvet contralto",
      pitch: 0.92,
      rate: 0.95,
      style: "Sultry",
    },
  };

  it("calculates baseline intensity and increases with heat words, duration, and gifts", () => {
    const baseline = calculateConversationIntensity({
      character: sampleCharacter,
      messages: [{ role: "assistant", content: "Welcome inside." }],
      durationSeconds: 0,
      intimacy: 20,
      romanceMode: false,
    });

    const heated = calculateConversationIntensity({
      character: sampleCharacter,
      messages: [
        { role: "assistant", content: "Welcome inside." },
        { role: "user", content: "Come closer, I want to kiss your lips and touch your skin in bed!" },
      ],
      durationSeconds: 120,
      intimacy: 75,
      romanceMode: true,
      giftCount: 2,
    });

    assert.ok(baseline >= 12 && baseline <= 100);
    assert.ok(heated > baseline);
    assert.ok(heated <= 100);
  });

  it("computes mood state, status text, and portrait mood transitions", () => {
    const calmState = computeMoodState({
      character: { ...sampleCharacter, category: "Shy" },
      messages: [{ role: "user", content: "I feel a little shy and nervous." }],
      durationSeconds: 10,
      intimacy: 25,
      romanceMode: false,
      periodicPhase: 0,
    });

    assert.equal(calmState.mood, "shy");
    assert.ok(calmState.statusText.startsWith("Shy · "));

    const dominantState = computeMoodState({
      character: sampleCharacter,
      messages: [{ role: "user", content: "I want to kneel and obey your command." }],
      durationSeconds: 160,
      intimacy: 85,
      romanceMode: false,
      periodicPhase: 1,
    });

    assert.equal(dominantState.mood, "dominant");
    assert.equal(dominantState.label, "Commanding");
    assert.ok(dominantState.intensity >= 55);
  });
});
