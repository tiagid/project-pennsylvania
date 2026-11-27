import React, { useState, useRef } from "react";
import { Music2, ArrowRight, LockKeyhole, Mail, CheckCircle2, Download, RotateCcw, AudioLines, FileAudio, LogOut, UploadCloud, X } from "lucide-react";
import { login, register, transcribeAudio, logout as signOut } from "./api";


function PhoneShell({ children, title, subtitle }) {
  return (
    <div className="app-bg">
      <main className="phone-shell">
        <header className="brand-bar">
          <div className="brand">
            <span className="brand-mark"><Music2 size={18} strokeWidth={2.4} /></span>
            <span>Project Pennsylvania</span>
          </div>
        </header>
        {(title || subtitle) && (
          <section className="page-heading">
            {title && <h1>{title}</h1>}
            {subtitle && <p>{subtitle}</p>}
          </section>
        )}
        {children}
      </main>
    </div>
  );
}



function LoginPage({ onSubmit, loading, error, onSkip }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState("login");

  function submit(e) {
    e.preventDefault();
    onSubmit({ email, password, mode });
  }

  return (
    <PhoneShell title="Turn audio into MIDI" subtitle="Sign in to upload a recording and get a downloadable MIDI file.">
      <section className="card auth-card">
        <div className="segmented">
          <button className={mode === "login" ? "active" : ""} onClick={() => setMode("login")} type="button">Log in</button>
          <button className={mode === "register" ? "active" : ""} onClick={() => setMode("register")} type="button">Create account</button>
        </div>

        <form onSubmit={submit} className="form-stack">
          <label>
            <span>Email</span>
            <div className="input-wrap"><Mail size={18}/><input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" /></div>
          </label>
          <label>
            <span>Password</span>
            <div className="input-wrap"><LockKeyhole size={18}/><input required minLength={6} type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" /></div>
          </label>
          {error && <p className="error">{error}</p>}
          <button className="primary" disabled={loading} type="submit">
            {loading ? "Working…" : mode === "login" ? "Log in" : "Create account"}
            {!loading && <ArrowRight size={18}/>} 
          </button>
        </form>
        <button type="button" className="text-button" onClick={onSkip}>Continue in demo mode</button>
      </section>
    </PhoneShell>
  );
}



function UploadPage({ onUpload, processing, error, onLogout, userEmail }) {
  const [file, setFile] = useState(null);
  const picker = useRef(null);

  function choose(selected) {
    if (!selected) return;
    setFile(selected);
  }

  return (
    <PhoneShell title="Upload your audio" subtitle="Pick a melody, vocal line, or instrumental recording. We’ll convert detected notes into a MIDI file.">
      <section className="card">
        <div
          className={`dropzone ${file ? "has-file" : ""}`}
          onClick={() => picker.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); choose(e.dataTransfer.files?.[0]); }}
        >
          <input ref={picker} hidden type="file" accept="audio/*,.wav,.mp3,.m4a,.aac,.ogg,.flac" onChange={(e) => choose(e.target.files?.[0])} />
          {file ? (
            <>
              <span className="upload-icon"><FileAudio size={28}/></span>
              <strong>{file.name}</strong>
              <small>{(file.size / 1024 / 1024).toFixed(2)} MB</small>
            </>
          ) : (
            <>
              <span className="upload-icon"><UploadCloud size={30}/></span>
              <strong>Choose an audio file</strong>
              <small>Tap to browse or drop a file here</small>
            </>
          )}
        </div>

        {file && (
          <button type="button" className="remove-file" onClick={() => setFile(null)}><X size={16}/> Remove file</button>
        )}
        {error && <p className="error">{error}</p>}
        <button className="primary convert-button" disabled={!file || processing} onClick={() => onUpload(file)} type="button">
          <AudioLines size={19}/>{processing ? "Finding notes…" : "Convert to MIDI"}
        </button>

        <div className="process-strip">
          <span>1. Upload</span><span>2. Detect notes</span><span>3. Download MIDI</span>
        </div>
      </section>

      <footer className="signed-in">
        <span>{userEmail || "Demo session"}</span>
        <button onClick={onLogout} type="button"><LogOut size={16}/> Log out</button>
      </footer>
    </PhoneShell>
  );
}



function ResultPage({ result, sourceFile, onAgain }) {
  return (
    <PhoneShell title="Your MIDI is ready" subtitle="The audio has been processed and your MIDI file is ready to save.">
      <section className="card result-card">
        <div className="success-icon"><CheckCircle2 size={38}/></div>
        <p className="eyebrow">{result.demo ? "Demo sample MIDI (not converted from audio)" : "Conversion complete"}</p>
        <h2>{result.filename}</h2>
        <p className="muted">Created from {sourceFile?.name || "your recording"}</p>

        {result.notes && (
          <div className="stat-box">
            <strong>{Array.isArray(result.notes) ? result.notes.length : result.notes}</strong>
            <span>notes detected</span>
          </div>
        )}

        <a className="primary download" href={result.midiUrl} download={result.filename}>
          <Download size={19}/> Download MIDI
        </a>
        <button className="secondary" onClick={onAgain} type="button"><RotateCcw size={17}/> Convert another file</button>
      </section>
    </PhoneShell>
  );
}



function App() {
  const [view, setView] = useState("login");
  const [session, setSession] = useState(null);
  const [result, setResult] = useState(null);
  const [sourceFile, setSourceFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleAuth({ email, password, mode }) {
    setLoading(true); setError("");
    try {
      const data = mode === "register" ? await register(email, password) : await login(email, password);
      setSession({ token: data.token || data.access_token, email: data.user?.email || email });
      setView("upload");
    } catch (e) {
      setError(e.message || "Could not sign in.");
    } finally { setLoading(false); }
  }

  async function handleUpload(file) {
    setLoading(true); setError(""); setSourceFile(file);
    try {
      if (!import.meta.env.VITE_API_BASE_URL) {
        // Demo mode lets the frontend workflow be shown before the API URL is connected.
        await new Promise((resolve) => setTimeout(resolve, 900));
        const demoBlob = new Blob([new Uint8Array([77,84,104,100,0,0,0,6,0,0,0,1,0,96,77,84,114,107,0,0,0,12,0,0x90,60,100,0x60,0x80,60,0,0,0xFF,0x2F,0])], { type: "audio/midi" });
        setResult({ midiUrl: URL.createObjectURL(demoBlob), filename: `${file.name.replace(/\.[^.]+$/, "")}.mid`, notes: 1, demo: true });
      } else {
        setResult(await transcribeAudio(file, session?.token));
      }
      setView("result");
    } catch (e) {
      setError(e.message || "Conversion failed. Please try again.");
    } finally { setLoading(false); }
  }

  function logout() {
    if (session?.token) signOut();
    setSession(null); setResult(null); setSourceFile(null); setError(""); setView("login");
  }

  if (view === "result") return <ResultPage result={result} sourceFile={sourceFile} onAgain={() => { if (result?.midiUrl?.startsWith("blob:")) URL.revokeObjectURL(result.midiUrl); setResult(null); setSourceFile(null); setView("upload"); }} />;
  if (view === "upload") return <UploadPage onUpload={handleUpload} processing={loading} error={error} onLogout={logout} userEmail={session?.email} />;
  return <LoginPage onSubmit={handleAuth} loading={loading} error={error} onSkip={() => { setSession({ email: "Demo session" }); setView("upload"); }} />;
}


export default App;
