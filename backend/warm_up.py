#runs once while docker builds so numba saves its compiled code into the image
#without this the first upload after render wakes up takes over 2 minutes
import os
import tempfile
import numpy as np
import soundfile as sf
import librosa

from backend.transcribe import audio_to_midi

with tempfile.TemporaryDirectory() as tmp:
    wav = os.path.join(tmp, "warm.wav")
    sf.write(wav, 0.3 * np.sin(2 * np.pi * 440 * np.arange(22050) / 22050), 22050)  #1 sec A4 tone
    librosa.get_duration(path = wav)
    audio_to_midi(wav, os.path.join(tmp, "warm.mid"))
