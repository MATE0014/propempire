import socketio
import asyncio
import random
from typing import Dict, Any

from pathlib import Path
from dotenv import load_dotenv
load_dotenv(dotenv_path=Path(__file__).resolve().parent.parent / '.env')

from app.models import Player, GameState, Tile
from app.game_rules import (
    create_log,
    check_bankruptcy,
    resolve_tile_landing,
    execute_bot_turn,
    owns_district,
    calculate_rent,
    pass_bid,
    place_bid,
    apply_card_action
)
from app.room_manager import RoomManager

sio = socketio.AsyncServer(async_mode='asgi', cors_allowed_origins='*')
manager = RoomManager()

# Map connection session ID (sid) to player metadata
sid_to_player: Dict[str, Dict[str, str]] = {} # sid -> {playerId, roomId}
auction_cooldowns: Dict[str, Dict[str, float]] = {} # roomId -> {playerId: timestamp}

@sio.event
async def connect(sid, environ):
    # Production-safe logging (no sensitive internals)
    pass

@sio.event
async def disconnect(sid):
    if sid in sid_to_player:
        meta = sid_to_player[sid]
        room_id = meta["roomId"]
        player_id = meta["playerId"]
        
        state = await manager.leave_room(room_id, player_id)
        if state:
            await sio.emit("ROOM_STATE_UPDATED", state.model_dump(), room=room_id)
        del sid_to_player[sid]

@sio.event
async def JOIN_LOBBY(sid, data: Dict[str, Any]):
    room_id = data.get("roomId", "PE-8742").upper()
    player_id = data.get("playerId", "p1")
    username = data.get("name", "You (Investor)")
    avatar = data.get("avatar", "💼")
    token = data.get("token", "Rocket")
    
    # Evict any active session for this player (disconnecting the old tab/device)
    old_sids = [s for s, meta in list(sid_to_player.items()) if meta["playerId"] == player_id and s != sid]
    for old_sid in old_sids:
        # Notify the old session that it was disconnected
        await sio.emit("ERROR", {"message": "You have been disconnected because this player joined from another tab or device."}, to=old_sid)
        
        # Remove from sid_to_player map BEFORE calling disconnect to avoid triggering leave_room
        if old_sid in sid_to_player:
            del sid_to_player[old_sid]
            
        try:
            await sio.disconnect(old_sid)
        except Exception:
            pass

    player = Player(
        id=player_id,
        name=username,
        avatar=avatar,
        token=token,
        balance=1500,
        position=0,
        ownedProperties=[],
        escapeCardsCount=0,
        inDetention=False,
        detentionTurns=0,
        isBankrupt=False,
        isBot=False,
        color="amber" if player_id == "p1" else "indigo",
        isOnline=True
    )
    
    # Check if host or joiner
    state = await manager.get_room(room_id)
    if not state:
        is_creating = data.get("isCreating", False)
        if not is_creating:
            await sio.emit("ERROR", {"message": f"Boardroom code {room_id} is invalid or has expired."}, to=sid)
            return
        state = await manager.create_room(room_id, player)
    else:
        # Check if token is already claimed by another player in the room
        claimed_tokens = [p.token for p in state.players if p.id != player_id]
        if token in claimed_tokens:
            all_tokens = ["Car", "Dog", "Top Hat", "Ship", "Cat", "Duck", "Crown", "Rocket"]
            available = [t for t in all_tokens if t not in claimed_tokens]
            if available:
                token = available[0]
                player.token = token
                
                # Map token name to avatar emoji
                token_to_avatar = {
                    "Car": "🏎️", "Dog": "🐕", "Top Hat": "🎩", "Ship": "⚓",
                    "Cat": "🐈", "Duck": "🦆", "Crown": "👑", "Rocket": "🚀"
                }
                player.avatar = token_to_avatar.get(token, player.avatar)
        state = await manager.join_room(room_id, player)
        
    if not state:
        await sio.emit("ERROR", {"message": "Room full or match already in progress."}, to=sid)
        return

    sid_to_player[sid] = {"roomId": room_id, "playerId": player_id}
    await sio.enter_room(sid, room_id)
    await sio.emit("ROOM_STATE_UPDATED", state.model_dump(), room=room_id)

@sio.event
async def TOGGLE_READY(sid, data: Dict[str, Any]):
    meta = sid_to_player.get(sid)
    if not meta: return
    
    room_id = meta["roomId"]
    
    # Security Check: Verify room matches data roomId if provided
    if data.get("roomId") and data.get("roomId").upper() != room_id: return
    
    state = await manager.get_room(room_id)
    if not state or state.status != "LOBBY": return

    # Security Check: Verify sender is host (first player in list)
    host_id = state.players[0].id if len(state.players) > 0 else None
    if meta["playerId"] != host_id:
        return
        
    # Read host settings
    settings = data.get("settings", {})
    max_players = settings.get("maxPlayers", 4)
    starting_capital = settings.get("startingCapital", 1500)
    turn_timer_limit = settings.get("turnTimerLimit", 60)
    roll_timer_bonus = settings.get("rollTimerBonus", 15)
    bots_enabled = settings.get("botsEnabled", True)
    bot_count = settings.get("botCount", 3) if bots_enabled else 0
    auction_timer_limit = settings.get("auctionTimerLimit", 15)

    # Save to state
    state.maxPlayers = max_players
    state.startingCapital = starting_capital
    state.turnTimerLimit = turn_timer_limit
    state.rollTimerBonus = roll_timer_bonus
    state.botsEnabled = bots_enabled
    state.botCount = bot_count
    state.auctionTimerLimit = auction_timer_limit
    
    # Add exactly the selected number of bots if enabled
    if bots_enabled and bot_count > 0:
        target_count = min(len(state.players) + bot_count, max_players, 8)
        state = await manager.fill_with_bots(room_id, target_count=target_count)
    
    # Initialize starting capital for all players
    for p in state.players:
        p.balance = starting_capital

    state.status = "PLAYING"
    state.turnTimer = turn_timer_limit
    state.logs.insert(0, create_log("PropEmpire match launched! Game loop active."))
    await manager.save_room(room_id, state)
    await sio.emit("ROOM_STATE_UPDATED", state.model_dump(), room=room_id)
    
    # Trigger bot turns and turn timer countdown loops
    asyncio.create_task(run_bot_loop(room_id))
    asyncio.create_task(run_turn_timer(room_id))

