"""Runtime configuration loaded from env vars."""
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    gvm_socket: str = "/run/gvmd/gvmd.sock"
    gvm_user: str = "admin"
    gvm_password: str = "admin"
    app_secret: str = "change-me"
    cors_origins: list[str] = ["http://localhost:3000", "http://localhost:5173"]

    # Ollama LLM integration for AI remediation guidance
    ollama_url: str = "http://ollama:11434"
    ollama_model: str = "llama3.2:3b"
    ollama_enabled: bool = True
    ollama_timeout_seconds: int = 180

    # Email notifications (Gmail SMTP)
    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_email: str = ""
    smtp_password: str = ""

    class Config:
        env_file = ".env"
        env_prefix = ""


settings = Settings()
