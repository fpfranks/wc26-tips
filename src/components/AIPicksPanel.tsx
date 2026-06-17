"use client";

import { useState, useEffect } from "react";
import {
  Sparkles, Search, TrendingUp, TrendingDown, AlertTriangle, CheckCircle,
  XCircle, Loader2, ChevronDown, ChevronUp, Plus, Layers, ChevronLeft,
  ChevronRight, Calendar, BarChart2, RefreshCw, Zap, MessageSquare,
  Trophy, Flame, ClipboardList, Link,
} from "lucide-react";
import type { AnalysisResult, AccaResult, CustomBetResult, SimulatorResult, UpsetResult } from "@/app/api/analyse/route";
import type { BetSlipResult } from "@/app/api/betslip/route";
import type { OddsComparison } from "@/app/api/odds/route";
import { getFixturesForDate, isPlayed, type Fixture } from "@/data/fixtures";
import { useApp } from "@/context/AppContext";
import AddTipModal from "./AddTipModal";
import AddBetModal from "./AddBetModal";

const WC_START = "2026-06-11";
const WC_END   = "2026-07-19";

function clampDate(iso: string) {
  if (iso < WC_START) return WC_START;
  if (iso > WC_END)   return WC_END;
  return iso;
}
function addDays(iso: string, n: number) {
  const d = new Date(iso);
  d.setDate(d.getDate() + n);
  return clampDate(d.toISOString().slice(0, 10));
}
function fmtShort(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

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

/* ── Date Navigator ── */
function DateNav({ date, onChange }: { date: string; onChange: (d: string) => void }) {
  const today = new Date().toISOString().slice(0, 10);
  const fixtures = getFixturesForDate(date);
  const upcoming = fixtures.filter((f) => !isPlayed(f));

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <button onClick={() => onChange(addDays(date, -1))} disabled={date <= WC_START}
          className="p-1.5 rounded-lg bg-white/5 border border-white/8 text-white/40 hover:text-white/80 disabled:opacity-20 transition-colors">
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
        <div className="flex items-center gap-2 bg-white/5 border border-white/8 rounded-lg px-3 py-1.5 flex-1 justify-center">
          <Calendar className="h-3.5 w-3.5 text-white/30" />
          <span className="text-sm font-semibold text-white">{fmtShort(date)}</span>
          {date === today && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400">Today</span>
          )}
          {fixtures.length > 0 && (
            <span className="text-[10px] text-white/30 ml-1">
              {upcoming.length > 0 ? `${upcoming.length} upcoming` : `${fixtures.length} played`}
            </span>
          )}
        </div>
        <button onClick={() => onChange(addDays(date, 1))} disabled={date >= WC_END}
          className="p-1.5 rounded-lg bg-white/5 border border-white/8 text-white/40 hover:text-white/80 disabled:opacity-20 transition-colors">
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Fixture list for this day */}
      {fixtures.length === 0 ? (
        <p className="text-xs text-white/25 text-center py-2">No group stage matches on this date</p>
      ) : (
        <div className="space-y-1.5">
          {fixtures.map((f, i) => (
            <FixtureRow key={i} fixture={f} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Fixture row shown in date nav ── */
function FixtureRow({ fixture }: { fixture: Fixture }) {
  const played = isPlayed(fixture);
  return (
    <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border text-sm ${
      played
        ? "bg-white/2 border-white/5 opacity-60"
        : "bg-white/4 border-white/8"
    }`}>
      <span className="text-[10px] font-medium text-white/30 w-16 flex-shrink-0">{fixture.group}</span>
      <div className="flex-1 flex items-center justify-between gap-2 min-w-0">
        <span className={`font-medium truncate ${played ? "text-white/40" : "text-white"}`}>
          {fixture.homeTeam}
        </span>
        {played ? (
          <span className="text-xs font-bold text-white/50 flex-shrink-0">
            {fixture.homeScore} – {fixture.awayScore}
          </span>
        ) : (
          <span className="text-[10px] text-white/20 flex-shrink-0">vs</span>
        )}
        <span className={`font-medium truncate text-right ${played ? "text-white/40" : "text-white"}`}>
          {fixture.awayTeam}
        </span>
      </div>
      {played && (
        <span className="text-[10px] text-white/20 flex-shrink-0">FT</span>
      )}
    </div>
  );
}

/* ── Single match analysis card ── */
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
                  {analysis.recommendedBet.confidence}
                </span>
              </div>
              <p className="text-xs text-white/40 mt-0.5">
                {fmtShort(analysis.date)}{analysis.oddsFound && ` · ${analysis.oddsFound.source}`}
              </p>
            </div>
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full flex-shrink-0 ${stake.bg}`}>
              <StakeIcon className={`h-3.5 w-3.5 ${stake.text}`} />
              <span className={`text-xs font-bold ${stake.text}`}>{analysis.stakeRating}</span>
            </div>
          </div>

          <p className="mt-3 text-sm text-white/60 leading-relaxed">{analysis.summary}</p>

          <div className="mt-4">
            <div className="h-2 rounded-full bg-white/5 overflow-hidden flex">
              <div className="bg-blue-500/70" style={{ width: `${analysis.homeWinProb}%` }} />
              <div className="bg-white/25" style={{ width: `${analysis.drawProb}%` }} />
              <div className="bg-amber-500/70" style={{ width: `${analysis.awayWinProb}%` }} />
            </div>
            <div className="flex justify-between mt-1.5 text-[10px] text-white/40">
              <span className="text-blue-400/70">{analysis.homeTeam} {analysis.homeWinProb}%</span>
              <span>Draw {analysis.drawProb}%</span>
              <span className="text-amber-400/70">{analysis.awayTeam} {analysis.awayWinProb}%</span>
            </div>
          </div>

          {/* Extra markets row */}
          {(analysis.bttsProb !== undefined || analysis.over25Prob !== undefined || analysis.predictedScore) && (
            <div className="mt-3 flex gap-3 flex-wrap">
              {analysis.bttsProb !== undefined && (
                <div className="flex items-center gap-1.5 bg-white/4 border border-white/8 rounded-lg px-3 py-1.5">
                  <span className="text-[10px] text-white/30 uppercase tracking-wider">BTTS</span>
                  <span className={`text-xs font-bold ${analysis.bttsProb >= 55 ? "text-green-400" : analysis.bttsProb >= 45 ? "text-amber-400" : "text-white/60"}`}>
                    {analysis.bttsProb}%
                  </span>
                </div>
              )}
              {analysis.over25Prob !== undefined && (
                <div className="flex items-center gap-1.5 bg-white/4 border border-white/8 rounded-lg px-3 py-1.5">
                  <span className="text-[10px] text-white/30 uppercase tracking-wider">O 2.5</span>
                  <span className={`text-xs font-bold ${analysis.over25Prob >= 60 ? "text-green-400" : analysis.over25Prob >= 50 ? "text-amber-400" : "text-white/60"}`}>
                    {analysis.over25Prob}%
                  </span>
                </div>
              )}
              {analysis.predictedScore && (
                <div className="flex items-center gap-1.5 bg-white/4 border border-white/8 rounded-lg px-3 py-1.5">
                  <span className="text-[10px] text-white/30 uppercase tracking-wider">Predicted</span>
                  <span className="text-xs font-bold text-white">{analysis.predictedScore}</span>
                </div>
              )}
              {analysis.valueEdge !== null && analysis.valueEdge !== undefined && (
                <div className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 border ${analysis.valueEdge > 0.05 ? "bg-green-500/10 border-green-500/25" : analysis.valueEdge > 0 ? "bg-blue-500/10 border-blue-500/20" : "bg-red-500/10 border-red-500/20"}`}>
                  <span className="text-[10px] text-white/30 uppercase tracking-wider">Edge</span>
                  <span className={`text-xs font-bold ${analysis.valueEdge > 0.05 ? "text-green-400" : analysis.valueEdge > 0 ? "text-blue-400" : "text-red-400"}`}>
                    {analysis.valueEdge > 0 ? "+" : ""}{(analysis.valueEdge * 100).toFixed(1)}%
                  </span>
                </div>
              )}
            </div>
          )}

          <div className="mt-4 bg-white/3 border border-white/8 rounded-xl p-4">
            <p className="text-[10px] font-medium text-white/30 uppercase tracking-wider mb-2">AI Pick</p>
            <div className="flex items-center gap-3 flex-wrap">
              <div>
                <span className="text-sm font-bold text-amber-400">{analysis.recommendedBet.prediction}</span>
                <span className="text-xs text-white/40 ml-2">{analysis.recommendedBet.market}</span>
              </div>
              {analysis.oddsFound && (
                <div className="flex gap-3 text-xs flex-wrap">
                  <span className="text-white/50">H: <span className="text-white font-medium">{analysis.oddsFound.homeWin}</span></span>
                  <span className="text-white/50">D: <span className="text-white font-medium">{analysis.oddsFound.draw}</span></span>
                  <span className="text-white/50">A: <span className="text-white font-medium">{analysis.oddsFound.awayWin}</span></span>
                  {analysis.oddsFound.btts && <span className="text-white/50">BTTS: <span className="text-white font-medium">{analysis.oddsFound.btts}</span></span>}
                  {analysis.oddsFound.over25 && <span className="text-white/50">O2.5: <span className="text-white font-medium">{analysis.oddsFound.over25}</span></span>}
                </div>
              )}
            </div>
            <p className="text-xs text-white/50 mt-2 leading-relaxed">{analysis.recommendedBet.reasoning}</p>
            <div className="mt-3 flex gap-4 text-xs flex-wrap">
              {analysis.expectedValue !== null && (
                <span>
                  <span className="text-white/30">EV: </span>
                  <span className={analysis.expectedValue >= 0 ? "text-green-400 font-medium" : "text-red-400 font-medium"}>
                    {analysis.expectedValue >= 0 ? "+" : ""}{(analysis.expectedValue * 100).toFixed(1)}%
                  </span>
                </span>
              )}
              {analysis.kellyFraction !== null && (
                <span>
                  <span className="text-white/30">Kelly: </span>
                  <span className="text-white/70 font-medium">{(analysis.kellyFraction * 100).toFixed(1)}%</span>
                </span>
              )}
              {suggestedStake && (
                <span>
                  <span className="text-white/30">Stake: </span>
                  <span className="text-amber-400 font-bold">£{suggestedStake}</span>
                  <span className="text-white/20 ml-1">(¼ Kelly)</span>
                </span>
              )}
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <p className={`text-xs font-medium ${stake.text}`}>{analysis.stakeReasoning}</p>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowTipModal(true)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500/15 text-amber-400 text-xs font-medium hover:bg-amber-500/25 transition-colors">
                <Plus className="h-3 w-3" /> Save as Tip
              </button>
              <button onClick={() => setExpanded(!expanded)} className="p-1.5 text-white/20 hover:text-white/60 transition-colors">
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
                  {analysis.keyStats.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-white/60">
                      <CheckCircle className="h-3.5 w-3.5 text-green-400/60 mt-0.5 flex-shrink-0" />{s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {analysis.risksToConsider.length > 0 && (
              <div>
                <p className="text-[10px] font-medium text-white/30 uppercase tracking-wider mb-2">Risks</p>
                <ul className="space-y-1.5">
                  {analysis.risksToConsider.map((r, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-white/60">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-400/60 mt-0.5 flex-shrink-0" />{r}
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

/* ── Acca card ── */
function AccaCard({ acca, bankroll }: { acca: AccaResult; bankroll: number }) {
  const [expanded, setExpanded]     = useState(true);
  const [showBetModal, setShowBetModal] = useState(false);
  const stake = STAKE_STYLES[acca.stakeRating];
  const StakeIcon = stake.icon;
  const suggestedStake =
    bankroll > 0 && acca.kellyFraction > 0
      ? (bankroll * acca.kellyFraction * 0.25).toFixed(2)
      : null;

  const betPrefill = {
    label: acca.title,
    type: "acca" as const,
    selections: acca.legs.map(leg => ({
      match: leg.match,
      market: leg.market,
      prediction: leg.prediction,
      odds: leg.odds,
    })),
  };

  return (
    <>
      {showBetModal && (
        <AddBetModal onClose={() => setShowBetModal(false)} prefill={betPrefill} />
      )}
    <div className="rounded-2xl border border-purple-500/25 bg-purple-500/5 overflow-hidden">
      <div className="px-5 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-purple-400" />
              <h3 className="text-base font-bold text-white">{acca.title}</h3>
            </div>
            <p className="text-xs text-white/50 mt-1 leading-relaxed">{acca.summary}</p>
          </div>
          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            <div className="bg-purple-500/20 border border-purple-500/30 rounded-xl px-3 py-2 text-center">
              <p className="text-[10px] text-purple-300/60 uppercase tracking-wider">Odds</p>
              <p className="text-xl font-black text-purple-300">{acca.totalOdds.toFixed(2)}</p>
            </div>
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full ${stake.bg}`}>
              <StakeIcon className={`h-3 w-3 ${stake.text}`} />
              <span className={`text-[11px] font-bold ${stake.text}`}>{acca.stakeRating}</span>
            </div>
          </div>
        </div>

        <div className="mt-4 flex gap-4 text-xs flex-wrap">
          <span>
            <span className="text-white/30">EV: </span>
            <span className={acca.expectedValue >= 0 ? "text-green-400 font-medium" : "text-red-400 font-medium"}>
              {acca.expectedValue >= 0 ? "+" : ""}{(acca.expectedValue * 100).toFixed(1)}%
            </span>
          </span>
          <span>
            <span className="text-white/30">Kelly: </span>
            <span className="text-white/70 font-medium">{(acca.kellyFraction * 100).toFixed(1)}%</span>
          </span>
          {suggestedStake && (
            <span>
              <span className="text-white/30">Suggested: </span>
              <span className="text-amber-400 font-bold">£{suggestedStake}</span>
              <span className="text-white/20 ml-1">(¼ Kelly)</span>
            </span>
          )}
        </div>
        <p className={`mt-1 text-xs font-medium ${stake.text}`}>{acca.stakeReasoning}</p>

        <div className="mt-3 flex items-center gap-3">
          <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-1 text-xs text-white/30 hover:text-white/60 transition-colors">
            {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {expanded ? "Hide legs" : `Show ${acca.legs.length} legs`}
          </button>
          <button onClick={() => setShowBetModal(true)}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-500/20 border border-purple-500/30 text-purple-300 text-xs font-semibold hover:bg-purple-500/30 transition-colors">
            <ClipboardList className="h-3.5 w-3.5" /> Copy to Bet Tracker
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-purple-500/15">
          {acca.legs.map((leg, i) => (
            <div key={i} className={`px-5 py-3.5 ${i < acca.legs.length - 1 ? "border-b border-white/5" : ""}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-white/20">{i + 1}</span>
                    <span className="text-sm font-semibold text-white">{leg.match}</span>
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${CONF_STYLES[leg.confidence]}`}>
                      {leg.confidence}
                    </span>
                  </div>
                  <p className="text-xs text-white/40 mt-0.5 ml-4">{fmtShort(leg.date)} · {leg.market}</p>
                  <p className="text-xs text-white/50 mt-1 ml-4 leading-relaxed">{leg.reasoning}</p>
                </div>
                <div className="flex-shrink-0 text-right">
                  <p className="text-sm font-bold text-amber-400">{leg.prediction}</p>
                  <p className="text-sm font-bold text-white/60">@ {leg.odds}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
    </>
  );
}

/* ── Custom Bet Result Card ── */
function CustomBetCard({ result, bankroll }: { result: CustomBetResult; bankroll: number }) {
  const isValue   = result.verdict === "Value Bet";
  const isPoor    = result.verdict === "Poor Value";
  const noOdds    = result.verdict === "No odds provided";
  const fairImplied = result.fairOdds > 0 ? (100 / result.fairOdds).toFixed(1) : null;

  const suggestedStake =
    bankroll > 0 && result.kellyFraction && result.kellyFraction > 0
      ? (bankroll * result.kellyFraction * 0.25).toFixed(2)
      : null;

  const verdictStyle = isValue  ? "bg-green-500/15 border-green-500/25 text-green-400"
    : isPoor  ? "bg-red-500/15 border-red-500/25 text-red-400"
    : noOdds  ? "bg-white/5 border-white/10 text-white/50"
    : "bg-amber-500/15 border-amber-500/25 text-amber-400";

  return (
    <div className="rounded-2xl border border-white/10 bg-white/3 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-white/6">
        <p className="text-[10px] font-medium text-white/30 uppercase tracking-wider mb-1">Your Bet</p>
        <p className="text-sm font-semibold text-white leading-relaxed">"{result.betDescription}"</p>
      </div>

      <div className="px-5 py-4 space-y-4">
        {/* Big probability + verdict */}
        <div className="flex items-center gap-4">
          <div className="text-center">
            <p className="text-4xl font-black text-white">{result.probability}<span className="text-xl text-white/40">%</span></p>
            <p className="text-[10px] text-white/30 mt-0.5">Estimated chance</p>
          </div>
          <div className="flex-1 space-y-2">
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold ${verdictStyle}`}>
              {isValue ? <CheckCircle className="h-3.5 w-3.5" /> : isPoor ? <XCircle className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
              {result.verdict}
            </div>
            <div className="flex gap-3 text-xs flex-wrap">
              <span><span className="text-white/30">Fair odds: </span><span className="text-white font-bold">{result.fairOdds.toFixed(2)}</span></span>
              {fairImplied && <span><span className="text-white/30">= </span><span className="text-white/60">{fairImplied}% implied</span></span>}
              {result.offeredOdds && <span><span className="text-white/30">Offered: </span><span className={`font-bold ${isValue ? "text-green-400" : isPoor ? "text-red-400" : "text-white"}`}>{result.offeredOdds}</span></span>}
            </div>
          </div>
        </div>

        {/* Probability bar */}
        <div>
          <div className="h-3 rounded-full bg-white/5 overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all"
              style={{ width: `${result.probability}%` }} />
          </div>
          <div className="flex justify-between mt-1 text-[10px] text-white/25">
            <span>0%</span><span>50%</span><span>100%</span>
          </div>
        </div>

        {/* EV + Kelly + stake */}
        {(result.expectedValue !== null || result.kellyFraction !== null) && (
          <div className="flex gap-4 text-xs flex-wrap bg-white/3 border border-white/6 rounded-xl px-4 py-3">
            {result.expectedValue !== null && (
              <span>
                <span className="text-white/30">Expected Value: </span>
                <span className={result.expectedValue >= 0 ? "text-green-400 font-bold" : "text-red-400 font-bold"}>
                  {result.expectedValue >= 0 ? "+" : ""}{(result.expectedValue * 100).toFixed(1)}%
                </span>
              </span>
            )}
            {result.kellyFraction !== null && (
              <span>
                <span className="text-white/30">Kelly: </span>
                <span className="text-white/70 font-medium">{(result.kellyFraction * 100).toFixed(1)}%</span>
              </span>
            )}
            {suggestedStake && (
              <span>
                <span className="text-white/30">Suggested stake: </span>
                <span className="text-amber-400 font-bold">£{suggestedStake}</span>
                <span className="text-white/20 ml-1">(¼ Kelly)</span>
              </span>
            )}
          </div>
        )}

        {/* Reasoning */}
        <p className="text-sm text-white/60 leading-relaxed">{result.reasoning}</p>

        {/* Key factors */}
        {result.keyFactors.length > 0 && (
          <div>
            <p className="text-[10px] font-medium text-white/30 uppercase tracking-wider mb-2">Key Factors</p>
            <ul className="space-y-1.5">
              {result.keyFactors.map((f, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-white/60">
                  <CheckCircle className="h-3.5 w-3.5 text-green-400/60 mt-0.5 flex-shrink-0" />{f}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Risks */}
        {result.risks.length > 0 && (
          <div>
            <p className="text-[10px] font-medium text-white/30 uppercase tracking-wider mb-2">Risks</p>
            <ul className="space-y-1.5">
              {result.risks.map((r, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-white/60">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-400/60 mt-0.5 flex-shrink-0" />{r}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Odds Comparison Table ── */
function OddsPanel({
  homeTeam, awayTeam,
  onOddsLoaded,
}: {
  homeTeam: string;
  awayTeam: string;
  onOddsLoaded: (h: number, d: number, a: number) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [data, setData]       = useState<OddsComparison | null>(null);
  const [error, setError]     = useState("");

  async function fetchOdds() {
    const oddsApiKey = localStorage.getItem("wc26-odds-key");
    if (!oddsApiKey) {
      setError("Add your free Odds API key in Settings to fetch live odds from Rollbit, Gamdom, BetPanda & Betplay.");
      return;
    }
    setLoading(true);
    setError("");
    setData(null);
    try {
      const res = await fetch("/api/odds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ homeTeam, awayTeam, oddsApiKey }),
      });
      const json = await res.json() as OddsComparison & { error?: string };
      if (!res.ok || json.error) { setError(json.error ?? "Failed to fetch odds"); return; }
      setData(json);
      // Auto-fill best odds into parent form
      if (json.bestHomeWin && json.bestDraw && json.bestAwayWin) {
        onOddsLoaded(json.bestHomeWin.odds, json.bestDraw.odds, json.bestAwayWin.odds);
      }
    } catch {
      setError("Network error fetching odds");
    } finally {
      setLoading(false);
    }
  }

  const BOOKS = ["Rollbit", "Gamdom", "BetPanda", "Betplay"];

  return (
    <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-blue-500/10">
        <BarChart2 className="h-3.5 w-3.5 text-blue-400" />
        <span className="text-xs font-semibold text-blue-400">Live Odds — Rollbit · Gamdom · BetPanda · Betplay</span>
        <button onClick={fetchOdds} disabled={loading || !homeTeam || !awayTeam}
          className="ml-auto flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-500/15 text-blue-400 text-[11px] font-medium hover:bg-blue-500/25 disabled:opacity-40 transition-colors">
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
          {loading ? "Fetching…" : "Fetch Odds"}
        </button>
      </div>

      {error && <p className="px-4 py-3 text-xs text-red-400">{error}{error.includes("Settings") && <a href="/settings" className="text-amber-400 ml-1 hover:underline">Settings →</a>}</p>}

      {data && (
        <div className="p-4 space-y-3">
          {/* Arbitrage / mismatch alert */}
          {data.arbitrage && (
            <div className="flex items-center gap-2 rounded-lg bg-green-500/15 border border-green-500/25 px-3 py-2">
              <Zap className="h-3.5 w-3.5 text-green-400 flex-shrink-0" />
              <p className="text-xs font-semibold text-green-400">
                Arbitrage detected! Best implied prob sum = {(data.impliedProbSum * 100).toFixed(1)}% — guaranteed profit possible.
              </p>
            </div>
          )}
          {!data.arbitrage && data.mismatchPct > 8 && (
            <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-2">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-400 flex-shrink-0" />
              <p className="text-xs text-amber-400">
                Odds mismatch of <span className="font-bold">{data.mismatchPct.toFixed(0)}%</span> detected between books — shop for best price.
              </p>
            </div>
          )}

          {/* Best odds highlight */}
          {(data.bestHomeWin || data.bestDraw || data.bestAwayWin) && (
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: homeTeam, best: data.bestHomeWin },
                { label: "Draw",   best: data.bestDraw },
                { label: awayTeam, best: data.bestAwayWin },
              ].map(({ label, best }) => best && (
                <div key={label} className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 text-center">
                  <p className="text-[10px] text-green-400/70 truncate">{label}</p>
                  <p className="text-lg font-black text-green-400">{best.odds.toFixed(2)}</p>
                  <p className="text-[10px] text-green-400/60 font-medium">{best.name}</p>
                </div>
              ))}
            </div>
          )}

          {/* Per-bookmaker table */}
          {data.bookmakers.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-white/30">
                    <th className="text-left py-1.5 pr-4">Book</th>
                    <th className="text-center py-1.5 px-2">{homeTeam || "Home"}</th>
                    <th className="text-center py-1.5 px-2">Draw</th>
                    <th className="text-center py-1.5 px-2">{awayTeam || "Away"}</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Show found bookmakers */}
                  {data.bookmakers.map((bk, i) => (
                    <tr key={i} className="border-t border-white/5">
                      <td className="py-2 pr-4 font-medium text-white/70">{bk.name}</td>
                      {[bk.homeWin, bk.draw, bk.awayWin].map((odds, j) => {
                        const bests = [data.bestHomeWin?.odds, data.bestDraw?.odds, data.bestAwayWin?.odds][j];
                        const isBest = odds !== null && odds === bests;
                        return (
                          <td key={j} className={`py-2 px-2 text-center font-bold ${odds === null ? "text-white/15" : isBest ? "text-green-400" : "text-white/60"}`}>
                            {odds?.toFixed(2) ?? "—"}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  {/* Placeholder rows for books with no data */}
                  {BOOKS.filter(b => !data.bookmakers.find(bk => bk.name.toLowerCase().includes(b.toLowerCase()))).map(b => (
                    <tr key={b} className="border-t border-white/5">
                      <td className="py-2 pr-4 text-white/20">{b}</td>
                      <td colSpan={3} className="py-2 px-2 text-center text-white/15 text-[10px]">not listed</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {data.bookmakers.length === 0 && (
            <p className="text-xs text-white/30 text-center py-2">No odds found from Rollbit/Gamdom/BetPanda/Betplay for this match yet.</p>
          )}

          {(data.bestHomeWin || data.bestDraw || data.bestAwayWin) && (
            <p className="text-[10px] text-blue-400/60">↑ Best odds auto-filled into the form above for AI analysis</p>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Tournament Simulator Card ── */
function SimulatorCard({ result }: { result: SimulatorResult }) {
  const top = [...result.topContenders].sort((a, b) => b.winner - a.winner);
  const maxWinner = top[0]?.winner ?? 1;

  return (
    <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/5 overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-yellow-500/10">
        <Trophy className="h-4 w-4 text-yellow-400" />
        <h3 className="text-sm font-bold text-yellow-400">WC2026 Tournament Simulator</h3>
        <span className="ml-auto text-[10px] text-yellow-400/50">10,000 simulations</span>
      </div>

      <div className="px-5 py-4 space-y-4">
        {/* Winner probability bars */}
        <div>
          <p className="text-[10px] font-medium text-white/30 uppercase tracking-wider mb-3">Tournament Winner Probability</p>
          <div className="space-y-2.5">
            {top.slice(0, 12).map((team, i) => (
              <div key={team.team} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-white/20 w-4 text-right">{i + 1}</span>
                    <span className="font-semibold text-white">{team.team}</span>
                    <span className="text-[10px] text-white/30">{team.group}</span>
                  </div>
                  <span className={`font-bold ${i === 0 ? "text-yellow-400" : i < 3 ? "text-white" : "text-white/60"}`}>
                    {team.winner}%
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${i === 0 ? "bg-yellow-400" : i < 3 ? "bg-white/50" : "bg-white/25"}`}
                    style={{ width: `${(team.winner / maxWinner) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Knockout probabilities table */}
        <div className="overflow-x-auto">
          <p className="text-[10px] font-medium text-white/30 uppercase tracking-wider mb-2">Knockout Stage Probabilities</p>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-white/25 text-[10px]">
                <th className="text-left py-1.5 pr-4 font-medium">Team</th>
                <th className="text-center py-1.5 px-2 font-medium">R32</th>
                <th className="text-center py-1.5 px-2 font-medium">R16</th>
                <th className="text-center py-1.5 px-2 font-medium">QF</th>
                <th className="text-center py-1.5 px-2 font-medium">SF</th>
                <th className="text-center py-1.5 px-2 font-medium">Final</th>
                <th className="text-center py-1.5 px-2 font-medium">Win</th>
              </tr>
            </thead>
            <tbody>
              {top.slice(0, 8).map((team, i) => (
                <tr key={team.team} className="border-t border-white/5">
                  <td className={`py-2 pr-4 font-semibold ${i === 0 ? "text-yellow-400" : "text-white/80"}`}>{team.team}</td>
                  <td className="py-2 px-2 text-center text-white/40">{team.groupAdvance}%</td>
                  <td className="py-2 px-2 text-center text-white/50">{team.roundOf16}%</td>
                  <td className="py-2 px-2 text-center text-white/60">{team.quarterFinal}%</td>
                  <td className="py-2 px-2 text-center text-white/70">{team.semiFinal}%</td>
                  <td className="py-2 px-2 text-center text-white/80">{team.final}%</td>
                  <td className={`py-2 px-2 text-center font-bold ${i === 0 ? "text-yellow-400" : i < 3 ? "text-white" : "text-white/60"}`}>{team.winner}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Insights + upset alerts */}
        {result.groupInsights.length > 0 && (
          <div>
            <p className="text-[10px] font-medium text-white/30 uppercase tracking-wider mb-2">Group Stage Insights</p>
            <ul className="space-y-1.5">
              {result.groupInsights.map((ins, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-white/60">
                  <CheckCircle className="h-3.5 w-3.5 text-yellow-400/60 mt-0.5 flex-shrink-0" />{ins}
                </li>
              ))}
            </ul>
          </div>
        )}
        {result.upsetAlerts.length > 0 && (
          <div>
            <p className="text-[10px] font-medium text-white/30 uppercase tracking-wider mb-2">Upset Alerts</p>
            <ul className="space-y-1.5">
              {result.upsetAlerts.map((a, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-white/60">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-400/60 mt-0.5 flex-shrink-0" />{a}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Upset Detector Card ── */
function UpsetDetectorCard({ result }: { result: UpsetResult }) {
  const CONF_STYLES = { High: "text-green-400", Medium: "text-amber-400", Low: "text-white/40" };

  if (result.picks.length === 0) {
    return (
      <div className="rounded-2xl border border-orange-500/20 bg-orange-500/5 px-5 py-8 text-center">
        <Flame className="h-8 w-8 text-orange-400/30 mx-auto mb-3" />
        <p className="text-sm text-white/40">No strong upset value found on Gamdom/Rollbit today.</p>
        <p className="text-xs text-white/25 mt-1">{result.summary}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-white/40 leading-relaxed">{result.summary}</p>
      {result.picks.map((pick, i) => (
        <div key={i} className="rounded-2xl border border-orange-500/20 bg-orange-500/5 overflow-hidden">
          <div className="px-5 py-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Flame className="h-3.5 w-3.5 text-orange-400 flex-shrink-0" />
                  <h3 className="text-sm font-bold text-white">{pick.match}</h3>
                  <span className="text-[10px] text-white/30">{pick.group}</span>
                  <span className={`text-[10px] font-semibold ${CONF_STYLES[pick.confidence]}`}>{pick.confidence}</span>
                </div>
                <p className="text-xs text-white/40 mt-0.5">{fmtShort(pick.date)}</p>
              </div>
              {/* Value edge badge */}
              <div className={`flex-shrink-0 px-3 py-2 rounded-xl text-center border ${pick.valueEdgePct >= 7 ? "bg-green-500/15 border-green-500/25" : "bg-orange-500/15 border-orange-500/20"}`}>
                <p className="text-[10px] text-white/30 uppercase tracking-wider">Edge</p>
                <p className={`text-lg font-black ${pick.valueEdgePct >= 7 ? "text-green-400" : "text-orange-400"}`}>+{pick.valueEdgePct.toFixed(1)}%</p>
              </div>
            </div>

            <div className="mt-3 flex gap-3 flex-wrap text-xs">
              <span className="bg-white/5 border border-white/8 rounded-lg px-3 py-1.5">
                <span className="text-white/30">Underdog: </span>
                <span className="text-white font-semibold">{pick.underdog}</span>
              </span>
              <span className="bg-white/5 border border-white/8 rounded-lg px-3 py-1.5">
                <span className="text-white/30">Win prob: </span>
                <span className="text-orange-400 font-bold">{pick.underdogWinProb}%</span>
              </span>
              <span className="bg-white/5 border border-white/8 rounded-lg px-3 py-1.5">
                <span className="text-white/30">Gamdom/Rollbit: </span>
                <span className="text-white font-bold">{pick.estimatedUnderdogOdds}</span>
              </span>
              <span className="bg-white/5 border border-white/8 rounded-lg px-3 py-1.5">
                <span className="text-white/30">Fair odds: </span>
                <span className="text-white/70 font-medium">{pick.fairOdds}</span>
              </span>
            </div>

            <p className="mt-3 text-sm text-white/60 leading-relaxed">{pick.reasoning}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Bet Slip Analyser Card ── */
function BetSlipCard({ result, bankroll }: { result: BetSlipResult; bankroll: number }) {
  const isValue = result.verdict === "Value Bet";
  const isPoor  = result.verdict === "Poor Value";
  const cantRead = result.verdict === "Cannot Analyse";

  const verdictStyle = isValue  ? "bg-green-500/15 border-green-500/25 text-green-400"
    : isPoor   ? "bg-red-500/15 border-red-500/25 text-red-400"
    : cantRead ? "bg-white/5 border-white/10 text-white/40"
    : "bg-amber-500/15 border-amber-500/25 text-amber-400";

  const suggestedStake = bankroll > 0 && result.kellyFraction && result.kellyFraction > 0
    ? (bankroll * result.kellyFraction * 0.25).toFixed(2)
    : null;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/3 overflow-hidden">
      {/* URL bar */}
      <div className="px-5 py-3 border-b border-white/6 flex items-center gap-2">
        <span className="text-[10px] font-medium text-white/30 uppercase tracking-wider flex-shrink-0">Bet slip</span>
        <span className="text-xs text-white/40 truncate font-mono">{result.url}</span>
        {result.couldReadPage
          ? <span className="ml-auto text-[10px] text-green-400/70 flex-shrink-0">Page read ✓</span>
          : <span className="ml-auto text-[10px] text-amber-400/60 flex-shrink-0">From description</span>
        }
      </div>

      <div className="px-5 py-4 space-y-4">
        {/* Verdict + odds */}
        {!cantRead && (
          <div className="flex items-center gap-4">
            {result.totalOdds && (
              <div className="text-center flex-shrink-0">
                <p className="text-3xl font-black text-white">{result.totalOdds.toFixed(2)}</p>
                <p className="text-[10px] text-white/30 mt-0.5">Combined odds</p>
              </div>
            )}
            <div className="flex-1 space-y-2">
              <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold ${verdictStyle}`}>
                {isValue ? <CheckCircle className="h-3.5 w-3.5" /> : isPoor ? <XCircle className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                {result.verdict}
              </div>
              <div className="flex gap-3 text-xs flex-wrap">
                {result.probability !== null && (
                  <span><span className="text-white/30">Win prob: </span><span className="font-bold text-white">{result.probability}%</span></span>
                )}
                {result.expectedValue !== null && (
                  <span><span className="text-white/30">EV: </span>
                  <span className={`font-bold ${result.expectedValue >= 0 ? "text-green-400" : "text-red-400"}`}>
                    {result.expectedValue >= 0 ? "+" : ""}{(result.expectedValue * 100).toFixed(1)}%
                  </span></span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Selections */}
        {result.selections.length > 0 && (
          <div>
            <p className="text-[10px] font-medium text-white/30 uppercase tracking-wider mb-2">Selections</p>
            <div className="space-y-1.5">
              {result.selections.map((sel, i) => (
                <div key={i} className="flex items-center justify-between bg-white/3 border border-white/6 rounded-xl px-4 py-2.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white">{sel.match}</p>
                    <p className="text-xs text-white/40 mt-0.5">{sel.market} · {sel.prediction}</p>
                  </div>
                  <span className="text-sm font-bold text-amber-400 ml-4 flex-shrink-0">@ {sel.odds}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Kelly + stake */}
        {(result.kellyFraction !== null || suggestedStake) && (
          <div className="flex gap-4 text-xs flex-wrap bg-white/3 border border-white/6 rounded-xl px-4 py-3">
            {result.kellyFraction !== null && (
              <span><span className="text-white/30">Kelly: </span><span className="text-white/70 font-medium">{(result.kellyFraction * 100).toFixed(1)}%</span></span>
            )}
            {suggestedStake && (
              <span><span className="text-white/30">Suggested stake: </span><span className="text-amber-400 font-bold">£{suggestedStake}</span><span className="text-white/20 ml-1">(¼ Kelly)</span></span>
            )}
          </div>
        )}

        {/* Reasoning */}
        <p className="text-sm text-white/60 leading-relaxed">{result.reasoning}</p>

        {result.keyFactors.length > 0 && (
          <div>
            <p className="text-[10px] font-medium text-white/30 uppercase tracking-wider mb-2">Key Factors</p>
            <ul className="space-y-1.5">
              {result.keyFactors.map((f, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-white/60">
                  <CheckCircle className="h-3.5 w-3.5 text-green-400/60 mt-0.5 flex-shrink-0" />{f}
                </li>
              ))}
            </ul>
          </div>
        )}
        {result.risks.length > 0 && (
          <div>
            <p className="text-[10px] font-medium text-white/30 uppercase tracking-wider mb-2">Risks</p>
            <ul className="space-y-1.5">
              {result.risks.map((r, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-white/60">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-400/60 mt-0.5 flex-shrink-0" />{r}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Main Panel ── */
type Mode = "recommendations" | "acca" | "specific" | "custom" | "simulator" | "upsets" | "betslip";

export default function AIPicksPanel() {
  const { tips } = useApp();
  const today = clampDate(new Date().toISOString().slice(0, 10));

  const [mode, setMode]           = useState<Mode>("recommendations");
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");
  const [results, setResults]     = useState<AnalysisResult[]>([]);
  const [acca, setAcca]                   = useState<AccaResult | null>(null);
  const [customResult, setCustomResult]   = useState<CustomBetResult | null>(null);
  const [simResult, setSimResult]         = useState<SimulatorResult | null>(null);
  const [upsetResult, setUpsetResult]     = useState<UpsetResult | null>(null);
  const [betSlipResult, setBetSlipResult] = useState<BetSlipResult | null>(null);

  // Bet slip form
  const [betSlipUrl, setBetSlipUrl]       = useState("");
  const [betSlipText, setBetSlipText]     = useState("");
  const [showSlipFallback, setShowSlipFallback] = useState(false);
  const [apiKey, setApiKey]         = useState("");
  const [bankroll, setBankroll]     = useState<number | "">(200);
  const [pickedDate, setPickedDate] = useState(today);

  // Custom bet form
  const [betDescription, setBetDescription] = useState("");
  const [offeredOdds, setOfferedOdds]       = useState<number | "">("");

  // Specific match form
  const [homeTeam, setHomeTeam]   = useState("");
  const [awayTeam, setAwayTeam]   = useState("");
  const [matchDate, setMatchDate] = useState(today);
  const [homeOdds, setHomeOdds]   = useState<number | "">("");
  const [drawOdds, setDrawOdds]   = useState<number | "">("");
  const [awayOdds, setAwayOdds]   = useState<number | "">("");

  void tips;

  useEffect(() => {
    const key = localStorage.getItem("wc26-groq-key");
    if (key) setApiKey(key);
    const bl = localStorage.getItem("wc26-bankroll");
    if (bl) setBankroll(parseFloat(bl) || 200);
  }, []);

  function switchMode(m: Mode) {
    setMode(m);
    setResults([]);
    setAcca(null);
    setCustomResult(null);
    setSimResult(null);
    setUpsetResult(null);
    setBetSlipResult(null);
    setShowSlipFallback(false);
    setError("");
  }

  function fillFromFixture(f: Fixture) {
    setHomeTeam(f.homeTeam);
    setAwayTeam(f.awayTeam);
    setMatchDate(f.date);
    setHomeOdds("");
    setDrawOdds("");
    setAwayOdds("");
    switchMode("specific");
  }

  async function runAnalysis() {
    if (!apiKey) { window.location.href = "/settings"; return; }
    setLoading(true);
    setError("");
    setResults([]);
    setAcca(null);
    setCustomResult(null);
    setSimResult(null);
    setUpsetResult(null);
    setBetSlipResult(null);

    try {
      // Bet slip uses its own endpoint — always sends pasted text, URL is optional reference only
      if (mode === "betslip") {
        const res = await fetch("/api/betslip", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: betSlipUrl || "not provided", pastedText: betSlipText, bankroll: bankroll || undefined, apiKey }),
        });
        const data = await res.json() as BetSlipResult & { error?: string };
        if (!res.ok || data.error) { setError(data.error ?? "Analysis failed"); return; }
        setBetSlipResult(data);
        return;
      }

      let bodyData: Record<string, unknown>;
      if (mode === "recommendations") {
        bodyData = { mode: "recommendations", date: pickedDate, bankroll: bankroll || undefined, apiKey };
      } else if (mode === "acca") {
        bodyData = { mode: "acca", date: pickedDate, bankroll: bankroll || undefined, apiKey };
      } else if (mode === "custom") {
        bodyData = {
          mode: "custom", betDescription, offeredOdds: offeredOdds || undefined,
          bankroll: bankroll || undefined, apiKey,
        };
      } else if (mode === "simulator") {
        bodyData = { mode: "simulator", apiKey };
      } else if (mode === "upsets") {
        bodyData = { mode: "upsets", date: pickedDate, apiKey };
      } else {
        bodyData = {
          mode: "specific", homeTeam, awayTeam, date: matchDate,
          homeOdds: homeOdds || undefined, drawOdds: drawOdds || undefined,
          awayOdds: awayOdds || undefined, bankroll: bankroll || undefined, apiKey,
        };
      }

      const res = await fetch("/api/analyse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyData),
      });

      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Analysis failed"); return; }

      if (mode === "recommendations") setResults(data.tips ?? []);
      else if (mode === "acca") setAcca(data as AccaResult);
      else if (mode === "custom") setCustomResult(data as CustomBetResult);
      else if (mode === "simulator") setSimResult(data as SimulatorResult);
      else if (mode === "upsets") setUpsetResult(data as UpsetResult);
      else setResults([data]);
    } catch {
      setError("Network error — check your connection");
    } finally {
      setLoading(false);
    }
  }

  const upcomingOnDay = getFixturesForDate(pickedDate).filter((f) => !isPlayed(f));
  const hasUpcoming   = upcomingOnDay.length > 0;

  const btnLabel = mode === "recommendations" ? "Get Best Bets"
    : mode === "acca" ? "Build AI Acca"
    : mode === "custom" ? "Evaluate My Bet"
    : mode === "simulator" ? "Run Simulator"
    : mode === "upsets" ? "Find Upsets"
    : mode === "betslip" ? "Analyse Bet Slip"
    : "Analyse Match";

  const loadingLabel = mode === "recommendations" ? "Finding best bets…"
    : mode === "acca" ? "Building acca…"
    : mode === "custom" ? "Evaluating bet…"
    : mode === "simulator" ? "Running 10,000 simulations…"
    : mode === "upsets" ? "Scanning for upset value…"
    : mode === "betslip" ? "Reading bet slip…"
    : "Analysing match…";

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 overflow-hidden">
        <div className="px-5 py-4 border-b border-amber-500/10">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-400" />
            <h2 className="text-sm font-bold text-amber-400">AI Betting Analysis</h2>
          </div>
          <p className="text-xs text-white/40 mt-0.5">
            Real WC2026 fixtures · Probability breakdowns · Kelly Criterion stake sizing
          </p>
        </div>

        <div className="px-5 py-4 space-y-4">
          {!apiKey && (
            <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 px-4 py-3 flex items-center justify-between">
              <p className="text-xs text-amber-400">Add your free Groq API key in Settings to enable AI analysis</p>
              <a href="/settings" className="text-xs font-semibold text-amber-400 hover:text-amber-300 ml-3 whitespace-nowrap">Settings →</a>
            </div>
          )}

          {/* Mode tabs + bankroll */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex gap-1 bg-white/5 border border-white/8 rounded-xl p-1">
              <button onClick={() => switchMode("recommendations")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${mode === "recommendations" ? "bg-amber-500/20 text-amber-400" : "text-white/40 hover:text-white/60"}`}>
                <Search className="h-3 w-3" /> Best Bets
              </button>
              <button onClick={() => switchMode("acca")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${mode === "acca" ? "bg-purple-500/20 text-purple-400" : "text-white/40 hover:text-white/60"}`}>
                <Layers className="h-3 w-3" /> AI Acca
              </button>
              <button onClick={() => switchMode("specific")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${mode === "specific" ? "bg-amber-500/20 text-amber-400" : "text-white/40 hover:text-white/60"}`}>
                <Sparkles className="h-3 w-3" /> Analyse Match
              </button>
              <button onClick={() => switchMode("custom")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${mode === "custom" ? "bg-teal-500/20 text-teal-400" : "text-white/40 hover:text-white/60"}`}>
                <MessageSquare className="h-3 w-3" /> Custom Bet
              </button>
              <button onClick={() => switchMode("upsets")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${mode === "upsets" ? "bg-orange-500/20 text-orange-400" : "text-white/40 hover:text-white/60"}`}>
                <Flame className="h-3 w-3" /> Upset Finder
              </button>
              <button onClick={() => switchMode("simulator")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${mode === "simulator" ? "bg-yellow-500/20 text-yellow-400" : "text-white/40 hover:text-white/60"}`}>
                <Trophy className="h-3 w-3" /> Simulator
              </button>
              <button onClick={() => switchMode("betslip")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${mode === "betslip" ? "bg-cyan-500/20 text-cyan-400" : "text-white/40 hover:text-white/60"}`}>
                <Link className="h-3 w-3" /> Bet Slip
              </button>
            </div>
            <div className="flex items-center gap-1.5 ml-auto">
              <span className="text-xs text-white/30">£</span>
              <input type="number" value={bankroll} onChange={e => setBankroll(parseFloat(e.target.value) || "")}
                className="w-20 bg-white/5 border border-white/10 rounded-lg py-1.5 px-2 text-sm text-white focus:outline-none" placeholder="200" />
            </div>
          </div>

          {/* Date navigator with fixture list */}
          {(mode === "recommendations" || mode === "acca" || mode === "upsets") && (
            <DateNav
              date={pickedDate}
              onChange={(d) => { setPickedDate(d); setResults([]); setAcca(null); setUpsetResult(null); setError(""); }}
            />
          )}

          {/* Simulator explanation */}
          {mode === "simulator" && (
            <div className="rounded-xl bg-yellow-500/8 border border-yellow-500/15 px-4 py-3">
              <p className="text-xs text-yellow-400/80 leading-relaxed">
                Simulates the remaining WC2026 tournament 10,000 times using team strength, current results, and group standings. Shows each team&#39;s probability of reaching the Final and winning the tournament.
              </p>
            </div>
          )}

          {/* Specific match form */}
          {mode === "specific" && (
            <div className="space-y-3">
              {/* Quick pick from fixture list */}
              <div>
                <p className="text-[10px] font-medium text-white/30 uppercase tracking-wider mb-2">Quick pick a fixture</p>
                <div className="flex items-center gap-2 mb-2">
                  <button onClick={() => setMatchDate(addDays(matchDate, -1))} disabled={matchDate <= WC_START}
                    className="p-1 rounded bg-white/5 text-white/40 hover:text-white/80 disabled:opacity-20">
                    <ChevronLeft className="h-3 w-3" />
                  </button>
                  <span className="text-xs text-white/50">{fmtShort(matchDate)}</span>
                  <button onClick={() => setMatchDate(addDays(matchDate, 1))} disabled={matchDate >= WC_END}
                    className="p-1 rounded bg-white/5 text-white/40 hover:text-white/80 disabled:opacity-20">
                    <ChevronRight className="h-3 w-3" />
                  </button>
                </div>
                <div className="space-y-1">
                  {getFixturesForDate(matchDate).map((f, i) => (
                    <button key={i} onClick={() => fillFromFixture(f)}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-white/4 border border-white/8 hover:bg-white/8 transition-colors text-left">
                      <span className="text-[10px] text-white/30 w-14 flex-shrink-0">{f.group}</span>
                      <span className="text-sm text-white flex-1">{f.homeTeam} vs {f.awayTeam}</span>
                      {isPlayed(f) && <span className="text-xs text-white/30">{f.homeScore}–{f.awayScore}</span>}
                    </button>
                  ))}
                  {getFixturesForDate(matchDate).length === 0 && (
                    <p className="text-xs text-white/20 text-center py-2">No fixtures on this date</p>
                  )}
                </div>
              </div>

              <div className="border-t border-white/6 pt-3 space-y-3">
                <p className="text-[10px] font-medium text-white/30 uppercase tracking-wider">Or enter manually</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <input value={homeTeam} onChange={e => setHomeTeam(e.target.value)} placeholder="Home team *"
                    className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/25 focus:outline-none focus:border-amber-500/40" />
                  <input value={awayTeam} onChange={e => setAwayTeam(e.target.value)} placeholder="Away team *"
                    className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/25 focus:outline-none focus:border-amber-500/40" />
                  <input type="date" value={matchDate} onChange={e => setMatchDate(e.target.value)}
                    className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500/40" />
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-white/30 flex-shrink-0">Home</span>
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

                {/* Live odds comparison */}
                <OddsPanel
                  homeTeam={homeTeam}
                  awayTeam={awayTeam}
                  onOddsLoaded={(h, d, a) => { setHomeOdds(h); setDrawOdds(d); setAwayOdds(a); }}
                />
              </div>
            </div>
          )}

          {/* Bet slip form */}
          {mode === "betslip" && (
            <div className="space-y-3">
              {/* Rollbit/Gamdom notice — their sites use Betby (requires partner auth) so we can't auto-read */}
              <div className="rounded-xl bg-cyan-500/8 border border-cyan-500/15 px-4 py-3 space-y-2">
                <p className="text-xs font-semibold text-cyan-400">How to use</p>
                <ol className="text-xs text-white/50 space-y-1 list-decimal list-inside leading-relaxed">
                  <li>Open your bet slip on Rollbit or Gamdom</li>
                  <li>Paste the share link below <span className="text-white/30">(optional — for reference)</span></li>
                  <li>Copy the selections you see and paste them in the box</li>
                </ol>
                <p className="text-[10px] text-white/25 leading-relaxed">
                  Rollbit and Gamdom use Betby&#39;s sportsbook engine which requires partner API credentials to read automatically — so just paste what you see on screen.
                </p>
              </div>

              {/* Optional URL reference */}
              <div>
                <label className="text-[10px] font-medium text-white/30 uppercase tracking-wider block mb-1.5">
                  Share link <span className="text-white/20 normal-case">(optional)</span>
                </label>
                <input
                  type="url"
                  value={betSlipUrl}
                  onChange={e => setBetSlipUrl(e.target.value)}
                  placeholder="https://rollbit.com/sports?bt-path=…"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 font-mono focus:outline-none focus:border-cyan-500/40"
                />
              </div>

              {/* Paste area — always shown */}
              <div>
                <label className="text-[10px] font-medium text-white/30 uppercase tracking-wider block mb-1.5">
                  Paste your bet slip selections *
                </label>
                <textarea
                  value={betSlipText}
                  onChange={e => setBetSlipText(e.target.value)}
                  placeholder={"England vs Croatia — England Win @ 1.65\nArgentina vs Austria — Over 2.5 Goals @ 1.80\nFrance vs Iraq — France Win @ 1.35\n\nTotal odds: 3.99  Stake: £10"}
                  rows={6}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-cyan-500/40 resize-none leading-relaxed"
                />
              </div>
            </div>
          )}

          {/* Custom bet form */}
          {mode === "custom" && (
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-medium text-white/30 uppercase tracking-wider block mb-1.5">
                  Describe your bet
                </label>
                <textarea
                  value={betDescription}
                  onChange={e => setBetDescription(e.target.value)}
                  placeholder="e.g. England to win Group L, Mbappe to score anytime vs Iraq, Over 2.5 goals in Argentina vs Austria…"
                  rows={3}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-teal-500/40 resize-none leading-relaxed"
                />
              </div>
              <div>
                <label className="text-[10px] font-medium text-white/30 uppercase tracking-wider block mb-1.5">
                  Bookmaker odds (optional)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={offeredOdds}
                    onChange={e => setOfferedOdds(parseFloat(e.target.value) || "")}
                    step="0.01"
                    min="1"
                    placeholder="e.g. 2.50"
                    className="w-36 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-teal-500/40"
                  />
                  <p className="text-xs text-white/30">decimal odds — AI will assess if it&#39;s value</p>
                </div>
              </div>
            </div>
          )}

          <button onClick={runAnalysis}
            disabled={
              loading
              || (mode === "specific" && (!homeTeam || !awayTeam))
              || ((mode === "recommendations" || mode === "acca" || mode === "upsets") && !hasUpcoming)
              || (mode === "custom" && !betDescription.trim())
              || (mode === "betslip" && !betSlipText.trim())
            }
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl disabled:opacity-40 text-sm font-bold transition-all ${
              mode === "acca"      ? "bg-purple-500 hover:bg-purple-400 text-white"
              : mode === "custom"    ? "bg-teal-500 hover:bg-teal-400 text-black"
              : mode === "upsets"   ? "bg-orange-500 hover:bg-orange-400 text-black"
              : mode === "simulator" ? "bg-yellow-500 hover:bg-yellow-400 text-black"
              : mode === "betslip"  ? "bg-cyan-500 hover:bg-cyan-400 text-black"
              : "bg-amber-500 hover:bg-amber-400 text-black"
            }`}>
            {loading
              ? <><Loader2 className="h-4 w-4 animate-spin" />{loadingLabel}</>
              : <>
                  {mode === "acca"      ? <Layers className="h-4 w-4" />
                  : mode === "custom"    ? <MessageSquare className="h-4 w-4" />
                  : mode === "upsets"   ? <Flame className="h-4 w-4" />
                  : mode === "simulator" ? <Trophy className="h-4 w-4" />
                  : mode === "betslip"  ? <Link className="h-4 w-4" />
                  : <Sparkles className="h-4 w-4" />}
                  {btnLabel}
                </>
            }
          </button>

          {(mode === "recommendations" || mode === "acca" || mode === "upsets") && !hasUpcoming && getFixturesForDate(pickedDate).length > 0 && (
            <p className="text-xs text-white/30">All matches on this date have already been played.</p>
          )}

          {loading && <p className="text-xs text-white/30 animate-pulse">Analysing form, head-to-head, squad quality, market odds…</p>}

          {error && (
            <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3">
              <p className="text-sm text-red-400">{error}</p>
              {error.toLowerCase().includes("key") && (
                <a href="/settings" className="text-xs text-amber-400 mt-1 hover:underline block">Update key in Settings →</a>
              )}
            </div>
          )}
        </div>
      </div>

      {acca && <AccaCard acca={acca} bankroll={Number(bankroll) || 0} />}

      {customResult && <CustomBetCard result={customResult} bankroll={Number(bankroll) || 0} />}

      {simResult && <SimulatorCard result={simResult} />}

      {upsetResult && <UpsetDetectorCard result={upsetResult} />}

      {betSlipResult && <BetSlipCard result={betSlipResult} bankroll={Number(bankroll) || 0} />}

      {results.length > 0 && (
        <div className="space-y-4">
          <p className="text-xs font-medium text-white/30 uppercase tracking-wider">
            {results.length} AI {results.length === 1 ? "Pick" : "Picks"} · {fmtShort(mode === "specific" ? matchDate : pickedDate)}
          </p>
          {results.map((analysis, i) => (
            <AnalysisCard key={i} analysis={analysis} bankroll={Number(bankroll) || 0} />
          ))}
        </div>
      )}
    </div>
  );
}
