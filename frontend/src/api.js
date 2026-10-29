import { supabase } from "./supabase";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, options);
  if (!response.ok) {
    //our server sends errors as {"detail": "..."} so pull out just the message
    const body = await response.json().catch(() => ({}));
    const message = typeof body.detail === "string" ? body.detail : "";
    throw new Error(message || `Request failed (${response.status})`);
  }
  return response;
}

export async function transcribeAudio(file, token) {
  const body = new FormData();
  body.append("file", file);

  const response = await request("/transcribe", {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body,
  });

  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const payload = await response.json();
    return {
      midiUrl: payload.midi_url || payload.download_url || payload.url,
      filename: payload.filename || `${file.name.replace(/\.[^.]+$/, "")}.mid`,
      notes: payload.notes || null,
    };
  }

  const blob = await response.blob();
  return {
    midiUrl: URL.createObjectURL(blob),
    filename: `${file.name.replace(/\.[^.]+$/, "")}.mid`,
    notes: null,
  };
}

//login and signup go straight to supabase, our python server doesnt handle accounts
export async function login(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
  return { token: data.session.access_token, user: data.user };
}

export async function register(email, password) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw new Error(error.message);
  return { token: data.session?.access_token, user: data.user };
}

export async function logout() {
  await supabase.auth.signOut();
}
