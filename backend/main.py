import os
import shutil
import tempfile
import threading
import time
import uuid
from urllib.parse import quote
import librosa

from fastapi import FastAPI, UploadFile, HTTPException, BackgroundTasks, Form
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
    expose_headers = ["Content-Disposition", "X-BPM"],
)

ALLOWED = {".wav", ".mp3", ".m4a"}  #m4a is what the iphone voice memos save as
MAX_SECONDS = 180
MAX_BYTES = 25 * 1024 * 1024  #a 3 min voice memo is only a couple MB so 25 is plenty
SECS_PER_SEC = 0.6  #starting guess from render (3 min clip took about 107 sec), each finished job updates it

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

    #only read 1 byte past the limit so a huge file cant fill up our 512 MB
    data = file.file.read(MAX_BYTES + 1)
    if len(data) > MAX_BYTES:
        raise HTTPException(413, "that file is too big, keep it under 25 MB")

    audio_path = os.path.join(tmp, "upload" + ext)
    with open(audio_path, "wb") as f:
        f.write(data)

    #check length
    try:
        seconds = librosa.get_duration(path=audio_path)
    except Exception as err:
        raise HTTPException(400, "couldn't read that file, try recording it again") from err

    if seconds > MAX_SECONDS:
        raise HTTPException(400, "clips have to be 3 minutes or less")
    return audio_path, seconds

def check_bpm(bpm):
    if bpm is not None and not 40 <= bpm <= 240:
        raise HTTPException(400, "tempo has to be between 40 and 240 BPM")

def midi_download(data, filename, bpm):
    #tells the browser its a file to download and names it after the upload
    name = os.path.splitext(filename)[0] + ".mid"
    #headers can only be plain ascii, iphone names can have stuff like ’ so the full name goes in filename*
    plain = name.encode("ascii", "ignore").decode().replace('"', "")
    disposition = f"attachment; filename=\"{plain}\"; filename*=UTF-8''{quote(name)}"
    #X-BPM lets the page show what tempo we used
    return Response(data, media_type="audio/midi", headers={"Content-Disposition": disposition, "X-BPM": str(bpm)})

@app.post("/transcribe")
def transcribe(file: UploadFile, bpm: int | None = Form(None)):
    check_bpm(bpm)
    #temp folder will delete itself when its done
    with tempfile.TemporaryDirectory() as tmp:
        audio_path, _ = check_upload(file, tmp)
        midi_path = os.path.join(tmp, "out.mid")
        with lock:
            bpm = audio_to_midi(audio_path, midi_path, bpm)

        with open(midi_path, "rb") as f:
            data = f.read()
    return midi_download(data, file.filename, bpm)

#progress bar version: upload gives back a job id right away, then the page asks /status every couple seconds
def run_job(job_id, tmp, audio_path, bpm):
    global SECS_PER_SEC
    job = jobs[job_id]
    with lock:
        job["state"] = "working"
        job["started"] = time.time()
        try:
            midi_path = os.path.join(tmp, "out.mid")
            job["bpm"] = audio_to_midi(audio_path, midi_path, bpm)
            with open(midi_path, "rb") as f:
                job["midi"] = f.read()
            job["state"] = "done"
            #learn how fast this machine really is so the next progress bar is more accurate
            took = (time.time() - job["started"]) / job["seconds"]
            SECS_PER_SEC = 0.25 * SECS_PER_SEC + 0.75 * took  #mostly trust the newest job but keep a little of the old guess so one weird clip doesnt throw it off
        except Exception:
            job["state"] = "failed"
        finally:
            shutil.rmtree(tmp, ignore_errors=True)

@app.post("/jobs")
def start_job(file: UploadFile, background: BackgroundTasks, bpm: int | None = Form(None)):
    check_bpm(bpm)
    tmp = tempfile.mkdtemp()  #not a with block since the job keeps using it after we respond
    try:
        audio_path, seconds = check_upload(file, tmp)
    except HTTPException:
        shutil.rmtree(tmp, ignore_errors=True)
        raise

    job_id = uuid.uuid4().hex
    jobs[job_id] = {"state": "waiting", "seconds": seconds, "estimate": seconds * SECS_PER_SEC + 1, "name": file.filename}
    background.add_task(run_job, job_id, tmp, audio_path, bpm)
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
    return {"state": job["state"], "percent": percent, "bpm": job.get("bpm")}

@app.get("/result/{job_id}")
def result(job_id: str):
    job = jobs.get(job_id)
    if not job or job["state"] != "done":
        raise HTTPException(404, "that MIDI isn't ready yet")
    jobs.pop(job_id)  #done with it so it doesnt sit in memory
    return midi_download(job["midi"], job["name"], job["bpm"])
