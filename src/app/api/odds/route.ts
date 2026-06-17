import { NextRequest, NextResponse } from "next/server";

// Bookmaker slugs to try on odds-api.io
const TARGET_BOOKS = ["rollbit", "gamdom", "betpanda", "betplay"];

export interface BookmakerOdds {
  name: string;
  slug: string;
  homeWin: number | null;
  draw: number | null;
  awayWin: number | null;
}

export interface OddsComparison {
  homeTeam: string;
  awayTeam: string;
  bookmakers: BookmakerOdds[];
  bestHomeWin: { name: string; odds: number } | null;
  bestDraw:    { name: string; odds: number } | null;
  bestAwayWin: { name: string; odds: number } | null;
  arbitrage: boolean;
  mismatchPct: number; // max % spread between best and worst odds for any outcome
  impliedProbSum: number; // sum of best implied probs — below 100% = arb
}

async function searchEvent(query: string, apiKey: string): Promise<string | null> {
  const url = `https://api.odds-api.io/v3/events/search?query=${encodeURIComponent(query)}&sport=football&apiKey=${apiKey}`;
  const res = await fetch(url, { next: { revalidate: 60 } });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Odds API search ${res.status}: ${t.slice(0, 200)}`);
  }
  const data = await res.json() as { events?: Array<{ id: string; name?: string }> };
  return data.events?.[0]?.id ?? null;
}

async function fetchOdds(eventId: string, apiKey: string) {
  const books = TARGET_BOOKS.join(",");
  const url = `https://api.odds-api.io/v3/odds?eventId=${eventId}&bookmakers=${books}&markets=h2h&apiKey=${apiKey}`;
  const res = await fetch(url, { next: { revalidate: 30 } });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Odds API odds ${res.status}: ${t.slice(0, 200)}`);
  }
  return res.json();
}

function parseOdds(rawData: unknown, homeTeam: string, awayTeam: string): OddsComparison {
  // Handle multiple possible response shapes from odds-api.io
  const data = rawData as Record<string, unknown>;
  const booksList: unknown[] = Array.isArray(data.bookmakers)
    ? data.bookmakers as unknown[]
    : Array.isArray(data.data)
    ? data.data as unknown[]
    : [];

  const bookmakers: BookmakerOdds[] = booksList.map((b) => {
    const bk = b as Record<string, unknown>;
    const slug = (bk.key ?? bk.slug ?? bk.bookmaker ?? "") as string;
    const name = (bk.title ?? bk.name ?? bk.bookmakerName ?? slug) as string;

    // Markets can be at different paths
    const markets: unknown[] = Array.isArray(bk.markets) ? bk.markets as unknown[]
      : Array.isArray((bk as Record<string, unknown>).odds) ? (bk as Record<string, unknown>).odds as unknown[]
      : [];

    const h2h = markets.find((m) => {
      const mk = m as Record<string, unknown>;
      return (mk.key ?? mk.market ?? mk.type ?? "") === "h2h"
        || (mk.key ?? mk.market ?? mk.type ?? "") === "1x2";
    }) as Record<string, unknown> | undefined;

    const outcomes: unknown[] = h2h
      ? (Array.isArray(h2h.outcomes) ? h2h.outcomes as unknown[] : [])
      : [];

    let homeWin: number | null = null;
    let draw:    number | null = null;
    let awayWin: number | null = null;

    outcomes.forEach((o) => {
      const oc = o as Record<string, unknown>;
      const nm  = ((oc.name ?? oc.key ?? oc.outcome ?? "") as string).toLowerCase();
      const prc = Number(oc.price ?? oc.odds ?? oc.value ?? 0) || null;
      if (nm === "home" || nm.includes(homeTeam.toLowerCase().split(" ")[0])) homeWin = prc;
      else if (nm === "draw" || nm === "x") draw = prc;
      else if (nm === "away" || nm.includes(awayTeam.toLowerCase().split(" ")[0])) awayWin = prc;
    });

    return { name: name || slug, slug, homeWin, draw, awayWin };
  }).filter((b) => b.homeWin !== null || b.draw !== null || b.awayWin !== null);

  // Compute best odds per outcome
  const bestHomeWin = bookmakers.reduce<{ name: string; odds: number } | null>((best, b) => {
    if (b.homeWin && (!best || b.homeWin > best.odds)) return { name: b.name, odds: b.homeWin };
    return best;
  }, null);
  const bestDraw = bookmakers.reduce<{ name: string; odds: number } | null>((best, b) => {
    if (b.draw && (!best || b.draw > best.odds)) return { name: b.name, odds: b.draw };
    return best;
  }, null);
  const bestAwayWin = bookmakers.reduce<{ name: string; odds: number } | null>((best, b) => {
    if (b.awayWin && (!best || b.awayWin > best.odds)) return { name: b.name, odds: b.awayWin };
    return best;
  }, null);

  // Implied probability sum (arbitrage if < 1.0)
  const impliedProbSum = (bestHomeWin ? 1 / bestHomeWin.odds : 0)
    + (bestDraw    ? 1 / bestDraw.odds    : 0)
    + (bestAwayWin ? 1 / bestAwayWin.odds : 0);

  const arbitrage = impliedProbSum < 1.0 && impliedProbSum > 0;

  // Mismatch: biggest % difference between best & worst odds for any outcome
  const spread = (vals: (number | null)[]) => {
    const nums = vals.filter((v): v is number => v !== null);
    if (nums.length < 2) return 0;
    return ((Math.max(...nums) - Math.min(...nums)) / Math.min(...nums)) * 100;
  };
  const mismatchPct = Math.max(
    spread(bookmakers.map((b) => b.homeWin)),
    spread(bookmakers.map((b) => b.draw)),
    spread(bookmakers.map((b) => b.awayWin)),
  );

  return {
    homeTeam, awayTeam, bookmakers,
    bestHomeWin, bestDraw, bestAwayWin,
    arbitrage, mismatchPct, impliedProbSum,
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { homeTeam: string; awayTeam: string; oddsApiKey?: string };
    const { homeTeam, awayTeam, oddsApiKey } = body;

    const key = oddsApiKey || process.env.ODDS_API_KEY;
    if (!key) {
      return NextResponse.json({ error: "No Odds API key. Sign up free at odds-api.io and add it in Settings." }, { status: 503 });
    }
    if (!homeTeam || !awayTeam) {
      return NextResponse.json({ error: "homeTeam and awayTeam required" }, { status: 400 });
    }

    const eventId = await searchEvent(`${homeTeam} ${awayTeam}`, key);
    if (!eventId) {
      // Try reversed
      const reversed = await searchEvent(`${awayTeam} ${homeTeam}`, key);
      if (!reversed) {
        return NextResponse.json({ error: `Match "${homeTeam} vs ${awayTeam}" not found on Odds API. It may not be listed yet.` }, { status: 404 });
      }
    }

    const finalId = eventId ?? await searchEvent(`${awayTeam} ${homeTeam}`, key);
    if (!finalId) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    const rawData = await fetchOdds(finalId, key);
    const comparison = parseOdds(rawData, homeTeam, awayTeam);

    if (comparison.bookmakers.length === 0) {
      return NextResponse.json({
        error: "None of Rollbit/Gamdom/BetPanda/Betplay have odds listed for this match yet.",
        homeTeam, awayTeam, bookmakers: [], bestHomeWin: null, bestDraw: null, bestAwayWin: null,
        arbitrage: false, mismatchPct: 0, impliedProbSum: 0,
      });
    }

    return NextResponse.json(comparison);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[odds]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
