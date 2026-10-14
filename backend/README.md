# Backend

Python 3.12 transcription pipeline and FastAPI service. Owned by Brady.

Pipeline: load audio (ffmpeg, librosa), find notes (basic-pitch), guess tempo (librosa), write MIDI (pretty_midi). The FastAPI app exposes POST /transcribe.

The tests in tests/ expect a transcribe module with audio_to_notes(path), which returns a list of notes with pitch, start, end, and velocity, and audio_to_midi(path, out_path), which writes a .mid file.

Run tests with pytest backend/tests from the repo root.
