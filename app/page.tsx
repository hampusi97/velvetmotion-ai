"use client";

import { useState, useEffect } from "react";

const GIRLS = [
  { name: "Luna", tag: "Tease" },
  { name: "Nova", tag: "Dominant" },
  { name: "Mia", tag: "Sweet" },
  { name: "Scarlett", tag: "Wild" },
  { name: "Elena", tag: "Mean" },
  { name: "Kira", tag: "BNWO" },
  { name: "Jade", tag: "Cuck" },
  { name: "Aria", tag: "Voice" },
  { name: "Raven", tag: "Dark" },
  { name: "Ivy", tag: "Playful" },
  { name: "Sienna", tag: "Confident" },
  { name: "Lexi", tag: "Adult Film" },
  { name: "Riley", tag: "Adult Film" },
  { name: "Sasha", tag: "Adult Film" },
];

const PACKS = [
  { title: "Blacked Weekend", tag: "BNWO" },
  { title: "She Fucks Your Brother", tag: "CUCK" },
  { title: "Office Cuck", tag: "CUCK" },
  { title: "BNWO Training", tag: "BNWO" },
  { title: "Chastity Night", tag: "CUCK" },
  { title: "Rejection Revenge", tag: "CUCK" },
];

const JOI = ["Classic JOI", "SPH JOI", "CEI", "Long Edge", "Cuck JOI", "Voice JOI", "Chastity", "Ruin Orgasm"];

