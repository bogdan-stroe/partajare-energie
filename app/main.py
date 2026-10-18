from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, RedirectResponse

from app.database import engine, Base, SessionLocal
from app.seed_data import seed_initial_data
from app.routers import communities

# Static directory path
STATIC_DIR = Path(__file__).resolve().parent.parent / "static"


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: ensure tables exist and seed demo data if empty
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        seed_initial_data(db, force=False)
    yield


app = FastAPI(
    title="⚡ Partajare Energie — Comunități de Energie Regenerabilă (CER)",
    description="Platformă pentru gestionarea comunităților de energie, evidența stadiului la ANRE, încărcarea curbelor lunare și rularea algoritmilor de partajare a energiei.",
    version="2.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers (focused strictly on energy communities & sharing)
app.include_router(communities.router)


@app.get("/api/distribution-zones", tags=["Zone de Distribuție"])
def get_distribution_zones():
    from app.models import DISTRIBUTION_ZONES
    return DISTRIBUTION_ZONES


@app.get("/api/health", tags=["Sistem"])
def health_check():
    return {
        "status": "online",
        "service": "partajare-energie-comunitati",
        "version": "2.0.0",
        "developer": "Cooperativa de Energie",
        "funder": "Uniunea Europeană prin programul LIFE COMET",
        "license": "Apache-2.0",
        "docs": "/docs"
    }


@app.get("/api/license", tags=["Sistem"])
def get_license():
    license_path = Path(__file__).resolve().parent.parent / "LICENSE"
    license_text = ""
    if license_path.exists():
        license_text = license_path.read_text(encoding="utf-8")
    return {
        "license": "Apache License 2.0",
        "spdx_id": "Apache-2.0",
        "developer": "Cooperativa de Energie",
        "developer_url": "https://cooperativadeenergie.ro",
        "funder": "Uniunea Europeană prin programul LIFE COMET",
        "funder_url": "https://lifecomet.rescoop.eu/",
        "project_url": "https://lifecomet.rescoop.eu/",
        "program": "LIFE COMET (Community Energy Transition)",
        "year": 2026,
        "license_url": "https://www.apache.org/licenses/LICENSE-2.0",
        "text": license_text
    }


# Ensure static directory exists
STATIC_DIR.mkdir(parents=True, exist_ok=True)

# Mount static files (css, js, assets)
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")


@app.get("/", include_in_schema=False)
def serve_index():
    index_file = STATIC_DIR / "index.html"
    if index_file.exists():
        return FileResponse(str(index_file))
    return {"message": "Interfața web este în curs de încărcare. Accesați /docs pentru documentația API."}


@app.get("/license", include_in_schema=False)
def serve_license():
    license_file = STATIC_DIR / "license.html"
    if license_file.exists():
        return FileResponse(str(license_file))
    return RedirectResponse(url="/")

