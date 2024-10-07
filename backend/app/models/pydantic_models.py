from typing import List, Optional
from pydantic import BaseModel

class UserCreate(BaseModel):
    name: str
    surname: str
    email: str

class UserResponse(BaseModel):
    id: int
    name: str
    surname: str
    email: str

class UserWithEmbedding(BaseModel):
    id: int
    name: str
    surname: str
    email: str
    embedding: Optional[List[float]] = None