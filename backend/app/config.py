from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Supabase / PostgreSQL
    database_url: str = ""          # postgresql://user:pass@host:5432/dbname

    # App
    app_title: str = "Deal Real Estate API"
    app_version: str = "0.1.0"
    debug: bool = False

    # CORS — comma-separated list of allowed origins
    # In production set via env var: CORS_ORIGINS=https://your-app.vercel.app
    cors_origins: list[str] = ["http://localhost:3000"]

    # Scraping
    default_communes: list[str] = [
        "Providencia",
        "Las Condes",
        "Ñuñoa",
        "Santiago",
        "Vitacura",
        "San Miguel",
        "Maipú",
        # nuevas comunas RM
        "La Reina",
        "Peñalolén",
        "Macul",
        "Independencia",
        "Recoleta",
        "Huechuraba",
        "Lo Barnechea",
        "La Florida",
        "Puente Alto",
        "Estación Central",
    ]
    scraper_request_delay_min: float = 1.0   # seconds between requests (min)
    scraper_request_delay_max: float = 3.0   # seconds between requests (max)

    # Deduplication
    phash_hamming_threshold: int = 10        # max bit diff to consider images the same
    geo_dedup_radius_m: float = 150.0        # meters radius for geo candidate search

    # BTL Matching
    matching_min_comps: int = 3              # minimum comps before relaxing tier


settings = Settings()
