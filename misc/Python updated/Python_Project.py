# Modular Python Web Project - Starter Kit

## Project Structure
```
project/
├── config.py          # Settings
├── database.py        # Database connections
├── models.py          # Data models
├── services.py        # Business logic
├── utils.py           # Helper functions
├── api.py            # API routes
├── main.py           # Startup
└── requirements.txt  # Dependencies
```

## requirements.txt
```
Flask==3.0.0
Flask-CORS==4.0.0
SQLAlchemy==2.0.23
PyJWT==2.8.0
Werkzeug==3.0.1
python-dotenv==1.0.0
```

## config.py
```python
import os
from dataclasses import dataclass
from typing import Optional
from enum import Enum
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class Environment(Enum):
    DEVELOPMENT = "development"
    TEST = "test"  
    PRODUCTION = "production"

@dataclass
class Settings:
    """Project settings"""
    
    # Basic settings
    app_name: str = "MyProject"
    version: str = "1.0.0"
    environment: Environment = Environment.DEVELOPMENT
    debug: bool = True
    
    # Server
    host: str = "127.0.0.1"
    port: int = 5000
    
    # Database
    database_url: str = "sqlite:///project.db"
    
    # Secrets
    secret_key: str = os.getenv("SECRET_KEY", "CHANGE-THIS-IN-PRODUCTION")
    jwt_key: str = os.getenv("JWT_KEY", "CHANGE-JWT-KEY")
    
    # Limits
    max_requests_per_hour: int = 100
    max_file_size_mb: int = 10
    
    @classmethod
    def load_from_env(cls):
        """Load settings from environment variables"""
        env_str = os.getenv("ENVIRONMENT", "development")
        return cls(
            app_name=os.getenv("APP_NAME", "MyProject"),
            version=os.getenv("VERSION", "1.0.0"),
            environment=Environment(env_str),
            debug=os.getenv("DEBUG", "true").lower() == "true",
            host=os.getenv("HOST", "127.0.0.1"),
            port=int(os.getenv("PORT", "5000")),
            database_url=os.getenv("DATABASE_URL", "sqlite:///project.db"),
        )

# Global settings instance
settings = Settings.load_from_env()
```

## database.py
```python
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from contextlib import contextmanager
import logging
from config import settings

logger = logging.getLogger(__name__)
Base = declarative_base()

class DatabaseConnection:
    """Manages database connections"""
    
    def __init__(self, database_url: str = None):
        self.database_url = database_url or settings.database_url
        
        # SQLite specific parameter
        connect_args = {}
        if "sqlite" in self.database_url:
            connect_args = {"check_same_thread": False}
        
        self.engine = create_engine(
            self.database_url,
            connect_args=connect_args,
            echo=settings.debug
        )
        
        self.SessionLocal = sessionmaker(
            autocommit=False,
            autoflush=False,
            bind=self.engine
        )
    
    def create_tables(self):
        """Create database tables"""
        logger.info(f"Creating tables: {self.database_url}")
        Base.metadata.create_all(bind=self.engine)
    
    @contextmanager
    def get_session(self):
        """Context manager for database session"""
        session = self.SessionLocal()
        try:
            yield session
            session.commit()
        except Exception as e:
            session.rollback()
            logger.error(f"Database error: {e}")
            raise
        finally:
            session.close()

# Global instance
database = DatabaseConnection()
```

## models.py
```python
from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, ForeignKey
from sqlalchemy.orm import relationship, validates
from datetime import datetime
import re
from database import Base

class Timestamp:
    """Timestamp fields for all models"""
    created = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class User(Base, Timestamp):
    """User model"""
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    username = Column(String(100), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    
    first_name = Column(String(100))
    last_name = Column(String(100))
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    last_login = Column(DateTime)
    
    items = relationship("Item", back_populates="user", cascade="all, delete-orphan")
    
    @validates('email')
    def validate_email(self, key, email):
        pattern = r'^[\w\.-]+@[\w\.-]+\.\w+$'
        if not re.match(pattern, email):
            raise ValueError(f"Invalid email: {email}")
        return email.lower()
    
    def set_password(self, password: str):
        from werkzeug.security import generate_password_hash
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password: str) -> bool:
        from werkzeug.security import check_password_hash
        return check_password_hash(self.password_hash, password)
    
    def to_dict(self):
        return {
            "id": self.id,
            "email": self.email,
            "username": self.username,
            "first_name": self.first_name,
            "last_name": self.last_name,
            "is_active": self.is_active,
            "created": self.created.isoformat() if self.created else None,
        }

class Item(Base, Timestamp):
    """Example model for data"""
    __tablename__ = "items"
    
    id = Column(Integer, primary_key=True)
    title = Column(String(255), nullable=False)
    content = Column(Text)
    category = Column(String(100), default="general")
    status = Column(String(50), default="draft")
    
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    user = relationship("User", back_populates="items")
    
    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "content": self.content,
            "category": self.category,
            "status": self.status,
            "user_id": self.user_id,
            "created": self.created.isoformat() if self.created else None,
        }
```

