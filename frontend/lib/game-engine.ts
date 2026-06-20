export type TokenType = "Car" | "Dog" | "Top Hat" | "Ship" | "Cat" | "Duck" | "Crown" | "Rocket";

export interface Player {
  id: string;
  name: string;
  avatar: string;
  token: TokenType;
  balance: number;
  position: number;
  ownedProperties: number[]; // Tile indices
  escapeCardsCount: number;
  inDetention: boolean;
  detentionTurns: number;
  isBankrupt: boolean;
  isBot: boolean;
  color: string; // Tailind class for color or hex
  isOnline: boolean;
}

export type TileType = "START" | "PROPERTY" | "RAIL" | "UTILITY" | "OPPORTUNITY" | "EMPIRE" | "TAX" | "DETENTION" | "FREE_PARKING" | "GO_TO_DETENTION";

export interface Tile {
  index: number;
  name: string;
  type: TileType;
  district?: string;
  colorCode?: string; // Hex code for visual border/district
  cost?: number;
  baseRent?: number;
  houseRents?: number[]; // [1 house, 2 houses, 3 houses, 4 houses, hotel]
  hotelRent?: number;
  mortgageValue?: number;
  unmortgageValue?: number;
  houseCost?: number;
  
  // Dynamic state
  ownerId?: string;
  houseCount: number; // 0-4, 5 is hotel
  isMortgaged: boolean;
}

export interface GameCard {
  id: string;
  type: "OPPORTUNITY" | "EMPIRE";
  title: string;
  description: string;
  action: (state: GameState, playerIndex: number) => { state: GameState; log: string };
}

export interface AuctionState {
  isActive: boolean;
  tileIndex: number;
  highestBid: number;
  highestBidderId?: string;
  activeBidders: string[]; // Player IDs participating
  currentBidderId?: string;
  timer: number; // Seconds left
}

export interface TradeAsset {
  properties: number[]; // Tile indices
  cash: number;
  escapeCards: number;
}

export interface TradeState {
  isActive: boolean;
  proposerId: string;
  receiverId: string;
  proposerOffer: TradeAsset;
  receiverOffer: TradeAsset;
}

export interface GameLog {
  id: string;
  timestamp: string;
  message: string;
  type: "system" | "roll" | "buy" | "rent" | "card" | "jail" | "auction" | "trade" | "mortgage" | "build" | "bankruptcy";
}

export interface GameState {
  roomId: string;
  players: Player[];
  tiles: Tile[];
  activePlayerIndex: number;
  dice: [number, number];
  hasRolledThisTurn: boolean;
  selectedTileIndex: number; // Tile index currently viewed in UI detail panel
  logs: GameLog[];
  auction: AuctionState;
  trade: TradeState;
  drawnCard: { card: GameCard; isEmpire: boolean } | null;
  turnTimer: number; // in seconds
  status: "LOBBY" | "PLAYING" | "GAME_OVER";
  winnerId?: string;
  maxPlayers?: number;
  startingCapital?: number;
  turnTimerLimit?: number;
  rollTimerBonus?: number;
  botsEnabled?: boolean;
  botCount?: number;
  auctionTimerLimit?: number;
}

