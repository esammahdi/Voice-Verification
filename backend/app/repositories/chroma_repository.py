import chromadb
from chromadb.config import Settings
from typing import List, Tuple
import numpy as np
from scipy.spatial.distance import cdist
import logging

logger = logging.getLogger(__name__)

class ChromaRepository:
    def __init__(self):
        self.client = chromadb.PersistentClient(path="./chroma_db")
        self.collection = self.client.get_or_create_collection("audio_embeddings")
        logger.info("ChromaRepository initialized")

    def save_embedding(self, user_id: int, embedding: List[float]):
        logger.info(f"Saving embedding for user_id: {user_id}")
        self.collection.add(
            embeddings=[embedding],
            ids=[str(user_id)],
            metadatas=[{"user_id": user_id}]
        )
        logger.info(f"Embedding saved for user_id: {user_id}")

    def compare_embedding(self, user_id: int, embedding: List[float]) -> Tuple[float, List[float]]:
        logger.info(f"Comparing embedding for user_id: {user_id}")
        results = self.collection.query(
            query_embeddings=[embedding],
            where={"user_id": user_id},
            n_results=1,
            include=["embeddings", "distances"]
        )
        logger.info(f"Query results: {results}")

        if results['embeddings'] and len(results['embeddings'][0]) > 0:
            stored_embedding = results['embeddings'][0][0]
            logger.info(f"Stored embedding shape: {np.array(stored_embedding).shape}")
            logger.info(f"Input embedding shape: {np.array(embedding).shape}")
            distance = cdist([stored_embedding], [embedding], metric="cosine")[0,0]
            logger.info(f"Cosine distance: {distance}")
            return distance, stored_embedding.tolist()
        else:
            distance = 1.0  # Maximum cosine distance if no embedding is found
            logger.warning(f"No embedding found for user_id: {user_id}")
            return distance, []

    def get_all_embeddings(self):
        results = self.collection.get(
            include=["embeddings", "metadatas"]
        )
        return {
            str(metadata['user_id']): embedding.tolist() if isinstance(embedding, np.ndarray) else embedding
            for metadata, embedding in zip(results['metadatas'], results['embeddings'])
            if embedding is not None
        }
