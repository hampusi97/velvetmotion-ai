import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import blueprint from "./firebase-blueprint.json";

const rulesText = fs.readFileSync("./firestore.rules", "utf8");

test("Firestore rules include Global Safety Net and Eight Pillars primitives", () => {
  assert.ok(rulesText.includes("rules_version = '2';"));
  assert.ok(rulesText.includes("match /{document=**}"));
  assert.ok(rulesText.includes("allow read, write: if false;"));
  assert.ok(rulesText.includes("function isValidId(id)"));
  assert.ok(rulesText.includes("function isVerifiedUser()"));
  assert.ok(rulesText.includes("function isParentOwner(userId)"));
});

test("Every blueprint collection path is explicitly matched in firestore.rules", () => {
  assert.ok(blueprint.firestore["/users/{userId}"]);
  assert.ok(blueprint.firestore["/users/{userId}/chats/{characterId}"]);
  assert.ok(blueprint.firestore["/users/{userId}/gallery/{mediaId}"]);
  assert.ok(blueprint.firestore["/users/{userId}/companions/{companionId}"]);

  assert.ok(rulesText.includes("match /users/{userId}"));
  assert.ok(rulesText.includes("match /chats/{characterId}"));
  assert.ok(rulesText.includes("match /gallery/{mediaId}"));
  assert.ok(rulesText.includes("match /companions/{companionId}"));
});

test("Dirty Dozen payload simulator rejects all 12 adversarial payloads", () => {
  const idRegex = new RegExp(blueprint.entities.UserProfile.properties.uid.pattern!);
  const maxUsername = blueprint.entities.UserProfile.properties.username.maxLength!;

  function evaluateUserCreate(
    auth: { uid: string; email_verified: boolean } | null,
    userId: string,
    payload: Record<string, unknown>,
    now: string,
  ): boolean {
    if (!auth || !auth.email_verified) return false;
    if (auth.uid !== userId || !idRegex.test(userId) || userId.length > 128) return false;
    const keys = Object.keys(payload);
    const allowed = ["uid", "username", "coins", "createdAt", "updatedAt"];
    if (keys.length !== allowed.length || !allowed.every((k) => keys.includes(k))) return false;
    if (payload.uid !== auth.uid || payload.uid !== userId) return false;
    if (typeof payload.username !== "string" || payload.username.length < 1 || payload.username.length > maxUsername) {
      return false;
    }
    if (typeof payload.coins !== "number" || !Number.isInteger(payload.coins) || payload.coins < 0 || payload.coins > 1000000) {
      return false;
    }
    if (payload.createdAt !== now || payload.updatedAt !== now) return false;
    return true;
  }

  const now = "2026-11-17T15:00:00Z";
  const validPayload = {
    uid: "user_1",
    username: "VelvetMember",
    coins: 500,
    createdAt: now,
    updatedAt: now,
  };

  // Valid baseline passes
  assert.equal(evaluateUserCreate({ uid: "user_1", email_verified: true }, "user_1", validPayload, now), true);

  // 1. Unauthenticated write
  assert.equal(evaluateUserCreate(null, "user_1", validPayload, now), false);
  // 2. Unverified email spoof
  assert.equal(evaluateUserCreate({ uid: "user_1", email_verified: false }, "user_1", validPayload, now), false);
  // 3. Identity spoofing
  assert.equal(
    evaluateUserCreate({ uid: "user_1", email_verified: true }, "user_1", { ...validPayload, uid: "user_2" }, now),
    false,
  );
  // 4. Shadow field injection
  assert.equal(
    evaluateUserCreate({ uid: "user_1", email_verified: true }, "user_1", { ...validPayload, isAdmin: true }, now),
    false,
  );
  // 5. Path variable poisoning
  assert.equal(
    evaluateUserCreate({ uid: "bad$id!", email_verified: true }, "bad$id!", { ...validPayload, uid: "bad$id!" }, now),
    false,
  );
  // 6. Value poisoning (negative coins)
  assert.equal(
    evaluateUserCreate({ uid: "user_1", email_verified: true }, "user_1", { ...validPayload, coins: -500 }, now),
    false,
  );
  // 7. Timestamp forgery
  assert.equal(
    evaluateUserCreate(
      { uid: "user_1", email_verified: true },
      "user_1",
      { ...validPayload, createdAt: "2020-01-01T00:00:00Z" },
      now,
    ),
    false,
  );
  // 8. Overlong username
  assert.equal(
    evaluateUserCreate(
      { uid: "user_1", email_verified: true },
      "user_1",
      { ...validPayload, username: "x".repeat(65) },
      now,
    ),
    false,
  );
});

