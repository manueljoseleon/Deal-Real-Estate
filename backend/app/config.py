from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Supabase / PostgreSQL
    database_url: str = ""          # postgresql://user:pass@host:5432/dbname

    # App
    app_title: str = "Deal Real Estate API"
    app_version: str = "0.1.0"
    debug: bool = False

    # Admin auth — set ADMIN_API_KEY in Railway; empty string disables protection (dev only)
    admin_api_key: str = ""

    # CORS — JSON array in env var: CORS_ORIGINS=["https://your-app.vercel.app"]
    # Multiple origins: ["https://app.vercel.app","https://custom-domain.com"]
    # Empty string or missing var → falls back to localhost
    cors_origins: list[str] = ["http://localhost:3000"]

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, v: object) -> object:
        if isinstance(v, str):
            v = v.strip()
            if not v:
                return ["http://localhost:3000"]
        return v

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
