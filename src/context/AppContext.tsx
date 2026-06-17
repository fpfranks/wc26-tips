"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

export type Platform = "Gamdom" | "Rollbit" | "Other";
export type BetStatus = "open" | "won" | "lost" | "void";
export type TipResult = "pending" | "won" | "lost" | "void";
export type SelectionResult = "pending" | "won" | "lost" | "void";

export interface BetSelection {
  match: string;
  market: string;
  prediction: string;
  odds: number;
  result: SelectionResult;
}

export interface Bet {
  id: string;
  type: "single" | "acca";
  label: string;
  selections: BetSelection[];
  stake: number;
  totalOdds: number;
  potentialReturn: number;
  platform: Platform;
  status: BetStatus;
  profit: number;
  notes: string;
  createdAt: number;
  settledAt?: number;
}

export interface Tip {
  id: string;
  match: string;
  homeTeam: string;
  awayTeam: string;
  date: string;
  market: string;
  prediction: string;
  confidence: number;
  homeWinProb: number;
  drawProb: number;
  awayWinProb: number;
  homeOdds: number;
  drawOdds: number;
  awayOdds: number;
  platform: Platform;
  analysis: string;
  result: TipResult;
  createdAt: number;
}

interface AppContextValue {
  bets: Bet[];
  tips: Tip[];
  addBet: (bet: Omit<Bet, "id" | "createdAt">) => void;
  updateBet: (id: string, updates: Partial<Bet>) => void;
  deleteBet: (id: string) => void;
  addTip: (tip: Omit<Tip, "id" | "createdAt">) => void;
  updateTip: (id: string, updates: Partial<Tip>) => void;
  deleteTip: (id: string) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

function genId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [bets, setBets] = useState<Bet[]>([]);
  const [tips, setTips] = useState<Tip[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const storedBets = localStorage.getItem("wc26-bets-v1");
      const storedTips = localStorage.getItem("wc26-tips-v1");
      if (storedBets) setBets(JSON.parse(storedBets));
      if (storedTips) setTips(JSON.parse(storedTips));
    } catch {}
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    localStorage.setItem("wc26-bets-v1", JSON.stringify(bets));
  }, [bets, loaded]);

  useEffect(() => {
    if (!loaded) return;
    localStorage.setItem("wc26-tips-v1", JSON.stringify(tips));
  }, [tips, loaded]);

  function addBet(bet: Omit<Bet, "id" | "createdAt">) {
    setBets(prev => [{ ...bet, id: genId(), createdAt: Date.now() }, ...prev]);
  }

  function updateBet(id: string, updates: Partial<Bet>) {
    setBets(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b));
  }

  function deleteBet(id: string) {
    setBets(prev => prev.filter(b => b.id !== id));
  }

  function addTip(tip: Omit<Tip, "id" | "createdAt">) {
    setTips(prev => [{ ...tip, id: genId(), createdAt: Date.now() }, ...prev]);
  }

  function updateTip(id: string, updates: Partial<Tip>) {
    setTips(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  }

  function deleteTip(id: string) {
    setTips(prev => prev.filter(t => t.id !== id));
  }

  return (
    <AppContext.Provider value={{ bets, tips, addBet, updateBet, deleteBet, addTip, updateTip, deleteTip }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
