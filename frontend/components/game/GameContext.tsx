"use client";
import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import {
  GameState,
  Player,
  Tile,
  GameCard,
  INITIAL_TILES,
  executeBotTurn,
  resolveTileLanding,
  placeBid,
  passBid,
  handleBankruptcy,
  createLog,
  ownsDistrict,
  TokenType,
  drawCard,
  calculateRent,
  triggerAuction,
  endAuctionLocal
} from "@/lib/game-engine";
import { socket } from "@/lib/socket";

export interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  timestamp: string;
}

export interface PersonalScore {
  name: string;
  avatar: string;
  token: string;
  balance: number;
  propertiesValue: number;
  netWorth: number;
}

export interface TradeOfferInput {
  properties: number[];
  cash: number;
  escapeCards: number;
}

interface GameContextProps {
  gameState: GameState;
  activePlayer: Player;
  humanPlayer: Player;
  rollDice: () => void;
  buyProperty: () => void;
  startAuction: () => void;
  placeBidAmount: (amount: number) => void;
  passAuction: () => void;
  endTurn: () => void;
  buildHouse: (tileIdx: number) => void;
  buildHotel: (tileIdx: number) => void;
  mortgageProperty: (tileIdx: number) => void;
  unmortgageProperty: (tileIdx: number) => void;
  proposeTrade: (receiverId: string, proposerOffer: TradeOfferInput, receiverOffer: TradeOfferInput) => void;
  respondToTrade: (accept: boolean) => void;
  dismissCard: () => void;
  payDetentionFine: () => void;
  useEscapeCard: () => void;
  tryDoubleRoll: () => void;
  startGame: (settings?: { maxPlayers: number; startingCapital: number; turnTimerLimit: number; rollTimerBonus: number; botsEnabled: boolean; botCount: number; auctionTimerLimit?: number }) => void;
  setupNewGame: (playersCount: number, selectedToken: TokenType, roomId?: string, isCreating?: boolean) => void;
  sellHouse: (tileIdx: number) => void;
  isRolling: boolean;
  botStatusText: string;
  setSelectedTileIndex: (index: number) => void;
  sendChatMessage: (text: string) => void;
  chatMessages: ChatMessage[];
  myPlayerId: string;
  updatePlayerInfo: (name: string, token: TokenType) => void;
  kickPlayer: (playerIdToKick: string) => void;
  endGame: () => void;
  leaveGame: () => void;
  hostEndedResults: { players: Player[]; tiles: Tile[] } | null;
  leftGameResults: PersonalScore | null;
  setHostEndedResults: (results: { players: Player[]; tiles: Tile[] } | null) => void;
  setLeftGameResults: (results: PersonalScore | null) => void;
}

