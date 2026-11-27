import shutil
import subprocess
import time

import numpy as np
import pytest
import soundfile as sf
from fastapi.testclient import TestClient

from backend import main
from backend.transcribe import guess_tempo

client = TestClient(main.app)


def tone(path, seconds=1.0, rate=22050):
    t = np.arange(int(seconds * rate)) / rate
    sf.write(path, 0.5 * np.sin(2 * np.pi * 440 * t), rate)
    return path


def clicks(path, bpm, seconds=12, rate=22050):
    #short beeps on every beat so librosa has something to find
    y = np.zeros(seconds * rate)
    t = np.arange(int(0.15 * rate)) / rate
    beep = 0.4 * np.sin(2 * np.pi * 440 * t) * np.exp(-t * 20)
    for k in range(int(seconds * bpm / 60)):
        i = int(k * 60 / bpm * rate)
        y[i:i + len(beep)] += beep[:len(y) - i]
    sf.write(path, y, rate)
    return path


def upload(url, path, **form):
    with open(path, "rb") as f:
        return client.post(url, files={"file": (path.name, f)}, data=form)


def test_wrong_file_type_is_rejected(tmp_path):
    txt = tmp_path / "notes.txt"
    txt.write_text("not audio")
    r = upload("/jobs", txt)
    assert r.status_code == 400
    assert r.json()["detail"] == "only WAV, MP3, M4A, WEBM, and OGG files work"


def test_file_over_25_mb_is_rejected(tmp_path, monkeypatch):
    monkeypatch.setattr(main, "MAX_BYTES", 1000)  #so we dont have to make a real 25 MB file
    r = upload("/transcribe", tone(tmp_path / "big.wav"))
    assert r.status_code == 413


def test_tempo_out_of_range_is_rejected(tmp_path):
    r = upload("/transcribe", tone(tmp_path / "a4.wav"), bpm="500")
    assert r.status_code == 400


def test_job_reports_progress_then_gives_back_midi(tmp_path):
    job_id = upload("/jobs", tone(tmp_path / "a4.wav"), bpm="100").json()["job_id"]

    for _ in range(60):
        status = client.get(f"/status/{job_id}").json()
        assert 0 <= status["percent"] <= 100
        if status["state"] == "done":
            break
        time.sleep(1)
    assert status == {"state": "done", "percent": 100, "bpm": 100}

    r = client.get(f"/result/{job_id}")
    assert r.status_code == 200
    assert r.content[:4] == b"MThd"
    assert r.headers["x-bpm"] == "100"


def test_unknown_job_is_404():
    assert client.get("/status/nope").status_code == 404


@pytest.mark.parametrize("bpm", [90, 140])
def test_guess_tempo_finds_the_beat(tmp_path, bpm):
    assert abs(guess_tempo(clicks(tmp_path / "clicks.wav", bpm)) - bpm) <= 6


def test_progress_estimate_learns_from_finished_jobs(tmp_path, monkeypatch):
    monkeypatch.setattr(main, "SECS_PER_SEC", 100.0)  #way too slow on purpose so we can see it come down
    job_id = upload("/jobs", tone(tmp_path / "a4.wav")).json()["job_id"]
    for _ in range(60):
        if client.get(f"/status/{job_id}").json()["state"] == "done":
            break
        time.sleep(1)
    assert main.SECS_PER_SEC < 100.0


@pytest.mark.skipif(not shutil.which("ffmpeg"), reason="needs ffmpeg to make the test clip")
@pytest.mark.parametrize("ext, codec", [(".webm", "libopus"), (".ogg", "libvorbis")])
def test_browser_mic_recordings_work(tmp_path, ext, codec):
    #chrome records the mic as webm, so make one the same way and send it through
    clip = tmp_path / ("mic" + ext)
    subprocess.run(["ffmpeg", "-loglevel", "error", "-f", "lavfi", "-i", "sine=frequency=440:duration=2", "-c:a", codec, str(clip)], check=True)
    r = upload("/transcribe", clip)
    assert r.status_code == 200
    assert r.content[:4] == b"MThd"