@sio.event
async def ROLL_DICE(sid, data: Dict[str, Any]):
    meta = sid_to_player.get(sid)
    if not meta: return
    
    room_id = meta["roomId"]
    
    # Security Check: Verify room matches data roomId if provided
    if data.get("roomId") and data.get("roomId").upper() != room_id: return
    
    state = await manager.get_room(room_id)
    if not state or state.status != "PLAYING" or state.hasRolledThisTurn: return
    
    active_idx = state.activePlayerIndex
    p = state.players[active_idx]
    
    # Security Check: Verify turn and prevent action if player is in detention (must use detention-specific actions)
    if p.id != meta["playerId"] or p.isBot or p.inDetention: return

    # Perform roll
    d1 = random.randint(1, 6)
    d2 = random.randint(1, 6)
    state.dice = (d1, d2)
    state.hasRolledThisTurn = True
    
    steps = d1 + d2
    old_pos = p.position
    target_pos = (old_pos + steps) % 40
    
    # Pass start bonus
    if target_pos < old_pos:
        p.balance += 200
        state.logs.insert(0, create_log(f"{p.name} passed START and collected ◈200 surplus.", "system"))
        
    p.position = target_pos
    state.logs.insert(0, create_log(f"{p.name} rolled [{d1}, {d2}] and landed on {state.tiles[target_pos].name}.", "roll"))
    
    # Add roll timer bonus
    state.turnTimer += state.rollTimerBonus
    
    state = resolve_tile_landing(state, active_idx, target_pos, steps)
    await manager.save_room(room_id, state)
    await sio.emit("ROOM_STATE_UPDATED", state.model_dump(), room=room_id)

@sio.event
async def BUY_PROPERTY(sid, data: Dict[str, Any]):
    meta = sid_to_player.get(sid)
    if not meta: return
    
    room_id = meta["roomId"]
    
    # Security Check: Verify room matches data roomId if provided
    if data.get("roomId") and data.get("roomId").upper() != room_id: return
    
    state = await manager.get_room(room_id)
    if not state or state.status != "PLAYING": return
    
    active_idx = state.activePlayerIndex
    p = state.players[active_idx]
    
    # Security Check: Verify turn
    if p.id != meta["playerId"]: return
    
    # Boundary Check: Validate player position matches board index
    if p.position < 0 or p.position >= len(state.tiles): return
    
    tile = state.tiles[p.position]
    price = tile.cost or 0
    if p.balance < price or tile.ownerId or tile.type not in ["PROPERTY", "RAIL", "UTILITY"]: return
    
    p.balance -= price
    tile.ownerId = p.id
    p.ownedProperties.append(tile.index)
    state.logs.insert(0, create_log(f"{p.name} purchased {tile.name} for ◈{price}.", "buy"))
    await manager.save_room(room_id, state)
    await sio.emit("ROOM_STATE_UPDATED", state.model_dump(), room=room_id)

@sio.event
async def START_AUCTION(sid, data: Dict[str, Any]):
    meta = sid_to_player.get(sid)
    if not meta: return
    
    room_id = meta["roomId"]
    
    # Security Check: Verify room matches data roomId if provided
    if data.get("roomId") and data.get("roomId").upper() != room_id: return
    
    state = await manager.get_room(room_id)
    if not state or state.status != "PLAYING": return
    
    active_idx = state.activePlayerIndex
    p = state.players[active_idx]
    
    # Security Check: Verify turn
    if p.id != meta["playerId"]: return
    
    # Boundary Check: Validate player position matches board index
    if p.position < 0 or p.position >= len(state.tiles): return
    
    tile = state.tiles[p.position]
    if tile.ownerId or tile.type not in ["PROPERTY", "RAIL", "UTILITY"]: return
    
    # Trigger auction state
    active_bidders = [pl.id for pl in state.players if not pl.isBankrupt]
    from app.models import AuctionState
    timer_limit = state.auctionTimerLimit
    state.auction = AuctionState(
        isActive=True,
        tileIndex=tile.index,
        highestBid=10,
        highestBidderId=None,
        activeBidders=active_bidders,
        currentBidderId=active_bidders[0] if active_bidders else None,
        timer=timer_limit
    )
    state.logs.insert(0, create_log(f"Public liquidation auction started for {tile.name}. Opening Bid: ◈10.", "auction"))
    await manager.save_room(room_id, state)
    await sio.emit("ROOM_STATE_UPDATED", state.model_dump(), room=room_id)
    
    # Start auction loop timer monitor
    asyncio.create_task(run_auction_timer(room_id))

@sio.event
async def PLACE_BID(sid, data: Dict[str, Any]):
    meta = sid_to_player.get(sid)
    if not meta: return
    
    room_id = meta["roomId"]
    
    # Security Check: Verify room matches data roomId if provided
    if data.get("roomId") and data.get("roomId").upper() != room_id: return
    
    state = await manager.get_room(room_id)
    if not state or not state.auction.isActive: return
    
    bidder_id = meta["playerId"]
    
    # Security Check: Verify bidder is active
    if bidder_id not in state.auction.activeBidders:
        return
        
    # Cooldown check: 2 seconds
    import time
    now = time.time()
    room_cooldowns = auction_cooldowns.setdefault(room_id, {})
    last_bid = room_cooldowns.get(bidder_id, 0)
    if now - last_bid < 2.0:
        return
        
    amount = data.get("amount", 0)
    
    state = place_bid(state, bidder_id, amount)
    room_cooldowns[bidder_id] = now
    await manager.save_room(room_id, state)
    await sio.emit("ROOM_STATE_UPDATED", state.model_dump(), room=room_id)

