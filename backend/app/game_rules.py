import random
import time
import uuid
from datetime import datetime
from typing import List, Optional, Tuple, Dict, Any
from app.models import GameState, Player, Tile, GameLog, AuctionState, TradeState, GameCardData, DrawnCardState

# Initial 40 tiles definition matching frontend list
def get_initial_tiles() -> List[Tile]:
    tiles = [
        Tile(index=0, name="START", type="START"),
        Tile(index=1, name="Old Town Gateway", type="PROPERTY", district="Old Town", colorCode="#8B5A2B",
             cost=60, baseRent=2, houseRents=[10, 30, 90, 160], hotelRent=250, mortgageValue=30, unmortgageValue=33, houseCost=50),
        Tile(index=2, name="Opportunity Card", type="OPPORTUNITY"),
        Tile(index=3, name="Historic Quarter", type="PROPERTY", district="Old Town", colorCode="#8B5A2B",
             cost=60, baseRent=4, houseRents=[20, 60, 180, 320], hotelRent=450, mortgageValue=30, unmortgageValue=33, houseCost=50),
        Tile(index=4, name="Wealth Levy", type="TAX", cost=200),
        Tile(index=5, name="North Terminal", type="RAIL", cost=200, baseRent=25, mortgageValue=100, unmortgageValue=110),
        Tile(index=6, name="Riverside Boulevard", type="PROPERTY", district="Riverside", colorCode="#87CEEB",
             cost=100, baseRent=6, houseRents=[30, 90, 270, 400], hotelRent=550, mortgageValue=50, unmortgageValue=55, houseCost=50),
        Tile(index=7, name="Empire Card", type="EMPIRE"),
        Tile(index=8, name="Canal Walkway", type="PROPERTY", district="Riverside", colorCode="#87CEEB",
             cost=100, baseRent=6, houseRents=[30, 90, 270, 400], hotelRent=550, mortgageValue=50, unmortgageValue=55, houseCost=50),
        Tile(index=9, name="Marina Promenade", type="PROPERTY", district="Riverside", colorCode="#87CEEB",
             cost=120, baseRent=8, houseRents=[40, 100, 300, 450], hotelRent=600, mortgageValue=60, unmortgageValue=66, houseCost=50),
        Tile(index=10, name="Detention Center", type="DETENTION"),
        Tile(index=11, name="Midtown Plaza", type="PROPERTY", district="Midtown", colorCode="#FF69B4",
             cost=140, baseRent=10, houseRents=[50, 150, 450, 625], hotelRent=750, mortgageValue=70, unmortgageValue=77, houseCost=100),
        Tile(index=12, name="Grid Energy Corp", type="UTILITY", cost=150, mortgageValue=75, unmortgageValue=83),
        Tile(index=13, name="Fashion Avenue", type="PROPERTY", district="Midtown", colorCode="#FF69B4",
             cost=140, baseRent=10, houseRents=[50, 150, 450, 625], hotelRent=750, mortgageValue=70, unmortgageValue=77, houseCost=100),
        Tile(index=14, name="Broadway Heights", type="PROPERTY", district="Midtown", colorCode="#FF69B4",
             cost=160, baseRent=12, houseRents=[60, 180, 500, 700], hotelRent=900, mortgageValue=80, unmortgageValue=88, houseCost=100),
        Tile(index=15, name="East Terminal", type="RAIL", cost=200, baseRent=25, mortgageValue=100, unmortgageValue=110),
        Tile(index=16, name="Financial Avenue", type="PROPERTY", district="Financial District", colorCode="#FFA500",
             cost=180, baseRent=14, houseRents=[70, 200, 550, 750], hotelRent=950, mortgageValue=90, unmortgageValue=99, houseCost=100),
        Tile(index=17, name="Opportunity Card", type="OPPORTUNITY"),
        Tile(index=18, name="Stock Exchange St", type="PROPERTY", district="Financial District", colorCode="#FFA500",
             cost=180, baseRent=14, houseRents=[70, 200, 550, 750], hotelRent=950, mortgageValue=90, unmortgageValue=99, houseCost=100),
        Tile(index=19, name="Corporate Boulevard", type="PROPERTY", district="Financial District", colorCode="#FFA500",
             cost=200, baseRent=16, houseRents=[80, 220, 600, 800], hotelRent=1000, mortgageValue=100, unmortgageValue=110, houseCost=100),
        Tile(index=20, name="Free Parking", type="FREE_PARKING"),
        Tile(index=21, name="Silicon Park", type="PROPERTY", district="Tech Valley", colorCode="#FF0000",
             cost=220, baseRent=18, houseRents=[90, 250, 700, 875], hotelRent=1050, mortgageValue=110, unmortgageValue=121, houseCost=150),
        Tile(index=22, name="Empire Card", type="EMPIRE"),
        Tile(index=23, name="AI Lab Crescent", type="PROPERTY", district="Tech Valley", colorCode="#FF0000",
             cost=220, baseRent=18, houseRents=[90, 250, 700, 875], hotelRent=1050, mortgageValue=110, unmortgageValue=121, houseCost=150),
        Tile(index=24, name="Innovation Hub", type="PROPERTY", district="Tech Valley", colorCode="#FF0000",
             cost=240, baseRent=20, houseRents=[100, 300, 750, 925], hotelRent=1100, mortgageValue=120, unmortgageValue=132, houseCost=150),
        Tile(index=25, name="South Terminal", type="RAIL", cost=200, baseRent=25, mortgageValue=100, unmortgageValue=110),
        Tile(index=26, name="Marina Bay Quay", type="PROPERTY", district="Marina Bay", colorCode="#FFD700",
             cost=260, baseRent=22, houseRents=[110, 330, 800, 975], hotelRent=1150, mortgageValue=130, unmortgageValue=143, houseCost=150),
        Tile(index=27, name="Yacht Club Drive", type="PROPERTY", district="Marina Bay", colorCode="#FFD700",
             cost=260, baseRent=22, houseRents=[110, 330, 800, 975], hotelRent=1150, mortgageValue=130, unmortgageValue=143, houseCost=150),
        Tile(index=28, name="Aqua Flow Utilities", type="UTILITY", cost=150, mortgageValue=75, unmortgageValue=83),
        Tile(index=29, name="Esplanade Gardens", type="PROPERTY", district="Marina Bay", colorCode="#FFD700",
             cost=280, baseRent=24, houseRents=[120, 360, 850, 1025], hotelRent=1200, mortgageValue=140, unmortgageValue=154, houseCost=150),
        Tile(index=30, name="Go To Detention", type="GO_TO_DETENTION"),
        Tile(index=31, name="Imperial Boulevard", type="PROPERTY", district="Imperial Heights", colorCode="#008000",
             cost=300, baseRent=26, houseRents=[130, 390, 900, 1100], hotelRent=1275, mortgageValue=150, unmortgageValue=165, houseCost=200),
        Tile(index=32, name="Palace Gardens", type="PROPERTY", district="Imperial Heights", colorCode="#008000",
             cost=300, baseRent=26, houseRents=[130, 390, 900, 1100], hotelRent=1275, mortgageValue=150, unmortgageValue=165, houseCost=200),
        Tile(index=33, name="Opportunity Card", type="OPPORTUNITY"),
        Tile(index=34, name="Royal Crescent", type="PROPERTY", district="Imperial Heights", colorCode="#008000",
             cost=320, baseRent=28, houseRents=[150, 450, 1000, 1200], hotelRent=1400, mortgageValue=160, unmortgageValue=176, houseCost=200),
        Tile(index=35, name="West Terminal", type="RAIL", cost=200, baseRent=25, mortgageValue=100, unmortgageValue=110),
        Tile(index=36, name="Empire Card", type="EMPIRE"),
        Tile(index=37, name="Prestige Plaza", type="PROPERTY", district="Crown Plaza", colorCode="#000080",
             cost=350, baseRent=35, houseRents=[175, 500, 1100, 1300], hotelRent=1500, mortgageValue=175, unmortgageValue=193, houseCost=200),
        Tile(index=38, name="Luxury Surcharge", type="TAX", cost=100),
        Tile(index=39, name="Empire State Center", type="PROPERTY", district="Crown Plaza", colorCode="#000080",
             cost=400, baseRent=50, houseRents=[200, 600, 1400, 1700], hotelRent=2000, mortgageValue=200, unmortgageValue=220, houseCost=200)
    ]
    return tiles

