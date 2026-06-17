"use client";

import { useState } from "react";
import { TrendingUp, Trash2, Pencil, ChevronDown, ChevronUp } from "lucide-react";
import { useApp, type BetStatus } from "@/context/AppContext";
import AddBetModal from "@/components/AddBetModal";

const STATUS_STYLES: Record<BetStatus, string> = {
  open: "bg-amber-500/15 text-amber-400",
  won:  "bg-green-500/15 text-green-400",
  lost: "bg-red-500/15 text-red-400",
  void: "bg-white/10 text-white/40",
};

const RESULT_STYLES: Record<string, string> = {
  pending: "text-amber-400/60",
  won:     "text-green-400",
  lost:    "text-red-400",
  void:    "text-white/30",
};

export default function TrackerPage() {
  const { bets, deleteBet } = useApp();
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId]       = useState<string | undefined>();
  const [filter, setFilter]       = useState<"all" | BetStatus>("all");
  const [expanded, setExpanded]   = useState<string | null>(null);

  const filtered = filter === "all" ? bets : bets.filter(b => b.status === filter);

  const settled          = bets.filter(b => b.status !== "open");
  const open             = bets.filter(b => b.status === "open");
  const won              = bets.filter(b => b.status === "won");
  const totalStaked      = settled.reduce((s, b) => s + b.stake, 0);
  const totalProfit      = settled.reduce((s, b) => s + b.profit, 0);
  const openPotentialReturn = open.reduce((s, b) => s + b.potentialReturn, 0);
  const openStaked       = open.reduce((s, b) => s + b.stake, 0);

  const counts = {
    all:  bets.length,
    open: bets.filter(b => b.status === "open").length,
    won:  won.length,
    lost: bets.filter(b => b.status === "lost").length,
  };

  function openEdit(id: string) { setEditId(id); setShowModal(true); }
  function closeModal() { setShowModal(false); setEditId(undefined); }

  function fmtProfit(n: number) {
    const sign = n >= 0 ? "+" : "";
    return `${sign}£${Math.abs(n).toFixed(2)}`;
  }

  return (
    <>
      {showModal && <AddBetModal onClose={closeModal} editId={editId} />}

      <div className="p-6 space-y-6 max-w-5xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Bet Tracker</h1>
            <p className="text-sm text-white/40 mt-0.5">Singles and accumulators · Profit/loss tracker</p>
          </div>
          <button onClick={() => setShowModal(true)}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-colors">
            + Log Bet
          </button>
        </div>

        {/* P&L summary */}
        {(settled.length > 0 || open.length > 0) && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-white/8 bg-white/3 px-5 py-4">
              <p className="text-[10px] font-medium uppercase tracking-wider text-white/40 mb-1">Total P&amp;L</p>
              <p className={`text-2xl font-bold ${totalProfit >= 0 ? "text-green-400" : "text-red-400"}`}>
                {settled.length === 0 ? "£0.00" : fmtProfit(totalProfit)}
              </p>
              <p className="text-xs text-white/30 mt-0.5">{settled.length} settled</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/3 px-5 py-4">
              <p className="text-[10px] font-medium uppercase tracking-wider text-white/40 mb-1">Win Rate</p>
              <p className="text-2xl font-bold text-white">
                {settled.length === 0 ? "0%" : `${Math.round((won.length / settled.length) * 100)}%`}
              </p>
              <p className="text-xs text-white/30 mt-0.5">{won.length} / {settled.length} bets</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/3 px-5 py-4">
              <p className="text-[10px] font-medium uppercase tracking-wider text-white/40 mb-1">Total Staked</p>
              <p className="text-2xl font-bold text-white">£{totalStaked.toFixed(2)}</p>
              <p className={`text-xs mt-0.5 ${totalProfit >= 0 ? "text-green-400/60" : "text-red-400/60"}`}>
                ROI: {totalStaked > 0 ? `${((totalProfit / totalStaked) * 100).toFixed(1)}%` : "0%"}
              </p>
            </div>
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 px-5 py-4">
              <p className="text-[10px] font-medium uppercase tracking-wider text-amber-400/60 mb-1">Open Potential Return</p>
              <p className="text-2xl font-bold text-amber-400">
                {open.length === 0 ? "£0.00" : `£${openPotentialReturn.toFixed(2)}`}
              </p>
              <p className="text-xs text-white/30 mt-0.5">
                {open.length} open · £{openStaked.toFixed(2)} staked
              </p>
            </div>
          </div>
        )}

        {/* Filter tabs */}
        <div className="flex gap-1 bg-white/3 border border-white/8 rounded-xl p-1 w-fit">
          {(["all", "open", "won", "lost"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
                filter === f ? "bg-white/10 text-white" : "text-white/40 hover:text-white/60"
              }`}>
              {f} <span className="ml-1 text-white/30">{counts[f as keyof typeof counts]}</span>
            </button>
          ))}
        </div>

        {/* Bets list */}
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-white/8 bg-white/3 py-20 text-center">
            <TrendingUp className="h-10 w-10 text-white/15 mx-auto mb-4" />
            <p className="text-sm text-white/40 mb-4">No bets yet — log your first bet</p>
            <button onClick={() => setShowModal(true)}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-colors">
              + Log Bet
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(bet => {
              const isExpanded = expanded === bet.id;
              return (
                <div key={bet.id} className="rounded-2xl border border-white/8 bg-white/3 overflow-hidden">
                  <div className="px-5 py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-base font-semibold text-white">{bet.label}</span>
                          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${STATUS_STYLES[bet.status]}`}>
                            {bet.status}
                          </span>
                          <span className="text-[10px] text-white/30 px-2 py-0.5 rounded-full bg-white/5 capitalize">
                            {bet.type === "acca" ? `${bet.selections.length}-fold` : "single"}
                          </span>
                        </div>
                        <p className="text-xs text-white/40 mt-0.5">
                          {bet.platform} · Stake: £{bet.stake.toFixed(2)} · Odds: {bet.totalOdds.toFixed(2)}
                        </p>
                      </div>

                      <div className="flex items-center gap-3 flex-shrink-0">
                        <div className="text-right">
                          {bet.status === "open" ? (
                            <>
                              <p className="text-xs text-white/30">To return</p>
                              <p className="text-sm font-bold text-white">£{bet.potentialReturn.toFixed(2)}</p>
                            </>
                          ) : (
                            <>
                              <p className="text-xs text-white/30">P&amp;L</p>
                              <p className={`text-sm font-bold ${bet.profit >= 0 ? "text-green-400" : "text-red-400"}`}>
                                {fmtProfit(bet.profit)}
                              </p>
                            </>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => openEdit(bet.id)} className="p-1.5 text-white/20 hover:text-white/60 transition-colors">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => deleteBet(bet.id)} className="p-1.5 text-white/20 hover:text-red-400 transition-colors">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => setExpanded(isExpanded ? null : bet.id)} className="p-1.5 text-white/20 hover:text-white/60 transition-colors">
                            {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-white/6 px-5 py-4 space-y-3">
                      {/* Selections */}
                      <div>
                        <p className="text-xs font-medium text-white/30 mb-2 uppercase tracking-wider">Selections</p>
                        <div className="space-y-2">
                          {bet.selections.map((sel, i) => (
                            <div key={i} className="flex items-center justify-between bg-white/3 rounded-xl px-4 py-2.5">
                              <div>
                                <p className="text-sm font-medium text-white/80">{sel.match}</p>
                                <p className="text-xs text-white/30 mt-0.5">{sel.market} · {sel.prediction}</p>
                              </div>
                              <div className="text-right ml-4">
                                <p className="text-sm font-bold text-white">{sel.odds.toFixed(2)}</p>
                                <p className={`text-[10px] capitalize ${RESULT_STYLES[sel.result]}`}>{sel.result}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {bet.notes && (
                        <div>
                          <p className="text-xs font-medium text-white/30 mb-1 uppercase tracking-wider">Notes</p>
                          <p className="text-sm text-white/60">{bet.notes}</p>
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
