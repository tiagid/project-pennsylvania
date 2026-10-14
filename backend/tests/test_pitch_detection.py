import math
import struct
import wave

import pytest

transcribe = pytest.importorskip("backend.transcribe")


def write_wav(path, freq_hz, seconds=1.0, rate=22050, amplitude=0.5):
    frames = int(seconds * rate)
    with wave.open(str(path), "w") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(rate)
        for i in range(frames):
            sample = amplitude * math.sin(2 * math.pi * freq_hz * i / rate)
            w.writeframes(struct.pack("<h", int(sample * 32767)))


def test_single_note_has_pitch_start_length_volume(tmp_path):
    wav = tmp_path / "a4.wav"
    write_wav(wav, 440.0)
    notes = transcribe.audio_to_notes(str(wav))
    assert len(notes) >= 1
    n = notes[0]
    assert n.pitch == 69
    assert n.start >= 0
    assert n.end > n.start
    assert 0 < n.velocity <= 127


def test_silence_makes_no_notes(tmp_path):
    wav = tmp_path / "silence.wav"
    write_wav(wav, 440.0, amplitude=0.0)
    assert transcribe.audio_to_notes(str(wav)) == []


def test_writes_midi_file(tmp_path):
    wav = tmp_path / "c4.wav"
    write_wav(wav, 261.63)
    out = tmp_path / "c4.mid"
    transcribe.audio_to_midi(str(wav), str(out))
    assert out.exists()
    assert out.read_bytes()[:4] == b"MThd"
