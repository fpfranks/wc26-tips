import { NextRequest, NextResponse } from "next/server";
import { GROUP_FIXTURES } from "@/data/fixtures";

export interface AnalysisResult {
  match: string;
  homeTeam: string;
  awayTeam: string;
  date: string;
  summary: string;
  homeWinProb: number;
  drawProb: number;
  awayWinProb: number;
  keyStats: string[];
  recommendedBet: {
    market: string;
    prediction: string;
    reasoning: string;
    confidence: "High" | "Medium" | "Low";
  };
  oddsFound: {
    homeWin: number;
    draw: number;
    awayWin: number;
    source: string;
  } | null;
  expectedValue: number | null;
  kellyFraction: number | null;
  stakeRating: "High Stake" | "Medium Stake" | "Low Stake" | "Skip";
  stakeReasoning: string;
  risksToConsider: string[];
}

export interface AccaLeg {
  match: string;
  homeTeam: string;
  awayTeam: string;
  date: string;
  market: string;
  prediction: string;
  odds: number;
  confidence: "High" | "Medium" | "Low";
  reasoning: string;
}

export interface AccaResult {
  title: string;
  summary: string;
  legs: AccaLeg[];
  totalOdds: number;
  expectedValue: number;
  kellyFraction: number;
  stakeRating: "High Stake" | "Medium Stake" | "Low Stake" | "Skip";
  stakeReasoning: string;
}

function getFixtureContext(date: string): string {
  const fixtures = GROUP_FIXTURES.filter((f) => f.date === date);
  if (fixtures.length === 0) return "No group stage matches scheduled on this date (may be a knockout round).";
  return fixtures
    .map((f) => {
      const result =
        f.homeScore !== undefined ? ` [RESULT: ${f.homeScore}-${f.awayScore}]` : " [UPCOMING]";
      return `- ${f.homeTeam} vs ${f.awayTeam} (${f.group})${result}`;
    })
    .join("\n");
}

function buildMatchPrompt(
  homeTeam: string,
  awayTeam: string,
  date: string,
  homeOdds?: number,
  drawOdds?: number,
  awayOdds?: number,
  bankroll?: number
) {
  const oddsCtx =
    homeOdds || drawOdds || awayOdds
      ? `Odds from Gamdom/Rollbit — Home: ${homeOdds ?? "N/A"}, Draw: ${drawOdds ?? "N/A"}, Away: ${awayOdds ?? "N/A"}`
      : "No odds provided — estimate typical market odds based on team quality.";

  return `You are an elite football betting analyst. Analyse this World Cup 2026 match.

Match: ${homeTeam} vs ${awayTeam} on ${date}
${oddsCtx}
${bankroll ? `Bankroll: £${bankroll}` : ""}

Kelly formula: k = (p*(b-1)-(1-p))/(b-1) where b=decimal odds, p=win prob as decimal
EV: (p*(odds-1))-(1-p) as decimal
stakeRating: "High Stake" if kelly>0.08 AND High confidence, "Medium Stake" if 0.04-0.08, "Low Stake" if 0.01-0.04, "Skip" if <=0

Return ONLY this JSON object, no markdown:
{"match":"${homeTeam} vs ${awayTeam}","homeTeam":"${homeTeam}","awayTeam":"${awayTeam}","date":"${date}","summary":"2-3 sentence expert preview","homeWinProb":45,"drawProb":25,"awayWinProb":30,"keyStats":["Form stat","Squad quality","Head-to-head","Tournament context"],"recommendedBet":{"market":"Match Result","prediction":"Home Win","reasoning":"Value reasoning","confidence":"High"},"oddsFound":{"homeWin":2.10,"draw":3.40,"awayWin":3.20,"source":"Gamdom/Rollbit estimate"},"expectedValue":0.05,"kellyFraction":0.08,"stakeRating":"High Stake","stakeReasoning":"Good edge","risksToConsider":["Risk 1","Risk 2"]}`;
}