// 40 spaces definitions
export const INITIAL_TILES: Tile[] = [
  { index: 0, name: "START", type: "START", houseCount: 0, isMortgaged: false },
  {
    index: 1, name: "Old Town Gateway", type: "PROPERTY", district: "Old Town", colorCode: "#8B5A2B",
    cost: 60, baseRent: 2, houseRents: [10, 30, 90, 160], hotelRent: 250, mortgageValue: 30, unmortgageValue: 33, houseCost: 50,
    houseCount: 0, isMortgaged: false
  },
  { index: 2, name: "Opportunity Card", type: "OPPORTUNITY", houseCount: 0, isMortgaged: false },
  {
    index: 3, name: "Historic Quarter", type: "PROPERTY", district: "Old Town", colorCode: "#8B5A2B",
    cost: 60, baseRent: 4, houseRents: [20, 60, 180, 320], hotelRent: 450, mortgageValue: 30, unmortgageValue: 33, houseCost: 50,
    houseCount: 0, isMortgaged: false
  },
  { index: 4, name: "Wealth Levy", type: "TAX", cost: 200, houseCount: 0, isMortgaged: false },
  {
    index: 5, name: "North Terminal", type: "RAIL", cost: 200, baseRent: 25, mortgageValue: 100, unmortgageValue: 110,
    houseCount: 0, isMortgaged: false
  },
  {
    index: 6, name: "Riverside Boulevard", type: "PROPERTY", district: "Riverside", colorCode: "#87CEEB",
    cost: 100, baseRent: 6, houseRents: [30, 90, 270, 400], hotelRent: 550, mortgageValue: 50, unmortgageValue: 55, houseCost: 50,
    houseCount: 0, isMortgaged: false
  },
  { index: 7, name: "Empire Card", type: "EMPIRE", houseCount: 0, isMortgaged: false },
  {
    index: 8, name: "Canal Walkway", type: "PROPERTY", district: "Riverside", colorCode: "#87CEEB",
    cost: 100, baseRent: 6, houseRents: [30, 90, 270, 400], hotelRent: 550, mortgageValue: 50, unmortgageValue: 55, houseCost: 50,
    houseCount: 0, isMortgaged: false
  },
  {
    index: 9, name: "Marina Promenade", type: "PROPERTY", district: "Riverside", colorCode: "#87CEEB",
    cost: 120, baseRent: 8, houseRents: [40, 100, 300, 450], hotelRent: 600, mortgageValue: 60, unmortgageValue: 66, houseCost: 50,
    houseCount: 0, isMortgaged: false
  },
  { index: 10, name: "Detention Center", type: "DETENTION", houseCount: 0, isMortgaged: false },
  {
    index: 11, name: "Midtown Plaza", type: "PROPERTY", district: "Midtown", colorCode: "#FF69B4",
    cost: 140, baseRent: 10, houseRents: [50, 150, 450, 625], hotelRent: 750, mortgageValue: 70, unmortgageValue: 77, houseCost: 100,
    houseCount: 0, isMortgaged: false
  },
  {
    index: 12, name: "Grid Energy Corp", type: "UTILITY", cost: 150, mortgageValue: 75, unmortgageValue: 83,
    houseCount: 0, isMortgaged: false
  },
  {
    index: 13, name: "Fashion Avenue", type: "PROPERTY", district: "Midtown", colorCode: "#FF69B4",
    cost: 140, baseRent: 10, houseRents: [50, 150, 450, 625], hotelRent: 750, mortgageValue: 70, unmortgageValue: 77, houseCost: 100,
    houseCount: 0, isMortgaged: false
  },
  {
    index: 14, name: "Broadway Heights", type: "PROPERTY", district: "Midtown", colorCode: "#FF69B4",
    cost: 160, baseRent: 12, houseRents: [60, 180, 500, 700], hotelRent: 900, mortgageValue: 80, unmortgageValue: 88, houseCost: 100,
    houseCount: 0, isMortgaged: false
  },
  {
    index: 15, name: "East Terminal", type: "RAIL", cost: 200, baseRent: 25, mortgageValue: 100, unmortgageValue: 110,
    houseCount: 0, isMortgaged: false
  },
  {
    index: 16, name: "Financial Avenue", type: "PROPERTY", district: "Financial District", colorCode: "#FFA500",
    cost: 180, baseRent: 14, houseRents: [70, 200, 550, 750], hotelRent: 950, mortgageValue: 90, unmortgageValue: 99, houseCost: 100,
    houseCount: 0, isMortgaged: false
  },
  { index: 17, name: "Opportunity Card", type: "OPPORTUNITY", houseCount: 0, isMortgaged: false },
  {
    index: 18, name: "Stock Exchange St", type: "PROPERTY", district: "Financial District", colorCode: "#FFA500",
    cost: 180, baseRent: 14, houseRents: [70, 200, 550, 750], hotelRent: 950, mortgageValue: 90, unmortgageValue: 99, houseCost: 100,
    houseCount: 0, isMortgaged: false
  },
  {
    index: 19, name: "Corporate Boulevard", type: "PROPERTY", district: "Financial District", colorCode: "#FFA500",
    cost: 200, baseRent: 16, houseRents: [80, 220, 600, 800], hotelRent: 1000, mortgageValue: 100, unmortgageValue: 110, houseCost: 100,
    houseCount: 0, isMortgaged: false
  },
  { index: 20, name: "Free Parking", type: "FREE_PARKING", houseCount: 0, isMortgaged: false },
  {
    index: 21, name: "Silicon Park", type: "PROPERTY", district: "Tech Valley", colorCode: "#FF0000",
    cost: 220, baseRent: 18, houseRents: [90, 250, 700, 875], hotelRent: 1050, mortgageValue: 110, unmortgageValue: 121, houseCost: 150,
    houseCount: 0, isMortgaged: false
  },
  { index: 22, name: "Empire Card", type: "EMPIRE", houseCount: 0, isMortgaged: false },
  {
    index: 23, name: "AI Lab Crescent", type: "PROPERTY", district: "Tech Valley", colorCode: "#FF0000",
    cost: 220, baseRent: 18, houseRents: [90, 250, 700, 875], hotelRent: 1050, mortgageValue: 110, unmortgageValue: 121, houseCost: 150,
    houseCount: 0, isMortgaged: false
  },
  {
    index: 24, name: "Innovation Hub", type: "PROPERTY", district: "Tech Valley", colorCode: "#FF0000",
    cost: 240, baseRent: 20, houseRents: [100, 300, 750, 925], hotelRent: 1100, mortgageValue: 120, unmortgageValue: 132, houseCost: 150,
    houseCount: 0, isMortgaged: false
  },
  {
    index: 25, name: "South Terminal", type: "RAIL", cost: 200, baseRent: 25, mortgageValue: 100, unmortgageValue: 110,
    houseCount: 0, isMortgaged: false
  },
  {
    index: 26, name: "Marina Bay Quay", type: "PROPERTY", district: "Marina Bay", colorCode: "#FFD700",
    cost: 260, baseRent: 22, houseRents: [110, 330, 800, 975], hotelRent: 1150, mortgageValue: 130, unmortgageValue: 143, houseCost: 150,
    houseCount: 0, isMortgaged: false
  },
  {
    index: 27, name: "Yacht Club Drive", type: "PROPERTY", district: "Marina Bay", colorCode: "#FFD700",
    cost: 260, baseRent: 22, houseRents: [110, 330, 800, 975], hotelRent: 1150, mortgageValue: 130, unmortgageValue: 143, houseCost: 150,
    houseCount: 0, isMortgaged: false
  },
  {
    index: 28, name: "Aqua Flow Utilities", type: "UTILITY", cost: 150, mortgageValue: 75, unmortgageValue: 83,
    houseCount: 0, isMortgaged: false
  },
  {
    index: 29, name: "Esplanade Gardens", type: "PROPERTY", district: "Marina Bay", colorCode: "#FFD700",
    cost: 280, baseRent: 24, houseRents: [120, 360, 850, 1025], hotelRent: 1200, mortgageValue: 140, unmortgageValue: 154, houseCost: 150,
    houseCount: 0, isMortgaged: false
  },
  { index: 30, name: "Go To Detention", type: "GO_TO_DETENTION", houseCount: 0, isMortgaged: false },
  {
    index: 31, name: "Imperial Boulevard", type: "PROPERTY", district: "Imperial Heights", colorCode: "#008000",
    cost: 300, baseRent: 26, houseRents: [130, 390, 900, 1100], hotelRent: 1275, mortgageValue: 150, unmortgageValue: 165, houseCost: 200,
    houseCount: 0, isMortgaged: false
  },
  {
    index: 32, name: "Palace Gardens", type: "PROPERTY", district: "Imperial Heights", colorCode: "#008000",
    cost: 300, baseRent: 26, houseRents: [130, 390, 900, 1100], hotelRent: 1275, mortgageValue: 150, unmortgageValue: 165, houseCost: 200,
    houseCount: 0, isMortgaged: false
  },
  { index: 33, name: "Opportunity Card", type: "OPPORTUNITY", houseCount: 0, isMortgaged: false },
  {
    index: 34, name: "Royal Crescent", type: "PROPERTY", district: "Imperial Heights", colorCode: "#008000",
    cost: 320, baseRent: 28, houseRents: [150, 450, 1000, 1200], hotelRent: 1400, mortgageValue: 160, unmortgageValue: 176, houseCost: 200,
    houseCount: 0, isMortgaged: false
  },
  {
    index: 35, name: "West Terminal", type: "RAIL", cost: 200, baseRent: 25, mortgageValue: 100, unmortgageValue: 110,
    houseCount: 0, isMortgaged: false
  },
  { index: 36, name: "Empire Card", type: "EMPIRE", houseCount: 0, isMortgaged: false },
  {
    index: 37, name: "Prestige Plaza", type: "PROPERTY", district: "Crown Plaza", colorCode: "#000080",
    cost: 350, baseRent: 35, houseRents: [175, 500, 1100, 1300], hotelRent: 1500, mortgageValue: 175, unmortgageValue: 193, houseCost: 200,
    houseCount: 0, isMortgaged: false
  },
  { index: 38, name: "Luxury Surcharge", type: "TAX", cost: 100, houseCount: 0, isMortgaged: false },
  {
    index: 39, name: "Empire State Center", type: "PROPERTY", district: "Crown Plaza", colorCode: "#000080",
    cost: 400, baseRent: 50, houseRents: [200, 600, 1400, 1700], hotelRent: 2000, mortgageValue: 200, unmortgageValue: 220, houseCost: 200,
    houseCount: 0, isMortgaged: false
  }
];

