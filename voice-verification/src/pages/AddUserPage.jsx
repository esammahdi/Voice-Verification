import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; // Add this import
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { Toast } from 'primereact/toast';
import { ProgressBar } from 'primereact/progressbar';
import { Slider } from 'primereact/slider';
import { ProgressSpinner } from 'primereact/progressspinner';


const AddUserPage = () => {
  const navigate = useNavigate(); // Add this line
  const [name, setName] = useState('');
  const [surname, setSurname] = useState('');
  const [email, setEmail] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [emailError, setEmailError] = useState('');
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const audioRef = useRef(new Audio());
  const toastRef = useRef(null);
  const timerRef = useRef(null);
  const recordingTimeRef = useRef(0);
  const playbackIntervalRef = useRef(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      const chunks = [];

      mediaRecorderRef.current.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorderRef.current.onstop = () => {
        console.log("recordingTime", recordingTimeRef.current);
        if (recordingTimeRef.current < 5) {
          setAudioBlob(null);
          setAudioUrl(null);
          toastRef.current?.show({ severity: 'error', summary: 'Error', detail: 'Recording must be at least 5 seconds long' });
        } else {
          const blob = new Blob(chunks, { type: 'audio/webm' });
          setAudioBlob(blob);
          if (audioUrl) URL.revokeObjectURL(audioUrl);
          const url = URL.createObjectURL(blob);
          setAudioUrl(url);
          audioRef.current.src = url;
        }
      };

      mediaRecorderRef.current.start();
      
      setIsRecording(true);
      
      recordingTimeRef.current = 0;

      timerRef.current = setInterval(() => {
        recordingTimeRef.current += 0.1;
        setRecordingTime(recordingTimeRef.current);
        if (recordingTimeRef.current >= 30) {
          stopRecording();
        }
      }, 100);
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
    setRecordingTime(recordingTimeRef.current);
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
  };

  const playPauseAudio = () => {
    if (isPlaying) {
      audioRef.current.pause();
      clearInterval(playbackIntervalRef.current);
    } else {
      audioRef.current.play();
      playbackIntervalRef.current = setInterval(() => {
        setPlaybackTime(audioRef.current.currentTime);
      }, 100);
    }
    setIsPlaying(!isPlaying);
  };

  const handlePlaybackTimeChange = (e) => {
    const newTime = e.value;
    setPlaybackTime(newTime);
    audioRef.current.currentTime = newTime;
  };

  useEffect(() => {
    if (audioUrl) {
      audioRef.current.src = audioUrl;
      
      const updatePlaybackTime = () => {
        setPlaybackTime(audioRef.current.currentTime);
      };

      playbackIntervalRef.current = setInterval(updatePlaybackTime, 100);

      audioRef.current.addEventListener('ended', () => {
        setIsPlaying(false);
        setPlaybackTime(0);
        clearInterval(playbackIntervalRef.current);
      });

      return () => {
        clearInterval(playbackIntervalRef.current);
      };
    }
  }, [audioUrl]);

  const validateEmail = (email) => {
    const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return re.test(String(email).toLowerCase());
  };

  const handleEmailChange = (e) => {
    const newEmail = e.target.value;
    setEmail(newEmail);
    if (newEmail && !validateEmail(newEmail)) {
      setEmailError('Please enter a valid email address');
    } else {
      setEmailError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !surname || !email || !audioBlob || emailError) {
      toastRef.current?.show({ severity: 'error', summary: 'Error', detail: 'Please fill all required fields correctly' });
      return;
    }

    if (!audioBlob) {
      toastRef.current?.show({ severity: 'error', summary: 'Error', detail: 'Please Record Your Voice' });
      return;
    }

    setIsLoading(true); // Show spinner

    const formData = new FormData();
    formData.append('name', name);
    formData.append('surname', surname);
    formData.append('email', email);
    formData.append('audio', audioBlob, 'user_audio.webm');

    try {
      const response = await fetch('http://localhost:8000/users', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        toastRef.current?.show({ severity: 'success', summary: 'Success', detail: 'User added successfully' });
        // Reset form fields
        setName('');
        setSurname('');
        setEmail('');
        setAudioBlob(null);
        if (audioUrl) {
          URL.revokeObjectURL(audioUrl);
          setAudioUrl(null);
        }
        setRecordingTime(0);
        setPlaybackTime(0);
        
        // Redirect to Users page after a short delay
        setTimeout(() => {
          navigate('/users');
        }, 1500); // Redirect after 1.5 seconds
      } else {
        toastRef.current?.show({ severity: 'error', summary: 'Error', detail: 'Failed to add user' });
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      toastRef.current?.show({ severity: 'error', summary: 'Error', detail: 'An error occurred while submitting the form' });
    } finally {
      setIsLoading(false); // Hide spinner
    }
  };

  return (
    <div className="add-user-page">
      <Toast ref={toastRef} />
      <h1 className="text-center">Add User</h1>
      <form onSubmit={handleSubmit}>
        <div className="p-fluid">
          <div className="p-field mb-4">
            <label htmlFor="name" className="block mb-2">Name <span className="text-red-500">*</span></label>
            <InputText id="name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="p-field mb-4">
            <label htmlFor="surname" className="block mb-2">Surname <span className="text-red-500">*</span></label>
            <InputText id="surname" value={surname} onChange={(e) => setSurname(e.target.value)} required />
          </div>
          <div className="p-field mb-4">
            <label htmlFor="email" className="block mb-2">Email <span className="text-red-500">*</span></label>
            <InputText 
              id="email" 
              type="email" 
              value={email} 
              onChange={handleEmailChange} 
              className={emailError ? 'p-invalid' : ''}
              required 
            />
            {emailError && <small className="p-error block">{emailError}</small>}
          </div>
          <div className="p-field mb-4">
            <label className="block mb-2">Audio Recording <span className="text-red-500">*</span></label>
            <div className="p-inputgroup mb-2">
             <Button type="button" icon="pi pi-microphone" onClick={startRecording} disabled={isRecording || audioBlob} />
              <Button type="button" icon="pi pi-stop" onClick={stopRecording} disabled={!isRecording} />
              {audioBlob && (
                <>
                  <Button type="button" icon={isPlaying ? "pi pi-pause" : "pi pi-play"} onClick={playPauseAudio} />
                  <Button type="button" icon="pi pi-trash" onClick={discardRecording} />
                </>
              )}
            </div>
            {isRecording && (
              <div className="mb-2">
                <ProgressBar 
                  value={Math.floor((recordingTime / 30) * 100)} 
                  color={Math.floor(recordingTime) < 5 ? 'red' : undefined}
                />
                <small className="block mt-1">Recording: {Math.floor(recordingTime)} seconds</small>
              </div>
            )}
            {audioBlob && (
              <>
                <Slider value={playbackTime} max={recordingTime} onChange={handlePlaybackTimeChange} className="mb-2 mt-4" />
                <small className="block mb-2 mt-3">
                  {Math.floor(playbackTime)} / {Math.floor(recordingTime)} seconds
                </small>
              </>
            )}
          </div>
          <Button type="submit" label="Add User" className="mt-4" />
        </div>
      </form>
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

export default AddUserPage;