import sqlite3
from typing import Optional, List
import threading

from app.api import CustomHTTPException
from app.models.user import User
from app.models.custom_exceptions import CustomHTTPException
from .chroma_repository import ChromaRepository
import logging


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)



class UserRepository:
    def __init__(self, db_path: str):
        self.db_path = db_path
        self.local = threading.local()
        logger.info(f"UserRepository initialized with database path: {db_path}")

    def get_connection(self):
        if not hasattr(self.local, "conn"):
            self.local.conn = sqlite3.connect(self.db_path)
        return self.local.conn

    def get_cursor(self):
        return self.get_connection().cursor()

    def create(self, name: str, surname: str, email: str) -> User:
        logger.info(f"Creating new user: {name} {surname} ({email})")
        cursor = self.get_cursor()
        try:
            cursor.execute("INSERT INTO users (name, surname, email) VALUES (?, ?, ?)", (name, surname, email))
            self.get_connection().commit()
            new_user = User(cursor.lastrowid, name, surname, email)
            logger.info(f"User created with ID: {new_user.id}")
            return new_user
        except sqlite3.IntegrityError as e:
            if "UNIQUE constraint failed: users.email" in str(e):
                raise CustomHTTPException(
                    status_code=400,
                    detail="A user with this email already exists",
                    error_code="EMAIL_ALREADY_EXISTS"
                )
            raise CustomHTTPException(
                status_code=500,
                detail="An error occurred while creating the user",
                error_code="DATABASE_ERROR"
            )

    def read(self, user_id: int) -> Optional[User]:
        logger.info(f"Fetching user with ID: {user_id}")
        cursor = self.get_cursor()
        cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
        user = cursor.fetchone()
        if user:
            logger.info(f"User found: {user[1]} {user[2]}")
            return User(*user)
        logger.warning(f"User with ID {user_id} not found")
        raise CustomHTTPException(
            status_code=404,
            detail=f"User with ID {user_id} not found",
            error_code="USER_NOT_FOUND"
        )

    def update(self, user_id: int, name: str, surname: str, email: str) -> User:
        logger.info(f"Updating user with ID: {user_id}")
        cursor = self.get_cursor()
        try:
            cursor.execute("UPDATE users SET name = ?, surname = ?, email = ? WHERE id = ?", (name, surname, email, user_id))
            self.get_connection().commit()
            if cursor.rowcount > 0:
                updated_user = User(user_id, name, surname, email)
                logger.info(f"User updated: {updated_user.name} {updated_user.surname}")
                return updated_user
            raise CustomHTTPException(
                status_code=404,
                detail=f"User with ID {user_id} not found",
                error_code="USER_NOT_FOUND"
            )
        except sqlite3.IntegrityError as e:
            if "UNIQUE constraint failed: users.email" in str(e):
                raise CustomHTTPException(
                    status_code=400,
                    detail="A user with this email already exists",
                    error_code="EMAIL_ALREADY_EXISTS"
                )
            raise CustomHTTPException(
                status_code=500,
                detail="An error occurred while updating the user",
                error_code="DATABASE_ERROR"
            )

    def delete(self, user_id: int) -> bool:
        logger.info(f"Deleting user with ID: {user_id}")
        cursor = self.get_cursor()
        cursor.execute("DELETE FROM users WHERE id = ?", (user_id,))
        self.get_connection().commit()
        if cursor.rowcount > 0:
            logger.info(f"User with ID {user_id} deleted successfully")
            return True
        logger.warning(f"User with ID {user_id} not found for deletion")
        raise CustomHTTPException(
            status_code=404,
            detail=f"User with ID {user_id} not found",
            error_code="USER_NOT_FOUND"
        )

    def close(self):
        logger.info("Closing database connection")
        if hasattr(self.local, "conn"):
            self.local.conn.close()
            del self.local.conn
        logger.info("Database connection closed")

    def get_all_users(self) -> List[User]:
        logger.info("Fetching all users")
        cursor = self.get_cursor()
        cursor.execute("SELECT * FROM users")
        users = cursor.fetchall()
        logger.info(f"Retrieved {len(users)} users")
        return [User(*user) for user in users]
    
    def get_users_with_embeddings(self):
        logger.info("Fetching users with embeddings")
        users = self.get_all_users()
        chroma_repo = ChromaRepository()
        embeddings = chroma_repo.get_all_embeddings()
        logger.info(f"Retrieved embeddings for {len(embeddings)} users")
        
        users_with_embeddings = []
        for user in users:
            user_dict = {
                'id': user.id,
                'name': user.name,
                'surname': user.surname,
                'email': user.email,
                'embedding': embeddings.get(str(user.id))
            }
            users_with_embeddings.append(user_dict)
        
        logger.info(f"Returning {len(users_with_embeddings)} users with embeddings")
        
        return users_with_embeddings
