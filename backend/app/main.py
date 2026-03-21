from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import positions, moves, progress, auth

app = FastAPI(title="Matboard API")

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://matboard.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(positions.router, prefix="/positions", tags=["positions"])
app.include_router(moves.router, prefix="/moves", tags=["moves"])
app.include_router(progress.router, prefix="/progress", tags=["progress"])
app.include_router(auth.router, prefix="/auth", tags=["auth"])

# ── Health ────────────────────────────────────────────────────────────────────
@app.get("/")
def health():
    return {"status": "ok"}