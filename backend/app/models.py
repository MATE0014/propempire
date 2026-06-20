import time
from pydantic import BaseModel, Field
from typing import List, Optional, Tuple, Dict, Any

class Player(BaseModel):
    id: str
    name: str
    avatar: str
    token: str
    balance: int
    position: int
    ownedProperties: List[int] = Field(default_factory=list)
    escapeCardsCount: int = 0
    inDetention: bool = False
    detentionTurns: int = 0
    isBankrupt: bool = False
    isBot: bool = False
    color: str
    isOnline: bool = True

class Tile(BaseModel):
    index: int
    name: str
    type: str  # "START" | "PROPERTY" | "RAIL" | "UTILITY" | "OPPORTUNITY" | "EMPIRE" | "TAX" | "DETENTION" | "FREE_PARKING" | "GO_TO_DETENTION"
    district: Optional[str] = None
    colorCode: Optional[str] = None
    cost: Optional[int] = None
    baseRent: Optional[int] = None
    houseRents: Optional[List[int]] = None
    hotelRent: Optional[int] = None
    mortgageValue: Optional[int] = None
    unmortgageValue: Optional[int] = None
    houseCost: Optional[int] = None
    
    # Dynamic state
    ownerId: Optional[str] = None
    houseCount: int = 0  # 0-4 houses, 5 is hotel
    isMortgaged: bool = False

class AuctionState(BaseModel):
    isActive: bool = False
    tileIndex: int = 0
    highestBid: int = 0
    highestBidderId: Optional[str] = None
    activeBidders: List[str] = Field(default_factory=list)
    currentBidderId: Optional[str] = None
    timer: int = 0

class TradeAsset(BaseModel):
    properties: List[int] = Field(default_factory=list)
    cash: int = 0
    escapeCards: int = 0

class TradeState(BaseModel):
    isActive: bool = False
    proposerId: str = ""
    receiverId: str = ""
    proposerOffer: TradeAsset = Field(default_factory=TradeAsset)
    receiverOffer: TradeAsset = Field(default_factory=TradeAsset)

class GameLog(BaseModel):
    id: str
    timestamp: str
    message: str
    type: str  # "system" | "roll" | "buy" | "rent" | "card" | "jail" | "auction" | "trade" | "mortgage" | "build" | "bankruptcy"

class GameCardData(BaseModel):
    id: str
    type: str
    title: str
    description: str

class DrawnCardState(BaseModel):
    card: GameCardData
    isEmpire: bool

class GameState(BaseModel):
    roomId: str
    createdAt: float = Field(default_factory=time.time)
    players: List[Player] = Field(default_factory=list)
    tiles: List[Tile] = Field(default_factory=list)
    activePlayerIndex: int = 0
    dice: Tuple[int, int] = (1, 1)
    hasRolledThisTurn: bool = False
    selectedTileIndex: int = 0
    logs: List[GameLog] = Field(default_factory=list)
    auction: AuctionState = Field(default_factory=AuctionState)
    trade: TradeState = Field(default_factory=TradeState)
    drawnCard: Optional[DrawnCardState] = None
    turnTimer: int = 60
    status: str = "LOBBY"  # "LOBBY" | "PLAYING" | "GAME_OVER"
    winnerId: Optional[str] = None
    maxPlayers: int = 4
    startingCapital: int = 1500
    turnTimerLimit: int = 60
    rollTimerBonus: int = 15
    botsEnabled: bool = True
    botCount: int = 3
    auctionTimerLimit: int = 15
