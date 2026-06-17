import { NextRequest, NextResponse } from "next/server";

export interface BetSlipSelection {
  match: string;
  market: string;
  prediction: string;
  odds: number;
}

export interface BetSlipResult {
  url: string;
  selections: BetSlipSelection[];
  totalOdds: number | null;
  stake: number | null;
  probability: number | null;
  expectedValue: number | null;
  kellyFraction: number | null;
  verdict: "Value Bet" | "Fair" | "Poor Value" | "Cannot Analyse";
  stakeRating: "High Stake" | "Medium Stake" | "Low Stake" | "Skip" | "Unknown";
  reasoning: string;
  keyFactors: string[];
  risks: string[];
  couldReadPage: boolean;
}

async function tryFetch(url: string): Promise<{ text: string; ok: boolean }> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-GB,en;q=0.5",
      },
      signal: AbortSignal.timeout(8000),
    });
    const html = await res.text();
    return { text: extractUsefulText(html), ok: true };
  } catch {
    return { text: "", ok: false };
  }
}

function extractUsefulText(html: string): string {
  const ogTitle   = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']*)["']/i)?.[1] ?? "";
  const ogDesc    = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']*)["']/i)?.[1] ?? "";
  const twitterDesc = html.match(/<meta[^>]*name=["']twitter:description["'][^>]*content=["']([^"']*)["']/i)?.[1] ?? "";
  const title     = html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] ?? "";

  // Strip scripts/styles then get readable text
  const stripped = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, 2000);

  const parts = [ogTitle, ogDesc, twitterDesc, title, stripped].filter(Boolean);
  return parts.join("\n").slice(0, 3000);
}

function buildBetSlipPrompt(url: string, pageContent: string, pastedText: string, bankroll: number | null) {
  const contentSection = pastedText
    ? `USER-PASTED BET SLIP CONTENT:\n${pastedText}`
    : pageContent
    ? `PAGE CONTENT EXTRACTED FROM URL:\n${pageContent}`
    : `No page content available. URL only: ${url}`;

  return `You are an elite football betting analyst. A bettor on Gamdom/Rollbit has shared a bet slip link for you to analyse.

URL: ${url}
${contentSection}
${bankroll ? `Bettor's bankroll: £${bankroll}` : ""}

Your task:
1. Extract all bet selections from the content above (match, market, prediction, odds)
2. Calculate the combined odds (multiply all selection odds)
3. Estimate the true probability of the entire bet winning using your WC2026 knowledge
4. Assess whether this is value vs Gamdom/Rollbit pricing
5. Calculate EV = (probability/100 * (totalOdds - 1)) - (1 - probability/100)
6. Calculate Kelly k = (p*(totalOdds-1)-(1-p))/(totalOdds-1) where p = probability/100

stakeRating: "High Stake" if kelly>0.08 AND confident | "Medium Stake" 0.04-0.08 | "Low Stake" 0.01-0.04 | "Skip" if kelly≤0 | "Unknown" if you couldn't read the slip
verdict: "Value Bet" EV>0 | "Fair" EV≈0 | "Poor Value" EV<-0.02 | "Cannot Analyse" if no bet data found

If you cannot identify any selections from the content, set selections to [], totalOdds/probability/expectedValue/kellyFraction to null, verdict to "Cannot Analyse", stakeRating to "Unknown", and explain in reasoning.

IMPORTANT: Calculate ALL numbers yourself. Do not use placeholder values.

Return ONLY valid JSON, no markdown:
{
  "url": "${url}",
  "selections": [{"match": "<team A vs team B>", "market": "<e.g. Match Result>", "prediction": "<e.g. Team A Win>", "odds": <decimal>}],
  "totalOdds": <combined_odds_or_null>,
  "stake": <stake_if_visible_or_null>,
  "probability": <your_estimated_win_probability_0_to_100_or_null>,
  "expectedValue": <ev_decimal_or_null>,
  "kellyFraction": <kelly_decimal_or_null>,
  "verdict": "<Value Bet|Fair|Poor Value|Cannot Analyse>",
  "stakeRating": "<High Stake|Medium Stake|Low Stake|Skip|Unknown>",
  "reasoning": "<2-3 sentences on whether this bet has value — be specific about each selection>",
  "keyFactors": ["<factor 1>", "<factor 2>"],
  "risks": ["<risk 1>", "<risk 2>"]
}`;
}

async function callGroq(prompt: string, apiKey: string): Promise<string> {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 1024,
      temperature: 0.4,
    }),
  });
  if (!res.ok) throw new Error(`Groq ${res.status}: ${await res.text()}`);
  const data = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
  return data.choices?.[0]?.message?.content ?? "";
}

function extractJson(text: string): unknown {
  const stripped = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  const match = stripped.match(/(\{[\s\S]*\})/);
  if (!match) throw new Error(`No JSON in response: ${text.slice(0, 200)}`);
  return JSON.parse(match[0]);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { url: string; pastedText?: string; bankroll?: number; apiKey?: string };
    const { url, pastedText, bankroll, apiKey } = body;

    const key = apiKey || process.env.GROQ_API_KEY;
    if (!key) return NextResponse.json({ error: "No Groq API key. Add it in Settings." }, { status: 503 });
    if (!url) return NextResponse.json({ error: "URL is required" }, { status: 400 });

    // Try to fetch the page
    const { text: pageContent, ok: couldReadPage } = await tryFetch(url);

    const prompt = buildBetSlipPrompt(url, pageContent, pastedText ?? "", bankroll ?? null);
    const raw = await callGroq(prompt, key);
    const result = extractJson(raw) as BetSlipResult;
    result.couldReadPage = couldReadPage && pageContent.length > 100;

    return NextResponse.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[betslip]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
