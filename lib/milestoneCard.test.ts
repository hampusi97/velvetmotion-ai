import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { renderMilestoneCard, wrap } from "./milestoneCard";

describe("milestoneCard", () => {
  it("wrap does not exceed the maxW line budget on multi-word text", () => {
    const drawn: { text: string; x: number; y: number }[] = [];
    const maxW = 300;
    const stubCtx = {
      measureText(str: string) {
        return { width: str.length * 20 } as TextMetrics;
      },
      fillText(str: string, x: number, y: number) {
        drawn.push({ text: str, x, y });
      },
    };

    wrap(
      stubCtx,
      "Thirty days and I have stopped being surprised by your patience.",
      72,
      1100,
      maxW,
      108,
    );

    assert.ok(drawn.length >= 3);
    for (const line of drawn) {
      assert.ok(
        stubCtx.measureText(line.text).width <= maxW,
        `Line "${line.text}" exceeded maxW (${stubCtx.measureText(line.text).width} > ${maxW})`,
      );
    }
  });

  it("renderMilestoneCard returns null rather than throwing without a canvas context", async () => {
    const res = await renderMilestoneCard({
      label: "Seven days",
      line: "A week. You actually did it.",
      streak: 7,
      companionName: "Camille",
    });
    assert.equal(res, null);
  });
});