export default function Home() {
  const [view, setView] = useState("home");
  const [ageOk, setAgeOk] = useState(false);
  const [coins, setCoins] = useState(50);
  const [streak, setStreak] = useState(1);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [customName, setCustomName] = useState("");
  const [customGirls, setCustomGirls] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [suggestion, setSuggestion] = useState("");
  const [gallery, setGallery] = useState([]);

  useEffect(() => {
    const saved = localStorage.getItem("vm-coins");
    if (saved) setCoins(parseInt(saved));
    const s = localStorage.getItem("vm-streak");
    if (s) setStreak(parseInt(s));
  }, []);

  const speak = (text) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    const u = new SpeechSynthesisUtterance(text.slice(0, 200));
    u.rate = 0.95;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  };

  const sendChat = () => {
    if (!input.trim()) return;
    setMessages(m => [...m, { role: "user", content: input }]);
    setTimeout(() => {
      setMessages(m => [...m, { role: "assistant", content: "*soft voice* I heard you... keep going." }]);
    }, 600);
    setInput("");
  };

  const createGirl = () => {
    if (!customName.trim()) return;
    setCustomGirls(g => [...g, { name: customName, tag: "Custom" }]);
    setCustomName("");
    setView("girls");
  };

  const addSuggestion = () => {
    if (!suggestion.trim()) return;
    setSuggestions(s => [...s, suggestion]);
    setSuggestion("");
  };

  const generateMedia = () => {
    setGallery(g => [{ id: Date.now(), createdAt: new Date().toISOString() }, ...g]);
    setView("gallery");
  };

  if (!ageOk) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <h1 className="text-3xl font-bold text-pink-400 mb-4">VelvetMotion</h1>
          <p className="text-zinc-400 mb-6">All content is fantasy. Only upload photos of yourself.</p>
          <button onClick={() => setAgeOk(true)} className="px-8 py-4 bg-pink-600 rounded-xl text-lg font-semibold">I am 18+</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-4">
      <div className="text-center text-xs text-pink-400 mb-2">All content is fantasy. Only upload photos of yourself.</div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-pink-400">VelvetMotion</h1>
        <div className="text-sm text-zinc-400">Coins: {coins} · Streak: {streak}</div>
      </div>

      {view === "home" && (
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => setView("girls")} className="p-5 bg-zinc-900 rounded-xl text-left">Fictional Girls</button>
          <button onClick={() => setView("create")} className="p-5 bg-zinc-900 rounded-xl text-left">Create Girl</button>
          <button onClick={() => setView("romance")} className="p-5 bg-zinc-900 rounded-xl text-left">Romance</button>
          <button onClick={() => setView("bnwo")} className="p-5 bg-zinc-900 rounded-xl text-left">BNWO</button>
          <button onClick={() => setView("tinder")} className="p-5 bg-zinc-900 rounded-xl text-left">Tinder</button>
          <button onClick={() => setView("joi")} className="p-5 bg-zinc-900 rounded-xl text-left">JOI</button>
          <button onClick={() => setView("room")} className="p-5 bg-zinc-900 rounded-xl text-left">Goon Room</button>
          <button onClick={() => setView("suggest")} className="p-5 bg-zinc-900 rounded-xl text-left">Suggest</button>
          <button onClick={() => setView("gallery")} className="p-5 bg-zinc-900 rounded-xl text-left">Gallery</button>
          <button onClick={() => setView("packs")} className="p-5 bg-zinc-900 rounded-xl text-left">Story Packs</button>
          <button onClick={() => setView("chat")} className="p-5 bg-zinc-900 rounded-xl text-left">Chat</button>
          <button onClick={() => setView("affiliate")} className="p-5 bg-zinc-900 rounded-xl text-left">Affiliate</button>
        </div>
      )}

      {view === "girls" && (
        <div>
          <button onClick={() => setView("home")} className="text-pink-400 mb-4">← Home</button>
          <h2 className="text-xl font-semibold mb-4">Fictional Girls</h2>
          <div className="space-y-2">
            {[...GIRLS, ...customGirls].map(g => (
              <div key={g.name} className="p-4 bg-zinc-900 rounded-xl flex justify-between">
                <div><div className="font-medium">{g.name}</div><div className="text-xs text-zinc-500">{g.tag}</div></div>
                <button onClick={() => { setView("chat"); setMessages([{ role: "assistant", content: "Hey, it's " + g.name }]); }} className="text-pink-400 text-sm">Chat</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {view === "create" && (
        <div>
          <button onClick={() => setView("home")} className="text-pink-400 mb-4">← Home</button>
          <h2 className="text-xl font-semibold mb-4">Create Your Girl</h2>
          <input value={customName} onChange={e => setCustomName(e.target.value)} placeholder="Her name" className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 mb-3" />
          <button onClick={createGirl} className="w-full py-3 bg-pink-600 rounded-xl">Create</button>
        </div>
      )}

      {view === "chat" && (
        <div>
          <button onClick={() => setView("home")} className="text-pink-400 mb-4">← Home</button>
          <h2 className="text-xl font-semibold mb-4">Chat</h2>
          <div className="bg-zinc-900 rounded-xl p-4 h-64 overflow-y-auto mb-3 space-y-2">
            {messages.map((m, i) => (
              <div key={i} className={m.role === "user" ? "text-right" : ""}>
                <div className="inline-block px-3 py-2 bg-zinc-800 rounded-lg text-sm">{m.content}</div>
                {m.role === "assistant" && <button onClick={() => speak(m.content)} className="block text-[10px] text-pink-400 mt-1">Speak</button>}
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && sendChat()} placeholder="Say something..." className="flex-1 bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2" />
            <button onClick={sendChat} className="px-4 bg-pink-600 rounded-xl">Send</button>
          </div>
        </div>
      )}

      {view === "joi" && (
        <div>
          <button onClick={() => setView("home")} className="text-pink-400 mb-4">← Home</button>
          <h2 className="text-xl font-semibold mb-4">JOI Center</h2>
          <div className="grid grid-cols-2 gap-2">
            {JOI.map(j => (
              <button key={j} onClick={() => { setView("chat"); setMessages([{ role: "assistant", content: j + " — start stroking." }]); }} className="p-3 bg-zinc-900 rounded-xl text-sm">{j}</button>
            ))}
          </div>
        </div>
      )}

      {view === "packs" && (
        <div>
          <button onClick={() => setView("home")} className="text-pink-400 mb-4">← Home</button>
          <h2 className="text-xl font-semibold mb-4">Story Packs</h2>
          <div className="space-y-2">
            {PACKS.map(p => (
              <button key={p.title} onClick={() => { setView("chat"); setMessages([{ role: "assistant", content: p.title + " begins..." }]); }} className="w-full p-4 bg-zinc-900 rounded-xl text-left">
                <div className="font-medium">{p.title}</div>
                <div className="text-xs text-zinc-500">{p.tag}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {view === "bnwo" && (
        <div>
          <button onClick={() => setView("home")} className="text-pink-400 mb-4">← Home</button>
          <h2 className="text-xl font-semibold mb-4">BNWO</h2>
          <div className="space-y-2">
            {["Training", "Cuck", "Worship", "Blacked"].map(m => (
              <button key={m} onClick={() => { setView("chat"); setMessages([{ role: "assistant", content: "BNWO " + m + " mode." }]); }} className="w-full p-4 bg-zinc-900 rounded-xl text-left">{m}</button>
            ))}
          </div>
        </div>
      )}

      {view === "tinder" && (
        <div>
          <button onClick={() => setView("home")} className="text-pink-400 mb-4">← Home</button>
          <h2 className="text-xl font-semibold mb-4">Tinder Roleplay</h2>
          <button onClick={() => { setView("chat"); setMessages([{ role: "assistant", content: "Hey, you matched. What do you want?" }]); }} className="block w-full p-4 bg-zinc-900 rounded-xl mb-2 text-left">Play as the Girl</button>
          <button onClick={() => { setView("chat"); setMessages([{ role: "assistant", content: "She matched with you. She's typing..." }]); }} className="block w-full p-4 bg-zinc-900 rounded-xl text-left">Talk to Her</button>
        </div>
      )}

      {view === "romance" && (
        <div>
          <button onClick={() => setView("home")} className="text-pink-400 mb-4">← Home</button>
          <h2 className="text-xl font-semibold mb-4">Romance</h2>
          <p className="text-zinc-400 mb-4">She seems interested. Soft and warm.</p>
          <button onClick={() => { setView("chat"); setMessages([{ role: "assistant", content: "*soft smile* I've been thinking about you..." }]); }} className="px-6 py-3 bg-pink-600 rounded-xl">Start</button>
        </div>
      )}

      {view === "room" && (
        <div>
          <button onClick={() => setView("home")} className="text-pink-400 mb-4">← Home</button>
          <h2 className="text-xl font-semibold mb-4">Goon Room</h2>
          <div className="bg-zinc-900 rounded-xl p-4 h-48 mb-3 text-sm text-zinc-400">
            <div>Guy1: edge with me</div>
            <div>Guy2: she's so mean</div>
            <div className="text-zinc-600">demo chat</div>
          </div>
          <input placeholder="Type..." className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2" />
        </div>
      )}

      {view === "suggest" && (
        <div>
          <button onClick={() => setView("home")} className="text-pink-400 mb-4">← Home</button>
          <h2 className="text-xl font-semibold mb-4">Suggest a Feature</h2>
          <textarea value={suggestion} onChange={e => setSuggestion(e.target.value)} placeholder="What do you want?" className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 h-24 mb-3" />
          <button onClick={addSuggestion} className="px-6 py-2 bg-pink-600 rounded-xl">Send</button>
          <div className="mt-4 space-y-1 text-sm text-zinc-400">{suggestions.map((s, i) => <div key={i}>• {s}</div>)}</div>
        </div>
      )}

      {view === "gallery" && (
        <div>
          <button onClick={() => setView("home")} className="text-pink-400 mb-4">← Home</button>
          <h2 className="text-xl font-semibold mb-4">Gallery</h2>
          <button onClick={generateMedia} className="mb-4 px-4 py-2 bg-pink-600 rounded-xl text-sm">Generate (demo)</button>
          <div className="space-y-2">
            {gallery.map(g => <div key={g.id} className="p-4 bg-zinc-900 rounded-xl text-sm">Fantasy media</div>)}
            {gallery.length === 0 && <p className="text-zinc-500 text-sm">Nothing yet.</p>}
          </div>
        </div>
      )}

      {view === "affiliate" && (
        <div>
          <button onClick={() => setView("home")} className="text-pink-400 mb-4">← Home</button>
          <h2 className="text-xl font-semibold mb-4">Affiliate</h2>
          <p className="text-sm text-zinc-400 mb-2">Share and earn.</p>
          <div className="p-4 bg-zinc-900 rounded-xl text-xs break-all">https://velvetmotion-ai.vercel.app?ref=YOU</div>
          <p className="text-xs text-zinc-500 mt-3">Payout wallet: bc1qjmf9u3cmrn59q5nqmzgkvrgy7exegnfmph999k</p>
        </div>
      )}
    </div>
  );
}
