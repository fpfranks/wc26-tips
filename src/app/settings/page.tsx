"use client";

import { useState, useEffect } from "react";
import { Settings, Key, Save, Check, Trash2 } from "lucide-react";

export default function SettingsPage() {
  const [apiKey, setApiKey]     = useState("");
  const [bankroll, setBankroll] = useState("");
  const [saved, setSaved]       = useState(false);

  useEffect(() => {
    setApiKey(localStorage.getItem("wc26-anthropic-key") ?? "");
    setBankroll(localStorage.getItem("wc26-bankroll") ?? "200");
  }, []);

  function handleSave() {
    if (apiKey) localStorage.setItem("wc26-anthropic-key", apiKey);
    else localStorage.removeItem("wc26-anthropic-key");
    localStorage.setItem("wc26-bankroll", bankroll);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function handleClearKey() {
    setApiKey("");
    localStorage.removeItem("wc26-anthropic-key");
  }

  const maskedKey = apiKey.length > 10
    ? `${apiKey.slice(0, 16)}${"•".repeat(12)}${apiKey.slice(-4)}`
    : apiKey;

  return (
    <div className="p-6 max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-sm text-white/40 mt-0.5">API keys and preferences — stored in your browser only</p>
      </div>

      <div className="rounded-2xl border border-white/8 overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 bg-white/3 border-b border-white/8">
          <Key className="h-4 w-4 text-amber-400" />
          <h2 className="text-sm font-semibold text-white">Anthropic API Key</h2>
        </div>
        <div className="px-5 py-5 space-y-4">
          <p className="text-xs text-white/40 leading-relaxed">
            Required for AI betting analysis. Get your key at{" "}
            <a href="https://console.anthropic.com" target="_blank" rel="noopener noreferrer"
              className="text-amber-400 hover:text-amber-300">console.anthropic.com</a>.
            Stored in your browser only — never sent to any server except Anthropic directly.
          </p>

          <div>
            <label className="text-xs font-medium text-white/50 block mb-1.5">API Key</label>
            <input
              type="password"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder="sk-ant-api03-..."
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 font-mono focus:outline-none focus:border-amber-500/50"
            />
            {apiKey && (
              <p className="text-[10px] text-white/25 mt-1 font-mono">{maskedKey}</p>
            )}
          </div>

          {apiKey && (
            <button onClick={handleClearKey}
              className="flex items-center gap-1.5 text-xs text-red-400/60 hover:text-red-400 transition-colors">
              <Trash2 className="h-3 w-3" /> Remove key
            </button>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-white/8 overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 bg-white/3 border-b border-white/8">
          <Settings className="h-4 w-4 text-blue-400" />
          <h2 className="text-sm font-semibold text-white">Betting Preferences</h2>
        </div>
        <div className="px-5 py-5 space-y-4">
          <div>
            <label className="text-xs font-medium text-white/50 block mb-1.5">Bankroll (£)</label>
            <div className="flex items-center bg-white/5 border border-white/10 rounded-xl overflow-hidden">
              <span className="px-4 text-sm text-white/30 border-r border-white/10 py-3">£</span>
              <input
                type="number"
                value={bankroll}
                onChange={e => setBankroll(e.target.value)}
                placeholder="200"
                className="flex-1 bg-transparent px-4 py-3 text-sm text-white focus:outline-none"
              />
            </div>
            <p className="text-xs text-white/30 mt-1">Used to calculate suggested stake amounts via Kelly Criterion</p>
          </div>
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
