import Anthropic from "@anthropic-ai/sdk";
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
      ? `User's current odds from Gamdom/Rollbit — Home: ${homeOdds ?? "?"}, Draw: ${drawOdds ?? "?"}, Away: ${awayOdds ?? "?"}`
      : "No odds provided — estimate typical market odds for this fixture.";

  return `You are an elite football betting analyst with deep knowledge of World Cup 2026. Analyse this match:

${homeTeam} vs ${awayTeam} on ${date}

${oddsCtx}
${bankroll ? `User bankroll: £${bankroll}` : ""}

Using your knowledge of these teams' World Cup 2026 performances, historical head-to-head records, squad quality, player strengths, and typical bookmaker odds for this type of fixture, provide a detailed expert analysis.

Respond in EXACTLY this JSON format (no markdown, just raw JSON):
{
  "match": "${homeTeam} vs ${awayTeam}",
  "homeTeam": "${homeTeam}",
  "awayTeam": "${awayTeam}",
  "date": "${date}",
  "summary": "2-3 sentence expert match preview",
  "homeWinProb": 45,
  "drawProb": 25,
  "awayWinProb": 30,
  "keyStats": [
    "Stat about home team form",
    "Stat about away team form",
    "Head-to-head fact",
    "Tournament context fact"
  ],
  "recommendedBet": {
    "market": "Match Result",
    "prediction": "Home Win",
    "reasoning": "Detailed reasoning for this pick",
    "confidence": "High"
  },
  "oddsFound": {
    "homeWin": 2.10,
    "draw": 3.40,
    "awayWin": 3.20,
    "source": "Rollbit / market average"
  },
  "expectedValue": 0.05,
  "kellyFraction": 0.08,
  "stakeRating": "High Stake",
  "stakeReasoning": "Why to stake high/medium/low/skip",
  "risksToConsider": [
    "Risk factor 1",
    "Risk factor 2"
  ]
}

Kelly Criterion: k = (p × (b) − (1−p)) / b where b = decimal_odds − 1. Use the odds for the recommended bet.
EV: (p × profit) − (1−p × stake). Express as fraction of stake.
stakeRating: "High Stake" if kelly > 0.08 AND confidence High, "Medium Stake" if kelly 0.04-0.08, "Low Stake" if kelly 0.01-0.04, "Skip" if kelly ≤ 0.`;
}

function buildRecommendationsPrompt() {
  return `You are an elite football betting analyst with deep knowledge of World Cup 2026. Today is ${new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}.

Using your knowledge of the World Cup 2026 group stage and knockout rounds, identify the 3 best value bets from upcoming matches. Consider team form, squad quality, head-to-head history, and typical market odds on Gamdom, Rollbit and mainstream bookmakers.

For each match return analysis in this EXACT JSON format. Respond with ONLY a JSON array, no markdown:
[
  {
    "match": "Team A vs Team B",
    "homeTeam": "Team A",
    "awayTeam": "Team B",
    "date": "YYYY-MM-DD",
    "summary": "2-3 sentence expert preview",
    "homeWinProb": 55,
    "drawProb": 22,
    "awayWinProb": 23,
    "keyStats": ["stat 1", "stat 2", "stat 3", "stat 4"],
    "recommendedBet": {
      "market": "Match Result",
      "prediction": "Home Win",
      "reasoning": "Detailed reasoning",
      "confidence": "High"
    },
    "oddsFound": {
      "homeWin": 1.95,
      "draw": 3.50,
      "awayWin": 3.80,
      "source": "Rollbit / Gamdom average"
    },
    "expectedValue": 0.07,
    "kellyFraction": 0.10,
    "stakeRating": "High Stake",
    "stakeReasoning": "Strong form, good value odds",
    "risksToConsider": ["risk 1", "risk 2"]
  }
]

Find 3 genuinely good value picks. Mark stakeRating "Skip" if odds are poor value. Include real odds you find.`;
}

async function runAgentLoop(prompt: string, apiKey: string): Promise<string> {
  const client = new Anthropic({ apiKey });
  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4000,
    messages: [{ role: "user", content: prompt }],
  });
  const textBlock = response.content.find((b) => b.type === "text");
  return textBlock?.type === "text" ? textBlock.text : "";
}

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  const jsonMatch = trimmed.match(/(\[[\s\S]*\]|\{[\s\S]*\})/);
  if (!jsonMatch) throw new Error("No JSON found in response");
  return JSON.parse(jsonMatch[0]);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { mode, homeTeam, awayTeam, date, homeOdds, drawOdds, awayOdds, bankroll, apiKey } = body;

    const key = apiKey || process.env.ANTHROPIC_API_KEY;
    if (!key) {
      return NextResponse.json({ error: "No API key provided." }, { status: 503 });
    }

    if (mode === "recommendations") {
      const text = await runAgentLoop(buildRecommendationsPrompt(), key);
      const tips = extractJson(text) as AnalysisResult[];
      return NextResponse.json({ tips, searchedAt: new Date().toISOString() });
    }

    if (!homeTeam || !awayTeam || !date) {
      return NextResponse.json({ error: "homeTeam, awayTeam and date are required" }, { status: 400 });
    }

    const text = await runAgentLoop(
      buildMatchPrompt(homeTeam, awayTeam, date, homeOdds, drawOdds, awayOdds, bankroll),
      key
    );
    const analysis = extractJson(text) as AnalysisResult;
    return NextResponse.json(analysis);
  } catch (err) {
    console.error("[analyse]", err);
    return NextResponse.json({ error: "Analysis failed. Check server logs." }, { status: 500 });
  }
}
