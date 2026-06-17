export interface Fixture {
  date: string; // YYYY-MM-DD
  homeTeam: string;
  awayTeam: string;
  group: string;
  homeScore?: number;
  awayScore?: number;
}

// All 48 group stage matches — WC 2026
// Results included for matches already played (up to June 16)
export const GROUP_FIXTURES: Fixture[] = [
  // ── Group A ──
  { date: "2026-06-11", homeTeam: "Mexico",       awayTeam: "South Africa", group: "Group A", homeScore: 2, awayScore: 0 },
  { date: "2026-06-11", homeTeam: "South Korea",  awayTeam: "Czechia",      group: "Group A", homeScore: 2, awayScore: 1 },
  { date: "2026-06-18", homeTeam: "Czechia",      awayTeam: "South Africa", group: "Group A" },
  { date: "2026-06-18", homeTeam: "Mexico",       awayTeam: "South Korea",  group: "Group A" },
  { date: "2026-06-24", homeTeam: "Czechia",      awayTeam: "Mexico",       group: "Group A" },
  { date: "2026-06-24", homeTeam: "South Africa", awayTeam: "South Korea",  group: "Group A" },

  // ── Group B ──
  { date: "2026-06-12", homeTeam: "Canada",               awayTeam: "Bosnia and Herzegovina", group: "Group B", homeScore: 1, awayScore: 1 },
  { date: "2026-06-13", homeTeam: "Qatar",                awayTeam: "Switzerland",            group: "Group B", homeScore: 1, awayScore: 1 },
  { date: "2026-06-18", homeTeam: "Switzerland",          awayTeam: "Bosnia and Herzegovina", group: "Group B" },
  { date: "2026-06-18", homeTeam: "Canada",               awayTeam: "Qatar",                  group: "Group B" },
  { date: "2026-06-24", homeTeam: "Switzerland",          awayTeam: "Canada",                 group: "Group B" },
  { date: "2026-06-24", homeTeam: "Bosnia and Herzegovina", awayTeam: "Qatar",                group: "Group B" },

  // ── Group C ──
  { date: "2026-06-13", homeTeam: "Brazil",  awayTeam: "Morocco",  group: "Group C", homeScore: 1, awayScore: 1 },
  { date: "2026-06-13", homeTeam: "Haiti",   awayTeam: "Scotland", group: "Group C", homeScore: 0, awayScore: 1 },
  { date: "2026-06-19", homeTeam: "Scotland", awayTeam: "Morocco", group: "Group C" },
  { date: "2026-06-19", homeTeam: "Brazil",  awayTeam: "Haiti",    group: "Group C" },
  { date: "2026-06-24", homeTeam: "Scotland", awayTeam: "Brazil",  group: "Group C" },
  { date: "2026-06-24", homeTeam: "Morocco", awayTeam: "Haiti",    group: "Group C" },

  // ── Group D ──
  { date: "2026-06-12", homeTeam: "USA",       awayTeam: "Paraguay", group: "Group D", homeScore: 4, awayScore: 1 },
  { date: "2026-06-13", homeTeam: "Australia", awayTeam: "Turkiye",  group: "Group D", homeScore: 2, awayScore: 0 },
  { date: "2026-06-19", homeTeam: "USA",       awayTeam: "Australia", group: "Group D" },
  { date: "2026-06-19", homeTeam: "Turkiye",   awayTeam: "Paraguay",  group: "Group D" },
  { date: "2026-06-25", homeTeam: "Turkiye",   awayTeam: "USA",       group: "Group D" },
  { date: "2026-06-25", homeTeam: "Paraguay",  awayTeam: "Australia", group: "Group D" },

  // ── Group E ──
  { date: "2026-06-14", homeTeam: "Germany",     awayTeam: "Curacao",  group: "Group E", homeScore: 7, awayScore: 1 },
  { date: "2026-06-14", homeTeam: "Ivory Coast", awayTeam: "Ecuador",  group: "Group E", homeScore: 1, awayScore: 0 },
  { date: "2026-06-20", homeTeam: "Germany",     awayTeam: "Ivory Coast", group: "Group E" },
  { date: "2026-06-20", homeTeam: "Ecuador",     awayTeam: "Curacao",     group: "Group E" },
  { date: "2026-06-25", homeTeam: "Ecuador",     awayTeam: "Germany",     group: "Group E" },
  { date: "2026-06-25", homeTeam: "Curacao",     awayTeam: "Ivory Coast", group: "Group E" },

  // ── Group F ──
  { date: "2026-06-14", homeTeam: "Netherlands", awayTeam: "Japan",   group: "Group F", homeScore: 2, awayScore: 2 },
  { date: "2026-06-14", homeTeam: "Sweden",      awayTeam: "Tunisia", group: "Group F", homeScore: 5, awayScore: 1 },
  { date: "2026-06-20", homeTeam: "Netherlands", awayTeam: "Sweden",  group: "Group F" },
  { date: "2026-06-20", homeTeam: "Tunisia",     awayTeam: "Japan",   group: "Group F" },
  { date: "2026-06-25", homeTeam: "Japan",       awayTeam: "Sweden",  group: "Group F" },
  { date: "2026-06-25", homeTeam: "Tunisia",     awayTeam: "Netherlands", group: "Group F" },

  // ── Group G ──
  { date: "2026-06-15", homeTeam: "Iran",        awayTeam: "New Zealand", group: "Group G", homeScore: 2, awayScore: 2 },
  { date: "2026-06-15", homeTeam: "Belgium",     awayTeam: "Egypt",       group: "Group G", homeScore: 1, awayScore: 1 },
  { date: "2026-06-21", homeTeam: "Belgium",     awayTeam: "Iran",        group: "Group G" },
  { date: "2026-06-21", homeTeam: "New Zealand", awayTeam: "Egypt",       group: "Group G" },
  { date: "2026-06-26", homeTeam: "Egypt",       awayTeam: "Iran",        group: "Group G" },
  { date: "2026-06-26", homeTeam: "New Zealand", awayTeam: "Belgium",     group: "Group G" },

  // ── Group H ──
  { date: "2026-06-15", homeTeam: "Spain",        awayTeam: "Cape Verde", group: "Group H", homeScore: 0, awayScore: 0 },
  { date: "2026-06-15", homeTeam: "Saudi Arabia", awayTeam: "Uruguay",    group: "Group H", homeScore: 1, awayScore: 1 },
  { date: "2026-06-21", homeTeam: "Spain",        awayTeam: "Saudi Arabia", group: "Group H" },
  { date: "2026-06-21", homeTeam: "Uruguay",      awayTeam: "Cape Verde",   group: "Group H" },
  { date: "2026-06-26", homeTeam: "Cape Verde",   awayTeam: "Saudi Arabia", group: "Group H" },
  { date: "2026-06-26", homeTeam: "Uruguay",      awayTeam: "Spain",        group: "Group H" },

  // ── Group I ──
  { date: "2026-06-16", homeTeam: "France",  awayTeam: "Senegal", group: "Group I", homeScore: 3, awayScore: 1 },
  { date: "2026-06-16", homeTeam: "Iraq",    awayTeam: "Norway",  group: "Group I", homeScore: 1, awayScore: 4 },
  { date: "2026-06-22", homeTeam: "France",  awayTeam: "Iraq",    group: "Group I" },
  { date: "2026-06-22", homeTeam: "Norway",  awayTeam: "Senegal", group: "Group I" },
  { date: "2026-06-26", homeTeam: "Norway",  awayTeam: "France",  group: "Group I" },
  { date: "2026-06-26", homeTeam: "Senegal", awayTeam: "Iraq",    group: "Group I" },

  // ── Group J ──
  { date: "2026-06-16", homeTeam: "Argentina", awayTeam: "Algeria", group: "Group J", homeScore: 3, awayScore: 0 },
  { date: "2026-06-16", homeTeam: "Austria",   awayTeam: "Jordan",  group: "Group J", homeScore: 3, awayScore: 1 },
  { date: "2026-06-22", homeTeam: "Argentina", awayTeam: "Austria", group: "Group J" },
  { date: "2026-06-22", homeTeam: "Jordan",    awayTeam: "Algeria", group: "Group J" },
  { date: "2026-06-27", homeTeam: "Algeria",   awayTeam: "Austria", group: "Group J" },
  { date: "2026-06-27", homeTeam: "Jordan",    awayTeam: "Argentina", group: "Group J" },

  // ── Group K ──
  { date: "2026-06-17", homeTeam: "Portugal",                   awayTeam: "DR Congo",   group: "Group K" },
  { date: "2026-06-17", homeTeam: "Uzbekistan",                 awayTeam: "Colombia",   group: "Group K" },
  { date: "2026-06-23", homeTeam: "Portugal",                   awayTeam: "Uzbekistan", group: "Group K" },
  { date: "2026-06-23", homeTeam: "Colombia",                   awayTeam: "DR Congo",   group: "Group K" },
  { date: "2026-06-27", homeTeam: "Colombia",                   awayTeam: "Portugal",   group: "Group K" },
  { date: "2026-06-27", homeTeam: "DR Congo",                   awayTeam: "Uzbekistan", group: "Group K" },

  // ── Group L ──
  { date: "2026-06-17", homeTeam: "England", awayTeam: "Croatia", group: "Group L" },
  { date: "2026-06-17", homeTeam: "Ghana",   awayTeam: "Panama",  group: "Group L" },
  { date: "2026-06-23", homeTeam: "England", awayTeam: "Ghana",   group: "Group L" },
  { date: "2026-06-23", homeTeam: "Panama",  awayTeam: "Croatia", group: "Group L" },
  { date: "2026-06-27", homeTeam: "Panama",  awayTeam: "England", group: "Group L" },
  { date: "2026-06-27", homeTeam: "Croatia", awayTeam: "Ghana",   group: "Group L" },
];

// Knockout round date ranges (teams TBD based on group results)
export const KNOCKOUT_DATES: Record<string, string> = {
  "Round of 32":  "June 28 – July 3",
  "Round of 16":  "July 4 – 7",
  "Quarter-finals": "July 9 – 11",
  "Semi-finals":  "July 14 – 15",
  "Third Place":  "July 18",
  "Final":        "July 19",
};

export function getFixturesForDate(date: string): Fixture[] {
  return GROUP_FIXTURES.filter((f) => f.date === date);
}

export function isPlayed(f: Fixture): boolean {
  return f.homeScore !== undefined && f.awayScore !== undefined;
}
