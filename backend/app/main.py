import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.starlette import StarletteIntegration
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import (
    positions, moves, progress, auth, profiles,
    clubs, board, chains, graph, dashboard,
    curricula, comp_ready, athlete_overview
)

# ── Sentry ────────────────────────────────────────────────────────────────────
_sentry_dsn = os.environ.get("SENTRY_DSN")
if _sentry_dsn:
    sentry_sdk.init(
        dsn=_sentry_dsn,
        integrations=[
            StarletteIntegration(),
            FastApiIntegration(),
        ],
        # Capture 100% of transactions — adjust down once traffic is real
        traces_sample_rate=1.0,
        # Attach request data to every event — method, URL, headers, body
        send_default_pii=False,
    )

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
app.include_router(positions.router,        prefix="/positions",  tags=["positions"])
app.include_router(moves.router,            prefix="/moves",      tags=["moves"])
app.include_router(progress.router,         prefix="/progress",   tags=["progress"])
app.include_router(auth.router,             prefix="/auth",       tags=["auth"])
app.include_router(profiles.router,         prefix="/profiles",   tags=["profiles"])
app.include_router(clubs.router,            prefix="/clubs",      tags=["clubs"])
app.include_router(board.router,            prefix="/board",      tags=["board"])
app.include_router(chains.router,           prefix="/chains",     tags=["chains"])
app.include_router(graph.router,            prefix="/graph",      tags=["graph"])
app.include_router(dashboard.router,        prefix="/dashboard",  tags=["dashboard"])
app.include_router(curricula.router,        prefix="/curricula",  tags=["curricula"])
app.include_router(comp_ready.router,       prefix="/comp-ready", tags=["comp_ready"])
app.include_router(athlete_overview.router, prefix="/athletes",   tags=["athletes"])

# ── Health ────────────────────────────────────────────────────────────────────
@app.get("/")
def health():
    return {"status": "ok"}