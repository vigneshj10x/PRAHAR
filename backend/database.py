"""
backend/database.py

Database connection and session factory for THERMO-SHIELD.
Uses SQLAlchemy ORM configured for SQLite by default, engineered for
seamless production upgrade to PostgreSQL via DATABASE_URL environment variable.
"""

import os
from pathlib import Path
from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker, Session

# Base directory
BACKEND_DIR = Path(__file__).resolve().parent
DB_FILE_PATH = BACKEND_DIR / "thermo_shield.db"

# Database URL: defaults to local SQLite, upgradeable to PostgreSQL via env var:
# Example: DATABASE_URL="postgresql://user:password@localhost:5432/thermo_shield"
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{DB_FILE_PATH}")

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    echo=False,
    pool_pre_ping=True
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    """FastAPI Dependency for database session lifecycle."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Initializes database tables."""
    import backend.models  # Ensure models are registered
    Base.metadata.create_all(bind=engine)
