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

export interface RecommendationsResult {
  tips: AnalysisResult[];
  searchedAt: string;
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

function buildRecommendationsPrompt() {
  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return `You are an elite football betting analyst with deep World Cup 2026 knowledge. Today is ${today}.

Find 3 best value betting opportunities from World Cup 2026 matches. Analyse team quality, form, head-to-head, and typical Gamdom/Rollbit odds.

Kelly formula: k = (p*(b-1)-(1-p))/(b-1) where b=decimal odds, p=win prob as decimal
EV: (p*(odds-1))-(1-p) as decimal
stakeRating: "High Stake" if kelly>0.08 AND High confidence, "Medium Stake" if kelly 0.04-0.08, "Low Stake" if kelly 0.01-0.04, "Skip" if kelly<=0

Return ONLY a valid JSON array, no markdown, no extra text:
[{"match":"Team A vs Team B","homeTeam":"Team A","awayTeam":"Team B","date":"2026-06-17","summary":"Expert 2-3 sentence preview","homeWinProb":55,"drawProb":22,"awayWinProb":23,"keyStats":["Key stat 1","Key stat 2","Key stat 3","Key stat 4"],"recommendedBet":{"market":"Match Result","prediction":"Home Win","reasoning":"Why this is value","confidence":"High"},"oddsFound":{"homeWin":1.95,"draw":3.50,"awayWin":3.80,"source":"Gamdom/Rollbit estimate"},"expectedValue":0.07,"kellyFraction":0.10,"stakeRating":"High Stake","stakeReasoning":"Strong value — underpriced team","risksToConsider":["Risk 1","Risk 2"]}]

Give 3 real World Cup 2026 fixtures with genuine analysis and value reasoning.`;
}

async function callAnthropic(prompt: string, apiKey: string): Promise<string> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Anthropic API ${response.status}: ${errText}`);
  }

  const data = (await response.json()) as {
    content: Array<{ type: string; text?: string }>;
  };
  const block = data.content.find((b) => b.type === "text");
  return block?.text ?? "";
}

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  const match = trimmed.match(/(\[[\s\S]*\]|\{[\s\S]*\})/);
  if (!match) throw new Error(`No JSON in response: ${trimmed.slice(0, 300)}`);
  return JSON.parse(match[0]);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { mode, homeTeam, awayTeam, date, homeOdds, drawOdds, awayOdds, bankroll, apiKey } =
      body;

    const key = apiKey || process.env.ANTHROPIC_API_KEY;
    if (!key) {
      return NextResponse.json({ error: "No API key. Add it in Settings." }, { status: 503 });
    }

    if (mode === "recommendations") {
      const text = await callAnthropic(buildRecommendationsPrompt(), key);
      const parsed = extractJson(text);
      const tips = Array.isArray(parsed) ? parsed : [parsed];
      return NextResponse.json({ tips, searchedAt: new Date().toISOString() });
    }

    if (!homeTeam || !awayTeam || !date) {
      return NextResponse.json(
        { error: "homeTeam, awayTeam and date are required" },
        { status: 400 }
      );
    }

    const text = await callAnthropic(
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
