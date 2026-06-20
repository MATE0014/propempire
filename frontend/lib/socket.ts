import { io } from "socket.io-client";

// Resolve connection details depending on environment
const getSocketConfig = () => {
  if (typeof window === "undefined") {
    // Safe fallback for SSR build-time execution
    return {
      url: "http://localhost:8000",
      path: "/socket.io"
    };
  }

  // 1. If an environment variable is explicitly provided, prioritize it
  if (process.env.NEXT_PUBLIC_SOCKET_SERVER_URL) {
    return {
      url: process.env.NEXT_PUBLIC_SOCKET_SERVER_URL,
      path: "/socket.io"
    };
  }

  // 2. Local development fallback
  if (window.location.hostname === "localhost") {
    return {
      url: "http://localhost:8000",
      path: "/socket.io"
    };
  }

  // 3. Deployed monorepo fallback (if hosted on a platform proxying /_/backend)
  return {
    url: window.location.origin,
    path: "/_/backend/socket.io"
  };
};

const config = getSocketConfig();

export const socket = io(config.url, {
  autoConnect: false,
  transports: ["websocket", "polling"],
  path: config.path,
});


