"use client";

import { useState } from "react";
import { Trophy, ExternalLink } from "lucide-react";

interface Match {
  id: string;
  group: string;
  homeTeam: string;
  awayTeam: string;
  homeFlag: string;
  awayFlag: string;
  date: string;
  venue: string;
  status: "upcoming" | "live" | "finished";
  homeScore?: number;
  awayScore?: number;
  stage: string;
}

const GROUPS: Record<string, string[]> = {
  A: ["USA", "Bolivia", "Panama", "Morocco"],
  B: ["Mexico", "Ecuador", "Senegal", "New Zealand"],
  C: ["Canada", "Honduras", "Chile", "Ukraine"],
  D: ["Brazil", "Japan", "Cameroon", "Costa Rica"],
  E: ["Germany", "Australia", "Saudi Arabia", "Colombia"],
  F: ["Argentina", "Serbia", "Ghana", "Peru"],
  G: ["Spain", "Uruguay", "South Korea", "Nigeria"],
  H: ["France", "South Africa", "Belgium", "Guatemala"],
  I: ["England", "Iran", "Jamaica", "Czechia"],
  J: ["Portugal", "Tunisia", "Venezuela", "Egypt"],
  K: ["Netherlands", "DR Congo", "Paraguay", "El Salvador"],
  L: ["Italy", "Ivory Coast", "Turkey", "Trinidad & Tobago"],
};

const GROUP_FLAGS: Record<string, string> = {
  USA: "🇺🇸", Bolivia: "🇧🇴", Panama: "🇵🇦", Morocco: "🇲🇦",
  Mexico: "🇲🇽", Ecuador: "🇪🇨", Senegal: "🇸🇳", "New Zealand": "🇳🇿",
  Canada: "🇨🇦", Honduras: "🇭🇳", Chile: "🇨🇱", Ukraine: "🇺🇦",
  Brazil: "🇧🇷", Japan: "🇯🇵", Cameroon: "🇨🇲", "Costa Rica": "🇨🇷",
  Germany: "🇩🇪", Australia: "🇦🇺", "Saudi Arabia": "🇸🇦", Colombia: "🇨🇴",
  Argentina: "🇦🇷", Serbia: "🇷🇸", Ghana: "🇬🇭", Peru: "🇵🇪",
  Spain: "🇪🇸", Uruguay: "🇺🇾", "South Korea": "🇰🇷", Nigeria: "🇳🇬",
  France: "🇫🇷", "South Africa": "🇿🇦", Belgium: "🇧🇪", Guatemala: "🇬🇹",
  England: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", Iran: "🇮🇷", Jamaica: "🇯🇲", Czechia: "🇨🇿",
  Portugal: "🇵🇹", Tunisia: "🇹🇳", Venezuela: "🇻🇪", Egypt: "🇪🇬",
  Netherlands: "🇳🇱", "DR Congo": "🇨🇩", Paraguay: "🇵🇾", "El Salvador": "🇸🇻",
  Italy: "🇮🇹", "Ivory Coast": "🇨🇮", Turkey: "🇹🇷", "Trinidad & Tobago": "🇹🇹",
};

export default function FixturesPage() {
  const [activeGroup, setActiveGroup] = useState<string>("A");
  const [view, setView] = useState<"groups" | "table">("groups");

  const teams = GROUPS[activeGroup] || [];

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Fixtures</h1>
          <p className="text-sm text-white/40 mt-0.5">World Cup 2026 · 48 Teams · 12 Groups · Jun 11 – Jul 19</p>
        </div>
        <a href="https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/match-centre" target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white transition-colors">
          <ExternalLink className="h-3 w-3" /> FIFA Live
        </a>
      </div>

      {/* View toggle */}
      <div className="flex gap-1 bg-white/3 border border-white/8 rounded-xl p-1 w-fit">
        <button onClick={() => setView("groups")} className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${view === "groups" ? "bg-white/10 text-white" : "text-white/40 hover:text-white/60"}`}>
          Groups
        </button>
        <button onClick={() => setView("table")} className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${view === "table" ? "bg-white/10 text-white" : "text-white/40 hover:text-white/60"}`}>
          All Teams
        </button>
      </div>

      {view === "groups" ? (
        <div className="space-y-4">
          {/* Group selector */}
          <div className="flex gap-1.5 flex-wrap">
            {Object.keys(GROUPS).map(g => (
              <button key={g} onClick={() => setActiveGroup(g)}
                className={`w-9 h-9 rounded-lg text-sm font-bold transition-all ${activeGroup === g ? "bg-amber-500 text-black" : "bg-white/5 text-white/50 hover:bg-white/10 hover:text-white"}`}>
                {g}
              </button>
            ))}
          </div>

          {/* Group card */}
          <div className="rounded-2xl border border-white/8 overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-4 bg-white/3 border-b border-white/8">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/20">
                <Trophy className="h-4 w-4 text-amber-400" />
              </div>
              <h2 className="text-base font-semibold text-white">Group {activeGroup}</h2>
            </div>

            <div className="divide-y divide-white/5">
              {teams.map((team, i) => (
                <div key={team} className="flex items-center gap-4 px-5 py-3.5">
                  <span className="text-xs font-medium text-white/30 w-4">{i + 1}</span>
                  <span className="text-2xl">{GROUP_FLAGS[team] || "🏳️"}</span>
                  <span className="text-sm font-medium text-white/80">{team}</span>
                  <div className="ml-auto flex items-center gap-6 text-xs text-white/30">
                    <span>P 0</span>
                    <span>W 0</span>
                    <span>D 0</span>
                    <span>L 0</span>
                    <span className="font-medium text-white/50">Pts 0</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="px-5 py-3 border-t border-white/6 bg-white/2">
              <p className="text-[10px] text-white/25">Live standings update as matches are played. Check FIFA.com for real-time results.</p>
            </div>
          </div>

          {/* Fixtures placeholder */}
          <div className="rounded-2xl border border-white/8 bg-white/2 px-5 py-5">
            <p className="text-xs font-medium text-white/40 mb-3 uppercase tracking-wider">Group {activeGroup} Fixtures</p>
            <p className="text-sm text-white/30 leading-relaxed">
              Match schedule data updates in real-time on{" "}
              <a href="https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/match-centre" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">
                FIFA.com
              </a>{" "}
              and{" "}
              <a href="https://www.bbc.co.uk/sport/football/world-cup" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">
                BBC Sport
              </a>.
              Use the <strong className="text-white/50">Tips</strong> tab to log your predictions for upcoming games.
            </p>
          </div>
        </div>
      ) : (
        /* All teams grid */
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {Object.entries(GROUPS).map(([group, teams]) =>
            teams.map(team => (
              <div key={team} className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/3 px-4 py-3">
                <span className="text-xl">{GROUP_FLAGS[team] || "🏳️"}</span>
                <div>
                  <p className="text-sm font-medium text-white/80">{team}</p>
                  <p className="text-[10px] text-white/30">Group {group}</p>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
