import librosa
import numpy as np
from basic_pitch import ICASSP_2022_MODEL_PATH
from basic_pitch.inference import predict, Model

#load model on server start
model = Model(ICASSP_2022_MODEL_PATH)

def audio_to_notes(path):
    #basic pitch hands back the prettyMIDI object, we just want to make some notes out of it right now
    _, midi, _ = predict(path, model)

    #silence comes back with no instrument so it will end up as a blank []
    notes = [n for inst in midi.instruments for n in inst.notes]  #inst = instrument n = notes
    return sorted(notes, key = lambda n: n.start)  

def guess_tempo(path):
    #librosa listens for the beat, the first minute is plenty to find it
    y, sr = librosa.load(path, sr = 22050, duration = 60)
    tempo, _ = librosa.beat.beat_track(y = y, sr = sr)
    bpm = round(float(np.atleast_1d(tempo)[0]))
    #no clear beat (like one long held note) gives junk, so fall back to 120
    return bpm if 40 <= bpm <= 240 else 120

def audio_to_midi(path, out_path, bpm = None):
    #user can set the tempo, otherwise we guess it so the notes line up with the grid in a DAW
    bpm = bpm or guess_tempo(path)
    _, midi, _ = predict(path, model, midi_tempo = bpm)
    midi.write(out_path)
    return bpm