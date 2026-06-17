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

function buildBetSlipPrompt(url: string, pastedText: string, bankroll: number | null) {
  return `You are an elite football betting analyst. Analyse this bet slip from Gamdom/Rollbit.

BET SLIP:
${pastedText}
${url && url !== "not provided" ? `Reference URL: ${url}` : ""}
${bankroll ? `Bankroll: £${bankroll}` : ""}

Tasks:
1. Read every selection (match, market, prediction, odds)
2. Multiply all odds together for totalOdds
3. Estimate probability the entire bet wins using WC2026 knowledge
4. EV = (p * (totalOdds - 1)) - (1 - p)  where p = probability / 100
5. Kelly k = (p * (totalOdds - 1) - (1 - p)) / (totalOdds - 1)
6. stakeRating: "High Stake" kelly>0.08 | "Medium Stake" 0.04-0.08 | "Low Stake" 0.01-0.04 | "Skip" kelly<=0
7. verdict: "Value Bet" EV>0 | "Fair" EV near 0 | "Poor Value" EV<-0.02

Compute all numbers yourself. Return ONLY this JSON on one line, no markdown, no extra text:
{"url":"${url.replace(/"/g, "'")}","selections":[{"match":"Team A vs Team B","market":"Match Result","prediction":"Team A Win","odds":1.65}],"totalOdds":2.97,"stake":null,"probability":38,"expectedValue":0.04,"kellyFraction":0.05,"verdict":"Value Bet","stakeRating":"Medium Stake","reasoning":"Your specific analysis here.","keyFactors":["Factor 1","Factor 2"],"risks":["Risk 1","Risk 2"]}`;
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
  if (!match) throw new Error(`No JSON found in AI response: ${text.slice(0, 200)}`);
  let raw = match[0];
  // Common AI JSON issues: trailing commas before } or ]
  raw = raw.replace(/,\s*([}\]])/g, "$1");
  return JSON.parse(raw);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { url: string; pastedText?: string; bankroll?: number; apiKey?: string };
    const { url, pastedText, bankroll, apiKey } = body;

    const key = apiKey || process.env.GROQ_API_KEY;
    if (!key) return NextResponse.json({ error: "No Groq API key. Add it in Settings." }, { status: 503 });
    if (!pastedText) return NextResponse.json({ error: "Paste your bet slip selections first." }, { status: 400 });

    const prompt = buildBetSlipPrompt(url || "not provided", pastedText ?? "", bankroll ?? null);
    const raw = await callGroq(prompt, key);
    const result = extractJson(raw) as BetSlipResult;
    result.couldReadPage = false;

    return NextResponse.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[betslip]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