// Cards Deck
export const OPPORTUNITY_CARDS: GameCard[] = [
  {
    id: "o1", type: "OPPORTUNITY", title: "Advance to Start", description: "Market cycles spin in your favor. Move directly to START and collect your ◈200 bonus.",
    action: (state, idx) => {
      const p = state.players[idx];
      const log = `${p.name} drew Opportunity Card: Advance to START (Collected ◈200)`;
      p.position = 0;
      p.balance += 200;
      return { state, log };
    }
  },
  {
    id: "o2", type: "OPPORTUNITY", title: "Corporate Tax Refund", description: "Government tax credits clear. Collect a ◈150 incentive payment from the Reserve.",
    action: (state, idx) => {
      const p = state.players[idx];
      p.balance += 150;
      return { state, log: `${p.name} drew Opportunity Card: Tax Refund (Collected ◈150)` };
    }
  },
  {
    id: "o3", type: "OPPORTUNITY", title: "Regulatory Fines", description: "Safety non-compliance in district sites. Pay a regulatory fee of ◈150 to the treasury.",
    action: (state, idx) => {
      const p = state.players[idx];
      p.balance = Math.max(0, p.balance - 150);
      return { state, log: `${p.name} drew Opportunity Card: Regulatory Fines (Paid ◈150)` };
    }
  },
  {
    id: "o4", type: "OPPORTUNITY", title: "Emergency Relocation", description: "Subway system disruptions. Move back 3 spaces.",
    action: (state, idx) => {
      const p = state.players[idx];
      const oldPos = p.position;
      const newPos = (oldPos - 3 + 40) % 40;
      p.position = newPos;
      return { state, log: `${p.name} drew Opportunity Card: Emergency Relocation. Moved back to ${state.tiles[newPos].name}` };
    }
  },
  {
    id: "o5", type: "OPPORTUNITY", title: "Capital Upgrades Tax", description: "Mandatory infrastructure upgrades. Pay ◈50 for each House and ◈125 for each Hotel you own.",
    action: (state, idx) => {
      const p = state.players[idx];
      let houses = 0;
      let hotels = 0;
      state.tiles.forEach(t => {
        if (t.ownerId === p.id) {
          if (t.houseCount === 5) hotels++;
          else if (t.houseCount > 0) houses += t.houseCount;
        }
      });
      const cost = (houses * 50) + (hotels * 125);
      p.balance = Math.max(0, p.balance - cost);
      return { state, log: `${p.name} paid ◈${cost} for infrastructure levies (◈50/house, ◈125/hotel). Owned: ${houses} houses, ${hotels} hotels.` };
    }
  },
  {
    id: "o6", type: "OPPORTUNITY", title: "Corporate Clemency", description: "Legal loopholes save the day. Keep this card to escape Detention free when needed.",
    action: (state, idx) => {
      const p = state.players[idx];
      p.escapeCardsCount++;
      return { state, log: `${p.name} received a Detention Clearance Card.` };
    }
  }
];

