# back/config.py
import os
from dotenv import load_dotenv

# .flaskenv dosyasını açıkça yükle
# __file__, içinde bulunduğu config.py dosyasının yoludur.
# os.path.dirname(__file__) ile config.py'nin bulunduğu dizini alırız (yani 'back' klasörü).
# Sonra bu dizindeki '.flaskenv' dosyasını belirtiriz.
load_dotenv(os.path.join(os.path.dirname(__file__), '.flaskenv')) # <-- BU SATIRI DÜZELTİN!

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
    
    DB_USER = os.getenv('DB_USER')
    DB_PASSWORD = os.getenv('DB_PASSWORD')
    DB_SERVER = os.getenv('DB_SERVER')
    DB_PORT = os.getenv('DB_PORT') # Bu artık .flaskenv'den doğru değeri alacak
    DB_NAME = os.getenv('DB_NAME')
    
    SQLALCHEMY_DATABASE_URI = (
        f"mssql+pyodbc://{DB_USER}:{DB_PASSWORD}@{DB_SERVER}:{DB_PORT}/{DB_NAME}?"
        "driver=ODBC+Driver+17+for+SQL+Server"
    )

config_by_name = {
    'development': Dotenv,
    'default': Dotenv,
    'testing': Dotenv
}