import React, { useEffect, useState } from "react";
import { Midi } from "@tonejs/midi";

//US-5: draws the notes from the .mid we got back so you can see them before downloading
//left to right is time, up and down is pitch, like the piano roll in garageband
export default function PianoRoll({ midiUrl }) {
  const [notes, setNotes] = useState(null);

  useEffect(() => {
    fetch(midiUrl)
      .then((r) => r.arrayBuffer())
      .then((buf) => setNotes(new Midi(buf).tracks.flatMap((t) => t.notes)))
      .catch(() => setNotes([]));
  }, [midiUrl]);

  if (!notes) return null;
  if (notes.length === 0) return <p className="muted">No notes found in this recording.</p>;

  const low = Math.min(...notes.map((n) => n.midi)) - 1;
  const high = Math.max(...notes.map((n) => n.midi)) + 1;
  const end = Math.max(...notes.map((n) => n.time + n.duration));
  const rows = high - low + 1;

  return (
    <div className="piano-roll">
      <svg viewBox={`0 0 ${end} ${rows}`} preserveAspectRatio="none" width="100%" height="160">
        {notes.map((n, i) => (
          <rect key={i} x={n.time} y={high - n.midi} width={Math.max(n.duration, end / 200)} height={0.8}
            rx={0.15} fill="var(--accent)" />
        ))}
      </svg>
      <span>{notes.length} notes, {end.toFixed(1)} sec</span>
    </div>
  );
}
