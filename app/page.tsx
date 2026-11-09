"use client";

import { useState, useEffect, useRef } from "react";

interface MediaItem {
  id: string;
  type: "image" | "video";
  url: string;
  prompt: string;
  createdAt: string;
  tributed?: boolean;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  image?: string;
  video?: string;
}

const STORY_PACKS = [
  { id: "blacked-weekend", title: "Blacked Weekend", tag: "BNWO", desc: "She spends the weekend getting ruined by BBC while you stroke" },
  { id: "brother", title: "She Fucks Your Brother", tag: "CUCK", desc: "Your own brother takes her in your bed" },
  { id: "office", title: "Office Cuck", tag: "CUCK", desc: "She fucks her boss and sends you proof" },
  { id: "dad", title: "She Fucked Your Dad", tag: "TABOO", desc: "The ultimate betrayal fantasy" },
  { id: "bnwo-training", title: "BNWO Training", tag: "BNWO", desc: "Complete whiteboy reprogramming" },
  { id: "locked", title: "Chastity Night", tag: "CUCK", desc: "You’re locked while she gets used" },
  { id: "group", title: "Group Use", tag: "BNWO", desc: "Multiple men • you only watch and stroke" },
  { id: "instagram", title: "Instagram BBC Arc", tag: "BNWO", desc: "She turns her page into a public BBC slut account" },
  { id: "ex", title: "Ex Got Blacked", tag: "BNWO", desc: "Your ex rubs her new black boyfriend in your face" },
  { id: "wife", title: "Wife Training", tag: "BNWO", desc: "You slowly turn your wife into a BBC-only slut" },
];

const JOI_PRESETS = [
  { id: "classic", label: "Classic JOI" },
  { id: "sph", label: "SPH JOI" },
  { id: "cei", label: "CEI" },
  { id: "ruin", label: "Ruin Orgasm" },
  { id: "edge", label: "Long Edge" },
  { id: "cuck", label: "Cuck JOI" },
  { id: "blacked", label: "Blacked JOI" },
  { id: "findom", label: "Findom JOI" },
];

