from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import positions, moves, progress, auth, profiles, clubs, board, chains, graph, dashboard

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
app.include_router(moves.router,     prefix="/moves",     tags=["moves"])
app.include_router(progress.router,  prefix="/progress",  tags=["progress"])
app.include_router(auth.router,      prefix="/auth",      tags=["auth"])
app.include_router(profiles.router,  prefix="/profiles",  tags=["profiles"])
app.include_router(clubs.router,     prefix="/clubs",     tags=["clubs"])
app.include_router(board.router,     prefix="/board",     tags=["board"])
app.include_router(chains.router,    prefix="/chains",    tags=["chains"])
app.include_router(graph.router,     prefix="/graph", tags=["graph"])
app.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])


# ── Health ────────────────────────────────────────────────────────────────────
@app.get("/")
def health():
    return {"status": "ok"}
