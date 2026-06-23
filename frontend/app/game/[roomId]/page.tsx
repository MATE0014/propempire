"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { useGame } from "@/components/game/GameContext";
import {
  Tile,
  Player,
  GameCard,
  TokenType,
  ownsDistrict,
  calculateRent
} from "@/lib/game-engine";
import {
  Dice5,
  TrendingUp,
  DollarSign,
  User,
  ArrowRight,
  Building,
  Building2,
  Lock,
  Unlock,
  Scale,
  HelpCircle,
  Volume2,
  FileText,
  ChevronRight,
  Sparkles,
  Info,
  Clock,
  Hammer,
  ArrowRightLeft,
  X,
  Plus,
  Minus,
  Award,
  ShieldAlert,
  BookOpen,
  Search,
  MessageSquare,
  Maximize2
} from "lucide-react";
import { RULES_DATA } from "@/lib/rules-data";


// Mathematical mapping for hollow 11x11 board grid
const getGridPosition = (index: number) => {
  // 0-10: bottom row (right to left)
  if (index >= 0 && index <= 10) {
    return { row: 11, col: 11 - index };
  }
  // 10-20: left col (bottom to top)
  if (index > 10 && index <= 20) {
    return { row: 11 - (index - 10), col: 1 };
  }
  // 20-30: top row (left to right)
  if (index > 20 && index <= 30) {
    return { row: 1, col: 1 + (index - 20) };
  }
  // 30-39: right col (top to bottom)
  if (index > 30 && index < 40) {
    return { row: 1 + (index - 30), col: 11 };
  }
  return { row: 1, col: 1 };
};

const getTileSide = (index: number): "corner" | "bottom" | "left" | "top" | "right" => {
  if (index === 0 || index === 10 || index === 20 || index === 30) return "corner";
  if (index > 0 && index < 10) return "bottom";
  if (index > 10 && index < 20) return "left";
  if (index > 20 && index < 30) return "top";
  if (index > 30 && index < 40) return "right";
  return "corner";
};