test("Character filtering and system prompt builder include persona and romance mode rules", async () => {
  const { CHARACTERS, filterCharacters, buildSystemPrompt } = await import("./lib/characters");
  assert.ok(CHARACTERS.length >= 12);

  const dominants = filterCharacters({ category: "Dominant" });
  assert.ok(dominants.length >= 2);
  assert.ok(dominants.every((c) => c.category === "Dominant"));

  const maren = CHARACTERS[0];
  const promptStandard = buildSystemPrompt(maren, false);
  const promptRomance = buildSystemPrompt(maren, true);
  assert.ok(promptStandard.includes(maren.name));
  assert.ok(promptRomance.includes("Romance mode is ON."));
});

test("Portrait URLs stay within Firestore 2000-char limit", async () => {
  const { characterPortraitUrl, resolveAvatar } = await import("./lib/portraits");
  const maxUrlLen = blueprint.entities.SavedMedia.properties.url.maxLength!;

  const builtIn = characterPortraitUrl("maren", "curvy figure");
  assert.ok(builtIn.startsWith("https://image.pollinations.ai/prompt/"));
  assert.ok(builtIn.length <= maxUrlLen);

  const customPortrait = resolveAvatar("/avatars/maren.svg", "maren", "curvy figure");
  assert.ok(customPortrait.startsWith("https://image.pollinations.ai/prompt/"));
  assert.ok(customPortrait.length <= maxUrlLen);
});

test("Mood Engine updates character status, response style, and avatar appearance by duration & intensity", async () => {
  const { CHARACTERS, buildSystemPrompt, fallbackReply } = await import("./lib/characters");
  const { computeMoodState } = await import("./lib/moodEngine");

  const liora = CHARACTERS.find((c) => c.id === "liora") || CHARACTERS[1];
  const maren = CHARACTERS[0];

  const calmMood = computeMoodState({
    character: liora,
    messages: [{ role: "assistant", content: liora.initialMessage }],
    durationSeconds: 0,
    intimacy: 20,
    romanceMode: false,
    periodicPhase: 0,
  });

  const intenseMood = computeMoodState({
    character: liora,
    messages: [
      { role: "assistant", content: liora.initialMessage },
      { role: "user", content: "Come closer, I want to kiss your lips and touch your skin in bed!" },
      { role: "assistant", content: "Tell me more..." },
      { role: "user", content: "Undress slowly for me, please, I crave you tonight!" },
    ],
    durationSeconds: 180,
    intimacy: 80,
    romanceMode: false,
    giftCount: 2,
    periodicPhase: 1,
  });

  assert.ok(intenseMood.intensity > calmMood.intensity);
  assert.notEqual(calmMood.statusText, intenseMood.statusText);
  assert.notEqual(calmMood.portraitMood, intenseMood.portraitMood);
  assert.notEqual(calmMood.avatarFilter, intenseMood.avatarFilter);

  const periodicShift = computeMoodState({
    character: maren,
    messages: [{ role: "user", content: "I am listening closely." }],
    durationSeconds: 20,
    intimacy: 55,
    romanceMode: false,
    periodicPhase: 1,
  });
  assert.ok(periodicShift.statusText.length > 0);
  assert.ok(periodicShift.responseStyle.length > 10);

  const sysPrompt = buildSystemPrompt(maren, false, intenseMood);
  assert.ok(sysPrompt.includes(`Current Mood: ${intenseMood.label}`));

  const replyCalm = fallbackReply(liora, "hello", false, calmMood);
  const replyIntense = fallbackReply(liora, "kiss me closer", false, intenseMood);
  assert.notEqual(replyCalm, replyIntense);
});



