import { io } from "socket.io-client";

// Guard for SSR build time and dynamic resolution for client runtime
const isBrowser = typeof window !== "undefined";
const isProduction = isBrowser && window.location.hostname !== "localhost";

const SOCKET_SERVER_URL = isProduction
  ? window.location.origin
  : (process.env.NEXT_PUBLIC_SOCKET_SERVER_URL || "http://localhost:8000");

const SOCKET_PATH = isProduction
  ? "/_/backend/socket.io"
  : "/socket.io";

export const socket = io(SOCKET_SERVER_URL, {
  autoConnect: false,
  transports: ["websocket", "polling"],
  path: SOCKET_PATH,
});