export const EMPIRE_CARDS: GameCard[] = [
  {
    id: "e1", type: "EMPIRE", title: "Hostile Takeover", description: "Liquidate opposition capital. Force the wealthiest opponent to pay you ◈150.",
    action: (state, idx) => {
      const proposer = state.players[idx];
      let target: Player | null = null;
      let maxBal = -1;
      state.players.forEach(p => {
        if (p.id !== proposer.id && !p.isBankrupt && p.balance > maxBal) {
          maxBal = p.balance;
          target = p;
        }
      });
      if (target) {
        const targetPlayer = target as Player;
        const actualPaid = Math.min(targetPlayer.balance, 150);
        targetPlayer.balance -= actualPaid;
        proposer.balance += actualPaid;
        return { state, log: `${proposer.name} executed a Hostile Takeover on ${targetPlayer.name}. Transferred ◈${actualPaid}!` };
      }
      return { state, log: `${proposer.name} tried to run Hostile Takeover, but no eligible wealthy opponents found.` };
    }
  },
  {
    id: "e2", type: "EMPIRE", title: "Syndicate Dividends", description: "Venture consortium settles quarterly payouts. Receive ◈100 from every active player.",
    action: (state, idx) => {
      const proposer = state.players[idx];
      let totalReceived = 0;
      state.players.forEach(p => {
        if (p.id !== proposer.id && !p.isBankrupt) {
          const paid = Math.min(p.balance, 100);
          p.balance -= paid;
          totalReceived += paid;
        }
      });
      proposer.balance += totalReceived;
      return { state, log: `${proposer.name} collected Syndicate Dividends! Received a total of ◈${totalReceived} from opponents.` };
    }
  },
  {
    id: "e3", type: "EMPIRE", title: "Rent Surge", description: "Premium tenant upgrades. Double your balance by receiving ◈200 from the Reserve.",
    action: (state, idx) => {
      const p = state.players[idx];
      p.balance += 200;
      return { state, log: `${p.name} activated Rent Surge. Reserve paid out ◈200 bonuses.` };
    }
  },
  {
    id: "e4", type: "EMPIRE", title: "Corporate Waiver", description: "Use lobbying power. Instantly clears any Detention order.",
    action: (state, idx) => {
      const p = state.players[idx];
      p.escapeCardsCount++;
      return { state, log: `${p.name} acquired a Corporate Detention Waiver.` };
    }
  }
];