# Create a log entry helper
def create_log(message: str, log_type: str = "system") -> GameLog:
    return GameLog(
        id=uuid.uuid4().hex[:12],
        timestamp=datetime.now().strftime("%H:%M"),
        message=message,
        type=log_type
    )

def owns_district(state: GameState, player_id: str, district_name: str) -> bool:
    if not district_name:
        return False
    district_tiles = [t for t in state.tiles if t.district == district_name]
    if not district_tiles:
        return False
    return all(t.ownerId == player_id and not t.isMortgaged for t in district_tiles)

def calculate_rent(tile: Tile, owner: Player, state: GameState, dice_sum: int = 7) -> int:
    if tile.isMortgaged:
        return 0
    
    if tile.type == "PROPERTY":
        district_owned = owns_district(state, owner.id, tile.district or "")
        if tile.houseCount == 0:
            return (tile.baseRent or 0) * 2 if district_owned else (tile.baseRent or 0)
        elif tile.houseCount >= 1 and tile.houseCount <= 4:
            return tile.houseRents[tile.houseCount - 1] if tile.houseRents else 0
        return tile.hotelRent or 0
        
    elif tile.type == "RAIL":
        owned_rails = len([t for t in state.tiles if t.type == "RAIL" and t.ownerId == owner.id and not t.isMortgaged])
        if owned_rails == 1: return 25
        elif owned_rails == 2: return 50
        elif owned_rails == 3: return 100
        elif owned_rails == 4: return 200
        return 0
        
    elif tile.type == "UTILITY":
        owned_utils = len([t for t in state.tiles if t.type == "UTILITY" and t.ownerId == owner.id and not t.isMortgaged])
        factor = 10 if owned_utils == 2 else 4
        return dice_sum * factor
        
    return 0