export default function VelvetMotion() {
  const [view, setView] = useState<"home" | "packs" | "joi" | "chat" | "gallery" | "crush">("home");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [gallery, setGallery] = useState<MediaItem[]>([]);
  const [generating, setGenerating] = useState<"image" | "video" | null>(null);
  const [tributes, setTributes] = useState(0);
  const [unlocked, setUnlocked] = useState(false);
  const [dailyMsg, setDailyMsg] = useState<string | null>(null);
  const [showDaily, setShowDaily] = useState(false);
  const [crushImage, setCrushImage] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const g = localStorage.getItem("velvet-gallery");
    const t = localStorage.getItem("velvet-tributes");
    const u = localStorage.getItem("velvet-unlocked");
    if (g) setGallery(JSON.parse(g));
    if (t) setTributes(Number(t));
    if (u === "true") setUnlocked(true);

    const last = localStorage.getItem("velvet-last-daily");
    const today = new Date().toDateString();
    if (last !== today) {
      const msgs = [
        "She just viewed your tribute… and liked it.",
        "New message: “Did you cum on my pic again like a good boy?”",
        "She posted a new story. You’re not going to like who she’s with.",
        "She texted: “I felt you stroking last night. Keep going.”",
        "Your tribute made her wet. She wants another one tonight.",
      ];
      setDailyMsg(msgs[Math.floor(Math.random() * msgs.length)]);
      setShowDaily(true);
      localStorage.setItem("velvet-last-daily", today);
    }
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const saveGallery = (items: MediaItem[]) => {
    setGallery(items);
    localStorage.setItem("velvet-gallery", JSON.stringify(items));
  };

  const addTribute = () => {
    const newCount = tributes + 1;
    setTributes(newCount);
    localStorage.setItem("velvet-tributes", String(newCount));
    if (newCount >= 1 && !unlocked) {
      setUnlocked(true);
      localStorage.setItem("velvet-unlocked", "true");
    }
    setMessages(prev => [...prev, {
      role: "assistant",
      content: newCount === 1
        ? `You actually did it…\n\nYou came on my picture like a pathetic little tribute bitch.\n\nI saw it.\n\nGood boy. You just unlocked something special.`
        : `Another tribute?\n\nYou’re so fucking addicted to me it’s embarrassing.\n\nKeep cumming on my pics. I like collecting them.`
    }]);
  };

  const startPack = (id: string) => {
    setView("chat");
    setMessages([{ role: "assistant", content: getOpening(id) }]);
  };

  function getOpening(id: string) {
    const map: Record<string, string> = {
      "blacked-weekend": `Friday 11:52 PM.\n\nShe texted you:\n\n“Marcus just pulled up. I’m going to be full of black cum until Monday. Stroke that useless dick while you think about it.”\n\nYou’re already hard. Your move.`,
      "brother": `You opened the door.\n\nYour brother is deep inside her on your own bed.\n\nShe looks straight at you while he fucks her and says:\n\n“Stroke. Don’t you dare look away.”`,
      "office": `Photo from the office bathroom stall.\n\nHer makeup slightly ruined, thick cock inside her.\n\nCaption: “Boss is busy. Keep stroking under your desk.”`,
      "dad": `You found the conversation on her phone.\n\nHer and your dad.\n\nLast message: “Come over after he falls asleep. I need to get fucked properly tonight.”`,
      "bnwo-training": `On your knees.\n\nTonight you stop pretending you’re a man.\n\nYou will accept that black cock owns the women you want and that your only purpose is to stroke and take tributes.\n\nSay “Yes Goddess”.`,
      "locked": `Day 19 locked.\n\nYou can hear her getting fucked through the wall.\n\nShe left the key on the table… just far enough that you can’t reach it while you’re stroking.`,
      "group": `Three of them.\n\nShe’s in the middle of the bed getting used from both ends while the third records.\n\nYou’re on the chair in the corner.\n\n“Stroke slow. You’re not allowed to cum until they finish with me.”`,
      "instagram": `New story.\n\nShe’s on her knees with a thick black cock resting on her cheek.\n\nCaption: “Upgraded.”\n\nShe texted you the screenshot with one word:\n\n“Tribute.”`,
      "ex": `Your ex just posted her new black boyfriend.\n\nThen she texted you:\n\n“He ruins me every night. You never could. Still stroking to me?”`,
      "wife": `You started this.\n\nNow she only gets wet for black cock.\n\nTonight she said: “I’m going out. When I get back I want you on your knees ready to hear every detail.”`,
    };
    return map[id] || "Let’s begin...";
  }

  async function sendMessage() {
    if (!input.trim() || isLoading) return;
    const userMsg: Message = { role: "user", content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    // TODO: Replace with real /api/chat call
    await new Promise(r => setTimeout(r, 900));

    setMessages(prev => [...prev, {
      role: "assistant",
      content: `She reads your message and smiles that cruel little smile.\n\n“Keep going. I want you desperate.”\n\nShe continues describing exactly how she’s being used while you stroke.`
    }]);
    setIsLoading(false);
  }

  async function generateMedia(type: "image" | "video") {
    setGenerating(type);
    await new Promise(r => setTimeout(r, type === "video" ? 2600 : 1500));

    const url = type === "image"
      ? "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=600&h=800&fit=crop"
      : "https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4";

    const item: MediaItem = {
      id: Date.now().toString(),
      type,
      url,
      prompt: type === "image" ? "Explicit photo" : "Explicit video",
      createdAt: new Date().toISOString(),
    };

    saveGallery([item, ...gallery].slice(0, 80));

    setMessages(prev => [...prev, {
      role: "assistant",
      content: type === "image"
        ? "Here’s a new photo of me…\n\nI want you to tribute it."
        : "Here’s a video just for you…\n\nWatch it and stroke.",
      image: type === "image" ? url : undefined,
      video: type === "video" ? url : undefined,
    }]);
    setGenerating(null);
  }

  const handleCrushUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCrushImage(URL.createObjectURL(file));
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Daily Message */}
      {showDaily && dailyMsg && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-pink-500/40 rounded-2xl p-6 max-w-sm w-full text-center">
            <div className="text-pink-400 text-xs font-medium mb-2 tracking-wider">SHE SENT YOU SOMETHING</div>
            <p className="text-lg mb-6 leading-relaxed">{dailyMsg}</p>
            <button onClick={() => setShowDaily(false)} className="w-full py-3 rounded-xl bg-pink-600 font-medium">
              Open
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="border-b border-pink-900/40 px-4 py-3 flex items-center justify-between sticky top-0 bg-black/95 backdrop-blur z-40">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full border border-pink-500 flex items-center justify-center text-pink-400 text-xs">♥</div>
          <div>
            <div className="font-bold tracking-widest text-sm">VELVET<span className="text-pink-500">MOTION</span></div>
            <div className="text-[10px] text-zinc-500 -mt-0.5">{tributes} tributes • {unlocked ? "Unlocked" : "Locked"}</div>
          </div>
        </div>
        <div className="flex gap-1 text-[11px]">
          {(["home", "packs", "joi", "crush", "gallery"] as const).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-2.5 py-1 rounded-full capitalize ${view === v ? "bg-pink-600" : "bg-zinc-900"}`}
            >
              {v}
            </button>
          ))}
        </div>
      </header>

      {/* HOME */}
      {view === "home" && (
        <main className="max-w-lg mx-auto p-4 space-y-4">
          <div className="text-center pt-6 pb-2">
            <h1 className="text-3xl font-bold text-pink-400">She’s waiting</h1>
            <p className="text-zinc-400 text-sm mt-2">Generate. Stroke. Tribute. Repeat.</p>
          </div>

          <button onClick={() => setView("packs")} className="w-full p-5 rounded-2xl bg-gradient-to-r from-pink-700 to-purple-900 text-left">
            <div className="font-bold text-lg">One-Tap Story Packs</div>
            <div className="text-sm text-white/80 mt-1">BNWO • Cuck • Blacked • Taboo</div>
          </button>

          <button onClick={() => setView("crush")} className="w-full p-5 rounded-2xl bg-zinc-900 border border-zinc-800 text-left">
            <div className="font-bold text-lg">Crush Helper</div>
            <div className="text-sm text-zinc-400 mt-1">Upload any girl → make her do anything</div>
          </button>

          <button onClick={() => setView("joi")} className="w-full p-5 rounded-2xl bg-zinc-900 border border-zinc-800 text-left">
            <div className="font-bold text-lg">JOI Center</div>
            <div className="text-sm text-zinc-400 mt-1">SPH • CEI • Ruin • Cuck • Blacked</div>
          </button>

          <button onClick={() => setView("gallery")} className="w-full p-5 rounded-2xl bg-zinc-900 border border-zinc-800 text-left">
            <div className="font-bold">Your Gallery</div>
            <div className="text-sm text-zinc-400 mt-1">{gallery.length} saved • ready for tributes</div>
          </button>

          <div className="p-4 rounded-2xl bg-zinc-900 border border-pink-900/40 text-sm">
            <div className="text-pink-300 font-medium mb-1">Tribute System</div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Generate a photo → cum on it → mark as tribute.<br />
              She notices every single one. First tribute unlocks more.
            </p>
          </div>
        </main>
      )}

      {/* PACKS */}
      {view === "packs" && (
        <main className="max-w-lg mx-auto p-4">
          <h2 className="text-xl font-bold text-pink-400 mb-4">Choose how she ruins you</h2>
          <div className="space-y-2.5">
            {STORY_PACKS.map(pack => (
              <button
                key={pack.id}
                onClick={() => startPack(pack.id)}
                className="w-full p-4 rounded-2xl bg-zinc-900 border border-zinc-800 text-left hover:border-pink-500/50 transition"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold bg-pink-600/20 text-pink-300 px-2 py-0.5 rounded-full">{pack.tag}</span>
                </div>
                <div className="font-semibold">{pack.title}</div>
                <div className="text-xs text-zinc-500 mt-0.5">{pack.desc}</div>
              </button>
            ))}
          </div>
        </main>
      )}

      {/* JOI */}
      {view === "joi" && messages.length === 0 && (
        <main className="max-w-lg mx-auto p-4">
          <h2 className="text-xl font-bold text-pink-400 mb-4">JOI Center</h2>
          <div className="grid grid-cols-2 gap-2">
            {JOI_PRESETS.map(j => (
              <button
                key={j.id}
                onClick={() => {
                  setView("chat");
                  setMessages([{ role: "assistant", content: j.id === "sph"
                    ? "Look at that pathetic little thing.\n\nStroke it slowly so I can laugh properly."
                    : j.id === "cuck"
                    ? "He’s already inside me.\n\nStroke while you listen to every wet sound."
                    : "Get your cock out.\n\nSlow strokes only. I control everything."
                  }]);
                }}
                className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 text-left hover:border-pink-500/50"
              >
                <div className="font-medium text-sm">{j.label}</div>
              </button>
            ))}
          </div>
        </main>
      )}

      {/* CRUSH HELPER */}
      {view === "crush" && (
        <main className="max-w-lg mx-auto p-4">
          <h2 className="text-xl font-bold text-pink-400 mb-2">Crush Helper</h2>
          <p className="text-zinc-500 text-sm mb-6">Upload any photo → generate nudes, sex videos, humiliation & more</p>

          <div
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-zinc-700 rounded-2xl p-8 text-center cursor-pointer hover:border-pink-500/40 mb-6"
          >
            {crushImage ? (
              <img src={crushImage} alt="Crush" className="w-32 h-40 object-cover rounded-xl mx-auto" />
            ) : (
              <>
                <div className="text-4xl mb-2">📷</div>
                <div className="text-sm text-zinc-400">Tap to upload her photo</div>
              </>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleCrushUpload} />

          {crushImage && (
            <div className="space-y-3">
              <button
                onClick={() => {
                  setView("chat");
                  setMessages([{ role: "assistant", content: "I’m her now.\n\nWhat do you want me to do?\n\nNudes, blowjob, SPH, blacked, JOI… just say it." }]);
                }}
                className="w-full py-3.5 rounded-2xl bg-pink-600 font-semibold"
              >
                Enter Private Room with Her
              </button>
            </div>
          )}
        </main>
      )}

      {/* GALLERY */}
      {view === "gallery" && (
        <main className="max-w-lg mx-auto p-4">
          <h2 className="text-xl font-bold text-pink-400 mb-1">Your Gallery</h2>
          <p className="text-zinc-500 text-sm mb-5">Save them. Tribute them. Come back every day.</p>

          {gallery.length === 0 ? (
            <div className="text-center py-16 text-zinc-500 text-sm">No media yet. Generate something first.</div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {gallery.map(item => (
                <div key={item.id} className="relative rounded-xl overflow-hidden border border-zinc-800">
                  {item.type === "image" ? (
                    <img src={item.url} className="w-full aspect-[3/4] object-cover" alt="" />
                  ) : (
                    <video src={item.url} className="w-full aspect-[3/4] object-cover" muted />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                  <div className="absolute bottom-2 left-2 right-2 flex justify-between items-center">
                    <span className="text-[10px] uppercase tracking-wider text-zinc-300">{item.type}</span>
                    {item.type === "image" && !item.tributed && (
                      <button
                        onClick={() => {
                          addTribute();
                          saveGallery(gallery.map(g => g.id === item.id ? { ...g, tributed: true } : g));
                        }}
                        className="text-[10px] bg-pink-600 px-2 py-1 rounded-full"
                      >
                        Tribute
                      </button>
                    )}
                    {item.tributed && <span className="text-[10px] text-pink-400">Tributed</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      )}

      {/* CHAT */}
      {view === "chat" && (
        <div className="flex flex-col h-[calc(100vh-57px)] max-w-lg mx-auto">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-[15px] leading-relaxed whitespace-pre-wrap ${
                  m.role === "user" ? "bg-pink-600" : "bg-zinc-900 border border-pink-900/40"
                }`}>
                  {m.content}
                  {m.image && (
                    <div className="mt-3">
                      <img src={m.image} className="rounded-xl w-full" alt="" />
                      <button
                        onClick={addTribute}
                        className="mt-2 w-full py-2 rounded-lg bg-pink-600/30 border border-pink-500/50 text-pink-300 text-xs"
                      >
                        I tributed this
                      </button>
                      <p className="text-[10px] text-center text-zinc-500 mt-1">Cum on it. It’s yours.</p>
                    </div>
                  )}
                  {m.video && (
                    <video src={m.video} controls className="mt-3 rounded-xl w-full" />
                  )}
                </div>
              </div>
            ))}
            {isLoading && <div className="text-pink-400 text-sm animate-pulse">She’s typing...</div>}
            <div ref={bottomRef} />
          </div>

          <div className="px-4 pb-2 flex gap-2">
            <button
              onClick={() => generateMedia("image")}
              disabled={!!generating}
              className="flex-1 py-2.5 rounded-full bg-pink-600/20 border border-pink-500/40 text-pink-300 text-xs font-medium"
            >
              {generating === "image" ? "Generating..." : "📸 New Photo"}
            </button>
            <button
              onClick={() => generateMedia("video")}
              disabled={!!generating}
              className="flex-1 py-2.5 rounded-full bg-pink-600/20 border border-pink-500/40 text-pink-300 text-xs font-medium"
            >
              {generating === "video" ? "Generating..." : "🎥 New Video"}
            </button>
          </div>

          <div className="p-4 border-t border-pink-900/30">
            <div className="flex gap-2">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()}
                placeholder="Reply to her..."
                className="flex-1 bg-zinc-900 border border-zinc-700 rounded-full px-5 py-3 text-sm focus:border-pink-500 outline-none"
              />
              <button
                onClick={sendMessage}
                disabled={isLoading}
                className="bg-pink-600 hover:bg-pink-500 disabled:opacity-40 px-5 rounded-full font-medium"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