@sio.event
async def PASS_BID(sid, data: Dict[str, Any]):
    meta = sid_to_player.get(sid)
    if not meta: return
    
    room_id = meta["roomId"]
    
    # Security Check: Verify room matches data roomId if provided
    if data.get("roomId") and data.get("roomId").upper() != room_id: return
    
    state = await manager.get_room(room_id)
    if not state or not state.auction.isActive: return
    
    bidder_id = meta["playerId"]
    
    # Security Check: Verify bidder is active
    if bidder_id not in state.auction.activeBidders:
        return
        
    state = pass_bid(state, bidder_id)
    await manager.save_room(room_id, state)
    await sio.emit("ROOM_STATE_UPDATED", state.model_dump(), room=room_id)

@sio.event
async def END_TURN(sid, data: Dict[str, Any]):
    meta = sid_to_player.get(sid)
    if not meta: return
    
    room_id = meta["roomId"]
    
    # Security Check: Verify room matches data roomId if provided
    if data.get("roomId") and data.get("roomId").upper() != room_id: return
    
    state = await manager.get_room(room_id)
    if not state or state.status != "PLAYING" or not state.hasRolledThisTurn: return
    
    active_idx = state.activePlayerIndex
    p = state.players[active_idx]
    
    # Security Check: Verify turn
    if p.id != meta["playerId"]: return
    
    # Transition turns
    next_idx = (active_idx + 1) % len(state.players)
    while state.players[next_idx].isBankrupt:
        next_idx = (next_idx + 1) % len(state.players)
        
    state.activePlayerIndex = next_idx
    state.hasRolledThisTurn = False
    state.turnTimer = state.turnTimerLimit
    state.drawnCard = None
    state.logs.insert(0, create_log(f"--- Turn transitioned to {state.players[next_idx].name} ---"))
    await manager.save_room(room_id, state)
    await sio.emit("ROOM_STATE_UPDATED", state.model_dump(), room=room_id)
    
    # Execute bot loop
    asyncio.create_task(run_bot_loop(room_id))

@sio.event
async def BUILD_HOUSE(sid, data: Dict[str, Any]):
    meta = sid_to_player.get(sid)
    if not meta: return
    room_id = meta["roomId"]
    
    # Security Check: Verify room matches data roomId if provided
    if data.get("roomId") and data.get("roomId").upper() != room_id: return
    
    state = await manager.get_room(room_id)
    if not state or state.status != "PLAYING": return
    
    tile_idx = data.get("tileIndex", -1)
    # Security: Validate index boundaries to prevent IndexError
    if tile_idx < 0 or tile_idx >= len(state.tiles): return
    
    tile = state.tiles[tile_idx]
    p = next((pl for pl in state.players if pl.id == meta["playerId"]), None)
    if not p or p.isBankrupt or not tile or tile.ownerId != p.id or tile.isMortgaged or tile.houseCount >= 4 or tile.type != "PROPERTY": return
    
    cost = tile.houseCost or 100
    if p.balance < cost or not owns_district(state, p.id, tile.district or ""): return
    
    # Enforce even building
    district_tiles = [t for t in state.tiles if t.district == tile.district]
    min_houses = min(t.houseCount for t in district_tiles)
    if tile.houseCount != min_houses: return
    
    p.balance -= cost
    tile.houseCount += 1
    state.logs.insert(0, create_log(f"Built a House on {tile.name} (Paid ◈{cost}).", "build"))
    await manager.save_room(room_id, state)
    await sio.emit("ROOM_STATE_UPDATED", state.model_dump(), room=room_id)

@sio.event
async def BUILD_HOTEL(sid, data: Dict[str, Any]):
    meta = sid_to_player.get(sid)
    if not meta: return
    room_id = meta["roomId"]
    
    # Security Check: Verify room matches data roomId if provided
    if data.get("roomId") and data.get("roomId").upper() != room_id: return
    
    state = await manager.get_room(room_id)
    if not state or state.status != "PLAYING": return
    
    tile_idx = data.get("tileIndex", -1)
    # Security: Validate index boundaries to prevent IndexError
    if tile_idx < 0 or tile_idx >= len(state.tiles): return
    
    tile = state.tiles[tile_idx]
    p = next((pl for pl in state.players if pl.id == meta["playerId"]), None)
    if not p or p.isBankrupt or not tile or tile.ownerId != p.id or tile.isMortgaged or tile.houseCount != 4 or tile.type != "PROPERTY": return
    
    cost = tile.houseCost or 100
    if p.balance < cost: return
    
    # Enforce even building (all other properties in the district must have at least 4 houses)
    district_tiles = [t for t in state.tiles if t.district == tile.district]
    if not all(t.houseCount >= 4 for t in district_tiles): return
    
    p.balance -= cost
    tile.houseCount = 5
    state.logs.insert(0, create_log(f"Upgraded to a Hotel on {tile.name} (Paid ◈{cost}).", "build"))
    await manager.save_room(room_id, state)
    await sio.emit("ROOM_STATE_UPDATED", state.model_dump(), room=room_id)

