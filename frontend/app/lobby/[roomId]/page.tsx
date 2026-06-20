"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import { useGame } from "@/components/game/GameContext";
import { TokenType } from "@/lib/game-engine";
import { 
  Copy, 
  Check, 
  Play, 
  LogOut, 
  ShieldAlert, 
  ShieldCheck, 
  Car, 
  Crown, 
  Rocket,
  MessageSquare,
  Send,
  X,
  Edit2,
  Sliders
} from "lucide-react";

export default function LobbyPage() {
  const router = useRouter();
  const params = useParams();
  const roomId = params?.roomId as string || "PE-8742";
  
  const { 
    gameState, 
    setupNewGame, 
    startGame, 
    myPlayerId, 
    updatePlayerInfo, 
    kickPlayer, 
    humanPlayer,
    chatMessages,
    sendChatMessage 
  } = useGame();
  
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [selectedToken, setSelectedToken] = useState<TokenType>("Rocket");
  const [guestNameInput, setGuestNameInput] = useState("");
  const [chatMessage, setChatMessage] = useState("");
  const [showCustomizeModal, setShowCustomizeModal] = useState(false);

  const [maxPlayersConfig, setMaxPlayersConfig] = useState(4);
  const [startingCapitalConfig, setStartingCapitalConfig] = useState(1500);
  const [turnTimerLimitConfig, setTurnTimerLimitConfig] = useState(60);
  const [rollTimerBonusConfig, setRollTimerBonusConfig] = useState(15);
  const [botsEnabledConfig, setBotsEnabledConfig] = useState(true);
  const [botCountConfig, setBotCountConfig] = useState(3);
  const [auctionTimerLimitConfig, setAuctionTimerLimitConfig] = useState(15);

  const maxPossibleBots = maxPlayersConfig - gameState.players.length;

  useEffect(() => {
    if (botCountConfig > maxPossibleBots) {
      setTimeout(() => {
        setBotCountConfig(Math.max(1, maxPossibleBots));
      }, 0);
    }
  }, [maxPlayersConfig, gameState.players.length, maxPossibleBots, botCountConfig]);

  const canStart = (gameState.players.length + (botsEnabledConfig && gameState.players.length < 8 ? botCountConfig : 0)) >= 2;

  const hostPlayer = gameState.players[0] || null;
  const isHost = hostPlayer && hostPlayer.id === myPlayerId;

  useEffect(() => {
    // Sync setup when entering lobby
    const currentToken = (typeof window !== "undefined" ? localStorage.getItem("propempire_token") as TokenType : null) || "Rocket";
    setupNewGame(4, currentToken, roomId);
  }, [roomId]);

  // Sync inputs with humanPlayer details
  useEffect(() => {
    if (humanPlayer) {
      setTimeout(() => {
        setGuestNameInput(humanPlayer.name);
        setSelectedToken(humanPlayer.token);
      }, 0);
    }
  }, [humanPlayer]);

  useEffect(() => {
    if (gameState.status === "PLAYING") {
      router.push(`/game/${roomId}`);
    }
  }, [gameState.status, roomId, router]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(roomId);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyLink = () => {
    const inviteUrl = `${window.location.origin}/lobby/${roomId}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleTokenChange = (token: TokenType) => {
    setSelectedToken(token);
    updatePlayerInfo(guestNameInput || "Guest Investor", token);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim()) return;
    sendChatMessage(chatMessage);
    setChatMessage("");
  };

  const handleStartGame = () => {
    startGame({
      maxPlayers: maxPlayersConfig,
      startingCapital: startingCapitalConfig,
      turnTimerLimit: turnTimerLimitConfig,
      rollTimerBonus: rollTimerBonusConfig,
      botsEnabled: botsEnabledConfig && gameState.players.length < 8,
      botCount: botCountConfig,
      auctionTimerLimit: auctionTimerLimitConfig
    });
    router.push(`/game/${roomId}`);
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

      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT LOBBY ROOM CONTROL (8 Columns) */}
        <div className="lg:col-span-8 space-y-6">
          {/* LOBBY HEADER */}
          <div className="glass-panel p-6 rounded-xl flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <span className="text-[10px] font-black uppercase text-accent tracking-widest block font-numbers">MATCHMAKING LOBBY</span>
              <h2 className="text-2xl font-black text-ivory uppercase tracking-wide mt-1 flex items-center gap-2 font-heading">
                Room Code: <span className="text-gold-gradient font-black tracking-widest">{roomId}</span>
                <button 
                  onClick={handleCopyCode}
                  title="Copy Room Code"
                  className="p-1.5 hover:bg-secondary rounded-lg text-slate-grey hover:text-accent transition-colors"
                >
                  {copiedCode ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                </button>
              </h2>
              {/* Invitation URL */}
              <div className="mt-1 text-xs text-slate-grey flex items-center flex-wrap gap-2">
                <span>Invite URL:</span>
                <span className="text-slate-300 underline select-all">
                  {typeof window !== "undefined" ? `${window.location.origin}/lobby/${roomId}` : `/lobby/${roomId}`}
                </span>
                <button 
                  onClick={handleCopyLink}
                  title="Copy Invitation Link"
                  className="p-1 rounded text-slate-grey hover:text-accent transition-colors inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 border border-border/40 bg-secondary/40"
                >
                  {copiedLink ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                  <span>{copiedLink ? "Copied!" : "Copy Link"}</span>
                </button>
              </div>
            </div>

            <div className="flex gap-3 w-full md:w-auto">
              <button 
                onClick={() => router.push("/")}
                className="flex-1 md:flex-initial flex items-center justify-center gap-1.5 btn-game-secondary px-5 py-3 rounded-lg text-xs font-bold cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
                Leave Room
              </button>
              
              {isHost ? (
                <div className="flex flex-col items-stretch md:items-end gap-1.5 flex-1 md:flex-initial">
                  <button 
                    onClick={handleStartGame}
                    disabled={!canStart}
                    className="w-full flex items-center justify-center gap-1.5 btn-game-primary px-6 py-3 rounded-lg text-xs cursor-pointer"
                  >
                    <Play className="h-4 w-4 stroke-[3]" />
                    Start Game
                  </button>
                  {!canStart && (
                    <span className="text-[9px] uppercase font-bold text-red-400 tracking-wider text-center md:text-right font-numbers">
                      Need at least 2 players to start
                    </span>
                  )}
                </div>
              ) : (
                <button 
                  disabled
                  className="flex-1 md:flex-initial flex items-center justify-center gap-1.5 btn-game-secondary opacity-50 px-6 py-3 rounded-lg text-xs cursor-not-allowed"
                >
                  <Play className="h-4 w-4 opacity-40" />
                  Awaiting Host
                </button>
              )}
            </div>
          </div>

          {/* LOBBY SETTINGS (Host Only) */}
          {isHost && (
            <div className="glass-panel rounded-xl p-6 space-y-4 shadow-xl">
              <div className="flex items-center gap-2 pb-2 border-b border-border/20">
                <Sliders className="h-4 w-4 text-accent animate-pulse" />
                <h3 className="text-sm font-black uppercase text-ivory tracking-wider font-heading">
                  Boardroom Match Settings
                </h3>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs uppercase font-extrabold text-slate-grey tracking-wider block mb-2 font-numbers">
                    Max Players ({maxPlayersConfig} Players)
                  </label>
                  <input
                    type="range"
                    min={Math.max(2, gameState.players.length)}
                    max={8}
                    value={maxPlayersConfig}
                    onChange={(e) => setMaxPlayersConfig(parseInt(e.target.value))}
                    className="w-full h-1.5 bg-secondary rounded-lg appearance-none cursor-pointer accent-accent"
                  />
                  <span className="text-[10px] text-slate-grey mt-1 block">Specifies the maximum player capacity of the match.</span>
                </div>

                <div>
                  <label className="text-xs uppercase font-extrabold text-slate-grey tracking-wider block mb-2 font-numbers">
                    Starting Capital (${startingCapitalConfig.toLocaleString()})
                  </label>
                  <select
                    value={startingCapitalConfig}
                    onChange={(e) => setStartingCapitalConfig(parseInt(e.target.value))}
                    className="w-full px-3 py-2 bg-secondary/80 border border-border/40 rounded-lg text-ivory outline-none focus:border-accent text-xs font-semibold"
                  >
                    <option value={1000}>$1,000 (Fast Game)</option>
                    <option value={1500}>$1,500 (Standard)</option>
                    <option value={2000}>$2,000 (Rich Investors)</option>
                    <option value={3000}>$3,000 (Tycoon Match)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs uppercase font-extrabold text-slate-grey tracking-wider block mb-2 font-numbers">
                    Turn Timer Limit ({turnTimerLimitConfig}s)
                  </label>
                  <input
                    type="number"
                    min={30}
                    value={turnTimerLimitConfig}
                    onChange={(e) => setTurnTimerLimitConfig(Math.max(30, parseInt(e.target.value) || 30))}
                    className="w-full px-3 py-2 bg-secondary/80 border border-border/40 rounded-lg text-ivory font-bold outline-none focus:border-accent text-xs font-numbers"
                  />
                  <span className="text-[10px] text-slate-grey mt-1 block">Min 30 seconds per turn.</span>
                </div>

                <div>
                  <label className="text-xs uppercase font-extrabold text-slate-grey tracking-wider block mb-2 font-numbers">
                    Roll Timer Bonus (+{rollTimerBonusConfig}s)
                  </label>
                  <input
                    type="number"
                    min={15}
                    value={rollTimerBonusConfig}
                    onChange={(e) => setRollTimerBonusConfig(Math.max(15, parseInt(e.target.value) || 15))}
                    className="w-full px-3 py-2 bg-secondary/80 border border-border/40 rounded-lg text-ivory font-bold outline-none focus:border-accent text-xs font-numbers"
                  />
                  <span className="text-[10px] text-slate-grey mt-1 block">Min 15 seconds added when rolling dice.</span>
                </div>

                <div>
                  <label className="text-xs uppercase font-extrabold text-slate-grey tracking-wider block mb-2 font-numbers">
                    Auction Round Timer ({auctionTimerLimitConfig}s)
                  </label>
                  <input
                    type="number"
                    min={10}
                    max={60}
                    value={auctionTimerLimitConfig}
                    onChange={(e) => setAuctionTimerLimitConfig(Math.max(10, Math.min(60, parseInt(e.target.value) || 10)))}
                    className="w-full px-3 py-2 bg-secondary/80 border border-border/40 rounded-lg text-ivory font-bold outline-none focus:border-accent text-xs font-numbers"
                  />
                  <span className="text-[10px] text-slate-grey mt-1 block">Min 10s, Max 60s per bidding round.</span>
                </div>

                <div className="flex flex-col justify-between p-3.5 bg-secondary/30 border border-border/30 rounded-lg col-span-1 sm:col-span-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-xs uppercase font-extrabold text-slate-grey tracking-wider block font-numbers">
                        Add Bot Opponents
                      </label>
                      <span className="text-[10px] text-slate-grey mt-0.5 block font-sans">Enable AI-driven boardroom rivals.</span>
                    </div>
                    <button
                      type="button"
                      disabled={gameState.players.length >= 8}
                      onClick={() => setBotsEnabledConfig(!botsEnabledConfig)}
                      className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${botsEnabledConfig && gameState.players.length < 8 ? 'bg-accent' : 'bg-secondary'}`}
                    >
                      <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-charcoal shadow ring-0 transition duration-200 ease-in-out ${botsEnabledConfig && gameState.players.length < 8 ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                  </div>
                </div>

                {botsEnabledConfig && gameState.players.length < 8 && maxPossibleBots > 0 && (
                  <div className="p-3.5 bg-secondary/30 border border-border/30 rounded-lg space-y-2 col-span-1 sm:col-span-2">
                    <label className="text-xs uppercase font-extrabold text-slate-grey tracking-wider block font-numbers">
                      Number of Bots ({botCountConfig})
                    </label>
                    <input
                      type="range"
                      min={1}
                      max={maxPossibleBots}
                      value={botCountConfig}
                      onChange={(e) => setBotCountConfig(parseInt(e.target.value))}
                      className="w-full h-1.5 bg-secondary rounded-lg appearance-none cursor-pointer accent-accent"
                    />
                    <span className="text-[10px] text-slate-grey block">
                      Exactly {botCountConfig} bot(s) will be provisioned on start.
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* PLAYERS LIST GRID (2 to 8 players) */}
          <div className="space-y-3">
            <h3 className="text-sm font-black uppercase text-ivory tracking-wider font-heading">
              Shareholders List ({gameState.players.length}/8 Active)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {gameState.players.map((player) => (
                <div 
                  key={player.id}
                  className="glass-panel p-4 rounded-xl flex items-center justify-between shadow-lg relative overflow-hidden group"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-secondary border border-border/50 flex items-center justify-center text-xl shadow-inner">
                      {player.avatar}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-ivory text-sm">{player.name}</span>
                        {player.id === hostPlayer?.id ? (
                          <span className="inline-flex items-center gap-0.5 text-[8px] font-extrabold uppercase bg-accent/20 text-accent border border-accent/30 px-1.5 rounded font-numbers">Host</span>
                        ) : player.isBot ? (
                          <span className="inline-flex items-center gap-0.5 text-[8px] font-extrabold uppercase bg-secondary text-slate-grey px-1.5 rounded font-numbers">Bot</span>
                        ) : (
                          <span className="inline-flex items-center gap-0.5 text-[8px] font-extrabold uppercase bg-secondary text-slate-grey/80 px-1.5 rounded font-numbers">Guest</span>
                        )}
                        {player.id === myPlayerId && (
                          <button
                            onClick={() => setShowCustomizeModal(true)}
                            className="inline-flex items-center gap-1 text-[9px] font-bold uppercase text-accent hover:text-gold-light bg-accent/15 border border-accent/20 hover:border-accent/40 px-1.5 py-0.5 rounded transition-all ml-1.5 cursor-pointer font-heading"
                          >
                            <Edit2 className="h-2.5 w-2.5" />
                            <span>Customize</span>
                          </button>
                        )}
                      </div>
                      <div className="text-xs text-slate-grey mt-0.5 flex items-center gap-1.5">
                        Token: <span className="text-accent font-bold font-numbers">{player.token}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {player.id === hostPlayer?.id ? (
                      <span className="inline-flex items-center gap-1 text-[9px] uppercase font-bold text-accent bg-accent/10 border border-accent/25 px-2.5 py-1 rounded-full font-numbers">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        Host
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[9px] uppercase font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full animate-pulse font-numbers">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        Ready
                      </span>
                    )}

                    {/* Kicking option for Host */}
                    {isHost && player.id !== myPlayerId && (
                      <button 
                        onClick={() => kickPlayer(player.id)}
                        className="p-1 hover:bg-red-950/20 text-red-500 hover:text-red-400 rounded border border-red-500/20 text-[9px] uppercase font-bold px-2 py-1 transition-colors cursor-pointer font-numbers"
                      >
                        Kick
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {/* Empty Lobby Slots */}
              {Array.from({ length: 8 - (gameState.players.length || 0) }).map((_, i) => (
                <div 
                  key={`empty-${i}`}
                  className="border border-dashed border-border/30 bg-secondary/10 p-4 rounded-xl flex items-center justify-center text-slate-grey/60 gap-2 cursor-pointer hover:border-accent/40 hover:text-ivory transition-colors"
                >
                  <span className="h-2 w-2 rounded-full bg-secondary" />
                  <span className="text-xs font-bold uppercase tracking-wider font-heading">Awaiting Slot</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT LOBBY CHAT (4 Columns) */}
        <div className="lg:col-span-4 flex flex-col h-[500px] lg:h-auto glass-panel rounded-xl overflow-hidden shadow-xl">
          {/* Chat header */}
          <div className="px-4 py-3 bg-secondary/20 border-b border-border/30 flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-accent" />
            <h3 className="text-xs font-black uppercase text-ivory tracking-wider font-heading">Lobby Chat Logs</h3>
          </div>

          {/* Chat feed */}
          <div className="flex-grow overflow-y-auto p-4 space-y-3">
            {chatMessages.length === 0 ? (
              <div className="text-slate-grey/60 text-center text-xs italic py-4">No boardroom messages. Send a message to alert other players.</div>
            ) : (
              chatMessages.map((msg, index) => {
                const showSender = index === 0 || chatMessages[index - 1].sender !== msg.sender;
                return (
                  <div key={msg.id} className={`text-xs ${index === 0 ? "mt-0" : showSender ? "mt-3" : "mt-0.5"}`}>
                    <div>
                      {showSender && (
                        <span className={`font-bold uppercase tracking-wider block mb-0.5 text-[10px] font-numbers ${
                          msg.sender === (humanPlayer?.name || "You") 
                            ? "text-accent" 
                            : "text-slate-grey"
                        }`}>
                          {msg.sender}:
                        </span>
                      )}
                      <span className="text-ivory bg-secondary/30 border border-border/20 px-3 py-1.5 rounded-lg inline-block max-w-[90%] leading-relaxed">
                        {msg.text}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Chat input form */}
          <form onSubmit={handleSendMessage} className="p-3 border-t border-border/20 bg-secondary/20 flex gap-2">
            <input
              type="text"
              placeholder="Send boardroom alert..."
              value={chatMessage}
              onChange={(e) => setChatMessage(e.target.value)}
              className="flex-1 bg-secondary/60 border border-border/40 rounded-lg px-3 py-2 text-xs text-ivory placeholder-slate-grey/50 outline-none focus:border-accent/50"
            />
            <button 
              type="submit"
              className="p-2 btn-game-primary rounded-lg transition-colors flex items-center justify-center cursor-pointer"
            >
              <Send className="h-3.5 w-3.5 text-charcoal stroke-[2.5]" />
            </button>
          </form>
        </div>

      </main>

      {/* CUSTOMIZE PROFILE MODAL */}
      {showCustomizeModal && (
        <div className="fixed inset-0 bg-charcoal/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="rounded-xl p-6 w-full max-w-lg shadow-2xl relative animate-in fade-in zoom-in-95 duration-200 glass-panel-glow">
            {/* Modal header */}
            <div className="flex items-center justify-between pb-4 border-b border-border/20">
              <h3 className="text-base font-black uppercase text-ivory tracking-wider font-heading">
                Customize Guest Profile
              </h3>
              <button 
                onClick={() => setShowCustomizeModal(false)}
                className="p-1.5 hover:bg-secondary rounded-lg text-slate-grey hover:text-ivory transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal body */}
            <div className="py-6 space-y-6">
              <div>
                <label className="text-xs uppercase font-extrabold text-slate-grey tracking-wider block mb-2 font-numbers">
                  Investor Username
                </label>
                <input
                  type="text"
                  maxLength={18}
                  value={guestNameInput}
                  onChange={(e) => {
                    const val = e.target.value;
                    setGuestNameInput(val);
                    updatePlayerInfo(val || "Guest Investor", selectedToken);
                  }}
                  className="w-full px-4 py-2.5 bg-secondary/80 border border-border/40 rounded-lg focus:border-accent text-ivory font-bold outline-none text-xs"
                />
              </div>

              <div>
                <label className="text-xs uppercase font-extrabold text-slate-grey tracking-wider block mb-2 font-numbers">
                  Lobby Token Piece
                </label>
                <div className="grid grid-cols-4 gap-3">
                  {tokensList.map((tok) => {
                    const isClaimedByOther = gameState.players.some(p => p.id !== myPlayerId && p.token === tok.name);
                    
                    return (
                      <button
                        key={tok.name}
                        onClick={() => !isClaimedByOther && handleTokenChange(tok.name)}
                        disabled={isClaimedByOther}
                        className={`aspect-square rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all p-2 cursor-pointer ${
                          selectedToken === tok.name
                            ? "border-accent bg-accent/15 text-ivory shadow-md shadow-accent/10 scale-105"
                            : isClaimedByOther
                            ? "border-transparent bg-secondary/20 text-slate-grey/30 opacity-30 cursor-not-allowed border-dashed grayscale"
                            : "border-border/40 bg-secondary/40 text-slate-grey hover:border-accent hover:text-ivory"
                        }`}
                      >
                        <span className="text-2xl">{tok.icon}</span>
                        <span className="text-[9px] font-bold uppercase tracking-wider truncate w-full text-center font-numbers">
                          {tok.name}
                        </span>
                        {isClaimedByOther && (
                          <span className="text-[7.5px] font-semibold text-red-500/80 tracking-normal block mt-[-4px]">
                            Claimed
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Modal footer */}
            <div className="pt-4 border-t border-border/20 flex justify-end">
              <button
                onClick={() => setShowCustomizeModal(false)}
                className="px-5 py-2.5 btn-game-primary rounded-lg text-xs cursor-pointer"
              >
                Save & Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
