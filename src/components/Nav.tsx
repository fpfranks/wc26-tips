"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Lightbulb, Trophy, TrendingUp, Settings } from "lucide-react";

const links = [
  { href: "/",          label: "Dashboard",   icon: LayoutDashboard },
  { href: "/tips",      label: "Tips",        icon: Lightbulb },
  { href: "/tracker",   label: "Bet Tracker", icon: TrendingUp },
  { href: "/fixtures",  label: "Fixtures",    icon: Trophy },
  { href: "/settings",  label: "Settings",    icon: Settings },
];

export default function Nav() {
  const path = usePathname();
  return (
    <nav className="fixed left-0 top-0 h-full w-56 bg-[#0c1220] border-r border-white/6 flex flex-col z-40">
      <div className="px-5 py-5 border-b border-white/6">
        <div className="flex items-center gap-2.5">
          <span className="text-2xl">🏆</span>
          <div>
            <p className="text-sm font-bold text-white tracking-tight">WC26 Tips</p>
            <p className="text-[10px] text-amber-400/70 leading-none mt-0.5">Analysis · Tracker</p>
          </div>
        </div>
      </div>

      <div className="flex-1 px-3 py-4 space-y-0.5">
        {links.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? path === "/" : path.startsWith(href);
          return (
            <Link key={href} href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                active
                  ? "bg-amber-500/15 text-amber-400"
                  : "text-white/40 hover:text-white/80 hover:bg-white/5"
              }`}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              {label}
            </Link>
          );
        })}
      </div>

      <div className="px-5 py-4 border-t border-white/6">
        <p className="text-[10px] text-white/20 leading-relaxed">
          Odds from Gamdom &amp; Rollbit<br />
          For educational use only
        </p>
      </div>
    </nav>
  );
}
