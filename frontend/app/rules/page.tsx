"use client";

import React, { useState } from "react";
import Navbar from "@/components/Navbar";
import { 
  BookOpen, 
  Search, 
  ChevronRight, 
  HelpCircle, 
  Award, 
  TrendingUp, 
  Scale, 
  Lock, 
  ShieldAlert,
  Building,
  DollarSign,
  Sparkles
} from "lucide-react";

import { RULES_DATA, RuleSection } from "@/lib/rules-data";

export default function RulesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [rulesActiveSectionId, setRulesActiveSectionId] = useState("objective");

  const getRuleIcon = (iconName: string) => {
    switch (iconName) {
      case "winning":
        return <Award className="h-4 w-4 text-accent" />;
      case "setup":
        return <HelpCircle className="h-4 w-4 text-accent" />;
      case "turn-flow":
        return <TrendingUp className="h-4 w-4 text-accent" />;
      case "buying":
      case "houses":
      case "hotels":
        return <Building className="h-4 w-4 text-accent" />;
      case "rent":
        return <DollarSign className="h-4 w-4 text-accent" />;
      case "districts":
      case "auctions":
      case "trading":
        return <Scale className="h-4 w-4 text-accent" />;
      case "mortgages":
        return <Lock className="h-4 w-4 text-accent" />;
      case "detention":
      case "bankruptcy":
        return <ShieldAlert className="h-4 w-4 text-accent" />;
      default:
        return <HelpCircle className="h-4 w-4 text-accent" />;
    }
  };

  const filteredRules = RULES_DATA.filter(
    (r) =>
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeSection = RULES_DATA.find((r) => r.id === rulesActiveSectionId) || RULES_DATA[0];

  return (
    <div className="flex flex-col min-h-screen md:h-screen md:overflow-hidden">
      <Navbar />

      <main className="flex-grow max-w-6xl w-full mx-auto px-6 py-6 grid grid-cols-1 md:grid-cols-12 gap-8 items-stretch md:min-h-0 md:pb-8">
        
        {/* LEFT INDEX MENU (4 Cols) */}
        <section className="md:col-span-4 flex flex-col gap-4 md:min-h-0">
          <div className="bg-card border border-accent/20 p-5 rounded-2xl shadow-lg flex flex-col h-full glass-panel md:min-h-0">
            
            <div className="flex items-center gap-2 mb-4">
              <BookOpen className="h-5 w-5 text-accent animate-pulse" />
              <h2 className="text-sm font-black uppercase text-slate-grey tracking-wider font-heading">Manual Chapters</h2>
            </div>

            {/* Search inputs */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-grey" />
              <input 
                type="text"
                placeholder="Search rule keyword..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-secondary border border-border/80 rounded-xl outline-none focus:border-accent text-xs text-ivory font-sans"
              />
            </div>

            {/* Index list */}
            <div className="flex-1 overflow-y-auto space-y-1 max-h-[350px] md:max-h-none pr-1 py-1">
              {filteredRules.map((rule) => (
                <button
                  key={rule.id}
                  onClick={() => setRulesActiveSectionId(rule.id)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl text-left text-xs font-bold uppercase tracking-wider transition-all border cursor-pointer font-heading ${
                    rulesActiveSectionId === rule.id
                      ? "border-accent bg-accent/15 text-accent scale-[1.01]"
                      : "border-transparent text-slate-grey hover:text-ivory hover:bg-secondary/30"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    {getRuleIcon(rule.iconName)}
                    {rule.title}
                  </span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              ))}
              {filteredRules.length === 0 && (
                <div className="text-center py-8 text-slate-grey text-xs italic font-sans">
                  No matching chapters.
                </div>
              )}
            </div>

          </div>
        </section>

        {/* RIGHT CONTENT VIEWER (8 Cols) */}
        <section className="md:col-span-8 md:min-h-0">
          <div className="bg-card border border-accent/20 p-8 rounded-2xl shadow-lg h-full flex flex-col justify-between glass-panel-glow md:min-h-0">
            
            <div className="flex-grow flex flex-col min-h-0 space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b border-border/20 shrink-0">
                <div className="h-10 w-10 rounded-xl bg-accent/10 border border-accent/25 flex items-center justify-center">
                  {getRuleIcon(activeSection.iconName)}
                </div>
                <div>
                  <h3 className="text-lg font-black text-ivory uppercase tracking-wide font-heading">
                    {activeSection.title}
                  </h3>
                  <span className="text-[9px] font-black uppercase text-slate-grey tracking-widest block mt-0.5 font-heading">
                    PropEmpire Boardroom Guidebook
                  </span>
                </div>
              </div>

              <div className="flex-grow overflow-y-auto pr-2 space-y-6 min-h-0 scrollbar-thin">
                <div className="text-slate-grey text-sm leading-relaxed whitespace-pre-line font-sans">
                  {activeSection.content}
                </div>

                {/* Example box highlight */}
                {activeSection.example && (
                  <div className="p-4 bg-secondary/30 border border-accent/20 rounded-xl space-y-2 font-sans">
                    <div className="text-[10px] font-black uppercase text-accent tracking-widest flex items-center gap-1.5 font-heading">
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>Gameplay Scenario Example</span>
                    </div>
                    <p className="text-xs text-slate-grey leading-relaxed italic">
                      &ldquo;{activeSection.example}&rdquo;
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Manual note footer */}
            <div className="pt-6 border-t border-border/20 mt-6 text-[10px] text-slate-grey uppercase font-semibold text-center flex items-center justify-center gap-2 font-heading shrink-0">
              <BookOpen className="h-3.5 w-3.5" />
              <span>PropEmpire official rulebook. Subject to boardroom adjustments.</span>
            </div>

          </div>
        </section>

      </main>
    </div>
  );
}
