from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import admin, auth, habits, occurrences, profile, stats, telegram_webhook

app = FastAPI(title="ScheduleApp API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_base_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(profile.router)
app.include_router(telegram_webhook.router)
app.include_router(habits.router)
app.include_router(occurrences.router)
app.include_router(stats.router)


@app.get("/api/health")
def health():
    return {"ok": True}
