import os
import tempfile
from urllib.parse import quote
import librosa

from fastapi import FastAPI, UploadFile, HTTPException
from fastapi.responses import Response

from backend.transcribe import audio_to_midi

app = FastAPI()

ALLOWED = {".wav", ".mp3", ".m4a"}  #m4a is what the iphone voice memos save as
MAX_SECONDS = 180

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

        #check length
        try:
            seconds = librosa.get_duration(path=audio_path)
        except Exception:
            raise HTTPException(400, "couldn't read that file, try recording it again")

        if seconds > MAX_SECONDS:
            raise HTTPException(400, "clips have to be 3 minutes or less")

        midi_path = os.path.join(tmp, "out.mid")
        audio_to_midi(audio_path, midi_path)

        with open(midi_path, "rb") as f:
            data = f.read()

    #tells the browser its a file to download and names it after the upload
    name = os.path.splitext(file.filename)[0] + ".mid"
    #headers can only be plain ascii, iphone names can have stuff like ’ so the full name goes in filename*
    plain = name.encode("ascii", "ignore").decode().replace('"', "")
    disposition = f"attachment; filename=\"{plain}\"; filename*=UTF-8''{quote(name)}"
    return Response(data, media_type="audio/midi", headers={"Content-Disposition": disposition})
