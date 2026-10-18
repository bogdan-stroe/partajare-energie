from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# Database file location in the project root
BASE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = BASE_DIR / "partajare_energie.db"
DATABASE_URL = f"sqlite:///{DB_PATH}"

# For SQLite, check_same_thread=False is needed for multi-threaded FastAPI workers
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """Dependency that provides a database session and ensures proper closure."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