@sio.event
async def MORTGAGE(sid, data: Dict[str, Any]):
    meta = sid_to_player.get(sid)
    if not meta: return
    room_id = meta["roomId"]
    
    # Security Check: Verify room matches data roomId if provided
    if data.get("roomId") and data.get("roomId").upper() != room_id: return
    
    state = await manager.get_room(room_id)
    if not state or state.status != "PLAYING": return
    
    tile_idx = data.get("tileIndex", -1)
    # Security: Validate index boundaries to prevent IndexError
    if tile_idx < 0 or tile_idx >= len(state.tiles): return
    
    tile = state.tiles[tile_idx]
    p = next((pl for pl in state.players if pl.id == meta["playerId"]), None)
    if not p or p.isBankrupt or not tile or tile.ownerId != p.id or tile.isMortgaged: return
    
    mort_val = tile.mortgageValue or 50
    p.balance += mort_val
    tile.isMortgaged = True
    tile.houseCount = 0
    state.logs.insert(0, create_log(f"Mortgaged {tile.name} (Received ◈{mort_val}).", "mortgage"))
    await manager.save_room(room_id, state)
    await sio.emit("ROOM_STATE_UPDATED", state.model_dump(), room=room_id)

@sio.event
async def UNMORTGAGE(sid, data: Dict[str, Any]):
    meta = sid_to_player.get(sid)
    if not meta: return
    room_id = meta["roomId"]
    
    # Security Check: Verify room matches data roomId if provided
    if data.get("roomId") and data.get("roomId").upper() != room_id: return
    
    state = await manager.get_room(room_id)
    if not state or state.status != "PLAYING": return
    
    tile_idx = data.get("tileIndex", -1)
    # Security: Validate index boundaries to prevent IndexError
    if tile_idx < 0 or tile_idx >= len(state.tiles): return
    
    tile = state.tiles[tile_idx]
    p = next((pl for pl in state.players if pl.id == meta["playerId"]), None)
    if not p or p.isBankrupt or not tile or tile.ownerId != p.id or not tile.isMortgaged: return
    
    unmort_val = tile.unmortgageValue or 55
    if p.balance < unmort_val: return
    
    p.balance -= unmort_val
    tile.isMortgaged = False
    state.logs.insert(0, create_log(f"Unmortgaged {tile.name} (Paid ◈{unmort_val}).", "mortgage"))
    await manager.save_room(room_id, state)
    await sio.emit("ROOM_STATE_UPDATED", state.model_dump(), room=room_id)

@sio.event
async def PROPOSE_TRADE(sid, data: Dict[str, Any]):
    meta = sid_to_player.get(sid)
    if not meta: return
    room_id = meta["roomId"]
    
    # Security Check: Verify room matches data roomId if provided
    if data.get("roomId") and data.get("roomId").upper() != room_id: return
    
    state = await manager.get_room(room_id)
    if not state or state.status != "PLAYING": return
    
    receiver_id = data.get("receiverId", "")
    proposer_offer = data.get("proposerOffer", {})
    receiver_offer = data.get("receiverOffer", {})
    
    proposer = next((pl for pl in state.players if pl.id == meta["playerId"]), None)
    receiver = next((pl for pl in state.players if pl.id == receiver_id), None)
    if not proposer or not receiver or proposer.isBankrupt or receiver.isBankrupt: return
    
    # Anti-cheat validations
    p_cash = proposer_offer.get("cash", 0)
    p_cards = proposer_offer.get("escapeCards", 0)
    p_props = proposer_offer.get("properties", [])
    
    r_cash = receiver_offer.get("cash", 0)
    r_cards = receiver_offer.get("escapeCards", 0)
    r_props = receiver_offer.get("properties", [])
    
    if p_cash < 0 or p_cards < 0 or r_cash < 0 or r_cards < 0:
        return
        
    if p_cash > proposer.balance or p_cards > proposer.escapeCardsCount:
        return
        
    if r_cash > receiver.balance or r_cards > receiver.escapeCardsCount:
        return
        
    for idx in p_props:
        if idx < 0 or idx >= len(state.tiles) or state.tiles[idx].ownerId != proposer.id:
            return
            
    for idx in r_props:
        if idx < 0 or idx >= len(state.tiles) or state.tiles[idx].ownerId != receiver.id:
            return
            
    from app.models import TradeState, TradeAsset
    state.trade = TradeState(
        isActive=True,
        proposerId=meta["playerId"],
        receiverId=receiver_id,
        proposerOffer=TradeAsset(**proposer_offer),
        receiverOffer=TradeAsset(**receiver_offer)
    )
    
    proposer_name = proposer.name
    receiver_name = receiver.name
    state.logs.insert(0, create_log(f"{proposer_name} sent a contract trade offer to {receiver_name}.", "trade"))
    await manager.save_room(room_id, state)
    await sio.emit("ROOM_STATE_UPDATED", state.model_dump(), room=room_id)
    
    # Auto evaluate bot trades immediately
    if receiver.isBot:
        await asyncio.sleep(2)
        # Heuristics: accept if bot gains net worth value (mortgage value + cash)
        total_gave = receiver_offer.get("cash", 0)
        for idx in receiver_offer.get("properties", []):
            if 0 <= idx < len(state.tiles):
                total_gave += state.tiles[idx].mortgageValue or 50
            
        total_got = proposer_offer.get("cash", 0)
        for idx in proposer_offer.get("properties", []):
            if 0 <= idx < len(state.tiles):
                total_got += state.tiles[idx].mortgageValue or 50
            
        accept = total_got >= total_gave * 0.95
        # Pass authorization credentials by performing accept resolution directly
        await resolve_trade_state(room_id, accept)

@sio.event
async def RESPOND_TRADE(sid, data: Dict[str, Any]):
    meta = sid_to_player.get(sid)
    if not meta: return
    room_id = meta["roomId"]
    
    # Security Check: Verify room matches data roomId if provided
    if data.get("roomId") and data.get("roomId").upper() != room_id: return
    
    state = await manager.get_room(room_id)
    if not state or not state.trade.isActive: return
    
    # Security Check: Authorize that only the designated trade receiver can respond to it
    if meta["playerId"] != state.trade.receiverId:
        return
        
    accept = data.get("accept", False)
    await resolve_trade_state(room_id, accept)

