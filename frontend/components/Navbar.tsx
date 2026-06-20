"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useGame } from "@/components/game/GameContext";
import { Shield, BookOpen, Compass, Award, User, LogOut, Trash2, AlertTriangle, X } from "lucide-react";

export default function Navbar() {
  const pathname = usePathname();
  const { gameState, myPlayerId, endGame, leaveGame } = useGame();
  
  const [showEndGameModal, setShowEndGameModal] = useState(false);
  const [showLeaveGameModal, setShowLeaveGameModal] = useState(false);

  const isLinkActive = (path: string) => {
    return pathname === path 
      ? "text-accent font-black border-b-2 border-accent pb-1 scale-[1.02] shadow-[0_2px_0_rgba(196,157,71,0.2)]" 
      : "text-slate-grey hover:text-ivory transition-all pb-1 border-b-2 border-transparent hover:scale-[1.02]";
  };

  const isGamePage = pathname?.startsWith("/game/");
  const hostPlayer = gameState?.players?.[0] || null;
  const isHost = hostPlayer && hostPlayer.id === myPlayerId;

  const handleEndGameConfirm = () => {
    setShowEndGameModal(true);
  };

  const handleLeaveGameConfirm = () => {
    setShowLeaveGameModal(true);
  };

  const confirmEndGame = () => {
    setShowEndGameModal(false);
    endGame();
  };

  const confirmLeaveGame = () => {
    setShowLeaveGameModal(false);
    leaveGame();
  };

  return (
    <>
      <header className="border-b border-border/20 bg-card/80 backdrop-blur-md sticky top-0 z-50 px-6 py-4 flex items-center justify-between shadow-[0_4px_20px_rgba(0,0,0,0.4)]">
        {/* Brand logo */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2.5 transition-transform hover:scale-[1.02]">
            <img 
              src="/PELogo.png" 
              alt="PROPEMPIRE Logo" 
              className="h-10 w-auto object-contain"
            />
            <span className="text-base font-black text-gold-gradient tracking-widest font-heading select-none">
              PROPEMPIRE
            </span>
          </Link>
        </div>

        {/* Main navigation */}
        {!isGamePage && (
          <nav className="hidden md:flex items-center gap-8 text-xs uppercase tracking-widest font-heading font-black">
            <Link href="/" className={`flex items-center gap-1.5 transition-colors ${isLinkActive("/")}`}>
              <Compass className="h-4 w-4 stroke-[2]" />
              Home Lobby
            </Link>
            <Link href="/rules" className={`flex items-center gap-1.5 transition-colors ${isLinkActive("/rules")}`}>
              <BookOpen className="h-4 w-4 stroke-[2]" />
              Rules Manual
            </Link>
          </nav>
        )}

        {/* User profile & balance info */}
        <div className="flex items-center gap-4">
          {isGamePage && (
            isHost ? (
              <button 
                onClick={handleEndGameConfirm}
                className="flex items-center justify-center gap-1.5 px-4.5 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all btn-game-danger cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
                End Game
              </button>
            ) : (
              <button 
                onClick={handleLeaveGameConfirm}
                className="flex items-center justify-center gap-1.5 px-4.5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all btn-game-secondary cursor-pointer"
              >
                <LogOut className="h-3.5 w-3.5" />
                Leave Game
              </button>
            )
          )}
        </div>
      </header>

      {/* End Game Custom Modal */}
      {showEndGameModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-charcoal/90 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-xl p-6 relative flex flex-col glass-panel-glow text-center space-y-5 animate-in fade-in zoom-in-95 duration-200">
            {/* Close Button */}
            <button
              onClick={() => setShowEndGameModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-grey hover:bg-secondary hover:text-ivory transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Warning Icon and Header */}
            <div className="flex flex-col items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-red-950/40 border border-red-500/30 flex items-center justify-center text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.15)]">
                <AlertTriangle className="h-6 w-6 stroke-[2]" />
              </div>
              <div>
                <h3 className="text-lg font-black text-ivory uppercase tracking-widest font-heading">
                  Terminate Game Session?
                </h3>
                <span className="text-[9px] font-black uppercase text-red-400 tracking-widest mt-0.5 block font-numbers">
                  Host Level Authority Action
                </span>
              </div>
            </div>

            {/* Warning Message */}
            <p className="text-xs text-slate-grey leading-relaxed">
              Are you sure you want to end this game session for all players? This will liquidate the room state, terminate all active assets, and close the session permanently.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowEndGameModal(false)}
                className="flex-1 py-3 text-xs uppercase tracking-wider font-bold btn-game-secondary rounded-lg cursor-pointer"
              >
                Keep Game Going
              </button>
              <button
                type="button"
                onClick={confirmEndGame}
                className="flex-1 py-3 text-xs uppercase tracking-wider font-black btn-game-danger rounded-lg cursor-pointer"
              >
                End Session
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Leave Game Custom Modal */}
      {showLeaveGameModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-charcoal/90 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-xl p-6 relative flex flex-col glass-panel-glow text-center space-y-5 animate-in fade-in zoom-in-95 duration-200">
            {/* Close Button */}
            <button
              onClick={() => setShowLeaveGameModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-grey hover:bg-secondary hover:text-ivory transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Warning Icon and Header */}
            <div className="flex flex-col items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-amber-950/40 border border-amber-500/30 flex items-center justify-center text-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.15)]">
                <LogOut className="h-5 w-5 stroke-[2] ml-0.5" />
              </div>
              <div>
                <h3 className="text-lg font-black text-ivory uppercase tracking-widest font-heading">
                  Leave Game Session?
                </h3>
                <span className="text-[9px] font-black uppercase text-amber-400 tracking-widest mt-0.5 block font-numbers">
                  Liquidate Player Holdings
                </span>
              </div>
            </div>

            {/* Warning Message */}
            <p className="text-xs text-slate-grey leading-relaxed font-medium">
              Are you sure you want to leave this game? Your player profile and assets will be liquidated. Your holdings will be foreclosed, and you won&apos;t be able to rejoin this match.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowLeaveGameModal(false)}
                className="flex-1 py-3 text-xs uppercase tracking-wider font-bold btn-game-secondary rounded-lg cursor-pointer"
              >
                Stay In Boardroom
              </button>
              <button
                type="button"
                onClick={confirmLeaveGame}
                className="flex-1 py-3 text-xs uppercase tracking-wider font-black btn-game-primary rounded-lg cursor-pointer"
              >
                Liquidate & Leave
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
