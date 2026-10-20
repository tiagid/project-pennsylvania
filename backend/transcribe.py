from basic_pitch.inference import predict

def audio_to_notes(path):
    #basic pitch hands back the prettyMIDI object, we just want to make some notes out of it right now
    _, midi, _ = predict(path)

    #silence comes back with no instrument so it will end up as a blank []
    notes = [n for inst in midi.instruments for n in inst.notes]  #inst = instrument n = notes
    return sorted(notes, key = lambda n: n.start)  

def audio_to_midi(path, out_path):
    _, midi, _ = predict(path)
    midi.write(out_path)