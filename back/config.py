import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    """Base configuration."""
    SECRET_KEY = os.getenv("SECRET_KEY", "a_default_secret_key")
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", SECRET_KEY)
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ECHO = False

class Dotenv(Config):
    """Development configuration."""
    DEBUG = True
    SQLALCHEMY_ECHO = True

    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL")

config_by_name = {
    'development': Dotenv,
    'default': Dotenv,
    'testing': Dotenv
}
