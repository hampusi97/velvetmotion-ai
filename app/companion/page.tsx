"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { parseChatHistory, type ChatMessage } from "../../lib/chat-history";

type Profile = { name: string; personality: string; notes: string };
type Status = { runtime: string; phase?: string; message?: string; models: string[]; default_model?: string };
const button = "min-h-11 rounded-xl border border-zinc-700 px-4 py-2 text-sm disabled:opacity-40";
const field = "min-h-11 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm";

export default function Companion() {
  const [adult, setAdult] = useState(false);
  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState<Profile>({ name: "Nova", personality: "kind", notes: "" });
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<Status>({ runtime: "checking", models: [] });
  const [model, setModel] = useState("");
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(true);
  const [busy, setBusy] = useState(false);
  const request = useRef<AbortController | null>(null);
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      setAdult(localStorage.getItem("velvet-age") === "true");
      const data = JSON.parse(localStorage.getItem("vm-local-companion") || "null");
      if (data && typeof data === "object") {
        setMessages(parseChatHistory(JSON.stringify(data.messages)));
        if (data.profile && typeof data.profile.name === "string") setProfile({ name: data.profile.name.slice(0, 60), personality: ["kind", "playful", "thoughtful"].includes(data.profile.personality) ? data.profile.personality : "kind", notes: typeof data.profile.notes === "string" ? data.profile.notes.slice(0, 600) : "" });
        if (typeof data.model === "string") setModel(data.model);
      }
    } catch { setSaved(false); }
    setReady(true);
    return () => { request.current?.abort(); window.speechSynthesis?.cancel(); };
  }, []);

  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem("vm-local-companion", JSON.stringify({ profile, messages: messages.slice(-100), model })); }
    catch { setSaved(false); }
  }, [ready, profile, messages, model]);

  const check = useCallback(async () => {
    try {
      const response = await fetch("/api/local-status", { signal: AbortSignal.timeout(5000), cache: "no-store" });
      const data = await response.json();
      if (data.runtime === "local" && Array.isArray(data.models)) {
        setStatus(data);
        setModel(current => data.models.includes(current) ? current : data.default_model ?? data.models[0] ?? "");
      } else setStatus({ runtime: "hosted", models: [] });
    } catch { setStatus({ runtime: "hosted", models: [] }); }
  }, []);
  useEffect(() => {
    if (!adult) return;
    void check();
    const timer = window.setInterval(() => { void check(); }, 5000);
    return () => window.clearInterval(timer);
  }, [adult, check]);
  useEffect(() => { bottom.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, [messages, busy]);

  const send = async (event: React.FormEvent) => {
    event.preventDefault();
    const text = input.trim();
    if (!text || busy || !model || status.runtime !== "local") return;
    const before = messages;
    const next: ChatMessage[] = [...before, { role: "user", content: text }];
    setMessages(next); setInput(""); setError(""); setBusy(true);
    const controller = new AbortController(); request.current = controller;
    try {
      const response = await fetch("/api/companion", { method: "POST", headers: { "Content-Type": "application/json" }, signal: controller.signal, body: JSON.stringify({ model, profile, messages: next.slice(-24) }) });
      const data = await response.json();
      if (!response.ok || typeof data.reply !== "string") throw new Error(data.error || "The model did not return a reply.");
      setMessages([...next, { role: "assistant", content: data.reply }]);
    } catch (cause) {
      setMessages(before); setInput(text);
      setError(controller.signal.aborted ? "Reply stopped. Your message is ready to retry." : cause instanceof Error ? cause.message : "Could not reach the local model.");
    } finally { setBusy(false); request.current = null; }
  };

  if (!ready) return <main className="min-h-screen bg-black" />;
  if (!adult) return <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-5 p-6"><h1 className="text-2xl font-semibold text-pink-400">VelvetMotion companion</h1><p>This fictional companion is for adults. Conversation and non-explicit romance only.</p><button className={button} onClick={() => { try { localStorage.setItem("velvet-age", "true"); } catch { setSaved(false); } setAdult(true); }}>I am 18 or older</button></main>;

  return <main className="mx-auto max-w-3xl space-y-5 p-4 pb-10">
    <Link href="/" className="inline-flex min-h-11 items-center text-pink-400">← VelvetMotion home</Link>
    <header><p className="text-xs uppercase tracking-widest text-pink-300">On your computer</p><h1 className="mt-2 text-3xl font-semibold">Your companion</h1><p className="mt-2 text-sm text-zinc-400">Fictional conversation, warmth, and non-explicit romance. Real replies from your local model.</p></header>
    {status.runtime !== "local" ? <section className="space-y-3 rounded-2xl border border-pink-800 p-5" aria-labelledby="setup-heading"><h2 id="setup-heading" className="text-lg font-medium">Start the Windows local app</h2><p className="text-sm text-zinc-300">The hosted website cannot run models on your PC. Download the local app, extract the ZIP, and double-click <strong>START-WINDOWS.cmd</strong>. It opens this companion on your computer.</p><p className="text-sm text-zinc-400">Install Ollama once. The launcher prepares a portable Node runtime if needed and downloads a starter model only when you have no models installed.</p><div className="flex flex-wrap gap-3"><a href="/downloads/velvetmotion-local-windows.zip" download className={button + " bg-pink-600"}>Download Windows local app</a><a href="https://ollama.com/download/windows" target="_blank" rel="noreferrer" className={button}>Get Ollama for Windows</a></div><p className="text-xs text-zinc-500">First setup needs internet and roughly 1 GB for the starter model. Your PC must stay on while you use local inference.</p></section> : <section className="space-y-3 rounded-2xl border border-zinc-800 p-4"><p role="status" className="text-sm text-zinc-300">{status.message || "Connected to your local Ollama server."}</p><label className="block text-sm">Local model<select className={field + " mt-1"} value={model} disabled={busy || !status.models.length} onChange={e => setModel(e.target.value)}>{!status.models.length && <option value="">Waiting for a model…</option>}{status.models.map(name => <option key={name}>{name}</option>)}</select></label><button className={button} onClick={() => { void check(); }}>Refresh connection</button></section>}
    <details className="rounded-2xl border border-zinc-800 p-4"><summary className="cursor-pointer py-1">Companion preferences</summary><div className="mt-4 grid gap-4 sm:grid-cols-2"><label className="text-sm">Name<input className={field + " mt-1"} value={profile.name} maxLength={60} onChange={e => setProfile({ ...profile, name: e.target.value })} /></label><label className="text-sm">Personality<select className={field + " mt-1"} value={profile.personality} onChange={e => setProfile({ ...profile, personality: e.target.value })}><option value="kind">Kind</option><option value="playful">Playful</option><option value="thoughtful">Thoughtful</option></select></label><label className="text-sm sm:col-span-2">Memory notes<textarea className={field + " mt-1"} placeholder="Things you want your companion to remember" value={profile.notes} maxLength={600} onChange={e => setProfile({ ...profile, notes: e.target.value })} /></label></div></details>
    <section aria-label="Conversation" className="min-h-56 space-y-3 rounded-2xl border border-zinc-800 p-4">
      {!messages.length && <p className="text-sm text-zinc-500">Say hello to {profile.name.trim() || "your companion"}. Replies appear here when the local model is connected.</p>}
      {messages.map((message, index) => <div key={index} className={"max-w-[92%] rounded-xl p-3 text-sm " + (message.role === "user" ? "ml-auto bg-pink-900/50" : "bg-zinc-900")}><p className="mb-1 text-xs font-medium text-zinc-400">{message.role === "user" ? "You" : profile.name || "Companion"}</p><p className="whitespace-pre-wrap break-words">{message.content}</p>{message.role === "assistant" && <button className="mt-2 min-h-11 text-xs text-pink-300" onClick={() => { if (!("speechSynthesis" in window)) { setError("Speech synthesis is unavailable in this browser."); return; } window.speechSynthesis.cancel(); window.speechSynthesis.speak(new SpeechSynthesisUtterance(message.content)); }}>Speak</button>}</div>)}
      {busy && <p role="status" className="text-sm text-zinc-400">Your local model is thinking…</p>}<div ref={bottom} />
    </section>
    <div className="flex flex-wrap gap-2">{["How was your day?", "Tell me a short story", "Help me unwind"].map(text => <button key={text} className={button} onClick={() => setInput(text)}>{text}</button>)}</div>
    <form onSubmit={send} className="flex gap-2"><input aria-label="Message your companion" className={field + " min-w-0 flex-1"} value={input} maxLength={4000} onChange={e => setInput(e.target.value)} placeholder="Write a message…" /><button className={button + " bg-pink-600"} disabled={busy || !input.trim() || !model || status.runtime !== "local"}>Send</button>{busy && <button type="button" className={button} onClick={() => request.current?.abort()}>Stop</button>}</form>
    {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
    <footer className="flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-500"><p>{saved ? "Up to 100 messages saved in this browser; the latest 24 are sent as context. Memory notes are included with each reply." : "Storage is unavailable. This conversation lasts for this visit."}</p><button className={button} disabled={busy} onClick={() => { window.speechSynthesis?.cancel(); setMessages([]); setError(""); }}>Clear chat</button></footer>
  </main>;
}
