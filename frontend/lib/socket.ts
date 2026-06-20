import { io } from "socket.io-client";

// Connect to FastAPI socket.io server at port 8000
const SOCKET_SERVER_URL = process.env.NEXT_PUBLIC_SOCKET_SERVER_URL || "http://localhost:8000";

export const socket = io(SOCKET_SERVER_URL, {
  autoConnect: false,
  transports: ["websocket", "polling"],
});
