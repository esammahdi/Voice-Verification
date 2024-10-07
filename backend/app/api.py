import os
import tempfile
import logging
import numpy as np
from typing import List

from fastapi import FastAPI, HTTPException, UploadFile, File, Depends, Form, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi import HTTPException

from app.models.custom_exceptions import CustomHTTPException
from app.models.pydantic_models import UserCreate, UserResponse, UserWithEmbedding
from app.repositories.user_repository import UserRepository, User
from app.repositories.audio_repository import AudioRepository
from app.repositories.chroma_repository import ChromaRepository

from pydub import AudioSegment




logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


app = FastAPI()


origins = [
    "http://localhost:3000",
    "localhost:3000",
    "http://localhost:5173",
    "localhost:5173",

]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

# Initialize repositories
audio_repo = AudioRepository()
chroma_repo = ChromaRepository()

# Define get_user_repo function
def get_user_repo():
    user_repo = UserRepository("./users.db")
    try:
        yield user_repo
    finally:
        user_repo.close()


@app.exception_handler(CustomHTTPException)
async def custom_exception_handler(request: Request, exc: CustomHTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": exc.error_code,
                "message": exc.detail
            }
        }
    )


# User endpoints
@app.post("/users", response_model=UserResponse)
async def create_user(
    name: str = Form(...),
    surname: str = Form(...),
    email: str = Form(...),
    audio: UploadFile = File(...),
    user_repo: UserRepository = Depends(get_user_repo)
):
    logger.info(f"Received request to create user: {name} {surname}")
    logger.info(f"Audio file received: {audio.filename}")

    with tempfile.TemporaryDirectory() as temp_dir:
        # Save the uploaded file
        temp_path = os.path.join(temp_dir, audio.filename)
        with open(temp_path, "wb") as buffer:
            content = await audio.read()
            buffer.write(content)
        
        logger.info(f"Temporary file created: {temp_path}")
        logger.info(f"File size: {os.path.getsize(temp_path)} bytes")

        # Convert to WAV if necessary
        if not temp_path.lower().endswith('.wav'):
            logger.info("Converting audio to WAV")
            audio = AudioSegment.from_file(temp_path)
            wav_path = os.path.join(temp_dir, "audio.wav")
            audio.export(wav_path, format="wav")
            logger.info(f"Converted file saved: {wav_path}")
        else:
            wav_path = temp_path

        try:
            # Get embedding
            logger.info("Attempting to get audio embedding")
            embedding = audio_repo.get_embedding(wav_path)
            logger.info("Audio embedding obtained successfully")
            
            # Create the user
            logger.info("Creating user in database")
            new_user = user_repo.create(name, surname, email)
            logger.info(f"User created with ID: {new_user.id}")
            
            # Save embedding to ChromaDB
            logger.info("Saving embedding to ChromaDB")
            chroma_repo.save_embedding(new_user.id, embedding)
            logger.info("Embedding saved successfully")

            return UserResponse(**new_user.__dict__)

        except CustomHTTPException as e:
            logger.error(f"Custom error during user creation process: {str(e)}", exc_info=True)
            raise e
        except Exception as e:
            logger.error(f"Unexpected error during user creation process: {str(e)}", exc_info=True)
            raise CustomHTTPException(
                status_code=500,
                detail=f"An unexpected error occurred: {str(e)}",
                error_code="INTERNAL_SERVER_ERROR"
            )

@app.get("/users/{user_id}", response_model=UserResponse)
def get_user(user_id: int, user_repo: UserRepository = Depends(get_user_repo)):
    user = user_repo.read(user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return UserResponse(**user.__dict__)

@app.put("/users/{user_id}", response_model=UserResponse)
def update_user(user_id: int, user: UserCreate, user_repo: UserRepository = Depends(get_user_repo)):
    updated_user = user_repo.update(user_id, user.name, user.surname, user.email)
    if updated_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return UserResponse(**updated_user.__dict__)

@app.delete("/users/{user_id}")
def delete_user(user_id: int, user_repo: UserRepository = Depends(get_user_repo)):
    if not user_repo.delete(user_id):
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "User deleted successfully"}

@app.get("/users", response_model=List[UserResponse])
def get_all_users(user_repo: UserRepository = Depends(get_user_repo)):
    users = user_repo.get_all_users()
    return [UserResponse(**user.__dict__) for user in users]

# Audio processing endpoints
@app.post("/audio/process")
async def process_audio(user_id: int, file: UploadFile = File(...)):
    # Save the uploaded file temporarily
    with tempfile.NamedTemporaryFile(delete=False) as temp_file:
        content = await file.read()
        temp_file.write(content)
        temp_path = temp_file.name

    try:
        # Get embedding
        embedding = audio_repo.get_embedding(temp_path)
        
        # Save embedding to ChromaDB
        chroma_repo.save_embedding(user_id, embedding)

        return {"message": "Audio processed and embedding saved successfully"}
    finally:
        # Clean up the temporary file
        os.unlink(temp_path)

@app.post("/audio/compare")
async def compare_audio(user_id: int, file: UploadFile = File(...)):
    logger.info(f"Received audio comparison request for user_id: {user_id}")
    
    with tempfile.TemporaryDirectory() as temp_dir:
        # Save the uploaded file
        temp_path = os.path.join(temp_dir, file.filename)
        with open(temp_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        
        logger.info(f"Temporary file created: {temp_path}")
        logger.info(f"File size: {os.path.getsize(temp_path)} bytes")

        # Convert to WAV if necessary
        if not temp_path.lower().endswith('.wav'):
            logger.info("Converting audio to WAV")
            audio = AudioSegment.from_file(temp_path)
            wav_path = os.path.join(temp_dir, "audio.wav")
            audio.export(wav_path, format="wav")
            logger.info(f"Converted file saved: {wav_path}")
        else:
            wav_path = temp_path

        try:
            # Get embedding
            logger.info("Attempting to get audio embedding")
            embedding = audio_repo.get_embedding(wav_path)
            embedding_list = embedding.tolist() if isinstance(embedding, np.ndarray) else embedding
            
            # Compare embedding with stored embedding
            logger.info(f"Comparing embedding for user_id: {user_id}")
            similarity, stored_embedding = chroma_repo.compare_embedding(user_id, embedding_list)
            logger.info(f"Similarity score: {similarity}")

            return {
                "similarity": similarity,
                "stored_embedding": stored_embedding,
                "new_embedding": embedding_list
            }
        except Exception as e:
            logger.error(f"Error during audio comparison: {str(e)}", exc_info=True)
            return JSONResponse(status_code=400, content={"message": f"Error processing request: {str(e)}"})

    # Temporary directory and its contents are automatically cleaned up here



@app.get("/users_with_embeddings", response_model=List[UserWithEmbedding])
def get_users_with_embeddings(user_repo: UserRepository = Depends(get_user_repo)):
    return user_repo.get_users_with_embeddings()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="localhost", port=8000)