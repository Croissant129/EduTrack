# backend/config.py

class Config:
    SECRET_KEY = 'your-secret-key'  # ganti dengan secret key yang kuat
    SQLALCHEMY_DATABASE_URI = 'sqlite:///learning_manager.db'
    SQLALCHEMY_TRACK_MODIFICATIONS = False