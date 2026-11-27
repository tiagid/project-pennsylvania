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

export async function transcribeAudio(file, token, onProgress) {
  const body = new FormData();
  body.append("file", file);

  //server gives back a job id right away, then we ask how far along it is every 2 seconds for the progress bar
  const job = await request("/jobs", {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body,
  });
  const { job_id } = await job.json();

  const giveUp = Date.now() + 5 * 60 * 1000;  //so the page never sits frozen forever
  while (true) {
    await new Promise((r) => setTimeout(r, 2000));
    const status = await (await request(`/status/${job_id}`)).json();
    onProgress?.(status.percent);
    if (status.state === "done") break;
    if (status.state === "failed") throw new Error("Couldn't convert that file, try recording it again.");
    if (Date.now() > giveUp) throw new Error("This is taking too long, please try again.");
  }

  const response = await request(`/result/${job_id}`);
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
