import asyncio
import logging
import time
from typing import Dict, Optional, List
from app.models import GameState, Player
from app.game_rules import get_initial_tiles, create_log
from app.database import rooms_collection

logger = logging.getLogger("uvicorn.error")

class RoomManager:
    def __init__(self):
        self.rooms: Dict[str, GameState] = {}
        self.lock = asyncio.Lock()

    async def _get_room_unlocked(self, room_id: str) -> Optional[GameState]:
        if rooms_collection is not None:
            try:
                doc = await rooms_collection.find_one({"_id": room_id})
                if doc:
                    return GameState.model_validate(doc)
            except Exception as e:
                logger.error(f"Error fetching room {room_id} from MongoDB: {e}")
            return None
        else:
            return self.rooms.get(room_id)

    async def _save_room_unlocked(self, room_id: str, state: GameState):
        if rooms_collection is not None:
            try:
                state_dict = state.model_dump()
                state_dict["_id"] = room_id
                await rooms_collection.replace_one({"_id": room_id}, state_dict, upsert=True)
            except Exception as e:
                logger.error(f"Error saving room {room_id} to MongoDB: {e}")
        else:
            self.rooms[room_id] = state

    async def save_room(self, room_id: str, state: GameState):
        async with self.lock:
            await self._save_room_unlocked(room_id, state)

    async def create_room(self, room_id: str, host: Player) -> GameState:
        async with self.lock:
            state = GameState(
                roomId=room_id,
                players=[host],
                tiles=get_initial_tiles(),
                activePlayerIndex=0,
                dice=(1, 1),
                hasRolledThisTurn=False,
                selectedTileIndex=0,
                logs=[create_log("Lobby boardroom initialised. Waiting for shareholders.")],
                status="LOBBY"
            )
            await self._save_room_unlocked(room_id, state)
            return state

    async def join_room(self, room_id: str, player: Player) -> Optional[GameState]:
        async with self.lock:
            state = await self._get_room_unlocked(room_id)
            if not state:
                return None
            
            # Check if player already exists
            existing = next((p for p in state.players if p.id == player.id), None)
            if existing:
                existing.isOnline = True
            else:
                if state.status != "LOBBY":
                    return None  # Cannot join active game
                if len(state.players) >= (state.maxPlayers or 8):
                    return None  # Full
                state.players.append(player)
                
            state.logs.insert(0, create_log(f"{player.name} connected to boardroom."))
            await self._save_room_unlocked(room_id, state)
            return state

    async def get_room(self, room_id: str) -> Optional[GameState]:
        async with self.lock:
            return await self._get_room_unlocked(room_id)

    async def leave_room(self, room_id: str, player_id: str) -> Optional[GameState]:
        async with self.lock:
            state = await self._get_room_unlocked(room_id)
            if not state:
                return None
            
            player = next((p for p in state.players if p.id == player_id), None)
            if player:
                if state.status == "LOBBY":
                    # Remove completely if in lobby
                    state.players = [p for p in state.players if p.id != player_id]
                    state.logs.insert(0, create_log(f"{player.name} left lobby."))
                else:
                    # Set offline flag if in playing state
                    player.isOnline = False
                    state.logs.insert(0, create_log(f"{player.name} disconnected (portfolio active)."))
            
            # Delete room if empty
            active_humans = [p for p in state.players if not p.isBot and p.isOnline]
            if not active_humans:
                if rooms_collection is not None:
                    try:
                        await rooms_collection.delete_one({"_id": room_id})
                    except Exception as e:
                        logger.error(f"Error deleting room {room_id} from MongoDB: {e}")
                elif room_id in self.rooms:
                    del self.rooms[room_id]
                return None
                
            await self._save_room_unlocked(room_id, state)
            return state

    async def fill_with_bots(self, room_id: str, target_count: int = 4) -> Optional[GameState]:
        async with self.lock:
            state = await self._get_room_unlocked(room_id)
            if not state:
                return None
            
            current_count = len(state.players)
            if current_count >= target_count:
                return state
                
            bot_names = ["Alex (AI)", "Sarah (AI)", "Ryan (AI)", "Emma (AI)", "James (AI)", "Olivia (AI)", "Lucas (AI)"]
            avatars = ["🤖", "🤖", "🤖", "🤖", "🤖", "🤖", "🤖"]
            tokens = ["Ship", "Cat", "Dog", "Duck", "Top Hat", "Car", "Crown"]
            colors = ["indigo", "rose", "cyan", "emerald", "amber", "slate", "pink"]
            
            for i in range(current_count, target_count):
                bot_idx = i - current_count
                bot_player = Player(
                    id=f"bot_{i}",
                    name=bot_names[bot_idx] if bot_idx < len(bot_names) else f"AI Bot {i}",
                    avatar=avatars[bot_idx] if bot_idx < len(avatars) else "🤖",
                    token=tokens[bot_idx] if bot_idx < len(tokens) else "Car",
                    balance=1500,
                    position=0,
                    ownedProperties=[],
                    escapeCardsCount=0,
                    inDetention=False,
                    detentionTurns=0,
                    isBankrupt=False,
                    isBot=True,
                    color=colors[bot_idx] if bot_idx < len(colors) else "slate",
                    isOnline=True
                )
                state.players.append(bot_player)
                state.logs.insert(0, create_log(f"AI Shareholder {bot_player.name} provisioned."))
            
            await self._save_room_unlocked(room_id, state)
            return state

    async def delete_room(self, room_id: str):
        async with self.lock:
            if rooms_collection is not None:
                try:
                    await rooms_collection.delete_one({"_id": room_id})
                except Exception as e:
                    logger.error(f"Error deleting room {room_id} from MongoDB: {e}")
            elif room_id in self.rooms:
                del self.rooms[room_id]

    async def cleanup_old_rooms(self):
        async with self.lock:
            now = time.time()
            cutoff = now - 24 * 3600
            if rooms_collection is not None:
                try:
                    res = await rooms_collection.delete_many({"createdAt": {"$lt": cutoff}})
                    if res.deleted_count > 0:
                        logger.info(f"Stale database cleanup: removed {res.deleted_count} rooms older than 24 hours.")
                except Exception as e:
                    logger.error(f"Error in staleness db cleanup: {e}")
            else:
                to_del = [r_id for r_id, state in self.rooms.items() if getattr(state, "createdAt", 0) < cutoff]
                for r_id in to_del:
                    del self.rooms[r_id]
                    logger.info(f"Stale memory cleanup: removed room {r_id} older than 24 hours.")
