# Backend

Python 3.10 transcription pipeline and FastAPI service. Owned by Brady.

Pipeline: load audio (ffmpeg, librosa), find notes (basic-pitch), guess tempo (librosa), write MIDI (pretty_midi). The FastAPI app exposes POST /transcribe.

The tests in tests/ expect a transcribe module with audio_to_notes(path), which returns a list of notes with pitch, start, end, and velocity, and audio_to_midi(path, out_path), which writes a .mid file.

Run tests with pytest backend/tests from the repo root.

## Endpoints

- GET /health: returns {"ok": true}, use it to wake the server up
- POST /transcribe: send the audio as "file" (WAV, MP3, M4A, WEBM, or OGG, 3 min and 25 MB max) and get the .mid back. The tempo it used comes back in the X-BPM header
- POST /jobs: same upload, but gives back {"job_id": "..."} right away so the page can show a progress bar
- GET /status/{job_id}: {"state": "waiting" | "working" | "done" | "failed", "percent": 0 to 100, "bpm": 120}. Ask every couple seconds
- GET /result/{job_id}: the .mid once state is done (works once, then the job is cleared)

Both uploads take an optional "bpm" form field (40 to 240). Without it the server guesses the tempo.
Bad uploads get a 400 or 413 with {"detail": "message"} that can be shown to the user as is.