// Helper to check if player owns all properties in a district
export function ownsDistrict(state: GameState, playerId: string, districtName: string): boolean {
  const districtTiles = state.tiles.filter(t => t.district === districtName);
  if (districtTiles.length === 0) return false;
  return districtTiles.every(t => t.ownerId === playerId && !t.isMortgaged);
}

// Draw random card
export function drawCard(isEmpire: boolean): GameCard {
  const deck = isEmpire ? EMPIRE_CARDS : OPPORTUNITY_CARDS;
  const randIdx = Math.floor(Math.random() * deck.length);
  return deck[randIdx];
}

// Calculate property rent
export function calculateRent(tile: Tile, owner: Player, state: GameState, diceSum: number = 7): number {
  if (tile.isMortgaged) return 0;
  
  if (tile.type === "PROPERTY") {
    // Check if district is fully owned
    const fullyOwned = ownsDistrict(state, owner.id, tile.district || "");
    if (tile.houseCount === 0) {
      return fullyOwned ? (tile.baseRent || 0) * 2 : (tile.baseRent || 0);
    }
    if (tile.houseRents && tile.houseCount >= 1 && tile.houseCount <= 4) {
      return tile.houseRents[tile.houseCount - 1];
    }
    return tile.hotelRent || 0;
  }
  
  if (tile.type === "RAIL") {
    // Count owned rails
    const ownedRails = state.tiles.filter(t => t.type === "RAIL" && t.ownerId === owner.id && !t.isMortgaged).length;
    // 1 rail: ◈25, 2 rails: ◈50, 3 rails: ◈100, 4 rails: ◈200
    if (ownedRails === 1) return 25;
    if (ownedRails === 2) return 50;
    if (ownedRails === 3) return 100;
    if (ownedRails === 4) return 200;
    return 0;
  }
  
  if (tile.type === "UTILITY") {
    // Count owned utilities
    const ownedUtilities = state.tiles.filter(t => t.type === "UTILITY" && t.ownerId === owner.id && !t.isMortgaged).length;
    // 1 utility: 4x dice roll, 2 utilities: 10x dice roll
    const factor = (ownedUtilities === 2) ? 10 : 4;
    return diceSum * factor;
  }
  
  return 0;
}

