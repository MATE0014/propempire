# 👑 PropEmpire

PropEmpire is a high-fidelity, real-time multiplayer real-estate board game (Monopoly clone) built for the web. Dominate the board, negotiate deals, participate in live public auctions, and force your competitors into bankruptcy!

---

## 🏗️ Project Architecture

PropEmpire is organized as a monorepo containing a Python-based backend and a Next.js-based frontend:

```text
propempire/
├── backend/                  # FastAPI + Socket.IO Server
│   ├── app/
│   │   ├── database.py       # MongoDB client configuration
│   │   ├── game_rules.py     # Core game logic rules
│   │   ├── main.py           # FastAPI server entrypoint
│   │   ├── models.py         # Pydantic schemas and game state structures
│   │   ├── room_manager.py   # Lobby and active game state manager
│   │   └── socket_handlers.py# Real-time WebSocket connection handlers
│   ├── .env                  # Backend credentials configuration
│   └── requirements.txt      # Python dependencies
│
└── frontend/                 # Next.js Client Application
    ├── app/                  # Next.js App Router (pages & layouts)
    ├── components/           # Modular game components (board, lobby, UI)
    ├── lib/                  # Frontend state engine and socket connection
    ├── public/               # Static assets & game brand logos
    └── package.json          # Node dependencies and scripts
```

---

## ⚡ Tech Stack

### Backend
* **Web Framework:** [FastAPI](https://fastapi.tiangolo.com/) for high performance, standard routing, and ASGI integration.
* **Real-time Communication:** [python-socketio](https://python-socketio.readthedocs.io/) for bidirectionally synced room events.
* **Database Driver:** [Motor (MongoDB)](https://motor.readthedocs.io/) for async document persistence.
* **Data Serialization:** [Pydantic v2](https://docs.pydantic.dev/) for data validation and schema definitions.

### Frontend
* **UI Framework:** [Next.js](https://nextjs.org/) (React 19) featuring the App Router.
* **Styling:** Vanilla CSS & Tailwind CSS for modern glassmorphism design.
* **WebSockets:** [Socket.IO Client](https://socket.io/docs/v4/client-api/) for real-time board sync.
* **Icons:** [Lucide React](https://lucide.dev/) for dashboard and panel navigation symbols.

---

## 🎮 Core Features

* **Real-Time Board Sync:** Real-time gameplay synchronization supporting up to 8 players per room.
* **Interactive Player Actions:** Rolling dice, property acquisitions, house/hotel construction, rent payments, mortgages, and detention release processes.
* **Public Auctions:** Landed properties declined by players instantly trigger a 15-second public bidding room for all active shareholders.
* **Asset Trading:** Propose complex multi-asset trading offers (properties, cash, escape cards) with peers.
* **AI Players (Bots):** Provision smart, automated AI shareholders to fill lobby voids and play full games.
* **Graceful Fallbacks:** Seamless backend transition to local in-memory state tracking if a MongoDB instance is unavailable.

---

## 🛠️ Getting Started

### Prerequisites
Make sure you have the following installed on your local environment:
* **Node.js** (v18.0 or higher)
* **Python** (v3.10 or higher)
* **MongoDB** (optional, fallback to in-memory available)

---

### Step 1: Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment:
   ```bash
   python -m venv .venv
   # On Windows (PowerShell)
   .\.venv\Scripts\Activate.ps1
   # On macOS/Linux
   source .venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Configure environment variables in `.env`:
   ```env
   MONGODB_URI=mongodb+srv://... (or leave blank for in-memory mode)
   ```
5. Launch the backend development server:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```

---

### Step 2: Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd ../frontend
   ```
2. Install npm dependencies:
   ```bash
   npm install
   ```
3. Launch the Next.js development server:
   ```bash
   npm run dev
   ```
4. Access the game by opening [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🏛️ Game Rules

For details on the rules of the board game (buying, districts, utilities, card draws, auctions, trading, etc.), navigate to the **Rules** tab in the game dashboard or check out the [Rules Definitions file](file:///x:/My_Workspace/propempire/frontend/lib/rules-data.ts).
