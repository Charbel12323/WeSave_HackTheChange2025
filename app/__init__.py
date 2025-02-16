# app/__init__.py
from flask import Flask
from .config import Config

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # Register blueprints
    from app.routes.chat import chat_bp
    app.register_blueprint(chat_bp, url_prefix="/api")

    return app
