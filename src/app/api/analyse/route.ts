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
  bttsProb: number;        // Both Teams To Score %
  over25Prob: number;      // Over 2.5 Goals %
  predictedScore: string;  // e.g. "2-1"
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
    btts: number | null;
    over25: number | null;
    source: string;
  } | null;
  expectedValue: number | null;
  valueEdge: number | null;  // model prob minus bookmaker implied prob
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
  const hasOdds = homeOdds || drawOdds || awayOdds;
  const oddsCtx = hasOdds
    ? `Gamdom/Rollbit odds supplied — Home: ${homeOdds ?? "N/A"}, Draw: ${drawOdds ?? "N/A"}, Away: ${awayOdds ?? "N/A"}`
    : "No odds supplied — estimate realistic Gamdom/Rollbit decimal odds (these crypto books typically have 5-8% margin, slightly higher than Pinnacle).";

  return `You are an elite football betting quant analysing WC2026 for a bettor on Gamdom and Rollbit.

Match: ${homeTeam} vs ${awayTeam} on ${date}
${oddsCtx}
${bankroll ? `Bankroll: £${bankroll}` : ""}

Think like a value betting analyst. Identify market inefficiencies vs Gamdom/Rollbit pricing.

Kelly: k=(p*(b-1)-(1-p))/(b-1) — b=decimal odds, p=decimal probability
EV: (p*(odds-1))-(1-p) as decimal
valueEdge: (model prob of recommended bet) minus (1/offered odds) — positive means value
stakeRating: "High Stake" kelly>0.08 AND High confidence | "Medium Stake" 0.04-0.08 | "Low Stake" 0.01-0.04 | "Skip" <=0
Gamdom/Rollbit typical ranges: BTTS Yes 1.65-2.10, Over 2.5 Goals 1.70-2.20

Return ONLY this JSON object, no markdown:
{"match":"${homeTeam} vs ${awayTeam}","homeTeam":"${homeTeam}","awayTeam":"${awayTeam}","date":"${date}","summary":"2-3 sentence value-focused preview","homeWinProb":45,"drawProb":25,"awayWinProb":30,"bttsProb":52,"over25Prob":58,"predictedScore":"2-1","keyStats":["Form/recent results","Scoring record or xG tendency","Head-to-head record","Key tactical factor"],"recommendedBet":{"market":"Match Result","prediction":"Home Win","reasoning":"Why this beats Gamdom/Rollbit price","confidence":"High"},"oddsFound":{"homeWin":2.10,"draw":3.40,"awayWin":3.20,"btts":1.85,"over25":1.92,"source":"Gamdom/Rollbit estimate"},"expectedValue":0.05,"valueEdge":0.042,"kellyFraction":0.08,"stakeRating":"High Stake","stakeReasoning":"Edge vs Gamdom/Rollbit line","risksToConsider":["Risk 1","Risk 2"]}`;
}

