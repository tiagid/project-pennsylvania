import os
import tempfile

from fastapi import FastAPI, UploadFile, HTTPException
from fastapi.responses import Response

from backend.transcribe import audio_to_midi

app = FastAPI()

ALLOWED = {".wav", ".mp3", ".m4a"}  #m4a is what the iphone voice memos save as

@app.get("/health")
def health():
    #this pings on load so render wakes up before the user uploads anything helps with efficiency
    return {"ok": True}

@app.post("/transcribe")
def transcribe(file: UploadFile):
    ext = os.path.splitext(file.filename)[1].lower()  #file extension like wav
    if ext not in ALLOWED:
        raise HTTPException(400, "only WAV, MP3, and M4A files work")

    #temp folder will delete itself when its done
    with tempfile.TemporaryDirectory() as tmp:
        audio_path = os.path.join(tmp, "upload" + ext)
        with open(audio_path, "wb") as f:
            f.write(file.file.read())

        midi_path = os.path.join(tmp, "out.mid")
        audio_to_midi(audio_path, midi_path)

        with open(midi_path, "rb") as f:
            data = f.read()

    return Response(data, media_type="audio/midi")
