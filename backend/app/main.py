import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from backend/.env relative to main.py
env_path = Path(__file__).resolve().parent.parent / '.env'
load_dotenv(dotenv_path=env_path)

import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import socketio
from app.socket_handlers import sio

@asynccontextmanager
async def lifespan(app: FastAPI):
    from app.socket_handlers import run_stale_rooms_cleanup
    cleanup_task = asyncio.create_task(run_stale_rooms_cleanup())
    yield
    cleanup_task.cancel()
    try:
        await cleanup_task
    except asyncio.CancelledError:
        pass

fastapi_app = FastAPI(
    title="PropEmpire Backend Server",
    description="Real-time Socket.IO multiplayer backend for PropEmpire strategy board game.",
    version="1.0.0",
    lifespan=lifespan
)

# Configure FastAPI CORS
fastapi_app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@fastapi_app.get("/")
def read_root():
    return {
        "status": "online",
        "service": "PropEmpire Backend Server",
        "engine": "FastAPI + Socket.IO (python-socketio)"
    }

@fastapi_app.get("/health")
def health_check():
    return {"status": "healthy"}

# Wraps FastAPI with Socket.IO ASGI application wrapper and exports it as 'app'
app = socketio.ASGIApp(sio, other_asgi_app=fastapi_app)