function buildRecommendationsPrompt(date: string) {
  const fixtureCtx = getFixtureContext(date);
  const d = new Date(date).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  return `You are an elite football betting analyst. Today is ${d}.

CONFIRMED WC 2026 MATCHES ON ${date}:
${fixtureCtx}

Analyse ONLY the UPCOMING matches listed above (ignore any marked [RESULT]). Pick the best 3 value bets from these specific fixtures. Use real team quality, form, head-to-head history and typical Gamdom/Rollbit odds.

Kelly: k = (p*(b-1)-(1-p))/(b-1), EV: (p*(odds-1))-(1-p)
stakeRating: "High Stake" if kelly>0.08 AND High, "Medium Stake" 0.04-0.08, "Low Stake" 0.01-0.04, "Skip" <=0

Return ONLY a valid JSON array, no markdown:
[{"match":"Team A vs Team B","homeTeam":"Team A","awayTeam":"Team B","date":"${date}","summary":"Expert preview","homeWinProb":55,"drawProb":22,"awayWinProb":23,"keyStats":["stat 1","stat 2","stat 3","stat 4"],"recommendedBet":{"market":"Match Result","prediction":"Home Win","reasoning":"Why this is value","confidence":"High"},"oddsFound":{"homeWin":1.95,"draw":3.50,"awayWin":3.80,"source":"Gamdom/Rollbit"},"expectedValue":0.07,"kellyFraction":0.10,"stakeRating":"High Stake","stakeReasoning":"Strong value","risksToConsider":["Risk 1","Risk 2"]}]`;
}

export interface CustomBetResult {
  betDescription: string;
  probability: number;        // 0–100
  fairOdds: number;           // decimal odds implied by probability
  offeredOdds: number | null; // odds the user entered
  expectedValue: number | null;
  kellyFraction: number | null;
  stakeRating: "High Stake" | "Medium Stake" | "Low Stake" | "Skip" | "No odds provided";
  verdict: "Value Bet" | "Fair" | "Poor Value" | "No odds provided";
  reasoning: string;
  keyFactors: string[];
  risks: string[];
}