function buildRecommendationsPrompt(date: string) {
  const fixtureCtx = getFixtureContext(date);
  const d = new Date(date).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  return `You are an elite football betting analyst. Today is ${d}.

CONFIRMED WC 2026 MATCHES ON ${date}:
${fixtureCtx}

Analyse ONLY the UPCOMING matches listed above (ignore any marked [RESULT]). Pick the best 3 value bets from these specific fixtures vs Gamdom/Rollbit pricing. Think like a quant — find market inefficiencies, not just winners.

Kelly: k=(p*(b-1)-(1-p))/(b-1), EV: (p*(odds-1))-(1-p), valueEdge: model_prob minus (1/offered_odds)
stakeRating: "High Stake" kelly>0.08 AND High | "Medium Stake" 0.04-0.08 | "Low Stake" 0.01-0.04 | "Skip" <=0
Gamdom/Rollbit typical: BTTS Yes 1.65-2.10, Over 2.5 Goals 1.70-2.20

Return ONLY a valid JSON array, no markdown:
[{"match":"Team A vs Team B","homeTeam":"Team A","awayTeam":"Team B","date":"${date}","summary":"Value-focused expert preview","homeWinProb":55,"drawProb":22,"awayWinProb":23,"bttsProb":60,"over25Prob":65,"predictedScore":"2-1","keyStats":["stat 1","stat 2","stat 3","stat 4"],"recommendedBet":{"market":"Match Result","prediction":"Home Win","reasoning":"Why this beats Gamdom/Rollbit","confidence":"High"},"oddsFound":{"homeWin":1.95,"draw":3.50,"awayWin":3.80,"btts":1.80,"over25":1.88,"source":"Gamdom/Rollbit"},"expectedValue":0.07,"valueEdge":0.05,"kellyFraction":0.10,"stakeRating":"High Stake","stakeReasoning":"Strong value vs Gamdom/Rollbit line","risksToConsider":["Risk 1","Risk 2"]}]`;
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

export interface SimulatorTeam {
  team: string;
  group: string;
  groupAdvance: number;   // % chance to advance from group
  roundOf16: number;      // % chance to reach R16
  quarterFinal: number;
  semiFinal: number;
  final: number;
  winner: number;
}

export interface SimulatorResult {
  topContenders: SimulatorTeam[];
  groupInsights: string[];
  upsetAlerts: string[];
  simulatedAt: string;
}

export interface UpsetPick {
  match: string;
  homeTeam: string;
  awayTeam: string;
  date: string;
  group: string;
  underdog: string;
  favorite: string;
  underdogWinProb: number;
  estimatedUnderdogOdds: number;
  fairOdds: number;
  valueEdgePct: number;
  reasoning: string;
  confidence: "High" | "Medium" | "Low";
}

export interface UpsetResult {
  date: string;
  picks: UpsetPick[];
  summary: string;
}

function buildSimulatorPrompt(fixtureContext: string) {
  return `You are a World Cup 2026 football quant. Simulate the remaining WC2026 tournament 10,000 times using your knowledge of team strength, form, Elo ratings and squad quality.

CURRENT WC2026 RESULTS AND UPCOMING FIXTURES:
${fixtureContext}

Based on current group standings (inferred from results above) and remaining matches, calculate each team's probability of reaching each knockout stage.

Focus on teams still in contention. For teams already eliminated or in very weak positions, you can omit or set their winner % to 0.

Return ONLY this JSON object, no markdown:
{"topContenders":[{"team":"Argentina","group":"Group J","groupAdvance":98,"roundOf16":90,"quarterFinal":72,"semiFinal":52,"final":34,"winner":22},{"team":"France","group":"Group I","groupAdvance":97,"roundOf16":88,"quarterFinal":68,"semiFinal":48,"final":30,"winner":18},{"team":"England","group":"Group L","groupAdvance":92,"roundOf16":82,"quarterFinal":60,"semiFinal":40,"final":24,"winner":14},{"team":"Brazil","group":"Group C","groupAdvance":80,"roundOf16":68,"quarterFinal":48,"semiFinal":30,"final":18,"winner":10},{"team":"Germany","group":"Group E","groupAdvance":96,"roundOf16":85,"quarterFinal":62,"semiFinal":42,"final":25,"winner":13},{"team":"Spain","group":"Group H","groupAdvance":75,"roundOf16":62,"quarterFinal":44,"semiFinal":28,"final":16,"winner":8},{"team":"Portugal","group":"Group K","groupAdvance":88,"roundOf16":74,"quarterFinal":52,"semiFinal":34,"final":20,"winner":10},{"team":"Netherlands","group":"Group F","groupAdvance":82,"roundOf16":70,"quarterFinal":50,"semiFinal":32,"final":18,"winner":9},{"team":"USA","group":"Group D","groupAdvance":94,"roundOf16":82,"quarterFinal":55,"semiFinal":35,"final":18,"winner":8},{"team":"Colombia","group":"Group K","groupAdvance":72,"roundOf16":58,"quarterFinal":38,"semiFinal":22,"final":12,"winner":6}],"groupInsights":["Key group stage observation 1","Key group stage observation 2","Surprise result or tight group"],"upsetAlerts":["Team that could cause an upset","Another potential shock"]}`;
}

function buildUpsetPrompt(date: string, fixtureContext: string) {
  const d = new Date(date).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
  return `You are a football betting quant specialising in finding underdog value on Gamdom and Rollbit.

TODAY'S WC2026 UPCOMING FIXTURES (${d}):
${fixtureContext}

For each upcoming match, assess whether the underdog has positive expected value vs typical Gamdom/Rollbit pricing.

Gamdom/Rollbit context: These crypto sportsbooks typically price heavy favourites at 1.25-1.50, medium favourites at 1.55-1.90, slight favourites at 1.90-2.20. Underdogs are often overpriced at 3.00+ when true probability is 28-35%.

Flag ONLY matches where the underdog (or draw) has genuine value — at least +5% edge vs estimated Gamdom/Rollbit odds. If no upsets have value, return an empty picks array.

Return ONLY this JSON object, no markdown:
{"date":"${date}","picks":[{"match":"Team A vs Team B","homeTeam":"Team A","awayTeam":"Team B","date":"${date}","group":"Group X","underdog":"Team B","favorite":"Team A","underdogWinProb":32,"estimatedUnderdogOdds":3.80,"fairOdds":3.12,"valueEdgePct":7.2,"reasoning":"Why Team B has genuine value here — tactical, form, or market mispricing reason","confidence":"Medium"}],"summary":"Overall assessment of today's upset opportunities vs Gamdom/Rollbit lines"}`;
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
    const body = await req.json() as {
      mode?: string; homeTeam?: string; awayTeam?: string; date?: string;
      homeOdds?: number; drawOdds?: number; awayOdds?: number; bankroll?: number;
      apiKey?: string; betDescription?: string; offeredOdds?: number;
    };
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

    if (mode === "simulator") {
      // Build full fixture context (all matches with results + upcoming)
      const allCtx = GROUP_FIXTURES.map((f) => {
        const result = f.homeScore !== undefined
          ? ` [${f.homeScore}-${f.awayScore}]`
          : " [UPCOMING]";
        return `- ${f.homeTeam} vs ${f.awayTeam} (${f.group}, ${f.date})${result}`;
      }).join("\n");
      const text = await callGroq(buildSimulatorPrompt(allCtx), key);
      const result = extractJson(text) as SimulatorResult;
      result.simulatedAt = new Date().toISOString();
      return NextResponse.json(result);
    }

    if (mode === "upsets") {
      const fixtureCtx = getFixtureContext(targetDate);
      if (fixtureCtx.includes("No group stage")) {
        return NextResponse.json({ date: targetDate, picks: [], summary: "No upcoming fixtures on this date." });
      }
      const upcomingCtx = GROUP_FIXTURES
        .filter((f) => f.date === targetDate && f.homeScore === undefined)
        .map((f) => `- ${f.homeTeam} vs ${f.awayTeam} (${f.group}) [UPCOMING]`)
        .join("\n");
      if (!upcomingCtx) {
        return NextResponse.json({ date: targetDate, picks: [], summary: "All matches on this date have already been played." });
      }
      const text = await callGroq(buildUpsetPrompt(targetDate, upcomingCtx), key);
      const result = extractJson(text) as UpsetResult;
      return NextResponse.json(result);
    }

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