## services.py
```python
from typing import List, Optional
from datetime import datetime
from sqlalchemy.orm import Session
import logging
from models import User, Item

logger = logging.getLogger(__name__)

class UserService:
    """User management"""
    
    def __init__(self, session: Session):
        self.session = session
    
    def create_user(self, email: str, username: str, password: str, **kwargs) -> User:
        # Check for duplicates
        if self.session.query(User).filter_by(email=email).first():
            raise ValueError(f"Email {email} is already in use")
        
        if self.session.query(User).filter_by(username=username).first():
            raise ValueError(f"Username {username} is already taken")
        
        user = User(email=email, username=username, **kwargs)
        user.set_password(password)
        self.session.add(user)
        return user
    
    def login(self, identifier: str, password: str) -> Optional[User]:
        user = self.session.query(User).filter(
            (User.email == identifier) | 
            (User.username == identifier)
        ).first()
        
        if not user or not user.check_password(password):
            return None
        
        if not user.is_active:
            return None
        
        user.last_login = datetime.utcnow()
        return user
    
    def get_user(self, user_id: int) -> Optional[User]:
        return self.session.query(User).filter_by(id=user_id).first()

class ItemService:
    """Item management"""
    
    def __init__(self, session: Session):
        self.session = session
    
    def create_item(self, user_id: int, title: str, **kwargs) -> Item:
        if len(title) < 3:
            raise ValueError("Title must be at least 3 characters")
        
        item = Item(user_id=user_id, title=title, **kwargs)
        self.session.add(item)
        return item
    
    def get_user_items(self, user_id: int) -> List[Item]:
        return self.session.query(Item).filter_by(user_id=user_id).all()
```

## utils.py
```python
import jwt
from functools import wraps
from flask import request, jsonify, g
from datetime import datetime, timedelta
from typing import Optional
import re
from config import settings

class TokenManager:
    """JWT token management"""
    
    @staticmethod
    def create_token(user_id: int, hours_valid: int = 24) -> str:
        payload = {
            'user_id': user_id,
            'exp': datetime.utcnow() + timedelta(hours=hours_valid),
            'iat': datetime.utcnow()
        }
        return jwt.encode(payload, settings.jwt_key, algorithm='HS256')
    
    @staticmethod
    def validate_token(token: str) -> Optional[int]:
        try:
            payload = jwt.decode(token, settings.jwt_key, algorithms=['HS256'])
            return payload.get('user_id')
        except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
            return None

def require_login(f):
    """Decorator that requires authentication"""
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get('Authorization', '')
        
        if not auth_header.startswith('Bearer '):
            return jsonify({"error": "Missing token"}), 401
        
        token = auth_header[7:]  # Remove "Bearer " prefix
        user_id = TokenManager.validate_token(token)
        
        if not user_id:
            return jsonify({"error": "Invalid token"}), 401
        
        g.user_id = user_id
        return f(*args, **kwargs)
    
    return decorated

class Validator:
    """Input validation"""
    
    @staticmethod
    def validate_email(email: str) -> bool:
        return bool(re.match(r'^[\w\.-]+@[\w\.-]+\.\w+$', email))
    
    @staticmethod
    def validate_password(password: str) -> tuple[bool, str]:
        if len(password) < 8:
            return False, "Password must be at least 8 characters"
        return True, "OK"
```