// Log builder
export function createLog(message: string, type: GameLog["type"] = "system"): GameLog {
  return {
    id: Math.random().toString(36).substring(2, 9),
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
    message,
    type
  };
}

// Bot decision logic
export function executeBotTurn(state: GameState): GameState {
  const botIdx = state.activePlayerIndex;
  const bot = state.players[botIdx];
  if (!bot.isBot || bot.isBankrupt || state.status !== "PLAYING") return state;

  let newState = { ...state };
  const currentTile = newState.tiles[bot.position];

  // If in detention, bot tries to pay or roll
  if (bot.inDetention) {
    if (bot.balance > 300) {
      bot.balance -= 50;
      bot.inDetention = false;
      bot.detentionTurns = 0;
      newState.logs.push(createLog(`${bot.name} paid ◈50 fine to clear Detention.`, "jail"));
    } else if (bot.escapeCardsCount > 0) {
      bot.escapeCardsCount--;
      bot.inDetention = false;
      bot.detentionTurns = 0;
      newState.logs.push(createLog(`${bot.name} used Detention Clearance Card to escape.`, "jail"));
    } else {
      // Try roll doubles
      const d1 = Math.floor(Math.random() * 6) + 1;
      const d2 = Math.floor(Math.random() * 6) + 1;
      newState.dice = [d1, d2];
      newState.logs.push(createLog(`${bot.name} rolled [${d1}, ${d2}] attempting doubles.`, "roll"));
      
      if (d1 === d2) {
        bot.inDetention = false;
        bot.detentionTurns = 0;
        const targetPos = (bot.position + d1 + d2) % 40;
        bot.position = targetPos;
        newState.logs.push(createLog(`${bot.name} rolled doubles and moved to ${newState.tiles[targetPos].name}!`, "jail"));
        newState = resolveTileLanding(newState, botIdx, targetPos, d1 + d2);
      } else {
        bot.detentionTurns++;
        newState.logs.push(createLog(`${bot.name} failed to roll doubles (Turn ${bot.detentionTurns}/3 in detention).`, "jail"));
        if (bot.detentionTurns >= 3) {
          bot.balance = Math.max(0, bot.balance - 50);
          bot.inDetention = false;
          bot.detentionTurns = 0;
          newState.logs.push(createLog(`${bot.name} served maximum term. Paid forced fine of ◈50.`, "jail"));
        }
        newState.hasRolledThisTurn = true;
        return newState; // Bot turn ends if they failed jail roll
      }
    }
  }

  // Roll dice if not rolled yet
  if (!newState.hasRolledThisTurn) {
    const d1 = Math.floor(Math.random() * 6) + 1;
    const d2 = Math.floor(Math.random() * 6) + 1;
    newState.dice = [d1, d2];
    newState.hasRolledThisTurn = true;
    
    const steps = d1 + d2;
    const oldPos = bot.position;
    const targetPos = (oldPos + steps) % 40;
    
    // Check passing START
    if (targetPos < oldPos) {
      bot.balance += 200;
      newState.logs.push(createLog(`${bot.name} passed START and collected ◈200 surplus.`, "system"));
    }
    
    bot.position = targetPos;
    newState.logs.push(createLog(`${bot.name} rolled a total of ${steps} and landed on ${newState.tiles[targetPos].name}.`, "roll"));
    newState = resolveTileLanding(newState, botIdx, targetPos, steps);
  }

  // Bot upgrades properties if they have monopolies and spare cash
  newState.tiles.forEach((t, index) => {
    if (t.ownerId === bot.id && t.type === "PROPERTY" && !t.isMortgaged) {
      const fullDistrictOwned = ownsDistrict(newState, bot.id, t.district || "");
      const houseCost = t.houseCost || 100;
      if (fullDistrictOwned && t.houseCount < 5 && bot.balance > (houseCost + 250)) {
        // Enforce even building
        const districtTiles = newState.tiles.filter(dt => dt.district === t.district);
        const minHouses = Math.min(...districtTiles.map(dt => dt.houseCount));
        
        const canBuild = (t.houseCount === minHouses && t.houseCount < 4) || 
                         (t.houseCount === 4 && districtTiles.every(dt => dt.houseCount >= 4));
                         
        if (canBuild) {
          t.houseCount++;
          bot.balance -= houseCost;
          bot.ownedProperties = [...bot.ownedProperties];
          newState.logs.push(createLog(`${bot.name} built a ${t.houseCount === 5 ? "Hotel" : "House"} on ${t.name} (Paid ◈${houseCost}).`, "build"));
        }
      }
    }
  });

  return newState;
}