# Cards databases
OPPORTUNITY_CARDS_DATA = [
    GameCardData(id="o1", type="OPPORTUNITY", title="Advance to Start", description="Market cycles spin in your favor. Move directly to START and collect your ◈200 bonus."),
    GameCardData(id="o2", type="OPPORTUNITY", title="Corporate Tax Refund", description="Government tax credits clear. Collect a ◈150 incentive payment from the Reserve."),
    GameCardData(id="o3", type="OPPORTUNITY", title="Regulatory Fines", description="Safety non-compliance in district sites. Pay a regulatory fee of ◈150 to the treasury."),
    GameCardData(id="o4", type="OPPORTUNITY", title="Emergency Relocation", description="Subway system disruptions. Move back 3 spaces."),
    GameCardData(id="o5", type="OPPORTUNITY", title="Capital Upgrades Tax", description="Mandatory infrastructure upgrades. Pay ◈50 for each House and ◈125 for each Hotel you own."),
    GameCardData(id="o6", type="OPPORTUNITY", title="Corporate Clemency", description="Legal loopholes save the day. Keep this card to escape Detention free when needed.")
]

EMPIRE_CARDS_DATA = [
    GameCardData(id="e1", type="EMPIRE", title="Hostile Takeover", description="Liquidate opposition capital. Force the wealthiest opponent to pay you ◈150."),
    GameCardData(id="e2", type="EMPIRE", title="Syndicate Dividends", description="Venture consortium settles quarterly payouts. Receive ◈100 from every active player."),
    GameCardData(id="e3", type="EMPIRE", title="Rent Surge", description="Premium tenant upgrades. Double your balance by receiving ◈200 from the Reserve."),
    GameCardData(id="e4", type="EMPIRE", title="Corporate Waiver", description="Use lobbying power. Instantly clears any Detention order.")
]

