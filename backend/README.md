# ⚙️ PropEmpire Backend Server

This is the Python-based backend server for the **PropEmpire** board game. It uses FastAPI for standard ASGI routing and uvicorn as the HTTP/WebSocket execution engine. Real-time gameplay events and rooms are coordinated through Socket.IO.

---

## 📂 Directory Structure

```text
backend/
├── app/
│   ├── database.py         # MongoDB connections via Motor (falls back to local cache)
│   ├── game_rules.py       # Game state calculations, rent logic, trades, and board indices
│   ├── main.py             # ASGI wrapper exporting socketio.ASGIApp
│   ├── models.py           # Pydantic schema models representing the full GameState
│   ├── room_manager.py     # Multi-room lobby state transitions and bot insertion
│   └── socket_handlers.py  # Socket.IO endpoints handling roll, buy, trade, and auction actions
│
├── .env                    # MongoDB connections and environment configs
└── requirements.txt        # Python dependency manifest
```

---

## 🛠️ Getting Started

### Installation

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate your python virtual environment:
   ```bash
   python -m venv .venv
   # Windows (PowerShell)
   .\.venv\Scripts\Activate.ps1
   # macOS/Linux
   source .venv/bin/activate
   ```
3. Install the dependencies listed in `requirements.txt`:
   ```bash
   pip install -r requirements.txt
   ```

### Running the Server

Run the uvicorn development server:
```bash
uvicorn app.main:app --reload --port 8000
```
This runs the API server locally at `http://localhost:8000`. You can verify its status via:
* **Base status endpoint:** `http://localhost:8000/`
* **Health check:** `http://localhost:8000/health`

---

## 💾 State Persistence (MongoDB vs. Memory)

The backend provides a flexible persistence layer:
1. **MongoDB mode:** If `MONGODB_URI` is provided in `.env`, game rooms are saved and fetched dynamically using [Motor (async MongoDB)](https://motor.readthedocs.io/).
2. **In-Memory fallback:** If the database is missing or fails to connect, the server defaults to an in-memory dictionaries cache inside the `RoomManager`.

### Environment Configuration (`.env`)
Create a `.env` file in the root of the `backend/` directory:
```env
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/propempire?retryWrites=true&w=majority
```

---

## 🤖 AI Shareholder Bots

To facilitate solo playing and test match logic, the backend supports injecting bot players:
* Automated trade evaluations
* Quick bidding logic for properties in the Auction state
* Sequential turn execution when an AI player is active
* Controlled via `fill_with_bots()` in [room_manager.py](file:///x:/My_Workspace/propempire/backend/app/room_manager.py)