@sio.event
async def SEND_CHAT(sid, data: Dict[str, Any]):
    meta = sid_to_player.get(sid)
    if not meta: return
    room_id = meta["roomId"]
    
    # Security Check: Verify room matches data roomId if provided
    if data.get("roomId") and data.get("roomId").upper() != room_id: return
    
    text = data.get("text", "")
    if not text.strip(): return
    
    state = await manager.get_room(room_id)
    if not state: return
    
    sender_player = next((p for p in state.players if p.id == meta["playerId"]), None)
    if not sender_player: return
    sender_name = sender_player.name
    
    await sio.emit("CHAT_RECEIVED", {"sender": sender_name, "text": text, "type": "user"}, room=room_id)

@sio.event
async def UPDATE_PLAYER_INFO(sid, data: Dict[str, Any]):
    meta = sid_to_player.get(sid)
    if not meta: return
    
    room_id = data.get("roomId")
    player_id = data.get("playerId")
    new_name = data.get("name")
    new_token = data.get("token")
    if not room_id or not player_id or not new_name or not new_token: return
    
    # Security Check: Authorize room_id and player_id match the connected session metadata
    if meta["roomId"] != room_id or meta["playerId"] != player_id: return
    
    state = await manager.get_room(room_id)
    if not state or state.status != "LOBBY": return
    
    player = next((p for p in state.players if p.id == player_id), None)
    if player:
        # Check if the token is claimed by another player
        claimed_tokens = [p.token for p in state.players if p.id != player_id]
        if new_token in claimed_tokens:
            return # Block update if token is already claimed
            
        old_name = player.name
        player.name = new_name
        player.token = new_token
        
        # Map token name to an avatar emoji
        token_to_avatar = {
            "Car": "🏎️", "Dog": "🐕", "Top Hat": "🎩", "Ship": "⚓",
            "Cat": "🐈", "Duck": "🦆", "Crown": "👑", "Rocket": "🚀"
        }
        player.avatar = token_to_avatar.get(new_token, player.avatar)
        
        state.logs.insert(0, create_log(f"{old_name} updated name to {new_name} and claimed token {new_token}.", "system"))
        await manager.save_room(room_id, state)
        await sio.emit("ROOM_STATE_UPDATED", state.model_dump(), room=room_id)

@sio.event
async def KICK_PLAYER(sid, data: Dict[str, Any]):
    room_id = data.get("roomId")
    player_id_to_kick = data.get("playerIdToKick")
    if not room_id or not player_id_to_kick: return
    
    meta = sid_to_player.get(sid)
    if not meta or meta["roomId"] != room_id: return
    sender_id = meta["playerId"]
    
    state = await manager.get_room(room_id)
    if not state or len(state.players) == 0: return
    
    # Host is the first player in state.players
    host_id = state.players[0].id
    if sender_id != host_id:
        return # Only host can kick!
        
    kicked_player = next((p for p in state.players if p.id == player_id_to_kick), None)
    if kicked_player:
        state.players = [p for p in state.players if p.id != player_id_to_kick]
        state.logs.insert(0, create_log(f"{kicked_player.name} was liquidated from the boardroom by the Host.", "system"))
        
        # Find connection of the kicked player to emit kicked event and disconnect
        kicked_sid = next((k_sid for k_sid, k_meta in sid_to_player.items() if k_meta["roomId"] == room_id and k_meta["playerId"] == player_id_to_kick), None)
        if kicked_sid:
            await sio.emit("YOU_WERE_KICKED", {}, to=kicked_sid)
            await sio.leave_room(kicked_sid, room_id)
            if kicked_sid in sid_to_player:
                del sid_to_player[kicked_sid]
                
        await manager.save_room(room_id, state)
        await sio.emit("ROOM_STATE_UPDATED", state.model_dump(), room=room_id)

@sio.event
async def LEAVE_GAME(sid, data: Dict[str, Any]):
    room_id = data.get("roomId")
    if not room_id: return
    
    meta = sid_to_player.get(sid)
    if not meta or meta["roomId"] != room_id: return
    player_id = meta["playerId"]
    
    state = await manager.get_room(room_id)
    if not state: return
    
    player = next((p for p in state.players if p.id == player_id), None)
    if not player: return

    # Check if host is leaving
    host_id = state.players[0].id if len(state.players) > 0 else None
    if player_id == host_id:
        await END_GAME(sid, data)
        return

    # Liquidate properties
    liquidated_count = 0
    for tile in state.tiles:
        if tile.ownerId == player_id:
            tile.ownerId = None
            tile.isMortgaged = False
            tile.houseCount = 0
            liquidated_count += 1
            
    # Remove player from state.players
    state.players = [p for p in state.players if p.id != player_id]
    
    # If the player leaving was the active player, transition turns
    if state.status == "PLAYING" and len(state.players) > 0:
        state.activePlayerIndex = state.activePlayerIndex % len(state.players)
        # Ensure the active player is not bankrupt
        while state.players[state.activePlayerIndex].isBankrupt:
            state.activePlayerIndex = (state.activePlayerIndex + 1) % len(state.players)
        
        # Reset turn state for the new active player
        state.hasRolledThisTurn = False
        state.turnTimer = state.turnTimerLimit
        state.drawnCard = None
        state.logs.insert(0, create_log(f"--- Turn transitioned to {state.players[state.activePlayerIndex].name} ---"))

    state.logs.insert(0, create_log(f"{player.name} left the game. {liquidated_count} properties liquidated.", "system"))
    
    # If there are no active human players left online, clean up
    active_humans = [p for p in state.players if not p.isBot and p.isOnline]
    if not active_humans:
        await manager.delete_room(room_id)
        await sio.emit("GAME_ENDED_BY_HOST", {}, room=room_id)
    else:
        await manager.save_room(room_id, state)
        await sio.emit("ROOM_STATE_UPDATED", state.model_dump(), room=room_id)
        
    if sid in sid_to_player:
        del sid_to_player[sid]