# Resolution actions for drawn cards
def apply_card_action(state: GameState, card_id: str, player_idx: int) -> Tuple[GameState, str]:
    p = state.players[player_idx]
    
    # Opportunity Cards
    if card_id == "o1":
        p.position = 0
        p.balance += 200
        return state, f"{p.name} drew Opportunity Card: Advance to START (Collected ◈200)"
        
    elif card_id == "o2":
        p.balance += 150
        return state, f"{p.name} drew Opportunity Card: Tax Refund (Collected ◈150)"
        
    elif card_id == "o3":
        p.balance = max(0, p.balance - 150)
        state = check_bankruptcy(state, player_idx)
        return state, f"{p.name} drew Opportunity Card: Regulatory Fines (Paid ◈150)"
        
    elif card_id == "o4":
        p.position = (p.position - 3 + 40) % 40
        target_name = state.tiles[p.position].name
        return state, f"{p.name} drew Opportunity Card: Emergency Relocation. Moved back 3 spaces to {target_name}"
        
    elif card_id == "o5":
        houses = 0
        hotels = 0
        for t in state.tiles:
            if t.ownerId == p.id:
                if t.houseCount == 5:
                    hotels += 1
                elif t.houseCount > 0:
                    houses += t.houseCount
        cost = (houses * 50) + (hotels * 125)
        p.balance = max(0, p.balance - cost)
        state = check_bankruptcy(state, player_idx)
        return state, f"{p.name} paid ◈{cost} for infrastructure levies (◈50/house, ◈125/hotel). Owned: {houses} houses, {hotels} hotels."
        
    elif card_id == "o6":
        p.escapeCardsCount += 1
        return state, f"{p.name} received a Detention Clearance Card."
        
    # Empire Cards
    elif card_id == "e1":
        # Find wealthiest target
        target = None
        max_bal = -1
        for pl in state.players:
            if pl.id != p.id and not pl.isBankrupt and pl.balance > max_bal:
                max_bal = pl.balance
                target = pl
        if target:
            actual_paid = min(target.balance, 150)
            target.balance -= actual_paid;
            p.balance += actual_paid;
            # Target check bankrupcy
            target_idx = state.players.index(target)
            state = check_bankruptcy(state, target_idx)
            return state, f"{p.name} executed a Hostile Takeover on {target.name}. Transferred ◈{actual_paid}!"
        return state, f"{p.name} tried to run Hostile Takeover, but no eligible wealthy opponents found."
        
    elif card_id == "e2":
        total_received = 0
        for pl in state.players:
            if pl.id != p.id and not pl.isBankrupt:
                paid = min(pl.balance, 100)
                pl.balance -= paid
                total_received += paid
                pl_idx = state.players.index(pl)
                state = check_bankruptcy(state, pl_idx)
        p.balance += total_received
        return state, f"{p.name} collected Syndicate Dividends! Received a total of ◈{total_received} from opponents."
        
    elif card_id == "e3":
        p.balance += 200
        return state, f"{p.name} activated Rent Surge. Reserve paid out ◈200 bonuses."
        
    elif card_id == "e4":
        p.escapeCardsCount += 1
        return state, f"{p.name} acquired a Corporate Detention Waiver."

    return state, "Action processed."

def check_bankruptcy(state: GameState, player_idx: int, creditor_id: Optional[str] = None) -> GameState:
    p = state.players[player_idx]
    if p.balance <= 0:
        state = handle_bankruptcy(state, player_idx, creditor_id)
    return state

def trigger_auction(state: GameState, tile_index: int) -> GameState:
    active_bidders = [p.id for p in state.players if not p.isBankrupt]
    tile = state.tiles[tile_index]
    
    timer_limit = state.auctionTimerLimit if hasattr(state, "auctionTimerLimit") else 15
    state.auction = AuctionState(
        isActive=True,
        tileIndex=tile_index,
        highestBid=10,
        highestBidderId=None,
        activeBidders=active_bidders,
        currentBidderId=active_bidders[0] if active_bidders else None,
        timer=timer_limit
    )
    
    state.logs.insert(0, create_log(f"Auction declared for {tile.name}. Starting bid: ◈10.", "auction"))
    return state

def place_bid(state: GameState, bidder_id: str, amount: int) -> GameState:
    if not state.auction.isActive:
        return state
        
    # Security: Verify bidder is active
    if bidder_id not in state.auction.activeBidders:
        return state
        
    bidder = next((p for p in state.players if p.id == bidder_id), None)
    if not bidder or bidder.balance < amount or amount <= state.auction.highestBid:
        return state
        
    state.auction.highestBid = amount
    state.auction.highestBidderId = bidder_id
    timer_limit = state.auctionTimerLimit if hasattr(state, "auctionTimerLimit") else 15
    state.auction.timer = timer_limit
    
    state.logs.insert(0, create_log(f"{bidder.name} bids ◈{amount}!", "auction"))
    return state

def pass_bid(state: GameState, bidder_id: str) -> GameState:
    if not state.auction.isActive:
        return state
        
    # Security: Verify bidder is active
    if bidder_id not in state.auction.activeBidders:
        return state
        
    state.auction.activeBidders = [id for id in state.auction.activeBidders if id != bidder_id]
    bidder_name = next((p.name for p in state.players if p.id == bidder_id), "Unknown")
    state.logs.insert(0, create_log(f"{bidder_name} passed bidding.", "auction"))
    
    if len(state.auction.activeBidders) == 0 or (
        len(state.auction.activeBidders) == 1 and state.auction.highestBidderId == state.auction.activeBidders[0]
    ):
        state = end_auction(state)
        
    return state

