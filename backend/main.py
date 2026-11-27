import os
import shutil
import tempfile
import threading
import time
import uuid
from urllib.parse import quote
import librosa

from fastapi import FastAPI, UploadFile, HTTPException, BackgroundTasks
from fastapi.responses import Response
from fastapi.middleware.cors import CORSMiddleware

from backend.transcribe import audio_to_midi

app = FastAPI()

#browsers block the site from calling us unless we list it here, add vincents vercel url once he has one
ORIGINS = ["http://localhost:5173"]
app.add_middleware(
    CORSMiddleware,
    allow_origins = ORIGINS,
    allow_methods = ["GET", "POST"],
    allow_headers = ["*"],
    expose_headers = ["Content-Disposition"],
)

ALLOWED = {".wav", ".mp3", ".m4a"}  #m4a is what the iphone voice memos save as
MAX_SECONDS = 180
SECS_PER_SEC = 0.6  #on render a 3 min clip took about 107 sec, so about 0.6 sec of work per sec of audio

#basic-pitch uses a lot of memory and render only gives us 512 MB, so one clip at a time
lock = threading.Lock()
jobs = {}  #job id -> state, time estimate, and the midi once its done

@app.get("/health")
def health():
    #this pings on load so render wakes up before the user uploads anything helps with efficiency
    return {"ok": True}

def check_upload(file, tmp):
    ext = os.path.splitext(file.filename)[1].lower()  #file extension like wav
    if ext not in ALLOWED:
        raise HTTPException(400, "only WAV, MP3, and M4A files work")

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
    return audio_path, seconds

def midi_download(data, filename):
    #tells the browser its a file to download and names it after the upload
    name = os.path.splitext(filename)[0] + ".mid"
    #headers can only be plain ascii, iphone names can have stuff like ’ so the full name goes in filename*
    plain = name.encode("ascii", "ignore").decode().replace('"', "")
    disposition = f"attachment; filename=\"{plain}\"; filename*=UTF-8''{quote(name)}"
    return Response(data, media_type="audio/midi", headers={"Content-Disposition": disposition})

@app.post("/transcribe")
def transcribe(file: UploadFile):
    #temp folder will delete itself when its done
    with tempfile.TemporaryDirectory() as tmp:
        audio_path, _ = check_upload(file, tmp)
        midi_path = os.path.join(tmp, "out.mid")
        with lock:
            audio_to_midi(audio_path, midi_path)

        with open(midi_path, "rb") as f:
            data = f.read()
    return midi_download(data, file.filename)

#progress bar version: upload gives back a job id right away, then the page asks /status every couple seconds
def run_job(job_id, tmp, audio_path):
    job = jobs[job_id]
    with lock:
        job["state"] = "working"
        job["started"] = time.time()
        try:
            midi_path = os.path.join(tmp, "out.mid")
            audio_to_midi(audio_path, midi_path)
            with open(midi_path, "rb") as f:
                job["midi"] = f.read()
            job["state"] = "done"
        except Exception:
            job["state"] = "failed"
        finally:
            shutil.rmtree(tmp, ignore_errors=True)

@app.post("/jobs")
def start_job(file: UploadFile, background: BackgroundTasks):
    tmp = tempfile.mkdtemp()  #not a with block since the job keeps using it after we respond
    try:
        audio_path, seconds = check_upload(file, tmp)
    except HTTPException:
        shutil.rmtree(tmp, ignore_errors=True)
        raise

    job_id = uuid.uuid4().hex
    jobs[job_id] = {"state": "waiting", "estimate": seconds * SECS_PER_SEC + 2, "name": file.filename}
    background.add_task(run_job, job_id, tmp, audio_path)
    return {"job_id": job_id}

@app.get("/status/{job_id}")
def status(job_id: str):
    job = jobs.get(job_id)
    if not job:
        raise HTTPException(404, "couldn't find that job")

    #basic-pitch doesnt report progress so we guess from how long the clip is, and stop at 95 until its really done
    percent = 0
    if job["state"] == "working":
        percent = min(95, int(100 * (time.time() - job["started"]) / job["estimate"]))
    elif job["state"] == "done":
        percent = 100
    return {"state": job["state"], "percent": percent}

@app.get("/result/{job_id}")
def result(job_id: str):
    job = jobs.get(job_id)
    if not job or job["state"] != "done":
        raise HTTPException(404, "that MIDI isn't ready yet")
    jobs.pop(job_id)  #done with it so it doesnt sit in memory
    return midi_download(job["midi"], job["name"])