const GameContext = createContext<GameContextProps | undefined>(undefined);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [gameError, setGameError] = useState<string | null>(null);
  const [gameState, setGameState] = useState<GameState>({
    roomId: "PE-8742",
    players: [],
    tiles: JSON.parse(JSON.stringify(INITIAL_TILES)),
    activePlayerIndex: 0,
    dice: [1, 1],
    hasRolledThisTurn: false,
    selectedTileIndex: 0,
    logs: [createLog("Welcome to PropEmpire! Host room is ready. Choose your token to build your capital.")],
    auction: { isActive: false, tileIndex: 0, highestBid: 0, activeBidders: [], timer: 0 },
    trade: { isActive: false, proposerId: "", receiverId: "", proposerOffer: { properties: [], cash: 0, escapeCards: 0 }, receiverOffer: { properties: [], cash: 0, escapeCards: 0 } },
    drawnCard: null,
    turnTimer: 60,
    status: "LOBBY"
  });

  const [isRolling, setIsRolling] = useState(false);
  const [botStatusText, setBotStatusText] = useState("");
  const [useBackend, setUseBackend] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [hostEndedResults, setHostEndedResults] = useState<{ players: Player[]; tiles: Tile[] } | null>(null);
  const [leftGameResults, setLeftGameResults] = useState<PersonalScore | null>(null);

  const botTimerRef = useRef<NodeJS.Timeout | null>(null);
  const auctionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const localBotCooldownsRef = useRef<{ [botId: string]: number }>({});

  const [myPlayerId, setMyPlayerId] = useState<string>("");
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window !== "undefined") {
      let storedId = localStorage.getItem("propempire_player_id");
      if (!storedId) {
        storedId = `p_${Math.random().toString(36).substring(2, 11)}`;
        localStorage.setItem("propempire_player_id", storedId);
      }
      const finalId = storedId;
      setTimeout(() => {
        setMyPlayerId(finalId);
      }, 0);
    }
  }, []);

  // Auto-join backend room on connection/reconnection or route changes
  useEffect(() => {
    if (useBackend && myPlayerId) {
      if (typeof window !== "undefined") {
        if (pathname.startsWith("/lobby/") || pathname.startsWith("/game/")) {
          const parts = pathname.split("/");
          const urlRoomId = parts[2]?.toUpperCase();
          if (urlRoomId) {
            const guestName = localStorage.getItem("propempire_username") || "Guest Investor";
            const selectedToken = (localStorage.getItem("propempire_token") as TokenType) || "Rocket";
            const isCreating = sessionStorage.getItem(`host_room_${urlRoomId}`) === "true";
            socket.emit("JOIN_LOBBY", {
              roomId: urlRoomId,
              playerId: myPlayerId,
              name: guestName,
              avatar: "💼",
              token: selectedToken,
              isCreating: isCreating
            });
          }
        }
      }
    }
  }, [useBackend, myPlayerId, pathname]);

  const activePlayer = gameState.players[gameState.activePlayerIndex] || null;
  const humanPlayer = gameState.players.find(p => p.id === myPlayerId) || gameState.players[0] || null;

  // Socket.IO Connection and event sync
  useEffect(() => {
    // Attempt socket connection
    socket.connect();

    const handleConnect = () => {
      setUseBackend(true);
      setGameState(prev => ({
        ...prev,
        logs: [...prev.logs, createLog("Linked to real-time multiplayer backend server. Boardroom synchronized.", "system")]
      }));
    };

    const handleDisconnect = () => {
      setUseBackend(false);
      setGameState(prev => ({
        ...prev,
        logs: [...prev.logs, createLog("Connection interrupted. Boardroom switched to local boardroom emulation.", "system")]
      }));
    };

    const handleStateUpdate = (newState: GameState) => {
      setGameState(prev => {
        const orderedLogs = newState.logs ? [...newState.logs].reverse() : [];
        return {
          ...newState,
          logs: orderedLogs,
          selectedTileIndex: prev.selectedTileIndex // Preserve client-side selected tile index
        };
      });
      // Stop local loaders
      setBotStatusText("");
    };

    const handleChat = (chat: { sender: string; text: string; type: string }) => {
      const msg: ChatMessage = {
        id: `${Date.now()}_${Math.random()}`,
        sender: chat.sender,
        text: chat.text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      };
      setChatMessages(prev => [...prev, msg]);
    };

    const handleBotPlanning = (data: { name: string }) => {
      setBotStatusText(`${data.name} is planning...`);
    };

    const handleKicked = () => {
      setGameError("You have been kicked from the boardroom by the Host.");
    };

    const handleGameEndedByHost = (data?: GameState) => {
      if (data && data.players && data.tiles) {
        setHostEndedResults({ players: data.players, tiles: data.tiles });
      } else {
        setGameState(prev => {
          setHostEndedResults({ players: prev.players, tiles: prev.tiles });
          return prev;
        });
      }
    };

    const handleError = (err: { message: string }) => {
      setGameError(err.message);
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("ROOM_STATE_UPDATED", handleStateUpdate);
    socket.on("CHAT_RECEIVED", handleChat);
    socket.on("BOT_PLANNING", handleBotPlanning);
    socket.on("YOU_WERE_KICKED", handleKicked);
    socket.on("GAME_ENDED_BY_HOST", handleGameEndedByHost);
    socket.on("ERROR", handleError);

    if (socket.connected) {
      handleConnect();
    }

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("ROOM_STATE_UPDATED", handleStateUpdate);
      socket.off("CHAT_RECEIVED", handleChat);
      socket.off("BOT_PLANNING", handleBotPlanning);
      socket.off("YOU_WERE_KICKED", handleKicked);
      socket.off("GAME_ENDED_BY_HOST", handleGameEndedByHost);
      socket.off("ERROR", handleError);
    };
  }, []);

  // LOCAL PLAYING TIMER (Only active when NOT using backend)
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (gameState.status === "PLAYING" && !useBackend) {
      interval = setInterval(() => {
        setGameState(prev => {
          if (prev.turnTimer <= 1) {
            const activeIdx = prev.activePlayerIndex;
            let nextState = { ...prev };
            const p = nextState.players[activeIdx];
            
            // If they haven't rolled yet, auto-roll
            if (!nextState.hasRolledThisTurn) {
              if (p.inDetention) {
                if (p.balance > 300) {
                  p.balance -= 50;
                  p.inDetention = false;
                  p.detentionTurns = 0;
                  nextState.logs.push(createLog(`${p.name} paid ◈50 fine to clear Detention (Auto-Escaped).`, "jail"));
                } else if (p.escapeCardsCount > 0) {
                  p.escapeCardsCount--;
                  p.inDetention = false;
                  p.detentionTurns = 0;
                  nextState.logs.push(createLog(`${p.name} used Detention Clearance Card (Auto-Escaped).`, "jail"));
                } else {
                  // Try double roll
                  const d1 = Math.floor(Math.random() * 6) + 1;
                  const d2 = Math.floor(Math.random() * 6) + 1;
                  nextState.dice = [d1, d2];
                  nextState.hasRolledThisTurn = true;
                  nextState.logs.push(createLog(`${p.name} auto-rolled [${d1}, ${d2}] escaping Detention.`, "roll"));
                  if (d1 === d2) {
                    p.inDetention = false;
                    p.detentionTurns = 0;
                    const targetPos = (p.position + d1 + d2) % 40;
                    p.position = targetPos;
                    nextState.logs.push(createLog(`${p.name} rolled doubles and escaped to ${nextState.tiles[targetPos].name}!`, "jail"));
                    nextState = resolveTileLanding(nextState, activeIdx, targetPos, d1 + d2);
                  } else {
                    p.detentionTurns++;
                    nextState.logs.push(createLog(`${p.name} failed doubles (Detention turn ${p.detentionTurns}/3).`, "jail"));
                    if (p.detentionTurns >= 3) {
                      p.balance = Math.max(0, p.balance - 50);
                      p.inDetention = false;
                      p.detentionTurns = 0;
                      nextState.logs.push(createLog(`${p.name} served maximum term. Paid forced fine of ◈50.`, "jail"));
                      nextState = handleBankruptcy(nextState, activeIdx);
                    }
                  }
                }
              }
              
              if (!p.inDetention && !nextState.hasRolledThisTurn) {
                const d1 = Math.floor(Math.random() * 6) + 1;
                const d2 = Math.floor(Math.random() * 6) + 1;
                nextState.dice = [d1, d2];
                nextState.hasRolledThisTurn = true;
                const steps = d1 + d2;
                const oldPos = p.position;
                const targetPos = (oldPos + steps) % 40;
                p.position = targetPos;
                nextState.logs.push(createLog(`${p.name} auto-rolled [${d1}, ${d2}] and landed on ${nextState.tiles[targetPos].name}.`, "roll"));
                if (targetPos < oldPos) {
                  p.balance += 200;
                  nextState.logs.push(createLog(`${p.name} passed START and collected ◈200 surplus.`, "system"));
                }
                nextState = resolveTileLanding(nextState, activeIdx, targetPos, steps);
              }
            }
            
            // Check tile landing
            const tile = nextState.tiles[p.position];
            const isUnownedProperty = (tile.type === "PROPERTY" || tile.type === "RAIL" || tile.type === "UTILITY") && !tile.ownerId;
            
            if (isUnownedProperty) {
              // Trigger auction
              nextState = triggerAuction(nextState, tile.index);
              nextState.auction.timer = nextState.auctionTimerLimit || 15;
              return nextState;
            } else {
              // Auto dismiss card if drawn
              if (nextState.drawnCard) {
                const result = nextState.drawnCard.card.action(nextState, activeIdx);
                nextState = result.state;
                nextState.logs.push(createLog(result.log, "card"));
                nextState.drawnCard = null;
              }
              
              // Transition turn
              let nextIdx = (activeIdx + 1) % nextState.players.length;
              while (nextState.players[nextIdx].isBankrupt) {
                nextIdx = (nextIdx + 1) % nextState.players.length;
              }
              return {
                ...nextState,
                activePlayerIndex: nextIdx,
                hasRolledThisTurn: false,
                turnTimer: nextState.turnTimerLimit || 60,
                drawnCard: null,
                logs: [...nextState.logs, createLog(`--- Turn transitioned due to timeout to ${nextState.players[nextIdx].name} ---`)]
              };
            }
          }
          return {
            ...prev,
            turnTimer: prev.turnTimer - 1
          };
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [gameState.status, useBackend]);

  // LOCAL AUCTION TIMER (Only active when NOT using backend)
  useEffect(() => {
    if (gameState.auction.isActive && !useBackend) {
      auctionTimerRef.current = setInterval(() => {
        setGameState(prev => {
          if (!prev.auction.isActive) return prev;
          if (prev.auction.timer <= 1) {
            return endAuctionLocal(prev);
          }
          return {
            ...prev,
            auction: {
              ...prev.auction,
              timer: prev.auction.timer - 1
            }
          };
        });
      }, 1000);
    }
    return () => {
      if (auctionTimerRef.current) clearInterval(auctionTimerRef.current);
    };
  }, [gameState.auction.isActive, useBackend]);

  // LOCAL BOT AUCTION ACTION (Only active when NOT using backend)
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (gameState.auction.isActive && !useBackend) {
      interval = setInterval(() => {
        setGameState(prev => {
          if (!prev.auction.isActive) return prev;
          
          let stateChanged = false;
          let nextState = { ...prev };
          const now = Date.now();
          
          nextState.players.forEach(p => {
            if (p.isBot && !p.isBankrupt && prev.auction.activeBidders.includes(p.id)) {
              const lastBid = localBotCooldownsRef.current[p.id] || 0;
              if (now - lastBid >= 2000) {
                const tile = nextState.tiles[nextState.auction.tileIndex];
                const maxPrice = (tile.cost || 100) * 0.9;
                const currentBid = nextState.auction.highestBid;
                
                if (currentBid < maxPrice && p.balance > currentBid + 20) {
                  if (Math.random() < 0.4) {
                    const bidIncrement = Math.floor(Math.random() * 20) + 10;
                    nextState = placeBid(nextState, p.id, currentBid + bidIncrement);
                    localBotCooldownsRef.current[p.id] = now;
                    nextState.auction.timer = nextState.auctionTimerLimit || 15;
                    stateChanged = true;
                  }
                } else {
                  if (Math.random() < 0.3) {
                    nextState = passBid(nextState, p.id);
                    stateChanged = true;
                  }
                }
              }
            }
          });
          
          return stateChanged ? nextState : prev;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [gameState.auction.isActive, useBackend]);

  // Initialize Lobby Join
  const setupNewGame = (playersCount: number, selectedToken: TokenType, roomId?: string, isCreatingParam?: boolean) => {
    const targetRoomId = roomId || gameState.roomId;
    let guestName = "Guest Investor";
    if (typeof window !== "undefined") {
      guestName = localStorage.getItem("propempire_username") || "Guest Investor";
    }

    if (useBackend) {
      const isCreating = isCreatingParam || (typeof window !== "undefined" ? sessionStorage.getItem(`host_room_${targetRoomId}`) === "true" : false);
      socket.emit("JOIN_LOBBY", {
        roomId: targetRoomId,
        playerId: myPlayerId,
        name: guestName,
        avatar: "💼",
        token: selectedToken,
        isCreating: isCreating
      });
    } else {
      // Setup local room state
      const listTokens: TokenType[] = ["Car", "Dog", "Top Hat", "Ship", "Cat", "Duck", "Crown", "Rocket"];
      const botNames = ["Alex (AI)", "Sarah (AI)", "Ryan (AI)", "Emma (AI)"];
      const avatars = ["👔", "💻", "🎨", "🚀"];
      const colors = ["indigo", "emerald", "amber", "rose"];

      const players: Player[] = [
        {
          id: myPlayerId || "p1",
          name: guestName,
          avatar: "💼",
          token: selectedToken,
          balance: 1500,
          position: 0,
          ownedProperties: [],
          escapeCardsCount: 0,
          inDetention: false,
          detentionTurns: 0,
          isBankrupt: false,
          isBot: false,
          color: "amber",
          isOnline: true
        }
      ];

      const remainingTokens = listTokens.filter(t => t !== selectedToken);

      for (let i = 1; i < playersCount; i++) {
        const tokenIdx = Math.floor(Math.random() * remainingTokens.length);
        const token = remainingTokens[tokenIdx];
        remainingTokens.splice(tokenIdx, 1);

        players.push({
          id: `p${i + 1}`,
          name: botNames[i - 1] || `AI Bot ${i}`,
          avatar: avatars[i - 1] || "🤖",
          token,
          balance: 1500,
          position: 0,
          ownedProperties: [],
          escapeCardsCount: 0,
          inDetention: false,
          detentionTurns: 0,
          isBankrupt: false,
          isBot: true,
          color: colors[i - 1] || "slate",
          isOnline: true
        });
      }

      setGameState({
        roomId: targetRoomId,
        players,
        tiles: JSON.parse(JSON.stringify(INITIAL_TILES)),
        activePlayerIndex: 0,
        dice: [1, 1],
        hasRolledThisTurn: false,
        selectedTileIndex: 0,
        logs: [createLog("Lobby created. Ready to build empires.")],
        auction: { isActive: false, tileIndex: 0, highestBid: 0, activeBidders: [], timer: 0 },
        trade: { isActive: false, proposerId: "", receiverId: "", proposerOffer: { properties: [], cash: 0, escapeCards: 0 }, receiverOffer: { properties: [], cash: 0, escapeCards: 0 } },
        drawnCard: null,
        turnTimer: 60,
        auctionTimerLimit: 15,
        status: "LOBBY"
      });
    }
  };

  const startGame = (settings?: { maxPlayers: number; startingCapital: number; turnTimerLimit: number; rollTimerBonus: number; botsEnabled: boolean; botCount: number; auctionTimerLimit?: number }) => {
    if (useBackend) {
      socket.emit("TOGGLE_READY", { roomId: gameState.roomId, settings });
    } else {
      setGameState(prev => {
        const startingCap = settings?.startingCapital || 1500;
        const timeLimit = settings?.turnTimerLimit || 60;
        const rollBonus = settings?.rollTimerBonus || 15;
        const playersLimit = settings?.maxPlayers || 4;
        const botsEnabled = settings?.botsEnabled !== false;
        const botCount = botsEnabled ? (settings?.botCount ?? 3) : 0;
        const auctionTimerLimit = settings?.auctionTimerLimit || 15;

        // Reset balances for already joined players
        const updatedPlayers = prev.players.map(p => ({
          ...p,
          balance: startingCap
        }));

        if (botCount > 0) {
          // Dynamically provision bots to reach the target player limit
          const listTokens: TokenType[] = ["Car", "Dog", "Top Hat", "Ship", "Cat", "Duck", "Crown", "Rocket"];
          const botNames = ["Alex (AI)", "Sarah (AI)", "Ryan (AI)", "Emma (AI)", "James (AI)", "Olivia (AI)", "Lucas (AI)"];
          const avatars = ["👔", "💻", "🎨", "🚀", "👔", "💻", "🎨"];
          const colors = ["indigo", "emerald", "amber", "rose", "slate", "pink", "cyan"];
          
          let remainingTokens = listTokens.filter(t => !updatedPlayers.some(p => p.token === t));
          const currentCount = updatedPlayers.length;
          
          // Add exactly botCount bots, capping total at playersLimit
          const spawnCount = Math.min(botCount, playersLimit - currentCount);
          
          for (let i = 0; i < spawnCount; i++) {
            const botToken = remainingTokens[0] || "Car";
            remainingTokens = remainingTokens.slice(1);
            
            updatedPlayers.push({
              id: `bot_${currentCount + i}`,
              name: botNames[i] || `AI Bot ${currentCount + i}`,
              avatar: avatars[i] || "🤖",
              token: botToken,
              balance: startingCap,
              position: 0,
              ownedProperties: [],
              escapeCardsCount: 0,
              inDetention: false,
              detentionTurns: 0,
              isBankrupt: false,
              isBot: true,
              color: colors[i] || "slate",
              isOnline: true
            });
          }
        }

        return {
          ...prev,
          players: updatedPlayers,
          status: "PLAYING",
          turnTimer: timeLimit,
          turnTimerLimit: timeLimit,
          rollTimerBonus: rollBonus,
          maxPlayers: playersLimit,
          startingCapital: startingCap,
          botsEnabled: botsEnabled,
          botCount: botCount,
          auctionTimerLimit: auctionTimerLimit,
          logs: [...prev.logs, createLog("PropEmpire match started! Game loop initialised.")]
        };
      });
    }
  };

  // Roll action
  const rollDice = () => {
    if (useBackend) {
      socket.emit("ROLL_DICE", { roomId: gameState.roomId });
    } else {
      if (gameState.hasRolledThisTurn || activePlayer.isBot || gameState.status !== "PLAYING") return;

      setIsRolling(true);
      setGameState(prev => ({
        ...prev,
        logs: [...prev.logs, createLog(`${activePlayer.name} shaking dice...`)]
      }));

      setTimeout(() => {
        setIsRolling(false);
        const d1 = Math.floor(Math.random() * 6) + 1;
        const d2 = Math.floor(Math.random() * 6) + 1;
        
        setGameState(prev => {
          const p = prev.players[prev.activePlayerIndex];
          const steps = d1 + d2;
          const oldPos = p.position;
          
          const newPos = (oldPos + steps) % 40;
          let pBalance = p.balance;
          const logs = [...prev.logs];
          
          logs.push(createLog(`${p.name} rolled [${d1}, ${d2}] (Total: ${steps}) and landed on ${prev.tiles[newPos].name}.`, "roll"));
          if (newPos < oldPos) {
            pBalance += 200;
            logs.push(createLog(`${p.name} passed START and collected ◈200 surplus.`, "system"));
          }
          
          const updatedPlayers = prev.players.map((player, idx) => {
            if (idx === prev.activePlayerIndex) {
              return {
                ...player,
                position: newPos,
                balance: pBalance
              };
            }
            return player;
          });

          let nextState: GameState = {
            ...prev,
            players: updatedPlayers,
            dice: [d1, d2] as [number, number],
            hasRolledThisTurn: true,
            logs,
            turnTimer: prev.turnTimer + (prev.rollTimerBonus || 15)
          };

          nextState = resolveTileLanding(nextState, prev.activePlayerIndex, newPos, steps);
          return nextState;
        });
      }, 1200);
    }
  };

  const buyProperty = () => {
    if (useBackend) {
      socket.emit("BUY_PROPERTY", { roomId: gameState.roomId });
    } else {
      const tile = gameState.tiles[activePlayer.position];
      const price = tile.cost || 0;
      if (activePlayer.balance < price) return;

      setGameState(prev => {
        const p = prev.players[prev.activePlayerIndex];
        const updatedPlayers = prev.players.map((pl, idx) => {
          if (idx === prev.activePlayerIndex) {
            return {
              ...pl,
              balance: pl.balance - price,
              ownedProperties: [...pl.ownedProperties, tile.index]
            };
          }
          return pl;
        });

        const updatedTiles = prev.tiles.map((t, idx) => {
          if (idx === tile.index) {
            return { ...t, ownerId: p.id };
          }
          return t;
        });

        return {
          ...prev,
          players: updatedPlayers,
          tiles: updatedTiles,
          logs: [...prev.logs, createLog(`${p.name} purchased ${tile.name} for ◈${price}.`, "buy")]
        };
      });
    }
  };

  const startAuction = () => {
    if (useBackend) {
      socket.emit("START_AUCTION", { roomId: gameState.roomId });
    } else {
      setGameState(prev => triggerAuction(prev, prev.players[prev.activePlayerIndex].position));
    }
  };

  const placeBidAmount = (amount: number) => {
    if (useBackend) {
      socket.emit("PLACE_BID", { roomId: gameState.roomId, amount });
    } else {
      setGameState(prev => placeBid(prev, myPlayerId || "p1", amount));
    }
  };

  const passAuction = () => {
    if (useBackend) {
      socket.emit("PASS_BID", { roomId: gameState.roomId });
    } else {
      setGameState(prev => passBid(prev, myPlayerId || "p1"));
    }
  };

  const endTurn = () => {
    if (useBackend) {
      socket.emit("END_TURN", { roomId: gameState.roomId });
    } else {
      if (!gameState.hasRolledThisTurn && !activePlayer.inDetention) return;

      setGameState(prev => {
        let nextIdx = (prev.activePlayerIndex + 1) % prev.players.length;
        while (prev.players[nextIdx].isBankrupt) {
          nextIdx = (nextIdx + 1) % prev.players.length;
        }

        return {
          ...prev,
          activePlayerIndex: nextIdx,
          hasRolledThisTurn: false,
          turnTimer: 60,
          drawnCard: null,
          logs: [...prev.logs, createLog(`--- Turn transitioned to ${prev.players[nextIdx].name} ---`)]
        };
      });
    }
  };

  // Upgrades and Actions
  const buildHouse = (tileIdx: number) => {
    if (useBackend) {
      socket.emit("BUILD_HOUSE", { roomId: gameState.roomId, tileIndex: tileIdx });
    } else {
      const tile = gameState.tiles[tileIdx];
      const humanId = myPlayerId || "p1";
      if (!tile || tile.type !== "PROPERTY" || tile.ownerId !== humanId) return;
      const districtOwned = ownsDistrict(gameState, humanId, tile.district || "");
      const cost = tile.houseCost || 100;
      
      // Enforce even building
      const districtTiles = gameState.tiles.filter(t => t.district === tile.district);
      const minHouses = Math.min(...districtTiles.map(t => t.houseCount));
      
      if (!districtOwned || tile.houseCount >= 4 || tile.houseCount !== minHouses || humanPlayer.balance < cost) return;

      setGameState(prev => {
        const updatedTiles = prev.tiles.map(t => {
          if (t.index === tileIdx) return { ...t, houseCount: t.houseCount + 1 };
          return t;
        });
        const updatedPlayers = prev.players.map(p => {
          if (p.id === humanId) return { ...p, balance: p.balance - cost };
          return p;
        });
        return {
          ...prev,
          tiles: updatedTiles,
          players: updatedPlayers,
          logs: [...prev.logs, createLog(`Built a House on ${tile.name} (Paid ◈${cost}).`, "build")]
        };
      });
    }
  };

  const buildHotel = (tileIdx: number) => {
    if (useBackend) {
      socket.emit("BUILD_HOTEL", { roomId: gameState.roomId, tileIndex: tileIdx });
    } else {
      const tile = gameState.tiles[tileIdx];
      const humanId = myPlayerId || "p1";
      if (!tile || tile.type !== "PROPERTY" || tile.ownerId !== humanId) return;
      const cost = tile.houseCost || 100;
      
      // Enforce even building (all other properties in color group must have at least 4 houses)
      const districtTiles = gameState.tiles.filter(t => t.district === tile.district);
      const allHave4 = districtTiles.every(t => t.houseCount >= 4);
      
      if (tile.houseCount !== 4 || !allHave4 || humanPlayer.balance < cost) return;

      setGameState(prev => {
        const updatedTiles = prev.tiles.map(t => {
          if (t.index === tileIdx) return { ...t, houseCount: 5 };
          return t;
        });
        const updatedPlayers = prev.players.map(p => {
          if (p.id === humanId) return { ...p, balance: p.balance - cost };
          return p;
        });
        return {
          ...prev,
          tiles: updatedTiles,
          players: updatedPlayers,
          logs: [...prev.logs, createLog(`Upgraded to a Hotel on ${tile.name} (Paid ◈${cost}).`, "build")]
        };
      });
    }
  };

  const mortgageProperty = (tileIdx: number) => {
    if (useBackend) {
      socket.emit("MORTGAGE", { roomId: gameState.roomId, tileIndex: tileIdx });
    } else {
      const tile = gameState.tiles[tileIdx];
      const humanId = myPlayerId || "p1";
      if (!tile || tile.ownerId !== humanId || tile.isMortgaged) return;

      const mortgageVal = tile.mortgageValue || 50;

      setGameState(prev => {
        const updatedTiles = prev.tiles.map(t => {
          if (t.index === tileIdx) return { ...t, isMortgaged: true, houseCount: 0 };
          return t;
        });
        const updatedPlayers = prev.players.map(p => {
          if (p.id === humanId) return { ...p, balance: p.balance + mortgageVal };
          return p;
        });
        return {
          ...prev,
          tiles: updatedTiles,
          players: updatedPlayers,
          logs: [...prev.logs, createLog(`Mortgaged ${tile.name} (Received ◈${mortgageVal}).`, "mortgage")]
        };
      });
    }
  };

  const unmortgageProperty = (tileIdx: number) => {
    if (useBackend) {
      socket.emit("UNMORTGAGE", { roomId: gameState.roomId, tileIndex: tileIdx });
    } else {
      const tile = gameState.tiles[tileIdx];
      const humanId = myPlayerId || "p1";
      if (!tile || tile.ownerId !== humanId || !tile.isMortgaged) return;

      const unmortgageVal = tile.unmortgageValue || 55;
      if (humanPlayer.balance < unmortgageVal) return;

      setGameState(prev => {
        const updatedTiles = prev.tiles.map(t => {
          if (t.index === tileIdx) return { ...t, isMortgaged: false };
          return t;
        });
        const updatedPlayers = prev.players.map(p => {
          if (p.id === humanId) return { ...p, balance: p.balance - unmortgageVal };
          return p;
        });
        return {
          ...prev,
          tiles: updatedTiles,
          players: updatedPlayers,
          logs: [...prev.logs, createLog(`Unmortgaged ${tile.name} (Paid ◈${unmortgageVal}).`, "mortgage")]
        };
      });
    }
  };

  const sellHouse = (tileIdx: number) => {
    if (useBackend) {
      socket.emit("SELL_HOUSE", { roomId: gameState.roomId, tileIndex: tileIdx });
    } else {
      const tile = gameState.tiles[tileIdx];
      const humanId = myPlayerId || "p1";
      if (!tile || tile.type !== "PROPERTY" || tile.ownerId !== humanId || tile.houseCount <= 0) return;
      
      const districtTiles = gameState.tiles.filter(t => t.district === tile.district);
      const maxHouses = Math.max(...districtTiles.map(t => t.houseCount));
      
      // Enforce even selling (must sell from property with most houses first)
      if (tile.houseCount !== maxHouses) return;

      const refund = Math.floor((tile.houseCost || 100) / 2);

      setGameState(prev => {
        const updatedTiles = prev.tiles.map(t => {
          if (t.index === tileIdx) return { ...t, houseCount: t.houseCount - 1 };
          return t;
        });
        const updatedPlayers = prev.players.map(p => {
          if (p.id === humanId) return { ...p, balance: p.balance + refund };
          return p;
        });
        return {
          ...prev,
          tiles: updatedTiles,
          players: updatedPlayers,
          logs: [...prev.logs, createLog(`Sold a ${tile.houseCount === 5 ? "Hotel" : "House"} on ${tile.name} (Refunded ◈${refund}).`, "build")]
        };
      });
    }
  };

  const proposeTrade = (receiverId: string, proposerOffer: TradeOfferInput, receiverOffer: TradeOfferInput) => {
    if (useBackend) {
      socket.emit("PROPOSE_TRADE", { roomId: gameState.roomId, receiverId, proposerOffer, receiverOffer });
    } else {
      setGameState(prev => ({
        ...prev,
        trade: {
          isActive: true,
          proposerId: myPlayerId || "p1",
          receiverId,
          proposerOffer,
          receiverOffer
        }
      }));
    }
  };

  const respondToTrade = (accept: boolean) => {
    if (useBackend) {
      socket.emit("RESPOND_TRADE", { roomId: gameState.roomId, accept });
    } else {
      setGameState(prev => {
        if (!prev.trade.isActive) return prev;
        
        const receiver = prev.players.find(p => p.id === prev.trade.receiverId);
        const proposer = prev.players.find(p => p.id === prev.trade.proposerId);
        
        if (!receiver || !proposer) return { ...prev, trade: { ...prev.trade, isActive: false } };

        const logs = [...prev.logs];

        if (accept) {
          const updatedPlayers = prev.players.map(p => {
            if (p.id === proposer.id) {
              return {
                ...p,
                balance: p.balance - prev.trade.proposerOffer.cash + prev.trade.receiverOffer.cash,
                escapeCardsCount: p.escapeCardsCount - prev.trade.proposerOffer.escapeCards + prev.trade.receiverOffer.escapeCards,
                ownedProperties: p.ownedProperties
                  .filter(idx => !prev.trade.proposerOffer.properties.includes(idx))
                  .concat(prev.trade.receiverOffer.properties)
              };
            }
            if (p.id === receiver.id) {
              return {
                ...p,
                balance: p.balance - prev.trade.receiverOffer.cash + prev.trade.proposerOffer.cash,
                escapeCardsCount: p.escapeCardsCount - prev.trade.receiverOffer.escapeCards + prev.trade.proposerOffer.escapeCards,
                ownedProperties: p.ownedProperties
                  .filter(idx => !prev.trade.receiverOffer.properties.includes(idx))
                  .concat(prev.trade.proposerOffer.properties)
              };
            }
            return p;
          });

          const updatedTiles = prev.tiles.map(t => {
            if (prev.trade.proposerOffer.properties.includes(t.index)) {
              return { ...t, ownerId: receiver.id };
            }
            if (prev.trade.receiverOffer.properties.includes(t.index)) {
              return { ...t, ownerId: proposer.id };
            }
            return t;
          });

          logs.push(createLog(`Trade deal Accepted! Assets transferred between ${proposer.name} and ${receiver.name}.`, "trade"));
          
          return {
            ...prev,
            players: updatedPlayers,
            tiles: updatedTiles,
            trade: { ...prev.trade, isActive: false },
            logs
          };
        } else {
          logs.push(createLog(`Trade proposal declined by ${receiver.name}.`, "trade"));
          return {
            ...prev,
            trade: { ...prev.trade, isActive: false },
            logs
          };
        }
      });
    }
  };

  const dismissCard = () => {
    if (useBackend) {
      socket.emit("DISMISS_CARD", { roomId: gameState.roomId });
    } else {
      setGameState(prev => {
        if (!prev.drawnCard) return prev;
        const card = prev.drawnCard.card;
        const result = card.action(prev, prev.activePlayerIndex);
        return {
          ...result.state,
          drawnCard: null,
          logs: [...result.state.logs, createLog(result.log, "card")]
        };
      });
    }
  };

  // Detention handlers
  const payDetentionFine = () => {
    if (useBackend) {
      socket.emit("PAY_DETENTION_FINE", { roomId: gameState.roomId });
    } else {
      if (!activePlayer.inDetention || activePlayer.balance < 50) return;
      setGameState(prev => {
        const updatedPlayers = prev.players.map((pl, idx) => {
          if (idx === prev.activePlayerIndex) {
            return { ...pl, balance: pl.balance - 50, inDetention: false, detentionTurns: 0 };
          }
          return pl;
        });
        return {
          ...prev,
          players: updatedPlayers,
          logs: [...prev.logs, createLog(`${activePlayer.name} paid ◈50 fine to exit Detention.`, "jail")]
        };
      });
    }
  };

  const useEscapeCard = () => {
    if (useBackend) {
      socket.emit("USE_ESCAPE_CARD", { roomId: gameState.roomId });
    } else {
      if (!activePlayer.inDetention || activePlayer.escapeCardsCount <= 0) return;
      setGameState(prev => {
        const updatedPlayers = prev.players.map((pl, idx) => {
          if (idx === prev.activePlayerIndex) {
            return { ...pl, escapeCardsCount: pl.escapeCardsCount - 1, inDetention: false, detentionTurns: 0 };
          }
          return pl;
        });
        return {
          ...prev,
          players: updatedPlayers,
          logs: [...prev.logs, createLog(`${activePlayer.name} used Detention Clearance Card. Set free!`, "jail")]
        };
      });
    }
  };

  const tryDoubleRoll = () => {
    if (useBackend) {
      socket.emit("TRY_DOUBLE_ROLL", { roomId: gameState.roomId });
    } else {
      if (gameState.hasRolledThisTurn || !activePlayer.inDetention) return;

      setIsRolling(true);
      setTimeout(() => {
        setIsRolling(false);
        const d1 = Math.floor(Math.random() * 6) + 1;
        const d2 = Math.floor(Math.random() * 6) + 1;
        
        setGameState(prev => {
          const p = prev.players[prev.activePlayerIndex];
          const logs = [...prev.logs];
          let pInDetention = p.inDetention;
          let pTurns = p.detentionTurns;
          let pPos = p.position;
          let pBal = p.balance;

          logs.push(createLog(`${p.name} rolled [${d1}, ${d2}] for doubles escaping Detention.`, "roll"));

          if (d1 === d2) {
            pInDetention = false;
            pTurns = 0;
            pPos = (p.position + d1 + d2) % 40;
            logs.push(createLog(`${p.name} rolled doubles! Set free to move ${d1+d2} spaces to ${prev.tiles[pPos].name}.`, "jail"));
          } else {
            pTurns++;
            logs.push(createLog(`${p.name} failed doubles. (Detention turn ${pTurns}/3)`, "jail"));
            if (pTurns >= 3) {
              pBal = Math.max(0, pBal - 50);
              pInDetention = false;
              pTurns = 0;
              logs.push(createLog(`${p.name} served maximum term. Paid forced fine of ◈50.`, "jail"));
            }
          }

          const updatedPlayers = prev.players.map((player, idx) => {
            if (idx === prev.activePlayerIndex) {
              return {
                ...player,
                position: pPos,
                balance: pBal,
                inDetention: pInDetention,
                detentionTurns: pTurns
              };
            }
            return player;
          });

          let nextState: GameState = {
            ...prev,
            players: updatedPlayers,
            dice: [d1, d2] as [number, number],
            hasRolledThisTurn: true,
            logs
          };

          if (!pInDetention && d1 === d2) {
            nextState = resolveTileLanding(nextState, prev.activePlayerIndex, pPos, d1 + d2);
          }

          return nextState;
        });
      }, 1200);
    }
  };

  const setSelectedTileIndex = (idx: number) => {
    setGameState(prev => ({ ...prev, selectedTileIndex: idx }));
  };

  const sendChatMessage = (text: string) => {
    if (useBackend) {
      socket.emit("SEND_CHAT", { roomId: gameState.roomId, text });
    } else {
      const msg: ChatMessage = {
        id: `${Date.now()}_${Math.random()}`,
        sender: "You",
        text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      };
      setChatMessages(prev => [...prev, msg]);
    }
  };

  // LOCAL BOT LOOP INTERACTION (Only active when NOT using backend)
  useEffect(() => {
    if (gameState.status === "PLAYING" && activePlayer && activePlayer.isBot && !gameState.auction.isActive && !gameState.trade.isActive && !gameState.drawnCard && !useBackend) {
      if (botStatusText === "") {
        setTimeout(() => {
          setBotStatusText(`${activePlayer.name} is planning...`);
        }, 0);
      }
      
      botTimerRef.current = setTimeout(() => {
        setBotStatusText(`${activePlayer.name} rolling dice...`);
        setIsRolling(true);

        setTimeout(() => {
          setIsRolling(false);
          setBotStatusText("");
          
          setGameState(prev => {
            const state = executeBotTurn(prev);
            
            setTimeout(() => {
              setGameState(s => {
                if (s.activePlayerIndex === prev.activePlayerIndex && s.status === "PLAYING") {
                  let nextIdx = (s.activePlayerIndex + 1) % s.players.length;
                  while (s.players[nextIdx].isBankrupt) {
                    nextIdx = (nextIdx + 1) % s.players.length;
                  }
                  return {
                    ...s,
                    activePlayerIndex: nextIdx,
                    hasRolledThisTurn: false,
                    turnTimer: s.turnTimerLimit || 60,
                    drawnCard: null,
                    logs: [...s.logs, createLog(`--- Turn transitioned to ${s.players[nextIdx].name} ---`)]
                  };
                }
                return s;
              });
            }, 3000);

            return state;
          });
        }, 1200);

      }, 2000);
    }

    return () => {
      if (botTimerRef.current) clearTimeout(botTimerRef.current);
    };
  }, [gameState.activePlayerIndex, gameState.status, gameState.auction.isActive, gameState.trade.isActive, gameState.drawnCard, useBackend, activePlayer, botStatusText]);

  const updatePlayerInfo = (name: string, token: TokenType) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("propempire_username", name);
      localStorage.setItem("propempire_token", token);
    }
    if (useBackend) {
      socket.emit("UPDATE_PLAYER_INFO", {
        roomId: gameState.roomId,
        playerId: myPlayerId,
        name,
        token
      });
    } else {
      setGameState(prev => {
        const updated = prev.players.map(p => {
          if (p.id === (myPlayerId || "p1")) {
            return { ...p, name, token };
          }
          return p;
        });
        return { ...prev, players: updated };
      });
    }
  };

  const kickPlayer = (playerIdToKick: string) => {
    if (useBackend) {
      socket.emit("KICK_PLAYER", {
        roomId: gameState.roomId,
        playerIdToKick
      });
    } else {
      setGameState(prev => {
        const updated = prev.players.filter(p => p.id !== playerIdToKick);
        return { ...prev, players: updated };
      });
    }
  };

  const endGame = () => {
    if (useBackend) {
      socket.emit("END_GAME", {
        roomId: gameState.roomId
      });
    } else {
      window.location.href = "/";
    }
  };

  const leaveGame = () => {
    const playerToScore = gameState.players.find(p => p.id === myPlayerId) || gameState.players[0] || null;
    if (playerToScore) {
      let propertiesValue = 0;
      gameState.tiles.forEach(tile => {
        if (tile.ownerId === playerToScore.id) {
          if (tile.isMortgaged) {
            propertiesValue += tile.mortgageValue || 0;
          } else {
            propertiesValue += (tile.cost || 0) + (tile.houseCount * (tile.houseCost || 100));
          }
        }
      });

      setLeftGameResults({
        name: playerToScore.name,
        avatar: playerToScore.avatar,
        token: playerToScore.token,
        balance: playerToScore.balance,
        propertiesValue: propertiesValue,
        netWorth: playerToScore.balance + propertiesValue
      });
    }

    if (useBackend) {
      socket.emit("LEAVE_GAME", {
        roomId: gameState.roomId
      });
    }
  };

  return (
    <GameContext.Provider
      value={{
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
        sellHouse,
        proposeTrade,
        respondToTrade,
        dismissCard,
        payDetentionFine,
        useEscapeCard,
        tryDoubleRoll,
        startGame,
        setupNewGame,
        isRolling,
        botStatusText,
        setSelectedTileIndex,
        sendChatMessage,
        chatMessages,
        myPlayerId,
        updatePlayerInfo,
        kickPlayer,
        endGame,
        leaveGame,
        hostEndedResults,
        leftGameResults,
        setHostEndedResults,
        setLeftGameResults
      }}
    >
      {children}
      {gameError && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-950/95 backdrop-blur-md animate-fade-in font-sans">
          <div className="w-full max-w-sm bg-card border border-red-500/30 rounded-2xl p-6 shadow-2xl relative glass-panel-glow text-center space-y-6">
            
            {/* Alert Icon */}
            <div className="flex flex-col items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-red-950/40 border border-red-500/30 flex items-center justify-center text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.15)]">
                <AlertTriangle className="h-6 w-6 stroke-[2]" />
              </div>
              <div>
                <h3 className="text-base font-black text-ivory uppercase tracking-widest font-heading">
                  Boardroom Alert
                </h3>
                <span className="text-[9px] font-black uppercase text-red-400 tracking-widest mt-0.5 block font-heading">
                  System Connection Error
                </span>
              </div>
            </div>

            {/* Error Message */}
            <p className="text-xs text-slate-grey leading-relaxed font-semibold">
              {gameError}
            </p>

            {/* Action Button */}
            <button
              onClick={() => {
                setGameError(null);
                window.location.href = "/";
              }}
              className="w-full py-3 btn-game-danger rounded-xl uppercase font-heading text-xs tracking-wider cursor-pointer font-black text-slate-950"
            >
              Return to Lobby Portal
            </button>
          </div>
        </div>
      )}
    </GameContext.Provider>
  );
}

export function useGame() {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error("useGame must be used within a GameProvider");
  }
  return context;
}