## api.py
```python
from flask import Flask, request, jsonify, g
from flask_cors import CORS
import logging
from database import database
from services import UserService, ItemService
from utils import TokenManager, Validator, require_login
from config import settings

def create_app():
    """Create Flask application"""
    
    app = Flask(__name__)
    app.config['SECRET_KEY'] = settings.secret_key
    CORS(app)
    
    # Logging
    if settings.debug:
        logging.basicConfig(
            level=logging.DEBUG,
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
    
    # === PUBLIC ROUTES ===
    
    @app.route('/')
    def home():
        return jsonify({
            "message": f"Welcome to {settings.app_name} API!",
            "version": settings.version
        })
    
    @app.route('/api/register', methods=['POST'])
    def register():
        try:
            data = request.get_json()
            
            # Validate
            if not all(k in data for k in ['email', 'username', 'password']):
                return jsonify({"error": "Missing fields"}), 400
            
            if not Validator.validate_email(data['email']):
                return jsonify({"error": "Invalid email"}), 400
            
            valid, message = Validator.validate_password(data['password'])
            if not valid:
                return jsonify({"error": message}), 400
            
            # Create user
            with database.get_session() as session:
                service = UserService(session)
                user = service.create_user(
                    email=data['email'],
                    username=data['username'],
                    password=data['password']
                )
                
                token = TokenManager.create_token(user.id)
                return jsonify({
                    "user": user.to_dict(),
                    "token": token
                }), 201
                
        except ValueError as e:
            return jsonify({"error": str(e)}), 400
        except Exception as e:
            return jsonify({"error": "Registration failed"}), 500
    
    @app.route('/api/login', methods=['POST'])
    def login():
        try:
            data = request.get_json()
            
            if not data or 'identifier' not in data or 'password' not in data:
                return jsonify({"error": "Identifier and password required"}), 400
            
            with database.get_session() as session:
                service = UserService(session)
                user = service.login(data['identifier'], data['password'])
                
                if not user:
                    return jsonify({"error": "Invalid credentials"}), 401
                
                token = TokenManager.create_token(user.id)
                return jsonify({
                    "user": user.to_dict(),
                    "token": token
                })
                
        except Exception:
            return jsonify({"error": "Login failed"}), 500
    
    # === PROTECTED ROUTES ===
    
    @app.route('/api/items', methods=['GET'])
    @require_login
    def get_items():
        try:
            with database.get_session() as session:
                service = ItemService(session)
                items = service.get_user_items(g.user_id)
                return jsonify([item.to_dict() for item in items])
        except Exception:
            return jsonify({"error": "Failed to fetch items"}), 500
    
    @app.route('/api/items', methods=['POST'])
    @require_login
    def create_item():
        try:
            data = request.get_json()
            
            if not data or 'title' not in data:
                return jsonify({"error": "Title required"}), 400
            
            with database.get_session() as session:
                service = ItemService(session)
                item = service.create_item(
                    user_id=g.user_id,
                    title=data['title'],
                    content=data.get('content', '')
                )
                return jsonify(item.to_dict()), 201
                
        except ValueError as e:
            return jsonify({"error": str(e)}), 400
        except Exception:
            return jsonify({"error": "Creation failed"}), 500
    
    return app
```

## main.py
```python
import os
import logging
from config import settings, Environment
from database import database
from api import create_app

def initialize_app():
    """Initialize database"""
    print(f"\nInitializing {settings.app_name}...")
    database.create_tables()
    print("Database ready!\n")

def main():
    """Main function"""
    
    # Initialize database if it doesn't exist
    db_file = settings.database_url.replace('sqlite:///', '')
    if not os.path.exists(db_file) and 'sqlite' in settings.database_url:
        initialize_app()
    
    # Create application
    app = create_app()
    
    print(f"\n{'='*50}")
    print(f"🚀 {settings.app_name} v{settings.version}")
    print(f"{'='*50}")
    print(f"Server: http://{settings.host}:{settings.port}")
    print(f"Environment: {settings.environment.value}")
    print(f"{'='*50}\n")
    
    # Start server
    app.run(
        host=settings.host,
        port=settings.port,
        debug=settings.debug
    )

if __name__ == "__main__":
    main()
```

## .env (example)
```
SECRET_KEY=your-secret-key-here
JWT_KEY=your-jwt-key-here
DATABASE_URL=sqlite:///project.db
ENVIRONMENT=development
DEBUG=true
HOST=127.0.0.1
PORT=5000
```

## Usage Instructions

### 1. Install dependencies:
```bash
pip install -r requirements.txt
```

### 2. Create .env file in project directory

### 3. Start the application:
```bash
python main.py
```

## Features:

- **Clean Architecture**: Separated concerns with distinct modules
- **Authentication**: JWT-based authentication system
- **Database**: SQLAlchemy ORM with support for multiple databases
- **API**: RESTful API with Flask
- **Configuration**: Environment-based configuration
- **Security**: Password hashing, JWT tokens, input validation
- **Modular Design**: Easy to extend and modify

## API Endpoints:

### Public:
- `GET /` - Welcome message
- `POST /api/register` - User registration
- `POST /api/login` - User login

### Protected (requires token):
- `GET /api/items` - Get user's items
- `POST /api/items` - Create new item

## Request Examples:

### Registration:
```json
POST /api/register
{
    "email": "user@example.com",
    "username": "johndoe",
    "password": "SecurePass123"
}
```

### Login:
```json
POST /api/login
{
    "identifier": "user@example.com",
    "password": "SecurePass123"
}
```

### Create Item (with Authorization header):
```json
POST /api/items
Authorization: Bearer <your-token>
{
    "title": "My Item",
    "content": "Item description"
}
```
