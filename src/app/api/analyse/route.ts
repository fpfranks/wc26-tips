import { NextRequest, NextResponse } from "next/server";

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

export interface RecommendationsResult {
  tips: AnalysisResult[];
  searchedAt: string;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
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
      ? `Current odds from Gamdom/Rollbit — Home: ${homeOdds ?? "N/A"}, Draw: ${drawOdds ?? "N/A"}, Away: ${awayOdds ?? "N/A"}`
      : "No odds provided — use typical market odds based on team quality.";

  return `You are an elite football betting analyst with deep World Cup 2026 knowledge. Analyse this match and return ONLY valid JSON.

Match: ${homeTeam} vs ${awayTeam} on ${date}
${oddsCtx}
${bankroll ? `Bankroll: £${bankroll}` : ""}

Kelly formula: k = (p*(b-1)-(1-p))/(b-1) where b=decimal odds, p=win prob as decimal
EV: (p*(odds-1))-(1-p) as decimal
stakeRating: "High Stake" if kelly>0.08 AND High confidence, "Medium Stake" if kelly 0.04-0.08, "Low Stake" if kelly 0.01-0.04, "Skip" if kelly<=0

Return ONLY this JSON object, no markdown, no extra text:
{"match":"${homeTeam} vs ${awayTeam}","homeTeam":"${homeTeam}","awayTeam":"${awayTeam}","date":"${date}","summary":"Expert 2-3 sentence preview with key factors","homeWinProb":45,"drawProb":25,"awayWinProb":30,"keyStats":["Form stat","Squad quality","Head-to-head record","Tournament context"],"recommendedBet":{"market":"Match Result","prediction":"Home Win","reasoning":"Specific value reasoning","confidence":"High"},"oddsFound":{"homeWin":2.10,"draw":3.40,"awayWin":3.20,"source":"Gamdom/Rollbit estimate"},"expectedValue":0.05,"kellyFraction":0.08,"stakeRating":"High Stake","stakeReasoning":"Good edge with high confidence pick","risksToConsider":["Risk 1","Risk 2"]}`;
}

function buildRecommendationsPrompt(date: string) {
  return `You are an elite football betting analyst with deep World Cup 2026 knowledge. The date is ${fmtDate(date)}.

Find the 3 best value betting opportunities from World Cup 2026 matches on or around ${date}. Use the actual WC2026 fixture schedule. Analyse team quality, form, head-to-head, and typical Gamdom/Rollbit odds.

Kelly formula: k = (p*(b-1)-(1-p))/(b-1) where b=decimal odds, p=win prob as decimal
EV: (p*(odds-1))-(1-p) as decimal
stakeRating: "High Stake" if kelly>0.08 AND High confidence, "Medium Stake" if kelly 0.04-0.08, "Low Stake" if kelly 0.01-0.04, "Skip" if kelly<=0

Return ONLY a valid JSON array, no markdown, no extra text:
[{"match":"Team A vs Team B","homeTeam":"Team A","awayTeam":"Team B","date":"${date}","summary":"Expert 2-3 sentence preview","homeWinProb":55,"drawProb":22,"awayWinProb":23,"keyStats":["Key stat 1","Key stat 2","Key stat 3","Key stat 4"],"recommendedBet":{"market":"Match Result","prediction":"Home Win","reasoning":"Why this is value","confidence":"High"},"oddsFound":{"homeWin":1.95,"draw":3.50,"awayWin":3.80,"source":"Gamdom/Rollbit estimate"},"expectedValue":0.07,"kellyFraction":0.10,"stakeRating":"High Stake","stakeReasoning":"Strong value","risksToConsider":["Risk 1","Risk 2"]}]`;
}

function buildAccaPrompt(date: string) {
  return `You are an elite football betting analyst with deep World Cup 2026 knowledge. The date is ${fmtDate(date)}.

Build the best value accumulator (acca) bet for World Cup 2026 matches on ${date}. Pick 3 or 4 legs from matches actually scheduled on this date in WC2026. Each leg must be a high-confidence pick. Prefer match result or BTTS markets.

For each leg: use the actual WC2026 fixture and realistic decimal odds from Gamdom/Rollbit.
totalOdds = product of all leg odds.
For the acca EV and Kelly, treat it as a single bet: p = product of all win probabilities, b = totalOdds.
Kelly formula: k = (p*(b-1)-(1-p))/(b-1)
stakeRating: "High Stake" if kelly>0.06, "Medium Stake" if 0.03-0.06, "Low Stake" if 0.01-0.03, "Skip" if kelly<=0

Return ONLY this JSON object, no markdown, no extra text:
{"title":"WC2026 Treble — ${date}","summary":"2 sentence summary of why this acca has value","legs":[{"match":"Team A vs Team B","homeTeam":"Team A","awayTeam":"Team B","date":"${date}","market":"Match Result","prediction":"Team A Win","odds":1.75,"confidence":"High","reasoning":"Why this leg is confident"},{"match":"Team C vs Team D","homeTeam":"Team C","awayTeam":"Team D","date":"${date}","market":"Both Teams to Score","prediction":"Yes","odds":1.90,"confidence":"Medium","reasoning":"Both teams in good form offensively"},{"match":"Team E vs Team F","homeTeam":"Team E","awayTeam":"Team F","date":"${date}","market":"Match Result","prediction":"Team E Win","odds":2.10,"confidence":"High","reasoning":"Strong favourites at excellent odds"}],"totalOdds":6.97,"expectedValue":0.04,"kellyFraction":0.05,"stakeRating":"Medium Stake","stakeReasoning":"Reasonable acca value — keep stakes modest due to variance"}`;
}

async function callGroq(prompt: string, apiKey: string): Promise<string> {
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
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
    const { mode, homeTeam, awayTeam, date, homeOdds, drawOdds, awayOdds, bankroll, apiKey } =
      body;

    const key = apiKey || process.env.GROQ_API_KEY;
    if (!key) {
      return NextResponse.json({ error: "No API key. Add your free Groq key in Settings." }, { status: 503 });
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
