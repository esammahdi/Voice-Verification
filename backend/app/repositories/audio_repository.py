from pyannote.audio import Model, Inference
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class AudioRepository:
    def __init__(self):
        logger.info("Initializing AudioRepository")
        self.model = Model.from_pretrained("pyannote/wespeaker-voxceleb-resnet34-LM")
        self.inference = Inference(self.model, window="whole")
        logger.info("AudioRepository initialized successfully")

    def get_embedding(self, audio_path: str):
        logger.info(f"Starting to process audio file: {audio_path}")
        try:
            embedding = self.inference(audio_path)
            logger.info("Embedding generated successfully")
            return embedding.tolist()
        except Exception as e:
            logger.error(f"Error processing audio: {str(e)}", exc_info=True)
            raise