@sio.event
async def END_GAME(sid, data: Dict[str, Any]):
    room_id = data.get("roomId")
    if not room_id: return
    
    meta = sid_to_player.get(sid)
    if not meta or meta["roomId"] != room_id: return
    sender_id = meta["playerId"]
    
    state = await manager.get_room(room_id)
    if not state or len(state.players) == 0: return
    
    # Host is the first player in state.players
    host_id = state.players[0].id
    if sender_id != host_id:
        return
        
    # Delete the room
    await manager.delete_room(room_id)
        
    # Clean up sid_to_player mappings for this room
    sids_to_del = [s for s, m in sid_to_player.items() if m["roomId"] == room_id]
    for s in sids_to_del:
        if s in sid_to_player:
            del sid_to_player[s]
            
    # Emit end event and close boardroom
    await sio.emit("GAME_ENDED_BY_HOST", state.model_dump(), room=room_id)

# Security Handlers for server-authoritative Detention/Jail Actions

@sio.event
async def PAY_DETENTION_FINE(sid, data: Dict[str, Any]):
    meta = sid_to_player.get(sid)
    if not meta: return
    room_id = meta["roomId"]
    
    # Security Check: Verify room matches data roomId if provided
    if data.get("roomId") and data.get("roomId").upper() != room_id: return
    
    state = await manager.get_room(room_id)
    if not state or state.status != "PLAYING" or state.hasRolledThisTurn: return
    
    active_idx = state.activePlayerIndex
    p = state.players[active_idx]
    
    # Security Check: Verify turn, detention status, and balance
    if p.id != meta["playerId"] or p.isBot or not p.inDetention or p.balance < 50: return
    
    p.balance -= 50
    p.inDetention = False
    p.detentionTurns = 0
    state.logs.insert(0, create_log(f"{p.name} paid ◈50 fine to exit Detention.", "jail"))
    
    await manager.save_room(room_id, state)
    await sio.emit("ROOM_STATE_UPDATED", state.model_dump(), room=room_id)

@sio.event
async def USE_ESCAPE_CARD(sid, data: Dict[str, Any]):
    meta = sid_to_player.get(sid)
    if not meta: return
    room_id = meta["roomId"]
    
    # Security Check: Verify room matches data roomId if provided
    if data.get("roomId") and data.get("roomId").upper() != room_id: return
    
    state = await manager.get_room(room_id)
    if not state or state.status != "PLAYING" or state.hasRolledThisTurn: return
    
    active_idx = state.activePlayerIndex
    p = state.players[active_idx]
    
    # Security Check: Verify turn, detention status, and escape cards count
    if p.id != meta["playerId"] or p.isBot or not p.inDetention or p.escapeCardsCount <= 0: return
    
    p.escapeCardsCount -= 1
    p.inDetention = False
    p.detentionTurns = 0
    state.logs.insert(0, create_log(f"{p.name} used Detention Clearance Card. Set free!", "jail"))
    
    await manager.save_room(room_id, state)
    await sio.emit("ROOM_STATE_UPDATED", state.model_dump(), room=room_id)

@sio.event
async def TRY_DOUBLE_ROLL(sid, data: Dict[str, Any]):
    meta = sid_to_player.get(sid)
    if not meta: return
    room_id = meta["roomId"]
    
    # Security Check: Verify room matches data roomId if provided
    if data.get("roomId") and data.get("roomId").upper() != room_id: return
    
    state = await manager.get_room(room_id)
    if not state or state.status != "PLAYING" or state.hasRolledThisTurn: return
    
    active_idx = state.activePlayerIndex
    p = state.players[active_idx]
    
    # Security Check: Verify turn and detention status
    if p.id != meta["playerId"] or p.isBot or not p.inDetention: return
    
    d1 = random.randint(1, 6)
    d2 = random.randint(1, 6)
    state.dice = (d1, d2)
    state.hasRolledThisTurn = True
    
    state.logs.insert(0, create_log(f"{p.name} rolled [{d1}, {d2}] escaping Detention.", "roll"))
    
    if d1 == d2:
        p.inDetention = False
        p.detentionTurns = 0
        target_pos = (p.position + d1 + d2) % 40
        p.position = target_pos
        state.logs.insert(0, create_log(f"{p.name} rolled doubles and escaped to {state.tiles[target_pos].name}!", "jail"))
        state = resolve_tile_landing(state, active_idx, target_pos, d1 + d2)
    else:
        p.detentionTurns += 1
        state.logs.insert(0, create_log(f"{p.name} failed doubles (Detention turn {p.detentionTurns}/3).", "jail"))
        if p.detentionTurns >= 3:
            p.balance = max(0, p.balance - 50)
            p.inDetention = False
            p.detentionTurns = 0
            state.logs.insert(0, create_log(f"{p.name} served maximum term. Paid forced fine of ◈50.", "jail"))
            state = check_bankruptcy(state, active_idx)
            
    await manager.save_room(room_id, state)
    await sio.emit("ROOM_STATE_UPDATED", state.model_dump(), room=room_id)

# Security Handlers for server-authoritative Card Resolution

@sio.event
async def DISMISS_CARD(sid, data: Dict[str, Any]):
    meta = sid_to_player.get(sid)
    if not meta: return
    room_id = meta["roomId"]
    
    # Security Check: Verify room matches data roomId if provided
    if data.get("roomId") and data.get("roomId").upper() != room_id: return
    
    state = await manager.get_room(room_id)
    if not state or state.status != "PLAYING" or not state.drawnCard: return
    
    active_idx = state.activePlayerIndex
    p = state.players[active_idx]
    
    # Security Check: Verify turn
    if p.id != meta["playerId"] or p.isBot: return
    
    card_id = state.drawnCard.card.id
    state, log_msg = apply_card_action(state, card_id, active_idx)
    state.logs.insert(0, create_log(log_msg, "card"))
    state.drawnCard = None
    
    await manager.save_room(room_id, state)
    await sio.emit("ROOM_STATE_UPDATED", state.model_dump(), room=room_id)