function buildCustomBetPrompt(betDescription: string, offeredOdds: number | null, bankroll: number | null) {
  const oddsLine = offeredOdds
    ? `The bookmaker (Gamdom/Rollbit/BetPanda/Betplay) is offering decimal odds of ${offeredOdds} for this bet.`
    : "No bookmaker odds have been provided — just estimate the probability and fair odds.";

  return `You are an elite football betting analyst with deep World Cup 2026 knowledge. Today is ${new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}.

A punter wants to evaluate this bet:
"${betDescription}"

${oddsLine}
${bankroll ? `Punter's bankroll: £${bankroll}` : ""}

Your job:
1. Estimate the true probability (%) of this bet winning based on your WC2026 knowledge
2. Calculate fair decimal odds = 100 / probability
3. If offered odds are given: calculate EV = (p*(offeredOdds-1)) - (1-p) and Kelly k = (p*(offeredOdds-1)-(1-p))/(offeredOdds-1)
4. Give a clear verdict: is this value?

stakeRating rules (only when odds provided):
- "High Stake" if kelly > 0.08 AND probability confidence is high
- "Medium Stake" if kelly 0.04–0.08
- "Low Stake" if kelly 0.01–0.04
- "Skip" if kelly ≤ 0 (negative EV)
- "No odds provided" if no odds given

verdict: "Value Bet" if EV > 0, "Fair" if EV ≈ 0 (within ±2%), "Poor Value" if EV < -0.02, "No odds provided" if no odds given

Return ONLY this JSON object, no markdown:
{"betDescription":"${betDescription}","probability":62,"fairOdds":1.61,"offeredOdds":${offeredOdds ?? null},"expectedValue":${offeredOdds ? "0.05" : null},"kellyFraction":${offeredOdds ? "0.08" : null},"stakeRating":"${offeredOdds ? "Medium Stake" : "No odds provided"}","verdict":"${offeredOdds ? "Value Bet" : "No odds provided"}","reasoning":"Clear 2-3 sentence explanation of why this probability is right and whether the odds represent value","keyFactors":["Factor supporting this probability","Another key factor","Third factor"],"risks":["Main risk to this bet","Second risk"]}`;
}

function buildAccaPrompt(date: string) {
  const fixtureCtx = getFixtureContext(date);
  const d = new Date(date).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  return `You are an elite football betting analyst. Today is ${d}.

CONFIRMED WC 2026 MATCHES ON ${date}:
${fixtureCtx}

Build the best accumulator using ONLY the UPCOMING matches above (ignore [RESULT] ones). Pick 3-4 legs with high confidence. Use realistic Gamdom/Rollbit decimal odds.

totalOdds = product of all leg odds.
For acca EV/Kelly: p = product of win probabilities, b = totalOdds.
Kelly: k = (p*(b-1)-(1-p))/(b-1)
stakeRating: "High Stake" if kelly>0.06, "Medium Stake" 0.03-0.06, "Low Stake" 0.01-0.03, "Skip" <=0

Return ONLY this JSON object, no markdown:
{"title":"WC2026 Acca — ${date}","summary":"Why this acca has value","legs":[{"match":"Team A vs Team B","homeTeam":"Team A","awayTeam":"Team B","date":"${date}","market":"Match Result","prediction":"Team A Win","odds":1.75,"confidence":"High","reasoning":"Why confident"},{"match":"Team C vs Team D","homeTeam":"Team C","awayTeam":"Team D","date":"${date}","market":"Both Teams to Score","prediction":"Yes","odds":1.90,"confidence":"Medium","reasoning":"Both teams in form offensively"},{"match":"Team E vs Team F","homeTeam":"Team E","awayTeam":"Team F","date":"${date}","market":"Match Result","prediction":"Draw","odds":3.20,"confidence":"Medium","reasoning":"Even matchup"}],"totalOdds":10.64,"expectedValue":0.03,"kellyFraction":0.04,"stakeRating":"Low Stake","stakeReasoning":"Modest value — keep stakes small on accas"}`;
}

async function callGroq(prompt: string, apiKey: string): Promise<string> {
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 2048,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Groq API ${response.status}: ${errText}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return data.choices?.[0]?.message?.content ?? "";
}

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  const stripped = trimmed.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  const match = stripped.match(/(\[[\s\S]*\]|\{[\s\S]*\})/);
  if (!match) throw new Error(`No JSON in response: ${trimmed.slice(0, 300)}`);
  return JSON.parse(match[0]);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { mode, homeTeam, awayTeam, date, homeOdds, drawOdds, awayOdds, bankroll, apiKey,
            betDescription, offeredOdds } = body;

    const key = apiKey || process.env.GROQ_API_KEY;
    if (!key) {
      return NextResponse.json(
        { error: "No API key. Add your free Groq key in Settings." },
        { status: 503 }
      );
    }

    const targetDate = date || new Date().toISOString().slice(0, 10);

    if (mode === "recommendations") {
      const text = await callGroq(buildRecommendationsPrompt(targetDate), key);
      const parsed = extractJson(text);
      const tips = Array.isArray(parsed) ? parsed : [parsed];
      return NextResponse.json({ tips, searchedAt: new Date().toISOString() });
    }

    if (mode === "acca") {
      const text = await callGroq(buildAccaPrompt(targetDate), key);
      const acca = extractJson(text) as AccaResult;
      return NextResponse.json(acca);
    }

    if (mode === "custom") {
      if (!betDescription) {
        return NextResponse.json({ error: "betDescription is required" }, { status: 400 });
      }
      const text = await callGroq(
        buildCustomBetPrompt(betDescription, offeredOdds ?? null, bankroll ?? null),
        key
      );
      const result = extractJson(text) as CustomBetResult;
      return NextResponse.json(result);
    }

    if (!homeTeam || !awayTeam || !date) {
      return NextResponse.json(
        { error: "homeTeam, awayTeam and date are required" },
        { status: 400 }
      );
    }

    const text = await callGroq(
      buildMatchPrompt(homeTeam, awayTeam, date, homeOdds, drawOdds, awayOdds, bankroll),
      key
    );
    const analysis = extractJson(text) as AnalysisResult;
    return NextResponse.json(analysis);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[analyse]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
