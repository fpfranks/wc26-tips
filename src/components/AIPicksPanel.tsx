"use client";

import { useState, useEffect } from "react";
import { Sparkles, Search, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, XCircle, Loader2, ChevronDown, ChevronUp, Plus } from "lucide-react";
import type { AnalysisResult } from "@/app/api/analyse/route";
import { useApp } from "@/context/AppContext";
import AddTipModal from "./AddTipModal";

const STAKE_STYLES = {
  "High Stake":   { bg: "bg-green-500/15",  text: "text-green-400",  icon: TrendingUp },
  "Medium Stake": { bg: "bg-amber-500/15",  text: "text-amber-400",  icon: TrendingUp },
  "Low Stake":    { bg: "bg-blue-500/15",   text: "text-blue-400",   icon: TrendingDown },
  "Skip":         { bg: "bg-red-500/15",    text: "text-red-400",    icon: XCircle },
};

const CONF_STYLES = {
  High:   "bg-green-500/15 text-green-400",
  Medium: "bg-amber-500/15 text-amber-400",
  Low:    "bg-white/5 text-white/40",
};

function AnalysisCard({ analysis, bankroll }: { analysis: AnalysisResult; bankroll: number }) {
  const [expanded, setExpanded] = useState(false);
  const [showTipModal, setShowTipModal] = useState(false);
  const stake = STAKE_STYLES[analysis.stakeRating];
  const StakeIcon = stake.icon;

  const suggestedStake =
    bankroll > 0 && analysis.kellyFraction
      ? (bankroll * Math.max(0, analysis.kellyFraction) * 0.25).toFixed(2)
      : null;

  return (
    <>
      {showTipModal && (
        <AddTipModal
          onClose={() => setShowTipModal(false)}
          prefill={{
            homeTeam: analysis.homeTeam,
            awayTeam: analysis.awayTeam,
            date: analysis.date,
            market: analysis.recommendedBet.market,
            prediction: analysis.recommendedBet.prediction,
            confidence: analysis.recommendedBet.confidence === "High" ? 80 : analysis.recommendedBet.confidence === "Medium" ? 60 : 40,
            homeWinProb: analysis.homeWinProb,
            drawProb: analysis.drawProb,
            awayWinProb: analysis.awayWinProb,
            homeOdds: analysis.oddsFound?.homeWin ?? 0,
            drawOdds: analysis.oddsFound?.draw ?? 0,
            awayOdds: analysis.oddsFound?.awayWin ?? 0,
            analysis: analysis.recommendedBet.reasoning,
          }}
        />
      )}

      <div className="rounded-2xl border border-white/8 bg-white/3 overflow-hidden">
        <div className="px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-white">{analysis.match}</h3>
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${CONF_STYLES[analysis.recommendedBet.confidence]}`}>
                  {analysis.recommendedBet.confidence} confidence
                </span>
              </div>
              <p className="text-xs text-white/40 mt-0.5">
                {new Date(analysis.date).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
                {analysis.oddsFound && ` · Odds via ${analysis.oddsFound.source}`}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${stake.bg}`}>
                <StakeIcon className={`h-3.5 w-3.5 ${stake.text}`} />
                <span className={`text-xs font-bold ${stake.text}`}>{analysis.stakeRating}</span>
              </div>
            </div>
          </div>

          <p className="mt-3 text-sm text-white/60 leading-relaxed">{analysis.summary}</p>

          {/* Probability bar */}
          <div className="mt-4">
            <div className="h-2 rounded-full bg-white/5 overflow-hidden flex">
              <div className="bg-blue-500/70 transition-all" style={{ width: `${analysis.homeWinProb}%` }} />
              <div className="bg-white/25 transition-all" style={{ width: `${analysis.drawProb}%` }} />
              <div className="bg-amber-500/70 transition-all" style={{ width: `${analysis.awayWinProb}%` }} />
            </div>
            <div className="flex justify-between mt-1.5 text-[10px] text-white/40">
              <span className="text-blue-400/70">{analysis.homeTeam} {analysis.homeWinProb}%</span>
              <span>Draw {analysis.drawProb}%</span>
              <span className="text-amber-400/70">{analysis.awayTeam} {analysis.awayWinProb}%</span>
            </div>
          </div>

          {/* Recommended bet */}
          <div className="mt-4 bg-white/3 border border-white/8 rounded-xl p-4">
            <p className="text-[10px] font-medium text-white/30 uppercase tracking-wider mb-2">AI Recommended Bet</p>
            <div className="flex items-center gap-3 flex-wrap">
              <div>
                <span className="text-sm font-bold text-amber-400">{analysis.recommendedBet.prediction}</span>
                <span className="text-xs text-white/40 ml-2">{analysis.recommendedBet.market}</span>
              </div>
              {analysis.oddsFound && (
                <div className="flex gap-3 text-xs">
                  <span className="text-white/50">H: <span className="text-white font-medium">{analysis.oddsFound.homeWin}</span></span>
                  <span className="text-white/50">D: <span className="text-white font-medium">{analysis.oddsFound.draw}</span></span>
                  <span className="text-white/50">A: <span className="text-white font-medium">{analysis.oddsFound.awayWin}</span></span>
                </div>
              )}
            </div>
            <p className="text-xs text-white/50 mt-2 leading-relaxed">{analysis.recommendedBet.reasoning}</p>

            {/* EV + Kelly */}
            {(analysis.expectedValue !== null || analysis.kellyFraction !== null) && (
              <div className="mt-3 flex gap-4 text-xs">
                {analysis.expectedValue !== null && (
                  <div>
                    <span className="text-white/30">Expected Value: </span>
                    <span className={analysis.expectedValue >= 0 ? "text-green-400 font-medium" : "text-red-400 font-medium"}>
                      {analysis.expectedValue >= 0 ? "+" : ""}{(analysis.expectedValue * 100).toFixed(1)}%
                    </span>
                  </div>
                )}
                {analysis.kellyFraction !== null && (
                  <div>
                    <span className="text-white/30">Kelly: </span>
                    <span className="text-white/70 font-medium">{(analysis.kellyFraction * 100).toFixed(1)}%</span>
                  </div>
                )}
                {suggestedStake && (
                  <div>
                    <span className="text-white/30">Suggested stake: </span>
                    <span className="text-amber-400 font-bold">£{suggestedStake}</span>
                    <span className="text-white/20 ml-1">(¼ Kelly)</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="mt-3 flex items-center justify-between">
            <p className={`text-xs font-medium ${stake.text}`}>{analysis.stakeReasoning}</p>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowTipModal(true)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500/15 text-amber-400 text-xs font-medium hover:bg-amber-500/25 transition-colors">
                <Plus className="h-3 w-3" /> Save as Tip
              </button>
              <button onClick={() => setExpanded(!expanded)}
                className="p-1.5 text-white/20 hover:text-white/60 transition-colors">
                {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>
        </div>

        {expanded && (
          <div className="border-t border-white/6 px-5 py-4 space-y-4">
            {analysis.keyStats.length > 0 && (
              <div>
                <p className="text-[10px] font-medium text-white/30 uppercase tracking-wider mb-2">Key Stats</p>
                <ul className="space-y-1.5">
                  {analysis.keyStats.map((stat, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-white/60">
                      <CheckCircle className="h-3.5 w-3.5 text-green-400/60 mt-0.5 flex-shrink-0" />
                      {stat}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {analysis.risksToConsider.length > 0 && (
              <div>
                <p className="text-[10px] font-medium text-white/30 uppercase tracking-wider mb-2">Risks</p>
                <ul className="space-y-1.5">
                  {analysis.risksToConsider.map((risk, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-white/60">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-400/60 mt-0.5 flex-shrink-0" />
                      {risk}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

export default function AIPicksPanel() {
  const { tips } = useApp();
  const [mode, setMode] = useState<"recommendations" | "specific">("recommendations");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const [apiKey, setApiKey] = useState("");
  const [bankroll, setBankroll] = useState<number | "">(200);

  useEffect(() => {
    const key = localStorage.getItem("wc26-anthropic-key");
    if (key) setApiKey(key);
    const bl = localStorage.getItem("wc26-bankroll");
    if (bl) setBankroll(parseFloat(bl) || 200);
  }, []);

  // Specific match form
  const [homeTeam, setHomeTeam] = useState("");
  const [awayTeam, setAwayTeam] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [homeOdds, setHomeOdds] = useState<number | "">("");
  const [drawOdds, setDrawOdds] = useState<number | "">("");
  const [awayOdds, setAwayOdds] = useState<number | "">("");

  void tips;

  async function runAnalysis() {
    if (!apiKey) { window.location.href = "/settings"; return; }
    setLoading(true);
    setError("");
    setResults([]);

    try {
      const body =
        mode === "recommendations"
          ? { mode: "recommendations", bankroll: bankroll || undefined, apiKey }
          : {
              mode: "specific",
              homeTeam,
              awayTeam,
              date,
              homeOdds: homeOdds || undefined,
              drawOdds: drawOdds || undefined,
              awayOdds: awayOdds || undefined,
              bankroll: bankroll || undefined,
              apiKey,
            };

      const res = await fetch("/api/analyse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Analysis failed");
        return;
      }

      if (mode === "recommendations") {
        setResults(data.tips ?? []);
      } else {
        setResults([data]);
      }
    } catch {
      setError("Network error — check your connection");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 overflow-hidden">
        <div className="px-5 py-4 border-b border-amber-500/10">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-400" />
            <h2 className="text-sm font-bold text-amber-400">AI Betting Analysis</h2>
          </div>
          <p className="text-xs text-white/40 mt-0.5">Searches the web for live stats, odds from Gamdom/Rollbit, and recommends bets with stake sizing</p>
        </div>

        <div className="px-5 py-4 space-y-4">
          {!apiKey && (
            <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 px-4 py-3 flex items-center justify-between">
              <p className="text-xs text-amber-400">Add your Anthropic API key in Settings to enable AI analysis</p>
              <a href="/settings" className="text-xs font-semibold text-amber-400 hover:text-amber-300 ml-3 whitespace-nowrap">Settings →</a>
            </div>
          )}

          {/* Mode + bankroll */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex gap-1 bg-white/5 border border-white/8 rounded-xl p-1">
              <button onClick={() => { setMode("recommendations"); setResults([]); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${mode === "recommendations" ? "bg-amber-500/20 text-amber-400" : "text-white/40 hover:text-white/60"}`}>
                <Search className="h-3 w-3" /> Best Bets Today
              </button>
              <button onClick={() => { setMode("specific"); setResults([]); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${mode === "specific" ? "bg-amber-500/20 text-amber-400" : "text-white/40 hover:text-white/60"}`}>
                <Sparkles className="h-3 w-3" /> Analyse Match
              </button>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-white/40">Bankroll</label>
              <div className="flex items-center bg-white/5 border border-white/10 rounded-lg overflow-hidden">
                <span className="px-2 text-xs text-white/30">£</span>
                <input type="number" value={bankroll} onChange={e => setBankroll(parseFloat(e.target.value) || "")}
                  className="w-20 bg-transparent py-1.5 pr-2 text-sm text-white focus:outline-none" placeholder="200" />
              </div>
            </div>
          </div>

          {/* Specific match form */}
          {mode === "specific" && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <input value={homeTeam} onChange={e => setHomeTeam(e.target.value)} placeholder="Home team *"
                className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/25 focus:outline-none focus:border-amber-500/40" />
              <input value={awayTeam} onChange={e => setAwayTeam(e.target.value)} placeholder="Away team *"
                className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/25 focus:outline-none focus:border-amber-500/40" />
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500/40" />
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-white/30 flex-shrink-0">Home odds</span>
                <input type="number" value={homeOdds} onChange={e => setHomeOdds(parseFloat(e.target.value) || "")} step="0.01" placeholder="2.10"
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-amber-500/40" />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-white/30 flex-shrink-0">Draw</span>
                <input type="number" value={drawOdds} onChange={e => setDrawOdds(parseFloat(e.target.value) || "")} step="0.01" placeholder="3.40"
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-amber-500/40" />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-white/30 flex-shrink-0">Away</span>
                <input type="number" value={awayOdds} onChange={e => setAwayOdds(parseFloat(e.target.value) || "")} step="0.01" placeholder="3.20"
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-amber-500/40" />
              </div>
            </div>
          )}

          <button onClick={runAnalysis} disabled={loading || (mode === "specific" && (!homeTeam || !awayTeam))}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-black text-sm font-bold transition-all">
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {mode === "recommendations" ? "Searching for best bets…" : "Analysing match…"}
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                {mode === "recommendations" ? "Find Best Bets Today" : "Analyse This Match"}
              </>
            )}
          </button>

          {loading && (
            <p className="text-xs text-white/30 animate-pulse">
              Searching Gamdom, Rollbit, form guides, head-to-head records…
            </p>
          )}

          {error && (
            <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3">
              <p className="text-sm text-red-400">{error}</p>
              {error.includes("key") && (
                <a href="/settings" className="text-xs text-amber-400 mt-1 hover:underline block">
                  Update API key in Settings →
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-4">
          <p className="text-xs font-medium text-white/30 uppercase tracking-wider">
            {results.length} AI {results.length === 1 ? "Analysis" : "Picks"} · Researched live
          </p>
          {results.map((analysis, i) => (
            <AnalysisCard key={i} analysis={analysis} bankroll={Number(bankroll) || 0} />
          ))}
        </div>
      )}
    </div>
  );
}