async def resolve_trade_state(room_id: str, accept: bool):
    state = await manager.get_room(room_id)
    if not state or not state.trade.isActive: return
    
    proposer = next((pl for pl in state.players if pl.id == state.trade.proposerId), None)
    receiver = next((pl for pl in state.players if pl.id == state.trade.receiverId), None)
    if not proposer or not receiver: return
    
    if accept:
        # Security double-checks: ensure assets are still valid at the moment of swap execution
        if proposer.balance < state.trade.proposerOffer.cash or receiver.balance < state.trade.receiverOffer.cash:
            state.trade.isActive = False
            await manager.save_room(room_id, state)
            return
            
        if proposer.escapeCardsCount < state.trade.proposerOffer.escapeCards or receiver.escapeCardsCount < state.trade.receiverOffer.escapeCards:
            state.trade.isActive = False
            await manager.save_room(room_id, state)
            return
            
        # Swap cash
        proposer.balance += state.trade.receiverOffer.cash - state.trade.proposerOffer.cash
        receiver.balance += state.trade.proposerOffer.cash - state.trade.receiverOffer.cash
        
        # Swap cards
        proposer.escapeCardsCount += state.trade.receiverOffer.escapeCards - state.trade.proposerOffer.escapeCards
        receiver.escapeCardsCount += state.trade.proposerOffer.escapeCards - state.trade.receiverOffer.escapeCards
        
        # Swap properties
        for idx in state.trade.proposerOffer.properties:
            if idx in proposer.ownedProperties:
                proposer.ownedProperties.remove(idx)
                receiver.ownedProperties.append(idx)
                state.tiles[idx].ownerId = receiver.id
            
        for idx in state.trade.receiverOffer.properties:
            if idx in receiver.ownedProperties:
                receiver.ownedProperties.remove(idx)
                proposer.ownedProperties.append(idx)
                state.tiles[idx].ownerId = proposer.id
            
        state.logs.insert(0, create_log(f"Trade contract accepted. Title deeds transferred.", "trade"))
    else:
        state.logs.insert(0, create_log(f"Trade proposal declined by {receiver.name}.", "trade"))
        
    state.trade.isActive = False
    await manager.save_room(room_id, state)
    await sio.emit("ROOM_STATE_UPDATED", state.model_dump(), room=room_id)

# Async timer loop for auctions
async def run_auction_timer(room_id: str):
    import time
    from app.game_rules import end_auction
    while True:
        await asyncio.sleep(1)
        state = await manager.get_room(room_id)
        if not state or not state.auction.isActive:
            break
            
        state_changed = False
        now = time.time()
        
        # Bot bidding decision ticks
        for bidder_id in state.auction.activeBidders:
            bidder = next((p for p in state.players if p.id == bidder_id), None)
            if bidder and bidder.isBot and not bidder.isBankrupt:
                room_cooldowns = auction_cooldowns.setdefault(room_id, {})
                last_bid = room_cooldowns.get(bidder_id, 0)
                if now - last_bid >= 2.0:
                    tile = state.tiles[state.auction.tileIndex]
                    max_price = int((tile.cost or 100) * 0.9)
                    current_bid = state.auction.highestBid
                    
                    if current_bid < max_price and bidder.balance > current_bid + 20:
                        if random.random() < 0.4:
                            bid_increment = random.randint(10, 50)
                            new_bid = current_bid + bid_increment
                            state = place_bid(state, bidder_id, new_bid)
                            room_cooldowns[bidder_id] = now
                            state.auction.timer = state.auctionTimerLimit
                            state_changed = True
                    else:
                        if random.random() < 0.3:
                            state = pass_bid(state, bidder_id)
                            state_changed = True
                            
        # Tick the countdown timer down if no bot bid changed the state this tick
        if not state_changed:
            state.auction.timer -= 1
            if state.auction.timer <= 0:
                state = end_auction(state)
                await manager.save_room(room_id, state)
                await sio.emit("ROOM_STATE_UPDATED", state.model_dump(), room=room_id)
                break
            else:
                await manager.save_room(room_id, state)
                await sio.emit("ROOM_STATE_UPDATED", state.model_dump(), room=room_id)
        else:
            await manager.save_room(room_id, state)
            await sio.emit("ROOM_STATE_UPDATED", state.model_dump(), room=room_id)
            if not state.auction.isActive:
                break

# Async bot execution loops
async def run_bot_loop(room_id: str):
    while True:
        await asyncio.sleep(1.5)
        state = await manager.get_room(room_id)
        if not state or state.status != "PLAYING": break
        
        active_p = state.players[state.activePlayerIndex]
        if not active_p.isBot or active_p.isBankrupt:
            break # Waiting for human
            
        # Broadcast "Bot is thinking" event
        await sio.emit("BOT_PLANNING", {"name": active_p.name}, room=room_id)
        await asyncio.sleep(1.5)
        
        # Execute turn (re-fetch to avoid race conditions during sleep)
        state = await manager.get_room(room_id)
        if not state or state.status != "PLAYING": break
        state = execute_bot_turn(state)
        await manager.save_room(room_id, state)
        await sio.emit("ROOM_STATE_UPDATED", state.model_dump(), room=room_id)
        
        # Auto end turn after delay
        await asyncio.sleep(2)
        state = await manager.get_room(room_id)
        if not state or state.status != "PLAYING": break
        next_idx = (state.activePlayerIndex + 1) % len(state.players)
        while state.players[next_idx].isBankrupt:
            next_idx = (next_idx + 1) % len(state.players)
            
        state.activePlayerIndex = next_idx
        state.hasRolledThisTurn = False
        state.turnTimer = state.turnTimerLimit
        state.drawnCard = None
        state.logs.insert(0, create_log(f"--- Turn transitioned to {state.players[next_idx].name} ---"))
        await manager.save_room(room_id, state)
        await sio.emit("ROOM_STATE_UPDATED", state.model_dump(), room=room_id)