export default function GameRoomPage() {
  const router = useRouter();
  const params = useParams();
  const roomId = params?.roomId as string || "PE-8742";

  const {
    gameState,
    activePlayer,
    humanPlayer,
    rollDice,
    buyProperty,
    startAuction,
    placeBidAmount,
    passAuction,
    endTurn,
    buildHouse,
    buildHotel,
    mortgageProperty,
    unmortgageProperty,
    proposeTrade,
    respondToTrade,
    dismissCard,
    payDetentionFine,
    useEscapeCard,
    tryDoubleRoll,
    setupNewGame,
    isRolling,
    botStatusText,
    setSelectedTileIndex,
    myPlayerId,
    endGame,
    sellHouse,
    chatMessages,
    sendChatMessage,
    hostEndedResults,
    leftGameResults,
    setHostEndedResults,
    setLeftGameResults
  } = useGame();

  const [selectedPropTile, setSelectedPropTile] = useState<Tile | null>(null);
  const [showTradeModal, setShowTradeModal] = useState(false);
  const [showAssetsModal, setShowAssetsModal] = useState(false);
  const [selectedTradePartnerId, setSelectedTradePartnerId] = useState<string>("p2");

  const [showRulesModal, setShowRulesModal] = useState(false);
  const [rulesSearchQuery, setRulesSearchQuery] = useState("");
  const [rulesActiveSectionId, setRulesActiveSectionId] = useState("objective");
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [showMobileChatSheet, setShowMobileChatSheet] = useState(false);

  const [lastBidTime, setLastBidTime] = useState<number>(0);
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(0);

  const [mobileBoardView, setMobileBoardView] = useState<"focused" | "full">("focused");
  const [mobileFocusedTile, setMobileFocusedTile] = useState<number | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const [isDraggingState, setIsDraggingState] = useState(false);
  const startPointer = useRef({ x: 0, y: 0 });

  // Sync mobile focused tile with active player position when they move or turn changes
  useEffect(() => {
    if (activePlayer) {
      setMobileFocusedTile(activePlayer.position);
    }
  }, [activePlayer?.position, gameState.activePlayerIndex]);

  // Reset drag offset when focus tile or view mode changes
  useEffect(() => {
    setDragOffset({ x: 0, y: 0 });
  }, [mobileFocusedTile, mobileBoardView]);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (mobileBoardView !== "focused") return;
    isDragging.current = true;
    setIsDraggingState(true);
    startPointer.current = { x: e.clientX, y: e.clientY };
    containerRef.current?.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current || mobileBoardView !== "focused" || !containerRef.current) return;
    const dx = e.clientX - startPointer.current.x;
    const dy = e.clientY - startPointer.current.y;
    
    const rect = containerRef.current.getBoundingClientRect();
    const percentX = (dx / rect.width) * 100;
    const percentY = (dy / rect.height) * 100;
    
    const scaleFactor = 1.7;
    setDragOffset(prev => ({
      x: prev.x - percentX / scaleFactor,
      y: prev.y - percentY / scaleFactor
    }));
    
    startPointer.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    isDragging.current = false;
    setIsDraggingState(false);
    try {
      containerRef.current?.releasePointerCapture(e.pointerId);
    } catch (err) {}
  };

  const getMobileFocusCoords = () => {
    const focusIndex = mobileFocusedTile !== null ? mobileFocusedTile : (activePlayer?.position || 0);
    const pos = getGridPosition(focusIndex);
    const baseX = ((pos.col - 1) / 10) * 100;
    const baseY = ((pos.row - 1) / 10) * 100;
    
    const x = Math.max(0, Math.min(100, baseX + dragOffset.x));
    const y = Math.max(0, Math.min(100, baseY + dragOffset.y));
    return { x, y };
  };

  const focusCoords = getMobileFocusCoords();

  useEffect(() => {
    if (lastBidTime === 0) return;
    const interval = setInterval(() => {
      const remaining = Math.max(0, 2 - (Date.now() - lastBidTime) / 1000);
      setCooldownRemaining(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
      }
    }, 50);
    return () => clearInterval(interval);
  }, [lastBidTime]);

  const handlePlaceBid = (amount: number) => {
    if (Date.now() - lastBidTime < 2000) return;
    setLastBidTime(Date.now());
    setCooldownRemaining(2);
    placeBidAmount(amount);
  };

  // Trade builder state
  const [tradeOfferCash, setTradeOfferCash] = useState(0);
  const [tradeRequestCash, setTradeRequestCash] = useState(0);
  const [tradeOfferEscapeCards, setTradeOfferEscapeCards] = useState(0);
  const [tradeRequestEscapeCards, setTradeRequestEscapeCards] = useState(0);
  const [tradeOfferProperties, setTradeOfferProperties] = useState<number[]>([]);
  const [tradeRequestProperties, setTradeRequestProperties] = useState<number[]>([]);

  const desktopLogsEndRef = useRef<HTMLDivElement>(null);
  const mobileLogsEndRef = useRef<HTMLDivElement>(null);
  const desktopChatEndRef = useRef<HTMLDivElement>(null);
  const mobileChatEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll game logs
  useEffect(() => {
    const scrollContainer = (el: HTMLDivElement | null) => {
      const parent = el?.parentElement;
      if (parent) {
        parent.scrollTo({ top: parent.scrollHeight, behavior: "smooth" });
      }
    };
    scrollContainer(desktopLogsEndRef.current);
    scrollContainer(mobileLogsEndRef.current);
  }, [gameState.logs.length, showMobileChatSheet]);

  const [activeTab, setActiveTab] = useState<"logs" | "chat">("logs");
  const [inGameChatMessage, setInGameChatMessage] = useState("");

  // Auto scroll chat messages
  useEffect(() => {
    const scrollContainer = (el: HTMLDivElement | null) => {
      const parent = el?.parentElement;
      if (parent) {
        parent.scrollTo({ top: parent.scrollHeight, behavior: "smooth" });
      }
    };
    scrollContainer(desktopChatEndRef.current);
    scrollContainer(mobileChatEndRef.current);
  }, [chatMessages.length, activeTab, showMobileChatSheet]);

  // Track unread chat messages
  const prevChatCountRef = useRef(chatMessages.length);
  useEffect(() => {
    if (chatMessages.length > prevChatCountRef.current) {
      if (activeTab !== "chat") {
        setUnreadChatCount(prev => prev + (chatMessages.length - prevChatCountRef.current));
      }
    }
    prevChatCountRef.current = chatMessages.length;
  }, [chatMessages, activeTab]);

  useEffect(() => {
    if (activeTab === "chat") {
      setTimeout(() => {
        setUnreadChatCount(0);
      }, 0);
    }
  }, [activeTab]);

  const handleSendInGameMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inGameChatMessage.trim()) return;
    sendChatMessage(inGameChatMessage);
    setInGameChatMessage("");
  };

  // Ensure game is initialized
  useEffect(() => {
    if (gameState.players.length === 0 || gameState.roomId !== roomId) {
      setupNewGame(4, "Rocket", roomId);
    }
  }, [roomId, setupNewGame, gameState.players.length, gameState.roomId]);

  if (gameState.players.length === 0) {
    return (
      <div className="flex flex-col min-h-screen items-center justify-center bg-slate-950 text-slate-400">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary mb-4" />
        <span className="text-xs uppercase tracking-widest">Constructing Board Room...</span>
      </div>
    );
  }

  // Token icon lookup
  const getTokenEmoji = (token: TokenType): string => {
    const map: Record<TokenType, string> = {
      Car: "🏎️",
      Dog: "🐕",
      "Top Hat": "🎩",
      Ship: "⚓",
      Cat: "🐈",
      Duck: "🦆",
      Crown: "👑",
      Rocket: "🚀"
    };
    return map[token] || "🤖";
  };



  // Render tile elements
  const renderTileLabel = (tile: Tile) => {
    const side = getTileSide(tile.index);
    if (tile.type === "START") {
      return (
        <div 
          style={{
            backgroundImage: "url('/PEStart.png')",
            backgroundSize: "100% 100%",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat"
          }}
          className="h-full w-full select-none relative"
        />
      );
    }
    if (tile.type === "DETENTION") {
      return (
        <div 
          style={{
            backgroundImage: "url('/PEDetention.png')",
            backgroundSize: "100% 100%",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat"
          }}
          className="h-full w-full select-none relative"
        />
      );
    }
    if (tile.type === "FREE_PARKING") {
      return (
        <div 
          style={{
            backgroundImage: "url('/PEParking.png')",
            backgroundSize: "100% 100%",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat"
          }}
          className="h-full w-full select-none relative"
        />
      );
    }
    if (tile.type === "GO_TO_DETENTION") {
      return (
        <div 
          style={{
            backgroundImage: "url('/PEGoToDet.png')",
            backgroundSize: "100% 100%",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat"
          }}
          className="h-full w-full select-none relative"
        />
      );
    }
    if (tile.type === "OPPORTUNITY") {
      const isSideRow = side === "left" || side === "right";
      const rotation = side === "left" ? "rotate(90deg)" : side === "right" ? "rotate(270deg)" : "none";
      
      if (isSideRow) {
        return (
          <div 
            style={{ containerType: "size" }} 
            className="w-full h-full relative overflow-hidden"
          >
            <div 
              style={{
                backgroundImage: "url('/PEOpportunity.png')",
                backgroundSize: "100% 100%",
                backgroundPosition: "center",
                backgroundRepeat: "no-repeat",
                width: "100cqh",
                height: "100cqw",
                transform: `translate(-50%, -50%) ${rotation}`,
                position: "absolute",
                top: "50%",
                left: "50%"
              }}
              className="select-none"
            />
          </div>
        );
      }
      
      return (
        <div 
          style={{
            backgroundImage: "url('/PEOpportunity.png')",
            backgroundSize: "100% 100%",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat"
          }}
          className="h-full w-full select-none relative"
        />
      );
    }
    if (tile.type === "EMPIRE") {
      const isSideRow = side === "left" || side === "right";
      const rotation = side === "left" ? "rotate(90deg)" : side === "right" ? "rotate(270deg)" : "none";
      
      if (isSideRow) {
        return (
          <div 
            style={{ containerType: "size" }} 
            className="w-full h-full relative overflow-hidden"
          >
            <div 
              style={{
                backgroundImage: "url('/PEEmpire.png')",
                backgroundSize: "100% 100%",
                backgroundPosition: "center",
                backgroundRepeat: "no-repeat",
                width: "100cqh",
                height: "100cqw",
                transform: `translate(-50%, -50%) ${rotation}`,
                position: "absolute",
                top: "50%",
                left: "50%"
              }}
              className="select-none"
            />
          </div>
        );
      }
      
      return (
        <div 
          style={{
            backgroundImage: "url('/PEEmpire.png')",
            backgroundSize: "100% 100%",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat"
          }}
          className="h-full w-full select-none relative"
        />
      );
    }
    if (tile.type === "TAX") {
      const isHorizontal = side === "left" || side === "right";
      return (
        <div className={`flex ${isHorizontal ? 'flex-row items-center justify-between px-1 py-0.5' : 'flex-col items-center justify-between px-0.5 py-0.5'} h-full w-full text-center select-none bg-secondary/10`}>
          <span className="text-sm filter drop-shadow-md">💵</span>
          <div className="flex flex-col flex-grow items-center justify-center overflow-hidden">
            <span 
              style={{ fontSize: "clamp(5.5px, 1.5cqw, 8.5px)" }}
              className="font-extrabold text-slate-grey uppercase leading-[1.05] tracking-tighter font-heading flex flex-col items-center"
            >
              {tile.name.split(" ").map((word, idx) => <span key={idx} className="block">{word}</span>)}
            </span>
            <span 
              style={{ fontSize: "clamp(6px, 1.7cqw, 9px)" }}
              className="text-red-400 font-bold mt-0.5 font-numbers"
            >
              ◈{tile.cost}
            </span>
          </div>
        </div>
      );
    }
    if (tile.type === "RAIL") {
      const owner = gameState.players.find(p => p.id === tile.ownerId);
      const isHorizontal = side === "left" || side === "right";
      const ownerColorClasses: Record<string, string> = {
        amber: "text-amber-400",
        indigo: "text-indigo-400",
        emerald: "text-emerald-400",
        rose: "text-rose-400",
        slate: "text-slate-400"
      };
      return (
        <div className={`flex ${isHorizontal ? 'flex-row items-center justify-between px-1 py-0.5' : 'flex-col items-center justify-between px-0.5 py-0.5'} h-full w-full text-center select-none bg-secondary/5`}>
          <span className="text-xs filter drop-shadow">🚉</span>
          <div className="flex flex-col flex-grow items-center justify-center overflow-hidden">
            <span 
              style={{ fontSize: "clamp(5.5px, 1.5cqw, 8.5px)" }}
              className="font-extrabold text-ivory/80 uppercase leading-[1.05] tracking-tighter font-heading flex flex-col items-center"
            >
              {tile.name.split(" ").map((word, idx) => <span key={idx} className="block">{word}</span>)}
            </span>
            {owner ? (
              <div className="flex items-center gap-0.5 justify-center mt-0.5">
                <span className={`h-1.5 w-1.5 rounded-full ${
                  owner.color === "amber" ? "bg-amber-400" :
                  owner.color === "indigo" ? "bg-indigo-400" :
                  owner.color === "emerald" ? "bg-emerald-400" :
                  owner.color === "rose" ? "bg-rose-400" : "bg-slate-400"
                }`} />
                <span 
                  style={{ fontSize: "clamp(5px, 1.5cqw, 7px)" }}
                  className={`uppercase font-black truncate max-w-[45px] leading-none ${ownerColorClasses[owner.color] || "text-accent"} hidden sm:inline`}
                >
                  {owner.name.split(" ")[0]}
                </span>
              </div>
            ) : (
              <span 
                style={{ fontSize: "clamp(6px, 1.7cqw, 9px)" }}
                className="text-accent font-bold leading-none mt-1 font-numbers"
              >
                ◈{tile.cost}
              </span>
            )}
          </div>
        </div>
      );
    }
    if (tile.type === "UTILITY") {
      const owner = gameState.players.find(p => p.id === tile.ownerId);
      const isHorizontal = side === "left" || side === "right";
      const icon = tile.index === 12 ? "⚡" : "💧";
      const ownerColorClasses: Record<string, string> = {
        amber: "text-amber-400",
        indigo: "text-indigo-400",
        emerald: "text-emerald-400",
        rose: "text-rose-400",
        slate: "text-slate-400"
      };
      return (
        <div className={`flex ${isHorizontal ? 'flex-row items-center justify-between px-1 py-0.5' : 'flex-col items-center justify-between px-0.5 py-0.5'} h-full w-full text-center select-none bg-secondary/5`}>
          <span className="text-xs filter drop-shadow">{icon}</span>
          <div className="flex flex-col flex-grow items-center justify-center overflow-hidden">
            <span 
              style={{ fontSize: "clamp(5.5px, 1.5cqw, 8.5px)" }}
              className="font-extrabold text-ivory/80 uppercase leading-[1.05] tracking-tighter font-heading flex flex-col items-center"
            >
              {tile.name.split(" ").map((word, idx) => <span key={idx} className="block">{word}</span>)}
            </span>
            {owner ? (
              <div className="flex items-center gap-0.5 justify-center mt-0.5">
                <span className={`h-1.5 w-1.5 rounded-full ${
                  owner.color === "amber" ? "bg-amber-400" :
                  owner.color === "indigo" ? "bg-indigo-400" :
                  owner.color === "emerald" ? "bg-emerald-400" :
                  owner.color === "rose" ? "bg-rose-400" : "bg-slate-400"
                }`} />
                <span 
                  style={{ fontSize: "clamp(5px, 1.5cqw, 7px)" }}
                  className={`uppercase font-black truncate max-w-[45px] leading-none ${ownerColorClasses[owner.color] || "text-accent"} hidden sm:inline`}
                >
                  {owner.name.split(" ")[0]}
                </span>
              </div>
            ) : (
              <span 
                style={{ fontSize: "clamp(6px, 1.7cqw, 9px)" }}
                className="text-accent font-bold leading-none mt-1 font-numbers"
              >
                ◈{tile.cost}
              </span>
            )}
          </div>
        </div>
      );
    }

    // Standard Property District
    const owner = gameState.players.find(p => p.id === tile.ownerId);

    // Determine flex direction and color bar placement based on board side
    let containerClass = "flex items-stretch justify-between h-full w-full relative ";
    let colorBar = null;
    let houseContainer = null;

    if (side === "bottom") {
      containerClass += "flex-col";
      colorBar = (
        <div
          className="h-2.5 w-full rounded-t-sm border-b border-charcoal tile-deed-accent"
          style={{ backgroundColor: tile.colorCode }}
        />
      );
      if (tile.houseCount > 0) {
        houseContainer = (
          <div className="absolute top-0.5 left-0.5 right-0.5 flex justify-center gap-0.5 z-20">
            {tile.houseCount === 5 ? (
              <div className="token-hotel-3d" title="Hotel" />
            ) : (
              Array.from({ length: tile.houseCount }).map((_, i) => (
                <div key={i} className="token-house-3d" title="House" />
              ))
            )}
          </div>
        );
      }
    } else if (side === "top") {
      containerClass += "flex-col-reverse";
      colorBar = (
        <div
          className="h-2.5 w-full rounded-b-sm border-t border-charcoal tile-deed-accent"
          style={{ backgroundColor: tile.colorCode }}
        />
      );
      if (tile.houseCount > 0) {
        houseContainer = (
          <div className="absolute bottom-0.5 left-0.5 right-0.5 flex justify-center gap-0.5 z-20">
            {tile.houseCount === 5 ? (
              <div className="token-hotel-3d" title="Hotel" />
            ) : (
              Array.from({ length: tile.houseCount }).map((_, i) => (
                <div key={i} className="token-house-3d" title="House" />
              ))
            )}
          </div>
        );
      }
    } else if (side === "left") {
      containerClass += "flex-row-reverse";
      colorBar = (
        <div
          className="w-2.5 h-full rounded-r-sm border-l border-charcoal tile-deed-accent"
          style={{ backgroundColor: tile.colorCode }}
        />
      );
      if (tile.houseCount > 0) {
        houseContainer = (
          <div className="absolute right-0.5 top-0.5 bottom-0.5 flex flex-col justify-center gap-0.5 z-20">
            {tile.houseCount === 5 ? (
              <div className="token-hotel-3d" title="Hotel" />
            ) : (
              Array.from({ length: tile.houseCount }).map((_, i) => (
                <div key={i} className="token-house-3d" title="House" />
              ))
            )}
          </div>
        );
      }
    } else if (side === "right") {
      containerClass += "flex-row";
      colorBar = (
        <div
          className="w-2.5 h-full rounded-l-sm border-r border-charcoal tile-deed-accent"
          style={{ backgroundColor: tile.colorCode }}
        />
      );
      if (tile.houseCount > 0) {
        houseContainer = (
          <div className="absolute left-0.5 top-0.5 bottom-0.5 flex flex-col justify-center gap-0.5 z-20">
            {tile.houseCount === 5 ? (
              <div className="token-hotel-3d" title="Hotel" />
            ) : (
              Array.from({ length: tile.houseCount }).map((_, i) => (
                <div key={i} className="token-house-3d" title="House" />
              ))
            )}
          </div>
        );
      }
    }

    const paddingClass = (side === "left" || side === "right") ? "px-1 py-0.5" : "px-0.5 py-0.5";
    const ownerColorClasses: Record<string, string> = {
      amber: "text-amber-400",
      indigo: "text-indigo-400",
      emerald: "text-emerald-400",
      rose: "text-rose-400",
      slate: "text-slate-400"
    };

    return (
      <div className={containerClass}>
        {colorBar}
        {houseContainer}

        <div className={`flex flex-col items-center justify-center flex-grow overflow-hidden ${paddingClass}`}>
          <span 
            style={{ fontSize: "clamp(5.5px, 1.5cqw, 8.5px)" }}
            className="text-ivory font-extrabold uppercase text-center w-full leading-[1.05] tracking-tighter mb-0.5 font-heading flex flex-col items-center"
          >
            {tile.name.split(" ").map((word, idx) => <span key={idx} className="block">{word}</span>)}
          </span>

          {tile.isMortgaged ? (
            <span 
              style={{ fontSize: "clamp(5px, 1.5cqw, 7px)" }}
              className="text-red-500 font-black uppercase tracking-wider flex items-center gap-0.5 font-heading"
            >
              <Lock className="h-2 w-2" /> MORT.
            </span>
          ) : owner ? (
            <div className="flex items-center gap-0.5 justify-center">
              <span className={`h-1.5 w-1.5 rounded-full ${
                owner.color === "amber" ? "bg-amber-400" :
                owner.color === "indigo" ? "bg-indigo-400" :
                owner.color === "emerald" ? "bg-emerald-400" :
                owner.color === "rose" ? "bg-rose-400" : "bg-slate-400"
              }`} />
              <span 
                style={{ fontSize: "clamp(5px, 1.5cqw, 7.2px)" }}
                className={`uppercase font-black truncate max-w-[45px] leading-none ${ownerColorClasses[owner.color] || "text-slate-400"} hidden sm:inline`}
              >
                {owner.name.split(" ")[0]}
              </span>
            </div>
          ) : (
            <span 
              style={{ fontSize: "clamp(6px, 1.7cqw, 9px)" }}
              className="text-accent font-bold font-numbers"
            >
              ◈{tile.cost}
            </span>
          )}
        </div>
      </div>
    );
  };

  // Get active border for currently landed tile detail card
  const getTileBorder = (tile: Tile) => {
    const owner = gameState.players.find(p => p.id === tile.ownerId);
    const isSelected = tile.index === gameState.selectedTileIndex;

    if (isSelected) {
      return "border-2 border-accent bg-accent/10 shadow-[0_0_15px_rgba(196,157,71,0.3)] z-20 scale-[1.01] ring-1 ring-accent/35";
    }

    const base = "border border-border/30 hover:border-accent/40 hover:bg-secondary/20 z-10 hover:z-20 hover:scale-[1.01] transition-all ";

    if (owner) {
      const colorMap: Record<string, string> = {
        amber: "border-amber-500/50 bg-amber-950/10 shadow-[inset_0_0_6px_rgba(245,158,11,0.05)]",
        indigo: "border-indigo-500/50 bg-indigo-950/10 shadow-[inset_0_0_6px_rgba(99,102,241,0.05)]",
        emerald: "border-emerald-500/50 bg-emerald-950/10 shadow-[inset_0_0_6px_rgba(16,185,129,0.05)]",
        rose: "border-rose-500/50 bg-rose-950/10 shadow-[inset_0_0_6px_rgba(244,63,94,0.05)]",
        slate: "border-slate-500/50 bg-slate-950/10 shadow-[inset_0_0_6px_rgba(100,116,139,0.05)]"
      };
      return base + (colorMap[owner.color] || "border-slate-700 bg-secondary/10");
    }

    return base + "bg-secondary/5";
  };

  const handleProposeTradeClick = () => {
    setTradeOfferCash(0);
    setTradeRequestCash(0);
    setTradeOfferEscapeCards(0);
    setTradeRequestEscapeCards(0);
    setTradeOfferProperties([]);
    setTradeRequestProperties([]);
    setShowTradeModal(true);
  };

  const submitTradeProposal = () => {
    proposeTrade(
      selectedTradePartnerId,
      {
        properties: tradeOfferProperties,
        cash: tradeOfferCash,
        escapeCards: tradeOfferEscapeCards
      },
      {
        properties: tradeRequestProperties,
        cash: tradeRequestCash,
        escapeCards: tradeRequestEscapeCards
      }
    );
    setShowTradeModal(false);
  };

  // Helper to check if trade item is selected
  const togglePropertyInTrade = (index: number, isOffer: boolean) => {
    if (isOffer) {
      setTradeOfferProperties(prev =>
        prev.includes(index) ? prev.filter(x => x !== index) : [...prev, index]
      );
    } else {
      setTradeRequestProperties(prev =>
        prev.includes(index) ? prev.filter(x => x !== index) : [...prev, index]
      );
    }
  };

  const currentLandedTile = gameState.tiles[activePlayer?.position || 0];
  const hostPlayer = gameState.players[0] || null;
  const isHost = hostPlayer && hostPlayer.id === myPlayerId;

  const renderDetailedTilePanel = () => {
    const selectedTile = gameState.tiles[gameState.selectedTileIndex] || currentLandedTile;
    return (
      <div className="glass-panel p-4 rounded-xl shadow-lg flex flex-col justify-between relative overflow-hidden">
        <div>
          <span className="text-[9px] font-black uppercase tracking-widest text-slate-grey block pb-2 border-b border-border/20 flex justify-between items-center font-heading">
            <span>BOARD SPACE OVERVIEW</span>
            <span className="text-[8px] bg-secondary border border-border/40 px-1.5 py-0.5 rounded text-slate-grey font-extrabold uppercase font-numbers">
              Index #{selectedTile.index}
            </span>
          </span>

          {/* Title Deed representation */}
          <div className="mt-3 space-y-3">
            {selectedTile.type === "PROPERTY" ? (
              <div className="border border-accent/20 bg-secondary/20 rounded-xl overflow-hidden shadow-inner">
                {/* Color bar */}
                <div
                  className="h-3.5 w-full border-b border-charcoal flex items-center justify-center tile-deed-accent"
                  style={{ backgroundColor: selectedTile.colorCode }}
                >
                  <span className="text-[7.5px] uppercase font-black tracking-widest text-charcoal bg-ivory/80 px-2.5 rounded-full py-0.2 font-heading">
                    {selectedTile.district} Group
                  </span>
                </div>

                <div className="p-3 space-y-2.5">
                  <div className="text-center">
                    <strong className="text-sm font-black text-ivory block uppercase leading-tight font-heading">{selectedTile.name}</strong>
                    <span className="text-[9px] font-bold text-slate-grey uppercase mt-0.5 block font-heading">TITLE DEED CARD</span>
                  </div>

                  {/* Rents Scale list */}
                  <div className="space-y-1 text-[10px] text-slate-grey pt-1 border-t border-border/25 font-numbers">
                    {/* Base rent */}
                    {(() => {
                      const isGroupOwned = ownsDistrict(gameState, selectedTile.ownerId || "", selectedTile.district || "");
                      const isActive = selectedTile.houseCount === 0 && !isGroupOwned && !selectedTile.isMortgaged;
                      return (
                        <div className={`flex justify-between items-center px-1.5 py-0.5 rounded transition-colors ${isActive ? 'bg-accent/15 text-accent border border-accent/20 font-bold' : ''}`}>
                          <span className="flex items-center gap-1">
                            {isActive && <ArrowRight className="h-3 w-3 animate-pulse text-accent" />}
                            <span>Base Rent:</span>
                          </span>
                          <span>
                            ◈{selectedTile.baseRent}
                          </span>
                        </div>
                      );
                    })()}

                    {/* Color Set Owned Rent */}
                    {selectedTile.baseRent && (() => {
                      const isGroupOwned = ownsDistrict(gameState, selectedTile.ownerId || "", selectedTile.district || "");
                      const isActive = selectedTile.houseCount === 0 && isGroupOwned && !selectedTile.isMortgaged;
                      return (
                        <div className={`flex justify-between items-center px-1.5 py-0.5 rounded transition-colors ${isActive ? 'bg-accent/15 text-accent border border-accent/20 font-bold' : ''}`}>
                          <span className="flex items-center gap-1">
                            {isActive && <ArrowRight className="h-3 w-3 animate-pulse text-accent" />}
                            <span>If Color Set Owned:</span>
                          </span>
                          <span className={isGroupOwned ? "text-emerald-400 font-bold" : ""}>
                            ◈{selectedTile.baseRent * 2} {isGroupOwned && <span className="text-[8px] text-emerald-400 ml-1 font-bold font-heading">x2 Owned</span>}
                          </span>
                        </div>
                      );
                    })()}

                    {/* House rents */}
                    {selectedTile.houseRents?.map((hRent, idx) => {
                      const isActive = selectedTile.houseCount === (idx + 1) && !selectedTile.isMortgaged;
                      
                      const rendersHouseBlocks = idx === 4 ? (
                        <div className="token-hotel-3d inline-block ml-1" />
                      ) : (
                        <div className="flex gap-0.5 items-center inline-flex ml-1">
                          {Array.from({ length: idx + 1 }).map((_, i) => (
                            <div key={i} className="token-house-3d" />
                          ))}
                        </div>
                      );

                      const label = idx === 4 ? "With Luxury Hotel:" : `With ${idx + 1} House${idx > 0 ? 's' : ''}:`;
                      const colorClass = idx === 4 ? "text-red-400 font-extrabold" : "text-ivory/80";

                      return (
                        <div key={idx} className={`flex justify-between items-center px-1.5 py-0.5 rounded transition-colors ${isActive ? 'bg-accent/15 text-accent border border-accent/20 font-bold' : ''}`}>
                          <span className="flex items-center gap-1">
                            {isActive && <ArrowRight className="h-3 w-3 animate-pulse text-accent" />}
                            <span className="flex items-center gap-1">
                              <span>{label}</span>
                              {rendersHouseBlocks}
                            </span>
                          </span>
                          <span className={colorClass}>◈{hRent}</span>
                        </div>
                      );
                    })}

                    {/* Luxury Hotel Rent item explicitly if houseRents didn't cover 5 elements */}
                    {(!selectedTile.houseRents || selectedTile.houseRents.length < 5) && selectedTile.hotelRent && (
                      (() => {
                        const isActive = selectedTile.houseCount === 5 && !selectedTile.isMortgaged;
                        return (
                          <div className={`flex justify-between items-center px-1.5 py-0.5 rounded transition-colors ${isActive ? 'bg-accent/15 text-accent border border-accent/20 font-black' : ''}`}>
                            <span className="flex items-center gap-1">
                              {isActive && <ArrowRight className="h-3 w-3 animate-pulse text-accent" />}
                              <span className="font-extrabold uppercase text-[8.5px] text-red-400 font-heading">With Hotel:</span>
                              <div className="token-hotel-3d inline-block ml-1" />
                            </span>
                            <span className="font-extrabold text-red-400">◈{selectedTile.hotelRent}</span>
                          </div>
                        );
                      })()
                    )}
                  </div>

                  {/* Upgrade costs info */}
                  <div className="pt-2 border-t border-border/20 text-[9px] text-slate-grey flex justify-between uppercase font-bold font-numbers">
                    <span>House Cost: ◈{selectedTile.houseCost}</span>
                    <span>Mortgage Value: ◈{selectedTile.mortgageValue}</span>
                  </div>
                </div>
              </div>
            ) : (
              // Other tiles layout (Rail terminals, Utilities, and special spaces)
              <div className="border border-border/40 bg-secondary/40 rounded-xl p-3 space-y-3">
                <div className="flex justify-between items-center">
                  <strong className="text-sm font-black text-ivory uppercase font-heading">{selectedTile.name}</strong>
                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 border rounded font-heading ${
                    selectedTile.type === "OPPORTUNITY" || selectedTile.type === "EMPIRE" || selectedTile.type === "START"
                      ? "border-emerald-500/30 bg-emerald-950/20 text-emerald-400"
                      : selectedTile.type === "TAX" || selectedTile.type === "GO_TO_DETENTION"
                        ? "border-red-500/30 bg-red-950/20 text-red-400"
                        : "border-border/30 bg-secondary text-ivory"
                  }`}>
                    {selectedTile.type}
                  </span>
                </div>

                <div className="space-y-2 text-xs text-slate-grey pt-1.5 border-t border-border/20 font-sans">
                  {/* Special Descriptions for Rewards & Penalties */}
                  {selectedTile.type === "OPPORTUNITY" && (
                    <div className="space-y-1">
                      <span className="text-[10px] font-extrabold uppercase tracking-wide text-emerald-450 block font-heading">Space Type: Opportunity Reward</span>
                      <p className="text-ivory/90 leading-relaxed">
                        Landing here draws a random Opportunity card. Rewards include corporate tax refunds (◈150) or escape detention cards, while hazards include regulatory fines (◈150).
                      </p>
                    </div>
                  )}

                  {selectedTile.type === "EMPIRE" && (
                    <div className="space-y-1">
                      <span className="text-[10px] font-extrabold uppercase tracking-wide text-emerald-450 block font-heading">Space Type: Empire Payout</span>
                      <p className="text-ivory/90 leading-relaxed">
                        Landing here draws a powerful Empire card. Executed actions allow you to run Hostile Takeovers to steal ◈150 from the wealthiest opponent or collect syndicate dividends.
                      </p>
                    </div>
                  )}

                  {selectedTile.type === "TAX" && (
                    <div className="space-y-1">
                      <span className="text-[10px] font-extrabold uppercase tracking-wide text-red-400 block font-heading">Space Type: Asset Penalty</span>
                      <p className="text-ivory/90 leading-relaxed">
                        Requires paying an asset surcharge fee directly back to the reserve bank. Landing on the Wealth Levy charges a fee of ◈200, while the Luxury Surcharge costs ◈100.
                      </p>
                    </div>
                  )}

                  {selectedTile.type === "GO_TO_DETENTION" && (
                    <div className="space-y-1">
                      <span className="text-[10px] font-extrabold uppercase tracking-wide text-red-400 block font-heading">Space Type: Detention Arrest</span>
                      <p className="text-ivory/90 leading-relaxed">
                        Immediately arrests your token and moves you directly to the Detention Center. You cannot pass START or collect your ◈200 salary payload.
                      </p>
                    </div>
                  )}

                  {selectedTile.type === "DETENTION" && (
                    <div className="space-y-1">
                      <span className="text-[10px] font-extrabold uppercase tracking-wide text-amber-500 block font-heading">Space Type: Custody</span>
                      <p className="text-ivory/90 leading-relaxed">
                        Holds arrested players. If you land here by normal roll, you are &ldquo;Just Visiting&rdquo; for free. If sent to Detention, you must pay a ◈50 fine, use an Escape card, or roll doubles to exit.
                      </p>
                    </div>
                  )}

                  {selectedTile.type === "FREE_PARKING" && (
                    <div className="space-y-1">
                      <span className="text-[10px] font-extrabold uppercase tracking-wide text-slate-grey block font-heading">Space Type: Safe Zone</span>
                      <p className="text-ivory/90 leading-relaxed">
                        A neutral rest zone. No rents, fees, card drawings, or detention risks are triggered. Relax here until your next turn.
                      </p>
                    </div>
                  )}

                  {selectedTile.type === "START" && (
                    <div className="space-y-1">
                      <span className="text-[10px] font-extrabold uppercase tracking-wide text-emerald-450 block font-heading">Space Type: Salary Payload</span>
                      <p className="text-ivory/90 leading-relaxed">
                        Represents the beginning space. Landing on or passing START automatically credits your ledger with a ◈200 corporate salary payout.
                      </p>
                    </div>
                  )}

                  {selectedTile.type === "UTILITY" && (
                    <div className="space-y-1">
                      <span className="text-[10px] font-extrabold uppercase tracking-wide text-accent block font-heading">Space Type: Utility Grid</span>
                      <p className="text-ivory/90 leading-relaxed">
                        Rent scales dynamically with the dice roll that landed on this space. Owning 1 Utility rents 4x the dice sum; owning both utilities rents 10x the dice sum.
                      </p>
                    </div>
                  )}

                  {selectedTile.type === "RAIL" && (
                    <div className="space-y-1">
                      <span className="text-[10px] font-extrabold uppercase tracking-wide text-accent block font-heading">Space Type: Rail Terminal</span>
                      <p className="text-ivory/90 leading-relaxed">
                        Provides transport connectivity rent. Rent increases with the number of terminals you own: 1 terminal (◈25), 2 terminals (◈50), 3 terminals (◈100), or all 4 terminals (◈200).
                      </p>
                    </div>
                  )}

                  {/* Render normal properties for Rail and Utilities */}
                  {(selectedTile.type === "RAIL" || selectedTile.type === "UTILITY") && (
                    <div className="space-y-1.5 font-numbers text-[11px]">
                      {selectedTile.cost && (
                        <div className="flex justify-between">
                          <span>Standard Purchase Cost:</span>
                          <strong className="text-ivory">◈{selectedTile.cost}</strong>
                        </div>
                      )}

                      {(selectedTile.baseRent || selectedTile.type === "UTILITY") && (
                        <div className="flex justify-between">
                          <span>Base Rent / Factor:</span>
                          <strong className="text-ivory">
                            {selectedTile.type === "RAIL"
                              ? "◈25 (1 Rail) to ◈200 (4 Rails)"
                              : "4x / 10x Dice value"}
                          </strong>
                        </div>
                      )}

                      {selectedTile.ownerId && (
                        <div className="flex justify-between text-accent font-bold">
                          <span>Landed Rent Value:</span>
                          <span>
                            ◈{calculateRent(selectedTile, gameState.players.find(p => p.id === selectedTile.ownerId)!, gameState).toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Owner info strip */}
            {(selectedTile.type === "PROPERTY" || selectedTile.type === "RAIL" || selectedTile.type === "UTILITY") && (
              <div className="text-xs text-slate-grey space-y-1 bg-secondary/30 p-2 rounded-lg border border-border/20">
                <div className="flex justify-between items-center">
                  <span>Current Owner:</span>
                  {selectedTile.ownerId ? (
                    <strong className="text-ivory uppercase font-black">
                      {gameState.players.find(o => o.id === selectedTile.ownerId)?.name}
                    </strong>
                  ) : (
                    <strong className="text-emerald-450 font-extrabold uppercase text-[9px]">Available (Unowned)</strong>
                  )}
                </div>

                {selectedTile.isMortgaged && (
                  <div className="text-center font-black uppercase text-red-500 tracking-wider text-[9px] bg-red-500/10 border border-red-500/20 py-0.5 rounded mt-1 flex items-center justify-center gap-1">
                    <Lock className="h-3 w-3" /> Property Mortgaged
                  </div>
                )}
              </div>
            )}

            {/* Direct Action buttons inline inside sidebar card */}
            {selectedTile.ownerId === myPlayerId && (
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/20">
                {selectedTile.isMortgaged ? (
                  <button
                    onClick={() => unmortgageProperty(selectedTile.index)}
                    disabled={humanPlayer.balance < (selectedTile.unmortgageValue || 50)}
                    className="col-span-2 py-2.5 btn-game-success rounded-lg text-[9px] font-bold uppercase tracking-wider flex items-center justify-center gap-1 transition-all disabled:opacity-40 cursor-pointer font-heading"
                  >
                    <Unlock className="h-3.5 w-3.5" /> Unmortgage (-◈{selectedTile.unmortgageValue})
                  </button>
                ) : (
                  <>
                    {/* Mortgage or Sell Building */}
                    {selectedTile.houseCount > 0 ? (() => {
                      const districtTiles = gameState.tiles.filter(dt => dt.district === selectedTile.district);
                      const maxHouses = Math.max(...districtTiles.map(dt => dt.houseCount));
                      const canSell = selectedTile.houseCount === maxHouses;
                      return (
                        <button
                          onClick={() => sellHouse(selectedTile.index)}
                          disabled={!canSell}
                          title={!canSell ? "Even selling rule: You must sell houses from properties with the most houses first." : ""}
                          className={`py-2.5 btn-game-danger rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center justify-center gap-0.5 transition-all font-heading ${
                            !canSell ? "opacity-40 cursor-not-allowed" : "cursor-pointer hover:bg-red-650"
                          }`}
                        >
                          Sell {selectedTile.houseCount === 5 ? "Hotel" : "House"} (+◈{Math.floor((selectedTile.houseCost || 100) / 2)})
                        </button>
                      );
                    })() : (
                      <button
                        onClick={() => mortgageProperty(selectedTile.index)}
                        className="py-2.5 btn-game-danger rounded-lg text-[9px] font-bold uppercase tracking-wider flex items-center justify-center gap-1 transition-all cursor-pointer font-heading"
                      >
                        <Lock className="h-3.5 w-3.5" /> Mortgage (+◈{selectedTile.mortgageValue})
                      </button>
                    )}

                    {/* Build House / Hotel */}
                    {(() => {
                      const groupOwned = ownsDistrict(gameState, myPlayerId, selectedTile.district || "");
                      const districtTiles = gameState.tiles.filter(t => t.district === selectedTile.district);
                      const minHouses = Math.min(...districtTiles.map(t => t.houseCount));

                      if (selectedTile.type !== "PROPERTY") return null;

                      if (groupOwned && selectedTile.houseCount < 4) {
                        const canBuild = selectedTile.houseCount === minHouses;
                        return (
                          <button
                            onClick={() => buildHouse(selectedTile.index)}
                            disabled={!canBuild || humanPlayer.balance < (selectedTile.houseCost || 100)}
                            className="py-2.5 btn-game-primary rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center justify-center gap-0.5 transition-all cursor-pointer font-heading"
                            title={!canBuild ? "Must build evenly! Place houses on other properties first." : ""}
                          >
                            + House (◈{selectedTile.houseCost})
                          </button>
                        );
                      }

                      if (groupOwned && selectedTile.houseCount === 4) {
                        const allHave4 = districtTiles.every(t => t.houseCount >= 4);
                        return (
                          <button
                            onClick={() => buildHotel(selectedTile.index)}
                            disabled={!allHave4 || humanPlayer.balance < (selectedTile.houseCost || 100)}
                            className="py-2.5 bg-gradient-to-r from-red-700 to-red-600 hover:from-red-650 hover:to-red-550 border border-red-500/30 text-ivory rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center justify-center gap-0.5 transition-all cursor-pointer font-heading shadow-md"
                            title={!allHave4 ? "Must build evenly! All properties must have 4 houses." : ""}
                          >
                            + Hotel (◈{selectedTile.houseCost})
                          </button>
                        );
                      }

                      return (
                        <button
                          disabled
                          className="py-2.5 border border-border/30 bg-secondary/30 text-slate-grey/60 rounded-lg text-[9px] font-bold uppercase cursor-not-allowed font-heading"
                          title="You must own all properties in this color group to build houses."
                        >
                          Needs Group
                        </button>
                      );
                    })()}
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        <button
          onClick={() => setSelectedPropTile(selectedTile)}
          className="w-full mt-4 py-2 btn-game-secondary text-xs font-bold uppercase tracking-wider text-accent rounded-lg cursor-pointer flex items-center justify-center gap-1.5 font-heading"
        >
          Inspect Asset Details
        </button>
      </div>
    );
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      {/* MAIN VIEWPORT */}
      <main className="flex-1 w-full mx-auto px-2 sm:px-4 py-4 sm:py-6 relative">

        {/* DESKTOP LAYOUT (xl:grid) */}
        <div className="hidden xl:grid grid-cols-12 gap-6 items-stretch w-full h-full">

          {/* ======================================= */}
          {/* 1. LEFT SIDEBAR: PLAYERS LIST (3 Cols) */}
          {/* ======================================= */}
          <section className="xl:col-span-3 space-y-4 flex flex-col justify-start">
          <div className="glass-panel p-4 rounded-xl space-y-3 flex-grow shadow-lg">
            <h3 className="text-xs font-black uppercase text-ivory tracking-wider pb-2 border-b border-border/20 flex items-center justify-between font-heading">
              <span>LOBBY SHAREHOLDERS</span>
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            </h3>

            <div className="space-y-3">
              {gameState.players.map((pl, idx) => {
                const isActive = idx === gameState.activePlayerIndex;
                const ownedProps = gameState.tiles.filter(t => t.ownerId === pl.id && !t.isMortgaged);
                const mortgagedProps = gameState.tiles.filter(t => t.ownerId === pl.id && t.isMortgaged);

                return (
                  <div
                    key={pl.id}
                    className={`p-3 rounded-xl border relative transition-all ${isActive
                      ? "border-accent bg-accent/5 shadow-md shadow-accent/5 scale-[1.02]"
                      : "border-border/30 bg-secondary/30"
                      } ${pl.isBankrupt ? "opacity-45" : ""}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="h-9 w-9 rounded-full bg-secondary border border-border/40 flex items-center justify-center text-lg shadow-inner">
                          {pl.avatar}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-xs text-ivory">{pl.name}</span>
                            <span className={`h-1.5 w-1.5 rounded-full ${pl.isOnline ? "bg-emerald-500" : "bg-slate-500"}`} />
                          </div>
                          <span className="text-[10px] text-accent font-bold uppercase tracking-wider block mt-0.5 font-numbers">
                            Token: {pl.token} {getTokenEmoji(pl.token)}
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <strong className="text-sm font-black text-ivory block font-numbers">
                          ◈{pl.balance.toLocaleString()}
                        </strong>
                        {pl.isBankrupt ? (
                          <span className="text-[8px] font-black uppercase text-red-500 bg-red-500/10 border border-red-500/20 px-1 rounded font-heading">BANKRUPT</span>
                        ) : pl.inDetention ? (
                          <span className="text-[8px] font-black uppercase text-yellow-500 bg-yellow-500/10 border border-yellow-500/20 px-1 rounded font-heading">DETENTION</span>
                        ) : null}
                      </div>
                    </div>

                    {/* Quick portfolio count footer */}
                    {!pl.isBankrupt && (
                      <div className="mt-2.5 pt-2 border-t border-border/20 flex justify-between text-[8px] font-extrabold uppercase text-slate-grey font-numbers">
                        <div>Owned: <span className="text-ivory">{ownedProps.length} props</span></div>
                        {mortgagedProps.length > 0 && (
                          <div className="text-red-400">Mortgaged: <span>{mortgagedProps.length}</span></div>
                        )}
                        <div>Escape Cards: <span className="text-ivory">{pl.escapeCardsCount}</span></div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Quick in-game guides panel */}
            <div className="bg-secondary/20 border border-border/30 rounded-xl p-3.5 mt-4 text-xs text-slate-grey space-y-2.5">
              <div className="flex items-center gap-1.5 text-ivory font-bold uppercase tracking-wider text-[10px] font-heading">
                <HelpCircle className="h-3.5 w-3.5 text-accent" />
                <span>QUICK RULES NOTE</span>
              </div>
              <p className="leading-relaxed text-[11px] font-sans">
                Owning all properties in a color group double the base rent. Build Houses to leverage rent multipliers. Mortgaged spaces gather no rent.
              </p>
              <button
                onClick={() => setShowRulesModal(true)}
                className="inline-flex items-center gap-0.5 text-xs text-accent hover:text-gold-light uppercase font-bold tracking-wider pt-1 border-none bg-transparent outline-none cursor-pointer text-left font-heading"
              >
                Full Game Manual
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          </section>

        {/* ======================================= */}
        {/* 2. CENTER PIECE: THE 2D GRID BOARD (6 Cols) */}
        {/* ======================================= */}
        <section className="xl:col-span-6 flex flex-col items-center justify-start gap-4">
          <div className="w-full relative aspect-square">
            {/* The 11x11 Grid Board container */}
            <div className="grid-board w-full h-full bg-charcoal p-1.5 rounded-2xl border border-border/30 relative shadow-2xl overflow-hidden select-none">

              {/* RENDER ALL 40 SPACES */}
              {gameState.tiles.map((tile) => {
                const pos = getGridPosition(tile.index);
                const landedPlayers = gameState.players.filter(pl => pl.position === tile.index && !pl.isBankrupt);

                return (
                  <div
                    key={tile.index}
                    onClick={() => setSelectedTileIndex(tile.index)}
                    style={{ gridRow: pos.row, gridColumn: pos.col }}
                    className={`w-full h-full relative cursor-pointer overflow-hidden transition-all flex flex-col justify-between ${getTileBorder(tile)}`}
                  >
                    {/* Render tile labels */}
                    {renderTileLabel(tile)}

                    {/* RENDER PLAYER TOKENS ON TILE */}
                    {landedPlayers.length > 0 && (
                      <div className="absolute bottom-1 right-1 z-10 flex flex-wrap-reverse justify-end gap-0.5 max-w-[80%] pointer-events-none">
                        {landedPlayers.map(p => (
                          <span
                            key={p.id}
                            title={p.name}
                            className={`h-4.5 w-4.5 rounded-full border border-slate-100 flex items-center justify-center text-[10px] shadow-md transition-transform hover:scale-110 ${p.color === "amber" ? "bg-gradient-to-br from-amber-400 to-amber-600" :
                              p.color === "indigo" ? "bg-gradient-to-br from-indigo-400 to-indigo-600" :
                                p.color === "emerald" ? "bg-gradient-to-br from-emerald-400 to-emerald-600" :
                                  p.color === "rose" ? "bg-gradient-to-br from-rose-400 to-rose-600" : "bg-slate-500"
                              } animate-bounce-short`}
                          >
                            {getTokenEmoji(p.token)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* CENTRAL LOGO & STATS FIELD (occupies center coordinates 2 to 10) */}
              <div
                style={{
                  gridRow: "2 / 11",
                  gridColumn: "2 / 11",
                  backgroundImage: "linear-gradient(rgba(9, 10, 13, 0.45), rgba(9, 10, 13, 0.45)), url('/PEBoard.png')",
                  backgroundSize: "cover",
                  backgroundPosition: "center"
                }}
                className="m-4 border border-border/30 rounded-xl p-6 flex flex-col justify-between items-center text-center shadow-inner relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(196,157,71,0.04)_0%,transparent_60%)] pointer-events-none" />

                {/* Game code info */}
                <div className="flex items-center gap-1 bg-secondary/60 border border-border/40 px-3 py-1 rounded-full text-[10px] text-slate-grey font-semibold uppercase tracking-wider font-numbers">
                  <span>ROOM: {roomId}</span>
                </div>

                <div className="mt-8 flex flex-col items-center">
                  <img
                    src="/PELogo.png"
                    alt="PROPEMPIRE Logo"
                    className="h-14 w-auto object-contain mb-2 filter drop-shadow-[0_0_8px_rgba(196,157,71,0.15)]"
                  />
                  <p className="text-[10px] text-slate-grey uppercase font-black tracking-widest font-heading">
                    BUILD. TRADE. DOMINATE.
                  </p>
                </div>

                {/* Active Player and Turn State Indicators (Replacing "Ready for Player Decisions") */}
                <div className="my-6 min-h-[40px] flex items-center justify-center">
                  {activePlayer && (
                    <div className="inline-flex flex-col items-center gap-1.5 bg-charcoal/90 border border-border/40 px-5 py-3 rounded-xl shadow-lg backdrop-blur-sm relative overflow-hidden group min-w-[200px]">
                      {/* Decorative gradient top light */}
                      <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-accent/30 to-transparent" />
                      
                      {/* Active Player Name & Avatar Info */}
                      <div className="flex items-center gap-2">
                        <span className="text-sm animate-bounce-short">{activePlayer.avatar}</span>
                        <span className="text-[10px] font-black uppercase text-ivory tracking-wider font-heading">
                          {activePlayer.id === myPlayerId ? "YOUR TURN" : `${activePlayer.name.toUpperCase()}'S TURN`}
                        </span>
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      </div>

                      {/* Step Indicator & Turn Timer */}
                      <div className="flex items-center gap-3 mt-0.5 font-numbers">
                        {/* Dynamic Step Badges (Rolling / Thinking) */}
                        {(() => {
                          const isRollingStep = isRolling || !gameState.hasRolledThisTurn;
                          const label = isRollingStep ? "Rolling" : (botStatusText || "Thinking");
                          const colorClasses = isRollingStep
                            ? "bg-amber-500/10 border-amber-500/20 text-amber-450"
                            : "bg-emerald-500/10 border-emerald-500/20 text-emerald-450";
                          return (
                            <span className={`px-2 py-0.5 border rounded text-[9px] font-black uppercase tracking-wider ${colorClasses}`}>
                              {label}
                            </span>
                          );
                        })()}

                        {/* Turn Timer Badge */}
                        <div className="flex items-center gap-1 bg-secondary/80 border border-border/50 px-2 py-0.5 rounded text-[9px] font-bold text-ivory font-numbers">
                          <Clock className="h-3 w-3 text-accent animate-pulse" />
                          <span>{gameState.turnTimer}s</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Mini portfolio summary */}
                <div className="w-[85%] max-w-sm bg-charcoal/90 border border-border/40 px-6 py-3 rounded-xl shadow-lg flex justify-around text-slate-grey font-numbers gap-6">
                  <div className="text-center">
                    <span className="text-[9px] uppercase font-bold text-slate-grey tracking-wider block font-heading">Your Balance</span>
                    <strong className="text-lg font-black text-accent mt-0.5 block">◈{humanPlayer?.balance.toLocaleString()}</strong>
                  </div>
                  <div className="w-[1px] bg-border/40" />
                  <div className="text-center">
                    <span className="text-[9px] uppercase font-bold text-slate-grey tracking-wider block font-heading">Portfolio Assets</span>
                    <strong className="text-lg font-black text-accent mt-0.5 block">
                      {gameState.tiles.filter(t => t.ownerId === myPlayerId).length} Spaces
                    </strong>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ======================================= */}
        {/* 3. RIGHT SIDEBAR: DICE, TURN & LOGS (3 Cols) */}
        {/* ======================================= */}
        <section className="xl:col-span-3 space-y-4 flex flex-col justify-start">
          {/* CURRENT TURN PANEL */}
          <div className="glass-panel p-4 rounded-xl shadow-lg relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[9px] font-bold text-slate-grey uppercase tracking-widest block font-numbers">ACTIVE SHAREHOLDER</span>
                <strong className="text-sm font-black text-accent uppercase flex items-center gap-1.5 mt-0.5 font-heading">
                  <span>{activePlayer?.name}</span>
                </strong>
              </div>

              {/* Countdown timer circular/badge representation */}
              <div className="flex items-center gap-1.5 bg-secondary/80 px-2.5 py-1.5 rounded-lg border border-border/40">
                <Clock className="h-3.5 w-3.5 text-accent" />
                <span className="text-xs font-extrabold text-ivory font-numbers">{gameState.turnTimer}s</span>
              </div>
            </div>
          </div>

          {/* DICE PANEL */}
          <div className="glass-panel p-4 rounded-xl shadow-lg text-center flex flex-col items-center">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-grey mb-3 block font-heading">ROLL BOARD DICE</span>

            {/* 3D-like Dice animations block */}
            <div className="flex justify-center gap-5 my-2">
              <div className={`h-14 w-14 rounded-xl bg-gradient-to-br from-ivory to-slate-200 border-2 border-accent/70 flex items-center justify-center text-charcoal text-2xl font-black shadow-lg transition-all font-numbers ${isRolling ? "animate-dice-shake scale-110" : ""}`}>
                {gameState.dice[0]}
              </div>
              <div className={`h-14 w-14 rounded-xl bg-gradient-to-br from-ivory to-slate-200 border-2 border-accent/70 flex items-center justify-center text-charcoal text-2xl font-black shadow-lg transition-all font-numbers ${isRolling ? "animate-dice-shake scale-110" : ""}`}>
                {gameState.dice[1]}
              </div>
            </div>

            {/* Turn roll button controls */}
            {activePlayer && !activePlayer.isBot ? (
              <div className="w-full mt-4 flex gap-2">
                {activePlayer.inDetention ? (
                  <>
                    <button
                      onClick={tryDoubleRoll}
                      disabled={gameState.hasRolledThisTurn || isRolling}
                      className="flex-1 py-3 text-[10px] font-bold uppercase tracking-wider btn-game-secondary rounded-xl cursor-pointer font-heading"
                    >
                      Roll Doubles
                    </button>
                    <button
                      onClick={payDetentionFine}
                      disabled={gameState.hasRolledThisTurn || activePlayer.balance < 50}
                      className="flex-1 py-3 text-[10px] font-bold uppercase tracking-wider btn-game-primary rounded-xl cursor-pointer font-heading"
                    >
                      Pay $50 Fine
                    </button>
                  </>
                ) : (
                  <button
                    onClick={rollDice}
                    disabled={gameState.hasRolledThisTurn || isRolling}
                    className={`w-full py-3.5 text-xs font-black uppercase tracking-widest rounded-xl btn-game-primary cursor-pointer font-heading ${
                      gameState.turnTimer <= 5 ? "animate-critical-glow" : ""
                    }`}
                  >
                    {isRolling ? "Rolling..." : "Roll Game Dice"}
                  </button>
                )}
              </div>
            ) : (
              <div className="mt-4 p-3 bg-secondary/25 rounded-xl border border-border/30 text-xs text-slate-grey/80 italic font-medium font-sans">
                Awaiting AI roll resolution...
              </div>
            )}
          </div>

          {/* DETAILED CURRENT TILE PANEL (Title Deed Card layout) */}
          {renderDetailedTilePanel()}

          {/* LOGS & CHAT TABS PANEL */}
          <div className="glass-panel rounded-xl p-4 h-[250px] flex flex-col overflow-hidden shadow-lg">
            <div className="flex border-b border-border/20 mb-2">
              <button
                onClick={() => setActiveTab("logs")}
                className={`flex-1 pb-2 text-[10px] font-black uppercase tracking-wider text-center transition-all font-heading ${activeTab === "logs"
                  ? "text-accent border-b-2 border-accent"
                  : "text-slate-grey hover:text-ivory"
                  }`}
              >
                Match Logs
              </button>
              <button
                onClick={() => setActiveTab("chat")}
                className={`flex-1 pb-2 text-[10px] font-black uppercase tracking-wider text-center transition-all flex items-center justify-center gap-1.5 font-heading ${activeTab === "chat"
                  ? "text-accent border-b-2 border-accent"
                  : "text-slate-grey hover:text-ivory"
                  }`}
              >
                <span>Boardroom Chat</span>
                {unreadChatCount > 0 && (
                  <span className="bg-red-500 text-ivory text-[8px] font-black px-1.5 py-0.5 rounded-full animate-bounce font-numbers">
                    {unreadChatCount}
                  </span>
                )}
              </button>
            </div>

            {activeTab === "logs" ? (
              <div className="flex-1 overflow-y-auto py-1 space-y-2 scrollbar-thin">
                {gameState.logs.map((log) => (
                  <div key={log.id} className="text-[11px] leading-relaxed">
                    <span className="text-slate-grey/60 font-medium mr-1.5 font-numbers">[{log.timestamp}]</span>
                    <span className={`font-semibold ${log.type === "rent" ? "text-red-400" :
                      log.type === "buy" ? "text-emerald-450" :
                        log.type === "card" ? "text-amber-400" :
                          log.type === "jail" ? "text-yellow-500" :
                            log.type === "bankruptcy" ? "text-red-500 font-bold" : "text-ivory/80"
                      }`}>{log.message.replaceAll("$", "◈")}</span>
                  </div>
                ))}
                <div ref={desktopLogsEndRef} />
              </div>
            ) : (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-grow overflow-y-auto py-1 min-h-0 flex flex-col scrollbar-thin">
                  {chatMessages.length === 0 ? (
                    <div className="text-slate-grey/60 text-center text-[10px] italic py-4">No boardroom messages. Type below to alert players.</div>
                  ) : (
                    chatMessages.map((msg, index) => {
                      const showSender = index === 0 || chatMessages[index - 1].sender !== msg.sender;
                      return (
                        <div key={msg.id} className={`text-[11px] leading-normal ${index === 0 ? "mt-0" : showSender ? "mt-2" : "mt-0.5"}`}>
                          <span className="text-slate-grey/60 font-medium mr-1.5 font-numbers">[{msg.timestamp}]</span>
                          {showSender && (
                            <span className={`font-extrabold mr-1 ${msg.sender === (humanPlayer?.name || "You")
                              ? "text-accent"
                              : "text-slate-350"
                              }`}>{msg.sender}:</span>
                          )}
                          <span className="text-ivory/95">{msg.text}</span>
                        </div>
                      );
                    })
                  )}
                  <div ref={desktopChatEndRef} />
                </div>
                <form onSubmit={handleSendInGameMessage} className="mt-2 flex gap-1.5 pt-1.5 border-t border-border/20">
                  <input
                    type="text"
                    placeholder="Alert shareholders..."
                    value={inGameChatMessage}
                    onChange={(e) => setInGameChatMessage(e.target.value)}
                    className="flex-grow bg-secondary/85 border border-border/40 rounded px-2.5 py-1.5 text-xs text-ivory placeholder-slate-grey/40 outline-none focus:border-accent/50"
                  />
                  <button
                    type="submit"
                    className="p-1 px-3 btn-game-primary rounded text-xs font-bold cursor-pointer font-heading"
                  >
                    Send
                  </button>
                </form>
              </div>
            )}
          </div>
          </section>
        </div>

      {/* ======================================= */}
      {/* 4. BOTTOM ACTION PANEL (Context-aware) */}
      {/* ======================================= */}
      <footer className="hidden xl:block border-t border-border bg-card/80 backdrop-blur-md sticky bottom-0 z-40 p-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">

          {/* Quick instructions status */}
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-primary animate-ping" />
            <span className="text-xs text-slate-300 font-bold uppercase tracking-wider">
              {activePlayer?.id === myPlayerId ? "Your Action Turn Decision Needed" : `Waiting for ${activePlayer?.name}`}
            </span>
          </div>

          {/* Decision actions panel */}
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            {activePlayer && activePlayer.id === myPlayerId && (
              <>
                {/* Landing actions */}
                {(!currentLandedTile.ownerId && (currentLandedTile.type === "PROPERTY" || currentLandedTile.type === "RAIL" || currentLandedTile.type === "UTILITY")) && (
                  <>
                    <button
                      onClick={buyProperty}
                      disabled={humanPlayer.balance < (currentLandedTile.cost || 0)}
                      className="px-5 py-3 text-xs uppercase tracking-wider font-bold btn-game-primary rounded-xl shadow-lg font-heading"
                    >
                      Buy for ◈{currentLandedTile.cost}
                    </button>
                    <button
                      onClick={startAuction}
                      className="px-5 py-3 text-xs uppercase tracking-wider font-bold btn-game-secondary rounded-xl font-heading"
                    >
                      Auction Space
                    </button>
                  </>
                )}

                {/* Upgrade options if user owns the district */}
                {ownsDistrict(gameState, myPlayerId, currentLandedTile.district || "") && currentLandedTile.ownerId === myPlayerId && currentLandedTile.houseCount < 4 && (
                  <button
                    onClick={() => buildHouse(currentLandedTile.index)}
                    disabled={humanPlayer.balance < (currentLandedTile.houseCost || 100)}
                    className="px-5 py-3 text-xs uppercase tracking-wider font-bold btn-game-success rounded-xl flex items-center gap-1 font-heading"
                  >
                    <Building className="h-4 w-4" />
                    Build House (◈{currentLandedTile.houseCost})
                  </button>
                )}

                {ownsDistrict(gameState, myPlayerId, currentLandedTile.district || "") && currentLandedTile.ownerId === myPlayerId && currentLandedTile.houseCount === 4 && (
                  <button
                    onClick={() => buildHotel(currentLandedTile.index)}
                    disabled={humanPlayer.balance < (currentLandedTile.houseCost || 100)}
                    className="px-5 py-3 text-xs uppercase tracking-wider font-bold bg-gradient-to-br from-indigo-700 to-indigo-900 border border-indigo-500 text-slate-100 hover:brightness-110 active:translate-y-px rounded-xl flex items-center gap-1 transition-all shadow-md font-heading"
                  >
                    <Building2 className="h-4 w-4" />
                    Build Hotel (◈{currentLandedTile.houseCost})
                  </button>
                )}

                {/* Mortgage options */}
                {currentLandedTile.ownerId === myPlayerId && !currentLandedTile.isMortgaged && (
                  <button
                    onClick={() => mortgageProperty(currentLandedTile.index)}
                    className="px-5 py-3 text-xs uppercase tracking-wider font-bold btn-game-danger rounded-xl flex items-center gap-1 font-heading"
                  >
                    <Lock className="h-4 w-4" />
                    Mortgage (+◈{currentLandedTile.mortgageValue})
                  </button>
                )}

                {currentLandedTile.ownerId === myPlayerId && currentLandedTile.isMortgaged && (
                  <button
                    onClick={() => unmortgageProperty(currentLandedTile.index)}
                    disabled={humanPlayer.balance < (currentLandedTile.unmortgageValue || 50)}
                    className="px-5 py-3 text-xs uppercase tracking-wider font-bold btn-game-success rounded-xl flex items-center gap-1 font-heading"
                  >
                    <Unlock className="h-4 w-4" />
                    Unmortgage (-◈{currentLandedTile.unmortgageValue})
                  </button>
                )}

                {/* Escape detention options */}
                {humanPlayer.inDetention && humanPlayer.escapeCardsCount > 0 && (
                  <button
                    onClick={useEscapeCard}
                    className="px-5 py-3 text-xs uppercase tracking-wider font-bold btn-game-secondary rounded-xl font-heading"
                  >
                    Use Clearance Card
                  </button>
                )}

                {/* General action roll triggers */}
                {gameState.hasRolledThisTurn && (
                  <button
                    onClick={endTurn}
                    className={`px-6 py-3 text-xs uppercase tracking-wider font-extrabold btn-game-primary rounded-xl shadow-lg flex items-center gap-1 hover:scale-[1.02] font-heading ${
                      gameState.turnTimer <= 5 ? "animate-critical-glow" : ""
                    }`}
                  >
                    End Turn
                    <ArrowRight className="h-4 w-4" />
                  </button>
                )}
              </>
            )}

            {/* General panels controls accessible at all times */}
            <button
              onClick={handleProposeTradeClick}
              className="px-4 py-3 text-xs uppercase tracking-wider font-semibold btn-game-secondary rounded-xl flex items-center gap-1 font-heading"
            >
              <ArrowRightLeft className="h-4 w-4" />
              Propose Trade
            </button>
            <button
              onClick={() => setShowAssetsModal(true)}
              className="px-4 py-3 text-xs uppercase tracking-wider font-semibold btn-game-secondary rounded-xl flex items-center gap-1 font-heading"
            >
              <Scale className="h-4 w-4" />
              View Assets
            </button>
          </div>
        </div>
      </footer>

      {/* ======================================= */}
      {/* 5. MODALS OVERLAYS */}
      {/* ======================================= */}

      {/* A. TILE INSPECTOR MODAL */}
      {selectedPropTile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-card border border-accent/20 rounded-2xl p-6 shadow-2xl relative glass-panel-glow">

            <button
              onClick={() => setSelectedPropTile(null)}
              className="absolute top-4 right-4 text-slate-500 hover:text-slate-200 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Asset card mock */}
            <div className="border border-accent/20 bg-secondary/30 p-4 rounded-xl space-y-4">
              <div
                className="h-4 w-full rounded-md tile-deed-accent"
                style={{ backgroundColor: selectedPropTile.colorCode || "#1e294b" }}
              />
              <div className="text-center">
                <span className="text-[9px] uppercase font-bold text-slate-grey tracking-wider font-heading">
                  {selectedPropTile.type === "PROPERTY" || selectedPropTile.type === "RAIL" || selectedPropTile.type === "UTILITY"
                    ? `${selectedPropTile.district || "PROPEMPIRE HOLDING"} Group`
                    : "BOARD SYSTEM SPACE"}
                </span>
                <h3 className="text-lg font-black text-ivory mt-0.5 uppercase font-heading">{selectedPropTile.name}</h3>
              </div>

              <div className="border-t border-border/30 pt-3 text-xs text-slate-grey space-y-2">
                {selectedPropTile.type === "PROPERTY" || selectedPropTile.type === "RAIL" || selectedPropTile.type === "UTILITY" ? (
                  <div className="space-y-2 font-numbers">
                    <div className="flex justify-between"><span>Purchase Price:</span><strong className="text-ivory">◈{selectedPropTile.cost || 200}</strong></div>
                    
                    {selectedPropTile.type === "UTILITY" ? (
                      <>
                        <div className="flex justify-between text-accent font-bold">
                          <span>Base Landed Rent:</span>
                          <strong className="text-accent">4x / 10x Dice value</strong>
                        </div>
                        <div className="space-y-1 text-[11px] text-slate-grey pl-2 border-l border-border/30">
                          <div className="flex justify-between"><span>1 Utility Owned:</span><span>4x Dice sum</span></div>
                          <div className="flex justify-between"><span>2 Utilities Owned:</span><span>10x Dice sum</span></div>
                        </div>
                      </>
                    ) : selectedPropTile.type === "RAIL" ? (
                      <>
                        <div className="flex justify-between text-accent font-bold">
                          <span>Base Landed Rent:</span>
                          <strong className="text-accent">◈25</strong>
                        </div>
                        <div className="space-y-1 text-[11px] text-slate-grey pl-2 border-l border-border/30">
                          <div className="flex justify-between"><span>1 Rail Terminal Owned:</span><span>◈25</span></div>
                          <div className="flex justify-between"><span>2 Rail Terminals Owned:</span><span>◈50</span></div>
                          <div className="flex justify-between"><span>3 Rail Terminals Owned:</span><span>◈100</span></div>
                          <div className="flex justify-between"><span>4 Rail Terminals Owned:</span><span>◈200</span></div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex justify-between text-accent font-bold">
                          <span>Base Landed Rent:</span>
                          <strong className="text-accent">◈{selectedPropTile.baseRent || 20}</strong>
                        </div>
                        {selectedPropTile.baseRent && (() => {
                          const isGroupOwned = ownsDistrict(gameState, selectedPropTile.ownerId || "", selectedPropTile.district || "");
                          return (
                            <div className="flex justify-between text-accent font-bold">
                              <span>If Color Set Owned:</span>
                              <strong className={isGroupOwned ? "text-emerald-400 font-black" : "text-accent"}>
                                ◈{selectedPropTile.baseRent * 2} {isGroupOwned && <span className="text-[8px] text-emerald-400 ml-1 font-bold font-heading">x2 Owned</span>}
                              </strong>
                            </div>
                          );
                        })()}
                      </>
                    )}

                    {selectedPropTile.houseRents && (
                      <>
                        <div className="flex justify-between text-[11px] items-center">
                          <span>With 1 House:</span>
                          <span className="flex items-center gap-1">
                            <div className="token-house-3d" />
                            <span className="text-ivory">◈{selectedPropTile.houseRents[0]}</span>
                          </span>
                        </div>
                        <div className="flex justify-between text-[11px] items-center">
                          <span>With 2 Houses:</span>
                          <span className="flex items-center gap-1">
                            <div className="flex gap-0.5"><div className="token-house-3d" /><div className="token-house-3d" /></div>
                            <span className="text-ivory">◈{selectedPropTile.houseRents[1]}</span>
                          </span>
                        </div>
                        <div className="flex justify-between text-[11px] items-center">
                          <span>With 3 Houses:</span>
                          <span className="flex items-center gap-1">
                            <div className="flex gap-0.5"><div className="token-house-3d" /><div className="token-house-3d" /><div className="token-house-3d" /></div>
                            <span className="text-ivory">◈{selectedPropTile.houseRents[2]}</span>
                          </span>
                        </div>
                        <div className="flex justify-between text-[11px] items-center">
                          <span>With 4 Houses:</span>
                          <span className="flex items-center gap-1">
                            <div className="flex gap-0.5"><div className="token-house-3d" /><div className="token-house-3d" /><div className="token-house-3d" /><div className="token-house-3d" /></div>
                            <span className="text-ivory">◈{selectedPropTile.houseRents[3]}</span>
                          </span>
                        </div>
                        <div className="flex justify-between text-red-400 font-bold items-center">
                          <span>With Luxury Hotel:</span>
                          <span className="flex items-center gap-1">
                            <div className="token-hotel-3d" />
                            <strong className="text-red-450">◈{selectedPropTile.hotelRent}</strong>
                          </span>
                        </div>
                      </>
                    )}
                    <div className="flex justify-between border-t border-border/25 pt-2 text-[11px]">
                      <span>Mortgage Value:</span>
                      <span className="text-ivory">◈{selectedPropTile.mortgageValue || 100}</span>
                    </div>
                  </div>
                ) : (
                  // Descriptions for non-purchasable spaces (START, TAX, OPPORTUNITY, EMPIRE, DETENTION, FREE_PARKING, GO_TO_DETENTION)
                  <div className="space-y-3 pt-1 text-xs leading-relaxed text-slate-grey font-sans text-left">
                    {selectedPropTile.type === "OPPORTUNITY" && (
                      <div className="space-y-2">
                        <span className="text-[10px] font-extrabold uppercase tracking-wide text-emerald-450 block font-heading">Space Type: Opportunity Reward</span>
                        <p className="text-ivory/90">
                          Landing here draws a random Opportunity card. Rewards include corporate tax refunds (◈150) or escape detention cards, while hazards include regulatory fines (◈150).
                        </p>
                      </div>
                    )}
                    {selectedPropTile.type === "EMPIRE" && (
                      <div className="space-y-2">
                        <span className="text-[10px] font-extrabold uppercase tracking-wide text-emerald-450 block font-heading">Space Type: Empire Payout</span>
                        <p className="text-ivory/90">
                          Landing here draws a powerful Empire card. Executed actions allow you to run Hostile Takeovers to steal ◈150 from the wealthiest opponent or collect syndicate dividends.
                        </p>
                      </div>
                    )}
                    {selectedPropTile.type === "TAX" && (
                      <div className="space-y-2">
                        <span className="text-[10px] font-extrabold uppercase tracking-wide text-red-400 block font-heading">Space Type: Asset Penalty</span>
                        <p className="text-ivory/90">
                          Requires paying an asset surcharge fee directly back to the reserve bank. Landing on the Wealth Levy charges a fee of ◈200, while the Luxury Surcharge costs ◈100.
                        </p>
                      </div>
                    )}
                    {selectedPropTile.type === "GO_TO_DETENTION" && (
                      <div className="space-y-2">
                        <span className="text-[10px] font-extrabold uppercase tracking-wide text-red-400 block font-heading">Space Type: Detention Arrest</span>
                        <p className="text-ivory/90">
                          Immediately arrests your token and moves you directly to the Detention Center. You cannot pass START or collect your ◈200 salary payload.
                        </p>
                      </div>
                    )}
                    {selectedPropTile.type === "DETENTION" && (
                      <div className="space-y-2">
                        <span className="text-[10px] font-extrabold uppercase tracking-wide text-amber-500 block font-heading">Space Type: Custody</span>
                        <p className="text-ivory/90">
                          Holds arrested players. If you land here by normal roll, you are &ldquo;Just Visiting&rdquo; for free. If sent to Detention, you must pay a ◈50 fine, use an Escape card, or roll doubles to exit.
                        </p>
                      </div>
                    )}
                    {selectedPropTile.type === "FREE_PARKING" && (
                      <div className="space-y-2">
                        <span className="text-[10px] font-extrabold uppercase tracking-wide text-slate-grey block font-heading">Space Type: Safe Zone</span>
                        <p className="text-ivory/90">
                          A neutral rest zone. No rents, fees, card drawings, or detention risks are triggered. Relax here until your next turn.
                        </p>
                      </div>
                    )}
                    {selectedPropTile.type === "START" && (
                      <div className="space-y-2">
                        <span className="text-[10px] font-extrabold uppercase tracking-wide text-emerald-450 block font-heading">Space Type: Salary Payload</span>
                        <p className="text-ivory/90">
                          Represents the beginning space. Landing on or passing START automatically credits your ledger with a ◈200 corporate salary payout.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* B. DETAILED TRADE SYSTEM MODAL */}
      {showTradeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-card border border-accent/20 rounded-2xl p-6 shadow-2xl relative flex flex-col gap-6 glass-panel-glow">

            <button
              onClick={() => setShowTradeModal(false)}
              className="absolute top-4 right-4 text-slate-505 hover:text-slate-200 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="text-center pb-2 border-b border-border/20">
              <h3 className="text-lg font-black text-ivory uppercase tracking-wide font-heading">SHAREHOLDER TRANSACTION CONTRACT</h3>
              <p className="text-xs text-slate-grey mt-0.5 font-sans">Structure exchange values (cash, assets, or cards) with AI opponents</p>
            </div>

            {/* Select Trade Partner */}
            <div className="flex gap-2">
              {gameState.players.filter(p => p.id !== myPlayerId && !p.isBankrupt).map(pl => (
                <button
                  key={pl.id}
                  onClick={() => setSelectedTradePartnerId(pl.id)}
                  className={`px-4 py-2 text-xs font-bold uppercase rounded-lg border transition-all cursor-pointer font-heading ${selectedTradePartnerId === pl.id
                    ? "border-accent bg-accent/15 text-accent"
                    : "border-border bg-secondary/40 text-slate-grey hover:text-ivory"
                    }`}
                >
                  {pl.name}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch flex-grow overflow-y-auto max-h-[350px]">
              {/* Proposer Side (You) */}
              <div className="space-y-4 border-r border-border/20 pr-4">
                <span className="text-[10px] font-black uppercase tracking-widest text-accent block pb-1.5 border-b border-border/20 font-heading">YOUR OFFERING</span>

                {/* Cash Selector */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-grey uppercase font-heading">Cash Amount (◈{humanPlayer.balance})</label>
                  <input
                    type="number"
                    min={0}
                    max={humanPlayer.balance}
                    value={tradeOfferCash}
                    onChange={(e) => setTradeOfferCash(Math.min(humanPlayer.balance, Math.max(0, parseInt(e.target.value) || 0)))}
                    className="w-full bg-secondary/50 border border-border/80 rounded-lg px-3 py-1.5 text-xs text-ivory font-numbers outline-none focus:border-accent"
                  />
                </div>

                {/* Escape Card Selector */}
                {humanPlayer.escapeCardsCount > 0 && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-grey uppercase font-heading">Detention Waiver Cards</label>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setTradeOfferEscapeCards(prev => Math.max(0, prev - 1))}
                        className="p-1 hover:bg-secondary border border-border/80 rounded text-accent cursor-pointer"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="text-xs text-ivory font-bold font-numbers">{tradeOfferEscapeCards} / {humanPlayer.escapeCardsCount}</span>
                      <button
                        onClick={() => setTradeOfferEscapeCards(prev => Math.min(humanPlayer.escapeCardsCount, prev + 1))}
                        className="p-1 hover:bg-secondary border border-border/80 rounded text-accent cursor-pointer"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Properties Selector */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-grey uppercase font-heading">Select Properties to Transfer</label>
                  <div className="space-y-1 max-h-[120px] overflow-y-auto pr-1">
                    {gameState.tiles.filter(t => t.ownerId === myPlayerId).map(t => (
                      <div
                        key={t.index}
                        onClick={() => togglePropertyInTrade(t.index, true)}
                        className={`p-2 border rounded-lg text-[10px] font-semibold cursor-pointer truncate flex items-center justify-between transition-colors font-sans ${tradeOfferProperties.includes(t.index)
                          ? "border-accent bg-accent/10 text-ivory"
                          : "border-border bg-secondary/20 text-slate-grey hover:bg-secondary/40 hover:text-ivory"
                          }`}
                      >
                        <span>{t.name}</span>
                        <span className="font-numbers">◈{t.cost}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Receiver Side (Selected Bot) */}
              <div className="space-y-4">
                <span className="text-[10px] font-black uppercase tracking-widest text-accent block pb-1.5 border-b border-border/20 font-heading">YOUR DEMAND</span>

                {/* Cash Selector */}
                {(() => {
                  const target = gameState.players.find(p => p.id === selectedTradePartnerId);
                  const bal = target?.balance || 0;
                  return (
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-grey uppercase font-heading">Cash Amount (◈{bal})</label>
                      <input
                        type="number"
                        min={0}
                        max={bal}
                        value={tradeRequestCash}
                        onChange={(e) => setTradeRequestCash(Math.min(bal, Math.max(0, parseInt(e.target.value) || 0)))}
                        className="w-full bg-secondary/50 border border-border/80 rounded-lg px-3 py-1.5 text-xs text-ivory font-numbers outline-none focus:border-accent"
                      />
                    </div>
                  );
                })()}

                {/* Escape Card Selector */}
                {(() => {
                  const target = gameState.players.find(p => p.id === selectedTradePartnerId);
                  const escapeCount = target?.escapeCardsCount || 0;
                  if (escapeCount <= 0) return null;
                  return (
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-grey uppercase font-heading">Detention Waiver Cards</label>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setTradeRequestEscapeCards(prev => Math.max(0, prev - 1))}
                          className="p-1 hover:bg-secondary border border-border/80 rounded text-accent cursor-pointer"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="text-xs text-ivory font-bold font-numbers">{tradeRequestEscapeCards} / {escapeCount}</span>
                        <button
                          onClick={() => setTradeRequestEscapeCards(prev => Math.min(escapeCount, prev + 1))}
                          className="p-1 hover:bg-secondary border border-border/80 rounded text-accent cursor-pointer"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  );
                })()}

                {/* Properties Selector */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-grey uppercase font-heading">Select Properties to Claim</label>
                  <div className="space-y-1 max-h-[120px] overflow-y-auto pr-1">
                    {gameState.tiles.filter(t => t.ownerId === selectedTradePartnerId).map(t => (
                      <div
                        key={t.index}
                        onClick={() => togglePropertyInTrade(t.index, false)}
                        className={`p-2 border rounded-lg text-[10px] font-semibold cursor-pointer truncate flex items-center justify-between transition-colors font-sans ${tradeRequestProperties.includes(t.index)
                          ? "border-accent bg-accent/10 text-ivory"
                          : "border-border bg-secondary/20 text-slate-grey hover:bg-secondary/40 hover:text-ivory"
                          }`}
                      >
                        <span>{t.name}</span>
                        <span className="font-numbers">◈{t.cost}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={submitTradeProposal}
              className="w-full py-3 btn-game-primary rounded-xl shadow-lg font-heading uppercase text-xs tracking-wider"
            >
              Dispatch Proposal Offer
            </button>
          </div>
        </div>
      )}

      {/* C. AUCTION HOUSE PANEL (Fullscreen overlay if active) */}
      {gameState.auction.isActive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/95 backdrop-blur-md">
          <div className="w-full max-w-md bg-card border border-accent/20 rounded-2xl p-6 shadow-2xl relative flex flex-col gap-6 glass-panel-glow">

            <div className="text-center border-b border-border/20 pb-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-[9px] uppercase font-bold tracking-wider mb-2 font-heading">
                <Hammer className="h-3 w-3 animate-pulse" />
                Live Liquidation Auction
              </span>
              <h3 className="text-lg font-black text-ivory uppercase tracking-wide font-heading">
                Bidding on: {gameState.tiles[gameState.auction.tileIndex].name}
              </h3>
            </div>

            {/* Real-time details */}
            <div className="bg-secondary/35 p-4 border border-border/40 rounded-xl space-y-4 text-center">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-grey block mb-1 font-heading">Highest Bid Value</span>
                <strong className="text-4xl font-black text-gold-gradient font-numbers">◈{gameState.auction.highestBid}</strong>
              </div>

              <div>
                <span className="text-[9px] uppercase font-bold text-slate-grey block font-heading">Current High Bidder</span>
                <span className="text-sm font-bold text-ivory mt-1 block font-heading">
                  {gameState.auction.highestBidderId
                    ? gameState.players.find(pl => pl.id === gameState.auction.highestBidderId)?.name
                    : "No bids placed yet"}
                </span>
              </div>
            </div>

            {/* Countdown timer */}
            <div className="flex items-center justify-between p-3 bg-secondary/30 border border-border/40 rounded-xl">
              <span className="text-xs text-slate-grey font-bold uppercase font-heading">Time Remaining:</span>
              <span className="text-sm font-black text-red-400 flex items-center gap-1 font-numbers">
                <Clock className="h-4 w-4 animate-pulse" />
                {gameState.auction.timer}s
              </span>
            </div>

            {/* Bid Actions */}
            {gameState.auction.activeBidders.includes(myPlayerId) ? (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => handlePlaceBid(gameState.auction.highestBid + 10)}
                    disabled={cooldownRemaining > 0 || humanPlayer.balance < gameState.auction.highestBid + 10}
                    className="py-2.5 text-xs font-bold border border-accent/20 hover:border-accent text-ivory hover:bg-accent/5 rounded-lg cursor-pointer font-numbers disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Bid +◈10 {cooldownRemaining > 0 && `(${cooldownRemaining.toFixed(1)}s)`}
                  </button>
                  <button
                    onClick={() => handlePlaceBid(gameState.auction.highestBid + 50)}
                    disabled={cooldownRemaining > 0 || humanPlayer.balance < gameState.auction.highestBid + 50}
                    className="py-2.5 text-xs font-bold border border-accent/20 hover:border-accent text-ivory hover:bg-accent/5 rounded-lg cursor-pointer font-numbers disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Bid +◈50 {cooldownRemaining > 0 && `(${cooldownRemaining.toFixed(1)}s)`}
                  </button>
                  <button
                    onClick={() => handlePlaceBid(gameState.auction.highestBid + 100)}
                    disabled={cooldownRemaining > 0 || humanPlayer.balance < gameState.auction.highestBid + 100}
                    className="py-2.5 text-xs font-bold border border-accent/20 hover:border-accent text-ivory hover:bg-accent/5 rounded-lg cursor-pointer font-numbers disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Bid +◈100 {cooldownRemaining > 0 && `(${cooldownRemaining.toFixed(1)}s)`}
                  </button>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={passAuction}
                    className="flex-1 py-3 btn-game-danger rounded-xl uppercase font-heading text-xs tracking-wider cursor-pointer"
                  >
                    Pass (Leave Auction)
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center p-4 bg-secondary/35 border border-border/40 rounded-xl text-xs text-slate-grey italic font-sans">
                You passed this auction. Spectating other investors...
              </div>
            )}
          </div>
        </div>
      )}

      {/* D. CARD DRAW REVEAL MODAL */}
      {gameState.drawnCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm p-1 bg-gold-gradient rounded-2xl shadow-2xl relative animate-bounce-short">
            <div 
              style={{
                backgroundImage: `url(${gameState.drawnCard.isEmpire ? '/PEEmpire.png' : '/PEOpportunity.png'})`,
                backgroundSize: "cover",
                backgroundPosition: "center"
              }}
              className="bg-card rounded-2xl border border-accent/20 p-5 flex flex-col items-center text-center relative overflow-hidden min-h-[400px] justify-between shadow-2xl"
            >
              {/* Transparent edge backdrop gradient to prevent card overlay blackout */}
              <div className="absolute inset-0 bg-gradient-to-b from-slate-950/20 via-slate-950/40 to-slate-950/70 z-0" />
              
              {/* Card Type Badge */}
              <div className="z-10 mt-2">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest font-heading ${
                  gameState.drawnCard.isEmpire 
                    ? "bg-amber-950/80 border-accent text-accent shadow-md shadow-accent/10" 
                    : "bg-indigo-950/80 border-indigo-500/30 text-indigo-400"
                }`}>
                  {gameState.drawnCard.isEmpire ? "👑 Empire Card" : "🚀 Opportunity Card"}
                </span>
              </div>

              {/* Central Text Plate container */}
              <div className="z-10 w-full bg-slate-950/75 backdrop-blur-[4px] border border-border/40 p-4 rounded-xl my-4 space-y-3 flex flex-col items-center shadow-inner">
                <h3 className="text-base font-black text-gold-gradient uppercase tracking-wide font-heading text-center">
                  {gameState.drawnCard.card.title}
                </h3>
                <p className="text-xs text-slate-200 leading-relaxed font-semibold font-sans text-center max-w-xs">
                  {gameState.drawnCard.card.description.replaceAll("$", "◈")}
                </p>
              </div>

              {/* Action Button at bottom */}
              <div className="z-10 w-full">
                {activePlayer?.id === myPlayerId ? (
                  <button
                    onClick={dismissCard}
                    className="w-full py-3 btn-game-primary text-slate-950 font-black uppercase tracking-wider text-xs rounded-xl shadow-lg hover:scale-102 transition-transform cursor-pointer font-heading"
                  >
                    Acknowledge & Execute
                  </button>
                ) : (
                  <div className="w-full py-3 bg-secondary/50 border border-border/30 rounded-xl text-xs text-slate-grey italic font-bold font-sans">
                    AI processing event action...
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* E. MOCK RECT PROTOCOL PORTFOLIO: ASSETS OVERVIEW */}
      {showAssetsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-xl bg-card border border-accent/20 rounded-2xl p-6 shadow-2xl relative flex flex-col gap-6 max-h-[85vh] glass-panel-glow">

            <button
              onClick={() => setShowAssetsModal(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-slate-200 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="text-center pb-2 border-b border-border/20">
              <h3 className="text-lg font-black text-ivory uppercase tracking-wide font-heading">SHAREHOLDER HOLDINGS PORTFOLIO</h3>
              <p className="text-xs text-slate-grey mt-0.5 font-sans">Manage upgrades, houses, hotels, and mortgages for owned assets</p>
            </div>

            <div className="flex-grow overflow-y-auto space-y-4 pr-1">
              {gameState.tiles.filter(t => t.ownerId === myPlayerId).length === 0 ? (
                <div className="text-center py-12 text-slate-grey text-xs italic font-sans">
                  No property holdings acquired. Roll dice to land on unowned zones.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {gameState.tiles.filter(t => t.ownerId === myPlayerId).map((t) => {
                    const groupOwned = ownsDistrict(gameState, myPlayerId, t.district || "");

                    return (
                      <div
                        key={t.index}
                        className="bg-secondary/20 border border-border/40 p-4 rounded-xl flex flex-col justify-between gap-4 shadow-sm"
                      >
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: t.colorCode || "#1e294b" }} />
                            <h4 className="text-xs font-bold text-ivory truncate font-heading">{t.name}</h4>
                          </div>

                          <div className="text-[10px] text-slate-grey space-y-1 font-numbers">
                            <div className="flex justify-between"><span>Base Cost:</span><span className="text-ivory">${t.cost}</span></div>
                            <div className="flex justify-between"><span>Mortgage Value:</span><span className="text-ivory">${t.mortgageValue}</span></div>
                            {t.type === "PROPERTY" && (
                              <div className="flex justify-between"><span>Houses:</span><span className="text-ivory">{t.houseCount === 5 ? "Hotel" : `${t.houseCount}/4`}</span></div>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/20 font-numbers">
                          {t.isMortgaged ? (
                            <button
                              onClick={() => unmortgageProperty(t.index)}
                              disabled={humanPlayer.balance < (t.unmortgageValue || 50)}
                              className="col-span-2 py-2 btn-game-success rounded-lg text-[9px] font-bold uppercase tracking-wider flex items-center justify-center gap-1 font-heading cursor-pointer"
                            >
                              <Unlock className="h-3 w-3" /> Unmortgage (-${t.unmortgageValue})
                            </button>
                          ) : (
                            <>
                              {t.houseCount > 0 ? (() => {
                                const districtTiles = gameState.tiles.filter(dt => dt.district === t.district);
                                const maxHouses = Math.max(...districtTiles.map(dt => dt.houseCount));
                                const canSell = t.houseCount === maxHouses;
                                return (
                                  <button
                                    onClick={() => sellHouse(t.index)}
                                    disabled={!canSell}
                                    title={!canSell ? "Even selling rule: You must sell houses from properties with the most houses first." : ""}
                                    className={`py-2 btn-game-danger rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center justify-center gap-0.5 font-heading ${
                                      !canSell ? "opacity-40 cursor-not-allowed" : "cursor-pointer hover:scale-[1.02]"
                                    }`}
                                  >
                                    Sell {t.houseCount === 5 ? "Hotel" : "House"} (+◈{Math.floor((t.houseCost || 100) / 2)})
                                  </button>
                                );
                              })() : (
                                <button
                                  onClick={() => mortgageProperty(t.index)}
                                  className="py-2 btn-game-danger rounded-lg text-[9px] font-bold uppercase tracking-wider flex items-center justify-center gap-1 font-heading cursor-pointer"
                                >
                                  <Lock className="h-3 w-3" /> Mortgage (+◈{t.mortgageValue})
                                </button>
                              )}

                              {t.type === "PROPERTY" && groupOwned && t.houseCount < 4 ? (
                                <button
                                  onClick={() => buildHouse(t.index)}
                                  disabled={humanPlayer.balance < (t.houseCost || 100)}
                                  className="py-2 btn-game-success rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center justify-center gap-0.5 font-heading cursor-pointer"
                                >
                                  + House (${t.houseCost})
                                </button>
                              ) : t.type === "PROPERTY" && t.houseCount === 4 ? (
                                <button
                                  onClick={() => buildHotel(t.index)}
                                  disabled={humanPlayer.balance < (t.houseCost || 100)}
                                  className="py-2 bg-gradient-to-br from-indigo-700 to-indigo-900 border border-indigo-500 text-slate-100 rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center justify-center gap-0.5 font-heading cursor-pointer hover:brightness-110 active:translate-y-px"
                                >
                                  + Hotel (${t.houseCost})
                                </button>
                              ) : (
                                <button
                                  disabled
                                  className="py-2 border border-border bg-secondary/50 text-slate-grey/60 rounded-lg text-[9px] font-bold uppercase font-heading"
                                >
                                  Needs Group
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* F. TRADE INCOMING PROPOSAL ALERT */}
      {gameState.trade.isActive && gameState.trade.receiverId === myPlayerId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-card border border-accent/20 rounded-2xl p-6 shadow-2xl relative flex flex-col gap-5 glass-panel-glow">

            <div className="text-center pb-2 border-b border-border/20">
              <h3 className="text-md font-black text-ivory uppercase tracking-wide font-heading">INCOMING TRADE OFFER</h3>
              <p className="text-xs text-slate-grey mt-0.5 font-sans">
                {gameState.players.find(p => p.id === gameState.trade.proposerId)?.name} proposed a transaction
              </p>
            </div>

            <div className="space-y-4">
              <div className="p-3.5 bg-secondary/20 border border-border/40 rounded-xl space-y-2 text-xs font-sans">
                <span className="font-bold text-accent block mb-1 font-heading">They Offer You:</span>
                <div className="font-numbers">Cash: <strong className="text-accent">◈{gameState.trade.proposerOffer.cash}</strong></div>
                {gameState.trade.proposerOffer.properties.length > 0 && (
                  <div>
                    Properties:
                    <span className="text-ivory font-semibold block pl-2 font-sans">
                      {gameState.trade.proposerOffer.properties.map(idx => gameState.tiles[idx].name).join(", ")}
                    </span>
                  </div>
                )}
                {gameState.trade.proposerOffer.escapeCards > 0 && (
                  <div className="font-numbers">Escape Cards: <strong className="text-ivory">{gameState.trade.proposerOffer.escapeCards}</strong></div>
                )}
              </div>

              <div className="p-3.5 bg-secondary/20 border border-border/40 rounded-xl space-y-2 text-xs font-sans">
                <span className="font-bold text-accent block mb-1 font-heading">They Demand from You:</span>
                <div className="font-numbers">Cash: <strong className="text-accent">◈{gameState.trade.receiverOffer.cash}</strong></div>
                {gameState.trade.receiverOffer.properties.length > 0 && (
                  <div>
                    Properties:
                    <span className="text-ivory font-semibold block pl-2 font-sans">
                      {gameState.trade.receiverOffer.properties.map(idx => gameState.tiles[idx].name).join(", ")}
                    </span>
                  </div>
                )}
                {gameState.trade.receiverOffer.escapeCards > 0 && (
                  <div className="font-numbers">Escape Cards: <strong className="text-ivory">{gameState.trade.receiverOffer.escapeCards}</strong></div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => respondToTrade(false)}
                className="py-3 btn-game-danger rounded-xl uppercase font-heading text-xs tracking-wider cursor-pointer"
              >
                Reject Offer
              </button>
              <button
                onClick={() => respondToTrade(true)}
                className="py-3 btn-game-success rounded-xl uppercase font-heading text-xs tracking-wider cursor-pointer text-slate-950"
              >
                Accept Offer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* G. GAME OVER SCREEN */}
      {gameState.status === "GAME_OVER" && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-6 bg-slate-950/98 backdrop-blur-md">
          <div className="w-full max-w-sm text-center space-y-6 animate-pulse bg-card p-6 border border-accent/20 rounded-2xl glass-panel-glow">
            <span className="text-5xl">🏆</span>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-accent block font-heading">VICTORY EMBLEM DECLARED</span>
              <h2 className="text-3xl font-black text-gold-gradient mt-1 uppercase tracking-wide font-heading">
                {gameState.winnerId === myPlayerId ? "YOU DOMINATED THE BOARD!" : "AI SYSTEM DOMINATION"}
              </h2>
            </div>

            <div className="p-4 bg-secondary/35 border border-border/40 rounded-xl text-xs text-slate-grey leading-relaxed font-sans">
              {gameState.winnerId === myPlayerId
                ? "Congratulations, Investor! Your business strategy secured total capital monopoly, bankrupted all rival portfolios."
                : `AI Investor (${gameState.players.find(p => p.id === gameState.winnerId)?.name}) successfully bankrupted the table and consolidated the district holdings.`}
            </div>

            <button
              onClick={() => {
                const currentToken = (typeof window !== "undefined" ? localStorage.getItem("propempire_token") as TokenType : null) || "Rocket";
                setupNewGame(4, currentToken);
                router.push("/");
              }}
              className="w-full py-3.5 btn-game-primary text-slate-950 font-black uppercase tracking-wider text-xs rounded-xl shadow-lg hover:scale-102 transition-transform cursor-pointer font-heading"
            >
              Return to Lobby Portal
            </button>
          </div>
        </div>
      )}

      {/* H. GAME RULES MANUAL MODAL */}
      {showRulesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-sm">
          <div className="w-full max-w-4xl h-[85vh] bg-card border border-accent/20 rounded-2xl p-6 shadow-2xl relative flex flex-col glass-panel-glow text-left">

            <button
              onClick={() => setShowRulesModal(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-slate-200 transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="pb-3 border-b border-border/20 flex items-center gap-2 mb-4">
              <BookOpen className="h-5 w-5 text-accent animate-pulse" />
              <div>
                <h3 className="text-base font-black text-ivory uppercase tracking-wide font-heading">
                  PropEmpire Boardroom Guidebook
                </h3>
                <span className="text-[10px] font-black uppercase text-slate-grey tracking-widest mt-0.5 block font-heading">
                  Official Game Rules Manual
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch flex-grow min-h-0">

              {/* LEFT CHAPTERS LIST */}
              <div className="md:col-span-4 flex flex-col gap-3 min-h-[140px] md:min-h-0">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-grey" />
                  <input
                    type="text"
                    placeholder="Search manual keyword..."
                    value={rulesSearchQuery}
                    onChange={(e) => setRulesSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-secondary/40 border border-border/80 rounded-xl outline-none focus:border-accent text-xs text-ivory font-sans"
                  />
                </div>

                {/* List */}
                <div className="flex-grow overflow-y-auto space-y-1 pr-1 py-1">
                  {(() => {
                    const filtered = RULES_DATA.filter(
                      r => r.title.toLowerCase().includes(rulesSearchQuery.toLowerCase()) ||
                        r.content.toLowerCase().includes(rulesSearchQuery.toLowerCase())
                    );

                    const getModalRuleIcon = (iconName: string) => {
                      switch (iconName) {
                        case "winning":
                          return <Award className="h-3.5 w-3.5 text-accent" />;
                        case "setup":
                          return <HelpCircle className="h-3.5 w-3.5 text-accent" />;
                        case "turn-flow":
                          return <TrendingUp className="h-3.5 w-3.5 text-accent" />;
                        case "buying":
                        case "houses":
                        case "hotels":
                          return <Building className="h-3.5 w-3.5 text-accent" />;
                        case "rent":
                          return <DollarSign className="h-3.5 w-3.5 text-accent" />;
                        case "districts":
                        case "auctions":
                        case "trading":
                          return <Scale className="h-3.5 w-3.5 text-accent" />;
                        case "mortgages":
                          return <Lock className="h-3.5 w-3.5 text-accent" />;
                        case "detention":
                        case "bankruptcy":
                          return <ShieldAlert className="h-3.5 w-3.5 text-accent" />;
                        default:
                          return <HelpCircle className="h-3.5 w-3.5 text-accent" />;
                      }
                    };

                    if (filtered.length === 0) {
                      return <div className="text-center py-6 text-slate-grey text-xs italic font-sans">No matching rules.</div>;
                    }

                    return filtered.map(rule => (
                      <button
                        key={rule.id}
                        onClick={() => setRulesActiveSectionId(rule.id)}
                        className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left text-[11px] font-bold uppercase tracking-wider transition-all border cursor-pointer font-heading ${rulesActiveSectionId === rule.id
                          ? "border-accent bg-accent/15 text-accent"
                          : "border-transparent text-slate-grey hover:text-ivory hover:bg-secondary/30"
                          }`}
                      >
                        <span className="flex items-center gap-2">
                          {getModalRuleIcon(rule.iconName)}
                          {rule.title}
                        </span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    ));
                  })()}
                </div>
              </div>

              {/* RIGHT CHAPTER VIEWER */}
              <div className="md:col-span-8 flex flex-col justify-between min-h-0 bg-secondary/20 border border-border/30 rounded-xl p-5 overflow-y-auto font-sans">
                {(() => {
                  const activeSec = RULES_DATA.find(r => r.id === rulesActiveSectionId) || RULES_DATA[0];

                  const getViewerRuleIcon = (iconName: string) => {
                    switch (iconName) {
                      case "winning":
                        return <Award className="h-5 w-5 text-accent" />;
                      case "setup":
                        return <HelpCircle className="h-5 w-5 text-accent" />;
                      case "turn-flow":
                        return <TrendingUp className="h-5 w-5 text-accent" />;
                      case "buying":
                      case "houses":
                      case "hotels":
                        return <Building className="h-5 w-5 text-accent" />;
                      case "rent":
                        return <DollarSign className="h-5 w-5 text-accent" />;
                      case "districts":
                      case "auctions":
                      case "trading":
                        return <Scale className="h-5 w-5 text-accent" />;
                      case "mortgages":
                        return <Lock className="h-5 w-5 text-accent" />;
                      case "detention":
                      case "bankruptcy":
                        return <ShieldAlert className="h-5 w-5 text-accent" />;
                      default:
                        return <HelpCircle className="h-5 w-5 text-accent" />;
                    }
                  };

                  return (
                    <div className="space-y-4 font-sans">
                      <div className="flex items-center gap-2.5 pb-2.5 border-b border-border/20">
                        <div className="h-9 w-9 rounded-xl bg-accent/10 border border-accent/25 flex items-center justify-center">
                          {getViewerRuleIcon(activeSec.iconName)}
                        </div>
                        <div>
                          <h4 className="text-sm font-black text-ivory uppercase tracking-wider font-heading">{activeSec.title}</h4>
                          <span className="text-[8px] font-bold text-slate-grey uppercase tracking-widest mt-0.5 block font-heading">Chapter Summary</span>
                        </div>
                      </div>

                      <p className="text-xs text-slate-grey leading-relaxed whitespace-pre-line font-sans">{activeSec.content}</p>

                      {activeSec.example && (
                        <div className="p-3.5 bg-secondary/30 border border-accent/20 rounded-xl space-y-1.5 font-sans">
                          <span className="text-[9px] font-black uppercase text-accent tracking-wider flex items-center gap-1 font-heading">
                            <Sparkles className="h-3 w-3" /> Gameplay Scenario Example
                          </span>
                          <p className="text-xs text-slate-grey italic">&ldquo;{activeSec.example}&rdquo;</p>
                        </div>
                      )}
                    </div>
                  );
                })()}

                <div className="pt-4 border-t border-border/20 mt-6 text-[8px] text-slate-grey uppercase font-semibold text-center font-heading">
                  PropEmpire Boardroom Guidebook
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* MATCH STANDINGS MODAL ON END GAME */}
      {hostEndedResults && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-sm animate-fade-in font-sans">
          <div className="w-full max-w-2xl bg-card border border-accent/20 rounded-2xl p-6 shadow-2xl relative flex flex-col glass-panel-glow text-left">
            <div className="pb-4 border-b border-border/20 flex items-center gap-3 mb-6">
              <Award className="h-6 w-6 text-accent animate-bounce" />
              <div>
                <h3 className="text-xl font-black text-ivory uppercase tracking-wide font-heading">
                  Host Has Ended The Game
                </h3>
                <span className="text-[10px] font-black uppercase text-accent tracking-widest mt-0.5 block font-heading">
                  Official Match Standings & Results
                </span>
              </div>
            </div>

            <div className="overflow-x-auto flex-grow mb-6">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-border/20 text-[10px] uppercase font-bold tracking-widest text-slate-grey font-heading">
                    <th className="py-3 px-4">Rank</th>
                    <th className="py-3 px-4">Player</th>
                    <th className="py-3 px-4 text-right">Cash</th>
                    <th className="py-3 px-4 text-right font-bold text-accent">Net Worth</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20 text-xs">
                  {(() => {
                    const ranked = [...hostEndedResults.players].map(p => {
                      let propVal = 0;
                      hostEndedResults.tiles.forEach(tile => {
                        if (tile.ownerId === p.id) {
                          if (tile.isMortgaged) {
                            propVal += tile.mortgageValue || 0;
                          } else {
                            propVal += (tile.cost || 0) + (tile.houseCount * (tile.houseCost || 100));
                          }
                        }
                      });
                      return { ...p, netWorth: p.balance + propVal };
                    }).sort((a, b) => b.netWorth - a.netWorth);

                    return ranked.map((p, idx) => {
                      const isMe = p.id === myPlayerId;
                      const rankColors = ["text-yellow-400 font-extrabold", "text-slate-350 font-bold", "text-amber-600 font-bold"];
                      const rankLabel = idx === 0 ? "1st" : idx === 1 ? "2nd" : idx === 2 ? "3rd" : `${idx + 1}th`;

                      return (
                        <tr key={p.id} className={`hover:bg-secondary/15 transition-colors ${isMe ? 'bg-accent/10 font-semibold' : ''}`}>
                          <td className="py-3 px-4 font-black font-numbers">
                            <span className={idx < 3 ? rankColors[idx] : "text-slate-grey"}>
                              {rankLabel}
                            </span>
                          </td>
                          <td className="py-3 px-4 flex items-center gap-2">
                            <span className="text-base">{p.avatar}</span>
                            <div>
                              <span className="text-ivory font-bold">{p.name}</span>
                              {isMe && <span className="ml-1.5 text-[9px] uppercase bg-accent/20 text-accent px-1.5 py-0.5 rounded font-black font-heading">You</span>}
                              <div className="text-[9px] uppercase tracking-wider text-slate-grey font-heading">{p.token}</div>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right text-slate-grey font-numbers">◈{p.balance.toLocaleString()}</td>
                          <td className="py-3 px-4 text-right font-black text-accent font-numbers">◈{p.netWorth.toLocaleString()}</td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>

            <button
              onClick={() => {
                setHostEndedResults(null);
                window.location.href = "/";
              }}
              className="w-full py-3 btn-game-primary text-slate-950 font-black uppercase tracking-wider text-xs rounded-xl shadow-lg hover:scale-102 transition-transform cursor-pointer font-heading"
            >
              Exit Boardroom
            </button>
          </div>
        </div>
      )}

      {/* PERSONAL SCORE PERFORMANCE CARD ON LEAVE GAME */}
      {leftGameResults && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-sm animate-fade-in font-sans">
          <div className="w-full max-w-md bg-card border border-accent/20 rounded-2xl p-6 shadow-2xl relative flex flex-col glass-panel-glow text-center space-y-6">
            <div className="space-y-2">
              <span className="text-5xl">💼</span>
              <h3 className="text-2xl font-black text-ivory uppercase tracking-wide font-heading">
                Exited Game Room
              </h3>
              <span className="text-[10px] font-black uppercase text-slate-grey tracking-widest mt-0.5 block font-heading">
                Final Boardroom Valuation Statement
              </span>
            </div>

            <div className="p-4 bg-secondary/35 border border-border/40 rounded-xl space-y-4 text-left font-sans">
              <div className="flex items-center justify-between pb-3 border-b border-border/20">
                <span className="text-xs uppercase font-bold tracking-wider text-slate-grey font-heading">Player Profile</span>
                <div className="flex items-center gap-1.5 text-xs text-ivory font-bold">
                  <span>{leftGameResults.avatar}</span>
                  <span>{leftGameResults.name}</span>
                  <span className="text-[10px] uppercase font-medium text-slate-grey">({leftGameResults.token})</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs font-numbers">
                <span className="text-slate-grey">Cash Capital</span>
                <span className="font-semibold text-ivory">◈{leftGameResults.balance.toLocaleString()}</span>
              </div>

              <div className="flex items-center justify-between text-xs font-numbers">
                <span className="text-slate-grey">Property Valuation</span>
                <span className="font-semibold text-ivory">◈{leftGameResults.propertiesValue.toLocaleString()}</span>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-border/20 font-numbers">
                <span className="text-xs uppercase font-black tracking-widest text-accent font-heading">Total Net Worth</span>
                <span className="text-base font-black text-accent">◈{leftGameResults.netWorth.toLocaleString()}</span>
              </div>
            </div>

            <button
              onClick={() => {
                setLeftGameResults(null);
                window.location.href = "/";
              }}
              className="w-full py-3.5 btn-game-secondary text-ivory font-black uppercase tracking-wider text-xs rounded-xl shadow-lg transition-all cursor-pointer font-heading"
            >
              Return to Lobby Portal
            </button>
          </div>
        </div>
      )}

      {/* MOBILE COMPACT VIEWPORT (xl:hidden) */}
      <div className="xl:hidden flex flex-col items-center justify-start gap-4 w-full pb-28">
        
        {/* Top Status & Timer Bar */}
        <div className="w-full flex items-center justify-between bg-card/65 backdrop-blur-md border border-border/80 px-3.5 py-2.5 rounded-xl shadow-lg animate-fade-in">
          <div className="flex flex-col text-left">
            <span className="text-[8px] font-black uppercase text-slate-grey tracking-wider font-heading">ROOM CODE</span>
            <span className="text-xs font-black text-accent tracking-widest leading-none mt-0.5 font-numbers">{roomId}</span>
          </div>

          <div className="text-center">
            <span className="text-[8px] font-black uppercase text-slate-grey tracking-wider block font-heading">ACTIVE TURN</span>
            <span className="text-xs font-black text-accent uppercase leading-none mt-0.5 font-heading max-w-[80px] sm:max-w-[120px] truncate inline-block">{activePlayer?.name.split(" ")[0]}</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Rules button */}
            <button
              onClick={() => setShowRulesModal(true)}
              className="flex items-center justify-center gap-1 btn-game-secondary px-2.5 py-1 rounded-lg text-accent shadow-md active:scale-95 transition-all text-[9px] font-black uppercase tracking-wider cursor-pointer font-heading"
              title="View Rules"
            >
              <BookOpen className="h-3 w-3" />
              <span>Rules</span>
            </button>

            {/* Timer */}
            <div className="flex items-center gap-1.5 bg-secondary/80 border border-slate-800/80 px-2 py-1.5 rounded-lg">
              <Clock className="h-3 w-3 text-accent animate-pulse" />
              <span className="text-xs font-black text-slate-100 font-numbers">{gameState.turnTimer}s</span>
            </div>
          </div>
        </div>

        {/* Compact Horizontal Players list */}
        <div className="w-full flex gap-2 overflow-x-auto pb-2 scrollbar-none justify-start">
          {gameState.players.map((pl, idx) => {
            const isActive = idx === gameState.activePlayerIndex;
            const isMe = pl.id === myPlayerId;
            return (
              <div
                key={pl.id}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full border transition-all shrink-0 ${
                  isActive
                    ? "border-accent bg-accent/15 shadow-md shadow-accent/5"
                    : "border-border bg-secondary/40"
                } ${pl.isBankrupt ? "opacity-35" : ""}`}
              >
                <div className="h-6 w-6 rounded-full bg-accent border border-slate-700 flex items-center justify-center text-xs">
                  {pl.avatar}
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] font-black text-ivory leading-none truncate max-w-[50px] font-heading">{pl.name.split(" ")[0]}</span>
                    {isMe && <span className="text-[7px] uppercase font-bold text-accent font-heading">(You)</span>}
                  </div>
                  <span className="text-[9px] font-bold text-accent leading-none mt-0.5 font-numbers">
                    ◈{pl.balance.toLocaleString()}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Board View Mode Toggle */}
        <div className="flex bg-secondary/60 backdrop-blur-sm border border-border/60 p-0.5 rounded-xl gap-1 w-full max-w-[280px] shadow-lg">
          <button
            onClick={() => setMobileBoardView("focused")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[9px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
              mobileBoardView === "focused"
                ? "bg-accent text-charcoal shadow-md font-extrabold"
                : "text-slate-grey hover:text-ivory"
            }`}
          >
            <Search className="h-3 w-3" />
            <span>Focused View</span>
          </button>
          <button
            onClick={() => setMobileBoardView("full")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[9px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
              mobileBoardView === "full"
                ? "bg-accent text-charcoal shadow-md font-extrabold"
                : "text-slate-grey hover:text-ivory"
            }`}
          >
            <Maximize2 className="h-3 w-3" />
            <span>Full Board</span>
          </button>
        </div>

        {/* Center Board Wrapper */}
        <div
          ref={containerRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className={`w-full max-w-sm sm:max-w-md aspect-square px-1 overflow-hidden rounded-2xl border border-border/30 relative shadow-2xl bg-charcoal select-none touch-none ${
            mobileBoardView === "focused" ? "cursor-grab active:cursor-grabbing" : ""
          }`}
        >
          <div
            className="grid-board bg-charcoal p-1 select-none"
            style={{
              width: "170%",
              height: "170%",
              position: "absolute",
              top: 0,
              left: 0,
              transformOrigin: "0% 0%",
              transform: mobileBoardView === "focused"
                ? `scale(1) translate(-${focusCoords.x * 0.4117}%, -${focusCoords.y * 0.4117}%)`
                : `scale(0.5882) translate(0, 0)`,
              transition: isDraggingState
                ? "transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)"
                : "transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)"
            }}
          >
            
            {/* RENDER ALL 40 SPACES */}
            {gameState.tiles.map((tile) => {
              const pos = getGridPosition(tile.index);
              const landedPlayers = gameState.players.filter(pl => pl.position === tile.index && !pl.isBankrupt);

              return (
                <div
                  key={tile.index}
                  onClick={() => {
                    setSelectedTileIndex(tile.index);
                    setMobileFocusedTile(tile.index);
                  }}
                  style={{ gridRow: pos.row, gridColumn: pos.col }}
                  className={`w-full h-full relative cursor-pointer overflow-hidden transition-all flex flex-col justify-between ${getTileBorder(tile)}`}
                >
                  {/* Render tile labels */}
                  {renderTileLabel(tile)}

                  {/* RENDER PLAYER TOKENS ON TILE */}
                  {landedPlayers.length > 0 && (
                    <div className="absolute bottom-0.5 right-0.5 z-10 flex flex-wrap-reverse justify-end gap-0.5 max-w-[85%] pointer-events-none">
                      {landedPlayers.map(p => (
                        <span
                          key={p.id}
                          title={p.name}
                          className={`h-3 w-3 rounded-full border border-slate-100 flex items-center justify-center text-[7px] shadow-md transition-transform ${p.color === "amber" ? "bg-gradient-to-br from-amber-400 to-amber-600" :
                            p.color === "indigo" ? "bg-gradient-to-br from-indigo-400 to-indigo-600" :
                              p.color === "emerald" ? "bg-gradient-to-br from-emerald-400 to-emerald-600" :
                                p.color === "rose" ? "bg-gradient-to-br from-rose-400 to-rose-600" : "bg-slate-500"
                            } animate-bounce-short`}
                        >
                          {getTokenEmoji(p.token)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {/* CENTRAL LOGO & STATS FIELD (with compact Mobile design) */}
            <div
              style={{
                gridRow: "2 / 11",
                gridColumn: "2 / 11",
                backgroundImage: "linear-gradient(rgba(6, 9, 19, 0.4), rgba(6, 9, 19, 0.4)), url('/PEBoard.png')",
                backgroundSize: "cover",
                backgroundPosition: "center"
              }}
              className="m-2 border border-border/30 rounded-xl p-3 flex flex-col justify-between items-center text-center shadow-inner relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(223,183,86,0.03)_0%,transparent_60%)] pointer-events-none" />

              <div className="flex flex-col items-center">
                <img
                  src="/PELogo.png"
                  alt="PROPEMPIRE Logo"
                  className="h-8 sm:h-10 w-auto object-contain mb-0.5 filter drop-shadow-[0_0_6px_rgba(196,157,71,0.1)]"
                />
                <p className="text-slate-grey uppercase font-black tracking-widest font-heading" style={{ fontSize: "clamp(8px, 1.8cqw, 10px)" }}>
                  BUILD. TRADE. DOMINATE.
                </p>
              </div>

              {/* Compact Active Player Turn banner in mobile board center */}
              {activePlayer && (
                <div className="my-1.5 flex items-center gap-1.5 bg-charcoal/80 border border-border/30 px-2 py-0.5 rounded-lg shadow-md">
                  <span className="animate-bounce-short leading-none" style={{ fontSize: "clamp(9px, 2.2cqw, 12px)" }}>{activePlayer.avatar}</span>
                  <span className="font-black uppercase text-ivory font-heading leading-none" style={{ fontSize: "clamp(8px, 1.8cqw, 10px)" }}>
                    {activePlayer.id === myPlayerId ? "YOUR TURN" : `${activePlayer.name.split(" ")[0].toUpperCase()}'S TURN`}
                  </span>
                  <span className="h-1 w-1 rounded-full bg-accent animate-pulse" />
                  <span className="font-bold text-accent font-numbers leading-none" style={{ fontSize: "clamp(8px, 1.8cqw, 10px)" }}>{gameState.turnTimer}s</span>
                </div>
              )}

              {/* Dice Display inside the center on mobile */}
              <div className="my-1.5 flex flex-col items-center gap-1">
                <div className="flex gap-2">
                  <div className={`h-8 w-8 rounded-lg bg-gradient-to-br from-ivory to-slate-200 border border-accent flex items-center justify-center text-charcoal text-sm font-black shadow-md font-numbers ${isRolling ? "animate-dice-shake" : ""}`}>
                    {gameState.dice[0]}
                  </div>
                  <div className={`h-8 w-8 rounded-lg bg-gradient-to-br from-ivory to-slate-200 border border-accent flex items-center justify-center text-charcoal text-sm font-black shadow-md font-numbers ${isRolling ? "animate-dice-shake" : ""}`}>
                    {gameState.dice[1]}
                  </div>
                </div>
                {botStatusText && (
                  <span className="text-accent font-bold uppercase tracking-wider animate-pulse mt-1 font-heading" style={{ fontSize: "clamp(8px, 2cqw, 11px)" }}>{botStatusText}</span>
                )}
              </div>

              {/* Compact balance list */}
              <div className="w-[90%] bg-charcoal/90 border border-border/40 px-3 py-1.5 rounded-lg shadow-md flex justify-around text-slate-grey font-numbers gap-4">
                <div className="text-center">
                  <span className="uppercase font-bold text-slate-grey block font-heading" style={{ fontSize: "clamp(7px, 1.6cqw, 9.5px)" }}>Cash</span>
                  <strong className="text-accent font-black" style={{ fontSize: "clamp(10px, 2.2cqw, 13px)" }}>◈{humanPlayer?.balance.toLocaleString()}</strong>
                </div>
                <div className="w-[1px] bg-border/40" />
                <div className="text-center">
                  <span className="uppercase font-bold text-slate-grey block font-heading" style={{ fontSize: "clamp(7px, 1.6cqw, 9.5px)" }}>Assets</span>
                  <strong className="text-accent font-black" style={{ fontSize: "clamp(10px, 2.2cqw, 13px)" }}>
                    {gameState.tiles.filter(t => t.ownerId === myPlayerId).length} Spaces
                  </strong>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Mobile Action Decision Banner */}
        {activePlayer && activePlayer.id === myPlayerId && (
          <div className="w-full max-w-sm px-1 z-30 animate-in fade-in slide-in-from-bottom duration-200">
            {/* Landing decisions */}
            {(!currentLandedTile.ownerId && (currentLandedTile.type === "PROPERTY" || currentLandedTile.type === "RAIL" || currentLandedTile.type === "UTILITY")) && (
              <div className="bg-card/90 backdrop-blur-md border border-accent/20 p-3 rounded-xl shadow-lg flex flex-col gap-2.5 items-center glass-panel-glow">
                <div className="text-center">
                  <span className="text-[9px] uppercase font-bold text-slate-grey block leading-none font-heading">Unowned space landed</span>
                  <strong className="text-[11px] font-black text-ivory uppercase mt-1 block font-heading">{currentLandedTile.name}</strong>
                </div>
                <div className="flex gap-2 w-full">
                  <button
                    onClick={buyProperty}
                    disabled={humanPlayer.balance < (currentLandedTile.cost || 0)}
                    className="flex-1 py-2.5 btn-game-primary rounded-lg shadow text-xs uppercase tracking-wider cursor-pointer font-heading"
                  >
                    Buy (◈{currentLandedTile.cost})
                  </button>
                  <button
                    onClick={startAuction}
                    className="flex-1 py-2.5 btn-game-secondary rounded-lg text-xs uppercase tracking-wider cursor-pointer font-heading"
                  >
                    Auction Space
                  </button>
                </div>
              </div>
            )}

            {/* Detention decisions */}
            {humanPlayer.inDetention && !gameState.hasRolledThisTurn && (
              <div className="bg-card/90 backdrop-blur-md border border-accent/20 p-3 rounded-xl shadow-lg flex flex-col gap-2.5 items-center glass-panel-glow">
                <div className="text-center">
                  <span className="text-[9px] uppercase font-bold text-accent block leading-none font-heading font-black">Arrested in Detention</span>
                  <span className="text-[9px] text-slate-grey mt-1 block font-sans">Resolve custody release</span>
                </div>
                <div className="flex gap-1.5 w-full">
                  <button
                    onClick={tryDoubleRoll}
                    disabled={isRolling}
                    className="flex-1 py-2 btn-game-secondary rounded-lg text-[9px] font-bold uppercase tracking-wider font-heading cursor-pointer"
                  >
                    Roll Doubles
                  </button>
                  <button
                    onClick={payDetentionFine}
                    disabled={activePlayer.balance < 50}
                    className="flex-1 py-2 btn-game-primary rounded-lg text-[9px] font-bold uppercase tracking-wider font-heading cursor-pointer text-slate-950"
                  >
                    Pay ◈50 Fine
                  </button>
                  {humanPlayer.escapeCardsCount > 0 && (
                    <button
                      onClick={useEscapeCard}
                      className="flex-1 py-2 btn-game-secondary border-indigo-500 rounded-lg text-[9px] font-bold uppercase tracking-wider font-heading cursor-pointer"
                    >
                      Clearance Card
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Mobile Detailed Tile Panel */}
        <div className="w-full max-w-sm sm:max-w-md px-1 mt-2">
          {renderDetailedTilePanel()}
        </div>

      </div>

      {/* MOBILE FLOATING CIRCULAR BUTTONS */}
      <div className="xl:hidden">

        {/* Left Actions Container */}
        <div className="fixed bottom-6 left-4 z-40 flex gap-2">
          {/* Trade button */}
          <button
            onClick={handleProposeTradeClick}
            className="h-12 w-12 rounded-full btn-game-secondary flex items-center justify-center shadow-lg active:scale-95 transition-all cursor-pointer shrink-0"
            title="Propose Trade"
          >
            <ArrowRightLeft className="h-5 w-5" />
          </button>

          {/* Assets button */}
          <button
            onClick={() => setShowAssetsModal(true)}
            className="h-12 w-12 rounded-full btn-game-secondary flex items-center justify-center shadow-lg active:scale-95 transition-all cursor-pointer shrink-0"
            title="View Assets"
          >
            <Scale className="h-5 w-5" />
          </button>
        </div>

        {/* Chat & Logs button (Bottom Right) */}
        <button
          onClick={() => setShowMobileChatSheet(true)}
          className="fixed bottom-6 right-4 z-40 h-12 w-12 rounded-full btn-game-secondary flex items-center justify-center text-accent shadow-lg active:scale-95 transition-all cursor-pointer"
          title="Boardroom Chat"
        >
          <MessageSquare className="h-5 w-5" />
          {unreadChatCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-ivory text-[8px] font-black h-5 w-5 rounded-full flex items-center justify-center border-2 border-charcoal animate-bounce font-numbers">
              {unreadChatCount}
            </span>
          )}
        </button>

        {/* Roll / End Turn / Turn Timer floating container (Bottom Center) */}
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center gap-1.5">
          {activePlayer && activePlayer.id === myPlayerId ? (
            <div className="flex flex-col items-center gap-1.5">
              {/* Floating "YOUR TURN" badge */}
              <div className="bg-gradient-to-r from-emerald-600/90 to-emerald-500/90 border border-emerald-450 px-3 py-1 rounded-full shadow-lg text-[9px] font-black uppercase text-slate-950 tracking-wider animate-pulse whitespace-nowrap">
                Your Turn ({gameState.turnTimer}s)
              </div>
              
              {!gameState.hasRolledThisTurn && !activePlayer.inDetention ? (
                <button
                  onClick={rollDice}
                  disabled={isRolling}
                  className={`h-16 w-16 rounded-full btn-game-primary flex items-center justify-center hover:scale-105 active:scale-95 transition-all cursor-pointer ${
                    gameState.turnTimer <= 5 
                      ? "animate-critical-glow" 
                      : "shadow-[0_0_20px_rgba(196,157,71,0.55)]"
                  }`}
                  title="Roll Dice"
                >
                  <Dice5 className="h-7 w-7 animate-pulse text-slate-950" />
                </button>
              ) : gameState.hasRolledThisTurn ? (
                <button
                  onClick={endTurn}
                  className={`h-16 w-16 rounded-full btn-game-primary flex items-center justify-center hover:scale-105 active:scale-95 transition-all cursor-pointer ${
                    gameState.turnTimer <= 5 
                      ? "animate-critical-glow" 
                      : "shadow-[0_0_20px_rgba(196,157,71,0.55)]"
                  }`}
                  title="End Turn"
                >
                  <ArrowRight className="h-7 w-7 animate-bounce-short text-slate-950" />
                </button>
              ) : null}
            </div>
          ) : activePlayer ? (
            <div className="flex items-center gap-1.5 bg-charcoal/95 backdrop-blur-md border border-accent/30 px-3.5 py-2 rounded-full shadow-2xl animate-fade-in glass-panel whitespace-nowrap text-[9px] font-black uppercase text-slate-grey tracking-wider font-heading">
              <span className="h-1.5 w-1.5 rounded-full bg-accent animate-ping shrink-0" />
              <span className="max-w-[65px] sm:max-w-[100px] truncate inline-block text-slate-grey font-extrabold align-bottom">
                {activePlayer.name.split(" ")[0]}
              </span>
              <span className="shrink-0 font-extrabold text-slate-grey">'s Turn</span>
              <div className="h-3 w-[1px] bg-border/40 mx-1 shrink-0" />
              <span className="text-[10px] font-black text-accent font-numbers shrink-0">{gameState.turnTimer}s</span>
            </div>
          ) : null}
        </div>
      </div>

      {/* MOBILE CHAT SLIDE OUT DRAWER */}
      {showMobileChatSheet && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/80 backdrop-blur-sm xl:hidden">
          <div className="w-full max-w-xs h-full bg-card border-l border-accent/20 p-4 shadow-2xl flex flex-col justify-between animate-slide-in-right glass-panel-glow">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-border/25">
              <h3 className="text-xs font-black uppercase text-ivory tracking-wider flex items-center gap-1.5 font-heading">
                <MessageSquare className="h-4 w-4 text-accent" />
                <span>Boardroom Panel</span>
              </h3>
              <button
                onClick={() => setShowMobileChatSheet(false)}
                className="p-1.5 hover:bg-secondary rounded-lg text-slate-grey hover:text-ivory cursor-pointer"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* Tab selection logs vs chat */}
            <div className="flex border-b border-border/20 my-3">
              <button
                onClick={() => setActiveTab("logs")}
                className={`flex-1 pb-2 text-[10px] font-black uppercase tracking-wider text-center transition-all cursor-pointer font-heading ${activeTab === "logs"
                  ? "text-accent border-b-2 border-accent"
                  : "text-slate-grey hover:text-ivory"
                  }`}
              >
                Match Logs
              </button>
              <button
                onClick={() => setActiveTab("chat")}
                className={`flex-1 pb-2 text-[10px] font-black uppercase tracking-wider text-center transition-all flex items-center justify-center gap-1.5 cursor-pointer font-heading ${activeTab === "chat"
                  ? "text-accent border-b-2 border-accent"
                  : "text-slate-grey hover:text-ivory"
                  }`}
              >
                <span>Chat</span>
                {unreadChatCount > 0 && (
                  <span className="bg-red-500 text-ivory text-[8px] font-black px-1.5 py-0.5 rounded-full font-numbers">
                    {unreadChatCount}
                  </span>
                )}
              </button>
            </div>

            {/* Content pane */}
            <div className="flex-grow overflow-y-auto min-h-0 flex flex-col justify-start">
              {activeTab === "logs" ? (
                <div className="flex-grow overflow-y-auto py-1 space-y-2 font-numbers">
                  {gameState.logs.map((log) => (
                    <div key={log.id} className="text-[11px] leading-relaxed">
                      <span className="text-slate-grey/65 font-medium mr-1.5">[{log.timestamp}]</span>
                      <span className={`font-semibold ${log.type === "rent" ? "text-red-400" :
                        log.type === "buy" ? "text-emerald-450" :
                          log.type === "card" ? "text-amber-400" :
                            log.type === "jail" ? "text-yellow-500" :
                              log.type === "bankruptcy" ? "text-red-500 font-bold" : "text-ivory/80"
                        }`}>{log.message.replaceAll("$", "◈")}</span>
                    </div>
                  ))}
                  <div ref={mobileLogsEndRef} />
                </div>
              ) : (
                <div className="flex-grow flex flex-col overflow-hidden justify-between">
                  <div className="flex-grow overflow-y-auto py-1 min-h-0 flex flex-col font-sans">
                    {chatMessages.length === 0 ? (
                      <div className="text-slate-grey/60 text-center text-[10px] italic py-4">No chat messages. Type below to alert players.</div>
                    ) : (
                      chatMessages.map((msg, index) => {
                        const showSender = index === 0 || chatMessages[index - 1].sender !== msg.sender;
                        return (
                          <div key={msg.id} className={`text-[11px] leading-normal ${index === 0 ? "mt-0" : showSender ? "mt-2" : "mt-0.5"}`}>
                            <span className="text-slate-grey/60 font-medium mr-1.5 font-numbers">[{msg.timestamp}]</span>
                            {showSender && (
                              <span className={`font-extrabold mr-1 ${msg.sender === (humanPlayer?.name || "You")
                                ? "text-accent"
                                : "text-slate-350"
                                }`}>{msg.sender}:</span>
                            )}
                            <span className="text-ivory/95">{msg.text}</span>
                          </div>
                        );
                      })
                    )}
                    <div ref={mobileChatEndRef} />
                  </div>
                  
                  {/* Chat input */}
                  <form onSubmit={handleSendInGameMessage} className="mt-2 flex gap-1.5 pt-1.5 border-t border-border/20">
                    <input
                      type="text"
                      placeholder="Alert shareholders..."
                      value={inGameChatMessage}
                      onChange={(e) => setInGameChatMessage(e.target.value)}
                      className="flex-grow bg-secondary border border-border/80 rounded px-2 text-xs text-ivory placeholder-slate-grey/40 outline-none focus:border-accent"
                    />
                    <button
                      type="submit"
                      className="p-1 px-3 btn-game-primary text-slate-950 rounded text-xs font-bold cursor-pointer font-heading"
                    >
                      Send
                    </button>
                  </form>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

    </main>
  </div>
  );
}
