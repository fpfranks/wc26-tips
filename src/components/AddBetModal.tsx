"use client";

import { useState, useEffect, useRef } from "react";
import { X, Plus, Trash2 } from "lucide-react";
import { useApp, type Platform, type BetStatus, type BetSelection, type SelectionResult } from "@/context/AppContext";

interface PrefillSelection {
  match: string;
  market: string;
  prediction: string;
  odds?: number;
}

interface Props {
  onClose: () => void;
  editId?: string;
  prefill?: {
    label?: string;
    type?: "single" | "acca";
    selections?: PrefillSelection[];
  };
}

const PLATFORMS: Platform[] = ["Gamdom", "Rollbit", "Other"];
const MARKETS = ["Match Result", "Both Teams to Score", "Over 2.5 Goals", "Under 2.5 Goals", "First Goal Scorer", "Handicap", "Correct Score", "Draw No Bet", "Other"];
const STATUSES: BetStatus[] = ["open", "won", "lost", "void"];

const STATUS_STYLES: Record<BetStatus, string> = {
  open: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  won:  "bg-green-500/20 text-green-400 border-green-500/30",
  lost: "bg-red-500/20 text-red-400 border-red-500/30",
  void: "bg-white/10 text-white/40 border-white/20",
};

const RESULT_STYLES: Record<SelectionResult, string> = {
  pending: "bg-amber-500/10 text-amber-400",
  won:     "bg-green-500/10 text-green-400",
  lost:    "bg-red-500/10 text-red-400",
  void:    "bg-white/5 text-white/30",
};

function emptySelection(): BetSelection {
  return { match: "", market: "Match Result", prediction: "", odds: 0, result: "pending" };
}

