"use client";

import { useState } from "react";
import { Lightbulb, Trash2, Pencil, ChevronDown, ChevronUp } from "lucide-react";
import { useApp, type TipResult } from "@/context/AppContext";
import AddTipModal from "@/components/AddTipModal";

const RESULT_STYLES: Record<TipResult, string> = {
  pending: "bg-amber-500/15 text-amber-400",
  won:     "bg-green-500/15 text-green-400",
  lost:    "bg-red-500/15 text-red-400",
  void:    "bg-white/10 text-white/40",
};

export default function TipsPage() {
  const { tips, deleteTip, updateTip } = useApp();
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | undefined>();
  const [filter, setFilter] = useState<"all" | TipResult>("all");
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = filter === "all" ? tips : tips.filter(t => t.result === filter);

  const counts = {
    all:     tips.length,
    pending: tips.filter(t => t.result === "pending").length,
    won:     tips.filter(t => t.result === "won").length,
    lost:    tips.filter(t => t.result === "lost").length,
  };

  function openEdit(id: string) { setEditId(id); setShowModal(true); }
  function closeModal() { setShowModal(false); setEditId(undefined); }

  function setResult(id: string, result: TipResult) {
    updateTip(id, { result });
  }

  return (
    <>
      {showModal && <AddTipModal onClose={closeModal} editId={editId} />}

      <div className="p-6 space-y-6 max-w-4xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Tips & Analysis</h1>
            <p className="text-sm text-white/40 mt-0.5">Match predictions with probability analysis</p>
          </div>
          <button onClick={() => setShowModal(true)}
            className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-sm font-semibold transition-colors">
            + Add Tip
          </button>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 bg-white/3 border border-white/8 rounded-xl p-1 w-fit">
          {(["all", "pending", "won", "lost"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
                filter === f ? "bg-white/10 text-white" : "text-white/40 hover:text-white/60"
              }`}>
              {f} <span className="ml-1 text-white/30">{counts[f]}</span>
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-white/8 bg-white/3 py-20 text-center">
            <Lightbulb className="h-10 w-10 text-white/15 mx-auto mb-4" />
            <p className="text-sm text-white/40 mb-4">No tips yet — add your first prediction</p>
            <button onClick={() => setShowModal(true)}
              className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-sm font-semibold transition-colors">
              + Add Tip
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(tip => {
              const isExpanded = expanded === tip.id;
              return (
                <div key={tip.id} className="rounded-2xl border border-white/8 bg-white/3 overflow-hidden">
                  <div className="px-5 py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-base font-semibold text-white">{tip.match}</span>
                          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${RESULT_STYLES[tip.result]}`}>
                            {tip.result}
                          </span>
                        </div>
                        <p className="text-xs text-white/40 mt-0.5">
                          {new Date(tip.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })} · {tip.market} · {tip.platform}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className={`text-sm font-bold px-2.5 py-1 rounded-lg ${
                          tip.confidence >= 70 ? "bg-green-500/15 text-green-400" :
                          tip.confidence >= 50 ? "bg-amber-500/15 text-amber-400" :
                          "bg-white/5 text-white/30"
                        }`}>{tip.confidence}%</span>
                        <button onClick={() => openEdit(tip.id)} className="p-1.5 text-white/20 hover:text-white/60 transition-colors">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => deleteTip(tip.id)} className="p-1.5 text-white/20 hover:text-red-400 transition-colors">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => setExpanded(isExpanded ? null : tip.id)} className="p-1.5 text-white/20 hover:text-white/60 transition-colors">
                          {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </div>

                    {/* Prediction + odds row */}
                    <div className="mt-3 flex items-center gap-4 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-white/40">Pick:</span>
                        <span className="text-sm font-medium text-amber-400">{tip.prediction}</span>
                      </div>
                      {(tip.homeOdds > 0 || tip.drawOdds > 0 || tip.awayOdds > 0) && (
                        <div className="flex items-center gap-3 text-xs text-white/40">
                          {tip.homeOdds > 0 && <span>{tip.homeTeam}: <span className="text-white/70 font-medium">{tip.homeOdds}</span></span>}
                          {tip.drawOdds > 0 && <span>Draw: <span className="text-white/70 font-medium">{tip.drawOdds}</span></span>}
                          {tip.awayOdds > 0 && <span>{tip.awayTeam}: <span className="text-white/70 font-medium">{tip.awayOdds}</span></span>}
                        </div>
                      )}
                    </div>

                    {/* Probability bar */}
                    {(tip.homeWinProb + tip.drawProb + tip.awayWinProb) > 0 && (
                      <div className="mt-3">
                        <div className="h-1.5 rounded-full bg-white/5 overflow-hidden flex">
                          <div className="bg-blue-500/60" style={{ width: `${tip.homeWinProb}%` }} />
                          <div className="bg-white/20" style={{ width: `${tip.drawProb}%` }} />
                          <div className="bg-amber-500/60" style={{ width: `${tip.awayWinProb}%` }} />
                        </div>
                        <div className="flex justify-between mt-1 text-[10px] text-white/30">
                          <span>{tip.homeTeam} {tip.homeWinProb}%</span>
                          <span>Draw {tip.drawProb}%</span>
                          <span>{tip.awayTeam} {tip.awayWinProb}%</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Expanded: analysis + mark result */}
                  {isExpanded && (
                    <div className="border-t border-white/6 px-5 py-4 space-y-4">
                      {tip.analysis && (
                        <div>
                          <p className="text-xs font-medium text-white/40 mb-1">Analysis</p>
                          <p className="text-sm text-white/70 leading-relaxed">{tip.analysis}</p>
                        </div>
                      )}
                      {tip.result === "pending" && (
                        <div>
                          <p className="text-xs font-medium text-white/40 mb-2">Mark result</p>
                          <div className="flex gap-2">
                            <button onClick={() => setResult(tip.id, "won")}
                              className="px-4 py-1.5 rounded-lg bg-green-500/15 text-green-400 text-xs font-medium hover:bg-green-500/25 transition-colors">
                              ✓ Won
                            </button>
                            <button onClick={() => setResult(tip.id, "lost")}
                              className="px-4 py-1.5 rounded-lg bg-red-500/15 text-red-400 text-xs font-medium hover:bg-red-500/25 transition-colors">
                              ✗ Lost
                            </button>
                            <button onClick={() => setResult(tip.id, "void")}
                              className="px-4 py-1.5 rounded-lg bg-white/5 text-white/40 text-xs font-medium hover:bg-white/10 transition-colors">
                              Void
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
