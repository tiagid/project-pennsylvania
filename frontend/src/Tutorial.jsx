import React, { useEffect, useRef, useState } from "react";
import { Midi } from "@tonejs/midi";
import { SplendidGrandPiano } from "smplr";
import { ArrowLeft, Pause, Play, RotateCcw, Volume2, VolumeX } from "lucide-react";

//US-5: synthesia style tutorial, notes fall onto a keyboard and hit the key right when they should be played
const BLACK = [1, 3, 6, 8, 10];  //which notes in an octave are black keys
const LOOK_AHEAD = 3;  //seconds of notes you can see coming before they hit
const LEAD_IN = 2;  //seconds before the first note so it has time to fall in

const isBlack = (m) => BLACK.includes(m % 12);

export default function Tutorial({ midiUrl, filename, onBack }) {
  const canvas = useRef(null);
  const [notes, setNotes] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [muted, setMuted] = useState(false);
  const [bpm, setBpm] = useState(null);
  const clock = useRef({ t: -LEAD_IN, last: 0, played: new Set() });  //song time in seconds and which notes already made a sound
  const audio = useRef(null);
  const piano = useRef(null);
  const settings = useRef({ speed, muted });
  settings.current = { speed, muted };

  useEffect(() => {
    fetch(midiUrl)
      .then((r) => r.arrayBuffer())
      .then((buf) => {
        const midi = new Midi(buf);
        setBpm(Math.round(midi.header.tempos[0]?.bpm || 120));  //the server writes the tempo it guessed into the file
        setNotes(midi.tracks.flatMap((t) => t.notes));
      })
      .catch(() => setNotes([]));
  }, [midiUrl]);

  //plays a real grand piano sample when each note hits, if the samples didnt load it falls back to a soft sine tone
  function beep(n) {
    const ctx = audio.current;
    if (!ctx || settings.current.muted) return;
    const len = Math.max(n.duration / settings.current.speed, 0.1);
    if (piano.current) {
      piano.current.start({ note: n.midi, velocity: 80, duration: len });  //80 so it uses the samples we loaded
      return;
    }
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 440 * Math.pow(2, (n.midi - 69) / 12);
    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.25 * n.velocity, ctx.currentTime + 0.01);  //quick fade in so it doesnt click
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + len);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + len);
  }

  useEffect(() => {
    if (!notes || notes.length === 0) return;
    const el = canvas.current;
    const g = el.getContext("2d");

    //only show the octaves the song uses (at least 2) so the keys stay big on a phone
    let low = Math.floor(Math.min(...notes.map((n) => n.midi)) / 12) * 12;
    let high = Math.ceil((Math.max(...notes.map((n) => n.midi)) + 1) / 12) * 12 - 1;
    if (high - low < 23) high = low + 23;
    const whites = [];
    for (let m = low; m <= high; m++) if (!isBlack(m)) whites.push(m);
    const end = Math.max(...notes.map((n) => n.time + n.duration));

    let frame;
    function draw(now) {
      const c = clock.current;
      if (playing) {
        c.t += ((now - (c.last || now)) / 1000) * settings.current.speed;
        notes.forEach((n, i) => {
          if (!c.played.has(i) && n.time <= c.t) {
            c.played.add(i);
            if (c.t - n.time < 0.2) beep(n);  //skip notes we jumped past
          }
        });
        if (c.t > end + 1) setPlaying(false);
      }
      c.last = now;

      const W = el.clientWidth, H = el.clientHeight, dpr = window.devicePixelRatio || 1;
      //match the canvas to the screen size, like when you turn your phone sideways
      if (el.width !== Math.round(W * dpr) || el.height !== Math.round(H * dpr)) { el.width = Math.round(W * dpr); el.height = Math.round(H * dpr); }
      g.setTransform(dpr, 0, 0, dpr, 0, 0);

      const keyH = Math.min(H * 0.22, 140);
      const hitY = H - keyH;
      const pps = hitY / LOOK_AHEAD;  //pixels per second of song
      const whiteW = W / whites.length;
      const blackW = whiteW * 0.6;
      const keyX = (m) => isBlack(m) ? whites.indexOf(m - 1) * whiteW + whiteW - blackW / 2 : whites.indexOf(m) * whiteW;
      const keyW = (m) => isBlack(m) ? blackW : whiteW;
      const down = new Set(notes.filter((n) => n.time <= c.t && c.t < n.time + n.duration).map((n) => n.midi));

      g.fillStyle = "#2b2b2b";
      g.fillRect(0, 0, W, H);
      //faint line at every C like the reference video
      g.fillStyle = "#3a3a3a";
      whites.forEach((m, i) => { if (m % 12 === 0) g.fillRect(i * whiteW, 0, 1, hitY); });

      //falling blocks, white key notes light and wide, black key notes dark and narrow
      notes.forEach((n) => {
        const bottom = hitY - (n.time - c.t) * pps;
        const top = bottom - n.duration * pps;
        if (bottom < 0 || top > hitY) return;
        g.fillStyle = isBlack(n.midi) ? "#b84f30" : "#f29a74";
        g.beginPath();
        g.roundRect(keyX(n.midi) + 2, top, keyW(n.midi) - 4, Math.max(bottom - top - 2, 3), 4);
        g.fill();
      });

      //keyboard, keys light up while their note is playing
      whites.forEach((m, i) => {
        g.fillStyle = down.has(m) ? "#f29a74" : "#fbfaf7";
        g.fillRect(i * whiteW + 1, hitY, whiteW - 2, keyH);
      });
      for (let m = low; m <= high; m++) {
        if (!isBlack(m)) continue;
        g.fillStyle = down.has(m) ? "#b84f30" : "#1d1d1d";
        g.fillRect(keyX(m), hitY, blackW, keyH * 0.62);
      }
      g.fillStyle = "#d66743";
      g.fillRect(0, hitY - 2, W, 2);

      frame = requestAnimationFrame(draw);
    }
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [notes, playing]);

  function togglePlay() {
    //browsers only allow sound after a tap, so the synth starts here
    if (!audio.current) {
      audio.current = new AudioContext();
      //only download the keys this song uses at one loudness, the whole piano is 200+ files which is a lot on a phone
      const p = SplendidGrandPiano(audio.current, {
        notesToLoad: { notes: [...new Set(notes.map((n) => n.midi))], velocityRange: [70, 90], fallback: "nearest" },
      });
      p.load.then(() => { piano.current = p; }).catch(() => {});  //samples download the first time you hit play
    }
    clock.current.last = 0;
    setPlaying(!playing);
  }

  function restart() {
    clock.current = { t: -LEAD_IN, last: 0, played: new Set() };
  }

  return (
    <div className="tutorial">
      <header className="tutorial-bar">
        <button onClick={onBack} type="button"><ArrowLeft size={18}/> Back</button>
        <span>{filename}{bpm && ` · ${Math.round(bpm * speed)} BPM`}</span>
        <div>
          <button onClick={togglePlay} type="button" disabled={!notes?.length}>{playing ? <Pause size={18}/> : <Play size={18}/>}</button>
          <button onClick={restart} type="button"><RotateCcw size={18}/></button>
          <button onClick={() => setSpeed(speed === 1 ? 0.5 : 1)} type="button">{speed}x</button>
          <button onClick={() => setMuted(!muted)} type="button">{muted ? <VolumeX size={18}/> : <Volume2 size={18}/>}</button>
        </div>
      </header>
      {notes?.length === 0 && <p className="tutorial-empty">No notes found in this recording.</p>}
      <canvas ref={canvas} />
      <p className="rotate-hint">Turn your phone sideways for a bigger keyboard</p>
    </div>
  );
}