export default function AddBetModal({ onClose, editId, prefill }: Props) {
  const { bets, addBet, updateBet } = useApp();
  const editing = editId ? bets.find(b => b.id === editId) : null;

  const initialSelections: BetSelection[] = editing?.selections
    ?? prefill?.selections?.map(s => ({ match: s.match, market: s.market, prediction: s.prediction, odds: s.odds ?? 0, result: "pending" as const }))
    ?? [emptySelection()];

  const [type, setType]               = useState<"single" | "acca">(editing?.type ?? prefill?.type ?? (initialSelections.length > 1 ? "acca" : "single"));
  const [label, setLabel]             = useState(editing?.label ?? prefill?.label ?? "");
  const [selections, setSelections]   = useState<BetSelection[]>(initialSelections);
  const [stake, setStake]             = useState(editing?.stake ?? 0);
  const [platform, setPlatform]       = useState<Platform>(editing?.platform ?? "Gamdom");
  const [status, setStatus]           = useState<BetStatus>(editing?.status ?? "open");
  const [notes, setNotes]             = useState(editing?.notes ?? "");

  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const totalOdds     = selections.reduce((p, s) => p * (s.odds || 1), 1);
  const potentialReturn = stake * totalOdds;
  const profit = status === "won"  ? potentialReturn - stake
               : status === "lost" ? -stake
               : status === "void" ? 0
               : 0;

  function updateSelection(i: number, field: keyof BetSelection, value: string | number) {
    setSelections(prev => prev.map((s, idx) => idx === i ? { ...s, [field]: value } : s));
  }

  function addSelection() {
    setSelections(prev => [...prev, emptySelection()]);
    if (type === "single") setType("acca");
  }

  function removeSelection(i: number) {
    setSelections(prev => {
      const next = prev.filter((_, idx) => idx !== i);
      if (next.length <= 1) setType("single");
      return next;
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const displayLabel = label || (type === "acca" ? `${selections.length}-Fold Acca` : selections[0]?.match || "Bet");
    const data = {
      type: selections.length > 1 ? "acca" as const : "single" as const,
      label: displayLabel,
      selections,
      stake,
      totalOdds: parseFloat(totalOdds.toFixed(4)),
      potentialReturn: parseFloat(potentialReturn.toFixed(2)),
      platform,
      status,
      profit: parseFloat(profit.toFixed(2)),
      notes,
      ...(status !== "open" ? { settledAt: Date.now() } : {}),
    };
    if (editing) {
      updateBet(editing.id, data);
    } else {
      addBet(data);
    }
    onClose();
  }

  return (
    <div ref={overlayRef} onClick={e => e.target === overlayRef.current && onClose()}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#0f1724] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/8">
          <h2 className="text-base font-semibold text-white">{editing ? "Edit Bet" : "Log Bet"}</h2>
          <button onClick={onClose} className="text-white/30 hover:text-white transition-colors"><X className="h-4 w-4" /></button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">

          {/* Type toggle */}
          <div className="flex gap-1 bg-white/3 border border-white/8 rounded-xl p-1 w-fit">
            {(["single", "acca"] as const).map(t => (
              <button key={t} type="button" onClick={() => setType(t)}
                className={`px-4 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${type === t ? "bg-white/10 text-white" : "text-white/40 hover:text-white/60"}`}>
                {t === "acca" ? "Accumulator" : "Single"}
              </button>
            ))}
          </div>

          {/* Label */}
          <div>
            <label className="text-xs font-medium text-white/50 block mb-1.5">Label (optional)</label>
            <input value={label} onChange={e => setLabel(e.target.value)}
              placeholder={type === "acca" ? `${selections.length}-Fold Acca` : selections[0]?.match || "e.g. Brazil to beat Mexico"}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-amber-500/50" />
          </div>

          {/* Selections */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-white/50">
                {type === "acca" ? `Selections (${selections.length})` : "Selection"}
              </label>
              <button type="button" onClick={addSelection}
                className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 transition-colors">
                <Plus className="h-3 w-3" /> Add leg
              </button>
            </div>

            {selections.map((sel, i) => (
              <div key={i} className="bg-white/3 border border-white/8 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  {type === "acca" && <span className="text-[10px] font-medium text-white/30 uppercase tracking-wider">Leg {i + 1}</span>}
                  {selections.length > 1 && (
                    <button type="button" onClick={() => removeSelection(i)} className="ml-auto text-white/20 hover:text-red-400 transition-colors">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-white/30 block mb-1">Match *</label>
                    <input value={sel.match} onChange={e => updateSelection(i, "match", e.target.value)} required
                      placeholder="Brazil vs Mexico" className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-amber-500/50" />
                  </div>
                  <div>
                    <label className="text-[10px] text-white/30 block mb-1">Market</label>
                    <select value={sel.market} onChange={e => updateSelection(i, "market", e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-sm text-white focus:outline-none focus:border-amber-500/50">
                      {MARKETS.map(m => <option key={m} value={m} className="bg-[#0f1724]">{m}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-white/30 block mb-1">Prediction *</label>
                    <input value={sel.prediction} onChange={e => updateSelection(i, "prediction", e.target.value)} required
                      placeholder="Brazil Win" className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-amber-500/50" />
                  </div>
                  <div>
                    <label className="text-[10px] text-white/30 block mb-1">Odds (decimal)</label>
                    <input type="number" value={sel.odds || ""} onChange={e => updateSelection(i, "odds", parseFloat(e.target.value) || 0)} step="0.01" min="1" placeholder="2.10"
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-amber-500/50" />
                  </div>
                </div>
                {editing && (
                  <div>
                    <label className="text-[10px] text-white/30 block mb-1">Selection result</label>
                    <div className="flex gap-1.5">
                      {(["pending", "won", "lost", "void"] as SelectionResult[]).map(r => (
                        <button key={r} type="button" onClick={() => updateSelection(i, "result", r)}
                          className={`px-3 py-1 rounded-lg text-[10px] font-medium capitalize transition-all border ${
                            sel.result === r ? RESULT_STYLES[r] + " border-current/20" : "border-transparent bg-white/5 text-white/20 hover:bg-white/8"
                          }`}>{r}</button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Stake + platform */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-white/50 block mb-1.5">Stake (£) *</label>
              <input type="number" value={stake || ""} onChange={e => setStake(parseFloat(e.target.value) || 0)} required min="0.01" step="0.01" placeholder="10.00"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-amber-500/50" />
            </div>
            <div>
              <label className="text-xs font-medium text-white/50 block mb-1.5">Platform</label>
              <div className="flex gap-1.5">
                {PLATFORMS.map(p => (
                  <button key={p} type="button" onClick={() => setPlatform(p)}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${platform === p ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" : "bg-white/5 text-white/30 border border-transparent hover:bg-white/8"}`}>
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-white/3 border border-white/8 rounded-xl px-4 py-3 grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-[10px] text-white/30 mb-0.5">Combined Odds</p>
              <p className="text-sm font-bold text-white">{totalOdds.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-[10px] text-white/30 mb-0.5">Potential Return</p>
              <p className="text-sm font-bold text-white">£{potentialReturn.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-[10px] text-white/30 mb-0.5">Potential Profit</p>
              <p className="text-sm font-bold text-green-400">£{(potentialReturn - stake).toFixed(2)}</p>
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="text-xs font-medium text-white/50 block mb-2">Status</label>
            <div className="flex gap-2">
              {STATUSES.map(s => (
                <button key={s} type="button" onClick={() => setStatus(s)}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium capitalize transition-all border ${
                    status === s ? STATUS_STYLES[s] : "bg-white/5 text-white/30 border-transparent hover:bg-white/8"
                  }`}>{s}</button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-medium text-white/50 block mb-1.5">Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              placeholder="Any notes about this bet..." className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-amber-500/50 resize-none" />
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-lg bg-white/5 text-white/50 text-sm font-medium hover:bg-white/8 transition-colors">Cancel</button>
            <button type="submit" className="flex-1 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-colors">
              {editing ? "Save Changes" : "Log Bet"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
