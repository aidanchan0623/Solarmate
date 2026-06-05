from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import models
from database import Base, engine
from routers import admin, auth, consumer, grid_intelligence, meter, prosumer, wallet
from schema_migrations import ensure_sqlite_schema

Base.metadata.create_all(bind=engine)
ensure_sqlite_schema(engine)

app = FastAPI(title="SolarMate API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(prosumer.router, prefix="/api/prosumer", tags=["prosumer"])
app.include_router(consumer.router, prefix="/api/consumer", tags=["consumer"])
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])
app.include_router(grid_intelligence.router, prefix="/api/admin", tags=["admin"])
app.include_router(meter.router, prefix="/api/meter", tags=["meter"])
app.include_router(meter.esp_router, prefix="/api/esp", tags=["esp"])
app.include_router(wallet.router, prefix="/api/wallet", tags=["wallet"])


@app.get("/api/health")
def health_check():
    return {"status": "ok"}
