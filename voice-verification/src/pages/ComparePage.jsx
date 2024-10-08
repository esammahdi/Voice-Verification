import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Dropdown } from 'primereact/dropdown';
import { Button } from 'primereact/button';
import { Slider } from 'primereact/slider';
import { ProgressBar } from 'primereact/progressbar';
import { Toast } from 'primereact/toast';
import { Messages } from 'primereact/messages';
import { Skeleton } from 'primereact/skeleton';
import { ProgressSpinner } from 'primereact/progressspinner';
import VoiceComparisonChart from '../components/VoiceComparisonChart';

const ComparePage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [threshold, setThreshold] = useState(70);
  const [similarity, setSimilarity] = useState(null);
  const [comparisonResult, setComparisonResult] = useState(null);
  const [audioDuration, setAudioDuration] = useState(0);
  const [comparisonMessage, setComparisonMessage] = useState(null);
  const [storedEmbedding, setStoredEmbedding] = useState(null);
  const [newEmbedding, setNewEmbedding] = useState(null);
  const [displayDimensions, setDisplayDimensions] = useState(10);
  const [isLoading, setIsLoading] = useState(false);

  const messagesRef = useRef(null);

  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const audioRef = useRef(new Audio());
  const toastRef = useRef(null);
  const timerRef = useRef(null);
  const playbackIntervalRef = useRef(null);

  const chartHeight = useMemo(() => {
    // Adjust these values as needed to match your layout
    return audioBlob ? '400px' : '300px';
  }, [audioBlob]);

  useEffect(() => {
    fetchUsers();

    const audioElement = audioRef.current;
    const handleEnded = () => {
      setIsPlaying(false);
      setPlaybackTime(0);
      audioElement.currentTime = 0;
      clearInterval(playbackIntervalRef.current);
    };
    const handleLoadedMetadata = () => {
      console.log('Metadata loaded, duration:', audioElement.duration);
      if (audioElement.duration && isFinite(audioElement.duration)) {
        setAudioDuration(audioElement.duration);
      } else {
        console.warn('Invalid audio duration:', audioElement.duration);
        setAudioDuration(recordingTime); // Fallback to recording time
      }
      setPlaybackTime(0);
    };

    audioElement.addEventListener('ended', handleEnded);
    audioElement.addEventListener('loadedmetadata', handleLoadedMetadata);

    // Cleanup function
    return () => {
      audioElement.removeEventListener('ended', handleEnded);
      audioElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
      if (timerRef.current) clearInterval(timerRef.current);
      if (playbackIntervalRef.current) clearInterval(playbackIntervalRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:8000/users_with_embeddings');
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }
      const data = await response.json();

      const newUsers = data.map(user => ({
        value: user.id,
        label: `${user.name} ${user.surname}`,
        embedding: user.embedding
      }));

      setUsers(newUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      toastRef.current?.show({ severity: 'error', summary: 'Error', detail: 'Failed to fetch users' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedUser) {
      setStoredEmbedding(selectedUser.embedding);
    } else {
      setStoredEmbedding(null);
    }
  }, [selectedUser]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      const chunks = [];

      mediaRecorderRef.current.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setAudioBlob(blob);
        if (audioUrl) URL.revokeObjectURL(audioUrl);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        audioRef.current.src = url;
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime((prevTime) => prevTime + 1);
      }, 1000);
    } catch (err) {
      console.error('Error accessing microphone:', err);
      toastRef.current?.show({ severity: 'error', summary: 'Error', detail: 'Unable to access microphone' });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setIsRecording(false);
    setAudioDuration(recordingTime); // Set initial duration to recording time
  };

  const discardRecording = () => {
    setAudioBlob(null);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    setRecordingTime(0);
    setPlaybackTime(0);
    setIsPlaying(false);
    audioRef.current.pause();
    audioRef.current.currentTime = 0;
    setNewEmbedding(null);  // Clear the new embedding when discarding recording
  };

  const playPauseAudio = () => {
    if (isPlaying) {
      audioRef.current.pause();
      clearInterval(playbackIntervalRef.current);
    } else {
      audioRef.current.play();
      playbackIntervalRef.current = setInterval(() => {
        setPlaybackTime(audioRef.current.currentTime);
      }, 50);
    }
    setIsPlaying(!isPlaying);
  };

  const handlePlaybackTimeChange = useCallback((e) => {
    const newTime = e.value;
    audioRef.current.currentTime = newTime;
    setPlaybackTime(newTime);
  }, []);

  const compareVoice = async () => {
    if (!selectedUser || !audioBlob) {
      toastRef.current?.show({ severity: 'error', summary: 'Error', detail: 'Please select a user and record your voice' });
      return;
    }

    setIsLoading(true); // Show spinner

    const formData = new FormData();
    formData.append('file', audioBlob, 'user_audio.webm');

    try {
      const response = await fetch(`http://localhost:8000/audio/compare?user_id=${selectedUser.value}`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to compare voice');
      }

      const data = await response.json();
      const similarityScore = data.similarity;
      const adjustedSimilarity = (1 - similarityScore) * 100; // Convert to percentage
      setSimilarity(adjustedSimilarity);
      const isMatch = adjustedSimilarity >= threshold;
      setComparisonResult(isMatch);

      setStoredEmbedding(data.stored_embedding);
      setNewEmbedding(data.new_embedding);

      // Prepare message for Messages component
      const message = {
        severity: isMatch ? 'success' : 'error',
        summary: isMatch ? 'Voice Match' : 'Voice Mismatch',
        detail: `Similarity: ${adjustedSimilarity.toFixed(2)}%. ${isMatch ? 'Voice verified.' : 'Voice not verified.'}`,
        sticky: true
      };
      setComparisonMessage(message);

      // Clear previous messages and show new one
      messagesRef.current.clear();
      messagesRef.current.show(message);

    } catch (error) {
      console.error('Error comparing voice:', error);
      toastRef.current?.show({ severity: 'error', summary: 'Error', detail: 'Failed to compare voice' });
    } finally {
      setIsLoading(false); // Hide spinner
    }
  };

  // Add this new function to handle both start and stop recording
  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const skeletonTemplate = () => {
    return (
      <div className="custom-skeleton">
        <div className="p-field mb-4">
          <Skeleton width="100%" height="2rem" className="mb-2" />
          <Skeleton width="100%" height="3rem" />
        </div>
        <div className="p-field mb-4">
          <Skeleton width="100%" height="2rem" className="mb-2" />
          <Skeleton width="100%" height="3rem" />
        </div>
        <div className="p-field mb-4">
          <Skeleton width="100%" height="2rem" className="mb-2" />
          <Skeleton width="100%" height="1rem" />
        </div>
        <div className="p-field mb-4">
          <Skeleton width="100%" height="2rem" className="mb-2" />
          <Skeleton width="100%" height="1rem" />
        </div>
        <Skeleton width="100%" height="3rem" />
      </div>
    );
  };

  return (
    <div className="compare-page">
      <Toast ref={toastRef} />
      <Messages ref={messagesRef} />
      <h1>Compare Voice</h1>
      <div className="grid">
        <div className="col-12 md:col-8">
          {loading ? (
            skeletonTemplate()
          ) : (
            <div className="p-fluid">
              <div className="p-field mb-4">
                <label htmlFor="user" className="block mb-2 text-left">Select User</label>
                <Dropdown
                  id="user"
                  value={selectedUser?.value}
                  options={users}
                  onChange={(e) => {
                    const selectedUserObject = users.find(user => user.value === e.value);
                    setSelectedUser(selectedUserObject);
                  }}
                  placeholder="Select a user"
                  optionLabel="label"
                />
              </div>
              <div className="p-field mb-4">
                <label className="block mb-2 text-left">Record Your Voice</label>
                <div className="p-inputgroup mb-2">
                  <Button 
                    type="button" 
                    icon={isRecording ? "pi pi-stop" : "pi pi-play"} 
                    label={isRecording ? "Stop Recording" : "Start Recording"}
                    onClick={toggleRecording} 
                    disabled={audioBlob}
                  />
                </div>
                {isRecording && (
                  <div className="mb-2 mt-4">
                    <ProgressBar value={recordingTime} showValue={false} />
                    <small className="block mt-1">Recording: {recordingTime} seconds</small>
                  </div>
                )}
                {audioBlob && (
                  <div className="audio-controls mt-4">
                    <div className="flex align-items-center">
                      <Button type="button" icon={isPlaying ? "pi pi-pause" : "pi pi-play"} onClick={playPauseAudio} className="mr-2" />
                      <Slider 
                        value={playbackTime} 
                        max={audioDuration || recordingTime} 
                        onChange={handlePlaybackTimeChange} 
                        onSlideEnd={(e) => setPlaybackTime(e.value)}
                        className="flex-grow-1 mx-2" 
                        step={0.01}
                      />
                      <Button type="button" icon="pi pi-trash" onClick={discardRecording} className="ml-2 p-button-danger" />
                    </div>
                    <small className="block mt-2">
                      {Math.floor(playbackTime)} / {Math.floor(audioDuration || recordingTime)} seconds
                    </small>
                  </div>
                )}
              </div>
              <div className="p-field mb-4">
                <label htmlFor="threshold" className="block mb-2 text-left">Similarity Threshold: {threshold}%</label>
                <Slider id="threshold" value={threshold} onChange={(e) => setThreshold(e.value)} />
              </div>
              <div className="p-field mb-4">
                <label htmlFor="dimensions" className="block mb-2 text-left">Number of Dimensions: {displayDimensions}</label>
                <Slider 
                  id="dimensions" 
                  value={displayDimensions} 
                  onChange={(e) => setDisplayDimensions(e.value)} 
                  min={5} 
                  max={50} 
                  step={5}
                />
              </div>
            </div>
          )}
        </div>
        <div className="col-12 md:col-4">
          <VoiceComparisonChart 
            storedEmbedding={storedEmbedding}
            newEmbedding={newEmbedding}
            displayDimensions={displayDimensions}
            height={chartHeight}
          />
        </div>
      </div>
      <div className="col-12 text-center mt-2">
        <Button label="Compare Voice" onClick={compareVoice} disabled={!selectedUser || !audioBlob} className="mb-4" />
      </div>
      {isLoading && (
        <div className="spinner-overlay">
          <ProgressSpinner 
            style={{width: '100px', height: '100px'}} 
            strokeWidth="3" 
            animationDuration="1.0s"
          />
        </div>
      )}
    </div>
  );
};

export default ComparePage;