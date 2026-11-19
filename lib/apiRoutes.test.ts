import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { GET as getHealth } from "../app/api/health/route";
import { GET as getChat, POST as postChat } from "../app/api/chat/route";
import { POST as postImage } from "../app/api/generate-image/route";
import { POST as postVideo } from "../app/api/generate-video/route";
import { POST as postMusic } from "../app/api/generate-music/route";
import { POST as postLiveVoice } from "../app/api/live-voice/route";
import { GET as getTelegram, POST as postTelegram } from "../app/api/telegram/route";
import { GET as getComfy } from "../app/api/comfy/route";
import { buildComfyWorkflowGraph } from "./comfyClient";
import { GET as getPipeline, POST as postPipeline } from "../app/api/pipeline/route";
import { GET as getWallet, POST as postWallet } from "../app/api/wallet/route";
import { GET as getLounge, POST as postLounge } from "../app/api/lounge/route";

describe("Next.js API Routes & ComfyUI / IP-Adapter Integration", () => {
  it("GET /api/health reports active engines and catalog counts", async () => {
    const res = await getHealth();
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.ok, true);
    assert.ok(data.catalog.companions >= 20);
    assert.ok(data.catalog.storyPacks >= 10);
    assert.ok(data.catalog.joiScenarios >= 14);
  });

  it("GET & POST /api/chat handles single-companion, dual-companion, and custom companion replies", async () => {
    const statusRes = await getChat();
    assert.equal(statusRes.status, 200);

    const singleReq = new Request("http://localhost:3000/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        characterId: "maren",
        messages: [{ role: "user", content: "Hello Maren, I am ready to obey." }],
        intimacy: 65,
        showInnerThoughts: true,
      }),
    });
    const singleRes = await postChat(singleReq);
    assert.equal(singleRes.status, 200);
    const singleData = await singleRes.json();
    assert.ok(typeof singleData.reply === "string" && singleData.reply.length > 10);
    assert.ok(typeof singleData.innerThought === "string" && singleData.innerThought.length > 5);

    const dualReq = new Request("http://localhost:3000/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        characterId: "maren",
        partnerCharacterId: "liora",
        messages: [{ role: "user", content: "What do both of you want tonight?" }],
        intimacy: 75,
      }),
    });
    const dualRes = await postChat(dualReq);
    assert.equal(dualRes.status, 200);
    const dualData = await dualRes.json();
    assert.ok(Array.isArray(dualData.groupReplies));
    assert.equal(dualData.groupReplies.length, 2);

    const customReq = new Request("http://localhost:3000/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        characterId: "custom-nova",
        customCharacter: {
          id: "custom-nova",
          name: "Nova Sterling",
          age: 25,
          category: "Dominant",
          tagline: "Custom dominant companion",
          avatar: "/avatars/maren.svg",
          voiceIntro: "Kneel.",
          initialMessage: "Welcome.",
          tags: ["Custom"],
          intimacy: 60,
          voice: { label: "Low", pitch: 0.9, rate: 0.9, style: "Low" },
          personality: "Commanding",
          traits: ["Commanding"],
          background: "Custom",
          figure: "Curvy",
          kink: "Dominance",
          reply: "Nova smiles darkly. “Good, you're listening.”",
        },
        messages: [{ role: "user", content: "Hey Nova" }],
      }),
    });
    const customRes = await postChat(customReq);
    assert.equal(customRes.status, 200);
    const customData = await customRes.json();
    assert.ok(customData.reply.includes("Nova"));
  });

  it("POST /api/generate-image and /api/generate-video return consistent Pollinations URLs & 4-frame sequences", async () => {
    const imgReq = new Request("http://localhost:3000/api/generate-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ characterId: "maren", type: "lingerie" }),
    });
    const imgRes = await postImage(imgReq);
    assert.equal(imgRes.status, 200);
    const imgData = await imgRes.json();
    assert.equal(imgData.success, true);
    assert.ok(imgData.url.startsWith("https://image.pollinations.ai/prompt/"));

    const vidReq = new Request("http://localhost:3000/api/generate-video", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ characterId: "maren", pose: "intimate bedroom scene" }),
    });
    const vidRes = await postVideo(vidReq);
    assert.equal(vidRes.status, 200);
    const vidData = await vidRes.json();
    assert.equal(vidData.success, true);
    assert.equal(vidData.frames.length, 4);
  });

  it("POST /api/generate-music and /api/live-voice synthesize playable fallback WAV and voice replies", async () => {
    const musicReq = new Request("http://localhost:3000/api/generate-music", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "Midnight velvet R&B lounge" }),
    });
    const musicRes = await postMusic(musicReq);
    assert.equal(musicRes.status, 200);
    const musicData = await musicRes.json();
    assert.equal(musicData.success, true);
    assert.ok(musicData.audioUrl.startsWith("data:audio/wav;base64,"));

    const voiceReq = new Request("http://localhost:3000/api/live-voice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ characterId: "liora", transcript: "Talk to me softly" }),
    });
    const voiceRes = await postLiveVoice(voiceReq);
    assert.equal(voiceRes.status, 200);
    const voiceData = await voiceRes.json();
    assert.equal(voiceData.success, true);
    assert.ok(typeof voiceData.reply === "string" && voiceData.reply.length > 5);
  });

  it("GET & POST /api/telegram and /api/comfy (including IP-Adapter FaceID workflow) work end-to-end", async () => {
    const tgGet = await getTelegram();
    assert.equal(tgGet.status, 200);

    const tgPost = await postTelegram(
      new Request("http://localhost:3000/api/telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: { chat: { id: 42 }, text: "Hey Maren" } }),
      }),
    );
    assert.equal(tgPost.status, 200);
    const tgData = await tgPost.json();
    assert.equal(tgData.ok, true);
    assert.equal(tgData.received.chatId, 42);

    const comfyGet = await getComfy();
    assert.equal(comfyGet.status, 200);
    const comfyInfo = await comfyGet.json();
    assert.ok(comfyInfo.supports.includes("ip-adapter-faceid-v2"));

    const graphWithFaceLock = buildComfyWorkflowGraph({
      prompt: "adult woman portrait, lingerie",
      seed: 98765,
      referenceImageBase64: "data:image/png;base64," + "A".repeat(64),
    });
    assert.ok("10" in graphWithFaceLock);
    assert.ok("11" in graphWithFaceLock);
  });

  it("GET & POST /api/pipeline orchestrates memory, mood, dialogue, scene selfie, sequence, and relationship stages", async () => {
    const pipeGet = await getPipeline();
    assert.equal(pipeGet.status, 200);
    const meta = await pipeGet.json();
    assert.equal(meta.ok, true);
    assert.ok(Array.isArray(meta.scenes) && meta.scenes.length >= 10);

    const pipePost = await postPipeline(
      new Request("http://localhost:3000/api/pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          characterId: "maren",
          userMessage: "Call me Daddy and wear sheer black lace in the shower.",
          sceneId: "shower",
          includeSelfie: true,
          sequenceKind: "joi",
          includeAftercare: true,
        }),
      }),
    );
    assert.equal(pipePost.status, 200);
    const out = await pipePost.json();
    assert.equal(out.ok, true);
    assert.ok(out.stages.includes("memory-and-mood"));
    assert.ok(out.stages.includes("dialogue-and-monologue"));
    assert.ok(out.stages.includes("scene-selfie"));
    assert.ok(out.stages.includes("motion-sequence"));
    assert.ok(out.stages.includes("relationship-progression"));
    assert.ok(out.sceneSelfie?.url.includes("image.pollinations.ai"));
    assert.equal(out.sequence?.frames.length, 4);
    assert.ok(typeof out.aftercare === "string" && out.aftercare.length > 5);
  });

  it("GET & POST /api/wallet returns $5 Developer Boost tier, crypto wallets, Top Donators Leaderboard, Owner Prizes, and free refills", async () => {
    const wGet = await getWallet();
    assert.equal(wGet.status, 200);
    const wData = await wGet.json();
    assert.equal(wData.ok, true);
    assert.equal(wData.recommendedDonationUsd, 5);
    assert.equal(wData.primaryBtcWallet, "bc1qjmf9u3cmrn59q5nqmzgkvrgy7exegnfmph999k");
    assert.ok(Array.isArray(wData.tiers) && wData.tiers.some((t: { amountUsd: number }) => t.amountUsd === 5));
    assert.ok(Array.isArray(wData.cryptoWallets) && wData.cryptoWallets.length >= 4);
    assert.ok(Array.isArray(wData.ownerPrizes) && wData.ownerPrizes.length >= 3);
    assert.ok(Array.isArray(wData.leaderboard) && wData.leaderboard.length >= 5);

    const wPost = await postWallet(
      new Request("http://localhost:3000/api/wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "supporter-bonus",
          tierId: "dev-boost-5",
          username: "LeaderboardChamp",
          contactHandle: "@champ_vip",
          favoriteGirl: "Maren",
        }),
      }),
    );
    assert.equal(wPost.status, 200);
    const pData = await wPost.json();
    assert.equal(pData.ok, true);
    assert.equal(pData.grantedCoins, 3500);
    assert.equal(pData.userRank.username, "LeaderboardChamp");
    assert.ok(typeof pData.userRank.rank === "number" && pData.userRank.rank >= 1);
  });

  it("GET & POST /api/lounge handles production multi-room lounge reads and writes", async () => {
    const lGet = await getLounge(new Request("http://localhost:3000/api/lounge?room=public"));
    assert.equal(lGet.status, 200);
    const lData = await lGet.json();
    assert.equal(lData.ok, true);
    assert.equal(lData.roomId, "public");
    assert.ok(Array.isArray(lData.messages) && lData.messages.length >= 1);

    const lPost = await postLounge(
      new Request("http://localhost:3000/api/lounge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId: "nsfw",
          from: "VelvetTester",
          text: "Testing production lounge write",
        }),
      }),
    );
    assert.equal(lPost.status, 200);
    const postOut = await lPost.json();
    assert.equal(postOut.ok, true);
    assert.equal(postOut.roomId, "nsfw");
    assert.equal(postOut.message.from, "VelvetTester");
  });
});
