import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  extractMemoriesFromMessage,
  splitInnerThoughtAndReply,
  buildInnerMonologue,
  type MemoryNode,
} from "./memoryMap";

describe("Mind Map Memory & Roleplay Director Engine", () => {
  it("automatically extracts user nickname and desires without duplicates", () => {
    let nodes: MemoryNode[] = [];
    nodes = extractMemoriesFromMessage(
      "Hey gorgeous, call me Daddy and I love when you wear silk stockings.",
      nodes,
    );
    assert.ok(nodes.some((n) => n.category === "nickname" && n.text.includes("Daddy")));
    assert.ok(nodes.some((n) => n.category === "desire" && n.text.includes("wear silk stockings")));

    const countBefore = nodes.length;
    nodes = extractMemoriesFromMessage("Call me Daddy", nodes);
    assert.equal(nodes.length, countBefore);
  });

  it("splits [Inner Thought: ...] prefix from spoken dialogue cleanly", () => {
    const raw =
      "[Inner Thought: My heart is racing as they step closer.] Come sit beside me on the velvet bed.";
    const parsed = splitInnerThoughtAndReply(raw);
    assert.equal(parsed.innerThought, "My heart is racing as they step closer.");
    assert.equal(parsed.spokenReply, "Come sit beside me on the velvet bed.");
  });

  it("builds contextual inner monologue reflecting outfit and scene", () => {
    const thought = buildInnerMonologue({
      characterName: "Maren Vance",
      moodLabel: "Flirty",
      outfitLabel: "Sheer Black Lace",
      sceneLabel: "Penthouse Canopy Bed",
      intimacy: 82,
    });
    assert.ok(thought.toLowerCase().includes("penthouse canopy bed"));
    assert.ok(thought.toLowerCase().includes("sheer black lace"));
  });
});
