# 🖥️ PropEmpire Frontend Client

This is the Next.js client application for the **PropEmpire** multiplayer real-estate board game. It connects to the FastAPI backend via Socket.IO to deliver real-time, smooth gameplay.

---

## 📂 Directory Structure

The key directories and components in the frontend are organized as follows:

```text
frontend/
├── app/
│   ├── game/               # Gameplay boards, player HUDs, and panels
│   ├── lobby/              # Game room lobby and settings
│   ├── rules/              # Interactive board game rules view
│   ├── globals.css         # Custom animations, layout styling, and design system
│   ├── layout.tsx          # App context providers and font initialization
│   └── page.tsx            # Host or Join entry landing page
│
├── components/
│   ├── game/               # Grid board, trade modals, cards, HUD modules
│   │   ├── Board.tsx       # 40-space Monopoly-style board grid rendering
│   │   ├── GameContext.tsx # Client-side game engine wrapper and socket hook
│   │   └── TradeModal.tsx  # Interactive trading interface
│   ├── ui/                 # Shadcn/Radix customizable primitives
│   └── Navbar.tsx          # Consistent top-bar navigation
│
└── lib/
    ├── game-engine.ts      # Client-side validation, utilities, and helper methods
    ├── rules-data.ts       # Structured documentation of the game rules
    └── socket.ts           # Socket.IO connection client setup
```

---

## 🛠️ Getting Started

### Installation
Run the following command inside the `frontend/` directory to install dependencies:
```bash
npm install
```

### Development Server
Run the local next server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### Build and Deployment
Build the production application bundle:
```bash
npm run build
```
Run the production build server locally:
```bash
npm run start
```

---

## 🎨 Design System

PropEmpire uses a tailored glassmorphism design system to give the interface a premium, modern feel:
* **Background:** Dark mode first theme (`#0F1115` - Charcoal)
* **Accents:** Luxurious metallic gradients, primary buttons leverage high-fidelity gold/amber tones.
* **Animations:** Pulse glows, custom fade-ins, and dice-roll actions for micro-interaction polish.
* **Typography:** Premium modern font layout configurations defined in `app/layout.tsx`.

---

## 🔗 Connection Configuration

The client connects to the backend Socket.IO server at port `8000` by default. To point to a production/alternative instance, configure your environment variables:

```env
NEXT_PUBLIC_SOCKET_SERVER_URL=http://your-backend-host:8000
```
See [socket.ts](file:///x:/My_Workspace/propempire/frontend/lib/socket.ts) for implementation details.
