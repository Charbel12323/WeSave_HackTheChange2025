# app/config.py
import os

class Config:
    DEBUG = os.getenv("DEBUG", "False") == "True"
    GEMINI_API_URL = os.getenv("GEMINI_API_URL", "https://api.gemini.example.com/v1/inference")
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "AIzaSyBdqML06gjY9v1EznHEJ-iqaTQk5tEXpPI")