# Async turn timer monitor loop
async def run_turn_timer(room_id: str):
    from app.game_rules import trigger_auction
    while True:
        await asyncio.sleep(1)
        state = await manager.get_room(room_id)
        if not state or state.status != "PLAYING":
            break
            
        # Pause timer during active trades or property auction bidding
        if state.auction.isActive or state.trade.isActive:
            continue
            
        state.turnTimer -= 1
        if state.turnTimer <= 0:
            active_idx = state.activePlayerIndex
            p = state.players[active_idx]
            
            # 1. If player has not rolled yet, auto-roll
            if not state.hasRolledThisTurn:
                # Handle detention escape attempts first
                if p.inDetention:
                    if p.balance > 300:
                        p.balance -= 50
                        p.inDetention = False
                        p.detentionTurns = 0
                        state.logs.insert(0, create_log(f"{p.name} paid ◈50 fine to clear Detention (Auto-Escaped).", "jail"))
                    elif p.escapeCardsCount > 0:
                        p.escapeCardsCount -= 1
                        p.inDetention = False
                        p.detentionTurns = 0
                        state.logs.insert(0, create_log(f"{p.name} used Detention Clearance Card (Auto-Escaped).", "jail"))
                    else:
                        # Try double roll
                        d1 = random.randint(1, 6)
                        d2 = random.randint(1, 6)
                        state.dice = (d1, d2)
                        state.hasRolledThisTurn = True
                        state.logs.insert(0, create_log(f"{p.name} auto-rolled [{d1}, {d2}] escaping Detention.", "roll"))
                        if d1 == d2:
                            p.inDetention = False
                            p.detentionTurns = 0
                            target_pos = (p.position + d1 + d2) % 40
                            p.position = target_pos
                            state.logs.insert(0, create_log(f"{p.name} rolled doubles and escaped to {state.tiles[target_pos].name}!", "jail"))
                            state = resolve_tile_landing(state, active_idx, target_pos, d1 + d2)
                        else:
                            p.detentionTurns += 1
                            state.logs.insert(0, create_log(f"{p.name} failed doubles (Detention turn {p.detentionTurns}/3).", "jail"))
                            if p.detentionTurns >= 3:
                                p.balance = max(0, p.balance - 50)
                                p.inDetention = False
                                p.detentionTurns = 0
                                state.logs.insert(0, create_log(f"{p.name} served maximum term. Paid forced fine of ◈50.", "jail"))
                                state = check_bankruptcy(state, active_idx)
                
                # Roll dice if out of detention and hasn't rolled
                if not p.inDetention and not state.hasRolledThisTurn:
                    d1 = random.randint(1, 6)
                    d2 = random.randint(1, 6)
                    state.dice = (d1, d2)
                    state.hasRolledThisTurn = True
                    steps = d1 + d2
                    old_pos = p.position
                    target_pos = (old_pos + steps) % 40
                    if target_pos < old_pos:
                        p.balance += 200
                        state.logs.insert(0, create_log(f"{p.name} passed START and collected ◈200 surplus.", "system"))
                    p.position = target_pos
                    state.logs.insert(0, create_log(f"{p.name} auto-rolled [{d1}, {d2}] and landed on {state.tiles[target_pos].name}.", "roll"))
                    state = resolve_tile_landing(state, active_idx, target_pos, steps)
            
            # 2. Check if player landed on buyable property -> put on auction
            tile = state.tiles[p.position]
            is_unowned_property = tile.type in ["PROPERTY", "RAIL", "UTILITY"] and not tile.ownerId
            
            if is_unowned_property:
                # Trigger auction
                state = trigger_auction(state, tile.index)
                state.auction.timer = state.auctionTimerLimit
                await manager.save_room(room_id, state)
                await sio.emit("ROOM_STATE_UPDATED", state.model_dump(), room=room_id)
                # Launch auction timer task
                asyncio.create_task(run_auction_timer(room_id))
            else:
                # Resolve drawn card if any
                if state.drawnCard:
                    card_id = state.drawnCard.card.id
                    state, log_msg = apply_card_action(state, card_id, active_idx)
                    state.logs.insert(0, create_log(log_msg, "card"))
                    state.drawnCard = None
                
                # Transition turn to next player
                next_idx = (active_idx + 1) % len(state.players)
                while state.players[next_idx].isBankrupt:
                    next_idx = (next_idx + 1) % len(state.players)
                    
                state.activePlayerIndex = next_idx
                state.hasRolledThisTurn = False
                state.turnTimer = state.turnTimerLimit
                state.drawnCard = None
                state.logs.insert(0, create_log(f"--- Turn auto-transitioned due to timeout to {state.players[next_idx].name} ---"))
                await manager.save_room(room_id, state)
                await sio.emit("ROOM_STATE_UPDATED", state.model_dump(), room=room_id)
                asyncio.create_task(run_bot_loop(room_id))
        else:
            await manager.save_room(room_id, state)
            await sio.emit("ROOM_STATE_UPDATED", state.model_dump(), room=room_id)

# Async stale room cleanup (runs every hour, deletes games > 24 hours old)
async def run_stale_rooms_cleanup():
    while True:
        try:
            await asyncio.sleep(3600)  # Check every hour
            await manager.cleanup_old_rooms()
        except asyncio.CancelledError:
            break
        except Exception as e:
            pass
