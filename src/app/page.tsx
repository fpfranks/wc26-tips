"use client";

import { useApp } from "@/context/AppContext";
import { TrendingUp, TrendingDown, Target, Percent, DollarSign, Award } from "lucide-react";
import Link from "next/link";

function fmt(n: number) {
  const sign = n >= 0 ? "+" : "";
  return `${sign}£${Math.abs(n).toFixed(2)}`;
}

function pct(n: number, total: number) {
  if (total === 0) return "0%";
  return `${Math.round((n / total) * 100)}%`;
}

export default function Dashboard() {
  const { bets, tips } = useApp();

  const settled     = bets.filter(b => b.status !== "open");
  const won         = bets.filter(b => b.status === "won");
  const totalStaked = settled.reduce((s, b) => s + b.stake, 0);
  const totalProfit = settled.reduce((s, b) => s + b.profit, 0);
  const roi         = totalStaked > 0 ? (totalProfit / totalStaked) * 100 : 0;
  const winRate     = pct(won.length, settled.length);

  const pendingTips = tips.filter(t => t.result === "pending");
  const wonTips     = tips.filter(t => t.result === "won").length;
  const settledTips = tips.filter(t => t.result !== "pending").length;
  const tipAccuracy = pct(wonTips, settledTips);

  const stats = [
    {
      label: "Total P&L",
      value: totalStaked === 0 ? "£0.00" : fmt(totalProfit),
      sub: `${settled.length} settled bet${settled.length !== 1 ? "s" : ""}`,
      icon: totalProfit >= 0 ? TrendingUp : TrendingDown,
      color: totalProfit >= 0 ? "green" : "red",
    },
    {
      label: "Win Rate",
      value: winRate,
      sub: `${won.length} / ${settled.length} bets won`,
      icon: Percent,
      color: "amber",
    },
    {
      label: "ROI",
      value: totalStaked === 0 ? "0%" : `${roi >= 0 ? "+" : ""}${roi.toFixed(1)}%`,
      sub: `£${totalStaked.toFixed(2)} total staked`,
      icon: DollarSign,
      color: roi >= 0 ? "green" : "red",
    },
    {
      label: "Tip Accuracy",
      value: tipAccuracy,
      sub: `${wonTips} / ${settledTips} tips correct`,
      icon: Target,
      color: "blue",
    },
  ];

  const colorMap = {
    green: { bg: "bg-green-500/15", text: "text-green-400", val: "text-green-400" },
    red:   { bg: "bg-red-500/15",   text: "text-red-400",   val: "text-red-400" },
    amber: { bg: "bg-amber-500/15", text: "text-amber-400", val: "text-white" },
    blue:  { bg: "bg-blue-500/15",  text: "text-blue-400",  val: "text-white" },
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl">

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-sm text-white/40 mt-0.5">World Cup 2026 · Betting Analysis</p>
        </div>
        <div className="flex gap-2">
          <Link href="/tips" className="px-3 py-1.5 rounded-lg bg-amber-500/15 text-amber-400 text-xs font-medium hover:bg-amber-500/25 transition-colors">
            + Add Tip
          </Link>
          <Link href="/tracker" className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-500 transition-colors">
            + Log Bet
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, sub, icon: Icon, color }) => {
          const c = colorMap[color as keyof typeof colorMap];
          return (
            <div key={label} className="rounded-2xl border border-white/8 bg-white/3 p-5">
              <div className={`inline-flex h-9 w-9 items-center justify-center rounded-full ${c.bg} mb-3`}>
                <Icon className={`h-4 w-4 ${c.text}`} />
              </div>
              <p className="text-xs font-medium uppercase tracking-wider text-white/40 mb-1">{label}</p>
              <p className={`text-2xl font-bold mb-1 ${c.val}`}>{value}</p>
              <p className="text-xs text-white/30">{sub}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        <div className="rounded-2xl border border-white/8 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 bg-white/3 border-b border-white/8">
            <h2 className="text-sm font-semibold text-white">Recent Bets</h2>
            <Link href="/tracker" className="text-xs text-white/40 hover:text-white transition-colors">View all →</Link>
          </div>
          {bets.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-white/30">No bets logged yet</p>
              <Link href="/tracker" className="mt-3 inline-block text-xs text-amber-400 hover:text-amber-300">Log your first bet →</Link>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {bets.slice(0, 5).map(bet => (
                <div key={bet.id} className="flex items-center justify-between px-5 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white/80 truncate">{bet.label}</p>
                    <p className="text-xs text-white/30 mt-0.5">
                      {bet.type === "acca" ? `${bet.selections.length}-fold acca` : "Single"} · {bet.platform} · £{bet.stake.toFixed(2)}
                    </p>
                  </div>
                  <div className="text-right ml-4 flex-shrink-0">
                    {bet.status === "open" ? (
                      <span className="text-xs text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">Open</span>
                    ) : bet.status === "won" ? (
                      <span className="text-xs text-green-400 font-medium">{fmt(bet.profit)}</span>
                    ) : bet.status === "lost" ? (
                      <span className="text-xs text-red-400 font-medium">{fmt(bet.profit)}</span>
                    ) : (
                      <span className="text-xs text-white/30">Void</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-white/8 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 bg-white/3 border-b border-white/8">
            <h2 className="text-sm font-semibold text-white">Active Tips</h2>
            <Link href="/tips" className="text-xs text-white/40 hover:text-white transition-colors">View all →</Link>
          </div>
          {pendingTips.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-white/30">No active tips</p>
              <Link href="/tips" className="mt-3 inline-block text-xs text-amber-400 hover:text-amber-300">Add a tip →</Link>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {pendingTips.slice(0, 5).map(tip => (
                <div key={tip.id} className="flex items-center justify-between px-5 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white/80 truncate">{tip.match}</p>
                    <p className="text-xs text-white/30 mt-0.5">{tip.prediction} · {tip.market}</p>
                  </div>
                  <div className="ml-4 flex-shrink-0">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      tip.confidence >= 70 ? "bg-green-500/15 text-green-400" :
                      tip.confidence >= 50 ? "bg-amber-500/15 text-amber-400" :
                      "bg-white/5 text-white/30"
                    }`}>
                      {tip.confidence}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {totalProfit > 0 && settled.length > 0 && (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 px-6 py-4 flex items-center gap-3">
          <Award className="h-5 w-5 text-amber-400 flex-shrink-0" />
          <p className="text-sm text-amber-400/80">
            Up <span className="font-bold text-amber-400">{fmt(totalProfit)}</span> across {settled.length} settled bets — keep the analysis tight.
          </p>
        </div>
      )}
    </div>
  );
}