// Action resolutions when landing on a tile
export function resolveTileLanding(state: GameState, playerIndex: number, tileIndex: number, diceSum: number): GameState {
  const p = state.players[playerIndex];
  const tile = state.tiles[tileIndex];
  
  state.selectedTileIndex = tileIndex;
  
  // 1. Unowned purchasable tiles
  if ((tile.type === "PROPERTY" || tile.type === "RAIL" || tile.type === "UTILITY") && !tile.ownerId) {
    // If it's a bot, bot automatically buys if it has 1.3x price left after purchase
    if (p.isBot) {
      const price = tile.cost || 0;
      if (p.balance >= price * 1.3) {
        p.balance -= price;
        tile.ownerId = p.id;
        p.ownedProperties.push(tileIndex);
        state.logs.push(createLog(`${p.name} acquired ${tile.name} for ◈${price}.`, "buy"));
      } else {
        // Trigger simulated bot auction
        state.logs.push(createLog(`${p.name} passed on buying ${tile.name}. Starting public auction.`, "auction"));
        state = triggerAuction(state, tileIndex);
      }
    }
    return state;
  }
  
  // 2. Owned properties (collect rent)
  if ((tile.type === "PROPERTY" || tile.type === "RAIL" || tile.type === "UTILITY") && tile.ownerId) {
    if (tile.ownerId !== p.id) {
      const owner = state.players.find(o => o.id === tile.ownerId);
      if (owner && !owner.isBankrupt && !tile.isMortgaged) {
        const rentAmt = calculateRent(tile, owner, state, diceSum);
        
        // Transfer rent
        const actualPaid = Math.min(p.balance, rentAmt);
        p.balance -= actualPaid;
        owner.balance += actualPaid;
        state.logs.push(createLog(`${p.name} paid ◈${actualPaid} rent to ${owner.name} at ${tile.name}.`, "rent"));
        
        if (p.balance <= 0) {
          state = handleBankruptcy(state, playerIndex, owner.id);
        }
      }
    }
    return state;
  }
  
  // 3. Tax spaces
  if (tile.type === "TAX") {
    const taxAmt = tile.cost || 100;
    const actualPaid = Math.min(p.balance, taxAmt);
    p.balance -= actualPaid;
    state.logs.push(createLog(`${p.name} paid tax fee of ◈${actualPaid} to Treasury.`, "system"));
    
    if (p.balance <= 0) {
      state = handleBankruptcy(state, playerIndex);
    }
    return state;
  }
  
  // 4. Opportunity & Empire cards
  if (tile.type === "OPPORTUNITY" || tile.type === "EMPIRE") {
    const isEmpire = tile.type === "EMPIRE";
    const drawn = drawCard(isEmpire);
    state.drawnCard = { card: drawn, isEmpire };
    
    // Auto execute bot cards, humans trigger via UI click
    if (p.isBot) {
      const result = drawn.action(state, playerIndex);
      state = result.state;
      state.logs.push(createLog(result.log, "card"));
      state.drawnCard = null; // Instantly dismiss for bots
    }
    return state;
  }
  
  // 5. Go To Detention
  if (tile.type === "GO_TO_DETENTION") {
    p.position = 10;
    p.inDetention = true;
    p.detentionTurns = 0;
    state.logs.push(createLog(`${p.name} was arrested and sent to Detention.`, "jail"));
    return state;
  }
  
  return state;
}

