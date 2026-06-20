"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { useGame } from "@/components/game/GameContext";
import { TokenType } from "@/lib/game-engine";
import { 
  Plus, 
  Users, 
  Sparkles, 
  Tv, 
  Zap, 
  ArrowRight,
  ShieldCheck,
  Globe2,
  Trophy
} from "lucide-react";

export default function LandingPage() {
  const router = useRouter();
  const { setupNewGame } = useGame();

  const [guestName, setGuestName] = useState("Guest Investor");
  const [selectedToken, setSelectedToken] = useState<TokenType>("Rocket");
  const [roomCodeInput, setRoomCodeInput] = useState("PE-");
  const [showJoinModal, setShowJoinModal] = useState(false);

  // Load guest details from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedName = localStorage.getItem("propempire_username");
      const storedToken = localStorage.getItem("propempire_token") as TokenType;
      
      let finalName = "Guest Investor";
      if (storedName) {
        finalName = storedName;
      } else {
        const randomNum = Math.floor(1000 + Math.random() * 9000);
        finalName = `Investor #${randomNum}`;
        localStorage.setItem("propempire_username", finalName);
      }

      let finalToken: TokenType = "Rocket";
      if (storedToken) {
        finalToken = storedToken;
      } else {
        localStorage.setItem("propempire_token", "Rocket");
      }

      setTimeout(() => {
        setGuestName(finalName);
        setSelectedToken(finalToken);
      }, 0);
    }
  }, []);

  const saveGuestInfo = (name: string, token: TokenType) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("propempire_username", name);
      localStorage.setItem("propempire_token", token);
    }
  };

  const handleHostGame = () => {
    const freshName = guestName.trim() || "Guest Investor";
    saveGuestInfo(freshName, selectedToken);

    // Generate room code and setup
    const newRoomCode = `PE-${Math.floor(1000 + Math.random() * 9000)}`;
    if (typeof window !== "undefined") {
      sessionStorage.setItem(`host_room_${newRoomCode}`, "true");
    }
    setupNewGame(4, selectedToken, newRoomCode, true);
    router.push(`/lobby/${newRoomCode}`);
  };

  const handleJoinGameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomCodeInput.trim()) return;
    const freshName = guestName.trim() || "Guest Investor";
    saveGuestInfo(freshName, selectedToken);

    const targetRoom = roomCodeInput.toUpperCase().trim();
    if (typeof window !== "undefined") {
      sessionStorage.removeItem(`host_room_${targetRoom}`);
    }
    setupNewGame(4, selectedToken, targetRoom, false);
    router.push(`/lobby/${targetRoom}`);
  };

  const tokensList: { name: TokenType; icon: string }[] = [
    { name: "Car", icon: "🏎️" },
    { name: "Dog", icon: "🐕" },
    { name: "Top Hat", icon: "🎩" },
    { name: "Ship", icon: "⚓" },
    { name: "Cat", icon: "🐈" },
    { name: "Duck", icon: "🦆" },
    { name: "Crown", icon: "👑" },
    { name: "Rocket", icon: "🚀" }
  ];

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className="flex-1 flex flex-col items-center justify-center py-12 px-6 relative overflow-hidden bg-background">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(196,157,71,0.05)_0%,transparent_70%)] pointer-events-none" />
        
        <div className="max-w-4xl w-full mx-auto flex flex-col items-center z-10 text-center mb-10">
          {/* Brand Logo Image */}
          <img 
            src="/PELogo.png" 
            alt="PROPEMPIRE logo" 
            className="h-24 sm:h-32 w-auto object-contain mb-8 filter drop-shadow-[0_0_20px_rgba(196,157,71,0.18)] transition-transform hover:scale-[1.02]"
          />

          {/* Tagline pill */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-accent/30 bg-accent/5 text-accent text-xs font-semibold uppercase tracking-wider mb-6 animate-pulse font-heading">
            <Zap className="h-3.5 w-3.5" />
            Monopoly Online with Friends
          </div>

          <h1 className="text-4xl sm:text-6xl font-black tracking-tight mb-4 uppercase text-ivory font-heading">
            MONOPOLY ONLINE WITH <span className="text-gold-gradient">FRIENDS</span>
          </h1>
          
          <p className="text-base sm:text-lg text-slate-grey max-w-2xl leading-relaxed">
            Welcome to <strong className="text-accent font-bold">PropEmpire</strong>! Build, trade, and dominate the property boardrooms in real-time. Invite your friends, customize your player identity, and buy up luxury real estate. No accounts required.
          </p>
        </div>

        {/* PROFILE BUILDER & GAME LAUNCH PANEL */}
        <div className="max-w-xl w-full mx-auto glass-panel p-6 sm:p-8 rounded-xl shadow-2xl relative">
          
          <div className="space-y-6">
            {/* Guest Username */}
            <div>
              <label className="text-xs uppercase font-extrabold text-slate-grey tracking-wider block mb-2 font-numbers">
                Enter Your Guest Name
              </label>
              <input 
                type="text"
                maxLength={18}
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="Investor Name"
                className="w-full px-4 py-3 bg-secondary/60 border border-border/40 rounded-xl focus:border-accent text-ivory font-bold outline-none text-sm transition-all"
              />
            </div>

            {/* Token Selector */}
            <div>
              <label className="text-xs uppercase font-extrabold text-slate-grey tracking-wider block mb-2 font-numbers">
                Select Your Token Piece
              </label>
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-2.5">
                {tokensList.map((tok) => (
                  <button
                    key={tok.name}
                    onClick={() => setSelectedToken(tok.name)}
                    className={`aspect-square rounded-lg border flex flex-col items-center justify-center gap-1.5 transition-all p-1.5 cursor-pointer ${
                      selectedToken === tok.name
                        ? "border-accent bg-accent/15 text-ivory scale-105 shadow-md shadow-accent/10"
                        : "border-border/30 bg-secondary/40 text-slate-grey hover:border-accent/40 hover:text-ivory"
                    }`}
                  >
                    <span className="text-xl">{tok.icon}</span>
                    <span className="text-[8px] font-bold uppercase tracking-wider truncate w-full text-center font-numbers">
                      {tok.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Launch Actions */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-border/20">
              <button 
                onClick={handleHostGame}
                className="flex-1 flex items-center justify-center gap-2 btn-game-primary px-6 py-4 rounded-xl text-xs cursor-pointer"
              >
                <Plus className="h-4 w-4 stroke-[3]" />
                Host Boardroom
              </button>
              
              <button 
                onClick={() => {
                  setRoomCodeInput("PE-");
                  setShowJoinModal(true);
                }}
                className="flex-1 flex items-center justify-center gap-2 btn-game-secondary px-6 py-4 rounded-xl text-xs cursor-pointer"
              >
                <Users className="h-4 w-4" />
                Join with Key
              </button>
            </div>
          </div>
        </div>

        {/* TRUST BANNER */}
        <section className="mt-20 py-6 border-t border-border/20 w-full flex justify-center text-center max-w-4xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-around gap-6 text-xs text-slate-grey font-semibold uppercase tracking-wider w-full font-numbers">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4.5 w-4.5 text-accent" />
              <span>Host Control Boardrooms</span>
            </div>
            <div className="flex items-center gap-2">
              <Globe2 className="h-4.5 w-4.5 text-accent" />
              <span>Real-Time Socket Syncing</span>
            </div>
            <div className="flex items-center gap-2">
              <Trophy className="h-4.5 w-4.5 text-accent" />
              <span>Supports up to 8 Players</span>
            </div>
          </div>
        </section>
      </main>

      {/* JOIN ROOM MODAL */}
      {showJoinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm rounded-xl p-6 shadow-2xl relative glass-panel-glow">
            
            <div className="text-center mb-6">
              <h3 className="text-lg font-black uppercase text-ivory tracking-wide font-heading">ENTER BOARD CODE</h3>
              <p className="text-xs text-slate-grey mt-1">Ask the host for their 7-character invitation key</p>
            </div>

            <form onSubmit={handleJoinGameSubmit} className="space-y-4">
              <input 
                type="text"
                required
                maxLength={7}
                placeholder="PE-8742"
                value={roomCodeInput}
                onChange={(e) => {
                  let val = e.target.value.toUpperCase();
                  if (!val.startsWith("PE-")) {
                    if (val.length < 3) {
                      val = "PE-";
                    } else {
                      val = "PE-" + val.replace(/^PE-/, "");
                    }
                  }
                  setRoomCodeInput(val.substring(0, 7));
                }}
                className="w-full text-center text-lg font-bold tracking-widest py-3.5 bg-secondary/80 border border-border/40 rounded-xl focus:border-accent outline-none uppercase text-accent placeholder-slate-grey/30 font-numbers"
              />

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowJoinModal(false)}
                  className="flex-1 py-3 text-xs uppercase tracking-wider font-bold btn-game-secondary rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 text-xs uppercase tracking-wider font-bold btn-game-primary rounded-lg cursor-pointer"
                >
                  Enter Room
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
