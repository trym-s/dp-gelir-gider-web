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
    
    #DB_USER = os.getenv('DB_USER')
    #DB_PASSWORD = os.getenv('DB_PASSWORD')
    DB_SERVER = os.getenv('DB_SERVER', 'localhost')
    DB_PORT = os.getenv('DB_PORT', '1433')
    DB_NAME = os.getenv('DB_NAME')
    
    SQLALCHEMY_DATABASE_URI = (
        f"mssql+pyodbc://{DB_SERVER}:{DB_PORT}/{DB_NAME}?"
        "driver=ODBC+Driver+17+for+SQL+Server&Trusted_Connection=yes"
    )


config_by_name = {
    'development': Dotenv,
    'default': Dotenv,
    'testing': Dotenv
}