// Trigger Auction
export function triggerAuction(state: GameState, tileIndex: number): GameState {
  const activeBidders = state.players.filter(p => !p.isBankrupt).map(p => p.id);
  const tile = state.tiles[tileIndex];
  const timerLimit = state.auctionTimerLimit || 15;
  
  state.auction = {
    isActive: true,
    tileIndex,
    highestBid: 10,
    highestBidderId: undefined,
    activeBidders,
    currentBidderId: activeBidders[0],
    timer: timerLimit
  };
  
  state.logs.push(createLog(`Auction declared for ${tile.name}. Starting bid: ◈10.`, "auction"));
  return state;
}

// Place Auction Bid
export function placeBid(state: GameState, bidderId: string, amount: number): GameState {
  if (!state.auction.isActive) return state;
  
  if (!state.auction.activeBidders.includes(bidderId)) return state;
  
  const bidder = state.players.find(p => p.id === bidderId);
  if (!bidder || bidder.balance < amount || amount <= state.auction.highestBid) return state;
  
  state.auction.highestBid = amount;
  state.auction.highestBidderId = bidderId;
  state.auction.timer = state.auctionTimerLimit || 15; // Reset countdown timer
  
  state.logs.push(createLog(`${bidder.name} bids ◈${amount}!`, "auction"));
  return state;
}

// Pass Auction Bid
export function passBid(state: GameState, bidderId: string): GameState {
  if (!state.auction.isActive) return state;
  
  state.auction.activeBidders = state.auction.activeBidders.filter(id => id !== bidderId);
  state.logs.push(createLog(`${state.players.find(p => p.id === bidderId)?.name} passed bidding.`, "auction"));
  
  if (state.auction.activeBidders.length === 0 || (
    state.auction.activeBidders.length === 1 && state.auction.highestBidderId === state.auction.activeBidders[0]
  )) {
    state = endAuctionLocal(state);
  }
  
  return state;
}

// End Auction Local
export function endAuctionLocal(state: GameState): GameState {
  if (!state.auction.isActive) return state;
  
  const winnerId = state.auction.highestBidderId;
  const winner = winnerId ? state.players.find(p => p.id === winnerId) : null;
  const tile = state.tiles[state.auction.tileIndex];
  const bidAmount = state.auction.highestBid;
  
  if (winner && winner.balance >= bidAmount) {
    winner.balance -= bidAmount;
    tile.ownerId = winner.id;
    winner.ownedProperties = [...winner.ownedProperties, tile.index];
    state.logs.push(createLog(`${winner.name} won the auction for ${tile.name} at ◈${bidAmount}!`, "auction"));
  } else {
    state.logs.push(createLog(`Auction closed for ${tile.name} with no successful buyer.`, "auction"));
  }
  
  state.auction.isActive = false;
  return state;
}

// Handle Bankruptcy
export function handleBankruptcy(state: GameState, bankruptIdx: number, creditorId?: string): GameState {
  const p = state.players[bankruptIdx];
  p.isBankrupt = true;
  p.balance = 0;
  
  const creditor = creditorId ? state.players.find(c => c.id === creditorId) : null;
  
  state.logs.push(createLog(`CRITICAL: ${p.name} has declared Bankruptcy!`, "bankruptcy"));
  
  // Transfer assets
  state.tiles.forEach(t => {
    if (t.ownerId === p.id) {
      if (creditor) {
        t.ownerId = creditor.id;
        t.houseCount = 0;
        t.isMortgaged = false; // Unmortgage for creditor
        creditor.ownedProperties.push(t.index);
      } else {
        // Back to bank (public)
        t.ownerId = undefined;
        t.houseCount = 0;
        t.isMortgaged = false;
      }
    }
  });
  
  p.ownedProperties = [];
  
  // Check remaining players
  const activePlayers = state.players.filter(pl => !pl.isBankrupt);
  if (activePlayers.length === 1) {
    state.status = "GAME_OVER";
    state.winnerId = activePlayers[0].id;
    state.logs.push(createLog(`🏆 Game Over! ${activePlayers[0].name} has dominated the lobby to win PropEmpire!`, "system"));
  }
  
  return state;
}