def end_auction(state: GameState) -> GameState:
    if not state.auction.isActive:
        return state
        
    winner_id = state.auction.highestBidderId
    winner = next((p for p in state.players if p.id == winner_id), None) if winner_id else None
    tile = state.tiles[state.auction.tileIndex]
    bid_amount = state.auction.highestBid
    
    if winner and winner.balance >= bid_amount:
        winner.balance -= bid_amount
        tile.ownerId = winner.id
        winner.ownedProperties.append(tile.index)
        state.logs.insert(0, create_log(f"{winner.name} won the auction for {tile.name} at ◈{bid_amount}!", "auction"))
    else:
        state.logs.insert(0, create_log(f"Auction closed for {tile.name} with no successful buyer.", "auction"))
        
    state.auction.isActive = False
    return state

def handle_bankruptcy(state: GameState, bankrupt_idx: int, creditor_id: Optional[str] = None) -> GameState:
    p = state.players[bankrupt_idx]
    p.isBankrupt = True
    p.balance = 0
    
    creditor = next((c for c in state.players if c.id == creditor_id), None) if creditor_id else None
    
    state.logs.insert(0, create_log(f"CRITICAL: {p.name} has declared Bankruptcy!", "bankruptcy"))
    
    # Distribute assets
    for t in state.tiles:
        if t.ownerId == p.id:
            if creditor:
                t.ownerId = creditor.id
                t.houseCount = 0
                t.isMortgaged = False
                creditor.ownedProperties.append(t.index)
            else:
                t.ownerId = None
                t.houseCount = 0
                t.isMortgaged = False
                
    p.ownedProperties = []
    
    # Check for game over
    active_players = [pl for pl in state.players if not pl.isBankrupt]
    if len(active_players) == 1:
        state.status = "GAME_OVER"
        state.winnerId = active_players[0].id
        state.logs.insert(0, create_log(f"🏆 Game Over! {active_players[0].name} has dominated the lobby to win PropEmpire!", "system"))
        
    return state

def resolve_tile_landing(state: GameState, player_index: int, tile_index: int, dice_sum: int) -> GameState:
    p = state.players[player_index]
    tile = state.tiles[tile_index]
    
    state.selectedTileIndex = tile_index
    
    # 1. Buyable tiles
    if tile.type in ["PROPERTY", "RAIL", "UTILITY"] and not tile.ownerId:
        if p.isBot:
            price = tile.cost or 0
            if p.balance >= price * 1.3:
                p.balance -= price
                tile.ownerId = p.id
                p.ownedProperties.append(tile_index)
                state.logs.insert(0, create_log(f"{p.name} acquired {tile.name} for ◈{price}.", "buy"))
            else:
                state.logs.insert(0, create_log(f"{p.name} passed on buying {tile.name}. Starting public auction.", "auction"))
                state = trigger_auction(state, tile_index)
        return state
        
    # 2. Owned tiles
    if tile.type in ["PROPERTY", "RAIL", "UTILITY"] and tile.ownerId:
        if tile.ownerId != p.id:
            owner = next((o for o in state.players if o.id == tile.ownerId), None)
            if owner and not owner.isBankrupt and not tile.isMortgaged:
                rent_amt = calculate_rent(tile, owner, state, dice_sum)
                actual_paid = min(p.balance, rent_amt)
                p.balance -= actual_paid
                owner.balance += actual_paid
                state.logs.insert(0, create_log(f"{p.name} paid ◈{actual_paid} rent to {owner.name} at {tile.name}.", "rent"))
                state = check_bankruptcy(state, player_index, owner.id)
        return state
        
    # 3. Tax space
    if tile.type == "TAX":
        tax_amt = tile.cost or 100
        actual_paid = min(p.balance, tax_amt)
        p.balance -= actual_paid
        state.logs.insert(0, create_log(f"{p.name} paid tax fee of ◈{actual_paid} to Treasury.", "system"))
        state = check_bankruptcy(state, player_index)
        return state
        
    # 4. Card spaces
    if tile.type in ["OPPORTUNITY", "EMPIRE"]:
        is_empire = tile.type == "EMPIRE"
        deck = EMPIRE_CARDS_DATA if is_empire else OPPORTUNITY_CARDS_DATA
        card = random.choice(deck)
        state.drawnCard = DrawnCardState(card=card, isEmpire=is_empire)
        
        # Bots automatically resolve cards
        if p.isBot:
            state, log_msg = apply_card_action(state, card.id, player_index)
            state.logs.insert(0, create_log(log_msg, "card"))
            state.drawnCard = None
        return state
        
    # 5. Go To Detention
    if tile.type == "GO_TO_DETENTION":
        p.position = 10
        p.inDetention = True
        p.detentionTurns = 0
        state.logs.insert(0, create_log(f"{p.name} was arrested and sent to Detention.", "jail"))
        return state
        
    return state

