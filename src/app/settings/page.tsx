"use client";

import { useState, useEffect } from "react";
import { Settings, Key, Save, Check, Trash2, ExternalLink, BarChart2 } from "lucide-react";

export default function SettingsPage() {
  const [groqKey, setGroqKey]     = useState("");
  const [oddsKey, setOddsKey]     = useState("");
  const [bankroll, setBankroll]   = useState("");
  const [saved, setSaved]         = useState(false);

  useEffect(() => {
    setGroqKey(localStorage.getItem("wc26-groq-key") ?? "");
    setOddsKey(localStorage.getItem("wc26-odds-key") ?? "");
    setBankroll(localStorage.getItem("wc26-bankroll") ?? "200");
  }, []);

  function handleSave() {
    if (groqKey) localStorage.setItem("wc26-groq-key", groqKey);
    else localStorage.removeItem("wc26-groq-key");
    if (oddsKey) localStorage.setItem("wc26-odds-key", oddsKey);
    else localStorage.removeItem("wc26-odds-key");
    localStorage.setItem("wc26-bankroll", bankroll);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const maskKey = (k: string) =>
    k.length > 10 ? `${k.slice(0, 10)}${"•".repeat(10)}${k.slice(-4)}` : k;

  return (
    <div className="p-6 max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-sm text-white/40 mt-0.5">API keys and preferences — stored in your browser only</p>
      </div>

      {/* Groq key */}
      <div className="rounded-2xl border border-white/8 overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 bg-white/3 border-b border-white/8">
          <Key className="h-4 w-4 text-amber-400" />
          <h2 className="text-sm font-semibold text-white">Groq API Key</h2>
          <span className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-500/15 text-green-400">FREE</span>
        </div>
        <div className="px-5 py-5 space-y-4">
          <p className="text-xs text-white/40 leading-relaxed">
            Powers all AI betting analysis. Free — 14,400 requests/day.{" "}
            Get your key at{" "}
            <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer"
              className="text-amber-400 hover:text-amber-300 inline-flex items-center gap-0.5">
              console.groq.com <ExternalLink className="h-2.5 w-2.5" />
            </a>
          </p>
          <div>
            <label className="text-xs font-medium text-white/50 block mb-1.5">Groq API Key</label>
            <input type="password" value={groqKey} onChange={e => setGroqKey(e.target.value)}
              placeholder="gsk_..."
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 font-mono focus:outline-none focus:border-amber-500/50" />
            {groqKey && <p className="text-[10px] text-white/25 mt-1 font-mono">{maskKey(groqKey)}</p>}
          </div>
          {groqKey && (
            <button onClick={() => { setGroqKey(""); localStorage.removeItem("wc26-groq-key"); }}
              className="flex items-center gap-1.5 text-xs text-red-400/60 hover:text-red-400 transition-colors">
              <Trash2 className="h-3 w-3" /> Remove key
            </button>
          )}
        </div>
      </div>

      {/* Odds API key */}
      <div className="rounded-2xl border border-blue-500/20 overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 bg-blue-500/5 border-b border-blue-500/15">
          <BarChart2 className="h-4 w-4 text-blue-400" />
          <h2 className="text-sm font-semibold text-white">Odds API Key</h2>
          <span className="text-[10px] text-blue-400/70 ml-1">odds-api.io</span>
          <span className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-500/15 text-green-400">FREE</span>
        </div>
        <div className="px-5 py-5 space-y-4">
          <p className="text-xs text-white/40 leading-relaxed">
            Fetches live odds from <span className="text-blue-400 font-medium">Rollbit, Gamdom, BetPanda &amp; Betplay</span>{" "}
            to detect mismatches and find the best price. Free tier — no credit card needed.{" "}
            Sign up at{" "}
            <a href="https://odds-api.io" target="_blank" rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 inline-flex items-center gap-0.5">
              odds-api.io <ExternalLink className="h-2.5 w-2.5" />
            </a>
          </p>
          <div>
            <label className="text-xs font-medium text-white/50 block mb-1.5">Odds API Key</label>
            <input type="password" value={oddsKey} onChange={e => setOddsKey(e.target.value)}
              placeholder="odds_..."
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 font-mono focus:outline-none focus:border-blue-500/50" />
            {oddsKey && <p className="text-[10px] text-white/25 mt-1 font-mono">{maskKey(oddsKey)}</p>}
          </div>
          {oddsKey && (
            <button onClick={() => { setOddsKey(""); localStorage.removeItem("wc26-odds-key"); }}
              className="flex items-center gap-1.5 text-xs text-red-400/60 hover:text-red-400 transition-colors">
              <Trash2 className="h-3 w-3" /> Remove key
            </button>
          )}
        </div>
      </div>

      {/* Bankroll */}
      <div className="rounded-2xl border border-white/8 overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 bg-white/3 border-b border-white/8">
          <Settings className="h-4 w-4 text-white/40" />
          <h2 className="text-sm font-semibold text-white">Betting Preferences</h2>
        </div>
        <div className="px-5 py-5">
          <label className="text-xs font-medium text-white/50 block mb-1.5">Bankroll (£)</label>
          <div className="flex items-center bg-white/5 border border-white/10 rounded-xl overflow-hidden">
            <span className="px-4 text-sm text-white/30 border-r border-white/10 py-3">£</span>
            <input type="number" value={bankroll} onChange={e => setBankroll(e.target.value)}
              placeholder="200"
              className="flex-1 bg-transparent px-4 py-3 text-sm text-white focus:outline-none" />
          </div>
          <p className="text-xs text-white/30 mt-1">Used for Kelly Criterion stake calculations</p>
        </div>
      </div>

      <button onClick={handleSave}
        className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all ${
          saved ? "bg-green-500 text-white" : "bg-amber-500 hover:bg-amber-400 text-black"
        }`}>
        {saved ? <><Check className="h-4 w-4" /> Saved</> : <><Save className="h-4 w-4" /> Save Settings</>}
      </button>
    </div>
  );
}
