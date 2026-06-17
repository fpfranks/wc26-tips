"use client";

import { useState, useEffect, useRef } from "react";
import { X } from "lucide-react";
import { useApp, type Platform, type TipResult } from "@/context/AppContext";

interface Props {
  onClose: () => void;
  editId?: string;
}

const MARKETS = ["Match Result", "Both Teams to Score", "Over 2.5 Goals", "Under 2.5 Goals", "Over 1.5 Goals", "First Goal Scorer", "Correct Score", "Handicap", "Draw No Bet", "Other"];
const PLATFORMS: Platform[] = ["Gamdom", "Rollbit", "Other"];

export default function AddTipModal({ onClose, editId }: Props) {
  const { tips, addTip, updateTip } = useApp();
  const editing = editId ? tips.find(t => t.id === editId) : null;

  const [homeTeam, setHomeTeam]       = useState(editing?.homeTeam ?? "");
  const [awayTeam, setAwayTeam]       = useState(editing?.awayTeam ?? "");
  const [date, setDate]               = useState(editing?.date ?? new Date().toISOString().slice(0, 10));
  const [market, setMarket]           = useState(editing?.market ?? "Match Result");
  const [prediction, setPrediction]   = useState(editing?.prediction ?? "");
  const [confidence, setConfidence]   = useState(editing?.confidence ?? 60);
  const [homeWinProb, setHomeWinProb] = useState(editing?.homeWinProb ?? 40);
  const [drawProb, setDrawProb]       = useState(editing?.drawProb ?? 25);
  const [awayWinProb, setAwayWinProb] = useState(editing?.awayWinProb ?? 35);
  const [homeOdds, setHomeOdds]       = useState(editing?.homeOdds ?? 0);
  const [drawOdds, setDrawOdds]       = useState(editing?.drawOdds ?? 0);
  const [awayOdds, setAwayOdds]       = useState(editing?.awayOdds ?? 0);
  const [platform, setPlatform]       = useState<Platform>(editing?.platform ?? "Gamdom");
  const [analysis, setAnalysis]       = useState(editing?.analysis ?? "");
  const [result, setResult]           = useState<TipResult>(editing?.result ?? "pending");

  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const match = `${homeTeam} vs ${awayTeam}`;
    const data = {
      match, homeTeam, awayTeam, date, market, prediction,
      confidence, homeWinProb, drawProb, awayWinProb,
      homeOdds, drawOdds, awayOdds, platform, analysis, result,
    };
    if (editing) {
      updateTip(editing.id, data);
    } else {
      addTip(data);
    }
    onClose();
  }

  const totalProb = homeWinProb + drawProb + awayWinProb;

  return (
    <div ref={overlayRef} onClick={e => e.target === overlayRef.current && onClose()}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#0f1724] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/8">
          <h2 className="text-base font-semibold text-white">{editing ? "Edit Tip" : "Add Tip"}</h2>
          <button onClick={onClose} className="text-white/30 hover:text-white transition-colors"><X className="h-4 w-4" /></button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">

          {/* Match */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-white/50 block mb-1.5">Home Team *</label>
              <input value={homeTeam} onChange={e => setHomeTeam(e.target.value)} required
                placeholder="e.g. Brazil" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-amber-500/50" />
            </div>
            <div>
              <label className="text-xs font-medium text-white/50 block mb-1.5">Away Team *</label>
              <input value={awayTeam} onChange={e => setAwayTeam(e.target.value)} required
                placeholder="e.g. Argentina" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-amber-500/50" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-white/50 block mb-1.5">Match Date *</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} required
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500/50" />
            </div>
            <div>
              <label className="text-xs font-medium text-white/50 block mb-1.5">Market</label>
              <select value={market} onChange={e => setMarket(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500/50">
                {MARKETS.map(m => <option key={m} value={m} className="bg-[#0f1724]">{m}</option>)}
              </select>
            </div>
          </div>

          {/* Prediction */}
          <div>
            <label className="text-xs font-medium text-white/50 block mb-1.5">Prediction *</label>
            <input value={prediction} onChange={e => setPrediction(e.target.value)} required
              placeholder="e.g. Brazil Win, Over 2.5 Goals, Yes..." className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-amber-500/50" />
          </div>

          {/* Win probability */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-white/50">Win Probabilities</label>
              <span className={`text-xs ${Math.abs(totalProb - 100) > 1 ? "text-red-400" : "text-white/30"}`}>{totalProb}%</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: homeTeam || "Home", val: homeWinProb, set: setHomeWinProb, color: "text-blue-400" },
                { label: "Draw", val: drawProb, set: setDrawProb, color: "text-white/50" },
                { label: awayTeam || "Away", val: awayWinProb, set: setAwayWinProb, color: "text-amber-400" },
              ].map(({ label, val, set, color }) => (
                <div key={label}>
                  <label className={`text-[10px] font-medium ${color} block mb-1 truncate`}>{label}</label>
                  <div className="flex items-center gap-1.5">
                    <input type="number" value={val} onChange={e => set(Number(e.target.value))} min={0} max={100}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none focus:border-amber-500/50 text-center" />
                    <span className="text-xs text-white/30">%</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-2 h-1.5 rounded-full bg-white/5 overflow-hidden flex">
              <div className="bg-blue-500/60 transition-all" style={{ width: `${homeWinProb}%` }} />
              <div className="bg-white/20 transition-all" style={{ width: `${drawProb}%` }} />
              <div className="bg-amber-500/60 transition-all" style={{ width: `${awayWinProb}%` }} />
            </div>
          </div>

          {/* Odds */}
          <div>
            <label className="text-xs font-medium text-white/50 block mb-2">Odds (decimal)</label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: homeTeam || "Home Win", val: homeOdds, set: setHomeOdds },
                { label: "Draw", val: drawOdds, set: setDrawOdds },
                { label: awayTeam || "Away Win", val: awayOdds, set: setAwayOdds },
              ].map(({ label, val, set }) => (
                <div key={label}>
                  <label className="text-[10px] text-white/30 block mb-1 truncate">{label}</label>
                  <input type="number" value={val || ""} onChange={e => set(parseFloat(e.target.value) || 0)} step="0.01" min="1" placeholder="2.50"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none focus:border-amber-500/50 text-center placeholder-white/20" />
                </div>
              ))}
            </div>
          </div>

          {/* Confidence + Platform */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-white/50">Confidence</label>
                <span className={`text-xs font-medium ${confidence >= 70 ? "text-green-400" : confidence >= 50 ? "text-amber-400" : "text-white/30"}`}>{confidence}%</span>
              </div>
              <input type="range" value={confidence} onChange={e => setConfidence(Number(e.target.value))} min={0} max={100} step={5}
                className="w-full accent-amber-400" />
            </div>
            <div>
              <label className="text-xs font-medium text-white/50 block mb-1.5">Platform</label>
              <div className="flex gap-1.5">
                {PLATFORMS.map(p => (
                  <button key={p} type="button" onClick={() => setPlatform(p)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${platform === p ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" : "bg-white/5 text-white/30 border border-transparent hover:bg-white/8"}`}>
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Analysis */}
          <div>
            <label className="text-xs font-medium text-white/50 block mb-1.5">Analysis / Notes</label>
            <textarea value={analysis} onChange={e => setAnalysis(e.target.value)} rows={3}
              placeholder="Form, head-to-head, injuries, reasoning..." className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-amber-500/50 resize-none" />
          </div>

          {/* Result (when editing) */}
          {editing && (
            <div>
              <label className="text-xs font-medium text-white/50 block mb-1.5">Result</label>
              <div className="flex gap-2">
                {(["pending", "won", "lost", "void"] as TipResult[]).map(r => (
                  <button key={r} type="button" onClick={() => setResult(r)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all capitalize ${
                      result === r
                        ? r === "won" ? "bg-green-500/20 text-green-400 border border-green-500/30"
                        : r === "lost" ? "bg-red-500/20 text-red-400 border border-red-500/30"
                        : r === "pending" ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                        : "bg-white/10 text-white/50 border border-white/20"
                        : "bg-white/5 text-white/30 border border-transparent hover:bg-white/8"
                    }`}>
                    {r}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-lg bg-white/5 text-white/50 text-sm font-medium hover:bg-white/8 transition-colors">Cancel</button>
            <button type="submit" className="flex-1 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-sm font-semibold transition-colors">
              {editing ? "Save Changes" : "Add Tip"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