def execute_bot_turn(state: GameState) -> GameState:
    idx = state.activePlayerIndex
    bot = state.players[idx]
    if not bot.isBot or bot.isBankrupt or state.status != "PLAYING":
        return state
        
    # If in detention, bot exits
    if bot.inDetention:
        if bot.balance > 300:
            bot.balance -= 50
            bot.inDetention = False
            bot.detentionTurns = 0
            state.logs.insert(0, create_log(f"{bot.name} paid ◈50 fine to clear Detention.", "jail"))
        elif bot.escapeCardsCount > 0:
            bot.escapeCardsCount -= 1
            bot.inDetention = False
            bot.detentionTurns = 0
            state.logs.insert(0, create_log(f"{bot.name} used Detention Clearance Card to escape.", "jail"))
        else:
            d1 = random.randint(1, 6)
            d2 = random.randint(1, 6)
            state.dice = (d1, d2)
            state.logs.insert(0, create_log(f"{bot.name} rolled [{d1}, {d2}] attempting doubles.", "roll"))
            
            if d1 == d2:
                bot.inDetention = False
                bot.detentionTurns = 0
                target_pos = (bot.position + d1 + d2) % 40
                bot.position = target_pos
                state.logs.insert(0, create_log(f"{bot.name} rolled doubles and moved to {state.tiles[target_pos].name}!", "jail"))
                state = resolve_tile_landing(state, idx, target_pos, d1 + d2)
            else:
                bot.detentionTurns += 1
                state.logs.insert(0, create_log(f"{bot.name} failed doubles (Turn {bot.detentionTurns}/3).", "jail"))
                if bot.detentionTurns >= 3:
                    bot.balance = max(0, bot.balance - 50)
                    bot.inDetention = False
                    bot.detentionTurns = 0
                    state.logs.insert(0, create_log(f"{bot.name} served maximum term. Paid forced fine of ◈50.", "jail"))
                    state = check_bankruptcy(state, idx)
                state.hasRolledThisTurn = True
                return state

    if not state.hasRolledThisTurn:
        d1 = random.randint(1, 6)
        d2 = random.randint(1, 6)
        state.dice = (d1, d2)
        state.hasRolledThisTurn = True
        
        steps = d1 + d2
        old_pos = bot.position
        target_pos = (old_pos + steps) % 40
        
        if target_pos < old_pos:
            bot.balance += 200
            state.logs.insert(0, create_log(f"{bot.name} passed START and collected ◈200 surplus.", "system"))
            
        bot.position = target_pos
        state.logs.insert(0, create_log(f"{bot.name} rolled {steps} and landed on {state.tiles[target_pos].name}.", "roll"))
        state = resolve_tile_landing(state, idx, target_pos, steps)
        
    # Upgrade monopolies if bot has cash
    for t in state.tiles:
        if t.ownerId == bot.id and t.type == "PROPERTY" and not t.isMortgaged:
            district_owned = owns_district(state, bot.id, t.district or "")
            cost = t.houseCost or 100
            if district_owned and t.houseCount < 5 and bot.balance > (cost + 250):
                # Enforce even building
                district_tiles = [dt for dt in state.tiles if dt.district == t.district]
                min_houses = min(dt.houseCount for dt in district_tiles)
                
                can_build = (t.houseCount == min_houses and t.houseCount < 4) or \
                            (t.houseCount == 4 and all(dt.houseCount >= 4 for dt in district_tiles))
                            
                if can_build:
                    t.houseCount += 1
                    bot.balance -= cost
                    state.logs.insert(0, create_log(f"{bot.name} built a {'Hotel' if t.houseCount == 5 else 'House'} on {t.name} (Paid ◈{cost}).", "build"))

    return state
